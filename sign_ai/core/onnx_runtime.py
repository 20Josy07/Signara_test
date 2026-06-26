"""Inferencia GCN+LSTM via ONNX Runtime (sin PyTorch en producción)."""

from __future__ import annotations

import numpy as np

_ONNX_SESSION = None
_ONNX_INPUT = None


def load_onnx_session(path: str):
    global _ONNX_SESSION, _ONNX_INPUT

    import onnxruntime as ort

    opts = ort.SessionOptions()
    opts.inter_op_num_threads = 1
    opts.intra_op_num_threads = 1
    opts.enable_cpu_mem_arena = False
    opts.enable_mem_pattern = False

    _ONNX_SESSION = ort.InferenceSession(
        path,
        sess_options=opts,
        providers=["CPUExecutionProvider"],
    )
    _ONNX_INPUT = _ONNX_SESSION.get_inputs()[0].name
    return _ONNX_SESSION


def predict_proba_onnx(gnn_seq: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    if _ONNX_SESSION is None or _ONNX_INPUT is None:
        raise RuntimeError("Sesión ONNX no inicializada.")

    x = np.ascontiguousarray(gnn_seq, dtype=np.float32)[np.newaxis, ...]
    logits = _ONNX_SESSION.run(None, {_ONNX_INPUT: x})[0][0]
    logits = logits - logits.max()
    exp = np.exp(logits)
    probs = exp / exp.sum()
    order = np.argsort(probs)[::-1]
    return probs, order
