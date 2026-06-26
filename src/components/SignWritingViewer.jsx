import { useEffect, useRef, useState } from 'react'
import { loadSignWritingFonts } from '../utils/signWritingFonts.js'

let sgnwDefined = false
let sgnwDefinePromise = null

async function ensureSgnwComponents() {
  await loadSignWritingFonts()
  if (sgnwDefined) return
  if (!sgnwDefinePromise) {
    sgnwDefinePromise = import('@sutton-signwriting/sgnw-components/loader')
      .then(({ defineCustomElements }) => {
        defineCustomElements()
        sgnwDefined = true
      })
      .catch((err) => {
        sgnwDefinePromise = null
        throw err
      })
  }
  return sgnwDefinePromise
}

function mountTokens(container, tokens) {
  container.innerHTML = ''
  for (const fsw of tokens) {
    const sign = document.createElement('fsw-sign')
    sign.setAttribute('sign', fsw)
    container.appendChild(sign)
  }
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

    const run = async () => {
      await ensureSgnwComponents()
      if (cancelled) return

      // Esperar a que el ref del DOM exista (Strict Mode / primer paint)
      for (let i = 0; i < 20 && !ref.current; i++) {
        await new Promise((r) => requestAnimationFrame(r))
      }

      const el = ref.current
      if (!el) {
        throw new Error('contenedor SignWriting no disponible')
      }

      mountTokens(el, tokens)
      if (!cancelled) setStatus('ready')
    }

    run().catch((err) => {
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
          No se pudieron dibujar los símbolos. Recarga la página o prueba otro navegador.
        </p>
      )}
      <div
        ref={ref}
        className="flex min-h-[280px] flex-col items-center justify-center py-2"
        aria-label="Secuencia SignWriting"
        aria-busy={status === 'loading'}
      />
    </div>
  )
}
