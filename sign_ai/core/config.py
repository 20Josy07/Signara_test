import os

# =========================
# RUTAS
# =========================

DATA_PATH = "data/dataset.csv"
MODEL_PATH = "models/signara_model.pkl"

os.makedirs("data", exist_ok=True)
os.makedirs("models", exist_ok=True)

# =========================
# IA
# =========================

# Cara + manos + pose
MAX_FEATURES = 1629

# Frames por secuencia
SEQ_LEN = 15

# Confianza mínima
UMBRAL_CONFIANZA = 0.80

# Estabilidad
FRAMES_ESTABILIDAD = 5