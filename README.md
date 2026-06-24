# Signara

**Conectando dos mundos que hoy no logran comunicarse.**

Signara es tu app. Puede reutilizar modelos del proyecto open source [Sign Translate (sign.mt)](https://sign.mt) como referencia, **sin que ese proyecto sea tuyo** ni requiera Firebase/App Check.

---

## Modos

### Traducir (texto/voz → señas) — funciona en tu navegador
1. **Bergamot** (`@sign-mt/browsermt`) traduce español → SignWriting (LSM)
2. Muestra **SignWriting** y, si está disponible, animación pose 3D
3. Si falla: videos MP4 locales (`signMap`)

No necesitas cuenta ni proyecto Firebase de sign.mt.

### Interpretar (cámara → señas) — local + opcional tu API
1. **MediaPipe** detecta manos
2. **Modelos TF.js** locales generan **SignWriting** (símbolos de la seña)
3. **Texto en español** (opcional): solo si configuras **tu propio backend** con `VITE_INTERPRET_API_URL`

Sin backend propio, Interpretar muestra la seña visualmente en SignWriting, pero no palabras en español.

---

## Inicio rápido

```bash
npm install
npm run sync:models   # copia modelos TF.js desde la carpeta translate (hermana)
npm run dev           # http://localhost:5173
```

`sync:models` lee modelos de `C:\Users\josya\Desktop\translate` si existe; no necesitas ejecutar translate ni sus emuladores.

---

## Interpretar con tu propio servidor (opcional)

En `.env`:

```
VITE_INTERPRET_API_URL=http://localhost:8000
```

Tu API debe aceptar `POST /interpret`:

```json
{ "tokens": ["M500x500…", "…"], "fsw": "M500x500… …" }
```

Y responder:

```json
{ "text": "hola" }
```

Ahí puedes conectar un modelo de IA entrenado por ti (p. ej. el antiguo `sign_ai` con FastAPI).

---

## Estructura

```
Signara/
├── src/sign-engine/       → Cámara → SignWriting (TF.js + MediaPipe)
├── src/utils/interpretApi.js → Cliente de TU API para texto
├── src/utils/bergamotTranslate.js → Traducir sin servidor
├── public/models/         → Modelos sincronizados
└── scripts/sync-models.js
```

---

*Signara — hecho con ❤️ para acercar mundos.*
