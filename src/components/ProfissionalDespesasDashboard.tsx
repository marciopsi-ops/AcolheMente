import React, { useState, useEffect, useMemo } from "react";
import {
  Wallet,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  PieChart,
  Calendar,
  CheckCircle2,
  Clock,
  Receipt,
  Building2,
  Briefcase,
  Layers,
  Search,
  Download,
  X,
} from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { EmpresaClienteB2B } from "../types/empresaB2B";

export type ExpenseSector = "clinico" | "empresa_b2b";
export type ExpenseCostCenterType = "geral" | "especifico";
export type ExpenseCategory =
  | "marketing"
  | "taxas_plataforma"
  | "infraestrutura"
  | "impostos"
  | "capacitacao"
  | "deslocamento_logistica"
  | "material_eventos"
  | "equipe_apoio"
  | "outros";

export interface ExpenseItem {
  id: string;
  professionalId: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string; // YYYY-MM-DD
  isRecurring: boolean;
  status: "paid" | "pending";
  // Setor e Centro de Custo (retrocompatível: ausência de setor = "clinico")
  setor?: ExpenseSector;
  centroCustoTipo?: ExpenseCostCenterType;
  empresaB2BId?: string;
  empresaB2BNome?: string;
  servicoB2BId?: string;
  servicoB2BDescricao?: string;
}

export const CATEGORIAS_DESPESA_CONFIG: Record<
  ExpenseCategory,
  { label: string; shortLabel: string }
> = {
  marketing: {
    label: "Marketing, Prospecção & Anúncios",
    shortLabel: "Marketing & Anúncios",
  },
  deslocamento_logistica: {
    label: "Deslocamento, Viagens & Logística",
    shortLabel: "Deslocamento & Logística",
  },
  material_eventos: {
    label: "Materiais, Apostilas & Coffee / Eventos",
    shortLabel: "Materiais & Eventos",
  },
  equipe_apoio: {
    label: "Subcontratação & Apoio Técnico",
    shortLabel: "Subcontratação & Apoio",
  },
  infraestrutura: {
    label: "Consultório, Sala & Infraestrutura",
    shortLabel: "Infraestrutura",
  },
  taxas_plataforma: {
    label: "Taxas da Plataforma / Softwares",
    shortLabel: "Taxas & Sistemas",
  },
  impostos: {
    label: "Impostos & Contabilidade (MEI / PJ)",
    shortLabel: "Impostos & Contábil",
  },
  capacitacao: {
    label: "Supervisão, Cursos & Formação",
    shortLabel: "Supervisão & Cursos",
  },
  outros: {
    label: "Outras Despesas Operacionais",
    shortLabel: "Outras Despesas",
  },
};

export function resolveExpenseSector(exp: ExpenseItem): ExpenseSector {
  return exp.setor === "empresa_b2b" ? "empresa_b2b" : "clinico";
}

export function getDefaultExpensesList(
  profissionalId: string,
  mesAtualStr?: string
): ExpenseItem[] {
  const hoje = new Date();
  const mesRef =
    mesAtualStr ||
    `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  return [
    {
      id: "exp_1",
      professionalId: profissionalId,
      description: "Mensalidade Plano AcolheMente Avançado",
      amount: 79.9,
      category: "taxas_plataforma",
      date: `${mesRef}-05`,
      isRecurring: true,
      status: "paid",
      setor: "clinico",
    },
    {
      id: "exp_2",
      professionalId: profissionalId,
      description: "Anúncios Instagram / Google Ads",
      amount: 150.0,
      category: "marketing",
      date: `${mesRef}-10`,
      isRecurring: true,
      status: "paid",
      setor: "clinico",
    },
    {
      id: "exp_3",
      professionalId: profissionalId,
      description: "Contabilidade MEI / Simples Nacional",
      amount: 120.0,
      category: "impostos",
      date: `${mesRef}-15`,
      isRecurring: true,
      status: "paid",
      setor: "clinico",
    },
  ];
}

export function resolveStoredExpenses(
  profissionalId: string,
  profileExpenses?: ExpenseItem[]
): ExpenseItem[] {
  if (Array.isArray(profileExpenses)) {
    return profileExpenses;
  }
  if (typeof window !== "undefined" && profissionalId) {
    try {
      const saved = localStorage.getItem(`acolhe_expenses_${profissionalId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignora erro de leitura local
    }
  }
  return getDefaultExpensesList(profissionalId);
}

export function sanitizeExpenseItem(exp: ExpenseItem): ExpenseItem {
  const clean: Record<string, any> = {
    id: String(exp.id),
    professionalId: String(exp.professionalId || ""),
    description: String(exp.description || "").trim().slice(0, 240),
    amount: Number(exp.amount) || 0,
    category: exp.category || "outros",
    date: String(exp.date || ""),
    isRecurring: Boolean(exp.isRecurring),
    status: exp.status === "pending" ? "pending" : "paid",
    setor: resolveExpenseSector(exp),
  };

  if (clean.setor === "empresa_b2b") {
    clean.centroCustoTipo =
      exp.centroCustoTipo === "especifico" && exp.empresaB2BId
        ? "especifico"
        : "geral";
    if (clean.centroCustoTipo === "especifico" && exp.empresaB2BId) {
      clean.empresaB2BId = String(exp.empresaB2BId);
      if (exp.empresaB2BNome) {
        clean.empresaB2BNome = String(exp.empresaB2BNome).slice(0, 200);
      }
      if (exp.servicoB2BId) {
        clean.servicoB2BId = String(exp.servicoB2BId);
      }
      if (exp.servicoB2BDescricao) {
        clean.servicoB2BDescricao = String(exp.servicoB2BDescricao).slice(0, 240);
      }
    }
  }

  return clean as ExpenseItem;
}

