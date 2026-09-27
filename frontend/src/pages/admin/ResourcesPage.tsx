import { useEffect, useMemo, useState } from 'react'
import { Database, Layers3, ShieldCheck, SlidersHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { platformRegistry } from '@/lib/platform/registry'
import { resolveFieldPolicy } from '@/lib/platform/field-policy'
import type { FieldDefinition, ModuleDefinition, ResourceDefinition } from '@/lib/platform/contracts'
import { useAuthStore } from '@/stores/auth.store'

function label(value: string) {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/\b\w/g, (part) => part.toUpperCase())
}

export function ResourcesPage() {
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
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load Registry.'))
      .finally(() => setLoading(false))
  }, [token])

  const selectedResource = resources.find((resource) => resource.name === selected) ?? null
  const moduleMap = useMemo(() => new Map(modules.map((module) => [module.id, module])), [modules])
  const resourceFields = selectedResource
    ? Object.keys(selectedResource.fields ?? {}).map((name) => resolveFieldPolicy(selectedResource, name, fields)).filter(Boolean)
    : []
  const groupedResources = useMemo(() => modules.map((module) => ({
    module,
    resources: resources.filter((resource) => resource.module === module.id),
  })).filter((group) => group.resources.length > 0), [modules, resources])
  const ungroupedResources = resources.filter((resource) => !moduleMap.has(resource.module))
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platform control</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Resources</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Canonical Registry view for modules, resources, fields, capabilities and lifecycle metadata.</p>
        </div>
        <div className="flex gap-2">
          <div className="rounded-xl border bg-card px-4 py-3 text-sm"><div className="text-xs text-muted-foreground">Resources</div><div className="font-semibold">{loading ? '—' : resources.length}</div></div>
          <div className="rounded-xl border bg-card px-4 py-3 text-sm"><div className="text-xs text-muted-foreground">Modules</div><div className="font-semibold">{loading ? '—' : modules.length}</div></div>
        </div>
      </div>

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <section className="rounded-2xl border bg-card p-4">
          <div className="mb-4 flex items-center gap-2"><Layers3 className="size-4 text-primary" /><h2 className="font-semibold">Registered resources</h2></div>
          <div className="space-y-4">
            {groupedResources.map(({ module, resources: moduleResources }) => (
              <div key={module.id}>
                <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{module.name}</div>
                <div className="space-y-1">
                  {moduleResources.map((resource) => (
                    <Button key={resource.name} variant={selected === resource.name ? 'secondary' : 'ghost'} className="w-full justify-start" onClick={() => setSelected(resource.name)}>
                      <Database className="size-4" />{label(resource.name)}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
            {ungroupedResources.length > 0 && (
              <div>
                <div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Other</div>
                {ungroupedResources.map((resource) => (
                  <Button key={resource.name} variant={selected === resource.name ? 'secondary' : 'ghost'} className="mb-1 w-full justify-start" onClick={() => setSelected(resource.name)}>
                    <Database className="size-4" />{label(resource.name)}
                  </Button>
                ))}
              </div>
            )}
            {!loading && resources.length === 0 && <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No registered resources.</div>}
          </div>
        </section>
        <section className="space-y-6">
          {!selectedResource ? (
            <div className="flex min-h-80 items-center justify-center rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
              {loading ? 'Loading Registry contracts…' : 'Select a registered resource.'}
            </div>
          ) : (
            <>
              <div className="rounded-2xl border bg-card p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{selectedResource.module}</div>
                    <h2 className="mt-1 text-2xl font-semibold">{label(selectedResource.name)}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{selectedResource.model}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border px-2.5 py-1">Soft delete: {selectedResource.softDelete ? 'Yes' : 'No'}</span>
                    {selectedResource.ownerField && <span className="rounded-full border px-2.5 py-1">Owner: {selectedResource.ownerField}</span>}
                  </div>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-2xl border bg-card p-6">
                  <div className="mb-4 flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /><h3 className="font-semibold">Capabilities</h3></div>
                  <div className="space-y-2">
                    {(selectedResource.capabilities ?? []).map((capability) => (
                      <div key={capability.action} className="rounded-xl border p-3">
                        <div className="text-sm font-medium">{label(capability.action)}</div>
                        <div className="mt-1 flex flex-wrap gap-1.5">{capability.scopes.map((scope) => <span key={scope} className="rounded-full bg-muted px-2 py-0.5 text-xs">{scope}</span>)}</div>
                      </div>
                    ))}
                    {(selectedResource.capabilities ?? []).length === 0 && <p className="text-sm text-muted-foreground">No capability declarations.</p>}
                  </div>
                </div>

                <div className="rounded-2xl border bg-card p-6">
                  <div className="mb-4 flex items-center gap-2"><SlidersHorizontal className="size-4 text-primary" /><h3 className="font-semibold">Resource contract</h3></div>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div><dt className="text-muted-foreground">Searchable</dt><dd className="mt-1 font-medium">{selectedResource.searchableFields?.join(', ') || '—'}</dd></div>
                    <div><dt className="text-muted-foreground">Sortable</dt><dd className="mt-1 font-medium">{selectedResource.sortableFields?.join(', ') || '—'}</dd></div>
                    <div><dt className="text-muted-foreground">Default sort</dt><dd className="mt-1 font-medium">{selectedResource.defaultSort || '—'}</dd></div>
                    <div><dt className="text-muted-foreground">Features</dt><dd className="mt-1 font-medium">{selectedResource.features?.join(', ') || '—'}</dd></div>
                  </dl>
                </div>
              </div>
              <div className="rounded-2xl border bg-card p-6">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div><h3 className="font-semibold">Fields</h3><p className="mt-1 text-sm text-muted-foreground">Resolved from the canonical Field Registry and resource overrides.</p></div>
                  <span className="rounded-full border px-2.5 py-1 text-xs">{resourceFields.length} fields</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="border-b text-xs text-muted-foreground"><tr><th className="pb-3 pr-4">Field</th><th className="pb-3 pr-4">Type</th><th className="pb-3 pr-4">Required</th><th className="pb-3 pr-4">Override</th><th className="pb-3">Validation</th></tr></thead>
                    <tbody className="divide-y">
                      {resourceFields.map((field) => field && (
                        <tr key={field.name}>
                          <td className="py-3 pr-4 font-medium">{field.name}</td>
                          <td className="py-3 pr-4">{field.type}</td>
                          <td className="py-3 pr-4">{field.required ? 'Yes' : 'No'}</td>
                          <td className="py-3 pr-4">{field.overrideMode || '—'}</td>
                          <td className="py-3 text-muted-foreground">{[
                            field.validation?.minLength !== undefined && 'min length ' + field.validation.minLength,
                            field.validation?.maxLength !== undefined && 'max length ' + field.validation.maxLength,
                            field.validation?.min !== undefined && 'min ' + field.validation.min,
                            field.validation?.max !== undefined && 'max ' + field.validation.max,
                            field.validation?.integer && 'integer',
                            field.validation?.enumValues?.length ? 'enum (' + field.validation.enumValues.length + ')' : null,
                          ].filter(Boolean).join(' · ') || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl border bg-muted/20 p-5 text-sm text-muted-foreground">
                Module lifecycle: <span className="font-medium text-foreground">{moduleMap.get(selectedResource.module)?.lifecycle || 'unregistered module'}</span>
                {moduleMap.get(selectedResource.module)?.dependencies?.length ? ' · Dependencies: ' + moduleMap.get(selectedResource.module)?.dependencies?.join(', ') : ''}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
