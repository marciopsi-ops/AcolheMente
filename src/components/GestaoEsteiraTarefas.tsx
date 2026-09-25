import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
  Search,
  User,
  Building2,
  HeartHandshake,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  MessageCircle,
  FileText,
  Users,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Zap,
  Check,
  AlertCircle,
  Info,
  Calendar,
  Layers,
  Inbox,
  ArrowUpDown,
  Phone,
  Mail,
  Send,
  Eye,
  BadgeAlert
} from "lucide-react";

export type DemandType = "alert" | "pendency" | "task" | "message";

export interface GestaoDemandItem {
  id: string;
  type: DemandType;
  title: string;
  desc: string;
  date: string;
  timestamp: number;
  treated: boolean;
  priority?: "alta" | "media" | "baixa";
}

export interface GestaoEntityCard {
  entityId: string;
  entityType: "paciente" | "profissional" | "empresa" | "apoio_solidario" | "doacao" | "compliance";
  entityName: string;
  entitySubtitle: string;
  entityContact?: string;
  entityEmail?: string;
  entityBadge?: string;
  entityRawObj: any;
  items: GestaoDemandItem[];
  oldestTimestamp: number;
  newestTimestamp: number;
  hasCriticalAlert: boolean;
}

interface GestaoEsteiraTarefasProps {
  acolhimentos: any[];
  profissionaisLeads: any[];
  profissionaisAtivos: any[];
  empresasLeads: any[];
  solicitacoes: any[];
  doacoes: any[];
  complianceMessages: any[];
  profissionaisAtCapacity: any[];
  currentRole: "master" | "triagem" | "profissional";
  treatedItemIds: Set<string>;
  onToggleTreatedItem: (id: string) => void;
  onMarkAllEntityTreated: (itemIds: string[]) => void;
  onSelectAcolhimento: (card: any) => void;
  onSelectProfissional: (prof: any) => void;
  onSelectEmpresa: (empresa: any) => void;
  onNavigateToTab: (tab: any) => void;
  formatDateSafely: (val: any) => string;
  formatDateTimeSafely: (val: any) => string;
}

