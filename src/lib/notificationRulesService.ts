import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { triggerEmail } from "./emailService";
import { sendEvolutionMessage } from "./whatsappService";
import {
  NotificationTrigger,
  QueuedNotification,
} from "../types/notificationRules";

export const DEFAULT_NOTIFICATION_TRIGGERS: NotificationTrigger[] = [
  {
    id: "novo_paciente",
    nome: "Boas-vindas ao Paciente (Novo Acolhimento)",
    descricao: "Disparado imediatamente quando um paciente finaliza o preenchimento do formulário de acolhimento (particular ou corporativo).",
    categoria: "paciente",
    isCustom: false,
    active: true,
    timing: { type: "immediate", delayMinutes: 0 },
    email: {
      enabled: true,
      subject: "AcolheMente - Cadastro Recebido com Sucesso!",
      bodyHtml: `
<h3 style="font-family: 'Georgia', serif; font-size: 22px; color: #1e352f; margin-top: 0;">Seja muito bem-vindo(a), {nome}!</h3>
<p>Estamos muito felizes em receber o seu cadastro no <strong>Projeto AcolheMente Saúde</strong>. Este é o primeiro passo em direção à sua jornada de autoconhecimento e cuidado emocional.</p>
<div style="background-color: #fcfbf9; border: 1px solid #ebdcb9; border-radius: 16px; padding: 20px; margin: 25px 0;">
  <h4 style="margin-top: 0; color: #1e352f; font-family: 'Georgia', serif;">Próximos Passos do Acolhimento:</h4>
  <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #2e443e;">
    <li style="margin-bottom: 8px;"><strong>1. Triagem & Análise:</strong> Nossa equipe de psicólogos triadores está avaliando o seu perfil para encontrar o profissional ideal com a abordagem mais adequada para você.</li>
    <li style="margin-bottom: 8px;"><strong>2. Proposta de Atendimento:</strong> Enviaremos por e-mail e WhatsApp uma proposta contendo o valor social enquadrado por sessão e a frequência.</li>
    <li><strong>3. Início das Sessões:</strong> Após o seu aceite, o psicólogo atribuído entrará em contato para agendar o primeiro atendimento.</li>
  </ul>
</div>
<p>Verifique sua caixa de entrada e WhatsApp regularmente. Estamos à disposição para qualquer dúvida!</p>
      `.trim(),
    },
    whatsapp: {
      enabled: true,
      messageText: `Olá, *{primeiro_nome}*! 👋\n\nRecebemos o seu cadastro no *Projeto AcolheMente Saúde* com sucesso.\n\nNossa equipe de triagem já está avaliando o seu caso com muito carinho para encontrar o profissional com a abordagem ideal para você. Em breve, enviaremos por aqui e por e-mail a sua proposta com o valor social da sessão.\n\nQualquer dúvida, estamos por aqui!\n\n_Equipe AcolheMente_ 🌿`.trim(),
    },
  },
  {
    id: "envio_proposta",
    nome: "Envio de Proposta Social de Atendimento",
    descricao: "Disparado quando a equipe de triagem define o psicólogo e encaminha a proposta personalizada para o paciente.",
    categoria: "paciente",
    isCustom: false,
    active: true,
    timing: { type: "immediate", delayMinutes: 0 },
    email: {
      enabled: true,
      subject: "AcolheMente - Sua Proposta de Acolhimento Psicológico Chegou!",
      bodyHtml: `
<h3 style="font-family: 'Georgia', serif; font-size: 22px; color: #1e352f; margin-top: 0;">Olá, {nome}!</h3>
<p>Concluímos a sua triagem clínica com carinho e definimos a melhor proposta de acolhimento para você.</p>
<div style="background-color: #f7f9f7; border: 1px solid #d2e4d6; border-radius: 16px; padding: 20px; margin: 25px 0;">
  <h4 style="margin-top: 0; color: #1e352f; font-family: 'Georgia', serif; font-size: 16px;">Detalhes da sua Proposta:</h4>
  <p style="margin: 4px 0; font-size: 14px;"><strong>Profissional Atribuído:</strong> {profissional}</p>
  <p style="margin: 4px 0; font-size: 14px;"><strong>Valor Social por Sessão:</strong> {valor_sessao}</p>
  <p style="margin: 4px 0; font-size: 14px;"><strong>Frequência Recomendada:</strong> {frequencia}</p>
</div>
<div style="text-align: center; margin: 30px 0;">
  <a href="{link_proposta}" style="background-color: #1e352f; color: #ffffff; padding: 14px 28px; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block;">
    Acessar e Aceitar Minha Proposta
  </a>
</div>
<p style="font-size: 13px; color: #737c76; text-align: center;">
  Se preferir, copie e cole este link no navegador: <br><a href="{link_proposta}" style="color: #1e352f;">{link_proposta}</a>
</p>
      `.trim(),
    },
    whatsapp: {
      enabled: true,
      messageText: `Olá, *{primeiro_nome}*! ✨\n\nA sua proposta de atendimento no *Projeto AcolheMente* está pronta!\n\n📋 *Profissional designado:* {profissional}\n💰 *Valor social por sessão:* {valor_sessao}\n🗓️ *Frequência:* {frequencia}\n\n👉 *Clique no link abaixo para conferir os detalhes e confirmar seu início:*\n{link_proposta}\n\nEstamos prontos para caminhar ao seu lado! 🌿`.trim(),
    },
  },
  {
    id: "proposta_aceita_paciente",
    nome: "Proposta Aceita (Confirmação ao Paciente)",
    descricao: "Disparado para o paciente quando ele aceita a proposta de atendimento na página da proposta.",
    categoria: "paciente",
    isCustom: false,
    active: true,
    timing: { type: "immediate", delayMinutes: 0 },
    email: {
      enabled: true,
      subject: "AcolheMente - Proposta de Atendimento Aceita!",
      bodyHtml: `
<h3 style="font-family: 'Georgia', serif; font-size: 22px; color: #1e352f; margin-top: 0;">Tudo certo, {nome}!</h3>
<p>A sua proposta de atendimento no Projeto AcolheMente Saúde foi aceita com sucesso.</p>
<p>O seu acompanhamento psicológico foi confirmado com o profissional <strong>{profissional}</strong>.</p>
<div style="background-color: #f3f9f6; border: 1px solid #d1ebd8; border-radius: 16px; padding: 20px; margin: 25px 0; font-size: 14px; color: #1b3d2b;">
  <strong>Próximo Passo:</strong><br>
  Fique atento(a) ao seu celular (WhatsApp) e ao seu e-mail. O profissional <strong>{profissional}</strong> fará contato direto com você para realizar o agendamento da sua primeira sessão!
</div>
<p>Estamos muito felizes por você iniciar essa jornada conosco!</p>
      `.trim(),
    },
    whatsapp: {
      enabled: true,
      messageText: `Parabéns, *{primeiro_nome}*! 🎉\n\nSua proposta com o(a) profissional *{profissional}* foi confirmada com sucesso!\n\nEm até 24h a 48h úteis o profissional entrará em contato diretamente com você pelo WhatsApp para combinarem o dia e horário da sua primeira sessão.\n\nSeja muito bem-vindo(a) ao AcolheMente! 🌿`.trim(),
    },
  },
  {
    id: "proposta_aceita_profissional",
    nome: "Proposta Aceita (Alerta ao Psicólogo)",
    descricao: "Disparado para o psicólogo quando o paciente atribuído aceita a proposta de acolhimento.",
    categoria: "profissional",
    isCustom: false,
    active: true,
    timing: { type: "immediate", delayMinutes: 0 },
    email: {
      enabled: true,
      subject: "Novo Paciente Atribuído - Projeto AcolheMente",
      bodyHtml: `
<h3 style="font-family: 'Georgia', serif; font-size: 20px; color: #1e352f; margin-top: 0;">Olá, Dr(a). {profissional}!</h3>
<p>O paciente <strong>{nome}</strong> revisou e <strong>ACEITOU</strong> a proposta de acompanhamento com você no Projeto AcolheMente.</p>
<div style="background-color: #faf9f6; border: 1px solid #e2ded5; border-radius: 16px; padding: 20px; margin: 25px 0;">
  <h4 style="margin-top: 0; color: #1e352f; font-family: 'Georgia', serif; font-size: 16px;">Detalhes do Alinhamento Clínico:</h4>
  <p style="margin: 4px 0; font-size: 14px;"><strong>Paciente:</strong> {nome}</p>
  <p style="margin: 4px 0; font-size: 14px;"><strong>Valor por Sessão:</strong> {valor_sessao}</p>
  <p style="margin: 4px 0; font-size: 14px;"><strong>Frequência:</strong> {frequencia}</p>
  <p style="margin: 4px 0; font-size: 14px;"><strong>E-mail:</strong> {email}</p>
  <p style="margin: 4px 0; font-size: 14px;"><strong>Telefone/WhatsApp:</strong> {telefone}</p>
</div>
<div style="background-color: #fbf6eb; border-left: 4px solid #e8b056; padding: 15px 20px; margin: 25px 0; font-size: 14px;">
  <strong>Orientação Clínica:</strong><br>
  Por favor, faça contato com o paciente através do WhatsApp ou e-mail acima em até 24-48 horas para agendar o primeiro acolhimento e estabelecer as regras do contrato terapêutico.
</div>
      `.trim(),
    },
    whatsapp: {
      enabled: true,
      messageText: `Olá, Dr(a). *{profissional}*! 📋\n\nUm novo paciente aceitou a proposta de atendimento com você:\n\n👤 *Paciente:* {nome}\n📱 *WhatsApp:* {telefone}\n✉️ *E-mail:* {email}\n💰 *Valor/Sessão:* {valor_sessao}\n🗓️ *Frequência:* {frequencia}\n\nPor favor, faça contato em até 24-48h para agendar a primeira sessão. Bom trabalho clínico! 🌿`.trim(),
    },
  },
  {
    id: "revisao_proposta",
    nome: "Solicitação de Revisão de Proposta",
    descricao: "Disparado quando o paciente solicita reajuste do valor ou frequência da sessão social.",
    categoria: "paciente",
    isCustom: false,
    active: true,
    timing: { type: "immediate", delayMinutes: 0 },
    email: {
      enabled: true,
      subject: "AcolheMente - Solicitação de Revisão Recebida",
      bodyHtml: `
<h3 style="font-family: 'Georgia', serif; font-size: 22px; color: #1e352f; margin-top: 0;">Olá, {nome}!</h3>
<p>Recebemos a sua solicitação para revisar o valor acertado ou a frequência das suas sessões do Projeto AcolheMente.</p>
<p>Nossa equipe de triagem compreende perfeitamente e fará uma análise do seu caso para tentar reajustar a sua proposta de modo que ela caiba em sua realidade de forma sustentável.</p>
<div style="background-color: #faf9f6; border-left: 4px solid #e8b056; padding: 15px 20px; margin: 25px 0; font-size: 14px;">
  <strong>O que acontece agora?</strong><br>
  Nossa equipe entrará em contato com você via e-mail ou WhatsApp em breve para apresentar alternativas de enquadramento.
</div>
<p>Agradecemos a sua sinceridade. O cuidado terapêutico deve ser viável para você!</p>
      `.trim(),
    },
    whatsapp: {
      enabled: true,
      messageText: `Olá, *{primeiro_nome}*! Recebemos o seu pedido de revisão de proposta.\n\nNossa coordenação de triagem está reavaliando as condições para que o atendimento seja financeiramente viável e acolhedor para você. Entraremos em contato em breve com novas alternativas!\n\n_Equipe AcolheMente_ 🌿`.trim(),
    },
  },
  {
    id: "lead_profissional",
    nome: "Novo Cadastro de Psicólogo / Lead Profissional",
    descricao: "Disparado quando um psicólogo realiza pré-inscrição na landing page de captação de corpo clínico.",
    categoria: "profissional",
    isCustom: false,
    active: true,
    timing: { type: "immediate", delayMinutes: 0 },
    email: {
      enabled: true,
      subject: "AcolheMente - Cadastro Profissional Recebido",
      bodyHtml: `
<h3 style="font-family: 'Georgia', serif; font-size: 22px; color: #1e352f; margin-top: 0;">Olá, Dr(a). {nome}!</h3>
<p>Agradecemos imensamente o seu interesse em fazer parte do corpo clínico do <strong>Projeto AcolheMente Saúde</strong>.</p>
<p>Nossa equipe técnica e de supervisão clínica está revisando os seus dados, CRP e preferências de público informados.</p>
<div style="background-color: #faf9f6; border-left: 4px solid #e8b056; padding: 15px 20px; margin: 25px 0; font-size: 14px;">
  <strong>O que acontece agora?</strong><br>
  Entraremos em contato em breve para realizar o agendamento da sua entrevista virtual e apresentação detalhada do modelo de atuação e remuneração da plataforma.
</div>
      `.trim(),
    },
    whatsapp: {
      enabled: true,
      messageText: `Olá, Dr(a). *{nome}*! 👋\n\nAgradecemos o seu cadastro para fazer parte do corpo clínico do *AcolheMente Saúde*.\n\nNossa equipe de coordenação clínica está revisando seu perfil e CRP. Entraremos em contato em breve para alinharmos os próximos passos e entrevista!\n\n_Coordenação Clínica AcolheMente_ 🌿`.trim(),
    },
  },
  {
    id: "lead_empresa",
    nome: "Novo Contato de Empresa Parceira (NR1 & Saúde Mental)",
    descricao: "Disparado quando um representante corporativo envia formulário de interesse em parcerias B2B.",
    categoria: "empresa",
    isCustom: false,
    active: true,
    timing: { type: "immediate", delayMinutes: 0 },
    email: {
      enabled: true,
      subject: "AcolheMente - Interesse de Parceria Corporativa Registrado",
      bodyHtml: `
<h3 style="font-family: 'Georgia', serif; font-size: 22px; color: #1e352f; margin-top: 0;">Olá, {nome}!</h3>
<p>É uma honra receber o interesse da <strong>{empresa}</strong> em ser nossa parceira corporativa no <strong>AcolheMente Saúde</strong>.</p>
<p>Mapear, prevenir e gerenciar os riscos psicossociais no ambiente de trabalho é o caminho mais inteligente para estar em conformidade total com a <strong>NR1</strong> e promover um ambiente saudável e altamente produtivo.</p>
<div style="background-color: #f3f9f6; border: 1px solid #d1ebd8; border-radius: 16px; padding: 20px; margin: 25px 0; font-size: 14px; color: #1b3d2b;">
  <strong>Nosso Compromisso:</strong><br>
  Um consultor de parcerias corporativas e compliance do AcolheMente entrará em contato em <strong>até 24 horas</strong> para agendar uma apresentação customizada.
</div>
      `.trim(),
    },
    whatsapp: {
      enabled: true,
      messageText: `Olá, *{nome}*! 🏢\n\nRecebemos o interesse da *{empresa}* no programa de Saúde Mental Corporativa & NR1 do *AcolheMente Saúde*.\n\nNosso consultor corporativo entrará em contato em breve para apresentar a melhor solução para o bem-estar e compliance da sua organização. Muito obrigado! 🌿`.trim(),
    },
  },
  {
    id: "vencimento_taxa_7dias",
    nome: "Vencimento da Taxa Associativa (7 dias após admissão)",
    descricao: "Disparado para o psicólogo para regularização da taxa associativa mensal na plataforma.",
    categoria: "profissional",
    isCustom: false,
    active: true,
    timing: { type: "immediate", delayMinutes: 0 },
    email: {
      enabled: true,
      subject: "AcolheMente - Regularização da Taxa Associativa (Vencimento 1ª Taxa)",
      bodyHtml: `
<h3 style="font-family: 'Georgia', serif; font-size: 22px; color: #1e352f; margin-top: 0;">Olá, Dr(a). {nome}!</h3>
<p>Esperamos que os seus primeiros dias no <strong>Projeto AcolheMente Saúde</strong> estejam sendo muito produtivos!</p>
<p>Conforme o nosso alinhamento inicial, o prazo de 7 dias após a sua admissão para confirmação da taxa associativa chegou.</p>
<div style="background-color: #faf9f6; border: 1px solid #ebdcb9; border-radius: 16px; padding: 20px; margin: 25px 0;">
  <h4 style="margin-top: 0; color: #1e352f; font-family: 'Georgia', serif; font-size: 16px;">Manutenção do Seu Perfil & Atendimentos:</h4>
  <p style="font-size: 14px; color: #2e443e; margin-bottom: 15px;">
    Para manter a visibilidade do seu perfil no catálogo oficial, continuar recebendo novos pacientes e utilizar as ferramentas de gestão clínica, realize o pagamento da sua taxa associativa.
  </p>
  <div style="text-align: center; margin: 25px 0;">
    <a href="{link_pagamento}" style="background-color: #1e352f; color: #ffffff; padding: 14px 28px; border-radius: 50px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block;">
      💳 Efetuar Pagamento da Taxa Associativa
    </a>
  </div>
</div>
      `.trim(),
    },
    whatsapp: {
      enabled: true,
      messageText: `Olá, Dr(a). *{nome}*! 👋\n\nConforme nosso alinhamento, completamos 7 dias desde a sua admissão no *AcolheMente*. Para manter seu perfil ativo e continuar recebendo pacientes triados, acesse o link seguro abaixo para efetuar a taxa associativa mensal:\n\n💳 *Link de Pagamento Seguro:*\n{link_pagamento}\n\nQualquer dúvida, fale conosco! 🌿`.trim(),
    },
  },
];

