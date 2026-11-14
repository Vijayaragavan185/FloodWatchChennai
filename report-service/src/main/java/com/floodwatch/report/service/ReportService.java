package com.floodwatch.report.service;

import com.floodwatch.report.domain.AppUser;
import com.floodwatch.report.domain.FloodReport;
import com.floodwatch.report.domain.ReportStatus;
import com.floodwatch.report.domain.Role;
import com.floodwatch.report.domain.Street;
import com.floodwatch.report.domain.VoteType;
import com.floodwatch.report.domain.Ward;
import com.floodwatch.report.dto.CityStats;
import com.floodwatch.report.dto.CreateReportRequest;
import com.floodwatch.report.dto.CreateUserRequest;
import com.floodwatch.report.dto.ReportView;
import com.floodwatch.report.dto.StreetView;
import com.floodwatch.report.dto.UserView;
import com.floodwatch.report.dto.WardSummary;
import com.floodwatch.report.dto.WardView;
import com.floodwatch.report.repository.ReportRepository;
import com.floodwatch.report.repository.StreetRepository;
import com.floodwatch.report.repository.UserRepository;
import com.floodwatch.report.repository.VoteRepository;
import com.floodwatch.report.repository.WardRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/** Business layer for wards, streets, users and reports (the middle tier of the three-tier design). */
@Service
public class ReportService {

    static final Set<ReportStatus> ACTIVE = EnumSet.of(ReportStatus.OPEN, ReportStatus.CONFIRMED);
    /** The north-east monsoon season used for "this season" statistics. */
    static final LocalDateTime SEASON_START = LocalDateTime.of(2026, 10, 1, 0, 0);

    private final WardRepository wards;
    private final StreetRepository streets;
    private final UserRepository users;
    private final ReportRepository reports;
    private final VoteRepository votes;
    private final AlertClient alertClient;
    private final int threshold;

    public ReportService(WardRepository wards, StreetRepository streets, UserRepository users,
                         ReportRepository reports, VoteRepository votes, AlertClient alertClient,
                         @Value("${floodwatch.confirm-threshold:3}") int threshold) {
        this.wards = wards; this.streets = streets; this.users = users;
        this.reports = reports; this.votes = votes; this.alertClient = alertClient;
        this.threshold = threshold;
    }

    public int threshold() { return threshold; }

    // ------------------------------------------------------------------ wards, streets, users

    @Transactional(readOnly = true)
    public List<WardView> listWards() {
        return wards.findAllByOrderByGridRowAscGridColAsc().stream().map(WardView::of).toList();
    }

    @Transactional(readOnly = true)
    public List<StreetView> listStreets(Integer wardId) {
        if (!wards.existsById(wardId)) throw new NotFoundException("Ward " + wardId + " not found");
        return streets.findByWard_IdOrderByNameAsc(wardId).stream().map(StreetView::of).toList();
    }

    @Transactional(readOnly = true)
    public List<UserView> listUsers() {
        return users.findAllByOrderByFullNameAsc().stream().map(UserView::of).toList();
    }

    @Transactional
    public UserView register(CreateUserRequest req) {
        String name = req.fullName() == null ? "" : req.fullName().trim();
        String phone = req.phone() == null ? "" : req.phone().trim();
        if (name.length() < 3) throw new BusinessRuleException("Name must have at least 3 characters");
        if (!phone.matches("[6-9]\\d{9}")) throw new BusinessRuleException("Enter a valid 10 digit mobile number");
        if (users.findByPhone(phone).isPresent()) throw new BusinessRuleException("This mobile number is already registered");
        return UserView.of(users.save(new AppUser(name, phone, Role.CITIZEN)));
    }

    // ------------------------------------------------------------------ reports

    @Transactional(readOnly = true)
    public List<ReportView> listReports(String status, Integer wardId) {
        List<FloodReport> found;
        if (status == null || status.isBlank() || status.equalsIgnoreCase("ALL")) {
            found = reports.findAllByOrderByReportedAtDesc();
        } else if (status.equalsIgnoreCase("ACTIVE")) {
            found = reports.findByStatuses(ACTIVE);
        } else {
            found = reports.findByStatuses(EnumSet.of(parseStatus(status)));
        }
        Map<Long, long[]> counts = voteCounts();
        return found.stream()
                .filter(r -> wardId == null || r.getStreet().getWard().getId().equals(wardId))
                .map(r -> toView(r, counts))
                .toList();
    }

    @Transactional(readOnly = true)
    public ReportView getReport(Long id) {
        return toView(findReport(id), voteCounts());
    }

