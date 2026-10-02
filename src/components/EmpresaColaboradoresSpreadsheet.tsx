import React, { useState, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
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
  KeyRound,
  Share2,
  MessageCircle,
  Link2,
  X,
} from "lucide-react";

export interface ColaboradorItem {
  id: string;
  tipo: "titular" | "dependente";
  nomeCompleto: string;
  cpf: string;
  cargo?: string;
  faixaSalarial?: string;
  dataNascimento: string;
  nomeMae: string;
  dataAdmissao: string;
  email: string;
  telefone: string;
  titularVinculado?: string; // Nome ou CPF do titular (se dependente)
  parentesco?: string; // Cônjuge, Filho(a), etc
  observacoes?: string;
  status?: string;
  desligado?: boolean;
  dataDesligamento?: string;
  motivoDesligamento?: string;
}

export type ColaboradorEmpresa = ColaboradorItem;

interface EmpresaColaboradoresSpreadsheetProps {
  empresaId: string;
  empresaNome?: string;
  codigoAcesso?: string;
  quantidadeVidasContratadas?: string | number;
  colaboradores: ColaboradorItem[];
  onChangeColaboradores: (colaboradores: ColaboradorItem[]) => void;
  onUpdateCodigoAcesso?: (newCode: string) => void;
  readOnly?: boolean;
  onShowToast?: (msg: string, type?: "success" | "error" | "info") => void;
}

