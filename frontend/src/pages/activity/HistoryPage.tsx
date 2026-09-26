import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  Clock3,
  FileText,
  Send,
  UserRound,
  X,
  Sprout,
  Wheat,
} from 'lucide-react'
import { motion } from 'motion/react'

import { api, type TransferRequest } from '@/lib/api'
import { Button } from '@/components/ui/button'

type FarmAsset = {
  id: string
  type?: string
  name?: string
  quantity?: number | null
  unit?: string | null
}

type FarmRecord = {
  id: string
  category?: string
  title?: string
  inputMethod?: string
  data?: Record<string, unknown>
  createdAt?: string
}

type Farm = {
  id: string
  name: string
  location?: string
  createdAt?: string
  updatedAt?: string
  records?: FarmRecord[]
  assets?: FarmAsset[]
}

type Crop = {
  id: string
  farmId?: string
  name: string
  variety?: string
  season?: string
  status?: string
  sowingDate?: string
  harvestDate?: string
  createdAt?: string
  updatedAt?: string
  farm?: {
    id: string
    name: string
  }
}

type HistoryItem = {
  id: string
  timestamp: string
  title: string
  description: string
  context: string
  kind: 'farm' | 'crop' | 'record' | 'lifecycle'
}

function formatEnum(value?: string) {
  if (!value) return '—'

  return value
    .toLowerCase()
    .split('_')
    .map(
      (part) =>
        part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join(' ')
}

function formatDate(value?: string) {
  if (!value) return 'Unknown time'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown time'
  }

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function iconFor(kind: HistoryItem['kind']) {
  if (kind === 'crop') {
    return <Wheat className="size-4" />
  }

  if (kind === 'lifecycle') {
    return <Clock3 className="size-4" />
  }

  if (kind === 'record') {
    return <FileText className="size-4" />
  }

  return <Sprout className="size-4" />
}

export function HistoryPage() {
  const [farms, setFarms] = useState<Farm[]>([])
  const [crops, setCrops] = useState<Crop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [transfers, setTransfers] = useState<TransferRequest[]>([])
  const [outgoingTransfers, setOutgoingTransfers] = useState<TransferRequest[]>([])
  const [lifecycleEvents, setLifecycleEvents] = useState<any[]>([])
  const [transferBusy, setTransferBusy] = useState('')
  const [transferMemberId, setTransferMemberId] = useState('')
  const [transferMember, setTransferMember] = useState<{ id: string; memberId: string; name: string } | null>(null)
  const [transferResource, setTransferResource] = useState('')
  const [transferQuantity, setTransferQuantity] = useState('')
  const [transferReason, setTransferReason] = useState('')
  const [transferTransactionId, setTransferTransactionId] = useState('')
  const [transferMemberBusy, setTransferMemberBusy] = useState(false)
  const [transferCreateBusy, setTransferCreateBusy] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const token = localStorage.getItem('accessToken')

      if (!token) {
        setError('Your session has expired.')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError('')

        const [farmResult, cropResult, transferResult, outgoingTransferResult] =
          await Promise.all([
            api.farms(token),
            api.crops(token),
            api.transferIncomingPending(token),
            api.transferOutgoing(token),
          ])

        if (cancelled) return

        setFarms(
          Array.isArray(farmResult)
            ? (farmResult as Farm[])
            : [],
        )

        setCrops(
          Array.isArray(cropResult)
            ? (cropResult as Crop[])
            : [],
        )

        setTransfers(
          Array.isArray(transferResult)
            ? transferResult
            : [],
        )

        setOutgoingTransfers(
          Array.isArray(outgoingTransferResult)
            ? outgoingTransferResult
            : [],
        )

        const assetEventGroups = await Promise.all(
          (Array.isArray(farmResult) ? farmResult : []).flatMap((farm) =>
            ((farm as Farm).assets ?? []).map(async (asset) => {
              const farmId = (farm as Farm).id
              const [movementResult, lineageResult, evidenceResult] = await Promise.all([
                api.farmAssetMovementHistory(farmId, asset.id, token),
                api.farmAssetLineageHistory(farmId, asset.id, token),
                api.farmAssetEvidenceHistory(farmId, asset.id, token),
              ])
              const movements = (movementResult as any)?.movements ?? []
              const lineages = (lineageResult as any)?.lineages ?? []
              const evidence = (evidenceResult as any)?.evidence ?? []
              return [
                ...(Array.isArray(movements) ? movements : []).map((event: any) => ({
                  id: 'movement-' + event.id,
                  timestamp: event.effectiveAt || event.recordedAt,
                  title: formatEnum(event.movementType) + ': ' + (asset.name || asset.type || 'Asset'),
                  description: event.reason || 'Resource movement recorded.',
                  context: (farm as Farm).name,
                  kind: 'lifecycle' as const,
                })),
                ...(Array.isArray(lineages) ? lineages : []).map((event: any) => ({
                  id: 'lineage-' + event.id,
                  timestamp: event.effectiveAt,
                  title: formatEnum(event.lineageType) + ': ' + (asset.name || asset.type || 'Asset'),
                  description: event.reason || 'Resource lineage recorded.',
                  context: (farm as Farm).name,
                  kind: 'lifecycle' as const,
                })),
                ...(Array.isArray(evidence) ? evidence : []).map((event: any) => ({
                  id: 'evidence-' + event.id,
                  timestamp: event.issuedAt || event.createdAt,
                  title: 'Evidence: ' + formatEnum(event.evidenceType),
                  description: event.documentNumber
                    ? event.referenceValue + ' · ' + event.documentNumber
                    : event.referenceValue || 'Resource evidence recorded.',
                  context: (farm as Farm).name + ' · ' + (asset.name || asset.type || 'Asset'),
                  kind: 'lifecycle' as const,
                })),
              ]
            }),
          ).map((promise) => promise.catch(() => [])),
        )

        const farmEvidenceGroups = await Promise.all(
          (Array.isArray(farmResult) ? farmResult : []).map(async (farm) => {
            const result = await api.farmEvidenceHistory((farm as Farm).id, token)
            return ((result as any)?.evidence ?? []).map((event: any) => ({
              id: 'farm-evidence-' + event.id,
              timestamp: event.issuedAt || event.createdAt,
              title: 'Evidence: ' + formatEnum(event.evidenceType),
              description: event.documentNumber
                ? event.referenceValue + ' · ' + event.documentNumber
                : event.referenceValue || 'Farm evidence recorded.',
              context: (farm as Farm).name,
              kind: 'lifecycle' as const,
            }))
          })

        )

        const cropRelationshipGroups = await Promise.all(
          (Array.isArray(cropResult) ? cropResult : []).map(async (crop) => {
            const relationships = await api.cropRelationshipHistory(crop.id, token)
            return (Array.isArray(relationships) ? relationships : []).map((relationship: any) => ({
              id: 'crop-relationship-' + crop.id + '-' + relationship.userId + '-' + relationship.validFrom,
              timestamp: relationship.endedAt || relationship.validFrom,
              title: formatEnum(relationship.relationshipType) + ': ' + crop.name,
              description: relationship.endedAt
                ? relationship.endedReason || 'Crop relationship ended.'
                : 'Crop relationship became active.',
              context: crop.farm?.name || 'Crop',
              kind: 'lifecycle' as const,
            }))
          })

        )

        setLifecycleEvents([
          ...assetEventGroups.flat(),
          ...farmEvidenceGroups.flat(),
          ...cropRelationshipGroups.flat(),
        ])
      } catch (err) {
        if (cancelled) return

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load history.',
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  const history = useMemo<HistoryItem[]>(() => {
    const items: HistoryItem[] = []

    for (const farm of farms) {
      if (farm.createdAt) {
        items.push({
          id: `farm-created-${farm.id}`,
          timestamp: farm.createdAt,
          title: `Farm created: ${farm.name}`,
          description:
            farm.location
              ? `Farm workspace created for ${farm.location}.`
              : 'Farm workspace created.',
          context: 'Farm',
          kind: 'farm',
        })
      }

      if (
        farm.updatedAt &&
        farm.createdAt &&
        farm.updatedAt !== farm.createdAt
      ) {
        items.push({
          id: `farm-updated-${farm.id}`,
          timestamp: farm.updatedAt,
          title: `Farm updated: ${farm.name}`,
          description:
            'The farm configuration was updated.',
          context: 'Farm',
          kind: 'farm',
        })
      }

      for (const record of farm.records ?? []) {
        if (!record.createdAt) continue

        items.push({
          id: `record-${record.id}`,
          timestamp: record.createdAt,
          title:
            record.title ||
            `${formatEnum(record.category)} record`,
          description:
            typeof record.data?.description === 'string' && record.data.description
              ? record.data.description
              : 'Operational information recorded against the farm.',
          context: farm.name,
          kind: 'record',
        })
      }
    }

    for (const crop of crops) {
      const farmName =
        crop.farm?.name ||
        farms.find((farm) => farm.id === crop.farmId)?.name

      if (crop.createdAt) {
        items.push({
          id: `crop-created-${crop.id}`,
          timestamp: crop.createdAt,
          title: `Crop added: ${crop.name}`,
          description:
            crop.variety
              ? `${crop.variety} added to the crop workspace.`
              : 'Crop added to the crop workspace.',
          context: farmName || 'Crop',
          kind: 'crop',
        })
      }

      if (
        crop.sowingDate &&
        (!crop.createdAt ||
          crop.sowingDate !== crop.createdAt)
      ) {
        items.push({
          id: `crop-sown-${crop.id}`,
          timestamp: crop.sowingDate,
          title: `Sowing date: ${crop.name}`,
          description:
            'The crop has a recorded sowing date.',
          context: farmName || 'Crop',
          kind: 'crop',
        })
      }

      if (crop.harvestDate) {
        items.push({
          id: `crop-harvest-${crop.id}`,
          timestamp: crop.harvestDate,
          title: `Harvest date: ${crop.name}`,
          description:
            'The crop has a recorded harvest date.',
          context: farmName || 'Crop',
          kind: 'crop',
        })
      }

      if (
        crop.updatedAt &&
        crop.createdAt &&
        crop.updatedAt !== crop.createdAt
      ) {
        items.push({
          id: `crop-updated-${crop.id}`,
          timestamp: crop.updatedAt,
          title: `Crop updated: ${crop.name}`,
          description: crop.status
            ? `Current status: ${formatEnum(crop.status)}.`
            : 'Crop information was updated.',
          context: farmName || 'Crop',
          kind: 'crop',
        })
      }
    }

    items.push(...lifecycleEvents)

    return items.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() -
        new Date(a.timestamp).getTime(),
    )
  }, [crops, farms, lifecycleEvents])

  async function resolveTransferMember() {
    const token = localStorage.getItem('accessToken')
    if (!token || !transferMemberId.trim()) return

    try {
      setTransferMemberBusy(true)
      setError('')
      const member = await api.findTransferMember(transferMemberId.trim(), token)
      setTransferMember(member)
    } catch (err) {
      setTransferMember(null)
      setError(err instanceof Error ? err.message : 'Unable to find that member.')
    } finally {
      setTransferMemberBusy(false)
    }
  }

  async function createTransfer() {
    const token = localStorage.getItem('accessToken')
    if (!token || !transferMember || !transferResource) return

    const [resourceType, resourceId] = transferResource.split(':')
    const asset = farms.flatMap((farm) => farm.assets ?? []).find((item) => item.id === resourceId)
    const quantity = transferQuantity.trim() ? Number(transferQuantity) : undefined

    if (quantity !== undefined && (!Number.isFinite(quantity) || quantity <= 0)) {
      setError('Transfer quantity must be greater than zero.')
      return
    }

    if (quantity !== undefined && resourceType !== 'farmAsset') {
      setError('Quantity is available only for farm assets.')
      return
    }

    if (quantity !== undefined && asset?.quantity != null && quantity >= asset.quantity) {
      setError('For a partial transfer, quantity must be less than the current asset quantity.')
      return
    }

    try {
      setTransferCreateBusy(true)
      setError('')
      await api.createTransfer({
        resourceType,
        resourceId,
        destinationUserId: transferMember.id,
        quantity,
        unit: asset?.unit ?? undefined,
        reason: transferReason.trim() || undefined,
        transactionId: transferTransactionId.trim() || undefined,
      }, token)
      setTransferMemberId('')
      setTransferMember(null)
      setTransferResource('')
      setTransferQuantity('')
      setTransferReason('')
      setTransferTransactionId('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create transfer request.')
    } finally {
      setTransferCreateBusy(false)
    }
  }

  async function handleTransferAction(
    requestId: string,
    action: 'accept' | 'reject',
  ) {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      setTransferBusy(action + ':' + requestId)
      setError('')
      if (action === 'accept') {
        await api.acceptTransfer(requestId, token)
      } else {
        await api.rejectTransfer(requestId, token)
      }
      setTransfers((current) =>
        current.filter((item) => item.id !== requestId),
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to ' + action + ' transfer request.',
      )
    } finally {
      setTransferBusy('')
    }
  }

  async function handleCancelTransfer(requestId: string) {
    const token = localStorage.getItem('accessToken')
    if (!token) return

    try {
      setTransferBusy('cancel:' + requestId)
      setError('')
      await api.cancelTransfer(requestId, token)
      setOutgoingTransfers((current) =>
        current.map((item) =>
          item.id === requestId
            ? { ...item, status: 'CANCELLED' }
            : item,
        ),
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to cancel transfer request.',
      )
    } finally {
      setTransferBusy('')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Clock3 className="size-4" />
          History
        </div>

        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Farm history
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Follow the operational timeline across farms, crops and
          recorded events.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Send className="size-5" />
          </div>
          <div>
            <div className="text-sm font-medium text-primary">Transfer resource</div>
            <h2 className="mt-1 text-xl font-semibold">Create transfer request</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Select one of your owned resources and send it to another active member by Member ID.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium">Destination Member ID</span>
            <div className="flex gap-2">
              <input
                value={transferMemberId}
                onChange={(event) => {
                  setTransferMemberId(event.target.value.toUpperCase())
                  setTransferMember(null)
                }}
                placeholder="IN-1234567890"
                className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button size="sm" variant="outline" disabled={transferMemberBusy || !transferMemberId.trim()} onClick={() => void resolveTransferMember()}>
                <UserRound className="mr-1 size-4" />
                {transferMemberBusy ? 'Finding…' : 'Find'}
              </Button>
            </div>
            {transferMember && (
              <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs">
                <span className="font-medium">{transferMember.name}</span> · {transferMember.memberId}
              </div>
            )}
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Resource</span>
            <select
              value={transferResource}
              onChange={(event) => {
                setTransferResource(event.target.value)
                setTransferQuantity('')
              }}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Select a resource</option>
              {farms.map((farm) => (
                <optgroup key={farm.id} label={`Farm · ${farm.name}`}>
                  <option value={`farm:${farm.id}`}>Farm · {farm.name}</option>
                  {(farm.assets ?? []).map((asset) => (
                    <option key={asset.id} value={`farmAsset:${asset.id}`}>
                      Asset · {asset.name || asset.type || asset.id}{asset.quantity != null ? ` · ${asset.quantity} ${asset.unit || ''}` : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          {transferResource.startsWith('farmAsset:') && (
            <label className="space-y-2 text-sm">
              <span className="font-medium">Quantity <span className="text-muted-foreground">(leave blank for full transfer)</span></span>
              <input
                type="number"
                min="0"
                step="any"
                value={transferQuantity}
                onChange={(event) => setTransferQuantity(event.target.value)}
                placeholder="Partial quantity"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
            </label>
          )}

          <label className="space-y-2 text-sm">
            <span className="font-medium">Transaction / document reference <span className="text-muted-foreground">(optional)</span></span>
            <input
              value={transferTransactionId}
              onChange={(event) => setTransferTransactionId(event.target.value)}
              placeholder="Sale deed, receipt, agreement number…"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            />
          </label>

          <label className="space-y-2 text-sm md:col-span-2">
            <span className="font-medium">Reason <span className="text-muted-foreground">(optional)</span></span>
            <input
              value={transferReason}
              onChange={(event) => setTransferReason(event.target.value)}
              placeholder="Why is this resource being transferred?"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end">
          <Button
            disabled={transferCreateBusy || !transferMember || !transferResource}
            onClick={() => void createTransfer()}
          >
            <Send className="mr-1 size-4" />
            {transferCreateBusy ? 'Sending…' : 'Send transfer request'}
          </Button>
        </div>
      </div>

      {transfers.length > 0 && (
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-primary">Pending transfers</div>
              <h2 className="mt-1 text-xl font-semibold">Action required</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Review ownership or quantity transfers waiting for your response.
              </p>
            </div>
            <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {transfers.length} pending
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {transfers.map((item) => {
              const busy = transferBusy === 'accept:' + item.id || transferBusy === 'reject:' + item.id
              const sourceName = item.sourceUser?.name || 'Another member'
              const sourceMember = item.sourceUser?.memberId
              const quantity =
                item.quantity === null
                  ? 'Full resource'
                  : item.quantity + ' ' + (item.unit || 'units')

              return (
                <div key={item.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">
                        {item.resourceType} · {item.resourceId}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        From {sourceName}{sourceMember ? ' · ' + sourceMember : ''} · {quantity}
                      </p>
                      {item.reason && (
                        <p className="mt-2 text-sm">{item.reason}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => void handleTransferAction(item.id, 'reject')}
                        variant="outline"
                      >
                        <X className="mr-1 size-4" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => void handleTransferAction(item.id, 'accept')}
                      >
                        <Check className="mr-1 size-4" />
                        Accept
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Request {item.requestNumber} · {formatDate(item.requestedAt)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {outgoingTransfers.length > 0 && (
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-primary">Sent transfers</div>
              <h2 className="mt-1 text-xl font-semibold">Transfer requests</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Track requests you sent and cancel pending requests before they are accepted.
              </p>
            </div>
            <div className="rounded-full bg-muted px-3 py-1 text-sm font-medium">
              {outgoingTransfers.filter((item) => item.status === 'PENDING').length} pending
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {outgoingTransfers.slice(0, 20).map((item) => {
              const pending = item.status === 'PENDING'
              const busy = transferBusy === 'cancel:' + item.id
              const destinationName = item.destinationUser?.name || 'Another member'
              const destinationMember = item.destinationUser?.memberId
              const quantity =
                item.quantity === null
                  ? 'Full resource'
                  : item.quantity + ' ' + (item.unit || 'units')

              return (
                <div key={item.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">
                        {item.resourceType} · {item.resourceId}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        To {destinationName}{destinationMember ? ' · ' + destinationMember : ''} · {quantity}
                      </p>
                      {item.reason && (
                        <p className="mt-2 text-sm">{item.reason}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                        {formatEnum(item.status)}
                      </span>
                      {pending && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void handleCancelTransfer(item.id)}
                        >
                          <X className="mr-1 size-4" />
                          {busy ? 'Cancelling…' : 'Cancel'}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Request {item.requestNumber} · {formatDate(item.requestedAt)}
                    {item.transactionId ? ' · ' + item.transactionId : ''}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl border bg-card p-5">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Loading history...
          </div>
        ) : history.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Clock3 className="size-5" />
            </div>

            <div className="mt-4 font-medium">
              No history yet
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              Your farm timeline will appear here as operational
              data is added.
            </p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute bottom-4 left-[17px] top-4 w-px bg-border" />

            <div className="space-y-7">
              {history.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{
                    opacity: 0,
                    x: -5,
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                  }}
                  transition={{
                    duration: 0.2,
                    delay: Math.min(index, 8) * 0.025,
                  }}
                  className="relative flex gap-4"
                >
                  <div className="relative z-10 flex size-[35px] shrink-0 items-center justify-center rounded-full border bg-background text-primary shadow-sm">
                    {iconFor(item.kind)}
                  </div>

                  <div className="min-w-0 flex-1 pb-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="font-medium">
                        {item.title}
                      </div>

                      <div className="shrink-0 text-xs text-muted-foreground">
                        {formatDate(item.timestamp)}
                      </div>
                    </div>

                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>

                    <div className="mt-2 text-xs text-muted-foreground">
                      {item.context}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
