import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { safeFetchJson } from "./safeFetch";

export { safeFetchJson };

export interface EvolutionConfig {
  whatsappEvolutionEnabled?: boolean;
  whatsappEvolutionUrl?: string;
  whatsappEvolutionApiKey?: string;
  whatsappEvolutionInstance?: string;
  whatsappEvolutionAutoNotif?: boolean;
}

export interface WebhookEventItem {
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

export interface EvolutionStatusResponse {
  success: boolean;
  state: "open" | "connecting" | "close" | "error" | string;
  raw?: any;
  error?: string;
}

export interface EvolutionConnectResponse {
  success: boolean;
  state?: string;
  base64?: string | null;
  pairingCode?: string | null;
  raw?: any;
  error?: string;
}

export interface EvolutionSendResponse {
  success: boolean;
  formattedNumber?: string;
  data?: any;
  error?: string;
}

export function normalizeEvolutionUrl(url?: string): string {
  if (!url) return "";
  let clean = url.trim();
  if (!clean) return "";
  if (!/^https?:\/\//i.test(clean)) {
    clean = `https://${clean}`;
  }
  return clean.replace(/\/+$/, "");
}

/**
 * Loads current Evolution API configuration from Firestore configuracoes/master
 */
export async function getEvolutionConfig(
  override?: EvolutionConfig
): Promise<EvolutionConfig> {
  let dbConfig: any = {};
  try {
    const snap = await getDoc(doc(db, "configuracoes", "master"));
    if (snap.exists()) {
      dbConfig = snap.data();
    }
  } catch (err) {
    console.warn("[WhatsAppService] Could not fetch configuracoes/master:", err);
  }

  return {
    whatsappEvolutionEnabled:
      override?.whatsappEvolutionEnabled ?? dbConfig.whatsappEvolutionEnabled ?? false,
    whatsappEvolutionUrl:
      normalizeEvolutionUrl(override?.whatsappEvolutionUrl ?? dbConfig.whatsappEvolutionUrl ?? ""),
    whatsappEvolutionApiKey:
      (override?.whatsappEvolutionApiKey ?? dbConfig.whatsappEvolutionApiKey ?? "").trim(),
    whatsappEvolutionInstance:
      (override?.whatsappEvolutionInstance ?? dbConfig.whatsappEvolutionInstance ?? "acolhemente").trim(),
    whatsappEvolutionAutoNotif:
      override?.whatsappEvolutionAutoNotif ?? dbConfig.whatsappEvolutionAutoNotif ?? true,
  };
}

/**
 * Checks WhatsApp connection state (open / connecting / close)
 */
export async function checkEvolutionStatus(
  override?: EvolutionConfig
): Promise<EvolutionStatusResponse> {
  const config = await getEvolutionConfig(override);
  if (!config.whatsappEvolutionUrl || !config.whatsappEvolutionInstance) {
    return {
      success: false,
      state: "close",
      error: "URL e Instância da Evolution API não configuradas.",
    };
  }

  const res = await safeFetchJson<EvolutionStatusResponse>("/api/whatsapp/evolution/status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiUrl: config.whatsappEvolutionUrl,
      apiKey: config.whatsappEvolutionApiKey,
      instanceName: config.whatsappEvolutionInstance,
    }),
  });

  if (!res.ok || !res.data) {
    return {
      success: false,
      state: "close",
      error: res.error || "Falha na requisição de status da Evolution API.",
    };
  }

  return res.data;
}

/**
 * Generates or fetches current QR Code / Pairing Code for WhatsApp connection
 */
export async function connectEvolutionInstance(
  override?: EvolutionConfig,
  webhookUrl?: string
): Promise<EvolutionConnectResponse> {
  const config = await getEvolutionConfig(override);
  if (!config.whatsappEvolutionUrl || !config.whatsappEvolutionInstance) {
    return {
      success: false,
      error: "Preencha a URL e a Instância da Evolution API.",
    };
  }

  const res = await safeFetchJson<EvolutionConnectResponse>("/api/whatsapp/evolution/connect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiUrl: config.whatsappEvolutionUrl,
      apiKey: config.whatsappEvolutionApiKey,
      instanceName: config.whatsappEvolutionInstance,
      webhookUrl:
        webhookUrl ||
        (typeof window !== "undefined"
          ? `${window.location.origin}/api/whatsapp/webhook`
          : undefined),
    }),
  });

  if (!res.ok || !res.data) {
    return {
      success: false,
      error: res.error || "Falha ao solicitar conexão QR Code na Evolution API.",
    };
  }

  return res.data;
}

