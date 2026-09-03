import React, { useState } from "react";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
  Search,
  User,
  ArrowRight,
  ExternalLink,
  MessageCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Check,
  Calendar,
  Layers,
  Inbox,
  ArrowUpDown,
  Phone,
  Mail,
  Send,
  Eye,
  BadgeAlert,
  ShieldCheck,
  FileSignature,
  Bell,
  Heart,
  HelpCircle,
  X,
  UserCheck,
  AlertCircle,
  RefreshCw,
  Lock
} from "lucide-react";
export interface UserProfile {
  uid?: string;
  id?: string;
  role?: string;
  name: string;
  email?: string;
  [key: string]: any;
}

export interface Acolhimento {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  valorSessao?: string;
  frequenciaSessoes?: string;
  motivoFrequencia?: string;
  viaAcesso: string;
  motivo: string;
  status: string;
  createdAt?: any;
  profissionalId?: string;
  [key: string]: any;
}

export type ProfDemandType = "assignment" | "contract" | "alert" | "system" | "profile" | "inactivation";

export interface ProfDemandItem {
  id: string;
  type: ProfDemandType;
  title: string;
  desc: string;
  date: string;
  timestamp: number;
  treated: boolean;
  priority?: "alta" | "media" | "baixa";
  patientObj?: Acolhimento;
  actionType?: "accept" | "contract" | "profile" | "view_patient" | "whatsapp";
}

export interface ProfEntityCard {
  entityId: string;
  entityType: "paciente" | "perfil_profissional";
  entityName: string;
  entitySubtitle: string;
  entityContact?: string;
  entityEmail?: string;
  entityBadge?: string;
  patientObj?: Acolhimento;
  items: ProfDemandItem[];
  oldestTimestamp: number;
  newestTimestamp: number;
  hasCriticalAlert: boolean;
  isPendingAcceptance?: boolean;
}

interface ProfissionalEsteiraTarefasProps {
  meusPacientes: Acolhimento[];
  profile: UserProfile;
  treatedItemIds: Set<string>;
  onToggleTreatedItem: (id: string) => void;
  onMarkAllEntityTreated: (itemIds: string[]) => void;
  onSelectPaciente: (paciente: Acolhimento) => void;
  onNavigateToTab: (tab: any) => void;
  onAcceptPaciente: (paciente: Acolhimento) => Promise<void> | void;
  onDevolverPaciente: (paciente: Acolhimento) => void;
  formatDateSafely: (val: any) => string;
  formatDateTimeSafely: (val: any) => string;
}

