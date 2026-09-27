import { useMemo, useState } from 'react'
import { CalendarClock, KeyRound } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'

type FarmAsset = {
  id: string
  name?: string
  type?: string
  quantity?: number
  unit?: string
}

type Props = {
  farmId: string
  asset: FarmAsset
  token: string
  onComplete: () => Promise<void>
  onError: (message: string) => void
}

export function FarmAssetLeasePanel({ farmId, asset, token, onComplete, onError }: Props) {
  const [open, setOpen] = useState(false)
  const [memberId, setMemberId] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [ending, setEnding] = useState(false)
  const [custodySaving, setCustodySaving] = useState(false)
  const [custodyReturning, setCustodyReturning] = useState(false)

  const validUntilIso = useMemo(() => {
    if (!validUntil) return ''
    return new Date(validUntil).toISOString()
  }, [validUntil])

  const submitLease = async () => {
    if (!memberId.trim() || !validUntilIso || !token) return
    try {
      setSaving(true)
      onError('')
      await api.leaseFarmAsset(farmId, asset.id, {
        destinationUserId: memberId.trim(),
        validUntil: validUntilIso,
        reason: reason.trim() || undefined,
      }, token)
      setMemberId('')
      setValidUntil('')
      setReason('')
      await onComplete()
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unable to lease asset.')
    } finally {
      setSaving(false)
    }
  }

  const assignCustodian = async () => {
    if (!memberId.trim() || !token) return
    try {
      setCustodySaving(true)
      onError('')
      await api.assignFarmAssetCustodian(farmId, asset.id, {
        destinationUserId: memberId.trim(),
        reason: reason.trim() || undefined,
      }, token)
      setMemberId('')
      setReason('')
      await onComplete()
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unable to assign custodian.')
    } finally {
      setCustodySaving(false)
    }
  }

  const returnCustody = async () => {
    if (!token) return
    try {
      setCustodyReturning(true)
      onError('')
      await api.returnFarmAssetCustody(farmId, asset.id, {
        reason: reason.trim() || 'Asset returned to owner',
      }, token)
      setReason('')
      await onComplete()
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unable to return custody.')
    } finally {
      setCustodyReturning(false)
    }
  }

  const endLease = async () => {
    if (!token) return
    try {
      setEnding(true)
      onError('')
      await api.endFarmAssetLease(farmId, asset.id, {
        reason: reason.trim() || 'Lease ended from Farm workspace',
      }, token)
      setReason('')
      await onComplete()
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unable to end lease.')
    } finally {
      setEnding(false)
    }
  }

  return (
    <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
      >
        <KeyRound className="h-3.5 w-3.5" />
        {open ? 'Hide lease controls' : 'Lease / end lease'}
      </button>

      {open && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-950/40">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Recipient Member ID</span>
              <input
                value={memberId}
                onChange={(event) => setMemberId(event.target.value)}
                placeholder="IN-0000000000"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Lease valid until</span>
              <div className="relative">
                <CalendarClock className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="datetime-local"
                  value={validUntil}
                  onChange={(event) => setValidUntil(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </label>
          </div>

          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason (optional)"
            className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />

          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button type="button" size="sm" variant="outline" disabled={ending} onClick={() => void endLease()}>
              {ending ? 'Ending…' : 'End active lease'}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={custodyReturning} onClick={() => void returnCustody()}>
              {custodyReturning ? 'Returning…' : 'Return to owner'}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={custodySaving || !memberId.trim()} onClick={() => void assignCustodian()}>
              {custodySaving ? 'Assigning…' : 'Assign custodian'}
            </Button>
            <Button type="button" size="sm" disabled={saving || !memberId.trim() || !validUntilIso} onClick={() => void submitLease()}>
              {saving ? 'Leasing…' : 'Start lease'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
