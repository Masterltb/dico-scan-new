package com.dico.scan.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Lightweight DTO for scan history list items.
 * GUARDRAIL (Rule 3): Query fetches only these 4 fields via JPQL constructor
 * expression.
 * Full Product data is NOT loaded here.
 */
public record ScanHistoryItemResponse(
        UUID scanId,
        String barcode,
        String name,
        String imageUrl,
        OffsetDateTime scannedAt,
        String snapshotColor) {
}
