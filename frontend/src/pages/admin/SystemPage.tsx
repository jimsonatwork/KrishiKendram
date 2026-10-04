import { useEffect, useState } from 'react'
import { FolderTree, Monitor, Moon, Palette, Settings2, Sparkles, Sun, Zap, ShieldCheck, Save } from 'lucide-react'
import { useThemeStore, type ColourTheme, type ThemeMode } from '@/stores/theme.store'
import { platformRegistry, type FilesystemRegistry } from '@/lib/platform/registry'
import { useAuthStore } from '@/stores/auth.store'

const modes: Array<[ThemeMode, string, typeof Monitor]> = [
  ['system', 'System', Monitor],
  ['light', 'Light', Sun],
  ['dark', 'Dark', Moon],
]

const themes: Array<[ColourTheme, string]> = [
  ['krishi', 'Krishi'],
  ['ocean', 'Ocean'],
  ['harvest', 'Harvest'],
  ['midnight', 'Midnight'],
]

export function SystemPage() {
  const token = useAuthStore((s) => s.accessToken)
  const [filesystem, setFilesystem] = useState<FilesystemRegistry | null>(null)
  const [roles, setRoles] = useState<Awaited<ReturnType<typeof platformRegistry.superControlRoles>>>([])
  const [selectedRole, setSelectedRole] = useState('FARMER')
  const [rolePermissions, setRolePermissions] = useState<Awaited<ReturnType<typeof platformRegistry.superControlRolePermissions>>>([])
  const [savingRolePermissions, setSavingRolePermissions] = useState(false)
  const [controlOverview, setControlOverview] = useState<any>(null)
  const [credentialArtifacts, setCredentialArtifacts] = useState<Awaited<ReturnType<typeof platformRegistry.credentialArtifacts>> | null>(null)
  const [godMode, setGodMode] = useState<Awaited<ReturnType<typeof platformRegistry.godModeOverview>> | null>(null)
  const mode = useThemeStore((s) => s.mode)
  const colourTheme = useThemeStore((s) => s.colourTheme)
  const visualEffects = useThemeStore((s) => s.visualEffects)
  const setMode = useThemeStore((s) => s.setMode)
  const setColourTheme = useThemeStore((s) => s.setColourTheme)
  const setVisualEffects = useThemeStore((s) => s.setVisualEffects)

  useEffect(() => {
    if (!token) return
    void platformRegistry.godModeOverview(token).then(setGodMode).catch(() => setGodMode(null))
    void platformRegistry.filesystem(token).then(setFilesystem).catch(() => setFilesystem(null))
    void platformRegistry.credentialArtifacts(token).then(setCredentialArtifacts).catch(() => setCredentialArtifacts(null))
    void platformRegistry.superControlOverview(token).then(setControlOverview).catch(() => setControlOverview(null))
    void platformRegistry.superControlRoles(token).then((items) => {
      setRoles(items)
      if (items.length && !items.some((item) => item.role === selectedRole)) setSelectedRole(items[0].role)
    }).catch(() => setRoles([]))
  }, [token])

  useEffect(() => {
    if (!token) return
    void platformRegistry.superControlRolePermissions(token, selectedRole)
      .then(setRolePermissions)
      .catch(() => setRolePermissions([]))
  }, [token, selectedRole])

  const toggleRolePermission = (id: string) => {
    setRolePermissions((current) => current.map((permission) =>
      permission.id === id
        ? { ...permission, rolePermissions: permission.rolePermissions.length ? [] : [{ role: selectedRole }] }
        : permission,
    ))
  }

  const saveRolePermissions = async () => {
    if (!token) return
    setSavingRolePermissions(true)
    try {
      const ids = rolePermissions.filter((permission) => permission.rolePermissions.length).map((permission) => permission.id)
      await platformRegistry.setSuperControlRolePermissions(token, selectedRole, ids)
      const [updated, summary] = await Promise.all([
        platformRegistry.superControlRolePermissions(token, selectedRole),
        platformRegistry.superControlOverview(token),
      ])
      setRolePermissions(updated)
      setControlOverview(summary)
      setRoles(await platformRegistry.superControlRoles(token))
    } finally {
      setSavingRolePermissions(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border-2 border-primary/30 bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary"><ShieldCheck className="size-4" /> God Mode · System Authority</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">God Mode Control Center</h1>
            <p className="mt-1 text-sm text-muted-foreground">Canonical system truth, runtime, credentials, registry, recovery and audit state in one protected control surface.</p>
          </div>
          {godMode && <div className="rounded-xl border px-3 py-2 text-right text-xs"><div className="font-semibold text-primary">{godMode.identity.authorityTier}</div><div className="text-muted-foreground">{godMode.identity.email}</div></div>}
        </div>
        {godMode ? <>
          <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-8">
            {Object.entries({ Users: godMode.counts.users, Active: godMode.counts.activeUsers, 'Super Admins': godMode.counts.superAdmins, 'God Identities': godMode.counts.systemGods, Modules: godMode.counts.modules, Resources: godMode.counts.resources, Fields: godMode.counts.fields, Permissions: godMode.counts.permissions }).map(([label, value]) =>
              <div key={label} className="rounded-lg border p-2.5"><div className="text-[11px] text-muted-foreground">{label}</div><div className="mt-1 text-lg font-semibold">{value}</div></div>
            )}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border p-3"><div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Canonical Root</div><div className="mt-2 break-all font-mono text-xs">{godMode.root.wslPath}</div><div className="mt-1 text-xs text-primary">{godMode.root.canonical ? 'Verified canonical' : 'ROOT INVALID'}</div></div>
            <div className="rounded-xl border p-3"><div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Runtime</div><div className="mt-2 text-sm">Node {String((godMode.runtime.node as { major?: number })?.major ?? '?')} · API 3000 · UI 4000</div><div className="mt-1 text-xs text-muted-foreground">PostgreSQL · Prisma · Docker</div></div>
            <div className="rounded-xl border p-3"><div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Credential State</div><div className="mt-2 text-sm">{godMode.credential.passwordFilePresent ? 'Password artifact present' : 'Password artifact missing'}</div><div className="mt-1 text-xs text-muted-foreground">{godMode.credential.patternFiles.length} pattern artifact(s) · values hidden</div></div>
            <div className="rounded-xl border p-3"><div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recovery Guard</div><div className="mt-2 text-sm">{godMode.recovery.singletonEnforced ? 'Singleton enforced' : 'ATTENTION: duplicate God'}</div><div className="mt-1 text-xs text-muted-foreground">{godMode.recovery.protected ? 'Canonical identity protected' : 'Protection disabled'}</div></div>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border p-4"><div className="font-semibold">Environment ownership</div><div className="mt-3 space-y-2">{godMode.environmentKeys.map((item) => <div key={item.key} className="flex items-center justify-between gap-3 border-b pb-2 text-xs last:border-0 last:pb-0"><span className="font-mono">{item.key}</span><span className="text-muted-foreground">{item.secret ? 'SECRET · location only' : 'CONFIG'} · {item.owner}</span></div>)}</div></div>
            <div className="rounded-xl border p-4"><div className="font-semibold">Recent control audit</div><div className="mt-3 max-h-32 space-y-2 overflow-auto">{godMode.recentAudit.map((event) => <div key={event.id} className="border-b pb-2 text-xs last:border-0"><div className="font-medium">{event.action}</div><div className="text-muted-foreground">{event.resourceType} · {new Date(event.createdAt).toLocaleString()}</div></div>)}</div></div>
          </div>
          <div className="mt-4 rounded-xl border border-dashed p-3 text-xs text-muted-foreground">Mutation contract: <span className="font-medium text-foreground">validate → snapshot → apply → health-check → audit</span>. Secrets are never returned by this overview.</div>
        </> : <div className="mt-5 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">God Mode overview unavailable or current identity is not authorized.</div>}
      </section>

      <section className="rounded-2xl border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><ShieldCheck className="size-4 text-primary" /> Platform control</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Super Admin Control Plane</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Operational control - changes are persisted, audited and applied without editing source code.</p>
          </div>
          <button type="button" onClick={() => token && Promise.all([platformRegistry.superControlOverview(token), platformRegistry.superControlRoles(token)]).then(([summary, items]) => { setControlOverview(summary); setRoles(items) })} className="rounded-xl border px-4 py-2 text-sm hover:bg-muted">Refresh</button>
        </div>
        <div className="mt-5 grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
          {[
            ['Users', controlOverview?.overview?.users],
            ['Active', controlOverview?.overview?.activeUsers],
            ['Modules', controlOverview?.overview?.modules],
            ['Resources', controlOverview?.overview?.resources],
            ['Fields', controlOverview?.overview?.fields],
            ['Permissions', controlOverview?.overview?.permissions],
            ['Coverage', controlOverview?.overview?.permissionCoverage == null ? undefined : controlOverview.overview.permissionCoverage + '%'],
          ].map(([label, value]) => <div key={label} className="rounded-xl border p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-xl font-semibold">{value ?? '-'}</div></div>)}
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-6">
        <div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><ShieldCheck className="size-5" /></div><div><h2 className="font-semibold">Role to Permission Control</h2><p className="text-sm text-muted-foreground">Every change is audited. Select a role and control its persisted permissions.</p></div></div>
        <div className="mt-5 grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="space-y-2">
            {roles.map((item) => <button key={item.role} type="button" onClick={() => setSelectedRole(item.role)} className={`w-full rounded-xl border p-3 text-left ${selectedRole === item.role ? 'border-primary bg-primary/10' : 'hover:bg-muted'}`}>
              <div className="font-medium">{item.role}</div><div className="mt-1 text-xs text-muted-foreground">{item.userCount} users - {item.permissionCount} permissions</div>
            </button>)}
            {!roles.length && <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Roles unavailable.</div>}
          </div>
          <div>
            <div className="mb-3 flex items-center justify-between gap-3"><div className="text-sm font-medium">{selectedRole} permissions</div><button type="button" disabled={savingRolePermissions} onClick={saveRolePermissions} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"><Save className="size-4" />{savingRolePermissions ? 'Saving...' : 'Save changes'}</button></div>
            <div className="max-h-[520px] overflow-auto rounded-xl border">
              {rolePermissions.map((permission) => <label key={permission.id} className="flex items-center gap-3 border-b p-3 last:border-b-0 hover:bg-muted/40">
                <input type="checkbox" checked={permission.rolePermissions.length > 0} onChange={() => toggleRolePermission(permission.id)} />
                <div className="min-w-0 flex-1"><div className="text-sm font-medium">{permission.module} / {permission.resource || 'module'} / {permission.action}</div><div className="text-xs text-muted-foreground">scope: {permission.scope}{permission.section ? ` - section: ${permission.section}` : ''}</div></div>
              </label>)}
              {!rolePermissions.length && <div className="p-6 text-sm text-muted-foreground">No persisted permissions are available for this role.</div>}
            </div>
          </div>
        </div>
      </section>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platform control</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">System</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Workspace preferences and device-friendly visual controls. These settings are local and do not alter authorization or business data.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Palette className="size-5" /></div>
            <div><h2 className="font-semibold">Appearance</h2><p className="text-sm text-muted-foreground">Choose how KrishiKendram looks on this device.</p></div>
          </div>
          <div className="mt-6">
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Mode</div>
            <div className="grid grid-cols-3 gap-2">
              {modes.map(([value, label, Icon]) => (
                <button key={value} type="button" onClick={() => setMode(value)} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm transition ${mode === value ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'}`} aria-pressed={mode === value}><Icon className="size-4" />{label}</button>
              ))}
            </div>
          </div>
          <div className="mt-6">
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Colour theme</div>
            <div className="grid grid-cols-2 gap-2">
              {themes.map(([value, label]) => (
                <button key={value} type="button" onClick={() => setColourTheme(value)} className={`rounded-xl border px-4 py-3 text-left text-sm transition ${colourTheme === value ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'}`} aria-pressed={colourTheme === value}>
                  <div className="font-medium">{label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{value === 'krishi' ? 'Natural green workspace' : value === 'ocean' ? 'Cool blue workspace' : value === 'harvest' ? 'Warm agricultural workspace' : 'Deep high-contrast workspace'}</div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Settings2 className="size-5" /></div>
            <div><h2 className="font-semibold">Performance & accessibility</h2><p className="text-sm text-muted-foreground">Keep the visual layer appropriate for the device.</p></div>
          </div>
          <div className="mt-6 rounded-xl border bg-muted/20 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3"><Sparkles className="mt-0.5 size-5 text-primary" /><div><div className="font-medium">Visual effects</div><p className="mt-1 text-sm leading-6 text-muted-foreground">Ambient motion, glow and depth effects can be disabled. Reduced-motion preferences automatically take precedence.</p></div></div>
              <button type="button" role="switch" aria-checked={visualEffects} onClick={() => setVisualEffects(!visualEffects)} className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${visualEffects ? 'bg-primary' : 'bg-muted-foreground/30'}`} title="Toggle visual effects"><span className={`absolute top-1 size-4 rounded-full bg-white shadow-sm transition-transform ${visualEffects ? 'translate-x-6' : 'translate-x-1'}`} /></button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border p-4"><div className="flex items-center gap-2 text-sm font-medium"><Zap className="size-4 text-primary" />Effects state</div><div className="mt-2 text-sm text-muted-foreground">{visualEffects ? 'Enabled' : 'Reduced'}</div></div>
            <div className="rounded-xl border p-4"><div className="flex items-center gap-2 text-sm font-medium"><Monitor className="size-4 text-primary" />Theme mode</div><div className="mt-2 text-sm capitalize text-muted-foreground">{mode}</div></div>
          </div>
          <div className="mt-5 rounded-xl border border-dashed p-4 text-xs leading-5 text-muted-foreground">Presentation-only settings. Authorization, audit, lifecycle and business records remain governed by canonical backend contracts.</div>
        </section>
      </div>

      <section className="rounded-2xl border bg-card p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Settings2 className="size-5" /></div>
          <div><h2 className="font-semibold">Credential filename diagnostics</h2><p className="text-sm text-muted-foreground">Diagnostic .txt files use only the filename. File contents are intentionally empty.</p></div>
        </div>
        {credentialArtifacts ? (
          <>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="flex items-center justify-between gap-4 rounded-xl border p-4">
                <div><div className="font-medium">Create Pattern File</div><div className="mt-1 text-xs text-muted-foreground">Filename: {credentialArtifacts.patternFileFormat}</div></div>
                <input type="checkbox" checked={credentialArtifacts.createPatternFile} onChange={async (e) => { const next = await platformRegistry.updateCredentialArtifactSettings(token!, { createPatternFile: e.target.checked, createPasswordFile: credentialArtifacts.createPasswordFile }); setCredentialArtifacts({ ...credentialArtifacts, ...next }) }} />
              </label>
              <label className="flex items-center justify-between gap-4 rounded-xl border p-4">
                <div><div className="font-medium">Create Password File</div><div className="mt-1 text-xs text-muted-foreground">Filename: {credentialArtifacts.passwordFileFormat}</div></div>
                <input type="checkbox" checked={credentialArtifacts.createPasswordFile} onChange={async (e) => { const next = await platformRegistry.updateCredentialArtifactSettings(token!, { createPatternFile: credentialArtifacts.createPatternFile, createPasswordFile: e.target.checked }); setCredentialArtifacts({ ...credentialArtifacts, ...next }) }} />
              </label>
            </div>
            <div className="mt-4 rounded-xl border bg-muted/20 p-4">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pattern</div>
              <div className="mt-2 font-mono text-sm">{credentialArtifacts.patternDescription}</div>
              <div className="mt-1 text-xs text-muted-foreground">Example: {credentialArtifacts.patternExample}</div>
              <div className="mt-3 text-xs text-muted-foreground break-all">Location: {credentialArtifacts.artifactDirectory}</div>
            </div>
            <div className="mt-4 rounded-xl border p-4">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Current diagnostic filenames</div>
              {credentialArtifacts.files.length ? <div className="mt-2 space-y-1 font-mono text-xs">{credentialArtifacts.files.map((file) => <div key={file}>{file}</div>)}</div> : <div className="mt-2 text-sm text-muted-foreground">No diagnostic .txt files yet. They are created when the bootstrap password is created or reset.</div>}
            </div>
          </>
        ) : <div className="mt-5 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Credential diagnostics unavailable.</div>}
      </section>

      <section className="rounded-2xl border bg-card p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><FolderTree className="size-5" /></div>
          <div><h2 className="font-semibold">Filesystem Registry</h2><p className="text-sm text-muted-foreground">One canonical root controls the registered application resource paths.</p></div>
        </div>
        {filesystem ? (
          <>
            <div className="mt-5 rounded-xl border bg-muted/20 p-4 font-mono text-sm break-all">{filesystem.root}</div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(filesystem.resources).map(([name, resource]) => (
                <div key={name} className="rounded-xl border p-3">
                  <div className="font-medium">{name}</div>
                  <div className="mt-1 break-all font-mono text-xs text-muted-foreground">{resource.relativePath}</div>
                  <div className={`mt-2 text-xs ${resource.exists ? 'text-primary' : 'text-destructive'}`}>{resource.exists ? resource.kind : 'Missing'}</div>
                </div>
              ))}
            </div>
          </>
        ) : <div className="mt-5 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Filesystem Registry unavailable.</div>}
      </section>
    </div>
  )
}
