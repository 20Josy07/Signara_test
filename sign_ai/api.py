"""
Signara ML API — inferencia GCN+LSTM o GAT+Transformer.
Optimizado para Render free tier (512 MB RAM).
"""

import gc
import json
import os
from pathlib import Path

import numpy as np
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from core.confusion import evaluate_prediction
from core.preprocess import sequence_compact_to_gnn
from core.sign_constants import COMPACT_DIM, COMPACT_HAND_DIM, N_NODES, SEQ_LEN
from core.torch_util import compile_model, detect_model_type, load_state_dict

GNN_MODEL_PATH = "models/signara_gnn.pt"
GNN_LABEL_PATH = "models/labels_gnn.json"
GNN_META_PATH = "models/signara_gnn_meta.json"
ANIM_DIR = Path(__file__).parent / "animations"

UMBRAL_CONFIANZA = float(os.getenv("SIGNARA_UMBRAL", "0.80"))
MARGEN_TOP2 = float(os.getenv("SIGNARA_MARGEN_TOP2", "0.16"))

app = FastAPI(title="Signara ML API", version="4.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

_model = None
_model_type: str | None = None
_edge_index = None
_batch_index = None
_labels: list[str] = []
_normalize_inputs = False
_legacy_seq_len = 30
_legacy_n_nodes = 42


def _model_seq_len() -> int:
    return _legacy_seq_len if _model_type == "GCN+LSTM" else SEQ_LEN


def _load_meta() -> dict:
    if not os.path.exists(GNN_META_PATH):
        return {}
    with open(GNN_META_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _prepare_frames(frames: list[list[float]]) -> np.ndarray:
    seq_len = _model_seq_len()
    try:
        data = np.array(frames, dtype=np.float32)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Frames invalidos: {exc}") from exc

    if data.ndim != 2:
        raise HTTPException(status_code=422, detail=f"Shape esperado (N, D), recibido {data.shape}.")

    legacy = _model_type == "GCN+LSTM"
    allowed_dims = (COMPACT_HAND_DIM, COMPACT_DIM) if not legacy else (COMPACT_HAND_DIM, COMPACT_DIM)
    if data.shape[1] not in allowed_dims:
        raise HTTPException(
            status_code=422,
            detail=f"Dimension esperada {allowed_dims}, recibido {data.shape[1]}.",
        )

    if legacy:
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
    if _model is None or not _labels:
        raise HTTPException(status_code=503, detail="Modelo no disponible.")

    data = _prepare_frames(frames)
    hands_only = _model_type == "GCN+LSTM"
    gnn_seq = sequence_compact_to_gnn(data, normalize=_normalize_inputs, hands_only=hands_only)

    if _model_type == "GAT+Transformer":
        from core.gnn_model import predict_proba

        probs, _ = predict_proba(_model, _edge_index, gnn_seq, batch_index=_batch_index)
    else:
        from core.gnn_legacy import predict_proba_legacy

        probs, _ = predict_proba_legacy(_model, gnn_seq)

    prediction, confidence, _margin = evaluate_prediction(
        _labels,
        probs,
        min_conf=UMBRAL_CONFIANZA,
    )

    if prediction is None:
        return {"prediction": "", "confidence": confidence, "is_idle": True}

    return {"prediction": prediction, "confidence": confidence, "is_idle": False}


def _load_legacy_model(state: dict, n_classes: int):
    global _model, _model_type, _edge_index, _batch_index, _legacy_seq_len, _legacy_n_nodes

    from core.gnn_legacy import GCN_LSTM, LEGACY_N_NODES, LEGACY_SEQ_LEN

    legacy_model = GCN_LSTM(n_classes=n_classes)
    legacy_model.load_state_dict(state)
    legacy_model.eval()
    _model = compile_model(legacy_model)
    _model_type = "GCN+LSTM"
    _edge_index = None
    _batch_index = None
    _legacy_seq_len = LEGACY_SEQ_LEN
    _legacy_n_nodes = LEGACY_N_NODES
    print(f"Modelo GCN+LSTM cargado — clases: {_labels}")


def _load_gat_model(state: dict, n_classes: int):
    global _model, _model_type, _edge_index, _batch_index

    from core.gnn_model import build_batch_index, create_edge_index, get_model

    _edge_index = create_edge_index()
    _batch_index = build_batch_index(1)
    gat_model = get_model(num_classes=n_classes, seq_len=SEQ_LEN)
    gat_model.load_state_dict(state)
    gat_model.eval()
    _model = compile_model(gat_model)
    _model_type = "GAT+Transformer"
    print(f"Modelo GAT+Transformer cargado — clases: {_labels}")


@app.on_event("startup")
async def load_model():
    global _labels, _normalize_inputs

    if not os.path.exists(GNN_LABEL_PATH):
        print(f"Labels no encontrados: {GNN_LABEL_PATH}")
        return

    with open(GNN_LABEL_PATH, "r", encoding="utf-8") as f:
        _labels = json.load(f)

    meta = _load_meta()
    _normalize_inputs = bool(meta.get("normalize_inputs", False))
    hinted = meta.get("model_type")

    if not os.path.exists(GNN_MODEL_PATH):
        print(f"Modelo GNN no encontrado: {GNN_MODEL_PATH}")
        return

    state = load_state_dict(GNN_MODEL_PATH)
    model_type = detect_model_type(state, hinted)

    try:
        if model_type == "GCN+LSTM":
            _load_legacy_model(state, len(_labels))
        else:
            _load_gat_model(state, len(_labels))
    except Exception as exc:
        if model_type == "GAT+Transformer":
            print(f"Checkpoint GAT fallo ({exc}); probando GCN+LSTM…")
            try:
                _load_legacy_model(state, len(_labels))
            except Exception as legacy_exc:
                print(f"No se pudo cargar el checkpoint: {legacy_exc}")
                return
        else:
            print(f"No se pudo cargar el checkpoint: {exc}")
            return
    finally:
        del state
        gc.collect()

    n_nodes = _legacy_n_nodes if _model_type == "GCN+LSTM" else N_NODES
    print(
        f"   tipo={_model_type} | SEQ_LEN={_model_seq_len()} | nodos={n_nodes} | "
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
        "model_loaded": _model is not None,
        "model_type": _model_type or "none",
        "labels": _labels,
        "seq_len": _model_seq_len() if _model else SEQ_LEN,
        "compact_dim": COMPACT_HAND_DIM if _model_type == "GCN+LSTM" else COMPACT_DIM,
        "n_nodes": _legacy_n_nodes if _model_type == "GCN+LSTM" else N_NODES,
        "umbral_confianza": UMBRAL_CONFIANZA,
        "margen_top2": MARGEN_TOP2,
        "normalize_inputs": _normalize_inputs,
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
