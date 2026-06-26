import { useEffect, useRef, useState } from 'react'
import { loadSignWritingFonts } from '../sign-engine/index.js'

let sgnwLoaded = false
let sgnwLoadPromise = null

function ensureSgnwComponents() {
  if (sgnwLoaded) return Promise.resolve()
  if (sgnwLoadPromise) return sgnwLoadPromise

  sgnwLoadPromise = loadSignWritingFonts()
    .then(async () => {
      const { defineCustomElements } = await import('@sutton-signwriting/sgnw-components/loader')
      defineCustomElements()
      sgnwLoaded = true
    })
    .catch((err) => {
      sgnwLoadPromise = null
      throw err
    })

  return sgnwLoadPromise
}

/** Muestra secuencia SignWriting (tokens FSW de Bergamot). */
export default function SignWritingViewer({ tokens = [], className = '' }) {
  const ref = useRef(null)
  const [status, setStatus] = useState('idle')

  useEffect(() => {
    if (!tokens?.length) {
      setStatus('idle')
      return
    }

    let cancelled = false
    setStatus('loading')

    ensureSgnwComponents()
      .then(() => {
        if (cancelled) return
        const el = ref.current
        if (!el) return
        el.innerHTML = ''
        for (const fsw of tokens) {
          const sign = document.createElement('fsw-sign')
          sign.setAttribute('sign', fsw)
          el.appendChild(sign)
        }
        setStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        console.warn('[SignWritingViewer]', err?.message || err)
        setStatus('error')
      })

    return () => { cancelled = true }
  }, [tokens])

  if (!tokens?.length) return null

  return (
    <div className={className}>
      {status === 'loading' && (
        <p className="mb-2 text-center text-sm font-semibold text-pastel-sub">
          Cargando señas SignWriting…
        </p>
      )}
      {status === 'error' && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm font-semibold text-amber-900">
          No se pudieron dibujar los símbolos. Comprueba que las fuentes estén en /fonts/signwriting/.
        </p>
      )}
      <div
        ref={ref}
        className="flex min-h-[280px] flex-col items-center justify-center py-2"
        aria-label="Secuencia SignWriting"
      />
    </div>
  )
}
