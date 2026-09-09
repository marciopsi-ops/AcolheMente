export type NotificationAudience =
  | "paciente"
  | "profissional"
  | "empresa"
  | "equipe"
  | "personalizado";

export type NotificationTimingType = "immediate" | "delay";

export interface NotificationTiming {
  type: NotificationTimingType;
  delayMinutes: number; // 0 = imediato, 5 = 5 min, 60 = 1h, 1440 = 24h, etc.
}

export interface NotificationChannelEmail {
  enabled: boolean;
  subject: string;
  bodyHtml: string;
}

export interface NotificationChannelWhatsapp {
  enabled: boolean;
  messageText: string;
}

export interface NotificationTrigger {
  id: string; // Identificador único: 'novo_paciente', 'envio_proposta', ou 'custom_...'
  nome: string; // Nome legível
  descricao: string; // Explicação de quando dispara
  categoria: NotificationAudience;
  isCustom?: boolean; // Se foi criado pelo usuário (pode ser excluído)
  active: boolean; // Chave geral do gatilho
  timing: NotificationTiming;
  email: NotificationChannelEmail;
  whatsapp: NotificationChannelWhatsapp;
  createdAt?: string;
  updatedAt?: string;
}

export interface QueuedNotification {
  id?: string;
  triggerId: string;
  triggerName: string;
  channel: "email" | "whatsapp" | "ambos";
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  subject?: string;
  emailBody?: string;
  whatsappText?: string;
  scheduledFor: string; // ISO String
  status: "pendente" | "enviado" | "erro" | "cancelado";
  executedAt?: string;
  error?: string;
  createdAt: string;
}

export interface NotificationVariableInfo {
  tag: string;
  label: string;
  example: string;
}

export const NOTIFICATION_AVAILABLE_VARIABLES: NotificationVariableInfo[] = [
  { tag: "{nome}", label: "Nome Completo", example: "Mariana da Silva" },
  { tag: "{primeiro_nome}", label: "Primeiro Nome", example: "Mariana" },
  { tag: "{email}", label: "E-mail", example: "mariana@exemplo.com" },
  { tag: "{telefone}", label: "Telefone / WhatsApp", example: "(11) 98765-4321" },
  { tag: "{profissional}", label: "Nome do Psicólogo", example: "Dr(a). Carlos Mendes" },
  { tag: "{valor_sessao}", label: "Valor Social por Sessão", example: "R$ 60,00" },
  { tag: "{frequencia}", label: "Frequência das Sessões", example: "Semanal" },
  { tag: "{link_proposta}", label: "Link da Proposta", example: "https://acolhemente.com.br/?view=proposta&id=123" },
  { tag: "{link_pagamento}", label: "Link do Pagamento / Stripe", example: "https://buy.stripe.com/acolhemente" },
  { tag: "{empresa}", label: "Nome da Empresa", example: "Tech Inovação S.A." },
  { tag: "{data}", label: "Data Atual", example: new Date().toLocaleDateString("pt-BR") },
  { tag: "{plataforma}", label: "Nome da Plataforma", example: "Projeto AcolheMente Saúde" },
];
