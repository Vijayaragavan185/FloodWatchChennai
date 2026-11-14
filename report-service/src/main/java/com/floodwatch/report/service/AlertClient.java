package com.floodwatch.report.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Map;

/**
 * HTTP client for the alert-service microservice.
 * Failures are logged and swallowed so that a citizen can still report or vote
 * while alert-service is restarting; alert-service back-fills alerts on its next start.
 */
@Component
public class AlertClient {

    private static final Logger log = LoggerFactory.getLogger(AlertClient.class);
    private final RestClient restClient;

    public AlertClient(@Value("${floodwatch.alert-service.url}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).build();
    }

    /** Asks alert-service to (re)evaluate a confirmed report. Returns true if an alert is now active. */
    public boolean evaluate(Long reportId) {
        try {
            Map<?, ?> body = restClient.post()
                    .uri("/api/alerts/evaluate/{id}", reportId)
                    .retrieve()
                    .body(Map.class);
            return body != null && Boolean.TRUE.equals(body.get("active"));
        } catch (RestClientException ex) {
            log.warn("alert-service unreachable while evaluating report {}: {}", reportId, ex.getMessage());
            return false;
        }
    }

    /** Tells alert-service that an official resolved the street, so its alerts are closed. */
    public void resolveStreet(Integer streetId) {
        try {
            restClient.put()
                    .uri("/api/alerts/street/{id}/resolve", streetId)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException ex) {
            log.warn("alert-service unreachable while resolving street {}: {}", streetId, ex.getMessage());
        }
    }
}
