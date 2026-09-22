import React, { useState, useEffect, useMemo } from "react";
import { 
  Building2, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Briefcase, 
  HeartHandshake, 
  KeyRound, 
  Loader2,
  AlertCircle,
  Search,
  Check,
  Calendar,
  Clock,
  ExternalLink,
  MessageCircle,
  User,
  Users,
  Baby,
  Smile,
  Layers,
  Star,
  Lock,
  Compass,
  CheckCheck,
  RefreshCw,
  Info,
  Lightbulb,
  X,
  Award,
  MapPin,
  Phone,
  Instagram,
  Linkedin,
  Globe,
  Share2,
  Heart,
  BookOpen
} from "lucide-react";
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  getDocs, 
  query, 
  where, 
  onSnapshot 
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { 
  CargoEmpresa, 
  ServicoCorporativoConfig, 
  DEFAULT_CARGOS_EMPRESA, 
  DEFAULT_SERVICOS_CORPORATIVOS 
} from "../types/corporativo";

interface EmpresaData {
  id: string;
  nomeEmpresa: string;
  cnpj?: string;
  codigoAcesso?: string;
  logoUrl?: string;
  slogan?: string;
  email?: string;
  beneficioConfig?: {
    cargos?: CargoEmpresa[];
    servicos?: ServicoCorporativoConfig[];
  };
}

interface ProfissionalItem {
  id: string;
  name: string;
  foto: string;
  profissao: string;
  crp?: string;
  especialidade?: string;
  abordagem?: string;
  telefone?: string;
  whatsapp?: string;
  cidade?: string;
  estado?: string;
  biografia?: string;
  bioCurta?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  siteUrl?: string;
  horasDisponiveis?: string;
  servicosOferecidos?: string[];
  outrosServicos?: string;
  formacao?: string;
  modalidade?: string;
  servicosPrestados?: string[];
  turnos?: string[];
  palavrasChave?: string[];
  nota?: number;
  totalAtendimentos?: number;
}

export function getExplicacaoAbordagem(abordagem: string = ""): {
  titulo: string;
  descricao: string;
  comoFunciona: string;
  beneficioPrincipal: string;
} {
  const norm = (abordagem || "").toLowerCase();

  if (norm.includes("tcc") || norm.includes("cognitiv") || norm.includes("comportamental")) {
    return {
      titulo: "Terapia Cognitivo-Comportamental (TCC)",
      descricao: "Compreende que a maneira como interpretamos situações influencia diretamente nossos sentimentos, sensações físicas e atitudes do dia a dia.",
      comoFunciona: "Sessões dinâmicas, colaborativas e com ferramentas práticas para identificar padrões de pensamento disfuncionais e construir novos hábitos emocionais.",
      beneficioPrincipal: "Alívio eficaz de ansiedade, estresse, fobias, crises de pânico e depressão, trazendo respostas práticas para o presente."
    };
  }

  if (norm.includes("psican") || norm.includes("freud") || norm.includes("lacan") || norm.includes("inconsciente")) {
    return {
      titulo: "Psicanálise Clínica Contemporânea",
      descricao: "Investiga o inconsciente e as raízes profundas de sentimentos, conflitos íntimos e padrões que tendem a se repetir na vida.",
      comoFunciona: "Um espaço seguro de livre associação e escuta acolhedora, onde você compreende a origem de angústias e ressignifica sua história pessoal.",
      beneficioPrincipal: "Autoconhecimento profundo, alívio de angústias existenciais e liberdade frente a repetições emocionais."
    };
  }

  if (norm.includes("humanis") || norm.includes("roger") || norm.includes("acp") || norm.includes("centrada na pessoa")) {
    return {
      titulo: "Abordagem Humanista / Centrada na Pessoa",
      descricao: "Acredita na capacidade genuína de cada indivíduo de se desenvolver, encontrar suas próprias respostas e conquistar o bem-estar psicológico.",
      comoFunciona: "Relação terapêutica baseada em aceitação incondicional, empatia profunda e ausência de julgamentos, fortalecendo sua autonomia.",
      beneficioPrincipal: "Fortalecimento da autoestima, autoaceitação, clareza sobre decisões e reconexão com a própria identidade."
    };
  }

  if (norm.includes("gestalt")) {
    return {
      titulo: "Gestalt-Terapia",
      descricao: "Foca no momento presente ('aqui e agora') e na tomada de consciência integrada entre corpo, sensações, emoções e pensamentos.",
      comoFunciona: "Diálogo atento e experimentos sensoriais para perceber como você se posiciona perante suas relações e fechar ciclos inacabados.",
      beneficioPrincipal: "Presença autêntica, clareza perceptual e equilíbrio diante de transições de vida e momentos de crise."
    };
  }

  if (norm.includes("sistêm") || norm.includes("sistem") || norm.includes("familiar") || norm.includes("casal")) {
    return {
      titulo: "Terapia Sistêmica & Familiar",
      descricao: "Enxerga o indivíduo inserido em seus vínculos e sistemas (família, trabalho, sociedade) e como essas relações impactam sua saúde mental.",
      comoFunciona: "Mapeamento de papéis, formas de comunicação e dinâmicas relacionais, facilitando acordos saudáveis e vínculos equilibrados.",
      beneficioPrincipal: "Mediação de conflitos de convivência, harmonia conjugal, comunicação assertiva e melhora no ambiente familiar."
    };
  }

  if (norm.includes("emoc") || norm.includes("eft") || norm.includes("afetiv")) {
    return {
      titulo: "Terapia Focada nas Emoções (EFT)",
      descricao: "Trabalha as emoções como bússolas essenciais para a nossa sobrevivência afetiva, segurança interior e relacionamentos saudáveis.",
      comoFunciona: "Acolhimento de emoções primárias (tristeza, vulnerabilidade, medo) e transformação de bloqueios em ferramentas de conexão.",
      beneficioPrincipal: "Regulação emocional consistente e restauração de vínculos de afeto e segurança interpessoal."
    };
  }

  if (norm.includes("act") || norm.includes("compromisso") || norm.includes("aceitacao")) {
    return {
      titulo: "Terapia de Aceitação e Compromisso (ACT)",
      descricao: "Ensina a acolher pensamentos e sentimentos difíceis sem lutar contra eles, enquanto você age alinhado aos seus valores mais profundos.",
      comoFunciona: "Práticas de mindfulness (atenção plena), desfusão cognitiva e compromisso com metas significativas para a sua vida.",
      beneficioPrincipal: "Flexibilidade psicológica, superação de autocrítica excessiva e ação com propósito."
    };
  }

  return {
    titulo: abordagem || "Psicoterapia Clínica Integrativa",
    descricao: "Abordagem acolhedora fundamentada em preceitos éticos e científicos da Psicologia, adaptada à singularidade de cada história de vida.",
    comoFunciona: "Sessões personalizadas e confidenciais estruturadas para acolher suas demandas prioritárias de maneira empática e humanizada.",
    beneficioPrincipal: "Cuidado personalizado, acolhimento sem julgamentos e desenvolvimento emocional sustentável."
  };
}

interface AcolhimentoCorporativoProps {
  onBackToSelection: () => void;
  onNavigate?: (view: "landing" | "acolhimento" | "dashboard" | "profile") => void;
}

const FALLBACK_PROFISSIONAIS: ProfissionalItem[] = [
  {
    id: "prof-1",
    name: "Dra. Ana Carolina Silva",
    foto: "https://images.unsplash.com/photo-1594824813566-78a9c33fd908?w=400&auto=format&fit=crop&q=80",
    profissao: "Psicóloga Clínica",
    crp: "CRP 06/145892",
    especialidade: "Terapia Individual Adulto & Terapia de Casal",
    abordagem: "TCC & Terapia Focada nas Emoções",
    whatsapp: "11987654321",
    cidade: "São Paulo",
    estado: "SP",
    biografia: "Especialista em regulação emocional, alinhamento afetivo e superação de crises de ansiedade. Atendimento humanizado e focado em resultados sustentáveis.",
    servicosPrestados: ["terapia_individual_adulto", "terapia_casal"],
    turnos: ["noite", "tarde", "sabados"],
    palavrasChave: ["tcc", "casal", "ansiedade", "relacionamento", "panico", "estresse", "emocoes"],
    nota: 4.9,
    totalAtendimentos: 48
  },
  {
    id: "prof-2",
    name: "Dr. Marcos Vinícius Santos",
    foto: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80",
    profissao: "Psicanalista Clínico",
    crp: "CRP 05/887412",
    especialidade: "Adultos, Luto e Crises Existenciais",
    abordagem: "Psicanálise Contemporânea",
    whatsapp: "21998765432",
    cidade: "Rio de Janeiro",
    estado: "RJ",
    biografia: "Mais de 12 anos de escuta atenta no acolhimento a processos de luto, depressão e grandes transições de vida e carreira.",
    servicosPrestados: ["terapia_individual_adulto", "orientacao_carreira"],
    turnos: ["manha", "tarde", "noite"],
    palavrasChave: ["luto", "depressao", "psicanalise", "carreira", "crise", "ansiedade"],
    nota: 5.0,
    totalAtendimentos: 62
  },
  {
    id: "prof-3",
    name: "Dra. Beatriz Ramos",
    foto: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80",
    profissao: "Psicóloga Infantojuvenil",
    crp: "CRP 06/172340",
    especialidade: "Adolescentes, Crianças & Orientação Familiar",
    abordagem: "Terapia Cognitivo-Comportamental & Ludoterapia",
    whatsapp: "11988776655",
    cidade: "Campinas",
    estado: "SP",
    biografia: "Dedicada ao acolhimento e desenvolvimento de crianças e adolescentes. Apoio a questões escolares, TDAH, ansiedade e fortalecimento do diálogo familiar.",
    servicosPrestados: ["terapia_adolescente", "terapia_infantil"],
    turnos: ["tarde", "noite", "sabados"],
    palavrasChave: ["adolescente", "infantil", "crianca", "tdah", "escola", "familia", "ansiedade"],
    nota: 4.9,
    totalAtendimentos: 55
  },
  {
    id: "prof-4",
    name: "Dr. Eduardo Costa",
    foto: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80",
    profissao: "Psicólogo & Coach de Carreira",
    crp: "CRP 08/948210",
    especialidade: "Burnout, Gestão de Estresse & Carreira",
    abordagem: "Humanista & Psicologia Positiva",
    whatsapp: "41999887766",
    cidade: "Curitiba",
    estado: "PR",
    biografia: "Foco em prevenção e recuperação de Burnout, equilíbrio entre trabalho e vida pessoal, transição de carreira e desenvolvimento de liderança saudável.",
    servicosPrestados: ["terapia_individual_adulto", "orientacao_carreira"],
    turnos: ["manha", "noite"],
    palavrasChave: ["burnout", "estresse", "carreira", "trabalho", "lideranca", "ansiedade", "humanista"],
    nota: 4.8,
    totalAtendimentos: 41
  },
  {
    id: "prof-5",
    name: "Dra. Camila Nogueira",
    foto: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80",
    profissao: "Psicóloga & Terapeuta Familiar",
    crp: "CRP 06/158902",
    especialidade: "Terapia de Casal & Relacionamentos",
    abordagem: "Sistêmica & Familiar",
    whatsapp: "11977665544",
    cidade: "São Paulo",
    estado: "SP",
    biografia: "Especialista em mediação de conflitos conjugais, comunicação não-violenta e reconstrução de vínculos afetivos e familiares.",
    servicosPrestados: ["terapia_casal", "terapia_individual_adulto"],
    turnos: ["manha", "tarde", "noite", "sabados"],
    palavrasChave: ["casal", "familia", "sistemica", "relacionamento", "divorcio", "comunicacao"],
    nota: 5.0,
    totalAtendimentos: 73
  },
  {
    id: "prof-6",
    name: "Dr. Rafael Meireles",
    foto: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80",
    profissao: "Psicólogo Clínico",
    crp: "CRP 05/732114",
    especialidade: "Adolescentes e Adultos Jovens",
    abordagem: "TCC & Aceitação e Compromisso (ACT)",
    whatsapp: "21981234567",
    cidade: "Niterói",
    estado: "RJ",
    biografia: "Apoio a jovens e adolescentes com desafios de autoestima, pressão acadêmica, transição para o mercado de trabalho e crises de pânico.",
    servicosPrestados: ["terapia_adolescente", "terapia_individual_adulto"],
    turnos: ["tarde", "noite"],
    palavrasChave: ["adolescente", "autoestima", "ansiedade", "act", "panico", "tcc", "jovem"],
    nota: 4.9,
    totalAtendimentos: 39
  }
];

