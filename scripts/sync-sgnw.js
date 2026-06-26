// Copia chunks Stencil de sgnw-components a public/ (Vite no empaqueta los .entry.js lazy).
import { cpSync, existsSync, mkdirSync, rmSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'node_modules', '@sutton-signwriting', 'sgnw-components', 'dist', 'esm')
const dest = join(root, 'public', 'sgnw', 'esm')

if (!existsSync(src)) {
  console.error('Falta @sutton-signwriting/sgnw-components. Ejecuta: npm install')
  process.exit(1)
}

rmSync(join(root, 'public', 'sgnw'), { recursive: true, force: true })
mkdirSync(dest, { recursive: true })
cpSync(src, dest, { recursive: true })
console.log('✓ sgnw-components → public/sgnw/esm')
