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
import jakarta.persistence.UniqueConstraint;

import java.time.LocalDateTime;

/** A neighbour's confirmation or denial of a report. One vote per user per report. */
@Entity
@Table(name = "votes", uniqueConstraints = @UniqueConstraint(columnNames = {"report_id", "user_id"}))
public class Vote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "report_id")
    private FloodReport report;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private AppUser voter;

    @Enumerated(EnumType.STRING)
    @Column(name = "vote_type", nullable = false, length = 8)
    private VoteType voteType;

    @Column(name = "voted_at", nullable = false)
    private LocalDateTime votedAt = LocalDateTime.now();

    protected Vote() { }

    public Vote(FloodReport report, AppUser voter, VoteType voteType) {
        this.report = report; this.voter = voter; this.voteType = voteType;
    }

    public Long getId() { return id; }
    public FloodReport getReport() { return report; }
    public AppUser getVoter() { return voter; }
    public VoteType getVoteType() { return voteType; }
    public LocalDateTime getVotedAt() { return votedAt; }
}
