package com.dico.scan.service;

import com.dico.scan.dto.response.ScanHistoryItemResponse;
import com.dico.scan.entity.ScanHistory;
import com.dico.scan.repository.ScanHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Service for scan history queries.
 *
 * GUARDRAIL (Rule 1): Uses paginated DTO projection via Repository@Query.
 * GUARDRAIL (Rule 3): readOnly transaction — no DB write here.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ScanHistoryService {

    private final ScanHistoryRepository scanHistoryRepository;

    private static final int MAX_PAGE_SIZE = 50;

    /**
     * Returns paginated scan history, ordered by most recent first.
     * If keyword is provided, filters by barcode match.
     *
     * @param userId  Authenticated user ID
     * @param keyword Optional search keyword (barcode substring). If null/blank →
     *                all.
     * @param page    Page number (0-based)
     * @param size    Page size (capped at MAX_PAGE_SIZE)
     */
    @Transactional(readOnly = true)
    public Page<ScanHistoryItemResponse> getHistory(UUID userId, String keyword, int page, int size) {
        int clampedSize = Math.min(size, MAX_PAGE_SIZE);
        Pageable pageable = PageRequest.of(page, clampedSize);

        boolean hasKeyword = keyword != null && !keyword.isBlank();
        log.debug("Scan history query: userId={}, keyword={}, page={}, size={}", userId, keyword, page, clampedSize);

        Page<ScanHistory> pageResult;
        if (hasKeyword) {
            pageResult = scanHistoryRepository.searchHistoryByUserId(userId, keyword.trim(), pageable);
        } else {
            pageResult = scanHistoryRepository.findHistoryByUserId(userId, pageable);
        }

        return pageResult.map(s -> {
            String prodName = s.getProduct() != null ? s.getProduct().getName() : null;
            String prodImage = s.getProduct() != null ? s.getProduct().getImageUrl() : null;

            return new ScanHistoryItemResponse(
                s.getId(),
                s.getBarcode(),
                prodName,
                prodImage,
                s.getScannedAt(),
                s.getSnapshotColor()
            );
        });
    }

    /**
     * Records a product scan for an authenticated user.
     * Called asynchronously after product evaluation completes successfully.
     *
     * @param userId      Authenticated user ID — skip if null (anonymous)
     * @param barcode     Scanned product barcode
     * @param ratingColor Rating at scan time (GREEN/YELLOW/RED/UNKNOWN) — snapshot
     */
    @Transactional
    public void recordScan(UUID userId, String barcode, String ratingColor) {
        if (userId == null) {
            log.debug("Anonymous scan — not recording in history");
            return;
        }
        ScanHistory history = new ScanHistory();
        history.setUserId(userId);
        history.setBarcode(barcode);
        history.setSnapshotColor(ratingColor);
        scanHistoryRepository.save(history);
        log.debug("Scan recorded: userId={} barcode={} rating={}", userId, barcode, ratingColor);
    }
}
