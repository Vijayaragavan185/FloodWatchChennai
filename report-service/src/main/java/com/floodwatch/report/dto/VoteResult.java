package com.floodwatch.report.dto;

public record VoteResult(ReportView report, boolean statusChanged, boolean alertRaised, String message) { }
