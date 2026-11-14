package com.floodwatch.alert.jdbc;

import com.floodwatch.alert.model.Alert;
import com.floodwatch.alert.model.ReportSnapshot;
import org.springframework.stereotype.Repository;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Data layer of alert-service written with plain JDBC:
 * Statement for DDL, PreparedStatement for parameterised queries and updates,
 * ResultSet for reading rows. Every Connection is closed with try-with-resources.
 */
@Repository
public class AlertDao {

    static final String CREATE_ALERTS =
        "CREATE TABLE IF NOT EXISTS alerts ("
      + " id            BIGINT      PRIMARY KEY AUTO_INCREMENT,"
      + " street_id     INT         NOT NULL,"
      + " report_id     BIGINT      NOT NULL,"
      + " alert_level   VARCHAR(10) NOT NULL,"
      + " confirmations INT         NOT NULL,"
      + " active        BOOLEAN     NOT NULL DEFAULT TRUE,"
      + " created_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,"
      + " updated_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,"
      + " resolved_at   TIMESTAMP   NULL,"
      + " CONSTRAINT fk_alert_street FOREIGN KEY (street_id) REFERENCES streets(id),"
      + " CONSTRAINT fk_alert_report FOREIGN KEY (report_id) REFERENCES reports(id))";

    private static final String SELECT_REPORT =
        "SELECT r.id, r.street_id, r.status, r.severity, r.depth_cm,"
      + " SUM(CASE WHEN v.vote_type = 'CONFIRM' THEN 1 ELSE 0 END) AS confirms,"
      + " SUM(CASE WHEN v.vote_type = 'DENY'    THEN 1 ELSE 0 END) AS denies"
      + " FROM reports r LEFT JOIN votes v ON v.report_id = r.id"
      + " WHERE r.id = ?"
      + " GROUP BY r.id, r.street_id, r.status, r.severity, r.depth_cm";

    private static final String SELECT_ALERTS =
        "SELECT a.id, a.street_id, s.name AS street_name, w.name AS ward_name, w.zone, w.grid_row, w.grid_col,"
      + " a.report_id, a.alert_level, a.confirmations, r.severity, r.depth_cm, a.active,"
      + " a.created_at, a.updated_at, a.resolved_at"
      + " FROM alerts a"
      + " JOIN streets s ON s.id = a.street_id"
      + " JOIN wards   w ON w.id = s.ward_id"
      + " JOIN reports r ON r.id = a.report_id";

    private final ConnectionFactory connections;
    private volatile boolean schemaReady = false;

    public AlertDao(ConnectionFactory connections) {
        this.connections = connections;
    }

    /** Creates the ALERTS table on first use (report-service must have created streets/reports first). */
    public void ensureSchema() {
        if (schemaReady) return;
        try (Connection con = connections.open(); Statement st = con.createStatement()) {
            st.execute(CREATE_ALERTS);
            schemaReady = true;
        } catch (SQLException ex) {
            throw new DataAccessException("Could not create ALERTS table - is report-service running?", ex);
        }
    }

