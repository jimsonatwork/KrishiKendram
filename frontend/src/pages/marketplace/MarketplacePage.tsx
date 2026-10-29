import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { InventoryPage } from '@/pages/inventory/InventoryPage'
import { FinancePage } from '@/pages/finance/FinancePage'
import { useLiveRefresh } from '@/hooks/use-live-refresh'
import { LiveDataRefreshControl, type LiveRefreshIntervalMs } from '@/components/ui/LiveDataRefreshControl'
import { Store, RefreshCw, Send, Archive, Pencil, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

type ResourceChoice = { id: string; label: string; farmId?: string }
function parsePriceTiers(raw: string) {
  const text = raw.trim()
  if (!text) return []
  const entries = text.split(',').map(part => part.trim()).filter(Boolean)
  if (entries.length > 12) throw new Error('A listing supports at most 12 wholesale price tiers.')
  const tiers = entries.map(entry => {
    const parts = entry.split(':').map(part => part.trim())
    const minQuantity = Number(parts[0]), unitPrice = Number(parts[1])
    if (parts.length !== 2 || !parts[0] || !parts[1] || !Number.isFinite(minQuantity) || minQuantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) throw new Error('Enter wholesale tiers as minimum quantity:unit price, for example 25:45, 100:40.')
    return { minQuantity, unitPrice }
  }).sort((a,b) => a.minQuantity-b.minQuantity)
  if (tiers.some((tier, i) => i > 0 && tier.minQuantity === tiers[i-1].minQuantity)) throw new Error('Wholesale tier minimum quantities must be unique.')
  return tiers
}
const MARKETPLACE_API_ORIGIN = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1').replace(/\/api\/v1\/?$/, '')
function marketplaceMediaSource(url: string) { return url.startsWith('/uploads/marketplace/') ? MARKETPLACE_API_ORIGIN + url : url }

function indiaDateKey(value?: string | Date | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const part = (type: string) => parts.find((item) => item.type === type)?.value || ''
  return part('year') + '-' + part('month') + '-' + part('day')
}

function filterPublishedMarketplaceListings<T extends { category?: string; publishedAt?: string | null; createdAt?: string }>(
  listings: T[], period: string, category: string, now = new Date(),
): T[] {
  const todayKey = indiaDateKey(now)
  const todayUtc = Date.parse(todayKey + 'T00:00:00Z')
  const weekday = new Date(todayKey + 'T00:00:00Z').getUTCDay()
  const mondayKey = new Date(todayUtc - ((weekday + 6) % 7) * 86400000).toISOString().slice(0, 10)
  return listings.filter((listing) => {
    if (category && category !== 'ALL' && String(listing.category || 'OTHER').toUpperCase() !== category.toUpperCase()) return false
    if (!period || period === 'active') return true
    const listingKey = indiaDateKey(listing.publishedAt || listing.createdAt)
    if (!listingKey) return false
    if (period === 'week') return listingKey >= mondayKey && listingKey <= todayKey
    const daysAgo = Math.round((todayUtc - Date.parse(listingKey + 'T00:00:00Z')) / 86400000)
    if (period === 'today') return daysAgo === 0
    if (period === 'yesterday') return daysAgo === 1
    if (period === 'day-before-yesterday') return daysAgo === 2
    return true
  })
}

type Listing = {
  id: string
  resourceType: string
  resourceId: string
  sellerId?: string
  title: string
  description?: string
  quantity?: number
  minOrderQuantity?: number
  unit?: string
  price?: number
  priceTiers?: Array<{ minQuantity: number; unitPrice: number }>
  currency: string
  status: string
  publishedAt?: string | null
  createdAt?: string
  offeringType?: string
  contextPolicyKey?: string | null
  offeringDetails?: Record<string, unknown> | null
  sourceModule?: string | null
  sourceEntityId?: string | null
  category?: string
  imageUrls?: string[]
  videoUrls?: string[]
  externalLinks?: string[]
  seller?: { id: string; name: string; displayName?: string; profile?: { bio?: string | null; regionLabel?: string | null; contactPreference?: string; publicPhone?: string | null; showPhone?: boolean }; isVerified: boolean; userType: string; cautionRating?: number | null; cautionExpiresAt?: string | null }
}

type MarketplaceOfferingField = { key: string; label: string; type: 'text' | 'number' | 'boolean' | 'date' | 'url' | 'enum'; registryField: string; required?: boolean; options?: string[]; placeholder?: string; help?: string }
type MarketplaceOfferingDefinition = { type: string; label: string; description: string; fields: MarketplaceOfferingField[] }

type MarketplaceWorkspace = 'marketplace' | 'inventory' | 'finance'

function MarketplaceWorkspaceTabs({ active, onSelect, inventoryEnabled, financeEnabled }: { active: MarketplaceWorkspace; onSelect: (workspace: MarketplaceWorkspace) => void; inventoryEnabled: boolean; financeEnabled: boolean }) {
  const allTabs: Array<{ id: MarketplaceWorkspace; label: string; description: string }> = [
    { id: 'marketplace', label: 'Marketplace', description: 'Listings, orders, buyers and sellers' },
    { id: 'inventory', label: 'Inventory', description: 'Stock, movements and reorder levels' },
    { id: 'finance', label: 'Finance', description: 'Income, sales, settlements, tax and reconciliation' },
  ]
  const tabs = allTabs.filter(tab => tab.id === 'marketplace' || (tab.id === 'inventory' ? inventoryEnabled : financeEnabled))
  return <nav aria-label="Marketplace workspaces" className="rounded-xl border bg-card p-2">
    <div role="tablist" aria-label="Marketplace submodules" className="flex flex-wrap gap-2">
      {tabs.map(tab => <button key={tab.id} type="button" role="tab" aria-selected={active === tab.id} onClick={() => onSelect(tab.id)} className={'min-w-[150px] flex-1 rounded-lg border px-3 py-2 text-left transition-colors ' + (active === tab.id ? 'border-primary bg-primary/5 text-foreground' : 'border-transparent hover:border-border hover:bg-muted/40')}>
        <span className="block text-sm font-semibold">{tab.label}</span><span className="mt-0.5 block text-xs text-muted-foreground">{tab.description}</span>
      </button>)}
    </div>
  </nav>
}

export function MarketplacePage() {
  const routerLocation = useLocation()
  const navigate = useNavigate()
  const requestedWorkspace = new URLSearchParams(routerLocation.search).get('workspace')
  const activeWorkspace: MarketplaceWorkspace = requestedWorkspace === 'inventory' || requestedWorkspace === 'finance' ? requestedWorkspace : 'marketplace'
  const selectWorkspace = (workspace: MarketplaceWorkspace) => navigate('/app/marketplace' + (workspace === 'marketplace' ? '' : '?workspace=' + workspace))
  const token = localStorage.getItem('accessToken')
  const tokenPayload = (() => { try { return JSON.parse(atob((token || '').split('.')[1] || '')) } catch { return {} } })()
  const currentUserId = tokenPayload.userId || tokenPayload.sub || ''
  const currentUserRole = tokenPayload.role || ''
  const canManageCommercePolicy = currentUserRole === 'ADMIN' || currentUserRole === 'SUPER_ADMIN' || tokenPayload.authorityTier === 'SYSTEM_GOD'
  const [published, setPublished] = useState<Listing[]>([])
  const [categoryOptions, setCategoryOptions] = useState<string[]>(['OTHER'])
  const [browsePeriod, setBrowsePeriod] = useState('active')
  const [browseCategory, setBrowseCategory] = useState('ALL')
  const [mine, setMine] = useState<Listing[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [orderQuantities, setOrderQuantities] = useState<Record<string, string>>({})
  const [orderNotes, setOrderNotes] = useState<Record<string, string>>({})
  const [orderContextAnswers, setOrderContextAnswers] = useState<Record<string, Record<string, string>>>({})
  const [orderContextLinks, setOrderContextLinks] = useState<Record<string, { consent: boolean; farmId: string; cropId: string }>>({})
  const [orderOfferPrices, setOrderOfferPrices] = useState<Record<string, string>>({})
  const [orderQuotes, setOrderQuotes] = useState<Record<string, { quantity: string; offerPrice: string; quote: any }>>({})
  const [quoteBusyIds, setQuoteBusyIds] = useState<string[]>([])
  const [commercePolicy, setCommercePolicy] = useState<any>(null)
  const [featureFlags, setFeatureFlags] = useState<any[]>([])
  const [publicFeatureFlags, setPublicFeatureFlags] = useState<any[]>([])
  const [featureReasons, setFeatureReasons] = useState<Record<string, string>>({})
  const [featureBusyKeys, setFeatureBusyKeys] = useState<string[]>([])
  const [pendingReviews, setPendingReviews] = useState<any[]>([])
  const [reviewRatings, setReviewRatings] = useState<Record<string, string>>({})
  const [reviewComments, setReviewComments] = useState<Record<string, string>>({})
  const [reviewResponses, setReviewResponses] = useState<Record<string, string>>({})
  const [commerceHistory, setCommerceHistory] = useState<any>(null)
  const [settlementStatement, setSettlementStatement] = useState<any>(null)
  const [payoutHolds, setPayoutHolds] = useState<any[]>([])
  const [reconciliationRuns, setReconciliationRuns] = useState<any[]>([])
  const [reconciliationBusy, setReconciliationBusy] = useState(false)
  const [holdReasons, setHoldReasons] = useState<Record<string,string>>({})
  const [createHoldReasons, setCreateHoldReasons] = useState<Record<string,string>>({})
  const [holdBusyIds, setHoldBusyIds] = useState<string[]>([])
  const [taxProfiles, setTaxProfiles] = useState<any[]>([])
  const [sellerProfile, setSellerProfile] = useState<any>(null)
  const [sellerProfileBusy, setSellerProfileBusy] = useState(false)
  const [sellerProfileForm, setSellerProfileForm] = useState({ displayName:'', bio:'', regionLabel:'', contactPreference:'IN_APP', publicPhone:'', showPhone:false })
  const [profileVisibilityPolicy, setProfileVisibilityPolicy] = useState<{defaultVisible:boolean;rules:any[]}>({defaultVisible:true,rules:[]})
  const [visibilityRuleDraft, setVisibilityRuleDraft] = useState({visible:false,userIds:'',modules:'marketplace',categories:''})
  const [visibilityReason, setVisibilityReason] = useState('')
  const [visibilityBusy, setVisibilityBusy] = useState(false)
  const [favorites, setFavorites] = useState<any[]>([])
  const [favoriteBusyIds, setFavoriteBusyIds] = useState<string[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [messageForm, setMessageForm] = useState({ recipientId:'', listingId:'', orderId:'', body:'' })
  const [messageBusy, setMessageBusy] = useState(false)
  const [myRFQs, setMyRFQs] = useState<any[]>([])
  const [openRFQs, setOpenRFQs] = useState<any[]>([])
  const [rfqBusy, setRfqBusy] = useState(false)
  const [rfqForm, setRfqForm] = useState({ title:'', category:'PRODUCE', description:'', quantity:'', unit:'kg', targetUnitPrice:'', currency:'INR', deliveryRegion:'', neededBy:'' })
  const [rfqResponses, setRfqResponses] = useState<Record<string,{unitPrice:string,availableQuantity:string,note:string,validUntil:string}>>({})
  const [rfqDecisionReasons, setRfqDecisionReasons] = useState<Record<string,string>>({})
  const [taxProfileBusy, setTaxProfileBusy] = useState(false)
  const [taxReviewRefs, setTaxReviewRefs] = useState<Record<string,string>>({})
  const [taxRetireReasons, setTaxRetireReasons] = useState<Record<string,string>>({})
  const [taxProfileForm, setTaxProfileForm] = useState({ sellerJurisdictionCode: 'IN-TG', buyerJurisdictionCode: 'IN-TG', category: 'PRODUCE', taxCode: '', taxName: '', taxPercent: '0', taxBase: 'SUBTOTAL', effectiveFrom: new Date().toISOString().slice(0,10), effectiveTo: '' })
  const [trustCases, setTrustCases] = useState<any[]>([])
  const [activeRestrictions, setActiveRestrictions] = useState<any[]>([])
  const [revokeReasons, setRevokeReasons] = useState<Record<string, string>>({})
  const [trustForm, setTrustForm] = useState({ type: 'REPORT', category: 'MISREPRESENTATION', appealOfCaseId: '', listingId: '', orderId: '', description: '', evidenceUrls: '' })
  const [trustBusy, setTrustBusy] = useState(false)
  const [trustDecisions, setTrustDecisions] = useState<Record<string, { status: string; resolution: string; restrictionScope: string; restrictionDays: string; cautionRating: string }>>({})
  const [policyForm, setPolicyForm] = useState({ feesEnabled: false, buyerFeePercent: '0', sellerCommissionPercent: '0', taxEnabled: false, taxPercent: '0', taxReviewReference: '' })
  const [policySaving, setPolicySaving] = useState(false)
  const [orderAgreedPrices, setOrderAgreedPrices] = useState<Record<string, string>>({})
  const [counterOfferPrices, setCounterOfferPrices] = useState<Record<string, string>>({})
  const [counterOfferNotes, setCounterOfferNotes] = useState<Record<string, string>>({})
  const [deliveryForms, setDeliveryForms] = useState<Record<string, { status: string; carrier: string; trackingNumber: string; trackingUrl: string; estimatedDeliveryAt: string }>>({})
  const [orderBusyIds, setOrderBusyIds] = useState<string[]>([])
  const [sandboxPaymentBusyIds, setSandboxPaymentBusyIds] = useState<string[]>([])
  const [sandboxPaymentKeys, setSandboxPaymentKeys] = useState<Record<string, string>>({})
  const [sandboxRefundAmounts, setSandboxRefundAmounts] = useState<Record<string, string>>({})
  const [sandboxRefundReasons, setSandboxRefundReasons] = useState<Record<string, string>>({})
  const [sandboxRefundBusyIds, setSandboxRefundBusyIds] = useState<string[]>([])
  const [sandboxRefundKeys, setSandboxRefundKeys] = useState<Record<string, string>>({})
  const [sandboxChargebackAmounts, setSandboxChargebackAmounts] = useState<Record<string, string>>({})
  const [sandboxChargebackReasons, setSandboxChargebackReasons] = useState<Record<string, string>>({})
  const [sandboxChargebackBusyIds, setSandboxChargebackBusyIds] = useState<string[]>([])
  const [sandboxChargebackKeys, setSandboxChargebackKeys] = useState<Record<string, string>>({})
  const [sandboxChargebackEvidence, setSandboxChargebackEvidence] = useState<Record<string, string>>({})
  const [sandboxChargebackEvidenceBusyIds, setSandboxChargebackEvidenceBusyIds] = useState<string[]>([])
  const [cropChoices, setCropChoices] = useState<ResourceChoice[]>([])
  const [farmChoices, setFarmChoices] = useState<ResourceChoice[]>([])
  const [livestockChoices, setLivestockChoices] = useState<ResourceChoice[]>([])
  const [assetChoices, setAssetChoices] = useState<ResourceChoice[]>([])
  const [inventoryChoices, setInventoryChoices] = useState<ResourceChoice[]>([])
  const [offeringDefinitions, setOfferingDefinitions] = useState<MarketplaceOfferingDefinition[]>([])
  const [form, setForm] = useState({ resourceType: 'generic', resourceId: '', offeringType: 'PRODUCT', offeringDetails: {} as Record<string, string | boolean>, category: 'PRODUCE', title: '', description: '', imageUrls: '', videoUrls: '', externalLinks: '', quantity: '', minOrderQuantity: '', unit: '', price: '', priceTiers: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [liveRefreshEnabled, setLiveRefreshEnabled] = useState(false)
  const [liveRefreshIntervalMs, setLiveRefreshIntervalMs] = useState<LiveRefreshIntervalMs>(15_000)
  const [savingCreate, setSavingCreate] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const createInFlight = useRef(false)
  const editableFormsInitialized = useRef(false)
  const [busyListingIds, setBusyListingIds] = useState<string[]>([])
  const busyListingRef = useRef(new Set<string>())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ offeringType: 'PRODUCT', offeringDetails: {} as Record<string, string | boolean>, title: '', category: 'OTHER', description: '', imageUrls: '', videoUrls: '', externalLinks: '', quantity: '', minOrderQuantity: '', unit: '', price: '', currency: 'INR', priceTiers: '' })
  const activeOfferingDefinition = offeringDefinitions.find((definition) => definition.type === form.offeringType)
  const activeEditOfferingDefinition = offeringDefinitions.find((definition) => definition.type === editForm.offeringType)

  useEffect(() => {
    let active = true
    void api.marketplaceOfferingTypes().then((definitions) => {
      if (active && Array.isArray(definitions)) setOfferingDefinitions(definitions)
    }).catch(() => {
      if (active) setOfferingDefinitions([])
    })
    return () => { active = false }
  }, [])

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [publicListings, categories, ownListings, ownOrders, crops, livestock, farms, inventoryItems, policy, reviewQueue, history, cases, restrictions, flags, publicFlags, statement, holds, reconciliation, taxRows, profile, visibilityPolicy, savedFavorites, inbox, myRFQRows, openRFQRows] = await Promise.all([
        api.marketplaceListings(),
        api.marketplaceCategories(),
        token ? api.marketplaceMine(token) : Promise.resolve([]),
        token ? api.marketplaceOrders(token) : Promise.resolve([]),
        token ? api.crops(token) : Promise.resolve([]),
        token ? api.livestock(token) : Promise.resolve([]),
        token ? api.farms(token) : Promise.resolve([]),
        token ? api.inventoryItems(token).catch(() => []) : Promise.resolve([]),
        api.marketplaceCommercePolicy(),
        token && canManageCommercePolicy ? api.marketplaceReviewQueue(token) : Promise.resolve([]),
        token ? api.marketplaceHistory(token) : Promise.resolve(null),
        token ? api.marketplaceTrustCases(token) : Promise.resolve([]),
        token && canManageCommercePolicy ? api.marketplaceRestrictions(token) : Promise.resolve([]),
        token && canManageCommercePolicy ? api.marketplaceFeatureFlags(token) : Promise.resolve([]),
        api.marketplacePublicFeatureFlags(),
        token ? api.marketplaceSettlementStatement(token) : Promise.resolve(null),
        token && canManageCommercePolicy ? api.marketplacePayoutHolds(token) : Promise.resolve([]),
        token && canManageCommercePolicy ? api.marketplaceReconciliationRuns(token) : Promise.resolve([]),
        token && canManageCommercePolicy ? api.marketplaceTaxProfiles(token) : Promise.resolve([]),
        token ? api.marketplaceSellerProfile(token) : Promise.resolve(null),
        token && canManageCommercePolicy ? api.marketplaceSellerProfileVisibilityPolicy(token).catch(() => ({defaultVisible:true,rules:[]})) : Promise.resolve({defaultVisible:true,rules:[]}),
        token ? api.marketplaceFavorites(token) : Promise.resolve([]),
        token ? api.marketplaceMessages(token) : Promise.resolve([]),
        token ? api.marketplaceMyRFQs(token) : Promise.resolve([]),
        token ? api.marketplaceOpenRFQs(token) : Promise.resolve([]),
      ])
      setPublished(publicListings)
      setCategoryOptions(categories)
      setInventoryChoices(inventoryItems.map((item: any) => ({ id: item.id, label: item.name + ' · ' + item.quantityOnHand + ' ' + item.unit + ' available' })))
      setMine(ownListings)
      setOrders(ownOrders)
      setCommercePolicy(policy)
      setPendingReviews(reviewQueue)
      setCommerceHistory(history)
      setSettlementStatement(statement)
      setPayoutHolds(holds)
      setReconciliationRuns(reconciliation)
      setTaxProfiles(taxRows)
      setSellerProfile(profile)
      setProfileVisibilityPolicy(visibilityPolicy)
      if (!editableFormsInitialized.current) {
        setSellerProfileForm({ displayName: profile?.profile?.displayName || '', bio: profile?.profile?.bio || '', regionLabel: profile?.profile?.regionLabel || '', contactPreference: profile?.profile?.contactPreference || 'IN_APP', publicPhone: profile?.profile?.publicPhone || '', showPhone: Boolean(profile?.profile?.showPhone) })
      }
      setFavorites(savedFavorites)
      setMessages(inbox)
      setMyRFQs(myRFQRows)
      setOpenRFQs(openRFQRows)
      setTrustCases(cases)
      setActiveRestrictions(restrictions)
      setFeatureFlags(flags)
      setPublicFeatureFlags(publicFlags)
      if (!editableFormsInitialized.current) {
        setPolicyForm({ feesEnabled: Boolean(policy.feesEnabled), buyerFeePercent: String(policy.buyerFeePercent ?? 0), sellerCommissionPercent: String(policy.sellerCommissionPercent ?? 0), taxEnabled: Boolean(policy.taxEnabled), taxPercent: String(policy.taxPercent ?? 0), taxReviewReference: String(policy.taxReviewReference || '') })
        editableFormsInitialized.current = true
      }
      setCropChoices(crops.map((item: any) => ({ id: item.id, farmId: item.farmId, label: [item.name || item.cropName || 'Crop', item.farm?.name].filter(Boolean).join(' · ') })))
      setFarmChoices(farms.filter((item: any) => !item.deletedAt).map((item: any) => ({ id: item.id, label: item.name || 'Farm' })))
      setLivestockChoices(livestock.map((item: any) => ({ id: item.id, label: [item.name || item.species || 'Livestock', item.farm?.name].filter(Boolean).join(' · ') })))
      setAssetChoices(farms.flatMap((farm: any) => (farm.assets || []).filter((item: any) => !item.deletedAt).map((item: any) => ({ id: item.id, label: [(item.name || item.type || 'Farm asset'), farm.name].filter(Boolean).join(' · ') }))))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load marketplace.')
    } finally { setLoading(false) }
  }, [token])
  useEffect(() => { void load() }, [load])
  useLiveRefresh(load, { enabled: Boolean(token) && liveRefreshEnabled, intervalMs: liveRefreshIntervalMs })

  const visiblePublished = useMemo(
    () => filterPublishedMarketplaceListings(published, browsePeriod, browseCategory),
    [published, browsePeriod, browseCategory],
  )

  const featureEnabledForUi = (key: string) => {
    const saved = publicFeatureFlags.find((item: any) => item.key === key)
    if (saved) return Boolean(saved.enabled)
    return ['marketplace.listings', 'marketplace.offers', 'marketplace.reviews', 'marketplace.trust_reports', 'marketplace.restrictions', 'marketplace.history', 'marketplace.orders', 'marketplace.favorites', 'marketplace.messaging', 'marketplace.rfq', 'marketplace.inventory_workspace', 'marketplace.finance_workspace'].includes(key)
  }


  async function toggleMarketplaceFeature(flag: any) {
    if (!token || !canManageCommercePolicy || featureBusyKeys.includes(flag.key)) return
    const reason = (featureReasons[flag.key] || '').trim()
    if (!reason) { setError('Enter a reason before changing feature ' + flag.title + '.'); return }
    setFeatureBusyKeys(previous => [...previous, flag.key]); setError('')
    try { await api.updateMarketplaceFeatureFlag(flag.key, !flag.enabled, reason, token); setFeatureReasons(previous => ({ ...previous, [flag.key]: '' })); await load() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to change Marketplace feature flag.') }
    finally { setFeatureBusyKeys(previous => previous.filter(key => key !== flag.key)) }
  }

  async function runMarketplaceReconciliation() {
    if (!token || currentUserRole !== 'SUPER_ADMIN' || reconciliationBusy) return
    setReconciliationBusy(true); setError('')
    try { await api.runMarketplaceReconciliation(token); setReconciliationRuns(await api.marketplaceReconciliationRuns(token)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to run reconciliation.') }
    finally { setReconciliationBusy(false) }
  }

  async function createPayoutHold(order: any) {
    if (!token || currentUserRole !== 'SUPER_ADMIN' || holdBusyIds.includes(order.id)) return
    const reason=(createHoldReasons[order.id]||'').trim()
    if(reason.length<5){setError('Provide a payout hold reason of at least five characters.');return}
    setHoldBusyIds(prev=>[...prev,order.id])
    try { await api.createMarketplacePayoutHold(order.id,reason,token); setCreateHoldReasons(prev=>({...prev,[order.id]:''})); await load() }
    catch(cause){setError(cause instanceof Error?cause.message:'Unable to create payout hold.')}
    finally{setHoldBusyIds(prev=>prev.filter(id=>id!==order.id))}
  }

  async function releasePayoutHold(hold: any) {
    if (!token || currentUserRole !== 'SUPER_ADMIN' || holdBusyIds.includes(hold.id)) return
    const reason = (holdReasons[hold.id] || '').trim()
    if (reason.length < 5) { setError('Enter a release reason of at least five characters.'); return }
    setHoldBusyIds(prev => [...prev, hold.id])
    try { await api.releaseMarketplacePayoutHold(hold.id, reason, token); setHoldReasons(prev => ({...prev,[hold.id]:''})); await load() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to release payout hold.') }
    finally { setHoldBusyIds(prev => prev.filter(id => id !== hold.id)) }
  }

  async function saveProfileVisibilityPolicy() {
    if (!token || !canManageCommercePolicy || visibilityBusy) return
    if (!visibilityReason.trim()) { setError('Enter a reason for changing seller profile visibility.'); return }
    setVisibilityBusy(true)
    try {
      const saved = await api.updateMarketplaceSellerProfileVisibilityPolicy({ ...profileVisibilityPolicy, reason: visibilityReason.trim() }, token)
      setProfileVisibilityPolicy(saved)
      setVisibilityReason('')
      setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save seller profile visibility policy.') }
    finally { setVisibilityBusy(false) }
  }
  function addProfileVisibilityRule() {
    const split = (value:string) => value.split(',').map(part => part.trim()).filter(Boolean)
    setProfileVisibilityPolicy(current => ({...current,rules:[...current.rules,{id:'rule-'+Date.now(),visible:visibilityRuleDraft.visible,userIds:split(visibilityRuleDraft.userIds),modules:split(visibilityRuleDraft.modules),categories:split(visibilityRuleDraft.categories)}]}))
    setVisibilityRuleDraft({visible:false,userIds:'',modules:'marketplace',categories:''})
  }

  async function saveSellerProfile(event: React.FormEvent) {
    event.preventDefault()
    if(!token||sellerProfileBusy)return
    setSellerProfileBusy(true);setError('')
    try { const saved=await api.updateMarketplaceSellerProfile(sellerProfileForm,token);setSellerProfile({ ...(sellerProfile || {}), profile: saved });setSellerProfileForm({ ...sellerProfileForm, publicPhone: saved.publicPhone || sellerProfileForm.publicPhone }); }
    catch(cause){setError(cause instanceof Error?cause.message:'Unable to update seller profile.')}
    finally{setSellerProfileBusy(false)}
  }
  async function toggleFavorite(item: Listing) {
    if(!token||favoriteBusyIds.includes(item.id))return
    setFavoriteBusyIds(prev=>[...prev,item.id])
    try { if(favorites.some((f:any)=>f.listingId===item.id&&f.status==='ACTIVE')) await api.removeMarketplaceFavorite(item.id,token); else await api.addMarketplaceFavorite(item.id,token); setFavorites(await api.marketplaceFavorites(token)) }
    catch(cause){setError(cause instanceof Error?cause.message:'Unable to update favorites.')}
    finally{setFavoriteBusyIds(prev=>prev.filter(id=>id!==item.id))}
  }
  async function sendMarketplaceMessage(event: React.FormEvent) {
    event.preventDefault()
    if(!token||messageBusy||!messageForm.recipientId||!messageForm.body.trim())return
    setMessageBusy(true);setError('')
    try { await api.sendMarketplaceMessage(messageForm,token);setMessageForm(prev=>({...prev,body:''}));setMessages(await api.marketplaceMessages(token)) }
    catch(cause){setError(cause instanceof Error?cause.message:'Unable to send message.')}
    finally{setMessageBusy(false)}
  }
  async function markMarketplaceMessageRead(message:any) {
    if(!token||message.recipientId!==currentUserId||message.readAt)return
    try { await api.readMarketplaceMessage(message.id,token);setMessages(await api.marketplaceMessages(token)) }
    catch(cause){setError(cause instanceof Error?cause.message:'Unable to mark message read.')}
  }
  async function createMarketplaceRFQ(event: React.FormEvent) {
    event.preventDefault()
    if(!token||rfqBusy)return
    setRfqBusy(true);setError('')
    try { await api.createMarketplaceRFQ({...rfqForm,quantity:Number(rfqForm.quantity),targetUnitPrice:rfqForm.targetUnitPrice?Number(rfqForm.targetUnitPrice):undefined,neededBy:rfqForm.neededBy?new Date(rfqForm.neededBy).toISOString():undefined},token);setRfqForm(prev=>({...prev,title:'',description:'',quantity:'',targetUnitPrice:''}));setMyRFQs(await api.marketplaceMyRFQs(token));setOpenRFQs(await api.marketplaceOpenRFQs(token)) }
    catch(cause){setError(cause instanceof Error?cause.message:'Unable to create bulk RFQ.')}
    finally{setRfqBusy(false)}
  }
  async function respondToMarketplaceRFQ(rfq:any) {
    if(!token||rfqBusy)return
    const response=rfqResponses[rfq.id]||{unitPrice:'',availableQuantity:'',note:'',validUntil:''}
    if(!response.unitPrice||!response.availableQuantity){setError('Enter quotation unit price and available quantity.');return}
    setRfqBusy(true);setError('')
    try { await api.respondMarketplaceRFQ(rfq.id,{unitPrice:Number(response.unitPrice),availableQuantity:Number(response.availableQuantity),note:response.note||undefined,validUntil:response.validUntil?new Date(response.validUntil).toISOString():undefined},token);setRfqResponses(prev=>({...prev,[rfq.id]:{unitPrice:'',availableQuantity:'',note:'',validUntil:''}}));setMyRFQs(await api.marketplaceMyRFQs(token));setOpenRFQs(await api.marketplaceOpenRFQs(token)) }
    catch(cause){setError(cause instanceof Error?cause.message:'Unable to submit RFQ quotation.')}
    finally{setRfqBusy(false)}
  }
  async function decideMarketplaceRFQ(rfq:any,response:any,status:'ACCEPTED'|'REJECTED') {
    if(!token||rfqBusy)return
    const reason=(rfqDecisionReasons[response.id]||'').trim()
    if(reason.length<3){setError('Enter a short reason for the quotation decision.');return}
    setRfqBusy(true);setError('')
    try { await api.decideMarketplaceRFQResponse(rfq.id,response.id,status,reason,token);setMyRFQs(await api.marketplaceMyRFQs(token));setOpenRFQs(await api.marketplaceOpenRFQs(token)) }
    catch(cause){setError(cause instanceof Error?cause.message:'Unable to record RFQ decision.')}
    finally{setRfqBusy(false)}
  }

  async function saveTaxProfile(event: React.FormEvent) {
    event.preventDefault()
    if (!token || !canManageCommercePolicy || taxProfileBusy) return
    setTaxProfileBusy(true); setError('')
    try {
      await api.createMarketplaceTaxProfile({ ...taxProfileForm, taxPercent: Number(taxProfileForm.taxPercent), effectiveFrom: new Date(taxProfileForm.effectiveFrom).toISOString(), effectiveTo: taxProfileForm.effectiveTo ? new Date(taxProfileForm.effectiveTo).toISOString() : undefined }, token)
      setTaxProfileForm(prev => ({ ...prev, taxCode: '', taxName: '' }))
      setTaxProfiles(await api.marketplaceTaxProfiles(token))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save tax profile draft.') }
    finally { setTaxProfileBusy(false) }
  }
  async function saveCommercePolicy(event: React.FormEvent) {
    event.preventDefault()
    if (!token || !canManageCommercePolicy || policySaving) return
    setPolicySaving(true); setError('')
    try {
      const updated = await api.updateMarketplaceCommercePolicy({ feesEnabled: policyForm.feesEnabled, buyerFeePercent: Number(policyForm.buyerFeePercent), sellerCommissionPercent: Number(policyForm.sellerCommissionPercent), taxEnabled: policyForm.taxEnabled, taxPercent: Number(policyForm.taxPercent), taxReviewReference: policyForm.taxReviewReference.trim() || undefined }, token)
      setCommercePolicy(updated)
      setPolicyForm(previous => ({ ...previous, feesEnabled: Boolean(updated.feesEnabled), buyerFeePercent: String(updated.buyerFeePercent), sellerCommissionPercent: String(updated.sellerCommissionPercent), taxEnabled: Boolean(updated.taxEnabled), taxPercent: String(updated.taxPercent), taxReviewReference: String(updated.taxReviewReference || '') }))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save marketplace commerce policy.') }
    finally { setPolicySaving(false) }
  }

  async function uploadListingMedia(files: FileList | null, kind: 'images' | 'videos') {
    if (!token || !files?.length || uploadingMedia) return
    const selected = Array.from(files)
    const field = kind === 'images' ? 'imageUrls' : 'videoUrls'
    const limit = kind === 'images' ? 8 : 4
    const existing = form[field].split(',').map(value => value.trim()).filter(Boolean)
    if (existing.length + selected.length > limit) { setError('A listing supports up to ' + limit + ' ' + kind + '.'); return }
    setUploadingMedia(true); setError('')
    const results = await Promise.allSettled(selected.map(file => api.uploadMarketplaceMedia(file, kind, token)))
    const urls = results.flatMap(result => result.status === 'fulfilled' ? [result.value.url] : [])
    if (urls.length) setForm(previous => ({ ...previous, [field]: [previous[field], ...urls].filter(Boolean).join(', ') }))
    const failures = results.filter(result => result.status === 'rejected')
    if (failures.length) setError(failures.map(result => result.status === 'rejected' ? result.reason instanceof Error ? result.reason.message : 'Media upload failed.' : '').join(' '))
    setUploadingMedia(false)
  }

  async function create(event: React.FormEvent) {
    event.preventDefault()
    if (createInFlight.current || !token || (form.resourceType !== 'generic' && !form.resourceId.trim()) || !form.title.trim()) return
    createInFlight.current = true
    setSavingCreate(true)
    setError('')
    try {
      const details = Object.fromEntries(Object.entries(form.offeringDetails)
        .filter(([, value]) => value !== '' && value !== undefined && value !== null)
        .map(([key, value]) => [key, activeOfferingDefinition?.fields.find((field) => field.key === key)?.type === 'number' ? Number(value) : value]))
      await api.createMarketplaceListing({
        resourceType: form.resourceType === 'generic' ? undefined : form.resourceType,
        resourceId: form.resourceType === 'generic' ? undefined : form.resourceId.trim(),
        offeringType: form.offeringType,
        offeringDetails: Object.keys(details).length ? details : undefined,
        category: form.category, imageUrls: form.imageUrls.split(',').map((url) => url.trim()).filter(Boolean), videoUrls: form.videoUrls.split(',').map((url) => url.trim()).filter(Boolean), externalLinks: form.externalLinks.split(',').map((url) => url.trim()).filter(Boolean),
        title: form.title.trim(), description: form.description.trim() || undefined, priceTiers: featureEnabledForUi('marketplace.wholesale_pricing') ? parsePriceTiers(form.priceTiers) : undefined,
        quantity: form.quantity ? Number(form.quantity) : undefined, minOrderQuantity: form.minOrderQuantity ? Number(form.minOrderQuantity) : undefined,
        unit: form.unit.trim() || undefined, price: form.price ? Number(form.price) : undefined,
      }, token)
      setForm((v) => ({ ...v, resourceId: '', title: '', description: '', imageUrls: '', videoUrls: '', externalLinks: '', quantity: '', minOrderQuantity: '', unit: '', price: '', priceTiers: '', offeringDetails: {} }))
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to create listing.') }
    finally { createInFlight.current = false; setSavingCreate(false) }
  }

  async function calculateOrderQuote(item: Listing) {
    if (!token || quoteBusyIds.includes(item.id)) return
    const quantity = (orderQuantities[item.id] || '1').trim()
    const offerPrice = (orderOfferPrices[item.id] || '').trim()
    if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0) { setError('Enter an order quantity greater than zero.'); return }
    if (item.minOrderQuantity != null && Number(quantity) < item.minOrderQuantity) { setError('This seller requires a minimum order of ' + item.minOrderQuantity + ' ' + (item.unit || 'units') + '.'); return }
    if (offerPrice && (!Number.isFinite(Number(offerPrice)) || Number(offerPrice) < 0)) { setError('Offer price must be zero or greater.'); return }
    setQuoteBusyIds(previous => [...previous, item.id]); setError('')
    try {
      const quote = await api.marketplaceQuote(item.id, { quantity: Number(quantity), offerPrice: offerPrice ? Number(offerPrice) : undefined }, token)
      setOrderQuotes(previous => ({ ...previous, [item.id]: { quantity, offerPrice, quote } }))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to calculate the marketplace quote.') }
    finally { setQuoteBusyIds(previous => previous.filter(id => id !== item.id)) }
  }

  async function shareListing(item: Listing, channel: 'copy' | 'whatsapp' | 'email') {
    const url = window.location.origin + '/app/marketplace#listing-' + encodeURIComponent(item.id)
    const text = item.title + (item.description ? ' — ' + item.description.slice(0, 180) : '') + ' | KrishiKendram: ' + url
    try {
      if (channel === 'copy') {
        await navigator.clipboard.writeText(url)
        setError('')
      } else if (channel === 'whatsapp') {
        window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener,noreferrer')
      } else {
        window.location.href = 'mailto:?subject=' + encodeURIComponent(item.title) + '&body=' + encodeURIComponent(text)
      }
    } catch {
      setError('Unable to copy the listing link here. Use the listing URL from your browser address bar.')
    }
  }

  async function placeOrder(item: Listing) {
    if (!token || orderBusyIds.includes(item.id)) return
    const quantity = Number(orderQuantities[item.id] || '1')
    if (!Number.isFinite(quantity) || quantity <= 0) { setError('Enter an order quantity greater than zero.'); return }
    if (item.minOrderQuantity != null && quantity < item.minOrderQuantity) { setError('This seller requires a minimum order of ' + item.minOrderQuantity + ' ' + (item.unit || 'units') + '.'); return }
    setOrderBusyIds(previous => [...previous, item.id]); setError('')
    try {
      const rawOffer = orderOfferPrices[item.id]?.trim() || ''
      const offerPrice = rawOffer ? Number(rawOffer) : undefined
      if (offerPrice !== undefined && (!Number.isFinite(offerPrice) || offerPrice < 0)) { setError('Offer price must be zero or greater.'); setOrderBusyIds(previous => previous.filter(id => id !== item.id)); return }
      const contextAnswers = orderContextAnswers[item.id] || {}
      if (item.contextPolicyKey === 'AGRI_INPUT_USAGE' && (!contextAnswers.intendedCrop?.trim() || !contextAnswers.region?.trim())) {
        setError('Before requesting this agricultural input, tell KK the intended crop and use location so product-use guidance can be relevant.')
        setOrderBusyIds(previous => previous.filter(id => id !== item.id))
        return
      }
      const contextLink = orderContextLinks[item.id]
      if (item.contextPolicyKey === 'AGRI_INPUT_USAGE' && contextLink?.consent && !contextLink.farmId && !contextLink.cropId) {
        setError('Choose a farm or crop record to link, or leave the optional link consent unchecked.')
        setOrderBusyIds(previous => previous.filter(id => id !== item.id))
        return
      }
      await api.createMarketplaceOrder(item.id, {
        quantity, offerPrice, note: orderNotes[item.id]?.trim() || undefined,
        ...(item.contextPolicyKey === 'AGRI_INPUT_USAGE' ? { contextAnswers: { ...contextAnswers } } : {}),
        ...(item.contextPolicyKey === 'AGRI_INPUT_USAGE' && contextLink?.consent && (contextLink.farmId || contextLink.cropId) ? {
          consentToLinkContext: true,
          ...(contextLink.farmId ? { contextFarmId: contextLink.farmId } : {}),
          ...(contextLink.cropId ? { contextCropId: contextLink.cropId } : {}),
        } : {}),
      }, token)
      setOrderQuantities(previous => ({ ...previous, [item.id]: '' }))
      setOrderNotes(previous => ({ ...previous, [item.id]: '' }))
      setOrderOfferPrices(previous => ({ ...previous, [item.id]: '' }))
      setOrderContextLinks(previous => ({ ...previous, [item.id]: { consent: false, farmId: '', cropId: '' } }))
      setOrderQuotes(previous => { const next = { ...previous }; delete next[item.id]; return next })
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to place order request.') }
    finally { setOrderBusyIds(previous => previous.filter(id => id !== item.id)) }
  }

  async function submitTrustCase(event: React.FormEvent) {
    event.preventDefault()
    if (!token || trustBusy || !trustForm.description.trim()) return
    setTrustBusy(true); setError('')
    try {
      await api.createMarketplaceTrustCase({ type: trustForm.type, category: trustForm.category, appealOfCaseId: trustForm.type === 'APPEAL' ? trustForm.appealOfCaseId || undefined : undefined, description: trustForm.description.trim(), listingId: trustForm.listingId || undefined, orderId: trustForm.orderId || undefined, evidenceUrls: trustForm.evidenceUrls.split(',').map(v => v.trim()).filter(Boolean) }, token)
      setTrustForm(previous => ({ ...previous, description: '', evidenceUrls: '' }))
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to submit Marketplace report.') }
    finally { setTrustBusy(false) }
  }

  async function decideTrustCase(item: any, status: 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED') {
    if (!token || !canManageCommercePolicy) return
    const decision = trustDecisions[item.id] || { status, resolution: '', restrictionScope: '', restrictionDays: '30', cautionRating: '3' }
    if (!decision.resolution.trim()) { setError('Add a reason for the trust-case decision.'); return }
    if (status === 'RESOLVED' && decision.restrictionScope && !item.targetUserId) { setError('This case has no target user to restrict.'); return }
    setTrustBusy(true); setError('')
    try {
      await api.resolveMarketplaceTrustCase(item.id, { status, resolution: decision.resolution.trim(), ...(status === 'RESOLVED' && decision.restrictionScope ? { restrictionUserId: item.targetUserId, restrictionScope: decision.restrictionScope, restrictionDays: Number(decision.restrictionDays) || undefined, ...(decision.restrictionScope === 'CAUTION' ? { cautionRating: Number(decision.cautionRating) } : {}) } : {}) }, token)
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to record trust-case decision.') }
    finally { setTrustBusy(false) }
  }

  async function submitReview(order: any) {
    if (!token || orderBusyIds.includes(order.id)) return
    const rating = Number(reviewRatings[order.id] || '5')
    setOrderBusyIds(previous => [...previous, order.id]); setError('')
    try {
      await api.createMarketplaceReview(order.id, { rating, comment: reviewComments[order.id]?.trim() || undefined }, token)
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to submit review.') }
    finally { setOrderBusyIds(previous => previous.filter(id => id !== order.id)) }
  }

  async function respondToReview(review: any) {
    if (!token || !reviewResponses[review.id]?.trim()) return
    setError('')
    try { await api.respondMarketplaceReview(review.id, reviewResponses[review.id].trim(), token); await load() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to respond to review.') }
  }

  async function moderateReview(review: any, status: 'PUBLISHED' | 'REJECTED' | 'HIDDEN') {
    if (!token) return
    try { await api.moderateMarketplaceReview(review.id, status, token); await load() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to moderate review.') }
  }

  function deliveryFormFor(order: any) {
    return deliveryForms[order.id] || { status: order.deliveryStatus || 'PREPARING', carrier: order.deliveryCarrier || '', trackingNumber: order.deliveryTrackingNumber || '', trackingUrl: order.deliveryTrackingUrl || '', estimatedDeliveryAt: order.estimatedDeliveryAt ? new Date(order.estimatedDeliveryAt).toISOString().slice(0, 10) : '' }
  }

  async function saveDelivery(order: any) {
    if (!token || orderBusyIds.includes(order.id)) return
    const form = deliveryFormFor(order)
    if (form.trackingUrl && !form.trackingUrl.startsWith('https://')) { setError('Carrier tracking links must start with https://.'); return }
    setOrderBusyIds(previous => [...previous, order.id]); setError('')
    try {
      await api.updateMarketplaceDelivery(order.id, { status: form.status, carrier: form.carrier.trim() || undefined, trackingNumber: form.trackingNumber.trim() || undefined, trackingUrl: form.trackingUrl.trim() || undefined, estimatedDeliveryAt: form.estimatedDeliveryAt || undefined }, token)
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update delivery tracking.') }
    finally { setOrderBusyIds(previous => previous.filter(id => id !== order.id)) }
  }

  async function confirmDelivery(order: any) {
    if (!token || orderBusyIds.includes(order.id)) return
    setOrderBusyIds(previous => [...previous, order.id]); setError('')
    try { await api.confirmMarketplaceDelivery(order.id, token); await load() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to confirm delivery.') }
    finally { setOrderBusyIds(previous => previous.filter(id => id !== order.id)) }
  }

  async function submitCounterOffer(order: any) {
    if (!token || orderBusyIds.includes(order.id)) return
    const raw = (counterOfferPrices[order.id] || '').trim()
    const counterOfferPrice = Number(raw)
    if (!raw || !Number.isFinite(counterOfferPrice) || counterOfferPrice < 0) { setError('Enter a valid counter-offer price.'); return }
    setOrderBusyIds(previous => [...previous, order.id]); setError('')
    try {
      await api.counterOfferMarketplaceOrder(order.id, { counterOfferPrice, note: counterOfferNotes[order.id]?.trim() || undefined }, token)
      setCounterOfferPrices(previous => ({ ...previous, [order.id]: '' }))
      setCounterOfferNotes(previous => ({ ...previous, [order.id]: '' }))
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to send counter-offer.') }
    finally { setOrderBusyIds(previous => previous.filter(id => id !== order.id)) }
  }

  async function createSandboxPaymentIntent(order: any) {
    if (!token || sandboxPaymentBusyIds.includes(order.id)) return
    const idempotencyKey = sandboxPaymentKeys[order.id] || crypto.randomUUID()
    setSandboxPaymentKeys(previous => ({ ...previous, [order.id]: idempotencyKey }))
    setSandboxPaymentBusyIds(previous => [...previous, order.id])
    setError('')
    try {
      await api.createMarketplaceSandboxPaymentIntent(order.id, idempotencyKey, token)
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to create sandbox payment intent.') }
    finally { setSandboxPaymentBusyIds(previous => previous.filter(id => id !== order.id)) }
  }

  async function createSandboxRefund(order: any, remaining: number) {
    if (!token || sandboxRefundBusyIds.includes(order.id)) return
    const amount = (sandboxRefundAmounts[order.id] || String(remaining)).trim()
    const reason = (sandboxRefundReasons[order.id] || '').trim()
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0 || Number(amount) > remaining) { setError('Refund amount must be positive and no greater than the remaining captured amount.'); return }
    if (reason.length < 5) { setError('Add a refund reason of at least five characters.'); return }
    const idempotencyKey = sandboxRefundKeys[order.id] || crypto.randomUUID()
    setSandboxRefundKeys(previous => ({ ...previous, [order.id]: idempotencyKey }))
    setSandboxRefundBusyIds(previous => [...previous, order.id]); setError('')
    try {
      await api.createMarketplaceSandboxRefund(order.id, { idempotencyKey, amount, reason }, token)
      setSandboxRefundKeys(previous => ({ ...previous, [order.id]: '' }))
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to request sandbox refund.') }
    finally { setSandboxRefundBusyIds(previous => previous.filter(id => id !== order.id)) }
  }

  async function createSandboxChargeback(order: any, remaining: number) {
    if (!token || sandboxChargebackBusyIds.includes(order.id)) return
    const amount = (sandboxChargebackAmounts[order.id] || String(remaining)).trim()
    const reason = (sandboxChargebackReasons[order.id] || '').trim()
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0 || Number(amount) > remaining) { setError('Chargeback amount must be positive and no greater than the unrefunded captured amount.'); return }
    if (reason.length < 5) { setError('Add a chargeback reason of at least five characters.'); return }
    const idempotencyKey = sandboxChargebackKeys[order.id] || crypto.randomUUID()
    setSandboxChargebackKeys(previous => ({ ...previous, [order.id]: idempotencyKey }))
    setSandboxChargebackBusyIds(previous => [...previous, order.id]); setError('')
    try {
      await api.createMarketplaceSandboxChargeback(order.id, { idempotencyKey, amount, reason }, token)
      setSandboxChargebackKeys(previous => ({ ...previous, [order.id]: '' }))
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to open sandbox chargeback.') }
    finally { setSandboxChargebackBusyIds(previous => previous.filter(id => id !== order.id)) }
  }

  async function submitSandboxChargebackEvidence(chargeback: any) {
    if (!token || sandboxChargebackEvidenceBusyIds.includes(chargeback.id)) return
    const urls = (sandboxChargebackEvidence[chargeback.id] || '').split(',').map(value => value.trim()).filter(Boolean)
    if (!urls.length || urls.some(value => !value.startsWith('https://'))) { setError('Provide one or more HTTPS evidence links.'); return }
    setSandboxChargebackEvidenceBusyIds(previous => [...previous, chargeback.id]); setError('')
    try {
      await api.submitMarketplaceSandboxChargebackEvidence(chargeback.id, urls, token)
      setSandboxChargebackEvidence(previous => ({ ...previous, [chargeback.id]: '' }))
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to submit chargeback evidence.') }
    finally { setSandboxChargebackEvidenceBusyIds(previous => previous.filter(id => id !== chargeback.id)) }
  }

  async function updateOrder(item: any, action: 'accept' | 'reject' | 'cancel' | 'complete' | 'confirm-price') {
    if (!token || orderBusyIds.includes(item.id)) return
    setOrderBusyIds(previous => [...previous, item.id]); setError('')
    try {
      const rawAgreed = orderAgreedPrices[item.id]?.trim() || ''
      const agreedUnitPrice = action === 'accept' && rawAgreed ? Number(rawAgreed) : undefined
      if (agreedUnitPrice !== undefined && (!Number.isFinite(agreedUnitPrice) || agreedUnitPrice < 0)) { setError('Agreed price must be zero or greater.'); return }
      await api.marketplaceOrderAction(item.id, action, { agreedUnitPrice }, token); await load()
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update order.') }
    finally { setOrderBusyIds(previous => previous.filter(id => id !== item.id)) }
  }

  function beginEdit(item: Listing) {
    setEditingId(item.id)
    setEditForm({ offeringType: item.offeringType || 'PRODUCT', offeringDetails: Object.fromEntries(Object.entries(item.offeringDetails || {}).map(([key, value]) => [key, typeof value === 'boolean' ? value : String(value)])), title: item.title, category: item.category || 'OTHER', description: item.description || '', imageUrls: item.imageUrls?.join(', ') || '', videoUrls: item.videoUrls?.join(', ') || '', externalLinks: item.externalLinks?.join(', ') || '', quantity: item.quantity?.toString() || '', minOrderQuantity: item.minOrderQuantity?.toString() || '', unit: item.unit || '', price: item.price?.toString() || '', currency: item.currency || 'INR', priceTiers: item.priceTiers?.map(t => t.minQuantity + ':' + t.unitPrice).join(', ') || '' })
  }

  async function saveEdit(id: string) {
    if (busyListingRef.current.has(id) || !token || !editForm.title.trim()) return
    busyListingRef.current.add(id)
    setBusyListingIds(previous => [...previous, id])
    setError('')
    try {
      const details = Object.fromEntries(Object.entries(editForm.offeringDetails)
        .filter(([, value]) => value !== '' && value !== undefined && value !== null)
        .map(([key, value]) => [key, activeEditOfferingDefinition?.fields.find((field) => field.key === key)?.type === 'number' ? Number(value) : value]))
      await api.updateMarketplaceListing(id, { offeringType: editForm.offeringType, offeringDetails: details, title: editForm.title.trim(), category: editForm.category, priceTiers: featureEnabledForUi('marketplace.wholesale_pricing') ? parsePriceTiers(editForm.priceTiers) : undefined, imageUrls: editForm.imageUrls.split(',').map((url) => url.trim()).filter(Boolean), videoUrls: editForm.videoUrls.split(',').map((url) => url.trim()).filter(Boolean), externalLinks: editForm.externalLinks.split(',').map((url) => url.trim()).filter(Boolean), description: editForm.description.trim() || undefined, quantity: editForm.quantity ? Number(editForm.quantity) : undefined, minOrderQuantity: editForm.minOrderQuantity ? Number(editForm.minOrderQuantity) : undefined, unit: editForm.unit.trim() || undefined, price: editForm.price ? Number(editForm.price) : undefined, currency: editForm.currency.trim().toUpperCase() }, token)
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

  const resourceChoices = form.resourceType === 'crop'
    ? cropChoices
    : form.resourceType === 'livestock'
      ? livestockChoices
      : form.resourceType === 'farmAsset' ? assetChoices
      : form.resourceType === 'inventoryItem' ? inventoryChoices : []

  if (activeWorkspace !== 'marketplace') {
    const workspaceFlag = activeWorkspace === 'inventory' ? 'marketplace.inventory_workspace' : 'marketplace.finance_workspace'
    if (!featureEnabledForUi(workspaceFlag)) {
      return <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">Marketplace workspace disabled</h1><Button variant="outline" onClick={() => selectWorkspace('marketplace')}>Back to Marketplace</Button></div>
        <div role="alert" className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">This workspace is currently disabled by an administrator. Existing records are preserved.</div>
      </div>
    }
    return <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-2xl font-semibold"><Store className="h-6 w-6" />Marketplace</div><p className="mt-1 text-sm text-muted-foreground">One commercial workspace for listings, stock and finance. Inventory and finance use the existing authorized services and records.</p></div><Button variant="outline" onClick={() => selectWorkspace('marketplace')}>Back to Marketplace</Button></div>
      <MarketplaceWorkspaceTabs active={activeWorkspace} onSelect={selectWorkspace} inventoryEnabled={featureEnabledForUi('marketplace.inventory_workspace')} financeEnabled={featureEnabledForUi('marketplace.finance_workspace')} />
      {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">{error}</div>}
      {activeWorkspace === 'inventory' ? <InventoryPage /> : <>
        <FinancePage />
        <section className="rounded-xl border bg-card p-4"><h2 className="font-semibold">Marketplace commercial finance</h2><p className="mt-1 text-sm text-muted-foreground">Sales history, provisional settlement statements, fee/tax policy and reconciliation live here alongside the farm income/expense ledger. Figures are estimates until verified payment capture and settlement are connected.</p></section>
        {token && commerceHistory && commerceHistory.enabled !== false && <section className="rounded-xl border bg-card p-4"><h2 className="font-semibold">Buyer & seller history</h2><p className="mt-1 text-xs text-muted-foreground">Historical order totals are based on saved quotes. Seller net is an estimate until payment and settlement reconciliation are connected.</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="rounded-lg bg-muted/40 p-3"><div className="text-sm font-medium">My purchases</div><div className="mt-1 text-2xl font-semibold">{commerceHistory.purchases?.count ?? 0}</div><div className="text-xs text-muted-foreground">Completed: {commerceHistory.purchases?.completedCount ?? 0} · Buyer total: INR {commerceHistory.purchases?.completedBuyerTotal ?? '0.00'}</div></div><div className="rounded-lg bg-muted/40 p-3"><div className="text-sm font-medium">My sales</div><div className="mt-1 text-2xl font-semibold">{commerceHistory.sales?.count ?? 0}</div><div className="text-xs text-muted-foreground">Completed: {commerceHistory.sales?.completedCount ?? 0} · Gross: INR {commerceHistory.sales?.completedGross ?? '0.00'} · Net estimate: INR {commerceHistory.sales?.completedSellerNetEstimate ?? '0.00'}</div></div></div></section>}

{token && settlementStatement && <section className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="font-semibold">Seller settlement statement</h2>
        <p className="mt-1 text-xs text-muted-foreground">Statement only: payment records and ledger simulations do not mean funds were received or paid out. Real settlement is disabled.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">{[['Gross',settlementStatement.totals?.gross],['Commission',settlementStatement.totals?.commission],['Seller net estimate',settlementStatement.totals?.sellerNetEstimate],['Captured (simulation)',settlementStatement.totals?.capturedSimulation],['Refunded (simulation)',settlementStatement.totals?.refundedSimulation],['Active holds',settlementStatement.totals?.activePayoutHolds]].map(([label,value])=><div key={String(label)} className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 font-semibold">INR {value ?? '0.00'}</div></div>)}</div>
        {settlementStatement.lines?.length ? <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b"><th className="p-2">Order / listing</th><th className="p-2">Status</th><th className="p-2">Gross</th><th className="p-2">Net estimate</th><th className="p-2">Captured sim.</th><th className="p-2">Refund sim.</th><th className="p-2">Settlement</th></tr></thead><tbody>{settlementStatement.lines.map((line:any)=><tr className="border-b" key={line.orderId}><td className="p-2">{line.listingTitle}<div className="text-muted-foreground">{line.orderId}</div></td><td className="p-2">{line.status}</td><td className="p-2">{line.currency} {line.gross}</td><td className="p-2">{line.currency} {line.sellerNetEstimate}</td><td className="p-2">{line.capturedSimulation}</td><td className="p-2">{line.refundedSimulation}</td><td className="p-2">{line.settlementStatus}</td></tr>)}</tbody></table></div> : <p className="mt-3 text-sm text-muted-foreground">No seller transactions yet.</p>}
      </section>}

{token && canManageCommercePolicy && <section className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Ledger reconciliation & payout holds</h2><p className="mt-1 text-xs text-muted-foreground">Reports compare balanced entries and flag missing capture/refund pairs. Holds are governance records only; no funds are held or released.</p></div>{currentUserRole === 'SUPER_ADMIN' && <Button size="sm" onClick={() => void runMarketplaceReconciliation()} disabled={reconciliationBusy}>{reconciliationBusy ? 'Reconciling…' : 'Run reconciliation'}</Button>}</div>
        {reconciliationRuns.length > 0 && <div className="mt-3 space-y-2">{reconciliationRuns.slice(0,5).map((run:any)=><div className="rounded-lg border p-3 text-sm" key={run.id}><div className="font-medium">{run.status} · {run.balanced ? 'Balanced' : 'Exceptions found'}</div><div className="text-xs text-muted-foreground">{new Date(run.completedAt).toLocaleString()} · Debits {run.currency} {run.debitTotal} · Credits {run.currency} {run.creditTotal} · Exceptions {run.exceptionCount}</div>{Array.isArray(run.summary?.exceptions) && run.summary.exceptions.length > 0 && <div className="mt-1 text-xs text-destructive">{run.summary.exceptions.slice(0,5).map((e:any)=>e.type).join(', ')}</div>}</div>)}</div>}
        {payoutHolds.length > 0 && <div className="mt-3 space-y-2"><div className="text-sm font-medium">Active payout holds ({payoutHolds.length})</div>{payoutHolds.map((hold:any)=><div className="rounded-lg border p-3" key={hold.id}><div className="font-medium">{hold.currency} {hold.amount} · {hold.orderId}</div><p className="mt-1 text-sm">{hold.reason}</p><div className="mt-1 text-xs text-muted-foreground">Expires {hold.expiresAt ? new Date(hold.expiresAt).toLocaleString() : 'when manually reviewed'}</div>{currentUserRole === 'SUPER_ADMIN' && <div className="mt-2 flex gap-2"><input aria-label={'Release reason '+hold.id} className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm" placeholder="Release reason" value={holdReasons[hold.id]||''} onChange={e=>setHoldReasons(prev=>({...prev,[hold.id]:e.target.value}))}/><Button size="sm" variant="outline" disabled={holdBusyIds.includes(hold.id)} onClick={()=>void releasePayoutHold(hold)}>{holdBusyIds.includes(hold.id)?'Releasing…':'Release hold'}</Button></div>}</div>)}</div>}
      </section>}

{token && canManageCommercePolicy && <section className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="font-semibold">Jurisdiction-aware tax profiles</h2>
        <p className="mt-1 text-xs text-muted-foreground">Drafts only apply after Super Admin/God Mode approval with a qualified review reference. No tax rate or legal obligation is assumed by the application.</p>
        <form onSubmit={saveTaxProfile} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">Seller jurisdiction<input required className="mt-1 h-9 w-full rounded-md border bg-background px-3" value={taxProfileForm.sellerJurisdictionCode} onChange={e=>setTaxProfileForm({...taxProfileForm,sellerJurisdictionCode:e.target.value.toUpperCase()})}/></label>
          <label className="text-sm">Buyer jurisdiction<input required className="mt-1 h-9 w-full rounded-md border bg-background px-3" value={taxProfileForm.buyerJurisdictionCode} onChange={e=>setTaxProfileForm({...taxProfileForm,buyerJurisdictionCode:e.target.value.toUpperCase()})}/></label>
          <label className="text-sm">Category<select className="mt-1 h-9 w-full rounded-md border bg-background px-3" value={taxProfileForm.category} onChange={e=>setTaxProfileForm({...taxProfileForm,category:e.target.value})}>{categoryOptions.map(c=><option key={c} value={c}>{c}</option>)}</select></label>
          <label className="text-sm">Tax code<input required maxLength={80} className="mt-1 h-9 w-full rounded-md border bg-background px-3" value={taxProfileForm.taxCode} onChange={e=>setTaxProfileForm({...taxProfileForm,taxCode:e.target.value.toUpperCase()})}/></label>
          <label className="text-sm">Tax name<input required maxLength={120} className="mt-1 h-9 w-full rounded-md border bg-background px-3" value={taxProfileForm.taxName} onChange={e=>setTaxProfileForm({...taxProfileForm,taxName:e.target.value})}/></label>
          <label className="text-sm">Rate (%)<input required type="number" min="0" max="100" step="0.01" className="mt-1 h-9 w-full rounded-md border bg-background px-3" value={taxProfileForm.taxPercent} onChange={e=>setTaxProfileForm({...taxProfileForm,taxPercent:e.target.value})}/></label>
          <label className="text-sm">Tax base<select className="mt-1 h-9 w-full rounded-md border bg-background px-3" value={taxProfileForm.taxBase} onChange={e=>setTaxProfileForm({...taxProfileForm,taxBase:e.target.value})}><option value="SUBTOTAL">Subtotal</option><option value="SUBTOTAL_PLUS_BUYER_FEE">Subtotal + buyer fee</option><option value="BUYER_FEE">Buyer fee</option><option value="SELLER_COMMISSION">Seller commission</option></select></label>
          <label className="text-sm">Effective from<input required type="date" className="mt-1 h-9 w-full rounded-md border bg-background px-3" value={taxProfileForm.effectiveFrom} onChange={e=>setTaxProfileForm({...taxProfileForm,effectiveFrom:e.target.value})}/></label>
          <label className="text-sm">Effective to<input type="date" className="mt-1 h-9 w-full rounded-md border bg-background px-3" value={taxProfileForm.effectiveTo} onChange={e=>setTaxProfileForm({...taxProfileForm,effectiveTo:e.target.value})}/></label>
          <Button type="submit" disabled={taxProfileBusy} className="sm:col-span-2 lg:col-span-4 sm:w-fit">{taxProfileBusy?'Saving…':'Save tax profile draft'}</Button>
        </form>
        <div className="mt-4 space-y-2">{taxProfiles.map(profile=><div key={profile.id} className="rounded-lg border p-3"><div className="font-medium">{profile.taxCode} · {profile.taxName} · {profile.basisPoints/100}%</div><div className="mt-1 text-xs text-muted-foreground">{profile.sellerJurisdictionCode} → {profile.buyerJurisdictionCode} · {profile.category} · {profile.status} · effective {new Date(profile.effectiveFrom).toLocaleDateString()} · v{profile.version}</div>{profile.reviewReference && <div className="mt-1 text-xs">Review reference: {profile.reviewReference}</div>}{profile.status==='DRAFT'&&currentUserRole==='SUPER_ADMIN'&&<div className="mt-2 flex gap-2"><input aria-label={'Qualified tax review reference '+profile.id} className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm" placeholder="Qualified review reference" value={taxReviewRefs[profile.id]||''} onChange={e=>setTaxReviewRefs(prev=>({...prev,[profile.id]:e.target.value}))}/><Button size="sm" disabled={taxProfileBusy} onClick={async()=>{const ref=(taxReviewRefs[profile.id]||'').trim();if(ref.length<5){setError('A qualified tax/legal review reference is required.');return}setTaxProfileBusy(true);try{await api.approveMarketplaceTaxProfile(profile.id,ref,token!);setTaxProfiles(await api.marketplaceTaxProfiles(token!))}catch(cause){setError(cause instanceof Error?cause.message:'Unable to approve profile.')}finally{setTaxProfileBusy(false)}}}>Approve</Button></div>}{profile.status==='APPROVED'&&currentUserRole==='SUPER_ADMIN'&&<div className="mt-2 flex gap-2"><input aria-label={'Tax retirement reason '+profile.id} className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm" placeholder="Reason to retire" value={taxRetireReasons[profile.id]||''} onChange={e=>setTaxRetireReasons(prev=>({...prev,[profile.id]:e.target.value}))}/><Button size="sm" variant="outline" disabled={taxProfileBusy} onClick={async()=>{const reason=(taxRetireReasons[profile.id]||'').trim();if(reason.length<5){setError('Provide a retirement reason.');return}setTaxProfileBusy(true);try{await api.retireMarketplaceTaxProfile(profile.id,reason,token!);setTaxProfiles(await api.marketplaceTaxProfiles(token!))}catch(cause){setError(cause instanceof Error?cause.message:'Unable to retire profile.')}finally{setTaxProfileBusy(false)}}}>Retire</Button></div>}</div>)}</div>
      </section>}

{token && canManageCommercePolicy && <form onSubmit={saveCommercePolicy} className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="font-medium">Marketplace fees & tax policy · Admin / Super Admin controls</div>
        <p className="mt-1 text-xs text-muted-foreground">Changes are versioned and audited. Admin can configure fee percentages; tax policy changes require Super Admin/God Mode review. No payment is collected or tax remitted here.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={policyForm.feesEnabled} onChange={e => setPolicyForm({ ...policyForm, feesEnabled: e.target.checked })} />Enable buyer fee and seller commission</label>
          <label className="text-sm">Buyer fee (%)<input className="mt-1 h-9 w-full rounded-md border bg-background px-3" type="number" min="0" max="100" step="0.01" value={policyForm.buyerFeePercent} onChange={e => setPolicyForm({ ...policyForm, buyerFeePercent: e.target.value })} /></label>
          <label className="text-sm">Seller commission (%)<input className="mt-1 h-9 w-full rounded-md border bg-background px-3" type="number" min="0" max="100" step="0.01" value={policyForm.sellerCommissionPercent} onChange={e => setPolicyForm({ ...policyForm, sellerCommissionPercent: e.target.value })} /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={currentUserRole !== 'SUPER_ADMIN'} checked={policyForm.taxEnabled} onChange={e => setPolicyForm({ ...policyForm, taxEnabled: e.target.checked })} />Enable configured tax line</label>
          <label className="text-sm">Tax rate (%)<input className="mt-1 h-9 w-full rounded-md border bg-background px-3" type="number" disabled={currentUserRole !== 'SUPER_ADMIN'} min="0" max="100" step="0.01" value={policyForm.taxPercent} onChange={e => setPolicyForm({ ...policyForm, taxPercent: e.target.value })} /></label>
          <label className="text-sm">Tax review reference<input className="mt-1 h-9 w-full rounded-md border bg-background px-3" disabled={currentUserRole !== 'SUPER_ADMIN'} maxLength={256} placeholder="Approved policy / adviser reference" value={policyForm.taxReviewReference} onChange={e => setPolicyForm({ ...policyForm, taxReviewReference: e.target.value })} /></label>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">Current policy version: {commercePolicy?.version ?? 0} · {commercePolicy?.taxReviewRequired ? 'Tax review required' : 'Tax policy reference configured'}</div>
        <Button className="mt-3" size="sm" type="submit" disabled={policySaving}>{policySaving ? 'Saving…' : 'Save commerce policy'}</Button>
      </form>}
      </>}
    </div>
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-2xl font-semibold"><Store className="h-6 w-6" />Marketplace</div>
          <p className="mt-1 text-sm text-muted-foreground">Discover and offer products, services, rentals, bookings, knowledge and opportunities across KrishiKendram.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2"><LiveDataRefreshControl enabled={liveRefreshEnabled} intervalMs={liveRefreshIntervalMs} onEnabledChange={setLiveRefreshEnabled} onIntervalChange={setLiveRefreshIntervalMs} /><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>
      </div>

      <MarketplaceWorkspaceTabs active={activeWorkspace} onSelect={selectWorkspace} inventoryEnabled={featureEnabledForUi('marketplace.inventory_workspace')} financeEnabled={featureEnabledForUi('marketplace.finance_workspace')} />

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => navigate('/app/inventory')}>Open Inventory module</Button>
        <Button variant="outline" onClick={() => navigate('/app/finance')}>Open Finance module</Button>
      </div>

      {error && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">{error}</div>}

      {token && <section className="rounded-xl border bg-card p-4 shadow-sm">
        {token && canManageCommercePolicy && <div className="mb-4 rounded-lg border bg-muted/20 p-3">
          <h3 className="font-semibold">Seller profile visibility policy</h3>
          <p className="mt-1 text-xs text-muted-foreground">Default ON for everyone. Non-empty selectors in a rule must all match (user AND module AND category); later matching rules win. Phone publication still requires seller consent.</p>
          <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={profileVisibilityPolicy.defaultVisible} onChange={e=>setProfileVisibilityPolicy(current=>({...current,defaultVisible:e.target.checked}))}/> Default visibility for all users: {profileVisibilityPolicy.defaultVisible?'ON':'OFF'}</label>
          <div className="mt-2 space-y-2">{profileVisibilityPolicy.rules.map((rule,index)=><div key={rule.id||index} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2 text-xs">
            <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(rule.visible)} onChange={e=>setProfileVisibilityPolicy(current=>({...current,rules:current.rules.map((item,i)=>i===index?{...item,visible:e.target.checked}:item)}))}/>{rule.visible?'ON':'OFF'}</label>
            <span className="min-w-0 flex-1 break-words">Users: {rule.userIds?.length?rule.userIds.join(', '):'all'} · Modules: {rule.modules?.length?rule.modules.join(', '):'all'} · Categories: {rule.categories?.length?rule.categories.join(', '):'all'}</span>
            <Button type="button" size="sm" variant="outline" onClick={()=>setProfileVisibilityPolicy(current=>({...current,rules:current.rules.filter((_,i)=>i!==index)}))}>Remove</Button>
          </div>)}</div>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <input aria-label="Target user IDs" className="h-9 rounded border bg-background px-2 text-sm" placeholder="User IDs, comma-separated; blank = all" value={visibilityRuleDraft.userIds} onChange={e=>setVisibilityRuleDraft({...visibilityRuleDraft,userIds:e.target.value})}/>
            <input aria-label="Target modules" className="h-9 rounded border bg-background px-2 text-sm" placeholder="Modules; blank = all" value={visibilityRuleDraft.modules} onChange={e=>setVisibilityRuleDraft({...visibilityRuleDraft,modules:e.target.value})}/>
            <input aria-label="Target categories" className="h-9 rounded border bg-background px-2 text-sm" placeholder="Categories; blank = all" value={visibilityRuleDraft.categories} onChange={e=>setVisibilityRuleDraft({...visibilityRuleDraft,categories:e.target.value})}/>
            <div className="flex items-center gap-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={visibilityRuleDraft.visible} onChange={e=>setVisibilityRuleDraft({...visibilityRuleDraft,visible:e.target.checked})}/> Rule ON</label><Button type="button" size="sm" variant="outline" onClick={addProfileVisibilityRule}>Add rule</Button></div>
          </div>
          <input aria-label="Visibility policy audit reason" className="mt-2 h-9 w-full rounded border bg-background px-2 text-sm" placeholder="Reason required; saved to audit history" value={visibilityReason} onChange={e=>setVisibilityReason(e.target.value)}/>
          <Button type="button" className="mt-2" size="sm" disabled={visibilityBusy||!visibilityReason.trim()} onClick={()=>void saveProfileVisibilityPolicy()}>{visibilityBusy?'Saving…':'Save policy'}</Button>
        </div>}
        <h2 className="font-semibold">Seller profile & buyer contact preferences</h2>{sellerProfile?.profile?.updatedAt && <p className="mt-1 text-xs text-muted-foreground">Last saved {new Date(sellerProfile.profile.updatedAt).toLocaleString()}</p>}<p className="mt-1 text-xs text-muted-foreground">Your name and verification status come from the account. Phone details remain private unless you explicitly enable public display.</p>
        <form onSubmit={saveSellerProfile} className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Public display name<input maxLength={100} className="mt-1 h-9 w-full rounded-md border bg-background px-3" value={sellerProfileForm.displayName} onChange={e=>setSellerProfileForm({...sellerProfileForm,displayName:e.target.value})}/></label>
          <label className="text-sm">Region (coarse label only)<input maxLength={120} className="mt-1 h-9 w-full rounded-md border bg-background px-3" placeholder="District / market area" value={sellerProfileForm.regionLabel} onChange={e=>setSellerProfileForm({...sellerProfileForm,regionLabel:e.target.value})}/></label>
          <label className="text-sm sm:col-span-2">About the seller<textarea maxLength={2000} className="mt-1 min-h-20 w-full rounded-md border bg-background p-3" value={sellerProfileForm.bio} onChange={e=>setSellerProfileForm({...sellerProfileForm,bio:e.target.value})}/></label>
          <label className="text-sm">Contact preference<select className="mt-1 h-9 w-full rounded-md border bg-background px-3" value={sellerProfileForm.contactPreference} onChange={e=>setSellerProfileForm({...sellerProfileForm,contactPreference:e.target.value})}><option value="IN_APP">In-app messages</option><option value="PHONE">Phone (only if shared)</option><option value="WHATSAPP">WhatsApp (only if shared)</option></select></label>
          <label className="text-sm">Public phone (optional)<input maxLength={30} className="mt-1 h-9 w-full rounded-md border bg-background px-3" value={sellerProfileForm.publicPhone} onChange={e=>setSellerProfileForm({...sellerProfileForm,publicPhone:e.target.value})}/></label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={sellerProfileForm.showPhone} onChange={e=>setSellerProfileForm({...sellerProfileForm,showPhone:e.target.checked})}/>Allow this phone number to appear on my public seller profile</label>
          <Button type="submit" className="sm:w-fit" disabled={sellerProfileBusy}>{sellerProfileBusy?'Saving…':'Save seller profile'}</Button>
        </form>
      </section>}
      {token && featureEnabledForUi('marketplace.favorites') && favorites.length>0 && <section className="rounded-xl border bg-card p-4"><h2 className="font-semibold">Saved listings ({favorites.length})</h2><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{favorites.map((f:any)=><div key={f.id} className="rounded-lg border p-3"><div className="font-medium">{f.listing?.title||'Saved listing'}</div><div className="mt-1 text-xs text-muted-foreground">{f.listing?.category} · {f.listing?.status}</div><Button className="mt-2" size="sm" variant="outline" onClick={()=>void toggleFavorite(f.listing)}>Remove from saved</Button></div>)}</div></section>}
      {token && featureEnabledForUi('marketplace.messaging') && <section className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="font-semibold">Buyer–seller messages</h2><p className="mt-1 text-xs text-muted-foreground">Messages are private to the sender/recipient and tied to a listing or order. Do not share payment credentials.</p>
        {messageForm.recipientId && <form onSubmit={sendMarketplaceMessage} className="mt-3 space-y-2 rounded-lg border p-3"><div className="text-xs text-muted-foreground">To participant {messageForm.recipientId} · {messageForm.orderId?'Order '+messageForm.orderId:'Listing '+messageForm.listingId}</div><textarea aria-label="Marketplace message body" maxLength={4000} required className="min-h-20 w-full rounded-md border bg-background p-3 text-sm" value={messageForm.body} onChange={e=>setMessageForm({...messageForm,body:e.target.value})} placeholder="Ask about quantity, quality, delivery, or terms"/><div className="flex gap-2"><Button type="submit" size="sm" disabled={messageBusy}>{messageBusy?'Sending…':'Send message'}</Button><Button type="button" size="sm" variant="ghost" onClick={()=>setMessageForm({recipientId:'',listingId:'',orderId:'',body:''})}>Cancel</Button></div></form>}
        <div className="mt-3 space-y-2">{messages.length===0?<p className="text-sm text-muted-foreground">No messages yet. Use “Message seller” on a listing to start an inquiry.</p>:messages.map((m:any)=><div key={m.id} className={'rounded-lg border p-3 '+(!m.readAt&&m.recipientId===currentUserId?'bg-muted/40':'')}><div className="text-xs text-muted-foreground">{m.sender?.name||m.senderId} → {m.recipient?.name||m.recipientId} · {new Date(m.createdAt).toLocaleString()}</div>{m.listing?.title&&<div className="text-xs">Listing: {m.listing.title}</div>}{m.order&&<div className="text-xs">Order status: {m.order.status}</div>}<p className="mt-1 whitespace-pre-wrap text-sm">{m.body}</p>{m.recipientId===currentUserId&&!m.readAt&&<Button size="sm" variant="outline" className="mt-2" onClick={()=>void markMarketplaceMessageRead(m)}>Mark read</Button>}</div>)}</div>
      </section>}
      {token && featureEnabledForUi('marketplace.rfq') && <section className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="font-semibold">Bulk buyer RFQ & seller quotations</h2><p className="mt-1 text-xs text-muted-foreground">Create a request for bulk supply or quote on another buyer’s open request. Accepting a quotation records the award only; it does not create an order or collect payment.</p>
        <form onSubmit={createMarketplaceRFQ} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input aria-label="RFQ title" required maxLength={160} className="h-9 rounded-md border bg-background px-3 text-sm" placeholder="Request title" value={rfqForm.title} onChange={e=>setRfqForm({...rfqForm,title:e.target.value})}/>
          <select aria-label="RFQ category" className="h-9 rounded-md border bg-background px-3 text-sm" value={rfqForm.category} onChange={e=>setRfqForm({...rfqForm,category:e.target.value})}>{categoryOptions.map(c=><option key={c} value={c}>{c}</option>)}</select>
          <input aria-label="RFQ quantity" required type="number" min="0.000001" step="any" className="h-9 rounded-md border bg-background px-3 text-sm" placeholder="Quantity" value={rfqForm.quantity} onChange={e=>setRfqForm({...rfqForm,quantity:e.target.value})}/>
          <input aria-label="RFQ unit" required maxLength={40} className="h-9 rounded-md border bg-background px-3 text-sm" placeholder="Unit (kg, bags, heads…)" value={rfqForm.unit} onChange={e=>setRfqForm({...rfqForm,unit:e.target.value})}/>
          <input aria-label="RFQ target unit price" type="number" min="0" step="0.01" className="h-9 rounded-md border bg-background px-3 text-sm" placeholder="Target price / unit (optional)" value={rfqForm.targetUnitPrice} onChange={e=>setRfqForm({...rfqForm,targetUnitPrice:e.target.value})}/>
          <input aria-label="RFQ delivery region" maxLength={120} className="h-9 rounded-md border bg-background px-3 text-sm" placeholder="Delivery region" value={rfqForm.deliveryRegion} onChange={e=>setRfqForm({...rfqForm,deliveryRegion:e.target.value})}/>
          <input aria-label="RFQ needed-by date" type="date" className="h-9 rounded-md border bg-background px-3 text-sm" value={rfqForm.neededBy} onChange={e=>setRfqForm({...rfqForm,neededBy:e.target.value})}/>
          <textarea aria-label="RFQ description" required maxLength={4000} className="min-h-16 rounded-md border bg-background p-3 text-sm sm:col-span-2 lg:col-span-4" placeholder="Quality / grade, packaging, delivery terms, supply schedule" value={rfqForm.description} onChange={e=>setRfqForm({...rfqForm,description:e.target.value})}/>
          <Button type="submit" className="sm:w-fit" disabled={rfqBusy}>{rfqBusy?'Saving…':'Publish bulk RFQ'}</Button>
        </form>
        <div className="mt-4"><h3 className="text-sm font-semibold">Open requests from other buyers</h3><div className="mt-2 grid gap-3 md:grid-cols-2">{openRFQs.filter((r:any)=>r.buyerId!==currentUserId).map((rfq:any)=><div key={rfq.id} className="rounded-lg border p-3"><div className="font-medium">{rfq.title}</div><div className="mt-1 text-xs text-muted-foreground">{rfq.category} · {rfq.quantity} {rfq.unit} · Buyer {rfq.buyer?.name||'Buyer'}{rfq.targetUnitPrice!=null?' · Target '+rfq.currency+' '+rfq.targetUnitPrice:''}</div><p className="mt-2 text-sm">{rfq.description}</p><div className="mt-2 grid grid-cols-2 gap-2"><input aria-label={'RFQ unit price '+rfq.id} type="number" min="0" step="0.01" className="h-9 rounded-md border bg-background px-2 text-sm" placeholder="Your unit price" value={rfqResponses[rfq.id]?.unitPrice||''} onChange={e=>setRfqResponses(prev=>({...prev,[rfq.id]:{unitPrice:e.target.value,availableQuantity:prev[rfq.id]?.availableQuantity||String(rfq.quantity),note:prev[rfq.id]?.note||'',validUntil:prev[rfq.id]?.validUntil||''}}))}/><input aria-label={'RFQ available quantity '+rfq.id} type="number" min="0.000001" step="any" className="h-9 rounded-md border bg-background px-2 text-sm" placeholder="Available qty" value={rfqResponses[rfq.id]?.availableQuantity||''} onChange={e=>setRfqResponses(prev=>({...prev,[rfq.id]:{unitPrice:prev[rfq.id]?.unitPrice||'',availableQuantity:e.target.value,note:prev[rfq.id]?.note||'',validUntil:prev[rfq.id]?.validUntil||''}}))}/><input aria-label={'RFQ quotation note '+rfq.id} className="h-9 rounded-md border bg-background px-2 text-sm col-span-2" placeholder="Quote note / delivery" value={rfqResponses[rfq.id]?.note||''} onChange={e=>setRfqResponses(prev=>({...prev,[rfq.id]:{unitPrice:prev[rfq.id]?.unitPrice||'',availableQuantity:prev[rfq.id]?.availableQuantity||String(rfq.quantity),note:e.target.value,validUntil:prev[rfq.id]?.validUntil||''}}))}/><label className="col-span-2 text-xs text-muted-foreground">Quotation valid until<input aria-label={'RFQ quotation expiry '+rfq.id} type="date" className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm" value={rfqResponses[rfq.id]?.validUntil||''} onChange={e=>setRfqResponses(prev=>({...prev,[rfq.id]:{unitPrice:prev[rfq.id]?.unitPrice||'',availableQuantity:prev[rfq.id]?.availableQuantity||String(rfq.quantity),note:prev[rfq.id]?.note||'',validUntil:e.target.value}}))}/></label></div><Button size="sm" className="mt-2" disabled={rfqBusy} onClick={()=>void respondToMarketplaceRFQ(rfq)}>Submit quotation</Button></div>)}</div></div>
        {myRFQs.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold">My RFQs & quotations</h3>
            <div className="mt-2 space-y-3">
              {myRFQs.map((rfq: any) => (
                <div key={rfq.id} className="rounded-lg border p-3">
                  <div className="font-medium">{rfq.title} · {rfq.status}</div>
                  <div className="text-xs text-muted-foreground">{rfq.quantity} {rfq.unit} · {rfq.responses?.length || 0} quotation(s)</div>
                  {rfq.responses?.map((response: any) => (
                    <div key={response.id} className="mt-2 rounded-md border p-2">
                      <div className="text-sm">{response.seller?.name || 'Seller'} · {rfq.currency} {response.unitPrice}/unit · Available {response.availableQuantity} · {response.status}</div>
                      {rfq.buyerId === currentUserId && rfq.status === 'OPEN' && response.status === 'SUBMITTED' && (
                        <div className="mt-2 space-y-2">
                          <input aria-label={'RFQ decision reason ' + response.id} className="h-9 w-full rounded-md border bg-background px-3 text-sm" placeholder="Reason for accept/reject" value={rfqDecisionReasons[response.id] || ''} onChange={e => setRfqDecisionReasons(prev => ({ ...prev, [response.id]: e.target.value }))} />
                          <div className="flex gap-2">
                            <Button size="sm" disabled={rfqBusy} onClick={() => void decideMarketplaceRFQ(rfq, response, 'ACCEPTED')}>Accept quotation</Button>
                            <Button size="sm" variant="outline" disabled={rfqBusy} onClick={() => void decideMarketplaceRFQ(rfq, response, 'REJECTED')}>Reject</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>}
      {token && canManageCommercePolicy && <section className="rounded-xl border bg-card p-4 shadow-sm"><h2 className="font-semibold">Marketplace feature switchboard</h2><p className="mt-1 text-xs text-muted-foreground">Every change is versioned and audited. Critical financial features require Super Admin/God Mode. Dependency checks protect active workflows; turning a feature off does not erase history.</p><div className="mt-3 grid gap-3 md:grid-cols-2">{featureFlags.map(flag => <div key={flag.key} className="rounded-lg border p-3"><div className="flex items-start justify-between gap-2"><div><div className="font-medium">{flag.title}</div><p className="mt-1 text-xs text-muted-foreground">{flag.description}</p><div className="mt-1 text-[11px] text-muted-foreground">{flag.key} · {flag.riskLevel} · v{flag.version}</div>{flag.dependencies?.length > 0 && <div className="mt-1 text-[11px] text-muted-foreground">Depends on: {flag.dependencies.join(', ')}</div>}</div><span className={'rounded-full px-2 py-1 text-xs ' + (flag.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-muted text-muted-foreground')}>{flag.enabled ? 'ON' : 'OFF'}</span></div><input aria-label={'Reason for ' + flag.title} className="mt-3 h-9 w-full rounded-md border bg-background px-3 text-sm" placeholder="Reason required for toggle" value={featureReasons[flag.key] || ''} onChange={e => setFeatureReasons(previous => ({ ...previous, [flag.key]: e.target.value }))} /><Button className="mt-2" size="sm" variant="outline" disabled={featureBusyKeys.includes(flag.key) || (flag.riskLevel === 'CRITICAL' && currentUserRole !== 'SUPER_ADMIN')} onClick={() => void toggleMarketplaceFeature(flag)}>{featureBusyKeys.includes(flag.key) ? 'Saving…' : 'Turn ' + (flag.enabled ? 'off' : 'on')}</Button>{flag.riskLevel === 'CRITICAL' && currentUserRole !== 'SUPER_ADMIN' && <p className="mt-1 text-xs text-muted-foreground">Super Admin/God Mode approval required.</p>}</div>)}</div></section>}

      {token && canManageCommercePolicy && pendingReviews.length > 0 && <section className="rounded-xl border bg-card p-4"><div className="font-medium">Marketplace review moderation queue ({pendingReviews.length})</div><div className="mt-3 space-y-3">{pendingReviews.map(review => <div key={review.id} className="rounded-lg border p-3"><div className="text-sm font-medium">{review.rating}/5 · {review.order?.listing?.title || 'Completed transaction'}</div><div className="mt-1 text-xs text-muted-foreground">{review.reviewer?.name} reviewed {review.reviewee?.name}</div><p className="mt-2 text-sm">{review.comment || 'No written comment.'}</p><div className="mt-2 flex flex-wrap gap-2"><Button size="sm" onClick={() => void moderateReview(review, 'PUBLISHED')}>Publish</Button><Button size="sm" variant="outline" onClick={() => void moderateReview(review, 'HIDDEN')}>Hide</Button><Button size="sm" variant="ghost" onClick={() => void moderateReview(review, 'REJECTED')}>Reject</Button></div></div>)}</div></section>}

      {token && (featureEnabledForUi('marketplace.trust_reports') || trustForm.type === 'APPEAL') && <form onSubmit={submitTrustCase} className="rounded-xl border bg-card p-4 shadow-sm"><h2 className="font-semibold">Report a Marketplace concern / appeal</h2><p className="mt-1 text-xs text-muted-foreground">Use this for a listing or transaction issue. Evidence links are private to authorized reviewers; do not add passwords or payment credentials.</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><select aria-label="Trust case type" className="h-9 rounded-md border bg-background px-3 text-sm" value={trustForm.type} onChange={e => setTrustForm({ ...trustForm, type: e.target.value })}><option value="REPORT">Report a concern</option><option value="DISPUTE">Open an order dispute</option><option value="APPEAL">Appeal a decision</option></select><select aria-label="Trust case category" className="h-9 rounded-md border bg-background px-3 text-sm" value={trustForm.category} onChange={e => setTrustForm({ ...trustForm, category: e.target.value })}>{['FRAUD','MISREPRESENTATION','NON_DELIVERY','QUALITY','HARASSMENT','PAYMENT_DISPUTE','SAFETY','OTHER'].map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}</select>{trustForm.type === 'DISPUTE' && <p className="text-xs text-muted-foreground sm:col-span-2">Order disputes require an order where the other party has acted. An authorized reviewer will investigate; this does not initiate a real payment chargeback or move funds.</p>}{trustForm.type === 'APPEAL' && <select aria-label="Case being appealed" className="h-9 rounded-md border bg-background px-3 text-sm" value={trustForm.appealOfCaseId} onChange={e => setTrustForm({ ...trustForm, appealOfCaseId: e.target.value })} required><option value="">Select decided case to appeal</option>{trustCases.filter(c => c.status === 'RESOLVED' || c.status === 'DISMISSED').map(c => <option key={c.id} value={c.id}>{c.category} · {c.status}</option>)}</select>}<select aria-label="Related order" required={trustForm.type === 'DISPUTE'} className="h-9 rounded-md border bg-background px-3 text-sm" value={trustForm.orderId} onChange={e => setTrustForm({ ...trustForm, orderId: e.target.value, listingId: '' })}><option value="">No related order</option>{orders.map(o => <option key={o.id} value={o.id}>{o.listing?.title || 'Order'} · {o.status}</option>)}</select><select aria-label="Related listing" className="h-9 rounded-md border bg-background px-3 text-sm" value={trustForm.listingId} onChange={e => setTrustForm({ ...trustForm, listingId: e.target.value, orderId: '' })}><option value="">No related listing</option>{[...published, ...mine].filter((v,i,a) => a.findIndex(x => x.id === v.id) === i).map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select><textarea aria-label="Trust case description" className="min-h-24 rounded-md border bg-background p-3 text-sm sm:col-span-2" maxLength={4000} placeholder="Explain what happened and what outcome you are requesting" value={trustForm.description} onChange={e => setTrustForm({ ...trustForm, description: e.target.value })} required /><input aria-label="Evidence URLs" className="h-9 rounded-md border bg-background px-3 text-sm sm:col-span-2" placeholder="Evidence URLs (comma-separated, optional)" value={trustForm.evidenceUrls} onChange={e => setTrustForm({ ...trustForm, evidenceUrls: e.target.value })} /><Button className="sm:col-span-2 sm:w-fit" type="submit" disabled={trustBusy || !trustForm.description.trim()}>{trustBusy ? 'Submitting…' : trustForm.type === 'DISPUTE' ? 'Submit order dispute' : trustForm.type === 'APPEAL' ? 'Submit appeal' : 'Submit private report'}</Button></div></form>}

      {token && trustCases.length > 0 && <section className="rounded-xl border bg-card p-4"><h2 className="font-semibold">{canManageCommercePolicy ? 'Marketplace trust review queue' : 'My reports & appeals'} ({trustCases.length})</h2><div className="mt-3 space-y-3">{trustCases.map(item => { const d = trustDecisions[item.id] || { status: 'UNDER_REVIEW', resolution: '', restrictionScope: '', restrictionDays: '30', cautionRating: '3' }; return <article key={item.id} className="rounded-lg border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div className="font-medium">{item.category?.replace(/_/g, ' ')} · {item.status}</div><div className="text-xs text-muted-foreground">{item.type} · {new Date(item.createdAt).toLocaleString()}</div></div><p className="mt-2 text-sm">{item.description}</p>{item.resolution && <p className="mt-1 text-xs text-muted-foreground">Decision: {item.resolution}</p>}{canManageCommercePolicy && item.status !== 'RESOLVED' && item.status !== 'DISMISSED' && <div className="mt-3 grid gap-2 sm:grid-cols-2"><textarea aria-label={'Decision reason ' + item.id} className="min-h-16 rounded-md border bg-background p-2 text-sm sm:col-span-2" placeholder="Required reason / investigation notes" value={d.resolution} onChange={e => setTrustDecisions(prev => ({ ...prev, [item.id]: { ...d, resolution: e.target.value } }))} /><select aria-label={'Restriction scope ' + item.id} className="h-9 rounded-md border bg-background px-3 text-sm" value={d.restrictionScope} onChange={e => setTrustDecisions(prev => ({ ...prev, [item.id]: { ...d, restrictionScope: e.target.value } }))}><option value="">No restriction</option><option value="CAUTION">Caution rating only</option><option value="LISTING_CREATE">Temporarily block listing creation</option><option value="ORDER_CREATE">Temporarily block order creation</option><option value="MARKETPLACE_ALL">Temporarily restrict Marketplace</option></select><div className="flex gap-2"><input aria-label={'Restriction duration in days ' + item.id} className="h-9 w-24 rounded-md border bg-background px-2 text-sm" type="number" min="1" max="365" placeholder="Days; blank means permanent" value={d.restrictionDays} onChange={e => setTrustDecisions(prev => ({ ...prev, [item.id]: { ...d, restrictionDays: e.target.value } }))} /><span className="self-center text-xs text-muted-foreground">days</span><span className="basis-full text-xs text-muted-foreground">{d.restrictionScope === 'MARKETPLACE_ALL' ? (d.restrictionDays ? 'Temporary Marketplace restriction.' : 'Permanent blacklist until an Admin revokes it.') : 'Choose 1 to 365 days for a caution or narrower restriction.'}</span>{d.restrictionScope === 'CAUTION' && <select aria-label={'Caution rating ' + item.id} className="h-9 rounded-md border bg-background px-2 text-sm" value={d.cautionRating} onChange={e => setTrustDecisions(prev => ({ ...prev, [item.id]: { ...d, cautionRating: e.target.value } }))}><option value="1">Caution 1</option><option value="2">Caution 2</option><option value="3">Caution 3</option><option value="4">Caution 4</option><option value="5">Caution 5</option></select>}</div><div className="flex flex-wrap gap-2 sm:col-span-2"><Button size="sm" variant="outline" disabled={trustBusy} onClick={() => void decideTrustCase(item, 'UNDER_REVIEW')}>Mark under review</Button><Button size="sm" disabled={trustBusy} onClick={() => void decideTrustCase(item, 'RESOLVED')}>Resolve case</Button><Button size="sm" variant="ghost" disabled={trustBusy} onClick={() => void decideTrustCase(item, 'DISMISSED')}>Dismiss</Button></div>{!item.targetUserId && <div className="text-xs text-muted-foreground sm:col-span-2">No counterparty identified; a user restriction cannot be applied to this case.</div>}</div>}</article> })}</div></section>}

      {token && canManageCommercePolicy && activeRestrictions.length > 0 && <section className="rounded-xl border bg-card p-4"><h2 className="font-semibold">Active Marketplace cautions & restrictions</h2><div className="mt-3 space-y-2">{activeRestrictions.map(r => <div key={r.id} className="rounded-lg border p-3"><div className="font-medium">{r.user?.name || r.userId} · {r.scope.replace(/_/g, ' ')}</div><p className="mt-1 text-sm">{r.reason}</p><div className="text-xs text-muted-foreground">Expires: {r.expiresAt ? new Date(r.expiresAt).toLocaleString() : r.scope === 'MARKETPLACE_ALL' ? 'Permanent blacklist until manually revoked' : 'No expiry (legacy record)'}</div><div className="mt-2 flex gap-2"><input aria-label={'Revocation reason ' + r.id} className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm" placeholder="Reason to revoke" value={revokeReasons[r.id] || ''} onChange={e => setRevokeReasons(prev => ({ ...prev, [r.id]: e.target.value }))} /><Button size="sm" variant="outline" disabled={trustBusy || !revokeReasons[r.id]?.trim()} onClick={async () => { if (!token) return; setTrustBusy(true); try { await api.revokeMarketplaceRestriction(r.id, revokeReasons[r.id].trim(), token); await load() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to revoke restriction.') } finally { setTrustBusy(false) } }}>Revoke</Button></div></div>)}</div></section>}

      {token && featureEnabledForUi('marketplace.listings') && <form onSubmit={create} className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-4 font-medium">Create listing</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select aria-label="Resource type" className="h-10 rounded-md border bg-background px-3 text-sm" value={form.resourceType} onChange={(e) => setForm({ ...form, resourceType: e.target.value, resourceId: '' })}>
            <option value="generic">General / generic listing</option><option value="crop">Crop</option><option value="farmAsset">Farm Asset</option><option value="livestock">Livestock</option><option value="inventoryItem">Inventory item (stock-linked)</option>
          </select>
          {form.resourceType !== 'generic' && <select aria-label="Owned resource" className="h-10 rounded-md border bg-background px-3 text-sm" value={form.resourceId} onChange={(e) => setForm({ ...form, resourceId: e.target.value })} disabled={!resourceChoices.length}>
            <option value="">{resourceChoices.length ? 'Select your resource…' : 'No owned resources available'}</option>
            {resourceChoices.map((resource) => <option key={resource.id} value={resource.id}>{resource.label}</option>)}
          </select>}
          <select aria-label="Offering type" className="h-10 rounded-md border bg-background px-3 text-sm" value={form.offeringType} onChange={(e) => setForm({ ...form, offeringType: e.target.value, offeringDetails: {} })}>
            {offeringDefinitions.length ? offeringDefinitions.map((definition) => <option key={definition.type} value={definition.type}>{definition.label}</option>) : <><option value="PRODUCT">Physical product</option><option value="DIGITAL">Digital product</option><option value="SERVICE">Service / consultation</option><option value="RENTAL">Rental / lease</option><option value="BOOKING">Appointment / booking / event</option><option value="SUBSCRIPTION">Subscription / recurring service</option><option value="RFQ">Wholesale / request for quote</option><option value="PUBLIC_SERVICE">Public / government service</option><option value="KNOWLEDGE">Course / knowledge</option><option value="DONATION">Donation / community exchange</option><option value="JOB">Job / expertise / volunteer</option><option value="LOGISTICS">Transport / storage / logistics</option></>}
          </select>
          <select aria-label="Listing category" className="h-10 rounded-md border bg-background px-3 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {categoryOptions.map((category) => <option key={category} value={category}>{category.replace(/_/g, ' ')}</option>)}
          </select>
          <input className="h-10 rounded-md border bg-background px-3 text-sm" placeholder="Listing title / generic name" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="h-10 rounded-md border bg-background px-3 text-sm" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className="h-10 rounded-md border bg-background px-3 text-sm" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple disabled={uploadingMedia || !featureEnabledForUi('marketplace.media_uploads')} aria-label="Upload listing photos" onChange={e => { void uploadListingMedia(e.target.files, 'images'); e.currentTarget.value = '' }} /><input className="h-10 rounded-md border bg-background px-3 text-sm" placeholder="Photo URLs (comma-separated image links)" value={form.imageUrls} onChange={(e) => setForm({ ...form, imageUrls: e.target.value })} />
          <input className="h-10 rounded-md border bg-background px-3 text-sm" type="file" accept="video/mp4,video/webm" disabled={uploadingMedia || !featureEnabledForUi('marketplace.media_uploads')} aria-label="Upload listing video" onChange={e => { void uploadListingMedia(e.target.files, 'videos'); e.currentTarget.value = '' }} /><input className="h-10 rounded-md border bg-background px-3 text-sm" placeholder="Video links (YouTube or public video URLs)" value={form.videoUrls} onChange={(e) => setForm({ ...form, videoUrls: e.target.value })} />
          <input className="h-10 rounded-md border bg-background px-3 text-sm" placeholder="Social / Google Drive / catalogue links" value={form.externalLinks} onChange={(e) => setForm({ ...form, externalLinks: e.target.value })} />
          <input className="h-10 rounded-md border bg-background px-3 text-sm" disabled={!featureEnabledForUi('marketplace.wholesale_pricing')} placeholder="Wholesale tiers (min qty: unit price, e.g. 10:100, 25:90)" value={form.priceTiers} onChange={(e) => setForm({ ...form, priceTiers: e.target.value })} /><input className="h-10 rounded-md border bg-background px-3 text-sm" type="number" min="0" step="any" placeholder="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <input className="h-10 rounded-md border bg-background px-3 text-sm" type="number" min="0.000001" step="any" placeholder="Minimum order qty (optional)" value={form.minOrderQuantity} onChange={(e) => setForm({ ...form, minOrderQuantity: e.target.value })} /><input className="h-10 rounded-md border bg-background px-3 text-sm" placeholder="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          <input className="h-10 rounded-md border bg-background px-3 text-sm" type="number" min="0" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />

        </div>
        {activeOfferingDefinition && activeOfferingDefinition.fields.length > 0 && <section className="mt-4 rounded-lg border p-3" aria-label={activeOfferingDefinition.label + ' details'}>
          <div className="font-medium">{activeOfferingDefinition.label} details</div>
          <p className="mt-1 text-sm text-muted-foreground">{activeOfferingDefinition.description}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeOfferingDefinition.fields.map((field) => {
              const value = form.offeringDetails[field.key]
              if (field.type === 'enum') return <label key={field.key} className="grid gap-1 text-sm"><span>{field.label}{field.required ? ' *' : ''}</span><select aria-label={field.label} required={field.required} className="h-10 rounded-md border bg-background px-3" value={typeof value === 'string' ? value : ''} onChange={(event) => setForm((previous) => ({ ...previous, offeringDetails: { ...previous.offeringDetails, [field.key]: event.target.value } }))}><option value="">Choose…</option>{(field.options || []).map((option) => <option key={option} value={option}>{option.replace(/_/g, ' ')}</option>)}</select>{field.help && <span className="text-xs text-muted-foreground">{field.help}</span>}</label>
              if (field.type === 'boolean') return <label key={field.key} className="flex items-center gap-2 text-sm"><input aria-label={field.label} type="checkbox" checked={value === true} onChange={(event) => setForm((previous) => ({ ...previous, offeringDetails: { ...previous.offeringDetails, [field.key]: event.target.checked } }))} /><span>{field.label}</span></label>
              const inputType = field.type === 'number' || field.type === 'date' || field.type === 'url' ? field.type : 'text'
              return <label key={field.key} className="grid gap-1 text-sm"><span>{field.label}{field.required ? ' *' : ''}</span><input aria-label={field.label} required={field.required} type={inputType} min={field.type === 'number' ? 0 : undefined} step={field.type === 'number' ? 'any' : undefined} className="h-10 rounded-md border bg-background px-3" placeholder={field.placeholder || ''} value={typeof value === 'string' ? value : ''} onChange={(event) => setForm((previous) => ({ ...previous, offeringDetails: { ...previous.offeringDetails, [field.key]: event.target.value } }))} />{field.help && <span className="text-xs text-muted-foreground">{field.help}</span>}</label>
            })}
          </div>
        </section>}
        <Button className="mt-4" type="submit" disabled={savingCreate || uploadingMedia || (form.resourceType !== 'generic' && !form.resourceId) || !form.title.trim()}>{uploadingMedia ? "Uploading media…" : savingCreate ? "Creating…" : "Create listing"}</Button>
      </form>}

      {token && mine.length > 0 && <section>
        <h2 className="mb-3 text-lg font-semibold">My listings</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {mine.map((item) => <article key={item.id} className="rounded-xl border bg-card p-4">
            {editingId === item.id ? <div className="space-y-2">
              <input className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} placeholder="Title" />
              <select aria-label="Edit offering type" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={editForm.offeringType} onChange={(e) => setEditForm({ ...editForm, offeringType: e.target.value, offeringDetails: {} })}>
                {offeringDefinitions.length ? offeringDefinitions.map((definition) => <option key={definition.type} value={definition.type}>{definition.label}</option>) : <><option value="PRODUCT">Physical product</option><option value="DIGITAL">Digital product</option><option value="SERVICE">Service / consultation</option><option value="RENTAL">Rental / lease</option><option value="BOOKING">Appointment / booking / event</option><option value="SUBSCRIPTION">Subscription / recurring service</option><option value="RFQ">Wholesale / request for quote</option><option value="PUBLIC_SERVICE">Public / government service</option><option value="KNOWLEDGE">Course / knowledge</option><option value="DONATION">Donation / community exchange</option><option value="JOB">Job / expertise / volunteer</option><option value="LOGISTICS">Transport / storage / logistics</option></>}
              </select>
              <select aria-label="Edit listing category" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}>{categoryOptions.map((category) => <option key={category} value={category}>{category.replace(/_/g, ' ')}</option>)}</select>
              <input className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Description" />
              {activeEditOfferingDefinition && activeEditOfferingDefinition.fields.length > 0 && <div className="rounded-lg border p-3"><div className="mb-2 text-sm font-medium">{activeEditOfferingDefinition.label} details</div><div className="grid gap-2 sm:grid-cols-2">{activeEditOfferingDefinition.fields.map((field) => {
                const value = editForm.offeringDetails[field.key]
                if (field.type === 'enum') return <label key={field.key} className="grid gap-1 text-xs"><span>{field.label}{field.required ? ' *' : ''}</span><select aria-label={'Edit ' + field.label} required={field.required} className="h-9 rounded-md border bg-background px-2 text-sm" value={typeof value === 'string' ? value : ''} onChange={(event) => setEditForm((previous) => ({ ...previous, offeringDetails: { ...previous.offeringDetails, [field.key]: event.target.value } }))}><option value="">Choose…</option>{(field.options || []).map((option) => <option key={option} value={option}>{option.replace(/_/g, ' ')}</option>)}</select></label>
                if (field.type === 'boolean') return <label key={field.key} className="flex items-center gap-2 text-xs"><input aria-label={'Edit ' + field.label} type="checkbox" checked={value === true} onChange={(event) => setEditForm((previous) => ({ ...previous, offeringDetails: { ...previous.offeringDetails, [field.key]: event.target.checked } }))} />{field.label}</label>
                const inputType = field.type === 'number' || field.type === 'date' || field.type === 'url' ? field.type : 'text'
                return <label key={field.key} className="grid gap-1 text-xs"><span>{field.label}{field.required ? ' *' : ''}</span><input aria-label={'Edit ' + field.label} required={field.required} type={inputType} min={field.type === 'number' ? 0 : undefined} step={field.type === 'number' ? 'any' : undefined} className="h-9 rounded-md border bg-background px-2 text-sm" placeholder={field.placeholder || ''} value={typeof value === 'string' ? value : ''} onChange={(event) => setEditForm((previous) => ({ ...previous, offeringDetails: { ...previous.offeringDetails, [field.key]: event.target.value } }))} /></label>
              })}</div></div>}
              <input className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={editForm.imageUrls} onChange={(e) => setEditForm({ ...editForm, imageUrls: e.target.value })} placeholder="Photo URLs (comma-separated image links)" />
              <input className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={editForm.videoUrls} onChange={(e) => setEditForm({ ...editForm, videoUrls: e.target.value })} placeholder="Video links (YouTube/public video)" />
              <input className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={editForm.externalLinks} onChange={(e) => setEditForm({ ...editForm, externalLinks: e.target.value })} placeholder="Social / Drive / catalogue links" />
              <div className="grid grid-cols-2 gap-2"><input className="h-9 rounded-md border bg-background px-3 text-sm" type="number" min="0" value={editForm.quantity} onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })} placeholder="Quantity" /><input className="h-9 rounded-md border bg-background px-3 text-sm" type="number" min="0.000001" value={editForm.minOrderQuantity} onChange={(e) => setEditForm({ ...editForm, minOrderQuantity: e.target.value })} placeholder="Minimum order qty" /><input className="h-9 rounded-md border bg-background px-3 text-sm" value={editForm.unit} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })} placeholder="Unit" /></div>
              <div className="grid grid-cols-2 gap-2"><input className="h-9 rounded-md border bg-background px-3 text-sm" type="number" min="0" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} placeholder="Price" /><input className="h-9 rounded-md border bg-background px-3 text-sm" value={editForm.currency} onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })} placeholder="Currency" /></div>
              <input aria-label="Edit wholesale price tiers" disabled={!featureEnabledForUi('marketplace.wholesale_pricing')} className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={editForm.priceTiers} onChange={e => setEditForm({ ...editForm, priceTiers: e.target.value })} placeholder="Wholesale tiers: min qty:unit price (25:45, 100:40)" />
              <div className="flex gap-2"><Button size="sm" disabled={busyListingIds.includes(item.id)} onClick={() => void saveEdit(item.id)}><Save className="mr-2 h-4 w-4" />Save</Button><Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="mr-2 h-4 w-4" />Cancel</Button></div>
            </div> : <>
              <div className="font-semibold">{item.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{item.resourceType} · {item.status}</div>
              {item.price !== undefined && <div className="mt-2 font-medium">{item.currency} {item.price}</div>}
              {featureEnabledForUi('marketplace.wholesale_pricing') && item.priceTiers?.length ? <div className="mt-1 text-xs text-muted-foreground">Wholesale: {item.priceTiers.map(t => t.minQuantity + '+ ' + (item.unit || 'units') + ' at ' + item.currency + ' ' + t.unitPrice).join(' | ')}</div> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => beginEdit(item)}><Pencil className="mr-2 h-4 w-4" />Edit</Button>
                {item.status === 'DRAFT' && featureEnabledForUi('marketplace.listings') && <Button size="sm" disabled={busyListingIds.includes(item.id)} onClick={() => void publish(item.id)}><Send className="mr-2 h-4 w-4" />Publish</Button>}
                <Button size="sm" variant="ghost" disabled={busyListingIds.includes(item.id)} onClick={() => void archive(item.id)}><Archive className="mr-2 h-4 w-4" />Archive</Button>
              </div>
            </>}
          </article>)}
        </div>
      </section>}

      {token && <section>
        <h2 className="mb-3 text-lg font-semibold">Orders & requests</h2>
        {orders.length === 0 ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No marketplace orders yet. Place a request on a published listing to start a transaction.</div> :
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{orders.map((order) => {
            const isSeller = order.sellerId === currentUserId
            const busy = orderBusyIds.includes(order.id)
            return <article key={order.id} className="rounded-xl border bg-card p-4">
              <div className="font-semibold">{order.listing?.title || 'Marketplace order'}</div>
              <div className="mt-1 text-sm text-muted-foreground">{isSeller ? 'Buyer request' : 'Your request'} · {order.status}</div>
              <div className="mt-2 text-sm">Quantity: {order.quantity} · Listed/unit: {order.currency} {order.unitPrice ?? 'Price to be agreed'}{order.offerPrice != null ? ' · Buyer offer/unit: ' + order.currency + ' ' + order.offerPrice : ''}{order.agreedUnitPrice != null ? ' · Agreed/unit: ' + order.currency + ' ' + order.agreedUnitPrice : ''}</div>
              {order.note && <p className="mt-2 text-sm text-muted-foreground">Note: {order.note}</p>}
              {order.deliveryStatus && <div className="mt-2 rounded-md border p-3 text-xs"><div className="font-medium">Delivery: {order.deliveryStatus.replaceAll('_', ' ')}</div>{order.deliveryCarrier && <div>Carrier: {order.deliveryCarrier}</div>}{order.deliveryTrackingNumber && <div>Tracking: {order.deliveryTrackingNumber}</div>}{order.deliveryTrackingUrl && <a className="mt-1 inline-block underline" href={order.deliveryTrackingUrl} target="_blank" rel="noreferrer">Open carrier tracking</a>}{order.estimatedDeliveryAt && <div>Estimated delivery: {new Date(order.estimatedDeliveryAt).toLocaleDateString()}</div>}</div>}
              {order.payments?.filter((p: any) => p.provider === 'sandbox').map((payment: any) => <div key={payment.id} className="mt-2 rounded-md border border-dashed p-2 text-xs"><div className="font-medium">Sandbox payment - {payment.status}</div><div>Amount: {payment.currency} {payment.amount}</div><div className="text-muted-foreground">Simulation only. No money has moved.</div></div>)}
              {currentUserRole==='SUPER_ADMIN' && order.payments?.some((p:any)=>p.status==='CAPTURED') && <div className="mt-2 w-full rounded-md border border-dashed p-2"><div className="text-xs font-medium">Governance payout hold (record only)</div><input aria-label={'Payout hold reason '+order.id} className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm" placeholder="Reason for hold" value={createHoldReasons[order.id]||''} onChange={e=>setCreateHoldReasons(prev=>({...prev,[order.id]:e.target.value}))}/><Button className="mt-2" size="sm" variant="outline" disabled={holdBusyIds.includes(order.id)} onClick={()=>void createPayoutHold(order)}>{holdBusyIds.includes(order.id)?'Saving…':'Record payout hold'}</Button><p className="mt-1 text-xs text-muted-foreground">Does not hold real funds or initiate a payout.</p></div>}
              {order.payments?.filter((p: any) => p.provider === 'sandbox').map((payment: any) => {
                const refunds = payment.refunds || []
                const chargebacks = payment.chargebacks || []
                const reservedRefunds = refunds.filter((r: any) => r.status === 'REQUESTED' || r.status === 'SUCCEEDED').reduce((sum: number, r: any) => sum + Number(r.amount), 0)
                const reservedChargebacks = chargebacks.filter((c: any) => c.status === 'OPEN' || c.status === 'LOST').reduce((sum: number, c: any) => sum + Number(c.amount), 0)
                const remaining = Math.max(0, Number(payment.amount) - reservedRefunds - reservedChargebacks)
                return <div key={payment.id + '-refunds'} className="mt-2 space-y-2 rounded-md border p-2 text-xs">
                  {refunds.map((refund: any) => <div key={refund.id} className="border-b pb-2 last:border-0"><div className="font-medium">Sandbox refund - {refund.status} - {refund.currency} {refund.amount}</div><div>{refund.reason}</div></div>)}
                  {chargebacks.map((chargeback: any) => <div key={chargeback.id} className="space-y-2 border-b pb-2 last:border-0"><div className="font-medium">Sandbox chargeback - {chargeback.status} - {chargeback.currency} {chargeback.amount}</div><div>{chargeback.reason}</div><div>Evidence deadline: {new Date(chargeback.evidenceDeadline).toLocaleString()}</div>{chargeback.outcomeReason && <div>Outcome: {chargeback.outcomeReason}</div>}{(chargeback.evidenceUrls || []).map((url: string, index: number) => <a key={url + index} className="block underline" href={url} target="_blank" rel="noreferrer">Evidence link {index + 1}</a>)}{isSeller && chargeback.status === 'OPEN' && new Date(chargeback.evidenceDeadline).getTime() > Date.now() && <div className="space-y-2"><input aria-label={'Evidence links for chargeback ' + chargeback.id} className="h-9 w-full rounded-md border bg-background px-3 text-sm" maxLength={2048} placeholder="HTTPS evidence links, comma-separated" value={sandboxChargebackEvidence[chargeback.id] || ''} onChange={e => setSandboxChargebackEvidence(previous => ({ ...previous, [chargeback.id]: e.target.value }))} /><Button size="sm" variant="outline" disabled={sandboxChargebackEvidenceBusyIds.includes(chargeback.id)} onClick={() => void submitSandboxChargebackEvidence(chargeback)}>{sandboxChargebackEvidenceBusyIds.includes(chargeback.id) ? 'Submitting…' : 'Submit evidence'}</Button></div>}</div>)}
                  {!isSeller && payment.status === 'CAPTURED' && featureEnabledForUi('marketplace.chargebacks_sandbox') && remaining > 0 && <div className="space-y-2 border-b pb-2"><div className="font-medium">Open sandbox chargeback (remaining {payment.currency} {remaining.toFixed(2)})</div><input aria-label={'Sandbox chargeback amount ' + order.id} className="h-9 w-full rounded-md border bg-background px-3 text-sm" type="number" min="0.01" max={remaining} step="0.01" value={sandboxChargebackAmounts[order.id] ?? remaining.toFixed(2)} onChange={e => setSandboxChargebackAmounts(previous => ({ ...previous, [order.id]: e.target.value }))} /><input aria-label={'Sandbox chargeback reason ' + order.id} className="h-9 w-full rounded-md border bg-background px-3 text-sm" maxLength={1000} placeholder="Reason for chargeback" value={sandboxChargebackReasons[order.id] || ''} onChange={e => setSandboxChargebackReasons(previous => ({ ...previous, [order.id]: e.target.value }))} /><Button size="sm" variant="outline" disabled={sandboxChargebackBusyIds.includes(order.id)} onClick={() => void createSandboxChargeback(order, remaining)}>{sandboxChargebackBusyIds.includes(order.id) ? 'Opening…' : 'Open sandbox chargeback'}</Button><p className="text-muted-foreground">Simulation only. Creates an evidence deadline and a record-only payout hold; signed sandbox outcome required. No real provider or funds are involved.</p></div>}
                  {!isSeller && payment.status === 'CAPTURED' && featureEnabledForUi('marketplace.refunds_sandbox') && remaining > 0 && <div className="space-y-2"><div className="font-medium">Request sandbox refund (remaining {payment.currency} {remaining.toFixed(2)})</div><input aria-label={'Sandbox refund amount ' + order.id} className="h-9 w-full rounded-md border bg-background px-3 text-sm" type="number" min="0.01" max={remaining} step="0.01" value={sandboxRefundAmounts[order.id] ?? remaining.toFixed(2)} onChange={e => setSandboxRefundAmounts(previous => ({ ...previous, [order.id]: e.target.value }))} /><input aria-label={'Sandbox refund reason ' + order.id} className="h-9 w-full rounded-md border bg-background px-3 text-sm" maxLength={1000} placeholder="Reason for refund" value={sandboxRefundReasons[order.id] || ''} onChange={e => setSandboxRefundReasons(previous => ({ ...previous, [order.id]: e.target.value }))} /><Button size="sm" variant="outline" disabled={sandboxRefundBusyIds.includes(order.id)} onClick={() => void createSandboxRefund(order, remaining)}>{sandboxRefundBusyIds.includes(order.id) ? 'Requesting...' : 'Request sandbox refund'}</Button><p className="text-muted-foreground">Simulation only; a signed sandbox event is required to mark the refund successful.</p></div>}
                </div>
              })}

              {!isSeller && order.status === 'ACCEPTED' && featureEnabledForUi('marketplace.payment_sandbox') && !order.payments?.some((p: any) => p.provider === 'sandbox' && p.status !== 'FAILED') && <Button size="sm" variant="outline" disabled={sandboxPaymentBusyIds.includes(order.id)} onClick={() => void createSandboxPaymentIntent(order)}>{sandboxPaymentBusyIds.includes(order.id) ? 'Preparing sandbox...' : 'Create sandbox payment intent'}</Button>}
              {order.pricingSnapshot && <div className="mt-2 rounded-md bg-muted/50 p-3 text-xs"><div>Subtotal: {order.currency} {order.subtotal ?? order.pricingSnapshot.subtotal}</div><div>Buyer fee: {order.currency} {order.buyerFeeAmount ?? order.pricingSnapshot.buyerFeeAmount}</div><div>Tax: {order.currency} {order.taxAmount ?? order.pricingSnapshot.taxAmount} · {order.pricingSnapshot.taxStatus === 'REVIEW_REQUIRED' ? 'tax review required' : 'configured policy'}</div><div>Buyer total (provisional): {order.currency} {order.buyerTotal ?? order.pricingSnapshot.buyerTotal}</div><div>Seller commission: {order.currency} {order.sellerCommissionAmount ?? order.pricingSnapshot.sellerCommissionAmount}</div><div>Seller net (before other costs): {order.currency} {order.sellerNet ?? order.pricingSnapshot.sellerNet}</div><div className="mt-1 text-muted-foreground">Policy version {order.pricingPolicyVersion ?? order.pricingSnapshot.policyVersion}. No payment has been collected.</div></div>}
              <div className="mt-3 flex flex-wrap gap-2">
                {isSeller && order.status === 'PENDING' && <><input aria-label={'Agreed unit price for order ' + order.id} className="h-9 w-32 rounded-md border bg-background px-2 text-sm" type="number" min="0" step="0.01" placeholder={order.offerPrice != null ? String(order.offerPrice) : 'Accept listed'} value={orderAgreedPrices[order.id] || ''} onChange={(e) => setOrderAgreedPrices(previous => ({ ...previous, [order.id]: e.target.value }))} /><Button size="sm" disabled={busy} onClick={() => void updateOrder(order, 'accept')}>Accept price</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => void updateOrder(order, 'reject')}>Reject</Button></>}
                {!isSeller && order.status === 'PENDING' && <Button size="sm" variant="outline" disabled={busy} onClick={() => void updateOrder(order, 'cancel')}>Cancel request</Button>}
                {!isSeller && order.status === 'PRICE_CONFIRMATION_REQUIRED' && <Button size="sm" disabled={busy} onClick={() => void updateOrder(order, 'confirm-price')}>Confirm revised total</Button>}
                {!isSeller && order.status === 'PRICE_CONFIRMATION_REQUIRED' && featureEnabledForUi('marketplace.offers') && <div className="mt-2 w-full space-y-2"><input aria-label={'Counter-offer unit price for order ' + order.id} className="h-9 w-full rounded-md border bg-background px-3 text-sm" type="number" min="0" step="0.01" placeholder="Counter-offer per unit" value={counterOfferPrices[order.id] || ''} onChange={e => setCounterOfferPrices(previous => ({ ...previous, [order.id]: e.target.value }))} /><input aria-label={'Counter-offer note for order ' + order.id} className="h-9 w-full rounded-md border bg-background px-3 text-sm" maxLength={1000} placeholder="Optional note to seller" value={counterOfferNotes[order.id] || ''} onChange={e => setCounterOfferNotes(previous => ({ ...previous, [order.id]: e.target.value }))} /><Button size="sm" variant="outline" disabled={busy} onClick={() => void submitCounterOffer(order)}>Send counter-offer</Button></div>}
                {featureEnabledForUi('marketplace.reviews') && order.status === 'COMPLETED' && !(order.reviews?.some((r: any) => r.reviewerId === currentUserId)) && <div className="mt-2 w-full space-y-2"><select aria-label={'Review rating for order ' + order.id} className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={reviewRatings[order.id] || '5'} onChange={e => setReviewRatings(previous => ({ ...previous, [order.id]: e.target.value }))}><option value="5">5 · Excellent</option><option value="4">4 · Good</option><option value="3">3 · Okay</option><option value="2">2 · Poor</option><option value="1">1 · Very poor</option></select><input aria-label={'Review comment for order ' + order.id} className="h-9 w-full rounded-md border bg-background px-3 text-sm" placeholder="Comment on the completed transaction (optional)" value={reviewComments[order.id] || ''} onChange={e => setReviewComments(previous => ({ ...previous, [order.id]: e.target.value }))} /><Button size="sm" variant="outline" disabled={busy} onClick={() => void submitReview(order)}>Submit verified review</Button></div>}
                {order.status === 'COMPLETED' && order.reviews?.some((r: any) => r.reviewerId === currentUserId) && <div className="mt-2 text-xs text-muted-foreground">Your review: {order.reviews.find((r: any) => r.reviewerId === currentUserId).rating}/5 · {order.reviews.find((r: any) => r.reviewerId === currentUserId).status}</div>}
                {order.reviews?.filter((r: any) => r.revieweeId === currentUserId).map((review: any) => <div key={review.id} className="mt-2 w-full rounded-md border p-2"><div className="text-xs font-medium">Review received: {review.rating}/5 · {review.status}</div>{review.comment && <p className="mt-1 text-sm">{review.comment}</p>}{review.sellerResponse ? <p className="mt-1 text-xs text-muted-foreground">Your response: {review.sellerResponse}</p> : review.status === 'PUBLISHED' && <div className="mt-2 space-y-2"><input aria-label={'Response to review ' + review.id} className="h-9 w-full rounded-md border bg-background px-3 text-sm" maxLength={2000} placeholder="Reply to this published review" value={reviewResponses[review.id] || ''} onChange={e => setReviewResponses(prev => ({ ...prev, [review.id]: e.target.value }))} /><Button size="sm" variant="outline" onClick={() => void respondToReview(review)}>Post response</Button></div>}</div>)}
                {featureEnabledForUi('marketplace.delivery') && isSeller && order.status === 'ACCEPTED' && order.deliveryStatus !== 'DELIVERED' && order.deliveryStatus !== 'RETURNED' && <div className="mt-2 w-full space-y-2 rounded-md border p-3"><div className="text-xs font-medium">Delivery & tracking</div><select aria-label={'Delivery status for order ' + order.id} className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={deliveryFormFor(order).status} onChange={e => setDeliveryForms(previous => ({ ...previous, [order.id]: { ...deliveryFormFor(order), status: e.target.value } }))}><option value="PREPARING">Preparing</option><option value="DISPATCHED">Dispatched</option><option value="IN_TRANSIT">In transit</option><option value="FAILED">Delivery issue</option><option value="RETURNED">Returned</option></select><input aria-label={'Carrier for order ' + order.id} className="h-9 w-full rounded-md border bg-background px-3 text-sm" maxLength={120} placeholder="Carrier / transporter (optional)" value={deliveryFormFor(order).carrier} onChange={e => setDeliveryForms(previous => ({ ...previous, [order.id]: { ...deliveryFormFor(order), carrier: e.target.value } }))} /><input aria-label={'Tracking number for order ' + order.id} className="h-9 w-full rounded-md border bg-background px-3 text-sm" maxLength={160} placeholder="Tracking / consignment number" value={deliveryFormFor(order).trackingNumber} onChange={e => setDeliveryForms(previous => ({ ...previous, [order.id]: { ...deliveryFormFor(order), trackingNumber: e.target.value } }))} /><input aria-label={'Tracking URL for order ' + order.id} className="h-9 w-full rounded-md border bg-background px-3 text-sm" type="url" placeholder="HTTPS tracking link" value={deliveryFormFor(order).trackingUrl} onChange={e => setDeliveryForms(previous => ({ ...previous, [order.id]: { ...deliveryFormFor(order), trackingUrl: e.target.value } }))} /><input aria-label={'Estimated delivery date for order ' + order.id} className="h-9 w-full rounded-md border bg-background px-3 text-sm" type="date" value={deliveryFormFor(order).estimatedDeliveryAt} onChange={e => setDeliveryForms(previous => ({ ...previous, [order.id]: { ...deliveryFormFor(order), estimatedDeliveryAt: e.target.value } }))} /><Button size="sm" disabled={busy} onClick={() => void saveDelivery(order)}>Save delivery update</Button></div>}
                {featureEnabledForUi('marketplace.delivery') && !isSeller && order.status === 'ACCEPTED' && ['DISPATCHED', 'IN_TRANSIT'].includes(order.deliveryStatus || '') && <Button size="sm" disabled={busy} onClick={() => void confirmDelivery(order)}>Confirm delivery received</Button>}
                {isSeller && order.status === 'ACCEPTED' && (!order.deliveryStatus || order.deliveryStatus === 'DELIVERED') && <Button size="sm" disabled={busy} onClick={() => void updateOrder(order, 'complete')}>Mark completed</Button>}
              </div>
            </article>
          })}</div>}
      </section>}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Published listings <span className="text-sm font-normal text-muted-foreground">({visiblePublished.length})</span></h2>
          <div className="flex flex-wrap gap-2">
            <select aria-label="Listing date range" className="h-9 rounded-md border bg-background px-3 text-sm" value={browsePeriod} onChange={(e) => setBrowsePeriod(e.target.value)}>
              <option value="active">Currently active</option><option value="today">Today / latest today</option><option value="yesterday">Yesterday</option><option value="day-before-yesterday">Day before yesterday</option><option value="week">This week</option>
            </select>
            <select aria-label="Browse category" className="h-9 rounded-md border bg-background px-3 text-sm" value={browseCategory} onChange={(e) => setBrowseCategory(e.target.value)}>
              <option value="ALL">All categories</option>{categoryOptions.map((category) => <option key={category} value={category}>{category.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        </div>
        {!featureEnabledForUi('marketplace.listings') ? <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">Marketplace listings are temporarily disabled by platform policy. Existing history is retained.</div> : visiblePublished.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">{published.length ? 'No listings match these filters.' : 'No published listings yet.'}</div> :
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visiblePublished.map((item) => <article id={'listing-' + item.id} key={item.id} className="rounded-xl border bg-card p-5 shadow-sm">
              {item.imageUrls && item.imageUrls.length > 0 && <div className="mb-3 grid grid-cols-2 gap-2">{item.imageUrls.slice(0, 4).map((url: string) => <img key={url} src={marketplaceMediaSource(url)} alt={item.title} loading="lazy" className="h-36 w-full rounded-md object-cover" />)}</div>}
              <div className="font-semibold">{item.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{(item.offeringType || 'PRODUCT').replace(/_/g, ' ')} · {item.category || 'OTHER'} · {item.resourceType || item.sourceModule || 'General listing'}{item.quantity !== undefined ? ' · ' + item.quantity + ' ' + (item.unit || '') : ''}{item.minOrderQuantity != null ? ' · Minimum order ' + item.minOrderQuantity + ' ' + (item.unit || '') : ''}</div>
              {item.seller?.name && <div className="mt-1 text-xs text-muted-foreground">{['SERVICE','RENTAL','BOOKING','SUBSCRIPTION','PUBLIC_SERVICE','KNOWLEDGE','JOB','LOGISTICS'].includes(item.offeringType || '') ? 'Provider: ' : 'Seller: '}{item.seller.displayName || item.seller.name}{item.seller.isVerified ? ' · Verified' : ''}</div>}
              {item.seller?.profile && <div className="mt-1 text-xs text-muted-foreground">{item.seller.profile.regionLabel || ''}{item.seller.profile.bio ? ' · ' + item.seller.profile.bio : ''}{item.seller.profile.showPhone && item.seller.profile.publicPhone ? ' · ' + item.seller.profile.publicPhone : ''}</div>}
              {item.offeringDetails && Object.keys(item.offeringDetails).length > 0 && <dl className="mt-3 grid gap-2 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2">{Object.entries(item.offeringDetails).map(([key, value]) => {
                const label = offeringDefinitions.find((definition) => definition.type === (item.offeringType || 'PRODUCT'))?.fields.find((field) => field.key === key)?.label || key.replace(/([A-Z])/g, ' $1').replace(/^./, (first) => first.toUpperCase())
                return <div key={key} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words text-sm">{typeof value === 'boolean' ? value ? 'Yes' : 'No' : String(value)}</dd></div>
              })}</dl>}
              {token && (featureEnabledForUi('marketplace.favorites') || featureEnabledForUi('marketplace.messaging')) && <div className="mt-2 flex flex-wrap gap-2">{featureEnabledForUi('marketplace.favorites') && <Button size="sm" variant="outline" disabled={favoriteBusyIds.includes(item.id)} onClick={()=>void toggleFavorite(item)}>{favorites.some((f:any)=>f.listingId===item.id&&f.status==='ACTIVE')?'Remove saved':'Save listing'}</Button>}{featureEnabledForUi('marketplace.messaging') && item.sellerId!==currentUserId && <Button size="sm" variant="ghost" onClick={()=>setMessageForm({recipientId:item.sellerId||'',listingId:item.id,orderId:'',body:''})}>Message seller</Button>}</div>}
              {item.seller?.cautionRating != null && <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-1 text-xs">Marketplace caution indicator: {item.seller.cautionRating}/5 · evidence reviewed · expires {item.seller.cautionExpiresAt ? new Date(item.seller.cautionExpiresAt).toLocaleDateString() : 'when reviewed'}<span className="block text-muted-foreground">This is a platform caution signal, not a final finding of guilt. The affected user can appeal.</span></div>}
              {item.description && <p className="mt-3 text-sm">{item.description}</p>}
              {item.videoUrls?.length ? <div className="mt-3 space-y-1">{item.videoUrls.map((url) => <a key={url} href={marketplaceMediaSource(url)} target="_blank" rel="noopener noreferrer" className="block text-sm text-primary underline">Watch product video</a>)}</div> : null}
              {item.externalLinks?.length ? <div className="mt-2 flex flex-wrap gap-2">{item.externalLinks.map((url) => <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="rounded-md border px-2 py-1 text-xs text-primary underline">Open seller link</a>)}</div> : null}
              <div className="mt-3 flex flex-wrap gap-2" aria-label={'Share ' + item.title}>
                <Button size="sm" variant="outline" onClick={() => void shareListing(item, 'copy')}>Copy link</Button>
                <Button size="sm" variant="outline" onClick={() => void shareListing(item, 'whatsapp')}>WhatsApp</Button>
                <Button size="sm" variant="outline" onClick={() => void shareListing(item, 'email')}>Email</Button>
              </div>
              {item.price !== undefined && <div className="mt-4 text-lg font-semibold">{item.currency} {item.price}</div>}{featureEnabledForUi('marketplace.wholesale_pricing') && item.priceTiers?.length ? <div className="mt-2 rounded-md border p-2 text-xs"><div className="font-medium">Wholesale price breaks</div>{item.priceTiers.slice().sort((a,b) => a.minQuantity-b.minQuantity).map(tier => <div key={tier.minQuantity}>{tier.minQuantity}+ {item.unit || 'units'} · {item.currency} {tier.unitPrice} / unit</div>)}</div> : null}

              {token && featureEnabledForUi('marketplace.orders') && item.sellerId !== currentUserId && <div className="mt-4 space-y-2 border-t pt-3">
                <input aria-label={'Order quantity for ' + item.title} className="h-9 w-full rounded-md border bg-background px-3 text-sm" type="number" min="0.000001" step="any" placeholder={item.offeringType === 'BOOKING' ? 'Seats / sessions / units to request' : item.offeringType === 'RENTAL' ? 'Quantity / rental units' : 'Quantity / units to request'} value={orderQuantities[item.id] ?? '1'} onChange={(e) => setOrderQuantities(previous => ({ ...previous, [item.id]: e.target.value }))} />
                {featureEnabledForUi('marketplace.offers') && <input aria-label={'Offer unit price for ' + item.title} className="h-9 w-full rounded-md border bg-background px-3 text-sm" type="number" min="0" step="0.01" placeholder="Your offer per unit (optional)" value={orderOfferPrices[item.id] || ''} onChange={(e) => setOrderOfferPrices(previous => ({ ...previous, [item.id]: e.target.value }))} />}
                {item.contextPolicyKey === 'AGRI_INPUT_USAGE' && <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <div className="font-medium text-sm">A little context helps KK guide you safely</div>
                  <p className="text-xs text-muted-foreground">Required for this agricultural input order. These answers are attached to this order and visible to its seller to help with relevant usage instructions and follow-up. They are not automatically shared with researchers or other organizations.</p>
                  <input required aria-label={'Intended crop for ' + item.title} className="h-9 w-full rounded-md border bg-background px-3 text-sm" placeholder="Which crop will you use it for? (required)" value={orderContextAnswers[item.id]?.intendedCrop || ''} onChange={e => setOrderContextAnswers(prev => ({...prev,[item.id]:{...(prev[item.id]||{}),intendedCrop:e.target.value}}))} />
                  <input required aria-label={'Use location for ' + item.title} className="h-9 w-full rounded-md border bg-background px-3 text-sm" placeholder="Village / town / district of use (required)" value={orderContextAnswers[item.id]?.region || ''} onChange={e => setOrderContextAnswers(prev => ({...prev,[item.id]:{...(prev[item.id]||{}),region:e.target.value}}))} />
                  <div className="grid grid-cols-2 gap-2"><input aria-label={'Area for ' + item.title} type="number" min="0.0001" step="any" className="h-9 w-full rounded-md border bg-background px-3 text-sm" placeholder="Area (optional)" value={orderContextAnswers[item.id]?.area || ''} onChange={e => setOrderContextAnswers(prev => ({...prev,[item.id]:{...(prev[item.id]||{}),area:e.target.value}}))} /><input aria-label={'Area unit for ' + item.title} className="h-9 w-full rounded-md border bg-background px-3 text-sm" placeholder="Unit: acre, hectare…" value={orderContextAnswers[item.id]?.areaUnit || ''} onChange={e => setOrderContextAnswers(prev => ({...prev,[item.id]:{...(prev[item.id]||{}),areaUnit:e.target.value}}))} /></div>
                  <input aria-label={'Crop stage for ' + item.title} className="h-9 w-full rounded-md border bg-background px-3 text-sm" placeholder="Crop stage (optional)" value={orderContextAnswers[item.id]?.growthStage || ''} onChange={e => setOrderContextAnswers(prev => ({...prev,[item.id]:{...(prev[item.id]||{}),growthStage:e.target.value}}))} />
                  <input aria-label={'Intended purpose for ' + item.title} className="h-9 w-full rounded-md border bg-background px-3 text-sm" placeholder="What do you want to improve or treat? (optional)" value={orderContextAnswers[item.id]?.purpose || ''} onChange={e => setOrderContextAnswers(prev => ({...prev,[item.id]:{...(prev[item.id]||{}),purpose:e.target.value}}))} />
                  <div className="space-y-2 rounded-md border bg-background p-3">
                    <label className="flex items-start gap-2 text-xs"><input type="checkbox" aria-label={'Consent to link context for ' + item.title} checked={Boolean(orderContextLinks[item.id]?.consent)} onChange={e => setOrderContextLinks(prev => ({...prev,[item.id]:{consent:e.target.checked,farmId:prev[item.id]?.farmId||'',cropId:prev[item.id]?.cropId||''}}))} /><span><span className="font-medium">Optional: link this order context to my existing farm/crop record.</span><span className="block text-muted-foreground">Only links records you own. This requires your explicit consent and does not edit your farm or crop data.</span></span></label>
                    <select aria-label={'Context farm link for ' + item.title} disabled={!orderContextLinks[item.id]?.consent} className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={orderContextLinks[item.id]?.farmId || ''} onChange={e => setOrderContextLinks(prev => ({...prev,[item.id]:{consent:Boolean(prev[item.id]?.consent),farmId:e.target.value,cropId:prev[item.id]?.cropId||''}}))}><option value="">No farm link</option>{farmChoices.map(farm => <option key={farm.id} value={farm.id}>{farm.label}</option>)}</select>
                    <select aria-label={'Context crop link for ' + item.title} disabled={!orderContextLinks[item.id]?.consent} className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={orderContextLinks[item.id]?.cropId || ''} onChange={e => setOrderContextLinks(prev => ({...prev,[item.id]:{consent:Boolean(prev[item.id]?.consent),farmId:prev[item.id]?.farmId||'',cropId:e.target.value}}))}><option value="">No crop link</option>{cropChoices.filter(crop => !orderContextLinks[item.id]?.farmId || crop.farmId === orderContextLinks[item.id]?.farmId).map(crop => <option key={crop.id} value={crop.id}>{crop.label}</option>)}</select>
                  </div>
                </div>}
                <input aria-label={'Order note for ' + item.title} className="h-9 w-full rounded-md border bg-background px-3 text-sm" placeholder="Message to seller (optional)" value={orderNotes[item.id] || ''} onChange={(e) => setOrderNotes(previous => ({ ...previous, [item.id]: e.target.value }))} />
                {featureEnabledForUi('marketplace.orders') && <Button size="sm" variant="outline" disabled={quoteBusyIds.includes(item.id)} onClick={() => void calculateOrderQuote(item)}>{quoteBusyIds.includes(item.id) ? 'Calculating…' : 'Calculate deal breakdown'}</Button>}
                {orderQuotes[item.id] && orderQuotes[item.id].quantity === (orderQuantities[item.id] || '1').trim() && orderQuotes[item.id].offerPrice === (orderOfferPrices[item.id] || '').trim() && <div className="rounded-md border p-3 text-xs"><div className="font-medium">Deal breakdown · provisional</div><div>Subtotal: {item.currency} {orderQuotes[item.id].quote.subtotal}</div><div>Buyer platform fee: {item.currency} {orderQuotes[item.id].quote.buyerFeeAmount}</div><div>Tax: {item.currency} {orderQuotes[item.id].quote.taxAmount} · {orderQuotes[item.id].quote.taxStatus === 'REVIEW_REQUIRED' ? 'review required' : 'configured policy'}</div><div className="font-semibold">Buyer total: {item.currency} {orderQuotes[item.id].quote.buyerTotal}</div><div>Seller commission: {item.currency} {orderQuotes[item.id].quote.sellerCommissionAmount}</div><div>Seller net estimate: {item.currency} {orderQuotes[item.id].quote.sellerNet}</div><p className="mt-1 text-muted-foreground">{orderQuotes[item.id].quote.notice}</p></div>}
                <Button size="sm" disabled={orderBusyIds.includes(item.id)} onClick={() => void placeOrder(item)}>{orderBusyIds.includes(item.id) ? 'Sending…' : ({ PRODUCT: 'Request to buy', DIGITAL: 'Request digital product', SERVICE: 'Request service', RENTAL: 'Request rental', BOOKING: 'Request booking', SUBSCRIPTION: 'Request subscription', RFQ: 'Request a quote', PUBLIC_SERVICE: 'Start service request', KNOWLEDGE: 'Enquire / enrol', DONATION: 'Request / offer support', JOB: 'Apply / enquire', LOGISTICS: 'Request logistics quote' } as Record<string, string>)[item.offeringType || 'PRODUCT'] || 'Send request'}</Button>
              </div>}
            </article>)}
          </div>}
      </section>
    </div>
  )
}
