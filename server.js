import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Carga manual del .env (compatible con Node 24 en Windows)
const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const envContent = readFileSync(resolve(__dirname, '.env'), 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const idx = line.indexOf('=');
    if (idx > 0 && !line.startsWith('#')) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      if (key) process.env[key] = val;
    }
  }
} catch {}

import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { createServer } from 'http';

const app = express();
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VIDEOS_DISPONIBLES = [
  "como_estas", "gracias", "hola", "necesito_ayuda",
  "por_favor", "te_amo", "tengo_sed"
];

app.post('/api/translate', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'El texto es requerido' });

  console.log('[Claude] Traduciendo:', text);

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: `Eres el motor de traducción de Signara. Conviertes frases en secuencias de videos de lengua de señas.
Usa ÚNICAMENTE estos nombres: ${JSON.stringify(VIDEOS_DISPONIBLES)}.
Devuelve SOLO un arreglo JSON válido con los nombres en minúsculas y extensión .mp4, en el mismo orden de la frase.
Ejemplo: "Hola, ¿cómo estás?" → ["hola.mp4","como_estas.mp4"]
No escribas nada más que el JSON.`,
      messages: [{ role: "user", content: `Traduce: "${text}"` }]
    });

    const responseText = message.content[0].text.trim();
    console.log('[Claude] Respuesta:', responseText);
    const signsArray = JSON.parse(responseText.toLowerCase());

    return res.status(200).json({ signs: signsArray });

  } catch (error) {
    console.error('[Claude] Error:', error.message);
    return res.status(500).json({ error: 'Error al traducir' });
  }
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'signara-web',
    note: 'Traducción e interpretación usan el backend sign.mt (proyecto translate).',
  });
});

const SIGN_MT_API = (process.env.SIGN_MT_API_URL || 'https://sign.mt/api').replace(/\/$/, '');

app.use('/sign-mt', async (req, res) => {
  try {
    const target = `${SIGN_MT_API}${req.url}`;
    const headers = { Accept: 'application/json' };
    if (req.headers['content-type']) {
      headers['Content-Type'] = req.headers['content-type'];
    }

    const init = { method: req.method, headers };
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      init.body = JSON.stringify(req.body);
    }

    const upstream = await fetch(target, init);
    const body = await upstream.text();
    res.status(upstream.status);
    upstream.headers.forEach((v, k) => {
      if (k.toLowerCase() === 'transfer-encoding') return;
      res.setHeader(k, v);
    });
    res.send(body);
  } catch (err) {
    console.error('[sign-mt proxy]', err.message);
    res.status(502).json({ error: 'Backend sign.mt no disponible' });
  }
});

const distDir = resolve(__dirname, 'dist');
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(resolve(distDir, 'index.html'));
  });
}

process.on('uncaughtException', (err) => console.error('[Server] Error:', err));
process.on('unhandledRejection', (err) => console.error('[Server] Promise rechazada:', err));

const port = Number(process.env.PORT) || 3001;
const server = createServer(app);
server.listen(port, () => console.log(`Signara web en http://localhost:${port}`));
server.on('error', (err) => console.error('[Server] Error al escuchar:', err));
