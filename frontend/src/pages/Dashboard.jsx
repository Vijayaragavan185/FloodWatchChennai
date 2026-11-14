import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import WardMap from '../components/WardMap.jsx'
import StatCard from '../components/StatCard.jsx'
import AlertTicker from '../components/AlertTicker.jsx'
import SeverityPill, { StatusTag } from '../components/SeverityPill.jsx'
import { useApi } from '../hooks/useApi.js'
import { useInterval } from '../hooks/useInterval.js'
import { SEVERITY, timeAgo } from '../api/client.js'

export default function Dashboard() {
  const summary = useApi('/api/wards/summary')
  const stats = useApi('/api/stats')
  const alerts = useApi('/api/alerts?active=true')
  const [selected, setSelected] = useState(null)
  const wardReports = useApi(selected ? `/api/reports?status=ACTIVE&wardId=${selected.wardId}` : null)

  // live refresh every 20 seconds without showing loading spinners
  useInterval(() => { summary.reload(true); stats.reload(true); alerts.reload(true) }, 20000)

  const worstWards = useMemo(() => (summary.data ?? [])
    .filter((w) => w.activeReports > 0)
    .sort((a, b) => b.maxSeverity - a.maxSeverity || b.activeReports - a.activeReports)
    .slice(0, 6), [summary.data])

  const s = stats.data
  return (
    <div className="page">
      <AlertTicker alerts={alerts.data} />
      <section className="stats">
        <StatCard label="Active reports" value={s?.activeReports} note="open + confirmed" />
        <StatCard label="Confirmed by neighbours" value={s?.confirmedReports} tone="amber" note={s && `threshold N = ${s.confirmThreshold}`} />
        <StatCard label="Active street alerts" value={alerts.data?.length} tone="red" note="from alert-service" />
        <StatCard label="Wards affected" value={s?.wardsAffected} tone="teal" note={s && `of 53 · ${s.reportsThisSeason} reports this season`} />
      </section>

      {(summary.error || stats.error) && (
        <p className="error">Could not reach report-service: {summary.error || stats.error}</p>
      )}

      <section className="map-layout">
        <div className="card">
          <div className="card-head">
            <h2>Live ward map</h2>
            <span className="muted small">Click a ward for its reports · refreshes every 20 s</span>
          </div>
          {summary.loading && !summary.data ? <div className="skeleton map-skeleton" /> : (
            <WardMap summaries={summary.data} alerts={alerts.data} selectedId={selected?.wardId} onSelect={setSelected} />
          )}
          <div className="legend">
            {SEVERITY.map((x) => (
              <span key={x.level}><i style={{ background: x.color }} />{x.label}</span>
            ))}
            <span><i className="ring" />Active alert</span>
          </div>
        </div>

        <aside className="side">
          {selected ? (
            <div className="card">
              <div className="card-head">
                <h2>{selected.name}</h2>
                <button className="link-btn" onClick={() => setSelected(null)}>close</button>
              </div>
              <p className="muted">{selected.code} · {selected.zone} zone</p>
              {wardReports.loading && <p className="muted">Loading…</p>}
              {wardReports.data?.length === 0 && <p>No active reports in this ward.</p>}
              <ul className="plain">
                {wardReports.data?.map((r) => (
                  <li key={r.id} className="mini-report">
                    <div><strong>{r.streetName}</strong> <StatusTag status={r.status} /></div>
                    <SeverityPill level={r.severity} /> <span className="muted small">{r.depthCm} cm · {timeAgo(r.reportedAt)}</span>
                    <div className="muted small">✔ {r.confirmations}/{r.threshold} confirmations</div>
                  </li>
                ))}
              </ul>
              <Link className="btn small" to={`/report?ward=${selected.wardId}`}>Report a street here</Link>
            </div>
          ) : (
            <div className="card">
              <h2>Worst affected wards</h2>
              <ol className="rank">
                {worstWards.map((w) => (
                  <li key={w.wardId}>
                    <button className="link-btn" onClick={() => setSelected(w)}>{w.name}</button>
                    <SeverityPill level={w.maxSeverity} />
                    <span className="muted small">{w.activeReports} active</span>
                  </li>
                ))}
              </ol>
              <p className="muted small">Severity is the worst active report in the ward. A street alert needs N neighbours to confirm.</p>
            </div>
          )}
          <div className="card cta">
            <h3>See water on your street?</h3>
            <p>Report it in 20 seconds. Your neighbours confirm it, and confirmed streets raise an alert.</p>
            <Link className="btn" to="/report">Report flooding</Link>
          </div>
        </aside>
      </section>
    </div>
  )
}
