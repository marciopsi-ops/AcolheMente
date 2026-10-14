import React, { useState, useMemo } from "react";
import {
  XCircle,
  BookOpen,
  Calendar,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  User,
  ShieldCheck,
  Tag,
  ArrowRight,
  FileText,
  Sparkles,
  ChevronDown,
  Layers,
  ExternalLink,
} from "lucide-react";
import { SessaoFaturamentoItem } from "./PacienteFaturamentoSpreadsheet";

export interface ProntuarioRegistroItem {
  id: string;
  pacienteId: string;
  sessaoFaturamentoId?: string; // ID da SessaoFaturamentoItem vinculada
  numeroSessao?: number; // Número da sessão em faturamento
  dataRegistro: string; // YYYY-MM-DD
  dataSessao: string; // YYYY-MM-DD da sessão
  horario?: string; // HH:MM
  tipoRegistro:
    | "evolucao"
    | "anamnese"
    | "encaminhamento"
    | "parecer"
    | "supervisao"
    | "encerramento"
    | "outro";
  titulo: string;
  conteudo: string; // Anotações clínicas / evolução
  planoTerapeutico?: string; // Próximos passos / combinados
  humorOuEstadoGeral?: string; // Estado geral do paciente
  temasAbordados?: string[]; // Tags
  profissionalId?: string;
  profissionalNome?: string;
  profissionalCrp?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PacienteProntuarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  pacienteId: string;
  pacienteNome: string;
  pacienteCpf?: string;
  pacienteDataNascimento?: string;
  pacienteTelefone?: string;
  sessoes?: SessaoFaturamentoItem[];
  onSaveSessoes?: (novasSessoes: SessaoFaturamentoItem[]) => Promise<void> | void;
  registros?: ProntuarioRegistroItem[];
  onSaveRegistros: (novosRegistros: ProntuarioRegistroItem[]) => Promise<void> | void;
  onAbrirFaturamento?: (sessaoId?: string) => void;
  profissionalLogado?: {
    uid?: string;
    nome?: string;
    name?: string;
    crp?: string;
  };
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

const TEMAS_SUGERIDOS = [
  "Ansiedade",
  "Depressão / Desânimo",
  "Trabalho / Burnout",
  "Relações Familiares",
  "Conflito Conjugal",
  "Autoestima & Identidade",
  "Luto & Perda",
  "Tomada de Decisão",
  "Sintomas Psicossomáticos",
  "Regulação Emocional",
  "Limites & Assertividade",
  "Trauma / Estresse Pós-Traumático",
];

const ESTADOS_GERAIS = [
  "Estável / Tranquilo",
  "Ansioso / Agitado",
  "Rebaixado / Triste",
  "Engajado / Colaborativo",
  "Instável / Reativo",
  "Reflexivo / Aberto",
  "Cansado / Esgotado",
  "Em Crise Aguda",
];

export const PacienteProntuarioModal: React.FC<PacienteProntuarioModalProps> = ({
  isOpen,
  onClose,
  pacienteId,
  pacienteNome,
  pacienteCpf = "",
  pacienteDataNascimento = "",
  pacienteTelefone = "",
  sessoes = [],
  onSaveSessoes,
  registros = [],
  onSaveRegistros,
  onAbrirFaturamento,
  profissionalLogado,
  showToast,
}) => {
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroVinculo, setFiltroVinculo] = useState<"todos" | "com_sessao" | "avulso">("todos");
  const [ordemCrescente, setOrdemCrescente] = useState(false);

  // Modo de Edição / Novo Registro
  const [isEditing, setIsEditing] = useState(false);
  const [registroEmEdicao, setRegistroEmEdicao] = useState<Partial<ProntuarioRegistroItem> | null>(null);

  // Modal de Exclusão
  const [registroParaExcluir, setRegistroParaExcluir] = useState<ProntuarioRegistroItem | null>(null);

  // Modo de Impressão / Prévia para Relatório
  const [isPrintMode, setIsPrintMode] = useState(false);

  // Input de tag customizada
  const [novaTagInput, setNovaTagInput] = useState("");

  if (!isOpen) return null;

  // Mapa de sessões por ID
  const sessoesMap = useMemo(() => {
    const map = new Map<string, SessaoFaturamentoItem>();
    sessoes.forEach((s) => map.set(s.id, s));
    return map;
  }, [sessoes]);

  // Contagem de sessões realizadas com e sem evolução
  const estatisticas = useMemo(() => {
    const sessoesRealizadas = sessoes.filter((s) => s.statusAtendimento === "realizada");
    const sessoesComEvolucaoIds = new Set(
      registros.filter((r) => r.sessaoFaturamentoId).map((r) => r.sessaoFaturamentoId!)
    );
    const realizadasComEvolucao = sessoesRealizadas.filter((s) => sessoesComEvolucaoIds.has(s.id));
    const sessoesPendentes = sessoesRealizadas.filter((s) => !sessoesComEvolucaoIds.has(s.id));

    return {
      totalRegistros: registros.length,
      totalSessoesFaturamento: sessoes.length,
      realizadas: sessoesRealizadas.length,
      realizadasComEvolucao: realizadasComEvolucao.length,
      pendentesEvolucao: sessoesPendentes,
    };
  }, [sessoes, registros]);

