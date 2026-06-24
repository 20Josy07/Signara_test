import { useEffect, useRef } from 'react'
import { loadSignWritingFonts } from '../sign-engine/index.js'

let sgnwLoaded = false

async function ensureSgnwComponents() {
  if (sgnwLoaded) return
  await loadSignWritingFonts()
  const { defineCustomElements } = await import('@sutton-signwriting/sgnw-components/loader')
  defineCustomElements()
  sgnwLoaded = true
}

/** Muestra secuencia SignWriting (tokens FSW de sign.mt). */
export default function SignWritingViewer({ tokens = [], className = '' }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!tokens?.length) return
    ensureSgnwComponents().then(() => {
      const el = ref.current
      if (!el) return
      el.innerHTML = ''
      for (const fsw of tokens) {
        const sign = document.createElement('fsw-sign')
        sign.setAttribute('sign', fsw)
        el.appendChild(sign)
      }
    })
  }, [tokens])

  if (!tokens?.length) return null

  return (
    <div
      ref={ref}
      className={`flex flex-wrap items-center justify-center gap-2 min-h-[120px] ${className}`}
      aria-label="Secuencia SignWriting"
    />
  )
}
