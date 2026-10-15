import { useCallback, useRef, useState } from 'react'
import { useLiveRefresh } from '@/hooks/use-live-refresh'
import { Store, RefreshCw, Send, Archive, Pencil, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

type Listing = {
  id: string
  resourceType: string
  resourceId: string
  title: string
  description?: string
  quantity?: number
  unit?: string
  price?: number
  currency: string
  status: string
}

export function MarketplacePage() {
  const token = localStorage.getItem('accessToken')
  const [published, setPublished] = useState<Listing[]>([])
  const [mine, setMine] = useState<Listing[]>([])
  const [form, setForm] = useState({ resourceType: 'crop', resourceId: '', title: '', description: '', quantity: '', unit: '', price: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingCreate, setSavingCreate] = useState(false)
  const createInFlight = useRef(false)
  const [busyListingIds, setBusyListingIds] = useState<string[]>([])
  const busyListingRef = useRef(new Set<string>())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ title: '', description: '', quantity: '', unit: '', price: '', currency: 'INR' })

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const publicListings = await api.marketplaceListings()
      setPublished(publicListings)
      if (token) setMine(await api.marketplaceMine(token))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load marketplace.')
    } finally { setLoading(false) }
  }, [token])
  useLiveRefresh(load, { enabled: Boolean(token), intervalMs: 30_000, onWindowFocus: true })

  async function create(event: React.FormEvent) {
    event.preventDefault()
    if (createInFlight.current || !token || !form.resourceId.trim() || !form.title.trim()) return
    createInFlight.current = true
    setSavingCreate(true)
    setError('')
    try {
      await api.createMarketplaceListing({
        resourceType: form.resourceType, resourceId: form.resourceId.trim(),
        title: form.title.trim(), description: form.description.trim() || undefined,
        quantity: form.quantity ? Number(form.quantity) : undefined,
        unit: form.unit.trim() || undefined, price: form.price ? Number(form.price) : undefined,
      }, token)
      setForm((v) => ({ ...v, resourceId: '', title: '', description: '', quantity: '', unit: '', price: '' }))
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to create listing.') }
    finally { createInFlight.current = false; setSavingCreate(false) }
  }

  function beginEdit(item: Listing) {
    setEditingId(item.id)
    setEditForm({ title: item.title, description: item.description || '', quantity: item.quantity?.toString() || '', unit: item.unit || '', price: item.price?.toString() || '', currency: item.currency || 'INR' })
  }

  async function saveEdit(id: string) {
    if (busyListingRef.current.has(id) || !token || !editForm.title.trim()) return
    busyListingRef.current.add(id)
    setBusyListingIds(previous => [...previous, id])
    setError('')
    try {
      await api.updateMarketplaceListing(id, { title: editForm.title.trim(), description: editForm.description.trim() || undefined, quantity: editForm.quantity ? Number(editForm.quantity) : undefined, unit: editForm.unit.trim() || undefined, price: editForm.price ? Number(editForm.price) : undefined, currency: editForm.currency.trim().toUpperCase() }, token)
      setEditingId(null)
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update listing.') }
    finally {
      busyListingRef.current.delete(id)
      setBusyListingIds(previous => previous.filter(value => value !== id))
    }
  }

  async function publish(id: string) {
    if (busyListingRef.current.has(id) || !token) return
    busyListingRef.current.add(id)
    setBusyListingIds(previous => [...previous, id])
    setError('')
    try { await api.publishMarketplaceListing(id, token); await load() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to publish listing.') }
    finally {
      busyListingRef.current.delete(id)
      setBusyListingIds(previous => previous.filter(value => value !== id))
    }
  }

  async function archive(id: string) {
    if (busyListingRef.current.has(id) || !token) return
    busyListingRef.current.add(id)
    setBusyListingIds(previous => [...previous, id])
    setError('')
    try { await api.deleteMarketplaceListing(id, token); await load() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to archive listing.') }
    finally {
      busyListingRef.current.delete(id)
      setBusyListingIds(previous => previous.filter(value => value !== id))
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-2xl font-semibold"><Store className="h-6 w-6" />Marketplace</div>
          <p className="mt-1 text-sm text-muted-foreground">Publish farm-owned crops, assets, and livestock without creating a second inventory system.</p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">{error}</div>}

      {token && <form onSubmit={create} className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-4 font-medium">Create listing</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={form.resourceType} onChange={(e) => setForm({ ...form, resourceType: e.target.value })}>
            <option value="crop">Crop</option><option value="farmAsset">Farm Asset</option><option value="livestock">Livestock</option>
          </select>
          <input className="h-10 rounded-md border bg-background px-3 text-sm" placeholder="Resource ID" value={form.resourceId} onChange={(e) => setForm({ ...form, resourceId: e.target.value })} />
          <input className="h-10 rounded-md border bg-background px-3 text-sm" placeholder="Listing title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="h-10 rounded-md border bg-background px-3 text-sm" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className="h-10 rounded-md border bg-background px-3 text-sm" type="number" min="0" placeholder="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <input className="h-10 rounded-md border bg-background px-3 text-sm" placeholder="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          <input className="h-10 rounded-md border bg-background px-3 text-sm" type="number" min="0" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        </div>
        <Button className="mt-4" type="submit" disabled={savingCreate}>{savingCreate ? "Creating…" : "Create listing"}</Button>
      </form>}

      {token && mine.length > 0 && <section>
        <h2 className="mb-3 text-lg font-semibold">My listings</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {mine.map((item) => <article key={item.id} className="rounded-xl border bg-card p-4">
            {editingId === item.id ? <div className="space-y-2">
              <input className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} placeholder="Title" />
              <input className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Description" />
              <div className="grid grid-cols-2 gap-2"><input className="h-9 rounded-md border bg-background px-3 text-sm" type="number" min="0" value={editForm.quantity} onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })} placeholder="Quantity" /><input className="h-9 rounded-md border bg-background px-3 text-sm" value={editForm.unit} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })} placeholder="Unit" /></div>
              <div className="grid grid-cols-2 gap-2"><input className="h-9 rounded-md border bg-background px-3 text-sm" type="number" min="0" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} placeholder="Price" /><input className="h-9 rounded-md border bg-background px-3 text-sm" value={editForm.currency} onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })} placeholder="Currency" /></div>
              <div className="flex gap-2"><Button size="sm" disabled={busyListingIds.includes(item.id)} onClick={() => void saveEdit(item.id)}><Save className="mr-2 h-4 w-4" />Save</Button><Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="mr-2 h-4 w-4" />Cancel</Button></div>
            </div> : <>
              <div className="font-semibold">{item.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{item.resourceType} · {item.status}</div>
              {item.price !== undefined && <div className="mt-2 font-medium">{item.currency} {item.price}</div>}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => beginEdit(item)}><Pencil className="mr-2 h-4 w-4" />Edit</Button>
                {item.status === 'DRAFT' && <Button size="sm" disabled={busyListingIds.includes(item.id)} onClick={() => void publish(item.id)}><Send className="mr-2 h-4 w-4" />Publish</Button>}
                <Button size="sm" variant="ghost" disabled={busyListingIds.includes(item.id)} onClick={() => void archive(item.id)}><Archive className="mr-2 h-4 w-4" />Archive</Button>
              </div>
            </>}
          </article>)}
        </div>
      </section>}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Published listings</h2>
        {published.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">No published listings yet.</div> :
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {published.map((item) => <article key={item.id} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="font-semibold">{item.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{item.resourceType}{item.quantity !== undefined ? ` · ${item.quantity} ${item.unit || ''}` : ''}</div>
              {item.description && <p className="mt-3 text-sm">{item.description}</p>}
              {item.price !== undefined && <div className="mt-4 text-lg font-semibold">{item.currency} {item.price}</div>}
            </article>)}
          </div>}
      </section>
    </div>
  )
}