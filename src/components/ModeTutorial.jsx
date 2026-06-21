import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMotionExit, MODAL_EXIT_MS } from '../hooks/useMotionExit.js'

const ACCENTS = {
  translate: {
    label: 'Traducir',
    chip: 'bg-pastel-green border-pastel-green-line text-pastel-ink',
    ring: 'ring-pastel-green-line',
    btn: 'bg-pastel-grape',
  },
  interpret: {
    label: 'Interpretar',
    chip: 'bg-pastel-blue border-pastel-blue-line text-pastel-ink',
    ring: 'ring-pastel-blue-line',
    btn: 'bg-pastel-grape',
  },
}

const DIM_PANEL =
  'tutorial-dim-panel pointer-events-auto absolute transition-opacity duration-300 ease-[cubic-bezier(0.2,0,0,1)]'

const CARD_WIDTH = 320
const CARD_HEIGHT_EST = 300
const VIEW_MARGIN = 16
const CARD_GAP = 14
const STEP_MORPH_MS = 480

const STEP_MOTION = 'tutorial-step-motion'
const STEP_MOTION_LIVE = 'tutorial-step-motion--live'
const CARD_MOTION = 'tutorial-card-motion'

function measureSpot(el, pad = 10) {
  const r = el.getBoundingClientRect()
  return {
    top: r.top - pad,
    left: r.left - pad,
    width: r.width + pad * 2,
    height: r.height + pad * 2,
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

function scrollTargetIntoView(el, { animate = false, onFrame } = {}) {
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

function targetNeedsScroll(el) {
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
  const stepAnimReadyRef = useRef(false)
  const { closing, requestClose } = useMotionExit(onComplete, MODAL_EXIT_MS)

  const accent = ACCENTS[mode] || ACCENTS.translate
  const step = steps[stepIndex]
  const isLast = stepIndex >= steps.length - 1
  const showMotion = entered && !closing

  useEffect(() => {
    if (!open) {
      setStepIndex(0)
      setEntered(false)
      setSpot(null)
      setStepAnimReady(false)
      setSpotLive(false)
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
    if (!open || !step?.target) {
      setSpot(null)
      return
    }

    let cancelled = false
    let rafId = 0
    let targetEl = document.querySelector(`[data-tutorial="${step.target}"]`)

    if (!targetEl) {
      setSpot(null)
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
      const animateScroll =
        stepIndex > 0 && stepAnimReadyRef.current && targetNeedsScroll(targetEl)

      if (animateScroll) {
        setSpotLive(true)
        await scrollTargetIntoView(targetEl, {
          animate: true,
          onFrame: () => {
            if (!cancelled) setSpot(measureSpot(targetEl))
          },
        })
        if (!cancelled) setSpotLive(false)
      } else {
        await scrollTargetIntoView(targetEl, {
          animate: false,
          onFrame: () => {
            if (!cancelled) setSpot(measureSpot(targetEl))
          },
        })
      }

      if (cancelled) return

      stepAnimReadyRef.current = true
      window.setTimeout(() => {
        if (!cancelled) setStepAnimReady(true)
      }, 50)
    }

    alignTarget()

    const prevPosition = targetEl.style.position
    const prevZIndex = targetEl.style.zIndex
    const computed = window.getComputedStyle(targetEl)
    if (computed.position === 'static') targetEl.style.position = 'relative'
    targetEl.style.zIndex = '251'

    window.addEventListener('resize', updateSpot)
    const resizeObserver = new ResizeObserver(updateSpot)
    resizeObserver.observe(targetEl)

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', updateSpot)
      resizeObserver.disconnect()
      targetEl.style.position = prevPosition
      targetEl.style.zIndex = prevZIndex
    }
  }, [open, stepIndex, step?.target])

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

  const cardStyle = spot
    ? cardStyleForSpot(spot)
    : {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        maxWidth: CARD_WIDTH,
      }

  const stepMotionClass = spotLive
    ? STEP_MOTION + ' ' + STEP_MOTION_LIVE
    : stepAnimReady
      ? STEP_MOTION
      : ''

  const cardMotionClass = spot
    ? spotLive
      ? CARD_MOTION + ' ' + STEP_MOTION_LIVE
      : stepAnimReady
        ? CARD_MOTION
        : ''
    : ''

  return createPortal(
    <div
      className={'fixed inset-0 z-[250] overscroll-none pointer-events-none ' + (closing ? 'motion-exit-host' : '')}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mode-tutorial-title"
    >
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
            'tutorial-dim-panel pointer-events-auto absolute inset-0 transition-opacity duration-300 ease-[cubic-bezier(0.2,0,0,1)] ' +
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
          (closing
            ? 'animate-motion-modal-out'
            : showMotion && !stepAnimReady
              ? 'animate-motion-modal-in'
              : showMotion
                ? ''
                : 'scale-95 opacity-0')
        }
        style={cardStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div key={stepIndex} className="animate-motion-fade-through">
          <div className="flex items-start justify-between gap-3">
            <span className={'inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ' + accent.chip}>
              Tutorial · {accent.label}
            </span>
            <button
              type="button"
              onClick={closeTutorial}
              className="motion-press text-xs font-bold text-pastel-sub transition hover:text-pastel-ink"
            >
              Saltar
            </button>
          </div>

          <p className="mt-4 text-3xl" aria-hidden="true">
            {step.emoji}
          </p>
          <h2 id="mode-tutorial-title" className="mt-2 text-xl font-extrabold text-pastel-ink">
            {step.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-pastel-sub">{step.body}</p>

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
                  onClick={prevStep}
                  className="motion-press rounded-xl border-2 border-pastel-ink/15 bg-white px-3 py-2 text-sm font-bold text-pastel-sub"
                >
                  Atrás
                </button>
              )}
              <button
                type="button"
                onClick={nextStep}
                className={'motion-press rounded-xl px-4 py-2 text-sm font-bold text-white ' + accent.btn}
              >
                {isLast ? 'Empezar' : 'Siguiente'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
