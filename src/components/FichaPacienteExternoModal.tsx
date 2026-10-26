import React, { useState, useRef, useEffect } from "react";
import {
  User,
  Phone,
  Edit3,
  XCircle,
  CreditCard,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  FileSignature,
  UserX,
  Compass,
  MessageCircle,
  MapPin,
  Heart,
  ShieldCheck,
  Plus,
  Send,
  Save,
  DollarSign,
  AlertCircle,
  Sparkles,
  Copy,
  ExternalLink,
  RefreshCw,
  Building2,
  Lock,
  RotateCcw,
  Check,
} from "lucide-react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { PacienteProntuarioModal, ProntuarioRegistroItem } from "./PacienteProntuarioModal";
import { PacienteFaturamentoSpreadsheet, SessaoFaturamentoItem } from "./PacienteFaturamentoSpreadsheet";
import { ContratoGeradorModal } from "./ContratoGeradorModal";
import { extractLegacySyncFields } from "../types/faturamento";

interface FichaPacienteExternoModalProps {
  paciente: any;
  onClose: () => void;
  onUpdatePaciente: (updatedPaciente: any) => void;
  profile?: any;
  user?: any;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
  onNavigateToAgenda?: (pacienteId?: string) => void;
  collectionName?: "pacientes" | "triagem_corporativa";
  modoFicha?: "externo" | "corporativo";
  currentRole?: "master" | "triagem" | "profissional";
  allUsers?: any[];
}

