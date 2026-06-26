import pandas as pd
import os

# =========================================
# CARGAR DATASETS
# =========================================
df_alanis = pd.read_csv(
    "data/alanis_dataset.csv",
    header=None,
    engine="python",
    on_bad_lines="skip"
)

df_maria = pd.read_csv(
    "data/mariagabriela_dataset.csv",
    header=None,
    engine="python",
    on_bad_lines="skip"
)

# =========================================
# MOSTRAR INFO
# =========================================
print("📂 Dataset Alanis:", df_alanis.shape)
print("📂 Dataset Maria:", df_maria.shape)

# =========================================
# UNIR DATASETS
# =========================================
df_final = pd.concat(
    [df_alanis, df_maria],
    ignore_index=True
)

# =========================================
# VALIDAR COLUMNAS
# =========================================
print("📦 Dataset Final:", df_final.shape)
print("📏 Total columnas:", len(df_final.columns))

# =========================================
# CREAR CARPETA DATA
# =========================================
os.makedirs("data", exist_ok=True)

# =========================================
# GUARDAR DATASET MAESTRO
# =========================================
df_final.to_csv(
    "data/dataset.csv",
    index=False,
    header=False
)

print("✅ Dataset fusionado correctamente")
print("💾 Guardado en: data/dataset.csv")