export function filterExpensesByCriteria(
  expenses: ExpenseItem[],
  opts: {
    competencia: string;
    setor: "todos" | "clinico" | "empresa_b2b";
    centroCusto?: string; // "todos" | "geral" | "empresa:<id>"
    busca?: string;
  }
): ExpenseItem[] {
  const termo = (opts.busca || "").trim().toLowerCase();

  return (expenses || []).filter((exp) => {
    if (opts.competencia !== "todas") {
      if (!exp.date || !exp.date.startsWith(opts.competencia)) {
        return false;
      }
    }

    const expSetor = resolveExpenseSector(exp);
    if (opts.setor !== "todos" && expSetor !== opts.setor) {
      return false;
    }

    if (opts.centroCusto && opts.centroCusto !== "todos") {
      if (expSetor !== "empresa_b2b") {
        return false;
      }
      if (opts.centroCusto === "geral") {
        if (exp.centroCustoTipo === "especifico" && exp.empresaB2BId) {
          return false;
        }
      } else if (opts.centroCusto.startsWith("empresa:")) {
        const targetEmpId = opts.centroCusto.replace("empresa:", "");
        if (exp.centroCustoTipo !== "especifico" || exp.empresaB2BId !== targetEmpId) {
          return false;
        }
      }
    }

    if (termo) {
      const catCfg =
        CATEGORIAS_DESPESA_CONFIG[exp.category] || CATEGORIAS_DESPESA_CONFIG.outros;
      const hay = [
        exp.description,
        exp.empresaB2BNome || "",
        exp.servicoB2BDescricao || "",
        catCfg.label,
        expSetor === "empresa_b2b"
          ? exp.centroCustoTipo === "especifico"
            ? "centro específico empresa"
            : "custo geral b2b"
          : "clínico consultório",
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(termo)) return false;
    }

    return true;
  });
}

export function computeGrossRevenueForScope(params: {
  competencia: string;
  setor: "todos" | "clinico" | "empresa_b2b";
  centroCusto?: string;
  pacientesParticulares?: any[];
  fichasCorporativas?: any[];
  pacientesExternos?: any[];
  empresasB2B?: EmpresaClienteB2B[];
  fallbackReceitaBruta?: number;
}): {
  receitaClinica: number;
  receitaB2B: number;
  receitaEscopo: number;
  hasLiveSources: boolean;
} {
  const {
    competencia,
    setor,
    centroCusto = "todos",
    pacientesParticulares,
    fichasCorporativas,
    pacientesExternos,
    empresasB2B,
    fallbackReceitaBruta = 0,
  } = params;

  const hasClinicoArrays =
    Array.isArray(pacientesParticulares) ||
    Array.isArray(fichasCorporativas) ||
    Array.isArray(pacientesExternos);
  const hasB2BArray = Array.isArray(empresasB2B);

  const sumClinicalList = (list?: any[]) => {
    if (!Array.isArray(list)) return 0;
    let acc = 0;
    list.forEach((p) => {
      const sessoes = Array.isArray(p?.historicoSessoes) ? p.historicoSessoes : [];
      sessoes.forEach((s: any) => {
        if (competencia !== "todas" && (!s?.data || !s.data.startsWith(competencia))) {
          return;
        }
        const valida =
          s?.statusAtendimento === "realizada" ||
          (s?.statusPagamento === "pago" &&
            s?.statusAtendimento !== "desmarcada_antecedencia");
        if (valida) {
          acc += Number(s?.valor) || 0;
        }
      });
    });
    return acc;
  };

  const receitaClinica =
    sumClinicalList(pacientesParticulares) +
    sumClinicalList(fichasCorporativas) +
    sumClinicalList(pacientesExternos);

  let receitaB2B = 0;
  let receitaB2BEmpresaEspecifica = 0;
  const targetEmpId = centroCusto.startsWith("empresa:")
    ? centroCusto.replace("empresa:", "")
    : "";

  if (Array.isArray(empresasB2B)) {
    empresasB2B.forEach((emp) => {
      const servicos = Array.isArray(emp?.historicoServicos)
        ? emp.historicoServicos
        : [];
      servicos.forEach((srv) => {
        if (srv.statusExecucao === "cancelado") return;
        if (
          competencia !== "todas" &&
          (!srv.data || !srv.data.startsWith(competencia))
        ) {
          return;
        }
        const val = Number(srv.valor) || 0;
        receitaB2B += val;
        if (targetEmpId && emp.id === targetEmpId) {
          receitaB2BEmpresaEspecifica += val;
        }
      });
    });
  }

  if (!hasClinicoArrays && !hasB2BArray) {
    return {
      receitaClinica: fallbackReceitaBruta,
      receitaB2B: 0,
      receitaEscopo: fallbackReceitaBruta,
      hasLiveSources: false,
    };
  }

  let receitaEscopo = 0;
  if (setor === "clinico") {
    receitaEscopo = hasClinicoArrays ? receitaClinica : fallbackReceitaBruta;
  } else if (setor === "empresa_b2b") {
    receitaEscopo = targetEmpId ? receitaB2BEmpresaEspecifica : receitaB2B;
  } else {
    // Consolidado (todos os setores somados)
    receitaEscopo = targetEmpId
      ? receitaB2BEmpresaEspecifica
      : receitaClinica + receitaB2B;
  }

  return {
    receitaClinica,
    receitaB2B,
    receitaEscopo,
    hasLiveSources: true,
  };
}

