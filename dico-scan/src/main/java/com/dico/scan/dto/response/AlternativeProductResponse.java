package com.dico.scan.dto.response;

/**
 * Một sản phẩm thay thế được gợi ý.
 *
 * source:
 * "DB" — sản phẩm đã có trong DB (đã quét bởi cộng đồng), có barcode thực
 * "AI" — gợi ý từ Gemini (tên/thương hiệu, chưa xác minh barcode)
 *
 * isScannableInApp:
 * true → có barcode → mobile có thể navigate sang ResultScreen hoặc mời quét
 * false → AI suggestion → hiển thị thông tin, invite user quét thử
 */
public record AlternativeProductResponse(

        /** Barcode EAN. Null nếu source = "AI" (chưa có trong DB) */
        String barcode,

        String name,
        String brand,

        /** Product image URL. Null nếu source = "AI" */
        String imageUrl,

        /** GREEN / YELLOW — alternatives luôn phải tốt hơn hoặc bằng */
        String rating,

        /** Score 0-100. Null nếu source = "AI" */
        Integer score,

        /** FOOD / BEAUTY / TOY / FASHION / GENERAL */
        String category,

        /**
         * Lý do gợi ý — hiển thị cho user.
         * Ví dụ: "Điểm cao hơn 23 điểm", "Không chứa E102", "Ít đường hơn"
         */
        String reason,

        /** "DB" hoặc "AI" */
        String source,

        /** true nếu có barcode → mobile có thể navigate/quét */
        boolean isScannableInApp,

        /** Shopee affiliate link. Null nếu nguồn = "AI" hoặc không tìm thấy trên sàn. */
        String affiliateLink) {
}
