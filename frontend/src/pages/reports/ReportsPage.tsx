import { useCallback, useMemo, useState } from 'react'
import { Download, FileText, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useLiveRefresh } from '@/hooks/use-live-refresh'

type Farm = { id: string; name: string; area?: number | null; unit?: string | null }
type ReportRecord = { id: string; farmId: string; type: string; category?: string; amount?: number; occurredAt?: string; quantityOnHand?: number; reorderLevel?: number; name?: string; status?: string }
const csvCell = (value: unknown) => '"' + String(value ?? '').replace(/"/g, '""') + '"'

export function ReportsPage() {
  const token = localStorage.getItem('accessToken')
  const [farms, setFarms] = useState<Farm[]>([])
  const [crops, setCrops] = useState<ReportRecord[]>([])
  const [livestock, setLivestock] = useState<ReportRecord[]>([])
  const [inventory, setInventory] = useState<ReportRecord[]>([])
  const [finance, setFinance] = useState<ReportRecord[]>([])
  const [listings, setListings] = useState<ReportRecord[]>([])
  const [farmFilter, setFarmFilter] = useState('ALL')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true); setError('')
    const results = await Promise.allSettled([api.farms(token), api.crops(token), api.livestock(token), api.inventoryItems(token), api.financeRecords(token), api.marketplaceListings()])
    const setters = [setFarms, setCrops, setLivestock, setInventory, setFinance, setListings] as const
    let failures = 0
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') setters[index](result.value as never)
      else failures++
    })
    if (failures) setError(String(failures) + ' report source(s) could not be loaded. Available sections are still shown; refresh to retry.')
    setLoading(false)
  }, [token])
  useLiveRefresh(load, { enabled: Boolean(token), intervalMs: 60_000, onWindowFocus: true })

  const visibleFarms = useMemo(() => farmFilter === 'ALL' ? farms : farms.filter(farm => farm.id === farmFilter), [farms, farmFilter])
  const withinDates = (record: ReportRecord) => {
    if (!record.occurredAt) return true
    const date = new Date(record.occurredAt).toISOString().slice(0, 10)
    return (!fromDate || date >= fromDate) && (!toDate || date <= toDate)
  }
  const visibleFinance = finance.filter(record => (farmFilter === 'ALL' || record.farmId === farmFilter) && withinDates(record))
  const income = visibleFinance.filter(record => record.type === 'INCOME').reduce((sum, record) => sum + Number(record.amount || 0), 0)
  const expense = visibleFinance.filter(record => record.type === 'EXPENSE').reduce((sum, record) => sum + Number(record.amount || 0), 0)
  const summary = visibleFarms.map(farm => {
    const farmCrops = crops.filter(item => item.farmId === farm.id)
    const farmAnimals = livestock.filter(item => item.farmId === farm.id)
    const farmInventory = inventory.filter(item => item.farmId === farm.id)
    const farmFinance = visibleFinance.filter(item => item.farmId === farm.id)
    const farmIncome = farmFinance.filter(item => item.type === 'INCOME').reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const farmExpense = farmFinance.filter(item => item.type === 'EXPENSE').reduce((sum, item) => sum + Number(item.amount || 0), 0)
    return { farm, crops: farmCrops.length, livestock: farmAnimals.length, inventory: farmInventory.length, lowStock: farmInventory.filter(item => Number(item.quantityOnHand || 0) <= Number(item.reorderLevel || 0)).length, income: farmIncome, expense: farmExpense, net: farmIncome - farmExpense }
  })
  const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value)

  function exportCsv() {
    const rows = [['Farm', 'Farm area', 'Area unit', 'Crop records', 'Livestock records', 'Inventory items', 'Low stock items', 'Income INR', 'Expense INR', 'Net INR'], ...summary.map(row => [row.farm.name, row.farm.area ?? '', row.farm.unit ?? '', row.crops, row.livestock, row.inventory, row.lowStock, row.income.toFixed(2), row.expense.toFixed(2), row.net.toFixed(2)])]
    rows.push([], ['FINANCIAL DETAIL', 'Type', 'Category', 'Amount INR', 'Date', 'Reference', 'Notes'])
    for (const item of visibleFinance) rows.push([farms.find(farm => farm.id === item.farmId)?.name || item.farmId, item.type, item.category || '', Number(item.amount || 0).toFixed(2), item.occurredAt || '', (item as any).reference || '', (item as any).notes || ''])
    const blob = new Blob(['\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'krishikendram-farm-report.csv'; link.click(); URL.revokeObjectURL(url)
  }

  return <div className="space-y-6 p-4 sm:p-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-2xl font-semibold"><FileText className="size-6" />Farm Reports</div><p className="mt-1 text-sm text-muted-foreground">One operational overview assembled from your authorized farm modules. Export the filtered summary to CSV.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 size-4" />Refresh</Button><Button onClick={exportCsv} disabled={!summary.length}><Download className="mr-2 size-4" />Export CSV</Button></div></header>
    {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">{error}</div>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-xl border bg-card p-4"><div className="text-sm text-muted-foreground">Farms</div><div className="mt-1 text-2xl font-semibold">{farms.length}</div></div><div className="rounded-xl border bg-card p-4"><div className="text-sm text-muted-foreground">Crop records</div><div className="mt-1 text-2xl font-semibold">{crops.length}</div></div><div className="rounded-xl border bg-card p-4"><div className="text-sm text-muted-foreground">Inventory alerts</div><div className="mt-1 text-2xl font-semibold">{inventory.filter(item => Number(item.quantityOnHand || 0) <= Number(item.reorderLevel || 0)).length}</div></div><div className="rounded-xl border bg-card p-4"><div className="text-sm text-muted-foreground">Published listings</div><div className="mt-1 text-2xl font-semibold">{listings.length}</div></div></div>
    <section className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4"><label className="grid gap-1 text-sm"><span className="text-muted-foreground">Farm</span><select aria-label="Report farm filter" value={farmFilter} onChange={e => setFarmFilter(e.target.value)} className="h-9 min-w-48 rounded-md border bg-background px-3"><option value="ALL">All my farms</option>{farms.map(farm => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</select></label><label className="grid gap-1 text-sm"><span className="text-muted-foreground">Finance from</span><input aria-label="Finance start date" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="h-9 rounded-md border bg-background px-3" /></label><label className="grid gap-1 text-sm"><span className="text-muted-foreground">Finance to</span><input aria-label="Finance end date" type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="h-9 rounded-md border bg-background px-3" /></label></section>
    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border bg-card p-4"><div className="text-sm text-muted-foreground">Recorded income</div><div className="mt-1 text-xl font-semibold">{money(income)}</div></div><div className="rounded-xl border bg-card p-4"><div className="text-sm text-muted-foreground">Recorded expenses</div><div className="mt-1 text-xl font-semibold">{money(expense)}</div></div><div className="rounded-xl border bg-card p-4"><div className="text-sm text-muted-foreground">Net recorded</div><div className={'mt-1 text-xl font-semibold ' + (income - expense < 0 ? 'text-destructive' : '')}>{money(income - expense)}</div></div></div>
    <section className="space-y-3"><h2 className="text-lg font-semibold">Farm operational summary</h2><div className="overflow-x-auto rounded-xl border bg-card"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="p-3">Farm</th><th className="p-3">Area</th><th className="p-3">Crops</th><th className="p-3">Livestock</th><th className="p-3">Inventory</th><th className="p-3">Low stock</th><th className="p-3">Income</th><th className="p-3">Expense</th><th className="p-3">Net</th></tr></thead><tbody>{summary.map(row => <tr key={row.farm.id} className="border-t"><td className="p-3 font-medium">{row.farm.name}</td><td className="p-3">{row.farm.area ?? '—'} {row.farm.unit || ''}</td><td className="p-3">{row.crops}</td><td className="p-3">{row.livestock}</td><td className="p-3">{row.inventory}</td><td className="p-3">{row.lowStock}</td><td className="p-3">{money(row.income)}</td><td className="p-3">{money(row.expense)}</td><td className="p-3">{money(row.net)}</td></tr>)}{!summary.length && <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">{loading ? 'Loading report data…' : 'No farm data is available for this filter.'}</td></tr>}</tbody></table></div></section>
    <p className="text-xs text-muted-foreground">Reports reflect records currently returned by each authorized module. Financial totals are recorded entries, not bank balances or audited statements; marketplace counts reflect published listings.</p>
  </div>
}
