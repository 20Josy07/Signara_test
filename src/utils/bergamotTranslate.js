import { createBergamotWorker } from '@sign-mt/browsermt'
import { createModelRegistry, listStorageFiles } from './bergamotAssets.js'
import { SIGNED_LANG, SPOKEN_LANG } from './signLanguage.js'

const DIRECTION = 'spoken-to-signed'
const GENERIC_PATH = 'models/browsermt/spoken-to-signed/spoken-signed/'

let worker = null
let loadedModelKey = null
let loadPromise = null

function postProcessSignWriting(text) {
  let out = String(text)
  out = out.replace(/\$[^\s]+/g, '')
  out = out.replace(/ /g, '')
  out = out.replace(/(\d)M/g, '$1 M')
  return out
}

async function initWorker() {
  if (worker) return worker
  worker = createBergamotWorker('/browsermt/worker.js')
  await worker.importBergamotWorker(
    '/browsermt/bergamot-translator-worker.js',
    '/browsermt/bergamot-translator-worker.wasm',
  )
  return worker
}

async function loadModel(from, to, modelPath) {
  const modelKey = `${from}${to}`
  if (loadedModelKey === modelKey) return

  const w = await initWorker()
  const inner = await createModelRegistry(modelPath)
  await w.loadModel(from, to, { [modelKey]: inner })
  loadedModelKey = modelKey
}

async function translateWithModel(from, to, modelPath, text) {
  await loadModel(from, to, modelPath)
  const w = await initWorker()
  const [result] = await w.translate(from, to, [text], [{ isHtml: false }])
  const raw = typeof result === 'string' ? result : result?.text
  return raw ? postProcessSignWriting(raw) : ''
}

/**
 * Español hablado → SignWriting (Bergamot en el navegador, como translate).
 */
export async function bergamotSpokenToSignWriting(text, {
  spoken = SPOKEN_LANG,
  signed = SIGNED_LANG,
} = {}) {
  const trimmed = String(text).trim().replace(/\n/g, ' ')
  if (!trimmed) return ''

  const specificPath = `models/browsermt/${DIRECTION}/${spoken}-${signed}/`

  try {
    const files = await listStorageFiles(specificPath)
    if (files.length > 0) {
      const out = await translateWithModel(spoken, signed, specificPath, trimmed)
      if (out) return out
    }
  } catch {
    // Sin modelo es-mfs en storage → modelo genérico spoken-signed
  }

  const tagged = `$${spoken} $${signed} ${trimmed}`
  return translateWithModel('spoken', 'signed', GENERIC_PATH, tagged)
}

/** Precarga worker + modelo genérico (primera traducción tarda menos). */
export function warmupBergamot() {
  if (!loadPromise) {
    loadPromise = bergamotSpokenToSignWriting('hola').catch(() => {
      loadPromise = null
    })
  }
  return loadPromise
}
