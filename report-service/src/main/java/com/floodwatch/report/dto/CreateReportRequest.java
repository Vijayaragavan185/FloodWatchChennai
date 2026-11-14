package com.floodwatch.report.dto;

public record CreateReportRequest(Integer streetId, Long userId, Integer severity,
                                  Integer depthCm, String description) { }
