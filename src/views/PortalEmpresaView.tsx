import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import * as XLSX from "xlsx";
import { db } from "../lib/firebase";
import {
  Building2,
  Users,
  BarChart3,
  Calendar,
  Download,
  Upload,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Printer,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  LogOut,
  ArrowLeft,
  ShieldCheck,
  UserCheck,
  UserX,
  FileText,
  Clock,
  Sparkles,
  TrendingUp,
  Activity,
  Layers,
  ArrowUpDown,
  Mail,
  Phone,
  Check,
  X,
  Share2,
  Copy,
  Info,
  DollarSign,
  CreditCard,
  Wallet,
  Receipt,
  CheckCircle,
} from "lucide-react";
import {
  CategoriaEmpresa,
  getEmpresaCategorias,
  hasEmpresaCategoria,
  FaturamentoConfig,
  FaturaHistoricoItem,
  ServicoAdicionalItem,
  StatusFatura,
  CargoEmpresa,
  ServicoCorporativoConfig,
  DEFAULT_SERVICOS_CORPORATIVOS,
} from "../types/corporativo";
import logoImage from "../assets/images/logo_acolhe.jpeg";

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
  titularVinculado?: string; // Nome ou CPF do titular (para dependentes)
  parentesco?: string; // Cônjuge, Filho(a), Enteado(a), Outro
  status?: "ativo" | "inativo" | "desligado";
  dataDesligamento?: string;
  observacoes?: string;
}

interface PortalEmpresaViewProps {
  empresaId?: string | null;
  onBack?: () => void;
  onGoHome?: () => void;
}

const MESES_ANO = [
  { valor: 1, nome: "Janeiro" },
  { valor: 2, nome: "Fevereiro" },
  { valor: 3, nome: "Março" },
  { valor: 4, nome: "Abril" },
  { valor: 5, nome: "Maio" },
  { valor: 6, nome: "Junho" },
  { valor: 7, nome: "Julho" },
  { valor: 8, nome: "Agosto" },
  { valor: 9, nome: "Setembro" },
  { valor: 10, nome: "Outubro" },
  { valor: 11, nome: "Novembro" },
  { valor: 12, nome: "Dezembro" },
];

