/**
 * Señas (FSW) → texto en español.
 * Por defecto solo local (SignWriting en pantalla).
 * Texto hablado: configura TU backend con VITE_INTERPRET_API_URL en .env
 */

const INTERPRET_API = import.meta.env.VITE_INTERPRET_API_URL?.replace(/\/$/, '')

export function isInterpretTextEnabled() {
  return Boolean(INTERPRET_API)
}

/** Convierte tokens FSW a texto usando tu API (POST JSON → { text }). */
export async function interpretFswTokens(tokens) {
  if (!tokens?.length) return ''
  if (!INTERPRET_API) return ''

  const r = await fetch(`${INTERPRET_API}/interpret`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tokens,
      fsw: tokens.join(' '),
    }),
  })

  const data = await r.json().catch(() => ({}))
  if (!r.ok) {
    const msg = data?.error || data?.message || `HTTP ${r.status}`
    throw new Error(String(msg))
  }
  return String(data.text || '').trim()
}
