import { textToSignTokens } from './textNormalizer.js'
import { getAllSignKeys } from './signMap.js'

/**
 * translateText
 * Converts free-form Spanish text into an ordered array of sign tokens.
 *
 * Strategy:
 *  1. Try the backend /api/translate (may enrich with NLP/grammar ordering).
 *  2. If the API is unavailable or returns nothing, fall back to local
 *     normalization + fuzzy matching (works fully offline).
 *
 * @param {string} text
 * @returns {Promise<string[]>} e.g. ["HOLA", "POR_FAVOR"]
 */
export async function translateText(text) {
  const signKeys = getAllSignKeys()

  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })

    if (!response.ok) throw new Error('API error')

    const data = await response.json()
    if (data.signs && data.signs.length > 0) return data.signs
    // API returned empty array — fall through to local
  } catch {
    // API unavailable — silent fallback
  }

  return textToSignTokens(text, signKeys)
}
