package com.floodwatch.report.service;

import com.floodwatch.report.domain.ReportStatus;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** Unit tests for the crowd-verification rule (Spring Boot testing basics, Unit 4). */
class VoteServiceTest {

    private static final int N = 3;

    @Test
    void openReportStaysOpenBelowThreshold() {
        assertEquals(ReportStatus.OPEN, VoteService.nextStatus(ReportStatus.OPEN, 2, 0, N));
    }

    @Test
    void openReportIsConfirmedWhenThresholdReached() {
        assertEquals(ReportStatus.CONFIRMED, VoteService.nextStatus(ReportStatus.OPEN, 3, 1, N));
    }

    @Test
    void openReportIsRejectedWhenDenialsDominate() {
        assertEquals(ReportStatus.REJECTED, VoteService.nextStatus(ReportStatus.OPEN, 1, 3, N));
    }

    @Test
    void tiedVotesAtThresholdDoNotReject() {
        // confirmations are checked first, so 3 confirm / 3 deny confirms the report
        assertEquals(ReportStatus.CONFIRMED, VoteService.nextStatus(ReportStatus.OPEN, 3, 3, N));
    }

    @Test
    void confirmedReportIsNeverDowngradedByVotes() {
        assertEquals(ReportStatus.CONFIRMED, VoteService.nextStatus(ReportStatus.CONFIRMED, 3, 5, N));
    }
}
