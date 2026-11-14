package com.floodwatch.alert.model;

/** Response of POST /api/alerts/evaluate/{reportId}. */
public record EvaluationResult(long reportId, boolean active, boolean raised, Long alertId,
                               String level, int confirmations, int threshold, String reason) { }
