import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  Users,
  MessageCircle,
  Plus,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Info,
  X,
  MapPin,
  GraduationCap,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Share2,
  Clock,
  Briefcase,
  Eye,
  Send,
  UserCheck,
  Shield,
  Layers,
  Tag
} from "lucide-react";
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  orderBy
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";

// Normalizador para busca insensível a acentos, maiúsculas e caracteres especiais
export function normalizeText(str: string): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Mapa semântico de relações entre palavras-chave clínicas, queixas e abordagens/especialidades
export const CLINICAL_SEMANTIC_SYNONYMS: Record<string, string[]> = {
  ansiedade: ["tcc", "cognitivo", "comportamental", "panico", "fobia", "toc", "estresse", "neuropsicologia", "psicologia clinica"],
  panico: ["ansiedade", "tcc", "cognitivo", "comportamental", "crise", "fobia", "estresse"],
  fobia: ["ansiedade", "tcc", "cognitiva", "dessensibilizacao", "panico"],
  estresse: ["burnout", "ansiedade", "mindfulness", "corporal", "integrativa", "esgotamento"],
  burnout: ["estresse", "trabalho", "esgotamento", "ansiedade", "corporativo", "integrativa"],
  depressao: ["luto", "humor", "tristeza", "psicanalise", "tcc", "humanista", "perinatal", "existencial"],
  luto: ["perda", "morte", "depressao", "humanista", "psicanalise", "existencial", "crise"],
  casal: ["conjugal", "relacionamento", "familia", "sistemica", "afetivo", "separacao", "divorcio", "conflitos"],
  familia: ["familiar", "sistemica", "parental", "parentalidade", "casal", "crianca"],
  relacionamento: ["casal", "afetivo", "dependencia emocional", "sistemica", "conflitos", "conjugal"],
  infantil: ["crianca", "ludoterapia", "infantojuvenil", "desenvolvimento", "psicopedagogia", "pediatria", "tdah", "tea"],
  crianca: ["infantil", "ludoterapia", "infantojuvenil", "desenvolvimento", "tdah", "tea", "parentalidade"],
  adolescente: ["jovem", "infantojuvenil", "adolescencia", "vocacional", "orientacao"],
  tdah: ["deficit de atencao", "hiperatividade", "neuropsicologia", "neuro", "atencao", "funcoes executivas", "avaliacao"],
  tea: ["autismo", "autista", "espectro", "aba", "neuropsicologia", "desenvolvimento atipico"],
  autismo: ["tea", "autista", "espectro autista", "aba", "neuropsicologia", "desenvolvimento"],
  neuro: ["neuropsicologia", "avaliacao neuropsicologica", "cognitiva", "tdah", "tea", "memoria", "reabilitacao"],
  neuropsicologia: ["avaliacao", "cognicao", "memoria", "tdah", "tea", "reabilitacao cognitiva", "laudo", "cerebro"],
  tcc: ["terapia cognitivo comportamental", "cognitiva", "comportamental", "esquema", "reestruturacao", "ansiedade"],
  cognitiva: ["tcc", "cognitivo comportamental", "esquema", "reestruturacao", "pensamentos"],
  comportamental: ["analise do comportamento", "tcc", "aba", "behaviorista", "habitos"],
  psicanalise: ["psicanalitica", "freud", "lacan", "winnicott", "inconsciente", "escuta", "analitica", "subjetividade"],
  humanista: ["centrada na pessoa", "rogers", "fenomenologica", "existencial", "gestalt", "empatia"],
  gestalt: ["gestalt-terapia", "humanista", "holistica", "contato", "aqui e agora"],
  sistemica: ["familiar", "casal", "padroes relacionais", "sistemas", "relacionamento"],
  trauma: ["emdr", "brainspotting", "somatica", "abuso", "tept", "violencia", "estresse pos-traumatico"],
  emdr: ["trauma", "reprocessamento", "dessensibilizacao", "tept", "ansiedade"],
  perinatal: ["maternidade", "gestante", "parto", "pos-parto", "puerperio", "depressao", "tentantes"],
  maternidade: ["perinatal", "gestante", "puerpera", "pos-parto", "parentalidade"],
  mindfulness: ["atencao plena", "meditacao", "estresse", "burnout", "integrativa", "bem-estar"],
  orientacao: ["vocacional", "carreira", "pais", "parentalidade", "profissional"],
};

export interface ProfissionalRede {
  id: string;
  uid?: string;
  name: string;
  foto: string;
  profissao: string;
  crp?: string;
  especialidade?: string;
  abordagem?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  cidade?: string;
  estado?: string;
  biografia?: string;
  horasDisponiveis?: string;
  demandasAtivasCount?: number;
  palavrasChave?: string[];
  tags?: string[];
  publicos?: string[];
}

export interface AlertaDemanda {
  id: string;
  titulo: string;
  categoria:
    | "Encaminhamento de Paciente"
    | "Interconsulta / Parecer"
    | "Supervisão Clínica"
    | "Parceria em Projeto"
    | "Avaliação Diagnóstica"
    | "Outro";
  descricao: string;
  especialidadesNecessarias: string[];
  modalidade: "Online" | "Presencial" | "Indiferente";
  cidadeEstado?: string;
  urgencia: "Normal" | "Moderada" | "Urgente";
  autorUid: string;
  autorNome: string;
  autorCargo: string;
  autorFoto?: string;
  autorWhatsapp: string;
  autorEmail?: string;
  status: "aberta" | "em_andamento" | "concluida";
  createdAt?: any;
}

