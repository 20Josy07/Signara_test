# Signara

> Conectando dos mundos que hoy no logran comunicarse.

Signara es una web app que traduce **texto** o **voz en español** a **lengua de señas**, reproduciendo las señas con un avatar animado.

Este repo es el **MVP de hackathon**: frontend completamente funcional, con la integración a Claude API ya preparada pero **mockeada** con datos locales para la demo.

---

## Stack

- React 18 + Vite
- Tailwind CSS 3
- Web Speech API (voz)

## Estructura

```
Signara/
├── public/
│   ├── logo.svg
│   └── videos/            # placeholders — drop real sign clips here
├── src/
│   ├── App.jsx            # router de pantallas
│   ├── main.jsx
│   ├── index.css
│   ├── components/
│   │   ├── Logo.jsx
│   │   ├── LandingScreen.jsx
│   │   ├── ModeSelection.jsx
│   │   ├── TranslationScreen.jsx
│   │   ├── TextInputPanel.jsx
│   │   ├── AvatarPlayer.jsx
│   │   └── SignChips.jsx
│   ├── hooks/
│   │   └── useVoiceInput.js   # wrapper Web Speech API (es-ES)
│   └── utils/
│       ├── translateText.js   # MOCK del traductor (futuro: Claude API)
│       └── signMap.js         # diccionario seña → video
├── tailwind.config.js
├── postcss.config.js
├── vite.config.js
└── index.html
```

## Cómo correr

```bash
npm install
npm run dev
```

La app abre en http://localhost:5173.

## Pantallas

1. **Landing** — logo, nombre, tagline y botón *Comenzar*.
2. **Modo** — elige entre *Traducir texto* y *Traducir voz*.
3. **Traducción** — input arriba (campo + micrófono), avatar al centro, texto original y chips de señas abajo.

## Conexión a Claude (próximo paso)

Solo hay que reemplazar el cuerpo de `src/utils/translateText.js`:

```js
export async function translateText(input) {
  const res = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: input })
  })
  const { signs } = await res.json()
  return signs   // ["YO","NECESITAR","AYUDA"]
}
```

El backend (no incluido en este MVP) debería enviarle el prompt a Claude y devolver el array de señas canónicas.

## Paleta

| Token            | Hex       |
|------------------|-----------|
| signara-blue     | `#1F40C2` |
| signara-sky      | `#9DCDF7` |
| signara-navy     | `#1F2675` |
| signara-purple   | `#7060A8` |
| signara-lilac    | `#B5A3D2` |

## Licencia

MIT — proyecto de hackathon.
