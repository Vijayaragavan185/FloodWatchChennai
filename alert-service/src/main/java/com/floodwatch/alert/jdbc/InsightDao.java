package com.floodwatch.alert.jdbc;

import com.floodwatch.alert.model.StreetInsight;
import com.floodwatch.alert.model.WardRank;
import org.springframework.stereotype.Repository;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.SQLSyntaxErrorException;
import java.util.ArrayList;
import java.util.List;

/**
 * Analytical SQL for the Insights page. Each query demonstrates one Unit 3 technique:
 * INTERSECT, EXCEPT, UNION, and a JOIN + GROUP BY + HAVING with a nested sub-query.
 * Season windows: last north-east monsoon (Oct 2025 - Jan 2026) and this one (from Oct 2026).
 */
@Repository
public class InsightDao {

    public static final String LAST_FROM = "2025-10-01 00:00:00";
    public static final String LAST_TO   = "2026-01-31 23:59:59";
    public static final String THIS_FROM = "2026-10-01 00:00:00";

    private static final String LAST_SEASON =
        "SELECT street_id FROM reports WHERE reported_at BETWEEN '" + LAST_FROM + "' AND '" + LAST_TO + "'";
    private static final String THIS_SEASON =
        "SELECT street_id FROM reports WHERE reported_at >= '" + THIS_FROM + "' AND status <> 'REJECTED'";

    /** Wraps a set of street ids with names and this season's report count. */
    private static String named(String streetIdSet) {
        return "SELECT s.id, s.name AS street_name, w.name AS ward_name, w.zone,"
             + " (SELECT COUNT(*) FROM reports r WHERE r.street_id = s.id AND r.reported_at >= '" + THIS_FROM + "') AS reports"
             + " FROM (" + streetIdSet + ") AS x"
             + " JOIN streets s ON s.id = x.street_id"
             + " JOIN wards w ON w.id = s.ward_id"
             + " ORDER BY reports DESC, w.name, s.name";
    }

    /** Chronic streets: flooded last season AND this season. */
    static final String CHRONIC = named(LAST_SEASON + " INTERSECT " + THIS_SEASON);

    /** New hotspots: flooded this season but NOT last season. */
    static final String NEW_HOTSPOTS = named(THIS_SEASON + " EXCEPT " + LAST_SEASON);

    /** Equivalent forms for MySQL servers older than 8.0.31, which do not support INTERSECT / EXCEPT. */
    static final String CHRONIC_FALLBACK = named(
        "SELECT DISTINCT street_id FROM reports WHERE reported_at BETWEEN '" + LAST_FROM + "' AND '" + LAST_TO + "'"
      + " AND street_id IN (" + THIS_SEASON + ")");
    static final String NEW_HOTSPOTS_FALLBACK = named(
        "SELECT DISTINCT street_id FROM reports WHERE reported_at >= '" + THIS_FROM + "' AND status <> 'REJECTED'"
      + " AND street_id NOT IN (" + LAST_SEASON + ")");

    /** Streets needing attention: an active alert OR an open report on a low-lying street. */
    static final String ATTENTION = named(
        "SELECT street_id FROM alerts WHERE active = TRUE"
      + " UNION "
      + "SELECT r.street_id FROM reports r JOIN streets s2 ON s2.id = r.street_id"
      + " WHERE r.status = 'OPEN' AND s2.low_lying = TRUE");

    /** Wards at or above the average number of reports per affected ward this season. */
    static final String WARD_RANKING =
        "SELECT w.name, w.zone, COUNT(r.id) AS reports, ROUND(AVG(r.severity), 2) AS avg_sev, MAX(r.depth_cm) AS max_depth"
      + " FROM wards w"
      + " JOIN streets s ON s.ward_id = w.id"
      + " JOIN reports r ON r.street_id = s.id"
      + " WHERE r.reported_at >= ? AND r.status <> 'REJECTED'"
      + " GROUP BY w.id, w.name, w.zone"
      + " HAVING COUNT(r.id) >= (SELECT AVG(t.cnt) FROM"
      + "   (SELECT COUNT(*) AS cnt FROM reports r2 JOIN streets s3 ON s3.id = r2.street_id"
      + "     WHERE r2.reported_at >= ? AND r2.status <> 'REJECTED' GROUP BY s3.ward_id) AS t)"
      + " ORDER BY reports DESC, avg_sev DESC";

    private final ConnectionFactory connections;
    private final AlertDao alertDao;

    public InsightDao(ConnectionFactory connections, AlertDao alertDao) {
        this.connections = connections; this.alertDao = alertDao;
    }

    public List<StreetInsight> chronicStreets()  { return streets(CHRONIC, CHRONIC_FALLBACK); }
    public List<StreetInsight> newHotspots()     { return streets(NEW_HOTSPOTS, NEW_HOTSPOTS_FALLBACK); }
    public List<StreetInsight> needsAttention()  { return streets(ATTENTION, null); }

    public List<WardRank> wardRanking() {
        alertDao.ensureSchema();
        List<WardRank> out = new ArrayList<>();
        try (Connection con = connections.open(); PreparedStatement ps = con.prepareStatement(WARD_RANKING)) {
            ps.setString(1, THIS_FROM);
            ps.setString(2, THIS_FROM);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    out.add(new WardRank(rs.getString("name"), rs.getString("zone"), rs.getInt("reports"),
                            rs.getDouble("avg_sev"), rs.getInt("max_depth")));
                }
            }
            return out;
        } catch (SQLException ex) {
            throw new DataAccessException("Ward ranking query failed", ex);
        }
    }

    /** Runs the set-operation query; on an old MySQL that rejects INTERSECT/EXCEPT, runs the equivalent query. */
    private List<StreetInsight> streets(String sql, String fallback) {
        alertDao.ensureSchema();
        try {
            return runStreets(sql);
        } catch (DataAccessException ex) {
            if (fallback != null && ex.getCause() instanceof SQLSyntaxErrorException) return runStreets(fallback);
            throw ex;
        }
    }

    private List<StreetInsight> runStreets(String sql) {
        List<StreetInsight> out = new ArrayList<>();
        try (Connection con = connections.open();
             PreparedStatement ps = con.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                out.add(new StreetInsight(rs.getInt("id"), rs.getString("street_name"),
                        rs.getString("ward_name"), rs.getString("zone"), rs.getInt("reports")));
            }
            return out;
        } catch (SQLException ex) {
            throw new DataAccessException("Insight query failed", ex);
        }
    }
}
