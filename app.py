# app.py — API demo con Holistic (manos + cara) y aprendizaje continuo opcional
import os

import cv2
import mediapipe as mp
import numpy as np
import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from continual_learner import ContinualLearner
from sign_ai.core.gnn_model import (
    N_NODES,
    SEQ_LEN,
    build_batch_index,
    compile_model,
    create_edge_index,
    get_model,
)
from sign_ai.core.holistic_extract import holistic_to_compact
from sign_ai.core.preprocess import compact_to_gnn, normalize_frame_nodes

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
NUM_CLASSES = 120

base_model = get_model(num_classes=NUM_CLASSES, seq_len=SEQ_LEN, ctc=False).to(DEVICE)
if DEVICE.type == "cuda":
    base_model = base_model.half()
base_model = compile_model(base_model)
edge_index = create_edge_index().to(DEVICE)
_batch_index = build_batch_index(1, device=DEVICE)

ENABLE_CONTINUAL = os.getenv("SIGNARA_CONTINUAL", "0") == "1"
learner = ContinualLearner(
    base_model=base_model,
    edge_index=edge_index,
    num_classes=NUM_CLASSES,
    seq_len=SEQ_LEN,
    device=DEVICE,
    conf_thresh=0.55,
    entropy_thresh=1.5,
)
if ENABLE_CONTINUAL:
    learner.start()

mp_holistic = mp.solutions.holistic
holistic = mp_holistic.Holistic(
    static_image_mode=False,
    model_complexity=0,
    enable_segmentation=False,
    refine_face_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)

app = FastAPI(title="LSC Sign Recognizer (hands + face)")


def holistic_frame_to_model_tensor(results) -> torch.Tensor:
    """Un frame Holistic → tensor plano (N_NODES, 4)."""
    compact = holistic_to_compact(results, flip_x=True)
    nodes = compact_to_gnn(compact, hands_only=False)
    nodes = normalize_frame_nodes(nodes)
    return torch.from_numpy(nodes.reshape(-1, 4))


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Imagen no válida")

    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    results = holistic.process(img_rgb)

    has_signal = (
        results.left_hand_landmarks
        or results.right_hand_landmarks
        or results.face_landmarks
    )
    if not has_signal:
        return JSONResponse({"prediction": None, "confidence": 0.0})

    global _frame_buffer
    try:
        _frame_buffer
    except NameError:
        _frame_buffer = []

    tensor_frame = holistic_frame_to_model_tensor(results)
    _frame_buffer.append(tensor_frame)

    if len(_frame_buffer) >= SEQ_LEN:
        seq_tensor = torch.stack(_frame_buffer[-SEQ_LEN:])
        seq_tensor = seq_tensor.view(1, SEQ_LEN * N_NODES, 4).to(DEVICE)

        with torch.no_grad():
            logits = learner.base_model(seq_tensor, learner.edge_index, _batch_index)
            probs = torch.softmax(logits, dim=-1)
            confidence, pred_idx = torch.max(probs, dim=-1)

        if ENABLE_CONTINUAL:
            learner.observe(seq_tensor)

        return JSONResponse({
            "prediction": int(pred_idx.item()),
            "confidence": float(confidence.item()),
        })

    return JSONResponse({
        "prediction": None,
        "confidence": 0.0,
        "frames_received": len(_frame_buffer),
    })
