# app.py
import io
import os
import time
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import torch
import numpy as np
import cv2
import mediapipe as mp

from continual_learner import ContinualLearner
from sign_ai.core.gnn_model import SEQ_LEN, get_model, create_edge_index, compile_model

# ---------- CONFIG ----------
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
NUM_CLASSES = 120
# ----------------------------------------------------

# ---------- CARGA DEL MODELO ----------
base_model = get_model(
    num_classes=NUM_CLASSES,
    seq_len=SEQ_LEN,
    ctc=False,
).to(DEVICE)
if DEVICE.type == "cuda":
    base_model = base_model.half()
base_model = compile_model(base_model)
edge_index = create_edge_index().to(DEVICE)

# ---------- INICIALIZAMOS EL LEARNER ----------
ENABLE_CONTINUAL = os.getenv("SIGNARA_CONTINUAL", "0") == "1"
learner = ContinualLearner(
    base_model=base_model,
    edge_index=edge_index,
    num_classes=NUM_CLASSES,
    seq_len=SEQ_LEN,
    device=DEVICE,
    conf_thresh=0.60,
    entropy_thresh=1.5,
)
if ENABLE_CONTINUAL:
    learner.start()
# ----------------------------------------------

# ---------- MEDIAPPipe (solo manos) ----------
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=2,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)
# ----------------------------------------------

app = FastAPI(title="LSC Sign Recognizer (continuous learning)")

def landmarks_to_tensor(hand_landmarks_list):
    """
    Convierte la salida de MediaPipe (lista de objetos `hand_landmarks`)
    a un tensor de shape (SEQ_LEN, 42, 4) donde:
        - 42 = 21 landmarks * 2 manos
        - 4  = x, y, z, hand_indicator (0 = izquierda, 1 = derecha)
    Si falta una mano, se rellena con ceros y el indicador correspondiente.
    """
    # Inicializamos un array vacío para 30 frames
    frames = np.zeros((SEQ_LEN, 42, 4), dtype=np.float32)

    # Si recibimos menos de SEQ_LEN frames, rellenamos con los últimos vistos
    # (en producción mantendrías un deque de últimos frames; aquí simplificamos)
    for i, hand_landmarks in enumerate(hand_landmarks_list[:SEQ_LEN]):
        # Cada mano tiene 21 landmarks
        coords = np.array([[lm.x, lm.y, lm.z] for lm in hand_landmarks.landmark],
                          dtype=np.float32)          # (21,3)

        # Determinamos si es izquierda o derecha por la posición x media
        xs = coords[:,0]
        hand_id = 0 if xs.mean() < 0.5 else 1   # muy aproximado; mejora con mediapipe handedness

        # Rellenamos en el tensor: si mano izquierda → índice 0‑20, derecha → 21‑41
        start = hand_id * 21
        frames[i, start:start+21, :3] = coords
        frames[i, start:start+21, 3]  = hand_id   # indicador de mano

    # Aplanamos a (SEQ_LEN*42, 4) como espera el modelo
    return torch.from_numpy(frames.reshape(-1, 4))   # (SEQ_LEN*42, 4)

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """
    Recibe un archivo de imagen (un frame) y, si ya hemos acumulado
    SEQ_LEN frames, devuelve la predicción del modelo actual.
    En una aplicación real mantendrías un buffer de frames por cliente
    o usarías websockets; aquí usamos un enfoque simple para la demo.
    """
    # Leemos la imagen
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Imagen no válida")

    # Detección de manos con MediaPipe
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    results = hands.process(img_rgb)

    if not results.multi_hand_landmarks:
        # No se detectó mano → devolvemos vacío
        return JSONResponse({"prediction": None, "confidence": 0.0})

    # Convertimos a tensor y lo añadimos al buffer interno de frames
    # (para la demo mantenemos un único buffer global; en producción
    #  deberías tener uno por conexión/cliente)
    global _frame_buffer
    try:
        _frame_buffer
    except NameError:
        _frame_buffer = []

    tensor_frame = landmarks_to_tensor(results.multi_hand_landmarks)  # (42,4)
    _frame_buffer.append(tensor_frame)

    # Cuando ya tenemos suficientes frames, hacemos la inferencia
    if len(_frame_buffer) >= SEQ_LEN:
        # Tomamos los últimos SEQ_LEN frames
        seq_tensor = torch.stack(_frame_buffer[-SEQ_LEN:])   # (SEQ_LEN,42,4)
        seq_tensor = seq_tensor.view(1, SEQ_LEN*42, 4).to(DEVICE)  # (1, B*V, F)

        # Construimos el tensor batch para PyG (necesario para el modelo)
        batch = torch.repeat_interleave(
                    torch.repeat_interleave(
                        torch.arange(1, device=DEVICE),
                        SEQ_LEN*42),
                    42)

        with torch.no_grad():
            logits = learner.base_model(seq_tensor, learner.edge_index, batch)  # (1, C)
            probs  = torch.softmax(logits, dim=-1)
            confidence, pred_idx = torch.max(probs, dim=-1)

        # Opcional: tampoco eliminar los frames usados (puedes usar un deque)
        # _frame_buffer = _frame_buffer[-(SEQ_LEN-1):]  # mantener solapamiento

        return JSONResponse({
            "prediction": int(pred_idx.item()),
            "confidence": float(confidence.item())
        })
    else:
        # Aún no hay suficientes frames para decidir
        return JSONResponse({
            "prediction": None,
            "confidence": 0.0,
            "frames_received": len(_frame_buffer)
        })