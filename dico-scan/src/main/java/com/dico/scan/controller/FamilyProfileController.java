package com.dico.scan.controller;

import com.dico.scan.dto.request.CreateFamilyProfileRequest;
import com.dico.scan.dto.response.FamilyProfileResponse;
import com.dico.scan.service.FamilyProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/v1/users/me/family-profiles")
@RequiredArgsConstructor
@Tag(name = "Family Profiles", description = "Quản lý hồ sơ gia đình (Chỉ dành cho PREMIUM_GOLD)")
public class FamilyProfileController {

    private final FamilyProfileService familyProfileService;

    @GetMapping
    @Operation(summary = "Lấy danh sách hồ sơ gia đình")
    public ResponseEntity<List<FamilyProfileResponse>> getProfiles(
            @RequestHeader("X-User-Id") UUID userId) {
        return ResponseEntity.ok(familyProfileService.getProfiles(userId));
    }

    @PostMapping
    @Operation(summary = "Thêm mới hồ sơ người thân")
    public ResponseEntity<FamilyProfileResponse> addProfile(
            @RequestHeader("X-User-Id") UUID userId,
            @Valid @RequestBody CreateFamilyProfileRequest request) {
        return ResponseEntity.ok(familyProfileService.addProfile(userId, request));
    }

    @PutMapping("/{profileId}")
    @Operation(summary = "Cập nhật hồ sơ người thân")
    public ResponseEntity<FamilyProfileResponse> updateProfile(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID profileId,
            @Valid @RequestBody CreateFamilyProfileRequest request) {
        return ResponseEntity.ok(familyProfileService.updateProfile(userId, profileId, request));
    }

    @DeleteMapping("/{profileId}")
    @Operation(summary = "Xóa hồ sơ người thân")
    public ResponseEntity<Void> deleteProfile(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID profileId) {
        familyProfileService.deleteProfile(userId, profileId);
        return ResponseEntity.noContent().build();
    }
}