export function ProfissionalEsteiraTarefas({
  meusPacientes,
  profile,
  treatedItemIds,
  onToggleTreatedItem,
  onMarkAllEntityTreated,
  onSelectPaciente,
  onNavigateToTab,
  onAcceptPaciente,
  onDevolverPaciente,
  formatDateSafely,
  formatDateTimeSafely,
}: ProfissionalEsteiraTarefasProps) {
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "untreated" | "treated">("all");
  const [sortOrder, setSortOrder] = useState<"fifo" | "recent" | "priority">("fifo");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [isAcceptingId, setIsAcceptingId] = useState<string | null>(null);

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
    } catch (e) {
      // Ignored
    }
    return getMillisVal(fallback);
  };

  // Compile all entities into consolidated cards
  const allCards = (() => {
    const cards: ProfEntityCard[] = [];

    // 1. CARDS POR PACIENTE
    meusPacientes.forEach((p) => {
      const items: ProfDemandItem[] = [];
      const baseTime = getMillisVal(p.createdAt || p.dataHora || Date.now());
      const pName = p.nomeDesejado || p.nomeCivil || p.nome || "Paciente sem nome";
      const isPending = !p.atribuicaoStatus || p.atribuicaoStatus === "Pendente";

      // 1.1 Novo Encaminhamento aguardando aceite
      if (isPending) {
        items.push({
          id: `prof-assignment-${p.id}`,
          type: "assignment",
          title: "Novo Encaminhamento de Paciente",
          desc: `Paciente direcionado pela triagem (${p.viaAcesso || "Particular"}). Queixa principal: ${p.motivo || p.necessidade || "Ver detalhes na ficha"}. Revise a ficha clínica e decida pelo aceite ou devolução.`,
          date: formatDateTimeSafely(p.updatedAt || p.createdAt || baseTime),
          timestamp: getMillisVal(p.updatedAt || p.createdAt || baseTime),
          treated: treatedItemIds.has(`prof-assignment-${p.id}`),
          priority: "alta",
          patientObj: p,
          actionType: "accept",
        });
      }

      // 1.2 Contrato pendente de assinatura
      if (!p.contratoAssinado) {
        items.push({
          id: `prof-contract-${p.id}`,
          type: "contract",
          title: "Contrato Terapêutico Pendente",
          desc: "O Contrato de Prestação de Serviços Psicológicos ainda não foi validado ou assinado pelo paciente.",
          date: formatDateTimeSafely(p.createdAt || baseTime),
          timestamp: baseTime,
          treated: treatedItemIds.has(`prof-contract-${p.id}`),
          priority: "media",
          patientObj: p,
          actionType: "contract",
        });
      }

      // 1.3 Solicitação de inativação / desligamento
      if (p.statusInativacao === "Solicitado" || p.statusInativacao === "Em Análise") {
        items.push({
          id: `prof-inactivation-${p.id}`,
          type: "inactivation",
          title: "Solicitação de Inativação / Desligamento",
          desc: `Há um processo de encerramento em andamento para este paciente. Motivo informado: "${p.motivoInativacao || "Não informado"}".`,
          date: formatDateTimeSafely(p.updatedAt || baseTime),
          timestamp: getMillisVal(p.updatedAt || baseTime),
          treated: treatedItemIds.has(`prof-inactivation-${p.id}`),
          priority: "alta",
          patientObj: p,
          actionType: "view_patient",
        });
      }

      // 1.4 Dados atualizados recentemente
      if (
        p.updatedAt &&
        p.createdAt &&
        getMillisVal(p.updatedAt) - getMillisVal(p.createdAt) > 5000
      ) {
        items.push({
          id: `prof-updated-${p.id}`,
          type: "system",
          title: "Ficha / Informações Atualizadas",
          desc: "Informações cadastrais, telefones de contato ou observações clínicas do paciente foram atualizadas recentemente.",
          date: formatDateTimeSafely(p.updatedAt),
          timestamp: getMillisVal(p.updatedAt),
          treated: treatedItemIds.has(`prof-updated-${p.id}`),
          priority: "baixa",
          patientObj: p,
          actionType: "view_patient",
        });
      }

      // 1.5 Mensagens e Alertas da Coordenação (desmembrados do log)
      if (p.notificacao && p.notificacao.trim()) {
        const blocks = p.notificacao
          .split(/\n+/)
          .map((b) => b.trim())
          .filter(Boolean);

        blocks.forEach((block, idx) => {
          const dateMatch = block.match(/^\[(.*?)\]/);
          let dateStr = "";
          let text = block;
          let calculatedTimestamp = getMillisVal(p.updatedAt || baseTime);

          if (dateMatch) {
            dateStr = dateMatch[1];
            text = block.replace(/^\[.*?\]/, "").trim();
            calculatedTimestamp = parseLogDateToMillis(dateStr, p.updatedAt || baseTime);
          } else {
            dateStr = formatDateTimeSafely(p.updatedAt || baseTime);
          }

          const isSystemLog =
            block.includes("Movido para") ||
            block.includes("Atribuído") ||
            block.includes("Desatribuído") ||
            block.includes("devolvido") ||
            block.includes("status") ||
            block.includes("triagem");

          items.push({
            id: `prof-notif-${p.id}-${idx}`,
            type: isSystemLog ? "system" : "alert",
            title: isSystemLog ? "Movimentação do Caso" : "Mensagem da Coordenação / Gestão",
            desc: text,
            date: dateStr,
            timestamp: calculatedTimestamp,
            treated: treatedItemIds.has(`prof-notif-${p.id}-${idx}`),
            priority: isSystemLog ? "baixa" : "alta",
            patientObj: p,
            actionType: "view_patient",
          });
        });
      }

      if (items.length > 0) {
        const timestamps = items.map((i) => i.timestamp);
        const oldest = Math.min(...timestamps);
        const newest = Math.max(...timestamps);
        const hasCritical = items.some((i) => i.priority === "alta" && !i.treated);

        const isAceito = p.atribuicaoStatus === "Aceito";

        cards.push({
          entityId: `paciente-${p.id}`,
          entityType: "paciente",
          entityName: pName,
          entitySubtitle: `Via ${p.viaAcesso || "Particular"} • Status: ${p.status || "Ativo"}${p.faixaRenda ? ` • Renda: ${p.faixaRenda}` : ""}`,
          entityContact: isAceito ? (p.whatsapp || p.telefone || "") : "",
          entityEmail: isAceito ? (p.email || "") : "",
          entityBadge: p.viaAcesso || "Particular",
          patientObj: p,
          items,
          oldestTimestamp: oldest,
          newestTimestamp: newest,
          hasCriticalAlert: hasCritical,
          isPendingAcceptance: isPending,
        });
      }
    });

    // 2. CARD DO PERFIL DO PROFISSIONAL (PENDÊNCIAS CADASTRAIS)
    if (profile) {
      const missingFields: { name: string; label: string }[] = [];
      if (!profile.photoUrl) missingFields.push({ name: "photoUrl", label: "Foto de Perfil" });
      if (!profile.telefone || !profile.telefone.trim()) missingFields.push({ name: "telefone", label: "Telefone / WhatsApp Comercial" });
      if (!profile.cpf || !profile.cpf.trim()) missingFields.push({ name: "cpf", label: "CPF" });
      if (!profile.pixKey || !profile.pixKey.trim()) missingFields.push({ name: "pixKey", label: "Chave PIX" });
      if (!profile.crp || !profile.crp.trim()) missingFields.push({ name: "crp", label: "Registro Profissional (CRP)" });
      if (!profile.anoFormacao) missingFields.push({ name: "anoFormacao", label: "Ano de Formação" });
      if (!profile.abordagem || !profile.abordagem.trim()) missingFields.push({ name: "abordagem", label: "Abordagem Teórica" });
      if (!profile.especialidade || !profile.especialidade.trim()) missingFields.push({ name: "especialidade", label: "Especialidades Clínicas" });
      if (!profile.cidade || !profile.cidade.trim()) missingFields.push({ name: "cidade", label: "Cidade de Atendimento" });
      if (!profile.uf || !profile.uf.trim()) missingFields.push({ name: "uf", label: "Estado (UF)" });
      if (!profile.biografia || !profile.biografia.trim()) missingFields.push({ name: "biografia", label: "Mini-currículo & Biografia" });

      if (missingFields.length > 0) {
        const profItems: ProfDemandItem[] = [];

        profItems.push({
          id: "prof-profile-summary",
          type: "profile",
          title: "Ficha Cadastral Incompleta",
          desc: `Seu perfil profissional possui ${missingFields.length} campos pendentes: ${missingFields.map((f) => f.label).join(", ")}. Mantenha seus dados completos para receber novos encaminhamentos.`,
          date: "Pendente",
          timestamp: Date.now() + 50000,
          treated: treatedItemIds.has("prof-profile-summary"),
          priority: "alta",
          actionType: "profile",
        });

        if (!profile.photoUrl) {
          profItems.push({
            id: "prof-profile-photo",
            type: "profile",
            title: "Foto de Divulgação Ausente",
            desc: "Cadastre sua foto profissional para facilitar o acolhimento e a confiança dos pacientes.",
            date: "Pendente",
            timestamp: Date.now() + 49000,
            treated: treatedItemIds.has("prof-profile-photo"),
            priority: "media",
            actionType: "profile",
          });
        }

        if (!profile.telefone || !profile.telefone.trim()) {
          profItems.push({
            id: "prof-profile-phone",
            type: "profile",
            title: "Contato / WhatsApp Comercial em Branco",
            desc: "Seu WhatsApp comercial é essencial para o envio de mensagens automáticas e contato com os acolhidos.",
            date: "Pendente",
            timestamp: Date.now() + 48000,
            treated: treatedItemIds.has("prof-profile-phone"),
            priority: "alta",
            actionType: "profile",
          });
        }

        if (!profile.crp || !profile.crp.trim()) {
          profItems.push({
            id: "prof-profile-crp",
            type: "profile",
            title: "Registro Profissional (CRP) Pendente",
            desc: "Informe seu número de registro profissional para validação dos atendimentos e emissão de recibos.",
            date: "Pendente",
            timestamp: Date.now() + 47000,
            treated: treatedItemIds.has("prof-profile-crp"),
            priority: "alta",
            actionType: "profile",
          });
        }

        const timestamps = profItems.map((i) => i.timestamp);
        cards.push({
          entityId: "perfil-profissional",
          entityType: "perfil_profissional",
          entityName: profile.name || "Seu Perfil Cadastral",
          entitySubtitle: `${profile.profissao || "Profissional Parceiro"} • ${missingFields.length} pendências cadastrais`,
          entityContact: profile.telefone || "",
          entityEmail: profile.email || "",
          entityBadge: "Cadastro",
          items: profItems,
          oldestTimestamp: Math.min(...timestamps),
          newestTimestamp: Math.max(...timestamps),
          hasCriticalAlert: profItems.some((i) => i.priority === "alta" && !i.treated),
        });
      }
    }

    return cards;
  })();

  // Global totalizers across all cards
  const totalItemsCount = allCards.reduce((sum, c) => sum + c.items.length, 0);
  const untreatedItemsCount = allCards.reduce(
    (sum, c) => sum + c.items.filter((i) => !i.treated).length,
    0
  );
  const treatedItemsCount = totalItemsCount - untreatedItemsCount;

  const pendingAcceptanceCount = allCards.reduce(
    (sum, c) => sum + c.items.filter((i) => i.type === "assignment" && !i.treated).length,
    0
  );
  const pendingContractsCount = allCards.reduce(
    (sum, c) => sum + c.items.filter((i) => i.type === "contract" && !i.treated).length,
    0
  );
  const pendingAlertsCount = allCards.reduce(
    (sum, c) => sum + c.items.filter((i) => i.type === "alert" && !i.treated).length,
    0
  );
  const pendingProfileCount = allCards.reduce(
    (sum, c) => sum + c.items.filter((i) => i.type === "profile" && !i.treated).length,
    0
  );

  // Filtered and Sorted Cards
  const filteredCards = (() => {
    let result = allCards.map((card) => {
      // Filter individual items within the card
      const filteredItems = card.items.filter((item) => {
        // Status filter
        if (filterStatus === "untreated" && item.treated) return false;
        if (filterStatus === "treated" && !item.treated) return false;

        // Category filter
        if (filterCategory === "assignment" && item.type !== "assignment") return false;
        if (filterCategory === "contract" && item.type !== "contract") return false;
        if (filterCategory === "alert" && item.type !== "alert") return false;
        if (filterCategory === "system" && item.type !== "system") return false;
        if (filterCategory === "profile" && item.type !== "profile") return false;

        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchCard =
            card.entityName.toLowerCase().includes(q) ||
            card.entitySubtitle.toLowerCase().includes(q) ||
            (card.entityContact && card.entityContact.toLowerCase().includes(q)) ||
            (card.entityEmail && card.entityEmail.toLowerCase().includes(q));
          const matchItem =
            item.title.toLowerCase().includes(q) ||
            item.desc.toLowerCase().includes(q) ||
            item.date.toLowerCase().includes(q);
          if (!matchCard && !matchItem) return false;
        }

        return true;
      });

      return {
        ...card,
        items: filteredItems,
      };
    });

    // Remove cards that have 0 matching items
    result = result.filter((card) => card.items.length > 0);

    // Sort cards according to selected order
    result.sort((a, b) => {
      if (sortOrder === "fifo") {
        // Oldest item first (FIFO queue)
        return a.oldestTimestamp - b.oldestTimestamp;
      }
      if (sortOrder === "recent") {
        // Newest item first (LIFO)
        return b.newestTimestamp - a.newestTimestamp;
      }
      if (sortOrder === "priority") {
        // Critical alerts first, then FIFO
        if (a.hasCriticalAlert && !b.hasCriticalAlert) return -1;
        if (!a.hasCriticalAlert && b.hasCriticalAlert) return 1;
        return a.oldestTimestamp - b.oldestTimestamp;
      }
      return 0;
    });

    return result;
  })();

  const handleMarkAllFilteredTreated = () => {
    const allFilteredIds = filteredCards.flatMap((c) => c.items.map((i) => i.id));
    onMarkAllEntityTreated(allFilteredIds);
  };

  const getCategoryBadgeClass = (type: ProfDemandType) => {
    switch (type) {
      case "assignment":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "contract":
        return "bg-blue-50 text-blue-800 border-blue-200";
      case "alert":
        return "bg-red-50 text-red-800 border-red-200";
      case "inactivation":
        return "bg-purple-50 text-purple-800 border-purple-200";
      case "profile":
        return "bg-orange-50 text-orange-800 border-orange-200";
      case "system":
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getCategoryLabel = (type: ProfDemandType) => {
    switch (type) {
      case "assignment":
        return "Novo Encaminhamento";
      case "contract":
        return "Contrato Pendente";
      case "alert":
        return "Alerta da Coordenação";
      case "inactivation":
        return "Inativação / Desligamento";
      case "profile":
        return "Cadastro Profissional";
      case "system":
      default:
        return "Movimentação";
    }
  };

  const getCategoryIcon = (type: ProfDemandType) => {
    switch (type) {
      case "assignment":
        return <UserCheck className="w-3.5 h-3.5 text-amber-600" />;
      case "contract":
        return <FileSignature className="w-3.5 h-3.5 text-blue-600" />;
      case "alert":
        return <AlertTriangle className="w-3.5 h-3.5 text-red-600" />;
      case "inactivation":
        return <AlertCircle className="w-3.5 h-3.5 text-purple-600" />;
      case "profile":
        return <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />;
      case "system":
      default:
        return <Layers className="w-3.5 h-3.5 text-slate-600" />;
    }
  };

  const openWhatsApp = (phone: string, name: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(`Olá ${name}, tudo bem? Sou o(a) ${profile?.name || "seu(sua) terapeuta"} do Projeto AcolheMente.`);
    window.open(`https://wa.me/${formattedPhone}?text=${msg}`, "_blank");
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-warm overflow-y-auto">
      <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        
        {/* Header section with contextual description & Quick Actions */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-soft shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-forest/5 text-forest rounded-xl">
                <Inbox className="w-6 h-6" />
              </span>
              <div>
                <h1 className="font-serif text-2xl sm:text-3xl font-medium text-forest">
                  Alertas, Pendências e Tarefas
                </h1>
                <p className="text-xs sm:text-sm text-forest/70 mt-0.5">
                  Painel de esteira unificada por paciente. Acompanhe novos encaminhamentos, contratos e comunicações da coordenação.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto">
            {untreatedItemsCount > 0 && (
              <button
                onClick={handleMarkAllFilteredTreated}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5 shadow-xs"
                title="Marcar todas as pendências visíveis como tratadas"
              >
                <Check className="w-3.5 h-3.5" />
                Tratar Visíveis ({filteredCards.reduce((acc, c) => acc + c.items.filter((i) => !i.treated).length, 0)})
              </button>
            )}
            <button
              onClick={() => onNavigateToTab("pacientes")}
              className="px-3.5 py-2 bg-forest hover:bg-forest/90 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <User className="w-3.5 h-3.5" />
              Ver Meus Pacientes
            </button>
          </div>
        </div>

        {/* Top Totalizers / Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div
            onClick={() => {
              setFilterStatus("all");
              setFilterCategory("all");
            }}
            className={`p-3.5 bg-white rounded-xl border transition-all cursor-pointer ${
              filterStatus === "all" && filterCategory === "all"
                ? "border-forest ring-1 ring-forest/20 shadow-xs"
                : "border-soft hover:border-forest/40"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-forest/60 mb-1">
              <span>Total</span>
              <Layers className="w-3.5 h-3.5" />
            </div>
            <div className="text-xl font-bold text-forest">{totalItemsCount}</div>
            <div className="text-[10px] text-forest/50 mt-0.5">{allCards.length} cartões</div>
          </div>

          <div
            onClick={() => {
              setFilterStatus("untreated");
              setFilterCategory("all");
            }}
            className={`p-3.5 bg-white rounded-xl border transition-all cursor-pointer ${
              filterStatus === "untreated" && filterCategory === "all"
                ? "border-red-500 ring-1 ring-red-500/20 shadow-xs"
                : "border-soft hover:border-red-300"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-red-600 mb-1">
              <span className="font-semibold">Não Tratadas</span>
              <BadgeAlert className="w-3.5 h-3.5" />
            </div>
            <div className="text-xl font-bold text-red-600">{untreatedItemsCount}</div>
            <div className="text-[10px] text-red-500 mt-0.5">Atenção prioritária</div>
          </div>

          <div
            onClick={() => {
              setFilterCategory("assignment");
            }}
            className={`p-3.5 bg-white rounded-xl border transition-all cursor-pointer ${
              filterCategory === "assignment"
                ? "border-amber-500 ring-1 ring-amber-500/20 shadow-xs"
                : "border-soft hover:border-amber-300"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-amber-700 mb-1">
              <span>Novos Pacientes</span>
              <UserCheck className="w-3.5 h-3.5" />
            </div>
            <div className="text-xl font-bold text-amber-700">{pendingAcceptanceCount}</div>
            <div className="text-[10px] text-amber-600 mt-0.5">Aguardando aceite</div>
          </div>

          <div
            onClick={() => {
              setFilterCategory("contract");
            }}
            className={`p-3.5 bg-white rounded-xl border transition-all cursor-pointer ${
              filterCategory === "contract"
                ? "border-blue-500 ring-1 ring-blue-500/20 shadow-xs"
                : "border-soft hover:border-blue-300"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-blue-700 mb-1">
              <span>Contratos</span>
              <FileSignature className="w-3.5 h-3.5" />
            </div>
            <div className="text-xl font-bold text-blue-700">{pendingContractsCount}</div>
            <div className="text-[10px] text-blue-600 mt-0.5">Assinatura pendente</div>
          </div>

          <div
            onClick={() => {
              setFilterCategory("alert");
            }}
            className={`p-3.5 bg-white rounded-xl border transition-all cursor-pointer ${
              filterCategory === "alert"
                ? "border-red-500 ring-1 ring-red-500/20 shadow-xs"
                : "border-soft hover:border-red-300"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-red-700 mb-1">
              <span>Alertas Coord.</span>
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <div className="text-xl font-bold text-red-700">{pendingAlertsCount}</div>
            <div className="text-[10px] text-red-600 mt-0.5">Mensagens da gestão</div>
          </div>

          <div
            onClick={() => {
              setFilterCategory("profile");
            }}
            className={`p-3.5 bg-white rounded-xl border transition-all cursor-pointer ${
              filterCategory === "profile"
                ? "border-orange-500 ring-1 ring-orange-500/20 shadow-xs"
                : "border-soft hover:border-orange-300"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-orange-700 mb-1">
              <span>Meu Perfil</span>
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div className="text-xl font-bold text-orange-700">{pendingProfileCount}</div>
            <div className="text-[10px] text-orange-600 mt-0.5">Ficha cadastral</div>
          </div>
        </div>

        {/* Filters and Control Bar */}
        <div className="bg-white p-4 rounded-2xl border border-soft shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Status and Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Status Selector */}
            <div className="flex items-center bg-warm/60 p-1 rounded-xl border border-soft">
              <button
                onClick={() => setFilterStatus("all")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  filterStatus === "all"
                    ? "bg-white text-forest shadow-xs font-bold"
                    : "text-forest/70 hover:text-forest"
                }`}
              >
                Todas ({totalItemsCount})
              </button>
              <button
                onClick={() => setFilterStatus("untreated")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                  filterStatus === "untreated"
                    ? "bg-red-500 text-white shadow-xs font-bold"
                    : "text-red-600 hover:text-red-700"
                }`}
              >
                Não Tratadas ({untreatedItemsCount})
              </button>
              <button
                onClick={() => setFilterStatus("treated")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  filterStatus === "treated"
                    ? "bg-emerald-600 text-white shadow-xs font-bold"
                    : "text-emerald-700 hover:text-emerald-800"
                }`}
              >
                Tratadas ({treatedItemsCount})
              </button>
            </div>

            {/* Category Selector */}
            <div className="h-6 w-px bg-soft hidden sm:block mx-1"></div>

            <div className="flex flex-wrap items-center gap-1">
              {[
                { id: "all", name: "Todos os Tipos" },
                { id: "assignment", name: "Novos Pacientes", count: pendingAcceptanceCount },
                { id: "contract", name: "Contratos", count: pendingContractsCount },
                { id: "alert", name: "Alertas Gestão", count: pendingAlertsCount },
                { id: "system", name: "Movimentações" },
                { id: "profile", name: "Meu Cadastro", count: pendingProfileCount },
              ].map((tab) => {
                const isActive = filterCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setFilterCategory(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                      isActive
                        ? "bg-forest text-white shadow-xs font-semibold"
                        : "bg-warm/40 text-forest/70 hover:bg-warm hover:text-forest border border-transparent"
                    }`}
                  >
                    {tab.name}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isActive
                            ? "bg-red-500 text-white"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search bar & Sorting Selector */}
          <div className="flex items-center gap-2 self-stretch lg:self-auto shrink-0">
            {/* Search Input */}
            <div className="relative flex-1 lg:w-64">
              <Search className="w-4 h-4 text-forest/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar paciente, alerta..."
                className="w-full pl-9 pr-8 py-1.5 bg-warm/30 text-xs text-forest placeholder:text-forest/40 border border-soft rounded-xl focus:outline-none focus:border-forest/40 focus:ring-1 focus:ring-forest/40 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-soft rounded-full text-forest/40 hover:text-forest"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* FIFO / LIFO Ordering */}
            <div className="flex items-center bg-warm/60 p-1 rounded-xl border border-soft shrink-0">
              <button
                onClick={() => setSortOrder("fifo")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                  sortOrder === "fifo"
                    ? "bg-white text-forest shadow-xs"
                    : "text-forest/60 hover:text-forest"
                }`}
                title="Mais antigos primeiro (Fila FIFO de atendimento)"
              >
                <Clock className="w-3 h-3 text-amber-600" />
                <span className="hidden sm:inline">Mais Antigos (FIFO)</span>
                <span className="sm:hidden">FIFO</span>
              </button>
              <button
                onClick={() => setSortOrder("recent")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                  sortOrder === "recent"
                    ? "bg-white text-forest shadow-xs"
                    : "text-forest/60 hover:text-forest"
                }`}
                title="Mais recentes primeiro"
              >
                <ArrowUpDown className="w-3 h-3" />
                <span className="hidden sm:inline">Mais Recentes</span>
                <span className="sm:hidden">Recentes</span>
              </button>
            </div>
          </div>
        </div>

        {/* List of Consolidated Cards */}
        {filteredCards.length === 0 ? (
          <div className="bg-white border border-soft rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="font-serif text-xl font-medium text-forest">
              Tudo em dia por aqui!
            </h3>
            <p className="text-xs text-forest/60 max-w-md">
              Não encontramos nenhuma demanda pendente com os filtros selecionados. Você está com todos os encaminhamentos e alertas organizados.
            </p>
            {(searchQuery || filterCategory !== "all" || filterStatus !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterCategory("all");
                  setFilterStatus("all");
                }}
                className="mt-2 px-4 py-2 bg-warm hover:bg-soft text-forest text-xs font-semibold rounded-xl border border-soft transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Limpar Filtros
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredCards.map((card) => {
              const untreatedInCard = card.items.filter((i) => !i.treated);
              const allTreatedInCard = untreatedInCard.length === 0;
              const isExpanded = expandedCards[card.entityId] !== false; // Default expanded

              return (
                <div
                  key={card.entityId}
                  className={`bg-white border rounded-2xl shadow-xs transition-all overflow-hidden ${
                    card.isPendingAcceptance
                      ? "border-amber-300 ring-1 ring-amber-200"
                      : card.hasCriticalAlert
                      ? "border-red-300 ring-1 ring-red-100"
                      : allTreatedInCard
                      ? "border-soft opacity-85 hover:opacity-100"
                      : "border-soft hover:border-forest/30"
                  }`}
                >
                  {/* Entity Card Header */}
                  <div className="p-4 sm:p-5 bg-warm/20 border-b border-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3">
                      {/* Avatar badge */}
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 uppercase shadow-xs ${
                          card.entityType === "perfil_profissional"
                            ? "bg-orange-100 text-orange-800 border border-orange-200"
                            : card.isPendingAcceptance
                            ? "bg-amber-500 text-white animate-pulse"
                            : "bg-forest text-white"
                        }`}
                      >
                        {card.entityType === "perfil_profissional" ? (
                          <User className="w-5 h-5" />
                        ) : (
                          card.entityName.slice(0, 2)
                        )}
                      </div>

                      {/* Name and Subtitle */}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-base text-forest">
                            {card.entityName}
                          </h3>
                          {card.entityBadge && (
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-forest/10 text-forest rounded-full border border-forest/15">
                              {card.entityBadge}
                            </span>
                          )}
                          {card.isPendingAcceptance && (
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full border border-amber-300 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-600" />
                              Novo Encaminhamento
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-forest/70 mt-0.5">
                          {card.entitySubtitle}
                        </p>
                      </div>
                    </div>

                    {/* Quick Entity Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                      {/* WhatsApp Button / Locked Contact Indicator */}
                      {card.entityContact ? (
                        <button
                          onClick={() => openWhatsApp(card.entityContact!, card.entityName)}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 shadow-xs"
                          title="Abrir conversa no WhatsApp com o paciente"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          WhatsApp
                        </button>
                      ) : card.entityType === "paciente" && (
                        <span
                          className="px-2.5 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold flex items-center gap-1 shadow-2xs"
                          title="Dados de contato protegidos e liberados após o aceite formal do caso."
                        >
                          <Lock className="w-3 h-3 text-amber-600" />
                          <span className="hidden sm:inline">Contato</span> Oculto
                        </span>
                      )}

                      {/* View details action */}
                      {card.entityType === "perfil_profissional" ? (
                        <button
                          onClick={() => onNavigateToTab("perfil")}
                          className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
                        >
                          <User className="w-3.5 h-3.5" />
                          Editar Meu Perfil
                        </button>
                      ) : card.patientObj ? (
                        <button
                          onClick={() => {
                            onSelectPaciente(card.patientObj!);
                            onNavigateToTab("pacientes");
                          }}
                          className="px-3 py-1.5 bg-white hover:bg-warm text-forest border border-soft rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 shadow-xs"
                        >
                          <FileText className="w-3.5 h-3.5 text-forest/70" />
                          Ver Ficha
                        </button>
                      ) : null}

                      {/* Mark all for this card treated */}
                      {!allTreatedInCard && (
                        <button
                          onClick={() => onMarkAllEntityTreated(card.items.map((i) => i.id))}
                          className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
                          title="Marcar todas as pendências deste paciente como tratadas"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="hidden md:inline">Tratar Todas</span>
                        </button>
                      )}

                      {/* Expand / Collapse toggle */}
                      <button
                        onClick={() => toggleExpandCard(card.entityId)}
                        className="p-1.5 text-forest/60 hover:text-forest hover:bg-soft rounded-lg transition-colors"
                        title={isExpanded ? "Recolher detalhes" : "Expandir detalhes"}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Inner Demand Items */}
                  {isExpanded && (
                    <div className="divide-y divide-soft">
                      {card.items.map((item) => {
                        return (
                          <div
                            key={item.id}
                            className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 transition-colors ${
                              item.treated
                                ? "bg-white/60 opacity-65"
                                : item.type === "assignment"
                                ? "bg-amber-50/30"
                                : item.type === "alert"
                                ? "bg-red-50/20"
                                : "bg-white"
                            }`}
                          >
                            {/* Left column: Checkbox and content */}
                            <div className="flex items-start gap-3 flex-1">
                              {/* Checkbox for treated status */}
                              <button
                                onClick={() => onToggleTreatedItem(item.id)}
                                className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                                  item.treated
                                    ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                                    : "border-forest/30 hover:border-forest bg-white text-transparent"
                                }`}
                                title={item.treated ? "Marcar como não tratado" : "Marcar como tratado"}
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </button>

                              {/* Title, Badge, Description and Date */}
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <span
                                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${getCategoryBadgeClass(
                                      item.type
                                    )}`}
                                  >
                                    {getCategoryIcon(item.type)}
                                    {getCategoryLabel(item.type)}
                                  </span>

                                  {item.priority === "alta" && (
                                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded-md">
                                      Alta Prioridade
                                    </span>
                                  )}

                                  <span className="text-[11px] text-forest/50 font-mono flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-forest/40" />
                                    {item.date}
                                  </span>
                                </div>

                                <h4
                                  className={`text-sm font-semibold ${
                                    item.treated ? "text-forest/70 line-through" : "text-forest"
                                  }`}
                                >
                                  {item.title}
                                </h4>

                                <p className="text-xs text-forest/80 mt-1 leading-relaxed whitespace-pre-line select-text">
                                  {item.desc}
                                </p>
                              </div>
                            </div>

                            {/* Right column: Contextual action buttons */}
                            <div className="flex flex-wrap sm:flex-col items-end gap-2 shrink-0 self-end sm:self-center">
                              {/* Special actions for Assignment (Accept / Devolver) */}
                              {item.type === "assignment" && card.patientObj && (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    disabled={isAcceptingId === card.patientObj.id}
                                    onClick={async () => {
                                      try {
                                        setIsAcceptingId(card.patientObj!.id);
                                        await onAcceptPaciente(card.patientObj!);
                                        onToggleTreatedItem(item.id);
                                      } finally {
                                        setIsAcceptingId(null);
                                      }
                                    }}
                                    className="px-3 py-1.5 bg-[#34A853] hover:bg-[#2e9449] text-white rounded-xl text-xs font-bold uppercase transition-colors flex items-center gap-1 shadow-xs disabled:opacity-50"
                                  >
                                    {isAcceptingId === card.patientObj.id ? (
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    )}
                                    Aceitar
                                  </button>
                                  <button
                                    onClick={() => onDevolverPaciente(card.patientObj!)}
                                    className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold uppercase transition-colors"
                                  >
                                    Devolver
                                  </button>
                                </div>
                              )}

                              {/* Special action for Contract */}
                              {item.type === "contract" && card.patientObj && (
                                <button
                                  onClick={() => {
                                    onSelectPaciente(card.patientObj!);
                                    onNavigateToTab("pacientes");
                                  }}
                                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 shadow-xs"
                                >
                                  <FileSignature className="w-3.5 h-3.5 text-blue-600" />
                                  Gerenciar Contrato
                                </button>
                              )}

                              {/* Special action for Profile */}
                              {item.type === "profile" && (
                                <button
                                  onClick={() => onNavigateToTab("perfil")}
                                  className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 shadow-xs"
                                >
                                  <User className="w-3.5 h-3.5" />
                                  Completar Cadastro
                                </button>
                              )}

                              {/* Generic View Patient Action */}
                              {item.type !== "assignment" && item.type !== "contract" && item.type !== "profile" && card.patientObj && (
                                <button
                                  onClick={() => {
                                    onSelectPaciente(card.patientObj!);
                                    onNavigateToTab("pacientes");
                                  }}
                                  className="px-2.5 py-1 text-xs text-forest/70 hover:text-forest hover:underline flex items-center gap-1"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Abrir Caso
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Central de Suporte & Diretrizes Clínicas CTA Footer */}
        <div className="bg-forest text-white rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 justify-between shadow-md mt-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
              <HelpCircle className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="font-serif text-xl sm:text-2xl font-medium mb-1">
                Central de Apoio ao Terapeuta
              </h3>
              <p className="text-xs sm:text-sm text-white/80 max-w-lg">
                Precisa de auxílio com a esteira de encaminhamentos, dúvidas de contratos, regras de honorários ou suporte da coordenação?
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            <button
              onClick={() => onNavigateToTab("compliance")}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/20 transition-colors"
            >
              Termos & Compliance
            </button>
            <button
              onClick={() => {
                const tel = "5511999999999";
                window.open(`https://wa.me/${tel}?text=${encodeURIComponent("Olá! Sou profissional parceiro do AcolheMente e preciso de suporte com meus atendimentos.")}`, "_blank");
              }}
              className="px-4 py-2.5 bg-sun text-forest hover:bg-sun-dark text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
            >
              <MessageCircle className="w-4 h-4" />
              Falar com a Coordenação
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
