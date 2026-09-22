import React, { useState, useMemo, useRef } from "react";
import {
  Users,
  Plus,
  Trash2,
  Download,
  Upload,
  Search,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  UserPlus,
  ShieldAlert,
  Copy,
  Check,
  Filter,
  Eye,
  UserCheck,
  RefreshCw,
} from "lucide-react";

export interface ColaboradorItem {
  id: string;
  tipo: "titular" | "dependente";
  nomeCompleto: string;
  cpf: string;
  dataNascimento: string;
  nomeMae: string;
  dataAdmissao: string;
  email: string;
  telefone: string;
  titularVinculado?: string; // Nome ou CPF do titular (se dependente)
  parentesco?: string; // Cônjuge, Filho(a), etc
  observacoes?: string;
}

export type ColaboradorEmpresa = ColaboradorItem;

interface EmpresaColaboradoresSpreadsheetProps {
  empresaId: string;
  empresaNome?: string;
  quantidadeVidasContratadas?: string | number;
  colaboradores: ColaboradorItem[];
  onChangeColaboradores: (colaboradores: ColaboradorItem[]) => void;
  readOnly?: boolean;
  onShowToast?: (msg: string, type?: "success" | "error" | "info") => void;
}

export const EmpresaColaboradoresSpreadsheet: React.FC<EmpresaColaboradoresSpreadsheetProps> = ({
  empresaId,
  empresaNome = "Empresa",
  quantidadeVidasContratadas,
  colaboradores = [],
  onChangeColaboradores,
  readOnly = false,
  onShowToast,
}) => {
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState<"todos" | "titular" | "dependente">("todos");
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Parse meta de vidas
  const metaVidas = useMemo(() => {
    if (!quantidadeVidasContratadas) return null;
    const match = String(quantidadeVidasContratadas).match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  }, [quantidadeVidasContratadas]);

  // Totals
  const totalGeral = colaboradores.length;
  const totalTitulares = useMemo(
    () => colaboradores.filter((c) => c.tipo !== "dependente").length,
    [colaboradores]
  );
  const totalDependentes = useMemo(
    () => colaboradores.filter((c) => c.tipo === "dependente").length,
    [colaboradores]
  );

  // Filtered rows
  const filteredList = useMemo(() => {
    return colaboradores.filter((item) => {
      if (filterTipo !== "todos" && item.tipo !== filterTipo) return false;
      if (!search.trim()) return true;
      const term = search.toLowerCase();
      return (
        (item.nomeCompleto || "").toLowerCase().includes(term) ||
        (item.cpf || "").toLowerCase().includes(term) ||
        (item.email || "").toLowerCase().includes(term) ||
        (item.telefone || "").toLowerCase().includes(term) ||
        (item.nomeMae || "").toLowerCase().includes(term) ||
        (item.titularVinculado || "").toLowerCase().includes(term)
      );
    });
  }, [colaboradores, filterTipo, search]);

  // Format CPF helper
  const formatCPF = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  // Format phone helper
  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10)
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  // Cell change handler
  const handleCellChange = (id: string, field: keyof ColaboradorItem, value: any) => {
    if (readOnly) return;
    const updated = colaboradores.map((colab) => {
      if (colab.id === id) {
        let finalVal = value;
        if (field === "cpf") finalVal = formatCPF(value);
        if (field === "telefone") finalVal = formatPhone(value);
        return { ...colab, [field]: finalVal };
      }
      return colab;
    });
    onChangeColaboradores(updated);
  };

  // Add a new row
  const handleAddRow = (tipo: "titular" | "dependente" = "titular") => {
    if (readOnly) return;
    const newId = `colab_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newItem: ColaboradorItem = {
      id: newId,
      tipo,
      nomeCompleto: "",
      cpf: "",
      dataNascimento: "",
      nomeMae: "",
      dataAdmissao: tipo === "titular" ? new Date().toISOString().split("T")[0] : "",
      email: "",
      telefone: "",
      titularVinculado: "",
      parentesco: tipo === "dependente" ? "Filho(a)" : undefined,
    };
    const updated = [newItem, ...colaboradores];
    onChangeColaboradores(updated);
    if (onShowToast) onShowToast(`Nova linha de ${tipo} adicionada.`, "info");
  };

  // Delete row
  const handleDeleteRow = (id: string) => {
    if (readOnly) return;
    if (!window.confirm("Deseja realmente remover esta linha de colaborador/dependente?")) return;
    const updated = colaboradores.filter((c) => c.id !== id);
    onChangeColaboradores(updated);
    if (onShowToast) onShowToast("Registro removido.", "info");
  };

  // Duplicate row
  const handleDuplicateRow = (item: ColaboradorItem) => {
    if (readOnly) return;
    const newId = `colab_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const duplicated: ColaboradorItem = {
      ...item,
      id: newId,
      nomeCompleto: `${item.nomeCompleto} (Cópia)`,
      cpf: "",
    };
    const updated = [duplicated, ...colaboradores];
    onChangeColaboradores(updated);
    if (onShowToast) onShowToast("Linha duplicada com sucesso.", "info");
  };

  // Export CSV
  const handleExportCSV = () => {
    if (colaboradores.length === 0) {
      alert("Nenhum dado cadastrado para exportar.");
      return;
    }
    const headers = [
      "Tipo",
      "Nome Completo",
      "CPF",
      "Data de Nascimento",
      "Nome da Mãe",
      "Data de Admissão",
      "E-mail",
      "Telefone",
      "Titular Vinculado",
      "Parentesco",
    ];

    const rows = colaboradores.map((c) => [
      c.tipo === "dependente" ? "Dependente" : "Titular",
      `"${(c.nomeCompleto || "").replace(/"/g, '""')}"`,
      `"${c.cpf || ""}"`,
      `"${c.dataNascimento || ""}"`,
      `"${(c.nomeMae || "").replace(/"/g, '""')}"`,
      `"${c.dataAdmissao || ""}"`,
      `"${c.email || ""}"`,
      `"${c.telefone || ""}"`,
      `"${(c.titularVinculado || "").replace(/"/g, '""')}"`,
      `"${c.parentesco || ""}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const cleanName = empresaNome.replace(/[^a-zA-Z0-9]/g, "_");
    link.setAttribute("href", url);
    link.setAttribute("download", `Colaboradores_${cleanName}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (onShowToast) onShowToast("Planilha CSV exportada com sucesso!", "success");
  };

  // Process text or CSV paste for importing
  const processRawImportText = (rawText: string) => {
    const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) {
      alert("Nenhum dado válido encontrado para importar.");
      return;
    }

    const newItems: ColaboradorItem[] = [];
    // Check if line 0 is a header
    let startIdx = 0;
    const firstLower = lines[0].toLowerCase();
    if (
      firstLower.includes("nome") ||
      firstLower.includes("cpf") ||
      firstLower.includes("nascimento") ||
      firstLower.includes("tipo")
    ) {
      startIdx = 1;
    }

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i];
      // Split by tab (Excel/Sheets copy-paste) or semicolon or comma
      let cols: string[] = [];
      if (line.includes("\t")) {
        cols = line.split("\t");
      } else if (line.includes(";")) {
        cols = line.split(";");
      } else {
        cols = line.split(",");
      }

      cols = cols.map((c) => c.replace(/^["']|["']$/g, "").trim());

      // If at least one column has content
      if (cols.length > 0 && cols.some((c) => c.length > 0)) {
        // Detect if first column is Tipo or Nome
        let tipo: "titular" | "dependente" = "titular";
        let offset = 0;
        const col0Lower = (cols[0] || "").toLowerCase();
        if (col0Lower === "dependente" || col0Lower === "dep") {
          tipo = "dependente";
          offset = 1;
        } else if (col0Lower === "titular" || col0Lower === "colaborador" || col0Lower === "tit") {
          tipo = "titular";
          offset = 1;
        }

        const nomeCompleto = cols[offset] || "";
        const cpf = formatCPF(cols[offset + 1] || "");
        const dataNascimento = cols[offset + 2] || "";
        const nomeMae = cols[offset + 3] || "";
        const dataAdmissao = cols[offset + 4] || "";
        const email = cols[offset + 5] || "";
        const telefone = formatPhone(cols[offset + 6] || "");
        const titularVinculado = cols[offset + 7] || "";

        if (nomeCompleto.trim().length > 0 || cpf.trim().length > 0) {
          newItems.push({
            id: `colab_${Date.now()}_${Math.random().toString(36).substr(2, 6)}_${i}`,
            tipo,
            nomeCompleto,
            cpf,
            dataNascimento,
            nomeMae,
            dataAdmissao,
            email,
            telefone,
            titularVinculado,
          });
        }
      }
    }

    if (newItems.length === 0) {
      alert("Não foi possível identificar registros válidos no texto colado.");
      return;
    }

    const merged = [...newItems, ...colaboradores];
    onChangeColaboradores(merged);
    setShowImportModal(false);
    setImportText("");
    if (onShowToast) {
      onShowToast(`${newItems.length} colaboradores/dependentes importados com sucesso!`, "success");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        processRawImportText(text);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Banner: Metrics & Controls */}
      <div className="bg-white p-4 rounded-2xl border border-soft shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left summary cards */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-warm/60 border border-soft rounded-xl text-xs font-bold text-forest">
            <Users className="w-4 h-4 text-sun-dark" />
            <span>Total: {totalGeral} vidas</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-xs font-semibold text-blue-900">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>{totalTitulares} Titulares</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-xl text-xs font-semibold text-purple-900">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            <span>{totalDependentes} Dependentes</span>
          </div>

          {metaVidas !== null && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                totalGeral > metaVidas
                  ? "bg-amber-50 text-amber-900 border-amber-300"
                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
              }`}
            >
              <span>Contratado: {metaVidas} vidas</span>
              {totalGeral > metaVidas && (
                <span className="text-[10px] bg-amber-200 text-amber-950 px-1.5 py-0.5 rounded font-bold">
                  +{totalGeral - metaVidas} excedente
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right action buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {!readOnly && (
            <>
              <button
                type="button"
                onClick={() => handleAddRow("titular")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-forest hover:bg-forest/90 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-sun" />
                <span>+ Titular</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddRow("dependente")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-purple-200" />
                <span>+ Dependente</span>
              </button>
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-warm/80 hover:bg-soft text-forest rounded-xl text-xs font-semibold border border-soft transition-colors cursor-pointer"
                title="Importar CSV ou colar do Excel"
              >
                <Upload className="w-3.5 h-3.5 text-forest/70" />
                <span>Importar Planilha</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-warm/60 text-forest rounded-xl text-xs font-semibold border border-soft transition-colors cursor-pointer"
            title="Exportar planilha em formato CSV (Excel)"
          >
            <Download className="w-3.5 h-3.5 text-forest/70" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white px-4 py-2.5 rounded-2xl border border-soft">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-3.5 h-3.5 text-forest/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF, e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs bg-warm/40 border border-soft pl-9 pr-3 py-1.5 rounded-xl focus:outline-none focus:border-sun-dark"
            />
          </div>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-[11px] text-forest/60 hover:text-forest underline"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Tipo Filter Tabs */}
        <div className="flex items-center gap-1 self-start sm:self-auto bg-warm/60 p-1 rounded-xl border border-soft text-xs">
          <button
            type="button"
            onClick={() => setFilterTipo("todos")}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
              filterTipo === "todos"
                ? "bg-white text-forest shadow-2xs"
                : "text-forest/60 hover:text-forest"
            }`}
          >
            Todos ({totalGeral})
          </button>
          <button
            type="button"
            onClick={() => setFilterTipo("titular")}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
              filterTipo === "titular"
                ? "bg-white text-blue-900 shadow-2xs font-bold"
                : "text-forest/60 hover:text-forest"
            }`}
          >
            Titulares ({totalTitulares})
          </button>
          <button
            type="button"
            onClick={() => setFilterTipo("dependente")}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
              filterTipo === "dependente"
                ? "bg-white text-purple-900 shadow-2xs font-bold"
                : "text-forest/60 hover:text-forest"
            }`}
          >
            Dependentes ({totalDependentes})
          </button>
        </div>
      </div>

      {/* Spreadsheet Grid Table */}
      <div className="flex-1 bg-white border border-soft rounded-2xl shadow-xs overflow-hidden flex flex-col min-h-[420px]">
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-forest text-white text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10 select-none">
                <th className="py-2.5 px-3 w-12 text-center border-r border-forest/40">#</th>
                <th className="py-2.5 px-3 w-28 border-r border-forest/40">Tipo</th>
                <th className="py-2.5 px-3 w-64 border-r border-forest/40">Nome Completo *</th>
                <th className="py-2.5 px-3 w-36 border-r border-forest/40">CPF</th>
                <th className="py-2.5 px-3 w-32 border-r border-forest/40">Nascimento</th>
                <th className="py-2.5 px-3 w-56 border-r border-forest/40">Nome da Mãe</th>
                <th className="py-2.5 px-3 w-32 border-r border-forest/40">Admissão</th>
                <th className="py-2.5 px-3 w-56 border-r border-forest/40">E-mail</th>
                <th className="py-2.5 px-3 w-36 border-r border-forest/40">Telefone</th>
                <th className="py-2.5 px-3 w-44 border-r border-forest/40">Titular / Parentesco</th>
                {!readOnly && <th className="py-2.5 px-3 w-20 text-center">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-soft text-xs text-forest">
              {filteredList.length === 0 ? (
                <tr>
                  <td
                    colSpan={readOnly ? 10 : 11}
                    className="py-12 text-center text-forest/60 space-y-3"
                  >
                    <FileSpreadsheet className="w-10 h-10 text-forest/20 mx-auto" />
                    <p className="font-semibold text-sm">Nenhum colaborador cadastrado na lista.</p>
                    <p className="text-xs text-forest/40 max-w-md mx-auto">
                      Clique no botão <strong>"+ Titular"</strong> para inserir um novo colaborador ou use{" "}
                      <strong>"Importar Planilha"</strong> para colar dados do Excel.
                    </p>
                    {!readOnly && (
                      <div className="flex justify-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => handleAddRow("titular")}
                          className="px-4 py-2 bg-forest text-white rounded-xl text-xs font-bold"
                        >
                          + Adicionar Primeiro Colaborador
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => {
                  const isDependente = item.tipo === "dependente";
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-sun/10 transition-colors group ${
                        isDependente ? "bg-purple-50/20" : idx % 2 === 1 ? "bg-warm/15" : "bg-white"
                      }`}
                    >
                      {/* # Index */}
                      <td className="py-2 px-2 text-center text-[10px] text-forest/50 font-mono border-r border-soft">
                        {idx + 1}
                      </td>

                      {/* Tipo */}
                      <td className="py-1.5 px-2 border-r border-soft">
                        {readOnly ? (
                          <span
                            className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              isDependente
                                ? "bg-purple-100 text-purple-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {isDependente ? "Dependente" : "Titular"}
                          </span>
                        ) : (
                          <select
                            value={item.tipo}
                            onChange={(e) =>
                              handleCellChange(item.id, "tipo", e.target.value as any)
                            }
                            className={`w-full text-[11px] font-semibold rounded-lg px-2 py-1 border transition-colors focus:outline-none ${
                              isDependente
                                ? "bg-purple-100 text-purple-900 border-purple-200"
                                : "bg-blue-50 text-blue-900 border-blue-200"
                            }`}
                          >
                            <option value="titular">Titular</option>
                            <option value="dependente">Dependente</option>
                          </select>
                        )}
                      </td>

                      {/* Nome Completo */}
                      <td className="py-1 px-2 border-r border-soft">
                        <input
                          type="text"
                          disabled={readOnly}
                          value={item.nomeCompleto || ""}
                          onChange={(e) => handleCellChange(item.id, "nomeCompleto", e.target.value)}
                          placeholder="Nome completo..."
                          className="w-full bg-transparent px-2 py-1 rounded border border-transparent hover:border-soft focus:border-sun-dark focus:bg-white focus:outline-none text-xs font-medium"
                        />
                      </td>

                      {/* CPF */}
                      <td className="py-1 px-2 border-r border-soft">
                        <input
                          type="text"
                          disabled={readOnly}
                          value={item.cpf || ""}
                          onChange={(e) => handleCellChange(item.id, "cpf", e.target.value)}
                          placeholder="000.000.000-00"
                          maxLength={14}
                          className="w-full bg-transparent px-2 py-1 rounded border border-transparent hover:border-soft focus:border-sun-dark focus:bg-white focus:outline-none text-xs font-mono"
                        />
                      </td>

                      {/* Data de Nascimento */}
                      <td className="py-1 px-2 border-r border-soft">
                        <input
                          type="text"
                          disabled={readOnly}
                          value={item.dataNascimento || ""}
                          onChange={(e) =>
                            handleCellChange(item.id, "dataNascimento", e.target.value)
                          }
                          placeholder="DD/MM/AAAA"
                          className="w-full bg-transparent px-2 py-1 rounded border border-transparent hover:border-soft focus:border-sun-dark focus:bg-white focus:outline-none text-xs"
                        />
                      </td>

                      {/* Nome da Mãe */}
                      <td className="py-1 px-2 border-r border-soft">
                        <input
                          type="text"
                          disabled={readOnly}
                          value={item.nomeMae || ""}
                          onChange={(e) => handleCellChange(item.id, "nomeMae", e.target.value)}
                          placeholder="Nome completo da mãe..."
                          className="w-full bg-transparent px-2 py-1 rounded border border-transparent hover:border-soft focus:border-sun-dark focus:bg-white focus:outline-none text-xs"
                        />
                      </td>

                      {/* Data de Admissão */}
                      <td className="py-1 px-2 border-r border-soft">
                        <input
                          type="text"
                          disabled={readOnly || isDependente}
                          value={isDependente ? "-" : item.dataAdmissao || ""}
                          onChange={(e) =>
                            handleCellChange(item.id, "dataAdmissao", e.target.value)
                          }
                          placeholder={isDependente ? "N/A" : "DD/MM/AAAA"}
                          className={`w-full bg-transparent px-2 py-1 rounded border border-transparent hover:border-soft focus:border-sun-dark focus:bg-white focus:outline-none text-xs ${
                            isDependente ? "text-forest/30 italic" : ""
                          }`}
                        />
                      </td>

                      {/* E-mail */}
                      <td className="py-1 px-2 border-r border-soft">
                        <input
                          type="email"
                          disabled={readOnly}
                          value={item.email || ""}
                          onChange={(e) => handleCellChange(item.id, "email", e.target.value)}
                          placeholder="colaborador@empresa.com"
                          className="w-full bg-transparent px-2 py-1 rounded border border-transparent hover:border-soft focus:border-sun-dark focus:bg-white focus:outline-none text-xs"
                        />
                      </td>

                      {/* Telefone */}
                      <td className="py-1 px-2 border-r border-soft">
                        <input
                          type="text"
                          disabled={readOnly}
                          value={item.telefone || ""}
                          onChange={(e) => handleCellChange(item.id, "telefone", e.target.value)}
                          placeholder="(11) 99999-9999"
                          maxLength={15}
                          className="w-full bg-transparent px-2 py-1 rounded border border-transparent hover:border-soft focus:border-sun-dark focus:bg-white focus:outline-none text-xs"
                        />
                      </td>

                      {/* Titular Vinculado ou Parentesco */}
                      <td className="py-1 px-2 border-r border-soft">
                        {isDependente ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              disabled={readOnly}
                              value={item.titularVinculado || ""}
                              onChange={(e) =>
                                handleCellChange(item.id, "titularVinculado", e.target.value)
                              }
                              placeholder="Titular..."
                              className="w-2/3 bg-transparent px-2 py-1 rounded border border-transparent hover:border-soft focus:border-sun-dark focus:bg-white focus:outline-none text-[11px]"
                              title="Nome ou CPF do colaborador titular"
                            />
                            <select
                              disabled={readOnly}
                              value={item.parentesco || "Filho(a)"}
                              onChange={(e) =>
                                handleCellChange(item.id, "parentesco", e.target.value)
                              }
                              className="w-1/3 text-[10px] bg-purple-100/50 border border-purple-200 rounded px-1 py-1 focus:outline-none"
                            >
                              <option value="Filho(a)">Filho(a)</option>
                              <option value="Cônjuge">Cônjuge</option>
                              <option value="Pai/Mãe">Pai/Mãe</option>
                              <option value="Enteado(a)">Enteado(a)</option>
                              <option value="Outro">Outro</option>
                            </select>
                          </div>
                        ) : (
                          <span className="text-[11px] text-forest/30 italic px-2">Colaborador Titular</span>
                        )}
                      </td>

                      {/* Ações */}
                      {!readOnly && (
                        <td className="py-1 px-2 text-center">
                          <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => handleDuplicateRow(item)}
                              className="p-1 hover:bg-warm rounded text-forest/70 hover:text-forest"
                              title="Duplicar linha"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(item.id)}
                              className="p-1 hover:bg-rose-50 rounded text-forest/40 hover:text-rose-600 transition-colors"
                              title="Remover linha"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer status bar */}
        <div className="bg-warm/40 px-4 py-2 border-t border-soft flex items-center justify-between text-[11px] text-forest/70">
          <div className="flex items-center gap-3">
            <span>
              Exibindo <strong>{filteredList.length}</strong> de <strong>{totalGeral}</strong> registros
            </span>
            <span className="text-forest/30">|</span>
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Alterações sincronizadas com o banco
            </span>
          </div>

          {!readOnly && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAddRow("titular")}
                className="text-forest hover:text-sun-dark font-bold underline"
              >
                + Adicionar mais uma linha
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-forest/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl flex flex-col shadow-2xl border border-soft overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-soft bg-warm/40 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-sun-dark" />
                <h3 className="font-serif text-lg text-forest font-semibold">
                  Importar Colaboradores e Dependentes
                </h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-forest/50 hover:text-rose-600 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-blue-950">
                  <Upload className="w-4 h-4 text-blue-600" /> Como importar dados:
                </div>
                <p>
                  Você pode <strong>copiar as linhas de uma planilha Excel ou Google Sheets</strong> e colar
                  diretamente no campo abaixo, ou carregar um arquivo <strong>.CSV</strong>.
                </p>
                <div className="bg-white/80 p-2.5 rounded-xl border border-blue-200/80 font-mono text-[10px] space-y-1">
                  <span className="font-bold block text-blue-950">Ordem esperada das colunas:</span>
                  <span>Nome Completo | CPF | Nascimento | Nome da Mãe | Admissão | E-mail | Telefone</span>
                  <span className="block text-blue-800/70 italic text-[9px]">
                    * Se a primeira coluna for "Titular" ou "Dependente", o sistema identificará o tipo
                    automaticamente!
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-forest/70 block mb-1.5">
                  Cole as linhas da planilha aqui (Tabulado / Excel):
                </label>
                <textarea
                  rows={7}
                  placeholder={`João Silva\t123.456.789-00\t15/05/1988\tMaria Silva\t01/02/2022\tjoao@empresa.com\t(11) 99999-1111\nAna Souza\t987.654.321-99\t20/10/1992\tClara Souza\t10/05/2023\tana@empresa.com\t(11) 99999-2222`}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="w-full text-xs font-mono bg-warm/30 border border-soft p-3 rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-soft">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".csv,.txt"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-warm/80 hover:bg-soft text-forest text-xs font-semibold rounded-xl border border-soft transition-colors cursor-pointer"
                  >
                    📁 Carregar Arquivo .CSV
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 text-xs text-forest/70 hover:text-forest font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!importText.trim()}
                    onClick={() => processRawImportText(importText)}
                    className="px-5 py-2 bg-forest hover:bg-forest/90 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Processar e Adicionar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
