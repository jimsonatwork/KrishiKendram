import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { PawPrint, Plus, Archive, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

type Farm = { id: string; name: string }
type Livestock = {
  id: string; farmId: string; species: string; name?: string; tag?: string
  breed?: string; sex?: string; count: number; status: string
  acquiredAt?: string; notes?: string; deletedAt?: string; farm?: Farm
}

export function LivestockPage() {
  const token = localStorage.getItem('accessToken')
  const [items, setItems] = useState<Livestock[]>([])
  const [farms, setFarms] = useState<Farm[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    farmId: '', species: '', name: '', tag: '', breed: '', sex: '',
    count: '1', status: 'ACTIVE', notes: '',
  })

  const active = useMemo(
    () => items.filter((item) => item.deletedAt === undefined && item.status !== 'ARCHIVED'),
    [items],
  )

  async function load() {
    if (!token) return
    setLoading(true); setError('')
    try {
      const [livestock, farmList] = await Promise.all([api.livestock(token), api.farms(token)])
      setItems(livestock); setFarms(farmList)
      if (!form.farmId && farmList[0]) setForm((v) => ({ ...v, farmId: farmList[0].id }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load livestock.')
    } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  async function create(event: React.FormEvent) {
    event.preventDefault()
    if (!token || !form.farmId || !form.species.trim()) return
    setSaving(true); setError('')
    try {
      await api.createLivestock({
        farmId: form.farmId, species: form.species.trim(),
        name: form.name.trim() || undefined, tag: form.tag.trim() || undefined,
        breed: form.breed.trim() || undefined, sex: form.sex.trim() || undefined,
        count: Number(form.count), status: form.status,
        notes: form.notes.trim() || undefined,
      }, token)
      setForm((v) => ({ ...v, species: '', name: '', tag: '', breed: '', sex: '', count: '1', notes: '' }))
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create livestock.')
    } finally { setSaving(false) }
  }

  async function archive(id: string) {
    if (!token) return
    try { await api.deleteLivestock(id, token); await load() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to archive livestock.') }
  }

  if (!token) return <div className="p-6">Authentication required.</div>

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-2xl font-semibold"><PawPrint className="h-6 w-6" />Livestock</div>
          <p className="mt-1 text-sm text-muted-foreground">Farm-owned livestock with canonical ownership history.</p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>
      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">{error}</div>}

      <form onSubmit={create} className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2 font-medium"><Plus className="h-4 w-4" />Register livestock</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={form.farmId} onChange={(e) => setForm({ ...form, farmId: e.target.value })}>
            {farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.name}</option>)}
          </select>
          {(['species', 'name', 'tag', 'breed', 'sex'] as const).map((field) => (
            <input key={field} className="h-10 rounded-md border bg-background px-3 text-sm"
              placeholder={field[0].toUpperCase() + field.slice(1)} value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })} />
          ))}
          <input className="h-10 rounded-md border bg-background px-3 text-sm" type="number" min="1"
            placeholder="Count" value={form.count} onChange={(e) => setForm({ ...form, count: e.target.value })} />
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option>
          </select>
          <input className="h-10 rounded-md border bg-background px-3 text-sm sm:col-span-2"
            placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <Button className="mt-4" type="submit" disabled={saving || !farms.length || !form.species.trim()}>
          {saving ? 'Saving…' : 'Register livestock'}
        </Button>
      </form>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? <div className="rounded-xl border p-6 text-sm text-muted-foreground">Loading livestock…</div> :
          active.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">No active livestock records yet.</div> :
          active.map((item) => (
            <motion.article key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div><div className="font-semibold">{item.name || item.species}</div><div className="text-sm text-muted-foreground">{item.species} · {item.count} head</div></div>
                <span className="rounded-full border px-2 py-1 text-xs">{item.status}</span>
              </div>
              <dl className="mt-4 space-y-1 text-sm">
                <div><dt className="inline text-muted-foreground">Farm: </dt><dd className="inline">{item.farm?.name || '—'}</dd></div>
                {item.tag && <div><dt className="inline text-muted-foreground">Tag: </dt><dd className="inline">{item.tag}</dd></div>}
                {item.breed && <div><dt className="inline text-muted-foreground">Breed: </dt><dd className="inline">{item.breed}</dd></div>}
                {item.sex && <div><dt className="inline text-muted-foreground">Sex: </dt><dd className="inline">{item.sex}</dd></div>}
              </dl>
              <Button variant="ghost" size="sm" className="mt-4" onClick={() => void archive(item.id)}><Archive className="mr-2 h-4 w-4" />Archive</Button>
            </motion.article>
          ))}
      </div>
    </div>
  )
}