import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMotionExit, MODAL_EXIT_MS } from '../hooks/useMotionExit.js'

const ACCENTS = {
  translate: {
    label: 'Traducir',
    chip: 'bg-pastel-green border-pastel-green-line text-pastel-ink',
    ring: 'ring-pastel-green-line',
    btn: 'bg-pastel-grape',
    bar: 'bg-pastel-green',
  },
  interpret: {
    label: 'Interpretar',
    chip: 'bg-pastel-blue border-pastel-blue-line text-pastel-ink',
    ring: 'ring-pastel-blue-line',
    btn: 'bg-pastel-grape',
    bar: 'bg-pastel-blue',
  },
}

const DIM_PANEL =
  'tutorial-dim-panel pointer-events-auto absolute transition-opacity duration-300 ease-[cubic-bezier(0.2,0,0,1)]'

const CARD_WIDTH = 320
const CARD_HEIGHT_EST = 300
const MOBILE_FOOTER_FALLBACK = 220
const MOBILE_HEADER_H = 92
const MOBILE_BREAKPOINT = 640
const VIEW_MARGIN = 16
const CARD_GAP = 14
const STEP_MORPH_MS = 480

const STEP_MOTION = 'tutorial-step-motion'
const STEP_MOTION_LIVE = 'tutorial-step-motion--live'
const CARD_MOTION = 'tutorial-card-motion'

function isMobileLayout() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

function measureSpot(el, pad = 10) {
  const mobile = isMobileLayout()
  const edgePad = mobile ? 6 : pad
  const r = el.getBoundingClientRect()
  return {
    top: r.top - edgePad,
    left: r.left - edgePad,
    width: r.width + edgePad * 2,
    height: r.height + edgePad * 2,
    mobile,
  }
}

function releaseScrollLock() {
  const lockedTop = parseInt(document.body.style.top || '0', 10)
  const scrollY = document.body.style.position === 'fixed' && lockedTop
    ? Math.abs(lockedTop)
    : window.scrollY

  document.body.style.position = ''
  document.body.style.top = ''
  document.body.style.left = ''
  document.body.style.right = ''
  document.body.style.width = ''
  window.scrollTo(0, scrollY)
  return scrollY
}

function applyScrollLock(scrollY = window.scrollY) {
  document.body.style.position = 'fixed'
  document.body.style.top = `-${scrollY}px`
  document.body.style.left = '0'
  document.body.style.right = '0'
  document.body.style.width = '100%'
}

function mobileViewportBounds(footerHeight = MOBILE_FOOTER_FALLBACK) {
  const top = MOBILE_HEADER_H + 10
  const bottom = window.innerHeight - footerHeight - 10
  return { top, bottom, height: Math.max(0, bottom - top) }
}

function computeMobileScrollDelta(el, footerHeight = MOBILE_FOOTER_FALLBACK) {
  const r = el.getBoundingClientRect()
  const { top, bottom, height: zoneHeight } = mobileViewportBounds(footerHeight)

  if (r.height > zoneHeight) {
    return r.top - top
  }

  if (r.bottom > bottom) {
    return r.bottom - bottom + 6
  }

  if (r.top < top) {
    return r.top - top
  }

  return 0
}

function scrollMobileTarget(
  el,
  { animate = false, onFrame, footerHeight = MOBILE_FOOTER_FALLBACK } = {},
) {
  releaseScrollLock()

  const scrollDelta = computeMobileScrollDelta(el, footerHeight)
  if (Math.abs(scrollDelta) > 1) {
    window.scrollBy({
      top: scrollDelta,
      behavior: animate ? 'smooth' : 'auto',
    })
  }

  if (!animate) {
    applyScrollLock(window.scrollY)
    onFrame?.()
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const start = performance.now()
    let rafId = 0

    const tick = () => {
      onFrame?.()
      if (performance.now() - start < STEP_MORPH_MS) {
        rafId = requestAnimationFrame(tick)
        return
      }
      applyScrollLock(window.scrollY)
      onFrame?.()
      resolve()
    }

    rafId = requestAnimationFrame(tick)
  })
}

function mobileTargetNeedsScroll(el, footerHeight = MOBILE_FOOTER_FALLBACK) {
  return Math.abs(computeMobileScrollDelta(el, footerHeight)) > 2
}

