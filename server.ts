import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable trust proxy for Cloud Run and Nginx reverse proxies
  app.set("trust proxy", 1);

  // Global CORS & Preflight handler for webhooks & external consumers
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, apikey, api-key, X-Webhook-Secret"
    );
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

  // Support up to 50mb for WhatsApp webhooks (media, base64 QR codes, message attachments)
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.use(express.text({ limit: "50mb" }));

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

        return res.json({
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
      return res.json({
        success: false,
        status: 500,
        error: err?.message || "Erro de rede no servidor ao disparar e-mail.",
      });
    }
  });

  // ==========================================
  // WHATSAPP EVOLUTION API & WEBHOOK ROUTES
  // ==========================================

  interface WebhookEventItem {
    id: string;
    timestamp: string;
    event: string;
    instance?: string;
    sender?: string;
    recipient?: string;
    messageText?: string;
    summary: string;
    data?: any;
  }
  const recentWebhookEvents: WebhookEventItem[] = [];

  function normalizeApiUrl(rawUrl: string): string {
    if (!rawUrl) return "";
    let url = String(rawUrl).trim();
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    return url.replace(/\/+$/, "");
  }

  function isRailwayFormula(apiKey?: string): boolean {
    if (!apiKey) return false;
    const str = String(apiKey).trim();
    return str.includes("${{") || str.includes("secret(");
  }

  function getEvolutionHeaders(apiKey?: string): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["apikey"] = apiKey.trim();
    }
    return headers;
  }

  // 1. Webhook Health & Verification
  app.get("/api/whatsapp/webhook", (req, res) => {
    res.json({
      status: "ok",
      service: "AcolheMente WhatsApp Evolution Webhook",
      timestamp: new Date().toISOString(),
      eventsCount: recentWebhookEvents.length,
    });
  });

  // 2. Webhook Ingress (Receives events from Evolution API)
  app.post("/api/whatsapp/webhook", (req, res) => {
    try {
      const payload = req.body || {};
      const eventType = payload.event || payload.type || "unknown_event";
      const instance = payload.instance || payload.instanceName || "";
      const now = new Date().toISOString();

      let sender = "";
      let recipient = "";
      let messageText = "";
      let summary = `Evento "${eventType}" recebido`;

      if (
        eventType.includes("messages.upsert") ||
        eventType === "MESSAGES_UPSERT"
      ) {
        const msgData =
          payload.data?.message ||
          payload.data?.messages?.[0] ||
          payload.data;
        sender =
          payload.data?.key?.remoteJid ||
          msgData?.key?.remoteJid ||
          payload.data?.sender ||
          "";
        sender = sender.replace(/@.+/, "");

        messageText =
          msgData?.conversation ||
          msgData?.extendedTextMessage?.text ||
          msgData?.text ||
          (msgData?.imageMessage ? "[Imagem]" : "") ||
          (msgData?.audioMessage ? "[Áudio]" : "") ||
          "";

        summary = sender
          ? `Mensagem de ${sender}: "${messageText.slice(0, 80)}${messageText.length > 80 ? "..." : ""}"`
          : `Nova mensagem recebida`;
      } else if (
        eventType.includes("connection.update") ||
        eventType === "CONNECTION_UPDATE"
      ) {
        const state =
          payload.data?.state || payload.data?.status || "alterado";
        summary = `Conexão WhatsApp: ${state}`;
      } else if (
        eventType.includes("qrcode.updated") ||
        eventType === "QRCODE_UPDATED"
      ) {
        summary = `Novo QR Code gerado para conexão`;
      } else if (
        eventType.includes("send.message") ||
        eventType === "SEND_MESSAGE"
      ) {
        summary = `Mensagem enviada com sucesso`;
      }

      const logItem: WebhookEventItem = {
        id: "wh_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        timestamp: now,
        event: eventType,
        instance,
        sender,
        recipient,
        messageText,
        summary,
        data: payload,
      };

      recentWebhookEvents.unshift(logItem);
      if (recentWebhookEvents.length > 50) {
        recentWebhookEvents.pop();
      }

      console.log(`[WhatsApp Evolution Webhook] [${instance || "global"}] ${summary}`);

      return res.status(200).json({
        received: true,
        id: logItem.id,
        timestamp: now,
      });
    } catch (e: any) {
      console.error("[WhatsApp Evolution Webhook Error]", e);
      return res.json({
        received: false,
        error: e?.message || "Erro no processamento do webhook WhatsApp.",
      });
    }
  });

  // 3. Webhook Events List
  app.get("/api/whatsapp/webhook/events", (req, res) => {
    res.json({
      success: true,
      count: recentWebhookEvents.length,
      events: recentWebhookEvents,
    });
  });

  // 4. Webhook Events Clear
  app.post("/api/whatsapp/webhook/clear", (req, res) => {
    recentWebhookEvents.length = 0;
    res.json({ success: true, message: "Histórico de eventos do webhook limpo." });
  });

  // 5. Evolution API: Status Check
  app.post("/api/whatsapp/evolution/status", async (req, res) => {
    try {
      const { apiUrl, apiKey, instanceName } = req.body;
      if (!apiUrl || !instanceName) {
        return res.json({
          success: false,
          state: "close",
          error: "URL da Evolution API e Nome da Instância são obrigatórios.",
        });
      }

      if (isRailwayFormula(apiKey)) {
        return res.json({
          success: false,
          state: "close",
          error:
            "A Chave API informada é a fórmula do Railway (${{secret...}}) e não o valor real. No Railway, acesse Variables > clique no ícone de olho em AUTHENTICATION_API_KEY para copiar o valor real, ou defina uma senha personalizada.",
        });
      }

      const cleanUrl = normalizeApiUrl(apiUrl);
      const headers = getEvolutionHeaders(apiKey);

      const evoRes = await fetch(
        `${cleanUrl}/instance/connectionState/${encodeURIComponent(instanceName.trim())}`,
        {
          method: "GET",
          headers,
        }
      );

      let resData: any = null;
      try {
        resData = await evoRes.json();
      } catch {
        resData = await evoRes.text();
      }

      if (!evoRes.ok) {
        if (evoRes.status === 401 || evoRes.status === 403) {
          return res.json({
            success: false,
            state: "close",
            status: evoRes.status,
            error:
              "Chave API não autorizada (401). Verifique se o valor em 'Chave Global (API Key)' é idêntico ao AUTHENTICATION_API_KEY do Railway.",
          });
        }

        return res.json({
          success: false,
          state: "close",
          status: evoRes.status,
          error:
            typeof resData === "object"
              ? resData?.response?.message ||
                resData?.message ||
                "Instância não encontrada ou desconectada"
              : resData,
        });
      }

      const state =
        resData?.instance?.state ||
        resData?.connectionStatus?.state ||
        resData?.state ||
        (resData?.status === "open" ? "open" : "close");

      return res.json({
        success: true,
        state,
        raw: resData,
      });
    } catch (err: any) {
      console.error("[Evolution Status Error]", err);
      return res.json({
        success: false,
        state: "error",
        error:
          err?.message || "Não foi possível conectar à URL da Evolution API.",
      });
    }
  });

  // 6. Evolution API: Connect & Get QR Code
  app.post("/api/whatsapp/evolution/connect", async (req, res) => {
    try {
      const { apiUrl, apiKey, instanceName, webhookUrl } = req.body;
      if (!apiUrl || !instanceName) {
        return res.json({
          success: false,
          error: "URL da Evolution API e Nome da Instância são obrigatórios.",
        });
      }

      if (isRailwayFormula(apiKey)) {
        return res.json({
          success: false,
          error:
            "A Chave API informada é a fórmula do Railway (${{secret...}}) e não o valor real gerado. No painel do Railway, vá na aba Variables da Evolution API e clique no ícone de olho em AUTHENTICATION_API_KEY para copiar o valor real, ou defina uma senha como acolhemente2026.",
        });
      }

      const cleanUrl = normalizeApiUrl(apiUrl);
      const headers = getEvolutionHeaders(apiKey);
      const trimmedInstance = instanceName.trim();

      // Step 1: Attempt to create instance if not exists (requesting QR Code immediately)
      let createData: any = null;
      try {
        const createRes = await fetch(`${cleanUrl}/instance/create`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            instanceName: trimmedInstance,
            token: apiKey ? apiKey.trim() : "acolhemente-token",
            qrcode: true,
            integration: "WHATSAPP-BAILEYS",
            webhook: webhookUrl || undefined,
            webhook_by_events: false,
            events: [
              "APPLICATION_STARTUP",
              "QRCODE_UPDATED",
              "CONNECTION_UPDATE",
              "MESSAGES_UPSERT",
              "MESSAGES_UPDATE",
              "SEND_MESSAGE",
            ],
          }),
        });

        let createJson: any = null;
        try {
          createJson = await createRes.json();
        } catch {
          createJson = null;
        }

        if (createRes.status === 401) {
          return res.json({
            success: false,
            status: 401,
            error:
              "Chave API não autorizada (401). Verifique se o valor de 'Chave Global (API Key)' corresponde exatamente à variável AUTHENTICATION_API_KEY no Railway.",
          });
        }

        if (createRes.status === 403) {
          const msg = Array.isArray(createJson?.response?.message)
            ? createJson.response.message.join(" ")
            : createJson?.response?.message || createJson?.message || "";
          
          if (!msg.toLowerCase().includes("already in use")) {
            return res.json({
              success: false,
              status: 403,
              error: msg || "Acesso negado pela Evolution API (403).",
            });
          }
          // Instance already exists - continue to /instance/connect to get QR code!
        } else if (createRes.ok) {
          createData = createJson;
        }
      } catch (createErr) {
        console.warn("[Evolution Create Instance Warning]", createErr);
      }

      // Check if instance creation already provided the QR code directly
      let base64 =
        createData?.qrcode?.base64 ||
        createData?.base64 ||
        (typeof createData?.code === "string" && createData?.code.startsWith("data:image")
          ? createData.code
          : null);
      let pairingCode =
        createData?.qrcode?.pairingCode ||
        createData?.pairingCode ||
        null;

      if (base64) {
        return res.json({
          success: true,
          state: "connecting",
          base64,
          pairingCode,
          raw: createData,
        });
      }

      // Step 2: Request Connect / QR Code from /instance/connect
      const connectRes = await fetch(
        `${cleanUrl}/instance/connect/${encodeURIComponent(trimmedInstance)}`,
        {
          method: "GET",
          headers,
        }
      );

      let resData: any = null;
      try {
        resData = await connectRes.json();
      } catch {
        resData = await connectRes.text();
      }

      if (!connectRes.ok) {
        if (connectRes.status === 401 || connectRes.status === 403) {
          return res.json({
            success: false,
            status: connectRes.status,
            error:
              "Chave API não autorizada (401). Verifique se a Chave Global informada confere com a variável AUTHENTICATION_API_KEY do Railway.",
          });
        }

        return res.json({
          success: false,
          status: connectRes.status,
          error:
            typeof resData === "object"
              ? (Array.isArray(resData?.response?.message)
                  ? resData.response.message.join(", ")
                  : resData?.response?.message) ||
                resData?.message ||
                resData?.error ||
                "Erro ao conectar na Evolution API"
              : resData,
        });
      }

      base64 =
        resData?.base64 ||
        resData?.qrcode?.base64 ||
        (typeof resData?.code === "string" && resData?.code.startsWith("data:image")
          ? resData.code
          : null) ||
        base64;
      pairingCode =
        resData?.pairingCode ||
        resData?.qrcode?.pairingCode ||
        resData?.code ||
        pairingCode;
      let state =
        resData?.instance?.state ||
        (resData?.status === "open" ? "open" : "connecting");

      // If instance is not open and QR code wasn't ready yet, wait 1.2s and retry connect once
      if (!base64 && state !== "open") {
        await new Promise((r) => setTimeout(r, 1200));
        try {
          const retryRes = await fetch(
            `${cleanUrl}/instance/connect/${encodeURIComponent(trimmedInstance)}`,
            { method: "GET", headers }
          );
          if (retryRes.ok) {
            const retryData = await retryRes.json();
            base64 =
              retryData?.base64 ||
              retryData?.qrcode?.base64 ||
              (typeof retryData?.code === "string" && retryData?.code.startsWith("data:image")
                ? retryData.code
                : null) ||
              base64;
            pairingCode =
              retryData?.pairingCode ||
              retryData?.qrcode?.pairingCode ||
              pairingCode;
            state = retryData?.instance?.state || (retryData?.status === "open" ? "open" : state);
          }
        } catch {
          // ignore retry error
        }
      }

      return res.json({
        success: true,
        state,
        base64,
        pairingCode,
        raw: resData,
      });
    } catch (err: any) {
      console.error("[Evolution Connect Error]", err);
      return res.json({
        success: false,
        error:
          err?.message ||
          "Erro ao solicitar conexão via QR Code na Evolution API.",
      });
    }
  });

  // 7. Evolution API: Set Webhook
  app.post("/api/whatsapp/evolution/set-webhook", async (req, res) => {
    try {
      const { apiUrl, apiKey, instanceName, webhookUrl } = req.body;
      if (!apiUrl || !instanceName || !webhookUrl) {
        return res.json({
          success: false,
          error:
            "URL da Evolution, Nome da Instância e URL do Webhook são obrigatórios.",
        });
      }

      if (isRailwayFormula(apiKey)) {
        return res.json({
          success: false,
          error:
            "A Chave API informada é a fórmula do Railway (${{secret...}}). Copie o valor real gerado na aba Variables do Railway.",
        });
      }

      const cleanUrl = normalizeApiUrl(apiUrl);
      const headers = getEvolutionHeaders(apiKey);
      const trimmedInstance = instanceName.trim();

      // Attempt to ensure instance exists
      try {
        await fetch(`${cleanUrl}/instance/create`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            instanceName: trimmedInstance,
            token: apiKey ? apiKey.trim() : "acolhemente-token",
            qrcode: true,
            integration: "WHATSAPP-BAILEYS",
            webhook: webhookUrl,
            webhook_by_events: false,
            events: [
              "APPLICATION_STARTUP",
              "QRCODE_UPDATED",
              "CONNECTION_UPDATE",
              "MESSAGES_UPSERT",
              "MESSAGES_UPDATE",
              "SEND_MESSAGE",
            ],
          }),
        });
      } catch {
        // Continue to set webhook
      }

      const evoRes = await fetch(
        `${cleanUrl}/webhook/set/${encodeURIComponent(trimmedInstance)}`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            webhook: {
              enabled: true,
              url: webhookUrl,
              byEvents: false,
              events: [
                "APPLICATION_STARTUP",
                "QRCODE_UPDATED",
                "CONNECTION_UPDATE",
                "MESSAGES_UPSERT",
                "MESSAGES_UPDATE",
                "SEND_MESSAGE",
              ],
            },
          }),
        }
      );

      let resData: any = null;
      try {
        resData = await evoRes.json();
      } catch {
        resData = await evoRes.text();
      }

      if (!evoRes.ok) {
        let errorMsg =
          typeof resData === "object"
            ? (Array.isArray(resData?.response?.message)
                ? resData.response.message.join(", ")
                : resData?.response?.message) ||
              resData?.message ||
              resData?.error ||
              "Erro ao registrar webhook na Evolution API"
            : resData;

        if (evoRes.status === 401 || evoRes.status === 403) {
          errorMsg =
            "Chave API não autorizada (401). Verifique a AUTHENTICATION_API_KEY no Railway.";
        } else if (evoRes.status === 404) {
          errorMsg =
            "Instância não encontrada. Clique em 'Conectar via QR Code' primeiro para criá-la.";
        }

        return res.json({
          success: false,
          status: evoRes.status,
          error: errorMsg,
          data: resData,
        });
      }

      return res.json({
        success: true,
        message: "Webhook configurado com sucesso na instância Evolution API!",
        data: resData,
      });
    } catch (err: any) {
      console.error("[Evolution Set Webhook Error]", err);
      return res.json({
        success: false,
        error:
          err?.message || "Falha de rede ao configurar webhook na Evolution API.",
      });
    }
  });

  // 7.5. Evolution API: Complete Diagnostic Suite
  app.post("/api/whatsapp/evolution/diagnose", async (req, res) => {
    try {
      const { apiUrl, apiKey, instanceName, webhookUrl } = req.body;
      const cleanUrl = normalizeApiUrl(apiUrl || "");
      const trimmedInstance = (instanceName || "acolhemente").trim();
      const realApiKey = (apiKey || "").trim();
      const maskedKey =
        realApiKey.length > 8
          ? `${realApiKey.slice(0, 4)}...${realApiKey.slice(-4)}`
          : realApiKey ? "****" : "(nenhuma)";

      const headers = getEvolutionHeaders(realApiKey);
      const maskedHeaders = {
        ...headers,
        ...(realApiKey ? { apikey: maskedKey } : {}),
      };

      const steps: any[] = [];
      const isFormula = isRailwayFormula(realApiKey);

      // STEP 1: Connectivity & Version (GET /)
      const t1Start = Date.now();
      try {
        const r1 = await fetch(`${cleanUrl}/`, { method: "GET" });
        const d1 = await r1.json().catch(() => ({}));
        steps.push({
          stepId: "step-1-connectivity",
          name: "1. Conectividade & Versão do Servidor",
          category: "connectivity",
          status: r1.ok ? "success" : "error",
          durationMs: Date.now() - t1Start,
          httpMethod: "GET",
          endpoint: `${cleanUrl}/`,
          requestHeaders: {},
          responseStatus: r1.status,
          responseStatusText: r1.statusText,
          responseBody: d1,
          diagnosis: r1.ok
            ? `Servidor Evolution API online e respondendo (versão: ${d1?.version || "detectada"}).`
            : `Servidor retornou status HTTP ${r1.status}.`,
          recommendation: r1.ok
            ? "A URL base da Evolution API está correta e com rota aberta."
            : "Verifique se a URL no Railway está ativa e com certificado SSL válido.",
        });
      } catch (err: any) {
        steps.push({
          stepId: "step-1-connectivity",
          name: "1. Conectividade & Versão do Servidor",
          category: "connectivity",
          status: "error",
          durationMs: Date.now() - t1Start,
          httpMethod: "GET",
          endpoint: `${cleanUrl}/`,
          requestHeaders: {},
          responseStatus: 0,
          responseStatusText: "Network Error",
          responseBody: { error: err.message },
          diagnosis: `Falha de rede ao conectar na URL: ${err.message}`,
          recommendation:
            "Verifique se o serviço no Railway não está suspenso ou se o domínio digitado está correto.",
        });
      }

      // STEP 2: Authentication & Global Key Check (GET /instance/fetchInstances)
      const t2Start = Date.now();
      let authOk = false;
      let existingInstances: any[] = [];
      if (isFormula) {
        steps.push({
          stepId: "step-2-auth",
          name: "2. Validação da Chave Global (API Key)",
          category: "auth",
          status: "error",
          durationMs: 0,
          httpMethod: "GET",
          endpoint: `${cleanUrl}/instance/fetchInstances`,
          requestHeaders: maskedHeaders,
          responseStatus: 400,
          responseStatusText: "Invalid Formula",
          responseBody: {
            error: "Fórmula Railway detectada: ${{secret(...)}}",
          },
          diagnosis:
            "A chave informada é uma fórmula do Railway (${{secret...}}) e não a chave secreta gerada.",
          recommendation:
            "No Railway > Evolution API > aba Variables > clique no ícone de olho em AUTHENTICATION_API_KEY para copiar o valor real, ou defina uma senha personalizada.",
        });
      } else {
        try {
          const r2 = await fetch(`${cleanUrl}/instance/fetchInstances`, {
            method: "GET",
            headers,
          });
          const d2 = await r2.json().catch(() => ({}));
          authOk = r2.ok;
          if (Array.isArray(d2)) {
            existingInstances = d2;
          }
          const instanceExistsInList = Array.isArray(d2) && d2.some((inst: any) => {
            const name = inst.name || inst.instance?.instanceName || inst.instanceName;
            return name === trimmedInstance;
          });

          steps.push({
            stepId: "step-2-auth",
            name: "2. Validação da Chave Global (API Key)",
            category: "auth",
            status: r2.ok ? "success" : "error",
            durationMs: Date.now() - t2Start,
            httpMethod: "GET",
            endpoint: `${cleanUrl}/instance/fetchInstances`,
            requestHeaders: maskedHeaders,
            responseStatus: r2.status,
            responseStatusText: r2.statusText,
            responseBody: d2,
            diagnosis: r2.ok
              ? `Chave de API aceita com sucesso (HTTP ${r2.status}). Total de instâncias no servidor: ${Array.isArray(d2) ? d2.length : "N/D"}.${
                  instanceExistsInList
                    ? ` A instância "${trimmedInstance}" consta na listagem!`
                    : ` A instância "${trimmedInstance}" NÃO consta na listagem!`
                }`
              : r2.status === 401 || r2.status === 403
              ? "Chave API não autorizada (HTTP 401/403). A chave informada não confere com AUTHENTICATION_API_KEY no Railway."
              : `Erro na autenticação: HTTP ${r2.status}`,
            recommendation: r2.ok
              ? instanceExistsInList
                ? "Autenticação e instância confirmadas no servidor."
                : `A chave está certa, mas a instância "${trimmedInstance}" precisa ser criada.`
              : "Verifique a variável AUTHENTICATION_API_KEY no Railway e certifique-se de salvar no painel.",
          });
        } catch (err: any) {
          steps.push({
            stepId: "step-2-auth",
            name: "2. Validação da Chave Global (API Key)",
            category: "auth",
            status: "error",
            durationMs: Date.now() - t2Start,
            httpMethod: "GET",
            endpoint: `${cleanUrl}/instance/fetchInstances`,
            requestHeaders: maskedHeaders,
            responseStatus: 0,
            responseBody: { error: err.message },
            diagnosis: `Erro ao testar autenticação: ${err.message}`,
            recommendation: "Verifique a conectividade de rede com a Evolution API.",
          });
        }
      }

      // STEP 3: Instance State (GET /instance/connectionState/:instance)
      const t3Start = Date.now();
      let instanceFound = false;
      let currentState = "unknown";
      try {
        const r3 = await fetch(
          `${cleanUrl}/instance/connectionState/${encodeURIComponent(trimmedInstance)}`,
          { method: "GET", headers }
        );
        const d3 = await r3.json().catch(() => ({}));
        instanceFound = r3.ok;
        if (r3.ok) {
          currentState = d3?.instance?.state || d3?.state || (d3?.status === "open" ? "open" : "connecting");
        }
        steps.push({
          stepId: "step-3-instance-state",
          name: `3. Estado da Instância "${trimmedInstance}"`,
          category: "instance",
          status: r3.ok ? (currentState === "open" ? "success" : "warning") : "error",
          durationMs: Date.now() - t3Start,
          httpMethod: "GET",
          endpoint: `${cleanUrl}/instance/connectionState/${encodeURIComponent(trimmedInstance)}`,
          requestHeaders: maskedHeaders,
          responseStatus: r3.status,
          responseStatusText: r3.statusText,
          responseBody: d3,
          diagnosis: r3.ok
            ? `Instância encontrada no servidor. Estado de conexão Baileys: "${currentState}".`
            : r3.status === 404
            ? `A instância "${trimmedInstance}" NÃO EXISTE na Evolution API (HTTP 404). Por este motivo, qualquer chamada subsequente a /webhook/set/${trimmedInstance} ou /instance/connect/${trimmedInstance} falha com erro Not Found.`
            : `Erro ao consultar instância: HTTP ${r3.status}`,
          recommendation: r3.ok
            ? currentState === "open"
              ? "Instância já conectada e pronta para envio e recebimento de mensagens."
              : "Instância criada, aguardando conexão via QR Code ou leitura do Baileys."
            : `É indispensável criar a instância antes. Clique no botão "Criar Instância Agora" no painel.`,
        });
      } catch (err: any) {
        steps.push({
          stepId: "step-3-instance-state",
          name: `3. Estado da Instância "${trimmedInstance}"`,
          category: "instance",
          status: "error",
          durationMs: Date.now() - t3Start,
          httpMethod: "GET",
          endpoint: `${cleanUrl}/instance/connectionState/${encodeURIComponent(trimmedInstance)}`,
          requestHeaders: maskedHeaders,
          responseStatus: 0,
          responseBody: { error: err.message },
          diagnosis: `Erro na consulta da instância: ${err.message}`,
        });
      }

      // STEP 4: Detailed Test of /webhook/set/:instance
      const t4Start = Date.now();
      const targetWebhookUrl = webhookUrl || `${req.protocol}://${req.get("host")}/api/whatsapp/webhook`;
      const webhookPayload = {
        webhook: {
          enabled: true,
          url: targetWebhookUrl,
          byEvents: false,
          events: [
            "APPLICATION_STARTUP",
            "QRCODE_UPDATED",
            "CONNECTION_UPDATE",
            "MESSAGES_UPSERT",
            "MESSAGES_UPDATE",
            "SEND_MESSAGE",
          ],
        },
      };

      try {
        const r4 = await fetch(
          `${cleanUrl}/webhook/set/${encodeURIComponent(trimmedInstance)}`,
          {
            method: "POST",
            headers,
            body: JSON.stringify(webhookPayload),
          }
        );
        const d4 = await r4.json().catch(() => ({}));
        const is404 = r4.status === 404;
        steps.push({
          stepId: "step-4-webhook-set",
          name: `4. Teste Direto do Endpoint /webhook/set/${trimmedInstance}`,
          category: "webhook",
          status: r4.ok ? "success" : "error",
          durationMs: Date.now() - t4Start,
          httpMethod: "POST",
          endpoint: `${cleanUrl}/webhook/set/${encodeURIComponent(trimmedInstance)}`,
          requestHeaders: maskedHeaders,
          requestBody: webhookPayload,
          responseStatus: r4.status,
          responseStatusText: r4.statusText,
          responseBody: d4,
          diagnosis: r4.ok
            ? `Webhook registrado com sucesso para a URL: ${targetWebhookUrl}.`
            : is404
            ? `MOTIVO DO ERRO: O endpoint /webhook/set/${trimmedInstance} retornou HTTP 404 com a mensagem: "${
                d4?.response?.message?.[0] || d4?.message || "The instance does not exist"
              }". A Evolution API exige que a instância já exista no banco de dados antes de registrar webhooks.`
            : `Erro no registro do webhook: HTTP ${r4.status}`,
          recommendation: r4.ok
            ? "ESCLARECIMENTO TÉCNICO: O endpoint /webhook/set/ cadastra a rota de eventos (como QRCODE_UPDATED e MESSAGES_UPSERT). Ele NÃO retorna a imagem do QR Code em sua resposta HTTP. Para obter a imagem do QR Code diretamente, chame o passo 5 (/instance/connect)."
            : `Crie a instância "${trimmedInstance}" primeiro para que a Evolution API aceite cadastrar o webhook.`,
        });
      } catch (err: any) {
        steps.push({
          stepId: "step-4-webhook-set",
          name: `4. Teste Direto do Endpoint /webhook/set/${trimmedInstance}`,
          category: "webhook",
          status: "error",
          durationMs: Date.now() - t4Start,
          httpMethod: "POST",
          endpoint: `${cleanUrl}/webhook/set/${encodeURIComponent(trimmedInstance)}`,
          requestHeaders: maskedHeaders,
          requestBody: webhookPayload,
          responseStatus: 0,
          responseBody: { error: err.message },
          diagnosis: `Erro de rede ao chamar /webhook/set: ${err.message}`,
        });
      }

      // STEP 5: Test QR Code Generation Endpoint (/instance/connect/:instance)
      const t5Start = Date.now();
      let capturedQrCode: string | null = null;
      let capturedPairingCode: string | null = null;
      try {
        const r5 = await fetch(
          `${cleanUrl}/instance/connect/${encodeURIComponent(trimmedInstance)}`,
          { method: "GET", headers }
        );
        const d5 = await r5.json().catch(() => ({}));
        capturedQrCode =
          d5?.base64 ||
          d5?.qrcode?.base64 ||
          (typeof d5?.code === "string" && d5?.code.startsWith("data:image") ? d5.code : null);
        capturedPairingCode = d5?.pairingCode || d5?.qrcode?.pairingCode || d5?.code || null;

        steps.push({
          stepId: "step-5-qrcode-connect",
          name: `5. Teste de Geração de QR Code (/instance/connect/${trimmedInstance})`,
          category: "qrcode",
          status: r5.ok ? (capturedQrCode ? "success" : "warning") : "error",
          durationMs: Date.now() - t5Start,
          httpMethod: "GET",
          endpoint: `${cleanUrl}/instance/connect/${encodeURIComponent(trimmedInstance)}`,
          requestHeaders: maskedHeaders,
          responseStatus: r5.status,
          responseStatusText: r5.statusText,
          responseBody: capturedQrCode ? { ...d5, base64: "[BASE64_IMAGE_DATA_PRESENT]" } : d5,
          hasQrCode: !!capturedQrCode,
          qrCodePreview: capturedQrCode,
          pairingCode: capturedPairingCode,
          diagnosis: r5.ok
            ? capturedQrCode
              ? "QR Code retornado com sucesso em formato Base64! Pronto para exibição e escaneamento."
              : d5?.status === "open" || currentState === "open"
              ? "WhatsApp já está conectado (status: 'open'). Não é necessário gerar novo QR Code."
              : "Conexão iniciada na Evolution API. O Baileys está inicializando o socket para gerar o QR Code."
            : r5.status === 404
            ? `Instância "${trimmedInstance}" não existe para conexão (HTTP 404). Crie a instância primeiro.`
            : `Erro ao solicitar QR Code: HTTP ${r5.status}`,
          recommendation: capturedQrCode
            ? "O QR Code foi gerado com sucesso e pode ser escaneado agora no WhatsApp pelo seu celular."
            : "Se a instância foi recém-criada, aguarde 2 segundos para o Baileys estabilizar a sessão do WhatsApp.",
        });
      } catch (err: any) {
        steps.push({
          stepId: "step-5-qrcode-connect",
          name: `5. Teste de Geração de QR Code (/instance/connect/${trimmedInstance})`,
          category: "qrcode",
          status: "error",
          durationMs: Date.now() - t5Start,
          httpMethod: "GET",
          endpoint: `${cleanUrl}/instance/connect/${encodeURIComponent(trimmedInstance)}`,
          requestHeaders: maskedHeaders,
          responseStatus: 0,
          responseBody: { error: err.message },
          diagnosis: `Erro de rede ao conectar: ${err.message}`,
        });
      }

      // STEP 6: Local Webhook Ingress Health
      const localEventsCount = recentWebhookEvents.length;
      const recentQrEvents = recentWebhookEvents.filter((e) =>
        e.event.toLowerCase().includes("qrcode")
      );
      steps.push({
        stepId: "step-6-local-webhook",
        name: "6. Receptor Interno de Webhook do Sistema",
        category: "local_webhook",
        status: "success",
        durationMs: 1,
        httpMethod: "LOCAL",
        endpoint: "/api/whatsapp/webhook",
        diagnosis: `Receptor do AcolheMente ativo na rota /api/whatsapp/webhook. Total de eventos em memória: ${localEventsCount}. Eventos de QR Code capturados: ${recentQrEvents.length}.`,
        recommendation:
          "Assim que a Evolution API dispara eventos (como QRCODE_UPDATED ou MESSAGES_UPSERT), o servidor os processa em tempo real.",
      });

      // Overall Diagnostic Summary
      const hasAuthError = steps.some((s) => s.category === "auth" && s.status === "error");
      const has404Instance = steps.some(
        (s) => (s.category === "instance" || s.category === "webhook") && s.responseStatus === 404
      );
      const isReadyToConnect = authOk && !hasAuthError;

      return res.json({
        success: true,
        timestamp: new Date().toISOString(),
        configSummary: {
          apiUrl: cleanUrl,
          instanceName: trimmedInstance,
          maskedApiKey: maskedKey,
          webhookUrl: targetWebhookUrl,
        },
        hasAuthError,
        has404Instance,
        isReadyToConnect,
        capturedQrCode,
        capturedPairingCode,
        summary: hasAuthError
          ? "Falha de Autenticação: A Chave API está incorreta ou contém a fórmula ${{secret...}}."
          : has404Instance
          ? `Instância Não Criada: O endpoint /webhook/set/${trimmedInstance} falhou com 404 porque a instância "${trimmedInstance}" precisa ser criada antes na Evolution API.`
          : capturedQrCode
          ? "Diagnóstico Concluído com Sucesso: QR Code gerado e disponível para escaneamento!"
          : "Diagnóstico Concluído: Todos os endpoints foram testados e estão operacionais.",
        steps,
      });
    } catch (err: any) {
      console.error("[Evolution Diagnose Error]", err);
      return res.json({
        success: false,
        error: err?.message || "Erro inesperado ao executar diagnóstico da Evolution API.",
      });
    }
  });

  // 7.6. Evolution API: Explicit Instance Creation Endpoint
  app.post("/api/whatsapp/evolution/create-instance", async (req, res) => {
    try {
      const { apiUrl, apiKey, instanceName, webhookUrl } = req.body;
      if (!apiUrl) {
        return res.json({
          success: false,
          error: "URL da Evolution API é obrigatória.",
        });
      }

      if (isRailwayFormula(apiKey)) {
        return res.json({
          success: false,
          error:
            "A Chave API informada é a fórmula do Railway (${{secret...}}). Copie o valor real gerado na aba Variables do Railway.",
        });
      }

      const cleanUrl = normalizeApiUrl(apiUrl);
      const headers = getEvolutionHeaders(apiKey);
      const trimmedInstance = (instanceName || "acolhemente").trim();
      const targetWebhook =
        webhookUrl || `${req.protocol}://${req.get("host")}/api/whatsapp/webhook`;

      console.log(
        `[Evolution Explicit Create] Creating instance "${trimmedInstance}" on ${cleanUrl}`
      );

      const createRes = await fetch(`${cleanUrl}/instance/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          instanceName: trimmedInstance,
          token: apiKey ? apiKey.trim() : "acolhemente-token",
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
          webhook: targetWebhook,
          webhook_by_events: false,
          events: [
            "APPLICATION_STARTUP",
            "QRCODE_UPDATED",
            "CONNECTION_UPDATE",
            "MESSAGES_UPSERT",
            "MESSAGES_UPDATE",
            "SEND_MESSAGE",
          ],
        }),
      });

      let resData: any = null;
      try {
        resData = await createRes.json();
      } catch {
        resData = await createRes.text();
      }

      if (!createRes.ok) {
        const errorMsg =
          typeof resData === "object"
            ? (Array.isArray(resData?.response?.message)
                ? resData.response.message.join(", ")
                : resData?.response?.message) ||
              resData?.message ||
              resData?.error ||
              "Erro ao criar instância na Evolution API"
            : resData;

        return res.json({
          success: false,
          status: createRes.status,
          error: errorMsg,
          data: resData,
        });
      }

      // Check if QR code came in the creation response
      const base64 =
        resData?.qrcode?.base64 ||
        resData?.base64 ||
        (typeof resData?.code === "string" && resData?.code.startsWith("data:image")
          ? resData.code
          : null);
      const pairingCode = resData?.qrcode?.pairingCode || resData?.pairingCode || null;

      return res.json({
        success: true,
        message: `Instância "${trimmedInstance}" criada com sucesso na Evolution API!`,
        base64,
        pairingCode,
        data: resData,
      });
    } catch (err: any) {
      console.error("[Evolution Explicit Create Error]", err);
      return res.json({
        success: false,
        error: err?.message || "Falha de rede ao criar instância na Evolution API.",
      });
    }
  });

  // 8. Evolution API: Send Message
  app.post("/api/whatsapp/evolution/send-message", async (req, res) => {
    try {
      const { apiUrl, apiKey, instanceName, number, text } = req.body;
      if (!apiUrl || !instanceName || !number || !text) {
        return res.json({
          success: false,
          error:
            "Dados incompletos: informe URL, Instância, Número de Destino e Mensagem.",
        });
      }

      if (isRailwayFormula(apiKey)) {
        return res.json({
          success: false,
          error:
            "A Chave API informada é a fórmula do Railway (${{secret...}}). Copie o valor real gerado na aba Variables do Railway.",
        });
      }

      const digitsOnly = String(number).replace(/\D/g, "");
      if (digitsOnly.length < 10) {
        return res.json({
          success: false,
          error: `Número de telefone inválido: "${number}". Deve conter pelo menos DDD e número.`,
        });
      }

      const formattedNumber =
        digitsOnly.length <= 11 && !digitsOnly.startsWith("55")
          ? `55${digitsOnly}`
          : digitsOnly;

      const cleanUrl = normalizeApiUrl(apiUrl);
      const headers = getEvolutionHeaders(apiKey);
      const trimmedInstance = instanceName.trim();

      console.log(
        `[Evolution Send] Sending WhatsApp to ${formattedNumber} via ${trimmedInstance}`
      );

      const evoRes = await fetch(
        `${cleanUrl}/message/sendText/${encodeURIComponent(trimmedInstance)}`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            number: formattedNumber,
            text: String(text).trim(),
            delay: 1200,
          }),
        }
      );

      let resData: any = null;
      try {
        resData = await evoRes.json();
      } catch {
        resData = await evoRes.text();
      }

      if (!evoRes.ok) {
        return res.json({
          success: false,
          status: evoRes.status,
          error:
            typeof resData === "object"
              ? (Array.isArray(resData?.response?.message)
                  ? resData.response.message.join(", ")
                  : resData?.response?.message) ||
                resData?.message ||
                resData?.error ||
                "Falha ao enviar mensagem no WhatsApp"
              : resData,
          data: resData,
        });
      }

      return res.json({
        success: true,
        formattedNumber,
        data: resData,
      });
    } catch (err: any) {
      console.error("[Evolution Send Message Error]", err);
      return res.json({
        success: false,
        error:
          err?.message ||
          "Erro ao conectar com a Evolution API para envio da mensagem.",
      });
    }
  });

  // 9. Evolution API: Logout / Disconnect
  app.post("/api/whatsapp/evolution/logout", async (req, res) => {
    try {
      const { apiUrl, apiKey, instanceName } = req.body;
      if (!apiUrl || !instanceName) {
        return res.json({
          success: false,
          error: "URL da Evolution API e Nome da Instância são obrigatórios.",
        });
      }

      const cleanUrl = normalizeApiUrl(apiUrl);
      const headers = getEvolutionHeaders(apiKey);
      const trimmedInstance = instanceName.trim();

      const evoRes = await fetch(
        `${cleanUrl}/instance/logout/${encodeURIComponent(trimmedInstance)}`,
        {
          method: "DELETE",
          headers,
        }
      );

      let resData: any = null;
      try {
        resData = await evoRes.json();
      } catch {
        resData = await evoRes.text();
      }

      return res.json({
        success: true,
        data: resData,
      });
    } catch (err: any) {
      console.error("[Evolution Logout Error]", err);
      return res.json({
        success: false,
        error:
          err?.message || "Erro ao desconectar instância na Evolution API.",
      });
    }
  });

  // Guaranteed JSON response for unhandled /api/* routes (prevents returning SPA index.html to API fetch calls)
  app.all("/api/*", (req, res) => {
    res.json({
      success: false,
      error: `Endpoint da API não encontrado: ${req.method} ${req.path}`,
    });
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
