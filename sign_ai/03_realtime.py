import cv2
import mediapipe as mp
import numpy as np
import joblib
import pyttsx3

from core.config import *
from core.extractor import extraer_puntos

modelo = joblib.load(MODEL_PATH)

motor = pyttsx3.init()

mp_holistic = mp.solutions.holistic

holistic = mp_holistic.Holistic(
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

buffer = []

historial = []

ultima = ""

cam = cv2.VideoCapture(0)

while True:

    ret, frame = cam.read()

    if not ret:
        break

    frame = cv2.flip(frame, 1)

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    resultados = holistic.process(rgb)

    features = extraer_puntos(resultados)

    buffer.append(features)

    if len(buffer) > SEQ_LEN:
        buffer.pop(0)

    if len(buffer) == SEQ_LEN:

        entrada = np.array(buffer).flatten().reshape(1, -1)

        pred = modelo.predict(entrada)[0]

        probs = modelo.predict_proba(entrada)

        confianza = np.max(probs)

        if confianza > UMBRAL_CONFIANZA:

            historial.append(pred)

            if len(historial) > FRAMES_ESTABILIDAD:
                historial.pop(0)

            if historial.count(pred) == FRAMES_ESTABILIDAD:

                if pred != ultima and pred != "IDLE":

                    ultima = pred

                    print(pred)

                    motor.say(pred)

                    motor.runAndWait()

    cv2.putText(
        frame,
        f"Signara: {ultima}",
        (20, 50),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (255, 0, 0),
        2
    )

    cv2.imshow("Signara Realtime", frame)

    if cv2.waitKey(1) == 27:
        break

cam.release()

cv2.destroyAllWindows()