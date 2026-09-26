import { useMemo, useState } from 'react'
import { Combine } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

type FarmAsset = {
  id: string
  name?: string
  type?: string
  quantity?: number
  unit?: string
}

type FarmAssetMergePanelProps = {
  farmId: string
  assets: FarmAsset[]
  token: string
  onComplete: () => Promise<void>
  onError: (message: string) => void
}

export function FarmAssetMergePanel({ farmId, assets, token, onComplete, onError }: FarmAssetMergePanelProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [name, setName] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const selectedAssets = useMemo(
    () => assets.filter((asset) => selectedIds.includes(asset.id)),
    [assets, selectedIds],
  )

  const compatible = useMemo(() => {
    if (selectedAssets.length < 2) return true
    const [first] = selectedAssets
    return selectedAssets.every((asset) => asset.type === first.type && asset.unit === first.unit)
  }, [selectedAssets])

  const toggleAsset = (id: string) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  const submit = async () => {
    if (selectedAssets.length < 2 || !compatible || !token) return
    try {
      setSaving(true)
      onError('')
      await api.mergeFarmAssets(farmId, {
        sourceAssetIds: selectedIds,
        name: name.trim() || undefined,
        reason: reason.trim() || undefined,
      }, token)
      setSelectedIds([])
      setName('')
      setReason('')
      await onComplete()
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unable to merge farm assets.')
    } finally {
      setSaving(false)
    }
  }

  const quantifiedAssets = assets.filter((asset) => asset.quantity !== undefined && asset.quantity !== null)

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
          <Combine className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Merge quantified assets</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Combine compatible assets into one new resource while preserving lineage history.</p>
        </div>
      </div>

      {quantifiedAssets.length < 2 ? (
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">At least two quantified assets are required.</p>
      ) : (
        <>
          <div className="mt-4 space-y-2">
            {quantifiedAssets.map((asset) => (
              <label key={asset.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
                <input type="checkbox" checked={selectedIds.includes(asset.id)} onChange={() => toggleAsset(asset.id)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">{asset.name || asset.type || asset.id}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">{asset.type || 'Asset'} · {asset.quantity} {asset.unit || ''}</span>
                </span>
              </label>
            ))}
          </div>

          {selectedAssets.length >= 2 && !compatible && <p className="mt-3 text-xs text-destructive">Selected assets must have the same type and unit.</p>}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="New merged asset name (optional)" className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason (optional)" className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </div>

          <div className="mt-4 flex justify-end">
            <Button type="button" disabled={saving || selectedAssets.length < 2 || !compatible} onClick={() => void submit()}>
              <Combine className="mr-2 h-4 w-4" />
              {saving ? 'Merging…' : `Merge ${selectedAssets.length || ''} assets`}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
