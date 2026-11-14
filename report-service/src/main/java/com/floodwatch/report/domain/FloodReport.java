package com.floodwatch.report.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/** One citizen report: "this street is waterlogged, this deep, this bad". */
@Entity
@Table(name = "reports")
public class FloodReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "street_id")
    private Street street;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "user_id")
    private AppUser reporter;

    /** 1 = puddles, 2 = ankle deep, 3 = knee deep, 4 = vehicles stalled, 5 = road submerged */
    @Column(nullable = false)
    private int severity;

    @Column(name = "depth_cm", nullable = false)
    private int depthCm;

    @Column(length = 500)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private ReportStatus status = ReportStatus.OPEN;

    @Column(name = "reported_at", nullable = false)
    private LocalDateTime reportedAt = LocalDateTime.now();

    protected FloodReport() { }

    public FloodReport(Street street, AppUser reporter, int severity, int depthCm, String description) {
        this.street = street; this.reporter = reporter; this.severity = severity;
        this.depthCm = depthCm; this.description = description;
    }

    public Long getId() { return id; }
    public Street getStreet() { return street; }
    public AppUser getReporter() { return reporter; }
    public int getSeverity() { return severity; }
    public int getDepthCm() { return depthCm; }
    public String getDescription() { return description; }
    public ReportStatus getStatus() { return status; }
    public LocalDateTime getReportedAt() { return reportedAt; }

    public void setStatus(ReportStatus status) { this.status = status; }
}
