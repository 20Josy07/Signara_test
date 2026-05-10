import cv2
import mediapipe as mp
import os
import csv
import numpy as np

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

# Configuramos la "memoria" de movimiento
SEQ_LENGTH = 15
grabando = False
secuencia = []

while True:
    ret, frame = cam.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1)
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    resultado = hands.process(rgb)

    # Si no detecta la mano en un frame, llenamos con ceros para no romper la secuencia
    puntos = np.zeros(63) 

    if resultado.multi_hand_landmarks:
        for mano in resultado.multi_hand_landmarks:
            mp_draw.draw_landmarks(frame, mano, mp_hands.HAND_CONNECTIONS)
            pts = []
            for lm in mano.landmark:
                pts.extend([lm.x, lm.y, lm.z])
            puntos = np.array(pts)

    if grabando:
        secuencia.append(puntos)
        # Mostramos en pantalla que está grabando el movimiento
        cv2.putText(frame, f"Grabando mov... {len(secuencia)}/{SEQ_LENGTH}", (10, 80), cv2.FONT_HERSHEY_SIMPLEX, 1, (0,0,255), 2)
        
        if len(secuencia) == SEQ_LENGTH:
            with open(archivo, "a", newline="") as f:
                writer = csv.writer(f)
                # Unimos los 15 frames en una sola fila gigante y la guardamos
                writer.writerow(np.concatenate(secuencia))
            print("Secuencia de movimiento guardada!")
            grabando = False
            secuencia = []
    else:
        cv2.putText(frame, "Presiona S para grabar movimiento", (10, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (0,255,0), 2)

    cv2.imshow("Captura", frame)
    tecla = cv2.waitKey(1)
    
    if tecla == ord('s') and not grabando:
        grabando = True
        secuencia = []
    elif tecla == 27: # ESC para salir
        break

cam.release()
cv2.destroyAllWindows()