  // Filtragem e ordenação dos registros
  const registrosFiltrados = useMemo(() => {
    return registros
      .filter((r) => {
        // Busca textual
        if (busca.trim()) {
          const q = busca.toLowerCase();
          const matchTitulo = r.titulo?.toLowerCase().includes(q);
          const matchConteudo = r.conteudo?.toLowerCase().includes(q);
          const matchPlano = r.planoTerapeutico?.toLowerCase().includes(q);
          const matchTags = r.temasAbordados?.some((t) => t.toLowerCase().includes(q));
          const matchSessao = r.numeroSessao ? `sessão #${r.numeroSessao}`.includes(q) : false;
          if (!matchTitulo && !matchConteudo && !matchPlano && !matchTags && !matchSessao) {
            return false;
          }
        }

        // Filtro de Tipo
        if (filtroTipo !== "todos" && r.tipoRegistro !== filtroTipo) {
          return false;
        }

        // Filtro de Vínculo com Faturamento
        if (filtroVinculo === "com_sessao" && !r.sessaoFaturamentoId) {
          return false;
        }
        if (filtroVinculo === "avulso" && r.sessaoFaturamentoId) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const dataA = a.dataSessao || a.dataRegistro || "";
        const dataB = b.dataSessao || b.dataRegistro || "";
        return ordemCrescente ? dataA.localeCompare(dataB) : dataB.localeCompare(dataA);
      });
  }, [registros, busca, filtroTipo, filtroVinculo, ordemCrescente]);

