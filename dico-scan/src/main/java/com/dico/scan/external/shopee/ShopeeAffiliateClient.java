package com.dico.scan.external.shopee;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import java.util.Optional;

/**
 * Client gọi Shopee Open Platform API để tìm sản phẩm và tạo affiliate link.
 *
 * Flow:
 * 1. Tìm kiếm sản phẩm trên Shopee bằng tên/barcode.
 * 2. Lấy item_id + shop_id của kết quả đầu tiên.
 * 3. Build Affiliate URL có gắn sub_id (tracking DICO).
 *
 * FALLBACK: Nếu không tìm thấy hoặc API lỗi → trả về Optional.empty().
 * Backend KHÔNG bao giờ fail vì affiliate lookup thất bại.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ShopeeAffiliateClient {


    @Value("${app.shopee.affiliate-id:}")
    private String shopeeAffiliateId;

    @Value("${app.shopee.enabled:false}")
    private boolean shopeeEnabled;

    /**
     * Tìm affiliate link Shopee cho một sản phẩm dựa trên tên gợi ý.
     *
     * @param productName Tên sản phẩm (dùng để tìm kiếm trên Shopee)
     * @param barcode     Barcode EAN (dùng làm sub_id tracking)
     * @return Optional chứa URL affiliate, hoặc empty nếu không tìm thấy
     */
    public Optional<String> findAffiliateLink(String productName, String barcode) {
        if (!shopeeEnabled || shopeeAffiliateId == null || shopeeAffiliateId.isBlank()) {
            log.debug("Shopee affiliate disabled or not configured. Skipping for barcode={}", barcode);
            return Optional.empty();
        }
        try {
            // TODO: Implement khi có Shopee Open Platform credentials
            // Step 1: GET https://partner.shopeemobile.com/api/v2/product/search_items
            //         Params: keyword=productName, limit=1
            // Step 2: Lấy item_id + shop_id từ response
            // Step 3: Build URL: https://s.shopee.vn/{shop_id}/{item_id}?af_id={shopeeAffiliateId}&sub_id={barcode}
            log.debug("Shopee affiliate lookup for product='{}' barcode='{}'", productName, barcode);
            return Optional.empty(); // Placeholder until credentials are available
        } catch (Exception ex) {
            log.warn("Shopee affiliate lookup failed for barcode={}: {}", barcode, ex.getMessage());
            return Optional.empty(); // Non-fatal — never throw
        }
    }
}
