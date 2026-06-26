"""
Preprocesado compartido entre entrenamiento, API y predicción en tiempo real.
"""

import numpy as np

from core.sign_constants import (
    COMPACT_DIM,
    COMPACT_FACE_DIM,
    COMPACT_HAND_DIM,
    FACE_TOTAL_NODES,
    HAND_TOTAL_NODES,
    LEGACY_HAND_NODES,
    N_FEATURES,
    N_NODES,
    NODE_TYPE_FACE,
    NODE_TYPE_HAND_L,
    NODE_TYPE_HAND_R,
)
MIN_HAND_SCALE = 0.05


def compact_to_gnn(frame_compact: np.ndarray, *, hands_only: bool = False) -> np.ndarray:
    """
    Convierte un frame compacto a tensor de nodos.
    - hands_only=True → (42, 4) solo manos (modelo legado).
    - hands_only=False → (N_NODES, 4) manos + cara.
    """
    lh = frame_compact[:63].reshape(21, 3)
    rh = frame_compact[63:126].reshape(21, 3)

    out_nodes = LEGACY_HAND_NODES if hands_only else N_NODES
    nodes = np.zeros((out_nodes, N_FEATURES), dtype=np.float32)
    nodes[:21, :3] = lh
    nodes[:21, 3] = NODE_TYPE_HAND_L
    nodes[21:42, :3] = rh
    nodes[21:42, 3] = NODE_TYPE_HAND_R

    if not hands_only and frame_compact.size >= COMPACT_DIM:
        face_flat = frame_compact[COMPACT_HAND_DIM:COMPACT_HAND_DIM + COMPACT_FACE_DIM]
        face = face_flat.reshape(FACE_TOTAL_NODES, 3)
        fs = HAND_TOTAL_NODES
        nodes[fs:fs + FACE_TOTAL_NODES, :3] = face
        nodes[fs:fs + FACE_TOTAL_NODES, 3] = NODE_TYPE_FACE

    return nodes


def normalize_hand_nodes(nodes: np.ndarray, start: int, end: int) -> None:
    wrist = nodes[start, :3].copy()
    if np.linalg.norm(wrist) < 1e-6:
        return
    nodes[start:end, :3] -= wrist
    span = max(float(np.linalg.norm(nodes[i, :3])) for i in range(start, end))
    scale = max(span, MIN_HAND_SCALE)
    nodes[start:end, :3] /= scale


def normalize_face_nodes(nodes: np.ndarray, start: int, end: int) -> None:
    block = nodes[start:end, :3]
    if np.linalg.norm(block) < 1e-6:
        return
    center = block.mean(axis=0)
    nodes[start:end, :3] -= center
    span = max(float(np.linalg.norm(nodes[i, :3])) for i in range(start, end))
    scale = max(span, MIN_HAND_SCALE)
    nodes[start:end, :3] /= scale


def normalize_frame_nodes(nodes: np.ndarray) -> np.ndarray:
    out = nodes.astype(np.float32, copy=True)
    normalize_hand_nodes(out, 0, 21)
    normalize_hand_nodes(out, 21, 42)
    if out.shape[0] > LEGACY_HAND_NODES:
        normalize_face_nodes(out, HAND_TOTAL_NODES, N_NODES)
    return out


def normalize_sequence(seq: np.ndarray) -> np.ndarray:
    return np.stack([normalize_frame_nodes(frame) for frame in seq], axis=0)


def pad_compact_frame(frame_compact: np.ndarray) -> np.ndarray:
    """Rellena con ceros si el frame solo trae manos (126 valores)."""
    if frame_compact.size >= COMPACT_DIM:
        return frame_compact[:COMPACT_DIM]
    out = np.zeros(COMPACT_DIM, dtype=np.float32)
    out[: frame_compact.size] = frame_compact
    return out


def sequence_compact_to_gnn(
    frames_compact: np.ndarray,
    *,
    normalize: bool = True,
    hands_only: bool = False,
) -> np.ndarray:
    """(T, D) → (T, nodes, 4). D puede ser 126 o COMPACT_DIM."""
    seq = []
    for i in range(len(frames_compact)):
        row = frames_compact[i]
        if not hands_only:
            row = pad_compact_frame(row)
        seq.append(compact_to_gnn(row, hands_only=hands_only))
    out = np.stack(seq, axis=0)
    if normalize:
        out = normalize_sequence(out)
    return out


def predict_logits(model, edge_index, gnn_seq):
    from core.gnn_model import predict_proba

    return predict_proba(model, edge_index, gnn_seq)
