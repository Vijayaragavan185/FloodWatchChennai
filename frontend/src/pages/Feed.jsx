import { useCallback, useMemo, useState } from 'react'
import ReportCard from '../components/ReportCard.jsx'
import Toast from '../components/Toast.jsx'
import { api } from '../api/client.js'
import { useApi } from '../hooks/useApi.js'
import { useUser } from '../context/UserContext.jsx'

const STATUSES = ['ACTIVE', 'OPEN', 'CONFIRMED', 'REJECTED', 'RESOLVED', 'ALL']

export default function Feed() {
  const { current, isOfficial } = useUser()
  const [status, setStatus] = useState('ACTIVE')
  const [wardId, setWardId] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('newest')
  const [busyId, setBusyId] = useState(null)
  const [toast, setToast] = useState(null)
  const clearToast = useCallback(() => setToast(null), [])

  const wards = useApi('/api/wards')
  const reports = useApi(`/api/reports?status=${status}${wardId ? `&wardId=${wardId}` : ''}`)

  // useMemo: filter and sort only when the inputs change
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = (reports.data ?? []).filter((r) =>
      !q || r.streetName.toLowerCase().includes(q) || r.wardName.toLowerCase().includes(q))
    const sorters = {
      newest: (a, b) => new Date(b.reportedAt) - new Date(a.reportedAt),
      severity: (a, b) => b.severity - a.severity || b.depthCm - a.depthCm,
      closest: (a, b) => (a.threshold - a.confirmations) - (b.threshold - b.confirmations),
    }
    return [...list].sort(sorters[sort])
  }, [reports.data, query, sort])

  async function vote(report, voteType) {
    setBusyId(report.id)
    try {
      const res = await api.post(`/api/reports/${report.id}/votes`, { userId: current.id, voteType })
      setToast({ kind: res.statusChanged ? 'warn' : 'ok', text: res.message })
      await reports.reload(true)
    } catch (err) {
      setToast({ kind: 'error', text: err.message })
    } finally {
      setBusyId(null)
    }
  }

  async function resolve(report) {
    setBusyId(report.id)
    try {
      await api.put(`/api/reports/${report.id}/resolve?userId=${current.id}`)
      setToast({ kind: 'ok', text: `${report.streetName} marked resolved – street alerts closed` })
      await reports.reload(true)
    } catch (err) {
      setToast({ kind: 'error', text: err.message })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Verify reports</h1>
          <p className="muted">Confirm what you can see. A report needs <b>{reports.data?.[0]?.threshold ?? 3}</b> confirmations to raise a street alert.</p>
        </div>
      </div>
      <div className="filters card">
        <div className="chips" role="tablist">
          {STATUSES.map((s) => (
            <button key={s} className={`chip ${status === s ? 'on' : ''}`} onClick={() => setStatus(s)}>{s}</button>
          ))}
        </div>
        <select value={wardId} onChange={(e) => setWardId(e.target.value)} aria-label="Ward">
          <option value="">All wards</option>
          {[...(wards.data ?? [])].sort((a, b) => a.name.localeCompare(b.name))
            .map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          <option value="newest">Newest first</option>
          <option value="severity">Most severe first</option>
          <option value="closest">Closest to confirmation</option>
        </select>
        <input type="search" placeholder="Search street or ward" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {reports.error && <p className="error">{reports.error}</p>}
      {reports.loading && !reports.data && <div className="skeleton list-skeleton" />}
      <p className="muted small">{visible.length} report(s)</p>
      <div className="report-grid">
        {visible.map((r) => (
          <ReportCard key={r.id} report={r} currentUser={current} isOfficial={isOfficial}
                      busy={busyId === r.id} onVote={vote} onResolve={resolve} />
        ))}
      </div>
      <Toast toast={toast} onDone={clearToast} />
    </div>
  )
}
