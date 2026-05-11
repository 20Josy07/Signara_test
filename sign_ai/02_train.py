import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import joblib
import os

from core.config import *

if not os.path.exists(DATA_PATH):

    print("No existe dataset.csv")

    exit()

print("Cargando dataset...")

dataset = pd.read_csv(DATA_PATH, header=None)

y = dataset.iloc[:, 0].values

X = dataset.iloc[:, 1:].values

print("Entrenando modelo...")

modelo = RandomForestClassifier(
    n_estimators=100,
    random_state=42,
    n_jobs=-1
)

modelo.fit(X, y)

joblib.dump(modelo, MODEL_PATH)

print("✅ Modelo entrenado")