export function PortalEmpresaView({
  empresaId: propEmpresaId,
  onBack,
  onGoHome,
}: PortalEmpresaViewProps) {
  // Estado da Empresa Principal (logada/selecionada via URL ou login)
  const [empresaId, setEmpresaId] = useState<string | null>(() => {
    return (
      propEmpresaId ||
      new URLSearchParams(window.location.search).get("portal_empresa") ||
      new URLSearchParams(window.location.search).get("portal_rh") ||
      new URLSearchParams(window.location.search).get("empresa_portal") ||
      sessionStorage.getItem("portal_empresa_active_id") ||
      null
    );
  });

  // Empresa conectada selecionada (quando a logada é um Canal de Benefícios)
  const [empresaAtivaId, setEmpresaAtivaId] = useState<string | null>(null);

  // Dados carregados da empresa principal e empresas vinculadas
  const [empresaPrincipal, setEmpresaPrincipal] = useState<any | null>(null);
  const [empresaAtiva, setEmpresaAtiva] = useState<any | null>(null);
  const [empresasConectadas, setEmpresasConectadas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingConectadas, setLoadingConectadas] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Autenticação por PIN
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [showPin, setShowPin] = useState(false);

  // Login por CNPJ (caso acesse a tela sem token)
  const [loginCnpj, setLoginCnpj] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Navegação do Portal
  const [activeTab, setActiveTab] = useState<"indicadores" | "colaboradores" | "faturamento" | "dados">("indicadores");

  // Filtros de Mês/Ano para Indicadores
  const [mesSelecionado, setMesSelecionado] = useState<number>(() => new Date().getMonth() + 1);
  const [anoSelecionado, setAnoSelecionado] = useState<number>(() => new Date().getFullYear());

  // Faturamento & Mensalidade
  const [competenciaFaturaSelecionada, setCompetenciaFaturaSelecionada] = useState<string>("atual");
  const [showFaturaEspelhoModal, setShowFaturaEspelhoModal] = useState(false);
  const [faturaParaVisualizar, setFaturaParaVisualizar] = useState<FaturaHistoricoItem | null>(null);
  const [isFechandoFatura, setIsFechandoFatura] = useState(false);
  const [showNovoServicoModal, setShowNovoServicoModal] = useState(false);
  const [novoServicoForm, setNovoServicoForm] = useState<Partial<ServicoAdicionalItem>>({
    descricao: "",
    quantidade: 1,
    valorUnitario: 0,
    tipo: "servico",
    data: new Date().toISOString().split("T")[0],
  });

  // Dados clínicos/atendimentos agregados (anônimos)
  const [atendimentosMes, setAtendimentosMes] = useState<any[]>([]);
  const [totalHistoricoAcolhimentos, setTotalHistoricoAcolhimentos] = useState<number>(0);

  // Gestão de Colaboradores & Dependentes
  const [colaboradoresList, setColaboradoresList] = useState<ColaboradorItem[]>([]);
  const [buscaColaborador, setBuscaColaborador] = useState("");
  const [filtroTipoColaborador, setFiltroTipoColaborador] = useState<"todos" | "titular" | "dependente">("todos");
  const [filtroStatusColaborador, setFiltroStatusColaborador] = useState<"todos" | "ativo" | "desligado">("ativo");

  // Modal Novo / Edição de Colaborador
  const [showModalColaborador, setShowModalColaborador] = useState(false);
  const [editingColaborador, setEditingColaborador] = useState<ColaboradorItem | null>(null);
  const [formColaborador, setFormColaborador] = useState<Partial<ColaboradorItem>>({
    tipo: "titular",
    nomeCompleto: "",
    cpf: "",
    dataNascimento: "",
    nomeMae: "",
    dataAdmissao: "",
    email: "",
    telefone: "",
    titularVinculado: "",
    parentesco: "",
    status: "ativo",
  });

  // Modal de Upload e Reconciliação de Turnover
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [parsedRows, setParsedRows] = useState<ColaboradorItem[]>([]);
  const [reconcileResult, setReconcileResult] = useState<{
    novos: ColaboradorItem[];
    mantidos: ColaboradorItem[];
    desligados: ColaboradorItem[];
  } | null>(null);
  const [desligarAusentes, setDesligarAusentes] = useState(true);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Modal de Relatório Mensal para Impressão / PDF
  const [showRelatorioModal, setShowRelatorioModal] = useState(false);

  // Helper de Toast
  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Scroll to top
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [activeTab, empresaAtivaId]);

  // Carrega a empresa principal
  useEffect(() => {
    if (!empresaId) {
      setLoading(false);
      return;
    }

    const fetchEmpresa = async () => {
      try {
        setLoading(true);
        setErrorMsg("");
        const docRef = doc(db, "empresa_leads", empresaId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as any;
          setEmpresaPrincipal(data);
          setEmpresaAtiva(data);
          setEmpresaAtivaId(data.id);
          setColaboradoresList(Array.isArray(data.colaboradoresList) ? data.colaboradoresList : []);

          // Checa PIN / Autenticação
          const sessionAuth = sessionStorage.getItem(`portal_rh_auth_${empresaId}`);
          if (!data.pinAcessoRH || sessionAuth === "true") {
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
          sessionStorage.setItem("portal_empresa_active_id", empresaId);
        } else {
          setErrorMsg("Empresa não encontrada ou link expirado.");
        }
      } catch (err) {
        console.error("Erro ao carregar empresa:", err);
        setErrorMsg("Falha ao comunicar com o servidor. Verifique sua conexão.");
      } finally {
        setLoading(false);
      }
    };

    fetchEmpresa();
  }, [empresaId]);

  // Se a empresa for um Canal de Benefícios, busca as empresas conectadas
  useEffect(() => {
    if (!empresaPrincipal || !isAuthenticated) return;
    const cats = getEmpresaCategorias(empresaPrincipal);
    if (!cats.includes("canal_parceiro")) return;

    const fetchConectadas = async () => {
      try {
        setLoadingConectadas(true);
        const q = query(
          collection(db, "empresa_leads"),
          where("empresaPaiId", "==", empresaPrincipal.id)
        );
        const snap = await getDocs(q);
        const list: any[] = [];
        snap.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        setEmpresasConectadas(list);
      } catch (err) {
        console.error("Erro ao buscar empresas conectadas:", err);
      } finally {
        setLoadingConectadas(false);
      }
    };

    fetchConectadas();
  }, [empresaPrincipal, isAuthenticated]);

  // Atualiza empresa ativa quando o operador do canal troca no seletor
  const handleTrocarEmpresaAtiva = async (novaEmpresaId: string) => {
    if (novaEmpresaId === empresaPrincipal?.id) {
      setEmpresaAtiva(empresaPrincipal);
      setEmpresaAtivaId(empresaPrincipal.id);
      setColaboradoresList(Array.isArray(empresaPrincipal.colaboradoresList) ? empresaPrincipal.colaboradoresList : []);
      return;
    }

    const encontrada = empresasConectadas.find((c) => c.id === novaEmpresaId);
    if (encontrada) {
      setEmpresaAtiva(encontrada);
      setEmpresaAtivaId(encontrada.id);
      setColaboradoresList(Array.isArray(encontrada.colaboradoresList) ? encontrada.colaboradoresList : []);
    }
  };

  // Carrega indicadores clínicos/acolhimentos reais anônimos do Firestore para a empresa ativa
  useEffect(() => {
    if (!empresaAtivaId || !isAuthenticated) return;

    // Busca acolhimentos vinculados a esta empresa
    const qAcolhimentos = query(
      collection(db, "acolhimentos"),
      where("empresaLeadId", "==", empresaAtivaId)
    );

    const unsub = onSnapshot(
      qAcolhimentos,
      (snap) => {
        const list: any[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setTotalHistoricoAcolhimentos(list.length);

        // Filtra por mês e ano selecionados
        const filtradosMes = list.filter((item) => {
          let dataItem: Date | null = null;
          if (item.createdAt?.toDate) {
            dataItem = item.createdAt.toDate();
          } else if (item.dataCadastro) {
            dataItem = new Date(item.dataCadastro);
          } else if (item.dataPrimeiroContato) {
            dataItem = new Date(item.dataPrimeiroContato);
          }
          if (!dataItem || isNaN(dataItem.getTime())) return false;
          return (
            dataItem.getMonth() + 1 === mesSelecionado &&
            dataItem.getFullYear() === anoSelecionado
          );
        });

        setAtendimentosMes(filtradosMes);
      },
      (err) => {
        console.error("Erro ao carregar atendimentos da empresa:", err);
      }
    );

    return () => unsub();
  }, [empresaAtivaId, isAuthenticated, mesSelecionado, anoSelecionado]);

  // Login por CNPJ + PIN caso o operador acesse sem URL direta
  const handleLoginByCnpj = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginCnpj.trim()) {
      setPinError("Informe o CNPJ da empresa.");
      return;
    }
    try {
      setIsLoggingIn(true);
      setPinError("");
      const cleanCnpj = loginCnpj.replace(/\D/g, "");
      const q = query(collection(db, "empresa_leads"));
      const snap = await getDocs(q);

      let found: any = null;
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        const dCnpj = (d.cnpj || "").replace(/\D/g, "");
        if (dCnpj && (dCnpj === cleanCnpj || dCnpj.includes(cleanCnpj))) {
          found = { id: docSnap.id, ...d };
        }
      });

      if (!found) {
        setPinError("CNPJ não encontrado no sistema. Verifique os números digitados.");
        setIsLoggingIn(false);
        return;
      }

      // Valida PIN se houver
      if (found.pinAcessoRH && found.pinAcessoRH.trim()) {
        if (found.pinAcessoRH !== loginPin.trim()) {
          setPinError("PIN de Acesso RH incorreto.");
          setIsLoggingIn(false);
          return;
        }
      }

      setEmpresaId(found.id);
      setEmpresaPrincipal(found);
      setEmpresaAtiva(found);
      setEmpresaAtivaId(found.id);
      setColaboradoresList(Array.isArray(found.colaboradoresList) ? found.colaboradoresList : []);
      setIsAuthenticated(true);
      sessionStorage.setItem(`portal_rh_auth_${found.id}`, "true");
      sessionStorage.setItem("portal_empresa_active_id", found.id);
      showToast("Acesso autorizado com sucesso!", "success");
    } catch (err) {
      console.error("Erro no login do portal:", err);
      setPinError("Erro ao processar login. Tente novamente.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Validação do PIN na tela de bloqueio
  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaPrincipal) return;

    if (empresaPrincipal.pinAcessoRH && empresaPrincipal.pinAcessoRH.trim()) {
      if (pinInput.trim() === empresaPrincipal.pinAcessoRH.trim()) {
        setIsAuthenticated(true);
        sessionStorage.setItem(`portal_rh_auth_${empresaPrincipal.id}`, "true");
        setPinError("");
        showToast("Identidade confirmada!", "success");
      } else {
        setPinError("PIN de Acesso incorreto. Tente novamente.");
      }
    } else {
      setIsAuthenticated(true);
    }
  };

  const handleLogout = () => {
    if (empresaPrincipal) {
      sessionStorage.removeItem(`portal_rh_auth_${empresaPrincipal.id}`);
    }
    sessionStorage.removeItem("portal_empresa_active_id");
    setIsAuthenticated(false);
    setPinInput("");
    if (onGoHome) onGoHome();
  };

  // Algoritmo Determinístico Client-Side: Geração automática de cargos e precificação por Quartis (Modelo A) com mínimo de R$ 60
  const gerarCargosEPrecosAutomaticos = (colaboradores: ColaboradorItem[]) => {
    const cargoMap = new Map<string, { nomeOriginal: string; salarios: number[] }>();

    colaboradores.forEach((c) => {
      if (c.tipo === "dependente" || !c.cargo || !c.cargo.trim()) return;
      const nomeOriginal = c.cargo.trim();
      const id = nomeOriginal
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "_");

      if (!cargoMap.has(id)) {
        cargoMap.set(id, { nomeOriginal, salarios: [] });
      }

      if (c.faixaSalarial) {
        const matchNumbers = c.faixaSalarial.match(/\d+[\d.,]*/g);
        if (matchNumbers && matchNumbers.length > 0) {
          const nums = matchNumbers.map((n) => parseFloat(n.replace(/\./g, "").replace(",", "."))).filter((n) => !isNaN(n) && n > 0);
          if (nums.length > 0) {
            const mediaSalario = nums.reduce((a, b) => a + b, 0) / nums.length;
            cargoMap.get(id)!.salarios.push(mediaSalario);
          }
        }
      }
    });

    if (cargoMap.size === 0) {
      return {
        cargos: [
          { id: "operacional", nome: "Operacional / Assistente" },
          { id: "analista", nome: "Analista / Especialista" },
          { id: "coordenacao", nome: "Liderança / Coordenação" },
          { id: "gerencia", nome: "Gerência / Diretoria" },
        ],
        servicos: DEFAULT_SERVICOS_CORPORATIVOS,
      };
    }

    const cargosCalculados = Array.from(cargoMap.entries()).map(([id, data]) => {
      let mediana = 3500;
      if (data.salarios.length > 0) {
        const sorted = [...data.salarios].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        mediana = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      }
      return {
        id,
        nome: data.nomeOriginal,
        medianaSalario: mediana,
      };
    });

    cargosCalculados.sort((a, b) => a.medianaSalario - b.medianaSalario);

    const cargosFinais: CargoEmpresa[] = cargosCalculados.map((c) => ({
      id: c.id,
      nome: c.nome,
    }));

    const totalCargos = cargosCalculados.length;
    const servicosFinais: ServicoCorporativoConfig[] = DEFAULT_SERVICOS_CORPORATIVOS.map((serv) => {
      const precosPorCargoRecord: Record<string, any> = {};

      cargosCalculados.forEach((cargo, index) => {
        let fatorBase = 1.0;
        if (totalCargos > 1) {
          fatorBase = 1.0 + (index / (totalCargos - 1)) * 0.8;
        }
        const defaultPreco = serv.precosPorCargo["operacional"]?.valorSessao || 60;
        const valorCalculado = Math.max(60, Math.round((defaultPreco * fatorBase) / 5) * 5);

        precosPorCargoRecord[cargo.id] = {
          valorSessao: valorCalculado,
          frequenciaRecomendada: serv.servicoId.includes("casal") || serv.servicoId.includes("carreira") ? "Quinzenal (~2 sessões/mês)" : "Semanal (~4 sessões/mês)",
          sessoesMesEstimadas: serv.servicoId.includes("casal") || serv.servicoId.includes("carreira") ? 2 : 4,
        };
      });

      return {
        ...serv,
        precosPorCargo: precosPorCargoRecord,
      };
    });

    return {
      cargos: cargosFinais,
      servicos: servicosFinais,
    };
  };

  // Salvar lista de colaboradores no Firestore da empresa ativa e atualizar matriz de cargos/preços automaticamente
  const persistirColaboradores = async (novaLista: ColaboradorItem[]) => {
    if (!empresaAtivaId) return;
    try {
      const docRef = doc(db, "empresa_leads", empresaAtivaId);
      const beneficioGerado = gerarCargosEPrecosAutomaticos(novaLista);

      const updates = {
        colaboradoresList: novaLista,
        quantidadeVidasAtual: novaLista.filter((c) => c.status !== "desligado" && c.status !== "inativo").length,
        ultimaAtualizacaoQuadro: new Date().toISOString(),
        beneficioConfig: beneficioGerado,
      };

      await updateDoc(docRef, updates);
      setColaboradoresList(novaLista);
      showToast("Quadro de vidas e matriz de preços por quartis atualizados com sucesso!", "success");
    } catch (err) {
      console.error("Erro ao salvar colaboradores:", err);
      showToast("Erro ao salvar alterações no banco de dados.", "error");
    }
  };

  // Salvar novo / editar colaborador
  const handleSalvarColaborador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formColaborador.nomeCompleto?.trim()) {
      showToast("Informe o nome completo.", "error");
      return;
    }
    if (!formColaborador.cpf?.trim()) {
      showToast("Informe o CPF.", "error");
      return;
    }

    const itemSalvar: ColaboradorItem = {
      id: editingColaborador ? editingColaborador.id : `colab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tipo: formColaborador.tipo || "titular",
      nomeCompleto: formColaborador.nomeCompleto.trim(),
      cpf: formColaborador.cpf.trim(),
      cargo: formColaborador.tipo === "titular" ? (formColaborador.cargo || "").trim() : undefined,
      faixaSalarial: formColaborador.tipo === "titular" ? (formColaborador.faixaSalarial || "").trim() : undefined,
      dataNascimento: formColaborador.dataNascimento || "",
      nomeMae: formColaborador.nomeMae || "",
      dataAdmissao: formColaborador.dataAdmissao || "",
      email: formColaborador.email || "",
      telefone: formColaborador.telefone || "",
      titularVinculado: formColaborador.tipo === "dependente" ? formColaborador.titularVinculado || "" : undefined,
      parentesco: formColaborador.tipo === "dependente" ? formColaborador.parentesco || "" : undefined,
      status: formColaborador.status || "ativo",
      observacoes: formColaborador.observacoes || "",
    };

    let novaLista: ColaboradorItem[];
    if (editingColaborador) {
      novaLista = colaboradoresList.map((c) => (c.id === editingColaborador.id ? itemSalvar : c));
    } else {
      novaLista = [itemSalvar, ...colaboradoresList];
    }

    await persistirColaboradores(novaLista);
    setShowModalColaborador(false);
    setEditingColaborador(null);
  };

  // Desligar colaborador (Turnover)
  const handleDesligarColaborador = async (id: string) => {
    const colab = colaboradoresList.find((c) => c.id === id);
    if (!colab) return;
    const isDesligado = colab.status === "desligado";

    const msgConfirm = isDesligado
      ? `Deseja reativar o colaborador "${colab.nomeCompleto}" no quadro?`
      : `Confirmar o desligamento (Turnover) de "${colab.nomeCompleto}"? O acesso aos benefícios psicológicos será inativado.`;

    if (!window.confirm(msgConfirm)) return;

    const novaLista = colaboradoresList.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          status: (isDesligado ? "ativo" : "desligado") as any,
          dataDesligamento: isDesligado ? undefined : new Date().toISOString().split("T")[0],
        };
      }
      return c;
    });

    await persistirColaboradores(novaLista);
  };

  // Excluir definitivamente colaborador
  const handleExcluirColaborador = async (id: string) => {
    const colab = colaboradoresList.find((c) => c.id === id);
    if (!colab) return;
    if (!window.confirm(`Deseja excluir permanentemente o cadastro de "${colab.nomeCompleto}"?`)) return;

    const novaLista = colaboradoresList.filter((c) => c.id !== id);
    await persistirColaboradores(novaLista);
  };

  // DOWNLOAD DA PLANILHA (.XLSX)
  const handleDownloadPlanilha = (formato: "xlsx" | "csv" = "xlsx") => {
    try {
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
        Status: c.status === "desligado" ? "Desligado" : "Ativo",
        "Data Desligamento": c.dataDesligamento || "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Colaboradores e Dependentes");

      const nomeArquivo = `Quadro_Colaboradores_${(empresaAtiva?.nomeEmpresa || "Empresa").replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.${formato}`;
      XLSX.writeFile(workbook, nomeArquivo, { bookType: formato });
      showToast(`Planilha ${formato.toUpperCase()} exportada com sucesso!`, "success");
    } catch (err) {
      console.error("Erro ao gerar planilha:", err);
      showToast("Erro ao exportar planilha.", "error");
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
      showToast("Modelo baixado! Preencha e faça o upload.", "info");
    } catch (err) {
      console.error("Erro ao baixar modelo:", err);
      showToast("Erro ao gerar modelo de planilha.", "error");
    }
  };

  // UPLOAD E LEITURA DA PLANILHA COM XLSX
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
          showToast("A planilha enviada está vazia ou sem linhas de dados.", "error");
          return;
        }

        // Normalização dos campos
        const parsed: ColaboradorItem[] = rawJson.map((row: any, idx: number) => {
          const nome = row["Nome Completo"] || row["Nome"] || row["nome"] || row["NOME"] || "";
          const rawCpf = String(row["CPF"] || row["cpf"] || row["Cpf"] || "").replace(/\D/g, "");
          const formatCpf = rawCpf.length === 11 ? rawCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : rawCpf;
          const tipoRaw = String(row["Tipo"] || row["tipo"] || "Titular").toLowerCase();
          const tipo: "titular" | "dependente" = tipoRaw.includes("dep") ? "dependente" : "titular";
          const cargo = tipo === "titular" ? String(row["Cargo"] || row["cargo"] || row["CARGO"] || row["Função"] || row["Funcao"] || "") : "";
          const faixaSalarial = tipo === "titular" ? String(row["Faixa Salarial"] || row["faixaSalarial"] || row["Faixa"] || row["Salário"] || row["Salario"] || row["Remuneração"] || "") : "";

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
            parentesco: String(row["Parentesco"] || row["Grau"] || ""),
            status: "ativo" as const,
          };
        }).filter((item) => item.nomeCompleto.length > 0);

        setParsedRows(parsed);

        // Reconciliação de Turnover: Compara com a base atual
        const atuaisMap = new Map<string, ColaboradorItem>();
        colaboradoresList.forEach((c) => {
          const key = c.cpf ? c.cpf.replace(/\D/g, "") : c.nomeCompleto.toLowerCase();
          atuaisMap.set(key, c);
        });

        const novos: ColaboradorItem[] = [];
        const mantidos: ColaboradorItem[] = [];
        const importedKeys = new Set<string>();

        parsed.forEach((p) => {
          const key = p.cpf ? p.cpf.replace(/\D/g, "") : p.nomeCompleto.toLowerCase();
          importedKeys.add(key);
          if (atuaisMap.has(key)) {
            const existing = atuaisMap.get(key)!;
            mantidos.push({ ...existing, ...p, id: existing.id, status: "ativo" });
          } else {
            novos.push(p);
          }
        });

        // Identifica quem estava na base e não veio na planilha (Turnover / Desligados)
        const desligados: ColaboradorItem[] = [];
        colaboradoresList.forEach((c) => {
          if (c.status === "desligado") return; // já estava desligado
          const key = c.cpf ? c.cpf.replace(/\D/g, "") : c.nomeCompleto.toLowerCase();
          if (!importedKeys.has(key)) {
            desligados.push(c);
          }
        });

        setReconcileResult({ novos, mantidos, desligados });
        setShowUploadModal(true);
      } catch (err) {
        console.error("Erro ao ler planilha:", err);
        showToast("Formato de planilha inválido. Use .xlsx ou .csv padrão.", "error");
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // APLICAR RECONCILIAÇÃO DE TURNOVER NO BANCO
  const handleConfirmarReconciliacao = async () => {
    if (!reconcileResult) return;
    try {
      setIsProcessingUpload(true);
      let listaFinal: ColaboradorItem[] = [...reconcileResult.mantidos, ...reconcileResult.novos];

      if (desligarAusentes) {
        // Marca os que não vieram como desligados
        const desligadosProcessados = reconcileResult.desligados.map((d) => ({
          ...d,
          status: "desligado" as const,
          dataDesligamento: new Date().toISOString().split("T")[0],
        }));
        listaFinal = [...listaFinal, ...desligadosProcessados];
      } else {
        // Mantém os que não vieram como ativos
        listaFinal = [...listaFinal, ...reconcileResult.desligados];
      }

      await persistirColaboradores(listaFinal);
      setShowUploadModal(false);
      setReconcileResult(null);
      setParsedRows([]);
      showToast("Quadro de colaboradores atualizado com sucesso via planilha!", "success");
    } catch (err) {
      console.error("Erro ao confirmar reconciliação:", err);
      showToast("Erro ao processar atualização em lote.", "error");
    } finally {
      setIsProcessingUpload(false);
    }
  };

  // Estatísticas e Métricas Calculadas
  const vidasContratadasNum = useMemo(() => {
    const raw = empresaAtiva?.quantidadeVidas || empresaAtiva?.colaboradores || "0";
    const m = String(raw).match(/\d+/);
    return m ? parseInt(m[0], 10) : 0;
  }, [empresaAtiva]);

  const vidasCadastradasAtivas = useMemo(() => {
    return colaboradoresList.filter((c) => c.status !== "desligado" && c.status !== "inativo").length;
  }, [colaboradoresList]);

  const totalTitulares = useMemo(() => {
    return colaboradoresList.filter((c) => c.tipo !== "dependente" && c.status !== "desligado").length;
  }, [colaboradoresList]);

  const totalDependentes = useMemo(() => {
    return colaboradoresList.filter((c) => c.tipo === "dependente" && c.status !== "desligado").length;
  }, [colaboradoresList]);

  const totalDesligados = useMemo(() => {
    return colaboradoresList.filter((c) => c.status === "desligado").length;
  }, [colaboradoresList]);

  const taxaAdesaoPercent = useMemo(() => {
    if (vidasCadastradasAtivas === 0) return 0;
    const taxa = (atendimentosMes.length / vidasCadastradasAtivas) * 100;
    return Math.min(Math.round(taxa * 10) / 10, 100);
  }, [atendimentosMes, vidasCadastradasAtivas]);

  // Desfechos clínicos anônimos agregados
  const desfechosAnonimos = useMemo(() => {
    let emAtendimento = 0;
    let concluidosAltas = 0;
    let emTriagem = 0;

    atendimentosMes.forEach((a) => {
      if (a.status === "Alta" || a.status === "Concluído") {
        concluidosAltas++;
      } else if (a.status === "Em Atendimento" || a.atribuicaoStatus === "Aceito") {
        emAtendimento++;
      } else {
        emTriagem++;
      }
    });

    return { emAtendimento, concluidosAltas, emTriagem };
  }, [atendimentosMes]);

  // Lista filtrada de colaboradores
  const colaboradoresFiltrados = useMemo(() => {
    return colaboradoresList.filter((c) => {
      if (filtroTipoColaborador !== "todos" && c.tipo !== filtroTipoColaborador) return false;
      if (filtroStatusColaborador === "ativo" && c.status === "desligado") return false;
      if (filtroStatusColaborador === "desligado" && c.status !== "desligado") return false;

      if (!buscaColaborador.trim()) return true;
      const term = buscaColaborador.toLowerCase();
      return (
        (c.nomeCompleto || "").toLowerCase().includes(term) ||
        (c.cpf || "").toLowerCase().includes(term) ||
        (c.cargo || "").toLowerCase().includes(term) ||
        (c.faixaSalarial || "").toLowerCase().includes(term) ||
        (c.email || "").toLowerCase().includes(term) ||
        (c.telefone || "").toLowerCase().includes(term) ||
        (c.titularVinculado || "").toLowerCase().includes(term)
      );
    });
  }, [colaboradoresList, filtroTipoColaborador, filtroStatusColaborador, buscaColaborador]);

  // =========================================================================
  // GESTÃO E CÁLCULO DE FATURAMENTO & MENSALIDADE
  // =========================================================================
  const faturamentoConfig = useMemo((): FaturamentoConfig => {
    const fc = empresaAtiva?.faturamentoConfig || {};
    const valorPorVida =
      typeof fc.valorPorVida === "number" && fc.valorPorVida > 0
        ? fc.valorPorVida
        : typeof empresaAtiva?.valorPorVida === "number" && empresaAtiva.valorPorVida > 0
        ? empresaAtiva.valorPorVida
        : 18.0;
    const diaVencimento = fc.diaVencimento || empresaAtiva?.diaVencimento || 10;
    const modeloCobranca = fc.modeloCobranca || empresaAtiva?.modeloCobranca || "por_vida";
    const chavePix = fc.chavePix || empresaAtiva?.chavePix || "financeiro@acolhemente.com.br";
    const favorecidoPix = fc.favorecidoPix || empresaAtiva?.favorecidoPix || "Rede AcolheMente Saúde e Bem-Estar";
    const franquiaMinimaVidas = fc.franquiaMinimaVidas || empresaAtiva?.franquiaMinimaVidas || 0;
    const valorFixoMensal = fc.valorFixoMensal || empresaAtiva?.valorFixoMensal || 0;

    const servicosAdicionaisMesAtual: ServicoAdicionalItem[] = Array.isArray(empresaAtiva?.servicosAdicionaisMesAtual)
      ? empresaAtiva.servicosAdicionaisMesAtual
      : Array.isArray(fc.servicosAdicionaisMesAtual)
      ? fc.servicosAdicionaisMesAtual
      : [];

    const historicoFaturas: FaturaHistoricoItem[] = Array.isArray(empresaAtiva?.historicoFaturas)
      ? empresaAtiva.historicoFaturas
      : Array.isArray(fc.historicoFaturas)
      ? fc.historicoFaturas
      : [];

    return {
      valorPorVida,
      diaVencimento,
      modeloCobranca,
      chavePix,
      favorecidoPix,
      franquiaMinimaVidas,
      valorFixoMensal,
      servicosAdicionaisMesAtual,
      historicoFaturas,
    };
  }, [empresaAtiva]);

  // Cálculo da Mensalidade Atual (Ao Vivo)
  const faturamentoAtualCalculado = useMemo(() => {
    const {
      valorPorVida = 18.0,
      modeloCobranca = "por_vida",
      franquiaMinimaVidas = 0,
      valorFixoMensal = 0,
      servicosAdicionaisMesAtual = [],
      diaVencimento = 10,
    } = faturamentoConfig;

    const vidasAtivas = vidasCadastradasAtivas;

    let subtotalVidas = 0;
    if (modeloCobranca === "fixo_mensal") {
      subtotalVidas = valorFixoMensal;
    } else if (modeloCobranca === "franquia_excedente") {
      const baseVidas = Math.max(franquiaMinimaVidas, vidasAtivas);
      subtotalVidas = baseVidas * valorPorVida;
    } else {
      // Padrão: por vida ativa
      subtotalVidas = vidasAtivas * valorPorVida;
    }

    const totalServicosAdicionais = servicosAdicionaisMesAtual.reduce((acc, item) => {
      const qtd = Number(item.quantidade) || 1;
      const val = Number(item.valorUnitario) || 0;
      return acc + (item.tipo === "desconto" ? -(qtd * val) : qtd * val);
    }, 0);

    const valorTotalPrevisto = Math.max(0, subtotalVidas + totalServicosAdicionais);
    const mesFormatado = String(mesSelecionado).padStart(2, "0");
    const competenciaStr = `${mesFormatado}/${anoSelecionado}`;

    // Próximo vencimento formatado
    const diaVenc = String(diaVencimento).padStart(2, "0");
    const mesVenc = mesSelecionado === 12 ? "01" : String(mesSelecionado + 1).padStart(2, "0");
    const anoVenc = mesSelecionado === 12 ? anoSelecionado + 1 : anoSelecionado;
    const dataVencimentoFormatada = `${diaVenc}/${mesVenc}/${anoVenc}`;

    return {
      id: `fat_atual_${anoSelecionado}_${mesSelecionado}`,
      competencia: competenciaStr,
      mes: mesSelecionado,
      ano: anoSelecionado,
      quantidadeVidasFechamento: vidasAtivas,
      quantidadeTitulares: totalTitulares,
      quantidadeDependentes: totalDependentes,
      valorPorVida,
      subtotalVidas,
      servicosAdicionais: servicosAdicionaisMesAtual,
      totalServicosAdicionais,
      valorTotal: valorTotalPrevisto,
      status: "previsto" as StatusFatura,
      dataVencimento: dataVencimentoFormatada,
    };
  }, [faturamentoConfig, vidasCadastradasAtivas, totalTitulares, totalDependentes, mesSelecionado, anoSelecionado]);

  // Fatura exibida atualmente no painel (Ao vivo ou histórica selecionada)
  const faturaExibida = useMemo(() => {
    if (competenciaFaturaSelecionada === "atual") {
      return faturamentoAtualCalculado;
    }
    const historica = (faturamentoConfig.historicoFaturas || []).find(
      (f) => f.id === competenciaFaturaSelecionada || f.competencia === competenciaFaturaSelecionada
    );
    return historica || faturamentoAtualCalculado;
  }, [competenciaFaturaSelecionada, faturamentoAtualCalculado, faturamentoConfig.historicoFaturas]);

  // Adicionar Serviço Adicional ao mês atual
  const handleAdicionarServicoAdicional = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoServicoForm.descricao?.trim()) {
      showToast("Informe a descrição do serviço adicional.", "error");
      return;
    }
    const valorUnit = Number(novoServicoForm.valorUnitario) || 0;
    if (valorUnit <= 0) {
      showToast("Informe um valor válido maior que zero.", "error");
      return;
    }

    const novoItem: ServicoAdicionalItem = {
      id: `serv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      descricao: novoServicoForm.descricao.trim(),
      quantidade: Number(novoServicoForm.quantidade) || 1,
      valorUnitario: valorUnit,
      data: novoServicoForm.data || new Date().toISOString().split("T")[0],
      tipo: novoServicoForm.tipo || "servico",
      observacao: novoServicoForm.observacao || "",
    };

    const novaLista = [...(faturamentoConfig.servicosAdicionaisMesAtual || []), novoItem];
    try {
      if (empresaAtivaId) {
        const docRef = doc(db, "empresa_leads", empresaAtivaId);
        await updateDoc(docRef, {
          servicosAdicionaisMesAtual: novaLista,
          "faturamentoConfig.servicosAdicionaisMesAtual": novaLista,
        });
      }
      setEmpresaAtiva((prev: any) => ({
        ...prev,
        servicosAdicionaisMesAtual: novaLista,
        faturamentoConfig: { ...(prev?.faturamentoConfig || {}), servicosAdicionaisMesAtual: novaLista },
      }));
      setShowNovoServicoModal(false);
      setNovoServicoForm({
        descricao: "",
        quantidade: 1,
        valorUnitario: 0,
        tipo: "servico",
        data: new Date().toISOString().split("T")[0],
      });
      showToast("Lançamento adicional inserido com sucesso!", "success");
    } catch (err) {
      console.error("Erro ao adicionar serviço adicional:", err);
      showToast("Erro ao salvar serviço adicional.", "error");
    }
  };

  // Remover Serviço Adicional
  const handleRemoverServicoAdicional = async (idServico: string) => {
    const novaLista = (faturamentoConfig.servicosAdicionaisMesAtual || []).filter((s) => s.id !== idServico);
    try {
      if (empresaAtivaId) {
        const docRef = doc(db, "empresa_leads", empresaAtivaId);
        await updateDoc(docRef, {
          servicosAdicionaisMesAtual: novaLista,
          "faturamentoConfig.servicosAdicionaisMesAtual": novaLista,
        });
      }
      setEmpresaAtiva((prev: any) => ({
        ...prev,
        servicosAdicionaisMesAtual: novaLista,
        faturamentoConfig: { ...(prev?.faturamentoConfig || {}), servicosAdicionaisMesAtual: novaLista },
      }));
      showToast("Lançamento removido com sucesso.", "info");
    } catch (err) {
      console.error("Erro ao remover serviço adicional:", err);
      showToast("Erro ao remover serviço.", "error");
    }
  };

  // Fechar / Congelar Oficialmente a Fatura do Mês (Snapshot Histórico)
  const handleFecharFaturaMesAtual = async () => {
    if (!empresaAtivaId) return;
    try {
      setIsFechandoFatura(true);
      const faturaSnapshot: FaturaHistoricoItem = {
        ...faturamentoAtualCalculado,
        id: `fat_hist_${Date.now()}_${anoSelecionado}_${mesSelecionado}`,
        status: "faturado",
        dataFechamento: new Date().toISOString(),
        fechadoPor: "Portal do RH / Admin",
      };

      // Se já existia um histórico para esta competência, substitui/atualiza
      const historicoAtual = faturamentoConfig.historicoFaturas || [];
      const filtrado = historicoAtual.filter((f) => f.competencia !== faturaSnapshot.competencia);
      const novoHistorico = [faturaSnapshot, ...filtrado];

      const docRef = doc(db, "empresa_leads", empresaAtivaId);
      await updateDoc(docRef, {
        historicoFaturas: novoHistorico,
        "faturamentoConfig.historicoFaturas": novoHistorico,
        // Limpa serviços adicionais após fechar o mês para a próxima competência
        servicosAdicionaisMesAtual: [],
        "faturamentoConfig.servicosAdicionaisMesAtual": [],
      });

      setEmpresaAtiva((prev: any) => ({
        ...prev,
        historicoFaturas: novoHistorico,
        servicosAdicionaisMesAtual: [],
        faturamentoConfig: {
          ...(prev?.faturamentoConfig || {}),
          historicoFaturas: novoHistorico,
          servicosAdicionaisMesAtual: [],
        },
      }));

      setCompetenciaFaturaSelecionada(faturaSnapshot.id);
      showToast(`Competência ${faturaSnapshot.competencia} fechada e congelada com sucesso!`, "success");
    } catch (err) {
      console.error("Erro ao fechar fatura do mês:", err);
      showToast("Erro ao fechar fatura do mês.", "error");
    } finally {
      setIsFechandoFatura(false);
    }
  };

  // Copiar chave PIX
  const handleCopiarPix = () => {
    if (!faturamentoConfig.chavePix) return;
    navigator.clipboard.writeText(faturamentoConfig.chavePix);
    showToast("Chave PIX copiada para a área de transferência!", "success");
  };

  // Tela de Carregamento
  if (loading) {
    return (
      <div className="min-h-screen bg-warm flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl border border-soft shadow-lg flex flex-col items-center gap-4 text-center max-w-sm w-full">
          <RefreshCw className="w-10 h-10 text-forest animate-spin" />
          <h2 className="font-serif text-xl font-bold text-forest">Carregando Portal Corporativo...</h2>
          <p className="text-xs text-forest/70">Autenticando e preparando indicadores da empresa.</p>
        </div>
      </div>
    );
  }

  // Tela de Login / Bloqueio por PIN
  if (!empresaPrincipal || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-warm flex flex-col justify-between p-4 sm:p-8">
        <div className="max-w-md w-full mx-auto my-auto bg-white rounded-3xl border border-soft shadow-xl p-6 sm:p-8">
          {/* Header */}
          <div className="flex flex-col items-center text-center gap-3 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-sun/20 border border-sun/40 flex items-center justify-center text-forest overflow-hidden shadow-sm">
              <img src={logoImage} alt="AcolheMente" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-forest/10 text-forest border border-forest/20 inline-flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Acesso Restrito RH & Canal
              </span>
              <h1 className="font-serif text-2xl font-bold text-forest mt-1.5">Portal Corporativo</h1>
              <p className="text-xs text-forest/70 mt-1">
                {empresaPrincipal
                  ? `Digite o PIN de Segurança para acessar o painel de ${empresaPrincipal.nomeEmpresa || empresaPrincipal.razaoSocial}`
                  : "Acesse os indicadores e faça a gestão do quadro de colaboradores da sua empresa."}
              </p>
            </div>
          </div>

          {/* Erro */}
          {(pinError || errorMsg) && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{pinError || errorMsg}</span>
            </div>
          )}

          {empresaPrincipal ? (
            // Form PIN da Empresa encontrada
            <form onSubmit={handleVerifyPin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-forest mb-1.5">
                  PIN de Acesso RH / Canal (4 a 6 dígitos)
                </label>
                <div className="relative">
                  <input
                    type={showPin ? "text" : "password"}
                    maxLength={10}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="••••••"
                    className="w-full pl-4 pr-10 py-3 bg-warm/40 border border-soft focus:border-forest rounded-xl text-center text-lg font-mono tracking-widest text-forest outline-none transition-all"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-forest/50 hover:text-forest"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-forest text-white hover:bg-forest/90 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Unlock className="w-4 h-4 text-sun" />
                <span>Entrar no Portal</span>
              </button>
            </form>
          ) : (
            // Form Login por CNPJ + PIN
            <form onSubmit={handleLoginByCnpj} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-forest mb-1">CNPJ da Empresa</label>
                <input
                  type="text"
                  value={loginCnpj}
                  onChange={(e) => setLoginCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="w-full px-3.5 py-2.5 bg-warm/40 border border-soft focus:border-forest rounded-xl text-xs text-forest outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-forest mb-1">PIN de Acesso RH (se configurado)</label>
                <input
                  type="password"
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value)}
                  placeholder="••••••"
                  className="w-full px-3.5 py-2.5 bg-warm/40 border border-soft focus:border-forest rounded-xl text-xs font-mono text-forest outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 bg-forest text-white hover:bg-forest/90 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Unlock className="w-4 h-4 text-sun" />
                )}
                <span>Acessar Portal</span>
              </button>
            </form>
          )}

          {onGoHome && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={onGoHome}
                className="text-xs text-forest/60 hover:text-forest flex items-center justify-center gap-1 mx-auto cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar à Página Inicial</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // PORTAL AUTENTICADO
  const categoriasEmpresa = getEmpresaCategorias(empresaPrincipal);
  const isCanalBeneficios = categoriasEmpresa.includes("canal_parceiro");

  return (
    <div className="min-h-screen bg-warm flex flex-col">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3 ${
            toastMsg.type === "success"
              ? "bg-emerald-800 text-white border-emerald-600"
              : toastMsg.type === "error"
              ? "bg-red-800 text-white border-red-600"
              : "bg-forest text-white border-forest/40"
          }`}
        >
          {toastMsg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-300" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* TOPBAR DO PORTAL */}
      <header className="bg-white border-b border-soft sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Logo e Nome da Empresa */}
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-warm rounded-xl text-forest/70 hover:text-forest transition-colors cursor-pointer"
                title="Voltar"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            <div className="w-9 h-9 rounded-xl bg-sun/20 border border-sun/40 flex items-center justify-center text-forest overflow-hidden shrink-0 shadow-2xs">
              <img src={logoImage} alt="Logo" className="w-full h-full object-cover" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-base sm:text-lg font-bold text-forest truncate max-w-xs sm:max-w-md">
                  {empresaAtiva?.nomeEmpresa || empresaAtiva?.razaoSocial || "Empresa Parceira"}
                </h1>
                {isCanalBeneficios && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300 shrink-0">
                    Canal Parceiro
                  </span>
                )}
                {empresaAtiva?.empresaPaiNome && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                    via {empresaAtiva.empresaPaiNome}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-forest/60">
                CNPJ: {empresaAtiva?.cnpj || "Não informado"} • Portal de Gestão do RH
              </p>
            </div>
          </div>

          {/* Seletor de Carteira para Canal de Benefícios & Logout */}
          <div className="flex items-center gap-2">
            {isCanalBeneficios && empresasConectadas.length > 0 && (
              <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 rounded-xl px-2.5 py-1 text-xs">
                <Layers className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                <span className="text-[11px] font-bold text-purple-900 hidden sm:inline">Empresa:</span>
                <select
                  value={empresaAtivaId || ""}
                  onChange={(e) => handleTrocarEmpresaAtiva(e.target.value)}
                  className="bg-transparent text-purple-900 font-semibold text-xs outline-none cursor-pointer pr-1"
                >
                  <option value={empresaPrincipal.id}>
                    🏢 {empresaPrincipal.nomeEmpresa || empresaPrincipal.razaoSocial} (Canal Matriz)
                  </option>
                  <optgroup label="Empresas Conectadas">
                    {empresasConectadas.map((c) => (
                      <option key={c.id} value={c.id}>
                        ↳ {c.nomeEmpresa || c.razaoSocial} ({c.quantidadeVidas || 0} vidas)
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="px-2.5 py-1.5 text-forest/70 hover:text-red-700 hover:bg-red-50 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Sair do Portal"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>

        {/* Abas de Navegação */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-2 border-t border-soft/60 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("indicadores")}
            className={`py-2.5 px-3.5 border-b-2 font-bold text-xs transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "indicadores"
                ? "border-forest text-forest"
                : "border-transparent text-forest/60 hover:text-forest"
            }`}
          >
            <BarChart3 className="w-4 h-4 text-sun" />
            <span>Indicadores & Relatório Mensal</span>
          </button>

          <button
            onClick={() => setActiveTab("colaboradores")}
            className={`py-2.5 px-3.5 border-b-2 font-bold text-xs transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "colaboradores"
                ? "border-forest text-forest"
                : "border-transparent text-forest/60 hover:text-forest"
            }`}
          >
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Quadro de Colaboradores & Turnover</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-forest text-white font-bold">
              {vidasCadastradasAtivas}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("faturamento")}
            className={`py-2.5 px-3.5 border-b-2 font-bold text-xs transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "faturamento"
                ? "border-forest text-forest"
                : "border-transparent text-forest/60 hover:text-forest"
            }`}
          >
            <Receipt className="w-4 h-4 text-emerald-700" />
            <span>Faturamento & Mensalidade</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-200 font-extrabold">
              R$ {faturamentoAtualCalculado.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("dados")}
            className={`py-2.5 px-3.5 border-b-2 font-bold text-xs transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "dados"
                ? "border-forest text-forest"
                : "border-transparent text-forest/60 hover:text-forest"
            }`}
          >
            <Building2 className="w-4 h-4 text-forest/70" />
            <span>Dados Cadastrais & PIN</span>
          </button>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 flex-1 flex flex-col gap-6">
        {/* ========================================================================= */}
        {/* ABA 1: INDICADORES & RELATÓRIO MENSAL */}
        {/* ========================================================================= */}
        {activeTab === "indicadores" && (
          <div className="space-y-6">
            {/* Header de Controle do Período & Botão de Impressão */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-soft shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-base sm:text-lg font-bold text-forest flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-forest/70" />
                  <span>Painel Executivo de Saúde Mental & Utilização</span>
                </h2>
                <p className="text-[11px] text-forest/70 mt-0.5">
                  Métricas anônimas e agregadas em conformidade com a LGPD e Ética Profissional (CFP).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                {/* Seletor Mês / Ano */}
                <div className="flex items-center gap-1.5 bg-warm px-2.5 py-1 rounded-xl border border-soft">
                  <Calendar className="w-3.5 h-3.5 text-forest/60" />
                  <select
                    value={mesSelecionado}
                    onChange={(e) => setMesSelecionado(Number(e.target.value))}
                    className="bg-transparent text-forest font-bold text-xs outline-none cursor-pointer"
                  >
                    {MESES_ANO.map((m) => (
                      <option key={m.valor} value={m.valor}>
                        {m.nome}
                      </option>
                    ))}
                  </select>
                  <select
                    value={anoSelecionado}
                    onChange={(e) => setAnoSelecionado(Number(e.target.value))}
                    className="bg-transparent text-forest font-bold text-xs outline-none cursor-pointer"
                  >
                    <option value={2025}>2025</option>
                    <option value={2026}>2026</option>
                    <option value={2027}>2027</option>
                  </select>
                </div>

                {/* Botão Exportar Relatório */}
                <button
                  type="button"
                  onClick={() => setShowRelatorioModal(true)}
                  className="px-3 py-1.5 bg-forest text-white hover:bg-forest/90 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-sun" />
                  <span>Emitir Relatório Mensal</span>
                </button>
              </div>
            </div>

            {/* Grid de Cards de Indicadores */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Vidas Contratadas vs Ativas */}
              <div className="bg-white p-4 rounded-2xl border border-soft shadow-xs flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-forest/60 uppercase tracking-wider">Vidas Ativas / Meta</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-forest">{vidasCadastradasAtivas}</span>
                    <span className="text-xs text-forest/50 font-medium">/ {vidasContratadasNum || "—"} contratadas</span>
                  </div>
                  <p className="text-[10px] text-forest/70 mt-1">
                    {totalTitulares} titulares • {totalDependentes} dependentes
                  </p>
                </div>
              </div>

              {/* Card 2: Atendimentos no Mês */}
              <div className="bg-white p-4 rounded-2xl border border-soft shadow-xs flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-forest/60 uppercase tracking-wider">
                    Atendimentos ({MESES_ANO.find((m) => m.valor === mesSelecionado)?.nome.slice(0, 3)})
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-forest">{atendimentosMes.length}</span>
                    <span className="text-xs text-emerald-700 font-semibold">acolhimentos</span>
                  </div>
                  <p className="text-[10px] text-forest/70 mt-1">
                    {totalHistoricoAcolhimentos} atendimentos acumulados na história
                  </p>
                </div>
              </div>

              {/* Card 3: Taxa de Adesão */}
              <div className="bg-white p-4 rounded-2xl border border-soft shadow-xs flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-forest/60 uppercase tracking-wider">Taxa de Engajamento</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-forest">{taxaAdesaoPercent}%</span>
                    <span className="text-xs text-amber-700 font-semibold">utilização ativa</span>
                  </div>
                  <p className="text-[10px] text-forest/70 mt-1">
                    Índice médio de busca por cuidado psicológico
                  </p>
                </div>
              </div>

              {/* Card 4: Turnover / Desligamentos */}
              <div className="bg-white p-4 rounded-2xl border border-soft shadow-xs flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-forest/60 uppercase tracking-wider">Turnover / Desligados</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                    <UserX className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-forest">{totalDesligados}</span>
                    <span className="text-xs text-purple-700 font-semibold">inativados</span>
                  </div>
                  <p className="text-[10px] text-forest/70 mt-1">
                    Vidas desligadas na atualização de folha
                  </p>
                </div>
              </div>
            </div>

            {/* Banner Executivo de Previsão de Faturamento do Mês */}
            <div className="bg-gradient-to-r from-forest to-forest/90 text-white p-5 rounded-2xl border border-forest/50 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-sun shrink-0">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-sun text-forest">
                      Competência Vigente
                    </span>
                    <span className="text-xs text-white/80">
                      {faturamentoAtualCalculado.competencia} (Vencimento: {faturamentoAtualCalculado.dataVencimento})
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3 mt-1">
                    <h3 className="font-serif text-2xl font-bold text-white">
                      R$ {faturamentoAtualCalculado.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </h3>
                    <span className="text-xs text-white/70">
                      ({vidasCadastradasAtivas} vidas ativas × R$ {(faturamentoConfig.valorPorVida || 18).toFixed(2)}
                      {faturamentoAtualCalculado.totalServicosAdicionais > 0
                        ? ` + R$ ${faturamentoAtualCalculado.totalServicosAdicionais.toFixed(2)} serviços extras`
                        : ""}
                      )
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("faturamento")}
                  className="w-full md:w-auto px-4 py-2 bg-sun hover:bg-sun-dark text-forest font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Ver Demonstrativo & Faturamento</span>
                </button>
              </div>
            </div>

            {/* Painel com Desfechos Clínicos e Gráfico de Distribuição */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Desfechos Clínicos Anônimos */}
              <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-soft shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-soft">
                  <h3 className="font-serif text-sm sm:text-base font-bold text-forest flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    <span>Status Clínico dos Colaboradores ({MESES_ANO.find((m) => m.valor === mesSelecionado)?.nome} / {anoSelecionado})</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    Total Sigilo Ético
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-warm/50 rounded-xl border border-soft">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-forest/60 block">Em Acompanhamento Ativo</span>
                    <span className="text-xl font-bold text-forest block mt-1">{desfechosAnonimos.emAtendimento}</span>
                    <span className="text-[10px] text-forest/70">Sessões regulares em andamento</span>
                  </div>

                  <div className="p-3.5 bg-warm/50 rounded-xl border border-soft">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-forest/60 block">Concluídos / Altas</span>
                    <span className="text-xl font-bold text-emerald-800 block mt-1">{desfechosAnonimos.concluidosAltas}</span>
                    <span className="text-[10px] text-forest/70">Ciclos terapêuticos finalizados</span>
                  </div>

                  <div className="p-3.5 bg-warm/50 rounded-xl border border-soft">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-forest/60 block">Em Triagem Inicial</span>
                    <span className="text-xl font-bold text-amber-700 block mt-1">{desfechosAnonimos.emTriagem}</span>
                    <span className="text-[10px] text-forest/70">Aguardando aceite do psicólogo</span>
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    <strong>Garantia de Confidencialidade:</strong> Os relatórios do RH nunca contêm dados nominais, notas de sessão, prontuários ou motivos de atendimento individual, preservando a integridade e privacidade integral de cada colaborador.
                  </p>
                </div>
              </div>

              {/* Informações Contratuais da Empresa */}
              <div className="bg-white p-5 rounded-2xl border border-soft shadow-xs space-y-3">
                <h3 className="font-serif text-sm font-bold text-forest flex items-center gap-2 pb-2 border-b border-soft">
                  <FileText className="w-4 h-4 text-forest/70" />
                  <span>Resumo do Convênio</span>
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-soft/50">
                    <span className="text-forest/60">Razão Social:</span>
                    <span className="font-bold text-forest truncate max-w-[160px]">{empresaAtiva?.razaoSocial || empresaAtiva?.nomeEmpresa}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-soft/50">
                    <span className="text-forest/60">Responsável RH:</span>
                    <span className="font-semibold text-forest">{empresaAtiva?.nomeResponsavel || empresaAtiva?.contatoNome || "RH"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-soft/50">
                    <span className="text-forest/60">Email do RH:</span>
                    <span className="font-semibold text-forest truncate max-w-[160px]">{empresaAtiva?.email || "—"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-soft/50">
                    <span className="text-forest/60">Plano / Vidas:</span>
                    <span className="font-bold text-forest">{vidasContratadasNum} vidas contratadas</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-forest/60">Forma de Pagamento:</span>
                    <span className="font-semibold text-forest">{empresaAtiva?.formaPagamento || "Faturamento Mensal"}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowRelatorioModal(true)}
                  className="w-full py-2 bg-warm hover:bg-forest hover:text-white border border-soft rounded-xl text-xs font-bold text-forest transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                >
                  <Printer className="w-3.5 h-3.5 text-sun" />
                  <span>Visualizar Relatório Executivo</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 2: QUADRO DE COLABORADORES, TURNOVER E PLANILHAS */}
        {/* ========================================================================= */}
        {activeTab === "colaboradores" && (
          <div className="space-y-4">
            {/* Header da Gestão de Colaboradores & Ações em Massa */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-soft shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-base sm:text-lg font-bold text-forest">
                    Quadro de Colaboradores & Dependentes
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-forest text-white">
                    {vidasCadastradasAtivas} vidas ativas
                  </span>
                </div>
                <p className="text-[11px] text-forest/70 mt-0.5">
                  Atualize o quadro em tempo real ou importe a planilha do RH para controle automático de turnover.
                </p>
              </div>

              {/* Botões de Ação */}
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
                {/* Input File Oculto */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />

                {/* Upload Planilha */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 bg-warm text-forest hover:bg-forest hover:text-white border border-soft rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  title="Importar planilha XLSX ou CSV para atualizar a base de vidas e turnover"
                >
                  <Upload className="w-3.5 h-3.5 text-sun" />
                  <span>Subir Planilha (Upload)</span>
                </button>

                {/* Download Planilha Atual */}
                <button
                  type="button"
                  onClick={() => handleDownloadPlanilha("xlsx")}
                  className="px-2.5 py-1.5 bg-warm text-forest hover:bg-forest hover:text-white border border-soft rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  title="Baixar lista completa de colaboradores em Excel (.xlsx)"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Baixar Base (.xlsx)</span>
                </button>

                {/* Baixar Modelo */}
                <button
                  type="button"
                  onClick={handleDownloadModeloPlanilha}
                  className="px-2 py-1.5 text-forest/70 hover:text-forest text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                  title="Baixar modelo em branco de planilha"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Modelo</span>
                </button>

                {/* Novo Colaborador */}
                <button
                  type="button"
                  onClick={() => {
                    setEditingColaborador(null);
                    setFormColaborador({
                      tipo: "titular",
                      nomeCompleto: "",
                      cpf: "",
                      dataNascimento: "",
                      nomeMae: "",
                      dataAdmissao: "",
                      email: "",
                      telefone: "",
                      titularVinculado: "",
                      parentesco: "",
                      status: "ativo",
                    });
                    setShowModalColaborador(true);
                  }}
                  className="px-3 py-1.5 bg-forest text-white hover:bg-forest/90 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-sun" />
                  <span>Adicionar Vida</span>
                </button>
              </div>
            </div>

            {/* Barra de Filtros e Busca */}
            <div className="bg-white p-3 rounded-2xl border border-soft shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 text-forest/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={buscaColaborador}
                  onChange={(e) => setBuscaColaborador(e.target.value)}
                  placeholder="Buscar por nome, CPF, email ou telefone..."
                  className="w-full pl-8 pr-3 py-1.5 bg-warm/30 rounded-xl text-xs text-forest border border-soft focus:border-forest outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                {/* Filtro Tipo */}
                <div className="flex items-center gap-1 bg-warm p-0.5 rounded-lg border border-soft text-xs">
                  <button
                    type="button"
                    onClick={() => setFiltroTipoColaborador("todos")}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                      filtroTipoColaborador === "todos" ? "bg-white text-forest shadow-2xs" : "text-forest/60"
                    }`}
                  >
                    Todos ({colaboradoresList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroTipoColaborador("titular")}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                      filtroTipoColaborador === "titular" ? "bg-white text-forest shadow-2xs" : "text-forest/60"
                    }`}
                  >
                    Titulares ({totalTitulares})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroTipoColaborador("dependente")}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                      filtroTipoColaborador === "dependente" ? "bg-white text-forest shadow-2xs" : "text-forest/60"
                    }`}
                  >
                    Dependentes ({totalDependentes})
                  </button>
                </div>

                {/* Filtro Status (Ativos vs Desligados) */}
                <div className="flex items-center gap-1 bg-warm p-0.5 rounded-lg border border-soft text-xs">
                  <button
                    type="button"
                    onClick={() => setFiltroStatusColaborador("ativo")}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                      filtroStatusColaborador === "ativo" ? "bg-emerald-600 text-white shadow-2xs" : "text-forest/60"
                    }`}
                  >
                    Ativos ({vidasCadastradasAtivas})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroStatusColaborador("desligado")}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                      filtroStatusColaborador === "desligado" ? "bg-purple-700 text-white shadow-2xs" : "text-forest/60"
                    }`}
                  >
                    Turnover / Desligados ({totalDesligados})
                  </button>
                </div>
              </div>
            </div>

            {/* Tabela de Colaboradores */}
            <div className="bg-white rounded-2xl border border-soft shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-forest">
                  <thead className="bg-warm/60 border-b border-soft text-[11px] uppercase tracking-wider font-bold text-forest/70">
                    <tr>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Nome Completo</th>
                      <th className="px-4 py-3">CPF</th>
                      <th className="px-4 py-3 hidden sm:table-cell">Cargo / Salário (Titular)</th>
                      <th className="px-4 py-3 hidden md:table-cell">Nascimento</th>
                      <th className="px-4 py-3 hidden lg:table-cell">Contato</th>
                      <th className="px-4 py-3 hidden md:table-cell">Vínculo / Parentesco</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-soft/50">
                    {colaboradoresFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-10 text-forest/50 text-xs">
                          Nenhum colaborador encontrado com os filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      colaboradoresFiltrados.map((colab) => {
                        const isDesligado = colab.status === "desligado";
                        return (
                          <tr
                            key={colab.id}
                            className={`hover:bg-warm/30 transition-colors ${
                              isDesligado ? "opacity-60 bg-red-50/20" : ""
                            }`}
                          >
                            <td className="px-4 py-3">
                              {colab.tipo === "dependente" ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                                  Dependente
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                  Titular
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-semibold text-forest">
                              {colab.nomeCompleto}
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] text-forest/80">
                              {colab.cpf}
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell text-forest/80">
                              {colab.tipo === "titular" ? (
                                <div>
                                  <div className="font-semibold text-forest text-xs">{colab.cargo || "—"}</div>
                                  {colab.faixaSalarial && (
                                    <span className="inline-block px-1.5 py-0.5 mt-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-medium">
                                      {colab.faixaSalarial}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-forest/30 italic text-[11px]">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell text-forest/70">
                              {colab.dataNascimento || "—"}
                            </td>
                            <td className="px-4 py-3 hidden lg:table-cell text-forest/70 text-[11px]">
                              {colab.email && <div>{colab.email}</div>}
                              {colab.telefone && <div>{colab.telefone}</div>}
                              {!colab.email && !colab.telefone && "—"}
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell text-forest/70">
                              {colab.tipo === "dependente" ? (
                                <div>
                                  <span className="font-semibold">{colab.parentesco || "Dependente"}</span>
                                  {colab.titularVinculado && (
                                    <div className="text-[10px] text-forest/50">de: {colab.titularVinculado}</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[11px] text-forest/50">Colaborador Próprio</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {isDesligado ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                                  Desligado
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  Ativo
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingColaborador(colab);
                                    setFormColaborador(colab);
                                    setShowModalColaborador(true);
                                  }}
                                  className="p-1 hover:bg-forest/10 rounded-lg text-forest/70 hover:text-forest transition-colors cursor-pointer"
                                  title="Editar Dados"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDesligarColaborador(colab.id)}
                                  className={`p-1 rounded-lg transition-colors cursor-pointer ${
                                    isDesligado
                                      ? "hover:bg-emerald-100 text-emerald-700"
                                      : "hover:bg-amber-100 text-amber-700"
                                  }`}
                                  title={isDesligado ? "Reativar Vida" : "Desligar Vida (Turnover)"}
                                >
                                  {isDesligado ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleExcluirColaborador(colab.id)}
                                  className="p-1 hover:bg-red-100 rounded-lg text-red-600 transition-colors cursor-pointer"
                                  title="Excluir Definitivamente"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Botão Flutuante Otimizado para Telas Pequenas e Apertadas (Mobile) */}
            <div className="fixed bottom-6 right-6 z-40 sm:hidden">
              <button
                type="button"
                onClick={() => {
                  setEditingColaborador(null);
                  setFormColaborador({
                    tipo: "titular",
                    nomeCompleto: "",
                    cpf: "",
                    dataNascimento: "",
                    nomeMae: "",
                    dataAdmissao: "",
                    email: "",
                    telefone: "",
                    titularVinculado: "",
                    parentesco: "",
                    status: "ativo",
                  });
                  setShowModalColaborador(true);
                }}
                className="px-4 py-3 bg-forest text-white hover:bg-forest/90 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ring-4 ring-sun/30"
                title="Inclusão Manual de Colaborador"
              >
                <Plus className="w-4 h-4 text-sun" />
                <span>+ Inclusão Manual</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 3: FATURAMENTO & MENSALIDADE PREVISTA */}
        {/* ========================================================================= */}
        {activeTab === "faturamento" && (
          <div className="space-y-6">
            {/* Header de Controle de Competência e Ações */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-soft shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                    <Receipt className="w-5 h-5" />
                  </span>
                  <div>
                    <h2 className="font-serif text-base sm:text-lg font-bold text-forest">
                      Gestão de Faturamento & Mensalidade
                    </h2>
                    <p className="text-[11px] text-forest/70 mt-0.5">
                      Transparência integral com cálculo em tempo real de vidas ativas e histórico auditado.
                    </p>
                  </div>
                </div>
              </div>

              {/* Seletor de Competência e Botão Emitir Espelho */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                <div className="flex items-center gap-1.5 bg-warm px-3 py-1.5 rounded-xl border border-soft">
                  <Calendar className="w-3.5 h-3.5 text-forest/60" />
                  <span className="text-[11px] font-bold text-forest/70">Competência:</span>
                  <select
                    value={competenciaFaturaSelecionada}
                    onChange={(e) => setCompetenciaFaturaSelecionada(e.target.value)}
                    className="bg-transparent text-forest font-extrabold text-xs outline-none cursor-pointer"
                  >
                    <option value="atual">
                      ✨ {faturamentoAtualCalculado.competencia} (Mês Atual - Ao Vivo)
                    </option>
                    {(faturamentoConfig.historicoFaturas || []).map((fat) => (
                      <option key={fat.id} value={fat.id}>
                        📁 {fat.competencia} (Fechado - R$ {fat.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}) {fat.status === "pago" ? "✅" : "⏳"}
                      </option>
                    ))}
                  </select>
                </div>

                {competenciaFaturaSelecionada === "atual" && (
                  <button
                    type="button"
                    onClick={() => setShowNovoServicoModal(true)}
                    className="px-3 py-1.5 bg-white hover:bg-warm border border-soft text-forest rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-700" />
                    <span>+ Lançar Evento/Serviço</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setFaturaParaVisualizar(faturaExibida as FaturaHistoricoItem);
                    setShowFaturaEspelhoModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-forest text-white hover:bg-forest/90 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-sun" />
                  <span>Emitir Espelho da Fatura (PDF)</span>
                </button>
              </div>
            </div>

            {/* Banner Informativo se for Mês Ao Vivo vs Fechamento Congelado */}
            {competenciaFaturaSelecionada === "atual" ? (
              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-950 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <p>
                    <strong>Competência em Aberto (Cálculo em Tempo Real):</strong> O valor abaixo atualiza automaticamente conforme inclusões ou desligamentos no quadro de vidas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleFecharFaturaMesAtual}
                  disabled={isFechandoFatura}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Gera uma fotografia imutável para prestação de contas contábil e arquiva a competência"
                >
                  <Lock className="w-3 h-3 text-sun" />
                  <span>{isFechandoFatura ? "Fechando..." : "Fechar & Congelar Fatura do Mês"}</span>
                </button>
              </div>
            ) : (
              <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-blue-950 flex-wrap">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-700" />
                  <p>
                    <strong>Competência Fechada & Auditada ({faturaExibida.competencia}):</strong> Snapshot registrado e congelado em {"dataFechamento" in faturaExibida && faturaExibida.dataFechamento ? new Date(faturaExibida.dataFechamento).toLocaleDateString("pt-BR") : "data de fechamento"}.
                  </p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                  faturaExibida.status === "pago"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : "bg-amber-100 text-amber-800 border-amber-300"
                }`}>
                  {faturaExibida.status === "pago" ? "✅ Liquidado / Pago" : "🟡 Faturado / Em Aberto"}
                </span>
              </div>
            )}

            {/* Grid dos 4 Cards Principais da Fatura */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Valor Total da Mensalidade */}
              <div className="bg-white p-5 rounded-2xl border border-soft shadow-xs flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-forest/60 uppercase tracking-wider">
                    {competenciaFaturaSelecionada === "atual" ? "Previsão do Mês" : "Valor Fechado"}
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-black text-forest">
                    R$ {faturaExibida.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-[10px] text-forest/70 mt-1">
                    Vencimento previsto: <strong className="text-forest font-bold">{faturaExibida.dataVencimento}</strong>
                  </p>
                </div>
              </div>

              {/* Card 2: Base de Vidas */}
              <div className="bg-white p-5 rounded-2xl border border-soft shadow-xs flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-forest/60 uppercase tracking-wider">Base de Vidas</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-forest">{faturaExibida.quantidadeVidasFechamento}</span>
                    <span className="text-xs text-forest/60">× R$ {(faturaExibida.valorPorVida || 18).toFixed(2)}/vida</span>
                  </div>
                  <p className="text-[10px] text-forest/70 mt-1">
                    Subtotal vidas: <strong className="text-forest">R$ {faturaExibida.subtotalVidas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                  </p>
                </div>
              </div>

              {/* Card 3: Serviços Adicionais */}
              <div className="bg-white p-5 rounded-2xl border border-soft shadow-xs flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-forest/60 uppercase tracking-wider">Serviços Adicionais</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-forest">
                    R$ {(faturaExibida.totalServicosAdicionais || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-[10px] text-forest/70 mt-1">
                    {(faturaExibida.servicosAdicionais || []).length} evento(s) ou ajuste(s)
                  </p>
                </div>
              </div>

              {/* Card 4: Pagamento PIX */}
              <div className="bg-white p-5 rounded-2xl border border-soft shadow-xs flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-forest/60 uppercase tracking-wider">Pagamento Direto</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handleCopiarPix}
                    className="w-full py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Copy className="w-3.5 h-3.5 text-purple-700" />
                    <span>Copiar Chave PIX</span>
                  </button>
                  <p className="text-[10px] text-forest/60 text-center mt-1 truncate">
                    {faturamentoConfig.chavePix}
                  </p>
                </div>
              </div>
            </div>

            {/* Grid: Extrato Analítico e Histórico de Faturas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Extrato Analítico dos Itens da Competência */}
              <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl border border-soft shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-soft">
                  <div>
                    <h3 className="font-serif text-base font-bold text-forest flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-forest/70" />
                      <span>Demonstrativo Analítico — Competência {faturaExibida.competencia}</span>
                    </h3>
                    <p className="text-[11px] text-forest/60 mt-0.5">
                      Detalhamento de todos os itens e serviços que compõem o valor deste período.
                    </p>
                  </div>
                  {competenciaFaturaSelecionada === "atual" && (
                    <button
                      type="button"
                      onClick={() => setShowNovoServicoModal(true)}
                      className="px-2.5 py-1 bg-warm hover:bg-forest hover:text-white text-forest text-[11px] font-bold rounded-lg border border-soft transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Adicionar Item
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-warm/60 font-bold text-[11px] uppercase text-forest/80 border-b border-soft">
                      <tr>
                        <th className="p-3">Descrição do Serviço / Rubrica</th>
                        <th className="p-3 text-center">Qtd / Base</th>
                        <th className="p-3 text-right">Valor Unitário</th>
                        <th className="p-3 text-right">Total (R$)</th>
                        {competenciaFaturaSelecionada === "atual" && <th className="p-3 text-center">Ações</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-soft">
                      {/* Linha 1: Vidas Ativas */}
                      <tr className="hover:bg-warm/20">
                        <td className="p-3">
                          <div className="font-bold text-forest">Mensalidade Programa AcolheMente</div>
                          <span className="text-[10px] text-forest/60">
                            Cuidado contínuo em saúde mental para colaboradores e dependentes
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-forest">
                          {faturaExibida.quantidadeVidasFechamento} vidas
                        </td>
                        <td className="p-3 text-right font-mono text-forest/80">
                          R$ {(faturaExibida.valorPorVida || 18).toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-bold font-mono text-forest">
                          R$ {faturaExibida.subtotalVidas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        {competenciaFaturaSelecionada === "atual" && (
                          <td className="p-3 text-center text-forest/30 text-[10px] italic">Base Folha</td>
                        )}
                      </tr>

                      {/* Linhas de Serviços Adicionais */}
                      {(faturaExibida.servicosAdicionais || []).map((serv) => {
                        const qtd = Number(serv.quantidade) || 1;
                        const val = Number(serv.valorUnitario) || 0;
                        const sub = serv.tipo === "desconto" ? -(qtd * val) : qtd * val;
                        return (
                          <tr key={serv.id} className="hover:bg-warm/20">
                            <td className="p-3">
                              <div className="font-bold text-forest flex items-center gap-1.5">
                                {serv.tipo === "desconto" ? (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[10px] font-extrabold uppercase">
                                    Desconto / Ajuste
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-900 text-[10px] font-extrabold uppercase">
                                    Serviço Extra
                                  </span>
                                )}
                                <span>{serv.descricao}</span>
                              </div>
                              {serv.data && (
                                <span className="text-[10px] text-forest/60">
                                  Realizado/Lançado em: {serv.data}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center font-bold text-forest">{qtd}x</td>
                            <td className="p-3 text-right font-mono text-forest/80">
                              R$ {val.toFixed(2)}
                            </td>
                            <td className={`p-3 text-right font-bold font-mono ${serv.tipo === "desconto" ? "text-amber-800" : "text-forest"}`}>
                              {serv.tipo === "desconto" ? "- " : ""}R$ {Math.abs(sub).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </td>
                            {competenciaFaturaSelecionada === "atual" && (
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoverServicoAdicional(serv.id)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Remover serviço adicional"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-warm/60 font-bold border-t-2 border-forest">
                      <tr>
                        <td colSpan={3} className="p-3 text-right uppercase text-forest">
                          Total Líquido da Fatura:
                        </td>
                        <td className="p-3 text-right text-base text-forest font-black font-mono">
                          R$ {faturaExibida.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        {competenciaFaturaSelecionada === "atual" && <td></td>}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Histórico das Competências Fechadas */}
              <div className="bg-white p-5 rounded-2xl border border-soft shadow-xs space-y-4">
                <h3 className="font-serif text-base font-bold text-forest flex items-center gap-2 pb-2 border-b border-soft">
                  <Calendar className="w-4 h-4 text-forest/70" />
                  <span>Histórico de Fechamentos</span>
                </h3>

                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                  {(faturamentoConfig.historicoFaturas || []).length === 0 ? (
                    <div className="text-center p-6 bg-warm/30 rounded-xl border border-dashed border-soft text-forest/60 text-xs">
                      <p className="font-semibold">Nenhuma competência anterior arquivada ainda.</p>
                      <p className="text-[11px] mt-1 text-forest/50">
                        Ao fechar o mês atual, a fotografia imutável ficará registrada aqui.
                      </p>
                    </div>
                  ) : (
                    (faturamentoConfig.historicoFaturas || []).map((fat) => (
                      <div
                        key={fat.id}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          competenciaFaturaSelecionada === fat.id
                            ? "bg-forest text-white border-forest shadow-xs"
                            : "bg-warm/30 hover:bg-warm/60 border-soft text-forest"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-xs">Competência {fat.competencia}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                              fat.status === "pago"
                                ? "bg-emerald-100 text-emerald-900"
                                : "bg-amber-100 text-amber-900"
                            }`}>
                              {fat.status === "pago" ? "Pago" : "Aberto"}
                            </span>
                          </div>
                          <span className={`text-[10px] block mt-0.5 ${competenciaFaturaSelecionada === fat.id ? "text-white/80" : "text-forest/60"}`}>
                            {fat.quantidadeVidasFechamento} vidas • Venc: {fat.dataVencimento}
                          </span>
                        </div>

                        <div className="text-right flex items-center gap-2">
                          <span className="font-bold text-xs font-mono">
                            R$ {fat.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setFaturaParaVisualizar(fat);
                              setShowFaturaEspelhoModal(true);
                            }}
                            className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              competenciaFaturaSelecionada === fat.id
                                ? "bg-white/20 hover:bg-white text-white hover:text-forest"
                                : "bg-white hover:bg-forest hover:text-white border border-soft text-forest"
                            }`}
                            title="Ver Espelho Desta Fatura"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 4: DADOS CADASTRAIS & CONFIGURAÇÃO DO PIN */}
        {/* ========================================================================= */}
        {activeTab === "dados" && (
          <div className="max-w-3xl space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-soft shadow-xs space-y-4">
              <h2 className="font-serif text-base sm:text-lg font-bold text-forest flex items-center gap-2 pb-2 border-b border-soft">
                <Building2 className="w-4 h-4 text-forest/70" />
                <span>Dados Cadastrais da Empresa</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-forest/70 mb-1">Nome Fantasia / Exibição</label>
                  <p className="font-semibold text-forest p-2.5 bg-warm/40 rounded-xl border border-soft">
                    {empresaAtiva?.nomeEmpresa || "—"}
                  </p>
                </div>
                <div>
                  <label className="block font-bold text-forest/70 mb-1">Razão Social</label>
                  <p className="font-semibold text-forest p-2.5 bg-warm/40 rounded-xl border border-soft">
                    {empresaAtiva?.razaoSocial || "—"}
                  </p>
                </div>
                <div>
                  <label className="block font-bold text-forest/70 mb-1">CNPJ</label>
                  <p className="font-semibold text-forest p-2.5 bg-warm/40 rounded-xl border border-soft font-mono">
                    {empresaAtiva?.cnpj || "—"}
                  </p>
                </div>
                <div>
                  <label className="block font-bold text-forest/70 mb-1">Responsável RH</label>
                  <p className="font-semibold text-forest p-2.5 bg-warm/40 rounded-xl border border-soft">
                    {empresaAtiva?.nomeResponsavel || empresaAtiva?.contatoNome || "—"}
                  </p>
                </div>
                <div>
                  <label className="block font-bold text-forest/70 mb-1">Email de Contato</label>
                  <p className="font-semibold text-forest p-2.5 bg-warm/40 rounded-xl border border-soft">
                    {empresaAtiva?.email || "—"}
                  </p>
                </div>
                <div>
                  <label className="block font-bold text-forest/70 mb-1">Telefone / WhatsApp</label>
                  <p className="font-semibold text-forest p-2.5 bg-warm/40 rounded-xl border border-soft">
                    {empresaAtiva?.telefone || "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Configuração do PIN de Segurança do RH */}
            <div className="bg-white p-5 rounded-2xl border border-soft shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-soft">
                <h2 className="font-serif text-base font-bold text-forest flex items-center gap-2">
                  <Lock className="w-4 h-4 text-forest/70" />
                  <span>PIN de Segurança do RH / Canal</span>
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  Proteção LGPD
                </span>
              </div>

              <p className="text-xs text-forest/70 leading-relaxed">
                O PIN de 4 a 6 dígitos impede acessos não autorizados aos indicadores e colaboradores da sua empresa. Você pode alterar seu PIN a qualquer momento:
              </p>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const targetPin = (e.currentTarget.elements.namedItem("novoPin") as HTMLInputElement)?.value;
                  if (!targetPin || targetPin.length < 4) {
                    showToast("O PIN deve ter entre 4 e 6 dígitos.", "error");
                    return;
                  }
                  try {
                    await updateDoc(doc(db, "empresa_leads", empresaAtiva.id), {
                      pinAcessoRH: targetPin.trim(),
                    });
                    setEmpresaAtiva((prev: any) => ({ ...prev, pinAcessoRH: targetPin.trim() }));
                    showToast("PIN de segurança atualizado com sucesso!", "success");
                  } catch (err) {
                    console.error(err);
                    showToast("Erro ao atualizar PIN.", "error");
                  }
                }}
                className="flex items-center gap-2 max-w-sm"
              >
                <input
                  type="text"
                  name="novoPin"
                  maxLength={6}
                  defaultValue={empresaAtiva?.pinAcessoRH || ""}
                  placeholder="Novo PIN (ex: 1234)"
                  className="flex-1 px-3 py-2 bg-warm/40 border border-soft focus:border-forest rounded-xl text-xs font-mono text-forest outline-none"
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-forest text-white hover:bg-forest/90 font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
                >
                  Salvar PIN
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL: ADICIONAR / EDITAR COLABORADOR OU DEPENDENTE */}
      {/* ========================================================================= */}
      {showModalColaborador && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-soft shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-soft">
              <h3 className="font-serif text-base font-bold text-forest flex items-center gap-2">
                <Users className="w-4 h-4 text-forest/70" />
                <span>{editingColaborador ? "Editar Cadastro de Vida" : "Cadastrar Novo Colaborador ou Dependente"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowModalColaborador(false)}
                className="p-1 hover:bg-warm rounded-lg text-forest/50 hover:text-forest"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSalvarColaborador} className="space-y-3 text-xs">
              {/* Tipo */}
              <div>
                <label className="block font-bold text-forest mb-1">Tipo de Cadastro</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormColaborador({ ...formColaborador, tipo: "titular" })}
                    className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                      formColaborador.tipo === "titular"
                        ? "bg-blue-600 text-white border-blue-700 shadow-2xs"
                        : "bg-warm/40 text-forest/70 border-soft"
                    }`}
                  >
                    Titular (Colaborador)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormColaborador({ ...formColaborador, tipo: "dependente" })}
                    className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                      formColaborador.tipo === "dependente"
                        ? "bg-purple-600 text-white border-purple-700 shadow-2xs"
                        : "bg-warm/40 text-forest/70 border-soft"
                    }`}
                  >
                    Dependente (Familiar)
                  </button>
                </div>
              </div>

              {/* Nome Completo */}
              <div>
                <label className="block font-bold text-forest mb-1">Nome Completo *</label>
                <input
                  type="text"
                  value={formColaborador.nomeCompleto || ""}
                  onChange={(e) => setFormColaborador({ ...formColaborador, nomeCompleto: e.target.value })}
                  placeholder="Nome do colaborador ou dependente"
                  className="w-full px-3 py-2 bg-warm/30 border border-soft focus:border-forest rounded-xl outline-none"
                  required
                />
              </div>

              {/* CPF e Nascimento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-forest mb-1">CPF *</label>
                  <input
                    type="text"
                    value={formColaborador.cpf || ""}
                    onChange={(e) => setFormColaborador({ ...formColaborador, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 bg-warm/30 border border-soft focus:border-forest rounded-xl outline-none font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-forest mb-1">Data de Nascimento</label>
                  <input
                    type="date"
                    value={formColaborador.dataNascimento || ""}
                    onChange={(e) => setFormColaborador({ ...formColaborador, dataNascimento: e.target.value })}
                    className="w-full px-3 py-2 bg-warm/30 border border-soft focus:border-forest rounded-xl outline-none"
                  />
                </div>
              </div>

              {/* Cargo e Faixa Salarial (apenas para Titular) */}
              {formColaborador.tipo !== "dependente" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-blue-50/60 rounded-xl border border-blue-200">
                  <div>
                    <label className="block font-bold text-blue-950 mb-1">Cargo / Função (Titular)</label>
                    <input
                      type="text"
                      value={formColaborador.cargo || ""}
                      onChange={(e) => setFormColaborador({ ...formColaborador, cargo: e.target.value })}
                      placeholder="Ex: Analista de RH, Gerente, Motorista..."
                      className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-lg outline-none focus:border-forest text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-blue-950 mb-1">Faixa Salarial (Titular)</label>
                    <input
                      type="text"
                      list="faixas-salariais-list"
                      value={formColaborador.faixaSalarial || ""}
                      onChange={(e) => setFormColaborador({ ...formColaborador, faixaSalarial: e.target.value })}
                      placeholder="Ex: R$ 3.001 a R$ 5.000"
                      className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-lg outline-none focus:border-forest text-xs"
                    />
                    <datalist id="faixas-salariais-list">
                      <option value="Até R$ 2.000" />
                      <option value="R$ 2.001 a R$ 3.500" />
                      <option value="R$ 3.501 a R$ 5.000" />
                      <option value="R$ 5.001 a R$ 8.000" />
                      <option value="R$ 8.001 a R$ 12.000" />
                      <option value="Acima de R$ 12.000" />
                    </datalist>
                  </div>
                </div>
              )}

              {/* Se Dependente: Titular Vinculado e Grau de Parentesco */}
              {formColaborador.tipo === "dependente" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-purple-50/60 rounded-xl border border-purple-200">
                  <div>
                    <label className="block font-bold text-purple-900 mb-1">Titular Vinculado (Nome ou CPF)</label>
                    <input
                      type="text"
                      value={formColaborador.titularVinculado || ""}
                      onChange={(e) => setFormColaborador({ ...formColaborador, titularVinculado: e.target.value })}
                      placeholder="Nome do colaborador titular"
                      className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-purple-900 mb-1">Grau de Parentesco</label>
                    <select
                      value={formColaborador.parentesco || ""}
                      onChange={(e) => setFormColaborador({ ...formColaborador, parentesco: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg outline-none"
                    >
                      <option value="">Selecione...</option>
                      <option value="Cônjuge">Cônjuge / Companheiro(a)</option>
                      <option value="Filho(a)">Filho(a)</option>
                      <option value="Enteado(a)">Enteado(a)</option>
                      <option value="Pai / Mãe">Pai / Mãe</option>
                      <option value="Outro">Outro Dependente Legal</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Email e Telefone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-forest mb-1">Email</label>
                  <input
                    type="email"
                    value={formColaborador.email || ""}
                    onChange={(e) => setFormColaborador({ ...formColaborador, email: e.target.value })}
                    placeholder="email@empresa.com"
                    className="w-full px-3 py-2 bg-warm/30 border border-soft focus:border-forest rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-forest mb-1">Telefone / Celular</label>
                  <input
                    type="text"
                    value={formColaborador.telefone || ""}
                    onChange={(e) => setFormColaborador({ ...formColaborador, telefone: e.target.value })}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3 py-2 bg-warm/30 border border-soft focus:border-forest rounded-xl outline-none"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block font-bold text-forest mb-1">Status do Benefício</label>
                <select
                  value={formColaborador.status || "ativo"}
                  onChange={(e) => setFormColaborador({ ...formColaborador, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-warm/30 border border-soft focus:border-forest rounded-xl outline-none"
                >
                  <option value="ativo">Ativo (Acesso Liberado)</option>
                  <option value="desligado">Desligado (Turnover)</option>
                  <option value="inativo">Inativo Temporário</option>
                </select>
              </div>

              {/* Botões */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-soft">
                <button
                  type="button"
                  onClick={() => setShowModalColaborador(false)}
                  className="px-3 py-2 rounded-xl text-forest/70 hover:bg-warm font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-forest text-white hover:bg-forest/90 font-bold rounded-xl shadow-2xs transition-all cursor-pointer"
                >
                  Salvar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RECONCILIAÇÃO DE TURNOVER VIA UPLOAD DE PLANILHA */}
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
                  Planilha lida com {parsedRows.length} linhas. Compare o impacto antes de confirmar a atualização:
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
                  id="chkDesligar"
                  checked={desligarAusentes}
                  onChange={(e) => setDesligarAusentes(e.target.checked)}
                  className="mt-0.5 rounded cursor-pointer text-forest"
                />
                <label htmlFor="chkDesligar" className="text-xs text-forest cursor-pointer">
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

      {/* ========================================================================= */}
      {/* MODAL: VISUALIZAÇÃO E IMPRESSÃO DE RELATÓRIO MENSAL EXECUTIVO */}
      {/* ========================================================================= */}
      {showRelatorioModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-soft shadow-2xl max-w-3xl w-full p-6 sm:p-8 space-y-6 max-h-[95vh] overflow-y-auto print:p-0 print:border-none print:shadow-none animate-in fade-in">
            {/* Barra de Ações do Relatório */}
            <div className="flex items-center justify-between pb-3 border-b border-soft print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-forest" />
                <h3 className="font-serif text-base font-bold text-forest">
                  Relatório Mensal Executivo ({MESES_ANO.find((m) => m.valor === mesSelecionado)?.nome} / {anoSelecionado})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-forest text-white hover:bg-forest/90 font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-sun" />
                  <span>Imprimir / Salvar PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowRelatorioModal(false)}
                  className="p-1.5 hover:bg-warm rounded-lg text-forest/50 hover:text-forest"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Conteúdo Imprimível do Relatório */}
            <div className="space-y-6 text-forest">
              {/* Cabeçalho Timbrado */}
              <div className="flex items-center justify-between border-b-2 border-forest pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-sun/20 border border-sun/40 flex items-center justify-center overflow-hidden">
                    <img src={logoImage} alt="AcolheMente" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h2 className="font-serif text-lg font-bold text-forest">AcolheMente Saúde Mental</h2>
                    <p className="text-[11px] text-forest/70">Relatório Mensal de Gestão & Cuidado Psicológico</p>
                  </div>
                </div>
                <div className="text-right text-xs">
                  <span className="font-bold block text-forest">Período de Referência:</span>
                  <span className="font-semibold text-emerald-800">
                    {MESES_ANO.find((m) => m.valor === mesSelecionado)?.nome} de {anoSelecionado}
                  </span>
                </div>
              </div>

              {/* Dados da Empresa */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-warm/40 p-4 rounded-2xl border border-soft text-xs">
                <div>
                  <span className="text-[10px] text-forest/60 block font-bold uppercase">Empresa Parceira</span>
                  <span className="font-bold text-forest block truncate">{empresaAtiva?.nomeEmpresa || empresaAtiva?.razaoSocial}</span>
                </div>
                <div>
                  <span className="text-[10px] text-forest/60 block font-bold uppercase">CNPJ</span>
                  <span className="font-mono text-forest block">{empresaAtiva?.cnpj || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-forest/60 block font-bold uppercase">Vidas Contratadas</span>
                  <span className="font-bold text-forest block">{vidasContratadasNum} vidas</span>
                </div>
                <div>
                  <span className="text-[10px] text-forest/60 block font-bold uppercase">Vidas Ativas no Mês</span>
                  <span className="font-bold text-emerald-800 block">{vidasCadastradasAtivas} cadastradas</span>
                </div>
              </div>

              {/* Quadro Resumo de Métricas Quantitativas */}
              <div>
                <h4 className="font-serif text-sm font-bold text-forest mb-2">1. Indicadores de Utilização e Adesão</h4>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-white border border-soft rounded-xl shadow-2xs">
                    <span className="text-2xl font-bold text-forest block">{atendimentosMes.length}</span>
                    <span className="text-[11px] font-semibold text-forest/70">Acolhimentos no Mês</span>
                  </div>
                  <div className="p-3 bg-white border border-soft rounded-xl shadow-2xs">
                    <span className="text-2xl font-bold text-emerald-800 block">{taxaAdesaoPercent}%</span>
                    <span className="text-[11px] font-semibold text-forest/70">Taxa de Adesão</span>
                  </div>
                  <div className="p-3 bg-white border border-soft rounded-xl shadow-2xs">
                    <span className="text-2xl font-bold text-forest block">{desfechosAnonimos.concluidosAltas}</span>
                    <span className="text-[11px] font-semibold text-forest/70">Altas / Conclusões</span>
                  </div>
                </div>
              </div>

              {/* Distribuição de Desfechos Anônimos */}
              <div>
                <h4 className="font-serif text-sm font-bold text-forest mb-2">2. Desfechos & Acompanhamento Psicológico</h4>
                <table className="w-full text-xs text-left border border-soft rounded-xl overflow-hidden">
                  <thead className="bg-warm/60 font-bold text-[11px] uppercase">
                    <tr>
                      <th className="p-2.5">Fase Terapêutica</th>
                      <th className="p-2.5 text-center">Total de Colaboradores</th>
                      <th className="p-2.5 text-right">% do Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-soft">
                    <tr>
                      <td className="p-2.5 font-semibold">Em Acompanhamento Terapêutico Contínuo</td>
                      <td className="p-2.5 text-center font-bold">{desfechosAnonimos.emAtendimento}</td>
                      <td className="p-2.5 text-right">
                        {atendimentosMes.length > 0
                          ? Math.round((desfechosAnonimos.emAtendimento / atendimentosMes.length) * 100)
                          : 0}
                        %
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold">Conclusões com Alta Terapêutica / Objetivos Atingidos</td>
                      <td className="p-2.5 text-center font-bold text-emerald-800">{desfechosAnonimos.concluidosAltas}</td>
                      <td className="p-2.5 text-right">
                        {atendimentosMes.length > 0
                          ? Math.round((desfechosAnonimos.concluidosAltas / atendimentosMes.length) * 100)
                          : 0}
                        %
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-semibold">Em Fase de Acolhimento / Triagem Inicial</td>
                      <td className="p-2.5 text-center font-bold text-amber-700">{desfechosAnonimos.emTriagem}</td>
                      <td className="p-2.5 text-right">
                        {atendimentosMes.length > 0
                          ? Math.round((desfechosAnonimos.emTriagem / atendimentosMes.length) * 100)
                          : 0}
                        %
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Declaração de Conformidade & Assinatura */}
              <div className="pt-4 border-t border-soft space-y-4">
                <p className="text-[10px] text-forest/70 leading-relaxed italic text-center">
                  "Este relatório consolida dados epidemiológicos e operacionais para suporte à gestão de pessoas da empresa conveniada, cumprindo integralmente os preceitos de sigilo do Código de Ética Profissional do Psicólogo e da LGPD (Lei 13.709/2018)."
                </p>

                <div className="flex justify-between items-end pt-6">
                  <div className="text-center text-xs">
                    <div className="w-48 border-b border-forest/40 pb-1 mb-1 mx-auto"></div>
                    <span className="font-bold block text-forest">Gestão de Convênios Corporativos</span>
                    <span className="text-[10px] text-forest/60">AcolheMente Saúde Mental</span>
                  </div>

                  <div className="text-center text-xs">
                    <div className="w-48 border-b border-forest/40 pb-1 mb-1 mx-auto"></div>
                    <span className="font-bold block text-forest">{empresaAtiva?.nomeResponsavel || "Responsável pelo RH"}</span>
                    <span className="text-[10px] text-forest/60">{empresaAtiva?.nomeEmpresa || empresaAtiva?.razaoSocial}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: LANÇAR NOVO SERVIÇO OU EVENTO ADICIONAL */}
      {/* ========================================================================= */}
      {showNovoServicoModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-soft shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-soft">
              <h3 className="font-serif text-base font-bold text-forest flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sun" />
                <span>Lançar Evento ou Serviço Adicional</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNovoServicoModal(false)}
                className="p-1 hover:bg-warm rounded-lg text-forest/50 hover:text-forest"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdicionarServicoAdicional} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-forest mb-1">Tipo de Lançamento</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNovoServicoForm({ ...novoServicoForm, tipo: "servico" })}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all text-center cursor-pointer ${
                      novoServicoForm.tipo === "servico"
                        ? "bg-forest text-white border-forest shadow-2xs"
                        : "bg-warm/40 text-forest border-soft hover:bg-warm"
                    }`}
                  >
                    + Serviço / Evento
                  </button>
                  <button
                    type="button"
                    onClick={() => setNovoServicoForm({ ...novoServicoForm, tipo: "desconto" })}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all text-center cursor-pointer ${
                      novoServicoForm.tipo === "desconto"
                        ? "bg-amber-700 text-white border-amber-700 shadow-2xs"
                        : "bg-warm/40 text-forest border-soft hover:bg-warm"
                    }`}
                  >
                    - Desconto / Ajuste
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-forest mb-1">Descrição / Rubrica *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Palestra Setembro Amarelo, Plantão Psicológico Extra..."
                  value={novoServicoForm.descricao || ""}
                  onChange={(e) => setNovoServicoForm({ ...novoServicoForm, descricao: e.target.value })}
                  className="w-full px-3 py-2 bg-warm/30 border border-soft focus:border-forest rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-forest mb-1">Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={novoServicoForm.quantidade || 1}
                    onChange={(e) => setNovoServicoForm({ ...novoServicoForm, quantidade: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-warm/30 border border-soft focus:border-forest rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-forest mb-1">Valor Unitário (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={novoServicoForm.valorUnitario || ""}
                    onChange={(e) => setNovoServicoForm({ ...novoServicoForm, valorUnitario: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-warm/30 border border-soft focus:border-forest rounded-xl outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-forest mb-1">Data de Realização</label>
                <input
                  type="date"
                  value={novoServicoForm.data || new Date().toISOString().split("T")[0]}
                  onChange={(e) => setNovoServicoForm({ ...novoServicoForm, data: e.target.value })}
                  className="w-full px-3 py-2 bg-warm/30 border border-soft focus:border-forest rounded-xl outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-soft">
                <button
                  type="button"
                  onClick={() => setShowNovoServicoModal(false)}
                  className="px-3 py-2 rounded-xl text-forest/70 hover:bg-warm font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-forest text-white hover:bg-forest/90 font-bold rounded-xl shadow-2xs transition-all cursor-pointer"
                >
                  Confirmar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ESPELHO DA FATURA & DEMONSTRATIVO FINANCEIRO (IMPRIMÍVEL / PDF) */}
      {/* ========================================================================= */}
      {showFaturaEspelhoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-soft shadow-2xl max-w-3xl w-full p-6 sm:p-8 space-y-6 max-h-[95vh] overflow-y-auto print:max-h-none print:shadow-none print:border-none print:p-0">
            {/* Barra de Ações do Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-soft print:hidden">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-forest" />
                <h3 className="font-serif text-base font-bold text-forest">
                  Espelho da Fatura — Competência {faturaParaVisualizar?.competencia || faturamentoAtualCalculado.competencia}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-forest text-white hover:bg-forest/90 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-sun" />
                  <span>Imprimir / Salvar PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowFaturaEspelhoModal(false)}
                  className="p-1.5 hover:bg-warm rounded-lg text-forest/60 hover:text-forest transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* DOCUMENTO OFICIAL DA FATURA / DEMONSTRATIVO */}
            <div className="space-y-6 text-forest">
              {/* Topo Timbrado */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b-2 border-forest">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-sun/20 border border-sun/40 flex items-center justify-center overflow-hidden shrink-0">
                    <img src={logoImage} alt="AcolheMente" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h1 className="font-serif text-xl font-bold text-forest">Rede AcolheMente Saúde Mental</h1>
                    <p className="text-xs text-forest/70">Gestão e Cuidado Psicológico Contínuo Corporativo</p>
                    <span className="text-[10px] text-forest/60 font-mono">CNPJ: 45.892.120/0001-34 • acolhemente.com.br</span>
                  </div>
                </div>

                <div className="text-left sm:text-right text-xs bg-warm/50 sm:bg-transparent p-3 sm:p-0 rounded-xl w-full sm:w-auto">
                  <span className="font-bold block text-forest uppercase tracking-wider text-[10px]">
                    DEMONSTRATIVO DE MENSALIDADE
                  </span>
                  <div className="text-sm font-extrabold text-forest mt-0.5">
                    Competência: {faturaParaVisualizar?.competencia || faturamentoAtualCalculado.competencia}
                  </div>
                  <span className="text-[11px] text-forest/70 block mt-0.5">
                    Vencimento: <strong className="text-forest">{faturaParaVisualizar?.dataVencimento || faturamentoAtualCalculado.dataVencimento}</strong>
                  </span>
                </div>
              </div>

              {/* Dados do Tomador (Empresa Conveniada) */}
              <div className="bg-warm/40 p-4 rounded-2xl border border-soft grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-forest/60 font-bold uppercase block">Empresa Contratante</span>
                  <span className="font-bold text-forest block text-sm">
                    {empresaAtiva?.razaoSocial || empresaAtiva?.nomeEmpresa}
                  </span>
                  <span className="text-[11px] text-forest/70 font-mono block mt-0.5">
                    CNPJ: {empresaAtiva?.cnpj || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-forest/60 font-bold uppercase block">Contato RH / Responsável</span>
                  <span className="font-semibold text-forest block">
                    {empresaAtiva?.nomeResponsavel || empresaAtiva?.contatoNome || "Gestão de Pessoas / RH"}
                  </span>
                  <span className="text-[11px] text-forest/70 block mt-0.5 truncate">
                    {empresaAtiva?.email || "—"} • {empresaAtiva?.telefone || "—"}
                  </span>
                </div>
              </div>

              {/* Tabela de Discriminação dos Serviços */}
              <div>
                <h4 className="font-serif text-sm font-bold text-forest mb-2">Discriminação dos Serviços e Encargos</h4>
                <table className="w-full text-xs text-left border border-soft rounded-xl overflow-hidden">
                  <thead className="bg-warm/70 font-bold text-[11px] uppercase text-forest border-b border-soft">
                    <tr>
                      <th className="p-3">Item / Rubrica</th>
                      <th className="p-3 text-center">Quantidade</th>
                      <th className="p-3 text-right">Valor Unitário</th>
                      <th className="p-3 text-right">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-soft">
                    <tr>
                      <td className="p-3">
                        <div className="font-bold text-forest">Plano Corporativo de Saúde Mental AcolheMente</div>
                        <div className="text-[10px] text-forest/70">
                          Cobertura contínua para {faturaParaVisualizar?.quantidadeVidasFechamento || faturamentoAtualCalculado.quantidadeVidasFechamento} vidas ativas
                          ({faturaParaVisualizar?.quantidadeTitulares || totalTitulares} titulares e {faturaParaVisualizar?.quantidadeDependentes || totalDependentes} dependentes)
                        </div>
                      </td>
                      <td className="p-3 text-center font-bold">
                        {faturaParaVisualizar?.quantidadeVidasFechamento || faturamentoAtualCalculado.quantidadeVidasFechamento} vidas
                      </td>
                      <td className="p-3 text-right font-mono">
                        R$ {((faturaParaVisualizar?.valorPorVida || faturamentoConfig.valorPorVida) || 18).toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-bold font-mono">
                        R$ {(faturaParaVisualizar?.subtotalVidas || faturamentoAtualCalculado.subtotalVidas).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>

                    {/* Serviços Adicionais */}
                    {((faturaParaVisualizar?.servicosAdicionais || faturamentoAtualCalculado.servicosAdicionais) || []).map((serv: any) => {
                      const qtd = Number(serv.quantidade) || 1;
                      const val = Number(serv.valorUnitario) || 0;
                      const sub = serv.tipo === "desconto" ? -(qtd * val) : (qtd * val);
                      return (
                        <tr key={serv.id}>
                          <td className="p-3">
                            <div className="font-semibold text-forest">
                              {serv.tipo === "desconto" ? "[Desconto / Ajuste] " : "[Serviço Extra] "}
                              {serv.descricao}
                            </div>
                            {serv.data && (
                              <div className="text-[10px] text-forest/60">Data: {serv.data}</div>
                            )}
                          </td>
                          <td className="p-3 text-center font-medium">{qtd}</td>
                          <td className="p-3 text-right font-mono">R$ {val.toFixed(2)}</td>
                          <td className={`p-3 text-right font-bold font-mono ${serv.tipo === "desconto" ? "text-amber-800" : ""}`}>
                            {serv.tipo === "desconto" ? "- " : ""}R$ {Math.abs(sub).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-warm/70 border-t-2 border-forest font-bold">
                    <tr>
                      <td colSpan={3} className="p-3 text-right uppercase text-xs">
                        Valor Líquido a Pagar:
                      </td>
                      <td className="p-3 text-right text-base font-black font-mono text-forest">
                        R$ {(faturaParaVisualizar?.valorTotal || faturamentoAtualCalculado.valorTotal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Instruções para Pagamento PIX e Bancário */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-purple-50/70 border border-purple-200 p-4 rounded-2xl text-xs">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">
                    Instruções para Liquidação
                  </span>
                  <p className="text-[11px] text-purple-950 leading-relaxed">
                    Pagamento via Chave PIX ou Transferência Bancária até a data de vencimento. Envie o comprovante para <strong>financeiro@acolhemente.com.br</strong>.
                  </p>
                  <div className="pt-1">
                    <span className="text-[10px] text-purple-800 block font-semibold">Chave PIX:</span>
                    <span className="font-mono font-bold text-purple-950 select-all block bg-white px-2 py-1 rounded border border-purple-200">
                      {faturamentoConfig.chavePix}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 text-purple-950">
                  <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">
                    Favorecido
                  </span>
                  <span className="font-semibold block">{faturamentoConfig.favorecidoPix}</span>
                  <span className="text-[11px] block text-purple-800">Banco: Instituição Bancária Integrada</span>
                  <span className="text-[10px] text-purple-700 block mt-2 italic">
                    Documento gerado eletronicamente pelo Sistema de Gestão Corporativa AcolheMente.
                  </span>
                </div>
              </div>

              {/* Assinatura e Validação */}
              <div className="pt-6 border-t border-soft flex justify-between items-end text-xs">
                <div className="text-center">
                  <div className="w-48 border-b border-forest/40 pb-1 mb-1 mx-auto"></div>
                  <span className="font-bold block">Departamento Financeiro</span>
                  <span className="text-[10px] text-forest/60">Rede AcolheMente</span>
                </div>
                <div className="text-center">
                  <div className="w-48 border-b border-forest/40 pb-1 mb-1 mx-auto"></div>
                  <span className="font-bold block">{empresaAtiva?.nomeResponsavel || "Responsável pelo RH"}</span>
                  <span className="text-[10px] text-forest/60">{empresaAtiva?.nomeEmpresa || empresaAtiva?.razaoSocial}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
