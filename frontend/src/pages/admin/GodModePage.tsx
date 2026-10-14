import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Database, History, RefreshCw, Shield, SlidersHorizontal, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth.store'

type GodSnapshot = { id: string; version: number; value: unknown; actorId?: string | null; reason?: string | null; createdAt: string }
type AiSnapshot = { snapshotId: string; sha256: string; byteLength: number }
type AiModelStatus = {
  activeModelId: string
  evaluationModelId: string | null
  runtimeReachable: boolean
  cloudFallbackAllowed: false
  models: Array<{ modelId: string; displayName: string; linked: boolean; active: boolean; installed: boolean; role: string; productionReady: boolean; source: string }>
}

type AiControlPlane = {
  registryId: string
  version: number
  status: string
  capabilities: string[]
  moduleContracts: Array<{ moduleId: string; moduleName: string; allowedCapabilities: string[]; manifestPath: string }>
  inventories: {
    providers?: { providers?: Array<{ providerId: string; capability: string; status: string; executionMode?: string }> } | null
    runtimes?: { runtimes?: Array<{ runtimeId: string; runtimeStatus: string; healthStatus?: string }> } | null
    policies?: { enforcement?: Record<string, boolean> } | null
    evaluations?: { evaluationSuites?: unknown[] } | null
    cloudConnectionPolicy?: Record<string, unknown> | null
  }
  linkedFiles: Record<string, string>
  moduleFiles: Record<string, string>
  healthDiagnostics?: {
    probeMode: string
    executedProviderCode: boolean
    networkChecksPerformed: boolean
    secretValuesExposed: boolean
    note: string
    providers: Array<{ providerId: string; declaredStatus: string; ready: boolean; implementation: { declaredPath: string | null; status: string }; contract: { declaredPath: string | null; status: string } }>
    runtimes: Array<{ runtimeId: string; declaredStatus: string; declaredHealthStatus: string; ready: boolean; implementation: { declaredPath: string | null; status: string } }>
  }
  safety: { directDatabaseWritesAllowed: boolean; userConfirmationRequired: boolean; registryValidationRequired: boolean; secretValuesExposed: boolean }
}

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

const API_ROOT = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'
const BASE = API_ROOT + '/admin/god-mode'
const MODEL_BASE = API_ROOT + '/admin/ai/models'