export function GestaoEsteiraTarefas({
  acolhimentos,
  profissionaisLeads,
  profissionaisAtivos,
  empresasLeads,
  solicitacoes,
  doacoes,
  complianceMessages,
  profissionaisAtCapacity,
  currentRole,
  treatedItemIds,
  onToggleTreatedItem,
  onMarkAllEntityTreated,
  onSelectAcolhimento,
  onSelectProfissional,
  onSelectEmpresa,
  onNavigateToTab,
  formatDateSafely,
  formatDateTimeSafely,
}: GestaoEsteiraTarefasProps) {
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"fifo" | "recent" | "priority">("fifo");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleExpandCard = (entityId: string) => {
    setExpandedCards((prev) => ({ ...prev, [entityId]: !prev[entityId] }));
  };

  const getMillisVal = (ts: any): number => {
    if (!ts) return Date.now();
    if (typeof ts.toMillis === "function") return ts.toMillis();
    if (ts instanceof Date) return ts.getTime();
    if (typeof ts === "number") return ts > 1e11 ? ts : ts * 1000;
    if (typeof ts === "string") {
      const parsed = new Date(ts);
      if (!isNaN(parsed.getTime())) return parsed.getTime();
    }
    return Date.now();
  };

  const parseLogDateToMillis = (dateStr: string, fallback: any): number => {
    try {
      const cleaned = dateStr.trim();
      const parts = cleaned.split(/,?\s+/);
      if (parts.length >= 2) {
        const dateParts = parts[0].split("/");
        const timeParts = parts[1].split(":");
        if (dateParts.length === 3 && timeParts.length >= 2) {
          const day = parseInt(dateParts[0], 10);
          const month = parseInt(dateParts[1], 10) - 1;
          const year = parseInt(dateParts[2], 10);
          const hour = parseInt(timeParts[0], 10);
          const minute = parseInt(timeParts[1], 10);
          const second = timeParts[2] ? parseInt(timeParts[2], 10) : 0;
          return new Date(year, month, day, hour, minute, second).getTime();
        }
      }
    } catch (e) {}
    return getMillisVal(fallback);
  };

  // Compile all entities into consolidated cards
  const allCards = useMemo(() => {
    const cards: GestaoEntityCard[] = [];

    // 1. PACIENTES / ACOLHIMENTOS
    acolhimentos.forEach((a) => {
      const items: GestaoDemandItem[] = [];
      const baseTime = getMillisVal(a.createdAt || a.dataHora || Date.now());
      const pName = a.nomeDesejado || a.nomeCivil || a.nome || "Paciente sem nome";

      // 1.1 Novo Acolhimento aguardando triagem
      if (!a.status || a.status === "Aguardando Avaliação") {
        items.push({
          id: `acolhimento-novo-${a.id}`,
          type: "task",
          title: "Novo Acolhimento - Aguardando Triagem Inicial",
          desc: `Paciente cadastrado via ${a.viaAcesso || "Particular"}. Queixa: ${a.motivo || "Não informada"}. Necessário realizar avaliação e contato inicial.`,
          date: formatDateTimeSafely(a.createdAt || baseTime),
          timestamp: baseTime,
          treated: treatedItemIds.has(`acolhimento-novo-${a.id}`),
          priority: "alta",
        });
      }

      // 1.2 Paciente solicitou revisão da proposta
      if (a.propostaStatus === "Paciente solicita revisão da proposta") {
        const revTime = getMillisVal(a.updatedAt || baseTime);
        items.push({
          id: `acolhimento-revisao-proposta-${a.id}`,
          type: "alert",
          title: "Revisão de Proposta Solicitada pelo Paciente",
          desc: `O paciente solicitou revisão de valores/condições. Motivo: "${a.motivoRevisao || "Ver detalhes na ficha"}". Necessário reavaliar proposta.`,
          date: formatDateTimeSafely(a.updatedAt || revTime),
          timestamp: revTime,
          treated: treatedItemIds.has(`acolhimento-revisao-proposta-${a.id}`),
          priority: "alta",
        });
      }

      // 1.3 Proposta aceita aguardando atribuição de profissional
      if (
        (a.propostaStatus === "Proposta aceita pelo paciente" || a.status === "Aprovado") &&
        !a.profissionalId
      ) {
        const aceitTime = getMillisVal(a.propostaAceitaEm || a.updatedAt || baseTime);
        items.push({
          id: `acolhimento-sem-profissional-${a.id}`,
          type: "task",
          title: "Proposta Aceita - Aguardando Encaminhamento a Psicólogo",
          desc: `Proposta aceita (R$ ${a.valorSessao || a.valorProposto || "A combinar"}). Necessário selecionar e atribuir psicólogo compatível.`,
          date: formatDateTimeSafely(a.propostaAceitaEm || aceitTime),
          timestamp: aceitTime,
          treated: treatedItemIds.has(`acolhimento-sem-profissional-${a.id}`),
          priority: "alta",
        });
      }

      // 1.4 Atribuição devolvida / rejeitada pelo profissional
      if (
        a.atribuicaoStatus === "Devolvido" ||
        a.atribuicaoStatus === "Rejeitado" ||
        a.atribuicaoStatus === "Recusado"
      ) {
        const devTime = getMillisVal(a.updatedAt || baseTime);
        items.push({
          id: `acolhimento-devolvido-${a.id}`,
          type: "alert",
          title: "Encaminhamento Devolvido / Rejeitado pelo Profissional",
          desc: `O profissional anterior não pôde assumir o atendimento (${a.motivoDevolucao || a.justificativaRecusa || "Sem justificativa detalhada"}). Reatribuição urgente necessária.`,
          date: formatDateTimeSafely(a.updatedAt || devTime),
          timestamp: devTime,
          treated: treatedItemIds.has(`acolhimento-devolvido-${a.id}`),
          priority: "alta",
        });
      }

      // 1.5 Aguardando aceite do profissional atribuído
      if (
        a.profissionalId &&
        (!a.atribuicaoStatus || a.atribuicaoStatus === "Pendente") &&
        a.status !== "Inativo" &&
        a.status !== "Standby"
      ) {
        const atribTime = getMillisVal(a.atribuidoEm || a.updatedAt || baseTime);
        items.push({
          id: `acolhimento-aguardando-aceite-prof-${a.id}`,
          type: "pendency",
          title: `Aguardando Aceite do Psicólogo (${a.profissionalNome || "Profissional"})`,
          desc: `Caso encaminhado em ${formatDateSafely(a.atribuidoEm || a.updatedAt)}. Aguardando confirmação do profissional para início das sessões.`,
          date: formatDateTimeSafely(a.atribuidoEm || atribTime),
          timestamp: atribTime,
          treated: treatedItemIds.has(`acolhimento-aguardando-aceite-prof-${a.id}`),
          priority: "media",
        });
      }

      // 1.6 Contrato clínico pendente de assinatura
      if (
        (a.status === "Em Atendimento" || a.status === "Aguardando Início" || a.atribuicaoStatus === "Aceito") &&
        !a.contratoAssinado &&
        a.status !== "Inativo"
      ) {
        items.push({
          id: `acolhimento-contrato-pendente-${a.id}`,
          type: "pendency",
          title: "Contrato de Prestação de Serviços Pendente",
          desc: "Paciente em atendimento ou pré-atendimento com contrato ainda não assinado formalmente.",
          date: formatDateSafely(a.createdAt || baseTime),
          timestamp: baseTime,
          treated: treatedItemIds.has(`acolhimento-contrato-pendente-${a.id}`),
          priority: "media",
        });
      }

      // 1.7 Solicitação de desligamento / inativação pendente
      if (a.statusInativacao === "Solicitado" || a.statusInativacao === "Em Análise") {
        const inatTime = getMillisVal(a.solicitacaoInativacaoEm || a.updatedAt || baseTime);
        items.push({
          id: `acolhimento-inativacao-${a.id}`,
          type: "alert",
          title: "Solicitação de Desligamento / Encerramento",
          desc: `Pedido de desligamento registrado (${a.motivoInativacao || a.motivoDesligamento || "Ver detalhes na ficha"}). Aguarda homologação da triagem/gestão.`,
          date: formatDateTimeSafely(a.solicitacaoInativacaoEm || inatTime),
          timestamp: inatTime,
          treated: treatedItemIds.has(`acolhimento-inativacao-${a.id}`),
          priority: "alta",
        });
      }

      // 1.8 Mensagens e anotações na ficha (notificacao log)
      if (a.notificacao && a.notificacao.trim()) {
        const blocks = a.notificacao
          .split(/\n+/)
          .map((b: string) => b.trim())
          .filter(Boolean);

        blocks.forEach((block: string, idx: number) => {
          const dateMatch = block.match(/^\[(.*?)\]/);
          let dateStr = "";
          let text = block;
          let calculatedTimestamp = baseTime;

          if (dateMatch) {
            dateStr = dateMatch[1];
            text = block.replace(/^\[.*?\]/, "").trim();
            calculatedTimestamp = parseLogDateToMillis(dateStr, a.updatedAt || baseTime);
          } else {
            dateStr = formatDateTimeSafely(a.updatedAt || baseTime);
          }

          const isSystemLog =
            block.includes("Movido para") ||
            block.includes("Atribuído") ||
            block.includes("Desatribuído") ||
            block.includes("devolvido") ||
            block.includes("status");

          const notifId = `acolhimento-notif-${a.id}-${idx}`;
          items.push({
            id: notifId,
            type: isSystemLog ? "task" : "message",
            title: isSystemLog ? "Movimentação de Sistema / Triagem" : "Anotação da Equipe / Mensagem",
            desc: text,
            date: dateStr,
            timestamp: calculatedTimestamp,
            treated: treatedItemIds.has(notifId),
            priority: isSystemLog ? "baixa" : "media",
          });
        });
      }

      // Filter only untreated items
      const untreatedItems = items.filter((it) => !it.treated);
      if (untreatedItems.length > 0) {
        // Sort items chronologically
        untreatedItems.sort((x, y) => x.timestamp - y.timestamp);
        const oldest = untreatedItems[0].timestamp;
        const newest = untreatedItems[untreatedItems.length - 1].timestamp;

        cards.push({
          entityId: a.id,
          entityType: "paciente",
          entityName: pName,
          entitySubtitle: `Via: ${a.viaAcesso || "Particular"}${a.empresa ? ` • ${a.empresa}` : ""} | Queixa: ${a.motivo || "Geral"}`,
          entityContact: a.telefone,
          entityEmail: a.email,
          entityBadge: a.status || "Aguardando Avaliação",
          entityRawObj: a,
          items: untreatedItems,
          oldestTimestamp: oldest,
          newestTimestamp: newest,
          hasCriticalAlert: untreatedItems.some((it) => it.type === "alert"),
        });
      }
    });

    // 2. PROFISSIONAIS LEADS & ATIVOS
    profissionaisLeads.forEach((p) => {
      const items: GestaoDemandItem[] = [];
      const baseTime = getMillisVal(p.createdAt || Date.now());

      if (!p.status || p.status === "Aguardando Entrevista" || p.status === "Pendente") {
        const leadId = `prof-lead-novo-${p.id}`;
        items.push({
          id: leadId,
          type: "task",
          title: "Novo Profissional Parceiro - Aguardando Entrevista",
          desc: `Psicólogo(a) cadastrado(a) (CRP: ${p.crp || "Pendente"}, ${p.cidade || ""}-${p.uf || ""}). Aguarda agendamento de entrevista e alinhamento ético.`,
          date: formatDateTimeSafely(p.createdAt || baseTime),
          timestamp: baseTime,
          treated: treatedItemIds.has(leadId),
          priority: "alta",
        });
      }

      if (p.notificacao && p.notificacao.trim()) {
        const notifId = `prof-lead-notif-${p.id}`;
        items.push({
          id: notifId,
          type: "message",
          title: "Mensagem / Observação do Cadastro Profissional",
          desc: p.notificacao,
          date: formatDateTimeSafely(p.updatedAt || baseTime),
          timestamp: getMillisVal(p.updatedAt || baseTime),
          treated: treatedItemIds.has(notifId),
          priority: "media",
        });
      }

      const untreatedItems = items.filter((it) => !it.treated);
      if (untreatedItems.length > 0) {
        untreatedItems.sort((x, y) => x.timestamp - y.timestamp);
        cards.push({
          entityId: p.id,
          entityType: "profissional",
          entityName: p.nome || "Profissional Parceiro",
          entitySubtitle: `CRP: ${p.crp || "Não informado"} | ${p.email || p.telefone || ""}`,
          entityContact: p.telefone,
          entityEmail: p.email,
          entityBadge: p.status || "Aguardando Entrevista",
          entityRawObj: p,
          items: untreatedItems,
          oldestTimestamp: untreatedItems[0].timestamp,
          newestTimestamp: untreatedItems[untreatedItems.length - 1].timestamp,
          hasCriticalAlert: untreatedItems.some((it) => it.type === "alert"),
        });
      }
    });

    // 2.1 Profissionais Ativos (Capacidade & Pendências Cadastrais)
    profissionaisAtivos.forEach((prof) => {
      const items: GestaoDemandItem[] = [];
      const baseTime = getMillisVal(prof.createdAt || Date.now());

      // Alerta de capacidade esgotada
      const isAtCap = profissionaisAtCapacity.some((c) => c.id === prof.id || c.uid === prof.uid || c.id === prof.uid);
      if (isAtCap) {
        const capId = `prof-cap-max-${prof.id || prof.uid}`;
        items.push({
          id: capId,
          type: "alert",
          title: "Capacidade Máxima / Sobrecarga de Horas Atingida",
          desc: `Profissional atingiu ou superou o limite de horas voluntárias/sociais disponibilizadas (${prof.horasDisponiveis || "Sem limite fixado"}).`,
          date: formatDateTimeSafely(Date.now()),
          timestamp: Date.now(),
          treated: treatedItemIds.has(capId),
          priority: "alta",
        });
      }

      // Pendência de cadastro crítico
      const missingCrit: string[] = [];
      if (!prof.crp || !prof.crp.trim()) missingCrit.push("CRP");
      if (!prof.telefone || !prof.telefone.trim()) missingCrit.push("WhatsApp");
      if (!prof.cpf || !prof.cpf.trim()) missingCrit.push("CPF");
      if (!prof.pixKey || !prof.pixKey.trim()) missingCrit.push("Chave PIX");

      if (missingCrit.length > 0) {
        const cadId = `prof-cad-incompl-${prof.id || prof.uid}`;
        items.push({
          id: cadId,
          type: "pendency",
          title: `Ficha Cadastral Incompleta (${missingCrit.join(", ")})`,
          desc: `Profissional ativo na plataforma com dados regulatórios ou de faturamento pendentes: ${missingCrit.join(", ")}.`,
          date: formatDateSafely(prof.updatedAt || baseTime),
          timestamp: baseTime,
          treated: treatedItemIds.has(cadId),
          priority: "media",
        });
      }

      if (prof.notificacao && prof.notificacao.trim()) {
        const notifId = `prof-ativo-notif-${prof.id || prof.uid}`;
        items.push({
          id: notifId,
          type: "message",
          title: "Mensagem da Coordenação / Nota Clínica",
          desc: prof.notificacao,
          date: formatDateTimeSafely(prof.updatedAt || baseTime),
          timestamp: getMillisVal(prof.updatedAt || baseTime),
          treated: treatedItemIds.has(notifId),
          priority: "media",
        });
      }

      const untreatedItems = items.filter((it) => !it.treated);
      if (untreatedItems.length > 0) {
        untreatedItems.sort((x, y) => x.timestamp - y.timestamp);
        cards.push({
          entityId: prof.id || prof.uid || "prof",
          entityType: "profissional",
          entityName: prof.name || prof.nome || "Profissional Ativo",
          entitySubtitle: `CRP: ${prof.crp || "Pendente"} • ${prof.email || prof.telefone || ""}`,
          entityContact: prof.telefone,
          entityEmail: prof.email,
          entityBadge: isAtCap ? "Capacidade Esgotada" : "Ativo",
          entityRawObj: prof,
          items: untreatedItems,
          oldestTimestamp: untreatedItems[0].timestamp,
          newestTimestamp: untreatedItems[untreatedItems.length - 1].timestamp,
          hasCriticalAlert: untreatedItems.some((it) => it.type === "alert"),
        });
      }
    });

    // 3. EMPRESAS PARCEIRAS (LEADS)
    empresasLeads.forEach((e) => {
      const items: GestaoDemandItem[] = [];
      const baseTime = getMillisVal(e.createdAt || Date.now());

      if (!e.status || e.status === "Aguardando" || e.status === "Pendente" || e.status === "Aguardando Contato") {
        const empId = `emp-lead-novo-${e.id}`;
        items.push({
          id: empId,
          type: "task",
          title: "Nova Empresa Interessada - Aguardando Primeiro Contato",
          desc: `Empresa ${e.nomeEmpresa || e.nome} cadastrada (${e.colaboradores || "N/I"} colaboradores). Contato: ${e.contatoNome || ""} (${e.telefone || e.email}).`,
          date: formatDateTimeSafely(e.createdAt || baseTime),
          timestamp: baseTime,
          treated: treatedItemIds.has(empId),
          priority: "alta",
        });
      }

      if (e.status === "Em Negociação" || e.status === "Proposta Enviada") {
        const negId = `emp-lead-neg-${e.id}`;
        items.push({
          id: negId,
          type: "pendency",
          title: "Convênio Corporativo em Negociação",
          desc: `Aguardando formalização e retorno sobre a proposta enviada para ${e.nomeEmpresa || e.nome}.`,
          date: formatDateSafely(e.updatedAt || baseTime),
          timestamp: getMillisVal(e.updatedAt || baseTime),
          treated: treatedItemIds.has(negId),
          priority: "media",
        });
      }

      if (e.notificacao && e.notificacao.trim()) {
        const notifId = `emp-lead-notif-${e.id}`;
        items.push({
          id: notifId,
          type: "message",
          title: "Anotação de Reunião / Contato com a Empresa",
          desc: e.notificacao,
          date: formatDateTimeSafely(e.updatedAt || baseTime),
          timestamp: getMillisVal(e.updatedAt || baseTime),
          treated: treatedItemIds.has(notifId),
          priority: "media",
        });
      }

      const untreatedItems = items.filter((it) => !it.treated);
      if (untreatedItems.length > 0) {
        untreatedItems.sort((x, y) => x.timestamp - y.timestamp);
        cards.push({
          entityId: e.id,
          entityType: "empresa",
          entityName: e.nomeEmpresa || e.nome || "Empresa Parceira",
          entitySubtitle: `Ramo: ${e.ramoAtividade || "Geral"} | Contato: ${e.contatoNome || "Responsável"}`,
          entityContact: e.telefone,
          entityEmail: e.email,
          entityBadge: e.status || "Aguardando Contato",
          entityRawObj: e,
          items: untreatedItems,
          oldestTimestamp: untreatedItems[0].timestamp,
          newestTimestamp: untreatedItems[untreatedItems.length - 1].timestamp,
          hasCriticalAlert: untreatedItems.some((it) => it.type === "alert"),
        });
      }
    });

    // 4. APOIO SOLIDÁRIO (SOLICITAÇÕES DE AJUDA)
    solicitacoes.forEach((s) => {
      const items: GestaoDemandItem[] = [];
      const baseTime = getMillisVal(s.createdAt || Date.now());

      if (!s.status || s.status === "Aguardando" || s.status === "Pendente") {
        const solId = `apoio-sol-${s.id}`;
        items.push({
          id: solId,
          type: "task",
          title: "Solicitação de Apoio Solidário Pendente",
          desc: `Pessoa solicitou ajuda solidária/social (${s.motivo || "Sem descrição detalhada"}). Aguarda triagem socioeconômica.`,
          date: formatDateTimeSafely(s.createdAt || baseTime),
          timestamp: baseTime,
          treated: treatedItemIds.has(solId),
          priority: "media",
        });
      }

      if (s.notificacao && s.notificacao.trim()) {
        const notifId = `apoio-notif-${s.id}`;
        items.push({
          id: notifId,
          type: "message",
          title: "Observação Social / Triagem",
          desc: s.notificacao,
          date: formatDateTimeSafely(s.updatedAt || baseTime),
          timestamp: getMillisVal(s.updatedAt || baseTime),
          treated: treatedItemIds.has(notifId),
          priority: "baixa",
        });
      }

      const untreatedItems = items.filter((it) => !it.treated);
      if (untreatedItems.length > 0) {
        untreatedItems.sort((x, y) => x.timestamp - y.timestamp);
        cards.push({
          entityId: s.id,
          entityType: "apoio_solidario",
          entityName: s.nome || "Solicitante de Apoio",
          entitySubtitle: `Motivo: ${s.motivo || "Ajuda solidária"} • Contato: ${s.telefone || ""}`,
          entityContact: s.telefone,
          entityBadge: s.status || "Aguardando",
          entityRawObj: s,
          items: untreatedItems,
          oldestTimestamp: untreatedItems[0].timestamp,
          newestTimestamp: untreatedItems[untreatedItems.length - 1].timestamp,
          hasCriticalAlert: untreatedItems.some((it) => it.type === "alert"),
        });
      }
    });

    // 5. DOAÇÕES PENDENTES
    doacoes.forEach((d) => {
      if (d.status === "Pendente") {
        const baseTime = getMillisVal(d.createdAt || Date.now());
        const doacId = `doacao-pendente-${d.id}`;
        if (!treatedItemIds.has(doacId)) {
          cards.push({
            entityId: d.id,
            entityType: "doacao",
            entityName: d.nome || "Doador Solidário",
            entitySubtitle: `Valor: R$ ${d.valor || 0} • Email: ${d.email || "Não informado"}`,
            entityEmail: d.email,
            entityBadge: "Pendente",
            entityRawObj: d,
            items: [
              {
                id: doacId,
                type: "pendency",
                title: "Doação Aguardando Confirmação / Baixa",
                desc: `Doação no valor de R$ ${d.valor || 0} registrada, aguardando conciliação ou confirmação bancária.`,
                date: formatDateTimeSafely(d.createdAt || baseTime),
                timestamp: baseTime,
                treated: false,
                priority: "baixa",
              },
            ],
            oldestTimestamp: baseTime,
            newestTimestamp: baseTime,
            hasCriticalAlert: false,
          });
        }
      }
    });

    // 6. COMPLIANCE & OUVIDORIA
    complianceMessages.forEach((m) => {
      if (!m.status || m.status === "Pendente") {
        const baseTime = getMillisVal(m.createdAt || Date.now());
        const compId = `compliance-msg-${m.id}`;
        if (!treatedItemIds.has(compId)) {
          cards.push({
            entityId: m.id,
            entityType: "compliance",
            entityName: m.nome || m.autor || "Manifestação Ética / Compliance",
            entitySubtitle: `Tipo: ${m.tipo || "Relato / Dúvida"} • Email: ${m.email || "Confidencial"}`,
            entityEmail: m.email,
            entityContact: m.telefone,
            entityBadge: "Aberto",
            entityRawObj: m,
            items: [
              {
                id: compId,
                type: "alert",
                title: "Manifestação de Compliance / Ouvidoria Pendente",
                desc: m.mensagem || m.descricao || "Relato submetido no canal de integridade aguardando avaliação e resposta.",
                date: formatDateTimeSafely(m.createdAt || baseTime),
                timestamp: baseTime,
                treated: false,
                priority: "alta",
              },
            ],
            oldestTimestamp: baseTime,
            newestTimestamp: baseTime,
            hasCriticalAlert: true,
          });
        }
      }
    });

    return cards;
  }, [
    acolhimentos,
    profissionaisLeads,
    profissionaisAtivos,
    empresasLeads,
    solicitacoes,
    doacoes,
    complianceMessages,
    profissionaisAtCapacity,
    treatedItemIds,
  ]);

  // Filter and sort the Esteira
  const filteredAndSortedCards = useMemo(() => {
    let list = [...allCards];

    // Category filter
    if (filterCategory !== "all") {
      list = list.filter((c) => c.entityType === filterCategory);
    }

    // Demand type filter
    if (filterType !== "all") {
      list = list.filter((c) => c.items.some((it) => it.type === filterType));
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.entityName.toLowerCase().includes(q) ||
          c.entitySubtitle.toLowerCase().includes(q) ||
          (c.entityContact && c.entityContact.toLowerCase().includes(q)) ||
          (c.entityEmail && c.entityEmail.toLowerCase().includes(q)) ||
          c.items.some((it) => it.title.toLowerCase().includes(q) || it.desc.toLowerCase().includes(q))
      );
    }

    // Sorting: FIFO (Oldest on top - mandated by user!) vs Recent vs Priority
    if (sortOrder === "fifo") {
      list.sort((a, b) => a.oldestTimestamp - b.oldestTimestamp); // Oldest first on top!
    } else if (sortOrder === "recent") {
      list.sort((a, b) => b.newestTimestamp - a.newestTimestamp); // Newest first
    } else if (sortOrder === "priority") {
      list.sort((a, b) => {
        if (a.hasCriticalAlert && !b.hasCriticalAlert) return -1;
        if (!a.hasCriticalAlert && b.hasCriticalAlert) return 1;
        return a.oldestTimestamp - b.oldestTimestamp;
      });
    }

    return list;
  }, [allCards, filterCategory, filterType, searchQuery, sortOrder]);

  // Metrics summary
  const totalUntreatedDemands = allCards.reduce((acc, c) => acc + c.items.length, 0);
  const totalCriticalAlerts = allCards.reduce((acc, c) => acc + c.items.filter((it) => it.type === "alert").length, 0);
  const totalTasks = allCards.reduce((acc, c) => acc + c.items.filter((it) => it.type === "task").length, 0);
  const totalPendencies = allCards.reduce((acc, c) => acc + c.items.filter((it) => it.type === "pendency").length, 0);
  const totalMessages = allCards.reduce((acc, c) => acc + c.items.filter((it) => it.type === "message").length, 0);

  // Time elapsed helper
  const getElapsedWaitText = (timestamp: number) => {
    const diffMs = Date.now() - timestamp;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `Aguardando há ${diffDays} ${diffDays === 1 ? "dia" : "dias"}`;
    }
    if (diffHours > 0) {
      return `Aguardando há ${diffHours}h`;
    }
    if (diffMin > 5) {
      return `Aguardando há ${diffMin} min`;
    }
    return "Recebido recentemente";
  };

  const getEntityIcon = (type: GestaoEntityCard["entityType"]) => {
    switch (type) {
      case "paciente":
        return <User className="w-4 h-4 text-emerald-700" />;
      case "profissional":
        return <Users className="w-4 h-4 text-blue-700" />;
      case "empresa":
        return <Building2 className="w-4 h-4 text-purple-700" />;
      case "apoio_solidario":
        return <HeartHandshake className="w-4 h-4 text-amber-700" />;
      case "doacao":
        return <Sparkles className="w-4 h-4 text-indigo-700" />;
      case "compliance":
        return <ShieldAlert className="w-4 h-4 text-red-700" />;
      default:
        return <Inbox className="w-4 h-4 text-forest" />;
    }
  };

  const getEntityTypeName = (type: GestaoEntityCard["entityType"]) => {
    switch (type) {
      case "paciente":
        return "Paciente / Acolhido";
      case "profissional":
        return "Profissional Parceiro";
      case "empresa":
        return "Empresa Parceira";
      case "apoio_solidario":
        return "Apoio Solidário";
      case "doacao":
        return "Doação";
      case "compliance":
        return "Compliance / Ética";
      default:
        return "Demanda";
    }
  };

  const getItemTypeBadge = (type: DemandType) => {
    switch (type) {
      case "alert":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
            <AlertTriangle className="w-3 h-3 text-red-600" />
            Alerta Crítico
          </span>
        );
      case "task":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Zap className="w-3 h-3 text-blue-600" />
            Tarefa de Triagem
          </span>
        );
      case "pendency":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Pendência
          </span>
        );
      case "message":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <MessageCircle className="w-3 h-3 text-emerald-600" />
            Mensagem / Nota
          </span>
        );
    }
  };

  const handleOpenEntity = (card: GestaoEntityCard) => {
    if (card.entityType === "paciente") {
      onSelectAcolhimento(card.entityRawObj);
    } else if (card.entityType === "profissional") {
      onSelectProfissional(card.entityRawObj);
    } else if (card.entityType === "empresa") {
      onSelectEmpresa(card.entityRawObj);
    } else if (card.entityType === "apoio_solidario" || card.entityType === "doacao") {
      onNavigateToTab("doacoes");
    } else if (card.entityType === "compliance") {
      onNavigateToTab("compliance");
    }
  };

  // Tratar a próxima demanda mais antiga da esteira
  const handleTratarProximo = () => {
    if (filteredAndSortedCards.length > 0) {
      handleOpenEntity(filteredAndSortedCards[0]);
    }
  };

  return (
    <div className="flex-1 overflow-auto p-4 md:p-8 flex flex-col gap-6 slide-up bg-warm">
      <div className="max-w-7xl w-full mx-auto flex flex-col gap-6">
        {/* Top Header & Metrics Banner */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-soft shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest/10 border border-forest/20 flex items-center justify-center text-forest shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-base sm:text-lg font-bold text-forest">
                  Esteira de Tarefas & Pendências
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-forest text-white">
                  {totalUntreatedDemands} {totalUntreatedDemands === 1 ? "demanda" : "demandas"}
                </span>
              </div>
              <p className="text-[11px] text-forest/70 mt-0.5 max-w-2xl leading-relaxed">
                Demandas pendentes agrupadas por paciente, profissional ou empresa em ordem cronológica (FIFO).
              </p>
            </div>
          </div>

          {/* Quick Action & Totals Summary */}
          <div className="flex flex-wrap items-center gap-2 self-stretch lg:self-auto justify-end">
            {filteredAndSortedCards.length > 0 && (
              <button
                type="button"
                onClick={handleTratarProximo}
                className="px-3 py-1.5 bg-forest text-white hover:bg-forest/90 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all shadow-2xs hover:scale-102 active:scale-98 cursor-pointer"
                title="Abrir a demanda que está esperando há mais tempo no topo da esteira"
              >
                <Zap className="w-3.5 h-3.5 text-sun" />
                <span>Tratar Próxima Demanda</span>
              </button>
            )}
          </div>
        </div>

        {/* Minimal Metrics Cells */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-soft shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <span className="block font-bold text-lg text-forest leading-none">{totalCriticalAlerts}</span>
              <span className="text-[11px] font-semibold text-forest/70 uppercase tracking-wider">Alertas Críticos</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-soft shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <span className="block font-bold text-lg text-forest leading-none">{totalTasks}</span>
              <span className="text-[11px] font-semibold text-forest/70 uppercase tracking-wider">Triagens / Fluxos</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-soft shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="block font-bold text-lg text-forest leading-none">{totalPendencies}</span>
              <span className="text-[11px] font-semibold text-forest/70 uppercase tracking-wider">Pendências</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-soft shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="block font-bold text-lg text-forest leading-none">{totalMessages}</span>
              <span className="text-[11px] font-semibold text-forest/70 uppercase tracking-wider">Mensagens & Notas</span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-soft shadow-xs flex items-center gap-3 col-span-2 sm:col-span-1">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="block font-bold text-lg text-forest leading-none">{allCards.length}</span>
              <span className="text-[11px] font-semibold text-forest/70 uppercase tracking-wider">Casos na Esteira</span>
            </div>
          </div>
        </div>

        {/* Filter & Control Bar */}
        <div className="bg-white border border-soft rounded-[2rem] shadow-sm p-4 md:p-5 flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Category Pills */}
            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { id: "all", name: "Todos", count: allCards.length },
                {
                  id: "paciente",
                  name: "Pacientes / Triagem",
                  count: allCards.filter((c) => c.entityType === "paciente").length,
                },
                {
                  id: "profissional",
                  name: "Profissionais",
                  count: allCards.filter((c) => c.entityType === "profissional").length,
                },
                ...(currentRole === "master"
                  ? [
                      {
                        id: "empresa",
                        name: "Empresas",
                        count: allCards.filter((c) => c.entityType === "empresa").length,
                      },
                      {
                        id: "apoio_solidario",
                        name: "Apoio Solidário",
                        count: allCards.filter((c) => c.entityType === "apoio_solidario").length,
                      },
                      {
                        id: "compliance",
                        name: "Compliance",
                        count: allCards.filter((c) => c.entityType === "compliance").length,
                      },
                    ]
                  : []),
              ].map((tab) => {
                const isActive = filterCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterCategory(tab.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      isActive
                        ? "bg-forest text-white shadow-xs"
                        : "bg-warm/60 text-forest/70 hover:text-forest hover:bg-warm border border-soft"
                    }`}
                  >
                    {tab.name}
                    {tab.count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isActive
                            ? "bg-white text-forest"
                            : "bg-forest/10 text-forest"
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Sort order & Search Input */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-forest/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar na esteira..."
                  className="w-full pl-9 pr-4 py-2 bg-warm/40 text-xs text-forest placeholder:text-forest/40 border border-soft rounded-full focus:outline-none focus:border-sun-dark focus:bg-white transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-forest/40 hover:text-forest text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Sort Switcher */}
              <div className="flex items-center gap-1 bg-warm/50 border border-soft rounded-full p-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setSortOrder("fifo")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-full transition-all flex items-center gap-1 ${
                    sortOrder === "fifo"
                      ? "bg-white text-forest shadow-xs font-black"
                      : "text-forest/60 hover:text-forest"
                  }`}
                  title="Ordem da Esteira: Mais antigos no topo (FIFO)"
                >
                  <ArrowUpDown className="w-3 h-3 text-sun-dark" />
                  <span>Mais Antigos (Esteira)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSortOrder("recent")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-full transition-all flex items-center gap-1 ${
                    sortOrder === "recent"
                      ? "bg-white text-forest shadow-xs font-black"
                      : "text-forest/60 hover:text-forest"
                  }`}
                  title="Mais recentes primeiro"
                >
                  <span>Mais Recentes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSortOrder("priority")}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-full transition-all flex items-center gap-1 ${
                    sortOrder === "priority"
                      ? "bg-white text-red-700 shadow-xs font-black"
                      : "text-forest/60 hover:text-red-700"
                  }`}
                  title="Alertas críticos primeiro"
                >
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  <span>Críticos 1º</span>
                </button>
              </div>
            </div>
          </div>

          {/* Subfilter by Demand Type */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-soft/60 text-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-forest/60 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filtrar tipo:
            </span>
            {[
              { id: "all", label: "Todos os Tipos" },
              { id: "alert", label: "🚨 Alertas Críticos" },
              { id: "task", label: "⚡ Triagens & Acolhimento" },
              { id: "pendency", label: "⏳ Pendências Documentais" },
              { id: "message", label: "💬 Mensagens & Notas" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFilterType(t.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  filterType === t.id
                    ? "bg-forest/10 text-forest border border-forest/30 font-bold"
                    : "text-forest/60 hover:text-forest hover:bg-warm/60"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Esteira Cards List (Consolidated per Entity) */}
        {filteredAndSortedCards.length === 0 ? (
          <div className="bg-white border border-soft rounded-[2rem] p-12 text-center flex flex-col items-center justify-center gap-4 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-serif text-2xl font-medium text-forest">
                Nenhuma pendência ou alerta não tratado!
              </h3>
              <p className="text-sm text-forest/60 max-w-md mx-auto mt-1">
                Todas as demandas da esteira foram tratadas e arquivadas. Quando novos acolhimentos, recusas ou alterações entrarem, eles aparecerão aqui automaticamente.
              </p>
            </div>
            {treatedItemIds.size > 0 && (
              <div className="mt-2 text-xs text-forest/50">
                <span>{treatedItemIds.size} itens marcados como tratados nesta sessão.</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-2 text-xs text-forest/60 font-semibold">
              <span>
                Exibindo {filteredAndSortedCards.length} {filteredAndSortedCards.length === 1 ? "caso" : "casos"} na esteira de trabalho
              </span>
              <span className="text-[11px] italic">
                {sortOrder === "fifo" ? "Ordem: Mais antigos no topo (FIFO)" : sortOrder === "recent" ? "Ordem: Mais recentes no topo" : "Ordem: Prioridade crítica"}
              </span>
            </div>

            {filteredAndSortedCards.map((card, index) => {
              const isExpanded = expandedCards[card.entityId] ?? true;
              const waitText = getElapsedWaitText(card.oldestTimestamp);

              return (
                <motion.div
                  key={card.entityId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className={`bg-white border rounded-2xl shadow-xs transition-all overflow-hidden ${
                    card.hasCriticalAlert
                      ? "border-red-300 ring-1 ring-red-100"
                      : "border-soft hover:border-forest/30"
                  }`}
                >
                  {/* Card Main Header */}
                  <div className="p-4 md:p-5 bg-gradient-to-r from-warm/40 via-white to-warm/20 border-b border-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      {/* Queue position badge */}
                      <div className="w-7 h-7 rounded-lg bg-forest/10 text-forest font-bold text-xs flex items-center justify-center shrink-0 border border-forest/10" title={`Posição ${index + 1} na esteira`}>
                        #{index + 1}
                      </div>

                      {/* Icon */}
                      <div className="w-10 h-10 rounded-xl bg-warm border border-soft flex items-center justify-center shrink-0">
                        {getEntityIcon(card.entityType)}
                      </div>

                      {/* Entity info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-forest/10 text-forest border border-forest/15">
                            {getEntityTypeName(card.entityType)}
                          </span>
                          <h3 className="font-serif text-lg font-bold text-forest truncate">
                            {card.entityName}
                          </h3>
                          {card.entityBadge && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-warm border border-soft text-forest/70">
                              {card.entityBadge}
                            </span>
                          )}
                          {card.hasCriticalAlert && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-red-500 text-white shadow-xs animate-pulse">
                              <AlertTriangle className="w-3 h-3" /> URGENTE
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-forest/70 mt-1 truncate">
                          {card.entitySubtitle}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-forest/60">
                          <span className="inline-flex items-center gap-1 font-semibold text-sun-dark">
                            <Clock className="w-3.5 h-3.5" />
                            {waitText}
                          </span>
                          {card.entityContact && (
                            <span className="inline-flex items-center gap-1 text-forest/70">
                              <Phone className="w-3 h-3" /> {card.entityContact}
                            </span>
                          )}
                          {card.entityEmail && (
                            <span className="inline-flex items-center gap-1 text-forest/70">
                              <Mail className="w-3 h-3" /> {card.entityEmail}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Controls Header */}
                    <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end shrink-0">
                      {card.entityContact && (
                        <a
                          href={`https://wa.me/55${card.entityContact.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                          title="Falar no WhatsApp"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenEntity(card)}
                        className="px-3.5 py-2 bg-forest text-white hover:bg-forest/90 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Abrir Ficha</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleExpandCard(card.entityId)}
                        className="p-2 text-forest/60 hover:text-forest bg-warm hover:bg-warm/80 border border-soft rounded-xl transition-colors"
                        title={isExpanded ? "Recolher demandas" : "Expandir demandas"}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Demands List inside Entity Card */}
                  {isExpanded && (
                    <div className="p-4 md:p-5 bg-white flex flex-col gap-3">
                      <div className="flex items-center justify-between text-xs text-forest/60 pb-1 border-b border-soft/60">
                        <span className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-forest">
                          <Layers className="w-3.5 h-3.5 text-forest/50" />
                          {card.items.length} {card.items.length === 1 ? "demanda/pendência associada" : "demandas/pendências associadas"} (Ordem Cronológica)
                        </span>

                        <button
                          type="button"
                          onClick={() => onMarkAllEntityTreated(card.items.map((i) => i.id))}
                          className="text-[11px] font-bold text-forest/60 hover:text-forest hover:underline flex items-center gap-1"
                          title="Marcar todas as demandas deste paciente/entidade como tratadas"
                        >
                          <Check className="w-3 h-3 text-emerald-600" />
                          Marcar todas como tratadas
                        </button>
                      </div>

                      <div className="flex flex-col gap-2.5">
                        {card.items.map((item) => (
                          <div
                            key={item.id}
                            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors ${
                              item.type === "alert"
                                ? "bg-red-50/50 border-red-200"
                                : item.type === "task"
                                ? "bg-blue-50/40 border-blue-200"
                                : item.type === "pendency"
                                ? "bg-amber-50/40 border-amber-200"
                                : "bg-emerald-50/30 border-emerald-200"
                            }`}
                          >
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <div className="mt-0.5">{getItemTypeBadge(item.type)}</div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-bold text-forest leading-snug">
                                  {item.title}
                                </h4>
                                <p className="text-xs text-forest/80 mt-0.5 leading-relaxed">
                                  {item.desc}
                                </p>
                                <span className="block text-[10px] text-forest/50 mt-1 font-mono">
                                  {item.date}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              <button
                                type="button"
                                onClick={() => onToggleTreatedItem(item.id)}
                                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white text-forest/70 hover:text-emerald-700 hover:bg-emerald-50 border border-soft hover:border-emerald-300 transition-all flex items-center gap-1 shadow-2xs"
                                title="Marcar como tratada"
                              >
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Tratado</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEntity(card)}
                                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-forest text-white hover:bg-forest/90 transition-all flex items-center gap-1 shadow-2xs"
                                title="Abrir ficha para tratar imediatamente"
                              >
                                <span>Resolver</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
