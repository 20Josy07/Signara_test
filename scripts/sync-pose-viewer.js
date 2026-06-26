// Copia chunks Stencil de pose-viewer a public/ (Vite no empaqueta .entry.js lazy).
import { cpSync, existsSync, mkdirSync, rmSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'node_modules', 'pose-viewer', 'dist', 'esm')
const dest = join(root, 'public', 'pose-viewer', 'esm')

if (!existsSync(src)) {
  console.error('Falta pose-viewer. Ejecuta: npm install')
  process.exit(1)
}

rmSync(join(root, 'public', 'pose-viewer'), { recursive: true, force: true })
mkdirSync(dest, { recursive: true })
cpSync(src, dest, { recursive: true })
console.log('✓ pose-viewer → public/pose-viewer/esm')
