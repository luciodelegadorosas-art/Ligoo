import express from "express";
import OpenAI from "openai";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const PORT = process.env.PORT || 10000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json({ limit: "12mb" }));
app.use(express.static(__dirname));

const styles = {
  caliente: "coqueta, atrevida y con chispa, sin ser vulgar",
  enamorar: "romántica, dulce y encantadora",
  chistoso: "graciosa, natural y con buen humor",
  salvar: "ayuda a salir de la situación con una respuesta inteligente y natural",
  seguro: "segura de sí misma, tranquila y con personalidad"
};

app.get("/api/health", (req, res) => {
  res.json({ ok: true, aiConfigured: Boolean(process.env.OPENAI_API_KEY) });
});

app.post("/api/generate", async (req, res) => {
  try {
    const { image, mimeType, mode } = req.body;

    if (!image || !mode) {
      return res.status(400).json({ error: "Faltan la imagen o el estilo." });
    }

    // Permite probar la web sin pagar una API todavía.
    if (!process.env.OPENAI_API_KEY) {
      const demo = {
        caliente: "😏 Podrías responder: “Mmm… ¿y esa indirecta viene con explicación o me toca descubrirla?”",
        enamorar: "❤️ Podrías responder: “Jajaja, contigo siempre termino sonriendo. Me gusta hablar contigo.”",
        chistoso: "😂 Podrías responder: “JAJAJA, espera… necesito procesar semejante mensaje 😂”",
        salvar: "🛟 Podrías responder: “Jajaja, creo que me expliqué mal 😅. Lo que quería decir era otra cosa.”",
        seguro: "😎 Podrías responder: “Tranqui, yo sé lo que dije 😌. Ahora te toca responder a ti.”"
      };
      return res.json({ answer: demo[mode] || demo.seguro, demo: true });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const dataUrl = image.startsWith("data:")
      ? image
      : `data:${mimeType || "image/jpeg"};base64,${image}`;

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
      input: [{
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              `Analiza la captura de pantalla del chat. Identifica el último mensaje relevante ` +
              `y crea 3 respuestas cortas en español para que el usuario pueda elegir. ` +
              `El estilo solicitado es: ${styles[mode] || styles.seguro}. ` +
              `No inventes información que no aparezca en la captura. ` +
              `Devuelve solamente las 3 opciones numeradas, sin explicaciones largas.`
          },
          {
            type: "input_image",
            image_url: dataUrl,
            detail: "auto"
          }
        ]
      }]
    });

    res.json({ answer: response.output_text });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "No se pudo generar la respuesta.",
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

