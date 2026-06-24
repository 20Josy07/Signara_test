# CLAUDE.md

Guidance for working with the Signara codebase.

## Project Overview

Signara translates between Spanish (text/voice) and sign language. It uses the **Sign Translate (sign.mt)** backend and TF.js models from `C:\Users\josya\Desktop\translate`.

- **Traducir:** text → SignWriting + 3D pose (sign.mt API), MP4 avatars as fallback
- **Interpretar:** camera → SignWriting (local TF.js) → Spanish text (sign.mt Bergamot)

## Commands

```bash
npm install
npm run sync:models   # copy models/fonts from translate → public/
npm run dev           # http://localhost:5173
npm run build
npm run server        # optional Claude API on :3001
```

## Architecture

```
src/
├── sign-engine/          # TF.js pipeline (hands, face, detector)
├── utils/signMtApi.js    # sign.mt API client
├── utils/translateText.js
└── components/
    ├── TranslationScreen.jsx
    ├── InterpretScreen.jsx
    ├── SignWritingViewer.jsx
    └── PoseViewer.jsx
public/models/            # synced from translate
```

## Environment

`.env` (optional):
```
ANTHROPIC_API_KEY=...     # fallback translation → MP4
GOOGLE_API_KEY=...        # Vercel api/translate.js
TRANSLATE_ROOT=C:\Users\josya\Desktop\translate
SIGN_MT_API_URL=https://sign.mt/api
```

## Key files

- Translation logic: `src/utils/translateText.js`
- Sign mapping (MP4 fallback): `src/utils/signMap.js`
- Interpret pipeline: `src/sign-engine/index.js` + `src/components/InterpretScreen.jsx`
