import pandas as pd
import numpy as np
import json
import os
import tensorflow as tf
# Usamos tf.keras directamente para evitar alertas de Pylance/VS Code
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization
from tensorflow.keras.utils import to_categorical
from sklearn.model_selection import train_test_split
from core.config import *

def entrenar():
    # 0. Verificación de archivo
    if not os.path.exists(DATA_PATH):
        print(f"❌ Error: No se encuentra {DATA_PATH}. Graba datos primero.")
        return

    # 1. Cargar datos
    print("📂 Cargando dataset...")
    df = pd.read_csv(DATA_PATH, header=None)
    
    # Separamos X (características) y y (etiquetas)
    y_raw = df.iloc[:, 0].values
    X_raw = df.iloc[:, 1:].values

    # 2. Preprocesar etiquetas
    etiquetas_unicas = sorted(list(set(y_raw)))
    label_map = {label: i for i, label in enumerate(etiquetas_unicas)}
    
    # Convertimos etiquetas de texto a números y luego a One-Hot Encoding
    y_encoded = to_categorical([label_map[label] for label in y_raw])

    # Guardar las etiquetas en un JSON para que el script de tiempo real las lea
    with open(LABEL_PATH, "w", encoding="utf-8") as f:
        json.dump(etiquetas_unicas, f, ensure_ascii=False, indent=4)

    # 3. Redimensionar para LSTM: (Muestras, SEQ_LEN, MAX_FEATURES)
    # Importante: X_raw debe dividirse exactamente por SEQ_LEN y MAX_FEATURES
    try:
        X_reshaped = X_raw.reshape(-1, SEQ_LEN, MAX_FEATURES)
    except ValueError as e:
        print(f"❌ Error de dimensiones: Verifica que SEQ_LEN ({SEQ_LEN}) y MAX_FEATURES ({MAX_FEATURES}) coincidan con tu CSV.")
        return

    # Dividir en entrenamiento y prueba (stratify ayuda si tienes pocas muestras)
    X_train, X_test, y_train, y_test = train_test_split(
        X_reshaped, y_encoded, test_size=0.1, stratify=y_encoded
    )

    # 4. Arquitectura del Modelo LSTM
    model = Sequential([
        # Primera capa: return_sequences=True porque sigue otra LSTM
        LSTM(64, return_sequences=True, activation='tanh', input_shape=(SEQ_LEN, MAX_FEATURES)),
        BatchNormalization(),
        Dropout(0.2),
        
        # Segunda capa: return_sequences=False porque ya vamos a una capa densa
        LSTM(128, return_sequences=False, activation='tanh'),
        Dropout(0.2),
        
        Dense(64, activation='relu'),
        Dense(32, activation='relu'),
        # Capa de salida: neuronas = cantidad de señas
        Dense(len(etiquetas_unicas), activation='softmax')
    ])

    model.compile(
        optimizer='adam', 
        loss='categorical_crossentropy', 
        metrics=['accuracy']
    )

    # 5. Entrenamiento
    print(f"🧠 Entrenando modelo para reconocer: {etiquetas_unicas}...")
    model.fit(
        X_train, y_train, 
        epochs=80, 
        batch_size=16, 
        validation_data=(X_test, y_test),
        verbose=1
    )

    # 6. Guardar modelo en formato nativo de Keras
    model.save(MODEL_PATH)
    print(f"✅ Proceso terminado.")
    print(f"📍 Modelo: {MODEL_PATH}")
    print(f"📍 Etiquetas: {LABEL_PATH}")

if __name__ == "__main__":
    entrenar()