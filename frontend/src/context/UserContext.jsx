import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../api/client.js'

const UserContext = createContext(null)

/** Shares the identity returned by the authenticated gateway session. */
export function UserProvider({ children }) {
  const [current, setCurrent] = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { api.get('/api/auth/me').then(data => setCurrent(data.user)).catch(() => {}).finally(() => setLoading(false)) }, [])
  async function login(email, password) { const data = await api.post('/api/auth/login', { email, password }); setCurrent(data.user) }
  async function logout() { await api.post('/api/auth/logout'); setCurrent(null) }
  const value = { current, isOfficial: current?.role === 'OFFICIAL', loading, login, logout }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used inside <UserProvider>')
  return ctx
}
