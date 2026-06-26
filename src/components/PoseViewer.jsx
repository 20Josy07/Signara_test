import { useEffect, useRef } from 'react'

let poseViewerReady = false
let poseViewerPromise = null

function loadPoseViewerScript() {
  if (poseViewerReady) return Promise.resolve()
  if (poseViewerPromise) return poseViewerPromise

  poseViewerPromise = new Promise((resolve, reject) => {
    if (document.querySelector('script[data-signara-pose-viewer]')) {
      poseViewerReady = true
      resolve()
      return
    }
    const s = document.createElement('script')
    s.type = 'module'
    s.src = '/pose-viewer/esm/pose-viewer.js'
    s.dataset.signaraPoseViewer = 'true'
    s.onload = () => {
      poseViewerReady = true
      resolve()
    }
    s.onerror = () => reject(new Error('no se pudo cargar pose-viewer'))
    document.head.appendChild(s)
  }).catch((err) => {
    poseViewerPromise = null
    throw err
  })

  return poseViewerPromise
}

/** Animación 3D de lengua de señas (esqueleto / avatar pose-viewer). */
export default function PoseViewer({ src, className = '', onError }) {
  const hostRef = useRef(null)
  const blobRef = useRef(null)

  useEffect(() => {
    if (!src) return

    let cancelled = false
    let viewer = null

    loadPoseViewerScript()
      .then(() => {
        if (cancelled || !hostRef.current) return
        hostRef.current.innerHTML = ''
        viewer = document.createElement('pose-viewer')
        viewer.setAttribute('src', src)
        viewer.setAttribute('autoplay', 'true')
        viewer.setAttribute('loop', 'false')
        viewer.setAttribute('aspect-ratio', '1')
        viewer.setAttribute('width', '100%')
        viewer.style.width = '100%'
        viewer.style.minHeight = '320px'
        viewer.addEventListener('error', (e) => {
          console.warn('[PoseViewer]', e?.detail || e)
          onError?.(e?.detail || new Error('Error al cargar la animación 3D'))
        })
        hostRef.current.appendChild(viewer)
      })
      .catch((err) => {
        console.warn('[PoseViewer]', err?.message || err)
        onError?.(err)
      })

    return () => {
      cancelled = true
      if (hostRef.current) hostRef.current.innerHTML = ''
      viewer = null
    }
  }, [src, onError])

  useEffect(() => {
    if (src?.startsWith('blob:')) blobRef.current = src
    return () => {
      if (blobRef.current?.startsWith('blob:')) {
        URL.revokeObjectURL(blobRef.current)
        blobRef.current = null
      }
    }
  }, [src])

  if (!src) return null

  return (
    <div
      ref={hostRef}
      className={`relative w-full overflow-hidden rounded-2xl bg-[#FAF6EC] ${className}`}
      aria-label="Animación 3D de lengua de señas"
    />
  )
}
