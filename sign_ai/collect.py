import cv2
import mediapipe as mp
import os
import csv

mp_hands = mp.solutions.hands
mp_draw = mp.solutions.drawing_utils

hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=1,
    min_detection_confidence=0.7
)

cam = cv2.VideoCapture(0)

letra = input("Letra o seña: ").upper()

os.makedirs("datasets", exist_ok=True)

archivo = f"datasets/{letra}.csv"

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
                puntos.append(lm.x)
                puntos.append(lm.y)
                puntos.append(lm.z)

            cv2.putText(
                frame,
                "Presiona S para guardar",
                (10, 40),
                cv2.FONT_HERSHEY_SIMPLEX,
                1,
                (0,255,0),
                2
            )

            tecla = cv2.waitKey(1)

            if tecla == ord('s'):

                with open(archivo, "a", newline="") as f:
                    writer = csv.writer(f)
                    writer.writerow(puntos)

                print("Ejemplo guardado")

    cv2.imshow("Captura", frame)

    if cv2.waitKey(1) == 27:
        break

cam.release()
cv2.destroyAllWindows()