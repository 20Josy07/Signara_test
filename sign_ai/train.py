import os
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import joblib

X = []
y = []

for archivo in os.listdir("datasets"):

    if archivo.endswith(".csv"):

        etiqueta = archivo.replace(".csv", "")

        ruta = os.path.join("datasets", archivo)

        data = pd.read_csv(ruta, header=None)

        for fila in data.values:
            X.append(fila)
            y.append(etiqueta)

modelo = RandomForestClassifier()

modelo.fit(X, y)

os.makedirs("modelos", exist_ok=True)

joblib.dump(modelo, "modelos/signara_model.pkl")

print("Modelo entrenado")