    @Transactional
    public ReportView createReport(CreateReportRequest req) {
        if (req.streetId() == null || req.userId() == null) throw new BusinessRuleException("Street and user are required");
        if (req.severity() == null || req.severity() < 1 || req.severity() > 5)
            throw new BusinessRuleException("Severity must be between 1 and 5");
        if (req.depthCm() == null || req.depthCm() < 0 || req.depthCm() > 300)
            throw new BusinessRuleException("Water depth must be between 0 and 300 cm");
        String description = req.description() == null ? "" : req.description().trim();
        if (description.length() > 500) throw new BusinessRuleException("Description is limited to 500 characters");

        Street street = streets.findById(req.streetId())
                .orElseThrow(() -> new NotFoundException("Street " + req.streetId() + " not found"));
        AppUser user = findUser(req.userId());
        if (reports.existsByStreet_IdAndReporter_IdAndStatusIn(street.getId(), user.getId(), ACTIVE))
            throw new BusinessRuleException("You already have an active report for " + street.getName()
                    + ". Ask your neighbours to confirm it instead.");

        FloodReport saved = reports.save(new FloodReport(street, user, req.severity(), req.depthCm(), description));
        return toView(saved, Map.of());
    }

    /** Only an OFFICIAL may mark a report as resolved; alert-service is told to close the street's alerts. */
    @Transactional
    public ReportView resolve(Long reportId, Long userId) {
        FloodReport report = findReport(reportId);
        AppUser user = findUser(userId);
        if (user.getRole() != Role.OFFICIAL) throw new BusinessRuleException("Only ward officials can resolve reports");
        if (!report.getStatus().isActive()) throw new BusinessRuleException("Report is already " + report.getStatus());
        report.setStatus(ReportStatus.RESOLVED);
        alertClient.resolveStreet(report.getStreet().getId());
        return toView(report, voteCounts());
    }

    // ------------------------------------------------------------------ map and statistics

    /** Aggregates active reports per ward for the Canvas map. */
    @Transactional(readOnly = true)
    public List<WardSummary> wardSummaries() {
        List<FloodReport> active = reports.findByStatuses(ACTIVE);
        Map<Integer, List<FloodReport>> byWard = active.stream()
                .collect(Collectors.groupingBy(r -> r.getStreet().getWard().getId()));
        return wards.findAllByOrderByGridRowAscGridColAsc().stream().map(w -> {
            List<FloodReport> list = byWard.getOrDefault(w.getId(), List.of());
            long confirmed = list.stream().filter(r -> r.getStatus() == ReportStatus.CONFIRMED).count();
            int max = list.stream().mapToInt(FloodReport::getSeverity).max().orElse(0);
            return summary(w, list.size(), confirmed, max);
        }).toList();
    }

    @Transactional(readOnly = true)
    public CityStats cityStats() {
        List<FloodReport> active = reports.findByStatuses(ACTIVE);
        long confirmed = active.stream().filter(r -> r.getStatus() == ReportStatus.CONFIRMED).count();
        long wardsAffected = active.stream().map(r -> r.getStreet().getWard().getId()).distinct().count();
        return new CityStats(active.size(), confirmed, wardsAffected,
                reports.countByReportedAtAfter(SEASON_START), users.count(), threshold);
    }

    // ------------------------------------------------------------------ helpers shared with VoteService

    FloodReport findReport(Long id) {
        return reports.findById(id).orElseThrow(() -> new NotFoundException("Report " + id + " not found"));
    }

    AppUser findUser(Long id) {
        return users.findById(id).orElseThrow(() -> new NotFoundException("User " + id + " not found"));
    }

    /** reportId -> [confirmations, denials] from a single GROUP BY query. */
    Map<Long, long[]> voteCounts() {
        Map<Long, long[]> map = new HashMap<>();
        for (Object[] row : votes.countGroupedByReportAndType()) {
            long[] pair = map.computeIfAbsent((Long) row[0], k -> new long[2]);
            pair[row[1] == VoteType.CONFIRM ? 0 : 1] = ((Number) row[2]).longValue();
        }
        return map;
    }

    ReportView toView(FloodReport r, Map<Long, long[]> counts) {
        long[] c = counts.getOrDefault(r.getId(), new long[2]);
        return toView(r, c[0], c[1]);
    }

    ReportView toView(FloodReport r, long confirmations, long denials) {
        Street s = r.getStreet();
        Ward w = s.getWard();
        return new ReportView(r.getId(), s.getId(), s.getName(), s.isLowLying(), w.getId(), w.getName(), w.getZone(),
                r.getReporter().getId(), r.getReporter().getFullName(), r.getSeverity(), r.getDepthCm(),
                r.getDescription(), r.getStatus().name(), r.getReportedAt(), confirmations, denials, threshold);
    }

    private static WardSummary summary(Ward w, long active, long confirmed, int maxSeverity) {
        return new WardSummary(w.getId(), w.getCode(), w.getName(), w.getZone(), w.getGridRow(), w.getGridCol(),
                active, confirmed, maxSeverity);
    }

    private static ReportStatus parseStatus(String status) {
        try {
            return ReportStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new BusinessRuleException("Unknown status " + status);
        }
    }
}
