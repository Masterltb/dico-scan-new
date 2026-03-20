package com.dico.scan.controller;

import com.dico.scan.dto.response.TokenRewardResponse;
import com.dico.scan.dto.response.UserSubscriptionStatusResponse;
import com.dico.scan.entity.User;
import com.dico.scan.entity.UserWallet;
import com.dico.scan.enums.SubscriptionTier;
import com.dico.scan.repository.UserRepository;
import com.dico.scan.service.UserWalletService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * Subscription & Wallet management endpoints.
 */
@Slf4j
@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
@Tag(name = "Users & Subscriptions", description = "Endpoints for Tokens, Subscriptions, and Wallet")
public class SubscriptionController {

    private final UserRepository userRepository;
    private final UserWalletService walletService;

    @GetMapping("/users/me/subscription")
    @Operation(summary = "Lấy trạng thái gói dịch vụ & ví Xu", description = "Trả về tier hiện tại, số Xu và ngày hết hạn.")
    public ResponseEntity<UserSubscriptionStatusResponse> getSubscriptionStatus(
            @RequestHeader("X-User-Id") UUID userId) {
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));
        
        UserWallet wallet = walletService.getWalletByUserId(userId);

        UserSubscriptionStatusResponse response = UserSubscriptionStatusResponse.builder()
                .tier(user.getSubscriptionTier().name())
                .availableTokens(wallet.getTokens())
                .premiumExpiryDate(wallet.getPremiumExpiryDate())
                .build();

        return ResponseEntity.ok(response);
    }

    @PostMapping("/users/me/tokens/reward")
    @Operation(summary = "Nhận thưởng 1 Xu khi xem quảng cáo", description = "Chỉ FREE users. PREMIUM/GOLD không cần. Cooldown 30 giây chống spam.")
    public ResponseEntity<TokenRewardResponse> rewardToken(
            @RequestHeader("X-User-Id") UUID userId) {
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        // PREMIUM/GOLD không cần Token — họ đã unlock tất cả
        if (user.getSubscriptionTier() != SubscriptionTier.FREE) {
            return ResponseEntity.badRequest().build();
        }

        int newBalance = walletService.rewardToken(userId);
        return ResponseEntity.ok(new TokenRewardResponse(newBalance));
    }

    @PostMapping("/subscriptions/upgrade")
    @Operation(summary = "Nâng cấp lên PREMIUM [DEV MODE]", description = "Dev mode: upgrade ngay lập tức không cần thanh toán.")
    public ResponseEntity<Map<String, Object>> upgrade(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestParam(defaultValue = "PREMIUM") SubscriptionTier targetTier) {
                
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        if (user.getSubscriptionTier() == targetTier) {
            log.info("User {} already {} — no-op upgrade", userId, targetTier);
            return ResponseEntity.ok(Map.of(
                    "subscriptionTier", targetTier.name(),
                    "message", "Bạn đã đang ở gói này rồi",
                    "upgraded", false));
        }

        user.setSubscriptionTier(targetTier);
        userRepository.save(user);

        log.info("User {} upgraded to {}", userId, targetTier);
        return ResponseEntity.ok(Map.of(
                "subscriptionTier", targetTier.name(),
                "message", "Nâng cấp thành công lên " + targetTier.name() + "!",
                "upgraded", true));
    }

    @PostMapping("/subscriptions/downgrade")
    @Operation(summary = "Hạ xuống FREE [DEV/TEST ONLY]", description = "Chỉ dùng trong môi trường dev/test để reset tier về FREE.")
    public ResponseEntity<Map<String, Object>> downgrade(
            @RequestHeader("X-User-Id") UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        user.setSubscriptionTier(SubscriptionTier.FREE);
        userRepository.save(user);

        log.info("User {} downgraded to FREE [TEST]", userId);
        return ResponseEntity.ok(Map.of(
                "subscriptionTier", "FREE",
                "message", "Đã hạ xuống FREE (test mode)"));
    }
}
