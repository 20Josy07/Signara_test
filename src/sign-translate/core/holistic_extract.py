"""Convierte resultados de MediaPipe Holistic a vector compacto (manos + cara)."""

import numpy as np

from core.gnn_model import (
    COMPACT_DIM,
    COMPACT_FACE_DIM,
    COMPACT_HAND_DIM,
    FACE_IDX,
    HAND_LANDMARKS_PER_HAND,
)


def _hand_coords(landmarks, flip_x: bool = True) -> np.ndarray:
    arr = np.zeros(HAND_LANDMARKS_PER_HAND * 3, dtype=np.float32)
    if landmarks is None:
        return arr
    for i, p in enumerate(landmarks.landmark[:HAND_LANDMARKS_PER_HAND]):
        x = 1.0 - p.x if flip_x else p.x
        arr[i * 3] = x
        arr[i * 3 + 1] = p.y
        arr[i * 3 + 2] = p.z
    return arr


def holistic_to_compact(results, *, flip_x: bool = True) -> np.ndarray:
    """
    MediaPipe Holistic → vector 1D de tamaño COMPACT_DIM.
    Misma convención que el frontend: swap left/right + flip X.
    """
    frame = np.zeros(COMPACT_DIM, dtype=np.float32)

    lh = _hand_coords(results.right_hand_landmarks, flip_x=flip_x)
    rh = _hand_coords(results.left_hand_landmarks, flip_x=flip_x)
    frame[:63] = lh
    frame[63:126] = rh

    if results.face_landmarks is not None:
        lm = results.face_landmarks.landmark
        face_start = COMPACT_HAND_DIM
        for i, idx in enumerate(FACE_IDX):
            p = lm[idx]
            x = 1.0 - p.x if flip_x else p.x
            base = face_start + i * 3
            frame[base] = x
            frame[base + 1] = p.y
            frame[base + 2] = p.z

    return frame
