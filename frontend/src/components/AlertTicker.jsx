import { LEVEL_COLOR } from '../api/client.js'

/** Horizontally scrolling strip of active alerts (pure CSS keyframe animation). */
export default function AlertTicker({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return <div className="ticker calm">No active street alerts right now.</div>
  }
  const items = alerts.map((a) => (
    <span key={a.id} className="ticker-item">
      <b style={{ color: LEVEL_COLOR[a.level] }}>{a.level}</b> {a.streetName}, {a.wardName} · {a.confirmations} confirmations
    </span>
  ))
  return (
    <div className="ticker" aria-label="Active alerts">
      <span className="ticker-label">LIVE ALERTS</span>
      <div className="ticker-window">
        <div className="ticker-track" style={{ animationDuration: `${Math.max(20, alerts.length * 6)}s` }}>
          {items}{items}
        </div>
      </div>
    </div>
  )
}
