import { useEffect, useRef, useState, useCallback } from 'react'
import Logo from './Logo.jsx'

/**
 * InterpretScreen
 *
 * Real-time hand-wave detection using MediaPipe Holistic.
 * Detected gestures: "HOLA", "GRACIAS", "POR FAVOR", "TÚ", "YO", "SÍ".
 */

const MEDIAPIPE_HOLISTIC_VER = '0.5.1675471629'
const MEDIAPIPE_CAM_VER = '0.3.1675466862'
const MEDIAPIPE_DRAW_VER = '0.3.1675466124'

const MP_SCRIPTS = [
  `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@${MEDIAPIPE_HOLISTIC_VER}/holistic.js`,
  `https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@${MEDIAPIPE_CAM_VER}/camera_utils.js`,
  `https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@${MEDIAPIPE_DRAW_VER}/drawing_utils.js`
]

const HISTORY_LEN = 20
const COOLDOWN_MS = 2000

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
    s.addEventListener('load', () => {
      s.setAttribute('data-loaded', 'true')
      resolve()
    })
    s.addEventListener('error', () => reject(new Error('Failed to load ' + url)))
    document.head.appendChild(s)
  })
}
async function loadMediaPipe() {
  for (const url of MP_SCRIPTS) await loadScript(url)
}