const CONFIG_DOC_PATH = ["configuracoes", "templates_notificacoes"] as const;

/**
 * Loads all notification triggers from Firestore or defaults
 */
export async function getNotificationTriggers(): Promise<NotificationTrigger[]> {
  try {
    const snap = await getDoc(doc(db, CONFIG_DOC_PATH[0], CONFIG_DOC_PATH[1]));
    if (snap.exists() && Array.isArray(snap.data()?.triggers)) {
      const savedTriggers: NotificationTrigger[] = snap.data().triggers;
      // Merge with default triggers to guarantee new default triggers appear if added later
      const mergedMap = new Map<string, NotificationTrigger>();
      DEFAULT_NOTIFICATION_TRIGGERS.forEach((t) => mergedMap.set(t.id, t));
      savedTriggers.forEach((t) => mergedMap.set(t.id, t));
      return Array.from(mergedMap.values());
    }
  } catch (err) {
    console.warn("[NotificationRulesService] Error fetching notification templates:", err);
  }
  return DEFAULT_NOTIFICATION_TRIGGERS;
}

/**
 * Saves all triggers to Firestore
 */
export async function saveNotificationTriggers(
  triggers: NotificationTrigger[]
): Promise<boolean> {
  try {
    await setDoc(
      doc(db, CONFIG_DOC_PATH[0], CONFIG_DOC_PATH[1]),
      {
        triggers,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.error("[NotificationRulesService] Error saving notification templates:", err);
    return false;
  }
}

/**
 * Replaces dynamic variables in text
 */
export function interpolateVariables(
  template: string,
  variables: Record<string, string>
): string {
  if (!template) return "";
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const cleanKey = key.startsWith("{") ? key : `{${key}}`;
    result = result.split(cleanKey).join(value || "");
  }
  return result;
}

export interface DispatchNotificationParams {
  eventId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  variables?: Record<string, string>;
  forceImmediate?: boolean;
}

/**
 * Main dispatcher: finds the trigger rule, replaces variables, handles timing and executes E-mail / WhatsApp
 */
export async function dispatchNotificationEvent(
  params: DispatchNotificationParams
): Promise<{
  success: boolean;
  triggerFound: boolean;
  emailSent?: boolean;
  whatsappSent?: boolean;
  scheduled?: boolean;
  error?: string;
}> {
  const {
    eventId,
    recipientEmail,
    recipientPhone,
    recipientName = "",
    variables = {},
    forceImmediate = false,
  } = params;

  try {
    const triggers = await getNotificationTriggers();
    const trigger = triggers.find((t) => t.id === eventId);

    if (!trigger) {
      console.warn(`[NotificationRulesService] Trigger "${eventId}" not found.`);
      return { success: false, triggerFound: false, error: `Gatilho "${eventId}" não encontrado.` };
    }

    if (!trigger.active) {
      console.log(`[NotificationRulesService] Trigger "${eventId}" is disabled. Skipping.`);
      return { success: true, triggerFound: true, error: "Gatilho inativo nas configurações." };
    }

    // Build variables dictionary
    const firstName = (recipientName || variables.nome || "").trim().split(" ")[0] || "Acolhido(a)";
    const enrichedVariables: Record<string, string> = {
      nome: recipientName || variables.nome || "",
      primeiro_nome: firstName,
      email: recipientEmail || variables.email || "",
      telefone: recipientPhone || variables.telefone || "",
      profissional: variables.profissional || variables.profissionalNome || "",
      valor_sessao: variables.valor_sessao || variables.valorSessao || "",
      frequencia: variables.frequencia || variables.frequenciaSessoes || "",
      link_proposta: variables.link_proposta || variables.linkProposta || "",
      link_pagamento: variables.link_pagamento || variables.linkPagamento || "https://buy.stripe.com/acolhemente",
      empresa: variables.empresa || variables.nomeEmpresa || "",
      data: new Date().toLocaleDateString("pt-BR"),
      plataforma: "Projeto AcolheMente Saúde",
      ...variables,
    };

    const delayMinutes = trigger.timing?.delayMinutes || 0;
    const shouldSchedule = !forceImmediate && trigger.timing?.type === "delay" && delayMinutes > 0;

    // Process templates
    const emailSubject = interpolateVariables(trigger.email.subject, enrichedVariables);
    const emailBody = interpolateVariables(trigger.email.bodyHtml, enrichedVariables);
    const whatsappText = interpolateVariables(trigger.whatsapp.messageText, enrichedVariables);

    // If scheduled for future
    if (shouldSchedule) {
      const scheduledFor = new Date(Date.now() + delayMinutes * 60000).toISOString();
      try {
        await addDoc(collection(db, "notificacoes_agendadas"), {
          triggerId: trigger.id,
          triggerName: trigger.nome,
          recipientEmail: trigger.email.enabled && recipientEmail ? recipientEmail : null,
          recipientPhone: trigger.whatsapp.enabled && recipientPhone ? recipientPhone : null,
          recipientName,
          subject: emailSubject,
          emailBody: emailBody,
          whatsappText: whatsappText,
          scheduledFor,
          delayMinutes,
          status: "pendente",
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.error("[NotificationRulesService] Failed to schedule notification in Firestore:", err);
      }

      // If delay is small (< 15 mins), also schedule locally via setTimeout
      if (delayMinutes <= 15) {
        setTimeout(async () => {
          try {
            await executeImmediateSend({
              trigger,
              recipientEmail,
              recipientPhone,
              recipientName,
              emailSubject,
              emailBody,
              whatsappText,
            });
          } catch (e) {
            console.error("[NotificationRulesService] Delayed delivery failed:", e);
          }
        }, delayMinutes * 60000);
      }

      return {
        success: true,
        triggerFound: true,
        scheduled: true,
      };
    }

    // Immediate execution
    const result = await executeImmediateSend({
      trigger,
      recipientEmail,
      recipientPhone,
      recipientName,
      emailSubject,
      emailBody,
      whatsappText,
    });

    return {
      success: true,
      triggerFound: true,
      emailSent: result.emailSent,
      whatsappSent: result.whatsappSent,
      scheduled: false,
    };
  } catch (err: any) {
    console.error("[NotificationRulesService] Error dispatching notification:", err);
    return { success: false, triggerFound: false, error: err?.message || "Erro interno ao processar disparo." };
  }
}

/**
 * Dispatches the messages immediately to active channels
 */
async function executeImmediateSend(params: {
  trigger: NotificationTrigger;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  emailSubject: string;
  emailBody: string;
  whatsappText: string;
}): Promise<{ emailSent: boolean; whatsappSent: boolean }> {
  const { trigger, recipientEmail, recipientPhone, recipientName, emailSubject, emailBody, whatsappText } = params;

  let emailSent = false;
  let whatsappSent = false;

  // 1. E-mail dispatch directly via Brevo / Webhook
  if (trigger.email.enabled && recipientEmail) {
    try {
      const emailRes = await triggerEmail(
        recipientEmail,
        emailSubject,
        emailBody,
        undefined,
        trigger.id,
        recipientName
      );
      emailSent = !!emailRes?.success;
      if (!emailRes?.success) {
        console.warn(`[NotificationRulesService] Brevo/Webhook dispatch returned:`, emailRes?.error);
      }
    } catch (e) {
      console.error(`[NotificationRulesService] Email error for ${recipientEmail}:`, e);
    }
  }

  // 2. WhatsApp dispatch
  if (trigger.whatsapp.enabled && recipientPhone) {
    try {
      const res = await sendEvolutionMessage(recipientPhone, whatsappText);
      whatsappSent = res.success;
      if (!res.success) {
        console.warn(`[NotificationRulesService] WhatsApp send returned:`, res.error);
      }
    } catch (e) {
      console.error(`[NotificationRulesService] WhatsApp error for ${recipientPhone}:`, e);
    }
  }

  // Log to history collection for manager auditing
  try {
    await addDoc(collection(db, "notificacoes_historico"), {
      triggerId: trigger.id,
      triggerName: trigger.nome,
      recipientEmail: recipientEmail || null,
      recipientPhone: recipientPhone || null,
      recipientName: recipientName || null,
      emailSent,
      whatsappSent,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    // Non-blocking log
  }

  return { emailSent, whatsappSent };
}

/**
 * Fetches recent notification history for the manager
 */
export async function fetchNotificationHistory(maxItems: number = 20): Promise<any[]> {
  try {
    const q = query(
      collection(db, "notificacoes_historico"),
      orderBy("createdAt", "desc"),
      limit(maxItems)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("[NotificationRulesService] Could not fetch notification history:", err);
    return [];
  }
}
