import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface WebhookEventPayload {
  event: 
    | "novo_profissional"
    | "novo_acolhimento"
    | "novo_paciente_manual"
    | "nova_empresa"
    | "inscricao_evento_servico"
    | "pagamento_profissional"
    | "status_lead_alterado"
    | "proposta_aceita"
    | "proposta_revisao"
    | "atribuicao_paciente_resumo"
    | "notificacao_resumo_caso"
    | "teste_webhook";
  recipientEmail?: string;
  recipientName?: string;
  title?: string;
  message?: string;
  data?: Record<string, any>;
}

/**
 * Dispatches automated transactional notification payloads to external webhooks
 * (such as Brevo, Make, N8n, Zapier, Resend or custom HTTP endpoints).
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
) {
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

    // For test events or when URL is provided directly, allow sending
    if (payload.event === "teste_webhook") {
      config.webhookEmailEnabled = true;
    }

    // Check if webhook integrations are active and configured
    if (!config.webhookEmailEnabled || !config.webhookEmailUrl) {
      console.log(`[WebhookNotifier] Webhook is disabled or URL is missing for event "${payload.event}".`);
      return {
        success: false,
        error: "Integração desativada ou URL de destino não informada."
      };
    }

    // Check if specific event is enabled (if configured in options array)
    if (config.webhookEmailEvents && Array.isArray(config.webhookEmailEvents) && config.webhookEmailEvents.length > 0) {
      if (!config.webhookEmailEvents.includes(payload.event) && payload.event !== "teste_webhook") {
        console.log(`[WebhookNotifier] Event "${payload.event}" is not enabled in webhook settings.`);
        return;
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "AcolheMente-Webhook/1.0",
    };

    const isBrevoApi = config.webhookEmailUrl.includes("api.brevo.com");

    const senderEmail = config.webhookEmailSender || config.emailSuporte || "contato@proacolhemente.com.br";
    const senderName = "Projeto AcolheMente Saúde";
    const recipientEmail = payload.recipientEmail || senderEmail;
    const recipientName = payload.recipientName || recipientEmail;

    let requestBody: any;

    if (isBrevoApi) {
      const htmlBody = payload.data?.htmlContent || `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e352f;">
          <h2 style="color: #1e352f;">${payload.title || "AcolheMente Saúde"}</h2>
          <p style="font-size: 15px; line-height: 1.6;">${(payload.message || "").replace(/\n/g, "<br>")}</p>
          <hr style="border: none; border-top: 1px solid #e2ded5; margin: 20px 0;" />
          <p style="font-size: 12px; color: #737c76;">Projeto AcolheMente Saúde • Notificação Automática</p>
        </div>
      `;

      requestBody = {
        sender: { name: senderName, email: senderEmail },
        to: [{ email: recipientEmail, name: recipientName }],
        subject: payload.title || "Notificação AcolheMente",
        htmlContent: htmlBody,
        textContent: payload.message || payload.title || "",
        tags: [payload.event],
      };
    } else {
      requestBody = {
        ...payload,
        timestamp: new Date().toISOString(),
        platform: "Projeto AcolheMente Saúde",
        environment: "production",
      };
    }

    console.log(`[WebhookNotifier] Dispatching ${isBrevoApi ? 'Brevo Direct Email' : 'Webhook payload'} for "${payload.event}" to ${config.webhookEmailUrl} (Sender: ${senderEmail}, Recipient: ${recipientEmail})`);

    // First try the server-side proxy endpoint (/api/send-email) to bypass browser CORS
    try {
      const proxyRes = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey: config.webhookEmailSecret,
          url: config.webhookEmailUrl,
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

      console.log(`[WebhookNotifier] Email proxy delivered successfully (${proxyRes.status}):`, resData);
      return {
        success: true,
        status: proxyRes.status,
        data: resData
      };
    } catch (proxyErr: any) {
      console.warn("[WebhookNotifier] Server proxy fetch error, attempting direct client fetch as fallback...", proxyErr);

      // Direct client fallback
      try {
        const res = await fetch(config.webhookEmailUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody),
        });

        let resData: any = null;
        try {
          resData = await res.json();
        } catch (e) {
          resData = await res.text().catch(() => null);
        }

        if (!res.ok) {
          console.warn(`[WebhookNotifier] Webhook returned status ${res.status} ${res.statusText}`, resData);
          return {
            success: false,
            status: res.status,
            error: resData?.message || resData?.error || `HTTP ${res.status} ${res.statusText}`,
            data: resData
          };
        } else {
          console.log(`[WebhookNotifier] Webhook delivered successfully (${res.status})`, resData);
          return {
            success: true,
            status: res.status,
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
