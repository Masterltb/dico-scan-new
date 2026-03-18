package com.dico.scan.external.gemini;

import com.dico.scan.enums.ProductCategory;
import com.dico.scan.external.off.OffProductData;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * HTTP client for Gemini API (multi-category prompt routing).
 *
 * CONTRACT (Spec 04):
 * - AI can ONLY produce text summaries (<50 words in Vietnamese).
 * - AI CANNOT produce rating colors or scores.
 * - Hard timeout: 12s. On any failure → return FALLBACK.
 * - Prompt template is selected based on ProductCategory.
 * - For FREE users userAllergies/profileData are passed as empty → generic
 * summary.
 *
 * GUARDRAIL (Rule 6): No @Transactional. Called AFTER DB transaction committed.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GeminiClient {

    private final ObjectMapper objectMapper;

    @Value("${app.ai.gemini-key:}")
    private String geminiApiKey;

    @Value("${app.ai.gemini-url:https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent}")
    private String geminiUrl;

    @Value("${app.ai.max-ingredients-length:1500}")
    private int maxIngredientsLength;

    private static final AiAnalysisResult FALLBACK = new AiAnalysisResult(
            "Dữ liệu đang được phân tích. Vui lòng thử lại sau.",
            Collections.emptyList(),
            Collections.emptyList());

    /**
     * Calls Gemini to generate a Vietnamese safety summary.
     * Routes to the correct prompt template based on product category.
     * Returns FALLBACK on any error.
     *
     * @param productData   Normalized OFF product data
     * @param category      Detected product category
     * @param userAllergies User's allergy list. Empty = FREE tier (generic)
     * @param safetyProfile Full safety profile from questionnaire. Null = no
     *                      profile
     */
    @Retry(name = "geminiApi")
    @CircuitBreaker(name = "geminiApi", fallbackMethod = "geminiFallback")
    public AiAnalysisResult analyze(OffProductData productData, ProductCategory category,
            List<String> userAllergies, Map<String, Object> safetyProfile) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            log.warn("Gemini API key not configured. Returning fallback.");
            return FALLBACK;
        }
        try {
            String prompt = buildPrompt(productData, category, userAllergies, safetyProfile);
            String responseBody = callGeminiApi(prompt);
            return parseResponse(responseBody);
        } catch (Exception ex) {
            log.warn("Gemini call failed for barcode={}: {}", productData.barcode(), ex.getMessage());
            throw new RuntimeException("Gemini analysis failed", ex);
        }
    }

    /**
     * Fallback when Gemini circuit breaker OPEN or retries exhausted.
     * Returns cached FALLBACK message — system stays functional.
     */
    @SuppressWarnings("unused")
    public AiAnalysisResult geminiFallback(OffProductData productData, ProductCategory category,
            List<String> userAllergies, Map<String, Object> safetyProfile, Throwable ex) {
        log.warn("Gemini circuit breaker OPEN for barcode={}. Reason: {}", productData.barcode(), ex.getMessage());
        return FALLBACK;
    }

    private String buildPrompt(OffProductData data, ProductCategory category,
            List<String> allergies, Map<String, Object> safetyProfile) {
        String basePrompt = switch (category) {
            case FOOD -> buildFoodPrompt(data, allergies);
            case TOY -> buildToyPrompt(data);
            case BEAUTY -> buildBeautyPrompt(data);
            case FASHION -> buildFashionPrompt(data);
            case GENERAL -> buildGeneralPrompt(data);
        };

        // Append personalized context for PREMIUM users with completed profile
        if (safetyProfile != null && !safetyProfile.isEmpty()) {
            basePrompt += "\n\n" + buildPersonalContext(safetyProfile, category);
        }
        return basePrompt;
    }

    private String buildFoodPrompt(OffProductData data, List<String> allergies) {
        String ingredients = truncate(data.ingredientsText());
        return String.format("""
                Bạn là chuyên gia dinh dưỡng lâm sàng API (Không phải là chatbot).
                Nhiệm vụ: Phân tích thành phần thực phẩm và tóm tắt rủi ro sức khỏe bằng tiếng Việt ngắn gọn (< 50 từ).
                Bạn KHÔNG quyết định mức độ an toàn (Xanh/Đỏ/Vàng). Chỉ trích xuất sự kiện.

                Đầu vào:
                - product_name: %s
                - macro_sugar_100g: %.1f
                - macro_salt_100g: %.1f
                - ingredients_text: "%s"
                - user_allergies_list: %s

                Ràng buộc bắt buộc:
                1. KHÔNG thêm bất kỳ text nào ngoài JSON. KHÔNG dùng ```json wrappers.
                2. ai_summary phải < 50 từ tiếng Việt. Cảnh báo trực diện, không dài dòng.
                3. Nếu ingredients_text rỗng: trả summary "Không đủ thông tin để tóm tắt."
                4. Liệt kê dị ứng phát hiện được vào detected_allergies.

                Trả về JSON theo đúng schema này:
                {"ai_summary":"...","detected_allergies":[],"risk_ingredients":[]}
                """,
                data.productName(), data.sugars100g(), data.salt100g(),
                ingredients, allergies.toString());
    }

    private String buildToyPrompt(OffProductData data) {
        String ingredients = truncate(data.ingredientsText());
        return String.format(
                """
                        Bạn là chuyên gia an toàn sản phẩm trẻ em (API, không phải chatbot).
                        Nhiệm vụ: Phân tích thông tin đồ chơi/sản phẩm trẻ em và tóm tắt cảnh báo an toàn bằng tiếng Việt (< 50 từ).

                        Đầu vào:
                        - product_name: %s
                        - product_ingredients_materials: "%s"

                        Ràng buộc bắt buộc:
                        1. KHÔNG thêm bất kỳ text nào ngoài JSON. KHÔNG dùng ```json wrappers.
                        2. ai_summary: Đề cập giới hạn tuổi (nếu biết), nguy cơ nuốt phải chi tiết nhỏ, vật liệu.
                        3. risk_ingredients: Liệt kê vật liệu/hóa chất đáng lo ngại.
                        4. detected_allergies: Để rỗng.

                        Trả về JSON theo đúng schema này:
                        {"ai_summary":"...","detected_allergies":[],"risk_ingredients":[]}
                        """,
                data.productName(), ingredients);
    }

    private String buildBeautyPrompt(OffProductData data) {
        String ingredients = truncate(data.ingredientsText());
        return String.format(
                """
                        Bạn là chuyên gia an toàn mỹ phẩm và thành phần làm đẹp (API, không phải chatbot).
                        Nhiệm vụ: Phân tích thành phần mỹ phẩm, phát hiện các chất gây kích ứng, trả lời bằng tiếng Việt (< 50 từ).

                        Đầu vào:
                        - product_name: %s
                        - ingredients_inci: "%s"

                        Ràng buộc:
                        1. KHÔNG thêm bất kỳ text nào ngoài JSON. KHÔNG dùng ```json wrappers.
                        2. ai_summary: Cảnh báo paraben, sulfate (SLS/SLES), formaldehyde, hương liệu tổng hợp, alcohol nếu có.
                        3. risk_ingredients: Liệt kê các thành phần được xác định là đáng lo ngại.

                        Trả về JSON theo đúng schema này:
                        {"ai_summary":"...","detected_allergies":[],"risk_ingredients":[]}
                        """,
                data.productName(), ingredients);
    }

    private String buildFashionPrompt(OffProductData data) {
        String ingredients = truncate(data.ingredientsText());
        return String.format(
                """
                        Bạn là chuyên gia an toàn hàng dệt may và thời trang (API, không phải chatbot).
                        Nhiệm vụ: Phân tích thành phần vải/chất liệu, phát hiện hóa chất nhuộm hoặc nguy cơ dị ứng, bằng tiếng Việt (< 50 từ).

                        Đầu vào:
                        - product_name: %s
                        - materials_composition: "%s"

                        Ràng buộc:
                        1. KHÔNG thêm bất kỳ text nào ngoài JSON. KHÔNG dùng ```json wrappers.
                        2. ai_summary: Đề cập thành phần vải, hóa chất nhuộm potential (azo dye), phù hợp da nhạy cảm không.
                        3. risk_ingredients: Liệt kê vật liệu hoặc hóa chất đáng lo ngại.

                        Trả về JSON theo đúng schema này:
                        {"ai_summary":"...","detected_allergies":[],"risk_ingredients":[]}
                        """,
                data.productName(), ingredients);
    }

    private String buildGeneralPrompt(OffProductData data) {
        String ingredients = truncate(data.ingredientsText());
        return String.format("""
                Bạn là chuyên gia phân tích sản phẩm tiêu dùng (API, không phải chatbot).
                Nhiệm vụ: Tóm tắt thông tin sản phẩm và cảnh báo chung bằng tiếng Việt (< 50 từ).

                Đầu vào:
                - product_name: %s
                - product_info: "%s"

                Ràng buộc:
                1. KHÔNG thêm bất kỳ text nào ngoài JSON. KHÔNG dùng ```json wrappers.
                2. Nếu không đủ thông tin: trả summary "Không đủ thông tin để phân tích."

                Trả về JSON theo đúng schema này:
                {"ai_summary":"...","detected_allergies":[],"risk_ingredients":[]}
                """,
                data.productName(), ingredients);
    }

    /**
     * Builds personalized context from safety profile for PREMIUM users.
     * Appended to the category-specific prompt to enable AI allergen inference.
     */
    @SuppressWarnings("unchecked")
    private String buildPersonalContext(Map<String, Object> profile, ProductCategory category) {
        StringBuilder ctx = new StringBuilder();
        ctx.append("--- NGỮ CẢNH CÁ NHÂN (PREMIUM) ---\n");

        // Targets
        List<String> targets = (List<String>) profile.get("targets");
        if (targets != null && !targets.isEmpty()) {
            ctx.append("Đối tượng sử dụng: ").append(String.join(", ", targets)).append("\n");
        }

        // Child profile
        Object childObj = profile.get("childProfile");
        if (childObj instanceof Map<?, ?> cm) {
            Map<String, Object> child = (Map<String, Object>) cm;
            ctx.append("👶 Trẻ em - Độ tuổi: ").append(child.get("ageGroup")).append("\n");
            List<String> childAllergies = (List<String>) child.get("allergies");
            if (childAllergies != null && !childAllergies.isEmpty())
                ctx.append("   Dị ứng của bé: ").append(String.join(", ", childAllergies)).append("\n");
            List<String> childCustom = (List<String>) child.get("customAllergies");
            if (childCustom != null && !childCustom.isEmpty())
                ctx.append("   Dị ứng đặc biệt của bé: ").append(String.join(", ", childCustom)).append("\n");
            ctx.append("   Mức phản ứng: ").append(child.get("severityLevel")).append("\n");
        }

        // Pregnancy
        Object pregObj = profile.get("pregnancyProfile");
        if (pregObj instanceof Map<?, ?> pm) {
            Map<String, Object> preg = (Map<String, Object>) pm;
            ctx.append("🤰 Thai kỳ - Giai đoạn: ").append(preg.get("trimester")).append("\n");
        }

        // Food allergies
        List<String> foodAllergies = (List<String>) profile.get("foodAllergies");
        if (foodAllergies != null && !foodAllergies.isEmpty())
            ctx.append("⚠️ Dị ứng thực phẩm: ").append(String.join(", ", foodAllergies)).append("\n");

        List<String> customFood = (List<String>) profile.get("customFoodAllergies");
        if (customFood != null && !customFood.isEmpty())
            ctx.append("⚠️ Dị ứng hiếm/ẩn: ").append(String.join(", ", customFood)).append("\n");

        // Cosmetic (for BEAUTY category)
        if (category == ProductCategory.BEAUTY || category == ProductCategory.GENERAL) {
            List<String> cosm = (List<String>) profile.get("cosmeticSensitivities");
            if (cosm != null && !cosm.isEmpty())
                ctx.append("💄 Nhạy cảm mỹ phẩm: ").append(String.join(", ", cosm)).append("\n");
            String skin = (String) profile.get("skinType");
            if (skin != null && !skin.equals("UNKNOWN"))
                ctx.append("   Loại da: ").append(skin).append("\n");
        }

        // Health conditions
        List<String> health = (List<String>) profile.get("healthConditions");
        if (health != null && !health.isEmpty() && !health.contains("NONE"))
            ctx.append("🏥 Tình trạng sức khỏe: ").append(String.join(", ", health)).append("\n");

        // Diet
        List<String> diet = (List<String>) profile.get("dietaryPreferences");
        if (diet != null && !diet.isEmpty() && !diet.contains("NONE"))
            ctx.append("🥗 Chế độ ăn: ").append(String.join(", ", diet)).append("\n");

        // Alert severity
        String severity = (String) profile.get("allergySeverity");
        if ("SEVERE".equals(severity))
            ctx.append("🚨 MỨC ĐỘ DỊ ỨNG: NẶNG — Cần tránh tuyệt đối, bao gồm cross-contamination.\n");
        else if ("MODERATE".equals(severity))
            ctx.append("⚠️ Mức dị ứng: Trung bình\n");

        // Instruction for AI reasoning
        ctx.append("\nYÊU CẦU BỔ SUNG:\n");
        ctx.append("- Kiểm tra thành phần có chứa hoặc phái sinh từ các chất gây dị ứng trên.\n");
        ctx.append("- Xem xét cross-contamination (\"may contain traces of...\").\n");
        ctx.append("- Cảnh báo thành phần ẩn dưới tên gọi khác (ví dụ: casein = sữa, lecithin đậu nành).\n");
        ctx.append("- Nếu có dị ứng hiếm: suy luận xem thành phần nào có thể liên quan.\n");

        return ctx.toString();
    }

    private String truncate(String text) {
        if (text == null)
            return "";
        return text.length() > maxIngredientsLength
                ? text.substring(0, maxIngredientsLength) + "..."
                : text;
    }

    @SuppressWarnings("unchecked")
    private String callGeminiApi(String prompt) {
        org.springframework.http.client.SimpleClientHttpRequestFactory factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(12000);
        RestTemplate restTemplate = new RestTemplate(factory);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(Map.of(
                        "parts", List.of(Map.of("text", prompt)))));

        String urlWithKey = geminiUrl + "?key=" + geminiApiKey;
        ResponseEntity<Map<String, Object>> response = restTemplate.postForEntity(
                urlWithKey, new HttpEntity<>(requestBody, headers), (Class<Map<String, Object>>) (Class<?>) Map.class);

        List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.getBody().get("candidates");
        Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
        List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
        return (String) parts.get(0).get("text");
    }

    private AiAnalysisResult parseResponse(String rawText) throws Exception {
        String cleaned = rawText.trim()
                .replaceAll("^```json\\s*", "")
                .replaceAll("\\s*```$", "");
        return objectMapper.readValue(cleaned, AiAnalysisResult.class);
    }

    // ================================================================
    // ALTERNATIVE PRODUCT SUGGESTIONS — Separate from analyze() flow
    // ================================================================

    /**
     * Asks Gemini to suggest better product alternatives in the same category.
     *
     * GUARDRAIL: AI CANNOT produce ratings/scores. Only name, brand, and reason.
     * Returns empty list on any error — non-fatal, DB results are the primary
     * source.
     *
     * @param productName   Current product being scanned
     * @param category      FOOD / BEAUTY / TOY / FASHION / GENERAL
     * @param userAllergies User's allergy list. Empty = anonymous/FREE
     * @param limit         Max number of suggestions to return
     */
    @CircuitBreaker(name = "geminiApi", fallbackMethod = "alternativesFallback")
    public List<AiAlternativeSuggestion> suggestAlternatives(
            String productName, String productBrand, String category,
            String currentRating, List<String> userAllergies, int limit) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            log.debug("Gemini key not set — skipping AI alternatives");
            return Collections.emptyList();
        }
        try {
            String prompt = buildAlternativesPrompt(productName, productBrand, category, currentRating, userAllergies,
                    limit);
            String raw = callGeminiApi(prompt);
            return parseAlternativesResponse(raw);
        } catch (Exception ex) {
            log.warn("AI alternatives failed for '{}' ({}): {}", productName, category, ex.getMessage());
            throw new RuntimeException("Gemini alternatives failed", ex);
        }
    }

    @SuppressWarnings("unused")
    public List<AiAlternativeSuggestion> alternativesFallback(
            String productName, String productBrand, String category,
            String currentRating, List<String> userAllergies, int limit, Throwable ex) {
        log.warn("Gemini circuit open for alternatives. product={} category={}", productName, category);
        return Collections.emptyList();
    }

    private String buildAlternativesPrompt(String productName, String productBrand, String category,
            String currentRating, List<String> allergies, int limit) {

        String brand = (productBrand != null && !productBrand.isBlank()) ? productBrand : "Unknown";
        String ratingDesc = switch (currentRating != null ? currentRating : "UNKNOWN") {
            case "RED" -> "bị đánh giá NGUY HIỂM (nhiều thành phần có hại)";
            case "YELLOW" -> "bị đánh giá CẦN CHÚ Ý (một số thành phần đáng lo ngại)";
            default -> "chưa được đánh giá an toàn";
        };

        String allergyContext = allergies.isEmpty()
                ? "Không có yêu cầu dị ứng đặc biệt."
                : "Người dùng dị ứng với: " + String.join(", ", allergies)
                        + " — TRÁNH đề xuất những sản phẩm chứa các thành phần này.";

        String categoryContext = switch (category.toUpperCase()) {
            case "FOOD" -> "Thực phẩm / Đồ uống tại Việt Nam — tập trung vào sản phẩm local phổ biến";
            case "BEAUTY" -> "Mỹ phẩm / Chăm sóc da / Tóc — danh tiếng thương hiệu là ưu tiên";
            case "TOY" -> "Đồ chơi trẻ em — an toàn và có chứng nhận CE/TCVN";
            case "FASHION" -> "Thời trang / Phụ kiện — chất liệu an toàn, không hóa chất độc hại";
            default -> "Sản phẩm tiêu dùng chung tại Việt Nam";
        };

        return String.format("""
                Bạn là chuyên gia gợi ý sản phẩm tại thị trường Việt Nam (API, không phải chatbot).

                Sản phẩm hiện tại cần thay thế: "%s" của thương hiệu "%s".
                Lý do cần thay thế: Sản phẩm này %s.
                Ngành hàng: %s — %s
                Yêu cầu dị ứng: %s

                Nhiệm vụ: Đề xuất %d sản phẩm thay thế TỐT HƠN và KHÁC với sản phẩm trên.

                Ràng buộc bắt buộc:
                1. KHÔNG thêm bất kỳ text nào ngoài JSON array. KHÔNG dùng ```json wrappers.
                2. Chỉ đề xuất sản phẩm THỰC SỰ TỒN TẠI tại Việt Nam (thương hiệu nổi tiếng).
                3. "reason" ngắn gọn (<15 từ): lý do cụ thể tại sao tốt hơn sản phẩm gốc.
                4. "why_better" giải thích kỹ hơn (<30 từ) về thành phần/chất lượng vượt trội.
                5. Không đề xuất sản phẩm chứa chất gây dị ứng đã liệt kê.
                6. Đa dạng thương hiệu — không lặp lại cùng 1 brand.
                7. KHÔNG đề xuất lại chính sản phẩm "%s" của "%s".

                Trả về JSON array theo đúng schema (không thêm field khác):
                [{"name":"...","brand":"...","reason":"...","why_better":"..."}]
                """,
                productName, brand, ratingDesc, category, categoryContext, allergyContext,
                limit, productName, brand);
    }

    private List<AiAlternativeSuggestion> parseAlternativesResponse(String rawText) throws Exception {
        String cleaned = rawText.trim()
                .replaceAll("^```json\\s*", "")
                .replaceAll("\\s*```$", "")
                .trim();
        // Gemini sometimes wraps in an outer object — extract the array
        if (cleaned.startsWith("{")) {
            // Try to extract array from {"suggestions": [...]} or similar
            int start = cleaned.indexOf('[');
            int end = cleaned.lastIndexOf(']');
            if (start >= 0 && end > start) {
                cleaned = cleaned.substring(start, end + 1);
            }
        }
        return objectMapper.readValue(cleaned,
                objectMapper.getTypeFactory().constructCollectionType(List.class, AiAlternativeSuggestion.class));
    }
}
