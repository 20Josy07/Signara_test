import pandas as pd
import numpy as np
import json
import os
import tensorflow as tf

from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import (
    LSTM,
    Dense,
    Dropout,
    BatchNormalization
)

from tensorflow.keras.utils import to_categorical
from sklearn.model_selection import train_test_split

from core.config import *

# =========================================
# ENTRENAMIENTO
# =========================================
def entrenar():

    # =========================================
    # VERIFICAR DATASET
    # =========================================
    if not os.path.exists(DATA_PATH):

        print(f"❌ No existe el dataset: {DATA_PATH}")
        print("👉 Primero ejecuta 01_collect.py")

        return

    # =========================================
    # CARGAR DATASET
    # =========================================
    print("📂 Cargando dataset...")

    try:
        df = pd.read_csv(DATA_PATH, header=None)

    except Exception as e:

        print(f"❌ Error leyendo dataset:")
        print(e)

        return

    # =========================================
    # SEPARAR X / Y
    # =========================================
    y_raw = df.iloc[:, 0].values
    X_raw = df.iloc[:, 1:].values

    print(f"📊 Samples: {len(df)}")
    print(f"📊 Features por sample: {X_raw.shape[1]}")

    # =========================================
    # VALIDAR FEATURES
    # =========================================
    expected_features = SEQ_LEN * MAX_FEATURES

    if X_raw.shape[1] != expected_features:

        print("\n❌ ERROR DE DIMENSIONES")
        print(f"Esperado: {expected_features}")
        print(f"Encontrado: {X_raw.shape[1]}")
        print("\n👉 Revisa:")
        print("- MAX_FEATURES")
        print("- SEQ_LEN")
        print("- extractor.py")
        print("- dataset corrupto")

        return

    # =========================================
    # ETIQUETAS
    # =========================================
    etiquetas_unicas = sorted(list(set(y_raw)))

    print(f"\n🧠 Clases detectadas:")
    print(etiquetas_unicas)

    label_map = {
        label: i
        for i, label in enumerate(etiquetas_unicas)
    }

    y_encoded = to_categorical(
        [label_map[label] for label in y_raw]
    )

    # =========================================
    # GUARDAR LABELS
    # =========================================
    with open(LABEL_PATH, "w", encoding="utf-8") as f:

        json.dump(
            etiquetas_unicas,
            f,
            ensure_ascii=False,
            indent=4
        )

    # =========================================
    # RESHAPE LSTM
    # =========================================
    try:

        X_reshaped = X_raw.reshape(
            -1,
            SEQ_LEN,
            MAX_FEATURES
        ).astype(np.float32)

    except Exception as e:

        print("\n❌ Error haciendo reshape")
        print(e)

        return

    print(f"\n✅ Shape LSTM:")
    print(X_reshaped.shape)

    # =========================================
    # TRAIN / TEST
    # =========================================
    X_train, X_test, y_train, y_test = train_test_split(
        X_reshaped,
        y_encoded,
        test_size=0.1,
        stratify=y_encoded,
        random_state=42
    )

    # =========================================
    # MODELO
    # =========================================
    model = Sequential([

        # LSTM 1
        LSTM(
            64,
            return_sequences=True,
            activation='tanh',
            input_shape=(SEQ_LEN, MAX_FEATURES)
        ),

        BatchNormalization(),

        Dropout(0.2),

        # LSTM 2
        LSTM(
            128,
            return_sequences=False,
            activation='tanh'
        ),

        Dropout(0.2),

        # Dense
        Dense(64, activation='relu'),

        Dense(32, activation='relu'),

        # Output
        Dense(
            len(etiquetas_unicas),
            activation='softmax'
        )
    ])

    # =========================================
    # COMPILAR
    # =========================================
    model.compile(
        optimizer='adam',
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )

    # =========================================
    # RESUMEN
    # =========================================
    print("\n🧠 Arquitectura:")
    model.summary()

    # =========================================
    # ENTRENAR
    # =========================================
    print("\n🚀 Iniciando entrenamiento...\n")

    history = model.fit(

        X_train,
        y_train,

        epochs=80,

        batch_size=16,

        validation_data=(X_test, y_test),

        verbose=1
    )

    # =========================================
    # GUARDAR MODELO
    # =========================================
    model.save(MODEL_PATH)

    print("\n✅ ENTRENAMIENTO COMPLETADO")
    print(f"📍 Modelo guardado en: {MODEL_PATH}")
    print(f"📍 Labels guardados en: {LABEL_PATH}")

# =========================================
# MAIN
# =========================================
if __name__ == "__main__":

    entrenar()