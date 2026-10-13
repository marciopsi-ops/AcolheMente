import React, { useState, useEffect, useMemo } from "react";
import {
  Building2,
  User,
  Clock,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  XCircle,
  MessageCircle,
  FileText,
  Search,
  Filter,
  ArrowRight,
  Sparkles,
  RefreshCw,
  UserCheck,
  UserX,
  Layers,
  Briefcase,
  Heart,
  ShieldCheck,
  Eye,
  Check,
  Plus,
  X,
  Phone,
  FileSignature,
  Copy,
  ExternalLink,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Edit3,
  CreditCard,
  Mail,
} from "lucide-react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { PacienteFaturamentoSpreadsheet, SessaoFaturamentoItem } from "./PacienteFaturamentoSpreadsheet";
import { FichaBordoCorporativa, StatusFichaCorporativa } from "../types/corporativo";
import { ContratoGeradorModal } from "./ContratoGeradorModal";

interface TriagemCorporativaKanbanProps {
  currentRole: "master" | "triagem" | "profissional";
  currentUserProfile?: {
    uid?: string;
    nome?: string;
    name?: string;
    email?: string;
    crp?: string;
  } | null;
  onOpenWhatsApp?: (phone: string, text?: string) => void;
}

export const TriagemCorporativaKanban: React.FC<TriagemCorporativaKanbanProps> = ({
  currentRole,
  currentUserProfile,
}) => {
  const [fichas, setFichas] = useState<FichaBordoCorporativa[]>([]);
  const [loading, setLoading] = useState(true);

  // Modo do Kanban: Atendimento (Solicitação -> Paciente) ou Desfechos (Altas / Interrupções)
  const [modoKanban, setModoKanban] = useState<"atendimento" | "desfechos">("atendimento");

  // Filtros
  const [busca, setBusca] = useState("");
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>("todas");
  const [filtroProfissional, setFiltroProfissional] = useState<string>("todos");

  // Estado de Expansão/Minimização dos Cards de Pacientes Corporativos
  const [expandedFichas, setExpandedFichas] = useState<Record<string, boolean>>({});
  const toggleExpandFicha = (id: string) => {
    setExpandedFichas((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Modais
  const [fichaDetalhes, setFichaDetalhes] = useState<FichaBordoCorporativa | null>(null);
  const [fichaParaContrato, setFichaParaContrato] = useState<FichaBordoCorporativa | null>(null);
  const [modalDesfecho, setModalDesfecho] = useState<{
    isOpen: boolean;
    ficha: FichaBordoCorporativa | null;
    tipo: "alta" | "interrupcao";
    motivo: string;
  }>({
    isOpen: false,
    ficha: null,
    tipo: "alta",
    motivo: "",
  });

  const [savingAction, setSavingAction] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Carregar fichas de triagem corporativa em tempo real
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "triagem_corporativa"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: FichaBordoCorporativa[] = [];
        snapshot.forEach((docSnap) => {
          items.push({
            id: docSnap.id,
            ...(docSnap.data() as Omit<FichaBordoCorporativa, "id">),
          });
        });
        setFichas(items);
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao carregar triagem corporativa:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const isProfissional = currentRole === "profissional";

  // Lista única de empresas e profissionais para filtros (somente necessária para master/triagem)
  const empresasList = useMemo(() => {
    return Array.from(new Set(fichas.map((f) => f.empresaNome).filter(Boolean)));
  }, [fichas]);

  const profissionaisList = useMemo(() => {
    return Array.from(new Set(fichas.map((f) => f.profissionalNome).filter(Boolean)));
  }, [fichas]);

  // Filtragem
  const fichasFiltradas = fichas.filter((f) => {
    // Para profissionais, SÓ podem aparecer os pacientes que chamaram esse profissional pelo WhatsApp
    if (isProfissional) {
      const matchProfLogado = Boolean(
        (currentUserProfile?.uid && f.profissionalId === currentUserProfile.uid) ||
        (currentUserProfile?.name &&
          f.profissionalNome &&
          f.profissionalNome.trim().toLowerCase() === currentUserProfile.name.trim().toLowerCase()) ||
        (currentUserProfile?.nome &&
          f.profissionalNome &&
          f.profissionalNome.trim().toLowerCase() === currentUserProfile.nome.trim().toLowerCase()) ||
        (currentUserProfile?.crp &&
          f.profissionalCrp &&
          currentUserProfile.crp.replace(/\D/g, "").length > 0 &&
          f.profissionalCrp.replace(/\D/g, "") === currentUserProfile.crp.replace(/\D/g, ""))
      );

      if (!matchProfLogado) {
        return false;
      }
    }

    const matchBusca =
      !busca ||
      f.colaboradorNome?.toLowerCase().includes(busca.toLowerCase()) ||
      (!isProfissional && f.empresaNome?.toLowerCase().includes(busca.toLowerCase())) ||
      f.dependenteInfo?.toLowerCase().includes(busca.toLowerCase()) ||
      f.servicoNome?.toLowerCase().includes(busca.toLowerCase()) ||
      (!isProfissional && f.profissionalNome?.toLowerCase().includes(busca.toLowerCase())) ||
      f.queixa?.toLowerCase().includes(busca.toLowerCase());

    const matchEmpresa = isProfissional || filtroEmpresa === "todas" || f.empresaNome === filtroEmpresa;
    const matchProf = isProfissional || filtroProfissional === "todos" || f.profissionalNome === filtroProfissional;

    return matchBusca && matchEmpresa && matchProf;
  });

  // Separação por colunas
  const solicitacoes = fichasFiltradas.filter((f) => f.status === "solicitacao_servico");
  const pacientesAtivos = fichasFiltradas.filter((f) => f.status === "paciente");
  const altas = fichasFiltradas.filter((f) => f.status === "alta");
  const interrupcoes = fichasFiltradas.filter((f) => f.status === "interrupcao");

  // Ação: Aceitar Ficha de Bordo (Mover de Solicitação de Serviço para Paciente)
  const handleAceitarFicha = async (ficha: FichaBordoCorporativa) => {
    setSavingAction(true);
    try {
      const proNome =
        currentUserProfile?.nome ||
        currentUserProfile?.name ||
        ficha.profissionalNome ||
        "Profissional Parceiro";

      const agora = new Date().toISOString();
      const novoHistorico = [
        ...(ficha.historico || []),
        {
          data: agora,
          autor: proNome,
          acao: "Aceite formalizado na Ficha de Bordo",
          detalhes: `Status alterado de Solicitação de Serviço para Paciente em atendimento ativo. Aceito por ${proNome}.`,
        },
      ];

      await updateDoc(doc(db, "triagem_corporativa", ficha.id), {
        status: "paciente",
        dataAceite: serverTimestamp(),
        aceitoPor: proNome,
        updatedAt: serverTimestamp(),
        historico: novoHistorico,
      });

      showToast(`Ficha de ${ficha.colaboradorNome} aceita com sucesso! Movida para Paciente.`);
      if (fichaDetalhes?.id === ficha.id) {
        setFichaDetalhes((prev) => (prev ? { ...prev, status: "paciente", aceitoPor: proNome } : null));
      }
    } catch (err) {
      console.error("Erro ao aceitar ficha corporativa:", err);
      showToast("Não foi possível formalizar o aceite. Tente novamente.");
    } finally {
      setSavingAction(false);
    }
  };

  // Ação: Concluir Alta ou Interrupção
  const handleConfirmarDesfecho = async () => {
    if (!modalDesfecho.ficha) return;
    setSavingAction(true);
    try {
      const ficha = modalDesfecho.ficha;
      const autorNome =
        currentUserProfile?.nome || currentUserProfile?.name || "Equipe de Gestão";
      const agora = new Date().toISOString();
      const tipoLabel = modalDesfecho.tipo === "alta" ? "Alta Clínica" : "Interrupção de Atendimento";

      const novoHistorico = [
        ...(ficha.historico || []),
        {
          data: agora,
          autor: autorNome,
          acao: `Registro de ${tipoLabel}`,
          detalhes: modalDesfecho.motivo || `Desfecho registrado pelo profissional/triagem.`,
        },
      ];

      await updateDoc(doc(db, "triagem_corporativa", ficha.id), {
        status: modalDesfecho.tipo,
        dataDesfecho: serverTimestamp(),
        motivoDesfecho: modalDesfecho.motivo.trim(),
        updatedAt: serverTimestamp(),
        historico: novoHistorico,
      });

      showToast(`${tipoLabel} registrada para ${ficha.colaboradorNome}.`);
      setModalDesfecho({ isOpen: false, ficha: null, tipo: "alta", motivo: "" });
      if (fichaDetalhes?.id === ficha.id) {
        setFichaDetalhes((prev) =>
          prev ? { ...prev, status: modalDesfecho.tipo, motivoDesfecho: modalDesfecho.motivo } : null
        );
      }
    } catch (err) {
      console.error("Erro ao registrar desfecho corporativo:", err);
      showToast("Erro ao salvar desfecho. Tente novamente.");
    } finally {
      setSavingAction(false);
    }
  };

  // Ação: Reativar como Paciente
  const handleReativarPaciente = async (ficha: FichaBordoCorporativa) => {
    setSavingAction(true);
    try {
      const autorNome =
        currentUserProfile?.nome || currentUserProfile?.name || "Equipe de Gestão";
      const agora = new Date().toISOString();
      const novoHistorico = [
        ...(ficha.historico || []),
        {
          data: agora,
          autor: autorNome,
          acao: "Reativação do Atendimento",
          detalhes: "Caso reativado e retornado para a coluna de Paciente em atendimento.",
        },
      ];

      await updateDoc(doc(db, "triagem_corporativa", ficha.id), {
        status: "paciente",
        updatedAt: serverTimestamp(),
        historico: novoHistorico,
      });

      showToast(`Caso de ${ficha.colaboradorNome} reativado com sucesso como Paciente.`);
      if (fichaDetalhes?.id === ficha.id) {
        setFichaDetalhes((prev) => (prev ? { ...prev, status: "paciente" } : null));
      }
    } catch (err) {
      console.error("Erro ao reativar ficha corporativa:", err);
      showToast("Erro ao reativar caso.");
    } finally {
      setSavingAction(false);
    }
  };

  // Helper de link de WhatsApp
  const handleAbrirWhatsApp = (ficha: FichaBordoCorporativa) => {
    const rawNumber = ficha.colaboradorWhatsapp?.replace(/\D/g, "");
    if (!rawNumber) {
      showToast("WhatsApp do colaborador não informado.");
      return;
    }
    const fullNumber = rawNumber.startsWith("55") ? rawNumber : `55${rawNumber}`;
    const colabFirstName = ficha.colaboradorNome?.trim().split(" ")[0] || "Olá";
    const msg = currentRole === "profissional"
      ? encodeURIComponent(
          `Olá, ${colabFirstName}! 👋 Tudo bem? Sou o(a) psicólogo(a) responsável pelo seu acolhimento no Projeto AcolheMente Saúde. Estou entrando em contato para combinarmos o melhor dia e horário para a nossa primeira sessão!`
        )
      : encodeURIComponent(
          `Olá, ${ficha.colaboradorNome}! Aqui é da equipe AcolheMente em relação ao seu benefício corporativo da empresa *${ficha.empresaNome}*.`
        );
    window.open(`https://wa.me/${fullNumber}?text=${msg}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-forest text-white px-5 py-3 rounded-2xl shadow-xl border border-forest/20 text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER DA ABA CORPORATIVA */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-soft shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5 sm:mb-1">
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-200 flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              Convênios Corporativos
            </span>
            <span className="text-[10px] sm:text-[11px] text-forest/50 font-medium">
              Fichas de Bordo & Triagem
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold font-serif text-forest leading-tight">
            {isProfissional ? "Acolhimento Corporativo • Meus Pacientes" : "Esteira & Kanban Corporativo"}
          </h2>
          <p className="text-[10px] sm:text-[11px] text-forest/70 max-w-2xl mt-0.5 leading-relaxed">
            {isProfissional
              ? "Colaboradores e dependentes credenciados que acionaram você via WhatsApp para agendamento e acompanhamento."
              : "Fluxo exclusivo de colaboradores e dependentes credenciados: solicitações, aceite, ativos e desfechos."}
          </p>
        </div>

        {/* Alternador de Kanban: Atendimento vs Desfechos (Otimizado para Telas Pequenas) */}
        <div className="flex items-center gap-1 bg-warm p-0.5 rounded-xl border border-soft self-start md:self-auto shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setModoKanban("atendimento")}
            className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
              modoKanban === "atendimento"
                ? "bg-white text-forest shadow-2xs"
                : "text-forest/60 hover:text-forest"
            }`}
          >
            <Layers className="w-3 h-3 text-emerald-600 shrink-0" />
            <span className="hidden sm:inline">Fluxo de Atendimento</span>
            <span className="sm:hidden">Atendimento</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-100 text-emerald-800 font-bold shrink-0">
              {solicitacoes.length + pacientesAtivos.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setModoKanban("desfechos")}
            className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
              modoKanban === "desfechos"
                ? "bg-white text-forest shadow-2xs"
                : "text-forest/60 hover:text-forest"
            }`}
          >
            <UserCheck className="w-3 h-3 text-purple-600 shrink-0" />
            <span className="hidden sm:inline">Altas / Interrupções</span>
            <span className="sm:hidden">Desfechos</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-purple-100 text-purple-800 font-bold shrink-0">
              {altas.length + interrupcoes.length}
            </span>
          </button>
        </div>
      </div>

      {/* FILTROS E BUSCA (Compacto e Intuitivo para Mobile) */}
      <div className="bg-white rounded-2xl p-2.5 sm:p-4 border border-soft shadow-xs flex flex-col md:flex-row items-center gap-2 sm:gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-forest/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={
              isProfissional
                ? "Buscar por colaborador, dependente ou queixa..."
                : "Buscar por colaborador, empresa, profissional ou queixa..."
            }
            className="w-full pl-8 pr-4 py-1.5 sm:py-2 bg-warm/30 hover:bg-warm/50 focus:bg-white rounded-xl text-[11px] sm:text-xs text-forest border border-soft focus:border-forest/40 outline-none transition-all placeholder:text-forest/40"
          />
          {busca && (
            <button
              onClick={() => setBusca("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-forest/40 hover:text-forest text-xs cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtros de Empresa e Profissional (Ocultados para profissionais, visíveis apenas para gestão/triagem) */}
        {!isProfissional && (
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto no-scrollbar shrink-0">
            <span className="text-[10px] sm:text-[11px] font-bold text-forest/50 flex items-center gap-1 shrink-0">
              <Filter className="w-3 h-3" /> Filtrar:
            </span>

            {/* Filtro Empresa */}
            <div className="flex items-center gap-1 bg-warm/40 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg border border-soft text-[10px] sm:text-xs text-forest/80 shrink-0">
              <Building2 className="w-3 h-3 text-forest/50 shrink-0" />
              <select
                value={filtroEmpresa}
                onChange={(e) => setFiltroEmpresa(e.target.value)}
                className="bg-transparent text-[10px] sm:text-xs text-forest font-semibold outline-none cursor-pointer max-w-[130px] sm:max-w-none truncate"
              >
                <option value="todas">Todas Empresas</option>
                {empresasList.map((emp) => (
                  <option key={emp} value={emp}>
                    {emp}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Profissional */}
            <div className="flex items-center gap-1 bg-warm/40 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg border border-soft text-[10px] sm:text-xs text-forest/80 shrink-0">
              <User className="w-3 h-3 text-forest/50 shrink-0" />
              <select
                value={filtroProfissional}
                onChange={(e) => setFiltroProfissional(e.target.value)}
                className="bg-transparent text-[10px] sm:text-xs text-forest font-semibold outline-none cursor-pointer max-w-[130px] sm:max-w-none truncate"
              >
                <option value="todos">Todos Profissionais</option>
                {profissionaisList.map((pro) => (
                  <option key={pro} value={pro}>
                    {pro}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Indicador de visualização para o profissional */}
        {isProfissional && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 text-[10px] sm:text-xs font-bold rounded-xl border border-emerald-200/80 flex items-center gap-1.5 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Pacientes que chamaram você
            </span>
          </div>
        )}

        {/* Botões rápidos: Expandir Todos / Recolher Todos */}
        <div className={`flex items-center gap-1 shrink-0 ${!isProfissional ? "border-l border-soft pl-1.5" : ""}`}>
          <button
            type="button"
            onClick={() => {
              const map: Record<string, boolean> = {};
              fichasFiltradas.forEach((f) => {
                map[f.id] = true;
              });
              setExpandedFichas(map);
            }}
            className="px-2 py-1 bg-warm/60 hover:bg-warm text-forest/70 hover:text-forest rounded-lg text-[10px] sm:text-[11px] font-semibold transition-all border border-soft/60 flex items-center gap-1 cursor-pointer"
            title="Expandir todos os cards visíveis"
          >
            <ChevronDown className="w-3 h-3 text-emerald-600" />
            <span className="hidden sm:inline">Expandir Todos</span>
            <span className="sm:hidden">Expandir</span>
          </button>
          <button
            type="button"
            onClick={() => setExpandedFichas({})}
            className="px-2 py-1 bg-warm/60 hover:bg-warm text-forest/70 hover:text-forest rounded-lg text-[10px] sm:text-[11px] font-semibold transition-all border border-soft/60 flex items-center gap-1 cursor-pointer"
            title="Recolher todos os cards"
          >
            <ChevronUp className="w-3 h-3 text-forest/50" />
            <span className="hidden sm:inline">Recolher Todos</span>
            <span className="sm:hidden">Recolher</span>
          </button>
        </div>
      </div>

      {/* KANBAN BOARD */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="w-7 h-7 text-emerald-600 animate-spin mx-auto" />
          <p className="text-xs text-forest/60 font-medium">Carregando fichas corporativas...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {modoKanban === "atendimento" ? (
            <>
              {/* COLUNA 1: SOLICITAÇÃO DE SERVIÇO */}
              <div className="bg-warm/40 rounded-3xl p-5 border border-soft space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-soft">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                    <h3 className="font-bold font-serif text-forest text-sm sm:text-base">
                      Solicitação de Serviço
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                    {solicitacoes.length} {solicitacoes.length === 1 ? "caso" : "casos"}
                  </span>
                </div>

                <div className="text-[11px] text-forest/60">
                  Colaboradores que acionaram o profissional via WhatsApp. Aguardando aceite para formalização do atendimento.
                </div>

                {solicitacoes.length === 0 ? (
                  <div className="py-12 text-center bg-white/60 rounded-2xl border border-dashed border-soft/80 p-4">
                    <CheckCircle2 className="w-6 h-6 text-forest/30 mx-auto mb-1.5" />
                    <p className="text-xs font-medium text-forest/60">Nenhuma solicitação pendente no momento.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {solicitacoes.map((ficha) => (
                      <CardFichaCorporativa
                        key={ficha.id}
                        ficha={ficha}
                        currentRole={currentRole}
                        isExpanded={!!expandedFichas[ficha.id]}
                        onToggleExpand={() => toggleExpandFicha(ficha.id)}
                        onVerDetalhes={() => setFichaDetalhes(ficha)}
                        onAceitar={() => handleAceitarFicha(ficha)}
                        onWhatsApp={() => handleAbrirWhatsApp(ficha)}
                        saving={savingAction}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* COLUNA 2: PACIENTE (EM ATENDIMENTO) */}
              <div className="bg-warm/40 rounded-3xl p-5 border border-soft space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-soft">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-600" />
                    <h3 className="font-bold font-serif text-forest text-sm sm:text-base">
                      Paciente (Em Atendimento)
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    {pacientesAtivos.length} {pacientesAtivos.length === 1 ? "ativo" : "ativos"}
                  </span>
                </div>

                <div className="text-[11px] text-forest/60">
                  Casos com aceite formalizado pelo profissional. Sessões em andamento na condição subsidiada pela empresa.
                </div>

                {pacientesAtivos.length === 0 ? (
                  <div className="py-12 text-center bg-white/60 rounded-2xl border border-dashed border-soft/80 p-4">
                    <User className="w-6 h-6 text-forest/30 mx-auto mb-1.5" />
                    <p className="text-xs font-medium text-forest/60">Nenhum paciente em atendimento nesta filtragem.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pacientesAtivos.map((ficha) => (
                      <CardFichaCorporativa
                        key={ficha.id}
                        ficha={ficha}
                        currentRole={currentRole}
                        isExpanded={!!expandedFichas[ficha.id]}
                        onToggleExpand={() => toggleExpandFicha(ficha.id)}
                        onVerDetalhes={() => setFichaDetalhes(ficha)}
                        onAlta={() =>
                          setModalDesfecho({ isOpen: true, ficha, tipo: "alta", motivo: "" })
                        }
                        onInterrupcao={() =>
                          setModalDesfecho({ isOpen: true, ficha, tipo: "interrupcao", motivo: "" })
                        }
                        onWhatsApp={() => handleAbrirWhatsApp(ficha)}
                        saving={savingAction}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* KANBAN DESFECHOS: COLUNA ALTAS CLÍNICAS */}
              <div className="bg-warm/40 rounded-3xl p-5 border border-soft space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-soft">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-600" />
                    <h3 className="font-bold font-serif text-forest text-sm sm:text-base">
                      Altas Clínicas Concluídas
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                    {altas.length}
                  </span>
                </div>

                <div className="text-[11px] text-forest/60">
                  Pacientes corporativos que completaram o processo terapêutico e obtiveram alta clínica estruturada.
                </div>

                {altas.length === 0 ? (
                  <div className="py-12 text-center bg-white/60 rounded-2xl border border-dashed border-soft/80 p-4">
                    <CheckCircle2 className="w-6 h-6 text-forest/30 mx-auto mb-1.5" />
                    <p className="text-xs font-medium text-forest/60">Nenhuma alta clínica registrada nesta filtragem.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {altas.map((ficha) => (
                      <CardFichaCorporativa
                        key={ficha.id}
                        ficha={ficha}
                        currentRole={currentRole}
                        isExpanded={!!expandedFichas[ficha.id]}
                        onToggleExpand={() => toggleExpandFicha(ficha.id)}
                        onVerDetalhes={() => setFichaDetalhes(ficha)}
                        onReativar={() => handleReativarPaciente(ficha)}
                        onWhatsApp={() => handleAbrirWhatsApp(ficha)}
                        saving={savingAction}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* KANBAN DESFECHOS: COLUNA INTERRUPÇÕES */}
              <div className="bg-warm/40 rounded-3xl p-5 border border-soft space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-soft">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-600" />
                    <h3 className="font-bold font-serif text-forest text-sm sm:text-base">
                      Interrupções de Atendimento
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                    {interrupcoes.length}
                  </span>
                </div>

                <div className="text-[11px] text-forest/60">
                  Atendimentos descontinuados antes da alta (ex.: desligamento da empresa, desistência, incompatibilidade de horários).
                </div>

                {interrupcoes.length === 0 ? (
                  <div className="py-12 text-center bg-white/60 rounded-2xl border border-dashed border-soft/80 p-4">
                    <UserX className="w-6 h-6 text-forest/30 mx-auto mb-1.5" />
                    <p className="text-xs font-medium text-forest/60">Nenhuma interrupção registrada nesta filtragem.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {interrupcoes.map((ficha) => (
                      <CardFichaCorporativa
                        key={ficha.id}
                        ficha={ficha}
                        currentRole={currentRole}
                        isExpanded={!!expandedFichas[ficha.id]}
                        onToggleExpand={() => toggleExpandFicha(ficha.id)}
                        onVerDetalhes={() => setFichaDetalhes(ficha)}
                        onReativar={() => handleReativarPaciente(ficha)}
                        onWhatsApp={() => handleAbrirWhatsApp(ficha)}
                        saving={savingAction}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* MODAL FICHA DE BORDO CORPORATIVA COMPLETA */}
      {fichaDetalhes && (
        <ModalFichaBordoDetalhes
          ficha={fichaDetalhes}
          currentRole={currentRole}
          onClose={() => setFichaDetalhes(null)}
          onAceitar={() => handleAceitarFicha(fichaDetalhes)}
          onAlta={() =>
            setModalDesfecho({ isOpen: true, ficha: fichaDetalhes, tipo: "alta", motivo: "" })
          }
          onInterrupcao={() =>
            setModalDesfecho({ isOpen: true, ficha: fichaDetalhes, tipo: "interrupcao", motivo: "" })
          }
          onReativar={() => handleReativarPaciente(fichaDetalhes)}
          onWhatsApp={() => handleAbrirWhatsApp(fichaDetalhes)}
          onAbrirContrato={() => setFichaParaContrato(fichaDetalhes)}
          onUpdateFicha={(updatedFicha) => {
            setFichas((prev) =>
              prev.map((f) => (f.id === updatedFicha.id ? { ...f, ...updatedFicha } : f))
            );
            setFichaDetalhes((prev) => (prev && prev.id === updatedFicha.id ? { ...prev, ...updatedFicha } : prev));
          }}
          currentUserProfile={currentUserProfile}
          showToast={showToast}
          saving={savingAction}
        />
      )}

      {/* MODAL GERADOR DE CONTRATO TERAPÊUTICO PARA PACIENTES CORPORATIVOS */}
      {fichaParaContrato && (
        <ContratoGeradorModal
          isOpen={!!fichaParaContrato}
          onClose={() => setFichaParaContrato(null)}
          paciente={fichaParaContrato}
          profissionalLogado={currentUserProfile}
          collectionName="triagem_corporativa"
          tipoAcolhimento="corporativo"
          showToast={showToast}
          onContratoSalvo={(updatedFicha) => {
            setFichas((prev) =>
              prev.map((f) => (f.id === updatedFicha.id ? { ...f, ...updatedFicha } : f))
            );
            if (fichaDetalhes?.id === updatedFicha.id) {
              setFichaDetalhes((prev) => (prev ? { ...prev, ...updatedFicha } : null));
            }
            setFichaParaContrato(null);
          }}
        />
      )}

      {/* MODAL REGISTRAR ALTA / INTERRUPÇÃO */}
      {modalDesfecho.isOpen && modalDesfecho.ficha && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-soft space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-soft">
              <div className="flex items-center gap-2">
                {modalDesfecho.tipo === "alta" ? (
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                )}
                <h3 className="font-bold font-serif text-forest text-base sm:text-lg">
                  {modalDesfecho.tipo === "alta"
                    ? "Registrar Alta Clínica"
                    : "Registrar Interrupção de Atendimento"}
                </h3>
              </div>
              <button
                onClick={() => setModalDesfecho({ isOpen: false, ficha: null, tipo: "alta", motivo: "" })}
                className="text-forest/40 hover:text-forest p-1 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-forest/70 leading-relaxed">
              Você está registrando o desfecho do acolhimento corporativo de{" "}
              <strong>{modalDesfecho.ficha.colaboradorNome}</strong> ({modalDesfecho.ficha.empresaNome}).
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-forest block">
                {modalDesfecho.tipo === "alta"
                  ? "Observações / Motivo da Alta Clínica:"
                  : "Motivo da Interrupção do Atendimento:"}
              </label>
              <textarea
                value={modalDesfecho.motivo}
                onChange={(e) => setModalDesfecho((prev) => ({ ...prev, motivo: e.target.value }))}
                placeholder={
                  modalDesfecho.tipo === "alta"
                    ? "Descreva a conclusão dos objetivos terapêuticos e orientações finais..."
                    : "Ex: colaborador mudou de turno, solicitou pausa, desligamento da empresa, etc."
                }
                rows={3}
                className="w-full p-3 bg-warm/30 rounded-xl text-xs text-forest border border-soft focus:border-forest/40 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalDesfecho({ isOpen: false, ficha: null, tipo: "alta", motivo: "" })}
                className="px-4 py-2 text-xs font-semibold text-forest/70 hover:text-forest rounded-xl"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={savingAction}
                onClick={handleConfirmarDesfecho}
                className={`px-5 py-2.5 text-xs font-bold rounded-xl text-white shadow-xs cursor-pointer ${
                  modalDesfecho.tipo === "alta"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-rose-600 hover:bg-rose-700"
                } disabled:opacity-50`}
              >
                {savingAction ? "Salvando..." : "Confirmar e Mover no Kanban"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// SUBCOMPONENTE: CARD DO KANBAN CORPORATIVO
// ==========================================
interface CardFichaProps {
  ficha: FichaBordoCorporativa;
  currentRole?: "master" | "triagem" | "profissional";
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onVerDetalhes: () => void;
  onAceitar?: () => void;
  onAlta?: () => void;
  onInterrupcao?: () => void;
  onReativar?: () => void;
  onWhatsApp: () => void;
  saving?: boolean;
}

const CardFichaCorporativa: React.FC<CardFichaProps> = ({
  ficha,
  currentRole,
  isExpanded = false,
  onToggleExpand,
  onVerDetalhes,
  onAceitar,
  onAlta,
  onInterrupcao,
  onReativar,
  onWhatsApp,
  saving,
}) => {
  const isProfissional = currentRole === "profissional";

  const formatData = (timestamp: any) => {
    if (!timestamp) return "Recente";
    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      return new Date(timestamp).toLocaleDateString("pt-BR");
    } catch {
      return "Recente";
    }
  };

  return (
    <div
      onClick={onToggleExpand}
      className={`bg-white rounded-2xl border transition-all cursor-pointer ${
        isExpanded
          ? "p-4 sm:p-5 border-forest/30 shadow-md ring-1 ring-forest/10 space-y-3.5"
          : "p-3.5 sm:p-4 border-soft shadow-xs hover:border-forest/20 hover:shadow-sm space-y-2.5"
      }`}
    >
      {/* 1. TOPO DO CARD: Selo discreto para profissional OU Empresa + Tag de Cargo para master/triagem */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {isProfissional ? (
            /* Para o profissional: selo corporativo discreto e protetor (sem empresa, cargo ou nível) */
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-[10px] font-semibold text-emerald-800 border border-emerald-200/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
              <span>Corporativo</span>
            </span>
          ) : (
            /* Para master/triagem: visualização administrativa com empresa e cargo */
            <>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-warm text-[10px] font-bold text-forest/70 border border-soft/80 truncate">
                <Building2 className="w-3 h-3 text-emerald-700 shrink-0" />
                <span className="truncate">{ficha.empresaNome}</span>
              </span>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-[10px] font-bold text-blue-900 border border-blue-200/80 truncate">
                <Briefcase className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                <span className="truncate">{ficha.cargoNome || "Cargo não informado"}</span>
              </span>
            </>
          )}

          {ficha.beneficiarioTipo === "dependente" && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
              Dep: {ficha.dependenteParentesco || "Família"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <span className="text-[10px] text-forest/40 font-medium hidden sm:inline">
            {formatData(ficha.createdAt)}
          </span>

          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="p-1 text-forest/50 hover:text-forest hover:bg-warm rounded-md transition-colors cursor-pointer"
              title={isExpanded ? "Recolher card" : "Expandir card"}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* 2. PROTAGONISTA: Nome do Paciente / Colaborador */}
      <div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <h4 className="font-bold text-forest text-sm sm:text-base font-serif leading-snug">
            {ficha.colaboradorNome}
          </h4>

          {ficha.contratoAssinado ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Contrato Assinado
            </span>
          ) : ficha.contratoText ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
              <FileSignature className="w-2.5 h-2.5 text-amber-600" /> Contrato Pendente
            </span>
          ) : null}

          {/* BADGE DE DADOS DE FATURAMENTO / CPF */}
          {(ficha.pacienteCpf || ficha.cpf) ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-300 shrink-0" title="CPF e dados de faturamento preenchidos">
              <CreditCard className="w-2.5 h-2.5 text-emerald-600" /> CPF Cadastrado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-stone-100 text-stone-600 border border-stone-300 shrink-0" title="Dados de faturamento e CPF ainda não coletados">
              <CreditCard className="w-2.5 h-2.5 text-stone-400" /> CPF Pendente
            </span>
          )}
        </div>

        {ficha.beneficiarioTipo === "dependente" && ficha.dependenteInfo && (
          <p className="text-[11px] text-forest/60 mt-0.5">
            Beneficiário atendido: <strong>{ficha.dependenteInfo}</strong>
          </p>
        )}
      </div>

      {/* 3. RESUMO VISÍVEL SEMPRE (Nome, Cargo [se admin] ou Selo Corporativo [se prof], Valor e Profissional Escolhido/Responsável) */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-soft/60">
        {/* Valor da Sessão Acordado pela Tabela Corporativa */}
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-lg border border-emerald-200/70 text-xs font-bold font-serif shrink-0 shadow-2xs">
            <DollarSign className="w-3 h-3 text-emerald-600" />
            R$ {ficha.valorSessao},00/sessão
          </span>
          {!isExpanded && ficha.servicoNome && (
            <span className="text-[11px] text-forest/60 truncate max-w-[120px] sm:max-w-[180px]">
              • {ficha.servicoNome}
            </span>
          )}
        </div>

        {/* Profissional Escolhido ou Responsável */}
        <div className="flex items-center gap-1.5 min-w-0 max-w-[200px] sm:max-w-xs shrink-0">
          {ficha.profissionalFoto ? (
            <img
              src={ficha.profissionalFoto}
              alt={ficha.profissionalNome}
              className="w-5 h-5 rounded-full object-cover border border-emerald-600 shrink-0"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-forest/10 flex items-center justify-center text-[9px] font-bold text-forest shrink-0">
              {ficha.profissionalNome ? ficha.profissionalNome.charAt(0) : "P"}
            </div>
          )}
          <span className="text-[11px] text-forest/80 font-medium truncate">
            {ficha.status === "paciente" ? "Resp:" : "Escolhido:"}{" "}
            <strong className="text-forest font-semibold">{ficha.profissionalNome || "Não atribuído"}</strong>
          </span>
        </div>
      </div>

      {/* 4. CONTEÚDO EXPANDIDO (Visível apenas quando expandido) */}
      {isExpanded && (
        <div className="space-y-3 pt-2 border-t border-soft/80 animate-in fade-in duration-150">
          {/* Serviço e Frequência Detalhados */}
          <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100/80 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-forest/80 font-medium">
              <span className="font-semibold text-emerald-950 truncate">{ficha.servicoNome}</span>
              <span className="font-bold text-emerald-900 font-serif shrink-0">
                R$ {ficha.valorSessao},00/sessão
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-forest/60">
              <span>Frequência: {ficha.frequenciaRecomendada}</span>
              <span className="bg-white/80 px-2 py-0.5 rounded-md text-[10px] font-semibold text-forest/70 border border-soft">
                Turno: {ficha.turnoPreferencia || "A combinar"}
              </span>
            </div>
          </div>

          {/* Queixa Inicial Completa */}
          {ficha.queixa && (
            <div className="bg-warm/30 rounded-xl p-2.5 text-xs text-forest/80 border border-soft/60">
              <span className="text-[10px] uppercase font-bold text-forest/50 block mb-0.5">
                Queixa / Motivo Informado:
              </span>
              <p className="italic leading-relaxed">"{ficha.queixa}"</p>
            </div>
          )}

          {/* Dados Adicionais de Contato / Responsável */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-forest/70 bg-warm/20 p-2.5 rounded-xl border border-soft/50">
            <div>
              <span className="text-[10px] uppercase font-bold text-forest/50 block">Profissional Responsável</span>
              <span className="font-medium text-forest">{ficha.profissionalNome} {ficha.profissionalCrp ? `(${ficha.profissionalCrp})` : ""}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-forest/50 block">Modalidade</span>
              {isProfissional ? (
                <span className="inline-flex items-center gap-1 font-medium text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Convênio Corporativo
                </span>
              ) : (
                <span className="font-medium text-forest">{ficha.cargoNome} • {ficha.empresaNome}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. AÇÕES NO RODAPÉ DO CARD */}
      <div
        className="pt-2 border-t border-soft flex items-center justify-between gap-1.5 sm:gap-2 flex-wrap"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onVerDetalhes}
            className="px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold text-forest/80 hover:text-forest bg-warm/50 hover:bg-warm transition-all flex items-center gap-1 cursor-pointer border border-soft/60 shadow-2xs"
          >
            <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-forest/50" />
            <span>Ficha de Bordo</span>
          </button>

          <button
            type="button"
            onClick={onWhatsApp}
            title="Falar no WhatsApp"
            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer border border-emerald-200/50"
          >
            <Phone className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          {/* Botão de Aceite se for Solicitação de Serviço */}
          {ficha.status === "solicitacao_servico" && onAceitar && (
            <button
              type="button"
              disabled={saving}
              onClick={onAceitar}
              className="px-2.5 sm:px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] sm:text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Aceitar Ficha</span>
            </button>
          )}

          {/* Botões de Alta / Interrupção se for Paciente ativo */}
          {ficha.status === "paciente" && (
            <div className="flex items-center gap-1">
              {onAlta && (
                <button
                  type="button"
                  onClick={onAlta}
                  className="px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md sm:rounded-lg transition-all cursor-pointer border border-blue-200/60"
                >
                  Alta
                </button>
              )}
              {onInterrupcao && (
                <button
                  type="button"
                  onClick={onInterrupcao}
                  className="px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md sm:rounded-lg transition-all cursor-pointer border border-rose-200/60"
                >
                  Interromper
                </button>
              )}
            </div>
          )}

          {/* Botão de Reativar se estiver em Alta ou Interrupção */}
          {(ficha.status === "alta" || ficha.status === "interrupcao") && onReativar && (
            <button
              type="button"
              disabled={saving}
              onClick={onReativar}
              className="px-2.5 py-1 bg-forest text-white rounded-lg text-[10px] sm:text-[11px] font-semibold hover:bg-forest/90 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reativar</span>
            </button>
          )}

          {/* Botão sutil de alternar expandir/recolher no rodapé */}
          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="text-forest/60 hover:text-forest font-semibold flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-warm cursor-pointer text-[10px] uppercase tracking-wider shrink-0 transition-colors"
            >
              <span>{isExpanded ? "Menos" : "Mais"}</span>
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// SUBCOMPONENTE: MODAL DA FICHA DE BORDO
// ==========================================
interface ModalFichaBordoProps {
  ficha: FichaBordoCorporativa;
  currentRole?: "master" | "triagem" | "profissional";
  onClose: () => void;
  onAceitar: () => void;
  onAlta: () => void;
  onInterrupcao: () => void;
  onReativar: () => void;
  onWhatsApp: () => void;
  onAbrirContrato: () => void;
  onUpdateFicha?: (updatedFicha: FichaBordoCorporativa) => void;
  currentUserProfile?: any;
  showToast: (msg: string) => void;
  saving?: boolean;
}

const ModalFichaBordoDetalhes: React.FC<ModalFichaBordoProps> = ({
  ficha,
  currentRole,
  onClose,
  onAceitar,
  onAlta,
  onInterrupcao,
  onReativar,
  onWhatsApp,
  onAbrirContrato,
  onUpdateFicha,
  currentUserProfile,
  showToast,
  saving,
}) => {
  const isProfissional = currentRole === "profissional";
  const [novaNota, setNovaNota] = useState("");
  const [salvandoNota, setSalvandoNota] = useState(false);

  // Estado para Coleta e Edição de Dados Cadastrais & Faturamento
  const [modalColetaLink, setModalColetaLink] = useState(false);
  const [editandoDados, setEditandoDados] = useState(false);
  const [salvandoDados, setSalvandoDados] = useState(false);

  const [formNome, setFormNome] = useState(
    ficha.pacienteNomeCompleto ||
    ficha.dadosContrato?.pacienteNome ||
    ficha.dadosContrato?.nome ||
    (ficha.beneficiarioTipo === "dependente" && ficha.dependenteInfo ? ficha.dependenteInfo : ficha.colaboradorNome) ||
    ""
  );
  const [formCpf, setFormCpf] = useState(
    ficha.pacienteCpf ||
    ficha.cpf ||
    ficha.dadosContrato?.pacienteCpf ||
    ficha.dadosContrato?.cpf ||
    ""
  );
  const [formDataNasc, setFormDataNasc] = useState(
    ficha.pacienteDataNascimento ||
    ficha.colaboradorDataNascimento ||
    ""
  );
  const [formEmail, setFormEmail] = useState(
    ficha.pacienteEmail ||
    ficha.colaboradorEmail ||
    ""
  );
  const [formTelefone, setFormTelefone] = useState(
    ficha.pacienteTelefone ||
    (ficha as any).colaboradorTelefone ||
    ficha.colaboradorWhatsapp ||
    ""
  );

  const handleSalvarDadosFaturamentoManualmente = async () => {
    setSalvandoDados(true);
    try {
      const updates: any = {
        pacienteNomeCompleto: formNome.trim(),
        pacienteCpf: formCpf.trim(),
        pacienteDataNascimento: formDataNasc,
        pacienteEmail: formEmail.trim().toLowerCase(),
        pacienteTelefone: formTelefone.trim(),
        colaboradorEmail: formEmail.trim().toLowerCase(),
        colaboradorDataNascimento: formDataNasc,
        cpf: formCpf.trim(),
        dadosFaturamentoPreenchidosEm: new Date().toLocaleDateString("pt-BR"),
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, "triagem_corporativa", ficha.id), updates);
      Object.assign(ficha, updates);
      if (onUpdateFicha) {
        onUpdateFicha({ ...ficha, ...updates });
      }
      setEditandoDados(false);
      showToast("Dados cadastrais do paciente atualizados com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar dados do paciente:", err);
      showToast("Erro ao salvar dados.");
    } finally {
      setSalvandoDados(false);
    }
  };

  const handleSalvarNota = async () => {
    if (!novaNota.trim()) return;
    setSalvandoNota(true);
    try {
      const agora = new Date().toISOString();
      const novoHistorico = [
        ...(ficha.historico || []),
        {
          data: agora,
          autor: "Triagem / Profissional",
          acao: "Anotação de Evolução / Triagem",
          detalhes: novaNota.trim(),
        },
      ];

      await updateDoc(doc(db, "triagem_corporativa", ficha.id), {
        observacoesTriagem: ficha.observacoesTriagem
          ? `${ficha.observacoesTriagem}\n[${new Date().toLocaleDateString("pt-BR")}] ${novaNota.trim()}`
          : `[${new Date().toLocaleDateString("pt-BR")}] ${novaNota.trim()}`,
        updatedAt: serverTimestamp(),
        historico: novoHistorico,
      });

      ficha.historico = novoHistorico;
      ficha.observacoesTriagem = ficha.observacoesTriagem
        ? `${ficha.observacoesTriagem}\n[${new Date().toLocaleDateString("pt-BR")}] ${novaNota.trim()}`
        : `[${new Date().toLocaleDateString("pt-BR")}] ${novaNota.trim()}`;
      setNovaNota("");
    } catch (err) {
      console.error("Erro ao salvar nota:", err);
    } finally {
      setSalvandoNota(false);
    }
  };

  const statusConfig: Record<StatusFichaCorporativa, { label: string; bg: string; text: string }> = {
    solicitacao_servico: {
      label: "Solicitação de Serviço",
      bg: "bg-amber-100",
      text: "text-amber-900",
    },
    paciente: {
      label: "Paciente Ativo (Em Atendimento)",
      bg: "bg-emerald-100",
      text: "text-emerald-900",
    },
    alta: {
      label: "Alta Clínica Concluída",
      bg: "bg-blue-100",
      text: "text-blue-900",
    },
    interrupcao: {
      label: "Atendimento Interrompido",
      bg: "bg-rose-100",
      text: "text-rose-900",
    },
  };

  const statusBadge = statusConfig[ficha.status] || {
    label: ficha.status,
    bg: "bg-gray-100",
    text: "text-gray-800",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-forest/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-soft overflow-hidden">
        {/* TOP BAR */}
        <div className="px-3.5 sm:px-6 py-2.5 sm:py-4 bg-warm/30 border-b border-soft flex items-center justify-between gap-2 sm:gap-4 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
              <span className={`px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold shrink-0 ${statusBadge.bg} ${statusBadge.text}`}>
                {statusBadge.label}
              </span>
              <span className="text-[10px] sm:text-xs text-forest/50 font-medium truncate">
                Ficha de Bordo Corporativa
              </span>
            </div>
            <h3
              className="text-base sm:text-xl font-bold font-serif text-forest truncate leading-tight"
              title={ficha.colaboradorNome}
            >
              {ficha.colaboradorNome}
            </h3>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={onAbrirContrato}
              className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 cursor-pointer shadow-xs transition-all ${
                ficha.contratoAssinado
                  ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                  : ficha.contratoText
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-forest hover:bg-forest/90 text-white"
              }`}
              title="Gerar ou visualizar contrato terapêutico com aceite digital"
            >
              <FileSignature className="w-3.5 h-3.5 text-sun shrink-0" />
              <span className="hidden sm:inline">
                {ficha.contratoAssinado
                  ? "Contrato Assinado"
                  : ficha.contratoText
                    ? "Gerenciar Contrato"
                    : "Gerar Contrato"}
              </span>
              <span className="sm:hidden">
                {ficha.contratoAssinado ? "Assinado" : "Contrato"}
              </span>
            </button>
            <button
              type="button"
              onClick={onWhatsApp}
              className="px-2 py-1 sm:px-3 sm:py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 cursor-pointer shadow-xs transition-all"
              title="Chamar colaborador no WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Chamar WhatsApp</span>
              <span className="sm:hidden">Whats</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 sm:p-1.5 text-forest/40 hover:text-forest rounded-full cursor-pointer transition-colors shrink-0"
              title="Fechar"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* CORPO DO MODAL (SCROLL) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-forest">
          {/* BLOCO 1: DADOS CORPORATIVOS & BENEFICIÁRIO (Sem dados socioeconômicos) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-warm/20 rounded-2xl p-4 border border-soft/80 space-y-2">
              <h4 className="text-xs font-bold text-forest uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                Vínculo Corporativo
              </h4>
              <div className="text-xs space-y-1">
                {isProfissional ? (
                  <>
                    <div className="pt-0.5 pb-1">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                        Paciente Corporativo (Convênio Ativo)
                      </span>
                    </div>
                    <p className="text-[11px] text-forest/60 italic leading-relaxed">
                      Os dados de cargo, nível e identificação da empresa são sigilosos e protegidos pela gestão de acolhimento.
                    </p>
                    <p className="pt-1">
                      <strong className="text-forest/60">WhatsApp:</strong>{" "}
                      <span className="font-mono">{ficha.colaboradorWhatsapp}</span>
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      <strong className="text-forest/60">Empresa Conveniada:</strong>{" "}
                      <span className="font-semibold">{ficha.empresaNome}</span>
                    </p>
                    <p>
                      <strong className="text-forest/60">Cargo / Função:</strong>{" "}
                      <span>{ficha.cargoNome}</span>
                    </p>
                    <p>
                      <strong className="text-forest/60">WhatsApp:</strong>{" "}
                      <span className="font-mono">{ficha.colaboradorWhatsapp}</span>
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="bg-warm/20 rounded-2xl p-4 border border-soft/80 space-y-2">
              <h4 className="text-xs font-bold text-forest uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-700" />
                Paciente Atendido
              </h4>
              <div className="text-xs space-y-1">
                <p>
                  <strong className="text-forest/60">Tipo de Beneficiário:</strong>{" "}
                  <span className="capitalize font-semibold">{ficha.beneficiarioTipo}</span>
                </p>
                {ficha.beneficiarioTipo === "dependente" ? (
                  <>
                    <p>
                      <strong className="text-forest/60">Nome do Dependente:</strong>{" "}
                      <span className="font-semibold">{ficha.dependenteInfo || "Não especificado"}</span>
                    </p>
                    <p>
                      <strong className="text-forest/60">Parentesco:</strong>{" "}
                      <span>{ficha.dependenteParentesco || "Família"}</span>
                    </p>
                  </>
                ) : (
                  <p className="text-forest/60 italic">
                    O próprio colaborador titular é quem realiza o acompanhamento.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* NOVO BLOCO: DADOS CADASTRAIS & FATURAMENTO DO PACIENTE */}
          <div className="bg-gradient-to-r from-emerald-50/90 via-warm/25 to-emerald-50/70 rounded-2xl p-4 sm:p-5 border border-emerald-300/80 space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs shrink-0">
                  <CreditCard className="w-4 h-4 text-sun" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-forest uppercase tracking-wider">
                      Dados para Recibos & Faturamento (Tomador)
                    </h4>
                    {formCpf ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Cadastrado
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        Pendente
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-forest/60">
                    CPF, data de nascimento e contatos para emissão na Receita Federal (Receita Saúde) e NFS-e
                  </p>
                </div>
              </div>

              {/* Ações: Gerar Link / Enviar WhatsApp / Editar */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setModalColetaLink(true)}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  title="Gerar e copiar link de coleta para envio ao paciente"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-sun" />
                  <span>Link de Coleta</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const link = `${window.location.origin}/?dados_faturamento=${ficha.id}`;
                    const pNome = formNome ? formNome.split(" ")[0] : ficha.colaboradorNome.split(" ")[0];
                    const msg = `Olá, *${pNome}*! Tudo bem? 🌿\n\nPara fins de emissão de recibos e documentação dos seus atendimentos psicológicos, por favor confirme seus dados cadastrais (CPF, data de nascimento e e-mail) através do nosso link seguro:\n\n${link}\n\nLeva menos de 1 minuto e garante a correta emissão fiscal. Muito obrigado!`;
                    const wppClean = (ficha.colaboradorWhatsapp || "").replace(/\D/g, "");
                    const wppUrl = wppClean ? `https://wa.me/55${wppClean}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
                    window.open(wppUrl, "_blank");
                    showToast("Mensagem de coleta aberta no WhatsApp!");
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Enviar convite de preenchimento direto no WhatsApp do paciente"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Enviar WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditandoDados(!editandoDados)}
                  className="px-2.5 py-1.5 bg-white hover:bg-warm text-forest border border-soft rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Editar dados manualmente nesta ficha"
                >
                  <Edit3 className="w-3.5 h-3.5 text-forest/70" />
                  <span>{editandoDados ? "Fechar Edição" : "Editar"}</span>
                </button>
              </div>
            </div>

            {/* MODO VISUALIZAÇÃO DOS DADOS */}
            {!editandoDados ? (
              <div className="bg-white/95 p-3.5 sm:p-4 rounded-xl border border-emerald-200/90 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 text-xs shadow-2xs">
                <div>
                  <span className="text-[10px] text-forest/60 uppercase font-bold tracking-wider block">Nome do Tomador</span>
                  <span className="font-bold text-forest truncate block" title={formNome || "Não informado"}>
                    {formNome || <em className="text-forest/40 font-normal">Não informado</em>}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-forest/60 uppercase font-bold tracking-wider block">CPF</span>
                  <span className="font-mono font-bold text-emerald-900 block">
                    {formCpf ? formCpf : <span className="text-amber-600 font-sans font-medium text-[11px]">Pendente de coleta</span>}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-forest/60 uppercase font-bold tracking-wider block">Data de Nascimento</span>
                  <span className="font-medium text-forest block">
                    {formDataNasc ? formDataNasc.split("-").reverse().join("/") : <span className="text-forest/40 text-[11px]">Não informada</span>}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-forest/60 uppercase font-bold tracking-wider block">E-mail para Recibo</span>
                  <span className="font-medium text-forest truncate block" title={formEmail || "Não informado"}>
                    {formEmail || <span className="text-forest/40 text-[11px]">Não informado</span>}
                  </span>
                </div>
              </div>
            ) : (
              /* MODO EDIÇÃO MANUAL DIRETA */
              <div className="bg-white p-4 rounded-xl border border-emerald-300 space-y-3 text-xs shadow-xs">
                <div className="flex items-center justify-between pb-1 border-b border-soft">
                  <span className="font-bold text-forest">Edição Manual dos Dados Cadastrais</span>
                  <span className="text-[10px] text-forest/60">Preencha diretamente se o paciente informar por mensagem</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-forest/70 block mb-1">Nome Completo do Paciente *</label>
                    <input
                      type="text"
                      value={formNome}
                      onChange={(e) => setFormNome(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-soft text-forest text-xs outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-forest/70 block mb-1">CPF (apenas números ou pontuado) *</label>
                    <input
                      type="text"
                      value={formCpf}
                      onChange={(e) => setFormCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full px-3 py-1.5 rounded-lg border border-soft text-forest font-mono text-xs outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-forest/70 block mb-1">Data de Nascimento</label>
                    <input
                      type="date"
                      value={formDataNasc}
                      onChange={(e) => setFormDataNasc(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-soft text-forest text-xs outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-forest/70 block mb-1">E-mail para Recibo</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="email@paciente.com"
                      className="w-full px-3 py-1.5 rounded-lg border border-soft text-forest text-xs outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-forest/70 block mb-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      value={formTelefone}
                      onChange={(e) => setFormTelefone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full px-3 py-1.5 rounded-lg border border-soft text-forest text-xs outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-soft">
                  <button
                    type="button"
                    onClick={() => setEditandoDados(false)}
                    className="px-3 py-1.5 text-xs text-forest/70 hover:text-forest"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={salvandoDados}
                    onClick={handleSalvarDadosFaturamentoManualmente}
                    className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {salvandoDados ? "Gravando..." : "Salvar Alterações"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* BLOCO 2: CONDIÇÃO COMERCIAL DA TABELA CORPORATIVA */}
          <div className="bg-emerald-50/40 rounded-2xl p-4 sm:p-5 border border-emerald-200/60 space-y-2">
            <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
              Condição Comercial Fixada pela Empresa
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div className="bg-white/90 p-3 rounded-xl border border-emerald-100">
                <span className="text-[11px] text-forest/60 block">Serviço Solicitado</span>
                <span className="font-bold text-forest text-sm">{ficha.servicoNome}</span>
              </div>
              <div className="bg-white/90 p-3 rounded-xl border border-emerald-100">
                <span className="text-[11px] text-forest/60 block">Valor por Sessão</span>
                <span className="font-bold text-emerald-900 text-sm font-serif">
                  R$ {ficha.valorSessao},00
                </span>
              </div>
              <div className="bg-white/90 p-3 rounded-xl border border-emerald-100">
                <span className="text-[11px] text-forest/60 block">Frequência Recomendada</span>
                <span className="font-semibold text-forest text-xs">{ficha.frequenciaRecomendada}</span>
              </div>
            </div>
          </div>

          {/* BLOCO: CONTRATO TERAPÊUTICO & FORMALIZAÇÃO CLÍNICA */}
          <div className="bg-gradient-to-r from-emerald-50/70 via-warm/20 to-emerald-50/70 rounded-2xl p-4 sm:p-5 border border-emerald-200/90 space-y-3.5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs shrink-0">
                  <FileSignature className="w-4 h-4 text-sun" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-forest uppercase tracking-wider">
                    Contrato Terapêutico & Aceite Digital (CFP)
                  </h4>
                  <p className="text-[11px] text-forest/60">
                    Formalização do enquadre clínico, honorários conveniados e sigilo profissional
                  </p>
                </div>
              </div>

              {ficha.contratoAssinado ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Assinado & Válido
                </span>
              ) : ficha.contratoText ? (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" /> Aguardando Assinatura do Paciente
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-warm text-forest/70 border border-soft">
                  Contrato Pendente
                </span>
              )}
            </div>

            {ficha.contratoAssinado ? (
              <div className="bg-white/95 p-4 rounded-xl border border-emerald-200 space-y-2.5 text-xs shadow-2xs">
                <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                  <span className="text-forest/80">
                    Signatário: <strong className="text-forest">{ficha.dadosContrato?.pacienteNome || ficha.colaboradorNome}</strong>
                    {ficha.dadosContrato?.pacienteCpf && <span className="font-mono text-forest/60"> (CPF: {ficha.dadosContrato.pacienteCpf})</span>}
                  </span>
                  <span className="font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Assinado em: {ficha.contratoAssinadoEm || ficha.dadosContrato?.dataAceiteFormatada || "Registrado"}
                  </span>
                </div>
                {ficha.dadosContrato?.hashContrato && (
                  <div className="text-[10px] text-forest/60 font-mono bg-warm/40 p-2 rounded-lg border border-soft/80 break-all select-all">
                    Hash SHA-256: {ficha.dadosContrato.hashContrato}
                  </div>
                )}
                <div className="flex items-center justify-end gap-2 pt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={onAbrirContrato}
                    className="px-3 py-1.5 bg-forest text-white rounded-xl text-xs font-semibold hover:bg-forest/90 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <FileSignature className="w-3.5 h-3.5 text-sun" />
                    <span>Ver / Reemitir Contrato</span>
                  </button>
                  <a
                    href={`/?contrato=${ficha.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir Via Pública</span>
                  </a>
                </div>
              </div>
            ) : ficha.contratoText ? (
              <div className="bg-white/95 p-4 rounded-xl border border-amber-200 space-y-2.5 text-xs shadow-2xs">
                <p className="text-forest/80 text-xs leading-relaxed">
                  O contrato foi gerado com as regras conveniadas de <strong>R$ {ficha.valorSessao},00/sessão</strong> ({ficha.frequenciaRecomendada}) com a empresa <strong>{ficha.empresaNome}</strong>. O link seguro está pronto para envio ao paciente.
                </p>
                <div className="flex items-center justify-end gap-2 pt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      const link = `${window.location.origin}/?contrato=${ficha.id}`;
                      navigator.clipboard.writeText(link);
                      showToast("Link seguro do contrato copiado!");
                    }}
                    className="px-3 py-1.5 bg-white text-forest border border-soft hover:bg-warm rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Copy className="w-3.5 h-3.5 text-forest/60" />
                    <span>Copiar Link de Assinatura</span>
                  </button>
                  <button
                    type="button"
                    onClick={onAbrirContrato}
                    className="px-3.5 py-1.5 bg-forest text-white hover:bg-forest/90 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <FileSignature className="w-3.5 h-3.5 text-sun" />
                    <span>Gerenciar / Enviar WhatsApp</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white/90 p-4 rounded-xl border border-soft flex items-center justify-between gap-4 flex-wrap text-xs shadow-2xs">
                <p className="text-forest/70 text-xs max-w-md leading-relaxed">
                  Formalize o enquadre terapêutico corporativo (sigilo profissional, faltas e frequência acordada com a <strong>{ficha.empresaNome}</strong>) gerando um contrato com link para assinatura digital do paciente.
                </p>
                <button
                  type="button"
                  onClick={onAbrirContrato}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <FileSignature className="w-3.5 h-3.5 text-sun" />
                  <span>Gerar Contrato para este Paciente</span>
                </button>
              </div>
            )}
          </div>

          {/* ÁREA DE FATURAMENTO, SESSÕES & RECIBOS DO COLABORADOR */}
          <div className="pt-1">
            <PacienteFaturamentoSpreadsheet
              pacienteId={ficha.id}
              pacienteNome={formNome || ficha.pacienteNomeCompleto || ficha.dadosContrato?.pacienteNome || ficha.colaboradorNome}
              pacienteCpf={formCpf || ficha.pacienteCpf || ficha.dadosContrato?.pacienteCpf || ""}
              pacienteTelefone={formTelefone || ficha.pacienteTelefone || (ficha as any).colaboradorTelefone || ficha.colaboradorWhatsapp || ""}
              pacienteEmail={formEmail || ficha.pacienteEmail || (ficha as any).colaboradorEmail || ""}
              valorSessaoPadrao={ficha.valorSessao || "80"}
              frequenciaPadrao={ficha.frequenciaRecomendada || "Semanal"}
              sessoes={Array.isArray((ficha as any).historicoSessoes) ? (ficha as any).historicoSessoes : []}
              onSaveSessoes={async (novasSessoes) => {
                try {
                  await updateDoc(doc(db, "triagem_corporativa", ficha.id), {
                    historicoSessoes: novasSessoes,
                    updatedAt: serverTimestamp(),
                  });
                  (ficha as any).historicoSessoes = novasSessoes;
                  if (onUpdateFicha) {
                    onUpdateFicha({ ...ficha, historicoSessoes: novasSessoes } as any);
                  }
                } catch (err) {
                  console.error("Erro ao salvar sessões de faturamento corporativo:", err);
                  showToast("Erro ao salvar sessões de faturamento.");
                }
              }}
              perfilFaturamento={(ficha as any).perfilFaturamento || "PF"}
              onUpdatePerfilFaturamento={async (novoPerfil) => {
                try {
                  await updateDoc(doc(db, "triagem_corporativa", ficha.id), {
                    perfilFaturamento: novoPerfil,
                    updatedAt: serverTimestamp(),
                  });
                  (ficha as any).perfilFaturamento = novoPerfil;
                  if (onUpdateFicha) {
                    onUpdateFicha({ ...ficha, perfilFaturamento: novoPerfil } as any);
                  }
                } catch (err) {
                  console.error("Erro ao atualizar perfil de faturamento corporativo:", err);
                  showToast("Erro ao atualizar perfil de faturamento.");
                }
              }}
              onSaveDadosPJ={async (novosDadosPJ) => {
                const targetUid = currentUserProfile?.uid || currentUserProfile?.id;
                if (!targetUid) return;
                try {
                  await updateDoc(doc(db, "users", targetUid), {
                    dadosPJ: novosDadosPJ,
                    updatedAt: serverTimestamp(),
                  });
                  if (currentUserProfile) {
                    currentUserProfile.dadosPJ = novosDadosPJ;
                  }
                } catch (err) {
                  console.error("Erro ao salvar dados da PJ corporativo:", err);
                  showToast("Erro ao salvar dados da PJ.");
                }
              }}
              profissionalLogado={{
                name: ficha.profissionalNome || currentUserProfile?.name || currentUserProfile?.nome,
                nome: ficha.profissionalNome || currentUserProfile?.nome || currentUserProfile?.name,
                crp: ficha.profissionalCrp || currentUserProfile?.crp,
                cpf: currentUserProfile?.cpf,
                especialidade: currentUserProfile?.especialidade,
                chavePix: currentUserProfile?.chavePix,
                email: currentUserProfile?.email,
                telefone: currentUserProfile?.telefone,
                dadosPJ: currentUserProfile?.dadosPJ || currentUserProfile?.perfilPJ,
                faturamentoPadrao: currentUserProfile?.faturamentoPadrao || "PF",
              }}
              showToast={showToast}
              isCorporativo={true}
              empresaNome={ficha.empresaNome || "Empresa Conveniada"}
            />
          </div>

          {/* BLOCO 3: DEMANDA CLÍNICA & PREFERÊNCIAS */}
          <div className="bg-warm/20 rounded-2xl p-4 sm:p-5 border border-soft space-y-3">
            <h4 className="text-xs font-bold text-forest uppercase tracking-wider flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-emerald-700" />
              Demanda & Preferência de Horários
            </h4>
            <div className="text-xs space-y-2">
              <p>
                <strong className="text-forest/60">Disponibilidade de Turno:</strong>{" "}
                <span className="px-2 py-0.5 rounded-md bg-white border border-soft font-semibold text-forest">
                  {ficha.turnoPreferencia || "Horários a combinar"}
                </span>
              </p>
              <div>
                <strong className="text-forest/60 block mb-1">Queixa / Motivo Informado:</strong>
                <p className="bg-white p-3 rounded-xl border border-soft text-forest/80 leading-relaxed italic">
                  "{ficha.queixa || "Acolhimento psicológico no convênio corporativo."}"
                </p>
              </div>
            </div>
          </div>

          {/* BLOCO 4: PROFISSIONAL RESPONSÁVEL */}
          <div className="bg-warm/20 rounded-2xl p-4 border border-soft flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {ficha.profissionalFoto ? (
                <img
                  src={ficha.profissionalFoto}
                  alt={ficha.profissionalNome}
                  className="w-10 h-10 rounded-full object-cover border border-emerald-600"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-forest/10 flex items-center justify-center font-bold text-forest text-sm">
                  {ficha.profissionalNome ? ficha.profissionalNome.charAt(0) : "P"}
                </div>
              )}
              <div>
                <span className="text-[10px] text-forest/50 font-bold uppercase block">
                  Profissional Requisitado
                </span>
                <h5 className="font-bold text-forest text-sm">{ficha.profissionalNome}</h5>
                {ficha.profissionalCrp && (
                  <span className="text-[11px] text-forest/60 font-mono">
                    CRP: {ficha.profissionalCrp}
                  </span>
                )}
              </div>
            </div>

            {ficha.aceitoPor && (
              <div className="text-right text-[11px] text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                <span>Aceite formalizado por:</span>
                <strong className="block font-bold">{ficha.aceitoPor}</strong>
              </div>
            )}
          </div>

          {/* BLOCO 5: HISTÓRICO & LINHA DO TEMPO */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-forest uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-forest/50" />
              Histórico do Caso
            </h4>
            <div className="bg-warm/30 rounded-2xl p-4 border border-soft space-y-2.5 max-h-48 overflow-y-auto text-xs">
              {ficha.historico && ficha.historico.length > 0 ? (
                ficha.historico.map((h, idx) => (
                  <div key={idx} className="pb-2 border-b border-soft/60 last:border-none last:pb-0">
                    <div className="flex items-center justify-between text-[11px] text-forest/50">
                      <strong>{h.autor}</strong>
                      <span>{new Date(h.data).toLocaleString("pt-BR")}</span>
                    </div>
                    <p className="font-semibold text-forest text-xs mt-0.5">{h.acao}</p>
                    {h.detalhes && <p className="text-[11px] text-forest/70">{h.detalhes}</p>}
                  </div>
                ))
              ) : (
                <p className="text-forest/50 text-[11px]">Nenhum evento registrado no histórico.</p>
              )}
            </div>
          </div>

          {/* BLOCO 6: OBSERVAÇÕES E NOTAS INTERNAS */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-forest uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-forest/50" />
              Anotações Internas (Triagem & Profissional)
            </h4>
            {ficha.observacoesTriagem && (
              <pre className="bg-warm/20 p-3 rounded-xl border border-soft text-xs text-forest/80 font-sans whitespace-pre-wrap">
                {ficha.observacoesTriagem}
              </pre>
            )}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={novaNota}
                onChange={(e) => setNovaNota(e.target.value)}
                placeholder="Adicionar nota interna ao histórico deste colaborador..."
                className="flex-1 p-2.5 bg-warm/30 rounded-xl text-xs border border-soft outline-none focus:border-forest/40"
              />
              <button
                type="button"
                disabled={salvandoNota || !novaNota.trim()}
                onClick={handleSalvarNota}
                className="px-4 py-2.5 bg-forest text-white rounded-xl text-xs font-bold hover:bg-forest/90 transition-all cursor-pointer disabled:opacity-50"
              >
                {salvandoNota ? "Salvando..." : "Adicionar"}
              </button>
            </div>
          </div>
        </div>

        {/* RODAPÉ DE AÇÕES */}
        <div className="p-4 sm:p-5 bg-warm/30 border-t border-soft flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-forest/70 hover:text-forest"
          >
            Fechar
          </button>

          <div className="flex items-center gap-2">
            {/* Aceitar Solicitação */}
            {ficha.status === "solicitacao_servico" && (
              <button
                type="button"
                disabled={saving}
                onClick={onAceitar}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>Dar Aceite na Ficha (Mover para Paciente)</span>
              </button>
            )}

            {/* Ações de Paciente Ativo */}
            {ficha.status === "paciente" && (
              <>
                <button
                  type="button"
                  onClick={onAlta}
                  className="px-4 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-all cursor-pointer"
                >
                  Conceder Alta Clínica
                </button>
                <button
                  type="button"
                  onClick={onInterrupcao}
                  className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-all cursor-pointer"
                >
                  Registrar Interrupção
                </button>
              </>
            )}

            {/* Reativação */}
            {(ficha.status === "alta" || ficha.status === "interrupcao") && (
              <button
                type="button"
                disabled={saving}
                onClick={onReativar}
                className="px-5 py-2.5 bg-forest hover:bg-forest/90 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reativar Paciente no Kanban</span>
              </button>
            )}
          </div>
        </div>

        {/* MODAL: LINK DE COLETA DE DADOS PARA FATURAMENTO */}
        {modalColetaLink && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-forest/80 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-soft space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-soft">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-forest">Link de Coleta Cadastral</h4>
                    <p className="text-[11px] text-forest/60">Envio para preenchimento direto pelo paciente</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalColetaLink(false)}
                  className="p-1 text-forest/40 hover:text-forest rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-forest/80">
                <p>
                  O paciente acessará uma página segura para informar <strong>Nome Completo</strong>, <strong>CPF</strong>, <strong>Data de Nascimento</strong>, <strong>E-mail</strong> e <strong>Telefone</strong>. Assim que ele enviar, os dados serão atualizados automaticamente nesta ficha.
                </p>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-forest/60 block mb-1">
                    Link Seguro Exclusivo do Paciente:
                  </label>
                  <div className="flex items-center gap-1.5 bg-warm/30 p-2 rounded-xl border border-soft">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/?dados_faturamento=${ficha.id}`}
                      className="bg-transparent text-xs font-mono text-forest flex-1 outline-none select-all truncate"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const link = `${window.location.origin}/?dados_faturamento=${ficha.id}`;
                        navigator.clipboard.writeText(link);
                        showToast("Link copiado para a área de transferência!");
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-warm border border-soft rounded-lg text-xs font-semibold text-forest flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <Copy className="w-3.5 h-3.5 text-forest/60" />
                      <span>Copiar</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-forest/60 block mb-1">
                    Sugestão de Mensagem para WhatsApp:
                  </label>
                  <div className="bg-warm/30 p-3 rounded-xl border border-soft text-[11px] text-forest/80 whitespace-pre-line leading-relaxed font-sans">
                    {`Olá, ${formNome ? formNome.split(" ")[0] : ficha.colaboradorNome.split(" ")[0]}! Tudo bem? 🌿

Para fins de emissão de recibos e documentação dos seus atendimentos psicológicos, por favor confirme seus dados cadastrais (CPF, data de nascimento e e-mail) através do nosso link seguro:

${window.location.origin}/?dados_faturamento=${ficha.id}

Leva menos de 1 minuto e garante a correta emissão fiscal. Muito obrigado!`}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-soft">
                <button
                  type="button"
                  onClick={() => setModalColetaLink(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-forest/70 hover:text-forest"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const link = `${window.location.origin}/?dados_faturamento=${ficha.id}`;
                    const pNome = formNome ? formNome.split(" ")[0] : ficha.colaboradorNome.split(" ")[0];
                    const msg = `Olá, *${pNome}*! Tudo bem? 🌿\n\nPara fins de emissão de recibos e documentação dos seus atendimentos psicológicos, por favor confirme seus dados cadastrais (CPF, data de nascimento e e-mail) através do nosso link seguro:\n\n${link}\n\nLeva menos de 1 minuto e garante a correta emissão fiscal. Muito obrigado!`;
                    navigator.clipboard.writeText(msg);
                    showToast("Texto completo copiado para o WhatsApp!");
                  }}
                  className="px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Mensagem</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const link = `${window.location.origin}/?dados_faturamento=${ficha.id}`;
                    const pNome = formNome ? formNome.split(" ")[0] : ficha.colaboradorNome.split(" ")[0];
                    const msg = `Olá, *${pNome}*! Tudo bem? 🌿\n\nPara fins de emissão de recibos e documentação dos seus atendimentos psicológicos, por favor confirme seus dados cadastrais (CPF, data de nascimento e e-mail) através do nosso link seguro:\n\n${link}\n\nLeva menos de 1 minuto e garante a correta emissão fiscal. Muito obrigado!`;
                    const wppClean = (ficha.colaboradorWhatsapp || "").replace(/\D/g, "");
                    const wppUrl = wppClean ? `https://wa.me/55${wppClean}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
                    window.open(wppUrl, "_blank");
                    setModalColetaLink(false);
                    showToast("Fechamento aberto no WhatsApp!");
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Abrir no WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
