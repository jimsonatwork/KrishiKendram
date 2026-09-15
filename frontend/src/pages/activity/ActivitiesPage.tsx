import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  FileText,
  Sprout,
  Wheat,
} from 'lucide-react'
import { motion } from 'motion/react'

import { api } from '@/lib/api'

type FarmRecord = {
  id: string
  category?: string
  title?: string
  description?: string
  inputMethod?: string
  data?: unknown
  createdAt?: string
}

type Farm = {
  id: string
  name: string
  type?: string
  location?: string
  createdAt?: string
  updatedAt?: string
  assets?: unknown[]
  records?: FarmRecord[]
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

type ActivityItem = {
  id: string
  timestamp: string
  title: string
  description: string
  resource: string
  source: string
  icon: 'farm' | 'crop' | 'record'
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

function activityIcon(type: ActivityItem['icon']) {
  if (type === 'crop') {
    return <Wheat className="size-4" />
  }

  if (type === 'record') {
    return <FileText className="size-4" />
  }

  return <Sprout className="size-4" />
}

export function ActivitiesPage() {
  const [farms, setFarms] = useState<Farm[]>([])
  const [crops, setCrops] = useState<Crop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

        const [farmResult, cropResult] =
          await Promise.all([
            api.farms(token),
            api.crops(token),
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
      } catch (err) {
        if (cancelled) return

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load activities.',
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

  const activities = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = []

    for (const farm of farms) {
      if (farm.createdAt) {
        items.push({
          id: `farm-created-${farm.id}`,
          timestamp: farm.createdAt,
          title: `Farm created: ${farm.name}`,
          description:
            farm.location
              ? `${farm.name} was added in ${farm.location}.`
              : `${farm.name} was added to your farm workspace.`,
          resource: 'Farm',
          source: 'Manual farm management',
          icon: 'farm',
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
            'Farm information was changed in the workspace.',
          resource: 'Farm',
          source: 'Manual farm management',
          icon: 'farm',
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
            record.description ||
            'A new operational record was added to the farm.',
          resource: farm.name,
          source: record.inputMethod
            ? `${formatEnum(record.inputMethod)} input`
            : 'Farm record',
          icon: 'record',
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
          description: farmName
            ? `${crop.name} was added to ${farmName}.`
            : `${crop.name} was added to the crop workspace.`,
          resource: farmName || 'Crop',
          source: 'Manual crop management',
          icon: 'crop',
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
          description:
            crop.status
              ? `Current status: ${formatEnum(crop.status)}.`
              : 'Crop information was changed in the workspace.',
          resource: farmName || 'Crop',
          source: 'Manual crop management',
          icon: 'crop',
        })
      }
    }

    return items
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() -
          new Date(a.timestamp).getTime(),
      )
      .slice(0, 100)
  }, [crops, farms])

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Activity className="size-4" />
          Activity
        </div>

        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Recent activity
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          A connected view of recent farm, crop and operational
          record activity.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-2xl border bg-card">
        <div className="border-b px-5 py-4">
          <div className="font-semibold">
            Activity feed
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Latest operational events from your connected workspace.
          </div>
        </div>

        {loading ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            Loading activity...
          </div>
        ) : activities.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Activity className="size-5" />
            </div>

            <div className="mt-4 font-medium">
              No activity yet
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              Farm and crop actions will appear here as your
              workspace grows.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {activities.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{
                  opacity: 0,
                  y: 6,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.2,
                  delay: Math.min(index, 8) * 0.025,
                }}
                className="flex gap-4 px-5 py-4"
              >
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {activityIcon(item.icon)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="font-medium">
                      {item.title}
                    </div>

                    <div className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(item.timestamp)}
                    </div>
                  </div>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.description}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                    <span className="rounded-full border px-2 py-1">
                      {item.resource}
                    </span>

                    <span className="rounded-full bg-muted px-2 py-1">
                      {item.source}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