/**
 * Automatically configures the webhook on the Evolution API instance
 */
export async function configureEvolutionWebhook(
  webhookUrl?: string,
  override?: EvolutionConfig
): Promise<{ success: boolean; message?: string; error?: string }> {
  const config = await getEvolutionConfig(override);
  const targetWebhook =
    webhookUrl ||
    (typeof window !== "undefined" ? `${window.location.origin}/api/whatsapp/webhook` : "");

  if (!config.whatsappEvolutionUrl || !config.whatsappEvolutionInstance || !targetWebhook) {
    return {
      success: false,
      error: "Dados insuficientes para configuração do webhook.",
    };
  }

  const res = await safeFetchJson<{ success: boolean; message?: string; error?: string }>(
    "/api/whatsapp/evolution/set-webhook",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiUrl: config.whatsappEvolutionUrl,
        apiKey: config.whatsappEvolutionApiKey,
        instanceName: config.whatsappEvolutionInstance,
        webhookUrl: targetWebhook,
      }),
    }
  );

  if (!res.ok || !res.data) {
    return {
      success: false,
      error: res.error || "Falha ao registrar webhook na Evolution API.",
    };
  }

  return res.data;
}

/**
 * Dispatches a WhatsApp text message through Evolution API
 */
export async function sendEvolutionMessage(
  number: string,
  text: string,
  override?: EvolutionConfig
): Promise<EvolutionSendResponse> {
  const config = await getEvolutionConfig(override);
  if (!config.whatsappEvolutionUrl || !config.whatsappEvolutionInstance) {
    return {
      success: false,
      error: "Evolution API não configurada.",
    };
  }

  const res = await safeFetchJson<EvolutionSendResponse>("/api/whatsapp/evolution/send-message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiUrl: config.whatsappEvolutionUrl,
      apiKey: config.whatsappEvolutionApiKey,
      instanceName: config.whatsappEvolutionInstance,
      number,
      text,
    }),
  });

  if (!res.ok || !res.data) {
    return {
      success: false,
      error: res.error || "Falha de rede ao disparar WhatsApp.",
    };
  }

  return res.data;
}

/**
 * Logs out / disconnects instance
 */
export async function disconnectEvolutionInstance(
  override?: EvolutionConfig
): Promise<{ success: boolean; error?: string }> {
  const config = await getEvolutionConfig(override);
  if (!config.whatsappEvolutionUrl || !config.whatsappEvolutionInstance) {
    return { success: false, error: "Dados da instância ausentes." };
  }

  const res = await safeFetchJson<{ success: boolean; error?: string }>(
    "/api/whatsapp/evolution/logout",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiUrl: config.whatsappEvolutionUrl,
        apiKey: config.whatsappEvolutionApiKey,
        instanceName: config.whatsappEvolutionInstance,
      }),
    }
  );

  if (!res.ok || !res.data) {
    return {
      success: false,
      error: res.error || "Falha ao desconectar instância na Evolution API.",
    };
  }

  return res.data;
}

/**
 * Fetches recent events received by our webhook
 */
export async function fetchRecentWebhookEvents(): Promise<{
  success: boolean;
  events: WebhookEventItem[];
  count: number;
}> {
  try {
    const res = await safeFetchJson<{
      success: boolean;
      events: WebhookEventItem[];
      count: number;
    }>("/api/whatsapp/webhook/events");

    if (!res.ok || !res.data) {
      return { success: false, events: [], count: 0 };
    }

    return res.data;
  } catch (err) {
    console.error("[WhatsAppService] Error fetching webhook events:", err);
    return { success: false, events: [], count: 0 };
  }
}

/**
 * Clears webhook logs buffer
 */
export async function clearRecentWebhookEvents(): Promise<boolean> {
  try {
    const res = await safeFetchJson<{ success: boolean }>("/api/whatsapp/webhook/clear", {
      method: "POST",
    });
    return !!res.data?.success;
  } catch (err) {
    console.error("[WhatsAppService] Error clearing webhook events:", err);
    return false;
  }
}
