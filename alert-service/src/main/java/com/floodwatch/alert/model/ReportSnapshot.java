package com.floodwatch.alert.model;

/** The fields of a report that alert-service needs, read straight from the shared database. */
public record ReportSnapshot(long reportId, int streetId, String status, int severity, int depthCm,
                             int confirmations, int denials) { }
