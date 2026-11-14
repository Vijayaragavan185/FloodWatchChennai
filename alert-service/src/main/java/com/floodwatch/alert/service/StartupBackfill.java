package com.floodwatch.alert.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/** On start-up, creates the ALERTS table and raises alerts for already confirmed reports. */
@Component
public class StartupBackfill implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(StartupBackfill.class);
    private final AlertService service;

    public StartupBackfill(AlertService service) { this.service = service; }

    @Override
    public void run(ApplicationArguments args) {
        try {
            int raised = service.backfill();
            log.info("Alert back-fill complete: {} new alert(s), threshold N = {}", raised, service.threshold());
        } catch (RuntimeException ex) {
            log.warn("Back-fill skipped ({}). Start report-service first; alerts will be created on demand.",
                    ex.getMessage());
        }
    }
}
