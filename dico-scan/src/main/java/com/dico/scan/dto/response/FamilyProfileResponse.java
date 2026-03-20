package com.dico.scan.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FamilyProfileResponse {
    private UUID id;
    private String name;
    private String relationship;
    /** Full safety profile JSON (same structure as user's own safety profile) */
    private Map<String, Object> safetyProfile;
}