interface ProfissionalDespesasDashboardProps {
  profissionalId: string;
  receitaBruta?: number;
  competenciaSelecionada: string;
  mode?: "consolidado" | "b2b";
  empresasB2B?: EmpresaClienteB2B[];
  pacientesParticulares?: any[];
  fichasCorporativas?: any[];
  pacientesExternos?: any[];
  initialExpenses?: ExpenseItem[];
  onExpensesChange?: (nextList: ExpenseItem[]) => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export function ProfissionalDespesasDashboard({
  profissionalId,
  receitaBruta = 0,
  competenciaSelecionada: competenciaSelecionadaProp,
  mode = "consolidado",
  empresasB2B = [],
  pacientesParticulares,
  fichasCorporativas,
  pacientesExternos,
  initialExpenses,
  onExpensesChange,
  showToast,
}: ProfissionalDespesasDashboardProps) {
  const isB2BMode = mode === "b2b";
  const hoje = new Date();
  const mesAtualStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(
    2,
    "0"
  )}`;

  const [competenciaDespesas, setCompetenciaDespesas] = useState<string>(
    competenciaSelecionadaProp || mesAtualStr
  );
  const [filtroSetor, setFiltroSetor] = useState<"todos" | "clinico" | "empresa_b2b">(
    isB2BMode ? "empresa_b2b" : "todos"
  );
  const [filtroCentroCusto, setFiltroCentroCusto] = useState<string>("todos");
  const [buscaDespesa, setBuscaDespesa] = useState<string>("");

  const [expenses, setExpenses] = useState<ExpenseItem[]>(() =>
    resolveStoredExpenses(profissionalId, initialExpenses)
  );

  // Sincroniza caso competenciaSelecionadaProp mude externamente (ex: Dashboard B2B)
  useEffect(() => {
    if (competenciaSelecionadaProp) {
      setCompetenciaDespesas(competenciaSelecionadaProp);
    }
  }, [competenciaSelecionadaProp]);

  // Sincroniza com initialExpenses vindo do profile em memória quando atualizado
  useEffect(() => {
    if (Array.isArray(initialExpenses)) {
      setExpenses(initialExpenses);
    }
  }, [initialExpenses]);

  // Carrega despesas salvas do Firestore ao montar caso ainda não estejam no profile
  useEffect(() => {
    if (!profissionalId || Array.isArray(initialExpenses)) return;
    let cancelled = false;
    const loadFromFirestore = async () => {
      const path = `users/${profissionalId}`;
      try {
        const snap = await getDoc(doc(db, "users", profissionalId));
        if (!cancelled && snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data?.despesasProfissionais)) {
            setExpenses(data.despesasProfissionais);
            if (onExpensesChange) {
              onExpensesChange(data.despesasProfissionais);
            }
            try {
              localStorage.setItem(
                `acolhe_expenses_${profissionalId}`,
                JSON.stringify(data.despesasProfissionais)
              );
            } catch {
              // ignora erro de quota local
            }
          }
        }
      } catch (err: any) {
        if (String(err?.message || "").includes("Missing or insufficient permissions")) {
          try {
            handleFirestoreError(err, OperationType.GET, path);
          } catch {
            // registrado pelo handler estruturado
          }
        } else {
          console.error("Erro ao carregar despesas do profissional:", err);
        }
      }
    };
    loadFromFirestore();
    return () => {
      cancelled = true;
    };
  }, [profissionalId, initialExpenses, onExpensesChange]);

  // Estado do Modal de Nova Despesa
  const [showAddModal, setShowAddModal] = useState(false);
  const [descInput, setDescInput] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [categoryInput, setCategoryInput] = useState<ExpenseCategory>(
    isB2BMode ? "deslocamento_logistica" : "marketing"
  );
  const [dateInput, setDateInput] = useState(new Date().toISOString().split("T")[0]);
  const [isRecurringInput, setIsRecurringInput] = useState(false);
  const [statusInput, setStatusInput] = useState<"paid" | "pending">("paid");

  // Campos de Setor e Centro de Custo no Modal
  const [setorInput, setSetorInput] = useState<ExpenseSector>(
    isB2BMode ? "empresa_b2b" : "clinico"
  );
  const [centroCustoTipoInput, setCentroCustoTipoInput] =
    useState<ExpenseCostCenterType>("geral");
  const [empresaIdInput, setEmpresaIdInput] = useState<string>("");
  const [servicoIdInput, setServicoIdInput] = useState<string>("");

  const empresaSelecionadaModal = useMemo(
    () => (empresasB2B || []).find((emp) => emp.id === empresaIdInput) || null,
    [empresasB2B, empresaIdInput]
  );

  const servicosEmpresaModal = useMemo(() => {
    if (!empresaSelecionadaModal) return [];
    return (empresaSelecionadaModal.historicoServicos || [])
      .filter((s) => s.statusExecucao !== "cancelado")
      .slice()
      .sort((a, b) => (b.data || "").localeCompare(a.data || ""));
  }, [empresaSelecionadaModal]);

  const abrirModalNovaDespesa = () => {
    const defaultSetor: ExpenseSector =
      isB2BMode || filtroSetor === "empresa_b2b" ? "empresa_b2b" : "clinico";
    setSetorInput(defaultSetor);
    setCategoryInput(
      defaultSetor === "empresa_b2b" ? "deslocamento_logistica" : "marketing"
    );

    if (filtroCentroCusto.startsWith("empresa:")) {
      const preEmpId = filtroCentroCusto.replace("empresa:", "");
      setCentroCustoTipoInput("especifico");
      setEmpresaIdInput(preEmpId);
      setServicoIdInput("");
    } else if (filtroCentroCusto === "geral") {
      setCentroCustoTipoInput("geral");
      setEmpresaIdInput("");
      setServicoIdInput("");
    } else if (defaultSetor === "empresa_b2b" && empresasB2B.length > 0) {
      setCentroCustoTipoInput("especifico");
      setEmpresaIdInput(empresasB2B[0].id);
      setServicoIdInput("");
    } else {
      setCentroCustoTipoInput("geral");
      setEmpresaIdInput("");
      setServicoIdInput("");
    }

    if (
      competenciaDespesas !== "todas" &&
      competenciaDespesas !== mesAtualStr &&
      competenciaDespesas.length === 7
    ) {
      setDateInput(`${competenciaDespesas}-10`);
    } else {
      setDateInput(new Date().toISOString().split("T")[0]);
    }

    setShowAddModal(true);
  };

  const persistExpenses = async (rawList: ExpenseItem[]) => {
    const sanitized = rawList.map(sanitizeExpenseItem);
    setExpenses(sanitized);
    if (onExpensesChange) {
      onExpensesChange(sanitized);
    }
    try {
      localStorage.setItem(
        `acolhe_expenses_${profissionalId}`,
        JSON.stringify(sanitized)
      );
    } catch {
      // ignora erro local
    }
    if (profissionalId && profissionalId !== "prof_default") {
      const path = `users/${profissionalId}`;
      try {
        await setDoc(
          doc(db, "users", profissionalId),
          { despesasProfissionais: sanitized },
          { merge: true }
        );
      } catch (err: any) {
        if (String(err?.message || "").includes("Missing or insufficient permissions")) {
          try {
            handleFirestoreError(err, OperationType.WRITE, path);
          } catch {
            // registrado pelo handler estruturado
          }
        } else {
          console.error("Erro ao salvar despesas no Firestore:", err);
        }
      }
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(String(amountInput).replace(",", "."));
    if (isNaN(val) || val <= 0) {
      showToast("Informe um valor válido maior que zero para a despesa.", "error");
      return;
    }
    if (!descInput.trim()) {
      showToast("Informe a descrição da despesa.", "error");
      return;
    }

    const setorFinal: ExpenseSector = isB2BMode ? "empresa_b2b" : setorInput;

    if (
      setorFinal === "empresa_b2b" &&
      centroCustoTipoInput === "especifico" &&
      !empresaIdInput
    ) {
      showToast(
        "Selecione a empresa cliente deste centro de custo ou marque 'Custo Geral'.",
        "error"
      );
      return;
    }

    const empObj =
      setorFinal === "empresa_b2b" && centroCustoTipoInput === "especifico"
        ? empresasB2B.find((emp) => emp.id === empresaIdInput)
        : undefined;

    const srvObj =
      empObj && servicoIdInput
        ? (empObj.historicoServicos || []).find((s) => s.id === servicoIdInput)
        : undefined;

    const srvLabel = srvObj
      ? `#${srvObj.numeroItem || 1} · ${srvObj.descricaoServico}${
          srvObj.data ? ` (${srvObj.data})` : ""
        }`
      : "";

    const newExpense: ExpenseItem = sanitizeExpenseItem({
      id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      professionalId: profissionalId,
      description: descInput.trim(),
      amount: val,
      category: categoryInput,
      date: dateInput,
      isRecurring: isRecurringInput,
      status: statusInput,
      setor: setorFinal,
      centroCustoTipo:
        setorFinal === "empresa_b2b" ? centroCustoTipoInput : undefined,
      empresaB2BId: empObj?.id,
      empresaB2BNome: empObj
        ? empObj.nomeFantasia || empObj.razaoSocial
        : undefined,
      servicoB2BId: srvObj?.id,
      servicoB2BDescricao: srvLabel || undefined,
    });

    const nextList = [newExpense, ...expenses];
    await persistExpenses(nextList);
    showToast("Despesa registrada com sucesso!", "success");
    setShowAddModal(false);
    setDescInput("");
    setAmountInput("");
    setIsRecurringInput(false);
  };

  const handleToggleStatus = async (id: string) => {
    const nextList = expenses.map((item) =>
      item.id === id
        ? { ...item, status: item.status === "paid" ? ("pending" as const) : ("paid" as const) }
        : item
    );
    await persistExpenses(nextList);
    showToast("Status da despesa atualizado.", "info");
  };

  const handleDeleteExpense = async (id: string) => {
    const nextList = expenses.filter((e) => e.id !== id);
    await persistExpenses(nextList);
    showToast("Despesa removida do extrato.", "info");
  };

  const mesesDisponiveis = useMemo(() => {
    const setM = new Set<string>();
    setM.add(mesAtualStr);
    expenses.forEach((e) => {
      if (e.date && e.date.length >= 7) {
        setM.add(e.date.substring(0, 7));
      }
    });
    (empresasB2B || []).forEach((emp) => {
      (emp.historicoServicos || []).forEach((s) => {
        if (s.data && s.data.length >= 7) {
          setM.add(s.data.substring(0, 7));
        }
      });
    });
    return Array.from(setM).sort().reverse();
  }, [expenses, empresasB2B, mesAtualStr]);

  const fmtMesExtenso = (strAnoMes: string) => {
    if (!strAnoMes || strAnoMes === "todas") return "Todas as Competências";
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

  const fmtMoeda = (val: number) =>
    `R$ ${Number(val || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const setorAtivoEfetivo: "todos" | "clinico" | "empresa_b2b" = isB2BMode
    ? "empresa_b2b"
    : filtroSetor;

  const filteredExpenses = useMemo(
    () =>
      filterExpensesByCriteria(expenses, {
        competencia: competenciaDespesas,
        setor: setorAtivoEfetivo,
        centroCusto:
          setorAtivoEfetivo === "clinico" ? "todos" : filtroCentroCusto,
        busca: buscaDespesa,
      }),
    [
      expenses,
      competenciaDespesas,
      setorAtivoEfetivo,
      filtroCentroCusto,
      buscaDespesa,
    ]
  );

  // Subtotais setoriais e de centros de custo para transparência
  const subtotaisPeriodo = useMemo(() => {
    const doPeriodo = filterExpensesByCriteria(expenses, {
      competencia: competenciaDespesas,
      setor: "todos",
    });
    let clinico = 0;
    let b2bGeral = 0;
    let b2bEspecifico = 0;

    doPeriodo.forEach((e) => {
      const val = Number(e.amount) || 0;
      if (resolveExpenseSector(e) === "empresa_b2b") {
        if (e.centroCustoTipo === "especifico" && e.empresaB2BId) {
          b2bEspecifico += val;
        } else {
          b2bGeral += val;
        }
      } else {
        clinico += val;
      }
    });

    return {
      clinico,
      b2bGeral,
      b2bEspecifico,
      b2bTotal: b2bGeral + b2bEspecifico,
      consolidado: clinico + b2bGeral + b2bEspecifico,
    };
  }, [expenses, competenciaDespesas]);

  const totalDespesas = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
    [filteredExpenses]
  );

  const resumoReceita = useMemo(
    () =>
      computeGrossRevenueForScope({
        competencia: competenciaDespesas,
        setor: setorAtivoEfetivo,
        centroCusto:
          setorAtivoEfetivo === "clinico" ? "todos" : filtroCentroCusto,
        pacientesParticulares,
        fichasCorporativas,
        pacientesExternos,
        empresasB2B,
        fallbackReceitaBruta: receitaBruta,
      }),
    [
      competenciaDespesas,
      setorAtivoEfetivo,
      filtroCentroCusto,
      pacientesParticulares,
      fichasCorporativas,
      pacientesExternos,
      empresasB2B,
      receitaBruta,
    ]
  );

  const receitaBrutaEfetiva = resumoReceita.receitaEscopo;
  const lucroLiquido = receitaBrutaEfetiva - totalDespesas;
  const margemLucro =
    receitaBrutaEfetiva > 0 ? (lucroLiquido / receitaBrutaEfetiva) * 100 : 0;

  // Breakdown por Centro de Custo (para visão B2B ou quando houver despesas B2B)
  const breakdownCentrosCusto = useMemo(() => {
    const map = new Map<
      string,
      { key: string; label: string; sublabel: string; total: number; count: number }
    >();

    filteredExpenses.forEach((e) => {
      const val = Number(e.amount) || 0;
      const setor = resolveExpenseSector(e);
      if (setor === "clinico") {
        const cur = map.get("setor_clinico") || {
          key: "setor_clinico",
          label: "Setor Clínico / Consultório",
          sublabel: "Despesas operacionais clínicas",
          total: 0,
          count: 0,
        };
        cur.total += val;
        cur.count += 1;
        map.set("setor_clinico", cur);
      } else if (e.centroCustoTipo === "especifico" && e.empresaB2BId) {
        const k = `emp_${e.empresaB2BId}`;
        const empRef = empresasB2B.find((emp) => emp.id === e.empresaB2BId);
        const nomeEmp =
          empRef?.nomeFantasia ||
          empRef?.razaoSocial ||
          e.empresaB2BNome ||
          "Empresa Cliente";
        const cur = map.get(k) || {
          key: k,
          label: nomeEmp,
          sublabel: "Centro de custo específico (B2B)",
          total: 0,
          count: 0,
        };
        cur.total += val;
        cur.count += 1;
        map.set(k, cur);
      } else {
        const cur = map.get("b2b_geral") || {
          key: "b2b_geral",
          label: "Custo Geral (Corporativo B2B)",
          sublabel: "Sem vínculo a empresa ou serviço específico",
          total: 0,
          count: 0,
        };
        cur.total += val;
        cur.count += 1;
        map.set("b2b_geral", cur);
      }
    });

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        percentual: totalDespesas > 0 ? (item.total / totalDespesas) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredExpenses, empresasB2B, totalDespesas]);

  // Breakdown por Categoria
  const breakdownCategorias = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + (Number(e.amount) || 0);
    });
    return Object.entries(map)
      .map(([cat, total]) => ({
        category: cat,
        config: CATEGORIAS_DESPESA_CONFIG[cat as ExpenseCategory] || {
          label: cat,
          shortLabel: cat,
        },
        total,
        percentual: totalDespesas > 0 ? (total / totalDespesas) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredExpenses, totalDespesas]);

  const handleExportarCsvDespesas = () => {
    if (filteredExpenses.length === 0) {
      showToast("Nenhuma despesa listada para exportar.", "info");
      return;
    }
    const cab = [
      "Data",
      "Descricao",
      "Setor",
      "Centro_de_Custo",
      "Empresa_Vinculada",
      "Servico_Vinculado",
      "Categoria",
      "Recorrente",
      "Status",
      "Valor_RS",
    ];
    const rows = filteredExpenses.map((exp) => {
      const setor = resolveExpenseSector(exp);
      const cfg =
        CATEGORIAS_DESPESA_CONFIG[exp.category] || CATEGORIAS_DESPESA_CONFIG.outros;
      const centroLabel =
        setor === "clinico"
          ? "Consultório / Clínico"
          : exp.centroCustoTipo === "especifico" && exp.empresaB2BId
          ? "Centro Específico (Empresa/Serviço)"
          : "Custo Geral (B2B)";
      return [
        `"${exp.date}"`,
        `"${(exp.description || "").replace(/"/g, '""')}"`,
        `"${setor === "empresa_b2b" ? "Empresas (B2B)" : "Clínico / Consultório"}"`,
        `"${centroLabel}"`,
        `"${(exp.empresaB2BNome || "").replace(/"/g, '""')}"`,
        `"${(exp.servicoB2BDescricao || "").replace(/"/g, '""')}"`,
        `"${cfg.label}"`,
        exp.isRecurring ? "Sim" : "Não",
        exp.status === "paid" ? "Pago" : "Pendente",
        Number(exp.amount || 0).toFixed(2),
      ];
    });
    const csv =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [cab.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csv));
    link.setAttribute(
      "download",
      `despesas_${isB2BMode ? "empresas_b2b" : setorAtivoEfetivo}_${competenciaDespesas}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Extrato de despesas exportado em CSV!", "success");
  };

  return (
    <div className="w-full flex flex-col gap-5 animate-in fade-in duration-200">
      {/* Barra de Filtros: Competência + Visão Setorial / Centro de Custo + Busca */}
      <div className="bg-white p-4 rounded-2xl border border-soft flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Seletor de Competência */}
            <div className="flex items-center gap-1.5 bg-warm/40 px-3 py-1.5 rounded-xl border border-soft text-xs h-9">
              <Calendar className="w-3.5 h-3.5 text-forest shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-forest/60 whitespace-nowrap">
                Competência:
              </span>
              <select
                value={competenciaDespesas}
                onChange={(e) => setCompetenciaDespesas(e.target.value)}
                className="bg-transparent font-bold text-xs text-forest outline-none cursor-pointer"
              >
                <option value="todas">Todas as Competências</option>
                {mesesDisponiveis.map((m) => (
                  <option key={m} value={m}>
                    {fmtMesExtenso(m)} {m === mesAtualStr ? "· Atual" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Seletor de Visão Setorial (exibido no modo consolidado) */}
            {!isB2BMode && (
              <div className="flex items-center gap-1 p-1 bg-warm/60 rounded-xl border border-soft">
                {[
                  { id: "todos", label: "Consolidado · Tudo Somado" },
                  { id: "clinico", label: "Setor Clínico" },
                  { id: "empresa_b2b", label: "Setor Empresas (B2B)" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setFiltroSetor(opt.id as any);
                      if (opt.id === "clinico") {
                        setFiltroCentroCusto("todos");
                      }
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      filtroSetor === opt.id
                        ? "bg-white text-forest shadow-2xs font-bold"
                        : "text-forest/65 hover:text-forest"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {/* Filtro de Centro de Custo (sempre visível em Empresas B2B, ou quando B2B/Todos tem empresas) */}
            {(isB2BMode ||
              filtroSetor === "empresa_b2b" ||
              (filtroSetor === "todos" &&
                (empresasB2B.length > 0 || subtotaisPeriodo.b2bTotal > 0))) && (
              <div className="flex items-center gap-1.5 bg-warm/30 px-3 py-1.5 rounded-xl border border-soft text-xs h-9">
                <Layers className="w-3.5 h-3.5 text-forest/65 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-forest/60 whitespace-nowrap">
                  Centro de Custo:
                </span>
                <select
                  value={filtroCentroCusto}
                  onChange={(e) => setFiltroCentroCusto(e.target.value)}
                  className="bg-transparent font-semibold text-xs text-forest outline-none cursor-pointer max-w-[230px]"
                >
                  <option value="todos">
                    {isB2BMode
                      ? "Todos os Centros (Geral + Empresas)"
                      : "Todos (Sem filtro de centro B2B)"}
                  </option>
                  <option value="geral">Custo Geral (Sem vínculo específico)</option>
                  {empresasB2B.length > 0 && (
                    <optgroup label="Por Empresa Cliente (B2B)">
                      {empresasB2B.map((emp) => (
                        <option key={emp.id} value={`empresa:${emp.id}`}>
                          {emp.nomeFantasia || emp.razaoSocial}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-forest/40 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                value={buscaDespesa}
                onChange={(e) => setBuscaDespesa(e.target.value)}
                placeholder={
                  isB2BMode
                    ? "Buscar despesa, empresa ou serviço..."
                    : "Buscar descrição, centro ou categoria..."
                }
                className="pl-8 pr-3 py-1.5 bg-warm/30 border border-soft rounded-xl text-xs text-forest outline-none focus:border-forest h-9 w-48 sm:w-56"
              />
            </div>

            <button
              type="button"
              onClick={handleExportarCsvDespesas}
              className="px-3 py-1.5 bg-warm hover:bg-forest hover:text-white text-forest text-xs font-semibold rounded-xl border border-soft transition-colors flex items-center gap-1.5 h-9 cursor-pointer whitespace-nowrap shrink-0"
              title="Exportar despesas filtradas em CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Strip: 4 KPIs Financeiros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Receita Bruta do Escopo */}
        <div className="bg-white p-5 rounded-2xl border border-soft flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-forest/65">
              {isB2BMode
                ? "Receita Bruta B2B"
                : setorAtivoEfetivo === "clinico"
                ? "Receita Setor Clínico"
                : setorAtivoEfetivo === "empresa_b2b"
                ? "Receita Setor Empresas"
                : "Receita Bruta Consolidada"}
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-extrabold text-emerald-800 font-mono tabular-nums">
              {fmtMoeda(receitaBrutaEfetiva)}
            </h4>
            <div className="text-[11px] text-forest/60 mt-1 flex items-center gap-1.5 flex-wrap tabular-nums">
              {isB2BMode ? (
                filtroCentroCusto.startsWith("empresa:") ? (
                  <span>Faturamento da empresa selecionada no período</span>
                ) : (
                  <span>Total faturado em contratos e serviços B2B</span>
                )
              ) : setorAtivoEfetivo === "todos" && resumoReceita.hasLiveSources ? (
                <>
                  <span>Clínico: {fmtMoeda(resumoReceita.receitaClinica)}</span>
                  <span aria-hidden="true">·</span>
                  <span>B2B: {fmtMoeda(resumoReceita.receitaB2B)}</span>
                </>
              ) : (
                <span>Entradas apuradas no escopo selecionado</span>
              )}
            </div>
          </div>
        </div>

        {/* 2. Despesas do Escopo */}
        <div className="bg-white p-5 rounded-2xl border border-soft flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-forest/65">
              {isB2BMode
                ? "Despesas B2B"
                : setorAtivoEfetivo === "todos"
                ? "Despesas Consolidadas"
                : "Despesas do Setor"}
            </span>
            <TrendingDown className="w-4 h-4 text-rose-700" />
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-extrabold text-rose-700 font-mono tabular-nums">
              {fmtMoeda(totalDespesas)}
            </h4>
            <div className="text-[11px] text-forest/60 mt-1 flex items-center gap-1.5 flex-wrap tabular-nums">
              {isB2BMode || setorAtivoEfetivo === "empresa_b2b" ? (
                <>
                  <span>Alocadas: {fmtMoeda(subtotaisPeriodo.b2bEspecifico)}</span>
                  <span aria-hidden="true">·</span>
                  <span>Custo Geral: {fmtMoeda(subtotaisPeriodo.b2bGeral)}</span>
                </>
              ) : setorAtivoEfetivo === "todos" ? (
                <>
                  <span>Clínico: {fmtMoeda(subtotaisPeriodo.clinico)}</span>
                  <span aria-hidden="true">·</span>
                  <span>B2B: {fmtMoeda(subtotaisPeriodo.b2bTotal)}</span>
                </>
              ) : (
                <span>Custos operacionais clínicos do período</span>
              )}
            </div>
          </div>
        </div>

        {/* 3. Resultado / Lucro Líquido */}
        <div
          className={`p-5 rounded-2xl border flex flex-col justify-between ${
            lucroLiquido >= 0
              ? "bg-forest text-white border-forest"
              : "bg-rose-950 text-white border-rose-900"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">
              {isB2BMode ? "Resultado Líquido B2B" : "Lucro Líquido Apurado"}
            </span>
            <Wallet className="w-4 h-4 text-sun" />
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-extrabold font-mono tabular-nums text-white">
              {fmtMoeda(lucroLiquido)}
            </h4>
            <span className="text-[11px] text-white/80 mt-1 block tabular-nums">
              Margem Líquida: <strong>{margemLucro.toFixed(1)}%</strong>
            </span>
          </div>
        </div>

        {/* 4. Ação: Lançar Nova Despesa */}
        <div className="bg-warm/50 p-5 rounded-2xl border border-dashed border-forest/30 flex flex-col items-start justify-between gap-3">
          <div>
            <h5 className="font-serif font-bold text-forest text-sm">
              {isB2BMode
                ? "Custos & Centros de Custo B2B"
                : "Controle Integrado de Custos"}
            </h5>
            <p className="text-[11px] text-forest/70 mt-0.5 leading-relaxed">
              {isB2BMode
                ? "Vincule custos a uma empresa e serviço prestado ou registre como Custo Geral."
                : "Todos os lançamentos clínicos e B2B somam automaticamente no consolidado."}
            </p>
          </div>
          <button
            type="button"
            onClick={abrirModalNovaDespesa}
            className="w-full py-2 px-4 bg-forest hover:bg-forest/90 text-sun font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{isB2BMode ? "+ Nova Despesa B2B" : "+ Nova Despesa"}</span>
          </button>
        </div>
      </div>

      {/* Grid Principal: Painel Esquerdo (Centros de Custo & Categorias) + Painel Direito (Extrato) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel Esquerdo */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-soft space-y-6">
          {/* Bloco 1: Distribuição por Centro de Custo / Setor */}
          <div className="space-y-3">
            <h4 className="font-serif text-sm font-bold text-forest flex items-center gap-2 pb-2.5 border-b border-soft">
              <Layers className="w-4 h-4 text-forest/70" />
              <span>
                {isB2BMode || setorAtivoEfetivo === "empresa_b2b"
                  ? "Por Centro de Custo (B2B)"
                  : "Por Setor & Centro de Custo"}
              </span>
            </h4>

            {breakdownCentrosCusto.length === 0 ? (
              <p className="text-xs text-forest/50 py-3">
                Nenhum custo alocado neste filtro.
              </p>
            ) : (
              <div className="space-y-3">
                {breakdownCentrosCusto.map((cc) => (
                  <div key={cc.key} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="font-semibold text-forest truncate">
                        {cc.label}
                      </span>
                      <span className="font-mono tabular-nums font-bold text-forest shrink-0">
                        {fmtMoeda(cc.total)} ({cc.percentual.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="text-[11px] text-forest/55 flex items-center gap-1.5 tabular-nums">
                      <span>{cc.sublabel}</span>
                      <span aria-hidden="true">·</span>
                      <span>{cc.count} item(ns)</span>
                    </div>
                    <progress
                      value={Math.min(100, Math.max(2, Math.round(cc.percentual)))}
                      max={100}
                      className="w-full h-1.5 rounded-full overflow-hidden block [&::-webkit-progress-bar]:bg-warm [&::-webkit-progress-value]:bg-forest [&::-moz-progress-bar]:bg-forest"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bloco 2: Distribuição por Categoria */}
          <div className="space-y-3 pt-4 border-t border-soft">
            <h4 className="font-serif text-sm font-bold text-forest flex items-center gap-2 pb-2.5 border-b border-soft">
              <PieChart className="w-4 h-4 text-forest/70" />
              <span>Despesas por Categoria</span>
            </h4>

            {breakdownCategorias.length === 0 ? (
              <p className="text-xs text-forest/50 py-3">
                Nenhuma despesa lançada no período.
              </p>
            ) : (
              <div className="space-y-3">
                {breakdownCategorias.map((item) => (
                  <div key={item.category} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="font-semibold text-forest truncate">
                        {item.config.shortLabel}
                      </span>
                      <span className="font-mono tabular-nums text-forest shrink-0">
                        {fmtMoeda(item.total)} ({item.percentual.toFixed(0)}%)
                      </span>
                    </div>
                    <progress
                      value={Math.min(100, Math.max(2, Math.round(item.percentual)))}
                      max={100}
                      className="w-full h-1.5 rounded-full overflow-hidden block [&::-webkit-progress-bar]:bg-warm [&::-webkit-progress-value]:bg-emerald-800 [&::-moz-progress-bar]:bg-emerald-800"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Painel Direito: Extrato Detalhado */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl border border-soft flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-soft">
            <div>
              <h4 className="font-serif text-base font-bold text-forest flex items-center gap-2">
                <Receipt className="w-4 h-4 text-forest/70" />
                <span className="tabular-nums">
                  {isB2BMode
                    ? `Extrato de Despesas Corporativas (${filteredExpenses.length})`
                    : `Extrato de Despesas (${filteredExpenses.length})`}
                </span>
              </h4>
              <p className="text-[11px] text-forest/60 mt-0.5">
                Clique no status da linha para alternar entre Pago e Pendente
              </p>
            </div>

            <button
              type="button"
              onClick={abrirModalNovaDespesa}
              className="text-xs font-bold text-forest bg-warm hover:bg-soft px-3.5 py-2 rounded-xl border border-soft transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              + Adicionar Despesa
            </button>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="text-center py-12 bg-warm/25 rounded-2xl border border-dashed border-soft space-y-3 px-4">
              <p className="text-xs font-semibold text-forest/75">
                {isB2BMode
                  ? "Nenhuma despesa corporativa registrada para os filtros selecionados."
                  : "Nenhuma despesa registrada para esta competência e setor."}
              </p>
              <p className="text-[11px] text-forest/55 max-w-md mx-auto">
                {isB2BMode
                  ? "Lance custos de deslocamento, coffee-break, materiais, subcontratação ou prospecção indicando a empresa/serviço ou Custo Geral."
                  : "Adicione suas despesas operacionais para acompanhar o resultado líquido consolidado e por setor."}
              </p>
              <button
                type="button"
                onClick={abrirModalNovaDespesa}
                className="px-4 py-2 bg-forest hover:bg-forest/90 text-sun text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Lançar Primeira Despesa</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[440px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-warm/50 border-b border-soft text-forest/70 text-[10px] uppercase tracking-wider font-bold sticky top-0">
                  <tr>
                    <th className="px-3 py-2.5">Descrição</th>
                    <th className="px-3 py-2.5">
                      {isB2BMode ? "Centro de Custo / Serviço" : "Setor · Centro de Custo"}
                    </th>
                    <th className="px-3 py-2.5">Categoria</th>
                    <th className="px-3 py-2.5">Data</th>
                    <th className="px-3 py-2.5 text-right">Valor</th>
                    <th className="px-3 py-2.5 text-center">Status</th>
                    <th className="px-3 py-2.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-soft/60 text-forest/90">
                  {filteredExpenses.map((exp) => {
                    const cfg =
                      CATEGORIAS_DESPESA_CONFIG[exp.category] ||
                      CATEGORIAS_DESPESA_CONFIG.outros;
                    const setor = resolveExpenseSector(exp);
                    const isEspecifico =
                      setor === "empresa_b2b" &&
                      exp.centroCustoTipo === "especifico" &&
                      Boolean(exp.empresaB2BId);
                    const empRef = isEspecifico
                      ? empresasB2B.find((e) => e.id === exp.empresaB2BId)
                      : undefined;
                    const nomeEmp =
                      empRef?.nomeFantasia ||
                      empRef?.razaoSocial ||
                      exp.empresaB2BNome ||
                      "Empresa Cliente";

                    return (
                      <tr
                        key={exp.id}
                        className="hover:bg-warm/20 transition-colors tabular-nums"
                      >
                        <td className="px-3 py-3">
                          <div className="font-semibold text-forest">
                            {exp.description}
                          </div>
                          {exp.isRecurring && (
                            <span className="text-[11px] text-forest/55">
                              Recorrente mensal
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-3">
                          {setor === "clinico" ? (
                            <div className="text-[11px] text-forest/75">
                              <span className="font-semibold text-forest">
                                Setor Clínico
                              </span>
                              <span aria-hidden="true"> · </span>
                              <span>Consultório</span>
                            </div>
                          ) : isEspecifico ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1 text-[11px] font-semibold text-forest">
                                <Building2 className="w-3 h-3 text-emerald-700 shrink-0" />
                                <span className="truncate max-w-[180px]" title={nomeEmp}>
                                  {nomeEmp}
                                </span>
                              </div>
                              <div className="text-[11px] text-forest/60 truncate max-w-[210px]">
                                {exp.servicoB2BDescricao
                                  ? `Serviço: ${exp.servicoB2BDescricao}`
                                  : "Contrato geral da empresa"}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-900">
                                <Briefcase className="w-3 h-3 text-amber-700 shrink-0" />
                                <span>Custo Geral (B2B)</span>
                              </div>
                              <div className="text-[11px] text-forest/55">
                                Sem centro específico
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-3 text-[11px] text-forest/75">
                          {cfg.shortLabel}
                        </td>

                        <td className="px-3 py-3 font-mono tabular-nums text-forest/70 whitespace-nowrap">
                          {exp.date}
                        </td>

                        <td className="px-3 py-3 text-right font-mono tabular-nums font-bold text-rose-700 whitespace-nowrap">
                          {fmtMoeda(exp.amount)}
                        </td>

                        <td className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(exp.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                              exp.status === "paid"
                                ? "bg-emerald-50/70 text-emerald-800 border-emerald-200 hover:bg-emerald-100/70"
                                : "bg-amber-50/70 text-amber-800 border-amber-200 hover:bg-amber-100/70"
                            }`}
                            title="Clique para alternar entre Pago e Pendente"
                          >
                            {exp.status === "paid" ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Pago</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Pendente</span>
                              </>
                            )}
                          </button>
                        </td>

                        <td className="px-3 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1.5 text-forest/50 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Excluir despesa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Lançar Nova Despesa (com Setor e Centro de Custo) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-soft overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 flex justify-between items-center border-b border-soft bg-warm/50 shrink-0">
              <div className="flex items-center gap-2.5">
                <Receipt className="w-5 h-5 text-forest" />
                <div>
                  <h3 className="font-serif text-base sm:text-lg font-bold text-forest">
                    {isB2BMode
                      ? "Lançar Despesa Corporativa (B2B)"
                      : "Lançar Nova Despesa"}
                  </h3>
                  <p className="text-[11px] text-forest/65">
                    {isB2BMode
                      ? "Aloque o custo a uma empresa/serviço prestado ou registre como Custo Geral"
                      : "Integrado automaticamente ao fechamento consolidado e às visões setoriais"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-forest/60 hover:text-rose-600 rounded-full hover:bg-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleAddExpense}
              className="p-6 space-y-4 overflow-y-auto text-xs"
            >
              {/* Seletor de Setor quando aberto na Gestão de Despesas Global */}
              {!isB2BMode && (
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-forest/75 mb-1.5 block">
                    Setor da Despesa *
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-warm/60 rounded-xl border border-soft">
                    <button
                      type="button"
                      onClick={() => setSetorInput("clinico")}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        setorInput === "clinico"
                          ? "bg-white text-forest shadow-2xs border border-soft"
                          : "text-forest/65 hover:text-forest"
                      }`}
                    >
                      Setor Clínico / Consultório
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSetorInput("empresa_b2b");
                        if (!empresaIdInput && empresasB2B.length > 0) {
                          setEmpresaIdInput(empresasB2B[0].id);
                        }
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        setorInput === "empresa_b2b"
                          ? "bg-white text-forest shadow-2xs border border-soft"
                          : "text-forest/65 hover:text-forest"
                      }`}
                    >
                      Setor Empresas (B2B)
                    </button>
                  </div>
                </div>
              )}

              {/* Bloco de Centro de Custo B2B */}
              {(isB2BMode || setorInput === "empresa_b2b") && (
                <div className="p-4 rounded-2xl bg-warm/35 border border-soft space-y-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-forest/80 mb-1.5 block">
                      Centro de Custo (Alocação B2B) *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCentroCustoTipoInput("especifico");
                          if (!empresaIdInput && empresasB2B.length > 0) {
                            setEmpresaIdInput(empresasB2B[0].id);
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                          centroCustoTipoInput === "especifico"
                            ? "bg-white border-forest text-forest shadow-2xs"
                            : "bg-white/50 border-soft text-forest/70 hover:text-forest"
                        }`}
                      >
                        <div className="font-bold text-xs flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span>Empresa / Serviço Prestado</span>
                        </div>
                        <span className="text-[11px] text-forest/60 block mt-0.5">
                          Relacionado a um cliente e entrega específica
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCentroCustoTipoInput("geral");
                          setServicoIdInput("");
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                          centroCustoTipoInput === "geral"
                            ? "bg-white border-forest text-forest shadow-2xs"
                            : "bg-white/50 border-soft text-forest/70 hover:text-forest"
                        }`}
                      >
                        <div className="font-bold text-xs flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>Custo Geral</span>
                        </div>
                        <span className="text-[11px] text-forest/60 block mt-0.5">
                          Sem vínculo a uma empresa ou serviço único
                        </span>
                      </button>
                    </div>
                  </div>

                  {centroCustoTipoInput === "especifico" && (
                    <div className="space-y-3 pt-1">
                      {empresasB2B.length === 0 ? (
                        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-[11px]">
                          Você ainda não possui empresas cadastradas na carteira B2B. Cadastre uma empresa cliente primeiro ou selecione{" "}
                          <strong>Custo Geral</strong>.
                        </div>
                      ) : (
                        <>
                          <div>
                            <label className="text-[11px] font-bold text-forest mb-1 block">
                              Empresa Cliente *
                            </label>
                            <select
                              value={empresaIdInput}
                              onChange={(e) => {
                                setEmpresaIdInput(e.target.value);
                                setServicoIdInput("");
                              }}
                              className="w-full text-xs bg-white border border-soft px-3 py-2.5 rounded-xl focus:outline-none focus:border-forest text-forest font-semibold"
                            >
                              <option value="">Selecione a empresa cliente...</option>
                              {empresasB2B.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                  {emp.nomeFantasia || emp.razaoSocial}
                                  {emp.cnpj ? ` (${emp.cnpj})` : ""}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-forest mb-1 block">
                              Serviço Prestado Relacionado
                            </label>
                            <select
                              value={servicoIdInput}
                              onChange={(e) => setServicoIdInput(e.target.value)}
                              disabled={!empresaIdInput}
                              className="w-full text-xs bg-white border border-soft px-3 py-2.5 rounded-xl focus:outline-none focus:border-forest text-forest disabled:opacity-50"
                            >
                              <option value="">
                                Vínculo geral ao contrato da empresa (sem serviço único)
                              </option>
                              {servicosEmpresaModal.map((srv) => (
                                <option key={srv.id} value={srv.id}>
                                  #{srv.numeroItem || 1} · {srv.descricaoServico} (
                                  {srv.data || "s/ data"}) — {fmtMoeda(Number(srv.valor || 0))}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-forest/80 mb-1 block">
                  Descrição da Despesa *
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    isB2BMode || setorInput === "empresa_b2b"
                      ? "Ex: Uber/Pedágio visita técnica, Impressão de apostilas, Coffee-break palestra..."
                      : "Ex: Aluguel de Sala, Anúncios Google, Supervisão Clínica..."
                  }
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  className="w-full text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-forest text-forest"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-forest/80 mb-1 block">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0,00"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="w-full text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-forest text-forest font-mono tabular-nums font-bold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-forest/80 mb-1 block">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                    className="w-full text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-forest text-forest font-mono tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-forest/80 mb-1 block">
                  Categoria *
                </label>
                <select
                  value={categoryInput}
                  onChange={(e) =>
                    setCategoryInput(e.target.value as ExpenseCategory)
                  }
                  className="w-full text-xs sm:text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-forest text-forest font-semibold"
                >
                  {Object.entries(CATEGORIAS_DESPESA_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-forest/80 mb-1 block">
                    Status de Pagamento
                  </label>
                  <select
                    value={statusInput}
                    onChange={(e) =>
                      setStatusInput(e.target.value as "paid" | "pending")
                    }
                    className="w-full text-xs sm:text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-forest text-forest"
                  >
                    <option value="paid">Pago</option>
                    <option value="pending">Pendente</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isRecurringInput}
                      onChange={(e) => setIsRecurringInput(e.target.checked)}
                      className="w-4 h-4 text-forest rounded border-soft accent-forest cursor-pointer"
                    />
                    <span className="text-xs font-bold text-forest">
                      Despesa Recorrente
                    </span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-soft flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-warm text-forest rounded-xl font-bold text-xs hover:bg-soft transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-forest hover:bg-forest/90 text-sun rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Salvar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
