import { SEVERITY } from '../api/client.js'

export default function SeverityPill({ level }) {
  const s = SEVERITY[level] ?? SEVERITY[0]
  return (
    <span className="pill" style={{ '--pill': s.color }}>
      <span className="pill-dot" /> {level} · {s.label}
    </span>
  )
}

export function StatusTag({ status }) {
  return <span className={`tag tag-${status.toLowerCase()}`}>{status}</span>
}
