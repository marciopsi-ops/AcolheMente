import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface WebhookEventPayload {
  event: 
    | "novo_profissional"
    | "novo_acolhimento"
    | "nova_empresa"
    | "inscricao_evento_servico"
    | "pagamento_profissional"
    | "status_lead_alterado"
    | "proposta_aceita"
    | "proposta_revisao"
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
export async function sendWebhookNotification(payload: WebhookEventPayload) {
  try {
    const snap = await getDoc(doc(db, "configuracoes", "master"));
    if (!snap.exists()) return;
    const config = snap.data();

    // Check if webhook integrations are active and configured
    if (!config.webhookEmailEnabled || !config.webhookEmailUrl) {
      console.log(`[WebhookNotifier] Webhook is disabled or URL is missing for event "${payload.event}".`);
      return;
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

    if (config.webhookEmailSecret) {
      headers["X-Webhook-Secret"] = config.webhookEmailSecret;
      headers["Authorization"] = `Bearer ${config.webhookEmailSecret}`;
    }

    const requestBody = {
      ...payload,
      timestamp: new Date().toISOString(),
      platform: "Projeto AcolheMente Saúde",
      environment: process.env.NODE_ENV || "production",
    };

    console.log(`[WebhookNotifier] Dispatching webhook payload for "${payload.event}" to ${config.webhookEmailUrl}`);

    // Non-blocking fetch dispatch
    fetch(config.webhookEmailUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    })
      .then(async (res) => {
        if (!res.ok) {
          console.warn(`[WebhookNotifier] Webhook returned status ${res.status} ${res.statusText}`);
        } else {
          console.log(`[WebhookNotifier] Webhook delivered successfully (${res.status})`);
        }
      })
      .catch((err) => {
        console.error("[WebhookNotifier] Network error sending webhook:", err);
      });
  } catch (error) {
    console.error("[WebhookNotifier] Error loading webhook configurations:", error);
  }
}
