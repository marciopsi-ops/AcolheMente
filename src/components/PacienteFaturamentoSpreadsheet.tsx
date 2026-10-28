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
  Layers,
  Send,
  X,
  User,
  Building,
  Building2,
  Settings,
  Check,
  FileSpreadsheet,
  BookOpen,
  Banknote,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import {
  PerfilFaturamentoItem,
  normalizePerfisFaturamento,
  resolvePerfilFaturamentoAtivo,
  shouldDeclararIrForItem,
  formatPerfilCurtoLabel,
  extractLegacySyncFields,
} from "../types/faturamento";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { PerfisFaturamentoManagerModal } from "./PerfisFaturamentoManagerModal";

export interface SessaoFaturamentoItem {
  id: string;
  numeroSessao: number;
  data: string; // YYYY-MM-DD
  horario?: string; // HH:MM
  modalidade: "online" | "presencial";
  statusAtendimento:
    | "realizada"
    | "agendada"
    | "falta_cobrada"
    | "desmarcada_antecedencia"
    | "cancelada_sem_cobranca"
    | "falta_sem_aviso";
  valor: number;
  statusPagamento: "pago" | "pendente";
  dataPagamento?: string;
  formaPagamento?: "Pix" | "Cartão" | "Transferência" | "Dinheiro" | "Outro";
  observacoes?: string;
  perfilFaturamentoId?: string;
  declararIrOverride?: boolean;
  statusFiscal?: "pendente" | "emitido" | "dispensado";
  dataEmissaoFiscal?: string;
}

export function isSessaoIsentaCobranca(
  sessao: Pick<SessaoFaturamentoItem, "statusAtendimento">
): boolean {
  return (
    sessao.statusAtendimento === "desmarcada_antecedencia" ||
    sessao.statusAtendimento === "cancelada_sem_cobranca"
  );
}

export function isSessaoCobravel(
  sessao: Pick<SessaoFaturamentoItem, "statusAtendimento" | "statusPagamento">
): boolean {
  return (
    sessao.statusAtendimento === "realizada" ||
    sessao.statusAtendimento === "falta_cobrada" ||
    (sessao.statusPagamento === "pago" && !isSessaoIsentaCobranca(sessao))
  );
}

