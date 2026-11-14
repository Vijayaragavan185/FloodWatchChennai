package com.floodwatch.report.web;

import com.floodwatch.report.dto.CreateReportRequest;
import com.floodwatch.report.dto.ReportView;
import com.floodwatch.report.dto.VoteRequest;
import com.floodwatch.report.dto.VoteResult;
import com.floodwatch.report.service.ReportService;
import com.floodwatch.report.service.VoteService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Presentation layer: REST endpoints for reports and crowd votes. */
@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reports;
    private final VoteService votes;

    public ReportController(ReportService reports, VoteService votes) {
        this.reports = reports; this.votes = votes;
    }

    /** GET /api/reports?status=ACTIVE&wardId=39 */
    @GetMapping
    public List<ReportView> list(@RequestParam(value = "status", required = false) String status,
                                 @RequestParam(value = "wardId", required = false) Integer wardId) {
        return reports.listReports(status, wardId);
    }

    @GetMapping("/{id}")
    public ReportView get(@PathVariable("id") Long id) { return reports.getReport(id); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReportView create(@RequestBody CreateReportRequest request) { return reports.createReport(request); }

    @PostMapping("/{id}/votes")
    public VoteResult vote(@PathVariable("id") Long id, @RequestBody VoteRequest request) { return votes.vote(id, request); }

    @PutMapping("/{id}/resolve")
    public ReportView resolve(@PathVariable("id") Long id, @RequestParam("userId") Long userId) { return reports.resolve(id, userId); }
}
