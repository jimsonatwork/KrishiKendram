import { useEffect, useState } from 'react'
import { RefreshCw, Users, Boxes } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { request } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'

type UserAccess = { user:{id:string;name:string;email:string|null;role:string;status:string;isVerified:boolean}; accessModel:string; role:string }
type ModuleAccess = { module:string; name:string; dependencies:string[]; access:{role:string;permissions:{resource:string|null;action:string;scope:string}[]}[] }

export function AccessPage() {
  const token=useAuthStore(s=>s.accessToken)
  const [users,setUsers]=useState<UserAccess[]>([])
  const [modules,setModules]=useState<ModuleAccess[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string|null>(null)
  const load=async()=>{ if(!token)return; setLoading(true);setError(null); try { const [u,m]=await Promise.all([request<UserAccess[]>('/admin/super-control/access/users',{headers:{Authorization:'Bearer '+token}}),request<ModuleAccess[]>('/admin/super-control/access/modules',{headers:{Authorization:'Bearer '+token}})]);setUsers(u);setModules(m) } catch(e){setError(e instanceof Error?e.message:'Unable to load access control.')} finally{setLoading(false)} }
  useEffect(()=>{void load()},[token])
  return <div className="space-y-6">
    <div className="flex items-end justify-between gap-4"><div><div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Authorization control</div><h1 className="mt-1 text-3xl font-semibold tracking-tight">Per-user / Per-module Access</h1><p className="mt-2 text-sm text-muted-foreground">Read-only view of effective role-based access. Changes remain controlled through the canonical permission workflows.</p></div><Button variant="outline" onClick={()=>void load()} disabled={loading}><RefreshCw className={loading?'size-4 animate-spin':'size-4'}/>Refresh</Button></div>
    {error&&<div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}
    <section className="rounded-2xl border bg-card p-5"><div className="flex items-center gap-2"><Users className="size-4 text-primary"/><h2 className="font-semibold">User access</h2></div><div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead className="border-b text-left text-xs text-muted-foreground"><tr><th className="pb-3">User</th><th>Role</th><th>Status</th><th>Model</th></tr></thead><tbody className="divide-y">{users.map(x=><tr key={x.user.id}><td className="py-3"><div className="font-medium">{x.user.name}</div><div className="text-xs text-muted-foreground">{x.user.email||'—'}</div></td><td>{x.role}</td><td>{x.user.status}</td><td>{x.accessModel}</td></tr>)}</tbody></table>{!loading&&!users.length&&<div className="py-10 text-center text-sm text-muted-foreground">No users.</div>}</div></section>
    <section className="rounded-2xl border bg-card p-5"><div className="flex items-center gap-2"><Boxes className="size-4 text-primary"/><h2 className="font-semibold">Module access</h2></div><div className="mt-4 grid gap-3 md:grid-cols-2">{modules.map(m=><div key={m.module} className="rounded-xl border p-4"><div className="font-medium">{m.name}</div><div className="mt-1 text-xs text-muted-foreground">{m.module} · {m.dependencies.length} dependencies</div><div className="mt-3 space-y-2">{m.access.map(a=><div key={a.role} className="flex justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2 text-xs"><span>{a.role}</span><span>{a.permissions.length} permissions</span></div>)}</div></div>)}</div></section>
  </div>
}
