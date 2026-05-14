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
    if (data.signs && data.signs.length > 0) {
      // Normalize: strip ".mp4" suffix if present (legacy API format), uppercase
      const normalized = data.signs
        .map(s => String(s).replace(/\.mp4$/i, '').toUpperCase().replace(/\s+/g, '_').trim())
        .filter(s => signKeys.includes(s))
      if (normalized.length > 0) {
        // Ensure API response follows text order (guard against LLM reordering)
        const textNorm = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
        return [...normalized].sort((a, b) => {
          const ai = textNorm.indexOf(a.toLowerCase().replace(/_/g, ' '))
          const bi = textNorm.indexOf(b.toLowerCase().replace(/_/g, ' '))
          return (ai === -1 ? 9999 : ai) - (bi === -1 ? 9999 : bi)
        })
      }
    }
    // API returned empty or unrecognized tokens — fall through to local
  } catch {
    // API unavailable — silent fallback
  }

  return textToSignTokens(text, signKeys)
}
