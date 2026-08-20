import express from "express";
import OpenAI from "openai";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const PORT = process.env.PORT || 10000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: "20mb" }));
app.use(express.static(__dirname));

const styles = {
  caliente: "coqueta, atrevida y con chispa, sin ser vulgar",
  enamorar: "romántica, dulce y encantadora",
  chistoso: "graciosa, espontánea y con buen humor",
  salvar: "inteligente, natural y capaz de arreglar la situación",
  seguro: "segura, tranquila, natural y con personalidad"
};

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    aiConfigured: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_MODEL || "gpt-5.6"
  });
});

app.post("/api/generate", async (req, res) => {
  try {
    const { image, mimeType, mode } = req.body;

    if (!image || !mode) {
      return res.status(400).json({
        error: "Falta la captura o el estilo."
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        error: "La IA todavía no está configurada en Render.",
        code: "AI_NOT_CONFIGURED"
      });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const dataUrl = image.startsWith("data:")
      ? image
      : `data:${mimeType || "image/jpeg"};base64,${image}`;

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.6",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
Eres Ligooo, un asistente que ayuda a una persona a contestar chats.

Mira cuidadosamente TODA la captura.

Primero entiende:
- quién está hablando;
- cuál fue el último mensaje importante;
- qué tono tiene la conversación;
- qué se está insinuando o preguntando;
- qué respuesta tendría sentido en ese contexto.

Después crea exactamente 3 respuestas que la persona pueda enviar directamente.

ESTILO:
${styles[mode] || styles.seguro}

REGLAS IMPORTANTES:
- Las respuestas deben tener sentido con ESTA conversación.
- No inventes información que no aparezca.
- No uses frases genéricas al azar.
- No digas "Podrías responder".
- No digas "Aquí tienes".
- No expliques tu razonamiento.
- No pongas títulos.
- No pongas números.
- Cada respuesta debe estar lista para copiar y enviar.
- Deben sonar como una persona real escribiendo por WhatsApp o Instagram.
- Mantén el español natural.
- Haz que las tres opciones sean diferentes entre sí.
- Si la conversación es coqueta, entiende el coqueteo.
- Si la otra persona está molesta, no respondas alegremente sin motivo.
- Si hay una pregunta concreta, contéstala.
- Si falta contexto, usa solamente lo que pueda verse en la captura.

Devuelve únicamente las 3 respuestas separadas por una línea en blanco.
`
            },
            {
              type: "input_image",
              image_url: dataUrl,
              detail: "high"
            }
          ]
        }
      ]
    });

    const answer = (response.output_text || "").trim();

    if (!answer) {
      return res.status(502).json({
        error: "La IA no devolvió ninguna respuesta."
      });
    }

    res.json({
      answer,
      demo: false
    });

  } catch (error) {
    console.error("ERROR OPENAI:", error);

    res.status(500).json({
      error: "No se pudo conectar con la IA.",
      detail: error?.message || "Error desconocido"
    });
  }
});

app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Ligooo escuchando en el puerto ${PORT}`);
});
