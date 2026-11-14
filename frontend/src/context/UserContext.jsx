import { createContext, useContext, useMemo } from 'react'
import { useApi } from '../hooks/useApi.js'
import { useLocalStorage } from '../hooks/useLocalStorage.js'

const UserContext = createContext(null)

/** Shares the list of users and the person currently "acting" in the app with every page. */
export function UserProvider({ children }) {
  const { data: users, reload } = useApi('/api/users')
  const [currentId, setCurrentId] = useLocalStorage('floodwatch.userId', 1)

  const value = useMemo(() => {
    const list = users ?? []
    const current = list.find((u) => u.id === currentId) ?? list[0] ?? null
    return {
      users: list,
      current,
      isOfficial: current?.role === 'OFFICIAL',
      setCurrentId,
      reloadUsers: reload,
    }
  }, [users, currentId, setCurrentId, reload])

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used inside <UserProvider>')
  return ctx
}
