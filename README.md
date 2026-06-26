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
uvicorn api:app --port 8000
```

En `.env` del frontend (opcional si usas el default local):

```
VITE_ML_API_URL=http://localhost:8000
```

El modelo actual reconoce **7 señas** (`sign_ai/models/labels_gnn.json`). Para ampliar vocabulario, reentrena con `06_gnn_train.py` y un dataset más grande.

---

## Inicio rápido

```bash
npm install
npm run dev           # http://localhost:5173
```

En otra terminal, levanta la API de reconocimiento (`sign_ai`, puerto 8000).

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