export default function InterpretScreen({ onBack, onHome }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const holisticRef = useRef(null)
  const cameraRef = useRef(null)

  const poseHistoryLeftRef = useRef([])
  const poseHistoryRightRef = useRef([])
  const lastDetectionRef = useRef(0)
  const runningRef = useRef(false)
  const audioRef = useRef(true)

  const [scriptsLoaded, setScriptsLoaded] = useState(false)
  const [scriptsError, setScriptsError] = useState(null)
  const [cameraOk, setCameraOk] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [running, setRunning] = useState(false)
  const [handVisible, setHandVisible] = useState(false)
  const [latest, setLatest] = useState(null)
  const [history, setHistory] = useState([])
  const [audioOn, setAudioOn] = useState(true)
  const [unrecognized, setUnrecognized] = useState(false)

  useEffect(() => { runningRef.current = running }, [running])
  useEffect(() => { audioRef.current = audioOn }, [audioOn])

  useEffect(() => {
    let cancelled = false
    loadMediaPipe()
      .then(() => { if (!cancelled) setScriptsLoaded(true) })
      .catch((e) => {
        console.error('[InterpretScreen] MediaPipe load failed:', e)
        if (!cancelled) setScriptsError(String(e.message || e))
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!scriptsLoaded) return
    const HolisticCtor = window.Holistic
    const CameraCtor = window.Camera
    if (!HolisticCtor || !CameraCtor) {
      setScriptsError('MediaPipe no se cargó correctamente.')
      return
    }
    const videoEl = videoRef.current
    if (!videoEl) return

    const holistic = new HolisticCtor({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@${MEDIAPIPE_HOLISTIC_VER}/${file}`
    })
    holistic.setOptions({
      modelComplexity: 0,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      refineFaceLandmarks: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    })
    holistic.onResults(handleResults)
    holisticRef.current = holistic

    const camera = new CameraCtor(videoEl, {
      onFrame: async () => {
        if (holisticRef.current && videoEl.readyState >= 2) {
          try { await holisticRef.current.send({ image: videoEl }) } catch (_) { }
        }
      },
      width: 640,
      height: 480
    })
    cameraRef.current = camera

    camera.start()
      .then(() => setCameraOk(true))
      .catch((e) => {
        console.error('[InterpretScreen] camera start failed:', e)
        setCameraError(
          e && e.name === 'NotAllowedError'
            ? 'Permiso de cámara denegado. Habilítalo en tu navegador.'
            : 'No se pudo acceder a la cámara.'
        )
      })

    return () => {
      try { camera.stop() } catch (_) { }
      try { holistic.close() } catch (_) { }
      holisticRef.current = null
      cameraRef.current = null
    }
  }, [scriptsLoaded])

  const isFingersClosedExceptIndex = (landmarks) => {
    const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z)
    const indexExtended = dist(landmarks[8], landmarks[0]) > dist(landmarks[6], landmarks[0])
    const middleClosed = dist(landmarks[12], landmarks[0]) < dist(landmarks[10], landmarks[0])
    const ringClosed = dist(landmarks[16], landmarks[0]) < dist(landmarks[14], landmarks[0])
    const pinkyClosed = dist(landmarks[20], landmarks[0]) < dist(landmarks[18], landmarks[0])
    return indexExtended && middleClosed && ringClosed && pinkyClosed
  }

  const isHandOpen = (landmarks) => {
    const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z)
    const indexExtended = dist(landmarks[8], landmarks[0]) > dist(landmarks[6], landmarks[0])
    const middleExtended = dist(landmarks[12], landmarks[0]) > dist(landmarks[10], landmarks[0])
    const ringExtended = dist(landmarks[16], landmarks[0]) > dist(landmarks[14], landmarks[0])
    const pinkyExtended = dist(landmarks[20], landmarks[0]) > dist(landmarks[18], landmarks[0])
    return indexExtended && middleExtended && ringExtended && pinkyExtended
  }

  const isFist = (landmarks) => {
    const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z)
    const indexClosed = dist(landmarks[8], landmarks[0]) < dist(landmarks[5], landmarks[0])
    const middleClosed = dist(landmarks[12], landmarks[0]) < dist(landmarks[9], landmarks[0])
    const ringClosed = dist(landmarks[16], landmarks[0]) < dist(landmarks[13], landmarks[0])
    const pinkyClosed = dist(landmarks[20], landmarks[0]) < dist(landmarks[17], landmarks[0])
    return indexClosed && middleClosed && ringClosed && pinkyClosed
  }

  const isCircularMovement = (history) => {
    if (history.length < 8) return false
    let minX = 1, maxX = 0, minY = 1, maxY = 0
    history.forEach(p => {
      if (p.x < minX) minX = p.x
      if (p.x > maxX) maxX = p.x
      if (p.y < minY) minY = p.y
      if (p.y > maxY) maxY = p.y
    })
    const rangeX = maxX - minX
    const rangeY = maxY - minY
    
    // Basta con que el movimiento no sea un punto inmóvil
    if (rangeX < 0.03 || rangeY < 0.03) return false
    
    // Y que no sea puramente una línea vertical u horizontal extrema
    const ratio = rangeX / rangeY
    if (ratio < 0.25 || ratio > 4.0) return false
    
    return true
  }

  function handleResults(results) {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    ctx.save()
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const hasLeftHand = !!results.leftHandLandmarks
    const hasRightHand = !!results.rightHandLandmarks
    const hasFace = !!results.faceLandmarks
    const hasPose = !!results.poseLandmarks

    if (window.drawConnectors && window.drawLandmarks) {
      if (hasPose) {
        window.drawConnectors(ctx, results.poseLandmarks, window.POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 4 })
        window.drawLandmarks(ctx, results.poseLandmarks, { color: '#FF0000', lineWidth: 2 })
      }
      if (hasFace) {
        window.drawConnectors(ctx, results.faceLandmarks, window.FACEMESH_TESSELATION, { color: '#C0C0C070', lineWidth: 1 })
        window.drawConnectors(ctx, results.faceLandmarks, window.FACEMESH_RIGHT_EYE, { color: '#FF3030' })
        window.drawConnectors(ctx, results.faceLandmarks, window.FACEMESH_RIGHT_EYEBROW, { color: '#FF3030' })
        window.drawConnectors(ctx, results.faceLandmarks, window.FACEMESH_LEFT_EYE, { color: '#30FF30' })
        window.drawConnectors(ctx, results.faceLandmarks, window.FACEMESH_LEFT_EYEBROW, { color: '#30FF30' })
        window.drawConnectors(ctx, results.faceLandmarks, window.FACEMESH_FACE_OVAL, { color: '#E0E0E0' })
        window.drawConnectors(ctx, results.faceLandmarks, window.FACEMESH_LIPS, { color: '#E0E0E0' })
      }
      if (hasRightHand) {
        window.drawConnectors(ctx, results.rightHandLandmarks, window.HAND_CONNECTIONS, { color: '#9333ea', lineWidth: 5 })
        window.drawLandmarks(ctx, results.rightHandLandmarks, { color: '#3b82f6', lineWidth: 2, radius: 4 })
      }
      if (hasLeftHand) {
        window.drawConnectors(ctx, results.leftHandLandmarks, window.HAND_CONNECTIONS, { color: '#3b82f6', lineWidth: 5 })
        window.drawLandmarks(ctx, results.leftHandLandmarks, { color: '#9333ea', lineWidth: 2, radius: 4 })
      }
    }

    if (hasLeftHand || hasRightHand) {
      const now = Date.now()

      if (hasLeftHand) {
        const lms = results.leftHandLandmarks
        const wrist = lms[0]
        const size = Math.sqrt(Math.pow(lms[0].x - lms[9].x, 2) + Math.pow(lms[0].y - lms[9].y, 2))
        poseHistoryLeftRef.current.push({ x: wrist.x, y: wrist.y, s: size, lms })
        if (poseHistoryLeftRef.current.length > HISTORY_LEN) poseHistoryLeftRef.current.shift()
      } else {
        poseHistoryLeftRef.current = []
      }

      if (hasRightHand) {
        const lms = results.rightHandLandmarks
        const wrist = lms[0]
        const size = Math.sqrt(Math.pow(lms[0].x - lms[9].x, 2) + Math.pow(lms[0].y - lms[9].y, 2))
        poseHistoryRightRef.current.push({ x: wrist.x, y: wrist.y, s: size, lms })
        if (poseHistoryRightRef.current.length > HISTORY_LEN) poseHistoryRightRef.current.shift()
      } else {
        poseHistoryRightRef.current = []
      }

      if (runningRef.current) {
        let recognized = false
        const canDetect = now - lastDetectionRef.current > COOLDOWN_MS

        // --- YO ---
        if (canDetect && !recognized) {
          const checkYo = (historyBuf) => {
            if (historyBuf.length < 6) return false
            const first = historyBuf[0]
            const last = historyBuf[historyBuf.length - 1]
            const isIndexOnly = isFingersClosedExceptIndex(last.lms)
            
            // Para "Yo", el índice apunta hacia el cuerpo (z es mayor o positivo comparado a la base 5)
            const pointingBackward = last.lms[8].z > last.lms[5].z
            
            // Movimiento: la mano suele acercarse al cuerpo (disminuye la escala) o se mueve ligeramente
            const movedTowardsBody = (last.s - first.s) < 0 || Math.abs(last.x - first.x) > 0.01 || Math.abs(last.y - first.y) > 0.01
            
            return isIndexOnly && pointingBackward && movedTowardsBody
          }

          if (checkYo(poseHistoryRightRef.current) || checkYo(poseHistoryLeftRef.current)) {
            triggerRecognition('YO', 'Yo')
            recognized = true
          }
        }

        // --- TÚ ---
        // Gesto: mano derecha, dedo índice extendido apuntando directo a la cámara
        if (canDetect && !recognized) {
          const checkTu = (historyBuf) => {
            // Necesitamos al menos 8 frames para confirmar el gesto estático
            if (historyBuf.length < 8) return false;

            const dist3D = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z);

            // Evaluar los últimos 8 frames con dos verificaciones complementarias:
            // 1) La forma de la mano: índice extendido en 3D, otros dedos cerrados
            // 2) La dirección: la punta del índice (8) está más cerca de la cámara que su nudillo MCP (5) en Z
            const recentFrames = historyBuf.slice(-8);
            let validFrames = 0;

            for (const frame of recentFrames) {
              const lms = frame.lms;

              // A) Índice extendido en 3D: punta (8) más lejos de la muñeca (0) que el PIP (6)
              const indexExtended3D = dist3D(lms[8], lms[0]) > dist3D(lms[6], lms[0]);

              // B) Otros dedos cerrados en 3D: punta más cerca de la muñeca que el primer nudillo
              const middleClosed3D = dist3D(lms[12], lms[0]) < dist3D(lms[10], lms[0]);
              const ringClosed3D   = dist3D(lms[16], lms[0]) < dist3D(lms[14], lms[0]);
              const pinkyClosed3D  = dist3D(lms[20], lms[0]) < dist3D(lms[18], lms[0]);

              // C) Dirección hacia adelante (Z): punta del índice (8) debe estar
              //    más cerca de la cámara que su nudillo MCP (5)
              const indexPointingForward = lms[8].z < lms[5].z - 0.01;

              if (indexExtended3D && middleClosed3D && ringClosed3D && pinkyClosed3D && indexPointingForward) {
                validFrames++;
              }
            }

            // Al menos 5 de 8 frames deben cumplir todas las condiciones
            const stableGesture = validFrames >= 5;

            // Gesto estático: la muñeca no se desplaza mucho en el plano 2D
            const first = historyBuf[0];
            const last  = historyBuf[historyBuf.length - 1];
            const noLateralSweep  = Math.abs(last.x - first.x) < 0.12;
            const noVerticalSweep = Math.abs(last.y - first.y) < 0.12;

            return stableGesture && noLateralSweep && noVerticalSweep;
          };

          // Solo se evalúa la mano derecha (dedo índice derecho apuntando a la cámara)
          if (checkTu(poseHistoryRightRef.current)) {
            triggerRecognition('TÚ', 'Tú')
            recognized = true
          }
        }

        // --- GRACIAS ---
        if (canDetect && !recognized && poseHistoryRightRef.current.length >= 6 && hasFace) {
          const buf = poseHistoryRightRef.current
          const first = buf[0]
          const last = buf[buf.length - 1]

          const mouthLms = results.faceLandmarks[14]
          // Coloca la mano en la boca (rango relajado para mayor facilidad)
          const nearMouth = Math.abs(first.x - mouthLms.x) < 0.15 && Math.abs(first.y - mouthLms.y) < 0.15
          
          const moveX = last.x - first.x
          const moveY = last.y - first.y

          // "movimiento hacia adelante en el eje x": la mano se desplaza en X alejándose
          const movedInX = Math.abs(moveX) > 0.05
          
          // Permitimos cierta variación en Y, pero no un movimiento completamente vertical
          const noExcessiveVertical = Math.abs(moveY) < 0.15

          if (nearMouth && movedInX && noExcessiveVertical) {
            triggerRecognition('GRACIAS', 'Gracias')
            recognized = true
          }
        }

        // --- SÍ ---
        if (canDetect && !recognized) {
          const checkSi = (historyBuf) => {
            if (historyBuf.length < 8) return false;

            // 1) Forma de la mano: Puño cerrado (la mayoría del tiempo)
            let closedFrames = 0;
            for (const frame of historyBuf) {
              if (isFist(frame.lms)) closedFrames++;
            }
            if (closedFrames < historyBuf.length * 0.6) return false;

            // 2) Movimiento: "asiente" (arriba y abajo).
            // Usamos el nudillo del dedo índice para capturar la flexión de la muñeca o el movimiento del brazo.
            let minY = 1, maxY = 0;
            let minX = 1, maxX = 0;
            for (const frame of historyBuf) {
              const knuckle = frame.lms[5];
              if (knuckle.y < minY) minY = knuckle.y;
              if (knuckle.y > maxY) maxY = knuckle.y;
              if (knuckle.x < minX) minX = knuckle.x;
              if (knuckle.x > maxX) maxX = knuckle.x;
            }
            
            const rangeY = maxY - minY;
            const rangeX = maxX - minX;

            // Movimiento vertical notable (el "asentimiento")
            const hasVerticalNod = rangeY > 0.04;
            // Predominantemente vertical comparado con el horizontal
            const predominantlyVertical = rangeY > rangeX * 1.5;

            // Posición: Debe estar más abajo del hombro (o la cara)
            // historyBuf[0].y es coordenada normalizada. > 0.2 suele ser debajo del rostro.
            const belowFace = historyBuf[0].y > 0.2; 

            return hasVerticalNod && predominantlyVertical && belowFace;
          };

          // Puede ser con cualquiera de las dos manos
          if (checkSi(poseHistoryRightRef.current) || checkSi(poseHistoryLeftRef.current)) {
            triggerRecognition('SÍ', 'Sí');
            recognized = true;
          }
        }

        // --- POR FAVOR ---
        if (canDetect && !recognized && hasPose) {
          const checkPorFavor = (historyBuf) => {
            if (historyBuf.length < 6) return false
            const first = historyBuf[0]
            const last = historyBuf[historyBuf.length - 1]
            
            // Definir la línea horizontal que separa el rostro del pecho
            let boundaryY = 0.5; // Por defecto mitad de pantalla
            if (results.faceLandmarks && results.faceLandmarks[152]) {
              // El punto 152 es la base de la barbilla
              boundaryY = results.faceLandmarks[152].y;
            } else if (results.poseLandmarks && results.poseLandmarks[11] && results.poseLandmarks[12]) {
              // Si no hay rostro, usamos la altura de los hombros
              boundaryY = Math.min(results.poseLandmarks[11].y, results.poseLandmarks[12].y) - 0.05;
            }

            // Para que sea "Por favor", el movimiento debe EMPEZAR y MANTENERSE debajo del rostro.
            // Esto evita que se confunda con "Gracias" o "Tú", los cuales inician en la cara.
            const isBelowLine = first.y > boundaryY && last.y > boundaryY;
            
            // Movimiento circular
            const isCircle = isCircularMovement(historyBuf);

            // Evitar confundir con "Hola" (que es un barrido horizontal grande)
            const notHugeSweep = Math.abs(last.x - first.x) < 0.12;

            return isBelowLine && isCircle && notHugeSweep;
          }

          if (checkPorFavor(poseHistoryRightRef.current) || checkPorFavor(poseHistoryLeftRef.current)) {
            triggerRecognition('POR FAVOR', 'Por favor')
            recognized = true
          }
        }

        // --- HOLA ---
        if (canDetect && !recognized && poseHistoryLeftRef.current.length >= 6) {
          const buf = poseHistoryLeftRef.current
          const first = buf[0]
          const last = buf[buf.length - 1]

          const moveX = last.x - first.x
          const moveY = last.y - first.y

          const isHorizontal = Math.abs(moveX) > Math.abs(moveY) * 1.5
          
          // Movimiento de derecha a izquierda:
          // Como la cámara está en modo espejo (scaleX(-1)), cuando el usuario mueve su mano
          // desde su derecha hacia su izquierda, en la pantalla la coordenada X aumenta.
          const movingRightToLeft = moveX > 0.06

          if (isHorizontal && movingRightToLeft && Math.abs(moveY) < 0.15) {
            triggerRecognition('HOLA', 'Hola')
            recognized = true
          }
        }

        // --- UNRECOGNIZED ---
        if (canDetect && !recognized) {
          const checkSignificant = (buf) => {
            if (buf.length < 10) return false
            const moveX = buf[buf.length-1].x - buf[0].x
            const moveY = buf[buf.length-1].y - buf[0].y
            return Math.abs(moveX) > 0.15 || Math.abs(moveY) > 0.15
          }
          if (checkSignificant(poseHistoryLeftRef.current) || checkSignificant(poseHistoryRightRef.current)) {
            setUnrecognized(true)
            setTimeout(() => setUnrecognized(false), 800)
            poseHistoryLeftRef.current = []
            poseHistoryRightRef.current = []
          }
        }
      }
    } else {
      poseHistoryLeftRef.current = []
      poseHistoryRightRef.current = []
    }

    setHandVisible(hasLeftHand || hasRightHand)
    ctx.restore()
  }

  function triggerRecognition(sign, text) {
    lastDetectionRef.current = Date.now()
    poseHistoryLeftRef.current = []
    poseHistoryRightRef.current = []
    
    const detection = { sign, text, confidence: 0.95 }
    setLatest(detection)
    setHistory((h) => [detection, ...h].slice(0, 8))
    speak(text)
  }

  function speak(text) {
    if (!audioRef.current || !text) return
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    try {
      window.speechSynthesis.cancel()
      const utter = new window.SpeechSynthesisUtterance(text)
      utter.lang = 'es-ES'
      utter.rate = 1
      utter.pitch = 1
      window.speechSynthesis.speak(utter)
    } catch (e) { console.warn(e) }
  }

  function startDetect() {
    poseHistoryLeftRef.current = []
    poseHistoryRightRef.current = []
    lastDetectionRef.current = 0
    setRunning(true)
  }
  function stopDetect() {
    setRunning(false)
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
  }

  const handleReset = useCallback(() => {
    setLatest(null)
    setHistory([])
    poseHistoryLeftRef.current = []
    poseHistoryRightRef.current = []
    lastDetectionRef.current = 0
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
  }, [])

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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 animate-fade-up">
        <div className="lg:col-span-3">
          <div className="relative rounded-4xl overflow-hidden shadow-glow border border-white/70 bg-black aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full pointer-events-none"
              style={{ transform: 'scaleX(-1)' }}
            />

            {!scriptsLoaded && !scriptsError && (
              <div className="absolute inset-0 flex items-center justify-center text-white/80 text-sm">
                Cargando MediaPipe Holistic…
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
                Solicitando cámara…
              </div>
            )}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-6">
                <p className="font-semibold text-lg">No se pudo iniciar la cámara</p>
                <p className="mt-2 text-sm text-white/80 max-w-sm">{cameraError}</p>
              </div>
            )}

            <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/55 backdrop-blur text-white text-xs">
              <span className={'inline-block h-2 w-2 rounded-full ' +
                (running ? 'bg-red-400 animate-pulse'
                  : cameraOk ? 'bg-green-400'
                    : 'bg-white/60')} />
              {running
                ? handVisible ? (unrecognized ? 'No reconocido' : 'Detectando movimiento…') : 'Esperando mano…'
                : cameraOk ? 'Listo' : 'En espera'}
            </div>

            {latest && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full bg-white/95 backdrop-blur text-signara-navy font-bold tracking-wide shadow-soft text-sm">
                {latest.sign} · {Math.round((latest.confidence || 0) * 100)}%
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {!running ? (
              <button
                onClick={startDetect}
                disabled={!cameraOk}
                className="btn-primary py-2.5 px-5 text-sm disabled:opacity-50"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Empezar a interpretar
              </button>
            ) : (
              <button onClick={stopDetect} className="btn-primary py-2.5 px-5 text-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
                Detener
              </button>
            )}
            <label className="ml-auto inline-flex items-center gap-2 text-sm text-white/90 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={audioOn}
                onChange={(e) => setAudioOn(e.target.checked)}
                className="h-4 w-4 accent-signara-purple"
              />
              Leer en voz alta
            </label>
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-4">
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

          <div className="glass-card p-5 flex-1 min-h-[200px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-signara-purple">
              Historial
            </p>
            {history.length === 0 ? (
              <p className="mt-2 italic text-signara-navy/40">
                Aquí verás cada seña reconocida.
              </p>
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
        </div>
      </div>

      <footer className="mt-6 text-center text-xs text-white/60">
        Reconocimiento avanzado de gestos con MediaPipe Holistic.
      </footer>
    </section>
  )
}

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
