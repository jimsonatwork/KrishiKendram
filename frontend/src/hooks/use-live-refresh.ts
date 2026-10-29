import { useEffect, useRef } from 'react'

/**
 * Opt-in polling for list/table data only. Never reloads the page and does not
 * refresh on mount, focus, or visibility changes; those events can interrupt
 * active forms and filters. Keep the callback scoped to refreshable list data.
 */
export function useLiveRefresh(
  refresh: () => void | Promise<void>,
  options?: { enabled?: boolean; intervalMs?: number; minRefreshGapMs?: number },
) {
  const enabled = options?.enabled ?? false
  const intervalMs = options?.intervalMs ?? 15_000
  const minRefreshGapMs = options?.minRefreshGapMs ?? 5_000
  const refreshRef = useRef(refresh)
  const lastRefreshAt = useRef(0)
  const inFlight = useRef(false)

  useEffect(() => { refreshRef.current = refresh }, [refresh])

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return
    const run = async () => {
      const now = Date.now()
      if (inFlight.current || now - lastRefreshAt.current < minRefreshGapMs) return
      inFlight.current = true
      lastRefreshAt.current = now
      try { await refreshRef.current() } finally { inFlight.current = false }
    }
    const timer = window.setInterval(() => { void run() }, intervalMs)
    return () => window.clearInterval(timer)
  }, [enabled, intervalMs, minRefreshGapMs])
}
