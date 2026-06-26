/**
 * Normaliza tokens FSW como en translate (SetSignWritingText).
 */

const NORMALIZE_TIMEOUT_MS = 5_000

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('signNormalize: tiempo agotado')), ms)
    }),
  ])
}

export async function normalizeFswTokens(tokens) {
  if (!tokens?.length) return []

  const { signNormalize } = await import('@sutton-signwriting/font-ttf/fsw/fsw')
  const out = []

  for (const sign of tokens) {
    const raw = String(sign).trim()
    if (!raw) continue
    const boxed = raw.startsWith('M') ? raw : `M500x500${raw}`
    try {
      out.push(await withTimeout(signNormalize(boxed), NORMALIZE_TIMEOUT_MS))
    } catch {
      out.push(boxed)
    }
  }

  return out
}
