/**
 * Motor Sign Translate portado a React.
 * Basado en translate/src/app/modules/sign-writing/* y detector/*
 */
import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-backend-webgl'
import * as THREE from 'three'
import { interpretFswTokens } from '../utils/interpretApi.js'

const POSE = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_EYE: 2,
  RIGHT_EYE: 5,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
}

const FACE_MAP = {
  Eyes: ['񌞱', '񌡱', '񌠑', '񌧱'],
  Eyebrows: ['񌑑', '񌏱', '񌒱'],
  Mouth: ['񍪱', '񍡱', '񍤱', '񍘱', '񍝑', '񍠑', '񍭱'],
}

const HEEL_VIEW = new Set(['񁹱', '񁳱', '񆆑', '񅱑', '񁶱', '񂍑', '񂊑'].map((c) => c.codePointAt(0)))

let models = null
let fswModule = null
let fontsReady = false
let detectorState = { lastPose: null, lastTimestamp: 0, shoulderWidth: new Float32Array(20).fill(0), shoulderWidthIndex: 0 }

export async function initSignEngine() {
  if (models) return models
  await tf.setBackend('webgl')
  await tf.ready()

  const [handModel, faceModel, detectorModel] = await Promise.all([
    tf.loadLayersModel('/models/hand-shape/model.json'),
    tf.loadLayersModel('/models/face-features/model.json'),
    tf.loadLayersModel('/models/sign-detector/model.json'),
  ])

  const handArtifacts = await new Promise((resolve) => handModel.save({ save: resolve }))
  const rightHandModel = await tf.loadLayersModel({ load: () => Promise.resolve(handArtifacts) })

  models = { handModel, rightHandModel, faceModel, detectorModel }
  return models
}

async function loadFsw() {
  if (!fswModule) {
    fswModule = await import('@sutton-signwriting/font-ttf/fsw/fsw')
  }
  return fswModule
}

export async function loadSignWritingFonts() {
  if (fontsReady) return
  const font = await import('@sutton-signwriting/font-ttf/font/font.min')
  await new Promise((resolve) => font.cssAppend('/fonts/signwriting/', resolve))
  await new Promise((resolve) => font.cssLoaded(resolve))
  fontsReady = true
}

function toVectors(landmarks, w, h) {
  if (!landmarks?.length) return null
  return landmarks.map((l) => new THREE.Vector3((l.x ?? 0) * w, (l.y ?? 0) * h, (l.z ?? 0) * w))
}

function planeNormal(vectors, idx) {
  const triangle = idx.map((i) => vectors[i])
  const plane = new THREE.Plane().setFromCoplanarPoints(triangle[0], triangle[1], triangle[2])
  const center = new THREE.Vector3(
    (triangle[0].x + triangle[1].x + triangle[2].x) / 3,
    (triangle[0].y + triangle[1].y + triangle[2].y) / 3,
    (triangle[0].z + triangle[1].z + triangle[2].z) / 3,
  )
  return { center, direction: plane.normal.clone() }
}

function normalizeHand(vectors, normal, flip) {
  let matrix = tf.tensor2d(vectors.map((v) => [v.x, v.y, v.z]))
  const oldXAxis = new THREE.Vector3(1, 0, 0)
  const zAxis = normal.direction.clone().multiplyScalar(-1)
  const yAxis = new THREE.Vector3().crossVectors(oldXAxis, zAxis)
  const xAxis = new THREE.Vector3().crossVectors(zAxis, yAxis)
  const axis = tf.tensor2d([
    [xAxis.x, yAxis.x, zAxis.x],
    [xAxis.y, yAxis.y, zAxis.y],
    [xAxis.z, yAxis.z, zAxis.z],
  ])
  matrix = matrix.sub(matrix.slice(0, 1))
  matrix = tf.matMul(matrix, axis)
  if (flip) matrix = matrix.mul(tf.tensor2d([[-1, 1, 1]]))
  const p1 = matrix.slice(0, 1)
  const p2 = matrix.slice(9, 1)
  const vec = p2.sub(p1).arraySync()
  const angle = 90 + (Math.atan2(vec[0][1], vec[0][0]) * 180) / Math.PI
  const sinA = Math.sin((angle * Math.PI) / 180)
  const cosA = Math.cos((angle * Math.PI) / 180)
  const rot = tf.tensor2d([
    [cosA, -sinA, 0],
    [sinA, cosA, 0],
    [0, 0, 1],
  ])
  matrix = tf.matMul(matrix, rot)
  const j1 = matrix.slice(0, 1)
  const j2 = matrix.slice(9, 1)
  const len = tf.pow(j2.sub(j1), 2).sum().sqrt()
  matrix = matrix.mul(tf.scalar(200).div(len))
  return matrix.sub(matrix.slice(0, 1))
}

