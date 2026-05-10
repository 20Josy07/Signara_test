import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * useVoiceInput
 * Wrapper around the Web Speech API tuned for Spanish input.
 *
 * Two callbacks for the streaming use-case:
 *   - onLiveTranscript(text)   fires continuously with the in-progress
 *                              interim transcription. Used to drive the
 *                              real-time word queue.
 *   - onResult(text)           fires once per finalised utterance.
 *
 * `continuous: true` keeps the recogniser open and re-arms on `onend`.
 */
export default function useVoiceInput({
  lang = 'es-ES',
  onResult,
  onLiveTranscript,
  continuous = true
} = {}) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [error, setError] = useState(null)

  const recognitionRef = useRef(null)
  const wantListenRef = useRef(false)
  const onResultRef = useRef(onResult)
  const onLiveRef = useRef(onLiveTranscript)
  onResultRef.current = onResult
  onLiveRef.current = onLiveTranscript

  const SR =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null
  const supported = Boolean(SR)

  useEffect(() => {
    if (!supported) return

    const recognition = new SR()
    recognition.lang = lang
    recognition.continuous = continuous
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      let finalText = ''
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i]
        if (r.isFinal) finalText += r[0].transcript
        else interimText += r[0].transcript
      }

      // Stream interim text continuously - drives the live queue.
      if (interimText) {
        setInterim(interimText)
        if (onLiveRef.current) onLiveRef.current(interimText, false)
      }

      // Final phrase finalised - drives translateText() for polishing.
      if (finalText) {
        const cleaned = finalText.trim()
        setTranscript((prev) => (prev ? `${prev} ${cleaned}` : cleaned).trim())
        setInterim('')
        if (onLiveRef.current) onLiveRef.current(cleaned, true)
        if (onResultRef.current) onResultRef.current(cleaned)
      }
    }

    recognition.onerror = (e) => {
      console.warn('[useVoiceInput] error:', e.error)
      setError(e.error || 'speech-error')
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        wantListenRef.current = false
        setListening(false)
      }
    }

    recognition.onend = () => {
      if (wantListenRef.current) {
        try {
          recognition.start()
          setListening(true)
        } catch (_) {
          setListening(false)
        }
      } else {
        setListening(false)
      }
    }

    recognitionRef.current = recognition
    return () => {
      wantListenRef.current = false
      try { recognition.abort() } catch (_) {}
    }
  }, [SR, supported, lang, continuous])

  const start = useCallback(() => {
    setError(null)
    setInterim('')
    if (!recognitionRef.current) return
    wantListenRef.current = true
    try {
      recognitionRef.current.start()
      setListening(true)
    } catch (_) {
      // start() throws if already started - safe to ignore.
    }
  }, [])

  const stop = useCallback(() => {
    wantListenRef.current = false
    if (!recognitionRef.current) return
    try { recognitionRef.current.stop() } catch (_) {}
    setListening(false)
  }, [])

  const reset = useCallback(() => {
    setTranscript('')
    setInterim('')
    setError(null)
  }, [])

  return { listening, transcript, interim, error, supported, start, stop, reset }
}
