import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Volume2, VolumeX, X, ChevronUp, Sparkles, Square } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api, type AiFactCandidate } from '../../lib/api'
import { useAuthStore } from '../../stores/auth.store'

type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean
  onresult: ((event: { resultIndex?: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onerror: ((event: { error?: string }) => void) | null; onend: (() => void) | null
  start: () => void; stop: () => void
}
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
type VoiceTurn = { id: number; speaker: 'You' | 'Krishi'; text: string; at: string }
type VoiceFarm = { id: string; name: string; location?: string }
type VoiceCropIntakeDraft = {
  content: string
  cropName?: string
  area?: number
  unit?: string
  phase: 'NEEDS_CROP' | 'NEEDS_FARM' | 'PREVIEW'
  farms: VoiceFarm[]
  farmId?: string
  farmName?: string
}
type VoiceCropTerminology = {
  resourceId: string
  version: number
  ownerModule: string
  plantingVerbs: string[]
  imperativeCropAction: string
  cropRegistrationVerbs: string[]
  crops: Array<{ name: string; aliases: string[] }>
  areaUnits: string[]
  numberWords: Record<string, number>
}
const findKnownCrop = (text: string, vocabulary: VoiceCropTerminology | null) => {
  if (!vocabulary) return undefined
  const normalized = text.normalize('NFKC').toLocaleLowerCase()
  return vocabulary.crops.find(crop => crop.aliases.some(alias =>
    new RegExp('\\b' + alias.replace(/ /g, '\\s+') + '\\b', 'i').test(normalized),
  ))?.name
}
const isPlantingRequest = (text: string, vocabulary: VoiceCropTerminology | null) => {
  if (!vocabulary) return false
  const plantingVerb = new RegExp('\\b(' + vocabulary.plantingVerbs.join('|') + ')\\b', 'i')
  const imperative = new RegExp('^\\s*' + vocabulary.imperativeCropAction + '\\s+', 'i')
  const hasCrop = Boolean(findKnownCrop(text, vocabulary))
  const registrationVerb = new RegExp('\\b(' + vocabulary.cropRegistrationVerbs.join('|') + ')\\b', 'i')
  const explicitCropRecord = /\b(crop|planting|field)\b/i.test(text)
  return plantingVerb.test(text) ||
    (hasCrop && imperative.test(text)) ||
    (hasCrop && registrationVerb.test(text) && explicitCropRecord)
}
const parseSpokenArea = (text: string, vocabulary: VoiceCropTerminology | null): { area?: number; unit?: string } => {
  if (!vocabulary) return {}
  const numberWords = Object.keys(vocabulary.numberWords).join('|')
  const areaUnits = vocabulary.areaUnits.join('|')
  const match = text.normalize('NFKC').toLocaleLowerCase().match(
    new RegExp('\\b(\\d+(?:\\.\\d+)?|' + numberWords + ')\\s*(' + areaUnits + ')\\b', 'i'),
  )
  if (!match) return {}
  const amount = match[1].toLowerCase()
  return { area: vocabulary.numberWords[amount] ?? Number(amount), unit: match[2] }
}
const replaceCropInText = (content: string, oldCrop: string | undefined, nextCrop: string) => {
  if (oldCrop) {
    const pattern = new RegExp('\\b' + oldCrop.replace(/ /g, '\\s+') + '\\b', 'i')
    if (pattern.test(content)) return content.replace(pattern, nextCrop)
  }
  return content + '. Crop: ' + nextCrop
}
const replaceAreaInText = (content: string, area: number, unit: string, vocabulary: VoiceCropTerminology | null) => {
  if (!vocabulary) return content
  const numberWords = Object.keys(vocabulary.numberWords).join('|')
  const areaUnits = vocabulary.areaUnits.join('|')
  const pattern = new RegExp('\\b(\\d+(?:\\.\\d+)?|' + numberWords + ')\\s*(' + areaUnits + ')\\b', 'i')
  const replacement = String(area) + ' ' + unit
  return pattern.test(content) ? content.replace(pattern, replacement) : content + '. Area ' + replacement
}
const cropPreviewText = (draft: VoiceCropIntakeDraft) => [
  'Planting draft — nothing has been saved yet.',
  'Farm: ' + (draft.farmName ?? 'not selected'),
  'Crop: ' + (draft.cropName ?? 'not identified'),
  draft.area === undefined ? 'Area: not provided' : 'Area: ' + draft.area + ' ' + (draft.unit ?? 'unit not specified'),
  'Season: not specified. Status: Sown. Planting date: today if you confirm; the intake service assigns today’s date.',
  'Say “confirm” to save through the authorized intake workflow, or “cancel” to discard this draft.',
].join(' ')
const inferTextLanguage = (text: string, preferred: string): string => {
  const scripts: Array<{ language: string; pattern: RegExp }> = [
    { language: 'te-IN', pattern: /[\u0C00-\u0C7F]/ },
    { language: 'ta-IN', pattern: /[\u0B80-\u0BFF]/ },
    { language: 'kn-IN', pattern: /[\u0C80-\u0CFF]/ },
    { language: 'ml-IN', pattern: /[\u0D00-\u0D7F]/ },
    { language: 'bn-IN', pattern: /[\u0980-\u09FF]/ },
    { language: 'gu-IN', pattern: /[\u0A80-\u0AFF]/ },
    { language: 'pa-IN', pattern: /[\u0A00-\u0A7F]/ },
  ]
  const script = scripts.find(item => item.pattern.test(text))
  if (script) return script.language
  if (/[\u0900-\u097F]/.test(text)) {
    return preferred === 'mr-IN' ? 'mr-IN' : 'hi-IN'
  }
  // Typed Latin-script questions should not inherit a stale Indic speech
  // selection. Voice recognition continues to use the explicitly selected locale.
  if (/[A-Za-z]/.test(text)) return 'en-IN'
  return preferred
}
const LANGUAGES = [
  ['en-IN','English'],['hi-IN','हिन्दी'],['te-IN','తెలుగు'],['ta-IN','தமிழ்'],['kn-IN','ಕನ್ನಡ'],
  ['ml-IN','മലയാളം'],['bn-IN','বাংলা'],['mr-IN','मराठी'],['gu-IN','ગુજરાતી'],['pa-IN','ਪੰਜਾਬੀ'],
]
type VoiceIntent = {
  intentId: string
  label: string
  phrases: string[]
  path: string
  access: 'AUTHENTICATED' | 'SYSTEM_GOD'
  moduleId: string
}
type RestrictedVoiceIntent = { intentId: string; label: string; phrases: string[]; moduleId: string }
type AiProviderStatus = {
  enabled: boolean; ready: boolean; canGenerate: boolean; productionReady: boolean; evaluationOnly: boolean
  providerId: string; modelId: string; modelVersion: string; status: string; mode: string
  runtime: { reachable: boolean; modelInstalled: boolean; error?: string }
}

export function VoiceAgent({ role }: { role: string }) {
  const navigate = useNavigate()
  const accessToken = useAuthStore(state => state.accessToken)
  const [open,setOpen] = useState(false)
  const [listening,setListening] = useState(false)
  const [spoken,setSpoken] = useState(true)
  const [lang,setLang] = useState(() => { try { return localStorage.getItem('kk-voice-language') || 'en-IN' } catch { return 'en-IN' } })
  const [transcript,setTranscript] = useState('')
  const [message,setMessage] = useState('Your voice assistant is ready. Press Speak when you want to use it.')
  const [turns,setTurns] = useState<VoiceTurn[]>([])
  const turnId = useRef(0)
  // Monotonic epoch invalidates any response that outlives an interruption.
  const turnEpoch = useRef(0)
  const [unsupported,setUnsupported] = useState(false)
  const rec = useRef<Recognition|null>(null)
  const activeRequest = useRef<AbortController | null>(null)
  const commandInFlight = useRef(false)
  const speechSuppressed = useRef(false)
  const lastVoiceSubmission = useRef<{ text: string; at: number } | null>(null)
  const conversationId = useRef<string|null>(null)
  const conversationPromise = useRef<Promise<string>|null>(null)
  const [voiceIntents, setVoiceIntents] = useState<VoiceIntent[]>([])
  const [navigationPrefixes, setNavigationPrefixes] = useState<string[]>([])
  const [restrictedIntents, setRestrictedIntents] = useState<RestrictedVoiceIntent[]>([])
  const [intentManifestReady, setIntentManifestReady] = useState(false)
  const [providerStatus, setProviderStatus] = useState<AiProviderStatus | null>(null)
  const [factDrafts, setFactDrafts] = useState<AiFactCandidate[]>([])
  const [draftEvidence, setDraftEvidence] = useState<Record<string, string>>({})
  const [draftReviewOpen, setDraftReviewOpen] = useState(false)
  const [draftBusy, setDraftBusy] = useState(false)
  const [intakeDraft, setIntakeDraft] = useState<VoiceCropIntakeDraft | null>(null)
  const [cropTerminology, setCropTerminology] = useState<VoiceCropTerminology | null>(null)
  const intakeCommitInFlight = useRef(false)
  const lastEvidenceMessageId = useRef<string | null>(null)
  const admin = role === 'SUPER_ADMIN' && voiceIntents.some(intent => intent.access === 'SYSTEM_GOD')

  useEffect(() => {
    const w = window as SpeechWindow
    setUnsupported(!(w.SpeechRecognition || w.webkitSpeechRecognition))
    return () => { rec.current?.stop(); window.speechSynthesis?.cancel() }
  }, [])

  useEffect(() => {
    let active = true
    // Never carry a pending farm/crop draft or stale vocabulary across account changes.
    setIntakeDraft(null)
    setCropTerminology(null)
    if (!accessToken) {
      setVoiceIntents([])
      setNavigationPrefixes([])
      setRestrictedIntents([])
      setIntentManifestReady(false)
      return () => { active = false }
    }
    api.getAiVoiceIntents(accessToken).then(result => {
      if (!active) return
      setVoiceIntents(result.intents)
      setCropTerminology(result.cropTerminology ?? null)
      setNavigationPrefixes(result.navigationPrefixes ?? [])
      setRestrictedIntents(result.restrictedIntents ?? [])
      setIntentManifestReady(true)
    }).catch(() => {
      if (!active) return
      setVoiceIntents([])
      setNavigationPrefixes([])
      setRestrictedIntents([])
      setIntentManifestReady(false)
    })
    return () => { active = false }
  }, [accessToken])

  // Recover the most recent owner-scoped conversation after refresh/remount so
  // saved drafts and their evidence remain reviewable instead of appearing lost.
  useEffect(() => {
    let active = true
    conversationId.current = null
    conversationPromise.current = null
    lastEvidenceMessageId.current = null
    setTurns([])
    setFactDrafts([])
    setDraftEvidence({})
    setDraftReviewOpen(false)
    if (!accessToken) return () => { active = false }

    api.listAiConversations(accessToken).then(async conversations => {
      if (!active || !conversations.length || conversationId.current || conversationPromise.current) return
      const latest = conversations[0]
      conversationId.current = latest.id
      const [history, candidates] = await Promise.all([
        api.getAiConversationHistory(accessToken, latest.id),
        api.getAiFactCandidates(accessToken, latest.id),
      ])
      if (!active) return
      setFactDrafts(candidates)
      setDraftEvidence(Object.fromEntries(history.map(item => [item.id, item.content])))
      const restored = history.slice(-60).map(item => ({
        id: ++turnId.current,
        speaker: item.role === 'USER' ? 'You' as const : 'Krishi' as const,
        text: item.content,
        at: new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }))
      setTurns(restored)
      if (candidates.length) {
        setMessage(`Restored your last conversation with ${candidates.length} saved fact draft(s). Open Review saved fact drafts to continue safely.`)
      } else if (history.length) {
        setMessage('Restored your last AI conversation. You can continue it or review saved fact drafts.')
      }
    }).catch(() => {
      // Recovery is best-effort; the normal create-conversation path remains usable.
    })
    return () => { active = false }
  }, [accessToken])

  const persistUserMessage = async (
    content: string,
    source: 'TEXT' | 'VOICE',
    language: string = lang,
  ): Promise<string | null> => {
    const token = accessToken
    if (!token) {
      setMessage('Please sign in again to save and use the AI conversation.')
      return null
    }

    try {
      let id = conversationId.current

      if (!id) {
        if (!conversationPromise.current) {
          conversationPromise.current = api
            .createAiConversation(token, language)
            .then(result => {
              if (!result?.id) {
                throw new Error('Conversation response did not include an id.')
              }
              conversationId.current = result.id
              return result.id
            })
        }

        try {
          id = await conversationPromise.current
        } finally {
          conversationPromise.current = null
        }
      }

      const savedMessage = await api.appendAiConversationMessage(
        token,
        id,
        content,
        source,
        language,
      )
      if (savedMessage?.id) lastEvidenceMessageId.current = savedMessage.id
      return id
    } catch {
      setMessage(
        'I could not save this conversation. Check your connection and sign-in, then try again.',
      )
      return null
    }
  }

  useEffect(() => {
    let active = true
    if (!accessToken) {
      setProviderStatus(null)
      return () => { active = false }
    }
    api.getAiConversationStatus(accessToken).then(status => {
      if (active) setProviderStatus(status)
    }).catch(() => {
      if (active) setProviderStatus(null)
    })
    return () => { active = false }
  }, [accessToken])

  const loadFactDrafts = async () => {
    const token = accessToken
    const id = conversationId.current
    if (!token || !id) {
      setMessage('There is no saved conversation to review yet. Ask or say something first.')
      setDraftReviewOpen(true)
      setFactDrafts([])
      return false
    }
    setDraftBusy(true)
    try {
      const [candidates, history] = await Promise.all([
        api.getAiFactCandidates(token, id),
        api.getAiConversationHistory(token, id),
      ])
      setFactDrafts(candidates)
      setDraftEvidence(Object.fromEntries(history.map(item => [item.id, item.content])))
      setDraftReviewOpen(true)
      setMessage(candidates.length
        ? `Loaded ${candidates.length} saved fact draft(s). Review the proposed value and its source before confirming or rejecting.`
        : 'No fact drafts have been created for this conversation yet. AI extraction is not active until an approved provider is enabled.')
      return true
    } catch {
      setMessage('I could not load fact drafts. Check your sign-in and connection, then try again.')
      return false
    } finally {
      setDraftBusy(false)
    }
  }

  const applyFactDraft = async (draft: AiFactCandidate) => {
    if (!accessToken || !conversationId.current) return
    setDraftBusy(true)
    try {
      const applied = await api.applyAiFactCandidate(accessToken, conversationId.current, draft.id, draft.previewHash)
      const refreshed = await loadFactDrafts()
      setMessage(refreshed
        ? `${applied.targetEntityType} field ${applied.targetFieldId} updated through its authorized module service and audit-recorded.`
        : 'The record update succeeded and was audited, but the refreshed preview could not be loaded.')
    } catch {
      await loadFactDrafts()
      setMessage('The record update could not be applied. No success is claimed; review the draft status and retry only if it remains CONFIRMED.')
    } finally {
      setDraftBusy(false)
    }
  }

  const confirmFactDraft = async (draft: AiFactCandidate) => {
    if (!accessToken || !conversationId.current) return
    setDraftBusy(true)
    try {
      await api.confirmAiFactCandidate(accessToken, conversationId.current, draft.id, draft.previewHash)
      const refreshed = await loadFactDrafts()
      setMessage(refreshed
        ? 'Draft confirmed and audit-recorded. No farm, crop, livestock, marketplace or profile record has been changed; applying the confirmed draft through its normal authorized module API is a separate step.'
        : 'Draft confirmation succeeded and was audited, but the refreshed preview could not be loaded. Reopen Review saved fact drafts before taking another action.')
    } catch {
      setMessage('The draft could not be confirmed. Its preview may have changed, validation may have failed, or authorization may have changed. Reload the drafts and review again.')
    } finally {
      setDraftBusy(false)
    }
  }

  const rejectFactDraft = async (draft: AiFactCandidate) => {
    if (!accessToken || !conversationId.current) return
    setDraftBusy(true)
    try {
      await api.rejectAiFactCandidate(accessToken, conversationId.current, draft.id, draft.previewHash, 'Rejected by user in Voice Agent review.')
      const refreshed = await loadFactDrafts()
      setMessage(refreshed
        ? 'Draft rejected and audit-recorded. No application record was changed.'
        : 'Draft rejection succeeded and was audited, but the refreshed preview could not be loaded.')
    } catch {
      setMessage('The draft could not be rejected. Reload the drafts and try again.')
    } finally {
      setDraftBusy(false)
    }
  }

  const say = (text:string, speechLanguage: string = lang) => {
    commandInFlight.current = false
    activeRequest.current = null
    setMessage(text)
    setTurns(previous => [...previous, { id: ++turnId.current, speaker: 'Krishi' as const, text, at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }].slice(-60))
    if (spoken && !speechSuppressed.current && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text); u.lang = speechLanguage; u.rate = 1.08; u.pitch = 1.04
      window.speechSynthesis.speak(u)
    }
  }

  const beginCropIntakeDraft = async (content: string, cropName: string | undefined, epoch: number) => {
    if (!cropName) {
      setIntakeDraft({ content, ...parseSpokenArea(content, cropTerminology), phase: 'NEEDS_CROP', farms: [] })
      say('I understood that you planted something, but I could not identify the crop confidently. Please say the crop name, for example mango, rice, maize or cotton. Nothing has been saved.')
      return
    }
    if (!accessToken) {
      setIntakeDraft(null)
      say('Please sign in again before preparing a planting record. Nothing has been saved.')
      return
    }
    let farms: VoiceFarm[]
    try {
      const loaded = await api.farms(accessToken)
      if (epoch !== turnEpoch.current) return
      farms = (Array.isArray(loaded) ? loaded : []).filter(
        (farm: VoiceFarm) => typeof farm?.id === 'string' && typeof farm?.name === 'string',
      )
    } catch {
      if (epoch === turnEpoch.current) {
        setIntakeDraft(null)
        say('I could not load your authorized farms, so I did not prepare or save a planting record. Please try again.')
      }
      return
    }
    if (epoch !== turnEpoch.current) return
    if (farms.length === 0) {
      setIntakeDraft(null)
      say('You do not have an accessible farm to attach this planting to. Create or activate your farm first; nothing was saved.')
      return
    }
    const area = parseSpokenArea(content, cropTerminology)
    if (farms.length === 1) {
      const draft: VoiceCropIntakeDraft = {
        content, cropName, ...area, phase: 'PREVIEW', farms,
        farmId: farms[0].id, farmName: farms[0].name,
      }
      setIntakeDraft(draft)
      say(cropPreviewText(draft))
      return
    }
    const draft: VoiceCropIntakeDraft = { content, cropName, ...area, phase: 'NEEDS_FARM', farms }
    setIntakeDraft(draft)
    say('Which farm should I use for the ' + cropName + ' planting? Say a farm name or its number: ' + farms.map((farm, index) => (index + 1) + ', ' + farm.name).join('; ') + '. Nothing has been saved.')
  }

  const confirmCropIntake = async (draft: VoiceCropIntakeDraft) => {
    if (!accessToken || !draft.farmId || !draft.cropName) {
      setIntakeDraft(null)
      say('The planting draft is missing its farm or crop. Nothing was saved; please start again.')
      return
    }
    intakeCommitInFlight.current = true
    setMessage('Saving the confirmed planting through the authorized farm intake service…')
    try {
      const result = await api.createIntake({
        farmId: draft.farmId,
        inputMethod: 'VOICE',
        content: draft.content,
      }, accessToken) as {
        createdCrop?: { id?: string; name?: string }
        category?: string
      }
      setIntakeDraft(null)
      if (result?.category === 'PLANTING' && result.createdCrop?.id && result.createdCrop.name) {
        say('Saved. The ' + result.createdCrop.name + ' crop record was created for ' + (draft.farmName ?? 'your selected farm') + ', and its farm activity history was saved.')
      } else {
        say('The server returned an intake response but did not confirm a created crop record ID. Please check the Crops and farm History pages before assuming the crop was saved.')
      }
    } catch {
      // A network failure can occur after a server commit. Avoid an automatic
      // retry that might create a duplicate; ask the farmer to verify history.
      setIntakeDraft(null)
      say('I could not verify the save result. Please check the selected farm’s Crops and History pages before retrying, to avoid creating a duplicate.')
    } finally {
      intakeCommitInFlight.current = false
    }
  }

  const handleCropDraftTurn = async (original: string, q: string, draft: VoiceCropIntakeDraft, epoch: number) => {
    if (/^(cancel|cancel draft|discard|no|do not save|don't save|stop)$/i.test(q)) {
      setIntakeDraft(null)
      say('Planting draft discarded. No crop or farm record was changed.')
      return
    }
    if (draft.phase === 'NEEDS_CROP') {
      const cropName = findKnownCrop(original, cropTerminology)
      if (!cropName) {
        say('Please name a crop I can identify, such as mango, rice, maize or cotton. Nothing has been saved.')
        return
      }
      await beginCropIntakeDraft(replaceCropInText(draft.content, undefined, cropName), cropName, epoch)
      return
    }
    if (draft.phase === 'NEEDS_FARM') {
      const numberedFarm = q.match(/^(?:farm\s+|option\s+)?(\d+|first|second|third|fourth|fifth|one|two|three|four|five)(?:\s+farm)?[.! ]*$/i)
      const farmOrdinal: Record<string, number> = { first: 1, one: 1, second: 2, two: 2, third: 3, three: 3, fourth: 4, four: 4, fifth: 5, five: 5 }
      const selectedIndex = numberedFarm ? Number(farmOrdinal[numberedFarm[1].toLocaleLowerCase()] ?? numberedFarm[1]) - 1 : -1
      const farm = selectedIndex >= 0 ? draft.farms[selectedIndex] : draft.farms.find(item => q.includes(item.name.toLocaleLowerCase()))
      if (!farm) {
        say('I could not match that to a farm you can access. Please say one of these names: ' + draft.farms.map(item => item.name).join(', ') + '. Nothing has been saved.')
        return
      }
      const next: VoiceCropIntakeDraft = { ...draft, phase: 'PREVIEW', farmId: farm.id, farmName: farm.name }
      setIntakeDraft(next)
      say(cropPreviewText(next))
      return
    }
    if (/^(?:(?:today|date is today)\s+)?(?:confirm|confirm save|save|yes|yes save|okay|ok)(?:\s+(?:today|date is today))?[.! ]*$/i.test(q)) {
      await confirmCropIntake(draft)
      return
    }

    let next = { ...draft }
    let changed = false
    const cropCorrection = findKnownCrop(original, cropTerminology)
    if (cropCorrection && /(change|correct|actually|instead|crop|make it|not)/i.test(q)) {
      next.content = replaceCropInText(next.content, next.cropName, cropCorrection)
      next.cropName = cropCorrection
      changed = true
    }
    const areaCorrection = parseSpokenArea(original, cropTerminology)
    if (areaCorrection.area !== undefined && /(area|acre|hectare|land|change|correct|actually)/i.test(q)) {
      next.content = replaceAreaInText(next.content, areaCorrection.area, areaCorrection.unit ?? 'acre', cropTerminology)
      next.area = areaCorrection.area
      next.unit = areaCorrection.unit
      changed = true
    }
    const farmCorrection = draft.farms.find(item =>
      q.includes(item.name.toLocaleLowerCase()) && /(farm|change|use|select|switch|actually)/i.test(q),
    )
    if (farmCorrection) {
      next.farmId = farmCorrection.id
      next.farmName = farmCorrection.name
      changed = true
    }
    if (changed) {
      setIntakeDraft(next)
      say(cropPreviewText(next))
      return
    }
    say('The planting draft is still unsaved. Say “confirm” to save, “cancel” to discard, or say a correction such as “change crop to rice” or “change area to two acres”.')
  }
  const command = async (raw:string, source: 'TEXT' | 'VOICE' = 'TEXT') => {
    const original = raw.trim()
    const q = original.toLocaleLowerCase()
    if (!q || commandInFlight.current) return
    speechSuppressed.current = false
    commandInFlight.current = true
    const epoch = ++turnEpoch.current
    const controller = new AbortController()
    activeRequest.current = controller
    setTurns(previous => [...previous, { id: ++turnId.current, speaker: 'You' as const, text: original, at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }].slice(-60))
    const turnLanguage = source === 'VOICE' ? lang : inferTextLanguage(original, lang)
    const persistence = persistUserMessage(original, source, turnLanguage)
    // Weather intent is recognized explicitly, but fails closed until a
    // production-ready weather provider is registered and verified.
    const weatherIntent =
      /\b(weather|climate|forecast|temperature|rainfall|rain|humidity)\b/i.test(original) ||
      /వాతావరణం|मौसम|வானிலை|ಹವಾಮಾನ|കാലാവസ്ഥ/.test(original)

    if (weatherIntent) {
      say(
        'I understood your weather request. Live weather is not connected to an approved, verified provider yet, so I cannot report today’s conditions. Your request is being handled as conversation history only; no weather reading or farm record has been created.'
      )
      return
    }

    if (['help','what can you do','సహాయం','मदद'].some(w => q.includes(w))) {
      say(role === 'SUPER_ADMIN' && !admin
        ? 'I can answer general questions. Privileged administrative AI navigation requires authorization from the canonical God Mode identity; no administrative action has been enabled for this account.'
        : admin
          ? 'I can open God-authorized workspace pages such as God Mode, validation, users, permissions, database, connections and system. Changes to settings and records still require server authorization and confirmation.'
          : 'I can open your dashboard, farms, crops, livestock, marketplace, activities, history and AI intake. Record changes require approved, permission-checked workflows.')
      return
    }
    const isNavigationRequest =
      navigationPrefixes.some(prefix => q.startsWith(prefix.toLocaleLowerCase())) ||
      [...voiceIntents, ...restrictedIntents].some(intent =>
        intent.phrases.some(phrase => q === phrase.toLocaleLowerCase())
      )
    const restrictedMatch = isNavigationRequest
      ? restrictedIntents.find(intent => intent.phrases.some(phrase => q.includes(phrase.toLocaleLowerCase())))
      : undefined
    if (restrictedMatch) {
      say('That administrative intent requires authorization from the canonical God Mode identity. No privileged action was performed.')
      return
    }
    const match = intentManifestReady && isNavigationRequest
      ? voiceIntents.find(intent => intent.phrases.some(phrase => q.includes(phrase.toLocaleLowerCase())))
      : undefined
    if (match) {
      navigate(match.path)
      say('Opening ' + match.label + '.')
      return
    }
    if (['stop speaking','silence','ఆపు','रुको'].some(w => q.includes(w))) {
      speechSuppressed.current = true
      window.speechSynthesis?.cancel()
      setMessage('Speech stopped. You can press Speak and ask a corrected question.')
      return
    }
    const token = accessToken
    if (!token) {
      void persistence
      say('Please sign in again before asking the AI assistant a question.')
      return
    }

    if (intakeDraft) {
      const savedId = await persistence
      if (controller.signal.aborted || epoch !== turnEpoch.current) return
      if (!savedId) {
        say('I could not save this turn, so the planting draft was not changed or submitted. Please try again.')
        return
      }
      await handleCropDraftTurn(original, q, intakeDraft, epoch)
      return
    }

    if (isPlantingRequest(original, cropTerminology)) {
      const savedId = await persistence
      if (controller.signal.aborted || epoch !== turnEpoch.current) return
      if (!savedId) {
        say('I could not save your planting request, so I did not prepare or submit a crop record. Please try again.')
        return
      }
      await beginCropIntakeDraft(original, findKnownCrop(original, cropTerminology), epoch)
      return
    }

    setMessage('Saving your question and preparing a local answer…')
    const id = await persistence
    if (controller.signal.aborted || epoch !== turnEpoch.current) {
      if (activeRequest.current === controller) {
        activeRequest.current = null
        commandInFlight.current = false
      }
      return
    }
    if (!id) {
      // Persistence failures must end in a visible assistant turn, not a silent return.
      say('I could not save your question, so I did not send it for AI generation. Check your connection and sign-in, then try again.')
      return
    }

    setMessage('Your question is saved. The local assistant is generating a reply…')
    try {
      const response = await api.requestAiConversationResponse(
        token,
        id,
        original,
        turnLanguage,
        controller.signal,
      )
      if (!controller.signal.aborted && epoch === turnEpoch.current) {
        const answer = typeof response?.message?.content === 'string'
          ? response.message.content.trim()
          : ''
        say(answer || 'The local AI service returned an empty answer. Your question is saved; please try once more. No farm record was changed.', turnLanguage)
      }
    } catch (error) {
      if (!controller.signal.aborted && epoch === turnEpoch.current) {
        const detail = error instanceof Error ? error.message.trim() : ''
        const safeDetail = detail && detail.length < 180 ? ' Details: ' + detail : ''
        say(
          'I could not obtain an AI answer from the local provider. Your question remains in conversation history; no farm record was changed. Please try again or check the AI provider status.' + safeDetail,
        )
      }
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null
        commandInFlight.current = false
      }
    }
  }
  const stopConversation = () => {
    if (intakeCommitInFlight.current) {
      // A confirmed write cannot be safely canceled once the request is sent.
      speechSuppressed.current = true
      rec.current?.stop()
      rec.current = null
      setListening(false)
      window.speechSynthesis?.cancel()
      setMessage('A confirmed planting save is already processing. It cannot be safely canceled; wait for the verified result.')
      return
    }
    // Invalidate before aborting: a provider may resolve concurrently with abort.
    turnEpoch.current += 1
    speechSuppressed.current = true
    rec.current?.stop()
    rec.current = null
    setListening(false)
    activeRequest.current?.abort()
    activeRequest.current = null
    commandInFlight.current = false
    window.speechSynthesis?.cancel()
    setMessage('Stopped. I will not continue listening or speaking. You can start again when ready.')
  }

  const listen = () => {
    if (intakeCommitInFlight.current) {
      setMessage('A confirmed planting save is processing. Wait for its result before starting another voice command.')
      return
    }
    if (listening) { stopConversation(); return }
    // Pressing Speak during a reply is an interrupt-and-correct action.
    // Cancel speech and the in-flight request, then immediately reopen listening.
    if (commandInFlight.current || Boolean(window.speechSynthesis?.speaking)) stopConversation()
    const w = window as SpeechWindow, Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!Ctor) { setUnsupported(true); say('Speech recognition is unavailable in this browser. You can type a command instead.'); return }
    try {
      const r = new Ctor(); r.lang = lang; r.continuous = false; r.interimResults = true
      let submitted = false
      r.onresult = e => {
        let finalText = '', partial = ''
        const firstNewResult = Math.max(0, e.resultIndex ?? (e.results.length - 1))
        for (let i=firstNewResult;i<e.results.length;i++) {
          const text = e.results[i][0].transcript
          if (e.results[i].isFinal) finalText += text
          else partial += text
        }
        setTranscript(finalText || partial)
        if (finalText.trim() && !submitted) {
          submitted = true
          const normalized = finalText.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
          const previous = lastVoiceSubmission.current
          const now = Date.now()
          if (previous && previous.text === normalized && now - previous.at < 5000) return
          lastVoiceSubmission.current = { text: normalized, at: now }
          setListening(false)
          r.stop()
          void command(finalText.trim(), 'VOICE')
        }
      }
      r.onerror = e => { setListening(false); if (e.error !== 'aborted') say(e.error === 'not-allowed' ? 'Microphone access was denied. Allow it in browser settings to use voice.' : 'Voice input stopped. Please try again.') }
      r.onend = () => setListening(false)
      rec.current = r; setTranscript(''); setListening(true); setMessage('Listening… speak naturally.'); r.start()
    } catch { setListening(false); say('Could not start the microphone. Check browser permissions and try again.') }
  }
  return <div className="fixed bottom-4 right-3 z-[80] flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-2 sm:bottom-5 sm:right-5">
    {open && <section aria-label="KrishiKendram voice assistant" className="flex max-h-[calc(100dvh-6rem)] w-[min(20rem,calc(100vw-1.25rem))] flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-2xl">
      <header className="flex shrink-0 items-center justify-between border-b px-3 py-2"><div className="flex items-center gap-2"><span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkles size={18}/></span><div><p className="text-sm font-semibold">Krishi Voice Agent</p><p className="text-xs text-muted-foreground">{admin?'Administrator workspace':'Farm assistant'}</p></div></div><button type="button" aria-label="Close voice assistant" onClick={()=>{stopConversation();setOpen(false)}} className="rounded-lg p-2 hover:bg-muted"><X size={16}/></button></header>
      <div className="border-b px-3 py-1.5 text-[10px] text-muted-foreground" aria-live="polite">
        <span className="font-semibold">AI provider:</span>{' '}
        {providerStatus?.runtime?.reachable && providerStatus.runtime.modelInstalled
          ? providerStatus.evaluationOnly ? 'Local evaluation only - not production approved' : providerStatus.ready ? 'Production approved' : 'Model reachable but not authorized'
          : providerStatus?.runtime?.reachable ? 'Runtime online; configured model missing' : 'Local runtime unavailable'}
        {providerStatus?.modelId ? ' (' + providerStatus.modelId + ')' : ''}
      </div>
      <div className="min-h-0 space-y-2 overflow-y-auto p-3 text-xs"><div aria-label="Live conversation subtitles" aria-live="polite" className="max-h-36 space-y-2 overflow-y-auto rounded-lg border bg-background p-2">{turns.length===0?<p className="text-xs text-muted-foreground">Conversation subtitles will appear here. Both your words and the agent’s replies remain visible while this panel is open.</p>:turns.map(turn=><div key={turn.id} className={turn.speaker==='You'?'text-right':''}><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{turn.speaker} · {turn.at}</p><p className="break-words text-xs leading-relaxed">{turn.text}</p></div>)}</div>
        {draftReviewOpen && <section aria-label="Fact draft review" className="space-y-2 rounded-lg border bg-background p-2">
          <div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold">Draft review</p><button type="button" className="text-xs text-muted-foreground underline" onClick={() => setDraftReviewOpen(false)}>Hide</button></div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">Confirmation approves only the exact validated proposal shown below. Applying an existing-record change is a separate step that rechecks authorization, field policy and stale-value conflicts through the normal module service.</p>
          {factDrafts.length === 0 ? <p className="text-xs text-muted-foreground">No saved fact drafts in this conversation.</p> : factDrafts.map(draft => {
            const validation = draft.validationResult && typeof draft.validationResult === 'object'
              ? draft.validationResult as { valid?: boolean; errors?: string[] }
              : {}
            const canConfirm = validation.valid === true && ['VALIDATION_PENDING','AWAITING_CONFIRMATION'].includes(draft.status)
            const canApply = draft.status === 'CONFIRMED' && Boolean(draft.targetEntityId)
            const canReject = ['DETECTED','NORMALIZED','VALIDATION_PENDING','CONFLICT','AWAITING_CONFIRMATION'].includes(draft.status)
            const value = typeof draft.proposedValue === 'string' ? draft.proposedValue : JSON.stringify(draft.proposedValue)
            const evidence = draft.evidenceReference ? draftEvidence[draft.evidenceReference] : undefined
            return <article key={draft.id} className="space-y-2 rounded-lg border p-2">
              <div className="flex items-start justify-between gap-2"><p className="break-words text-xs font-semibold">{draft.targetEntityType ?? draft.moduleId}.{draft.targetFieldId ?? 'field'}</p><span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px]">{draft.status}</span></div>
              <p className="break-words text-sm">{value}</p>
              <p className="text-[11px] text-muted-foreground">Source: {evidence ? `“${evidence}”` : 'Original user message unavailable'}</p>
              {validation.valid === false && <div className="rounded bg-destructive/10 p-2 text-[11px]">{(validation.errors ?? ['Central validation failed.']).join(' ')}</div>}
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={draftBusy || !canConfirm} onClick={() => void confirmFactDraft(draft)} className="h-8 min-w-0 flex-1 rounded-lg bg-primary px-2 text-xs font-semibold text-primary-foreground disabled:opacity-40">Confirm draft</button>
                {canApply && <button type="button" disabled={draftBusy} onClick={() => void applyFactDraft(draft)} className="h-8 flex-1 rounded-lg border px-2 text-xs disabled:opacity-40">Apply confirmed</button>}
                <button type="button" disabled={draftBusy || !canReject} onClick={() => void rejectFactDraft(draft)} className="h-8 rounded-lg border px-2 text-xs disabled:opacity-40">Reject</button>
              </div>
            </article>
          })}
        </section>}
        <label htmlFor="kk-voice-language" className="block text-xs font-medium text-muted-foreground">Spoken language</label>
        <select id="kk-voice-language" value={lang} onChange={e=>{setLang(e.target.value);try{localStorage.setItem('kk-voice-language',e.target.value)}catch{/* Language preference is optional. */}}} className="h-9 w-full rounded-lg border bg-background px-2 text-xs">{LANGUAGES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
        <div aria-live="polite" className="min-h-12 rounded-lg bg-muted/60 p-2 text-xs"><p>{message}</p>{transcript&&<p className="mt-2 border-t pt-2 text-muted-foreground">Heard: {transcript}</p>}</div>
        <div className="flex gap-2"><button type="button" onClick={listen} className={`flex h-9 flex-1 items-center justify-center gap-2 rounded-lg text-xs font-semibold ${listening?'bg-destructive text-destructive-foreground':'bg-primary text-primary-foreground'}`}>{listening?<MicOff size={17}/>:<Mic size={17}/>} {listening?'Stop listening':'Speak'}</button><button type="button" aria-label={spoken?'Mute spoken replies':'Enable spoken replies'} onClick={()=>{setSpoken(v=>!v);if(spoken)window.speechSynthesis?.cancel()}} className="flex size-9 items-center justify-center rounded-lg border">{spoken?<Volume2 size={17}/>:<VolumeX size={17}/>}</button><button type="button" onClick={stopConversation} aria-label="Stop conversation" title="Stop listening, generation and speech" className="flex size-9 items-center justify-center rounded-lg border text-destructive"><Square size={15}/></button></div>
        <button type="button" disabled={draftBusy} onClick={() => void loadFactDrafts()} className="h-8 w-full rounded-lg border text-xs disabled:opacity-40">{draftBusy ? 'Loading drafts…' : 'Review saved fact drafts'}</button>
        <form onSubmit={e=>{e.preventDefault();command(transcript, 'TEXT')}} className="flex gap-2"><input aria-label="Type a voice command" value={transcript} onChange={e=>setTranscript(e.target.value)} placeholder="Or type: show my farms" className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-2 text-xs"/><button type="submit" className="rounded-lg border px-2 text-xs">Go</button></form>
        {unsupported&&<p className="text-xs text-muted-foreground">Speech recognition is not available in this browser; typed commands still work.</p>}
        <p className="text-[9px] leading-snug text-muted-foreground">Mic is off until Speak. Browser speech recognition may use its provider. Local AI is evaluation-only; cloud fallback is off. Answers are advisory. Farm and crop changes need review, confirmation and module authorization.</p>
      </div></section>}
    <button type="button" onClick={()=>setOpen(v=>!v)} aria-label={open?'Minimize voice assistant':'Open voice assistant'} title="Voice assistant" className="flex h-10 items-center gap-2 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-lg"><Mic size={19}/><span>Voice Agent</span><ChevronUp size={16} className={open?'rotate-180 transition-transform':'transition-transform'}/></button>
  </div>
}
