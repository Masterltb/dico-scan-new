package com.dico.scan.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Primary API response for GET /v1/products/{barcode}
 * Matches OpenAPI spec in 06_API_SPECIFICATION_V2.yaml
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ProductEvaluationResponse(
        String barcode,
        String name,
        String brand,
        String imageUrl,

        /** GREEN / YELLOW / RED / UNKNOWN */
        String rating,

        /** 0-100. Null when rating = UNKNOWN */
        Integer score,

        /** 0.0-1.0. < 1.0 means OFF data was incomplete */
        Float confidenceScore,

        /**
         * AI-generated summary < 50 words. Null when AI timed out or cache miss +
         * timeout
         */
        String aiSummary,

        /** Reasons why rating was overridden (allergy conflict, banned additive) */
        List<String> overrideReasons,

        OffsetDateTime cachedAt,

        /** Detected product category: FOOD / TOY / BEAUTY / FASHION / GENERAL */
        String category,

        /**
         * Category-specific warning message.
         * e.g. "Phù hợp cho trẻ từ 3 tuổi trở lên" (TOY)
         * or "Chứa thành phần có thể gây kích ứng da" (BEAUTY)
         */
        String categoryWarning,

        /**
         * List of detected risk factors specific to the product category.
         * e.g. ["Chứa Paraben", "Sodium Lauryl Sulfate"] for BEAUTY
         * e.g. ["Nguy cơ nghẹt thở - Chi tiết nhỏ"] for TOY
         * Null for FREE users when no risk factors are detected.
         */
        List<String> riskFactors,

        /**
         * Raw ingredient text from OpenFoodFacts.
         * Shown in "📋 Thành phần" expandable section in mobile.
         * Null when OFF data does not have ingredient info.
         */
        String ingredientsText,

        /** Shopee/Lazada affiliate link. Null nếu sản phẩm không có trên sàn. */
        String affiliateLink) {
}
