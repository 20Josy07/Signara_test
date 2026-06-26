/**
 * Normaliza tokens FSW como en translate (SetSignWritingText).
 */

export async function normalizeFswTokens(tokens) {
  if (!tokens?.length) return []

  const { signNormalize } = await import('@sutton-signwriting/font-ttf/fsw/fsw')
  const out = []

  for (const sign of tokens) {
    const raw = String(sign).trim()
    if (!raw) continue
    const boxed = raw.startsWith('M') ? raw : `M500x500${raw}`
    try {
      out.push(await signNormalize(boxed))
    } catch {
      out.push(boxed)
    }
  }

  return out
}
