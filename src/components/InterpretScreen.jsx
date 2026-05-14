import { useEffect, useRef, useState, useCallback } from 'react'
import Logo from './Logo.jsx'
import HandModel3D from './HandModel3D.jsx'

const MEDIAPIPE_HOLISTIC_VER = '0.5.1675471629'
const MEDIAPIPE_CAM_VER = '0.3.1675466862'
const MEDIAPIPE_DRAW_VER = '0.3.1675466124'

const MP_SCRIPTS = [
  `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@${MEDIAPIPE_HOLISTIC_VER}/holistic.js`,
  `https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@${MEDIAPIPE_CAM_VER}/camera_utils.js`,
  `https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@${MEDIAPIPE_DRAW_VER}/drawing_utils.js`,
]

// Heuristic fallback
const HISTORY_LEN = 20
const HEURISTIC_COOLDOWN_MS = 1500

// ML pipeline — deben coincidir con sign_ai/core/config.py
const ML_API_URL = 'http://localhost:8000'
const SEQ_LEN = 30
const MAX_FEATURES = 1659
const FACE_COUNT = 478   // refine_face_landmarks=True → 478 landmarks (468 + 10 iris)
const POSE_COUNT = 33
const HAND_COUNT = 21
const STABILITY_NEEDED = 3    // predicciones consecutivas iguales para confirmar
const PREDICT_EVERY = 5       // enviar al API cada N frames (~6 veces/seg a 30fps)
const ML_COOLDOWN_MS = 600    // cooldown entre detecciones ML (conversación fluida)

function loadScript(url) {
  return new Promise((resolve, reject) => {
    let s = document.querySelector(`script[data-signara="${url}"]`)
    if (s) {
      if (s.getAttribute('data-loaded') === 'true') return resolve()
      s.addEventListener('load', resolve)
      s.addEventListener('error', () => reject(new Error('Failed to load ' + url)))
      return
    }
    s = document.createElement('script')
    s.src = url
    s.async = true
    s.crossOrigin = 'anonymous'
    s.dataset.signara = url
    s.addEventListener('load', () => { s.setAttribute('data-loaded', 'true'); resolve() })
    s.addEventListener('error', () => reject(new Error('Failed to load ' + url)))
    document.head.appendChild(s)
  })
}

async function loadMediaPipe() {
  for (const url of MP_SCRIPTS) await loadScript(url)
}

/**
 * Extrae 1659 features de los resultados de MediaPipe Holistic,
 * en el mismo orden que sign_ai/core/extractor.py:
 *   face (478×3) + pose (33×3) + left_hand (21×3) + right_hand (21×3)
 *
 * Requiere refineFaceLandmarks: true en holistic.setOptions()
 * para obtener los 478 puntos faciales que el modelo espera.
 */
function extractLandmarks(results) {
  const flatCoords = (landmarks, count) => {
    const arr = new Array(count * 3).fill(0)
    if (landmarks && landmarks.length > 0) {
      const n = Math.min(landmarks.length, count)
      for (let i = 0; i < n; i++) {
        arr[i * 3]     = landmarks[i]?.x ?? 0
        arr[i * 3 + 1] = landmarks[i]?.y ?? 0
        arr[i * 3 + 2] = landmarks[i]?.z ?? 0
      }
    }
    return arr
  }
  return [
    ...flatCoords(results.faceLandmarks,       FACE_COUNT),  // 1434
    ...flatCoords(results.poseLandmarks,        POSE_COUNT),  // 99
    ...flatCoords(results.leftHandLandmarks,    HAND_COUNT),  // 63
    ...flatCoords(results.rightHandLandmarks,   HAND_COUNT),  // 63
  ] // total: 1659
}

