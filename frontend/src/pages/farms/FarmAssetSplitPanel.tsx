import { useState } from 'react'
import { Scissors } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

type FarmAsset = {
  id: string
  name?: string
  type?: string
  quantity?: number
  unit?: string
}

type FarmAssetSplitPanelProps = {
  farmId: string
  asset: FarmAsset
  token: string
  onComplete: () => Promise<void>
  onError: (message: string) => void
}

export function FarmAssetSplitPanel({ farmId, asset, token, onComplete, onError }: FarmAssetSplitPanelProps) {
  const [quantity, setQuantity] = useState('')
  const [name, setName] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const sourceQuantity = asset.quantity ?? 0
  const requestedQuantity = Number(quantity)
  const validQuantity = Number.isFinite(requestedQuantity) && requestedQuantity > 0 && requestedQuantity < sourceQuantity

  const submit = async () => {
    if (!token || !validQuantity) return
    try {
      setSaving(true)
      onError('')
      await api.splitFarmAsset(farmId, asset.id, {
        quantity: requestedQuantity,
        name: name.trim() || undefined,
        reason: reason.trim() || undefined,
      }, token)
      setQuantity('')
      setName('')
      setReason('')
      await onComplete()
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unable to split farm asset.')
    } finally {
      setSaving(false)
    }
  }

  if (asset.quantity === undefined || asset.quantity === null) return null

  return (
    <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
      <div className="flex items-start gap-2">
        <Scissors className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div>
          <p className="text-xs font-semibold text-slate-900 dark:text-white">Split quantified asset</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Create a child resource while preserving the source quantity and lineage.</p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <input type="number" min="0.000001" max={Math.max(sourceQuantity - 0.000001, 0)} step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder={`Quantity (${asset.unit || 'unit'})`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-950 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="New asset name (optional)" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-950 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason (optional)" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-950 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-slate-500 dark:text-slate-400">Source: {sourceQuantity} {asset.unit || ''} · Remaining after split: {validQuantity ? sourceQuantity - requestedQuantity : '—'} {asset.unit || ''}</p>
        <Button type="button" size="sm" variant="outline" disabled={saving || !validQuantity} onClick={() => void submit()}>
          <Scissors className="mr-2 h-3.5 w-3.5" />
          {saving ? 'Splitting…' : 'Split asset'}
        </Button>
      </div>
    </div>
  )
}
