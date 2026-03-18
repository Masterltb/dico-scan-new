package com.dico.scan.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Stores profile data for a user's family members.
 * ONLY applicable for PREMIUM_GOLD users.
 */
@Entity
@Table(name = "family_profiles", indexes = {
        @Index(name = "idx_family_profile_user_id", columnList = "user_id")
})
@Getter
@Setter
@NoArgsConstructor
public class FamilyProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    /** Relationship: CHILD, SPOUSE, PARENT, OTHER */
    @Column(name = "relationship", nullable = false, length = 50)
    private String relationship;

    /** Mảng dị ứng của người thân (ví dụ: ["peanut", "milk"]) */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "allergies", columnDefinition = "jsonb", nullable = false)
    private List<String> allergies = List.of();

    /** Chế độ ăn kiêng (Ví dụ: VEGAN, NONE) */
    @Column(name = "diet", length = 50)
    private String diet = "NONE";

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
