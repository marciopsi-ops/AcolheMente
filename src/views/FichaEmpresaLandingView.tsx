import React, { useState, useEffect, useRef } from "react";
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import * as XLSX from "xlsx";
import { db } from "../lib/firebase";
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Users,
  FileText,
  Mail,
  Phone,
  ShieldCheck,
  Save,
  Copy,
  ExternalLink,
  AlertCircle,
  Briefcase,
  UserCheck,
  Sparkles,
  ArrowLeft,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Calculator,
  Coins,
  Check,
  HelpCircle,
  Upload,
  Download,
  FileSpreadsheet,
  RefreshCw,
  X,
} from "lucide-react";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { EmpresaColaboradoresSpreadsheet, ColaboradorEmpresa } from "../components/EmpresaColaboradoresSpreadsheet";
import {
  CategoriaEmpresa,
  getEmpresaCategorias,
  hasEmpresaCategoria,
  getEmpresaPin,
  SEQUENCIA_NUMERICA_VIDAS_OPCOES,
  TODAS_OPCOES_VIDAS_NUMEROS,
} from "../types/corporativo";

// Utilitários de Formatação Monetária e Numérica
export function formatMoedaBR(valor: number | string | undefined | null): string {
  if (valor === undefined || valor === null || valor === "") return "";
  if (typeof valor === "number") {
    if (isNaN(valor)) return "";
    return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  const clean = String(valor).trim().replace(/^R\$\s*/i, "");
  return clean;
}

export function parseMoedaBR(valor: string | number | undefined | null): number {
  if (typeof valor === "number") return isNaN(valor) ? 0 : valor;
  if (!valor) return 0;
  const limpo = String(valor)
    .replace(/[^\d,\.]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const num = parseFloat(limpo);
  return isNaN(num) ? 0 : num;
}

interface FichaEmpresaLandingViewProps {
  empresaId: string;
  onBack: () => void;
  onGoHome?: () => void;
}

const PRODUTOS_SUGESTOES = [
  "Acolhimento Psicológico Online (Sessões Individuais)",
  "Plantão de Apoio Emocional & Escuta Ativa",
  "Palestras, Treinamentos & Workshops (NR-1)",
  "Diagnóstico de Clima Psicossocial",
  "Canal Confidencial de Ouvidoria e Suporte",
  "Rodas de Conversa & Dinâmicas de Grupo",
];

const FORMAS_PAGAMENTO_OPCOES = [
  "Boleto Bancário Mensal",
  "Faturamento via Nota Fiscal (30 dias)",
  "PIX Corporativo (PJ)",
  "Cartão de Crédito Corporativo",
  "Transferência Bancária (TED/DOC)",
  "Personalizado / Negociação em Contrato",
];

export function FichaEmpresaLandingView({
  empresaId,
  onBack,
  onGoHome,
}: FichaEmpresaLandingViewProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [createdEmpresaId, setCreatedEmpresaId] = useState<string | null>(null);
  const [createdPin, setCreatedPin] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"empresa" | "colaboradores">("empresa");
  const [colaboradoresList, setColaboradoresList] = useState<ColaboradorEmpresa[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Parâmetros de URL para onboarding / novo vínculo com Canal Parceiro
  const isNovaEmpresa = empresaId === "nova" || empresaId === "novo";
  const urlParams = new URLSearchParams(window.location.search);
  const parceiroIdParam = urlParams.get("parceiro_id") || urlParams.get("parceiro") || urlParams.get("canal_id");

  // Proteção LGPD por Senha Numérica (PIN de 4 dígitos)
  const [empresaDoc, setEmpresaDoc] = useState<any>(null);
  const [parceiroDoc, setParceiroDoc] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (empresaId === "nova" || empresaId === "novo") return true;
    return sessionStorage.getItem(`ficha_empresa_auth_${empresaId}`) === "true";
  });
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [showPin, setShowPin] = useState(false);

  // Controle da Caixa de Seleção Numérica de Vidas
  const [isCustomVidas, setIsCustomVidas] = useState(false);
  const [customVidasInput, setCustomVidasInput] = useState("");

  // Upload e Download compatível com Excel (.xlsx / .csv) & Reconciliação (Mesmo mecanismo dos portais de RH)
  const excelUploadInputRef = useRef<HTMLInputElement | null>(null);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<{
    novos: ColaboradorEmpresa[];
    mantidos: ColaboradorEmpresa[];
    desligados: ColaboradorEmpresa[];
  } | null>(null);
  const [parsedRows, setParsedRows] = useState<ColaboradorEmpresa[]>([]);
  const [desligarAusentes, setDesligarAusentes] = useState(false);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);

  const [formData, setFormData] = useState({
    razaoSocial: "",
    cnpj: "",
    cpfResponsavel: "",
    nomeResponsavel: "",
    email: "",
    telefone: "",
    quantidadeVidas: "", // Sequência numérica ou valor exato
    produtosContratados: "",
    valorPorVida: "",    // R$ por vida/colaborador
    valorMensal: "",     // R$ total mensal acordado
    valoresDefinidos: "",
    formaPagamento: "",
    observacoesGerais: "",
  });

  const [nomeEmpresaExibicao, setNomeEmpresaExibicao] = useState("");
  const [empresaCategorias, setEmpresaCategorias] = useState<CategoriaEmpresa[]>(["empresa_direta"]);
  const [empresaPaiNome, setEmpresaPaiNome] = useState<string | undefined>(undefined);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    const fetchEmpresa = async () => {
      try {
        setLoading(true);

        if (isNovaEmpresa) {
          setIsAuthenticated(true);
          if (parceiroIdParam) {
            try {
              const pSnap = await getDoc(doc(db, "empresa_leads", parceiroIdParam));
              if (pSnap.exists()) {
                const pd = pSnap.data();
                setParceiroDoc({ id: pSnap.id, ...pd });
                setEmpresaPaiNome(pd.nomeEmpresa || pd.razaoSocial || "Canal Parceiro");
              }
            } catch (pErr) {
              console.warn("Canal parceiro não carregado:", pErr);
            }
          }
          setNomeEmpresaExibicao("Primeira Implantação de Empresa");
          setEmpresaCategorias(["empresa_conectada"]);
          setLoading(false);
          return;
        }

        const docSnap = await getDoc(doc(db, "empresa_leads", empresaId));
        if (docSnap.exists()) {
          const d = docSnap.data();
          const loadedDoc = { id: docSnap.id, ...d };
          setEmpresaDoc(loadedDoc);
          setNomeEmpresaExibicao(d.nomeEmpresa || d.razaoSocial || "Empresa Parceira");
          setEmpresaCategorias(getEmpresaCategorias(d as any));
          setEmpresaPaiNome(d.empresaPaiNome);
          if (Array.isArray(d.colaboradoresList)) {
            setColaboradoresList(d.colaboradoresList);
          }

          // Higienização e mapeamento da sequência numérica de vidas
          const rawQtd = d.quantidadeVidas || d.colaboradores || "";
          let cleanedQtd = "";
          if (typeof rawQtd === "number") {
            cleanedQtd = String(rawQtd);
          } else if (rawQtd) {
            const digits = String(rawQtd).match(/\d+/);
            cleanedQtd = digits ? digits[0] : "";
          }

          const numQtd = parseInt(cleanedQtd, 10);
          if (cleanedQtd && !isNaN(numQtd) && !TODAS_OPCOES_VIDAS_NUMEROS.includes(numQtd)) {
            setIsCustomVidas(true);
            setCustomVidasInput(cleanedQtd);
          } else {
            setIsCustomVidas(false);
            setCustomVidasInput("");
          }

          // Extração e mapeamento de Valor por Vida (R$)
          const rawValorPorVida = d.valorPorVida !== undefined ? d.valorPorVida : d.faturamentoConfig?.valorPorVida;
          let strValorPorVida = "";
          if (typeof rawValorPorVida === "number" && rawValorPorVida > 0) {
            strValorPorVida = formatMoedaBR(rawValorPorVida);
          } else if (typeof rawValorPorVida === "string" && rawValorPorVida.trim() !== "") {
            strValorPorVida = formatMoedaBR(rawValorPorVida);
          }

          // Extração e mapeamento de Valor Mensal (R$)
          const rawValorMensal = d.valorMensal !== undefined
            ? d.valorMensal
            : d.valorFixoMensal !== undefined
            ? d.valorFixoMensal
            : (d.faturamentoConfig?.valorMensal || d.faturamentoConfig?.valorFixoMensal);
          let strValorMensal = "";
          if (typeof rawValorMensal === "number" && rawValorMensal > 0) {
            strValorMensal = formatMoedaBR(rawValorMensal);
          } else if (typeof rawValorMensal === "string" && rawValorMensal.trim() !== "") {
            strValorMensal = formatMoedaBR(rawValorMensal);
          }

          // Se os campos dedicados estiverem vazios, tenta extrair de valoresDefinidos
          const rawValoresDef = d.valoresDefinidos || d.valoresAcertados || "";
          if (!strValorPorVida && rawValoresDef) {
            const matchVida = rawValoresDef.match(/R\$\s*([\d\.\,]+)\s*(?:por\s*vida|\/vida)/i);
            if (matchVida && matchVida[1]) {
              strValorPorVida = matchVida[1];
            }
          }
          if (!strValorMensal && rawValoresDef) {
            const matchMensal = rawValoresDef.match(/R\$\s*([\d\.\,]+)\s*(?:mensal|\/m[êe]s)/i);
            if (matchMensal && matchMensal[1]) {
              strValorMensal = matchMensal[1];
            }
          }

          setFormData({
            razaoSocial: d.razaoSocial || d.nomeEmpresa || "",
            cnpj: d.cnpj || "",
            cpfResponsavel: d.cpfResponsavel || "",
            nomeResponsavel: d.nomeResponsavel || d.contatoNome || "",
            email: d.email || "",
            telefone: d.telefone || "",
            quantidadeVidas: cleanedQtd || "",
            produtosContratados: d.produtosContratados || d.servicosOferecidos || "",
            valorPorVida: strValorPorVida,
            valorMensal: strValorMensal,
            valoresDefinidos: rawValoresDef,
            formaPagamento: d.formaPagamento || "",
            observacoesGerais: d.observacoesGerais || d.registrosDeReunioes || "",
          });

          // Valida autenticação por sessão
          const sessionAuth = sessionStorage.getItem(`ficha_empresa_auth_${empresaId}`);
          if (sessionAuth === "true") {
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
        } else {
          setErrorMsg("Empresa não encontrada no sistema. Verifique o link ou entre em contato com o suporte.");
        }
      } catch (err) {
        console.error("Erro ao carregar ficha de implantação da empresa:", err);
        setErrorMsg("Não foi possível carregar os dados. Verifique sua conexão e tente novamente.");
      } finally {
        setLoading(false);
      }
    };

    if (empresaId) {
      fetchEmpresa();
    } else {
      setLoading(false);
      setErrorMsg("Identificador da empresa ausente na URL.");
    }
  }, [empresaId]);

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaDoc) return;
    const expectedPin = getEmpresaPin(empresaDoc);
    if (
      pinInput.trim() === expectedPin ||
      (empresaDoc.pinAcessoRH && pinInput.trim() === empresaDoc.pinAcessoRH.trim()) ||
      (empresaDoc.pinAcesso && pinInput.trim() === empresaDoc.pinAcesso.trim())
    ) {
      setIsAuthenticated(true);
      sessionStorage.setItem(`ficha_empresa_auth_${empresaId}`, "true");
      setPinError("");
      setToastMsg("Acesso autorizado à Ficha de Implantação!");
    } else {
      setPinError("Senha numérica (PIN de 4 dígitos) incorreta. Tente novamente.");
    }
  };

  const handleLockAccess = () => {
    sessionStorage.removeItem(`ficha_empresa_auth_${empresaId}`);
    setIsAuthenticated(false);
    setPinInput("");
    setPinError("");
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSavedSuccess(false);
  };

  const handleSelectVidas = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "custom") {
      setIsCustomVidas(true);
    } else {
      setIsCustomVidas(false);
      setCustomVidasInput("");
      setFormData((prev) => ({ ...prev, quantidadeVidas: val }));
    }
    setSavedSuccess(false);
  };

  const handleCustomVidasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomVidasInput(val);
    setFormData((prev) => ({ ...prev, quantidadeVidas: val }));
    setSavedSuccess(false);
  };

  const handleSetVidasPill = (num: number) => {
    setIsCustomVidas(false);
    setCustomVidasInput("");
    setFormData((prev) => ({ ...prev, quantidadeVidas: String(num) }));
    setSavedSuccess(false);
  };

  const handleValorPorVidaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData((prev) => ({ ...prev, valorPorVida: val }));
    setSavedSuccess(false);
  };

  const handleValorMensalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData((prev) => ({ ...prev, valorMensal: val }));
    setSavedSuccess(false);
  };

  const handleCalcularMensal = () => {
    const vidas = parseInt(formData.quantidadeVidas.replace(/\D/g, ""), 10) || 0;
    const porVida = parseMoedaBR(formData.valorPorVida);
    if (vidas > 0 && porVida > 0) {
      const total = vidas * porVida;
      setFormData((prev) => ({
        ...prev,
        valorMensal: formatMoedaBR(total),
      }));
      setToastMsg(`Valor mensal calculado: R$ ${formatMoedaBR(total)} (${vidas} vidas × R$ ${formatMoedaBR(porVida)})`);
      setTimeout(() => setToastMsg(null), 3500);
    }
  };

  const handleCalcularPorVida = () => {
    const vidas = parseInt(formData.quantidadeVidas.replace(/\D/g, ""), 10) || 0;
    const mensal = parseMoedaBR(formData.valorMensal);
    if (vidas > 0 && mensal > 0) {
      const porVida = mensal / vidas;
      setFormData((prev) => ({
        ...prev,
        valorPorVida: formatMoedaBR(porVida),
      }));
      setToastMsg(`Valor por vida calculado: R$ ${formatMoedaBR(porVida)} (R$ ${formatMoedaBR(mensal)} ÷ ${vidas} vidas)`);
      setTimeout(() => setToastMsg(null), 3500);
    }
  };

  const handleAddProduto = (produto: string) => {
    setFormData((prev) => {
      const atual = prev.produtosContratados || "";
      if (atual.includes(produto)) return prev;
      const novo = atual ? `${atual}\n• ${produto}` : `• ${produto}`;
      return { ...prev, produtosContratados: novo };
    });
    setSavedSuccess(false);
  };

  const handleUpdateColaboradores = async (newList: ColaboradorEmpresa[]) => {
    setColaboradoresList(newList);
    try {
      if (empresaId && empresaId !== "nova" && empresaId !== "novo") {
        await updateDoc(doc(db, "empresa_leads", empresaId), {
          colaboradoresList: newList,
          updatedAt: serverTimestamp(),
        });
      }
      setToastMsg("Lista de colaboradores sincronizada com sucesso!");
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err) {
      console.error("Erro ao salvar colaboradores:", err);
      alert("Falha ao salvar colaboradores no servidor. Verifique sua conexão.");
    }
  };

  // DOWNLOAD DA PLANILHA (.XLSX OU .CSV) COMPATÍVEL COM EXCEL
  const handleDownloadPlanilha = (formato: "xlsx" | "csv" = "xlsx") => {
    try {
      if (colaboradoresList.length === 0) {
        setToastMsg("Nenhum colaborador cadastrado para exportar na base.");
        setTimeout(() => setToastMsg(null), 3500);
        return;
      }
      const dataToExport = colaboradoresList.map((c) => ({
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

      const cleanName = (formData.razaoSocial || nomeEmpresaExibicao || "Empresa").replace(/[^a-zA-Z0-9]/g, "_");
      const nomeArquivo = `Quadro_Colaboradores_${cleanName}_${new Date().toISOString().split("T")[0]}.${formato}`;
      XLSX.writeFile(workbook, nomeArquivo, { bookType: formato });
      setToastMsg(`Planilha ${formato.toUpperCase()} exportada com sucesso!`);
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err) {
      console.error("Erro ao gerar planilha:", err);
      setToastMsg("Erro ao exportar planilha.");
      setTimeout(() => setToastMsg(null), 3500);
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
      setToastMsg("Modelo baixado! Preencha e faça o upload.");
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err) {
      console.error("Erro ao baixar modelo:", err);
      setToastMsg("Erro ao gerar modelo de planilha.");
      setTimeout(() => setToastMsg(null), 3500);
    }
  };

  // UPLOAD E LEITURA DE PLANILHA EXCEL (.XLSX, .XLS, .CSV)
  const handleFileChangeExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          setToastMsg("A planilha enviada está vazia ou sem linhas de dados.");
          setTimeout(() => setToastMsg(null), 4000);
          return;
        }

        // Normalização flexível de campos compatível com Excel do RH
        const parsed: ColaboradorEmpresa[] = rawJson
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

        // Reconciliação com a base atual para controle de turnover
        const atuaisMap = new Map<string, ColaboradorEmpresa>();
        colaboradoresList.forEach((c) => {
          const key = c.cpf ? c.cpf.replace(/\D/g, "") : c.nomeCompleto.toLowerCase().trim();
          atuaisMap.set(key, c);
        });

        const novos: ColaboradorEmpresa[] = [];
        const mantidos: ColaboradorEmpresa[] = [];
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

        const desligados: ColaboradorEmpresa[] = [];
        colaboradoresList.forEach((c) => {
          if (c.status === "desligado" || c.desligado) return;
          const key = c.cpf ? c.cpf.replace(/\D/g, "") : c.nomeCompleto.toLowerCase().trim();
          if (!importedKeys.has(key)) {
            desligados.push(c);
          }
        });

        setReconcileResult({ novos, mantidos, desligados });
        setShowExcelModal(true);
      } catch (err) {
        console.error("Erro ao ler planilha:", err);
        setToastMsg("Formato de planilha inválido. Use .xlsx ou .csv padrão.");
        setTimeout(() => setToastMsg(null), 4000);
      }
    };
    reader.readAsBinaryString(file);
    if (excelUploadInputRef.current) excelUploadInputRef.current.value = "";
  };

  // CONFIRMAÇÃO DA RECONCILIAÇÃO VIA MODAL EXCEL
  const handleConfirmarReconciliacaoExcel = async () => {
    if (!reconcileResult) return;
    setIsProcessingUpload(true);
    try {
      let finalLista: ColaboradorEmpresa[] = [...reconcileResult.mantidos, ...reconcileResult.novos];

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

      setColaboradoresList(finalLista);

      const activeLives = finalLista.filter((c) => c.status !== "desligado" && !c.desligado).length;

      // Auto-calibra a quantidade de vidas na ficha de implantação
      if (activeLives > 0) {
        setFormData((prev) => ({
          ...prev,
          quantidadeVidas: String(activeLives),
        }));
        setIsCustomVidas(!TODAS_OPCOES_VIDAS_NUMEROS.includes(activeLives));
        if (!TODAS_OPCOES_VIDAS_NUMEROS.includes(activeLives)) {
          setCustomVidasInput(String(activeLives));
        }
      }

      if (empresaId && empresaId !== "nova" && empresaId !== "novo") {
        await updateDoc(doc(db, "empresa_leads", empresaId), {
          colaboradoresList: finalLista,
          colaboradores: String(activeLives),
          quantidadeVidas: String(activeLives),
          updatedAt: serverTimestamp(),
        });
      }

      setShowExcelModal(false);
      setReconcileResult(null);
      setToastMsg(`Base sincronizada com sucesso! Quantidade de vidas calibrada para ${activeLives} vidas.`);
      setTimeout(() => setToastMsg(null), 4500);
    } catch (err) {
      console.error("Erro ao atualizar base via planilha:", err);
      setToastMsg("Erro ao processar planilha.");
      setTimeout(() => setToastMsg(null), 3500);
    } finally {
      setIsProcessingUpload(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.razaoSocial.trim()) {
      alert("Por favor, preencha a Razão Social da empresa.");
      return;
    }
    if (!formData.cnpj.trim()) {
      alert("Por favor, preencha o CNPJ da empresa.");
      return;
    }

    try {
      setSaving(true);
      const parsedVidas = parseInt(formData.quantidadeVidas.replace(/\D/g, ""), 10) || 0;
      const numValorPorVida = parseMoedaBR(formData.valorPorVida);
      const numValorMensal = parseMoedaBR(formData.valorMensal);

      // Constrói resumo textual de valores para compatibilidade
      let resumoValores = formData.valoresDefinidos.trim();
      if (!resumoValores) {
        if (numValorPorVida > 0 && numValorMensal > 0) {
          resumoValores = `R$ ${formatMoedaBR(numValorPorVida)} por vida | R$ ${formatMoedaBR(numValorMensal)} mensal`;
        } else if (numValorPorVida > 0) {
          resumoValores = `R$ ${formatMoedaBR(numValorPorVida)} por vida/mês`;
        } else if (numValorMensal > 0) {
          resumoValores = `R$ ${formatMoedaBR(numValorMensal)} fixo mensal`;
        }
      }

      const faturamentoConfigAtualizado = {
        ...(empresaDoc?.faturamentoConfig || {}),
        valorPorVida: numValorPorVida > 0 ? numValorPorVida : (empresaDoc?.faturamentoConfig?.valorPorVida || 18),
        valorMensal: numValorMensal > 0 ? numValorMensal : undefined,
        valorFixoMensal: numValorMensal > 0 ? numValorMensal : undefined,
        modeloCobranca: numValorMensal > 0 && numValorPorVida === 0 ? "fixo_mensal" : (empresaDoc?.faturamentoConfig?.modeloCobranca || "por_vida"),
      };

      if (isNovaEmpresa) {
        const generatedPin = Math.floor(1000 + Math.random() * 9000).toString();
        const docRef = await addDoc(collection(db, "empresa_leads"), {
          razaoSocial: formData.razaoSocial.trim(),
          cnpj: formData.cnpj.trim(),
          cpfResponsavel: formData.cpfResponsavel.trim(),
          nomeResponsavel: formData.nomeResponsavel.trim(),
          email: formData.email.trim(),
          telefone: formData.telefone.trim(),
          quantidadeVidas: String(parsedVidas || formData.quantidadeVidas.trim()),
          produtosContratados: formData.produtosContratados.trim(),
          valorPorVida: numValorPorVida,
          valorPorVidaTexto: formData.valorPorVida.trim(),
          valorMensal: numValorMensal,
          valorMensalTexto: formData.valorMensal.trim(),
          valorFixoMensal: numValorMensal,
          valoresDefinidos: resumoValores,
          valoresAcertados: resumoValores,
          formaPagamento: formData.formaPagamento.trim(),
          observacoesGerais: formData.observacoesGerais.trim(),
          nomeEmpresa: formData.razaoSocial.trim(),
          contatoNome: formData.nomeResponsavel.trim(),
          colaboradores: String(parsedVidas || formData.quantidadeVidas.trim()),
          servicosOferecidos: formData.produtosContratados.trim(),
          colaboradoresList: colaboradoresList,
          categorias: ["empresa_conectada"],
          tipoParceria: "empresa_conectada",
          canalParceiroId: parceiroIdParam || null,
          empresaMaeId: parceiroIdParam || null,
          empresaPaiId: parceiroIdParam || null,
          empresaPaiNome: parceiroDoc?.nomeEmpresa || parceiroDoc?.razaoSocial || empresaPaiNome || "Canal Parceiro",
          pinAcessoRH: generatedPin,
          faturamentoConfig: faturamentoConfigAtualizado,
          fichaPreenchidaPelaEmpresa: true,
          fichaPreenchidaEm: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setCreatedEmpresaId(docRef.id);
        setCreatedPin(generatedPin);
        setSavedSuccess(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        await updateDoc(doc(db, "empresa_leads", empresaId), {
          razaoSocial: formData.razaoSocial.trim(),
          cnpj: formData.cnpj.trim(),
          cpfResponsavel: formData.cpfResponsavel.trim(),
          nomeResponsavel: formData.nomeResponsavel.trim(),
          email: formData.email.trim(),
          telefone: formData.telefone.trim(),
          quantidadeVidas: String(parsedVidas || formData.quantidadeVidas.trim()),
          produtosContratados: formData.produtosContratados.trim(),
          valorPorVida: numValorPorVida,
          valorPorVidaTexto: formData.valorPorVida.trim(),
          valorMensal: numValorMensal,
          valorMensalTexto: formData.valorMensal.trim(),
          valorFixoMensal: numValorMensal,
          valoresDefinidos: resumoValores,
          valoresAcertados: resumoValores,
          formaPagamento: formData.formaPagamento.trim(),
          observacoesGerais: formData.observacoesGerais.trim(),
          // Mantém sincronizado com as chaves históricas para compatibilidade
          nomeEmpresa: formData.razaoSocial.trim(),
          contatoNome: formData.nomeResponsavel.trim(),
          colaboradores: String(parsedVidas || formData.quantidadeVidas.trim()),
          servicosOferecidos: formData.produtosContratados.trim(),
          colaboradoresList: colaboradoresList,
          faturamentoConfig: faturamentoConfigAtualizado,
          fichaPreenchidaPelaEmpresa: true,
          fichaPreenchidaEm: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setSavedSuccess(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      console.error("Erro ao salvar dados da Ficha de Implantação:", err);
      alert("Houve uma falha ao salvar as informações. Por favor, tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    const pin = empresaDoc ? getEmpresaPin(empresaDoc) : "";
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setToastMsg(pin ? `Link copiado! (PIN de Segurança: ${pin})` : "Link copiado!");
    setTimeout(() => setCopiedLink(false), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-warm p-6">
        <div className="w-12 h-12 border-4 border-sun-dark border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-forest font-semibold animate-pulse text-sm">
          Carregando Ficha de Implantação da Empresa...
        </p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-warm flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-soft max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="font-serif text-2xl text-forest mb-2">Ficha Indisponível</h2>
          <p className="text-forest/70 text-sm mb-6 leading-relaxed">{errorMsg}</p>
          <button
            onClick={onGoHome || onBack}
            className="w-full py-3 bg-sun text-forest font-semibold rounded-2xl hover:bg-sun-dark transition-colors text-sm"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  // TELA DE DESBLOQUEIO POR SENHA NUMÉRICA (PIN DE 4 DÍGITOS) - PROTEÇÃO LGPD
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-warm flex flex-col selection:bg-sun-dark/30">
        {/* Top Navbar */}
        <nav className="p-4 md:px-12 flex items-center justify-between bg-white/70 backdrop-blur-md sticky top-0 z-40 border-b border-soft">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={onGoHome || onBack}
            >
              <div className="w-10 h-10 bg-sun-dark rounded-xl flex items-center justify-center shadow-xs">
                <Building2 className="w-5 h-5 text-forest" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-xl font-bold tracking-tight text-forest leading-none">
                  AcolheMente
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-forest/60">
                  Corporativo & Saúde Mental
                </span>
              </div>
            </div>

            {/* Logo da Empresa no Topo */}
            {(empresaDoc?.logoUrl || empresaDoc?.logo || empresaDoc?.empresaLogo || empresaDoc?.logoBase64) && (
              <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-soft">
                <div className="w-8 h-8 rounded-lg bg-white border border-soft p-0.5 flex items-center justify-center overflow-hidden shadow-2xs">
                  <img
                    src={empresaDoc.logoUrl || empresaDoc.logo || empresaDoc.empresaLogo || empresaDoc.logoBase64}
                    alt={nomeEmpresaExibicao}
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <span className="text-xs font-bold text-forest max-w-[180px] truncate">
                  {nomeEmpresaExibicao}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onGoHome || onBack}
            className="flex items-center gap-1.5 text-xs text-forest/80 hover:text-forest font-semibold px-3 py-2 rounded-xl hover:bg-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>
        </nav>

        {/* Card de Desbloqueio */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 sm:p-8 shadow-xl border border-soft relative overflow-hidden animate-in zoom-in-95">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-sun/20 rounded-full blur-2xl pointer-events-none" />

            <div className="text-center mb-6 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-forest text-sun flex items-center justify-center mx-auto mb-3 shadow-md">
                <Lock className="w-7 h-7" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 text-[11px] font-bold rounded-full border border-emerald-200 mb-2.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Acesso Seguro • Proteção LGPD
              </span>
              <h2 className="font-serif text-2xl font-bold text-forest">
                Ficha de Implantação da Empresa
              </h2>
              <p className="text-xs text-forest/70 mt-1.5 leading-relaxed">
                Esta página abriga dados contratuais e a planilha de colaboradores de{" "}
                <strong className="text-forest font-semibold">{nomeEmpresaExibicao}</strong>.
              </p>
            </div>

            {pinError && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{pinError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyPin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-forest uppercase tracking-wider mb-2 text-center">
                  Digite a Senha Numérica (PIN de 4 Dígitos)
                </label>
                <div className="relative max-w-[240px] mx-auto">
                  <input
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={pinInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setPinInput(val);
                      if (pinError) setPinError("");
                    }}
                    placeholder="••••"
                    className="w-full py-3.5 bg-warm/50 border-2 border-soft focus:border-forest rounded-2xl text-center text-3xl font-mono tracking-[0.5em] text-forest outline-none transition-all placeholder:tracking-widest"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-forest/40 hover:text-forest p-1 rounded-lg"
                    title={showPin ? "Ocultar senha" : "Ver senha"}
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={pinInput.length < 4}
                className={`w-full py-3.5 font-bold text-sm rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  pinInput.length === 4
                    ? "bg-forest text-white hover:bg-forest/90 hover:scale-[1.01]"
                    : "bg-forest/40 text-white/80 cursor-not-allowed"
                }`}
              >
                <Unlock className="w-4 h-4 text-sun" />
                <span>Desbloquear Ficha de Implantação</span>
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-soft/60 text-center">
              <p className="text-[11px] text-forest/60 leading-relaxed">
                💡 <strong>Precisa do PIN?</strong> O código de segurança foi enviado para o WhatsApp/E-mail de contato cadastrado. Se necessário, contate o suporte do Projeto AcolheMente.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm flex flex-col selection:bg-sun-dark/30">
      {/* Top Navbar */}
      <nav className="p-4 md:px-12 flex items-center justify-between bg-white/70 backdrop-blur-md sticky top-0 z-40 border-b border-soft">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={onGoHome || onBack}
          >
            <div className="w-10 h-10 bg-sun-dark rounded-xl flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5 text-forest" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-xl font-bold tracking-tight text-forest leading-none">
                AcolheMente
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-forest/60">
                Corporativo & Saúde Mental
              </span>
            </div>
          </div>

          {/* Logo da Empresa Replicado no Topo ao Lado do Nome */}
          {(empresaDoc?.logoUrl || empresaDoc?.logo || empresaDoc?.empresaLogo || empresaDoc?.logoBase64) && (
            <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-soft">
              <div className="w-8 h-8 rounded-lg bg-white border border-soft p-0.5 flex items-center justify-center overflow-hidden shadow-2xs">
                <img
                  src={empresaDoc.logoUrl || empresaDoc.logo || empresaDoc.empresaLogo || empresaDoc.logoBase64}
                  alt={nomeEmpresaExibicao}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="text-xs font-bold text-forest max-w-[180px] truncate">
                {nomeEmpresaExibicao}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleCopyLink}
            className="hidden sm:flex items-center gap-2 px-3 py-2 text-xs font-semibold text-forest bg-warm/80 hover:bg-soft rounded-xl transition-all border border-soft"
            title="Copiar link desta ficha com PIN"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copiedLink ? "Link Copiado!" : "Copiar Link"}</span>
          </button>
          <button
            type="button"
            onClick={handleLockAccess}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all border border-rose-200 cursor-pointer"
            title="Bloquear sessão da Ficha de Implantação"
          >
            <Lock className="w-3.5 h-3.5 text-rose-600" />
            <span>Bloquear</span>
          </button>
          <button
            onClick={onGoHome || onBack}
            className="flex items-center gap-1.5 text-xs text-forest/80 hover:text-forest font-semibold px-3 py-2 rounded-xl hover:bg-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>
        </div>
      </nav>

      {/* Breadcrumbs */}
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-4">
        <Breadcrumbs
          items={[
            { label: "Início", onClick: onGoHome || onBack },
            { label: "Corporativo", onClick: onGoHome || onBack },
            { label: "Ficha de Implantação da Empresa", active: true },
          ]}
          className="!px-0 !mt-0"
        />
      </div>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 md:py-10 space-y-8">
        {/* Header Hero Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm border border-soft relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-48 h-48 bg-sun/20 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-forest/5 text-forest text-xs font-bold rounded-full mb-3">
                <FileText className="w-3.5 h-3.5 text-sun-dark" />
                <span>Cadastro Oficial & Formalização</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl text-forest font-semibold mb-2">
                Ficha de Implantação da Empresa
              </h1>
              <p className="text-sm sm:text-base text-forest/70 max-w-2xl leading-relaxed">
                Complete e confira as informações cadastrais, responsáveis, escopo de produtos
                contratados e condições comerciais para ativação e acompanhamento do programa de
                saúde psicossocial da sua empresa na plataforma AcolheMente.
              </p>
            </div>

            <div className="bg-warm/60 border border-soft rounded-2xl p-4 shrink-0 flex items-center gap-3.5 min-w-[280px]">
              {(empresaDoc?.logoUrl || empresaDoc?.logo || empresaDoc?.empresaLogo || empresaDoc?.logoBase64) ? (
                <div className="w-14 h-14 rounded-2xl bg-white border border-soft p-1 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                  <img
                    src={empresaDoc.logoUrl || empresaDoc.logo || empresaDoc.empresaLogo || empresaDoc.logoBase64}
                    alt={nomeEmpresaExibicao}
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-forest flex items-center justify-center text-sun shadow-2xs font-bold text-sm shrink-0">
                  {nomeEmpresaExibicao.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {empresaCategorias.includes("empresa_direta") && (
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                      Cliente Direta
                    </span>
                  )}
                  {empresaCategorias.includes("canal_parceiro") && (
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300">
                      Canal Parceiro
                    </span>
                  )}
                  {empresaCategorias.includes("empresa_conectada") && (
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                      Conectada {empresaPaiNome ? `(${empresaPaiNome})` : ""}
                    </span>
                  )}
                </div>
                <span className="text-base font-bold text-forest line-clamp-1">
                  {nomeEmpresaExibicao}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Ambiente Seguro & LGPD</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Toast */}
        {toastMsg && (
          <div className="fixed bottom-6 right-6 z-50 bg-forest text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-sun/30 animate-in fade-in slide-in-from-bottom-4">
            <CheckCircle2 className="w-5 h-5 text-sun" />
            <span className="text-sm font-semibold">{toastMsg}</span>
          </div>
        )}

        {/* Abas Principais: Dados da Empresa vs. Colaboradores e Dependentes */}
        <div className="flex items-center gap-2 p-1.5 bg-white rounded-2xl border border-soft shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab("empresa")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "empresa"
                ? "bg-forest text-white shadow-xs"
                : "text-forest/70 hover:text-forest hover:bg-warm/60"
            }`}
          >
            <Building2 className="w-4 h-4 text-sun-dark" />
            <span>1. Dados da Empresa</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("colaboradores")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "colaboradores"
                ? "bg-forest text-white shadow-xs"
                : "text-forest/70 hover:text-forest hover:bg-warm/60"
            }`}
          >
            <Users className="w-4 h-4 text-emerald-500" />
            <span>2. Colaboradores e Dependentes</span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
              activeTab === "colaboradores" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-900 border border-emerald-200"
            }`}>
              {colaboradoresList.length} vidas
            </span>
          </button>
        </div>

        {/* Success Alert */}
        {savedSuccess && activeTab === "empresa" && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl p-5 sm:p-6 flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 shadow-sm">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-base text-emerald-950">
                  {createdEmpresaId ? "Ficha de Implantação concluída com sucesso!" : "Ficha de Implantação salva com sucesso!"}
                </h4>
                <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                  {createdEmpresaId
                    ? `Os dados foram salvos e a empresa foi cadastrada como Empresa Conectada vinculada ao parceiro ${empresaPaiNome || "Canal Parceiro"}.`
                    : "Os dados contratuais e operacionais foram sincronizados diretamente com a gestão da plataforma AcolheMente."}
                </p>
              </div>
            </div>

            {createdEmpresaId && createdPin && (
              <div className="p-4 bg-white rounded-xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 block">
                    Acesso ao Portal do RH da Empresa Conectada
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-forest/70">Senha PIN de Acesso:</span>
                    <span className="font-mono font-bold text-base text-forest bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                      {createdPin}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      const link = `${window.location.origin}/?portal_rh=${createdEmpresaId}`;
                      navigator.clipboard.writeText(link);
                      setToastMsg(`Link do Portal do RH copiado! PIN: ${createdPin}`);
                      setTimeout(() => setToastMsg(null), 3500);
                    }}
                    className="flex-1 sm:flex-initial px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Link do Portal RH</span>
                  </button>
                  <a
                    href={`/?portal_rh=${createdEmpresaId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 sm:flex-initial px-3.5 py-2 bg-forest hover:bg-forest/90 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-sun" />
                    <span>Abrir Portal RH</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 1: Dados da Empresa Form */}
        {activeTab === "empresa" ? (
          <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. DADOS JURÍDICOS DA EMPRESA */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-soft space-y-6">
            <div className="flex items-center gap-3 border-b border-soft pb-4">
              <div className="w-9 h-9 rounded-xl bg-forest/5 flex items-center justify-center text-forest">
                <Building2 className="w-5 h-5 text-sun-dark" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-forest">
                  1. Identificação Jurídica da Empresa
                </h3>
                <p className="text-xs text-forest/60">
                  Dados cadastrais da pessoa jurídica contratante.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-forest/80">
                  Razão Social <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  name="razaoSocial"
                  value={formData.razaoSocial}
                  onChange={handleChange}
                  placeholder="Ex: Empresa ABC Tecnologia e Saúde LTDA"
                  className="px-4 py-3 bg-warm/40 border border-soft rounded-xl text-sm text-forest focus:outline-none focus:border-sun-dark focus:bg-white transition-all"
                />
                <span className="text-[11px] text-forest/50">
                  Nome oficial constante no cartão do CNPJ.
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-forest/80">
                  CNPJ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  name="cnpj"
                  value={formData.cnpj}
                  onChange={handleChange}
                  placeholder="00.000.000/0001-00"
                  className="px-4 py-3 bg-warm/40 border border-soft rounded-xl text-sm text-forest focus:outline-none focus:border-sun-dark focus:bg-white transition-all font-mono"
                />
                <span className="text-[11px] text-forest/50">
                  Cadastro Nacional de Pessoa Jurídica da empresa.
                </span>
              </div>
            </div>
          </section>

          {/* 2. DADOS DO RESPONSÁVEL */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-soft space-y-6">
            <div className="flex items-center gap-3 border-b border-soft pb-4">
              <div className="w-9 h-9 rounded-xl bg-forest/5 flex items-center justify-center text-forest">
                <UserCheck className="w-5 h-5 text-sun-dark" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-forest">
                  2. Responsável Legal & Contato Principal
                </h3>
                <p className="text-xs text-forest/60">
                  Pessoa responsável pela assinatura, gestão de contrato ou RH/Benefícios.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-forest/80">
                  Nome do Responsável <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  name="nomeResponsavel"
                  value={formData.nomeResponsavel}
                  onChange={handleChange}
                  placeholder="Ex: Carlos Eduardo de Souza"
                  className="px-4 py-3 bg-warm/40 border border-soft rounded-xl text-sm text-forest focus:outline-none focus:border-sun-dark focus:bg-white transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-forest/80">
                  CPF do Responsável <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  name="cpfResponsavel"
                  value={formData.cpfResponsavel}
                  onChange={handleChange}
                  placeholder="000.000.000-00"
                  className="px-4 py-3 bg-warm/40 border border-soft rounded-xl text-sm text-forest focus:outline-none focus:border-sun-dark focus:bg-white transition-all font-mono"
                />
                <span className="text-[11px] text-forest/50">
                  Necessário para a formalização contratual e conformidade jurídica.
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-forest/80">
                  E-mail Principal <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-forest/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="gestor@empresa.com.br"
                    className="w-full pl-10 pr-4 py-3 bg-warm/40 border border-soft rounded-xl text-sm text-forest focus:outline-none focus:border-sun-dark focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-forest/80">
                  Telefone / WhatsApp <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-forest/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    required
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleChange}
                    placeholder="(11) 99999-9999"
                    className="w-full pl-10 pr-4 py-3 bg-warm/40 border border-soft rounded-xl text-sm text-forest focus:outline-none focus:border-sun-dark focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 3. ESCOPO DO PROGRAMA & VIDAS */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-soft space-y-6">
            <div className="flex items-center gap-3 border-b border-soft pb-4">
              <div className="w-9 h-9 rounded-xl bg-forest/5 flex items-center justify-center text-forest">
                <Users className="w-5 h-5 text-sun-dark" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-forest">
                  3. Escopo, Vidas & Produtos Contratados
                </h3>
                <p className="text-xs text-forest/60">
                  Defina a quantidade de colaboradores cobertos através da sequência numérica para calibrar os cálculos da plataforma.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Painel de Upload e Download Compatível com Excel (Mesmo mecanismo e design dos portais de RH) */}
              <div className="bg-warm/40 border border-soft rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-forest flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      Planilha de Vidas & Importação RH (Excel / CSV)
                    </h4>
                    <p className="text-[11px] text-forest/70 mt-0.5">
                      Suba a relação oficial de colaboradores da empresa em formato Excel (.xlsx, .xls ou .csv) para calibração automática dos cálculos ou baixe a base atual.
                    </p>
                  </div>
                  {colaboradoresList.length > 0 && (
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 self-start sm:self-auto flex items-center gap-1.5 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      {colaboradoresList.length} vidas na base
                    </span>
                  )}
                </div>

                {/* Ações com o mesmo mecanismo e design dos portais de RH */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <input
                    type="file"
                    ref={excelUploadInputRef}
                    onChange={handleFileChangeExcel}
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                  />

                  {/* Subir Planilha */}
                  <button
                    type="button"
                    onClick={() => excelUploadInputRef.current?.click()}
                    className="px-3 py-2 bg-warm text-forest hover:bg-forest hover:text-white border border-soft rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    title="Importar planilha XLSX ou CSV para atualizar a base de vidas e turnover"
                  >
                    <Upload className="w-3.5 h-3.5 text-sun" />
                    <span>Subir Planilha (Upload)</span>
                  </button>

                  {/* Baixar Base (.xlsx) */}
                  <button
                    type="button"
                    onClick={() => handleDownloadPlanilha("xlsx")}
                    className="px-3 py-2 bg-warm text-forest hover:bg-forest hover:text-white border border-soft rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    title="Baixar lista completa de colaboradores em Excel (.xlsx)"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Baixar Base (.xlsx)</span>
                  </button>

                  {/* Baixar Modelo (.xlsx) */}
                  <button
                    type="button"
                    onClick={handleDownloadModeloPlanilha}
                    className="px-2.5 py-2 text-forest/70 hover:text-forest text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                    title="Baixar modelo em branco de planilha compatível com Excel"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Modelo (.xlsx)</span>
                  </button>

                  <div className="h-5 w-px bg-soft hidden sm:block mx-0.5" />

                  {/* Botão de Atalho para Aba 2 */}
                  <button
                    type="button"
                    onClick={() => setActiveTab("colaboradores")}
                    className="text-xs font-bold text-forest/80 hover:text-forest underline cursor-pointer ml-auto"
                  >
                    Ver planilha detalhada na Aba 2 →
                  </button>
                </div>
              </div>

              {/* Caixa de seleção com sequência numérica de vidas */}
              <div className="flex flex-col gap-2 max-w-xl">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-sun-dark" />
                    Quantidade de Vidas (Colaboradores) <span className="text-rose-500">*</span>
                  </label>
                  {formData.quantidadeVidas && (
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" />
                      {formData.quantidadeVidas} {formData.quantidadeVidas === "1" ? "vida" : "vidas"}
                    </span>
                  )}
                </div>

                <div className="space-y-2.5">
                  <select
                    name="quantidadeVidasSelect"
                    required
                    value={isCustomVidas ? "custom" : formData.quantidadeVidas}
                    onChange={handleSelectVidas}
                    className="w-full px-4 py-3 bg-warm/40 border border-soft rounded-xl text-sm text-forest font-semibold focus:outline-none focus:border-sun-dark focus:bg-white transition-all cursor-pointer shadow-xs"
                  >
                    <option value="">Selecione a quantidade de vidas na sequência numérica...</option>
                    {SEQUENCIA_NUMERICA_VIDAS_OPCOES.map((grupo) => (
                      <optgroup key={grupo.label} label={grupo.label}>
                        {grupo.opcoes.map((num) => (
                          <option key={num} value={String(num)}>
                            {num} {num === 1 ? "vida (colaborador)" : "vidas (colaboradores)"}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                    <option value="custom">Outra quantidade exata (Digitar manualmente)...</option>
                  </select>

                  {/* Campo de valor numérico exato personalizado */}
                  {isCustomVidas && (
                    <div className="flex items-center gap-3 p-3.5 bg-sun/10 border border-sun-dark/30 rounded-xl animate-in fade-in slide-in-from-top-1">
                      <div className="flex-1">
                        <label className="text-[11px] font-bold text-forest/80 block mb-1">
                          Digite a quantidade exata de colaboradores:
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            required
                            value={customVidasInput}
                            onChange={handleCustomVidasChange}
                            placeholder="Ex: 73"
                            className="w-full pl-3 pr-12 py-2 bg-white border border-soft rounded-lg text-sm text-forest font-mono font-bold focus:outline-none focus:border-sun-dark"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-forest/50 font-medium">
                            vidas
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomVidas(false);
                          setCustomVidasInput("");
                          setFormData((p) => ({ ...p, quantidadeVidas: "50" }));
                        }}
                        className="text-xs text-forest/70 hover:text-forest underline font-medium self-end mb-2 cursor-pointer"
                      >
                        Voltar à sequência
                      </button>
                    </div>
                  )}

                  {/* Atalhos Rápidos da Sequência Numérica */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-forest/50 font-medium mr-1">Atalhos rápidos:</span>
                    {[5, 10, 25, 50, 100, 150, 200, 500, 1000].map((qtd) => (
                      <button
                        key={qtd}
                        type="button"
                        onClick={() => handleSetVidasPill(qtd)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-medium ${
                          formData.quantidadeVidas === String(qtd) && !isCustomVidas
                            ? "bg-forest text-white border-forest shadow-xs font-bold"
                            : "bg-warm/50 hover:bg-sun/30 border-soft text-forest/80"
                        }`}
                      >
                        {qtd} vidas
                      </button>
                    ))}
                  </div>
                </div>

                <span className="text-[11px] text-forest/50">
                  O valor numérico padronizado alimenta com precisão os cálculos de mensalidade, relatórios e fechamentos de fatura.
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-forest/80">
                    Produtos Contratados <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-forest/50">
                    Clique nas sugestões abaixo para adicionar rapidamente
                  </span>
                </div>

                {/* Sugestões rápidas de produtos */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {PRODUTOS_SUGESTOES.map((prod, idx) => {
                    const jaIncluido = (formData.produtosContratados || "").includes(prod);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAddProduto(prod)}
                        disabled={jaIncluido}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${
                          jaIncluido
                            ? "bg-forest/10 border-forest/20 text-forest/50 cursor-default"
                            : "bg-warm/60 hover:bg-sun/40 border-soft text-forest cursor-pointer"
                        }`}
                      >
                        <Sparkles className="w-3 h-3 text-sun-dark" />
                        <span>{prod}</span>
                        {jaIncluido && <span className="text-[10px] font-bold">✓</span>}
                      </button>
                    );
                  })}
                </div>

                <textarea
                  name="produtosContratados"
                  required
                  rows={4}
                  value={formData.produtosContratados}
                  onChange={handleChange}
                  placeholder="Descreva ou liste os produtos e serviços acordados (ex: Acolhimento individual, palestras presenciais bimestrais, canal confidencial)..."
                  className="px-4 py-3 bg-warm/40 border border-soft rounded-xl text-sm text-forest focus:outline-none focus:border-sun-dark focus:bg-white transition-all resize-y leading-relaxed"
                />
              </div>
            </div>
          </section>

          {/* 4. CONDIÇÕES FINANCEIRAS & FATURAMENTO */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-soft space-y-6">
            <div className="flex items-center gap-3 border-b border-soft pb-4">
              <div className="w-9 h-9 rounded-xl bg-forest/5 flex items-center justify-center text-forest">
                <CreditCard className="w-5 h-5 text-sun-dark" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-forest">
                  4. Condições Financeiras & Faturamento
                </h3>
                <p className="text-xs text-forest/60">
                  Preencha o valor por vida e/ou o valor mensal em reais para abranger as variações de contrato (por vida, fixo mensal ou híbrido).
                </p>
              </div>
            </div>

            {/* Grid dos Dois Campos Financeiros em Reais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Campo 1: Valor por Vida em Reais */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-sun-dark" />
                    Valor por Vida em Reais (R$)
                  </label>
                  <span className="text-[10px] uppercase font-bold text-forest/40">Por colaborador / mês</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-forest/60">
                    R$
                  </span>
                  <input
                    type="text"
                    name="valorPorVida"
                    value={formData.valorPorVida}
                    onChange={handleValorPorVidaChange}
                    placeholder="Ex: 25,00 ou 35,00"
                    className="w-full pl-11 pr-4 py-3 bg-warm/40 border border-soft rounded-xl text-sm text-forest focus:outline-none focus:border-sun-dark focus:bg-white transition-all font-mono font-bold"
                  />
                </div>
                <span className="text-[11px] text-forest/50">
                  Valor acordado por vida ativa coberta (utilizado para contratos baseados em adesão e precificação unitária).
                </span>
              </div>

              {/* Campo 2: Valor Mensal em Reais */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-sun-dark" />
                    Valor Mensal em Reais (R$)
                  </label>
                  <span className="text-[10px] uppercase font-bold text-forest/40">Total Fixo / Contratual</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-forest/60">
                    R$
                  </span>
                  <input
                    type="text"
                    name="valorMensal"
                    value={formData.valorMensal}
                    onChange={handleValorMensalChange}
                    placeholder="Ex: 2.500,00 ou 4.500,00"
                    className="w-full pl-11 pr-4 py-3 bg-warm/40 border border-soft rounded-xl text-sm text-forest focus:outline-none focus:border-sun-dark focus:bg-white transition-all font-mono font-bold"
                  />
                </div>
                <span className="text-[11px] text-forest/50">
                  Valor total da fatura mensal (utilizado para contratos de mensalidade fixa ou franquia global).
                </span>
              </div>
            </div>

            {/* Cartão de Cálculo Inteligente e Variação de Contrato */}
            {(() => {
              const numVidas = parseInt(formData.quantidadeVidas.replace(/\D/g, ""), 10) || 0;
              const numPorVida = parseMoedaBR(formData.valorPorVida);
              const numMensal = parseMoedaBR(formData.valorMensal);
              const totalCalculado = numVidas * numPorVida;
              const porVidaEquivalente = numVidas > 0 && numMensal > 0 ? numMensal / numVidas : 0;

              return (
                <div className="bg-gradient-to-r from-emerald-50/70 via-warm/40 to-amber-50/70 border border-emerald-200/70 rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-forest" />
                      <span className="text-xs font-bold uppercase tracking-wider text-forest">
                        Simulação & Variação Contratual da Plataforma
                      </span>
                    </div>

                    {/* Variação Detectada */}
                    <div className="flex items-center gap-1.5">
                      {numPorVida > 0 && numMensal > 0 ? (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                          Contrato Híbrido (Por Vida + Fixo Mensal)
                        </span>
                      ) : numPorVida > 0 ? (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                          Contrato por Vida Ativa (Variável)
                        </span>
                      ) : numMensal > 0 ? (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                          Contrato Fixo Mensal
                        </span>
                      ) : (
                        <span className="text-[11px] text-forest/50">
                          Preencha o valor por vida e/ou mensal para ativar a simulação
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Linha de Diagnóstico e Cálculos */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                    <div className="bg-white/80 p-2.5 rounded-xl border border-soft">
                      <span className="text-forest/60 text-[11px] block">Base de Vidas:</span>
                      <span className="font-bold text-forest text-sm">
                        {numVidas > 0 ? `${numVidas} colaboradores` : "Não selecionada"}
                      </span>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-xl border border-soft">
                      <span className="text-forest/60 text-[11px] block">Custo por Vida:</span>
                      <span className="font-bold text-forest text-sm font-mono">
                        {numPorVida > 0
                          ? `R$ ${formatMoedaBR(numPorVida)}/vida`
                          : porVidaEquivalente > 0
                          ? `~ R$ ${formatMoedaBR(porVidaEquivalente)}/vida`
                          : "—"}
                      </span>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-xl border border-soft">
                      <span className="text-forest/60 text-[11px] block">Mensalidade Projetada:</span>
                      <span className="font-bold text-forest text-sm font-mono">
                        {numMensal > 0
                          ? `R$ ${formatMoedaBR(numMensal)}`
                          : totalCalculado > 0
                          ? `R$ ${formatMoedaBR(totalCalculado)}`
                          : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Ações de sincronização rápida */}
                  {(numVidas > 0 && (numPorVida > 0 || numMensal > 0)) && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-soft/80">
                      {numVidas > 0 && numPorVida > 0 && (
                        <button
                          type="button"
                          onClick={handleCalcularMensal}
                          className="px-3 py-1.5 bg-forest hover:bg-forest/90 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-sun" />
                          <span>Preencher Mensal Automático (R$ {formatMoedaBR(totalCalculado)})</span>
                        </button>
                      )}

                      {numVidas > 0 && numMensal > 0 && (
                        <button
                          type="button"
                          onClick={handleCalcularPorVida}
                          className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Coins className="w-3.5 h-3.5" />
                          <span>Preencher Valor por Vida Equivalente (R$ {formatMoedaBR(porVidaEquivalente)})</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Forma de Pagamento e Resumo Contratual */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-forest/80">
                  Forma de Pagamento <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  name="formaPagamento"
                  value={formData.formaPagamento}
                  onChange={handleChange}
                  className="px-4 py-3 bg-warm/40 border border-soft rounded-xl text-sm text-forest focus:outline-none focus:border-sun-dark focus:bg-white transition-all cursor-pointer font-medium"
                >
                  <option value="">Selecione a forma de pagamento...</option>
                  {FORMAS_PAGAMENTO_OPCOES.map((opt, i) => (
                    <option key={i} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-forest/50">
                  Formato de liquidação acordado para emissão de cobrança e NF.
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-forest/80">
                  Resumo Contratual / Cláusula de Valores
                </label>
                <input
                  type="text"
                  name="valoresDefinidos"
                  value={formData.valoresDefinidos}
                  onChange={handleChange}
                  placeholder="Ex: R$ 25,00 por vida | R$ 2.500,00 mensal"
                  className="px-4 py-3 bg-warm/40 border border-soft rounded-xl text-sm text-forest focus:outline-none focus:border-sun-dark focus:bg-white transition-all font-medium"
                />
                <span className="text-[11px] text-forest/50">
                  Resumo oficial que constará em propostas, contratos e fechamentos.
                </span>
              </div>
            </div>

            {/* Observações / Notas adicionais */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-soft">
              <label className="text-xs font-bold uppercase tracking-wider text-forest/80">
                Observações ou Instruções Financeiras Específicas
              </label>
              <textarea
                name="observacoesGerais"
                rows={2}
                value={formData.observacoesGerais}
                onChange={handleChange}
                placeholder="Ex: Enviar nota fiscal e boleto para o departamento financeiro (financeiro@empresa.com.br) até o dia 20 de cada mês."
                className="px-4 py-2.5 bg-warm/40 border border-soft rounded-xl text-sm text-forest focus:outline-none focus:border-sun-dark focus:bg-white transition-all resize-none"
              />
            </div>
          </section>

          {/* Submission Bar */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-soft flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 z-30">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-xs text-forest/70">
                Os dados são armazenados de forma criptografada sob conformidade com a LGPD.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto px-8 py-3.5 bg-sun text-forest font-bold rounded-2xl hover:bg-sun-dark transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 text-sm"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-forest border-t-transparent rounded-full animate-spin" />
                    <span>Salvando Ficha...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Salvar Ficha de Implantação</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
        ) : (
          /* Tab 2: Planilha de Colaboradores e Dependentes */
          <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-soft">
            <EmpresaColaboradoresSpreadsheet
              empresaId={empresaId}
              empresaNome={formData.razaoSocial || nomeEmpresaExibicao}
              quantidadeVidasContratadas={formData.quantidadeVidas}
              colaboradores={colaboradoresList}
              onChangeColaboradores={handleUpdateColaboradores}
              onShowToast={(msg) => {
                setToastMsg(msg);
                setTimeout(() => setToastMsg(null), 3500);
              }}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-8 text-center text-xs text-forest/50 border-t border-soft bg-white/40 mt-12">
        <p>Projeto AcolheMente Saúde Mental • Plataforma de Cuidado Psicológico & Corporativo</p>
      </footer>

      {/* ========================================================================= */}
      {/* MODAL: RECONCILIAÇÃO DE TURNOVER VIA UPLOAD EXCEL (MESMO DESIGN DO PORTAL RH) */}
      {/* ========================================================================= */}
      {showExcelModal && reconcileResult && (
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
                onClick={() => setShowExcelModal(false)}
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
                  id="chkDesligarFicha"
                  checked={desligarAusentes}
                  onChange={(e) => setDesligarAusentes(e.target.checked)}
                  className="mt-0.5 rounded cursor-pointer text-forest"
                />
                <label htmlFor="chkDesligarFicha" className="text-xs text-forest cursor-pointer">
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
                onClick={() => setShowExcelModal(false)}
                className="px-3 py-2 rounded-xl text-forest/70 hover:bg-warm font-semibold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isProcessingUpload}
                onClick={handleConfirmarReconciliacaoExcel}
                className="px-4 py-2 bg-emerald-700 text-white hover:bg-emerald-800 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isProcessingUpload ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Confirmar & Calibrar Base ({reconcileResult.mantidos.length + reconcileResult.novos.length} vidas)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
