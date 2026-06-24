// Índices faciales MediaPipe — deben coincidir con FACE_IDX en src/sign-translate/core/gnn_model.py
const FACE_IDX_RAW = [
  61, 146, 91, 181, 84, 17, 314, 405, 321, 375,
  291, 409, 270, 269, 267, 0, 37, 39, 40, 185,
  78, 95, 88, 178, 87, 14, 317, 402, 318, 324,
  33, 133, 159, 145, 153, 154, 155, 246, 161,
  160, 158, 157, 173, 144,
  70, 63, 105, 66, 107, 55, 65, 52, 53, 46,
]

export const FACE_IDX = [...new Set(FACE_IDX_RAW)]
export const COMPACT_HAND_DIM = 126
export const COMPACT_FACE_DIM = FACE_IDX.length * 3
export const COMPACT_DIM = COMPACT_HAND_DIM + COMPACT_FACE_DIM
