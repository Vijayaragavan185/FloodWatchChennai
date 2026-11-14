package com.floodwatch.report.repository;

import com.floodwatch.report.domain.FloodReport;
import com.floodwatch.report.domain.ReportStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface ReportRepository extends JpaRepository<FloodReport, Long> {

    /** JPQL query with a JOIN through street to ward, newest first. */
    @Query("select r from FloodReport r join r.street s join s.ward w "
         + "where r.status in :statuses order by r.reportedAt desc")
    List<FloodReport> findByStatuses(@Param("statuses") Collection<ReportStatus> statuses);

    List<FloodReport> findAllByOrderByReportedAtDesc();

    long countByReportedAtAfter(LocalDateTime from);

    /** Business rule support: has this user already got an active report on this street? */
    boolean existsByStreet_IdAndReporter_IdAndStatusIn(Integer streetId, Long userId,
                                                       Collection<ReportStatus> statuses);
}
