import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Volume2, VolumeX, X, ChevronUp, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
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

      await api.appendAiConversationMessage(
        token,
        id,
        content,
        source,
        lang,
      )
      return id
    } catch {
      setMessage(
        'I could not save this conversation. Check your connection and sign-in, then try again.',
      )
      return null
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
      <div className="min-h-0 space-y-2 overflow-y-auto p-3 text-xs"><div aria-label="Live conversation subtitles" aria-live="polite" className="max-h-36 space-y-2 overflow-y-auto rounded-lg border bg-background p-2">{turns.length===0?<p className="text-xs text-muted-foreground">Conversation subtitles will appear here. Both your words and the agent’s replies remain visible while this panel is open.</p>:turns.map(turn=><div key={turn.id} className={turn.speaker==='You'?'text-right':''}><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{turn.speaker} · {turn.at}</p><p className="break-words text-sm">{turn.text}</p></div>)}</div><label htmlFor="kk-voice-language" className="block text-xs font-medium text-muted-foreground">Spoken language</label>
        <select id="kk-voice-language" value={lang} onChange={e=>{setLang(e.target.value);try{localStorage.setItem('kk-voice-language',e.target.value)}catch{/* Language preference is optional. */}}} className="h-9 w-full rounded-lg border bg-background px-2 text-xs">{LANGUAGES.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
        <div aria-live="polite" className="min-h-12 rounded-lg bg-muted/60 p-2 text-xs"><p>{message}</p>{transcript&&<p className="mt-2 border-t pt-2 text-muted-foreground">Heard: {transcript}</p>}</div>
        <div className="flex gap-2"><button type="button" onClick={listen} className={`flex h-9 flex-1 items-center justify-center gap-2 rounded-lg text-xs font-semibold ${listening?'bg-destructive text-destructive-foreground':'bg-primary text-primary-foreground'}`}>{listening?<MicOff size={17}/>:<Mic size={17}/>} {listening?'Stop listening':'Speak'}</button><button type="button" aria-label={spoken?'Mute spoken replies':'Enable spoken replies'} onClick={()=>{setSpoken(v=>!v);if(spoken)window.speechSynthesis?.cancel()}} className="flex size-9 items-center justify-center rounded-lg border">{spoken?<Volume2 size={17}/>:<VolumeX size={17}/>}</button></div>
        <form onSubmit={e=>{e.preventDefault();command(transcript, 'TEXT')}} className="flex gap-2"><input aria-label="Type a voice command" value={transcript} onChange={e=>setTranscript(e.target.value)} placeholder="Or type: show my farms" className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-2 text-xs"/><button type="submit" className="rounded-lg border px-2 text-xs">Go</button></form>
        {unsupported&&<p className="text-xs text-muted-foreground">Speech recognition is not available in this browser; typed commands still work.</p>}
        <p className="text-[11px] leading-relaxed text-muted-foreground">Microphone stays off until you press Speak. Browser speech recognition may use the browser provider. AI answers require an approved, production-ready provider; record changes remain disabled until server-side authorization, validation and confirmation are wired.</p>
      </div></section>}
    <button type="button" onClick={()=>setOpen(v=>!v)} aria-label={open?'Minimize voice assistant':'Open voice assistant'} title="Voice assistant" className="flex h-10 items-center gap-2 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-lg"><Mic size={19}/><span>Voice Agent</span><ChevronUp size={16} className={open?'rotate-180 transition-transform':'transition-transform'}/></button>
  </div>
}
