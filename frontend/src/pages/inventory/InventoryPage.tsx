import { useCallback, useState } from 'react'
import { AlertTriangle, Boxes, History, Pencil, Plus, RefreshCw, Save, TrendingDown, TrendingUp, Wrench, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useLiveRefresh } from '@/hooks/use-live-refresh'

type InventoryItem = { id: string; farmId: string; name: string; category: string; unit: string; quantityOnHand: number; reorderLevel: number; supplier?: string | null; notes?: string | null; farm?: { id: string; name: string } }
const categories = ['SEED', 'FERTILIZER', 'PESTICIDE', 'FEED', 'FUEL', 'EQUIPMENT', 'OTHER']
type Movement = { type: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT'; quantity: string; unitCost: string; notes: string }

export function InventoryPage() {
  const token = localStorage.getItem('accessToken')
  const [items, setItems] = useState<InventoryItem[]>([])
  const [farms, setFarms] = useState<any[]>([])
  const [form, setForm] = useState({ farmId: '', name: '', category: 'SEED', unit: 'kg', initialQuantity: '0', reorderLevel: '0', supplier: '', notes: '' })
  const [transactions, setTransactions] = useState<Record<string, any[]>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', category: 'OTHER', unit: '', reorderLevel: '0', supplier: '', notes: '' })
  const [movement, setMovement] = useState<Record<string, Movement>>({})
  const [busy, setBusy] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    if (!token) { setItems([]); setFarms([]); return }
    setLoading(true); setError('')
    try {
      const [inventory, farmList] = await Promise.all([api.inventoryItems(token), api.farms(token)])
      setItems(inventory); setFarms(farmList)
      setForm(previous => ({ ...previous, farmId: previous.farmId || farmList[0]?.id || '' }))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load inventory.') }
    finally { setLoading(false) }
  }, [token])
  useLiveRefresh(load, { enabled: Boolean(token), intervalMs: 30_000, onWindowFocus: true })

  async function createItem(event: React.FormEvent) {
    event.preventDefault()
    if (!token || !form.farmId || !form.name.trim()) return
    setBusy(previous => [...previous, 'create']); setError(''); setNotice('')
    try {
      await api.createInventoryItem({ farmId: form.farmId, name: form.name.trim(), category: form.category, unit: form.unit.trim(), initialQuantity: Number(form.initialQuantity || 0), reorderLevel: Number(form.reorderLevel || 0), supplier: form.supplier.trim() || undefined, notes: form.notes.trim() || undefined }, token)
      setForm(previous => ({ ...previous, name: '', initialQuantity: '0', reorderLevel: '0', supplier: '', notes: '' }))
      setNotice('Inventory item saved. Opening stock is recorded in the ledger.'); await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to create inventory item.') }
    finally { setBusy(previous => previous.filter(value => value !== 'create')) }
  }

  function movementFor(item: InventoryItem): Movement { return movement[item.id] || { type: 'STOCK_IN', quantity: '1', unitCost: '', notes: '' } }
  function updateMovement(item: InventoryItem, patch: Partial<Movement>) { setMovement(previous => ({ ...previous, [item.id]: { ...movementFor(item), ...patch } })) }

  async function recordStock(item: InventoryItem) {
    if (!token || busy.includes(item.id)) return
    const value = movementFor(item); const quantity = Number(value.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0) { setError('Enter a quantity greater than zero.'); return }
    setBusy(previous => [...previous, item.id]); setError(''); setNotice('')
    try {
      await api.recordInventoryTransaction(item.id, { type: value.type, quantity, unitCost: value.unitCost ? Number(value.unitCost) : undefined, notes: value.notes.trim() || undefined }, token)
      setNotice('Stock ledger updated.'); await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to record stock movement.') }
    finally { setBusy(previous => previous.filter(id => id !== item.id)) }
  }

  async function toggleHistory(item: InventoryItem) {
    if (!token) return
    if (transactions[item.id]) { setTransactions(previous => { const next = { ...previous }; delete next[item.id]; return next }); return }
    try { const rows = await api.inventoryHistory(item.id, token); setTransactions(previous => ({ ...previous, [item.id]: rows })) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load inventory history.') }
  }

  function beginEdit(item: InventoryItem) {
    setEditingId(item.id)
    setEditForm({ name: item.name, category: item.category, unit: item.unit, reorderLevel: String(item.reorderLevel), supplier: item.supplier || '', notes: item.notes || '' })
  }

  async function saveEdit(item: InventoryItem) {
    if (!token || !editForm.name.trim() || !editForm.unit.trim() || busy.includes(item.id)) return
    setBusy(previous => [...previous, item.id]); setError(''); setNotice('')
    try {
      await api.updateInventoryItem(item.id, { name: editForm.name.trim(), category: editForm.category, unit: editForm.unit.trim(), reorderLevel: Number(editForm.reorderLevel || 0), supplier: editForm.supplier.trim() || undefined, notes: editForm.notes.trim() || undefined }, token)
      setEditingId(null); setNotice('Inventory item details updated.'); await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update inventory item.') }
    finally { setBusy(previous => previous.filter(id => id !== item.id)) }
  }

  async function archive(item: InventoryItem) {
    if (!token || busy.includes(item.id)) return
    setBusy(previous => [...previous, item.id]); setError('')
    try { await api.archiveInventoryItem(item.id, token); setNotice('Zero-stock inventory item archived.'); await load() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to archive item.') }
    finally { setBusy(previous => previous.filter(id => id !== item.id)) }
  }

  const lowStock = items.filter(item => item.quantityOnHand <= item.reorderLevel)
  return <div className="space-y-6 p-4 sm:p-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-2xl font-semibold"><Boxes className="size-6" />Inventory</div><p className="mt-1 text-sm text-muted-foreground">Track farm supplies, stock in/out, reorder levels and a permanent movement history.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 size-4" />Refresh</Button></header>
    {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">{error}</div>}
    {notice && <div role="status" className="rounded-lg border p-3 text-sm">{notice}</div>}
    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border bg-card p-4"><div className="text-sm text-muted-foreground">Inventory items</div><div className="mt-1 text-2xl font-semibold">{items.length}</div></div><div className="rounded-xl border bg-card p-4"><div className="text-sm text-muted-foreground">Low / reorder stock</div><div className="mt-1 flex items-center gap-2 text-2xl font-semibold"><AlertTriangle className="size-5" />{lowStock.length}</div></div><div className="rounded-xl border bg-card p-4"><div className="text-sm text-muted-foreground">Farms available</div><div className="mt-1 text-2xl font-semibold">{farms.length}</div></div></div>
    <form onSubmit={createItem} className="space-y-4 rounded-xl border bg-card p-4"><h2 className="flex items-center gap-2 font-semibold"><Plus className="size-4" />Add inventory item</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <select aria-label="Farm" required value={form.farmId} onChange={e => setForm({ ...form, farmId: e.target.value })} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Select farm</option>{farms.map(farm => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</select>
        <input aria-label="Item name" required maxLength={200} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Item name (e.g. Paddy seed)" className="h-10 rounded-md border bg-background px-3 text-sm" />
        <select aria-label="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="h-10 rounded-md border bg-background px-3 text-sm">{categories.map(category => <option key={category} value={category}>{category.replace('_', ' ')}</option>)}</select>
        <input aria-label="Unit" required maxLength={40} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="Unit (kg, litre, bag)" className="h-10 rounded-md border bg-background px-3 text-sm" />
        <input aria-label="Opening quantity" type="number" min="0" step="any" value={form.initialQuantity} onChange={e => setForm({ ...form, initialQuantity: e.target.value })} placeholder="Opening quantity" className="h-10 rounded-md border bg-background px-3 text-sm" />
        <input aria-label="Reorder level" type="number" min="0" step="any" value={form.reorderLevel} onChange={e => setForm({ ...form, reorderLevel: e.target.value })} placeholder="Reorder level" className="h-10 rounded-md border bg-background px-3 text-sm" />
        <input aria-label="Supplier" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} placeholder="Supplier (optional)" className="h-10 rounded-md border bg-background px-3 text-sm" />
        <input aria-label="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notes (optional)" className="h-10 rounded-md border bg-background px-3 text-sm" />
      </div><Button type="submit" disabled={busy.includes('create') || !farms.length || !form.name.trim()}>{busy.includes('create') ? 'Saving…' : 'Save inventory item'}</Button>
    </form>
    <section className="space-y-3"><h2 className="text-lg font-semibold">Stock ledger</h2>
      {items.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No inventory items yet. Add seeds, fertilizer, feed or other farm supplies above.</div> : items.map(item => <article key={item.id} className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-semibold">{item.name}</div><div className="mt-1 text-xs text-muted-foreground">{item.farm?.name || 'Farm'} · {item.category} · {item.unit}{item.supplier ? ' · ' + item.supplier : ''}</div></div><div className="text-right"><div className="text-xl font-semibold tabular-nums">{item.quantityOnHand} {item.unit}</div><div className={'text-xs ' + (item.quantityOnHand <= item.reorderLevel ? 'text-destructive' : 'text-muted-foreground')}>{item.quantityOnHand <= item.reorderLevel ? 'Reorder needed' : 'Stock available'} · alert at {item.reorderLevel}</div></div></div>
        {editingId === item.id ? <div className="grid gap-2 rounded-lg border bg-muted/20 p-3 sm:grid-cols-3">
          <input aria-label="Edit item name" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="h-9 rounded-md border bg-background px-3 text-sm" />
          <select aria-label="Edit item category" value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })} className="h-9 rounded-md border bg-background px-3 text-sm">{categories.map(category => <option key={category} value={category}>{category}</option>)}</select>
          <input aria-label="Edit item unit" value={editForm.unit} onChange={e => setEditForm({ ...editForm, unit: e.target.value })} className="h-9 rounded-md border bg-background px-3 text-sm" />
          <input aria-label="Edit reorder level" type="number" min="0" step="any" value={editForm.reorderLevel} onChange={e => setEditForm({ ...editForm, reorderLevel: e.target.value })} className="h-9 rounded-md border bg-background px-3 text-sm" placeholder="Reorder level" />
          <input aria-label="Edit supplier" value={editForm.supplier} onChange={e => setEditForm({ ...editForm, supplier: e.target.value })} className="h-9 rounded-md border bg-background px-3 text-sm" placeholder="Supplier" />
          <input aria-label="Edit item notes" value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} className="h-9 rounded-md border bg-background px-3 text-sm" placeholder="Notes" />
          <div className="flex gap-2 sm:col-span-3"><Button size="sm" disabled={busy.includes(item.id)} onClick={() => void saveEdit(item)}><Save className="mr-1 size-4" />Save details</Button><Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="mr-1 size-4" />Cancel</Button></div>
        </div> : <Button size="sm" variant="outline" onClick={() => beginEdit(item)}><Pencil className="mr-1 size-4" />Edit details</Button>}
        <div className="grid gap-2 sm:grid-cols-[150px_1fr_1fr_auto]"><select aria-label={'Movement type for ' + item.name} value={movementFor(item).type} onChange={e => updateMovement(item, { type: e.target.value as Movement['type'] })} className="h-9 rounded-md border bg-background px-2 text-sm"><option value="STOCK_IN">Stock in</option><option value="STOCK_OUT">Stock out</option><option value="ADJUSTMENT">Set actual stock</option></select><input aria-label={'Movement quantity for ' + item.name} type="number" min="0.000001" step="any" value={movementFor(item).quantity} onChange={e => updateMovement(item, { quantity: e.target.value })} placeholder="Quantity" className="h-9 rounded-md border bg-background px-3 text-sm" /><input aria-label={'Movement note for ' + item.name} value={movementFor(item).notes} onChange={e => updateMovement(item, { notes: e.target.value })} placeholder="Reason / note" className="h-9 rounded-md border bg-background px-3 text-sm" /><Button size="sm" disabled={busy.includes(item.id)} onClick={() => void recordStock(item)}>{movementFor(item).type === 'STOCK_IN' ? <TrendingUp className="mr-1 size-4" /> : movementFor(item).type === 'STOCK_OUT' ? <TrendingDown className="mr-1 size-4" /> : <Wrench className="mr-1 size-4" />}{busy.includes(item.id) ? 'Saving…' : 'Record'}</Button></div>
        <div className="flex flex-wrap items-center gap-2"><Button size="sm" variant="outline" onClick={() => void toggleHistory(item)}><History className="mr-1 size-4" />{transactions[item.id] ? 'Hide history' : 'View history'}</Button><Button size="sm" variant="ghost" disabled={busy.includes(item.id) || item.quantityOnHand > 0} onClick={() => void archive(item)}>Archive zero-stock item</Button></div>
        {transactions[item.id] && <div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="p-2">Time</th><th className="p-2">Action</th><th className="p-2">Change</th><th className="p-2">Before → after</th><th className="p-2">Actor</th></tr></thead><tbody>{transactions[item.id].map(row => <tr key={row.id} className="border-t"><td className="p-2">{new Date(row.createdAt).toLocaleString()}</td><td className="p-2">{row.type}</td><td className="p-2">{row.quantity} {item.unit}</td><td className="p-2">{row.quantityBefore} → {row.quantityAfter}</td><td className="p-2">{row.actor?.name || 'User'}</td></tr>)}</tbody></table></div>}
      </article>)}
    </section>
  </div>
}