function scrollDesktopTarget(el, { animate = false, onFrame } = {}) {
  releaseScrollLock()

  el.scrollIntoView({
    block: 'center',
    inline: 'nearest',
    behavior: animate ? 'smooth' : 'auto',
  })

  if (!animate) {
    applyScrollLock(window.scrollY)
    onFrame?.()
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const start = performance.now()
    let rafId = 0

    const tick = () => {
      onFrame?.()
      if (performance.now() - start < STEP_MORPH_MS) {
        rafId = requestAnimationFrame(tick)
        return
      }
      applyScrollLock(window.scrollY)
      onFrame?.()
      resolve()
    }

    rafId = requestAnimationFrame(tick)
  })
}

function desktopTargetNeedsScroll(el) {
  const r = el.getBoundingClientRect()
  const margin = 56
  return r.top < margin || r.bottom > window.innerHeight - margin
}

function cardOverlapsSpot(cardLeft, cardTop, cardWidth, spot) {
  const cardBottom = cardTop + CARD_HEIGHT_EST
  const cardRight = cardLeft + cardWidth
  return (
    cardLeft < spot.left + spot.width + VIEW_MARGIN &&
    cardRight > spot.left - VIEW_MARGIN &&
    cardTop < spot.top + spot.height + VIEW_MARGIN &&
    cardBottom > spot.top - VIEW_MARGIN
  )
}

function cardStyleForSpot(spot) {
  const width = Math.min(CARD_WIDTH, Math.max(260, window.innerWidth - VIEW_MARGIN * 2))
  const spotCenterX = spot.left + spot.width / 2
  const preferRight = spotCenterX < window.innerWidth / 2

  let left = preferRight
    ? spot.left + spot.width + CARD_GAP
    : spot.left - width - CARD_GAP

  if (left + width > window.innerWidth - VIEW_MARGIN) {
    left = spot.left - width - CARD_GAP
  }
  if (left < VIEW_MARGIN) {
    left = spot.left + spot.width + CARD_GAP
  }

  left = Math.max(VIEW_MARGIN, Math.min(left, window.innerWidth - width - VIEW_MARGIN))

  let top = spot.top + spot.height / 2 - CARD_HEIGHT_EST / 2
  top = Math.max(VIEW_MARGIN, Math.min(top, window.innerHeight - CARD_HEIGHT_EST - VIEW_MARGIN))

  if (cardOverlapsSpot(left, top, width, spot)) {
    const below = spot.top + spot.height + CARD_GAP
    const above = spot.top - CARD_HEIGHT_EST - CARD_GAP

    if (below + CARD_HEIGHT_EST <= window.innerHeight - VIEW_MARGIN) {
      top = below
      left = Math.max(
        VIEW_MARGIN,
        Math.min(spot.left, window.innerWidth - width - VIEW_MARGIN),
      )
    } else if (above >= VIEW_MARGIN) {
      top = above
      left = Math.max(
        VIEW_MARGIN,
        Math.min(spot.left, window.innerWidth - width - VIEW_MARGIN),
      )
    }
  }

  return { left, top, width, maxWidth: CARD_WIDTH }
}

function TutorialDimPanels({ spot, visible, onDismiss, motionClass }) {
  if (!spot) return null

  const { top, left, width, height } = spot
  const panelMotion = visible ? 'opacity-100' : 'opacity-0'

  return (
    <>
      <button
        type="button"
        className={DIM_PANEL + ' inset-x-0 top-0 ' + panelMotion + ' ' + motionClass}
        style={{ height: Math.max(top, 0) }}
        onClick={onDismiss}
        aria-label="Cerrar tutorial"
      />
      <button
        type="button"
        className={DIM_PANEL + ' left-0 ' + panelMotion + ' ' + motionClass}
        style={{ top, width: Math.max(left, 0), height }}
        onClick={onDismiss}
        aria-label="Cerrar tutorial"
      />
      <button
        type="button"
        className={DIM_PANEL + ' right-0 ' + panelMotion + ' ' + motionClass}
        style={{ top, left: left + width, height }}
        onClick={onDismiss}
        aria-label="Cerrar tutorial"
      />
      <button
        type="button"
        className={DIM_PANEL + ' inset-x-0 bottom-0 ' + panelMotion + ' ' + motionClass}
        style={{ top: top + height }}
        onClick={onDismiss}
        aria-label="Cerrar tutorial"
      />
    </>
  )
}

