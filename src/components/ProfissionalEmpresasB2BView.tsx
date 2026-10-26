import React, { useState, useMemo } from "react";
import {
  Building2,
  Briefcase,
  Plus,
  Search,
  DollarSign,
  CheckCircle2,
  Clock,
  TrendingUp,
  FileText,
  FileSpreadsheet,
  MessageCircle,
  Download,
  Settings,
  Phone,
  Mail,
  Trash2,
  X,
  Check,
  AlertCircle,
  ExternalLink,
  Calendar,
  Wallet,
  TrendingDown,
} from "lucide-react";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import {
  EmpresaClienteB2B,
  StatusEmpresaB2B,
  STATUS_EMPRESA_B2B_LABELS,
} from "../types/empresaB2B";
import {
  PerfilFaturamentoItem,
  normalizePerfisFaturamento,
  resolvePerfilFaturamentoAtivo,
  formatPerfilCurtoLabel,
  formatPerfilSelectOption,
  getPerfilDocumentoCurto,
  extractLegacySyncFields,
} from "../types/faturamento";
import { PerfisFaturamentoManagerModal } from "./PerfisFaturamentoManagerModal";
import { formatCnpj, isValidCnpj, getCnpjValidationError } from "../utils/formatters";
import {
  ProfissionalDespesasDashboard,
  resolveStoredExpenses,
  filterExpensesByCriteria,
} from "./ProfissionalDespesasDashboard";

