package com.floodwatch.report.repository;

import com.floodwatch.report.domain.Vote;
import com.floodwatch.report.domain.VoteType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface VoteRepository extends JpaRepository<Vote, Long> {

    long countByReport_IdAndVoteType(Long reportId, VoteType voteType);

    boolean existsByReport_IdAndVoter_Id(Long reportId, Long userId);

    /** Aggregate query: one row per (report, vote type) with the number of votes. */
    @Query("select v.report.id, v.voteType, count(v) from Vote v group by v.report.id, v.voteType")
    List<Object[]> countGroupedByReportAndType();
}