function handShape(model, vectors, normal, isLeft) {
  if (!model || !vectors) return '񆄡'
  const idx = tf.tidy(() => {
    const t = normalizeHand(vectors, normal, isLeft)
    const pred = model.predict(t.reshape([1, 1, 63]))
    return tf.softmax(pred).argMax(2).dataSync()[0]
  })
  return String.fromCodePoint(262145 + 0x60 * idx)
}

function handNormal(vectors, flip) {
  const n = planeNormal(vectors, [0, 5, 17])
  if (flip) n.direction.multiplyScalar(-1)
  return n
}

function handPlane(vectors) {
  const y = Math.abs(vectors[13].y - vectors[0].y) * 1.5
  const z = Math.abs(vectors[13].z - vectors[0].z)
  return y > z ? 'wall' : 'floor'
}

function handRotation(vectors) {
  const angle = (Math.atan2(vectors[13].y - vectors[0].y, vectors[13].x - vectors[0].x) * 180) / Math.PI + 90 + 22.5
  return Math.floor(((angle + 360) % 360) / 45) % 8
}

function handDirection(plane, normal, isLeft) {
  const x = isLeft ? -normal.direction.x : normal.direction.x
  if (plane === 'wall') {
    const a = (Math.atan2(normal.direction.z, x) * 180) / Math.PI
    if (a > 210) return 'me'
    if (a > 150) return 'side'
    return 'you'
  }
  const a = (Math.atan2(normal.direction.y, x) * 180) / Math.PI
  if (a > 0) return 'me'
  if (a > -60) return 'side'
  return 'you'
}

function finalHandChar(shape, hand, isLeft) {
  let char = shape.codePointAt(0)
  if (HEEL_VIEW.has(char + 0x10)) {
    if (!isLeft) char += 0x8
    char += isLeft ? (8 - hand.rotation) % 8 : hand.rotation
    char += 0x10
  } else {
    if (!isLeft) char += 0x8
    char += isLeft ? (8 - hand.rotation) % 8 : hand.rotation
    if (hand.plane === 'floor') char += 0x30
    char += { you: 0, side: 0x10, me: 0x20 }[hand.direction]
  }
  return String.fromCodePoint(char)
}

function coord(n) {
  return String(Math.min(999, Math.max(0, Math.round(n)))).padStart(3, '0')
}

async function fswBox(cx, cy, symbol) {
  const { signNormalize } = await loadFsw()
  return signNormalize(`M${coord(cx)}x${coord(cy)}${symbol}`)
}

function estimateHand(landmarks, w, h, isLeft) {
  const vectors = toVectors(landmarks, w, h)
  if (!vectors) return null
  const normal = handNormal(vectors, isLeft)
  const shape = handShape(isLeft ? models.handModel : models.rightHandModel, vectors, normal, isLeft)
  const bbox = new THREE.Box3().setFromPoints(vectors)
  const plane = handPlane(vectors)
  const hand = {
    shape,
    plane,
    rotation: handRotation(vectors),
    direction: handDirection(plane, normal, isLeft),
    bbox,
  }
  const cx = ((bbox.min.x + bbox.max.x) / 2 / w) * 1000
  const cy = ((bbox.min.y + bbox.max.y) / 2 / h) * 1000
  const symbol = finalHandChar(shape, hand, isLeft)
  return { cx, cy, symbol }
}

