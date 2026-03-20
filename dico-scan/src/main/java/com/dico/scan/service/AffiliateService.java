package com.dico.scan.service;

import com.dico.scan.entity.ProductAffiliateLink;
import com.dico.scan.external.shopee.ShopeeAffiliateClient;
import com.dico.scan.repository.ProductAffiliateLinkRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AffiliateService {

    private final ProductAffiliateLinkRepository affiliateRepo;
    private final ShopeeAffiliateClient shopeeClient;

    private static final int AFFILIATE_TTL_DAYS = 7;

    /**
     * Lấy affiliate link cho 1 barcode.
     * Cache-first: DB → Shopee API → Optional.empty().
     * Không bao giờ throw exception.
     */
    @Transactional
    public Optional<String> getAffiliateLink(String barcode, String productName) {
        if (barcode == null) return Optional.empty();

        // 1. Cache check
        Optional<ProductAffiliateLink> cached = affiliateRepo.findValidByBarcode(barcode, OffsetDateTime.now());
        if (cached.isPresent()) {
            return Optional.of(cached.get().getAffiliateUrl());
        }

        // 2. Fetch from Shopee
        Optional<String> shopeeUrl = shopeeClient.findAffiliateLink(productName, barcode);
        shopeeUrl.ifPresent(url -> persistLink(barcode, url));
        return shopeeUrl;
    }

    /**
     * Batch lookup cho danh sách alternatives.
     * Trả về Map<barcode, affiliateUrl>.
     */
    @Transactional(readOnly = true)
    public Map<String, String> getAffiliateLinks(List<String> barcodes) {
        return affiliateRepo.findValidByBarcodes(barcodes, OffsetDateTime.now())
                .stream()
                .collect(Collectors.toMap(
                    ProductAffiliateLink::getBarcode,
                    ProductAffiliateLink::getAffiliateUrl
                ));
    }

    private void persistLink(String barcode, String url) {
        ProductAffiliateLink link = new ProductAffiliateLink();
        link.setBarcode(barcode);
        link.setAffiliateUrl(url);
        link.setPlatform("SHOPEE");
        link.setFetchedAt(OffsetDateTime.now());
        link.setExpiresAt(OffsetDateTime.now().plusDays(AFFILIATE_TTL_DAYS));
        affiliateRepo.save(link);
        log.debug("Cached affiliate link for barcode={}", barcode);
    }

    /** Gọi từ @Scheduled job hàng ngày để dọn dẹp cache hết hạn */
    @Transactional
    public int cleanupExpiredLinks() {
        int deleted = affiliateRepo.deleteExpiredLinks(OffsetDateTime.now());
        log.info("Cleaned up {} expired affiliate links", deleted);
        return deleted;
    }
}
