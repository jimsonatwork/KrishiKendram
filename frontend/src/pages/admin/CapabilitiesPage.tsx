import { useEffect, useMemo, useState } from 'react'
import { Database, ShieldCheck, SlidersHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { platformRegistry } from '@/lib/platform/registry'
import { resolveFieldPolicy } from '@/lib/platform/field-policy'
import type { FieldDefinition, ModuleDefinition, ResourceDefinition } from '@/lib/platform/contracts'
import { useAuthStore } from '@/stores/auth.store'

function label(value: string) {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/\b\w/g, (part) => part.toUpperCase())
}

function validationText(field: FieldDefinition) {
  const v = field.validation
  if (!v) return '—'
  return [
    v.required && 'required',
    v.minLength !== undefined && 'min length ' + v.minLength,
    v.maxLength !== undefined && 'max length ' + v.maxLength,
    v.min !== undefined && 'min ' + v.min,
    v.max !== undefined && 'max ' + v.max,
    v.integer && 'integer',
    v.pattern && 'pattern',
    v.enumValues?.length && 'enum (' + v.enumValues.length + ')',
  ].filter(Boolean).join(' · ') || '—'
}

export function CapabilitiesPage() {
  const token = useAuthStore((state) => state.accessToken)
  const [resources, setResources] = useState<ResourceDefinition[]>([])
  const [modules, setModules] = useState<ModuleDefinition[]>([])
  const [fields, setFields] = useState<FieldDefinition[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    Promise.all([platformRegistry.resources(token), platformRegistry.modules(token), platformRegistry.fields(token)])
      .then(([resourceData, moduleData, fieldData]) => {
        setResources(resourceData)
        setModules(moduleData)
        setFields(fieldData)
        setSelected((current) => current ?? resourceData[0]?.name ?? null)
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load platform contracts.'))
      .finally(() => setLoading(false))
  }, [token])

  const selectedResource = resources.find((resource) => resource.name === selected) ?? null
  const moduleMap = useMemo(() => new Map(modules.map((module) => [module.id, module])), [modules])
  const resolvedFields = selectedResource
    ? Object.keys(selectedResource.fields ?? {}).map((name) => resolveFieldPolicy(selectedResource, name, fields)).filter(Boolean)
    : []

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platform control</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Capabilities & Fields</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">One contract view from module to resource capability, scope, field validation and normalization. Declarations remain owned by the backend Registry.</p>
      </div>

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <section className="rounded-2xl border bg-card p-4">
          <div className="mb-4 flex items-center gap-2"><Database className="size-4 text-primary" /><h2 className="font-semibold">Resources</h2></div>
          <div className="space-y-1">
            {resources.map((resource) => <Button key={resource.name} variant={selected === resource.name ? 'secondary' : 'ghost'} className="w-full justify-start" onClick={() => setSelected(resource.name)}><Database className="size-4" />{label(resource.name)}</Button>)}
            {!loading && resources.length === 0 && <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No registered resources.</div>}
          </div>
        </section>

        <section className="space-y-6">
          {!selectedResource ? (
            <div className="flex min-h-80 items-center justify-center rounded-2xl border bg-card text-sm text-muted-foreground">{loading ? 'Loading platform contracts…' : 'Select a resource.'}</div>
          ) : (
            <>
              <div className="rounded-2xl border bg-card p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div><div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{selectedResource.module}</div><h2 className="mt-1 text-2xl font-semibold">{label(selectedResource.name)}</h2><p className="mt-1 text-sm text-muted-foreground">{selectedResource.model}</p></div>
                  <span className="rounded-full border px-3 py-1.5 text-xs">{moduleMap.get(selectedResource.module)?.lifecycle ?? 'unregistered module'}</span>
                </div>
              </div>

              <div className="rounded-2xl border bg-card p-6">
                <div className="mb-4 flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /><h3 className="font-semibold">Capability declarations</h3></div>
                <p className="mb-4 text-sm text-muted-foreground">These declarations define what the resource supports. They do not grant a role or user permission by themselves.</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(selectedResource.capabilities ?? []).map((capability) => <div key={capability.action} className="rounded-xl border p-4"><div className="font-medium">{label(capability.action)}</div><div className="mt-2 flex flex-wrap gap-1.5">{capability.scopes.map((scope) => <span key={scope} className="rounded-full bg-muted px-2 py-0.5 text-xs">{scope}</span>)}</div></div>)}
                  {(selectedResource.capabilities ?? []).length === 0 && <p className="text-sm text-muted-foreground">No capabilities declared.</p>}
                </div>
              </div>

              <div className="rounded-2xl border bg-card p-6">
                <div className="mb-4 flex items-center gap-2"><SlidersHorizontal className="size-4 text-primary" /><h3 className="font-semibold">Resolved field policies</h3></div>
                <p className="mb-4 text-sm text-muted-foreground">Fields resolve from reusable definitions plus only permitted resource overrides. The backend Registry remains authoritative.</p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="border-b text-xs text-muted-foreground"><tr><th className="pb-3 pr-4">Field</th><th className="pb-3 pr-4">Type</th><th className="pb-3 pr-4">Required</th><th className="pb-3 pr-4">Mode</th><th className="pb-3">Validation</th></tr></thead>
                    <tbody className="divide-y">
                      {resolvedFields.map((field) => field && <tr key={field.name}><td className="py-3 pr-4 font-medium">{field.name}</td><td className="py-3 pr-4">{field.type}</td><td className="py-3 pr-4">{field.required ? 'Yes' : 'No'}</td><td className="py-3 pr-4">{field.overrideMode ?? 'FIXED'}</td><td className="py-3 text-muted-foreground">{validationText(field)}</td></tr>)}
                    </tbody>
                  </table>
                </div>
                {resolvedFields.length === 0 && <p className="text-sm text-muted-foreground">No resource fields are registered.</p>}
              </div>

              <div className="rounded-2xl border bg-muted/20 p-5 text-sm text-muted-foreground">Platform administration currently exposes the canonical contract safely. Permission grants and field access remain governed by backend Authorization and Permission services; this screen does not create a second policy engine.</div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