function TutorialMobileCutout({ spot, visible, onDismiss, motionClass }) {
  if (!visible) return null

  if (!spot) {
    return (
      <button
        type="button"
        className="tutorial-mobile-dim fixed inset-0 z-[251] pointer-events-auto"
        onClick={onDismiss}
        aria-label="Cerrar tutorial"
      />
    )
  }

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar tutorial"
        onClick={onDismiss}
        className={'tutorial-mobile-cutout-hole fixed z-[251] pointer-events-auto ' + motionClass}
        style={{
          top: spot.top,
          left: spot.left,
          width: spot.width,
          height: spot.height,
        }}
      />
      <div
        aria-hidden="true"
        className={'tutorial-mobile-cutout-ring fixed z-[252] pointer-events-none ' + motionClass}
        style={{
          top: spot.top,
          left: spot.left,
          width: spot.width,
          height: spot.height,
        }}
      />
      <span
        aria-hidden="true"
        className={
          'tutorial-mobile-cutout-label fixed z-[253] pointer-events-none ' + motionClass
        }
        style={{
          top: Math.max(8, spot.top - 30),
          left: spot.left + spot.width / 2,
          transform: 'translateX(-50%)',
        }}
      >
        Aquí
      </span>
    </>
  )
}

function MobileTutorialHeader({ accent, stepIndex, steps, onClose, showProgress = true, className = '' }) {
  const progress = ((stepIndex + 1) / steps.length) * 100

  return (
    <header
      className={
        'tutorial-mobile-header shrink-0 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] ' + className
      }
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={
            'inline-flex items-center rounded-full border-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ' +
            accent.chip
          }
        >
          Tutorial · {accent.label}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="motion-press rounded-lg px-2 py-1 text-xs font-bold text-pastel-sub transition hover:text-pastel-ink"
        >
          Saltar
        </button>
      </div>

      {showProgress && (
        <>
          <p className="mt-3 text-xs font-bold text-pastel-sub">
            Paso {stepIndex + 1} de {steps.length}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-pastel-ink/10">
            <div
              className={'h-full rounded-full transition-all duration-500 ease-out ' + accent.bar}
              style={{ width: `${progress}%` }}
            />
          </div>
        </>
      )}
    </header>
  )
}