// Exemplos demonstrativos para teste imediato com palavras-chave e abordagens completas
const FALLBACK_PROFISSIONAIS_REDE: ProfissionalRede[] = [
  {
    id: "demo-p1",
    name: "Dra. Ana Carolina Silva",
    foto: "https://images.unsplash.com/photo-1594824813566-78a9c33fd908?w=400&auto=format&fit=crop&q=80",
    profissao: "Psicóloga Clínica",
    crp: "06/145892",
    especialidade: "Terapia de Casal, Neuropsicologia",
    abordagem: "TCC, Terapia Focada nas Emoções",
    telefone: "11987654321",
    whatsapp: "11987654321",
    email: "ana.silva@acolhemente.org",
    cidade: "São Paulo",
    estado: "SP",
    biografia: "Mestre em Psicologia Clínica, com foco em relacionamentos interpessoais e regulação afetiva.",
    palavrasChave: [
      "tcc",
      "terapia cognitivo comportamental",
      "casal",
      "conjugal",
      "ansiedade",
      "panico",
      "relacionamento",
      "neuropsicologia",
      "emocoes"
    ]
  },
  {
    id: "demo-p2",
    name: "Dr. Marcos Vinícius Santos",
    foto: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80",
    profissao: "Psicanalista",
    crp: "05/887412",
    especialidade: "Adultos, Luto, Crise Existencial",
    abordagem: "Psicanálise Winnicottiana & Lacaniana",
    telefone: "21998765432",
    whatsapp: "21998765432",
    email: "marcos.santos@acolhemente.org",
    cidade: "Rio de Janeiro",
    estado: "RJ",
    biografia: "Especialista em acolhimento a situações de luto, transição de carreira e desenvolvimento emocional.",
    palavrasChave: [
      "psicanalise",
      "psicanalitica",
      "luto",
      "depressao",
      "crise existencial",
      "inconsciente",
      "winnicott",
      "lacan",
      "escuta",
      "adultos"
    ]
  },
  {
    id: "demo-p3",
    name: "Dra. Juliana Mendes",
    foto: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80",
    profissao: "Terapeuta Integrativa",
    crp: "",
    especialidade: "Mindfulness, Manejo de Estresse & Burnout",
    abordagem: "Terapia Humanista, Práticas Integrativas",
    telefone: "31988776655",
    whatsapp: "31988776655",
    email: "juliana.mendes@acolhemente.org",
    cidade: "Belo Horizonte",
    estado: "MG",
    biografia: "Atuação voltada à promoção do autocuidado, saúde corporativa e equilíbrio mental.",
    palavrasChave: [
      "mindfulness",
      "estresse",
      "burnout",
      "esgotamento",
      "humanista",
      "integrativa",
      "ansiedade",
      "autocuidado",
      "corporal",
      "holistica"
    ]
  },
  {
    id: "demo-p4",
    name: "Dr. Eduardo Costa",
    foto: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80",
    profissao: "Psicólogo Humanista",
    crp: "06/112390",
    especialidade: "Infância, Adolescência, Parentalidade",
    abordagem: "Abordagem Centrada na Pessoa",
    telefone: "19976543210",
    whatsapp: "19976543210",
    email: "eduardo.costa@acolhemente.org",
    cidade: "Campinas",
    estado: "SP",
    biografia: "Experiência de mais de 10 anos no apoio clínico a crianças, adolescentes e orientação a pais.",
    palavrasChave: [
      "humanista",
      "centrada na pessoa",
      "infantil",
      "crianca",
      "adolescente",
      "parentalidade",
      "familia",
      "rogers",
      "ludoterapia",
      "tdah"
    ]
  },
  {
    id: "demo-p5",
    name: "Dra. Beatriz Lima",
    foto: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80",
    profissao: "Psicóloga Perinatal",
    crp: "04/774812",
    especialidade: "Maternidade, Depressão Pós-Parto",
    abordagem: "TCC, Psicologia Perinatal",
    telefone: "41991234567",
    whatsapp: "41991234567",
    email: "beatriz.lima@acolhemente.org",
    cidade: "Curitiba",
    estado: "PR",
    biografia: "Dedicada ao acolhimento de tentantes, gestantes e puérperas com foco na saúde emocional materna.",
    palavrasChave: [
      "perinatal",
      "maternidade",
      "gestantes",
      "pos-parto",
      "puerperio",
      "depressao",
      "tcc",
      "mulheres",
      "ansiedade",
      "parentalidade"
    ]
  },
  {
    id: "demo-p6",
    name: "Dr. Rafael Oliveira",
    foto: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80",
    profissao: "Neuropsicólogo",
    crp: "06/133901",
    especialidade: "Avaliação Neuropsicológica, TDAH, TEA",
    abordagem: "Neurociências & Reabilitação Cognitiva",
    telefone: "11977665544",
    whatsapp: "11977665544",
    email: "rafael.oliveira@acolhemente.org",
    cidade: "São Paulo",
    estado: "SP",
    biografia: "Avaliação e laudos neuropsicológicos para todas as faixas etárias, com protocolos padrão-ouro.",
    palavrasChave: [
      "neuropsicologia",
      "neuro",
      "tdah",
      "tea",
      "autismo",
      "avaliacao",
      "memoria",
      "cognicao",
      "laudo",
      "reabilitacao",
      "funcoes executivas"
    ]
  },
];

const SUGGESTED_SPECIALTIES = [
  "TCC",
  "Psicanálise",
  "Neuropsicologia",
  "Infantil & TDAH",
  "Terapia de Casal",
  "Humanista",
  "Ansiedade & Pânico",
  "Luto & Depressão",
  "TEA & Autismo",
  "Mindfulness & Estresse",
  "Sistêmica & Família",
];

interface RedeProfissionalViewProps {
  profile: any;
  currentRole: string;
  onShowToast: (message: string, type?: "success" | "error" | "info") => void;
  externalSearchQuery?: string;
  onExternalSearchChange?: (q: string) => void;
}

