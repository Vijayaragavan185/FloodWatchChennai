package com.floodwatch.report.dto;

/** One cell of the Canvas ward map. maxSeverity = 0 means no active report. */
public record WardSummary(Integer wardId, String code, String name, String zone,
                          int gridRow, int gridCol,
                          long activeReports, long confirmedReports, int maxSeverity) { }
