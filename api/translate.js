import Anthropic from '@anthropic-ai/sdk';

// Inicializamos el cliente de Claude con tu llave secreta
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  // Verificamos que la petición sea correcta
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'El texto es requerido' });
  }

  try {
    // Llamada REAL a la inteligencia artificial de Claude
    const message = await anthropic.messages.create({
      model: "claude-3-haiku-20240307", // Modelo rápido y económico
      max_tokens: 1024,
      // Le damos instrucciones estrictas a la IA de cómo debe comportarse
      system: "Eres el cerebro de Signara, un traductor a lengua de señas. Tu tarea es recibir una frase, limpiarla (quitar tildes, comas, signos) y separar las palabras clave. Debes devolver ÚNICAMENTE un arreglo de JSON válido con las palabras en minúsculas y la extensión '.mp4' al final de cada una. Ejemplo: si recibes 'Hola, ¿cómo estás?', devuelves [\"hola.mp4\", \"como.mp4\", \"estas.mp4\"]. No digas absolutamente nada más que el JSON.",
      messages: [
        { role: "user", content: `Traduce esta frase: "${text}"` }
      ]
    });

    // Claude nos devuelve un texto, lo convertimos a un objeto de JavaScript
    const aiResponse = message.content[0].text;
    const signsArray = JSON.parse(aiResponse);

    // Le enviamos la respuesta al frontend
    return res.status(200).json({ signs: signsArray });

  } catch (error) {
    console.error("Error en la conexión con Claude:", error);
    return res.status(500).json({ error: 'Error interno del servidor de IA' });
  }
}