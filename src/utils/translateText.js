import { textToSignTokens } from './textNormalizer.js'
import { getAllSignKeys } from './signMap.js'
import { bergamotSpokenToSignWriting } from './bergamotTranslate.js'
import { spokenToSignedPoseUrl } from './signMtApi.js'
import { SIGNED_LANG, SPOKEN_LANG } from './signLanguage.js'

/**
 * Traduce texto español → LSM (lengua de señas mexicana).
 *
 * @returns {Promise<{
 *   tokens: string[],
 *   poseUrl: string | null,
 *   text: string,
 *   fallback: string[],
 *   source: 'bergamot' | 'local'
 * }>}
 */
export async function translateText(text) {
  const signKeys = getAllSignKeys()
  const trimmed = text.trim()
  if (!trimmed) {
    return { tokens: [], poseUrl: null, text: '', fallback: [], source: 'local' }
  }

  try {
    const signWritingRaw = await bergamotSpokenToSignWriting(trimmed, {
      spoken: SPOKEN_LANG,
      signed: SIGNED_LANG,
    })
    const tokens = signWritingRaw.split(/\s+/).filter(Boolean)
    if (tokens.length > 0) {
      return {
        tokens,
        poseUrl: spokenToSignedPoseUrl(trimmed, SPOKEN_LANG, SIGNED_LANG),
        text: trimmed,
        fallback: textToSignTokens(trimmed, signKeys),
        source: 'bergamot',
      }
    }
  } catch (err) {
    console.warn('[Bergamot]', err?.message || err)
  }

  return {    tokens: [],
    poseUrl: null,
    text: trimmed,
    fallback: textToSignTokens(trimmed, signKeys),
    source: 'local',
  }
}
