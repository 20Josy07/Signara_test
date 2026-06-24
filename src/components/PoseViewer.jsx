import { useEffect, useRef } from 'react'

let poseViewerDefined = false

async function ensurePoseViewer() {
  if (poseViewerDefined) return
  const { defineCustomElements } = await import('pose-viewer/loader')
  defineCustomElements()
  poseViewerDefined = true
}

/** Reproduce animación 3D de pose desde sign.mt (spoken_text_to_signed_pose). */
export default function PoseViewer({ src, className = '' }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!src) return
    ensurePoseViewer().then(() => {
      const host = ref.current
      if (!host) return
      host.innerHTML = ''
      const viewer = document.createElement('pose-viewer')
      viewer.setAttribute('src', src)
      viewer.setAttribute('autoplay', 'true')
      viewer.setAttribute('loop', 'false')
      viewer.style.width = '100%'
      viewer.style.height = '100%'
      viewer.style.minHeight = '280px'
      host.appendChild(viewer)
    })
  }, [src])

  if (!src) return null

  return (
    <div
      ref={ref}
      className={`relative w-full overflow-hidden rounded-2xl bg-[#FAF6EC] ${className}`}
      aria-label="Animación de lengua de señas"
    />
  )
}
