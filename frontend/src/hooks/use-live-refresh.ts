import { useEffect, useRef } from 'react'

export function useLiveRefresh(refresh: () => void | Promise<void>, options?: { enabled?: boolean; intervalMs?: number; onWindowFocus?: boolean; onVisibilityChange?: boolean; minRefreshGapMs?: number }) {
  const enabled = options?.enabled ?? true
  const intervalMs = options?.intervalMs ?? 30000
  const onWindowFocus = options?.onWindowFocus ?? true
  const onVisibilityChange = options?.onVisibilityChange ?? true
  const minRefreshGapMs = options?.minRefreshGapMs ?? 5000
  const refreshRef = useRef(refresh)
  const lastRefreshAt = useRef(0)
  const inFlight = useRef(false)
  useEffect(() => { refreshRef.current = refresh }, [refresh])
  useEffect(() => {
    if (!enabled) return
    const run = async () => {
      const now = Date.now()
      if (inFlight.current || now - lastRefreshAt.current < minRefreshGapMs) return
      inFlight.current = true
      lastRefreshAt.current = now
      try { await refreshRef.current() } finally { inFlight.current = false }
    }
    void run()
    const onFocus = () => { if (onWindowFocus) void run() }
    const onVisibility = () => { if (onVisibilityChange && document.visibilityState === 'visible') void run() }
    const onPageShow = () => void run()
    window.addEventListener('focus', onFocus)
    window.addEventListener('pageshow', onPageShow)
    document.addEventListener('visibilitychange', onVisibility)
    const timer = intervalMs > 0 ? window.setInterval(() => void run(), intervalMs) : undefined
    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('pageshow', onPageShow)
      document.removeEventListener('visibilitychange', onVisibility)
      if (timer !== undefined) window.clearInterval(timer)
    }
  }, [enabled, intervalMs, onWindowFocus, onVisibilityChange, minRefreshGapMs])
}
