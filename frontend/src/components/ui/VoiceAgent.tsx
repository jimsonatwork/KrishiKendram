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
type VoiceRecordDraftField = { value: unknown; evidenceMessageId: string }
type VoiceMarketResource = { id: string; name: string; resourceType: 'crop' | 'livestock' }
type VoiceRecordCreationDraft = {
  kind: 'FARM' | 'LIVESTOCK' | 'MARKETPLACE'
  sessionId: string
  phase: 'NEEDS_NAME' | 'NEEDS_FARM' | 'NEEDS_SPECIES' | 'NEEDS_COUNT' | 'NEEDS_RESOURCE'
  fields: Record<string, VoiceRecordDraftField>
  farms: VoiceFarm[]
  resources?: VoiceMarketResource[]
}
type VoiceCropIntakeDraft = {
  content: string
  cropName?: string
  area?: number
  unit?: string
  weeksAgo?: number
  fertilizer?: string
  areaUnknown?: boolean
  sowingDateUnknown?: boolean
  phase: 'NEEDS_CROP' | 'NEEDS_FARM' | 'NEEDS_AREA' | 'NEEDS_DATE' | 'PREVIEW'
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
  // A question about planting/sowing is not itself a request to create a crop.
  // In particular, "Why should I record sowing dates?" must reach AI Q&A,
  // not the planting-intake wizard just because it contains the word "sowing".
  const questionLead = /^\s*(what|why|when|where|how|which|who|can|could|should|would|do|does|did|is|are|explain|tell me)\b/i
  if (questionLead.test(text)) return false

  const plantingVerb = new RegExp('\\b(' + vocabulary.plantingVerbs.join('|') + ')\\b', 'i')
  const imperative = new RegExp('^\\s*' + vocabulary.imperativeCropAction + '\\s+', 'i')
  const hasCrop = Boolean(findKnownCrop(text, vocabulary))
  const registrationVerb = new RegExp('\\b(' + vocabulary.cropRegistrationVerbs.join('|') + ')\\b', 'i')
  const explicitCropRecord = /\b(crop|planting|field)\b/i.test(text)
  const firstPersonPlantingStatement = /\b(i|we|my farm|our farm)\b.{0,40}\b(planted|planting|sowed|sowing|sown|transplanted|cultivated)\b/i.test(text)
  return (plantingVerb.test(text) && (hasCrop || explicitCropRecord || firstPersonPlantingStatement)) ||
    (hasCrop && imperative.test(text)) ||
    (hasCrop && registrationVerb.test(text) && explicitCropRecord)
}
const isFarmCreationRequest = (text: string) =>
  !/^\s*(what|why|when|where|how|which|who|can|could|should|would|do|does|did|is|are|explain|tell me)\b/i.test(text) &&
  /\b(add|create|register|record|start|new)\b/i.test(text) &&
  /\bfarm\b/i.test(text) &&
  !/\b(crop|planting|sowing|livestock|animal)\b/i.test(text)
const isLivestockCreationRequest = (text: string) =>
  !/^\s*(what|why|when|where|how|which|who|can|could|should|would|do|does|did|is|are|explain|tell me)\b/i.test(text) &&
  /(\b(add|create|register|record|save|track|enter)\b|\b(i have|we have|my farm has)\b)/i.test(text) &&
  Boolean(parseLivestockSpecies(text))

const isMarketplaceCreationRequest = (text: string) =>
  !/^\s*(what|why|when|where|how|which|who|can|could|should|would|do|does|did|is|are|explain|tell me)\b/i.test(text) &&
  (/\b(list|sell|selling|offer|post)\b/i.test(text) || /అమ్మ|విక్రయ|మార్కెట్|बेच|बिक्री|विक्रय|விற்பனை|ಮಾರಾಟ|വിൽക്ക|বিক্রি|વેચ|ਵੇਚ/.test(text)) &&
  (/\b(my|for sale|marketplace|listing|crop|paddy|rice|maize|cotton|livestock|goat|cow|buffalo|animal|produce)\b/i.test(text) || /వరి|పంట|ఆవు|మేక|పశువు|ధాన్యం|धान|फसल|गाय|बकरी|पशु|பயிர்|மாடு|ஆடு|ಬೆಳೆ|ಹಸು|ಮೇಕೆ|വിള|പശു|ধান|ফসল|গরু|પાક|ગાય|ਫਸਲ|ਗਾਂ/.test(text))

