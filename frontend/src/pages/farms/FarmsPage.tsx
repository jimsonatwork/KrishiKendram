import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { FormEvent } from 'react'
import {
  FileText,
  MapPin,
  Package,
  Pencil,
  Plus,
  Search,
  Sprout,
  Trash2,
} from 'lucide-react'
import { motion } from 'framer-motion'

import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { FarmAssetMergePanel } from './FarmAssetMergePanel'

type FarmAsset = {
  id: string
  name?: string
  type?: string
  quantity?: number
  unit?: string
  metadata?: Record<string, unknown>
}

type FarmRecord = {
  id: string
  category?: string
  title?: string
  inputMethod?: string
  data?: Record<string, unknown>
  createdAt?: string
}

type CropSummary = {
  id: string
  farmId?: string
  name?: string
  variety?: string
  season?: string
  status?: string
  area?: number | null
  unit?: string
  farm?: {
    id: string
    name?: string
  }
}

type AssetFormData = {
  type: string
  name: string
  quantity: string
  unit: string
  metadata: string
}

type RecordFormData = {
  category: string
  title: string
  description: string
  inputMethod: string
  data: string
}

type Farm = {
  id: string
  name: string
  type: string
  location?: string
  area?: number
  unit?: string
  assets?: FarmAsset[]
  records?: FarmRecord[]
}

type FarmFormData = {
  name: string
  type: string
  location: string
  area: string
  unit: string
}

const FARM_TYPES = [
  'Crop Farm',
  'Dairy Farm',
  'Poultry Farm',
  'Livestock Farm',
  'Mixed Farm',
  'Horticulture Farm',
  'Aquaculture Farm',
  'Other',
]

const EMPTY_FORM: FarmFormData = {
  name: '',
  type: 'Crop Farm',
  location: '',
  area: '',
  unit: 'acres',
}

const EMPTY_ASSET_FORM: AssetFormData = {
  type: '',
  name: '',
  quantity: '',
  unit: 'count',
  metadata: '',
}

const EMPTY_RECORD_FORM: RecordFormData = {
  category: '',
  title: '',
  description: '',
  inputMethod: 'MANUAL',
  data: '',
}

function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="mb-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          {eyebrow}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          {description}
        </p>
      </div>

      {action}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">
            {value}
          </p>
        </div>

        <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  min,
  step,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  min?: string
  step?: string
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </span>

      <input
        type={type}
        value={value}
        min={min}
        step={step}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
    </label>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

function FarmForm({
  form,
  editing,
  saving,
  onChange,
  onSubmit,
  onCancel,
}: {
  form: FarmFormData
  editing: boolean
  saving: boolean
  onChange: (patch: Partial<FarmFormData>) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onCancel: () => void
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
          {editing ? 'Edit farm' : 'Create farm'}
        </h2>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Keep the core farm information accurate so future crop, livestock,
          asset and activity records can attach to the right place.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Farm name"
          value={form.name}
          placeholder="e.g. Green Valley Farm"
          onChange={(value) => onChange({ name: value })}
        />

        <SelectField
          label="Farm type"
          value={form.type}
          options={FARM_TYPES}
          onChange={(value) => onChange({ type: value })}
        />

        <Field
          label="Location"
          value={form.location}
          placeholder="Village, district or location"
          onChange={(value) => onChange({ location: value })}
        />

        <Field
          label="Area"
          value={form.area}
          type="number"
          min="0"
          step="0.01"
          placeholder="0"
          onChange={(value) => onChange({ area: value })}
        />

        <SelectField
          label="Area unit"
          value={form.unit}
          options={['acres', 'hectares', 'cents', 'sq ft', 'sq m']}
          onChange={(value) => onChange({ unit: value })}
        />
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-3">
        {editing && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </Button>
        )}

        <Button type="submit" disabled={saving || !form.name.trim()}>
          {saving ? 'Saving…' : editing ? 'Save changes' : 'Create farm'}
        </Button>
      </div>
    </form>
  )
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-lg bg-slate-100 p-2 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm font-medium text-slate-800 dark:text-slate-200">
          {value}
        </p>
      </div>
    </div>
  )
}

