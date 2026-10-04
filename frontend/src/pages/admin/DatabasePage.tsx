import { useCallback, useEffect, useState } from 'react'
import { Database, Eye, EyeOff, RefreshCw, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { request } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'
import { useLiveRefresh } from '@/hooks/use-live-refresh'

type DbInfo = { provider:string; host:string; port:string; database:string; username:string; password:string; databaseUrl:string; sensitiveRevealed:boolean; sensitiveViewEnabled:boolean }
const auth = (token:string) => ({ headers: { Authorization: 'Bearer ' + token } })

export function DatabasePage() {
  const token = useAuthStore(s => s.accessToken)
  const [data,setData] = useState<DbInfo|null>(null)
  const [loading,setLoading] = useState(true)
  const [revealing,setRevealing] = useState(false)
  const [error,setError] = useState<string|null>(null)
  const load = useCallback(async () => {
    if (!token) return
    setLoading(true); setError(null)
    try { setData(await request<DbInfo>('/registry/database-parameters', auth(token))) }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load database parameters.') }
    finally { setLoading(false) }
  },[token])
  useEffect(() => { void load() },[load])
  useLiveRefresh(load, { enabled: Boolean(token), intervalMs: 30000 })
  const reveal = async () => {
    if (!token) return
    setRevealing(true); setError(null)
    try { setData(await request<DbInfo>('/registry/database-parameters/reveal', auth(token))) }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to reveal sensitive information.') }
    finally { setRevealing(false) }
  }
  const mask = () => data && setData({...data,password:'••••••••••••',databaseUrl:'••••••••••••',sensitiveRevealed:false})
  const Field = ({label,value,sensitive=false}:{label:string,value:string,sensitive?:boolean}) => (
    <div className="rounded-xl border p-4"><div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div><div className="mt-2 overflow-x-auto font-mono text-sm whitespace-nowrap">{value || (sensitive ? 'Not configured' : '—')}</div></div>
  )
  return <div className="space-y-6">
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platform control</div><h1 className="mt-1 text-3xl font-semibold tracking-tight">Database Parameters</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Runtime connection information. Sensitive values remain masked until explicitly unmasked.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={loading?'size-4 animate-spin':'size-4'}/>Refresh</Button></div>
    {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}
    <section className="rounded-2xl border bg-card p-6"><div className="flex items-center gap-3"><Database className="size-5 text-primary"/><div><h2 className="font-semibold">Connection</h2><p className="text-sm text-muted-foreground">Backend-authoritative runtime configuration.</p></div></div><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><Field label="Provider" value={loading?'Loading…':data?.provider||''}/><Field label="Host" value={data?.host||''}/><Field label="Port" value={data?.port||''}/><Field label="Database" value={data?.database||''}/><Field label="Username" value={data?.username||''}/></div></section>
    <section className="rounded-2xl border bg-card p-6"><div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-5 text-primary"/><div><h2 className="font-semibold">Sensitive connection values</h2><p className="mt-1 text-sm text-muted-foreground">Password and raw connection string are masked by default. Revealing is Registry-controlled and audited.</p></div></div>{data?.sensitiveRevealed?<Button variant="outline" onClick={mask}><EyeOff className="size-4"/>Mask</Button>:<Button onClick={() => void reveal()} disabled={revealing || data?.sensitiveViewEnabled===false}><Eye className="size-4"/>{revealing?'Unmasking…':'Unmask'}</Button>}</div><div className="mt-6 grid gap-4"><Field label="Database password" value={data?.password||'••••••••••••'} sensitive/><Field label="Raw connection URL" value={data?.databaseUrl||'••••••••••••'} sensitive/></div></section>
  </div>
}
