import { useEffect, useMemo, useState } from 'react'
import { KeyRound, Search, ShieldCheck } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { api, type PlatformPermission } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'

function label(value: string | null) {
  if (!value) return 'Platform'
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/\\b\\w/g, (part) => part.toUpperCase())
}

export function PermissionsPage() {
  const token = useAuthStore((state) => state.accessToken)
  const [items, setItems] = useState<PlatformPermission[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    api.platformPermissions(token).then(setItems).catch((e) => setError(e instanceof Error ? e.message : 'Unable to load permissions.')).finally(() => setLoading(false))
  }, [token])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((item) => !q || [item.module, item.resource, item.action, item.scope, ...item.rolePermissions.map((r) => r.role)].some((value) => value?.toLowerCase().includes(q)))
  }, [items, query])

  const roleCount = new Set(items.flatMap((item) => item.rolePermissions.map((role) => role.role))).size

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm">
        <div className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-[radial-gradient(circle,color-mix(in_oklch,var(--ai)_25%,transparent),transparent_68%)] blur-2xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary"><KeyRound className="size-3.5" />Authorization control</div><h1 className="mt-2 text-3xl font-semibold tracking-tight">Permission Matrix</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">A read-only operational view of persisted permissions, role assignments and field effects. Backend Authorization remains the decision engine.</p></div>
          <div className="grid grid-cols-2 gap-2 text-center"><div className="rounded-xl border bg-background/70 px-4 py-3"><div className="text-xl font-semibold">{items.length}</div><div className="text-[11px] text-muted-foreground">Permissions</div></div><div className="rounded-xl border bg-background/70 px-4 py-3"><div className="text-xl font-semibold">{roleCount}</div><div className="text-[11px] text-muted-foreground">Roles</div></div></div>
        </div>
      </div>
      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}
      <div className="rounded-2xl border bg-card p-5">
        <div className="mb-5 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /><h2 className="font-semibold">Persisted authorization</h2></div><div className="relative w-full max-w-sm"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter resource, action, scope or role…" className="pl-9" /></div></div>
        {loading ? <div className="py-16 text-center text-sm text-muted-foreground">Loading authorization matrix…</div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b text-xs text-muted-foreground"><tr><th className="pb-3 pr-4">Module</th><th className="pb-3 pr-4">Resource</th><th className="pb-3 pr-4">Action</th><th className="pb-3 pr-4">Scope</th><th className="pb-3 pr-4">Roles</th><th className="pb-3">Fields</th></tr></thead><tbody className="divide-y">{filtered.map((item) => <tr key={item.id}><td className="py-3 pr-4 text-muted-foreground">{label(item.module)}</td><td className="py-3 pr-4 font-medium">{label(item.resource)}</td><td className="py-3 pr-4"><span className="rounded-full bg-muted px-2 py-1 text-xs">{item.action}</span></td><td className="py-3 pr-4">{item.scope}</td><td className="py-3 pr-4">{item.rolePermissions.map((role) => role.role).join(', ') || '—'}</td><td className="py-3">{item.fieldPermissions.length ? item.fieldPermissions.map((field) => field.field + ':' + field.effect).join(', ') : 'Resource-level'}</td></tr>)}</tbody></table>{filtered.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">No matching permissions.</div>}</div>}
      </div>
    </div>
  )
}
