package com.dico.scan.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Records each product scan by a user.
 *
 * GUARDRAIL (Rule 2): Uses UUID user_id directly instead of @ManyToOne User
 * to avoid lazy-loading the full User entity on every history query.
 * user_id is the FK reference; user data is fetched separately if needed.
 *
 * Snapshot pattern: snapshot_color stores the rating at scan time,
 * so historical records remain accurate even if product data is updated later.
 */
@Entity
@Table(name = "scan_history", indexes = {
        @Index(name = "idx_scan_hist_user_time", columnList = "user_id, scanned_at DESC")
})
@Getter
@Setter
@NoArgsConstructor
public class ScanHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    /**
     * FK to users.id — stored as plain UUID, not via @ManyToOne (Guardrail Rule 2)
     */
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    /** FK to products.barcode */
    @Column(name = "barcode", nullable = false, length = 14)
    private String barcode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "barcode", referencedColumnName = "barcode", insertable = false, updatable = false)
    private Product product;

    @Column(name = "scanned_at", nullable = false)
    private OffsetDateTime scannedAt;

    /** Rating captured at scan time — not affected by later product re-analysis */
    @Column(name = "snapshot_color", length = 10)
    private String snapshotColor;

    @PrePersist
    protected void onCreate() {
        if (scannedAt == null) {
            scannedAt = OffsetDateTime.now();
        }
    }
}
