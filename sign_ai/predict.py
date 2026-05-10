import cv2
import mediapipe as mp
import joblib
import numpy as np
from collections import deque

modelo = joblib.load("modelos/signara_model.pkl")

mp_hands = mp.solutions.hands
mp_draw = mp.solutions.drawing_utils
hands = mp_hands.Hands()
cam = cv2.VideoCapture(0)

# Memoria temporal para la predicción en vivo
SEQ_LENGTH = 15
buffer = deque(maxlen=SEQ_LENGTH)

while True:
    ret, frame = cam.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1)
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    resultado = hands.process(rgb)

    puntos = np.zeros(63)

    if resultado.multi_hand_landmarks:
        for mano in resultado.multi_hand_landmarks:
            mp_draw.draw_landmarks(frame, mano, mp_hands.HAND_CONNECTIONS)
            pts = []
            for lm in mano.landmark:
                pts.extend([lm.x, lm.y, lm.z])
            puntos = np.array(pts)

    # Agregamos el frame actual a la memoria
    buffer.append(puntos)

    # Solo predecimos si ya tenemos 15 frames acumulados
    if len(buffer) == SEQ_LENGTH:
        # Aplanamos la memoria y se la pasamos al modelo
        entrada = np.concatenate(buffer)
        pred = modelo.predict([entrada])[0]
        
        cv2.putText(frame, f"Sena: {pred}", (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0,255,0), 2)

    cv2.imshow("Reconocimiento", frame)

    if cv2.waitKey(1) == 27:
        break

cam.release()
cv2.destroyAllWindows()