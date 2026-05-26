import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.post("/api/gemini/enhance-profile", async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is missing. Please set it in Settings > Secrets." });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const { prompt } = req.body;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "Você é um assistente de IA focado em melhorar a descrição de perfis de psicólogos e apresentar sugestões de texto mais profissionais para a plataforma.",
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to generate content" });
    }
  });

  app.post("/api/gemini/advanced-search", async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is missing. Please set it in Settings > Secrets." });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const { query, datalist } = req.body;

      const prompt = `Filtragem Inteligente.
Abaixo está uma lista de profissionais em formato JSON.
Considere as informações fornecidas e a consulta do usuário.
Consulta do usuário: "${query}"

Lista JSON:
${JSON.stringify(datalist, null, 2)}

Devolva APENAS um array JSON contendo os IDs dos profissionais que correspondem à consulta, sem marcações ou texto adicional. Se nenhum corresponder, devolva [].`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          systemInstruction: "Você é um filtro avançado. Analise os dados e retorne apenas o ID (string) das pessoas que dão match com a query. Retorne um array de strings.",
        }
      });

      res.json({ ids: JSON.parse(response.text) });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to generate content" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