export const EmpresaColaboradoresSpreadsheet: React.FC<EmpresaColaboradoresSpreadsheetProps> = ({
  empresaId,
  empresaNome = "Empresa",
  codigoAcesso = "",
  quantidadeVidasContratadas,
  colaboradores = [],
  onChangeColaboradores,
  onUpdateCodigoAcesso,
  readOnly = false,
  onShowToast,
}) => {
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState<"todos" | "titular" | "dependente">("todos");
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [copiedCodeSpreadsheet, setCopiedCodeSpreadsheet] = useState(false);
  const [copiedLinkSpreadsheet, setCopiedLinkSpreadsheet] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Modal de Upload e Reconciliação de Turnover via Excel (.xlsx / .csv)
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<{
    novos: ColaboradorItem[];
    mantidos: ColaboradorItem[];
    desligados: ColaboradorItem[];
  } | null>(null);
  const [parsedRows, setParsedRows] = useState<ColaboradorItem[]>([]);
  const [desligarAusentes, setDesligarAusentes] = useState(false);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);

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
        (item.cargo || "").toLowerCase().includes(term) ||
        (item.faixaSalarial || "").toLowerCase().includes(term) ||
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
      cargo: "",
      faixaSalarial: "",
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

  // DOWNLOAD DA PLANILHA (.XLSX OU .CSV) COMPATÍVEL COM EXCEL
  const handleDownloadPlanilha = (formato: "xlsx" | "csv" = "xlsx") => {
    try {
      if (colaboradores.length === 0) {
        if (onShowToast) onShowToast("Nenhum dado cadastrado para exportar.", "info");
        else alert("Nenhum dado cadastrado para exportar.");
        return;
      }
      const dataToExport = colaboradores.map((c) => ({
        Tipo: c.tipo === "dependente" ? "Dependente" : "Titular",
        "Nome Completo": c.nomeCompleto || "",
        CPF: c.cpf || "",
        Cargo: c.cargo || "",
        "Faixa Salarial": c.faixaSalarial || "",
        "Data de Nascimento": c.dataNascimento || "",
        "Nome da Mãe": c.nomeMae || "",
        "Data de Admissão": c.dataAdmissao || "",
        Email: c.email || "",
        Telefone: c.telefone || "",
        "Titular Vinculado": c.titularVinculado || "",
        Parentesco: c.parentesco || "",
        Status: c.status === "desligado" || c.desligado ? "Desligado" : "Ativo",
        "Data Desligamento": c.dataDesligamento || "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Colaboradores e Dependentes");

      const cleanName = (empresaNome || "Empresa").replace(/[^a-zA-Z0-9]/g, "_");
      const nomeArquivo = `Quadro_Colaboradores_${cleanName}_${new Date().toISOString().split("T")[0]}.${formato}`;
      XLSX.writeFile(workbook, nomeArquivo, { bookType: formato });
      if (onShowToast) onShowToast(`Planilha ${formato.toUpperCase()} exportada com sucesso!`, "success");
    } catch (err) {
      console.error("Erro ao gerar planilha:", err);
      if (onShowToast) onShowToast("Erro ao exportar planilha.", "error");
    }
  };

  // DOWNLOAD DE MODELO EM BRANCO (.XLSX)
  const handleDownloadModeloPlanilha = () => {
    try {
      const modelo = [
        {
          Tipo: "Titular",
          "Nome Completo": "Exemplo da Silva",
          CPF: "000.000.000-00",
          Cargo: "Analista de Operações",
          "Faixa Salarial": "R$ 3.001 a R$ 5.000",
          "Data de Nascimento": "1990-05-15",
          "Nome da Mãe": "Maria da Silva",
          "Data de Admissão": "2023-01-10",
          Email: "exemplo@empresa.com",
          Telefone: "(11) 99999-9999",
          "Titular Vinculado": "",
          Parentesco: "",
          Status: "Ativo",
        },
        {
          Tipo: "Dependente",
          "Nome Completo": "Filho do Exemplo da Silva",
          CPF: "111.111.111-11",
          Cargo: "",
          "Faixa Salarial": "",
          "Data de Nascimento": "2015-08-20",
          "Nome da Mãe": "Esposa do Exemplo",
          "Data de Admissão": "",
          Email: "contato@familia.com",
          Telefone: "(11) 99999-9999",
          "Titular Vinculado": "Exemplo da Silva",
          Parentesco: "Filho(a)",
          Status: "Ativo",
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(modelo);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Modelo de Importação");
      XLSX.writeFile(workbook, "Modelo_Importacao_Colaboradores_AcolheMente.xlsx");
      if (onShowToast) onShowToast("Modelo baixado! Preencha e faça o upload.", "info");
    } catch (err) {
      console.error("Erro ao baixar modelo:", err);
      if (onShowToast) onShowToast("Erro ao gerar modelo de planilha.", "error");
    }
  };

  // UPLOAD E LEITURA DA PLANILHA COM XLSX (COMPATÍVEL COM EXCEL .XLSX, .XLS, .CSV)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rawJson || rawJson.length === 0) {
          if (onShowToast) onShowToast("A planilha enviada está vazia ou sem linhas de dados.", "error");
          else alert("A planilha enviada está vazia ou sem linhas de dados.");
          return;
        }

        // Normalização dos campos com suporte a múltiplos sinônimos
        const parsed: ColaboradorItem[] = rawJson
          .map((row: any, idx: number) => {
            const nome = row["Nome Completo"] || row["Nome"] || row["nome"] || row["NOME"] || "";
            const rawCpf = String(row["CPF"] || row["cpf"] || row["Cpf"] || "").replace(/\D/g, "");
            const formatCpf =
              rawCpf.length === 11
                ? rawCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
                : rawCpf;
            const tipoRaw = String(row["Tipo"] || row["tipo"] || "Titular").toLowerCase();
            const tipo: "titular" | "dependente" = tipoRaw.includes("dep") ? "dependente" : "titular";
            const cargo =
              tipo === "titular"
                ? String(row["Cargo"] || row["cargo"] || row["CARGO"] || row["Função"] || row["Funcao"] || "")
                : "";
            const faixaSalarial =
              tipo === "titular"
                ? String(
                    row["Faixa Salarial"] ||
                      row["faixaSalarial"] ||
                      row["Faixa"] ||
                      row["Salário"] ||
                      row["Salario"] ||
                      row["Remuneração"] ||
                      ""
                  )
                : "";

            return {
              id: `colab_up_${Date.now()}_${idx}`,
              tipo,
              nomeCompleto: String(nome).trim(),
              cpf: formatCpf || `S/CPF_${idx + 1}`,
              cargo,
              faixaSalarial,
              dataNascimento: String(row["Data de Nascimento"] || row["Nascimento"] || row["dataNascimento"] || ""),
              nomeMae: String(row["Nome da Mãe"] || row["Nome Mae"] || row["nomeMae"] || ""),
              dataAdmissao: String(row["Data de Admissão"] || row["Admissão"] || row["dataAdmissao"] || ""),
              email: String(row["Email"] || row["E-mail"] || row["email"] || ""),
              telefone: String(row["Telefone"] || row["Celular"] || row["telefone"] || ""),
              titularVinculado: String(row["Titular Vinculado"] || row["Titular"] || ""),
              parentesco: String(row["Parentesco"] || row["Grau"] || (tipo === "dependente" ? "Dependente" : "")),
              status: "ativo",
            };
          })
          .filter((item) => item.nomeCompleto.length > 0);

        setParsedRows(parsed);

        // Reconciliação de Turnover: Compara com a base atual
        const atuaisMap = new Map<string, ColaboradorItem>();
        colaboradores.forEach((c) => {
          const key = c.cpf ? c.cpf.replace(/\D/g, "") : c.nomeCompleto.toLowerCase().trim();
          atuaisMap.set(key, c);
        });

        const novos: ColaboradorItem[] = [];
        const mantidos: ColaboradorItem[] = [];
        const importedKeys = new Set<string>();

        parsed.forEach((p) => {
          const key = p.cpf ? p.cpf.replace(/\D/g, "") : p.nomeCompleto.toLowerCase().trim();
          importedKeys.add(key);
          if (atuaisMap.has(key)) {
            const existing = atuaisMap.get(key)!;
            mantidos.push({ ...existing, ...p, id: existing.id, status: "ativo", desligado: false });
          } else {
            novos.push(p);
          }
        });

        // Identifica quem estava na base e não veio na planilha (Turnover / Desligados)
        const desligados: ColaboradorItem[] = [];
        colaboradores.forEach((c) => {
          if (c.status === "desligado" || c.desligado) return; // já estava desligado
          const key = c.cpf ? c.cpf.replace(/\D/g, "") : c.nomeCompleto.toLowerCase().trim();
          if (!importedKeys.has(key)) {
            desligados.push(c);
          }
        });

        setReconcileResult({ novos, mantidos, desligados });
        setShowUploadModal(true);
      } catch (err) {
        console.error("Erro ao ler planilha:", err);
        if (onShowToast) onShowToast("Formato de planilha inválido. Use .xlsx ou .csv padrão.", "error");
        else alert("Formato de planilha inválido. Use .xlsx ou .csv padrão.");
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // CONFIRMAR RECONCILIAÇÃO E SALVAR
  const handleConfirmarReconciliacao = () => {
    if (!reconcileResult) return;
    setIsProcessingUpload(true);
    try {
      let finalLista: ColaboradorItem[] = [...reconcileResult.mantidos, ...reconcileResult.novos];

      if (desligarAusentes) {
        const desligadosAtualizados = reconcileResult.desligados.map((d) => ({
          ...d,
          status: "desligado",
          desligado: true,
          dataDesligamento: new Date().toISOString().split("T")[0],
          motivoDesligamento: "Turnover reconciliado via planilha Excel do RH",
        }));
        finalLista = [...finalLista, ...desligadosAtualizados];
      } else {
        finalLista = [...finalLista, ...reconcileResult.desligados];
      }

      onChangeColaboradores(finalLista);
      setShowUploadModal(false);
      setReconcileResult(null);
      if (onShowToast) onShowToast("Quadro de colaboradores atualizado com sucesso via planilha Excel!", "success");
    } catch (err) {
      console.error("Erro ao atualizar base via planilha:", err);
      if (onShowToast) onShowToast("Erro ao processar planilha.", "error");
    } finally {
      setIsProcessingUpload(false);
    }
  };

  // Export CSV fallback
  const handleExportCSV = () => {
    handleDownloadPlanilha("csv");
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

  const handleCopyCodeSpreadsheet = () => {
    if (!codigoAcesso) return;
    navigator.clipboard.writeText(codigoAcesso);
    setCopiedCodeSpreadsheet(true);
    if (onShowToast) onShowToast(`Código do colaborador "${codigoAcesso}" copiado!`, "success");
    setTimeout(() => setCopiedCodeSpreadsheet(false), 2000);
  };

  const handleCopyLinkSpreadsheet = () => {
    const code = codigoAcesso.trim().toUpperCase();
    const link = code
      ? `${window.location.origin}/?view=acolhimento&via=corporativo&convenio=${encodeURIComponent(code)}`
      : `${window.location.origin}/?view=acolhimento&via=corporativo`;
    navigator.clipboard.writeText(link);
    setCopiedLinkSpreadsheet(true);
    if (onShowToast) onShowToast("Link direto de acolhimento do colaborador copiado!", "success");
    setTimeout(() => setCopiedLinkSpreadsheet(false), 2000);
  };

  const handleShareSpreadsheet = () => {
    const code = codigoAcesso.trim().toUpperCase();
    const link = code
      ? `${window.location.origin}/?view=acolhimento&via=corporativo&convenio=${encodeURIComponent(code)}`
      : `${window.location.origin}/?view=acolhimento&via=corporativo`;
    const msg = `Olá, time! 🎉\n\nÉ com muita alegria que informamos que a ${empresaNome} firmou parceria oficial com o Projeto AcolheMente para oferecer apoio psicológico e cuidado à saúde mental de todos os nossos colaboradores!\n\n🔑 Seu Código de Acesso Corporativo: *${code || "SEU-CODIGO"}*\n\n🔗 Link direto de Acolhimento Corporativo:\n${link}\n\nComo iniciar seu acolhimento de forma 100% sigilosa e online:\n1. Acesse o link corporativo acima (já com o código do convênio pré-preenchido)\n2. Escolha o profissional e serviço desejado\n3. Inicie seu atendimento com sigilo ético absoluto!\n\nCuidar da sua mente é uma prioridade para nós! 💚`;
    navigator.clipboard.writeText(msg);
    if (onShowToast) onShowToast("Mensagem de divulgação pronta copiada com sucesso!", "success");
  };

  const handleWhatsAppSpreadsheet = () => {
    const code = codigoAcesso.trim().toUpperCase();
    const link = code
      ? `${window.location.origin}/?view=acolhimento&via=corporativo&convenio=${encodeURIComponent(code)}`
      : `${window.location.origin}/?view=acolhimento&via=corporativo`;
    const msg = `Olá, time! 🎉\n\nÉ com muita alegria que informamos que a ${empresaNome} firmou parceria oficial com o Projeto AcolheMente para oferecer apoio psicológico e cuidado à saúde mental de todos os nossos colaboradores!\n\n🔑 Seu Código de Acesso Corporativo: *${code || "SEU-CODIGO"}*\n\n🔗 Link direto de Acolhimento Corporativo:\n${link}\n\nComo iniciar seu acolhimento de forma 100% sigilosa e online:\n1. Acesse o link corporativo acima (já com o código do convênio pré-preenchido)\n2. Escolha o profissional e serviço desejado\n3. Inicie seu atendimento com sigilo ético absoluto!\n\nCuidar da sua mente é uma prioridade para nós! 💚`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Banner de Código do Colaborador para o RH e Gestão */}
      <div className="bg-emerald-900 text-white p-3.5 sm:p-4 rounded-2xl border border-emerald-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
            <KeyRound className="w-5 h-5 text-sun" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Código de Acesso do Colaborador:</span>
              <span className="font-mono text-sm font-black text-sun bg-white/10 px-2 py-0.5 rounded border border-white/20 tracking-wider">
                {codigoAcesso || "NÃO CADASTRADO"}
              </span>
            </div>
            <p className="text-[11px] text-emerald-200/90 mt-0.5">
              Este código é repassado aos colaboradores desta empresa para desbloquear o acolhimento corporativo com condições especiais.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end flex-wrap">
          {codigoAcesso ? (
            <>
              <button
                type="button"
                onClick={handleCopyCodeSpreadsheet}
                className="px-2.5 py-1.5 bg-white text-forest hover:bg-warm rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Copiar Código de Acesso"
              >
                {copiedCodeSpreadsheet ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCodeSpreadsheet ? "Copiado!" : "Copiar Código"}</span>
              </button>
              <button
                type="button"
                onClick={handleCopyLinkSpreadsheet}
                className="px-2.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-700 shadow-2xs"
                title="Copiar Link de Acolhimento com Convênio Preenchido"
              >
                {copiedLinkSpreadsheet ? <Check className="w-3.5 h-3.5 text-sun" /> : <Link2 className="w-3.5 h-3.5" />}
                <span>{copiedLinkSpreadsheet ? "Link Copiado!" : "Copiar Link"}</span>
              </button>
              <button
                type="button"
                onClick={handleShareSpreadsheet}
                className="px-2.5 py-1.5 bg-sun hover:bg-sun-dark text-forest rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Copiar Mensagem Pronta de Divulgação"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Divulgação</span>
              </button>
              <button
                type="button"
                onClick={handleWhatsAppSpreadsheet}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Compartilhar via WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span className="hidden md:inline">WhatsApp</span>
              </button>
            </>
          ) : (
            onUpdateCodigoAcesso && !readOnly && (
              <button
                type="button"
                onClick={() => {
                  const prefix = empresaNome
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .replace(/[^a-zA-Z]/g, "")
                    .slice(0, 4)
                    .toUpperCase() || "CORP";
                  const newCode = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
                  onUpdateCodigoAcesso(newCode);
                }}
                className="px-3 py-1.5 bg-sun hover:bg-sun-dark text-forest rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Gerar Código do Colaborador</span>
              </button>
            )
          )}
        </div>
      </div>

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

        {/* Right action buttons: MESMO DESIGN E MECANISMO DESENVOLVIDO NOS PORTAIS DE RH */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Input oculto para arquivo Excel / CSV */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />

          {!readOnly && (
            <>
              {/* Upload Planilha Excel (Design RH) */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1.5 bg-warm text-forest hover:bg-forest hover:text-white border border-soft rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="Importar planilha XLSX ou CSV para atualizar a base de vidas e turnover"
              >
                <Upload className="w-3.5 h-3.5 text-sun" />
                <span>Subir Planilha (Upload)</span>
              </button>

              {/* Download Planilha Atual (.xlsx) */}
              <button
                type="button"
                onClick={() => handleDownloadPlanilha("xlsx")}
                className="px-2.5 py-1.5 bg-warm text-forest hover:bg-forest hover:text-white border border-soft rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="Baixar lista completa de colaboradores em Excel (.xlsx)"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Baixar Base (.xlsx)</span>
              </button>

              {/* Baixar Modelo (.xlsx) */}
              <button
                type="button"
                onClick={handleDownloadModeloPlanilha}
                className="px-2 py-1.5 text-forest/70 hover:text-forest text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                title="Baixar modelo em branco de planilha compatível com Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Modelo (.xlsx)</span>
              </button>

              <div className="h-5 w-px bg-soft hidden sm:block mx-0.5" />

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
            </>
          )}

          {readOnly && (
            <button
              type="button"
              onClick={() => handleDownloadPlanilha("xlsx")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-warm/60 text-forest rounded-xl text-xs font-semibold border border-soft transition-colors cursor-pointer"
              title="Baixar lista completa de colaboradores em Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Baixar Base (.xlsx)</span>
            </button>
          )}
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
                <th className="py-2.5 px-3 w-60 border-r border-forest/40">Nome Completo *</th>
                <th className="py-2.5 px-3 w-36 border-r border-forest/40">CPF</th>
                <th className="py-2.5 px-3 w-40 border-r border-forest/40">Cargo (Titular)</th>
                <th className="py-2.5 px-3 w-36 border-r border-forest/40">Faixa Salarial</th>
                <th className="py-2.5 px-3 w-32 border-r border-forest/40">Nascimento</th>
                <th className="py-2.5 px-3 w-52 border-r border-forest/40">Nome da Mãe</th>
                <th className="py-2.5 px-3 w-32 border-r border-forest/40">Admissão</th>
                <th className="py-2.5 px-3 w-52 border-r border-forest/40">E-mail</th>
                <th className="py-2.5 px-3 w-36 border-r border-forest/40">Telefone</th>
                <th className="py-2.5 px-3 w-44 border-r border-forest/40">Titular / Parentesco</th>
                {!readOnly && <th className="py-2.5 px-3 w-20 text-center">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-soft text-xs text-forest">
              {filteredList.length === 0 ? (
                <tr>
                  <td
                    colSpan={readOnly ? 12 : 13}
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

                      {/* Cargo (Titular) */}
                      <td className="py-1 px-2 border-r border-soft">
                        <input
                          type="text"
                          disabled={readOnly || isDependente}
                          value={isDependente ? "-" : item.cargo || ""}
                          onChange={(e) => handleCellChange(item.id, "cargo", e.target.value)}
                          placeholder={isDependente ? "N/A" : "Ex: Analista, Gerente..."}
                          className={`w-full bg-transparent px-2 py-1 rounded border border-transparent hover:border-soft focus:border-sun-dark focus:bg-white focus:outline-none text-xs ${
                            isDependente ? "text-forest/30 italic" : "text-forest font-medium"
                          }`}
                        />
                      </td>

                      {/* Faixa Salarial (Titular) */}
                      <td className="py-1 px-2 border-r border-soft">
                        <input
                          type="text"
                          disabled={readOnly || isDependente}
                          value={isDependente ? "-" : item.faixaSalarial || ""}
                          onChange={(e) => handleCellChange(item.id, "faixaSalarial", e.target.value)}
                          placeholder={isDependente ? "N/A" : "Ex: R$ 3k - 5k"}
                          className={`w-full bg-transparent px-2 py-1 rounded border border-transparent hover:border-soft focus:border-sun-dark focus:bg-white focus:outline-none text-xs ${
                            isDependente ? "text-forest/30 italic" : "text-forest"
                          }`}
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

      {/* ========================================================================= */}
      {/* MODAL: RECONCILIAÇÃO DE TURNOVER VIA UPLOAD DE PLANILHA (DESIGN DOS PORTAIS DE RH) */}
      {/* ========================================================================= */}
      {showUploadModal && reconcileResult && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-soft shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-soft">
              <div>
                <h3 className="font-serif text-base font-bold text-forest flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Reconciliação Automática de Folha & Turnover</span>
                </h3>
                <p className="text-[11px] text-forest/70 mt-0.5">
                  Planilha Excel lida com {parsedRows.length} linhas. Compare o impacto antes de confirmar a atualização:
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1 hover:bg-warm rounded-lg text-forest/50 hover:text-forest"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Resumo dos 3 Grupos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">🟢 Novas Vidas</span>
                <span className="text-xl font-bold text-emerald-900 block mt-1">{reconcileResult.novos.length}</span>
                <span className="text-[10px] text-emerald-700">Entrarão na base</span>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block">⚪ Mantidos</span>
                <span className="text-xl font-bold text-blue-900 block mt-1">{reconcileResult.mantidos.length}</span>
                <span className="text-[10px] text-blue-700">Dados preservados</span>
              </div>

              <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-800 block">🔴 Não Constam (Turnover)</span>
                <span className="text-xl font-bold text-red-900 block mt-1">{reconcileResult.desligados.length}</span>
                <span className="text-[10px] text-red-700">Ausentes na planilha</span>
              </div>
            </div>

            {/* Opção de Desligar Automaticamente os Ausentes */}
            {reconcileResult.desligados.length > 0 && (
              <div className="p-3.5 bg-warm rounded-xl border border-soft flex items-start gap-3">
                <input
                  type="checkbox"
                  id="chkDesligarSpreadsheet"
                  checked={desligarAusentes}
                  onChange={(e) => setDesligarAusentes(e.target.checked)}
                  className="mt-0.5 rounded cursor-pointer text-forest"
                />
                <label htmlFor="chkDesligarSpreadsheet" className="text-xs text-forest cursor-pointer">
                  <strong>Marcar como Desligados (Turnover)</strong> os {reconcileResult.desligados.length} colaboradores que estavam na base e não constam na nova planilha enviada.
                </label>
              </div>
            )}

            {/* Prévia dos Novos a Incluir */}
            {reconcileResult.novos.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-forest block">Prévia de novos colaboradores:</span>
                <div className="max-h-32 overflow-y-auto bg-warm/40 p-2.5 rounded-xl border border-soft text-xs space-y-1">
                  {reconcileResult.novos.slice(0, 10).map((n, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px] text-forest">
                      <span>• {n.nomeCompleto} ({n.tipo})</span>
                      <span className="font-mono text-forest/60">{n.cpf}</span>
                    </div>
                  ))}
                  {reconcileResult.novos.length > 10 && (
                    <div className="text-[10px] text-forest/50 text-center pt-1">
                      + outros {reconcileResult.novos.length - 10} cadastros...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Botões de Confirmação */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-soft">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-3 py-2 rounded-xl text-forest/70 hover:bg-warm font-semibold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isProcessingUpload}
                onClick={handleConfirmarReconciliacao}
                className="px-4 py-2 bg-emerald-700 text-white hover:bg-emerald-800 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isProcessingUpload ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Confirmar & Atualizar Base</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
