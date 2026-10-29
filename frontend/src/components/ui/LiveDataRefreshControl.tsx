import type { ChangeEvent } from 'react'

export type LiveRefreshIntervalMs = 10_000 | 15_000 | 30_000

type Props = {
  enabled: boolean
  intervalMs: LiveRefreshIntervalMs
  onEnabledChange: (enabled: boolean) => void
  onIntervalChange: (intervalMs: LiveRefreshIntervalMs) => void
  label?: string
}

/** Small opt-in control for refreshing table/list data without page reloads. */
export function LiveDataRefreshControl({ enabled, intervalMs, onEnabledChange, onIntervalChange, label = 'Live data' }: Props) {
  const handleInterval = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = Number(event.target.value)
    if (value === 10_000 || value === 15_000 || value === 30_000) onIntervalChange(value)
  }

  return <div className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm" title="Refreshes list/table data only. It never reloads the page or refreshes while you type unless the interval completes.">
    <label className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap">
      <input type="checkbox" checked={enabled} onChange={event => onEnabledChange(event.target.checked)} className="size-4 accent-primary" />
      <span>{label}</span>
    </label>
    <select aria-label="Live data refresh interval" value={intervalMs} onChange={handleInterval} disabled={!enabled} className="h-8 rounded-md border bg-background px-2 text-sm disabled:opacity-50">
      <option value={10000}>Every 10 seconds</option>
      <option value={15000}>Every 15 seconds</option>
      <option value={30000}>Every 30 seconds</option>
    </select>
  </div>
}
