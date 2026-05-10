/**
 * interpretSign
 *
 * MVP-mocked sign-language recognizer. In production this will:
 *   1. Capture a frame (or short clip) from the <video>
 *   2. Send it to Claude Vision (or a custom model) for classification
 *   3. Return { sign, confidence, text }
 *
 * For the demo we just rotate through a small set of plausible signs so
 * the UI feels alive when the camera is on.
 */

const MOCK_LIBRARY = [
  { sign: 'HOLA',      text: 'Hola, mucho gusto.' },
  { sign: 'GRACIAS',   text: 'Gracias.' },
  { sign: 'AYUDA',     text: 'Necesito ayuda.' },
  { sign: 'AGUA',      text: 'Tengo sed, quiero agua.' },
  { sign: 'COMIDA',    text: 'Tengo hambre.' },
  { sign: 'SI',        text: 'Sí.' },
  { sign: 'NO',        text: 'No.' },
  { sign: 'FAMILIA',   text: 'Mi familia.' },
  { sign: 'AMIGO',     text: 'Mi amigo.' },
  { sign: 'BIEN',      text: 'Estoy bien.' },
  { sign: 'POR_FAVOR', text: 'Por favor.' }
]

let lastIdx = -1

/**
 * @param {HTMLVideoElement} _videoEl - the live camera element (unused in mock)
 * @returns {Promise<{sign:string, confidence:number, text:string}>}
 */
export async function interpretSign(_videoEl) {
  // Pequeña latencia simulada
  await new Promise((r) => setTimeout(r, 350))

  // Elige una seña distinta a la última para que el demo se sienta dinámico
  let idx
  do {
    idx = Math.floor(Math.random() * MOCK_LIBRARY.length)
  } while (idx === lastIdx && MOCK_LIBRARY.length > 1)
  lastIdx = idx

  const item = MOCK_LIBRARY[idx]
  // Confianza simulada entre 0.78 y 0.98
  const confidence = 0.78 + Math.random() * 0.20

  return {
    sign: item.sign,
    text: item.text,
    confidence: Math.round(confidence * 100) / 100
  }
}
