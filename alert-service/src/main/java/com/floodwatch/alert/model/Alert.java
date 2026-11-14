package com.floodwatch.alert.model;

import java.time.LocalDateTime;

/** One row of the ALERTS table joined with street and ward names. */
public record Alert(long id, int streetId, String streetName, String wardName, String zone,
                    int gridRow, int gridCol, long reportId, String level, int confirmations,
                    int severity, int depthCm, boolean active,
                    LocalDateTime createdAt, LocalDateTime updatedAt, LocalDateTime resolvedAt) { }