function MobileTutorialNav({
  accent,
  stepIndex,
  steps,
  isLast,
  onPrev,
  onNext,
  compact = false,
}) {
  return (
    <div className={compact ? 'mt-4 space-y-3' : 'mt-6 space-y-4'}>
      <div className="flex justify-center gap-1.5">
        {steps.map((_, i) => (
          <span
            key={i}
            className={
              'h-1.5 rounded-full transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] ' +
              (i === stepIndex ? 'w-5 bg-pastel-grape' : 'w-1.5 bg-pastel-ink/20')
            }
          />
        ))}
      </div>
      <div className="flex gap-2">
        {stepIndex > 0 && (
          <button
            type="button"
            onClick={onPrev}
            className="motion-press flex-1 rounded-xl border-2 border-pastel-ink/15 bg-white py-3 text-sm font-bold text-pastel-sub"
          >
            Atrás
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          className={
            'motion-press rounded-xl py-3 text-sm font-bold text-white ' +
            accent.btn +
            ' ' +
            (stepIndex > 0 ? 'flex-[2]' : 'flex-1')
          }
        >
          {isLast ? 'Empezar' : 'Siguiente'}
        </button>
      </div>
    </div>
  )
}

function MobileTutorialIntro({
  accent,
  step,
  stepIndex,
  steps,
  isLast,
  showMotion,
  closing,
  onClose,
  onPrev,
  onNext,
}) {
  const enterClass = closing
    ? 'animate-motion-modal-out'
    : showMotion
      ? 'animate-motion-fade-through'
      : 'opacity-0'

  return (
    <div className="tutorial-mobile-intro pointer-events-auto fixed inset-0 z-[250] flex flex-col bg-[#FAF6EC]">
      <MobileTutorialHeader
        accent={accent}
        stepIndex={stepIndex}
        steps={steps}
        onClose={onClose}
      />

      <main className={'flex flex-1 flex-col items-center justify-center px-6 text-center ' + enterClass}>
        <span className="text-6xl leading-none" aria-hidden="true">
          {step.emoji}
        </span>
        <h2
          id="mode-tutorial-title"
          className="mt-5 text-2xl font-extrabold tracking-tight text-pastel-ink"
        >
          {step.title}
        </h2>
        <p className="mt-3 max-w-sm text-base leading-relaxed text-pastel-sub">{step.body}</p>
      </main>

      <footer className="tutorial-mobile-footer shrink-0 px-4 pt-2">
        <MobileTutorialNav
          accent={accent}
          stepIndex={stepIndex}
          steps={steps}
          isLast={isLast}
          onPrev={onPrev}
          onNext={onNext}
        />
      </footer>
    </div>
  )
}

function MobileTutorialCoach({
  accent,
  step,
  stepIndex,
  steps,
  isLast,
  spot,
  showMotion,
  stepMotionClass,
  closing,
  footerRef,
  onClose,
  onPrev,
  onNext,
}) {
  const enterClass = closing
    ? 'animate-motion-modal-out'
    : showMotion
      ? 'animate-motion-fade-through'
      : 'opacity-0'

  return (
    <div className="pointer-events-none fixed inset-0 z-[250]">
      <TutorialMobileCutout
        spot={spot}
        visible={showMotion}
        onDismiss={onClose}
        motionClass={stepMotionClass}
      />

      <div className="flex h-full flex-col">
        <MobileTutorialHeader
          accent={accent}
          stepIndex={stepIndex}
          steps={steps}
          onClose={onClose}
          className="pointer-events-auto relative z-[260]"
        />

        <div className="flex-1" aria-hidden="true" />

        <footer
          ref={footerRef}
          className={
            'tutorial-mobile-footer pointer-events-auto relative z-[260] shrink-0 px-4 pt-3 ' + enterClass
          }
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl leading-none" aria-hidden="true">
              {step.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <h2
                id="mode-tutorial-title"
                className="text-lg font-extrabold leading-snug text-pastel-ink"
              >
                {step.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-pastel-sub">{step.body}</p>
            </div>
          </div>

          <MobileTutorialNav
            accent={accent}
            stepIndex={stepIndex}
            steps={steps}
            isLast={isLast}
            onPrev={onPrev}
            onNext={onNext}
            compact
          />
        </footer>
      </div>
    </div>
  )
}

function TutorialCardContent({
  accent,
  step,
  stepIndex,
  steps,
  isLast,
  onClose,
  onPrev,
  onNext,
}) {
  return (
    <div key={stepIndex} className="animate-motion-fade-through">
      <div className="flex items-center justify-between gap-3">
        <span
          className={
            'inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ' +
            accent.chip
          }
        >
          Tutorial · {accent.label}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="motion-press text-xs font-bold text-pastel-sub transition hover:text-pastel-ink"
        >
          Saltar
        </button>
      </div>

      <div className="mt-4">
        <p className="text-3xl" aria-hidden="true">
          {step.emoji}
        </p>
        <h2
          id="mode-tutorial-title"
          className="mt-2 text-xl font-extrabold text-pastel-ink"
        >
          {step.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-pastel-sub">{step.body}</p>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <span
              key={i}
              className={
                'h-1.5 rounded-full transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] ' +
                (i === stepIndex ? 'w-5 bg-pastel-grape' : 'w-1.5 bg-pastel-ink/20')
              }
            />
          ))}
        </div>
        <div className="flex gap-2">
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={onPrev}
              className="motion-press rounded-xl border-2 border-pastel-ink/15 bg-white px-3 py-2.5 text-sm font-bold text-pastel-sub"
            >
              Atrás
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            className={
              'motion-press rounded-xl px-4 py-2.5 text-sm font-bold text-white ' + accent.btn
            }
          >
            {isLast ? 'Empezar' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function TutorialHelpButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="motion-press inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-pastel-purple-line bg-pastel-purple text-sm font-extrabold text-pastel-grape transition hover:brightness-105 focus:outline-none focus:ring-4 focus:ring-pastel-purple/40"
      aria-label="Ver tutorial de este modo"
      title="Tutorial"
    >
      ?
    </button>
  )
}

export default function ModeTutorial({ mode, steps, open, onComplete }) {
  const [stepIndex, setStepIndex] = useState(0)
  const [entered, setEntered] = useState(false)
  const [spot, setSpot] = useState(null)
  const [stepAnimReady, setStepAnimReady] = useState(false)
  const [spotLive, setSpotLive] = useState(false)
  const [layoutMobile, setLayoutMobile] = useState(() =>
    typeof window !== 'undefined' ? isMobileLayout() : false,
  )
  const [footerHeight, setFooterHeight] = useState(MOBILE_FOOTER_FALLBACK)
  const footerRef = useRef(null)
  const stepAnimReadyRef = useRef(false)
  const { closing, requestClose } = useMotionExit(onComplete, MODAL_EXIT_MS)

  const accent = ACCENTS[mode] || ACCENTS.translate
  const step = steps[stepIndex]
  const isLast = stepIndex >= steps.length - 1
  const showMotion = entered && !closing
  const isMobileIntro = layoutMobile && !step?.target
  const isMobileCoach = layoutMobile && !!step?.target

  useLayoutEffect(() => {
    if (!open || !isMobileCoach || !footerRef.current) return

    const measure = () => {
      const h = footerRef.current?.offsetHeight
      if (h && h > 0) setFooterHeight(h)
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(footerRef.current)
    return () => ro.disconnect()
  }, [open, isMobileCoach, stepIndex, step?.title])

  useEffect(() => {
    if (!open) {
      setStepIndex(0)
      setEntered(false)
      setSpot(null)
      setStepAnimReady(false)
      setSpotLive(false)
      setFooterHeight(MOBILE_FOOTER_FALLBACK)
      stepAnimReadyRef.current = false
      return
    }

    let raf2
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setEntered(true))
    })

    return () => {
      cancelAnimationFrame(raf1)
      if (raf2) cancelAnimationFrame(raf2)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const scrollY = window.scrollY
    const { style } = document.body
    const prev = {
      position: style.position,
      top: style.top,
      left: style.left,
      right: style.right,
      width: style.width,
    }

    applyScrollLock(scrollY)

    return () => {
      const lockedTop = parseInt(style.top || '0', 10)
      const restoreY = style.position === 'fixed' && lockedTop ? Math.abs(lockedTop) : scrollY

      style.position = prev.position
      style.top = prev.top
      style.left = prev.left
      style.right = prev.right
      style.width = prev.width
      window.scrollTo(0, restoreY)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const onResize = () => {
      const mobile = isMobileLayout()
      setLayoutMobile(mobile)
      if (step?.target) {
        const el = document.querySelector(`[data-tutorial="${step.target}"]`)
        if (el) setSpot(measureSpot(el))
      }
    }

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open, step?.target])

  useEffect(() => {
    if (!open || !step?.target) {
      setSpot(null)
      setStepAnimReady(!step?.target)
      return
    }

    let cancelled = false
    let rafId = 0
    const targetEl = document.querySelector(`[data-tutorial="${step.target}"]`)

    if (!targetEl) {
      setSpot(null)
      setStepAnimReady(true)
      return
    }

    const updateSpot = () => {
      if (cancelled) return
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        if (!cancelled) setSpot(measureSpot(targetEl))
      })
    }

    const alignTarget = async () => {
      const mobile = isMobileLayout()
      setLayoutMobile(mobile)

      if (mobile) {
        const animateScroll =
          stepIndex > 0 &&
          stepAnimReadyRef.current &&
          mobileTargetNeedsScroll(targetEl, footerHeight)

        if (animateScroll) {
          setSpotLive(true)
          await scrollMobileTarget(targetEl, {
            animate: true,
            footerHeight,
            onFrame: () => {
              if (!cancelled) setSpot(measureSpot(targetEl))
            },
          })
          if (!cancelled) setSpotLive(false)
        } else {
          await scrollMobileTarget(targetEl, {
            animate: false,
            footerHeight,
            onFrame: () => {
              if (!cancelled) setSpot(measureSpot(targetEl))
            },
          })
        }
      } else {
        const animateScroll =
          stepIndex > 0 &&
          stepAnimReadyRef.current &&
          desktopTargetNeedsScroll(targetEl)

        if (animateScroll) {
          setSpotLive(true)
          await scrollDesktopTarget(targetEl, {
            animate: true,
            onFrame: () => {
              if (!cancelled) setSpot(measureSpot(targetEl))
            },
          })
          if (!cancelled) setSpotLive(false)
        } else {
          await scrollDesktopTarget(targetEl, {
            animate: false,
            onFrame: () => {
              if (!cancelled) setSpot(measureSpot(targetEl))
            },
          })
        }
      }

      if (cancelled) return

      stepAnimReadyRef.current = true
      window.setTimeout(() => {
        if (!cancelled) setStepAnimReady(true)
      }, 50)
    }

    alignTarget()

    const mobileAtStart = isMobileLayout()
    let prevPosition
    let prevZIndex
    if (!mobileAtStart) {
      prevPosition = targetEl.style.position
      prevZIndex = targetEl.style.zIndex
      const computed = window.getComputedStyle(targetEl)
      if (computed.position === 'static') targetEl.style.position = 'relative'
      targetEl.style.zIndex = '251'
    }

    window.addEventListener('resize', updateSpot)
    const resizeObserver = new ResizeObserver(updateSpot)
    resizeObserver.observe(targetEl)

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', updateSpot)
      resizeObserver.disconnect()
      if (!mobileAtStart) {
        targetEl.style.position = prevPosition
        targetEl.style.zIndex = prevZIndex
      }
    }
  }, [open, stepIndex, step?.target, footerHeight])

  if (!open) return null

  function closeTutorial() {
    requestClose()
  }

  function nextStep() {
    if (isLast) {
      closeTutorial()
      return
    }
    setStepIndex((i) => i + 1)
  }

  function prevStep() {
    setStepIndex((i) => Math.max(0, i - 1))
  }

  const stepMotionClass = spotLive
    ? STEP_MOTION + ' ' + STEP_MOTION_LIVE
    : stepAnimReady
      ? STEP_MOTION
      : ''

  const cardMotionClass =
    !layoutMobile && spot
      ? spotLive
        ? CARD_MOTION + ' ' + STEP_MOTION_LIVE
        : stepAnimReady
          ? CARD_MOTION
          : ''
      : ''

  const cardEnterClass = closing
    ? 'animate-motion-modal-out'
    : showMotion && !stepAnimReady && !layoutMobile
      ? 'animate-motion-modal-in'
      : showMotion
        ? ''
        : 'scale-95 opacity-0'

  const cardProps = {
    accent,
    step,
    stepIndex,
    steps,
    isLast,
    onClose: closeTutorial,
    onPrev: prevStep,
    onNext: nextStep,
  }

  return createPortal(
    <div
      className={'overscroll-none ' + (closing ? 'motion-exit-host' : '')}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mode-tutorial-title"
    >
      {layoutMobile ? (
        isMobileIntro ? (
          <MobileTutorialIntro
            {...cardProps}
            showMotion={showMotion}
            closing={closing}
          />
        ) : (
          <MobileTutorialCoach
            {...cardProps}
            spot={spot}
            showMotion={showMotion}
            stepMotionClass={stepMotionClass}
            closing={closing}
            footerRef={footerRef}
          />
        )
      ) : (
        <div className="pointer-events-none fixed inset-0 z-[250]">
          {spot ? (
            <>
              <TutorialDimPanels
                spot={spot}
                visible={showMotion}
                onDismiss={closeTutorial}
                motionClass={stepMotionClass}
              />
              {showMotion && (
                <div
                  className={
                    'pointer-events-none absolute rounded-2xl ring-4 ring-offset-2 ring-offset-transparent ' +
                    stepMotionClass +
                    ' ' +
                    accent.ring
                  }
                  style={{
                    top: spot.top,
                    left: spot.left,
                    width: spot.width,
                    height: spot.height,
                  }}
                />
              )}
            </>
          ) : (
            <button
              type="button"
              className={
                'tutorial-dim-panel pointer-events-auto absolute inset-0 transition-opacity duration-300 ' +
                (showMotion ? 'opacity-100' : 'opacity-0')
              }
              onClick={closeTutorial}
              aria-label="Cerrar tutorial"
            />
          )}

          <div
            className={
              'pointer-events-auto absolute z-10 rounded-[1.5rem] border-2 border-pastel-ink/10 bg-[#FAF6EC] p-5 shadow-[0_24px_50px_-20px_rgba(45,42,38,0.55)] sm:p-6 ' +
              cardMotionClass +
              ' ' +
              cardEnterClass
            }
            style={
              spot
                ? cardStyleForSpot(spot)
                : {
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    maxWidth: CARD_WIDTH,
                  }
            }
            onClick={(e) => e.stopPropagation()}
          >
            <TutorialCardContent {...cardProps} />
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}
