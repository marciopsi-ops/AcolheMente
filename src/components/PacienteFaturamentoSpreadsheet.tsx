import React, { useState, useMemo, useEffect } from "react";
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Copy,
  FileText,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  Printer,
  ChevronDown,
  Layers,
  Sparkles,
  Send,
  X,
  User,
  Globe,
  Building,
  Building2,
  Settings,
  Check,
  FileSpreadsheet,
  BookOpen,
} from "lucide-react";

export interface SessaoFaturamentoItem {
  id: string;
  numeroSessao: number;
  data: string; // YYYY-MM-DD
  horario?: string; // HH:MM
  modalidade: "online" | "presencial";
  statusAtendimento: "realizada" | "agendada" | "desmarcada_antecedencia" | "falta_sem_aviso";
  valor: number;
  statusPagamento: "pago" | "pendente";
  dataPagamento?: string;
  formaPagamento?: "Pix" | "Cartão" | "Transferência" | "Dinheiro" | "Outro";
  observacoes?: string;
}

export interface DadosPessoaJuridica {
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpj?: string;
  inscricaoMunicipal?: string;
  chavePixPJ?: string;
  enderecoPJ?: string;
  cnae?: string;
}

export interface ProfissionalLogadoFaturamento {
  uid?: string;
  name?: string;
  nome?: string;
  crp?: string;
  cpf?: string;
  especialidade?: string;
  papelOuFuncao?: string;
  chavePix?: string;
  email?: string;
  telefone?: string;
  dadosPJ?: DadosPessoaJuridica;
  faturamentoPadrao?: "PF" | "PJ";
}

export interface PacienteFaturamentoSpreadsheetProps {
  pacienteId: string;
  pacienteNome: string;
  pacienteCpf?: string;
  pacienteTelefone?: string;
  pacienteEmail?: string;
  valorSessaoPadrao?: string | number;
  frequenciaPadrao?: string;
  sessoes?: SessaoFaturamentoItem[];
  onSaveSessoes: (novasSessoes: SessaoFaturamentoItem[]) => Promise<void> | void;
  perfilFaturamento?: "PF" | "PJ";
  onUpdatePerfilFaturamento?: (novoPerfil: "PF" | "PJ") => Promise<void> | void;
  onSaveDadosPJ?: (dadosPJ: DadosPessoaJuridica) => Promise<void> | void;
  profissionalLogado?: ProfissionalLogadoFaturamento;
  showToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
  isCorporativo?: boolean;
  empresaNome?: string;
  registrosProntuario?: {
    id: string;
    sessaoFaturamentoId?: string;
    numeroSessao?: number;
    titulo?: string;
  }[];
  onAbrirProntuarioModal?: (sessaoId?: string) => void;
}

