/**
 * Cliente del backend Sign Translate (sign.mt).
 * En local: proxy Vite /sign-mt → sign.mt o emulador Firebase del proyecto translate.
 *
 * Proyecto fuente: C:\Users\josya\Desktop\translate
 */

const API_BASE =
  import.meta.env.VITE_SIGN_MT_API_URL ||
  (import.meta.env.DEV ? '/sign-mt' : 'https://sign.mt/api')

const SIGNED_LANG = 'ssp' // Lengua de señas española (SignWriting)
const SPOKEN_LANG = 'es'

const CACHE_TTL_MS = 5 * 60 * 1000
let cached = null
let inflight = null

export function getSignMtCache() {
  return cached
}

/** Comprueba que el backend sign.mt responde (Bergamot spoken→signed). */
export function checkSignMtHealth({ force = false } = {}) {
  if (!force && cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return Promise.resolve(cached)
  }
  if (!force && inflight) return inflight

  const params = new URLSearchParams({
    from: SPOKEN_LANG,
    to: SIGNED_LANG,
    text: 'hola',
  })

  inflight = fetch(`${API_BASE}/spoken-to-signed?${params}`)
    .then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      cached = { ok: !!data.text, at: Date.now() }
      inflight = null
      return cached
    })
    .catch(() => {
      cached = { ok: false, at: Date.now() }
      inflight = null
      return cached
    })

  return inflight
}

export function warmupSignMtApi() {
  return checkSignMtHealth()
}

/** Texto hablado → SignWriting (secuencia FSW). */
export async function spokenToSignWriting(text, {
  spoken = SPOKEN_LANG,
  signed = SIGNED_LANG,
} = {}) {
  const body = {
    data: {
      texts: [text.trim()],
      spoken_language: spoken,
      signed_language: signed,
    },
  }
  const r = await fetch(`${API_BASE}/spoken-text-to-signwriting`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`spoken-text-to-signwriting: HTTP ${r.status}`)
  const data = await r.json()
  return data.result?.output?.join(' ') ?? ''
}

/** SignWriting → texto hablado (modo interpretar). */
export async function signedToSpoken(signWriting, {
  signed = SIGNED_LANG,
  spoken = SPOKEN_LANG,
} = {}) {
  const text = String(signWriting).replace(/\s+/g, '')
  if (!text) return ''

  const params = new URLSearchParams({ from: signed, to: spoken, text })
  const r = await fetch(`${API_BASE}/signed-to-spoken?${params}`)
  if (!r.ok) throw new Error(`signed-to-spoken: HTTP ${r.status}`)
  const data = await r.json()
  return data.text ?? ''
}

/** Bergamot directo: texto → SignWriting (sin Cloud Function). */
export async function spokenToSignedBergamot(text, {
  spoken = SPOKEN_LANG,
  signed = SIGNED_LANG,
} = {}) {
  const params = new URLSearchParams({ from: spoken, to: signed, text: text.trim() })
  const r = await fetch(`${API_BASE}/spoken-to-signed?${params}`)
  if (!r.ok) throw new Error(`spoken-to-signed: HTTP ${r.status}`)
  const data = await r.json()
  return data.text ?? ''
}

/** Normalización de texto (OpenAI vía sign.mt). */
export async function normalizeSpokenText(text, lang = SPOKEN_LANG) {
  const params = new URLSearchParams({ lang, text })
  const r = await fetch(`${API_BASE}/text-normalization?${params}`)
  if (!r.ok) return text
  const data = await r.json()
  return data.text ?? text
}

/** URL de pose 3D firmada (Cloud Function sign.mt). */
export function spokenToSignedPoseUrl(text, spoken = SPOKEN_LANG, signed = SIGNED_LANG) {
  const api = 'https://us-central1-sign-mt.cloudfunctions.net/spoken_text_to_signed_pose'
  return `${api}?text=${encodeURIComponent(text)}&spoken=${spoken}&signed=${signed}`
}
