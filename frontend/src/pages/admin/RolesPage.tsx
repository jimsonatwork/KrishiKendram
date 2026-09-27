import { useEffect, useMemo, useState } from 'react'
import { Search, Shield, UsersRound } from 'lucide-react'

import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'

type PermissionRow = {
  id: string
  module: string
  resource: string | null
  action: string
  scope: string
  rolePermissions: Array<{ role: string }>
}

function roleRows(permissions: PermissionRow[]) {
  const roles = new Map<string, { permissions: number; resources: Set<string>; modules: Set<string> }>()
  for (const permission of permissions) {
    for (const grant of permission.rolePermissions ?? []) {
      const current = roles.get(grant.role) ?? { permissions: 0, resources: new Set(), modules: new Set() }
      current.permissions += 1
      if (permission.resource) current.resources.add(permission.resource)
      current.modules.add(permission.module)
      roles.set(grant.role, current)
    }
  }
  return [...roles.entries()].map(([role, value]) => ({ role, ...value }))
}

export function RolesPage() {
  const token = useAuthStore((state) => state.accessToken)
  const [permissions, setPermissions] = useState<PermissionRow[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  useEffect(() => {
    if (!token) return
    api.platformPermissions(token)
      .then((permissionData) => {
        setPermissions(permissionData as PermissionRow[])
        setSelected((current) => current ?? permissionData[0]?.rolePermissions?.[0]?.role ?? null)
      })
      .catch(() => {
        setPermissions([])
      })
  }, [token])

  const rows = useMemo(() => roleRows(permissions), [permissions])
  const filtered = rows.filter((row) => row.role.toLowerCase().includes(query.toLowerCase()))
  const selectedRole = filtered.find((row) => row.role === selected) ?? rows.find((row) => row.role === selected) ?? null
  const selectedPermissions = permissions.filter((permission) =>
    permission.rolePermissions?.some((grant) => grant.role === selected),
  )

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm">
        <div className="pointer-events-none absolute -right-20 -top-20 size-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Platform control</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Roles</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Role coverage derived from the canonical backend permission matrix. This surface is intentionally administrative and does not create a second authorization engine.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border bg-background/70 px-3 py-2 text-xs">
            <Shield className="size-4 text-primary" />
            Backend-authoritative
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <section className="rounded-2xl border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <UsersRound className="size-4 text-primary" />
            <h2 className="font-semibold">Role coverage</h2>
          </div>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter roles…" className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="space-y-1">
            {filtered.map((row) => (
              <button key={row.role} onClick={() => setSelected(row.role)} className={`w-full rounded-xl px-3 py-2 text-left text-sm transition-colors ${selected === row.role ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}>
                <div className="font-medium">{row.role}</div>
                <div className="text-xs text-muted-foreground">{row.permissions} permissions · {row.resources.size} resources</div>
              </button>
            ))}
            {filtered.length === 0 && <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No role coverage found.</div>}
          </div>
        </section>
        <section className="space-y-6">
          {!selectedRole ? (
            <div className="flex min-h-72 items-center justify-center rounded-2xl border bg-card text-sm text-muted-foreground">
              No role permission data is available.
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ['Permissions', selectedRole.permissions],
                  ['Resources', selectedRole.resources.size],
                  ['Modules', selectedRole.modules.size],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border bg-card p-5">
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="mt-2 text-2xl font-semibold">{value}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">Registry / authorization context</div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border bg-card p-5">
                <div className="mb-4">
                  <h2 className="font-semibold">{selectedRole.role} permission coverage</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Persisted role assignments currently visible through the protected Permission Administration API.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                      <tr><th className="px-3 py-3">Module</th><th className="px-3 py-3">Resource</th><th className="px-3 py-3">Action</th><th className="px-3 py-3">Scope</th></tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedPermissions.map((permission) => (
                        <tr key={permission.id} className="transition-colors hover:bg-muted/40">
                          <td className="px-3 py-3">{permission.module}</td>
                          <td className="px-3 py-3 font-mono text-xs">{permission.resource ?? '—'}</td>
                          <td className="px-3 py-3 font-medium">{permission.action}</td>
                          <td className="px-3 py-3">{permission.scope}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
