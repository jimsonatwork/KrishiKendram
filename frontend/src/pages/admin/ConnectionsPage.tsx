import { useCallback, useEffect, useState } from 'react'
import { Cable, Database, KeyRound, RefreshCw, Server, Route, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { request } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'

type Connection = { id:string; name:string; type:string; status:string; configuration?: Record<string, unknown>; basePath?:string; modules?:number; resources?:number; artifactDirectory?:string; files?:string[] }
type ConnectionResponse = { connections: Connection[]; routes: string[] }

export function ConnectionsPage() {
  const token = useAuthStore(s => s.accessToken)
  const [data,setData] = useState<ConnectionResponse|null>(null)
  const [loading,setLoading] = useState(true)
  const [reveal,setReveal] = useState(false)
  const [error,setError] = useState<string|null>(null)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true); setError(null)
    try {
      setData(await request<ConnectionResponse>('/admin/super-control/connections?reveal=' + reveal, { headers:{ Authorization:'Bearer ' + token } }))
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load infrastructure connections.') }
    finally { setLoading(false) }
  }, [token,reveal])

  useEffect(() => { void load() }, [load])

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div><div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platform infrastructure</div><h1 className="mt-1 text-3xl font-semibold tracking-tight">Infrastructure & Connections</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Super Admin control surface for databases, services, routes, credential artifacts and runtime state.</p></div>
      <div className="flex gap-2"><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading?'size-4 animate-spin':'size-4'}/>Refresh</Button><Button variant="outline" onClick={() => setReveal(v => !v)}><KeyRound className="size-4"/>{reveal?'Hide secrets':'Reveal secrets'}</Button></div>
    </div>
    {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {(data?.connections ?? []).map(c => <section key={c.id} className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{c.type==='DATABASE'?<Database className="size-5"/>:c.type==='CREDENTIALS'?<KeyRound className="size-5"/>:c.type==='RUNTIME'?<Server className="size-5"/>:<Cable className="size-5"/>}</div><div><h2 className="font-semibold">{c.name}</h2><div className="text-xs text-muted-foreground">{c.type}</div></div></div>
        <div className="mt-5 flex items-center gap-2 text-sm"><CheckCircle2 className="size-4 text-emerald-500"/>{c.status}</div>
        {c.configuration && <div className="mt-4 space-y-2 text-xs">{Object.entries(c.configuration).filter(([k])=>k!=='password'&&k!=='databaseUrl'||reveal).map(([k,v])=><div key={k} className="flex justify-between gap-3"><span className="text-muted-foreground">{k}</span><span className="max-w-[65%] break-all text-right font-mono">{String(v)}</span></div>)}</div>}
        {c.artifactDirectory && <div className="mt-4 break-all text-xs text-muted-foreground">Artifacts: {c.artifactDirectory}</div>}
        {c.files?.length ? <div className="mt-2 text-xs font-mono">{c.files.join(', ')}</div> : null}
      </section>)}
    </div>
    <section className="rounded-2xl border bg-card p-5"><div className="flex items-center gap-2"><Route className="size-4 text-primary"/><h2 className="font-semibold">Registered control routes</h2></div><div className="mt-4 grid gap-2 md:grid-cols-2">{(data?.routes ?? []).map(route=><div key={route} className="rounded-xl border px-4 py-3 font-mono text-xs">{route}</div>)}</div></section>
  </div>
}
