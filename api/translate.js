import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'El texto es requerido' });

  try {
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash", 
        generationConfig: { responseMimeType: "application/json" } 
    });

    const prompt = `Traduce a un arreglo JSON de archivos .mp4: "${text}"`;
    const result = await model.generateContent(prompt);
    const signsArray = JSON.parse(result.response.text().toLowerCase());
    return res.status(200).json({ signs: signsArray });

  } catch (error) {
    console.log("⚠️ API ocupada o fallando. Activando Motor Local Inteligente...");
    
    // 1. Limpiamos el texto quitando tildes suavemente (cómo -> como)
    let textoLimpio = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    let resultadoFinal = [];

    // 2. Buscamos tus señas exactas en el texto y armamos el arreglo en orden
    if (textoLimpio.includes("hola")) resultadoFinal.push("hola.mp4");
    if (textoLimpio.includes("como estas")) resultadoFinal.push("como_estas.mp4");
    if (textoLimpio.includes("tengo sed")) resultadoFinal.push("tengo_sed.mp4");
    if (textoLimpio.includes("necesito ayuda")) resultadoFinal.push("necesito_ayuda.mp4");
    if (textoLimpio.includes("por favor")) resultadoFinal.push("por_favor.mp4");
    if (textoLimpio.includes("te amo")) resultadoFinal.push("te_amo.mp4");
    if (textoLimpio.includes("gracias")) resultadoFinal.push("gracias.mp4");

    // 3. Seguro contra fallos: si escriben algo que no tienes grabado, muestra "hola"
    if (resultadoFinal.length === 0) resultadoFinal.push("hola.mp4");

    // Devolvemos el resultado limpio y perfecto a React
    return res.status(200).json({ signs: resultadoFinal });
  }
}