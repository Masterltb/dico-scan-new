package com.dico.scan.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Stores tokens and subscription expiry dates for a user.
 * Tách biệt bảng Wallet và Users để giảm thiểu deadlocks khi update đồng xu liên tục từ Rewarded Ads.
 * GUARDRAIL: No @OneToOne directly attached to User. Query via UserWalletRepository by userId.
 */
@Entity
@Table(name = "user_wallets", indexes = {
        @Index(name = "idx_user_wallet_user_id", columnList = "user_id", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
public class UserWallet {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    /** Só lượng DICO Xu hiện có */
    @Column(name = "tokens", nullable = false)
    private int tokens = 0;

    /** Ngày hết hạn gói Premium / Premium Gold. Có thể null nếu dùng gói Free. */
    @Column(name = "premium_expiry_date")
    private OffsetDateTime premiumExpiryDate;

    /** Thời điểm lần cuối user nhận thưởng Token từ Rewarded Ads.
     *  Dùng để enforce cooldown 30 giây chống spam. Null = chưa bao giờ nhận. */
    @Column(name = "last_rewarded_at")
    private OffsetDateTime lastRewardedAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