export function resolveStatusFiscalSessao(
  sessao: Pick<SessaoFaturamentoItem, "statusFiscal" | "declararIrOverride" | "formaPagamento">,
  perfilLinha: PerfilFaturamentoItem
): "pendente" | "emitido" | "dispensado" {
  if (sessao.statusFiscal === "emitido") return "emitido";
  if (sessao.statusFiscal === "dispensado") return "dispensado";
  if (sessao.statusFiscal === "pendente") return "pendente";
  if (perfilLinha.via === "PF" && !shouldDeclararIrForItem(sessao, perfilLinha)) {
    return "dispensado";
  }
  return "pendente";
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
  pixKey?: string;
  email?: string;
  telefone?: string;
  dadosPJ?: DadosPessoaJuridica;
  companyData?: any;
  faturamentoPadrao?: "PF" | "PJ";
  perfisFaturamento?: PerfilFaturamentoItem[];
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
  perfilFaturamentoId?: string;
  onUpdatePerfilFaturamento?: (novoPerfil: "PF" | "PJ") => Promise<void> | void;
  onUpdatePerfilFaturamentoId?: (novoId: string, via: "PF" | "PJ") => Promise<void> | void;
  onSaveDadosPJ?: (dadosPJ: DadosPessoaJuridica) => Promise<void> | void;
  onSavePerfisFaturamento?: (perfis: PerfilFaturamentoItem[]) => Promise<void> | void;
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
  perfilFaturamentoId,
  onUpdatePerfilFaturamento,
  onUpdatePerfilFaturamentoId,
  onSaveDadosPJ,
  onSavePerfisFaturamento,
  profissionalLogado,
  showToast,
  isCorporativo = false,
  empresaNome = "",
  registrosProntuario = [],
  onAbrirProntuarioModal,
}) => {
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

  const currentMonthStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }, []);

  const [filtroPeriodo, setFiltroPeriodo] = useState<string>("todas");
  const [dataInicioCustom, setDataInicioCustom] = useState<string>("");
  const [dataFimCustom, setDataFimCustom] = useState<string>("");

  const [itensSessoes, setItensSessoes] = useState<SessaoFaturamentoItem[]>(sessoes || []);

  useEffect(() => {
    if (Array.isArray(sessoes)) {
      setItensSessoes(sessoes);
    }
  }, [sessoes]);

  const [sessaoParaExcluir, setSessaoParaExcluir] = useState<SessaoFaturamentoItem | null>(null);
  const [isExcluindo, setIsExcluindo] = useState<boolean>(false);

  // Carteira de múltiplos perfis de faturamento (PF Contas, Caixa Dinheiro Físico, Múltiplos CNPJs)
  const [perfisLocaisOverride, setPerfisLocaisOverride] = useState<PerfilFaturamentoItem[] | null>(null);

  useEffect(() => {
    setPerfisLocaisOverride(null);
  }, [
    profissionalLogado?.perfisFaturamento,
    profissionalLogado?.dadosPJ,
    profissionalLogado?.companyData,
    profissionalLogado?.cpf,
    profissionalLogado?.chavePix,
  ]);

  const listaPerfis = useMemo(() => {
    if (perfisLocaisOverride && perfisLocaisOverride.length > 0) {
      return perfisLocaisOverride;
    }
    return normalizePerfisFaturamento(profissionalLogado);
  }, [perfisLocaisOverride, profissionalLogado]);

  const [perfilAtivo, setPerfilAtivo] = useState<"PF" | "PJ">(
    perfilFaturamento || profissionalLogado?.faturamentoPadrao || "PF"
  );
  const [localPerfilId, setLocalPerfilId] = useState<string | undefined>(perfilFaturamentoId);

  useEffect(() => {
    if (perfilFaturamento) {
      setPerfilAtivo(perfilFaturamento);
    }
  }, [perfilFaturamento]);

  useEffect(() => {
    setLocalPerfilId(perfilFaturamentoId);
  }, [perfilFaturamentoId]);

  const perfilResolvidoPaciente = useMemo(
    () => resolvePerfilFaturamentoAtivo(listaPerfis, localPerfilId, perfilAtivo),
    [listaPerfis, localPerfilId, perfilAtivo]
  );

  const resolverPerfilDaSessao = (s?: SessaoFaturamentoItem): PerfilFaturamentoItem => {
    if (!s) return perfilResolvidoPaciente;
    return resolvePerfilFaturamentoAtivo(
      listaPerfis,
      s.perfilFaturamentoId || localPerfilId,
      perfilAtivo
    );
  };

  const isSessaoDeclaravelIr = (s: SessaoFaturamentoItem): boolean => {
    const p = resolverPerfilDaSessao(s);
    return shouldDeclararIrForItem(s, p);
  };

  // Modais de seleção e gestão completa de perfis
  const [modalAlterarPerfil, setModalAlterarPerfil] = useState<boolean>(false);
  const [showGerenciarPerfisModal, setShowGerenciarPerfisModal] = useState<boolean>(false);

  const handleSelecionarPerfilEspecifico = async (item: PerfilFaturamentoItem) => {
    try {
      setLocalPerfilId(item.id);
      setPerfilAtivo(item.via);
      if (onUpdatePerfilFaturamentoId) {
        await onUpdatePerfilFaturamentoId(item.id, item.via);
      } else if (onUpdatePerfilFaturamento) {
        await onUpdatePerfilFaturamento(item.via);
      }
      showToast(
        `Emissão deste paciente fixada em: ${formatPerfilCurtoLabel(item)} (${item.via})!`,
        "success"
      );
      setModalAlterarPerfil(false);
    } catch (err) {
      console.error("Erro ao alterar perfil de faturamento:", err);
      showToast("Erro ao salvar perfil de faturamento.", "error");
    }
  };

  const handleSalvarCarteiraPerfis = async (novosPerfis: PerfilFaturamentoItem[]) => {
    setPerfisLocaisOverride(novosPerfis);
    if (onSavePerfisFaturamento) {
      await onSavePerfisFaturamento(novosPerfis);
      return;
    }
    if (onSaveDadosPJ) {
      const legacy = extractLegacySyncFields(
        novosPerfis,
        profissionalLogado?.cpf,
        profissionalLogado?.chavePix || profissionalLogado?.pixKey
      );
      await onSaveDadosPJ(legacy.dadosPJ);
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

  const profNome = profissionalLogado?.name || profissionalLogado?.nome || "Profissional Responsável";
  const profCrp = profissionalLogado?.crp || "";
  const profCpf = profissionalLogado?.cpf || "";
  const isPsicologo = Boolean(profCrp && profCrp.trim().length > 2);
  const profTitulo = isPsicologo
    ? "Psicólogo(a) Clínico(a)"
    : profissionalLogado?.especialidade || "Terapeuta / Psicanalista";

  // Sessões Filtradas pelo Período Selecionado
  const sessoesFiltradas = useMemo(() => {
    return itensSessoes
      .filter((s) => {
        if (filtroPeriodo === "todas") return true;
        if (filtroPeriodo === "custom") {
          if (dataInicioCustom && s.data < dataInicioCustom) return false;
          if (dataFimCustom && s.data > dataFimCustom) return false;
          return true;
        }
        return s.data.startsWith(filtroPeriodo);
      })
      .sort((a, b) => (a.data > b.data ? 1 : -1));
  }, [itensSessoes, filtroPeriodo, dataInicioCustom, dataFimCustom]);

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

  // Métricas Consolidadas do Período (Gerencial + Separação Tributável IRPF vs Caixa s/ IR vs PJ)
  const metricas = useMemo(() => {
    let realizadas = 0;
    let faltasCobradas = 0;
    let agendadas = 0;
    let faltas = 0;
    let totalPago = 0;
    let totalPendente = 0;
    let totalGeral = 0;
    let totalTributavelIr = 0;
    let totalPagoTributavelIr = 0;
    let totalSemIrOuPj = 0;
    let qtdTributavelIr = 0;

    sessoesFiltradas.forEach((s) => {
      const isenta = isSessaoIsentaCobranca(s);
      const v = isenta && s.statusPagamento !== "pago" ? 0 : Number(s.valor) || 0;
      totalGeral += v;
      if (s.statusAtendimento === "realizada") realizadas++;
      if (s.statusAtendimento === "falta_cobrada") {
        faltasCobradas++;
        faltas++;
      }
      if (s.statusAtendimento === "agendada") agendadas++;
      if (s.statusAtendimento === "falta_sem_aviso") faltas++;

      if (s.statusPagamento === "pago") {
        totalPago += v;
      } else if (!isenta) {
        totalPendente += v;
      }

      if (!isenta || s.statusPagamento === "pago") {
        const entraIr = isSessaoDeclaravelIr(s);
        if (entraIr) {
          qtdTributavelIr++;
          totalTributavelIr += v;
          if (s.statusPagamento === "pago") {
            totalPagoTributavelIr += v;
          }
        } else {
          totalSemIrOuPj += v;
        }
      }
    });

    return {
      realizadas,
      faltasCobradas,
      agendadas,
      faltas,
      totalPago,
      totalPendente,
      totalGeral,
      totalTributavelIr,
      totalPagoTributavelIr,
      totalSemIrOuPj,
      qtdTributavelIr,
      qtdTotal: sessoesFiltradas.length,
    };
  }, [sessoesFiltradas, listaPerfis, localPerfilId, perfilAtivo]);

  const handleAdicionarSessao = async () => {
    const hojeStr = new Date().toISOString().split("T")[0];
    const novoNumero =
      itensSessoes.length > 0
        ? Math.max(...itensSessoes.map((s) => s.numeroSessao || 0)) + 1
        : 1;

    const isCaixaPadrao = perfilResolvidoPaciente.subtipo === "dinheiro_fisico";

    const novaSessao: SessaoFaturamentoItem = {
      id: `sess-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      numeroSessao: novoNumero,
      data: hojeStr,
      horario: "14:00",
      modalidade: "online",
      statusAtendimento: "realizada",
      valor: valorBase,
      statusPagamento: "pendente",
      formaPagamento: isCaixaPadrao ? "Dinheiro" : "Pix",
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

  const handleDuplicarSessao = async (sessaoOrigem: SessaoFaturamentoItem) => {
    let novaData = sessaoOrigem.data;
    try {
      if (sessaoOrigem.data) {
        const [ano, mes, dia] = sessaoOrigem.data.split("-").map(Number);
        const dataObj = new Date(ano, mes - 1, dia);
        dataObj.setDate(dataObj.getDate() + 7);
        const anoNovo = dataObj.getFullYear();
        const mesNovo = String(dataObj.getMonth() + 1).padStart(2, "0");
        const diaNovo = String(dataObj.getDate()).padStart(2, "0");
        novaData = `${anoNovo}-${mesNovo}-${diaNovo}`;
      }
    } catch {
      novaData = new Date().toISOString().split("T")[0];
    }

    const novoNumero =
      itensSessoes.length > 0
        ? Math.max(...itensSessoes.map((s) => s.numeroSessao || 0)) + 1
        : 1;

    const novaSessaoRaw: SessaoFaturamentoItem = {
      id: `sess-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      numeroSessao: novoNumero,
      data: novaData,
      horario: sessaoOrigem.horario || "14:00",
      modalidade: sessaoOrigem.modalidade || "online",
      statusAtendimento: "agendada",
      valor: sessaoOrigem.valor,
      statusPagamento: "pendente",
      formaPagamento: sessaoOrigem.formaPagamento || "Pix",
      ...(sessaoOrigem.perfilFaturamentoId
        ? { perfilFaturamentoId: sessaoOrigem.perfilFaturamentoId }
        : {}),
      ...(typeof sessaoOrigem.declararIrOverride === "boolean"
        ? { declararIrOverride: sessaoOrigem.declararIrOverride }
        : {}),
      observacoes: sessaoOrigem.observacoes ? `Replicado de #${sessaoOrigem.numeroSessao}` : "",
    };

    const atualizadas = [...itensSessoes, novaSessaoRaw];
    setItensSessoes(atualizadas);
    try {
      await onSaveSessoes(atualizadas);
      showToast(
        `Sessão duplicada com sucesso para ${novaData.split("-").reverse().join("/")}!`,
        "success"
      );
    } catch (err) {
      console.error("Erro ao salvar sessão duplicada:", err);
      showToast("Erro ao duplicar sessão.", "error");
    }
  };

  const sanitizeSessao = (s: SessaoFaturamentoItem): SessaoFaturamentoItem =>
    Object.fromEntries(
      Object.entries(s).filter(([, v]) => v !== undefined)
    ) as SessaoFaturamentoItem;

  const handleUpdatePatchItem = async (id: string, patch: Partial<SessaoFaturamentoItem>) => {
    const atualizadas = itensSessoes.map((s) => {
      if (s.id !== id) return sanitizeSessao(s);
      return sanitizeSessao({ ...s, ...patch });
    });
    setItensSessoes(atualizadas);
    try {
      await onSaveSessoes(atualizadas);
    } catch (err) {
      console.error("Erro ao atualizar sessão:", err);
    }
  };

  const handleUpdateItem = async (
    id: string,
    campo: keyof SessaoFaturamentoItem,
    valor: any
  ) => {
    const caixaFisicoPerfil = listaPerfis.find((p) => p.subtipo === "dinheiro_fisico");

    const atualizadas = itensSessoes.map((s) => {
      if (s.id !== id) return sanitizeSessao(s);
      const updated: SessaoFaturamentoItem = { ...s, [campo]: valor };
      if (campo === "statusPagamento") {
        if (valor === "pago") {
          if (!updated.dataPagamento) {
            updated.dataPagamento = new Date().toISOString().split("T")[0];
          }
        } else {
          delete updated.dataPagamento;
        }
      }
      // Ao selecionar "Dinheiro", sugere automaticamente não declarar no IR (ou vincula ao Caixa Físico se existir)
      if (campo === "formaPagamento" && valor === "Dinheiro") {
        const pAtual = resolverPerfilDaSessao(updated);
        if (pAtual.via === "PF") {
          if (caixaFisicoPerfil && !updated.perfilFaturamentoId) {
            updated.perfilFaturamentoId = caixaFisicoPerfil.id;
          }
          if (typeof updated.declararIrOverride !== "boolean") {
            updated.declararIrOverride = false;
          }
        }
      }
      return sanitizeSessao(updated);
    });
    setItensSessoes(atualizadas);
    try {
      await onSaveSessoes(atualizadas);
      if (
        (campo === "statusAtendimento" ||
          campo === "data" ||
          campo === "horario" ||
          campo === "modalidade" ||
          campo === "valor") &&
        id &&
        !id.startsWith("sessao_") &&
        !id.startsWith("lote_")
      ) {
        const itemAlvo = atualizadas.find((item) => item.id === id);
        if (itemAlvo) {
          const mapToAgendaStatus: Record<string, string> = {
            agendada: "agendada",
            realizada: "realizada",
            falta_cobrada: "falta_cobrada",
            desmarcada_antecedencia: "remarcada",
            cancelada_sem_cobranca: "cancelada",
            falta_sem_aviso: "cancelada",
          };
          try {
            const agRef = doc(db, "agendamentos", id);
            const agSnap = await getDoc(agRef);
            if (agSnap.exists()) {
              await updateDoc(agRef, {
                data: itemAlvo.data,
                ...(itemAlvo.horario ? { horario: itemAlvo.horario } : {}),
                modalidade: itemAlvo.modalidade,
                valor: Number(itemAlvo.valor) || 0,
                status: mapToAgendaStatus[itemAlvo.statusAtendimento] || "agendada",
                updatedAt: serverTimestamp(),
              });
            }
          } catch {
            // Sessão avulsa sem documento correspondente em agendamentos
          }
        }
      }
    } catch (err) {
      console.error("Erro ao atualizar item da sessão:", err);
    }
  };

  const handleSolicitarExclusao = (sessao: SessaoFaturamentoItem) => {
    setSessaoParaExcluir(sessao);
  };

  const handleConfirmarExclusao = async () => {
    if (!sessaoParaExcluir) return;
    const { id, numeroSessao } = sessaoParaExcluir;

    try {
      setIsExcluindo(true);
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

  const handleCopyText = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(`${label} copiado para a área de transferência!`, "success");
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const fmtMoeda = (val: number) =>
    `R$ ${Number(val || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const fmtDataBr = (strDate: string) => {
    if (!strDate) return "-";
    const parts = strDate.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return strDate;
  };

  const fmtMesExtenso = (strAnoMes: string) => {
    if (!strAnoMes || strAnoMes === "todas" || strAnoMes === "custom") return strAnoMes;
    const [ano, mes] = strAnoMes.split("-");
    const meses = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ];
    const idx = parseInt(mes, 10) - 1;
    return `${meses[idx] || mes} de ${ano}`;
  };

  const gerarTextoFechamentoWhatsApp = () => {
    const sessoesFinalizadas = sessoesFiltradas.filter(
      (s) => s.statusAtendimento === "realizada" || s.statusAtendimento === "falta_cobrada"
    );
    const datas = sessoesFinalizadas
      .map((s) =>
        s.statusAtendimento === "falta_cobrada"
          ? `${fmtDataBr(s.data)} (falta cobrada)`
          : fmtDataBr(s.data)
      )
      .join(", ");
    const periodoTxt =
      filtroPeriodo === "todas" ? "Período Geral" : fmtMesExtenso(filtroPeriodo);

    let txt = `Olá, *${pacienteNome.split(" ")[0]}*! Tudo bem?\n\n`;
    txt += `Passando para compartilhar o fechamento dos atendimentos clínicos (*${periodoTxt}*):\n\n`;
    txt += `• *Sessões Realizadas:* ${metricas.realizadas}\n`;
    if (metricas.faltasCobradas > 0) {
      txt += `• *Faltas Cobradas:* ${metricas.faltasCobradas}\n`;
    }
    if (datas) txt += `• *Datas:* ${datas}\n`;
    txt += `• *Valor Total:* ${fmtMoeda(metricas.totalGeral)}\n`;
    txt += `• *Status:* ${
      metricas.totalPendente <= 0
        ? "Totalmente Quitado"
        : `Pendente: ${fmtMoeda(metricas.totalPendente)}`
    }\n\n`;

    const pAtivo = perfilResolvidoPaciente;
    const pixAtivo =
      pAtivo.via === "PJ"
        ? pAtivo.chavePixPJ || profissionalLogado?.chavePix || profissionalLogado?.pixKey
        : pAtivo.chavePix ||
          (pAtivo.subtipo !== "dinheiro_fisico"
            ? profissionalLogado?.chavePix || profissionalLogado?.pixKey
            : "");

    const titularPix =
      pAtivo.via === "PJ"
        ? pAtivo.razaoSocial || pAtivo.nomeFantasia || profNome
        : pAtivo.titularNome || profNome;

    if (pixAtivo && metricas.totalPendente > 0) {
      txt += `*Chave Pix para Regularização (${
        pAtivo.via === "PJ" ? "Conta Jurídica" : formatPerfilCurtoLabel(pAtivo)
      }):*\n${pixAtivo}\n`;
      if (titularPix) txt += `• *Favorecido:* ${titularPix}\n`;
      txt += `\n`;
    }

    txt += `Caso necessite de recibo individual ou consolidado para reembolso/declaração, estou à disposição!\n`;
    txt += `Atenciosamente,\n*${profNome}*${profCrp ? ` (CRP: ${profCrp})` : ""}`;
    if (pAtivo.via === "PJ" && (pAtivo.razaoSocial || pAtivo.nomeFantasia)) {
      txt += `\n_${pAtivo.razaoSocial || pAtivo.nomeFantasia}_`;
    }
    return txt;
  };

  // Perfil PJ efetivo para o Assistente NFS-e (usa o perfil da ficha se for PJ, ou o primeiro PJ disponível)
  const perfilPjParaNf = useMemo(() => {
    if (perfilResolvidoPaciente.via === "PJ") return perfilResolvidoPaciente;
    return (
      listaPerfis.find((p) => p.via === "PJ" && p.padrao) ||
      listaPerfis.find((p) => p.via === "PJ") ||
      null
    );
  }, [perfilResolvidoPaciente, listaPerfis]);

  const gerarDiscriminacaoNf = () => {
    const sessoesFinalizadas = sessoesFiltradas.filter(
      (s) => s.statusAtendimento === "realizada" || s.statusAtendimento === "falta_cobrada"
    );
    const datas = sessoesFinalizadas.map((s) => fmtDataBr(s.data)).join(", ");
    const modalidades = Array.from(
      new Set(
        sessoesFinalizadas.map((s) =>
          s.modalidade === "online" ? "modalidade online" : "modalidade presencial"
        )
      )
    ).join(" e ");

    const tipoServico = isPsicologo
      ? "atendimento psicológico / psicoterapia"
      : "atendimento terapêutico / psicanalítico";

    let desc = `Prestação de serviços de ${tipoServico} (${modalidades || "modalidade online"}), `;
    desc += `referente a ${sessoesFinalizadas.length} sessão(ões) nos dias: ${datas || "conforme prontuário"}. `;
    desc += `Tomador/Paciente: ${pacienteNome} (CPF: ${pacienteCpf || "Não informado"}). `;
    if (perfilResolvidoPaciente.via === "PJ" && perfilResolvidoPaciente.razaoSocial) {
      desc += `Prestador: ${perfilResolvidoPaciente.razaoSocial} (CNPJ: ${
        perfilResolvidoPaciente.cnpj || "Não informado"
      }). `;
      desc += `Profissional Responsável Técnico: ${profNome}${
        profCrp ? ` (CRP: ${profCrp})` : ""
      }. `;
    } else {
      desc += `Profissional Autônomo: ${
        perfilResolvidoPaciente.titularNome || profNome
      }${profCrp ? ` (CRP: ${profCrp})` : ""}. `;
    }
    desc += `Valor total: ${fmtMoeda(metricas.totalGeral)}.`;
    return desc;
  };

  const perfilDoReciboAtual = useMemo(() => {
    if (!modalRecibo.isOpen) return perfilResolvidoPaciente;
    if (!modalRecibo.isConsolidado && modalRecibo.sessao) {
      return resolverPerfilDaSessao(modalRecibo.sessao);
    }
    return perfilResolvidoPaciente;
  }, [modalRecibo, perfilResolvidoPaciente, listaPerfis, localPerfilId, perfilAtivo]);

  const perfisPFLista = useMemo(
    () => listaPerfis.filter((p) => p.via === "PF"),
    [listaPerfis]
  );
  const perfisPJLista = useMemo(
    () => listaPerfis.filter((p) => p.via === "PJ"),
    [listaPerfis]
  );

  return (
    <div className="bg-white rounded-2xl border border-emerald-200/90 shadow-sm overflow-hidden space-y-0">
      {/* 1. TOPO: TÍTULO, PERFIL DE EMISSÃO ATIVO E CONTROLES DE COMPETÊNCIA */}
      <div className="px-3.5 py-2 sm:px-4 bg-gradient-to-r from-emerald-50/80 via-warm/20 to-emerald-50/60 border-b border-soft flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-2xs shrink-0">
            <DollarSign className="w-3.5 h-3.5 text-sun" />
          </div>
          <h4 className="text-xs sm:text-sm font-bold text-forest uppercase tracking-wider whitespace-nowrap">
            Faturamento & Sessões
          </h4>
          <span className="text-[10px] font-medium text-forest/60 whitespace-nowrap">
            Tomador PF
          </span>
          <span className="text-forest/30 text-xs" aria-hidden="true">
            ·
          </span>

          {/* SELETOR / INDICADOR DO PERFIL DE FATURAMENTO FIXADO NESTE PACIENTE */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-medium border shadow-2xs bg-white border-soft whitespace-nowrap">
            <span className="text-[9px] text-forest/50 uppercase font-bold tracking-wider">
              Emissão:
            </span>
            {perfilResolvidoPaciente.via === "PJ" ? (
              <span className="flex items-center gap-1 font-bold text-blue-900">
                <Building2 className="w-3 h-3 text-blue-700 shrink-0" />
                <span className="truncate max-w-[140px]">
                  {formatPerfilCurtoLabel(perfilResolvidoPaciente)}
                </span>
                {perfilResolvidoPaciente.cnpj ? (
                  <span className="text-[9px] font-mono tabular-nums text-blue-800/80 font-normal">
                    ({perfilResolvidoPaciente.cnpj})
                  </span>
                ) : (
                  <span className="text-[9px] text-amber-600 font-normal">
                    (Sem CNPJ)
                  </span>
                )}
              </span>
            ) : perfilResolvidoPaciente.subtipo === "dinheiro_fisico" ? (
              <span className="flex items-center gap-1 font-bold text-amber-900">
                <Banknote className="w-3 h-3 text-amber-700 shrink-0" />
                <span className="truncate max-w-[140px]">
                  {formatPerfilCurtoLabel(perfilResolvidoPaciente)}
                </span>
                {!perfilResolvidoPaciente.declararIr && (
                  <span className="text-[9px] text-amber-700 font-semibold">
                    · Sem IR
                  </span>
                )}
              </span>
            ) : (
              <span className="flex items-center gap-1 font-bold text-emerald-900">
                <User className="w-3 h-3 text-emerald-700 shrink-0" />
                <span className="truncate max-w-[140px]">
                  {formatPerfilCurtoLabel(perfilResolvidoPaciente)}
                </span>
                {(perfilResolvidoPaciente.cpf || profCpf) && (
                  <span className="text-[9px] font-mono tabular-nums text-emerald-800/80 font-normal">
                    ({perfilResolvidoPaciente.cpf || profCpf})
                  </span>
                )}
                {!perfilResolvidoPaciente.declararIr && (
                  <span className="text-[9px] text-amber-700 font-semibold">
                    · Sem IR
                  </span>
                )}
              </span>
            )}
            <button
              type="button"
              onClick={() => setModalAlterarPerfil(true)}
              className="ml-0.5 text-[9px] font-bold text-forest hover:text-emerald-700 underline cursor-pointer"
              title="Escolher entre múltiplas contas CPF, Caixa em Dinheiro Físico ou empresas CNPJ"
            >
              Alterar
            </button>
          </div>
        </div>

        {/* Direita: Filtro de Competência & Botão Nova Sessão */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0">
          <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-soft shadow-2xs text-xs">
            <Calendar className="w-3.5 h-3.5 text-forest/60 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-forest/60 hidden sm:inline">
              Competência:
            </span>
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
                className="text-[11px] font-mono tabular-nums text-forest px-1 py-0.5 bg-transparent outline-none"
              />
              <span className="text-forest/40 text-[10px]">até</span>
              <input
                type="date"
                value={dataFimCustom}
                onChange={(e) => setDataFimCustom(e.target.value)}
                className="text-[11px] font-mono tabular-nums text-forest px-1 py-0.5 bg-transparent outline-none"
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
            <span>Nova Sessão</span>
          </button>
        </div>
      </div>

      {/* 2. CARDS RESUMO / MÉTRICAS DO PERÍODO SELECIONADO */}
      <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 bg-warm/15 border-b border-soft grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <div className="bg-white p-2.5 rounded-xl border border-soft shadow-2xs">
          <div className="flex items-center justify-between text-forest/60 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Sessões Realizadas
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-base sm:text-lg font-extrabold text-forest tabular-nums">
            {metricas.realizadas}{" "}
            <span className="text-[11px] font-normal text-forest/60">
              de {metricas.qtdTotal} total
            </span>
          </div>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-soft shadow-2xs">
          <div className="flex items-center justify-between text-forest/60 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Total Quitado
            </span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-base sm:text-lg font-extrabold text-emerald-700 font-mono tabular-nums">
            {fmtMoeda(metricas.totalPago)}
          </div>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-soft shadow-2xs">
          <div className="flex items-center justify-between text-forest/60 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Pendente Recebimento
            </span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div
            className={`text-base sm:text-lg font-extrabold font-mono tabular-nums ${
              metricas.totalPendente > 0 ? "text-amber-700" : "text-forest/60"
            }`}
          >
            {fmtMoeda(metricas.totalPendente)}
          </div>
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-soft shadow-2xs">
          <div className="flex items-center justify-between text-forest/60 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Faturamento Período
            </span>
            <Layers className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-base sm:text-lg font-extrabold text-forest font-mono tabular-nums">
            {fmtMoeda(metricas.totalGeral)}
          </div>
          {metricas.totalSemIrOuPj > 0 && (
            <div className="text-[10px] text-forest/55 mt-0.5 tabular-nums">
              IRPF: {fmtMoeda(metricas.totalTributavelIr)} · s/ IR ou PJ:{" "}
              {fmtMoeda(metricas.totalSemIrOuPj)}
            </div>
          )}
        </div>
      </div>

      {/* 3. BARRA DE ATALHOS RÁPIDOS DE EMISSÃO & INTEGRAÇÕES */}
      <div className="px-4 sm:px-5 py-3 bg-white border-b border-soft flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={sessoesFiltradas.length === 0}
            onClick={() => setModalRecibo({ isOpen: true, isConsolidado: true })}
            className="px-3 py-1.5 bg-warm hover:bg-forest hover:text-white text-forest font-semibold rounded-xl border border-soft transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer whitespace-nowrap"
            title="Gerar recibo unificado contendo todas as sessões filtradas"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Recibo Consolidado ({sessoesFiltradas.length})</span>
          </button>

          <button
            type="button"
            disabled={sessoesFiltradas.length === 0}
            onClick={() => setModalNf(true)}
            className="px-3 py-1.5 bg-warm hover:bg-emerald-700 hover:text-white text-forest font-semibold rounded-xl border border-soft transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer whitespace-nowrap"
            title="Assistente de emissão: dados consolidados para emissão de Nota Fiscal no portal da sua prefeitura"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Assistente NFS-e</span>
          </button>

          <button
            type="button"
            onClick={() => setModalCarneLeao(true)}
            className="px-3 py-1.5 bg-warm hover:bg-blue-700 hover:text-white text-forest font-semibold rounded-xl border border-soft transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap"
            title="Dados formatados e atalho oficial do Carnê-Leão Web da Receita Federal (filtra automaticamente sessões sem IR e PJ)"
          >
            <Building className="w-3.5 h-3.5 text-blue-600" />
            <span>Receita Saúde (e-CAC)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowGerenciarPerfisModal(true)}
            className="px-3 py-1.5 bg-white hover:bg-warm text-forest/80 hover:text-forest font-semibold rounded-xl border border-soft transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap"
            title="Gerenciar contas CPF, Caixa em Dinheiro Físico e empresas CNPJ"
          >
            <Settings className="w-3.5 h-3.5 text-forest/60" />
            <span>Perfis PF / PJ ({listaPerfis.length})</span>
          </button>
        </div>

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
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer whitespace-nowrap"
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
              Clique em <strong className="text-forest">Nova Sessão</strong> para começar o controle financeiro deste paciente.
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
                <th className="py-2.5 px-3 min-w-[105px]">Pagamento</th>
                <th className="py-2.5 px-3 min-w-[100px]">Forma</th>
                <th className="py-2.5 px-3 min-w-[155px]">Conta / IRPF</th>
                <th className="py-2.5 px-3 min-w-[115px]">NF / Recibo</th>
                <th className="py-2.5 px-3 text-right min-w-[120px]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-soft/60">
              {sessoesFiltradas.map((sessao) => {
                const perfilLinha = resolverPerfilDaSessao(sessao);
                const declaraIrLinha = shouldDeclararIrForItem(sessao, perfilLinha);
                const statusFiscalLinha = resolveStatusFiscalSessao(sessao, perfilLinha);
                const isPjLinha = perfilLinha.via === "PJ";

                return (
                  <tr key={sessao.id} className="hover:bg-warm/30 transition-colors">
                    {/* # Número */}
                    <td className="py-2 px-3 text-center font-bold text-forest/70 font-mono tabular-nums">
                      #{sessao.numeroSessao}
                    </td>

                    {/* Data */}
                    <td className="py-2 px-3">
                      <input
                        type="date"
                        value={sessao.data || ""}
                        onChange={(e) => handleUpdateItem(sessao.id, "data", e.target.value)}
                        className="bg-transparent font-mono tabular-nums font-medium text-xs text-forest px-1 py-0.5 rounded border border-transparent hover:border-soft focus:border-forest/40 focus:bg-white outline-none w-full"
                      />
                    </td>

                    {/* Modalidade */}
                    <td className="py-2 px-3">
                      <select
                        value={sessao.modalidade || "online"}
                        onChange={(e) =>
                          handleUpdateItem(sessao.id, "modalidade", e.target.value)
                        }
                        className={`text-[11px] font-bold px-2 py-1 rounded-lg border outline-none cursor-pointer ${
                          sessao.modalidade === "presencial"
                            ? "bg-purple-50 text-purple-900 border-purple-200"
                            : "bg-sky-50 text-sky-900 border-sky-200"
                        }`}
                      >
                        <option value="online">Online</option>
                        <option value="presencial">Presencial</option>
                      </select>
                    </td>

                    {/* Status do Atendimento */}
                    <td className="py-2 px-3">
                      <select
                        value={sessao.statusAtendimento || "realizada"}
                        onChange={(e) =>
                          handleUpdateItem(sessao.id, "statusAtendimento", e.target.value)
                        }
                        className={`text-[11px] font-medium px-2 py-1 rounded-lg border outline-none cursor-pointer w-full ${
                          sessao.statusAtendimento === "falta_cobrada"
                            ? "bg-orange-50 text-orange-900 border-orange-300 font-bold"
                            : sessao.statusAtendimento === "agendada"
                            ? "bg-sky-50 text-sky-900 border-sky-200"
                            : sessao.statusAtendimento === "desmarcada_antecedencia" ||
                              sessao.statusAtendimento === "cancelada_sem_cobranca"
                            ? "bg-stone-100 text-stone-600 border-stone-200"
                            : "bg-white text-forest border-soft"
                        }`}
                      >
                        <option value="realizada">Realizada (Cobrada)</option>
                        <option value="falta_cobrada">Falta Cobrada ($)</option>
                        <option value="agendada">Agendada (Sem baixa)</option>
                        <option value="desmarcada_antecedencia">Remarcada / Aviso (Isenta)</option>
                        <option value="cancelada_sem_cobranca">Cancelada s/ cobrança</option>
                        {sessao.statusAtendimento === "falta_sem_aviso" && (
                          <option value="falta_sem_aviso">Falta s/ aviso (Legado)</option>
                        )}
                      </select>
                    </td>

                    {/* Valor (R$) */}
                    <td className="py-2 px-3">
                      <div className="relative flex items-center">
                        <span className="text-[10px] text-forest/50 font-bold mr-1">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={sessao.valor || 0}
                          onChange={(e) =>
                            handleUpdateItem(
                              sessao.id,
                              "valor",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="bg-transparent font-mono tabular-nums font-bold text-xs text-forest px-1.5 py-0.5 rounded border border-transparent hover:border-soft focus:border-forest/40 focus:bg-white outline-none w-20"
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
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                          sessao.statusPagamento === "pago"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                        }`}
                        title="Clique para alternar entre Pago e Pendente"
                      >
                        {sessao.statusPagamento === "pago" ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                        ) : (
                          <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                        )}
                        <span>{sessao.statusPagamento === "pago" ? "Pago" : "Pendente"}</span>
                      </button>
                    </td>

                    {/* Forma de Pagamento */}
                    <td className="py-2 px-3">
                      <select
                        value={sessao.formaPagamento || "Pix"}
                        onChange={(e) =>
                          handleUpdateItem(sessao.id, "formaPagamento", e.target.value)
                        }
                        className="bg-transparent text-[11px] text-forest/80 px-1 py-0.5 rounded border border-transparent hover:border-soft focus:border-forest/40 focus:bg-white outline-none cursor-pointer"
                      >
                        <option value="Pix">Pix</option>
                        <option value="Cartão">Cartão</option>
                        <option value="Transferência">Transferência</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </td>

                    {/* Conta / Emissor & Regra IRPF por Linha */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1">
                        <select
                          value={sessao.perfilFaturamentoId || ""}
                          onChange={(e) => {
                            const nextId = e.target.value || undefined;
                            handleUpdatePatchItem(sessao.id, {
                              perfilFaturamentoId: nextId,
                            });
                          }}
                          className="bg-white text-[10px] font-medium text-forest px-1.5 py-1 rounded-lg border border-soft outline-none cursor-pointer max-w-[108px] truncate"
                          title="Conta ou CNPJ receptor desta sessão (vazio = segue padrão da ficha)"
                        >
                          <option value="">
                            Padrão ({formatPerfilCurtoLabel(perfilResolvidoPaciente)})
                          </option>
                          {listaPerfis.map((p) => (
                            <option key={p.id} value={p.id}>
                              [{p.via}] {formatPerfilCurtoLabel(p)}
                            </option>
                          ))}
                        </select>

                        {perfilLinha.via === "PJ" ? (
                          <span
                            className="text-[10px] font-mono font-bold text-blue-800 px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 whitespace-nowrap"
                            title="Tributado na Pessoa Jurídica (CNPJ)"
                          >
                            PJ
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdatePatchItem(sessao.id, {
                                declararIrOverride: !declaraIrLinha,
                              })
                            }
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors cursor-pointer whitespace-nowrap flex items-center gap-0.5 ${
                              declaraIrLinha
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                                : "bg-stone-100 text-stone-600 border-stone-300 hover:bg-stone-200"
                            }`}
                            title={
                              declaraIrLinha
                                ? "Entra na base do IRPF / Receita Saúde. Clique para marcar como Caixa Sem IR."
                                : "Caixa gerencial (NÃO entra no IRPF / Receita Saúde). Clique para incluir no IR."
                            }
                          >
                            {declaraIrLinha ? (
                              <>
                                <ShieldCheck className="w-2.5 h-2.5 text-emerald-700" />
                                <span>c/ IR</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-2.5 h-2.5 text-stone-500" />
                                <span>s/ IR</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Status Fiscal: NF / Recibo (1 toque) */}
                    <td className="py-2 px-3">
                      <button
                        type="button"
                        onClick={() => {
                          const hojeIso = new Date().toISOString().split("T")[0];
                          const proximoStatus: "pendente" | "emitido" | "dispensado" =
                            statusFiscalLinha === "emitido"
                              ? !isPjLinha && !declaraIrLinha
                                ? "dispensado"
                                : "pendente"
                              : "emitido";
                          handleUpdatePatchItem(sessao.id, {
                            statusFiscal: proximoStatus,
                            dataEmissaoFiscal:
                              proximoStatus === "emitido" ? hojeIso : undefined,
                          });
                        }}
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                          statusFiscalLinha === "emitido"
                            ? "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100"
                            : statusFiscalLinha === "dispensado"
                            ? "bg-stone-100 text-stone-600 border-stone-300 hover:bg-stone-200"
                            : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                        }`}
                        title={
                          isPjLinha
                            ? "Clique para alternar entre NF Pendente e NF Emitida"
                            : "Clique para alternar entre Recibo Pendente e Recibo Emitido"
                        }
                      >
                        {statusFiscalLinha === "emitido" ? (
                          <CheckCircle2 className="w-3 h-3 text-blue-600 shrink-0" />
                        ) : statusFiscalLinha === "dispensado" ? (
                          <EyeOff className="w-3 h-3 text-stone-500 shrink-0" />
                        ) : (
                          <FileText className="w-3 h-3 text-amber-600 shrink-0" />
                        )}
                        <span>
                          {isPjLinha
                            ? statusFiscalLinha === "emitido"
                              ? "NF Emitida"
                              : statusFiscalLinha === "dispensado"
                              ? "Dispensada"
                              : "NF Pendente"
                            : statusFiscalLinha === "emitido"
                            ? "Recibo Emitido"
                            : statusFiscalLinha === "dispensado"
                            ? "Sem Recibo"
                            : "Recibo Pendente"}
                        </span>
                      </button>
                    </td>

                    {/* Ações por Linha */}
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {onAbrirProntuarioModal &&
                          (() => {
                            const hasEvolucao = registrosProntuario?.some(
                              (r) =>
                                r.sessaoFaturamentoId === sessao.id ||
                                (r.numeroSessao !== undefined &&
                                  r.numeroSessao === sessao.numeroSessao)
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
                                    ? `Evolução clínica vinculada à Sessão #${sessao.numeroSessao}`
                                    : `Registrar evolução para a Sessão #${sessao.numeroSessao}`
                                }
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                              </button>
                            );
                          })()}

                        <button
                          type="button"
                          onClick={() => handleDuplicarSessao(sessao)}
                          className="p-1 hover:bg-emerald-100 text-emerald-800 rounded-lg transition-colors cursor-pointer"
                          title="Replicar esta sessão (+7 dias sugerido)"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setModalRecibo({ isOpen: true, sessao, isConsolidado: false })
                          }
                          className="p-1 hover:bg-warm text-forest/70 hover:text-forest rounded-lg transition-colors cursor-pointer"
                          title="Emitir recibo individual desta sessão"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>

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
                );
              })}
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
            <div className="flex items-center justify-between pb-3 border-b border-soft">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-700" />
                <h3 className="font-serif font-bold text-base text-forest">
                  {modalRecibo.isConsolidado
                    ? "Recibo Consolidado do Período"
                    : `Recibo de Atendimento #${modalRecibo.sessao?.numeroSessao}`}
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

            <div
              id="recibo-imprimir"
              className="p-6 bg-warm/20 rounded-2xl border border-soft space-y-4 font-sans text-xs text-forest leading-relaxed"
            >
              <div className="text-center pb-3 border-b border-soft/80 space-y-1">
                <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-900">
                  {perfilDoReciboAtual.via === "PJ"
                    ? "RECIBO DE PRESTAÇÃO DE SERVIÇOS EM SAÚDE MENTAL (PESSOA JURÍDICA)"
                    : "RECIBO DE PRESTAÇÃO DE SERVIÇOS EM SAÚDE MENTAL"}
                </h2>
                <p className="text-[11px] text-forest/70">
                  {modalRecibo.isConsolidado
                    ? `Competência: ${fmtMesExtenso(filtroPeriodo)}`
                    : `Sessão #${modalRecibo.sessao?.numeroSessao}`}
                </p>
              </div>

              {perfilDoReciboAtual.via === "PJ" ? (
                <div className="bg-white p-3.5 rounded-xl border border-soft/60 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-blue-900/70 block">
                    Clínica / Empresa Prestadora Emitente
                  </span>
                  <p className="font-bold text-forest text-sm">
                    {perfilDoReciboAtual.razaoSocial ||
                      perfilDoReciboAtual.nomeFantasia ||
                      "Clínica de Psicologia e Terapia"}
                  </p>
                  <p className="text-forest/70 text-xs font-mono tabular-nums">
                    CNPJ: {perfilDoReciboAtual.cnpj || "Não cadastrado"}{" "}
                    {perfilDoReciboAtual.inscricaoMunicipal
                      ? `• IM: ${perfilDoReciboAtual.inscricaoMunicipal}`
                      : ""}
                  </p>
                  <p className="text-[11px] text-forest/60 pt-0.5">
                    Responsável Técnico: {profNome} ({profTitulo}
                    {profCrp ? ` • CRP: ${profCrp}` : ""})
                  </p>
                </div>
              ) : (
                <div className="bg-white p-3.5 rounded-xl border border-soft/60 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-forest/50 block">
                    Profissional Emitente
                  </span>
                  <p className="font-bold text-forest text-sm">
                    {perfilDoReciboAtual.titularNome || profNome}
                  </p>
                  <p className="text-forest/70">
                    {profTitulo} {profCrp ? `• CRP: ${profCrp}` : ""}{" "}
                    {perfilDoReciboAtual.cpf || profCpf
                      ? `• CPF: ${perfilDoReciboAtual.cpf || profCpf}`
                      : ""}
                  </p>
                </div>
              )}

              <div className="bg-white p-3.5 rounded-xl border border-soft/60 space-y-1">
                <span className="text-[10px] font-bold uppercase text-forest/50 block">
                  Tomador / Paciente Beneficiário
                </span>
                <p className="font-bold text-forest text-sm">{pacienteNome}</p>
                <p className="text-forest/70">
                  CPF: <span className="font-mono tabular-nums">{pacienteCpf || "Não informado no cadastro"}</span>
                  {isCorporativo && empresaNome
                    ? ` • Convênio Colaborador: ${empresaNome}`
                    : ""}
                </p>
              </div>

              <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-950">Valor Total Pago:</span>
                  <span className="text-base font-extrabold text-emerald-900 font-mono tabular-nums">
                    {modalRecibo.isConsolidado
                      ? fmtMoeda(
                          metricas.totalPago > 0
                            ? metricas.totalPago
                            : metricas.totalGeral
                        )
                      : fmtMoeda(modalRecibo.sessao?.valor || 0)}
                  </span>
                </div>
                <p className="text-[11px] text-forest/80">
                  Recebi do(a) paciente acima qualificado(a) a quantia supra discriminada, referente a:
                </p>
                <p className="font-medium text-forest text-xs italic bg-white p-2.5 rounded-lg border border-emerald-100">
                  {modalRecibo.isConsolidado
                    ? `Prestação de serviços de ${
                        isPsicologo
                          ? "atendimento psicológico / psicoterapia"
                          : "atendimento terapêutico"
                      }, compreendendo ${
                        sessoesFiltradas.length
                      } sessão(ões) realizada(s) na modalidade online/presencial na competência de ${fmtMesExtenso(
                        filtroPeriodo
                      )}.`
                    : `1 sessão de ${
                        isPsicologo
                          ? "atendimento psicológico / psicoterapia"
                          : "atendimento terapêutico"
                      }, realizada na modalidade ${
                        modalRecibo.sessao?.modalidade === "presencial"
                          ? "presencial"
                          : "online"
                      } na data de ${fmtDataBr(modalRecibo.sessao?.data || "")}.`}
                </p>
              </div>

              <div className="pt-4 flex flex-col items-center justify-center text-center space-y-1 border-t border-soft/80">
                <p className="text-[11px] text-forest/60">
                  Documento emitido em {new Date().toLocaleDateString("pt-BR")}
                </p>
                <div className="w-48 border-b border-forest/40 pt-6" />
                <p className="text-[11px] font-bold text-forest">
                  {perfilDoReciboAtual.via === "PJ" &&
                  (perfilDoReciboAtual.razaoSocial || perfilDoReciboAtual.nomeFantasia)
                    ? perfilDoReciboAtual.razaoSocial || perfilDoReciboAtual.nomeFantasia
                    : perfilDoReciboAtual.titularNome || profNome}
                </p>
                <p className="text-[10px] text-forest/60">
                  {perfilDoReciboAtual.via === "PJ"
                    ? `Resp. Técnico: ${profNome} (${profTitulo}${
                        profCrp ? ` • CRP: ${profCrp}` : ""
                      })`
                    : `${profTitulo} ${profCrp ? `• CRP: ${profCrp}` : ""}`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              {(() => {
                const alvos = modalRecibo.isConsolidado
                  ? sessoesFiltradas.filter((s) => !isSessaoIsentaCobranca(s))
                  : modalRecibo.sessao
                  ? [modalRecibo.sessao]
                  : [];
                const todosEmitidos =
                  alvos.length > 0 &&
                  alvos.every(
                    (s) =>
                      resolveStatusFiscalSessao(s, resolverPerfilDaSessao(s)) === "emitido"
                  );

                return alvos.length > 0 ? (
                  <button
                    type="button"
                    onClick={async () => {
                      const idsAlvo = new Set(alvos.map((a) => a.id));
                      const hojeIso = new Date().toISOString().split("T")[0];
                      const nextStatus: "emitido" | "pendente" = todosEmitidos
                        ? "pendente"
                        : "emitido";
                      const atualizadas = itensSessoes.map((s) => {
                        if (!idsAlvo.has(s.id)) return sanitizeSessao(s);
                        const patched: SessaoFaturamentoItem = {
                          ...s,
                          statusFiscal: nextStatus,
                          dataEmissaoFiscal:
                            nextStatus === "emitido" ? hojeIso : undefined,
                        };
                        return sanitizeSessao(patched);
                      });
                      setItensSessoes(atualizadas);
                      if (modalRecibo.sessao) {
                        const atualizadoModal = atualizadas.find(
                          (x) => x.id === modalRecibo.sessao?.id
                        );
                        if (atualizadoModal) {
                          setModalRecibo((prev) => ({
                            ...prev,
                            sessao: atualizadoModal,
                          }));
                        }
                      }
                      await onSaveSessoes(atualizadas);
                      showToast(
                        nextStatus === "emitido"
                          ? "Recibo marcado como Emitido!"
                          : "Status do recibo retornado para Pendente.",
                        "success"
                      );
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      todosEmitidos
                        ? "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100"
                        : "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {todosEmitidos ? "Recibo Emitido" : "Marcar Recibo Emitido"}
                    </span>
                  </button>
                ) : (
                  <span />
                );
              })()}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setModalRecibo({ isOpen: false })}
                  className="px-4 py-2 text-xs font-semibold text-forest/70 hover:text-forest cursor-pointer"
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
                  Assistente & Espelho para Emissão de Nota Fiscal (NFS-e)
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
              Copie os campos formatados abaixo e cole diretamente no emissor de Nota Fiscal da sua Prefeitura ou sistema contábil:
            </p>

            {perfilResolvidoPaciente.via === "PF" && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div>
                    <span className="font-bold">Aviso:</span> Este paciente está vinculado ao perfil{" "}
                    <strong>{formatPerfilCurtoLabel(perfilResolvidoPaciente)} (PF)</strong>. Para emitir NFS-e via CNPJ, altere o perfil deste paciente para uma de suas empresas PJ.
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setModalNf(false);
                      setModalAlterarPerfil(true);
                    }}
                    className="text-[11px] font-bold text-amber-950 underline cursor-pointer"
                  >
                    Escolher empresa CNPJ para este paciente
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3 text-xs">
              {(perfilResolvidoPaciente.via === "PJ" || perfilPjParaNf) && (
                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-blue-950">
                      Prestador dos Serviços (Empresa Emitente)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const pj =
                          perfilResolvidoPaciente.via === "PJ"
                            ? perfilResolvidoPaciente
                            : perfilPjParaNf!;
                        handleCopyText(
                          `${pj.razaoSocial || ""} - CNPJ: ${pj.cnpj || ""}`,
                          "prestador",
                          "Dados do prestador"
                        );
                      }}
                      className="text-[10px] font-bold text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === "prestador" ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      Copiar
                    </button>
                  </div>
                  {(() => {
                    const pj =
                      perfilResolvidoPaciente.via === "PJ"
                        ? perfilResolvidoPaciente
                        : perfilPjParaNf!;
                    return (
                      <>
                        <p className="font-bold text-forest">
                          {pj.razaoSocial || pj.nomeFantasia || "Razão Social não informada"}
                        </p>
                        <p className="text-forest/70 font-mono tabular-nums">
                          CNPJ: {pj.cnpj || "Não cadastrado"}{" "}
                          {pj.inscricaoMunicipal ? `• IM: ${pj.inscricaoMunicipal}` : ""}
                        </p>
                      </>
                    );
                  })()}
                </div>
              )}

              <div className="p-3 bg-warm/30 rounded-xl border border-soft space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-forest/50">
                    Tomador dos Serviços (Paciente)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText(
                        `${pacienteNome} - CPF: ${pacienteCpf || ""}`,
                        "tomador",
                        "Dados do tomador"
                      )
                    }
                    className="text-[10px] font-bold text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === "tomador" ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    Copiar
                  </button>
                </div>
                <p className="font-bold text-forest">{pacienteNome}</p>
                <p className="text-forest/70 font-mono tabular-nums">
                  CPF: {pacienteCpf || "Não cadastrado"}
                </p>
              </div>

              <div className="p-3 bg-warm/30 rounded-xl border border-soft space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-forest/50">
                    Código do Serviço / CNAE
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText(
                        (perfilResolvidoPaciente.via === "PJ"
                          ? perfilResolvidoPaciente.cnae
                          : perfilPjParaNf?.cnae) || "8650-0/03",
                        "cnae",
                        "Código CNAE"
                      )
                    }
                    className="text-[10px] font-bold text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === "cnae" ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    Copiar
                  </button>
                </div>
                <p className="font-bold text-forest font-mono tabular-nums">
                  {(perfilResolvidoPaciente.via === "PJ"
                    ? perfilResolvidoPaciente.cnae
                    : perfilPjParaNf?.cnae) || "8650-0/03"}{" "}
                  <span className="font-sans font-semibold">
                    — Psicologia / Atividades Terapêuticas
                  </span>
                </p>
                <p className="text-[11px] text-forest/60">
                  Subitem LC 116: 04.16 — Psicologia e Psicanálise
                </p>
              </div>

              <div className="p-3 bg-warm/30 rounded-xl border border-soft space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-forest/50">
                    Discriminação dos Serviços
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText(gerarDiscriminacaoNf(), "discrim", "Discriminação")
                    }
                    className="text-[10px] font-bold text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === "discrim" ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    Copiar Texto Completo
                  </button>
                </div>
                <p className="p-2.5 bg-white rounded-lg border border-soft text-[11px] text-forest/80 font-mono leading-relaxed select-all">
                  {gerarDiscriminacaoNf()}
                </p>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-950 block">
                    Valor Total da NFS-e
                  </span>
                  <span className="text-base font-extrabold text-emerald-900 font-mono tabular-nums">
                    {fmtMoeda(metricas.totalGeral)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyText(
                      metricas.totalGeral.toFixed(2).replace(".", ","),
                      "valor",
                      "Valor total"
                    )
                  }
                  className="px-3 py-1.5 bg-white text-emerald-900 font-bold rounded-lg border border-emerald-300 hover:bg-emerald-100 flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === "valor" ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  Copiar Valor
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              {(() => {
                const alvosNf = sessoesFiltradas.filter(
                  (s) => !isSessaoIsentaCobranca(s)
                );
                const todasNfsEmitidas =
                  alvosNf.length > 0 &&
                  alvosNf.every(
                    (s) =>
                      resolveStatusFiscalSessao(s, resolverPerfilDaSessao(s)) === "emitido"
                  );

                return alvosNf.length > 0 ? (
                  <button
                    type="button"
                    onClick={async () => {
                      const idsAlvo = new Set(alvosNf.map((a) => a.id));
                      const hojeIso = new Date().toISOString().split("T")[0];
                      const nextStatus: "emitido" | "pendente" = todasNfsEmitidas
                        ? "pendente"
                        : "emitido";
                      const atualizadas = itensSessoes.map((s) => {
                        if (!idsAlvo.has(s.id)) return sanitizeSessao(s);
                        return sanitizeSessao({
                          ...s,
                          statusFiscal: nextStatus,
                          dataEmissaoFiscal:
                            nextStatus === "emitido" ? hojeIso : undefined,
                        });
                      });
                      setItensSessoes(atualizadas);
                      await onSaveSessoes(atualizadas);
                      showToast(
                        nextStatus === "emitido"
                          ? "NFS-e marcada como Emitida para as sessões do período!"
                          : "Status da NFS-e retornado para Pendente.",
                        "success"
                      );
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      todasNfsEmitidas
                        ? "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100"
                        : "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {todasNfsEmitidas ? "NF Emitida" : "Marcar NF como Emitida"}
                    </span>
                  </button>
                ) : (
                  <span />
                );
              })()}

              <button
                type="button"
                onClick={() => setModalNf(false)}
                className="px-4 py-2 bg-forest text-white font-bold rounded-xl text-xs hover:bg-forest/90 cursor-pointer ml-auto"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================================= */}
      {/* MODAL 3: RECEITA SAÚDE / CARNÊ-LEÃO WEB (PORTAL E-CAC) COM FILTRO DE IRPF                 */}
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

            {/* Resumo de segregação Gerencial vs Fiscal IRPF */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-warm/40 border border-soft">
                <span className="text-[10px] font-bold uppercase text-forest/55 block">
                  Caixa Gerencial
                </span>
                <span className="font-mono tabular-nums font-bold text-forest text-xs">
                  {fmtMoeda(metricas.totalGeral)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-[10px] font-bold uppercase text-stone-500 block">
                  Sem IR / PJ
                </span>
                <span className="font-mono tabular-nums font-bold text-stone-700 text-xs">
                  {fmtMoeda(metricas.totalSemIrOuPj)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] font-bold uppercase text-emerald-900 block">
                  Base IRPF (PF)
                </span>
                <span className="font-mono tabular-nums font-extrabold text-emerald-800 text-xs">
                  {fmtMoeda(metricas.totalTributavelIr)}
                </span>
              </div>
            </div>

            {metricas.qtdTributavelIr === 0 ? (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-2 text-xs text-amber-900">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    {perfilResolvidoPaciente.via === "PJ"
                      ? "Paciente Faturado via Pessoa Jurídica (CNPJ)"
                      : "Sessões Marcadas como Caixa Gerencial (Sem Declaração IRPF)"}
                  </span>
                </div>
                <p className="leading-relaxed">
                  {perfilResolvidoPaciente.via === "PJ" ? (
                    <>
                      As sessões deste período estão vinculadas ao CNPJ{" "}
                      <strong>{formatPerfilCurtoLabel(perfilResolvidoPaciente)}</strong> e são
                      tributadas na Pessoa Jurídica (não entram no Carnê-Leão / Receita Saúde).
                    </>
                  ) : (
                    <>
                      As sessões deste período estão configuradas como{" "}
                      <strong>Caixa / Dinheiro Físico (s/ IR)</strong>. Elas somam normalmente no
                      seu faturamento e lucro gerencial, mas ficam excluídas da exportação do
                      Receita Saúde (e-CAC).
                    </>
                  )}
                </p>
                <p className="text-[11px] text-amber-800/80">
                  Para incluir alguma sessão específica na base do IRPF, clique no botão{" "}
                  <strong>s/ IR → c/ IR</strong> na linha da sessão ou altere o perfil da ficha.
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-forest/70 leading-relaxed">
                  Apenas as <strong>{metricas.qtdTributavelIr} sessão(ões)</strong> marcadas com{" "}
                  <strong>c/ IR</strong> entram no valor abaixo para o módulo{" "}
                  <strong>Receita Saúde</strong> (sessões em Caixa Físico s/ IR ou PJ já foram
                  descontadas automaticamente):
                </p>

                <div className="space-y-2.5 text-xs">
                  <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-blue-950 block">
                        CPF do Beneficiário (Paciente)
                      </span>
                      <span className="font-bold text-forest font-mono tabular-nums">
                        {pacienteCpf || "Pendente de preenchimento"}
                      </span>
                    </div>
                    {pacienteCpf && (
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyText(
                            pacienteCpf.replace(/\D/g, ""),
                            "cpf_receita",
                            "CPF"
                          )
                        }
                        className="px-2.5 py-1 bg-white text-blue-900 font-bold rounded-lg border border-blue-300 hover:bg-blue-100 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === "cpf_receita" ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        Copiar CPF
                      </button>
                    )}
                  </div>

                  <div className="p-3 bg-warm/30 rounded-xl border border-soft flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-forest/60 block">
                        Conta / CPF Profissional Emitente
                      </span>
                      <span className="font-semibold text-forest">
                        {formatPerfilCurtoLabel(perfilResolvidoPaciente)}{" "}
                        {(perfilResolvidoPaciente.cpf || profCpf) && (
                          <span className="font-mono tabular-nums text-forest/70">
                            • CPF: {perfilResolvidoPaciente.cpf || profCpf}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-warm/30 rounded-xl border border-soft flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-forest/60 block">
                        Valor Tributável PF no Período (c/ IR)
                      </span>
                      <span className="font-extrabold text-forest font-mono tabular-nums text-sm">
                        {fmtMoeda(
                          metricas.totalPagoTributavelIr > 0
                            ? metricas.totalPagoTributavelIr
                            : metricas.totalTributavelIr
                        )}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyText(
                          (metricas.totalPagoTributavelIr > 0
                            ? metricas.totalPagoTributavelIr
                            : metricas.totalTributavelIr
                          )
                            .toFixed(2)
                            .replace(".", ","),
                          "val_receita",
                          "Valor tributável"
                        )
                      }
                      className="px-2.5 py-1 bg-white text-forest font-bold rounded-lg border border-soft hover:bg-warm flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === "val_receita" ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      Copiar Valor
                    </button>
                  </div>
                </div>

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
      {/* MODAL 4: SELECIONAR PERFIL DE FATURAMENTO DO PACIENTE (MÚLTIPLOS CPFs, CAIXA E CNPJs)      */}
      {/* ========================================================================================= */}
      {modalAlterarPerfil && (
        <div className="fixed inset-0 z-[60] bg-forest/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-soft shadow-2xl max-w-xl w-full p-6 space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-soft">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-700" />
                <h3 className="font-serif font-bold text-base text-forest">
                  Perfil de Recebimento & Faturamento deste Paciente
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
              Escolha qual conta CPF, Caixa em Dinheiro Físico ou empresa CNPJ será o padrão para{" "}
              <strong className="text-forest">{pacienteNome}</strong>. Você também pode criar quantos perfis precisar:
            </p>

            {/* Grupo 1: Via CPF & Caixa Físico */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-forest/60">
                  Via Pessoa Física & Caixa Físico ({perfisPFLista.length})
                </span>
              </div>
              <div className="space-y-2">
                {perfisPFLista.map((item) => {
                  const selecionado = perfilResolvidoPaciente.id === item.id;
                  const isCaixa = item.subtipo === "dinheiro_fisico";
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelecionarPerfilEspecifico(item)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                        selecionado
                          ? "bg-emerald-50/70 border-emerald-500 ring-1 ring-emerald-500"
                          : "bg-white hover:bg-warm/40 border-soft"
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isCaixa
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {isCaixa ? (
                            <Banknote className="w-4 h-4" />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-forest text-xs sm:text-sm">
                              {item.apelido}
                            </h4>
                            <span className="text-[11px] text-forest/60">
                              · {item.declararIr ? "Com IRPF (Receita Saúde)" : "Sem IRPF (Caixa Gerencial)"}
                            </span>
                            {selecionado && (
                              <span className="text-[10px] font-bold text-emerald-800">
                                · Ativo nesta ficha
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-forest/70 mt-0.5 font-mono tabular-nums">
                            {isCaixa
                              ? "Recebimento em espécie · Soma no caixa gerencial sem compor Carnê-Leão"
                              : `Titular: ${item.titularNome || profNome} · CPF: ${
                                  item.cpf || profCpf || "Não informado"
                                }${item.chavePix ? ` · Pix: ${item.chavePix}` : ""}`}
                          </p>
                        </div>
                      </div>
                      {selecionado && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-1" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Grupo 2: Via CNPJ */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-forest/60">
                  Via Pessoa Jurídica — Empresas CNPJ ({perfisPJLista.length})
                </span>
              </div>
              {perfisPJLista.length === 0 ? (
                <div className="p-3.5 rounded-2xl border border-dashed border-soft bg-warm/20 flex items-center justify-between gap-3 text-xs">
                  <span className="text-forest/65">
                    Nenhuma empresa CNPJ cadastrada ainda.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setModalAlterarPerfil(false);
                      setShowGerenciarPerfisModal(true);
                    }}
                    className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs cursor-pointer whitespace-nowrap"
                  >
                    + Cadastrar CNPJ
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {perfisPJLista.map((item) => {
                    const selecionado = perfilResolvidoPaciente.id === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelecionarPerfilEspecifico(item)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                          selecionado
                            ? "bg-blue-50/70 border-blue-500 ring-1 ring-blue-500"
                            : "bg-white hover:bg-warm/40 border-soft"
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-forest text-xs sm:text-sm">
                                {item.apelido || item.nomeFantasia || item.razaoSocial}
                              </h4>
                              <span className="text-[11px] text-blue-800 font-medium">
                                · NFS-e / PJ
                              </span>
                              {selecionado && (
                                <span className="text-[10px] font-bold text-blue-800">
                                  · Ativo nesta ficha
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-forest/70 mt-0.5 font-mono tabular-nums">
                              {item.razaoSocial || "Razão Social a preencher"} · CNPJ:{" "}
                              {item.cnpj || "Não informado"}
                              {item.chavePixPJ ? ` · Pix PJ: ${item.chavePixPJ}` : ""}
                            </p>
                          </div>
                        </div>
                        {selecionado && (
                          <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0 mt-1" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-soft flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setModalAlterarPerfil(false);
                  setShowGerenciarPerfisModal(true);
                }}
                className="px-3.5 py-2 bg-forest/5 hover:bg-forest/10 text-forest rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Gerenciar / Criar Contas CPF, Caixa ou CNPJ</span>
              </button>

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

      {/* MODAL GERENCIADOR COMPLETO DE MÚLTIPLOS PERFIS DE FATURAMENTO */}
      <PerfisFaturamentoManagerModal
        isOpen={showGerenciarPerfisModal}
        onClose={() => setShowGerenciarPerfisModal(false)}
        perfis={listaPerfis}
        onSavePerfis={handleSalvarCarteiraPerfis}
        profissionalNomePadrao={profNome}
        showToast={showToast}
      />

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE SESSÃO (100% IN-APP) */}
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
                  <strong className="text-forest font-mono tabular-nums font-semibold">
                    {fmtDataBr(sessaoParaExcluir.data)}
                  </strong>{" "}
                  no valor de{" "}
                  <strong className="text-forest font-mono tabular-nums font-semibold">
                    {fmtMoeda(sessaoParaExcluir.valor)}
                  </strong>
                  ?
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
