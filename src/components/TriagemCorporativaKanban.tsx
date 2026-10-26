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
import { FichaBordoCorporativa, StatusFichaCorporativa } from "../types/corporativo";
import { FichaPacienteExternoModal } from "./FichaPacienteExternoModal";

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
  onNavigateToAgenda?: (pacienteId?: string) => void;
}

export const TriagemCorporativaKanban: React.FC<TriagemCorporativaKanbanProps> = ({
  currentRole,
  currentUserProfile,
  onOpenWhatsApp,
  onNavigateToAgenda,
}) => {
  const [fichas, setFichas] = useState<FichaBordoCorporativa[]>([]);
  const [loading, setLoading] = useState(true);

  // Subabas do Corporativo: Solicitação de Serviço -> Atendimento -> Desfechos (Altas / Interrupções)
  const [modoKanban, setModoKanban] = useState<"solicitacoes" | "atendimento" | "desfechos">("atendimento");

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

        {/* Subabas: Solicitação de Serviço -> Atendimento -> Altas / Interrupções */}
        <div className="flex items-center gap-1 bg-warm p-1 rounded-xl border border-soft self-start md:self-auto shrink-0 w-full sm:w-auto overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setModoKanban("solicitacoes")}
            className={`flex-1 sm:flex-initial px-2.5 sm:px-3.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
              modoKanban === "solicitacoes"
                ? "bg-white text-forest shadow-2xs"
                : "text-forest/65 hover:text-forest"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="hidden sm:inline">Solicitação de Serviço</span>
            <span className="sm:hidden">Solicitações</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums shrink-0 ${
                solicitacoes.length > 0
                  ? "bg-amber-100 text-amber-900"
                  : "bg-forest/10 text-forest/65"
              }`}
            >
              {solicitacoes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setModoKanban("atendimento")}
            className={`flex-1 sm:flex-initial px-2.5 sm:px-3.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
              modoKanban === "atendimento"
                ? "bg-white text-forest shadow-2xs"
                : "text-forest/65 hover:text-forest"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Atendimento</span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-emerald-100 text-emerald-800 font-bold tabular-nums shrink-0">
              {pacientesAtivos.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setModoKanban("desfechos")}
            className={`flex-1 sm:flex-initial px-2.5 sm:px-3.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
              modoKanban === "desfechos"
                ? "bg-white text-forest shadow-2xs"
                : "text-forest/65 hover:text-forest"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span className="hidden sm:inline">Altas / Interrupções</span>
            <span className="sm:hidden">Desfechos</span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-purple-100 text-purple-800 font-bold tabular-nums shrink-0">
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

      {/* PAINEL DA SUBABA SELECIONADA (LARGURA TOTAL) */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="w-7 h-7 text-emerald-600 animate-spin mx-auto" />
          <p className="text-xs text-forest/60 font-medium">Carregando fichas corporativas...</p>
        </div>
      ) : modoKanban === "solicitacoes" ? (
        <div className="w-full bg-warm/40 rounded-3xl p-4 sm:p-6 border border-soft space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-soft">
            <div>
              <h3 className="font-bold font-serif text-forest text-base sm:text-lg">
                Solicitação de Serviço
              </h3>
              <p className="text-xs text-forest/65 mt-0.5">
                Colaboradores que acionaram o profissional via WhatsApp. Aguardando aceite para formalização do atendimento.
              </p>
            </div>
            <span className="self-start sm:self-center text-xs font-bold text-amber-900 bg-amber-100/80 px-3 py-1 rounded-lg tabular-nums shrink-0">
              {solicitacoes.length} {solicitacoes.length === 1 ? "solicitação" : "solicitações"}
            </span>
          </div>

          {solicitacoes.length === 0 ? (
            <div className="py-12 text-center bg-white/70 rounded-2xl border border-dashed border-soft/80 p-6">
              <CheckCircle2 className="w-6 h-6 text-forest/30 mx-auto mb-2" />
              <p className="text-xs sm:text-sm font-semibold text-forest/70">
                Nenhuma solicitação de serviço pendente no momento.
              </p>
              <p className="text-[11px] text-forest/50 mt-1">
                Novos acionamentos corporativos aparecerão aqui para o seu aceite.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {solicitacoes.map((ficha, idx) => (
                <CardFichaCorporativa
                  key={ficha.id}
                  ficha={ficha}
                  index={idx}
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
      ) : modoKanban === "atendimento" ? (
        <div className="w-full bg-warm/40 rounded-3xl p-3.5 sm:p-5 border border-soft space-y-3">
          <div className="flex items-center justify-end">
            <span className="text-[11px] font-bold text-emerald-900 bg-emerald-100/80 px-2.5 py-0.5 rounded-lg tabular-nums shrink-0">
              {pacientesAtivos.length} {pacientesAtivos.length === 1 ? "paciente ativo" : "pacientes ativos"}
            </span>
          </div>

          {pacientesAtivos.length === 0 ? (
            <div className="py-12 text-center bg-white/70 rounded-2xl border border-dashed border-soft/80 p-6 space-y-2">
              <User className="w-6 h-6 text-forest/30 mx-auto" />
              <p className="text-xs sm:text-sm font-semibold text-forest/70">
                Nenhum paciente corporativo em atendimento nesta filtragem.
              </p>
              {solicitacoes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setModoKanban("solicitacoes")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-1 rounded-xl bg-amber-100 hover:bg-amber-200/80 text-amber-900 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Ver {solicitacoes.length} solicitação(ões) aguardando aceite</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {pacientesAtivos.map((ficha, idx) => (
                <CardFichaCorporativa
                  key={ficha.id}
                  ficha={ficha}
                  index={idx}
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
                  onAgendarSessao={
                    onNavigateToAgenda
                      ? () => onNavigateToAgenda(ficha.id)
                      : undefined
                  }
                  saving={savingAction}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="w-full space-y-5">
          {/* SEÇÃO ALTAS CLÍNICAS */}
          <div className="w-full bg-warm/40 rounded-3xl p-4 sm:p-6 border border-soft space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-soft">
              <div>
                <h3 className="font-bold font-serif text-forest text-base sm:text-lg">
                  Altas Clínicas Concluídas
                </h3>
                <p className="text-xs text-forest/65 mt-0.5">
                  Pacientes corporativos que completaram o processo terapêutico e obtiveram alta clínica estruturada.
                </p>
              </div>
              <span className="self-start sm:self-center px-3 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-900 tabular-nums shrink-0">
                {altas.length} {altas.length === 1 ? "alta" : "altas"}
              </span>
            </div>

            {altas.length === 0 ? (
              <div className="py-10 text-center bg-white/70 rounded-2xl border border-dashed border-soft/80 p-4">
                <CheckCircle2 className="w-6 h-6 text-forest/30 mx-auto mb-1.5" />
                <p className="text-xs font-medium text-forest/60">Nenhuma alta clínica registrada nesta filtragem.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {altas.map((ficha, idx) => (
                  <CardFichaCorporativa
                    key={ficha.id}
                    ficha={ficha}
                    index={idx}
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

          {/* SEÇÃO INTERRUPÇÕES */}
          <div className="w-full bg-warm/40 rounded-3xl p-4 sm:p-6 border border-soft space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-soft">
              <div>
                <h3 className="font-bold font-serif text-forest text-base sm:text-lg">
                  Interrupções de Atendimento
                </h3>
                <p className="text-xs text-forest/65 mt-0.5">
                  Atendimentos descontinuados antes da alta (ex.: desligamento da empresa, pausa prolongada ou incompatibilidade de horários).
                </p>
              </div>
              <span className="self-start sm:self-center px-3 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-900 tabular-nums shrink-0">
                {interrupcoes.length} {interrupcoes.length === 1 ? "interrupção" : "interrupções"}
              </span>
            </div>

            {interrupcoes.length === 0 ? (
              <div className="py-10 text-center bg-white/70 rounded-2xl border border-dashed border-soft/80 p-4">
                <UserX className="w-6 h-6 text-forest/30 mx-auto mb-1.5" />
                <p className="text-xs font-medium text-forest/60">Nenhuma interrupção registrada nesta filtragem.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {interrupcoes.map((ficha, idx) => (
                  <CardFichaCorporativa
                    key={ficha.id}
                    ficha={ficha}
                    index={idx}
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
        </div>
      )}

      {/* MODAL FICHA DE BORDO UNIFICADA (MODO CORPORATIVO) */}
      {fichaDetalhes && (
        <FichaPacienteExternoModal
          paciente={fichaDetalhes}
          modoFicha="corporativo"
          collectionName="triagem_corporativa"
          currentRole={currentRole}
          profile={currentUserProfile}
          onClose={() => setFichaDetalhes(null)}
          onUpdatePaciente={(updatedFicha) => {
            setFichas((prev) =>
              prev.map((f) => (f.id === updatedFicha.id ? { ...f, ...updatedFicha } : f))
            );
            setFichaDetalhes((prev) =>
              prev && prev.id === updatedFicha.id ? { ...prev, ...updatedFicha } : prev
            );
          }}
          showToast={(msg) => showToast(msg)}
          onNavigateToAgenda={onNavigateToAgenda}
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
              <strong>
                {modalDesfecho.ficha.nomeCivil ||
                  modalDesfecho.ficha.pacienteNomeCompleto ||
                  modalDesfecho.ficha.colaboradorNome}
              </strong>{" "}
              ({currentRole === "profissional" ? "Convênio Corporativo" : modalDesfecho.ficha.empresaNome}).
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
  index?: number;
  currentRole?: "master" | "triagem" | "profissional";
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onVerDetalhes: () => void;
  onAceitar?: () => void;
  onAlta?: () => void;
  onInterrupcao?: () => void;
  onReativar?: () => void;
  onWhatsApp: () => void;
  onAgendarSessao?: () => void;
  saving?: boolean;
}

const CardFichaCorporativa: React.FC<CardFichaProps> = ({
  ficha,
  index,
  currentRole,
  isExpanded = false,
  onToggleExpand,
  onVerDetalhes,
  onAceitar,
  onAlta,
  onInterrupcao,
  onReativar,
  onWhatsApp,
  onAgendarSessao,
  saving,
}) => {
  const isProfissional = currentRole === "profissional";

  const nomeExibicao =
    ficha.pacienteNomeCompleto?.trim() ||
    ficha.colaboradorNome?.trim() ||
    ficha.dadosContrato?.pacienteNome?.trim() ||
    ficha.dadosContrato?.nome?.trim() ||
    (ficha as any).nome?.trim() ||
    "Paciente Corporativo";

  const telefoneExibicao =
    ficha.pacienteTelefone ||
    ficha.colaboradorWhatsapp ||
    (ficha as any).colaboradorTelefone ||
    (ficha as any).telefone ||
    "";

  const formatPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    const local = digits.startsWith("55") && digits.length >= 12 ? digits.slice(2) : digits;
    if (local.length === 11) {
      return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
    }
    if (local.length === 10) {
      return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
    }
    return raw;
  };

  const telefoneFormatado = telefoneExibicao ? formatPhone(telefoneExibicao) : "";

  const statusLabel =
    ficha.status === "paciente"
      ? "Em Atendimento"
      : ficha.status === "solicitacao_servico"
        ? "Solicitação"
        : ficha.status === "alta"
          ? "Alta Clínica"
          : "Interrompido";

  const statusBadgeClass =
    ficha.status === "paciente"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : ficha.status === "solicitacao_servico"
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : ficha.status === "alta"
          ? "bg-blue-50 text-blue-800 border-blue-200"
          : "bg-rose-50 text-rose-800 border-rose-200";

  const frequenciaCurta = ficha.frequenciaRecomendada
    ? ficha.frequenciaRecomendada.split("(")[0].trim()
    : "Semanal";

  return (
    <div className="bg-white rounded-2xl border border-soft shadow-2xs hover:border-forest/30 transition-all overflow-hidden">
      {/* Layout em 2 Linhas sem Sobreposição */}
      <div
        onClick={onToggleExpand}
        className="px-3.5 sm:px-4 py-3 flex flex-col gap-2.5 cursor-pointer hover:bg-warm/25 transition-colors select-none"
      >
        {/* LINHA 1: Identificação + Selo de Status (esquerda) e Ações Rápidas (direita) */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-2.5">
          <div className="w-full sm:w-auto sm:min-w-[260px] sm:flex-1 flex items-center gap-2 overflow-hidden">
            {typeof index === "number" && (
              <span className="text-[11px] font-mono tabular-nums font-bold text-forest/60 bg-warm px-1.5 py-0.5 rounded-md border border-soft shrink-0">
                #{index + 1}
              </span>
            )}

            <h4
              className="font-bold text-xs sm:text-sm text-forest truncate min-w-0 flex-1 sm:flex-initial"
              title={nomeExibicao}
            >
              {nomeExibicao}
            </h4>

            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 whitespace-nowrap ${statusBadgeClass}`}
            >
              {statusLabel}
            </span>

            {ficha.beneficiarioTipo === "dependente" && (
              <span className="hidden lg:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-warm text-forest/75 border border-soft shrink-0 max-w-[180px] truncate">
                Dependente{ficha.dependenteInfo ? `: ${ficha.dependenteInfo}` : ""}
              </span>
            )}
          </div>

          <div
            className="w-full sm:w-auto flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 shrink-0 sm:ml-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {ficha.status === "solicitacao_servico" && onAceitar && (
              <button
                type="button"
                disabled={saving}
                onClick={onAceitar}
                className="px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                title="Aceitar Solicitação de Serviço"
              >
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Aceitar Ficha</span>
              </button>
            )}

            {telefoneExibicao && (
              <button
                type="button"
                onClick={onWhatsApp}
                className="px-2.5 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-emerald-200 transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
                title="Conversar no WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>WhatsApp</span>
              </button>
            )}

            {ficha.status === "paciente" && onAgendarSessao && (
              <button
                type="button"
                onClick={onAgendarSessao}
                className="px-2.5 sm:px-3 py-1.5 bg-sun-dark text-forest font-semibold text-xs rounded-xl hover:bg-forest hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs group whitespace-nowrap"
                title="Agendar Sessão na Agenda Clínica"
              >
                <Calendar className="w-3.5 h-3.5 text-forest group-hover:text-white transition-colors shrink-0" />
                <span>Agendar</span>
              </button>
            )}

            <button
              type="button"
              onClick={onVerDetalhes}
              className="px-2.5 sm:px-3 py-1.5 bg-forest text-white font-semibold text-xs rounded-xl hover:bg-forest/90 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
              title="Abrir Ficha de Bordo"
            >
              <FileText className="w-3.5 h-3.5 text-sun shrink-0" />
              <span className="hidden sm:inline">Ficha de Bordo</span>
              <span className="sm:hidden">Ficha</span>
            </button>

            {onToggleExpand && (
              <button
                type="button"
                onClick={onToggleExpand}
                className="p-1.5 text-forest/60 hover:text-forest hover:bg-warm rounded-lg transition-colors cursor-pointer shrink-0"
                title={isExpanded ? "Recolher detalhes" : "Expandir detalhes"}
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        {/* LINHA 2: Metadados Alinhados (Vínculo, Serviço, Telefone & Condição Clínica) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4 pt-2 border-t border-soft/60 text-[11px] sm:text-xs text-forest/70">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 min-w-0">
            <span className="font-semibold text-forest/85">
              {isProfissional ? "Convênio Corporativo" : ficha.empresaNome || "Corporativo"}
            </span>

            {!isProfissional && ficha.cargoNome && (
              <span className="text-forest/70 before:content-['•'] before:mr-2.5 before:text-forest/30">
                {ficha.cargoNome}
              </span>
            )}

            {ficha.servicoNome && (
              <span className="text-forest/70 truncate max-w-[230px] before:content-['•'] before:mr-2.5 before:text-forest/30">
                {ficha.servicoNome}
              </span>
            )}

            {telefoneFormatado && (
              <span className="font-mono tabular-nums text-forest/70 whitespace-nowrap before:content-['•'] before:mr-2.5 before:text-forest/30">
                {telefoneFormatado}
              </span>
            )}

            {!isProfissional && ficha.profissionalNome && (
              <span className="text-forest/70 before:content-['•'] before:mr-2.5 before:text-forest/30">
                Prof.: {ficha.profissionalNome}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center sm:justify-end gap-x-2.5 gap-y-1 shrink-0 text-[11px] sm:text-xs">
            {ficha.contratoAssinado ? (
              <span className="text-emerald-700 font-semibold whitespace-nowrap">
                Contrato assinado
              </span>
            ) : ficha.contratoText ? (
              <span className="text-amber-700 font-semibold whitespace-nowrap">
                Contrato pendente
              </span>
            ) : null}

            <span
              className={`text-forest/65 whitespace-nowrap ${
                ficha.contratoAssinado || ficha.contratoText
                  ? "before:content-['•'] before:mr-2.5 before:text-forest/30"
                  : ""
              }`}
            >
              {frequenciaCurta}
            </span>

            {ficha.valorSessao ? (
              <span className="font-bold text-emerald-800 tabular-nums whitespace-nowrap before:content-['•'] before:mr-2.5 before:text-forest/30">
                R$ {ficha.valorSessao}/sessão
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Painel Expandido de Detalhes e Desfechos */}
      {isExpanded && (
        <div
          className="px-4 py-3 bg-warm/25 border-t border-soft/80 flex flex-col gap-2.5 text-xs animate-in fade-in duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-forest/85">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-semibold text-forest/55">
                {isProfissional ? "Modalidade" : "Empresa / Convênio"}
              </span>
              <span className="font-medium">
                {isProfissional ? "Convênio Corporativo Ativo" : ficha.empresaNome || "Corporativo"}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-semibold text-forest/55">
                {isProfissional ? "Serviço / Turno" : "Cargo / Área"}
              </span>
              <span className="font-medium">
                {isProfissional
                  ? `${ficha.servicoNome || "Psicoterapia"}${ficha.turnoPreferencia ? ` · ${ficha.turnoPreferencia}` : ""}`
                  : ficha.cargoNome || "Não informado"}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-semibold text-forest/55">Condição / Valor</span>
              <span className="font-medium tabular-nums">
                R$ {ficha.valorSessao},00/sessão ({ficha.frequenciaRecomendada || "Semanal"})
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-semibold text-forest/55">Profissional Responsável</span>
              <span className="font-medium">{ficha.profissionalNome || "Não atribuído"}</span>
            </div>
          </div>

          {ficha.queixa && (
            <div className="pt-2 border-t border-soft/50 flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-forest/55">Queixa / Motivo:</span>
              <p className="p-2.5 bg-white rounded-lg border border-soft/80 text-forest/80 leading-relaxed text-xs">
                {ficha.queixa}
              </p>
            </div>
          )}

          <div className="pt-2 border-t border-soft/50 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {ficha.status === "solicitacao_servico" && onAceitar && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={onAceitar}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Aceitar Ficha</span>
                </button>
              )}

              {ficha.status === "paciente" && (
                <>
                  {onAlta && (
                    <button
                      type="button"
                      onClick={onAlta}
                      className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all cursor-pointer border border-blue-200"
                    >
                      Registrar Alta
                    </button>
                  )}
                  {onInterrupcao && (
                    <button
                      type="button"
                      onClick={onInterrupcao}
                      className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-all cursor-pointer border border-rose-200"
                    >
                      Interromper Atendimento
                    </button>
                  )}
                </>
              )}

              {(ficha.status === "alta" || ficha.status === "interrupcao") && onReativar && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={onReativar}
                  className="px-3 py-1.5 bg-forest text-white rounded-lg text-xs font-semibold hover:bg-forest/90 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reativar Paciente</span>
                </button>
              )}
            </div>

            <span className="text-[11px] text-forest/50">
              Clique em "Ficha de Bordo" para prontuário, contrato e histórico completo.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
