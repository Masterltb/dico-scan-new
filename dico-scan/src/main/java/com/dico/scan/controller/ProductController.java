package com.dico.scan.controller;

import com.dico.scan.dto.response.ProductEvaluationResponse;
import com.dico.scan.service.ProductApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * REST Controller for product barcode evaluation.
 * Supports both anonymous (FREE tier) and authenticated (PREMIUM tier) users.
 *
 * Anonymous: No X-User-Id header → FREE tier, no personal allergy gating.
 * Authenticated: X-User-Id header → subscription tier loaded from DB.
 *
 * MVP: userId passed as request header X-User-Id.
 * Phase 2: Extract userId from JWT claim.
 */
@Slf4j
@Validated
@RestController
@RequestMapping("/v1/products")
@RequiredArgsConstructor
@Tag(name = "Products", description = "Barcode scanning and product safety evaluation")
public class ProductController {

    private final ProductApplicationService productService;

    @GetMapping("/{barcode}")
    @Operation(summary = "Evaluate product safety by barcode", description = "Multi-category evaluation (FOOD/TOY/BEAUTY/FASHION/GENERAL). Tier gating: FREE gets generic summary, PREMIUM gets personalized allergen alerts.")
    public ResponseEntity<ProductEvaluationResponse> evaluateProduct(
            @PathVariable @Pattern(regexp = "^[0-9]{8,14}$", message = "Barcode must be 8-14 digits") String barcode,
            @RequestHeader(value = "X-User-Id", required = false) UUID userId,
            @RequestParam(value = "allergies", required = false) String allergiesParam,
            @Parameter(description = "Dùng 1 Token để mở khoá Scan Cao Cấp cho Free User") @RequestParam(value = "useToken", required = false, defaultValue = "false") boolean useToken,
            @Parameter(description = "Quét cho thành viên trong gia đình (Chỉ GOLD)") @RequestParam(value = "profileId", required = false) UUID profileId) {

        log.info("Product evaluation request: barcode={} userId={} useToken={} profileId={}", barcode, userId, useToken, profileId);

        // Parse query param allergies (used only for PREMIUM users without saved
        // preferences)
        Map<String, Object> preferences = Map.of(
                "allergies", allergiesParam != null
                        ? java.util.Arrays.asList(allergiesParam.split(","))
                        : java.util.Collections.emptyList());

        ProductEvaluationResponse response = productService.evaluateProduct(barcode, preferences, userId, useToken, profileId);
        return ResponseEntity.ok(response);
    }
}
