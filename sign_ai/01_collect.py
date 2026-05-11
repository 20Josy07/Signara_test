import cv2
import mediapipe as mp
import numpy as np
import csv
import os
from core.config import *
from core.extractor import extraer_puntos

# Inicialización de MediaPipe
mp_holistic = mp.solutions.holistic
mp_draw = mp.solutions.drawing_utils

# CONFIGURACIÓN CRÍTICA: Activar malla facial detallada
holistic = mp_holistic.Holistic(
    min_detection_confidence=0.5, 
    min_tracking_confidence=0.5,
    refine_face_landmarks=True  # <--- Esto activa todos los puntos de la cara
)

cam = cv2.VideoCapture(0)
etiqueta = input("Nombre de la seña a grabar (ej: IDLE, HOLA): ").upper()
secuencia = []
grabando = False

print(f"\n🎥 Grabando para: {etiqueta}")
print("Comandos: Presiona 'S' para capturar 1 muestra | 'ESC' para salir")

while cam.isOpened():
    ret, frame = cam.read()
    if not ret: break
    
    frame = cv2.flip(frame, 1)
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    resultados = holistic.process(rgb)

    # --- DIBUJADO DE LANDMARKS EN PANTALLA ---
    # Cara (Face Mesh)
    if resultados.face_landmarks:
        mp_draw.draw_landmarks(
            frame, resultados.face_landmarks, mp_holistic.FACEMESH_TESSELATION,
            mp_draw.DrawingSpec(color=(80, 110, 10), thickness=1, circle_radius=1),
            mp_draw.DrawingSpec(color=(80, 256, 121), thickness=1, circle_radius=1)
        )
    
    # Pose
    mp_draw.draw_landmarks(frame, resultados.pose_landmarks, mp_holistic.POSE_CONNECTIONS)
    
    # Manos
    mp_draw.draw_landmarks(frame, resultados.left_hand_landmarks, mp_holistic.HAND_CONNECTIONS)
    mp_draw.draw_landmarks(frame, resultados.right_hand_landmarks, mp_holistic.HAND_CONNECTIONS)

    # --- LÓGICA DE CAPTURA ---
    if grabando:
        features = extraer_puntos(resultados)
        secuencia.append(features)
        
        # Feedback visual de progreso
        cv2.putText(frame, f"CAPTURANDO: {len(secuencia)}/{SEQ_LEN}", (20, 50), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)

        if len(secuencia) == SEQ_LEN:
            # Asegurar que la carpeta data existe
            os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
            
            with open(DATA_PATH, "a", newline="") as f:
                # Guardar: ETIQUETA + 48870 valores (30 frames * 1629 puntos)
                csv.writer(f).writerow([etiqueta] + np.array(secuencia).flatten().tolist())
            
            print(f"✅ Muestra de '{etiqueta}' guardada en {DATA_PATH}")
            grabando = False
            secuencia = []
    else:
        cv2.putText(frame, f"LISTO: {etiqueta} (Presiona S)", (20, 50), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

    cv2.imshow("Recolector Signara - LSTM Edition", frame)
    
    key = cv2.waitKey(1)
    if key == ord('s'): 
        grabando = True
    if key == 27: # ESC
        break

cam.release()
cv2.destroyAllWindows()