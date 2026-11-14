package com.floodwatch.report.dto;

import java.time.LocalDateTime;

/** Flattened report for the React client, including live vote counts. */
public record ReportView(Long id,
                         Integer streetId, String streetName, boolean lowLying,
                         Integer wardId, String wardName, String zone,
                         Long reporterId, String reporterName,
                         int severity, int depthCm, String description,
                         String status, LocalDateTime reportedAt,
                         long confirmations, long denials, int threshold) { }
