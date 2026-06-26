/**
 * Carga fuentes SignWriting (sin importar sign-engine / TensorFlow).
 */

let fontsReady = false
let loadPromise = null

const FONT_TIMEOUT_MS = 12_000

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label}: tiempo agotado`)), ms)
    }),
  ])
}

export async function loadSignWritingFonts() {
  if (fontsReady) return
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    const font = await import('@sutton-signwriting/font-ttf/font/font.min')
    await withTimeout(
      new Promise((resolve) => font.cssAppend('/fonts/signwriting/', resolve)),
      FONT_TIMEOUT_MS,
      'cssAppend',
    )
    await withTimeout(
      new Promise((resolve) => font.cssLoaded(resolve)),
      FONT_TIMEOUT_MS,
      'cssLoaded',
    )
    fontsReady = true
  })().catch((err) => {
    loadPromise = null
    throw err
  })

  return loadPromise
}

export function areSignWritingFontsReady() {
  return fontsReady
}
