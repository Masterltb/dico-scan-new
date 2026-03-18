package com.dico.scan.service;

import com.dico.scan.dto.response.ProductEvaluationResponse;
import com.dico.scan.entity.FamilyProfile;
import com.dico.scan.entity.Product;
import com.dico.scan.entity.User;
import com.dico.scan.enums.ProductCategory;
import com.dico.scan.enums.SubscriptionTier;
import com.dico.scan.exception.NotEnoughTokensException;
import com.dico.scan.exception.ProductNotFoundException;
import com.dico.scan.external.gemini.AiAnalysisResult;
import com.dico.scan.external.gemini.GeminiClient;
import com.dico.scan.external.off.OffProductData;
import com.dico.scan.external.off.OpenFoodFactsClient;
import com.dico.scan.repository.FamilyProfileRepository;
import com.dico.scan.repository.ProductRepository;
import com.dico.scan.repository.UserRepository;
import com.dico.scan.service.scoring.ScoringEngineService;
import com.dico.scan.service.scoring.ScoringResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.util.*;

/**
 * Main orchestrator for the barcode evaluation flow.
 *
 * SUBSCRIPTION TIER GATING:
 * - FREE: allergies cleared → no personal Override O2, generic AI summary
 * - PREMIUM: full personal profile used in scoring and AI prompt
 *
 * MULTI-CATEGORY FLOW:
 * 1. DB Cache Check
 * 2. OpenFoodFacts Fetch
 * 3. Category Detection (ProductCategoryDetector)
 * 4. Deterministic Scoring (category-aware)
 * 5. Tier gating — clear personal data for FREE users
 * 6. Persist scoring result
 * 7. AI Layer (category-specific prompt)
 * 8. Update AI in DB
 * 9. Build response with category fields
 *
 * GUARDRAIL: NO @Transactional here. DB connections held only in persist steps.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProductApplicationService {

    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final OpenFoodFactsClient offClient;
    private final ScoringEngineService scoringEngine;
    private final ProductPersistService persistService;
    private final GeminiClient geminiClient;
    private final ProductCategoryDetector categoryDetector;
    private final ScanHistoryService scanHistoryService;
    private final UserWalletService walletService;
    private final FamilyProfileRepository familyProfileRepository;

    @Value("${app.product-cache.ttl-days:90}")
    private int cacheTtlDays;

    // ======================================================
    // MAIN ENTRY POINT
    // ======================================================

    public ProductEvaluationResponse evaluateProduct(String barcode, Map<String, Object> preferences, UUID userId, boolean useToken, UUID profileId) {
        // Resolve subscription tier: anonymous / missing user → FREE
        SubscriptionTier tier = SubscriptionTier.FREE;
        Map<String, Object> safetyProfile = null;
        List<String> familyAllergies = null;

        if (userId != null) {
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                tier = user.getSubscriptionTier();

                // Handle Tokens for Free users
                if (tier == SubscriptionTier.FREE && useToken) {
                    boolean burned = walletService.deductToken(userId);
                    if (!burned) {
                        throw new NotEnoughTokensException("Không đủ Xu để mở khóa tính năng cao cấp.");
                    }
                    tier = SubscriptionTier.PREMIUM; // Temporarily upgrade for this scan
                    log.info("User {} used 1 token for Premium scan. Barcode: {}", userId, barcode);
                }

                // Handle Family Profile for Gold users
                if (tier == SubscriptionTier.PREMIUM_GOLD && profileId != null) {
                    Optional<FamilyProfile> profileOpt = familyProfileRepository.findById(profileId);
                    if (profileOpt.isPresent() && profileOpt.get().getUserId().equals(userId)) {
                        familyAllergies = profileOpt.get().getAllergies();
                        log.info("User {} scanning for family profile: {}", userId, profileOpt.get().getName());
                    }
                }

                // For PREMIUM: merge saved preferences with request preferences
                if (tier == SubscriptionTier.PREMIUM || tier == SubscriptionTier.PREMIUM_GOLD) {
                    if (preferences == null || preferences.isEmpty()) {
                        preferences = user.getPreferences();
                    }
                    // Load safety profile for PREMIUM users who completed the wizard
                    if (user.isProfileCompleted()) {
                        safetyProfile = user.getSafetyProfile();
                    }
                }
            }
        }

        // Gather all allergies context
        final List<String> userAllergies;
        if (tier == SubscriptionTier.FREE) {
            userAllergies = Collections.emptyList();
        } else if (familyAllergies != null) {
            // Priority 1: Family profile allergies (Gold tier specific scan)
            userAllergies = familyAllergies;
        } else {
            // Priority 2: User's personal allergies
            userAllergies = extractAllAllergies(preferences, safetyProfile);
        }

        log.debug("evaluateProduct barcode={} tier={} allergies={} hasProfile={}",
                barcode, tier, userAllergies.size(), safetyProfile != null);

        // -------- Step 1: DB Cache Check --------
        Product cached = productRepository.findById(barcode).orElse(null);
        if (cached != null && isFresh(cached)) {
            log.debug("Cache HIT for barcode={}", barcode);
            // Record to scan history even on cache hit
            scanHistoryService.recordScan(userId, barcode, cached.getRatingColor());
            return toResponse(cached, Collections.emptyList(), tier);
        }
        log.debug("Cache MISS for barcode={}", barcode);

        // -------- Step 2: Fetch OpenFoodFacts --------
        OffProductData offData = offClient.fetchProduct(barcode)
                .orElseThrow(() -> new ProductNotFoundException(barcode));

        // -------- Step 3: Detect product category --------
        ProductCategory category = categoryDetector.detect(offData.categoriesTags());
        log.debug("Category detected: {} for barcode={}", category, barcode);

        // -------- Step 4: Deterministic Scoring --------
        ScoringResult result = scoringEngine.calculate(offData, userAllergies);

        // -------- Step 5: Persist scoring result --------
        Product saved = persistService.saveProduct(barcode, offData, result, category);

        // -------- Step 6: AI Layer (with personalized context) --------
        String aiInputsHash = computeAiHash(offData, userAllergies, category);
        String aiSummary = null;

        if (saved.getAiInputsHash() != null && saved.getAiInputsHash().equals(aiInputsHash)
                && saved.getAiSummaryCache() != null
                && !saved.getAiSummaryCache().contains("Vui lòng thử lại sau")) {
            log.debug("AI Cache HIT for barcode={}", barcode);
            aiSummary = saved.getAiSummaryCache();
        } else {
            AiAnalysisResult aiResult = geminiClient.analyze(offData, category, userAllergies, safetyProfile);
            aiSummary = aiResult.aiSummary();
            persistService.updateAiSummary(barcode, aiSummary, aiInputsHash);
        }

        // -------- Step 7: Build final response --------
        saved.setAiSummaryCache(aiSummary);
        // Record to scan history for authenticated users
        scanHistoryService.recordScan(userId, barcode, saved.getRatingColor());
        return toResponse(saved, result.overrideReasons(), tier);
    }

    // ======================================================
    // PRIVATE HELPERS
    // ======================================================

    private boolean isFresh(Product product) {
        if (product.getUpdatedAt() == null)
            return false;
        if (product.getAiSummaryCache() != null && product.getAiSummaryCache().contains("Vui lòng thử lại sau"))
            return false;
        return product.getUpdatedAt().isAfter(OffsetDateTime.now().minusDays(cacheTtlDays));
    }

    private String computeAiHash(OffProductData data, List<String> allergies, ProductCategory category) {
        String input = data.ingredientsText()
                + "|" + data.sugars100g()
                + "|" + data.salt100g()
                + "|" + category.name()
                + "|" + String.join(",", allergies);
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash)
                hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (Exception ex) {
            log.error("SHA-256 hash failed", ex);
            return UUID.randomUUID().toString();
        }
    }

    @SuppressWarnings("unchecked")
    private List<String> extractAllAllergies(Map<String, Object> preferences, Map<String, Object> safetyProfile) {
        Set<String> combined = new java.util.LinkedHashSet<>();

        // Legacy preferences (backward compat)
        if (preferences != null) {
            Object allergies = preferences.get("allergies");
            if (allergies instanceof List<?> list) {
                list.stream()
                        .filter(e -> e instanceof String)
                        .map(e -> ((String) e).toLowerCase().trim())
                        .forEach(combined::add);
            }
        }

        // Safety profile: food allergies
        if (safetyProfile != null) {
            Object food = safetyProfile.get("foodAllergies");
            if (food instanceof List<?> list) {
                list.stream().filter(e -> e instanceof String)
                        .map(e -> ((String) e).toLowerCase().trim()).forEach(combined::add);
            }
            Object customFood = safetyProfile.get("customFoodAllergies");
            if (customFood instanceof List<?> list) {
                list.stream().filter(e -> e instanceof String)
                        .map(e -> ((String) e).toLowerCase().trim()).forEach(combined::add);
            }
            // Also include child's allergies if present
            Object childObj = safetyProfile.get("childProfile");
            if (childObj instanceof Map<?, ?> cm) {
                Map<String, Object> child = (Map<String, Object>) cm;
                Object childAllergies = child.get("allergies");
                if (childAllergies instanceof List<?> list) {
                    list.stream().filter(e -> e instanceof String)
                            .map(e -> ((String) e).toLowerCase().trim()).forEach(combined::add);
                }
                Object childCustom = child.get("customAllergies");
                if (childCustom instanceof List<?> list) {
                    list.stream().filter(e -> e instanceof String)
                            .map(e -> ((String) e).toLowerCase().trim()).forEach(combined::add);
                }
            }
        }

        return new ArrayList<>(combined);
    }

    private String buildCategoryWarning(String category, List<String> overrideReasons) {
        return switch (category) {
            case "TOY" -> "⚠️ Kiểm tra giới hạn tuổi và nguy cơ nuốt phải chi tiết nhỏ";
            case "BEAUTY" -> overrideReasons != null && !overrideReasons.isEmpty()
                    ? "⚠️ Phát hiện thành phần có thể gây kích ứng"
                    : "✅ Không phát hiện thành phần đáng lo ngại";
            case "FASHION" -> "ℹ️ Xem thành phần chất liệu để đánh giá phù hợp với da nhạy cảm";
            case "FOOD" -> null; // Food uses overrideReasons directly
            default -> null;
        };
    }

    private ProductEvaluationResponse toResponse(Product p, List<String> overrideReasons, SubscriptionTier tier) {
        // FREE users only see generic overrideReasons (additive-based), not personal
        // allergy conflicts
        List<String> filteredReasons = null;
        if (overrideReasons != null && !overrideReasons.isEmpty()) {
            if (tier == SubscriptionTier.FREE) {
                // FREE: only show non-personal reasons (additive blacklist, not allergy
                // conflicts)
                List<String> genericOnly = overrideReasons.stream()
                        .filter(r -> !r.startsWith("Allergy conflict"))
                        .toList();
                filteredReasons = genericOnly.isEmpty() ? null : genericOnly;
            } else {
                filteredReasons = overrideReasons;
            }
        }

        String categoryWarning = buildCategoryWarning(p.getCategory(), filteredReasons);

        return new ProductEvaluationResponse(
                p.getBarcode(),
                p.getName(),
                p.getBrand(),
                p.getImageUrl(),
                p.getRatingColor(),
                p.getDeterminScore() != null ? p.getDeterminScore().intValue() : null,
                p.getConfidenceScore(),
                p.getAiSummaryCache(),
                filteredReasons,
                p.getUpdatedAt(),
                p.getCategory(),
                categoryWarning,
                null, // riskFactors: populated in future AI-to-structured-data sprint
                p.getOffPayload() != null ? p.getOffPayload().ingredientsText() : null);
    }
}
