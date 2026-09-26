import {
  useEffect,
  useMemo,
  useState,} from 'react'
import type {
  FormEvent,
  ReactNode,
} from 'react'

import {
  Plus,
  Wheat,
} from 'lucide-react'
import { motion } from 'motion/react'

import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'


type Farm = {
  id: string
  name: string
  type?: string
  location?: string
  area?: number | null
  unit?: string
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
  area?: number | null
  unit?: string
  notes?: string
  farm?: {
    id: string
    name: string
  }
}

const cropStatuses = [
  'PLANNED',
  'SOWN',
  'GERMINATED',
  'GROWING',
  'FLOWERING',
  'FRUITING',
  'HARVEST_READY',
  'HARVESTED',
  'FAILED',
  'ARCHIVED',
]

const cropSeasons = [
  'UNKNOWN',
  'KHARIF',
  'RABI',
  'ZAID',
  'PERENNIAL',
]

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

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
  minLength,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  required?: boolean
  minLength?: number
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </div>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[][]
  placeholder?: string
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        {placeholder && (
          <option value="">
            {placeholder}
          </option>
        )}

        {options.map(([optionValue, labelText]) => (
          <option
            key={optionValue}
            value={optionValue}
          >
            {labelText}
          </option>
        ))}
      </select>
    </div>
  )
}

function InfoItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">
        {label}
      </div>

      <div className="mt-1 text-sm font-medium">
        {value}
      </div>
    </div>
  )
}

function ErrorMessage({
  message,
}: {
  message: string
}) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {message}
    </div>
  )
}

function LoadingState({
  label,
}: {
  label: string
}) {
  return (
    <div className="flex min-h-[300px] items-center justify-center">
      <div className="text-sm text-muted-foreground">
        {label}
      </div>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center">
      <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary [&_svg]:size-5">
        {icon}
      </div>

      <h3 className="mt-4 font-medium">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        {description}
      </p>

      {action && (
        <div className="mt-5">
          {action}
        </div>
      )}
    </div>
  )
}

function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && (
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
            {eyebrow}
          </div>
        )}

        <h1 className="text-3xl font-semibold tracking-tight">
          {title}
        </h1>

        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {action}
    </div>
  )
}

