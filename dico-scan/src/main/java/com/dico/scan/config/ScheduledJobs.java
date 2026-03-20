package com.dico.scan.config;

import com.dico.scan.service.AffiliateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ScheduledJobs {

    private final AffiliateService affiliateService;

    /** Dọn dẹp affiliate links hết hạn — chạy lúc 2:00 AM hàng ngày */
    @Scheduled(cron = "0 0 2 * * *")
    public void cleanupAffiliateLinks() {
        log.info("Starting affiliate link cleanup...");
        affiliateService.cleanupExpiredLinks();
    }
}
