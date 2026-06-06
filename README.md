# Signara

**Conectando dos mundos que hoy no logran comunicarse.**

Signara es una aplicación web que ayuda a traducir entre español y lengua de señas. Puedes escribir o hablar y ver las señas con un avatar, o usar la cámara para interpretar gestos y convertirlos en texto.

---

## ¿Qué puedes hacer con Signara?

### Traducir → señas
Escribe una frase o dicta por voz. Signara la convierte en una secuencia de señas y las reproduce con un avatar (Alex, Anuar o Grace).

### Interpretar → texto
Activa la cámara, haz una seña y Signara intenta reconocerla y mostrarla en pantalla. También puede leer el resultado en voz alta.

---

## Probar la app en tu computadora

Necesitas tener instalado [Node.js](https://nodejs.org/) (versión 18 o superior).

1. Clona este repositorio y entra a la carpeta del proyecto.
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Inicia la aplicación:
   ```bash
   npm run dev
   ```
4. Abre en el navegador la dirección que aparece en la terminal (normalmente `http://localhost:5173`).

Con eso ya puedes explorar la interfaz, traducir texto y probar la entrada por voz.

> **Nota:** Para que la traducción use inteligencia artificial en local, necesitas un archivo `.env` con tu clave de API y ejecutar también `npm run server` en otra terminal. Si no está configurado, la app sigue funcionando con su traducción local integrada.

---

## Reconocimiento de señas con cámara (opcional)

Esta parte usa un servidor de inteligencia artificial aparte. Solo hace falta si quieres probar el modo **Interpretar**.

Requisitos:
- [Python 3.11](https://www.python.org/downloads/release/python-3119/) (usa esta versión; versiones más nuevas pueden dar problemas)

Pasos:

1. Crea y activa un entorno virtual:
   ```bash
   py -3.11 -m venv venv
   venv\Scripts\activate
   ```
2. Instala las dependencias del módulo de IA:
   ```bash
   cd sign_ai
   pip install -r requirements_api.txt
   ```
3. Inicia el servidor:
   ```bash
   uvicorn api:app --port 8000
   ```
4. Con la app web abierta, entra al modo **Interpretar**. Si el servidor está corriendo, verás el indicador **Modo IA** en verde.

---

## Estado del proyecto

Signara nació como MVP de hackathon. Esto es lo que ya funciona y lo que sigue en marcha:

| | |
|---|---|
| ✅ | Interfaz completa y lista para demo |
| ✅ | Traducción de texto y voz a señas con avatar |
| ✅ | Tres avatares para elegir |
| 🔄 | Reconocimiento de señas con cámara (mejorando) |
| 🔄 | Ampliación del vocabulario de señas |

---

## Estructura del proyecto (resumen)

```
Signara/
├── src/          → La aplicación web (lo que ves en el navegador)
├── public/       → Videos de señas, imágenes y logo
├── sign_ai/      → Servidor de reconocimiento de señas con cámara
├── server.js     → API de traducción para desarrollo local
└── api/          → API de traducción para despliegue en la nube
```

---

## Objetivo

Que cualquier persona pueda comunicarse más fácil entre el mundo oral/escrito y la lengua de señas: traduciendo frases a gestos visibles y, a la inversa, entendiendo señas frente a una cámara.

---

*Signara — hecho con ❤️ para acercar mundos.*
