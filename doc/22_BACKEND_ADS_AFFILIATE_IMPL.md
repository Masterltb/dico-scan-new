# 22 — Backend Implementation Spec: Google AdMob & Shopee Affiliate

> **Mục đích:** Tài liệu này đủ chi tiết để một AI Agent tự triển khai không cần hỏi thêm.
> Mọi class/method/field đều phải khớp chính xác với codebase hiện tại tại `com.dico.scan`.

---

## PHẦN 1 — Google AdMob: Anti-Cheat Rewarded Token

### 1.1. Bối cảnh hiện tại

**Đã có sẵn:**
- `UserWallet` entity (`entity/UserWallet.java`) — có field `tokens: int`.
- `UserWalletService.rewardToken(UUID userId)` — cộng 1 token, return `int newBalance`.
- `SubscriptionController.rewardToken()` — endpoint `POST /v1/users/me/tokens/reward` đang **không có bảo vệ gian lận**.

**Vấn đề cần giải quyết:** Endpoint hiện tại có thể bị gọi trực tiếp mà không cần xem quảng cáo thật sự. Cần thêm **Cooldown Guard** để ngăn chặn spam.

---

### 1.2. Thay đổi cần thực hiện

#### 1.2.1. Thêm field `lastRewardedAt` vào `UserWallet`

**File:** `entity/UserWallet.java`

Thêm field sau vào class `UserWallet`:

```java
/** Thời điểm lần cuối user nhận thưởng Token từ Rewarded Ads.
 *  Dùng để enforce cooldown 30 giây chống spam. Null = chưa bao giờ nhận. */
@Column(name = "last_rewarded_at")
private OffsetDateTime lastRewardedAt;
```

#### 1.2.2. Flyway Migration: Thêm Column mới

**File mới:** `src/main/resources/db/migration/V6__add_wallet_last_rewarded.sql`

```sql
ALTER TABLE user_wallets ADD COLUMN IF NOT EXISTS last_rewarded_at TIMESTAMPTZ;
```

> **Lưu ý đặt tên:** Kiểm tra version hiện tại cao nhất trong `db/migration/` và dùng version tiếp theo (V6, V7...).

#### 1.2.3. Cập nhật `UserWalletService`

**File:** `service/UserWalletService.java`

Thay thế method `rewardToken` hiện tại bằng phiên bản có cooldown:

```java
private static final int REWARD_COOLDOWN_SECONDS = 30;

@Transactional
public int rewardToken(UUID userId) {
    UserWallet wallet = getWalletByUserId(userId);

    // Anti-spam cooldown check
    if (wallet.getLastRewardedAt() != null) {
        long secondsSinceLastReward = ChronoUnit.SECONDS.between(
            wallet.getLastRewardedAt(), OffsetDateTime.now()
        );
        if (secondsSinceLastReward < REWARD_COOLDOWN_SECONDS) {
            throw new TooManyRequestsException(
                "Cooldown active. Please wait " +
                (REWARD_COOLDOWN_SECONDS - secondsSinceLastReward) + " seconds."
            );
        }
    }

    wallet.setTokens(wallet.getTokens() + 1);
    wallet.setLastRewardedAt(OffsetDateTime.now());
    walletRepository.save(wallet);
    log.info("User {} rewarded 1 token. New balance: {}", userId, wallet.getTokens());
    return wallet.getTokens();
}
```

#### 1.2.4. Tạo `TooManyRequestsException`

**File mới:** `exception/TooManyRequestsException.java`

```java
package com.dico.scan.exception;

public class TooManyRequestsException extends RuntimeException {
    public TooManyRequestsException(String message) {
        super(message);
    }
}
```

#### 1.2.5. Cập nhật `GlobalExceptionHandler`

**File:** `exception/GlobalExceptionHandler.java` (tìm class có `@RestControllerAdvice`)

Thêm handler mới:

```java
@ExceptionHandler(TooManyRequestsException.class)
public ResponseEntity<StandardError> handleTooManyRequests(TooManyRequestsException ex) {
    return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
        .body(new StandardError("TOO_MANY_REQUESTS", ex.getMessage()));
}
```

#### 1.2.6. Cập nhật `SubscriptionController`

**File:** `controller/SubscriptionController.java`

Cập nhật method `rewardToken` — thêm guard cho FREE users only:

