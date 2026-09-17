import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  CheckCircle2,
  FileText,
  Loader2,
  Send,
  Sparkles,
  Sprout,
} from 'lucide-react'

import { api } from '@/lib/api'

type Farm = {
  id: string
  name: string
  type?: string
  location?: string
}

type IntakeResult = {
  id?: string
  farmId?: string
  category?: string
  title?: string | null
  inputMethod?: string
  data?: {
    raw?: string
    category?: string
    crop?: {
      name?: string
    }
    livestock?: {
      type?: string
    }
    expense?: {
      item?: string
    }
    equipment?: {
      name?: string
    }
    activity?: {
      type?: string
      area?: number
      unit?: string
    }
  }
  createdAt?: string
}

const INPUT_METHODS = [
  {
    value: 'MANUAL',
    label: 'Text',
    description: 'Describe what happened in your own words.',
  },
] as const

function formatEnum(value?: string) {
  if (!value) return 'Unknown'

  return value
    .toLowerCase()
    .split('_')
    .map(
      (part) =>
        part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join(' ')
}

export function AIIntakePage() {
  const [farms, setFarms] = useState<Farm[]>([])
  const [farmId, setFarmId] = useState('')
  const [content, setContent] = useState('')
  const [inputMethod, setInputMethod] = useState('MANUAL')
  const [loadingFarms, setLoadingFarms] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] =
    useState<IntakeResult | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      const token = localStorage.getItem('accessToken')

      if (!token) {
        setError('Your session has expired. Please sign in again.')
        setLoadingFarms(false)
        return
      }

      try {
        const data = await api.farms(token)

        if (!active) return

        const nextFarms = Array.isArray(data)
          ? (data as Farm[])
          : []

        setFarms(nextFarms)

        if (nextFarms.length > 0) {
          setFarmId(nextFarms[0].id)
        }
      } catch (err) {
        if (!active) return

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load farms.',
        )
      } finally {
        if (active) {
          setLoadingFarms(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  const selectedFarm = useMemo(
    () =>
      farms.find((farm) => farm.id === farmId) ?? null,
    [farmId, farms],
  )

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    const token = localStorage.getItem('accessToken')

    if (!token) {
      setError('Your session has expired. Please sign in again.')
      return
    }

    if (!farmId) {
      setError('Select a farm before submitting intake.')
      return
    }

    if (!content.trim()) {
      setError('Describe the farm activity before submitting.')
      return
    }

    setSubmitting(true)
    setError('')
    setResult(null)

    try {
      const data = await api.createIntake(
        {
          farmId,
          inputMethod,
          content: content.trim(),
        },
        token,
      )

      setResult(data as IntakeResult)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to process the intake.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const extracted = result?.data

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Sparkles className="size-4" />
          AI Intake
        </div>

        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Tell KrishiKendram what happened
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Describe a farm activity naturally. KrishiKendram will
          interpret the information and show the structured result.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border bg-card p-5"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="size-5" />
            </div>

            <div>
              <h2 className="font-semibold">
                New intake
              </h2>

              <p className="text-sm text-muted-foreground">
                Capture an operational event.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="intake-farm"
                className="text-sm font-medium"
              >
                Farm
              </label>

              <select
                id="intake-farm"
                value={farmId}
                onChange={(event) => {
                  setFarmId(event.target.value)
                  setResult(null)
                }}
                disabled={
                  loadingFarms ||
                  submitting ||
                  farms.length === 0
                }
                className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {loadingFarms ? (
                  <option value="">
                    Loading farms...
                  </option>
                ) : farms.length === 0 ? (
                  <option value="">
                    No accessible farms
                  </option>
                ) : (
                  farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <div className="text-sm font-medium">
                Input method
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-1">
                {INPUT_METHODS.map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => {
                      setInputMethod(method.value)
                      setResult(null)
                    }}
                    disabled={submitting}
                    className={[
                      'rounded-xl border p-3 text-left transition',
                      inputMethod === method.value
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50',
                    ].join(' ')}
                  >
                    <div className="font-medium">
                      {method.label}
                    </div>

                    <div className="mt-1 text-xs text-muted-foreground">
                      {method.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="intake-content"
                className="text-sm font-medium"
              >
                What happened?
              </label>

              <textarea
                id="intake-content"
                value={content}
                onChange={(event) => {
                  setContent(event.target.value)
                  setResult(null)
                }}
                disabled={submitting}
                rows={8}
                placeholder="Example: We planted rice in 2 acres today."
                className="mt-2 w-full resize-y rounded-xl border bg-background px-3 py-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
              />

              <div className="mt-2 text-xs text-muted-foreground">
                Include useful details such as crop, area,
                livestock, equipment, expense, or activity.
              </div>
            </div>

            <button
              type="submit"
              disabled={
                submitting ||
                loadingFarms ||
                farms.length === 0 ||
                !content.trim()
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  Process intake
                </>
              )}
            </button>
          </div>
        </form>

        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sprout className="size-5" />
            </div>

            <div>
              <h2 className="font-semibold">
                Interpretation
              </h2>

              <p className="text-sm text-muted-foreground">
                Structured result from the intake processor.
              </p>
            </div>
          </div>

          {!result ? (
            <div className="mt-8 rounded-xl border border-dashed p-6 text-center">
              <Sparkles className="mx-auto size-6 text-muted-foreground" />

              <div className="mt-3 text-sm font-medium">
                Nothing processed yet
              </div>

              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Submit a description to see what KrishiKendram
                extracted.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border bg-muted/20 p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Category
                </div>

                <div className="mt-1 font-semibold">
                  {formatEnum(
                    result.category ||
                      extracted?.category,
                  )}
                </div>
              </div>

              {extracted?.crop?.name && (
                <div className="rounded-xl border p-4">
                  <div className="text-xs text-muted-foreground">
                    Crop
                  </div>

                  <div className="mt-1 font-medium">
                    {extracted.crop.name}
                  </div>
                </div>
              )}

              {extracted?.livestock?.type && (
                <div className="rounded-xl border p-4">
                  <div className="text-xs text-muted-foreground">
                    Livestock
                  </div>

                  <div className="mt-1 font-medium">
                    {formatEnum(
                      extracted.livestock.type,
                    )}
                  </div>
                </div>
              )}

              {extracted?.expense?.item && (
                <div className="rounded-xl border p-4">
                  <div className="text-xs text-muted-foreground">
                    Expense
                  </div>

                  <div className="mt-1 font-medium">
                    {extracted.expense.item}
                  </div>
                </div>
              )}

              {extracted?.equipment?.name && (
                <div className="rounded-xl border p-4">
                  <div className="text-xs text-muted-foreground">
                    Equipment
                  </div>

                  <div className="mt-1 font-medium">
                    {extracted.equipment.name}
                  </div>
                </div>
              )}

              {extracted?.activity && (
                <div className="rounded-xl border p-4">
                  <div className="text-xs text-muted-foreground">
                    Activity
                  </div>

                  <div className="mt-1 font-medium">
                    {formatEnum(
                      extracted.activity.type,
                    )}
                  </div>

                  {extracted.activity.area != null && (
                    <div className="mt-1 text-sm text-muted-foreground">
                      Area: {extracted.activity.area}{' '}
                      {extracted.activity.unit || ''}
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />

                  <div>
                    <div className="text-sm font-medium">
                      Intake processed
                    </div>

                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      The current Intake backend processed this
                      submission. A separate proposal/confirmation
                      step will be introduced before expanding
                      automated operations.
                    </p>
                  </div>
                </div>
              </div>

              {selectedFarm && (
                <div className="text-xs text-muted-foreground">
                  Farm: {selectedFarm.name}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
