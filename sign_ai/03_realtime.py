import cv2
import mediapipe as mp
import numpy as np
import json
import tensorflow as tf
import pyttsx3
from core.config import *
from core.extractor import extraer_puntos

# Cargar recursos
model = tf.keras.models.load_model(MODEL_PATH)
with open(LABEL_PATH, "r") as f:
    labels = json.load(f)

motor = pyttsx3.init()
holistic = mp.solutions.holistic.Holistic(min_detection_confidence=0.5, min_tracking_confidence=0.5)

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
    if len(buffer) > SEQ_LEN: buffer.pop(0)

    if len(buffer) == SEQ_LEN:
        # Predicción con LSTM
        res = model.predict(np.expand_dims(buffer, axis=0), verbose=0)[0]
        id_clase = np.argmax(res)
        confianza = res[id_clase]

        if confianza > UMBRAL_CONFIANZA:
            clase_predicha = labels[id_clase]
            
            if clase_predicha == ultima_prediccion:
                contador_estabilidad += 1
            else:
                contador_estabilidad = 0
                ultima_prediccion = clase_predicha

            if contador_estabilidad == FRAMES_ESTABILIDAD:
                if clase_predicha != "IDLE":
                    print(f"Predicción: {clase_predicha} ({confianza:.2f})")
                    motor.say(clase_predicha)
                    motor.runAndWait()
                contador_estabilidad = 0

    cv2.putText(frame, f"IA: {ultima_prediccion}", (20, 60), 
                cv2.FONT_HERSHEY_SIMPLEX, 1.5, (255, 255, 0), 2)
    cv2.imshow("Signara Realtime LSTM", frame)
    if cv2.waitKey(1) == 27: break

cam.release()
cv2.destroyAllWindows()