package com.floodwatch.alert.model;

/** A ward whose report count this season is at or above the city average. */
public record WardRank(String wardName, String zone, int reports, double avgSeverity, int maxDepthCm) { }
