import React, { useState, useEffect } from "react";
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

  // Lista única de empresas e profissionais para filtros
  const empresasList = Array.from(
    new Set(fichas.map((f) => f.empresaNome).filter(Boolean))
  );
  const profissionaisList = Array.from(
    new Set(fichas.map((f) => f.profissionalNome).filter(Boolean))
  );

  // Filtragem
  const fichasFiltradas = fichas.filter((f) => {
    // Se for profissional logado e não for master/triagem, por padrão pode filtrar seus casos ou visualizar todos
    const matchBusca =
      !busca ||
      f.colaboradorNome?.toLowerCase().includes(busca.toLowerCase()) ||
      f.empresaNome?.toLowerCase().includes(busca.toLowerCase()) ||
      f.dependenteInfo?.toLowerCase().includes(busca.toLowerCase()) ||
      f.servicoNome?.toLowerCase().includes(busca.toLowerCase()) ||
      f.profissionalNome?.toLowerCase().includes(busca.toLowerCase()) ||
      f.queixa?.toLowerCase().includes(busca.toLowerCase());

    const matchEmpresa = filtroEmpresa === "todas" || f.empresaNome === filtroEmpresa;
    const matchProf = filtroProfissional === "todos" || f.profissionalNome === filtroProfissional;

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
    const msg = encodeURIComponent(
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
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-soft shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 text-[11px] font-bold rounded-full border border-emerald-200 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              Gestão de Convênios Corporativos
            </span>
            <span className="text-xs text-forest/50 font-medium">
              Fichas de Bordo & Triagem
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif text-forest">
            Esteira & Kanban Corporativo
          </h2>
          <p className="text-xs sm:text-sm text-forest/70 max-w-2xl mt-1">
            Acompanhe o fluxo exclusivo de colaboradores e dependentes credenciados:
            solicitações de serviço, aceite pelo profissional, pacientes ativos e gestão de altas ou interrupções.
          </p>
        </div>

        {/* Alternador de Kanban: Atendimento vs Desfechos */}
        <div className="flex items-center gap-1 bg-warm p-1 rounded-2xl border border-soft self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setModoKanban("atendimento")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              modoKanban === "atendimento"
                ? "bg-white text-forest shadow-xs"
                : "text-forest/60 hover:text-forest"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>Fluxo de Atendimento</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
              {solicitacoes.length + pacientesAtivos.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setModoKanban("desfechos")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              modoKanban === "desfechos"
                ? "bg-white text-forest shadow-xs"
                : "text-forest/60 hover:text-forest"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>Altas / Interrupções</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-purple-100 text-purple-800 font-bold">
              {altas.length + interrupcoes.length}
            </span>
          </button>
        </div>
      </div>

      {/* FILTROS E BUSCA */}
      <div className="bg-white rounded-2xl p-4 border border-soft shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-forest/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por colaborador, dependente, empresa, profissional ou queixa..."
            className="w-full pl-9 pr-4 py-2 bg-warm/30 hover:bg-warm/50 focus:bg-white rounded-xl text-xs text-forest border border-soft focus:border-forest/40 outline-none transition-all"
          />
          {busca && (
            <button
              onClick={() => setBusca("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-forest/40 hover:text-forest text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Filtro Empresa */}
          <div className="flex items-center gap-1.5 bg-warm/40 px-3 py-1.5 rounded-xl border border-soft text-xs text-forest/80 shrink-0">
            <Building2 className="w-3.5 h-3.5 text-forest/50" />
            <select
              value={filtroEmpresa}
              onChange={(e) => setFiltroEmpresa(e.target.value)}
              className="bg-transparent text-xs text-forest font-semibold outline-none cursor-pointer"
            >
              <option value="todas">Todas as Empresas</option>
              {empresasList.map((emp) => (
                <option key={emp} value={emp}>
                  {emp}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Profissional */}
          <div className="flex items-center gap-1.5 bg-warm/40 px-3 py-1.5 rounded-xl border border-soft text-xs text-forest/80 shrink-0">
            <User className="w-3.5 h-3.5 text-forest/50" />
            <select
              value={filtroProfissional}
              onChange={(e) => setFiltroProfissional(e.target.value)}
              className="bg-transparent text-xs text-forest font-semibold outline-none cursor-pointer"
            >
              <option value="todos">Todos os Profissionais</option>
              {profissionaisList.map((pro) => (
                <option key={pro} value={pro}>
                  {pro}
                </option>
              ))}
            </select>
          </div>
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
          saving={savingAction}
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
  onVerDetalhes,
  onAceitar,
  onAlta,
  onInterrupcao,
  onReativar,
  onWhatsApp,
  saving,
}) => {
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
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-soft shadow-xs hover:shadow-md transition-all space-y-3.5">
      {/* Cabeçalho do Card: Empresa, Data e Badge de Dependente */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-warm text-[10px] font-bold text-forest/70 border border-soft/80">
            <Building2 className="w-3 h-3 text-emerald-700" />
            {ficha.empresaNome} • {ficha.cargoNome}
          </span>
        </div>
        <span className="text-[10px] text-forest/50 font-medium shrink-0">
          {formatData(ficha.createdAt)}
        </span>
      </div>

      {/* Nome do Paciente & Vínculo */}
      <div>
        <div className="flex items-center gap-1.5">
          <h4 className="font-bold text-forest text-sm font-serif">
            {ficha.colaboradorNome}
          </h4>
          {ficha.beneficiarioTipo === "dependente" && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              Dependente: {ficha.dependenteParentesco || "Família"}
            </span>
          )}
        </div>
        {ficha.beneficiarioTipo === "dependente" && ficha.dependenteInfo && (
          <p className="text-[11px] text-forest/60 mt-0.5">
            Paciente: <strong>{ficha.dependenteInfo}</strong>
          </p>
        )}
      </div>

      {/* Serviço, Valor e Frequência Fixados pela Tabela da Empresa */}
      <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100/80 space-y-1.5 text-xs">
        <div className="flex items-center justify-between text-forest/80 font-medium">
          <span className="truncate">{ficha.servicoNome}</span>
          <span className="font-bold text-emerald-900 font-serif shrink-0">
            R$ {ficha.valorSessao},00/sessão
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-forest/60">
          <span>Freq: {ficha.frequenciaRecomendada}</span>
          <span className="bg-white/80 px-2 py-0.5 rounded-md text-[10px] font-semibold text-forest/70 border border-soft">
            Turno: {ficha.turnoPreferencia || "A combinar"}
          </span>
        </div>
      </div>

      {/* Profissional Requisitado */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-soft/50 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          {ficha.profissionalFoto ? (
            <img
              src={ficha.profissionalFoto}
              alt={ficha.profissionalNome}
              className="w-6 h-6 rounded-full object-cover border border-emerald-600 shrink-0"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-forest/10 flex items-center justify-center text-[10px] font-bold text-forest shrink-0">
              {ficha.profissionalNome ? ficha.profissionalNome.charAt(0) : "P"}
            </div>
          )}
          <span className="text-[11px] text-forest/70 font-medium truncate">
            Requisitado: <strong>{ficha.profissionalNome}</strong>
          </span>
        </div>

        <button
          type="button"
          onClick={onWhatsApp}
          title="Falar no WhatsApp"
          className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
        >
          <Phone className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Queixa Inicial (Resumo) */}
      {ficha.queixa && (
        <div className="bg-warm/30 rounded-lg p-2 text-[11px] text-forest/70 italic line-clamp-2">
          "{ficha.queixa}"
        </div>
      )}

      {/* AÇÕES NO CARD */}
      <div className="pt-2 border-t border-soft flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onVerDetalhes}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-forest/80 hover:text-forest hover:bg-warm/60 transition-all flex items-center gap-1 cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-forest/50" />
          <span>Ficha de Bordo</span>
        </button>

        {/* Botão de Aceite se for Solicitação de Serviço */}
        {ficha.status === "solicitacao_servico" && onAceitar && (
          <button
            type="button"
            disabled={saving}
            onClick={onAceitar}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" />
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
                className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all cursor-pointer"
              >
                Alta
              </button>
            )}
            {onInterrupcao && (
              <button
                type="button"
                onClick={onInterrupcao}
                className="px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-all cursor-pointer"
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
            className="px-3 py-1.5 bg-forest text-white rounded-xl text-xs font-semibold hover:bg-forest/90 transition-all cursor-pointer disabled:opacity-50"
          >
            Reativar Caso
          </button>
        )}
      </div>
    </div>
  );
};

// ==========================================
// SUBCOMPONENTE: MODAL DA FICHA DE BORDO
// ==========================================
interface ModalFichaBordoProps {
  ficha: FichaBordoCorporativa;
  onClose: () => void;
  onAceitar: () => void;
  onAlta: () => void;
  onInterrupcao: () => void;
  onReativar: () => void;
  onWhatsApp: () => void;
  saving?: boolean;
}

const ModalFichaBordoDetalhes: React.FC<ModalFichaBordoProps> = ({
  ficha,
  onClose,
  onAceitar,
  onAlta,
  onInterrupcao,
  onReativar,
  onWhatsApp,
  saving,
}) => {
  const [novaNota, setNovaNota] = useState("");
  const [salvandoNota, setSalvandoNota] = useState(false);

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
        <div className="p-5 sm:p-6 bg-warm/30 border-b border-soft flex items-center justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusBadge.bg} ${statusBadge.text}`}>
                {statusBadge.label}
              </span>
              <span className="text-xs text-forest/50 font-medium">
                Ficha de Bordo Corporativa
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold font-serif text-forest">
              {ficha.colaboradorNome}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onWhatsApp}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Chamar WhatsApp</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-forest/40 hover:text-forest rounded-full cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
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
      </div>
    </div>
  );
};
