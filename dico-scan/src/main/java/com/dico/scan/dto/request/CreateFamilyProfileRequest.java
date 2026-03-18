package com.dico.scan.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateFamilyProfileRequest {
    @NotBlank(message = "Tên không được để trống")
    private String name;
    
    @NotBlank(message = "Mối quan hệ không được để trống")
    private String relationship;
    
    private List<String> allergies;
    
    private String diet;
}
