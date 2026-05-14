import { GoogleGenerativeAI } from "@google/generative-ai";

// Vercel env var is GOOGLE_API_KEY
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const SIGN_KEYS = ["HOLA", "COMO_ESTAS", "GRACIAS", "POR_FAVOR", "TENGO_SED", "TE_AMO", "NECESITO_AYUDA"];

function localMatch(text) {
  const t = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const result = [];
  if (t.includes("como estas") || t.includes("como esta") || t.includes("que tal")) result.push("COMO_ESTAS");
  if (t.includes("necesito ayuda") || t.includes("auxilio") || t.includes("socorro")) result.push("NECESITO_AYUDA");
  if (t.includes("por favor") || t.includes("porfavor")) result.push("POR_FAVOR");
  if (t.includes("tengo sed") || (t.includes("sed") && !t.includes("desde"))) result.push("TENGO_SED");
  if (t.includes("te amo") || t.includes("te quiero")) result.push("TE_AMO");
  if (t.includes("gracias") || t.includes("muchas gracias")) result.push("GRACIAS");
  if (t.includes("hola")) result.push("HOLA");
  return result;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'El texto es requerido' });

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `Eres el motor de traducción de Signara. Conviertes frases en español a tokens de lengua de señas.
Usa ÚNICAMENTE estos tokens: ${JSON.stringify(SIGN_KEYS)}.
Devuelve SOLO un arreglo JSON válido con los tokens en MAYÚSCULAS, en el mismo orden de la frase.
Ejemplo: "Hola, ¿cómo estás?" → ["HOLA","COMO_ESTAS"]
No escribas nada más que el JSON.
Texto: "${text}"`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    const signsArray = JSON.parse(responseText.toUpperCase());
    const validSigns = signsArray.filter(s => SIGN_KEYS.includes(s));
    return res.status(200).json({ signs: validSigns.length > 0 ? validSigns : localMatch(text) });

  } catch (error) {
    console.log("⚠️ Gemini no disponible, usando motor local:", error.message);
    return res.status(200).json({ signs: localMatch(text) });
  }
}
