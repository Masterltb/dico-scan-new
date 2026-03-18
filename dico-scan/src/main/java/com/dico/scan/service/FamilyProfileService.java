package com.dico.scan.service;

import com.dico.scan.dto.request.CreateFamilyProfileRequest;
import com.dico.scan.dto.response.FamilyProfileResponse;
import com.dico.scan.entity.FamilyProfile;
import com.dico.scan.entity.User;
import com.dico.scan.enums.SubscriptionTier;
import com.dico.scan.repository.FamilyProfileRepository;
import com.dico.scan.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FamilyProfileService {

    private final FamilyProfileRepository familyProfileRepository;
    private final UserRepository userRepository;

    private void verifyPremiumGold(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        if (user.getSubscriptionTier() != SubscriptionTier.PREMIUM_GOLD) {
            throw new RuntimeException("PREMIUM_REQUIRED: Chức năng Family Profile chỉ dành cho thành viên Premium Gold.");
        }
    }

    public List<FamilyProfileResponse> getProfiles(UUID userId) {
        verifyPremiumGold(userId);
        
        return familyProfileRepository.findByUserId(userId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public FamilyProfileResponse addProfile(UUID userId, CreateFamilyProfileRequest request) {
        verifyPremiumGold(userId);

        FamilyProfile profile = new FamilyProfile();
        profile.setUserId(userId);
        profile.setName(request.getName());
        profile.setRelationship(request.getRelationship());
        profile.setAllergies(request.getAllergies() != null ? request.getAllergies() : List.of());
        profile.setDiet(request.getDiet() != null ? request.getDiet() : "NONE");

        FamilyProfile saved = familyProfileRepository.save(profile);
        log.info("User {} added Family Profile: {}", userId, saved.getId());
        return mapToResponse(saved);
    }

    @Transactional
    public FamilyProfileResponse updateProfile(UUID userId, UUID profileId, CreateFamilyProfileRequest request) {
        verifyPremiumGold(userId);

        FamilyProfile profile = familyProfileRepository.findById(profileId)
                .orElseThrow(() -> new RuntimeException("Profile not found or does not belong to you"));

        if (!profile.getUserId().equals(userId)) {
            throw new RuntimeException("Access Denied");
        }

        profile.setName(request.getName());
        profile.setRelationship(request.getRelationship());
        profile.setAllergies(request.getAllergies() != null ? request.getAllergies() : List.of());
        profile.setDiet(request.getDiet() != null ? request.getDiet() : "NONE");

        FamilyProfile saved = familyProfileRepository.save(profile);
        return mapToResponse(saved);
    }

    @Transactional
    public void deleteProfile(UUID userId, UUID profileId) {
        verifyPremiumGold(userId);

        FamilyProfile profile = familyProfileRepository.findById(profileId)
                .orElseThrow(() -> new RuntimeException("Profile not found"));

        if (!profile.getUserId().equals(userId)) {
            throw new RuntimeException("Access Denied");
        }

        familyProfileRepository.delete(profile);
        log.info("User {} deleted Family Profile: {}", userId, profileId);
    }

    private FamilyProfileResponse mapToResponse(FamilyProfile p) {
        return FamilyProfileResponse.builder()
                .id(p.getId())
                .name(p.getName())
                .relationship(p.getRelationship())
                .allergies(p.getAllergies())
                .diet(p.getDiet())
                .build();
    }
}