export function RedeProfissionalView({
  profile,
  currentRole,
  onShowToast,
  externalSearchQuery,
  onExternalSearchChange,
}: RedeProfissionalViewProps) {
  // Profissionais & Demandas states
  const [profissionais, setProfissionais] = useState<ProfissionalRede[]>([]);
  const [demandas, setDemandas] = useState<AlertaDemanda[]>([]);
  const [loadingProfs, setLoadingProfs] = useState(true);
  const [loadingDemandas, setLoadingDemandas] = useState(true);

  // Search & Filters (Sincronizado bidirecionalmente se fornecido pela barra superior)
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const setSearchQuery = (val: string) => {
    setInternalSearchQuery(val);
    if (onExternalSearchChange) {
      onExternalSearchChange(val);
    }
  };
  const [selectedSpecialtyChip, setSelectedSpecialtyChip] = useState<string>("Todas");
  const [demandFilterTab, setDemandFilterTab] = useState<"todas" | "abertas" | "minhas">("todas");

  // Modals & Details
  const [selectedProfissionalModal, setSelectedProfissionalModal] = useState<ProfissionalRede | null>(null);
  const [isNovaDemandaOpen, setIsNovaDemandaOpen] = useState(false);
  const [isSubmittingDemanda, setIsSubmittingDemanda] = useState(false);

  // Banner informativo (Otimização para telas pequenas / minimizar)
  const [isBannerMinimized, setIsBannerMinimized] = useState(false);
  const [showBannerInfo, setShowBannerInfo] = useState(false);

  // Carrossel Ref & Scroll
  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Nova Demanda Form State
  const [formDemanda, setFormDemanda] = useState({
    titulo: "",
    categoria: "Encaminhamento de Paciente" as AlertaDemanda["categoria"],
    descricao: "",
    especialidadesStr: "",
    modalidade: "Online" as AlertaDemanda["modalidade"],
    cidadeEstado: profile?.cidade ? `${profile.cidade}${profile.estado ? " - " + profile.estado : ""}` : "",
    urgencia: "Normal" as AlertaDemanda["urgencia"],
    whatsapp: profile?.telefone || profile?.whatsapp || profile?.phone || "",
  });

  // 1. Escuta a coleção 'users' para buscar profissionais cadastrados com foto de perfil
  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      const q = query(collection(db, "users"));
      unsub = onSnapshot(
        q,
        (snapshot) => {
          const list: ProfissionalRede[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            const roles = Array.isArray(data.roles) ? data.roles : [];
            const isProf = data.role === "profissional" || roles.includes("profissional");

            if (isProf && data.ativo !== false) {
              // Foto que o profissional insere no perfil
              const foto =
                data.photoUrl ||
                data.foto ||
                data.photoURL ||
                data.photo ||
                data.avatar ||
                data.imagemUrl ||
                "";

              // REGRA EXPLICITA: carrossel pequeno com os profissionais cadastrados (os que estão com fotos adicionadas em seus perfis)
              if (!foto || typeof foto !== "string" || !foto.trim()) {
                return;
              }

              const name =
                data.name ||
                data.nome ||
                data.displayName ||
                "Profissional Parceiro";

              const cargo =
                data.cargo ||
                data.profissao ||
                (data.crp ? "Psicólogo(a) Clínico(a)" : "Terapeuta");

              const tagsList: string[] = [];
              if (Array.isArray(data.palavrasChave)) tagsList.push(...data.palavrasChave);
              if (Array.isArray(data.tags)) tagsList.push(...data.tags);
              if (Array.isArray(data.publicosExperiencia)) tagsList.push(...data.publicosExperiencia);
              if (Array.isArray(data.publicosGosto)) tagsList.push(...data.publicosGosto);
              if (typeof data.outrosPublicosExperiencia === "string" && data.outrosPublicosExperiencia.trim()) {
                tagsList.push(data.outrosPublicosExperiencia);
              }
              if (typeof data.outrosPublicosGosto === "string" && data.outrosPublicosGosto.trim()) {
                tagsList.push(data.outrosPublicosGosto);
              }
              if (Array.isArray(data.temasAtendimento)) tagsList.push(...data.temasAtendimento);
              if (Array.isArray(data.especialidades)) tagsList.push(...data.especialidades);
              if (Array.isArray(data.abordagens)) tagsList.push(...data.abordagens);
              if (typeof data.motivacaoProjeto === "string" && data.motivacaoProjeto.trim()) {
                tagsList.push(data.motivacaoProjeto);
              }

              list.push({
                id: d.id,
                uid: data.uid || d.id,
                name,
                foto,
                profissao: cargo,
                crp: data.crp || "",
                especialidade: data.especialidade || (Array.isArray(data.especialidades) ? data.especialidades.join(", ") : ""),
                abordagem: data.abordagem || (Array.isArray(data.abordagens) ? data.abordagens.join(", ") : ""),
                telefone: data.telefone || data.whatsapp || data.phone || "",
                whatsapp: data.whatsapp || data.telefone || data.phone || "",
                email: data.email || "",
                cidade: data.cidade || "",
                estado: data.estado || data.uf || "",
                biografia: data.biografia || data.bio || data.apresentacao || "",
                horasDisponiveis: data.horasDisponiveis || "",
                palavrasChave: tagsList,
                tags: tagsList,
              });
            }
          });

          if (list.length > 0) {
            setProfissionais(list);
          } else {
            // Se nenhum profissional do banco tiver foto ainda, usamos o demonstrativo para teste
            setProfissionais(FALLBACK_PROFISSIONAIS_REDE);
          }
          setLoadingProfs(false);
        },
        (error) => {
          console.error("Erro ao carregar profissionais para rede:", error);
          setProfissionais(FALLBACK_PROFISSIONAIS_REDE);
          setLoadingProfs(false);
          try {
            handleFirestoreError(error, OperationType.GET, "users");
          } catch (e) {}
        }
      );
    } catch (e) {
      console.error(e);
      setProfissionais(FALLBACK_PROFISSIONAIS_REDE);
      setLoadingProfs(false);
    }

    return () => {
      if (unsub) unsub();
    };
  }, []);

  // 2. Escuta a coleção 'alertas_demanda' em tempo real
  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      const q = query(collection(db, "alertas_demanda"), orderBy("createdAt", "desc"));
      unsub = onSnapshot(
        q,
        (snapshot) => {
          const list: AlertaDemanda[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({
              id: docSnap.id,
              ...data,
            } as AlertaDemanda);
          });
          setDemandas(list);
          setLoadingDemandas(false);
        },
        (error) => {
          console.error("Erro ao carregar alertas de demanda:", error);
          setLoadingDemandas(false);
          try {
            handleFirestoreError(error, OperationType.GET, "alertas_demanda");
          } catch (e) {}
        }
      );
    } catch (e) {
      console.error(e);
      setLoadingDemandas(false);
    }

    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Monitora capacidade de scroll do carrossel
  const updateScrollButtons = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    const el = carouselRef.current;
    if (el) {
      updateScrollButtons();
      el.addEventListener("scroll", updateScrollButtons, { passive: true });
      window.addEventListener("resize", updateScrollButtons);
      return () => {
        el.removeEventListener("scroll", updateScrollButtons);
        window.removeEventListener("resize", updateScrollButtons);
      };
    }
  }, [profissionais]);

  const scrollCarousel = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const scrollAmount = direction === "left" ? -280 : 280;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // 3. Filtros combinados da busca inteligente (por palavras-chave, especialidades, abordagens, nome, cargo, localização)
  const { filteredProfissionais, detectedSemanticTerms } = useMemo(() => {
    const rawQuery = searchQuery.trim();
    const normalizedQuery = normalizeText(rawQuery);

    // Termos digitados (removendo preposições irrelevantes caso haja mais de uma palavra)
    const stopWords = new Set(["de", "da", "do", "das", "dos", "e", "em", "com", "para", "por", "um", "uma", "o", "a"]);
    let queryTokens = normalizedQuery
      .split(/\s+/)
      .map((t) => t.replace(/[^\w]/g, ""))
      .filter(Boolean);

    if (queryTokens.length > 1) {
      queryTokens = queryTokens.filter((t) => !stopWords.has(t));
    }

    // Identifica sinônimos semânticos clínicos correlacionados aos termos buscados
    const semanticSynonymsSet = new Set<string>();
    const recognizedThemes: string[] = [];

    queryTokens.forEach((token) => {
      Object.entries(CLINICAL_SEMANTIC_SYNONYMS).forEach(([key, syns]) => {
        const normKey = normalizeText(key);
        if (token === normKey || normKey.includes(token) || (token.length >= 3 && token.includes(normKey))) {
          if (!recognizedThemes.includes(key)) recognizedThemes.push(key);
          semanticSynonymsSet.add(normKey);
          syns.forEach((s) => semanticSynonymsSet.add(normalizeText(s)));
        }
        syns.forEach((syn) => {
          const normSyn = normalizeText(syn);
          if (token === normSyn || normSyn.includes(token) || (token.length >= 4 && token.includes(normSyn))) {
            if (!recognizedThemes.includes(key)) recognizedThemes.push(key);
            semanticSynonymsSet.add(normKey);
            syns.forEach((s) => semanticSynonymsSet.add(normalizeText(s)));
          }
        });
      });
    });

    const relatedTermsArray = Array.from(semanticSynonymsSet);

    // Avaliação de cada profissional com pontuação de relevância (score)
    const resultsWithScore: { profissional: ProfissionalRede; score: number }[] = [];

    profissionais.forEach((p) => {
      const normName = normalizeText(p.name);
      const normProfissao = normalizeText(p.profissao);
      const normEspecialidade = normalizeText(p.especialidade || "");
      const normAbordagem = normalizeText(p.abordagem || "");
      const normBio = normalizeText(p.biografia || "");
      const normCidade = normalizeText(p.cidade || "");
      const normEstado = normalizeText(p.estado || "");
      const normCrp = normalizeText(p.crp || "");
      const normTags = normalizeText((p.palavrasChave || []).join(" "));

      const fullCorpus = `${normName} ${normProfissao} ${normEspecialidade} ${normAbordagem} ${normBio} ${normCidade} ${normEstado} ${normCrp} ${normTags}`;

      // Chip rápido de especialidade
      if (selectedSpecialtyChip !== "Todas") {
        const chipNorm = normalizeText(selectedSpecialtyChip);
        const chipTokens = chipNorm.split(/[&\s+/]+/).map((t) => t.trim()).filter(Boolean);
        const chipSynonyms: string[] = [chipNorm, ...chipTokens];

        chipTokens.forEach((token) => {
          Object.entries(CLINICAL_SEMANTIC_SYNONYMS).forEach(([key, syns]) => {
            if (token === key || key.includes(token)) {
              chipSynonyms.push(normalizeText(key));
              chipSynonyms.push(...syns.map(normalizeText));
            }
          });
        });

        const matchesChip = chipSynonyms.some((syn) => fullCorpus.includes(syn));
        if (!matchesChip) return;
      }

      // Se não há busca digitada, mantém o profissional com pontuação base
      if (!rawQuery) {
        resultsWithScore.push({ profissional: p, score: 1 });
        return;
      }

      let score = 0;

      // Cada termo digitado deve encontrar correspondência direta ou por vínculo clínico
      const allTokensMatch = queryTokens.every((token) => {
        // 1. Correspondência exata em especialidade ou abordagem (peso máximo)
        if (normEspecialidade.includes(token) || normAbordagem.includes(token)) {
          score += 60;
          return true;
        }

        // 2. Correspondência em nome ou profissão
        if (normName.includes(token) || normProfissao.includes(token)) {
          score += 45;
          return true;
        }

        // 3. Correspondência em tags ou palavras-chave cadastradas
        if (normTags.includes(token)) {
          score += 35;
          return true;
        }

        // 4. Correspondência em bio ou localização / crp
        if (normBio.includes(token) || normCidade.includes(token) || normEstado.includes(token) || normCrp.includes(token)) {
          score += 20;
          return true;
        }

        // 5. Correspondência por expansão semântica (relação de especialidade ou abordagem)
        const matchedSynonym = relatedTermsArray.some((syn) => {
          return (
            normEspecialidade.includes(syn) ||
            normAbordagem.includes(syn) ||
            normTags.includes(syn) ||
            normProfissao.includes(syn) ||
            normBio.includes(syn)
          );
        });

        if (matchedSynonym) {
          score += 25;
          return true;
        }

        return false;
      });

      if (allTokensMatch && score > 0) {
        resultsWithScore.push({ profissional: p, score });
      }
    });

    // Ordena profissionais pela maior relevância
    resultsWithScore.sort((a, b) => b.score - a.score);

    return {
      filteredProfissionais: resultsWithScore.map((item) => item.profissional),
      detectedSemanticTerms: recognizedThemes,
    };
  }, [profissionais, searchQuery, selectedSpecialtyChip]);

  // 4. Filtro das demandas (normalizado e tolerante a termos clínicos)
  const filteredDemandas = useMemo(() => {
    return demandas.filter((d) => {
      // Filtro de aba
      if (demandFilterTab === "abertas" && d.status !== "aberta") {
        return false;
      }
      if (demandFilterTab === "minhas") {
        const isAuthor =
          (profile?.uid && d.autorUid === profile.uid) ||
          (profile?.id && d.autorUid === profile.id) ||
          (profile?.email && d.autorEmail === profile.email);
        if (!isAuthor) return false;
      }

      const demandText = normalizeText(
        `${d.titulo} ${d.descricao} ${d.categoria} ${d.autorNome} ${(d.especialidadesNecessarias || []).join(" ")} ${d.cidadeEstado || ""}`
      );

      // Filtro de busca na demanda
      if (searchQuery.trim()) {
        const terms = normalizeText(searchQuery).split(/\s+/).filter(Boolean);
        const matches = terms.every((t) => demandText.includes(t));
        if (!matches) return false;
      }

      if (selectedSpecialtyChip !== "Todas") {
        const chip = normalizeText(selectedSpecialtyChip);
        if (!demandText.includes(chip)) return false;
      }

      return true;
    });
  }, [demandas, demandFilterTab, searchQuery, selectedSpecialtyChip, profile]);

  // Helper para formatar o link do WhatsApp
  const getWhatsAppLink = (phone?: string, text?: string) => {
    if (!phone) return "#";
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone) return "#";
    // Garante DDI 55 do Brasil se o número vier sem
    const formattedPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(text || "Olá! Gostaria de me conectar através da Rede AcolheMente.");
    return `https://wa.me/${formattedPhone}?text=${msg}`;
  };

  // Criar Demanda no Firestore
  const handleCreateDemanda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDemanda.titulo.trim() || !formDemanda.descricao.trim()) {
      onShowToast("Por favor, preencha o título e a descrição da demanda.", "error");
      return;
    }

    setIsSubmittingDemanda(true);
    try {
      // Quebra especialidades por vírgula
      const especialidadesArray = formDemanda.especialidadesStr
        ? formDemanda.especialidadesStr
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      const cleanPhone = (formDemanda.whatsapp || "").replace(/\D/g, "");

      const novaDemanda: Omit<AlertaDemanda, "id"> = {
        titulo: formDemanda.titulo.trim(),
        categoria: formDemanda.categoria,
        descricao: formDemanda.descricao.trim(),
        especialidadesNecessarias: especialidadesArray,
        modalidade: formDemanda.modalidade,
        cidadeEstado: formDemanda.cidadeEstado?.trim() || "",
        urgencia: formDemanda.urgencia,
        autorUid: profile?.uid || profile?.id || "anon",
        autorNome: profile?.name || profile?.nome || "Profissional AcolheMente",
        autorCargo: profile?.cargo || profile?.profissao || (profile?.crp ? "Psicólogo(a)" : "Terapeuta"),
        autorFoto: profile?.photoUrl || profile?.foto || profile?.avatar || "",
        autorWhatsapp: cleanPhone,
        autorEmail: profile?.email || "",
        status: "aberta",
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "alertas_demanda"), novaDemanda);
      onShowToast("Alerta de demanda publicado na Rede com sucesso!", "success");

      // Reset form
      setFormDemanda({
        titulo: "",
        categoria: "Encaminhamento de Paciente",
        descricao: "",
        especialidadesStr: "",
        modalidade: "Online",
        cidadeEstado: profile?.cidade ? `${profile.cidade}${profile.estado ? " - " + profile.estado : ""}` : "",
        urgencia: "Normal",
        whatsapp: profile?.telefone || profile?.whatsapp || profile?.phone || "",
      });
      setIsNovaDemandaOpen(false);
    } catch (error: any) {
      console.error("Erro ao criar alerta de demanda:", error);
      onShowToast("Erro ao publicar alerta de demanda. Tente novamente.", "error");
      try {
        handleFirestoreError(error, OperationType.CREATE, "alertas_demanda");
      } catch (err) {}
    } finally {
      setIsSubmittingDemanda(false);
    }
  };

  // Alternar status da demanda (Aberta <-> Concluída)
  const handleToggleStatusDemanda = async (demanda: AlertaDemanda) => {
    try {
      const newStatus = demanda.status === "aberta" ? "concluida" : "aberta";
      await updateDoc(doc(db, "alertas_demanda", demanda.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      onShowToast(
        newStatus === "concluida" ? "Demanda marcada como concluída!" : "Demanda reaberta com sucesso!",
        "success"
      );
    } catch (err: any) {
      console.error("Erro ao atualizar status:", err);
      onShowToast("Erro ao atualizar demanda.", "error");
    }
  };

  // Excluir demanda
  const handleDeleteDemanda = async (id: string) => {
    if (!window.confirm("Deseja realmente remover este alerta de demanda?")) return;
    try {
      await deleteDoc(doc(db, "alertas_demanda", id));
      onShowToast("Alerta de demanda removido com sucesso.", "info");
    } catch (err: any) {
      console.error("Erro ao deletar alerta:", err);
      onShowToast("Erro ao remover demanda.", "error");
    }
  };

  return (
    <div className="w-full max-w-full min-w-0 space-y-4 sm:space-y-6 animate-in fade-in duration-300 pb-16">
      {/* Cabeçalho da Aba Otimizado para Telas Pequenas */}
      {!isBannerMinimized ? (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 md:p-6 border border-soft shadow-xs transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-5">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-forest/10 text-forest border border-forest/20 flex items-center gap-1">
                    <Users className="w-3 h-3 text-emerald-700" />
                    Rede de Conexão
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-forest/70 font-medium hidden md:inline">
                    • Integração &amp; Encaminhamentos
                  </span>
                </div>

                {/* Controles no topo em telas pequenas (Info e Minimizar) */}
                <div className="flex items-center gap-1 sm:hidden">
                  <button
                    type="button"
                    onClick={() => setShowBannerInfo(!showBannerInfo)}
                    className="p-1 rounded-lg text-forest/60 hover:text-forest hover:bg-forest/5 text-[10px] flex items-center gap-0.5 transition-colors"
                    title={showBannerInfo ? "Ocultar detalhes" : "Ver detalhes"}
                  >
                    <Info className="w-3.5 h-3.5 text-forest/70" />
                    <span className="text-[10px]">{showBannerInfo ? "Menos" : "Info"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsBannerMinimized(true)}
                    className="p-1 rounded-lg text-forest/60 hover:text-forest hover:bg-forest/5 transition-colors"
                    title="Minimizar aviso"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h1 className="text-base sm:text-xl md:text-2xl font-serif font-bold text-forest leading-snug">
                Conecte-se com Colegas &amp; Compartilhe Demandas
              </h1>

              {/* Texto explicativo: oculto em telas pequenas por padrão para economizar espaço e permitir rolar para os profissionais */}
              <p className={`text-xs sm:text-sm text-forest/70 leading-relaxed ${showBannerInfo ? "block" : "hidden sm:block"}`}>
                Uma rede de apoio mútuo, supervisão e interconsultas. Encontre profissionais por abordagem,
                conecte-se via WhatsApp e publique alertas para encaminhar ou solicitar serviços clínicos.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 pt-0.5 sm:pt-0">
              <button
                type="button"
                onClick={() => setIsNovaDemandaOpen(true)}
                className="w-full sm:w-auto px-4 py-2 sm:px-5 sm:py-2.5 bg-forest hover:bg-forest/90 text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-1.5 sm:gap-2"
              >
                <Plus className="w-4 h-4 text-sun" />
                <span>Criar Alerta</span>
                <span className="hidden sm:inline">de Demanda</span>
              </button>

              {/* Botão de minimizar no Desktop */}
              <button
                type="button"
                onClick={() => setIsBannerMinimized(true)}
                className="hidden sm:flex p-2 rounded-xl text-forest/50 hover:text-forest hover:bg-forest/5 transition-colors"
                title="Minimizar cabeçalho"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Cabeçalho Compacto (Modo Minimizado) */
        <div className="bg-white rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 border border-soft shadow-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-lg bg-forest/10 text-forest shrink-0">
              <Users className="w-3.5 h-3.5 text-emerald-700" />
            </span>
            <span className="text-xs sm:text-sm font-bold text-forest truncate font-serif">
              Rede de Conexão Profissional
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsNovaDemandaOpen(true)}
              className="px-2.5 sm:px-3 py-1 bg-forest text-white rounded-lg text-[11px] sm:text-xs font-bold flex items-center gap-1 hover:bg-forest/90 shadow-2xs"
            >
              <Plus className="w-3 h-3 text-sun" />
              <span>Demanda</span>
            </button>
            <button
              type="button"
              onClick={() => setIsBannerMinimized(false)}
              className="p-1 rounded-lg text-forest/60 hover:text-forest hover:bg-forest/5 flex items-center gap-1 text-[11px] transition-colors"
              title="Expandir cabeçalho"
            >
              <ChevronDown className="w-4 h-4" />
              <span className="hidden sm:inline">Expandir</span>
            </button>
          </div>
        </div>
      )}

      {/* 1. BARRA DE BUSCA INTELIGENTE (ESPECIALIDADES / ABORDAGENS / PALAVRAS-CHAVE / NOMES) */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-5 border border-soft shadow-xs space-y-2.5 sm:space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-emerald-700/80 absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por especialidade, abordagem clínica, tema ou queixa (ex: ansiedade, casal, TCC, psicanálise, luto, infantil, neuro)..."
            className="w-full pl-9 sm:pl-10 pr-9 py-2 sm:py-2.5 bg-warm/60 border border-soft rounded-xl sm:rounded-2xl text-xs sm:text-sm text-forest placeholder:text-forest/70 focus:outline-none focus:border-forest/40 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-forest/70 hover:text-forest transition-colors"
              title="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Indicador de Busca Ativa & Relações Clínicas Detectadas */}
        {(searchQuery.trim() || selectedSpecialtyChip !== "Todas") && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px] text-forest/80 animate-in fade-in">
            <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/70 inline-flex items-center gap-1">
              <Users className="w-3 h-3 text-emerald-700" />
              {filteredProfissionais.length} {filteredProfissionais.length === 1 ? "profissional encontrado" : "profissionais encontrados"}
            </span>

            {detectedSemanticTerms.length > 0 && (
              <span className="font-medium text-forest/90 bg-warm px-2 py-0.5 rounded-md border border-soft inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                Relação clínica:{" "}
                <strong className="font-semibold text-emerald-900">
                  {detectedSemanticTerms.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(", ")}
                </strong>
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedSpecialtyChip("Todas");
              }}
              className="ml-auto text-[11px] font-bold text-forest/60 hover:text-forest underline cursor-pointer"
            >
              Limpar todos os filtros
            </button>
          </div>
        )}

        {/* Chips de Especialidades / Abordagens Rápidas */}
        <div className="w-full max-w-full min-w-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          <span className="text-[10px] sm:text-[11px] font-bold text-forest/70 uppercase tracking-wider whitespace-nowrap mr-1 flex items-center gap-1">
            <Layers className="w-3 h-3 text-emerald-700" />
            Filtros Rápidos:
          </span>
          {["Todas", ...SUGGESTED_SPECIALTIES].map((spec) => {
            const isSelected = selectedSpecialtyChip === spec;
            return (
              <button
                key={spec}
                type="button"
                onClick={() => setSelectedSpecialtyChip(spec)}
                className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? "bg-forest text-white shadow-2xs font-bold"
                    : "bg-warm hover:bg-forest/10 text-forest/70 border border-soft/60"
                }`}
              >
                {spec}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. CARROSSEL DE PROFISSIONAIS */}
      <div className="space-y-2.5 sm:space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xs sm:text-base font-bold text-forest flex items-center gap-1.5 sm:gap-2 font-serif">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-700" />
              Profissionais Cadastrados na Rede
            </h2>
            <span className="px-2 py-0.5 bg-emerald-100/70 text-emerald-900 text-[10px] sm:text-[11px] font-bold rounded-full border border-emerald-200/60">
              {filteredProfissionais.length}{" "}
              {filteredProfissionais.length === 1 ? "profissional" : "profissionais"}
            </span>
          </div>

          {/* Botões de navegação do carrossel (Desktop) */}
          <div className="hidden sm:flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scrollCarousel("left")}
              disabled={!canScrollLeft}
              className="p-1.5 rounded-full bg-white border border-soft hover:bg-warm text-forest disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-2xs"
              title="Rolar para a esquerda"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollCarousel("right")}
              disabled={!canScrollRight}
              className="p-1.5 rounded-full bg-white border border-soft hover:bg-warm text-forest disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-2xs"
              title="Rolar para a direita"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Track do Carrossel Otimizado para Telas Pequenas */}
        <div className="relative">
          {loadingProfs ? (
            <div className="flex gap-2.5 sm:gap-3 overflow-x-hidden py-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-[145px] sm:w-[185px] h-[210px] bg-white rounded-xl sm:rounded-2xl border border-soft animate-pulse flex-shrink-0 p-2.5 sm:p-3 space-y-2.5"
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-forest/10 rounded-full mx-auto" />
                  <div className="h-3 bg-forest/10 rounded-full w-3/4 mx-auto" />
                  <div className="h-2 bg-forest/10 rounded-full w-1/2 mx-auto" />
                  <div className="h-2 bg-forest/10 rounded-full w-full" />
                </div>
              ))}
            </div>
          ) : filteredProfissionais.length === 0 ? (
            <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-dashed border-soft text-center space-y-2">
              <Users className="w-7 h-7 text-forest/40 mx-auto" />
              <p className="text-xs sm:text-sm font-semibold text-forest">
                Nenhum profissional encontrado para os filtros aplicados.
              </p>
              <p className="text-[11px] sm:text-xs text-forest/70">
                Tente buscar por outro termo ou limpe o filtro para ver todos os colegas.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedSpecialtyChip("Todas");
                }}
                className="mt-1 text-xs text-emerald-700 font-bold underline"
              >
                Limpar filtros de busca
              </button>
            </div>
          ) : (
            <div
              ref={carouselRef}
              className="flex gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar scroll-smooth py-1.5 px-1 snap-x snap-mandatory overscroll-x-contain touch-pan-x"
            >
              {filteredProfissionais.map((prof) => {
                const isCurrentUser =
                  (profile?.uid && prof.uid === profile.uid) ||
                  (profile?.id && prof.id === profile.id);

                const whatsMsg = `Olá, ${prof.name}! Sou colega da Rede AcolheMente e gostaria de me conectar com você.`;
                const whatsUrl = getWhatsAppLink(prof.whatsapp || prof.telefone, whatsMsg);
                const hasPhone = !!(prof.whatsapp || prof.telefone);

                return (
                  <div
                    key={prof.id}
                    className="w-[145px] sm:w-[185px] flex-shrink-0 snap-start bg-white rounded-xl sm:rounded-2xl border border-soft hover:border-emerald-500/40 p-2.5 sm:p-3 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group relative"
                  >
                    {/* Badge de "Você" se for o próprio perfil logado */}
                    {isCurrentUser && (
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-forest text-white text-[8px] sm:text-[9px] font-bold">
                        Você
                      </span>
                    )}

                    <div className="space-y-1.5 sm:space-y-2 text-center">
                      {/* Foto Redonda Centralizada */}
                      <div className="relative mx-auto w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-warm shadow-2xs group-hover:scale-105 transition-transform">
                        <img
                          src={prof.foto}
                          alt={prof.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            // Fallback caso a URL expire
                            (e.target as HTMLImageElement).src =
                              "https://images.unsplash.com/photo-1594824813566-78a9c33fd908?w=400&auto=format&fit=crop&q=80";
                          }}
                        />
                      </div>

                      {/* Nome e Sobrenome */}
                      <div>
                        <h3
                          className="text-xs sm:text-sm font-bold text-forest line-clamp-1 leading-tight"
                          title={prof.name}
                        >
                          {prof.name}
                        </h3>

                        {/* Nome do Cargo / Profissão (Alinhado em até duas linhas) */}
                        <p
                          className="text-[10px] sm:text-[11px] font-semibold text-emerald-800 line-clamp-2 leading-tight min-h-[26px] sm:min-h-[28px] mt-0.5 flex items-center justify-center text-center break-words"
                          title={prof.profissao}
                        >
                          {prof.profissao}
                        </p>
                      </div>

                      {/* Especialidades (Fonte Menor) */}
                      <div className="min-h-[26px] sm:min-h-[30px] flex items-center justify-center">
                        <p
                          className="text-[9px] sm:text-[11px] text-forest/70 line-clamp-2 leading-snug px-0.5"
                          title={prof.especialidade || prof.abordagem || "Especialidades clínicas"}
                        >
                          {prof.especialidade || prof.abordagem || "Atendimento Clínico Humanizado"}
                        </p>
                      </div>

                      {/* CRP / Abordagem Badge */}
                      {prof.crp && (
                        <span className="inline-block text-[8px] sm:text-[9px] font-bold text-forest/60 bg-warm px-1.5 py-0.5 rounded-md">
                          CRP {prof.crp.replace(/^CRP\s*/i, "")}
                        </span>
                      )}
                    </div>

                    {/* Botões de Ação do Card */}
                    <div className="pt-2 mt-1.5 border-t border-soft/60 space-y-1 sm:space-y-1.5">
                      {/* Botão de WhatsApp */}
                      {hasPhone ? (
                        <a
                          href={whatsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                          title={`Conversar com ${prof.name} via WhatsApp`}
                        >
                          <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-sun fill-sun/20" />
                          <span>WhatsApp</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedProfissionalModal(prof)}
                          className="w-full py-1.5 px-2 bg-warm hover:bg-soft text-forest rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                        >
                          <span>Ver Perfil</span>
                        </button>
                      )}

                      {/* Ver Perfil Completo Modal */}
                      <button
                        type="button"
                        onClick={() => setSelectedProfissionalModal(prof)}
                        className="w-full text-center text-[9px] sm:text-[10px] text-forest/70 hover:text-forest font-semibold py-0.5 transition-colors flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Ver Perfil</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. MURAL DE ALERTAS DE DEMANDA ENTRE PROFISSIONAIS */}
      <div className="space-y-4 pt-2">
        {/* Header da Seção de Demandas */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-soft pb-3">
          <div className="space-y-0.5">
            <h2 className="text-base sm:text-lg font-bold text-forest font-serif flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sun-dark" />
              Mural de Alertas de Demanda &amp; Interconsultas
            </h2>
            <p className="text-xs text-forest/70">
              Necessita de apoio específico ou interconsulta? Publique sua demanda para a rede de colegas.
            </p>
          </div>

          {/* Abas de Filtro de Demandas */}
          <div className="flex items-center gap-1 bg-warm rounded-full p-1 border border-soft/80 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setDemandFilterTab("todas")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                demandFilterTab === "todas"
                  ? "bg-white text-forest shadow-2xs font-bold"
                  : "text-forest/70 hover:text-forest"
              }`}
            >
              Todas ({demandas.length})
            </button>
            <button
              type="button"
              onClick={() => setDemandFilterTab("abertas")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                demandFilterTab === "abertas"
                  ? "bg-white text-forest shadow-2xs font-bold"
                  : "text-forest/70 hover:text-forest"
              }`}
            >
              Abertas ({demandas.filter((d) => d.status === "aberta").length})
            </button>
            <button
              type="button"
              onClick={() => setDemandFilterTab("minhas")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                demandFilterTab === "minhas"
                  ? "bg-white text-forest shadow-2xs font-bold"
                  : "text-forest/70 hover:text-forest"
              }`}
            >
              Minhas Demandas
            </button>
          </div>
        </div>

        {/* Lista de Cards de Demandas */}
        {loadingDemandas ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-3xl p-5 border border-soft animate-pulse space-y-3 h-[200px]"
              >
                <div className="h-4 bg-forest/10 rounded w-1/3" />
                <div className="h-5 bg-forest/10 rounded w-3/4" />
                <div className="h-12 bg-forest/10 rounded w-full" />
              </div>
            ))}
          </div>
        ) : filteredDemandas.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-dashed border-soft text-center space-y-3 max-w-xl mx-auto">
            <div className="w-12 h-12 rounded-full bg-forest/5 flex items-center justify-center mx-auto text-forest">
              <Sparkles className="w-6 h-6 text-emerald-700" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-forest">
              Nenhum alerta de demanda cadastrado no momento
            </h3>
            <p className="text-xs text-forest/70 leading-relaxed">
              Precisa encaminhar um paciente para outra abordagem, realizar supervisão clínica ou precisa de um
              especialista parceiro? Seja o primeiro a criar um alerta!
            </p>
            <button
              type="button"
              onClick={() => setIsNovaDemandaOpen(true)}
              className="px-4 py-2 bg-forest text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 hover:bg-forest/90 transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-sun" />
              Criar Alerta de Demanda
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDemandas.map((demanda) => {
              const isAuthor =
                (profile?.uid && demanda.autorUid === profile.uid) ||
                (profile?.id && demanda.autorUid === profile.id) ||
                (profile?.email && demanda.autorEmail === profile.email) ||
                currentRole === "master" ||
                currentRole === "triagem";

              const whatsMsg = `Olá, ${demanda.autorNome}! Vi seu Alerta de Demanda no AcolheMente ("${demanda.titulo}") e gostaria de conversar a respeito.`;
              const whatsUrl = getWhatsAppLink(demanda.autorWhatsapp, whatsMsg);
              const hasWhatsapp = !!demanda.autorWhatsapp;

              return (
                <div
                  key={demanda.id}
                  className={`bg-white rounded-3xl p-5 border transition-all shadow-2xs hover:shadow-md flex flex-col justify-between space-y-4 ${
                    demanda.status === "concluida"
                      ? "border-soft/70 bg-warm/20 opacity-80"
                      : demanda.urgencia === "Urgente"
                      ? "border-red-200/80 hover:border-red-300"
                      : "border-soft hover:border-emerald-500/40"
                  }`}
                >
                  {/* Topo do Card: Categoria, Urgência & Status */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-forest/10 text-forest border border-forest/20">
                        {demanda.categoria}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {demanda.urgencia === "Urgente" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-800 border border-red-200">
                            Urgente
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            demanda.status === "concluida"
                              ? "bg-slate-100 text-slate-700"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {demanda.status === "concluida" ? "Concluída" : "Aberta"}
                        </span>
                      </div>
                    </div>

                    {/* Título da Demanda */}
                    <h3 className="text-sm sm:text-base font-bold text-forest leading-snug">
                      {demanda.titulo}
                    </h3>

                    {/* Descrição */}
                    <p className="text-xs text-forest/70 leading-relaxed line-clamp-3">
                      {demanda.descricao}
                    </p>

                    {/* Especialidades Necessárias */}
                    {demanda.especialidadesNecessarias && demanda.especialidadesNecessarias.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {demanda.especialidadesNecessarias.map((esp, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-warm text-forest text-[10px] font-semibold rounded-md border border-soft/60"
                          >
                            {esp}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Modalidade / Localidade */}
                    <div className="flex items-center gap-3 text-[11px] text-forest/70 pt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-emerald-700" />
                        {demanda.modalidade}
                        {demanda.cidadeEstado ? ` (${demanda.cidadeEstado})` : ""}
                      </span>
                    </div>
                  </div>

                  {/* Rodapé do Card: Autor e Ações */}
                  <div className="pt-3 border-t border-soft/60 space-y-3">
                    {/* Informações do Autor */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-forest/10 border border-warm flex-shrink-0">
                          {demanda.autorFoto ? (
                            <img
                              src={demanda.autorFoto}
                              alt={demanda.autorNome}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-forest text-xs">
                              {demanda.autorNome.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="leading-tight">
                          <p className="text-xs font-bold text-forest line-clamp-1">
                            {demanda.autorNome}
                          </p>
                          <p className="text-[10px] text-forest/60 line-clamp-1">
                            {demanda.autorCargo || "Profissional Parceiro"}
                          </p>
                        </div>
                      </div>

                      {/* Ações de Gestão do Autor */}
                      {isAuthor && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleStatusDemanda(demanda)}
                            className="p-1 text-forest/60 hover:text-forest transition-colors"
                            title={
                              demanda.status === "aberta"
                                ? "Marcar como Concluída"
                                : "Reabrir Demanda"
                            }
                          >
                            <CheckCircle2
                              className={`w-4 h-4 ${
                                demanda.status === "concluida"
                                  ? "text-emerald-700"
                                  : "text-forest/40"
                              }`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDemanda(demanda.id)}
                            className="p-1 text-red-500/70 hover:text-red-700 transition-colors"
                            title="Excluir alerta"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Botão de Contato via WhatsApp com o Criador da Demanda */}
                    {hasWhatsapp ? (
                      <a
                        href={whatsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
                      >
                        <MessageCircle className="w-4 h-4 text-sun" />
                        <span>Entrar em Contato no WhatsApp</span>
                      </a>
                    ) : (
                      <div className="text-center py-1.5 text-[11px] text-forest/60 font-medium bg-warm/50 rounded-xl">
                        Contato via e-mail: {demanda.autorEmail || "Disponível na plataforma"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: CRIAR ALERTA DE DEMANDA */}
      {isNovaDemandaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-forest/30 backdrop-blur-xs animate-in fade-in py-6 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-soft overflow-hidden animate-in zoom-in-95 my-auto">
            {/* Header Modal */}
            <div className="px-6 py-4 bg-forest text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sun" />
                <h3 className="text-base font-bold font-serif">
                  Publicar Alerta de Demanda
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNovaDemandaOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateDemanda} className="p-6 space-y-4">
              <p className="text-xs text-forest/70 leading-relaxed">
                Descreva a necessidade de serviço ou encaminhamento para que outros colegas da rede
                possam visualizar e entrar em contato com você diretamente pelo WhatsApp.
              </p>

              {/* Título da Demanda */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-forest/70">
                  Título da Demanda *
                </label>
                <input
                  type="text"
                  required
                  value={formDemanda.titulo}
                  onChange={(e) =>
                    setFormDemanda({ ...formDemanda, titulo: e.target.value })
                  }
                  placeholder="Ex: Encaminhamento para Psicoterapia Infantil com foco em TDAH"
                  className="w-full px-3.5 py-2.5 bg-warm/50 border border-soft rounded-xl text-xs sm:text-sm text-forest focus:outline-none focus:border-forest"
                />
              </div>

              {/* Categoria & Urgência */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-forest/70">
                    Tipo de Serviço *
                  </label>
                  <select
                    value={formDemanda.categoria}
                    onChange={(e) =>
                      setFormDemanda({
                        ...formDemanda,
                        categoria: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2.5 bg-warm/50 border border-soft rounded-xl text-xs sm:text-sm text-forest focus:outline-none focus:border-forest"
                  >
                    <option value="Encaminhamento de Paciente">
                      Encaminhamento de Paciente
                    </option>
                    <option value="Interconsulta / Parecer">
                      Interconsulta / Parecer
                    </option>
                    <option value="Supervisão Clínica">Supervisão Clínica</option>
                    <option value="Parceria em Projeto">Parceria em Projeto</option>
                    <option value="Avaliação Diagnóstica">
                      Avaliação Diagnóstica
                    </option>
                    <option value="Outro">Outro Serviço</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-forest/70">
                    Nível de Urgência
                  </label>
                  <select
                    value={formDemanda.urgencia}
                    onChange={(e) =>
                      setFormDemanda({
                        ...formDemanda,
                        urgencia: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2.5 bg-warm/50 border border-soft rounded-xl text-xs sm:text-sm text-forest focus:outline-none focus:border-forest"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Moderada">Moderada</option>
                    <option value="Urgente">Urgente / Prioritária</option>
                  </select>
                </div>
              </div>

              {/* Especialidades / Abordagens Necessárias */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-forest/70 flex items-center justify-between">
                  <span>Especialidades Necessárias</span>
                  <span className="text-[10px] font-normal text-forest/50">
                    Separe por vírgulas
                  </span>
                </label>
                <input
                  type="text"
                  value={formDemanda.especialidadesStr}
                  onChange={(e) =>
                    setFormDemanda({
                      ...formDemanda,
                      especialidadesStr: e.target.value,
                    })
                  }
                  placeholder="Ex: TCC, Neuropsicologia, Infantil, TEA"
                  className="w-full px-3.5 py-2.5 bg-warm/50 border border-soft rounded-xl text-xs sm:text-sm text-forest focus:outline-none focus:border-forest"
                />

                {/* Sugestões de Especialidades */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {SUGGESTED_SPECIALTIES.slice(0, 6).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        const current = formDemanda.especialidadesStr
                          ? formDemanda.especialidadesStr.split(",").map((s) => s.trim())
                          : [];
                        if (!current.includes(tag)) {
                          current.push(tag);
                          setFormDemanda({
                            ...formDemanda,
                            especialidadesStr: current.join(", "),
                          });
                        }
                      }}
                      className="px-2 py-0.5 rounded-md bg-warm hover:bg-soft text-[10px] font-semibold text-forest/70 transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modalidade & Cidade/UF */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-forest/70">
                    Modalidade
                  </label>
                  <select
                    value={formDemanda.modalidade}
                    onChange={(e) =>
                      setFormDemanda({
                        ...formDemanda,
                        modalidade: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2.5 bg-warm/50 border border-soft rounded-xl text-xs sm:text-sm text-forest focus:outline-none focus:border-forest"
                  >
                    <option value="Online">Online</option>
                    <option value="Presencial">Presencial</option>
                    <option value="Indiferente">Indiferente</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-forest/70">
                    Cidade / UF (se presencial)
                  </label>
                  <input
                    type="text"
                    value={formDemanda.cidadeEstado}
                    onChange={(e) =>
                      setFormDemanda({
                        ...formDemanda,
                        cidadeEstado: e.target.value,
                      })
                    }
                    placeholder="Ex: São Paulo - SP"
                    className="w-full px-3 py-2.5 bg-warm/50 border border-soft rounded-xl text-xs sm:text-sm text-forest focus:outline-none focus:border-forest"
                  />
                </div>
              </div>

              {/* Descrição Detalhada */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-forest/70">
                  Descrição da Demanda *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formDemanda.descricao}
                  onChange={(e) =>
                    setFormDemanda({ ...formDemanda, descricao: e.target.value })
                  }
                  placeholder="Descreva o contexto do caso, objetivos clínicos e tipo de parceria desejada (lembrando de preservar o sigilo de dados pessoais do paciente)."
                  className="w-full px-3.5 py-2.5 bg-warm/50 border border-soft rounded-xl text-xs sm:text-sm text-forest focus:outline-none focus:border-forest resize-none"
                />
              </div>

              {/* WhatsApp para Contato */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-forest/70 flex items-center justify-between">
                  <span>Seu WhatsApp para Contato Direto *</span>
                  <span className="text-[10px] font-normal text-emerald-800 font-semibold">
                    Botão no card da demanda
                  </span>
                </label>
                <input
                  type="text"
                  required
                  value={formDemanda.whatsapp}
                  onChange={(e) =>
                    setFormDemanda({ ...formDemanda, whatsapp: e.target.value })
                  }
                  placeholder="DDD + Número (ex: 11987654321)"
                  className="w-full px-3.5 py-2.5 bg-warm/50 border border-soft rounded-xl text-xs sm:text-sm text-forest focus:outline-none focus:border-forest"
                />
              </div>

              {/* Footer Modal Buttons */}
              <div className="pt-3 border-t border-soft/80 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNovaDemandaOpen(false)}
                  disabled={isSubmittingDemanda}
                  className="px-4 py-2 text-xs font-semibold text-forest/70 hover:text-forest"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDemanda}
                  className="px-5 py-2.5 bg-forest hover:bg-forest/90 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingDemanda ? (
                    <span>Publicando...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-sun" />
                      <span>Publicar Alerta</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DETALHES DO PERFIL DO PROFISSIONAL */}
      {selectedProfissionalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-forest/30 backdrop-blur-xs animate-in fade-in py-6 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-soft overflow-hidden animate-in zoom-in-95 my-auto">
            {/* Header com Foto & Capa */}
            <div className="bg-forest px-6 pt-6 pb-4 text-white relative text-center">
              <button
                type="button"
                onClick={() => setSelectedProfissionalModal(null)}
                className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-20 h-20 rounded-full overflow-hidden mx-auto border-4 border-white/20 shadow-md">
                <img
                  src={selectedProfissionalModal.foto}
                  alt={selectedProfissionalModal.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <h3 className="text-lg font-bold font-serif mt-3 text-white">
                {selectedProfissionalModal.name}
              </h3>
              <p className="text-xs font-semibold text-sun mt-0.5">
                {selectedProfissionalModal.profissao}
              </p>
              {selectedProfissionalModal.crp && (
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-white/90 mt-1">
                  CRP {selectedProfissionalModal.crp.replace(/^CRP\s*/i, "")}
                </span>
              )}
            </div>

            {/* Informações Clínicas */}
            <div className="p-6 space-y-4 text-left">
              {/* Especialidades */}
              {selectedProfissionalModal.especialidade && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-forest/60">
                    Especialidades / Pós-graduações
                  </span>
                  <p className="text-xs sm:text-sm text-forest font-medium">
                    {selectedProfissionalModal.especialidade}
                  </p>
                </div>
              )}

              {/* Abordagens */}
              {selectedProfissionalModal.abordagem && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-forest/60">
                    Abordagens Psicológicas
                  </span>
                  <p className="text-xs sm:text-sm text-forest font-medium">
                    {selectedProfissionalModal.abordagem}
                  </p>
                </div>
              )}

              {/* Cidade / Estado */}
              {selectedProfissionalModal.cidade && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-forest/60">
                    Local de Atendimento
                  </span>
                  <p className="text-xs sm:text-sm text-forest flex items-center gap-1 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                    {selectedProfissionalModal.cidade}
                    {selectedProfissionalModal.estado ? ` - ${selectedProfissionalModal.estado}` : ""}
                  </p>
                </div>
              )}

              {/* Biografia / Apresentação */}
              {selectedProfissionalModal.biografia && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-forest/60">
                    Apresentação Clínica
                  </span>
                  <p className="text-xs text-forest/80 leading-relaxed italic bg-warm/50 p-3 rounded-xl border border-soft/60">
                    "{selectedProfissionalModal.biografia}"
                  </p>
                </div>
              )}

              {/* Ação: Chamar no WhatsApp */}
              <div className="pt-2">
                {selectedProfissionalModal.whatsapp || selectedProfissionalModal.telefone ? (
                  <a
                    href={getWhatsAppLink(
                      selectedProfissionalModal.whatsapp || selectedProfissionalModal.telefone,
                      `Olá, ${selectedProfissionalModal.name}! Sou colega da Rede AcolheMente e gostaria de me conectar com você.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
                  >
                    <MessageCircle className="w-4 h-4 text-sun" />
                    <span>Conectar no WhatsApp</span>
                  </a>
                ) : (
                  <p className="text-xs text-center text-forest/60 font-medium">
                    E-mail: {selectedProfissionalModal.email || "Não informado"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
