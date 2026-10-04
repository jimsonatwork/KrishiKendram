import { create } from 'zustand'

export type AppErrorSource = 'api' | 'runtime' | 'validation' | 'unknown'
export type AppError = { id: string; message: string; source: AppErrorSource; status?: number; timestamp: number }

type AppErrorState = {
  current: AppError | null
  publish: (error: Omit<AppError, 'id' | 'timestamp'>) => void
  clear: (id?: string) => void
}

export const useAppErrorStore = create<AppErrorState>((set) => ({
  current: null,
  publish: (error) => set({ current: { ...error, id: crypto.randomUUID(), timestamp: Date.now() } }),
  clear: (id) => set((state) => !id || state.current?.id === id ? { current: null } : state),
}))

export function reportAppError(error: unknown, source: AppErrorSource = 'unknown') {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : 'An unexpected error occurred.'
  const status = typeof error === 'object' && error !== null && 'status' in error && typeof (error as { status?: unknown }).status === 'number'
    ? (error as { status: number }).status
    : undefined
  useAppErrorStore.getState().publish({ message, source, status })
}
