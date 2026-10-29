import { useCallback, useEffect, useState } from 'react'
import { Bell, CheckCheck, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useLiveRefresh } from '@/hooks/use-live-refresh'
import { LiveDataRefreshControl, type LiveRefreshIntervalMs } from '@/components/ui/LiveDataRefreshControl'

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
  const [liveRefreshEnabled, setLiveRefreshEnabled] = useState(false)
  const [liveRefreshIntervalMs, setLiveRefreshIntervalMs] = useState<LiveRefreshIntervalMs>(15_000)
  const [busy, setBusy] = useState<string[]>([])
  const [error, setError] = useState('')
  const [severityFilter, setSeverityFilter] = useState<'ALL' | NotificationSeverity>('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [messagingData, setMessagingData] = useState<any>({ providers: [], connections: [] })
  const [messagingConsents, setMessagingConsents] = useState<any[]>([])
  const [arattaiToken, setArattaiToken] = useState('')
  const [arattaiDisplayName, setArattaiDisplayName] = useState('J & J')
  const [testPhone, setTestPhone] = useState('')
  const [testTemplateId, setTestTemplateId] = useState('')
  const [testVariables, setTestVariables] = useState('{}')
  const [consentPhone, setConsentPhone] = useState('')
  const [consentSource, setConsentSource] = useState('IN_APP')
  const [consentPurpose, setConsentPurpose] = useState('PROMOTIONAL')
  const [consentNote, setConsentNote] = useState('')
  const [consentConfirmed, setConsentConfirmed] = useState(false)
  const [promotionConsentId, setPromotionConsentId] = useState('')
  const [promotionTemplateId, setPromotionTemplateId] = useState('')
  const [promotionLanguage, setPromotionLanguage] = useState('en')
  const [promotionVariables, setPromotionVariables] = useState('{}')
  const [promotionConfirmed, setPromotionConfirmed] = useState(false)
  const [transactionConsentId, setTransactionConsentId] = useState('')
  const [transactionTemplateId, setTransactionTemplateId] = useState('')
  const [transactionLanguage, setTransactionLanguage] = useState('en')
  const [transactionVariables, setTransactionVariables] = useState('{}')
  const [transactionConfirmed, setTransactionConfirmed] = useState(false)
  const [messagingBusy, setMessagingBusy] = useState('')
  const [messagingNotice, setMessagingNotice] = useState('')

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

  const reloadMessagingSettings = useCallback(async () => {
    if (!token) return
    try {
      const [data, consents] = await Promise.all([api.messagingIntegrations(token), api.messagingRecipientConsents(token)])
      setMessagingData(data)
      setMessagingConsents(consents)
      if (!promotionConsentId && consents.length) setPromotionConsentId(consents.find((item: any) => !item.revokedAt)?.id || '')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load messaging integrations.')
    }
  }, [token, promotionConsentId])

  useEffect(() => { void load() }, [load])
  useEffect(() => { void reloadMessagingSettings() }, [reloadMessagingSettings])
  useLiveRefresh(load, { enabled: Boolean(token) && liveRefreshEnabled, intervalMs: liveRefreshIntervalMs })

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

  async function connectArattai() {
    if (!token || !arattaiToken.trim()) return
    setMessagingBusy('connect'); setMessagingNotice(''); setError('')
    try {
      await api.connectArattaiMessaging({ accessToken: arattaiToken.trim(), displayName: arattaiDisplayName.trim() || 'Arattai Business' }, token)
      setArattaiToken('')
      setMessagingNotice('Arattai Business account connected to your user profile. The access token is stored encrypted on the server.')
      await reloadMessagingSettings()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to connect Arattai Business.') }
    finally { setMessagingBusy('') }
  }

  async function disconnectArattai() {
    if (!token) return
    setMessagingBusy('disconnect'); setMessagingNotice(''); setError('')
    try {
      await api.disconnectMessagingProvider('ARATTAI', token)
      setMessagingNotice('Arattai Business disconnected for this user.')
      await reloadMessagingSettings()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to disconnect Arattai Business.') }
    finally { setMessagingBusy('') }
  }

  async function saveRecipientConsent() {
    if (!token || !consentConfirmed) { setError('Confirm the recipient explicitly opted in before recording promotional consent.'); return }
    setMessagingBusy('consent'); setMessagingNotice(''); setError('')
    try {
      const saved = await api.recordMessagingRecipientConsent({ phoneNumber: consentPhone, confirmed: consentConfirmed, source: consentSource, purpose: consentPurpose, note: consentNote }, token)
      setConsentPhone(''); setConsentNote(''); setConsentConfirmed(false)
      if (consentPurpose === 'PROMOTIONAL') setPromotionConsentId(saved.id); else setTransactionConsentId(saved.id)
      setMessagingNotice(consentPurpose === 'PROMOTIONAL' ? 'Promotional consent saved. Marketing sends require this consent to remain active.' : 'Transactional consent saved. Operational messages require this consent to remain active.')
      await reloadMessagingSettings()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save recipient consent.') }
    finally { setMessagingBusy('') }
  }

  async function revokeRecipientConsent(id: string) {
    if (!token) return
    setMessagingBusy('revoke:' + id); setMessagingNotice(''); setError('')
    try {
      await api.revokeMessagingRecipientConsent(id, token)
      if (promotionConsentId === id) setPromotionConsentId('')
      if (transactionConsentId === id) setTransactionConsentId('')
      setMessagingNotice('Consent revoked. This contact can no longer be used for sends of that purpose.')
      await reloadMessagingSettings()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to revoke consent.') }
    finally { setMessagingBusy('') }
  }

  async function sendArattaiTest() {
    if (!token) return
    setMessagingBusy('test'); setMessagingNotice(''); setError('')
    try {
      const variables = JSON.parse(testVariables || '{}')
      await api.sendArattaiTestPromotion({ phoneNumber: testPhone, templateId: testTemplateId, language: 'en', variables }, token)
      setMessagingNotice('Arattai accepted the test promotion request. Confirm delivery in Arattai Monitoring & insights.')
      await reloadMessagingSettings()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to send the Arattai test message.') }
    finally { setMessagingBusy('') }
  }

  async function sendArattaiPromotion() {
    if (!token || !promotionConfirmed) { setError('Confirm the selected recipient still has active promotional consent.'); return }
    setMessagingBusy('promotion'); setMessagingNotice(''); setError('')
    try {
      const variables = JSON.parse(promotionVariables || '{}')
      await api.sendArattaiPromotion({ consentId: promotionConsentId, templateId: promotionTemplateId, language: promotionLanguage, variables }, token)
      setMessagingNotice('Arattai accepted the promotional message request. Check provider analytics for delivery status and cost.')
      setPromotionConfirmed(false)
      await reloadMessagingSettings()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to send the promotional message.') }
    finally { setMessagingBusy('') }
  }

  async function sendArattaiTransactional() {
    if (!token || !transactionConfirmed) { setError('Confirm this operational message is expected by the selected recipient.'); return }
    setMessagingBusy('transactional'); setMessagingNotice(''); setError('')
    try {
      const variables = JSON.parse(transactionVariables || '{}')
      await api.sendArattaiTransactional({ consentId: transactionConsentId, templateId: transactionTemplateId, language: transactionLanguage, variables }, token)
      setMessagingNotice('Arattai accepted the transactional message request. Check provider analytics for delivery status and cost.')
      setTransactionConfirmed(false)
      await reloadMessagingSettings()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to send the transactional message.') }
    finally { setMessagingBusy('') }
  }

  const arattaiConnected = messagingData.providers?.some((provider: any) => provider.provider === 'ARATTAI' && provider.status === 'CONNECTED')
  const activeMessagingConsents = messagingConsents.filter((item: any) => !item.revokedAt && item.purpose === 'PROMOTIONAL')
  const activeTransactionalConsents = messagingConsents.filter((item: any) => !item.revokedAt && item.purpose === 'TRANSACTIONAL')
  const filtered = severityFilter !== 'ALL' || typeFilter !== 'ALL' || unreadOnly
  return <div className="space-y-5 p-4 sm:p-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-2xl font-semibold"><Bell className="size-6" />Notifications &amp; Alerts</div><p className="mt-1 text-sm text-muted-foreground">Account-scoped farm-stock, livestock follow-up and Marketplace event alerts.</p></div><div className="flex flex-wrap items-center gap-2"><LiveDataRefreshControl enabled={liveRefreshEnabled} intervalMs={liveRefreshIntervalMs} onEnabledChange={setLiveRefreshEnabled} onIntervalChange={setLiveRefreshIntervalMs} /><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 size-4" />Refresh</Button><Button onClick={() => void markAllRead()} disabled={!unread || busy.includes('all')}><CheckCheck className="mr-2 size-4" />Mark all read ({unread})</Button></div></header>
    {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">{error}</div>}
    <section className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4"><label className="grid gap-1 text-sm"><span className="text-muted-foreground">Severity</span><select aria-label="Notification severity filter" value={severityFilter} onChange={event => setSeverityFilter(event.target.value as 'ALL' | NotificationSeverity)} className="h-9 min-w-40 rounded-md border bg-background px-3"><option value="ALL">All severities</option><option value="CRITICAL">Critical</option><option value="WARNING">Warning</option><option value="INFO">Info</option><option value="SUCCESS">Success</option></select></label><label className="grid gap-1 text-sm"><span className="text-muted-foreground">Event type</span><select aria-label="Notification type filter" value={typeFilter} onChange={event => setTypeFilter(event.target.value)} className="h-9 min-w-48 rounded-md border bg-background px-3"><option value="ALL">All event types</option><option value="LOW_STOCK">Low stock</option><option value="MARKETPLACE_ORDER">Marketplace order</option><option value="LIVESTOCK_FOLLOW_UP">Livestock follow-up</option></select></label><label className="flex h-9 items-center gap-2 rounded-md border px-3 text-sm"><input aria-label="Unread notifications only" type="checkbox" checked={unreadOnly} onChange={event => setUnreadOnly(event.target.checked)} />Unread only</label><p className="max-w-md text-xs text-muted-foreground">Expired alerts are hidden after the retention window; records are retained. Links are restricted to internal application routes.</p></section>
    <section className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
      <div><h2 className="text-lg font-semibold">Messaging account integrations</h2><p className="mt-1 text-sm text-muted-foreground">Each provider connection belongs only to your KrishiKendram user. Tokens are never returned to the browser after saving.</p></div>
      {messagingNotice && <div role="status" className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">{messagingNotice}</div>}
      <div className="grid gap-3 md:grid-cols-3">
        {(messagingData.providers || [{provider:'ARATTAI',label:'Arattai Business',status:'NOT_CONNECTED',ready:true},{provider:'WHATSAPP_BUSINESS',label:'WhatsApp Business',status:'NOT_CONNECTED',ready:false},{provider:'TELEGRAM',label:'Telegram',status:'NOT_CONNECTED',ready:false}]).map((provider: any) => <div key={provider.provider} className="rounded-lg border p-3"><div className="font-medium">{provider.label}</div><div className="mt-1 text-xs text-muted-foreground">{provider.status === 'CONNECTED' ? 'Connected to this account' : provider.ready ? 'Ready to connect' : 'Connector planned; provider-specific authorization is not wired yet'}</div><div className="mt-2 text-xs">{provider.status === 'CONNECTED' ? 'Connected' : provider.ready ? 'Not connected' : 'Not available yet'}</div></div>)}
      </div>
      <div className="rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Arattai Business · J &amp; J</h3>{arattaiConnected && <Button size="sm" variant="outline" disabled={Boolean(messagingBusy)} onClick={() => void disconnectArattai()}>Disconnect</Button>}</div>
        {!arattaiConnected ? <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm">Account label<input className="h-9 rounded-md border bg-background px-3" value={arattaiDisplayName} onChange={event => setArattaiDisplayName(event.target.value)} maxLength={120} /></label>
          <label className="grid gap-1 text-sm">Arattai Business access token<input type="password" autoComplete="new-password" className="h-9 rounded-md border bg-background px-3" value={arattaiToken} onChange={event => setArattaiToken(event.target.value)} placeholder="Paste token from Arattai API console" /></label>
          <p className="text-xs text-muted-foreground md:col-span-2">Use a token with the Arattai Business messaging CREATE scope. The server encrypts it with AES-256-GCM; configure KK_MESSAGING_ENCRYPTION_KEY in the backend environment first. Never paste the token into chat or commit it to Git.</p>
          <Button className="md:col-span-2 md:w-fit" disabled={!arattaiToken.trim() || Boolean(messagingBusy)} onClick={() => void connectArattai()}>{messagingBusy === 'connect' ? 'Connecting…' : 'Connect Arattai Business'}</Button>
        </div> : <div className="mt-3 space-y-4">
          <p className="text-sm text-muted-foreground">Connected. Promotional sends require an approved Arattai template and an active consent record for the recipient.</p>
          <div className="grid gap-3 rounded-lg bg-muted/30 p-3 md:grid-cols-2">
            <h4 className="font-medium md:col-span-2">Send a test promotion</h4>
            <label className="grid gap-1 text-sm">Active test recipient phone<input className="h-9 rounded-md border bg-background px-3" value={testPhone} onChange={event => setTestPhone(event.target.value)} placeholder="Country code + phone" /></label>
            <label className="grid gap-1 text-sm">Approved template ID<input className="h-9 rounded-md border bg-background px-3" value={testTemplateId} onChange={event => setTestTemplateId(event.target.value)} placeholder="Template ID from Arattai Tools → Templates" /></label>
            <label className="grid gap-1 text-sm md:col-span-2">Template variables (JSON)<textarea className="min-h-20 rounded-md border bg-background p-2 font-mono text-xs" value={testVariables} onChange={event => setTestVariables(event.target.value)} /></label>
            <Button className="md:col-span-2 md:w-fit" disabled={!testPhone.trim() || !testTemplateId.trim() || Boolean(messagingBusy)} onClick={() => void sendArattaiTest()}>{messagingBusy === 'test' ? 'Sending test…' : 'Send test message'}</Button>
          </div>
          <div className="grid gap-3 rounded-lg bg-muted/30 p-3 md:grid-cols-2">
            <h4 className="font-medium md:col-span-2">Record recipient opt-in</h4>
            <label className="grid gap-1 text-sm">Recipient phone<input className="h-9 rounded-md border bg-background px-3" value={consentPhone} onChange={event => setConsentPhone(event.target.value)} placeholder="Country code + phone" /></label>
            <label className="grid gap-1 text-sm">Message consent type<select className="h-9 rounded-md border bg-background px-3" value={consentPurpose} onChange={event => setConsentPurpose(event.target.value)}><option value="PROMOTIONAL">Promotional / marketing</option><option value="TRANSACTIONAL">Operational / transactional</option></select></label>
            <label className="grid gap-1 text-sm">Consent source<select className="h-9 rounded-md border bg-background px-3" value={consentSource} onChange={event => setConsentSource(event.target.value)}><option value="IN_APP">In-app opt-in</option><option value="WRITTEN">Written consent</option><option value="VERBAL">Verbal consent</option><option value="IMPORTED_WITH_PROOF">Imported with proof</option></select></label>
            <label className="grid gap-1 text-sm md:col-span-2">Consent note / evidence reference<input className="h-9 rounded-md border bg-background px-3" value={consentNote} onChange={event => setConsentNote(event.target.value)} maxLength={500} placeholder="Optional reference; do not enter sensitive documents or secrets" /></label>
            <label className="flex items-start gap-2 text-sm md:col-span-2"><input className="mt-1" type="checkbox" checked={consentConfirmed} onChange={event => setConsentConfirmed(event.target.checked)} /><span>I confirm this recipient explicitly agreed to receive the selected type of messages from this business on Arattai.</span></label>
            <Button className="md:col-span-2 md:w-fit" disabled={!consentPhone.trim() || !consentConfirmed || Boolean(messagingBusy)} onClick={() => void saveRecipientConsent()}>{messagingBusy === 'consent' ? 'Saving…' : 'Save promotional consent'}</Button>
            {messagingConsents.length > 0 && <div className="space-y-2 md:col-span-2"><div className="text-sm font-medium">Recorded recipients</div>{messagingConsents.map((item: any) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm"><span>{item.recipientHint} · {item.purpose} · {item.revokedAt ? 'Consent revoked' : 'Consent active'} · {item.consentSource}</span>{!item.revokedAt && <Button size="sm" variant="outline" disabled={Boolean(messagingBusy)} onClick={() => void revokeRecipientConsent(item.id)}>Revoke</Button>}</div>)}</div>}
          </div>
          <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-2">
          <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-2">
            <h4 className="font-medium md:col-span-2">Send an operational notification (transactional template)</h4>
            <label className="grid gap-1 text-sm md:col-span-2">Recipient with transactional consent<select className="h-9 rounded-md border bg-background px-3" value={transactionConsentId} onChange={event => setTransactionConsentId(event.target.value)}><option value="">Select opted-in recipient</option>{activeTransactionalConsents.map((item: any) => <option key={item.id} value={item.id}>{item.recipientHint} · consented {new Date(item.consentedAt).toLocaleDateString()}</option>)}</select></label>
            <label className="grid gap-1 text-sm">Approved transactional template ID<input className="h-9 rounded-md border bg-background px-3" value={transactionTemplateId} onChange={event => setTransactionTemplateId(event.target.value)} placeholder="Arattai template ID" /></label>
            <label className="grid gap-1 text-sm">Template language code<input className="h-9 rounded-md border bg-background px-3" value={transactionLanguage} onChange={event => setTransactionLanguage(event.target.value)} placeholder="en, hi, te, ta…" /></label>
            <label className="grid gap-1 text-sm md:col-span-2">Template variables (JSON)<textarea className="min-h-20 rounded-md border bg-background p-2 font-mono text-xs" value={transactionVariables} onChange={event => setTransactionVariables(event.target.value)} /></label>
            <label className="flex items-start gap-2 text-sm md:col-span-2"><input className="mt-1" type="checkbox" checked={transactionConfirmed} onChange={event => setTransactionConfirmed(event.target.checked)} /><span>I confirm this is an operational update, not a marketing message, and the recipient has active transactional consent.</span></label>
            <Button className="md:col-span-2 md:w-fit" disabled={!transactionConsentId || !transactionTemplateId.trim() || !transactionConfirmed || Boolean(messagingBusy)} onClick={() => void sendArattaiTransactional()}>{messagingBusy === 'transactional' ? 'Sending…' : 'Send operational notification'}</Button>
          </div>
            <h4 className="font-medium md:col-span-2">Send a promotional template</h4>
            <label className="grid gap-1 text-sm md:col-span-2">Recipient with active consent<select className="h-9 rounded-md border bg-background px-3" value={promotionConsentId} onChange={event => setPromotionConsentId(event.target.value)}><option value="">Select opted-in recipient</option>{activeMessagingConsents.map((item: any) => <option key={item.id} value={item.id}>{item.recipientHint} · consented {new Date(item.consentedAt).toLocaleDateString()}</option>)}</select></label>
            <label className="grid gap-1 text-sm">Approved template ID<input className="h-9 rounded-md border bg-background px-3" value={promotionTemplateId} onChange={event => setPromotionTemplateId(event.target.value)} placeholder="Arattai template ID" /></label>
            <label className="grid gap-1 text-sm">Template language code<input className="h-9 rounded-md border bg-background px-3" value={promotionLanguage} onChange={event => setPromotionLanguage(event.target.value)} placeholder="en, hi, te, ta…" /></label>
            <label className="grid gap-1 text-sm md:col-span-2">Template variables (JSON)<textarea className="min-h-20 rounded-md border bg-background p-2 font-mono text-xs" value={promotionVariables} onChange={event => setPromotionVariables(event.target.value)} /></label>
            <label className="flex items-start gap-2 text-sm md:col-span-2"><input className="mt-1" type="checkbox" checked={promotionConfirmed} onChange={event => setPromotionConfirmed(event.target.checked)} /><span>I checked this approved template and confirm the selected recipient has not withdrawn promotional consent.</span></label>
            <Button className="md:col-span-2 md:w-fit" disabled={!promotionConsentId || !promotionTemplateId.trim() || !promotionConfirmed || Boolean(messagingBusy)} onClick={() => void sendArattaiPromotion()}>{messagingBusy === 'promotion' ? 'Sending…' : 'Send promotional message'}</Button>
            <p className="text-xs text-muted-foreground md:col-span-2">This sends a real provider request. Arattai controls template approval, delivery and charges. The app will not send promotional messages without an active consent record.</p>
          </div>
        </div>}
      </div>
    </section>
    {items.length === 0 ? <div className="rounded-xl border border-dashed p-10 text-center"><Bell className="mx-auto size-8 text-muted-foreground" /><p className="mt-3 font-medium">{loading ? 'Loading notifications…' : filtered ? 'No notifications match these filters' : 'You’re all caught up'}</p><p className="mt-1 text-sm text-muted-foreground">Marketplace order updates, livestock follow-ups and inventory reorder alerts appear here.</p></div> : <div className="space-y-2">{items.map(item => { const severity = item.severity || 'INFO'; const href = safeHref(item.href); return <article key={item.id} className={'rounded-xl border p-4 ' + (item.readAt ? 'bg-card' : 'border-primary/30 bg-primary/[0.03]')}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{item.title}</h2><span className={'rounded-full border px-2 py-0.5 text-xs ' + severityClass(severity)}>{severity}</span>{!item.readAt && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs">New</span>}</div><p className="mt-1 text-sm text-muted-foreground">{item.message}</p><div className="mt-2 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString(undefined, { second: '2-digit' })} · {item.type.replaceAll('_', ' ')} · {item.source || 'system'}</div>{href && <Link to={href} onClick={() => void markRead(item)} className="mt-3 inline-flex text-sm font-medium underline underline-offset-4">Open related module</Link>}</div>{!item.readAt && <Button size="sm" variant="outline" disabled={busy.includes(item.id)} onClick={() => void markRead(item)}>Mark read</Button>}</div></article> })}</div>}
  </div>
}
