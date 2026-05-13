import cv2
import mediapipe as mp
import numpy as np
import csv
import os

from core.config import *
from core.extractor import extraer_puntos

# =========================================
# MEDIAPIPE HOLISTIC
# =========================================
mp_holistic = mp.solutions.holistic
mp_draw = mp.solutions.drawing_utils

holistic = mp_holistic.Holistic(
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
    refine_face_landmarks=True
)

# =========================================
# CÁMARA
# =========================================
cam = cv2.VideoCapture(0)

# =========================================
# INPUT DE ETIQUETA
# =========================================
etiqueta = input(
    "Nombre de la seña a grabar (ej: IDLE, A, HOLA): "
).upper()

# =========================================
# VARIABLES
# =========================================
secuencia = []
grabando = False

print(f"\n🎥 Grabando para: {etiqueta}")
print("👉 Presiona 'S' para grabar una muestra")
print("👉 Presiona 'ESC' para salir")

# =========================================
# LOOP PRINCIPAL
# =========================================
while cam.isOpened():

    ret, frame = cam.read()

    if not ret:
        break

    # Espejo
    frame = cv2.flip(frame, 1)

    # BGR -> RGB
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # Procesar landmarks
    resultados = holistic.process(rgb)

    # =========================================
    # DIBUJAR LANDMARKS
    # =========================================

    # Cara
    if resultados.face_landmarks:
        mp_draw.draw_landmarks(
            frame,
            resultados.face_landmarks,
            mp_holistic.FACEMESH_TESSELATION,
            mp_draw.DrawingSpec(
                color=(80, 110, 10),
                thickness=1,
                circle_radius=1
            ),
            mp_draw.DrawingSpec(
                color=(80, 256, 121),
                thickness=1,
                circle_radius=1
            )
        )

    # Pose
    if resultados.pose_landmarks:
        mp_draw.draw_landmarks(
            frame,
            resultados.pose_landmarks,
            mp_holistic.POSE_CONNECTIONS
        )

    # Mano izquierda
    if resultados.left_hand_landmarks:
        mp_draw.draw_landmarks(
            frame,
            resultados.left_hand_landmarks,
            mp_holistic.HAND_CONNECTIONS
        )

    # Mano derecha
    if resultados.right_hand_landmarks:
        mp_draw.draw_landmarks(
            frame,
            resultados.right_hand_landmarks,
            mp_holistic.HAND_CONNECTIONS
        )

    # =========================================
    # CAPTURA DE DATOS
    # =========================================
    if grabando:

        features = extraer_puntos(resultados)

        # Seguridad
        if len(features) != MAX_FEATURES:
            print(f"⚠ ERROR FEATURES: {len(features)}")
            continue

        secuencia.append(features)

        # Texto visual
        cv2.putText(
            frame,
            f"CAPTURANDO: {len(secuencia)}/{SEQ_LEN}",
            (20, 50),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (0, 0, 255),
            2
        )

        # Cuando completa los frames
        if len(secuencia) == SEQ_LEN:

            os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)

            with open(DATA_PATH, "a", newline="") as f:

                writer = csv.writer(f)

                # 30 frames * 1659 features = 49770 valores
                writer.writerow(
                    [etiqueta] +
                    np.array(secuencia).flatten().tolist()
                )

            print(f"✅ Muestra guardada: {etiqueta}")

            grabando = False
            secuencia = []

    else:

        cv2.putText(
            frame,
            f"LISTO: {etiqueta} (Presiona S)",
            (20, 50),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (0, 255, 0),
            2
        )

    # =========================================
    # MOSTRAR VENTANA
    # =========================================
    cv2.imshow(
        "Recolector Signara - LSTM Edition",
        frame
    )

    # =========================================
    # TECLAS
    # =========================================
    key = cv2.waitKey(1)

    # S = grabar
    if key == ord('s'):
        grabando = True
        secuencia = []

    # ESC = salir
    if key == 27:
        break

# =========================================
# LIMPIEZA
# =========================================
cam.release()
cv2.destroyAllWindows()