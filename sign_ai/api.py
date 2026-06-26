"""
Signara ML API — inferencia ONNX (Render free tier, sin PyTorch).
"""

import json
import os
from pathlib import Path

import numpy as np
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from core.confusion import evaluate_prediction
from core.onnx_runtime import load_onnx_session, predict_proba_onnx
from core.preprocess import sequence_compact_to_gnn
from core.sign_constants import COMPACT_DIM, COMPACT_HAND_DIM, LEGACY_N_NODES, LEGACY_SEQ_LEN

ONNX_MODEL_PATH = os.getenv("SIGNARA_ONNX_PATH", "models/signara_gnn.onnx")
GNN_LABEL_PATH = "models/labels_gnn.json"
GNN_META_PATH = "models/signara_gnn_meta.json"
ANIM_DIR = Path(__file__).parent / "animations"

UMBRAL_CONFIANZA = float(os.getenv("SIGNARA_UMBRAL", "0.80"))
MARGEN_TOP2 = float(os.getenv("SIGNARA_MARGEN_TOP2", "0.16"))

app = FastAPI(title="Signara ML API", version="5.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

_model_loaded = False
_model_type = "GCN+LSTM+ONNX"
_labels: list[str] = []
_normalize_inputs = False
_legacy_seq_len = LEGACY_SEQ_LEN
_legacy_n_nodes = LEGACY_N_NODES


def _load_meta() -> dict:
    if not os.path.exists(GNN_META_PATH):
        return {}
    with open(GNN_META_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _prepare_frames(frames: list[list[float]]) -> np.ndarray:
    seq_len = _legacy_seq_len
    try:
        data = np.array(frames, dtype=np.float32)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Frames invalidos: {exc}") from exc

    if data.ndim != 2:
        raise HTTPException(status_code=422, detail=f"Shape esperado (N, D), recibido {data.shape}.")

    allowed_dims = (COMPACT_HAND_DIM, COMPACT_DIM)
    if data.shape[1] not in allowed_dims:
        raise HTTPException(
            status_code=422,
            detail=f"Dimension esperada {allowed_dims}, recibido {data.shape[1]}.",
        )

    data = data[:, :COMPACT_HAND_DIM]

    if data.shape[0] < seq_len:
        raise HTTPException(
            status_code=422,
            detail=f"Se necesitan al menos {seq_len} frames, recibidos {data.shape[0]}.",
        )

    if data.shape[0] > seq_len:
        data = data[-seq_len:]

    return data


def _predict_from_frames(frames: list[list[float]]) -> dict:
    if not _model_loaded or not _labels:
        raise HTTPException(status_code=503, detail="Modelo no disponible.")

    data = _prepare_frames(frames)
    gnn_seq = sequence_compact_to_gnn(data, normalize=_normalize_inputs, hands_only=True)
    probs, _ = predict_proba_onnx(gnn_seq)

    prediction, confidence, _margin = evaluate_prediction(
        _labels,
        probs,
        min_conf=UMBRAL_CONFIANZA,
    )

    if prediction is None:
        return {"prediction": "", "confidence": confidence, "is_idle": True}

    return {"prediction": prediction, "confidence": confidence, "is_idle": False}


@app.on_event("startup")
async def load_model():
    global _model_loaded, _labels, _normalize_inputs

    if not os.path.exists(GNN_LABEL_PATH):
        print(f"Labels no encontrados: {GNN_LABEL_PATH}")
        return

    with open(GNN_LABEL_PATH, "r", encoding="utf-8") as f:
        _labels = json.load(f)

    meta = _load_meta()
    _normalize_inputs = bool(meta.get("normalize_inputs", False))

    if not os.path.exists(ONNX_MODEL_PATH):
        print(f"Modelo ONNX no encontrado: {ONNX_MODEL_PATH}")
        print("Ejecuta localmente: python 09_export_onnx.py")
        return

    load_onnx_session(ONNX_MODEL_PATH)
    _model_loaded = True
    print(
        f"Modelo ONNX cargado — clases: {_labels} | "
        f"SEQ_LEN={_legacy_seq_len} | nodos={LEGACY_HAND_NODES} | "
        f"normalizacion={_normalize_inputs} | umbral={UMBRAL_CONFIANZA}"
    )


class PredictRequest(BaseModel):
    frames: list[list[float]]


class PredictResponse(BaseModel):
    prediction: str
    confidence: float
    is_idle: bool


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": _model_loaded,
        "model_type": _model_type if _model_loaded else "none",
        "labels": _labels,
        "seq_len": _legacy_seq_len,
        "compact_dim": COMPACT_HAND_DIM,
        "n_nodes": _legacy_n_nodes,
        "umbral_confianza": UMBRAL_CONFIANZA,
        "margen_top2": MARGEN_TOP2,
        "normalize_inputs": _normalize_inputs,
        "onnx_path": ONNX_MODEL_PATH,
    }


@app.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    result = _predict_from_frames(req.frames)
    return PredictResponse(**result)


@app.websocket("/ws/predict")
async def ws_predict(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            raw = await ws.receive_text()
            payload = json.loads(raw)
            frames = payload.get("frames", [])
            try:
                result = _predict_from_frames(frames)
            except HTTPException as exc:
                await ws.send_json({"error": exc.detail, "status_code": exc.status_code})
                continue
            await ws.send_json(result)
    except WebSocketDisconnect:
        pass


@app.get("/animations")
def list_animations():
    if not ANIM_DIR.exists():
        return {"tokens": []}
    tokens = [p.stem for p in ANIM_DIR.glob("*.json")]
    return {"tokens": sorted(tokens)}


@app.get("/sign/{token}")
def get_sign_animation(token: str):
    token = token.upper()
    path = ANIM_DIR / f"{token}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Animacion no encontrada: {token}")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)