async function requestJson<T>(token: string, path: string, method: 'PATCH' | 'POST', body: unknown): Promise<T> {
  const response = await fetch(BASE + path, { method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(typeof result.message === 'string' ? result.message : response.status + ' ' + response.statusText)
  return result as T
}

async function requestModelApi<T>(token: string, path = '', method: 'GET' | 'POST' = 'GET'): Promise<T> {
  const response = await fetch(MODEL_BASE + path, { method, headers: { Authorization: 'Bearer ' + token } })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(typeof result.message === 'string' ? result.message : response.status + ' ' + response.statusText)
  return result as T
}

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
  const [aiControlPlane, setAiControlPlane] = useState<AiControlPlane | null>(null)
  const [aiModels, setAiModels] = useState<AiModelStatus | null>(null)
  const [aiModelsBusy, setAiModelsBusy] = useState(false)
  const [aiModelsMessage, setAiModelsMessage] = useState('')
  const [aiFileKey, setAiFileKey] = useState('providerInventory')
  const [aiFileText, setAiFileText] = useState('')
  const [aiFileRevision, setAiFileRevision] = useState('')
  const [aiFileReason, setAiFileReason] = useState('')
  const [aiFileMessage, setAiFileMessage] = useState('')
  const [aiFileBusy, setAiFileBusy] = useState(false)
  const [aiSnapshots, setAiSnapshots] = useState<AiSnapshot[]>([])
  const [aiRollbackReason, setAiRollbackReason] = useState('')

  const load = async () => {
    if (!token) return
    setLoading(true); setError(null)
    try {
      const data = await request<GodConfig[]>(token, '/configuration')
      setItems(data)
      setSelected((current) => current ? data.find((item) => item.stableId === current.stableId) ?? current : data[0] ?? null)
      try { setAiControlPlane(await request<AiControlPlane>(token, '/ai-control-plane')) } catch { setAiControlPlane(null) }
      try { setAiModels(await requestModelApi<AiModelStatus>(token)) } catch { setAiModels(null) }
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

  const changeModelLink = async (modelId: string, action: 'link' | 'unlink' | 'activate' | 'evaluate') => {
    if (!token) return
    setAiModelsBusy(true); setAiModelsMessage('')
    try {
      await requestModelApi(token, '/' + encodeURIComponent(modelId) + '/' + action, 'POST')
      setAiModels(await requestModelApi<AiModelStatus>(token))
      setAiModelsMessage(action === 'activate' ? 'Production model changed after approval. Module contracts were not changed.' : action === 'evaluate' ? 'Model selected for benchmarking only. The live model and module contracts were not changed.' : action === 'link' ? 'Model linked. It was not downloaded or activated.' : 'Model unlinked. Model files and conversation history were preserved.')
    } catch (cause) {
      setAiModelsMessage(cause instanceof Error ? cause.message : 'Model connection change failed.')
    } finally { setAiModelsBusy(false) }
  }

  const loadAiFile = async () => {
    if (!token) return
    setAiFileBusy(true); setAiFileMessage('')
    try {
      const file = await request<{ value: unknown; sha256: string }>(token, '/ai-control-plane/files/' + encodeURIComponent(aiFileKey))
      setAiFileText(JSON.stringify(file.value, null, 2)); setAiFileRevision(file.sha256); setAiFileMessage('Loaded current revision. Review carefully before saving.')
    } catch (cause) { setAiFileMessage(cause instanceof Error ? cause.message : 'Unable to load AI file.') }
    finally { setAiFileBusy(false) }
  }

  const loadAiSnapshots = async () => {
    if (!token) return
    try { setAiSnapshots(await request<AiSnapshot[]>(token, '/ai-control-plane/files/' + encodeURIComponent(aiFileKey) + '/snapshots')) }
    catch { setAiSnapshots([]) }
  }

  const rollbackAiFile = async (snapshotId: string) => {
    if (!token || !aiFileRevision || aiRollbackReason.trim().length < 8) return
    if (!window.confirm('Restore this saved snapshot? The current file will also be snapshotted first.')) return
    setAiFileBusy(true); setAiFileMessage('')
    try {
      const result = await requestJson<{ sha256: string; snapshotId: string }>(token, '/ai-control-plane/files/' + encodeURIComponent(aiFileKey) + '/rollback', 'POST', { snapshotId, expectedSha256: aiFileRevision, reason: aiRollbackReason })
      setAiFileRevision(result.sha256); setAiRollbackReason(''); setAiFileMessage('Snapshot restored and audited. Recovery snapshot: ' + result.snapshotId)
      await loadAiFile(); await loadAiSnapshots()
    } catch (cause) { setAiFileMessage(cause instanceof Error ? cause.message : 'Rollback failed; reload the current revision before retrying.') }
    finally { setAiFileBusy(false) }
  }

  const saveAiFile = async () => {
    if (!token) return
    setAiFileBusy(true); setAiFileMessage('')
    try {
      const value = JSON.parse(aiFileText) as unknown
      const result = await requestJson<{ sha256: string; snapshotId: string }>(token, '/ai-control-plane/files/' + encodeURIComponent(aiFileKey), 'PATCH', { value, expectedSha256: aiFileRevision, reason: aiFileReason })
      setAiFileRevision(result.sha256); setAiFileReason(''); setAiFileMessage('Saved and audited. Pre-change snapshot: ' + result.snapshotId)
      await load(); await loadAiSnapshots()
    } catch (cause) { setAiFileMessage(cause instanceof Error ? cause.message : 'Save failed; refresh the file revision before retrying.') }
    finally { setAiFileBusy(false) }
  }

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
    <section className="space-y-4 rounded-2xl border bg-card p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><div className="text-xs font-semibold uppercase tracking-wider text-primary">AI control plane</div><h2 className="mt-1 text-xl font-semibold">One registry · centrally governed module contracts</h2><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Inventory is loaded from the canonical AI manifest. Module contracts remain centrally stored and inherit shared policy; this view does not imply a provider is production-ready.</p></div><span className="rounded-lg border px-2 py-1 text-xs">{aiControlPlane?.registryId ?? 'Registry unavailable'}</span></div>
      {aiControlPlane ? <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border p-3"><div className="text-2xl font-semibold">{aiControlPlane.moduleContracts.length}</div><div className="text-xs text-muted-foreground">Registered module contracts</div></div>
          <div className="rounded-xl border p-3"><div className="text-2xl font-semibold">{aiControlPlane.capabilities.length}</div><div className="text-xs text-muted-foreground">Shared capabilities</div></div>
          <div className="rounded-xl border p-3"><div className="text-2xl font-semibold">{aiControlPlane.inventories.providers?.providers?.length ?? 0}</div><div className="text-xs text-muted-foreground">Provider entries (not health status)</div></div>
          <div className="rounded-xl border p-3"><div className="text-2xl font-semibold">{aiControlPlane.inventories.runtimes?.runtimes?.length ?? 0}</div><div className="text-xs text-muted-foreground">Runtime entries</div></div>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border p-4"><h3 className="font-semibold">Centrally governed module contracts</h3><div className="mt-3 space-y-2">{aiControlPlane.moduleContracts.map((module) => <div key={module.moduleId} className="rounded-lg border px-3 py-2"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-medium">{module.moduleName}</span><code className="text-[11px] text-muted-foreground">{module.moduleId}</code></div><div className="mt-1 text-xs text-muted-foreground">{module.manifestPath}</div><div className="mt-1 text-xs">Shared capabilities: {module.allowedCapabilities.join(', ') || 'None declared'}</div></div>)}</div></div>
          <div className="rounded-xl border p-4"><h3 className="font-semibold">Provider and runtime inventory</h3><div className="mt-3 space-y-2">{(aiControlPlane.inventories.providers?.providers ?? []).map((provider) => <div key={provider.providerId} className="rounded-lg border px-3 py-2"><div className="text-sm font-medium">{provider.providerId}</div><div className="mt-1 text-xs text-muted-foreground">{provider.capability} · {provider.executionMode ?? 'mode unspecified'}</div><div className="mt-1 text-xs">Status: {provider.status}</div></div>)}{(aiControlPlane.inventories.runtimes?.runtimes ?? []).map((runtime) => <div key={runtime.runtimeId} className="rounded-lg border px-3 py-2"><div className="text-sm font-medium">{runtime.runtimeId}</div><div className="mt-1 text-xs text-muted-foreground">{runtime.runtimeStatus} · {runtime.healthStatus ?? 'health not reported'}</div></div>)}</div></div>
        </div>
        <div className="rounded-xl border p-4"><h3 className="font-semibold">Central entrypoint links</h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{Object.entries(aiControlPlane.linkedFiles).map(([key, path]) => <div key={key} className="rounded-lg bg-muted/30 px-3 py-2"><div className="text-xs font-medium">{key}</div><code className="mt-1 block break-all text-[11px] text-muted-foreground">{path}</code></div>)}</div></div>
        <div className="rounded-xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold">Model connections</h3><p className="mt-1 text-xs text-muted-foreground">Link/unlink models and select evaluation candidates here. Evaluation selection never changes the live model. Production switching is blocked until a model is explicitly approved.</p></div><Button variant="outline" size="sm" onClick={() => { if (token) void requestModelApi<AiModelStatus>(token).then(setAiModels).catch((cause) => setAiModelsMessage(cause instanceof Error ? cause.message : 'Unable to refresh model links.')) }} disabled={aiModelsBusy}>Refresh models</Button></div>
          {aiModels ? <><div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-md border px-2 py-1">Active: {aiModels.activeModelId}</span><span className="rounded-md border px-2 py-1">Local Ollama: {aiModels.runtimeReachable ? 'reachable' : 'unavailable'}</span><span className="rounded-md border px-2 py-1">Cloud fallback: disabled</span></div>
            <div className="mt-3 space-y-2">{aiModels.models.map((model) => <div key={model.modelId} className="rounded-lg border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><div className="text-sm font-semibold">{model.displayName}</div><code className="text-[11px] text-muted-foreground">{model.modelId}</code></div><div className="flex flex-wrap gap-1 text-[10px]">{model.active && <span className="rounded-md border px-2 py-1">LIVE SELECTION</span>}{aiModels.evaluationModelId === model.modelId && <span className="rounded-md border px-2 py-1">EVALUATION ONLY</span>}<span className="rounded-md border px-2 py-1">{model.linked ? 'LINKED' : 'UNLINKED'}</span><span className="rounded-md border px-2 py-1">{model.installed ? 'INSTALLED' : 'NOT INSTALLED'}</span></div></div><div className="mt-3 flex flex-wrap gap-2">{model.linked && !model.active && !model.productionReady && <Button size="sm" variant="outline" disabled={aiModelsBusy || !model.installed || !aiModels.runtimeReachable} onClick={() => void changeModelLink(model.modelId, 'evaluate')}>{aiModels.evaluationModelId === model.modelId ? 'Selected for evaluation' : 'Select for evaluation'}</Button>}{model.linked && !model.active && model.productionReady && <Button size="sm" variant="outline" disabled={aiModelsBusy || !model.installed || !aiModels.runtimeReachable} onClick={() => void changeModelLink(model.modelId, 'activate')}>Activate approved model</Button>}{model.linked && !model.active && <Button size="sm" variant="outline" disabled={aiModelsBusy} onClick={() => void changeModelLink(model.modelId, 'unlink')}>Unlink</Button>}{!model.linked && <Button size="sm" variant="outline" disabled={aiModelsBusy} onClick={() => void changeModelLink(model.modelId, 'link')}>Link model</Button>}</div></div>)}</div>
          </> : <p className="mt-3 text-sm text-muted-foreground">Model connection controls are unavailable. This is restricted to the canonical God Mode identity.</p>}
          {aiModelsMessage && <p role="status" className="mt-3 break-words rounded-lg border p-3 text-xs">{aiModelsMessage}</p>}
        </div>
        <div className="rounded-xl border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Health & installation-path diagnostics</h3><span className="rounded-md border px-2 py-1 text-[10px]">{aiControlPlane.healthDiagnostics?.probeMode ?? 'Diagnostics unavailable'}</span></div>
          <p className="mt-1 text-xs text-muted-foreground">{aiControlPlane.healthDiagnostics?.note ?? 'Static diagnostics are not available from this backend version.'}</p>
          {aiControlPlane.healthDiagnostics && <><div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-md border px-2 py-1">Provider code executed: {String(aiControlPlane.healthDiagnostics.executedProviderCode)}</span><span className="rounded-md border px-2 py-1">Network checks: {String(aiControlPlane.healthDiagnostics.networkChecksPerformed)}</span><span className="rounded-md border px-2 py-1">Secrets exposed: {String(aiControlPlane.healthDiagnostics.secretValuesExposed)}</span></div>
          <div className="mt-3 grid gap-3 xl:grid-cols-2"><div><h4 className="text-sm font-medium">Providers</h4><div className="mt-2 space-y-2">{aiControlPlane.healthDiagnostics.providers.map((provider) => <div key={provider.providerId} className="rounded-lg border p-3"><div className="flex flex-wrap justify-between gap-2"><span className="text-xs font-semibold">{provider.providerId}</span><span className="text-xs text-muted-foreground">{provider.ready ? 'Ready' : 'Not production-ready'}</span></div><div className="mt-2 text-xs text-muted-foreground">Implementation: {provider.implementation.status} · Contract: {provider.contract.status}</div><div className="mt-1 break-all text-[11px] text-muted-foreground">{provider.implementation.declaredPath ?? 'No implementation path'}</div></div>)}</div></div><div><h4 className="text-sm font-medium">Runtimes</h4><div className="mt-2 space-y-2">{aiControlPlane.healthDiagnostics.runtimes.map((runtime) => <div key={runtime.runtimeId} className="rounded-lg border p-3"><div className="flex flex-wrap justify-between gap-2"><span className="text-xs font-semibold">{runtime.runtimeId}</span><span className="text-xs text-muted-foreground">{runtime.ready ? 'Healthy' : 'Not health-verified'}</span></div><div className="mt-2 text-xs text-muted-foreground">Declared: {runtime.declaredStatus} · Health: {runtime.declaredHealthStatus}</div><div className="mt-1 break-all text-[11px] text-muted-foreground">{runtime.implementation.declaredPath ?? 'No implementation path'}</div></div>)}</div></div></div></>}
        </div>
        <div className="rounded-xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold">Governed AI configuration editor</h3><p className="mt-1 text-xs text-muted-foreground">Only registered JSON inventories and module contracts are editable. Each save requires the current revision, a reason, schema checks, a snapshot and an audit event.</p></div><span className="rounded-md border px-2 py-1 text-[10px]">God Mode only</span></div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <select className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm" value={aiFileKey} onChange={(event) => { setAiFileKey(event.target.value); setAiFileText(''); setAiFileRevision(''); setAiFileMessage('') }}>
              <option value="providerInventory">Provider inventory</option><option value="runtimeInventory">Runtime inventory</option><option value="policyIndex">AI policy index</option><option value="evaluationIndex">Evaluation index</option><option value="cloudConnectionPolicy">Cloud connection policy (disabled)</option>
              {aiControlPlane.moduleContracts.map((module) => <option key={module.moduleId} value={'module:' + module.moduleId}>Module: {module.moduleName}</option>)}
            </select>
            <Button variant="outline" size="sm" onClick={() => void loadAiFile()} disabled={aiFileBusy}>{aiFileBusy ? 'Working…' : 'Load current file'}</Button>
          </div>
          <textarea aria-label="AI configuration JSON" className="mt-3 min-h-64 w-full rounded-lg border bg-background p-3 font-mono text-xs" spellCheck={false} value={aiFileText} onChange={(event) => setAiFileText(event.target.value)} placeholder="Load a registered AI JSON file before editing." />
          <label className="mt-3 block text-xs font-medium">Reason for change (required)</label>
          <input className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" value={aiFileReason} onChange={(event) => setAiFileReason(event.target.value)} maxLength={500} placeholder="Explain why this governance change is needed" />
          <div className="mt-3 flex flex-wrap items-center gap-3"><Button size="sm" onClick={() => void saveAiFile()} disabled={aiFileBusy || !aiFileRevision || aiFileReason.trim().length < 8 || !aiFileText.trim()}>Validate & save snapshot</Button><span className="break-all text-[11px] text-muted-foreground">Revision: {aiFileRevision ? aiFileRevision.slice(0, 16) + '…' : 'not loaded'}</span></div>
          {aiFileMessage && <p role="status" className="mt-3 break-words rounded-lg border p-3 text-xs">{aiFileMessage}</p>}
          <div className="mt-4 border-t pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-semibold">Saved recovery snapshots</h4><Button variant="outline" size="sm" onClick={() => void loadAiSnapshots()} disabled={aiFileBusy}>Refresh snapshots</Button></div>
            <p className="mt-1 text-xs text-muted-foreground">Rollback checks the live revision and snapshots the current file before restoring. Each rollback requires a reason and confirmation.</p>
            <input className="mt-3 w-full rounded-md border bg-background px-3 py-2 text-sm" value={aiRollbackReason} onChange={(event) => setAiRollbackReason(event.target.value)} maxLength={500} placeholder="Reason for rollback (8–500 characters)" />
            {aiSnapshots.length ? <div className="mt-3 space-y-2">{aiSnapshots.map((snapshot) => <div key={snapshot.snapshotId} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><code className="block break-all text-[11px]">{snapshot.snapshotId}</code><div className="mt-1 text-[11px] text-muted-foreground">{snapshot.byteLength} bytes · SHA-256 {snapshot.sha256.slice(0, 16)}…</div></div><Button variant="outline" size="sm" disabled={aiFileBusy || !aiFileRevision || aiRollbackReason.trim().length < 8} onClick={() => void rollbackAiFile(snapshot.snapshotId)}>Restore snapshot</Button></div>)}</div> : <p className="mt-2 text-xs text-muted-foreground">No snapshots for this file yet. A snapshot is created automatically before the first successful change.</p>}
          </div>
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm"><strong>Safety contract:</strong> direct AI database writes {aiControlPlane.safety.directDatabaseWritesAllowed ? 'enabled (unsafe)' : 'disabled'}; central validation {aiControlPlane.safety.registryValidationRequired ? 'required' : 'not required'}; user confirmation {aiControlPlane.safety.userConfirmationRequired ? 'required' : 'not required'}; secret values exposed: {aiControlPlane.safety.secretValuesExposed ? 'yes' : 'no'}.</div>
      </> : <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">AI inventory endpoint is unavailable. Refresh after backend startup; no provider is assumed healthy.</div>}
    </section>
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
