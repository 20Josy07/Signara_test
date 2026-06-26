import { useEffect, useRef, useState, useCallback } from 'react'
import { ResetButton, SectionLabel } from './AppShell.jsx'
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
import { INTERPRET_TUTORIAL_STEPS } from '../data/modeTutorialSteps.js'
import { COMPACT_DIM, COMPACT_HAND_DIM, FACE_IDX } from '../data/faceIdx.js'
import { useModeTutorial } from '../hooks/useModeTutorial.js'
import { ML_API_URL, checkMlApiHealth, createMlPredictSocket, getMlApiCache } from '../utils/mlApi.js'

const MEDIAPIPE_HOLISTIC_VER = '0.5.1675471629'
const MEDIAPIPE_CAM_VER      = '0.3.1675466862'
const MEDIAPIPE_DRAW_VER     = '0.3.1675466124'

const MP_SCRIPTS = [
  `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@${MEDIAPIPE_HOLISTIC_VER}/holistic.js`,
  `https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@${MEDIAPIPE_CAM_VER}/camera_utils.js`,
  `https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@${MEDIAPIPE_DRAW_VER}/drawing_utils.js`,
]

// ÔöÇÔöÇ Par├ímetros de reconocimiento en tiempo real ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
const DEFAULT_SEQ_LEN      = 15
const HAND_COUNT           = 21
const UMBRAL               = 0.80
const UMBRAL_HIGH          = 0.88   // confianza alta ÔåÆ menos repeticiones necesarias
const STABILITY_NEED       = 2      // ventanas consecutivas iguales (normal)
const STABILITY_NEED_FAST  = 1      // con confianza ÔëÑ UMBRAL_HIGH
const NO_HAND_RESET        = 20
const SAME_SIGN_WAIT       = 20
const MIN_FRAMES_TO_PREDICT = 4     // m├¡nimo de frames reales antes de la 1┬¬ inferencia
const PREDICT_COOLDOWN_MS  = 80     // ventana deslizante: inferir ~12├ù/s

// ÔöÇÔöÇ Script loader ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

function loadScript(url) {
  return new Promise((resolve, reject) => {
    let s = document.querySelector(`script[data-signara="${url}"]`)
    if (s) {
      if (s.getAttribute('data-loaded') === 'true') return resolve()
      s.addEventListener('load', resolve)
      s.addEventListener('error', () => reject(new Error('Failed: ' + url)))
      return
    }
    s = document.createElement('script')
    s.src = url; s.async = true; s.crossOrigin = 'anonymous'
    s.dataset.signara = url
    s.addEventListener('load', () => { s.setAttribute('data-loaded', 'true'); resolve() })
    s.addEventListener('error', () => reject(new Error('Failed: ' + url)))
    document.head.appendChild(s)
  })
}

async function loadMediaPipe() {
  for (const url of MP_SCRIPTS) await loadScript(url)
}

// ÔöÇÔöÇ Extracci├│n de landmarks ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
//
// CORRECCI├ôN DE ESPEJO:
// Python hace cv2.flip(frame,1) ANTES de MediaPipe ÔåÆ landmarks tienen x espejado.
// El navegador pasa el frame crudo (sin flip) a MediaPipe.
// Fix: x = 1 - x  +  swap leftÔåöright (en frame crudo, la mano derecha anat├│mica
// aparece a la izquierda ÔåÆ leftHandLandmarks; en frame flipado aparece a la derecha
// ÔåÆ right_hand_landmarks).
//
// Resultado: slot lh (primeros 63) = mano izquierda anat├│mica de la persona
//            slot rh (├║ltimos 63)  = mano derecha anat├│mica de la persona
// Igual que en el entrenamiento.

function extractLandmarks(results) {
  const handCoords = (landmarks) => {
    const arr = new Array(HAND_COUNT * 3).fill(0)
    if (landmarks && landmarks.length > 0) {
      const n = Math.min(landmarks.length, HAND_COUNT)
      for (let i = 0; i < n; i++) {
        arr[i * 3]     = 1.0 - (landmarks[i]?.x ?? 0)
        arr[i * 3 + 1] = landmarks[i]?.y ?? 0
        arr[i * 3 + 2] = landmarks[i]?.z ?? 0
      }
    }
    return arr
  }

  const faceCoords = () => {
    const arr = new Array(FACE_IDX.length * 3).fill(0)
    const face = results.faceLandmarks
    if (face && face.length > 0) {
      for (let i = 0; i < FACE_IDX.length; i++) {
        const p = face[FACE_IDX[i]]
        if (!p) continue
        arr[i * 3]     = 1.0 - (p.x ?? 0)
        arr[i * 3 + 1] = p.y ?? 0
        arr[i * 3 + 2] = p.z ?? 0
      }
    }
    return arr
  }

  return [
    ...handCoords(results.rightHandLandmarks),
    ...handCoords(results.leftHandLandmarks),
    ...faceCoords(),
  ]
}