  // Inicializar novo registro
  const handleNovoRegistro = (sessaoPreselecionada?: SessaoFaturamentoItem) => {
    const hoje = new Date().toISOString().split("T")[0];
    const horaAtual = new Date().toTimeString().substring(0, 5);

    if (sessaoPreselecionada) {
      setRegistroEmEdicao({
        id: `pront_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        pacienteId,
        sessaoFaturamentoId: sessaoPreselecionada.id,
        numeroSessao: sessaoPreselecionada.numeroSessao,
        dataRegistro: hoje,
        dataSessao: sessaoPreselecionada.data || hoje,
        horario: sessaoPreselecionada.horario || horaAtual,
        tipoRegistro: "evolucao",
        titulo: `Evolução Clínica - Sessão #${sessaoPreselecionada.numeroSessao}`,
        conteudo: "",
        planoTerapeutico: "",
        humorOuEstadoGeral: "Estável / Tranquilo",
        temasAbordados: [],
        profissionalId: profissionalLogado?.uid,
        profissionalNome: profissionalLogado?.nome || profissionalLogado?.name || "Profissional Responsável",
        profissionalCrp: profissionalLogado?.crp || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Tentar sugerir a próxima sessão não evoluída se houver
      const proximaSessao = estatisticas.pendentesEvolucao[0];
      setRegistroEmEdicao({
        id: `pront_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        pacienteId,
        sessaoFaturamentoId: proximaSessao?.id || undefined,
        numeroSessao: proximaSessao?.numeroSessao || undefined,
        dataRegistro: hoje,
        dataSessao: proximaSessao?.data || hoje,
        horario: proximaSessao?.horario || horaAtual,
        tipoRegistro: "evolucao",
        titulo: proximaSessao
          ? `Evolução Clínica - Sessão #${proximaSessao.numeroSessao}`
          : "Evolução Clínica da Sessão",
        conteudo: "",
        planoTerapeutico: "",
        humorOuEstadoGeral: "Estável / Tranquilo",
        temasAbordados: [],
        profissionalId: profissionalLogado?.uid,
        profissionalNome: profissionalLogado?.nome || profissionalLogado?.name || "Profissional Responsável",
        profissionalCrp: profissionalLogado?.crp || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    setIsEditing(true);
  };

  const handleEditarRegistro = (reg: ProntuarioRegistroItem) => {
    setRegistroEmEdicao({ ...reg });
    setIsEditing(true);
  };

  // Salvar registro
  const handleSalvarEdicao = async () => {
    if (!registroEmEdicao) return;
    if (!registroEmEdicao.titulo?.trim()) {
      showToast("Informe o título do registro clínico.", "warning");
      return;
    }
    if (!registroEmEdicao.conteudo?.trim()) {
      showToast("Preencha a anotação/evolução clínica antes de salvar.", "warning");
      return;
    }

    const regFinal: ProntuarioRegistroItem = {
      id: registroEmEdicao.id || `pront_${Date.now()}`,
      pacienteId,
      sessaoFaturamentoId: registroEmEdicao.sessaoFaturamentoId || undefined,
      numeroSessao: registroEmEdicao.numeroSessao,
      dataRegistro: registroEmEdicao.dataRegistro || new Date().toISOString().split("T")[0],
      dataSessao: registroEmEdicao.dataSessao || registroEmEdicao.dataRegistro || new Date().toISOString().split("T")[0],
      horario: registroEmEdicao.horario || "",
      tipoRegistro: registroEmEdicao.tipoRegistro || "evolucao",
      titulo: registroEmEdicao.titulo.trim(),
      conteudo: registroEmEdicao.conteudo.trim(),
      planoTerapeutico: registroEmEdicao.planoTerapeutico?.trim() || "",
      humorOuEstadoGeral: registroEmEdicao.humorOuEstadoGeral || "",
      temasAbordados: registroEmEdicao.temasAbordados || [],
      profissionalId: registroEmEdicao.profissionalId || profissionalLogado?.uid,
      profissionalNome:
        registroEmEdicao.profissionalNome || profissionalLogado?.nome || profissionalLogado?.name || "Profissional",
      profissionalCrp: registroEmEdicao.profissionalCrp || profissionalLogado?.crp || "",
      createdAt: registroEmEdicao.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const index = registros.findIndex((r) => r.id === regFinal.id);
    let novosRegistros: ProntuarioRegistroItem[];
    if (index >= 0) {
      novosRegistros = [...registros];
      novosRegistros[index] = regFinal;
      showToast("Registro clínico atualizado com sucesso!", "success");
    } else {
      novosRegistros = [regFinal, ...registros];
      showToast("Nova evolução gravada no prontuário!", "success");
    }

    await onSaveRegistros(novosRegistros);
    setIsEditing(false);
    setRegistroEmEdicao(null);
  };

  // Excluir registro
  const handleConfirmarExclusao = async () => {
    if (!registroParaExcluir) return;
    const novosRegistros = registros.filter((r) => r.id !== registroParaExcluir.id);
    await onSaveRegistros(novosRegistros);
    showToast("Registro clínico removido.", "info");
    setRegistroParaExcluir(null);
  };

  // Alternar tag
  const handleToggleTag = (tag: string) => {
    if (!registroEmEdicao) return;
    const current = registroEmEdicao.temasAbordados || [];
    if (current.includes(tag)) {
      setRegistroEmEdicao({
        ...registroEmEdicao,
        temasAbordados: current.filter((t) => t !== tag),
      });
    } else {
      setRegistroEmEdicao({
        ...registroEmEdicao,
        temasAbordados: [...current, tag],
      });
    }
  };

  const handleAddCustomTag = () => {
    if (!novaTagInput.trim() || !registroEmEdicao) return;
    const tag = novaTagInput.trim();
    const current = registroEmEdicao.temasAbordados || [];
    if (!current.includes(tag)) {
      setRegistroEmEdicao({
        ...registroEmEdicao,
        temasAbordados: [...current, tag],
      });
    }
    setNovaTagInput("");
  };

  // Criar nova sessão em faturamento diretamente do prontuário
  const handleCriarSessaoEmFaturamento = async () => {
    if (!onSaveSessoes) return;
    const proximoNumero = sessoes.length > 0 ? Math.max(...sessoes.map((s) => s.numeroSessao || 0)) + 1 : 1;
    const hoje = new Date().toISOString().split("T")[0];
    const novaSessao: SessaoFaturamentoItem = {
      id: `sessao_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      numeroSessao: proximoNumero,
      data: registroEmEdicao?.dataSessao || hoje,
      horario: registroEmEdicao?.horario || "14:00",
      modalidade: "online",
      statusAtendimento: "realizada",
      valor: 100,
      statusPagamento: "pendente",
      formaPagamento: "Pix",
      observacoes: `Criada via Prontuário Clínico (Sessão #${proximoNumero})`,
    };

    const novasSessoes = [...sessoes, novaSessao];
    await onSaveSessoes(novasSessoes);

    // Conectar automaticamente à edição em aberto
    if (registroEmEdicao) {
      setRegistroEmEdicao({
        ...registroEmEdicao,
        sessaoFaturamentoId: novaSessao.id,
        numeroSessao: proximoNumero,
        dataSessao: novaSessao.data,
        titulo: `Evolução Clínica - Sessão #${proximoNumero}`,
      });
    }

    showToast(`Sessão #${proximoNumero} lançada no Faturamento e vinculada com sucesso!`, "success");
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "evolucao":
        return { label: "Evolução Clínica", color: "bg-emerald-50 text-emerald-800 border-emerald-200" };
      case "anamnese":
        return { label: "Anamnese / Inicial", color: "bg-sky-50 text-sky-800 border-sky-200" };
      case "encaminhamento":
        return { label: "Encaminhamento", color: "bg-purple-50 text-purple-800 border-purple-200" };
      case "parecer":
        return { label: "Parecer / Relatório", color: "bg-indigo-50 text-indigo-800 border-indigo-200" };
      case "supervisao":
        return { label: "Supervisão Clínica", color: "bg-amber-50 text-amber-800 border-amber-200" };
      case "encerramento":
        return { label: "Encerramento / Alta", color: "bg-rose-50 text-rose-800 border-rose-200" };
      default:
        return { label: "Registro Geral", color: "bg-warm text-forest/80 border-soft" };
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-soft shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho do Prontuário */}
        <div className="p-4 sm:p-5 border-b border-soft bg-warm/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-md shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-base sm:text-lg text-forest">
                  Prontuário & Registros Clínicos
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-700" /> Sigilo Ético CFP
                </span>
              </div>
              <p className="text-xs text-forest/70 flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-forest">{pacienteNome}</span>
                {pacienteCpf && <span className="text-forest/50">CPF: {pacienteCpf}</span>}
                {profissionalLogado?.crp && (
                  <span className="text-forest/60 bg-white/80 px-2 py-0.2 rounded border border-soft text-[10px] font-medium">
                    CRP: {profissionalLogado.crp}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 self-end sm:self-center">
            {/* Botão de Atalho para Faturamento */}
            {onAbrirFaturamento && (
              <button
                type="button"
                onClick={() => onAbrirFaturamento()}
                className="flex items-center gap-1.5 text-xs font-bold text-forest/80 bg-white hover:bg-emerald-50 hover:text-emerald-900 border border-soft hover:border-emerald-300 px-3 py-2 rounded-xl transition-colors shadow-2xs cursor-pointer"
                title="Abrir módulo de sessões e faturamento deste paciente"
              >
                <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                <span className="hidden sm:inline">Sessões & Faturamento</span>
                <span className="sm:hidden">Faturamento</span>
              </button>
            )}

            {/* Botão Imprimir Prontuário */}
            <button
              type="button"
              onClick={() => setIsPrintMode(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-forest/80 bg-white hover:bg-warm border border-soft px-3 py-2 rounded-xl transition-colors shadow-2xs cursor-pointer"
              title="Gerar visualização completa para impressão / laudo"
            >
              <Printer className="w-3.5 h-3.5 text-forest/70" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            {/* Botão Novo Registro */}
            {!isEditing && (
              <button
                type="button"
                onClick={() => handleNovoRegistro()}
                className="flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 px-3.5 py-2 rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova Evolução</span>
              </button>
            )}

            {/* Fechar */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-forest/50 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors cursor-pointer ml-1"
              title="Fechar Prontuário"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Resumo de Sessões Vinculadas vs Pendências */}
        <div className="bg-warm/30 border-b border-soft px-4 sm:px-6 py-2.5 flex items-center justify-between flex-wrap gap-2 text-xs text-forest/80">
          <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
            <span className="flex items-center gap-1.5 font-medium">
              <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
              <strong>{estatisticas.totalRegistros}</strong> registros no prontuário
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-700" />
              <strong>{estatisticas.realizadasComEvolucao}</strong> de{" "}
              <strong>{estatisticas.realizadas}</strong> sessões realizadas têm evolução
            </span>
          </div>

          {/* Alerta de Sessões Realizadas sem Evolução */}
          {estatisticas.pendentesEvolucao.length > 0 && !isEditing && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-900 px-2.5 py-1 rounded-xl text-[11px] font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                {estatisticas.pendentesEvolucao.length} sessão(ões) realizada(s) aguardando anotação
              </span>
              <button
                type="button"
                onClick={() => handleNovoRegistro(estatisticas.pendentesEvolucao[0])}
                className="bg-amber-600 hover:bg-amber-700 text-white px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
              >
                Evoluir #{estatisticas.pendentesEvolucao[0].numeroSessao}
              </button>
            </div>
          )}
        </div>

        {/* Corpo Principal: Form de Edição OU Lista de Registros */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-warm/10">
          {isEditing && registroEmEdicao ? (
            /* ======================================================== */
            /* FORMULÁRIO DE NOVA EVOLUÇÃO / EDIÇÃO                     */
            /* ======================================================== */
            <div className="bg-white rounded-2xl border border-soft p-4 sm:p-6 shadow-sm space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-soft pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    {registroEmEdicao.numeroSessao ? `#${registroEmEdicao.numeroSessao}` : "📝"}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm sm:text-base text-forest">
                      {registroEmEdicao.id && registros.some((r) => r.id === registroEmEdicao.id)
                        ? "Editar Registro Clínico"
                        : "Novo Registro de Prontuário"}
                    </h4>
                    <p className="text-[11px] text-forest/60">
                      As anotações serão arquivadas no prontuário do paciente com rastreabilidade de sessão.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setRegistroEmEdicao(null);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-forest/70 hover:text-forest bg-warm/40 hover:bg-warm rounded-xl transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSalvarEdicao}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Salvar Registro
                  </button>
                </div>
              </div>

              {/* Box de Vinculação com Faturamento */}
              <div className="p-3.5 bg-warm/35 border border-soft rounded-2xl space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-bold text-forest flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-emerald-700" />
                    Vínculo com Sessão de Faturamento:
                  </label>

                  {onSaveSessoes && (
                    <button
                      type="button"
                      onClick={handleCriarSessaoEmFaturamento}
                      className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      title="Lança uma nova sessão no faturamento e conecta a este registro automaticamente"
                    >
                      <Plus className="w-3 h-3 text-emerald-700" />
                      Lançar Nova Sessão no Faturamento Agora
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <select
                      value={registroEmEdicao.sessaoFaturamentoId || ""}
                      onChange={(e) => {
                        const sessaoId = e.target.value;
                        if (!sessaoId) {
                          setRegistroEmEdicao({
                            ...registroEmEdicao,
                            sessaoFaturamentoId: undefined,
                            numeroSessao: undefined,
                          });
                        } else {
                          const sess = sessoesMap.get(sessaoId);
                          if (sess) {
                            setRegistroEmEdicao({
                              ...registroEmEdicao,
                              sessaoFaturamentoId: sess.id,
                              numeroSessao: sess.numeroSessao,
                              dataSessao: sess.data || registroEmEdicao.dataSessao,
                              horario: sess.horario || registroEmEdicao.horario,
                              titulo: `Evolução Clínica - Sessão #${sess.numeroSessao}`,
                            });
                          }
                        }
                      }}
                      className="w-full text-xs font-semibold bg-white border border-soft rounded-xl px-3 py-2 text-forest focus:outline-none focus:border-forest/50 cursor-pointer"
                    >
                      <option value="">-- Registro Avulso (Sem vínculo de faturamento) --</option>
                      {sessoes.map((s) => (
                        <option key={s.id} value={s.id}>
                          Sessão #{s.numeroSessao} • {s.data || "Sem data"} ({s.modalidade}) • {s.statusAtendimento} • R$ {s.valor}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center text-[11px] text-forest/70 bg-white/70 px-3 py-2 rounded-xl border border-soft">
                    {registroEmEdicao.sessaoFaturamentoId ? (
                      <span className="flex items-center gap-1.5 text-emerald-800 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Vinculado à Sessão #{registroEmEdicao.numeroSessao} no Faturamento
                      </span>
                    ) : (
                      <span className="text-forest/60 italic">
                        Registro sem vínculo direto (ideal para entrevistas preliminares, contatos com rede ou supervisões).
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Informações Básicas da Sessão / Registro */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-forest/80 block mb-1">
                    Tipo de Registro:
                  </label>
                  <select
                    value={registroEmEdicao.tipoRegistro || "evolucao"}
                    onChange={(e) =>
                      setRegistroEmEdicao({
                        ...registroEmEdicao,
                        tipoRegistro: e.target.value as any,
                      })
                    }
                    className="w-full text-xs bg-warm/30 border border-soft rounded-xl px-3 py-2 font-semibold text-forest focus:outline-none focus:border-forest/50"
                  >
                    <option value="evolucao">Evolução Clínica</option>
                    <option value="anamnese">Anamnese / Inicial</option>
                    <option value="encaminhamento">Encaminhamento</option>
                    <option value="parecer">Parecer / Relatório</option>
                    <option value="supervisao">Supervisão Clínica</option>
                    <option value="encerramento">Encerramento / Alta</option>
                    <option value="outro">Outro Registro</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-forest/80 block mb-1">
                    Data da Sessão:
                  </label>
                  <input
                    type="date"
                    value={registroEmEdicao.dataSessao || ""}
                    onChange={(e) =>
                      setRegistroEmEdicao({ ...registroEmEdicao, dataSessao: e.target.value })
                    }
                    className="w-full text-xs bg-warm/30 border border-soft rounded-xl px-3 py-2 text-forest focus:outline-none focus:border-forest/50 font-medium"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-forest/80 block mb-1">
                    Horário:
                  </label>
                  <input
                    type="time"
                    value={registroEmEdicao.horario || ""}
                    onChange={(e) =>
                      setRegistroEmEdicao({ ...registroEmEdicao, horario: e.target.value })
                    }
                    className="w-full text-xs bg-warm/30 border border-soft rounded-xl px-3 py-2 text-forest focus:outline-none focus:border-forest/50 font-medium"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-forest/80 block mb-1">
                    Estado Geral / Humor:
                  </label>
                  <select
                    value={registroEmEdicao.humorOuEstadoGeral || ""}
                    onChange={(e) =>
                      setRegistroEmEdicao({ ...registroEmEdicao, humorOuEstadoGeral: e.target.value })
                    }
                    className="w-full text-xs bg-warm/30 border border-soft rounded-xl px-3 py-2 font-medium text-forest focus:outline-none focus:border-forest/50"
                  >
                    <option value="">Selecione...</option>
                    {ESTADOS_GERAIS.map((est) => (
                      <option key={est} value={est}>
                        {est}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Título do Registro */}
              <div>
                <label className="text-[11px] font-bold text-forest/80 block mb-1">
                  Título ou Resumo do Registro: *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Sessão #3 - Manejo de ansiedade e rotina de sono"
                  value={registroEmEdicao.titulo || ""}
                  onChange={(e) =>
                    setRegistroEmEdicao({ ...registroEmEdicao, titulo: e.target.value })
                  }
                  className="w-full text-xs sm:text-sm bg-warm/20 border border-soft rounded-xl px-3.5 py-2 font-semibold text-forest focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Temas Abordados (Tags) */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-forest/80 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-forest/60" /> Temas Principais Abordados na Sessão:
                  </span>
                  <span className="text-[10px] text-forest/50 font-normal">
                    Clique para selecionar ou adicione tags próprias
                  </span>
                </label>

                <div className="flex flex-wrap gap-1.5">
                  {TEMAS_SUGERIDOS.map((tema) => {
                    const isSelected = (registroEmEdicao.temasAbordados || []).includes(tema);
                    return (
                      <button
                        type="button"
                        key={tema}
                        onClick={() => handleToggleTag(tema)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-emerald-700 text-white border-emerald-700 shadow-2xs"
                            : "bg-white text-forest/70 border-soft hover:bg-warm/60 hover:text-forest"
                        }`}
                      >
                        {tema}
                      </button>
                    );
                  })}
                </div>

                {/* Adicionar Tag Livre */}
                <div className="flex items-center gap-2 pt-1 max-w-sm">
                  <input
                    type="text"
                    placeholder="Outro tema / tag..."
                    value={novaTagInput}
                    onChange={(e) => setNovaTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomTag();
                      }
                    }}
                    className="text-xs bg-warm/20 border border-soft rounded-lg px-2.5 py-1 text-forest flex-1 focus:outline-none focus:border-forest/50"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTag}
                    className="text-xs font-bold text-forest bg-warm/60 hover:bg-warm border border-soft px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              {/* Conteúdo / Anotações Clínicas */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-forest/80 block">
                  Anotações da Sessão / Evolução Clínica Técnica: *
                </label>
                <textarea
                  rows={8}
                  placeholder="Descreva a evolução do paciente, principais queixas trazidas, intervenções técnicas realizadas, recursos mobilizados e resposta clínica..."
                  value={registroEmEdicao.conteudo || ""}
                  onChange={(e) =>
                    setRegistroEmEdicao({ ...registroEmEdicao, conteudo: e.target.value })
                  }
                  className="w-full text-xs sm:text-sm bg-warm/15 border border-soft rounded-2xl p-4 text-forest leading-relaxed focus:outline-none focus:border-emerald-600 resize-y font-sans"
                />
                <span className="text-[10px] text-forest/50 block text-right">
                  {registroEmEdicao.conteudo?.length || 0} caracteres
                </span>
              </div>

              {/* Plano Terapêutico e Próximos Passos */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-forest/80 block">
                  Plano Terapêutico / Próximos Passos / Encaminhamentos:
                </label>
                <textarea
                  rows={3}
                  placeholder="Objetivos para a próxima sessão, tarefas entre sessões acordadas, hipóteses diagnósticas ou encaminhamentos a médicos/psiquiatras..."
                  value={registroEmEdicao.planoTerapeutico || ""}
                  onChange={(e) =>
                    setRegistroEmEdicao({ ...registroEmEdicao, planoTerapeutico: e.target.value })
                  }
                  className="w-full text-xs sm:text-sm bg-warm/15 border border-soft rounded-2xl p-3 text-forest leading-relaxed focus:outline-none focus:border-emerald-600 resize-y"
                />
              </div>

              {/* Footer de Ação do Form */}
              <div className="flex items-center justify-between pt-2 border-t border-soft flex-wrap gap-2">
                <div className="text-[11px] text-forest/60">
                  Responsável:{" "}
                  <strong>
                    {registroEmEdicao.profissionalNome || profissionalLogado?.nome || "Profissional"}
                  </strong>{" "}
                  {registroEmEdicao.profissionalCrp && `(CRP: ${registroEmEdicao.profissionalCrp})`}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setRegistroEmEdicao(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-forest/70 hover:text-forest bg-warm/50 hover:bg-warm rounded-xl transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSalvarEdicao}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Salvar no Prontuário
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* TIMELINE / LISTA DE REGISTROS DO PRONTUÁRIO             */
            /* ======================================================== */
            <div className="space-y-4">
              {/* Barra de Filtros e Busca */}
              <div className="bg-white p-3 rounded-2xl border border-soft shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-forest/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar anotações por palavra-chave, tema ou título..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 bg-warm/20 border border-soft rounded-xl text-forest focus:outline-none focus:border-forest/50"
                  />
                  {busca && (
                    <button
                      type="button"
                      onClick={() => setBusca("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-forest/40 hover:text-forest text-xs font-bold"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Filtro de Tipo */}
                  <select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                    className="text-xs bg-warm/30 border border-soft rounded-xl px-2.5 py-2 font-medium text-forest focus:outline-none cursor-pointer"
                  >
                    <option value="todos">Todos os Tipos</option>
                    <option value="evolucao">Evoluções Clínicas</option>
                    <option value="anamnese">Anamnese</option>
                    <option value="encaminhamento">Encaminhamentos</option>
                    <option value="supervisao">Supervisões</option>
                    <option value="parecer">Pareceres</option>
                    <option value="encerramento">Altas / Encerramentos</option>
                  </select>

                  {/* Filtro de Vínculo */}
                  <select
                    value={filtroVinculo}
                    onChange={(e) => setFiltroVinculo(e.target.value as any)}
                    className="text-xs bg-warm/30 border border-soft rounded-xl px-2.5 py-2 font-medium text-forest focus:outline-none cursor-pointer"
                  >
                    <option value="todos">Todos os Vínculos</option>
                    <option value="com_sessao">Com Sessão Faturamento</option>
                    <option value="avulso">Registros Avulsos</option>
                  </select>

                  {/* Ordenação */}
                  <button
                    type="button"
                    onClick={() => setOrdemCrescente(!ordemCrescente)}
                    className="text-xs font-medium text-forest/70 hover:text-forest bg-warm/30 border border-soft px-2.5 py-2 rounded-xl transition-colors cursor-pointer"
                    title={ordemCrescente ? "Mais antigas primeiro" : "Mais recentes primeiro"}
                  >
                    {ordemCrescente ? "↑ Mais Antigas" : "↓ Mais Recentes"}
                  </button>
                </div>
              </div>

              {/* Registros Encontrados */}
              {registrosFiltrados.length === 0 ? (
                <div className="bg-white rounded-2xl border border-soft p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-warm/60 text-forest/50 flex items-center justify-center mx-auto">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-forest text-sm">
                    {registros.length === 0
                      ? "Nenhum registro clínico cadastrado ainda"
                      : "Nenhum registro corresponde aos filtros selecionados"}
                  </h4>
                  <p className="text-xs text-forest/60 max-w-md mx-auto">
                    {registros.length === 0
                      ? "O prontuário organiza todas as evoluções clínicas, temas abordados e amarrações com as sessões lançadas no faturamento."
                      : "Tente limpar os termos de busca ou alterar os filtros de tipo de registro."}
                  </p>
                  {registros.length === 0 && (
                    <button
                      type="button"
                      onClick={() => handleNovoRegistro()}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 px-4 py-2 rounded-xl transition-colors shadow-sm cursor-pointer mt-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Registrar Primeira Evolução
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {registrosFiltrados.map((reg) => {
                    const tipoInfo = getTipoLabel(reg.tipoRegistro);
                    const sessaoVinculada = reg.sessaoFaturamentoId
                      ? sessoesMap.get(reg.sessaoFaturamentoId)
                      : null;

                    return (
                      <div
                        key={reg.id}
                        className="bg-white rounded-2xl border border-soft hover:border-emerald-300 p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all space-y-3"
                      >
                        {/* Header do Card de Registro */}
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Selo de Vínculo com Sessão */}
                            {reg.numeroSessao ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (onAbrirFaturamento) {
                                    onAbrirFaturamento(reg.sessaoFaturamentoId);
                                  }
                                }}
                                className="flex items-center gap-1 text-[11px] font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-lg transition-colors cursor-pointer"
                                title="Ver esta sessão no Faturamento"
                              >
                                <CreditCard className="w-3 h-3 text-emerald-700" />
                                <span>Sessão #{reg.numeroSessao}</span>
                                {sessaoVinculada?.statusAtendimento && (
                                  <span className="text-[10px] text-emerald-700/80">
                                    • {sessaoVinculada.statusAtendimento}
                                  </span>
                                )}
                              </button>
                            ) : (
                              <span className="text-[10px] font-semibold text-forest/60 bg-warm/40 px-2 py-0.5 rounded-md border border-soft">
                                Registro Avulso
                              </span>
                            )}

                            {/* Selo de Tipo */}
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border ${tipoInfo.color}`}
                            >
                              {tipoInfo.label}
                            </span>

                            {/* Data e Horário */}
                            <span className="text-[11px] font-medium text-forest/70 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-forest/50" />
                              {reg.dataSessao || reg.dataRegistro}
                              {reg.horario && (
                                <span className="text-forest/50"> às {reg.horario}</span>
                              )}
                            </span>

                            {/* Humor / Estado Geral */}
                            {reg.humorOuEstadoGeral && (
                              <span className="text-[10px] font-semibold text-forest/80 bg-warm/30 border border-soft px-2 py-0.5 rounded-md">
                                Estado: {reg.humorOuEstadoGeral}
                              </span>
                            )}
                          </div>

                          {/* Ações: Editar e Excluir */}
                          <div className="flex items-center gap-1 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={() => handleEditarRegistro(reg)}
                              className="p-1.5 text-forest/60 hover:text-forest hover:bg-warm/60 rounded-lg transition-colors cursor-pointer"
                              title="Editar esta anotação clínica"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setRegistroParaExcluir(reg)}
                              className="p-1.5 text-forest/40 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Excluir anotação"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Título do Registro */}
                        <h4 className="font-bold text-sm sm:text-base text-forest">
                          {reg.titulo}
                        </h4>

                        {/* Temas Abordados */}
                        {reg.temasAbordados && reg.temasAbordados.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {reg.temasAbordados.map((t) => (
                              <span
                                key={t}
                                className="text-[10px] font-semibold text-emerald-900 bg-emerald-50/80 border border-emerald-200/80 px-2 py-0.5 rounded-md"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Conteúdo / Evolução Clínica */}
                        <div className="bg-warm/15 rounded-xl p-3.5 border border-soft/80 text-xs sm:text-sm text-forest leading-relaxed whitespace-pre-wrap font-sans">
                          {reg.conteudo}
                        </div>

                        {/* Próximos Passos / Plano Terapêutico se preenchido */}
                        {reg.planoTerapeutico && (
                          <div className="bg-emerald-50/40 rounded-xl p-3 border border-emerald-200/60 text-xs space-y-1">
                            <span className="font-bold text-emerald-900 block flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-emerald-700" />
                              Plano Terapêutico & Próximos Passos:
                            </span>
                            <p className="text-emerald-950/80 leading-relaxed whitespace-pre-wrap">
                              {reg.planoTerapeutico}
                            </p>
                          </div>
                        )}

                        {/* Assinatura / Rodapé da Evolução */}
                        <div className="flex items-center justify-between text-[10px] text-forest/50 pt-1 border-t border-soft/50">
                          <span>
                            Registrado por: <strong>{reg.profissionalNome || "Profissional"}</strong>
                            {reg.profissionalCrp && ` • CRP: ${reg.profissionalCrp}`}
                          </span>
                          <span>Atualizado em: {new Date(reg.updatedAt || reg.createdAt).toLocaleDateString("pt-BR")}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="p-3 sm:p-4 border-t border-soft bg-warm/30 flex items-center justify-between flex-wrap gap-2 text-xs text-forest/70 shrink-0">
          <div className="flex items-center gap-2 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>
              Documento confidencial sob guarda do profissional responsável em cumprimento às normas éticas vigentes.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-forest bg-white hover:bg-warm border border-soft rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            Fechar Prontuário
          </button>
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {registroParaExcluir && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-soft p-5 max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex items-center gap-2.5 text-rose-700 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>Confirmar Exclusão de Registro?</span>
            </div>
            <p className="text-xs text-forest/80 leading-relaxed">
              Você tem certeza que deseja excluir o registro clínico{" "}
              <strong>"{registroParaExcluir.titulo}"</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRegistroParaExcluir(null)}
                className="px-3 py-1.5 text-xs font-semibold text-forest/70 hover:text-forest bg-warm/40 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarExclusao}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Impressão / Laudo Completo */}
      {isPrintMode && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-soft shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-soft bg-warm/20 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-800" />
                <h4 className="font-bold text-forest text-sm sm:text-base">
                  Visualização para Impressão / Prontuário Clínico
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl cursor-pointer"
                >
                  Imprimir Agora
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintMode(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-forest bg-warm/40 hover:bg-warm rounded-xl cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="p-6 sm:p-10 overflow-y-auto flex-1 font-serif text-forest space-y-6 print:p-0">
              {/* Cabeçalho do Laudo / Prontuário */}
              <div className="border-b-2 border-forest/30 pb-4 text-center space-y-1">
                <h2 className="text-xl font-bold tracking-wide uppercase text-forest">
                  Elo Soluções Humanas
                </h2>
                <p className="text-xs text-forest/70 font-sans uppercase tracking-widest">
                  Prontuário Psicológico & Relatório de Atendimentos
                </p>
              </div>

              {/* Dados do Paciente e Profissional */}
              <div className="grid grid-cols-2 gap-4 text-xs font-sans bg-warm/20 p-4 rounded-xl border border-soft">
                <div>
                  <p><strong>Paciente:</strong> {pacienteNome}</p>
                  {pacienteCpf && <p><strong>CPF:</strong> {pacienteCpf}</p>}
                  {pacienteDataNascimento && <p><strong>Nascimento:</strong> {pacienteDataNascimento}</p>}
                </div>
                <div>
                  <p><strong>Profissional:</strong> {profissionalLogado?.nome || profissionalLogado?.name || "Psicólogo(a) Responsável"}</p>
                  {profissionalLogado?.crp && <p><strong>Registro Profissional:</strong> CRP {profissionalLogado.crp}</p>}
                  <p><strong>Emissão:</strong> {new Date().toLocaleDateString("pt-BR")}</p>
                </div>
              </div>

              {/* Listagem Cronológica das Evoluções */}
              <div className="space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-forest border-b border-soft pb-1 font-sans">
                  Histórico Cronológico de Registros ({registrosFiltrados.length})
                </h3>

                {registrosFiltrados.map((reg, idx) => (
                  <div key={reg.id} className="space-y-2 border-b border-soft/70 pb-4">
                    <div className="flex items-center justify-between text-xs font-sans font-bold">
                      <span className="text-emerald-900">
                        {idx + 1}. {reg.titulo} {reg.numeroSessao ? `(Sessão #${reg.numeroSessao})` : ""}
                      </span>
                      <span className="text-forest/60">
                        Data: {reg.dataSessao || reg.dataRegistro} {reg.horario && `às ${reg.horario}`}
                      </span>
                    </div>

                    <div className="text-xs leading-relaxed font-sans whitespace-pre-wrap text-forest/90 pl-3 border-l-2 border-forest/20">
                      {reg.conteudo}
                    </div>

                    {reg.planoTerapeutico && (
                      <p className="text-[11px] font-sans text-forest/70 pl-3 italic">
                        <strong>Próximos passos / Plano:</strong> {reg.planoTerapeutico}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Assinatura */}
              <div className="pt-12 text-center text-xs font-sans space-y-1">
                <div className="w-64 border-t border-forest/40 mx-auto mb-1"></div>
                <p className="font-bold">{profissionalLogado?.nome || profissionalLogado?.name || "Psicólogo(a) Responsável"}</p>
                {profissionalLogado?.crp && <p className="text-forest/70">CRP {profissionalLogado.crp}</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
