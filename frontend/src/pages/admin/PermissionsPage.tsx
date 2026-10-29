import { useEffect, useMemo, useState } from 'react'
import { KeyRound, RefreshCw, Search, ShieldCheck, GitCompareArrows } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  api,
  type PlatformPermission,
  type PlatformPermissionReconciliation,
} from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'

function label(value: string | null) {
  if (!value) return 'Platform'
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/\b\w/g, (part) => part.toUpperCase())
}

export function PermissionsPage() {
  const token = useAuthStore((state) => state.accessToken)
  const [items, setItems] = useState<PlatformPermission[]>([])
  const [reconciliation, setReconciliation] = useState<PlatformPermissionReconciliation | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [reconciliationLoading, setReconciliationLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reconciliationError, setReconciliationError] = useState<string | null>(null)

  const loadPermissions = async () => {
    if (!token) {
      setLoading(false)
      setReconciliationLoading(false)
      return
    }

    setLoading(true)
    setReconciliationLoading(true)
    setError(null)
    setReconciliationError(null)

    const [permissionsResult, reconciliationResult] = await Promise.allSettled([
      api.platformPermissions(token),
      api.platformPermissionReconciliation(token),
    ])

    if (permissionsResult.status === 'fulfilled') {
      setItems(permissionsResult.value)
    } else {
      setError(
        permissionsResult.reason instanceof Error
          ? permissionsResult.reason.message
          : 'Unable to load permissions.',
      )
    }

    if (reconciliationResult.status === 'fulfilled') {
      setReconciliation(reconciliationResult.value)
    } else {
      setReconciliationError(
        reconciliationResult.reason instanceof Error
          ? reconciliationResult.reason.message
          : 'Unable to reconcile the permission registry.',
      )
    }

    setLoading(false)
    setReconciliationLoading(false)
  }

  useEffect(() => { void loadPermissions() }, [token])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((item) => !q || [
      item.module,
      item.resource,
      item.action,
      item.scope,
      ...item.rolePermissions.map((role) => role.role),
    ].some((value) => value?.toLowerCase().includes(q)))
  }, [items, query])

  const roleCount = new Set(items.flatMap((item) => item.rolePermissions.map((role) => role.role))).size
  const missingDeclarations = reconciliation?.declared.filter((item) => !item.persisted) ?? []
  const stalePermissions = reconciliation?.stale ?? []
  const summary = reconciliation?.summary

  const reconciliationMetrics = [
    { label: 'Declared capabilities', value: summary?.declaredCount ?? 0 },
    { label: 'Persisted resource permissions', value: summary?.persistedResourcePermissionCount ?? 0 },
    { label: 'Covered declarations', value: summary?.coveredCount ?? 0 },
    { label: 'Missing declarations', value: summary?.missingCount ?? 0 },
    { label: 'Stale persisted', value: summary?.staleCount ?? 0 },
  ]

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm">
        <div className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-[radial-gradient(circle,color-mix(in_oklch,var(--ai)_25%,transparent),transparent_68%)] blur-2xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <KeyRound className="size-3.5" />Authorization control
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Permission Matrix</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              A read-only operational view of persisted permissions, role assignments and field effects. Backend Authorization remains the decision engine.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl border bg-background/70 px-4 py-3">
              <div className="text-xl font-semibold">{items.length}</div>
              <div className="text-[11px] text-muted-foreground">Permissions</div>
            </div>
            <div className="rounded-xl border bg-background/70 px-4 py-3">
              <div className="text-xl font-semibold">{roleCount}</div>
              <div className="text-[11px] text-muted-foreground">Roles</div>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}

      <section className="rounded-2xl border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <GitCompareArrows className="size-4 text-primary" />
          <h2 className="font-semibold">Registry reconciliation</h2>
          <span className="text-xs text-muted-foreground">Declared capabilities versus persisted authorization</span>
        </div>
        {reconciliationError && <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{reconciliationError}</div>}
        {reconciliationLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Reconciling the permission registry…</div>
        ) : reconciliation ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {reconciliationMetrics.map((metric) => (
                <div key={metric.label} className="rounded-xl border bg-background/60 p-3">
                  <div className="text-2xl font-semibold tabular-nums">{metric.value}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{metric.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border p-4">
                <h3 className="font-medium">Missing declarations</h3>
                {missingDeclarations.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">All registry-declared capabilities are persisted.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {missingDeclarations.map((item) => (
                      <li key={[item.module, item.resource, item.action, item.scope].join('|')} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                        <div className="font-medium">{label(item.module)} / {label(item.resource)}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{item.action} · {item.scope}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-xl border p-4">
                <h3 className="font-medium">Stale persisted permissions</h3>
                {stalePermissions.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">No stale resource permissions were found.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {stalePermissions.map((item) => (
                      <li key={item.id} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                        <div className="font-medium">{label(item.module)} / {label(item.resource)}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{item.action} · {item.scope}</div>
                        <div className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{item.id}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">Registry reconciliation is not available.</p>
        )}
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <h2 className="font-semibold">Persisted authorization</h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter resource, action, scope or role…" className="pl-9" />
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadPermissions()} disabled={loading || reconciliationLoading} title="Refresh" aria-label="Refresh">
              <RefreshCw className={loading || reconciliationLoading ? 'size-4 animate-spin' : 'size-4'} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading authorization matrix…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b text-xs text-muted-foreground">
                <tr>
                  <th className="pb-3 pr-4">Module</th>
                  <th className="pb-3 pr-4">Resource</th>
                  <th className="pb-3 pr-4">Action</th>
                  <th className="pb-3 pr-4">Scope</th>
                  <th className="pb-3 pr-4">Roles</th>
                  <th className="pb-3">Fields</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 pr-4 text-muted-foreground">{label(item.module)}</td>
                    <td className="py-3 pr-4 font-medium">{label(item.resource)}</td>
                    <td className="py-3 pr-4"><span className="rounded-full bg-muted px-2 py-1 text-xs">{item.action}</span></td>
                    <td className="py-3 pr-4">{item.scope}</td>
                    <td className="py-3 pr-4">{item.rolePermissions.map((role) => role.role).join(', ') || '—'}</td>
                    <td className="py-3">{item.fieldPermissions.length ? item.fieldPermissions.map((field) => field.field + ':' + field.effect).join(', ') : 'Resource-level'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">No matching permissions.</div>}
          </div>
        )}
      </section>
    </div>
  )
}
