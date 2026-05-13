import cv2
import mediapipe as mp
import numpy as np
import json
import tensorflow as tf
import pyttsx3

from core.config import *
from core.extractor import extraer_puntos

# =========================================
# CARGAR MODELO
# =========================================
print("📦 Cargando modelo...")

model = tf.keras.models.load_model(MODEL_PATH)

print("✅ Modelo cargado")

# =========================================
# LABELS
# =========================================
with open(LABEL_PATH, "r", encoding="utf-8") as f:
    labels = json.load(f)

print(f"🧠 Clases: {labels}")

# =========================================
# VOZ
# =========================================
motor = pyttsx3.init()

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
# VARIABLES
# =========================================
buffer = []

ultima_prediccion = ""

contador_estabilidad = 0

# =========================================
# CÁMARA
# =========================================
cam = cv2.VideoCapture(0)

# =========================================
# LOOP
# =========================================
while cam.isOpened():

    ret, frame = cam.read()

    if not ret:
        break

    # Espejo
    frame = cv2.flip(frame, 1)

    # BGR -> RGB
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # Procesar
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
    # EXTRAER FEATURES
    # =========================================
    puntos = extraer_puntos(resultados)

    # Seguridad
    if len(puntos) != MAX_FEATURES:

        print(f"⚠ ERROR FEATURES: {len(puntos)}")

        continue

    # Buffer
    buffer.append(puntos)

    # Mantener tamaño exacto
    if len(buffer) > SEQ_LEN:
        buffer.pop(0)

    # =========================================
    # PREDICCIÓN
    # =========================================
    if len(buffer) == SEQ_LEN:

        input_data = np.expand_dims(
            buffer,
            axis=0
        ).astype(np.float32)

        try:

            res = model.predict(
                input_data,
                verbose=0
            )[0]

        except Exception as e:

            print(f"❌ Error predicción:")
            print(e)

            continue

        # Clase
        id_clase = np.argmax(res)

        confianza = res[id_clase]

        clase_predicha = labels[id_clase]

        # =========================================
        # ESTABILIDAD
        # =========================================
        if confianza > UMBRAL_CONFIANZA:

            if clase_predicha == ultima_prediccion:

                contador_estabilidad += 1

            else:

                contador_estabilidad = 0
                ultima_prediccion = clase_predicha

            # =========================================
            # HABLAR
            # =========================================
            if contador_estabilidad >= FRAMES_ESTABILIDAD:

                if clase_predicha != "IDLE":

                    texto = (
                        f"📢 {clase_predicha} "
                        f"({confianza:.2f})"
                    )

                    print(texto)

                    motor.say(clase_predicha)
                    motor.runAndWait()

                contador_estabilidad = 0

    # =========================================
    # UI
    # =========================================
    cv2.rectangle(
        frame,
        (0, 0),
        (640, 90),
        (245, 117, 16),
        -1
    )

    cv2.putText(
        frame,
        f"IA: {ultima_prediccion}",
        (20, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (255, 255, 255),
        2
    )

    if len(buffer) == SEQ_LEN:

        cv2.putText(
            frame,
            f"Confianza: {confianza:.2f}",
            (20, 75),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (255, 255, 255),
            2
        )

    # =========================================
    # MOSTRAR
    # =========================================
    cv2.imshow(
        "Signara Realtime LSTM",
        frame
    )

    # ESC
    if cv2.waitKey(1) == 27:
        break

# =========================================
# LIMPIEZA
# =========================================
cam.release()

cv2.destroyAllWindows()