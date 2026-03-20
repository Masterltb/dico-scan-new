package com.dico.scan.repository;

import com.dico.scan.entity.ProductAffiliateLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProductAffiliateLinkRepository extends JpaRepository<ProductAffiliateLink, String> {

    /** Lấy affiliate link còn hạn cho 1 barcode */
    @Query("SELECT a FROM ProductAffiliateLink a WHERE a.barcode = :barcode AND a.expiresAt > :now")
    Optional<ProductAffiliateLink> findValidByBarcode(
        @Param("barcode") String barcode,
        @Param("now") OffsetDateTime now
    );

    /** Batch lookup cho danh sách barcode (tối ưu cho Alternatives endpoint) */
    @Query("SELECT a FROM ProductAffiliateLink a WHERE a.barcode IN :barcodes AND a.expiresAt > :now")
    List<ProductAffiliateLink> findValidByBarcodes(
        @Param("barcodes") List<String> barcodes,
        @Param("now") OffsetDateTime now
    );

    /** Dọn dẹp link hết hạn — gọi từ @Scheduled job hàng ngày */
    @Modifying
    @Query("DELETE FROM ProductAffiliateLink a WHERE a.expiresAt < :threshold")
    int deleteExpiredLinks(@Param("threshold") OffsetDateTime threshold);
}
