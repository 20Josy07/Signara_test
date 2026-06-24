import express from 'express';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

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

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'signara-web',
    note: 'Traducción usa el backend translate (emuladores o sign.mt).',
  });
});

const SIGN_MT_API = (
  process.env.SIGN_MT_API_URL ||
  'http://127.0.0.1:4013/sign-mt/us-central1/translate-textToText/api'
).replace(/\/$/, '');

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
