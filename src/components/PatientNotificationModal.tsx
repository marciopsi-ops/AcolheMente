import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Send,
  MessageSquare,
  Mail,
  Phone,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Copy,
  Sparkles,
  Clock,
  FileText,
  User,
  RefreshCw,
  Layers,
} from "lucide-react";
import { doc, updateDoc, addDoc, collection, serverTimestamp, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { sendEvolutionMessage } from "../lib/whatsappService";
import { triggerEmail } from "../lib/emailService";
import { getNotificationTriggers } from "../lib/notificationRulesService";
import { NotificationTrigger } from "../types/notificationRules";

export interface UserProfileSummary {
  uid?: string;
  name?: string;
  nome?: string;
  email?: string;
  crp?: string;
  chavePix?: string;
  [key: string]: any;
}

export interface PatientNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: any; // Acolhimento / Paciente / Lead
  profissionaisAtivos?: UserProfileSummary[];
  whatsappConnected?: boolean;
  globalConfigs?: any;
  onShowToast: (message: string, type?: "success" | "error" | "info") => void;
  onTargetUpdated?: (updatedFields: Record<string, any>) => void;
  initialMode?: "templates" | "custom";
  initialTemplateId?: string;
}

interface QuickTemplate {
  id: string;
  name: string;
  category: "operacional" | "regua" | "custom";
  subject: string;
  body: string;
}

