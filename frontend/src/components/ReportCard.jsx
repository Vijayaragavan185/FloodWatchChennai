import SeverityPill, { StatusTag } from './SeverityPill.jsx'
import { timeAgo } from '../api/client.js'

export default function ReportCard({ report, currentUser, isOfficial, busy, onVote, onResolve }) {
  const own = currentUser && report.reporterId === currentUser.id
  const active = report.status === 'OPEN' || report.status === 'CONFIRMED'
  const progress = Math.min(100, (report.confirmations / report.threshold) * 100)

  return (
    <article className={`card report sev-${report.severity}`}>
      <header>
        <div>
          <h3>{report.streetName}</h3>
          <p className="muted">{report.wardName} · {report.zone} zone{report.lowLying ? ' · low-lying' : ''}</p>
        </div>
        <StatusTag status={report.status} />
      </header>
      <div className="report-meta">
        <SeverityPill level={report.severity} />
        <span className="depth">{report.depthCm} cm</span>
        <span className="muted">by {report.reporterName} · {timeAgo(report.reportedAt)}</span>
      </div>
      {report.description && <p className="desc">“{report.description}”</p>}
      <div className="confirm-bar" title={`${report.confirmations} of ${report.threshold} confirmations`}>
        <div style={{ width: `${progress}%` }} />
      </div>
      <footer>
        <span className="muted">
          ✔ {report.confirmations} confirm · ✖ {report.denials} deny · needs {report.threshold}
        </span>
        <div className="actions">
          {active && !own && (
            <>
              <button className="btn small" disabled={busy} onClick={() => onVote(report, 'CONFIRM')}>I see it too</button>
              <button className="btn small ghost" disabled={busy} onClick={() => onVote(report, 'DENY')}>Not flooded</button>
            </>
          )}
          {active && own && <span className="muted small">Your report – waiting for neighbours</span>}
          {active && isOfficial && (
            <button className="btn small success" disabled={busy} onClick={() => onResolve(report)}>Mark resolved</button>
          )}
        </div>
      </footer>
    </article>
  )
}
