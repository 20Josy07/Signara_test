import { parse } from '@babel/parser'
import fs from 'fs'
let bad = 0
for (const f of process.argv.slice(2)) {
  try {
    parse(fs.readFileSync(f, 'utf8'), { sourceType: 'module', plugins: ['jsx'] })
    console.log('OK  ', f)
  } catch (e) {
    bad++
    console.log('FAIL', f, '-', e.message)
  }
}
process.exit(bad ? 1 : 0)
