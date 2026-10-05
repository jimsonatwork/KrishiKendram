import { useEffect, useState } from 'react'
import { RefreshCw, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth.store'

type Action = 'ALLOW' | 'WARNING' | 'BLOCK' | 'TRANSFER_REQUIRED' | 'CONFIRM_REQUIRED'
type RuleKey = 'emailDuplicate' | 'mobileDuplicate' | 'combinationDuplicate'
type Policy = { defaults: Record<RuleKey, Action>; modules: Record<string, Partial<Record<RuleKey, Action>>> }
const keys: RuleKey[] = ['emailDuplicate', 'mobileDuplicate', 'combinationDuplicate']
const labels: Record<RuleKey, string> = { emailDuplicate: 'Duplicate email', mobileDuplicate: 'Duplicate mobile', combinationDuplicate: 'Email + mobile combination' }
const actions: Action[] = ['ALLOW', 'WARNING', 'BLOCK', 'TRANSFER_REQUIRED', 'CONFIRM_REQUIRED']

export function ValidationPolicyPage() {
  const token = useAuthStore((s) => s.accessToken)
  const [policy, setPolicy] = useState<Policy>({ defaults: { emailDuplicate: 'BLOCK', mobileDuplicate: 'TRANSFER_REQUIRED', combinationDuplicate: 'BLOCK' }, modules: {} })
  const [moduleKey, setModuleKey] = useState('users')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const base = `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'}/admin/god-mode/validation-policy`
  const load = async () => { if (!token) return; const r = await fetch(base, { headers: { Authorization: `Bearer ${token}` } }); if (!r.ok) throw new Error(`${r.status} ${r.statusText}`); setPolicy(await r.json()) }
  useEffect(() => { void load().catch((e) => setMessage(e instanceof Error ? e.message : 'Unable to load policy.')) }, [token])
  const setDefault = (key: RuleKey, value: Action) => setPolicy((p) => ({ ...p, defaults: { ...p.defaults, [key]: value } }))
  const setModule = (key: RuleKey, value: Action) => setPolicy((p) => ({ ...p, modules: { ...p.modules, [moduleKey]: { ...(p.modules[moduleKey] ?? {}), [key]: value } } }))
  const save = async () => { if (!token) return; setSaving(true); setMessage(''); try { const r = await fetch(base, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ value: policy }) }); if (!r.ok) throw new Error(`${r.status} ${r.statusText}`); setPolicy(await r.json()); setMessage('Validation policy saved and audited.') } catch (e) { setMessage(e instanceof Error ? e.message : 'Unable to save policy.') } finally { setSaving(false) } }
  return <div className="space-y-5">
    <section className="rounded-2xl border bg-card p-5"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary"><ShieldCheck className="size-4" />Policy Center</div><h1 className="mt-1 text-2xl font-semibold">Validation & Duplicate Rules</h1><p className="mt-1 text-sm text-muted-foreground">God-controlled site defaults with module-specific overrides. Changes are persisted through the backend governance layer and audited.</p></div><Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="size-4" />Refresh</Button></div></section>
    <section className="rounded-2xl border bg-card p-5"><h2 className="font-semibold">Site-wide defaults</h2><div className="mt-4 grid gap-3 md:grid-cols-3">{keys.map((key) => <label key={key} className="rounded-xl border p-3"><span className="text-xs text-muted-foreground">{labels[key]}</span><select className="mt-2 h-10 w-full rounded-lg border bg-background px-3 text-sm" value={policy.defaults[key]} onChange={(e) => setDefault(key, e.target.value as Action)}>{actions.map((a) => <option key={a}>{a}</option>)}</select></label>)}</div></section>
    <section className="rounded-2xl border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Module / screen override</h2><p className="text-xs text-muted-foreground">Module-specific rules override the site default.</p></div><input className="h-10 rounded-lg border bg-background px-3 text-sm" value={moduleKey} onChange={(e) => setModuleKey(e.target.value)} placeholder="module key" /></div><div className="mt-4 grid gap-3 md:grid-cols-3">{keys.map((key) => <label key={key} className="rounded-xl border p-3"><span className="text-xs text-muted-foreground">{labels[key]}</span><select className="mt-2 h-10 w-full rounded-lg border bg-background px-3 text-sm" value={policy.modules[moduleKey]?.[key] ?? policy.defaults[key]} onChange={(e) => setModule(key, e.target.value as Action)}>{actions.map((a) => <option key={a}>{a}</option>)}</select></label>)}</div></section>
    <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">{message}</span><Button onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : 'Save governed policy'}</Button></div>
  </div>
}