function estimateFace(landmarks, w, h) {
  const vectors = toVectors(landmarks, w, h)
  if (!vectors || !models.faceModel) return []
  const out = []
  const state = tf.tidy(() => {
    const normal = planeNormal(vectors, [4, 133, 362])
    let matrix = tf.tensor2d(vectors.map((v) => [v.x, v.y, v.z]))
    const oldXAxis = new THREE.Vector3(1, 0, 0)
    const zAxis = normal.direction.clone().multiplyScalar(-1)
    const yAxis = new THREE.Vector3().crossVectors(oldXAxis, zAxis)
    const xAxis = new THREE.Vector3().crossVectors(zAxis, yAxis)
    const axis = tf.tensor2d([
      [xAxis.x, yAxis.x, zAxis.x],
      [xAxis.y, yAxis.y, zAxis.y],
      [xAxis.z, yAxis.z, zAxis.z],
    ])
    matrix = matrix.sub(matrix.slice(4, 1))
    matrix = tf.matMul(matrix, axis)
    const p1 = matrix.slice(4, 1)
    const p2 = matrix.slice(6, 1)
    const vec = p2.sub(p1).arraySync()
    const angle = 90 + (Math.atan2(vec[0][1], vec[0][0]) * 180) / Math.PI
    const sinA = Math.sin((angle * Math.PI) / 180)
    const cosA = Math.cos((angle * Math.PI) / 180)
    matrix = tf.matMul(matrix, tf.tensor2d([[cosA, -sinA, 0], [sinA, cosA, 0], [0, 0, 1]]))
    const j1 = matrix.slice(4, 1)
    const j2 = matrix.slice(6, 1)
    matrix = matrix.mul(tf.scalar(200).div(tf.pow(j2.sub(j1), 2).sum().sqrt()))
    matrix = matrix.sub(matrix.slice(4, 1))
    const pred = models.faceModel.predict(matrix.reshape([1, 1, 468 * 3])).reshape([-1])
    const result = {}
    let i = 0
    for (const [k, vs] of Object.entries(FACE_MAP)) {
      result[k] = vs[pred.slice(i, i + vs.length).argMax(0).dataSync()[0]]
      i += vs.length
    }
    return result
  })

  const shift = (c, s) => String.fromCodePoint(c.codePointAt(0) + s)
  const eyesY = (vectors[133].y + vectors[362].y) / 2
  const features = [
    { x: vectors[4].x, y: vectors[4].y, symbol: '񋾡' },
    { x: (vectors[133].x + vectors[33].x) / 2, y: eyesY, symbol: shift(state.Eyes, 0x10) },
    { x: (vectors[362].x + vectors[263].x) / 2, y: eyesY, symbol: shift(state.Eyes, 0x10) },
    { x: vectors[282].x, y: (vectors[65].y + vectors[362].y) / 2, symbol: shift(state.Eyebrows, 0x10) },
    { x: vectors[52].x, y: (vectors[65].y + vectors[362].y) / 2, symbol: shift(state.Eyebrows, 0x20) },
    { x: (vectors[14].x + vectors[17].x) / 2, y: (vectors[14].y + vectors[17].y) / 2, symbol: state.Mouth },
  ]
  for (const f of features) {
    out.push({ cx: (f.x / w) * 1000, cy: (f.y / h) * 1000, symbol: f.symbol })
  }
  return out
}

