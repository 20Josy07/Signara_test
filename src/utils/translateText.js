/**
 * translateText
 *
 * MVP-mocked translator. In production this will hit the Claude API:
 *   POST /api/translate { text }  ->  { signs: ["YO","NECESITAR","AYUDA"] }
 *
 * Strategy: greedy left-to-right phrase matcher. At each position we try
 * every PHRASE_MAP rule; if one matches at the start of the remaining text
 * we emit its signs and advance. Otherwise we consume the next token via
 * WORD_MAP. This way sentences like "hola necesito ayuda" produce the
 * full sequence ["HOLA","YO","NECESITAR","AYUDA"].
 */

const STOPWORDS = new Set([
  'a','al','de','del','la','las','el','los','un','una','unos','unas',
  'y','o','u','que','en','con','por','para','es','son','soy',
  'me','te','se','su','sus','mi','mis','lo','le','les'
])

// Order matters for ties: longer / more-specific phrases first.
const PHRASE_MAP = [
  { match: /^(necesito|necesita|necesitamos)\s+ayuda\b/, signs: ['NECESITO_AYUDA'] },
  { match: /^tengo\s+sed\b/,                            signs: ['TENGO_SED'] },
  { match: /^tengo\s+hambre\b/,                         signs: ['YO','NECESITAR','COMIDA'] },
  { match: /^estoy\s+bien\b/,                           signs: ['YO','BIEN'] },
  { match: /^estoy\s+mal\b/,                            signs: ['YO','MAL'] },
  { match: /^te\s+amo\b/,                               signs: ['TE_AMO'] },
  { match: /^me\s+llamo\b/,                             signs: ['YO','NOMBRE'] },
  { match: /^como\s+estas\b/,                           signs: ['COMO_ESTAS'] },
  { match: /^por\s+favor\b/,                            signs: ['POR_FAVOR'] },
  { match: /^es\s+urgente\b/,                           signs: ['URGENTE'] },
  { match: /^hola\b/,                                   signs: ['HOLA'] },
  { match: /^adios\b/,                                  signs: ['ADIOS'] },
  { match: /^gracias\b/,                                signs: ['GRACIAS'] }
]

const WORD_MAP = {
  hola: 'HOLA', adios: 'ADIOS', gracias: 'GRACIAS',
  yo: 'YO', tu: 'TU', necesito: 'NECESITAR', necesita: 'NECESITAR',
  ayuda: 'AYUDA', urgente: 'URGENTE', agua: 'AGUA', comida: 'COMIDA',
  casa: 'CASA', amigo: 'AMIGO', amiga: 'AMIGO', familia: 'FAMILIA',
  amor: 'AMOR', feliz: 'FELIZ', triste: 'TRISTE', no: 'NO',
  bien: 'BIEN', mal: 'MAL', hoy: 'HOY', manana: 'MANANA',
  nombre: 'NOMBRE'
}

const stripAccents = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * @param {string} input - free-form Spanish text.
 * @returns {Promise<string[]>} - canonical sign tokens, in order.
 */
export async function translateText(input) {
  await new Promise((r) => setTimeout(r, 300))

  let remaining = stripAccents(String(input || '').trim())
    .replace(/[^\p{L}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!remaining) return []

  const result = []
  let safety = 50

  outer: while (remaining.length > 0 && safety-- > 0) {
    // Try each phrase rule against the start of `remaining`
    for (const rule of PHRASE_MAP) {
      const m = remaining.match(rule.match)
      if (m) {
        result.push(...rule.signs)
        remaining = remaining.slice(m[0].length).trim()
        continue outer
      }
    }
    // No phrase match - consume the next token
    const spaceIdx = remaining.indexOf(' ')
    const tok = spaceIdx === -1 ? remaining : remaining.slice(0, spaceIdx)
    if (tok && !STOPWORDS.has(tok)) {
      result.push(WORD_MAP[tok] || tok.toUpperCase())
    }
    remaining = spaceIdx === -1 ? '' : remaining.slice(spaceIdx + 1).trim()
  }

  if (result.length === 0) return ['YO', 'NECESITAR', 'AYUDA']
  return result
}
