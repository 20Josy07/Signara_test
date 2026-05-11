import cv2
import mediapipe as mp
import numpy as np
import json
import tensorflow as tf
import pyttsx3
from core.config import *
from core.extractor import extraer_puntos

# 1. Cargar recursos
model = tf.keras.models.load_model(MODEL_PATH)
with open(LABEL_PATH, "r", encoding="utf-8") as f: # Añadido encoding por si hay señas con Ñ o tildes
    labels = json.load(f)

motor = pyttsx3.init()
# CORRECCIÓN 1: Activar refine_face_landmarks para que coincida con el recolector
holistic = mp.solutions.holistic.Holistic(
    min_detection_confidence=0.5, 
    min_tracking_confidence=0.5,
    refine_face_landmarks=True 
)

buffer = []
ultima_prediccion = ""
contador_estabilidad = 0
cam = cv2.VideoCapture(0)

while cam.isOpened():
    ret, frame = cam.read()
    if not ret: break
    frame = cv2.flip(frame, 1)
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    resultados = holistic.process(rgb)
    
    # Extraer y manejar buffer
    puntos = extraer_puntos(resultados)
    buffer.append(puntos)
    
    # Mantener el buffer al tamaño exacto de la secuencia (ej. 30)
    if len(buffer) > SEQ_LEN: 
        buffer.pop(0)

    if len(buffer) == SEQ_LEN:
        # Predicción con LSTM
        # Convertimos a float32 para evitar advertencias de tipos de datos en TF
        input_data = np.expand_dims(buffer, axis=0).astype(np.float32)
        res = model.predict(input_data, verbose=0)[0]
        id_clase = np.argmax(res)
        confianza = res[id_clase]

        # Lógica de estabilidad
        if confianza > UMBRAL_CONFIANZA:
            clase_predicha = labels[id_clase]
            
            if clase_predicha == ultima_prediccion:
                contador_estabilidad += 1
            else:
                contador_estabilidad = 0
                ultima_prediccion = clase_predicha

            # Solo habla si se mantiene estable X frames y no es silencio (IDLE)
            if contador_estabilidad == FRAMES_ESTABILIDAD:
                if clase_predicha != "IDLE":
                    print(f"📢 Alanis dice: {clase_predicha} ({confianza:.2f})")
                    motor.say(clase_predicha)
                    motor.runAndWait()
                # Reiniciamos para que no lo repita infinitamente mientras mantienes la seña
                contador_estabilidad = 0 

    # UI: Mostrar qué está viendo la IA
    cv2.rectangle(frame, (0, 0), (640, 80), (245, 117, 16), -1) # Barra de estado
    cv2.putText(frame, f"IA: {ultima_prediccion}", (20, 55), 
                cv2.FONT_HERSHEY_SIMPLEX, 1.5, (255, 255, 255), 3)
    
    cv2.imshow("Signara Realtime LSTM", frame)
    if cv2.waitKey(1) == 27: break # ESC para salir

cam.release()
cv2.destroyAllWindows()