const QUEIXAS_RAPIDAS = [
  { id: "todas", label: "Todas as Queixas" },
  { id: "ansiedade", label: "Ansiedade & Pânico" },
  { id: "burnout", label: "Burnout & Estresse" },
  { id: "luto", label: "Luto & Perdas" },
  { id: "relacionamentos", label: "Relacionamentos" },
  { id: "depressao", label: "Depressão & Tristeza" },
  { id: "autoestima", label: "Autoestima" },
];

const TURNOS_OPCOES = [
  { id: "todos", label: "Qualquer Horário" },
  { id: "manha", label: "Manhã" },
  { id: "tarde", label: "Tarde" },
  { id: "noite", label: "Noite (após 18h)" },
  { id: "sabados", label: "Sábados" },
];

export function AcolhimentoCorporativoView({ onBackToSelection, onNavigate }: AcolhimentoCorporativoProps) {
  // 1. Estados de Autenticação da Empresa
  const [inputCode, setInputCode] = useState("");
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [empresaValidated, setEmpresaValidated] = useState<EmpresaData | null>(null);
  const [codeError, setCodeError] = useState("");

  // 2. Fluxo: "etapa1" (Identificação, Cargo, Titular/Dependente e Tabela de Valores) ou "etapa2" (Vitrine com Filtros Fixos)
  const [etapaAtual, setEtapaAtual] = useState<"identificacao" | "vitrine">("identificacao");

  // 3. Dados do Colaborador
  const [colaboradorNome, setColaboradorNome] = useState("");
  const [colaboradorWhatsapp, setColaboradorWhatsapp] = useState("");
  const [selectedCargoId, setSelectedCargoId] = useState<string>("");
  
  // Titular vs Dependente
  const [beneficiarioTipo, setBeneficiarioTipo] = useState<"titular" | "dependente">("titular");
  const [dependenteParentesco, setDependenteParentesco] = useState<string>("Filho(a) / Adolescente");
  const [dependenteInfo, setDependenteInfo] = useState<string>("");

  // Termo / Concordância de Valores
  const [concordouValores, setConcordouValores] = useState(false);
  const [formError, setFormError] = useState("");

  // 4. Configurações Ativas de Benefício da Empresa
  const [cargosDisponiveis, setCargosDisponiveis] = useState<CargoEmpresa[]>(DEFAULT_CARGOS_EMPRESA);
  const [servicosDisponiveis, setServicosDisponiveis] = useState<ServicoCorporativoConfig[]>(DEFAULT_SERVICOS_CORPORATIVOS);

  // 5. Filtros em Tempo Real da Vitrine (Sticky)
  const [filtroServico, setFiltroServico] = useState<string>("todos");
  const [filtroQueixa, setFiltroQueixa] = useState<string>("todas");
  const [filtroTurno, setFiltroTurno] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // 6. Lista de Profissionais
  const [profissionais, setProfissionais] = useState<ProfissionalItem[]>(FALLBACK_PROFISSIONAIS);
  const [loadingProfs, setLoadingProfs] = useState(false);

  // 7. Página Completa do Profissional & Card Flutuante da Abordagem
  const [profissionalPaginaAtivo, setProfissionalPaginaAtivo] = useState<ProfissionalItem | null>(null);
  const [abordagemAtivaId, setAbordagemAtivaId] = useState<string | null>(null);
  const [artigosProfissionalPagina, setArtigosProfissionalPagina] = useState<any[]>([]);
  const [loadingArtigosProf, setLoadingArtigosProf] = useState(false);
  const [copiouLinkPerfil, setCopiouLinkPerfil] = useState(false);

  // 8. Modal de Contato com Profissional
  const [selectedProfissionalModal, setSelectedProfissionalModal] = useState<ProfissionalItem | null>(null);
  const [isLoggingContact, setIsLoggingContact] = useState(false);
  const [contactSuccessAlert, setContactSuccessAlert] = useState(false);

  // 9. Modal de Configuração Obrigatória de Foco & Turno antes de abrir WhatsApp + Ficha de Bordo
  const [modalConfigurarContato, setModalConfigurarContato] = useState<{
    isOpen: boolean;
    prof: ProfissionalItem | null;
    servicoId: string;
    turno: string;
    queixa: string;
    erroValidacao?: string;
  }>({
    isOpen: false,
    prof: null,
    servicoId: "",
    turno: "",
    queixa: "",
    erroValidacao: "",
  });

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [etapaAtual]);

  // Carrega artigos publicados do profissional selecionado na página completa
  useEffect(() => {
    if (!profissionalPaginaAtivo?.id) {
      setArtigosProfissionalPagina([]);
      return;
    }
    setLoadingArtigosProf(true);
    const qArtigos = query(
      collection(db, "artigos_blog"),
      where("autorUid", "==", profissionalPaginaAtivo.id)
    );
    getDocs(qArtigos)
      .then((snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          if (d.status === "publicado") {
            list.push({ id: docSnap.id, ...d });
          }
        });
        setArtigosProfissionalPagina(list);
      })
      .catch((err) => {
        console.warn("Erro ao carregar artigos do profissional:", err);
      })
      .finally(() => {
        setLoadingArtigosProf(false);
      });
  }, [profissionalPaginaAtivo]);

  // Carrega profissionais cadastrados no Firestore (com foto)
  useEffect(() => {
    setLoadingProfs(true);
    const q = query(collection(db, "users"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const loaded: ProfissionalItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const roles = Array.isArray(data.roles) ? data.roles : [];
          const isProf = data.role === "profissional" || roles.includes("profissional");

          if (isProf && data.ativo !== false) {
            const foto = data.photoUrl || data.foto || data.photoURL || data.avatar || "";
            if (!foto) return; // apenas com foto profissional

            const tagsList: string[] = [];
            if (Array.isArray(data.palavrasChave)) tagsList.push(...data.palavrasChave);
            if (Array.isArray(data.tags)) tagsList.push(...data.tags);
            if (Array.isArray(data.especialidades)) tagsList.push(...data.especialidades);
            if (Array.isArray(data.abordagens)) tagsList.push(...data.abordagens);

            // Determina serviços prestados
            const servicos: string[] = [];
            if (Array.isArray(data.servicosPrestados)) {
              servicos.push(...data.servicosPrestados);
            } else {
              const text = tagsList.join(" ").toLowerCase() + " " + (data.biografia || "").toLowerCase();
              if (text.includes("casal") || text.includes("conjugal")) servicos.push("terapia_casal");
              if (text.includes("adolescente") || text.includes("jovem")) servicos.push("terapia_adolescente");
              if (text.includes("infantil") || text.includes("crianca")) servicos.push("terapia_infantil");
              if (text.includes("carreira") || text.includes("burnout") || text.includes("vocacional")) servicos.push("orientacao_carreira");
              servicos.push("terapia_individual_adulto"); // padrão
            }

            loaded.push({
              id: docSnap.id,
              name: data.name || data.nome || "Profissional AcolheMente",
              foto,
              profissao: data.cargo || data.profissao || (data.crp ? "Psicólogo(a) Clínico(a)" : "Terapeuta"),
              crp: data.crp ? `CRP ${data.crp}` : "Profissional Credenciado",
              especialidade: data.especialidade || (Array.isArray(data.especialidades) ? data.especialidades.join(", ") : "Psicoterapia Geral"),
              abordagem: data.abordagem || (Array.isArray(data.abordagens) ? data.abordagens.join(", ") : "Humanista / TCC"),
              whatsapp: data.whatsapp || data.telefone || "11999999999",
              telefone: data.telefone || data.whatsapp || "",
              cidade: data.cidade || "São Paulo",
              estado: data.estado || data.uf || "SP",
              biografia: data.biografia || data.bio || "Profissional comprometido com o acolhimento acolhedor e sigiloso de colaboradores.",
              bioCurta: data.bioCurta || "",
              instagramUrl: data.instagramUrl || "",
              linkedinUrl: data.linkedinUrl || "",
              siteUrl: data.siteUrl || "",
              horasDisponiveis: data.horasDisponiveis || "",
              servicosOferecidos: Array.isArray(data.servicosOferecidos) ? data.servicosOferecidos : [],
              outrosServicos: data.outrosServicos || "",
              formacao: data.formacao || data.graduacao || "",
              modalidade: data.modalidade || "Atendimento Online Sigiloso",
              servicosPrestados: servicos,
              turnos: Array.isArray(data.turnos) ? data.turnos : ["manha", "tarde", "noite", "sabados"],
              palavrasChave: tagsList,
              nota: 4.9,
              totalAtendimentos: Math.floor(25 + Math.random() * 40)
            });
          }
        });

        if (loaded.length > 0) {
          setProfissionais(loaded);
        } else {
          setProfissionais(FALLBACK_PROFISSIONAIS);
        }
        setLoadingProfs(false);
      },
      (err) => {
        console.warn("Erro ao buscar profissionais da rede no Firestore, usando base padrão:", err);
        setProfissionais(FALLBACK_PROFISSIONAIS);
        setLoadingProfs(false);
      }
    );

    return () => unsub();
  }, []);

  // Validação do Código da Empresa
  const handleValidateCompanyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = inputCode.trim().toUpperCase();
    if (!cleanCode) {
      setCodeError("Por favor, digite o código da sua empresa.");
      return;
    }

    setIsValidatingCode(true);
    setCodeError("");

    try {
      // 1. Busca no Firestore em 'empresa_leads'
      const q = query(
        collection(db, "empresa_leads"),
        where("codigoAcesso", "==", cleanCode)
      );
      const snapshot = await getDocs(q);

      let matchedData: EmpresaData | null = null;

      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        const data = docSnap.data() as any;
        matchedData = {
          id: docSnap.id,
          nomeEmpresa: data.nomeEmpresa || "Empresa Parceira",
          cnpj: data.cnpj,
          codigoAcesso: data.codigoAcesso || cleanCode,
          logoUrl: data.logoUrl || "",
          slogan: data.slogan || "Cuidando do bem-estar e da saúde mental da nossa equipe em parceria com a AcolheMente.",
          email: data.email,
          beneficioConfig: data.beneficioConfig,
        };
      } else {
        // Fallback: varre todas as empresas
        const allDocs = await getDocs(collection(db, "empresa_leads"));
        allDocs.forEach((docSnap) => {
          const data = docSnap.data() as any;
          if (
            (data.codigoAcesso && data.codigoAcesso.trim().toUpperCase() === cleanCode) ||
            (data.nomeEmpresa && data.nomeEmpresa.trim().toUpperCase() === cleanCode)
          ) {
            matchedData = {
              id: docSnap.id,
              nomeEmpresa: data.nomeEmpresa,
              cnpj: data.cnpj,
              codigoAcesso: data.codigoAcesso || cleanCode,
              logoUrl: data.logoUrl || "",
              slogan: data.slogan || "Cuidando do bem-estar e da saúde mental da nossa equipe em parceria com a AcolheMente.",
              email: data.email,
              beneficioConfig: data.beneficioConfig,
            };
          }
        });
      }

      // Se for código de teste comum ou se não encontrou, criamos empresa demonstrativa para permitir teste imediato
      if (!matchedData) {
        if (cleanCode.startsWith("EMP") || cleanCode.startsWith("CORP") || cleanCode === "DEMO" || cleanCode === "TESTE") {
          matchedData = {
            id: "empresa-demo",
            nomeEmpresa: "Empresa Parceira Corporativa",
            codigoAcesso: cleanCode,
            logoUrl: "",
            slogan: "Cuidando da saúde emocional e mental da nossa equipe através do benefício AcolheMente.",
            beneficioConfig: {
              cargos: DEFAULT_CARGOS_EMPRESA,
              servicos: DEFAULT_SERVICOS_CORPORATIVOS
            }
          };
        }
      }

      if (matchedData) {
        setEmpresaValidated(matchedData);
        
        // Aplica configurações de cargos e serviços da empresa
        const cargos = matchedData.beneficioConfig?.cargos && matchedData.beneficioConfig.cargos.length > 0
          ? matchedData.beneficioConfig.cargos
          : DEFAULT_CARGOS_EMPRESA;
        const servicos = matchedData.beneficioConfig?.servicos && matchedData.beneficioConfig.servicos.length > 0
          ? matchedData.beneficioConfig.servicos
          : DEFAULT_SERVICOS_CORPORATIVOS;

        setCargosDisponiveis(cargos);
        setServicosDisponiveis(servicos);
        setSelectedCargoId(cargos[0]?.id || "analista");
        setEtapaAtual("identificacao");
      } else {
        setCodeError("Código corporativo não encontrado. Verifique com o RH da sua empresa ou utilize o código de teste 'EMP-2026'.");
      }
    } catch (err) {
      console.error("Erro ao validar código da empresa:", err);
      setCodeError("Erro momentâneo de conexão. Tente novamente.");
    } finally {
      setIsValidatingCode(false);
    }
  };

  // Preço e frequência do cargo selecionado para determinado serviço
  const getPrecoInfoDoCargo = (servico: ServicoCorporativoConfig, cargoId: string) => {
    return (
      servico.precosPorCargo[cargoId] || {
        valorSessao: 80,
        frequenciaRecomendada: "Semanal (4 sessões/mês)",
        sessoesMesEstimadas: 4,
      }
    );
  };

  // Quando o colaborador confirma os dados e avança para a vitrine
  const handleAvancarParaVitrine = (servicoPreselecionado?: string) => {
    setFormError("");
    if (!colaboradorNome.trim()) {
      setFormError("Por favor, digite seu nome completo.");
      return;
    }
    if (!colaboradorWhatsapp.trim() || colaboradorWhatsapp.replace(/\D/g, "").length < 8) {
      setFormError("Por favor, digite seu WhatsApp com DDD para contato.");
      return;
    }
    if (!selectedCargoId) {
      setFormError("Por favor, selecione seu cargo ou nível na empresa.");
      return;
    }
    if (beneficiarioTipo === "dependente" && !dependenteInfo.trim()) {
      setFormError("Por favor, informe o nome e idade aproximada do seu dependente.");
      return;
    }

    if (servicoPreselecionado) {
      setFiltroServico(servicoPreselecionado);
    } else if (beneficiarioTipo === "dependente") {
      if (dependenteParentesco.toLowerCase().includes("filho") || dependenteParentesco.toLowerCase().includes("adolescente")) {
        setFiltroServico("terapia_adolescente");
      } else if (dependenteParentesco.toLowerCase().includes("cônjuge") || dependenteParentesco.toLowerCase().includes("parceiro")) {
        setFiltroServico("terapia_casal");
      } else {
        setFiltroServico("todos");
      }
    } else {
      setFiltroServico("terapia_individual_adulto");
    }

    setConcordouValores(true);
    setEtapaAtual("vitrine");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Algoritmo de Busca e Filtro em Tempo Real
  const profissionaisFiltrados = useMemo(() => {
    return profissionais.filter((prof) => {
      // 1. Filtro excludente por Serviço Procurado
      if (filtroServico && filtroServico !== "todos") {
        const prestou = Array.isArray(prof.servicosPrestados) && prof.servicosPrestados.includes(filtroServico);
        if (!prestou) {
          // Checa também via palavras-chave
          const corpus = [
            prof.profissao,
            prof.especialidade,
            prof.biografia,
            ...(prof.palavrasChave || [])
          ].join(" ").toLowerCase();

          if (filtroServico === "terapia_casal" && !corpus.includes("casal") && !corpus.includes("relacionamento")) return false;
          if (filtroServico === "terapia_adolescente" && !corpus.includes("adolescente") && !corpus.includes("jovem")) return false;
          if (filtroServico === "terapia_infantil" && !corpus.includes("infantil") && !corpus.includes("crianca")) return false;
          if (filtroServico === "orientacao_carreira" && !corpus.includes("carreira") && !corpus.includes("burnout")) return false;
        }
      }

      // 2. Filtro por Queixa
      if (filtroQueixa && filtroQueixa !== "todas") {
        const corpus = [
          prof.profissao,
          prof.especialidade,
          prof.abordagem,
          prof.biografia,
          ...(prof.palavrasChave || [])
        ].join(" ").toLowerCase();

        if (!corpus.includes(filtroQueixa)) {
          return false;
        }
      }

      // 3. Filtro por Turno
      if (filtroTurno && filtroTurno !== "todos") {
        if (Array.isArray(prof.turnos) && !prof.turnos.includes(filtroTurno)) {
          return false;
        }
      }

      // 4. Busca Semântica / Textual Livre
      if (searchQuery.trim()) {
        const queryTerms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
        const corpus = [
          prof.name,
          prof.profissao,
          prof.especialidade,
          prof.abordagem,
          prof.cidade,
          prof.estado,
          prof.biografia,
          ...(prof.palavrasChave || [])
        ].join(" ").toLowerCase();

        const matchAll = queryTerms.every((term) => corpus.includes(term));
        if (!matchAll) return false;
      }

      return true;
    });
  }, [profissionais, filtroServico, filtroQueixa, filtroTurno, searchQuery]);

  // Mensagem Automática Estruturada para WhatsApp
  const generateWhatsAppMessage = (
    prof: ProfissionalItem,
    servicoId: string,
    turnoId: string,
    queixaTexto: string
  ) => {
    const nomeEmpresa = empresaValidated?.nomeEmpresa || "nossa empresa";
    const cargoObj = cargosDisponiveis.find((c) => c.id === selectedCargoId);
    const cargoNome = cargoObj?.nome || "Colaborador";

    // Nome do serviço ativo
    const servObj = servicosDisponiveis.find((s) => s.servicoId === servicoId);
    const servNome = servObj ? servObj.nome : "Atendimento Psicoterapêutico";
    
    // Condição de preço
    const precoInfo = servObj 
      ? getPrecoInfoDoCargo(servObj, selectedCargoId)
      : { valorSessao: 80, frequenciaRecomendada: "Semanal (4 sessões/mês)" };

    const turnoLabel = TURNOS_OPCOES.find((t) => t.id === turnoId)?.label || turnoId || "A combinar";
    const queixaLinha = queixaTexto?.trim() ? `• 📝 *Demanda / Queixa:* ${queixaTexto.trim()}\n` : "";

    if (beneficiarioTipo === "dependente") {
      return `Olá, Dr(a). ${prof.name}! Tudo bem?\n\nMeu nome é *${colaboradorNome}*, sou colaborador(a) na empresa *${nomeEmpresa}* (Função: ${cargoNome}) através do convênio corporativo com a AcolheMente.\n\nEncontrei seu perfil na plataforma e gostaria de verificar sua disponibilidade de atendimento para meu/minha dependente:\n• 👤 *Paciente Dependente:* ${dependenteInfo} (${dependenteParentesco})\n• 🛋️ *Serviço Procurado:* ${servNome}\n${queixaLinha}• 🏷️ *Condição do Benefício:* R$ ${precoInfo.valorSessao},00 por sessão\n• 🔄 *Frequência Recomendada:* ${precoInfo.frequenciaRecomendada}\n• ⏰ *Turno de Preferência:* ${turnoLabel}\n\nVocê teria vaga para iniciarmos o acolhimento? Fico no aguardo para combinarmos os detalhes! Muito obrigado(a).`;
    }

    return `Olá, Dr(a). ${prof.name}! Tudo bem?\n\nMeu nome é *${colaboradorNome}*, sou colaborador(a) na empresa *${nomeEmpresa}* (Função: ${cargoNome}) através do convênio corporativo com a AcolheMente.\n\nEncontrei seu perfil na plataforma e gostaria de verificar sua disponibilidade de horários para atendimento:\n• 🛋️ *Serviço Procurado:* ${servNome}\n${queixaLinha}• 🏷️ *Condição do Benefício:* R$ ${precoInfo.valorSessao},00 por sessão\n• 🔄 *Frequência Recomendada:* ${precoInfo.frequenciaRecomendada}\n• ⏰ *Turno de Preferência:* ${turnoLabel}\n\nVocê teria vaga para iniciarmos as sessões? Fico no aguardo para combinarmos o melhor dia e horário! Muito obrigado(a).`;
  };

  // Gatilho inicial ao clicar em falar pelo WhatsApp:
  // Abre o modal obrigatório de Foco & Turno (bloqueando contato sem escolha prévia)
  const handleClicarWhatsApp = (prof: ProfissionalItem) => {
    const servicoInicial = filtroServico !== "todos" ? filtroServico : "";
    const turnoInicial = filtroTurno !== "todos" ? filtroTurno : "";

    setModalConfigurarContato({
      isOpen: true,
      prof,
      servicoId: servicoInicial,
      turno: turnoInicial,
      queixa: "",
      erroValidacao: "",
    });
  };

  // Confirmação final no modal: Grava Ficha de Bordo em triagem_corporativa com status "solicitacao_servico" e abre WhatsApp
  const handleConfirmarEAbrirWhatsApp = async () => {
    const { prof, servicoId, turno, queixa } = modalConfigurarContato;
    if (!prof) return;

    if (!servicoId) {
      setModalConfigurarContato((prev) => ({
        ...prev,
        erroValidacao: "Por favor, selecione o Foco do Acolhimento (Serviço desejado).",
      }));
      return;
    }

    if (!turno) {
      setModalConfigurarContato((prev) => ({
        ...prev,
        erroValidacao: "Por favor, selecione o Período de disponibilidade de horários.",
      }));
      return;
    }

    if (!queixa.trim()) {
      setModalConfigurarContato((prev) => ({
        ...prev,
        erroValidacao: "Por favor, relate brevemente sua queixa ou motivo pelo qual busca atendimento.",
      }));
      return;
    }

    setIsLoggingContact(true);
    try {
      const cargoObj = cargosDisponiveis.find((c) => c.id === selectedCargoId);
      const servObj = servicosDisponiveis.find((s) => s.servicoId === servicoId);
      const precoInfo = servObj
        ? getPrecoInfoDoCargo(servObj, selectedCargoId)
        : { valorSessao: 80, frequenciaRecomendada: "Semanal (4 sessões/mês)" };

      const turnoLabel = TURNOS_OPCOES.find((t) => t.id === turno)?.label || turno;

      // 1. CRIAÇÃO DA FICHA DE BORDO NA TRIAGEM CORPORATIVA (status: solicitacao_servico)
      await addDoc(collection(db, "triagem_corporativa"), {
        status: "solicitacao_servico",
        tipoAcolhimento: "corporativo",
        empresaId: empresaValidated?.id || "empresa-demo",
        empresaNome: empresaValidated?.nomeEmpresa || "Empresa Parceira",
        codigoAcesso: empresaValidated?.codigoAcesso || "",
        colaboradorNome: colaboradorNome.trim(),
        colaboradorWhatsapp: colaboradorWhatsapp.trim(),
        cargoId: selectedCargoId,
        cargoNome: cargoObj?.nome || "Colaborador",
        beneficiarioTipo: beneficiarioTipo, // "titular" | "dependente"
        dependenteInfo: beneficiarioTipo === "dependente" ? dependenteInfo.trim() : "",
        dependenteParentesco: beneficiarioTipo === "dependente" ? dependenteParentesco : "",
        servicoId: servObj?.servicoId || servicoId,
        servicoNome: servObj?.nome || "Psicoterapia Individual",
        turnoPreferencia: turnoLabel,
        queixa: queixa.trim(),
        valorSessao: precoInfo.valorSessao,
        frequenciaRecomendada: precoInfo.frequenciaRecomendada,
        profissionalId: prof.id,
        profissionalNome: prof.name,
        profissionalCrp: prof.crp || "",
        profissionalFoto: prof.foto || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        historico: [
          {
            data: new Date().toISOString(),
            autor: "Colaborador",
            acao: "Solicitação de Serviço criada ao contatar profissional via WhatsApp",
            detalhes: `Profissional requisitado: ${prof.name}. Turno: ${turnoLabel}. Queixa informada.`,
          },
        ],
      });

      // 2. Gravação na coleção de acessos corporativos (para métricas e auditoria do RH)
      await addDoc(collection(db, "beneficio_acessos"), {
        empresaId: empresaValidated?.id || "empresa-demo",
        empresaNome: empresaValidated?.nomeEmpresa || "Empresa Parceira",
        codigoAcesso: empresaValidated?.codigoAcesso || "",
        colaboradorNome: colaboradorNome.trim(),
        colaboradorWhatsapp: colaboradorWhatsapp.trim(),
        cargoId: selectedCargoId,
        cargoNome: cargoObj?.nome || "Não informado",
        tipoBeneficiario: beneficiarioTipo,
        parentesco: beneficiarioTipo === "dependente" ? dependenteParentesco : "Titular",
        dependenteInfo: beneficiarioTipo === "dependente" ? dependenteInfo.trim() : "",
        servicoId: servObj?.servicoId || servicoId,
        servicoNome: servObj?.nome || "Psicoterapia Geral",
        valorSessao: precoInfo.valorSessao,
        frequenciaRecomendada: precoInfo.frequenciaRecomendada,
        turnoPreferencia: turnoLabel,
        queixa: queixa.trim(),
        profissionalId: prof.id,
        profissionalNome: prof.name,
        profissionalCrp: prof.crp || "",
        createdAt: serverTimestamp(),
      });

      // Atualiza também os filtros da vitrine para refletir a escolha do colaborador
      if (filtroServico !== servicoId) setFiltroServico(servicoId);
      if (filtroTurno !== turno) setFiltroTurno(turno);

      // Abre o WhatsApp
      const rawNumber = prof.whatsapp?.replace(/\D/g, "") || "11999999999";
      const fullNumber = rawNumber.startsWith("55") ? rawNumber : `55${rawNumber}`;
      const msgTexto = generateWhatsAppMessage(prof, servicoId, turno, queixa);
      const textEncoded = encodeURIComponent(msgTexto);
      const waUrl = `https://wa.me/${fullNumber}?text=${textEncoded}`;

      window.open(waUrl, "_blank", "noopener,noreferrer");

      setModalConfigurarContato({
        isOpen: false,
        prof: null,
        servicoId: "",
        turno: "",
        queixa: "",
        erroValidacao: "",
      });
      setContactSuccessAlert(true);
    } catch (err) {
      console.error("Erro ao registrar solicitação corporativa:", err);
      setModalConfigurarContato((prev) => ({
        ...prev,
        erroValidacao: "Houve um erro ao processar sua solicitação. Tente novamente.",
      }));
    } finally {
      setIsLoggingContact(false);
    }
  };

  // Se a empresa ainda não foi validada, exibe a tela de login por código da empresa
  if (!empresaValidated) {
    return (
      <div className="min-h-[85vh] bg-warm flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-white rounded-3xl border border-soft shadow-lg p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBackToSelection}
              className="text-xs font-bold text-forest/70 hover:text-forest flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <span className="px-2.5 py-1 bg-sun-light/60 text-forest text-[11px] font-bold uppercase tracking-wider rounded-lg">
              Portal Corporativo
            </span>
          </div>

          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-forest rounded-2xl flex items-center justify-center text-sun mx-auto shadow-md">
              <Building2 className="w-7 h-7" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-forest">
              Acolhimento Corporativo
            </h2>
            <p className="text-xs text-forest/75 leading-relaxed">
              Digite o código de acesso exclusivo da sua empresa para desbloquear as condições personalizadas de atendimento psicológico.
            </p>
          </div>

          <form onSubmit={handleValidateCompanyCode} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-forest/60" /> Código da sua Empresa
              </label>
              <input
                type="text"
                value={inputCode}
                onChange={(e) => {
                  setInputCode(e.target.value.toUpperCase());
                  setCodeError("");
                }}
                placeholder="Ex: EMP-2026 ou NOME-CORP"
                className="w-full font-mono font-bold text-center tracking-widest text-base uppercase px-4 py-3 bg-warm/30 border border-soft rounded-xl focus:outline-none focus:border-forest text-forest placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-forest/40"
              />
            </div>

            {codeError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-medium flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span>{codeError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isValidatingCode || !inputCode.trim()}
              className="w-full py-3.5 bg-forest hover:bg-forest/90 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isValidatingCode ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-sun" />
                  <span>Validando Convênio...</span>
                </>
              ) : (
                <>
                  <span>Desbloquear Benefício</span>
                  <ArrowRight className="w-4 h-4 text-sun" />
                </>
              )}
            </button>
          </form>

          {/* Dica de teste amigável */}
          <div className="p-3 bg-warm/50 rounded-xl border border-soft/80 text-[11px] text-forest/70 space-y-1">
            <p className="font-bold flex items-center gap-1 text-forest">
              <Sparkles className="w-3.5 h-3.5 text-sun-dark" />
              Ambiente de Demonstração Corporativa:
            </p>
            <p>
              Caso esteja testando a plataforma, você pode usar o código de demonstração:{" "}
              <button
                type="button"
                onClick={() => setInputCode("EMP-2026")}
                className="font-mono font-bold text-forest underline cursor-pointer hover:text-sun-dark"
              >
                EMP-2026
              </button>
            </p>
          </div>

          <div className="pt-2 border-t border-soft text-center">
            <p className="text-[11px] text-forest/60 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              100% Sigiloso • Em conformidade com o Código de Ética e LGPD
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Se validado: Renderiza Etapa 1 ou Etapa 2
  return (
    <div className="w-full max-w-full min-w-0 min-h-screen bg-warm/40 text-forest pb-20 box-border overflow-x-clip">
      
      {/* HEADER DE MARCA DA EMPRESA PARCEIRA */}
      <header className="w-full max-w-full bg-white border-b border-soft sticky top-0 z-30 shadow-2xs">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            {empresaValidated.logoUrl ? (
              <img
                src={empresaValidated.logoUrl}
                alt={empresaValidated.nomeEmpresa}
                className="h-9 sm:h-10 max-w-[110px] sm:max-w-[130px] object-contain shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-forest flex items-center justify-center text-sun shadow-2xs font-bold text-xs sm:text-sm shrink-0">
                {empresaValidated.nomeEmpresa.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="font-serif font-bold text-xs sm:text-sm text-forest leading-tight truncate">
                  {empresaValidated.nomeEmpresa}
                </span>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold rounded-full shrink-0">
                  Benefício Ativo
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-forest/60 truncate">
                Parceria com o Projeto AcolheMente
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {etapaAtual === "vitrine" && (
              <button
                type="button"
                onClick={() => setEtapaAtual("identificacao")}
                className="px-2.5 sm:px-3 py-1.5 text-xs font-bold text-forest/80 hover:text-forest bg-warm/60 hover:bg-warm rounded-xl border border-soft transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ajustar Cargo / Dados</span>
                <span className="sm:hidden">Voltar</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setEmpresaValidated(null)}
              className="text-[11px] text-forest/50 hover:text-red-500 font-medium transition-colors cursor-pointer px-1.5 sm:px-2 py-1 whitespace-nowrap"
            >
              Trocar Empresa
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* ETAPA 1: IDENTIFICAÇÃO RÁPIDA, CARGO, TITULAR/DEPENDENTE & TABELA DE VALORES */}
      {/* ========================================================================= */}
      {etapaAtual === "identificacao" && (
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8 animate-in fade-in duration-300 min-w-0 box-border">
          
          {/* Banner de Acolhimento & Sigilo */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-soft shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-soft pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-sun-dark">
                  Bem-vindo(a) ao seu espaço de cuidado
                </span>
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-forest mt-1">
                  Seu Benefício de Saúde Emocional
                </h1>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-semibold self-start sm:self-auto">
                <Lock className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Sigilo 100% Garantido</span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-forest/80 leading-relaxed">
              {empresaValidated.slogan || "Cuidando da sua saúde mental com profissionais qualificados e condições acessíveis."}
              <br className="hidden sm:inline" />
              <span className="text-forest font-medium"> A sua empresa não recebe nenhuma informação sobre suas consultas, queixas ou terapeutas escolhidos.</span>
            </p>

            {/* Destaque com Apelo Visual: Comparativo de Mercado e Valores Facilitados */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-sun-light/50 via-warm/40 to-emerald-50/40 border border-sun/40 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-3.5 sm:gap-4 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-forest text-sun flex items-center justify-center shrink-0 shadow-2xs">
                <Sparkles className="w-5 h-5 text-sun" />
              </div>
              <div className="space-y-1 text-xs sm:text-sm">
                <h4 className="font-bold text-forest text-xs sm:text-sm flex items-center gap-1.5">
                  Cuidado de alto padrão por um valor realmente acessível
                </h4>
                <p className="text-forest/85 leading-relaxed text-xs sm:text-[13px]">
                  Enquanto uma consulta particular tradicional no mercado custa no mínimo <strong className="text-forest underline decoration-forest/30 font-bold">R$ 150,00</strong>, através do convênio com a sua empresa você e sua família contam com psicólogos credenciados a <strong className="text-emerald-900 bg-emerald-100/70 px-1.5 py-0.5 rounded font-bold">valores sociais exclusivos e facilitados</strong>, viabilizando um acompanhamento contínuo e sustentável.
                </p>
              </div>
            </div>
          </div>

          {/* Formulário de Identificação & Cargo */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-soft shadow-xs space-y-6">
            <div className="border-b border-soft pb-3">
              <h3 className="font-serif text-lg font-bold text-forest flex items-center gap-2">
                <User className="w-5 h-5 text-forest/70" />
                1. Seus Dados de Acesso
              </h3>
              <p className="text-xs text-forest/60">
                Necessários para o terapeuta saber quem você é ao iniciar a conversa no WhatsApp.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-forest/80">
                  Seu Nome Completo *
                </label>
                <input
                  type="text"
                  value={colaboradorNome}
                  onChange={(e) => setColaboradorNome(e.target.value)}
                  placeholder="Ex: Mariana Ferreira"
                  className="w-full text-xs sm:text-sm px-4 py-2.5 bg-warm/30 border border-soft rounded-xl focus:outline-none focus:border-forest text-forest"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-forest/80">
                  Seu WhatsApp com DDD *
                </label>
                <input
                  type="tel"
                  value={colaboradorWhatsapp}
                  onChange={(e) => setColaboradorWhatsapp(e.target.value)}
                  placeholder="Ex: (11) 98765-4321"
                  className="w-full text-xs sm:text-sm px-4 py-2.5 bg-warm/30 border border-soft rounded-xl focus:outline-none focus:border-forest text-forest"
                />
              </div>
            </div>

            {/* SELEÇÃO DO CARGO NA EMPRESA */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-forest/60" /> Seu Cargo / Nível na Empresa *
              </label>
              <select
                value={selectedCargoId}
                onChange={(e) => setSelectedCargoId(e.target.value)}
                className="w-full text-xs sm:text-sm px-4 py-3 bg-warm/40 border border-soft rounded-xl focus:outline-none focus:border-forest text-forest font-bold cursor-pointer"
              >
                {cargosDisponiveis.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-forest/60">
                Os valores de coparticipação e limites de subsídio da sua empresa são ajustados conforme o seu nível de atuação.
              </p>
            </div>

            {/* QUEM É O PACIENTE: TITULAR OU DEPENDENTE? */}
            <div className="space-y-3 pt-3 border-t border-soft">
              <label className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-forest/60" /> Para quem é o atendimento psicológico? *
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBeneficiarioTipo("titular")}
                  className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                    beneficiarioTipo === "titular"
                      ? "bg-forest/5 border-forest text-forest shadow-xs ring-1 ring-forest/20"
                      : "bg-white border-soft text-forest/70 hover:bg-warm/30"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 shrink-0 ${
                    beneficiarioTipo === "titular" ? "border-forest bg-forest text-white" : "border-soft"
                  }`}>
                    {beneficiarioTipo === "titular" && <Check className="w-3 h-3" />}
                  </div>
                  <div>
                    <span className="font-bold text-xs sm:text-sm text-forest block">
                      Para mim mesmo(a)
                    </span>
                    <span className="text-[11px] text-forest/60">
                      Colaborador(a) titular da empresa.
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setBeneficiarioTipo("dependente")}
                  className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                    beneficiarioTipo === "dependente"
                      ? "bg-forest/5 border-forest text-forest shadow-xs ring-1 ring-forest/20"
                      : "bg-white border-soft text-forest/70 hover:bg-warm/30"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center mt-0.5 shrink-0 ${
                    beneficiarioTipo === "dependente" ? "border-forest bg-forest text-white" : "border-soft"
                  }`}>
                    {beneficiarioTipo === "dependente" && <Check className="w-3 h-3" />}
                  </div>
                  <div>
                    <span className="font-bold text-xs sm:text-sm text-forest block">
                      Para um dependente familiar
                    </span>
                    <span className="text-[11px] text-forest/60">
                      Filho(a), cônjuge ou familiar com benefício estendido.
                    </span>
                  </div>
                </button>
              </div>

              {/* Campos adicionais caso seja dependente */}
              {beneficiarioTipo === "dependente" && (
                <div className="p-4 bg-sun-light/30 border border-sun/30 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-forest/80">
                        Grau de Parentesco *
                      </label>
                      <select
                        value={dependenteParentesco}
                        onChange={(e) => setDependenteParentesco(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-soft rounded-xl focus:outline-none focus:border-forest text-forest font-semibold cursor-pointer"
                      >
                        <option value="Filho(a) / Criança">Filho(a) — Criança</option>
                        <option value="Filho(a) / Adolescente">Filho(a) — Adolescente</option>
                        <option value="Cônjuge / Parceiro(a)">Cônjuge / Parceiro(a)</option>
                        <option value="Pai / Mãe / Familiar">Pai / Mãe / Outro familiar</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-forest/80">
                        Nome e Idade do Dependente *
                      </label>
                      <input
                        type="text"
                        value={dependenteInfo}
                        onChange={(e) => setDependenteInfo(e.target.value)}
                        placeholder="Ex: Lucas Ferreira (14 anos)"
                        className="w-full text-xs px-3 py-2 bg-white border border-soft rounded-xl focus:outline-none focus:border-forest text-forest"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-forest/60">
                    O terapeuta saberá com antecedência a faixa etária para confirmar se atende à especialidade infantil ou juvenil.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PRÉVIA COMPLETA DOS SERVIÇOS, VALORES E FREQUÊNCIAS PARA O CARGO SELECIONADO */}
          {/* ========================================================================= */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-soft shadow-xs space-y-6">
            <div className="border-b border-soft pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-serif text-lg font-bold text-forest flex items-center gap-2">
                  <Layers className="w-5 h-5 text-forest/70" />
                  2. Seu Pacote de Serviços & Valores Pré-Acordados
                </h3>
                <p className="text-xs text-forest/60">
                  Condições fixadas para o seu cargo (
                  <span className="font-bold text-forest">
                    {cargosDisponiveis.find((c) => c.id === selectedCargoId)?.nome}
                  </span>
                  ). Não há negociação com o profissional:
                </p>
              </div>
              <span className="px-3 py-1 bg-warm rounded-xl text-[11px] font-bold text-forest/80 border border-soft self-start sm:self-auto">
                Transparência Total
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {servicosDisponiveis.map((serv) => {
                const preco = getPrecoInfoDoCargo(serv, selectedCargoId);
                const totalMensal = preco.valorSessao * preco.sessoesMesEstimadas;

                // Sugestão visual caso seja dependente
                const isRecomendadoDependente =
                  beneficiarioTipo === "dependente" &&
                  ((dependenteParentesco.toLowerCase().includes("filho") &&
                    (serv.servicoId === "terapia_adolescente" || serv.servicoId === "terapia_infantil")) ||
                    (dependenteParentesco.toLowerCase().includes("cônjuge") &&
                      serv.servicoId === "terapia_casal"));

                return (
                  <div
                    key={serv.servicoId}
                    className={`p-5 rounded-2xl border transition-all relative flex flex-col justify-between ${
                      isRecomendadoDependente
                        ? "bg-sun-light/30 border-sun/60 ring-1 ring-sun/30"
                        : "bg-warm/20 border-soft hover:border-forest/30"
                    }`}
                  >
                    {isRecomendadoDependente && (
                      <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 bg-forest text-white text-[10px] font-bold rounded-full shadow-2xs">
                        Recomendado para seu Dependente
                      </span>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-sm text-forest">{serv.nome}</h4>
                      </div>
                      <p className="text-[11px] text-forest/70 line-clamp-2 leading-relaxed">
                        {serv.descricao}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-soft/80 space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[11px] font-semibold text-forest/70">
                          Valor por Sessão:
                        </span>
                        <span className="text-base font-bold text-forest font-serif">
                          R$ {preco.valorSessao},00
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-forest/70">Frequência Sugerida:</span>
                        <span className="font-medium text-forest">{preco.frequenciaRecomendada}</span>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[11px] font-bold">
                        <span className="text-forest/80">Investimento Mensal Previsto:</span>
                        <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          R$ {totalMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAvancarParaVitrine(serv.servicoId)}
                        className="w-full mt-2 py-2 bg-white hover:bg-forest hover:text-white text-forest border border-soft rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <span>Escolher {serv.nome}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-medium flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* BOTÃO PRINCIPAL DE AVANÇO */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleAvancarParaVitrine()}
                className="w-full py-4 bg-forest hover:bg-forest/90 text-white rounded-2xl text-sm font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Concordo com as condições e quero escolher meu terapeuta</span>
                <ArrowRight className="w-4 h-4 text-sun" />
              </button>
              <p className="text-[11px] text-center text-forest/60 mt-2">
                O pagamento é realizado diretamente ao profissional a cada sessão ou por pacote acordado.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ETAPA 2: VITRINE DE PROFISSIONAIS COM FILTROS FIXOS (STICKY) EM TEMPO REAL */}
      {/* ========================================================================= */}
      {etapaAtual === "vitrine" && (
        <div className="w-full max-w-full min-w-0 space-y-6">
          
          {/* BARRA FIXA (STICKY) DE FILTROS RÁPIDOS */}
          <div className="sticky top-[64px] sm:top-[69px] z-20 bg-white/95 backdrop-blur-md border-b border-soft shadow-xs py-3 px-3 sm:px-6 transition-all w-full max-w-full box-border min-w-0">
            <div className="w-full max-w-7xl mx-auto space-y-2.5 sm:space-y-3 min-w-0">
              
              {/* Linha Superior: Resumo do Colaborador & Busca Semântica */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 w-full min-w-0">
                
                {/* Resumo do Benefício */}
                <div className="flex items-center gap-2 text-xs min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-forest text-sun flex items-center justify-center font-bold text-xs shrink-0">
                    {colaboradorNome.charAt(0).toUpperCase()}
                  </div>
                  <div className="leading-tight min-w-0">
                    <span className="font-bold text-forest truncate block">
                      {colaboradorNome}
                    </span>
                    <span className="text-forest/60 text-[10px] sm:text-[11px] truncate block">
                      {cargosDisponiveis.find((c) => c.id === selectedCargoId)?.nome} •{" "}
                      {beneficiarioTipo === "titular" ? "Titular" : `Dependente (${dependenteParentesco})`}
                    </span>
                  </div>
                </div>

                {/* Campo de Busca Semântica */}
                <div className="relative flex-1 max-w-full sm:max-w-md min-w-0">
                  <Search className="w-4 h-4 text-forest/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Busca: TCC, casal, burnout, luto, ansiedade..."
                    className="w-full text-xs pl-9 sm:pl-10 pr-12 py-2 bg-warm/40 border border-soft rounded-xl focus:outline-none focus:border-forest text-forest placeholder:text-forest/40"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="text-[10px] text-forest/50 hover:text-forest absolute right-3 top-1/2 -translate-y-1/2 font-bold cursor-pointer"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                <div className="text-right hidden lg:block shrink-0">
                  <span className="text-xs font-bold text-forest">
                    {profissionaisFiltrados.length} {profissionaisFiltrados.length === 1 ? "terapeuta disponível" : "terapeutas disponíveis"}
                  </span>
                </div>
              </div>

              {/* FILTRO 1: SERVIÇO PROCURADO (FILTRO OBRIGATÓRIO/EXCLUDENTE EM PILLS) */}
              <div className="w-full max-w-full flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold text-forest/60 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
                  <Layers className="w-3.5 h-3.5 text-forest/60" /> Serviço:
                </span>

                <button
                  type="button"
                  onClick={() => setFiltroServico("todos")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    filtroServico === "todos"
                      ? "bg-forest text-white shadow-xs"
                      : "bg-warm/60 text-forest/70 hover:bg-warm border border-soft"
                  }`}
                >
                  Todos os Serviços
                </button>

                {servicosDisponiveis.map((serv) => {
                  const isSelected = filtroServico === serv.servicoId;
                  const preco = getPrecoInfoDoCargo(serv, selectedCargoId);

                  return (
                    <button
                      key={serv.servicoId}
                      type="button"
                      onClick={() => setFiltroServico(serv.servicoId)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-forest text-white shadow-xs"
                          : "bg-warm/60 text-forest/70 hover:bg-warm border border-soft"
                      }`}
                    >
                      <span>{serv.nome}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                        isSelected ? "bg-white/20 text-white" : "bg-forest/10 text-forest"
                      }`}>
                        R$ {preco.valorSessao}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* FILTROS RÁPIDOS 2 & 3: QUEIXA E TURNO */}
              <div className="w-full max-w-full flex flex-col md:flex-row md:items-center justify-between gap-2 pt-2 border-t border-soft/60 min-w-0">
                {/* Queixas */}
                <div className="w-full md:w-auto flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none min-w-0">
                  <span className="text-[10px] font-bold text-forest/60 uppercase tracking-wider shrink-0 mr-0.5">
                    Foco:
                  </span>
                  {QUEIXAS_RAPIDAS.map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setFiltroQueixa(q.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        filtroQueixa === q.id
                          ? "bg-sun text-forest font-bold shadow-2xs"
                          : "bg-white text-forest/70 hover:bg-warm border border-soft/70"
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>

                {/* Turnos */}
                <div className="w-full md:w-auto flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none min-w-0">
                  <span className="text-[10px] font-bold text-forest/60 uppercase tracking-wider shrink-0 flex items-center gap-1 mr-0.5">
                    <Clock className="w-3 h-3 text-forest/60" /> Turno:
                  </span>
                  {TURNOS_OPCOES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFiltroTurno(t.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        filtroTurno === t.id
                          ? "bg-forest text-white font-bold shadow-2xs"
                          : "bg-white text-forest/70 hover:bg-warm border border-soft/70"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* GRID DE TERAPEUTAS CURADOS */}
          <section className="w-full max-w-7xl mx-auto px-3 sm:px-6 space-y-6 min-w-0 box-border">
            
            {/* Barra informativa do valor atual */}
            {(() => {
              const servAtivo = servicosDisponiveis.find((s) => s.servicoId === filtroServico);
              if (!servAtivo) return null;
              const preco = getPrecoInfoDoCargo(servAtivo, selectedCargoId);

              return (
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-emerald-950 w-full min-w-0 box-border">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">
                      Exibindo profissionais habilitados para <strong>{servAtivo.nome}</strong>.
                    </span>
                  </div>
                  <span className="px-3 py-1 bg-emerald-700 text-white font-bold rounded-xl text-[11px] shrink-0">
                    Sua condição: R$ {preco.valorSessao},00/sessão • {preco.frequenciaRecomendada}
                  </span>
                </div>
              );
            })()}

            {loadingProfs ? (
              <div className="py-20 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-forest mx-auto" />
                <p className="text-xs text-forest/60 font-medium">
                  Carregando profissionais da rede AcolheMente...
                </p>
              </div>
            ) : profissionaisFiltrados.length === 0 ? (
              <div className="bg-white p-8 sm:p-12 rounded-3xl border border-soft text-center space-y-4 max-w-lg mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-warm flex items-center justify-center text-forest/40 mx-auto">
                  <Compass className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-lg font-bold text-forest">
                  Nenhum profissional encontrado para os filtros atuais
                </h3>
                <p className="text-xs text-forest/60 leading-relaxed">
                  Tente alterar o serviço procurado, selecionar "Qualquer Horário" ou limpar os termos de busca livre.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFiltroServico("todos");
                    setFiltroQueixa("todas");
                    setFiltroTurno("todos");
                    setSearchQuery("");
                  }}
                  className="px-4 py-2 bg-forest text-white text-xs font-bold rounded-xl hover:bg-forest/90 transition-all cursor-pointer"
                >
                  Restaurar Todos os Filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 w-full min-w-0">
                {profissionaisFiltrados.map((prof) => {
                  const servObj = servicosDisponiveis.find((s) => s.servicoId === filtroServico);
                  const preco = servObj
                    ? getPrecoInfoDoCargo(servObj, selectedCargoId)
                    : { valorSessao: 80, frequenciaRecomendada: "Semanal" };

                  return (
                    <article
                      key={prof.id}
                      className="w-full min-w-0 bg-white rounded-3xl border border-soft hover:border-forest/40 transition-all shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden group box-border"
                    >
                      <div className="p-5 sm:p-6 space-y-4 min-w-0">
                        {/* Topo do Card: Foto, CRP e Nota */}
                        <div className="flex items-start gap-3.5 min-w-0">
                          <img
                            src={prof.foto}
                            alt={prof.name}
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border border-soft shadow-2xs shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1.5 min-w-0">
                              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 flex items-center gap-1 truncate min-w-0">
                                <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span className="truncate">{prof.crp || "Verificado"}</span>
                              </span>
                              <div className="flex items-center gap-1 text-xs font-bold text-forest shrink-0">
                                <Star className="w-3.5 h-3.5 fill-sun text-sun" />
                                <span>{prof.nota || 4.9}</span>
                              </div>
                            </div>
                            <h3 className="font-serif text-sm sm:text-base font-bold text-forest leading-tight group-hover:text-forest transition-colors truncate">
                              {prof.name}
                            </h3>
                            <p className="text-xs text-forest/70 font-medium truncate">
                              {prof.profissao}
                            </p>
                          </div>
                        </div>

                        {/* Especialidade e Abordagem com Botão/Card Flutuante */}
                        <div className="space-y-2.5 pt-1 min-w-0">
                          <div>
                            <p className="text-xs text-forest font-semibold line-clamp-1">
                              {prof.especialidade}
                            </p>
                          </div>

                          {/* Card / Botão Flutuante Explicativo da Abordagem */}
                          <div className="relative">
                            {(() => {
                              const explicacao = getExplicacaoAbordagem(prof.abordagem || "");
                              const isAtivo = abordagemAtivaId === prof.id;

                              return (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAbordagemAtivaId(isAtivo ? null : prof.id);
                                    }}
                                    className={`w-full text-left p-2 rounded-xl border text-[11px] transition-all flex items-center justify-between gap-1.5 cursor-pointer shadow-2xs group/btn ${
                                      isAtivo
                                        ? "bg-emerald-100/90 border-emerald-400 text-emerald-950 ring-2 ring-emerald-400/20"
                                        : "bg-emerald-50/70 hover:bg-emerald-100/70 border-emerald-200/80 text-emerald-900"
                                    }`}
                                    title="Clique para entender como funciona esta abordagem na prática"
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                                      <Lightbulb className="w-3.5 h-3.5 text-emerald-600 shrink-0 group-hover/btn:scale-110 transition-transform" />
                                      <span className="font-bold shrink-0 text-emerald-950">Abordagem:</span>
                                      <span className="truncate text-emerald-900 font-medium">{prof.abordagem}</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-emerald-800 bg-white/95 border border-emerald-200 px-1.5 py-0.5 rounded-md shadow-2xs shrink-0 flex items-center gap-0.5 group-hover/btn:bg-emerald-700 group-hover/btn:text-white transition-colors">
                                      <Sparkles className="w-2.5 h-2.5" />
                                      Entenda
                                    </span>
                                  </button>

                                  {/* Popover / Card Flutuante Explicativo */}
                                  {isAtivo && (
                                    <>
                                      {/* Backdrop para fechar ao clicar fora */}
                                      <div
                                        className="fixed inset-0 z-40"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setAbordagemAtivaId(null);
                                        }}
                                      />
                                      <div
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute left-0 right-0 top-full mt-2 z-50 p-4 bg-white rounded-2xl border border-emerald-300 shadow-xl text-forest space-y-2.5 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/5"
                                      >
                                        <div className="flex items-start justify-between gap-2 border-b border-soft/60 pb-2">
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0">
                                              <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                                            </div>
                                            <h4 className="font-bold text-xs text-forest leading-tight truncate">
                                              {explicacao.titulo}
                                            </h4>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => setAbordagemAtivaId(null)}
                                            className="text-forest/40 hover:text-forest p-1 rounded-md transition-colors"
                                            title="Fechar explicação"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>

                                        <p className="text-xs text-forest/80 leading-relaxed">
                                          {explicacao.descricao}
                                        </p>

                                        <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-100 text-[11px] space-y-1">
                                          <span className="font-bold text-emerald-950 block">Como funciona na prática:</span>
                                          <span className="text-forest/80 leading-snug block">
                                            {explicacao.comoFunciona}
                                          </span>
                                        </div>

                                        <div className="text-[10px] text-emerald-950/80 bg-warm/50 p-2 rounded-lg border border-soft flex items-start gap-1">
                                          <span className="font-bold shrink-0">Foco:</span>
                                          <span>{explicacao.beneficioPrincipal}</span>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </>
                              );
                            })()}
                          </div>

                          {/* Resumo do Sobre Mim no Card Inicial */}
                          <div className="space-y-1.5 pt-0.5 min-w-0">
                            <p className="text-xs text-forest/75 line-clamp-2 leading-relaxed">
                              {prof.bioCurta || prof.biografia || "Profissional dedicado ao acolhimento terapêutico humanizado e confidencial."}
                            </p>

                            {/* Oferta: Visitar página do profissional */}
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={() => setProfissionalPaginaAtivo(prof)}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 transition-colors group/link cursor-pointer py-1 px-2.5 rounded-lg bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200/70 shadow-2xs"
                              >
                                <User className="w-3.5 h-3.5 text-emerald-600 group-hover/link:scale-110 transition-transform" />
                                <span className="underline decoration-emerald-500/40 underline-offset-2">
                                  Visitar página do profissional
                                </span>
                                <ArrowRight className="w-3.5 h-3.5 text-emerald-600 group-hover/link:translate-x-0.5 transition-transform" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Badges de Serviços e Turnos */}
                        <div className="pt-2 flex flex-wrap gap-1.5 min-w-0">
                          {prof.servicosPrestados?.slice(0, 3).map((sId) => {
                            const sName = servicosDisponiveis.find((s) => s.servicoId === sId)?.nome || sId;
                            return (
                              <span
                                key={sId}
                                className="px-2 py-0.5 bg-warm/60 border border-soft text-[10px] font-medium text-forest/80 rounded-md truncate max-w-full"
                              >
                                {sName}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Rodapé do Card: Valor Tabelado & Botão de WhatsApp */}
                      <div className="p-4 sm:p-5 bg-warm/20 border-t border-soft/80 space-y-3 min-w-0">
                        <div className="flex items-center justify-between text-xs gap-2 min-w-0">
                          <span className="text-forest/70 font-medium truncate">Condição do Benefício:</span>
                          <span className="font-bold text-forest text-sm font-serif shrink-0">
                            R$ {preco.valorSessao},00/sessão
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleClicarWhatsApp(prof)}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <MessageCircle className="w-4 h-4 text-emerald-200 shrink-0" />
                          <span className="truncate">Falar pelo WhatsApp</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* MODAL DE SUCESSO DO CONTATO */}
      {contactSuccessAlert && (
        <div className="fixed inset-0 z-50 bg-forest/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 sm:p-8 border border-soft shadow-xl space-y-5 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-2xs">
              <CheckCheck className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-serif text-xl font-bold text-forest">
                WhatsApp Aberto com Sucesso!
              </h3>
              <p className="text-xs text-forest/70 leading-relaxed">
                A mensagem estruturada com as condições do benefício, seus dados e horários de preferência já foi formatada para você enviar ao terapeuta.
              </p>
            </div>

            <div className="p-3.5 bg-warm/40 border border-soft rounded-2xl text-[11px] text-forest/80 space-y-1">
              <span className="font-bold text-forest flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-forest/60" /> Próximos passos:
              </span>
              <p>1. Envie a mensagem no chat do WhatsApp.</p>
              <p>2. O terapeuta responderá alinhando o melhor dia e horário da primeira sessão.</p>
              <p>3. Seu sigilo é absoluto perante a sua empresa.</p>
            </div>

            <button
              type="button"
              onClick={() => setContactSuccessAlert(false)}
              className="w-full py-3 bg-forest text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-forest/90 transition-all cursor-pointer"
            >
              Entendido, continuar navegando
            </button>
          </div>
        </div>
      )}

      {/* PÁGINA COMPLETA DO PROFISSIONAL (MODAL DE ALTA FIDELIDADE) */}
      {profissionalPaginaAtivo && (
        <div className="fixed inset-0 z-50 bg-forest/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
          <div className="bg-[#FCFBF7] max-w-4xl w-full my-auto rounded-[2rem] border border-soft shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95">
            {/* Barra Superior de Ações */}
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-soft px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setProfissionalPaginaAtivo(null)}
                className="inline-flex items-center gap-2 text-xs font-bold text-forest/70 hover:text-forest transition-colors py-1.5 px-3 rounded-xl hover:bg-warm/60 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar à Vitrine da Empresa</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Benefício {empresaValidated?.nomeEmpresa || "Corporativo"}
                </span>

                <button
                  type="button"
                  onClick={() => setProfissionalPaginaAtivo(null)}
                  className="w-8 h-8 rounded-full bg-warm/80 hover:bg-warm text-forest/60 hover:text-forest flex items-center justify-center transition-colors cursor-pointer"
                  title="Fechar página do profissional"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Conteúdo com Scroll Suave */}
            <div className="p-4 sm:p-6 md:p-8 overflow-y-auto space-y-6">
              {(() => {
                const prof = profissionalPaginaAtivo;
                const servObjModal = servicosDisponiveis.find((s) => s.servicoId === filtroServico);
                const precoModal = servObjModal
                  ? getPrecoInfoDoCargo(servObjModal, selectedCargoId)
                  : { valorSessao: 80, frequenciaRecomendada: "Semanal" };
                const explicacaoAbordagem = getExplicacaoAbordagem(prof.abordagem || "");
                const cargoSelecionadoNome = cargosDisponiveis.find((c) => c.id === selectedCargoId)?.nome || "Colaborador";

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
                    {/* COLUNA ESQUERDA: Identidade, CRP, Redes, Condição e Botão WhatsApp */}
                    <div className="lg:col-span-5 space-y-5">
                      <div className="bg-white rounded-3xl p-6 border border-soft shadow-xs text-center space-y-4">
                        <div className="relative inline-block mx-auto">
                          <img
                            src={prof.foto}
                            alt={prof.name}
                            className="w-32 h-32 sm:w-36 sm:h-36 rounded-3xl object-cover border-2 border-emerald-100 shadow-md mx-auto"
                            referrerPolicy="no-referrer"
                          />
                          <span className="absolute -bottom-2 right-2 bg-emerald-600 text-white p-1.5 rounded-xl shadow-xs" title="Profissional Verificado">
                            <ShieldCheck className="w-4 h-4" />
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-forest">
                            <Star className="w-4 h-4 fill-sun text-sun" />
                            <span>{prof.nota || 4.9}</span>
                            <span className="text-forest/40 font-normal">
                              ({prof.totalAtendimentos || 38} atendimentos na rede)
                            </span>
                          </div>
                          <h2 className="font-serif text-xl sm:text-2xl font-bold text-forest leading-tight">
                            {prof.name}
                          </h2>
                          <p className="text-xs sm:text-sm text-forest/70 font-medium">
                            {prof.profissao}
                          </p>
                          <p className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 inline-block mt-1">
                            {prof.crp || "CRP Verificado e Ativo"}
                          </p>
                        </div>

                        {/* Localidade e Modalidade */}
                        <div className="pt-2 border-t border-soft/60 text-xs text-forest/75 space-y-1.5 text-left">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-forest/50 shrink-0" />
                            <span>{prof.cidade || "São Paulo"}, {prof.estado || "SP"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="font-medium text-emerald-950">Atendimento 100% Online & Sigiloso</span>
                          </div>
                        </div>

                        {/* Redes Sociais e Compartilhamento */}
                        <div className="pt-2 flex items-center justify-center gap-2">
                          {prof.instagramUrl && (
                            <a
                              href={prof.instagramUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-9 h-9 rounded-xl bg-warm/50 hover:bg-warm border border-soft flex items-center justify-center text-forest/70 hover:text-forest transition-colors"
                              title="Instagram do profissional"
                            >
                              <Instagram className="w-4 h-4" />
                            </a>
                          )}
                          {prof.linkedinUrl && (
                            <a
                              href={prof.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-9 h-9 rounded-xl bg-warm/50 hover:bg-warm border border-soft flex items-center justify-center text-forest/70 hover:text-forest transition-colors"
                              title="LinkedIn do profissional"
                            >
                              <Linkedin className="w-4 h-4" />
                            </a>
                          )}
                          {prof.siteUrl && (
                            <a
                              href={prof.siteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-9 h-9 rounded-xl bg-warm/50 hover:bg-warm border border-soft flex items-center justify-center text-forest/70 hover:text-forest transition-colors"
                              title="Website do profissional"
                            >
                              <Globe className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const url = `${window.location.origin}/?prof=${prof.id}`;
                              if (navigator.clipboard) {
                                navigator.clipboard.writeText(url);
                                setCopiouLinkPerfil(true);
                                setTimeout(() => setCopiouLinkPerfil(false), 2500);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-warm/50 hover:bg-warm border border-soft text-xs font-medium text-forest/70 hover:text-forest transition-colors cursor-pointer"
                            title="Copiar link deste perfil"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>{copiouLinkPerfil ? "Link copiado!" : "Compartilhar"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Card do Benefício com Condição Especial */}
                      <div className="bg-emerald-900 text-white rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm relative overflow-hidden">
                        <div className="space-y-1 relative z-10">
                          <span className="text-[11px] uppercase tracking-wider text-emerald-300 font-bold block">
                            Condição do seu Benefício
                          </span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-serif font-bold text-white">
                              R$ {precoModal.valorSessao},00
                            </span>
                            <span className="text-xs text-emerald-200">
                              / por sessão
                            </span>
                          </div>
                          <p className="text-xs text-emerald-100/90 pt-1">
                            Subsidiado para o seu cargo: <strong className="text-white font-bold">{cargoSelecionadoNome}</strong>
                          </p>
                          <p className="text-[11px] text-emerald-200/80">
                            Frequência recomendada: <strong>{precoModal.frequenciaRecomendada}</strong>
                          </p>
                        </div>

                        {/* Botão de WhatsApp */}
                        <button
                          type="button"
                          onClick={() => {
                            setProfissionalPaginaAtivo(null);
                            handleClicarWhatsApp(prof);
                          }}
                          className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-xs rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer relative z-10"
                        >
                          <MessageCircle className="w-4 h-4 fill-emerald-950 shrink-0" />
                          <span>Falar pelo WhatsApp com {prof.name.split(" ")[0]}</span>
                        </button>
                      </div>
                    </div>

                    {/* COLUNA DIREITA: Biografia Completa, Abordagem em Destaque, Serviços e Artigos */}
                    <div className="lg:col-span-7 space-y-6">
                      {/* Sobre Mim Completo (Sem corte) */}
                      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-soft shadow-xs space-y-3">
                        <div className="flex items-center gap-2 text-forest">
                          <User className="w-4 h-4 text-emerald-700" />
                          <h3 className="font-serif text-lg font-bold">
                            Sobre Mim & Trajetória
                          </h3>
                        </div>
                        <div className="text-xs sm:text-sm text-forest/80 leading-relaxed space-y-3 whitespace-pre-line">
                          {prof.biografia || "Profissional dedicado ao acolhimento humanizado, ético e empático, com ampla experiência clínica."}
                        </div>

                        {prof.formacao && (
                          <div className="pt-3 border-t border-soft/60 flex items-start gap-2 text-xs text-forest/70">
                            <Award className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-forest font-semibold">Formação Acadêmica: </strong>
                              <span>{prof.formacao}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Abordagem Clínica Explicada em Destaque */}
                      <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-6 sm:p-7 space-y-3.5 shadow-2xs">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                              Abordagem Terapêutica
                            </span>
                            <h4 className="font-serif text-base sm:text-lg font-bold text-emerald-950">
                              {explicacaoAbordagem.titulo}
                            </h4>
                          </div>
                        </div>

                        <p className="text-xs sm:text-sm text-forest/80 leading-relaxed">
                          {explicacaoAbordagem.descricao}
                        </p>

                        <div className="p-3.5 bg-white rounded-2xl border border-emerald-100 text-xs space-y-1">
                          <span className="font-bold text-emerald-950 block">Como funciona nas sessões:</span>
                          <span className="text-forest/80 leading-relaxed block">
                            {explicacaoAbordagem.comoFunciona}
                          </span>
                        </div>

                        <div className="p-3 bg-emerald-100/60 rounded-2xl text-xs text-emerald-950 flex items-start gap-2">
                          <Heart className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                          <div>
                            <strong className="font-bold">Foco & Benefício Principal: </strong>
                            <span>{explicacaoAbordagem.beneficioPrincipal}</span>
                          </div>
                        </div>
                      </div>

                      {/* Serviços Prestados */}
                      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-soft shadow-xs space-y-4">
                        <div className="flex items-center gap-2 text-forest">
                          <Layers className="w-4 h-4 text-emerald-700" />
                          <h3 className="font-serif text-lg font-bold">
                            Serviços Prestados
                          </h3>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {prof.servicosPrestados && prof.servicosPrestados.length > 0 ? (
                            prof.servicosPrestados.map((sId) => {
                              const sName = servicosDisponiveis.find((s) => s.servicoId === sId)?.nome || sId;
                              return (
                                <span
                                  key={sId}
                                  className="px-3 py-1.5 bg-warm/50 border border-soft rounded-xl text-xs font-semibold text-forest flex items-center gap-1.5"
                                >
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  {sName}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-xs text-forest/60">Terapia Individual Adulto</span>
                          )}
                        </div>

                        {/* Turnos e Horários */}
                        <div className="pt-3 border-t border-soft/60 space-y-2">
                          <span className="text-xs font-bold text-forest block">
                            Disponibilidade de Turnos:
                          </span>
                          <div className="flex flex-wrap gap-2 text-xs">
                            {["manha", "tarde", "noite", "sabados"].map((turno) => {
                              const atendeTurno = prof.turnos?.includes(turno);
                              const labels: Record<string, string> = {
                                manha: "Manhã",
                                tarde: "Tarde",
                                noite: "Noite",
                                sabados: "Sábados"
                              };
                              return (
                                <span
                                  key={turno}
                                  className={`px-3 py-1 rounded-xl border text-xs font-medium flex items-center gap-1 ${
                                    atendeTurno
                                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                                      : "bg-gray-50 border-gray-200 text-gray-400 line-through opacity-60"
                                  }`}
                                >
                                  <Clock className="w-3 h-3" />
                                  {labels[turno] || turno}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Artigos Publicados no Blog (se houver) */}
                      {artigosProfissionalPagina.length > 0 && (
                        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-soft shadow-xs space-y-4">
                          <div className="flex items-center gap-2 text-forest">
                            <BookOpen className="w-4 h-4 text-emerald-700" />
                            <h3 className="font-serif text-lg font-bold">
                              Artigos Escritos por {prof.name.split(" ")[0]}
                            </h3>
                          </div>

                          <div className="space-y-3">
                            {artigosProfissionalPagina.map((artigo) => (
                              <div
                                key={artigo.id}
                                className="p-4 rounded-2xl bg-warm/30 border border-soft hover:border-emerald-300 transition-all flex items-start justify-between gap-3 group"
                              >
                                <div className="space-y-1 min-w-0">
                                  <h4 className="font-serif font-bold text-sm text-forest group-hover:text-emerald-900 transition-colors line-clamp-1">
                                    {artigo.titulo}
                                  </h4>
                                  <p className="text-xs text-forest/70 line-clamp-2">
                                    {artigo.resumo || artigo.conteudo?.substring(0, 140)}...
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Garantia Ética & Sigilo Profissional (Nota de Confidencialidade) */}
                      <div className="p-4 bg-warm/40 border border-soft rounded-2xl flex items-start gap-3 text-xs text-forest/80 leading-relaxed">
                        <Lock className="w-4 h-4 text-forest/60 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-semibold text-forest">Sigilo e Ética Profissional: </strong>
                          Todas as sessões são protegidas pelo sigilo profissional estrito de acordo com o Código de Ética do Conselho Federal de Psicologia (CFP). Nenhuma informação clínica é compartilhada com sua empresa.
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* MODAL OBRIGATÓRIO: DEFINIÇÃO DE FOCO, HORÁRIO & QUEIXA ANTES DO WHATSAPP */}
      {modalConfigurarContato.isOpen && modalConfigurarContato.prof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-forest/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-soft overflow-hidden">
            {/* Header */}
            <div className="p-5 sm:p-6 bg-warm/30 border-b border-soft flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                {modalConfigurarContato.prof.foto ? (
                  <img
                    src={modalConfigurarContato.prof.foto}
                    alt={modalConfigurarContato.prof.name}
                    className="w-11 h-11 rounded-full object-cover border-2 border-emerald-600 shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-forest text-white font-serif font-bold flex items-center justify-center shrink-0">
                    {modalConfigurarContato.prof.name.charAt(0)}
                  </div>
                )}
                <div>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Iniciar Acolhimento Corporativo
                  </span>
                  <h3 className="font-bold font-serif text-forest text-base sm:text-lg mt-0.5">
                    Dr(a). {modalConfigurarContato.prof.name}
                  </h3>
                  {modalConfigurarContato.prof.crp && (
                    <span className="text-[11px] text-forest/60 font-mono">
                      CRP: {modalConfigurarContato.prof.crp}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setModalConfigurarContato({
                    isOpen: false,
                    prof: null,
                    servicoId: "",
                    turno: "",
                    queixa: "",
                    erroValidacao: "",
                  })
                }
                className="p-1.5 text-forest/40 hover:text-forest rounded-full cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-forest">
              {/* Alerta explicativo */}
              <div className="p-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-forest/80 leading-relaxed">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold text-emerald-950">
                    Acolhimento com condição garantida por sua empresa:
                  </strong>{" "}
                  Escolha o foco do seu atendimento e seus horários disponíveis para que o profissional possa verificar a agenda e formalizar sua recepção com agilidade.
                </div>
              </div>

              {/* Mensagem de Erro de Validação se houver */}
              {modalConfigurarContato.erroValidacao && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800 font-semibold animate-in shake duration-200">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{modalConfigurarContato.erroValidacao}</span>
                </div>
              )}

              {/* PASSO 1: SELEÇÃO DO FOCO (SERVIÇO) - OBRIGATÓRIO */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-forest flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-forest text-white text-[11px] font-bold flex items-center justify-center">
                      1
                    </span>
                    Foco do Acolhimento (Serviço) *
                  </span>
                  <span className="text-[11px] font-normal text-forest/60">
                    Obrigatório
                  </span>
                </label>

                <div className="grid grid-cols-1 gap-2">
                  {servicosDisponiveis.map((serv) => {
                    const preco = getPrecoInfoDoCargo(serv, selectedCargoId);
                    const isSelected = modalConfigurarContato.servicoId === serv.servicoId;

                    return (
                      <button
                        key={serv.servicoId}
                        type="button"
                        onClick={() =>
                          setModalConfigurarContato((prev) => ({
                            ...prev,
                            servicoId: serv.servicoId,
                            erroValidacao: "",
                          }))
                        }
                        className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                          isSelected
                            ? "bg-emerald-50/70 border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs"
                            : "bg-white hover:bg-warm/40 border-soft"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? "border-emerald-600 bg-emerald-600"
                                  : "border-forest/30"
                              }`}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                            </span>
                            <span className="font-bold text-xs text-forest truncate">
                              {serv.nome}
                            </span>
                          </div>
                          <p className="text-[11px] text-forest/60 pl-6 mt-0.5 line-clamp-1">
                            {serv.descricao}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-bold font-serif text-xs text-emerald-950 block">
                            R$ {preco.valorSessao},00/sessão
                          </span>
                          <span className="text-[10px] text-forest/50">
                            {preco.frequenciaRecomendada}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PASSO 2: SELEÇÃO DO PERÍODO DE DISPONIBILIDADE - OBRIGATÓRIO */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-forest flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-forest text-white text-[11px] font-bold flex items-center justify-center">
                      2
                    </span>
                    Período de Horários com Disponibilidade *
                  </span>
                  <span className="text-[11px] font-normal text-forest/60">
                    Obrigatório
                  </span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TURNOS_OPCOES.filter((t) => t.id !== "todos").map((t) => {
                    const isSelected = modalConfigurarContato.turno === t.id;

                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() =>
                          setModalConfigurarContato((prev) => ({
                            ...prev,
                            turno: t.id,
                            erroValidacao: "",
                          }))
                        }
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? "bg-emerald-600 text-white font-bold border-emerald-600 shadow-xs"
                            : "bg-white hover:bg-warm/40 text-forest/80 font-medium border-soft"
                        }`}
                      >
                        <span className="text-xs block">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PASSO 3: BREVE QUEIXA OU MOTIVO DA BUSCA - OBRIGATÓRIO */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-forest flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-forest text-white text-[11px] font-bold flex items-center justify-center">
                      3
                    </span>
                    Breve Queixa ou Motivo Principal da Busca *
                  </span>
                  <span className="text-[11px] font-normal text-forest/60">
                    Obrigatório
                  </span>
                </label>

                {/* Chips rápidos */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Ansiedade e estresse",
                    "Dificuldades no trabalho / Burnout",
                    "Crise de relacionamento",
                    "Autoconhecimento",
                    "Tristeza profunda / Desânimo",
                    "Orientação familiar",
                    "Luto ou perda recente",
                  ].map((motivoRapido) => (
                    <button
                      key={motivoRapido}
                      type="button"
                      onClick={() =>
                        setModalConfigurarContato((prev) => ({
                          ...prev,
                          queixa: prev.queixa
                            ? `${prev.queixa}, ${motivoRapido}`
                            : motivoRapido,
                          erroValidacao: "",
                        }))
                      }
                      className="px-2.5 py-1 rounded-full text-[11px] bg-warm hover:bg-warm/80 border border-soft text-forest/80 transition-colors cursor-pointer"
                    >
                      + {motivoRapido}
                    </button>
                  ))}
                </div>

                <textarea
                  value={modalConfigurarContato.queixa}
                  onChange={(e) =>
                    setModalConfigurarContato((prev) => ({
                      ...prev,
                      queixa: e.target.value,
                      erroValidacao: "",
                    }))
                  }
                  placeholder="Descreva com suas palavras o que você busca cuidar neste momento..."
                  rows={3}
                  className="w-full p-3 bg-warm/20 rounded-xl text-xs text-forest border border-soft focus:border-forest/50 outline-none transition-all placeholder:text-forest/40"
                />
              </div>
            </div>

            {/* Footer com Botão de Confirmação & WhatsApp */}
            <div className="p-4 sm:p-5 bg-warm/30 border-t border-soft flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() =>
                  setModalConfigurarContato({
                    isOpen: false,
                    prof: null,
                    servicoId: "",
                    turno: "",
                    queixa: "",
                    erroValidacao: "",
                  })
                }
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-forest/70 hover:text-forest text-center cursor-pointer"
              >
                Voltar à vitrine
              </button>

              <button
                type="button"
                disabled={
                  isLoggingContact ||
                  !modalConfigurarContato.servicoId ||
                  !modalConfigurarContato.turno ||
                  !modalConfigurarContato.queixa.trim()
                }
                onClick={handleConfirmarEAbrirWhatsApp}
                className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-forest/20 disabled:text-forest/40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoggingContact ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Criando Ficha de Bordo...</span>
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4 text-emerald-200" />
                    <span>Confirmar Solicitação & Chamar no WhatsApp</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
