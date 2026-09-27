import { useEffect, useMemo, useState } from 'react'
import { Activity, Search, ShieldCheck } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { api, type PlatformAuditEvent } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'

const formatDate = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unknown time' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function AuditPage() {
  const token = useAuthStore((state) => state.accessToken)
  const [items, setItems] = useState<PlatformAuditEvent[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    api.platformAuditRecent(token)
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : 'Unable to load audit activity.'))
      .finally(() => setLoading(false))
  }, [token])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((item) => !q || [item.action, item.resourceType, item.resourceId, item.actorId, item.description].some((value) => value?.toLowerCase().includes(q)))
  }, [items, query])

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm">
        <div className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary"><Activity className="size-3.5" />Platform observability</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Audit Activity</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Recent immutable audit events exposed through the existing AuditService. This is visibility over the canonical audit stream, not a replacement history engine.</p>
          </div>
          <div className="rounded-xl border bg-background/70 px-4 py-3 text-center"><div className="text-xl font-semibold">{items.length}</div><div className="text-[11px] text-muted-foreground">Recent events</div></div>
        </div>
      </div>
      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}
      <div className="rounded-2xl border bg-card p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /><h2 className="font-semibold">Recent audit stream</h2></div>
          <div className="relative w-full max-w-sm"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter action, resource or actor…" className="pl-9" /></div>
        </div>
        {loading ? <div className="py-16 text-center text-sm text-muted-foreground">Loading audit activity…</div> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b text-xs text-muted-foreground"><tr><th className="pb-3 pr-4">Time</th><th className="pb-3 pr-4">Action</th><th className="pb-3 pr-4">Resource</th><th className="pb-3 pr-4">Actor</th><th className="pb-3">Description</th></tr></thead>
          <tbody className="divide-y">{filtered.map((item) => <tr key={item.id} className="transition-colors hover:bg-muted/40"><td className="py-3 pr-4 whitespace-nowrap">{formatDate(item.createdAt)}</td><td className="py-3 pr-4 font-medium">{item.action}</td><td className="py-3 pr-4">{item.resourceType}{item.resourceId ? <span className="ml-1 font-mono text-xs text-muted-foreground">#{item.resourceId}</span> : ''}</td><td className="py-3 pr-4 font-mono text-xs">{item.actorId ?? 'system'}</td><td className="py-3 text-muted-foreground">{item.description ?? '—'}</td></tr>)}</tbody></table>
          {filtered.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">No matching audit events.</div>}</div>
        )}
      </div>
    </div>
  )
}
