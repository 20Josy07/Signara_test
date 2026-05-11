import cv2
import mediapipe as mp
import numpy as np
import csv

from core.config import *
from core.extractor import extraer_puntos

mp_holistic = mp.solutions.holistic

holistic = mp_holistic.Holistic(
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

cam = cv2.VideoCapture(0)

etiqueta = input(
    "¿Qué vas a grabar? (A, B, HOLA, 1, IDLE): "
).upper()

grabando = False

secuencia = []

print("\nPresiona S para grabar")
print("ESC para salir")

while True:

    ret, frame = cam.read()

    if not ret:
        break

    frame = cv2.flip(frame, 1)

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    resultados = holistic.process(rgb)

    if grabando:

        features = extraer_puntos(resultados)

        secuencia.append(features)

        cv2.putText(
            frame,
            f"Grabando {len(secuencia)}/{SEQ_LEN}",
            (20, 50),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (0, 0, 255),
            2
        )

        if len(secuencia) == SEQ_LEN:

            vector = np.array(secuencia).flatten().tolist()

            with open(DATA_PATH, "a", newline="") as f:

                writer = csv.writer(f)

                writer.writerow([etiqueta] + vector)

            print(f"✅ Muestra guardada: {etiqueta}")

            grabando = False

            secuencia = []

    else:

        cv2.putText(
            frame,
            f"S para grabar: {etiqueta}",
            (20, 50),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (0, 255, 0),
            2
        )

    cv2.imshow("Signara Dataset", frame)

    tecla = cv2.waitKey(1)

    if tecla == ord('s') and not grabando:
        grabando = True

    elif tecla == 27:
        break

cam.release()

cv2.destroyAllWindows()