interface ProfissionalEmpresasB2BViewProps {
  empresasB2B: EmpresaClienteB2B[];
  onSelecionarEmpresa: (empresa: EmpresaClienteB2B) => void;
  profile: any;
  user: any;
  onUpdateProfileLocal?: (patch: Record<string, any>) => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export const ProfissionalEmpresasB2BView: React.FC<ProfissionalEmpresasB2BViewProps> = ({
  empresasB2B,
  onSelecionarEmpresa,
  profile,
  user,
  onUpdateProfileLocal,
  showToast,
}) => {
  const [modoVisao, setModoVisao] = useState<"carteira" | "dashboard" | "despesas">(
    "carteira"
  );

  // Filtros da Carteira
  const [buscaCarteira, setBuscaCarteira] = useState("");
  const [filtroStatusComercial, setFiltroStatusComercial] = useState<
    "todas" | StatusEmpresaB2B
  >("todas");
  const [filtroEmissorCarteira, setFiltroEmissorCarteira] = useState<string>("todos");

  // Filtros do Dashboard B2B Próprio
  const hoje = new Date();
  const mesAtualStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
  const [competenciaB2B, setCompetenciaB2B] = useState<string>(mesAtualStr);
  const [filtroEmissorB2B, setFiltroEmissorB2B] = useState<string>("todos");
  const [buscaDashboard, setBuscaDashboard] = useState<string>("");

  // Modais
  const [showNovaEmpresaModal, setShowNovaEmpresaModal] = useState(false);
  const [salvandoNova, setSalvandoNova] = useState(false);
  const [empresaParaExcluir, setEmpresaParaExcluir] =
    useState<EmpresaClienteB2B | null>(null);
  const [showGerenciarPerfisModal, setShowGerenciarPerfisModal] = useState(false);

  const perfisFaturamento = useMemo(
    () => normalizePerfisFaturamento(profile),
    [profile]
  );

  const perfilPadraoInicial = useMemo(() => {
    const pjPadrao = perfisFaturamento.find((p) => p.via === "PJ" && p.padrao);
    const primeiroPj = perfisFaturamento.find((p) => p.via === "PJ");
    return pjPadrao || primeiroPj || perfisFaturamento[0];
  }, [perfisFaturamento]);

  const [formNova, setFormNova] = useState({
    nomeFantasia: "",
    razaoSocial: "",
    cnpj: "",
    ramoAtividade: "Tecnologia / Serviços",
    cidade: "",
    uf: "",
    contatoNome: "",
    contatoCargo: "RH / Gestão de Pessoas",
    contatoTelefone: "",
    contatoEmail: "",
    emailFinanceiroNf: "",
    condicaoPagamentoPadrao: "15 dias após emissão da NFS-e",
    valorServicoPadrao: "1500",
    statusComercial: "ativa_recorrente" as StatusEmpresaB2B,
    perfilFaturamentoId: "",
  });

  const formatCnpjMask = (raw: string) => formatCnpj(raw);

  const formatTelMask = (raw: string) => {
    const d = raw.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  const fmtMoeda = (val: number) =>
    `R$ ${Number(val || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const fmtMesExtenso = (strAnoMes: string) => {
    if (!strAnoMes || strAnoMes === "todas") return "Todas as Competências";
    const [ano, mes] = strAnoMes.split("-");
    const meses = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
    ];
    const idx = parseInt(mes, 10) - 1;
    return `${meses[idx] || mes} de ${ano}`;
  };

  const profIdEfetivo = profile?.uid || user?.uid || "prof_default";

  const todasDespesasProfissional = useMemo(
    () => resolveStoredExpenses(profIdEfetivo, profile?.despesasProfissionais),
    [profIdEfetivo, profile?.despesasProfissionais]
  );

  // Meses presentes nos históricos de serviços B2B e despesas B2B
  const mesesDisponiveis = useMemo(() => {
    const setM = new Set<string>();
    setM.add(mesAtualStr);
    (empresasB2B || []).forEach((emp) => {
      (emp.historicoServicos || []).forEach((s) => {
        if (s.data && s.data.length >= 7) {
          setM.add(s.data.substring(0, 7));
        }
      });
    });
    todasDespesasProfissional.forEach((d) => {
      if (d.setor === "empresa_b2b" && d.date && d.date.length >= 7) {
        setM.add(d.date.substring(0, 7));
      }
    });
    return Array.from(setM).sort().reverse();
  }, [empresasB2B, todasDespesasProfissional, mesAtualStr]);

  const despesasB2BResumo = useMemo(() => {
    const listaB2BPeriodo = filterExpensesByCriteria(todasDespesasProfissional, {
      competencia: competenciaB2B,
      setor: "empresa_b2b",
    });
    const todasB2BCount = filterExpensesByCriteria(todasDespesasProfissional, {
      competencia: "todas",
      setor: "empresa_b2b",
    }).length;

    const porEmpresaMap = new Map<string, number>();
    let custoGeral = 0;
    let custoEspecifico = 0;

    listaB2BPeriodo.forEach((exp) => {
      const val = Number(exp.amount) || 0;
      if (exp.centroCustoTipo === "especifico" && exp.empresaB2BId) {
        custoEspecifico += val;
        porEmpresaMap.set(
          exp.empresaB2BId,
          (porEmpresaMap.get(exp.empresaB2BId) || 0) + val
        );
      } else {
        custoGeral += val;
      }
    });

    return {
      totalPeriodo: custoGeral + custoEspecifico,
      custoGeral,
      custoEspecifico,
      porEmpresaMap,
      qtdPeriodo: listaB2BPeriodo.length,
      todasB2BCount,
    };
  }, [todasDespesasProfissional, competenciaB2B]);

  // Consolidação Financeira B2B para o Dashboard Próprio e Resumo da Carteira
  const consolidadoB2B = useMemo(() => {
    const porPerfilMap = new Map<string, { label: string; via: string; valor: number }>();

    const linhas = (empresasB2B || []).map((emp) => {
      const servicosEmp = Array.isArray(emp.historicoServicos)
        ? emp.historicoServicos
        : [];

      const servicosCompetencia = servicosEmp.filter((s) => {
        if (s.statusExecucao === "cancelado") return false;
        if (competenciaB2B !== "todas" && (!s.data || !s.data.startsWith(competenciaB2B))) {
          return false;
        }
        const pLinha = resolvePerfilFaturamentoAtivo(
          perfisFaturamento,
          s.perfilFaturamentoId || emp.perfilFaturamentoId,
          s.viaFaturamento || emp.perfilFaturamento || "PJ"
        );
        if (filtroEmissorB2B === "PF" && pLinha.via !== "PF") return false;
        if (filtroEmissorB2B === "PJ" && pLinha.via !== "PJ") return false;
        if (
          filtroEmissorB2B !== "todos" &&
          filtroEmissorB2B !== "PF" &&
          filtroEmissorB2B !== "PJ" &&
          pLinha.id !== filtroEmissorB2B
        ) {
          return false;
        }
        return true;
      });

      let faturado = 0;
      let recebido = 0;
      let nfsPendentes = 0;

      servicosCompetencia.forEach((s) => {
        const val = Number(s.valor) || 0;
        faturado += val;
        if (s.statusPagamento === "pago") recebido += val;
        if (s.statusNotaFiscal === "pendente") nfsPendentes++;

        const pLinha = resolvePerfilFaturamentoAtivo(
          perfisFaturamento,
          s.perfilFaturamentoId || emp.perfilFaturamentoId,
          s.viaFaturamento || emp.perfilFaturamento || "PJ"
        );
        const atual = porPerfilMap.get(pLinha.id) || {
          label: formatPerfilCurtoLabel(pLinha),
          via: pLinha.via,
          valor: 0,
        };
        atual.valor += val;
        porPerfilMap.set(pLinha.id, atual);
      });

      const pendente = Math.max(0, faturado - recebido);
      const perfilPadraoEmp = resolvePerfilFaturamentoAtivo(
        perfisFaturamento,
        emp.perfilFaturamentoId,
        emp.perfilFaturamento || "PJ"
      );

      return {
        empresa: emp,
        perfilPadraoEmp,
        qtdServicos: servicosCompetencia.length,
        faturado,
        recebido,
        pendente,
        nfsPendentes,
      };
    });

    const linhasFiltradas = linhas.filter((l) => {
      if (!buscaDashboard.trim()) return true;
      const t = buscaDashboard.toLowerCase();
      return (
        (l.empresa.nomeFantasia || "").toLowerCase().includes(t) ||
        (l.empresa.razaoSocial || "").toLowerCase().includes(t) ||
        (l.empresa.cnpj || "").toLowerCase().includes(t) ||
        (l.empresa.contatoNome || "").toLowerCase().includes(t)
      );
    });

    const totalFaturado = linhasFiltradas.reduce((acc, l) => acc + l.faturado, 0);
    const totalRecebido = linhasFiltradas.reduce((acc, l) => acc + l.recebido, 0);
    const totalPendente = linhasFiltradas.reduce((acc, l) => acc + l.pendente, 0);
    const totalServicos = linhasFiltradas.reduce((acc, l) => acc + l.qtdServicos, 0);
    const ticketMedio = totalServicos > 0 ? totalFaturado / totalServicos : 0;

    return {
      linhas: linhasFiltradas.sort((a, b) => b.faturado - a.faturado),
      totalFaturado,
      totalRecebido,
      totalPendente,
      totalServicos,
      ticketMedio,
      resumoPorPerfil: Array.from(porPerfilMap.values()),
    };
  }, [empresasB2B, competenciaB2B, filtroEmissorB2B, buscaDashboard, perfisFaturamento]);

  // Filtro da Carteira de Empresas
  const empresasCarteiraFiltradas = useMemo(() => {
    return (empresasB2B || []).filter((emp) => {
      if (
        filtroStatusComercial !== "todas" &&
        emp.statusComercial !== filtroStatusComercial
      ) {
        return false;
      }
      if (filtroEmissorCarteira !== "todos") {
        const pEmissor = resolvePerfilFaturamentoAtivo(
          perfisFaturamento,
          emp.perfilFaturamentoId,
          emp.perfilFaturamento || "PJ"
        );
        if (
          pEmissor.via !== filtroEmissorCarteira &&
          pEmissor.id !== filtroEmissorCarteira
        ) {
          return false;
        }
      }
      if (!buscaCarteira.trim()) return true;
      const t = buscaCarteira.toLowerCase();
      return (
        (emp.nomeFantasia || "").toLowerCase().includes(t) ||
        (emp.razaoSocial || "").toLowerCase().includes(t) ||
        (emp.cnpj || "").toLowerCase().includes(t) ||
        (emp.contatoNome || "").toLowerCase().includes(t)
      );
    });
  }, [empresasB2B, filtroStatusComercial, filtroEmissorCarteira, perfisFaturamento, buscaCarteira]);

  const handleSavePerfisNoPerfil = async (novosPerfis: PerfilFaturamentoItem[]) => {
    const profId = profile?.uid || user?.uid;
    if (!profId) return;
    const syncPayload = extractLegacySyncFields(
      novosPerfis,
      profile?.cpf,
      profile?.chavePix || profile?.pixKey
    );
    try {
      await updateDoc(doc(db, "users", profId), {
        ...syncPayload,
        updatedAt: serverTimestamp(),
      });
      if (onUpdateProfileLocal) {
        onUpdateProfileLocal(syncPayload);
      }
    } catch (err) {
      try {
        handleFirestoreError(err, OperationType.UPDATE, `users/${profId}`);
      } catch {}
      throw err;
    }
  };

  const handleCadastrarEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    const profId = profile?.uid || user?.uid;
    if (!profId) return;

    if (!formNova.nomeFantasia.trim() && !formNova.razaoSocial.trim()) {
      showToast("Informe o Nome Fantasia ou a Razão Social da empresa.", "error");
      return;
    }

    if (formNova.cnpj.trim()) {
      const cnpjErr = getCnpjValidationError(formNova.cnpj, false);
      if (cnpjErr) {
        showToast(cnpjErr, "error");
        return;
      }
    }

    const perfilEscolhido =
      perfisFaturamento.find((p) => p.id === formNova.perfilFaturamentoId) ||
      perfilPadraoInicial;

    setSalvandoNova(true);
    try {
      const payload = {
        profissionalId: profId,
        profissionalNome: profile?.name || profile?.nome || "",
        nomeFantasia:
          formNova.nomeFantasia.trim() || formNova.razaoSocial.trim(),
        razaoSocial:
          formNova.razaoSocial.trim() || formNova.nomeFantasia.trim(),
        cnpj: formNova.cnpj.trim() ? formatCnpj(formNova.cnpj) : "",
        ramoAtividade: formNova.ramoAtividade.trim(),
        cidade: formNova.cidade.trim(),
        uf: formNova.uf.trim().toUpperCase(),
        contatoNome: formNova.contatoNome.trim(),
        contatoCargo: formNova.contatoCargo.trim(),
        contatoTelefone: formNova.contatoTelefone.trim(),
        contatoEmail: formNova.contatoEmail.trim(),
        emailFinanceiroNf:
          formNova.emailFinanceiroNf.trim() || formNova.contatoEmail.trim(),
        condicaoPagamentoPadrao: formNova.condicaoPagamentoPadrao.trim(),
        valorServicoPadrao:
          parseFloat(String(formNova.valorServicoPadrao).replace(",", ".")) || 1500,
        statusComercial: formNova.statusComercial,
        perfilFaturamento: perfilEscolhido?.via || "PJ",
        perfilFaturamentoId: perfilEscolhido?.id || "pf_principal",
        historicoServicos: [],
        registrosBordo: [],
        propostaContrato: {
          periodicidade:
            formNova.statusComercial === "ativa_recorrente"
              ? "Mensal Recorrente"
              : "Projeto Pontual / Evento",
          valorAcordadoPadrao:
            parseFloat(String(formNova.valorServicoPadrao).replace(",", ".")) || 1500,
          condicaoPagamento: formNova.condicaoPagamentoPadrao.trim(),
          statusContrato: "rascunho",
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "empresas_profissional"), payload);
      setShowNovaEmpresaModal(false);
      setFormNova({
        nomeFantasia: "",
        razaoSocial: "",
        cnpj: "",
        ramoAtividade: "Tecnologia / Serviços",
        cidade: "",
        uf: "",
        contatoNome: "",
        contatoCargo: "RH / Gestão de Pessoas",
        contatoTelefone: "",
        contatoEmail: "",
        emailFinanceiroNf: "",
        condicaoPagamentoPadrao: "15 dias após emissão da NFS-e",
        valorServicoPadrao: "1500",
        statusComercial: "ativa_recorrente",
        perfilFaturamentoId: "",
      });
      showToast("Empresa cliente adicionada à sua carteira B2B!", "success");

      onSelecionarEmpresa({
        id: docRef.id,
        ...(payload as any),
      });
    } catch (err) {
      console.error("Erro ao cadastrar empresa B2B:", err);
      try {
        handleFirestoreError(err, OperationType.CREATE, "empresas_profissional");
      } catch {}
      showToast("Erro ao salvar empresa cliente.", "error");
    } finally {
      setSalvandoNova(false);
    }
  };

  const handleConfirmarExclusaoEmpresa = async () => {
    if (!empresaParaExcluir) return;
    try {
      await deleteDoc(doc(db, "empresas_profissional", empresaParaExcluir.id));
      showToast(
        `Empresa "${empresaParaExcluir.nomeFantasia}" removida da carteira.`,
        "info"
      );
      setEmpresaParaExcluir(null);
    } catch (err) {
      try {
        handleFirestoreError(
          err,
          OperationType.DELETE,
          `empresas_profissional/${empresaParaExcluir.id}`
        );
      } catch {}
      showToast("Erro ao excluir empresa.", "error");
    }
  };

  const handleExportarCsvB2B = () => {
    if (consolidadoB2B.linhas.length === 0) {
      showToast("Nenhum dado B2B no período para exportar.", "info");
      return;
    }
    const cab = [
      "Empresa_Fantasia",
      "Razao_Social",
      "CNPJ",
      "Contato_RH",
      "Perfil_Emissor",
      "Servicos_Periodo",
      "Faturado_RS",
      "Recebido_RS",
      "Pendente_RS",
      "NFs_Pendentes",
    ];
    const rows = consolidadoB2B.linhas.map((l) => [
      `"${(l.empresa.nomeFantasia || "").replace(/"/g, '""')}"`,
      `"${(l.empresa.razaoSocial || "").replace(/"/g, '""')}"`,
      `"${l.empresa.cnpj || ""}"`,
      `"${(l.empresa.contatoNome || "").replace(/"/g, '""')}"`,
      `"${formatPerfilCurtoLabel(l.perfilPadraoEmp)} (${l.perfilPadraoEmp.via})"`,
      l.qtdServicos,
      l.faturado.toFixed(2),
      l.recebido.toFixed(2),
      l.pendente.toFixed(2),
      l.nfsPendentes,
    ]);
    const csv =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [cab.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute("download", `faturamento_empresas_b2b_${competenciaB2B}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Planilha B2B exportada com sucesso!", "success");
  };

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6 md:p-8 flex flex-col gap-6 slide-up">
      <div className="max-w-6xl w-full mx-auto space-y-6">
        {/* CABEÇALHO DA ÁREA B2B COM SELETOR CARTEIRA VS DASHBOARD B2B */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-soft flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-forest text-white flex items-center justify-center shrink-0">
                <Briefcase className="w-5 h-5 text-sun" />
              </div>
              <div className="min-w-0">
                <h2 className="font-serif text-base sm:text-lg font-bold text-forest truncate">
                  Prestação de Serviços a Empresas (B2B)
                </h2>
                <p className="text-xs text-forest/65 truncate">
                  Gestão privada de empresas clientes, palestras, consultorias NR-1 e faturamento corporativo integrado ao painel global
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                type="button"
                onClick={() => setShowGerenciarPerfisModal(true)}
                className="px-3.5 py-2 bg-warm hover:bg-soft text-forest text-xs font-semibold rounded-xl border border-soft flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Settings className="w-3.5 h-3.5 text-forest/70" />
                <span>Perfis CPF / CNPJ ({perfisFaturamento.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setShowNovaEmpresaModal(true)}
                className="px-4 py-2 bg-forest hover:bg-forest/90 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4 text-sun" />
                <span>+ Nova Empresa Cliente</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-soft/70">
            <div className="inline-flex items-center gap-1 p-1 bg-warm/70 rounded-xl border border-soft overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setModoVisao("carteira")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  modoVisao === "carteira"
                    ? "bg-white text-forest shadow-2xs border border-soft"
                    : "text-forest/65 hover:text-forest"
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-forest" />
                <span>Carteira de Empresas ({empresasB2B.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setModoVisao("dashboard")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  modoVisao === "dashboard"
                    ? "bg-white text-emerald-900 shadow-2xs border border-emerald-200"
                    : "text-forest/65 hover:text-forest"
                }`}
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
                <span>Dashboard Financeiro B2B</span>
              </button>
              <button
                type="button"
                onClick={() => setModoVisao("despesas")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  modoVisao === "despesas"
                    ? "bg-white text-rose-900 shadow-2xs border border-rose-200"
                    : "text-forest/65 hover:text-forest"
                }`}
              >
                <Wallet className="w-3.5 h-3.5 text-rose-700" />
                <span>
                  Despesas & Centros de Custo ({despesasB2BResumo.todasB2BCount})
                </span>
              </button>
            </div>

            <div className="text-xs text-forest/65 flex items-center gap-2 flex-wrap tabular-nums">
              <span>
                Faturado ({competenciaB2B === "todas" ? "geral" : fmtMesExtenso(competenciaB2B)}):{" "}
                <strong className="text-forest font-mono">
                  {fmtMoeda(consolidadoB2B.totalFaturado)}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Despesas B2B:{" "}
                <strong className="text-rose-700 font-mono">
                  {fmtMoeda(despesasB2BResumo.totalPeriodo)}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Resultado:{" "}
                <strong
                  className={`font-mono ${
                    consolidadoB2B.totalFaturado - despesasB2BResumo.totalPeriodo >= 0
                      ? "text-emerald-800"
                      : "text-rose-700"
                  }`}
                >
                  {fmtMoeda(
                    consolidadoB2B.totalFaturado - despesasB2BResumo.totalPeriodo
                  )}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* VISÃO 1: CARTEIRA DE EMPRESAS CLIENTES                                */}
        {/* ===================================================================== */}
        {modoVisao === "carteira" ? (
          <div className="space-y-4">
            {/* Barra de Busca e Filtros de Status Comercial */}
            <div className="bg-white p-3.5 rounded-2xl border border-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1 p-1 bg-warm/60 rounded-xl border border-soft overflow-x-auto">
                {[
                  { id: "todas", label: "Todas" },
                  { id: "ativa_recorrente", label: "Ativas · Recorrentes" },
                  { id: "projeto_pontual", label: "Projetos Pontuais" },
                  { id: "prospeccao", label: "Prospecção" },
                  { id: "encerrada", label: "Encerradas" },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setFiltroStatusComercial(st.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      filtroStatusComercial === st.id
                        ? "bg-white text-forest shadow-2xs font-bold"
                        : "text-forest/65 hover:text-forest"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={filtroEmissorCarteira}
                  onChange={(e) => setFiltroEmissorCarteira(e.target.value)}
                  className="px-3 py-2 bg-warm/35 border border-soft rounded-xl text-xs font-semibold text-forest outline-none focus:border-forest cursor-pointer max-w-[230px]"
                  title="Filtrar por Perfil Emissor (PF / PJ)"
                >
                  <option value="todos">Todos os Perfis (PF + PJ)</option>
                  <option value="PF">Somente Pessoa Física (PF)</option>
                  <option value="PJ">Somente Pessoa Jurídica (PJ)</option>
                  {perfisFaturamento.map((p) => (
                    <option key={p.id} value={p.id}>
                      {formatPerfilSelectOption(p)}
                    </option>
                  ))}
                </select>

                <div className="relative flex items-center flex-1 sm:flex-initial">
                  <Search className="w-3.5 h-3.5 text-forest/45 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={buscaCarteira}
                    onChange={(e) => setBuscaCarteira(e.target.value)}
                    placeholder="Buscar por empresa, CNPJ ou contato..."
                    className="pl-8 pr-3 py-2 bg-warm/35 border border-soft rounded-xl text-xs text-forest outline-none focus:border-forest w-full sm:w-60"
                  />
                </div>
              </div>
            </div>

            {/* Lista de Empresas em Linhas Horizontais Limpas */}
            {empresasCarteiraFiltradas.length === 0 ? (
              <div className="bg-white p-10 rounded-2xl border border-dashed border-soft text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-warm text-forest mx-auto flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-forest/70" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif font-bold text-base text-forest">
                    {buscaCarteira.trim()
                      ? "Nenhuma empresa encontrada para esta busca"
                      : "Sua carteira de empresas clientes B2B está pronta para uso"}
                  </h3>
                  <p className="text-xs text-forest/65 max-w-md mx-auto leading-relaxed">
                    Registre empresas para as quais você vende palestras, consultorias NR-1, treinamentos, rodas de conversa ou plantões, com Ficha de Bordo, contrato e faturamento em linhas.
                  </p>
                </div>
                {!buscaCarteira.trim() && (
                  <button
                    type="button"
                    onClick={() => setShowNovaEmpresaModal(true)}
                    className="px-4 py-2 bg-forest hover:bg-forest/90 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-sun" />
                    <span>Cadastrar Primeira Empresa Cliente</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {empresasCarteiraFiltradas.map((emp) => {
                  const servs = (emp.historicoServicos || []).filter(
                    (s) => s.statusExecucao !== "cancelado"
                  );
                  const totalEmp = servs.reduce(
                    (sum, s) => sum + (Number(s.valor) || 0),
                    0
                  );
                  const pagoEmp = servs
                    .filter((s) => s.statusPagamento === "pago")
                    .reduce((sum, s) => sum + (Number(s.valor) || 0), 0);
                  const pendEmp = Math.max(0, totalEmp - pagoEmp);
                  const pEmissor = resolvePerfilFaturamentoAtivo(
                    perfisFaturamento,
                    emp.perfilFaturamentoId,
                    emp.perfilFaturamento || "PJ"
                  );
                  const telDigits = (emp.contatoTelefone || "").replace(/\D/g, "");
                  const waHref = telDigits
                    ? `https://wa.me/${
                        telDigits.startsWith("55") ? telDigits : `55${telDigits}`
                      }`
                    : "";

                  return (
                    <div
                      key={emp.id}
                      className="bg-white rounded-2xl border border-soft hover:border-forest/35 transition-colors p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                    >
                      {/* Identificação da Empresa */}
                      <div
                        onClick={() => onSelecionarEmpresa(emp)}
                        className="flex items-start sm:items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-xl bg-warm text-forest font-serif font-bold text-sm flex items-center justify-center border border-soft shrink-0">
                          {(emp.nomeFantasia || emp.razaoSocial || "E")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-sm text-forest hover:underline truncate">
                              {emp.nomeFantasia || emp.razaoSocial}
                            </h4>
                            <span className="text-[11px] text-forest/65">
                              ·{" "}
                              {STATUS_EMPRESA_B2B_LABELS[emp.statusComercial] ||
                                "Ativa"}
                            </span>
                          </div>
                          <div className="text-[11px] text-forest/65 flex items-center gap-2 flex-wrap mt-0.5 tabular-nums">
                            {emp.cnpj && (
                              <span className="font-mono">CNPJ {emp.cnpj}</span>
                            )}
                            {emp.contatoNome && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>
                                  RH: {emp.contatoNome}
                                  {emp.contatoTelefone ? ` (${emp.contatoTelefone})` : ""}
                                </span>
                              </>
                            )}
                            <span aria-hidden="true">·</span>
                            <span>
                              Emissor: <strong>[{pEmissor.via}]</strong>{" "}
                              {formatPerfilCurtoLabel(pEmissor)} ·{" "}
                              <span className="font-mono">
                                {getPerfilDocumentoCurto(pEmissor)}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Resumo Financeiro em Linha + Botões */}
                      <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-soft/70 shrink-0">
                        <div className="flex items-center gap-3 text-xs tabular-nums">
                          <div className="text-right">
                            <span className="text-[10px] text-forest/50 block">
                              Serviços ({servs.length})
                            </span>
                            <span className="font-mono font-bold text-forest">
                              {fmtMoeda(totalEmp)}
                            </span>
                          </div>
                          {pendEmp > 0 && (
                            <div className="text-right">
                              <span className="text-[10px] text-amber-800 block">
                                Em aberto
                              </span>
                              <span className="font-mono font-bold text-amber-700">
                                {fmtMoeda(pendEmp)}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelecionarEmpresa(emp)}
                            className="px-3 py-1.5 bg-forest hover:bg-forest/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                          >
                            <FileText className="w-3.5 h-3.5 text-sun" />
                            <span>Ficha de Bordo</span>
                          </button>

                          {waHref && (
                            <a
                              href={waHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-200 transition-colors"
                              title="Conversar com o RH / Financeiro no WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => setEmpresaParaExcluir(emp)}
                            className="p-2 text-forest/45 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="Remover empresa da carteira"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : modoVisao === "despesas" ? (
          /* ===================================================================== */
          /* VISÃO 3: DESPESAS & CENTROS DE CUSTO EMPRESAS (B2B)                   */
          /* ===================================================================== */
          <ProfissionalDespesasDashboard
            mode="b2b"
            profissionalId={profIdEfetivo}
            empresasB2B={empresasB2B}
            competenciaSelecionada={competenciaB2B}
            initialExpenses={profile?.despesasProfissionais}
            onExpensesChange={(nextList) => {
              if (onUpdateProfileLocal) {
                onUpdateProfileLocal({ despesasProfissionais: nextList });
              }
            }}
            showToast={showToast}
          />
        ) : (
          /* ===================================================================== */
          /* VISÃO 2: DASHBOARD FINANCEIRO B2B PRÓPRIO                             */
          /* ===================================================================== */
          <div className="space-y-5">
            {/* Barra de Filtros do Dashboard B2B */}
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-soft flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 bg-warm/40 px-3 py-1.5 rounded-xl border border-soft h-9">
                  <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span className="text-[10px] font-bold uppercase text-forest/60">
                    Competência:
                  </span>
                  <select
                    value={competenciaB2B}
                    onChange={(e) => setCompetenciaB2B(e.target.value)}
                    className="bg-transparent font-bold text-forest outline-none cursor-pointer"
                  >
                    <option value="todas">Todas as Competências</option>
                    {mesesDisponiveis.map((m) => (
                      <option key={m} value={m}>
                        {fmtMesExtenso(m)} {m === mesAtualStr ? "· Atual" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 bg-warm/30 px-3 py-1.5 rounded-xl border border-soft h-9">
                  <span className="text-[10px] font-bold uppercase text-forest/60">
                    Emissor:
                  </span>
                  <select
                    value={filtroEmissorB2B}
                    onChange={(e) => setFiltroEmissorB2B(e.target.value)}
                    className="bg-transparent font-semibold text-forest outline-none cursor-pointer"
                  >
                    <option value="todos">Todos os Perfis</option>
                    <option value="PJ">Apenas CNPJ (PJ)</option>
                    <option value="PF">Apenas CPF / Caixa (PF)</option>
                    {perfisFaturamento.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.via}] {formatPerfilCurtoLabel(p)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-forest/40 absolute left-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={buscaDashboard}
                    onChange={(e) => setBuscaDashboard(e.target.value)}
                    placeholder="Filtrar empresa ou CNPJ..."
                    className="pl-8 pr-3 py-1.5 bg-warm/30 border border-soft rounded-xl text-xs text-forest outline-none h-9 w-48 sm:w-56"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleExportarCsvB2B}
                  className="px-3 py-1.5 bg-warm hover:bg-forest hover:text-white text-forest font-semibold rounded-xl border border-soft transition-colors flex items-center gap-1.5 h-9 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Exportar CSV B2B</span>
                </button>
              </div>
            </div>

            {/* 4 KPIs Executivos B2B */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-4 rounded-2xl border border-soft flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between text-forest/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Faturamento B2B
                  </span>
                  <DollarSign className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-extrabold text-forest font-serif tabular-nums">
                    {fmtMoeda(consolidadoB2B.totalFaturado)}
                  </div>
                  <span className="text-[11px] text-forest/60 block mt-0.5 tabular-nums">
                    {consolidadoB2B.totalServicos} serviço(s) corporativo(s)
                  </span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between text-emerald-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Recebido em Conta
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 font-serif tabular-nums">
                    {fmtMoeda(consolidadoB2B.totalRecebido)}
                  </div>
                  <span className="text-[11px] text-emerald-800/80 block mt-0.5">
                    Já liquidado pelas empresas
                  </span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-amber-200/80 flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between text-amber-900">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Notas / Valores em Aberto
                  </span>
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <div
                    className={`text-xl sm:text-2xl font-extrabold font-serif tabular-nums ${
                      consolidadoB2B.totalPendente > 0
                        ? "text-amber-800"
                        : "text-forest/40"
                    }`}
                  >
                    {fmtMoeda(consolidadoB2B.totalPendente)}
                  </div>
                  <span className="text-[11px] text-amber-900/75 block mt-0.5">
                    Aguardando faturamento / prazo NF
                  </span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-soft flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between text-forest/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Ticket Médio B2B
                  </span>
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-extrabold text-blue-950 font-serif tabular-nums">
                    {fmtMoeda(consolidadoB2B.ticketMedio)}
                  </div>
                  <span className="text-[11px] text-forest/60 block mt-0.5">
                    Média por entrega corporativa
                  </span>
                </div>
              </div>
            </div>

            {/* Quebra por Perfil Emissor (se houver movimento) */}
            {consolidadoB2B.resumoPorPerfil.length > 0 && (
              <div className="bg-white px-4 py-3 rounded-2xl border border-soft flex flex-wrap items-center gap-4 text-xs tabular-nums">
                <span className="text-[11px] font-bold text-forest/65 uppercase">
                  Distribuição por Emissor:
                </span>
                {consolidadoB2B.resumoPorPerfil.map((rp, i) => (
                  <span key={i} className="text-forest">
                    [{rp.via}] {rp.label}:{" "}
                    <strong className="font-mono">{fmtMoeda(rp.valor)}</strong>
                  </span>
                ))}
              </div>
            )}

            {/* Faixa de Conciliação: Custos B2B (Alocados + Custo Geral) & Resultado Líquido */}
            <div className="bg-white px-4 py-3.5 rounded-2xl border border-soft flex flex-wrap items-center justify-between gap-3 text-xs tabular-nums">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 font-bold text-forest">
                  <TrendingDown className="w-3.5 h-3.5 text-rose-700" />
                  <span>Despesas B2B no período:</span>
                  <strong className="font-mono text-rose-700">
                    {fmtMoeda(despesasB2BResumo.totalPeriodo)}
                  </strong>
                </span>
                <span aria-hidden="true" className="text-forest/35">·</span>
                <span className="text-forest/70">
                  Centros Específicos:{" "}
                  <strong className="font-mono text-forest">
                    {fmtMoeda(despesasB2BResumo.custoEspecifico)}
                  </strong>
                </span>
                <span aria-hidden="true" className="text-forest/35">·</span>
                <span className="text-forest/70">
                  Custo Geral B2B:{" "}
                  <strong className="font-mono text-forest">
                    {fmtMoeda(despesasB2BResumo.custoGeral)}
                  </strong>
                </span>
                <span aria-hidden="true" className="text-forest/35">·</span>
                <span className="text-forest">
                  Resultado Líquido B2B:{" "}
                  <strong
                    className={`font-mono ${
                      consolidadoB2B.totalFaturado - despesasB2BResumo.totalPeriodo >= 0
                        ? "text-emerald-800"
                        : "text-rose-700"
                    }`}
                  >
                    {fmtMoeda(
                      consolidadoB2B.totalFaturado - despesasB2BResumo.totalPeriodo
                    )}
                  </strong>
                </span>
              </div>

              <button
                type="button"
                onClick={() => setModoVisao("despesas")}
                className="px-3 py-1.5 bg-warm hover:bg-soft text-forest font-bold rounded-xl border border-soft transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                Gerenciar Centros de Custo →
              </button>
            </div>

            {/* Tabela de Fechamento por Empresa Cliente */}
            <div className="bg-white rounded-2xl border border-soft overflow-hidden">
              <div className="px-4 py-3 bg-warm/30 border-b border-soft flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-forest" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-forest">
                    Fechamento por Empresa Cliente ({consolidadoB2B.linhas.length})
                  </h3>
                </div>
                <span className="text-[11px] text-forest/60 hidden sm:inline">
                  Consolidado automaticamente também na aba global Dashboard → Faturamento
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-warm/40 text-[10px] font-bold uppercase tracking-wider text-forest/70 border-b border-soft">
                      <th className="py-2.5 px-3.5">Empresa Cliente / CNPJ</th>
                      <th className="py-2.5 px-3">Contato RH / Fin.</th>
                      <th className="py-2.5 px-3">Emissor Padrão</th>
                      <th className="py-2.5 px-3 text-center">Serviços</th>
                      <th className="py-2.5 px-3 text-right">Faturado</th>
                      <th className="py-2.5 px-3 text-right">Custos Alocados</th>
                      <th className="py-2.5 px-3 text-right">Recebido</th>
                      <th className="py-2.5 px-3 text-right">Em Aberto</th>
                      <th className="py-2.5 px-3 text-center">NFS-e</th>
                      <th className="py-2.5 px-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-soft/60">
                    {consolidadoB2B.linhas.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-10 text-center text-forest/55">
                          Nenhuma empresa com lançamentos nesta competência.
                        </td>
                      </tr>
                    ) : (
                      consolidadoB2B.linhas.map((l) => {
                        const custoEmp =
                          despesasB2BResumo.porEmpresaMap.get(l.empresa.id) || 0;
                        return (
                          <tr
                            key={l.empresa.id}
                            className="hover:bg-warm/25 transition-colors tabular-nums"
                          >
                            <td className="py-2.5 px-3.5">
                              <button
                                type="button"
                                onClick={() => onSelecionarEmpresa(l.empresa)}
                                className="font-bold text-forest hover:text-emerald-800 hover:underline text-left block truncate max-w-[220px] cursor-pointer"
                              >
                                {l.empresa.nomeFantasia || l.empresa.razaoSocial}
                              </button>
                              <span className="text-[10px] font-mono text-forest/55">
                                {l.empresa.cnpj || "CNPJ pendente"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-forest/75">
                              <span className="block truncate max-w-[150px]">
                                {l.empresa.contatoNome || "-"}
                              </span>
                              <span className="text-[10px] font-mono text-forest/55">
                                {l.empresa.contatoTelefone || ""}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="text-[11px] font-semibold text-forest">
                                [{l.perfilPadraoEmp.via}]{" "}
                                {formatPerfilCurtoLabel(l.perfilPadraoEmp)}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-semibold text-forest">
                              {l.qtdServicos}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-forest">
                              {fmtMoeda(l.faturado)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-rose-700">
                              {custoEmp > 0 ? fmtMoeda(custoEmp) : "—"}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-700">
                              {fmtMoeda(l.recebido)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700">
                              {l.pendente > 0 ? fmtMoeda(l.pendente) : "—"}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {l.nfsPendentes > 0 ? (
                                <span className="text-[11px] font-semibold text-amber-800">
                                  {l.nfsPendentes} pend.
                                </span>
                              ) : l.qtdServicos > 0 ? (
                                <span className="text-[11px] font-semibold text-emerald-700">
                                  Em dia
                                </span>
                              ) : (
                                <span className="text-forest/35">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => onSelecionarEmpresa(l.empresa)}
                                className="p-1.5 text-forest/70 hover:text-forest hover:bg-warm rounded-lg border border-soft cursor-pointer"
                                title="Abrir Ficha de Bordo e Planilha da Empresa"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: NOVA EMPRESA CLIENTE B2B */}
      {showNovaEmpresaModal && (
        <div className="fixed inset-0 z-50 bg-forest/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-soft overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-forest text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-sun">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base sm:text-lg text-white">
                    Nova Empresa Cliente (B2B)
                  </h3>
                  <p className="text-xs text-white/75">
                    Cadastro direto para venda de palestras, treinamentos e consultorias
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNovaEmpresaModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleCadastrarEmpresa}
              className="p-6 overflow-y-auto space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-forest mb-1">
                    Nome Fantasia *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: TechBrasil"
                    value={formNova.nomeFantasia}
                    onChange={(e) =>
                      setFormNova({ ...formNova, nomeFantasia: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest outline-none focus:border-forest"
                  />
                </div>
                <div>
                  <label className="block font-bold text-forest mb-1">
                    CNPJ
                  </label>
                  {(() => {
                    const digits = formNova.cnpj.replace(/\D/g, "");
                    const valid = isValidCnpj(formNova.cnpj);
                    const err = digits.length === 14 ? getCnpjValidationError(formNova.cnpj, false) : null;
                    return (
                      <>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={18}
                          placeholder="00.000.000/0001-00"
                          value={formNova.cnpj}
                          onChange={(e) =>
                            setFormNova({
                              ...formNova,
                              cnpj: formatCnpjMask(e.target.value),
                            })
                          }
                          className={`w-full px-3 py-2 border rounded-xl text-forest font-mono tabular-nums outline-none transition-colors ${
                            err
                              ? "bg-rose-50/50 border-rose-400 focus:border-rose-500"
                              : valid
                              ? "bg-emerald-50/30 border-emerald-400 focus:border-emerald-600"
                              : "bg-warm/30 border-soft focus:border-forest"
                          }`}
                        />
                        {err ? (
                          <span className="text-[11px] text-rose-600 font-medium block mt-1">{err}</span>
                        ) : valid ? (
                          <span className="text-[11px] text-emerald-700 font-medium block mt-1">CNPJ válido</span>
                        ) : null}
                      </>
                    );
                  })()}
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-forest mb-1">
                    Razão Social (para Nota Fiscal / Contrato)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: TechBrasil Soluções Digitais LTDA"
                    value={formNova.razaoSocial}
                    onChange={(e) =>
                      setFormNova({ ...formNova, razaoSocial: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest outline-none focus:border-forest"
                  />
                </div>

                <div>
                  <label className="block font-bold text-forest mb-1">
                    Contato Responsável (RH / Gestor) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Camila Rocha"
                    value={formNova.contatoNome}
                    onChange={(e) =>
                      setFormNova({ ...formNova, contatoNome: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest outline-none focus:border-forest"
                  />
                </div>
                <div>
                  <label className="block font-bold text-forest mb-1">
                    WhatsApp / Telefone *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="(11) 99999-9999"
                    value={formNova.contatoTelefone}
                    onChange={(e) =>
                      setFormNova({
                        ...formNova,
                        contatoTelefone: formatTelMask(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest font-mono tabular-nums outline-none focus:border-forest"
                  />
                </div>

                <div>
                  <label className="block font-bold text-forest mb-1">
                    E-mail Financeiro / Envio de NFS-e
                  </label>
                  <input
                    type="email"
                    placeholder="financeiro@empresa.com.br"
                    value={formNova.emailFinanceiroNf}
                    onChange={(e) =>
                      setFormNova({
                        ...formNova,
                        emailFinanceiroNf: e.target.value,
                        contatoEmail: formNova.contatoEmail || e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest outline-none focus:border-forest"
                  />
                </div>
                <div>
                  <label className="block font-bold text-forest mb-1">
                    Valor Base de Referência (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formNova.valorServicoPadrao}
                    onChange={(e) =>
                      setFormNova({
                        ...formNova,
                        valorServicoPadrao: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest font-mono font-bold tabular-nums outline-none focus:border-forest"
                  />
                </div>

                <div>
                  <label className="block font-bold text-forest mb-1">
                    Relacionamento Comercial
                  </label>
                  <select
                    value={formNova.statusComercial}
                    onChange={(e) =>
                      setFormNova({
                        ...formNova,
                        statusComercial: e.target.value as StatusEmpresaB2B,
                      })
                    }
                    className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest outline-none focus:border-forest"
                  >
                    {Object.entries(STATUS_EMPRESA_B2B_LABELS).map(([k, lbl]) => (
                      <option key={k} value={k}>
                        {lbl}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <label className="block font-bold text-forest">
                      Perfil de Faturamento Padrão (PF / PJ)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowGerenciarPerfisModal(true)}
                      className="text-[11px] font-bold text-emerald-800 hover:underline cursor-pointer"
                    >
                      Gerenciar Perfis
                    </button>
                  </div>
                  <select
                    value={formNova.perfilFaturamentoId || perfilPadraoInicial?.id || ""}
                    onChange={(e) =>
                      setFormNova({
                        ...formNova,
                        perfilFaturamentoId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-warm/30 border border-soft rounded-xl text-forest font-semibold outline-none focus:border-forest cursor-pointer"
                  >
                    {perfisFaturamento.map((p) => (
                      <option key={p.id} value={p.id}>
                        {formatPerfilSelectOption(p)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-soft flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNovaEmpresaModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-forest/70 hover:text-forest rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoNova}
                  className="px-5 py-2 bg-forest hover:bg-forest/90 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{salvandoNova ? "Cadastrando..." : "Salvar & Abrir Ficha"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL IN-APP DE EXCLUSÃO DE EMPRESA */}
      {empresaParaExcluir && (
        <div className="fixed inset-0 z-[80] bg-forest/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-soft shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-base text-forest">
                  Excluir empresa "{empresaParaExcluir.nomeFantasia}"?
                </h4>
                <p className="text-xs text-forest/70 mt-1 leading-relaxed">
                  A ficha comercial, atas e linhas de faturamento desta empresa serão removidas permanentemente da sua carteira.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-soft">
              <button
                type="button"
                onClick={() => setEmpresaParaExcluir(null)}
                className="px-4 py-2 text-xs font-semibold text-forest/70 hover:text-forest rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarExclusaoEmpresa}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PERFIS DE FATURAMENTO */}
      <PerfisFaturamentoManagerModal
        isOpen={showGerenciarPerfisModal}
        onClose={() => setShowGerenciarPerfisModal(false)}
        perfis={perfisFaturamento}
        onSavePerfis={handleSavePerfisNoPerfil}
        profissionalNomePadrao={profile?.name || profile?.nome || ""}
        showToast={showToast}
      />
    </div>
  );
};
