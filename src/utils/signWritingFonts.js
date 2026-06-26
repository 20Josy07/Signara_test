/**
 * Carga fuentes SignWriting (sin importar sign-engine / TensorFlow).
 *
 * Nota: cssAppend(path) NO acepta callback — solo inyecta @font-face.
 * Hay que llamar cssLoaded(cb) aparte para saber cuándo están listas.
 */

let fontsReady = false
let loadPromise = null

const FONT_LOAD_TIMEOUT_MS = 20_000

export async function loadSignWritingFonts() {
  if (fontsReady) return
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    const font = await import('@sutton-signwriting/font-ttf/font/font.min')
    // Inyecta estilos (ruta local + fallback CDN en el propio módulo)
    font.cssAppend('/fonts/signwriting/')

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('cssLoaded: tiempo agotado'))
      }, FONT_LOAD_TIMEOUT_MS)

      font.cssLoaded(() => {
        clearTimeout(timer)
        resolve()
      })
    })

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
