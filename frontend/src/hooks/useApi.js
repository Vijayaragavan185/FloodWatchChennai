import { useCallback, useDebugValue, useEffect, useRef, useState } from 'react'
import { api } from '../api/client.js'

/**
 * Custom hook: loads JSON from a URL and exposes { data, error, loading, reload }.
 * Passing null as the url skips the request (useful for dependent selects).
 * Stale responses are ignored when the url changes before the request finishes.
 */
export function useApi(url) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(Boolean(url))
  const requestId = useRef(0)

  const load = useCallback(async (quiet = false) => {
    if (!url) { setData(null); setLoading(false); return }
    const id = ++requestId.current
    if (!quiet) setLoading(true)
    try {
      const result = await api.get(url)
      if (id === requestId.current) { setData(result); setError(null) }
    } catch (err) {
      if (id === requestId.current) setError(err.message)
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [url])

  useEffect(() => { load() }, [load])

  useDebugValue(loading ? `loading ${url}` : error ? `error: ${error}` : `ok ${url}`)

  return { data, error, loading, reload: load }
}