/** Convierte resultados Holistic → tokens FSW (SignWriting). */
export async function holisticToFswTokens(results, width, height, { handsOnly = false } = {}) {
  await initSignEngine()
  const tokens = []

  if (results.leftHandLandmarks?.length) {
    const h = estimateHand(results.leftHandLandmarks, width, height, true)
    if (h) tokens.push(await fswBox(h.cx, h.cy, h.symbol))
  }
  if (results.rightHandLandmarks?.length) {
    const h = estimateHand(results.rightHandLandmarks, width, height, false)
    if (h) tokens.push(await fswBox(h.cx, h.cy, h.symbol))
  }
  if (!handsOnly && results.faceLandmarks?.length) {
    const faceParts = estimateFace(results.faceLandmarks, width, height)
    for (const f of faceParts) {
      tokens.push(await fswBox(f.cx, f.cy, f.symbol))
    }
  }

  return tokens
}

export async function fswTokensToText(tokens) {
  if (!tokens?.length) return ''
  try {
    return await interpretFswTokens(tokens)
  } catch (err) {
    console.warn('[sign-engine] fswTokensToText:', err?.message || err)
    throw err
  }
}
const EMPTY = { x: 0, y: 0 }

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function normalizeForDetector(results) {
  const body = results.poseLandmarks
  const lh = results.leftHandLandmarks
  const rh = results.rightHandLandmarks
  if (!body?.length) return null

  const landmarks = [...body, ...(lh || []), ...(rh || [])].map((l) =>
    l && l.x > 0.02 && l.x < 0.98 ? { x: l.x, y: l.y } : EMPTY,
  )

  const p1 = landmarks[POSE.LEFT_SHOULDER]
  const p2 = landmarks[POSE.RIGHT_SHOULDER]
  if (p1.x > 0 && p2.x > 0) {
    detectorState.shoulderWidth[detectorState.shoulderWidthIndex % 20] = dist(p1, p2)
    detectorState.shoulderWidthIndex++
  }
  if (detectorState.shoulderWidthIndex < 10) return null

  const mean = detectorState.shoulderWidth.slice(0, 10).reduce((a, b) => a + b, 0) / 10
  return [
    landmarks[POSE.NOSE],
    { x: (landmarks[POSE.LEFT_SHOULDER].x + landmarks[POSE.RIGHT_SHOULDER].x) / 2, y: (landmarks[POSE.LEFT_SHOULDER].y + landmarks[POSE.RIGHT_SHOULDER].y) / 2 },
    landmarks[POSE.RIGHT_SHOULDER], landmarks[POSE.RIGHT_ELBOW], landmarks[POSE.RIGHT_WRIST],
    landmarks[POSE.LEFT_SHOULDER], landmarks[POSE.LEFT_ELBOW], landmarks[POSE.LEFT_WRIST],
    EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
    landmarks[POSE.RIGHT_EYE], landmarks[POSE.LEFT_EYE], landmarks[POSE.RIGHT_EAR], landmarks[POSE.LEFT_EAR],
    EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY,
  ].map((v) => ({ x: v.x / mean, y: v.y / mean }))
}

/** Probabilidad de que la persona esté firmando (modelo sign-detector). */
export function detectSigning(results) {
  if (!models?.detectorModel) return 0
  const ts = performance.now() / 1000
  const normalized = normalizeForDetector(results)
  let confidence = 0

  if (detectorState.lastPose && normalized) {
    const fps = 1 / Math.max(0.001, ts - detectorState.lastTimestamp)
    const d = new Float32Array(normalized.length)
    for (let i = 0; i < normalized.length; i++) {
      if (normalized[i].x > 0 && detectorState.lastPose[i].x > 0) {
        d[i] = dist(normalized[i], detectorState.lastPose[i]) * fps
      }
    }
    confidence = tf.tidy(() => {
      const pred = models.detectorModel.predict(tf.tensor(d).reshape([1, 1, d.length]))
      return tf.softmax(pred).dataSync()[1]
    })
  }

  detectorState.lastTimestamp = ts
  detectorState.lastPose = normalized
  return confidence
}
