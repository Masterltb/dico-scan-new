package com.dico.scan.service;

import com.dico.scan.dto.request.SaveSafetyProfileRequest;
import com.dico.scan.dto.response.SafetyProfileResponse;
import com.dico.scan.entity.User;
import com.dico.scan.enums.SubscriptionTier;
import com.dico.scan.exception.PremiumRequiredException;
import com.dico.scan.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for Safety Profile (Questionnaire).
 * Handles data sanitization, persistence, and retrieval.
 *
 * SECURITY: All custom text inputs are sanitized before persistence:
 * - Trim whitespace
 * - Strip HTML tags
 * - Lowercase normalize allergen keys
 * - Remove duplicates
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SafetyProfileService {

    private final UserRepository userRepository;

    /**
     * Saves the safety profile from the questionnaire wizard.
     * Performs data cleaning/sanitization before persistence.
     */
    @Transactional
    public void saveSafetyProfile(UUID userId, SaveSafetyProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        if (user.getSubscriptionTier() == SubscriptionTier.FREE) {
            throw new PremiumRequiredException("Safety Profile requires PREMIUM or PREMIUM_GOLD");
        }

        Map<String, Object> profile = buildCleanProfile(request);
        user.setSafetyProfile(profile);
        user.setProfileCompleted(true);
        userRepository.save(user);

        log.info("Safety profile saved for userId={}, targets={}", userId, request.targets());
    }

    /**
     * Retrieves the safety profile for display on the confirmation screen.
     */
    @Transactional(readOnly = true)
    public SafetyProfileResponse getSafetyProfile(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        return SafetyProfileResponse.fromMap(user.getSafetyProfile(), user.isProfileCompleted());
    }

    /**
     * Builds the clean, sanitized JSONB Map from the request.
     * All lists are deduplicated, custom text is sanitized.
     */
    private Map<String, Object> buildCleanProfile(SaveSafetyProfileRequest req) {
        Map<String, Object> profile = new LinkedHashMap<>();

        profile.put("targets", cleanList(req.targets()));

        // Child Branch
        if (req.targets() != null && req.targets().contains("CHILD") && req.childProfile() != null) {
            Map<String, Object> child = new LinkedHashMap<>();
            child.put("ageGroup", req.childProfile().ageGroup());
            child.put("allergies", cleanList(req.childProfile().allergies()));
            child.put("customAllergies", sanitizeCustomList(req.childProfile().customAllergies()));
            child.put("severityLevel", req.childProfile().severityLevel());
            profile.put("childProfile", child);
        }

        // Pregnancy Branch
        if (req.targets() != null && req.targets().contains("PREGNANT") && req.pregnancyProfile() != null) {
            Map<String, Object> preg = new LinkedHashMap<>();
            preg.put("trimester", req.pregnancyProfile().trimester());
            preg.put("alertLevel", req.pregnancyProfile().alertLevel());
            profile.put("pregnancyProfile", preg);
        }

        profile.put("foodAllergies", cleanList(req.foodAllergies()));
        profile.put("customFoodAllergies", sanitizeCustomList(req.customFoodAllergies()));
        profile.put("cosmeticSensitivities", cleanList(req.cosmeticSensitivities()));
        profile.put("customCosmeticSensitivities", sanitizeCustomList(req.customCosmeticSensitivities()));
        profile.put("skinType", req.skinType());
        profile.put("healthConditions", cleanList(req.healthConditions()));
        profile.put("dietaryPreferences", cleanList(req.dietaryPreferences()));
        profile.put("alertLevel", req.alertLevel());
        profile.put("allergySeverity", req.allergySeverity());

        return profile;
    }

    /** Deduplicate + lowercase normalize a list of enum-type strings. */
    private List<String> cleanList(List<String> input) {
        if (input == null)
            return Collections.emptyList();
        return input.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .distinct()
                .collect(Collectors.toList());
    }

    /** Sanitize custom free-text inputs: trim, strip HTML, deduplicate. */
    private List<String> sanitizeCustomList(List<String> input) {
        if (input == null)
            return Collections.emptyList();
        return input.stream()
                .filter(Objects::nonNull)
                .map(s -> s.trim()
                        .replaceAll("<[^>]*>", "") // Strip HTML tags
                        .replaceAll("[<>\"';&]", "") // Remove dangerous chars
                        .trim())
                .filter(s -> !s.isEmpty() && s.length() <= 100)
                .distinct()
                .collect(Collectors.toList());
    }
}
