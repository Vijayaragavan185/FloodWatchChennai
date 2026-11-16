import { NavLink, Outlet } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'

const LINKS = [
  { to: '/', label: 'Live map', end: true },
  { to: '/report', label: 'Report flooding' },
  { to: '/feed', label: 'Verify reports' },
  { to: '/alerts', label: 'Alerts' },
  { to: '/insights', label: 'Insights' },
  { to: '/about', label: 'How it works' },
]

const PUBLIC_DEMO = import.meta.env.VITE_PUBLIC_DEMO === 'true'

export default function Layout() {
  const { current, logout } = useUser()

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
          {current ? <><span>{current.fullName} · {current.role === 'OFFICIAL' ? 'Officer' : 'Citizen'}</span>
            <button className="link-btn" onClick={() => logout().catch(() => {})}>Sign out</button></> : <NavLink to="/login" className="btn">Sign in</NavLink>}
        </div>
      </header>
      <main className="content">
        {PUBLIC_DEMO && <p className="public-demo-notice" role="note">Classroom demo · Sign in to report or verify flooding. Officer login is required to close cases. Enter synthetic observations only.</p>}
        <Outlet />
      </main>
      <footer className="footer">
        FloodWatch Chennai · 21CSE354T Full Stack Web Development project · React + Spring Boot microservices + MySQL ·
        Demo data is synthetic.
      </footer>
    </div>
  )
}
