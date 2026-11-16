import { useState } from 'react'
import { useApi } from '../hooks/useApi.js'

const PANELS = [
  {
    key: 'chronic', op: 'INTERSECT', title: 'Chronic streets',
    text: 'Flooded last monsoon AND again this season – candidates for permanent drain work.',
    sql: "SELECT street_id FROM reports WHERE reported_at BETWEEN '2025-10-01' AND '2026-01-31'\nINTERSECT\nSELECT street_id FROM reports WHERE reported_at >= '2026-10-01' AND status <> 'REJECTED'",
  },
  {
    key: 'newHotspots', op: 'EXCEPT', title: 'New hotspots',
    text: 'Flooding this season but NOT last season – new construction or blocked drains?',
    sql: "SELECT street_id FROM reports WHERE reported_at >= '2026-10-01' AND status <> 'REJECTED'\nEXCEPT\nSELECT street_id FROM reports WHERE reported_at BETWEEN '2025-10-01' AND '2026-01-31'",
  },
  {
    key: 'attention', op: 'UNION', title: 'Needs attention now',
    text: 'Streets with an active alert, together with low-lying streets that have an open report.',
    sql: "SELECT street_id FROM alerts WHERE active = TRUE\nUNION\nSELECT r.street_id FROM reports r JOIN streets s ON s.id = r.street_id\nWHERE r.status = 'OPEN' AND s.low_lying = TRUE",
  },
]

const RANK_SQL = `SELECT w.name, w.zone, COUNT(r.id) AS reports, ROUND(AVG(r.severity),2) AS avg_sev, MAX(r.depth_cm)
FROM wards w JOIN streets s ON s.ward_id = w.id JOIN reports r ON r.street_id = s.id
WHERE r.reported_at >= ? AND r.status <> 'REJECTED'
GROUP BY w.id, w.name, w.zone
HAVING COUNT(r.id) >= (SELECT AVG(t.cnt) FROM (SELECT COUNT(*) AS cnt FROM reports r2
         JOIN streets s3 ON s3.id = r2.street_id WHERE r2.reported_at >= ? GROUP BY s3.ward_id) AS t)
ORDER BY reports DESC, avg_sev DESC`

export default function Insights() {
  const { data, error, loading, reload } = useApi('/api/insights')
  const [showSql, setShowSql] = useState({})
  const toggle = (k) => setShowSql((s) => ({ ...s, [k]: !s[k] }))

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Season insights</h1>
          <p className="muted">Computed by alert-service with plain JDBC and SQL set operations. Last season: {data?.lastSeason ?? '…'} · this season: {data?.thisSeason ?? '…'}.</p>
        </div>
      </div>
      {error && (
        <div className="error" role="alert">
          <p>{error}</p>
          <button className="btn" disabled={loading} onClick={() => reload()}>
            {loading ? 'Retrying…' : 'Try again'}
          </button>
        </div>
      )}
      {loading && <div className="skeleton list-skeleton" />}
      {data && (
        <>
          <div className="insight-grid">
            {PANELS.map((p) => (
              <section key={p.key} className="card insight">
                <div className="card-head">
                  <h2>{p.title}</h2><span className={`op op-${p.op.toLowerCase()}`}>{p.op}</span>
                </div>
                <p className="muted small">{p.text}</p>
                <div className="insight-count">{data[p.key].length}<span> streets</span></div>
                <table className="table">
                  <thead><tr><th>Street</th><th>Ward</th><th>This season</th></tr></thead>
                  <tbody>
                    {data[p.key].slice(0, 8).map((s) => (
                      <tr key={s.streetId}><td>{s.streetName}</td><td>{s.wardName}</td><td>{s.reports}</td></tr>
                    ))}
                  </tbody>
                </table>
                {data[p.key].length > 8 && <p className="muted small">+ {data[p.key].length - 8} more</p>}
                <button className="link-btn" onClick={() => toggle(p.key)}>{showSql[p.key] ? 'Hide SQL' : 'Show SQL'}</button>
                {showSql[p.key] && <pre className="sql">{p.sql}</pre>}
              </section>
            ))}
          </div>
          <section className="card">
            <div className="card-head">
              <h2>Wards above the city average this season</h2><span className="op op-having">JOIN · GROUP BY · HAVING · sub-query</span>
            </div>
            <table className="table">
              <thead><tr><th>#</th><th>Ward</th><th>Zone</th><th>Reports</th><th>Avg severity</th><th>Max depth (cm)</th></tr></thead>
              <tbody>
                {data.wardRanking.map((w, i) => (
                  <tr key={w.wardName}><td>{i + 1}</td><td>{w.wardName}</td><td>{w.zone}</td><td>{w.reports}</td>
                    <td><span className="bar" style={{ '--w': `${w.avgSeverity * 20}%` }}>{w.avgSeverity.toFixed(2)}</span></td>
                    <td>{w.maxDepthCm}</td></tr>
                ))}
              </tbody>
            </table>
            <button className="link-btn" onClick={() => toggle('rank')}>{showSql.rank ? 'Hide SQL' : 'Show SQL'}</button>
            {showSql.rank && <pre className="sql">{RANK_SQL}</pre>}
          </section>
        </>
      )}
    </div>
  )
}
