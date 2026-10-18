import { useCallback, useState } from 'react'
import { Bell, CheckCheck, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useLiveRefresh } from '@/hooks/use-live-refresh'

type NotificationItem = { id: string; type: string; title: string; message: string; href?: string | null; readAt?: string | null; createdAt: string }
export function NotificationsPage() {
  const token = localStorage.getItem('accessToken')
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState<string[]>([])
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    if (!token) return
    setLoading(true); setError('')
    try { const [notifications, count] = await Promise.all([api.notifications(token), api.notificationUnreadCount(token)]); setItems(notifications); setUnread(count.unreadCount) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load notifications.') }
    finally { setLoading(false) }
  }, [token])
  useLiveRefresh(load, { enabled: Boolean(token), intervalMs: 30_000, onWindowFocus: true })
  async function markRead(item: NotificationItem) {
    if (!token || item.readAt || busy.includes(item.id)) return
    setBusy(previous => [...previous, item.id])
    try { await api.markNotificationRead(item.id, token); setItems(previous => previous.map(value => value.id === item.id ? { ...value, readAt: new Date().toISOString() } : value)); setUnread(value => Math.max(0, value - 1)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to mark notification as read.') }
    finally { setBusy(previous => previous.filter(id => id !== item.id)) }
  }
  async function markAllRead() {
    if (!token || unread === 0) return
    setBusy(previous => [...previous, 'all'])
    try { await api.markAllNotificationsRead(token); const readAt = new Date().toISOString(); setItems(previous => previous.map(item => ({ ...item, readAt: item.readAt || readAt }))); setUnread(0) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to mark all notifications as read.') }
    finally { setBusy(previous => previous.filter(id => id !== 'all')) }
  }
  return <div className="space-y-5 p-4 sm:p-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-2xl font-semibold"><Bell className="size-6" />Notifications</div><p className="mt-1 text-sm text-muted-foreground">Order updates and farm-stock alerts for your account.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 size-4" />Refresh</Button><Button onClick={() => void markAllRead()} disabled={!unread || busy.includes('all')}><CheckCheck className="mr-2 size-4" />Mark all read ({unread})</Button></div></header>
    {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">{error}</div>}
    {items.length === 0 ? <div className="rounded-xl border border-dashed p-10 text-center"><Bell className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-medium">You're all caught up</p><p className="mt-1 text-sm text-muted-foreground">Marketplace order updates and inventory reorder alerts will appear here.</p></div> : <div className="space-y-2">{items.map(item => <article key={item.id} className={'rounded-xl border p-4 ' + (item.readAt ? 'bg-card' : 'border-primary/30 bg-primary/[0.03]')}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{item.title}</h2>{!item.readAt && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs">New</span>}</div><p className="mt-1 text-sm text-muted-foreground">{item.message}</p><div className="mt-2 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()} · {item.type.replaceAll('_', ' ')}</div>{item.href && <Link to={item.href} onClick={() => void markRead(item)} className="mt-3 inline-flex text-sm font-medium underline underline-offset-4">Open related module</Link>}</div>{!item.readAt && <Button size="sm" variant="outline" disabled={busy.includes(item.id)} onClick={() => void markRead(item)}>Mark read</Button>}</div></article>)}</div>}
  </div>
}
