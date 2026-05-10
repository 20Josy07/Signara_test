import cv2
import mediapipe as mp
import joblib
import numpy as np

modelo = joblib.load("modelos/signara_model.pkl")

mp_hands = mp.solutions.hands
mp_draw = mp.solutions.drawing_utils

hands = mp_hands.Hands()

cam = cv2.VideoCapture(0)

while True:

    ret, frame = cam.read()

    if not ret:
        break

    frame = cv2.flip(frame, 1)

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    resultado = hands.process(rgb)

    if resultado.multi_hand_landmarks:

        for mano in resultado.multi_hand_landmarks:

            mp_draw.draw_landmarks(
                frame,
                mano,
                mp_hands.HAND_CONNECTIONS
            )

            puntos = []

            for lm in mano.landmark:
                puntos.extend([lm.x, lm.y, lm.z])

            pred = modelo.predict([puntos])[0]

            cv2.putText(
                frame,
                f"Seña: {pred}",
                (10, 50),
                cv2.FONT_HERSHEY_SIMPLEX,
                1,
                (0,255,0),
                2
            )

    cv2.imshow("Reconocimiento", frame)

    if cv2.waitKey(1) == 27:
        break

cam.release()
cv2.destroyAllWindows()