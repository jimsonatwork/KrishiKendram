import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  CheckCircle2,
  FileText,
  Loader2,
  Mic,
  MicOff,
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

const SPEECH_LANGUAGES = [
  { value: 'en-IN', label: 'English', code: 'en' },
  { value: 'te-IN', label: 'తెలుగు (Telugu)', code: 'te' },
  { value: 'hi-IN', label: 'हिन्दी (Hindi)', code: 'hi' },
  { value: 'ta-IN', label: 'தமிழ் (Tamil)', code: 'ta' },
  { value: 'kn-IN', label: 'ಕನ್ನಡ (Kannada)', code: 'kn' },
  { value: 'ml-IN', label: 'മലയാളം (Malayalam)', code: 'ml' },
  { value: 'bn-IN', label: 'বাংলা (Bengali)', code: 'bn' },
  { value: 'mr-IN', label: 'मराठी (Marathi)', code: 'mr' },
  { value: 'gu-IN', label: 'ગુજરાતી (Gujarati)', code: 'gu' },
  { value: 'pa-IN', label: 'ਪੰਜਾਬੀ (Punjabi)', code: 'pa' },
] as const

function detectSpeechLocale(text: string, fallback = 'en-IN') {
  const ranges: Array<[number, number, string]> = [
    [0x0c00, 0x0c7f, 'te-IN'],
    [0x0b80, 0x0bff, 'ta-IN'],
    [0x0c80, 0x0cff, 'kn-IN'],
    [0x0d00, 0x0d7f, 'ml-IN'],
    [0x0980, 0x09ff, 'bn-IN'],
    [0x0a80, 0x0aff, 'gu-IN'],
    [0x0a00, 0x0a7f, 'pa-IN'],
    [0x0900, 0x097f, 'hi-IN'],
  ]
  const points = Array.from(text, (char) => char.codePointAt(0) ?? 0)
  for (const [startCode, endCode, locale] of ranges) {
    if (points.some((point) => point >= startCode && point <= endCode)) return locale
  }
  if (/[A-Za-z]/.test(text)) return 'en-IN'
  return fallback
}

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
  const [englishTranslation, setEnglishTranslation] = useState('')
  const [speechLanguage, setSpeechLanguage] = useState('en-IN')
  const [inputMethod, setInputMethod] = useState('MANUAL')
  const [listening, setListening] = useState(false)
  const [translationConfirmed, setTranslationConfirmed] = useState(false)
  const [translationLoading, setTranslationLoading] = useState(false)
  const [translationConfidence, setTranslationConfidence] = useState<number | null>(null)
  const [translationReviewNotes, setTranslationReviewNotes] = useState<string[]>([])
  const [translationBelowThreshold, setTranslationBelowThreshold] = useState(false)
  const [translationNumericMismatch, setTranslationNumericMismatch] = useState(false)
  const [translationUnitMismatch, setTranslationUnitMismatch] = useState(false)
  const [translationPlantingActionMismatch, setTranslationPlantingActionMismatch] = useState(false)
  const [translationError, setTranslationError] = useState('')
  const [speechNotice, setSpeechNotice] = useState('')
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
    () => farms.find((farm) => farm.id === farmId) ?? null,
    [farmId, farms],
  )

  function startSpeechCapture() {
    const speechWindow = window as Window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any }
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition
    if (!Recognition) {
      setSpeechNotice('Voice input is not available in this browser. Try Chrome or Edge, or type your answer.')
      return
    }
    try {
      const recognition = new Recognition()
      recognition.lang = speechLanguage
      recognition.continuous = true
      recognition.interimResults = true
      recognition.onresult = (event: any) => {
        const finalText: string[] = []
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          if (event.results[i].isFinal) {
            const transcript = String(event.results[i][0]?.transcript || '').trim()
            if (transcript) finalText.push(transcript)
          }
        }
        const text = finalText.join(' ').trim()
        if (text) {
          const combinedTranscript = [content, text].filter(Boolean).join(' ')
          setSpeechLanguage(detectSpeechLocale(combinedTranscript, speechLanguage))
          setContent((previous) => previous ? previous.replace(/\s+$/, '') + ' ' + text : text)
          setInputMethod('VOICE')
          setEnglishTranslation('')
          setTranslationConfirmed(false)
          setResult(null)
        }
      }
      recognition.onerror = (event: any) => {
        setSpeechNotice('Voice input issue: ' + String(event.error || 'unknown error') + '. You can type instead.')
        setListening(false)
      }
      recognition.onend = () => setListening(false)
      recognition.start()
      ;(window as any).__kkIntakeRecognition = recognition
      setListening(true)
      setSpeechNotice('Listening. Press Stop listening when you have finished speaking.')
    } catch {
      setListening(false)
      setSpeechNotice('Could not start microphone. Check browser microphone permission and retry.')
    }
  }

  function stopSpeechCapture() {
    const recognition = (window as any).__kkIntakeRecognition
    if (recognition) recognition.stop()
    setListening(false)
    setSpeechNotice('Voice capture stopped. Review the original transcript and English meaning before processing.')
  }

  const handleLocalTranslation = async () => {
    const token = localStorage.getItem('accessToken')
    const detectedSourceLocale = detectSpeechLocale(content, speechLanguage)
    const sourceLanguage = SPEECH_LANGUAGES.find((language) => language.value === detectedSourceLocale)?.code || 'en'
    if (!token) { setTranslationError('Your session has expired. Please sign in again.'); return }
    if (sourceLanguage === 'en') { setEnglishTranslation(content); setTranslationConfirmed(false); return }
    if (!content.trim()) { setTranslationError('Capture or enter the original statement first.'); return }
    setTranslationLoading(true)
    setTranslationError('')
    setTranslationConfirmed(false)
    setTranslationReviewNotes([])
    try {
      const result = await api.translateIntake({ sourceText: content.trim(), sourceLanguage }, token)
      setEnglishTranslation(result.englishTranslation)
      setTranslationConfidence(result.confidence)
      setTranslationReviewNotes(result.reviewNotes || [])
      setTranslationBelowThreshold(result.belowConfidenceThreshold)
      setTranslationNumericMismatch(result.numericMismatch)
      setTranslationUnitMismatch(result.unitMismatch)
      setTranslationPlantingActionMismatch(result.plantingActionMismatch)
      setTranslationConfirmed(false)
      setSpeechNotice('Local translation prepared. Check the English meaning and confirm it yourself before processing.')
    } catch (err) {
      setTranslationError(err instanceof Error ? err.message : 'Local translation is unavailable. You can enter the English meaning manually.')
    } finally {
      setTranslationLoading(false)
    }
  }

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
          content: (speechLanguage === 'en-IN' ? content : englishTranslation).trim(),
          originalContent: content.trim(),
          originalLanguage: SPEECH_LANGUAGES.find((language) => language.value === speechLanguage)?.code || 'en',
          englishTranslation: (speechLanguage === 'en-IN' ? content : englishTranslation).trim(),
          translationConfirmed: speechLanguage === 'en-IN' || translationConfirmed,
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

            <div className="space-y-3">
              <div className="text-sm font-medium">How would you like to tell us?</div>
              <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => { setInputMethod('MANUAL'); setSpeechNotice(''); }} disabled={submitting} className="rounded-xl border p-3 text-left hover:bg-muted/50">
                  <div className="font-medium">Type a message</div><div className="mt-1 text-xs text-muted-foreground">Use the keyboard</div>
                </button>
                <button type="button" onClick={startSpeechCapture} disabled={submitting || listening} className="rounded-xl border p-3 text-left hover:bg-muted/50">
                  <div className="flex items-center gap-2 font-medium"><Mic className="size-4" /> Speak naturally</div><div className="mt-1 text-xs text-muted-foreground">Speak in your language</div>
                </button>
              </div>
              <p className="text-xs text-muted-foreground" aria-live="polite">Language analysis: automatic | Detected: {SPEECH_LANGUAGES.find((language) => language.value === detectSpeechLocale(content, speechLanguage))?.label ?? 'Listening for language cues'}. No language selection needed.</p>
              <button type="button" onClick={listening ? stopSpeechCapture : startSpeechCapture} disabled={submitting} className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium">
                {listening ? <><MicOff className="size-4" /> Stop listening</> : <><Mic className="size-4" /> Start listening</>}
              </button>
              {speechNotice && <p role="status" className="text-xs leading-5 text-muted-foreground">{speechNotice}</p>}
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
                  setSpeechLanguage(detectSpeechLocale(event.target.value, speechLanguage))
                  setTranslationConfirmed(false)
                  setTranslationConfidence(null)
                  setTranslationReviewNotes([])
                  setTranslationBelowThreshold(false)
                  setTranslationNumericMismatch(false)
                  setTranslationUnitMismatch(false)
                  setTranslationPlantingActionMismatch(false)
                  setTranslationError('')
                  setResult(null)
                }}
                disabled={submitting}
                rows={8}
                placeholder="Example: We planted rice in 2 acres today."
                className="mt-2 w-full resize-y rounded-xl border bg-background px-3 py-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
              />

              <div className="mt-2 text-xs text-muted-foreground">
                Include useful details such as crop, area, livestock, equipment, expense, or activity. The original transcript is preserved separately.
              </div>
            </div>

            {speechLanguage !== 'en-IN' ? (
              <div>
                <label htmlFor="intake-english" className="text-sm font-medium">English meaning (review or correct)</label>
                <textarea id="intake-english" value={englishTranslation} onChange={(event) => { setEnglishTranslation(event.target.value); setTranslationConfirmed(false); setTranslationConfidence(null); setTranslationReviewNotes([]); setTranslationBelowThreshold(false); setTranslationNumericMismatch(false); setTranslationUnitMismatch(false); setTranslationPlantingActionMismatch(false); setTranslationError(''); setResult(null); }} disabled={submitting} rows={4} placeholder="Enter the English meaning. Check crop names, numbers, units and dates carefully." className="mt-2 w-full resize-y rounded-xl border bg-background px-3 py-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring" />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button type="button" onClick={handleLocalTranslation} disabled={submitting || translationLoading || listening || !content.trim()} className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium disabled:opacity-50">
                    {translationLoading ? <><Loader2 className="size-4 animate-spin" /> Translating locally…</> : <><Sparkles className="size-4" /> Translate with local AI</>}
                  </button>
                  <span className="text-xs text-muted-foreground">Uses only the registry-authorized local model; no cloud fallback.</span>
                </div>
                {translationError && <p role="alert" className="mt-2 text-sm text-destructive">{translationError}</p>}
                {translationConfidence !== null && <p role="status" className={translationBelowThreshold || translationNumericMismatch || translationUnitMismatch || translationPlantingActionMismatch ? 'mt-2 text-xs leading-5 text-destructive' : 'mt-2 text-xs leading-5 text-muted-foreground'}>AI confidence estimate: {Math.round(translationConfidence * 100)}% (un-calibrated estimate, not a guarantee). {translationBelowThreshold ? 'Below the 85% review threshold—check every word carefully.' : 'Still review the original and English meaning carefully.'}</p>}
                {translationNumericMismatch && <p className="mt-1 text-sm font-medium text-destructive">Numbers differ from the original transcript. Correct quantities, dates, and units before continuing.</p>}
                {translationUnitMismatch && <p className="mt-1 text-sm font-medium text-destructive">Measurement unit mismatch detected (for example, acres versus hectares). Correct the unit before continuing.</p>}
                {translationPlantingActionMismatch && <p className="mt-1 text-sm font-medium text-destructive">The English meaning may have lost the planting/sowing action. Correct the meaning before continuing.</p>}
                {translationReviewNotes.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">{translationReviewNotes.map((note, index) => <li key={index}>{note}</li>)}</ul>}
                <p className="mt-2 text-xs leading-5 text-muted-foreground">The original transcript is preserved. Translation confidence is only a model estimate; your confirmation is always required, especially for crop names, quantities, units and dates.</p>
                <label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={translationConfirmed} onChange={(event) => setTranslationConfirmed(event.target.checked)} disabled={submitting || !englishTranslation.trim()} /><span>I reviewed the English meaning against the original and confirm names, quantities, units and dates are correct.</span></label>
              </div>
            ) : (
              <div className="rounded-lg border p-3 text-sm text-muted-foreground">English is selected. The original text is also used as the English version; review it before processing.</div>
            )}

            <button
              type="submit"
              disabled={
                submitting ||
                loadingFarms ||
                farms.length === 0 ||
                !content.trim() ||
                (speechLanguage !== 'en-IN' && (!englishTranslation.trim() || !translationConfirmed))
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
