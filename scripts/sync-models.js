// Copia modelos y fuentes desde el proyecto translate.
import { cpSync, existsSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const translateRoot =
  process.env.TRANSLATE_ROOT ||
  'C:\\Users\\josya\\Desktop\\translate'

const srcModels = join(translateRoot, 'src', 'assets', 'models')
const destModels = join(root, 'public', 'models')
const fontSrc = join(root, 'node_modules', '@sutton-signwriting', 'font-ttf', 'font')
const fontDest = join(root, 'public', 'fonts', 'signwriting')

const MODEL_DIRS = [
  'sign-detector',
  'hand-shape',
  'face-features',
  'pose-animation',
]

if (!existsSync(srcModels)) {
  console.error('No se encontró el proyecto translate en:', srcModels)
  process.exit(1)
}

mkdirSync(destModels, { recursive: true })

for (const dir of MODEL_DIRS) {
  const src = join(srcModels, dir)
  const dest = join(destModels, dir)
  if (!existsSync(src)) {
    console.warn('Omitido (no existe):', dir)
    continue
  }
  cpSync(src, dest, { recursive: true })
  console.log('✓', dir)
}

if (existsSync(fontSrc)) {
  mkdirSync(fontDest, { recursive: true })
  cpSync(fontSrc, fontDest, { recursive: true })
  console.log('✓ fuentes SignWriting')
}

const browsermtPkg = join(root, 'node_modules', '@sign-mt', 'browsermt')
const browsermtDest = join(root, 'public', 'browsermt')
if (existsSync(browsermtPkg)) {
  mkdirSync(browsermtDest, { recursive: true })
  const copies = [
    ['artifacts/bergamot-translator-worker.js', 'bergamot-translator-worker.js'],
    ['artifacts/bergamot-translator-worker.wasm', 'bergamot-translator-worker.wasm'],
    ['build/bundled/worker.js', 'worker.js'],
  ]
  for (const [srcRel, destName] of copies) {
    const src = join(browsermtPkg, ...srcRel.split('/'))
    if (existsSync(src)) {
      cpSync(src, join(browsermtDest, destName))
      console.log('✓ browsermt/', destName)
    }
  }
} else {
  console.warn('Omitido: npm install @sign-mt/browsermt')
}

console.log('\nSincronizado desde', translateRoot)
