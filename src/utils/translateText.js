export async function translateText(text) {
  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error('Error en la API de traducción');
    }

    const data = await response.json();
    return data.signs || [];
    
  } catch (error) {
    console.error("Error en el fetch del backend:", error);
    return []; 
  }
}