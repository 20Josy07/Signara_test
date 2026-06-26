import { COMPACT_DIM } from '../data/faceIdx.js'

export const ML_API_URL =
  import.meta.env.VITE_ML_API_URL ||
  (import.meta.env.PROD
    ? 'https://signara-test.onrender.com'
    : 'http://localhost:8080')

export const ML_WS_URL = ML_API_URL.replace(/^http/, 'ws') + '/ws/predict'

const CACHE_TTL_MS = 5 * 60 * 1000

/** @type {{ ok: boolean, at: number, seqLen?: number, compactDim?: number } | null} */
let cached = null
/** @type {Promise<{ ok: boolean, at: number, seqLen?: number, compactDim?: number }> | null} */
let inflight = null

export function getMlApiCache() {
  return cached
}

export function checkMlApiHealth({ force = false } = {}) {
  if (!force && cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return Promise.resolve(cached)
  }
  if (!force && inflight) return inflight

  inflight = fetch(`${ML_API_URL}/health`)
    .then((r) => r.json())
    .then((data) => {
      cached = {
        ok: !!data.model_loaded,
        at: Date.now(),
        seqLen: data.seq_len ?? 15,
        compactDim: data.compact_dim ?? COMPACT_DIM,
      }
      inflight = null
      return cached
    })
    .catch(() => {
      cached = { ok: false, at: Date.now(), seqLen: 15, compactDim: COMPACT_DIM }
      inflight = null
      return cached
    })

  return inflight
}

/** Despierta la API en segundo plano (p. ej. desde el landing). */
export function warmupMlApi() {
  return checkMlApiHealth()
}

/**
 * WebSocket para predicciones en flujo continuo (menos overhead que HTTP).
 * @returns {{ send: (frames: number[][]) => boolean, close: () => void, ready: boolean }}
 */
export function createMlPredictSocket({ onMessage, onError, onClose } = {}) {
  const ws = new WebSocket(ML_WS_URL)

  ws.onmessage = (ev) => {
    try {
      onMessage?.(JSON.parse(ev.data))
    } catch (_) {
      onError?.(new Error('Respuesta WebSocket inválida'))
    }
  }
  ws.onerror = () => onError?.(new Error('Error de WebSocket'))
  ws.onclose = () => onClose?.()

  return {
    send(frames) {
      if (ws.readyState !== WebSocket.OPEN) return false
      ws.send(JSON.stringify({ frames }))
      return true
    },
    close() {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close()
      }
    },
    get ready() {
      return ws.readyState === WebSocket.OPEN
    },
  }
}
