import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'

export default function Login() {
  const { current, login, loading } = useUser()
  const location = useLocation()
  const [email, setEmail] = useState(''), [password, setPassword] = useState('')
  const [error, setError] = useState(''), [busy, setBusy] = useState(false)
  if (loading) return <p>Checking your session…</p>
  if (current) return <Navigate to={location.state?.from || '/'} replace />
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { await login(email, password) } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <div className="page narrow"><section className="card">
    <h1>Sign in to FloodWatch</h1>
    <p className="muted">Citizens report and verify flooding. Officers close resolved cases.</p>
    <form onSubmit={submit} className="form">
      <label>Email<input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required /></label>
      <label>Password<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
      {error && <p className="error" role="alert">{error}</p>}
      <button className="btn" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
    <p className="muted small">Use the classroom account supplied by the project team.</p>
  </section></div>
}
