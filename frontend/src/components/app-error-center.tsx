import { useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { reportAppError, useAppErrorStore } from '@/stores/app-error.store'

export function AppErrorCenter() {
  const error = useAppErrorStore((state) => state.current)
  const clear = useAppErrorStore((state) => state.clear)
  useEffect(() => {
    const onError = (event: ErrorEvent) => reportAppError(event.error ?? event.message, 'runtime')
    const onRejection = (event: PromiseRejectionEvent) => reportAppError(event.reason, 'runtime')
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])
  if (!error) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex justify-center px-4">
      <div role="alert" aria-live="assertive" className="pointer-events-auto flex w-full max-w-3xl items-start gap-3 rounded-xl border border-destructive/40 bg-background px-4 py-3 text-sm shadow-2xl">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-destructive">{error.source === 'validation' ? 'Validation error' : 'Action could not be completed'}</p>
          <p className="mt-1 break-words text-foreground">{error.message}</p>
          {error.status ? <p className="mt-1 text-xs text-muted-foreground">HTTP {error.status}</p> : null}
        </div>
        <button type="button" onClick={() => clear(error.id)} className="rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Dismiss error"><X className="h-4 w-4" /></button>
      </div>
    </div>
  )
}

export function AppErrorNotice() {
  const error = useAppErrorStore((state) => state.current)
  const clear = useAppErrorStore((state) => state.clear)
  if (!error) return null
  return (
    <div role="alert" aria-live="assertive" className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div className="min-w-0 flex-1"><p className="font-medium text-destructive">Action could not be completed</p><p className="mt-1 break-words">{error.message}</p></div>
      <button type="button" onClick={() => clear(error.id)} className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Dismiss error"><X className="h-4 w-4" /></button>
    </div>
  )
}
