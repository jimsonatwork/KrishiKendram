import { useCallback, useMemo, useState } from 'react'
import { useLiveRefresh } from '@/hooks/use-live-refresh'
import { motion } from 'motion/react'
import { PawPrint, Plus, Archive, RefreshCw, ClipboardList, CalendarClock } from 'lucide-react'
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
  const [archivedItems, setArchivedItems] = useState<Livestock[]>([])
  const [farms, setFarms] = useState<Farm[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ species: '', name: '', tag: '', breed: '', sex: '', count: '1', status: 'ACTIVE', notes: '' })
  const [historyById, setHistoryById] = useState<Record<string, any[]>>({})
  const [historyLoadingId, setHistoryLoadingId] = useState<string | null>(null)
  const [recordsById, setRecordsById] = useState<Record<string, any[]>>({})
  const [recordsOpenById, setRecordsOpenById] = useState<Record<string, boolean>>({})
  const [recordForms, setRecordForms] = useState<Record<string, { type: string; description: string; quantity: string; unit: string; recordedAt: string; nextDueAt: string; notes: string }>>({})
  const [form, setForm] = useState({
    farmId: '', species: '', name: '', tag: '', breed: '', sex: '',
    count: '1', status: 'ACTIVE', notes: '',
  })

  const active = useMemo(
    () => items.filter((item) => item.deletedAt === undefined && item.status !== 'ARCHIVED'),
    [items],
  )

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true); setError('')
    try {
      const [livestock, archived, farmList] = await Promise.all([
        api.livestock(token), api.archivedLivestock(token), api.farms(token),
      ])
      setItems(livestock); setArchivedItems(archived); setFarms(farmList)
      if (!form.farmId && farmList[0]) setForm((v) => ({ ...v, farmId: farmList[0].id }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load livestock.')
    } finally { setLoading(false) }
  }, [token])
  useLiveRefresh(load, { enabled: Boolean(token), intervalMs: 30_000, onWindowFocus: true })

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

  function beginEdit(item: Livestock) {
    setEditingId(item.id)
    setEditForm({
      species: item.species || '', name: item.name || '', tag: item.tag || '',
      breed: item.breed || '', sex: item.sex || '', count: String(item.count || 1),
      status: item.status || 'ACTIVE', notes: item.notes || '',
    })
  }

  async function saveEdit(id: string) {
    if (!token || !editForm.species.trim()) return
    setSaving(true); setError('')
    try {
      await api.updateLivestock(id, {
        species: editForm.species.trim(), name: editForm.name.trim() || undefined,
        tag: editForm.tag.trim() || undefined, breed: editForm.breed.trim() || undefined,
        sex: editForm.sex.trim() || undefined, count: Number(editForm.count),
        status: editForm.status, notes: editForm.notes.trim() || undefined,
      }, token)
      setEditingId(null)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update livestock.')
    } finally { setSaving(false) }
  }

  async function showHistory(id: string) {
    if (!token) return
    if (historyById[id]) {
      setHistoryById((current) => { const next = { ...current }; delete next[id]; return next })
      return
    }
    setHistoryLoadingId(id)
    setError('')
    try {
      const history = await api.livestockRelationshipHistory(id, token)
      setHistoryById((current) => ({ ...current, [id]: history }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load ownership history.')
    } finally { setHistoryLoadingId(null) }
  }

  function recordFormFor(id: string) {
    return recordForms[id] || { type: 'HEALTH', description: '', quantity: '', unit: '', recordedAt: new Date().toISOString().slice(0, 16), nextDueAt: '', notes: '' }
  }

  function updateRecordForm(id: string, patch: Partial<ReturnType<typeof recordFormFor>>) {
    setRecordForms(previous => ({ ...previous, [id]: { ...recordFormFor(id), ...patch } }))
  }

  async function toggleOperationalRecords(id: string) {
    if (!token) return
    if (recordsOpenById[id]) { setRecordsOpenById(previous => ({ ...previous, [id]: false })); return }
    setHistoryLoadingId(id); setError('')
    try {
      const records = await api.livestockRecords(id, token)
      setRecordsById(previous => ({ ...previous, [id]: records }))
      setRecordsOpenById(previous => ({ ...previous, [id]: true }))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load animal health and production records.') }
    finally { setHistoryLoadingId(null) }
  }

  async function addOperationalRecord(id: string, event: React.FormEvent) {
    event.preventDefault()
    if (!token) return
    const value = recordFormFor(id)
    if (!value.description.trim()) return
    setSaving(true); setError('')
    try {
      await api.createLivestockRecord(id, { type: value.type, description: value.description.trim(), quantity: value.quantity ? Number(value.quantity) : undefined, unit: value.unit.trim() || undefined, recordedAt: value.recordedAt ? new Date(value.recordedAt).toISOString() : undefined, nextDueAt: value.nextDueAt ? new Date(value.nextDueAt).toISOString() : undefined, notes: value.notes.trim() || undefined }, token)
      setRecordForms(previous => ({ ...previous, [id]: { ...value, description: '', quantity: '', notes: '' } }))
      const records = await api.livestockRecords(id, token)
      setRecordsById(previous => ({ ...previous, [id]: records }))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save livestock record.') }
    finally { setSaving(false) }
  }

  async function archive(id: string) {
    if (!token) return
    try { await api.deleteLivestock(id, token); await load() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to archive livestock.') }
  }

  async function restore(id: string) {
    if (!token) return
    setSaving(true); setError('')
    try { await api.restoreLivestock(id, token); await load() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to restore livestock.') }
    finally { setSaving(false) }
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
              {editingId === item.id ? (
                <div className="space-y-2">
                  {(['species', 'name', 'tag', 'breed', 'sex'] as const).map((field) => (
                    <input key={field} aria-label={field} className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                      placeholder={field[0].toUpperCase() + field.slice(1)} value={editForm[field]}
                      onChange={(e) => setEditForm({ ...editForm, [field]: e.target.value })} />
                  ))}
                  <div className="grid grid-cols-2 gap-2">
                    <input aria-label="Count" className="h-9 rounded-md border bg-background px-3 text-sm" type="number" min="1" value={editForm.count} onChange={(e) => setEditForm({ ...editForm, count: e.target.value })} />
                    <select aria-label="Status" className="h-9 rounded-md border bg-background px-3 text-sm" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select>
                  </div>
                  <input aria-label="Notes" className="h-9 w-full rounded-md border bg-background px-3 text-sm" placeholder="Notes" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
                  <div className="flex gap-2"><Button size="sm" disabled={saving || !editForm.species.trim()} onClick={() => void saveEdit(item.id)}>Save</Button><Button size="sm" variant="ghost" disabled={saving} onClick={() => setEditingId(null)}>Cancel</Button></div>
                </div>
              ) : (
                <>
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
                  <div className="mt-4 flex flex-wrap gap-1">
                    <Button variant="outline" size="sm" onClick={() => beginEdit(item)}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => void showHistory(item.id)} disabled={historyLoadingId === item.id}>{historyLoadingId === item.id ? 'Loading…' : historyById[item.id] ? 'Hide history' : 'Ownership history'}</Button>
                    <Button variant="ghost" size="sm" onClick={() => void archive(item.id)}><Archive className="mr-2 h-4 w-4" />Archive</Button>
                  </div>
                </>
              )}
              {historyById[item.id] && <div className="mt-3 rounded-lg border p-3"><div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ownership history</div>{historyById[item.id].length === 0 ? <p className="text-xs text-muted-foreground">No relationship history recorded.</p> : <ul className="space-y-2">{historyById[item.id].map((entry, index) => <li key={String(entry.id || index)} className="text-xs"><div className="font-medium">{String(entry.relationshipType || entry.type || 'Relationship')} · {String(entry.userId || 'User')}</div><div className="text-muted-foreground">{entry.validFrom ? new Date(String(entry.validFrom)).toLocaleString() : 'Date unavailable'}{entry.endedAt ? ' — ended ' + new Date(String(entry.endedAt)).toLocaleString() : ' — active'}</div>{entry.reason && <div>{String(entry.reason)}</div>}</li>)}</ul>}</div>}
              <Button className="mt-2" size="sm" variant="outline" onClick={() => void toggleOperationalRecords(item.id)} disabled={historyLoadingId === item.id}><ClipboardList className="mr-2 h-4 w-4" />{historyLoadingId === item.id ? 'Loading…' : recordsOpenById[item.id] ? 'Hide health & production' : 'Health & production records'}</Button>
              {recordsOpenById[item.id] && <div className="mt-3 space-y-3 rounded-lg border p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Append-only animal record</div>
                <form onSubmit={event => void addOperationalRecord(item.id, event)} className="grid gap-2 sm:grid-cols-2">
                  <select aria-label={'Record type for ' + (item.name || item.species)} value={recordFormFor(item.id).type} onChange={e => updateRecordForm(item.id, { type: e.target.value })} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="HEALTH">Health observation</option><option value="VACCINATION">Vaccination</option><option value="TREATMENT">Treatment</option><option value="MILK_PRODUCTION">Milk production</option><option value="EGG_PRODUCTION">Egg production</option><option value="WEIGHT">Weight</option><option value="BREEDING">Breeding</option><option value="FEEDING">Feeding</option><option value="OTHER">Other</option></select>
                  <input aria-label="Record description" required maxLength={1000} value={recordFormFor(item.id).description} onChange={e => updateRecordForm(item.id, { description: e.target.value })} placeholder="What happened / treatment / yield" className="h-9 rounded-md border bg-background px-3 text-sm" />
                  <input aria-label="Record quantity" type="number" min="0.000001" step="any" value={recordFormFor(item.id).quantity} onChange={e => updateRecordForm(item.id, { quantity: e.target.value })} placeholder="Quantity (optional)" className="h-9 rounded-md border bg-background px-3 text-sm" />
                  <input aria-label="Record unit" maxLength={40} value={recordFormFor(item.id).unit} onChange={e => updateRecordForm(item.id, { unit: e.target.value })} placeholder="Unit (litre, kg, dose)" className="h-9 rounded-md border bg-background px-3 text-sm" />
                  <label className="grid gap-1 text-xs text-muted-foreground">Recorded at<input aria-label="Record date" type="datetime-local" value={recordFormFor(item.id).recordedAt} onChange={e => updateRecordForm(item.id, { recordedAt: e.target.value })} className="h-9 rounded-md border bg-background px-2 text-sm text-foreground" /></label>
                  <label className="grid gap-1 text-xs text-muted-foreground"><span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" />Next due (optional)</span><input aria-label="Next due date" type="datetime-local" value={recordFormFor(item.id).nextDueAt} onChange={e => updateRecordForm(item.id, { nextDueAt: e.target.value })} className="h-9 rounded-md border bg-background px-2 text-sm text-foreground" /></label>
                  <input aria-label="Record notes" value={recordFormFor(item.id).notes} onChange={e => updateRecordForm(item.id, { notes: e.target.value })} placeholder="Notes" className="h-9 rounded-md border bg-background px-3 text-sm sm:col-span-2" />
                  <Button size="sm" type="submit" disabled={saving || !recordFormFor(item.id).description.trim()} className="sm:col-span-2">{saving ? 'Saving…' : 'Add record'}</Button>
                </form>
                <div className="space-y-2">{(recordsById[item.id] || []).length === 0 ? <p className="text-xs text-muted-foreground">No health or production records yet.</p> : (recordsById[item.id] || []).map(record => <div key={record.id} className="border-t pt-2 text-xs"><div className="font-medium">{String(record.type).replaceAll('_', ' ')} · {record.description}</div>{record.quantity !== null && record.quantity !== undefined && <div>{record.quantity} {record.unit || ''}</div>}<div className="text-muted-foreground">{new Date(record.recordedAt).toLocaleString()}{record.nextDueAt ? ' · Follow-up ' + new Date(record.nextDueAt).toLocaleDateString() : ''}{record.creator?.name ? ' · ' + record.creator.name : ''}</div>{record.notes && <div>{record.notes}</div>}</div>)}</div>
              </div>}
            </motion.article>
          ))}
      </div>
    <section className="mt-6 space-y-3">
        <h2 className="text-lg font-semibold">Archived livestock</h2>
        {loading ? <div className="rounded-xl border p-4 text-sm text-muted-foreground">Loading archived records…</div> :
          archivedItems.length === 0 ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No archived livestock records.</div> :
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {archivedItems.map((item) => <article key={item.id} className="rounded-xl border p-4">
              <div className="font-medium">{item.name || item.species}</div>
              <div className="mt-1 text-sm text-muted-foreground">{item.species} · {item.count} head · {item.farm?.name || 'Farm unavailable'}</div>
              <Button className="mt-3" size="sm" variant="outline" disabled={saving} onClick={() => void restore(item.id)}><RefreshCw className="mr-2 h-4 w-4" />Restore</Button>
            </article>)}
          </div>}
      </section>
      </div>
  )
}