```java
@PostMapping("/users/me/tokens/reward")
@Operation(summary = "Nhận thưởng 1 Xu khi xem quảng cáo",
    description = "Chỉ FREE users. PREMIUM/GOLD không cần. Cooldown 30 giây chống spam.")
public ResponseEntity<TokenRewardResponse> rewardToken(
        @RequestHeader("X-User-Id") UUID userId) {

    User user = userRepository.findById(userId)
        .orElseThrow(() -> new RuntimeException("User not found: " + userId));

    // PREMIUM/GOLD không cần Token — họ đã unlock tất cả
    if (user.getSubscriptionTier() != SubscriptionTier.FREE) {
        return ResponseEntity.badRequest().build(); // hoặc 400 "Premium users don't use tokens"
    }

    int newBalance = walletService.rewardToken(userId);
    return ResponseEntity.ok(new TokenRewardResponse(newBalance));
}
```

---

### 1.3. Interstitial Ads — Tracking Server-Side (Tùy chọn)

Interstitial Ads không cần backend xử lý. Mobile App (React Native + AdMob SDK) tự quản lý việc hiển thị mỗi ~3 lần quét. **Backend không cần thay đổi gì cho Interstitial.**

---

## PHẦN 2 — Shopee Affiliate Link Integration

### 2.1. Bối cảnh hiện tại (Codebase hiện có)

**Luồng hiện tại khi quét:**
1. `GET /v1/products/{barcode}` → `ProductController` → `ProductApplicationService`
2. Response type: `ProductEvaluationResponse` (record, 64 dòng)
3. `AlternativeController` → `GET /v1/products/{barcode}/alternatives`
4. Response type: `AlternativeProductResponse` (record, 46 dòng)

**Vấn đề:** Cả 2 response đều **chưa có field `affiliateLink`**.

---

### 2.2. Database — Bảng Affiliate Cache

#### 2.2.1. Flyway Migration: Tạo bảng `product_affiliate_links`

**File mới:** `src/main/resources/db/migration/V7__create_affiliate_links.sql`

```sql
CREATE TABLE IF NOT EXISTS product_affiliate_links (
    barcode         VARCHAR(14) PRIMARY KEY,
    shopee_item_id  VARCHAR(50),
    shopee_shop_id  VARCHAR(50),
    affiliate_url   TEXT NOT NULL,
    platform        VARCHAR(20) NOT NULL DEFAULT 'SHOPEE',
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX idx_affiliate_barcode ON product_affiliate_links(barcode);
CREATE INDEX idx_affiliate_expires ON product_affiliate_links(expires_at);
```

> **Lý do TTL 7 ngày:** Shopee Affiliate link thay đổi không thường xuyên. Cache 7 ngày giảm thiểu số lần gọi Shopee API.

---

### 2.3. Entity: `ProductAffiliateLink`

**File mới:** `entity/ProductAffiliateLink.java`

```java
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
```

---

### 2.4. Repository: `ProductAffiliateLinkRepository`

**File mới:** `repository/ProductAffiliateLinkRepository.java`

```java
package com.dico.scan.repository;

import com.dico.scan.entity.ProductAffiliateLink;
import org.springframework.data.jpa.repository.JpaRepository;
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
```

---

### 2.5. External Client: `ShopeeAffiliateClient`

**File mới:** `external/shopee/ShopeeAffiliateClient.java`

```java
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

    private final RestTemplate restTemplate;

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
```

---

### 2.6. Service: `AffiliateService`

**File mới:** `service/AffiliateService.java`

```java
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
```

---

### 2.7. Cập nhật DTOs — Thêm `affiliateLink`

#### 2.7.1. `ProductEvaluationResponse`

**File:** `dto/response/ProductEvaluationResponse.java`

Đây là `record` — **phải tạo lại toàn bộ record** với field mới thêm vào cuối:

```java
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ProductEvaluationResponse(
        String barcode,
        String name,
        String brand,
        String imageUrl,
        String rating,
        Integer score,
        Float confidenceScore,
        String aiSummary,
        List<String> overrideReasons,
        OffsetDateTime cachedAt,
        String category,
        String categoryWarning,
        List<String> riskFactors,
        String ingredientsText,
        /** Shopee/Lazada affiliate link. Null nếu sản phẩm không có trên sàn. */
        String affiliateLink) {
}
```

#### 2.7.2. `AlternativeProductResponse`

