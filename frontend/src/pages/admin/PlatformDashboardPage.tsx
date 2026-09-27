import { useEffect, useMemo, useState } from 'react'
import { Activity, Boxes, CheckCircle2, KeyRound, ShieldCheck, TriangleAlert } from 'lucide-react'
import { api, type PlatformAuditEvent, type PlatformPermissionReconciliation } from '@/lib/api'
import { platformRegistry } from '@/lib/platform/registry'
import type { ModuleDefinition, ModuleLifecycleStatus, ResourceDefinition } from '@/lib/platform/contracts'
import { useAuthStore } from '@/stores/auth.store'

function Metric({ label, value, tone = 'default' }: { label: string; value: number | string; tone?: 'default' | 'good' | 'warn' }) {
  const toneClass = tone === 'good' ? 'text-emerald-500' : tone === 'warn' ? 'text-amber-500' : 'text-foreground'
  return <div className="rounded-2xl border bg-card p-5"><div className={`text-3xl font-semibold tracking-tight ${toneClass}`}>{value}</div><div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</div></div>
}

export function PlatformDashboardPage() {
  const token = useAuthStore((state) => state.accessToken)
  const [modules, setModules] = useState<ModuleDefinition[]>([])
  const [statuses, setStatuses] = useState<ModuleLifecycleStatus[]>([])
  const [resources, setResources] = useState<ResourceDefinition[]>([])
  const [reconciliation, setReconciliation] = useState<PlatformPermissionReconciliation | null>(null)
  const [permissions, setPermissions] = useState(0)
  const [audit, setAudit] = useState<PlatformAuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    Promise.all([platformRegistry.modules(token), platformRegistry.moduleStatuses(token), platformRegistry.resources(token), api.platformPermissionReconciliation(token), api.platformPermissions(token), api.platformAuditRecent(token, 8)])
      .then(([moduleData, statusData, resourceData, reconciliationData, permissionData, auditData]) => { setModules(moduleData); setStatuses(statusData); setResources(resourceData); setReconciliation(reconciliationData); setPermissions(permissionData.length); setAudit(auditData) })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load platform coverage.'))
      .finally(() => setLoading(false))
  }, [token])

  const activeModules = statuses.filter((item) => item.lifecycle === 'ACTIVE').length
  const operationalModules = statuses.filter((item) => item.operational).length
  const coverage = reconciliation?.summary
  const coveragePercent = coverage?.declaredCount ? Math.round((coverage.coveredCount / coverage.declaredCount) * 100) : 0
  const gaps = useMemo(() => reconciliation?.declared.filter((item) => !item.persisted) ?? [], [reconciliation])
  const stale = reconciliation?.stale ?? []

  return <div className="space-y-6">
    <section className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm"><div className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-primary/10 blur-3xl" /><div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary"><ShieldCheck className="size-3.5" />Platform control plane</div><h1 className="mt-2 text-3xl font-semibold tracking-tight">Platform Coverage</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">One operational view assembled from the canonical Registry, authorization, module lifecycle and audit contracts.</p></div><div className="rounded-xl border bg-background/70 px-4 py-3 text-center"><div className="text-2xl font-semibold">{loading ? '…' : `${coveragePercent}%`}</div><div className="text-[11px] text-muted-foreground">Registry permission coverage</div></div></div></section>
    {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><Metric label="Modules" value={modules.length} /><Metric label="Active modules" value={activeModules} tone="good" /><Metric label="Operational" value={operationalModules} tone={operationalModules === activeModules ? 'good' : 'warn'} /><Metric label="Resources" value={resources.length} /><Metric label="Permissions" value={permissions} /></div>
    <div className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
      <section className="rounded-2xl border bg-card p-5"><div className="mb-5 flex items-center justify-between"><div className="flex items-center gap-2"><Boxes className="size-4 text-primary" /><h2 className="font-semibold">Module health</h2></div><span className="text-xs text-muted-foreground">{operationalModules}/{statuses.length} operational</span></div><div className="space-y-2">{statuses.map((item) => <div key={item.moduleId} className="flex items-center justify-between rounded-xl border px-4 py-3"><div><div className="font-medium">{modules.find((m) => m.id === item.moduleId)?.name ?? item.moduleId}</div><div className="mt-0.5 text-xs text-muted-foreground">{item.unavailableDependencies.length ? 'Dependencies unavailable' : 'Dependencies satisfied'}</div></div><div className="flex items-center gap-2 text-xs">{item.operational ? <CheckCircle2 className="size-4 text-emerald-500" /> : <TriangleAlert className="size-4 text-amber-500" />}{item.lifecycle}</div></div>)}{!loading && statuses.length === 0 && <div className="py-10 text-center text-sm text-muted-foreground">No module status data.</div>}</div></section>
      <section className="rounded-2xl border bg-card p-5"><div className="mb-5 flex items-center gap-2"><KeyRound className="size-4 text-primary" /><h2 className="font-semibold">Authorization coverage</h2></div><div className="space-y-4"><div className="rounded-xl border p-4"><div className="flex justify-between text-sm"><span>Declared capabilities</span><strong>{coverage?.declaredCount ?? '—'}</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${coveragePercent}%` }} /></div><div className="mt-2 text-xs text-muted-foreground">{coverage?.coveredCount ?? 0} covered · {coverage?.missingCount ?? 0} missing · {coverage?.staleCount ?? 0} stale</div></div>{gaps.length > 0 && <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4"><div className="flex items-center gap-2 text-sm font-medium"><TriangleAlert className="size-4 text-amber-500" />Missing persisted permissions</div><div className="mt-2 max-h-32 overflow-auto text-xs text-muted-foreground">{gaps.slice(0, 8).map((item) => <div key={item.module + item.resource + item.action + item.scope}>{item.module}/{item.resource} · {item.action} · {item.scope}</div>)}</div></div>}{stale.length > 0 && <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-muted-foreground">{stale.length} persisted permission{stale.length === 1 ? '' : 's'} no longer match Registry declarations.</div>}{!loading && gaps.length === 0 && stale.length === 0 && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="mr-2 inline size-4" />Registry and persisted permissions are aligned.</div>}</div></section>
    </div>
    <section className="rounded-2xl border bg-card p-5"><div className="mb-5 flex items-center gap-2"><Activity className="size-4 text-primary" /><h2 className="font-semibold">Recent platform activity</h2><span className="text-xs text-muted-foreground">{audit.length} events</span></div><div className="grid gap-2 md:grid-cols-2">{audit.map((item) => <div key={item.id} className="rounded-xl border px-4 py-3"><div className="flex items-center justify-between gap-3 text-xs"><span className="font-medium">{item.action}</span><span className="text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</span></div><div className="mt-1 text-sm">{item.resourceType}{item.resourceId ? ` · ${item.resourceId}` : ''}</div><div className="mt-1 truncate text-xs text-muted-foreground">{item.description ?? 'Platform event'}</div></div>)}</div>{audit.length === 0 && !loading && <div className="py-10 text-center text-sm text-muted-foreground">No recent audit events.</div>}</section>
    <div className="rounded-2xl border bg-muted/20 p-4 text-xs text-muted-foreground">Read-only coverage surface. Changes continue through the existing backend administration workflows; this dashboard does not create a second control plane.</div>
  </div>
}
