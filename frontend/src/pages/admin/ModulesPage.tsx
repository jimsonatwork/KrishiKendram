import { useEffect, useMemo, useState } from 'react'
import { Boxes, CheckCircle2, CircleOff, Network } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { platformRegistry } from '@/lib/platform/registry'
import type { ModuleDefinition, ResourceDefinition } from '@/lib/platform/contracts'
import { useAuthStore } from '@/stores/auth.store'

function lifecycleLabel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase()
}

export function ModulesPage() {
  const token = useAuthStore((state) => state.accessToken)
  const [modules, setModules] = useState<ModuleDefinition[]>([])
  const [resources, setResources] = useState<ResourceDefinition[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    setLoading(true)
    Promise.all([platformRegistry.modules(token), platformRegistry.resources(token)])
      .then(([moduleData, resourceData]) => {
        setModules(moduleData)
        setResources(resourceData)
        setSelected((current) => current ?? moduleData[0]?.id ?? null)
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load module contracts.'))
      .finally(() => setLoading(false))
  }, [token])

  const selectedModule = modules.find((module) => module.id === selected) ?? null
  const moduleResources = useMemo(
    () => resources.filter((resource) => resource.module === selected),
    [resources, selected],
  )

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platform control</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Modules</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Canonical module lifecycle and dependency view. Module state remains owned by the backend Registry.
        </p>
      </div>

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <section className="rounded-2xl border bg-card p-4">
          <div className="mb-4 flex items-center gap-2"><Boxes className="size-4 text-primary" /><h2 className="font-semibold">Registered modules</h2></div>
          <div className="space-y-1">
            {modules.map((module) => (
              <Button key={module.id} variant={selected === module.id ? 'secondary' : 'ghost'} className="w-full justify-start" onClick={() => setSelected(module.id)}>
                <Boxes className="size-4" />{module.name}
              </Button>
            ))}
            {!loading && modules.length === 0 && <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No registered modules.</div>}
          </div>
        </section>

        <section className="space-y-6">
          {!selectedModule ? (
            <div className="flex min-h-80 items-center justify-center rounded-2xl border bg-card text-sm text-muted-foreground">
              {loading ? 'Loading module contracts…' : 'Select a module.'}
            </div>
          ) : (
            <>
              <div className="rounded-2xl border bg-card p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Module ID</div>
                    <h2 className="mt-1 text-2xl font-semibold">{selectedModule.name}</h2>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{selectedModule.id}</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm">
                    {selectedModule.lifecycle === 'ACTIVE' ? <CheckCircle2 className="size-4" /> : <CircleOff className="size-4" />}
                    {lifecycleLabel(selectedModule.lifecycle)}
                  </div>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-2xl border bg-card p-6">
                  <div className="mb-4 flex items-center gap-2"><Network className="size-4 text-primary" /><h3 className="font-semibold">Dependencies</h3></div>
                  {selectedModule.dependencies?.length ? (
                    <div className="space-y-2">{selectedModule.dependencies.map((dependency) => (
                      <div key={dependency} className="rounded-xl border p-3 font-mono text-sm">{dependency}</div>
                    ))}</div>
                  ) : <p className="text-sm text-muted-foreground">No declared dependencies.</p>}
                </div>

                <div className="rounded-2xl border bg-card p-6">
                  <h3 className="font-semibold">Registered resources</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Resources currently attached to this module.</p>
                  <div className="mt-4 space-y-2">
                    {moduleResources.map((resource) => <div key={resource.name} className="rounded-xl border px-3 py-2 text-sm">{resource.name}</div>)}
                    {moduleResources.length === 0 && <p className="text-sm text-muted-foreground">No resources registered.</p>}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border bg-muted/20 p-5 text-sm text-muted-foreground">
                Module lifecycle transitions are governed by the backend ModuleLifecycleService. This workspace intentionally does not create a second frontend lifecycle engine.
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