    public Optional<ReportSnapshot> findReport(long reportId) {
        ensureSchema();
        try (Connection con = connections.open(); PreparedStatement ps = con.prepareStatement(SELECT_REPORT)) {
            ps.setLong(1, reportId);
            try (ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) return Optional.empty();
                return Optional.of(new ReportSnapshot(rs.getLong("id"), rs.getInt("street_id"),
                        rs.getString("status"), rs.getInt("severity"), rs.getInt("depth_cm"),
                        rs.getInt("confirms"), rs.getInt("denies")));
            }
        } catch (SQLException ex) {
            throw new DataAccessException("Could not read report " + reportId, ex);
        }
    }

    /** All CONFIRMED reports, used to back-fill alerts when the service starts. */
    public List<Long> findConfirmedReportIds() {
        ensureSchema();
        List<Long> ids = new ArrayList<>();
        try (Connection con = connections.open();
             Statement st = con.createStatement();
             ResultSet rs = st.executeQuery("SELECT id FROM reports WHERE status = 'CONFIRMED' ORDER BY reported_at")) {
            while (rs.next()) ids.add(rs.getLong(1));
            return ids;
        } catch (SQLException ex) {
            throw new DataAccessException("Could not list confirmed reports", ex);
        }
    }

    public Optional<Alert> findActiveForStreet(int streetId) {
        List<Alert> list = queryAlerts(SELECT_ALERTS + " WHERE a.active = TRUE AND a.street_id = ?", streetId);
        return list.isEmpty() ? Optional.empty() : Optional.of(list.get(0));
    }

    public List<Alert> findAll(boolean activeOnly) {
        String sql = SELECT_ALERTS + (activeOnly ? " WHERE a.active = TRUE" : "")
                   + " ORDER BY a.active DESC, a.updated_at DESC";
        return queryAlerts(sql);
    }

    public long insert(int streetId, long reportId, String level, int confirmations) {
        String sql = "INSERT INTO alerts (street_id, report_id, alert_level, confirmations) VALUES (?, ?, ?, ?)";
        try (Connection con = connections.open();
             PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setInt(1, streetId);
            ps.setLong(2, reportId);
            ps.setString(3, level);
            ps.setInt(4, confirmations);
            ps.executeUpdate();
            try (ResultSet keys = ps.getGeneratedKeys()) {
                return keys.next() ? keys.getLong(1) : -1L;
            }
        } catch (SQLException ex) {
            throw new DataAccessException("Could not insert alert for street " + streetId, ex);
        }
    }

    public void update(long alertId, long reportId, String level, int confirmations) {
        String sql = "UPDATE alerts SET report_id = ?, alert_level = ?, confirmations = ?, updated_at = ? WHERE id = ?";
        try (Connection con = connections.open(); PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setLong(1, reportId);
            ps.setString(2, level);
            ps.setInt(3, confirmations);
            ps.setTimestamp(4, Timestamp.valueOf(LocalDateTime.now()));
            ps.setLong(5, alertId);
            ps.executeUpdate();
        } catch (SQLException ex) {
            throw new DataAccessException("Could not update alert " + alertId, ex);
        }
    }

    /** Closes one alert. Returns the number of rows changed (0 if it was already closed). */
    public int resolve(long alertId) {
        return execute("UPDATE alerts SET active = FALSE, resolved_at = ? WHERE id = ? AND active = TRUE", alertId);
    }

    /** Closes every active alert on a street (called when an official resolves the street's report). */
    public int resolveStreet(int streetId) {
        return execute("UPDATE alerts SET active = FALSE, resolved_at = ? WHERE street_id = ? AND active = TRUE", streetId);
    }

    private int execute(String sql, long id) {
        ensureSchema();
        try (Connection con = connections.open(); PreparedStatement ps = con.prepareStatement(sql)) {
            ps.setTimestamp(1, Timestamp.valueOf(LocalDateTime.now()));
            ps.setLong(2, id);
            return ps.executeUpdate();
        } catch (SQLException ex) {
            throw new DataAccessException("Update failed: " + sql, ex);
        }
    }

    private List<Alert> queryAlerts(String sql, Object... params) {
        ensureSchema();
        List<Alert> out = new ArrayList<>();
        try (Connection con = connections.open(); PreparedStatement ps = con.prepareStatement(sql)) {
            for (int i = 0; i < params.length; i++) ps.setObject(i + 1, params[i]);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) out.add(map(rs));
            }
            return out;
        } catch (SQLException ex) {
            throw new DataAccessException("Could not read alerts", ex);
        }
    }

    private static Alert map(ResultSet rs) throws SQLException {
        return new Alert(rs.getLong("id"), rs.getInt("street_id"), rs.getString("street_name"),
                rs.getString("ward_name"), rs.getString("zone"), rs.getInt("grid_row"), rs.getInt("grid_col"),
                rs.getLong("report_id"), rs.getString("alert_level"), rs.getInt("confirmations"),
                rs.getInt("severity"), rs.getInt("depth_cm"), rs.getBoolean("active"),
                toLocal(rs.getTimestamp("created_at")), toLocal(rs.getTimestamp("updated_at")),
                toLocal(rs.getTimestamp("resolved_at")));
    }

    private static LocalDateTime toLocal(Timestamp ts) {
        return ts == null ? null : ts.toLocalDateTime();
    }
}
