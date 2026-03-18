package com.dico.scan.controller;

import com.dico.scan.dto.request.UpdatePreferencesRequest;
import com.dico.scan.dto.response.ScanHistoryItemResponse;
import com.dico.scan.dto.response.UserPreferencesResponse;
import com.dico.scan.dto.response.UserStatsResponse;
import com.dico.scan.entity.User;
import com.dico.scan.enums.SubscriptionTier;
import com.dico.scan.exception.PremiumRequiredException;
import com.dico.scan.repository.UserRepository;
import com.dico.scan.service.ScanHistoryService;
import com.dico.scan.service.UserService;
import com.dico.scan.service.UserStatsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST Controller for user profile, preferences, and scan history.
 *
 * Endpoints:
 * GET /v1/users/me/preferences → Xem dị ứng + chế độ ăn đã lưu (tất cả user)
 * PUT /v1/users/me/preferences → Cập nhật dị ứng + chế độ ăn (PREMIUM only)
 * GET /v1/users/me/scan-history → Lịch sử quét sản phẩm (tất cả user)
 */
@Slf4j
@RestController
@RequestMapping("/v1/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "User profile, allergy preferences, and scan history")
public class UserController {

        private final UserService userService;
        private final ScanHistoryService scanHistoryService;
        private final UserRepository userRepository;
        private final UserStatsService userStatsService;

        // ============================================================
        // PREFERENCES — View & Edit allergy / diet info
        // ============================================================

        @GetMapping("/me/preferences")
        @Operation(summary = "Xem thông tin dị ứng và chế độ ăn hiện tại", description = "Trả về danh sách dị ứng và chế độ ăn đã lưu. Tất cả user đều có thể xem (FREE/PREMIUM). "
                        +
                        "Cũng trả về subscriptionTier và profileCompleted để mobile biết quyền hạn của user.")
        public ResponseEntity<UserPreferencesResponse> getPreferences(
                        @RequestHeader("X-User-Id") UUID userId) {
                log.info("Get preferences request: userId={}", userId);
                return ResponseEntity.ok(userService.getPreferences(userId));
        }

        @PutMapping("/me/preferences")
        @Operation(summary = "Cập nhật danh sách dị ứng và chế độ ăn [PREMIUM ONLY]", description = "Ghi đè toàn bộ preferences (idempotent). Chỉ PREMIUM users mới được chỉnh sửa. "
                        +
                        "FREE users nhận 403. Trả về preferences đã cập nhật.")
        public ResponseEntity<UserPreferencesResponse> updatePreferences(
                        @RequestHeader("X-User-Id") UUID userId,
                        @RequestBody @Valid UpdatePreferencesRequest request) {
                log.info("Update preferences request: userId={}", userId);

                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

                if (user.getSubscriptionTier() == SubscriptionTier.FREE) {
                        throw new PremiumRequiredException(
                                        "Personalized allergy preferences require PREMIUM or PREMIUM_GOLD subscription");
                }

                UserPreferencesResponse updated = userService.updatePreferences(userId, request);
                return ResponseEntity.ok(updated);
        }

        // ============================================================
        // SCAN HISTORY — Lịch sử quét
        // ============================================================

        @GetMapping("/me/scan-history")
        @Operation(summary = "Lịch sử quét sản phẩm (paginated + search)", description = "Trả về sản phẩm đã quét, mới nhất trước. "
                        +
                        "Hỗ trợ tìm kiếm theo barcode qua ?keyword=. " +
                        "Tất cả user đều có thể xem.")
        public ResponseEntity<Page<ScanHistoryItemResponse>> getScanHistory(
                        @RequestHeader("X-User-Id") UUID userId,
                        @Parameter(description = "Từ khóa tìm kiếm (barcode)") @RequestParam(required = false) String keyword,
                        @Parameter(description = "Trang (bắt đầu từ 0)") @RequestParam(defaultValue = "0") int page,
                        @Parameter(description = "Số lượng mỗi trang (tối đa 50)") @RequestParam(defaultValue = "20") int size) {
                log.info("Scan history: userId={}, keyword={}, page={}, size={}", userId, keyword, page, size);
                return ResponseEntity.ok(scanHistoryService.getHistory(userId, keyword, page, size));
        }

        // ============================================================
        // STATS
        // ============================================================

        @GetMapping("/me/stats")
        @Operation(summary = "Thống kê quét sản phẩm", description = "Tổng số lần quét, phân bố màu (xanh/vàng/đỏ), điểm an toàn tổng hợp. Tất cả user xem được.")
        public ResponseEntity<UserStatsResponse> getStats(
                        @RequestHeader("X-User-Id") UUID userId) {
                log.info("Stats request: userId={}", userId);
                return ResponseEntity.ok(userStatsService.getStats(userId));
        }
}
