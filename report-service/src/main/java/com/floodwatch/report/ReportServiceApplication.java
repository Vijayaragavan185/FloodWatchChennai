package com.floodwatch.report;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * FloodWatch Chennai - Report Service.
 * Owns wards, streets, citizens, waterlogging reports and votes (Spring Data JPA).
 */
@SpringBootApplication
public class ReportServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(ReportServiceApplication.class, args);
    }
}
