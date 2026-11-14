package com.floodwatch.alert;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * FloodWatch Chennai - Alert Service.
 * Flags streets confirmed by at least N neighbours and serves SQL insights.
 * Its data layer uses plain JDBC instead of JPA.
 */
@SpringBootApplication
public class AlertServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(AlertServiceApplication.class, args);
    }
}
