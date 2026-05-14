"""
Signara ML API
Servidor FastAPI que expone el modelo LSTM entrenado para predicción
de señas en tiempo real.

Uso:
    cd sign_ai
    uvicorn api:app --port 8000 --reload
"""

import json
import os

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import tensorflow as tf

from core.config import (
    LABEL_PATH,
    MAX_FEATURES,
    MODEL_PATH,
    SEQ_LEN,
    UMBRAL_CONFIANZA,
)

app = FastAPI(title="Signara ML API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

_model = None
_labels: list[str] = []


@app.on_event("startup")
async def load_model():
    global _model, _labels

    if not os.path.exists(MODEL_PATH):
        print(f"⚠  Modelo no encontrado: {MODEL_PATH}")
        print("   Ejecuta primero: python 02_train.py")
        return

    if not os.path.exists(LABEL_PATH):
        print(f"⚠  Labels no encontrados: {LABEL_PATH}")
        return

    _model = tf.keras.models.load_model(MODEL_PATH)

    with open(LABEL_PATH, "r", encoding="utf-8") as f:
        _labels = json.load(f)

    print(f"✅ Modelo cargado — clases: {_labels}")


# ─── Schemas ──────────────────────────────────────────────────────────────────

class PredictRequest(BaseModel):
    # 30 frames × 1659 features (debe coincidir con SEQ_LEN × MAX_FEATURES)
    landmarks: list[list[float]]


class PredictResponse(BaseModel):
    prediction: str
    confidence: float
    is_idle: bool


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": _model is not None,
        "labels": _labels,
        "seq_len": SEQ_LEN,
        "max_features": MAX_FEATURES,
        "umbral_confianza": UMBRAL_CONFIANZA,
    }


@app.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    if _model is None or not _labels:
        raise HTTPException(
            status_code=503,
            detail="Modelo no disponible. Ejecuta 02_train.py primero.",
        )

    try:
        data = np.array(req.landmarks, dtype=np.float32)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Landmarks inválidos: {exc}")

    if data.shape != (SEQ_LEN, MAX_FEATURES):
        raise HTTPException(
            status_code=422,
            detail=(
                f"Shape esperado ({SEQ_LEN}, {MAX_FEATURES}), "
                f"recibido {data.shape}. "
                "Asegúrate de enviar exactamente SEQ_LEN frames con MAX_FEATURES features cada uno."
            ),
        )

    input_data = np.expand_dims(data, axis=0)
    res = _model.predict(input_data, verbose=0)[0]

    idx = int(np.argmax(res))
    confidence = float(res[idx])
    prediction = _labels[idx]

    if confidence < UMBRAL_CONFIANZA:
        return PredictResponse(prediction="", confidence=confidence, is_idle=True)

    return PredictResponse(
        prediction=prediction,
        confidence=confidence,
        is_idle=(prediction == "IDLE"),
    )