export function CropsPage() {
  const token =
    localStorage.getItem('accessToken')

  const [crops, setCrops] = useState<Crop[]>([])
  const [farms, setFarms] = useState<Farm[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showForm, setShowForm] =
    useState(false)
  const [editingCrop, setEditingCrop] =
    useState<Crop | null>(null)

  const [farmId, setFarmId] = useState('')
  const [name, setName] = useState('')
  const [variety, setVariety] = useState('')
  const [season, setSeason] = useState('UNKNOWN')
  const [status, setStatus] = useState('PLANNED')
  const [sowingDate, setSowingDate] =
    useState('')
  const [harvestDate, setHarvestDate] =
    useState('')
  const [area, setArea] = useState('')
  const [unit, setUnit] = useState('acre')
  const [notes, setNotes] = useState('')

  const [searchQuery, setSearchQuery] =
    useState('')
  const [statusFilter, setStatusFilter] =
    useState('ALL')
  const [selectedCropId, setSelectedCropId] =
    useState('')
  const [relationshipHistory, setRelationshipHistory] =
    useState<any[]>([])
  const [historyLoading, setHistoryLoading] =
    useState(false)

  const loadData = async () => {
    if (!token) return

    setLoading(true)
    setError('')

    try {
      const [cropResult, farmResult] =
        await Promise.all([
          api.crops(token),
          api.farms(token),
        ])

      setCrops(cropResult)
      setFarms(farmResult)

      setSelectedCropId((current) => {
        if (
          current &&
          cropResult.some(
            (crop) => crop.id === current,
          )
        ) {
          return current
        }

        return cropResult[0]?.id || ''
      })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load crops',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const filteredCrops = useMemo(() => {
    const query =
      searchQuery.trim().toLowerCase()

    return crops.filter((crop) => {
      if (
        statusFilter !== 'ALL' &&
        crop.status !== statusFilter
      ) {
        return false
      }

      if (!query) {
        return true
      }

      const farmName =
        crop.farm?.name ||
        farms.find(
          (farm) =>
            farm.id === crop.farmId,
        )?.name ||
        ''

      return [
        crop.name,
        crop.variety,
        crop.season,
        crop.status,
        crop.notes,
        farmName,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(query),
        )
    })
  }, [
    crops,
    farms,
    searchQuery,
    statusFilter,
  ])

  const selectedCrop = useMemo(
    () =>
      crops.find(
        (crop) =>
          crop.id === selectedCropId,
      ) || null,
    [crops, selectedCropId],
  )

  useEffect(() => {
    if (!token || !selectedCropId) {
      setRelationshipHistory([])
      return
    }

    setHistoryLoading(true)
    api.cropRelationshipHistory(selectedCropId, token)
      .then((history) => setRelationshipHistory(Array.isArray(history) ? history : []))
      .catch(() => setRelationshipHistory([]))
      .finally(() => setHistoryLoading(false))
  }, [selectedCropId, token])

  const selectedCropFarmId = useMemo(() => {
    if (!selectedCrop) {
      return ''
    }

    return (
      selectedCrop.farm?.id ||
      selectedCrop.farmId ||
      farms.find(
        (farm) => farm.id === selectedCrop.farmId,
      )?.id ||
      ''
    )
  }, [farms, selectedCrop])

  const resetForm = () => {
    setFarmId('')
    setName('')
    setVariety('')
    setSeason('UNKNOWN')
    setStatus('PLANNED')
    setSowingDate('')
    setHarvestDate('')
    setArea('')
    setUnit('acre')
    setNotes('')
    setEditingCrop(null)
    setShowForm(false)
  }

  const submitCrop = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    if (!token) return

    try {
      const data = {
        farmId,
        name,
        variety: variety || undefined,
        season,
        status,
        sowingDate:
          sowingDate || undefined,
        harvestDate:
          harvestDate || undefined,
        area: area
          ? Number(area)
          : undefined,
        unit: unit || undefined,
        notes: notes || undefined,
      }

      if (editingCrop) {
        await api.updateCrop(
          editingCrop.id,
          data,
          token,
        )
        setSelectedCropId(
          editingCrop.id,
        )
      } else {
        await api.createCrop(
          data,
          token,
        )
      }

      resetForm()
      await loadData()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to save crop',
      )
    }
  }

  const editCrop = (crop: Crop) => {
    setSelectedCropId(crop.id)
    setEditingCrop(crop)

    setFarmId(
      crop.farmId ||
        crop.farm?.id ||
        '',
    )
    setName(crop.name || '')
    setVariety(crop.variety || '')
    setSeason(crop.season || 'UNKNOWN')
    setStatus(crop.status || 'PLANNED')

    setSowingDate(
      crop.sowingDate
        ? String(
            crop.sowingDate,
          ).slice(0, 10)
        : '',
    )

    setHarvestDate(
      crop.harvestDate
        ? String(
            crop.harvestDate,
          ).slice(0, 10)
        : '',
    )

    setArea(
      crop.area !== null &&
      crop.area !== undefined
        ? String(crop.area)
        : '',
    )

    setUnit(crop.unit || 'acre')
    setNotes(crop.notes || '')
    setShowForm(true)
  }

  const archiveCrop = async (
    cropId: string,
  ) => {
    if (!token) return

    if (
      !window.confirm(
        'Are you sure you want to archive this crop?',
      )
    ) {
      return
    }

    try {
      await api.deleteCrop(
        cropId,
        token,
      )

      setSelectedCropId('')
      await loadData()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to archive crop',
      )
    }
  }

  if (loading) {
    return <LoadingState label="Loading crops..." />
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Crop operations"
        title="Crops"
        description="Track cultivation across your connected farms."
        action={
          <Button
            onClick={() =>
              setShowForm((value) => !value)
            }
          >
            <Plus />
            {showForm ? 'Cancel' : 'Add crop'}
          </Button>
        }
      />

      {error && <ErrorMessage message={error} />}

      {showForm && (
        <motion.form
          initial={{
            opacity: 0,
            y: -8,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          onSubmit={submitCrop}
          className="rounded-2xl border bg-card p-6"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold">
                {editingCrop
                  ? 'Edit crop'
                  : 'Add crop'}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Keep cultivation details connected to the correct farm.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <SelectField
              label="Farm"
              value={farmId}
              onChange={setFarmId}
              options={farms.map(
                (farm) => [
                  farm.id,
                  farm.name,
                ],
              )}
              placeholder="Select farm"
            />

            <Field
              label="Crop name"
              value={name}
              onChange={setName}
              placeholder="Rice"
              required
            />

            <Field
              label="Variety"
              value={variety}
              onChange={setVariety}
              placeholder="BPT 5204"
            />

            <SelectField
              label="Season"
              value={season}
              onChange={setSeason}
              options={cropSeasons.map(
                (item) => [
                  item,
                  formatEnum(item),
                ],
              )}
            />

            <SelectField
              label="Status"
              value={status}
              onChange={setStatus}
              options={cropStatuses.map(
                (item) => [
                  item,
                  formatEnum(item),
                ],
              )}
            />

            <Field
              label="Area"
              type="number"
              value={area}
              onChange={setArea}
              placeholder="2.5"
            />

            <Field
              label="Area unit"
              value={unit}
              onChange={setUnit}
              placeholder="acre"
            />

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Sowing date"
                type="date"
                value={sowingDate}
                onChange={setSowingDate}
              />

              <Field
                label="Harvest date"
                type="date"
                value={harvestDate}
                onChange={setHarvestDate}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium">
              Notes
            </label>

            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              rows={4}
              placeholder="Crop observations or notes..."
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="mt-5 flex gap-2">
            <Button type="submit">
              {editingCrop
                ? 'Update crop'
                : 'Create crop'}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
            >
              Cancel
            </Button>
          </div>
        </motion.form>
      )}

      {crops.length === 0 ? (
        <EmptyState
          icon={<Wheat />}
          title="No crops yet"
          description="Add your first crop to start tracking cultivation."
          action={
            <Button
              onClick={() =>
                setShowForm(true)
              }
            >
              <Plus />
              Add your first crop
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl border bg-card p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
              <input
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value,
                  )
                }
                placeholder="Search crops, varieties, farms..."
                className="h-10 rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value,
                  )
                }
                className="h-10 rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="ALL">
                  All statuses
                </option>

                {cropStatuses.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {formatEnum(item)}
                    </option>
                  ),
                )}
              </select>

              <div className="flex items-center rounded-lg border px-3 text-sm text-muted-foreground">
                {filteredCrops.length} of {crops.length} crops
              </div>
            </div>
          </div>

          {filteredCrops.length === 0 ? (
            <EmptyState
              icon={<Wheat />}
              title="No matching crops"
              description="Try a different search or status filter."
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('')
                    setStatusFilter('ALL')
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)]">
              <div className="space-y-3">
                {filteredCrops.map(
                  (crop) => {
                    const farmName =
                      crop.farm?.name ||
                      farms.find(
                        (farm) =>
                          farm.id ===
                          crop.farmId,
                      )?.name ||
                      'Unknown farm'

                    const isSelected =
                      crop.id ===
                      selectedCrop?.id

                    return (
                      <button
                        key={crop.id}
                        type="button"
                        onClick={() =>
                          setSelectedCropId(
                            crop.id,
                          )
                        }
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'bg-card hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <Wheat className="size-5" />
                            </div>

                            <div className="min-w-0">
                              <div className="truncate font-semibold">
                                {crop.name}
                              </div>

                              <div className="mt-1 truncate text-sm text-muted-foreground">
                                {farmName}
                              </div>
                            </div>
                          </div>

                          <span className="shrink-0 rounded-full border bg-background px-2.5 py-1 text-xs font-medium">
                            {formatEnum(
                              crop.status,
                            )}
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>
                            {formatEnum(
                              crop.season,
                            )}
                          </span>

                          <span>
                            {crop.area !==
                              null &&
                            crop.area !==
                              undefined
                              ? `${crop.area} ${crop.unit || ''}`
                              : 'Area not set'}
                          </span>
                        </div>
                      </button>
                    )
                  },
                )}
              </div>

              {selectedCrop && (
                <motion.div
                  key={selectedCrop.id}
                  initial={{
                    opacity: 0,
                    y: 4,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  className="rounded-2xl border bg-card p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 gap-4">
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Wheat className="size-6" />
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm text-muted-foreground">
                          Crop workspace
                        </div>

                        <h2 className="mt-1 text-xl font-semibold">
                          {selectedCrop.name}
                        </h2>

                        <p className="mt-1 text-sm text-muted-foreground">
                          {selectedCrop.farm?.name ||
                            farms.find(
                              (farm) =>
                                farm.id ===
                                selectedCrop.farmId,
                            )?.name ||
                            'Unknown farm'}
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full border bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
                      {formatEnum(
                        selectedCrop.status,
                      )}
                    </span>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <InfoItem
                      label="Variety"
                      value={
                        selectedCrop.variety ||
                        'Not specified'
                      }
                    />

                    <InfoItem
                      label="Season"
                      value={formatEnum(
                        selectedCrop.season,
                      )}
                    />

                    <InfoItem
                      label="Area"
                      value={
                        selectedCrop.area !==
                          null &&
                        selectedCrop.area !==
                          undefined
                          ? `${selectedCrop.area} ${selectedCrop.unit || ''}`
                          : 'Not specified'
                      }
                    />

                    <InfoItem
                      label="Sowing"
                      value={
                        selectedCrop.sowingDate
                          ? String(
                              selectedCrop.sowingDate,
                            ).slice(0, 10)
                          : 'Not specified'
                      }
                    />

                    <InfoItem
                      label="Harvest"
                      value={
                        selectedCrop.harvestDate
                          ? String(
                              selectedCrop.harvestDate,
                            ).slice(0, 10)
                          : 'Not specified'
                      }
                    />

                    <InfoItem
                      label="Farm"
                      value={
                        selectedCrop.farm?.name ||
                        farms.find(
                          (farm) =>
                            farm.id ===
                            selectedCrop.farmId,
                        )?.name ||
                        'Unknown farm'
                      }
                    />
                  </div>

                  <div className="mt-6 rounded-xl border bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-medium">Relationship history</h3>
                        <p className="mt-1 text-xs text-muted-foreground">Temporal ownership and relationship records.</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{relationshipHistory.length} record{relationshipHistory.length === 1 ? '' : 's'}</span>
                    </div>
                    {historyLoading ? (
                      <p className="mt-3 text-sm text-muted-foreground">Loading history…</p>
                    ) : relationshipHistory.length === 0 ? (
                      <p className="mt-3 text-sm text-muted-foreground">No relationship history available.</p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {relationshipHistory.map((item, index) => (
                          <div key={`${item.resourceId || selectedCrop.id}-${index}`} className="rounded-lg border bg-background px-3 py-2 text-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-medium">{String(item.relationshipType || 'Relationship')}</span>
                              <span className="text-xs text-muted-foreground">{item.status || 'UNKNOWN'}</span>
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {item.validFrom ? new Date(item.validFrom).toLocaleString() : 'Start not recorded'}
                              {item.validUntil ? ` → ${new Date(item.validUntil).toLocaleString()}` : ' → current/non-expiring'}
                            </div>
                            {item.endedReason && <div className="mt-1 text-xs text-muted-foreground">Reason: {item.endedReason}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedCrop.notes && (
                    <div className="mt-5 rounded-xl border bg-muted/30 p-4">
                      <div className="text-xs font-medium text-muted-foreground">
                        Notes
                      </div>

                      <div className="mt-1 text-sm leading-6">
                        {selectedCrop.notes}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() =>
                        editCrop(
                          selectedCrop,
                        )
                      }
                    >
                      Edit crop
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      disabled={!selectedCropFarmId}
                      onClick={() => {
                        if (!selectedCropFarmId) {
                          return
                        }

                        window.location.assign(
                          `/app/farms?farmId=${encodeURIComponent(
                            selectedCropFarmId,
                          )}`,
                        )
                      }}
                    >
                      View farm
                    </Button>

                    <Button
                      variant="destructive"
                      onClick={() =>
                        archiveCrop(
                          selectedCrop.id,
                        )
                      }
                    >
                      Archive crop
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
