/**
 * Cliente sign.mt para interpretar (señas → texto).
 * Traducción hablado→señas usa Bergamot en el navegador (bergamotTranslate.js).
 */

import { getAppCheckToken } from './appCheck.js'
import { SIGNED_LANG, SPOKEN_LANG } from './signLanguage.js'

const SIGN_MT_API = (
  import.meta.env.VITE_SIGN_MT_API_URL || 'https://sign.mt/api'
).replace(/\/$/, '')

const CACHE_TTL_MS = 5 * 60 * 1000
let cached = null
let inflight = null

export function getSignMtCache() {
  return cached
}

async function signMtFetch(path, init = {}) {
  const headers = new Headers(init.headers || {})
  try {
    const token = await getAppCheckToken()
    headers.set('X-Firebase-AppCheck', token)
    headers.set('X-AppCheck-Token', token)
  } catch {
    // Sin App Check algunas rutas devuelven 401
  }
  return fetch(`${SIGN_MT_API}${path}`, { ...init, headers })
}

/** Comprueba App Check + API sign.mt (interpretar). */
export function checkSignMtHealth({ force = false } = {}) {
  if (!force && cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return Promise.resolve(cached)
  }
  if (!force && inflight) return inflight

  inflight = getAppCheckToken()
    .then(() => ({ ok: true, at: Date.now() }))
    .catch(() => ({ ok: false, at: Date.now() }))
    .finally(() => {
      inflight = null
    })

  inflight.then((result) => {
    cached = result
  })

  return inflight
}

export function warmupSignMtApi() {
  return checkSignMtHealth()
}

/** Describe una seña SignWriting (FSW) en texto. */
export async function describeSignWriting(fsw) {
  const r = await signMtFetch('/signwriting-description', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { fsw } }),
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) {
    const msg = data?.error?.message || data?.message || `HTTP ${r.status}`
    throw new Error(`signwriting-description: ${msg}`)
  }
  return data.result?.description ?? ''
}

/** SignWriting → texto hablado (modo interpretar). */
export async function signedToSpoken(signWriting, {
  signed = SIGNED_LANG,
  spoken = SPOKEN_LANG,
} = {}) {
  const text = String(signWriting).replace(/\s+/g, '')
  if (!text) return ''

  const params = new URLSearchParams({ from: signed, to: spoken, text })
  const r = await signMtFetch(`/signed-to-spoken?${params}`)
  if (r.ok) {
    const data = await r.json()
    if (data.text?.trim()) return data.text.trim()
  }

  // Sin modelo Bergamot signed-to-spoken para LSM: describir cada token FSW
  const tokens = String(signWriting).split(/\s+/).filter(Boolean)
  const parts = []
  let lastErr = null
  for (const fsw of tokens) {
    try {
      const desc = await describeSignWriting(fsw)
      if (desc?.trim()) parts.push(desc.trim())
    } catch (err) {
      lastErr = err
    }
  }
  if (parts.length) return parts.join(' ')

  const body = await r.clone().json().catch(() => ({}))
  const status = r.ok ? 'vacía' : (body?.message || `HTTP ${r.status}`)
  console.warn('[sign.mt] signed-to-spoken:', status, 'tokens:', tokens.length, lastErr?.message || '')
  if (lastErr) throw lastErr
  return ''
}

/** URL de pose 3D (Cloud Function sign.mt). */
export function spokenToSignedPoseUrl(text, spoken = SPOKEN_LANG, signed = SIGNED_LANG) {
  const api = 'https://us-central1-sign-mt.cloudfunctions.net/spoken_text_to_signed_pose'
  return `${api}?text=${encodeURIComponent(text)}&spoken=${spoken}&signed=${signed}`
}
