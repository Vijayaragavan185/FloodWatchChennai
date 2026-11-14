package com.floodwatch.report.domain;

/**
 * Life cycle of a waterlogging report.
 * OPEN -> CONFIRMED (enough CONFIRM votes) -> RESOLVED (official)
 * OPEN -> REJECTED  (enough DENY votes, more denials than confirmations)
 */
public enum ReportStatus { OPEN, CONFIRMED, REJECTED, RESOLVED;

    public boolean isActive() {
        return this == OPEN || this == CONFIRMED;
    }
}
