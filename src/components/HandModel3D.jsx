import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three'

/**
 * HandModel3D
 * Visualización 3D en tiempo real de los landmarks de MediaPipe Holistic.
 * Mano izquierda = azul, mano derecha = púrpura (igual que el canvas 2D).
 * Arrastra con el mouse para rotar la vista.
 */

const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],           // pulgar
  [0,5],[5,6],[6,7],[7,8],           // índice
  [5,9],[9,10],[10,11],[11,12],      // medio
  [9,13],[13,14],[14,15],[15,16],    // anular
  [13,17],[17,18],[18,19],[19,20],   // meñique
  [0,17],                            // palma
]

const Y_AXIS = new THREE.Vector3(0, 1, 0)

// Crea los 21 joints (esferas) y los huesos (cilindros) para una mano
function buildHandMeshes(scene, color) {
  const joints = Array.from({ length: 21 }, () => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.009, 10, 10),
      new THREE.MeshPhongMaterial({ color, shininess: 80 })
    )
    m.visible = false
    scene.add(m)
    return m
  })

  const bones = CONNECTIONS.map(() => {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004, 0.004, 1, 8),
      new THREE.MeshPhongMaterial({ color, transparent: true, opacity: 0.75 })
    )
    m.visible = false
    scene.add(m)
    return m
  })

  return { joints, bones }
}

// Actualiza posiciones de joints y huesos con los landmarks actuales
function updateHandMeshes({ joints, bones }, landmarks) {
  const hide = () => {
    joints.forEach(m => { m.visible = false })
    bones.forEach(m => { m.visible = false })
  }

  if (!landmarks || landmarks.length < 21) { hide(); return }

  // MediaPipe: x,y en [0,1] desde esquina superior-izquierda, z = profundidad relativa
  // Three.js: centrar en 0, invertir Y (pantalla hacia abajo, 3D hacia arriba)
  const toV3 = lm => new THREE.Vector3(
    (lm.x - 0.5) * 0.9,
    -(lm.y - 0.5) * 0.9,
     lm.z * 0.35
  )

  landmarks.forEach((lm, i) => {
    joints[i].position.copy(toV3(lm))
    joints[i].visible = true
  })

  CONNECTIONS.forEach(([a, b], i) => {
    const pA = toV3(landmarks[a])
    const pB = toV3(landmarks[b])
    const dir = new THREE.Vector3().subVectors(pB, pA)
    const len = dir.length()

    if (len < 0.001) { bones[i].visible = false; return }

    bones[i].scale.y = len
    bones[i].position.addVectors(pA, dir.clone().multiplyScalar(0.5))
    bones[i].quaternion.setFromUnitVectors(Y_AXIS, dir.normalize())
    bones[i].visible = true
  })
}

const HandModel3D = forwardRef(function HandModel3D({ className = '' }, ref) {
  const mountRef = useRef(null)
  const dataRef  = useRef({ left: null, right: null })

  // API pública: actualizar landmarks desde InterpretScreen sin causar re-render
  useImperativeHandle(ref, () => ({
    update(left, right) {
      dataRef.current = { left, right }
    }
  }))

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    // ── Escena ────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0d0d1f)
    scene.fog = new THREE.Fog(0x0d0d1f, 2, 6)

    const w = el.clientWidth  || 300
    const h = el.clientHeight || 200
    const camera = new THREE.PerspectiveCamera(52, w / h, 0.001, 10)
    camera.position.set(0, 0.05, 0.95)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(w, h)
    el.appendChild(renderer.domElement)

    // ── Iluminación ───────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x8888cc, 0.7))
    const sun = new THREE.DirectionalLight(0xffffff, 1.2)
    sun.position.set(1, 2, 3)
    scene.add(sun)
    const rim = new THREE.DirectionalLight(0x4466ff, 0.4)
    rim.position.set(-2, -1, -1)
    scene.add(rim)

    // ── Grid decorativo ───────────────────────────────────────────────────────
    const grid = new THREE.GridHelper(1.4, 14, 0x1a1a40, 0x111128)
    grid.position.y = -0.48
    scene.add(grid)

    // Plano reflectante sutil bajo las manos
    const planeMat = new THREE.MeshStandardMaterial({
      color: 0x111133, transparent: true, opacity: 0.4, roughness: 0.8
    })
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), planeMat)
    plane.rotation.x = -Math.PI / 2
    plane.position.y = -0.48
    scene.add(plane)

    // ── Manos ─────────────────────────────────────────────────────────────────
    const leftHand  = buildHandMeshes(scene, 0x3b82f6)   // azul  = mano izquierda
    const rightHand = buildHandMeshes(scene, 0x9333ea)   // púrpura = mano derecha

    // ── Interacción: arrastrar para rotar ─────────────────────────────────────
    let drag = false, lastX = 0, lastY = 0
    let rotY = 0, rotX = 0

    const onDown  = e => { drag = true; lastX = e.clientX; lastY = e.clientY; el.style.cursor = 'grabbing' }
    const onMove  = e => {
      if (!drag) return
      rotY += (e.clientX - lastX) * 0.012
      rotX += (e.clientY - lastY) * 0.006
      rotX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotX))
      lastX = e.clientX; lastY = e.clientY
    }
    const onUp    = () => { drag = false; el.style.cursor = 'grab' }

    el.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)

    // ── Loop de animación ─────────────────────────────────────────────────────
    let raf
    let autoRot = 0

    const tick = () => {
      raf = requestAnimationFrame(tick)

      const { left, right } = dataRef.current
      const hasHand = left || right

      if (!hasHand && !drag) {
        autoRot += 0.006
      }

      scene.rotation.y = autoRot + rotY
      scene.rotation.x = rotX

      updateHandMeshes(leftHand,  left)
      updateHandMeshes(rightHand, right)

      renderer.render(scene, camera)
    }
    tick()

    // ── Resize observer ───────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      const nw = el.clientWidth, nh = el.clientHeight
      if (!nw || !nh) return
      camera.aspect = nw / nh
      camera.updateProjectionMatrix()
      renderer.setSize(nw, nh)
    })
    ro.observe(el)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      el.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div
      ref={mountRef}
      className={className}
      style={{ cursor: 'grab', touchAction: 'none', userSelect: 'none' }}
    />
  )
})

export default HandModel3D
