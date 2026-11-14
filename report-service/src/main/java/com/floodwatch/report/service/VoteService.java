package com.floodwatch.report.service;

import com.floodwatch.report.domain.AppUser;
import com.floodwatch.report.domain.FloodReport;
import com.floodwatch.report.domain.ReportStatus;
import com.floodwatch.report.domain.Vote;
import com.floodwatch.report.domain.VoteType;
import com.floodwatch.report.dto.VoteRequest;
import com.floodwatch.report.dto.VoteResult;
import com.floodwatch.report.repository.VoteRepository;
import com.floodwatch.report.dto.ReportView;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Crowd verification rules.
 * <ul>
 *   <li>A reporter cannot vote on their own report, and each user votes once per report.</li>
 *   <li>Votes are accepted only while the report is OPEN or CONFIRMED.</li>
 *   <li>When CONFIRM votes reach the threshold N the report becomes CONFIRMED and alert-service is called.</li>
 *   <li>When DENY votes reach N and outnumber confirmations an OPEN report becomes REJECTED.</li>
 * </ul>
 * The vote is committed first and alert-service is called afterwards, so the other
 * microservice (which reads the database through its own JDBC connection) sees the new vote.
 */
@Service
public class VoteService {

    private final ReportService reportService;
    private final VoteRepository votes;
    private final AlertClient alertClient;
    private final TransactionTemplate tx;

    public VoteService(ReportService reportService, VoteRepository votes, AlertClient alertClient,
                       PlatformTransactionManager transactionManager) {
        this.reportService = reportService; this.votes = votes; this.alertClient = alertClient;
        this.tx = new TransactionTemplate(transactionManager);
    }

    /** Result of the database part of a vote, produced inside the transaction. */
    record Outcome(ReportView view, ReportStatus before, ReportStatus after, long confirmations, long denials) { }

    public VoteResult vote(Long reportId, VoteRequest req) {
        if (req == null || req.userId() == null) throw new BusinessRuleException("userId is required");
        VoteType type = parse(req.voteType());
        Outcome o = tx.execute(status -> recordVote(reportId, req.userId(), type));

        boolean alertActive = false;
        if (o.after() == ReportStatus.CONFIRMED && type == VoteType.CONFIRM) {
            alertActive = alertClient.evaluate(reportId);   // microservice call, after commit
        }
        int n = reportService.threshold();
        String message;
        if (o.before() != o.after() && o.after() == ReportStatus.CONFIRMED) {
            message = "Confirmed by " + o.confirmations() + " neighbours - alert-service notified";
        } else if (o.before() != o.after() && o.after() == ReportStatus.REJECTED) {
            message = "Report rejected after " + o.denials() + " denials";
        } else if (o.after() == ReportStatus.OPEN) {
            message = "Vote recorded - " + Math.max(0, n - o.confirmations()) + " more confirmation(s) needed";
        } else {
            message = "Vote recorded";
        }
        return new VoteResult(o.view(), o.before() != o.after(), alertActive, message);
    }

    private Outcome recordVote(Long reportId, Long userId, VoteType type) {
        FloodReport report = reportService.findReport(reportId);
        AppUser voter = reportService.findUser(userId);

        if (!report.getStatus().isActive())
            throw new BusinessRuleException("Voting is closed: this report is " + report.getStatus());
        if (report.getReporter().getId().equals(voter.getId()))
            throw new BusinessRuleException("You cannot vote on your own report");
        if (votes.existsByReport_IdAndVoter_Id(reportId, voter.getId()))
            throw new BusinessRuleException("You have already voted on this report");

        votes.save(new Vote(report, voter, type));

        long confirmations = votes.countByReport_IdAndVoteType(reportId, VoteType.CONFIRM);
        long denials = votes.countByReport_IdAndVoteType(reportId, VoteType.DENY);
        int n = reportService.threshold();

        ReportStatus before = report.getStatus();
        ReportStatus after = nextStatus(before, confirmations, denials, n);
        report.setStatus(after);
        return new Outcome(reportService.toView(report, confirmations, denials), before, after, confirmations, denials);
    }

    /** Pure decision rule, kept static so it can be unit tested without Spring. */
    static ReportStatus nextStatus(ReportStatus current, long confirmations, long denials, int threshold) {
        if (current == ReportStatus.OPEN && confirmations >= threshold) return ReportStatus.CONFIRMED;
        if (current == ReportStatus.OPEN && denials >= threshold && denials > confirmations) return ReportStatus.REJECTED;
        return current;
    }

    private static VoteType parse(String value) {
        if (value == null) throw new BusinessRuleException("voteType must be CONFIRM or DENY");
        try {
            return VoteType.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new BusinessRuleException("voteType must be CONFIRM or DENY");
        }
    }
}
