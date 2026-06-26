/**
 * Traduce texto español → animación 3D LSM (pose-viewer).
 * Respaldo: videos MP4 locales del avatar.
 */

import { textToSignTokens } from './textNormalizer.js'
import { getAllSignKeys } from './signMap.js'
import { fetchPoseBlobUrl } from './poseApi.js'

/**
 * @returns {Promise<{
 *   poseSrc: string | null,
 *   text: string,
 *   fallback: string[],
 *   source: 'pose3d' | 'local'
 * }>}
 */
export async function translateText(text) {
  const signKeys = getAllSignKeys()
  const trimmed = text.trim()
  if (!trimmed) {
    return { poseSrc: null, text: '', fallback: [], source: 'local' }
  }

  const fallback = textToSignTokens(trimmed, signKeys)

  try {
    const poseSrc = await fetchPoseBlobUrl(trimmed)
    if (poseSrc) {
      return { poseSrc, text: trimmed, fallback, source: 'pose3d' }
    }
  } catch (err) {
    console.warn('[pose 3D]', err?.message || err)
  }

  return { poseSrc: null, text: trimmed, fallback, source: 'local' }
}
