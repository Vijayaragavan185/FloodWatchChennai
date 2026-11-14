import { useEffect } from 'react'

/** Small notification that hides itself after a few seconds. */
export default function Toast({ toast, onDone }) {
  useEffect(() => {
    if (!toast) return undefined
    const id = setTimeout(onDone, 4200)
    return () => clearTimeout(id)
  }, [toast, onDone])
  if (!toast) return null
  return <div className={`toast toast-${toast.kind}`} role="status">{toast.text}</div>
}
