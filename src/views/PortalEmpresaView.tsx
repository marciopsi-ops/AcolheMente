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
  addDoc,
} from "firebase/firestore";
import * as XLSX from "xlsx";
import { db } from "../lib/firebase";
import {
  Building2,
  Globe,
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
  KeyRound,
  MessageCircle,
  Info,
  DollarSign,
  CreditCard,
  Wallet,
  Receipt,
  CheckCircle,
  BookOpen,
  Send,
  HelpCircle,
  FileCheck2,
  Target,
  Zap,
  Flame,
  Compass,
  PieChart,
  UserPlus,
  Link2,
  ExternalLink,
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
  getEmpresaPin,
  ItemCatalogoCorporativo,
  getCatalogoEmpresa,
  SolicitacaoOrcamentoCorporativo,
  TEMAS_QUEIXAS_CORPORATIVAS,
  TemaQueixaItem,
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

  // Catálogo de Serviços & Intervenções NR-1 (GRO / PGR) & Solicitação de Orçamento
  const [selectedServicoParaOrcamento, setSelectedServicoParaOrcamento] = useState<ItemCatalogoCorporativo | null>(null);
  const [showModalOrcamento, setShowModalOrcamento] = useState(false);
  const [formOrcamento, setFormOrcamento] = useState({
    nomeContato: "",
    emailContato: "",
    telefoneContato: "",
    vidasEstimadas: 0,
    formato: "online" as "online" | "presencial" | "hibrido",
    urgencia: "normal" as "normal" | "alta" | "imediata",
    mensagem: "",
  });
  const [isSendingOrcamento, setIsSendingOrcamento] = useState(false);
  const [orcamentoSucesso, setOrcamentoSucesso] = useState(false);
  const [filtroCategoriaCatalogo, setFiltroCategoriaCatalogo] = useState<string>("todas");
  const [acessosCorporativos, setAcessosCorporativos] = useState<any[]>([]);

  // Helper de Toast
  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Estados para Código de Acesso do Colaborador (Exposto para o RH repassar aos colaboradores)
  const [copiedCodigoColab, setCopiedCodigoColab] = useState(false);
  const [copiedLinkColab, setCopiedLinkColab] = useState(false);
  const [copiedMsgColab, setCopiedMsgColab] = useState(false);
  const [showModalMensagemColaborador, setShowModalMensagemColaborador] = useState(false);

  // Helper para obter o Código de Acesso do Colaborador ativo
  const getCodigoColaborador = () => {
    return (empresaAtiva?.codigoAcesso || empresaPrincipal?.codigoAcesso || "").trim().toUpperCase();
  };

  const getNomeEmpresaAtiva = () => {
    return (
      empresaAtiva?.nomeEmpresa ||
      empresaAtiva?.razaoSocial ||
      empresaPrincipal?.nomeEmpresa ||
      empresaPrincipal?.razaoSocial ||
      "Nossa Empresa"
    );
  };

  const getLinkAcolhimentoColaborador = (codigo: string) => {
    return codigo
      ? `${window.location.origin}/?view=acolhimento&via=corporativo&convenio=${encodeURIComponent(codigo)}`
      : `${window.location.origin}/?view=acolhimento&via=corporativo`;
  };

  const getMensagemDivulgacaoColaborador = (empresaNome: string, codigo: string, link: string) => {
    return `Olá, time! 🎉\n\nÉ com muita alegria que informamos que a ${empresaNome} firmou parceria oficial com o Projeto AcolheMente para oferecer apoio psicológico, acolhimento e cuidado com a saúde mental a todos os nossos colaboradores e dependentes!\n\n🔑 Seu Código de Acesso Corporativo: *${codigo || "SOLICITAR-AO-RH"}*\n\n🔗 Link direto de Acolhimento Corporativo:\n${link}\n\nComo iniciar seu atendimento 100% online, humanizado e com sigilo ético absoluto:\n1. Acesse o link corporativo acima (já com o convênio preenchido);\n2. Escolha o serviço e profissional de sua preferência;\n3. Agende sua sessão com privacidade total garantida pelo Código de Ética Profissional.\n\nCuidar da sua mente e do seu bem-estar é prioridade para a nossa gestão! 💚`;
  };

  const handleCopiarCodigoColaborador = (codigo: string) => {
    if (!codigo) {
      showToast("Nenhum código configurado no momento pela Gestão AcolheMente.", "info");
      return;
    }
    navigator.clipboard.writeText(codigo);
    setCopiedCodigoColab(true);
    showToast(`Código do colaborador "${codigo}" copiado com sucesso!`, "success");
    setTimeout(() => setCopiedCodigoColab(false), 2500);
  };

  const handleCopiarLinkColaborador = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLinkColab(true);
    showToast("Link direto de acolhimento do colaborador copiado com sucesso!", "success");
    setTimeout(() => setCopiedLinkColab(false), 2500);
  };

  const handleCompartilharColaborador = async (empresaNome: string, codigo: string) => {
    const link = getLinkAcolhimentoColaborador(codigo);
    const msg = getMensagemDivulgacaoColaborador(empresaNome, codigo, link);

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Acesso AcolheMente - ${empresaNome}`,
          text: msg,
          url: link,
        });
        showToast("Compartilhado com sucesso!", "success");
        return;
      } catch (e) {
        // Usuário cancelou ou navegador não suportou completamente, segue para copiar
      }
    }

    navigator.clipboard.writeText(msg);
    setCopiedMsgColab(true);
    showToast("Mensagem de divulgação copiada com sucesso! Cole no WhatsApp, Teams, Slack ou e-mail.", "success");
    setTimeout(() => setCopiedMsgColab(false), 3000);
  };

  const handleWhatsAppColaborador = (empresaNome: string, codigo: string) => {
    const link = getLinkAcolhimentoColaborador(codigo);
    const msg = getMensagemDivulgacaoColaborador(empresaNome, codigo, link);
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Scroll to top
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [activeTab, empresaAtivaId]);

  // Categorias e Enquadramento da Empresa (Canal Parceiro / Empresa Conectada)
  const categoriasEmpresa = useMemo(() => {
    return getEmpresaCategorias(empresaPrincipal);
  }, [empresaPrincipal]);

  const isCanalBeneficios = useMemo(() => {
    return categoriasEmpresa.includes("canal_parceiro");
  }, [categoriasEmpresa]);

  const isEmpresaConectada = useMemo(() => {
    const emp = empresaAtiva || empresaPrincipal;
    return (
      hasEmpresaCategoria(emp, "empresa_conectada") ||
      Boolean(emp?.canalParceiroId || emp?.empresaMaeId)
    );
  }, [empresaAtiva, empresaPrincipal]);

  // Se a empresa conectada tentar acessar faturamento, redireciona para indicadores
  useEffect(() => {
    if (isEmpresaConectada && activeTab === "faturamento") {
      setActiveTab("indicadores");
    }
  }, [isEmpresaConectada, activeTab]);

  // Carrega a empresa principal em tempo real (atualiza automaticamente quando a Gestão AcolheMente cria/altera o código)
  useEffect(() => {
    if (!empresaId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg("");
    const docRef = doc(db, "empresa_leads", empresaId);

    const unsub = onSnapshot(
      docRef,
      (docSnap) => {
        setLoading(false);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as any;
          setEmpresaPrincipal(data);
          setEmpresaAtiva((prev: any) => {
            if (!prev || prev.id === data.id) return data;
            return prev;
          });
          setEmpresaAtivaId((prevId) => prevId || data.id);
          setColaboradoresList((prev) => (!empresaAtivaId || empresaAtivaId === data.id ? (Array.isArray(data.colaboradoresList) ? data.colaboradoresList : []) : prev));

          // Checa PIN / Autenticação por Senha Numérica (4 dígitos)
          const sessionAuth = sessionStorage.getItem(`portal_rh_auth_${empresaId}`);
          if (sessionAuth === "true") {
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
          sessionStorage.setItem("portal_empresa_active_id", empresaId);
        } else {
          setErrorMsg("Empresa não encontrada ou link expirado.");
        }
      },
      (err) => {
        console.error("Erro ao sincronizar dados da empresa:", err);
        setLoading(false);
        setErrorMsg("Falha ao comunicar com o servidor. Verifique sua conexão.");
      }
    );

    return () => unsub();
  }, [empresaId]);

  // Se a empresa for um Canal de Benefícios, busca as empresas conectadas em tempo real
  useEffect(() => {
    if (!empresaPrincipal || !isAuthenticated) return;
    const cats = getEmpresaCategorias(empresaPrincipal);
    if (!cats.includes("canal_parceiro")) return;

    setLoadingConectadas(true);
    const q = query(
      collection(db, "empresa_leads"),
      where("empresaPaiId", "==", empresaPrincipal.id)
    );

    const unsubConectadas = onSnapshot(
      q,
      (snap) => {
        const list: any[] = [];
        snap.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        setEmpresasConectadas(list);
        setLoadingConectadas(false);

        // Se a empresa ativa for uma das conectadas, mantém seus dados em tempo real
        setEmpresaAtiva((prev: any) => {
          if (prev && prev.id !== empresaPrincipal.id) {
            const found = list.find((c) => c.id === prev.id);
            if (found) return found;
          }
          return prev;
        });
      },
      (err) => {
        console.error("Erro ao buscar empresas conectadas:", err);
        setLoadingConectadas(false);
      }
    );

    return () => unsubConectadas();
  }, [empresaPrincipal?.id, isAuthenticated]);

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

  // Carrega indicadores clínicos/acolhimentos e motivos de busca do Firestore para a empresa ativa
  useEffect(() => {
    if (!empresaAtivaId || !isAuthenticated) return;

    // 1. Busca acolhimentos vinculados a esta empresa
    const qAcolhimentos = query(
      collection(db, "acolhimentos"),
      where("empresaLeadId", "==", empresaAtivaId)
    );

    const unsubAcolhimentos = onSnapshot(
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
        console.error("Erro ao carregar acolhimentos da empresa:", err);
      }
    );

    // 2. Busca registros de demandas/acessos corporativos e triagem
    const qTriagem = query(
      collection(db, "triagem_corporativa"),
      where("empresaId", "==", empresaAtivaId)
    );

    const qAcessos = query(
      collection(db, "beneficio_acessos"),
      where("empresaId", "==", empresaAtivaId)
    );

    let triagemDocs: any[] = [];
    let acessosDocs: any[] = [];

    const atualizarAcessos = () => {
      // Unifica deduplicando por id ou dados similares
      const map = new Map<string, any>();
      [...triagemDocs, ...acessosDocs].forEach((item) => {
        const key = item.id || `${item.colaboradorNome}_${item.queixa}_${item.createdAt?.seconds || ""}`;
        if (!map.has(key)) {
          map.set(key, item);
        }
      });
      setAcessosCorporativos(Array.from(map.values()));
    };

    const unsubTriagem = onSnapshot(
      qTriagem,
      (snap) => {
        triagemDocs = [];
        snap.forEach((d) => triagemDocs.push({ id: d.id, ...d.data() }));
        atualizarAcessos();
      },
      (err) => console.error("Erro ao carregar triagens corporativas:", err)
    );

    const unsubAcessos = onSnapshot(
      qAcessos,
      (snap) => {
        acessosDocs = [];
        snap.forEach((d) => acessosDocs.push({ id: d.id, ...d.data() }));
        atualizarAcessos();
      },
      (err) => console.error("Erro ao carregar acessos do benefício:", err)
    );

    return () => {
      unsubAcolhimentos();
      unsubTriagem();
      unsubAcessos();
    };
  }, [empresaAtivaId, isAuthenticated, mesSelecionado, anoSelecionado]);

  // Cálculo consolidado de Queixas / Temas & Cruzamento com o Catálogo Corporativo
  const indicadoresDemandas = useMemo(() => {
    // Itens no mês selecionado
    const itensMes = acessosCorporativos.filter((item) => {
      let d: Date | null = null;
      if (item.createdAt?.toDate) d = item.createdAt.toDate();
      else if (item.dataCadastro) d = new Date(item.dataCadastro);
      else if (item.data) d = new Date(item.data);
      if (!d || isNaN(d.getTime())) return false;
      return d.getMonth() + 1 === mesSelecionado && d.getFullYear() === anoSelecionado;
    });

    const baseParaAnalise = itensMes.length > 0 ? itensMes : acessosCorporativos;
    const isHistoricoGeral = itensMes.length === 0 && acessosCorporativos.length > 0;

    const contagemPorTema: Record<string, number> = {};
    TEMAS_QUEIXAS_CORPORATIVAS.forEach((t) => {
      contagemPorTema[t.id] = 0;
    });

    let totalDemandasRegistradas = 0;

    baseParaAnalise.forEach((item) => {
      // 1. Array de temasIds
      if (Array.isArray(item.temasIds) && item.temasIds.length > 0) {
        item.temasIds.forEach((tId: string) => {
          if (contagemPorTema[tId] !== undefined) {
            contagemPorTema[tId]++;
            totalDemandasRegistradas++;
          }
        });
      } else if (Array.isArray(item.temas) && item.temas.length > 0) {
        item.temas.forEach((tNome: string) => {
          const found = TEMAS_QUEIXAS_CORPORATIVAS.find(
            (t) => t.label.toLowerCase() === tNome.toLowerCase() || tNome.toLowerCase().includes(t.id)
          );
          if (found) {
            contagemPorTema[found.id]++;
            totalDemandasRegistradas++;
          }
        });
      } else if (item.queixa || item.temaPrincipal) {
        const txt = `${item.queixa || ""} ${item.temaPrincipal || ""}`.toLowerCase();
        let matched = false;
        TEMAS_QUEIXAS_CORPORATIVAS.forEach((t) => {
          if (txt.includes(t.id.toLowerCase()) || txt.includes(t.label.toLowerCase().slice(0, 7))) {
            contagemPorTema[t.id]++;
            matched = true;
            totalDemandasRegistradas++;
          }
        });
        if (!matched) {
          contagemPorTema["ansiedade_estresse"] = (contagemPorTema["ansiedade_estresse"] || 0) + 1;
          totalDemandasRegistradas++;
        }
      }
    });

    const catalogoItens = getCatalogoEmpresa(empresaAtiva);

    const rankingTemas = TEMAS_QUEIXAS_CORPORATIVAS.map((tema) => {
      const qtd = contagemPorTema[tema.id] || 0;
      const percentual =
        totalDemandasRegistradas > 0
          ? Math.round((qtd / totalDemandasRegistradas) * 100)
          : 0;

      // Localiza serviço sugerido correspondente no catálogo
      const servicoSugerido =
        catalogoItens.find((cat) => cat.id === tema.servicoCatalogoSugeridoId) ||
        catalogoItens.find((cat) => cat.categoria === "nr1_gro_pgr") ||
        catalogoItens[0];

      return {
        ...tema,
        quantidade: qtd,
        percentual,
        servicoSugerido,
      };
    }).sort((a, b) => b.quantidade - a.quantidade || b.percentual - a.percentual);

    const topTemasCriticos = rankingTemas.filter((t) => t.quantidade > 0).slice(0, 3);

    return {
      totalDemandasRegistradas,
      rankingTemas,
      topTemasCriticos,
      isHistoricoGeral,
      totalRegistrosAnalisados: baseParaAnalise.length,
    };
  }, [acessosCorporativos, mesSelecionado, anoSelecionado, empresaAtiva]);

  // Função para abrir o modal de proposta com o contexto do indicador pré-preenchido
  const handleAbrirOrcamentoComContexto = (servico: ItemCatalogoCorporativo, tema: any) => {
    setSelectedServicoParaOrcamento(servico);
    const mesNome = MESES_ANO.find((m) => m.valor === mesSelecionado)?.nome || "Mês Vigente";
    setFormOrcamento({
      nomeContato: empresaAtiva?.nomeResponsavel || empresaAtiva?.contatoNome || "",
      emailContato: empresaAtiva?.email || "",
      telefoneContato: empresaAtiva?.telefone || "",
      vidasEstimadas: vidasCadastradasAtivas || vidasContratadasNum || 0,
      formato: servico.formatoAtendimento || "hibrido",
      urgencia: "alta",
      mensagem: `Gostaríamos de receber uma proposta e plano de intervenção técnica para a solução "${servico.titulo}".\n\n🎯 Justificativa Baseada em Indicadores: Identificamos uma demanda relevante de ${tema.percentual > 0 ? `${tema.percentual}% dos atendimentos` : "alta prioridade"} voltada para o tema "${tema.label}" na nossa equipe no período de ${mesNome}/${anoSelecionado}.`,
    });
    setOrcamentoSucesso(false);
    setShowModalOrcamento(true);
  };

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

      // Valida Senha Numérica (PIN de 4 dígitos)
      const expectedPin = getEmpresaPin(found);
      if (
        loginPin.trim() !== expectedPin &&
        (!found.pinAcessoRH || found.pinAcessoRH.trim() !== loginPin.trim()) &&
        (!found.pinAcesso || found.pinAcesso.trim() !== loginPin.trim())
      ) {
        setPinError("Senha numérica (PIN de 4 dígitos) incorreta.");
        setIsLoggingIn(false);
        return;
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

    const expectedPin = getEmpresaPin(empresaPrincipal);
    if (
      pinInput.trim() === expectedPin ||
      (empresaPrincipal.pinAcessoRH && pinInput.trim() === empresaPrincipal.pinAcessoRH.trim()) ||
      (empresaPrincipal.pinAcesso && pinInput.trim() === empresaPrincipal.pinAcesso.trim())
    ) {
      setIsAuthenticated(true);
      sessionStorage.setItem(`portal_rh_auth_${empresaPrincipal.id}`, "true");
      setPinError("");
      showToast("Identidade confirmada! Acesso liberado ao Portal do RH.", "success");
    } else {
      setPinError("Senha numérica (PIN de 4 dígitos) incorreta. Tente novamente.");
    }
  };

  const handleLogout = () => {
    if (empresaPrincipal) {
      sessionStorage.removeItem(`portal_rh_auth_${empresaPrincipal.id}`);
    }
    sessionStorage.removeItem("portal_empresa_active_id");
    setIsAuthenticated(false);
    setPinInput("");
    setPinError("");
    showToast("Sessão finalizada. Faça login novamente com o PIN de segurança.", "info");
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
          {/* Header com Co-Branding AcolheMente + Empresa Parceira */}
          <div className="flex flex-col items-center text-center gap-4 mb-6">
            <div className="flex items-center justify-center gap-3 p-2 bg-warm/50 rounded-2xl border border-soft w-full">
              {/* Logo e Marca AcolheMente */}
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-sun/20 border border-sun/40 flex items-center justify-center text-forest overflow-hidden shadow-2xs shrink-0">
                  <img src={logoImage} alt="AcolheMente" className="w-full h-full object-cover" />
                </div>
                <div className="text-left hidden sm:block">
                  <span className="font-serif text-xs font-bold text-forest block leading-tight">AcolheMente</span>
                  <span className="text-[9px] text-forest/60 font-semibold uppercase tracking-wider block">Saúde Mental</span>
                </div>
              </div>

              <div className="h-6 w-px bg-soft shrink-0" />

              {/* Logo e Nome da Empresa Parceira */}
              <div className="flex items-center gap-2 min-w-0">
                {(empresaPrincipal?.logoUrl || empresaPrincipal?.logo || empresaPrincipal?.empresaLogo || empresaPrincipal?.logoBase64) ? (
                  <div className="w-10 h-10 rounded-xl bg-white border border-soft flex items-center justify-center overflow-hidden shadow-2xs p-1 shrink-0">
                    <img
                      src={empresaPrincipal.logoUrl || empresaPrincipal.logo || empresaPrincipal.empresaLogo || empresaPrincipal.logoBase64}
                      alt={empresaPrincipal.nomeEmpresa || empresaPrincipal.razaoSocial || "Logo Empresa"}
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-forest flex items-center justify-center text-sun shadow-2xs font-bold text-xs shrink-0">
                    {(empresaPrincipal?.nomeEmpresa || empresaPrincipal?.razaoSocial || "EP").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="text-left min-w-0">
                  <span className="font-serif text-xs font-bold text-forest truncate block max-w-[130px]">
                    {empresaPrincipal?.nomeEmpresa || empresaPrincipal?.razaoSocial || "Empresa Parceira"}
                  </span>
                  <span className="text-[9px] text-emerald-800 font-bold uppercase tracking-wider block">
                    {hasEmpresaCategoria(empresaPrincipal, "empresa_conectada") ? "Empresa Conectada" : "Gestão RH"}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-forest/10 text-forest border border-forest/20 inline-flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Acesso Restrito RH & Canal
              </span>
              <h1 className="font-serif text-xl sm:text-2xl font-bold text-forest mt-1.5">
                Portal Corporativo do RH
              </h1>
              <p className="text-xs text-forest/70 mt-1">
                {empresaPrincipal
                  ? `Digite o PIN de Segurança para gerir colaboradores e visualizar indicadores de ${empresaPrincipal.nomeEmpresa || empresaPrincipal.razaoSocial}.`
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
                <label className="block text-xs font-bold text-forest mb-1.5 text-center">
                  Senha Numérica de 4 Dígitos (PIN RH)
                </label>
                <div className="relative max-w-[220px] mx-auto">
                  <input
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="••••"
                    className="w-full pl-4 pr-10 py-3 bg-warm/40 border border-soft focus:border-forest rounded-xl text-center text-2xl font-mono tracking-[0.5em] text-forest outline-none transition-all placeholder:tracking-widest"
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
                disabled={pinInput.length < 4}
                className={`w-full py-3 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  pinInput.length === 4
                    ? "bg-forest text-white hover:bg-forest/90"
                    : "bg-forest/40 text-white/80 cursor-not-allowed"
                }`}
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
                <label className="block text-xs font-bold text-forest mb-1">Senha Numérica (PIN de 4 dígitos)</label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="••••"
                  className="w-full px-3.5 py-2.5 bg-warm/40 border border-soft focus:border-forest rounded-xl text-sm font-mono tracking-widest text-center text-forest outline-none"
                  required
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
            <div className="mt-6 pt-5 border-t border-soft/80 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={onGoHome}
                className="w-full py-2.5 px-4 bg-warm/60 hover:bg-warm border border-soft hover:border-forest/30 text-forest text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs hover:shadow-sm"
              >
                <Globe className="w-3.5 h-3.5 text-forest/70" />
                <span>Conheça a Rede AcolheMente</span>
              </button>
              <button
                type="button"
                onClick={onGoHome}
                className="text-[11px] text-forest/50 hover:text-forest flex items-center justify-center gap-1 mx-auto cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Ir para a Página Inicial</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm flex flex-col">
      {/* Toast Notification - Alinhado no rodapé à direita para não sobrepor o cabeçalho nem os botões */}
      {toastMsg && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 max-w-md ${
            toastMsg.type === "success"
              ? "bg-white text-slate-800 border-emerald-300 shadow-emerald-950/10"
              : toastMsg.type === "error"
              ? "bg-white text-slate-800 border-red-300 shadow-red-950/10"
              : "bg-white text-slate-800 border-slate-200 shadow-slate-950/10"
          }`}
        >
          {toastMsg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* TOPBAR DO PORTAL */}
      <header className="bg-white border-b border-soft sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2.5">
          {/* Logo e Nome da Empresa */}
          <div className="flex items-center gap-2.5">
            {onBack && (
              <button
                onClick={onBack}
                className="p-1.5 hover:bg-warm rounded-lg text-forest/70 hover:text-forest transition-colors cursor-pointer"
                title="Voltar"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            {/* Co-Branding de Logos no Topo da Página */}
            <div className="flex items-center gap-2">
              {(empresaAtiva?.logoUrl || empresaAtiva?.logo || empresaAtiva?.empresaLogo || empresaAtiva?.logoBase64 || empresaPrincipal?.logoUrl) ? (
                <div className="h-8 sm:h-9 max-w-[110px] sm:max-w-[130px] bg-white rounded-lg border border-soft p-1 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                  <img
                    src={empresaAtiva?.logoUrl || empresaAtiva?.logo || empresaAtiva?.empresaLogo || empresaAtiva?.logoBase64 || empresaPrincipal?.logoUrl}
                    alt={empresaAtiva?.nomeEmpresa || empresaAtiva?.razaoSocial || "Logo Empresa"}
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-forest flex items-center justify-center text-sun shadow-2xs font-bold text-xs sm:text-sm shrink-0">
                  {(empresaAtiva?.nomeEmpresa || empresaAtiva?.razaoSocial || "EP").slice(0, 2).toUpperCase()}
                </div>
              )}

              {/* Selo AcolheMente */}
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 bg-warm/80 rounded-lg border border-soft/60 shrink-0">
                <div className="w-3.5 h-3.5 rounded-full overflow-hidden shrink-0 border border-forest/20">
                  <img src={logoImage} alt="AcolheMente" className="w-full h-full object-cover" />
                </div>
                <span className="text-[10px] font-bold text-forest/75">AcolheMente</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-serif text-sm sm:text-base font-bold text-forest truncate max-w-xs sm:max-w-md">
                  {empresaAtiva?.nomeEmpresa || empresaAtiva?.razaoSocial || "Empresa Parceira"}
                </h1>
                {isCanalBeneficios && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                    Canal Parceiro
                  </span>
                )}
                {empresaAtiva?.empresaPaiNome && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                    via {empresaAtiva.empresaPaiNome}
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-forest/60">
                CNPJ: {empresaAtiva?.cnpj || "Não informado"} • Portal do RH
              </p>
            </div>
          </div>

          {/* Seletor de Carteira para Canal de Benefícios & Logout */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
            {isCanalBeneficios && (
              <button
                type="button"
                onClick={() => {
                  const link = `${window.location.origin}/?ficha_implantacao=nova&parceiro_id=${empresaPrincipal.id}`;
                  navigator.clipboard.writeText(link);
                  setToastMsg({
                    type: "success",
                    text: "Link de Implantação do Canal copiado! Envie para a empresa cliente preencher os dados e colaboradores para vincular automaticamente.",
                  });
                }}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                title="Ficha de Implantação - Primeiros Cadastros: Envie para a empresa contratada preencher seus dados e colaboradores. Ela ficará automaticamente vinculada ao seu canal parceiro como empresa conectada."
              >
                <Sparkles className="w-3.5 h-3.5 text-sun" />
                <span className="hidden md:inline">+ Link Implantação Novo Cliente</span>
                <span className="md:hidden">+ Implantação</span>
              </button>
            )}

            {isCanalBeneficios && empresasConectadas.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
                <Layers className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <span className="text-[11px] font-bold text-slate-700 hidden sm:inline">Empresa:</span>
                <select
                  value={empresaAtivaId || ""}
                  onChange={(e) => handleTrocarEmpresaAtiva(e.target.value)}
                  className="bg-transparent text-slate-800 font-semibold text-xs outline-none cursor-pointer pr-1"
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

            {isCanalBeneficios && empresaAtiva && empresaAtiva.id !== empresaPrincipal.id && (
              <button
                type="button"
                onClick={() => {
                  const link = `${window.location.origin}/?portal_rh=${empresaAtiva.id}`;
                  const pin = getEmpresaPin(empresaAtiva);
                  navigator.clipboard.writeText(link);
                  setToastMsg({
                    type: "success",
                    text: `Link do Portal RH da empresa ${empresaAtiva.nomeEmpresa || empresaAtiva.razaoSocial} copiado! PIN de Acesso: ${pin}`,
                  });
                }}
                className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                title={`Copiar link de acesso ao Portal do RH desta empresa conectada (PIN: ${getEmpresaPin(empresaAtiva)})`}
              >
                <Copy className="w-3 h-3 text-slate-600" />
                <span className="hidden sm:inline">Copiar Link RH Cliente</span>
              </button>
            )}

            {/* Bloco Código de Acesso do Colaborador - Barra Superior */}
            {getCodigoColaborador() ? (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs shadow-2xs">
                <div className="flex items-center gap-1 text-slate-800 font-bold">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-600 hidden xl:inline">Código:</span>
                  <span className="font-mono text-xs font-black text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    {getCodigoColaborador()}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopiarCodigoColaborador(getCodigoColaborador())}
                  className="p-1 hover:bg-slate-200/80 rounded-lg text-slate-700 transition-colors cursor-pointer"
                  title="Copiar Código de Acesso do Colaborador"
                >
                  {copiedCodigoColab ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleCompartilharColaborador(getNomeEmpresaAtiva(), getCodigoColaborador())}
                  className="p-1 hover:bg-slate-200/80 rounded-lg text-slate-700 transition-colors cursor-pointer"
                  title="Compartilhar comunicado com colaboradores"
                >
                  <Share2 className="w-3.5 h-3.5 text-slate-600" />
                </button>

                <button
                  type="button"
                  onClick={() => handleWhatsAppColaborador(getNomeEmpresaAtiva(), getCodigoColaborador())}
                  className="p-1 hover:bg-slate-200/80 rounded-lg text-slate-700 transition-colors cursor-pointer hidden sm:flex"
                  title="Compartilhar via WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-[11px] text-slate-600 shadow-2xs">
                <KeyRound className="w-3 h-3 text-slate-400 shrink-0" />
                <span>Código: <span className="text-slate-500 font-medium">Aguardando Gestão</span></span>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="px-2 py-1 text-forest/70 hover:text-red-700 hover:bg-red-50 rounded-xl text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
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
            className={`py-2 px-3 border-b-2 font-bold text-xs transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "indicadores"
                ? "border-forest text-forest"
                : "border-transparent text-forest/60 hover:text-forest"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-sun" />
            <span>Indicadores & Relatório Mensal</span>
          </button>

          <button
            onClick={() => setActiveTab("colaboradores")}
            className={`py-2 px-3 border-b-2 font-bold text-xs transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "colaboradores"
                ? "border-forest text-forest"
                : "border-transparent text-forest/60 hover:text-forest"
            }`}
          >
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span>Quadro de Colaboradores & Turnover</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-forest text-white font-bold">
              {vidasCadastradasAtivas}
            </span>
          </button>

          {!isEmpresaConectada && (
            <button
              onClick={() => setActiveTab("faturamento")}
              className={`py-2 px-3 border-b-2 font-bold text-xs transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === "faturamento"
                  ? "border-forest text-forest"
                  : "border-transparent text-forest/60 hover:text-forest"
              }`}
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-700" />
              <span>Faturamento & Mensalidade</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold">
                R$ {faturamentoAtualCalculado.valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </button>
          )}

          <button
            onClick={() => setActiveTab("dados")}
            className={`py-2 px-3 border-b-2 font-bold text-xs transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "dados"
                ? "border-forest text-forest"
                : "border-transparent text-forest/60 hover:text-forest"
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-forest/70" />
            <span>Dados Cadastrais & PIN</span>
          </button>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL - Alinhado mais acima com espaçamentos otimizados */}
      <main className="max-w-7xl w-full mx-auto p-3 sm:p-4 flex-1 flex flex-col gap-3 sm:gap-4">
        {/* ========================================================================= */}
        {/* ABA 1: INDICADORES & RELATÓRIO MENSAL */}
        {/* ========================================================================= */}
        {activeTab === "indicadores" && (
          <div className="space-y-4">
            {/* Header de Controle do Período & Botão de Impressão */}
            <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-soft shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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

            {/* Banner Executivo de Previsão de Faturamento do Mês (apenas empresas padrão/canal, oculto para conectadas) */}
            {!isEmpresaConectada && (
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
            )}

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

            {/* ========================================================================= */}
            {/* NOVO INDICADOR: TERMÔMETRO DE DEMANDAS & RISCOS PSICOSSOCIAIS (NR-1) */}
            {/* ========================================================================= */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-soft shadow-xs space-y-6">
              {/* Header do Indicador */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-soft">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                    <Flame className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-serif text-base sm:text-lg font-bold text-forest">
                        Termômetro de Demandas & Riscos Psicossociais (NR-1)
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-900 border border-rose-200">
                        GRO & PGR Ocupacional
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        100% Anônimo & LGPD
                      </span>
                    </div>
                    <p className="text-[11px] text-forest/70 mt-1 max-w-3xl leading-relaxed">
                      Mapeamento epidemiológico das queixas e motivos de busca selecionados obrigatoriamente pelos colaboradores antes do primeiro contato. Utilize esses dados para fundamentar o <strong>Inventário de Riscos Psicossociais da NR-1</strong> e selecionar as intervenções preventivas recomendadas no catálogo corporativo.
                    </p>
                  </div>
                </div>

                <div className="bg-warm/60 px-3.5 py-2 rounded-xl border border-soft shrink-0 text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-forest/60 block">
                    Total de Demandas Registradas
                  </span>
                  <span className="text-lg font-bold text-forest">
                    {indicadoresDemandas.totalDemandasRegistradas} {indicadoresDemandas.totalDemandasRegistradas === 1 ? "queixa" : "queixas"}
                  </span>
                  <span className="text-[10px] text-forest/50 block">
                    {indicadoresDemandas.isHistoricoGeral ? "Base Histórica Geral" : `Mês ${MESES_ANO.find((m) => m.valor === mesSelecionado)?.nome}/${anoSelecionado}`}
                  </span>
                </div>
              </div>

              {/* Grid: 2 Colunas (Ranking de Queixas & Soluções Recomendadas) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Coluna Esquerda (7 cols): Barras de Progresso e Percentual dos Temas */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-soft/60">
                    <h4 className="text-xs font-bold text-forest flex items-center gap-1.5 uppercase tracking-wider">
                      <PieChart className="w-4 h-4 text-forest/60" />
                      Distribuição Percentual das Queixas na Equipe
                    </h4>
                    <span className="text-[10px] text-forest/60">
                      {indicadoresDemandas.totalDemandasRegistradas > 0 ? "Ordenado por relevância" : "Matriz de Temas Padrão"}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {indicadoresDemandas.rankingTemas.map((tema, idx) => {
                      const isTop1 = idx === 0 && tema.quantidade > 0;
                      const isTop3 = idx < 3 && tema.quantidade > 0;

                      return (
                        <div
                          key={tema.id}
                          className={`p-3 rounded-xl border transition-all ${
                            isTop1
                              ? "bg-amber-50/50 border-amber-200 shadow-2xs"
                              : isTop3
                              ? "bg-warm/30 border-soft hover:border-sun/60"
                              : "bg-white border-soft/70 hover:bg-warm/20"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-base shrink-0">{tema.iconeEmoji}</span>
                              <span className="text-xs font-bold text-forest truncate">
                                {tema.label}
                              </span>
                              <span className="hidden sm:inline-block px-2 py-0.2 rounded-full text-[9px] font-bold bg-forest/5 text-forest/70 border border-forest/10 shrink-0">
                                {tema.categoria}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {isTop1 && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-rose-100 text-rose-900 border border-rose-200">
                                  Risco Prioritário
                                </span>
                              )}
                              <span className="text-xs font-bold text-forest">
                                {tema.percentual}%
                              </span>
                              <span className="text-[10px] text-forest/50 font-medium">
                                ({tema.quantidade})
                              </span>
                            </div>
                          </div>

                          {/* Barra de Progresso Visual */}
                          <div className="w-full h-2 bg-warm rounded-full overflow-hidden border border-soft/50">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                isTop1
                                  ? "bg-gradient-to-r from-amber-500 to-rose-500"
                                  : isTop3
                                  ? "bg-gradient-to-r from-sun-dark to-forest"
                                  : "bg-forest/40"
                              }`}
                              style={{ width: `${Math.max(tema.percentual, tema.quantidade > 0 ? 6 : 2)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-3 bg-warm/40 rounded-xl border border-soft text-[11px] text-forest/70 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <span>
                      <strong>Sigilo Ético Assegurado:</strong> As queixas são agrupadas exclusivamente em categorias epidemiológicas agregadas sem identificação individual, preservando integralmente o sigilo profissional (Resolução CFP 010/05).
                    </span>
                  </div>
                </div>

                {/* Coluna Direita (5 cols): Cruzamento Comercial & Recomendações do Catálogo */}
                <div className="lg:col-span-5 flex flex-col justify-between bg-gradient-to-b from-warm/60 via-warm/30 to-white p-4 sm:p-5 rounded-2xl border border-soft space-y-4">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-soft">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-forest/60 block">
                          Ações Corretivas & Preventivas
                        </span>
                        <h4 className="font-serif text-sm sm:text-base font-bold text-forest flex items-center gap-1.5">
                          <Target className="w-4 h-4 text-sun-dark" />
                          Soluções Recomendadas do Catálogo
                        </h4>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sun/40 text-forest border border-sun/60">
                        ROI em Saúde
                      </span>
                    </div>

                    <p className="text-[11px] text-forest/70 mt-3 leading-relaxed">
                      Com base nos maiores índices de queixas identificados na equipe, nossa equipe técnica selecionou as intervenções de maior eficácia comprovada para mitigar afastamentos e cumprir a NR-1:
                    </p>

                    {/* Cards de Soluções Recomendadas Pré-Preenchidas */}
                    <div className="space-y-3 mt-4">
                      {indicadoresDemandas.topTemasCriticos.length > 0 ? (
                        indicadoresDemandas.topTemasCriticos.map((topTema) => (
                          <div
                            key={topTema.id}
                            className="bg-white p-3.5 rounded-xl border border-soft hover:border-forest/40 shadow-2xs space-y-2.5 transition-all"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 inline-block mb-1">
                                  {topTema.iconeEmoji} Para mitigar: {topTema.label} ({topTema.percentual}%)
                                </span>
                                <h5 className="font-serif text-xs font-bold text-forest">
                                  {topTema.servicoSugerido?.titulo || topTema.solucaoSugeridaTitulo}
                                </h5>
                              </div>
                            </div>

                            <p className="text-[11px] text-forest/75 leading-snug line-clamp-2">
                              {topTema.servicoSugerido?.descricaoCurta || topTema.solucaoSugeridaDescricao}
                            </p>

                            <button
                              type="button"
                              onClick={() => handleAbrirOrcamentoComContexto(topTema.servicoSugerido, topTema)}
                              className="w-full py-2 bg-forest hover:bg-forest/90 text-white font-bold text-[11px] rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5 text-sun" />
                              <span>Solicitar Proposta desta Solução</span>
                            </button>
                          </div>
                        ))
                      ) : (
                        // Se ainda não houve acolhimentos no mês, exibe as principais soluções estratégicas
                        [
                          {
                            tema: TEMAS_QUEIXAS_CORPORATIVAS[0],
                            servico: getCatalogoEmpresa(empresaAtiva)[0],
                          },
                          {
                            tema: TEMAS_QUEIXAS_CORPORATIVAS[1],
                            servico: getCatalogoEmpresa(empresaAtiva)[1],
                          },
                        ].map((item, idx) => (
                          <div
                            key={idx}
                            className="bg-white p-3.5 rounded-xl border border-soft hover:border-forest/40 shadow-2xs space-y-2.5 transition-all"
                          >
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-forest/70 bg-warm px-2 py-0.5 rounded-md border border-soft inline-block mb-1">
                                {item.tema.iconeEmoji} Solução Preventiva Recomendada
                              </span>
                              <h5 className="font-serif text-xs font-bold text-forest">
                                {item.servico?.titulo || item.tema.solucaoSugeridaTitulo}
                              </h5>
                            </div>

                            <p className="text-[11px] text-forest/75 leading-snug line-clamp-2">
                              {item.servico?.descricaoCurta || item.tema.solucaoSugeridaDescricao}
                            </p>

                            <button
                              type="button"
                              onClick={() => handleAbrirOrcamentoComContexto(item.servico, item.tema)}
                              className="w-full py-2 bg-forest hover:bg-forest/90 text-white font-bold text-[11px] rounded-xl shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5 text-sun" />
                              <span>Solicitar Proposta desta Solução</span>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-soft/60 flex items-center justify-between text-[11px] text-forest/60">
                    <span>Dúvidas sobre o enquadramento NR-1?</span>
                    <button
                      type="button"
                      onClick={() => {
                        const elem = document.getElementById("secao-catalogo-completo");
                        if (elem) elem.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="font-bold text-forest hover:underline cursor-pointer flex items-center gap-1"
                    >
                      Ver Catálogo Completo <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* SEÇÃO INTEGRADA: CATÁLOGO DE INTERVENÇÕES NR-1 (GRO & PGR) & PRODUTOS */}
            {/* ========================================================================= */}
            <div id="secao-catalogo-completo" className="bg-white p-5 sm:p-6 rounded-2xl border border-soft shadow-xs space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-soft">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-sun/20 border border-sun/40 flex items-center justify-center text-forest">
                      <BookOpen className="w-4 h-4 text-forest" />
                    </div>
                    <div>
                      <h3 className="font-serif text-base sm:text-lg font-bold text-forest flex items-center gap-2">
                        <span>Catálogo de Intervenções, Treinamentos & Soluções NR-1</span>
                      </h3>
                      <p className="text-[11px] text-forest/70">
                        Com base nos indicadores de saúde mental da equipe, solicite orçamentos sob medida para cumprimento da <strong>NR-1 (GRO & PGR)</strong>, CIPA (Lei 14.457) e treinamentos corporativos.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Filtro de Categorias */}
                <div className="flex flex-wrap items-center gap-1.5 self-start md:self-center">
                  {[
                    { id: "todas", label: "Todos os Serviços" },
                    { id: "nr1_gro_pgr", label: "NR-1 / GRO & PGR" },
                    { id: "palestras_workshops", label: "Palestras CIPA" },
                    { id: "diagnostico_psicossocial", label: "Diagnósticos" },
                    { id: "lideranca_saude", label: "Liderança" },
                    { id: "plantao_crise", label: "Gestão de Crise" },
                  ].map((filtro) => (
                    <button
                      key={filtro.id}
                      type="button"
                      onClick={() => setFiltroCategoriaCatalogo(filtro.id)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                        filtroCategoriaCatalogo === filtro.id
                          ? "bg-forest text-white shadow-2xs"
                          : "bg-warm text-forest/70 hover:bg-soft hover:text-forest"
                      }`}
                    >
                      {filtro.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cards do Catálogo */}
              {(() => {
                const catalogoCompleto = getCatalogoEmpresa(empresaAtiva);
                const catalogoFiltrado = catalogoCompleto
                  .filter((item) => item.ativo)
                  .filter((item) => (filtroCategoriaCatalogo === "todas" ? true : item.categoria === filtroCategoriaCatalogo));

                if (catalogoFiltrado.length === 0) {
                  return (
                    <div className="text-center py-8 text-forest/60 text-xs">
                      Nenhum serviço disponível nesta categoria no momento.
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {catalogoFiltrado.map((item) => (
                      <div
                        key={item.id}
                        className={`rounded-2xl border p-4.5 flex flex-col justify-between transition-all hover:shadow-md ${
                          item.destaque
                            ? "bg-gradient-to-b from-amber-50/40 via-white to-white border-amber-300"
                            : "bg-white border-soft hover:border-sun/60"
                        }`}
                      >
                        <div className="space-y-3">
                          {/* Tags e Badges */}
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-forest/10 text-forest">
                              {item.formatoAtendimento === "online" ? "🌐 Remoto" : item.formatoAtendimento === "presencial" ? "🏢 Presencial" : "🔄 Híbrido"}
                            </span>
                            {item.tagNormativa && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-rose-50 text-rose-800 border border-rose-200">
                                {item.tagNormativa}
                              </span>
                            )}
                          </div>

                          <div>
                            <h4 className="font-serif text-sm font-bold text-forest leading-snug">
                              {item.titulo}
                            </h4>
                            <p className="text-xs text-forest/75 mt-1.5 leading-relaxed">
                              {item.descricaoCurta}
                            </p>
                          </div>

                          {/* Como Funciona */}
                          {item.comoFunciona && (
                            <div className="p-3 bg-warm/50 rounded-xl text-[11px] text-forest/80 border border-soft/60 space-y-1">
                              <span className="font-bold text-forest flex items-center gap-1">
                                <HelpCircle className="w-3 h-3 text-sun-dark" /> Como funciona:
                              </span>
                              <p className="line-clamp-3 leading-relaxed">{item.comoFunciona}</p>
                            </div>
                          )}

                          {/* Benefícios em lista */}
                          {item.beneficiosEsperados && item.beneficiosEsperados.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-forest/60">
                                Principais Entregáveis:
                              </span>
                              <ul className="space-y-1">
                                {item.beneficiosEsperados.slice(0, 3).map((ben, idx) => (
                                  <li key={idx} className="flex items-start gap-1.5 text-[11px] text-forest/80">
                                    <Check className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                                    <span className="line-clamp-1">{ben}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Rodapé com Preço Estimado e Botão de Solicitação */}
                        <div className="pt-4 mt-3 border-t border-soft/60 flex items-center justify-between gap-2">
                          <div className="flex flex-col">
                            <span className="text-[9px] uppercase font-bold text-forest/60">Estimativa</span>
                            <span className="text-[11px] font-semibold text-forest truncate max-w-[130px]">
                              {item.precoReferencia || "Sob consulta"}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedServicoParaOrcamento(item);
                              setFormOrcamento({
                                nomeContato: empresaAtiva?.nomeResponsavel || empresaAtiva?.contatoNome || "",
                                emailContato: empresaAtiva?.email || "",
                                telefoneContato: empresaAtiva?.telefone || "",
                                vidasEstimadas: vidasCadastradasAtivas || vidasContratadasNum || 10,
                                formato: item.formatoAtendimento || "online",
                                urgencia: "normal",
                                mensagem: `Gostaríamos de receber uma proposta de intervenção para a nossa equipe voltada a "${item.titulo}".`,
                              });
                              setOrcamentoSucesso(false);
                              setShowModalOrcamento(true);
                            }}
                            className="px-3 py-1.5 bg-forest hover:bg-forest/90 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer hover:scale-102"
                          >
                            <Send className="w-3 h-3 text-sun" />
                            <span>Solicitar Orçamento</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ABA 2: QUADRO DE COLABORADORES, TURNOVER E PLANILHAS */}
        {/* ========================================================================= */}
        {activeTab === "colaboradores" && (
          <div className="space-y-3 sm:space-y-3.5">
            {/* Bloco Conciso de Acesso do Colaborador (apenas se houver código configurado) */}
            {getCodigoColaborador() ? (
              <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/80 flex items-center justify-center shrink-0">
                    <KeyRound className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="font-semibold text-slate-700">Código de Acesso dos Colaboradores:</span>
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {getCodigoColaborador()}
                    </span>
                    <span className="text-[11px] text-slate-500 hidden md:inline">• Compartilhe para agendamento dos colaboradores</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleCopiarCodigoColaborador(getCodigoColaborador())}
                    className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Copiar Código"
                  >
                    {copiedCodigoColab ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCodigoColab ? "Copiado!" : "Copiar"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleWhatsAppColaborador(getNomeEmpresaAtiva(), getCodigoColaborador())}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Enviar via WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowModalMensagemColaborador(true)}
                    className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Visualizar comunicado completo"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : null}

            {/* Header da Gestão de Colaboradores & Ações em Massa */}
            <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-soft shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-sm sm:text-base font-bold text-forest">
                    Quadro de Colaboradores & Dependentes
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
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
            <div className="bg-white p-2.5 rounded-xl border border-soft shadow-xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
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
                      filtroStatusColaborador === "ativo" ? "bg-forest text-white shadow-2xs" : "text-forest/60"
                    }`}
                  >
                    Ativos ({vidasCadastradasAtivas})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiltroStatusColaborador("desligado")}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold cursor-pointer ${
                      filtroStatusColaborador === "desligado" ? "bg-slate-700 text-white shadow-2xs" : "text-forest/60"
                    }`}
                  >
                    Turnover / Desligados ({totalDesligados})
                  </button>
                </div>
              </div>
            </div>

            {/* Tabela de Colaboradores */}
            <div className="bg-white rounded-xl border border-soft shadow-xs overflow-hidden">
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
        {!isEmpresaConectada && activeTab === "faturamento" && (
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

            {/* Código de Acesso do Colaborador (Convênio / Benefício) */}
            <div className="bg-white p-5 rounded-2xl border border-soft shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-soft">
                <h2 className="font-serif text-base font-bold text-forest flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-700" />
                  <span>Código de Acesso Corporativo dos Colaboradores</span>
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Benefício Ativo
                </span>
              </div>

              <p className="text-xs text-forest/70 leading-relaxed">
                Este é o código alfanumérico que os colaboradores da empresa devem utilizar para desbloquear o acolhimento corporativo no site da AcolheMente.
              </p>

              <div className="p-4 bg-warm/40 border border-soft rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-forest text-white flex items-center justify-center font-bold shadow-2xs">
                    <KeyRound className="w-5 h-5 text-sun" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-forest/60">Código Registrado na Gestão</span>
                    <p className="font-mono text-lg font-black text-forest tracking-wider">
                      {getCodigoColaborador() || "NÃO CADASTRADO"}
                    </p>
                  </div>
                </div>

                {getCodigoColaborador() ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleCopiarCodigoColaborador(getCodigoColaborador())}
                      className="px-3 py-1.5 bg-white text-forest hover:bg-warm border border-soft rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      {copiedCodigoColab ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCodigoColab ? "Copiado!" : "Copiar Código"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopiarLinkColaborador(getLinkAcolhimentoColaborador(getCodigoColaborador()))}
                      className="px-3 py-1.5 bg-white text-forest hover:bg-warm border border-soft rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      {copiedLinkColab ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Link2 className="w-3.5 h-3.5" />}
                      <span>Link Direto</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCompartilharColaborador(getNomeEmpresaAtiva(), getCodigoColaborador())}
                      className="px-3 py-1.5 bg-forest text-white hover:bg-forest/90 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Share2 className="w-3.5 h-3.5 text-sun" />
                      <span>Compartilhar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleWhatsAppColaborador(getNomeEmpresaAtiva(), getCodigoColaborador())}
                      className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors cursor-pointer shadow-2xs"
                      title="Compartilhar via WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-amber-800 font-semibold italic">
                    Aguardando configuração pela Gestão AcolheMente
                  </span>
                )}
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
                  {/* Co-Branding de Logos */}
                  <div className="flex items-center gap-2">
                    {(empresaAtiva?.logoUrl || empresaAtiva?.logo || empresaAtiva?.empresaLogo || empresaAtiva?.logoBase64 || empresaPrincipal?.logoUrl) && (
                      <div className="w-12 h-12 rounded-xl bg-white border border-soft flex items-center justify-center overflow-hidden p-1 shadow-2xs">
                        <img
                          src={empresaAtiva?.logoUrl || empresaAtiva?.logo || empresaAtiva?.empresaLogo || empresaAtiva?.logoBase64 || empresaPrincipal?.logoUrl}
                          alt={empresaAtiva?.nomeEmpresa || empresaAtiva?.razaoSocial}
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <div className="w-12 h-12 rounded-xl bg-sun/20 border border-sun/40 flex items-center justify-center overflow-hidden">
                      <img src={logoImage} alt="AcolheMente" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div>
                    <h2 className="font-serif text-lg font-bold text-forest">
                      {empresaAtiva?.nomeEmpresa || empresaAtiva?.razaoSocial || "Empresa Parceira"} & AcolheMente
                    </h2>
                    <p className="text-[11px] text-forest/70">Relatório Executivo de Saúde Mental & Diagnóstico NR-1 (GRO/PGR)</p>
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

              {/* 3. Mapeamento Epidemiológico de Queixas & Riscos Psicossociais (NR-1) */}
              <div>
                <h4 className="font-serif text-sm font-bold text-forest mb-2">
                  3. Mapeamento Epidemiológico de Temas & Queixas (NR-1 / GRO)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {indicadoresDemandas.rankingTemas.slice(0, 6).map((tema) => (
                    <div
                      key={tema.id}
                      className="p-2.5 bg-warm/30 rounded-xl border border-soft flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span>{tema.iconeEmoji}</span>
                        <span className="font-semibold text-forest truncate">{tema.label}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 font-bold text-forest">
                        <span>{tema.percentual}%</span>
                        <span className="text-[10px] text-forest/50">({tema.quantidade})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Ações Preventivas & Soluções Recomendadas do Catálogo */}
              <div className="bg-warm/40 p-4 rounded-2xl border border-soft space-y-2">
                <h4 className="font-serif text-xs font-bold text-forest uppercase tracking-wider">
                  4. Intervenções & Ações Recomendadas para o Plano de Ação (PGR)
                </h4>
                <ul className="space-y-1.5 text-xs text-forest/80">
                  {indicadoresDemandas.topTemasCriticos.length > 0 ? (
                    indicadoresDemandas.topTemasCriticos.map((topTema) => (
                      <li key={topTema.id} className="flex items-start gap-1.5">
                        <span className="text-forest font-bold">•</span>
                        <span>
                          <strong>{topTema.servicoSugerido?.titulo || topTema.solucaoSugeridaTitulo}:</strong> Recomendado para atuar sobre a queixa de <em>{topTema.label}</em> ({topTema.percentual}% da equipe).
                        </span>
                      </li>
                    ))
                  ) : (
                    <>
                      <li className="flex items-start gap-1.5">
                        <span className="text-forest font-bold">•</span>
                        <span>
                          <strong>Assessoria NR-1: Gestão de Riscos Psicossociais (GRO & PGR):</strong> Estruturação da matriz de risco ocupacional e plano de ação preventiva.
                        </span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-forest font-bold">•</span>
                        <span>
                          <strong>Workshop de Liderança Acolhedora:</strong> Capacitação das lideranças e gestores no manejo preventivo de estresse e burnout.
                        </span>
                      </li>
                    </>
                  )}
                </ul>
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

      {/* ========================================================================= */}
      {/* MODAL: SOLICITAÇÃO DE ORÇAMENTO DE SERVIÇO / NR-1 / TREINAMENTOS */}
      {/* ========================================================================= */}
      {showModalOrcamento && selectedServicoParaOrcamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-soft relative animate-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-soft mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-forest text-sun flex items-center justify-center shrink-0">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-forest">
                    Solicitar Proposta & Orçamento
                  </h3>
                  <span className="text-[11px] text-forest/60">
                    {empresaAtiva?.nomeEmpresa || empresaAtiva?.razaoSocial}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowModalOrcamento(false);
                  setSelectedServicoParaOrcamento(null);
                }}
                className="p-1.5 text-forest/50 hover:text-forest rounded-xl hover:bg-warm transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {orcamentoSucesso ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="font-serif text-lg font-bold text-forest">
                  Solicitação Enviada com Sucesso!
                </h4>
                <p className="text-xs text-forest/70 max-w-sm mx-auto leading-relaxed">
                  Nossa equipe de consultoria em Saúde Ocupacional e Psicologia entrará em contato em até <strong>24 horas úteis</strong> com uma proposta personalizada para sua empresa.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModalOrcamento(false);
                      setSelectedServicoParaOrcamento(null);
                    }}
                    className="px-6 py-2.5 bg-forest text-white hover:bg-forest/90 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    Concluir e Voltar
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsSendingOrcamento(true);
                  try {
                    const payload: SolicitacaoOrcamentoCorporativo = {
                      id: `orcamento_${Date.now()}`,
                      empresaId: empresaAtiva?.id || empresaPrincipal?.id || "",
                      empresaNome: empresaAtiva?.nomeEmpresa || empresaAtiva?.razaoSocial || "Empresa Parceira",
                      catalogoItemId: selectedServicoParaOrcamento.id,
                      catalogoItemTitulo: selectedServicoParaOrcamento.titulo,
                      tagNormativa: selectedServicoParaOrcamento.tagNormativa,
                      contatoNome: formOrcamento.nomeContato,
                      contatoEmail: formOrcamento.emailContato,
                      contatoTelefone: formOrcamento.telefoneContato,
                      vidasEstimadas: Number(formOrcamento.vidasEstimadas) || 0,
                      formatoDesejado: formOrcamento.formato,
                      urgencia: formOrcamento.urgencia,
                      mensagemOuNecessidade: formOrcamento.mensagem,
                      indicadoresContexto: `Ativos: ${vidasCadastradasAtivas} vidas | Desfechos: ${desfechosAnonimos.emAtendimento} em acolhimento`,
                      dataSolicitacao: new Date().toISOString(),
                      status: "novo",
                    };

                    // Salva na coleção corporativa de solicitações de orçamento
                    await addDoc(collection(db, "solicitacoes_orcamentos_corporativos"), payload);

                    setOrcamentoSucesso(true);
                    showToast("Proposta solicitada com sucesso!", "success");
                  } catch (err: any) {
                    console.error("Erro ao salvar solicitacao de orcamento:", err);
                    showToast("Erro ao enviar solicitação. Tente novamente.", "error");
                  } finally {
                    setIsSendingOrcamento(false);
                  }
                }}
                className="space-y-4 text-xs"
              >
                {/* Card de Resumo do Item Selecionado */}
                <div className="p-3.5 bg-warm/60 border border-soft rounded-2xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-forest text-xs">
                      {selectedServicoParaOrcamento.titulo}
                    </span>
                    {selectedServicoParaOrcamento.tagNormativa && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-50 text-rose-800 border border-rose-200">
                        {selectedServicoParaOrcamento.tagNormativa}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-forest/70 line-clamp-2">
                    {selectedServicoParaOrcamento.descricaoCurta}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-forest/70 text-[10px] uppercase">
                      Nome do Responsável / Solicitante *
                    </label>
                    <input
                      type="text"
                      required
                      value={formOrcamento.nomeContato}
                      onChange={(e) => setFormOrcamento({ ...formOrcamento, nomeContato: e.target.value })}
                      placeholder="Seu nome completo"
                      className="px-3 py-2 bg-white border border-soft rounded-xl text-xs text-forest focus:outline-none focus:border-forest"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-forest/70 text-[10px] uppercase">
                      E-mail Corporativo *
                    </label>
                    <input
                      type="email"
                      required
                      value={formOrcamento.emailContato}
                      onChange={(e) => setFormOrcamento({ ...formOrcamento, emailContato: e.target.value })}
                      placeholder="rh@empresa.com.br"
                      className="px-3 py-2 bg-white border border-soft rounded-xl text-xs text-forest focus:outline-none focus:border-forest"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-forest/70 text-[10px] uppercase">
                      WhatsApp / Telefone para Contato *
                    </label>
                    <input
                      type="text"
                      required
                      value={formOrcamento.telefoneContato}
                      onChange={(e) => setFormOrcamento({ ...formOrcamento, telefoneContato: e.target.value })}
                      placeholder="(11) 99999-9999"
                      className="px-3 py-2 bg-white border border-soft rounded-xl text-xs text-forest focus:outline-none focus:border-forest"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-forest/70 text-[10px] uppercase">
                      Vidas Impactadas Estimadas
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formOrcamento.vidasEstimadas || ""}
                      onChange={(e) => setFormOrcamento({ ...formOrcamento, vidasEstimadas: Number(e.target.value) })}
                      placeholder="Ex: 50 colaboradores"
                      className="px-3 py-2 bg-white border border-soft rounded-xl text-xs text-forest focus:outline-none focus:border-forest"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-forest/70 text-[10px] uppercase">
                      Formato Preferido
                    </label>
                    <select
                      value={formOrcamento.formato}
                      onChange={(e) => setFormOrcamento({ ...formOrcamento, formato: e.target.value as any })}
                      className="px-3 py-2 bg-white border border-soft rounded-xl text-xs text-forest font-semibold focus:outline-none focus:border-forest cursor-pointer"
                    >
                      <option value="online">Online / Remoto</option>
                      <option value="presencial">Presencial na Sede da Empresa</option>
                      <option value="hibrido">Híbrido</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-bold text-forest/70 text-[10px] uppercase">
                      Urgência de Implantação
                    </label>
                    <select
                      value={formOrcamento.urgencia}
                      onChange={(e) => setFormOrcamento({ ...formOrcamento, urgencia: e.target.value as any })}
                      className="px-3 py-2 bg-white border border-soft rounded-xl text-xs text-forest font-semibold focus:outline-none focus:border-forest cursor-pointer"
                    >
                      <option value="normal">Normal (Planejamento anual/trimestral)</option>
                      <option value="alta">Alta (Próximos 15 a 30 dias)</option>
                      <option value="imediata">Imediata / Crise (Para esta semana)</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-forest/70 text-[10px] uppercase">
                    Observações ou Necessidade Específica
                  </label>
                  <textarea
                    rows={2}
                    value={formOrcamento.mensagem}
                    onChange={(e) => setFormOrcamento({ ...formOrcamento, mensagem: e.target.value })}
                    placeholder="Conte um pouco sobre o cenário da equipe (ex: aumento de afastamentos por estresse, demanda da CIPA, auditoria fiscal de NR-1)..."
                    className="px-3 py-2 bg-white border border-soft rounded-xl text-xs text-forest focus:outline-none focus:border-forest resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-soft">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModalOrcamento(false);
                      setSelectedServicoParaOrcamento(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-forest/70 hover:text-forest rounded-xl"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={isSendingOrcamento}
                    className="px-5 py-2.5 bg-forest hover:bg-forest/90 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5 text-sun" />
                    <span>{isSendingOrcamento ? "Enviando..." : "Enviar Solicitação"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: COMUNICADO PRONTO DE DIVULGAÇÃO AOS COLABORADORES */}
      {/* ========================================================================= */}
      {showModalMensagemColaborador && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-soft shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-soft">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-forest">
                    Comunicado de Acesso para os Colaboradores
                  </h3>
                  <p className="text-[11px] text-forest/60">
                    {getNomeEmpresaAtiva()} • Convênio AcolheMente
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModalMensagemColaborador(false)}
                className="p-1.5 hover:bg-warm rounded-xl text-forest/50 hover:text-forest transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-warm/50 border border-soft rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-forest uppercase tracking-wider">
                  Texto Pronto para Compartilhamento
                </span>
                <span className="text-[11px] text-emerald-800 font-mono font-bold bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200">
                  Código: {getCodigoColaborador()}
                </span>
              </div>
              <textarea
                readOnly
                rows={12}
                value={getMensagemDivulgacaoColaborador(
                  getNomeEmpresaAtiva(),
                  getCodigoColaborador(),
                  getLinkAcolhimentoColaborador(getCodigoColaborador())
                )}
                className="w-full text-xs font-sans p-3 bg-white border border-soft rounded-xl text-forest/90 leading-relaxed outline-none resize-none selection:bg-sun-dark/30 select-all"
              />
              <p className="text-[11px] text-forest/60 leading-relaxed">
                💡 Este texto pode ser enviado nos canais internos da empresa (WhatsApp, Slack, Teams, comunicados impressos ou e-mail corporativo). O link já abre com o código do convênio validado.
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-soft flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopiarCodigoColaborador(getCodigoColaborador())}
                  className="px-3 py-2 bg-warm hover:bg-soft text-forest rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-forest/60" />
                  <span>Copiar Código</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleWhatsAppColaborador(getNomeEmpresaAtiva(), getCodigoColaborador())}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Enviar no WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleCompartilharColaborador(getNomeEmpresaAtiva(), getCodigoColaborador());
                  }}
                  className="px-4 py-2 bg-forest hover:bg-forest/90 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Share2 className="w-3.5 h-3.5 text-sun" />
                  <span>Copiar Comunicado</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
