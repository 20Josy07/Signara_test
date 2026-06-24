/**
 * Modelos Bergamot en Firebase Storage (bucket sign-mt-assets, mismo que translate).
 */

const BUCKET = 'sign-mt-assets'
const API_KEY =
  import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAtVDGmDVCwWunWW2ocgeHWnAsUhHuXvcg'

export function storageDownloadUrl(path) {
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&key=${API_KEY}`
}

export async function listStorageFiles(prefix) {
  const normalized = prefix.endsWith('/') ? prefix : `${prefix}/`
  const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o?prefix=${encodeURIComponent(normalized)}&maxResults=50&key=${API_KEY}`
  const r = await fetch(url)
  if (!r.ok) throw new Error(`Storage list: HTTP ${r.status}`)
  const data = await r.json()
  return (data.items || []).map((item) => item.name)
}

/** Registro de modelo para @sign-mt/browsermt (lex, model, vocab). */
export async function createModelRegistry(modelPath) {
  const prefix = modelPath.endsWith('/') ? modelPath : `${modelPath}/`
  const names = await listStorageFiles(prefix)
  if (names.length === 0) {
    throw new Error(`Sin archivos en ${prefix}`)
  }

  const registry = {}
  for (const fullPath of names) {
    const fileName = fullPath.split('/').pop()
    const fileType = fileName.split('.')[0]
    registry[fileType] = {
      name: storageDownloadUrl(fullPath),
      size: 0,
      estimatedCompressedSize: 0,
      modelType: 'prod',
    }
  }

  if (!registry.model || !registry.lex || !registry.vocab) {
    throw new Error(`Modelo incompleto en ${prefix}`)
  }

  return registry
}
