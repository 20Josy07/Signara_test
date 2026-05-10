import { useCallback, useEffect, useRef, useState } from 'react'
import Logo from './Logo.jsx'
import AvatarPlayer from './AvatarPlayer.jsx'
import TextInputPanel from './TextInputPanel.jsx'
import SignChips from './SignChips.jsx'
import { translateText } from '../utils/translateText.js'
import {
  getCurrentAvatar,
  getSignSrc,
  normalizeSign,
  setCurrentAvatar
} from '../utils/signMap.js'

/**
 * TranslationScreen
 *
 * Coexisting playback paths:
 *   TYPED:  user submits text -> translateText() -> avatarRef.replace(signs)
 *   VOZ EN VIVO:
 *     interim word -> avatarRef.queue(word) (instant)
 *     final phrase -> translateText() polish + diff-queue any missing signs
 *
 * Includes a global "Limpiar" button (header) that resets:
 *   - avatar (clear queue, stop video, hide both buffers)
 *   - voice  (stop mic, clear input, reset word tracker)
 *   - state  (chips, original text, active sign, busy, liveMode)
 *
 * The avatar character itself can be swapped via the "Personalizar" button
 * rendered below the avatar by <AvatarPlayer />.
 */
export default function TranslationScreen({
  initialMode = 'text',
  avatarId: initialAvatarId,
  onAvatarChange,
  onBack,
  onHome
}) {
  const [originalText, setOriginalText] = useState('')
  const [signs, setSigns] = useState([])
  const [activeSign, setActiveSign] = useState(null)
  const [busy, setBusy] = useState(false)
  const [liveMode, setLiveMode] = useState(false)
  const [avatarId, setAvatarId] = useState(initialAvatarId || getCurrentAvatar().id)

  const avatarRef = useRef(null)
  const inputRef = useRef(null)
  const liveQueuedRef = useRef([])
  // Buffer for the previous live word so we can detect 2-word compound signs
  // in real time (p.ej. "tengo sed" -> TENGO_SED, "por favor" -> POR_FAVOR,
  // "te amo" -> TE_AMO, "como estas" -> COMO_ESTAS).
  const pendingWordRef = useRef('')

  // Sync the prop-driven avatar (from App's localStorage) into local state.
  useEffect(() => {
    if (initialAvatarId && initialAvatarId !== avatarId) {
      setAvatarId(initialAvatarId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAvatarId])

  // Keep the module-level "active avatar" in sync with React state so that
  // getSignSrc() resolves to the right folder for both typed and live flows.
  useEffect(() => {
    setCurrentAvatar(avatarId)
  }, [avatarId])

  // --- Reset helpers --------------------------------------------------------
  const resetVoice = useCallback(() => {
    if (inputRef.current) inputRef.current.clear()
  }, [])

  const resetAvatar = useCallback(() => {
    if (avatarRef.current) avatarRef.current.clear()
  }, [])

  const resetState = useCallback(() => {
    setOriginalText('')
    setSigns([])
    setActiveSign(null)
    setBusy(false)
    setLiveMode(false)
    liveQueuedRef.current = []
    pendingWordRef.current = ''
  }, [])

  const handleReset = useCallback(() => {
    console.log('[TranslationScreen] handleReset()')
    resetVoice()
    resetAvatar()
    resetState()
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
  }, [resetVoice, resetAvatar, resetState])

  const handleAvatarChange = useCallback((id) => {
    console.log('[TranslationScreen] avatar selected:', id)
    setCurrentAvatar(id)
    setAvatarId(id)
    if (avatarRef.current) avatarRef.current.clear()
    if (onAvatarChange) onAvatarChange(id)
  }, [onAvatarChange])

  // --- TYPED path -----------------------------------------------------------
  const handleSubmit = useCallback(async (text) => {
    setBusy(true)
    setOriginalText(text)
    setLiveMode(false)
    liveQueuedRef.current = []
    pendingWordRef.current = ''
    try {
      const result = await translateText(text)
      console.log('[TranslationScreen] translateText ->', result)
      setSigns(result)
      if (avatarRef.current) avatarRef.current.replace(result)
    } catch (e) {
      console.error('translateText failed:', e)
      setSigns([])
    } finally {
      setBusy(false)
    }
  }, [])

  // --- LIVE VOICE path ------------------------------------------------------
  // Para frases compuestas mantenemos pendingWordRef. Cuando llega una nueva
  // palabra:
  //   1. Probamos pendingWord + nueva  (ej: "tengo" + "sed" -> TENGO_SED).
  //      Si hay video, lo encolamos y limpiamos pending.
  //   2. Si no hay compuesto, probamos la palabra sola (ej: "hola" -> HOLA,
  //      "gracias" -> GRACIAS).
  //   3. Si no hay nada, guardamos la palabra como pending por si forma
  //      un compuesto con la siguiente.
  const handleLiveWord = useCallback((rawWord) => {
    const cleaned = String(rawWord || '').trim()
    if (!cleaned) return

    setLiveMode(true)
    setOriginalText((prev) => (prev ? prev + ' ' : '') + cleaned)

    const queueSign = (sign) => {
      setSigns((prev) => [...prev, sign])
      if (avatarRef.current) {
        avatarRef.current.queue(sign)
        liveQueuedRef.current.push(sign)
      }
    }

    // 1) Intento de seña compuesta con la palabra pendiente.
    if (pendingWordRef.current) {
      const compoundSign = normalizeSign(pendingWordRef.current + ' ' + cleaned)
      if (getSignSrc(compoundSign)) {
        console.log('LIVE WORD compound:', compoundSign)
        queueSign(compoundSign)
        pendingWordRef.current = ''
        return
      }
    }

    // 2) Intento de seña individual.
    const singleSign = normalizeSign(cleaned)
    if (getSignSrc(singleSign)) {
      console.log('LIVE WORD single:', singleSign)
      queueSign(singleSign)
      pendingWordRef.current = ''
      return
    }

    // 3) Sin coincidencia: guardamos la palabra por si forma un compuesto
    //    con la siguiente (ej: "tengo" -> espera "sed").
    pendingWordRef.current = cleaned
  }, [])

  const handleVoiceFinal = useCallback(async (text) => {
    if (!text) return
    try {
      const polished = await translateText(text)
      if (!polished || polished.length === 0) return
      setSigns(polished)

      const liveLeft = [...liveQueuedRef.current]
      for (const sign of polished) {
        const idx = liveLeft.indexOf(sign)
        if (idx !== -1) {
          liveLeft.splice(idx, 1)
          continue
        }
        if (avatarRef.current) avatarRef.current.queue(sign)
      }
    } catch (e) {
      console.warn('polish translateText failed:', e)
    } finally {
      liveQueuedRef.current = []
      pendingWordRef.current = ''
    }
  }, [])

  const handlePanelSubmit = useCallback((text) => {
    if (liveMode) handleVoiceFinal(text)
    else handleSubmit(text)
  }, [liveMode, handleVoiceFinal, handleSubmit])

  let activeIndex = -1
  if (activeSign) {
    for (let i = signs.length - 1; i >= 0; i--) {
      if (signs[i] === activeSign) { activeIndex = i; break }
    }
  }

  return (
    <section className="min-h-screen flex flex-col px-4 sm:px-6 py-6 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-medium">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Cambiar modo
        </button>

        <div className="flex items-center gap-2">
          <ResetButton onClick={handleReset} />
          <button onClick={onHome} className="flex items-center gap-2 group" title="Inicio">
            <span className="hidden sm:block text-xl font-extrabold gradient-text bg-white px-3 py-1 rounded-full shadow-soft">Signara</span>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/95 shadow-soft group-hover:shadow-glow transition">
              <Logo size={28} />
            </span>
          </button>
        </div>
      </header>

      <div className="animate-fade-up">
        <TextInputPanel
          ref={inputRef}
          initialMode={initialMode}
          onSubmit={handlePanelSubmit}
          onLiveWord={handleLiveWord}
          busy={busy}
        />
      </div>

      <div className="flex-1 flex items-center justify-center my-6 animate-fade-up">
        <AvatarPlayer
          ref={avatarRef}
          avatarId={avatarId}
          onAvatarChange={handleAvatarChange}
          onSign={setActiveSign}
          onFinish={() => setActiveSign(null)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-up">
        <div className="glass-card p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-signara-purple">Texto original</p>
          <p className="mt-2 text-signara-navy text-lg leading-relaxed min-h-[2.5rem]">
            {originalText ? originalText : <span className="italic text-signara-navy/40">Aun no has traducido nada.</span>}
          </p>
        </div>
        <div className="glass-card p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-signara-purple">Senas traducidas</p>
          <div className="mt-3">
            <SignChips signs={signs} activeIndex={activeIndex} />
          </div>
        </div>
      </div>

      <footer className="mt-6 text-center text-xs text-white/60">
        MVP - Streaming en tiempo real con datos simulados.
      </footer>
    </section>
  )
}

/**
 * ResetButton - shared "LIMPIAR" pill, prominent enough to spot but tucked
 * to the right side of the header so it never competes with the primary CTA.
 */
function ResetButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 text-white text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-white/40"
      title="Reiniciar todo"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5" />
      </svg>
      LIMPIAR
    </button>
  )
}
