import os

# =========================
# RUTAS
# =========================
DATA_PATH = "data/dataset.csv"
MODEL_PATH = "models/signara_lstm.keras"
LABEL_PATH = "models/labels.json"

os.makedirs("data", exist_ok=True)
os.makedirs("models", exist_ok=True)

# =========================
# IA (DIMENSIONES)
# =========================
# Cara (468) + Manos (21*2) + Pose (33) = 543 puntos
# 543 puntos * 3 coordenadas (x, y, z) = 1629 features
MAX_FEATURES = 1629

# Cuántos frames componen una seña (Aumentado a 30 para palabras fluidas)
SEQ_LEN = 30 

# Umbrales para Realtime
UMBRAL_CONFIANZA = 0.70
FRAMES_ESTABILIDAD = 3