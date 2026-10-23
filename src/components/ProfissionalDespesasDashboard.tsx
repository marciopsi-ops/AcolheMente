import React, { useState, useEffect, useMemo } from "react";
import {
  Wallet,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  DollarSign,
  PieChart,
  Calendar,
  CheckCircle2,
  Clock,
  Tag,
  Receipt,
  AlertCircle,
  X,
} from "lucide-react";

export interface ExpenseItem {
  id: string;
  professionalId: string;
  description: string;
  amount: number;
  category: "marketing" | "taxas_plataforma" | "infraestrutura" | "impostos" | "capacitacao" | "outros";
  date: string; // YYYY-MM-DD
  isRecurring: boolean;
  status: "paid" | "pending";
}

const CATEGORIAS_DESPESA_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  marketing: { label: "Marketing & Anúncios", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  taxas_plataforma: { label: "Taxas da Plataforma / Sistema", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  infraestrutura: { label: "Consultório & Infraestrutura", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  impostos: { label: "Impostos & Contabilidade (MEI/PJ)", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  capacitacao: { label: "Supervisão & Cursos", color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200" },
  outros: { label: "Outras Despesas", color: "text-stone-700", bg: "bg-stone-50 border-stone-200" },
};

interface ProfissionalDespesasDashboardProps {
  profissionalId: string;
  receitaBruta: number;
  competenciaSelecionada: string;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export function ProfissionalDespesasDashboard({
  profissionalId,
  receitaBruta,
  competenciaSelecionada,
  showToast,
}: ProfissionalDespesasDashboardProps) {
  const [expenses, setExpenses] = useState<ExpenseItem[]>(() => {
    try {
      const saved = localStorage.getItem(`acolhe_expenses_${profissionalId}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: "exp_1",
        professionalId: profissionalId,
        description: "Mensalidade Plano AcolheMente Avançado",
        amount: 79.90,
        category: "taxas_plataforma",
        date: `${competenciaSelecionada}-05`,
        isRecurring: true,
        status: "paid",
      },
      {
        id: "exp_2",
        professionalId: profissionalId,
        description: "Anúncios Instagram / Google Ads",
        amount: 150.00,
        category: "marketing",
        date: `${competenciaSelecionada}-10`,
        isRecurring: true,
        status: "paid",
      },
      {
        id: "exp_3",
        professionalId: profissionalId,
        description: "Contabilidade MEI / Simples Nacional",
        amount: 120.00,
        category: "impostos",
        date: `${competenciaSelecionada}-15`,
        isRecurring: true,
        status: "paid",
      },
    ];
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [descInput, setDescInput] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [categoryInput, setCategoryInput] = useState<ExpenseItem["category"]>("marketing");
  const [dateInput, setDateInput] = useState(new Date().toISOString().split("T")[0]);
  const [isRecurringInput, setIsRecurringInput] = useState(false);
  const [statusInput, setStatusInput] = useState<"paid" | "pending">("paid");

  useEffect(() => {
    try {
      localStorage.setItem(`acolhe_expenses_${profissionalId}`, JSON.stringify(expenses));
    } catch (e) {}
  }, [expenses, profissionalId]);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amountInput);
    if (isNaN(val) || val <= 0) {
      showToast("Informe um valor válido para a despesa.", "error");
      return;
    }
    if (!descInput.trim()) {
      showToast("Informe a descrição da despesa.", "error");
      return;
    }

    const newExpense: ExpenseItem = {
      id: `exp_${Date.now()}`,
      professionalId: profissionalId,
      description: descInput.trim(),
      amount: val,
      category: categoryInput,
      date: dateInput,
      isRecurring: isRecurringInput,
      status: statusInput,
    };

    setExpenses([newExpense, ...expenses]);
    showToast("Despesa lançada com sucesso!", "success");
    setShowAddModal(false);
    setDescInput("");
    setAmountInput("");
    setIsRecurringInput(false);
  };

  const handleDeleteExpense = (id: string) => {
    if (!confirm("Deseja excluir esta despesa permanentemente?")) return;
    setExpenses(expenses.filter((e) => e.id !== id));
    showToast("Despesa removida.", "info");
  };

  // Filtrar despesas do mês selecionado (ou todas)
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (competenciaSelecionada === "todas") return true;
      return e.date && e.date.startsWith(competenciaSelecionada);
    });
  }, [expenses, competenciaSelecionada]);

  const totalDespesas = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [filteredExpenses]);

  const lucroLiquido = receitaBruta - totalDespesas;
  const margemLucro = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0;

  // Breakdown por categoria
  const breakdownCategorias = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + (Number(e.amount) || 0);
    });
    return Object.entries(map).map(([cat, total]) => ({
      category: cat,
      config: CATEGORIAS_DESPESA_CONFIG[cat] || { label: cat, color: "text-stone-700", bg: "bg-stone-50" },
      total,
      percentual: totalDespesas > 0 ? (total / totalDespesas) * 100 : 0,
    }));
  }, [filteredExpenses, totalDespesas]);

  const fmtMoeda = (val: number) =>
    `R$ ${Number(val || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-200">
      {/* Top Banner de Resumo Financeiro Consolidado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Receita Bruta */}
        <div className="bg-white p-5 rounded-2xl border border-soft shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-forest/65">Receita Bruta</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h4 className="font-serif text-2xl font-extrabold text-emerald-800 font-mono">
              {fmtMoeda(receitaBruta)}
            </h4>
            <span className="text-[11px] text-forest/60 mt-0.5 block">Entradas de consultas no período</span>
          </div>
        </div>

        {/* Despesas Totais */}
        <div className="bg-white p-5 rounded-2xl border border-soft shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-forest/65">Despesas Totais</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-700">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h4 className="font-serif text-2xl font-extrabold text-rose-700 font-mono">
              {fmtMoeda(totalDespesas)}
            </h4>
            <span className="text-[11px] text-forest/60 mt-0.5 block">Custos operacionais e taxas</span>
          </div>
        </div>

        {/* Lucro Líquido */}
        <div className={`p-5 rounded-2xl border shadow-2xs flex flex-col justify-between ${
          lucroLiquido >= 0 ? "bg-gradient-to-br from-emerald-900 to-forest text-white border-forest" : "bg-gradient-to-br from-rose-900 to-rose-950 text-white border-rose-900"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">Lucro Líquido</span>
            <div className="p-2 rounded-xl bg-white/10 text-sun">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h4 className="font-serif text-2xl font-extrabold font-mono text-white">
              {fmtMoeda(lucroLiquido)}
            </h4>
            <span className="text-[11px] text-white/80 mt-0.5 block">
              Margem de Lucro: <strong>{margemLucro.toFixed(1)}%</strong>
            </span>
          </div>
        </div>

        {/* Ação: Lançar Nova Despesa */}
        <div className="bg-warm/60 p-5 rounded-2xl border border-dashed border-forest/30 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-forest text-sun flex items-center justify-center shadow-xs">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h5 className="font-serif font-bold text-forest text-sm">Controle de Custos</h5>
            <p className="text-[11px] text-forest/70">Lance despesas para apurar seu lucro real.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="w-full py-2 bg-forest hover:bg-forest/90 text-sun font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nova Despesa</span>
          </button>
        </div>
      </div>

      {/* Grid: Breakdown por Categoria & Listagem Detalhada */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel Esquerdo: Breakdown por Categoria */}
        <div className="bg-white p-6 rounded-3xl border border-soft shadow-2xs space-y-4">
          <h4 className="font-serif text-base font-bold text-forest flex items-center gap-2 pb-3 border-b border-soft">
            <PieChart className="w-4 h-4 text-forest/70" />
            <span>Despesas por Categoria</span>
          </h4>

          {breakdownCategorias.length === 0 ? (
            <p className="text-xs text-forest/50 italic py-6 text-center">Nenhuma despesa lançada no período.</p>
          ) : (
            <div className="space-y-3">
              {breakdownCategorias.map((item) => (
                <div key={item.category} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-forest">
                    <span>{item.config.label}</span>
                    <span className="font-mono">{fmtMoeda(item.total)} ({item.percentual.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-warm rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-forest h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, item.percentual)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Painel Direito: Listagem de Despesas */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-soft shadow-2xs flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-soft">
            <h4 className="font-serif text-base font-bold text-forest flex items-center gap-2">
              <Receipt className="w-4 h-4 text-forest/70" />
              <span>Extrato de Despesas ({filteredExpenses.length})</span>
            </h4>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="text-xs font-bold text-forest bg-warm hover:bg-soft px-3 py-1.5 rounded-xl border border-soft transition-colors cursor-pointer"
            >
              + Adicionar
            </button>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="text-center py-12 bg-warm/30 rounded-2xl border border-dashed border-soft text-forest/60 text-xs">
              Nenhuma despesa registrada para esta competência.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[380px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-warm/60 border-b border-soft text-forest/70 font-semibold sticky top-0">
                  <tr>
                    <th className="px-3 py-2.5">Descrição</th>
                    <th className="px-3 py-2.5">Categoria</th>
                    <th className="px-3 py-2.5">Data</th>
                    <th className="px-3 py-2.5 text-right">Valor</th>
                    <th className="px-3 py-2.5 text-center">Status</th>
                    <th className="px-3 py-2.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-soft/50 text-forest/90">
                  {filteredExpenses.map((exp) => {
                    const cfg = CATEGORIAS_DESPESA_CONFIG[exp.category] || CATEGORIAS_DESPESA_CONFIG.outros;
                    return (
                      <tr key={exp.id} className="hover:bg-warm/20 transition-colors">
                        <td className="px-3 py-3 font-semibold">
                          <div>{exp.description}</div>
                          {exp.isRecurring && (
                            <span className="text-[9px] bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded font-normal border border-purple-200">
                              Recorrente mensal
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${cfg.bg} ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-mono text-forest/70">{exp.date}</td>
                        <td className="px-3 py-3 text-right font-mono font-bold text-rose-700">
                          {fmtMoeda(exp.amount)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {exp.status === "paid" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Pago
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              Pendente
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1.5 text-forest/50 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
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

      {/* Modal Adicionar Despesa */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-soft overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 flex justify-between items-center border-b border-soft bg-warm/50">
              <h3 className="font-serif text-lg font-bold text-forest flex items-center gap-2">
                <Receipt className="w-5 h-5 text-forest/70" />
                Lançar Nova Despesa
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-forest/60 hover:text-red-600 rounded-full hover:bg-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-forest/80 mb-1 block">
                  Descrição da Despesa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Aluguel de Sala, Anúncios Google, Livros..."
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  className="w-full text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-forest text-forest"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-forest/80 mb-1 block">
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
                    className="w-full text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-forest text-forest font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-forest/80 mb-1 block">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                    className="w-full text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-forest text-forest"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-forest/80 mb-1 block">
                  Categoria *
                </label>
                <select
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value as any)}
                  className="w-full text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-forest text-forest font-semibold"
                >
                  {Object.entries(CATEGORIAS_DESPESA_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-forest/80 mb-1 block">
                    Status de Pagamento
                  </label>
                  <select
                    value={statusInput}
                    onChange={(e) => setStatusInput(e.target.value as any)}
                    className="w-full text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-forest text-forest"
                  >
                    <option value="paid">Pago</option>
                    <option value="pending">Pendente</option>
                  </select>
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isRecurringInput}
                      onChange={(e) => setIsRecurringInput(e.target.checked)}
                      className="w-4 h-4 text-forest rounded border-soft accent-forest cursor-pointer"
                    />
                    <span className="text-xs font-bold text-forest">Despesa Recorrente</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-soft flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-warm text-forest rounded-xl font-bold text-xs hover:bg-soft transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-forest hover:bg-forest/90 text-sun rounded-xl font-bold text-xs transition-all shadow-xs"
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