export function FichaPacienteExternoModal({
  paciente,
  onClose,
  onUpdatePaciente,
  profile,
  user,
  showToast,
  onNavigateToAgenda,
  collectionName,
  modoFicha,
  currentRole,
  allUsers = [],
}: FichaPacienteExternoModalProps) {
  const [currentPaciente, setCurrentPaciente] = useState<any>(paciente);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const isCorporativo =
    modoFicha === "corporativo" ||
    collectionName === "triagem_corporativa" ||
    currentPaciente?.tipoAcolhimento === "corporativo" ||
    !!currentPaciente?.colaboradorNome ||
    !!currentPaciente?.empresaId;

  const targetCollection: "pacientes" | "triagem_corporativa" = isCorporativo
    ? "triagem_corporativa"
    : collectionName || "pacientes";

  const effectiveRole: "master" | "triagem" | "profissional" =
    currentRole ||
    (profile?.role === "master" || profile?.role === "triagem" ? profile.role : "profissional");

  const loggedUid = profile?.uid || user?.uid || "";
  // Sigilo Clínico CFP: Prontuário acessível apenas pelo psicólogo responsável
  const canAccessProntuario =
    !isCorporativo ||
    effectiveRole === "profissional" ||
    (!!loggedUid && loggedUid === currentPaciente?.profissionalId);

  const latestPacienteRef = useRef<any>(paciente);
  const targetCollectionRef = useRef<"pacientes" | "triagem_corporativa">(targetCollection);
  const pendingPatchRef = useRef<Record<string, any>>({});
  const saveTimeoutRef = useRef<any>(null);

  targetCollectionRef.current = targetCollection;

  useEffect(() => {
    setCurrentPaciente(paciente);
    latestPacienteRef.current = paciente;
  }, [paciente?.id]);

  // Submodals
  const [showProntuarioModal, setShowProntuarioModal] = useState(false);
  const [showFaturamentoModal, setShowFaturamentoModal] = useState(false);
  const [showContratoModal, setShowContratoModal] = useState(false);
  const [modalDesfechoCorp, setModalDesfechoCorp] = useState<{
    isOpen: boolean;
    tipo: "alta" | "interrupcao";
    motivo: string;
  }>({
    isOpen: false,
    tipo: "alta",
    motivo: "",
  });

  // Evolução rápida
  const [novaEvolucaoTexto, setNovaEvolucaoTexto] = useState("");
  const [novaEvolucaoTitulo, setNovaEvolucaoTitulo] = useState("Evolução de Sessão");
  const [novaEvolucaoModalidade, setNovaEvolucaoModalidade] = useState<"online" | "presencial">(
    currentPaciente.modalidade === "presencial" ? "presencial" : "online"
  );
  const [salvandoEvolucao, setSalvandoEvolucao] = useState(false);

  const formatContatoEmergenciaDisplay = (p: any): string => {
    const raw = p?.contatoEmergencia;
    if (typeof raw === "string") return raw;
    if (raw && typeof raw === "object") {
      const n = String(raw.nome || "").trim();
      const t = String(raw.telefone || "").trim();
      if (n && t) return `${n} (${t})`;
      return n || t;
    }
    if (p?.contatoEmergenciaObj && typeof p.contatoEmergenciaObj === "object") {
      const n = String(p.contatoEmergenciaObj.nome || "").trim();
      const t = String(p.contatoEmergenciaObj.telefone || "").trim();
      if (n && t) return `${n} (${t})`;
      return n || t;
    }
    return "";
  };

  const flushPendingUpdates = async (extraPatch?: Record<string, any>): Promise<boolean> => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const patchToSave = { ...pendingPatchRef.current, ...(extraPatch || {}) };
    pendingPatchRef.current = {};
    const targetId = latestPacienteRef.current?.id;
    if (!targetId || Object.keys(patchToSave).length === 0) {
      return true;
    }
    try {
      await updateDoc(doc(db, targetCollectionRef.current, targetId), {
        ...patchToSave,
        updatedAt: serverTimestamp(),
      });
      onUpdatePaciente(latestPacienteRef.current);
      return true;
    } catch (err) {
      console.error("Erro ao salvar alterações do paciente no Firestore:", err);
      showToast("Erro ao salvar alteração no banco de dados.", "error");
      return false;
    }
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      const patch = { ...pendingPatchRef.current };
      pendingPatchRef.current = {};
      const targetId = latestPacienteRef.current?.id;
      if (targetId && Object.keys(patch).length > 0) {
        updateDoc(doc(db, targetCollectionRef.current, targetId), {
          ...patch,
          updatedAt: serverTimestamp(),
        }).catch((e) => console.error("Erro ao gravar alterações pendentes ao fechar:", e));
      }
    };
  }, []);

  // Helper atômico para atualizar estado funcional e persistir com debounce ou imediatamente
  const handlePatchFields = async (patch: Record<string, any>, immediate = false) => {
    const nextState = { ...latestPacienteRef.current, ...patch };
    latestPacienteRef.current = nextState;
    setCurrentPaciente((prev: any) => ({ ...prev, ...patch }));
    onUpdatePaciente(nextState);

    pendingPatchRef.current = { ...pendingPatchRef.current, ...patch };

    if (immediate) {
      await flushPendingUpdates();
    } else {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        flushPendingUpdates();
      }, 450);
    }
  };

  const handleUpdateField = async (field: string, value: any, immediate = false) => {
    await handlePatchFields({ [field]: value }, immediate);
  };

  const handleUpdateNestedField = async (parentField: string, subField: string, value: any) => {
    const existingParent =
      latestPacienteRef.current?.[parentField] &&
      typeof latestPacienteRef.current[parentField] === "object"
        ? latestPacienteRef.current[parentField]
        : {};
    const updatedParent = { ...existingParent, [subField]: value };
    const extraTopLevel: Record<string, any> = {};

    if (parentField === "responsavel") {
      if (subField === "nome") extraTopLevel.responsavelNome = value;
      if (subField === "telefone") extraTopLevel.responsavelTelefone = value;
      if (subField === "cpf") extraTopLevel.responsavelCpf = value;
      if (subField === "email") extraTopLevel.responsavelEmail = value;
      if (subField === "parentesco") extraTopLevel.responsavelParentesco = value;
    } else if (parentField === "endereco") {
      extraTopLevel[subField] = value;
      const cepVal = updatedParent.cep || "";
      const logVal = updatedParent.logradouro || "";
      const numVal = updatedParent.numero || "";
      const compVal = updatedParent.complemento || "";
      const baiVal = updatedParent.bairro || "";
      const cidVal = updatedParent.cidade || "";
      const ufVal = updatedParent.uf || "";
      extraTopLevel.cep = cepVal;
      extraTopLevel.cidade = cidVal;
      extraTopLevel.uf = ufVal;
      extraTopLevel.cidadeEstado = cidVal ? `${cidVal}${ufVal ? ` - ${ufVal}` : ""}` : "";
      extraTopLevel.enderecoCompleto = [
        logVal ? `${logVal}${numVal ? `, ${numVal}` : ""}` : "",
        compVal,
        baiVal,
        cidVal ? `${cidVal}${ufVal ? ` - ${ufVal}` : ""}` : "",
      ]
        .filter(Boolean)
        .join(", ");
    }

    await handlePatchFields({
      [parentField]: updatedParent,
      ...extraTopLevel,
    });
  };

  // Sincronização reversa: ao atualizar sessões na planilha, reflete status/data/valor em "agendamentos" caso a sessão tenha origem na Agenda
  const syncSessoesToAgendamentos = async (novasSessoes: SessaoFaturamentoItem[]) => {
    const mapToAgendaStatus: Record<string, string> = {
      agendada: "agendada",
      realizada: "realizada",
      desmarcada_antecedencia: "remarcada",
      falta_sem_aviso: "cancelada",
    };

    await Promise.all(
      novasSessoes.map(async (s) => {
        if (!s.id || s.id.startsWith("sessao_") || s.id.startsWith("lote_")) return;
        try {
          const agRef = doc(db, "agendamentos", s.id);
          const agSnap = await getDoc(agRef);
          if (agSnap.exists()) {
            await updateDoc(agRef, {
              data: s.data,
              ...(s.horario ? { horario: s.horario } : {}),
              modalidade: s.modalidade,
              valor: Number(s.valor) || 0,
              status: mapToAgendaStatus[s.statusAtendimento] || "agendada",
              ...(s.observacoes !== undefined ? { observacoes: s.observacoes } : {}),
              updatedAt: serverTimestamp(),
            });
          }
        } catch {
          // Ignora silenciosamente sessões manuais que não pertencem à coleção agendamentos
        }
      })
    );
  };

  const handleCloseModal = async () => {
    await flushPendingUpdates();
    onClose();
  };

  // Ações de Status do Fluxo Corporativo (Sincronizadas com o Kanban Corporativo)
  const autorAcao =
    profile?.nome || profile?.name || user?.displayName || user?.email || "Profissional";

  const handleAceitarSolicitacaoCorp = async () => {
    setSaving(true);
    try {
      const novoHistorico = [
        ...(Array.isArray(currentPaciente.historico) ? currentPaciente.historico : []),
        {
          data: new Date().toISOString(),
          autor: autorAcao,
          acao: "Solicitação Aceita",
          detalhes: "Movido para Em Atendimento pela Ficha de Bordo.",
        },
      ];
      await handlePatchFields(
        {
          status: "paciente",
          dataAceite: new Date().toISOString(),
          aceitoPor: autorAcao,
          historico: novoHistorico,
        },
        true
      );
      showToast("Solicitação corporativa aceita! Paciente em atendimento.", "success");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmarDesfechoCorporativo = async () => {
    if (!modalDesfechoCorp.motivo.trim()) {
      showToast("Por favor, informe o motivo ou parecer resumido para registrar o desfecho.", "warning");
      return;
    }
    setSaving(true);
    try {
      const isAlta = modalDesfechoCorp.tipo === "alta";
      const novoHistorico = [
        ...(Array.isArray(currentPaciente.historico) ? currentPaciente.historico : []),
        {
          data: new Date().toISOString(),
          autor: autorAcao,
          acao: isAlta ? "Alta Clínica Registrada" : "Interrupção de Atendimento",
          detalhes: modalDesfechoCorp.motivo.trim(),
        },
      ];
      await handlePatchFields(
        {
          status: modalDesfechoCorp.tipo,
          dataDesfecho: new Date().toISOString(),
          motivoDesfecho: modalDesfechoCorp.motivo.trim(),
          historico: novoHistorico,
        },
        true
      );
      setModalDesfechoCorp({ isOpen: false, tipo: "alta", motivo: "" });
      showToast(
        isAlta
          ? "Alta clínica registrada com sucesso no fluxo corporativo!"
          : "Interrupção de atendimento registrada com sucesso!",
        "success"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReativarAtendimentoCorp = async () => {
    setSaving(true);
    try {
      const novoHistorico = [
        ...(Array.isArray(currentPaciente.historico) ? currentPaciente.historico : []),
        {
          data: new Date().toISOString(),
          autor: autorAcao,
          acao: "Atendimento Reativado",
          detalhes: "Retornado para Em Atendimento pela Ficha de Bordo.",
        },
      ];
      await handlePatchFields(
        {
          status: "paciente",
          historico: novoHistorico,
        },
        true
      );
      showToast("Atendimento corporativo reativado com sucesso!", "success");
    } finally {
      setSaving(false);
    }
  };

  // Salvar nova evolução rápida
  const handleAddQuickEvolucao = async () => {
    if (!canAccessProntuario) {
      showToast("Acesso restrito ao psicólogo responsável pelo atendimento (Sigilo CFP).", "warning");
      return;
    }
    if (!novaEvolucaoTexto.trim()) {
      showToast("Escreva as anotações da evolução antes de salvar.", "warning");
      return;
    }
    setSalvandoEvolucao(true);
    try {
      const hoje = new Date().toISOString().split("T")[0];
      const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const novoRegistro: ProntuarioRegistroItem = {
        id: `evol-${Date.now()}`,
        pacienteId: currentPaciente.id,
        dataRegistro: hoje,
        dataSessao: hoje,
        horario: hora,
        tipoRegistro: "evolucao",
        titulo: novaEvolucaoTitulo.trim() || "Evolução de Sessão",
        conteudo: novaEvolucaoTexto.trim(),
        humorOuEstadoGeral: "Estável / Colaborativo",
        profissionalId: profile?.uid || user?.uid || currentPaciente.profissionalId,
        profissionalNome:
          profile?.name || profile?.nome || currentPaciente.profissionalNome || "Psicólogo(a)",
        profissionalCrp: profile?.crp || currentPaciente.profissionalCrp || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const listaExistente = Array.isArray(currentPaciente.prontuarioClinico)
        ? currentPaciente.prontuarioClinico
        : [];
      const novaLista = [novoRegistro, ...listaExistente];

      await updateDoc(doc(db, targetCollection, currentPaciente.id), {
        prontuarioClinico: novaLista,
        updatedAt: serverTimestamp(),
      });

      const nextPac = { ...latestPacienteRef.current, prontuarioClinico: novaLista };
      latestPacienteRef.current = nextPac;
      setCurrentPaciente(nextPac);
      onUpdatePaciente(nextPac);
      setNovaEvolucaoTexto("");
      showToast("Evolução clínica registrada no prontuário com sucesso!", "success");
    } catch (err) {
      console.error("Erro ao salvar evolução rápida:", err);
      showToast("Erro ao registrar evolução clínica.", "error");
    } finally {
      setSalvandoEvolucao(false);
    }
  };

  // Campos Normalizados (Compatibilidade Transparente entre Carteira Externa e Corporativo)
  const nomeDisplay =
    currentPaciente.nomeCivil ||
    currentPaciente.pacienteNomeCompleto ||
    currentPaciente.nome ||
    (currentPaciente.beneficiarioTipo === "dependente" && currentPaciente.dependenteInfo
      ? currentPaciente.dependenteInfo
      : currentPaciente.colaboradorNome) ||
    currentPaciente.colaboradorNome ||
    "Paciente";

  const cpfDisplay =
    currentPaciente.cpf ||
    currentPaciente.pacienteCpf ||
    currentPaciente.dadosContrato?.pacienteCpf ||
    "";

  const dataNascimentoDisplay =
    currentPaciente.dataNascimento ||
    currentPaciente.pacienteDataNascimento ||
    currentPaciente.colaboradorDataNascimento ||
    "";

  const telDisplay =
    currentPaciente.telefone ||
    currentPaciente.pacienteTelefone ||
    currentPaciente.colaboradorWhatsapp ||
    currentPaciente.colaboradorTelefone ||
    "";

  const emailDisplay =
    currentPaciente.email ||
    currentPaciente.pacienteEmail ||
    currentPaciente.colaboradorEmail ||
    "";

  const queixaDisplay =
    currentPaciente.queixaPrincipal ??
    currentPaciente.queixa ??
    currentPaciente.motivo ??
    "";

  const disponibilidadeDisplay =
    currentPaciente.disponibilidade ??
    currentPaciente.turnoPreferencia ??
    "";

  const frequenciaDisplay =
    currentPaciente.frequenciaSessoes ||
    currentPaciente.frequenciaRecomendada ||
    "Semanal";

  // WhatsApp
  const telRaw = telDisplay.replace(/\D/g, "");
  const openWhatsApp = (msgPersonalizada?: string) => {
    if (!telRaw) {
      showToast("Este paciente não possui telefone/WhatsApp cadastrado.", "warning");
      return;
    }
    const msg =
      msgPersonalizada ||
      `Olá ${nomeDisplay}! Tudo bem? Gostaria de alinhar nosso próximo atendimento.`;
    const cleanNum = telRaw.startsWith("55") ? telRaw : `55${telRaw}`;
    window.open(`https://wa.me/${cleanNum}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // URL de Atualização Cadastral (Suporta Externo & Corporativo)
  const profUidForLink = currentPaciente.profissionalId || profile?.uid || user?.uid || "";
  const tipoLinkCadastro = isCorporativo ? "corporativo" : "externo";
  const urlAtualizacaoCadastro = `${window.location.origin}/?view=cadastro_externo&prof=${profUidForLink}&paciente=${currentPaciente.id}&tipo=${tipoLinkCadastro}`;

  // Cálculos de Sessões & Faturamento
  const sessoes: SessaoFaturamentoItem[] = Array.isArray(currentPaciente.historicoSessoes)
    ? currentPaciente.historicoSessoes
    : [];
  const sessoesRealizadas = sessoes.filter((s) => s.statusAtendimento === "realizada");
  const sessoesPagas = sessoes.filter((s) => s.statusPagamento === "pago");
  const sessoesPendentes = sessoes.filter(
    (s) => s.statusAtendimento === "realizada" && s.statusPagamento !== "pago"
  );
  const totalPago = sessoesPagas.reduce((acc, s) => acc + (Number(s.valor) || 0), 0);
  const totalPendente = sessoesPendentes.reduce((acc, s) => acc + (Number(s.valor) || 0), 0);

  // Status de Atendimento
  const statusAtual = currentPaciente.statusTratamento || currentPaciente.status || "Em Atendimento";
  const statusCorp = currentPaciente.status || "paciente";

  const canEditTabelaConvenio = !isCorporativo || effectiveRole !== "profissional";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-1 sm:px-4 bg-forest/25 backdrop-blur-sm animate-in fade-in py-1 sm:py-3">
      <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-[98vw] 2xl:max-w-[1550px] h-[96vh] sm:h-[95vh] flex flex-col shadow-2xl border border-soft overflow-hidden animate-in zoom-in-95">
        {/* =========================================================================
            HEADER DA FICHA DE BORDO UNIFICADA (EXTERNO & CORPORATIVO)
        ========================================================================== */}
        <div
          className={`px-3 sm:px-6 py-2 sm:py-3 flex flex-col border-b border-soft gap-1.5 sm:gap-2 shrink-0 ${
            isCorporativo
              ? "bg-gradient-to-r from-blue-50/60 via-white to-warm/40"
              : "bg-gradient-to-r from-emerald-50/50 via-white to-warm/40"
          }`}
        >
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div
                className={`p-1.5 sm:p-2.5 rounded-xl shadow-xs shrink-0 flex items-center justify-center text-white ${
                  isCorporativo ? "bg-forest" : "bg-forest"
                }`}
              >
                {isCorporativo ? (
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-sun" />
                ) : (
                  <User className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
                  <h3
                    className="font-serif text-sm sm:text-2xl text-forest font-bold truncate leading-tight"
                    title={nomeDisplay}
                  >
                    {nomeDisplay}
                  </h3>

                  {/* Identificação de Origem (Respeitando Sigilo Corporativo para o Psicólogo) */}
                  {isCorporativo ? (
                    <span className="text-[9px] sm:text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 border border-blue-200 shrink-0 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-blue-700" />
                      Convênio Corporativo
                    </span>
                  ) : (
                    <span className="text-[9px] sm:text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                      Carteira Particular
                    </span>
                  )}

                  {/* Status do Tratamento */}
                  {isCorporativo ? (
                    <span
                      className={`text-[9px] sm:text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border shrink-0 ${
                        statusCorp === "paciente"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : statusCorp === "solicitacao_servico"
                            ? "bg-amber-50 text-amber-900 border-amber-300"
                            : statusCorp === "alta"
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : "bg-rose-50 text-rose-800 border-rose-200"
                      }`}
                    >
                      {statusCorp === "paciente"
                        ? "Em Atendimento"
                        : statusCorp === "solicitacao_servico"
                          ? "Solicitação Pendente"
                          : statusCorp === "alta"
                            ? "Alta Clínica"
                            : "Atendimento Interrompido"}
                    </span>
                  ) : (
                    <select
                      value={statusAtual}
                      onChange={(e) => {
                        handlePatchFields(
                          { statusTratamento: e.target.value, status: e.target.value },
                          true
                        );
                      }}
                      className={`text-[9px] sm:text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border shrink-0 cursor-pointer focus:outline-none transition-colors ${
                        statusAtual === "Em Atendimento" || statusAtual === "Ativo"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : statusAtual === "Em Pausa" || statusAtual === "Standby"
                            ? "bg-amber-100 text-amber-900 border-amber-300"
                            : statusAtual === "Concluído" || statusAtual === "Alta"
                              ? "bg-blue-100 text-blue-800 border-blue-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      <option value="Em Atendimento">Em Atendimento</option>
                      <option value="Em Pausa">Em Pausa</option>
                      <option value="Concluído">Concluído (Alta)</option>
                      <option value="Inativo">Inativo / Desligado</option>
                    </select>
                  )}
                </div>

                {/* Linha 2: Metadados Limpos com Separadores Tipográficos */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-medium text-forest/70 mt-0.5 tabular-nums">
                  <span className="font-mono text-forest/60 shrink-0">
                    #{currentPaciente.id?.slice(0, 6)}
                  </span>

                  {cpfDisplay ? (
                    <>
                      <span aria-hidden="true" className="text-forest/30">·</span>
                      <span className="font-mono text-forest/70">CPF: {cpfDisplay}</span>
                    </>
                  ) : (
                    <>
                      <span aria-hidden="true" className="text-forest/30">·</span>
                      <span className="text-amber-700 font-semibold">CPF pendente</span>
                    </>
                  )}

                  {isCorporativo ? (
                    <>
                      {effectiveRole !== "profissional" && currentPaciente.empresaNome && (
                        <>
                          <span aria-hidden="true" className="text-forest/30">·</span>
                          <span className="font-semibold text-forest/80">
                            {currentPaciente.empresaNome}
                          </span>
                        </>
                      )}
                      {currentPaciente.servicoNome && (
                        <>
                          <span aria-hidden="true" className="text-forest/30">·</span>
                          <span className="text-forest/75 truncate max-w-[220px]">
                            {currentPaciente.servicoNome}
                          </span>
                        </>
                      )}
                      {currentPaciente.beneficiarioTipo === "dependente" && (
                        <>
                          <span aria-hidden="true" className="text-forest/30">·</span>
                          <span className="text-forest/75">
                            Dependente ({currentPaciente.dependenteParentesco || "Familiar"})
                          </span>
                        </>
                      )}
                    </>
                  ) : (
                    currentPaciente.origem && (
                      <>
                        <span aria-hidden="true" className="text-forest/30">·</span>
                        <span className="text-forest/75 truncate">
                          Origem:{" "}
                          {currentPaciente.origem === "formulario_externo"
                            ? "Link do Formulário"
                            : currentPaciente.origem === "importacao_excel"
                              ? "Planilha Excel"
                              : currentPaciente.origem}
                        </span>
                      </>
                    )
                  )}

                  {currentPaciente.valorSessao && (
                    <>
                      <span aria-hidden="true" className="text-forest/30">·</span>
                      <span className="font-bold text-emerald-800">
                        R$ {currentPaciente.valorSessao}/sessão
                      </span>
                    </>
                  )}

                  {currentPaciente.modalidade && (
                    <>
                      <span aria-hidden="true" className="text-forest/30">·</span>
                      <span className="capitalize text-forest/70">
                        {currentPaciente.modalidade}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Ações Rápidas do Topo */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {telRaw && (
                <button
                  type="button"
                  onClick={() => openWhatsApp()}
                  className="flex items-center justify-center gap-1 font-bold text-[10px] sm:text-xs p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20b858] text-white shadow-2xs transition-all shrink-0 cursor-pointer whitespace-nowrap"
                  title="Enviar WhatsApp para o paciente"
                >
                  <Phone className="w-3.5 h-3.5 text-white shrink-0" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </button>
              )}

              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  if (isEditing) {
                    setSaving(true);
                    const ok = await flushPendingUpdates();
                    setSaving(false);
                    if (ok) {
                      showToast("Dados salvos com sucesso!", "success");
                      setIsEditing(false);
                    }
                  } else {
                    setIsEditing(true);
                  }
                }}
                className={`flex items-center justify-center gap-1 font-bold text-[10px] sm:text-xs p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border transition-all shadow-2xs shrink-0 cursor-pointer disabled:opacity-60 whitespace-nowrap ${
                  isEditing
                    ? "bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700"
                    : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                }`}
                title={isEditing ? "Concluir e salvar edição" : "Editar campos da ficha"}
              >
                {isEditing ? <Save className="w-3.5 h-3.5 shrink-0" /> : <Edit3 className="w-3.5 h-3.5 shrink-0" />}
                <span className="hidden sm:inline">
                  {saving ? "Salvando..." : isEditing ? "Salvar" : "Editar"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1 sm:p-1.5 text-forest/50 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors shrink-0 cursor-pointer"
                title="Fechar Ficha"
              >
                <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            ACTION BAR (Sub-Header de Ações Rápidas)
        ========================================================================== */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 px-2.5 sm:px-6 py-1.5 sm:py-2 bg-white border-b border-soft shrink-0 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Prontuário Clínico & Evoluções (Protegido por Sigilo CFP) */}
            {canAccessProntuario ? (
              <button
                type="button"
                onClick={() => setShowProntuarioModal(true)}
                className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-bold text-forest bg-warm/60 hover:bg-emerald-50 hover:text-emerald-900 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-soft hover:border-emerald-300 transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
                title="Abrir Prontuário Clínico Completo"
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>Prontuário Clínico</span>
                {Array.isArray(currentPaciente.prontuarioClinico) &&
                  currentPaciente.prontuarioClinico.length > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-emerald-100 text-emerald-800 tabular-nums">
                      {currentPaciente.prontuarioClinico.length}
                    </span>
                  )}
              </button>
            ) : (
              <span
                className="flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold text-forest/60 bg-warm/40 px-2.5 py-1.5 rounded-lg sm:rounded-xl border border-soft whitespace-nowrap"
                title="Sigilo Profissional CFP: O prontuário clínico é exclusivo do psicólogo responsável pelo atendimento."
              >
                <Lock className="w-3.5 h-3.5 text-forest/50 shrink-0" />
                <span>Prontuário (Sigilo CFP)</span>
              </span>
            )}

            {/* Sessões & Faturamento */}
            <button
              type="button"
              onClick={() => setShowFaturamentoModal(true)}
              className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-bold text-forest bg-warm/60 hover:bg-emerald-50 hover:text-emerald-900 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-soft hover:border-emerald-300 transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
              title="Abrir Sessões, Faturamento e Recibos"
            >
              <CreditCard className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>Sessões & Faturamento</span>
              {sessoesPendentes.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-amber-100 text-amber-900 tabular-nums">
                  {sessoesPendentes.length} pend.
                </span>
              )}
            </button>

            {/* Contrato Terapêutico */}
            <button
              type="button"
              onClick={() => setShowContratoModal(true)}
              className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-bold text-forest bg-warm/60 hover:bg-emerald-50 hover:text-emerald-900 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-soft hover:border-emerald-300 transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
              title="Gerenciar Contrato Terapêutico"
            >
              <FileSignature className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>
                {currentPaciente.contratoAssinado
                  ? "Contrato Assinado"
                  : currentPaciente.contratoText
                    ? "Contrato Pendente"
                    : "Contrato"}
              </span>
            </button>

            {/* Link de Atualização Cadastral para o Paciente */}
            <div className="flex items-center gap-0.5 bg-emerald-50/70 p-0.5 rounded-lg sm:rounded-xl border border-emerald-300/80 shadow-2xs shrink-0">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(urlAtualizacaoCadastro);
                  showToast("Link de atualização cadastral copiado para a área de transferência!", "success");
                }}
                className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-bold text-emerald-900 hover:bg-emerald-100/80 px-2 sm:px-2.5 py-1 rounded-md sm:rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                title="Copiar link para o paciente conferir e atualizar seu cadastro"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>Atualização de Cadastro</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const msg = `Olá ${nomeDisplay}! Tudo bem? Para mantermos seus dados cadastrais e fiscais sempre atualizados para emissão de recibos e contrato terapêutico, por favor acesse este link seguro para conferir e atualizar seu cadastro quando puder:\n\n${urlAtualizacaoCadastro}\n\nQualquer dúvida estou à disposição!`;
                  openWhatsApp(msg);
                }}
                className="p-1 sm:p-1.5 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100/80 rounded-md sm:rounded-lg transition-colors cursor-pointer"
                title="Enviar link de atualização cadastral via WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              </button>
              <button
                type="button"
                onClick={() => {
                  window.open(urlAtualizacaoCadastro, "_blank");
                }}
                className="p-1 sm:p-1.5 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100/80 rounded-md sm:rounded-lg transition-colors cursor-pointer"
                title="Abrir formulário de atualização em nova aba"
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
              </button>
            </div>

            {onNavigateToAgenda && (
              <button
                type="button"
                onClick={async () => {
                  await flushPendingUpdates();
                  onClose();
                  onNavigateToAgenda(currentPaciente.id);
                }}
                className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-bold text-white bg-forest hover:bg-forest/90 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl shadow-2xs transition-all whitespace-nowrap cursor-pointer"
                title="Agendar na Agenda Clínica"
              >
                <Calendar className="w-3.5 h-3.5 text-sun shrink-0" />
                <span>Agendar Sessão</span>
              </button>
            )}
          </div>

          {/* Lado Direito: Ações de Status Sincronizadas (Carteira Externa vs Kanban Corporativo) */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {isCorporativo ? (
              <>
                {statusCorp === "solicitacao_servico" && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleAceitarSolicitacaoCorp}
                    className="flex items-center gap-1 font-bold text-[10px] sm:text-xs px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs cursor-pointer whitespace-nowrap disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>Aceitar Solicitação</span>
                  </button>
                )}

                {statusCorp === "paciente" && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setModalDesfechoCorp({ isOpen: true, tipo: "alta", motivo: "" })
                      }
                      className="flex items-center gap-1 font-bold text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Alta Clínica</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setModalDesfechoCorp({ isOpen: true, tipo: "interrupcao", motivo: "" })
                      }
                      className="flex items-center gap-1 font-bold text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>Interromper</span>
                    </button>
                  </>
                )}

                {(statusCorp === "alta" || statusCorp === "interrupcao") && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleReativarAtendimentoCorp}
                    className="flex items-center gap-1 font-bold text-[10px] sm:text-xs px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-forest hover:bg-forest/90 text-white transition-colors shadow-2xs cursor-pointer whitespace-nowrap disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                    <span>Reativar Atendimento</span>
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const novo = statusAtual === "Inativo" ? "Em Atendimento" : "Inativo";
                  handlePatchFields({ statusTratamento: novo, status: novo }, true);
                  showToast(`Status alterado para: ${novo}`, "info");
                }}
                className="flex items-center gap-1 font-bold text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-soft bg-warm/50 text-forest/70 hover:text-forest transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
              >
                <UserX className="w-3.5 h-3.5 text-forest/50 shrink-0" />
                <span>{statusAtual === "Inativo" ? "Reativar Paciente" : "Arquivar"}</span>
              </button>
            )}
          </div>
        </div>

        {/* =========================================================================
            BARRA DE SEÇÕES ANCORADAS (Navegação Rápida)
        ========================================================================== */}
        <div className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-6 py-1.5 bg-warm/35 border-b border-soft shrink-0 overflow-x-auto scrollbar-none shadow-2xs">
          <span className="text-[9px] font-bold uppercase text-forest/50 shrink-0 flex items-center gap-1 pr-1">
            <Compass className="w-3 h-3 text-forest/60" /> Seções:
          </span>
          <button
            type="button"
            onClick={() => document.getElementById("sec-ext-1-pessoais")?.scrollIntoView({ behavior: "smooth" })}
            className="px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-forest/80 hover:text-forest bg-white hover:bg-warm border border-soft rounded-md sm:rounded-lg shrink-0 transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
          >
            1. Pessoais
          </button>
          <button
            type="button"
            onClick={() => document.getElementById("sec-ext-2-responsavel")?.scrollIntoView({ behavior: "smooth" })}
            className="px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-forest/80 hover:text-forest bg-white hover:bg-warm border border-soft rounded-md sm:rounded-lg shrink-0 transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
          >
            {isCorporativo ? "2. Vínculo & Responsável" : "2. Responsável"}
          </button>
          <button
            type="button"
            onClick={() => document.getElementById("sec-ext-3-contato")?.scrollIntoView({ behavior: "smooth" })}
            className="px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-forest/80 hover:text-forest bg-white hover:bg-warm border border-soft rounded-md sm:rounded-lg shrink-0 transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
          >
            3. Contato & Endereço
          </button>
          <button
            type="button"
            onClick={() => document.getElementById("sec-ext-4-clinico")?.scrollIntoView({ behavior: "smooth" })}
            className="px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-forest/80 hover:text-forest bg-white hover:bg-warm border border-soft rounded-md sm:rounded-lg shrink-0 transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
          >
            4. Queixa & Clínico
          </button>
          <button
            type="button"
            onClick={() => document.getElementById("sec-ext-5-acordo")?.scrollIntoView({ behavior: "smooth" })}
            className="px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-md sm:rounded-lg shrink-0 transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
          >
            5. Honorários & Acordo
          </button>
          <button
            type="button"
            onClick={() => document.getElementById("sec-ext-6-faturamento")?.scrollIntoView({ behavior: "smooth" })}
            className="px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-forest/80 hover:text-forest bg-white hover:bg-warm border border-soft rounded-md sm:rounded-lg shrink-0 transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
          >
            6. Sessões & Finanças
          </button>
          <button
            type="button"
            onClick={() => document.getElementById("sec-ext-7-prontuario")?.scrollIntoView({ behavior: "smooth" })}
            className="px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-forest/80 hover:text-forest bg-white hover:bg-warm border border-soft rounded-md sm:rounded-lg shrink-0 transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
          >
            7. Prontuário & Evoluções
          </button>
          <button
            type="button"
            onClick={() => document.getElementById("sec-ext-8-alertas")?.scrollIntoView({ behavior: "smooth" })}
            className="px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-forest/80 hover:text-forest bg-white hover:bg-warm border border-soft rounded-md sm:rounded-lg shrink-0 transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
          >
            8. Alertas & WhatsApp
          </button>
          {isCorporativo && (
            <button
              type="button"
              onClick={() => document.getElementById("sec-ext-9-historico-corp")?.scrollIntoView({ behavior: "smooth" })}
              className="px-2 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-forest/80 hover:text-forest bg-white hover:bg-warm border border-soft rounded-md sm:rounded-lg shrink-0 transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
            >
              9. Histórico Corporativo
            </button>
          )}
        </div>

        {/* =========================================================================
            CORPO SCROLLÁVEL DA FICHA
        ========================================================================== */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 bg-warm/10 custom-scrollbar">
          {/* ALERTA DE CPF PENDENTE (Útil para emissão de Recibo/NF contra o paciente) */}
          {!cpfDisplay && (
            <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-950">
                  <span className="font-bold block">CPF e Dados Fiscais Pendentes para Emissão de Recibo / NF</span>
                  <span className="text-amber-900/80">
                    {isCorporativo
                      ? "Como o pagamento das sessões com desconto conveniado é realizado diretamente pelo paciente ao profissional, preencha o CPF ou envie o link de atualização cadastral."
                      : "Preencha o CPF abaixo ou envie o link de atualização cadastral ao paciente para habilitar recibos completos."}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap"
                >
                  Preencher Agora
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(urlAtualizacaoCadastro);
                    showToast("Link de atualização cadastral copiado!", "success");
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap"
                >
                  Copiar Link
                </button>
              </div>
            </div>
          )}

          {/* 1. DADOS PESSOAIS */}
          <div id="sec-ext-1-pessoais" className="bg-white p-4 sm:p-6 rounded-2xl border border-soft shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-soft pb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-2">
                <User className="w-4 h-4 text-forest" /> 1. Dados Pessoais
              </h4>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-warm text-forest/70 border border-soft">
                Identificação
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  Nome Completo
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={nomeDisplay === "Paciente" ? "" : nomeDisplay}
                    onChange={(e) => {
                      const val = e.target.value;
                      const extraCorp: Record<string, any> = isCorporativo
                        ? {
                            pacienteNomeCompleto: val,
                            ...(currentPaciente.beneficiarioTipo === "dependente"
                              ? { dependenteInfo: val }
                              : { colaboradorNome: val }),
                          }
                        : {};
                      handlePatchFields({ nomeCivil: val, nome: val, ...extraCorp });
                    }}
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest">
                    {nomeDisplay || "-"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  Nome Social / Como Prefere Ser Chamado
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={currentPaciente.nomeSocial ?? ""}
                    onChange={(e) =>
                      handlePatchFields({
                        nomeSocial: e.target.value,
                        nomeDesejado:
                          e.target.value.trim() ||
                          latestPacienteRef.current?.nomeCivil ||
                          latestPacienteRef.current?.pacienteNomeCompleto ||
                          latestPacienteRef.current?.nome ||
                          "",
                      })
                    }
                    placeholder="Opcional"
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest">
                    {currentPaciente.nomeSocial || currentPaciente.nomeDesejado || "-"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  CPF
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={cpfDisplay}
                    onChange={(e) => {
                      const val = e.target.value;
                      handlePatchFields({
                        cpf: val,
                        ...(isCorporativo ? { pacienteCpf: val } : {}),
                      });
                    }}
                    placeholder="000.000.000-00"
                    className="text-xs sm:text-sm font-semibold text-forest font-mono border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest font-mono tabular-nums">
                    {cpfDisplay || "-"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  Data de Nascimento
                </span>
                {isEditing ? (
                  <input
                    type="date"
                    value={dataNascimentoDisplay}
                    onChange={(e) => {
                      const val = e.target.value;
                      handlePatchFields({
                        dataNascimento: val,
                        ...(isCorporativo ? { pacienteDataNascimento: val } : {}),
                      });
                    }}
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest tabular-nums">
                    {dataNascimentoDisplay
                      ? dataNascimentoDisplay.includes("-")
                        ? dataNascimentoDisplay.split("-").reverse().join("/")
                        : new Date(dataNascimentoDisplay).toLocaleDateString("pt-BR")
                      : "-"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  Gênero / Identidade
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={currentPaciente.genero || ""}
                    onChange={(e) => handleUpdateField("genero", e.target.value)}
                    placeholder="Ex: Feminino, Masculino, Não-binário..."
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest">
                    {currentPaciente.genero || "-"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  Profissão / Ocupação
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={currentPaciente.profissao || ""}
                    onChange={(e) => handleUpdateField("profissao", e.target.value)}
                    placeholder="Ex: Arquiteta, Estudante..."
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest">
                    {currentPaciente.profissao ||
                      (!isCorporativo || effectiveRole !== "profissional"
                        ? currentPaciente.cargoNome || "-"
                        : "-")}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  Estado Civil
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={currentPaciente.estadoCivil || ""}
                    onChange={(e) => handleUpdateField("estadoCivil", e.target.value)}
                    placeholder="Ex: Solteiro(a), Casado(a)..."
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest">
                    {currentPaciente.estadoCivil || "-"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  Via de Acesso / Origem
                </span>
                {isCorporativo ? (
                  <span className="text-xs sm:text-sm font-semibold text-blue-900">
                    {effectiveRole === "profissional"
                      ? "Convênio Corporativo"
                      : `Convênio Corporativo (${currentPaciente.empresaNome || "Empresa"})`}
                  </span>
                ) : isEditing ? (
                  <input
                    type="text"
                    value={currentPaciente.fonteIndicacao || currentPaciente.origem || ""}
                    onChange={(e) => handleUpdateField("fonteIndicacao", e.target.value)}
                    placeholder="Ex: Instagram, Indicação de Amigo..."
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest">
                    {currentPaciente.fonteIndicacao || currentPaciente.origem || "-"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 2. VÍNCULO DO BENEFICIÁRIO (CORPORATIVO) & RESPONSÁVEL LEGAL */}
          <div id="sec-ext-2-responsavel" className="bg-white p-4 sm:p-6 rounded-2xl border border-soft shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-soft pb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-forest" />{" "}
                {isCorporativo
                  ? "2. Vínculo do Beneficiário (Titular / Dependente) & Responsável Legal"
                  : "2. Responsável Legal (Para menores ou dependentes)"}
              </h4>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-warm text-forest/70 border border-soft">
                {isCorporativo ? "Vínculo & Guarda" : "Guarda & Contato"}
              </span>
            </div>

            {/* Bloco de Vínculo Titular/Dependente quando Corporativo */}
            {isCorporativo && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b border-soft/60">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                    Tipo de Beneficiário
                  </span>
                  {isEditing && effectiveRole !== "profissional" ? (
                    <select
                      value={currentPaciente.beneficiarioTipo || "titular"}
                      onChange={(e) => handleUpdateField("beneficiarioTipo", e.target.value)}
                      className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                    >
                      <option value="titular">Titular</option>
                      <option value="dependente">Dependente</option>
                    </select>
                  ) : (
                    <span className="text-xs sm:text-sm font-semibold text-forest">
                      {currentPaciente.beneficiarioTipo === "dependente"
                        ? "Dependente de Colaborador"
                        : "Colaborador Titular"}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1 min-w-0">
                  <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                    Nome do Titular do Benefício
                  </span>
                  {isEditing && effectiveRole !== "profissional" ? (
                    <input
                      type="text"
                      value={currentPaciente.colaboradorNome || ""}
                      onChange={(e) => handleUpdateField("colaboradorNome", e.target.value)}
                      className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                    />
                  ) : (
                    <span className="text-xs sm:text-sm font-semibold text-forest">
                      {currentPaciente.colaboradorNome || "-"}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1 min-w-0">
                  <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                    Parentesco / Dependente
                  </span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={currentPaciente.dependenteParentesco || ""}
                      onChange={(e) => handleUpdateField("dependenteParentesco", e.target.value)}
                      placeholder={
                        currentPaciente.beneficiarioTipo === "dependente"
                          ? "Ex: Filho(a), Cônjuge..."
                          : "Titular"
                      }
                      className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                    />
                  ) : (
                    <span className="text-xs sm:text-sm font-semibold text-forest">
                      {currentPaciente.beneficiarioTipo === "dependente"
                        ? `${currentPaciente.dependenteParentesco || "Familiar"}${
                            currentPaciente.dependenteInfo ? ` (${currentPaciente.dependenteInfo})` : ""
                          }`
                        : "Próprio Titular"}
                    </span>
                  )}
                </div>

                {/* Sigilo Corporativo: Empresa e Cargo visíveis apenas para Master/Triagem */}
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                    {effectiveRole === "profissional"
                      ? "Modalidade do Convênio"
                      : "Empresa & Cargo (Restrito Triagem)"}
                  </span>
                  {effectiveRole === "profissional" ? (
                    <span className="text-xs sm:text-sm font-semibold text-forest/80">
                      Convênio Corporativo Ativo (Sigilo Empresarial)
                    </span>
                  ) : (
                    <span className="text-xs sm:text-sm font-semibold text-forest">
                      {currentPaciente.empresaNome || "—"}
                      {currentPaciente.cargoNome ? ` · ${currentPaciente.cargoNome}` : ""}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  Nome do Responsável Legal
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={currentPaciente.responsavel?.nome ?? currentPaciente.responsavelNome ?? ""}
                    onChange={(e) => handleUpdateNestedField("responsavel", "nome", e.target.value)}
                    placeholder="Nome completo do responsável"
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest">
                    {currentPaciente.responsavel?.nome || currentPaciente.responsavelNome || "-"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  Parentesco
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={currentPaciente.responsavel?.parentesco ?? currentPaciente.responsavelParentesco ?? ""}
                    onChange={(e) => handleUpdateNestedField("responsavel", "parentesco", e.target.value)}
                    placeholder="Ex: Mãe, Pai..."
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest">
                    {currentPaciente.responsavel?.parentesco || currentPaciente.responsavelParentesco || "-"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  Telefone do Responsável
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={currentPaciente.responsavel?.telefone ?? currentPaciente.responsavelTelefone ?? ""}
                    onChange={(e) => handleUpdateNestedField("responsavel", "telefone", e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest tabular-nums">
                    {currentPaciente.responsavel?.telefone || currentPaciente.responsavelTelefone || "-"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  CPF do Responsável
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={currentPaciente.responsavel?.cpf ?? currentPaciente.responsavelCpf ?? ""}
                    onChange={(e) => handleUpdateNestedField("responsavel", "cpf", e.target.value)}
                    placeholder="000.000.000-00"
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest font-mono tabular-nums">
                    {currentPaciente.responsavel?.cpf || currentPaciente.responsavelCpf || "-"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  E-mail do Responsável
                </span>
                {isEditing ? (
                  <input
                    type="email"
                    value={currentPaciente.responsavel?.email ?? currentPaciente.responsavelEmail ?? ""}
                    onChange={(e) => handleUpdateNestedField("responsavel", "email", e.target.value)}
                    placeholder="email@exemplo.com"
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest truncate">
                    {currentPaciente.responsavel?.email || currentPaciente.responsavelEmail || "-"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 3. CONTATO & ENDEREÇO */}
          <div id="sec-ext-3-contato" className="bg-white p-4 sm:p-6 rounded-2xl border border-soft shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-soft pb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-forest" /> 3. Contatos & Endereço
              </h4>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-warm text-forest/70 border border-soft">
                Localização & Comunicação
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  WhatsApp / Celular
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={telDisplay}
                    onChange={(e) => {
                      const val = e.target.value;
                      handlePatchFields({
                        telefone: val,
                        ...(isCorporativo
                          ? { pacienteTelefone: val, colaboradorWhatsapp: val }
                          : {}),
                      });
                    }}
                    placeholder="(00) 00000-0000"
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-semibold text-forest tabular-nums">
                      {telDisplay || "-"}
                    </span>
                    {telRaw && (
                      <button
                        type="button"
                        onClick={() => openWhatsApp()}
                        className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-bold border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1 cursor-pointer"
                      >
                        <MessageCircle className="w-3 h-3 text-emerald-600" />
                        Chamar
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  E-mail
                </span>
                {isEditing ? (
                  <input
                    type="email"
                    value={emailDisplay}
                    onChange={(e) => {
                      const val = e.target.value;
                      handlePatchFields({
                        email: val,
                        ...(isCorporativo
                          ? { pacienteEmail: val, colaboradorEmail: val }
                          : {}),
                      });
                    }}
                    placeholder="paciente@exemplo.com"
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest truncate">
                    {emailDisplay || "-"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  Contato de Emergência
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={formatContatoEmergenciaDisplay(currentPaciente)}
                    onChange={(e) => {
                      const rawVal = e.target.value;
                      const match = rawVal.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
                      const parsedObj = match
                        ? { nome: match[1].trim(), telefone: match[2].trim() }
                        : { nome: rawVal.trim(), telefone: "" };
                      handlePatchFields({
                        contatoEmergencia: rawVal,
                        contatoEmergenciaObj: parsedObj,
                      });
                    }}
                    placeholder="Nome (00) 00000-0000"
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest">
                    {formatContatoEmergenciaDisplay(currentPaciente) || "-"}
                  </span>
                )}
              </div>
            </div>

            {/* Endereço Residencial */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 pt-2 border-t border-soft/60">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  CEP
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={currentPaciente.endereco?.cep ?? currentPaciente.cep ?? ""}
                    onChange={(e) => handleUpdateNestedField("endereco", "cep", e.target.value)}
                    placeholder="00000-000"
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest font-mono tabular-nums">
                    {currentPaciente.endereco?.cep || currentPaciente.cep || "-"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0 sm:col-span-2">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  Logradouro
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={
                      currentPaciente.endereco?.logradouro ??
                      currentPaciente.logradouro ??
                      currentPaciente.enderecoCompleto ??
                      ""
                    }
                    onChange={(e) => handleUpdateNestedField("endereco", "logradouro", e.target.value)}
                    placeholder="Rua / Avenida"
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest">
                    {currentPaciente.enderecoCompleto ||
                      currentPaciente.endereco?.logradouro ||
                      currentPaciente.logradouro ||
                      "-"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  Nº / Compl.
                </span>
                {isEditing ? (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={currentPaciente.endereco?.numero ?? currentPaciente.numero ?? ""}
                      onChange={(e) => handleUpdateNestedField("endereco", "numero", e.target.value)}
                      placeholder="Nº"
                      className="text-xs font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2 py-1.5 w-16 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={currentPaciente.endereco?.complemento ?? currentPaciente.complemento ?? ""}
                      onChange={(e) => handleUpdateNestedField("endereco", "complemento", e.target.value)}
                      placeholder="Compl."
                      className="text-xs font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2 py-1.5 flex-1 min-w-0 focus:outline-none"
                    />
                  </div>
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest">
                    {[
                      currentPaciente.endereco?.numero || currentPaciente.numero,
                      currentPaciente.endereco?.complemento || currentPaciente.complemento,
                    ]
                      .filter(Boolean)
                      .join(" - ") || "-"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  Bairro
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={currentPaciente.endereco?.bairro ?? currentPaciente.bairro ?? ""}
                    onChange={(e) => handleUpdateNestedField("endereco", "bairro", e.target.value)}
                    placeholder="Bairro"
                    className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest">
                    {currentPaciente.endereco?.bairro || currentPaciente.bairro || "-"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  Cidade / UF
                </span>
                {isEditing ? (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={currentPaciente.endereco?.cidade ?? currentPaciente.cidade ?? ""}
                      onChange={(e) => handleUpdateNestedField("endereco", "cidade", e.target.value)}
                      placeholder="Cidade"
                      className="text-xs font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2 py-1.5 flex-1 min-w-0 focus:outline-none"
                    />
                    <input
                      type="text"
                      maxLength={2}
                      value={currentPaciente.endereco?.uf ?? currentPaciente.uf ?? ""}
                      onChange={(e) =>
                        handleUpdateNestedField("endereco", "uf", e.target.value.toUpperCase())
                      }
                      placeholder="UF"
                      className="text-xs font-semibold text-forest uppercase border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2 py-1.5 w-12 focus:outline-none"
                    />
                  </div>
                ) : (
                  <span className="text-xs sm:text-sm font-semibold text-forest">
                    {currentPaciente.cidadeEstado ||
                      (currentPaciente.endereco?.cidade || currentPaciente.cidade
                        ? `${currentPaciente.endereco?.cidade || currentPaciente.cidade}${
                            currentPaciente.endereco?.uf || currentPaciente.uf
                              ? ` - ${currentPaciente.endereco?.uf || currentPaciente.uf}`
                              : ""
                          }`
                        : "-")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 4. QUEIXA PRINCIPAL & HISTÓRICO CLÍNICO */}
          <div id="sec-ext-4-clinico" className="bg-white p-4 sm:p-6 rounded-2xl border border-soft shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-soft pb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-600" /> 4. Queixa Principal & Informações Clínicas Iniciais
              </h4>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200">
                Anamnese Inicial
              </span>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider mb-1">
                  Queixa Principal / Motivo da Consulta
                </span>
                {isEditing ? (
                  <textarea
                    rows={3}
                    value={queixaDisplay}
                    onChange={(e) => {
                      const val = e.target.value;
                      handlePatchFields({
                        queixaPrincipal: val,
                        motivo: val,
                        ...(isCorporativo ? { queixa: val } : {}),
                      });
                    }}
                    placeholder="Descreva a queixa que motivou a busca pelo acompanhamento psicológico..."
                    className="w-full text-xs sm:text-sm text-forest border border-emerald-500/80 bg-emerald-50/30 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                ) : (
                  <div className="p-3.5 bg-warm/30 rounded-xl border border-soft text-xs sm:text-sm text-forest/90 leading-relaxed font-serif whitespace-pre-line">
                    {queixaDisplay || "Nenhuma queixa inicial registrada ainda."}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                    Já fez terapia antes?
                  </span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={currentPaciente.terapiaAnterior || ""}
                      onChange={(e) => handleUpdateField("terapiaAnterior", e.target.value)}
                      placeholder="Sim / Não (detalhes)"
                      className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                    />
                  ) : (
                    <span className="text-xs sm:text-sm font-semibold text-forest">
                      {currentPaciente.terapiaAnterior || "-"}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1 min-w-0">
                  <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                    Uso de Medicação Psiquiátrica?
                  </span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={currentPaciente.medicacao || ""}
                      onChange={(e) => handleUpdateField("medicacao", e.target.value)}
                      placeholder="Ex: Escitalopram 10mg..."
                      className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                    />
                  ) : (
                    <span className="text-xs sm:text-sm font-semibold text-forest">
                      {currentPaciente.medicacao || "Nenhuma medicação informada"}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1 min-w-0">
                  <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                    Disponibilidade / Turno de Preferência
                  </span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={disponibilidadeDisplay}
                      onChange={(e) => {
                        const val = e.target.value;
                        handlePatchFields({
                          disponibilidade: val,
                          ...(isCorporativo ? { turnoPreferencia: val } : {}),
                        });
                      }}
                      placeholder="Ex: Terças à tarde, online"
                      className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                    />
                  ) : (
                    <span className="text-xs sm:text-sm font-semibold text-forest">
                      {disponibilidadeDisplay || "-"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 5. HONORÁRIOS & CONDIÇÕES DO ATENDIMENTO */}
          <div id="sec-ext-5-acordo" className="bg-white p-4 sm:p-6 rounded-2xl border border-emerald-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-3 flex-wrap gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-700" />{" "}
                {isCorporativo
                  ? "5. Condições do Convênio Corporativo & Honorários"
                  : "5. Acordo Particular & Honorários Profissionais"}
              </h4>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300">
                {isCorporativo
                  ? "Tabela Conveniada • Pagamento Direto ao Psicólogo"
                  : "100% Honorários do Psicólogo"}
              </span>
            </div>

            <div
              className={`grid grid-cols-1 sm:grid-cols-2 ${
                isCorporativo ? "md:grid-cols-5" : "md:grid-cols-4"
              } gap-4`}
            >
              {isCorporativo && (
                <div className="flex flex-col gap-1 min-w-0 p-3 bg-blue-50/40 rounded-xl border border-blue-200/60">
                  <span className="block text-[10px] font-bold uppercase text-blue-900/80 tracking-wider flex items-center justify-between">
                    <span>Serviço Conveniado</span>
                    {!canEditTabelaConvenio && <Lock className="w-3 h-3 text-blue-700/60" />}
                  </span>
                  {isEditing && canEditTabelaConvenio ? (
                    <input
                      type="text"
                      value={currentPaciente.servicoNome || ""}
                      onChange={(e) => handleUpdateField("servicoNome", e.target.value)}
                      className="text-xs font-semibold text-forest border border-emerald-500 bg-white rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-forest truncate" title={currentPaciente.servicoNome}>
                      {currentPaciente.servicoNome || "Psicoterapia Individual"}
                    </span>
                  )}
                  <span className="text-[10px] text-blue-800/75">Benefício ativo na tabela</span>
                </div>
              )}

              <div className="flex flex-col gap-1 min-w-0 bg-emerald-50/40 p-3 rounded-xl border border-emerald-200/60">
                <span className="block text-[10px] font-bold uppercase text-emerald-900/80 tracking-wider flex items-center justify-between">
                  <span>Valor por Sessão (R$)</span>
                  {!canEditTabelaConvenio && <Lock className="w-3 h-3 text-emerald-700/60" />}
                </span>
                {isEditing && canEditTabelaConvenio ? (
                  <input
                    type="text"
                    value={currentPaciente.valorSessao || ""}
                    onChange={(e) => handleUpdateField("valorSessao", e.target.value)}
                    placeholder="150,00"
                    className="text-base font-bold text-emerald-900 border border-emerald-500 bg-white rounded-lg px-2.5 py-1 w-full focus:outline-none tabular-nums"
                  />
                ) : (
                  <span className="text-lg font-bold text-emerald-900 tabular-nums">
                    R$ {currentPaciente.valorSessao || "A combinar"}
                  </span>
                )}
                <span className="text-[10px] text-emerald-700/80">
                  {isCorporativo
                    ? "Valor fixado pelo convênio (pago pelo paciente)"
                    : "Sem desconto da plataforma"}
                </span>
              </div>

              <div className="flex flex-col gap-1 min-w-0 p-3 bg-warm/30 rounded-xl border border-soft">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  Modalidade do Atendimento
                </span>
                {isEditing ? (
                  <select
                    value={currentPaciente.modalidade || "online"}
                    onChange={(e) => handleUpdateField("modalidade", e.target.value)}
                    className="text-xs font-semibold text-forest border border-emerald-500 bg-white rounded-lg px-2 py-1.5 w-full focus:outline-none cursor-pointer"
                  >
                    <option value="online">Online (Videochamada)</option>
                    <option value="presencial">Presencial (Consultório)</option>
                    <option value="hibrido">Híbrido</option>
                  </select>
                ) : (
                  <span className="text-sm font-semibold text-forest capitalize">
                    {currentPaciente.modalidade || "Online"}
                  </span>
                )}
                <span className="text-[10px] text-forest/50">Formato acordado com paciente</span>
              </div>

              <div className="flex flex-col gap-1 min-w-0 p-3 bg-warm/30 rounded-xl border border-soft">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider flex items-center justify-between">
                  <span>Periodicidade das Sessões</span>
                  {!canEditTabelaConvenio && <Lock className="w-3 h-3 text-forest/40" />}
                </span>
                {isEditing && canEditTabelaConvenio ? (
                  <select
                    value={frequenciaDisplay}
                    onChange={(e) => {
                      const val = e.target.value;
                      handlePatchFields({
                        frequenciaSessoes: val,
                        ...(isCorporativo ? { frequenciaRecomendada: val } : {}),
                      });
                    }}
                    className="text-xs font-semibold text-forest border border-emerald-500 bg-white rounded-lg px-2 py-1.5 w-full focus:outline-none cursor-pointer"
                  >
                    <option value="Semanal">Semanal (1x por semana)</option>
                    <option value="Quinzenal">Quinzenal</option>
                    <option value="2x por semana">2x por semana</option>
                    <option value="Mensal">Mensal</option>
                  </select>
                ) : (
                  <span className="text-sm font-semibold text-forest">
                    {frequenciaDisplay}
                  </span>
                )}
                <span className="text-[10px] text-forest/50">
                  {isCorporativo ? "Frequência prevista no convênio" : "Frequência terapêutica"}
                </span>
              </div>

              <div className="flex flex-col gap-1 min-w-0 p-3 bg-warm/30 rounded-xl border border-soft">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  Forma de Pagamento
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={currentPaciente.formaPagamento || ""}
                    onChange={(e) => handleUpdateField("formaPagamento", e.target.value)}
                    placeholder="Ex: Pix, Cartão, Dinheiro..."
                    className="text-xs font-semibold text-forest border border-emerald-500 bg-white rounded-lg px-2.5 py-1.5 w-full focus:outline-none"
                  />
                ) : (
                  <span className="text-sm font-semibold text-forest">
                    {currentPaciente.formaPagamento || "Pix"}
                  </span>
                )}
                <span className="text-[10px] text-forest/50">Acerto direto com o profissional</span>
              </div>
            </div>

            {/* Chave Pix para envio ao paciente */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="text-emerald-950 font-medium">
                  Chave Pix cadastrada para cobrança:{" "}
                  <strong>
                    {profile?.chavePix ||
                      profile?.pixKey ||
                      currentPaciente.chavePix ||
                      "Cadastre sua chave no Perfil"}
                  </strong>
                </span>
              </div>
              {(profile?.chavePix || profile?.pixKey || currentPaciente.chavePix) && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      profile?.chavePix || profile?.pixKey || currentPaciente.chavePix
                    );
                    showToast("Chave Pix copiada para a área de transferência!", "success");
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 rounded-lg font-bold border border-emerald-300 flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                >
                  <Copy className="w-3 h-3 text-emerald-600" />
                  Copiar Pix
                </button>
              )}
            </div>
          </div>

          {/* 6. SESSÕES & FATURAMENTO */}
          <div id="sec-ext-6-faturamento" className="bg-white p-4 sm:p-6 rounded-2xl border border-soft shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-soft pb-3 flex-wrap gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-forest" />{" "}
                {isCorporativo
                  ? "6. Sessões & Faturamento (Sincronizado com Agenda e Consolidado)"
                  : "6. Sessões & Faturamento Particular"}
              </h4>
              <button
                type="button"
                onClick={() => setShowFaturamentoModal(true)}
                className="text-xs font-bold text-forest bg-warm hover:bg-emerald-50 hover:text-emerald-900 border border-soft hover:border-emerald-300 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <span>Abrir Planilha de Faturamento</span>
                <span className="text-xs">→</span>
              </button>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
              <div className="p-3 rounded-xl bg-warm/40 border border-soft text-center">
                <span className="text-[10px] font-bold text-forest/60 uppercase block">Total de Sessões</span>
                <span className="text-lg font-extrabold text-forest">{sessoes.length}</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-center">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Realizadas</span>
                <span className="text-lg font-extrabold text-emerald-800">{sessoesRealizadas.length}</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-100/50 border border-emerald-300 text-center">
                <span className="text-[10px] font-bold text-emerald-900 uppercase block">Total Recebido</span>
                <span className="text-lg font-extrabold text-emerald-950">R$ {totalPago.toFixed(2)}</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                <span className="text-[10px] font-bold text-amber-900 uppercase block">Pendente</span>
                <span className="text-lg font-extrabold text-amber-900">R$ {totalPendente.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* 7. PRONTUÁRIO CLÍNICO & EVOLUÇÕES RÁPIDAS (PROTEGIDO POR SIGILO CFP) */}
          <div id="sec-ext-7-prontuario" className="bg-white p-4 sm:p-6 rounded-2xl border border-soft shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-soft pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-700" /> 7. Prontuário Clínico & Evoluções
                </h4>
                {canAccessProntuario && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 tabular-nums">
                    {Array.isArray(currentPaciente.prontuarioClinico)
                      ? currentPaciente.prontuarioClinico.length
                      : 0}{" "}
                    registros
                  </span>
                )}
              </div>
              {canAccessProntuario && (
                <button
                  type="button"
                  onClick={() => setShowProntuarioModal(true)}
                  className="text-xs font-bold text-forest bg-warm hover:bg-emerald-50 hover:text-emerald-900 border border-soft hover:border-emerald-300 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <span>Ver Prontuário Completo</span>
                  <span className="text-xs">→</span>
                </button>
              )}
            </div>

            {canAccessProntuario ? (
              <>
                {/* Caixa de Registro Rápido de Evolução */}
                <div className="bg-emerald-50/30 p-4 rounded-xl border border-emerald-200/80 flex flex-col gap-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Registrar Nova Evolução Clínica Rápida
                    </span>
                    <div className="flex items-center gap-2">
                      <select
                        value={novaEvolucaoModalidade}
                        onChange={(e) => setNovaEvolucaoModalidade(e.target.value as any)}
                        className="text-[11px] font-semibold text-forest bg-white border border-emerald-300 rounded-lg px-2 py-1 focus:outline-none"
                      >
                        <option value="online">Online</option>
                        <option value="presencial">Presencial</option>
                      </select>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={novaEvolucaoTitulo}
                    onChange={(e) => setNovaEvolucaoTitulo(e.target.value)}
                    placeholder="Título da sessão / tema principal"
                    className="w-full text-xs font-bold text-forest bg-white border border-soft rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
                  />

                  <textarea
                    rows={3}
                    value={novaEvolucaoTexto}
                    onChange={(e) => setNovaEvolucaoTexto(e.target.value)}
                    placeholder="Descreva a evolução da sessão: humor do paciente, tópicos abordados, intervenções realizadas e combinados para a próxima consulta..."
                    className="w-full text-xs text-forest bg-white border border-soft rounded-xl p-3 focus:outline-none focus:border-emerald-500 shadow-2xs leading-relaxed"
                  />

                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={salvandoEvolucao}
                      onClick={handleAddQuickEvolucao}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{salvandoEvolucao ? "Salvando..." : "Salvar no Prontuário"}</span>
                    </button>
                  </div>
                </div>

                {/* Linha do Tempo Recente */}
                {Array.isArray(currentPaciente.prontuarioClinico) &&
                currentPaciente.prontuarioClinico.length > 0 ? (
                  <div className="space-y-2.5 pt-2">
                    <span className="text-[11px] font-bold text-forest/70 uppercase tracking-wider block">
                      Últimos Registros Clínicos
                    </span>
                    {currentPaciente.prontuarioClinico
                      .slice(0, 3)
                      .map((reg: any) => (
                        <div
                          key={reg.id}
                          className="p-3.5 rounded-xl border border-soft bg-white hover:border-emerald-200 transition-colors shadow-2xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-forest">{reg.titulo}</span>
                              {reg.tipoRegistro && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-warm text-forest/70 border border-soft uppercase">
                                  {reg.tipoRegistro}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-forest/50 flex items-center gap-1 tabular-nums">
                              <Clock className="w-3 h-3 text-forest/40" />
                              {reg.dataSessao || reg.data || ""}{" "}
                              {reg.horario ? `às ${reg.horario}` : ""}
                            </span>
                          </div>
                          <p className="text-xs text-forest/80 line-clamp-2 leading-relaxed">
                            {reg.conteudo}
                          </p>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center p-6 bg-warm/20 rounded-xl border border-dashed border-soft text-forest/60 text-xs">
                    Nenhum registro clínico realizado ainda. Utilize o campo acima para adicionar a primeira evolução.
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 rounded-xl bg-warm/35 border border-soft flex items-start gap-3 text-xs text-forest/80">
                <Lock className="w-4 h-4 text-forest/60 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-forest block">
                    Sigilo Clínico Resguardado (Resoluções CFP nº 01/2009 e 06/2019)
                  </span>
                  <span className="text-forest/70 leading-relaxed">
                    As evoluções e anotações técnicas do prontuário clínico são de acesso exclusivo do(a) psicólogo(a) responsável pelo atendimento (
                    <strong>{currentPaciente.profissionalNome || "Profissional Responsável"}</strong>).
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 8. ALERTAS, LEMBRETES & WHATSAPP */}
          <div id="sec-ext-8-alertas" className="bg-white p-4 sm:p-6 rounded-2xl border border-soft shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-soft pb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-600" /> 8. Mensagens Rápidas & WhatsApp
              </h4>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                Comunicação Direta
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-soft bg-warm/30 flex flex-col justify-between gap-3">
                <div>
                  <span className="font-bold text-xs text-forest block">Lembrete de Sessão</span>
                  <p className="text-[11px] text-forest/70 mt-1 leading-relaxed">
                    "Olá {nomeDisplay}! Passando para lembrar da nossa sessão de amanhã..."
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    openWhatsApp(
                      `Olá ${nomeDisplay}! Passando para confirmar nossa próxima sessão de terapia. Tudo certo para nosso horário?`
                    )
                  }
                  className="w-full py-2 bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-xs rounded-lg border border-emerald-200 transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Send className="w-3 h-3 text-emerald-600" />
                  Enviar Lembrete
                </button>
              </div>

              <div className="p-3.5 rounded-xl border border-soft bg-warm/30 flex flex-col justify-between gap-3">
                <div>
                  <span className="font-bold text-xs text-forest block">Dados de Pagamento (Pix)</span>
                  <p className="text-[11px] text-forest/70 mt-1 leading-relaxed">
                    "Olá {nomeDisplay}! Seguem as informações para o pagamento da sessão via Pix..."
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    openWhatsApp(
                      `Olá ${nomeDisplay}! Segue a chave Pix para acerto dos honorários da sessão: ${
                        profile?.chavePix ||
                        profile?.pixKey ||
                        currentPaciente.chavePix ||
                        "sua_chave_pix"
                      }. Muito obrigado!`
                    )
                  }
                  className="w-full py-2 bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-xs rounded-lg border border-emerald-200 transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Send className="w-3 h-3 text-emerald-600" />
                  Enviar Dados Pix
                </button>
              </div>

              <div className="p-3.5 rounded-xl border border-soft bg-warm/30 flex flex-col justify-between gap-3">
                <div>
                  <span className="font-bold text-xs text-forest block">Link da Sala de Videochamada</span>
                  <p className="text-[11px] text-forest/70 mt-1 leading-relaxed">
                    "Olá {nomeDisplay}! Nosso atendimento online já vai começar..."
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    openWhatsApp(
                      `Olá ${nomeDisplay}! Nosso atendimento online está pronto para iniciar. Segue o link de acesso da nossa sala: ${
                        profile?.linkMeet || window.location.origin
                      }`
                    )
                  }
                  className="w-full py-2 bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-xs rounded-lg border border-emerald-200 transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Send className="w-3 h-3 text-emerald-600" />
                  Enviar Link da Sala
                </button>
              </div>
            </div>
          </div>

          {/* 9. HISTÓRICO DE MOVIMENTAÇÕES & DESFECHOS CORPORATIVOS */}
          {isCorporativo && (
            <div
              id="sec-ext-9-historico-corp"
              className="bg-white p-4 sm:p-6 rounded-2xl border border-soft shadow-2xs space-y-4"
            >
              <div className="flex items-center justify-between border-b border-soft pb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-forest" /> 9. Movimentações & Observações do Fluxo Corporativo
                </h4>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-warm text-forest/70 border border-soft">
                  Rastreabilidade Kanban
                </span>
              </div>

              {(statusCorp === "alta" || statusCorp === "interrupcao") &&
                currentPaciente.motivoDesfecho && (
                  <div
                    className={`rounded-xl p-3.5 border text-xs space-y-1 ${
                      statusCorp === "alta"
                        ? "bg-blue-50/60 border-blue-200 text-blue-950"
                        : "bg-rose-50/60 border-rose-200 text-rose-950"
                    }`}
                  >
                    <span className="font-bold uppercase tracking-wider block text-[11px]">
                      {statusCorp === "alta"
                        ? "Parecer de Alta Clínica"
                        : "Justificativa da Interrupção"}
                    </span>
                    <p className="leading-relaxed">{currentPaciente.motivoDesfecho}</p>
                  </div>
                )}

              {(effectiveRole !== "profissional" || currentPaciente.observacoesTriagem) && (
                <div className="space-y-1.5">
                  <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                    Observações da Triagem
                  </span>
                  {isEditing && effectiveRole !== "profissional" ? (
                    <textarea
                      rows={2}
                      value={currentPaciente.observacoesTriagem || ""}
                      onChange={(e) => handleUpdateField("observacoesTriagem", e.target.value)}
                      placeholder="Observações administrativas da triagem corporativa..."
                      className="w-full text-xs text-forest border border-emerald-500/80 bg-emerald-50/30 rounded-xl p-3 focus:outline-none"
                    />
                  ) : (
                    <p className="text-xs text-forest/80 bg-warm/25 p-3 rounded-xl border border-soft">
                      {currentPaciente.observacoesTriagem || "Sem observações adicionais da triagem."}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider">
                  Linha do Tempo do Encaminhamento
                </span>
                {Array.isArray(currentPaciente.historico) && currentPaciente.historico.length > 0 ? (
                  <div className="space-y-2">
                    {currentPaciente.historico.map((h: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 text-xs p-3 rounded-xl bg-warm/30 border border-soft/70"
                      >
                        <Clock className="w-3.5 h-3.5 text-forest/40 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <strong className="text-forest">{h.acao}</strong>
                            {h.data && (
                              <span className="text-[11px] text-forest/50 tabular-nums">
                                {new Date(h.data).toLocaleString("pt-BR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            )}
                          </div>
                          <p className="text-forest/70 text-[11px]">
                            Por: {h.autor || "Sistema"} {h.detalhes ? `— ${h.detalhes}` : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-forest/50">Nenhuma movimentação registrada ainda.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé da Ficha */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white border-t border-soft flex items-center justify-between shrink-0">
          <div className="text-xs text-forest/60">
            {isCorporativo
              ? "Ficha de Bordo Unificada (Convênio Corporativo) • Resguardada por Sigilo Profissional CFP"
              : "Ficha de Bordo do Paciente Particular • Resguardada por Sigilo Profissional"}
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            className="px-5 py-2 rounded-xl bg-forest hover:bg-forest/90 text-white font-bold text-xs shadow-xs cursor-pointer"
          >
            Fechar Ficha
          </button>
        </div>
      </div>

      {/* SUBMODAL DE DESFECHO CORPORATIVO (ALTA CLÍNICA / INTERRUPÇÃO) */}
      {isCorporativo && modalDesfechoCorp.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-forest/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-soft space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-soft">
              <div className="flex items-center gap-2">
                {modalDesfechoCorp.tipo === "alta" ? (
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                )}
                <h3 className="font-bold font-serif text-forest text-base sm:text-lg">
                  {modalDesfechoCorp.tipo === "alta"
                    ? "Registrar Alta Clínica"
                    : "Registrar Interrupção de Atendimento"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalDesfechoCorp({ isOpen: false, tipo: "alta", motivo: "" })}
                className="text-forest/40 hover:text-forest p-1 rounded-full cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-forest/75 leading-relaxed">
              Você está registrando o desfecho do acompanhamento de{" "}
              <strong>{nomeDisplay}</strong> (
              {effectiveRole === "profissional"
                ? "Convênio Corporativo"
                : currentPaciente.empresaNome || "Convênio Corporativo"}
              ). O status será atualizado automaticamente no Kanban Corporativo.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-forest block">
                {modalDesfechoCorp.tipo === "alta"
                  ? "Observações / Parecer de Alta Clínica:"
                  : "Motivo da Interrupção do Atendimento:"}
              </label>
              <textarea
                rows={3}
                value={modalDesfechoCorp.motivo}
                onChange={(e) =>
                  setModalDesfechoCorp((prev) => ({ ...prev, motivo: e.target.value }))
                }
                placeholder={
                  modalDesfechoCorp.tipo === "alta"
                    ? "Descreva brevemente a conclusão dos objetivos terapêuticos..."
                    : "Ex: solicitação de pausa pelo beneficiário, mudança de turno, desligamento..."
                }
                className="w-full p-3 bg-warm/30 rounded-xl text-xs text-forest border border-soft focus:border-forest/40 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalDesfechoCorp({ isOpen: false, tipo: "alta", motivo: "" })}
                className="px-4 py-2 text-xs font-semibold text-forest/70 hover:text-forest rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleConfirmarDesfechoCorporativo}
                className={`px-5 py-2.5 text-xs font-bold rounded-xl text-white shadow-xs cursor-pointer disabled:opacity-50 ${
                  modalDesfechoCorp.tipo === "alta"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {saving ? "Salvando..." : "Confirmar Desfecho"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PRONTUÁRIO CLÍNICO INTEGRADO */}
      {showProntuarioModal && canAccessProntuario && (
        <PacienteProntuarioModal
          isOpen={showProntuarioModal}
          onClose={() => setShowProntuarioModal(false)}
          pacienteId={currentPaciente.id}
          pacienteNome={nomeDisplay}
          pacienteCpf={cpfDisplay}
          pacienteDataNascimento={dataNascimentoDisplay}
          pacienteTelefone={telDisplay}
          registros={currentPaciente.prontuarioClinico || []}
          onSaveRegistros={async (novosRegistros) => {
            await handlePatchFields({ prontuarioClinico: novosRegistros }, true);
          }}
          sessoes={sessoes}
          onSaveSessoes={async (novasSessoes) => {
            await handlePatchFields({ historicoSessoes: novasSessoes }, true);
            await syncSessoesToAgendamentos(novasSessoes);
          }}
          onAbrirFaturamento={() => {
            setShowProntuarioModal(false);
            setShowFaturamentoModal(true);
          }}
          profissionalLogado={{
            uid: profile?.uid || user?.uid || currentPaciente.profissionalId,
            nome: profile?.name || profile?.nome || currentPaciente.profissionalNome,
            name: profile?.name || profile?.nome || currentPaciente.profissionalNome,
            crp: profile?.crp || currentPaciente.profissionalCrp,
          }}
          showToast={showToast}
        />
      )}

      {/* MODAL DE SESSÕES & FATURAMENTO INTEGRADO */}
      {showFaturamentoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-soft flex flex-col max-h-[92vh] overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-forest to-emerald-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-sm sm:text-base font-serif">
                  Sessões & Faturamento • {nomeDisplay}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFaturamentoModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <PacienteFaturamentoSpreadsheet
                pacienteId={currentPaciente.id}
                pacienteNome={nomeDisplay}
                pacienteCpf={cpfDisplay}
                pacienteTelefone={telDisplay}
                pacienteEmail={emailDisplay}
                valorSessaoPadrao={currentPaciente.valorSessao}
                frequenciaPadrao={frequenciaDisplay}
                sessoes={sessoes}
                onSaveSessoes={async (novasSessoes) => {
                  await handlePatchFields({ historicoSessoes: novasSessoes }, true);
                  await syncSessoesToAgendamentos(novasSessoes);
                }}
                perfilFaturamento={
                  currentPaciente.perfilFaturamento || profile?.faturamentoPadrao || "PF"
                }
                perfilFaturamentoId={currentPaciente.perfilFaturamentoId}
                onUpdatePerfilFaturamento={async (novoPerfil) => {
                  await handlePatchFields({ perfilFaturamento: novoPerfil }, true);
                }}
                onUpdatePerfilFaturamentoId={async (novoId, via) => {
                  await handlePatchFields(
                    { perfilFaturamentoId: novoId, perfilFaturamento: via },
                    true
                  );
                }}
                onSavePerfisFaturamento={async (novosPerfis) => {
                  const profId = profile?.uid || user?.uid;
                  if (!profId) return;
                  try {
                    const syncFields = extractLegacySyncFields(
                      novosPerfis,
                      profile?.cpf,
                      profile?.chavePix || profile?.pixKey
                    );
                    await updateDoc(doc(db, "users", profId), {
                      ...syncFields,
                      updatedAt: serverTimestamp(),
                    });
                    showToast("Perfis de faturamento atualizados no seu cadastro!", "success");
                  } catch (err) {
                    console.error("Erro ao salvar perfis de faturamento:", err);
                    showToast("Erro ao salvar perfis de faturamento.", "error");
                  }
                }}
                onSaveDadosPJ={async (dadosPJ) => {
                  const profId = profile?.uid || user?.uid;
                  if (profId) {
                    try {
                      await updateDoc(doc(db, "users", profId), {
                        dadosPJ,
                        updatedAt: serverTimestamp(),
                      });
                      showToast("Dados de Pessoa Jurídica salvos no seu perfil!", "success");
                    } catch (err) {
                      console.error("Erro ao salvar dados PJ:", err);
                      showToast("Erro ao salvar dados PJ no perfil.", "error");
                    }
                  }
                }}
                isCorporativo={isCorporativo}
                empresaNome={
                  effectiveRole === "profissional"
                    ? "Convênio Corporativo"
                    : currentPaciente.empresaNome || "Convênio Corporativo"
                }
                registrosProntuario={currentPaciente.prontuarioClinico || []}
                profissionalLogado={{
                  uid: profile?.uid || user?.uid || currentPaciente.profissionalId,
                  name: profile?.name || profile?.nome || currentPaciente.profissionalNome,
                  nome: profile?.name || profile?.nome || currentPaciente.profissionalNome,
                  crp: profile?.crp || currentPaciente.profissionalCrp,
                  cpf: profile?.cpf,
                  chavePix: profile?.chavePix || profile?.pixKey || currentPaciente.chavePix,
                  pixKey: profile?.pixKey || profile?.chavePix,
                  email: profile?.email || user?.email,
                  telefone: profile?.telefone,
                  dadosPJ: profile?.dadosPJ || profile?.perfilPJ,
                  faturamentoPadrao: profile?.faturamentoPadrao,
                  perfisFaturamento: profile?.perfisFaturamento,
                }}
                showToast={showToast}
                onAbrirProntuarioModal={
                  canAccessProntuario
                    ? () => {
                        setShowFaturamentoModal(false);
                        setShowProntuarioModal(true);
                      }
                    : undefined
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONTRATO TERAPÊUTICO */}
      {showContratoModal && (
        <ContratoGeradorModal
          isOpen={showContratoModal}
          paciente={currentPaciente}
          allUsers={allUsers}
          onClose={() => setShowContratoModal(false)}
          onContratoSalvo={(updated) => {
            latestPacienteRef.current = updated;
            setCurrentPaciente(updated);
            onUpdatePaciente(updated);
          }}
          profissionalLogado={profile}
          collectionName={targetCollection}
          tipoAcolhimento={isCorporativo ? "corporativo" : undefined}
          showToast={showToast}
        />
      )}
    </div>
  );
}
