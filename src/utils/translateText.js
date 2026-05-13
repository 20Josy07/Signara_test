const normalize = (str) =>
  str.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w\s]/g, "").trim();

const SIGN_MAP = {
  "como estas": "como_estas",
  "como esta": "como_estas",
  "que tal": "como_estas",
  "necesito ayuda": "necesito_ayuda",
  "por favor": "por_favor",
  "porfavor": "por_favor",
  "tengo sed": "tengo_sed",
  "te amo": "te_amo",
  "te quiero": "te_amo",
  "hola": "hola",
  "gracias": "gracias",
  "muchas gracias": "gracias",
  "ayuda": "necesito_ayuda",
  "auxilio": "necesito_ayuda",
  "socorro": "necesito_ayuda",
  "sed": "tengo_sed",
};

function matchSigns(text) {
  const normalized = normalize(text);
  const result = [];
  let remaining = normalized;

  const sortedKeys = Object.keys(SIGN_MAP).sort((a, b) => b.length - a.length);

  while (remaining.length > 0) {
    let matched = false;
    for (const phrase of sortedKeys) {
      if (remaining === phrase || remaining.startsWith(phrase + " ")) {
        result.push(SIGN_MAP[phrase]);
        remaining = remaining.slice(phrase.length).trimStart();
        matched = true;
        break;
      }
    }
    if (!matched) {
      const spaceIdx = remaining.indexOf(" ");
      remaining = spaceIdx === -1 ? "" : remaining.slice(spaceIdx + 1);
    }
  }

  return result;
}

export async function translateText(text) {
  return matchSigns(text);
}
