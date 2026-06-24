# Signara

**Conectando dos mundos que hoy no logran comunicarse.**

Signara usa el backend y modelos del proyecto **[Sign Translate (sign.mt)](https://sign.mt)** en `C:\Users\josya\Desktop\translate`.

---

## Modos

### Traducir (texto/voz → señas)
1. Texto → API `spoken-text-to-signwriting` (sign.mt)
2. Muestra **SignWriting** y animación **pose 3D** (`spoken_text_to_signed_pose`)
3. Si sign.mt no responde: fallback a videos MP4 locales o Claude

### Interpretar (cámara → texto)
1. MediaPipe detecta manos/cara
2. Modelos TF.js (`hand-shape`, `face-features`, `sign-detector`) generan SignWriting
3. Al terminar de firmar → API `signed-to-spoken` traduce a español

---

## Inicio rápido

```bash
npm install
npm run sync:models   # modelos + fuentes desde translate
npm run dev           # http://localhost:5173
```

Requiere conexión a internet (API sign.mt en `https://sign.mt/api`).

Opcional — backend local de translate:
```bash
cd C:\Users\josya\Desktop\translate\functions
npm run emulate
```
En Signara `.env`: `SIGN_MT_API_URL=http://localhost:4015/api`

---

## Estructura

```
Signara/
├── src/sign-engine/     → Motor TF.js portado de translate
├── src/utils/signMtApi.js → Cliente API sign.mt
├── public/models/       → Modelos sincronizados desde translate
└── scripts/sync-models.js
```

---

*Signara — hecho con ❤️ para acercar mundos.*
