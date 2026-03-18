package com.dico.scan.controller;

import com.dico.scan.entity.User;
import com.dico.scan.entity.UserFavorite;
import com.dico.scan.enums.SubscriptionTier;
import com.dico.scan.exception.PremiumRequiredException;
import com.dico.scan.repository.UserFavoriteRepository;
import com.dico.scan.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Favorites (Wishlist) management.
 *
 * GET /v1/favorites — List all favorites
 * POST /v1/favorites/{barcode} — Add / Update favorite (upsert)
 * DELETE /v1/favorites/{barcode} — Remove from favorites
 * GET /v1/favorites/{barcode}/status — Check if barcode is favorited
 */
@Slf4j
@Validated
@RestController
@RequestMapping("/v1/favorites")
@RequiredArgsConstructor
@Tag(name = "Favorites", description = "Product wishlist — SAFE (Mua lại) / AVOID (Tránh mua)")
public class FavoriteController {

    private final UserFavoriteRepository favoriteRepository;
    private final UserRepository userRepository;

    private void verifyPremium(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        if (user.getSubscriptionTier() == SubscriptionTier.FREE) {
            throw new PremiumRequiredException("Chức năng Lưu sản phẩm chỉ dành cho User Premium/Gold.");
        }
    }

    @GetMapping
    @Operation(summary = "Danh sách sản phẩm yêu thích", description = "Trả về tất cả sản phẩm đã đánh dấu, mới nhất trước.")
    public ResponseEntity<List<UserFavorite>> getAll(
            @RequestHeader("X-User-Id") UUID userId) {
        verifyPremium(userId);
        return ResponseEntity.ok(favoriteRepository.findByUserIdOrderByAddedAtDesc(userId));
    }

    @GetMapping("/{barcode}/status")
    @Operation(summary = "Kiểm tra trạng thái yêu thích", description = "Trả về label (SAFE/AVOID) nếu đã có, hoặc null nếu chưa.")
    public ResponseEntity<Map<String, Object>> getStatus(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable @Pattern(regexp = "\\d{8,14}") String barcode) {
        verifyPremium(userId);
        Optional<UserFavorite> fav = favoriteRepository.findByUserIdAndBarcode(userId, barcode);
        return ResponseEntity.ok(Map.of(
                "isFavorited", fav.isPresent(),
                "label", fav.map(UserFavorite::getLabel).orElse(""),
                "note", fav.map(f -> f.getNote() != null ? f.getNote() : "").orElse("")));
    }

    @PostMapping("/{barcode}")
    @Transactional
    @Operation(summary = "Thêm / Cập nhật sản phẩm yêu thích (Upsert)", description = "label: 'SAFE'=Mua lại | 'AVOID'=Tránh mua. Idempotent — gọi lại chỉ cập nhật label.")
    public ResponseEntity<UserFavorite> upsert(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable @Pattern(regexp = "\\d{8,14}") String barcode,
            @Parameter(description = "SAFE hoặc AVOID") @RequestParam(defaultValue = "SAFE") String label,
            @Parameter(description = "Ghi chú tùy chọn") @RequestParam(required = false) @Size(max = 200) String note) {
        
        verifyPremium(userId);

        if (!label.equals("SAFE") && !label.equals("AVOID")) {
            return ResponseEntity.badRequest().build();
        }

        UserFavorite fav = favoriteRepository.findByUserIdAndBarcode(userId, barcode)
                .orElseGet(() -> {
                    UserFavorite f = new UserFavorite();
                    f.setUserId(userId);
                    f.setBarcode(barcode);
                    return f;
                });

        fav.setLabel(label);
        fav.setNote(note);
        UserFavorite saved = favoriteRepository.save(fav);

        log.info("Favorite upserted: userId={} barcode={} label={}", userId, barcode, label);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{barcode}")
    @Transactional
    @Operation(summary = "Xóa khỏi danh sách yêu thích", description = "Idempotent — không lỗi nếu chưa có.")
    public ResponseEntity<Void> remove(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable @Pattern(regexp = "\\d{8,14}") String barcode) {
        verifyPremium(userId);
        favoriteRepository.deleteByUserIdAndBarcode(userId, barcode);
        log.info("Favorite removed: userId={} barcode={}", userId, barcode);
        return ResponseEntity.noContent().build();
    }
}
