# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Signara is a web application that translates between Spanish (text/voice) and sign language using avatars, and optionally recognizes sign language from camera input using an AI server.

Key features:
- Translate text or voice to sign language animations (avatars: Alex, Anuar, Grace)
- Interpret sign language from camera to text (optional AI server)
- Three avatar choices
- Local AI translation via `.env` configuration

## Development Setup and Common Commands

### Prerequisites
- Node.js (v18 or higher)
- Python 3.11 (for optional AI server)

### Web Application (React/Vite)

Install dependencies:
```bash
npm install
```

Start development server:
```bash
npm run dev
```
Runs at http://localhost:5173 by default.

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

Run the local translation API (requires `.env` with API keys):
```bash
npm run server
```
This starts the `server.js` API on a separate port (default 3000?).

### AI Server (Optional, for camera recognition)

Navigate to `sign_ai` directory and follow these steps:

1. Create and activate virtual environment:
```bash
cd sign_ai
py -3.11 -m venv venv
venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements_api.txt
```

3. Start the server:
```bash
uvicorn api:app --port 8000
```
The server runs on http://localhost:8000.

### Environment Variables

For local AI translation in the web app, create a `.env` file in the root with:
```
ANTHROPIC_API_KEY=your_key_here
GOOGLE_API_KEY=your_key_here
```
(See `server.js` for usage.)

## Architecture and Structure

### Web Application (`src/` and `public/`)

- `src/`: React source code
  - `components/`: UI components (screens, avatar player, input panels, etc.)
  - `hooks/`: Custom React hooks (e.g., voice input)
  - `utils/`: Utility functions (text normalization, translation, sign mapping)
  - `App.jsx`: Main application component
  - `main.jsx`: React entry point
  - `index.css`: Global styles (Tailwind-based)

- `public/`: Static assets
  - Avatar videos (MP4) for different avatars and phrases
  - Logo, branding images
  - README files for video sets

### AI Server (`sign_ai/`)

- `api.py`: FastAPI server for sign language recognition (camera input)
- `core/`: Core modules (configuration, feature extraction, GNN model)
- `models/`: Pre-trained GNN model and label mappings
- `data/`: Dataset (zipped)
- Various Python scripts for data collection, training, recording animations, and graph building.

### Communication

- The web app communicates with the local translation API (`server.js`) for AI-powered text-to-sign translation when `.env` is configured.
- For camera recognition, the web app (when in "Interpretar" mode) sends video frames to the `sign_ai` API (`api.py`) running on port 8000 to get sign predictions.

### Key Technologies

- Web: React, Vite, Tailwind CSS, Three.js (for avatar animations)
- AI Server: FastAPI, PyTorch (GNN model), MediaPipe (hand landmark extraction)
- Translation: Anthropic Claude API, Google Generative AI API (for text-to-sign translation via `server.js`)

## Common Development Tasks

### Adding a New Avatar Phrase
1. Place the MP4 video in `public/videos/videos_avatar/<avatar_name>/<phrase>.mp4` (and similarly for _hombre and _mujer variants).
2. Ensure the video is referenced in the appropriate component (e.g., `AvatarPlayer.jsx`).

### Modifying Translation Logic
- Edit `src/utils/translateText.js` for local translation rules.
- For AI translation, modify `server.js` (uses Anthropic and Google APIs).

### Updating Sign Mapping
- Edit `src/utils/signMap.js` which maps words/signs to video filenames.

### Working on AI Server
- Modify `sign_ai/api.py` for endpoint changes.
- Adjust feature extraction in `sign_ai/core/extractor.py`.
- Retrain model using the provided training scripts (02_train.py, 06_gnn_train.py) if needed.

## Testing

The project does not currently have a configured test framework. To add tests, consider setting up Vitest or Jest for React components, and pytest for the Python backend.

## Linting and Formatting

- CSS/Tailwind: Relies on Tailwind's default formatting.
- JavaScript/JSX: Consider configuring ESLint and Prettier if needed.
- Python: Use `flake8` or `black` for linting/formatting (not currently configured).
