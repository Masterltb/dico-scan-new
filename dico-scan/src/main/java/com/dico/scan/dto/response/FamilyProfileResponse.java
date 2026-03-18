package com.dico.scan.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FamilyProfileResponse {
    private UUID id;
    private String name;
    private String relationship;
    private List<String> allergies;
    private String diet;
}
