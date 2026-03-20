package com.dico.scan.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateFamilyProfileRequest {
    @NotBlank(message = "Tên không được để trống")
    private String name;
    
    @NotBlank(message = "Mối quan hệ không được để trống")
    private String relationship;
    
    /** Full safety profile JSON object mirroring SafetyProfileRequest structure */
    private Map<String, Object> safetyProfile;
}
