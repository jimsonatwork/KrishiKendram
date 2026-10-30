import { useCallback, useEffect, useState } from 'react'
import { Archive, BarChart3, Pencil, Plus, RefreshCw, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { MarketplaceBuyerContextNotice } from '@/components/marketplace/MarketplaceBuyerContextNotice'
import { useLiveRefresh } from '@/hooks/use-live-refresh'
import { LiveDataRefreshControl, type LiveRefreshIntervalMs } from '@/components/ui/LiveDataRefreshControl'

type RecordItem = { id: string; farmId: string; type: 'INCOME' | 'EXPENSE'; category: string; amount: number; currency: string; occurredAt: string; reference?: string | null; notes?: string | null; farm?: { id: string; name: string } }
export function FinancePage() {
  const token = localStorage.getItem('accessToken')
  const tokenPayload = (() => { try { return JSON.parse(atob((token || '').split('.')[1] || '')) } catch { return {} } })()
  const canViewFarmFinance = ['FARMER', 'ADMIN', 'SUPER_ADMIN'].includes(tokenPayload.role)
  const [records, setRecords] = useState<RecordItem[]>([])
  const [farms, setFarms] = useState<any[]>([])
  const [form, setForm] = useState({ farmId: '', type: 'EXPENSE' as 'INCOME' | 'EXPENSE', category: '', amount: '', occurredAt: new Date().toISOString().slice(0, 10), reference: '', notes: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ type: 'EXPENSE' as 'INCOME' | 'EXPENSE', category: '', amount: '', occurredAt: '', reference: '', notes: '' })
  const [busy, setBusy] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [liveRefreshEnabled, setLiveRefreshEnabled] = useState(false)
  const [liveRefreshIntervalMs, setLiveRefreshIntervalMs] = useState<LiveRefreshIntervalMs>(15_000)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const load = useCallback(async () => {
    if (!canViewFarmFinance) { setRecords([]); setFarms([]); setError(''); return }
    if (!token) { setRecords([]); setFarms([]); return }
    setLoading(true); setError('')
    try {
      const [recordList, farmList] = await Promise.all([api.financeRecords(token), api.farms(token)])
      setRecords(recordList); setFarms(farmList); setForm(previous => ({ ...previous, farmId: previous.farmId || farmList[0]?.id || '' }))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load farm finances.') }
    finally { setLoading(false) }
  }, [token, canViewFarmFinance])
  useEffect(() => { void load() }, [load])
  useLiveRefresh(load, { enabled: Boolean(token) && liveRefreshEnabled, intervalMs: liveRefreshIntervalMs })
  async function createRecord(event: React.FormEvent) {
    event.preventDefault(); if (!token || !form.farmId || !form.category.trim() || !form.amount) return
    setBusy(previous => [...previous, 'create']); setError(''); setNotice('')
    try {
      await api.createFinanceRecord({ farmId: form.farmId, type: form.type, category: form.category.trim(), amount: Number(form.amount), currency: 'INR', occurredAt: new Date(form.occurredAt).toISOString(), reference: form.reference.trim() || undefined, notes: form.notes.trim() || undefined }, token)
      setForm(previous => ({ ...previous, category: '', amount: '', reference: '', notes: '' })); setNotice('Financial record saved and audit-recorded.'); await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save financial record.') }
    finally { setBusy(previous => previous.filter(value => value !== 'create')) }
  }
  function beginEdit(item: RecordItem) { setEditingId(item.id); setEditForm({ type: item.type, category: item.category, amount: String(item.amount), occurredAt: new Date(item.occurredAt).toISOString().slice(0, 10), reference: item.reference || '', notes: item.notes || '' }) }
  async function saveEdit(id: string) {
    if (!token || !editForm.category.trim() || !editForm.amount || busy.includes(id)) return
    setBusy(previous => [...previous, id]); setError('')
    try { await api.updateFinanceRecord(id, { type: editForm.type, category: editForm.category.trim(), amount: Number(editForm.amount), occurredAt: new Date(editForm.occurredAt).toISOString(), reference: editForm.reference.trim() || undefined, notes: editForm.notes.trim() || undefined }, token); setEditingId(null); setNotice('Financial record updated.'); await load() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update financial record.') }
    finally { setBusy(previous => previous.filter(value => value !== id)) }
  }
  async function archive(id: string) {
    if (!token || busy.includes(id)) return
    setBusy(previous => [...previous, id]); setError('')
    try { await api.archiveFinanceRecord(id, token); setNotice('Financial record archived.'); await load() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to archive financial record.') }
    finally { setBusy(previous => previous.filter(value => value !== id)) }
  }
  const income = records.filter(record => record.type === 'INCOME').reduce((sum, record) => sum + record.amount, 0)
  const expense = records.filter(record => record.type === 'EXPENSE').reduce((sum, record) => sum + record.amount, 0)
  const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value)
  if (!canViewFarmFinance) return <div className="rounded-xl border bg-card p-5 sm:p-6"><h2 className="font-semibold">Farm finance is not part of this account</h2><p className="mt-2 text-sm text-muted-foreground">The farm income and expense ledger is available to farmers and authorized administrators. Use Marketplace → Finance for your buying, selling, order and settlement history.</p><a href="/app/marketplace?workspace=finance" className="mt-3 inline-flex text-sm font-medium text-primary underline">Open Marketplace Finance</a></div>
  return <div className="space-y-6 p-4 sm:p-6">
    <MarketplaceBuyerContextNotice module="finance" />
    <header className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-2xl font-semibold"><BarChart3 className="size-6" />Finance</div><p className="mt-1 text-sm text-muted-foreground">Independent finance module for domain financial records. Marketplace commercial statements remain separately linked and are not treated as settled cash.</p></div><div className="flex flex-wrap gap-2"><a href="/app/marketplace?workspace=finance" className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-muted">Marketplace commercial finance</a><LiveDataRefreshControl enabled={liveRefreshEnabled} intervalMs={liveRefreshIntervalMs} onEnabledChange={setLiveRefreshEnabled} onIntervalChange={setLiveRefreshIntervalMs} /><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 size-4" />Refresh</Button></div></header>
    {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">{error}</div>}{notice && <div role="status" className="rounded-lg border p-3 text-sm">{notice}</div>}
    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border bg-card p-4"><div className="text-sm text-muted-foreground">Total income</div><div className="mt-1 text-2xl font-semibold">{money(income)}</div></div><div className="rounded-xl border bg-card p-4"><div className="text-sm text-muted-foreground">Total expenses</div><div className="mt-1 text-2xl font-semibold">{money(expense)}</div></div><div className="rounded-xl border bg-card p-4"><div className="text-sm text-muted-foreground">Net recorded</div><div className={'mt-1 text-2xl font-semibold ' + (income - expense < 0 ? 'text-destructive' : '')}>{money(income - expense)}</div></div></div>
    <form onSubmit={createRecord} className="space-y-4 rounded-xl border bg-card p-4"><h2 className="flex items-center gap-2 font-semibold"><Plus className="size-4" />Add income or expense</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <select aria-label="Finance farm" required value={form.farmId} onChange={e => setForm({ ...form, farmId: e.target.value })} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Select farm</option>{farms.map(farm => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</select>
      <select aria-label="Finance type" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as 'INCOME' | 'EXPENSE' })} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="EXPENSE">Expense</option><option value="INCOME">Income</option></select>
      <input aria-label="Finance category" required maxLength={80} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Category (seed, sale, labour)" className="h-10 rounded-md border bg-background px-3 text-sm" />
      <input aria-label="Finance amount" required type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="Amount (INR)" className="h-10 rounded-md border bg-background px-3 text-sm" />
      <input aria-label="Finance date" required type="date" value={form.occurredAt} onChange={e => setForm({ ...form, occurredAt: e.target.value })} className="h-10 rounded-md border bg-background px-3 text-sm" />
      <input aria-label="Finance reference" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="Receipt / reference" className="h-10 rounded-md border bg-background px-3 text-sm" />
      <input aria-label="Finance notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className="h-10 rounded-md border bg-background px-3 text-sm" />
    </div><Button type="submit" disabled={busy.includes('create') || !farms.length || !form.category.trim() || !form.amount}>{busy.includes('create') ? 'Saving…' : 'Save record'}</Button></form>
    <section className="space-y-3"><h2 className="text-lg font-semibold">Financial history</h2>{records.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No financial records yet. Add an income or expense above.</div> : records.map(item => <article key={item.id} className="rounded-xl border bg-card p-4">
      {editingId === item.id ? <div className="grid gap-2 sm:grid-cols-3"><select aria-label="Edit finance type" value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value as 'INCOME' | 'EXPENSE' })} className="h-9 rounded-md border bg-background px-3 text-sm"><option value="INCOME">Income</option><option value="EXPENSE">Expense</option></select><input aria-label="Edit finance category" value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })} className="h-9 rounded-md border bg-background px-3 text-sm" /><input aria-label="Edit finance amount" type="number" min="0.01" step="0.01" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} className="h-9 rounded-md border bg-background px-3 text-sm" /><input aria-label="Edit finance date" type="date" value={editForm.occurredAt} onChange={e => setEditForm({ ...editForm, occurredAt: e.target.value })} className="h-9 rounded-md border bg-background px-3 text-sm" /><input aria-label="Edit finance reference" value={editForm.reference} onChange={e => setEditForm({ ...editForm, reference: e.target.value })} className="h-9 rounded-md border bg-background px-3 text-sm" /><input aria-label="Edit finance notes" value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} className="h-9 rounded-md border bg-background px-3 text-sm" /><div className="flex gap-2 sm:col-span-3"><Button size="sm" disabled={busy.includes(item.id)} onClick={() => void saveEdit(item.id)}><Save className="mr-1 size-4" />Save</Button><Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="mr-1 size-4" />Cancel</Button></div></div> : <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-semibold">{item.category} <span className="ml-2 rounded-full border px-2 py-0.5 text-xs">{item.type}</span></div><div className="mt-1 text-xs text-muted-foreground">{item.farm?.name || 'Farm'} · {new Date(item.occurredAt).toLocaleDateString('en-IN')}{item.reference ? ' · Ref: ' + item.reference : ''}</div>{item.notes && <p className="mt-2 text-sm text-muted-foreground">{item.notes}</p>}</div><div className="text-right"><div className={'text-xl font-semibold ' + (item.type === 'EXPENSE' ? 'text-destructive' : '')}>{item.type === 'EXPENSE' ? '−' : '+'}{money(item.amount)}</div><div className="mt-2 flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => beginEdit(item)}><Pencil className="mr-1 size-4" />Edit</Button><Button size="sm" variant="ghost" disabled={busy.includes(item.id)} onClick={() => void archive(item.id)}><Archive className="mr-1 size-4" />Archive</Button></div></div></div>}
    </article>)}</section>
  </div>
}
