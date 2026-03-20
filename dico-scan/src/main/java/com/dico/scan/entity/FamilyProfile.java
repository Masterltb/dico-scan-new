package com.dico.scan.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Stores profile data for a user's family members.
 * ONLY applicable for PREMIUM_GOLD users.
 * V9: Now stores a full SafetyProfile JSONB instead of simple allergies/diet.
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

    /** Relationship: CON_CAI, VO_CHONG, BO_ME, OTHER */
    @Column(name = "relationship", nullable = false, length = 50)
    private String relationship;

    /**
     * Full safety profile for this family member.
     * Same structure as user's own safety_profile JSONB.
     * E.g.: {"targets":["CHILD"],"foodAllergies":["peanut"],"skinType":"SENSITIVE",...}
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "safety_profile", columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> safetyProfile = new java.util.HashMap<>();

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