export const PatientNotificationModal: React.FC<PatientNotificationModalProps> = ({
  isOpen,
  onClose,
  target,
  profissionaisAtivos = [],
  whatsappConnected = false,
  globalConfigs = {},
  onShowToast,
  onTargetUpdated,
  initialMode = "templates",
  initialTemplateId = "proposta",
}) => {
  // Channel Toggles
  const [sendWhatsApp, setSendWhatsApp] = useState<boolean>(true);
  const [sendEmail, setSendEmail] = useState<boolean>(true);

  // Message Source Mode: 'templates' | 'custom'
  const [mode, setMode] = useState<"templates" | "custom">(initialMode);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialTemplateId);

  // Update mode or template if props change when opening
  useEffect(() => {
    if (isOpen) {
      if (initialMode) setMode(initialMode);
      const isEmpresa = Boolean(target?.nomeEmpresa || target?.razaoSocial || target?.cnpj);
      if (isEmpresa && (!initialTemplateId || initialTemplateId === "proposta")) {
        setSelectedTemplateId("ficha_empresa");
      } else if (initialTemplateId) {
        setSelectedTemplateId(initialTemplateId);
      }
    }
  }, [isOpen, initialMode, initialTemplateId, target]);

  // Form Content
  const [subject, setSubject] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  // Recipient Edits (if phone or email needs quick adjustments)
  const [recipientEmail, setRecipientEmail] = useState<string>("");
  const [recipientPhone, setRecipientPhone] = useState<string>("");

  // Triggers loaded from notification rules
  const [reguaTriggers, setReguaTriggers] = useState<NotificationTrigger[]>([]);
  const [isLoadingTriggers, setIsLoadingTriggers] = useState<boolean>(false);

  // Patient Audit History
  const [patientHistory, setPatientHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [showHistoryView, setShowHistoryView] = useState<boolean>(false);

  // Sending State & Feedback
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendFeedback, setSendFeedback] = useState<{
    success: boolean;
    whatsappResult?: { sent: boolean; message?: string };
    emailResult?: { sent: boolean; message?: string };
  } | null>(null);

  // Professional Assigned
  const assignedProfessional = useMemo(() => {
    if (!target?.profissionalId) return null;
    return profissionaisAtivos.find((p) => p.uid === target.profissionalId) || null;
  }, [target?.profissionalId, profissionaisAtivos]);

  // Compute Monthly Estimate
  const calculatedValorMensal = useMemo(() => {
    if (!target?.valorSessao) return "A combinar";
    if (target.valorSessao.toLowerCase().includes("gratuito")) return "Gratuito";

    const matches = target.valorSessao.match(/(\d+[\d.,]*)/);
    if (matches) {
      let cleanValor = matches[0];
      if (cleanValor.includes(",") && cleanValor.includes(".")) {
        cleanValor = cleanValor.replace(/\./g, "").replace(",", ".");
      } else if (cleanValor.includes(",")) {
        cleanValor = cleanValor.replace(",", ".");
      }
      const valorNum = parseFloat(cleanValor);
      if (!isNaN(valorNum) && valorNum > 0) {
        let mult = 4;
        const freq = (target.frequenciaSessoes || "Semanal").toLowerCase();
        if (freq.includes("quinzenal")) mult = 2;
        else if (freq.includes("mensal")) mult = 1;
        else if (freq.includes("sob demanda")) mult = 1;

        const total = valorNum * mult;
        return `R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mês (aprox. ${mult} sessões x ${target.valorSessao})`;
      }
    }
    return target.valorSessao;
  }, [target?.valorSessao, target?.frequenciaSessoes]);

  // Load Triggers from rules service
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setIsLoadingTriggers(true);
    getNotificationTriggers()
      .then((data) => {
        if (isMounted) setReguaTriggers(data);
      })
      .catch((e) => console.error("Error loading notification triggers:", e))
      .finally(() => {
        if (isMounted) setIsLoadingTriggers(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Sync recipient contact info on target change
  useEffect(() => {
    if (target) {
      setRecipientEmail(target.email || "");
      setRecipientPhone(target.telefone || target.whatsapp || "");
      setSendFeedback(null);
    }
  }, [target]);

  // Interpolation Engine for Patient Variables
  const resolveTemplateVariables = (rawText: string): string => {
    if (!rawText) return "";
    let res = rawText;

    const isEmpresa = Boolean(target?.nomeEmpresa || target?.razaoSocial || target?.cnpj);
    const empresaNome = target?.razaoSocial || target?.nomeEmpresa || target?.empresa || "Empresa Conveniada";
    const patientName = isEmpresa
      ? (target?.nomeResponsavel || target?.contatoNome || target?.nome || target?.name || "Responsável")
      : (target?.nome || target?.name || target?.nomeContato || "Paciente");
    const firstName = patientName.trim().split(" ")[0];
    const profName = assignedProfessional?.name || target?.profissionalNome || "Profissional AcolheMente";
    const profCrp = assignedProfessional?.crp || target?.profissionalCrp || "Sob Supervisão";
    const valorSessao = target?.valorSessao || "A combinar";
    const frequencia = target?.frequenciaSessoes || "Semanal";
    const origin = typeof window !== "undefined" ? window.location.origin : "https://acolhemente.com.br";
    const linkProposta = target?.id ? `${origin}/?proposta=${target.id}` : `${origin}/?proposta=demo`;
    const linkContrato = target?.id ? `${origin}/?contrato=${target.id}` : `${origin}/?contrato=demo`;
    const linkFichaEmpresa = target?.id ? `${origin}/?ficha_empresa=${target.id}` : `${origin}/?ficha_empresa=demo`;
    const linkPerfilProf = assignedProfessional?.uid
      ? `${origin}/?view=profissionais#${assignedProfessional.uid}`
      : `${origin}/?view=profissionais`;

    const replacements: Record<string, string> = {
      "{nome}": patientName,
      "[NOME]": patientName,
      "{primeiro_nome}": firstName,
      "[PRIMEIRO_NOME]": firstName,
      "{email}": recipientEmail || target?.email || "",
      "[EMAIL]": recipientEmail || target?.email || "",
      "{telefone}": recipientPhone || target?.telefone || "",
      "[TELEFONE]": recipientPhone || target?.telefone || "",
      "{profissional}": profName,
      "[PROFISSIONAL]": profName,
      "[PROFISSIONAL_NOME]": profName,
      "{profissional_crp}": profCrp,
      "[PROFISSIONAL_CRP]": profCrp,
      "{valor_sessao}": valorSessao,
      "[VALOR_SESSAO]": valorSessao,
      "{frequencia}": frequencia,
      "[FREQUENCIA]": frequencia,
      "{valor_mensal}": calculatedValorMensal,
      "[VALOR_MENSAL]": calculatedValorMensal,
      "{link_proposta}": linkProposta,
      "[LINK_PROPOSTA]": linkProposta,
      "{link_contrato}": linkContrato,
      "[LINK_CONTRATO]": linkContrato,
      "{link_ficha}": linkFichaEmpresa,
      "[LINK_FICHA]": linkFichaEmpresa,
      "{link_ficha_empresa}": linkFichaEmpresa,
      "[LINK_FICHA_EMPRESA]": linkFichaEmpresa,
      "{link_perfil_profissional}": linkPerfilProf,
      "[LINK_PERFIL_PROFISSIONAL]": linkPerfilProf,
      "{empresa}": empresaNome,
      "[EMPRESA]": empresaNome,
      "{nomeEmpresa}": empresaNome,
      "[NOME_EMPRESA]": empresaNome,
      "{cnpj}": target?.cnpj || "",
      "[CNPJ]": target?.cnpj || "",
      "{valores_acertados}": target?.valoresDefinidos || target?.valoresAcertados || "Conforme acordado",
      "[VALORES_ACERTADOS]": target?.valoresDefinidos || target?.valoresAcertados || "Conforme acordado",
      "{forma_pagamento}": target?.formaPagamento || "Boleto / Faturamento",
      "[FORMA_PAGAMENTO]": target?.formaPagamento || "Boleto / Faturamento",
      "{plataforma}": "Projeto AcolheMente Saúde",
      "[PLATAFORMA]": "Projeto AcolheMente Saúde",
      "{data}": new Date().toLocaleDateString("pt-BR"),
      "[DATA]": new Date().toLocaleDateString("pt-BR"),
    };

    Object.entries(replacements).forEach(([key, val]) => {
      const escaped = key.replace(/[[\]{}]/g, "\\$&");
      res = res.replace(new RegExp(escaped, "g"), val);
    });

    return res;
  };

  // Base Built-in Quick Templates
  const builtInTemplates: QuickTemplate[] = useMemo(() => {
    const isEmpresa = Boolean(target?.nomeEmpresa || target?.razaoSocial || target?.cnpj);
    if (isEmpresa) {
      return [
        {
          id: "ficha_empresa",
          name: "🏢 Ficha de Bordo Cadastral e Colaboradores",
          category: "operacional",
          subject: "AcolheMente - Ficha de Bordo Cadastral da Empresa",
          body: `Olá *{primeiro_nome}*! Tudo bem? 🌿\n\nNós do *Projeto AcolheMente Saúde* gostaríamos de solicitar o preenchimento e conferência da Ficha de Bordo da sua empresa *{empresa}*.\n\n👉 Acesse o link exclusivo da Ficha de Bordo para cadastrar/conferir dados e a planilha de colaboradores e dependentes:\n{link_ficha_empresa}\n\nFicamos à total disposição para tirar qualquer dúvida! ✨`,
        },
        {
          id: "contrato_empresa",
          name: "✍️ Contrato Corporativo de Prestação de Serviços",
          category: "operacional",
          subject: "AcolheMente - Contrato de Parceria Corporativa",
          body: `Olá *{primeiro_nome}*! 👋\n\nSegue o link seguro para a leitura e assinatura digital do Contrato Corporativo de Saúde Mental da empresa *{empresa}* junto ao Projeto AcolheMente:\n\n{link_contrato}\n\nA formalização garante o início imediato dos atendimentos para seus colaboradores!\n\nQualquer dúvida, conte conosco!`,
        },
        {
          id: "faturamento_empresa",
          name: "💳 Faturamento / Emissão de Nota Fiscal",
          category: "operacional",
          subject: "AcolheMente - Faturamento e Nota Fiscal",
          body: `Olá *{primeiro_nome}*! Tudo bem?\n\nEntramos em contato referente ao ciclo de faturamento dos serviços de saúde mental da empresa *{empresa}*.\n\nValores acordados: *{valores_acertados}* ({forma_pagamento}).\n\nFavor nos enviar o comprovante de pagamento ou confirmar o recebimento da Nota Fiscal emitida.\n\nAgradecemos a parceria!`,
        },
        {
          id: "boas_vindas_empresa",
          name: "🎉 Boas-Vindas & Benefício Corporativo",
          category: "operacional",
          subject: "AcolheMente - Boas-Vindas ao Convênio de Saúde Mental",
          body: `Olá *{primeiro_nome}*! Tudo pronto para cuidarmos da saúde mental da sua equipe! 🌿\n\nA parceria da *{empresa}* com o *Projeto AcolheMente Saúde* está oficialmente ativa.\n\nLembramos que o link da Ficha de Bordo pode ser atualizado com novos colaboradores ou dependentes a qualquer momento:\n{link_ficha_empresa}\n\nConte sempre com a gente!`,
        },
      ];
    }
    return [
      {
        id: "proposta",
        name: "📋 Proposta de Atendimento Clínico",
        category: "operacional",
        subject: "AcolheMente - Sua Proposta de Atendimento",
        body: `Olá *{primeiro_nome}*! Tudo bem? 🌿\n\nNossa equipe técnica e de triagem do *Projeto AcolheMente Saúde* concluiu a análise do seu formulário de acolhimento.\n\nElaboramos a sua proposta personalizada de atendimento:\n• *Valor por Sessão:* {valor_sessao}\n• *Frequência Sugerida:* {frequencia}\n• *Estimativa Mensal:* {valor_mensal}\n\n👉 Para conferir todos os detalhes e dar o seu aceite online, acesse o link seguro:\n{link_proposta}\n\nFicamos à disposição para quaisquer dúvidas! ✨`,
      },
      {
        id: "boas_vindas",
        name: "🤝 Boas-Vindas & Atribuição de Psicólogo",
        category: "operacional",
        subject: "AcolheMente - Seu Profissional Foi Atribuído",
        body: `Olá *{primeiro_nome}*! Boas notícias! 🎉\n\nO seu acolhimento no *Projeto AcolheMente Saúde* foi atribuído ao(à) profissional *{profissional}* (CRP: {profissional_crp}).\n\nEm até 24h a 48h úteis o(a) psicólogo(a) entrará em contato com você pelo WhatsApp para combinarem o dia e horário da sua primeira sessão.\n\nPara conhecer mais sobre as regras do acompanhamento e assinatura digital do contrato terapêutico, acesse:\n{link_contrato}\n\nSeja muito bem-vindo(a) à sua jornada de autocuidado! 🌿`,
      },
      {
        id: "lembrete_sessao",
        name: "⏰ Lembrete de Sessão de Terapia",
        category: "operacional",
        subject: "AcolheMente - Lembrete da sua Sessão",
        body: `Olá *{primeiro_nome}*! 👋\n\nEste é um lembrete carinhoso sobre a sua sessão de terapia agendada com o(a) psicólogo(a) *{profissional}*.\n\nLembre-se de estar em um local tranquilo, privativo e com boa conexão à internet.\n\nCaso necessite de reagendamento, por favor avise com no mínimo 24h de antecedência. Uma excelente sessão! 🌿`,
      },
      {
        id: "pagamento",
        name: "💳 Lembrete de Pagamento de Sessão",
        category: "operacional",
        subject: "AcolheMente - Lembrete de Regularização de Sessão",
        body: `Olá *{primeiro_nome}*! Tudo bem?\n\nIdentificamos uma pendência referente ao acerto da sua última sessão no valor social acordado de *{valor_sessao}* com o(a) profissional *{profissional}*.\n\nPedimos a gentileza de regularizar o acerto ou enviar o comprovante para mantermos a regularidade do seu acompanhamento clínico.\n\nQualquer dúvida, conte com nossa equipe!`,
      },
      {
        id: "documentos",
        name: "📄 Pendência de Documentos / Ficha de Bordo",
        category: "operacional",
        subject: "AcolheMente - Documentos Pendentes na sua Ficha",
        body: `Olá *{primeiro_nome}*!\n\nConstatamos que há dados complementares ou documentos pendentes no seu cadastro junto à Ficha de Bordo do Projeto AcolheMente.\n\nPara mantermos a conformidade do seu prontuário clínico e a segurança dos seus atendimentos, solicitamos que nos envie as informações solicitadas assim que possível.\n\nMuito obrigado pela colaboração!`,
      },
      {
        id: "contrato",
        name: "✍️ Link para Assinatura do Contrato",
        category: "operacional",
        subject: "AcolheMente - Contrato de Prestação de Serviços",
        body: `Olá *{primeiro_nome}*!\n\nSegue o link seguro para a leitura e assinatura digital do Contrato de Prestação de Serviços Psicológicos do Projeto AcolheMente:\n\n{link_contrato}\n\nA assinatura leva menos de 2 minutos e garante a formalização do valor social de *{valor_sessao}* e a frequência acordada.\n\nFicamos à disposição!`,
      },
    ];
  }, []);

  // Combined Template List (Built-ins + Régua Triggers)
  const allTemplates = useMemo(() => {
    const list: QuickTemplate[] = [...builtInTemplates];

    reguaTriggers.forEach((trg) => {
      // Avoid duplicate keys with built-ins
      if (!list.some((item) => item.id === trg.id)) {
        list.push({
          id: `regua_${trg.id}`,
          name: `⚡ [Régua] ${trg.nome}`,
          category: "regua",
          subject: trg.email.subject || "Notificação Projeto AcolheMente",
          body: trg.whatsapp.messageText || trg.email.bodyHtml.replace(/<[^>]*>/g, ""),
        });
      }
    });

    return list;
  }, [builtInTemplates, reguaTriggers]);

  // Load template content when selected
  useEffect(() => {
    if (mode === "templates") {
      const selected = allTemplates.find((t) => t.id === selectedTemplateId) || allTemplates[0];
      if (selected) {
        setSubject(resolveTemplateVariables(selected.subject));
        setMessage(resolveTemplateVariables(selected.body));
      }
    }
  }, [selectedTemplateId, mode, allTemplates, target, recipientEmail, recipientPhone]);

  // Load patient specific notification history
  const loadPatientHistory = async () => {
    if (!target) return;
    setIsLoadingHistory(true);
    try {
      const historyRef = collection(db, "notificacoes_historico");
      // Search by email or phone
      let q = query(historyRef, orderBy("createdAt", "desc"), limit(20));
      if (recipientEmail) {
        q = query(historyRef, where("recipientEmail", "==", recipientEmail), orderBy("createdAt", "desc"), limit(15));
      }

      const snap = await getDocs(q);
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPatientHistory(items);
    } catch (err) {
      console.warn("[PatientNotificationModal] Error loading patient history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen && showHistoryView) {
      loadPatientHistory();
    }
  }, [isOpen, showHistoryView]);

  if (!isOpen || !target) return null;

  // Insert Variable Token into Message Body
  const handleInsertTag = (tag: string) => {
    setMessage((prev) => `${prev} ${tag}`);
  };

  // Main Dispatch Action
  const handleDispatchNotification = async () => {
    if (!sendWhatsApp && !sendEmail) {
      onShowToast("Selecione pelo menos um canal de envio (WhatsApp ou E-mail).", "info");
      return;
    }

    if (sendWhatsApp && !recipientPhone.trim()) {
      onShowToast("Informe o número de telefone do paciente para o WhatsApp.", "error");
      return;
    }

    if (sendEmail && !recipientEmail.trim()) {
      onShowToast("Informe o e-mail do paciente para envio.", "error");
      return;
    }

    if (!message.trim()) {
      onShowToast("A mensagem não pode ficar vazia.", "error");
      return;
    }

    setIsSending(true);
    setSendFeedback(null);

    let whatsSent = false;
    let whatsError: string | undefined;
    let emailSent = false;
    let emailError: string | undefined;

    const patientName = target.nome || target.name || "Paciente";

    // 1. WhatsApp Dispatch
    if (sendWhatsApp) {
      const cleanPhone = recipientPhone.replace(/\D/g, "");
      if (cleanPhone.length >= 10) {
        try {
          const res = await sendEvolutionMessage(cleanPhone, message.trim());
          if (res.success) {
            whatsSent = true;
          } else {
            whatsError = res.error || "Instância do WhatsApp não respondeu.";
          }
        } catch (e: any) {
          whatsError = e?.message || "Erro na conexão com Evolution API.";
        }
      } else {
        whatsError = "Telefone inválido (mínimo 10 dígitos).";
      }
    }

    // 2. Email Dispatch via Brevo / Webhook
    if (sendEmail) {
      try {
        const emailSubject = subject.trim() || "Notificação Projeto AcolheMente";
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; font-size: 15px; color: #1e352f; line-height: 1.6;">
            ${message.trim().replace(/\n/g, "<br>")}
          </div>
        `;

        const res = await triggerEmail(
          recipientEmail.trim(),
          emailSubject,
          emailHtml,
          message.trim(),
          "notificacao_avulsa_paciente",
          patientName
        );

        if (res && res.success) {
          emailSent = true;
        } else {
          emailError = res?.error || "Brevo / Webhook rejeitou a solicitação.";
        }
      } catch (e: any) {
        emailError = e?.message || "Erro interno ao disparar e-mail.";
      }
    }

    // 3. Log Audit in Firestore (notificacoes_historico)
    try {
      await addDoc(collection(db, "notificacoes_historico"), {
        triggerId: `avulsa_${selectedTemplateId || "custom"}`,
        triggerName: `Envio Ficha de Bordo: ${subject || "Comunicação ao Paciente"}`,
        recipientEmail: recipientEmail.trim() || null,
        recipientPhone: recipientPhone.trim() || null,
        recipientName: patientName,
        targetId: target.id || null,
        targetType: "paciente",
        emailSent,
        whatsappSent: whatsSent,
        emailError: emailError || null,
        whatsappError: whatsError || null,
        messagePreview: message.substring(0, 180),
        createdAt: serverTimestamp(),
      });
    } catch (auditErr) {
      console.warn("[PatientNotificationModal] History log failed:", auditErr);
    }

    // 4. Update Target Status if appropriate
    const updates: Record<string, any> = {};
    if (selectedTemplateId === "proposta" || subject.toLowerCase().includes("proposta")) {
      updates.propostaEnviada = true;
      updates.propostaEnviadaEm = new Date().toISOString();
      if (!target.status || target.status === "Aguardando Avaliação") {
        updates.status = "Aprovado";
      }
      if (!target.propostaStatus) {
        updates.propostaStatus = "Proposta enviada";
      }
    } else if (selectedTemplateId === "boas_vindas" || subject.toLowerCase().includes("atribuição")) {
      updates.contatoEnviado = true;
      updates.contatoEnviadoEm = new Date().toISOString();
      if (target.status === "Aprovado") {
        updates.status = "Em Atendimento";
      }
    }

    if (Object.keys(updates).length > 0 && target.id) {
      try {
        await updateDoc(doc(db, "acolhimentos", target.id), updates);
        if (onTargetUpdated) onTargetUpdated(updates);
      } catch (e) {
        console.error("Error updating acolhimento:", e);
      }
    }

    setIsSending(false);

    // Feedback
    const isTotalSuccess = (!sendWhatsApp || whatsSent) && (!sendEmail || emailSent);
    setSendFeedback({
      success: isTotalSuccess,
      whatsappResult: sendWhatsApp ? { sent: whatsSent, message: whatsError } : undefined,
      emailResult: sendEmail ? { sent: emailSent, message: emailError } : undefined,
    });

    if (isTotalSuccess) {
      const channels = [];
      if (whatsSent) channels.push("WhatsApp");
      if (emailSent) channels.push("E-mail Brevo");
      onShowToast(`Notificação disparada com sucesso! (${channels.join(" & ")})`, "success");
    } else {
      let errTxt = "Houve falha em um dos canais:";
      if (sendWhatsApp && !whatsSent) errTxt += ` WhatsApp (${whatsError || "erro"});`;
      if (sendEmail && !emailSent) errTxt += ` E-mail (${emailError || "erro"});`;
      onShowToast(errTxt, "error");
    }
  };

  // Open in WhatsApp Web fallback
  const handleOpenWhatsAppWeb = () => {
    const cleanPhone = recipientPhone.replace(/\D/g, "");
    const encoded = encodeURIComponent(message);
    const url = cleanPhone ? `https://wa.me/55${cleanPhone.replace(/^55/, "")}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-forest/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl border border-soft overflow-hidden animate-in zoom-in-95">
        
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-soft bg-warm/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-forest/10 border border-forest/20 flex items-center justify-center text-forest">
              <MessageSquare className="w-5 h-5 text-forest" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-bold text-forest leading-tight">
                  Notificar Paciente
                </h3>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-forest text-white">
                  Ficha de Bordo
                </span>
              </div>
              <p className="text-xs text-forest/70 font-medium truncate max-w-sm sm:max-w-md">
                {target.nome || target.name || "Paciente"} • {target.status || "Em Triagem"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowHistoryView(!showHistoryView)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                showHistoryView
                  ? "bg-forest text-white border-forest shadow-xs"
                  : "bg-white text-forest/80 border-soft hover:text-forest hover:bg-warm"
              }`}
              title="Ver histórico de notificações deste paciente"
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Histórico</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-forest/60 hover:text-red-500 rounded-full hover:bg-white/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">

          {showHistoryView ? (
            /* History Subview */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-soft">
                <h4 className="text-xs font-bold uppercase tracking-wider text-forest flex items-center gap-2">
                  <Clock className="w-4 h-4 text-forest/70" /> Histórico de Notificações do Paciente
                </h4>
                <button
                  type="button"
                  onClick={loadPatientHistory}
                  disabled={isLoadingHistory}
                  className="text-xs text-forest/70 hover:text-forest flex items-center gap-1 font-semibold"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingHistory ? "animate-spin" : ""}`} />
                  Atualizar
                </button>
              </div>

              {isLoadingHistory ? (
                <div className="py-12 text-center text-forest/60 text-xs flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-forest/40" />
                  Carregando histórico...
                </div>
              ) : patientHistory.length === 0 ? (
                <div className="py-12 text-center text-forest/60 text-xs bg-warm/30 rounded-2xl border border-soft p-6">
                  Nenhum registro de notificação anterior encontrado para este paciente.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {patientHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 bg-white border border-soft rounded-2xl text-xs space-y-2 shadow-2xs hover:border-forest/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-forest">
                          {item.triggerName || item.triggerId || "Notificação"}
                        </span>
                        <span className="text-[10px] text-forest/60">
                          {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString("pt-BR") : "Recentemente"}
                        </span>
                      </div>
                      <p className="text-forest/80 text-[11px] font-mono line-clamp-2 bg-warm/40 p-2 rounded-xl border border-soft">
                        {item.messagePreview || "Mensagem enviada..."}
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                            item.whatsappSent
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          <Phone className="w-2.5 h-2.5" />
                          WhatsApp: {item.whatsappSent ? "Enviado" : "Não enviado"}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                            item.emailSent
                              ? "bg-sky-100 text-sky-800 border border-sky-300"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          <Mail className="w-2.5 h-2.5" />
                          E-mail Brevo: {item.emailSent ? "Enviado" : "Não enviado"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Standard Notification Form */
            <>
              {/* 1. Channel Selector Bar */}
              <div className="bg-warm/40 p-3.5 sm:p-4 rounded-2xl border border-soft space-y-3">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-forest/70 block">
                  Canais de Disparo Disponíveis
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* WhatsApp Channel Card */}
                  <label
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      sendWhatsApp
                        ? "bg-emerald-50/90 border-emerald-300 shadow-2xs"
                        : "bg-white border-soft opacity-70 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${sendWhatsApp ? "bg-[#25D366] text-white" : "bg-slate-100 text-slate-400"}`}>
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-forest block">
                          WhatsApp Direto
                        </span>
                        <span className="text-[10px] text-forest/70 block">
                          {whatsappConnected ? "Instância Ativa (Evolution API)" : "Instância Desconectada (Fallback wa.me)"}
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                      checked={sendWhatsApp}
                      onChange={(e) => setSendWhatsApp(e.target.checked)}
                    />
                  </label>

                  {/* Email Channel Card */}
                  <label
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      sendEmail
                        ? "bg-sky-50/90 border-sky-300 shadow-2xs"
                        : "bg-white border-soft opacity-70 hover:opacity-100"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-lg ${sendEmail ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-forest block">
                          E-mail Webhook / Brevo
                        </span>
                        <span className="text-[10px] text-forest/70 block">
                          Template oficial em tempo real
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-sky-600 rounded cursor-pointer"
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                    />
                  </label>
                </div>

                {/* Recipient Quick Edit Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-soft/80">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-forest/60 block mb-1">
                      WhatsApp do Paciente
                    </label>
                    <input
                      type="text"
                      className="w-full text-xs font-mono bg-white border border-soft px-3 py-1.5 rounded-lg focus:outline-none focus:border-sun-dark"
                      placeholder="(XX) 9XXXX-XXXX"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-forest/60 block mb-1">
                      E-mail do Paciente
                    </label>
                    <input
                      type="email"
                      className="w-full text-xs font-mono bg-white border border-soft px-3 py-1.5 rounded-lg focus:outline-none focus:border-sun-dark"
                      placeholder="paciente@email.com"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Mode Selector: Templates vs Custom Message */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-soft">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-forest/70">
                    Origem da Notificação
                  </span>
                  <div className="flex items-center gap-1 bg-warm/80 p-1 rounded-xl border border-soft text-xs">
                    <button
                      type="button"
                      onClick={() => setMode("templates")}
                      className={`px-3 py-1 rounded-lg font-bold transition-all ${
                        mode === "templates"
                          ? "bg-white text-forest shadow-xs"
                          : "text-forest/60 hover:text-forest"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-forest/70" />
                        Modelos & Régua
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("custom")}
                      className={`px-3 py-1 rounded-lg font-bold transition-all ${
                        mode === "custom"
                          ? "bg-white text-forest shadow-xs"
                          : "text-forest/60 hover:text-forest"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-sun-dark-dark" />
                        Mensagem Eventual / Específica
                      </span>
                    </button>
                  </div>
                </div>

                {mode === "templates" ? (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-forest/60 block mb-1">
                      Selecione um Modelo Pré-configurado ou Gatilho da Régua:
                    </label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="w-full text-xs font-medium bg-white border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark shadow-2xs"
                    >
                      <optgroup label="Modelos Operacionais Rápidos">
                        {builtInTemplates.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.name}
                          </option>
                        ))}
                      </optgroup>
                      {reguaTriggers.length > 0 && (
                        <optgroup label="Gatilhos Ativos da Régua / Central">
                          {reguaTriggers.map((trg) => (
                            <option key={`regua_${trg.id}`} value={`regua_${trg.id}`}>
                              ⚡ [Régua Oficial] {trg.nome}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                ) : (
                  <div className="bg-amber-50/60 border border-amber-200/80 p-3 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Mensagem Específica / Eventual:</strong> Escreva um texto pontual para este paciente. As tags dinâmicas como <code className="bg-white/80 px-1 py-0.5 rounded text-[11px] font-mono">&#123;nome&#125;</code> serão substituídas automaticamente.
                    </span>
                  </div>
                )}
              </div>

              {/* 3. Subject (if email is selected) */}
              {sendEmail && (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-forest/60 block mb-1">
                    Assunto do E-mail (Brevo / Webhook)
                  </label>
                  <input
                    type="text"
                    className="w-full text-xs bg-white border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark font-medium"
                    placeholder="Ex: AcolheMente - Notificação Importante"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
              )}

              {/* 4. Message Body & Tag inserters */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-forest/60">
                    Mensagem da Notificação (WhatsApp & E-mail)
                  </label>
                  <span className="text-[10px] text-forest/50 font-mono">
                    {message.length} caracteres
                  </span>
                </div>

                {/* Quick Variable Tag Pills */}
                <div className="flex flex-wrap items-center gap-1.5 mb-2 pb-1">
                  <span className="text-[10px] text-forest/60 font-semibold mr-1">
                    Inserir tag:
                  </span>
                  {[
                    { label: "Nome", tag: "{nome}" },
                    { label: "Profissional", tag: "{profissional}" },
                    { label: "Valor", tag: "{valor_sessao}" },
                    { label: "Frequência", tag: "{frequencia}" },
                    { label: "Link Proposta", tag: "{link_proposta}" },
                    { label: "Link Contrato", tag: "{link_contrato}" },
                  ].map((t) => (
                    <button
                      key={t.tag}
                      type="button"
                      onClick={() => handleInsertTag(t.tag)}
                      className="text-[10px] font-mono font-bold bg-warm/80 hover:bg-forest hover:text-white px-2 py-0.5 rounded-md border border-soft transition-colors text-forest"
                    >
                      +{t.label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  placeholder="Digite o conteúdo da mensagem que será disparada..."
                  className="w-full text-xs font-sans bg-white border border-soft px-3.5 py-3 rounded-2xl focus:outline-none focus:border-sun-dark resize-none leading-relaxed shadow-2xs font-normal text-forest"
                />
              </div>

              {/* Feedback Alert if present */}
              {sendFeedback && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                    sendFeedback.success
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : "bg-rose-50 border-rose-200 text-rose-900"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {sendFeedback.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    )}
                    <span>
                      {sendFeedback.success
                        ? "Notificação processada com sucesso!"
                        : "Ocorreram alertas no disparo da notificação:"}
                    </span>
                  </div>
                  {sendFeedback.whatsappResult && (
                    <div className="text-[11px] pl-6">
                      • WhatsApp:{" "}
                      {sendFeedback.whatsappResult.sent
                        ? "Enviado via Evolution API"
                        : `Falha (${sendFeedback.whatsappResult.message})`}
                    </div>
                  )}
                  {sendFeedback.emailResult && (
                    <div className="text-[11px] pl-6">
                      • E-mail:{" "}
                      {sendFeedback.emailResult.sent
                        ? "Enviado via Brevo / Webhook"
                        : `Falha (${sendFeedback.emailResult.message})`}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-5 sm:px-6 py-4 border-t border-soft bg-warm/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenWhatsAppWeb}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 hover:underline flex items-center gap-1.5"
              title="Abrir mensagem pré-carregada no WhatsApp Web"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
              <span>Abrir WhatsApp Web Manual</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 text-xs font-bold text-forest/70 hover:text-forest transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={isSending || (!sendWhatsApp && !sendEmail)}
              onClick={handleDispatchNotification}
              className="px-5 py-2.5 bg-forest hover:bg-forest/90 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-sun" />
                  <span>Disparando...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-sun" />
                  <span>
                    Disparar Notificação
                    {sendWhatsApp && sendEmail
                      ? " (Whats & E-mail)"
                      : sendWhatsApp
                        ? " (via WhatsApp)"
                        : " (via E-mail Brevo)"}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PatientNotificationModal;
