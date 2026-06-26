import { useCallback, useEffect, useRef, useState } from 'react'
import { ResetButton, SectionLabel } from './AppShell.jsx'
import AvatarPlayer from './AvatarPlayer.jsx'
import PoseViewer from './PoseViewer.jsx'
import TextInputPanel from './TextInputPanel.jsx'
import SignChips from './SignChips.jsx'
import ModeTutorial, { TutorialHelpButton } from './ModeTutorial.jsx'
import {
  AppPage,
  AppPageFooter,
  AppPageHeader,
  AppPageHeading,
  AppPageMain,
  AppPagePanel,
  AppPageStagger,
} from './PageMotion.jsx'
import { TRANSLATE_TUTORIAL_STEPS } from '../data/modeTutorialSteps.js'
import { useModeTutorial } from '../hooks/useModeTutorial.js'
import { translateText } from '../utils/translateText.js'
import { textToSignTokens } from '../utils/textNormalizer.js'
import { SIGNED_LANG_LABEL } from '../utils/signLanguage.js'
import {
  AVATARS,
  getCurrentAvatar,
  getAllSignKeys,
  setCurrentAvatar,
} from '../utils/signMap.js'

export default function TranslationScreen({
  initialMode = 'text',
  avatarId: initialAvatarId,
  onAvatarChange,
  onBack,
  onHome
}) {
  const [originalText, setOriginalText] = useState('')
  const [signs, setSigns] = useState([])
  const [poseSrc, setPoseSrc] = useState(null)
  const [translateSource, setTranslateSource] = useState(null)
  const [poseError, setPoseError] = useState(null)
  const [activeSign, setActiveSign] = useState(null)
  const [busy, setBusy] = useState(false)
  const [liveMode, setLiveMode] = useState(false)
  const [avatarId, setAvatarId] = useState(initialAvatarId || getCurrentAvatar().id)
  const [pendingWord, setPendingWord] = useState('')
  const [missedWord, setMissedWord] = useState('')

  const avatarRef = useRef(null)
  const inputRef = useRef(null)
  const poseBlobRef = useRef(null)
  const liveQueuedRef = useRef([])
  const pendingWordRef = useRef('')
  const missedTimerRef = useRef(null)

  const avatar = AVATARS.find((a) => a.id === avatarId) || AVATARS[0]

  useEffect(() => {
    if (initialAvatarId && initialAvatarId !== avatarId) {
      setAvatarId(initialAvatarId)
    }
  }, [initialAvatarId])

  useEffect(() => {
    setCurrentAvatar(avatarId)
  }, [avatarId])

  const revokePoseBlob = useCallback(() => {
    if (poseBlobRef.current?.startsWith('blob:')) {
      URL.revokeObjectURL(poseBlobRef.current)
      poseBlobRef.current = null
    }
  }, [])

  const resetVoice = useCallback(() => {
    if (inputRef.current) inputRef.current.clear()
  }, [])

  const resetAvatar = useCallback(() => {
    if (avatarRef.current) avatarRef.current.clear()
  }, [])

  const resetState = useCallback(() => {
    revokePoseBlob()
    setOriginalText('')
    setSigns([])
    setPoseSrc(null)
    setTranslateSource(null)
    setPoseError(null)
    setActiveSign(null)
    setBusy(false)
    setLiveMode(false)
    setPendingWord('')
    setMissedWord('')
    liveQueuedRef.current = []
    pendingWordRef.current = ''
    if (missedTimerRef.current) clearTimeout(missedTimerRef.current)
  }, [revokePoseBlob])

  const handleReset = useCallback(() => {
    resetVoice()
    resetAvatar()
    resetState()
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
  }, [resetVoice, resetAvatar, resetState])

  const handleAvatarChange = useCallback((id) => {
    setCurrentAvatar(id)
    setAvatarId(id)
    if (avatarRef.current) avatarRef.current.clear()
    if (onAvatarChange) onAvatarChange(id)
  }, [onAvatarChange])

  const handleSubmit = useCallback(async (text) => {
    setBusy(true)
    setOriginalText(text)
    setPoseError(null)
    revokePoseBlob()
    setPoseSrc(null)

    try {
      const result = await translateText(text)
      setTranslateSource(result.source)
      setOriginalText(result.text || text)

      if (result.poseSrc) {
        poseBlobRef.current = result.poseSrc
        setPoseSrc(result.poseSrc)
      }

      const avatarSigns = result.fallback?.length ? result.fallback : []
      setSigns(avatarSigns)

      if (!result.poseSrc && avatarSigns.length) {
        requestAnimationFrame(() => avatarRef.current?.replace(avatarSigns))
      } else if (avatarRef.current) {
        avatarRef.current.clear()
      }

      if (result.source === 'local' && !avatarSigns.length) {
        setPoseError('No hay animación 3D ni video local para este texto.')
      }
    } catch (e) {
      console.error(e)
      setPoseError('Error al traducir.')
    } finally {
      setBusy(false)
    }
  }, [revokePoseBlob])

  const handlePoseError = useCallback((err) => {
    setPoseError(
      typeof err === 'string' ? err : 'No se pudo cargar la animación 3D. Mostrando avatar local si hay video.',
    )
    setPoseSrc(null)
    revokePoseBlob()
    if (signs.length) {
      requestAnimationFrame(() => avatarRef.current?.replace(signs))
    }
  }, [revokePoseBlob, signs])

  const handleLiveWord = useCallback((rawWord) => {
    const cleaned = String(rawWord || '').trim()
    if (!cleaned) return

    setLiveMode(true)
    setOriginalText((prev) => (prev ? prev + ' ' : '') + cleaned)

    const signKeys = getAllSignKeys()

    const queueSign = (signToken) => {
      setSigns((prev) => [...prev, signToken])
      if (avatarRef.current) {
        avatarRef.current.queue(signToken)
        liveQueuedRef.current.push(signToken)
      }
    }

    if (pendingWordRef.current) {
      const compound = pendingWordRef.current + ' ' + cleaned
      const tokens = textToSignTokens(compound, signKeys)
      if (tokens.length === 1) {
        queueSign(tokens[0])
        pendingWordRef.current = ''
        setPendingWord('')
        return
      }
    }

    const tokens = textToSignTokens(cleaned, signKeys)
    if (tokens.length > 0) {
      tokens.forEach(queueSign)
      pendingWordRef.current = ''
      setPendingWord('')
      return
    }

    pendingWordRef.current = cleaned
    setPendingWord(cleaned)
    if (missedTimerRef.current) clearTimeout(missedTimerRef.current)
    missedTimerRef.current = setTimeout(() => {
      if (pendingWordRef.current === cleaned) {
        setMissedWord(cleaned)
        pendingWordRef.current = ''
        setPendingWord('')
        setTimeout(() => setMissedWord(''), 2000)
      }
    }, 1500)
  }, [])

  const handleVoiceFinal = useCallback((_text) => {
    liveQueuedRef.current = []
    pendingWordRef.current = ''
    setPendingWord('')
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

  const displaySigns = signs.map((s) => s.replace('.mp4', '').replace(/_/g, ' ').toUpperCase())
  const hasPose3d = translateSource === 'pose3d' && !!poseSrc

  const tutorial = useModeTutorial('translate')

  return (
    <AppPage>
      <AppPageHeader>
          <button
            onClick={onBack}
            className="motion-press inline-flex items-center gap-2 rounded-full border-2 border-pastel-ink/15 bg-white px-4 py-2 text-sm font-bold text-pastel-ink transition hover:border-pastel-purple-line hover:bg-pastel-purple/30 focus:outline-none focus:ring-4 focus:ring-pastel-purple"
          >
            <BackIcon />
            <span className="hidden sm:inline">Cambiar modo</span>
          </button>

          <button
            onClick={onHome}
            className="text-xl font-extrabold tracking-tight text-pastel-grape transition hover:opacity-80 sm:text-2xl"
          >
            Signara
          </button>

          <div className="flex items-center gap-2">
            <TutorialHelpButton onClick={tutorial.start} />
            <ResetButton onClick={handleReset} />
          </div>
      </AppPageHeader>

      <AppPageMain>
        <AppPagePanel>
            <AppPageHeading>
              <div>
                <SectionLabel color="green">Traducir</SectionLabel>
                <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                  De palabras a{' '}
                  <span className="inline-block rounded-xl border-2 border-pastel-green-line bg-pastel-green px-2.5 py-0.5 shadow-[0_8px_18px_-8px_rgba(45,42,38,0.35)]">
                    {SIGNED_LANG_LABEL}
                  </span>
                </h1>
              </div>

              <AppPageStagger className="flex flex-wrap gap-2">
                {liveMode && (
                  <StatusPill variant="live">
                    <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                    Voz activa
                  </StatusPill>
                )}
                {busy && <StatusPill variant="busy">Procesando…</StatusPill>}
                {hasPose3d && (
                  <StatusPill variant="count">Animación 3D</StatusPill>
                )}
                {signs.length > 0 && !hasPose3d && (
                  <StatusPill variant="count">
                    {signs.length} {signs.length === 1 ? 'seña' : 'señas'}
                  </StatusPill>
                )}
                <StatusPill variant="avatar">🧑 {avatar.name}</StatusPill>
              </AppPageStagger>
            </AppPageHeading>

            <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
              <AppPageStagger className="flex flex-col gap-5 lg:col-span-5">
                <TextInputPanel
                  ref={inputRef}
                  initialMode={initialMode}
                  onSubmit={handlePanelSubmit}
                  onLiveWord={handleLiveWord}
                  busy={busy}
                  pendingWord={pendingWord}
                  missedWord={missedWord}
                />

                <OutputCard
                  color="neutral"
                  icon={<TextIcon />}
                  title="Lo que dijiste"
                  emptyIcon="💬"
                  empty="Tu texto aparecerá aquí."
                  hasContent={!!originalText}
                >
                  <p className="text-base font-bold leading-relaxed text-pastel-ink sm:text-lg">
                    "{originalText}"
                  </p>
                </OutputCard>

                <OutputCard
                  color="green"
                  icon={<SignIcon />}
                  title="Secuencia de señas"
                  emptyIcon="🤟"
                  empty="Las señas saldrán aquí en orden."
                  hasContent={signs.length > 0}
                >
                  <SignChips signs={displaySigns} activeIndex={activeIndex} />
                </OutputCard>
              </AppPageStagger>

              <div className="animate-motion-scale-in lg:col-span-7">
                <div
                  className={
                    'relative flex h-full flex-col overflow-hidden rounded-[2rem] border-[3px] p-5 shadow-[0_24px_50px_-28px_rgba(148,208,142,0.7)] sm:p-7 ' +
                    (activeSign
                      ? 'border-pastel-grape bg-gradient-to-br from-pastel-green via-pastel-green to-pastel-purple/60'
                      : 'border-pastel-green-line bg-pastel-green')
                  }
                >
                  {activeSign && (
                    <div className="pointer-events-none absolute inset-0 rounded-[1.85rem] ring-4 ring-pastel-grape/25 ring-offset-2 ring-offset-transparent animate-pulse" />
                  )}

                  <div className="relative mb-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-pastel-ink/70">
                        👀 Mira aquí
                      </p>
                      <p className="mt-1 text-xl font-extrabold text-pastel-ink sm:text-2xl">
                        {activeSign ? (
                          formatSign(activeSign)
                        ) : hasPose3d ? (
                          `Señas ${SIGNED_LANG_LABEL} (3D)`
                        ) : signs.length > 0 ? (
                          'Interpretando…'
                        ) : (
                          'El avatar te espera'
                        )}
                      </p>
                    </div>
                  </div>

                  {poseError && (
                    <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                      {poseError}
                    </p>
                  )}

                  <div className="relative flex flex-1 items-center justify-center rounded-[1.5rem] border-2 border-white/60 bg-[#FAF6EC]/90 p-4 shadow-inner sm:p-6 min-h-[320px]">
                    <div className="w-full max-w-lg">
                      {hasPose3d ? (
                        <PoseViewer src={poseSrc} onError={handlePoseError} />
                      ) : (
                        <AvatarPlayer
                          ref={avatarRef}
                          avatarId={avatarId}
                          onAvatarChange={handleAvatarChange}
                          onSign={setActiveSign}
                          onFinish={() => setActiveSign(null)}
                        />
                      )}
                    </div>
                  </div>

                  {!signs.length && !poseSrc && !originalText && (
                    <div className="relative mt-4 rounded-2xl border-2 border-dashed border-pastel-ink/15 bg-white/50 px-4 py-3 text-center">
                      <p className="text-sm font-bold text-pastel-ink">
                        ↑ Escribe arriba o elige un ejemplo para empezar
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
        </AppPagePanel>
      </AppPageMain>

      <AppPageFooter>
        <p className="text-xs text-pastel-sub">Traducción en tiempo real · voz o texto a lengua de señas</p>
      </AppPageFooter>

      <ModeTutorial
        mode="translate"
        steps={TRANSLATE_TUTORIAL_STEPS}
        open={tutorial.open}
        onComplete={tutorial.finish}
      />
    </AppPage>
  )
}

function formatSign(sign) {
  return sign.replace('.mp4', '').replace(/_/g, ' ').toUpperCase()
}

function StatusPill({ variant, children }) {
  const styles = {
    live: 'border-pastel-grape bg-pastel-grape text-white shadow-[0_6px_16px_-6px_rgba(126,100,201,0.6)]',
    busy: 'border-pastel-purple-line bg-pastel-purple text-pastel-grape',
    count: 'border-pastel-green-line bg-pastel-green text-pastel-ink',
    avatar: 'border-pastel-ink/15 bg-white text-pastel-ink',
  }
  return (
    <span className={'inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-bold ' + styles[variant]}>
      {children}
    </span>
  )
}

function OutputCard({ color, icon, title, empty, emptyIcon, hasContent, children }) {
  const border = color === 'green'
    ? 'border-pastel-green-line'
    : 'border-pastel-ink/10'
  const bg = color === 'green' ? 'bg-pastel-green/40' : 'bg-white'

  return (
    <div className={`rounded-[1.5rem] border-2 ${border} ${bg} p-5 shadow-sm`}>
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <p className="text-sm font-extrabold text-pastel-ink">{title}</p>
      </div>
      {hasContent ? children : (
        <div className="flex flex-col items-center py-6 text-center">
          <span className="text-3xl opacity-40">{emptyIcon}</span>
          <p className="mt-2 text-sm font-semibold text-pastel-sub">{empty}</p>
        </div>
      )}
    </div>
  )
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  )
}

function TextIcon() {
  return <span className="text-lg" aria-hidden>📝</span>
}

function SignIcon() {
  return <span className="text-lg" aria-hidden>🤟</span>
}
