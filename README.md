# Signara

**Conectando dos mundos que hoy no logran comunicarse.**

Signara es tu app. Puede reutilizar modelos del proyecto open source [Sign Translate (sign.mt)](https://sign.mt) como referencia, **sin que ese proyecto sea tuyo** ni requiera Firebase/App Check.

---

## Modos

### Traducir (texto/voz → señas) — funciona en tu navegador
1. **Bergamot** (`@sign-mt/browsermt`) traduce español → SignWriting (LSM)
2. Muestra **SignWriting** (símbolos de la seña en pantalla)
3. Si Bergamot falla: videos MP4 locales del avatar (`signMap`)

No necesitas cuenta ni proyecto Firebase de sign.mt.

### Interpretar (cámara → texto) — API `sign_ai` (GNN)

1. **MediaPipe Holistic** extrae landmarks de manos y cara
2. El navegador envía una ventana de frames a **`sign_ai`** (`POST /predict` o WebSocket)
3. El modelo **GAT+Transformer / GCN+LSTM** devuelve la glosa: `HOLA`, `GRACIAS`, etc.

No usa SignWriting. Requiere la API Python en marcha (local o Render).

```bash
cd sign_ai
py -3.11 -m venv venv
venv\Scripts\activate
pip install -r requirements_api.txt
uvicorn api:app --port 8080
```

En `.env` del frontend (opcional si usas el default local):

```
VITE_ML_API_URL=http://localhost:8080
```

El modelo actual reconoce **7 señas** (`sign_ai/models/labels_gnn.json`). Para ampliar a **150+ señas LSM** con MSL-150:

```bash
# 1. Clonar subset demo (o descargar CSV completo de Zenodo)
git clone --depth 1 https://github.com/armandobecerril/MSL-150-Dataset ../MSL-150-Dataset

# 2. Importar al formato sign_ai
cd sign_ai
python 08_import_msl150.py --npy-dir ../MSL-150-Dataset/data/sample_npy

# 3. Entrenar GNN (30 frames, solo manos)
python 06_gnn_train.py

# 4. Reiniciar API
uvicorn api:app --port 8080
```

Dataset completo (~14 GB): [Zenodo MSL-150](https://doi.org/10.5281/zenodo.17783312)  
`python 08_import_msl150.py --csv ruta/al/MSL-150_Mexican_Sign_Language_Dataset.csv`

---

## Inicio rápido

```bash
npm install
npm run dev           # http://localhost:5173
```

En otra terminal, levanta la API de reconocimiento (`sign_ai`, puerto 8080).

---

## Estructura

```
Signara/
├── sign_ai/               → API FastAPI + modelo GNN (reconocimiento)
├── src/components/InterpretScreen.jsx → Cámara → landmarks → API
├── src/utils/mlApi.js     → Cliente HTTP/WebSocket hacia sign_ai
├── src/utils/poseApi.js   → Animación 3D (Traducir)
└── public/pose-viewer/    → Visor 3D
```

---

*Signara — hecho con ❤️ para acercar mundos.*
