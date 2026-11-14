export default function StatCard({ label, value, tone = 'blue', note }) {
  return (
    <div className={`stat stat-${tone}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value ?? '–'}</span>
      {note && <span className="stat-note">{note}</span>}
    </div>
  )
}
