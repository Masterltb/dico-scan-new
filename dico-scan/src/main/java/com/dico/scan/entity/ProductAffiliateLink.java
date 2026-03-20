package com.dico.scan.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.OffsetDateTime;

@Entity
@Table(name = "product_affiliate_links")
@Getter @Setter @NoArgsConstructor
public class ProductAffiliateLink {

    @Id
    @Column(name = "barcode", length = 14)
    private String barcode;

    @Column(name = "shopee_item_id", length = 50)
    private String shopeeItemId;

    @Column(name = "shopee_shop_id", length = 50)
    private String shopeeShopId;

    @Column(name = "affiliate_url", columnDefinition = "TEXT", nullable = false)
    private String affiliateUrl;

    @Column(name = "platform", length = 20, nullable = false)
    private String platform = "SHOPEE";

    @Column(name = "fetched_at", nullable = false)
    private OffsetDateTime fetchedAt;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;
}
