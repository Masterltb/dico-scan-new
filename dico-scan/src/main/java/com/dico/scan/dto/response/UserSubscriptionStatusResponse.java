package com.dico.scan.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSubscriptionStatusResponse {
    private String tier;
    private int availableTokens;
    private OffsetDateTime premiumExpiryDate;
}
