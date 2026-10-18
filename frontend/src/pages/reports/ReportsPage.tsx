import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, FileText, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useLiveRefresh } from '@/hooks/use-live-refresh'

type FarmOption = { id: string; name: string; area?: number | null; unit?: string | null }
type CurrencyTotal = { currency: string; income: number; expense: number; net: number }
type FarmSummary = { farmId: string; name: string; area?: number | null; unit?: string | null; cropRecords: number; livestockRecords: number; inventoryItems: number; lowStockItems: number; financeByCurrency: CurrencyTotal[] }
type FinanceDetail = { id: string; farmId: string; farmName: string; type: string; category: string; amount: number; currency: string; occurredAt: string | null; reference: string; notes: string }
type ReportOverview = { generatedAt: string; filters: { farmId: string | null; fromDate: string | null; toDate: string | null }; availableFarms: FarmOption[]; totals: { farmCount: number; cropRecords: number; livestockRecords: number; inventoryItems: number; lowStockItems: number; listingCount: number; publishedListings: number; financeByCurrency: CurrencyTotal[] }; farms: FarmSummary[]; financialDetails: FinanceDetail[]; warnings: string[]; notes: { financialTotals: string; marketplaceListings: string; source: string } }
const csvCell = (value: unknown) => '"' + String(value ?? '').replace(/"/g, '""') + '"'
const formatCurrency = (value: number, currency: string) => {
  try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 2 }).format(value) }
  catch { return (currency || 'INR') + ' ' + Number(value || 0).toFixed(2) }
}
const currencyTotalsText = (totals: CurrencyTotal[], key: 'income' | 'expense' | 'net') => totals.length ? totals.map(total => formatCurrency(total[key], total.currency)).join(' · ') : '—'

