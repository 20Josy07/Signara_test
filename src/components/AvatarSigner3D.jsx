/**
 * AvatarSigner3D
 * Plays sign-language animations recorded with 04_record_animations.py.
 *
 * Each animation is a JSON file with:
 *   { token, fps, frames: [{lh, rh, pose}] }
 * where lh/rh = 21 landmarks [x,y,z], pose = 33 landmarks [x,y,z].
 *
 * Imperative API (via ref):
 *   queue(token)          — add one token to the play queue
 *   replace([tokens])     — clear queue and replace with new list
 *   clear()               — stop and clear everything
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import * as THREE from 'three'

// ─── MediaPipe hand landmark connections ──────────────────────────────────────
const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],
  [0,17],
]

// Pose landmarks we care about (upper body only: shoulders, elbows, wrists)
const POSE_CONNECTIONS = [
  [11,12],[11,13],[13,15],[12,14],[14,16],
  [11,23],[12,24],[23,24],
]

const INTERP_FRAMES = 6      // lerp frames between signs
const FPS = 30
const MS_PER_FRAME = 1000 / FPS

// ─── Three.js helpers ─────────────────────────────────────────────────────────

function makeDots(count, color) {
  const geo = new THREE.BufferGeometry()
  const pos = new Float32Array(count * 3)
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const mat = new THREE.PointsMaterial({ color, size: 0.025, sizeAttenuation: true })
  return new THREE.Points(geo, mat)
}

function makeLines(connections, color) {
  const count = connections.length * 2
  const geo = new THREE.BufferGeometry()
  const pos = new Float32Array(count * 3)
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const mat = new THREE.LineBasicMaterial({ color })
  return new THREE.LineSegments(geo, mat)
}

function updateDots(points, lmList) {
  const attr = points.geometry.attributes.position
  for (let i = 0; i < lmList.length; i++) {
    const [x, y, z] = lmList[i]
    attr.setXYZ(i, x, -y, z)
  }
  attr.needsUpdate = true
}

function updateLines(lines, lmList, connections) {
  const attr = lines.geometry.attributes.position
  for (let i = 0; i < connections.length; i++) {
    const [a, b] = connections[i]
    const [ax, ay, az] = lmList[a]
    const [bx, by, bz] = lmList[b]
    attr.setXYZ(i * 2,     ax, -ay, az)
    attr.setXYZ(i * 2 + 1, bx, -by, bz)
  }
  attr.needsUpdate = true
}

function lerp3(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ]
}

function lerpFrame(frameA, frameB, t) {
  return {
    lh:   frameA.lh.map((p, i) => lerp3(p, frameB.lh[i], t)),
    rh:   frameA.rh.map((p, i) => lerp3(p, frameB.rh[i], t)),
    pose: frameA.pose.map((p, i) => lerp3(p, frameB.pose[i], t)),
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

const AvatarSigner3D = forwardRef(function AvatarSigner3D(
  { apiUrl, onSign, onFinish },
  ref
) {
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)          // { scene, camera, renderer, objects }
  const cacheRef = useRef({})            // token → frames[]
  const queueRef = useRef([])            // pending tokens
  const playingRef = useRef(false)
  const timerRef = useRef(null)

  const [status, setStatus] = useState('idle') // idle | loading | playing | error

  // ─── Fetch animation (with cache) ────────────────────────────────────────

  const fetchAnim = useCallback(async (token) => {
    if (cacheRef.current[token]) return cacheRef.current[token]
    const url = `${apiUrl}/sign/${token}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    cacheRef.current[token] = data.frames
    return data.frames
  }, [apiUrl])

  // ─── Three.js init ───────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setClearColor(0x000000, 0)

    const w = canvas.clientWidth
    const h = canvas.clientHeight
    renderer.setSize(w, h, false)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 10)
    camera.position.set(0.5, -0.3, 2.2)
    camera.lookAt(0.5, -0.5, 0)

    // Hand dots + lines
    const lhDots  = makeDots(21, 0x818cf8)   // indigo-400
    const lhLines = makeLines(HAND_CONNECTIONS, 0x6366f1)
    const rhDots  = makeDots(21, 0xa78bfa)   // violet-400
    const rhLines = makeLines(HAND_CONNECTIONS, 0x8b5cf6)
    const poseDots  = makeDots(33, 0xfbbf24)  // amber-400
    const poseLines = makeLines(POSE_CONNECTIONS, 0xd97706)

    scene.add(lhDots, lhLines, rhDots, rhLines, poseDots, poseLines)

    let animId
    const render = () => {
      animId = requestAnimationFrame(render)
      renderer.render(scene, camera)
    }
    render()

    sceneRef.current = { scene, camera, renderer, lhDots, lhLines, rhDots, rhLines, poseDots, poseLines }

    const onResize = () => {
      const w2 = canvas.clientWidth
      const h2 = canvas.clientHeight
      renderer.setSize(w2, h2, false)
      camera.aspect = w2 / h2
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      sceneRef.current = null
    }
  }, [])

  // ─── Draw a single frame ─────────────────────────────────────────────────

  const drawFrame = useCallback((frame) => {
    const s = sceneRef.current
    if (!s) return
    updateDots(s.lhDots,  frame.lh)
    updateLines(s.lhLines, frame.lh, HAND_CONNECTIONS)
    updateDots(s.rhDots,  frame.rh)
    updateLines(s.rhLines, frame.rh, HAND_CONNECTIONS)
    updateDots(s.poseDots,  frame.pose)
    updateLines(s.poseLines, frame.pose, POSE_CONNECTIONS)
  }, [])

  // ─── Play sequence of frames (rAF for smooth, drift-free 30fps) ──────────

  const playFrames = useCallback((frames, onDone) => {
    let i = 0
    let lastTime = null

    const step = (now) => {
      if (!lastTime) lastTime = now
      const elapsed = now - lastTime
      if (elapsed >= MS_PER_FRAME) {
        if (i >= frames.length) { onDone(); return }
        drawFrame(frames[i++])
        lastTime = now - (elapsed % MS_PER_FRAME)  // absorb overshoot
      }
      timerRef.current = requestAnimationFrame(step)
    }
    timerRef.current = requestAnimationFrame(step)
  }, [drawFrame])

  // ─── Process queue ───────────────────────────────────────────────────────

  const processQueue = useCallback(async () => {
    if (playingRef.current) return
    if (queueRef.current.length === 0) {
      setStatus('idle')
      if (onFinish) onFinish()
      return
    }

    playingRef.current = true
    const token = queueRef.current.shift()

    if (onSign) onSign(token)
    setStatus('playing')

    let frames
    try {
      setStatus('loading')
      frames = await fetchAnim(token)
      setStatus('playing')
    } catch {
      playingRef.current = false
      processQueue()
      return
    }

    // If there's a next token, pre-fetch and append lerp transition
    const nextToken = queueRef.current[0]
    let allFrames = [...frames]

    if (nextToken) {
      try {
        const nextFrames = await fetchAnim(nextToken)
        const lastFrame = frames[frames.length - 1]
        const firstNext = nextFrames[0]
        for (let t = 1; t <= INTERP_FRAMES; t++) {
          allFrames.push(lerpFrame(lastFrame, firstNext, t / (INTERP_FRAMES + 1)))
        }
      } catch { /* no interp if fetch fails */ }
    }

    playFrames(allFrames, () => {
      playingRef.current = false
      processQueue()
    })
  }, [fetchAnim, playFrames, onSign, onFinish])

  // ─── Imperative handle ───────────────────────────────────────────────────

  useImperativeHandle(ref, () => ({
    queue(token) {
      if (!token) return
      queueRef.current.push(token)
      processQueue()
    },
    replace(tokens) {
      if (timerRef.current) cancelAnimationFrame(timerRef.current)
      playingRef.current = false
      queueRef.current = [...(tokens || [])]
      processQueue()
    },
    clear() {
      if (timerRef.current) cancelAnimationFrame(timerRef.current)
      playingRef.current = false
      queueRef.current = []
      setStatus('idle')
    },
  }), [processQueue])

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-signara-navy/10">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-xs text-white/50">Cargando animación…</span>
        </div>
      )}
      {status === 'idle' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-xs text-white/30">Avatar 3D listo</span>
        </div>
      )}
    </div>
  )
})

export default AvatarSigner3D
