import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Healthcheck endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Server-side email proxy to bypass browser CORS & secure API keys
  app.post("/api/send-email", async (req, res) => {
    try {
      const { apiKey, url, payload, headers: customHeaders } = req.body;

      const targetUrl = url || "https://api.brevo.com/v3/smtp/email";
      const isBrevoApi = targetUrl.includes("api.brevo.com");

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "accept": "application/json",
        "User-Agent": "AcolheMente-Server/1.0",
        ...customHeaders,
      };

      if (apiKey) {
        const cleanKey = apiKey.trim();
        headers["api-key"] = cleanKey;
        headers["Authorization"] = `Bearer ${cleanKey}`;
        headers["X-Webhook-Secret"] = cleanKey;
      }

      console.log(`[Server Email Proxy] Dispatching email to ${targetUrl}`);

      const brevoRes = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      let resData: any = null;
      try {
        resData = await brevoRes.json();
      } catch (e) {
        resData = await brevoRes.text().catch(() => null);
      }

      console.log(`[Server Email Proxy] Target responded with status ${brevoRes.status}:`, resData);

      if (!brevoRes.ok) {
        let errorMessage = "Erro desconhecido do serviço de e-mail.";
        if (typeof resData === "object" && resData !== null) {
          errorMessage = resData.message || resData.error || resData.code || JSON.stringify(resData);
        } else if (typeof resData === "string") {
          errorMessage = resData;
        }

        return res.status(brevoRes.status).json({
          success: false,
          status: brevoRes.status,
          error: errorMessage,
          data: resData,
        });
      }

      return res.json({
        success: true,
        status: brevoRes.status,
        data: resData,
      });
    } catch (err: any) {
      console.error("[Server Email Proxy Error]", err);
      return res.status(500).json({
        success: false,
        error: err?.message || "Erro de rede no servidor ao disparar e-mail.",
      });
    }
  });

  // Vite middleware for development vs static serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
