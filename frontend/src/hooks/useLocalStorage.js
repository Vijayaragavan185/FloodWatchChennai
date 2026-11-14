import { useEffect, useState } from 'react'

/** Custom hook: useState that survives a page refresh. Storage errors are ignored. */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key)
      return raw === null ? initialValue : JSON.parse(raw)
    } catch {
      return initialValue
    }
  })
  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(value)) } catch { /* private mode */ }
  }, [key, value])
  return [value, setValue]
}
