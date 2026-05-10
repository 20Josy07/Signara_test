import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import useVoiceInput from '../hooks/useVoiceInput.js'

/**
 * TextInputPanel  (forwardRef)
 *
 * Two emission flows:
 *   1. TYPED:  user writes -> Traducir -> onSubmit(text)
 *   2. STREAMING VOICE:
 *        - interim transcript -> emit each newly-completed word via onLiveWord
 *        - final phrase       -> onSubmit(text) for translateText() polish
 *
 * Imperative API (via ref):
 *   - clear()  : stop the mic if active, empty input, reset word tracker
 */
const TextInputPanel = forwardRef(function TextInputPanel(
  { initialMode = 'text', onSubmit, onLiveWord, busy = false },
  ref
) {
  const [value, setValue] = useState('')
  const inputRef = useRef(null)

  const onSubmitRef = useRef(onSubmit)
  const onLiveWordRef = useRef(onLiveWord)
  onSubmitRef.current = onSubmit
  onLiveWordRef.current = onLiveWord

  const liveEmittedRef = useRef([])

  function emitNewWords(allWords) {
    const prev = liveEmittedRef.current
    for (let i = prev.length; i < allWords.length; i++) {
      const w = allWords[i]
      if (!w) continue
      console.log('LIVE WORD:', w)
      if (onLiveWordRef.current) onLiveWordRef.current(w)
    }
    liveEmittedRef.current = allWords
  }

  function handleLive(text, isFinal) {
    const cleaned = String(text || '').trim()
    setValue(cleaned)
    const words = cleaned.split(/\s+/).filter(Boolean)
    if (isFinal) {
      emitNewWords(words)
      liveEmittedRef.current = []
    } else {
      const completeWords = words.slice(0, -1)
      emitNewWords(completeWords)
    }
  }

  const { listening, error, supported, start, stop } = useVoiceInput({
    lang: 'es-ES',
    continuous: true,
    onLiveTranscript: handleLive,
    onResult: (text) => {
      if (!text) return
      console.log('[TextInputPanel] final:', text)
      if (onSubmitRef.current) onSubmitRef.current(text)
    }
  })

  // Keep latest listening/stop accessible inside imperative handle without
  // recreating the handle every render.
  const listeningRef = useRef(listening)
  const stopRef = useRef(stop)
  listeningRef.current = listening
  stopRef.current = stop

  useImperativeHandle(ref, () => ({
    clear: () => {
      console.log('[TextInputPanel] clear()')
      if (listeningRef.current) {
        try { stopRef.current() } catch (_) {}
      }
      setValue('')
      liveEmittedRef.current = []
    },
    isListening: () => listeningRef.current,
    stopMic: () => { if (listeningRef.current) stopRef.current() }
  }))

  useEffect(() => {
    if (initialMode === 'voice' && supported && !listening) {
      const t = setTimeout(() => start(), 350)
      return () => clearTimeout(t)
    }
    if (initialMode === 'text' && inputRef.current) inputRef.current.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMode, supported])

  function submit(e) {
    if (e && e.preventDefault) e.preventDefault()
    const text = value.trim()
    if (!text || busy) return
    if (onSubmit) onSubmit(text)
  }

  function toggleMic() {
    if (!supported) return
    if (listening) {
      stop()
      liveEmittedRef.current = []
    } else {
      setValue('')
      liveEmittedRef.current = []
      start()
    }
  }

  const examples = ['Hola, ¿cómo estás?', 'Necesito ayuda', 'Tengo sed', 'Te amo']

  return (
    <form onSubmit={submit} className="w-full">
      <div className={'glass-card flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-3 ' + (listening ? 'ring-2 ring-signara-purple/60 ring-offset-2 ring-offset-transparent' : '')}>
        <button
          type="button"
          onClick={toggleMic}
          disabled={!supported}
          title={supported ? (listening ? 'Detener voz en vivo' : 'Activar voz en vivo') : 'Tu navegador no soporta reconocimiento de voz'}
          className={
            'relative flex-shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-signara-purple/30 ' +
            (listening
              ? 'bg-signara-text text-white shadow-glow'
              : 'bg-white text-signara-navy border border-signara-lilac/60 hover:border-signara-purple') +
            (!supported ? ' opacity-40 cursor-not-allowed' : '')
          }
          aria-pressed={listening}
        >
          {listening && <span className="absolute inset-0 rounded-full bg-signara-purple/40 animate-pulse-ring" />}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="3" width="6" height="12" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
        </button>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={listening ? 'Habla… las señas se reproducen al instante' : 'Escribe en español o pulsa el micrófono…'}
          className="flex-1 bg-transparent outline-none text-signara-navy placeholder:text-signara-navy/40 text-base sm:text-lg px-2 py-2"
          disabled={busy}
        />

        {!listening && (
          <button
            type="submit"
            disabled={busy || !value.trim()}
            className="btn-primary py-2.5 px-5 text-sm flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? <Spinner /> : (
              <>
                Traducir
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        )}

        {listening && (
          <span className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-signara-text text-white text-xs font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            EN VIVO
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/80">
        {listening ? (
          <span className="opacity-90">Cada palabra reconocida se traduce y reproduce al instante.</span>
        ) : (
          <>
            <span className="opacity-70">Prueba:</span>
            {examples.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setValue(ex)}
                className="px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 transition"
              >
                {ex}
              </button>
            ))}
          </>
        )}
        {!supported && <span className="ml-auto text-yellow-100/90">Voz no disponible en este navegador.</span>}
        {error && error !== 'no-speech' && error !== 'aborted' && (
          <span className="ml-auto text-red-100">Error de voz: {error}</span>
        )}
      </div>
    </form>
  )
})

export default TextInputPanel

function Spinner() {
  return (
    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="white" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
