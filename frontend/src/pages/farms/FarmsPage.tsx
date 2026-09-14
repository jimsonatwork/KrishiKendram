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

type FarmAsset = {
  id: string
  name?: string
  type?: string
  category?: string
  status?: string
}

type FarmRecord = {
  id: string
  type?: string
  title?: string
  description?: string
  createdAt?: string
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

function FarmSubsection({
  farm,
}: {
  farm: Farm
}) {
  const assets = Array.isArray(farm.assets) ? farm.assets : []
  const records = Array.isArray(farm.records) ? farm.records : []

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

      <div className="grid gap-4 sm:grid-cols-3">
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

      {assets.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
            Farm assets
          </h3>

          <div className="grid gap-3 sm:grid-cols-2">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
              >
                <p className="font-medium text-slate-900 dark:text-white">
                  {asset.name || asset.type || 'Unnamed asset'}
                </p>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {asset.category || asset.type || 'Asset'}
                  {asset.status ? ` · ${asset.status}` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {records.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
            Farm records
          </h3>

          <div className="space-y-3">
            {records.map((record) => (
              <div
                key={record.id}
                className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
              >
                <p className="font-medium text-slate-900 dark:text-white">
                  {record.title || record.type || 'Farm record'}
                </p>

                {record.description && (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {record.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
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
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

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
      const data = await api.farms(token)

      const nextFarms = Array.isArray(data) ? (data as Farm[]) : []

      setFarms(nextFarms)

      setSelectedFarmId((current) => {
        if (current && nextFarms.some((farm) => farm.id === current)) {
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
              <FarmSubsection farm={selectedFarm} />
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
