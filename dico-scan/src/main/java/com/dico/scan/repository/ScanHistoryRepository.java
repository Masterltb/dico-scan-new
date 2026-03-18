package com.dico.scan.repository;

import com.dico.scan.entity.ScanHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ScanHistoryRepository extends JpaRepository<ScanHistory, UUID> {

        /**
         * GUARDRAIL (Rule 3): Fetches a DTO Projection instead of the full entity
         * graph.
         * Avoids loading the full ScanHistory join with Product just for list views.
         * Composite index (user_id, scanned_at DESC) makes this O(log n).
         */
        @Query("""
                        SELECT s
                        FROM ScanHistory s
                        LEFT JOIN FETCH s.product p
                        WHERE s.userId = :userId
                        ORDER BY s.scannedAt DESC
                        """)
        Page<ScanHistory> findHistoryByUserId(
                        @Param("userId") UUID userId, Pageable pageable);

        /**
         * Search scan history by barcode keyword 
         */
        @Query("""
                        SELECT s
                        FROM ScanHistory s
                        LEFT JOIN FETCH s.product p
                        WHERE s.userId = :userId
                          AND (LOWER(s.barcode) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')))
                        ORDER BY s.scannedAt DESC
                        """)
        Page<ScanHistory> searchHistoryByUserId(
                        @Param("userId") UUID userId,
                        @Param("keyword") String keyword,
                        Pageable pageable);

        /** Total scan count for user. */
        @Query("SELECT COUNT(s) FROM ScanHistory s WHERE s.userId = :userId")
        long countByUserId(@Param("userId") UUID userId);

        /**
         * Color distribution: returns list of [snapshotColor, count] pairs.
         * e.g. [["GREEN", 12], ["RED", 3], ["YELLOW", 7]]
         */
        @Query("SELECT s.snapshotColor, COUNT(s) FROM ScanHistory s WHERE s.userId = :userId GROUP BY s.snapshotColor")
        List<Object[]> countByColorForUser(@Param("userId") UUID userId);

        /** Barcode of most recent scan. Null if no history. */
        @Query("SELECT s.barcode FROM ScanHistory s WHERE s.userId = :userId ORDER BY s.scannedAt DESC LIMIT 1")
        String findLastScannedBarcode(@Param("userId") UUID userId);
}
