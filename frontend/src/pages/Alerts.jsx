import { useCallback, useState } from 'react'
import Toast from '../components/Toast.jsx'
import SeverityPill from '../components/SeverityPill.jsx'
import { api, LEVEL_COLOR, timeAgo } from '../api/client.js'
import { useApi } from '../hooks/useApi.js'
import { useInterval } from '../hooks/useInterval.js'
import { useUser } from '../context/UserContext.jsx'

export default function Alerts() {
  const { isOfficial } = useUser()
  const [activeOnly, setActiveOnly] = useState(true)
  const [toast, setToast] = useState(null)
  const clearToast = useCallback(() => setToast(null), [])
  const alerts = useApi(`/api/alerts?active=${activeOnly}`)
  useInterval(() => alerts.reload(true), 15000)

  async function resolve(alert) {
    try {
      await api.put(`/api/alerts/${alert.id}/resolve`)
      setToast({ kind: 'ok', text: `Alert on ${alert.streetName} closed` })
      alerts.reload(true)
    } catch (err) {
      setToast({ kind: 'error', text: err.message })
    }
  }

  const counts = (alerts.data ?? []).reduce((acc, a) => {
    if (a.active) acc[a.level] = (acc[a.level] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Street alerts</h1>
          <p className="muted">Raised by <b>alert-service</b> when a report is confirmed by enough neighbours. Auto-refresh every 15 s.</p>
        </div>
        <label className="switch">
          <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
          <span>Active only</span>
        </label>
      </div>
      <div className="level-row">
        {['SEVERE', 'WARNING', 'WATCH'].map((l) => (
          <div key={l} className="level-box" style={{ '--lvl': LEVEL_COLOR[l] }}>
            <span>{l}</span><b>{counts[l] ?? 0}</b>
          </div>
        ))}
      </div>
      {alerts.error && <p className="error">alert-service: {alerts.error}</p>}
      <div className="alert-grid">
        {(alerts.data ?? []).map((a) => (
          <article key={a.id} className={`card alert ${a.active ? '' : 'closed'}`} style={{ '--lvl': LEVEL_COLOR[a.level] }}>
            <div className="alert-level">{a.level}</div>
            <h3>{a.streetName}</h3>
            <p className="muted">{a.wardName} · {a.zone} zone</p>
            <div className="report-meta">
              <SeverityPill level={a.severity} />
              <span className="depth">{a.depthCm} cm</span>
            </div>
            <p className="small">✔ {a.confirmations} neighbour confirmations · report #{a.reportId}</p>
            <p className="muted small">
              Raised {timeAgo(a.createdAt)}{a.resolvedAt ? ` · closed ${timeAgo(a.resolvedAt)}` : ''}
            </p>
            {a.active && isOfficial && <button className="btn small success" onClick={() => resolve(a)}>Close alert</button>}
          </article>
        ))}
      </div>
      {alerts.data?.length === 0 && <p>No alerts to show.</p>}
      <Toast toast={toast} onDone={clearToast} />
    </div>
  )
}
