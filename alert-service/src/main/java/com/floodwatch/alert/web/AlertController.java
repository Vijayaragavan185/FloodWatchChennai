package com.floodwatch.alert.web;

import com.floodwatch.alert.jdbc.DataAccessException;
import com.floodwatch.alert.model.Alert;
import com.floodwatch.alert.model.EvaluationResult;
import com.floodwatch.alert.model.Insights;
import com.floodwatch.alert.service.AlertService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin(origins = "http://localhost:5173")
public class AlertController {

    private final AlertService service;

    public AlertController(AlertService service) { this.service = service; }

    /** Called by report-service when a report crosses the confirmation threshold. */
    @PostMapping("/api/alerts/evaluate/{reportId}")
    public EvaluationResult evaluate(@PathVariable("reportId") long reportId) { return service.evaluate(reportId); }

    /** GET /api/alerts?active=true */
    @GetMapping("/api/alerts")
    public List<Alert> list(@RequestParam(value = "active", defaultValue = "true") boolean active) { return service.list(active); }

    @PutMapping("/api/alerts/{id}/resolve")
    public ResponseEntity<Map<String, Object>> resolve(@PathVariable("id") long id) {
        boolean changed = service.resolve(id);
        return ResponseEntity.ok(Map.of("id", id, "resolved", changed));
    }

    @PutMapping("/api/alerts/street/{streetId}/resolve")
    public Map<String, Object> resolveStreet(@PathVariable("streetId") int streetId) {
        return Map.of("streetId", streetId, "closed", service.resolveStreet(streetId));
    }

    @GetMapping("/api/insights")
    public Insights insights() { return service.insights(); }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, String>> dbError(DataAccessException ex) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("error", "DATABASE", "message", ex.getMessage()));
    }
}
