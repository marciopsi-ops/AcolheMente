import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { EventosServicosView } from "./EventosServicosView";
import { ComplianceModal } from "../components/ComplianceModal";
import {
  ArrowLeft,
  User,
  LayoutGrid,
  LogOut,
  CheckCircle2,
  Circle,
  Clock,
  Grip,
  XCircle,
  Search,
  FileText,
  HandHeart,
  HeartHandshake,
  ChevronRight,
  ChevronLeft,
  Info,
  HelpCircle,
  Briefcase,
  Map,
  Users,
  Mail,
  Phone,
  Send,
  Calendar,
  Edit3,
  Trash2,
  CheckSquare,
  Plus,
  BarChart2,
  RefreshCw,
  Building2,
  Link2,
  Copy,
  DollarSign,
  X,
  UserPlus,
  Heart,
  ShieldAlert,
  Star,
  Upload,
  Table,
  Download,
  Eye,
} from "lucide-react";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { triggerEmail } from "../lib/emailService";
import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
  getAuth,
  updatePassword,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  deleteDoc,
  where,
  getDocs,
} from "firebase/firestore";
import { initializeApp } from "firebase/app";
import firebaseConfig from "../../firebase-applet-config.json";
import logoImage from "../assets/images/logo_acolhe.jpeg";
import { parseCSV, parseAndValidateData, ParseResult, ImportedProfissional } from "../lib/importParser";
import { Breadcrumbs } from "../components/Breadcrumbs";

const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(
        "localStorage is not accessible, using fallback in-memory store:",
        e,
      );
      return (window as any).__safe_storage_fallback?.[key] || null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn(
        "localStorage is not accessible, using fallback in-memory store:",
        e,
      );
      if (!(window as any).__safe_storage_fallback) {
        (window as any).__safe_storage_fallback = {};
      }
      (window as any).__safe_storage_fallback[key] = value;
    }
  },
};

type Role = "master" | "triagem" | "profissional";

export const OPCOES_SERVICOS = [
  "Terapia Individual (Adulto)",
  "Terapia de Casal",
  "Terapia Familiar",
  "Terapia Adolescente",
  "Terapia Infantil On Line (Acima dos 12 anos de idade)",
  "Avaliação Psicológica",
  "Avaliação Neuropsicológica",
  "Acompanhamento e Orientação Vocacional/ Transição Profissional e Carreira",
  "Psicologia Jurídica",
  "Laudo para Cirurgias",
  "Terapias Integrativas",
  "Outros"
];

interface UserProfile {
  uid?: string;
  id?: string;
  role: Role;
  name: string;
  email?: string;
  [key: string]: any;
}

interface Acolhimento {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  valorSessao?: string;
  frequenciaSessoes?: string;
  motivoFrequencia?: string;
  viaAcesso: string;
  motivo: string;
  status: string;
  createdAt?: any;
  profissionalId?: string;
  [key: string]: any;
}

interface Doacao {
  id: string;
  nome: string;
  valor: number;
  status: string;
  createdAt?: any;
  email?: string;
  [key: string]: any;
}

interface SolicitacaoDoacao {
  id: string;
  nome: string;
  telefone: string;
  motivo: string;
  status: string;
  createdAt?: any;
  notificacao?: string;
  [key: string]: any;
}

interface ProfissionalLead {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  crp: string;
  cpf?: string;
  especialidade?: string;
  abordagem?: string;
  anoFormacao?: string;
  publicosExperiencia?: string[];
  publicosGosto?: string[];
  outrosPublicosExperiencia?: string;
  outrosPublicosGosto?: string;
  bioCurta?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  siteUrl?: string;
  cidade?: string;
  uf?: string;
  horasDisponiveis: string;
  createdAt?: any;
  status?: string;
  ativo?: boolean;
  [key: string]: any;
}

interface EmpresaLead {
  id: string;
  nomeEmpresa: string;
  cnpj: string;
  ramoAtividade: string;
  local: string;
  colaboradores: string;
  contatoNome: string;
  contatoDepartamento: string;
  email: string;
  telefone: string;
  createdAt?: any;
  status?: string;
  ativo?: boolean;
  [key: string]: any;
  // Dashboard fields
  registrosDeReunioes?: string;
  servicosOferecidos?: string;
  contratoAssinado?: boolean;
  valoresAcertados?: string;
  emissaoNf?: string;
  notificacao?: string;
}

const COLUMNS = [
  {
    id: "Aguardando Avaliação",
    label: "Novos Acolhimentos",
    role: ["master", "triagem"],
    tab: "kanban",
  },
  {
    id: "Em Triagem",
    label: "Em Análise",
    role: ["master", "triagem"],
    tab: "kanban",
  },
  {
    id: "Aprovado",
    label: "Fila de Espera",
    role: ["master", "triagem", "profissional"],
    tab: "kanban",
  },
  {
    id: "Em Atendimento",
    label: "Em Acompanhamento",
    role: ["master", "profissional"],
    tab: "pacientes",
  },
  {
    id: "Alta",
    label: "Alta / Finalizado",
    role: ["master", "profissional"],
    tab: "pacientes",
  },
];

