package com.dico.scan.service;

import com.dico.scan.dto.response.AlternativeProductResponse;
import com.dico.scan.entity.Product;
import com.dico.scan.external.gemini.AiAlternativeSuggestion;
import com.dico.scan.external.gemini.GeminiClient;
import com.dico.scan.repository.ProductRepository;
import com.dico.scan.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Hybrid Alternative Product Recommendations.
 *
 * Strategy (priority order):
 * 1. DB Query — community-scanned products, same category, higher score
 * 2. Gemini AI — text suggestions when DB < MIN_DB_RESULTS
 *
 * GUARDRAIL (Rule_Score_01): Score/Rating ONLY comes from DB
 * (Product.determinScore).
 * Gemini provides name/brand/reason ONLY — never ratings.
 *
 * GUARDRAIL (Rule_Allergy_01): PREMIUM users get allergy-filtered suggestions.
 * FREE/anonymous users get generic category recommendations.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProductAlternativeService {

    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final GeminiClient geminiClient;
    private final AffiliateService affiliateService;

    /** Minimum DB results before calling Gemini to supplement */
    private static final int MIN_DB_RESULTS = 3;

    /** Max alternatives to return total */
    private static final int MAX_TOTAL = 5;

    /**
     * Min improvement: alternative must score at least this much higher OR be GREEN
     */
    private static final int MIN_SCORE_IMPROVEMENT = 5;

    @Transactional(readOnly = true)
    public List<AlternativeProductResponse> getAlternatives(
            String barcode, UUID userId, int limit) {

        // ── Load current product ──────────────────────────────────────
        Optional<Product> currentOpt = productRepository.findById(barcode);
        if (currentOpt.isEmpty()) {
            log.debug("Alternatives: product not in DB yet barcode={}", barcode);
            return Collections.emptyList();
        }

        Product current = currentOpt.get();
        String category = current.getCategory();
        int currentScore = current.getDeterminScore() != null ? current.getDeterminScore() : 50;
        int minScore = Math.max(0, currentScore - MIN_SCORE_IMPROVEMENT);

        // ── Step 1: DB alternatives (community products) ──────────────
        int dbLimit = Math.min(limit, MAX_TOTAL);
        List<Product> dbProducts = productRepository.findAlternatives(
                category, barcode, minScore, PageRequest.of(0, dbLimit));

        List<AlternativeProductResponse> results = new ArrayList<>();

        for (Product alt : dbProducts) {
            int altScore = alt.getDeterminScore() != null ? alt.getDeterminScore() : 0;
            String reason = buildDbReason(alt, current, altScore, currentScore);
            results.add(new AlternativeProductResponse(
                    alt.getBarcode(),
                    alt.getName(),
                    alt.getBrand(),
                    alt.getImageUrl(),
                    alt.getRatingColor(),
                    altScore,
                    alt.getCategory(),
                    reason,
                    "DB",
                    true,
                    null)); // affiliateLink will be filled later
        }

        // ── Step 2: Gemini supplement when DB results insufficient ────
        // Only call Gemini if DB results are below the minimum threshold
        int needed = Math.min(limit, MAX_TOTAL) - results.size();
        if (results.size() < MIN_DB_RESULTS && needed > 0) {
            List<String> allergies = resolveUserAllergies(userId);
            String productName = current.getName() != null ? current.getName() : barcode;
            String productBrand = current.getBrand() != null ? current.getBrand() : "";

            List<AiAlternativeSuggestion> aiSuggestions = geminiClient.suggestAlternatives(
                    productName, productBrand, category, current.getRatingColor(), allergies, needed);

            for (AiAlternativeSuggestion ai : aiSuggestions) {
                results.add(new AlternativeProductResponse(
                        null, // No barcode — AI suggestion only
                        ai.name(),
                        ai.brand(),
                        null, // No image — AI doesn't have URLs
                        "GREEN", // AI always suggests better alternatives
                        null, // No verified score
                        category,
                        ai.reason(),
                        "AI",
                        false, // Not directly scannable (no barcode)
                        null // No barcode to find affiliate link
                ));
            }
        }

        log.debug("Alternatives for barcode={}: {} DB + {} AI",
                barcode, dbProducts.size(), results.size() - dbProducts.size());
                
        List<String> barcodes = results.stream()
                .filter(r -> r.barcode() != null)
                .map(AlternativeProductResponse::barcode)
                .toList();
        Map<String, String> affiliateLinks = affiliateService.getAffiliateLinks(barcodes);

        return results.stream()
                .map(r -> new AlternativeProductResponse(
                        r.barcode(), r.name(), r.brand(), r.imageUrl(),
                        r.rating(), r.score(), r.category(), r.reason(), r.source(),
                        r.isScannableInApp(),
                        r.barcode() != null ? affiliateLinks.get(r.barcode()) : null
                ))
                .toList();
    }

    /** Build human-readable reason for a DB alternative */
    private String buildDbReason(Product alt, Product current, int altScore, int currentScore) {
        List<String> reasons = new ArrayList<>();

        // Score improvement
        int diff = altScore - currentScore;
        if (diff >= 20)
            reasons.add("Điểm cao hơn " + diff + " điểm 🔥");
        else if (diff > 0)
            reasons.add("Điểm cao hơn " + diff + " điểm");

        // Rating upgrade
        if ("GREEN".equals(alt.getRatingColor()) && !"GREEN".equals(current.getRatingColor())) {
            reasons.add("Được đánh giá An toàn ✅");
        }

        return reasons.isEmpty() ? "Lựa chọn tốt hơn trong ngành " + alt.getCategory()
                : String.join(" · ", reasons);
    }

    /**
     * Resolves user's allergy list for PREMIUM users.
     * Anonymous/FREE users → empty list (generic recommendations).
     *
     * GUARDRAIL: Allergy data NEVER logged at INFO level.
     */
    @SuppressWarnings("unchecked")
    private List<String> resolveUserAllergies(UUID userId) {
        if (userId == null)
            return Collections.emptyList();
        return userRepository.findById(userId)
                .map(u -> {
                    Map<String, Object> prefs = u.getPreferences();
                    if (prefs == null)
                        return Collections.<String>emptyList();
                    Object allergies = prefs.get("allergies");
                    if (allergies instanceof List<?> list)
                        return (List<String>) list;
                    return Collections.<String>emptyList();
                })
                .orElse(Collections.emptyList());
    }
}
