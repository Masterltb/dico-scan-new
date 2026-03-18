package com.dico.scan.service;

import com.dico.scan.dto.request.UpdatePreferencesRequest;
import com.dico.scan.dto.response.UserPreferencesResponse;
import com.dico.scan.entity.User;
import com.dico.scan.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    /**
     * Returns the current saved preferences (allergies + diet) for the user.
     * Works for both FREE and PREMIUM users — no tier gate on READ.
     */
    @Transactional(readOnly = true)
    public UserPreferencesResponse getPreferences(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        Map<String, Object> prefs = user.getPreferences();
        List<String> allergies = extractAllergies(prefs);
        String diet = prefs != null ? (String) prefs.getOrDefault("diet", "") : "";

        return new UserPreferencesResponse(
                allergies,
                diet,
                user.getSubscriptionTier() != null ? user.getSubscriptionTier().name() : "FREE",
                user.isProfileCompleted(),
                user.getSafetyProfile());
    }

    /**
     * Idempotent update of user allergy preferences (PREMIUM only — gate enforced
     * in Controller).
     * Loads the User entity to take advantage of Hibernate JSONB mappings.
     * Returns updated preferences so mobile can reflect changes immediately.
     */
    @Transactional
    public UserPreferencesResponse updatePreferences(UUID userId, UpdatePreferencesRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        Map<String, Object> prefs = new HashMap<>();
        prefs.put("allergies", request.allergies() != null ? request.allergies() : Collections.emptyList());
        prefs.put("diet", request.diet() != null ? request.diet() : "");

        user.setPreferences(prefs);

        // Update safety profile if provided
        if (request.safetyProfile() != null) {
            user.setSafetyProfile(request.safetyProfile());
            user.setProfileCompleted(true); // Auto mark as completed if saving profile
        }

        userRepository.save(user);

        log.info("Preferences updated: userId={}, allergies={}, diet={}, profileCompleted={}",
                userId, request.allergies(), request.diet(), user.isProfileCompleted());

        return new UserPreferencesResponse(
                request.allergies(),
                request.diet(),
                user.getSubscriptionTier() != null ? user.getSubscriptionTier().name() : "FREE",
                user.isProfileCompleted(),
                user.getSafetyProfile());
    }

    // ===== Private Helpers =====

    private List<String> extractAllergies(Map<String, Object> prefs) {
        if (prefs == null)
            return Collections.emptyList();
        Object val = prefs.get("allergies");
        if (val instanceof List<?> list) {
            return list.stream()
                    .filter(e -> e instanceof String)
                    .map(e -> (String) e)
                    .toList();
        }
        return Collections.emptyList();
    }
}
