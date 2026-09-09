import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface WebhookEventPayload {
  event: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  title?: string;
  message?: string;
  data?: Record<string, any>;
}

export interface WebhookSendResult {
  success: boolean;
  status?: number;
  messageId?: string;
  error?: string;
  data?: any;
}

/**
 * Dispatches automated transactional notification payloads to Brevo or external webhooks
 * (such as Brevo SMTP API, Make, N8n, Zapier, or custom HTTP endpoints).
 */
export async function sendWebhookNotification(
  payload: WebhookEventPayload,
  overrideConfig?: {
    webhookEmailEnabled?: boolean;
    webhookEmailUrl?: string;
    webhookEmailSecret?: string;
    webhookEmailSender?: string;
    emailSuporte?: string;
  }
): Promise<WebhookSendResult> {
  try {
    let dbConfig: any = {};
    try {
      const snap = await getDoc(doc(db, "configuracoes", "master"));
      if (snap.exists()) {
        dbConfig = snap.data();
      }
    } catch (dbErr) {
      console.warn("[WebhookNotifier] Could not fetch configuracoes/master doc, proceeding with overrideConfig if provided.", dbErr);
    }

    const config = { ...dbConfig, ...overrideConfig };

    // Auto-detect Brevo URL if secret (API key) is provided but URL was left blank
    if (!config.webhookEmailUrl && config.webhookEmailSecret) {
      config.webhookEmailUrl = "https://api.brevo.com/v3/smtp/email";
    }

    // If enabled is not explicitly set, enable if URL or secret exists
    if (config.webhookEmailEnabled === undefined && (config.webhookEmailUrl || config.webhookEmailSecret)) {
      config.webhookEmailEnabled = true;
    }

    // For test events, force enabled
    if (payload.event === "teste_webhook") {
      config.webhookEmailEnabled = true;
    }

    // Check if webhook / email integration is active and configured
    if (!config.webhookEmailEnabled || !config.webhookEmailUrl) {
      console.log(`[WebhookNotifier] Webhook / Brevo is disabled or URL is missing for event "${payload.event}".`);
      return {
        success: false,
        error: "Envio por e-mail desativado ou URL/Chave do Brevo não configurada no Painel Master."
      };
    }

    const targetUrl = config.webhookEmailUrl.trim();
    const isBrevoApi = targetUrl.includes("api.brevo.com");

    const senderEmail = (config.webhookEmailSender || config.emailSuporte || "contato@proacolhemente.com.br").trim();
    const senderName = "Projeto AcolheMente Saúde";
    const recipientEmail = (payload.recipientEmail || senderEmail).trim();
    const recipientName = (payload.recipientName || recipientEmail).trim();

    // Prepare complete rich HTML body
    const rawHtml = payload.data?.htmlContent || `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 20px 14px; color: #1e352f; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e352f; font-size: 14px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; margin: 0 0 12px 0; line-height: 1.3; white-space: nowrap !important; word-break: keep-all !important; overflow-wrap: normal !important; hyphens: none !important; -webkit-hyphens: none !important;">${payload.title || "AcolheMente Saúde"}</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #2e443e;">${(payload.message || "").replace(/\n/g, "<br>")}</p>
        <hr style="border: none; border-top: 1px solid #e2ded5; margin: 20px 0;" />
        <p style="font-size: 11px; color: #737c76; margin: 0; white-space: nowrap !important; word-break: keep-all !important;">Projeto AcolheMente Saúde • Notificação Automática</p>
      </div>
    `;

    const htmlBody = rawHtml.replace(
      /AcolheMente/g,
      '<span style="white-space: nowrap !important; word-break: keep-all !important; overflow-wrap: normal !important; hyphens: none !important; -webkit-hyphens: none !important; display: inline-block;">AcolheMente</span>'
    );

    let requestBody: any;

    if (isBrevoApi) {
      // Brevo v3 SMTP Email Schema (Standard API)
      requestBody = {
        sender: { name: senderName, email: senderEmail },
        to: [{ email: recipientEmail, name: recipientName }],
        subject: payload.title || "Notificação AcolheMente",
        htmlContent: htmlBody,
        textContent: payload.message || payload.title || "",
        tags: [payload.event || "notificacao"],
      };
    } else {
      // Generic Webhook / Inbound Webhook Schema
      requestBody = {
        event: payload.event,
        recipientEmail,
        recipientName,
        title: payload.title,
        message: payload.message,
        sender: { name: senderName, email: senderEmail },
        to: [{ email: recipientEmail, name: recipientName }],
        subject: payload.title || "Notificação AcolheMente",
        htmlContent: htmlBody,
        textContent: payload.message || payload.title || "",
        tags: [payload.event || "notificacao"],
        timestamp: new Date().toISOString(),
        platform: "Projeto AcolheMente Saúde",
        data: payload.data || {},
      };
    }

    console.log(`[WebhookNotifier] Dispatching ${isBrevoApi ? 'Brevo Direct Email' : 'Webhook payload'} for "${payload.event}" to ${targetUrl} (Sender: ${senderEmail}, Recipient: ${recipientEmail})`);

    // First try the server-side proxy endpoint (/api/send-email) to bypass browser CORS & hide secrets
    try {
      const proxyRes = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey: config.webhookEmailSecret,
          url: targetUrl,
          payload: requestBody,
        }),
      });

      let resData: any = null;
      try {
        resData = await proxyRes.json();
      } catch (e) {
        resData = await proxyRes.text().catch(() => null);
      }

      if (!proxyRes.ok || (resData && resData.success === false)) {
        const errorMsg = resData?.error || resData?.message || `HTTP ${proxyRes.status}`;
        console.warn(`[WebhookNotifier] Server email proxy returned status ${proxyRes.status}:`, errorMsg);
        return {
          success: false,
          status: proxyRes.status,
          error: errorMsg,
          data: resData
        };
      }

      console.log(`[WebhookNotifier] Brevo/Webhook delivered successfully (${proxyRes.status}):`, resData);
      return {
        success: true,
        status: proxyRes.status,
        messageId: resData?.data?.messageId || resData?.messageId,
        data: resData
      };
    } catch (proxyErr: any) {
      console.warn("[WebhookNotifier] Server proxy fetch error, attempting direct client fetch as fallback...", proxyErr);

      // Direct client fallback (if backend unreachable)
      try {
        const directHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          "accept": "application/json",
        };
        if (config.webhookEmailSecret) {
          directHeaders["api-key"] = config.webhookEmailSecret.trim();
          directHeaders["Authorization"] = `Bearer ${config.webhookEmailSecret.trim()}`;
        }

        const res = await fetch(targetUrl, {
          method: "POST",
          headers: directHeaders,
          body: JSON.stringify(requestBody),
        });

        let resData: any = null;
        try {
          resData = await res.json();
        } catch (e) {
          resData = await res.text().catch(() => null);
        }

        if (!res.ok) {
          console.warn(`[WebhookNotifier] Direct request returned status ${res.status} ${res.statusText}`, resData);
          return {
            success: false,
            status: res.status,
            error: resData?.message || resData?.error || `HTTP ${res.status} ${res.statusText}`,
            data: resData
          };
        } else {
          console.log(`[WebhookNotifier] Direct request delivered successfully (${res.status})`, resData);
          return {
            success: true,
            status: res.status,
            messageId: resData?.messageId,
            data: resData
          };
        }
      } catch (err: any) {
        console.error("[WebhookNotifier] Network error sending webhook directly:", err);
        return {
          success: false,
          error: err?.message || "Erro de rede ao disparar e-mail diretamente."
        };
      }
    }
  } catch (error: any) {
    console.error("[WebhookNotifier] Error loading webhook configurations:", error);
    return {
      success: false,
      error: error?.message || "Erro ao carregar configurações de e-mail."
    };
  }
}
