package com.dico.scan.repository;

import com.dico.scan.entity.FamilyProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FamilyProfileRepository extends JpaRepository<FamilyProfile, UUID> {
    List<FamilyProfile> findByUserId(UUID userId);
}
