package com.floodwatch.alert.service;

import com.floodwatch.alert.jdbc.AlertDao;
import com.floodwatch.alert.jdbc.InsightDao;
import com.floodwatch.alert.model.Alert;
import com.floodwatch.alert.model.EvaluationResult;
import com.floodwatch.alert.model.Insights;
import com.floodwatch.alert.model.ReportSnapshot;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * Alert rules.
 * A street gets one active alert once any of its reports is CONFIRMED with at least N confirmations.
 * Level: SEVERE for severity 5 or depth >= 60 cm, WARNING for severity >= 3 or depth >= 30 cm, else WATCH.
 * Strong crowd agreement (2N confirmations) lifts a WATCH to WARNING. Levels only go up while active.
 */
@Service
public class AlertService {

    private final AlertDao alerts;
    private final InsightDao insights;
    private final int threshold;

    public AlertService(AlertDao alerts, InsightDao insights,
                        @Value("${floodwatch.confirm-threshold:3}") int threshold) {
        this.alerts = alerts; this.insights = insights; this.threshold = threshold;
    }

    public int threshold() { return threshold; }

    public EvaluationResult evaluate(long reportId) {
        Optional<ReportSnapshot> found = alerts.findReport(reportId);
        if (found.isEmpty()) {
            return new EvaluationResult(reportId, false, false, null, null, 0, threshold, "Report not found");
        }
        ReportSnapshot r = found.get();
        Optional<Alert> existing = alerts.findActiveForStreet(r.streetId());

        if (!"CONFIRMED".equals(r.status()) || r.confirmations() < threshold) {
            return new EvaluationResult(reportId, existing.isPresent(), false, existing.map(Alert::id).orElse(null),
                    existing.map(Alert::level).orElse(null), r.confirmations(), threshold,
                    "Needs " + threshold + " confirmations and CONFIRMED status");
        }

        String level = levelFor(r.severity(), r.depthCm(), r.confirmations(), threshold);
        if (existing.isPresent()) {
            Alert a = existing.get();
            String merged = higher(a.level(), level);
            int confirmations = Math.max(a.confirmations(), r.confirmations());
            alerts.update(a.id(), r.reportId(), merged, confirmations);
            return new EvaluationResult(reportId, true, false, a.id(), merged, confirmations, threshold, "Alert updated");
        }
        long id = alerts.insert(r.streetId(), r.reportId(), level, r.confirmations());
        return new EvaluationResult(reportId, true, true, id, level, r.confirmations(), threshold, "Alert raised");
    }

    /** Re-evaluates every confirmed report; makes the service self-healing after downtime. */
    public int backfill() {
        int raised = 0;
        for (Long id : alerts.findConfirmedReportIds()) {
            if (evaluate(id).raised()) raised++;
        }
        return raised;
    }

    public List<Alert> list(boolean activeOnly) { return alerts.findAll(activeOnly); }

    public boolean resolve(long alertId) { return alerts.resolve(alertId) > 0; }

    public int resolveStreet(int streetId) { return alerts.resolveStreet(streetId); }

    public Insights insights() {
        return new Insights(insights.chronicStreets(), insights.newHotspots(), insights.needsAttention(),
                insights.wardRanking(), "Oct 2025 - Jan 2026", "From Oct 2026");
    }

    // ------------------------------------------------------------------ pure rules (unit tested)

    static String levelFor(int severity, int depthCm, int confirmations, int threshold) {
        String level;
        if (severity >= 5 || depthCm >= 60) level = "SEVERE";
        else if (severity >= 3 || depthCm >= 30) level = "WARNING";
        else level = "WATCH";
        if (level.equals("WATCH") && confirmations >= 2 * threshold) level = "WARNING";
        return level;
    }

    static String higher(String a, String b) {
        return rank(a) >= rank(b) ? a : b;
    }

    private static int rank(String level) {
        return switch (level) {
            case "SEVERE" -> 3;
            case "WARNING" -> 2;
            default -> 1;
        };
    }
}
