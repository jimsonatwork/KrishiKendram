import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Database, History, RefreshCw, Shield, SlidersHorizontal, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth.store'

type GodSnapshot = { id: string; version: number; value: unknown; actorId?: string | null; reason?: string | null; createdAt: string }

type GodConfig = {
  id: string
  stableId: string
  category: string
  name: string
  description?: string | null
  currentValue: unknown
  valueType: string
  editable: boolean
  godOnly: boolean
  riskLevel: string
  restartRequired: boolean
  approvalRequired: boolean
  snapshotBeforeChange: boolean
  lifecycle: string
  version: number
  ownerSource: string
  updatedAt: string
}

const BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1') + '/admin/god-mode'

async function request<T>(token: string, path: string): Promise<T> {
  const response = await fetch(BASE + path, { headers: { Authorization: 'Bearer ' + token } })
  if (!response.ok) throw new Error(response.status + ' ' + response.statusText)
  return response.json() as Promise<T>
}

export function GodModePage() {
  const token = useAuthStore((state) => state.accessToken)
  const [items, setItems] = useState<GodConfig[]>([])
  const [selected, setSelected] = useState<GodConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [snapshots, setSnapshots] = useState<GodSnapshot[]>([])

  const load = async () => {
    if (!token) return
    setLoading(true); setError(null)
    try {
      const data = await request<GodConfig[]>(token, '/configuration')
      setItems(data)
      setSelected((current) => current ? data.find((item) => item.stableId === current.stableId) ?? current : data[0] ?? null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load God Mode configuration.')
    } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [token])
  useEffect(() => {
    if (!token || !selected) { setSnapshots([]); return }
    void request<GodSnapshot[]>(token, '/configuration/' + encodeURIComponent(selected.stableId) + '/snapshots').then(setSnapshots).catch(() => setSnapshots([]))
  }, [token, selected?.stableId, selected?.version])

  const categories = useMemo(() => {
    const grouped = new Map<string, GodConfig[]>()
    for (const item of items) grouped.set(item.category, [...(grouped.get(item.category) ?? []), item])
    return [...grouped.entries()]
  }, [items])

  const editableCount = items.filter((item) => item.editable).length
  const criticalCount = items.filter((item) => item.riskLevel === 'CRITICAL').length

  return <div className="space-y-5">
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary"><Shield className="size-4" />God Mode</div><h1 className="mt-1 text-2xl font-semibold tracking-tight">KrishiKendram Control Root</h1><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Canonical control registry across the platform. This surface reads the backend registry and does not create a parallel configuration source.</p></div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} />Refresh</Button>
      </div>
    </section>
    {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><AlertTriangle className="mr-2 inline size-4" />{error}</div>}
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border bg-card p-4"><div className="text-2xl font-semibold">{items.length}</div><div className="text-xs text-muted-foreground">Control domains</div></div>
      <div className="rounded-xl border bg-card p-4"><div className="text-2xl font-semibold">{editableCount}</div><div className="text-xs text-muted-foreground">Currently editable</div></div>
      <div className="rounded-xl border bg-card p-4"><div className="text-2xl font-semibold">{criticalCount}</div><div className="text-xs text-muted-foreground">Critical-risk domains</div></div>
    </div>
    <div className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
      <section className="rounded-2xl border bg-card p-4"><div className="mb-3 flex items-center gap-2"><Database className="size-4 text-primary" /><h2 className="font-semibold">Canonical domains</h2></div><div className="space-y-1.5">
        {categories.map(([category, group]) => <button key={category} type="button" onClick={() => setSelected(group[0])} className="w-full rounded-xl border px-3 py-2.5 text-left hover:bg-muted/50"><div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{group[0].category}</span><span className="text-xs text-muted-foreground">{group.length}</span></div><div className="mt-0.5 text-xs text-muted-foreground">{group[0].description ?? group[0].name}</div></button>)}
        {!loading && items.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">No registry entries.</div>}
      </div></section>
      <section className="rounded-2xl border bg-card p-5">{selected ? <>
        <div className="flex items-start justify-between gap-4"><div><div className="text-xs uppercase tracking-wider text-muted-foreground">{selected.category}</div><h2 className="mt-1 text-xl font-semibold">{selected.name}</h2><p className="mt-1 text-sm text-muted-foreground">{selected.description}</p></div><span className="rounded-lg border px-2 py-1 text-[11px] uppercase">{selected.riskLevel}</span></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">{[['Stable ID', selected.stableId], ['Lifecycle', selected.lifecycle], ['Version', String(selected.version)], ['Owner', selected.ownerSource], ['Editable', selected.editable ? 'Yes' : 'Metadata only'], ['God only', selected.godOnly ? 'Yes' : 'No'], ['Restart required', selected.restartRequired ? 'Yes' : 'No'], ['Approval required', selected.approvalRequired ? 'Yes' : 'No']].map(([label, value]) => <div key={label} className="rounded-xl border p-3"><div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div><div className="mt-1 text-sm font-medium">{value}</div></div>)}</div>
        <div className="mt-4 rounded-xl border bg-muted/20 p-4"><div className="flex items-center gap-2 text-sm font-medium"><SlidersHorizontal className="size-4" />Current canonical value</div><pre className="mt-3 max-h-52 overflow-auto text-xs">{JSON.stringify(selected.currentValue, null, 2)}</pre></div>
        <div className="mt-4 rounded-xl border p-4"><div className="flex items-center gap-2 text-sm font-medium"><History className="size-4" />Snapshots & recovery history</div>{snapshots.length ? <div className="mt-3 space-y-2">{snapshots.slice(0, 8).map((snapshot) => <div key={snapshot.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs"><span>Version {snapshot.version} · {snapshot.reason ?? 'snapshot'}</span><span className="text-muted-foreground">{new Date(snapshot.createdAt).toLocaleString()}</span></div>)}</div> : <div className="mt-2 text-xs text-muted-foreground">No pre-change snapshots recorded yet.</div>}</div>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">{selected.editable ? <><CheckCircle2 className="size-4 text-emerald-500" />Governed updates are available through the protected API.</> : <><TriangleAlert className="size-4 text-amber-500" />This entry is metadata-only until its control contract is implemented.</>}</div>
      </> : <div className="py-20 text-center text-sm text-muted-foreground">Select a God Mode domain.</div>}</section>
    </div>
  </div>
}
