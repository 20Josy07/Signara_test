import { textToSignTokens } from './textNormalizer.js'
import { getAllSignKeys } from './signMap.js'
import {
  spokenToSignWriting,
  spokenToSignedPoseUrl,
  normalizeSpokenText,
} from './signMtApi.js'

/**
 * Traduce texto español → señas usando el backend sign.mt (proyecto translate).
 *
 * @returns {Promise<{
 *   tokens: string[],
 *   poseUrl: string | null,
 *   text: string,
 *   fallback: string[],
 *   source: 'signmt' | 'claude' | 'local'
 * }>}
 */
export async function translateText(text) {
  const signKeys = getAllSignKeys()
  const trimmed = text.trim()
  if (!trimmed) {
    return { tokens: [], poseUrl: null, text: '', fallback: [], source: 'local' }
  }

  let normalizedText = trimmed
  try {
    normalizedText = await normalizeSpokenText(trimmed, 'es')
  } catch {
    normalizedText = trimmed
  }

  try {
    const signWritingRaw = await spokenToSignWriting(normalizedText)
    const tokens = signWritingRaw.split(/\s+/).filter(Boolean)
    if (tokens.length > 0) {
      return {
        tokens,
        poseUrl: spokenToSignedPoseUrl(normalizedText, 'es', 'ssp'),
        text: normalizedText,
        fallback: textToSignTokens(trimmed, signKeys),
        source: 'signmt',
      }
    }
  } catch {
    // sign.mt no disponible
  }

  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed }),
    })
    if (response.ok) {
      const data = await response.json()
      if (data.signs?.length > 0) {
        const normalized = data.signs
          .map((s) => String(s).replace(/\.mp4$/i, '').toUpperCase().replace(/\s+/g, '_').trim())
          .filter((s) => signKeys.includes(s))
        if (normalized.length > 0) {
          return {
            tokens: [],
            poseUrl: null,
            text: trimmed,
            fallback: normalized,
            source: 'claude',
          }
        }
      }
    }
  } catch {
    // Claude no disponible
  }

  return {
    tokens: [],
    poseUrl: null,
    text: trimmed,
    fallback: textToSignTokens(trimmed, signKeys),
    source: 'local',
  }
}
