import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import RegisterDialog from './RegisterDialog.jsx'

const LINKS = [
  { to: '/', label: 'Live map', end: true },
  { to: '/report', label: 'Report flooding' },
  { to: '/feed', label: 'Verify reports' },
  { to: '/alerts', label: 'Alerts' },
  { to: '/insights', label: 'Insights' },
  { to: '/about', label: 'How it works' },
]

export default function Layout() {
  const { users, current, setCurrentId } = useUser()
  const [registering, setRegistering] = useState(false)

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <svg viewBox="0 0 64 64" className="brand-drop" aria-hidden="true">
            <path d="M32 4C22 18 12 30 12 41a20 20 0 0 0 40 0C52 30 42 18 32 4z" />
          </svg>
          <div>
            <strong>FloodWatch</strong> <span>Chennai</span>
            <small>Crowd-verified waterlogging reports</small>
          </div>
        </div>
        <nav className="nav">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="acting">
          <label htmlFor="acting-as">Acting as</label>
          <select id="acting-as" value={current?.id ?? ''} onChange={(e) => setCurrentId(Number(e.target.value))}>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName}{u.role === 'OFFICIAL' ? ' (official)' : ''}
              </option>
            ))}
          </select>
          <button type="button" className="link-btn" onClick={() => setRegistering(true)}>+ New user</button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
      <footer className="footer">
        FloodWatch Chennai · 21CSE354T Full Stack Web Development project · React + Spring Boot microservices + MySQL ·
        Demo data is synthetic.
      </footer>
      {registering && <RegisterDialog onClose={() => setRegistering(false)} />}
    </div>
  )
}
