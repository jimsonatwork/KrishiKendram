import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Volume2, VolumeX, X, ChevronUp, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api, type AiFactCandidate } from '../../lib/api'
import { useAuthStore } from '../../stores/auth.store'

type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean
  onresult: ((event: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onerror: ((event: { error?: string }) => void) | null; onend: (() => void) | null
  start: () => void; stop: () => void
}
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
type VoiceTurn = { id: number; speaker: 'You' | 'Krishi'; text: string; at: string }
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
  const [unsupported,setUnsupported] = useState(false)
  const rec = useRef<Recognition|null>(null)
  const conversationId = useRef<string|null>(null)
  const conversationPromise = useRef<Promise<string>|null>(null)
  const [voiceIntents, setVoiceIntents] = useState<VoiceIntent[]>([])
  const [navigationPrefixes, setNavigationPrefixes] = useState<string[]>([])
  const [restrictedIntents, setRestrictedIntents] = useState<RestrictedVoiceIntent[]>([])
  const [intentManifestReady, setIntentManifestReady] = useState(false)
  const [factDrafts, setFactDrafts] = useState<AiFactCandidate[]>([])
  const [draftEvidence, setDraftEvidence] = useState<Record<string, string>>({})
  const [draftReviewOpen, setDraftReviewOpen] = useState(false)
  const [draftBusy, setDraftBusy] = useState(false)
  const lastEvidenceMessageId = useRef<string | null>(null)
  const admin = role === 'SUPER_ADMIN' && voiceIntents.some(intent => intent.access === 'SYSTEM_GOD')

  useEffect(() => {
    const w = window as SpeechWindow
    setUnsupported(!(w.SpeechRecognition || w.webkitSpeechRecognition))
    return () => { rec.current?.stop(); window.speechSynthesis?.cancel() }
  }, [])

  useEffect(() => {
    let active = true
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

  const persistUserMessage = async (
    content: string,
    source: 'TEXT' | 'VOICE',
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
            .createAiConversation(token, lang)
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
        lang,
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

  const say = (text:string) => {
    setMessage(text)
    setTurns(previous => [...previous, { id: ++turnId.current, speaker: 'Krishi' as const, text, at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }].slice(-60))
    if (spoken && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text); u.lang = lang; u.rate = 0.96
      window.speechSynthesis.speak(u)
    }
  }
  const command = async (raw:string, source: 'TEXT' | 'VOICE' = 'TEXT') => {
    const original = raw.trim()
    const q = original.toLocaleLowerCase()
    if (!q) return
    setTurns(previous => [...previous, { id: ++turnId.current, speaker: 'You' as const, text: original, at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }].slice(-60))
    const persistence = persistUserMessage(original, source)
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
      window.speechSynthesis?.cancel(); say('Okay, I stopped speaking.'); return
    }
    const token = accessToken
    if (!token) {
      void persistence
      say('Please sign in again before asking the AI assistant a question.')
      return
    }

    setMessage('Saving your question and checking the approved AI provider…')
    const id = await persistence
    if (!id) return

    try {
      const status = await api.getAiConversationStatus(token)
      if (!status.ready) {
        say(
          'Your question is saved in conversation history, but AI answers are currently unavailable because no approved, production-ready text-generation provider is installed. No cloud fallback was used.',
        )
        return
      }

      const response = await api.requestAiConversationResponse(
        token,
        id,
        original,
        lang,
      )
      say(response.message.content)
    } catch {
      say(
        'I could not obtain an AI answer. The approved provider may be unavailable, or the request may have failed. Your question remains in conversation history; no farm record was changed.',
      )
    }
  }
  const listen = () => {
    if (listening) { rec.current?.stop(); setListening(false); return }
    const w = window as SpeechWindow, Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!Ctor) { setUnsupported(true); say('Speech recognition is unavailable in this browser. You can type a command instead.'); return }
    try {
      const r = new Ctor(); r.lang = lang; r.continuous = false; r.interimResults = true
      r.onresult = e => {
        let finalText = '', partial = ''
        for (let i=0;i<e.results.length;i++) {
            if (e.results[i].isFinal) {
              finalText += e.results[i][0].transcript
            } else {
              partial += e.results[i][0].transcript
            }
          }
        setTranscript(finalText || partial)
        if (finalText.trim()) command(finalText, 'VOICE')
      }
      r.onerror = e => { setListening(false); say(e.error === 'not-allowed' ? 'Microphone access was denied. Allow it in browser settings to use voice.' : 'Voice input stopped. Please try again.') }
      r.onend = () => setListening(false)
      rec.current = r; setTranscript(''); setListening(true); setMessage('Listening… speak naturally.'); r.start()
    } catch { setListening(false); say('Could not start the microphone. Check browser permissions and try again.') }
  }
  return <div className="fixed bottom-4 right-3 z-[80] flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-2 sm:bottom-5 sm:right-5">
    {open && <section aria-label="KrishiKendram voice assistant" className="flex max-h-[calc(100dvh-6rem)] w-[min(20rem,calc(100vw-1.25rem))] flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-2xl">
      <header className="flex shrink-0 items-center justify-between border-b px-3 py-2"><div className="flex items-center gap-2"><span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkles size={18}/></span><div><p className="text-sm font-semibold">Krishi Voice Agent</p><p className="text-xs text-muted-foreground">{admin?'Administrator workspace':'Farm assistant'}</p></div></div><button type="button" aria-label="Close voice assistant" onClick={()=>{rec.current?.stop();setListening(false);setOpen(false)}} className="rounded-lg p-2 hover:bg-muted"><X size={16}/></button></header>
      <div className="min-h-0 space-y-2 overflow-y-auto p-3 text-xs"><div aria-label="Live conversation subtitles" aria-live="polite" className="max-h-36 space-y-2 overflow-y-auto rounded-lg border bg-background p-2">{turns.length===0?<p className="text-xs text-muted-foreground">Conversation subtitles will appear here. Both your words and the agent’s replies remain visible while this panel is open.</p>:turns.map(turn=><div key={turn.id} className={turn.speaker==='You'?'text-right':''}><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{turn.speaker} · {turn.at}</p><p className="break-words text-sm">{turn.text}</p></div>)}</div>
        {draftReviewOpen && <section aria-label="Fact draft review" className="space-y-2 rounded-lg border bg-background p-2">
          <div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold">Draft review</p><button type="button" className="text-xs text-muted-foreground underline" onClick={() => setDraftReviewOpen(false)}>Hide</button></div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">Confirmation approves only the exact proposal shown below. It does not write to the farm or other module. Applying a confirmed draft is a separate authorized workflow.</p>
          {factDrafts.length === 0 ? <p className="text-xs text-muted-foreground">No saved fact drafts in this conversation.</p> : factDrafts.map(draft => {
            const validation = draft.validationResult && typeof draft.validationResult === 'object'
              ? draft.validationResult as { valid?: boolean; errors?: string[] }
              : {}
            const canConfirm = validation.valid === true && ['VALIDATION_PENDING','AWAITING_CONFIRMATION'].includes(draft.status)
            const canReject = ['DETECTED','NORMALIZED','VALIDATION_PENDING','CONFLICT','AWAITING_CONFIRMATION'].includes(draft.status)
            const value = typeof draft.proposedValue === 'string' ? draft.proposedValue : JSON.stringify(draft.proposedValue)
            const evidence = draft.evidenceReference ? draftEvidence[draft.evidenceReference] : undefined
            return <article key={draft.id} className="space-y-2 rounded-lg border p-2">
              <div className="flex items-start justify-between gap-2"><p className="break-words text-xs font-semibold">{draft.targetEntityType ?? draft.moduleId}.{draft.targetFieldId ?? 'field'}</p><span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px]">{draft.status}</span></div>
              <p className="break-words text-sm">{value}</p>
              <p className="text-[11px] text-muted-foreground">Source: {evidence ? `“${evidence}”` : 'Original user message unavailable'}</p>
              {validation.valid === false && <div className="rounded bg-destructive/10 p-2 text-[11px]">{(validation.errors ?? ['Central validation failed.']).join(' ')}</div>}
              <div className="flex gap-2">
                <button type="button" disabled={draftBusy || !canConfirm} onClick={() => void confirmFactDraft(draft)} className="h-8 flex-1 rounded-lg bg-primary px-2 text-xs font-semibold text-primary-foreground disabled:opacity-40">Confirm draft</button>
                <button type="button" disabled={draftBusy || !canReject} onClick={() => void rejectFactDraft(draft)} className="h-8 rounded-lg border px-2 text-xs disabled:opacity-40">Reject</button>
              </div>
            </article>
          })}
        </section>}
        <label htmlFor="kk-voice-language" className="block text-xs font-medium text-muted-foreground">Spoken language</label>
        <select id="kk-voice-language" value={lang} onChange={e=>{setLang(e.target.value);try{localStorage.setItem('kk-voice-language',e.target.value)}catch{/* Language preference is optional. */}}} className="h-9 w-full rounded-lg border bg-background px-2 text-xs">{LANGUAGES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
        <div aria-live="polite" className="min-h-12 rounded-lg bg-muted/60 p-2 text-xs"><p>{message}</p>{transcript&&<p className="mt-2 border-t pt-2 text-muted-foreground">Heard: {transcript}</p>}</div>
        <div className="flex gap-2"><button type="button" onClick={listen} className={`flex h-9 flex-1 items-center justify-center gap-2 rounded-lg text-xs font-semibold ${listening?'bg-destructive text-destructive-foreground':'bg-primary text-primary-foreground'}`}>{listening?<MicOff size={17}/>:<Mic size={17}/>} {listening?'Stop listening':'Speak'}</button><button type="button" aria-label={spoken?'Mute spoken replies':'Enable spoken replies'} onClick={()=>{setSpoken(v=>!v);if(spoken)window.speechSynthesis?.cancel()}} className="flex size-9 items-center justify-center rounded-lg border">{spoken?<Volume2 size={17}/>:<VolumeX size={17}/>}</button></div>
        <button type="button" disabled={draftBusy} onClick={() => void loadFactDrafts()} className="h-8 w-full rounded-lg border text-xs disabled:opacity-40">{draftBusy ? 'Loading drafts…' : 'Review saved fact drafts'}</button>
        <form onSubmit={e=>{e.preventDefault();command(transcript, 'TEXT')}} className="flex gap-2"><input aria-label="Type a voice command" value={transcript} onChange={e=>setTranscript(e.target.value)} placeholder="Or type: show my farms" className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-2 text-xs"/><button type="submit" className="rounded-lg border px-2 text-xs">Go</button></form>
        {unsupported&&<p className="text-xs text-muted-foreground">Speech recognition is not available in this browser; typed commands still work.</p>}
        <p className="text-[11px] leading-relaxed text-muted-foreground">Microphone stays off until you press Speak. Browser speech recognition may use the browser provider. The local model is enabled in evaluation mode, not production-ready; cloud fallback is disabled. Answers are advisory and cannot write records directly. Crop-list questions can use your authorized crop records. Saved proposals can be reviewed and confirmed, but applying changes still requires each module's normal authorized workflow.</p>
      </div></section>}
    <button type="button" onClick={()=>setOpen(v=>!v)} aria-label={open?'Minimize voice assistant':'Open voice assistant'} title="Voice assistant" className="flex h-10 items-center gap-2 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-lg"><Mic size={19}/><span>Voice Agent</span><ChevronUp size={16} className={open?'rotate-180 transition-transform':'transition-transform'}/></button>
  </div>
}
