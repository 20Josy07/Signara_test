import { textToSignTokens } from './textNormalizer.js'
import { getAllSignKeys } from './signMap.js'
import { bergamotSpokenToSignWriting } from './bergamotTranslate.js'
import { normalizeFswTokens } from './signWritingNormalize.js'
import { SIGNED_LANG, SPOKEN_LANG } from './signLanguage.js'

/**
 * Traduce texto español → LSM (lengua de señas mexicana).
 *
 * @returns {Promise<{
 *   tokens: string[],
 *   text: string,
 *   fallback: string[],
 *   source: 'bergamot' | 'local'
 * }>}
 */
export async function translateText(text) {
  const signKeys = getAllSignKeys()
  const trimmed = text.trim()
  if (!trimmed) {
    return { tokens: [], text: '', fallback: [], source: 'local' }
  }

  try {
    const signWritingRaw = await bergamotSpokenToSignWriting(trimmed, {
      spoken: SPOKEN_LANG,
      signed: SIGNED_LANG,
    })
    const rawTokens = signWritingRaw.split(/\s+/).filter(Boolean)
    const tokens = await normalizeFswTokens(rawTokens)
    if (tokens.length > 0) {
      return {
        tokens,
        text: trimmed,
        fallback: textToSignTokens(trimmed, signKeys),
        source: 'bergamot',
      }
    }
  } catch (err) {
    console.warn('[Bergamot]', err?.message || err)
  }

  return {
    tokens: [],
    text: trimmed,
    fallback: textToSignTokens(trimmed, signKeys),
    source: 'local',
  }
}
