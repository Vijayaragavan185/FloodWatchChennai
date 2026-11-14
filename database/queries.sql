-- =====================================================================
-- FloodWatch Chennai : Unit 3 SQL showcase (run in MySQL Workbench / mysql CLI)
-- USE floodwatch;  -- tables are created by report-service on first start
-- =====================================================================

-- 1. Basic selection with joins: active reports with street, ward and reporter
SELECT r.id, s.name AS street, w.name AS ward, u.full_name AS reporter, r.severity, r.depth_cm, r.status
FROM reports r
JOIN streets s   ON s.id = r.street_id
JOIN wards w     ON w.id = s.ward_id
JOIN app_users u ON u.id = r.user_id
WHERE r.status IN ('OPEN', 'CONFIRMED')
ORDER BY r.severity DESC, r.reported_at DESC;

-- 2. Aggregation: confirmations and denials per report (LEFT JOIN keeps reports with no votes)
SELECT r.id, s.name AS street,
       SUM(CASE WHEN v.vote_type = 'CONFIRM' THEN 1 ELSE 0 END) AS confirms,
       SUM(CASE WHEN v.vote_type = 'DENY'    THEN 1 ELSE 0 END) AS denies
FROM reports r
JOIN streets s    ON s.id = r.street_id
LEFT JOIN votes v ON v.report_id = r.id
GROUP BY r.id, s.name
ORDER BY confirms DESC;

-- 3. INTERSECT: chronic streets (flooded last season AND this season)
SELECT street_id FROM reports WHERE reported_at BETWEEN '2025-10-01' AND '2026-01-31 23:59:59'
INTERSECT
SELECT street_id FROM reports WHERE reported_at >= '2026-10-01' AND status <> 'REJECTED';

-- 4. EXCEPT: new hotspots (this season but not last season)
SELECT street_id FROM reports WHERE reported_at >= '2026-10-01' AND status <> 'REJECTED'
EXCEPT
SELECT street_id FROM reports WHERE reported_at BETWEEN '2025-10-01' AND '2026-01-31 23:59:59';

-- 5. UNION: streets needing attention (active alert OR open report on a low-lying street)
SELECT street_id FROM alerts WHERE active = TRUE
UNION
SELECT r.street_id FROM reports r JOIN streets s ON s.id = r.street_id
WHERE r.status = 'OPEN' AND s.low_lying = TRUE;

-- 6. Sub-query: citizens who have reported more than the average citizen
SELECT u.full_name, COUNT(r.id) AS reports
FROM app_users u JOIN reports r ON r.user_id = u.id
GROUP BY u.id, u.full_name
HAVING COUNT(r.id) > (SELECT AVG(c) FROM (SELECT COUNT(*) AS c FROM reports GROUP BY user_id) AS t)
ORDER BY reports DESC;

-- 7. Correlated sub-query: the worst report on every ward that has one
SELECT w.name AS ward, s.name AS street, r.severity
FROM reports r JOIN streets s ON s.id = r.street_id JOIN wards w ON w.id = s.ward_id
WHERE r.severity = (SELECT MAX(r2.severity) FROM reports r2 JOIN streets s2 ON s2.id = r2.street_id
                    WHERE s2.ward_id = w.id AND r2.status IN ('OPEN','CONFIRMED'))
  AND r.status IN ('OPEN','CONFIRMED');

-- 8. Modifying data: insert, update and delete
INSERT INTO app_users (full_name, phone, role) VALUES ('Demo Citizen', '9000000001', 'CITIZEN');
UPDATE reports SET status = 'RESOLVED' WHERE status = 'OPEN' AND reported_at < '2026-01-31';
DELETE FROM app_users WHERE phone = '9000000001';

-- 9. Altering a table: add and drop a column (reversible demonstration)
ALTER TABLE streets ADD COLUMN drain_capacity_lps INT NULL;
ALTER TABLE streets DROP COLUMN drain_capacity_lps;
