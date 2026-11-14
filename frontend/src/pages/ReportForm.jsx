import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, SEVERITY } from '../api/client.js'
import { useApi } from '../hooks/useApi.js'
import { useUser } from '../context/UserContext.jsx'

const EMPTY = { wardId: '', streetId: '', severity: 3, depthCm: 30, description: '' }

export default function ReportForm() {
  const [params] = useSearchParams()
  const { current } = useUser()
  const [form, setForm] = useState({ ...EMPTY, wardId: params.get('ward') ?? '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [saved, setSaved] = useState(null)
  const [saving, setSaving] = useState(false)
  const wardRef = useRef(null)
  const streetRef = useRef(null)

  const wards = useApi('/api/wards')
  const streets = useApi(form.wardId ? `/api/wards/${form.wardId}/streets` : null)

  const sortedWards = useMemo(
    () => [...(wards.data ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [wards.data])

  useEffect(() => { wardRef.current?.focus() }, [])

  const clearError = (field) => setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e))
  const update = (field) => (e) => { setForm((f) => ({ ...f, [field]: e.target.value })); clearError(field) }

  function validate() {
    const e = {}
    if (!form.wardId) e.wardId = 'Choose your ward'
    if (!form.streetId) e.streetId = 'Choose the street or junction'
    const depth = Number(form.depthCm)
    if (Number.isNaN(depth) || depth < 0 || depth > 300) e.depthCm = 'Depth must be 0 – 300 cm'
    if (form.description.length > 500) e.description = 'Keep it under 500 characters'
    setErrors(e)
    if (e.wardId) wardRef.current?.focus()
    else if (e.streetId) streetRef.current?.focus()
    return Object.keys(e).length === 0
  }

  async function submit(evt) {
    evt.preventDefault()
    setServerError(null)
    if (!validate() || !current) return
    setSaving(true)
    try {
      const report = await api.post('/api/reports', {
        streetId: Number(form.streetId),
        userId: current.id,
        severity: Number(form.severity),
        depthCm: Number(form.depthCm),
        description: form.description.trim(),
      })
      setSaved(report)
      setForm(EMPTY)
    } catch (err) {
      setServerError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (saved) {
    return (
      <div className="page narrow">
        <div className="card success-card">
          <div className="big-check">✓</div>
          <h2>Report #{saved.id} submitted</h2>
          <p>{saved.streetName}, {saved.wardName} — severity {saved.severity} ({SEVERITY[saved.severity].label}), {saved.depthCm} cm.</p>
          <p className="muted">It becomes <b>CONFIRMED</b> when {saved.threshold} neighbours vote “I see it too”. Then alert-service raises a street alert.</p>
          <div className="row">
            <Link className="btn" to="/feed">Go to verification feed</Link>
            <button className="btn ghost" onClick={() => setSaved(null)}>Report another street</button>
          </div>
        </div>
      </div>
    )
  }

  const sev = SEVERITY[form.severity]
  return (
    <div className="page narrow">
      <form className="card form" onSubmit={submit} noValidate>
        <h1>Report a waterlogged street</h1>
        <p className="muted">Reporting as <b>{current?.fullName ?? '…'}</b>. Only report what you can see right now.</p>

        <div className="grid-2">
          <label className={errors.wardId ? 'invalid' : ''}>Ward / locality
            <select ref={wardRef} value={form.wardId}
                    onChange={(e) => { setForm((f) => ({ ...f, wardId: e.target.value, streetId: '' })); clearError('wardId') }}>
              <option value="">Select ward…</option>
              {sortedWards.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.zone})</option>)}
            </select>
            {errors.wardId && <small>{errors.wardId}</small>}
          </label>
          <label className={errors.streetId ? 'invalid' : ''}>Street / junction
            <select ref={streetRef} value={form.streetId} onChange={update('streetId')} disabled={!form.wardId}>
              <option value="">{form.wardId ? (streets.loading ? 'Loading…' : 'Select street…') : 'Choose a ward first'}</option>
              {(streets.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}{s.lowLying ? ' · low-lying' : ''}</option>
              ))}
            </select>
            {errors.streetId && <small>{errors.streetId}</small>}
          </label>
        </div>

        <fieldset className="severity">
          <legend>How bad is it?</legend>
          <div className="sev-options">
            {SEVERITY.slice(1).map((s) => (
              <button type="button" key={s.level}
                      className={`sev-option ${Number(form.severity) === s.level ? 'chosen' : ''}`}
                      style={{ '--sev': s.color }}
                      onClick={() => setForm((f) => ({ ...f, severity: s.level }))}>
                <span className="sev-num" style={{ color: s.level <= 2 ? '#0b2540' : '#fff' }}>{s.level}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>
          <p className="muted small">{sev.hint}</p>
        </fieldset>

        <label className={errors.depthCm ? 'invalid' : ''}>Approximate water depth: <b>{form.depthCm} cm</b>
          <input type="range" min="0" max="150" step="5" value={form.depthCm} onChange={update('depthCm')} />
          <div className="depth-scale"><span>0</span><span>ankle ~15</span><span>knee ~45</span><span>waist ~90</span><span>150</span></div>
          {errors.depthCm && <small>{errors.depthCm}</small>}
        </label>

        <label className={errors.description ? 'invalid' : ''}>What do you see? <span className="muted small">({form.description.length}/500)</span>
          <textarea rows="3" maxLength={500} value={form.description} onChange={update('description')}
                    placeholder="e.g. Storm drain overflowing near the bus stop, two-wheelers turning back" />
          {errors.description && <small>{errors.description}</small>}
        </label>

        {serverError && <p className="error">{serverError}</p>}
        <div className="row-end">
          <button className="btn" disabled={saving}>{saving ? 'Submitting…' : 'Submit report'}</button>
        </div>
      </form>
    </div>
  )
}
