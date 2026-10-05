import { useEffect, useMemo, useState } from 'react'
import { Check, RefreshCw, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth.store'

type Action = 'ALLOW' | 'WARNING' | 'BLOCK' | 'TRANSFER_REQUIRED' | 'CONFIRM_REQUIRED'
type RuleKey = 'emailDuplicate' | 'mobileDuplicate' | 'combinationDuplicate'
type FieldRule = { required?: boolean; minLength?: number; maxLength?: number; min?: number; max?: number; pattern?: string; integer?: boolean }
type Policy = { defaults: Record<RuleKey, Action> & { fields?: Record<string, FieldRule> }; modules: Record<string, { fields?: Record<string, FieldRule>; [key: string]: unknown }>; resources: Record<string, { fields?: Record<string, FieldRule>; [key: string]: unknown }> }
type Field = { name: string; type: string; description?: string; validation?: FieldRule; overrideMode?: string; overridableValidation?: string[] }
type Resource = { name: string; module: string; fields?: Record<string, { definition: string }> }

const keys: RuleKey[] = ['emailDuplicate', 'mobileDuplicate', 'combinationDuplicate']
const labels: Record<RuleKey, string> = { emailDuplicate: 'Duplicate email', mobileDuplicate: 'Duplicate mobile', combinationDuplicate: 'Email + mobile combination' }
const actions: Action[] = ['ALLOW', 'WARNING', 'BLOCK', 'TRANSFER_REQUIRED', 'CONFIRM_REQUIRED']
const emptyPolicy: Policy = { defaults: { emailDuplicate: 'BLOCK', mobileDuplicate: 'TRANSFER_REQUIRED', combinationDuplicate: 'BLOCK', fields: {} }, modules: {}, resources: {} }

export function ValidationPolicyPage() {
  const token = useAuthStore((s) => s.accessToken)
  const [policy, setPolicy] = useState<Policy>(emptyPolicy)
  const [fields, setFields] = useState<Field[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [scope, setScope] = useState<'site' | 'module' | 'resource'>('site')
  const [scopeKey, setScopeKey] = useState('users')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const base = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1') + '/admin/god-mode'
  const load = async () => {
    if (!token) return
    setMessage('')
    try {
      const headers = { Authorization: 'Bearer ' + token }
      const [policyResponse, fieldsResponse, resourcesResponse] = await Promise.all([fetch(base + '/validation-policy', { headers }), fetch(base + '/fields', { headers }), fetch(base + '/resources', { headers })])
      if (!policyResponse.ok || !fieldsResponse.ok || !resourcesResponse.ok) throw new Error('Unable to load Registry policy data.')
      setPolicy(await policyResponse.json()); setFields(await fieldsResponse.json()); setResources(await resourcesResponse.json())
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Unable to load validation policy.') }
  }
  useEffect(() => { void load() }, [token])
  const editableFields = useMemo(() => fields.filter((field) => field.overrideMode !== 'FIXED' && (field.overridableValidation?.length ?? 0) > 0), [fields])
  const selectedRules = useMemo(() => { if (scope === 'site') return policy.defaults.fields ?? {}; if (scope === 'module') return policy.modules[scopeKey]?.fields ?? {}; return policy.resources[scopeKey]?.fields ?? {} }, [policy, scope, scopeKey])
  const updateField = (name: string, key: keyof FieldRule, value: unknown) => {
    setPolicy((current) => {
      if (scope === 'site') return { ...current, defaults: { ...current.defaults, fields: { ...(current.defaults.fields ?? {}), [name]: { ...(current.defaults.fields?.[name] ?? {}), [key]: value } } } }
      if (scope === 'module') return { ...current, modules: { ...current.modules, [scopeKey]: { ...(current.modules[scopeKey] ?? {}), fields: { ...(current.modules[scopeKey]?.fields ?? {}), [name]: { ...(current.modules[scopeKey]?.fields?.[name] ?? {}), [key]: value } } } } }
      return { ...current, resources: { ...current.resources, [scopeKey]: { ...(current.resources[scopeKey] ?? {}), fields: { ...(current.resources[scopeKey]?.fields ?? {}), [name]: { ...(current.resources[scopeKey]?.fields?.[name] ?? {}), [key]: value } } } } }
    })
  }
  const save = async () => {
    if (!token) return
    setSaving(true); setMessage('')
    try { const response = await fetch(base + '/validation-policy', { method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ value: policy }) }); if (!response.ok) throw new Error((await response.text()) || response.status + ' ' + response.statusText); setPolicy(await response.json()); setMessage('Validation policy saved, applied to the Registry, and audited.') }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Unable to save validation policy.') } finally { setSaving(false) }
  }
  const currentResource = scope === 'resource' ? resources.find((r) => r.name === scopeKey) : undefined
  const visibleFields = currentResource ? editableFields.filter((field) => currentResource.fields && Object.values(currentResource.fields).some((ref) => ref.definition === field.name)) : editableFields
  return <div className="space-y-5">
    <section className="rounded-2xl border bg-card p-5"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary"><ShieldCheck className="size-4" />God Mode · Field Policy Foundation</div><h1 className="mt-1 text-2xl font-semibold">Validation & Field Rules</h1><p className="mt-1 max-w-4xl text-sm text-muted-foreground">Control validation characteristics already declared by the canonical Registry. Site defaults can be narrowed by module or resource without editing source files.</p></div><Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="size-4" />Refresh</Button></div></section>
    <section className="rounded-2xl border bg-card p-5"><h2 className="font-semibold">Contact conflict policy</h2><p className="mt-1 text-xs text-muted-foreground">God controls the behavior for each duplicate condition.</p><div className="mt-4 grid gap-3 md:grid-cols-3">{keys.map((key) => <label key={key} className="rounded-xl border p-3"><span className="text-xs text-muted-foreground">{labels[key]}</span><select className="mt-2 h-10 w-full rounded-lg border bg-background px-3 text-sm" value={policy.defaults[key]} onChange={(e) => setPolicy((p) => ({ ...p, defaults: { ...p.defaults, [key]: e.target.value as Action } }))}>{actions.map((a) => <option key={a}>{a}</option>)}</select></label>)}</div></section>
    <section className="rounded-2xl border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Field validation matrix</h2><p className="text-xs text-muted-foreground">Required/optional, length, range, format and integer rules are editable only where the Registry permits an override.</p></div><div className="flex flex-wrap gap-2">{(['site', 'module', 'resource'] as const).map((item) => <Button key={item} size="sm" variant={scope === item ? 'default' : 'outline'} onClick={() => { setScope(item); if (item === 'module') setScopeKey('users'); if (item === 'resource') setScopeKey(resources[0]?.name ?? '') }}>{item === 'site' ? 'Site defaults' : item === 'module' ? 'Module override' : 'Resource override'}</Button>)}</div></div>
      {scope !== 'site' && <div className="mt-4 flex flex-wrap gap-2">{(scope === 'module' ? Array.from(new Set(resources.map((r) => r.module))) : resources.map((r) => r.name)).map((key) => <Button key={key} size="sm" variant={scopeKey === key ? 'secondary' : 'outline'} onClick={() => setScopeKey(key)}>{key}</Button>)}</div>}
      <div className="mt-4 overflow-x-auto rounded-xl border"><table className="w-full min-w-[980px] text-sm"><thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-3 py-3">Field</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Required</th><th className="px-3 py-3">Min</th><th className="px-3 py-3">Max</th><th className="px-3 py-3">Min length</th><th className="px-3 py-3">Max length</th><th className="px-3 py-3">Pattern</th><th className="px-3 py-3">Integer</th></tr></thead><tbody>
        {visibleFields.map((field) => { const rule = selectedRules[field.name] ?? {}; const allowed = new Set(field.overridableValidation ?? []); const can = (key: string) => allowed.has(key); const numberInput = (key: keyof FieldRule, value: number | undefined, enabled: boolean) => <input type="number" disabled={!enabled} value={value ?? ''} onChange={(e) => updateField(field.name, key, e.target.value === '' ? undefined : Number(e.target.value))} className="h-9 w-24 rounded-lg border bg-background px-2 text-xs disabled:opacity-40" />; return <tr key={field.name} className="border-b last:border-0"><td className="px-3 py-3"><div className="font-medium">{field.name}</div><div className="max-w-[220px] text-[11px] text-muted-foreground">{field.description}</div></td><td className="px-3 py-3 font-mono text-xs">{field.type}</td><td className="px-3 py-3">{can('required') ? <button type="button" className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs" onClick={() => updateField(field.name, 'required', rule.required !== true)}><Check className={rule.required === true ? 'size-3' : 'size-3 opacity-20'} />{rule.required === true ? 'Required' : 'Optional'}</button> : <span className="text-xs text-muted-foreground">{field.validation?.required ? 'Fixed required' : 'Fixed optional'}</span>}</td><td className="px-3 py-3">{numberInput('min', rule.min, can('min'))}</td><td className="px-3 py-3">{numberInput('max', rule.max, can('max'))}</td><td className="px-3 py-3">{numberInput('minLength', rule.minLength, can('minLength'))}</td><td className="px-3 py-3">{numberInput('maxLength', rule.maxLength, can('maxLength'))}</td><td className="px-3 py-3"><input disabled={!can('pattern')} value={rule.pattern ?? ''} onChange={(e) => updateField(field.name, 'pattern', e.target.value || undefined)} className="h-9 w-48 rounded-lg border bg-background px-2 text-xs font-mono disabled:opacity-40" placeholder={can('pattern') ? 'regex' : 'Registry fixed'} /></td><td className="px-3 py-3">{can('integer') ? <button type="button" className="rounded-lg border px-2.5 py-1.5 text-xs" onClick={() => updateField(field.name, 'integer', rule.integer !== true)}>{rule.integer === true ? 'Integer' : 'Decimal'}</button> : <span className="text-xs text-muted-foreground">{field.validation?.integer ? 'Fixed' : '—'}</span>}</td></tr> })}
      </tbody></table></div></section>
    <div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">{message}</span><Button onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : 'Save governed policy'}</Button></div>
  </div>
}
