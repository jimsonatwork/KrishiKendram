import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, CheckCheck, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useLiveRefresh } from '@/hooks/use-live-refresh'

type NotificationSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL'
type NotificationItem = { id: string; type: string; title: string; message: string; href?: string | null; severity?: NotificationSeverity; source?: string | null; expiresAt?: string | null; readAt?: string | null; createdAt: string }
const severityClass = (severity: NotificationSeverity) => {
  if (severity === 'CRITICAL') return 'border-destructive/30 bg-destructive/10 text-destructive'
  if (severity === 'WARNING') return 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300'
  if (severity === 'SUCCESS') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
  return 'border-border bg-muted/50 text-muted-foreground'
}
const safeHref = (href?: string | null) => href && href.startsWith('/app/') && !href.startsWith('//') && !href.includes('\\') ? href : null

export function NotificationsPage() {
  const token = localStorage.getItem('accessToken')
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState<string[]>([])
  const [error, setError] = useState('')
  const [severityFilter, setSeverityFilter] = useState<'ALL' | NotificationSeverity>('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [unreadOnly, setUnreadOnly] = useState(false)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')
    try {
      const [notifications, count] = await Promise.all([
        api.notifications(token, { type: typeFilter === 'ALL' ? undefined : typeFilter, severity: severityFilter === 'ALL' ? undefined : severityFilter, unreadOnly, limit: 100 }),
        api.notificationUnreadCount(token),
      ])
      setItems(notifications)
      setUnread(count.unreadCount)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load notifications.')
    } finally {
      setLoading(false)
    }
  }, [token, severityFilter, typeFilter, unreadOnly])

  const filterKey = [token || '', severityFilter, typeFilter, String(unreadOnly)].join('|')
  const lastFilterKey = useRef(filterKey)
  useEffect(() => {
    if (lastFilterKey.current === filterKey) return
    lastFilterKey.current = filterKey
    void load()
  }, [filterKey, load])
  useLiveRefresh(load, { enabled: Boolean(token), intervalMs: 30_000, onWindowFocus: true })

  async function markRead(item: NotificationItem) {
    if (!token || item.readAt || busy.includes(item.id)) return
    setBusy(previous => [...previous, item.id])
    try {
      await api.markNotificationRead(item.id, token)
      setItems(previous => unreadOnly ? previous.filter(value => value.id !== item.id) : previous.map(value => value.id === item.id ? { ...value, readAt: new Date().toISOString() } : value))
      setUnread(value => Math.max(0, value - 1))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to mark notification as read.')
    } finally {
      setBusy(previous => previous.filter(id => id !== item.id))
    }
  }

  async function markAllRead() {
    if (!token || unread === 0 || busy.includes('all')) return
    setBusy(previous => [...previous, 'all'])
    try {
      await api.markAllNotificationsRead(token)
      const readAt = new Date().toISOString()
      setItems(previous => unreadOnly ? [] : previous.map(item => ({ ...item, readAt: item.readAt || readAt })))
      setUnread(0)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to mark all notifications as read.')
    } finally {
      setBusy(previous => previous.filter(id => id !== 'all'))
    }
  }

  const filtered = severityFilter !== 'ALL' || typeFilter !== 'ALL' || unreadOnly
  return <div className="space-y-5 p-4 sm:p-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-2xl font-semibold"><Bell className="size-6" />Notifications &amp; Alerts</div><p className="mt-1 text-sm text-muted-foreground">Account-scoped farm-stock, livestock follow-up and Marketplace event alerts.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 size-4" />Refresh</Button><Button onClick={() => void markAllRead()} disabled={!unread || busy.includes('all')}><CheckCheck className="mr-2 size-4" />Mark all read ({unread})</Button></div></header>
    {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">{error}</div>}
    <section className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4"><label className="grid gap-1 text-sm"><span className="text-muted-foreground">Severity</span><select aria-label="Notification severity filter" value={severityFilter} onChange={event => setSeverityFilter(event.target.value as 'ALL' | NotificationSeverity)} className="h-9 min-w-40 rounded-md border bg-background px-3"><option value="ALL">All severities</option><option value="CRITICAL">Critical</option><option value="WARNING">Warning</option><option value="INFO">Info</option><option value="SUCCESS">Success</option></select></label><label className="grid gap-1 text-sm"><span className="text-muted-foreground">Event type</span><select aria-label="Notification type filter" value={typeFilter} onChange={event => setTypeFilter(event.target.value)} className="h-9 min-w-48 rounded-md border bg-background px-3"><option value="ALL">All event types</option><option value="LOW_STOCK">Low stock</option><option value="MARKETPLACE_ORDER">Marketplace order</option><option value="LIVESTOCK_FOLLOW_UP">Livestock follow-up</option></select></label><label className="flex h-9 items-center gap-2 rounded-md border px-3 text-sm"><input aria-label="Unread notifications only" type="checkbox" checked={unreadOnly} onChange={event => setUnreadOnly(event.target.checked)} />Unread only</label><p className="max-w-md text-xs text-muted-foreground">Expired alerts are hidden after the retention window; records are retained. Links are restricted to internal application routes.</p></section>
    {items.length === 0 ? <div className="rounded-xl border border-dashed p-10 text-center"><Bell className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-medium">{loading ? 'Loading notifications…' : filtered ? 'No notifications match these filters' : 'You’re all caught up'}</p><p className="mt-1 text-sm text-muted-foreground">Marketplace order updates, livestock follow-ups and inventory reorder alerts appear here.</p></div> : <div className="space-y-2">{items.map(item => { const severity = item.severity || 'INFO'; const href = safeHref(item.href); return <article key={item.id} className={'rounded-xl border p-4 ' + (item.readAt ? 'bg-card' : 'border-primary/30 bg-primary/[0.03]')}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{item.title}</h2><span className={'rounded-full border px-2 py-0.5 text-xs ' + severityClass(severity)}>{severity}</span>{!item.readAt && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs">New</span>}</div><p className="mt-1 text-sm text-muted-foreground">{item.message}</p><div className="mt-2 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString(undefined, { second: '2-digit' })} · {item.type.replaceAll('_', ' ')} · {item.source || 'system'}</div>{href && <Link to={href} onClick={() => void markRead(item)} className="mt-3 inline-flex text-sm font-medium underline underline-offset-4">Open related module</Link>}</div>{!item.readAt && <Button size="sm" variant="outline" disabled={busy.includes(item.id)} onClick={() => void markRead(item)}>Mark read</Button>}</div></article> })}</div>}
  </div>
}
