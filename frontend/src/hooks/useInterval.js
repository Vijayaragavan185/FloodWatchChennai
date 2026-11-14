import { useDebugValue, useEffect, useRef } from 'react'

/**
 * Custom hook: calls `callback` every `delay` ms. The latest callback is kept in a ref,
 * so the timer is not reset on every render. Pass null as delay to pause.
 */
export function useInterval(callback, delay) {
  const saved = useRef(callback)
  useEffect(() => { saved.current = callback }, [callback])
  useEffect(() => {
    if (delay == null) return undefined
    const id = setInterval(() => saved.current(), delay)
    return () => clearInterval(id)
  }, [delay])
  useDebugValue(delay == null ? 'paused' : `every ${delay / 1000}s`)
}