export const PacienteFaturamentoSpreadsheet: React.FC<PacienteFaturamentoSpreadsheetProps> = ({
  pacienteId,
  pacienteNome,
  pacienteCpf = "",
  pacienteTelefone = "",
  pacienteEmail = "",
  valorSessaoPadrao = "100",
  frequenciaPadrao = "Semanal",
  sessoes = [],
  onSaveSessoes,
  perfilFaturamento = "PF",
  onUpdatePerfilFaturamento,
  onSaveDadosPJ,
  profissionalLogado,
  showToast,
  isCorporativo = false,
  empresaNome = "",
  registrosProntuario = [],
  onAbrirProntuarioModal,
}) => {
  // Parse numeric base session value
  const parseValorNumerico = (v: any): number => {
    if (!v) return 100;
    if (typeof v === "number") return v;
    const str = String(v).replace("R$", "").trim();
    const matches = str.match(/(\d+[\d.,]*)/);
    if (!matches) return 100;
    let clean = matches[0];
    if (clean.includes(",") && clean.includes(".")) {
      clean = clean.replace(/\./g, "").replace(",", ".");
    } else if (clean.includes(",")) {
      clean = clean.replace(",", ".");
    }
    const val = parseFloat(clean);
    return isNaN(val) ? 100 : val;
  };

  const valorBase = useMemo(() => parseValorNumerico(valorSessaoPadrao), [valorSessaoPadrao]);

  // Filtro de Competência / Período
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }, []);

  const [filtroPeriodo, setFiltroPeriodo] = useState<string>("todas"); // 'todas', '2026-10', 'custom'
  const [dataInicioCustom, setDataInicioCustom] = useState<string>("");
  const [dataFimCustom, setDataFimCustom] = useState<string>("");

  // Estado local com sincronização para reatividade instantânea
  const [itensSessoes, setItensSessoes] = useState<SessaoFaturamentoItem[]>(sessoes || []);

  useEffect(() => {
    if (Array.isArray(sessoes)) {
      setItensSessoes(sessoes);
    }
  }, [sessoes]);

  // Estado para exclusão segura in-app (sem window.confirm bloqueado por sandbox de iframes)
  const [sessaoParaExcluir, setSessaoParaExcluir] = useState<SessaoFaturamentoItem | null>(null);
  const [isExcluindo, setIsExcluindo] = useState<boolean>(false);

  // Perfil de faturamento fixado para este paciente ("PF" ou "PJ")
  const [perfilAtivo, setPerfilAtivo] = useState<"PF" | "PJ">(perfilFaturamento || profissionalLogado?.faturamentoPadrao || "PF");

  useEffect(() => {
    if (perfilFaturamento) {
      setPerfilAtivo(perfilFaturamento);
    }
  }, [perfilFaturamento]);

  // Dados de Pessoa Jurídica (PJ) do profissional
  const [dadosPJ, setDadosPJ] = useState<DadosPessoaJuridica>(profissionalLogado?.dadosPJ || {});

  useEffect(() => {
    if (profissionalLogado?.dadosPJ) {
      setDadosPJ(profissionalLogado.dadosPJ);
      setFormPJ(profissionalLogado.dadosPJ);
    }
  }, [profissionalLogado?.dadosPJ]);

  // Modais de alternância e de configuração da PJ
  const [modalAlterarPerfil, setModalAlterarPerfil] = useState<boolean>(false);
  const [modalConfigurarPJ, setModalConfigurarPJ] = useState<boolean>(false);
  const [salvandoPJ, setSalvandoPJ] = useState<boolean>(false);
  const [formPJ, setFormPJ] = useState<DadosPessoaJuridica>({
    razaoSocial: profissionalLogado?.dadosPJ?.razaoSocial || "",
    nomeFantasia: profissionalLogado?.dadosPJ?.nomeFantasia || "",
    cnpj: profissionalLogado?.dadosPJ?.cnpj || "",
    inscricaoMunicipal: profissionalLogado?.dadosPJ?.inscricaoMunicipal || "",
    chavePixPJ: profissionalLogado?.dadosPJ?.chavePixPJ || "",
    enderecoPJ: profissionalLogado?.dadosPJ?.enderecoPJ || "",
    cnae: profissionalLogado?.dadosPJ?.cnae || "8650-0/03",
  });

  // AÇÃO: Alternar perfil de faturamento do paciente (PF vs PJ)
  const handleTrocarPerfilPaciente = async (novoPerfil: "PF" | "PJ") => {
    try {
      setPerfilAtivo(novoPerfil);
      if (onUpdatePerfilFaturamento) {
        await onUpdatePerfilFaturamento(novoPerfil);
      }
      showToast(
        `Modalidade de faturamento fixada em ${novoPerfil === "PJ" ? "Pessoa Jurídica (PJ)" : "Pessoa Física (PF)"}!`,
        "success"
      );
      setModalAlterarPerfil(false);
    } catch (err) {
      console.error("Erro ao alterar modalidade de faturamento:", err);
      showToast("Erro ao salvar modalidade de faturamento.", "error");
    }
  };

  // AÇÃO: Salvar dados da Pessoa Jurídica do profissional
  const handleSalvarDadosPJ = async () => {
    if (!formPJ.razaoSocial?.trim() && !formPJ.cnpj?.trim()) {
      showToast("Por favor, preencha ao menos a Razão Social ou CNPJ da empresa.", "info");
      return;
    }
    try {
      setSalvandoPJ(true);
      setDadosPJ(formPJ);
      if (onSaveDadosPJ) {
        await onSaveDadosPJ(formPJ);
      }
      showToast("Dados da Pessoa Jurídica salvos com sucesso!", "success");
      setModalConfigurarPJ(false);
    } catch (err) {
      console.error("Erro ao salvar dados da PJ:", err);
      showToast("Erro ao salvar dados da PJ.", "error");
    } finally {
      setSalvandoPJ(false);
    }
  };

  // Modais de Documentos e Ações
  const [modalRecibo, setModalRecibo] = useState<{
    isOpen: boolean;
    sessao?: SessaoFaturamentoItem;
    isConsolidado?: boolean;
  }>({ isOpen: false });

  const [modalNf, setModalNf] = useState<boolean>(false);
  const [modalCarneLeao, setModalCarneLeao] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Identificação profissional dinâmica (Psicólogo vs Terapeuta / Psicanalista)
  const profNome = profissionalLogado?.name || profissionalLogado?.nome || "Profissional Responsável";
  const profCrp = profissionalLogado?.crp || "";
  const profCpf = profissionalLogado?.cpf || "";
  const isPsicologo = Boolean(profCrp && profCrp.trim().length > 2);
  const profTitulo = isPsicologo ? "Psicólogo(a) Clínico(a)" : (profissionalLogado?.especialidade || "Terapeuta / Psicanalista");

  // Sessões Filtradas pelo Período Selecionado
  const sessoesFiltradas = useMemo(() => {
    return itensSessoes.filter((s) => {
      if (filtroPeriodo === "todas") return true;
      if (filtroPeriodo === "custom") {
        if (dataInicioCustom && s.data < dataInicioCustom) return false;
        if (dataFimCustom && s.data > dataFimCustom) return false;
        return true;
      }
      // Se for formato YYYY-MM
      return s.data.startsWith(filtroPeriodo);
    }).sort((a, b) => (a.data > b.data ? 1 : -1));
  }, [itensSessoes, filtroPeriodo, dataInicioCustom, dataFimCustom]);

  // Lista única de competências (meses presentes nas sessões para o select)
  const mesesDisponiveis = useMemo(() => {
    const setMeses = new Set<string>();
    setMeses.add(currentMonthStr);
    itensSessoes.forEach((s) => {
      if (s.data && s.data.length >= 7) {
        setMeses.add(s.data.substring(0, 7));
      }
    });
    return Array.from(setMeses).sort().reverse();
  }, [itensSessoes, currentMonthStr]);

  // Métricas Consolidadas do Período
  const metricas = useMemo(() => {
    let realizadas = 0;
    let agendadas = 0;
    let faltas = 0;
    let totalPago = 0;
    let totalPendente = 0;
    let totalGeral = 0;

    sessoesFiltradas.forEach((s) => {
      const v = Number(s.valor) || 0;
      totalGeral += v;
      if (s.statusAtendimento === "realizada") realizadas++;
      if (s.statusAtendimento === "agendada") agendadas++;
      if (s.statusAtendimento === "falta_sem_aviso") faltas++;

      if (s.statusPagamento === "pago") {
        totalPago += v;
      } else {
        totalPendente += v;
      }
    });

    return {
      realizadas,
      agendadas,
      faltas,
      totalPago,
      totalPendente,
      totalGeral,
      qtdTotal: sessoesFiltradas.length,
    };
  }, [sessoesFiltradas]);

  // AÇÃO: Adicionar Nova Sessão
  const handleAdicionarSessao = async () => {
    const hojeStr = new Date().toISOString().split("T")[0];
    const novoNumero = itensSessoes.length > 0 ? Math.max(...itensSessoes.map((s) => s.numeroSessao || 0)) + 1 : 1;

    const novaSessao: SessaoFaturamentoItem = {
      id: `sess-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      numeroSessao: novoNumero,
      data: hojeStr,
      horario: "14:00",
      modalidade: "online",
      statusAtendimento: "realizada",
      valor: valorBase,
      statusPagamento: "pendente",
      formaPagamento: "Pix",
      observacoes: "",
    };

    const atualizadas = [...itensSessoes, novaSessao];
    setItensSessoes(atualizadas);
    try {
      await onSaveSessoes(atualizadas);
      showToast(`Sessão #${novoNumero} adicionada!`, "success");
    } catch (err) {
      console.error("Erro ao salvar nova sessão:", err);
      showToast("Erro ao adicionar sessão.", "error");
    }
  };

  // AÇÃO: Replicar / Duplicar Sessão Existente (+7 dias sugerido)
  const handleDuplicarSessao = async (sessaoOrigem: SessaoFaturamentoItem) => {
    let novaData = sessaoOrigem.data;
    try {
      if (sessaoOrigem.data) {
        const [ano, mes, dia] = sessaoOrigem.data.split("-").map(Number);
        const dataObj = new Date(ano, mes - 1, dia);
        dataObj.setDate(dataObj.getDate() + 7); // soma 7 dias (próxima semana)
        const anoNovo = dataObj.getFullYear();
        const mesNovo = String(dataObj.getMonth() + 1).padStart(2, "0");
        const diaNovo = String(dataObj.getDate()).padStart(2, "0");
        novaData = `${anoNovo}-${mesNovo}-${diaNovo}`;
      }
    } catch {
      novaData = new Date().toISOString().split("T")[0];
    }

    const novoNumero = itensSessoes.length > 0 ? Math.max(...itensSessoes.map((s) => s.numeroSessao || 0)) + 1 : 1;

    const novaSessao: SessaoFaturamentoItem = {
      id: `sess-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      numeroSessao: novoNumero,
      data: novaData,
      horario: sessaoOrigem.horario || "14:00",
      modalidade: sessaoOrigem.modalidade || "online",
      statusAtendimento: "agendada",
      valor: sessaoOrigem.valor,
      statusPagamento: "pendente",
      formaPagamento: sessaoOrigem.formaPagamento || "Pix",
      observacoes: sessaoOrigem.observacoes ? `Replicado de #${sessaoOrigem.numeroSessao}` : "",
    };

    const atualizadas = [...itensSessoes, novaSessao];
    setItensSessoes(atualizadas);
    try {
      await onSaveSessoes(atualizadas);
      showToast(`Sessão duplicada com sucesso para ${novaData.split("-").reverse().join("/")}!`, "success");
    } catch (err) {
      console.error("Erro ao salvar sessão duplicada:", err);
      showToast("Erro ao duplicar sessão.", "error");
    }
  };

  // AÇÃO: Atualizar campo pontual da sessão na planilha
  const handleUpdateItem = async (id: string, campo: keyof SessaoFaturamentoItem, valor: any) => {
    const atualizadas = itensSessoes.map((s) => {
      if (s.id !== id) return s;
      const updated = { ...s, [campo]: valor };
      if (campo === "statusPagamento" && valor === "pago" && !updated.dataPagamento) {
        updated.dataPagamento = new Date().toISOString().split("T")[0];
      }
      return updated;
    });
    setItensSessoes(atualizadas);
    try {
      await onSaveSessoes(atualizadas);
    } catch (err) {
      console.error("Erro ao atualizar item da sessão:", err);
    }
  };

  // AÇÃO: Iniciar exclusão de sessão (abre modal in-app confiável)
  const handleSolicitarExclusao = (sessao: SessaoFaturamentoItem) => {
    setSessaoParaExcluir(sessao);
  };

  // AÇÃO: Confirmar e Efetivar a exclusão da sessão
  const handleConfirmarExclusao = async () => {
    if (!sessaoParaExcluir) return;
    const { id, numeroSessao } = sessaoParaExcluir;

    try {
      setIsExcluindo(true);
      // Remove correspondência segura por id ou por número
      const atualizadas = itensSessoes.filter((s) => {
        if (id && s.id) {
          return s.id !== id;
        }
        return s.numeroSessao !== numeroSessao;
      });

      setItensSessoes(atualizadas);
      await onSaveSessoes(atualizadas);
      showToast(`Sessão #${numeroSessao} excluída com sucesso.`, "info");
      setSessaoParaExcluir(null);
    } catch (err) {
      console.error("Erro ao excluir sessão:", err);
      showToast("Erro ao excluir sessão.", "error");
    } finally {
      setIsExcluindo(false);
    }
  };

  // Utilitário de Cópia com Feedback
  const handleCopyText = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(`${label} copiado para a área de transferência!`, "success");
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Formatador de Moeda
  const fmtMoeda = (val: number) =>
    `R$ ${Number(val || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Formatador de Data BR
  const fmtDataBr = (strDate: string) => {
    if (!strDate) return "-";
    const parts = strDate.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return strDate;
  };

  // Formatador de Mês por extenso (ex: 2026-10 -> Outubro/2026)
  const fmtMesExtenso = (strAnoMes: string) => {
    if (!strAnoMes || strAnoMes === "todas" || strAnoMes === "custom") return strAnoMes;
    const [ano, mes] = strAnoMes.split("-");
    const meses = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    const idx = parseInt(mes, 10) - 1;
    return `${meses[idx] || mes} de ${ano}`;
  };

  // Mensagem de Fechamento para WhatsApp
  const gerarTextoFechamentoWhatsApp = () => {
    const sessoesFinalizadas = sessoesFiltradas.filter((s) => s.statusAtendimento === "realizada");
    const datas = sessoesFinalizadas.map((s) => fmtDataBr(s.data)).join(", ");
    const periodoTxt = filtroPeriodo === "todas" ? "Período Geral" : fmtMesExtenso(filtroPeriodo);

    let txt = `Olá, *${pacienteNome.split(" ")[0]}*! Tudo bem? 🌿\n\n`;
    txt += `Passando para compartilhar o fechamento dos atendimentos clínicos (*${periodoTxt}*):\n\n`;
    txt += `• *Sessões Realizadas:* ${metricas.realizadas}\n`;
    if (datas) txt += `• *Datas:* ${datas}\n`;
    txt += `• *Valor Total:* ${fmtMoeda(metricas.totalGeral)}\n`;
    txt += `• *Status:* ${metricas.totalPendente <= 0 ? "✅ Totalmente Quitado" : `Pendente: ${fmtMoeda(metricas.totalPendente)}`}\n\n`;

    const pixAtivo = perfilAtivo === "PJ"
      ? (dadosPJ.chavePixPJ || profissionalLogado?.chavePix)
      : profissionalLogado?.chavePix;

    const titularPix = perfilAtivo === "PJ"
      ? (dadosPJ.razaoSocial || dadosPJ.nomeFantasia || profNome)
      : profNome;

    if (pixAtivo && metricas.totalPendente > 0) {
      txt += `💳 *Chave Pix para Regularização (${perfilAtivo === "PJ" ? "Conta Jurídica da Empresa" : "Conta Pessoal"}):*\n${pixAtivo}\n`;
      if (titularPix) txt += `• *Favorecido:* ${titularPix}\n`;
      txt += `\n`;
    }

    txt += `Caso necessite de recibo individual ou consolidado para reembolso/declaração, estou à disposição!\n`;
    txt += `Atenciosamente,\n*${profNome}*${profCrp ? ` (CRP: ${profCrp})` : ""}`;
    if (perfilAtivo === "PJ" && (dadosPJ.razaoSocial || dadosPJ.nomeFantasia)) {
      txt += `\n_${dadosPJ.razaoSocial || dadosPJ.nomeFantasia}_`;
    }
    return txt;
  };

  // Texto da Discriminação de Serviços para Nota Fiscal (NFS-e)
  const gerarDiscriminacaoNf = () => {
    const sessoesFinalizadas = sessoesFiltradas.filter((s) => s.statusAtendimento === "realizada");
    const datas = sessoesFinalizadas.map((s) => fmtDataBr(s.data)).join(", ");
    const modalidades = Array.from(new Set(sessoesFinalizadas.map((s) => s.modalidade === "online" ? "modalidade online" : "modalidade presencial"))).join(" e ");

    const tipoServico = isPsicologo ? "atendimento psicológico / psicoterapia" : "atendimento terapêutico / psicanalítico";

    let desc = `Prestação de serviços de ${tipoServico} (${modalidades || "modalidade online"}), `;
    desc += `referente a ${sessoesFinalizadas.length} sessão(ões) realizada(s) nos dias: ${datas || "conforme prontuário"}. `;
    desc += `Tomador/Paciente: ${pacienteNome} (CPF: ${pacienteCpf || "Não informado"}). `;
    if (perfilAtivo === "PJ" && dadosPJ.razaoSocial) {
      desc += `Prestador: ${dadosPJ.razaoSocial} (CNPJ: ${dadosPJ.cnpj || "Não informado"}). `;
      desc += `Profissional Responsável Técnico: ${profNome}${profCrp ? ` (CRP: ${profCrp})` : ""}. `;
    } else {
      desc += `Profissional Autônomo: ${profNome}${profCrp ? ` (CRP: ${profCrp})` : ""}. `;
    }
    desc += `Valor total: ${fmtMoeda(metricas.totalGeral)}.`;
    return desc;
  };

  return (
    <div className="bg-white rounded-2xl border border-emerald-200/90 shadow-sm overflow-hidden space-y-0">
      {/* 1. TOPO: TÍTULO, SUBTÍTULO E CONTROLES DE COMPETÊNCIA (COMPACTO, ALINHADO & OTIMIZADO VERTICALMENTE) */}
      <div className="px-3.5 py-2 sm:px-4 bg-gradient-to-r from-emerald-50/80 via-warm/20 to-emerald-50/60 border-b border-soft flex flex-wrap items-center justify-between gap-2">
        {/* Esquerda: Ícone + Título + Badges em linha única */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-2xs shrink-0">
            <DollarSign className="w-3.5 h-3.5 text-sun" />
          </div>
          <h4 className="text-xs sm:text-sm font-bold text-forest uppercase tracking-wider whitespace-nowrap">
            Faturamento & Sessões
          </h4>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100/90 text-emerald-800 border border-emerald-300/80 whitespace-nowrap">
            Tomador: PF
          </span>

          {/* BADGE COMPACTO: PERFIL DE FATURAMENTO FIXADO PARA ESTE PACIENTE (PF vs PJ) */}
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border shadow-2xs bg-white border-soft whitespace-nowrap">
            <span className="text-[9px] text-forest/50 uppercase font-bold tracking-wider">
              Emissão:
            </span>
            {perfilAtivo === "PJ" ? (
              <span className="flex items-center gap-1 font-bold text-blue-900">
                <Building2 className="w-3 h-3 text-blue-700 shrink-0" />
                <span>PJ</span>
                {dadosPJ.cnpj ? (
                  <span className="text-[9px] font-mono text-blue-800/80 font-normal">
                    ({dadosPJ.cnpj})
                  </span>
                ) : (
                  <span className="text-[9px] text-amber-600 font-normal">
                    (Sem CNPJ)
                  </span>
                )}
              </span>
            ) : (
              <span className="flex items-center gap-1 font-bold text-emerald-900">
                <User className="w-3 h-3 text-emerald-700 shrink-0" />
                <span>PF</span>
                {profCpf && (
                  <span className="text-[9px] font-mono text-emerald-800/80 font-normal">
                    ({profCpf})
                  </span>
                )}
              </span>
            )}
            <button
              type="button"
              onClick={() => setModalAlterarPerfil(true)}
              className="ml-0.5 text-[9px] font-bold text-forest hover:text-emerald-700 underline cursor-pointer"
              title="Alterar modalidade de emissão deste paciente (PF vs PJ)"
            >
              Alterar
            </button>
          </div>
        </div>

        {/* Direita: Filtro de Competência & Botão Nova Sessão alinhados */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0">
          <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-soft shadow-2xs text-xs">
            <Calendar className="w-3.5 h-3.5 text-forest/60 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-forest/60 hidden sm:inline">Competência:</span>
            <select
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value)}
              className="bg-transparent font-bold text-xs text-forest outline-none cursor-pointer"
            >
              <option value="todas">Todas ({itensSessoes.length})</option>
              {mesesDisponiveis.map((m) => (
                <option key={m} value={m}>
                  {fmtMesExtenso(m)} {m === currentMonthStr ? "• Atual" : ""}
                </option>
              ))}
              <option value="custom">Personalizado...</option>
            </select>
          </div>

          {filtroPeriodo === "custom" && (
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-soft text-xs shadow-2xs">
              <input
                type="date"
                value={dataInicioCustom}
                onChange={(e) => setDataInicioCustom(e.target.value)}
                className="text-[11px] font-mono text-forest px-1 py-0.5 bg-transparent outline-none"
              />
              <span className="text-forest/40 text-[10px]">até</span>
              <input
                type="date"
                value={dataFimCustom}
                onChange={(e) => setDataFimCustom(e.target.value)}
                className="text-[11px] font-mono text-forest px-1 py-0.5 bg-transparent outline-none"
              />
            </div>
          )}

          {onAbrirProntuarioModal && (
            <button
              type="button"
              onClick={() => onAbrirProntuarioModal()}
              className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-white hover:bg-emerald-50 text-emerald-900 border border-soft hover:border-emerald-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap"
              title="Abrir o Prontuário Clínico e anotações deste paciente"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden sm:inline">Prontuário Clínico</span>
              <span className="sm:hidden">Prontuário</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleAdicionarSessao}
            className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 text-sun" />
            <span>+ Nova Sessão</span>
          </button>
        </div>
      </div>

      {/* 2. CARDS RESUMO / MÉTRICAS DO PERÍODO SELECIONADO */}
      <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 bg-warm/15 border-b border-soft grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <div className="bg-white p-2.5 rounded-xl border border-soft shadow-2xs">
          <div className="flex items-center justify-between text-forest/60 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Sessões Realizadas</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-base sm:text-lg font-extrabold text-forest">
            {metricas.realizadas}{" "}
            <span className="text-[11px] font-normal text-forest/60">de {metricas.qtdTotal} total</span>
          </div>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-soft shadow-2xs">
          <div className="flex items-center justify-between text-forest/60 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Quitado</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-base sm:text-lg font-extrabold text-emerald-700 font-serif">
            {fmtMoeda(metricas.totalPago)}
          </div>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-soft shadow-2xs">
          <div className="flex items-center justify-between text-forest/60 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Pendente Recebimento</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className={`text-base sm:text-lg font-extrabold font-serif ${metricas.totalPendente > 0 ? "text-amber-700" : "text-forest/60"}`}>
            {fmtMoeda(metricas.totalPendente)}
          </div>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-soft shadow-2xs">
          <div className="flex items-center justify-between text-forest/60 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Faturamento Período</span>
            <Layers className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-base sm:text-lg font-extrabold text-forest font-serif">
            {fmtMoeda(metricas.totalGeral)}
          </div>
        </div>
      </div>

      {/* 3. BARRA DE ATALHOS RÁPIDOS DE EMISSÃO & INTEGRAÇÕES */}
      <div className="px-4 sm:px-5 py-3 bg-white border-b border-soft flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Botão: Recibo Consolidado do Período */}
          <button
            type="button"
            disabled={sessoesFiltradas.length === 0}
            onClick={() => setModalRecibo({ isOpen: true, isConsolidado: true })}
            className="px-3 py-1.5 bg-warm hover:bg-forest hover:text-white text-forest font-semibold rounded-xl border border-soft transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
            title="Gerar recibo unificado contendo todas as sessões filtradas"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Recibo Consolidado ({sessoesFiltradas.length})</span>
          </button>

          {/* Botão: Espelho para Nota Fiscal (NFS-e) */}
          <button
            type="button"
            disabled={sessoesFiltradas.length === 0}
            onClick={() => setModalNf(true)}
            className="px-3 py-1.5 bg-warm hover:bg-emerald-700 hover:text-white text-forest font-semibold rounded-xl border border-soft transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
            title="Copiar dados formatados para emissão de Nota Fiscal no portal da prefeitura"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Espelho NFS-e</span>
          </button>

          {/* Botão: Receita Saúde / Carnê-Leão (e-CAC) */}
          <button
            type="button"
            onClick={() => setModalCarneLeao(true)}
            className="px-3 py-1.5 bg-warm hover:bg-blue-700 hover:text-white text-forest font-semibold rounded-xl border border-soft transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Dados formatados e atalho oficial do Carnê-Leão Web da Receita Federal"
          >
            <Building className="w-3.5 h-3.5 text-blue-600" />
            <span>Receita Saúde (e-CAC)</span>
          </button>
        </div>

        {/* Botão Enviar Fechamento WhatsApp */}
        <button
          type="button"
          disabled={sessoesFiltradas.length === 0}
          onClick={() => {
            const texto = gerarTextoFechamentoWhatsApp();
            const phoneClean = (pacienteTelefone || "").replace(/\D/g, "");
            const url = phoneClean
              ? `https://wa.me/55${phoneClean}?text=${encodeURIComponent(texto)}`
              : `https://wa.me/?text=${encodeURIComponent(texto)}`;
            window.open(url, "_blank");
            showToast("Fechamento aberto no WhatsApp!", "success");
          }}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
          title="Disparar resumo de fechamento e dados de pagamento para o WhatsApp do paciente"
        >
          <Send className="w-3.5 h-3.5 text-sun" />
          <span>Enviar Fechamento no WhatsApp</span>
        </button>
      </div>

      {/* 4. TABELA / SPREADSHEET DE SESSÕES */}
      <div className="overflow-x-auto">
        {sessoesFiltradas.length === 0 ? (
          <div className="p-8 text-center text-forest/60 space-y-2">
            <Calendar className="w-8 h-8 text-forest/30 mx-auto" />
            <p className="text-sm font-semibold">Nenhuma sessão registrada neste período.</p>
            <p className="text-xs text-forest/50">
              Clique em <strong className="text-forest">+ Nova Sessão</strong> para começar o controle financeiro deste paciente.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-warm/40 text-[10px] font-bold uppercase tracking-wider text-forest/70 border-b border-soft">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3 min-w-[110px]">Data</th>
                <th className="py-2.5 px-3 min-w-[100px]">Modalidade</th>
                <th className="py-2.5 px-3 min-w-[125px]">Status Atendimento</th>
                <th className="py-2.5 px-3 min-w-[95px]">Valor (R$)</th>
                <th className="py-2.5 px-3 min-w-[110px]">Pagamento</th>
                <th className="py-2.5 px-3 min-w-[105px]">Forma</th>
                <th className="py-2.5 px-3 text-right min-w-[130px]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-soft/60">
              {sessoesFiltradas.map((sessao) => (
                <tr key={sessao.id} className="hover:bg-warm/30 transition-colors">
                  {/* # Número */}
                  <td className="py-2 px-3 text-center font-bold text-forest/70 font-mono">
                    #{sessao.numeroSessao}
                  </td>

                  {/* Data */}
                  <td className="py-2 px-3">
                    <input
                      type="date"
                      value={sessao.data || ""}
                      onChange={(e) => handleUpdateItem(sessao.id, "data", e.target.value)}
                      className="bg-transparent font-medium text-xs text-forest px-1 py-0.5 rounded border border-transparent hover:border-soft focus:border-forest/40 focus:bg-white outline-none w-full"
                    />
                  </td>

                  {/* Modalidade (Online / Presencial) */}
                  <td className="py-2 px-3">
                    <select
                      value={sessao.modalidade || "online"}
                      onChange={(e) => handleUpdateItem(sessao.id, "modalidade", e.target.value)}
                      className={`text-[11px] font-bold px-2 py-1 rounded-lg border outline-none cursor-pointer ${
                        sessao.modalidade === "presencial"
                          ? "bg-purple-50 text-purple-900 border-purple-200"
                          : "bg-sky-50 text-sky-900 border-sky-200"
                      }`}
                    >
                      <option value="online">🌐 Online</option>
                      <option value="presencial">🏢 Presencial</option>
                    </select>
                  </td>

                  {/* Status do Atendimento */}
                  <td className="py-2 px-3">
                    <select
                      value={sessao.statusAtendimento || "realizada"}
                      onChange={(e) => handleUpdateItem(sessao.id, "statusAtendimento", e.target.value)}
                      className="bg-white text-[11px] font-medium text-forest px-2 py-1 rounded-lg border border-soft outline-none cursor-pointer w-full"
                    >
                      <option value="realizada">✅ Realizada</option>
                      <option value="agendada">⏰ Agendada</option>
                      <option value="desmarcada_antecedencia">↩️ Desmarcada (Aviso)</option>
                      <option value="falta_sem_aviso">⚠️ Falta sem aviso</option>
                    </select>
                  </td>

                  {/* Valor (R$) */}
                  <td className="py-2 px-3">
                    <div className="relative flex items-center">
                      <span className="text-[10px] text-forest/50 font-bold mr-1">R$</span>
                      <input
                        type="number"
                        step="5"
                        min="0"
                        value={sessao.valor || 0}
                        onChange={(e) => handleUpdateItem(sessao.id, "valor", parseFloat(e.target.value) || 0)}
                        className="bg-transparent font-bold text-xs text-forest px-1.5 py-0.5 rounded border border-transparent hover:border-soft focus:border-forest/40 focus:bg-white outline-none w-20"
                      />
                    </div>
                  </td>

                  {/* Status Pagamento */}
                  <td className="py-2 px-3">
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateItem(
                          sessao.id,
                          "statusPagamento",
                          sessao.statusPagamento === "pago" ? "pendente" : "pago"
                        )
                      }
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border transition-all flex items-center gap-1 cursor-pointer ${
                        sessao.statusPagamento === "pago"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200"
                      }`}
                      title="Clique para alternar entre Pago e Pendente"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${sessao.statusPagamento === "pago" ? "bg-emerald-600" : "bg-amber-600"}`} />
                      <span>{sessao.statusPagamento === "pago" ? "Pago" : "Pendente"}</span>
                    </button>
                  </td>

                  {/* Forma de Pagamento */}
                  <td className="py-2 px-3">
                    <select
                      value={sessao.formaPagamento || "Pix"}
                      onChange={(e) => handleUpdateItem(sessao.id, "formaPagamento", e.target.value)}
                      className="bg-transparent text-[11px] text-forest/80 px-1 py-0.5 rounded border border-transparent hover:border-soft focus:border-forest/40 focus:bg-white outline-none cursor-pointer"
                    >
                      <option value="Pix">Pix</option>
                      <option value="Cartão">Cartão</option>
                      <option value="Transferência">Transferência</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </td>

                  {/* Ações por Linha: Replicar, Recibo, Excluir */}
                  <td className="py-2 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* BOTÃO PRONTUÁRIO / EVOLUÇÃO CLÍNICA DA SESSÃO */}
                      {onAbrirProntuarioModal && (() => {
                        const hasEvolucao = registrosProntuario?.some(
                          (r) => r.sessaoFaturamentoId === sessao.id || (r.numeroSessao !== undefined && r.numeroSessao === sessao.numeroSessao)
                        );
                        return (
                          <button
                            type="button"
                            onClick={() => onAbrirProntuarioModal(sessao.id)}
                            className={`p-1 rounded-lg transition-colors cursor-pointer ${
                              hasEvolucao
                                ? "hover:bg-emerald-100 text-emerald-800 bg-emerald-50"
                                : "hover:bg-warm text-forest/40 hover:text-emerald-700"
                            }`}
                            title={
                              hasEvolucao
                                ? `Evolução clínica vinculada à Sessão #${sessao.numeroSessao} (Clique para ver/editar)`
                                : `Registrar anotação/evolução para a Sessão #${sessao.numeroSessao} no Prontuário`
                            }
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                          </button>
                        );
                      })()}

                      {/* BOTÃO REPLICAR / DUPLICAR SESSÃO */}
                      <button
                        type="button"
                        onClick={() => handleDuplicarSessao(sessao)}
                        className="p-1 hover:bg-emerald-100 text-emerald-800 rounded-lg transition-colors cursor-pointer"
                        title="Replicar esta sessão (+7 dias de intervalo sugerido)"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {/* BOTÃO RECIBO INDIVIDUAL */}
                      <button
                        type="button"
                        onClick={() => setModalRecibo({ isOpen: true, sessao, isConsolidado: false })}
                        className="p-1 hover:bg-warm text-forest/70 hover:text-forest rounded-lg transition-colors cursor-pointer"
                        title="Emitir recibo individual desta sessão"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>

                      {/* BOTÃO EXCLUIR */}
                      <button
                        type="button"
                        onClick={() => handleSolicitarExclusao(sessao)}
                        className="p-1 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title="Excluir esta sessão"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ========================================================================================= */}
      {/* MODAL 1: RECIBO CLÍNICO / TERAPÊUTICO (IMPRESSÃO / PDF LIMPO)                            */}
      {/* ========================================================================================= */}
      {modalRecibo.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-soft shadow-2xl max-w-xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Topo do Recibo */}
            <div className="flex items-center justify-between pb-3 border-b border-soft">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-700" />
                <h3 className="font-serif font-bold text-base text-forest">
                  {modalRecibo.isConsolidado ? "Recibo Consolidado do Período" : `Recibo de Atendimento #${modalRecibo.sessao?.numeroSessao}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalRecibo({ isOpen: false })}
                className="p-1 hover:bg-warm rounded-lg text-forest/50 hover:text-forest cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Folha do Recibo Formatada */}
            <div id="recibo-imprimir" className="p-6 bg-warm/20 rounded-2xl border border-soft space-y-4 font-sans text-xs text-forest leading-relaxed">
              <div className="text-center pb-3 border-b border-soft/80 space-y-1">
                <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-900">
                  {perfilAtivo === "PJ"
                    ? "RECIBO DE PRESTAÇÃO DE SERVIÇOS EM SAÚDE MENTAL (PESSOA JURÍDICA)"
                    : "RECIBO DE PRESTAÇÃO DE SERVIÇOS EM SAÚDE MENTAL"}
                </h2>
                <p className="text-[11px] text-forest/70">
                  {modalRecibo.isConsolidado ? `Competência: ${fmtMesExtenso(filtroPeriodo)}` : `Sessão #${modalRecibo.sessao?.numeroSessao}`}
                </p>
              </div>

              {perfilAtivo === "PJ" ? (
                <div className="bg-white p-3.5 rounded-xl border border-soft/60 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-blue-900/70 block">
                    Clínica / Empresa Prestadora Emitente
                  </span>
                  <p className="font-bold text-forest text-sm">
                    {dadosPJ.razaoSocial || dadosPJ.nomeFantasia || "Clínica de Psicologia e Terapia"}
                  </p>
                  <p className="text-forest/70 text-xs">
                    CNPJ: {dadosPJ.cnpj || "Não cadastrado"} {dadosPJ.inscricaoMunicipal ? `• IM: ${dadosPJ.inscricaoMunicipal}` : ""}
                  </p>
                  <p className="text-[11px] text-forest/60 pt-0.5">
                    Responsável Técnico: {profNome} ({profTitulo}{profCrp ? ` • CRP: ${profCrp}` : ""})
                  </p>
                </div>
              ) : (
                <div className="bg-white p-3.5 rounded-xl border border-soft/60 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-forest/50 block">Profissional Emitente</span>
                  <p className="font-bold text-forest text-sm">{profNome}</p>
                  <p className="text-forest/70">
                    {profTitulo} {profCrp ? `• CRP: ${profCrp}` : ""} {profCpf ? `• CPF: ${profCpf}` : ""}
                  </p>
                </div>
              )}

              <div className="bg-white p-3.5 rounded-xl border border-soft/60 space-y-1">
                <span className="text-[10px] font-bold uppercase text-forest/50 block">Tomador / Paciente Beneficiário</span>
                <p className="font-bold text-forest text-sm">{pacienteNome}</p>
                <p className="text-forest/70">
                  CPF: {pacienteCpf || "Não informado no cadastro"}
                  {isCorporativo && empresaNome ? ` • Convênio Colaborador: ${empresaNome}` : ""}
                </p>
              </div>

              <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-950">Valor Total Pago:</span>
                  <span className="text-base font-extrabold text-emerald-900 font-serif">
                    {modalRecibo.isConsolidado
                      ? fmtMoeda(metricas.totalPago > 0 ? metricas.totalPago : metricas.totalGeral)
                      : fmtMoeda(modalRecibo.sessao?.valor || 0)}
                  </span>
                </div>
                <p className="text-[11px] text-forest/80">
                  Recebi do(a) paciente acima qualificado(a) a quantia supra discriminada, referente a:
                </p>
                <p className="font-medium text-forest text-xs italic bg-white p-2.5 rounded-lg border border-emerald-100">
                  {modalRecibo.isConsolidado ? (
                    `Prestação de serviços de ${isPsicologo ? "atendimento psicológico / psicoterapia" : "atendimento terapêutico"}, compreendendo ${sessoesFiltradas.length} sessão(ões) realizada(s) na modalidade online/presencial na competência de ${fmtMesExtenso(filtroPeriodo)}.`
                  ) : (
                    `1 sessão de ${isPsicologo ? "atendimento psicológico / psicoterapia" : "atendimento terapêutico"}, realizada na modalidade ${modalRecibo.sessao?.modalidade === "presencial" ? "presencial" : "online"} na data de ${fmtDataBr(modalRecibo.sessao?.data || "")}.`
                  )}
                </p>
              </div>

              <div className="pt-4 flex flex-col items-center justify-center text-center space-y-1 border-t border-soft/80">
                <p className="text-[11px] text-forest/60">
                  Documento emitido em {new Date().toLocaleDateString("pt-BR")}
                </p>
                <div className="w-48 border-b border-forest/40 pt-6" />
                <p className="text-[11px] font-bold text-forest">
                  {perfilAtivo === "PJ" && (dadosPJ.razaoSocial || dadosPJ.nomeFantasia)
                    ? (dadosPJ.razaoSocial || dadosPJ.nomeFantasia)
                    : profNome}
                </p>
                <p className="text-[10px] text-forest/60">
                  {perfilAtivo === "PJ"
                    ? `Resp. Técnico: ${profNome} (${profTitulo}${profCrp ? ` • CRP: ${profCrp}` : ""})`
                    : `${profTitulo} ${profCrp ? `• CRP: ${profCrp}` : ""}`}
                </p>
              </div>
            </div>

            {/* Ações do Modal de Recibo */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalRecibo({ isOpen: false })}
                className="px-4 py-2 text-xs font-semibold text-forest/70 hover:text-forest"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir / Salvar PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* MODAL 2: ESPELHO PARA NOTA FISCAL (NFS-E)                                                 */}
      {/* ========================================================================================= */}
      {modalNf && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-soft shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-soft">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                <h3 className="font-serif font-bold text-base text-forest">
                  Espelho para Emissão de Nota Fiscal (NFS-e)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalNf(false)}
                className="p-1 hover:bg-warm rounded-lg text-forest/50 hover:text-forest cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-forest/70">
              Copie os campos abaixo e cole diretamente no emissor de Nota Fiscal da sua Prefeitura ou sistema fiscal:
            </p>

            {perfilAtivo === "PF" && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Aviso:</span> Este paciente está configurado para faturamento em <strong>Pessoa Física (PF)</strong>. Se você deseja emitir Nota Fiscal via CNPJ, altere a modalidade deste paciente no topo da planilha.
                </div>
              </div>
            )}

            <div className="space-y-3 text-xs">
              {/* Prestador / Empresa (se PJ cadastrado) */}
              {perfilAtivo === "PJ" && (
                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-blue-950">Prestador dos Serviços (Sua Empresa / Clínica)</span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(`${dadosPJ.razaoSocial || ""} - CNPJ: ${dadosPJ.cnpj || ""}`, "prestador", "Dados do prestador")}
                      className="text-[10px] font-bold text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === "prestador" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      Copiar
                    </button>
                  </div>
                  <p className="font-bold text-forest">{dadosPJ.razaoSocial || "Razão Social não informada"}</p>
                  <p className="text-forest/70 font-mono">
                    CNPJ: {dadosPJ.cnpj || "Não cadastrado"} {dadosPJ.inscricaoMunicipal ? `• IM: ${dadosPJ.inscricaoMunicipal}` : ""}
                  </p>
                </div>
              )}

              {/* Tomador */}
              <div className="p-3 bg-warm/30 rounded-xl border border-soft space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-forest/50">Tomador dos Serviços (Paciente / Colaborador)</span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(`${pacienteNome} - CPF: ${pacienteCpf || ""}`, "tomador", "Dados do tomador")}
                    className="text-[10px] font-bold text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === "tomador" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    Copiar
                  </button>
                </div>
                <p className="font-bold text-forest">{pacienteNome}</p>
                <p className="text-forest/70">CPF: {pacienteCpf || "Não cadastrado"}</p>
              </div>

              {/* CNAE */}
              <div className="p-3 bg-warm/30 rounded-xl border border-soft space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-forest/50">Código do Serviço / CNAE</span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(dadosPJ.cnae || "8650-0/03", "cnae", "Código CNAE")}
                    className="text-[10px] font-bold text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === "cnae" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    Copiar
                  </button>
                </div>
                <p className="font-bold text-forest">{dadosPJ.cnae || "8650-0/03"} - Atividades de Psicologia e Psicanálise</p>
                <p className="text-[11px] text-forest/60">Subitem LC 116: 04.16 - Psicologia / Atividades Terapêuticas</p>
              </div>

              {/* Discriminação */}
              <div className="p-3 bg-warm/30 rounded-xl border border-soft space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-forest/50">Discriminação dos Serviços</span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(gerarDiscriminacaoNf(), "discrim", "Discriminação")}
                    className="text-[10px] font-bold text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === "discrim" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    Copiar Texto Completo
                  </button>
                </div>
                <p className="p-2.5 bg-white rounded-lg border border-soft text-[11px] text-forest/80 font-mono leading-relaxed select-all">
                  {gerarDiscriminacaoNf()}
                </p>
              </div>

              {/* Valor Total */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-950 block">Valor Total da NFS-e</span>
                  <span className="text-base font-extrabold text-emerald-900 font-serif">
                    {fmtMoeda(metricas.totalGeral)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyText(metricas.totalGeral.toFixed(2).replace(".", ","), "valor", "Valor total")}
                  className="px-3 py-1.5 bg-white text-emerald-900 font-bold rounded-lg border border-emerald-300 hover:bg-emerald-100 flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === "valor" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  Copiar Valor
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setModalNf(false)}
                className="px-4 py-2 bg-forest text-white font-bold rounded-xl text-xs hover:bg-forest/90 cursor-pointer"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* MODAL 3: RECEITA SAÚDE / CARNÊ-LEÃO WEB (PORTAL E-CAC)                                    */}
      {/* ========================================================================================= */}
      {modalCarneLeao && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-soft shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-soft">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-700" />
                <h3 className="font-serif font-bold text-base text-forest">
                  Receita Saúde • Carnê-Leão Web (e-CAC)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalCarneLeao(false)}
                className="p-1 hover:bg-warm rounded-lg text-forest/50 hover:text-forest cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {perfilAtivo === "PJ" ? (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-2 text-xs text-amber-900">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Atenção Fiscal: Paciente Faturado por Pessoa Jurídica (PJ)</span>
                </div>
                <p className="leading-relaxed">
                  Este paciente está configurado para faturamento pela <strong>Pessoa Jurídica ({dadosPJ.razaoSocial || "Sua Empresa"})</strong>.
                  As receitas de PJ são tributadas pelo Simples Nacional ou Lucro Presumido e <strong>NÃO devem ser lançadas no Carnê-Leão da Pessoa Física</strong> (e-CAC), para evitar bitributação indevida.
                </p>
                <p className="text-[11px] text-amber-800/80">
                  Caso este paciente deva ser tributado no seu IRPF pessoal como autônomo, altere a modalidade dele para <strong>Pessoa Física</strong> no topo da planilha.
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-forest/70 leading-relaxed">
                  O módulo oficial <strong>Receita Saúde</strong> no Carnê-Leão Web exige apenas os 4 campos abaixo para emissão do recibo dedutível do IRPF:
                </p>

                <div className="space-y-2.5 text-xs">
                  <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-blue-950 block">CPF do Beneficiário (Paciente)</span>
                      <span className="font-bold text-forest font-mono">{pacienteCpf || "Pendente de preenchimento"}</span>
                    </div>
                    {pacienteCpf && (
                      <button
                        type="button"
                        onClick={() => handleCopyText(pacienteCpf.replace(/\D/g, ""), "cpf_receita", "CPF")}
                        className="px-2.5 py-1 bg-white text-blue-900 font-bold rounded-lg border border-blue-300 hover:bg-blue-100 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === "cpf_receita" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        Copiar CPF
                      </button>
                    )}
                  </div>

                  <div className="p-3 bg-warm/30 rounded-xl border border-soft flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-forest/60 block">Ocupação / Serviço</span>
                      <span className="font-semibold text-forest">
                        {isPsicologo ? "Psicólogo (CBO 2515-10 / 2515-05)" : "Terapeuta / Psicanalista"}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-warm/30 rounded-xl border border-soft flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-forest/60 block">Valor Recebido no Período</span>
                      <span className="font-extrabold text-forest font-serif text-sm">
                        {fmtMoeda(metricas.totalPago > 0 ? metricas.totalPago : metricas.totalGeral)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(
                          (metricas.totalPago > 0 ? metricas.totalPago : metricas.totalGeral).toFixed(2).replace(".", ","),
                          "val_receita",
                          "Valor"
                        )
                      }
                      className="px-2.5 py-1 bg-white text-forest font-bold rounded-lg border border-soft hover:bg-warm flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === "val_receita" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      Copiar Valor
                    </button>
                  </div>
                </div>

                {/* Link Direto para o Portal e-CAC */}
                <div className="pt-2">
                  <a
                    href="https://cav.receita.fazenda.gov.br/autenticacao/login"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer"
                  >
                    <span>Acessar Portal e-CAC (Carnê-Leão Web Oficial)</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </>
            )}

            <div className="flex items-center justify-end pt-1">
              <button
                type="button"
                onClick={() => setModalCarneLeao(false)}
                className="px-4 py-1.5 text-xs text-forest/70 font-semibold hover:text-forest cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* MODAL 4: ALTERAR MODALIDADE DE FATURAMENTO DO PACIENTE (PF vs PJ)                         */}
      {/* ========================================================================================= */}
      {modalAlterarPerfil && (
        <div className="fixed inset-0 z-[60] bg-forest/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-soft shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-soft">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-700" />
                <h3 className="font-serif font-bold text-base text-forest">
                  Modalidade de Faturamento deste Paciente
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalAlterarPerfil(false)}
                className="p-1 hover:bg-warm rounded-lg text-forest/50 hover:text-forest cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-forest/70 leading-relaxed">
              Defina como as sessões de <strong className="text-forest">{pacienteNome}</strong> serão faturadas e emitidas. Esta configuração fica fixada na ficha dele e pode ser alterada quando necessário:
            </p>

            <div className="space-y-3 pt-1">
              {/* Opção Pessoa Física */}
              <div
                onClick={() => handleTrocarPerfilPaciente("PF")}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  perfilAtivo === "PF"
                    ? "bg-emerald-50/70 border-emerald-500 shadow-xs ring-1 ring-emerald-500"
                    : "bg-white hover:bg-warm/40 border-soft"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-forest text-xs sm:text-sm">
                          Pessoa Física (PF)
                        </h4>
                        {perfilAtivo === "PF" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900">
                            Ativo
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-forest/70 mt-0.5 leading-relaxed">
                        Emissão em nome de <strong>{profNome}</strong> (CPF: {profCpf || "Não informado"} • CRP: {profCrp || "Sem registro"}).
                      </p>
                      <p className="text-[10px] text-emerald-800 mt-1 font-medium">
                        ✓ Recibos dedutíveis no IRPF do paciente (Receita Saúde) e Pix da conta pessoal.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Opção Pessoa Jurídica */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  perfilAtivo === "PJ"
                    ? "bg-blue-50/70 border-blue-500 shadow-xs ring-1 ring-blue-500"
                    : "bg-white hover:bg-warm/40 border-soft"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    onClick={() => handleTrocarPerfilPaciente("PJ")}
                    className="flex items-start gap-3 flex-1 cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-forest text-xs sm:text-sm">
                          Pessoa Jurídica (PJ / Clínica)
                        </h4>
                        {perfilAtivo === "PJ" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-200 text-blue-900">
                            Ativo
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-forest/70 mt-0.5 leading-relaxed">
                        Emissão em nome de <strong>{dadosPJ.razaoSocial || "Empresa / Clínica a configurar"}</strong> (CNPJ: {dadosPJ.cnpj || "Pendente de preenchimento"}).
                      </p>
                      <p className="text-[10px] text-blue-800 mt-1 font-medium">
                        ✓ Espelho para Nota Fiscal (NFS-e), Recibo PJ e Pix da conta jurídica da empresa.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 pt-2.5 border-t border-soft/60 flex items-center justify-between">
                  <span className="text-[10px] text-forest/60">
                    {dadosPJ.cnpj ? "Dados da empresa configurados." : "Necessário informar CNPJ e Razão Social."}
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalConfigurarPJ(true)}
                    className="text-[10px] font-bold text-blue-700 hover:text-blue-900 underline flex items-center gap-1 cursor-pointer"
                  >
                    <Settings className="w-3 h-3" />
                    <span>{dadosPJ.cnpj ? "Editar dados da PJ" : "Configurar Dados da PJ"}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-soft">
              <button
                type="button"
                onClick={() => setModalAlterarPerfil(false)}
                className="px-4 py-2 bg-warm text-forest rounded-xl text-xs font-semibold hover:bg-forest/10 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* MODAL 5: CONFIGURAÇÃO DOS DADOS DA PESSOA JURÍDICA (PJ) DO PROFISSIONAL                   */}
      {/* ========================================================================================= */}
      {modalConfigurarPJ && (
        <div className="fixed inset-0 z-[70] bg-forest/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-soft shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-soft">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-700" />
                <h3 className="font-serif font-bold text-base text-forest">
                  Configuração de Pessoa Jurídica (PJ)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalConfigurarPJ(false)}
                className="p-1 hover:bg-warm rounded-lg text-forest/50 hover:text-forest cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-forest/70">
              Preencha os dados da sua empresa ou clínica. Esses dados serão utilizados para emissão dos recibos PJ, espelhos NFS-e e chave Pix jurídica:
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-forest/80 uppercase mb-1">
                  Razão Social *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Clínica de Psicologia Silva & Associados LTDA"
                  value={formPJ.razaoSocial || ""}
                  onChange={(e) => setFormPJ({ ...formPJ, razaoSocial: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-soft text-forest text-xs focus:border-forest/40 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-forest/80 uppercase mb-1">
                    CNPJ *
                  </label>
                  <input
                    type="text"
                    placeholder="00.000.000/0001-00"
                    value={formPJ.cnpj || ""}
                    onChange={(e) => setFormPJ({ ...formPJ, cnpj: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-soft text-forest text-xs font-mono focus:border-forest/40 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-forest/80 uppercase mb-1">
                    Inscrição Municipal (IM)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 123456-7"
                    value={formPJ.inscricaoMunicipal || ""}
                    onChange={(e) => setFormPJ({ ...formPJ, inscricaoMunicipal: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-soft text-forest text-xs font-mono focus:border-forest/40 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-forest/80 uppercase mb-1">
                  Chave Pix da Conta Jurídica (PJ)
                </label>
                <input
                  type="text"
                  placeholder="Ex: CNPJ ou e-mail financeiro da empresa"
                  value={formPJ.chavePixPJ || ""}
                  onChange={(e) => setFormPJ({ ...formPJ, chavePixPJ: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-soft text-forest text-xs focus:border-forest/40 outline-none"
                />
                <span className="text-[10px] text-forest/50 mt-0.5 block">
                  Esta chave Pix será enviada nas mensagens de WhatsApp dos pacientes faturados via PJ.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-forest/80 uppercase mb-1">
                    Código CNAE
                  </label>
                  <input
                    type="text"
                    placeholder="8650-0/03"
                    value={formPJ.cnae || "8650-0/03"}
                    onChange={(e) => setFormPJ({ ...formPJ, cnae: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-soft text-forest text-xs font-mono focus:border-forest/40 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-forest/80 uppercase mb-1">
                    Endereço Comercial / Cidade
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: São Paulo / SP"
                    value={formPJ.enderecoPJ || ""}
                    onChange={(e) => setFormPJ({ ...formPJ, enderecoPJ: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-soft text-forest text-xs focus:border-forest/40 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-soft">
              <button
                type="button"
                onClick={() => setModalConfigurarPJ(false)}
                disabled={salvandoPJ}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-forest/70 hover:text-forest hover:bg-warm border border-soft transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSalvarDadosPJ}
                disabled={salvandoPJ}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-60"
              >
                {salvandoPJ ? "Salvando..." : "Salvar Dados da PJ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE SESSÃO (100% IN-APP, SEM WINDOW.CONFIRM)             */}
      {/* ========================================================================================= */}
      {sessaoParaExcluir && (
        <div className="fixed inset-0 z-[70] bg-forest/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-rose-200/90 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-inner">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-base text-forest">
                  Excluir Sessão #{sessaoParaExcluir.numeroSessao}?
                </h3>
                <p className="text-xs text-forest/70 leading-relaxed">
                  Tem certeza que deseja remover esta sessão realizada/agendada em{" "}
                  <strong className="text-forest font-semibold">{fmtDataBr(sessaoParaExcluir.data)}</strong> no valor de{" "}
                  <strong className="text-forest font-semibold">{fmtMoeda(sessaoParaExcluir.valor)}</strong>?
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/70 text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                Esta exclusão atualizará a planilha e recalculará os totais do fechamento financeiro deste paciente.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-soft">
              <button
                type="button"
                onClick={() => setSessaoParaExcluir(null)}
                disabled={isExcluindo}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-forest/70 hover:text-forest hover:bg-warm border border-soft transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarExclusao}
                disabled={isExcluindo}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isExcluindo ? (
                  <span>Excluindo...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmar Exclusão</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