export default function InterpretScreen({ onBack, onHome }) {
  const videoRef    = useRef(null)
  const canvasRef   = useRef(null)
  const holisticRef = useRef(null)
  const cameraRef   = useRef(null)

  // Heuristic pose tracking
  const poseHistoryLeftRef  = useRef([])
  const poseHistoryRightRef = useRef([])
  const lastDetectionRef    = useRef(0)
  const runningRef          = useRef(false)
  const audioRef            = useRef(true)

  // ML pipeline state (refs para acceso dentro del callback de MediaPipe)
  const landmarkBufferRef   = useRef([])   // buffer circular de 30 frames
  const frameCountRef       = useRef(0)    // frames procesados desde inicio
  const mlAvailableRef      = useRef(false)
  const apiInFlightRef      = useRef(false)
  const stabilityRef        = useRef({ count: 0, prediction: '' })
  const sentenceClearTimer  = useRef(null)
  const handModelRef        = useRef(null)

  // UI state
  const [scriptsLoaded, setScriptsLoaded] = useState(false)
  const [scriptsError,  setScriptsError]  = useState(null)
  const [cameraOk,      setCameraOk]      = useState(false)
  const [cameraError,   setCameraError]   = useState(null)
  const [running,       setRunning]       = useState(false)
  const [handVisible,   setHandVisible]   = useState(false)
  const [latest,        setLatest]        = useState(null)
  const [history,       setHistory]       = useState([])
  const [audioOn,       setAudioOn]       = useState(true)
  const [unrecognized,  setUnrecognized]  = useState(false)
  const [mlMode,        setMlMode]        = useState(false)
  const [mlConnecting,  setMlConnecting]  = useState(false)
  const [sentence,      setSentence]      = useState([])

  useEffect(() => { runningRef.current = running }, [running])
  useEffect(() => { audioRef.current   = audioOn  }, [audioOn])

  // Verificar si el servidor ML está disponible al montar
  useEffect(() => {
    let cancelled = false
    setMlConnecting(true)
    fetch(`${ML_API_URL}/health`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        const ok = !!data.model_loaded
        mlAvailableRef.current = ok
        setMlMode(ok)
        setMlConnecting(false)
      })
      .catch(() => {
        if (cancelled) return
        mlAvailableRef.current = false
        setMlMode(false)
        setMlConnecting(false)
      })
    return () => { cancelled = true }
  }, [])

  // Cargar scripts MediaPipe
  useEffect(() => {
    let cancelled = false
    loadMediaPipe()
      .then(() => { if (!cancelled) setScriptsLoaded(true) })
      .catch(e  => { if (!cancelled) setScriptsError(String(e.message || e)) })
    return () => { cancelled = true }
  }, [])

  // Inicializar Holistic + cámara cuando scripts listos
  useEffect(() => {
    if (!scriptsLoaded) return
    const HolisticCtor = window.Holistic
    const CameraCtor   = window.Camera
    if (!HolisticCtor || !CameraCtor) {
      setScriptsError('MediaPipe no se cargó correctamente.')
      return
    }
    const videoEl = videoRef.current
    if (!videoEl) return

    const holistic = new HolisticCtor({
      locateFile: f =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@${MEDIAPIPE_HOLISTIC_VER}/${f}`
    })
    holistic.setOptions({
      modelComplexity:        0,
      smoothLandmarks:        true,
      enableSegmentation:     false,
      smoothSegmentation:     false,
      refineFaceLandmarks:    true,  // debe ser true — el modelo fue entrenado con 478 landmarks faciales
      minDetectionConfidence: 0.5,
      minTrackingConfidence:  0.5,
    })
    holistic.onResults(handleResults)
    holisticRef.current = holistic

    const camera = new CameraCtor(videoEl, {
      onFrame: async () => {
        if (holisticRef.current && videoEl.readyState >= 2) {
          try { await holisticRef.current.send({ image: videoEl }) } catch (_) {}
        }
      },
      width: 640, height: 480,
    })
    cameraRef.current = camera

    camera.start()
      .then(() => setCameraOk(true))
      .catch(e  => setCameraError(
        e?.name === 'NotAllowedError'
          ? 'Permiso de cámara denegado. Habilítalo en tu navegador.'
          : 'No se pudo acceder a la cámara.'
      ))

    return () => {
      try { camera.stop()   } catch (_) {}
      try { holistic.close() } catch (_) {}
      holisticRef.current = null
      cameraRef.current   = null
    }
  }, [scriptsLoaded])

  // ─── Heuristic helpers ──────────────────────────────────────────────────────

  const isFingersClosedExceptIndex = (lms) => {
    const d = (a, b) => Math.hypot(a.x-b.x, a.y-b.y, a.z-b.z)
    return (
      d(lms[8],  lms[0]) > d(lms[6],  lms[0]) &&
      d(lms[12], lms[0]) < d(lms[10], lms[0]) &&
      d(lms[16], lms[0]) < d(lms[14], lms[0]) &&
      d(lms[20], lms[0]) < d(lms[18], lms[0])
    )
  }

  const isFist = (lms) => {
    const d = (a, b) => Math.hypot(a.x-b.x, a.y-b.y, a.z-b.z)
    return (
      d(lms[8],  lms[0]) < d(lms[5],  lms[0]) &&
      d(lms[12], lms[0]) < d(lms[9],  lms[0]) &&
      d(lms[16], lms[0]) < d(lms[13], lms[0]) &&
      d(lms[20], lms[0]) < d(lms[17], lms[0])
    )
  }

  const isCircularMovement = (hist) => {
    if (hist.length < 8) return false
    let minX = 1, maxX = 0, minY = 1, maxY = 0
    hist.forEach(p => {
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x
      if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y
    })
    const rx = maxX - minX, ry = maxY - minY
    if (rx < 0.03 || ry < 0.03) return false
    const ratio = rx / ry
    return ratio >= 0.25 && ratio <= 4.0
  }

  // ─── Sentence building ──────────────────────────────────────────────────────

  function triggerRecognition(sign, text, confidence = 0.95) {
    lastDetectionRef.current = Date.now()
    poseHistoryLeftRef.current  = []
    poseHistoryRightRef.current = []

    const detection = { sign, text, confidence }
    setLatest(detection)
    setHistory(h => [detection, ...h].slice(0, 8))

    // Acumular en la oración de la conversación (máx 10 palabras visibles)
    setSentence(prev => [...prev, sign].slice(-10))
    if (sentenceClearTimer.current) clearTimeout(sentenceClearTimer.current)
    sentenceClearTimer.current = setTimeout(() => setSentence([]), 5000)

    speak(text)
  }

  function speak(text) {
    if (!audioRef.current || !text) return
    if (!window?.speechSynthesis) return
    try {
      window.speechSynthesis.cancel()
      const u = new window.SpeechSynthesisUtterance(text)
      u.lang = 'es-ES'; u.rate = 1; u.pitch = 1
      window.speechSynthesis.speak(u)
    } catch (e) { console.warn(e) }
  }

  // ─── Main MediaPipe callback ─────────────────────────────────────────────────

  function handleResults(results) {
    const canvas = canvasRef.current
    const video  = videoRef.current
    if (!canvas || !video) return

    canvas.width  = video.videoWidth  || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    ctx.save()
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const hasLeftHand  = !!results.leftHandLandmarks
    const hasRightHand = !!results.rightHandLandmarks
    const hasFace      = !!results.faceLandmarks
    const hasPose      = !!results.poseLandmarks

    // Dibujar esqueleto
    if (window.drawConnectors && window.drawLandmarks) {
      if (hasPose) {
        window.drawConnectors(ctx, results.poseLandmarks, window.POSE_CONNECTIONS,
          { color: '#00FF00', lineWidth: 4 })
        window.drawLandmarks(ctx, results.poseLandmarks,
          { color: '#FF0000', lineWidth: 2 })
      }
      if (hasFace) {
        window.drawConnectors(ctx, results.faceLandmarks, window.FACEMESH_TESSELATION,
          { color: '#C0C0C070', lineWidth: 1 })
        window.drawConnectors(ctx, results.faceLandmarks, window.FACEMESH_RIGHT_EYE,     { color: '#FF3030' })
        window.drawConnectors(ctx, results.faceLandmarks, window.FACEMESH_RIGHT_EYEBROW, { color: '#FF3030' })
        window.drawConnectors(ctx, results.faceLandmarks, window.FACEMESH_LEFT_EYE,      { color: '#30FF30' })
        window.drawConnectors(ctx, results.faceLandmarks, window.FACEMESH_LEFT_EYEBROW,  { color: '#30FF30' })
        window.drawConnectors(ctx, results.faceLandmarks, window.FACEMESH_FACE_OVAL,     { color: '#E0E0E0' })
        window.drawConnectors(ctx, results.faceLandmarks, window.FACEMESH_LIPS,          { color: '#E0E0E0' })
      }
      if (hasRightHand) {
        window.drawConnectors(ctx, results.rightHandLandmarks, window.HAND_CONNECTIONS,
          { color: '#9333ea', lineWidth: 5 })
        window.drawLandmarks(ctx, results.rightHandLandmarks,
          { color: '#3b82f6', lineWidth: 2, radius: 4 })
      }
      if (hasLeftHand) {
        window.drawConnectors(ctx, results.leftHandLandmarks, window.HAND_CONNECTIONS,
          { color: '#3b82f6', lineWidth: 5 })
        window.drawLandmarks(ctx, results.leftHandLandmarks,
          { color: '#9333ea', lineWidth: 2, radius: 4 })
      }
    }

    if (hasLeftHand || hasRightHand) {
      const now = Date.now()

      if (hasLeftHand) {
        const lms   = results.leftHandLandmarks
        const wrist = lms[0]
        const size  = Math.hypot(lms[0].x - lms[9].x, lms[0].y - lms[9].y)
        poseHistoryLeftRef.current.push({ x: wrist.x, y: wrist.y, s: size, lms })
        if (poseHistoryLeftRef.current.length > HISTORY_LEN) poseHistoryLeftRef.current.shift()
      } else {
        poseHistoryLeftRef.current = []
      }

      if (hasRightHand) {
        const lms   = results.rightHandLandmarks
        const wrist = lms[0]
        const size  = Math.hypot(lms[0].x - lms[9].x, lms[0].y - lms[9].y)
        poseHistoryRightRef.current.push({ x: wrist.x, y: wrist.y, s: size, lms })
        if (poseHistoryRightRef.current.length > HISTORY_LEN) poseHistoryRightRef.current.shift()
      } else {
        poseHistoryRightRef.current = []
      }

      if (runningRef.current) {

        // ── ML PIPELINE ────────────────────────────────────────────────────────
        // Extraer landmarks y acumular buffer de 30 frames
        const frame = extractLandmarks(results)
        landmarkBufferRef.current.push(frame)
        if (landmarkBufferRef.current.length > SEQ_LEN) landmarkBufferRef.current.shift()

        frameCountRef.current++

        // Enviar al API cada PREDICT_EVERY frames, una vez que el buffer esté lleno
        if (
          mlAvailableRef.current &&
          landmarkBufferRef.current.length === SEQ_LEN &&
          frameCountRef.current % PREDICT_EVERY === 0 &&
          !apiInFlightRef.current
        ) {
          const bufferCopy = landmarkBufferRef.current.map(f => [...f])
          apiInFlightRef.current = true

          ;(async () => {
            try {
              const resp = await fetch(`${ML_API_URL}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ landmarks: bufferCopy }),
              })
              if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

              const { prediction, confidence, is_idle } = await resp.json()

              if (!is_idle && prediction) {
                const s = stabilityRef.current
                if (prediction === s.prediction) {
                  s.count++
                } else {
                  s.count = 1
                  s.prediction = prediction
                }
                if (s.count >= STABILITY_NEEDED) {
                  if (now - lastDetectionRef.current > ML_COOLDOWN_MS) {
                    triggerRecognition(prediction, prediction, confidence)
                    stabilityRef.current = { count: 0, prediction: '' }
                  }
                }
              } else {
                // No hay seña clara — resetear contador de estabilidad
                stabilityRef.current = { count: 0, prediction: '' }
              }
            } catch {
              // API no disponible — cambiar a modo heurístico
              mlAvailableRef.current = false
              setMlMode(false)
            } finally {
              apiInFlightRef.current = false
            }
          })()
        }

        // ── HEURISTIC FALLBACK (solo si ML no disponible) ──────────────────────
        if (!mlAvailableRef.current) {
          const canDetect = now - lastDetectionRef.current > HEURISTIC_COOLDOWN_MS
          let fired = false

          // YO — índice apuntando hacia el cuerpo
          if (canDetect && !fired) {
            const checkYo = (buf) => {
              if (buf.length < 6) return false
              const first = buf[0], last = buf[buf.length - 1]
              return (
                isFingersClosedExceptIndex(last.lms) &&
                last.lms[8].z > last.lms[5].z &&
                ((last.s - first.s) < 0 || Math.abs(last.x - first.x) > 0.01 || Math.abs(last.y - first.y) > 0.01)
              )
            }
            if (checkYo(poseHistoryRightRef.current) || checkYo(poseHistoryLeftRef.current)) {
              triggerRecognition('YO', 'Yo'); fired = true
            }
          }

          // TÚ — índice apuntando a la cámara
          if (canDetect && !fired) {
            const checkTu = (buf) => {
              if (buf.length < 8) return false
              const d3 = (a, b) => Math.hypot(a.x-b.x, a.y-b.y, a.z-b.z)
              let valid = 0
              for (const fr of buf.slice(-8)) {
                const l = fr.lms
                if (
                  d3(l[8],l[0])>d3(l[6],l[0]) &&
                  d3(l[12],l[0])<d3(l[10],l[0]) &&
                  d3(l[16],l[0])<d3(l[14],l[0]) &&
                  d3(l[20],l[0])<d3(l[18],l[0]) &&
                  l[8].z < l[5].z - 0.01
                ) valid++
              }
              const f = buf[0], la = buf[buf.length-1]
              return valid >= 5 && Math.abs(la.x-f.x) < 0.12 && Math.abs(la.y-f.y) < 0.12
            }
            if (checkTu(poseHistoryRightRef.current)) {
              triggerRecognition('TÚ', 'Tú'); fired = true
            }
          }

          // GRACIAS — mano cerca de la boca moviéndose en X
          if (canDetect && !fired && poseHistoryRightRef.current.length >= 6 && hasFace) {
            const buf  = poseHistoryRightRef.current
            const f    = buf[0], la = buf[buf.length-1]
            const mouth = results.faceLandmarks[14]
            if (
              Math.abs(f.x - mouth.x) < 0.15 && Math.abs(f.y - mouth.y) < 0.15 &&
              Math.abs(la.x - f.x) > 0.05 && Math.abs(la.y - f.y) < 0.15
            ) { triggerRecognition('GRACIAS', 'Gracias'); fired = true }
          }

          // SÍ — puño asintiendo verticalmente
          if (canDetect && !fired) {
            const checkSi = (buf) => {
              if (buf.length < 8) return false
              let closed = 0
              for (const fr of buf) { if (isFist(fr.lms)) closed++ }
              if (closed < buf.length * 0.6) return false
              let minY=1, maxY=0, minX=1, maxX=0
              for (const fr of buf) {
                const k = fr.lms[5]
                if (k.y<minY) minY=k.y; if (k.y>maxY) maxY=k.y
                if (k.x<minX) minX=k.x; if (k.x>maxX) maxX=k.x
              }
              const ry = maxY-minY, rx = maxX-minX
              return ry > 0.04 && ry > rx*1.5 && buf[0].y > 0.2
            }
            if (checkSi(poseHistoryRightRef.current) || checkSi(poseHistoryLeftRef.current)) {
              triggerRecognition('SÍ', 'Sí'); fired = true
            }
          }

          // POR FAVOR — movimiento circular debajo del rostro
          if (canDetect && !fired && hasPose) {
            const checkPorFavor = (buf) => {
              if (buf.length < 6) return false
              const f = buf[0], la = buf[buf.length-1]
              let boundaryY = 0.5
              if (results.faceLandmarks?.[152]) boundaryY = results.faceLandmarks[152].y
              else if (results.poseLandmarks?.[11] && results.poseLandmarks?.[12])
                boundaryY = Math.min(results.poseLandmarks[11].y, results.poseLandmarks[12].y) - 0.05
              return f.y > boundaryY && la.y > boundaryY && isCircularMovement(buf) && Math.abs(la.x-f.x) < 0.12
            }
            if (checkPorFavor(poseHistoryRightRef.current) || checkPorFavor(poseHistoryLeftRef.current)) {
              triggerRecognition('POR FAVOR', 'Por favor'); fired = true
            }
          }

          // HOLA — barrido horizontal con mano izquierda
          if (canDetect && !fired && poseHistoryLeftRef.current.length >= 6) {
            const buf = poseHistoryLeftRef.current
            const f = buf[0], la = buf[buf.length-1]
            const mx = la.x-f.x, my = la.y-f.y
            if (Math.abs(mx)>Math.abs(my)*1.5 && mx>0.06 && Math.abs(my)<0.15) {
              triggerRecognition('HOLA', 'Hola'); fired = true
            }
          }

          // Movimiento no reconocido
          if (!fired && now - lastDetectionRef.current > HEURISTIC_COOLDOWN_MS) {
            const sig = (buf) => {
              if (buf.length < 10) return false
              return Math.abs(buf[buf.length-1].x-buf[0].x) > 0.15 || Math.abs(buf[buf.length-1].y-buf[0].y) > 0.15
            }
            if (sig(poseHistoryLeftRef.current) || sig(poseHistoryRightRef.current)) {
              setUnrecognized(true)
              setTimeout(() => setUnrecognized(false), 800)
              poseHistoryLeftRef.current  = []
              poseHistoryRightRef.current = []
            }
          }
        }
      }
    } else {
      poseHistoryLeftRef.current  = []
      poseHistoryRightRef.current = []
    }

    setHandVisible(hasLeftHand || hasRightHand)

    // Actualizar modelo 3D en tiempo real (sin causar re-render de React)
    handModelRef.current?.update(
      results.leftHandLandmarks  ?? null,
      results.rightHandLandmarks ?? null
    )

    ctx.restore()
  }

  // ─── Controls ───────────────────────────────────────────────────────────────

  function startDetect() {
    poseHistoryLeftRef.current  = []
    poseHistoryRightRef.current = []
    landmarkBufferRef.current   = []
    frameCountRef.current       = 0
    stabilityRef.current        = { count: 0, prediction: '' }
    lastDetectionRef.current    = 0
    setRunning(true)
  }

  function stopDetect() {
    setRunning(false)
    window?.speechSynthesis?.cancel()
  }

  const handleReset = useCallback(() => {
    setLatest(null)
    setHistory([])
    setSentence([])
    poseHistoryLeftRef.current  = []
    poseHistoryRightRef.current = []
    landmarkBufferRef.current   = []
    frameCountRef.current       = 0
    stabilityRef.current        = { count: 0, prediction: '' }
    lastDetectionRef.current    = 0
    if (sentenceClearTimer.current) clearTimeout(sentenceClearTimer.current)
    window?.speechSynthesis?.cancel()
  }, [])

  function retryMlConnection() {
    setMlConnecting(true)
    fetch(`${ML_API_URL}/health`)
      .then(r => r.json())
      .then(data => {
        const ok = !!data.model_loaded
        mlAvailableRef.current = ok
        setMlMode(ok)
        setMlConnecting(false)
      })
      .catch(() => {
        mlAvailableRef.current = false
        setMlMode(false)
        setMlConnecting(false)
      })
  }

  const statusLabel = (() => {
    if (!running)      return cameraOk ? 'Listo' : 'En espera'
    if (!handVisible)  return 'Esperando mano...'
    if (unrecognized)  return 'No reconocido'
    if (mlMode)        return 'IA interpretando...'
    return 'Detectando movimiento...'
  })()

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <section className="min-h-screen flex flex-col px-4 sm:px-6 py-6 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <button onClick={onBack}
          className="inline-flex items-center gap-2 text-white/85 hover:text-white text-sm font-medium">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Cambiar modo
        </button>

        <div className="flex items-center gap-3">
          {/* Indicador de modo ML */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs">
            <span className={`inline-block h-2 w-2 rounded-full ${
              mlConnecting   ? 'bg-yellow-300 animate-pulse' :
              mlMode         ? 'bg-blue-400 animate-pulse'   : 'bg-white/40'
            }`} />
            <span className="text-white/80">
              {mlConnecting ? 'Conectando IA...' : mlMode ? 'Modo IA' : 'Modo básico'}
            </span>
          </div>

          <ResetButton onClick={handleReset} />

          <button onClick={onHome} className="flex items-center gap-2 group" title="Inicio">
            <span className="hidden sm:block text-xl font-extrabold gradient-text bg-white px-3 py-1 rounded-full shadow-soft">
              Signara
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/95 shadow-soft group-hover:shadow-glow transition">
              <Logo size={28} />
            </span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 animate-fade-up">

        {/* ── Cámara ── */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="relative rounded-4xl overflow-hidden shadow-glow border border-white/70 bg-black aspect-video">
            <video ref={videoRef} autoPlay playsInline muted
              className="absolute inset-0 h-full w-full object-cover"
              style={{ transform: 'scaleX(-1)' }} />
            <canvas ref={canvasRef}
              className="absolute inset-0 h-full w-full pointer-events-none"
              style={{ transform: 'scaleX(-1)' }} />

            {!scriptsLoaded && !scriptsError && (
              <div className="absolute inset-0 flex items-center justify-center text-white/80 text-sm">
                Cargando MediaPipe Holistic...
              </div>
            )}
            {scriptsError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-6">
                <p className="font-semibold text-lg">No se pudo cargar MediaPipe</p>
                <p className="mt-2 text-sm text-white/80">{scriptsError}</p>
              </div>
            )}
            {scriptsLoaded && !cameraOk && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center text-white/80 text-sm">
                Solicitando cámara...
              </div>
            )}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-6">
                <p className="font-semibold text-lg">No se pudo iniciar la cámara</p>
                <p className="mt-2 text-sm text-white/80 max-w-sm">{cameraError}</p>
              </div>
            )}

            {/* Status badge */}
            <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/55 backdrop-blur text-white text-xs">
              <span className={'inline-block h-2 w-2 rounded-full ' +
                (running ? 'bg-red-400 animate-pulse' : cameraOk ? 'bg-green-400' : 'bg-white/60')} />
              {statusLabel}
            </div>

            {/* Última seña detectada */}
            {latest && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full bg-white/95 backdrop-blur text-signara-navy font-bold tracking-wide shadow-soft text-sm">
                {latest.sign} · {Math.round((latest.confidence || 0) * 100)}%
              </div>
            )}
          </div>

          {/* Controles */}
          <div className="flex flex-wrap items-center gap-3">
            {!running ? (
              <button onClick={startDetect} disabled={!cameraOk}
                className="btn-primary py-2.5 px-5 text-sm disabled:opacity-50">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Empezar a interpretar
              </button>
            ) : (
              <button onClick={stopDetect} className="btn-primary py-2.5 px-5 text-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
                Detener
              </button>
            )}
            <label className="ml-auto inline-flex items-center gap-2 text-sm text-white/90 cursor-pointer select-none">
              <input type="checkbox" checked={audioOn} onChange={e => setAudioOn(e.target.checked)}
                className="h-4 w-4 accent-signara-purple" />
              Leer en voz alta
            </label>
          </div>

          {/* Panel de conversación — se llena a medida que se detectan señas */}
          {sentence.length > 0 && (
            <div className="glass-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-signara-purple">
                Conversación
              </p>
              <p className="mt-2 text-signara-navy text-xl font-bold leading-relaxed tracking-wide">
                {sentence.join(' ')}
              </p>
            </div>
          )}
        </div>

        {/* ── Panel lateral ── */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Modelo 3D de manos */}
          <div className="glass-card overflow-hidden p-0 relative">
            <HandModel3D
              ref={handModelRef}
              className="w-full h-52 rounded-2xl"
            />
            <span className="absolute top-2 left-3 text-[10px] font-bold uppercase tracking-[0.3em] text-white/50 pointer-events-none">
              Vista 3D · arrastra para rotar
            </span>
          </div>

          {/* Última detección */}
          <div className="glass-card p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-signara-purple">
              Última detección
            </p>
            {latest ? (
              <div className="mt-2">
                <p className="text-3xl font-extrabold gradient-text">{latest.sign}</p>
                <p className="mt-1 text-signara-navy text-lg leading-relaxed">{latest.text}</p>
                <p className="mt-2 text-xs text-signara-navy/60">
                  Confianza: {Math.round((latest.confidence || 0) * 100)}%
                </p>
              </div>
            ) : (
              <p className="mt-2 italic text-signara-navy/40">
                Pulsa <strong>Empezar a interpretar</strong> y haz una seña.
              </p>
            )}
          </div>

          {/* Historial */}
          <div className="glass-card p-5 flex-1 min-h-[200px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-signara-purple">
              Historial
            </p>
            {history.length === 0 ? (
              <p className="mt-2 italic text-signara-navy/40">Aquí verás cada seña reconocida.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {history.map((h, i) => (
                  <li key={i} className="flex items-baseline gap-3">
                    <span className="chip">{h.sign}</span>
                    <span className="text-signara-navy/80 text-sm flex-1">{h.text}</span>
                    <span className="text-[11px] text-signara-navy/50">
                      {Math.round((h.confidence || 0) * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Instrucciones para activar el modo IA */}
          {!mlMode && !mlConnecting && (
            <div className="glass-card p-4 border border-yellow-300/30">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-600">
                Modo básico activo
              </p>
              <p className="mt-1 text-xs text-signara-navy/70">
                Para activar el reconocimiento con IA, inicia el servidor:
              </p>
              <code className="mt-2 block text-[11px] bg-black/10 rounded p-2 text-signara-navy font-mono leading-relaxed">
                cd sign_ai<br />
                pip install -r requirements_api.txt<br />
                uvicorn api:app --port 8000
              </code>
              <button onClick={retryMlConnection}
                className="mt-3 w-full py-1.5 rounded-lg bg-signara-purple/20 hover:bg-signara-purple/30 text-signara-purple text-xs font-semibold transition">
                Reintentar conexión
              </button>
            </div>
          )}
        </div>
      </div>

      <footer className="mt-6 text-center text-xs text-white/60">
        {mlMode
          ? 'Reconocimiento con IA · LSTM + MediaPipe Holistic'
          : 'Reconocimiento básico · MediaPipe Holistic'}
      </footer>
    </section>
  )
}

function ResetButton({ onClick }) {
  return (
    <button onClick={onClick}
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 text-white text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-white/40"
      title="Reiniciar todo">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5" />
      </svg>
      LIMPIAR
    </button>
  )
}
