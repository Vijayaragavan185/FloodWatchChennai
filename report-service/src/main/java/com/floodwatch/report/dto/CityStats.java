package com.floodwatch.report.dto;

public record CityStats(long activeReports, long confirmedReports, long wardsAffected,
                        long reportsThisSeason, long registeredUsers, int confirmThreshold) { }
