import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client.js'
import { useUser } from '../context/UserContext.jsx'

export default function RegisterDialog({ onClose }) {
  const { reloadUsers, setCurrentId } = useUser()
  const [form, setForm] = useState({ fullName: '', phone: '' })
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const nameRef = useRef(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const user = await api.post('/api/users', form)
      await reloadUsers()
      setCurrentId(user.id)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="reg-title" onClick={onClose}>
      <form className="modal" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <h2 id="reg-title">Register as a citizen</h2>
        <label>Full name
          <input ref={nameRef} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        </label>
        <label>Mobile number
          <input inputMode="numeric" maxLength={10} value={form.phone}
                 onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} />
        </label>
        {error && <p className="error">{error}</p>}
        <div className="row-end">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={saving}>{saving ? 'Saving…' : 'Register'}</button>
        </div>
      </form>
    </div>
  )
}