**File:** `dto/response/AlternativeProductResponse.java`

Tương tự, thêm field vào cuối record:

```java
public record AlternativeProductResponse(
        String barcode,
        String name,
        String brand,
        String imageUrl,
        String rating,
        Integer score,
        String category,
        String reason,
        String source,
        boolean isScannableInApp,
        /** Shopee affiliate link. Null nếu nguồn = "AI" hoặc không tìm thấy trên sàn. */
        String affiliateLink) {
}
```

---

### 2.8. Cập nhật Service Layer — Inject Affiliate Link

#### 2.8.1. `ProductApplicationService`

**File:** `service/ProductApplicationService.java`

- Inject `AffiliateService` vào constructor.
- Sau khi build `ProductEvaluationResponse`, gọi thêm:

```java
// Thêm vào cuối buildResponse() method, trước khi return:
String affiliateLink = affiliateService
    .getAffiliateLink(product.getBarcode(), product.getName())
    .orElse(null);

return new ProductEvaluationResponse(
    // ... tất cả fields hiện có ...
    affiliateLink  // field mới thêm vào cuối
);
```

#### 2.8.2. `ProductAlternativeService`

**File:** `service/ProductAlternativeService.java`

- Inject `AffiliateService` vào constructor.
- Sau khi build danh sách `results`, enrich affiliate links **một lần duy nhất** bằng batch call:

```java
// Sau khi đã collect tất cả DB results, trước khi return:
List<String> barcodes = results.stream()
    .filter(r -> r.barcode() != null)
    .map(AlternativeProductResponse::barcode)
    .toList();

Map<String, String> affiliateLinks = affiliateService.getAffiliateLinks(barcodes);

// Map kết quả về record mới (có affiliateLink)
return results.stream()
    .map(r -> new AlternativeProductResponse(
        r.barcode(), r.name(), r.brand(), r.imageUrl(),
        r.rating(), r.score(), r.category(), r.reason(), r.source(),
        r.isScannableInApp(),
        r.barcode() != null ? affiliateLinks.get(r.barcode()) : null // affiliateLink
    ))
    .toList();
```

---

### 2.9. Scheduled Cleanup Job

**File mới hoặc bổ sung vào:** `config/ScheduledJobs.java`

```java
package com.dico.scan.config;

import com.dico.scan.service.AffiliateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ScheduledJobs {

    private final AffiliateService affiliateService;

    /** Dọn dẹp affiliate links hết hạn — chạy lúc 2:00 AM hàng ngày */
    @Scheduled(cron = "0 0 2 * * *")
    public void cleanupAffiliateLinks() {
        log.info("Starting affiliate link cleanup...");
        affiliateService.cleanupExpiredLinks();
    }
}
```

Đảm bảo `@EnableScheduling` đã được thêm vào `DicoScanApplication.java` hoặc một `@Configuration` class.

---

### 2.10. Application Properties

**File:** `src/main/resources/application.properties` (hoặc `application.yml`)

Thêm các cấu hình:

```properties
# Shopee Affiliate
app.shopee.enabled=false
app.shopee.affiliate-id=YOUR_SHOPEE_AFFILIATE_ID
app.shopee.api-key=YOUR_SHOPEE_API_KEY
app.shopee.api-secret=YOUR_SHOPEE_API_SECRET
```

---

## PHẦN 3 — Kiểm tra tính đồng bộ (Checklist cho AI Agent)

Sau khi triển khai xong, kiểm tra theo danh sách sau:

- [ ] `UserWallet` có field `lastRewardedAt` khớp với column DB `last_rewarded_at`.
- [ ] Flyway migration chạy thành công (không conflict version).
- [ ] `TooManyRequestsException` được handle bởi `GlobalExceptionHandler` → HTTP 429.
- [ ] `ProductEvaluationResponse` vẫn compile — không bị thiếu argument nào khi khởi tạo record.
- [ ] `AlternativeProductResponse` vẫn compile — kiểm tra tất cả vị trí `new AlternativeProductResponse(...)` trong `ProductAlternativeService`.
- [ ] `AffiliateService` được inject vào cả `ProductApplicationService` và `ProductAlternativeService`.
- [ ] `ShopeeAffiliateClient` log ở level `DEBUG` — không log thông tin nhạy cảm.
- [ ] `@EnableScheduling` đã được kích hoạt.
