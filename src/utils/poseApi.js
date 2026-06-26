import { SIGNED_LANG, SPOKEN_LANG } from './signLanguage.js'

const POSE_API =
  'https://us-central1-sign-mt.cloudfunctions.net/spoken_text_to_signed_pose'

/** URL directa a la API de pose (puede dar 403 en algunos navegadores). */
export function buildPoseApiUrl(text, {
  spoken = SPOKEN_LANG,
  signed = SIGNED_LANG,
} = {}) {
  const params = new URLSearchParams({
    text: String(text).trim(),
    spoken,
    signed,
  })
  return `${POSE_API}?${params}`
}

/**
 * Descarga el archivo POSE y devuelve un blob: URL para pose-viewer.
 * Prueba primero el proxy de Netlify (evita 403 en producción).
 */
export async function fetchPoseBlobUrl(text, {
  spoken = SPOKEN_LANG,
  signed = SIGNED_LANG,
} = {}) {
  const trimmed = String(text).trim()
  if (!trimmed) return null

  const params = new URLSearchParams({ text: trimmed, spoken, signed })

  const load = async (url) => {
    const r = await fetch(url)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const blob = await r.blob()
    if (!blob.size) throw new Error('respuesta vacía')
    return URL.createObjectURL(blob)
  }

  try {
    return await load(`/.netlify/functions/pose?${params}`)
  } catch (err) {
    console.warn('[pose] proxy Netlify:', err?.message || err)
  }

  return load(buildPoseApiUrl(trimmed, { spoken, signed }))
}