// Debounced components to prevent laggy typing due to frequent parent re-renders and db syncs
const DebouncedInput = ({
  value,
  onChange,
  className,
  placeholder,
  type = "text",
  disabled = false,
  maxLength,
}: {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  maxLength?: number;
}) => {
  const [localVal, setLocalVal] = useState(value);

  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  return (
    <input
      type={type}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
      maxLength={maxLength}
      value={localVal || ""}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={() => {
        if (localVal !== value) {
          onChange(localVal);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
};

const DebouncedTextArea = ({
  value,
  onChange,
  className,
  placeholder,
  maxLength,
}: {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
  maxLength?: number;
}) => {
  const [localVal, setLocalVal] = useState(value);

  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  return (
    <textarea
      placeholder={placeholder}
      className={className}
      maxLength={maxLength}
      value={localVal || ""}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={() => {
        if (localVal !== value) {
          onChange(localVal);
        }
      }}
    />
  );
};

// Editable Field Component
const EditableField = ({
  label,
  value,
  field,
  onChange,
  isEditing,
}: {
  label: string;
  value: any;
  field: string;
  onChange: (f: string, v: any) => void;
  isEditing: boolean;
}) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <div>
      <span className="block text-[10px] font-semibold uppercase text-forest/70/60">
        {label}
      </span>
      {isEditing ? (
        <input
          value={localValue || ""}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={() => {
            if (localValue !== value) {
              onChange(field, localValue);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="text-sm font-medium text-forest border-b border-sun-dark focus:outline-none bg-transparent w-full"
        />
      ) : (
        <span className="text-sm font-medium text-forest">{value || "-"}</span>
      )}
    </div>
  );
};

export function DashboardView({
  onNavigate,
}: {
  onNavigate: (
    view:
      | "landing"
      | "acolhimento"
      | "dashboard"
      | "profile"
      | "empresa"
      | "doacao"
      | "profissional",
  ) => void;
}) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeRoleView, setActiveRoleView] = useState<Role | null>(null);
  const [loadingObj, setLoadingObj] = useState(true);

  const currentRole = activeRoleView || profile?.role || "profissional";
  const modifiedProfile = profile ? { ...profile, role: currentRole } : null;

  const getDashboardBreadcrumbs = () => {
    const roleName = currentRole === "master" ? "Gestor Master" : currentRole === "triagem" ? "Equipe de Triagem" : "Psicólogo Parceiro";
    const tabNames: Record<string, string> = {
      estatisticas: "Estatísticas & Relatórios",
      kanban: "Triagem & Acolhimentos",
      pacientesAcolhidos: "Gestão de Pacientes",
      doacoes: "Apoio Solidário & Doações",
      profissionais: "Profissionais Parceiros",
      empresas: "Empresas Parceiras",
      tarefas: "Tarefas & Pendências",
      acessos: "Níveis de Acesso",
      eventos: "Gestão de Eventos",
      servicos: "Parcerias de Serviços",
      compliance: "Compliance Legal & Termos",
      pacientes: "Meus Pacientes Clínicos",
      tarefasProfissional: "Minhas Pendências",
      perfil: "Configurações de Perfil",
    };
    return [
      { label: "Painel", onClick: () => onNavigate("landing") },
      { label: roleName },
      { label: tabNames[activeTab] || activeTab, active: true }
    ];
  };

  // Tabs
  const [activeTab, setActiveTab] = useState<
    | "kanban"
    | "estatisticas"
    | "doacoes"
    | "profissionais"
    | "empresas"
    | "tarefas"
    | "acessos"
    | "pacientes"
    | "pacientesAcolhidos"
    | "tarefasProfissional"
    | "perfil"
    | "eventos"
    | "servicos"
    | "meusServicos"
    | "compliance"
  >("kanban");

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [triagemViewMode, setTriagemViewMode] = useState<"kanban" | "table">(
    "table",
  );
  const [msgFilterTab, setMsgFilterTab] = useState<
    "all" | "assignment" | "alert" | "system" | "contract"
  >("all");
  const [msgSearchQuery, setMsgSearchQuery] = useState("");

  // Auth form
  const [isLogin, setIsLogin] = useState(true);
  const [showRegisterChoice, setShowRegisterChoice] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("master");
  const [authError, setAuthError] = useState("");

  // Password Reset Flow
  const [newPasswordForReset, setNewPasswordForReset] = useState("");
  const [confirmNewPasswordForReset, setConfirmNewPasswordForReset] =
    useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState("");

  // Kanban
  const [acolhimentos, setAcolhimentos] = useState<Acolhimento[]>([]);
  const [selectedCard, setSelectedCard] = useState<Acolhimento | null>(null);

  // Tour Modal
  const [showTourModal, setShowTourModal] = useState(false);

  // Acolhimento Modal Actions
  const [showNotificarModal, setShowNotificarModal] = useState(false);
  const [showContratoModal, setShowContratoModal] = useState(false);
  const [showNewProfissionalModal, setShowNewProfissionalModal] =
    useState(false);
  const [newProfName, setNewProfName] = useState("");
  const [newProfEmail, setNewProfEmail] = useState("");
  const [newProfPassword, setNewProfPassword] = useState("");
  const [newProfRole, setNewProfRole] = useState<Role>("profissional");
  const [useGoogleLogin, setUseGoogleLogin] = useState(false);
  const [leadIdToConvert, setLeadIdToConvert] = useState<string | null>(null);
  const [isEditingCard, setIsEditingCard] = useState(false);

  // Manual Lead Linkage / Recovery
  const [showVincularLeadModal, setShowVincularLeadModal] = useState(false);
  const [vincularProfTarget, setVincularProfTarget] = useState<UserProfile | null>(null);
  const [vincularSearchQuery, setVincularSearchQuery] = useState("");

  // File Import for Professionals
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<ParseResult | null>(null);
  const [importFeedback, setImportFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Spreadsheet Listing of Professionals
  const [showSpreadsheet, setShowSpreadsheet] = useState(true);
  const [spreadsheetSortAsc, setSpreadsheetSortAsc] = useState(true);
  const [spreadsheetStatusFilter, setSpreadsheetStatusFilter] = useState("all");

  const [templates, setTemplates] = useState([
    {
      id: "pagamento",
      name: "Lembrete de Pagamento",
      msg: "Olá! Identificamos uma pendência de pagamento referente à sua última sessão. Por favor, regularize assim que possível.",
    },
    {
      id: "documento",
      name: "Documentos Pendentes",
      msg: "Olá! Lembramos que há documentos pendentes na sua Ficha de Bordo. Por favor, envie os mesmos para prosseguirmos com seu atendimento.",
    },
    {
      id: "lembrete",
      name: "Lembrete de Sessão",
      msg: "Olá! Este é um lembrete automático sobre a sua sessão de terapia agendada para amanhã.",
    },
    {
      id: "contrato",
      name: "Contrato de Serviços",
      msg: "Olá! Segue o link com o nosso contrato de serviços para a sua leitura e assinatura: [LINK_CONTRATO]",
    },
    {
      id: "boas-vindas-atribuicao",
      name: "Boas Vindas (Após Atribuição)",
      msg: "Olá [NOME]! Seja muito bem-vindo(a) ao Projeto AcolheMente Saúde.\n\nEstamos felizes em informar que o seu atendimento foi atribuído ao profissional [PROFISSIONAL_NOME] (CRP: [PROFISSIONAL_CRP]). Conheça mais sobre o perfil em: [LINK_PERFIL_PROFISSIONAL]\n\nO valor enquadrado para as suas sessões será de [VALOR_SESSAO] com frequência [FREQUENCIA].\n\nObservação: O valor é referente a uma sessão de aproximadamente 45 minutos e que por mês, o valor médio será de [VALOR_MENSAL].\n\nLembramos as regras básicas do nosso acompanhamento:\n- As sessões ocorrerão de forma regular.\n- Cancelamentos ou reagendamentos devem ser informados com no mínimo 24h de antecedência para evitar cobranças.\n\nNo próximo passo, enviaremos o link do seu contrato, onde essas regras estarão detalhadas e deverão ser lidas e assinadas digitalmente.\n\nQualquer dúvida, estamos à disposição para te ajudar em sua jornada de autoconhecimento!",
    },
    {
      id: "proposta",
      name: "Proposta de Atendimento",
      msg: "Olá [NOME]! Segue a proposta de valor e frequência para o seu atendimento no Projeto AcolheMente.\n\nPor favor, acesse o link abaixo para revisar e dar o seu aceite:\n[LINK_PROPOSTA]",
    },
  ]);
  const [notificacaoType, setNotificacaoType] = useState("pagamento");
  const [notificacaoMsg, setNotificacaoMsg] = useState(templates[0].msg);
  const [notificacaoName, setNotificacaoName] = useState(templates[0].name);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);

  const [contratoText, setContratoText] = useState("");

  // Doacoes & Profissionais & Empresas
  const [doacoes, setDoacoes] = useState<Doacao[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoDoacao[]>([]);
  const [profissionaisLeads, setProfissionaisLeads] = useState<
    ProfissionalLead[]
  >([]);
  const [profissionaisAtivos, setProfissionaisAtivos] = useState<UserProfile[]>(
    [],
  );
  const [empresasLeads, setEmpresasLeads] = useState<EmpresaLead[]>([]);
  const [complianceMessages, setComplianceMessages] = useState<any[]>([]);
  const [isReconciling, setIsReconciling] = useState(false);
  const [showComplianceModal, setShowComplianceModal] = useState(false);

  const [selectedProfissional, setSelectedProfissional] = useState<
    ProfissionalLead | UserProfile | null
  >(null);
  const [selectedEmpresa, setSelectedEmpresa] = useState<EmpresaLead | null>(
    null,
  );

  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({ show: false, message: "", type: "success" });

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 4000);
  };

  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [globalConfigs, setGlobalConfigs] = useState({
    telefoneSuporte: "",
    emailSuporte: "",
    fraseSuporte: "",
    faixasValores: ["", "", "", "", ""],
    cidadesRodape: "",
    footerEmail: "",
    footerTelefone: "",
    footerInstagram: "",
    footerLinkedin: "",
    footerDescricao: "",
    urlTermosUso: "",
    urlPoliticaPrivacidade: "",
    urlContratoPrestacao: "",
    doacoesAtivas: true,
  });

  // Psychologist State
  const [meusPacientes, setMeusPacientes] = useState<Acolhimento[]>([]);

  // Services registered by the currently selected professional (Admin / Triagem view)
  const [selectedProfServicos, setSelectedProfServicos] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedProfissional) {
      setSelectedProfServicos([]);
      return;
    }
    const profId = "id" in selectedProfissional ? selectedProfissional.id : selectedProfissional.uid;
    if (!profId) return;

    const q = query(
      collection(db, "servicos_profissionais"),
      where("profissionalId", "==", profId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setSelectedProfServicos(list);
    }, (err) => {
      console.error("Erro ao carregar servicos do profissional selecionado:", err);
    });

    return () => unsubscribe();
  }, [selectedProfissional]);

  // Onboarding State
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);

  // ...

  const handleUpdateEmpresaProperty = async (
    id: string,
    property: string,
    value: any,
  ) => {
    try {
      if (selectedEmpresa && selectedEmpresa.id === id) {
        setSelectedEmpresa({ ...selectedEmpresa, [property]: value });
      }
      const updates: any = { [property]: value, updatedAt: serverTimestamp() };
      if (property === "status") updates.statusUpdatedAt = serverTimestamp();
      if (property === "ativo") updates.ativoUpdatedAt = serverTimestamp();
      await updateDoc(doc(db, "empresa_leads", id), updates);
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar ficha de bordo da empresa.");
    }
  };

  const handleUpdateProfissionalProperty = async (
    id: string,
    property: string,
    value: any,
  ) => {
    try {
      if (
        selectedProfissional &&
        (("id" in selectedProfissional && selectedProfissional.id === id) ||
          ("uid" in selectedProfissional && selectedProfissional.uid === id))
      ) {
        setSelectedProfissional({
          ...selectedProfissional,
          [property]: value,
        } as any);
      }
      const updates: any = { [property]: value, updatedAt: serverTimestamp() };
      if (property === "status") updates.statusUpdatedAt = serverTimestamp();
      if (property === "ativo") updates.ativoUpdatedAt = serverTimestamp();

      const leadDocRef = doc(db, "profissionais_leads", id);
      const userDocRef = doc(db, "users", id);

      let updated = false;

      const leadSnap = await getDoc(leadDocRef);
      if (leadSnap.exists()) {
        await updateDoc(leadDocRef, updates);
        updated = true;
      }

      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        await updateDoc(userDocRef, updates);
        updated = true;
      }

      if (!updated) {
        // Fallback if neither found (shouldn't happen)
        console.warn("Nenhum documento encontrado para atualizar propriedade.");
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar ficha de bordo do profissional.");
    }
  };

  useEffect(() => {
    if (user && profile) {
      const hasSeen = safeLocalStorage.getItem(`onboarding_seen_${user.uid}`);
      if (!hasSeen) setShowOnboarding(true);
    }
  }, [user, profile]);

  const closeOnboarding = () => {
    if (user) {
      safeLocalStorage.setItem(`onboarding_seen_${user.uid}`, "true");
    }
    setShowOnboarding(false);
    setOnboardingStep(0);
  };

  useEffect(() => {
    let unsubCards: (() => void) | undefined;
    let unsubDoacoes: (() => void) | undefined;
    let unsubSol: (() => void) | undefined;
    let unsubProLeads: (() => void) | undefined;
    let unsubProAtivos: (() => void) | undefined;
    let unsubMeusPacientes: (() => void) | undefined;
    let unsubEmpresas: (() => void) | undefined;
    let unsubConfig: (() => void) | undefined;
    let unsubComplianceMsg: (() => void) | undefined;

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid));
        let currentUserProfile: UserProfile | null = null;
        if (snap.exists()) {
          currentUserProfile = { ...snap.data(), uid: u.uid } as UserProfile;
          if (
            currentUserProfile.role === "profissional" &&
            currentUserProfile.ativo === false
          ) {
            await signOut(auth);
            setAuthError(
              "Sua conta está inativa. Entre em contato com o suporte.",
            );
            setUser(null);
            setProfile(null);
            setActiveRoleView(null);
            setLoadingObj(false);
            return;
          }

          // Normalize roles array for legacy compatibility
          if (
            !currentUserProfile.roles ||
            !Array.isArray(currentUserProfile.roles)
          ) {
            currentUserProfile.roles = [
              currentUserProfile.role || "profissional",
            ];
          }

          if (currentUserProfile?.role === "profissional") {
            setActiveTab("pacientes");
            const hasSeenTour = safeLocalStorage.getItem("elo_tour_seen");
            if (!hasSeenTour) {
              setShowTourModal(true);
            }
          }
          setProfile(currentUserProfile);
          setActiveRoleView(currentUserProfile.role);
        }

        unsubConfig = onSnapshot(
          doc(db, "configuracoes", "master"),
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setGlobalConfigs({
                doacoesAtivas: true,
                ...data,
              } as any);
            }
          },
          (error) => {
            console.error("Error loading configurations:", error);
            try {
              handleFirestoreError(
                error,
                OperationType.GET,
                "configuracoes/master",
              );
            } catch (e) {}
          },
        );

        const uRoles = currentUserProfile?.roles || [];
        const hasMaster =
          uRoles.includes("master") || currentUserProfile?.role === "master";
        const hasTriagem =
          uRoles.includes("triagem") || currentUserProfile?.role === "triagem";
        const hasProfissional =
          uRoles.includes("profissional") ||
          currentUserProfile?.role === "profissional";

        if (hasMaster || hasTriagem) {
          // Listen to acolhimentos
          const q = query(collection(db, "acolhimentos"));
          unsubCards = onSnapshot(
            q,
            (snapshot) => {
              const cards: Acolhimento[] = [];
              snapshot.forEach((d) =>
                cards.push({ id: d.id, ...d.data() } as Acolhimento),
              );
              cards.sort(
                (a, b) =>
                  b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.() || 0,
              );
              setAcolhimentos(cards);
            },
            (error) => {
              console.error(
                "Error loading acolhimentos (master/triagem):",
                error,
              );
              try {
                handleFirestoreError(error, OperationType.GET, "acolhimentos");
              } catch (e) {}
            },
          );
        }

        if (hasProfissional) {
          // Listen to assigned acolhimentos - filtered by professionalId for privacy, LGPD & permission rules
          const qq = query(
            collection(db, "acolhimentos"),
            where("profissionalId", "==", u.uid),
          );
          unsubMeusPacientes = onSnapshot(
            qq,
            (snapshot) => {
              const list: Acolhimento[] = [];
              snapshot.forEach((d) => {
                const data = d.data() as Acolhimento;
                list.push({ id: d.id, ...data });
              });
              list.sort(
                (a, b) =>
                  b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.() || 0,
              );
              setMeusPacientes(list);
            },
            (error) => {
              console.error("Error loading meus pacientes:", error);
              try {
                handleFirestoreError(error, OperationType.GET, "acolhimentos");
              } catch (e) {}
            },
          );
        }

        if (hasMaster) {
          unsubDoacoes = onSnapshot(
            query(collection(db, "doacoes")),
            (snapshot) => {
              const list: Doacao[] = [];
              snapshot.forEach((d) =>
                list.push({ id: d.id, ...d.data() } as Doacao),
              );
              list.sort(
                (a, b) =>
                  b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.() || 0,
              );
              setDoacoes(list);
            },
            (error) => {
              console.error("Error loading doacoes:", error);
              try {
                handleFirestoreError(error, OperationType.GET, "doacoes");
              } catch (e) {}
            },
          );
          unsubSol = onSnapshot(
            query(collection(db, "solicitacoes_doacao")),
            (snapshot) => {
              const list: SolicitacaoDoacao[] = [];
              snapshot.forEach((d) =>
                list.push({ id: d.id, ...d.data() } as SolicitacaoDoacao),
              );
              list.sort(
                (a, b) =>
                  b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.() || 0,
              );
              setSolicitacoes(list);
            },
            (error) => {
              console.error("Error loading solicitacoes_doacao:", error);
              try {
                handleFirestoreError(
                  error,
                  OperationType.GET,
                  "solicitacoes_doacao",
                );
              } catch (e) {}
            },
          );
          unsubProLeads = onSnapshot(
            query(collection(db, "profissionais_leads")),
            (snapshot) => {
              const list: ProfissionalLead[] = [];
              snapshot.forEach((d) =>
                list.push({ id: d.id, ...d.data() } as ProfissionalLead),
              );
              list.sort(
                (a, b) =>
                  b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.() || 0,
              );
              setProfissionaisLeads(list);
            },
            (error) => {
              console.error("Error loading profissionais_leads:", error);
              try {
                handleFirestoreError(
                  error,
                  OperationType.GET,
                  "profissionais_leads",
                );
              } catch (e) {}
            },
          );
          unsubProAtivos = onSnapshot(
            query(collection(db, "users")),
            (snapshot) => {
              const listProfs: UserProfile[] = [];
              const listAll: UserProfile[] = [];
              snapshot.forEach((d) => {
                const data = d.data() as UserProfile;
                data.uid = d.id;
                listAll.push(data);
                if (data.role === "profissional") listProfs.push(data);
              });
              setProfissionaisAtivos(listProfs);
              setAllUsers(listAll);
            },
            (error) => {
              console.error("Error loading users:", error);
              try {
                handleFirestoreError(error, OperationType.GET, "users");
              } catch (e) {}
            },
          );
          unsubEmpresas = onSnapshot(
            query(collection(db, "empresa_leads")),
            (snapshot) => {
              const list: EmpresaLead[] = [];
              snapshot.forEach((d) =>
                list.push({ id: d.id, ...d.data() } as EmpresaLead),
              );
              list.sort(
                (a, b) =>
                  b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.() || 0,
              );
              setEmpresasLeads(list);
            },
            (error) => {
              console.error("Error loading empresa_leads:", error);
              try {
                handleFirestoreError(error, OperationType.GET, "empresa_leads");
              } catch (e) {}
            },
          );
        }

        if (hasMaster || hasTriagem) {
          unsubComplianceMsg = onSnapshot(
            query(collection(db, "compliance")),
            (snapshot) => {
              const list: any[] = [];
              snapshot.forEach((d) => list.push({ id: d.id, ...d.data() }));
              list.sort(
                (a, b) =>
                  b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.() || 0,
              );
              setComplianceMessages(list);
            },
            (error) => {
              console.error("Error loading compliance:", error);
              try {
                handleFirestoreError(error, OperationType.GET, "compliance");
              } catch (e) {}
            },
          );
        }

        setLoadingObj(false);
      } else {
        if (unsubCards) unsubCards();
        if (unsubDoacoes) unsubDoacoes();
        if (unsubSol) unsubSol();
        if (unsubProLeads) unsubProLeads();
        if (unsubProAtivos) unsubProAtivos();
        if (unsubMeusPacientes) unsubMeusPacientes();
        if (unsubEmpresas) unsubEmpresas();
        if (unsubConfig) unsubConfig();
        if (unsubComplianceMsg) unsubComplianceMsg();
        unsubCards = undefined;
        unsubDoacoes = undefined;
        unsubSol = undefined;
        unsubProLeads = undefined;
        unsubProAtivos = undefined;
        unsubMeusPacientes = undefined;
        unsubEmpresas = undefined;
        unsubComplianceMsg = undefined;
        setProfile(null);
        setActiveRoleView(null);
        setAcolhimentos([]);
        setDoacoes([]);
        setSolicitacoes([]);
        setProfissionaisLeads([]);
        setProfissionaisAtivos([]);
        setEmpresasLeads([]);
        setMeusPacientes([]);
        setLoadingObj(false);
      }
    });

    return () => {
      unsub();
      if (unsubCards) unsubCards();
      if (unsubDoacoes) unsubDoacoes();
      if (unsubSol) unsubSol();
      if (unsubProLeads) unsubProLeads();
      if (unsubProAtivos) unsubProAtivos();
      if (unsubMeusPacientes) unsubMeusPacientes();
      if (unsubEmpresas) unsubEmpresas();
      if (unsubConfig) unsubConfig();
      if (unsubComplianceMsg) unsubComplianceMsg();
    };
  }, []);

  const handleSaveConfiguracoes = async () => {
    try {
      await setDoc(doc(db, "configuracoes", "master"), globalConfigs, {
        merge: true,
      });
      showToast("Configurações salvas com sucesso!", "success");
    } catch (err) {
      console.error(err);
      showToast("Erro ao salvar as configurações.", "error");
    }
  };

  const handleUpdateConfiguracoesProperty = (field: string, value: any) => {
    setGlobalConfigs((prev) => ({ ...prev, [field]: value }));
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      if (isLogin) {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        // Ensure email/name are saved in DB if not already present
        const userRef = doc(db, "users", cred.user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const d = snap.data();
          if (d.role === "profissional" && d.ativo === false) {
            await signOut(auth);
            setAuthError(
              "Sua conta está inativa. Entre em contato com o suporte.",
            );
            return;
          }
          if (!d.email || (!d.name && cred.user.displayName)) {
            await updateDoc(userRef, {
              email: cred.user.email || email,
              name: d.name || cred.user.displayName || "Usuário",
            });
          }
        } else {
          // Document is missing (maybe due to previous rule failure), create it as profissional
          await setDoc(userRef, {
            role: "profissional",
            name: cred.user.displayName || email.split("@")[0],
            email: cred.user.email || email,
            requirePasswordChange: false,
            createdAt: new Date(),
          });
        }
      } else {
        const cred = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        await setDoc(doc(db, "users", cred.user.uid), {
          role,
          name,
          email: cred.user.email || email,
        });
      }
    } catch (err: any) {
      if (err.code === "auth/operation-not-allowed") {
        setAuthError(
          "Você precisa habilitar o provedor de Email/Senha no console do Firebase Authentication (Build > Authentication > Sign-in method).",
        );
      } else if (err.code === "auth/email-already-in-use") {
        setAuthError(
          "Este e-mail já está em uso. Por favor, faça login com sua conta.",
        );
      } else if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setAuthError("E-mail ou senha incorretos.");
      } else {
        setAuthError(err.message || "Erro de autenticação.");
      }
    }
  };

  const handleGoogleAuth = async () => {
    setAuthError("");
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const userRef = doc(db, "users", result.user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, {
          role: role || "profissional",
          name: result.user.displayName || "Usuário",
          email: result.user.email || "",
        });
      } else {
        const d = snap.data();
        if (d.role === "profissional" && d.ativo === false) {
          await signOut(auth);
          setAuthError(
            "Sua conta está inativa. Entre em contato com o suporte.",
          );
          return;
        }
        if (!d.email || (!d.name && result.user.displayName)) {
          await updateDoc(userRef, {
            email: result.user.email || "",
            name: d.name || result.user.displayName || "Usuário",
          });
        }
      }
    } catch (err: any) {
      if (err.code === "auth/unauthorized-domain") {
        setAuthError(
          "Você precisa adicionar a URL deste painel na aba 'Authorized domains' no console do Firebase Authentication.",
        );
      } else if (err.code === "auth/operation-not-allowed") {
        setAuthError(
          "Você precisa habilitar o provedor do Google no console do Firebase Authentication (Build > Authentication > Sign-in method).",
        );
      } else if (err.code === "auth/account-exists-with-different-credential") {
        setAuthError(
          "Este e-mail já está vinculado a outra forma de login (como senha). Por favor, use a opção correspondente ou vincule as contas.",
        );
      } else {
        setAuthError(err.message || "Erro de autenticação com Google.");
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id || !user || !profile) return;

    // Check role permission for column drops conceptually
    const colConfig = COLUMNS.find((c) => c.id === newStatus);
    if (!colConfig || !colConfig.role.includes(currentRole)) return;

    // Update status
    try {
      const currentPaciente = acolhimentos.find((a) => a.id === id);
      const notifAnterior = currentPaciente?.notificacao
        ? currentPaciente.notificacao + "\n\n"
        : "";
      const nowStr = new Date().toLocaleString("pt-BR");
      const authName = profile?.name || "Parceiro";

      const updates: any = { status: newStatus };
      if (newStatus === "Em Atendimento" && currentRole === "profissional") {
        updates.profissionalId = user.uid;
      }

      updates.notificacao = `${notifAnterior}[${nowStr}] Movido para "${newStatus}" por ${authName}.`;

      await updateDoc(doc(db, "acolhimentos", id), updates);
    } catch (err) {
      console.error(err);
    }
  };

  // State for confirm modal
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [devolverModalConfig, setDevolverModalConfig] = useState<{
    isOpen: boolean;
    pacienteId: string;
    pacienteName: string;
  } | null>(null);
  const [motivoDevolucao, setMotivoDevolucao] = useState("");
  const [motivoDevolucaoOutro, setMotivoDevolucaoOutro] = useState("");

  const handleRolesChange = async (userId: string, newRoles: Role[]) => {
    const isUserMaster = profile?.roles
      ? profile.roles.includes("master")
      : profile?.role === "master";
    if (!profile || !isUserMaster) return;

    if (newRoles.length === 0) {
      alert("É necessário selecionar pelo menos um nível de acesso.");
      return;
    }

    setConfirmConfig({
      isOpen: true,
      message:
        "Tem certeza que deseja alterar as permissões de acesso deste usuário?",
      onConfirm: async () => {
        try {
          // Determine primary role for compatibility
          let primaryRole: Role = "profissional";
          if (newRoles.includes("master")) {
            primaryRole = "master";
          } else if (newRoles.includes("triagem")) {
            primaryRole = "triagem";
          }

          await updateDoc(doc(db, "users", userId), {
            roles: newRoles,
            role: primaryRole,
          });
        } catch (err) {
          console.error("Erro ao alterar nível de acesso:", err);
          alert("Houve um erro ao tentar alterar os níveis de acesso.");
        }
      },
    });
  };

  const handleDeleteProfissional = async (
    id: string,
    formType: "leads" | "ativos",
  ) => {
    if (!profile || currentRole !== "master") return;
    setConfirmConfig({
      isOpen: true,
      message:
        "Tem certeza que deseja excluir permanentemente este profissional?",
      onConfirm: async () => {
        try {
          await deleteDoc(
            doc(db, formType === "leads" ? "profissionais_leads" : "users", id),
          );
        } catch (err) {
          console.error("Erro ao excluir profissional:", err);
          alert("Houve um erro ao tentar excluir o profissional.");
        }
      },
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleUpdateAcolhimentoProperty = async (
    id: string,
    property: string,
    value: any,
  ) => {
    try {
      const currentPaciente = acolhimentos.find((a) => a.id === id);
      const updates: any = { [property]: value };
      if (property === "ativo") {
        updates.statusUpdatedAt = serverTimestamp();
      }

      const nowStr = new Date().toLocaleString("pt-BR");

      // Auto-assign status when changing profissional
      if (property === "profissionalId") {
        const notifAnterior = currentPaciente?.notificacao
          ? currentPaciente.notificacao + "\n\n"
          : "";
        if (value) {
          // Atribuído a alguém
          updates.status = "Em Atendimento";
          updates.atribuicaoStatus = "Pendente";
          const profName =
            profissionaisAtivos.find((p) => p.id === value)?.name || "Parceiro";
          updates.notificacao = `${notifAnterior}[${nowStr}] Atribuído ao profissional ${profName}. Aguardando aceite.`;
        } else {
          // Desatribuído
          updates.status = "Aguardando Avaliação";
          updates.atribuicaoStatus = null;
          updates.notificacao = `${notifAnterior}[${nowStr}] Desatribuído do profissional pelo Gestor. Retornou à Triagem.`;
        }
      }

      updates.updatedAt = serverTimestamp();
      await updateDoc(doc(db, "acolhimentos", id), updates);
      if (selectedCard && selectedCard.id === id) {
        setSelectedCard({ ...selectedCard, ...updates });
      }
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar.");
    }
  };

  const handleUpdateLeadStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "profissionais_leads", id), {
        status: newStatus,
        statusUpdatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error(error);
      alert("Erro ao atualizar status");
    }
  };

  const handleUpdateSelfProfile = async (updates: Partial<UserProfile>) => {
    if (!profile?.uid) return;
    try {
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined),
      );
      await updateDoc(doc(db, "users", profile.uid), cleanUpdates);
      setProfile({ ...profile, ...cleanUpdates } as UserProfile);
      setSuccessMsg("Perfil profissional salvo com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar perfil.");
    }
  };

  const handleCreateProfissional = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let actualLeadId = leadIdToConvert;
      if (!actualLeadId && newProfEmail) {
        const matched = profissionaisLeads.find(
          (l) =>
            (l.email || "").toLowerCase().trim() === (newProfEmail || "").toLowerCase().trim(),
        );
        if (matched) {
          actualLeadId = matched.id;
        }
      }

      let leadData: any = {};
      if (actualLeadId) {
        try {
          const leadDoc = await getDoc(
            doc(db, "profissionais_leads", actualLeadId),
          );
          if (leadDoc.exists()) {
            const data = leadDoc.data();
            leadData = {
              telefone: data.telefone || "",
              crp: data.crp || "",
              cpf: data.cpf || "",
              cidade: data.cidade || "",
              uf: data.uf || "",
              motivacao: data.motivacao || data.motivo || "",
              bioCurta: data.bioCurta || "",
              instagramUrl: data.instagramUrl || "",
              linkedinUrl: data.linkedinUrl || "",
              siteUrl: data.siteUrl || "",
              abordagem: data.abordagem || "",
              especialidade: data.especialidade || "",
              anoFormacao: data.anoFormacao || "",
              horasDisponiveis: data.horasDisponiveis || "",
              publicosExperiencia: data.publicosExperiencia || [],
              publicosGosto: data.publicosGosto || [],
              outrosPublicosExperiencia: data.outrosPublicosExperiencia || "",
              outrosPublicosGosto: data.outrosPublicosGosto || "",
              servicosOferecidos: data.servicosOferecidos || [],
              servicosOrcamentoAcessivel: data.servicosOrcamentoAcessivel || [],
              outrosServicos: data.outrosServicos || "",
              registrosDeReunioes: data.registrosDeReunioes || "",
              notificacao: data.notificacao || "",
            };
          }
        } catch (leadFetchErr) {
          console.error(
            "Erro ao obter dados do lead para migrar:",
            leadFetchErr,
          );
        }
      }

      // Usar uma instância secundária para não deslogar o Gestor
      const secondaryApp = initializeApp(
        firebaseConfig,
        `SecondaryApp_${Date.now()}`,
      );
      const secondaryAuth = getAuth(secondaryApp);

      const cred = await createUserWithEmailAndPassword(
        secondaryAuth,
        newProfEmail,
        newProfPassword,
      );

      // Cria o registro no Firestore usando a conexão principal db existente
      await setDoc(doc(db, "users", cred.user.uid), {
        name: newProfName,
        email: newProfEmail,
        role: newProfRole,
        requirePasswordChange: true,
        createdAt: new Date(),
        ...leadData,
      });

      if (actualLeadId) {
        try {
          await deleteDoc(doc(db, "profissionais_leads", actualLeadId));
        } catch (delErr) {
          console.error("Erro ao remover lead após conversão", delErr);
        }
        setLeadIdToConvert(null);
      }

      await signOut(secondaryAuth);

      const emailBodyProvider = useGoogleLogin
        ? `Sua conta foi criada no sistema. Como você utiliza um e-mail do Google (Gmail), você pode acessar a plataforma clicando diretamente no botão "Entrar com Conta Google".`
        : `Sua conta foi criada no sistema.\n\nLink de Acesso: ${window.location.origin}\nEmail: ${newProfEmail}\nSenha Provisória: ${newProfPassword}\n\nPor favor, acesse o sistema e redefina sua senha no primeiro acesso.`;

      const emailParams = `subject=Bem-vindo(a) ao Projeto AcolheMente Saúde&body=Olá ${newProfName},%0A%0A${encodeURIComponent(emailBodyProvider)}`;

      setConfirmConfig({
        isOpen: true,
        message:
          "Conta de profissional criada com sucesso! Deseja enviar os dados de acesso por e-mail agora?",
        onConfirm: async () => {
          try {
            await triggerEmail(
              newProfEmail,
              "Bem-vindo(a) ao Projeto AcolheMente Saúde",
              `<h3>Olá ${newProfName},</h3><p>${emailBodyProvider.replace(/\n/g, "<br>")}</p>`
            );
            alert("Dados de acesso enviados com sucesso por e-mail via plataforma!");
          } catch (err) {
            console.error("Erro ao enviar e-mail de acesso:", err);
            alert("Erro ao enviar e-mail de acesso via plataforma. Tentando abrir seu cliente de e-mail local...");
            window.open(`mailto:${newProfEmail}?${emailParams}`, "_blank");
          }
        },
      });

      setShowNewProfissionalModal(false);
      setNewProfName("");
      setNewProfEmail("");
      setNewProfPassword("");
      setNewProfRole("profissional");
      setUseGoogleLogin(false);
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        const existingUser = allUsers.find(
          (u) => u.email?.toLowerCase() === newProfEmail.toLowerCase(),
        );
        if (existingUser) {
          try {
            const existingUpdates: any = {
              role: newProfRole,
              statusUpdatedAt: serverTimestamp(),
            };

            // Check lookup again in exception handler in case lead data wasn't matched earlier
            let actualLeadIdExc = leadIdToConvert;
            if (!actualLeadIdExc && newProfEmail) {
              const matched = profissionaisLeads.find(
                (l) =>
                  (l.email || "").toLowerCase().trim() ===
                  (newProfEmail || "").toLowerCase().trim(),
              );
              if (matched) {
                actualLeadIdExc = matched.id;
              }
            }

            if (actualLeadIdExc) {
              try {
                const leadDoc = await getDoc(
                  doc(db, "profissionais_leads", actualLeadIdExc),
                );
                if (leadDoc.exists()) {
                  const data = leadDoc.data();
                  Object.assign(existingUpdates, {
                    telefone: data.telefone || "",
                    crp: data.crp || "",
                    cpf: data.cpf || "",
                    cidade: data.cidade || "",
                    uf: data.uf || "",
                    motivacao: data.motivacao || data.motivo || "",
                    bioCurta: data.bioCurta || "",
                    instagramUrl: data.instagramUrl || "",
                    linkedinUrl: data.linkedinUrl || "",
                    siteUrl: data.siteUrl || "",
                    abordagem: data.abordagem || "",
                    especialidade: data.especialidade || "",
                    anoFormacao: data.anoFormacao || "",
                    horasDisponiveis: data.horasDisponiveis || "",
                    publicosExperiencia: data.publicosExperiencia || [],
                    publicosGosto: data.publicosGosto || [],
                    outrosPublicosExperiencia:
                      data.outrosPublicosExperiencia || "",
                    outrosPublicosGosto: data.outrosPublicosGosto || "",
                    registrosDeReunioes: data.registrosDeReunioes || "",
                    notificacao: data.notificacao || "",
                  });
                }
              } catch (exLeadErr) {
                console.error(
                  "Erro ao obter dados do lead para promover:",
                  exLeadErr,
                );
              }
            }

            await updateDoc(
              doc(db, "users", existingUser.uid!),
              existingUpdates,
            );
            if (actualLeadIdExc) {
              await deleteDoc(doc(db, "profissionais_leads", actualLeadIdExc));
              setLeadIdToConvert(null);
            }
            alert(
              "Este e-mail já possuía uma conta no sistema. O perfil foi vinculado e promovido a Profissional com sucesso!",
            );
            setShowNewProfissionalModal(false);
            setNewProfName("");
            setNewProfEmail("");
            setNewProfPassword("");
            setNewProfRole("profissional");
            setUseGoogleLogin(false);
          } catch (promoteErr) {
            console.error(promoteErr);
            alert("Erro ao promover conta existente a Profissional.");
          }
        } else {
          alert(
            "Aviso: O e-mail informado já possui uma conta mas não configurou o perfil completamente. Peça para a pessoa realizar o login (via Google ou e-mail correspondente) na tela inicial, assim o cadastro será finalizado.",
          );
        }
      } else {
        alert("Erro ao criar conta: " + err.message);
      }
    }
  };

  const handleProcessImportFile = async (file: File) => {
    setImportFile(file);
    setImportFeedback(null);
    setImportProgress(0);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        let parsedRaw: any[] = [];

        if (file.name.endsWith(".json")) {
          const jsonVal = JSON.parse(text);
          parsedRaw = Array.isArray(jsonVal) ? jsonVal : [jsonVal];
        } else if (file.name.endsWith(".csv")) {
          parsedRaw = parseCSV(text);
        } else {
          setImportFeedback({
            success: false,
            message: "Formato de arquivo não suportado. Por favor, envie um arquivo .csv ou .json.",
          });
          return;
        }

        const validation = parseAndValidateData(parsedRaw);
        setImportResults(validation);
      } catch (err: any) {
        console.error("Erro ao processar arquivo:", err);
        setImportFeedback({
          success: false,
          message: `Erro ao analisar o arquivo: ${err.message || err}`,
        });
      }
    };

    reader.onerror = () => {
      setImportFeedback({
        success: false,
        message: "Erro ao ler o arquivo.",
      });
    };

    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!importResults || importResults.data.length === 0) return;

    setIsImporting(true);
    setImportProgress(0);
    setImportFeedback(null);

    let savedCount = 0;
    const total = importResults.data.length;

    try {
      for (const prof of importResults.data) {
        const leadData = {
          nome: prof.nome,
          email: prof.email,
          telefone: prof.telefone || "",
          crp: prof.crp || "",
          cpf: prof.cpf || "",
          cidade: prof.cidade || "",
          uf: prof.uf || "",
          especialidade: prof.especialidade || "",
          abordagem: prof.abordagem || "",
          anoFormacao: prof.anoFormacao || "",
          horasDisponiveis: prof.horasDisponiveis || "1 a 3 horas/mês",
          publicosExperiencia: prof.publicosExperiencia || [],
          publicosGosto: prof.publicosGosto || [],
          outrosPublicosExperiencia: prof.outrosPublicosExperiencia || "",
          outrosPublicosGosto: prof.outrosPublicosGosto || "",
          motivacao: prof.motivacao || "Importado via importação de arquivo.",
          status: "Aguardando Entrevista",
          notificacao: `Importado via arquivo de cadastro em ${new Date().toLocaleDateString("pt-BR")}.`,
          createdAt: new Date(),
        };

        await addDoc(collection(db, "profissionais_leads"), leadData);
        savedCount++;
        setImportProgress(savedCount);
      }

      setImportFeedback({
        success: true,
        message: `${savedCount} profissionais foram importados com sucesso para a fila de Novos Cadastros!`,
      });
      setImportResults(null);
      setImportFile(null);
    } catch (err: any) {
      console.error("Erro durante a importação:", err);
      setImportFeedback({
        success: false,
        message: `Ocorreu um erro durante a importação. ${savedCount} registros de ${total} foram salvos. Erro: ${err.message || err}`,
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleImportDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessImportFile(e.dataTransfer.files[0]);
    }
  };

  const recoverSpecificEmails = async () => {
    const emailsToFind = [
      "b.julianapassospsi21@gmail.com",
      "monique_carilli@hotmail.com",
      "thaliamartins.psi@gmail.com"
    ];
    
    showToast("Iniciando busca profunda no banco de dados...", "info");
    try {
      const collectionsToCheck = ["users", "acolhimentos", "profissionais_leads", "solicitacoes_doacao", "doacoes", "empresa_leads"];
      let found = 0;
      let alreadyInLeads = 0;
      
      for (const email of emailsToFind) {
        let foundForEmail = false;
        
        // First check if already in leads
        const qLeads = query(collection(db, "profissionais_leads"), where("email", "==", email));
        const snapLeads = await getDocs(qLeads);
        if (!snapLeads.empty) {
          alreadyInLeads++;
          foundForEmail = true;
        } else {
          // Check other collections
          for (const colName of ["users", "acolhimentos"]) {
            const q = query(collection(db, colName), where("email", "==", email));
            const snap = await getDocs(q);
            if (!snap.empty) {
              const promises = snap.docs.map(async (docSnap) => {
                const data = docSnap.data();
                await addDoc(collection(db, "profissionais_leads"), {
                  ...data,
                  status: 'Aguardando Entrevista',
                  migratedFrom: colName,
                  createdAt: data.createdAt || serverTimestamp(),
                  nome: data.nome || data.name || data.displayName || "Recuperado pelo Sistema",
                  telefone: data.telefone || data.phone || "(00) 00000-0000",
                  crp: data.crp || "00/00000",
                  horasDisponiveis: data.horasDisponiveis || "0",
                  motivacao: data.motivacao || "Recuperado pelo sistema",
                });
                found++;
              });
              await Promise.all(promises);
              foundForEmail = true;
              break;
            }
          }
        }
        
        if (!foundForEmail) {
          // If totally missing, just create empty shells for them so they show up
          await addDoc(collection(db, "profissionais_leads"), {
            email: email,
            nome: "Recuperado pelo Sistema",
            telefone: "(00) 00000-0000",
            crp: "00/00000",
            horasDisponiveis: "0",
            motivacao: "Recuperado pelo sistema",
            status: 'Aguardando Entrevista',
            migratedFrom: 'manual_recovery',
            createdAt: serverTimestamp(),
          });
          found++;
        }
      }
      showToast(`Busca concluída. Recuperados/Criados: ${found}. Já existiam: ${alreadyInLeads}`, "success");
    } catch (e) {
      console.error(e);
      showToast("Erro na busca profunda: " + String(e), "error");
    }
  };

  const exportSpreadsheetToCSV = () => {
    const headers = [
      "Ordem",
      "Data de Envio",
      "Status",
      "Nome",
      "E-mail",
      "Telefone",
      "CPF",
      "Gênero",
      "Deficiência ou Necessidade Especial",
      "CRP",
      "Cidade",
      "UF",
      "Especialidade",
      "Abordagem",
      "Ano de Formação",
      "Horas Disponíveis",
      "Motivação",
    ];

    // Sort chronologically ascending to list in order of completion
    const sortedLeadsForExport = [...profissionaisLeads].sort((a, b) => {
      const timeA = a.createdAt?.seconds || (a.createdAt?.toMillis ? a.createdAt.toMillis() / 1000 : 0) || (typeof a.createdAt === "string" ? new Date(a.createdAt).getTime() / 1000 : 0) || 0;
      const timeB = b.createdAt?.seconds || (b.createdAt?.toMillis ? b.createdAt.toMillis() / 1000 : 0) || (typeof b.createdAt === "string" ? new Date(b.createdAt).getTime() / 1000 : 0) || 0;
      return timeA - timeB;
    });

    const rows = sortedLeadsForExport.map((lead, idx) => {
      let dateStr = "";
      if (lead.createdAt) {
        try {
          const dateObj = typeof lead.createdAt.toDate === "function"
            ? lead.createdAt.toDate()
            : (lead.createdAt.seconds ? new Date(lead.createdAt.seconds * 1000) : new Date(lead.createdAt));
          dateStr = dateObj.toLocaleDateString("pt-BR");
        } catch (e) {
          dateStr = "";
        }
      }
      return [
        idx + 1,
        dateStr,
        lead.status || "Aguardando Entrevista",
        lead.nome || "",
        lead.email || "",
        lead.telefone || "",
        lead.cpf || "",
        lead.genero || "",
        lead.deficiencia || "",
        lead.crp || "",
        lead.cidade || "",
        lead.uf || "",
        lead.especialidade || "",
        lead.abordagem || "",
        lead.anoFormacao || "",
        lead.horasDisponiveis || "",
        (lead.motivacao || "").replace(/\r?\n|\r/g, " "),
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [
        headers.join(";"),
        ...rows.map((row) =>
          row
            .map((val) => `"${String(val).replace(/"/g, '""')}"`)
            .join(";")
        ),
      ].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `planilha_cadastros_${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReconcileExistingProfs = async () => {
    if (profissionaisAtivos.length === 0) {
      alert(
        "Nenhum profissional ativo cadastrado na plataforma para sincronizar.",
      );
      return;
    }

    const confirm = window.confirm(
      "Esta ação irá procurar por formulários de inscrição pendentes (Leads) que possuam o mesmo e-mail de profissionais ativos e preencher as informações que ainda estiverem vazias no perfil deles (como CRP, CPF, telefone, especialidade, abordagem, cidade, estado, biografia, etc.). Deseja continuar?",
    );
    if (!confirm) return;

    setIsReconciling(true);
    let updatedCount = 0;

    try {
      for (const prof of profissionaisAtivos) {
        if (!prof.email) continue;

        // Find matching lead by email
        const matchingLead = profissionaisLeads.find(
          (lead) =>
            (lead.email || "").toLowerCase().trim() ===
            (prof.email || "").toLowerCase().trim(),
        );

        if (matchingLead) {
          const fieldsToMerge = [
            "telefone",
            "crp",
            "cpf",
            "cidade",
            "uf",
            "motivacao",
            "bioCurta",
            "instagramUrl",
            "linkedinUrl",
            "siteUrl",
            "abordagem",
            "especialidade",
            "anoFormacao",
            "horasDisponiveis",
            "publicosExperiencia",
            "publicosGosto",
            "outrosPublicosExperiencia",
            "outrosPublicosGosto",
            "registrosDeReunioes",
            "notificacao",
          ];

          const updates: any = {};
          let hasNewData = false;

          for (const field of fieldsToMerge) {
            const leadVal = matchingLead[field];
            const profVal = prof[field];

            const isProfEmpty =
              profVal === undefined ||
              profVal === null ||
              profVal === "" ||
              (Array.isArray(profVal) && profVal.length === 0);
            const isLeadNotEmpty =
              leadVal !== undefined &&
              leadVal !== null &&
              leadVal !== "" &&
              (!Array.isArray(leadVal) || leadVal.length > 0);

            if (isProfEmpty && isLeadNotEmpty) {
              updates[field] = leadVal;
              hasNewData = true;
            }
          }

          if (hasNewData) {
            await updateDoc(doc(db, "users", prof.uid!), updates);
            updatedCount++;
          }
        }
      }

      alert(
        `Sincronização concluída! ${updatedCount} profissional(is) atualizado(s) com dados do formulário de inscrição.`,
      );
    } catch (error) {
      console.error("Erro na reconciliação de dados dos profissionais:", error);
      alert("Houve um erro ao sincronizar os dados dos profissionais.");
    } finally {
      setIsReconciling(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  };

  const lowerQuery = searchQuery.toLowerCase();

  const filteredAcolhimentos = acolhimentos.filter(
    (a) =>
      a.ativo !== false &&
      (!searchQuery ||
        a.nomeCivil?.toLowerCase().includes(lowerQuery) ||
        a.nome?.toLowerCase().includes(lowerQuery) ||
        a.nomeDesejado?.toLowerCase().includes(lowerQuery) ||
        a.motivo?.toLowerCase().includes(lowerQuery) ||
        a.telefone?.toLowerCase().includes(lowerQuery)),
  );

  const filteredMeusPacientes = meusPacientes.filter(
    (p) =>
      !searchQuery ||
      p.nomeCivil?.toLowerCase().includes(lowerQuery) ||
      p.nomeDesejado?.toLowerCase().includes(lowerQuery) ||
      p.telefone?.toLowerCase().includes(lowerQuery),
  );

  const getProfissionalNotifications = () => {
    if (!profile || currentRole !== "profissional") return [];

    const list: {
      id: string;
      type: "assignment" | "alert" | "contract" | "system";
      title: string;
      desc: string;
      patientName: string;
      patientObj: Acolhimento;
      date: string;
      timestamp: number;
      isProfileAlert?: boolean;
    }[] = [];

    const formatDateVal = (ts: any) => {
      if (!ts) return "Sem data";
      if (typeof ts.toMillis === "function") {
        return new Date(ts.toMillis()).toLocaleString("pt-BR");
      }
      if (ts instanceof Date) {
        return ts.toLocaleString("pt-BR");
      }
      return String(ts);
    };

    const getMillisVal = (ts: any) => {
      if (!ts) return Date.now();
      if (typeof ts.toMillis === "function") return ts.toMillis();
      if (ts instanceof Date) return ts.getTime();
      return Date.now();
    };

    const parseLogDateToMillis = (dateStr: string, fallback: any) => {
      try {
        const cleaned = dateStr.trim();
        const parts = cleaned.split(/,?\s+/);
        if (parts.length >= 2) {
          const dateParts = parts[0].split("/");
          const timeParts = parts[1].split(":");
          if (dateParts.length === 3 && timeParts.length >= 2) {
            const day = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10) - 1;
            const year = parseInt(dateParts[2], 10);
            const hour = parseInt(timeParts[0], 10);
            const minute = parseInt(timeParts[1], 10);
            const second = timeParts[2] ? parseInt(timeParts[2], 10) : 0;
            return new Date(year, month, day, hour, minute, second).getTime();
          }
        }
      } catch (e) {}
      return getMillisVal(fallback);
    };

    meusPacientes.forEach((p) => {
      const pName = p.nomeDesejado || p.nomeCivil || p.nome || "Não informado";

      // 1. New Assignment (if Pendente or not set)
      if (!p.atribuicaoStatus || p.atribuicaoStatus === "Pendente") {
        list.push({
          id: `${p.id}-pending`,
          type: "assignment",
          title: "Novo Paciente Atribuído",
          desc: "Um novo acolhido foi direcionado a você. Revise a ficha e decida sobre o aceite.",
          patientName: pName,
          patientObj: p,
          date: formatDateVal(p.updatedAt || p.createdAt),
          timestamp: getMillisVal(p.updatedAt || p.createdAt),
        });
      }

      // 2. Contract pending
      if (!p.contratoAssinado) {
        list.push({
          id: `${p.id}-contract`,
          type: "contract",
          title: "Contrato Pendente",
          desc: "Contrato de Prestação de Serviços Psicológicos pendente de assinatura.",
          patientName: pName,
          patientObj: p,
          date: formatDateVal(p.createdAt),
          timestamp: getMillisVal(p.createdAt),
        });
      }

      // 3. Info changed recently
      if (
        p.updatedAt &&
        p.createdAt &&
        getMillisVal(p.updatedAt) - getMillisVal(p.createdAt) > 4000
      ) {
        list.push({
          id: `${p.id}-updated`,
          type: "system",
          title: "Ficha Atualizada",
          desc: "Dados cadastrais, contato ou informações clínicas sofreram atualizações recentes.",
          patientName: pName,
          patientObj: p,
          date: formatDateVal(p.updatedAt),
          timestamp: getMillisVal(p.updatedAt),
        });
      }

      // 4. Clinical/Admin Notification Log (split into individual chronolog entries)
      if (p.notificacao && p.notificacao.trim()) {
        const blocks = p.notificacao
          .split(/\n+/)
          .map((b) => b.trim())
          .filter(Boolean);
        blocks.forEach((block, idx) => {
          const dateMatch = block.match(/^\[(.*?)\]/);
          let dateStr = "";
          let text = block;
          let calculatedTimestamp = getMillisVal(p.updatedAt || p.createdAt);

          if (dateMatch) {
            dateStr = dateMatch[1];
            text = block.replace(/^\[.*?\]/, "").trim();
            calculatedTimestamp = parseLogDateToMillis(
              dateStr,
              p.updatedAt || p.createdAt,
            );
          } else {
            dateStr = formatDateVal(p.updatedAt || p.createdAt);
          }

          const isSystemLog =
            block.includes("Movido para") ||
            block.includes("Atribuído") ||
            block.includes("Desatribuído") ||
            block.includes("devolvido") ||
            block.includes("status") ||
            block.includes("triagem");

          list.push({
            id: `${p.id}-notif-log-${idx}`,
            type: isSystemLog ? "system" : "alert",
            title: isSystemLog
              ? "Movimentação de Sistema"
              : "Mensagem da Gestão",
            desc: text,
            patientName: pName,
            patientObj: p,
            date: dateStr,
            timestamp: calculatedTimestamp,
          });
        });
      }
    });

    // Validate professional profile registration fields
    const missingFields: { name: string; label: string }[] = [];
    if (!profile.photoUrl)
      missingFields.push({
        name: "photoUrl",
        label: "Foto de Perfil & Divulgação",
      });
    if (!profile.telefone || !profile.telefone.trim())
      missingFields.push({
        name: "telefone",
        label: "Telefone / WhatsApp Comercial",
      });
    if (!profile.cpf || !profile.cpf.trim())
      missingFields.push({ name: "cpf", label: "CPF" });
    if (!profile.pixKey || !profile.pixKey.trim())
      missingFields.push({ name: "pixKey", label: "Chave PIX" });
    if (!profile.crp || !profile.crp.trim())
      missingFields.push({ name: "crp", label: "CRP (Registro Profissional)" });
    if (!profile.anoFormacao)
      missingFields.push({
        name: "anoFormacao",
        label: "Ano de Formação / Graduação",
      });
    if (!profile.abordagem || !profile.abordagem.trim())
      missingFields.push({ name: "abordagem", label: "Abordagem Principal" });
    if (!profile.especialidade || !profile.especialidade.trim())
      missingFields.push({ name: "especialidade", label: "Especialidades" });
    if (!profile.cidade || !profile.cidade.trim())
      missingFields.push({ name: "cidade", label: "Cidade de Atendimento" });
    if (!profile.uf || !profile.uf.trim())
      missingFields.push({ name: "uf", label: "Estado (UF)" });
    if (!profile.biografia || !profile.biografia.trim())
      missingFields.push({
        name: "biografia",
        label: "Mini-currículo & Biografia clínica",
      });
    if (!profile.motivacaoProjeto || !profile.motivacaoProjeto.trim())
      missingFields.push({
        name: "motivacaoProjeto",
        label: "Motivações para o projeto",
      });

    const xp = Array.isArray(profile.publicosExperiencia)
      ? profile.publicosExperiencia
      : [];
    if (xp.length === 0)
      missingFields.push({
        name: "publicosExperiencia",
        label: "Experiência com Públicos",
      });

    const gosto = Array.isArray(profile.publicosGosto)
      ? profile.publicosGosto
      : [];
    if (gosto.length === 0)
      missingFields.push({
        name: "publicosGosto",
        label: "Afinidade de atendimento clínico",
      });

    if (missingFields.length > 0) {
      // 1. General alert summarizing all missing fields
      list.push({
        id: "profile-missing-summary",
        type: "alert",
        title: "Ficha Cadastral Incompleta",
        desc: `Sua Ficha Cadastral possui ${missingFields.length} campos pendentes de preenchimento (${missingFields.map((f) => f.label).join(", ")}). Clique para regularizar no seu painel.`,
        patientName: "Seu Cadastro",
        patientObj: { id: "profile" } as any,
        date: "Pendente",
        timestamp: Date.now() + 100000, // Top priority temporal float
        isProfileAlert: true,
      } as any);

      // 2. Specific individual alerts for critical missing fields so they are very visible
      if (!profile.photoUrl) {
        list.push({
          id: "profile-missing-photoUrl-detail",
          type: "alert",
          title: "Pendência: Foto de Perfil não cadastrada",
          desc: "Sua foto de divulgação clínica está vazia. Uma boa foto profissional ajuda muito na identificação e no acolhimento de pacientes.",
          patientName: "Seu Cadastro",
          patientObj: { id: "profile" } as any,
          date: "Pendente",
          timestamp: Date.now() + 99000,
          isProfileAlert: true,
        } as any);
      }
      if (!profile.telefone || !profile.telefone.trim()) {
        list.push({
          id: "profile-missing-telefone-detail",
          type: "alert",
          title: "Pendência: WhatsApp / Contato comercial",
          desc: "Seu Telefone / WhatsApp comercial de contato está ausente. Pacientes de encaminhamento e a coordenação não têm como falar com você.",
          patientName: "Seu Cadastro",
          patientObj: { id: "profile" } as any,
          date: "Pendente",
          timestamp: Date.now() + 98000,
          isProfileAlert: true,
        } as any);
      }
      if (!profile.crp || !profile.crp.trim()) {
        list.push({
          id: "profile-missing-crp-detail",
          type: "alert",
          title: "Pendência: Registro CRP em branco",
          desc: "Seu número CRP não foi preenchido. Precisamos desta informação para regularizar seus registros e validar seus atendimentos.",
          patientName: "Seu Cadastro",
          patientObj: { id: "profile" } as any,
          date: "Pendente",
          timestamp: Date.now() + 97000,
          isProfileAlert: true,
        } as any);
      }
      if (!profile.cpf || !profile.cpf.trim()) {
        list.push({
          id: "profile-missing-cpf-detail",
          type: "alert",
          title: "Pendência: CPF não informado",
          desc: "Seu CPF não foi informado. Este dado é necessário para a prestação de assessoria jurídica e faturamento no AcolheMente.",
          patientName: "Seu Cadastro",
          patientObj: { id: "profile" } as any,
          date: "Pendente",
          timestamp: Date.now() + 96000,
          isProfileAlert: true,
        } as any);
      }
      if (!profile.biografia || !profile.biografia.trim()) {
        list.push({
          id: "profile-missing-biografia-detail",
          type: "alert",
          title: "Pendência: Mini-currículo / Apresentação clínica",
          desc: "Sua biografia clínica está vazia. Escreva um pequeno resumo sobre sua jornada para que pacientes que visitam seu perfil o conheçam.",
          patientName: "Seu Cadastro",
          patientObj: { id: "profile" } as any,
          date: "Pendente",
          timestamp: Date.now() + 95000,
          isProfileAlert: true,
        } as any);
      }
    }

    // Sort by timestamp descending (newest first)
    return list.sort((a, b) => b.timestamp - a.timestamp);
  };

  const profNotifications = getProfissionalNotifications();
  const pendingProfNotificationsCount = profNotifications.filter(
    (n) => n.type === "assignment" || n.type === "contract" || n.isProfileAlert,
  ).length;

  const filteredDoacoes = doacoes.filter(
    (d) =>
      !searchQuery ||
      (d.nome || "").toLowerCase().includes(lowerQuery) ||
      (d.status || "").toLowerCase().includes(lowerQuery) ||
      (d.email || "").toLowerCase().includes(lowerQuery),
  );

  const filteredSolicitacoes = solicitacoes.filter(
    (s) =>
      !searchQuery ||
      (s.nome || "").toLowerCase().includes(lowerQuery) ||
      (s.motivo || "").toLowerCase().includes(lowerQuery) ||
      (s.telefone || "").toLowerCase().includes(lowerQuery),
  );

  const filteredLeads = profissionaisLeads.filter(
    (l) =>
      !searchQuery ||
      (l.nome || "").toLowerCase().includes(lowerQuery) ||
      (l.crp || "").toLowerCase().includes(lowerQuery) ||
      (l.email || "").toLowerCase().includes(lowerQuery) ||
      (l.telefone || "").toLowerCase().includes(lowerQuery) ||
      (l.motivacao || "").toLowerCase().includes(lowerQuery) ||
      (Array.isArray(l.servicosOferecidos) &&
        l.servicosOferecidos.some((s: string) =>
          s.toLowerCase().includes(lowerQuery)
        )) ||
      (l.outrosServicos || "").toLowerCase().includes(lowerQuery),
  );

  const filteredAtivos = profissionaisAtivos.filter(
    (p) =>
      !searchQuery ||
      (p.name || "").toLowerCase().includes(lowerQuery) ||
      (p.email || "").toLowerCase().includes(lowerQuery) ||
      (p.role || "").toLowerCase().includes(lowerQuery) ||
      (Array.isArray(p.servicosOferecidos) &&
        p.servicosOferecidos.some((s: string) =>
          s.toLowerCase().includes(lowerQuery)
        )) ||
      (p.outrosServicos || "").toLowerCase().includes(lowerQuery),
  );

  const prevDataLengths = React.useRef({
    acolhimentos: -1,
    solicitacoes: -1,
    profissionaisLeads: -1,
    empresasLeads: -1,
    meusPacientes: -1,
  });

  useEffect(() => {
    try {
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch((e) => {
          console.warn("Notification permission error:", e);
        });
      }
    } catch (e) {
      console.warn("Could not request notification permission:", e);
    }
  }, []);

  useEffect(() => {
    if (loadingObj) return;

    const prev = prevDataLengths.current;
    const isMaster = profile?.role === "master";
    const isTriagem = profile?.role === "triagem";
    const isMasterOrTriagem = isMaster || isTriagem;
    const isProf = profile?.role === "profissional";
    const canNotify =
      "Notification" in window && Notification.permission === "granted";

    const safeNotify = (title: string, options: NotificationOptions) => {
      if (!canNotify) return;
      try {
        new window.Notification(title, options);
      } catch (e) {
        console.warn("Native Notification error:", e);
        try {
          if ("serviceWorker" in navigator) {
            navigator.serviceWorker.getRegistration().then((reg) => {
              if (reg) reg.showNotification(title, options);
            });
          }
        } catch (swError) {
          console.warn("ServiceWorker Notification error:", swError);
        }
      }
    };

    if (
      prev.acolhimentos !== -1 &&
      acolhimentos.length > prev.acolhimentos &&
      isMasterOrTriagem
    ) {
      safeNotify("Novo Acolhimento", {
        body: "Um novo paciente solicitou acolhimento na plataforma.",
      });
    }
    if (
      prev.solicitacoes !== -1 &&
      solicitacoes.length > prev.solicitacoes &&
      isMasterOrTriagem
    ) {
      safeNotify("Apoio Solidário", {
        body: "Uma nova pessoa solicitou apoio solidário.",
      });
    }
    if (
      prev.profissionaisLeads !== -1 &&
      profissionaisLeads.length > prev.profissionaisLeads &&
      isMaster
    ) {
      safeNotify("Novo Profissional Parceiro", {
        body: "Um profissional se cadastrou na plataforma.",
      });
    }
    if (
      prev.empresasLeads !== -1 &&
      empresasLeads.length > prev.empresasLeads &&
      isMaster
    ) {
      safeNotify("Nova Empresa Parceira", {
        body: "Uma nova empresa se cadastrou na plataforma.",
      });
    }
    if (
      prev.meusPacientes !== -1 &&
      meusPacientes.length > prev.meusPacientes &&
      isProf
    ) {
      safeNotify("Novo Paciente Atribuído", {
        body: "Você recebeu um novo encaminhamento de paciente para atendimento.",
      });
    }

    prevDataLengths.current = {
      acolhimentos: acolhimentos.length,
      solicitacoes: solicitacoes.length,
      profissionaisLeads: profissionaisLeads.length,
      empresasLeads: empresasLeads.length,
      meusPacientes: meusPacientes.length,
    };
  }, [
    acolhimentos.length,
    solicitacoes.length,
    profissionaisLeads.length,
    empresasLeads.length,
    meusPacientes.length,
    loadingObj,
    profile?.role,
  ]);

  if (loadingObj) {
    return (
      <div className="flex h-screen items-center justify-center bg-warm">
        Carregando...
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex flex-col relative overflow-hidden bg-warm items-center justify-center p-6">
        <button
          onClick={() => onNavigate("landing")}
          className="absolute top-8 left-8 flex items-center gap-2 text-forest/70 hover:text-forest/70-dark"
        >
          <ArrowLeft className="w-5 h-5" /> Voltar
        </button>
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-soft">
          <h2 className="font-serif text-3xl font-medium text-forest mb-2">
            Restrito
          </h2>
          <p className="text-forest/70 mb-6">Acesse sua conta.</p>

          {authError && (
            <div className="p-3 mb-4 bg-red-50 text-red-600 rounded-lg text-sm">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-forest/70 mb-1">
                E-mail
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-warm border border-soft rounded-lg focus:outline-none focus:border-sun-dark text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-forest/70 mb-1">
                Senha
              </label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-warm border border-soft rounded-lg focus:outline-none focus:border-sun-dark text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 mt-2 bg-sun-dark text-forest rounded-full font-semibold shadow-md hover:bg-sun-dark-dark transition-all"
            >
              Entrar
            </button>
          </form>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-soft"></div>
            <span className="text-xs text-forest/70 font-semibold uppercase tracking-wider">
              OU
            </span>
            <div className="flex-1 h-px bg-soft"></div>
          </div>

          <button
            onClick={handleGoogleAuth}
            className="w-full py-3 bg-white border border-soft text-forest rounded-full font-semibold shadow-sm hover:bg-warm transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Entrar com Google
          </button>

          <div className="mt-2 text-center text-sm text-forest/70">
            Primeiro acesso?{" "}
            <button
              onClick={() => setShowRegisterChoice(true)}
              className="font-semibold underline underline-offset-4"
            >
              Cadastre-se
            </button>
          </div>
        </div>

        {showRegisterChoice && (
          <div className="fixed inset-0 z-[100] bg-forest/80 flex items-center justify-center p-4">
            <div className="bg-white rounded-[32px] w-full max-w-sm p-8 shadow-2xl relative flex flex-col gap-4">
              <button
                onClick={() => setShowRegisterChoice(false)}
                className="absolute top-6 right-6 text-forest/50 hover:text-forest"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-serif text-2xl text-forest mb-2">
                Quem é você?
              </h3>

              <button
                onClick={() => onNavigate("profissional")}
                className="w-full p-4 border border-soft rounded-xl text-left hover:bg-warm hover:border-sun transition-colors flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-sun/30 flex items-center justify-center text-forest">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-forest">
                    Sou psicólogo/ Terapeuta
                  </div>
                  <div className="text-xs text-forest/70">
                    Quero atender na plataforma
                  </div>
                </div>
              </button>

              <button
                onClick={() => onNavigate("acolhimento")}
                className="w-full p-4 border border-soft rounded-xl text-left hover:bg-warm hover:border-sun transition-colors flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-sun/30 flex items-center justify-center text-forest">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-forest">
                    Sou paciente e quero iniciar meu acolhimento
                  </div>
                  <div className="text-xs text-forest/70">
                    Buscar um profissional
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPasswordForReset !== confirmNewPasswordForReset) {
      setResetPasswordError("As senhas não coincidem.");
      return;
    }
    if (newPasswordForReset.length < 6) {
      setResetPasswordError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (!auth.currentUser) return;

    setIsResettingPassword(true);
    setResetPasswordError("");
    try {
      await updatePassword(auth.currentUser, newPasswordForReset);
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        requirePasswordChange: false,
      });
      setProfile({ ...profile, requirePasswordChange: false } as any);
    } catch (err: any) {
      console.error(err);
      setResetPasswordError(err.message || "Erro ao redefinir senha.");
    } finally {
      setIsResettingPassword(false);
    }
  };

  if (profile.requirePasswordChange) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-warm p-6">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-soft text-center animate-in fade-in zoom-in-95">
          <div className="w-16 h-16 bg-sun-light text-forest rounded-full flex items-center justify-center mx-auto mb-6">
            <HeartHandshake className="w-8 h-8" />
          </div>
          <h2 className="font-serif text-3xl text-forest mb-4">
            Bem-vindo(a) ao AcolheMente!
          </h2>
          <p className="text-forest/70 mb-8 text-sm">
            Que alegria ter você conosco em nossa rede de apoio acessível. Para
            a sua segurança e a dos nossos pacientes, por favor, defina uma nova
            senha para o seu acesso.
          </p>

          {resetPasswordError && (
            <div className="p-3 mb-4 bg-red-50 text-red-600 rounded-lg text-sm">
              {resetPasswordError}
            </div>
          )}

          <form
            onSubmit={handlePasswordReset}
            className="flex flex-col gap-4 text-left"
          >
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-forest/70 mb-1">
                Nova Senha
              </label>
              <input
                required
                type="password"
                value={newPasswordForReset}
                onChange={(e) => setNewPasswordForReset(e.target.value)}
                className="w-full px-4 py-3 bg-warm/50 border border-soft rounded-xl focus:outline-none focus:border-sun-dark text-sm"
                placeholder="Mínimo de 6 caracteres"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-forest/70 mb-1">
                Confirmar Nova Senha
              </label>
              <input
                required
                type="password"
                value={confirmNewPasswordForReset}
                onChange={(e) => setConfirmNewPasswordForReset(e.target.value)}
                className="w-full px-4 py-3 bg-warm/50 border border-soft rounded-xl focus:outline-none focus:border-sun-dark text-sm"
                placeholder="Repita a senha"
              />
            </div>
            <button
              disabled={isResettingPassword}
              type="submit"
              className="w-full py-4 mt-4 bg-forest text-white rounded-full font-semibold shadow-md hover:bg-forest/90 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isResettingPassword
                ? "Atualizando..."
                : "Definir Nova Senha e Entrar"}
            </button>
            <button
              type="button"
              onClick={() => signOut(auth)}
              className="w-full py-3 mt-2 bg-transparent text-forest/70 rounded-full font-semibold hover:bg-warm transition-all text-sm"
            >
              Sair e acessar depois
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Determine which columns this role can see
  const visibleColumns = COLUMNS.filter(
    (c) =>
      c.role.includes(currentRole) &&
      (c.tab === activeTab ||
        (activeTab === "pacientesAcolhidos" && c.tab === "pacientes") ||
        currentRole === "profissional"),
  );

  const roleLabels = {
    master: "Gestor Master",
    triagem: "Triagem",
    profissional: "Psicólogo",
  };

  const renderOnboardingModal = () => {
    if (!showOnboarding) return null;

    const steps = [
      {
        title: "Bem-vindo ao AcolheMente!",
        content:
          "Este é o seu painel de controle. Aqui você acompanha as solicitações, agendamentos e cadastros em tempo real.",
        icon: <HelpCircle className="w-12 h-12 text-forest/70/80 mb-4" />,
      },
      currentRole === "master"
        ? {
            title: "Gestão Completa",
            content:
              "No topo, você pode alternar entre Triagem (Kanban), Apoio Solidário (Doações) e Gerenciamento de Profissionais.",
            icon: <LayoutGrid className="w-12 h-12 text-forest/70/80 mb-4" />,
          }
        : {
            title: "Seus Pacientes",
            content:
              "Você verá os pacientes direcionados a você. Atualize os status conforme inicia e conduz os acolhimentos.",
            icon: <User className="w-12 h-12 text-forest/70/80 mb-4" />,
          },
      {
        title: "Busca Inteligente",
        content:
          "Use a barra de pesquisa no topo para encontrar rapidamente pacientes, lideranças, ou doações por nome, e-mail ou código.",
        icon: <Search className="w-12 h-12 text-forest/70/80 mb-4" />,
      },
      {
        title: "Pronto para começar?",
        content:
          "Seu ambiente já está configurado. A qualquer momento, você pode atualizar os cards arrastando-os ou clicando para ver mais detalhes.",
        icon: <CheckCircle2 className="w-12 h-12 text-[#34A853] mb-4" />,
      },
    ];

    const currentStep = steps[onboardingStep];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest/80 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl relative">
          <div className="absolute top-4 right-4">
            <button
              onClick={closeOnboarding}
              className="text-forest/70/60 hover:text-forest transition-colors p-2"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          <div className="flex flex-col items-center text-center mt-4">
            {currentStep.icon}
            <h2 className="font-serif text-2xl text-forest font-medium mb-3">
              {currentStep.title}
            </h2>
            <p className="text-forest/70/80 mb-8">{currentStep.content}</p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === onboardingStep ? "w-6 bg-sun-dark" : "w-2 bg-soft"}`}
                />
              ))}
            </div>

            <div className="flex gap-2">
              {onboardingStep > 0 && (
                <button
                  onClick={() => setOnboardingStep((s) => s - 1)}
                  className="p-2 border-2 border-sun-dark/20 text-forest/70 rounded-full hover:bg-sun-dark/5 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {onboardingStep < steps.length - 1 ? (
                <button
                  onClick={() => setOnboardingStep((s) => s + 1)}
                  className="px-6 py-2 bg-sun-dark text-forest rounded-full font-semibold hover:bg-sun-dark-dark transition-colors flex items-center gap-2 shadow-lg shadow-forest/5"
                >
                  Próximo
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={closeOnboarding}
                  className="px-6 py-2 bg-[#34A853] text-forest rounded-full font-semibold hover:bg-green-700 transition-colors shadow-lg shadow-green-500/20"
                >
                  Começar a usar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const pendingTriagemCount = acolhimentos.filter(
    (a) => a.notificacao && (!a.status || a.status === "Aguardando Avaliação"),
  ).length;
  const pendingPacientesCount = acolhimentos.filter(
    (a) => a.notificacao && a.status && a.status !== "Aguardando Avaliação",
  ).length;
  const pendingApoioSolidarioCount = solicitacoes.filter(
    (s) => s.status === "Aguardando" || s.notificacao,
  ).length;
  const pendingProfissionaisCount =
    profissionaisLeads.filter(
      (p) => !p.status || p.status === "Aguardando Entrevista" || p.notificacao,
    ).length + profissionaisAtivos.filter((p) => p.notificacao).length;
  const pendingEmpresasCount = empresasLeads.filter(
    (e) => !e.status || e.status === "Aguardando" || e.notificacao,
  ).length;

  const calculateHorasMensais = (acols: Acolhimento[]) => {
    return acols.reduce((sum, a) => {
      if (a.frequenciaSessoes === "Semanal") return sum + 4;
      if (a.frequenciaSessoes === "Quinzenal") return sum + 2;
      if (a.frequenciaSessoes === "Mensal") return sum + 1;
      if (a.frequenciaSessoes === "Sob Demanda") return sum + 1;
      return sum + 4; // Default to 4 if not set yet, considering weekly as standard
    }, 0);
  };

  const parseMaxHorasDisponiveis = (horasDisp?: string) => {
    if (!horasDisp) return 0;
    if (horasDisp.includes("1 a 3")) return 3;
    if (horasDisp.includes("4 a 8")) return 8;
    if (horasDisp.includes("9 a 15")) return 15;
    if (horasDisp.includes("16 a 20")) return 20;
    if (horasDisp.includes("Mais de 20")) return 24;
    return 0;
  };

  const profissionaisAtCapacity = profissionaisAtivos.filter((p) => {
    const profAcolhimentos = acolhimentos.filter(
      (a) =>
        a.profissionalId === p.uid &&
        a.status === "Em Atendimento" &&
        a.atribuicaoStatus === "Aceito",
    );
    const max = parseMaxHorasDisponiveis(p.horasDisponiveis);
    const used = calculateHorasMensais(profAcolhimentos);
    return max > 0 && used >= max;
  });

  const getProfStats = (uid: string) => {
    const profAcolhimentos = acolhimentos.filter(
      (a) =>
        a.profissionalId === uid &&
        a.status === "Em Atendimento" &&
        a.atribuicaoStatus === "Aceito",
    );
    const ativosCount = profAcolhimentos.length;
    const valorTotal = profAcolhimentos.reduce(
      (sum, a) =>
        sum +
        (parseFloat(
          (a.valorSessao || "0").replace(/\./g, "").replace(",", "."),
        ) || 0),
      0,
    );
    const horasMensais = calculateHorasMensais(profAcolhimentos);

    const prof =
      profissionaisAtivos.find((p) => p.uid === uid) ||
      profissionaisLeads.find((p) => p.id === uid);
    const maxHoras = parseMaxHorasDisponiveis(prof?.horasDisponiveis);

    return { ativosCount, valorTotal, horasMensais, maxHoras };
  };

  const notificarTarget =
    activeTab === "kanban" && selectedCard
      ? selectedCard
      : activeTab === "profissionais" && selectedProfissional
        ? selectedProfissional
        : activeTab === "empresas" && selectedEmpresa
          ? selectedEmpresa
          : selectedCard || selectedEmpresa || selectedProfissional;

  const processNotificationTemplate = (msg: string, target: any) => {
    let processedMsg = msg;
    if (target && (activeTab === "kanban" || target.viaAcesso)) {
      // If target is a patient
      const prof = profissionaisAtivos.find(
        (p) => p.uid === target.profissionalId,
      );

      let valorMensal = "a combinar";
      if (target.valorSessao) {
        let cleanValor = target.valorSessao.replace("R$", "").trim();
        const valorNum = parseFloat(
          cleanValor.replace(/\./g, "").replace(",", "."),
        );
        if (!isNaN(valorNum)) {
          let multiplicador = 4;
          if (target.frequenciaSessoes === "Quinzenal") multiplicador = 2;
          if (target.frequenciaSessoes === "Mensal") multiplicador = 1;
          if (target.frequenciaSessoes === "Sob Demanda") multiplicador = 1;

          valorMensal = `R$ ${(valorNum * multiplicador).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${target.valorSessao} x ${multiplicador})`;
        }
      }

      processedMsg = processedMsg.replace(/\[NOME\]/g, target.nome || "");
      processedMsg = processedMsg.replace(
        /\[VALOR_SESSAO\]/g,
        target.valorSessao || "a combinar",
      );
      processedMsg = processedMsg.replace(
        /\[FREQUENCIA\]/g,
        target.frequenciaSessoes || "Semanal",
      );
      processedMsg = processedMsg.replace(/\[VALOR_MENSAL\]/g, valorMensal);
      processedMsg = processedMsg.replace(
        /\[PROFISSIONAL_NOME\]/g,
        prof ? prof.name || "" : "N/A",
      );
      processedMsg = processedMsg.replace(
        /\[PROFISSIONAL_CRP\]/g,
        prof ? prof.crp || "N/A" : "N/A",
      );
      processedMsg = processedMsg.replace(
        /\[LINK_PERFIL_PROFISSIONAL\]/g,
        prof ? `${window.location.origin}/?prof=${prof.uid}` : "N/A",
      );
      processedMsg = processedMsg.replace(
        /\[LINK_CONTRATO\]/g,
        `${window.location.origin}/?contrato=${target.id}`,
      );
      processedMsg = processedMsg.replace(
        /\[LINK_PROPOSTA\]/g,
        `${window.location.origin}/?proposta=${target.id}`,
      );
    } else if (target && target.crp) {
      // If target is professional
      processedMsg = processedMsg.replace(/\[NOME\]/g, target.name || "");
    } else if (target && target.nomeEmpresa) {
      // If target is company
      processedMsg = processedMsg.replace(
        /\[NOME\]/g,
        target.nomeEmpresa || "",
      );
    } else if (target && target.nome) {
      // Fallback
      processedMsg = processedMsg.replace(/\[NOME\]/g, target.nome || "");
    }
    return processedMsg;
  };

  return (
    <div className="h-screen flex flex-col bg-warm overflow-hidden">
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 bg-white/95 backdrop-blur border border-soft shadow-xl px-5 py-3.5 rounded-2xl min-w-[320px] max-w-md"
          >
            {toast.type === "success" && (
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            )}
            {toast.type === "error" && (
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <XCircle className="w-5 h-5" />
              </div>
            )}
            {toast.type === "info" && (
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <Info className="w-5 h-5" />
              </div>
            )}
            <div className="flex-1">
              <p className="text-[10px] font-bold font-sans uppercase tracking-wider text-forest/40">Notificação</p>
              <p className="text-sm font-medium text-forest/90 leading-snug mt-0.5">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast((prev) => ({ ...prev, show: false }))}
              className="p-1 hover:bg-forest/5 rounded-lg text-forest/30 hover:text-forest/70 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {renderOnboardingModal()}
      {/* Topbar */}
      <nav className="shrink-0 bg-white border-b border-soft px-4 sm:px-6 py-3 flex flex-wrap gap-3 sm:gap-4 justify-between items-center z-10 w-full shadow-sm">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => onNavigate("landing")}
            className="text-forest/70 hover:text-forest"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-6 w-px bg-soft"></div>
          <div className="flex items-center gap-2">
            <div className="w-11 h-11 bg-sun rounded-full flex items-center justify-center text-forest overflow-hidden hidden sm:flex shadow-sm">
              <img
                src={logoImage}
                alt="AcolheMente Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-serif text-lg sm:text-xl font-medium text-forest flex items-center gap-2">
              Painel
              <span className="text-forest/70 opacity-50 hidden sm:inline-block">
                /
              </span>
              <span className="hidden sm:inline-block">
                {roleLabels[currentRole]}
              </span>
            </span>
          </div>
        </div>

        {(currentRole === "master" || currentRole === "triagem") && (
          <div className="flex order-last w-full lg:w-auto lg:order-none items-center gap-1 sm:gap-2 bg-warm rounded-full p-1 border border-soft overflow-x-auto no-scrollbar">
            {currentRole === "master" && (
              <button
                onClick={() => setActiveTab("estatisticas")}
                className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap relative flex items-center gap-1.5 ${activeTab === "estatisticas" ? "bg-white shadow-sm text-forest" : "text-forest/70/70 hover:text-forest/70"}`}
              >
                Estatísticas
              </button>
            )}
            <button
              onClick={() => setActiveTab("kanban")}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap relative flex items-center gap-1.5 ${activeTab === "kanban" ? "bg-white shadow-sm text-forest" : "text-forest/70/70 hover:text-forest/70"}`}
            >
              Triagem
              {pendingTriagemCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold ml-1">
                  {pendingTriagemCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("pacientesAcolhidos")}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap relative flex items-center gap-1.5 ${activeTab === "pacientesAcolhidos" ? "bg-white shadow-sm text-forest" : "text-forest/70/70 hover:text-forest/70"}`}
            >
              Pacientes
              {pendingPacientesCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold ml-1">
                  {pendingPacientesCount}
                </span>
              )}
            </button>
            {currentRole === "master" && (
              <button
                onClick={() => setActiveTab("doacoes")}
                className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap relative flex items-center gap-1.5 ${activeTab === "doacoes" ? "bg-white shadow-sm text-forest" : "text-forest/70/70 hover:text-forest/70"}`}
              >
                Apoio Solidário
                {pendingApoioSolidarioCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold ml-1">
                    {pendingApoioSolidarioCount}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={() => setActiveTab("profissionais")}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap relative flex items-center gap-1.5 ${activeTab === "profissionais" ? "bg-white shadow-sm text-forest" : "text-forest/70/70 hover:text-forest/70"}`}
            >
              Profissionais
              {(pendingProfissionaisCount > 0 ||
                profissionaisAtCapacity.length > 0) && (
                <div className="flex items-center gap-1 ml-1">
                  {pendingProfissionaisCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                      {pendingProfissionaisCount}
                    </span>
                  )}
                  {profissionaisAtCapacity.length > 0 && (
                    <span
                      title={`${profissionaisAtCapacity.length} profissional(is) no limite de horas`}
                    >
                      <ShieldAlert className="w-4 h-4 text-red-500" />
                    </span>
                  )}
                </div>
              )}
            </button>
            {currentRole === "master" && (
              <>
                <button
                  onClick={() => setActiveTab("empresas")}
                  className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap relative flex items-center gap-1.5 ${activeTab === "empresas" ? "bg-white shadow-sm text-forest" : "text-forest/70/70 hover:text-forest/70"}`}
                >
                  Empresas
                  {pendingEmpresasCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold ml-1">
                      {pendingEmpresasCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("compliance")}
                  className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap relative flex items-center gap-1.5 ${activeTab === "compliance" ? "bg-white shadow-sm text-forest" : "text-forest/70/70 hover:text-forest/70"}`}
                >
                  Compliance
                  {complianceMessages.filter((m) => m.status === "Pendente")
                    .length > 0 && (
                    <span className="bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold ml-1">
                      {
                        complianceMessages.filter(
                          (m) => m.status === "Pendente",
                        ).length
                      }
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("acessos")}
                  className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${activeTab === "acessos" ? "bg-white shadow-sm text-forest" : "text-forest/70/70 hover:text-forest/70"}`}
                >
                  Acessos
                </button>
              </>
            )}
            <button
              onClick={() => setActiveTab("eventos")}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap relative flex items-center gap-1.5 ${activeTab === "eventos" ? "bg-white shadow-sm text-forest" : "text-forest/70/70 hover:text-forest/70"}`}
            >
              Eventos da Plataforma
            </button>
            <button
              onClick={() => setActiveTab("servicos")}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap relative flex items-center gap-1.5 ${activeTab === "servicos" ? "bg-white shadow-sm text-forest" : "text-forest/70/70 hover:text-forest/70"}`}
            >
              Serviços da Rede
            </button>
          </div>
        )}

        {currentRole === "profissional" && (
          <div className="flex order-last w-full lg:w-auto lg:order-none items-center gap-1 sm:gap-2 bg-warm rounded-full p-1 border border-soft overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab("estatisticas")}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap relative flex items-center gap-1.5 ${activeTab === "estatisticas" ? "bg-white shadow-sm text-forest" : "text-forest/70/70 hover:text-forest/70"}`}
            >
              Estatísticas
            </button>
            <button
              onClick={() => setActiveTab("pacientes")}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${activeTab === "pacientes" ? "bg-white shadow-sm text-forest" : "text-forest/70/70 hover:text-forest/70"}`}
            >
              Meus Pacientes
            </button>
            <button
              onClick={() => setActiveTab("eventos")}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap relative flex items-center gap-1.5 ${activeTab === "eventos" ? "bg-white shadow-sm text-forest" : "text-forest/70/70 hover:text-forest/70"}`}
            >
              Eventos
            </button>
            <button
              onClick={() => setActiveTab("servicos")}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap relative flex items-center gap-1.5 ${activeTab === "servicos" ? "bg-white shadow-sm text-forest" : "text-forest/70/70 hover:text-forest/70"}`}
            >
              Serviços da Rede
            </button>
            <button
              onClick={() => setActiveTab("tarefasProfissional")}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap relative flex items-center gap-1.5 ${activeTab === "tarefasProfissional" ? "bg-white shadow-sm text-forest" : "text-forest/70/70 hover:text-forest/70"}`}
            >
              Alertas e Pendências
              {pendingProfNotificationsCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] w-4.5 h-4.5 flex items-center justify-center rounded-full font-bold">
                  {pendingProfNotificationsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("perfil")}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${activeTab === "perfil" ? "bg-white shadow-sm text-forest" : "text-forest/70/70 hover:text-forest/70"}`}
            >
              Meu Perfil
            </button>
          </div>
        )}

        <div className="flex-1 w-full lg:w-auto lg:max-w-xs relative order-last lg:order-none mt-3 sm:mt-0">
          <Search className="w-4 h-4 text-forest/70 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 sm:py-2 text-sm bg-warm/50 border border-soft rounded-full focus:outline-none focus:border-sun-dark focus:bg-white text-forest transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {profile?.roles && profile.roles.length > 1 && (
            <div className="flex items-center gap-1 bg-warm border border-soft rounded-full p-0.5 shadow-sm shrink-0">
              {profile.roles.map((r: Role) => (
                <button
                  key={r}
                  onClick={() => {
                    setActiveRoleView(r);
                    if (r === "profissional") {
                      setActiveTab("pacientes");
                    } else if (r === "master" || r === "triagem") {
                      setActiveTab("kanban");
                    }
                  }}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-all whitespace-nowrap ${
                    currentRole === r
                      ? "bg-forest text-white shadow-xs"
                      : "text-forest/60 hover:text-forest"
                  }`}
                >
                  {r === "master"
                    ? "Master"
                    : r === "triagem"
                      ? "Triagem"
                      : "Psicólogo"}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 text-xs sm:text-sm text-forest font-medium bg-warm px-3 py-1.5 rounded-full border border-soft max-w-[120px] sm:max-w-none truncate">
            <User className="w-4 h-4 text-forest/70 shrink-0" />
            <span className="truncate">{profile.name}</span>
          </div>
          <button
            onClick={() => signOut(auth)}
            className="p-2 text-forest/70/70 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors shrink-0"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      {(currentRole === "master" || currentRole === "triagem") &&
      activeTab === "estatisticas" ? (
        <div className="flex-1 overflow-auto p-6 md:p-8 flex flex-col gap-8 slide-up">
          <div className="max-w-7xl w-full mx-auto space-y-8">
            <h2 className="font-serif text-3xl text-forest bg-white px-8 py-6 rounded-[2rem] shadow-sm border border-soft flex items-center gap-4">
              <BarChart2 className="w-8 h-8 text-forest/70" />
              Estatísticas da Plataforma
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Pacientes Stats */}
              <div className="bg-white p-6 rounded-3xl border border-soft shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-serif text-xl font-semibold text-forest">
                    Pacientes
                  </h3>
                  <div className="w-10 h-10 rounded-full bg-sun-light/50 text-sun-dark flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-4xl font-bold text-forest">
                  {acolhimentos.length}
                </div>
                <div className="flex gap-4 border-t border-soft pt-4 mt-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">
                      Ativos/Acolhidos
                    </span>
                    <span className="text-lg font-semibold text-forest">
                      {
                        acolhimentos.filter((a) => a.status === "Acolhido")
                          .length
                      }
                    </span>
                  </div>
                  <div className="w-px bg-soft h-full"></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-forest/50 tracking-wider">
                      Outros/Inativos
                    </span>
                    <span className="text-lg font-semibold text-forest">
                      {
                        acolhimentos.filter((a) => a.status !== "Acolhido")
                          .length
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Profissionais Stats */}
              <div className="bg-white p-6 rounded-3xl border border-soft shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-serif text-xl font-semibold text-forest">
                    Profissionais
                  </h3>
                  <div className="w-10 h-10 rounded-full bg-warm text-sun-dark flex items-center justify-center">
                    <Briefcase className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-4xl font-bold text-forest">
                  {profissionaisAtivos.length + profissionaisLeads.length}
                </div>
                <div className="flex gap-4 border-t border-soft pt-4 mt-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">
                      Ativos
                    </span>
                    <span className="text-lg font-semibold text-forest">
                      {profissionaisAtivos.filter((p) => p.ativo !== false)
                        .length +
                        profissionaisLeads.filter(
                          (p) =>
                            !p.status ||
                            p.status === "Aprovado" ||
                            p.status === "Stand-by",
                        ).length}
                    </span>
                  </div>
                  <div className="w-px bg-soft h-full"></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-forest/50 tracking-wider">
                      Inativos/Rejeitados
                    </span>
                    <span className="text-lg font-semibold text-forest">
                      {profissionaisAtivos.filter((p) => p.ativo === false)
                        .length +
                        profissionaisLeads.filter(
                          (p) => p.status === "Rejeitado",
                        ).length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Empresas Stats */}
              <div className="bg-white p-6 rounded-3xl border border-soft shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-serif text-xl font-semibold text-forest">
                    Empresas (NR1)
                  </h3>
                  <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-4xl font-bold text-forest">
                  {empresasLeads.length}
                </div>
                <div className="flex gap-4 border-t border-soft pt-4 mt-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">
                      Ativas
                    </span>
                    <span className="text-lg font-semibold text-forest">
                      {empresasLeads.filter((e) => e.ativo !== false).length}
                    </span>
                  </div>
                  <div className="w-px bg-soft h-full"></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-forest/50 tracking-wider">
                      Inativas
                    </span>
                    <span className="text-lg font-semibold text-forest">
                      {empresasLeads.filter((e) => e.ativo === false).length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Impacto / Horas Stats */}
              <div className="bg-white p-6 rounded-3xl border border-soft shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-serif text-xl font-semibold text-forest">
                    Impacto (Horas/Mês)
                  </h3>
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-4xl font-bold text-emerald-700">
                  {calculateHorasMensais(
                    acolhimentos.filter(
                      (a) =>
                        a.status === "Em Atendimento" &&
                        a.atribuicaoStatus === "Aceito",
                    ),
                  )}
                  h
                </div>
                <div className="flex gap-4 border-t border-soft pt-4 mt-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-forest/50 tracking-wider">
                      Em Atendimento Regular
                    </span>
                    <span className="text-lg font-semibold text-forest">
                      {
                        acolhimentos.filter(
                          (a) =>
                            a.status === "Em Atendimento" &&
                            a.atribuicaoStatus === "Aceito",
                        ).length
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-soft shadow-sm mt-8">
              <h2 className="font-serif text-2xl text-forest mb-6 flex items-center gap-3">
                <Link2 className="w-6 h-6 text-forest/70" />
                Links de Cadastros e Formulários
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    title: "Formulário de Acolhimento",
                    desc: "Link para o paciente iniciar nova triagem.",
                    path: "?view=acolhimento",
                  },
                  {
                    title: "Formulário para Psicólogos",
                    desc: "Link para cadastro de novos profissionais.",
                    path: "?view=profissional",
                  },
                  {
                    title: "Formulário para Empresas",
                    desc: "Link para registro de empresas e leads (NR1).",
                    path: "?view=empresa",
                  },
                ].map((item, idx) => {
                  const url = `${window.location.origin}${item.path}`;
                  return (
                    <div
                      key={idx}
                      className="bg-warm/30 p-5 rounded-2xl border border-soft flex flex-col gap-3"
                    >
                      <h3 className="font-serif text-lg font-medium text-forest">
                        {item.title}
                      </h3>
                      <p className="text-xs text-forest/60 line-clamp-2 min-h-[32px]">
                        {item.desc}
                      </p>
                      <div className="flex items-center gap-2 mt-auto pt-2 border-t border-soft/50">
                        <input
                          type="text"
                          readOnly
                          value={url}
                          className="text-[10px] w-full bg-white border border-soft px-2 py-1.5 rounded-lg text-forest/70 font-mono outline-none"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(url);
                            alert("Link copiado com sucesso!");
                          }}
                          className="p-1.5 bg-sun-light text-sun-dark rounded-lg hover:bg-sun transition-colors shrink-0"
                          title="Copiar Link"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {currentRole === "master" && (
              <div className="bg-white p-8 rounded-[2rem] border border-soft shadow-sm mt-8">
                <h2 className="font-serif text-2xl text-forest mb-6 flex items-center gap-3">
                  <Info className="w-6 h-6 text-forest/70" />
                  Configurações da Plataforma
                </h2>

                <div className="space-y-6 max-w-3xl">
                  <div className="bg-warm/30 p-6 rounded-2xl border border-soft space-y-4">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-forest/70 border-b border-soft pb-2 mb-4">
                      Faixas de Valor de Sessão
                    </h4>
                    <p className="text-xs text-forest/70 mb-4">
                      Defina até 5 opções de valores de sessão que a triagem
                      poderá selecionar ao apresentar uma proposta para o
                      paciente.
                    </p>
                    <div className="flex flex-col gap-3">
                      {[0, 1, 2, 3, 4].map((index) => (
                        <div key={index} className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold uppercase text-forest/70/60 ml-2">
                            Faixa {index + 1}
                          </label>
                          <input
                            className="text-sm bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                            placeholder={`Ex: R$ ${(index + 1) * 30},00`}
                            value={globalConfigs.faixasValores?.[index] || ""}
                            onChange={(e) => {
                              const newFaixas = [
                                ...(globalConfigs.faixasValores || [
                                  "",
                                  "",
                                  "",
                                  "",
                                  "",
                                ]),
                              ];
                              newFaixas[index] = e.target.value;
                              handleUpdateConfiguracoesProperty(
                                "faixasValores",
                                newFaixas,
                              );
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-warm/30 p-6 rounded-2xl border border-soft space-y-4">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-forest/70 border-b border-soft pb-2 mb-4">
                      Funcionalidades do Portal
                    </h4>
                    <p className="text-xs text-forest/70 mb-2">
                      Ative ou desative recursos do portal de acordo com o momento estratégico do negócio.
                    </p>
                    <div className="flex items-center justify-between p-4 bg-white border border-soft rounded-xl mt-2">
                      <div className="flex flex-col gap-1 pr-4">
                        <span className="text-sm font-bold text-forest">Módulo de Doação de Sessões</span>
                        <span className="text-xs text-forest/65">
                          Exibe a opção de doar sessões no menu superior, rodapé e nos botões de ação do portal.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateConfiguracoesProperty(
                            "doacoesAtivas",
                            !globalConfigs.doacoesAtivas,
                          )
                        }
                        className={`w-14 h-8 rounded-full transition-colors relative flex items-center shrink-0 ${
                          globalConfigs.doacoesAtivas ? "bg-forest" : "bg-forest/15"
                        }`}
                      >
                        <span
                          className={`w-6 h-6 bg-white rounded-full absolute shadow-md transition-all ${
                            globalConfigs.doacoesAtivas ? "left-7" : "left-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="bg-warm/30 p-6 rounded-2xl border border-soft space-y-4">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-forest/70 border-b border-soft pb-2 mb-4">
                      Suporte aos Profissionais da Plataforma
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase text-forest/70/60 ml-2">
                          Telefone (WhatsApp)
                        </label>
                        <input
                          className="text-sm bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                          placeholder="Ex: 11999999999"
                          value={globalConfigs.telefoneSuporte || ""}
                          onChange={(e) =>
                            handleUpdateConfiguracoesProperty(
                              "telefoneSuporte",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase text-forest/70/60 ml-2">
                          E-mail de Suporte
                        </label>
                        <input
                          type="email"
                          className="text-sm bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                          placeholder="Ex: suporte@elohumanas.com.br"
                          value={globalConfigs.emailSuporte || ""}
                          onChange={(e) =>
                            handleUpdateConfiguracoesProperty(
                              "emailSuporte",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 mt-4">
                      <label className="text-[10px] font-semibold uppercase text-forest/70/60 ml-2">
                        Frase de Suporte (Mensagem Inicial)
                      </label>
                      <textarea
                        className="text-sm bg-white border border-soft px-4 py-3 rounded-xl focus:outline-none focus:border-sun-dark transition-colors resize-none h-24"
                        placeholder="Ex: Olá! Preciso de ajuda com a plataforma..."
                        value={globalConfigs.fraseSuporte || ""}
                        onChange={(e) =>
                          handleUpdateConfiguracoesProperty(
                            "fraseSuporte",
                            e.target.value,
                          )
                        }
                      />
                      <p className="text-[10px] text-forest/50 ml-2 mb-1">
                        Esta mensagem será sugerida ao profissional quando este
                        acionar o suporte via WhatsApp.
                      </p>
                    </div>
                  </div>

                  <div className="bg-warm/30 p-6 rounded-2xl border border-soft space-y-6">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-forest/70 border-b border-soft pb-2 mb-2">
                      Rodapé do Site
                    </h4>
                    
                    {/* Descrição e Cidades */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase text-forest/70/60 ml-2">
                          Breve Descrição Institucional
                        </label>
                        <textarea
                          className="text-sm bg-white border border-soft px-4 py-3 rounded-xl focus:outline-none focus:border-sun-dark transition-colors resize-none h-28"
                          placeholder="Uma iniciativa focada em democratizar o acesso à saúde mental..."
                          value={globalConfigs.footerDescricao || ""}
                          onChange={(e) =>
                            handleUpdateConfiguracoesProperty(
                              "footerDescricao",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-1 justify-between">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold uppercase text-forest/70/60 ml-2">
                            Cidades de Atuação
                          </label>
                          <input
                            className="text-sm bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                            placeholder="Ex: Brasil • São Paulo • online"
                            value={globalConfigs.cidadesRodape || ""}
                            onChange={(e) =>
                              handleUpdateConfiguracoesProperty(
                                "cidadesRodape",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                        <p className="text-[10px] text-forest/50 ml-2 mb-1 leading-relaxed">
                          Edite as cidades que aparecem no canto inferior direito do rodapé ou mude a descrição principal da sua história para os visitantes.
                        </p>
                      </div>
                    </div>

                    {/* Contato do Rodapé */}
                    <div className="border-t border-soft/50 pt-4">
                      <span className="text-[11px] font-bold uppercase text-forest/60 tracking-wider block mb-3">Informações de Contato</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold uppercase text-forest/70/60 ml-2">
                            E-mail de Contato do Rodapé
                          </label>
                          <input
                            type="email"
                            className="text-sm bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                            placeholder="Ex: contato@acolhemente.com"
                            value={globalConfigs.footerEmail || ""}
                            onChange={(e) =>
                              handleUpdateConfiguracoesProperty(
                                "footerEmail",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold uppercase text-forest/70/60 ml-2">
                            Telefone de Contato do Rodapé
                          </label>
                          <input
                            className="text-sm bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                            placeholder="Ex: (61) 9999-9999"
                            value={globalConfigs.footerTelefone || ""}
                            onChange={(e) =>
                              handleUpdateConfiguracoesProperty(
                                "footerTelefone",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Redes Sociais */}
                    <div className="border-t border-soft/50 pt-4">
                      <span className="text-[11px] font-bold uppercase text-forest/60 tracking-wider block mb-3">Redes Sociais (URLs)</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold uppercase text-forest/70/60 ml-2">
                            Link do Instagram
                          </label>
                          <input
                            type="url"
                            className="text-sm bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                            placeholder="Ex: https://instagram.com/acolhemente"
                            value={globalConfigs.footerInstagram || ""}
                            onChange={(e) =>
                              handleUpdateConfiguracoesProperty(
                                "footerInstagram",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold uppercase text-forest/70/60 ml-2">
                            Link do LinkedIn
                          </label>
                          <input
                            type="url"
                            className="text-sm bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                            placeholder="Ex: https://linkedin.com/company/acolhemente"
                            value={globalConfigs.footerLinkedin || ""}
                            onChange={(e) =>
                              handleUpdateConfiguracoesProperty(
                                "footerLinkedin",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Links Legais */}
                    <div className="border-t border-soft/50 pt-4">
                      <span className="text-[11px] font-bold uppercase text-forest/60 tracking-wider block mb-3">Links Legais & Documentos</span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold uppercase text-forest/70/60 ml-2">
                            Link - Termos de Uso
                          </label>
                          <input
                            type="url"
                            className="text-sm bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                            placeholder="Ex: https://acolhemente.com/termos"
                            value={globalConfigs.urlTermosUso || ""}
                            onChange={(e) =>
                              handleUpdateConfiguracoesProperty(
                                "urlTermosUso",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold uppercase text-forest/70/60 ml-2">
                            Link - Política de Privacidade
                          </label>
                          <input
                            type="url"
                            className="text-sm bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                            placeholder="Ex: https://acolhemente.com/privacidade"
                            value={globalConfigs.urlPoliticaPrivacidade || ""}
                            onChange={(e) =>
                              handleUpdateConfiguracoesProperty(
                                "urlPoliticaPrivacidade",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold uppercase text-forest/70/60 ml-2">
                            Link - Contrato de Prestação
                          </label>
                          <input
                            type="url"
                            className="text-sm bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                            placeholder="Ex: https://acolhemente.com/contrato"
                            value={globalConfigs.urlContratoPrestacao || ""}
                            onChange={(e) =>
                              handleUpdateConfiguracoesProperty(
                                "urlContratoPrestacao",
                                e.target.value,
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveConfiguracoes}
                      className="px-8 py-3 bg-sun-dark text-forest font-bold rounded-full shadow-sm hover:bg-forest hover:text-white transition-all text-sm uppercase tracking-wider"
                    >
                      Salvar Configurações
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : currentRole === "profissional" && activeTab === "estatisticas" ? (
        <div className="flex-1 overflow-auto p-6 md:p-8 flex flex-col gap-8 slide-up">
          <div className="max-w-5xl w-full mx-auto space-y-8">
            <h2 className="font-serif text-3xl text-forest bg-white px-8 py-6 rounded-[2rem] shadow-sm border border-soft flex items-center gap-4">
              <BarChart2 className="w-8 h-8 text-forest/70" />
              Meu Desempenho
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Pacientes Stats */}
              <div className="bg-white p-6 rounded-3xl border border-soft shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-serif text-xl font-semibold text-forest">
                    Meus Pacientes
                  </h3>
                  <div className="w-10 h-10 rounded-full bg-sun text-forest flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-4xl font-bold text-forest">
                  {meusPacientes.length}
                </div>
                <div className="flex gap-4 border-t border-soft pt-4 mt-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">
                      Ativos
                    </span>
                    <span className="text-lg font-semibold text-forest">
                      {
                        meusPacientes.filter(
                          (a) =>
                            a.status === "Em Atendimento" &&
                            a.atribuicaoStatus === "Aceito",
                        ).length
                      }
                    </span>
                  </div>
                  <div className="w-px bg-soft h-full"></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-forest/50 tracking-wider">
                      Alta/Rejeitados
                    </span>
                    <span className="text-lg font-semibold text-forest">
                      {
                        meusPacientes.filter(
                          (a) =>
                            a.status === "Alta" ||
                            a.atribuicaoStatus === "Rejeitado",
                        ).length
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Financeiro Stats */}
              <div className="bg-white p-6 rounded-3xl border border-soft shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-serif text-xl font-semibold text-forest">
                    Valor de Sessões
                  </h3>
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-4xl font-bold text-emerald-700">
                  R${" "}
                  {meusPacientes
                    .filter(
                      (p) =>
                        p.status === "Em Atendimento" &&
                        p.atribuicaoStatus === "Aceito",
                    )
                    .reduce(
                      (sum, p) =>
                        sum +
                        (parseFloat(
                          (p.valorSessao || "0")
                            .replace(/\./g, "")
                            .replace(",", "."),
                        ) || 0),
                      0,
                    )
                    .toFixed(2)
                    .replace(".", ",")}
                </div>
                <div className="flex gap-4 border-t border-soft pt-4 mt-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-forest/50 tracking-wider">
                      Média por Paciente Ativo
                    </span>
                    <span className="text-lg font-semibold text-forest">
                      R${" "}
                      {(() => {
                        const actives = meusPacientes.filter(
                          (p) =>
                            p.status === "Em Atendimento" &&
                            p.atribuicaoStatus === "Aceito",
                        );
                        if (actives.length === 0) return "0,00";
                        const total = actives.reduce(
                          (sum, p) =>
                            sum +
                            (parseFloat(
                              (p.valorSessao || "0")
                                .replace(/\./g, "")
                                .replace(",", "."),
                            ) || 0),
                          0,
                        );
                        return (total / actives.length)
                          .toFixed(2)
                          .replace(".", ",");
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Impacto / Horas Stats (Profissional) */}
              <div className="bg-white p-6 rounded-3xl border border-soft shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-serif text-xl font-semibold text-forest">
                    Horas Mensais
                  </h3>
                  <div className="w-10 h-10 rounded-full bg-sun/50 text-forest flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-4xl font-bold text-forest">
                  {calculateHorasMensais(
                    meusPacientes.filter(
                      (p) =>
                        p.status === "Em Atendimento" &&
                        p.atribuicaoStatus === "Aceito",
                    ),
                  )}
                  h
                </div>
                <div className="flex gap-4 border-t border-soft pt-4 mt-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-forest/50 tracking-wider">
                      Estimativa Mês (Média)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : currentRole === "profissional" && activeTab === "pacientes" ? (
        <div className="flex-1 overflow-auto p-6 md:p-8 flex flex-col gap-8 slide-up">
          <div className="max-w-5xl w-full mx-auto">
            <h2 className="font-serif text-3xl text-forest bg-white px-8 py-6 rounded-[2rem] shadow-sm border border-soft flex items-center gap-4 mb-8">
              <User className="w-8 h-8 text-forest/70" />
              Meus Pacientes Encaminhados
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMeusPacientes.length === 0 ? (
                <div className="col-span-full text-center p-12 bg-white/50 border border-dashed border-soft rounded-[2rem] text-forest/70/70">
                  Nenhum paciente encaminhado no momento.
                </div>
              ) : (
                filteredMeusPacientes.map((p) => {
                  const entryDate = p.createdAt
                    ? new Date(
                        p.createdAt.toMillis
                          ? p.createdAt.toMillis()
                          : p.createdAt.seconds * 1000,
                      ).toLocaleDateString()
                    : "Desconhecida";

                  return (
                    <div
                      key={p.id}
                      className="bg-white p-6 rounded-[2rem] shadow-md border border-soft hover:shadow-lg transition-all duration-300 flex flex-col gap-5 relative group"
                    >
                      {/* Header Row */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-bold text-forest/70 bg-warm px-2.5 py-1 rounded-full uppercase tracking-wider">
                            Paciente
                          </span>
                          <span
                            className={`px-2 py-1 rounded font-bold text-[9px] uppercase tracking-wide leading-none ${
                              p.atribuicaoStatus === "Aceito"
                                ? "bg-[#34A853]/10 text-[#34A853]"
                                : p.atribuicaoStatus === "Rejeitado"
                                  ? "bg-red-500/10 text-red-500"
                                  : "bg-amber-500/10 text-amber-500"
                            }`}
                          >
                            {p.atribuicaoStatus || "Pendente"}
                          </span>
                        </div>
                        <h4 className="font-serif text-xl font-bold text-forest leading-snug tracking-tight">
                          {p.nomeDesejado ||
                            p.nomeCivil ||
                            p.nome ||
                            "Paciente não identificado"}
                        </h4>
                      </div>

                      {/* Information organized in lines (Rows) */}
                      <div className="bg-warm/25 rounded-2xl border border-soft/50 p-4 flex flex-col gap-2.5 text-xs text-forest/85">
                        <div className="flex items-center justify-between py-1 border-b border-soft/30">
                          <span className="text-forest/50 font-medium flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-forest/40" />{" "}
                            Entrada:
                          </span>
                          <span className="font-semibold text-forest/90">
                            {entryDate}
                          </span>
                        </div>

                        <div className="flex items-center justify-between py-1 border-b border-soft/30">
                          <span className="text-forest/50 font-medium flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-forest/40" />{" "}
                            Idade:
                          </span>
                          <span className="font-semibold text-forest/90">
                            {p.idade || "Não informada"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between py-1 border-b border-soft/30">
                          <span className="text-forest/50 font-medium flex items-center gap-1.5">
                            <Circle className="w-3.5 h-3.5 text-forest/40" />{" "}
                            Gênero:
                          </span>
                          <span className="font-semibold text-forest/90">
                            {p.identidadeGenero || "Não informado"}
                          </span>
                        </div>

                        {p.telefone && (
                          <div className="flex items-center justify-between py-1 border-b border-soft/30">
                            <span className="text-forest/50 font-medium flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-forest/40" />{" "}
                              Telefone:
                            </span>
                            <span className="font-semibold text-forest/90">
                              {p.telefone}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between py-1">
                          <span className="text-forest/50 font-medium flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-forest/40" />{" "}
                            Progresso:
                          </span>
                          <span className="font-semibold text-forest/70 bg-white/60 px-2 py-0.5 rounded border border-soft/40 text-[10px]">
                            {p.status}
                          </span>
                        </div>
                      </div>

                      {p.motivo && (
                        <div className="text-xs flex flex-col gap-1.5 text-forest/80">
                          <span className="font-semibold text-forest/60 uppercase tracking-wider text-[10px]">
                            Queixa / Motivo
                          </span>
                          <p className="whitespace-pre-wrap max-h-[120px] overflow-y-auto bg-warm/15 p-3.5 rounded-2xl border border-soft/30 custom-scrollbar leading-relaxed">
                            {p.motivo}
                          </p>
                        </div>
                      )}

                      {(p.valorSessao || p.frequenciaSessoes) && (
                        <div className="flex flex-col gap-2 bg-emerald-50 text-emerald-700 px-4 py-3 rounded-2xl text-xs border border-emerald-100 shadow-sm">
                          {p.valorSessao && (
                            <div className="flex items-center justify-between font-bold">
                              <span className="flex items-center gap-1.5">
                                <DollarSign className="w-4 h-4 text-emerald-600" />{" "}
                                Valor Acertado:
                              </span>
                              <span className="text-sm">
                                R$ {p.valorSessao}
                              </span>
                            </div>
                          )}
                          {p.frequenciaSessoes && (
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5 font-semibold text-emerald-600/80">
                                <Calendar className="w-4 h-4 text-emerald-600/70" />{" "}
                                Frequência:
                              </span>
                              <span className="font-semibold text-emerald-800">
                                {p.frequenciaSessoes}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      <button
                        onClick={() => setSelectedCard(p)}
                        className="w-full py-2.5 bg-forest hover:bg-forest/90 text-white font-serif font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
                      >
                        <FileText className="w-4 h-4" />
                        Ficha do Paciente
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : currentRole === "profissional" &&
        activeTab === "tarefasProfissional" ? (
        <div className="flex-1 overflow-auto p-6 md:p-8 flex flex-col gap-8 slide-up">
          <div className="max-w-7xl w-full mx-auto flex flex-col gap-8">
            {/* Header section with totalizers */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-3xl font-medium text-forest">
                  Alertas e Pendências
                </h2>
                <p className="text-xs text-forest/70 mt-1">
                  Planilha de monitoramento de vínculos, pendências de
                  contratos, pareceres de triagem e comunicações da coordenação.
                </p>
              </div>

              {/* Minimal metrics cells */}
              <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-soft shadow-xs shrink-0 text-xs">
                <div className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg text-center">
                  <span className="block font-bold text-sm">
                    {
                      profNotifications.filter((n) => n.type === "assignment")
                        .length
                    }
                  </span>
                  <span>Novos Recebidos</span>
                </div>
                <div className="h-8 w-px bg-soft"></div>
                <div className="px-3 py-1 bg-red-50 text-red-700 border border-red-100 rounded-lg text-center">
                  <span className="block font-bold text-sm">
                    {profNotifications.filter((n) => n.type === "alert").length}
                  </span>
                  <span>Alertas Clínicos</span>
                </div>
                <div className="h-8 w-px bg-soft"></div>
                <div className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-center">
                  <span className="block font-bold text-sm">
                    {
                      profNotifications.filter((n) => n.type === "contract")
                        .length
                    }
                  </span>
                  <span>Faltam Contratos</span>
                </div>
              </div>
            </div>

            {/* Main Spreadsheet Control Engine */}
            <div className="bg-white border border-soft rounded-[2rem] shadow-sm overflow-hidden flex flex-col">
              {/* Filter controls table bar */}
              <div className="p-5 border-b border-soft bg-warm/30 flex flex-col lg:flex-row items-center justify-between gap-4">
                {/* Spreadsheet category pills */}
                <div className="flex flex-wrap items-center gap-1.5 self-start lg:self-center">
                  {[
                    { id: "all", name: "Todos" },
                    { id: "assignment", name: "Novos Pacientes" },
                    { id: "alert", name: "Alertas da Gestão" },
                    { id: "system", name: "Movimentações" },
                    { id: "contract", name: "Contratos" },
                  ].map((tab) => {
                    const count =
                      tab.id === "all"
                        ? profNotifications.length
                        : profNotifications.filter((n) => n.type === tab.id)
                            .length;
                    const isActive = msgFilterTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setMsgFilterTab(tab.id as any)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          isActive
                            ? "bg-forest text-white shadow-xs"
                            : "bg-white text-forest/70 hover:text-forest hover:bg-white/80 border border-soft"
                        }`}
                      >
                        {tab.name}
                        {count > 0 && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                              isActive
                                ? "bg-red-500 text-white shadow-xs"
                                : "bg-red-100 text-red-700 border border-red-200"
                            }`}
                          >
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Search query inside the table */}
                <div className="w-full lg:w-72 relative self-end lg:self-center">
                  <Search className="w-4 h-4 text-forest/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={msgSearchQuery}
                    onChange={(e) => setMsgSearchQuery(e.target.value)}
                    placeholder="Filtrar planilha..."
                    className="w-full pl-9 pr-4 py-2 bg-white text-xs text-forest placeholder:text-forest/30 border border-soft rounded-full focus:outline-none focus:border-forest/40 focus:ring-1 focus:ring-forest/40 transition-colors"
                  />
                  {msgSearchQuery && (
                    <button
                      onClick={() => setMsgSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-soft rounded-full"
                    >
                      <X className="w-3.5 h-3.5 text-forest/40" />
                    </button>
                  )}
                </div>
              </div>

              {/* Spreadsheet Body */}
              <div className="overflow-x-auto">
                {(() => {
                  const filteredMsgList = profNotifications.filter((notif) => {
                    if (msgFilterTab !== "all" && notif.type !== msgFilterTab)
                      return false;
                    if (msgSearchQuery.trim()) {
                      const q = msgSearchQuery.toLowerCase();
                      return (
                        notif.patientName.toLowerCase().includes(q) ||
                        notif.title.toLowerCase().includes(q) ||
                        notif.desc.toLowerCase().includes(q) ||
                        notif.date.toLowerCase().includes(q)
                      );
                    }
                    return true;
                  });

                  if (filteredMsgList.length === 0) {
                    return (
                      <div className="text-center py-20 px-4 bg-white text-forest/60">
                        <span className="block text-3xl mb-3">📂</span>
                        <p className="text-sm font-semibold">
                          Nenhum registro encontrado na planilha
                        </p>
                        <p className="text-xs text-forest/40 mt-1">
                          Tente ajustar a busca ou os filtros de categoria.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="bg-warm/10 border-b border-soft text-[10px] md:text-xs uppercase tracking-wider text-forest/50 font-semibold select-none">
                          <th className="py-4 px-6 font-medium">
                            Data / Registro
                          </th>
                          <th className="py-4 px-6 font-medium">
                            Paciente Relacionado
                          </th>
                          <th className="py-4 px-6 font-medium">Categoria</th>
                          <th className="py-4 px-6 font-medium">
                            Histórico / Movimentação
                          </th>
                          <th className="py-4 px-6 font-medium text-right">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-soft text-xs">
                        {filteredMsgList.map((notif) => {
                          const isPendingAssignment =
                            notif.type === "assignment" &&
                            (!notif.patientObj.atribuicaoStatus ||
                              notif.patientObj.atribuicaoStatus === "Pendente");

                          return (
                            <tr
                              key={notif.id}
                              className={`hover:bg-[#FDFBF7] transition-colors ${
                                isPendingAssignment ? "bg-amber-50/20" : ""
                              }`}
                            >
                              {/* Date column */}
                              <td className="py-4 px-6 whitespace-nowrap text-[11px] text-forest/65 font-mono">
                                {notif.date}
                              </td>

                              {/* Patient column with avatar badge */}
                              <td className="py-4 px-6 whitespace-nowrap">
                                <div className="flex items-center gap-2.5">
                                  {notif.isProfileAlert ? (
                                    <div className="w-7 h-7 rounded-full bg-forest text-white flex items-center justify-center font-bold text-[10px] uppercase shrink-0 shadow-xs">
                                      <User className="w-3.5 h-3.5" />
                                    </div>
                                  ) : (
                                    <div className="w-7 h-7 rounded-full bg-forest/5 border border-forest/10 flex items-center justify-center text-forest font-bold text-[10px] uppercase shrink-0">
                                      {notif.patientName.slice(0, 2)}
                                    </div>
                                  )}
                                  <button
                                    onClick={() => {
                                      if (notif.isProfileAlert) {
                                        setActiveTab("perfil");
                                      } else {
                                        setSelectedCard(notif.patientObj);
                                        setActiveTab("pacientes");
                                      }
                                    }}
                                    className="font-semibold text-forest hover:underline text-left truncate max-w-[180px]"
                                    title={
                                      notif.isProfileAlert
                                        ? "Completar no meu perfil"
                                        : "Ver ficha clínica completa"
                                    }
                                  >
                                    {notif.patientName}
                                  </button>
                                </div>
                              </td>

                              {/* Category column */}
                              <td className="py-4 px-6 whitespace-nowrap">
                                <span
                                  className={`text-[9px] uppercase font-bold px-2.5 py-1 rounded-full ${
                                    notif.isProfileAlert
                                      ? "bg-red-50 text-red-700 border border-red-200 animate-pulse"
                                      : notif.type === "assignment"
                                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                                        : notif.type === "alert"
                                          ? "bg-red-50 text-red-700 border border-red-200"
                                          : notif.type === "contract"
                                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                                            : "bg-slate-50 text-slate-700 border border-slate-200"
                                  }`}
                                >
                                  {notif.isProfileAlert
                                    ? "Ficha Cadastral"
                                    : notif.type === "assignment"
                                      ? "Novo Paciente"
                                      : notif.type === "alert"
                                        ? "Alerta da Coordenação"
                                        : notif.type === "contract"
                                          ? "Pendência de Contrato"
                                          : "Movimentação"}
                                </span>
                              </td>

                              {/* Description movement text */}
                              <td className="py-4 px-6 max-w-sm">
                                <p className="text-forest/80 line-clamp-2 hover:line-clamp-none transition-all duration-300 select-all font-sans leading-relaxed text-xs">
                                  {notif.desc}
                                </p>
                              </td>

                              {/* Spreadsheet actions */}
                              <td className="py-4 px-6 whitespace-nowrap text-right">
                                {notif.isProfileAlert ? (
                                  <button
                                    onClick={() => {
                                      setActiveTab("perfil");
                                    }}
                                    className="px-3 py-1 bg-sun-dark hover:bg-sun-dark/85 text-forest text-[11px] font-bold rounded-lg border border-soft transition-colors inline-flex items-center gap-1 shadow-xs"
                                  >
                                    <User className="w-3.5 h-3.5 text-forest/70" />{" "}
                                    Completar Cadastro
                                  </button>
                                ) : isPendingAssignment ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={async () => {
                                        const notifAnterior = notif.patientObj
                                          .notificacao
                                          ? notif.patientObj.notificacao +
                                            "\n\n"
                                          : "";
                                        const nowStr =
                                          new Date().toLocaleString("pt-BR");
                                        const authName =
                                          profile?.name || "Parceiro";
                                        const updates = {
                                          atribuicaoStatus: "Aceito",
                                          notificacao: `${notifAnterior}[${nowStr}] Encaminhamento ACEITO pelo profissional ${authName} via planilha de tarefas.`,
                                        };
                                        await updateDoc(
                                          doc(
                                            db,
                                            "acolhimentos",
                                            notif.patientObj.id,
                                          ),
                                          updates,
                                        );
                                      }}
                                      className="px-2.5 py-1 bg-[#34A853] hover:bg-[#2e9449] text-white rounded-lg text-[10px] font-bold uppercase transition-colors flex items-center gap-1 shadow-xs"
                                      title="Aceitar paciente imediatamente"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />{" "}
                                      Aceitar
                                    </button>
                                    <button
                                      onClick={() => {
                                        setDevolverModalConfig({
                                          isOpen: true,
                                          pacienteId: notif.patientObj.id,
                                          pacienteName: notif.patientName,
                                        });
                                      }}
                                      className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-lg text-[10px] font-bold uppercase transition-colors"
                                      title="Devolver atendimento para triagem"
                                    >
                                      Devolver
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setSelectedCard(notif.patientObj);
                                      setActiveTab("pacientes");
                                    }}
                                    className="px-3 py-1 bg-warm hover:bg-soft text-forest text-[11px] font-bold rounded-lg border border-soft transition-colors inline-flex items-center gap-1"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-forest/70" />{" "}
                                    Ver Paciente
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            </div>

            {/* Suporte Técnico CTA */}
            <div className="bg-forest text-white rounded-[2rem] p-8 flex flex-col md:flex-row items-center gap-6 justify-between shadow-md">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <HelpCircle className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="font-serif text-2xl font-medium mb-1">
                    Central de Suporte
                  </h3>
                  <p className="text-sm text-white/80 max-w-sm">
                    Precisa de ajuda com a plataforma, dúvidas contratuais ou
                    suporte clínico? Estamos aqui para apoiar você.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full md:w-auto mt-4 md:mt-0">
                {globalConfigs?.telefoneSuporte ? (
                  <button
                    onClick={() => {
                      const msg =
                        globalConfigs?.fraseSuporte ||
                        "Olá! Gostaria de acionar o Suporte Técnico da plataforma.";
                      window.open(
                        `https://wa.me/${globalConfigs.telefoneSuporte.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`,
                        "_blank",
                      );
                    }}
                    className="w-full md:w-auto px-4 md:px-6 py-2.5 md:py-3 bg-[#34A853] hover:bg-[#2e9449] text-white rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Phone className="w-4 h-4 shrink-0" /> Falar com Suporte
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full md:w-auto px-4 md:px-6 py-2.5 md:py-3 bg-white/10 text-white/50 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider cursor-not-allowed"
                  >
                    WhatsApp Indisponível
                  </button>
                )}
                {globalConfigs?.emailSuporte && (
                  <a
                    href={`mailto:${globalConfigs.emailSuporte}`}
                    className="w-full md:w-auto px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 text-center"
                  >
                    <Mail className="w-4 h-4 shrink-0" />{" "}
                    {globalConfigs.emailSuporte}
                  </a>
                )}
                <button
                  onClick={() => setShowComplianceModal(true)}
                  className="w-full md:w-auto px-3 py-2.5 bg-white text-forest hover:bg-sun-dark rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 text-center shadow-sm"
                >
                  <ShieldAlert className="w-4 h-4 shrink-0" /> Ouvidoria
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : currentRole === "profissional" && activeTab === "perfil" ? (
        <div className="flex-1 overflow-auto p-6 md:p-8 flex flex-col gap-8 slide-up font-sans">
          <div className="max-w-4xl w-full mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 bg-white px-8 py-6 rounded-[2rem] shadow-sm border border-soft">
              <div className="flex items-center gap-4">
                <User className="w-8 h-8 text-forest/70 shrink-0" />
                <h2 className="font-serif text-2xl sm:text-3xl text-forest font-medium">
                  Ficha Cadastral de Profissional & Perfil de Apresentação
                </h2>
              </div>
              <a
                href={`?prof=${profile.uid || profile.id || ""}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-sun-dark text-forest rounded-2xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-all hover:bg-forest hover:text-white shadow-xs hover:shadow active:scale-95 shrink-0"
              >
                <Eye className="w-4.5 h-4.5" />
                Ver minha página pessoal
              </a>
            </div>

            <div className="bg-white p-8 sm:p-10 rounded-[2rem] shadow-sm border border-soft flex flex-col gap-10">
              {/* Profile Photo upload component */}
              <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-soft">
                <div className="w-28 h-28 rounded-full overflow-hidden bg-forest/10 border-4 border-sun flex-shrink-0 flex items-center justify-center relative">
                  {profile.photoUrl ? (
                    <img
                      src={profile.photoUrl}
                      alt={profile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-14 h-14 text-forest/70" />
                  )}
                </div>
                <div className="flex flex-col gap-2 items-center sm:items-start">
                  <h4 className="font-serif text-xl font-medium text-forest">
                    Foto de Perfil & Divulgação
                  </h4>
                  <p className="text-xs text-forest/60 max-w-sm text-center sm:text-left">
                    Escolha uma foto quadrada, profissional e bem iluminada para
                    que os pacientes o visualizem.
                  </p>

                  <label className="mt-1 px-4 py-2 bg-warm hover:bg-soft text-forest text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-colors border border-soft">
                    Fazer Upload de Foto
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 800000) {
                            alert(
                              "A imagem é muito grande. Escolha uma imagem de até 800KB.",
                            );
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setProfile((prev: any) => ({
                              ...prev,
                              photoUrl: reader.result as string,
                            }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* SECTION 1: Dados Pessoais e de Contato */}
              <div className="space-y-6">
                <h3 className="font-serif text-xl text-forest pb-2 border-b border-soft flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-forest/10 text-forest text-xs flex items-center justify-center font-bold">
                    1
                  </span>
                  Dados Básicos e Contatos Comerciais
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs uppercase font-bold tracking-wider text-forest/60">
                      Nome Completo
                    </label>
                    <DebouncedInput
                      type="text"
                      value={profile.name || ""}
                      onChange={(val) => setProfile({ ...profile, name: val })}
                      className="w-full mt-2 px-4 py-3 bg-warm/50 border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors text-sm text-forest"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold tracking-wider text-forest/60">
                      E-mail (Login)
                    </label>
                    <input
                      type="email"
                      value={profile.email || ""}
                      disabled
                      className="w-full mt-2 px-4 py-3 bg-warm/80 border border-soft rounded-xl text-forest/40 cursor-not-allowed text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold tracking-wider text-forest/60">
                      Telefone / WhatsApp Comercial
                    </label>
                    <DebouncedInput
                      type="tel"
                      value={profile.telefone || ""}
                      placeholder="Ex: 11999999999"
                      onChange={(val) =>
                        setProfile({ ...profile, telefone: val })
                      }
                      className="w-full mt-2 px-4 py-3 bg-warm/50 border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors text-sm text-forest"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold tracking-wider text-forest/60">
                      CPF
                    </label>
                    <DebouncedInput
                      type="text"
                      value={profile.cpf || ""}
                      placeholder="Ex: 000.000.000-00"
                      onChange={(val) => setProfile({ ...profile, cpf: val })}
                      className="w-full mt-2 px-4 py-3 bg-warm/50 border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors text-sm text-forest"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold tracking-wider text-forest/60">
                      Chave PIX (Para Recebimento de Serviços)
                    </label>
                    <DebouncedInput
                      type="text"
                      value={profile.pixKey || ""}
                      placeholder="Ex: CPF, Email, Celular ou Aleatória"
                      onChange={(val) =>
                        setProfile({ ...profile, pixKey: val })
                      }
                      className="w-full mt-2 px-4 py-3 bg-warm/50 border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors text-sm text-forest"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold tracking-wider text-forest/60">
                      CRP (Registro Profissional)
                    </label>
                    <DebouncedInput
                      type="text"
                      value={profile.crp || ""}
                      placeholder="Ex: 06/123456"
                      onChange={(val) => setProfile({ ...profile, crp: val })}
                      className="w-full mt-2 px-4 py-3 bg-warm/50 border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors text-sm text-forest"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold tracking-wider text-forest/60">
                      Gênero
                    </label>
                    <select
                      value={profile.genero || ""}
                      onChange={(e) => setProfile({ ...profile, genero: e.target.value })}
                      className="w-full mt-2 px-4 py-3 bg-warm/50 border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors text-sm text-forest"
                    >
                      <option value="">Selecione...</option>
                      <option value="Feminino">Feminino</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Não-binário">Não-binário</option>
                      <option value="Prefiro não informar">Prefiro não informar</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold tracking-wider text-forest/60">
                      Deficiência ou Necessidade Especial
                    </label>
                    <select
                      value={profile.deficiencia || ""}
                      onChange={(e) => setProfile({ ...profile, deficiencia: e.target.value })}
                      className="w-full mt-2 px-4 py-3 bg-warm/50 border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors text-sm text-forest"
                    >
                      <option value="">Selecione...</option>
                      <option value="Não possuo">Não possuo</option>
                      <option value="Deficiência física">Deficiência física (motora)</option>
                      <option value="Deficiência visual">Deficiência visual</option>
                      <option value="Deficiência auditiva">Deficiência auditiva</option>
                      <option value="Deficiência intelectual/cognitiva">Deficiência intelectual/cognitiva</option>
                      <option value="Transtorno do Espectro Autista (TEA)">Transtorno do Espectro Autista (TEA)</option>
                      <option value="Múltiplas deficiências">Múltiplas deficiências</option>
                      <option value="Outra necessidade especial">Outra necessidade especial</option>
                      <option value="Prefiro não responder">Prefiro não responder</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Formação e Especialidades */}
              <div className="space-y-6 pt-4">
                <h3 className="font-serif text-xl text-forest pb-2 border-b border-soft flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-forest/10 text-forest text-xs flex items-center justify-center font-bold">
                    2
                  </span>
                  Formação Acadêmica & Prática Clínica
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs uppercase font-bold tracking-wider text-forest/60">
                      Ano de Formação / Graduação
                    </label>
                    <DebouncedInput
                      type="number"
                      value={profile.anoFormacao || ""}
                      placeholder="Ex: 2018"
                      onChange={(val) =>
                        setProfile({ ...profile, anoFormacao: val })
                      }
                      className="w-full mt-2 px-4 py-3 bg-warm/50 border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors text-sm text-forest"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold tracking-wider text-forest/60">
                      Abordagens Psicológicas principais
                    </label>
                    <DebouncedInput
                      type="text"
                      value={profile.abordagem || ""}
                      placeholder="Ex: TCC, Psicanálise, Gestalt-terapia, Humanista..."
                      onChange={(val) =>
                        setProfile({ ...profile, abordagem: val })
                      }
                      className="w-full mt-2 px-4 py-3 bg-warm/50 border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors text-sm text-forest"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold tracking-wider text-forest/60">
                      Especialidades / Pós-graduações
                    </label>
                    <DebouncedInput
                      type="text"
                      value={profile.especialidade || ""}
                      placeholder="Ex: Terapia de Casal, Neuropsicologia, etc"
                      onChange={(val) =>
                        setProfile({ ...profile, especialidade: val })
                      }
                      className="w-full mt-2 px-4 py-3 bg-warm/50 border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors text-sm text-forest"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold tracking-wider text-forest/60">
                      Horas Mensais Disponíveis para o Projeto
                    </label>
                    <select
                      value={profile.horasDisponiveis || "1 a 3 horas/mês"}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          horasDisponiveis: e.target.value,
                        })
                      }
                      className="w-full mt-2 px-4 py-3 bg-warm/50 border border-soft rounded-xl focus:outline-none focus:border-sun-dark cursor-pointer text-sm text-forest"
                    >
                      <option value="1 a 3 horas/mês">1 a 3 horas/mês</option>
                      <option value="4 a 8 horas/mês">4 a 8 horas/mês</option>
                      <option value="9 a 15 horas/mês">9 a 15 horas/mês</option>
                      <option value="16 a 20 horas/mês">
                        16 a 20 horas/mês
                      </option>
                      <option value="Mais de 20 horas/mês">
                        Mais de 20 horas/mês
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold tracking-wider text-forest/60">
                      Cidade de Atendimento
                    </label>
                    <DebouncedInput
                      type="text"
                      value={profile.cidade || ""}
                      placeholder="Ex: São Paulo"
                      onChange={(val) =>
                        setProfile({ ...profile, cidade: val })
                      }
                      className="w-full mt-2 px-4 py-3 bg-warm/50 border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors text-sm text-forest"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold tracking-wider text-forest/60">
                      Estado (UF)
                    </label>
                    <DebouncedInput
                      type="text"
                      value={profile.uf || ""}
                      placeholder="Ex: SP"
                      maxLength={2}
                      onChange={(val) =>
                        setProfile({ ...profile, uf: val.toUpperCase() })
                      }
                      className="w-full mt-2 px-4 py-3 bg-warm/50 border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors text-sm text-forest"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: Público-Alvo e Preferências (Múltipla escolha) */}
              <div className="space-y-6 pt-4">
                <h3 className="font-serif text-xl text-forest pb-2 border-b border-soft flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-forest/10 text-forest text-xs flex items-center justify-center font-bold">
                    3
                  </span>
                  Público-Alvo & Especialidade em Idades/Dinâmicas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Experiência com público */}
                  <div className="flex flex-col gap-3 bg-warm/30 p-5 rounded-2xl border border-soft/60">
                    <label className="text-xs font-bold uppercase tracking-wider text-forest/80 leading-relaxed">
                      Experiência de no mínimo um ano com atendimento clínico
                      de:
                    </label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {[
                        "Adulto",
                        "Idoso",
                        "Criança",
                        "Adolescente",
                        "Casal",
                        "Família",
                        "Outros",
                      ].map((op) => {
                        const current = Array.isArray(
                          profile.publicosExperiencia,
                        )
                          ? profile.publicosExperiencia
                          : [];
                        const isChecked = current.includes(op);
                        return (
                          <label
                            key={`chk-exp-${op}`}
                            className="flex items-center gap-2 text-sm text-forest cursor-pointer select-none"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                let next: string[];
                                if (isChecked) {
                                  next = current.filter(
                                    (v: string) => v !== op,
                                  );
                                } else {
                                  next = [...current, op];
                                }
                                setProfile({
                                  ...profile,
                                  publicosExperiencia: next,
                                });
                              }}
                              className="accent-forest rounded border-soft w-4 h-4 cursor-pointer"
                            />
                            {op}
                          </label>
                        );
                      })}
                    </div>
                    {Array.isArray(profile.publicosExperiencia) &&
                      profile.publicosExperiencia.includes("Outros") && (
                        <DebouncedInput
                          type="text"
                          placeholder="Especifique outros públicos de experiência"
                          value={profile.outrosPublicosExperiencia || ""}
                          onChange={(val) =>
                            setProfile({
                              ...profile,
                              outrosPublicosExperiencia: val,
                            })
                          }
                          className="w-full mt-2 px-3 py-2 bg-white border border-soft rounded-lg text-xs focus:outline-none focus:border-sun-dark"
                        />
                      )}
                  </div>

                  {/* Preferência de atendimento */}
                  <div className="flex flex-col gap-3 bg-warm/30 p-5 rounded-2xl border border-soft/60">
                    <label className="text-xs font-bold uppercase tracking-wider text-forest/80 leading-relaxed">
                      Tem maior afinidade / gosto em atender:
                    </label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {[
                        "Adulto",
                        "Idoso",
                        "Criança",
                        "Adolescente",
                        "Casal",
                        "Família",
                        "Outros",
                      ].map((op) => {
                        const current = Array.isArray(profile.publicosGosto)
                          ? profile.publicosGosto
                          : [];
                        const isChecked = current.includes(op);
                        return (
                          <label
                            key={`chk-gosto-${op}`}
                            className="flex items-center gap-2 text-sm text-forest cursor-pointer select-none"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                let next: string[];
                                if (isChecked) {
                                  next = current.filter(
                                    (v: string) => v !== op,
                                  );
                                } else {
                                  next = [...current, op];
                                }
                                setProfile({ ...profile, publicosGosto: next });
                              }}
                              className="accent-forest rounded border-soft w-4 h-4 cursor-pointer"
                            />
                            {op}
                          </label>
                        );
                      })}
                    </div>
                    {Array.isArray(profile.publicosGosto) &&
                      profile.publicosGosto.includes("Outros") && (
                        <DebouncedInput
                          type="text"
                          placeholder="Especifique outros públicos de afinidade"
                          value={profile.outrosPublicosGosto || ""}
                          onChange={(val) =>
                            setProfile({ ...profile, outrosPublicosGosto: val })
                          }
                          className="w-full mt-2 px-3 py-2 bg-white border border-soft rounded-lg text-xs focus:outline-none focus:border-sun-dark"
                        />
                      )}
                  </div>
                </div>
              </div>

              {/* SECTION 3.5: Serviços profissionais que ofereço */}
              <div className="space-y-6 pt-4 border-t border-soft">
                <h3 className="font-serif text-xl text-forest pb-2 border-b border-soft flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-forest/10 text-forest text-xs flex items-center justify-center font-bold">
                    3.5
                  </span>
                  Serviços profissionais que ofereço
                </h3>
                
                <div className="flex flex-col gap-3 bg-warm/30 p-5 rounded-2xl border border-soft/60">
                  <label className="text-xs font-bold uppercase tracking-wider text-forest/80 leading-relaxed">
                    Selecione quais serviços você oferece e, se for o caso, marque se ele está disponível para orçamento acessível:
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                    {OPCOES_SERVICOS.map(op => {
                      const currentOferecidos = Array.isArray(profile.servicosOferecidos) ? profile.servicosOferecidos : [];
                      const currentAcessivel = Array.isArray(profile.servicosOrcamentoAcessivel) ? profile.servicosOrcamentoAcessivel : [];
                      const isOferecido = currentOferecidos.includes(op);
                      const isAcessivel = currentAcessivel.includes(op);

                      return (
                        <div key={`srv-edit-${op}`} className="p-4 bg-white rounded-xl border border-soft shadow-xs flex flex-col gap-2">
                          <label className="flex items-center gap-2.5 text-sm font-semibold text-forest cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isOferecido}
                              onChange={() => {
                                let nextOferecidos: string[];
                                if (isOferecido) {
                                  nextOferecidos = currentOferecidos.filter((v: string) => v !== op);
                                } else {
                                  nextOferecidos = [...currentOferecidos, op];
                                }
                                setProfile({ ...profile, servicosOferecidos: nextOferecidos });
                              }}
                              className="accent-forest rounded border-soft w-4.5 h-4.5 cursor-pointer"
                            />
                            {op === "Outros" ? "Outros: Especifique" : op}
                          </label>
                          {isOferecido && (
                            <div className="pl-7 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-200 border-t border-soft/40 pt-2">
                              {op === "Outros" && (
                                <DebouncedInput
                                  type="text"
                                  placeholder="Especifique outros serviços..."
                                  value={profile.outrosServicos || ""}
                                  onChange={(val) => setProfile({ ...profile, outrosServicos: val })}
                                  className="w-full px-3 py-2 bg-warm/20 border border-soft rounded-lg text-xs focus:outline-none focus:border-sun-dark text-forest"
                                />
                              )}
                              <label className="flex items-center gap-2 text-xs text-forest/70 cursor-pointer select-none font-medium">
                                <input
                                  type="checkbox"
                                  checked={isAcessivel}
                                  onChange={() => {
                                    let nextAcessivel: string[];
                                    if (isAcessivel) {
                                      nextAcessivel = currentAcessivel.filter((v: string) => v !== op);
                                    } else {
                                      nextAcessivel = [...currentAcessivel, op];
                                    }
                                    setProfile({ ...profile, servicosOrcamentoAcessivel: nextAcessivel });
                                  }}
                                  className="accent-emerald-600 rounded border-soft w-4 h-4 cursor-pointer"
                                />
                                Disponibilizar para orçamento acessível
                              </label>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* SECTION 4: Biografia e Motivação */}
              <div className="space-y-6 pt-4 border-t border-soft">
                <h3 className="font-serif text-xl text-forest pb-2 border-b border-soft flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-forest/10 text-forest text-xs flex items-center justify-center font-bold">
                    4
                  </span>
                  Apresentação, Biografia & Propósito como Associado
                </h3>

                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase font-bold tracking-wider text-forest/60">
                    Mini-currículo & Biografia clínica pública
                  </label>
                  <p className="text-[11px] text-forest/50 -mt-1 leading-relaxed">
                    Este texto será visível em sua página de apresentação
                    externa para pacientes interessados na rede.
                  </p>
                  <DebouncedTextArea
                    value={profile.biografia || ""}
                    onChange={(val) =>
                      setProfile({ ...profile, biografia: val })
                    }
                    placeholder="Escreva um breve resumo da sua jornada, abordagem técnica, nichos principais de estudo e como é o estilo da sua conduta psicoterapêutica..."
                    className="w-full mt-2 px-4 py-3 bg-warm/50 border border-soft rounded-xl focus:outline-none focus:border-sun-dark resize-none h-44 text-sm leading-relaxed text-forest"
                  />
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <label className="text-xs uppercase font-bold tracking-wider text-forest/60">
                    Porque faço parte desse projeto? (Minhas motivações
                    associadas)
                  </label>
                  <DebouncedTextArea
                    value={profile.motivacaoProjeto || ""}
                    onChange={(val) =>
                      setProfile({ ...profile, motivacaoProjeto: val })
                    }
                    placeholder="Conte o que impulsiona a sua associação ou parceria com o AcolheMente..."
                    className="w-full mt-2 px-4 py-3 bg-warm/50 border border-soft rounded-xl focus:outline-none focus:border-sun-dark resize-none h-32 text-sm leading-relaxed text-forest"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 mt-4 border-t border-soft">
                <button
                  onClick={() =>
                    handleUpdateSelfProfile({
                      name: profile.name,
                      telefone: profile.telefone,
                      crp: profile.crp,
                      cpf: profile.cpf,
                      especialidade: profile.especialidade,
                      horasDisponiveis: profile.horasDisponiveis,
                      cidade: profile.cidade,
                      uf: profile.uf,
                      biografia: profile.biografia,
                      motivacaoProjeto: profile.motivacaoProjeto,
                      photoUrl: profile.photoUrl || "",
                      pixKey: profile.pixKey,
                      // Novos campos persistidos
                      anoFormacao: profile.anoFormacao || "",
                      abordagem: profile.abordagem || "",
                      publicosExperiencia: profile.publicosExperiencia || [],
                      publicosGosto: profile.publicosGosto || [],
                      outrosPublicosExperiencia:
                        profile.outrosPublicosExperiencia || "",
                      outrosPublicosGosto: profile.outrosPublicosGosto || "",
                      servicosOferecidos: profile.servicosOferecidos || [],
                      servicosOrcamentoAcessivel: profile.servicosOrcamentoAcessivel || [],
                      outrosServicos: profile.outrosServicos || "",
                    })
                  }
                  className="px-6 py-4 bg-forest text-white rounded-2xl font-bold uppercase tracking-wider text-xs hover:bg-forest/90 transition-all shadow-sm shrink-0 hover:shadow"
                >
                  Salvar Minha Ficha Cadastral e Perfil
                </button>

                {/* Share Landingpage Preview Box */}
                {profile.uid &&
                  (() => {
                    const shareLink = `${window.location.origin}?prof=${profile.uid}`;
                    return (
                      <div className="bg-warm/60 border border-soft rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs w-full sm:max-w-md">
                        <div className="truncate text-forest/70 max-w-[200px] font-mono select-all shrink leading-tight">
                          {shareLink}
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(shareLink);
                            alert("Link de Apresentação copiado!");
                          }}
                          className="px-3 py-2 bg-sun-dark text-forest font-bold text-[10px] uppercase rounded-xl hover:bg-sun-dark/85 transition-colors shrink-0 shadow-xs"
                        >
                          Copiar Link de Apresentação
                        </button>
                      </div>
                    );
                  })()}
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === "kanban" || activeTab === "pacientesAcolhidos" ? (
        <div className="flex-1 flex flex-col h-full bg-warm overflow-hidden">
          <div className="flex justify-between items-center px-6 pt-6 pb-2 shrink-0">
            <h2 className="font-serif text-2xl text-forest flex items-center gap-2">
              {activeTab === "kanban" ? "Triagem" : "Pacientes"}
            </h2>
            <div className="bg-white border border-soft rounded-full p-1 flex">
              <button
                onClick={() => setTriagemViewMode("kanban")}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  triagemViewMode === "kanban"
                    ? "bg-sun text-forest shadow-sm"
                    : "text-forest/60 hover:text-forest"
                }`}
              >
                Kanban
              </button>
              <button
                onClick={() => setTriagemViewMode("table")}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  triagemViewMode === "table"
                    ? "bg-sun text-forest shadow-sm"
                    : "text-forest/60 hover:text-forest"
                }`}
              >
                Planilha
              </button>
            </div>
          </div>

          {triagemViewMode === "table" ? (
            <div className="flex-1 overflow-auto p-6">
              <div className="bg-white border border-soft rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-warm/50 border-b border-soft">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-forest/70">
                        Nome
                      </th>
                      <th className="px-4 py-3 font-semibold text-forest/70">
                        Contato
                      </th>
                      <th className="px-4 py-3 font-semibold text-forest/70">
                        Idade
                      </th>
                      <th className="px-4 py-3 font-semibold text-forest/70">
                        Status
                      </th>
                      <th className="px-4 py-3 font-semibold text-forest/70">
                        Data de Cadastro
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...filteredAcolhimentos]
                      .filter((a) =>
                        activeTab === "kanban"
                          ? visibleColumns.some(
                              (c) =>
                                c.id === (a.status || "Aguardando Avaliação"),
                            )
                          : !a.status || a.status !== "Aguardando Avaliação",
                      )
                      .sort((a, b) => {
                        const nomeA =
                          a.nomeDesejado || a.nomeCivil || a.nome || "";
                        const nomeB =
                          b.nomeDesejado || b.nomeCivil || b.nome || "";
                        return nomeA.localeCompare(nomeB);
                      })
                      .map((p) => {
                        const rawStatus = p.status || "Aguardando Avaliação";
                        const displayStatus = p.atribuicaoStatus
                          ? `${rawStatus} (${p.atribuicaoStatus})`
                          : rawStatus;
                        return (
                          <tr
                            key={p.id}
                            onClick={() => setSelectedCard(p)}
                            className="border-b border-soft last:border-0 hover:bg-warm/30 cursor-pointer transition-colors"
                          >
                            <td className="px-4 py-3">
                              <div className="font-semibold text-forest capitalize">
                                {(
                                  p.nomeDesejado ||
                                  p.nomeCivil ||
                                  p.nome
                                )?.toLowerCase()}
                              </div>
                              {p.nomeDesejado && (
                                <div className="text-[10px] text-forest/60 truncate max-w-[150px] capitalize">
                                  Nome Civil:{" "}
                                  {(p.nomeCivil || p.nome)?.toLowerCase()}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-forest/80">
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Mail className="w-3.5 h-3.5 text-forest/40" />
                                <span className="truncate max-w-[120px]">
                                  {p.email}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 mt-1">
                                <Phone className="w-3.5 h-3.5 text-forest/40" />
                                <span className="truncate max-w-[120px]">
                                  {p.telefone}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-forest/80">
                              {p.idadeTratamento || "-"}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  rawStatus === "Aguardando Avaliação"
                                    ? "bg-sun/30 text-sun-dark-dark"
                                    : rawStatus === "Em Triagem"
                                      ? "bg-blue-100 text-blue-800"
                                      : rawStatus === "Em Atendimento"
                                        ? "bg-green-100 text-green-800"
                                        : rawStatus === "Alta"
                                          ? "bg-forest/10 text-forest"
                                          : rawStatus === "Aprovado"
                                            ? "bg-purple-100 text-purple-800"
                                            : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {displayStatus}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-forest/60">
                              {formatDate(p.createdAt)}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
              <div className="flex h-full gap-6 shrink-0 w-max items-start">
                {visibleColumns.map((col) => {
                  const colCards = filteredAcolhimentos.filter(
                    (a) => (a.status || "Aguardando Avaliação") === col.id,
                  );
                  return (
                    <div
                      key={col.id}
                      className="w-[320px] shrink-0 h-full flex flex-col bg-white/50 border border-soft rounded-2xl overflow-hidden"
                      onDrop={(e) => handleDrop(e, col.id)}
                      onDragOver={handleDragOver}
                    >
                      {/* Column Header */}
                      <div className="p-4 bg-white border-b border-soft flex justify-between items-center shadow-sm z-10">
                        <h3 className="font-semibold text-forest text-sm">
                          {col.label}
                        </h3>
                        <span className="bg-warm text-forest/70 px-2 py-0.5 rounded-full text-xs font-bold border border-soft">
                          {colCards.length}
                        </span>
                      </div>

                      {/* Cards List */}
                      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                        {colCards.map((card) => (
                          <div
                            key={card.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, card.id)}
                            onClick={() => setSelectedCard(card)}
                            className="bg-white p-4 rounded-xl shadow-sm border border-soft shadow-sun-dark/5 hover:shadow-md cursor-grab active:cursor-grabbing hover:border-sun-dark/30 transition-all group"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                  card.viaAcesso === "Particular"
                                    ? "bg-sun-dark-light text-forest/70-dark"
                                    : "bg-[#E5EDF4] text-[#3B668D]"
                                }`}
                              >
                                {card.viaAcesso}
                              </span>
                              <Grip className="w-4 h-4 text-forest/70/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <h4 className="font-semibold text-forest text-sm line-clamp-1 break-words pb-1">
                              {card.nomeDesejado ||
                                card.nomeCivil ||
                                card.nome ||
                                "Paciente sem nome"}
                            </h4>

                            <div className="flex flex-wrap gap-1.5 text-[9px] text-forest/70 font-semibold uppercase tracking-wider mb-2">
                              {card.idade && (
                                <span className="bg-warm px-1.5 py-0.5 rounded border border-soft flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {card.idade}
                                </span>
                              )}
                              {card.identidadeGenero && (
                                <span className="bg-warm px-1.5 py-0.5 rounded border border-soft flex items-center gap-1">
                                  <Circle className="w-3 h-3" />
                                  {card.identidadeGenero}
                                </span>
                              )}
                            </div>

                            <div className="text-[10px] text-forest/80 max-h-24 overflow-y-auto mt-2 bg-warm/30 p-2 rounded-lg border border-soft leading-tight custom-scrollbar">
                              <span className="font-bold block mb-[2px] text-forest/60">
                                Motivo/Queixa:
                              </span>
                              {card.motivo
                                ? card.motivo.split(" - ")[0]
                                : "Não informado"}
                            </div>

                            {(card.valorSessao || card.frequenciaSessoes) && (
                              <div className="mt-2 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-1.5 rounded border border-emerald-100/50 flex flex-col gap-1 w-full">
                                {card.valorSessao && (
                                  <div className="flex justify-between items-center font-bold">
                                    <span>Valor Acertado:</span>{" "}
                                    <span>R$ {card.valorSessao}</span>
                                  </div>
                                )}
                                {card.frequenciaSessoes && (
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium opacity-80">
                                      Frequência:
                                    </span>{" "}
                                    <span className="font-semibold">
                                      {card.frequenciaSessoes}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex items-center gap-1.5 mt-3 pt-2 text-[9px] uppercase tracking-wider text-forest/70 font-bold border-t border-soft/50">
                              <Clock className="w-3 h-3" />
                              <span>
                                Acolhido em:{" "}
                                {card.createdAt
                                  ? new Date(
                                      card.createdAt.toMillis
                                        ? card.createdAt.toMillis()
                                        : card.createdAt.seconds * 1000,
                                    ).toLocaleDateString("pt-BR")
                                  : "Desconhecida"}
                              </span>
                            </div>

                            {(() => {
                              const status =
                                card.status || "Aguardando Avaliação";
                              if (
                                status === "Alta" ||
                                status === "Inativo" ||
                                status === "Encaminhamento Externo" ||
                                status === "Desistência"
                              )
                                return null;

                              let step = 1;
                              if (status === "Em Atendimento") step = 3;
                              else if (
                                status === "Aprovado" ||
                                card.propostaStatus
                              )
                                step = 2;

                              return (
                                <div className="mt-3 pt-3 border-t border-soft/50 flex flex-col gap-1.5 w-full">
                                  <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-wider text-forest/50">
                                    <span
                                      className={
                                        step >= 1 ? "text-emerald-600" : ""
                                      }
                                    >
                                      Triagem
                                    </span>
                                    <span
                                      className={
                                        step >= 2 ? "text-emerald-600" : ""
                                      }
                                    >
                                      Proposta
                                    </span>
                                    <span
                                      className={
                                        step >= 3 ? "text-emerald-600" : ""
                                      }
                                    >
                                      Atendimento
                                    </span>
                                  </div>
                                  <div className="flex gap-1 h-1.5 w-full">
                                    <div
                                      className={`flex-1 rounded-full transition-colors ${step >= 1 ? "bg-emerald-400" : "bg-warm-dark/50"}`}
                                    ></div>
                                    <div
                                      className={`flex-1 rounded-full transition-colors ${step >= 2 ? "bg-emerald-400" : "bg-warm-dark/50"}`}
                                    ></div>
                                    <div
                                      className={`flex-1 rounded-full transition-colors ${step >= 3 ? "bg-emerald-400" : "bg-warm-dark/50"}`}
                                    ></div>
                                  </div>
                                </div>
                              );
                            })()}

                            {card.profissionalId &&
                              (() => {
                                const assignedProf = allUsers.find(
                                  (u) =>
                                    u.uid === card.profissionalId ||
                                    u.id === card.profissionalId,
                                );
                                const displayStatus =
                                  card.atribuicaoStatus || "Pendente";
                                return (
                                  <div className="mt-2.5 pt-2 border-t border-soft/50 flex flex-wrap justify-between items-center text-[10px] gap-1 shrink-0">
                                    <span className="text-forest/70 font-medium truncate max-w-[130px] flex items-center gap-1">
                                      👤{" "}
                                      {assignedProf
                                        ? assignedProf.name
                                        : "Indefinido"}
                                    </span>
                                    <span
                                      className={`px-1.5 py-0.5 rounded font-bold text-[9px] uppercase ${
                                        displayStatus === "Aceito"
                                          ? "bg-[#34A853]/10 text-[#34A853]"
                                          : displayStatus === "Rejeitado"
                                            ? "bg-red-500/10 text-red-500"
                                            : "bg-amber-500/10 text-amber-500"
                                      }`}
                                    >
                                      {displayStatus}
                                    </span>
                                  </div>
                                );
                              })()}
                          </div>
                        ))}

                        {colCards.length === 0 && (
                          <div className="h-24 border-2 border-dashed border-soft rounded-xl flex items-center justify-center text-forest/70/40 text-sm font-medium">
                            Solte cards aqui
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : activeTab === "doacoes" ? (
        <div className="flex-1 overflow-auto p-6 md:p-8 flex items-start flex-col lg:flex-row gap-8 slide-up">
          <div className="w-full lg:w-1/2 flex flex-col gap-4">
            <h2 className="font-serif text-2xl text-forest bg-white px-6 py-4 rounded-2xl shadow-sm border border-soft flex items-center gap-3">
              <HandHeart className="w-6 h-6 text-forest/70" />
              Doações Recebidas
            </h2>
            <div className="flex flex-col gap-3">
              {filteredDoacoes.length === 0 ? (
                <div className="text-center p-8 bg-white/50 border border-dashed border-soft rounded-2xl text-forest/70/70 text-sm">
                  Nenhuma doação registrada até o momento.
                </div>
              ) : (
                filteredDoacoes.map((d) => (
                  <div
                    key={d.id}
                    className="bg-white p-5 rounded-2xl shadow-sm border border-soft flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-sun-dark/10 text-forest/70 rounded-full flex items-center justify-center">
                        <HandHeart className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-forest truncate max-w-[150px]">
                          {d.nome}
                        </h4>
                        <div className="text-xs text-forest/70/70 flex gap-2 items-center mt-1">
                          <span>
                            {d.createdAt
                              ? new Date(
                                  d.createdAt.toMillis(),
                                ).toLocaleDateString()
                              : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block font-bold text-forest">
                        R$ {d.valor.toFixed(2)}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-[#34A853] bg-[#34A853]/10 px-2 py-0.5 rounded-md inline-block mt-0.5">
                        PIX {d.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="w-full lg:w-1/2 flex flex-col gap-4">
            <h2 className="font-serif text-2xl text-forest bg-white px-6 py-4 rounded-2xl shadow-sm border border-soft flex items-center gap-3">
              <HeartHandshake className="w-6 h-6 text-forest/70" />
              Aguardando Sessão
            </h2>
            <div className="flex flex-col gap-3">
              {filteredSolicitacoes.length === 0 ? (
                <div className="text-center p-8 bg-white/50 border border-dashed border-soft rounded-2xl text-forest/70/70 text-sm">
                  Nenhuma solicitação na fila.
                </div>
              ) : (
                filteredSolicitacoes.map((s) => (
                  <div
                    key={s.id}
                    className="bg-white p-5 rounded-2xl shadow-sm border border-soft flex flex-col gap-3"
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold text-sm text-forest">
                        {s.nome}
                      </h4>
                      <div className="text-[10px] text-forest/70/70 font-medium">
                        {s.createdAt
                          ? new Date(
                              s.createdAt.toMillis(),
                            ).toLocaleDateString()
                          : ""}
                      </div>
                    </div>
                    <div className="text-xs text-forest/70/80 bg-warm p-3 rounded-lg border border-soft leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar">
                      "{s.motivo}"
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs font-semibold text-forest">
                        📞 {s.telefone}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-forest/70 bg-sun-dark/10 px-2 py-0.5 rounded-md">
                        {s.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : activeTab === "profissionais" ? (
        <div className="flex-1 overflow-auto p-6 md:p-8 flex items-start flex-col gap-8 slide-up">
          <div className="w-full flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white px-6 py-4 rounded-2xl shadow-sm border border-soft">
              <h2 className="font-serif text-2xl text-forest flex items-center gap-3">
                <User className="w-6 h-6 text-forest/70" />
                Novos Cadastros (Leads)
              </h2>
              <button
                onClick={() => {
                  setShowImportModal(true);
                  setImportFile(null);
                  setImportResults(null);
                  setImportFeedback(null);
                  setImportProgress(0);
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/60 text-sm font-semibold rounded-full transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Upload className="w-4 h-4" /> Importar de Arquivo (CSV/JSON)
              </button>
            </div>

            {/* Listagem de Cadastros (Planilha de Inscrições) */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-soft flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col gap-1">
                  <h3 className="font-serif text-xl text-forest flex items-center gap-2">
                    <Table className="w-5 h-5 text-forest/70" />
                    Listagem de Cadastros (Planilha de Inscrições)
                  </h3>
                  <p className="text-xs text-forest/50">
                    Reúne todos os formulários preenchidos em ordem cronológica de envio. Use para consultas e correções rápidas.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setShowSpreadsheet(!showSpreadsheet)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-warm text-forest hover:bg-soft/55 border border-soft text-xs font-bold rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {showSpreadsheet ? "Ocultar Planilha" : "Mostrar Planilha"}
                  </button>
                  <button
                    onClick={recoverSpecificEmails}
                    className="flex-1 sm:flex-none px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60 text-xs font-bold rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Recuperar E-mails Solicitados
                  </button>
                  <button
                    onClick={exportSpreadsheetToCSV}
                    className="flex-1 sm:flex-none px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60 text-xs font-bold rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Exportar Planilha (.CSV)
                  </button>
                </div>
              </div>

              {showSpreadsheet && (
                <div className="space-y-4 pt-2">
                  {/* Filtros e Controles */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-warm/30 p-3 rounded-2xl border border-soft/50 text-xs">
                    <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                      <div className="flex items-center gap-2">
                        <span className="text-forest/60 font-semibold">Status:</span>
                        <select
                          value={spreadsheetStatusFilter}
                          onChange={(e) => setSpreadsheetStatusFilter(e.target.value)}
                          className="bg-white border border-soft rounded-lg px-2.5 py-1 text-forest focus:outline-none focus:border-forest/40 text-xs font-medium cursor-pointer"
                        >
                          <option value="all">Todos os Status</option>
                          <option value="Aguardando Entrevista">Aguardando Entrevista</option>
                          <option value="Aguardando Avaliação">Aguardando Avaliação</option>
                          <option value="Aprovado">Aprovado</option>
                          <option value="Stand-by">Stand-by</option>
                          <option value="Aguardando Contrato">Aguardando Contrato</option>
                          <option value="Aguardando Acesso">Aguardando Acesso</option>
                          <option value="Rejeitado">Rejeitado</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-forest/60 font-semibold">Ordem:</span>
                        <button
                          onClick={() => setSpreadsheetSortAsc(!spreadsheetSortAsc)}
                          className="px-3 py-1 bg-white hover:bg-warm border border-soft rounded-lg text-forest font-medium transition-colors text-xs cursor-pointer"
                        >
                          {spreadsheetSortAsc ? "Antigos primeiro (Cronológica)" : "Novos primeiro (Recente)"}
                        </button>
                      </div>
                    </div>
                    <div className="text-forest/50 font-medium text-[11px] shrink-0">
                      Mostrando {
                        profissionaisLeads
                          .filter((l) => spreadsheetStatusFilter === "all" || l.status === spreadsheetStatusFilter)
                          .filter((l) => !searchQuery || (l.nome || "").toLowerCase().includes(searchQuery.toLowerCase()) || (l.email || "").toLowerCase().includes(searchQuery.toLowerCase()) || (l.telefone || "").toLowerCase().includes(searchQuery.toLowerCase()) || (l.especialidade || "").toLowerCase().includes(searchQuery.toLowerCase()))
                          .length
                      } cadastros
                    </div>
                  </div>

                  {/* Tabela Planilha */}
                  <div className="border border-soft rounded-2xl overflow-hidden bg-white shadow-xs max-h-[480px] overflow-y-auto custom-scrollbar overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse min-w-[2000px]">
                      <thead className="bg-warm/60 border-b border-soft/80 text-forest font-semibold sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 border-r border-soft/30 w-16 text-center bg-warm/80"># Ordem</th>
                          <th className="px-4 py-3 border-r border-soft/30 w-36">Data de Envio</th>
                          <th className="px-4 py-3 border-r border-soft/30 w-36">Status</th>
                          <th className="px-4 py-3 border-r border-soft/30 w-52">Nome Completo</th>
                          <th className="px-4 py-3 border-r border-soft/30 w-52">E-mail</th>
                          <th className="px-4 py-3 border-r border-soft/30 w-36">Telefone</th>
                          <th className="px-4 py-3 border-r border-soft/30 w-36">CPF</th>
                          <th className="px-4 py-3 border-r border-soft/30 w-36">Gênero</th>
                          <th className="px-4 py-3 border-r border-soft/30 w-48">Deficiência / Nec. Especial</th>
                          <th className="px-4 py-3 border-r border-soft/30 w-28 font-mono">CRP</th>
                          <th className="px-4 py-3 border-r border-soft/30 w-36">Cidade/UF</th>
                          <th className="px-4 py-3 border-r border-soft/30 w-52">Especialidade</th>
                          <th className="px-4 py-3 border-r border-soft/30 w-52">Abordagem</th>
                          <th className="px-4 py-3 border-r border-soft/30 w-28 text-center">Formação</th>
                          <th className="px-4 py-3 border-r border-soft/30 w-36">Horas Disponíveis</th>
                          <th className="px-4 py-3 border-r border-soft/30 w-64">Públicos Experiência</th>
                          <th className="px-4 py-3 border-r border-soft/30 w-64">Públicos Gosto</th>
                          <th className="px-4 py-3 border-r border-soft/30 w-80">Motivação</th>
                          <th className="px-4 py-3 w-32 text-center sticky right-0 bg-warm/90 backdrop-blur-xs shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-soft/40 text-forest/90">
                        {(() => {
                          // Filter the leads list
                          let list = profissionaisLeads
                            .filter((l) => spreadsheetStatusFilter === "all" || l.status === spreadsheetStatusFilter)
                            .filter((l) => !searchQuery || (l.nome || "").toLowerCase().includes(searchQuery.toLowerCase()) || (l.email || "").toLowerCase().includes(searchQuery.toLowerCase()) || (l.telefone || "").toLowerCase().includes(searchQuery.toLowerCase()) || (l.especialidade || "").toLowerCase().includes(searchQuery.toLowerCase()));

                          // Index numbers are assigned based on chronological ascending order of the entire list
                          const indexedLeads = [...profissionaisLeads]
                            .sort((a, b) => {
                              const timeA = a.createdAt?.seconds || (a.createdAt?.toMillis ? a.createdAt.toMillis() / 1000 : 0) || (typeof a.createdAt === "string" ? new Date(a.createdAt).getTime() / 1000 : 0) || 0;
                              const timeB = b.createdAt?.seconds || (b.createdAt?.toMillis ? b.createdAt.toMillis() / 1000 : 0) || (typeof b.createdAt === "string" ? new Date(b.createdAt).getTime() / 1000 : 0) || 0;
                              return timeA - timeB;
                            });

                          const listWithOriginalOrder = list.map((lead) => {
                            const foundIndex = indexedLeads.findIndex((il) => il.id === lead.id);
                            const orderIndex = foundIndex !== -1 ? foundIndex + 1 : 1;
                            return { lead, orderIndex };
                          });

                          // Sort based on sort preference
                          listWithOriginalOrder.sort((a, b) => {
                            const timeA = a.lead.createdAt?.seconds || (a.lead.createdAt?.toMillis ? a.lead.createdAt.toMillis() / 1000 : 0) || 0;
                            const timeB = b.lead.createdAt?.seconds || (b.lead.createdAt?.toMillis ? b.lead.createdAt.toMillis() / 1000 : 0) || 0;
                            return spreadsheetSortAsc ? timeA - timeB : timeB - timeA;
                          });

                          if (listWithOriginalOrder.length === 0) {
                            return (
                              <tr>
                                <td colSpan={19} className="text-center p-8 text-forest/50 font-medium">
                                  Nenhum registro encontrado com os filtros aplicados.
                                </td>
                              </tr>
                            );
                          }

                          return listWithOriginalOrder.map(({ lead, orderIndex }) => {
                            let dateStr = "";
                            if (lead.createdAt) {
                              try {
                                const dateObj = typeof lead.createdAt.toDate === "function"
                                  ? lead.createdAt.toDate()
                                  : (lead.createdAt.seconds ? new Date(lead.createdAt.seconds * 1000) : new Date(lead.createdAt));
                                dateStr = dateObj.toLocaleDateString("pt-BR") + " " + dateObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                              } catch (e) {
                                dateStr = "";
                              }
                            }

                            return (
                              <tr key={lead.id} className="hover:bg-warm/15 transition-colors">
                                <td className="px-4 py-2 border-r border-soft/30 text-center font-bold text-forest/70 bg-warm/5">
                                  #{orderIndex}
                                </td>
                                <td className="px-4 py-2 border-r border-soft/30 text-xs font-medium text-forest/60 whitespace-nowrap">
                                  {dateStr}
                                </td>
                                <td className="px-4 py-2 border-r border-soft/30">
                                  <span className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-full ${
                                    lead.status === "Aprovado"
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : lead.status === "Rejeitado"
                                        ? "bg-red-50 text-red-600 border border-red-200"
                                        : lead.status === "Stand-by"
                                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                                          : "bg-purple-50 text-purple-700 border border-purple-200"
                                  }`}>
                                    {lead.status || "Aguardando Entrevista"}
                                  </span>
                                </td>
                                <td className="px-4 py-2 border-r border-soft/30 font-bold text-forest truncate max-w-[150px]" title={lead.nome}>
                                  {lead.nome}
                                </td>
                                <td className="px-4 py-2 border-r border-soft/30 font-mono text-xs text-forest/80 truncate max-w-[150px]" title={lead.email}>
                                  {lead.email}
                                </td>
                                <td className="px-4 py-2 border-r border-soft/30 font-semibold whitespace-nowrap text-forest/80">
                                  {lead.telefone || "-"}
                                </td>
                                <td className="px-4 py-2 border-r border-soft/30 font-mono text-xs text-forest/60 whitespace-nowrap">
                                  {lead.cpf || "-"}
                                </td>
                                <td className="px-4 py-2 border-r border-soft/30 text-xs text-forest/80 whitespace-nowrap">
                                  {lead.genero || "-"}
                                </td>
                                <td className="px-4 py-2 border-r border-soft/30 text-xs text-forest/80 truncate max-w-[150px]" title={lead.deficiencia}>
                                  {lead.deficiencia || "-"}
                                </td>
                                <td className="px-4 py-2 border-r border-soft/30 font-mono text-xs font-semibold text-forest/80 whitespace-nowrap">
                                  {lead.crp || "-"}
                                </td>
                                <td className="px-4 py-2 border-r border-soft/30 text-forest/80 truncate max-w-[120px]" title={lead.cidade}>
                                  {lead.cidade ? `${lead.cidade}/${lead.uf || ""}` : "-"}
                                </td>
                                <td className="px-4 py-2 border-r border-soft/30 text-xs truncate max-w-[140px]" title={lead.especialidade}>
                                  {lead.especialidade || "-"}
                                </td>
                                <td className="px-4 py-2 border-r border-soft/30 text-xs truncate max-w-[140px]" title={lead.abordagem}>
                                  {lead.abordagem || "-"}
                                </td>
                                <td className="px-4 py-2 border-r border-soft/30 text-center font-mono text-xs text-forest/60">
                                  {lead.anoFormacao || "-"}
                                </td>
                                <td className="px-4 py-2 border-r border-soft/30 text-xs text-forest/80 truncate max-w-[120px]" title={lead.horasDisponiveis}>
                                  {lead.horasDisponiveis || "-"}
                                </td>
                                <td className="px-4 py-2 border-r border-soft/30 text-xs truncate max-w-[180px]" title={Array.isArray(lead.publicosExperiencia) ? lead.publicosExperiencia.join(", ") : lead.publicosExperiencia}>
                                  {Array.isArray(lead.publicosExperiencia) ? lead.publicosExperiencia.join(", ") : lead.publicosExperiencia || "-"}
                                </td>
                                <td className="px-4 py-2 border-r border-soft/30 text-xs truncate max-w-[180px]" title={Array.isArray(lead.publicosGosto) ? lead.publicosGosto.join(", ") : lead.publicosGosto}>
                                  {Array.isArray(lead.publicosGosto) ? lead.publicosGosto.join(", ") : lead.publicosGosto || "-"}
                                </td>
                                <td className="px-4 py-2 border-r border-soft/30 text-xs italic text-forest/70 max-w-[200px] truncate" title={lead.motivacao}>
                                  {lead.motivacao ? `"${lead.motivacao}"` : "-"}
                                </td>
                                <td className="px-4 py-2 text-center sticky right-0 bg-white hover:bg-warm/15 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => {
                                        setSelectedProfissional(lead);
                                        setIsEditingCard(false);
                                      }}
                                      className="p-1.5 text-forest/70 hover:text-forest hover:bg-warm rounded-lg transition-colors cursor-pointer"
                                      title="Ver Ficha de Bordo"
                                    >
                                      <FileText className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedProfissional(lead);
                                        setIsEditingCard(true);
                                      }}
                                      className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                      title="Editar Informações"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {filteredLeads.length === 0 ? (
                <div className="text-center p-8 bg-white/50 border border-dashed border-soft rounded-[2rem] text-forest/70/70 text-sm">
                  Nenhum cadastro pendente.
                </div>
              ) : (
                filteredLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="bg-white p-6 rounded-[2rem] shadow-md border border-soft flex flex-col gap-5 group hover:shadow-lg transition-all duration-300 relative"
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 shrink-0 bg-forest/5 text-forest/70 rounded-full flex items-center justify-center border border-soft">
                          <User className="w-5 h-5 text-forest/60" />
                        </div>
                        <div>
                          <h4 className="font-serif text-lg font-bold text-forest leading-tight">
                            {lead.nome}
                          </h4>
                          <span className="text-xs text-forest/50 font-medium">
                            Cadastro de Profissional
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[9px] uppercase font-bold bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1 rounded-full">
                          Disponível: {lead.horasDisponiveis}
                        </span>
                        <span className="text-[9px] font-bold text-forest/70 uppercase tracking-wider bg-warm px-3 py-1 rounded-full border border-soft/50">
                          {lead.status || "Aguardando Entrevista"}
                        </span>
                      </div>
                    </div>

                    {/* Information organized in lines (Rows) */}
                    <div className="bg-warm/25 rounded-2xl border border-soft/50 p-4 flex flex-col gap-2.5 text-xs text-forest/85">
                      <div className="flex items-center justify-between py-1 border-b border-soft/30">
                        <span className="text-forest/50 font-medium flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-forest/40" />{" "}
                          Especialidade:
                        </span>
                        <span className="font-semibold text-forest/90">
                          {lead.especialidade || "Não informada"}
                        </span>
                      </div>

                      {lead.crp && (
                        <div className="flex items-center justify-between py-1 border-b border-soft/30">
                          <span className="text-forest/50 font-medium flex items-center gap-1.5">
                            <CheckSquare className="w-3.5 h-3.5 text-forest/40" />{" "}
                            Registro Profissional (CRP/CRM):
                          </span>
                          <span className="font-semibold text-forest/90 font-mono">
                            {lead.crp}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between py-1 border-b border-soft/30">
                        <span className="text-forest/50 font-medium flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-forest/40" />{" "}
                          E-mail:
                        </span>
                        <span className="font-semibold text-forest/90">
                          {lead.email}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-soft/30">
                        <span className="text-forest/50 font-medium flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-forest/40" />{" "}
                          Telefone:
                        </span>
                        <span className="font-semibold text-forest/90">
                          {lead.telefone}
                        </span>
                      </div>

                      {(lead.cidade || lead.uf) && (
                        <div className="flex items-center justify-between py-1">
                          <span className="text-forest/50 font-medium flex items-center gap-1.5">
                            <Map className="w-3.5 h-3.5 text-forest/40" />{" "}
                            Cidade/Estado:
                          </span>
                          <span className="font-semibold text-forest/90">
                            {lead.cidade
                              ? `${lead.cidade}/${lead.uf || ""}`
                              : lead.uf}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Motivation Block */}
                    <div className="text-xs flex flex-col gap-1.5 text-forest/80">
                      <span className="font-semibold text-forest/60 uppercase tracking-wider text-[10px]">
                        Motivação para entrar na plataforma
                      </span>
                      <p className="whitespace-pre-wrap max-h-32 overflow-y-auto bg-warm/15 p-3.5 rounded-2xl border border-soft/30 custom-scrollbar leading-relaxed">
                        "
                        {lead.motivo ||
                          lead.motivacao ||
                          "Nenhuma motivação descrita"}
                        "
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full mt-2 mb-2">
                      <div className="flex w-full items-center justify-between gap-1 mb-1 relative">
                        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-soft -z-10 -translate-y-1/2"></div>
                        <div
                          className="absolute top-1/2 left-0 h-[2px] bg-[#34A853] -z-10 -translate-y-1/2 transition-all duration-500"
                          style={{
                            width:
                              lead.status === "Rejeitado"
                                ? "0%"
                                : !lead.status ||
                                    lead.status === "Aguardando Entrevista" ||
                                    lead.status === "Aguardando Avaliação"
                                  ? "0%"
                                  : lead.status === "Aprovado" ||
                                      lead.status === "Stand-by"
                                    ? "33%"
                                    : lead.status === "Aguardando Contrato"
                                      ? "66%"
                                      : lead.status === "Aguardando Acesso"
                                        ? "100%"
                                        : "0%",
                          }}
                        ></div>

                        {[
                          {
                            label: "Cadastro",
                            active: lead.status !== "Rejeitado",
                          },
                          {
                            label: "Entrevista",
                            active:
                              lead.status !== "Rejeitado" &&
                              lead.status !== "Aguardando Entrevista" &&
                              lead.status !== "Aguardando Avaliação" &&
                              lead.status !== undefined &&
                              lead.status !== "",
                          },
                          {
                            label: "Contrato",
                            active:
                              lead.status === "Aguardando Contrato" ||
                              lead.status === "Aguardando Acesso",
                          },
                          {
                            label: "Acesso",
                            active: lead.status === "Aguardando Acesso",
                          },
                        ].map((step, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col items-center gap-1 bg-white px-2"
                          >
                            <div
                              className={`w-3 h-3 rounded-full border-2 transition-colors duration-500 ${step.active ? "bg-[#34A853] border-[#34A853]" : lead.status === "Rejeitado" ? "bg-red-200 border-red-300" : "bg-white border-soft"}`}
                            />
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${step.active ? "text-[#34A853]" : lead.status === "Rejeitado" ? "text-red-400" : "text-forest/40"}`}
                            >
                              {step.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between w-full pt-4 border-t border-soft mt-2 gap-4">
                      <button
                        onClick={() => setSelectedProfissional(lead)}
                        className="w-full sm:w-auto text-xs font-semibold px-4 py-2 bg-sun text-forest rounded-xl hover:bg-sun-dark transition-colors flex items-center justify-center gap-2"
                      >
                        <FileText className="w-4 h-4" /> Ficha de Bordo
                      </button>

                      <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
                        {(lead.status === "Aguardando Entrevista" ||
                          lead.status === "Aguardando Avaliação" ||
                          !lead.status) && (
                          <>
                            <button
                              onClick={() =>
                                handleUpdateLeadStatus(lead.id, "Aprovado")
                              }
                              className="flex-1 sm:flex-none text-xs font-semibold px-4 py-2 bg-[#34A853]/10 text-[#34A853] rounded-xl transition-colors border border-[#34A853]/20 hover:bg-[#34A853] hover:text-white"
                            >
                              Aprovar p/ Contrato
                            </button>
                            <button
                              onClick={() =>
                                handleUpdateLeadStatus(lead.id, "Stand-by")
                              }
                              className="flex-1 sm:flex-none text-xs font-semibold px-4 py-2 bg-amber-500/10 text-amber-600 rounded-xl transition-colors border border-amber-500/20 hover:bg-amber-500 hover:text-white"
                            >
                              Stand-by
                            </button>
                            <button
                              onClick={() =>
                                handleUpdateLeadStatus(lead.id, "Rejeitado")
                              }
                              className="flex-1 sm:flex-none text-xs font-semibold px-4 py-2 bg-red-500/10 text-red-500 rounded-xl transition-colors border border-red-500/20 hover:bg-red-500 hover:text-white"
                            >
                              Rejeitar
                            </button>
                          </>
                        )}

                        {(lead.status === "Aprovado" ||
                          lead.status === "Stand-by") && (
                          <button
                            onClick={() =>
                              handleUpdateLeadStatus(
                                lead.id,
                                "Aguardando Contrato",
                              )
                            }
                            className="w-full sm:w-auto text-xs font-semibold px-4 py-2 bg-sun-dark text-forest rounded-xl hover:bg-sun-dark-dark transition-colors border border-sun-dark-dark/20 text-center"
                          >
                            Solicitado Assinatura de Contrato
                          </button>
                        )}

                        {lead.status === "Aguardando Contrato" && (
                          <button
                            onClick={() =>
                              handleUpdateLeadStatus(
                                lead.id,
                                "Aguardando Acesso",
                              )
                            }
                            className="w-full sm:w-auto text-xs font-semibold px-4 py-2 bg-[#34A853]/10 text-[#34A853] rounded-xl transition-colors border border-[#34A853]/20 hover:bg-[#34A853] hover:text-white"
                          >
                            Marcar como Assinado
                          </button>
                        )}

                        {lead.status === "Aguardando Acesso" && (
                          <button
                            onClick={() => {
                              setNewProfName(lead.nome);
                              setNewProfEmail(lead.email);
                              setNewProfPassword(
                                Math.random().toString(36).slice(-8),
                              );
                              setLeadIdToConvert(lead.id);
                              setShowNewProfissionalModal(true);
                            }}
                            className="w-full sm:w-auto text-xs font-bold px-4 py-2 bg-forest text-white rounded-xl flex items-center justify-center gap-2 transition-colors hover:bg-forest/90"
                          >
                            <User className="w-4 h-4" /> Criar Acesso na
                            Plataforma
                          </button>
                        )}

                        {profile?.role === "master" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProfissional(lead.id, "leads");
                            }}
                            className="text-xs font-semibold p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-1 sm:ml-2"
                            title="Excluir Permanentemente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="w-full flex flex-col gap-4 mt-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white px-6 py-4 rounded-2xl shadow-sm border border-soft">
              <h2 className="font-serif text-2xl text-forest flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-forest/70" />
                Profissionais Ativos na Plataforma
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleReconcileExistingProfs}
                  disabled={isReconciling}
                  className="px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-50 text-sm font-semibold rounded-full transition-colors flex items-center gap-2 border border-purple-200/50"
                  title="Sincronizar dados preenchidos no formulário de inscrição para o perfil ativo dos profissionais"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${isReconciling ? "animate-spin" : ""}`}
                  />
                  {isReconciling ? "Sincronizando..." : "Sincronizar Leads"}
                </button>
                <button
                  onClick={() => setShowNewProfissionalModal(true)}
                  className="px-4 py-2 bg-sun-dark text-forest text-sm font-semibold rounded-full hover:bg-sun-dark-dark transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Nova Conta de Profissional
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAtivos.length === 0 ? (
                <div className="col-span-full text-center p-8 bg-white/50 border border-dashed border-soft rounded-[2rem] text-forest/70/70 text-sm">
                  Nenhum profissional com conta criada no Firebase Auth. Crie a
                  conta deles pelo botão acima.
                </div>
              ) : (
                filteredAtivos.map((p) => {
                  const stats = getProfStats(p.uid!);
                  return (
                    <div
                      key={p.uid}
                      className="bg-white p-6 rounded-[2rem] shadow-md border border-soft hover:shadow-lg transition-all duration-300 flex flex-col gap-5 relative justify-between"
                    >
                      {/* Header Row */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-bold text-forest/70 bg-warm px-2.5 py-1 rounded-full uppercase tracking-wider">
                            Membro da Rede
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              p.ativo === false
                                ? "bg-red-100 text-red-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {p.ativo === false ? "Inativo" : "Ativo"}
                          </span>
                        </div>
                        <h4 className="font-serif text-lg font-bold text-forest leading-tight break-words">
                          {p.name || p.email}
                        </h4>
                        <span className="text-xs text-forest/50 font-medium font-mono">
                          {p.email}
                        </span>
                      </div>

                      {/* Information organized in lines (Rows) */}
                      <div className="bg-warm/25 rounded-2xl border border-soft/50 p-4 flex flex-col gap-2.5 text-xs text-forest/85">
                        <div className="flex items-center justify-between py-1 border-b border-soft/30">
                          <span className="text-forest/50 font-medium flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-forest/40" />{" "}
                            Papel:
                          </span>
                          <span className="font-semibold text-forest/90 capitalize">
                            {p.role}
                          </span>
                        </div>

                        {p.role === "profissional" && (
                          <>
                            <div className="flex items-center justify-between py-1 border-b border-soft/30">
                              <span className="text-forest/50 font-medium flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-forest/40" />{" "}
                                Pacientes Ativos:
                              </span>
                              <span className="font-bold text-forest/90">
                                {stats.ativosCount}
                              </span>
                            </div>

                            <div className="flex items-center justify-between py-1 border-b border-soft/30">
                              <span className="text-forest/50 font-medium flex items-center gap-1.5">
                                <DollarSign className="w-3.5 h-3.5 text-forest/40" />{" "}
                                Total Sessões:
                              </span>
                              <span className="font-bold text-emerald-700 font-mono">
                                R${" "}
                                {stats.valorTotal.toFixed(2).replace(".", ",")}
                              </span>
                            </div>

                            <div className="flex items-center justify-between py-1 border-b border-soft/30">
                              <span className="text-forest/50 font-medium flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-forest/40" />{" "}
                                Horas Mensais (Est.):
                              </span>
                              <span
                                className={`font-bold font-mono ${stats.maxHoras > 0 && stats.horasMensais >= stats.maxHoras ? "text-red-600" : "text-forest/90"}`}
                              >
                                {stats.horasMensais}h{" "}
                                {stats.maxHoras > 0 && `/ ${stats.maxHoras}h`}
                              </span>
                            </div>

                            {stats.maxHoras > 0 &&
                              stats.horasMensais >= stats.maxHoras && (
                                <div className="mt-1 flex items-start gap-1.5 bg-red-50 text-red-700 p-2 rounded-lg border border-red-100">
                                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                                  <span className="text-[10px] leading-tight font-medium">
                                    Limite de horas atingido ou excedido.
                                  </span>
                                </div>
                              )}
                          </>
                        )}
                      </div>

                      {p.role === "profissional" && p.servicosOferecidos && p.servicosOferecidos.length > 0 && (
                        <div className="flex flex-col gap-1.5 px-1">
                          <span className="text-[10px] font-bold text-forest/50 uppercase tracking-wider">
                            Serviços Oferecidos:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {p.servicosOferecidos.map((srv: string) => {
                              const isAcessivel = p.servicosOrcamentoAcessivel?.includes(srv);
                              return (
                                <span key={srv} className="inline-flex items-center gap-1 text-[10px] font-semibold text-forest bg-warm px-2 py-0.5 rounded-md border border-soft/80" title={isAcessivel ? "Disponível para orçamento acessível" : ""}>
                                  {srv === "Outros" ? `Outros: ${p.outrosServicos || "Especifique"}` : srv}
                                  {isAcessivel && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Orçamento Acessível" />
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-soft/60">
                        <button
                          onClick={() => setSelectedProfissional(p)}
                          className="flex-1 py-2 bg-sun hover:bg-sun-dark text-forest font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <FileText className="w-4 h-4" /> Ficha de Bordo
                        </button>
                        {profile?.role === "master" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProfissional(p.uid!, "ativos");
                            }}
                            className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 border border-red-200/40 transition-colors flex items-center justify-center"
                            title="Excluir Permanentemente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : activeTab === "empresas" ? (
        <div className="flex-1 overflow-auto p-6 md:p-8 flex items-start flex-col gap-8 slide-up">
          <div className="w-full flex flex-col gap-4">
            <h2 className="font-serif text-2xl text-forest bg-white px-6 py-4 rounded-2xl shadow-sm border border-soft flex items-center gap-3">
              <Briefcase className="w-6 h-6 text-forest/70" />
              Gestão Comercial de Empresas
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {empresasLeads.length === 0 ? (
                <div className="col-span-full text-center p-8 bg-white/50 border border-dashed border-soft rounded-2xl text-forest/70/70 text-sm">
                  Nenhum contato de empresa registrado até o momento.
                </div>
              ) : (
                empresasLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-soft flex flex-col gap-4 group hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-1">
                        <h4 className="font-semibold text-lg text-forest">
                          {lead.nomeEmpresa}
                        </h4>
                        <span className="text-xs font-semibold uppercase tracking-wider text-forest/60">
                          CNPJ: {lead.cnpj}
                        </span>
                      </div>
                      <div className="text-[10px] text-forest/70/80 font-bold bg-warm px-2 py-1 rounded-md whitespace-nowrap">
                        {lead.createdAt
                          ? new Date(
                              lead.createdAt.toMillis(),
                            ).toLocaleDateString()
                          : ""}
                      </div>
                    </div>

                    <div className="text-sm text-forest/80 flex flex-col gap-3 mt-2 bg-warm/50 p-4 rounded-xl border border-soft">
                      <span className="flex items-center gap-3 font-medium">
                        <Map className="w-4 h-4 text-forest/60" /> {lead.local}
                      </span>
                      <span className="flex items-center gap-3 font-medium">
                        <Briefcase className="w-4 h-4 text-forest/60" /> Ramo:{" "}
                        {lead.ramoAtividade}
                      </span>
                      <span className="flex items-center gap-3 font-medium">
                        <Users className="w-4 h-4 text-forest/60" /> Colabs:{" "}
                        {lead.colaboradores}
                      </span>
                      <div className="h-px w-full bg-soft/50 my-1"></div>
                      <span className="flex items-center gap-3 font-medium text-forest">
                        <User className="w-4 h-4 text-forest/60" />{" "}
                        {lead.contatoNome || "Contato N/I"} (
                        {lead.contatoDepartamento || "-"})
                      </span>
                    </div>

                    <div className="text-sm flex flex-col gap-2 mt-2 border-b border-soft pb-4">
                      <a
                        href={`mailto:${lead.email}`}
                        className="flex items-center gap-2 font-semibold text-forest hover:text-sun-dark transition-colors"
                      >
                        <Mail className="w-4 h-4" /> {lead.email}
                      </a>
                      <a
                        href={`https://wa.me/${lead.telefone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 font-semibold text-forest hover:text-sun-dark transition-colors"
                      >
                        <Phone className="w-4 h-4" /> {lead.telefone}
                      </a>
                    </div>

                    <button
                      onClick={() => setSelectedEmpresa(lead)}
                      className="mt-2 w-full py-2 bg-sun text-forest font-medium rounded-xl hover:bg-sun-dark transition-colors flex items-center justify-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Ficha de Bordo
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : activeTab === "compliance" ? (
        <div className="flex-1 overflow-auto p-6 md:p-8 flex items-start flex-col gap-8 slide-up">
          <div className="w-full flex items-center justify-between bg-white px-6 py-4 rounded-2xl shadow-sm border border-soft">
            <h2 className="font-serif text-2xl text-forest flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-forest/70" />
              Ouvidoria e Compliance
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {complianceMessages.length === 0 ? (
              <div className="col-span-full p-12 text-center text-forest/70 bg-white/50 border border-dashed border-soft rounded-[2xl]">
                Nenhuma mensagem de compliance/ouvidoria submetida até o
                momento.
              </div>
            ) : (
              complianceMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="bg-white p-6 rounded-[2rem] shadow-sm border border-soft flex flex-col gap-4 relative"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-forest/50">
                        Tipo
                      </span>
                      <h3
                        className={`font-semibold text-lg leading-tight mt-1 ${msg.tipo === "Denúncia" ? "text-red-600" : msg.tipo === "Reclamação" ? "text-orange-600" : "text-forest"}`}
                      >
                        {msg.tipo}
                      </h3>
                    </div>
                    <select
                      value={msg.status}
                      onChange={async (e) => {
                        const val = e.target.value;
                        try {
                          await updateDoc(doc(db, "compliance", msg.id), {
                            status: val,
                          });
                        } catch (err) {
                          console.error(err);
                          alert("Erro ao atualizar status.");
                        }
                      }}
                      className={`text-xs font-bold rounded-lg px-2 py-1 border-0 ring-1 ring-inset focus:ring-2 focus:ring-inset ${
                        msg.status === "Pendente"
                          ? "bg-orange-50 text-orange-700 ring-orange-200 focus:ring-orange-500"
                          : msg.status === "Em Análise"
                            ? "bg-blue-50 text-blue-700 ring-blue-200 focus:ring-blue-500"
                            : "bg-green-50 text-green-700 ring-green-200 focus:ring-green-500"
                      }`}
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Em Análise">Em Análise</option>
                      <option value="Resolvido">Resolvido</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2 text-sm text-forest/80 bg-warm/30 p-4 rounded-xl">
                    <p className="whitespace-pre-wrap">{msg.mensagem}</p>
                  </div>

                  <div className="flex flex-col gap-1 mt-auto pt-4 border-t border-soft">
                    <span className="text-xs font-bold text-forest/50 uppercase tracking-widest">
                      Remetente
                    </span>
                    <span className="font-medium text-forest text-sm">
                      {msg.userName} ({msg.userRole})
                    </span>
                    {msg.userEmail && (
                      <a
                        href={`mailto:${msg.userEmail}`}
                        className="text-sm font-semibold text-sun-dark hover:underline"
                      >
                        {msg.userEmail}
                      </a>
                    )}
                    <span className="text-xs text-forest/50 mt-1">
                      Data: {msg.createdAt ? formatDate(msg.createdAt) : "N/I"}
                    </span>
                  </div>

                  <button
                    onClick={async () => {
                      if (
                        window.confirm(
                          "Deseja mesmo excluir esta denúncia permanentemente?",
                        )
                      ) {
                        try {
                          await deleteDoc(doc(db, "compliance", msg.id));
                        } catch (err) {
                          console.error(err);
                        }
                      }
                    }}
                    className="absolute top-6 right-[90px] text-red-500 p-1 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : activeTab === "acessos" ? (
        <div className="flex-1 overflow-auto p-6 md:p-8 flex items-start flex-col gap-8 slide-up">
          <div className="w-full flex items-center justify-between bg-white px-6 py-4 rounded-2xl shadow-sm border border-soft">
            <h2 className="font-serif text-2xl text-forest flex items-center gap-3">
              <Users className="w-6 h-6 text-forest/70" />
              Níveis de Acesso
            </h2>
            <span className="text-xs font-semibold text-forest/50 bg-warm px-3 py-1 rounded-full uppercase tracking-wider">
              Gestor Master
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {allUsers
              .filter((u) => {
                const uRoles = u.roles || [u.role].filter(Boolean);
                return (
                  !searchQuery ||
                  (u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (u.role || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                  uRoles.some((r: string) =>
                    (r || "").toLowerCase().includes(searchQuery.toLowerCase()),
                  )
                );
              })
              .map((u) => (
                <div
                  key={u.uid}
                  className="bg-white p-6 rounded-[2rem] shadow-sm border border-soft flex flex-col gap-4"
                >
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-lg text-forest break-words leading-tight">
                      {u.name}
                    </h3>
                  </div>
                  {u.email && (
                    <div className="text-sm text-forest/70 truncate flex items-center gap-2">
                      <Mail className="w-4 h-4 shrink-0" />{" "}
                      <span className="truncate">{u.email}</span>
                    </div>
                  )}

                  <div className="mt-auto pt-4 border-t border-soft flex flex-col gap-2">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-forest/50">
                      Papeis / Níveis de Acesso
                    </label>
                    <div className="flex flex-col gap-2 bg-warm/50 p-3 rounded-2xl border border-soft/55">
                      {[
                        { key: "master", label: "Administrador (Master)" },
                        { key: "triagem", label: "Gestão de Triagem" },
                        {
                          key: "profissional",
                          label: "Profissional / Psicólogo",
                        },
                      ].map((item) => {
                        const uRoles: Role[] =
                          u.roles || ([u.role].filter(Boolean) as Role[]);
                        const isChecked = uRoles.includes(item.key as Role);
                        return (
                          <label
                            key={item.key}
                            className="flex items-center gap-2 px-1.5 py-0.5 cursor-pointer text-xs font-semibold text-forest hover:text-sun-dark transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                let nextRoles = [...uRoles];
                                if (isChecked) {
                                  if (nextRoles.length <= 1) {
                                    alert(
                                      "Cada usuário precisa ter pelo menos um nível de acesso.",
                                    );
                                    return;
                                  }
                                  nextRoles = nextRoles.filter(
                                    (r) => r !== item.key,
                                  );
                                } else {
                                  nextRoles.push(item.key as Role);
                                }
                                handleRolesChange(u.uid!, nextRoles);
                              }}
                              className="accent-forest rounded border-soft shrink-0 w-4 h-4 cursor-pointer"
                            />
                            <span className="select-none">{item.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            {allUsers.length === 0 && (
              <div className="col-span-full text-center p-12 bg-white/50 border border-dashed border-soft rounded-[2rem] text-forest/70/70">
                Nenhum usuário encontrado.
              </div>
            )}
          </div>
        </div>
      ) : activeTab === "eventos" || activeTab === "servicos" ? (
        <EventosServicosView activeSection={activeTab} profile={profile} />
      ) : null}

      {/* Card Details Modal */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-forest/20 backdrop-blur-sm animate-in fade-in py-4">
          <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl border border-soft overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-soft bg-warm/50 gap-2">
              <div className="flex flex-col w-full max-w-lg">
                <h3 className="font-serif text-2xl text-forest">
                  Ficha de Acolhimento
                </h3>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-[11px] uppercase tracking-wider font-semibold text-forest/50 mt-1">
                  {selectedCard.createdAt && (
                    <span>Entrada: {formatDate(selectedCard.createdAt)}</span>
                  )}
                  {selectedCard.statusUpdatedAt && (
                    <span>
                      Ativação: {formatDate(selectedCard.statusUpdatedAt)}
                    </span>
                  )}
                </div>

                {(() => {
                  const status = selectedCard.status || "Aguardando Avaliação";
                  if (
                    status === "Alta" ||
                    status === "Inativo" ||
                    status === "Encaminhamento Externo" ||
                    status === "Desistência"
                  )
                    return null;

                  let step = 1;
                  if (status === "Em Atendimento") step = 3;
                  else if (status === "Aprovado" || selectedCard.propostaStatus)
                    step = 2;

                  return (
                    <div className="w-full mt-4">
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-forest/50 mb-1.5">
                        <span className={step >= 1 ? "text-emerald-600" : ""}>
                          Triagem
                        </span>
                        <span className={step >= 2 ? "text-emerald-600" : ""}>
                          Proposta / Atribuição
                        </span>
                        <span className={step >= 3 ? "text-emerald-600" : ""}>
                          Atendimento Iniciado
                        </span>
                      </div>
                      <div className="flex gap-1.5 h-2 w-full">
                        <div
                          className={`flex-1 rounded-full transition-colors ${step >= 1 ? "bg-emerald-400" : "bg-warm-dark/50"}`}
                        ></div>
                        <div
                          className={`flex-1 rounded-full transition-colors ${step >= 2 ? "bg-emerald-400" : "bg-warm-dark/50"}`}
                        ></div>
                        <div
                          className={`flex-1 rounded-full transition-colors ${step >= 3 ? "bg-emerald-400" : "bg-warm-dark/50"}`}
                        ></div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <button
                onClick={() => setSelectedCard(null)}
                className="p-2 text-forest/70 hover:text-red-500 rounded-full hover:bg-white transition-colors self-end sm:self-auto"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center gap-4 py-3 px-6 bg-white border-b border-soft">
              <button
                onClick={() => {
                  const tpl =
                    templates.find((t) => t.id === "pagamento") || templates[0];
                  setNotificacaoType(tpl.id);
                  setNotificacaoName(tpl.name);
                  setNotificacaoMsg(
                    processNotificationTemplate(tpl.msg, selectedCard),
                  );
                  setShowNotificarModal(true);
                }}
                className="flex items-center gap-2 text-emerald-600 font-semibold text-sm hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" /> Notificar
              </button>
              <button
                onClick={() => setIsEditingCard(!isEditingCard)}
                className="flex items-center gap-2 text-amber-500 font-semibold text-sm hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Edit3 className="w-4 h-4" />{" "}
                {isEditingCard ? "Salvar Edição" : "Editar"}
              </button>
              <button
                onClick={() =>
                  handleUpdateAcolhimentoProperty(
                    selectedCard.id,
                    "ativo",
                    selectedCard.ativo === false ? true : false,
                  )
                }
                className={`flex items-center gap-2 ${selectedCard.ativo === false ? "text-slate-500 hover:bg-slate-50" : "text-red-500 hover:bg-red-50"} font-semibold text-sm px-3 py-1.5 rounded-lg transition-colors`}
              >
                <Trash2 className="w-4 h-4" />{" "}
                {selectedCard.ativo === false ? "Ativar" : "Inativar"}
              </button>

              {/* Contrato Assinado */}
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => {
                    const link = `${window.location.origin}/?contrato=${selectedCard.id}`;
                    navigator.clipboard.writeText(link);
                    alert(
                      "Link do contrato copiado para a área de transferência!",
                    );
                  }}
                  className="text-xs font-semibold text-sun-dark underline hover:text-forest transition-colors"
                >
                  Copiar Link do Contrato
                </button>
                <button
                  onClick={() => {
                    const defaultText = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS PSICOLÓGICOS\n\nCONTRATANTE: ${selectedCard.nome || "[NOME]"}, portador(a) do e-mail ${selectedCard.email || "[EMAIL]"} e CPF ${selectedCard.cpf || "[CPF_AQUI]"}.\n\nCONTRATADO: Projeto AcolheMente Saúde...\n\nCLÁUSULA 1 - O presente contrato tem por objeto a prestação de serviços psicológicos na modalidade de Terapia Individual...\n\n(Edite as cláusulas abaixo)`;
                    setContratoText(selectedCard.contratoText || defaultText);
                    setShowContratoModal(true);
                  }}
                  className="text-xs font-semibold text-sun-dark underline hover:text-forest transition-colors ml-4"
                >
                  Modelo de Contrato
                </button>
                <div className="flex items-center gap-1.5 ml-3">
                  <div
                    className={`w-2 h-2 rounded-full ${selectedCard.contratoAssinado ? "bg-green-500" : "bg-red-500"}`}
                  ></div>
                  <span
                    className={`text-xs font-bold uppercase tracking-wider ${selectedCard.contratoAssinado ? "text-green-600" : "text-red-500"}`}
                  >
                    {selectedCard.contratoAssinado
                      ? "Contrato Assinado"
                      : "Pendente"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 lg:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Column 1 */}
                <div className="space-y-6">
                  <section>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-3 flex items-center gap-2">
                      <User className="w-4 h-4" /> Informações Básicas
                    </h4>
                    <div className="space-y-3 ms-2">
                      <EditableField
                        label="Nome"
                        value={selectedCard.nome}
                        field="nome"
                        onChange={(f, v) =>
                          handleUpdateAcolhimentoProperty(selectedCard.id, f, v)
                        }
                        isEditing={isEditingCard}
                      />
                      <EditableField
                        label="Data de Nascimento"
                        value={selectedCard.dataNascimento}
                        field="dataNascimento"
                        onChange={(f, v) =>
                          handleUpdateAcolhimentoProperty(selectedCard.id, f, v)
                        }
                        isEditing={isEditingCard}
                      />
                      <EditableField
                        label="CPF"
                        value={selectedCard.cpf}
                        field="cpf"
                        onChange={(f, v) =>
                          handleUpdateAcolhimentoProperty(selectedCard.id, f, v)
                        }
                        isEditing={isEditingCard}
                      />
                      <EditableField
                        label="Estado Civil"
                        value={selectedCard.estadoCivil}
                        field="estadoCivil"
                        onChange={(f, v) =>
                          handleUpdateAcolhimentoProperty(selectedCard.id, f, v)
                        }
                        isEditing={isEditingCard}
                      />
                      <EditableField
                        label="Gênero"
                        value={selectedCard.genero}
                        field="genero"
                        onChange={(f, v) =>
                          handleUpdateAcolhimentoProperty(selectedCard.id, f, v)
                        }
                        isEditing={isEditingCard}
                      />
                      <EditableField
                        label="Deficiência / Necessidade Especial"
                        value={selectedCard.deficiencia}
                        field="deficiencia"
                        onChange={(f, v) =>
                          handleUpdateAcolhimentoProperty(selectedCard.id, f, v)
                        }
                        isEditing={isEditingCard}
                      />
                      {selectedCard.propostaStatus && (
                        <div
                          className={`mt-4 p-4 border rounded-xl ${selectedCard.propostaStatus === "Proposta aceita pelo paciente" ? "bg-green-50/50 border-green-100 text-green-800" : selectedCard.propostaStatus === "Paciente solicita revisão da proposta" ? "bg-orange-50/50 border-orange-100 text-orange-800" : "bg-blue-50/50 border-blue-100 text-blue-800"}`}
                        >
                          <span className="block text-[10px] font-bold uppercase tracking-wider opacity-70 mb-1">
                            Status da Proposta
                          </span>
                          <span className="font-semibold text-sm">
                            {selectedCard.propostaStatus}
                          </span>
                        </div>
                      )}
                      {selectedCard.dadosContrato && (
                        <div className="mt-4 p-4 bg-green-50/50 border border-green-100 rounded-xl">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-green-700 mb-2">
                            Dados do Contrato Assinado
                          </span>
                          <div className="text-sm text-forest space-y-1">
                            <p>
                              <span className="font-semibold">Signatário:</span>{" "}
                              {selectedCard.dadosContrato.nome}
                            </p>
                            <p>
                              <span className="font-semibold">E-mail:</span>{" "}
                              {selectedCard.dadosContrato.email}
                            </p>
                            <p>
                              <span className="font-semibold">CPF:</span>{" "}
                              {selectedCard.dadosContrato.cpf}
                            </p>
                            {selectedCard.dadosContrato.menorIdade && (
                              <p className="text-sun-dark-dark font-medium">
                                <span className="font-semibold text-forest">
                                  Paciente (Menor):
                                </span>{" "}
                                {selectedCard.dadosContrato.nomeMenor}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      <EditableField
                        label="E-mail"
                        value={selectedCard.email}
                        field="email"
                        onChange={(f, v) =>
                          handleUpdateAcolhimentoProperty(selectedCard.id, f, v)
                        }
                        isEditing={isEditingCard}
                      />
                      <EditableField
                        label="Telefone / WhatsApp"
                        value={selectedCard.telefone}
                        field="telefone"
                        onChange={(f, v) =>
                          handleUpdateAcolhimentoProperty(selectedCard.id, f, v)
                        }
                        isEditing={isEditingCard}
                      />
                      <EditableField
                        label="Via de Acesso / Empresa"
                        value={selectedCard.viaAcesso}
                        field="viaAcesso"
                        onChange={(f, v) =>
                          handleUpdateAcolhimentoProperty(selectedCard.id, f, v)
                        }
                        isEditing={isEditingCard}
                      />
                      <EditableField
                        label="De onde nos conheceu"
                        value={selectedCard.comoConheceu}
                        field="comoConheceu"
                        onChange={(f, v) =>
                          handleUpdateAcolhimentoProperty(selectedCard.id, f, v)
                        }
                        isEditing={isEditingCard}
                      />
                      {selectedCard.tratamentoPara === "Outra pessoa" && (
                        <>
                          <div className="mt-4 pt-4 border-t border-soft">
                            <span className="block text-xs font-bold uppercase text-forest/70 mb-2">
                              Dados do Responsável
                            </span>
                            <EditableField
                              label="Responsável"
                              value={selectedCard.responsavelNome}
                              field="responsavelNome"
                              onChange={(f, v) =>
                                handleUpdateAcolhimentoProperty(
                                  selectedCard.id,
                                  f,
                                  v,
                                )
                              }
                              isEditing={isEditingCard}
                            />
                            <EditableField
                              label="CPF do Responsável"
                              value={selectedCard.responsavelCpf}
                              field="responsavelCpf"
                              onChange={(f, v) =>
                                handleUpdateAcolhimentoProperty(
                                  selectedCard.id,
                                  f,
                                  v,
                                )
                              }
                              isEditing={isEditingCard}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </section>

                  {selectedCard.viaAcesso === "Particular" && (
                    <section>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Perfil Socioeconômico
                      </h4>
                      <div className="space-y-3 ms-2 flex flex-col gap-1">
                        <EditableField
                          label="Renda Bruta"
                          value={selectedCard.faixaSalarial}
                          field="faixaSalarial"
                          onChange={(f, v) =>
                            handleUpdateAcolhimentoProperty(
                              selectedCard.id,
                              f,
                              v,
                            )
                          }
                          isEditing={isEditingCard}
                        />
                        <EditableField
                          label="Fonte"
                          value={selectedCard.fonteRenda}
                          field="fonteRenda"
                          onChange={(f, v) =>
                            handleUpdateAcolhimentoProperty(
                              selectedCard.id,
                              f,
                              v,
                            )
                          }
                          isEditing={isEditingCard}
                        />
                        <EditableField
                          label="Residentes"
                          value={selectedCard.dependentes}
                          field="dependentes"
                          onChange={(f, v) =>
                            handleUpdateAcolhimentoProperty(
                              selectedCard.id,
                              f,
                              v,
                            )
                          }
                          isEditing={isEditingCard}
                        />
                        <EditableField
                          label="Plano de Saúde"
                          value={selectedCard.planoSaude}
                          field="planoSaude"
                          onChange={(f, v) =>
                            handleUpdateAcolhimentoProperty(
                              selectedCard.id,
                              f,
                              v,
                            )
                          }
                          isEditing={isEditingCard}
                        />
                      </div>
                    </section>
                  )}
                </div>

                {/* Column 2 */}
                <div className="space-y-6">
                  {selectedCard.viaAcesso === "Particular" && (
                    <section>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-3">
                        Habitação e Acesso
                      </h4>
                      <div className="space-y-3 ms-2">
                        <EditableField
                          label="Escolaridade"
                          value={selectedCard.escolaridade}
                          field="escolaridade"
                          onChange={(f, v) =>
                            handleUpdateAcolhimentoProperty(
                              selectedCard.id,
                              f,
                              v,
                            )
                          }
                          isEditing={isEditingCard}
                        />
                        <EditableField
                          label="Moradia"
                          value={selectedCard.moradia}
                          field="moradia"
                          onChange={(f, v) =>
                            handleUpdateAcolhimentoProperty(
                              selectedCard.id,
                              f,
                              v,
                            )
                          }
                          isEditing={isEditingCard}
                        />
                        <EditableField
                          label="Cômodos"
                          value={selectedCard.comodos}
                          field="comodos"
                          onChange={(f, v) =>
                            handleUpdateAcolhimentoProperty(
                              selectedCard.id,
                              f,
                              v,
                            )
                          }
                          isEditing={isEditingCard}
                        />
                        <EditableField
                          label="Dispositivo / Aparelho"
                          value={selectedCard.dispositivo}
                          field="dispositivo"
                          onChange={(f, v) =>
                            handleUpdateAcolhimentoProperty(
                              selectedCard.id,
                              f,
                              v,
                            )
                          }
                          isEditing={isEditingCard}
                        />
                        <EditableField
                          label="Internet"
                          value={selectedCard.internet}
                          field="internet"
                          onChange={(f, v) =>
                            handleUpdateAcolhimentoProperty(
                              selectedCard.id,
                              f,
                              v,
                            )
                          }
                          isEditing={isEditingCard}
                        />
                      </div>
                    </section>
                  )}

                  <section>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-3">
                      Histórico e Motivação
                    </h4>
                    <div className="space-y-3 ms-2">
                      <EditableField
                        label="Terapia Anterior?"
                        value={selectedCard.terapiaAnterior}
                        field="terapiaAnterior"
                        onChange={(f, v) =>
                          handleUpdateAcolhimentoProperty(selectedCard.id, f, v)
                        }
                        isEditing={isEditingCard}
                      />
                      <EditableField
                        label="Melhores Períodos (Online)"
                        value={
                          Array.isArray(selectedCard.melhoresPeriodos)
                            ? selectedCard.melhoresPeriodos.join(", ")
                            : selectedCard.melhoresPeriodos
                        }
                        field="melhoresPeriodos"
                        onChange={(f, v) =>
                          handleUpdateAcolhimentoProperty(selectedCard.id, f, v)
                        }
                        isEditing={isEditingCard}
                      />
                      <div className="bg-sun-dark-light/30 border border-sun-dark/10 p-4 rounded-xl mt-2">
                        <span className="block text-xs font-semibold uppercase text-forest/70/60 mb-2">
                          Motivo Declarado
                        </span>
                        {isEditingCard ? (
                          <DebouncedTextArea
                            value={selectedCard.motivo || ""}
                            onChange={(val) =>
                              handleUpdateAcolhimentoProperty(
                                selectedCard.id,
                                "motivo",
                                val,
                              )
                            }
                            className="w-full bg-transparent text-sm text-forest border-b border-sun-dark focus:outline-none resize-none h-16"
                          />
                        ) : (
                          <p className="text-sm text-forest leading-relaxed">
                            {selectedCard.motivo}
                          </p>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1 p-5 bg-sun/10 rounded-2xl border border-sun/30">
                      <label className="text-xs font-bold uppercase tracking-wider text-forest/70 shrink-0 mb-1">
                        Valor da Sessão (Faixas R$)
                      </label>
                      {currentRole !== "profissional" && isEditingCard ? (
                        <select
                          value={selectedCard.valorSessao || ""}
                          onChange={(e) =>
                            handleUpdateAcolhimentoProperty(
                              selectedCard.id,
                              "valorSessao",
                              e.target.value,
                            )
                          }
                          className="w-full bg-white text-base font-semibold text-forest border border-soft rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-sun-dark shadow-sm appearance-none"
                        >
                          <option value="">Selecione um valor...</option>
                          {globalConfigs.faixasValores?.map(
                            (faixa: string, idx: number) =>
                              faixa ? (
                                <option key={idx} value={faixa}>
                                  {faixa}
                                </option>
                              ) : null,
                          )}
                          <option value="Gratuito">Gratuito</option>
                          <option value="Outro">Outro (A combinar)</option>
                        </select>
                      ) : (
                        <div className="text-2xl font-semibold text-forest">
                          {selectedCard.valorSessao || "Não definido"}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1 p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-emerald-800 shrink-0">
                          Frequência de Sessões
                        </label>
                        {!isEditingCard && currentRole === "profissional" && (
                          <button
                            onClick={() => setIsEditingCard(true)}
                            className="text-[10px] uppercase font-bold text-emerald-600 hover:underline"
                          >
                            Alterar Frequência
                          </button>
                        )}
                      </div>
                      {isEditingCard ? (
                        <div className="flex flex-col gap-2">
                          <select
                            value={selectedCard.frequenciaSessoes || ""}
                            onChange={(e) =>
                              handleUpdateAcolhimentoProperty(
                                selectedCard.id,
                                "frequenciaSessoes",
                                e.target.value,
                              )
                            }
                            className="w-full bg-white text-base font-semibold text-forest border border-soft rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm appearance-none"
                          >
                            <option value="">Selecione...</option>
                            <option value="Semanal">Semanal</option>
                            <option value="Quinzenal">Quinzenal</option>
                            <option value="Mensal">Mensal</option>
                            <option value="Sob Demanda">Sob Demanda</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Motivo da alteração"
                            value={selectedCard.motivoFrequencia || ""}
                            onChange={(e) =>
                              handleUpdateAcolhimentoProperty(
                                selectedCard.id,
                                "motivoFrequencia",
                                e.target.value,
                              )
                            }
                            className="w-full bg-white text-xs text-forest border border-soft rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      ) : (
                        <div>
                          <div className="text-2xl font-semibold text-forest mb-1">
                            {selectedCard.frequenciaSessoes || "Não definida"}
                          </div>
                          {selectedCard.motivoFrequencia && (
                            <p className="text-xs text-emerald-700 italic">
                              Motivo: {selectedCard.motivoFrequencia}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </section>

                  {currentRole !== "profissional" ? (
                    <section className="mt-8 space-y-6">
                      <div className="flex flex-col gap-2 p-4 bg-warm rounded-2xl border border-soft max-h-[22rem] flex flex-col">
                        <label className="text-xs font-bold uppercase tracking-wider text-forest/70 shrink-0 mb-1">
                          Atribuir a Profissional Parceiro
                        </label>
                        <div className="flex flex-col gap-2 overflow-y-auto pr-1 no-scrollbar pb-2">
                          <div
                            onClick={() =>
                              handleUpdateAcolhimentoProperty(
                                selectedCard.id,
                                "profissionalId",
                                "",
                              )
                            }
                            className={`p-3 rounded-xl cursor-pointer transition-all border ${!selectedCard.profissionalId ? "border-sun bg-sun/30 shadow-sm" : "border-soft bg-white/60 hover:bg-white hover:border-sun/50"}`}
                          >
                            <span className="text-sm font-semibold text-forest">
                              Fila de Triagem / Fila de Espera (Desatribuído)
                            </span>
                          </div>
                          {profissionaisAtivos.map((p) => {
                            if (p.role !== "profissional") return null;
                            const stats = getProfStats(p.uid!);
                            const isSelected =
                              selectedCard.profissionalId === p.uid;
                            return (
                              <div
                                key={p.uid}
                                onClick={() =>
                                  handleUpdateAcolhimentoProperty(
                                    selectedCard.id,
                                    "profissionalId",
                                    p.uid!,
                                  )
                                }
                                className={`p-3.5 rounded-xl cursor-pointer transition-all border flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 ${isSelected ? "border-sun bg-sun/30 shadow-sm" : "border-soft bg-white/60 hover:bg-white hover:border-sun/50"}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isSelected ? "bg-white text-forest" : "bg-warm text-forest/70"}`}
                                  >
                                    {p.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold text-forest">
                                      {p.name || p.email}
                                    </span>
                                    <span className="text-[10px] uppercase font-bold text-forest/50">
                                      Parceiro Terapêutico
                                    </span>
                                  </div>
                                </div>
                                <div className="flex gap-4 xl:text-right shrink-0 bg-white px-3 py-1.5 rounded-lg border border-soft/50 shadow-sm xl:ml-auto">
                                  <div className="flex flex-col items-center xl:items-end">
                                    <span className="text-[9px] text-forest/50 font-bold uppercase tracking-wider">
                                      Ativos
                                    </span>
                                    <span className="text-sm font-bold text-forest">
                                      {stats.ativosCount}
                                    </span>
                                  </div>
                                  <div className="w-px bg-soft"></div>
                                  <div className="flex flex-col items-center xl:items-end">
                                    <span className="text-[9px] text-forest/50 font-bold uppercase tracking-wider">
                                      Total
                                    </span>
                                    <span className="text-sm font-bold text-emerald-700 leading-tight">
                                      R${" "}
                                      {stats.valorTotal
                                        .toFixed(2)
                                        .replace(".", ",")}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </section>
                  ) : (
                    <section className="mt-8 space-y-4">
                      <div className="mt-8">
                        <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-3 block">
                          Controle de Vínculo
                        </label>
                        <div className="flex flex-col gap-3 p-5 bg-warm rounded-2xl border border-soft mt-2">
                          <p className="text-xs text-forest/60 mb-2">
                            Confirme o vínculo clínico abaixo. Caso necessite
                            devolver este paciente para a Triagem, utilize o
                            botão secundário e deixe uma observação (opcional).
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              disabled={
                                selectedCard.atribuicaoStatus === "Aceito"
                              }
                              onClick={async () => {
                                const notifAnterior = selectedCard.notificacao
                                  ? selectedCard.notificacao + "\n\n"
                                  : "";
                                const nowStr = new Date().toLocaleString(
                                  "pt-BR",
                                );
                                const authName = profile?.name || "Parceiro";
                                const updates = {
                                  atribuicaoStatus: "Aceito",
                                  notificacao: `${notifAnterior}[${nowStr}] Encaminhamento ACEITO pelo profissional ${authName}.`,
                                };
                                await updateDoc(
                                  doc(db, "acolhimentos", selectedCard.id),
                                  updates,
                                );
                                setSelectedCard({
                                  ...selectedCard,
                                  ...updates,
                                });
                              }}
                              className={`px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                selectedCard.atribuicaoStatus === "Aceito"
                                  ? "bg-[#34A853] text-white shadow-sm disabled:opacity-100" // visually look disabled but fully opaque
                                  : "bg-white text-forest border border-soft hover:bg-[#34A853]/10 hover:text-[#34A853] hover:border-[#34A853]/30"
                              }`}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              {selectedCard.atribuicaoStatus === "Aceito"
                                ? "Paciente Aceito"
                                : "Aceitar Paciente"}
                            </button>

                            <button
                              onClick={() => {
                                setDevolverModalConfig({
                                  isOpen: true,
                                  pacienteId: selectedCard.id,
                                  pacienteName:
                                    (selectedCard as any).nomeCompleto ||
                                    "Paciente",
                                });
                              }}
                              className="px-4 py-3 bg-white text-red-600 border border-red-200 rounded-xl text-xs sm:text-sm font-semibold hover:bg-red-50 transition-colors"
                            >
                              {selectedCard.atribuicaoStatus === "Aceito"
                                ? "Devolver/Desatribuir"
                                : "Devolver Paciente"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Show Professional presentation card inside Patient file */}
                  {selectedCard.profissionalId &&
                    (() => {
                      const matchedProf = allUsers.find(
                        (u) =>
                          u.uid === selectedCard.profissionalId ||
                          u.id === selectedCard.profissionalId,
                      );
                      if (!matchedProf) return null;
                      const publicLink = `${window.location.origin}?prof=${matchedProf.uid || matchedProf.id || ""}`;
                      return (
                        <section className="mt-6 bg-white border border-soft p-5 rounded-2xl shadow-sm">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-14 h-14 rounded-full overflow-hidden bg-forest/10 border-2 border-sun flex-shrink-0 flex items-center justify-center">
                              {matchedProf.photoUrl ? (
                                <img
                                  src={matchedProf.photoUrl}
                                  alt={matchedProf.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User className="w-7 h-7 text-forest/70" />
                              )}
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-sun-dark uppercase tracking-wider">
                                Profissional Responsável
                              </span>
                              <h5 className="font-semibold text-forest text-sm leading-tight mt-0.5">
                                {matchedProf.name}
                              </h5>
                              <p className="text-xs text-forest/70 font-mono mt-1">
                                {matchedProf.especialidade ||
                                  "Psicólogo Clínico"}{" "}
                                {matchedProf.crp
                                  ? ` • CRP: ${matchedProf.crp}`
                                  : ""}
                              </p>
                            </div>
                          </div>

                          {matchedProf.biografia && (
                            <div className="bg-warm/50 p-3 rounded-xl text-xs text-forest/70/80 leading-relaxed italic mb-4 whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar">
                              "{matchedProf.biografia}"
                            </div>
                          )}

                          {matchedProf.motivacaoProjeto && (
                            <div className="bg-warm/50 p-3 rounded-xl text-xs text-forest/70/80 leading-relaxed italic mb-4 whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar">
                              <span className="font-semibold block mb-1">
                                Por que faço parte deste projeto?
                              </span>
                              "{matchedProf.motivacaoProjeto}"
                            </div>
                          )}

                          <div className="flex flex-col gap-2 mt-4">
                            <div className="flex items-center justify-between p-2.5 bg-warm rounded-xl border border-soft text-xs text-forest/70">
                              <span className="truncate max-w-[190px] font-mono select-all font-semibold">
                                {publicLink}
                              </span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(publicLink);
                                  alert("Link de Apresentação copiado!");
                                }}
                                className="px-2.5 py-1 bg-forest text-white text-[10px] uppercase tracking-wider font-bold rounded-md hover:bg-forest/90 transition-colors shrink-0"
                              >
                                Copiar Link
                              </button>
                            </div>
                            <span className="text-[9px] text-forest/70/50 mt-1">
                              Envie esse link para que o paciente conheça o
                              profissional antes da consulta.
                            </span>
                          </div>
                        </section>
                      );
                    })()}
                </div>
              </div>

              {/* Additional Ficha de Bordo info for Patients */}
              <div className="mt-8 border-t border-soft pt-8 space-y-6">
                <section>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Evolução e Registros Clínicos
                    Compartilhados
                  </h4>
                  <textarea
                    className="w-full text-sm bg-warm/50 border border-soft px-4 py-3 rounded-2xl focus:outline-none focus:border-sun-dark resize-none h-32"
                    placeholder="Anotações sobre evolução do paciente, encaminhamentos..."
                    value={selectedCard.registrosDeReunioes || ""}
                    onChange={(e) =>
                      handleUpdateAcolhimentoProperty(
                        selectedCard.id,
                        "registrosDeReunioes",
                        e.target.value,
                      )
                    }
                  />
                </section>

                <section>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4" /> Alertas Clínicos ou
                    Administrativos
                  </h4>
                  <textarea
                    className="w-full text-sm bg-red-50/50 border border-red-100 px-4 py-3 rounded-2xl focus:outline-none focus:border-red-300 resize-none h-24 text-red-900 placeholder:text-red-900/50"
                    placeholder="Ex: Risco de abandono, pendência de documentação..."
                    value={selectedCard.notificacao || ""}
                    onChange={(e) =>
                      handleUpdateAcolhimentoProperty(
                        selectedCard.id,
                        "notificacao",
                        e.target.value,
                      )
                    }
                  />
                </section>
              </div>
            </div>
            <div className="p-6 border-t border-soft bg-warm flex justify-end">
              <button
                onClick={() => setSelectedCard(null)}
                className="px-6 py-2 bg-sun-dark text-forest rounded-full text-sm font-semibold hover:bg-sun-dark-dark transition-colors"
              >
                Fechar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Tour Modal / Primeiros Passos */}
      {showTourModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-forest/20 backdrop-blur-sm animate-in fade-in py-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl border border-soft overflow-hidden animate-in zoom-in-95 p-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-sun-dark/20 rounded-full flex items-center justify-center mb-6 text-sun-dark-dark">
              <Star className="w-8 h-8" />
            </div>
            <h2 className="font-serif text-2xl text-forest mb-4">
              Bem-vindo(a) ao Projeto AcolheMente Saúde!
            </h2>
            <p className="text-forest/70 mb-8 leading-relaxed">
              Estamos muito felizes em ter você aqui. Na sua ficha de bordo
              ("Meus Pacientes"), você poderá acompanhar as suas sessões, enviar
              o link do contrato e notificar seus pacientes facilmente.
            </p>
            <button
              onClick={() => {
                safeLocalStorage.setItem("elo_tour_seen", "true");
                setShowTourModal(false);
              }}
              className="bg-forest text-white px-8 py-3 rounded-full font-semibold hover:bg-forest/90 transition-colors w-full"
            >
              Começar agora
            </button>
          </div>
        </div>
      )}

      {/* Notificar Modal */}
      {showNotificarModal && notificarTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-forest/20 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-soft overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 flex justify-between items-center border-b border-soft bg-warm/50">
              <h3 className="font-serif text-xl text-forest">
                Notificar{" "}
                {notificarTarget.nome ||
                  ("nomeEmpresa" in notificarTarget
                    ? notificarTarget.nomeEmpresa
                    : notificarTarget.name)}
              </h3>
              <button
                onClick={() => setShowNotificarModal(false)}
                className="p-2 text-forest/70 hover:text-red-500 rounded-full hover:bg-white transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">
                  Modelos de Mensagem
                </label>
                <select
                  className="w-full text-sm bg-warm/50 border border-soft px-4 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark"
                  value={notificacaoType}
                  onChange={(e) => {
                    const selected = templates.find(
                      (t) => t.id === e.target.value,
                    );
                    if (selected) {
                      setNotificacaoType(selected.id);
                      setNotificacaoName(selected.name);
                      setNotificacaoMsg(
                        processNotificationTemplate(
                          selected.msg,
                          notificarTarget,
                        ),
                      );
                    }
                  }}
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-forest/70 block">
                    Assunto / Título do Modelo
                  </label>
                  <label className="flex items-center gap-1 text-xs text-forest/80 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-sun-dark h-3 w-3"
                      checked={isEditingTemplate}
                      onChange={(e) => setIsEditingTemplate(e.target.checked)}
                    />
                    Editar Modelo Atual
                  </label>
                </div>
                <input
                  type="text"
                  value={notificacaoName}
                  onChange={(e) => setNotificacaoName(e.target.value)}
                  readOnly={!isEditingTemplate}
                  className={`w-full text-sm border px-4 py-2 rounded-xl focus:outline-none mb-3 ${isEditingTemplate ? "bg-white border-sun-dark" : "bg-warm/50 border-soft"}`}
                />

                <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">
                  Mensagem
                </label>
                <textarea
                  value={notificacaoMsg}
                  onChange={(e) => setNotificacaoMsg(e.target.value)}
                  readOnly={!isEditingTemplate}
                  className={`w-full text-sm border px-4 py-3 rounded-2xl focus:outline-none resize-none h-32 ${isEditingTemplate ? "bg-white border-sun-dark" : "bg-warm/50 border-soft"}`}
                />

                {isEditingTemplate && (
                  <button
                    onClick={() => {
                      setTemplates(
                        templates.map((t) =>
                          t.id === notificacaoType
                            ? {
                                ...t,
                                name: notificacaoName,
                                msg: notificacaoMsg,
                              }
                            : t,
                        ),
                      );
                      setIsEditingTemplate(false);
                      showToast("Modelo atualizado com sucesso!", "success");
                    }}
                    className="mt-2 text-xs font-semibold px-4 py-1.5 bg-sun-dark text-forest rounded-lg hover:bg-sun-dark-dark transition-colors"
                  >
                    Salvar Alterações no Modelo
                  </button>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-soft bg-warm flex flex-wrap justify-end gap-3">
              <button
                onClick={() => setShowNotificarModal(false)}
                className="px-5 py-2 text-forest font-semibold text-sm hover:underline"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  window.open(
                    `mailto:${notificarTarget.email}?subject=${encodeURIComponent(notificacaoName)}&body=${encodeURIComponent(notificacaoMsg)}`,
                  );
                  setShowNotificarModal(false);
                }}
                className="px-5 py-2 bg-white border border-soft text-forest rounded-full text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <Mail className="w-4 h-4" /> Enviar p/ E-mail Local
              </button>
              <button
                onClick={async () => {
                  if (notificarTarget && notificarTarget.email) {
                    try {
                      await triggerEmail(
                        notificarTarget.email,
                        notificacaoName || "Notificação Projeto AcolheMente",
                        `<h3>Olá!</h3><p>${notificacaoMsg.replace(/\n/g, "<br>")}</p>`
                      );
                      showToast("E-mail enfileirado para envio automático!", "success");
                    } catch (err) {
                      console.error("Erro ao enviar e-mail pela plataforma:", err);
                      showToast("Ocorreu um erro ao enviar via plataforma.", "error");
                    }
                  } else {
                    showToast("Este destinatário não possui e-mail cadastrado.", "error");
                  }
                  setShowNotificarModal(false);
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
              >
                <Send className="w-4 h-4" /> Enviar pela Plataforma
              </button>
              <button
                onClick={() => {
                  window.open(
                    `https://wa.me/?text=${encodeURIComponent(notificacaoMsg)}`,
                    "_blank",
                  );
                  setShowNotificarModal(false);
                }}
                className="px-5 py-2 bg-[#25D366] text-white rounded-full text-sm font-semibold hover:bg-[#20b858] transition-colors flex items-center gap-2"
              >
                <Phone className="w-4 h-4" /> Enviar via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contrato Modal */}
      {showContratoModal && notificarTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-forest/20 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-soft overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 flex justify-between items-center border-b border-soft bg-warm/50">
              <h3 className="font-serif text-xl text-forest">
                Editar Contrato:{" "}
                {notificarTarget.nome ||
                  ("nomeEmpresa" in notificarTarget
                    ? notificarTarget.nomeEmpresa
                    : notificarTarget.name)}
              </h3>
              <button
                onClick={() => setShowContratoModal(false)}
                className="p-2 text-forest/70 hover:text-red-500 rounded-full hover:bg-white transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">
                Modelo de Contrato (Editável)
              </label>
              <textarea
                value={contratoText}
                onChange={(e) => setContratoText(e.target.value)}
                className="w-full text-sm bg-white border border-soft px-4 py-4 rounded-2xl focus:outline-none focus:border-sun-dark resize-none min-h-[400px]"
              />
            </div>
            <div className="p-6 border-t border-soft bg-warm flex justify-end gap-3">
              <button
                onClick={() => setShowContratoModal(false)}
                className="px-5 py-2 text-forest font-semibold text-sm hover:underline"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  handleUpdateAcolhimentoProperty(
                    notificarTarget.id,
                    "contratoText",
                    contratoText,
                  );
                  showToast("Contrato atualizado para o paciente!", "success");
                  setShowContratoModal(false);
                }}
                className="px-5 py-2 bg-sun-dark text-forest rounded-full text-sm font-semibold hover:bg-sun-dark-dark transition-colors flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Salvar Contrato
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empresa Details Modal */}
      {selectedEmpresa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-forest/20 backdrop-blur-sm animate-in fade-in py-4">
          <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl border border-soft overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-soft bg-warm/50 gap-2">
              <div className="flex flex-col">
                <h3 className="font-serif text-2xl text-forest">
                  Ficha de Bordo
                </h3>
                <span className="text-sm font-semibold uppercase tracking-wider text-forest/60">
                  {selectedEmpresa.nomeEmpresa}
                </span>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-[11px] uppercase tracking-wider font-semibold text-forest/50 mt-1">
                  {selectedEmpresa.createdAt && (
                    <span>
                      Entrada: {formatDate(selectedEmpresa.createdAt)}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedEmpresa(null)}
                className="p-2 text-forest/70 hover:text-red-500 rounded-full hover:bg-white transition-colors self-end sm:self-auto"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center gap-4 py-3 px-6 bg-white border-b border-soft">
              <button
                onClick={() => {
                  const tpl =
                    templates.find((t) => t.id === "pagamento") || templates[0];
                  setNotificacaoType(tpl.id);
                  setNotificacaoName(tpl.name);
                  setNotificacaoMsg(
                    processNotificationTemplate(tpl.msg, selectedEmpresa),
                  );
                  setShowNotificarModal(true);
                }}
                className="flex items-center gap-2 text-emerald-600 font-semibold text-sm hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" /> Notificar
              </button>
              <button
                onClick={() =>
                  handleUpdateEmpresaProperty(
                    selectedEmpresa.id,
                    "ativo",
                    selectedEmpresa.ativo === false ? true : false,
                  )
                }
                className={`flex items-center gap-2 ${selectedEmpresa.ativo === false ? "text-slate-500 hover:bg-slate-50" : "text-red-500 hover:bg-red-50"} font-semibold text-sm px-3 py-1.5 rounded-lg transition-colors`}
              >
                <Trash2 className="w-4 h-4" />{" "}
                {selectedEmpresa.ativo === false ? "Ativar" : "Inativar"}
              </button>

              <div className="flex items-center gap-4 ml-4">
                <button
                  onClick={() => {
                    const link = `https://forms.gle/exemplo_empresa`;
                    window.open(
                      `https://wa.me/?text=${encodeURIComponent(`Olá! Por favor, preencha a ficha complementar de cadastro empresarial no link a seguir: ${link}`)}`,
                      "_blank",
                    );
                  }}
                  className="text-xs text-forest underline hover:text-sun-dark transition-colors"
                >
                  Ficha Complementar
                </button>
                <div className="w-px h-4 bg-soft"></div>
                <button
                  onClick={() => {
                    setContratoText(
                      `CONTRATO DE PRESTAÇÃO DE SERVIÇOS TIPO CORPORATIVO\n\nCONTRATANTE: ${selectedEmpresa.nomeEmpresa}, sob o CNPJ [INSERIR CNPJ], através de seu responsável ${selectedEmpresa.nomeContato}.\n\nCONTRATADA: Projeto AcolheMente Saúde...\n\n(Edite as cláusulas abaixo)`,
                    );
                    setShowContratoModal(true);
                  }}
                  className="text-xs text-forest underline hover:text-sun-dark transition-colors"
                >
                  Editar Contrato
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
              <section className="bg-warm/30 p-5 rounded-2xl border border-soft">
                <h4 className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-3 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" /> Dados de Contato e
                  Identificação
                </h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold uppercase text-forest/70/60 ml-2">
                        CNPJ
                      </label>
                      <DebouncedInput
                        className="text-sm bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark"
                        value={selectedEmpresa.cnpj || ""}
                        onChange={(val) =>
                          handleUpdateEmpresaProperty(
                            selectedEmpresa.id,
                            "cnpj",
                            val,
                          )
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold uppercase text-forest/70/60 ml-2">
                        Telefone
                      </label>
                      <DebouncedInput
                        className="text-sm bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark"
                        value={selectedEmpresa.telefone || ""}
                        onChange={(val) =>
                          handleUpdateEmpresaProperty(
                            selectedEmpresa.id,
                            "telefone",
                            val,
                          )
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold uppercase text-forest/70/60 ml-2">
                        E-mail
                      </label>
                      <DebouncedInput
                        type="email"
                        className="text-sm bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark"
                        value={selectedEmpresa.email || ""}
                        onChange={(val) =>
                          handleUpdateEmpresaProperty(
                            selectedEmpresa.id,
                            "email",
                            val,
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-warm/30 p-5 rounded-2xl border border-soft">
                <h4 className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-3 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" /> Status Contratual e
                  Comercial
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-soft">
                    <input
                      type="checkbox"
                      id="contrato"
                      checked={selectedEmpresa.contratoAssinado || false}
                      onChange={(e) =>
                        handleUpdateEmpresaProperty(
                          selectedEmpresa.id,
                          "contratoAssinado",
                          e.target.checked,
                        )
                      }
                      className="w-5 h-5 accent-sun-dark cursor-pointer rounded"
                    />
                    <label
                      htmlFor="contrato"
                      className="text-sm font-medium text-forest cursor-pointer"
                    >
                      Contrato Final Assinado
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold uppercase text-forest/70/60 ml-2">
                        Valores Acertados
                      </label>
                      <DebouncedInput
                        className="text-sm bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark"
                        placeholder="Ex: Ref. R$ 5k/mês"
                        value={selectedEmpresa.valoresAcertados || ""}
                        onChange={(val) =>
                          handleUpdateEmpresaProperty(
                            selectedEmpresa.id,
                            "valoresAcertados",
                            val,
                          )
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold uppercase text-forest/70/60 ml-2">
                        Emissão de NF (Data/Modo)
                      </label>
                      <DebouncedInput
                        className="text-sm bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark"
                        placeholder="Ex: Todo dia 05"
                        value={selectedEmpresa.emissaoNf || ""}
                        onChange={(val) =>
                          handleUpdateEmpresaProperty(
                            selectedEmpresa.id,
                            "emissaoNf",
                            val,
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h4 className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Serviços Oferecidos
                </h4>
                <DebouncedTextArea
                  className="w-full text-sm bg-warm/50 border border-soft px-4 py-3 rounded-2xl focus:outline-none focus:border-sun-dark resize-none h-24"
                  placeholder="Liste os serviços, convênios ou palestras acordadas..."
                  value={selectedEmpresa.servicosOferecidos || ""}
                  onChange={(val) =>
                    handleUpdateEmpresaProperty(
                      selectedEmpresa.id,
                      "servicosOferecidos",
                      val,
                    )
                  }
                />
              </section>

              <section>
                <h4 className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Registros de Reuniões e Contatos
                </h4>
                <DebouncedTextArea
                  className="w-full text-sm bg-warm/50 border border-soft px-4 py-3 rounded-2xl focus:outline-none focus:border-sun-dark resize-none h-32"
                  placeholder="Reunião 10/10: Empresa gostou da proposta..."
                  value={selectedEmpresa.registrosDeReunioes || ""}
                  onChange={(val) =>
                    handleUpdateEmpresaProperty(
                      selectedEmpresa.id,
                      "registrosDeReunioes",
                      val,
                    )
                  }
                />
              </section>

              <section>
                <h4 className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4" /> Alertas / Notificações Internas
                </h4>
                <DebouncedTextArea
                  className="w-full text-sm bg-red-50/50 border border-red-100 px-4 py-3 rounded-2xl focus:outline-none focus:border-red-300 resize-none h-24 text-red-900 placeholder:text-red-900/50"
                  placeholder="Ex: Cobrar assinatura do aditivo até sexta."
                  value={selectedEmpresa.notificacao || ""}
                  onChange={(val) =>
                    handleUpdateEmpresaProperty(
                      selectedEmpresa.id,
                      "notificacao",
                      val,
                    )
                  }
                />
              </section>
            </div>

            <div className="p-6 border-t border-soft bg-warm flex justify-end">
              <button
                onClick={() => setSelectedEmpresa(null)}
                className="px-6 py-2 bg-sun-dark text-forest rounded-full text-sm font-semibold hover:bg-sun-dark-dark transition-colors"
              >
                Fechar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profissional Details Modal */}
      {selectedProfissional && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-forest/20 backdrop-blur-sm animate-in fade-in py-4">
          <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl border border-soft overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-soft bg-warm/50 gap-2">
              <div className="flex flex-col">
                <h3 className="font-serif text-2xl text-forest">
                  Ficha de Bordo (Psicólogo)
                </h3>
                <span className="text-sm font-semibold uppercase tracking-wider text-forest/60">
                  {("nome" in selectedProfissional
                    ? selectedProfissional.nome
                    : selectedProfissional.name) || "Profissional"}
                </span>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-[11px] uppercase tracking-wider font-semibold text-forest/50 mt-1">
                  {selectedProfissional.createdAt && (
                    <span>
                      Entrada: {formatDate(selectedProfissional.createdAt)}
                    </span>
                  )}
                  {"statusUpdatedAt" in selectedProfissional &&
                    selectedProfissional.statusUpdatedAt && (
                      <span>
                        Status:{" "}
                        {formatDate(selectedProfissional.statusUpdatedAt)}
                      </span>
                    )}
                </div>
              </div>
              <button
                onClick={() => setSelectedProfissional(null)}
                className="p-2 text-forest/70 hover:text-red-500 rounded-full hover:bg-white transition-colors self-end sm:self-auto"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center gap-4 py-3 px-6 bg-white border-b border-soft">
              <button
                onClick={() => {
                  const tpl =
                    templates.find((t) => t.id === "lembrete") || templates[0];
                  setNotificacaoType(tpl.id);
                  setNotificacaoName(tpl.name);
                  setNotificacaoMsg(
                    processNotificationTemplate(tpl.msg, selectedProfissional),
                  );
                  setShowNotificarModal(true);
                }}
                className="flex items-center gap-2 text-emerald-600 font-semibold text-sm hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" /> Notificar
              </button>
              <button
                onClick={() =>
                  handleUpdateProfissionalProperty(
                    "id" in selectedProfissional
                      ? selectedProfissional.id
                      : selectedProfissional.uid,
                    "ativo",
                    selectedProfissional.ativo === false ? true : false,
                  )
                }
                className={`flex items-center gap-2 ${selectedProfissional.ativo === false ? "text-slate-500 hover:bg-slate-50" : "text-red-500 hover:bg-red-50"} font-semibold text-sm px-3 py-1.5 rounded-lg transition-colors`}
              >
                <Trash2 className="w-4 h-4" />{" "}
                {selectedProfissional.ativo === false ? "Ativar" : "Inativar"}
              </button>

              {selectedProfissional && "uid" in selectedProfissional && (
                <button
                  onClick={async () => {
                    try {
                      const lead = profissionaisLeads.find(
                        (l) =>
                          (l.email || "").toLowerCase().trim() ===
                          (selectedProfissional.email || "").toLowerCase().trim(),
                      );
                      if (!lead) {
                        const choice = window.confirm(
                          "Não encontramos nenhuma ficha de inscrição com o mesmo e-mail deste profissional. Deseja abrir a ferramenta de vinculação manual para buscar por Nome ou outro e-mail e realizar o resgate das informações?"
                        );
                        if (choice) {
                          setVincularProfTarget(selectedProfissional as UserProfile);
                          setVincularSearchQuery((selectedProfissional as UserProfile).name || "");
                          setShowVincularLeadModal(true);
                        }
                        return;
                      }
                      if (
                        window.confirm(
                          "Deseja importar informações preenchidas no formulário de inscrição por este profissional? Campos que já possuírem informação não serão sobrescritos.",
                        )
                      ) {
                        const fieldsToMerge = [
                          "telefone",
                          "crp",
                          "cpf",
                          "cidade",
                          "uf",
                          "motivacao",
                          "bioCurta",
                          "instagramUrl",
                          "linkedinUrl",
                          "siteUrl",
                          "abordagem",
                          "especialidade",
                          "anoFormacao",
                          "horasDisponiveis",
                          "publicosExperiencia",
                          "publicosGosto",
                          "outrosPublicosExperiencia",
                          "outrosPublicosGosto",
                          "registrosDeReunioes",
                          "notificacao",
                        ];

                        const updates: any = {};
                        let hasNewData = false;

                        for (const field of fieldsToMerge) {
                          const leadVal = lead[field];
                          const profVal = selectedProfissional[field];

                          const isProfEmpty =
                            profVal === undefined ||
                            profVal === null ||
                            profVal === "" ||
                            (Array.isArray(profVal) && profVal.length === 0);
                          const isLeadNotEmpty =
                            leadVal !== undefined &&
                            leadVal !== null &&
                            leadVal !== "" &&
                            (!Array.isArray(leadVal) || leadVal.length > 0);

                          if (isProfEmpty && isLeadNotEmpty) {
                            updates[field] = leadVal;
                            hasNewData = true;
                          }
                        }

                        if (hasNewData) {
                          const profId = selectedProfissional.uid!;
                          await updateDoc(doc(db, "users", profId), updates);
                          setSelectedProfissional({
                            ...selectedProfissional,
                            ...updates,
                          });
                          alert("Dados do formulário importados com sucesso!");
                        } else {
                          const forceChoice = window.confirm(
                            "Todas as novas informações não vazias do formulário já constam nesta Ficha de Bordo. Deseja realizar a importação forçada sobrescrevendo todos os campos atuais com os valores do formulário de inscrição?"
                          );
                          if (forceChoice) {
                            const overwriteUpdates: any = {};
                            let count = 0;
                            for (const field of fieldsToMerge) {
                              const leadVal = lead[field];
                              if (leadVal !== undefined && leadVal !== null && leadVal !== "") {
                                overwriteUpdates[field] = leadVal;
                                count++;
                              }
                            }
                            if (count > 0) {
                              const profId = selectedProfissional.uid!;
                              await updateDoc(doc(db, "users", profId), overwriteUpdates);
                              setSelectedProfissional({
                                ...selectedProfissional,
                                ...overwriteUpdates,
                              });
                              alert("Dados do formulário re-importados (sobrescrevendo) com sucesso!");
                            } else {
                              alert("O formulário de inscrição do profissional não possui dados preenchidos para importar.");
                            }
                          }
                        }
                      }
                    } catch (error: any) {
                      console.error("Erro na importação:", error);
                      alert("Ocorreu um erro ao importar dados: " + (error?.message || error));
                    }
                  }}
                  className="flex items-center gap-1.5 text-purple-600 font-semibold text-sm hover:bg-purple-50 px-3 py-1.5 rounded-lg transition-colors border border-purple-200"
                >
                  <RefreshCw className="w-4 h-4" /> Importar do Formulário
                </button>
              )}

              <div className="flex items-center gap-4 ml-4">
                <button
                  onClick={() => setIsEditingCard(!isEditingCard)}
                  className="flex items-center gap-2 text-amber-500 font-semibold text-sm hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Edit3 className="w-4 h-4" />{" "}
                  {isEditingCard ? "Salvar Edição" : "Editar"}
                </button>
                <div className="w-px h-4 bg-soft"></div>
                <button
                  onClick={() => {
                    const profName =
                      "nome" in selectedProfissional
                        ? selectedProfissional.nome
                        : selectedProfissional.name;
                    setContratoText(
                      `CONTRATO DE PARCERIA E PRESTAÇÃO DE SERVIÇOS PSICOLÓGICOS\n\nCONTRATANTE: Projeto AcolheMente Saúde...\n\nCONTRATADO(A): ${profName}, portador(a) do CRP/Conselho e email ${selectedProfissional.email}.\n\n(Edite as cláusulas abaixo)`,
                    );
                    setShowContratoModal(true);
                  }}
                  className="text-xs text-forest underline hover:text-sun-dark transition-colors"
                >
                  Editar Contrato
                </button>
                <div className="w-px h-4 bg-soft"></div>
                <button
                  onClick={() => {
                    const profId =
                      "id" in selectedProfissional
                        ? selectedProfissional.id
                        : selectedProfissional.uid;
                    const link = `${window.location.origin}/?prof=${profId}`;
                    window.open(link, "_blank");
                  }}
                  className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-forest text-white rounded-lg hover:bg-forest/90 transition-colors"
                >
                  <User className="w-3.5 h-3.5" /> Ver Perfil Público
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                <div className="space-y-6">
                  <section>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-3 flex items-center gap-2">
                      <User className="w-4 h-4" /> Informações Básicas
                    </h4>
                    <div className="space-y-3 ms-2">
                      <EditableField
                        label="Nome"
                        value={
                          "nome" in selectedProfissional
                            ? selectedProfissional.nome
                            : selectedProfissional.name
                        }
                        field={"nome" in selectedProfissional ? "nome" : "name"}
                        onChange={(f, v) =>
                          handleUpdateProfissionalProperty(
                            "id" in selectedProfissional
                              ? selectedProfissional.id
                              : selectedProfissional.uid,
                            f,
                            v,
                          )
                        }
                        isEditing={isEditingCard}
                      />
                      <EditableField
                        label="Telefone / WhatsApp"
                        value={selectedProfissional.telefone}
                        field="telefone"
                        onChange={(f, v) =>
                          handleUpdateProfissionalProperty(
                            "id" in selectedProfissional
                              ? selectedProfissional.id
                              : selectedProfissional.uid,
                            f,
                            v,
                          )
                        }
                        isEditing={isEditingCard}
                      />
                      <EditableField
                        label="E-mail"
                        value={selectedProfissional.email}
                        field="email"
                        onChange={(f, v) =>
                          handleUpdateProfissionalProperty(
                            "id" in selectedProfissional
                              ? selectedProfissional.id
                              : selectedProfissional.uid,
                            f,
                            v,
                          )
                        }
                        isEditing={isEditingCard}
                      />
                      <EditableField
                        label="Cidade"
                        value={selectedProfissional.cidade}
                        field="cidade"
                        onChange={(f, v) =>
                          handleUpdateProfissionalProperty(
                            "id" in selectedProfissional
                              ? selectedProfissional.id
                              : selectedProfissional.uid,
                            f,
                            v,
                          )
                        }
                        isEditing={isEditingCard}
                      />
                      <EditableField
                        label="Estado / UF"
                        value={selectedProfissional.uf}
                        field="uf"
                        onChange={(f, v) =>
                          handleUpdateProfissionalProperty(
                            "id" in selectedProfissional
                              ? selectedProfissional.id
                              : selectedProfissional.uid,
                            f,
                            v,
                          )
                        }
                        isEditing={isEditingCard}
                      />
                      <EditableField
                        label="Gênero"
                        value={selectedProfissional.genero}
                        field="genero"
                        onChange={(f, v) =>
                          handleUpdateProfissionalProperty(
                            "id" in selectedProfissional
                              ? selectedProfissional.id
                              : selectedProfissional.uid,
                            f,
                            v,
                          )
                        }
                        isEditing={isEditingCard}
                      />
                      <EditableField
                        label="Deficiência ou Necessidade Especial"
                        value={selectedProfissional.deficiencia}
                        field="deficiencia"
                        onChange={(f, v) =>
                          handleUpdateProfissionalProperty(
                            "id" in selectedProfissional
                              ? selectedProfissional.id
                              : selectedProfissional.uid,
                            f,
                            v,
                          )
                        }
                        isEditing={isEditingCard}
                      />
                      <EditableField
                        label="Motivação"
                        value={selectedProfissional.motivacao}
                        field="motivacao"
                        onChange={(f, v) =>
                          handleUpdateProfissionalProperty(
                            "id" in selectedProfissional
                              ? selectedProfissional.id
                              : selectedProfissional.uid,
                            f,
                            v,
                          )
                        }
                        isEditing={isEditingCard}
                      />
                      <EditableField
                        label="Frase Curta (Bio tipo Instagram)"
                        value={selectedProfissional.bioCurta}
                        field="bioCurta"
                        onChange={(f, v) =>
                          handleUpdateProfissionalProperty(
                            "id" in selectedProfissional
                              ? selectedProfissional.id
                              : selectedProfissional.uid,
                            f,
                            v,
                          )
                        }
                        isEditing={isEditingCard}
                      />
                      <EditableField
                        label="Instagram URL"
                        value={selectedProfissional.instagramUrl}
                        field="instagramUrl"
                        onChange={(f, v) =>
                          handleUpdateProfissionalProperty(
                            "id" in selectedProfissional
                              ? selectedProfissional.id
                              : selectedProfissional.uid,
                            f,
                            v,
                          )
                        }
                        isEditing={isEditingCard}
                      />
                      <EditableField
                        label="LinkedIn URL"
                        value={selectedProfissional.linkedinUrl}
                        field="linkedinUrl"
                        onChange={(f, v) =>
                          handleUpdateProfissionalProperty(
                            "id" in selectedProfissional
                              ? selectedProfissional.id
                              : selectedProfissional.uid,
                            f,
                            v,
                          )
                        }
                        isEditing={isEditingCard}
                      />
                      <EditableField
                        label="Site ou Portfólio URL"
                        value={selectedProfissional.siteUrl}
                        field="siteUrl"
                        onChange={(f, v) =>
                          handleUpdateProfissionalProperty(
                            "id" in selectedProfissional
                              ? selectedProfissional.id
                              : selectedProfissional.uid,
                            f,
                            v,
                          )
                        }
                        isEditing={isEditingCard}
                      />
                    </div>
                  </section>
                </div>

                <div className="space-y-6">
                  <section>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-3 flex items-center gap-2">
                      <Briefcase className="w-4 h-4" /> Atuação e Formação
                    </h4>
                    <div className="space-y-3 ms-2">
                      <EditableField
                        label="CRP / Registro"
                        value={selectedProfissional.crp}
                        field="crp"
                        onChange={(f, v) =>
                          handleUpdateProfissionalProperty(
                            "id" in selectedProfissional
                              ? selectedProfissional.id
                              : selectedProfissional.uid,
                            f,
                            v,
                          )
                        }
                        isEditing={isEditingCard}
                      />
                      <EditableField
                        label="CPF"
                        value={selectedProfissional.cpf}
                        field="cpf"
                        onChange={(f, v) =>
                          handleUpdateProfissionalProperty(
                            "id" in selectedProfissional
                              ? selectedProfissional.id
                              : selectedProfissional.uid,
                            f,
                            v,
                          )
                        }
                        isEditing={isEditingCard}
                      />
                      <EditableField
                        label="Horas Disponíveis"
                        value={selectedProfissional.horasDisponiveis}
                        field="horasDisponiveis"
                        onChange={(f, v) =>
                          handleUpdateProfissionalProperty(
                            "id" in selectedProfissional
                              ? selectedProfissional.id
                              : selectedProfissional.uid,
                            f,
                            v,
                          )
                        }
                        isEditing={isEditingCard}
                      />
                      <EditableField
                        label="Abordagens Psicológicas"
                        value={selectedProfissional.abordagem}
                        field="abordagem"
                        onChange={(f, v) =>
                          handleUpdateProfissionalProperty(
                            "id" in selectedProfissional
                              ? selectedProfissional.id
                              : selectedProfissional.uid,
                            f,
                            v,
                          )
                        }
                        isEditing={isEditingCard}
                      />
                      <EditableField
                        label="Especialidade / Pós-graduação"
                        value={selectedProfissional.especialidade}
                        field="especialidade"
                        onChange={(f, v) =>
                          handleUpdateProfissionalProperty(
                            "id" in selectedProfissional
                              ? selectedProfissional.id
                              : selectedProfissional.uid,
                            f,
                            v,
                          )
                        }
                        isEditing={isEditingCard}
                      />
                      <EditableField
                        label="Ano de formação / graduação"
                        value={selectedProfissional.anoFormacao}
                        field="anoFormacao"
                        onChange={(f, v) =>
                          handleUpdateProfissionalProperty(
                            "id" in selectedProfissional
                              ? selectedProfissional.id
                              : selectedProfissional.uid,
                            f,
                            v,
                          )
                        }
                        isEditing={isEditingCard}
                      />

                      <div className="pt-2">
                        <span className="block text-[10px] font-semibold uppercase text-forest/70/60 content-start">
                          Experiência com Atendimento Clínico
                        </span>
                        {isEditingCard ? (
                          <input
                            title="Separado por vírgula"
                            value={
                              selectedProfissional.publicosExperiencia?.join(
                                ", ",
                              ) || ""
                            }
                            onChange={(e) =>
                              handleUpdateProfissionalProperty(
                                "id" in selectedProfissional
                                  ? selectedProfissional.id
                                  : selectedProfissional.uid,
                                "publicosExperiencia",
                                e.target.value.split(",").map((s) => s.trim()),
                              )
                            }
                            className="text-sm font-medium text-forest border-b border-sun-dark focus:outline-none bg-transparent w-full mt-1"
                          />
                        ) : (
                          <span className="text-sm font-medium text-forest">
                            {selectedProfissional.publicosExperiencia?.join(
                              ", ",
                            ) || "-"}{" "}
                            {selectedProfissional.outrosPublicosExperiencia
                              ? `(Outros: ${selectedProfissional.outrosPublicosExperiencia})`
                              : ""}
                          </span>
                        )}
                      </div>

                      <div className="pt-2">
                        <span className="block text-[10px] font-semibold uppercase text-forest/70/60 content-start">
                          Gosto de Atender
                        </span>
                        {isEditingCard ? (
                          <input
                            title="Separado por vírgula"
                            value={
                              selectedProfissional.publicosGosto?.join(", ") ||
                              ""
                            }
                            onChange={(e) =>
                              handleUpdateProfissionalProperty(
                                "id" in selectedProfissional
                                  ? selectedProfissional.id
                                  : selectedProfissional.uid,
                                "publicosGosto",
                                e.target.value.split(",").map((s) => s.trim()),
                              )
                            }
                            className="text-sm font-medium text-forest border-b border-sun-dark focus:outline-none bg-transparent w-full mt-1"
                          />
                        ) : (
                          <span className="text-sm font-medium text-forest">
                            {selectedProfissional.publicosGosto?.join(", ") ||
                              "-"}{" "}
                            {selectedProfissional.outrosPublicosGosto
                              ? `(Outros: ${selectedProfissional.outrosPublicosGosto})`
                              : ""}
                          </span>
                        )}
                      </div>

                      <div className="pt-2">
                        <span className="block text-[10px] font-semibold uppercase text-forest/70/60 content-start">
                          Serviços profissionais que oferece
                        </span>
                        <div className="flex flex-col gap-1.5 mt-1">
                          {selectedProfissional.servicosOferecidos && selectedProfissional.servicosOferecidos.length > 0 ? (
                            selectedProfissional.servicosOferecidos.map((srv: string) => {
                              const isAcessivel = selectedProfissional.servicosOrcamentoAcessivel?.includes(srv);
                              return (
                                <div key={srv} className="flex items-center justify-between text-xs font-medium text-forest bg-warm/30 px-2.5 py-1 rounded-lg border border-soft/50">
                                  <span>
                                    {srv === "Outros" ? `Outros: ${selectedProfissional.outrosServicos || "Especifique"}` : srv}
                                  </span>
                                  {isAcessivel && (
                                    <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-emerald-200">
                                      Orçamento Acessível
                                    </span>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <span className="text-sm font-medium text-forest">-</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              <section>
                <h4 className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Registros de Reuniões e Contatos
                </h4>
                <DebouncedTextArea
                  className="w-full text-sm bg-warm/50 border border-soft px-4 py-3 rounded-2xl focus:outline-none focus:border-sun-dark resize-none h-32"
                  placeholder="Anotações de entrevistas, alinhamentos, feedback..."
                  value={selectedProfissional.registrosDeReunioes || ""}
                  onChange={(val) =>
                    handleUpdateProfissionalProperty(
                      "id" in selectedProfissional
                        ? selectedProfissional.id
                        : selectedProfissional.uid,
                      "registrosDeReunioes",
                      val,
                    )
                  }
                />
              </section>

              <section>
                <h4 className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4" /> Alertas / Notificações Internas
                </h4>
                <DebouncedTextArea
                  className="w-full text-sm bg-red-50/50 border border-red-100 px-4 py-3 rounded-2xl focus:outline-none focus:border-red-300 resize-none h-24 text-red-900 placeholder:text-red-900/50"
                  placeholder="Ex: Verificar CRP, documentação incompleta..."
                  value={selectedProfissional.notificacao || ""}
                  onChange={(val) =>
                    handleUpdateProfissionalProperty(
                      "id" in selectedProfissional
                        ? selectedProfissional.id
                        : selectedProfissional.uid,
                      "notificacao",
                      val,
                    )
                  }
                />
              </section>

              <section className="bg-warm/30 p-5 rounded-2xl border border-soft/80">
                <h4 className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-3 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-sun-dark" /> Serviços Cadastrados pelo Profissional
                </h4>
                {selectedProfServicos.length === 0 ? (
                  <p className="text-xs text-forest/50 italic py-2">
                    Nenhum serviço cadastrado por este profissional ainda.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    {selectedProfServicos.map((svc) => (
                      <div key={svc.id} className="bg-white p-4 rounded-xl border border-soft shadow-xs flex flex-col gap-1.5">
                        <span className="font-serif font-semibold text-forest text-sm">{svc.nome}</span>
                        <div className="flex flex-wrap items-center gap-2 text-[10px]">
                          <span className="px-2 py-0.5 bg-warm rounded-full font-semibold text-forest">
                            Público: {svc.publicoAlvo}
                          </span>
                          {svc.orcamentoAcessivel ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold border border-emerald-100 rounded-full">
                              Orçamento Acessível
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-50 text-gray-400 font-semibold border border-gray-100 rounded-full">
                              Orçamento Padrão
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="p-6 border-t border-soft bg-warm flex justify-end">
              <button
                onClick={() => setSelectedProfissional(null)}
                className="px-6 py-2 bg-sun-dark text-forest rounded-full text-sm font-semibold hover:bg-sun-dark-dark transition-colors"
              >
                Fechar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Importação de Profissionais */}
      {showImportModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-forest/20 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-soft overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-4 flex justify-between items-center border-b border-soft bg-warm/50">
              <h3 className="font-serif text-xl text-forest flex items-center gap-2">
                <Upload className="w-5 h-5 text-forest/70" />
                Importar Profissionais (CSV / JSON)
              </h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportResults(null);
                  setImportFeedback(null);
                  setImportProgress(0);
                }}
                className="p-2 text-forest/70 hover:text-red-500 rounded-full hover:bg-white transition-colors"
                type="button"
                disabled={isImporting}
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
              
              {/* Instructions and Header format guide */}
              <div className="bg-warm/40 p-4 rounded-2xl border border-soft text-xs text-forest/80 space-y-2">
                <p className="font-bold flex items-center gap-1">
                  <Info className="w-4 h-4 text-forest/60" /> Guia de Formatação de Arquivos
                </p>
                <p>O arquivo enviado pode ser no formato <strong>.CSV</strong> (delimitador vírgula ou ponto-e-vírgula) ou <strong>.JSON</strong> (um array de objetos).</p>
                <div>
                  <span className="font-semibold text-forest/90">Colunas suportadas (e variações de nome):</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 mt-1 font-mono text-[10px] text-forest/70">
                    <div>• nome / name</div>
                    <div>• email / e-mail</div>
                    <div>• telefone / phone</div>
                    <div>• crp / crm</div>
                    <div>• cpf</div>
                    <div>• cidade / city</div>
                    <div>• uf / estado</div>
                    <div>• especialidade</div>
                    <div>• abordagem</div>
                    <div>• horasDisponiveis</div>
                  </div>
                </div>
              </div>

               {/* Drag and Drop Zone */}
              {!importFile && !importFeedback && (
                <div
                  onDragEnter={handleImportDrag}
                  onDragOver={handleImportDrag}
                  onDragLeave={handleImportDrag}
                  onDrop={handleImportDrop}
                  className={`border-2 border-dashed rounded-3xl p-8 text-center flex flex-col items-center justify-center gap-3 transition-all ${
                    dragActive
                      ? "border-purple-500 bg-purple-50/50 scale-[0.99]"
                      : "border-soft hover:border-purple-400 bg-warm/10"
                  }`}
                >
                  <Upload className={`w-12 h-12 transition-transform duration-300 ${dragActive ? "scale-110 text-purple-600 animate-bounce" : "text-forest/30"}`} />
                  <div>
                    <p className="text-sm font-semibold text-forest">
                      Arraste seu arquivo .csv ou .json aqui
                    </p>
                    <p className="text-xs text-forest/50 mt-1">
                      ou clique para selecionar do seu dispositivo
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".csv,.json"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleProcessImportFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                    id="fileImportInput"
                  />
                  <label
                    htmlFor="fileImportInput"
                    className="px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-semibold rounded-full cursor-pointer transition-colors mt-2"
                  >
                    Selecionar Arquivo
                  </label>
                </div>
              )}

              {/* Show importing state / loading */}
              {isImporting && (
                <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-6 text-center space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    <RefreshCw className="w-6 h-6 text-purple-600 animate-spin" />
                    <span className="text-sm font-bold text-purple-800">
                      Importando Dados...
                    </span>
                  </div>
                  <div className="text-xs text-purple-700">
                    Salvando {importProgress} de {importResults?.data.length || 0} profissionais no banco de dados.
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-purple-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          importResults?.data.length
                            ? (importProgress / importResults.data.length) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Show feedback */}
              {importFeedback && (
                <div className={`p-6 rounded-2xl border flex flex-col gap-3 ${
                  importFeedback.success
                    ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                    : "bg-red-50 border-red-100 text-red-800"
                }`}>
                  <div className="flex items-center gap-2">
                    {importFeedback.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <ShieldAlert className="w-5 h-5 text-red-600" />
                    )}
                    <span className="font-bold text-sm">
                      {importFeedback.success ? "Importação Concluída" : "Falha na Importação"}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed">
                    {importFeedback.message}
                  </p>
                  {!isImporting && (
                    <button
                      onClick={() => {
                        setImportFile(null);
                        setImportResults(null);
                        setImportFeedback(null);
                        setImportProgress(0);
                      }}
                      className="mt-2 self-start px-4 py-1.5 bg-white border border-soft text-xs font-semibold rounded-full text-forest hover:bg-warm transition-colors"
                    >
                      Tentar Outro Arquivo
                    </button>
                  )}
                </div>
              )}

              {/* Selected File & Preview of Results */}
              {importFile && importResults && !isImporting && !importFeedback && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-warm/30 px-4 py-3 rounded-xl border border-soft">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="text-xs font-bold text-forest truncate max-w-[250px]">{importFile.name}</p>
                        <p className="text-[10px] text-forest/50">{(importFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setImportFile(null);
                        setImportResults(null);
                        setImportFeedback(null);
                      }}
                      className="text-xs text-red-500 hover:text-red-700 font-semibold"
                    >
                      Remover
                    </button>
                  </div>

                  {/* Errors / Warnings */}
                  {importResults.errorCount > 0 && (
                    <div className="bg-red-50 border border-red-100 text-red-800 p-4 rounded-xl space-y-2">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-red-600" />
                        <span className="font-bold text-xs">
                          {importResults.errorCount} erro(s) de validação encontrado(s):
                        </span>
                      </div>
                      <ul className="text-[10px] list-disc list-inside space-y-1 bg-white/40 p-2.5 rounded-lg max-h-24 overflow-y-auto custom-scrollbar">
                        {importResults.errors.map((err, idx) => (
                          <li key={idx} className="break-words">{err}</li>
                        ))}
                      </ul>
                      <p className="text-[10px] text-red-700 font-medium">
                        * Registros com erro serão ignorados. Apenas os registros válidos serão importados.
                      </p>
                    </div>
                  )}

                  {/* Success preview */}
                  {importResults.successCount > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-forest/70 uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Visualização ({importResults.successCount} profissionais válidos)
                        </span>
                      </div>
                      <div className="border border-soft rounded-2xl overflow-hidden max-h-48 overflow-y-auto custom-scrollbar bg-warm/5">
                        <table className="w-full text-[11px] text-left border-collapse">
                          <thead className="bg-warm border-b border-soft text-forest/70 font-semibold sticky top-0">
                            <tr>
                              <th className="px-4 py-2">Nome</th>
                              <th className="px-4 py-2">E-mail</th>
                              <th className="px-4 py-2">CRP</th>
                              <th className="px-4 py-2">Especialidade</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-soft/50 text-forest/95">
                            {importResults.data.map((p, idx) => (
                              <tr key={idx} className="hover:bg-warm/20">
                                <td className="px-4 py-2 font-medium">{p.nome}</td>
                                <td className="px-4 py-2 font-mono">{p.email}</td>
                                <td className="px-4 py-2 font-mono">{p.crp || "-"}</td>
                                <td className="px-4 py-2 truncate max-w-[120px]">{p.especialidade || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-6 bg-red-50/50 border border-dashed border-red-200 rounded-2xl text-red-700 text-xs font-medium">
                      Nenhum profissional válido encontrado no arquivo para importar. Corrija os erros listados acima.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-soft bg-warm/30 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportResults(null);
                  setImportFeedback(null);
                  setImportProgress(0);
                }}
                className="px-5 py-2 bg-white text-forest border border-soft rounded-full text-xs font-bold hover:bg-warm transition-colors"
                disabled={isImporting}
              >
                Fechar
              </button>
              {importResults && importResults.successCount > 0 && !isImporting && !importFeedback && (
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
                >
                  Confirmar Importação ({importResults.successCount})
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Novo Profissional Modal */}
      {showNewProfissionalModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-forest/20 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-soft overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 flex justify-between items-center border-b border-soft bg-warm/50">
              <h3 className="font-serif text-xl text-forest">
                Nova Conta de Profissional
              </h3>
              <button
                onClick={() => {
                  setShowNewProfissionalModal(false);
                  setNewProfName("");
                  setNewProfEmail("");
                  setNewProfPassword("");
                  setLeadIdToConvert(null);
                  setUseGoogleLogin(false);
                  setNewProfRole("profissional");
                }}
                className="p-2 text-forest/70 hover:text-red-500 rounded-full hover:bg-white transition-colors"
                type="button"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateProfissional} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={newProfName}
                  onChange={(e) => setNewProfName(e.target.value)}
                  className="w-full text-sm bg-warm/50 border border-soft px-4 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                  placeholder="Nome do Psicólogo"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">
                  E-mail
                </label>
                <input
                  type="email"
                  required
                  value={newProfEmail}
                  onChange={(e) => setNewProfEmail(e.target.value)}
                  className="w-full text-sm bg-warm/50 border border-soft px-4 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="flex items-center gap-2 mt-4">
                <input
                  type="checkbox"
                  id="googleLoginCheck"
                  checked={useGoogleLogin}
                  onChange={(e) => {
                    setUseGoogleLogin(e.target.checked);
                    if (e.target.checked && !newProfPassword) {
                      setNewProfPassword(Math.random().toString(36).slice(-8));
                    }
                  }}
                  className="w-4 h-4 text-[#34A853] rounded focus:ring-[#34A853]"
                />
                <label
                  htmlFor="googleLoginCheck"
                  className="text-sm font-semibold text-forest"
                >
                  Utilizar conta Google (Login via Gmail)
                </label>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">
                  Nível de Acesso (Papel)
                </label>
                <select
                  className="w-full text-sm bg-warm/50 border border-soft px-4 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                  value={newProfRole}
                  onChange={(e) => setNewProfRole(e.target.value as Role)}
                >
                  <option value="profissional">Profissional (Psicólogo)</option>
                  <option value="triagem">Triagem (Avaliação Inicial)</option>
                  <option value="master">Gestor (Master)</option>
                </select>
              </div>

              {!useGoogleLogin && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">
                    Senha Provisória
                  </label>
                  <input
                    type="password"
                    required={!useGoogleLogin}
                    minLength={6}
                    value={newProfPassword}
                    onChange={(e) => setNewProfPassword(e.target.value)}
                    className="w-full text-sm bg-warm/50 border border-soft px-4 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              )}
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewProfissionalModal(false);
                    setNewProfName("");
                    setNewProfEmail("");
                    setNewProfPassword("");
                    setLeadIdToConvert(null);
                    setUseGoogleLogin(false);
                    setNewProfRole("profissional");
                  }}
                  className="px-5 py-2 text-forest font-semibold text-sm hover:underline"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sun-dark text-forest rounded-full text-sm font-semibold hover:bg-sun-dark-dark transition-colors flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Criar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vincular Lead Modal */}
      {showVincularLeadModal && vincularProfTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-forest/20 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl border border-soft overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 flex justify-between items-center border-b border-soft bg-warm/50 shrink-0">
              <div>
                <h3 className="font-serif text-xl font-bold text-forest">
                  Vincular Inscrição Manualmente
                </h3>
                <p className="text-xs text-forest/60">
                  Associar ficha para: {vincularProfTarget.name}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowVincularLeadModal(false);
                  setVincularProfTarget(null);
                  setVincularSearchQuery("");
                }}
                className="p-2 text-forest/70 hover:text-red-500 rounded-full hover:bg-white transition-colors"
                type="button"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 shrink-0 border-b border-soft bg-warm/20">
              <div className="relative">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-forest/40" />
                <input
                  type="text"
                  value={vincularSearchQuery}
                  onChange={(e) => setVincularSearchQuery(e.target.value)}
                  placeholder="Pesquisar por nome ou e-mail da inscrição..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-soft rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar">
              {(() => {
                const searchLower = vincularSearchQuery.toLowerCase().trim();
                const filteredList = profissionaisLeads.filter(
                  (lead) =>
                    !searchLower ||
                    (lead.nome || "").toLowerCase().includes(searchLower) ||
                    (lead.email || "").toLowerCase().includes(searchLower) ||
                    (lead.crp || "").toLowerCase().includes(searchLower)
                );

                if (filteredList.length === 0) {
                  return (
                    <div className="text-center py-12 text-forest/50 text-sm">
                      Nenhuma inscrição (lead) correspondente encontrada no banco de dados.
                    </div>
                  );
                }

                return filteredList.map((lead) => (
                  <div
                    key={lead.id}
                    className="p-4 bg-warm/30 hover:bg-warm/60 border border-soft/50 rounded-2xl flex justify-between items-center gap-4 transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="font-serif font-bold text-forest truncate">
                        {lead.nome}
                      </h4>
                      <p className="text-xs text-forest/60 truncate">
                        {lead.email}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {lead.crp && (
                          <span className="text-[10px] bg-white border border-soft text-forest/70 px-2 py-0.5 rounded-full font-medium">
                            CRP: {lead.crp}
                          </span>
                        )}
                        {lead.especialidade && (
                          <span className="text-[10px] bg-white border border-soft text-forest/70 px-2 py-0.5 rounded-full font-medium">
                            {lead.especialidade}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        if (
                          window.confirm(
                            `Deseja migrar todos os dados da inscrição de "${lead.nome}" para o perfil ativo de "${vincularProfTarget.name}"?`
                          )
                        ) {
                          try {
                            const fieldsToMerge = [
                              "telefone",
                              "crp",
                              "cpf",
                              "cidade",
                              "uf",
                              "motivacao",
                              "bioCurta",
                              "instagramUrl",
                              "linkedinUrl",
                              "siteUrl",
                              "abordagem",
                              "especialidade",
                              "anoFormacao",
                              "horasDisponiveis",
                              "publicosExperiencia",
                              "publicosGosto",
                              "outrosPublicosExperiencia",
                              "outrosPublicosGosto",
                              "registrosDeReunioes",
                              "notificacao",
                            ];

                            const updates: any = {};
                            for (const field of fieldsToMerge) {
                              const val = lead[field];
                              if (val !== undefined && val !== null && val !== "") {
                                updates[field] = val;
                              }
                            }

                            // Update user doc
                            await updateDoc(
                              doc(db, "users", vincularProfTarget.uid!),
                              updates
                            );

                            // Optional: Delete or update status of lead
                            const deleteChoice = window.confirm(
                              "Os dados foram copiados com sucesso! Deseja remover esta inscrição pendente do banco de dados para evitar duplicidade?"
                            );
                            if (deleteChoice) {
                              await deleteDoc(doc(db, "profissionais_leads", lead.id));
                            } else {
                              // Just mark as approved or set status
                              await updateDoc(doc(db, "profissionais_leads", lead.id), {
                                status: "Aprovado / Acesso Gerado",
                              });
                            }

                            // Update local states
                            setSelectedProfissional({
                              ...vincularProfTarget,
                              ...updates,
                            });

                            alert("Processo de migração manual realizado com sucesso!");
                            setShowVincularLeadModal(false);
                            setVincularProfTarget(null);
                            setVincularSearchQuery("");
                          } catch (err: any) {
                            console.error("Erro ao vincular e migrar dados:", err);
                            alert("Ocorreu um erro ao migrar os dados do profissional: " + err.message);
                          }
                        }
                      }}
                      className="px-3 py-1.5 bg-forest text-white hover:bg-forest/95 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
                    >
                      Vincular & Migrar
                    </button>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successMsg && (
        <div className="fixed inset-0 bg-forest/20 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full rounded-[2rem] p-8 shadow-xl border border-soft flex flex-col items-center text-center animate-in zoom-in-95">
            <div className="w-16 h-16 bg-[#34A853]/10 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-8 h-8 text-[#34A853]" />
            </div>
            <h3 className="text-xl font-serif text-forest mb-2">Sucesso!</h3>
            <p className="text-forest/70 text-sm mb-8">{successMsg}</p>
            <button
              onClick={() => setSuccessMsg(null)}
              className="w-full px-4 py-2.5 sm:py-3 bg-forest text-white rounded-xl font-bold uppercase tracking-wider text-xs sm:text-sm hover:bg-forest/90 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Confimation Modal */}
      {confirmConfig && (
        <div className="fixed inset-0 bg-forest/20 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full rounded-[2rem] p-8 shadow-xl border border-soft flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-serif text-forest mb-2">Atenção</h3>
            <p className="text-forest/70 text-sm mb-8">
              {confirmConfig.message}
            </p>
            <div className="flex w-full gap-3">
              <button
                onClick={() => setConfirmConfig(null)}
                className="flex-1 px-4 py-2.5 sm:py-3 bg-warm text-forest rounded-xl font-semibold text-xs sm:text-sm hover:bg-warm-dark transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  confirmConfig.onConfirm();
                  setConfirmConfig(null);
                }}
                className="flex-1 px-4 py-2.5 sm:py-3 bg-red-500 text-white rounded-xl font-semibold text-xs sm:text-sm hover:bg-red-600 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Devolver Paciente Modal */}
      {devolverModalConfig && (
        <div className="fixed inset-0 bg-forest/20 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-[2rem] p-8 shadow-xl border border-soft flex flex-col">
            <h3 className="text-xl font-serif text-forest mb-2">
              Devolver Paciente
            </h3>
            <p className="text-forest/70 text-sm mb-6">
              Você está devolvendo o(a) paciente{" "}
              <span className="font-semibold">
                {devolverModalConfig.pacienteName}
              </span>{" "}
              para a triagem. Esta ação o recolocará na Fila de Espera.
            </p>

            <div className="flex flex-col gap-4 mb-8">
              <div>
                <label className="text-xs uppercase font-bold tracking-wider text-forest/70 mb-2 block">
                  Observação (Opcional)
                </label>
                <textarea
                  rows={4}
                  value={motivoDevolucaoOutro}
                  onChange={(e) => setMotivoDevolucaoOutro(e.target.value)}
                  className="w-full px-4 py-3 bg-warm/50 border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors text-sm custom-scrollbar"
                  placeholder="Deixe uma observação do motivo para o gestor..."
                />
              </div>
            </div>

            <div className="flex w-full gap-3">
              <button
                onClick={() => {
                  setDevolverModalConfig(null);
                  setMotivoDevolucaoOutro("");
                }}
                className="flex-1 px-4 py-2.5 sm:py-3 bg-warm text-forest rounded-xl font-semibold text-xs sm:text-sm hover:bg-warm-dark transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const observacaoFinal = motivoDevolucaoOutro.trim();

                  try {
                    const currentPaciente = acolhimentos.find(
                      (a) => a.id === devolverModalConfig.pacienteId,
                    );
                    const notificacaoAnterior = currentPaciente?.notificacao
                      ? currentPaciente.notificacao + "\n\n"
                      : "";
                    const nowStr = new Date().toLocaleString("pt-BR");

                    const textoMotivo = observacaoFinal
                      ? ` Observação: ${observacaoFinal}`
                      : "";

                    const updates = {
                      profissionalId: "",
                      status: "Aguardando Avaliação", // Triagem
                      atribuicaoStatus: null,
                      notificacao: `${notificacaoAnterior}[${nowStr}] Atendimento devolvido pelo profissional ${profile?.name || "Parceiro"}.${textoMotivo} Retornou para a Triagem.`,
                    };
                    await updateDoc(
                      doc(db, "acolhimentos", devolverModalConfig.pacienteId),
                      updates,
                    );
                    setSelectedCard(null);
                    setDevolverModalConfig(null);
                    setMotivoDevolucaoOutro("");
                  } catch (e) {
                    console.error(e);
                    alert("Erro ao devolver paciente.");
                  }
                }}
                className="flex-1 px-4 py-2.5 sm:py-3 bg-red-500 text-white rounded-xl font-semibold text-xs sm:text-sm hover:bg-red-600 transition-colors"
              >
                Confirmar e Devolver
              </button>
            </div>
          </div>
        </div>
      )}

      {showComplianceModal && (
        <ComplianceModal
          onClose={() => setShowComplianceModal(false)}
          userId={profile?.uid || profile?.id}
          userRole={profile?.role || currentRole}
          userName={profile?.name}
          userEmail={profile?.email}
        />
      )}
    </div>
  );
}