// Pad del buffer al inicio repitiendo el primer frame hasta llegar a SEQ_LEN.
// Igual que: while len(seq) < SEQ_LEN: seq.insert(0, seq[0]) en Python.
function padBuffer(buffer, seqLen) {
  if (buffer.length === 0) return []
  const padded = [...buffer]
  while (padded.length < seqLen) padded.unshift(padded[0])
  return padded.slice(-seqLen)
}

// ÔöÇÔöÇ Componente principal ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ

export default function InterpretScreen({ onBack, onHome }) {
  const videoRef     = useRef(null)
  const canvasRef    = useRef(null)
  const holisticRef  = useRef(null)
  const cameraRef    = useRef(null)
  const runningRef   = useRef(false)
  const audioRef     = useRef(true)

  // Pipeline refs (sin re-render)
  const seqLenRef         = useRef(DEFAULT_SEQ_LEN)
  const compactDimRef     = useRef(COMPACT_DIM)
  const mlSocketRef       = useRef(null)
  const predictHandlerRef = useRef(null)
  const landmarkBufferRef = useRef([])
  const predHistRef       = useRef([])
  const noHandCountRef    = useRef(0)
  const cooldownRef       = useRef(0)    // cooldown frame-based
  const lastSignRef       = useRef('')   // ├║ltima se├▒a confirmada (evita repetir)
  const apiInFlightRef    = useRef(false)
  const lastPredictAtRef  = useRef(0)
  const mlAvailableRef    = useRef(false)
  const sentenceClearRef  = useRef(null)

  // UI state
  const [scriptsLoaded, setScriptsLoaded] = useState(false)
  const [scriptsError,  setScriptsError]  = useState(null)
  const [cameraConsent, setCameraConsent] = useState(null)
  const [cameraRetryKey, setCameraRetryKey] = useState(0)
  const [cameraOk,      setCameraOk]      = useState(false)
  const [cameraError,   setCameraError]   = useState(null)
  const [running,       setRunning]       = useState(false)
  const [mlMode,        setMlMode]        = useState(false)
  const [mlConnecting,  setMlConnecting]  = useState(false)
  const [audioOn,       setAudioOn]       = useState(true)
  const [handVisible,   setHandVisible]   = useState(false)
  const [bufferLen,     setBufferLen]     = useState(0)
  const [liveConf,      setLiveConf]      = useState(0)
  const [inCooldown,    setInCooldown]    = useState(false)
  const [displaySign,   setDisplaySign]   = useState('')
  const [displayConf,   setDisplayConf]   = useState(0)
  const [latest,        setLatest]        = useState(null)
  const [history,       setHistory]       = useState([])
  const [sentence,      setSentence]      = useState([])
  const [seqLen,        setSeqLen]        = useState(DEFAULT_SEQ_LEN)
  const [compactDim,    setCompactDim]    = useState(COMPACT_DIM)

  useEffect(() => { runningRef.current = running }, [running])
  useEffect(() => { audioRef.current   = audioOn  }, [audioOn])

  // ÔöÇÔöÇ Verificar API ML ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  useEffect(() => {
    let cancelled = false
    const cached = getMlApiCache()

    if (cached) {
      mlAvailableRef.current = cached.ok
      setMlMode(cached.ok)
      setMlConnecting(false)
      if (cached.seqLen) {
        seqLenRef.current = cached.seqLen
        setSeqLen(cached.seqLen)
      }
      if (cached.compactDim) {
        compactDimRef.current = cached.compactDim
        setCompactDim(cached.compactDim)
      }
    } else {
      setMlConnecting(true)
    }

    checkMlApiHealth().then((result) => {
      if (cancelled) return
      mlAvailableRef.current = result.ok
      setMlMode(result.ok)
      setMlConnecting(false)
      if (result.seqLen) {
        seqLenRef.current = result.seqLen
        setSeqLen(result.seqLen)
      }
      if (result.compactDim) {
        compactDimRef.current = result.compactDim
        setCompactDim(result.compactDim)
      }
    })

    return () => { cancelled = true }
  }, [])

  // ÔöÇÔöÇ WebSocket ML (menor latencia que HTTP por frame) ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  useEffect(() => {
    if (!mlMode) {
      mlSocketRef.current?.close()
      mlSocketRef.current = null
      return undefined
    }

    const socket = createMlPredictSocket({
      onMessage: (data) => {
        const handler = predictHandlerRef.current
        predictHandlerRef.current = null
        apiInFlightRef.current = false
        if (handler) handler(data)
      },
      onError: () => {
        predictHandlerRef.current = null
        apiInFlightRef.current = false
      },
      onClose: () => {
        mlSocketRef.current = null
      },
    })
    mlSocketRef.current = socket

    return () => socket.close()
  }, [mlMode])

  // ÔöÇÔöÇ Cargar MediaPipe ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  useEffect(() => {
    let cancelled = false
    loadMediaPipe()
      .then(() => { if (!cancelled) setScriptsLoaded(true) })
      .catch(e  => { if (!cancelled) setScriptsError(String(e.message || e)) })
    return () => { cancelled = true }
  }, [])

  // ÔöÇÔöÇ Inicializar Holistic + c├ímara (solo tras consentimiento del usuario) ÔöÇÔöÇÔöÇ
  useEffect(() => {
    if (!scriptsLoaded || cameraConsent !== 'accepted') return
    const HolisticCtor = window.Holistic
    const CameraCtor   = window.Camera
    if (!HolisticCtor || !CameraCtor) {
      setScriptsError('MediaPipe no se carg├│ correctamente.')
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
      refineFaceLandmarks:    true,
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
      width: 320, height: 240,
    })
    cameraRef.current = camera

    camera.start()
      .then(() => setCameraOk(true))
      .catch(e => setCameraError(
        e?.name === 'NotAllowedError'
          ? 'Permiso de c├ímara denegado. Habil├¡talo en tu navegador.'
          : 'No se pudo acceder a la c├ímara.'
      ))

    return () => {
      try { camera.stop()    } catch (_) {}
      try { holistic.close() } catch (_) {}
      holisticRef.current = null
      cameraRef.current   = null
      setCameraOk(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptsLoaded, cameraConsent, cameraRetryKey])

  function acceptCameraPermission() {
    setCameraConsent('accepted')
    setCameraError(null)
    setCameraOk(false)
  }

  function declineCameraPermission() {
    setCameraConsent('declined')
    setCameraError(null)
    setCameraOk(false)
    setRunning(false)
  }

  function retryCameraAccess() {
    setCameraError(null)
    setCameraOk(false)
    setCameraRetryKey((k) => k + 1)
  }

  // ÔöÇÔöÇ Voz ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
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

  // ÔöÇÔöÇ Confirmar se├▒a ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  function triggerRecognition(sign, confidence) {
    const text = sign.replace(/_/g, ' ')
    const det  = { sign, text, confidence }
    setLatest(det)
    setHistory(h => [det, ...h].slice(0, 8))
    setSentence(prev => [...prev, sign].slice(-10))
    if (sentenceClearRef.current) clearTimeout(sentenceClearRef.current)
    sentenceClearRef.current = setTimeout(() => setSentence([]), 6000)
    speak(text)
  }

  // ÔöÇÔöÇ Callback principal de MediaPipe ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  function handleResults(results) {
    const canvas = canvasRef.current
    const video  = videoRef.current
    if (!canvas || !video) return

    canvas.width  = video.videoWidth  || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    ctx.save()
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const hasLeft  = !!results.leftHandLandmarks
    const hasRight = !!results.rightHandLandmarks
    const hasHands = hasLeft || hasRight

    // ÔöÇÔöÇ Solo dibuja manos (igual que 07_gnn_predict.py) ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    if (window.drawConnectors && window.drawLandmarks) {
      if (hasLeft) {
        window.drawConnectors(ctx, results.leftHandLandmarks, window.HAND_CONNECTIONS,
          { color: '#3b82f6', lineWidth: 4 })
        window.drawLandmarks(ctx, results.leftHandLandmarks,
          { color: '#60a5fa', lineWidth: 2, radius: 4 })
      }
      if (hasRight) {
        window.drawConnectors(ctx, results.rightHandLandmarks, window.HAND_CONNECTIONS,
          { color: '#9333ea', lineWidth: 4 })
        window.drawLandmarks(ctx, results.rightHandLandmarks,
          { color: '#c084fc', lineWidth: 2, radius: 4 })
      }
    }

    ctx.restore()

    setHandVisible(hasHands)

    // Cooldown frame-based (decrementa cada frame)
    if (cooldownRef.current > 0) {
      cooldownRef.current--
      setInCooldown(cooldownRef.current > 0)
    }

    // ÔöÇÔöÇ Sin manos ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    if (!hasHands) {
      noHandCountRef.current++
      if (noHandCountRef.current >= NO_HAND_RESET) {
        // Reset completo igual que Python
        landmarkBufferRef.current = []
        predHistRef.current       = []
        lastSignRef.current       = ''
        cooldownRef.current       = 0
        setDisplaySign('')
        setDisplayConf(0)
        setBufferLen(0)
        setLiveConf(0)
        setInCooldown(false)
      }
      return
    }

    // ÔöÇÔöÇ Con manos ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
    noHandCountRef.current = 0

    const currFrame = extractLandmarks(results)

    // Acumular cada frame con manos visibles (ventana deslizante)
    landmarkBufferRef.current.push(currFrame)
    const maxLen = seqLenRef.current * 2
    if (landmarkBufferRef.current.length > maxLen) {
      landmarkBufferRef.current.shift()
    }

    const n = landmarkBufferRef.current.length
    const activeSeqLen = seqLenRef.current
    setBufferLen(n)

    // ÔöÇÔöÇ Inferencia con ventana deslizante (no esperar a llenar SEQ_LEN) ÔöÇÔöÇÔöÇÔöÇÔöÇ
    if (
      runningRef.current        &&
      mlAvailableRef.current    &&
      n >= MIN_FRAMES_TO_PREDICT &&
      cooldownRef.current === 0 &&
      !apiInFlightRef.current   &&
      Date.now() - lastPredictAtRef.current >= PREDICT_COOLDOWN_MS
    ) {
      const bufferCopy = padBuffer([...landmarkBufferRef.current], activeSeqLen)
      const payload = compactDimRef.current === COMPACT_HAND_DIM
        ? bufferCopy.map((f) => f.slice(0, COMPACT_HAND_DIM))
        : bufferCopy
      apiInFlightRef.current = true
      lastPredictAtRef.current = Date.now()

      const applyPrediction = ({ prediction, confidence, is_idle, error }) => {
        if (error) return

        setLiveConf(confidence)

        if (is_idle || !prediction) {
          if (confidence < 0.45) predHistRef.current = []
          return
        }

        if (confidence >= UMBRAL) {
          predHistRef.current.push(prediction)
          const need = confidence >= UMBRAL_HIGH ? STABILITY_NEED_FAST : STABILITY_NEED
          if (predHistRef.current.length > need) {
            predHistRef.current.shift()
          }

          if (
            predHistRef.current.length >= need &&
            new Set(predHistRef.current).size === 1 &&
            prediction !== lastSignRef.current
          ) {
            lastSignRef.current       = prediction
            cooldownRef.current       = SAME_SIGN_WAIT
            landmarkBufferRef.current = []
            predHistRef.current       = []

            setDisplaySign(prediction)
            setDisplayConf(confidence)
            setBufferLen(0)
            setLiveConf(confidence)
            setInCooldown(true)
            triggerRecognition(prediction, confidence)
          }
        } else if (confidence < 0.45) {
          predHistRef.current = []
        }
      }

      const socket = mlSocketRef.current
      if (socket?.ready && socket.send(payload)) {
        predictHandlerRef.current = applyPrediction
        return
      }

      ;(async () => {
        try {
          const resp = await fetch(`${ML_API_URL}/predict`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ frames: payload }),
          })
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
          applyPrediction(await resp.json())
        } catch {
          mlAvailableRef.current = false
          setMlMode(false)
        } finally {
          apiInFlightRef.current = false
        }
      })()
    }
  }

  // ÔöÇÔöÇ Controles ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  function startDetect() {
    landmarkBufferRef.current = []
    predHistRef.current       = []
    noHandCountRef.current    = 0
    cooldownRef.current       = 0
    lastSignRef.current       = ''
    apiInFlightRef.current    = false
    lastPredictAtRef.current  = 0
    setBufferLen(0)
    setLiveConf(0)
    setInCooldown(false)
    setDisplaySign('')
    setDisplayConf(0)
    setRunning(true)
  }

  function stopDetect() {
    setRunning(false)
    window?.speechSynthesis?.cancel()
  }

  const handleReset = useCallback(() => {
    landmarkBufferRef.current = []
    predHistRef.current       = []
    noHandCountRef.current    = 0
    cooldownRef.current       = 0
    lastSignRef.current       = ''
    apiInFlightRef.current    = false
    lastPredictAtRef.current  = 0
    setLatest(null)
    setHistory([])
    setSentence([])
    setDisplaySign('')
    setDisplayConf(0)
    setBufferLen(0)
    setLiveConf(0)
    setInCooldown(false)
    if (sentenceClearRef.current) clearTimeout(sentenceClearRef.current)
    window?.speechSynthesis?.cancel()
  }, [])

  function retryMlConnection() {
    setMlConnecting(true)
    checkMlApiHealth({ force: true })
      .then((result) => {
        mlAvailableRef.current = result.ok
        setMlMode(result.ok)
        setMlConnecting(false)
      })
  }

  // ÔöÇÔöÇ Status HUD ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  const statusLabel = (() => {
    if (cameraConsent === null)    return 'Permiso requerido'
    if (cameraConsent === 'declined') return 'C├ímara desactivada'
    if (!cameraOk && cameraError)  return 'Sin acceso a c├ímara'
    if (!running)                  return cameraOk ? 'Listo' : 'ConectandoÔÇª'
    if (!mlMode)                   return 'ÔÜá Servidor IA no conectado'
    if (!handVisible)              return 'Muestra una mano'
    if (displaySign && inCooldown) return `${displaySign.replace(/_/g, ' ')} ┬À ${Math.round(displayConf * 100)}%`
    if (liveConf >= UMBRAL)        return `ReconociendoÔÇª ${Math.round(liveConf * 100)}%`
    if (bufferLen >= MIN_FRAMES_TO_PREDICT) return `AnalizandoÔÇª ${Math.round(liveConf * 100)}%`
    if (bufferLen > 0)             return 'Capturando se├▒aÔÇª'
    return 'Haz la se├▒a'
  })()

  const bufferProgress = running && mlMode && handVisible && !inCooldown
    ? Math.min(100, Math.round(
        bufferLen < MIN_FRAMES_TO_PREDICT
          ? (bufferLen / MIN_FRAMES_TO_PREDICT) * 25
          : 25 + liveConf * 75
      ))
    : 0
  const confPct = latest ? Math.round((latest.confidence || 0) * 100) : 0

  const tutorial = useModeTutorial('interpret')

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
                <SectionLabel color="blue">Interpretar</SectionLabel>
                <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                  De se├▒as a{' '}
                  <span className="inline-block rounded-xl border-2 border-pastel-blue-line bg-pastel-blue px-2.5 py-0.5 shadow-[0_8px_18px_-8px_rgba(45,42,38,0.35)]">
                    texto
                  </span>
                </h1>
                <p className="mt-3 max-w-lg text-sm font-semibold text-pastel-sub sm:text-base">
                  Muestra tus manos a la c├ímara y Signara las convertir├í en palabras.
                </p>
              </div>

              <AppPageStagger className="flex flex-wrap gap-2">
                <MlStatusPill
                  mlMode={mlMode}
                  mlConnecting={mlConnecting}
                  onRetry={!mlMode && !mlConnecting ? retryMlConnection : undefined}
                />
                {running && (
                  <StatusPill variant="live">
                    <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                    Detectando
                  </StatusPill>
                )}
                {history.length > 0 && (
                  <StatusPill variant="count">{history.length} detectadas</StatusPill>
                )}
              </AppPageStagger>
            </AppPageHeading>

            <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
              <AppPageStagger className="flex flex-col gap-5 lg:col-span-7">
                <div
                  data-tutorial="interpret-camera"
                  className={
                    'relative overflow-hidden rounded-[2rem] border-[3px] shadow-[0_24px_50px_-28px_rgba(147,190,240,0.75)] ' +
                    (running && handVisible
                      ? 'border-pastel-grape bg-gradient-to-br from-pastel-blue via-pastel-blue to-pastel-purple/40'
                      : 'border-pastel-blue-line bg-pastel-blue')
                  }
                >
                  {running && displaySign && (
                    <div className="pointer-events-none absolute inset-0 z-10 rounded-[1.85rem] ring-4 ring-pastel-grape/25 animate-pulse" />
                  )}

                  <div className="p-4 pb-0 sm:p-5 sm:pb-0">
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-pastel-ink/70">
                          ­ƒôÀ Tu c├ímara
                        </p>
                        <p className="mt-0.5 text-lg font-extrabold text-pastel-ink">{statusLabel}</p>
                      </div>
                      {running && mlMode && handVisible && bufferLen > 0 && !inCooldown && (
                        <div className="shrink-0 rounded-xl border-2 border-white/60 bg-white/80 px-3 py-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-pastel-sub">Confianza</p>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="h-2 w-20 overflow-hidden rounded-full bg-pastel-blue/50">
                              <div
                                className="h-full rounded-full transition-all duration-150"
                                style={{
                                  width: `${bufferProgress}%`,
                                  background: liveConf >= UMBRAL ? '#94D08E' : '#E9CF7E',
                                }}
                              />
                            </div>
                            <span className="text-xs font-bold tabular-nums text-pastel-ink">
                              {liveConf > 0 ? `${Math.round(liveConf * 100)}%` : 'ÔÇª'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="relative mx-4 mb-4 aspect-video overflow-hidden rounded-[1.25rem] border-2 border-white/70 bg-black shadow-inner sm:mx-5 sm:mb-5">
                    <video ref={videoRef} autoPlay playsInline muted
                      className="absolute inset-0 h-full w-full object-cover"
                      style={{ transform: 'scaleX(-1)' }} />
                    <canvas ref={canvasRef}
                      className="absolute inset-0 h-full w-full pointer-events-none"
                      style={{ transform: 'scaleX(-1)' }} />

                    {!scriptsLoaded && !scriptsError && (
                      <CameraOverlay icon="ÔÅ│" title="Cargando MediaPipeÔÇª" />
                    )}
                    {scriptsError && (
                      <CameraOverlay icon="ÔÜá´©Å" title="Error cargando MediaPipe" subtitle={scriptsError} />
                    )}
                    {scriptsLoaded && cameraConsent === 'accepted' && !cameraOk && !cameraError && (
                      <CameraOverlay icon="­ƒôÀ" title="Conectando c├ímaraÔÇª" />
                    )}
                    {cameraError && (
                      <CameraOverlay
                        icon="­ƒÜ½"
                        title="No se pudo iniciar la c├ímara"
                        subtitle={cameraError}
                        actionLabel="Reintentar"
                        onAction={retryCameraAccess}
                      />
                    )}

                    {running && !mlMode && !mlConnecting && (
                      <div className="absolute inset-0 flex items-center justify-center bg-pastel-ink/75 p-6 backdrop-blur-sm">
                        <div className="max-w-sm rounded-2xl border-2 border-pastel-blue-line bg-[#FAF6EC] p-5 text-center shadow-xl">
                          <p className="text-3xl">ÔÜá´©Å</p>
                          <p className="mt-2 text-lg font-extrabold text-pastel-ink">Servidor IA no conectado</p>
                          <p className="mt-1 text-xs font-semibold text-pastel-sub">Ejecuta en una terminal:</p>
                          <code className="mt-3 block rounded-xl border-2 border-pastel-ink/10 bg-white px-3 py-2 text-left text-[11px] font-mono text-pastel-grape">
                            cd sign_ai &amp;&amp; uvicorn api:app --port 8000
                          </code>
                          <button
                            onClick={retryMlConnection}
                            className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-pastel-grape px-5 text-sm font-bold text-white transition hover:brightness-110"
                          >
                            Reintentar conexi├│n
                          </button>
                        </div>
                      </div>
                    )}

                    {displaySign && (
                      <div className="absolute bottom-3 left-1/2 z-20 max-w-[90%] -translate-x-1/2 rounded-xl border-2 border-pastel-grape bg-white px-4 py-2 text-center shadow-[0_8px_24px_-8px_rgba(126,100,201,0.5)]">
                        <p className="text-base font-extrabold uppercase tracking-wide text-pastel-grape sm:text-lg">
                          {displaySign.replace(/_/g, ' ')}
                        </p>
                        <p className="text-[11px] font-bold text-pastel-sub">{Math.round(displayConf * 100)}% confianza</p>
                      </div>
                    )}

                    <div className="absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded-xl border-2 border-white/20 bg-black/50 px-2.5 py-1.5 text-xs font-bold text-white backdrop-blur">
                      <span className={'h-2 w-2 rounded-full ' + (running ? 'bg-red-400 animate-pulse' : cameraOk ? 'bg-green-400' : 'bg-white/50')} />
                      {running ? 'REC' : cameraOk ? 'Lista' : 'ÔÇª'}
                    </div>
                  </div>

                  {scriptsLoaded && cameraConsent === null && (
                    <CameraPermissionPrompt
                      onAccept={acceptCameraPermission}
                      onDecline={declineCameraPermission}
                    />
                  )}
                  {scriptsLoaded && cameraConsent === 'declined' && !cameraOk && (
                    <CameraOverlay
                      icon="­ƒôÀ"
                      title="C├ímara no activada"
                      subtitle="Sin permiso de c├ímara no podemos interpretar tus se├▒as. Puedes concederlo cuando quieras."
                      actionLabel="Conceder permisos"
                      onAction={acceptCameraPermission}
                    />
                  )}

                  {/* Controles */}
                  <div className="flex flex-wrap items-center gap-3 border-t-2 border-white/40 px-4 py-4 sm:px-5" data-tutorial="interpret-start">
                    {!running ? (
                      <button
                        onClick={startDetect}
                        disabled={!cameraOk}
                        className="inline-flex h-11 items-center gap-2 rounded-xl bg-pastel-grape px-5 text-sm font-bold text-white shadow-[0_8px_20px_-6px_rgba(126,100,201,0.6)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <PlayIcon />
                        Empezar a interpretar
                      </button>
                    ) : (
                      <button
                        onClick={stopDetect}
                        className="inline-flex h-11 items-center gap-2 rounded-xl border-2 border-pastel-ink/20 bg-white px-5 text-sm font-bold text-pastel-ink transition hover:bg-pastel-cream"
                      >
                        <StopIcon />
                        Detener
                      </button>
                    )}

                    <label className="ml-auto inline-flex cursor-pointer select-none items-center gap-2 rounded-xl border-2 border-white/60 bg-white/80 px-3 py-2 text-sm font-bold text-pastel-ink">
                      <input
                        type="checkbox"
                        checked={audioOn}
                        onChange={(e) => setAudioOn(e.target.checked)}
                        className="h-4 w-4 accent-pastel-grape"
                      />
                      ­ƒöè Voz alta
                    </label>
                  </div>
                </div>

                {sentence.length > 0 && (
                  <OutputCard title="Conversaci├│n" emptyIcon="­ƒÆ¼" hasContent>
                    <p className="text-xl font-extrabold leading-relaxed tracking-wide text-pastel-ink sm:text-2xl">
                      {sentence.map((s) => s.replace(/_/g, ' ')).join(' ')}
                    </p>
                  </OutputCard>
                )}

                {!running && !history.length && (
                  <div className="rounded-2xl border-2 border-dashed border-pastel-blue-line bg-pastel-blue/40 px-4 py-4 text-center">
                    <p className="text-sm font-bold text-pastel-ink">
                      Pulsa <strong className="text-pastel-grape">Empezar a interpretar</strong> y mant├®n cada se├▒a unos segundos, clara y estable, antes de cambiar.
                    </p>
                  </div>
                )}
              </AppPageStagger>

              <AppPageStagger className="flex flex-col gap-5 lg:col-span-5">
                <div
                  data-tutorial="interpret-results"
                  className="motion-surface animate-motion-scale-in rounded-[1.5rem] border-[3px] border-pastel-blue-line bg-white p-5 shadow-[0_16px_36px_-22px_rgba(45,42,38,0.35)] sm:p-6"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-pastel-grape">├Ültima se├▒a</p>
                  {latest ? (
                    <>
                      <p className="mt-3 text-4xl font-extrabold uppercase tracking-tight text-pastel-grape sm:text-5xl">
                        {latest.sign.replace(/_/g, ' ')}
                      </p>
                      <div className="mt-4">
                        <div className="mb-1 flex justify-between text-xs font-bold text-pastel-sub">
                          <span>Confianza</span>
                          <span>{confPct}%</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full border border-pastel-ink/10 bg-pastel-cream">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-pastel-blue-line to-pastel-grape transition-all duration-500"
                            style={{ width: `${confPct}%` }}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="mt-4 flex flex-col items-center rounded-xl border-2 border-dashed border-pastel-ink/10 bg-pastel-cream/50 px-4 py-8 text-center">
                      <span className="text-4xl opacity-50">­ƒñƒ</span>
                      <p className="mt-2 text-sm font-semibold text-pastel-sub">
                        Aqu├¡ aparecer├í la se├▒a reconocida
                      </p>
                    </div>
                  )}
                </div>

                {/* Historial */}
                <div data-tutorial="interpret-history">
                <OutputCard
                  title="Historial reciente"
                  emptyIcon="­ƒôï"
                  hasContent={history.length > 0}
                  empty="Cada se├▒a reconocida aparecer├í aqu├¡."
                >
                  <ul className="space-y-2">
                    {history.map((h, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-3 rounded-xl border-2 border-pastel-blue-line/50 bg-pastel-blue/20 px-3 py-2"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-extrabold text-pastel-grape">
                          {i + 1}
                        </span>
                        <span className="flex-1 text-sm font-bold text-pastel-ink">{h.sign.replace(/_/g, ' ')}</span>
                        <span className="text-xs font-extrabold text-pastel-sub">{Math.round((h.confidence || 0) * 100)}%</span>
                      </li>
                    ))}
                  </ul>
                </OutputCard>
                </div>
              </AppPageStagger>
            </div>
        </AppPagePanel>
      </AppPageMain>

      <AppPageFooter>
        <p className="text-xs text-pastel-sub">GNN + LSTM ┬À solo manos ┬À MediaPipe Holistic</p>
      </AppPageFooter>

      <ModeTutorial
        mode="interpret"
        steps={INTERPRET_TUTORIAL_STEPS}
        open={tutorial.open}
        onComplete={tutorial.finish}
      />
    </AppPage>
  )
}

function StatusPill({ variant, children }) {
  const styles = {
    live: 'border-pastel-grape bg-pastel-grape text-white shadow-[0_6px_16px_-6px_rgba(126,100,201,0.6)]',
    count: 'border-pastel-blue-line bg-pastel-blue text-pastel-ink',
  }
  return (
    <span className={'inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-bold ' + styles[variant]}>
      {children}
    </span>
  )
}

function MlStatusPill({ mlMode, mlConnecting, onRetry }) {
  const connected = mlMode && !mlConnecting
  const label = mlConnecting ? 'Conectando IAÔÇª' : mlMode ? 'IA conectada' : 'Sin conexi├│n IA'
  return (
    <button
      type="button"
      onClick={onRetry}
      disabled={!onRetry}
      className={
        'inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-bold transition ' +
        (connected
          ? 'border-pastel-green-line bg-pastel-green text-pastel-ink cursor-default'
          : mlConnecting
            ? 'border-pastel-yellow-line bg-pastel-yellow text-pastel-ink cursor-default'
            : 'border-pastel-pink/50 bg-white text-pastel-sub hover:border-pastel-purple-line cursor-pointer')
      }
      title={onRetry ? 'Reintentar conexi├│n con IA' : undefined}
    >
      <span className={`h-2 w-2 rounded-full ${
        mlConnecting ? 'bg-pastel-yellow-line animate-pulse' :
        mlMode ? 'bg-pastel-green-line animate-pulse' : 'bg-pastel-sub/40'
      }`} />
      {label}
    </button>
  )
}

function OutputCard({ title, empty, emptyIcon, hasContent, children }) {
  return (
    <div className="motion-surface rounded-[1.5rem] border-2 border-pastel-ink/10 bg-white p-4 shadow-[0_14px_30px_-24px_rgba(45,42,38,0.35)] sm:p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-pastel-grape">{title}</p>
      <div className="mt-3">
        {hasContent ? children : (
          <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-pastel-ink/10 bg-pastel-cream/50 px-4 py-6 text-center">
            {emptyIcon && <span className="text-3xl opacity-50">{emptyIcon}</span>}
            <p className="mt-2 text-sm font-semibold text-pastel-sub">{empty}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function CameraPermissionPrompt({ onAccept, onDecline }) {
  return (
    <div className="absolute inset-0 z-30 flex animate-permission-overlay-in items-center justify-center overflow-y-auto bg-pastel-ink/78 p-3 sm:p-5">
      <div className="my-auto w-full max-w-sm animate-permission-card-in rounded-2xl border-2 border-pastel-blue-line bg-[#FAF6EC] p-4 text-center shadow-xl sm:p-5">
        <p
          className="animate-float text-2xl sm:text-3xl"
          style={{ animationDuration: '3.5s' }}
          aria-hidden="true"
        >
          ­ƒôÀ
        </p>
        <p className="animate-permission-item-in mt-2 text-base font-extrabold text-pastel-ink sm:text-lg">
          Necesitamos tu c├ímara
        </p>
        <p
          className="animate-permission-item-in mt-2 text-xs leading-relaxed text-pastel-sub sm:text-sm"
          style={{ animationDelay: '80ms' }}
        >
          Para interpretar lengua de se├▒as, Signara necesita acceso a la c├ímara de tu dispositivo.
          Si no concedes el permiso, esta funci├│n no estar├í disponible.
        </p>
        <div
          className="animate-permission-item-in mt-4 flex flex-col gap-2 sm:mt-5 sm:flex-row sm:justify-center"
          style={{ animationDelay: '160ms' }}
        >
          <button
            type="button"
            onClick={onAccept}
            className="motion-press inline-flex h-11 w-full items-center justify-center rounded-xl bg-pastel-grape px-5 text-sm font-bold text-white transition hover:brightness-110 sm:w-auto"
          >
            Conceder permisos
          </button>
          <button
            type="button"
            onClick={onDecline}
            className="motion-press inline-flex h-11 w-full items-center justify-center rounded-xl border-2 border-pastel-ink/15 bg-white px-5 text-sm font-bold text-pastel-sub transition hover:text-pastel-ink sm:w-auto"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  )
}

function CameraOverlay({ icon, title, subtitle, actionLabel, onAction }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center overflow-y-auto bg-pastel-ink/78 p-3 text-center backdrop-blur-sm sm:p-5">
      <div className="my-auto w-full max-w-sm rounded-2xl border-2 border-pastel-blue-line bg-[#FAF6EC] p-4 shadow-xl sm:p-5">
        <span className="text-3xl sm:text-4xl" aria-hidden="true">
          {icon}
        </span>
        <p className="mt-3 text-base font-extrabold text-pastel-ink sm:text-lg">{title}</p>
        {subtitle && (
          <p className="mt-2 text-xs font-semibold leading-relaxed text-pastel-sub sm:text-sm">{subtitle}</p>
        )}
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="motion-press mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-pastel-grape px-5 text-sm font-bold text-white transition hover:brightness-110 sm:w-auto"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  )
}