const parseSpokenArea = (text: string, vocabulary: VoiceCropTerminology | null): { area?: number; unit?: string } => {
  if (!vocabulary) return {}
  const numberWords = Object.keys(vocabulary.numberWords).join('|')
  // Speech recognition often transcribes "acre(s)" as "acer(s)".
  const areaUnits = [...vocabulary.areaUnits, 'acer', 'acers'].join('|')
  const match = text.normalize('NFKC').toLocaleLowerCase().match(
    new RegExp('\\b(\\d+(?:\\.\\d+)?|' + numberWords + ')\\s*(' + areaUnits + ')\\b', 'i'),
  )
  if (!match) return {}
  const amount = match[1].toLowerCase()
  return { area: vocabulary.numberWords[amount] ?? Number(amount), unit: match[2].toLowerCase().startsWith('acer') ? 'acres' : match[2] }
}
const parseNumberValue = (text: string, vocabulary: VoiceCropTerminology | null): number | undefined => {
  const words: Record<string, number> = {
    ...(vocabulary?.numberWords ?? {}),
    zero: 0, one: 1, a: 1, an: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  }
  const alternatives = Object.keys(words).sort((a, b) => b.length - a.length).map(word => word.replace(/ /g, '\\s+')).join('|')
  const match = text.normalize('NFKC').toLocaleLowerCase().match(new RegExp('\\b(\\d+(?:\\.\\d+)?|' + alternatives + ')\\b', 'i'))
  if (!match) return undefined
  const raw = match[1].toLocaleLowerCase()
  const value = Number(raw)
  return Number.isFinite(value) ? value : words[raw]
}
const livestockSpeciesAliases: Array<{ value: string; aliases: string[] }> = [
  { value: 'Cattle', aliases: ['cattle', 'cow', 'cows', 'bull', 'bulls', 'calf', 'calves', 'ఆవు', 'ఆవులు', 'పశువు', 'పశువులు', 'गाय', 'गायें'] },
  { value: 'Buffalo', aliases: ['buffalo', 'buffaloes', 'బర్రె', 'బర్రెలు', 'మహిషి', 'भैंस', 'भैंसें'] },
  { value: 'Goat', aliases: ['goat', 'goats', 'మేక', 'మేకలు', 'बकरी', 'बकरियां'] },
  { value: 'Sheep', aliases: ['sheep', 'గొర్రె', 'గొర్రెలు', 'भेड़'] },
  { value: 'Poultry', aliases: ['chicken', 'chickens', 'hen', 'hens', 'poultry', 'కోడి', 'కోళ్లు', 'मुर्गी', 'मुर्गियां'] },
  { value: 'Pig', aliases: ['pig', 'pigs', 'పంది', 'పందులు', 'सूअर'] },
  { value: 'Horse', aliases: ['horse', 'horses', 'గుర్రం', 'గుర్రాలు', 'घोड़ा', 'घोड़े'] },
]
const containsNonAscii = (value: string) => [...value].some(character => character.charCodeAt(0) > 127)
const parseLivestockSpecies = (text: string): string | undefined => {
  const normalized = text.normalize('NFKC').toLocaleLowerCase()
  for (const group of livestockSpeciesAliases) {
    if (group.aliases.some(alias => containsNonAscii(alias)
      ? normalized.includes(alias.toLocaleLowerCase())
      : new RegExp('\\b' + alias + '\\b', 'i').test(normalized))) return group.value
  }
  return undefined
}
const parseLivestockCount = (text: string, vocabulary: VoiceCropTerminology | null): number | undefined => {
  const normalized = text.normalize('NFKC').toLocaleLowerCase()
  const species = livestockSpeciesAliases.flatMap(group => group.aliases)
    .sort((a, b) => b.length - a.length)
    .find(alias => containsNonAscii(alias)
      ? normalized.includes(alias.toLocaleLowerCase())
      : new RegExp('\\b' + alias + '\\b', 'i').test(normalized))
  if (!species) return undefined
  const index = normalized.indexOf(species.toLocaleLowerCase())
  const before = normalized.slice(0, index)
  const value = parseNumberValue(before, vocabulary)
  if (value !== undefined && value >= 1 && value <= 100000) return Math.floor(value)
  if (/\b(?:a|an|one)\s*$/i.test(before)) return 1
  return undefined
}
const parseFarmLocation = (text: string): string | undefined => {
  const match = text.normalize('NFKC').match(/\b(?:in|at|near)\s+([A-Za-z][A-Za-z0-9 .'-]{1,60})\s*$/i)
  const location = match?.[1]?.replace(/[,.!? ]+$/, '').trim()
  return location && !/^(?:my farm|the farm|there)$/i.test(location) ? location : undefined
}
const parseFarmName = (text: string, vocabulary: VoiceCropTerminology | null): string | undefined => {
  const named = text.match(/\b(?:farm\s+)?(?:named|called|name\s+is)\s+(.+?)(?=,|\b(?:in|at|near)\s+|$)/i)
  let name = named?.[1] ?? text.replace(/^\s*(?:please\s+)?(?:add|create|register|record|start|new)\s+(?:a\s+|my\s+|another\s+)?farm\b/i, '')
  const numberWords = Object.keys(vocabulary?.numberWords ?? {}).sort((a, b) => b.length - a.length).map(word => word.replace(/ /g, '\\s+')).join('|')
  const units = [...(vocabulary?.areaUnits ?? []), 'acre', 'acres', 'hectare', 'hectares', 'acer', 'acers'].join('|')
  if (units) name = name.replace(new RegExp('\\b(?:\\d+(?:\\.\\d+)?' + (numberWords ? '|' + numberWords : '') + ')\\s*(?:' + units + ')\\b', 'ig'), ' ')
  name = name.replace(/\b(?:with|having|area|land)\b/ig, ' ')
    .replace(/\b(?:in|at|near)\s+.+$/i, ' ')
    .replace(/[,.!?]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!name || /^(?:with|of|for|a|an|my|new|farm|please|another)$/i.test(name)) return undefined
  return name.length > 100 ? name.slice(0, 100).trim() : name
}
const formatTurnTimestamp = (value: Date | string = new Date()) => {
  const date = value instanceof Date ? value : new Date(value)
  const pad = (part: number) => String(part).padStart(2, '0')
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' +
    pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds())
}

const parseWeeksAgo = (text: string, vocabulary: VoiceCropTerminology | null): number | undefined => {
  const match = text.normalize('NFKC').toLocaleLowerCase().match(/\b(?:last|past|about|around)?\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+weeks?\s*(?:ago|back|now)?\b/i)
  if (!match) return undefined
  const raw = match[1].toLocaleLowerCase()
  const weeks = Number(raw) || vocabulary?.numberWords[raw] || 0
  return weeks > 0 && weeks <= 104 && /\b(last|past|ago|back|sown|sowed|planted|planting|transplanted)\b/i.test(text) ? weeks : undefined
}
const hasSowingDate = (text: string, vocabulary: VoiceCropTerminology | null) =>
  parseWeeksAgo(text, vocabulary) !== undefined ||
  /\b(?:sown|sowed|planted|planting|transplanted)\s+(?:today|yesterday)\b|\b(?:sowing|planting) date\s+(?:is\s+)?unknown\b/i.test(text)
const isUnknownAnswer = (text: string) => /\b(?:i\s+)?(?:do not know|don't know|dont know|not sure|unknown|skip)\b/i.test(text.trim())
const areaQuestion = 'How much land is planted with this crop? Please say the amount, for example “one acre” or “two acres”. If you are not sure, say “I don’t know”.'
const dateQuestion = 'When was this crop sown? You can say “today”, “yesterday”, “five weeks ago”, or “I don’t know”.'
const nextMissingPlantingPhase = (draft: Pick<VoiceCropIntakeDraft, 'area' | 'areaUnknown' | 'content' | 'sowingDateUnknown'>, vocabulary: VoiceCropTerminology | null): VoiceCropIntakeDraft['phase'] => {
  if (draft.area === undefined && !draft.areaUnknown) return 'NEEDS_AREA'
  if (!draft.sowingDateUnknown && !hasSowingDate(draft.content, vocabulary)) return 'NEEDS_DATE'
  return 'PREVIEW'
}

const appendSentence = (content: string, sentence: string) =>
  content.trim().replace(/[. ]+$/, '') + '. ' + sentence.trim().replace(/^[. ]+|[. ]+$/g, '') + '.'
const replaceSowingDateInText = (content: string, normalizedDate: string) => {
  const age = /\b(?:sown|sowed|planted|planting|transplanted)\s+(?:(?:last|past|about|around)\s+)?(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:weeks?|days?)\s*(?:ago|back|now)?\b/i
  const calendarDate = /\b(?:sown|sowed|planted|planting|transplanted)\s+(?:today|yesterday)\b/i
  const withoutOldDate = content.replace(age, '').replace(calendarDate, '').replace(/\b(?:sowing|planting) date\s+(?:is\s+)?unknown\b/ig, '').trim()
  return appendSentence(withoutOldDate, 'Sown ' + normalizedDate)
}
const replaceCropInText = (content: string, oldCrop: string | undefined, nextCrop: string) => {
  if (oldCrop) {
    const pattern = new RegExp('\\b' + oldCrop.replace(/ /g, '\\s+') + '\\b', 'i')
    if (pattern.test(content)) return content.replace(pattern, nextCrop)
  }
  return appendSentence(content, 'Crop: ' + nextCrop)
}
const replaceAreaInText = (content: string, area: number, unit: string, vocabulary: VoiceCropTerminology | null) => {
  if (!vocabulary) return content
  const numberWords = Object.keys(vocabulary.numberWords).join('|')
  const areaUnits = [...vocabulary.areaUnits, 'acer', 'acers'].join('|')
  const pattern = new RegExp('\\b(\\d+(?:\\.\\d+)?|' + numberWords + ')\\s*(' + areaUnits + ')\\b', 'i')
  const normalizedUnit = unit.toLocaleLowerCase().startsWith('acer') ? (area === 1 ? 'acre' : 'acres') : unit
  const replacement = String(area) + ' ' + normalizedUnit
  return pattern.test(content) ? content.replace(pattern, replacement) : appendSentence(content, 'Area ' + replacement)
}
const cropPreviewText = (draft: VoiceCropIntakeDraft) => [
  'Planting draft — nothing has been saved yet.',
  'Farm: ' + (draft.farmName ?? 'not selected'),
  'Crop: ' + (draft.cropName ?? 'not identified'),
  draft.area === undefined
    ? draft.areaUnknown ? 'Area: not recorded (you said you do not know)' : 'Area: not provided'
    : 'Area: ' + draft.area + ' ' + (draft.unit ?? 'unit not specified'),
  'Season: not specified. Status: Sown. Planting date: ' + (
    draft.sowingDateUnknown ? 'not recorded (you said you do not know)' :
    draft.weeksAgo ? 'approximately ' + draft.weeksAgo + ' weeks ago (estimated)' :
    /\byesterday\b/i.test(draft.content) ? 'yesterday' :
    /\btoday\b/i.test(draft.content) ? 'today' : 'not provided'
  ) + '.',
  'Fertilizer: ' + (draft.fertilizer ?? (draft.content.toLocaleLowerCase().includes('npk') ? 'NPK' : draft.content.toLocaleLowerCase().includes('fertilizer') ? 'mentioned' : 'not stated')),
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
  const [lang,setLang] = useState(() => {
    const browserLocale = typeof navigator !== 'undefined' ? navigator.language : 'en-IN'
    return LANGUAGES.find(([code]) => code.toLowerCase() === browserLocale.toLowerCase()
      || code.slice(0, 2).toLowerCase() === browserLocale.slice(0, 2).toLowerCase())?.[0] ?? 'en-IN'
  })
  const [transcript,setTranscript] = useState('')
  const [message,setMessage] = useState('Open Voice Agent and start speaking. I will listen between turns until you press Stop.')
  const [turns,setTurns] = useState<VoiceTurn[]>([])
  const turnId = useRef(0)
  // Monotonic epoch invalidates any response that outlives an interruption.
  const turnEpoch = useRef(0)
  const [unsupported,setUnsupported] = useState(false)
  const rec = useRef<Recognition|null>(null)
  // A voice session remains active across farmer turns until the farmer presses Stop.
  const voiceSessionActive = useRef(false)
  const resumeListening = useRef<(() => void) | null>(null)
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
  const [recordCreationDraft, setRecordCreationDraft] = useState<VoiceRecordCreationDraft | null>(null)
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
    setRecordCreationDraft(null)
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
        at: formatTurnTimestamp(item.createdAt),
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
      const successMessage = applied.created
        ? `${applied.targetEntityType} record created through its authorized module service; ${applied.appliedCandidateIds?.length ?? 1} confirmed field draft(s) were applied and audit-recorded.`
        : `${applied.targetEntityType} field ${applied.targetFieldId} updated through its authorized module service and audit-recorded.`
      setMessage(refreshed
        ? successMessage
        : 'The authorized record operation succeeded and was audited, but the refreshed preview could not be loaded.')
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

  const confirmFactDraftGroup = async (sessionId: string) => {
    if (!accessToken || !conversationId.current) return
    const group = factDrafts.filter(draft => draft.sessionId === sessionId && !draft.targetEntityId)
    if (!group.length) {
      setMessage('I could not find the complete record draft group. Reload the saved drafts before continuing.')
      return
    }
    const invalid = group.find(draft => {
      const validation = draft.validationResult && typeof draft.validationResult === 'object'
        ? draft.validationResult as { valid?: boolean }
        : {}
      return validation.valid !== true
    })
    if (invalid) {
      setMessage('At least one field needs correction before the record can be confirmed. Review the validation message on each field; nothing has been created.')
      return
    }
    const pending = group.filter(draft => ['VALIDATION_PENDING', 'AWAITING_CONFIRMATION'].includes(draft.status))
    setDraftBusy(true)
    try {
      for (const draft of pending) {
        await api.confirmAiFactCandidate(accessToken, conversationId.current, draft.id, draft.previewHash)
      }
      const [candidates, history] = await Promise.all([
        api.getAiFactCandidates(accessToken, conversationId.current),
        api.getAiConversationHistory(accessToken, conversationId.current),
      ])
      setFactDrafts(candidates)
      setDraftEvidence(Object.fromEntries(history.map(item => [item.id, item.content])))
      setMessage('All ' + group.length + ' fields are confirmed. No record has been created yet. Choose Apply confirmed on one field to create the complete record through its authorized module service.')
    } catch {
      try {
        const [candidates, history] = await Promise.all([
          api.getAiFactCandidates(accessToken, conversationId.current),
          api.getAiConversationHistory(accessToken, conversationId.current),
        ])
        setFactDrafts(candidates)
        setDraftEvidence(Object.fromEntries(history.map(item => [item.id, item.content])))
      } catch {
        // Preserve the confirmation failure message.
      }
      setMessage('I could not confirm every field. No record was created. Reload the drafts and review which fields remain awaiting confirmation.')
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
    setTurns(previous => [...previous, { id: ++turnId.current, speaker: 'Krishi' as const, text, at: formatTurnTimestamp() }].slice(-60))
    const resumeAfterReply = () => {
      if (!voiceSessionActive.current || speechSuppressed.current) return
      window.setTimeout(() => {
        if (voiceSessionActive.current && !commandInFlight.current && !rec.current && !window.speechSynthesis?.speaking) {
          resumeListening.current?.()
        }
      }, 250)
    }
    if (spoken && !speechSuppressed.current && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text); u.lang = speechLanguage; u.rate = 1.08; u.pitch = 1.04
      u.onend = resumeAfterReply
      u.onerror = resumeAfterReply
      window.speechSynthesis.speak(u)
    } else {
      // Muted replies still return to listening mode without requiring another tap.
      resumeAfterReply()
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
    const baseDraft = {
      content, cropName, ...area,
      weeksAgo: parseWeeksAgo(content, cropTerminology),
      fertilizer: /\bnpk\b/i.test(content) ? 'NPK' : /\bfertilizer\b/i.test(content) ? 'Fertilizer mentioned' : undefined,
      sowingDateUnknown: /\b(?:sowing|planting) date\s+(?:is\s+)?unknown\b/i.test(content),
    }
    if (farms.length === 1) {
      const draft: VoiceCropIntakeDraft = {
        ...baseDraft, phase: 'PREVIEW', farms,
        farmId: farms[0].id, farmName: farms[0].name,
      }
      if (draft.area === undefined) {
        draft.phase = 'NEEDS_AREA'
        setIntakeDraft(draft)
        say(areaQuestion)
      } else if (!draft.sowingDateUnknown && !hasSowingDate(draft.content, cropTerminology)) {
        draft.phase = 'NEEDS_DATE'
        setIntakeDraft(draft)
        say(dateQuestion)
      } else {
        setIntakeDraft(draft)
        say(cropPreviewText(draft))
      }
      return
    }
    const draft: VoiceCropIntakeDraft = { ...baseDraft, phase: 'NEEDS_FARM', farms }
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
      // If the farmer volunteers more information while answering, merge it into the same draft.
      const spokenCrop = findKnownCrop(original, cropTerminology)
      if (spokenCrop && spokenCrop !== next.cropName) {
        next.content = replaceCropInText(next.content, next.cropName, spokenCrop)
        next.cropName = spokenCrop
      }
      const spokenArea = parseSpokenArea(original, cropTerminology)
      if (spokenArea.area !== undefined) {
        next.content = replaceAreaInText(next.content, spokenArea.area, spokenArea.unit ?? 'acres', cropTerminology)
        next.area = spokenArea.area
        next.unit = spokenArea.unit
        next.areaUnknown = false
      }
      const spokenWeeks = parseWeeksAgo(original, cropTerminology)
      if (spokenWeeks !== undefined) {
        next.content = replaceSowingDateInText(next.content, spokenWeeks + ' weeks ago')
        next.weeksAgo = spokenWeeks
        next.sowingDateUnknown = false
      } else if (/\btoday\b/i.test(q) || /\byesterday\b/i.test(q)) {
        const dateWord = /\byesterday\b/i.test(q) ? 'yesterday' : 'today'
        next.content = replaceSowingDateInText(next.content, dateWord)
        next.weeksAgo = undefined
        next.sowingDateUnknown = false
      }
      if (/\bnpk\b/i.test(q)) {
        if (!/\bnpk\b/i.test(next.content)) next.content = appendSentence(next.content, 'NPK fertilizer')
        next.fertilizer = 'NPK'
      }
      next.phase = nextMissingPlantingPhase(next, cropTerminology)
      setIntakeDraft(next)
      say(next.phase === 'NEEDS_AREA' ? areaQuestion : next.phase === 'NEEDS_DATE' ? dateQuestion : cropPreviewText(next))
      return
    }
    if (draft.phase === 'NEEDS_AREA') {
      const area = parseSpokenArea(original, cropTerminology)
      const next: VoiceCropIntakeDraft = { ...draft }
      if (area.area !== undefined) {
        next.content = replaceAreaInText(next.content, area.area, area.unit ?? 'acres', cropTerminology)
        next.area = area.area
        next.unit = area.unit
        next.areaUnknown = false
      } else if (isUnknownAnswer(q)) {
        next.areaUnknown = true
        next.content = appendSentence(next.content, 'Land area unknown')
      } else {
        say('I did not catch the land amount. Please say “one acre”, “two acres”, or “I don’t know”.')
        return
      }
      const spokenWeeks = parseWeeksAgo(original, cropTerminology)
      if (spokenWeeks !== undefined) {
        next.content = replaceSowingDateInText(next.content, spokenWeeks + ' weeks ago')
        next.weeksAgo = spokenWeeks
        next.sowingDateUnknown = false
      } else if (/\btoday\b/i.test(q) || /\byesterday\b/i.test(q)) {
        const dateWord = /\byesterday\b/i.test(q) ? 'yesterday' : 'today'
        next.content = replaceSowingDateInText(next.content, dateWord)
        next.weeksAgo = undefined
        next.sowingDateUnknown = false
      }
      if (/\bnpk\b/i.test(q)) {
        if (!/\bnpk\b/i.test(next.content)) next.content = appendSentence(next.content, 'NPK fertilizer')
        next.fertilizer = 'NPK'
      }
      next.phase = nextMissingPlantingPhase(next, cropTerminology)
      setIntakeDraft(next)
      say(next.phase === 'NEEDS_DATE' ? dateQuestion : cropPreviewText(next))
      return
    }
    if (draft.phase === 'NEEDS_DATE') {
      const next: VoiceCropIntakeDraft = { ...draft }
      if (/\btoday\b/i.test(q)) {
        next.content = replaceSowingDateInText(next.content, 'today')
        next.weeksAgo = undefined
        next.sowingDateUnknown = false
      } else if (/\byesterday\b/i.test(q)) {
        next.content = replaceSowingDateInText(next.content, 'yesterday')
        next.weeksAgo = undefined
        next.sowingDateUnknown = false
      } else {
        const weeksAgo = parseWeeksAgo(original, cropTerminology)
        if (weeksAgo !== undefined) {
          next.content = replaceSowingDateInText(next.content, original)
          next.weeksAgo = weeksAgo
          next.sowingDateUnknown = false
        } else if (isUnknownAnswer(q)) {
          next.content = appendSentence(next.content, 'Sowing date unknown')
          next.sowingDateUnknown = true
          next.weeksAgo = undefined
        } else {
          say('I did not catch the planting date. Please say “today”, “yesterday”, for example “five weeks ago”, or “I don’t know”.')
          return
        }
      }
      const spokenArea = parseSpokenArea(original, cropTerminology)
      if (spokenArea.area !== undefined) {
        next.content = replaceAreaInText(next.content, spokenArea.area, spokenArea.unit ?? 'acres', cropTerminology)
        next.area = spokenArea.area
        next.unit = spokenArea.unit
        next.areaUnknown = false
      }
      if (/\bnpk\b/i.test(q)) {
        if (!/\bnpk\b/i.test(next.content)) next.content = appendSentence(next.content, 'NPK fertilizer')
        next.fertilizer = 'NPK'
      }
      next.phase = 'PREVIEW'
      setIntakeDraft(next)
      say(cropPreviewText(next))
      return
    }
    if (/^(?:(?:today|date is today)\s+)?(?:confirm|confirm save|save|yes|yes save|okay|ok)(?:\s+(?:today|date is today))?[.! ]*$/i.test(q)) {
      await confirmCropIntake(draft)
      return
    }

    const next = { ...draft }
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
  const createRecordDraftCandidates = async (draft: VoiceRecordCreationDraft) => {
    const token = accessToken
    const id = conversationId.current
    if (!token || !id) {
      setRecordCreationDraft(null)
      say('Please sign in again before I can save a reviewable record draft. Nothing was created.')
      return
    }
    const fields = Object.entries(draft.fields)
    if (!fields.length) {
      setRecordCreationDraft(null)
      say('I do not have enough details to prepare a record draft. Nothing was created.')
      return
    }

    setDraftBusy(true)
    try {
      const moduleId = draft.kind === 'FARM' ? 'KK-FARM-001' : draft.kind === 'LIVESTOCK' ? 'KK-LIVESTOCK-001' : 'KK-MARKETPLACE-001'
      const targetEntityType = draft.kind === 'FARM' ? 'Farm' : draft.kind === 'LIVESTOCK' ? 'Livestock' : 'MarketplaceListing'
      const results = []
      for (const [targetFieldId, field] of fields) {
        results.push(await api.createAiFactCandidate(token, id, {
          targetModuleId: moduleId,
          targetEntityType,
          targetFieldId,
          evidenceMessageId: field.evidenceMessageId,
          proposedValue: field.value,
          sessionId: draft.sessionId,
        }))
      }
      const [candidates, history] = await Promise.all([
        api.getAiFactCandidates(token, id),
        api.getAiConversationHistory(token, id),
      ])
      setFactDrafts(candidates)
      setDraftEvidence(Object.fromEntries(history.map(item => [item.id, item.content])))
      setDraftReviewOpen(true)
      setRecordCreationDraft(null)
      const invalid = results.some(result => !result.validation.valid)
      say(invalid
        ? 'I saved the proposed ' + targetEntityType.toLocaleLowerCase() + ' fields for review, but one or more fields did not pass central validation. Open Review saved fact drafts to inspect them. Nothing was created.'
        : 'I prepared a ' + targetEntityType.toLocaleLowerCase() + ' draft with ' + fields.map(([field]) => field).join(', ') + '. Nothing has been created yet. Review the saved fact drafts and confirm each field, then choose Apply on one confirmed field to create the complete record.')
    } catch {
      setRecordCreationDraft(null)
      try {
        const [candidates, history] = await Promise.all([
          api.getAiFactCandidates(token, id),
          api.getAiConversationHistory(token, id),
        ])
        setFactDrafts(candidates)
        setDraftEvidence(Object.fromEntries(history.map(item => [item.id, item.content])))
        setDraftReviewOpen(true)
      } catch {
        // Keep the original save failure visible below.
      }
      say('I could not prepare every field of this record draft. No record was created or listing published. Review any saved draft fields before trying again.')
    } finally {
      setDraftBusy(false)
    }
  }

  const beginRecordCreationDraft = async (original: string, evidenceMessageId: string | null, epoch: number) => {
    if (!evidenceMessageId) {
      say('I could not link the request to its saved conversation message, so I will not prepare a record draft. Please try again.')
      return
    }
    const sessionId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : 'voice-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10)

    if (isFarmCreationRequest(original)) {
      const fields: VoiceRecordCreationDraft['fields'] = {}
      const name = parseFarmName(original, cropTerminology)
      const area = parseSpokenArea(original, cropTerminology)
      const location = parseFarmLocation(original)
      if (name) fields.name = { value: name, evidenceMessageId }
      if (area.area !== undefined) {
        fields.area = { value: area.area, evidenceMessageId }
        fields.unit = { value: area.unit ?? 'acres', evidenceMessageId }
      }
      if (location) fields.location = { value: location, evidenceMessageId }
      if (!name) {
        const draft: VoiceRecordCreationDraft = { kind: 'FARM', sessionId, phase: 'NEEDS_NAME', fields, farms: [] }
        setRecordCreationDraft(draft)
        say('What name should I give this farm? You can include its area and location in the same answer. Nothing will be created until you review and confirm the draft.')
        return
      }
      await createRecordDraftCandidates({ kind: 'FARM', sessionId, phase: 'NEEDS_NAME', fields, farms: [] })
      return
    }

    if (isMarketplaceCreationRequest(original)) {
      const token = accessToken
      if (!token) {
        say('Please sign in again before I can prepare a marketplace listing. Nothing was created or published.')
        return
      }
      let resources: VoiceMarketResource[]
      try {
        const [crops, livestock] = await Promise.all([api.crops(token), api.livestock(token)])
        resources = [
          ...crops.map((item) => ({ id: String(item.id ?? ''), name: String(item.name ?? '').trim(), resourceType: 'crop' as const })),
          ...livestock.map((item) => ({ id: String(item.id ?? ''), name: String(item.name ?? item.species ?? '').trim(), resourceType: 'livestock' as const })),
        ].filter((item) => item.id && item.name)
      } catch {
        say('I could not load the crops and livestock you are authorized to list. Nothing was created or published.')
        return
      }
      if (epoch !== turnEpoch.current) return
      if (!resources.length) {
        say('I could not find an existing crop or livestock record to attach to a listing. Register the resource first; nothing was created.')
        return
      }

      const fields: VoiceRecordCreationDraft['fields'] = {}
      const quantityMatch = original.match(/\b(\d+(?:\.\d+)?)\s*(kg|kgs|kilograms?|quintals?|tonnes?|tons?|bags?|units?)\b/i)
      if (quantityMatch) {
        fields.quantity = { value: Number(quantityMatch[1]), evidenceMessageId }
        fields.unit = { value: quantityMatch[2].toLocaleLowerCase(), evidenceMessageId }
      }
      const priceMatch = original.match(/₹\s*(\d+(?:\.\d+)?)/i) ?? original.match(/\b(?:rs\.?|rupees?)\s*(\d+(?:\.\d+)?)/i)
      if (priceMatch) {
        fields.price = { value: Number(priceMatch[1]), evidenceMessageId }
        fields.currency = { value: 'INR', evidenceMessageId }
      }
      const knownCrop = findKnownCrop(original, cropTerminology)?.toLocaleLowerCase()
      const knownSpecies = parseLivestockSpecies(original)?.toLocaleLowerCase()
      const matching = resources.filter((resource) => {
        const name = resource.name.toLocaleLowerCase()
        return original.toLocaleLowerCase().includes(name) ||
          (resource.resourceType === 'crop' && Boolean(knownCrop) && name.includes(knownCrop!)) ||
          (resource.resourceType === 'livestock' && Boolean(knownSpecies) && name.includes(knownSpecies!))
      })
      if (matching.length === 1) {
        const resource = matching[0]
        fields.resourceType = { value: resource.resourceType, evidenceMessageId }
        fields.resourceId = { value: resource.id, evidenceMessageId }
        fields.title = { value: resource.name + ' for sale', evidenceMessageId }
        await createRecordDraftCandidates({ kind: 'MARKETPLACE', sessionId, phase: 'NEEDS_RESOURCE', fields, farms: [], resources })
        return
      }
      const options = matching.length ? matching : resources
      setRecordCreationDraft({ kind: 'MARKETPLACE', sessionId, phase: 'NEEDS_RESOURCE', fields, farms: [], resources: options })
      say('Which crop or animal should I list? Say its name or number: ' + options.map((resource, index) => (index + 1) + ', ' + resource.name + ' (' + resource.resourceType + ')').join('; ') + '. Nothing has been created or published.')
      return
    }

    const token = accessToken
    if (!token) {
      say('Please sign in again before I can prepare a livestock record. Nothing was created.')
      return
    }
    let farms: VoiceFarm[]
    try {
      farms = (await api.farms(token))
        .map(item => ({
          id: String(item.id ?? ''),
          name: String(item.name ?? '').trim(),
          ...(typeof item.location === 'string' ? { location: item.location } : {}),
        }))
        .filter(item => item.id && item.name)
    } catch {
      say('I could not load the farms you are authorized to use. Nothing was created; please try again after checking your connection.')
      return
    }
    if (epoch !== turnEpoch.current) return
    if (!farms.length) {
      say('You do not have a farm available for this animal yet. Let us register your farm first, then I can record the livestock. Nothing was created.')
      return
    }

    const fields: VoiceRecordCreationDraft['fields'] = {}
    const species = parseLivestockSpecies(original)
    const count = parseLivestockCount(original, cropTerminology)
    const selectedFarm = farms.length === 1
      ? farms[0]
      : farms.find(farm => original.toLocaleLowerCase().includes(farm.name.toLocaleLowerCase()))
    if (selectedFarm) fields.farmId = { value: selectedFarm.id, evidenceMessageId }
    if (species) fields.species = { value: species, evidenceMessageId }
    if (count !== undefined) fields.count = { value: count, evidenceMessageId }
    const draft: VoiceRecordCreationDraft = {
      kind: 'LIVESTOCK',
      sessionId,
      phase: !selectedFarm ? 'NEEDS_FARM' : !species ? 'NEEDS_SPECIES' : 'NEEDS_COUNT',
      fields,
      farms,
    }
    if (!selectedFarm) {
      setRecordCreationDraft(draft)
      say('Which farm should this animal belong to? Say its name or its number: ' + farms.map((farm, index) => (index + 1) + ', ' + farm.name).join('; ') + '.')
      return
    }
    if (!species) {
      setRecordCreationDraft({ ...draft, phase: 'NEEDS_SPECIES' })
      say('What kind of animal should I record? You can say cow, buffalo, goat, sheep, poultry, pig or horse.')
      return
    }
    if (count === undefined) {
      setRecordCreationDraft({ ...draft, phase: 'NEEDS_COUNT' })
      say('How many ' + species.toLocaleLowerCase() + ' should I record? Please say a number.')
      return
    }
    await createRecordDraftCandidates(draft)
  }

  const handleRecordCreationTurn = async (
    original: string,
    q: string,
    draft: VoiceRecordCreationDraft,
    epoch: number,
  ) => {
    if (/^(cancel|cancel draft|discard|no|do not save|don't save|stop)$/i.test(q)) {
      setRecordCreationDraft(null)
      say('Record draft discarded. No record was created or listing published.')
      return
    }
    const evidenceMessageId = lastEvidenceMessageId.current
    if (!evidenceMessageId) {
      say('I could not link that answer to the saved conversation. Nothing was created; please repeat the answer.')
      return
    }
    const fields = { ...draft.fields }
    const addField = (field: string, value: unknown) => {
      fields[field] = { value, evidenceMessageId }
    }

    if (draft.kind === 'MARKETPLACE') {
      const resources = draft.resources ?? []
      const numberedResource = q.match(/^(?:item\s+|option\s+)?(\d+|first|second|third|fourth|fifth|one|two|three|four|five)\b/i)
      const ordinal: Record<string, number> = { first: 1, one: 1, second: 2, two: 2, third: 3, three: 3, fourth: 4, four: 4, fifth: 5, five: 5 }
      const selectedIndex = numberedResource ? Number(ordinal[numberedResource[1].toLocaleLowerCase()] ?? numberedResource[1]) - 1 : -1
      const resource = selectedIndex >= 0 ? resources[selectedIndex] : resources.find((item) => q.includes(item.name.toLocaleLowerCase()))
      if (!resource) {
        say('I could not match that to one of your crops or animals. Please say one of these names: ' + resources.map((item) => item.name).join(', ') + '.')
        return
      }
      addField('resourceType', resource.resourceType)
      addField('resourceId', resource.id)
      addField('title', resource.name + ' for sale')
      if (epoch !== turnEpoch.current) return
      await createRecordDraftCandidates({ ...draft, fields })
      return
    }

    if (draft.kind === 'FARM') {
      const name = parseFarmName(original, cropTerminology)
      if (!name) {
        say('Please tell me the farm name, for example “Green Valley”. You can also include its area or location.')
        return
      }
      addField('name', name)
      const area = parseSpokenArea(original, cropTerminology)
      if (area.area !== undefined) {
        addField('area', area.area)
        addField('unit', area.unit ?? 'acres')
      }
      const location = parseFarmLocation(original)
      if (location) addField('location', location)
      if (epoch !== turnEpoch.current) return
      await createRecordDraftCandidates({ ...draft, fields })
      return
    }

    if (draft.phase === 'NEEDS_FARM') {
      const numberedFarm = q.match(/^(?:farm\s+|option\s+)?(\d+|first|second|third|fourth|fifth|one|two|three|four|five)(?:\s+farm)?[.! ]*$/i)
      const ordinal: Record<string, number> = { first: 1, one: 1, second: 2, two: 2, third: 3, three: 3, fourth: 4, four: 4, fifth: 5, five: 5 }
      const index = numberedFarm ? Number(ordinal[numberedFarm[1].toLocaleLowerCase()] ?? numberedFarm[1]) - 1 : -1
      const farm = index >= 0 ? draft.farms[index] : draft.farms.find(item => q.includes(item.name.toLocaleLowerCase()))
      if (!farm) {
        say('I could not match that answer to a farm you can access. Please say one of these names: ' + draft.farms.map(item => item.name).join(', ') + '.')
        return
      }
      addField('farmId', farm.id)
    }

    if (!fields.species) {
      const species = parseLivestockSpecies(original)
      if (species) addField('species', species)
    }
    if (!fields.count) {
      const count = parseLivestockCount(original, cropTerminology) ?? parseNumberValue(original, cropTerminology)
      if (count !== undefined && count >= 1 && count <= 100000) addField('count', Math.floor(count))
    }
    if (!fields.species) {
      setRecordCreationDraft({ ...draft, phase: 'NEEDS_SPECIES', fields })
      say('What kind of animal should I record? You can say cow, buffalo, goat, sheep, poultry, pig or horse.')
      return
    }
    if (!fields.count) {
      setRecordCreationDraft({ ...draft, phase: 'NEEDS_COUNT', fields })
      say('How many ' + String(fields.species.value).toLocaleLowerCase() + ' should I record? Please say a number.')
      return
    }
    if (!fields.farmId) {
      setRecordCreationDraft({ ...draft, phase: 'NEEDS_FARM', fields })
      say('Which farm should this animal belong to? Say its name or its number: ' + draft.farms.map((farm, index) => (index + 1) + ', ' + farm.name).join('; ') + '.')
      return
    }
    if (epoch !== turnEpoch.current) return
    await createRecordDraftCandidates({ ...draft, fields })
  }

  const command = async (raw:string, source: 'TEXT' | 'VOICE' = 'TEXT') => {
    const original = raw.trim()
    const q = original.toLocaleLowerCase()
    if (!q || commandInFlight.current) return
    speechSuppressed.current = false
    commandInFlight.current = true
    const epoch = ++turnEpoch.current
    // Typed input temporarily pauses an active voice session; the session resumes after Krishi replies.
    if (source === 'TEXT' && rec.current) {
      const currentRecognition = rec.current
      rec.current = null
      currentRecognition.stop()
      setListening(false)
    }
    const controller = new AbortController()
    activeRequest.current = controller
    setTurns(previous => [...previous, { id: ++turnId.current, speaker: 'You' as const, text: original, at: formatTurnTimestamp() }].slice(-60))
    const turnLanguage = inferTextLanguage(original, lang)
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

    if (recordCreationDraft) {
      const savedId = await persistence
      if (controller.signal.aborted || epoch !== turnEpoch.current) return
      if (!savedId) {
        say('I could not save your answer, so the farm or livestock draft was not changed. Please try again.')
        return
      }
      await handleRecordCreationTurn(original, q, recordCreationDraft, epoch)
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

    if (isFarmCreationRequest(original) || isLivestockCreationRequest(original) || isMarketplaceCreationRequest(original)) {
      const savedId = await persistence
      if (controller.signal.aborted || epoch !== turnEpoch.current) return
      if (!savedId) {
        say('I could not save your request, so no farm or livestock draft was prepared. Please try again.')
        return
      }
      await beginRecordCreationDraft(original, lastEvidenceMessageId.current, epoch)
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
      voiceSessionActive.current = false
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
    voiceSessionActive.current = false
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
    if (!Ctor) { voiceSessionActive.current = false; setUnsupported(true); say('Speech recognition is unavailable in this browser. You can type a command instead.'); return }
    voiceSessionActive.current = true
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
          const detectedLanguage = inferTextLanguage(finalText.trim(), lang)
          // Learn from the recognized script and use it for the reply and next turn.
          // Native browser ASR still uses a locale for its first recognition pass.
          setLang(detectedLanguage)
          const normalized = finalText.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
          const previous = lastVoiceSubmission.current
          const now = Date.now()
          if (previous && previous.text === normalized && now - previous.at < 5000) {
            // Ignore a duplicate transcript, but keep the voice session alive.
            submitted = false
            r.stop()
            return
          }
          lastVoiceSubmission.current = { text: normalized, at: now }
          setListening(false)
          r.stop()
          void command(finalText.trim(), 'VOICE')
        }
      }
      r.onerror = e => {
        setListening(false)
        if (rec.current === r) rec.current = null
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') voiceSessionActive.current = false
        if (e.error !== 'aborted') say(e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? 'Microphone access was denied. Allow it in browser settings to use voice.'
          : 'I could not hear that clearly. I will listen again after this message; you can also try speaking a little slower.')
      }
      r.onend = () => {
        if (rec.current === r) rec.current = null
        setListening(false)
        // Browser recognition often ends after a pause. Keep the session alive unless Stop was pressed.
        if (voiceSessionActive.current && !submitted && !commandInFlight.current) {
          window.setTimeout(() => {
            if (voiceSessionActive.current && !commandInFlight.current && !rec.current) resumeListening.current?.()
          }, 350)
        }
      }
      rec.current = r; setTranscript(''); setListening(true); setMessage('Listening… speak naturally. Say “stop” or press Stop whenever you want to pause.'); r.start()
    } catch { voiceSessionActive.current = false; setListening(false); say('Could not start the microphone. Check browser permissions and try again.') }
  }
  useEffect(() => {
    resumeListening.current = listen
  })
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
          {factDrafts.length === 0 ? <p className="text-xs text-muted-foreground">No saved fact drafts in this conversation.</p> : factDrafts.map((draft, index) => {
            const validation = draft.validationResult && typeof draft.validationResult === 'object'
              ? draft.validationResult as { valid?: boolean; errors?: string[] }
              : {}
            const canConfirm = validation.valid === true && ['VALIDATION_PENDING','AWAITING_CONFIRMATION'].includes(draft.status)
            const supportsNewRecord = !draft.targetEntityId && Boolean(draft.sessionId) && ['Farm','Crop','Livestock','MarketplaceListing'].includes(draft.targetEntityType ?? '')
            const canApply = draft.status === 'CONFIRMED' && (Boolean(draft.targetEntityId) || supportsNewRecord)
            const groupDrafts = draft.sessionId ? factDrafts.filter(item => item.sessionId === draft.sessionId && !item.targetEntityId) : []
            const firstGroupDraft = supportsNewRecord && factDrafts.findIndex(item => item.sessionId === draft.sessionId && !item.targetEntityId) === index
            const canConfirmGroup = firstGroupDraft && groupDrafts.some(item => ['VALIDATION_PENDING','AWAITING_CONFIRMATION'].includes(item.status))
            const canReject = ['DETECTED','NORMALIZED','VALIDATION_PENDING','CONFLICT','AWAITING_CONFIRMATION'].includes(draft.status)
            const value = typeof draft.proposedValue === 'string' ? draft.proposedValue : JSON.stringify(draft.proposedValue)
            const evidence = draft.evidenceReference ? draftEvidence[draft.evidenceReference] : undefined
            return <article key={draft.id} className="space-y-2 rounded-lg border p-2">
              <div className="flex items-start justify-between gap-2"><p className="break-words text-xs font-semibold">{draft.targetEntityType ?? draft.moduleId}.{draft.targetFieldId ?? 'field'}</p><span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px]">{draft.status}</span></div>
              <p className="break-words text-sm">{value}</p>
              <p className="text-[11px] text-muted-foreground">Source: {evidence ? `“${evidence}”` : 'Original user message unavailable'}</p>
              {validation.valid === false && <div className="rounded bg-destructive/10 p-2 text-[11px]">{(validation.errors ?? ['Central validation failed.']).join(' ')}</div>}
              <div className="flex flex-wrap gap-2">
                {canConfirmGroup && <button type="button" disabled={draftBusy} onClick={() => void confirmFactDraftGroup(draft.sessionId!)} className="h-8 w-full rounded-lg border border-primary px-2 text-xs font-semibold disabled:opacity-40">Confirm all fields in this record</button>}
                <button type="button" disabled={draftBusy || !canConfirm} onClick={() => void confirmFactDraft(draft)} className="h-8 min-w-0 flex-1 rounded-lg bg-primary px-2 text-xs font-semibold text-primary-foreground disabled:opacity-40">Confirm draft</button>
                {canApply && <button type="button" disabled={draftBusy} onClick={() => void applyFactDraft(draft)} className="h-8 flex-1 rounded-lg border px-2 text-xs disabled:opacity-40">Apply confirmed</button>}
                <button type="button" disabled={draftBusy || !canReject} onClick={() => void rejectFactDraft(draft)} className="h-8 rounded-lg border px-2 text-xs disabled:opacity-40">Reject</button>
              </div>
            </article>
          })}
        </section>}
        <p className="text-[11px] text-muted-foreground" aria-live="polite">Language analysis: automatic | Current detected language: {LANGUAGES.find(([code]) => code === lang)?.[1] ?? 'Detecting from speech'}. No language selection needed.</p>
        <div aria-live="polite" className="min-h-12 rounded-lg bg-muted/60 p-2 text-xs"><p>{message}</p>{transcript&&<p className="mt-2 border-t pt-2 text-muted-foreground">Heard: {transcript}</p>}</div>
        <div className="flex gap-2"><button type="button" onClick={listen} className={`flex h-9 flex-1 items-center justify-center gap-2 rounded-lg text-xs font-semibold ${listening?'border border-destructive bg-background text-destructive':'bg-primary text-primary-foreground'}`}>{listening?<MicOff size={17}/>:<Mic size={17}/>} {listening?'Stop listening':'Speak'}</button><button type="button" aria-label={spoken?'Mute spoken replies':'Enable spoken replies'} onClick={()=>{setSpoken(v=>!v);if(spoken)window.speechSynthesis?.cancel()}} className="flex size-9 items-center justify-center rounded-lg border">{spoken?<Volume2 size={17}/>:<VolumeX size={17}/>}</button><button type="button" onClick={stopConversation} aria-label="Stop conversation" title="Stop listening, generation and speech" className="flex size-9 items-center justify-center rounded-lg border text-destructive"><Square size={15}/></button></div>
        <button type="button" disabled={draftBusy} onClick={() => void loadFactDrafts()} className="h-8 w-full rounded-lg border text-xs disabled:opacity-40">{draftBusy ? 'Loading drafts…' : 'Review saved fact drafts'}</button>
        <form onSubmit={e=>{e.preventDefault();command(transcript, 'TEXT')}} className="flex gap-2"><input aria-label="Type a voice command" value={transcript} onChange={e=>setTranscript(e.target.value)} placeholder="Or type: show my farms" className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-2 text-xs"/><button type="submit" className="rounded-lg border px-2 text-xs">Go</button></form>
        {unsupported&&<p className="text-xs text-muted-foreground">Speech recognition is not available in this browser; typed commands still work.</p>}
        <p className="text-[9px] leading-snug text-muted-foreground">Opening Voice Agent starts listening when browser permission allows. Listening pauses while Krishi speaks and resumes after each reply until you press Stop. Browser speech recognition may use its provider. Local AI is evaluation-only; cloud fallback is off. Farm and crop changes require review, confirmation and module authorization.</p>
      </div></section>}
    <button type="button" onClick={()=>{if(open){stopConversation();setOpen(false)}else{setOpen(true);voiceSessionActive.current=true;listen()}}} aria-label={open?'Minimize voice assistant':'Open voice assistant'} title="Voice assistant — open and start speaking" className="flex h-10 items-center gap-2 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-lg"><Mic size={19}/><span>Voice Agent</span><ChevronUp size={16} className={open?'rotate-180 transition-transform':'transition-transform'}/></button>
  </div>
}