function AssetLineageHistory({
  farmId,
  assetId,
}: {
  farmId: string
  assetId: string
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<any[]>([])

  const loadHistory = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    setLoading(true)
    try {
      const result = await api.farmAssetLineageHistory(farmId, assetId, token)
      setHistory(Array.isArray(result) ? result : [])
    } catch {
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) void loadHistory()
  }

  return (
    <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
      <button
        type="button"
        onClick={toggle}
        className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
      >
        {open ? 'Hide lineage history' : 'View lineage history'}
      </button>
      {open && (
        <div className="mt-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-950/40">
          {loading ? (
            <p className="text-xs text-slate-500">Loading lineage…</p>
          ) : history.length === 0 ? (
            <p className="text-xs text-slate-500">No lineage history available.</p>
          ) : (
            <div className="space-y-2">
              {history.map((item, index) => (
                <div
                  key={String(item.id || item.movementId || index)}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[11px] dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex flex-wrap justify-between gap-2 text-xs">
                    <span className="font-medium">{item.lineageType || 'LINEAGE'}</span>
                    <span className="text-slate-500">
                      {item.effectiveAt ? new Date(item.effectiveAt).toLocaleString() : 'Effective time not recorded'}
                    </span>
                  </div>
                  <div className="mt-1 text-slate-500">
                    Source: {item.sourceResourceType || 'resource'} / {item.sourceResourceId || 'unknown'}
                  </div>
                  <div className="mt-1 text-slate-500">
                    Target: {item.targetResourceType || 'resource'} / {item.targetResourceId || 'unknown'}
                  </div>
                  {item.quantity !== undefined && item.quantity !== null && (
                    <div className="mt-1 text-slate-500">
                      Quantity: {String(item.quantity)}{item.unit ? ' ' + item.unit : ''}
                    </div>
                  )}
                  {item.movementId && <div className="mt-1 text-slate-500">Movement: {item.movementId}</div>}
                  {item.reason && <div className="mt-1 text-slate-500">Reason: {item.reason}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AssetRelationshipHistory({
  farmId,
  assetId,
}: {
  farmId: string
  assetId: string
}) {
  const token = localStorage.getItem('accessToken')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<any[]>([])

  const loadHistory = async () => {
    if (!token) return
    setLoading(true)
    try {
      const result = await api.farmAssetRelationshipHistory(
        farmId,
        assetId,
        token,
      )
      setHistory(Array.isArray(result) ? result : [])
    } catch {
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) void loadHistory()
  }

  return (
    <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
      <button
        type="button"
        onClick={toggle}
        className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
      >
        {open ? 'Hide relationship history' : 'View relationship history'}
      </button>

      {open && (
        <div className="mt-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-950/40">
          {loading ? (
            <p className="text-xs text-slate-500">Loading history…</p>
          ) : history.length === 0 ? (
            <p className="text-xs text-slate-500">No relationship history available.</p>
          ) : (
            <div className="space-y-2">
              {history.map((item, index) => (
                <div
                  key={`${item.resourceId || assetId}-${index}`}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex flex-wrap justify-between gap-2 text-xs">
                    <span className="font-medium">{item.relationshipType || 'Relationship'}</span>
                    <span className="text-slate-500">{item.status || 'UNKNOWN'}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {item.validFrom ? new Date(item.validFrom).toLocaleString() : 'Start not recorded'}
                    {item.validUntil ? ` → ${new Date(item.validUntil).toLocaleString()}` : ' → current/non-expiring'}
                  </div>
                  {item.endedReason && (
                    <div className="mt-1 text-[11px] text-slate-500">
                      Reason: {item.endedReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}


function ResourceHistoryPanel({
  title,
  emptyText,
  loader,
  renderItem,
}: {
  title: string
  emptyText: string
  loader: (token: string) => Promise<any[]>
  renderItem: (item: any, index: number) => React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<any[]>([])

  const load = async () => {
    const token = localStorage.getItem('accessToken')
    if (!token) return
    setLoading(true)
    try {
      const result = await loader(token)
      setItems(Array.isArray(result) ? result : [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) void load()
  }

  return (
    <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
      <button type="button" onClick={toggle} className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400">
        {open ? 'Hide ' + title : 'View ' + title}
      </button>
      {open && (
        <div className="mt-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-950/40">
          {loading ? <p className="text-xs text-slate-500">Loading history…</p> : items.length === 0 ? <p className="text-xs text-slate-500">{emptyText}</p> : <div className="space-y-2">{items.map(renderItem)}</div>}
        </div>
      )}
    </div>
  )
}

function MovementHistoryPanel({
  loader,
  label = 'movement history',
}: {
  loader: (token: string) => Promise<any[]>
  label?: string
}) {
  return (
    <ResourceHistoryPanel
      title={label}
      emptyText="No movement history available."
      loader={loader}
      renderItem={(item, index) => (
        <div key={String(item.id || item.movementId || index)} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[11px] dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap justify-between gap-2 text-xs">
            <span className="font-medium">{item.movementType || item.type || 'MOVEMENT'}</span>
            <span className="text-slate-500">{item.effectiveAt ? new Date(item.effectiveAt).toLocaleString() : 'Effective time not recorded'}</span>
          </div>
          <div className="mt-1 text-slate-500">Recorded: {item.recordedAt ? new Date(item.recordedAt).toLocaleString() : 'Not recorded'}</div>
          {(item.sourceResourceId || item.sourceUserId || item.sourceReference) && <div className="mt-1 text-slate-500">From: {item.sourceResourceId || item.sourceUserId || item.sourceReference}</div>}
          {(item.destinationResourceId || item.destinationUserId || item.destinationReference) && <div className="mt-1 text-slate-500">To: {item.destinationResourceId || item.destinationUserId || item.destinationReference}</div>}
          {item.quantity !== undefined && item.quantity !== null && <div className="mt-1 text-slate-500">Quantity: {String(item.quantity)}{item.unit ? ' ' + item.unit : ''}</div>}
          {item.previousMovementId && <div className="mt-1 text-slate-500">Previous movement: {item.previousMovementId}</div>}
          {item.transactionReference && <div className="mt-1 text-slate-500">Transaction: {item.transactionReference}</div>}
          {item.evidenceReference && <div className="mt-1 text-slate-500">Evidence: {item.evidenceReference}</div>}
        </div>
      )}
    />
  )
}

function EvidenceHistoryPanel({
  loader,
  label = 'evidence history',
}: {
  loader: (token: string) => Promise<any[]>
  label?: string
}) {
  return (
    <ResourceHistoryPanel
      title={label}
      emptyText="No evidence history available."
      loader={loader}
      renderItem={(item, index) => (
        <div key={String(item.id || item.evidenceId || index)} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[11px] dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap justify-between gap-2 text-xs">
            <span className="font-medium">{item.referenceType || item.type || 'Evidence'}</span>
            <span className="text-slate-500">{item.referenceValue || item.reference || 'Reference not recorded'}</span>
          </div>
          {item.documentNumber && <div className="mt-1 text-slate-500">Document: {item.documentNumber}</div>}
          {item.issuer && <div className="mt-1 text-slate-500">Issuer: {item.issuer}</div>}
          {(item.issuedAt || item.effectiveAt) && <div className="mt-1 text-slate-500">{item.issuedAt ? 'Issued: ' + new Date(item.issuedAt).toLocaleString() : ''}{item.issuedAt && item.effectiveAt ? ' · ' : ''}{item.effectiveAt ? 'Effective: ' + new Date(item.effectiveAt).toLocaleString() : ''}</div>}
          {item.integrityHash && <div className="mt-1 break-all text-slate-500">Integrity: {item.integrityHash}</div>}
          {item.metadata && typeof item.metadata === 'object' && Object.keys(item.metadata).length > 0 && <div className="mt-1 break-all text-slate-500">Metadata: {JSON.stringify(item.metadata)}</div>}
        </div>
      )}
    />
  )
}

function FarmHistoryPanels({ farmId }: { farmId: string }) {
  return (
    <div className="mt-6 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Farm movement & evidence</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Lifecycle history is loaded only when requested.</p>
      </div>
      <MovementHistoryPanel loader={(token) => api.farmMovementHistory(farmId, token)} />
      <EvidenceHistoryPanel loader={(token) => api.farmEvidenceHistory(farmId, token)} />
    </div>
  )
}


function FarmSubsection({
  farm,
  crops,
  token,
  assetForm,
  editingAssetId,
  savingAsset,
  recordForm,
  savingRecord,
  onAssetChange,
  onAssetSubmit,
  onAssetCancel,
  onAssetEdit,
  onAssetDelete,
  onRecordChange,
  onRecordSubmit,
  onFarmReload,
  onFarmError,
}: {
  farm: Farm
  crops: CropSummary[]
  token: string
  assetForm: AssetFormData
  editingAssetId: string | null
  savingAsset: boolean
  recordForm: RecordFormData
  savingRecord: boolean
  onAssetChange: (patch: Partial<AssetFormData>) => void
  onAssetSubmit: (event: FormEvent<HTMLFormElement>) => void
  onAssetCancel: () => void
  onAssetEdit: (asset: FarmAsset) => void
  onAssetDelete: (asset: FarmAsset) => void
  onRecordChange: (patch: Partial<RecordFormData>) => void
  onRecordSubmit: (event: FormEvent<HTMLFormElement>) => void
  onFarmReload: () => Promise<void>
  onFarmError: (message: string) => void
}) {
  const assets = Array.isArray(farm.assets) ? farm.assets : []
  const records = Array.isArray(farm.records) ? farm.records : []

  const farmCrops = crops.filter(
    (crop) =>
      crop.farmId === farm.id ||
      crop.farm?.id === farm.id,
  )

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-5">
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
          Selected farm
        </p>

        <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">
          {farm.name}
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Sprout className="h-4 w-4" />
            Crops
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
            {farmCrops.length}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Package className="h-4 w-4" />
            Assets
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
            {assets.length}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <FileText className="h-4 w-4" />
            Records
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
            {records.length}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Sprout className="h-4 w-4" />
            Type
          </div>
          <p className="mt-2 truncate text-sm font-semibold text-slate-950 dark:text-white">
            {farm.type || 'Not specified'}
          </p>
        </div>
      </div>

      <FarmHistoryPanels farmId={farm.id} />

      {/* START: Farm crop workspace */}
      <div className="mt-6 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Crops on this farm
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Cultivation currently linked to {farm.name}.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              window.location.assign('/app/crops')
            }}
          >
            View all crops
          </Button>
        </div>

        {farmCrops.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-950">
            <Sprout className="mx-auto h-7 w-7 text-slate-400" />
            <p className="mt-3 text-sm font-medium text-slate-800 dark:text-slate-200">
              No crops linked to this farm
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Create a crop from the Crop workspace and select this farm.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {farmCrops.map((crop) => (
              <div
                key={crop.id}
                className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {crop.name || 'Unnamed crop'}
                    </p>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {crop.variety || 'Variety not specified'}
                      {crop.season ? ` · ${crop.season}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {crop.status && (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        {crop.status}
                      </span>
                    )}

                    {crop.area !== null &&
                      crop.area !== undefined && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {crop.area} {crop.unit || ''}
                        </span>
                      )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* START: Farm asset form */}
      <div className="mt-6 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {editingAssetId ? 'Edit asset' : 'Add asset'}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Track equipment, livestock and other farm resources.
          </p>
        </div>

        <form onSubmit={onAssetSubmit} className="grid gap-3 md:grid-cols-2">
          <Field
            label="Asset type"
            value={assetForm.type}
            placeholder="e.g. CATTLE, TRACTOR"
            onChange={(value) => onAssetChange({ type: value })}
          />

          <Field
            label="Asset name"
            value={assetForm.name}
            placeholder="e.g. HF Cow"
            onChange={(value) => onAssetChange({ name: value })}
          />

          <Field
            label="Quantity"
            value={assetForm.quantity}
            type="number"
            min="0"
            step="0.01"
            placeholder="0"
            onChange={(value) => onAssetChange({ quantity: value })}
          />

          <Field
            label="Unit"
            value={assetForm.unit}
            placeholder="e.g. count, kg"
            onChange={(value) => onAssetChange({ unit: value })}
          />

          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Metadata JSON (optional)
            </span>

            <textarea
              value={assetForm.metadata}
              onChange={(event) =>
                onAssetChange({ metadata: event.target.value })
              }
              placeholder={'{"breed":"Holstein Friesian"}'}
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </label>

          <div className="md:col-span-2 flex flex-wrap justify-end gap-2">
            {editingAssetId && (
              <Button
                type="button"
                variant="outline"
                onClick={onAssetCancel}
                disabled={savingAsset}
              >
                Cancel
              </Button>
            )}

            <Button
              type="submit"
              disabled={savingAsset || !assetForm.type.trim()}
            >
              {savingAsset
                ? 'Saving…'
                : editingAssetId
                  ? 'Save asset'
                  : 'Add asset'}
            </Button>
          </div>
        </form>
      </div>

      {/* START: Farm asset list */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Farm assets
          </h3>

          <span className="text-xs text-slate-500 dark:text-slate-400">
            {assets.length} {assets.length === 1 ? 'asset' : 'assets'}
          </span>
        </div>

        {assets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No assets yet. Add the first farm asset above.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900 dark:text-white">
                      {asset.name || asset.type || 'Unnamed asset'}
                    </p>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {asset.type || 'Asset'}
                      {asset.quantity !== undefined
                        ? ` · ${asset.quantity}`
                        : ''}
                      {asset.unit ? ` ${asset.unit}` : ''}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onAssetEdit(asset)}
                      title={`Edit ${asset.name || asset.type || 'asset'}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => void onAssetDelete(asset)}
                      title={`Delete ${asset.name || asset.type || 'asset'}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>

                {asset.metadata &&
                  Object.keys(asset.metadata).length > 0 && (
                    <p className="mt-3 truncate text-xs text-slate-500 dark:text-slate-400">
                      {Object.entries(asset.metadata)
                        .map(
                          ([key, value]) =>
                            `${key}: ${String(value)}`,
                        )
                        .join(' · ')}
                    </p>
                  )}

                <AssetRelationshipHistory
                  farmId={farm.id}
                  assetId={asset.id}
                />
                <AssetLineageHistory
                  farmId={farm.id}
                  assetId={asset.id}
                />
                <MovementHistoryPanel
                  label="asset movement history"
                  loader={(token) => api.farmAssetMovementHistory(farm.id, asset.id, token)}
                />
                <EvidenceHistoryPanel
                  label="asset evidence history"
                  loader={(token) => api.farmAssetEvidenceHistory(farm.id, asset.id, token)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <FarmAssetMergePanel
        farmId={farm.id}
        assets={assets}
        token={token}
        onComplete={onFarmReload}
        onError={onFarmError}
      />

      {/* START: Farm record form */}
      <div className="mt-8 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Add farm record
          </h3>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Records are operational history. Add a new record instead of
            editing historical entries in place.
          </p>
        </div>

        <form onSubmit={onRecordSubmit} className="grid gap-3 md:grid-cols-2">
          <Field
            label="Category"
            value={recordForm.category}
            placeholder="e.g. OBSERVATION, EXPENSE"
            onChange={(value) => onRecordChange({ category: value })}
          />

          <Field
            label="Title"
            value={recordForm.title}
            placeholder="Record title"
            onChange={(value) => onRecordChange({ title: value })}
          />

          <SelectField
            label="Input method"
            value={recordForm.inputMethod}
            options={[
              'MANUAL',
              'VOICE',
              'IMAGE',
              'VIDEO',
              'MIXED',
            ]}
            onChange={(value) =>
              onRecordChange({ inputMethod: value })
            }
          />

          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Description
            </span>

            <textarea
              value={recordForm.description}
              onChange={(event) =>
                onRecordChange({ description: event.target.value })
              }
              placeholder="What happened or was observed?"
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Data JSON (optional)
            </span>

            <textarea
              value={recordForm.data}
              onChange={(event) =>
                onRecordChange({ data: event.target.value })
              }
              placeholder={'{"amount":1200,"note":"Diesel"}'}
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </label>

          <div className="md:col-span-2 flex justify-end">
            <Button
              type="submit"
              disabled={
                savingRecord || !recordForm.category.trim()
              }
            >
              {savingRecord ? 'Saving…' : 'Add record'}
            </Button>
          </div>
        </form>
      </div>

      {/* START: Farm record list */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Farm records
          </h3>

          <span className="text-xs text-slate-500 dark:text-slate-400">
            {records.length} {records.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        {records.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No records yet. Add the first operational record above.
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((record) => (
              <div
                key={record.id}
                className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
              >
                <p className="truncate font-medium text-slate-900 dark:text-white">
                  {record.title ||
                    record.category ||
                    'Farm record'}
                </p>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {record.category || 'Record'}
                  {record.inputMethod
                    ? ` · ${record.inputMethod}`
                    : ''}
                  {record.createdAt
                    ? ` · ${new Date(
                        record.createdAt,
                      ).toLocaleDateString()}`
                    : ''}
                </p>

                {typeof record.data?.description === 'string' && record.data.description && (
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {record.data.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function FarmCard({
  farm,
  selected,
  onSelect,
  onEdit,
  onDelete,
}: {
  farm: Farm
  selected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const assets = Array.isArray(farm.assets) ? farm.assets : []
  const records = Array.isArray(farm.records) ? farm.records : []

  return (
    <motion.div
      layout
      className={`rounded-2xl border bg-white p-5 shadow-sm transition dark:bg-slate-900 ${
        selected
          ? 'border-emerald-500 ring-2 ring-emerald-500/10'
          : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="block w-full text-left"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-slate-950 dark:text-white">
              {farm.name}
            </p>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {farm.type || 'Farm'}
            </p>
          </div>

          {selected && (
            <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              Selected
            </span>
          )}
        </div>

        <div className="mt-5 space-y-3">
          <InfoItem
            icon={MapPin}
            label="Location"
            value={farm.location || 'Not specified'}
          />

          <InfoItem
            icon={Sprout}
            label="Area"
            value={
              farm.area !== undefined && farm.area !== null
                ? `${farm.area} ${farm.unit || 'units'}`
                : 'Not specified'
            }
          />
        </div>
      </button>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
        <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span>
            {assets.length} {assets.length === 1 ? 'asset' : 'assets'}
          </span>

          <span>
            {records.length} {records.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onEdit}
            title={`Edit ${farm.name}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onDelete}
            title={`Delete ${farm.name}`}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

function EmptyState({
  onCreate,
}: {
  onCreate: () => void
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
        <Sprout className="h-6 w-6" />
      </div>

      <h2 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">
        No farms yet
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
        Create your first farm to start connecting crops, assets, records and
        future farm activities to a real operational context.
      </p>

      <Button className="mt-5" onClick={onCreate}>
        <Plus className="mr-2 h-4 w-4" />
        Create first farm
      </Button>
    </div>
  )
}

function ErrorMessage({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-950 dark:bg-red-950/20">
      <p className="font-medium text-red-800 dark:text-red-300">
        Unable to load farms
      </p>

      <p className="mt-1 text-sm text-red-700 dark:text-red-400">
        {message}
      </p>

      <Button className="mt-4" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}

function FarmLoadingState() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {[1, 2].map((item) => (
        <div
          key={item}
          className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900"
        />
      ))}
    </div>
  )
}

export function FarmsPage() {
  const [farms, setFarms] = useState<Farm[]>([])
  const [crops, setCrops] = useState<CropSummary[]>([])
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const [assetForm, setAssetForm] =
    useState<AssetFormData>(EMPTY_ASSET_FORM)
  const [editingAssetId, setEditingAssetId] =
    useState<string | null>(null)
  const [savingAsset, setSavingAsset] = useState(false)

  const [recordForm, setRecordForm] =
    useState<RecordFormData>(EMPTY_RECORD_FORM)
  const [savingRecord, setSavingRecord] = useState(false)

  const [form, setForm] = useState<FarmFormData>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const token = useMemo(() => {
    try {
      return localStorage.getItem('token') || ''
    } catch {
      return ''
    }
  }, [])

  const loadFarms = useCallback(async () => {
    setError('')

    try {
      const [farmData, cropData] = await Promise.all([
        api.farms(token),
        api.crops(token),
      ])

      const nextFarms = Array.isArray(farmData)
        ? (farmData as Farm[])
        : []

      const nextCrops = Array.isArray(cropData)
        ? (cropData as CropSummary[])
        : []

      setFarms(nextFarms)
      setCrops(nextCrops)

      const requestedFarmId =
        new URLSearchParams(window.location.search).get(
          'farmId',
        )

      setSelectedFarmId((current) => {
        if (
          requestedFarmId &&
          nextFarms.some(
            (farm) => farm.id === requestedFarmId,
          )
        ) {
          return requestedFarmId
        }

        if (
          current &&
          nextFarms.some(
            (farm) => farm.id === current,
          )
        ) {
          return current
        }

        return nextFarms[0]?.id || null
      })
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load farm data.',
      )
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void loadFarms()
  }, [loadFarms])

  const selectedFarm = useMemo(
    () => farms.find((farm) => farm.id === selectedFarmId) || null,
    [farms, selectedFarmId],
  )

  const filteredFarms = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) {
      return farms
    }

    return farms.filter((farm) => {
      const searchableText = [
        farm.name,
        farm.type,
        farm.location,
        farm.unit,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return searchableText.includes(query)
    })
  }, [farms, searchQuery])

  const assetCount = useMemo(
    () =>
      farms.reduce(
        (total, farm) =>
          total + (Array.isArray(farm.assets) ? farm.assets.length : 0),
        0,
      ),
    [farms],
  )

  const recordCount = useMemo(
    () =>
      farms.reduce(
        (total, farm) =>
          total + (Array.isArray(farm.records) ? farm.records.length : 0),
        0,
      ),
    [farms],
  )

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
  }

  const resetAssetForm = () => {
    setAssetForm(EMPTY_ASSET_FORM)
    setEditingAssetId(null)
  }

  const resetRecordForm = () => {
    setRecordForm(EMPTY_RECORD_FORM)
  }

  const handleAssetSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    if (!selectedFarmId || !assetForm.type.trim()) {
      return
    }

    setSavingAsset(true)
    setError('')

    try {
      let metadata: Record<string, unknown> | undefined

      if (assetForm.metadata.trim()) {
        const parsed = JSON.parse(
          assetForm.metadata,
        ) as unknown

        if (
          !parsed ||
          typeof parsed !== 'object' ||
          Array.isArray(parsed)
        ) {
          throw new Error(
            'Asset metadata must be a JSON object.',
          )
        }

        metadata = parsed as Record<string, unknown>
      }

      const payload = {
        type: assetForm.type.trim(),
        name: assetForm.name.trim() || undefined,
        quantity: assetForm.quantity
          ? Number(assetForm.quantity)
          : undefined,
        unit: assetForm.unit.trim() || undefined,
        metadata,
      }

      if (editingAssetId) {
        await api.updateFarmAsset(
          selectedFarmId,
          editingAssetId,
          payload,
          token,
        )
      } else {
        await api.addFarmAsset(
          selectedFarmId,
          payload,
          token,
        )
      }

      resetAssetForm()
      await loadFarms()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to save the farm asset.',
      )
    } finally {
      setSavingAsset(false)
    }
  }

  const handleAssetEdit = (asset: FarmAsset) => {
    setEditingAssetId(asset.id)

    setAssetForm({
      type: asset.type || '',
      name: asset.name || '',
      quantity:
        asset.quantity !== undefined &&
        asset.quantity !== null
          ? String(asset.quantity)
          : '',
      unit: asset.unit || 'count',
      metadata: asset.metadata
        ? JSON.stringify(asset.metadata, null, 2)
        : '',
    })
  }

  const handleAssetDelete = async (asset: FarmAsset) => {
    if (!selectedFarmId) {
      return
    }

    const label =
      asset.name || asset.type || 'this asset'

    if (!window.confirm(`Delete ${label}?`)) {
      return
    }

    setError('')

    try {
      await api.deleteFarmAsset(
        selectedFarmId,
        asset.id,
        token,
      )

      if (editingAssetId === asset.id) {
        resetAssetForm()
      }

      await loadFarms()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to delete the farm asset.',
      )
    }
  }

  const handleRecordSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    if (!selectedFarmId || !recordForm.category.trim()) {
      return
    }

    setSavingRecord(true)
    setError('')

    try {
      let data: Record<string, unknown> | undefined

      if (recordForm.data.trim()) {
        const parsed = JSON.parse(
          recordForm.data,
        ) as unknown

        if (
          !parsed ||
          typeof parsed !== 'object' ||
          Array.isArray(parsed)
        ) {
          throw new Error(
            'Record data must be a JSON object.',
          )
        }

        data = parsed as Record<string, unknown>
      }

      const recordData = {
        ...(data ?? {}),
        ...(recordForm.description.trim()
          ? { description: recordForm.description.trim() }
          : {}),
      }

      await api.addFarmRecord(
        selectedFarmId,
        {
          category: recordForm.category.trim(),
          title:
            recordForm.title.trim() || undefined,
          inputMethod: recordForm.inputMethod,
          data: recordData,
        },
        token,
      )

      resetRecordForm()
      await loadFarms()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to add the farm record.',
      )
    } finally {
      setSavingRecord(false)
    }
  }

  const beginCreate = () => {
    resetForm()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const beginEdit = (farm: Farm) => {
    setEditingId(farm.id)

    setForm({
      name: farm.name || '',
      type: farm.type || FARM_TYPES[0],
      location: farm.location || '',
      area:
        farm.area !== undefined && farm.area !== null
          ? String(farm.area)
          : '',
      unit: farm.unit || 'acres',
    })

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!form.name.trim()) {
      return
    }

    setSaving(true)
    setError('')

    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        location: form.location.trim() || undefined,
        area: form.area ? Number(form.area) : undefined,
        unit: form.unit || undefined,
      }

      if (editingId) {
        await api.updateFarm(editingId, payload, token)
      } else {
        await api.createFarm(payload, token)
      }

      resetForm()
      await loadFarms()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save the farm.',
      )
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (farm: Farm) => {
    const confirmed = window.confirm(
      `Delete "${farm.name}"? This action may remove the farm from your active farm list.`,
    )

    if (!confirmed) {
      return
    }

    setError('')

    try {
      await api.deleteFarm(farm.id, token)

      if (editingId === farm.id) {
        resetForm()
      }

      await loadFarms()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete the farm.',
      )
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Farm operations"
        title="Farms"
        description="Manage the farms that form the operational foundation for crops, assets, records and future agricultural workflows."
        action={
          <Button onClick={beginCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New farm
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Farms" value={farms.length} icon={Sprout} />
        <SummaryCard label="Assets" value={assetCount} icon={Package} />
        <SummaryCard label="Records" value={recordCount} icon={FileText} />
      </div>

      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} onRetry={loadFarms} />
        </div>
      )}

      <div className="space-y-6">
        {selectedFarm && !loading && (
          <section className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white p-6 shadow-sm dark:border-emerald-950 dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
                  Active farm
                </p>

                <h2 className="mt-2 truncate text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                  {selectedFarm.name}
                </h2>

                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {selectedFarm.type || 'Farm'}
                  {selectedFarm.location
                    ? ` · ${selectedFarm.location}`
                    : ''}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => beginEdit(selectedFarm)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit farm
                </Button>

                <Button onClick={beginCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add farm
                </Button>
              </div>
            </div>

            <div className="mt-6">
              <FarmSubsection
                farm={selectedFarm}
                crops={crops}
                token={token}
                assetForm={assetForm}
                editingAssetId={editingAssetId}
                savingAsset={savingAsset}
                recordForm={recordForm}
                savingRecord={savingRecord}
                onAssetChange={(patch) =>
                  setAssetForm((current) => ({
                    ...current,
                    ...patch,
                  }))
                }
                onAssetSubmit={handleAssetSubmit}
                onAssetCancel={resetAssetForm}
                onAssetEdit={handleAssetEdit}
                onAssetDelete={handleAssetDelete}
                onRecordChange={(patch) =>
                  setRecordForm((current) => ({
                    ...current,
                    ...patch,
                  }))
                }
                onRecordSubmit={handleRecordSubmit}
                onFarmReload={loadFarms}
                onFarmError={setError}
              />
            </div>
          </section>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="min-w-0">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                  Your farms
                </h2>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {filteredFarms.length} of {farms.length}{' '}
                  {farms.length === 1 ? 'farm' : 'farms'}
                </p>
              </div>

              {!loading && farms.length > 0 && (
                <label className="relative block w-full sm:max-w-xs">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search farms..."
                    aria-label="Search farms"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </label>
              )}
            </div>

            {loading ? (
              <FarmLoadingState />
            ) : farms.length === 0 ? (
              <EmptyState onCreate={beginCreate} />
            ) : filteredFarms.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
                <Search className="mx-auto h-8 w-8 text-slate-400" />

                <h3 className="mt-4 font-semibold text-slate-950 dark:text-white">
                  No matching farms
                </h3>

                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Try a different farm name, type or location.
                </p>

                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => setSearchQuery('')}
                >
                  Clear search
                </Button>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {filteredFarms.map((farm) => (
                  <FarmCard
                    key={farm.id}
                    farm={farm}
                    selected={farm.id === selectedFarmId}
                    onSelect={() => setSelectedFarmId(farm.id)}
                    onEdit={() => beginEdit(farm)}
                    onDelete={() => void handleDelete(farm)}
                  />
                ))}
              </div>
            )}
          </section>

          <aside>
            <FarmForm
              form={form}
              editing={Boolean(editingId)}
              saving={saving}
              onChange={(patch) =>
                setForm((current) => ({
                  ...current,
                  ...patch,
                }))
              }
              onSubmit={handleSubmit}
              onCancel={resetForm}
            />
          </aside>
        </div>
      </div>
    </div>
  )
}

export default FarmsPage
