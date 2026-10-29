import { useEffect, useState } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'

type BuyerContext = {
  buyerType: string
  purchasePurpose: string
  businessName?: string | null
  regionLabel?: string | null
  operationScale?: string | null
  cropInterests?: string[]
}
type ModuleKey = 'farms' | 'crops' | 'livestock' | 'inventory' | 'finance'

export function MarketplaceBuyerContextNotice({ module }: { module: ModuleKey }) {
  const token = localStorage.getItem('accessToken') || ''
  const [context, setContext] = useState<BuyerContext | null>(null)

  useEffect(() => {
    let active = true
    if (!token) { setContext(null); return () => { active = false } }
    void api.marketplaceBuyerProfileContext(module, token).then((result: any) => {
      if (active) setContext(result?.available ? result.context as BuyerContext : null)
    }).catch(() => { if (active) setContext(null) })
    return () => { active = false }
  }, [module, token])

  if (!context) return null
  const pretty = (value?: string | null) => (value || '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase())

  return <aside className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/25" aria-label="Consent-based Marketplace buyer context">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 gap-3">
        <div className="rounded-xl bg-emerald-100 p-2 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100"><Sparkles className="size-5" /></div>
        <div className="min-w-0">
          <div className="font-semibold">Your Marketplace profile is available here by consent</div>
          <p className="mt-1 text-sm text-muted-foreground">KK can use these preferences to tailor guidance. They do not change Farm, Crop, Livestock, Inventory or Finance records.</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border bg-background px-2 py-1">Buyer: {pretty(context.buyerType)}</span>
            <span className="rounded-full border bg-background px-2 py-1">Purpose: {pretty(context.purchasePurpose)}</span>
            {context.regionLabel && <span className="rounded-full border bg-background px-2 py-1">Region: {context.regionLabel}</span>}
            {context.operationScale && <span className="rounded-full border bg-background px-2 py-1">Scale: {pretty(context.operationScale)}</span>}
            {context.cropInterests?.length ? <span className="rounded-full border bg-background px-2 py-1">Interests: {context.cropInterests.join(', ')}</span> : null}
          </div>
        </div>
      </div>
      <Link to="/app/shop" className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary underline">Update profile <ArrowRight className="size-4" /></Link>
    </div>
  </aside>
}