export function ReportsPage() {
  const token = localStorage.getItem('accessToken')
  const [report, setReport] = useState<ReportOverview | null>(null)
  const [farmFilter, setFarmFilter] = useState('ALL')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!token) { setError('Sign in to view reports.'); return }
    setLoading(true)
    setError('')
    try {
      const data = await api.reportsOverview(token, { farmId: farmFilter === 'ALL' ? undefined : farmFilter, fromDate: fromDate || undefined, toDate: toDate || undefined }) as ReportOverview
      setReport(data)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Report data could not be loaded. Refresh to retry.')
    } finally {
      setLoading(false)
    }
  }, [token, farmFilter, fromDate, toDate])

  const filterKey = [token || '', farmFilter, fromDate, toDate].join('|')
  const lastFilterKey = useRef(filterKey)
  useEffect(() => {
    if (lastFilterKey.current === filterKey) return
    lastFilterKey.current = filterKey
    void load()
  }, [filterKey, load])
  useLiveRefresh(load, { enabled: Boolean(token), intervalMs: 60_000, onWindowFocus: true })

  function exportCsv() {
    if (!report) return
    const rows: unknown[][] = [
      ['Farm', 'Farm area', 'Area unit', 'Crop records', 'Livestock records', 'Inventory items', 'Low stock items', 'Income by currency', 'Expense by currency', 'Net by currency'],
      ...report.farms.map(row => [row.name, row.area ?? '', row.unit ?? '', row.cropRecords, row.livestockRecords, row.inventoryItems, row.lowStockItems, currencyTotalsText(row.financeByCurrency, 'income'), currencyTotalsText(row.financeByCurrency, 'expense'), currencyTotalsText(row.financeByCurrency, 'net')]),
      [],
      ['FINANCIAL DETAIL', 'Farm', 'Type', 'Category', 'Amount', 'Currency', 'Date', 'Reference', 'Notes'],
      ...report.financialDetails.map(item => [item.id, item.farmName, item.type, item.category, Number(item.amount).toFixed(2), item.currency, item.occurredAt || '', item.reference, item.notes]),
      [],
      ['Generated at', report.generatedAt],
      ['Filters', 'Farm=' + (report.filters.farmId || 'ALL') + '; from=' + (report.filters.fromDate || 'ALL') + '; to=' + (report.filters.toDate || 'ALL')],
      ['Data note', report.notes.financialTotals],
      ['Marketplace note', report.notes.marketplaceListings],
    ]
    const blob = new Blob([String.fromCharCode(0xFEFF) + rows.map(row => row.map(csvCell).join(',')).join(String.fromCharCode(13, 10))], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'krishikendram-farm-report.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  const totals = report?.totals
  return <div className="space-y-6 p-4 sm:p-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-2xl font-semibold"><FileText className="size-6" />Farm Reports &amp; Analytics</div><p className="mt-1 text-sm text-muted-foreground">A read-only, farm-scoped report assembled by the backend from authorized module services.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 size-4" />Refresh</Button><Button onClick={exportCsv} disabled={!report || loading}><Download className="mr-2 size-4" />Export CSV</Button></div></header>
    {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">{error}</div>}
    {(report?.warnings || []).length > 0 && <div role="status" className="rounded-lg border p-3 text-sm text-muted-foreground">Partial report: {(report?.warnings || []).join(' ')}</div>}
    <section className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4"><label className="grid gap-1 text-sm"><span className="text-muted-foreground">Farm</span><select aria-label="Report farm filter" value={farmFilter} onChange={event => setFarmFilter(event.target.value)} className="h-9 min-w-48 rounded-md border bg-background px-3"><option value="ALL">All my farms</option>{(report?.availableFarms || []).map(farm => <option key={farm.id} value={farm.id}>{farm.name}</option>)}</select></label><label className="grid gap-1 text-sm"><span className="text-muted-foreground">From date</span><input aria-label="Report start date" type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} className="h-9 rounded-md border bg-background px-3" /></label><label className="grid gap-1 text-sm"><span className="text-muted-foreground">To date</span><input aria-label="Report end date" type="date" value={toDate} onChange={event => setToDate(event.target.value)} className="h-9 rounded-md border bg-background px-3" /></label><p className="max-w-md text-xs text-muted-foreground">Date filters apply to dated operational and financial records. Currency totals stay separate; no exchange-rate conversion is guessed.</p></section>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-xl border bg-card p-4"><div className="text-sm text-muted-foreground">Farms in report</div><div className="mt-1 text-2xl font-semibold">{totals?.farmCount ?? '—'}</div></div><div className="rounded-xl border bg-card p-4"><div className="text-sm text-muted-foreground">Crop records</div><div className="mt-1 text-2xl font-semibold">{totals?.cropRecords ?? '—'}</div></div><div className="rounded-xl border bg-card p-4"><div className="text-sm text-muted-foreground">Low-stock items</div><div className="mt-1 text-2xl font-semibold">{totals?.lowStockItems ?? '—'}</div></div><div className="rounded-xl border bg-card p-4"><div className="text-sm text-muted-foreground">My published listings</div><div className="mt-1 text-2xl font-semibold">{totals?.publishedListings ?? '—'}</div><div className="mt-1 text-xs text-muted-foreground">Seller-wide, not attributed to a farm</div></div></div>
    <div className="grid gap-3 md:grid-cols-3"><div className="rounded-xl border bg-card p-4"><div className="text-sm text-muted-foreground">Recorded income by currency</div><div className="mt-1 space-y-1 text-lg font-semibold">{totals?.financeByCurrency.length ? totals.financeByCurrency.map(item => <div key={item.currency}>{formatCurrency(item.income, item.currency)}</div>) : '—'}</div></div><div className="rounded-xl border bg-card p-4"><div className="text-sm text-muted-foreground">Recorded expenses by currency</div><div className="mt-1 space-y-1 text-lg font-semibold">{totals?.financeByCurrency.length ? totals.financeByCurrency.map(item => <div key={item.currency}>{formatCurrency(item.expense, item.currency)}</div>) : '—'}</div></div><div className="rounded-xl border bg-card p-4"><div className="text-sm text-muted-foreground">Net recorded by currency</div><div className="mt-1 space-y-1 text-lg font-semibold">{totals?.financeByCurrency.length ? totals.financeByCurrency.map(item => <div key={item.currency} className={item.net < 0 ? 'text-destructive' : ''}>{formatCurrency(item.net, item.currency)}</div>) : '—'}</div></div></div>
    <section className="space-y-3"><div className="flex flex-wrap items-end justify-between gap-2"><h2 className="text-lg font-semibold">Farm operational summary</h2>{report && <p className="text-xs text-muted-foreground">Generated {new Date(report.generatedAt).toLocaleString()}</p>}</div><div className="overflow-x-auto rounded-xl border bg-card"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="p-3">Farm</th><th className="p-3">Area</th><th className="p-3">Crops</th><th className="p-3">Livestock</th><th className="p-3">Inventory</th><th className="p-3">Low stock</th><th className="p-3">Income by currency</th><th className="p-3">Expense by currency</th><th className="p-3">Net by currency</th></tr></thead><tbody>{(report?.farms || []).map(row => <tr key={row.farmId} className="border-t"><td className="p-3 font-medium">{row.name}</td><td className="p-3">{row.area ?? '—'} {row.unit || ''}</td><td className="p-3">{row.cropRecords}</td><td className="p-3">{row.livestockRecords}</td><td className="p-3">{row.inventoryItems}</td><td className="p-3">{row.lowStockItems}</td><td className="p-3">{currencyTotalsText(row.financeByCurrency, 'income')}</td><td className="p-3">{currencyTotalsText(row.financeByCurrency, 'expense')}</td><td className="p-3">{currencyTotalsText(row.financeByCurrency, 'net')}</td></tr>)}{!report?.farms.length && <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">{loading ? 'Loading report data…' : 'No farm data is available for this filter.'}</td></tr>}</tbody></table></div></section>
    <section className="space-y-3"><h2 className="text-lg font-semibold">Financial detail</h2><div className="overflow-x-auto rounded-xl border bg-card"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="p-3">Farm</th><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3">Category</th><th className="p-3">Amount</th><th className="p-3">Reference</th></tr></thead><tbody>{(report?.financialDetails || []).map(item => <tr key={item.id} className="border-t"><td className="p-3">{item.farmName}</td><td className="p-3">{item.occurredAt ? new Date(item.occurredAt).toLocaleDateString() : '—'}</td><td className="p-3">{item.type}</td><td className="p-3">{item.category || '—'}</td><td className="p-3">{formatCurrency(item.amount, item.currency)}</td><td className="p-3">{item.reference || '—'}</td></tr>)}{!report?.financialDetails.length && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">{loading ? 'Loading financial detail…' : 'No financial entries match this filter.'}</td></tr>}</tbody></table></div></section>
    <p className="text-xs text-muted-foreground">Reports are read-only. Financial totals are recorded entries, not bank balances or audited statements. Listing totals include only listings belonging to the current seller. Source: {report?.notes.source || 'authorized module services'}.</p>
  </div>
}
