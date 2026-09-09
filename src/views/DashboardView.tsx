import React, { useEffect, useState, useRef } from "react";
import { sendWebhookNotification } from "../lib/webhookNotifier";
import { sendPatientRegistrationEmail } from "../lib/emailService";
import { StripeCheckoutModal } from "../components/StripeCheckoutModal";
import { PhotoCropModal } from "../components/PhotoCropModal";
import { autoCropProfileImage, readFileAsDataURL } from "../lib/imageAutoFaceCrop";
import { AnimatePresence, motion } from "motion/react";
import { EventosServicosView } from "./EventosServicosView";
import { ComplianceModal } from "../components/ComplianceModal";
import { BackupManager } from "../components/BackupManager";
import { EmpresaBeneficioManager } from "../components/EmpresaBeneficioManager";
import { EvolutionDiagnosticModal } from "../components/EvolutionDiagnosticModal";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  User,
  LayoutGrid,
  LogOut,
  CheckCircle2,
  CheckCircle,
  Check,
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
  MessageCircle,
  Share2,
  Star,
  Upload,
  Table,
  Download,
  Eye,
  CreditCard,
  Sparkles,
  Sliders,
  Wallet,
  Gift,
  UserCheck,
  RotateCcw,
  PauseCircle,
  AlertTriangle,
  Loader2,
  ClipboardList,
  MessageSquare,
  Calculator,
  UserX,
  Compass,
  ChevronDown,
  ChevronUp,
  Minimize2,
  Maximize2,
  Lock,
  TrendingUp,
  PlusCircle,
  BookOpen,
  Database,
  QrCode,
  Wifi,
  WifiOff,
  ExternalLink,
  Server,
  Radio,
  Bell,
  Play,
  Inbox,
  Layers,
} from "lucide-react";
import {
  checkEvolutionStatus,
  connectEvolutionInstance,
  configureEvolutionWebhook,
  sendEvolutionMessage,
  disconnectEvolutionInstance,
  fetchRecentWebhookEvents,
  clearRecentWebhookEvents,
  normalizeEvolutionUrl,
  WebhookEventItem,
} from "../lib/whatsappService";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { triggerEmail, sendTrialExpiredCheckoutEmail } from "../lib/emailService";
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
import { GestaoEsteiraTarefas } from "../components/GestaoEsteiraTarefas";
import { ProfissionalEsteiraTarefas } from "../components/ProfissionalEsteiraTarefas";
import { GestaoBlogView } from "../components/GestaoBlogView";
import { ProfissionalBlogView } from "../components/ProfissionalBlogView";
import { NotificationRulesManager } from "../components/NotificationRulesManager";
import { PatientNotificationModal } from "../components/PatientNotificationModal";
import { RedeProfissionalView } from "../components/RedeProfissionalView";

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

export function parseDateSafely(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? new Date() : val;
  }
  if (typeof val?.toDate === "function") {
    try {
      const d = val.toDate();
      if (d instanceof Date && !isNaN(d.getTime())) return d;
    } catch (e) {}
  }
  if (typeof val?.toMillis === "function") {
    try {
      const ms = val.toMillis();
      if (typeof ms === "number" && !isNaN(ms)) return new Date(ms);
    } catch (e) {}
  }
  if (typeof val === "object") {
    if (typeof val.seconds === "number" && !isNaN(val.seconds)) {
      return new Date(val.seconds * 1000);
    }
    if (typeof val._seconds === "number" && !isNaN(val._seconds)) {
      return new Date(val._seconds * 1000);
    }
  }
  if (typeof val === "number" && !isNaN(val)) {
    return new Date(val > 1e11 ? val : val * 1000);
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(trimmed)) {
      const parts = trimmed.split(/[\/\-]/);
      return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split("-");
      return new Date(Number(y), Number(m) - 1, Number(d));
    }
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

export function formatDateSafely(val: any, fallback = "-"): string {
  if (!val) return fallback;
  try {
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [y, m, d] = trimmed.split("-");
        return `${d}/${m}/${y}`;
      }
      if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(trimmed)) {
        return trimmed.replace(/-/g, "/");
      }
      if (trimmed.includes("T")) {
        const parts = trimmed.split("T")[0].split("-");
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }
    }
    const d = parseDateSafely(val);
    if (isNaN(d.getTime())) return fallback;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return fallback;
  }
}

export function formatDateTimeSafely(val: any, fallback = "-"): string {
  if (!val) return fallback;
  try {
    const d = parseDateSafely(val);
    if (isNaN(d.getTime())) return fallback;
    const dateStr = formatDateSafely(val, fallback);
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    if (
      (hours === "00" && minutes === "00") ||
      (typeof val === "string" && !val.includes("T") && !val.includes(":"))
    ) {
      return dateStr;
    }
    return `${dateStr} às ${hours}:${minutes}`;
  } catch (e) {
    return fallback;
  }
}

export function getTimestampMillis(val: any): number {
  if (!val) return 0;
  if (typeof val?.toMillis === "function") {
    try {
      const ms = val.toMillis();
      if (typeof ms === "number" && !isNaN(ms)) return ms;
    } catch (e) {}
  }
  if (typeof val?.toDate === "function") {
    try {
      const d = val.toDate();
      if (d instanceof Date && !isNaN(d.getTime())) return d.getTime();
    } catch (e) {}
  }
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? 0 : val.getTime();
  }
  if (typeof val === "object") {
    if (typeof val.seconds === "number" && !isNaN(val.seconds)) {
      return val.seconds * 1000 + (typeof val.nanoseconds === "number" ? Math.floor(val.nanoseconds / 1000000) : 0);
    }
    if (typeof val._seconds === "number" && !isNaN(val._seconds)) {
      return val._seconds * 1000;
    }
  }
  if (typeof val === "number" && !isNaN(val)) {
    return val > 1e11 ? val : val * 1000;
  }
  if (typeof val === "string") {
    const d = parseDateSafely(val);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }
  return 0;
}

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

export function getPatientFlowDetails(card: any) {
  if (!card) {
    return {
      isQuestionarioDone: false,
      isPropostaEnviada: false,
      propostaAceita: false,
      propostaRevisao: false,
      isAceiteOuRevisaoDone: false,
      isAtribuido: false,
      isAtribuicaoAceita: false,
      isAtribuicaoDevolvida: false,
      isAtendimentoIniciado: false,
      activeStep: 1,
    };
  }

  const isQuestionarioDone = true;

  const propostaRevisao = card.propostaStatus === "Paciente solicita revisão da proposta";
  const propostaAceita = !propostaRevisao && card.propostaStatus === "Proposta aceita pelo paciente";
  const isAceiteOuRevisaoDone = propostaAceita || propostaRevisao;

  // Se o paciente solicitou revisão, a proposta precisa ser re-elaborada e reenviada
  const isPropostaEnviada =
    !propostaRevisao &&
    (card.propostaEnviada === true ||
      !!card.propostaEnviadaEm ||
      propostaAceita ||
      card.status === "Aprovado" ||
      card.status === "Em Atendimento");

  const isAtribuido = !propostaRevisao && !!(card.profissionalId || card.profissionalUid);

  const isAtribuicaoAceita = isAtribuido && card.atribuicaoStatus === "Aceito";
  const isAtribuicaoDevolvida =
    isAtribuido &&
    (card.atribuicaoStatus === "Devolvido" ||
      card.atribuicaoStatus === "Rejeitado");

  const isAtendimentoIniciado =
    isAtribuido &&
    isAtribuicaoAceita &&
    !isAtribuicaoDevolvida &&
    (card.contatoEnviado === true ||
      card.status === "Em Atendimento" ||
      !!card.contatoEnviadoEm);

  let activeStep = 1;
  if (propostaRevisao) {
    // Quando o paciente solicita revisão da proposta, o fluxo é reiniciado e retornado para Etapa 1 (Questionário/Triagem)
    activeStep = 1;
  } else if (isAtendimentoIniciado) {
    activeStep = 6;
  } else if (isAtribuicaoDevolvida) {
    activeStep = 5;
  } else if (isAtribuicaoAceita) {
    activeStep = 6;
  } else if (isAtribuido) {
    activeStep = 5;
  } else if (propostaAceita) {
    activeStep = 4;
  } else if (isPropostaEnviada) {
    activeStep = 3;
  } else {
    activeStep = 1;
  }

  return {
    isQuestionarioDone,
    isPropostaEnviada,
    propostaAceita,
    propostaRevisao,
    isAceiteOuRevisaoDone,
    isAtribuido,
    isAtribuicaoAceita,
    isAtribuicaoDevolvida,
    isAtendimentoIniciado,
    activeStep,
  };
}

export function isCardInStandby(card: any): boolean {
  if (!card) return false;
  const s = String(card.status || "").toLowerCase().trim();
  const si = String(card.statusInativacao || "").toLowerCase().trim();
  const at = typeof card.ativo === "string" ? card.ativo.toLowerCase().trim() : "";
  return s === "standby" || s === "stand-by" || si === "standby" || si === "stand-by" || at === "standby";
}

export function buildCaseSummaryText(card: any) {
  if (!card) return "";
  const nome = card.nome || card.nomeCompleto || "Paciente";
  const genero = card.genero || card.identidadeGenero || "Não informado";

  let idadeStr = "Não informada";
  if (card.idade) {
    idadeStr = `${card.idade} anos`;
  } else if (card.dataNascimento) {
    try {
      let dob: Date;
      if (card.dataNascimento.includes("/")) {
        const p = card.dataNascimento.split("/");
        dob = new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
      } else {
        dob = new Date(card.dataNascimento);
      }
      if (!isNaN(dob.getTime())) {
        const diff = Date.now() - dob.getTime();
        const ageDate = new Date(diff);
        const calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);
        idadeStr = `${calculatedAge} anos`;
      } else {
        idadeStr = card.dataNascimento;
      }
    } catch {
      idadeStr = card.dataNascimento;
    }
  }

  const queixa =
    card.motivo ||
    card.queixaPrincipal ||
    card.observacoes ||
    card.necessidadesDescricao ||
    "Não informada";

  let periodosStr = "Não informado";
  if (Array.isArray(card.melhoresPeriodos) && card.melhoresPeriodos.length > 0) {
    periodosStr = card.melhoresPeriodos.join(", ");
  } else if (typeof card.melhoresPeriodos === "string" && card.melhoresPeriodos.trim()) {
    periodosStr = card.melhoresPeriodos.trim();
  }

  const valor = card.valorSessao || card.valorProposto || "A combinar";
  const frequencia = card.frequenciaSessoes || card.frequenciaProposta || "Semanal";
  const estadoCivilStr = card.estadoCivil ? `\n• Estado Civil: ${card.estadoCivil}` : "";
  const filhosStr = (card.temFilhos || card.filhos)
    ? `\n• Filhos: ${card.temFilhos || card.filhos}${card.faixaEtariaFilhos && card.faixaEtariaFilhos !== "Não se aplica (sem filhos)" ? ` (${card.faixaEtariaFilhos})` : ""}${card.filhosMoramJunto && card.filhosMoramJunto !== "Não se aplica (sem filhos)" ? ` - Residência: ${card.filhosMoramJunto}` : ""}`
    : "";

  return `📋 RESUMO DO CASO PARA ATENDIMENTO - PROJETO ACOLHEMENTE

• Paciente: ${nome}
• Gênero: ${genero}
• Idade: ${idadeStr}${estadoCivilStr}${filhosStr}
• Queixa / Motivo: ${queixa}
• Melhores Períodos (Online): ${periodosStr}
• Valor Proposto: ${valor}
• Frequência Proposta: ${frequencia}

Para mais informações e aceite, acesse a ficha de bordo do paciente na plataforma.`;
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
    id: "Standby",
    label: "Standby",
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
    role: ["master", "triagem", "profissional"],
    tab: "pacientes",
  },
  {
    id: "Alta",
    label: "Alta / Finalizado",
    role: ["master", "triagem", "profissional"],
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
  title,
}: {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  maxLength?: number;
  title?: string;
}) => {
  const [localVal, setLocalVal] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setLocalVal(value || "");
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setLocalVal(newVal);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onChange(newVal);
    }, 400);
  };

  const handleBlur = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (localVal !== value) {
      onChange(localVal);
    }
  };

  return (
    <input
      ref={inputRef}
      type={type}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
      maxLength={maxLength}
      title={title}
      value={localVal}
      onChange={handleChange}
      onBlur={handleBlur}
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
  disabled,
  rows,
}: {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  rows?: number;
}) => {
  const [localVal, setLocalVal] = useState(value || "");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    if (document.activeElement !== textAreaRef.current) {
      setLocalVal(value || "");
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setLocalVal(newVal);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onChange(newVal);
    }, 400);
  };

  const handleBlur = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (localVal !== value) {
      onChange(localVal);
    }
  };

  return (
    <textarea
      ref={textAreaRef}
      placeholder={placeholder}
      className={className}
      maxLength={maxLength}
      disabled={disabled}
      rows={rows}
      value={localVal}
      onChange={handleChange}
      onBlur={handleBlur}
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
  type = "text",
}: {
  label: string;
  value: any;
  field: string;
  onChange: (f: string, v: any) => void;
  isEditing: boolean;
  type?: string;
}) => {
  let formattedDisplay = value || "-";
  if (
    (type === "date" ||
      field.toLowerCase().includes("data") ||
      field.toLowerCase().includes("nascimento") ||
      label.toLowerCase().includes("data") ||
      label.toLowerCase().includes("nascimento")) &&
    value
  ) {
    formattedDisplay = formatDateSafely(value, "-");
  }

  const strValue =
    type === "date" && value
      ? String(value).substring(0, 10)
      : value != null
        ? String(value)
        : "";

  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="block text-[10px] font-bold uppercase text-forest/70 tracking-wider truncate">
        {label}
      </span>
      {isEditing ? (
        <DebouncedInput
          type={type}
          value={strValue}
          onChange={(val) => onChange(field, val)}
          className="text-xs sm:text-sm font-semibold text-forest border border-emerald-500/80 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 bg-emerald-50/50 rounded-lg px-2.5 py-1.5 w-full focus:outline-none transition-all shadow-2xs"
        />
      ) : (
        <span className="text-xs sm:text-sm font-semibold text-forest break-words min-h-[1.5rem] flex items-center">
          {formattedDisplay}
        </span>
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
      | "profissional"
      | "blog",
  ) => void;
}) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeRoleView, setActiveRoleView] = useState<Role | null>(null);
  const [loadingObj, setLoadingObj] = useState(true);

  const currentRole = activeRoleView || profile?.role || "profissional";
  const isMasterOrTriagem = currentRole === "master" || currentRole === "triagem";
  const modifiedProfile = profile ? { ...profile, role: currentRole } : null;

  const getDashboardBreadcrumbs = () => {
    const roleName = currentRole === "master" ? "Gestão" : currentRole === "triagem" ? "Equipe de Triagem" : (profile?.profissao ? `${profile.profissao} Parceiro(a)` : "Profissional Parceiro");
    const tabNames: Record<string, string> = {
      estatisticas: "Controle",
      kanban: "Triagem & Acolhimentos",
      pacientesAcolhidos: "Gestão de Pacientes",
      doacoes: "Apoio Solidário & Doações",
      profissionais: "Profissionais Parceiros",
      empresas: "Empresas Parceiras",
      tarefas: "Tarefas & Pendências",
      acessos: "Níveis de Acesso",
      eventos: "Gestão de Eventos",
      servicos: "Parcerias de Serviços",
      gestaoArtigos: "Artigos & Blog",
      artigosProfissional: "Meus Artigos",
      compliance: "Compliance Legal & Termos",
      backup: "Backup & Restauração",
      pacientes: "Meus Pacientes Clínicos",
      tarefasProfissional: "Minhas Pendências",
      perfil: "Configurações de Perfil",
      pagamentosProfissional: "Gerenciar Meus Pagamentos",
      redeProfissional: "Rede de Conexão",
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
    | "pagamentosProfissional"
    | "eventos"
    | "servicos"
    | "meusServicos"
    | "compliance"
    | "backup"
    | "notificacoes"
    | "gestaoArtigos"
    | "artigosProfissional"
    | "redeProfissional"
  >("kanban");

  // Search
  const [searchQuery, setSearchQuery] = useState("");
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
  const [notificarInitialMode, setNotificarInitialMode] = useState<"templates" | "custom">("templates");
  const [notificarInitialTemplateId, setNotificarInitialTemplateId] = useState<string>("proposta");
  const [showContratoModal, setShowContratoModal] = useState(false);
  const [showDesligamentoModal, setShowDesligamentoModal] = useState(false);
  const [desligamentoMotivo, setDesligamentoMotivo] = useState("");
  const [desligamentoDetalhes, setDesligamentoDetalhes] = useState("");
  const [showNewProfissionalModal, setShowNewProfissionalModal] =
    useState(false);
  const [newProfName, setNewProfName] = useState("");
  const [newProfEmail, setNewProfEmail] = useState("");
  const [newProfPassword, setNewProfPassword] = useState("");
  const [newProfRole, setNewProfRole] = useState<Role>("profissional");
  const [useGoogleLogin, setUseGoogleLogin] = useState(false);
  const [leadIdToConvert, setLeadIdToConvert] = useState<string | null>(null);
  const [isEditingCard, setIsEditingCard] = useState(false);
  const [showJourneyMobileDetails, setShowJourneyMobileDetails] = useState(false);
  const [subscriptionBannerState, setSubscriptionBannerState] = useState<"expanded" | "minimized" | "closed">("expanded");

  // Frequency modal state and handler
  const [showFreqModal, setShowFreqModal] = useState(false);
  const [freqModalTargetCard, setFreqModalTargetCard] = useState<Acolhimento | null>(null);
  const [freqModalValue, setFreqModalValue] = useState("");
  const [freqModalMotivo, setFreqModalMotivo] = useState("");

  // Photo Crop Modal State & Handlers
  const [photoCropModalOpen, setPhotoCropModalOpen] = useState(false);
  const [rawPhotoToCrop, setRawPhotoToCrop] = useState<string>("");
  const [isAutoCroppingPhoto, setIsAutoCroppingPhoto] = useState(false);

  const handlePhotoFileSelected = async (file: File) => {
    if (!file) return;
    setIsAutoCroppingPhoto(true);
    try {
      const rawDataUrl = await readFileAsDataURL(file);
      setRawPhotoToCrop(rawDataUrl);
      setPhotoCropModalOpen(true);
    } catch (err) {
      console.error("Erro ao carregar arquivo de foto:", err);
      showToast("Erro ao processar a imagem selecionada.", "error");
    } finally {
      setIsAutoCroppingPhoto(false);
    }
  };

  const handleAutoCenterCurrentPhoto = async () => {
    if (!profile?.photoUrl) return;
    setIsAutoCroppingPhoto(true);
    try {
      const { dataUrl, detected } = await autoCropProfileImage(profile.photoUrl);
      setProfile((prev: any) => ({ ...prev, photoUrl: dataUrl }));
      showToast(
        detected
          ? "Rosto detectado e perfeitamente centralizado no círculo com sucesso!"
          : "Foto centralizada e otimizada no círculo com sucesso!",
        "success"
      );
    } catch (err) {
      console.error("Erro ao auto-centralizar foto atual:", err);
      // Abre o modal interativo como fallback
      setRawPhotoToCrop(profile.photoUrl);
      setPhotoCropModalOpen(true);
    } finally {
      setIsAutoCroppingPhoto(false);
    }
  };

  // Aumentar Horas Disponiveis state & handler
  const [showAumentarHorasModal, setShowAumentarHorasModal] = useState(false);
  const [selectedNovaHora, setSelectedNovaHora] = useState("");
  const [customNovaHora, setCustomNovaHora] = useState("");

  const handleSaveAumentarHoras = async () => {
    const rawHora = customNovaHora.trim() ? customNovaHora.trim() : selectedNovaHora.trim();
    if (!rawHora) {
      showToast("Por favor, selecione ou informe a nova quantidade de horas disponíveis.", "error");
      return;
    }
    const horaToSave = normalizeHorasDisponiveis(rawHora);

    try {
      await handleUpdateSelfProfile({ horasDisponiveis: horaToSave });
      showToast("Horas disponíveis atualizadas com sucesso!", "success");
      setShowAumentarHorasModal(false);
      setCustomNovaHora("");
    } catch (err) {
      console.error("Erro ao atualizar horas disponíveis:", err);
      showToast("Erro ao salvar atualização de horas.", "error");
    }
  };

  const handleSaveFrequenciaModal = async () => {
    if (!freqModalTargetCard) return;
    if (!freqModalValue.trim()) {
      showToast("Por favor, informe ou selecione a frequência de sessões.", "error");
      return;
    }
    const isFirstTime =
      !freqModalTargetCard.frequenciaSessoes ||
      !freqModalTargetCard.frequenciaSessoes.trim();
    if (!isFirstTime && !freqModalMotivo.trim()) {
      showToast(
        "É obrigatório descrever o motivo/justificativa para alterar a frequência.",
        "error"
      );
      return;
    }

    try {
      const cardRef = doc(db, "acolhimentos", freqModalTargetCard.id);
      const updates: any = {
        frequenciaSessoes: freqModalValue.trim(),
        motivoFrequencia: freqModalMotivo.trim(),
        updatedAt: serverTimestamp(),
      };
      await updateDoc(cardRef, updates);
      showToast("Frequência de sessões registrada com sucesso!", "success");
      if (selectedCard && selectedCard.id === freqModalTargetCard.id) {
        setSelectedCard({ ...selectedCard, ...updates });
      }
      setAcolhimentos((prev) =>
        prev.map((a) => (a.id === freqModalTargetCard.id ? { ...a, ...updates } : a))
      );
      setShowFreqModal(false);
      setFreqModalTargetCard(null);
    } catch (err: any) {
      console.error("Erro ao atualizar frequência:", err);
      showToast("Erro ao salvar alteração de frequência.", "error");
    }
  };

  // Novo Paciente (Cadastro Manual na Triagem) State & Handlers
  const [showNovoPacienteModal, setShowNovoPacienteModal] = useState(false);
  const [isSubmittingNovoPaciente, setIsSubmittingNovoPaciente] = useState(false);
  const [novoPacienteTab, setNovoPacienteTab] = useState<"pessoais" | "financeiros" | "demografia" | "saude" | "triagem">("pessoais");
  const [novoPacienteForm, setNovoPacienteForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    cpf: "",
    dataNascimento: "",
    genero: "Feminino",
    deficiencia: "Não possuo",
    estadoCivil: "Solteiro(a)",
    temFilhos: "Não possui filhos",
    faixaEtariaFilhos: "Não se aplica (sem filhos)",
    filhosMoramJunto: "Não se aplica (sem filhos)",
    tratamentoPara: "Mim",
    idadeTratamento: "Adulto",
    responsavelNome: "",
    responsavelCpf: "",
    comoConheceu: "Indicação de profissional",
    viaAcesso: "Particular",
    empresa: "",
    fonteRenda: "Emprego formal (CLT/servidor público)",
    faixaSalarial: "Até 1 Salário Mínimo (até R$ 1.518,00)",
    dependentes: "1 pessoa (mora sozinho)",
    planoSaude: "Não, utilizo apenas o SUS",
    escolaridade: "Médio Completo",
    moradia: "Próprio e quitado",
    comodos: "1 a 3 cômodos",
    internet: "Acesso fixo residencial",
    dispositivo: "Sim (Celular/PC c/ câmera)",
    terapiaAnterior: "Não",
    motivo: "Ansiedade ou estresse excessivo",
    queixaDetalhes: "",
    melhoresPeriodos: ["Manhã", "Tarde"] as string[],
    observacoesTriagem: "",
  });

  const handleResetNovoPacienteForm = () => {
    setNovoPacienteForm({
      nome: "",
      email: "",
      telefone: "",
      cpf: "",
      dataNascimento: "",
      genero: "Feminino",
      deficiencia: "Não possuo",
      estadoCivil: "Solteiro(a)",
      temFilhos: "Não possui filhos",
      faixaEtariaFilhos: "Não se aplica (sem filhos)",
      filhosMoramJunto: "Não se aplica (sem filhos)",
      tratamentoPara: "Mim",
      idadeTratamento: "Adulto",
      responsavelNome: "",
      responsavelCpf: "",
      comoConheceu: "Indicação de profissional",
      viaAcesso: "Particular",
      empresa: "",
      fonteRenda: "Emprego formal (CLT/servidor público)",
      faixaSalarial: "Até 1 Salário Mínimo (até R$ 1.518,00)",
      dependentes: "1 pessoa (mora sozinho)",
      planoSaude: "Não, utilizo apenas o SUS",
      escolaridade: "Médio Completo",
      moradia: "Próprio e quitado",
      comodos: "1 a 3 cômodos",
      internet: "Acesso fixo residencial",
      dispositivo: "Sim (Celular/PC c/ câmera)",
      terapiaAnterior: "Não",
      motivo: "Ansiedade ou estresse excessivo",
      queixaDetalhes: "",
      melhoresPeriodos: ["Manhã", "Tarde"],
      observacoesTriagem: "",
    });
    setNovoPacienteTab("pessoais");
  };

  const handleSaveNovoPaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoPacienteForm.nome.trim()) {
      showToast("Por favor, preencha o Nome Completo do paciente.", "error");
      setNovoPacienteTab("pessoais");
      return;
    }
    if (!novoPacienteForm.email.trim() || !novoPacienteForm.email.includes("@")) {
      showToast("Por favor, informe um E-mail válido de contato.", "error");
      setNovoPacienteTab("pessoais");
      return;
    }
    if (!novoPacienteForm.telefone.trim()) {
      showToast("Por favor, informe o Telefone / WhatsApp do paciente.", "error");
      setNovoPacienteTab("pessoais");
      return;
    }

    setIsSubmittingNovoPaciente(true);

    try {
      const cleanEmail = novoPacienteForm.email.trim().toLowerCase();
      const q = query(collection(db, "acolhimentos"), where("email", "==", cleanEmail));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        showToast("Atenção: Este e-mail já possui cadastro na triagem.", "error");
        setIsSubmittingNovoPaciente(false);
        return;
      }

      const fullMotivo = novoPacienteForm.queixaDetalhes.trim()
        ? `${novoPacienteForm.motivo} - Detalhes: ${novoPacienteForm.queixaDetalhes.trim()}`
        : novoPacienteForm.motivo;

      const notifMsg = novoPacienteForm.observacoesTriagem.trim()
        ? `[Cadastro Manual Triagem]: ${novoPacienteForm.observacoesTriagem.trim()}`
        : `Novo paciente cadastrado manualmente pela Equipe de Triagem (${profile?.name || "Triagem"}).`;

      await addDoc(collection(db, "acolhimentos"), {
        nome: novoPacienteForm.nome.trim(),
        email: cleanEmail,
        telefone: novoPacienteForm.telefone.trim(),
        cpf: novoPacienteForm.cpf.trim(),
        dataNascimento: novoPacienteForm.dataNascimento,
        genero: novoPacienteForm.genero,
        deficiencia: novoPacienteForm.deficiencia,
        estadoCivil: novoPacienteForm.estadoCivil,
        temFilhos: novoPacienteForm.temFilhos,
        faixaEtariaFilhos: novoPacienteForm.temFilhos === "Não possui filhos" ? "Não se aplica (sem filhos)" : novoPacienteForm.faixaEtariaFilhos,
        filhosMoramJunto: novoPacienteForm.temFilhos === "Não possui filhos" ? "Não se aplica (sem filhos)" : novoPacienteForm.filhosMoramJunto,
        tratamentoPara: novoPacienteForm.tratamentoPara,
        idadeTratamento: novoPacienteForm.idadeTratamento,
        responsavelNome: novoPacienteForm.responsavelNome.trim(),
        responsavelCpf: novoPacienteForm.responsavelCpf.trim(),
        comoConheceu: novoPacienteForm.comoConheceu,
        viaAcesso: novoPacienteForm.viaAcesso,
        empresa: novoPacienteForm.empresa.trim(),
        fonteRenda: novoPacienteForm.fonteRenda,
        faixaSalarial: novoPacienteForm.faixaSalarial,
        dependentes: novoPacienteForm.dependentes,
        planoSaude: novoPacienteForm.planoSaude,
        escolaridade: novoPacienteForm.escolaridade,
        moradia: novoPacienteForm.moradia,
        comodos: novoPacienteForm.comodos,
        internet: novoPacienteForm.internet,
        dispositivo: novoPacienteForm.dispositivo,
        terapiaAnterior: novoPacienteForm.terapiaAnterior,
        melhoresPeriodos: novoPacienteForm.melhoresPeriodos,
        motivo: fullMotivo,
        status: "Aguardando Avaliação",
        notificacao: notifMsg,
        createdAt: serverTimestamp(),
      });

      // Email welcome trigger
      try {
        await sendPatientRegistrationEmail(novoPacienteForm.nome.trim(), cleanEmail);
      } catch (emailErr) {
        console.warn("Falha ao enviar e-mail automático de boas-vindas:", emailErr);
      }

      // Webhook trigger
      try {
        await sendWebhookNotification({
          event: "novo_paciente_manual",
          recipientEmail: cleanEmail,
          recipientName: novoPacienteForm.nome.trim(),
          title: "Novo Paciente Cadastrado na Triagem",
          message: `O paciente ${novoPacienteForm.nome.trim()} foi cadastrado manualmente na Triagem.`,
          data: {
            nome: novoPacienteForm.nome.trim(),
            email: cleanEmail,
            telefone: novoPacienteForm.telefone.trim(),
            cadastradoPor: profile?.name || "Triagem",
          },
        });
      } catch (whErr) {
        console.warn("Erro ao notificar webhook:", whErr);
      }

      showToast("Paciente cadastrado com sucesso na Triagem!", "success");
      setShowNovoPacienteModal(false);
      handleResetNovoPacienteForm();
    } catch (err: any) {
      console.error("Erro ao cadastrar paciente:", err);
      showToast("Erro ao cadastrar paciente: " + (err?.message || String(err)), "error");
    } finally {
      setIsSubmittingNovoPaciente(false);
    }
  };

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
      id: "resumo-caso",
      name: "Resumo do Caso (Para Profissional)",
      msg: "📋 RESUMO DO CASO PARA ATENDIMENTO - PROJETO ACOLHEMENTE\n\n• Paciente: [NOME]\n• Gênero: [GENERO]\n• Idade: [IDADE]\n• Queixa / Motivo: [MOTIVO]\n• Melhores Períodos (Online): [MELHORES_PERIODOS]\n• Valor Proposto: [VALOR_SESSAO]\n• Frequência Proposta: [FREQUENCIA]\n\nPara mais informações e aceite, acesse a ficha de bordo do paciente na plataforma.",
    },
    {
      id: "boas-vindas-atribuicao",
      name: "Boas Vindas (Após Atribuição)",
      msg: "Olá [NOME]! Seja muito bem-vindo(a) ao Projeto AcolheMente Saúde.\n\nEstamos felizes em informar que o seu atendimento foi atribuído ao profissional [PROFISSIONAL_NOME] (CRP: [PROFISSIONAL_CRP]). Conheça mais sobre o perfil em: [LINK_PERFIL_PROFISSIONAL]\n\nO valor enquadrado para as suas sessões será de [VALOR_SESSAO] com frequência [FREQUENCIA].\n\nObservação: O valor é referente a uma sessão de aproximadamente 45 minutos e que por mês, o valor médio será de [VALOR_MENSAL].\n\nLembramos as regras básicas do nosso acompanhamento:\n- As sessões ocorrerão de forma regular.\n- Cancelamentos ou reagendamentos devem ser informados com no mínimo 24h de antecedência para evitar cobranças.\n\nNo próximo passo, enviaremos o link do seu contrato, onde essas regras estarão detalhadas e deverão ser lidas e assinadas digitalmente.\n\nQualquer dúvida, estamos à disposição para te ajudar em sua jornada de autoconhecimento!",
    },
    {
      id: "proposta",
      name: "Proposta de Atendimento",
      msg: "Olá [NOME]! Segue a proposta do seu atendimento no Projeto AcolheMente Saúde:\n\n• Valor por Sessão: [VALOR_SESSAO]\n• Frequência: [FREQUENCIA]\n• Estimativa Mensal Aprox.: [VALOR_MENSAL]\n\n(Lembrando que o valor da proposta é referente a cada sessão individual de ~45min, e a estimativa mensal varia de acordo com a frequência).\n\nPor favor, acesse o link abaixo para conferir os detalhes e dar o seu aceite:\n[LINK_PROPOSTA]",
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
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [motivoCancelamentoInput, setMotivoCancelamentoInput] = useState("");

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

  // Gestao Treated Items State (Persisted in safeLocalStorage)
  const [treatedItemIds, setTreatedItemIds] = useState<Set<string>>(() => {
    try {
      const saved = safeLocalStorage.getItem("acolhe_treated_gestao_tasks");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
      return new Set();
    }
  });

  const handleToggleTreatedItem = (id: string) => {
    setTreatedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      safeLocalStorage.setItem(
        "acolhe_treated_gestao_tasks",
        JSON.stringify(Array.from(next)),
      );
      return next;
    });
  };

  const handleMarkAllEntityTreated = (itemIds: string[]) => {
    setTreatedItemIds((prev) => {
      const next = new Set(prev);
      itemIds.forEach((id) => next.add(id));
      safeLocalStorage.setItem(
        "acolhe_treated_gestao_tasks",
        JSON.stringify(Array.from(next)),
      );
      return next;
    });
    showToast("Demandas marcadas como tratadas com sucesso!", "success");
  };

  // Profissional Treated Items State (Persisted in safeLocalStorage)
  const [profTreatedItemIds, setProfTreatedItemIds] = useState<Set<string>>(() => {
    try {
      const saved = safeLocalStorage.getItem("acolhe_treated_prof_tasks");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
      return new Set();
    }
  });

  const handleToggleProfTreatedItem = (id: string) => {
    setProfTreatedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      safeLocalStorage.setItem(
        "acolhe_treated_prof_tasks",
        JSON.stringify(Array.from(next)),
      );
      return next;
    });
  };

  const handleMarkAllProfEntityTreated = (itemIds: string[]) => {
    setProfTreatedItemIds((prev) => {
      const next = new Set(prev);
      itemIds.forEach((id) => next.add(id));
      safeLocalStorage.setItem(
        "acolhe_treated_prof_tasks",
        JSON.stringify(Array.from(next)),
      );
      return next;
    });
    showToast("Demandas marcadas como tratadas com sucesso!", "success");
  };

  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [globalConfigs, setGlobalConfigs] = useState({
    telefoneSuporte: "",
    emailSuporte: "",
    fraseSuporte: "",
    faixasValores: ["", "", "", "", ""],
    faixasValoresCorporativo: ["", "", ""],
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
    carrosselProfissionaisAtivo: true,
    taxaAssociativaMensal: "29,90",
    stripeEnabled: true,
    stripePublicKey: "",
    stripeCheckoutUrl: "",
    webhookEmailEnabled: true,
    webhookEmailUrl: "",
    webhookEmailSecret: "",
    webhookEmailSender: "",
    whatsappEvolutionEnabled: false,
    whatsappEvolutionUrl: "",
    whatsappEvolutionApiKey: "",
    whatsappEvolutionInstance: "acolhemente",
    whatsappEvolutionAutoNotif: true,
  });

  // WhatsApp Evolution API State
  const [whatsappState, setWhatsappState] = useState<
    "open" | "connecting" | "close" | "checking" | "unknown"
  >("unknown");
  const [whatsappQrCode, setWhatsappQrCode] = useState<string | null>(null);
  const [whatsappPairingCode, setWhatsappPairingCode] = useState<string | null>(
    null
  );
  const [isLoadingWhatsappStatus, setIsLoadingWhatsappStatus] = useState(false);
  const [isConnectingWhatsapp, setIsConnectingWhatsapp] = useState(false);
  const [isConfiguringWebhook, setIsConfiguringWebhook] = useState(false);
  const [whatsappWebhookFeedback, setWhatsappWebhookFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [testWhatsappPhone, setTestWhatsappPhone] = useState("");
  const [testWhatsappMessage, setTestWhatsappMessage] = useState(
    "Olá! Esta é uma mensagem de teste enviada pelo Projeto AcolheMente Saúde via Evolution API."
  );
  const [isSendingTestWhatsapp, setIsSendingTestWhatsapp] = useState(false);
  const [testWhatsappResult, setTestWhatsappResult] = useState<{
    success: boolean;
    message: string;
    formattedNumber?: string;
  } | null>(null);
  const [webhookEventsList, setWebhookEventsList] = useState<WebhookEventItem[]>([]);
  const [isLoadingWebhookEvents, setIsLoadingWebhookEvents] = useState(false);
  const [showEvolutionGuide, setShowEvolutionGuide] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showEvolutionDiagnosticModal, setShowEvolutionDiagnosticModal] = useState(false);
  const [isCreatingWhatsappInstance, setIsCreatingWhatsappInstance] = useState(false);

  // Psychologist State
  const [meusPacientes, setMeusPacientes] = useState<Acolhimento[]>([]);
  const [patientSortOrder, setPatientSortOrder] = useState<"fifo" | "recent">("fifo");

  // Kanban Drag & Drop Visual State
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  // Email Testing State
  const [testEmailRecipient, setTestEmailRecipient] = useState("");
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{
    success: boolean;
    message: string;
    status?: number;
    data?: any;
    senderUsed?: string;
    recipientUsed?: string;
  } | null>(null);

  // Services registered by the currently selected professional (Admin / Triagem view)
  const [selectedProfServicos, setSelectedProfServicos] = useState<any[]>([]);

  const [pendingArtigosCount, setPendingArtigosCount] = useState(0);

  useEffect(() => {
    const q = query(
      collection(db, "artigos_blog"),
      where("status", "==", "pendente")
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setPendingArtigosCount(snapshot.docs.length);
      },
      (err) => {
        console.error("Erro ao carregar contagem de artigos pendentes:", err);
      }
    );
    return () => unsubscribe();
  }, []);

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
      if (property === "dataAdmissao" && value) {
        const parsedAdm = parseDateSafely(value);
        if (parsedAdm && !isNaN(parsedAdm.getTime())) {
          const newVenc = new Date(parsedAdm.getTime() + 7 * 86400000).toISOString();
          updates.vencimentoPagamento = newVenc;
          if (selectedProfissional) {
            setSelectedProfissional((prev: any) => ({
              ...prev,
              dataAdmissao: value,
              vencimentoPagamento: newVenc,
            }));
          }
        }
      }

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

  // Automated trial checkout link sender (7 days after dataAdmissao)
  const checkAndSendTrialCheckoutLinks = async (
    profsList: UserProfile[],
    configs: any,
  ) => {
    if (!profsList || profsList.length === 0) return;
    const now = new Date();
    const stripeUrl =
      configs?.stripeCheckoutUrl || "https://buy.stripe.com/acolhemente";

    for (const prof of profsList) {
      try {
        if (!prof || prof.role !== "profissional") continue;
        const isPago =
          prof.statusPagamento === "pago" || prof.statusPagamento === "paga";
        const isIsento =
          prof.statusPagamento === "isento" ||
          prof.isCortesia === true ||
          prof.statusAssociado === "isento";

        // Skip if already paid, exempt, or link already sent automatically
        if (isPago || isIsento || prof.checkoutTrial7DiasEnviado) continue;

        // Determine admission date (or fallback to createdAt)
        const admDateRaw = prof.dataAdmissao || prof.createdAt;
        if (!admDateRaw) continue;

        const admDate = parseDateSafely(admDateRaw);
        if (!admDate || isNaN(admDate.getTime())) continue;

        // 7 days after admission date
        const trialExpiration = new Date(
          admDate.getTime() + 7 * 24 * 60 * 60 * 1000,
        );

        // If 7 days have passed since admission date
        if (now.getTime() >= trialExpiration.getTime()) {
          const profId = prof.uid || prof.id;
          const profEmail = prof.email;
          const profName = prof.name || prof.nome || "Profissional";

          if (!profEmail || !profId) continue;

          console.log(
            `[TrialCheckoutAuto] 7 dias passados desde a admissão (${admDate.toLocaleDateString("pt-BR")}). Enviando link de checkout para ${profEmail}`,
          );

          const admFmt = formatDateSafely(admDate, "Admissão");
          await sendTrialExpiredCheckoutEmail(
            profName,
            profEmail,
            stripeUrl,
            admFmt,
          );

          // Update Firestore
          const userRef = doc(db, "users", profId);
          await updateDoc(userRef, {
            checkoutTrial7DiasEnviado: true,
            checkoutTrial7DiasEnviadoEm: new Date().toISOString(),
            notificacao: `Link de checkout para a taxa associativa enviado por e-mail 7 dias após a admissão realizada em ${admFmt}.`,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        console.error(
          "Erro ao verificar/enviar checkout de 7 dias pós-admissão:",
          err,
        );
      }
    }
  };

  useEffect(() => {
    if (profissionaisAtivos && profissionaisAtivos.length > 0) {
      checkAndSendTrialCheckoutLinks(profissionaisAtivos, globalConfigs);
    }
  }, [profissionaisAtivos, globalConfigs]);

  useEffect(() => {
    if (
      profile &&
      profile.role === "profissional" &&
      !profile.checkoutTrial7DiasEnviado
    ) {
      checkAndSendTrialCheckoutLinks([profile], globalConfigs);
    }
  }, [profile, globalConfigs]);

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
                  getTimestampMillis(a.createdAt) - getTimestampMillis(b.createdAt) || 0,
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
                  getTimestampMillis(a.createdAt) - getTimestampMillis(b.createdAt) || 0,
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
      const sanitizedConfigs = {
        ...globalConfigs,
        whatsappEvolutionUrl: normalizeEvolutionUrl(globalConfigs.whatsappEvolutionUrl),
        whatsappEvolutionApiKey: (globalConfigs.whatsappEvolutionApiKey || "").trim(),
        whatsappEvolutionInstance: (globalConfigs.whatsappEvolutionInstance || "acolhemente").trim(),
      };
      setGlobalConfigs(sanitizedConfigs);
      await setDoc(doc(db, "configuracoes", "master"), sanitizedConfigs, {
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

  const handleCheckWhatsappStatus = async () => {
    if (!globalConfigs.whatsappEvolutionUrl) {
      showToast("Informe a URL da Evolution API para verificar o status.", "error");
      return;
    }
    setIsLoadingWhatsappStatus(true);
    try {
      const res = await checkEvolutionStatus(globalConfigs);
      if (res.success && res.state) {
        setWhatsappState(res.state as any);
        if (res.state === "open") {
          showToast("WhatsApp Conectado e Ativo!", "success");
          setWhatsappQrCode(null);
        } else if (res.state === "connecting") {
          showToast("Instância aguardando conexão. Clique em Gerar QR Code.", "info");
        } else {
          showToast("Instância desconectada. Clique em Gerar QR Code para conectar.", "info");
        }
      } else {
        setWhatsappState("close");
        showToast(res.error || "Não foi possível obter status da instância.", "error");
      }
    } catch (e: any) {
      setWhatsappState("close");
      showToast(e.message || "Erro ao consultar status da Evolution API.", "error");
    } finally {
      setIsLoadingWhatsappStatus(false);
    }
  };

  const handleConnectWhatsapp = async () => {
    if (!globalConfigs.whatsappEvolutionUrl) {
      showToast("Informe a URL da Evolution API antes de conectar.", "error");
      return;
    }
    const currentApiKey = (globalConfigs.whatsappEvolutionApiKey || "").trim();
    if (currentApiKey.includes("${{") || currentApiKey.includes("secret(")) {
      showToast(
        "A Chave API informada é a fórmula do Railway '${{secret...}}'. No Railway, acesse seu serviço Evolution > Variables > clique no ícone de olho em AUTHENTICATION_API_KEY para copiar o valor real gerado.",
        "error"
      );
      return;
    }
    setIsConnectingWhatsapp(true);
    setWhatsappQrCode(null);
    setWhatsappPairingCode(null);
    try {
      const res = await connectEvolutionInstance(
        globalConfigs,
        `${window.location.origin}/api/whatsapp/webhook`
      );
      if (res.success) {
        if (res.state === "open") {
          setWhatsappState("open");
          setWhatsappQrCode(null);
          showToast("Esta instância já está conectada e ativa no WhatsApp!", "success");
        } else if (res.base64) {
          setWhatsappQrCode(res.base64);
          setWhatsappPairingCode(res.pairingCode || null);
          setWhatsappState("connecting");
          showToast("QR Code gerado! Aponte o WhatsApp do seu celular para conectar.", "success");
        } else {
          setWhatsappState("connecting");
          showToast("Instância iniciada. Aguarde alguns instantes e tente novamente.", "info");
        }
      } else {
        showToast(res.error || "Falha ao gerar QR Code na Evolution API.", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Erro ao conectar à Evolution API.", "error");
    } finally {
      setIsConnectingWhatsapp(false);
    }
  };

  const handleCreateWhatsappInstance = async () => {
    if (!globalConfigs.whatsappEvolutionUrl) {
      showToast("Informe a URL da Evolution API antes de criar a instância.", "error");
      return;
    }
    const currentApiKey = (globalConfigs.whatsappEvolutionApiKey || "").trim();
    if (currentApiKey.includes("${{") || currentApiKey.includes("secret(")) {
      showToast(
        "A Chave API informada é a fórmula do Railway '${{secret...}}'. Copie a chave real gerada no Railway.",
        "error"
      );
      return;
    }
    setIsCreatingWhatsappInstance(true);
    try {
      const res = await fetch("/api/whatsapp/evolution/create-instance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiUrl: globalConfigs.whatsappEvolutionUrl,
          apiKey: globalConfigs.whatsappEvolutionApiKey,
          instanceName: globalConfigs.whatsappEvolutionInstance || "acolhemente",
          webhookUrl: `${window.location.origin}/api/whatsapp/webhook`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Instância "${globalConfigs.whatsappEvolutionInstance || "acolhemente"}" criada com sucesso!`, "success");
        if (data.base64) {
          setWhatsappQrCode(data.base64);
          if (data.pairingCode) setWhatsappPairingCode(data.pairingCode);
          setWhatsappState("connecting");
        } else {
          handleConnectWhatsapp();
        }
      } else {
        if (data.error?.toLowerCase().includes("already in use")) {
          showToast("A instância já existe na Evolution API! Carregando QR Code...", "info");
          handleConnectWhatsapp();
        } else {
          showToast(data.error || "Erro ao criar instância na Evolution API.", "error");
        }
      }
    } catch (e: any) {
      showToast(e.message || "Falha ao criar instância.", "error");
    } finally {
      setIsCreatingWhatsappInstance(false);
    }
  };

  const handleConfigureWhatsappWebhook = async () => {
    if (!globalConfigs.whatsappEvolutionUrl) {
      showToast("Informe a URL da Evolution API.", "error");
      return;
    }
    setIsConfiguringWebhook(true);
    setWhatsappWebhookFeedback(null);
    try {
      const webhookUrl = `${window.location.origin}/api/whatsapp/webhook`;
      const res = await configureEvolutionWebhook(webhookUrl, globalConfigs);
      if (res.success) {
        setWhatsappWebhookFeedback({
          success: true,
          message: `Webhook configurado com sucesso! A Evolution API agora enviará eventos para ${webhookUrl}`,
        });
        showToast("Webhook da Evolution API registrado com sucesso!", "success");
        handleRefreshWebhookEvents();
      } else {
        setWhatsappWebhookFeedback({
          success: false,
          message: res.error || "Falha ao registrar webhook.",
        });
        showToast(res.error || "Erro ao registrar webhook na Evolution API.", "error");
      }
    } catch (e: any) {
      setWhatsappWebhookFeedback({
        success: false,
        message: e.message || "Erro inesperado ao configurar webhook.",
      });
      showToast(e.message || "Erro ao configurar webhook.", "error");
    } finally {
      setIsConfiguringWebhook(false);
    }
  };

  const handleDisconnectWhatsapp = async () => {
    if (!window.confirm("Deseja realmente desconectar este WhatsApp da Evolution API?")) {
      return;
    }
    try {
      const res = await disconnectEvolutionInstance(globalConfigs);
      if (res.success) {
        setWhatsappState("close");
        setWhatsappQrCode(null);
        setWhatsappPairingCode(null);
        showToast("WhatsApp desconectado com sucesso.", "success");
      } else {
        showToast(res.error || "Erro ao desconectar.", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Erro ao desconectar.", "error");
    }
  };

  const handleSendTestWhatsapp = async () => {
    if (!testWhatsappPhone || !testWhatsappMessage) {
      showToast("Informe o número de telefone e a mensagem de teste.", "error");
      return;
    }
    setIsSendingTestWhatsapp(true);
    setTestWhatsappResult(null);
    try {
      const res = await sendEvolutionMessage(
        testWhatsappPhone,
        testWhatsappMessage,
        globalConfigs
      );
      if (res.success) {
        setTestWhatsappResult({
          success: true,
          message: "Mensagem de WhatsApp enviada com sucesso!",
          formattedNumber: res.formattedNumber,
        });
        showToast("Mensagem de WhatsApp enviada com sucesso!", "success");
      } else {
        setTestWhatsappResult({
          success: false,
          message: res.error || "Falha ao enviar mensagem pelo WhatsApp.",
        });
        showToast(res.error || "Erro ao disparar WhatsApp.", "error");
      }
    } catch (e: any) {
      setTestWhatsappResult({
        success: false,
        message: e.message || "Erro inesperado ao disparar WhatsApp.",
      });
      showToast(e.message || "Erro inesperado.", "error");
    } finally {
      setIsSendingTestWhatsapp(false);
    }
  };

  const handleRefreshWebhookEvents = async () => {
    setIsLoadingWebhookEvents(true);
    try {
      const res = await fetchRecentWebhookEvents();
      if (res.success) {
        setWebhookEventsList(res.events || []);
      }
    } catch (e) {
      console.warn("Erro ao buscar eventos do webhook:", e);
    } finally {
      setIsLoadingWebhookEvents(false);
    }
  };

  const handleClearWebhookEvents = async () => {
    const ok = await clearRecentWebhookEvents();
    if (ok) {
      setWebhookEventsList([]);
      showToast("Histórico de eventos do webhook limpo.", "success");
    }
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
      if (newStatus === "Alta") {
        updates.ativo = false;
        updates.statusInativacao = "Desligado";
      } else if (newStatus === "Standby") {
        updates.ativo = true;
        updates.statusInativacao = "Standby";
      } else if (
        newStatus === "Aguardando Avaliação" ||
        newStatus === "Em Triagem" ||
        newStatus === "Aprovado" ||
        newStatus === "Em Atendimento"
      ) {
        updates.ativo = true;
        updates.statusInativacao = "Ativo";
      }

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

  const handleOpenPatientWhatsApp = (card: Acolhimento) => {
    if (currentRole === "profissional" && card.atribuicaoStatus !== "Aceito") {
      showToast(
        "Os dados de contato do paciente e o canal de WhatsApp só são liberados após o aceite formal do caso.",
        "error"
      );
      return;
    }

    const rawFirstName = (
      profile?.name ||
      profile?.nome ||
      user?.displayName ||
      "Profissional"
    )
      .trim()
      .split(" ")[0];
    const profFirstName = rawFirstName
      ? rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1)
      : "Profissional";
    const defaultMsg = `Olá, sou o ${profFirstName}, faço parte do Projeto Acolhemente.`;
    const rawPhone =
      card.telefone ||
      card.whatsapp ||
      (card as any).celular ||
      (card as any).telefoneContato ||
      "";
    const cleanPhone = rawPhone.replace(/\D/g, "");
    if (!cleanPhone) {
      showToast("O paciente não possui telefone/WhatsApp cadastrado.", "error");
      return;
    }
    const phoneWithCountry =
      cleanPhone.length >= 10 && !cleanPhone.startsWith("55")
        ? `55${cleanPhone}`
        : cleanPhone;
    window.open(
      `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(defaultMsg)}`,
      "_blank"
    );
  };

  const handleUpdateAcolhimentoProperty = async (
    id: string,
    property: string,
    value: any,
  ) => {
    try {
      // Permission check for updating session value (Triagem and Gestão/Master only)
      if ((property === "valorSessao" || property === "valorProposto") && currentRole !== "master" && currentRole !== "triagem") {
        showToast("Apenas usuários de Triagem e Gestão podem alterar o valor da sessão.", "error");
        return;
      }

      const currentPaciente = acolhimentos.find((a) => a.id === id);

      // Mandatory reason description check when changing frequency (only required on alterations, not initial setting)
      if (property === "frequenciaSessoes") {
        const currentFreq = currentPaciente?.frequenciaSessoes || "";
        const isFirstTime = !currentFreq || !currentFreq.trim();
        if (
          !isFirstTime &&
          value !== currentFreq &&
          (!currentPaciente?.motivoFrequencia || !currentPaciente.motivoFrequencia.trim())
        ) {
          showToast(
            "É obrigatório descrever o motivo ao alterar a frequência de sessões.",
            "error"
          );
          return;
        }
      }

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
          // Atribuído a alguém - permanece na Fila de Espera até aceite ou início de atendimento
          updates.status = currentPaciente?.status === "Em Atendimento" || currentPaciente?.status === "Alta" ? currentPaciente.status : "Aprovado";
          updates.atribuicaoStatus = "Pendente";
          const profObj =
            allUsers.find((u) => u.uid === value || u.id === value) ||
            profissionaisAtivos.find((p) => p.uid === value || p.id === value);
          const profName = profObj?.name || profObj?.email || "Parceiro";
          const profEmail = profObj?.email;

          const summaryText = buildCaseSummaryText({
            ...currentPaciente,
            profissionalId: value,
          });

          updates.notificacao = `${notifAnterior}[${nowStr}] Atribuído ao profissional ${profName}. Notificação automática com resumo enviada por e-mail.\n\n[Resumo Enviado]:\n${summaryText}`;

          if (profEmail) {
            sendWebhookNotification({
              event: "atribuicao_paciente_resumo",
              recipientEmail: profEmail,
              recipientName: profName,
              title: `Novo Caso Atribuído: ${currentPaciente?.nome || "Paciente"} - Projeto AcolheMente`,
              message: summaryText,
              data: {
                pacienteId: id,
                pacienteNome: currentPaciente?.nome || currentPaciente?.nomeCompleto || "",
                genero: currentPaciente?.genero || "",
                motivo: currentPaciente?.motivo || "",
                melhoresPeriodos: currentPaciente?.melhoresPeriodos || "",
                valorSessao: currentPaciente?.valorSessao || "",
                frequenciaSessoes: currentPaciente?.frequenciaSessoes || "",
                timestamp: new Date().toISOString(),
              },
            }).catch((err) =>
              console.error("Erro ao enviar email automatico do caso:", err)
            );
          }
        } else {
          // Desatribuído
          updates.status = "Aguardando Avaliação";
          updates.atribuicaoStatus = null;
          updates.notificacao = `${notifAnterior}[${nowStr}] Desatribuído do profissional pelo Gestor. Retornou à Triagem.`;
        }
      }

      updates.updatedAt = serverTimestamp();
      await updateDoc(doc(db, "acolhimentos", id), updates);
      if (property === "frequenciaSessoes") {
        showToast("Frequência de sessões salva com sucesso!", "success");
      }
      if (selectedCard && selectedCard.id === id) {
        setSelectedCard({ ...selectedCard, ...updates });
      }
      setAcolhimentos((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
      );
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar.");
    }
  };

  const handleReativarParaEmAnalise = async (cardOrId: any) => {
    const id = typeof cardOrId === "string" ? cardOrId : cardOrId?.id;
    if (!id) return;
    try {
      const currentPaciente = acolhimentos.find((a) => a.id === id);
      const notifAnterior = currentPaciente?.notificacao
        ? currentPaciente.notificacao + "\n\n"
        : "";
      const nowStr = new Date().toLocaleString("pt-BR");
      const authName = profile?.name || "Triador";

      const updates: any = {
        status: "Em Triagem", // "Em Análise"
        ativo: true,
        statusInativacao: "Ativo",
        statusUpdatedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        notificacao: `${notifAnterior}[${nowStr}] Paciente reativado do Standby e retornado para "Em Análise" por ${authName}.`,
      };

      await updateDoc(doc(db, "acolhimentos", id), updates);

      if (selectedCard && selectedCard.id === id) {
        setSelectedCard((prev: any) => (prev ? { ...prev, ...updates } : null));
      }
      setAcolhimentos((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
      );
      showToast("Paciente reativado com sucesso e retornado para Em Análise!", "success");
    } catch (err) {
      console.error("Erro ao reativar paciente para Em Análise:", err);
      showToast("Erro ao reativar paciente.", "error");
    }
  };

  const handleColocarEmStandby = async (cardOrId: any) => {
    const id = typeof cardOrId === "string" ? cardOrId : cardOrId?.id;
    if (!id) return;
    try {
      const currentPaciente = acolhimentos.find((a) => a.id === id);
      const notifAnterior = currentPaciente?.notificacao
        ? currentPaciente.notificacao + "\n\n"
        : "";
      const nowStr = new Date().toLocaleString("pt-BR");
      const authName = profile?.name || "Triador";

      const updates: any = {
        status: "Standby",
        ativo: true,
        statusInativacao: "Standby",
        statusUpdatedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        notificacao: `${notifAnterior}[${nowStr}] Paciente colocado em Standby na Triagem por ${authName}.`,
      };

      await updateDoc(doc(db, "acolhimentos", id), updates);

      if (selectedCard && selectedCard.id === id) {
        setSelectedCard((prev: any) => (prev ? { ...prev, ...updates } : null));
      }
      setAcolhimentos((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
      );
      showToast("Paciente movido para a etapa de Standby na Triagem.", "info");
    } catch (err) {
      console.error("Erro ao colocar paciente em Standby:", err);
      showToast("Erro ao colocar paciente em Standby.", "error");
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
      setProfissionaisAtivos((prev) =>
        prev.map((p) => (p.uid === profile.uid ? { ...p, ...cleanUpdates } : p)),
      );
      setSuccessMsg("Perfil profissional salvo com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar perfil.");
    }
  };

  const handleToggleCortesia = async (profUid: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      await updateDoc(doc(db, "users", profUid), {
        isCortesia: newStatus,
      });
      setProfissionaisAtivos((prev) =>
        prev.map((p) => (p.uid === profUid ? { ...p, isCortesia: newStatus } : p)),
      );
    } catch (err) {
      console.error("Erro ao atualizar status de cortesia:", err);
      alert("Erro ao alterar status de cortesia do profissional.");
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

      const nowAdmissao = new Date();
      const vencimentoPagamento = new Date(nowAdmissao.getTime() + 7 * 24 * 60 * 60 * 1000);
      const taxaAssociativaVal = globalConfigs.taxaAssociativaMensal || "29,90";

      // Cria o registro no Firestore usando a conexão principal db existente
      await setDoc(doc(db, "users", cred.user.uid), {
        name: newProfName,
        email: newProfEmail,
        role: newProfRole,
        requirePasswordChange: true,
        dataAdmissao: nowAdmissao.toISOString(),
        vencimentoPagamento: vencimentoPagamento.toISOString(),
        statusPagamento: "em_degustacao",
        taxaAssociativaMensal: taxaAssociativaVal,
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

      const dataAdmissaoFmt = nowAdmissao.toLocaleDateString("pt-BR");
      const vencimentoFmt = vencimentoPagamento.toLocaleDateString("pt-BR");

      const emailBodyProvider = useGoogleLogin
        ? `Sua conta e admissão foram aprovadas no Projeto AcolheMente em ${dataAdmissaoFmt}.\n\nComo você utiliza e-mail Google (Gmail), acesse a plataforma clicando no botão "Entrar com Conta Google".\n\n📌 PRAZO PARA 1º PAGAMENTO (7 DIAS): O seu primeiro pagamento da taxa associativa mensal (R$ ${taxaAssociativaVal}) vence em ${vencimentoFmt} (7 dias após a admissão). O pagamento pode ser realizado e gerenciado no seu painel em "Gerenciar Meus Pagamentos".`
        : `Sua conta e admissão foram aprovadas no Projeto AcolheMente em ${dataAdmissaoFmt}.\n\nLink de Acesso: ${window.location.origin}\nEmail: ${newProfEmail}\nSenha Provisória: ${newProfPassword}\n\n📌 PRAZO PARA 1º PAGAMENTO (7 DIAS): O seu primeiro pagamento da taxa associativa mensal (R$ ${taxaAssociativaVal}) vence em ${vencimentoFmt} (7 dias após a admissão). O pagamento pode ser realizado e gerenciado no seu painel no menu "Gerenciar Meus Pagamentos".\n\nPor favor, acesse o sistema e redefina sua senha no primeiro acesso.`;

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
        dateStr = formatDateSafely(lead.createdAt, "");
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
    return formatDateTimeSafely(timestamp, "");
  };

  const lowerQuery = searchQuery.toLowerCase();

  const filteredAcolhimentos = acolhimentos
    .filter(
      (a) =>
        !searchQuery ||
        a.nomeCivil?.toLowerCase().includes(lowerQuery) ||
        a.nome?.toLowerCase().includes(lowerQuery) ||
        a.nomeDesejado?.toLowerCase().includes(lowerQuery) ||
        a.motivo?.toLowerCase().includes(lowerQuery) ||
        a.telefone?.toLowerCase().includes(lowerQuery),
    )
    .sort((a, b) => {
      const timeA = getTimestampMillis(a.createdAt);
      const timeB = getTimestampMillis(b.createdAt);
      if (patientSortOrder === "recent") {
        return timeB - timeA;
      }
      return timeA - timeB;
    });

  const filteredMeusPacientes = meusPacientes
    .filter(
      (p) =>
        !searchQuery ||
        p.nomeCivil?.toLowerCase().includes(lowerQuery) ||
        p.nomeDesejado?.toLowerCase().includes(lowerQuery) ||
        p.telefone?.toLowerCase().includes(lowerQuery),
    )
    .sort((a, b) => {
      const timeA = getTimestampMillis(a.createdAt);
      const timeB = getTimestampMillis(b.createdAt);
      if (patientSortOrder === "recent") {
        return timeB - timeA;
      }
      return timeA - timeB;
    });

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
      return formatDateTimeSafely(ts, String(ts));
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

  const calculateUntreatedProfCount = () => {
    let count = 0;
    meusPacientes.forEach((p) => {
      const isPending = !p.atribuicaoStatus || p.atribuicaoStatus === "Pendente";
      if (isPending && !profTreatedItemIds.has(`prof-assignment-${p.id}`)) count++;
      if (!p.contratoAssinado && !profTreatedItemIds.has(`prof-contract-${p.id}`)) count++;
      if (
        (p.statusInativacao === "Solicitado" || p.statusInativacao === "Em Análise") &&
        !profTreatedItemIds.has(`prof-inactivation-${p.id}`)
      ) {
        count++;
      }
      if (p.notificacao && p.notificacao.trim()) {
        const blocks = p.notificacao.split(/\n+/).filter(Boolean);
        blocks.forEach((_b, idx) => {
          if (!profTreatedItemIds.has(`prof-notif-${p.id}-${idx}`)) count++;
        });
      }
    });

    if (profile) {
      if (!profile.photoUrl && !profTreatedItemIds.has("prof-profile-photo")) count++;
      if ((!profile.telefone || !profile.telefone.trim()) && !profTreatedItemIds.has("prof-profile-phone")) count++;
      if ((!profile.crp || !profile.crp.trim()) && !profTreatedItemIds.has("prof-profile-crp")) count++;
      if ((!profile.cpf || !profile.cpf.trim()) && !profTreatedItemIds.has("prof-profile-summary")) count++;
    }

    return count;
  };

  const pendingProfNotificationsCount = calculateUntreatedProfCount();

  const handleProfAcceptPaciente = async (paciente: Acolhimento) => {
    const notifAnterior = paciente.notificacao ? paciente.notificacao + "\n\n" : "";
    const nowStr = new Date().toLocaleString("pt-BR");
    const authName = profile?.name || "Parceiro";
    const updates = {
      atribuicaoStatus: "Aceito",
      notificacao: `${notifAnterior}[${nowStr}] Encaminhamento ACEITO pelo profissional ${authName} via esteira de alertas e pendências.`,
    };
    await updateDoc(doc(db, "acolhimentos", paciente.id), updates);
    showToast(`Encaminhamento de ${paciente.nomeDesejado || paciente.nomeCivil || paciente.nome || "paciente"} aceito com sucesso!`, "success");
  };

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

    const safeNotify = (
      title: string,
      options: NotificationOptions,
      onClick?: () => void,
    ) => {
      if (!canNotify) return;
      try {
        const notif = new window.Notification(title, options);
        if (onClick) {
          notif.onclick = () => {
            window.focus();
            onClick();
          };
        }
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
      const latestAcol = acolhimentos[acolhimentos.length - 1];
      const pName = latestAcol?.nomeDesejado || latestAcol?.nomeCivil || latestAcol?.nome || "Novo Paciente";
      safeNotify(
        "Novo Acolhimento na Triagem",
        {
          body: `${pName} solicitou acolhimento na plataforma (${latestAcol?.viaAcesso || "Particular"}). Clique para abrir a esteira de tarefas.`,
          tag: "acolhimento-novo",
        },
        () => {
          setActiveTab("tarefas");
          if (latestAcol) {
            setSelectedCard(latestAcol);
          }
        }
      );
    }
    if (
      prev.solicitacoes !== -1 &&
      solicitacoes.length > prev.solicitacoes &&
      isMasterOrTriagem
    ) {
      const latestSol = solicitacoes[solicitacoes.length - 1];
      safeNotify(
        "Apoio Solidário Solicitado",
        {
          body: `${latestSol?.nome || "Uma pessoa"} solicitou apoio solidário. Clique para visualizar.`,
          tag: "apoio-novo",
        },
        () => {
          setActiveTab("tarefas");
        }
      );
    }
    if (
      prev.profissionaisLeads !== -1 &&
      profissionaisLeads.length > prev.profissionaisLeads &&
      isMaster
    ) {
      const latestProf = profissionaisLeads[profissionaisLeads.length - 1];
      safeNotify(
        "Novo Profissional Parceiro",
        {
          body: `${latestProf?.nome || "Um profissional"} se cadastrou e aguarda validação. Clique para abrir ficha.`,
          tag: "prof-lead-novo",
        },
        () => {
          setActiveTab("tarefas");
          if (latestProf) {
            setSelectedProfissional(latestProf);
          }
        }
      );
    }
    if (
      prev.empresasLeads !== -1 &&
      empresasLeads.length > prev.empresasLeads &&
      isMaster
    ) {
      const latestEmp = empresasLeads[empresasLeads.length - 1];
      safeNotify(
        "Nova Empresa Parceira",
        {
          body: `A empresa ${latestEmp?.nomeEmpresa || latestEmp?.nome || "Nova Empresa"} cadastrou interesse. Clique para conferir.`,
          tag: "emp-lead-novo",
        },
        () => {
          setActiveTab("tarefas");
          if (latestEmp) {
            setSelectedEmpresa(latestEmp);
          }
        }
      );
    }
    if (
      prev.meusPacientes !== -1 &&
      meusPacientes.length > prev.meusPacientes &&
      isProf
    ) {
      const latestPatient = meusPacientes[meusPacientes.length - 1];
      const patName = latestPatient?.nomeDesejado || latestPatient?.nomeCivil || latestPatient?.nome || "Novo Paciente";
      safeNotify(
        "Novo Paciente Atribuído",
        {
          body: `Você recebeu o encaminhamento de ${patName} para atendimento. Clique para revisar ficha.`,
          tag: "prof-paciente-novo",
        },
        () => {
          setActiveTab("tarefasProfissional");
          if (latestPatient) {
            setSelectedCard(latestPatient);
          }
        }
      );
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
        </div>
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
    master: "Gestão",
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
    (a) =>
      a.notificacao &&
      a.status !== "Em Atendimento" &&
      a.status !== "Alta",
  ).length;
  const pendingPacientesCount = acolhimentos.filter(
    (a) =>
      a.notificacao &&
      (a.status === "Em Atendimento" || a.status === "Alta"),
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
      const freq = (a.frequenciaSessoes || "").toLowerCase();
      if (freq.includes("quinzenal") || freq.includes("2x/mês") || freq.includes("2x por mês")) return sum + 2;
      if (freq.includes("mensal") || freq.includes("1x/mês") || freq.includes("1x por mês")) return sum + 1;
      if (freq.includes("demanda")) return sum + 1;
      if (freq.includes("2x por semana") || freq.includes("2x/semana")) return sum + 8;
      if (freq.includes("3x por semana") || freq.includes("3x/semana")) return sum + 12;
      if (freq.includes("semanal") || freq.includes("4x/mês") || freq.includes("4x por mês")) return sum + 4;
      return sum + 4; // Padrão semanal (4h/mês = 1 sessão/semana)
    }, 0);
  };

  const normalizeHorasDisponiveis = (horasDisp?: string): string => {
    if (!horasDisp) return "";
    const trimmed = horasDisp.trim();
    if (trimmed === "1 a 3 horas/mês" || trimmed === "1 a 3") return "2 a 4 horas/mês";
    if (trimmed === "9 a 15 horas/mês" || trimmed === "9 a 15") return "10 a 16 horas/mês";
    if (
      trimmed === "2 a 4 horas/mês" ||
      trimmed === "4 a 8 horas/mês" ||
      trimmed === "10 a 16 horas/mês" ||
      trimmed === "16 a 20 horas/mês" ||
      trimmed === "Mais de 20 horas/mês"
    ) {
      return trimmed;
    }

    // Replace odd numbers with next even number (e.g., 1->2, 3->4, 5->6, 7->8, 9->10, 15->16)
    return trimmed.replace(/\b(\d+)\b/g, (_m, numStr) => {
      let num = parseInt(numStr, 10);
      if (num % 2 !== 0) {
        num += 1;
      }
      return num.toString();
    });
  };

  const parseMaxHorasDisponiveis = (horasDisp?: string) => {
    if (!horasDisp) return 0;
    const normalized = normalizeHorasDisponiveis(horasDisp);
    if (normalized.includes("2 a 4") || normalized.includes("1 a 3")) return 4;
    if (normalized.includes("4 a 8")) return 8;
    if (normalized.includes("10 a 16") || normalized.includes("9 a 15")) return 16;
    if (normalized.includes("16 a 20")) return 20;
    if (normalized.includes("Mais de 20")) return 24;
    const match = normalized.match(/\d+/);
    if (match) {
      let val = parseInt(match[0], 10);
      if (val % 2 !== 0) val += 1;
      return val;
    }
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

  const calculateUntreatedGestaoCount = () => {
    let count = 0;
    // 1. Pacientes / Acolhimentos
    acolhimentos.forEach((a) => {
      if (!a.status || a.status === "Aguardando Avaliação") {
        if (!treatedItemIds.has(`acolhimento-novo-${a.id}`)) count++;
      }
      if (a.propostaStatus === "Paciente solicita revisão da proposta") {
        if (!treatedItemIds.has(`acolhimento-revisao-proposta-${a.id}`)) count++;
      }
      if (
        (a.propostaStatus === "Proposta aceita pelo paciente" || a.status === "Aprovado") &&
        !a.profissionalId
      ) {
        if (!treatedItemIds.has(`acolhimento-sem-profissional-${a.id}`)) count++;
      }
      if (
        a.atribuicaoStatus === "Devolvido" ||
        a.atribuicaoStatus === "Rejeitado" ||
        a.atribuicaoStatus === "Recusado"
      ) {
        if (!treatedItemIds.has(`acolhimento-devolvido-${a.id}`)) count++;
      }
      if (
        a.statusInativacao === "Solicitado" ||
        a.statusInativacao === "Em Análise"
      ) {
        if (!treatedItemIds.has(`acolhimento-inativacao-${a.id}`)) count++;
      }
      if (a.notificacao && a.notificacao.trim()) {
        const blocks = a.notificacao.split(/\n+/).filter(Boolean);
        blocks.forEach((_b: string, idx: number) => {
          if (!treatedItemIds.has(`acolhimento-notif-${a.id}-${idx}`)) count++;
        });
      }
    });

    // 2. Profissionais
    profissionaisLeads.forEach((p) => {
      if (!p.status || p.status === "Aguardando Entrevista" || p.status === "Pendente") {
        if (!treatedItemIds.has(`prof-lead-novo-${p.id}`)) count++;
      }
      if (p.notificacao && p.notificacao.trim()) {
        if (!treatedItemIds.has(`prof-lead-notif-${p.id}`)) count++;
      }
    });

    profissionaisAtivos.forEach((p) => {
      const isAtCap = profissionaisAtCapacity.some(
        (c) => c.id === p.id || c.uid === p.uid || c.id === p.uid,
      );
      if (isAtCap && !treatedItemIds.has(`prof-cap-max-${p.id || p.uid}`)) count++;
      if (p.notificacao && p.notificacao.trim()) {
        if (!treatedItemIds.has(`prof-ativo-notif-${p.id || p.uid}`)) count++;
      }
    });

    // 3. Empresas, Apoio e Compliance (Master)
    if (currentRole === "master") {
      empresasLeads.forEach((e) => {
        if (
          !e.status ||
          e.status === "Aguardando" ||
          e.status === "Pendente" ||
          e.status === "Aguardando Contato"
        ) {
          if (!treatedItemIds.has(`emp-lead-novo-${e.id}`)) count++;
        }
        if (e.notificacao && e.notificacao.trim()) {
          if (!treatedItemIds.has(`emp-lead-notif-${e.id}`)) count++;
        }
      });

      solicitacoes.forEach((s) => {
        if (!s.status || s.status === "Aguardando" || s.status === "Pendente") {
          if (!treatedItemIds.has(`apoio-sol-${s.id}`)) count++;
        }
      });

      complianceMessages.forEach((m) => {
        if (!m.status || m.status === "Pendente") {
          if (!treatedItemIds.has(`compliance-msg-${m.id}`)) count++;
        }
      });
    }

    return count;
  };

  const untreatedGestaoCount = calculateUntreatedGestaoCount();

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
    (activeTab === "kanban" || activeTab === "pacientesAcolhidos") && selectedCard
      ? selectedCard
      : activeTab === "profissionais" && selectedProfissional
        ? selectedProfissional
        : activeTab === "empresas" && selectedEmpresa
          ? selectedEmpresa
          : selectedCard || selectedEmpresa || selectedProfissional;

  const processNotificationTemplate = (msg: string, target: any) => {
    let processedMsg = msg;
    if (target && (activeTab === "kanban" || activeTab === "pacientesAcolhidos" || target.viaAcesso)) {
      // If target is a patient
      const prof = profissionaisAtivos.find(
        (p) => p.uid === target.profissionalId,
      );

      let valorMensal = "a combinar";
      if (target.valorSessao) {
        if (target.valorSessao.toLowerCase().includes("gratuito")) {
          valorMensal = "Gratuito";
        } else {
          const matches = target.valorSessao.match(/(\d+[\d.,]*)/);
          if (matches) {
            let cleanValor = matches[0];
            if (cleanValor.includes(",") && cleanValor.includes(".")) {
              cleanValor = cleanValor.replace(/\./g, "").replace(",", ".");
            } else if (cleanValor.includes(",")) {
              cleanValor = cleanValor.replace(",", ".");
            }
            const valorNum = parseFloat(cleanValor);
            if (!isNaN(valorNum) && valorNum > 0) {
              let multiplicador = 4;
              const freq = (target.frequenciaSessoes || "Semanal").toLowerCase();
              if (freq.includes("quinzenal")) multiplicador = 2;
              else if (freq.includes("mensal")) multiplicador = 1;
              else if (freq.includes("sob demanda")) multiplicador = 1;

              const total = valorNum * multiplicador;
              valorMensal = `R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mês (aprox. ${multiplicador} sessões x ${target.valorSessao})`;
            }
          }
        }
      }

      processedMsg = processedMsg.replace(/\[NOME\]/g, target.nome || "");
      processedMsg = processedMsg.replace(
        /\[GENERO\]/g,
        target.genero || target.identidadeGenero || "Não informado",
      );

      let idadeCalculada = "Não informada";
      if (target.idade) {
        idadeCalculada = `${target.idade} anos`;
      } else if (target.dataNascimento) {
        try {
          let dob: Date;
          if (target.dataNascimento.includes("/")) {
            const p = target.dataNascimento.split("/");
            dob = new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
          } else {
            dob = new Date(target.dataNascimento);
          }
          if (!isNaN(dob.getTime())) {
            const diff = Date.now() - dob.getTime();
            const ageDate = new Date(diff);
            idadeCalculada = `${Math.abs(ageDate.getUTCFullYear() - 1970)} anos`;
          } else {
            idadeCalculada = target.dataNascimento;
          }
        } catch {
          idadeCalculada = target.dataNascimento;
        }
      }
      processedMsg = processedMsg.replace(/\[IDADE\]/g, idadeCalculada);
      processedMsg = processedMsg.replace(
        /\[MOTIVO\]/g,
        target.motivo ||
          target.queixaPrincipal ||
          target.observacoes ||
          target.necessidadesDescricao ||
          "Não informada",
      );

      let periodosStr = "Não informado";
      if (Array.isArray(target.melhoresPeriodos) && target.melhoresPeriodos.length > 0) {
        periodosStr = target.melhoresPeriodos.join(", ");
      } else if (typeof target.melhoresPeriodos === "string" && target.melhoresPeriodos.trim()) {
        periodosStr = target.melhoresPeriodos.trim();
      }
      processedMsg = processedMsg.replace(/\[MELHORES_PERIODOS\]/g, periodosStr);

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
            <button
              onClick={() => setActiveTab("tarefas")}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap relative flex items-center gap-1.5 ${activeTab === "tarefas" ? "bg-white shadow-sm text-forest" : "text-forest/70 hover:text-forest"}`}
            >
              Alertas e Pendências
              {untreatedGestaoCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] min-w-[18px] h-4.5 px-1 flex items-center justify-center rounded-full font-bold">
                  {untreatedGestaoCount}
                </span>
              )}
            </button>
            {currentRole === "master" && (
              <button
                onClick={() => setActiveTab("estatisticas")}
                className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap relative flex items-center gap-1.5 ${activeTab === "estatisticas" ? "bg-white shadow-sm text-forest" : "text-forest/70/70 hover:text-forest/70"}`}
              >
                Controle
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
                <button
                  onClick={() => setActiveTab("backup")}
                  className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap relative flex items-center gap-1.5 ${activeTab === "backup" ? "bg-white shadow-sm text-forest" : "text-forest/70/70 hover:text-forest/70"}`}
                >
                  <Database className="w-3.5 h-3.5 text-forest/70" />
                  <span>Backup & Dados</span>
                </button>
                <button
                  onClick={() => setActiveTab("notificacoes")}
                  className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap relative flex items-center gap-1.5 ${activeTab === "notificacoes" ? "bg-white shadow-sm text-forest font-bold" : "text-forest/70/70 hover:text-forest/70"}`}
                >
                  <Bell className="w-3.5 h-3.5 text-forest/70" />
                  <span>Régua & Mensagens</span>
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
            <button
              onClick={() => setActiveTab("gestaoArtigos")}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap relative flex items-center gap-1.5 ${activeTab === "gestaoArtigos" ? "bg-white shadow-sm text-forest" : "text-forest/70/70 hover:text-forest/70"}`}
            >
              <BookOpen className="w-3.5 h-3.5 text-forest/70" />
              <span>Artigos & Blog</span>
              {pendingArtigosCount > 0 && (
                <span className="bg-amber-500 text-white text-[10px] w-4.5 h-4.5 flex items-center justify-center rounded-full font-bold ml-1">
                  {pendingArtigosCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("redeProfissional")}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap relative flex items-center gap-1.5 ${activeTab === "redeProfissional" ? "bg-white shadow-sm text-forest font-bold" : "text-forest/70/70 hover:text-forest/70"}`}
            >
              <Users className="w-3.5 h-3.5 text-emerald-700" />
              <span>Rede de Conexão</span>
            </button>
          </div>
        )}

        {currentRole === "profissional" && (
          <div className="flex order-last w-full lg:w-auto lg:order-none items-center gap-1 sm:gap-2 bg-warm rounded-full p-1 border border-soft overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab("estatisticas")}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap relative flex items-center gap-1.5 ${activeTab === "estatisticas" ? "bg-white shadow-sm text-forest" : "text-forest/70/70 hover:text-forest/70"}`}
            >
              Controle
            </button>
            <button
              onClick={() => setActiveTab("pacientes")}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${activeTab === "pacientes" ? "bg-white shadow-sm text-forest" : "text-forest/70/70 hover:text-forest/70"}`}
            >
              Meus Pacientes
            </button>
            <button
              onClick={() => setActiveTab("redeProfissional")}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap relative flex items-center gap-1.5 ${activeTab === "redeProfissional" ? "bg-white shadow-sm text-forest font-bold" : "text-forest/70/70 hover:text-forest/70"}`}
            >
              <Users className="w-3.5 h-3.5 text-emerald-700" />
              <span>Rede de Conexão</span>
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
              onClick={() => setActiveTab("artigosProfissional")}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap relative flex items-center gap-1.5 ${activeTab === "artigosProfissional" ? "bg-white shadow-sm text-forest" : "text-forest/70/70 hover:text-forest/70"}`}
            >
              <BookOpen className="w-3.5 h-3.5 text-forest/70" />
              <span>Meus Artigos</span>
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
              onClick={() => setActiveTab("pagamentosProfissional")}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap relative flex items-center gap-1.5 ${activeTab === "pagamentosProfissional" ? "bg-white shadow-sm text-forest" : "text-forest/70 hover:text-forest"}`}
            >
              <CreditCard className="w-3.5 h-3.5 text-forest" />
              <span>{profile?.isCortesia ? "Status / Convidado" : "Gerenciar Pagamentos"}</span>
              {profile?.isCortesia && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-900 text-[10px] font-black rounded-full border border-purple-200">
                  Convidado
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("perfil")}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${activeTab === "perfil" ? "bg-white shadow-sm text-forest" : "text-forest/70 hover:text-forest"}`}
            >
              Meu Perfil
            </button>
          </div>
        )}

        {activeTab !== "estatisticas" && (
          <div className={`flex-1 w-full lg:w-auto relative order-last lg:order-none mt-3 sm:mt-0 transition-all ${
            activeTab === "redeProfissional" ? "lg:max-w-md" : "lg:max-w-xs"
          }`}>
            <Search className="w-4 h-4 text-forest/70 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="global-search-input"
              type="text"
              placeholder={
                activeTab === "redeProfissional"
                  ? "Buscar profissionais por palavras-chave, especialidade ou abordagem..."
                  : "Buscar..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 sm:py-2 text-xs sm:text-sm bg-warm/50 border border-soft rounded-full focus:outline-none focus:border-sun-dark focus:bg-white text-forest placeholder:text-forest/60 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-forest/50 hover:text-forest transition-colors cursor-pointer"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

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
                    ? "Gestão"
                    : r === "triagem"
                      ? "Triagem"
                      : "Psicólogo"}
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => onNavigate("blog")}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-warm hover:bg-warm/80 text-forest text-xs font-semibold rounded-full border border-soft transition-all cursor-pointer"
            title="Acessar Blog & Artigos"
          >
            <BookOpen className="w-3.5 h-3.5 text-forest/70" />
            <span>Blog Público</span>
          </button>
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

      {/* Professional Subscription Status Banner (Minimizable/Closable) */}
      {currentRole === "profissional" && subscriptionBannerState !== "closed" && (
        profile?.isCortesia ? (
          subscriptionBannerState === "minimized" ? (
            <div className="bg-gradient-to-r from-purple-500/10 via-purple-500/15 to-emerald-500/10 border-b border-purple-200/80 px-3 sm:px-6 py-1.5 flex items-center justify-between gap-2 text-xs text-forest font-medium animate-in fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <Gift className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span className="truncate text-[11px] sm:text-xs">
                  <strong>Status:</strong> Profissional Convidado (Isenção Cortesia)
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setActiveTab("pagamentosProfissional")}
                  className="px-2 py-0.5 bg-purple-700 text-white hover:bg-purple-800 rounded-lg text-[10px] font-bold transition-all shadow-2xs"
                >
                  Ver
                </button>
                <button
                  onClick={() => setSubscriptionBannerState("expanded")}
                  className="p-1 text-purple-900/70 hover:text-purple-900 hover:bg-purple-100 rounded-lg transition-colors flex items-center gap-0.5 text-[10px] font-semibold"
                  title="Expandir aviso de status"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Expandir</span>
                </button>
                <button
                  onClick={() => setSubscriptionBannerState("closed")}
                  className="p-1 text-purple-900/70 hover:text-red-600 hover:bg-purple-100 rounded-lg transition-colors"
                  title="Fechar aviso"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-purple-500/10 via-purple-500/15 to-emerald-500/10 border-b border-purple-200/80 px-3 sm:px-6 py-2 sm:py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 text-xs text-forest font-medium animate-in fade-in">
              <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
                <Gift className="w-4 h-4 text-purple-600 shrink-0 mt-0.5 sm:mt-0" />
                <span className="text-[11px] sm:text-xs leading-tight sm:leading-normal">
                  <strong>Status: Profissional Convidado (Isenção Cortesia):</strong> Você está cadastrado(a) na plataforma como <strong>Convidado Especial</strong> pela Gestão. Seu acesso é livre de avisos de cobrança ou mensalidades.
                </span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-end sm:self-auto w-full sm:w-auto justify-end">
                <button
                  onClick={() => setActiveTab("pagamentosProfissional")}
                  className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 bg-purple-700 text-white hover:bg-purple-800 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all shrink-0 flex items-center gap-1 shadow-2xs"
                >
                  <CreditCard className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-200" />
                  Ver Status
                </button>
                <button
                  onClick={() => setSubscriptionBannerState("minimized")}
                  className="p-1 sm:p-1.5 text-purple-900/70 hover:text-purple-900 hover:bg-purple-100 rounded-lg transition-colors flex items-center gap-0.5 text-[10px] font-semibold"
                  title="Minimizar aviso"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Minimizar</span>
                </button>
                <button
                  onClick={() => setSubscriptionBannerState("closed")}
                  className="p-1 sm:p-1.5 text-purple-900/70 hover:text-red-600 hover:bg-purple-100 rounded-lg transition-colors"
                  title="Fechar aviso"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        ) : profile?.statusPagamento !== "pago" && !profile?.solicitacaoCancelamento ? (
          subscriptionBannerState === "minimized" ? (
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-emerald-500/10 border-b border-amber-200/80 px-3 sm:px-6 py-1.5 flex items-center justify-between gap-2 text-xs text-forest font-medium animate-in fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="truncate text-[11px] sm:text-xs">
                  <strong>Prazo 1º Pagamento (7 dias):</strong> Vence em {profile?.vencimentoPagamento ? formatDateSafely(profile.vencimentoPagamento) : "7 dias após entrada"}.
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setActiveTab("pagamentosProfissional")}
                  className="px-2 py-0.5 bg-forest text-white hover:bg-forest/90 rounded-lg text-[10px] font-bold transition-all shadow-2xs"
                >
                  Pagamento
                </button>
                <button
                  onClick={() => setSubscriptionBannerState("expanded")}
                  className="p-1 text-forest/70 hover:text-forest hover:bg-amber-100/60 rounded-lg transition-colors flex items-center gap-0.5 text-[10px] font-semibold"
                  title="Expandir aviso de pagamento"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Expandir</span>
                </button>
                <button
                  onClick={() => setSubscriptionBannerState("closed")}
                  className="p-1 text-forest/70 hover:text-red-600 hover:bg-amber-100/60 rounded-lg transition-colors"
                  title="Fechar aviso"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-emerald-500/10 border-b border-amber-200/80 px-3 sm:px-6 py-2 sm:py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 text-xs text-forest font-medium animate-in fade-in">
              <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                <span className="text-[11px] sm:text-xs leading-tight sm:leading-normal">
                  <strong>Prazo para o 1º Pagamento (7 dias):</strong> Sua admissão foi realizada em{" "}
                  {profile?.dataAdmissao ? formatDateSafely(profile.dataAdmissao) : "recentemente"}. O seu primeiro pagamento vence em{" "}
                  {profile?.vencimentoPagamento ? formatDateSafely(profile.vencimentoPagamento) : "7 dias após a entrada"}.
                </span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-end sm:self-auto w-full sm:w-auto justify-end">
                <button
                  onClick={() => setActiveTab("pagamentosProfissional")}
                  className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 bg-forest text-white hover:bg-forest/90 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all shrink-0 flex items-center gap-1 shadow-2xs"
                >
                  <CreditCard className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-sun" />
                  Gerenciar Pagamento
                </button>
                <button
                  onClick={() => setSubscriptionBannerState("minimized")}
                  className="p-1 sm:p-1.5 text-forest/70 hover:text-forest hover:bg-amber-100/60 rounded-lg transition-colors flex items-center gap-0.5 text-[10px] font-semibold"
                  title="Minimizar aviso"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Minimizar</span>
                </button>
                <button
                  onClick={() => setSubscriptionBannerState("closed")}
                  className="p-1 sm:p-1.5 text-forest/70 hover:text-red-600 hover:bg-amber-100/60 rounded-lg transition-colors"
                  title="Fechar aviso"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        ) : null
      )}

      {/* Discreet restore button if closed */}
      {currentRole === "profissional" && subscriptionBannerState === "closed" && (profile?.isCortesia || (profile?.statusPagamento !== "pago" && !profile?.solicitacaoCancelamento)) && (
        <div className="px-3 sm:px-6 py-1 bg-warm/60 border-b border-soft flex justify-end">
          <button
            onClick={() => setSubscriptionBannerState("minimized")}
            className="text-[10px] font-semibold text-forest/60 hover:text-forest flex items-center gap-1 transition-colors"
            title="Mostrar aviso de assinatura"
          >
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>Exibir Status da Assinatura</span>
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Main Content */}
      {(currentRole === "master" || currentRole === "triagem") &&
      activeTab === "estatisticas" ? (
        <div className="flex-1 overflow-auto p-6 md:p-8 flex flex-col gap-8 slide-up">
          <div className="max-w-7xl w-full mx-auto space-y-8">
            <h2 className="font-serif text-3xl text-forest bg-white px-8 py-6 rounded-[2rem] shadow-sm border border-soft flex items-center gap-4">
              <BarChart2 className="w-8 h-8 text-forest/70" />
              Controle da Plataforma
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
                {(() => {
                  const isPacienteAtivo = (a: any) => {
                    if (a.ativo === false) return false;
                    if (a.status === "Alta") return false;
                    const flow = getPatientFlowDetails(a);
                    return (
                      (a.status === "Em Atendimento" && a.atribuicaoStatus === "Aceito") ||
                      a.atribuicaoStatus === "Aceito" ||
                      (flow.activeStep === 6 && a.status === "Em Atendimento")
                    );
                  };

                  const isPacienteTriagem = (a: any) => {
                    if (a.ativo === false) return false;
                    if (a.status === "Alta") return false;
                    if (isPacienteAtivo(a)) return false;
                    const flow = getPatientFlowDetails(a);
                    return flow.activeStep < 6 && a.status !== "Em Atendimento";
                  };

                  const ativosCount = acolhimentos.filter(isPacienteAtivo).length;
                  const triagemCount = acolhimentos.filter(isPacienteTriagem).length;
                  const outrosInativosCount = Math.max(
                    0,
                    acolhimentos.length - ativosCount - triagemCount,
                  );

                  return (
                    <div className="grid grid-cols-3 gap-2 border-t border-soft pt-4 mt-2">
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase font-bold text-emerald-600 tracking-wider">
                          Ativos
                        </span>
                        <span className="text-lg font-semibold text-forest">
                          {ativosCount}
                        </span>
                      </div>
                      <div className="flex flex-col border-l border-soft pl-2">
                        <span className="text-[9px] uppercase font-bold text-amber-600 tracking-wider">
                          Triagem
                        </span>
                        <span className="text-lg font-semibold text-forest">
                          {triagemCount}
                        </span>
                      </div>
                      <div className="flex flex-col border-l border-soft pl-2">
                        <span className="text-[9px] uppercase font-bold text-forest/50 tracking-wider">
                          Outros/Inativos
                        </span>
                        <span className="text-lg font-semibold text-forest">
                          {outrosInativosCount}
                        </span>
                      </div>
                    </div>
                  );
                })()}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    title: "Formulário de Acolhimento",
                    desc: "Link para o paciente iniciar nova triagem (fluxo padrão).",
                    path: "?view=acolhimento",
                  },
                  {
                    title: "Acolhimento Corporativo",
                    desc: "Link direto para acolhimento de colaboradores parceiros (sem seletor de vias).",
                    path: "?view=acolhimento&via=corporativo",
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
                      Faixas de Valor de Sessão (Público Particular)
                    </h4>
                    <p className="text-xs text-forest/70 mb-4">
                      Defina até 5 opções de valores de sessão que a triagem
                      poderá selecionar ao apresentar uma proposta para o
                      paciente particular.
                    </p>
                    <div className="flex flex-col gap-3">
                      {[0, 1, 2, 3, 4].map((index) => (
                        <div key={index} className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold uppercase text-forest/70/60 ml-2">
                            Faixa Particular {index + 1}
                          </label>
                          <DebouncedInput
                            className="text-sm bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                            placeholder={`Ex: R$ ${(index + 1) * 30},00`}
                            value={globalConfigs.faixasValores?.[index] || ""}
                            onChange={(val) => {
                              const newFaixas = [
                                ...(globalConfigs.faixasValores || [
                                  "",
                                  "",
                                  "",
                                  "",
                                  "",
                                ]),
                              ];
                              newFaixas[index] = val;
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
                    <div className="flex items-center gap-2 border-b border-soft pb-2 mb-4">
                      <Building2 className="w-4 h-4 text-forest/70" />
                      <h4 className="text-sm font-bold uppercase tracking-wider text-forest/70">
                        Faixas de Valor de Sessão (Público Corporativo)
                      </h4>
                    </div>
                    <p className="text-xs text-forest/70 mb-4">
                      Defina até 3 opções de faixas de valores para atendimentos corporativos. Estas 3 faixas aparecerão como atalhos dedicados nas fichas de bordo dos pacientes que ingressarem via Corporativo.
                    </p>
                    <div className="flex flex-col gap-3">
                      {[0, 1, 2].map((index) => (
                        <div key={index} className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold uppercase text-forest/70/60 ml-2">
                            Faixa Corporativa {index + 1}
                          </label>
                          <DebouncedInput
                            className="text-sm bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                            placeholder={`Ex: R$ ${(index + 1) * 30 + 30},00`}
                            value={globalConfigs.faixasValoresCorporativo?.[index] || ""}
                            onChange={(val) => {
                              const newFaixas = [
                                ...(globalConfigs.faixasValoresCorporativo || [
                                  "",
                                  "",
                                  "",
                                ]),
                              ];
                              newFaixas[index] = val;
                              handleUpdateConfiguracoesProperty(
                                "faixasValoresCorporativo",
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

                    <div className="flex items-center justify-between p-4 bg-white border border-soft rounded-xl mt-3">
                      <div className="flex flex-col gap-1 pr-4">
                        <span className="text-sm font-bold text-forest">Carrossel de Profissionais na Home</span>
                        <span className="text-xs text-forest/65">
                          Exibe o carrossel contínuo com os psicólogos da plataforma na página principal (após o FAQ). Somente exibido para quem cadastrou foto de perfil.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateConfiguracoesProperty(
                            "carrosselProfissionaisAtivo",
                            globalConfigs.carrosselProfissionaisAtivo === undefined
                              ? false
                              : !globalConfigs.carrosselProfissionaisAtivo,
                          )
                        }
                        className={`w-14 h-8 rounded-full transition-colors relative flex items-center shrink-0 ${
                          (globalConfigs.carrosselProfissionaisAtivo ?? true) ? "bg-forest" : "bg-forest/15"
                        }`}
                      >
                        <span
                          className={`w-6 h-6 bg-white rounded-full absolute shadow-md transition-all ${
                            (globalConfigs.carrosselProfissionaisAtivo ?? true) ? "left-7" : "left-1"
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
                        <DebouncedInput
                          className="text-sm bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                          placeholder="Ex: 11999999999"
                          value={globalConfigs.telefoneSuporte || ""}
                          onChange={(val) =>
                            handleUpdateConfiguracoesProperty(
                              "telefoneSuporte",
                              val,
                            )
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase text-forest/70/60 ml-2">
                          E-mail de Suporte
                        </label>
                        <DebouncedInput
                          type="email"
                          className="text-sm bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                          placeholder="Ex: suporte@elohumanas.com.br"
                          value={globalConfigs.emailSuporte || ""}
                          onChange={(val) =>
                            handleUpdateConfiguracoesProperty(
                              "emailSuporte",
                              val,
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 mt-4">
                      <label className="text-[10px] font-semibold uppercase text-forest/70/60 ml-2">
                        Frase de Suporte (Mensagem Inicial)
                      </label>
                      <DebouncedTextArea
                        className="text-sm bg-white border border-soft px-4 py-3 rounded-xl focus:outline-none focus:border-sun-dark transition-colors resize-none h-24"
                        placeholder="Ex: Olá! Preciso de ajuda com a plataforma..."
                        value={globalConfigs.fraseSuporte || ""}
                        onChange={(val) =>
                          handleUpdateConfiguracoesProperty(
                            "fraseSuporte",
                            val,
                          )
                        }
                      />
                      <p className="text-[10px] text-forest/50 ml-2 mb-1">
                        Esta mensagem será sugerida ao profissional quando este
                        acionar o suporte via WhatsApp.
                      </p>
                    </div>
                  </div>

                  {/* Taxa Associativa dos Profissionais */}
                  <div className="bg-warm/30 p-6 rounded-2xl border border-soft space-y-4">
                    <div className="flex justify-between items-center border-b border-soft pb-2">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-forest/70">
                        Taxa Associativa dos Profissionais
                      </h4>
                      <span className="px-2.5 py-0.5 bg-sun-light text-forest text-[10px] font-bold rounded-full border border-sun-dark/30 uppercase">
                        Plano Profissional
                      </span>
                    </div>
                    <p className="text-xs text-forest/70 leading-relaxed">
                      Defina o valor mensal cobrado dos profissionais para manutenção do ecossistema, consultorias e triagem dos casos. O valor alterado se refletirá imediatamente na landing page e nos formulários.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase text-forest/70 ml-2">
                          Valor da Taxa Mensal (R$) *
                        </label>
                        <div className="relative flex items-center">
                          <span className="absolute left-4 text-sm font-bold text-forest/60">R$</span>
                          <DebouncedInput
                            type="text"
                            className="w-full text-sm font-bold bg-white border border-soft pl-12 pr-4 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark transition-colors text-forest"
                            placeholder="29,90"
                            value={globalConfigs.taxaAssociativaMensal || "29,90"}
                            onChange={(val) =>
                              handleUpdateConfiguracoesProperty(
                                "taxaAssociativaMensal",
                                val,
                              )
                            }
                          />
                        </div>
                      </div>
                      <div className="flex flex-col justify-end">
                        <p className="text-[11px] text-forest/60 italic bg-white/60 p-2.5 rounded-xl border border-soft/50">
                          Exibido nos cards e no checkbox de ciência e concordância no final da inscrição do profissional.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Configuração do Stripe Checkout */}
                  <div className="bg-warm/30 p-6 rounded-2xl border border-soft space-y-4">
                    <div className="flex justify-between items-center border-b border-soft pb-2">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-forest/70">
                        Checkout & Configuração Stripe
                      </h4>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-forest rounded cursor-pointer"
                          checked={globalConfigs.stripeEnabled ?? true}
                          onChange={(e) =>
                            handleUpdateConfiguracoesProperty(
                              "stripeEnabled",
                              e.target.checked,
                            )
                          }
                        />
                        <span className="text-xs font-bold text-forest uppercase tracking-wider">
                          Stripe Ativo
                        </span>
                      </label>
                    </div>
                    <p className="text-xs text-forest/70 leading-relaxed">
                      Configure suas chaves públicas e links de pagamento do Stripe para processar cobranças da taxa associativa via cartão de crédito, Pix e boleto.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase text-forest/70 ml-2">
                          Chave Pública do Stripe (pk_live_... ou pk_test_...)
                        </label>
                        <DebouncedInput
                          type="text"
                          className="text-sm font-mono bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                          placeholder="pk_test_51Nx..."
                          value={globalConfigs.stripePublicKey || ""}
                          onChange={(val) =>
                            handleUpdateConfiguracoesProperty(
                              "stripePublicKey",
                              val,
                            )
                          }
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase text-forest/70 ml-2">
                          Link de Checkout Direto Stripe (Payment Link)
                        </label>
                        <DebouncedInput
                          type="url"
                          className="text-sm bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                          placeholder="https://buy.stripe.com/..."
                          value={globalConfigs.stripeCheckoutUrl || ""}
                          onChange={(val) =>
                            handleUpdateConfiguracoesProperty(
                              "stripeCheckoutUrl",
                              val,
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Webhook & Automação de E-mails */}
                  <div className="bg-warm/30 p-6 rounded-2xl border border-soft space-y-4">
                    <div className="flex justify-between items-center border-b border-soft pb-2">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-forest/70">
                        Webhook & Automações por E-mail (Brevo / Make / N8n / Zapier)
                      </h4>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-forest rounded cursor-pointer"
                          checked={globalConfigs.webhookEmailEnabled ?? true}
                          onChange={(e) =>
                            handleUpdateConfiguracoesProperty(
                              "webhookEmailEnabled",
                              e.target.checked,
                            )
                          }
                        />
                        <span className="text-xs font-bold text-forest uppercase tracking-wider">
                          Webhook Ativo
                        </span>
                      </label>
                    </div>
                    <p className="text-xs text-forest/70 leading-relaxed">
                      Envia notificações transacionais em tempo real para o <strong>Brevo (Sendinblue)</strong>, Make, N8n, Zapier ou seu servidor de automação de e-mails sempre que houver novidades na plataforma.
                    </p>

                    <div className="flex gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateConfiguracoesProperty("webhookEmailUrl", "https://api.brevo.com/v3/smtp/email")}
                        className="text-[11px] font-bold text-forest bg-forest/10 hover:bg-forest/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                      >
                        ⚡ Usar API Direta do Brevo (https://api.brevo.com/v3/smtp/email)
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase text-forest/70 ml-2">
                          URL Endpoint do Brevo / Webhook *
                        </label>
                        <input
                          type="url"
                          className="text-sm font-mono bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                          placeholder="https://api.brevo.com/v3/smtp/email"
                          value={globalConfigs.webhookEmailUrl || ""}
                          onChange={(e) =>
                            handleUpdateConfiguracoesProperty(
                              "webhookEmailUrl",
                              e.target.value,
                            )
                          }
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase text-forest/70 ml-2">
                          Chave API do Brevo (xkeysib-...) *
                        </label>
                        <input
                          type="password"
                          className="text-sm font-mono bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                          placeholder="xkeysib-..."
                          value={globalConfigs.webhookEmailSecret || ""}
                          onChange={(e) =>
                            handleUpdateConfiguracoesProperty(
                              "webhookEmailSecret",
                              e.target.value,
                            )
                          }
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase text-forest/70 ml-2">
                          Remetente Cadastrado no Brevo *
                        </label>
                        <input
                          type="email"
                          className="text-sm font-mono bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                          placeholder="contato@proacolhemente.com.br"
                          value={globalConfigs.webhookEmailSender || ""}
                          onChange={(e) =>
                            handleUpdateConfiguracoesProperty(
                              "webhookEmailSender",
                              e.target.value,
                            )
                          }
                        />
                      </div>
                    </div>

                    {/* Área de Teste Prático de Disparo */}
                    <div className="mt-4 pt-4 border-t border-soft/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-forest flex items-center gap-1.5">
                          <Send className="w-3.5 h-3.5 text-sun-dark" />
                          Testar Disparo em Tempo Real
                        </label>
                        <span className="text-[11px] text-forest/60">
                          (Envia um e-mail de teste instantâneo para verificar suas credenciais)
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="email"
                          className="flex-1 text-sm bg-white border border-soft px-4 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark transition-colors font-mono"
                          placeholder="Digite seu e-mail de destino (ex: marciopsi@elosolucoeshumanas.com)"
                          value={testEmailRecipient || profile?.email || globalConfigs.emailSuporte || "marciopsi@elosolucoeshumanas.com"}
                          onChange={(e) => setTestEmailRecipient(e.target.value)}
                        />
                        <button
                          type="button"
                          disabled={isTestingEmail}
                          onClick={async () => {
                            setTestEmailResult(null);

                            const targetUrl = globalConfigs.webhookEmailUrl || "https://api.brevo.com/v3/smtp/email";
                            const targetSecret = globalConfigs.webhookEmailSecret;
                            const targetSender = globalConfigs.webhookEmailSender || globalConfigs.emailSuporte || "contato@proacolhemente.com.br";
                            const recipient = testEmailRecipient || profile?.email || globalConfigs.emailSuporte || "marciopsi@elosolucoeshumanas.com";

                            if (!targetUrl) {
                              setTestEmailResult({
                                success: false,
                                message: "URL Endpoint do Brevo não preenchida. Informe a URL ou clique em 'Usar API Direta do Brevo'.",
                              });
                              return;
                            }

                            if (!targetSecret) {
                              setTestEmailResult({
                                success: false,
                                message: "Chave API do Brevo (xkeysib-...) não informada. Preencha a chave API no campo acima.",
                              });
                              return;
                            }

                            setIsTestingEmail(true);

                            try {
                              const res = await sendWebhookNotification(
                                {
                                  event: "teste_webhook",
                                  recipientEmail: recipient.trim(),
                                  recipientName: "Gestor AcolheMente",
                                  title: "Teste de Integração Brevo - AcolheMente Saúde",
                                  message: `Parabéns! Sua integração com o Brevo foi testada e configurada com sucesso.\n\nRemetente: ${targetSender}\nDestinatário: ${recipient}`,
                                  data: {
                                    testMessage: "Disparo de teste realizado em tempo real via Painel de Gestão.",
                                    timestamp: new Date().toISOString(),
                                  },
                                },
                                {
                                  webhookEmailEnabled: true,
                                  webhookEmailUrl: targetUrl,
                                  webhookEmailSecret: targetSecret,
                                  webhookEmailSender: targetSender,
                                  emailSuporte: globalConfigs.emailSuporte,
                                }
                              );

                              if (res && res.success) {
                                setTestEmailResult({
                                  success: true,
                                  message: `E-mail de teste enviado com SUCESSO!`,
                                  senderUsed: targetSender,
                                  recipientUsed: recipient.trim(),
                                  data: res.data,
                                });
                              } else {
                                setTestEmailResult({
                                  success: false,
                                  message: res?.error || "Falha ao enviar e-mail via Brevo.",
                                  status: res?.status,
                                  senderUsed: targetSender,
                                  recipientUsed: recipient.trim(),
                                  data: res?.data,
                                });
                              }
                            } catch (err: any) {
                              setTestEmailResult({
                                success: false,
                                message: err?.message || "Erro inesperado ao disparar e-mail de teste.",
                              });
                            } finally {
                              setIsTestingEmail(false);
                            }
                          }}
                          className="px-5 py-2.5 bg-forest text-white hover:bg-forest/90 disabled:opacity-50 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                          {isTestingEmail ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-sun" />
                              <span>Enviando...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 text-sun" />
                              <span>Enviar Teste Agora</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Caixa de Resultado do Teste */}
                      {testEmailResult && (
                        <div
                          className={`p-4 rounded-xl border text-xs space-y-2 transition-all ${
                            testEmailResult.success
                              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                              : "bg-amber-50 border-amber-300 text-amber-900"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2 font-bold text-sm">
                              {testEmailResult.success ? (
                                <>
                                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <span className="text-emerald-800">✅ E-mail de Teste Enviado com Sucesso!</span>
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                  <span className="text-amber-900">⚠️ Resposta do Brevo / Servidor</span>
                                </>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => setTestEmailResult(null)}
                              className="text-xs text-forest/40 hover:text-forest font-bold px-1"
                            >
                              ✕
                            </button>
                          </div>

                          <p className="leading-relaxed font-medium">
                            {testEmailResult.message}
                          </p>

                          {testEmailResult.senderUsed && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1 font-mono text-[11px] opacity-90">
                              <div><strong>Remetente:</strong> {testEmailResult.senderUsed}</div>
                              <div><strong>Destinatário:</strong> {testEmailResult.recipientUsed}</div>
                            </div>
                          )}

                          {testEmailResult.success && (
                            <p className="text-[11px] text-emerald-700 bg-emerald-100/60 p-2 rounded-lg mt-1">
                              📬 Verifique a caixa de entrada (e também a pasta de <strong>Spam / Lixo Eletrônico</strong>) do e-mail <strong>{testEmailResult.recipientUsed}</strong>.
                            </p>
                          )}

                          {!testEmailResult.success && (
                            <div className="bg-white/80 p-3 rounded-lg border border-amber-200 text-[11px] space-y-1.5 mt-2">
                              <p className="font-bold text-amber-950 uppercase tracking-wider">Dicas para resolver:</p>
                              <ul className="list-disc pl-4 space-y-1 text-amber-900">
                                <li>
                                  <strong>Remetente não autorizado:</strong> Verifique se o e-mail <code>{testEmailResult.senderUsed}</code> está cadastrado e verificado no seu painel do Brevo em <em>Senders & IP</em>.
                                </li>
                                <li>
                                  <strong>Chave API inválida:</strong> A chave deve ter o formato <code>xkeysib-...</code> e ser uma chave v3 válida criada no Brevo em <em>SMTP & API Keys</em>.
                                </li>
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* WhatsApp via Evolution API (QR Code & Webhook) */}
                  <div className="bg-warm/30 p-6 rounded-2xl border border-soft space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-soft pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                            <MessageSquare className="w-4 h-4" />
                          </div>
                          <h4 className="text-base font-bold text-forest flex items-center gap-2">
                            WhatsApp via Evolution API (QR Code & Webhook)
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Recomendado
                            </span>
                          </h4>
                        </div>
                        <p className="text-xs text-forest/70 mt-1 max-w-2xl leading-relaxed">
                          Conecte um número de WhatsApp via leitura de QR Code direto no navegador, sem burocracias do Facebook/Meta. Envie notificações de novos acolhimentos, propostas e atualizações com Webhooks em tempo real.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 shrink-0">
                        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-soft shadow-2xs">
                          <input
                            type="checkbox"
                            checked={globalConfigs.whatsappEvolutionEnabled ?? false}
                            onChange={(e) =>
                              handleUpdateConfiguracoesProperty(
                                "whatsappEvolutionEnabled",
                                e.target.checked
                              )
                            }
                            className="rounded border-soft text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                          />
                          <span className="text-xs font-bold text-forest">
                            Ativar WhatsApp
                          </span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-soft shadow-2xs">
                          <input
                            type="checkbox"
                            checked={globalConfigs.whatsappEvolutionAutoNotif ?? true}
                            onChange={(e) =>
                              handleUpdateConfiguracoesProperty(
                                "whatsappEvolutionAutoNotif",
                                e.target.checked
                              )
                            }
                            className="rounded border-soft text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                          />
                          <span className="text-xs font-bold text-forest">
                            Envios Automáticos
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Status da Conexão & Ações Rápidas */}
                    <div className="bg-white p-4 rounded-xl border border-soft/80 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                            whatsappState === "open"
                              ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"
                              : whatsappState === "connecting"
                              ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                              : whatsappState === "close"
                              ? "bg-rose-500"
                              : "bg-slate-300"
                          }`}
                        />
                        <div>
                          <div className="text-xs font-bold text-forest flex items-center gap-2">
                            <span>Status da Conexão:</span>
                            {whatsappState === "open" && (
                              <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 text-[11px] font-bold flex items-center gap-1">
                                <Wifi className="w-3 h-3 text-emerald-600" />
                                Conectado e Operando
                              </span>
                            )}
                            {whatsappState === "connecting" && (
                              <span className="text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 text-[11px] font-bold flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Aguardando Leitura do QR Code
                              </span>
                            )}
                            {whatsappState === "close" && (
                              <span className="text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 text-[11px] font-bold flex items-center gap-1">
                                <WifiOff className="w-3 h-3 text-rose-600" />
                                Desconectado
                              </span>
                            )}
                            {whatsappState === "unknown" && (
                              <span className="text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 text-[11px] font-semibold">
                                Não verificado
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-forest/60 mt-0.5">
                            Instância: <strong>{globalConfigs.whatsappEvolutionInstance || "acolhemente"}</strong>
                            {globalConfigs.whatsappEvolutionUrl && (
                              <span className="ml-2 opacity-80">({globalConfigs.whatsappEvolutionUrl})</span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowEvolutionDiagnosticModal(true)}
                          className="px-3 py-1.5 rounded-xl border border-sky-200 bg-sky-50/90 hover:bg-sky-100 text-sky-900 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                          title="Diagnóstico avançado e logs detalhados de requisições"
                        >
                          <Activity className="w-3.5 h-3.5 text-sky-700" />
                          <span>Diagnóstico & Logs</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleCheckWhatsappStatus}
                          disabled={isLoadingWhatsappStatus || !globalConfigs.whatsappEvolutionUrl}
                          className="px-3 py-1.5 rounded-xl border border-soft hover:bg-warm/40 text-forest text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                          title="Consultar se o WhatsApp está online"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingWhatsappStatus ? "animate-spin text-forest" : ""}`} />
                          <span>{isLoadingWhatsappStatus ? "Verificando..." : "Verificar Status"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleCreateWhatsappInstance}
                          disabled={isCreatingWhatsappInstance || !globalConfigs.whatsappEvolutionUrl}
                          className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                          title="Garante a criação da instância no banco de dados da Evolution API"
                        >
                          {isCreatingWhatsappInstance ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                              <span>Criando...</span>
                            </>
                          ) : (
                            <>
                              <PlusCircle className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Criar Instância</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleConnectWhatsapp}
                          disabled={isConnectingWhatsapp || !globalConfigs.whatsappEvolutionUrl}
                          className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
                          title="Gerar QR Code para escanear com o celular"
                        >
                          {isConnectingWhatsapp ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Gerando QR Code...</span>
                            </>
                          ) : (
                            <>
                              <QrCode className="w-3.5 h-3.5" />
                              <span>Conectar via QR Code</span>
                            </>
                          )}
                        </button>

                        {whatsappState === "open" && (
                          <button
                            type="button"
                            onClick={handleDisconnectWhatsapp}
                            className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-all"
                            title="Desconectar WhatsApp"
                          >
                            Desconectar
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Exibição do QR Code quando disponível */}
                    {whatsappQrCode && (
                      <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-2xl p-6 text-center space-y-4 shadow-sm animate-in fade-in duration-300">
                        <div className="max-w-md mx-auto">
                          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full text-xs font-bold mb-2">
                            <QrCode className="w-4 h-4 text-emerald-700" />
                            <span>Escaneie com seu WhatsApp</span>
                          </div>
                          <h5 className="font-bold text-forest text-base">
                            Conecte o Celular ao Sistema
                          </h5>
                          <ol className="text-xs text-forest/80 text-left list-decimal list-inside space-y-1.5 mt-2 bg-white/80 p-3.5 rounded-xl border border-emerald-200/60 font-medium">
                            <li>Abra o <strong>WhatsApp</strong> no seu smartphone.</li>
                            <li>Toque em <strong>Configurações</strong> (ou no menu de 3 pontinhos ⋮).</li>
                            <li>Selecione <strong>Aparelhos conectados</strong> e depois <strong>Conectar um aparelho</strong>.</li>
                            <li>Aponte a câmera para o QR Code abaixo:</li>
                          </ol>
                        </div>

                        <div className="inline-block p-4 bg-white rounded-2xl shadow-md border border-emerald-200">
                          <img
                            src={
                              whatsappQrCode.startsWith("data:")
                                ? whatsappQrCode
                                : `data:image/png;base64,${whatsappQrCode}`
                            }
                            alt="QR Code WhatsApp Evolution"
                            className="w-56 h-56 object-contain mx-auto"
                          />
                        </div>

                        {whatsappPairingCode && (
                          <div className="max-w-xs mx-auto bg-white p-3 rounded-xl border border-emerald-200 text-center">
                            <span className="text-[10px] uppercase font-bold text-forest/60">
                              Código de Pareamento (Alternativo):
                            </span>
                            <div className="font-mono text-lg font-bold tracking-widest text-emerald-700 mt-1">
                              {whatsappPairingCode}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-center items-center gap-3">
                          <button
                            type="button"
                            onClick={handleConnectWhatsapp}
                            disabled={isConnectingWhatsapp}
                            className="px-4 py-2 bg-forest text-white rounded-xl text-xs font-bold hover:bg-forest/90 transition-all flex items-center gap-1.5 shadow-2xs"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-sun" />
                            <span>Atualizar QR Code</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleCheckWhatsappStatus}
                            disabled={isLoadingWhatsappStatus}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all flex items-center gap-1.5 shadow-2xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Já escaneei, verificar!</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setWhatsappQrCode(null)}
                            className="px-3 py-2 text-forest/60 hover:text-forest text-xs font-bold"
                          >
                            Fechar QR Code
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Campos de Configuração da Evolution API */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* URL da API */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase text-forest/70 ml-2 flex items-center gap-1">
                          <Server className="w-3 h-3 text-forest/60" />
                          <span>URL Base da Evolution API</span>
                        </label>
                        <input
                          type="text"
                          placeholder="https://evolution-api-production-xxx.up.railway.app"
                          value={globalConfigs.whatsappEvolutionUrl || ""}
                          onChange={(e) =>
                            handleUpdateConfiguracoesProperty(
                              "whatsappEvolutionUrl",
                              e.target.value
                            )
                          }
                          onBlur={(e) => {
                            const normalized = normalizeEvolutionUrl(e.target.value);
                            if (normalized !== e.target.value) {
                              handleUpdateConfiguracoesProperty("whatsappEvolutionUrl", normalized);
                            }
                          }}
                          className="text-sm bg-white border border-soft px-3 py-2.5 rounded-xl focus:outline-none focus:border-emerald-600 transition-colors font-mono text-xs"
                        />
                        <span className="text-[10px] text-forest/50 ml-2">
                          Endpoint onde sua instância Evolution está hospedada.
                        </span>
                      </div>

                      {/* Chave API */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase text-forest/70 ml-2 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Lock className="w-3 h-3 text-forest/60" />
                            Chave Global (API Key)
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="text-[10px] text-emerald-700 hover:underline capitalize"
                          >
                            {showApiKey ? "Ocultar" : "Mostrar"}
                          </button>
                        </label>
                        <div className="relative">
                          <input
                            type={showApiKey ? "text" : "password"}
                            placeholder="AUTHENTICATION_API_KEY"
                            value={globalConfigs.whatsappEvolutionApiKey || ""}
                            onChange={(e) =>
                              handleUpdateConfiguracoesProperty(
                                "whatsappEvolutionApiKey",
                                e.target.value
                              )
                            }
                            className="text-sm bg-white border border-soft px-3 py-2.5 rounded-xl focus:outline-none focus:border-emerald-600 transition-colors font-mono text-xs w-full pr-10"
                          />
                        </div>
                        {globalConfigs.whatsappEvolutionApiKey &&
                          (globalConfigs.whatsappEvolutionApiKey.includes("${{") ||
                            globalConfigs.whatsappEvolutionApiKey.includes("secret(")) && (
                            <div className="text-[11px] text-amber-900 bg-amber-50/90 border border-amber-300 p-2.5 rounded-xl mt-1 space-y-1">
                              <p className="font-bold flex items-center gap-1.5 text-amber-900">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                Atenção: Fórmula do Railway detectada!
                              </p>
                              <p className="text-[10px] leading-relaxed text-amber-900/90">
                                Você colou o modelo <code>{"${{secret(...)}}"}</code>. Para obter a chave real: no Railway, abra seu serviço da Evolution API &gt; aba <strong>Variables</strong> &gt; clique no ícone de <strong>olho 👁️</strong> ao lado de <code>AUTHENTICATION_API_KEY</code> para copiar o valor real alfanumérico gerado, ou defina uma senha como <code>acolhemente2026</code>.
                              </p>
                            </div>
                          )}
                        <span className="text-[10px] text-forest/50 ml-2">
                          Chave configurada na variável AUTHENTICATION_API_KEY.
                        </span>
                      </div>

                      {/* Nome da Instância */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold uppercase text-forest/70 ml-2 flex items-center gap-1">
                          <Radio className="w-3 h-3 text-forest/60" />
                          <span>Nome da Instância</span>
                        </label>
                        <input
                          type="text"
                          placeholder="acolhemente"
                          value={globalConfigs.whatsappEvolutionInstance || "acolhemente"}
                          onChange={(e) =>
                            handleUpdateConfiguracoesProperty(
                              "whatsappEvolutionInstance",
                              e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "")
                            )
                          }
                          className="text-sm bg-white border border-soft px-3 py-2.5 rounded-xl focus:outline-none focus:border-emerald-600 transition-colors font-mono text-xs"
                        />
                        <span className="text-[10px] text-forest/50 ml-2">
                          Identificador único da sessão (letras minúsculas e números).
                        </span>
                      </div>
                    </div>

                    {/* Sincronização de Webhook do Sistema */}
                    <div className="bg-white p-4.5 rounded-xl border border-soft space-y-3">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-forest uppercase tracking-wider">
                              Webhook Receptor do Sistema
                            </span>
                            <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-md">
                              Ingress Ativo
                            </span>
                          </div>
                          <p className="text-xs text-forest/70 mt-0.5">
                            A Evolution API enviará eventos de mensagens recebidas, confirmações de entrega e status da conexão para esta URL.
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const webhookUrl = `${window.location.origin}/api/whatsapp/webhook`;
                              navigator.clipboard.writeText(webhookUrl);
                              showToast("URL do Webhook copiada para a área de transferência!", "success");
                            }}
                            className="px-3 py-1.5 rounded-xl border border-soft hover:bg-warm/40 text-forest text-xs font-bold transition-all flex items-center gap-1.5"
                          >
                            <Copy className="w-3.5 h-3.5 text-forest/70" />
                            <span>Copiar URL</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowEvolutionDiagnosticModal(true)}
                            className="px-3 py-1.5 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-900 text-xs font-bold transition-all flex items-center gap-1.5"
                            title="Diagnóstico detalhado dos endpoints /webhook/set e QR Code"
                          >
                            <Activity className="w-3.5 h-3.5 text-sky-700" />
                            <span>Diagnóstico do Webhook</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveTab("notificacoes")}
                            className="px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold transition-all flex items-center gap-1.5"
                            title="Acessar a Central de Mensagens e Régua de Comunicação"
                          >
                            <Bell className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Régua de Mensagens & Tempos</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleConfigureWhatsappWebhook}
                            disabled={isConfiguringWebhook || !globalConfigs.whatsappEvolutionUrl}
                            className="px-3.5 py-1.5 rounded-xl bg-forest text-white hover:bg-forest/90 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                          >
                            {isConfiguringWebhook ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-sun" />
                                <span>Configurando...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5 text-sun" />
                                <span>Configurar Webhook na Instância</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Display da URL */}
                      <div className="bg-warm/30 p-2.5 rounded-lg border border-soft/60 flex items-center justify-between gap-2 font-mono text-xs text-forest/80 overflow-x-auto">
                        <span>{typeof window !== "undefined" ? `${window.location.origin}/api/whatsapp/webhook` : "/api/whatsapp/webhook"}</span>
                        <span className="text-[10px] text-forest/50 shrink-0 font-sans font-semibold">
                          (Rota gerenciada pelo servidor)
                        </span>
                      </div>

                      {whatsappWebhookFeedback && (
                        <div
                          className={`p-3 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2 ${
                            whatsappWebhookFeedback.success
                              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                              : "bg-rose-50 border-rose-200 text-rose-900"
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                            {whatsappWebhookFeedback.success ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            )}
                            <div>
                              <span>{whatsappWebhookFeedback.message}</span>
                              {!whatsappWebhookFeedback.success && (
                                <button
                                  type="button"
                                  onClick={() => setShowEvolutionDiagnosticModal(true)}
                                  className="ml-2 font-bold text-sky-800 underline hover:text-sky-950 inline-flex items-center gap-1"
                                >
                                  Ver Diagnóstico & Logs Detalhados
                                </button>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setWhatsappWebhookFeedback(null)}
                            className="text-forest/40 hover:text-forest text-xs font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      {/* Histórico Recente de Eventos do Webhook */}
                      <div className="pt-2 border-t border-soft/60">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-forest/80 uppercase tracking-wider">
                              Últimos Eventos Recebidos no Webhook ({webhookEventsList.length})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleRefreshWebhookEvents}
                              disabled={isLoadingWebhookEvents}
                              className="text-[11px] text-forest/70 hover:text-forest flex items-center gap-1 font-semibold"
                            >
                              <RefreshCw className={`w-3 h-3 ${isLoadingWebhookEvents ? "animate-spin" : ""}`} />
                              <span>Atualizar</span>
                            </button>
                            {webhookEventsList.length > 0 && (
                              <button
                                type="button"
                                onClick={handleClearWebhookEvents}
                                className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold"
                              >
                                Limpar
                              </button>
                            )}
                          </div>
                        </div>

                        {webhookEventsList.length === 0 ? (
                          <div className="p-3 text-center text-forest/50 text-xs bg-warm/20 rounded-lg border border-dashed border-soft">
                            Nenhum evento registrado ainda. Quando a Evolution API enviar eventos (mensagens, conexão, etc.), eles aparecerão aqui.
                          </div>
                        ) : (
                          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                            {webhookEventsList.slice(0, 8).map((evt) => (
                              <div
                                key={evt.id}
                                className="p-2 bg-warm/20 rounded-lg border border-soft/80 text-[11px] flex items-start justify-between gap-2"
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2 font-bold text-forest">
                                    <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-mono text-[10px]">
                                      {evt.event}
                                    </span>
                                    {evt.sender && (
                                      <span className="text-forest/70 font-mono text-[10px]">
                                        De: {evt.sender}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-forest/80 line-clamp-1">
                                    {evt.summary}
                                  </p>
                                </div>
                                <span className="text-[10px] text-forest/40 font-mono shrink-0">
                                  {new Date(evt.timestamp).toLocaleTimeString("pt-BR")}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Simulador e Teste Prático de Envio */}
                    <div className="bg-emerald-500/5 p-4.5 rounded-xl border border-emerald-500/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Send className="w-4 h-4 text-emerald-600" />
                          <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                            Simulador de Disparo de WhatsApp
                          </h5>
                        </div>
                        <span className="text-[10px] text-emerald-800 font-medium">
                          Valida o envio em tempo real para seu número
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold uppercase text-forest/70 ml-2">
                            WhatsApp de Destino (com DDD)
                          </label>
                          <input
                            type="text"
                            placeholder="(11) 99999-9999"
                            value={testWhatsappPhone}
                            onChange={(e) => setTestWhatsappPhone(e.target.value)}
                            className="text-xs bg-white border border-soft px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-600 transition-colors"
                          />
                        </div>

                        <div className="flex flex-col gap-1 md:col-span-2">
                          <label className="text-[10px] font-semibold uppercase text-forest/70 ml-2">
                            Mensagem de Teste
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Digite uma mensagem..."
                              value={testWhatsappMessage}
                              onChange={(e) => setTestWhatsappMessage(e.target.value)}
                              className="text-xs bg-white border border-soft px-3 py-2 rounded-xl focus:outline-none focus:border-emerald-600 transition-colors flex-1"
                            />
                            <button
                              type="button"
                              onClick={handleSendTestWhatsapp}
                              disabled={isSendingTestWhatsapp || !testWhatsappPhone || !globalConfigs.whatsappEvolutionUrl}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-all shadow-2xs flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                            >
                              {isSendingTestWhatsapp ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Enviando...</span>
                                </>
                              ) : (
                                <>
                                  <Send className="w-3.5 h-3.5" />
                                  <span>Enviar Teste</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {testWhatsappResult && (
                        <div
                          className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                            testWhatsappResult.success
                              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                              : "bg-rose-50 border-rose-200 text-rose-900"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {testWhatsappResult.success ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            )}
                            <div>
                              <p className="font-bold">{testWhatsappResult.message}</p>
                              {testWhatsappResult.formattedNumber && (
                                <p className="text-[10px] opacity-80 font-mono mt-0.5">
                                  Enviado para: {testWhatsappResult.formattedNumber}
                                </p>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setTestWhatsappResult(null)}
                            className="text-forest/40 hover:text-forest text-xs font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Guia Rápido de Deploy da Evolution API (Colapsável) */}
                    <div className="border border-soft/80 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowEvolutionGuide(!showEvolutionGuide)}
                        className="w-full px-4 py-3 bg-warm/20 hover:bg-warm/30 flex items-center justify-between text-left transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <HelpCircle className="w-4 h-4 text-forest/70" />
                          <span className="text-xs font-bold text-forest">
                            Como hospedar a Evolution API em 2 minutos (Railway ou Docker VPS)?
                          </span>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-forest/60 transition-transform duration-200 ${
                            showEvolutionGuide ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {showEvolutionGuide && (
                        <div className="p-4 bg-white space-y-3 text-xs text-forest/80 leading-relaxed border-t border-soft/60">
                          <p>
                            A <strong>Evolution API</strong> é um servidor open-source de WhatsApp em Node.js de alta performance. Ela não exige aprovações da Meta e pode ser implantada com 1 clique.
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            <div className="p-3 rounded-lg bg-warm/30 border border-soft">
                              <h6 className="font-bold text-forest text-xs mb-1 flex items-center gap-1.5">
                                <span>Opção 1: Railway (1-Clique sem servidor)</span>
                              </h6>
                              <p className="text-[11px] text-forest/70 mb-2">
                                Ideal para subir em poucos minutos com URL HTTPS automática:
                              </p>
                              <ol className="list-decimal list-inside text-[11px] space-y-1 text-forest/80 font-medium">
                                <li>Acesse o template oficial da Evolution API no Railway.</li>
                                <li>Defina a variável <code>AUTHENTICATION_API_KEY</code> com sua senha secreta.</li>
                                <li>Copie a URL pública gerada (ex: <code>https://evolution-xxx.up.railway.app</code>) e cole no campo acima.</li>
                              </ol>
                            </div>

                            <div className="p-3 rounded-lg bg-warm/30 border border-soft">
                              <h6 className="font-bold text-forest text-xs mb-1 flex items-center gap-1.5">
                                <span>Opção 2: Docker / VPS Própria</span>
                              </h6>
                              <p className="text-[11px] text-forest/70 mb-2">
                                Para máxima economia (R$ 20/mês em qualquer VPS):
                              </p>
                              <code className="block p-2 bg-forest/5 rounded border border-soft font-mono text-[10px] text-forest overflow-x-auto">
                                docker run -d --name evolution-api -p 8080:8080 -e AUTHENTICATION_API_KEY=sua_chave atendai/evolution-api:v2.1.0
                              </code>
                            </div>
                          </div>
                        </div>
                      )}
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
                        <DebouncedTextArea
                          className="text-sm bg-white border border-soft px-4 py-3 rounded-xl focus:outline-none focus:border-sun-dark transition-colors resize-none h-28"
                          placeholder="Uma iniciativa focada em democratizar o acesso à saúde mental..."
                          value={globalConfigs.footerDescricao || ""}
                          onChange={(val) =>
                            handleUpdateConfiguracoesProperty(
                              "footerDescricao",
                              val,
                            )
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-1 justify-between">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold uppercase text-forest/70/60 ml-2">
                            Cidades de Atuação
                          </label>
                          <DebouncedInput
                            className="text-sm bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                            placeholder="Ex: Brasil • São Paulo • online"
                            value={globalConfigs.cidadesRodape || ""}
                            onChange={(val) =>
                              handleUpdateConfiguracoesProperty(
                                "cidadesRodape",
                                val,
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
                          <DebouncedInput
                            type="email"
                            className="text-sm bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                            placeholder="Ex: contato@acolhemente.com"
                            value={globalConfigs.footerEmail || ""}
                            onChange={(val) =>
                              handleUpdateConfiguracoesProperty(
                                "footerEmail",
                                val,
                              )
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold uppercase text-forest/70/60 ml-2">
                            Telefone de Contato do Rodapé
                          </label>
                          <DebouncedInput
                            className="text-sm bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                            placeholder="Ex: (61) 9999-9999"
                            value={globalConfigs.footerTelefone || ""}
                            onChange={(val) =>
                              handleUpdateConfiguracoesProperty(
                                "footerTelefone",
                                val,
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
                          <DebouncedInput
                            type="url"
                            className="text-sm bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                            placeholder="Ex: https://instagram.com/acolhemente"
                            value={globalConfigs.footerInstagram || ""}
                            onChange={(val) =>
                              handleUpdateConfiguracoesProperty(
                                "footerInstagram",
                                val,
                              )
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold uppercase text-forest/70/60 ml-2">
                            Link do LinkedIn
                          </label>
                          <DebouncedInput
                            type="url"
                            className="text-sm bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                            placeholder="Ex: https://linkedin.com/company/acolhemente"
                            value={globalConfigs.footerLinkedin || ""}
                            onChange={(val) =>
                              handleUpdateConfiguracoesProperty(
                                "footerLinkedin",
                                val,
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
                          <DebouncedInput
                            type="url"
                            className="text-sm bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                            placeholder="Ex: https://acolhemente.com/termos"
                            value={globalConfigs.urlTermosUso || ""}
                            onChange={(val) =>
                              handleUpdateConfiguracoesProperty(
                                "urlTermosUso",
                                val,
                              )
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold uppercase text-forest/70/60 ml-2">
                            Link - Política de Privacidade
                          </label>
                          <DebouncedInput
                            type="url"
                            className="text-sm bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                            placeholder="Ex: https://acolhemente.com/privacidade"
                            value={globalConfigs.urlPoliticaPrivacidade || ""}
                            onChange={(val) =>
                              handleUpdateConfiguracoesProperty(
                                "urlPoliticaPrivacidade",
                                val,
                              )
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-semibold uppercase text-forest/70/60 ml-2">
                            Link - Contrato de Prestação
                          </label>
                          <DebouncedInput
                            type="url"
                            className="text-sm bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                            placeholder="Ex: https://acolhemente.com/contrato"
                            value={globalConfigs.urlContratoPrestacao || ""}
                            onChange={(val) =>
                              handleUpdateConfiguracoesProperty(
                                "urlContratoPrestacao",
                                val,
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
                            a.atribuicaoStatus === "Aceito" &&
                            a.status !== "Alta" &&
                            a.status !== "Rejeitado" &&
                            a.status !== "Encerrado" &&
                            a.status !== "Desistência" &&
                            a.status !== "Cancelado",
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
                            a.status === "Encerrado" ||
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
                        p.atribuicaoStatus === "Aceito" &&
                        p.status !== "Alta" &&
                        p.status !== "Rejeitado" &&
                        p.status !== "Encerrado" &&
                        p.status !== "Desistência" &&
                        p.status !== "Cancelado",
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
                            p.atribuicaoStatus === "Aceito" &&
                            p.status !== "Alta" &&
                            p.status !== "Rejeitado" &&
                            p.status !== "Encerrado" &&
                            p.status !== "Desistência" &&
                            p.status !== "Cancelado",
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
              {(() => {
                const pacsAtivos = meusPacientes.filter(
                  (p) =>
                    p.atribuicaoStatus === "Aceito" &&
                    p.status !== "Alta" &&
                    p.status !== "Rejeitado" &&
                    p.status !== "Encerrado" &&
                    p.status !== "Desistência" &&
                    p.status !== "Cancelado",
                );
                const horasAtivas = calculateHorasMensais(pacsAtivos);
                const maxHoras = parseMaxHorasDisponiveis(profile?.horasDisponiveis);
                const cotaDeclarada = normalizeHorasDisponiveis(profile?.horasDisponiveis) || "Não informada";
                const horasRestantes = maxHoras > 0 ? Math.max(0, maxHoras - horasAtivas) : 0;
                const percentualUso = maxHoras > 0 ? Math.min(100, Math.round((horasAtivas / maxHoras) * 100)) : 0;

                return (
                  <div className="bg-white p-6 rounded-3xl border border-soft shadow-sm flex flex-col justify-between gap-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-serif text-xl font-semibold text-forest">
                          Horas Mensais
                        </h3>
                        <p className="text-xs text-forest/60">Ativas x Cota Declarada</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-sun/50 text-forest flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between">
                        <div className="text-3xl font-extrabold text-forest">
                          {horasAtivas}<span className="text-lg font-bold text-forest/70">h ativas/mês</span>
                        </div>
                        {maxHoras > 0 && (
                          <span className="text-xs font-bold text-forest/80 bg-warm px-2.5 py-1 rounded-lg border border-soft">
                            Cota Máx: {maxHoras}h/mês
                          </span>
                        )}
                      </div>

                      {/* Barra de Progresso da Cota */}
                      {maxHoras > 0 && (
                        <div className="space-y-1">
                          <div className="w-full bg-soft/60 h-2.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all rounded-full ${
                                percentualUso >= 100
                                  ? "bg-red-500"
                                  : percentualUso >= 80
                                  ? "bg-amber-500"
                                  : "bg-emerald-600"
                              }`}
                              style={{ width: `${percentualUso}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] font-medium text-forest/60">
                            <span>{percentualUso}% da cota máx. utilizada</span>
                            <span className="font-semibold text-forest/80">Faixa: {cotaDeclarada}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Horas Restantes e Status */}
                    <div className="border-t border-soft pt-3 mt-1 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-forest/80 uppercase tracking-wider text-[10px]">
                          Restantes para Cota
                        </span>
                        <span className={`font-extrabold text-xs px-2.5 py-0.5 rounded-md ${
                          maxHoras === 0
                            ? "bg-gray-100 text-gray-700"
                            : horasRestantes === 0
                            ? "bg-red-100 text-red-800"
                            : horasRestantes <= 2
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {maxHoras === 0
                            ? "Sem Cota Definida"
                            : horasRestantes === 0
                            ? "Cota Atingida (0h)"
                            : `${horasRestantes}h disponíveis`}
                        </span>
                      </div>

                      <p className="text-[11px] text-forest/75 leading-tight">
                        {maxHoras === 0 ? (
                          <span>Defina sua disponibilidade de horas nas configurações do perfil para acompanhar o saldo da cota.</span>
                        ) : horasRestantes === 0 ? (
                          <span className="text-red-700 font-semibold">
                            Você atingiu o limite máximo da cota declarada ({cotaDeclarada}). Todos os horários estão preenchidos.
                          </span>
                        ) : (
                          <span>
                            Com {pacsAtivos.length} paciente(s) ativo(s) ({horasAtivas}h/mês), restam <strong>{horasRestantes}h</strong> de atendimento por mês para atingir o limite da sua cota ({cotaDeclarada}).
                          </span>
                        )}
                      </p>

                      {/* Botão de Ação: Aumentar Horas Disponíveis */}
                      <div className="pt-2.5 border-t border-soft/60">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedNovaHora(normalizeHorasDisponiveis(profile?.horasDisponiveis) || "4 a 8 horas/mês");
                            setCustomNovaHora("");
                            setShowAumentarHorasModal(true);
                          }}
                          className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <TrendingUp className="w-4 h-4 text-emerald-200" />
                          Aumentar Horas Disponíveis
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
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
                filteredMeusPacientes.map((p, pIdx) => {
                  const entryDate = p.createdAt
                    ? formatDateTimeSafely(p.createdAt, "Desconhecida")
                    : "Desconhecida";

                  return (
                    <div
                      key={p.id}
                      className="bg-white p-6 rounded-[2rem] shadow-md border border-soft hover:shadow-lg transition-all duration-300 flex flex-col gap-5 relative group"
                    >
                      {/* Header Row */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-forest/70 bg-warm px-2 py-0.5 rounded-full border border-soft">
                              #{pIdx + 1}
                            </span>
                            <span className="text-[10px] font-bold text-forest/70 bg-warm px-2.5 py-1 rounded-full uppercase tracking-wider">
                              Paciente
                            </span>
                          </div>
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
                              {p.atribuicaoStatus === "Aceito" ? (
                                p.telefone
                              ) : (
                                <span className="text-amber-800 text-[11px] bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1 font-medium">
                                  <Lock className="w-3 h-3 text-amber-600" />
                                  Oculto até o aceite
                                </span>
                              )}
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
        <ProfissionalEsteiraTarefas
          meusPacientes={meusPacientes}
          profile={profile!}
          treatedItemIds={profTreatedItemIds}
          onToggleTreatedItem={handleToggleProfTreatedItem}
          onMarkAllEntityTreated={handleMarkAllProfEntityTreated}
          onSelectPaciente={(paciente) => {
            setSelectedCard(paciente as any);
            setActiveTab("pacientes");
          }}
          onNavigateToTab={(tab) => setActiveTab(tab)}
          onAcceptPaciente={handleProfAcceptPaciente}
          onDevolverPaciente={(paciente) => {
            setDevolverModalConfig({
              isOpen: true,
              pacienteId: paciente.id,
              pacienteName:
                paciente.nomeDesejado ||
                paciente.nomeCivil ||
                paciente.nome ||
                "Paciente",
            });
          }}
          formatDateSafely={formatDateSafely}
          formatDateTimeSafely={formatDateTimeSafely}
        />
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
              {/* Profile Photo upload component with Auto-Face Centering */}
              <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-soft">
                <div 
                  className="w-28 h-28 rounded-full overflow-hidden bg-forest/10 border-4 border-sun flex-shrink-0 flex items-center justify-center relative group shadow-sm cursor-pointer"
                  onClick={() => {
                    if (profile.photoUrl) {
                      setRawPhotoToCrop(profile.photoUrl);
                      setPhotoCropModalOpen(true);
                    }
                  }}
                  title={profile.photoUrl ? "Clique para ajustar o enquadramento" : "Foto de Perfil"}
                >
                  {profile.photoUrl ? (
                    <img
                      src={profile.photoUrl}
                      alt={profile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-14 h-14 text-forest/70" />
                  )}

                  {profile.photoUrl && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold gap-1 text-center p-1">
                      <Sparkles className="w-4 h-4 text-sun" />
                      <span>Ajustar Rosto</span>
                    </div>
                  )}

                  {isAutoCroppingPhoto && (
                    <div className="absolute inset-0 bg-forest/80 flex items-center justify-center text-white">
                      <Loader2 className="w-6 h-6 animate-spin text-sun" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2.5 items-center sm:items-start flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-serif text-xl font-medium text-forest">
                      Foto de Perfil & Divulgação
                    </h4>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase rounded-full">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      Auto-Centralização Facial
                    </span>
                  </div>

                  <p className="text-xs text-forest/60 max-w-lg text-center sm:text-left">
                    Selecione sua foto. Nosso sistema detecta e centraliza o rosto no círculo automaticamente para que seu perfil fique sempre perfeito e profissional.
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <label className="px-4 py-2 bg-forest hover:bg-forest/90 text-white text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-xs hover:shadow flex items-center gap-2">
                      <Upload className="w-3.5 h-3.5" />
                      {profile.photoUrl ? "Trocar Foto" : "Fazer Upload de Foto"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handlePhotoFileSelected(file);
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>

                    {profile.photoUrl && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setRawPhotoToCrop(profile.photoUrl);
                            setPhotoCropModalOpen(true);
                          }}
                          className="px-3.5 py-2 bg-warm hover:bg-soft text-forest text-xs font-bold rounded-xl transition-colors border border-soft flex items-center gap-1.5"
                          title="Ajustar zoom, rotação e posição manual do círculo"
                        >
                          <Sliders className="w-3.5 h-3.5 text-forest/70" />
                          Ajustar Enquadramento
                        </button>

                        <button
                          type="button"
                          onClick={handleAutoCenterCurrentPhoto}
                          disabled={isAutoCroppingPhoto}
                          className="px-3.5 py-2 bg-sun/20 hover:bg-sun/30 text-forest text-xs font-bold rounded-xl transition-colors border border-sun-dark/20 flex items-center gap-1.5"
                          title="Recalcular centralização automática do rosto com IA"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-sun-dark" />
                          Auto-Centralizar com IA
                        </button>
                      </>
                    )}
                  </div>
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
                  <div className="col-span-1 sm:col-span-2 bg-warm/30 p-4 rounded-xl border border-soft space-y-2">
                    <label className="text-xs uppercase font-bold tracking-wider text-forest/70 flex items-center justify-between">
                      <span>Profissão / Atuação Principal *</span>
                      <span className="text-[10px] text-forest/50 font-normal">Ex: Psicólogo(a), Terapeuta, Psicanalista...</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <select
                        value={
                          ["Psicólogo(a)", "Psicólogo(a) Clínico(a)", "Psicanalista", "Terapeuta", "Terapeuta Holístico(a)", "Psicopedagogo(a)"].includes(profile.profissao)
                            ? profile.profissao
                            : profile.profissao ? "Outro" : ""
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== "Outro") {
                            setProfile({ ...profile, profissao: val });
                          }
                        }}
                        className="w-full px-4 py-3 bg-white border border-soft rounded-xl focus:outline-none focus:border-sun-dark text-sm text-forest"
                      >
                        <option value="">Selecione uma profissão...</option>
                        <option value="Psicólogo(a)">Psicólogo(a)</option>
                        <option value="Psicólogo(a) Clínico(a)">Psicólogo(a) Clínico(a)</option>
                        <option value="Psicanalista">Psicanalista</option>
                        <option value="Terapeuta">Terapeuta</option>
                        <option value="Terapeuta Holístico(a)">Terapeuta Holístico(a)</option>
                        <option value="Psicopedagogo(a)">Psicopedagogo(a)</option>
                        <option value="Outro">Outra opção (digitar ao lado)</option>
                      </select>
                      <DebouncedInput
                        type="text"
                        value={profile.profissao || ""}
                        placeholder="Nome exato da profissão..."
                        onChange={(val) => setProfile({ ...profile, profissao: val })}
                        className="w-full px-4 py-3 bg-white border border-soft rounded-xl focus:outline-none focus:border-sun-dark text-sm text-forest"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs uppercase font-bold tracking-wider text-forest/60">
                      CRP / Conselho Profissional (Se houver)
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
                      Data de Admissão no Projeto
                    </label>
                    <DebouncedInput
                      type="date"
                      value={
                        profile.dataAdmissao
                          ? String(profile.dataAdmissao).substring(0, 10)
                          : profile.createdAt
                            ? parseDateSafely(profile.createdAt).toISOString().substring(0, 10)
                            : ""
                      }
                      onChange={(val) => {
                        const newVenc = val
                          ? new Date(new Date(val).getTime() + 7 * 86400000).toISOString()
                          : profile.vencimentoPagamento;
                        setProfile({
                          ...profile,
                          dataAdmissao: val,
                          vencimentoPagamento: newVenc,
                        });
                      }}
                      className="w-full mt-2 px-4 py-3 bg-warm/50 border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors text-sm text-forest"
                    />
                    <span className="text-[10px] text-forest/50 mt-1 block">
                      Data de admissão. Prazo de 7 dias para o 1º pagamento até{" "}
                      {profile.vencimentoPagamento
                        ? formatDateSafely(profile.vencimentoPagamento)
                        : "7 dias após a admissão"}.
                    </span>
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
                      value={normalizeHorasDisponiveis(profile.horasDisponiveis) || "2 a 4 horas/mês"}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          horasDisponiveis: e.target.value,
                        })
                      }
                      className="w-full mt-2 px-4 py-3 bg-warm/50 border border-soft rounded-xl focus:outline-none focus:border-sun-dark cursor-pointer text-sm text-forest"
                    >
                      <option value="2 a 4 horas/mês">2 a 4 horas/mês</option>
                      <option value="4 a 8 horas/mês">4 a 8 horas/mês</option>
                      <option value="10 a 16 horas/mês">10 a 16 horas/mês</option>
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
                      profissao: profile.profissao || "",
                      telefone: profile.telefone,
                      crp: profile.crp,
                      cpf: profile.cpf,
                      genero: profile.genero || "",
                      deficiencia: profile.deficiencia || "",
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
                    const profTitulo = profile.profissao || (profile.especialidade ? `Profissional - ${profile.especialidade}` : "Profissional de Saúde");
                    const shareTitle = `${profile.name} - ${profTitulo}`;
                    const shareText = `Conheça meu perfil profissional no Projeto AcolheMente Saúde (${profTitulo}): ${shareLink}`;

                    return (
                      <div className="bg-warm/60 border border-soft rounded-2xl p-4 flex flex-col gap-2.5 text-xs w-full sm:max-w-lg">
                        <div className="flex items-center justify-between gap-2 border-b border-soft/50 pb-2">
                          <div>
                            <span className="font-bold text-forest block text-sm">{profile.name}</span>
                            <span className="text-[11px] text-forest/70 font-medium">{profTitulo}</span>
                          </div>
                          <span className="px-2.5 py-0.5 bg-sun text-forest font-bold text-[10px] rounded-md uppercase tracking-wide">
                            Perfil Público
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                          <div className="truncate text-forest/70 max-w-[220px] font-mono select-all shrink leading-tight">
                            {shareLink}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(shareLink);
                                alert(`Link do perfil de ${profile.name} (${profTitulo}) copiado com sucesso!`);
                              }}
                              className="px-3 py-2 bg-warm hover:bg-soft text-forest font-bold text-[10px] uppercase rounded-xl transition-colors border border-soft shadow-xs cursor-pointer"
                            >
                              Copiar Link
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (navigator.share) {
                                  navigator.share({
                                    title: shareTitle,
                                    text: shareText,
                                    url: shareLink,
                                  }).catch(() => {});
                                } else {
                                  navigator.clipboard.writeText(`${shareTitle}\n${shareText}`).then(() => {
                                    alert("Dados do perfil e link copiados com sucesso!");
                                  });
                                }
                              }}
                              className="px-3 py-2 bg-sun-dark text-forest font-bold text-[10px] uppercase rounded-xl hover:bg-sun-dark/85 transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              Compartilhar
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
              </div>
            </div>
          </div>
        </div>
      ) : currentRole === "profissional" && activeTab === "pagamentosProfissional" ? (
        <div className="flex-1 overflow-auto p-6 md:p-8 flex flex-col gap-8 slide-up font-sans">
          <div className="max-w-4xl w-full mx-auto space-y-8">
            {/* Header Banner */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white px-8 py-6 rounded-[2rem] shadow-sm border border-soft">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-sun-light flex items-center justify-center text-forest border border-sun-dark/30 shrink-0">
                  <CreditCard className="w-6 h-6 text-forest" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl text-forest font-bold">
                    {profile?.isCortesia ? "Status de Convidado & Isenção de Taxa" : "Gerenciar Meus Pagamentos & Taxa Associativa"}
                  </h2>
                  <p className="text-xs text-forest/70 mt-1">
                    {profile?.isCortesia
                      ? "Você está cadastrado(a) na plataforma como Profissional Convidado, com isenção total de mensalidades."
                      : "Acompanhe seu status financeiro, prazos de vencimento e gerencie suas contribuições."}
                  </p>
                </div>
              </div>
            </div>

            {/* Main Status & Management Card */}
            {(() => {
              const taxaVal = profile?.taxaAssociativaMensal || globalConfigs.taxaAssociativaMensal || "29,90";
              const admDateStr = profile?.dataAdmissao || profile?.createdAt;
              const admDate = parseDateSafely(admDateStr);
              const vencDateStr = profile?.vencimentoPagamento;
              const vencDate = vencDateStr ? parseDateSafely(vencDateStr) : new Date(admDate.getTime() + 7 * 86400000);
              const now = new Date();
              const diffTime = vencDate.getTime() - now.getTime();
              const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 3600 * 24)));

              const isCortesia = profile?.isCortesia === true;
              const isPago = profile?.statusPagamento === "pago";
              const isCancelRequested = profile?.solicitacaoCancelamento === true;
              const isTrialActive = !isPago && !isCancelRequested && !isCortesia && diffDays > 0;

              return (
                <div className="space-y-6">
                  {/* Status Hero Box */}
                  <div
                    className={`p-8 rounded-[2rem] border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden ${
                      isCortesia
                        ? "bg-gradient-to-br from-purple-900 via-[#2d114d] to-forest text-white border-purple-500/40"
                        : isCancelRequested
                          ? "bg-amber-500/10 border-amber-300"
                          : isPago
                            ? "bg-emerald-900 text-white border-emerald-700"
                            : isTrialActive
                              ? "bg-gradient-to-br from-forest via-[#1d3c2b] to-[#12281c] text-white border-sun-dark/40"
                              : "bg-red-950 text-white border-red-800"
                    }`}
                  >
                    <div className="space-y-3 z-10 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {isCortesia ? (
                          <span className="px-3 py-1 bg-purple-300 text-purple-950 text-[10px] font-black rounded-full uppercase tracking-wider flex items-center gap-1 shadow-xs">
                            <Gift className="w-3.5 h-3.5 text-purple-900" />
                            🎁 Convidado Especial • Isenção Cortesia
                          </span>
                        ) : isCancelRequested ? (
                          <span className="px-3 py-1 bg-amber-200 text-amber-900 text-[10px] font-bold rounded-full uppercase tracking-wider">
                            Solicitação de Desligamento Registrada
                          </span>
                        ) : isPago ? (
                          <span className="px-3 py-1 bg-emerald-400/20 text-emerald-200 text-[10px] font-bold rounded-full uppercase tracking-wider border border-emerald-400/30">
                            Assinatura Ativa & Em Dia
                          </span>
                        ) : isTrialActive ? (
                          <span className="px-3 py-1 bg-sun text-forest text-[10px] font-black uppercase tracking-wider rounded-full shadow-xs">
                            ⏰ Prazo para o 1º Pagamento (7 dias)
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-red-400/20 text-red-200 text-[10px] font-bold rounded-full uppercase tracking-wider border border-red-400/30">
                            Primeira Taxa Pendente / Vencida
                          </span>
                        )}
                      </div>

                      <h3
                        className={`font-serif text-2xl md:text-3xl font-bold ${
                          isCancelRequested ? "text-amber-950" : "text-white"
                        }`}
                      >
                        {isCortesia
                          ? "Sua conta está ativa na plataforma como Profissional Convidado"
                          : isCancelRequested
                            ? "Sua solicitação de saída está em análise"
                            : isPago
                              ? "Sua taxa associativa está quitada"
                              : isTrialActive
                                ? `Seu 1º pagamento vence em ${diffDays} dia(s) (${formatDateSafely(vencDate)})`
                                : "O prazo para o primeiro pagamento expirou"}
                      </h3>

                      <p
                        className={`text-xs md:text-sm leading-relaxed max-w-xl ${
                          isCancelRequested ? "text-amber-900/90" : "text-white/85"
                        }`}
                      >
                        {isCortesia
                          ? "A Gestão habilitou a sua conta na modalidade Profissional Convidado. Você possui isenção completa de cobranças e taxas associativas. Não há nenhum aviso ou cobrança de pagamento pendente, e você pode utilizar a plataforma e atender pacientes normalmente."
                          : isCancelRequested
                            ? `Sua solicitação enviada em ${formatDateSafely(profile?.dataSolicitacaoCancelamento, "breve")} está sendo processada pela Gestão. Uma entrevista de desligamento será agendada.`
                            : isPago
                              ? `Agradecemos sua parceria! Sua contribuição mensal de R$ ${taxaVal} mantém os servidores, equipe de suporte e atrai novos pacientes para o seu perfil.`
                              : isTrialActive
                                ? `O vencimento da sua primeira taxa associativa será em ${formatDateSafely(vencDate)} (${diffDays} dia(s) restante(s)).`
                                : `Para continuar atendendo pacientes e mantendo seu perfil visível no catálogo oficial, efetue o pagamento da sua taxa associativa de R$ ${taxaVal}/mês.`}
                      </p>
                    </div>

                    {/* Action Side Box */}
                    <div className="w-full md:w-auto bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 flex flex-col items-center justify-center text-center shrink-0 min-w-[240px] z-10">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sun-light">
                        Taxa Associativa
                      </span>
                      <div className="flex items-baseline gap-1 my-1">
                        <span className="text-sm font-bold text-sun">R$</span>
                        <span className="text-3xl font-extrabold text-white font-serif">
                          {isCortesia ? "0,00" : taxaVal}
                        </span>
                        <span className="text-xs text-white/70">/mês</span>
                      </div>

                      {isCortesia ? (
                        <div className="w-full mt-3 py-2.5 px-4 bg-purple-200/20 text-purple-200 border border-purple-300/30 rounded-xl font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-2">
                          <Gift className="w-4 h-4 text-purple-300" />
                          Pagamento Desabilitado (Isento)
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowCheckoutModal(true)}
                          className="w-full mt-3 py-3 px-5 bg-sun hover:bg-sun-dark text-forest rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4 text-forest" />
                          {isPago ? "Alterar / Renovar Pagamento" : "Efetuar Pagamento Agora"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Information Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-3xl border border-soft shadow-xs space-y-2">
                      <span className="text-[10px] font-bold uppercase text-forest/50 tracking-wider">
                        Data de Admissão
                      </span>
                      <p className="text-lg font-bold text-forest flex items-center gap-2">
                        <Clock className="w-5 h-5 text-forest/60" />
                        {formatDateSafely(admDate)}
                      </p>
                      <p className="text-xs text-forest/60">
                        Data de aprovação da sua entrada no projeto.
                      </p>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-soft shadow-xs space-y-2">
                      <span className="text-[10px] font-bold uppercase text-forest/50 tracking-wider">
                        Data de Vencimento
                      </span>
                      <p className="text-lg font-bold text-forest flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-amber-600" />
                        {isCortesia ? "Isento (Sem vencimento)" : formatDateSafely(vencDate)}
                      </p>
                      <p className="text-xs text-forest/60">
                        {isCortesia ? "Modalidade Cortesia / Convidado Especial." : "7 dias após a data de admissão."}
                      </p>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-soft shadow-xs space-y-2">
                      <span className="text-[10px] font-bold uppercase text-forest/50 tracking-wider">
                        Status Atual
                      </span>
                      <p className="text-lg font-bold text-forest flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        {isCortesia
                          ? "Cortesia / Isento"
                          : isPago
                            ? "Pago / Ativo"
                            : isCancelRequested
                              ? "Desligamento Solicitado"
                              : isTrialActive
                                ? `Aguardando 1º Pagamento (${diffDays}d restantes)`
                                : "Aguardando Pagamento"}
                      </p>
                      <p className="text-xs text-forest/60">
                        {isCortesia ? "Isenção total concedida pela Gestão." : isPago ? "Sua conta está regularizada." : "Sem fidelidade ou multa."}
                      </p>
                    </div>
                  </div>

                  {/* Offboarding Request Section */}
                  <div className="bg-white p-8 rounded-[2rem] border border-soft shadow-xs space-y-6">
                    <div className="border-b border-soft pb-4">
                      <h4 className="font-serif text-xl font-bold text-forest flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-forest/70" />
                        Solicitação de Saída do Projeto
                      </h4>
                      <p className="text-xs text-forest/70 mt-1">
                        Assim como na entrada, os profissionais que desejam sair passam por uma breve entrevista de desligamento com a Gestão.
                      </p>
                    </div>

                    {isCancelRequested ? (
                      <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 space-y-4">
                        <p className="text-xs text-amber-950 leading-relaxed font-medium">
                          ⚠️ <strong>Sua solicitação de saída está registrada.</strong>{" "}
                          A equipe de Gestão entrará em contato para agendar a entrevista de desligamento. Caso tenha mudado de ideia e deseje continuar no projeto, você pode cancelar o pedido a qualquer momento.
                        </p>
                        <button
                          onClick={async () => {
                            if (!profile?.uid) return;
                            try {
                              await updateDoc(doc(db, "users", profile.uid), {
                                solicitacaoCancelamento: false,
                                motivoCancelamento: "",
                                statusPagamento: "ativo",
                              });
                              setProfile((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      solicitacaoCancelamento: false,
                                      motivoCancelamento: "",
                                      statusPagamento: "ativo",
                                    }
                                  : null,
                              );
                              alert("Solicitação de saída desfeita com sucesso!");
                            } catch (err) {
                              alert("Erro ao desfazer solicitação de saída.");
                            }
                          }}
                          className="px-5 py-2.5 bg-forest text-white rounded-xl text-xs font-bold hover:bg-forest/90 transition-all shadow-sm cursor-pointer"
                        >
                          Desfazer Solicitação de Saída e Manter Perfil
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-warm/30 p-6 rounded-2xl border border-soft/60">
                        <div className="space-y-1">
                          <h5 className="text-sm font-bold text-forest">
                            Deseja solicitar o seu desligamento do projeto?
                          </h5>
                          <p className="text-xs text-forest/70">
                            Ao confirmar, sua solicitação será encaminhada para a Gestão agendar a entrevista de desligamento.
                          </p>
                        </div>
                        <button
                          onClick={() => setShowCancelModal(true)}
                          className="px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200/80 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2"
                        >
                          <LogOut className="w-4 h-4" />
                          Solicitar Saída do Projeto
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      ) : isMasterOrTriagem && activeTab === "tarefas" ? (
        <GestaoEsteiraTarefas
          acolhimentos={acolhimentos}
          profissionaisLeads={profissionaisLeads}
          profissionaisAtivos={profissionaisAtivos}
          empresasLeads={empresasLeads}
          solicitacoes={solicitacoes}
          doacoes={doacoes}
          complianceMessages={complianceMessages}
          profissionaisAtCapacity={profissionaisAtCapacity}
          currentRole={currentRole}
          treatedItemIds={treatedItemIds}
          onToggleTreatedItem={handleToggleTreatedItem}
          onMarkAllEntityTreated={handleMarkAllEntityTreated}
          onSelectAcolhimento={(card) => {
            setSelectedCard(card);
            setIsEditingCard(false);
          }}
          onSelectProfissional={(prof) => {
            setSelectedProfissional(prof);
          }}
          onSelectEmpresa={(emp) => {
            setSelectedEmpresa(emp);
          }}
          onNavigateToTab={(tab) => {
            setActiveTab(tab);
          }}
          formatDateSafely={formatDateSafely}
          formatDateTimeSafely={formatDateTimeSafely}
        />
      ) : activeTab === "kanban" || activeTab === "pacientesAcolhidos" ? (
        <div className="flex-1 flex flex-col h-full bg-warm overflow-hidden">
          <div className="flex flex-wrap justify-between items-center gap-3 px-6 pt-6 pb-2 shrink-0">
            <div className="flex items-center gap-3">
              <h2 className="font-serif text-2xl text-forest flex items-center gap-2">
                {activeTab === "kanban" ? "Triagem" : "Pacientes"}
              </h2>
              {isMasterOrTriagem && (
                <button
                  type="button"
                  onClick={() => setShowNovoPacienteModal(true)}
                  className="px-3.5 py-2 bg-forest text-white hover:bg-forest/90 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                  title="Cadastrar paciente manualmente na triagem"
                >
                  <UserPlus className="w-4 h-4 text-sun" />
                  <span>Incluir Paciente (Manual)</span>
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Seletor de Ordenação por Entrada / Cadastro */}
              <div className="bg-white border border-soft rounded-full p-1 flex items-center shadow-xs">
                <button
                  type="button"
                  onClick={() => setPatientSortOrder("fifo")}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    patientSortOrder === "fifo"
                      ? "bg-sun text-forest shadow-xs font-bold"
                      : "text-forest/60 hover:text-forest"
                  }`}
                  title="Organizar por Ordem de Cadastro / Entrada na Plataforma (Mais antigos no topo)"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Ordem de Entrada (FIFO)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPatientSortOrder("recent")}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    patientSortOrder === "recent"
                      ? "bg-sun text-forest shadow-xs font-bold"
                      : "text-forest/60 hover:text-forest"
                  }`}
                  title="Organizar por Mais Recentes primeiro"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span>Mais Recentes</span>
                </button>
              </div>
            </div>
          </div>

          {/* Kanban Board */}
          <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
            <div className="flex h-full gap-6 shrink-0 w-max items-start">
              {visibleColumns.map((col) => {
                  const colCards = filteredAcolhimentos
                    .filter((a) => {
                      const cardStatus = a.status || "Aguardando Avaliação";
                      const cardInStandby = isCardInStandby(a);
                      const isDesligadoOrFinal =
                        cardStatus === "Alta" ||
                        cardStatus === "Inativo" ||
                        cardStatus === "Desligado" ||
                        a.desligado === true ||
                        a.statusInativacao === "Inativo" ||
                        a.statusInativacao === "Desligado";
                      const isInactiveOrAlta = isDesligadoOrFinal || (!cardInStandby && a.ativo === false);
                      const flow = getPatientFlowDetails(a);

                      if (activeTab === "kanban") {
                        // Triagem tab: shows active leads undergoing triage
                        if (isDesligadoOrFinal) return false;
                        if (cardStatus === "Em Atendimento") return false;
                        if (flow.activeStep >= 6) return false;

                        if (col.id === "Standby") {
                          return cardInStandby;
                        }

                        // Other triage columns must not show standby cards
                        if (cardInStandby) return false;

                        return (
                          !isInactiveOrAlta &&
                          cardStatus === col.id
                        );
                      } else {
                        // Pacientes tab (activeTab === "pacientesAcolhidos" or for profissional)
                        if (col.id === "Alta") {
                          // All inactive, desligado, or alta patients go to the Alta / Finalizado column
                          return isDesligadoOrFinal || (!cardInStandby && a.ativo === false);
                        }
                        if (col.id === "Em Atendimento") {
                          // Active patients in accompaniment
                          return (
                            !isInactiveOrAlta &&
                            (cardStatus === "Em Atendimento" || flow.activeStep === 6)
                          );
                        }
                        return !isInactiveOrAlta && cardStatus === col.id;
                      }
                    })
                    .sort((a, b) => {
                      const timeA = getTimestampMillis(a.createdAt);
                      const timeB = getTimestampMillis(b.createdAt);
                      if (patientSortOrder === "recent") {
                        return timeB - timeA;
                      }
                      return timeA - timeB;
                    });

                  const isColOver = dragOverColId === col.id;

                  return (
                    <motion.div
                      layout
                      key={col.id}
                      className={`w-[320px] shrink-0 h-full flex flex-col rounded-2xl overflow-hidden transition-colors duration-200 ${
                        isColOver
                          ? "bg-sun/15 border-2 border-sun shadow-md"
                          : col.id === "Standby"
                            ? "bg-amber-50/40 border border-amber-200/80 shadow-xs"
                            : "bg-white/50 border border-soft shadow-xs"
                      }`}
                      onDrop={(e) => {
                        setDragOverColId(null);
                        setDraggingCardId(null);
                        handleDrop(e, col.id);
                      }}
                      onDragOver={(e) => {
                        handleDragOver(e);
                        if (dragOverColId !== col.id) {
                          setDragOverColId(col.id);
                        }
                      }}
                      onDragLeave={(e) => {
                        if (e.currentTarget === e.target) {
                          setDragOverColId((prev) => (prev === col.id ? null : prev));
                        }
                      }}
                    >
                      {/* Column Header */}
                      <div className="p-4 bg-white border-b border-soft flex justify-between items-center shadow-sm z-10">
                        <div className="flex items-center gap-2">
                          {col.id === "Standby" && (
                            <div className="w-5 h-5 rounded-md bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
                              <Clock className="w-3 h-3 text-amber-700" />
                            </div>
                          )}
                          <div>
                            <h3 className="font-semibold text-forest text-sm">
                              {col.label}
                            </h3>
                            {col.id === "Standby" && (
                              <p className="text-[10px] text-amber-700/90 font-medium -mt-0.5">
                                Aguardando retomada
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                          col.id === "Standby"
                            ? "bg-amber-100 text-amber-900 border-amber-300"
                            : "bg-warm text-forest/70 border-soft"
                        }`}>
                          {colCards.length}
                        </span>
                      </div>

                      {/* Cards List with Motion Layout */}
                      <motion.div
                        layout
                        className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar"
                      >
                        <AnimatePresence mode="popLayout" initial={false}>
                          {colCards.map((card, cardIdx) => {
                            const isCardDragging = draggingCardId === card.id;

                            return (
                              <motion.div
                                layout
                                layoutId={`kanban-card-${card.id}`}
                                key={card.id}
                                initial={{ opacity: 0, y: 15, scale: 0.96 }}
                                animate={{
                                  opacity: isCardDragging ? 0.45 : 1,
                                  y: 0,
                                  scale: isCardDragging ? 0.98 : 1,
                                }}
                                exit={{ opacity: 0, scale: 0.92, y: -10 }}
                                transition={{
                                  layout: {
                                    type: "spring",
                                    stiffness: 350,
                                    damping: 28,
                                    mass: 0.8,
                                  },
                                  opacity: { duration: 0.2 },
                                  scale: { duration: 0.2 },
                                }}
                                draggable
                                onDragStart={(e: any) => {
                                  setDraggingCardId(card.id);
                                  handleDragStart(e, card.id);
                                }}
                                onDragEnd={() => {
                                  setDraggingCardId(null);
                                  setDragOverColId(null);
                                }}
                                onClick={() => setSelectedCard(card)}
                                className={`bg-white p-4 rounded-xl shadow-sm border select-none ${
                                  isCardDragging
                                    ? "border-sun ring-2 ring-sun/40 opacity-50 cursor-grabbing shadow-none"
                                    : "border-soft shadow-sun-dark/5 hover:shadow-md cursor-grab active:cursor-grabbing hover:border-sun-dark/30"
                                } transition-all group`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] font-bold text-forest/70 bg-warm px-1.5 py-0.5 rounded border border-soft">
                                      #{cardIdx + 1}
                                    </span>
                                    <span
                                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                        card.viaAcesso === "Particular"
                                          ? "bg-sun-dark-light text-forest/70-dark"
                                          : "bg-[#E5EDF4] text-[#3B668D]"
                                      }`}
                                    >
                                      {card.viaAcesso}
                                    </span>
                                    {!isCardInStandby(card) && (card.status === "Alta" || card.ativo === false || card.desligado || card.statusInativacao === "Inativo" || card.statusInativacao === "Desligado") && (
                                      <span className="text-[9px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-0.5">
                                        <XCircle className="w-2.5 h-2.5 text-rose-600" />
                                        {card.desligamentoMotivo || (card.statusInativacao === "Inativo" ? "Inativo" : "Alta")}
                                      </span>
                                    )}
                                    {isCardInStandby(card) && (
                                      <span className="text-[9px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-0.5">
                                        <Clock className="w-2.5 h-2.5 text-amber-700" />
                                        Standby
                                      </span>
                                    )}
                                  </div>
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
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>
                                    Entrada:{" "}
                                    {card.createdAt
                                      ? formatDateTimeSafely(card.createdAt, "Desconhecida")
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

                                  const flow = getPatientFlowDetails(card);

                                  return (
                                    <div className="mt-3 pt-3 border-t border-soft/50 flex flex-col gap-1.5 w-full">
                                      {/* Selos de Status do Fluxo */}
                                      <div className="flex flex-wrap gap-1 mb-1">
                                        {flow.propostaAceita ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Proposta Aceita
                                          </span>
                                        ) : flow.propostaRevisao ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                            <HelpCircle className="w-2.5 h-2.5 text-amber-600" /> Revisão Solicitada
                                          </span>
                                        ) : flow.isPropostaEnviada ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                            <Send className="w-2.5 h-2.5 text-blue-600" /> Proposta Enviada
                                          </span>
                                        ) : null}

                                        {flow.isAtribuicaoAceita ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                            <UserCheck className="w-2.5 h-2.5 text-emerald-600" /> Atribuição Aceita
                                          </span>
                                        ) : flow.isAtribuicaoDevolvida ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                            <RotateCcw className="w-2.5 h-2.5 text-rose-600" /> Atribuição Devolvida
                                          </span>
                                        ) : flow.isAtribuido ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                            <Clock className="w-2.5 h-2.5 text-amber-600" /> Aceite Pendente
                                          </span>
                                        ) : null}

                                        {flow.isAtendimentoIniciado && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-600 text-white">
                                            <Sparkles className="w-2.5 h-2.5 text-emerald-200" /> Atendimento Iniciado
                                          </span>
                                        )}
                                      </div>

                                      {/* Progress bar de 6 etapas */}
                                      <div className="flex gap-1 h-1.5 w-full">
                                        <div className={`flex-1 rounded-full transition-colors ${flow.propostaRevisao ? "bg-amber-500" : "bg-emerald-500"}`} />
                                        <div className={`flex-1 rounded-full transition-colors ${flow.propostaRevisao ? "bg-amber-300" : (flow.isPropostaEnviada || flow.propostaAceita) ? "bg-emerald-500" : "bg-warm-dark/40"}`} />
                                        <div className={`flex-1 rounded-full transition-colors ${flow.propostaAceita ? "bg-emerald-500" : flow.propostaRevisao ? "bg-amber-500" : flow.isPropostaEnviada ? "bg-blue-400" : "bg-warm-dark/40"}`} />
                                        <div className={`flex-1 rounded-full transition-colors ${flow.isAtribuido ? "bg-emerald-500" : flow.propostaAceita ? "bg-amber-400" : "bg-warm-dark/40"}`} />
                                        <div className={`flex-1 rounded-full transition-colors ${flow.isAtribuido && flow.isAtribuicaoDevolvida ? "bg-rose-500" : flow.isAtribuido && flow.isAtribuicaoAceita ? "bg-emerald-500" : flow.isAtribuido ? "bg-amber-400" : "bg-warm-dark/40"}`} />
                                        <div className={`flex-1 rounded-full transition-colors ${flow.isAtribuido && flow.isAtribuicaoAceita && flow.isAtendimentoIniciado ? "bg-emerald-500" : "bg-warm-dark/40"}`} />
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

                                  {/* Motivo de Pausa / Cancelamento na Proposta (Standby) */}
                                  {card.motivoPausaCancelamento && (
                                    <div className="mt-2 p-2 bg-amber-50/90 border border-amber-300/80 rounded-xl text-[10px] text-amber-950 leading-tight">
                                      <span className="font-extrabold text-[9px] uppercase tracking-wider text-amber-900 flex items-center gap-1">
                                        <PauseCircle className="w-3 h-3 text-amber-700 shrink-0" /> Motivo da Pausa:
                                      </span>
                                      <p className="line-clamp-2 italic text-forest/90 mt-0.5 font-serif">"{card.motivoPausaCancelamento}"</p>
                                    </div>
                                  )}

                                  {/* Motivo de Revisão Solicitada */}
                                  {card.motivoRevisao && (card.propostaStatus === "Paciente solicita revisão da proposta" || card.propostaStatus === "Revisão solicitada") && (
                                    <div className="mt-2 p-2 bg-orange-50/90 border border-orange-300/80 rounded-xl text-[10px] text-orange-950 leading-tight">
                                      <span className="font-extrabold text-[9px] uppercase tracking-wider text-orange-900 flex items-center gap-1">
                                        <RotateCcw className="w-3 h-3 text-orange-700 shrink-0" /> Motivo da Revisão:
                                      </span>
                                      <p className="line-clamp-2 italic text-forest/90 mt-0.5 font-serif">"{card.motivoRevisao}"</p>
                                    </div>
                                  )}

                                  {(col.id === "Standby" || isCardInStandby(card)) && (
                                    <div className="mt-2.5 pt-2 border-t border-amber-200/60 flex flex-col gap-1 w-full">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleReativarParaEmAnalise(card);
                                        }}
                                        className="w-full py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                                        title="Retomar processo e retornar paciente para 'Em Análise'"
                                      >
                                        <Play className="w-3 h-3 fill-white" />
                                        <span>Reativar (Mover para Em Análise)</span>
                                      </button>
                                    </div>
                                  )}
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>

                        {colCards.length === 0 && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={`h-24 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-xs font-medium transition-colors ${
                              isColOver
                                ? "border-sun bg-sun/10 text-forest font-bold"
                                : "border-soft text-forest/70/40"
                            }`}
                          >
                            <span>
                              {col.id === "Standby"
                                ? "Nenhum paciente em standby"
                                : "Solte cards aqui"}
                            </span>
                            {col.id === "Standby" && !isColOver && (
                              <span className="text-[10px] text-forest/50 mt-0.5">
                                Arraste ou pause na Ficha de Bordo
                              </span>
                            )}
                            {isColOver && (
                              <span className="text-[10px] text-amber-700 mt-0.5">
                                Mover para {col.label}
                              </span>
                            )}
                          </motion.div>
                        )}
                      </motion.div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
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
                              ? formatDateSafely(d.createdAt, "")
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
                          ? formatDateSafely(s.createdAt, "")
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
                              dateStr = formatDateTimeSafely(lead.createdAt, "");
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

          {/* Section: Solicitações de Desligamento (Entrevista Pendente) */}
          {(() => {
            const desligamentoList = (profissionaisAtivos || []).filter(
              (p) =>
                p.solicitacaoCancelamento === true ||
                p.statusPagamento === "desligamento_solicitado" ||
                p.statusPagamento === "cancelado_solicitado"
            );

            return (
              <div className="w-full flex flex-col gap-4 mt-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-amber-50/70 px-6 py-4 rounded-2xl shadow-xs border border-amber-200">
                  <div>
                    <h2 className="font-serif text-2xl text-amber-950 flex items-center gap-3 font-bold">
                      <LogOut className="w-6 h-6 text-amber-700" />
                      Solicitações de Desligamento (Entrevista Pendente)
                    </h2>
                    <p className="text-xs text-amber-900/80 mt-1">
                      Profissionais que solicitaram saída do projeto e aguardam entrevista de desligamento com a Gestão.
                    </p>
                  </div>
                  <span className="px-3.5 py-1.5 bg-amber-200 text-amber-950 rounded-full font-bold text-xs shadow-xs border border-amber-300 flex items-center gap-1.5 shrink-0">
                    <ShieldAlert className="w-4 h-4 text-amber-800" />
                    {desligamentoList.length} solicitação(ões) pendente(s)
                  </span>
                </div>

                {desligamentoList.length === 0 ? (
                  <div className="bg-white/60 border border-dashed border-amber-200/80 rounded-[2rem] p-6 text-center text-xs text-forest/60">
                    Nenhuma solicitação de desligamento pendente no momento. Todos os profissionais estão com vínculo ativo.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {desligamentoList.map((p) => {
                      const cleanPhone = (p.telefone || p.whatsapp || p.celular || "").replace(/\D/g, "");
                      return (
                        <div
                          key={p.uid || p.id}
                          className="bg-white p-6 rounded-[2rem] shadow-md border-2 border-amber-300/80 hover:shadow-lg transition-all flex flex-col justify-between gap-4 relative"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 font-serif font-bold text-lg flex items-center justify-center border border-amber-200 shrink-0">
                                  {p.name ? p.name.charAt(0).toUpperCase() : "P"}
                                </div>
                                <div>
                                  <h3 className="font-serif font-bold text-forest text-base">
                                    {p.name}
                                  </h3>
                                  <span className="text-xs text-forest/70 block">
                                    {p.profissao || "Profissional de Saúde"} • CRP: {p.crp || "N/I"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200/70 space-y-1.5 text-xs text-amber-950">
                              <p className="font-semibold flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-amber-700" />
                                Solicitado em: {formatDateSafely(p.dataSolicitacaoCancelamento, "Data não informada")}
                              </p>
                              <p className="text-forest/80">
                                <strong>Motivo:</strong> {p.motivoCancelamento || "Não informado pelo profissional."}
                              </p>
                            </div>

                            <div className="text-xs space-y-1 text-forest/80">
                              <p className="truncate">📧 {p.email}</p>
                              <p>📱 {p.telefone || p.whatsapp || p.celular || "Sem telefone"}</p>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-soft space-y-2">
                            <a
                              href={`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(
                                `Olá ${p.name}, sou da Gestão do Projeto AcolheMente. Recebemos sua solicitação de saída e gostaria de agendar nossa conversa de desligamento.`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                            >
                              <MessageCircle className="w-4 h-4" />
                              Agendar Entrevista (WhatsApp)
                            </a>

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={async () => {
                                  if (
                                    !confirm(
                                      `Confirma a conclusão da entrevista e o encerramento do vínculo de ${p.name}? A conta do profissional será inativada.`
                                    )
                                  )
                                    return;
                                  try {
                                    const profId = p.uid || p.id;
                                    await updateDoc(doc(db, "users", profId), {
                                      ativo: false,
                                      statusPagamento: "desligado",
                                      solicitacaoCancelamento: false,
                                      dataDesligamentoConcluido: new Date().toISOString(),
                                      notificacao: `Desligamento efetuado pela Gestão após entrevista em ${new Date().toLocaleDateString("pt-BR")}.`,
                                    });
                                    setProfissionaisAtivos((prev) =>
                                      prev.map((item) =>
                                        item.uid === profId || item.id === profId
                                          ? {
                                              ...item,
                                              ativo: false,
                                              statusPagamento: "desligado",
                                              solicitacaoCancelamento: false,
                                            }
                                          : item
                                      )
                                    );
                                    alert(`Desligamento de ${p.name} concluído com sucesso! Perfil inativado.`);
                                  } catch (err) {
                                    alert("Erro ao concluir desligamento.");
                                  }
                                }}
                                className="py-2 px-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                                title="Concluir processo e inativar conta"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Inativar Conta
                              </button>

                              <button
                                onClick={async () => {
                                  if (
                                    !confirm(
                                      `Deseja cancelar a solicitação de saída e manter ${p.name} ativo no projeto?`
                                    )
                                  )
                                    return;
                                  try {
                                    const profId = p.uid || p.id;
                                    await updateDoc(doc(db, "users", profId), {
                                      solicitacaoCancelamento: false,
                                      motivoCancelamento: "",
                                      statusPagamento: "ativo",
                                    });
                                    setProfissionaisAtivos((prev) =>
                                      prev.map((item) =>
                                        item.uid === profId || item.id === profId
                                          ? {
                                              ...item,
                                              solicitacaoCancelamento: false,
                                              motivoCancelamento: "",
                                              statusPagamento: "ativo",
                                            }
                                          : item
                                      )
                                    );
                                    alert(`Solicitação de saída de ${p.name} desfeita com sucesso.`);
                                  } catch (err) {
                                    alert("Erro ao reverter solicitação.");
                                  }
                                }}
                                className="py-2 px-2 bg-warm hover:bg-soft text-forest border border-soft rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                                title="Manter profissional no projeto"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-forest/70" />
                                Manter Ativo
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

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

                      {/* Payment & Adimplência Status Box */}
                      {p.role === "profissional" && (
                        <div className="bg-warm/40 p-3.5 rounded-2xl border border-soft/80 flex flex-col gap-2.5 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-forest/60 flex items-center gap-1">
                              <CreditCard className="w-3.5 h-3.5 text-forest/50" />
                              Pagamento / Adimplência:
                            </span>
                            {p.isCortesia ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                                <Gift className="w-3 h-3 text-purple-600" />
                                Cortesia / Convidado
                              </span>
                            ) : p.statusPagamento === "pago" ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Adimplente (Pago)
                              </span>
                            ) : p.solicitacaoCancelamento ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3 text-amber-600" />
                                Desligamento Solicitado
                              </span>
                            ) : (() => {
                                const admDateStr = p.dataAdmissao || p.createdAt;
                                const admDate = parseDateSafely(admDateStr);
                                const vencDateStr = p.vencimentoPagamento;
                                const vencDate = vencDateStr ? parseDateSafely(vencDateStr) : new Date(admDate.getTime() + 7 * 86400000);
                                const now = new Date();
                                const isTrial = vencDate.getTime() > now.getTime();
                                return isTrial ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-blue-600" />
                                    Prazo 1º Pagamento ({formatDateSafely(vencDate)})
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 flex items-center gap-1">
                                    <XCircle className="w-3 h-3 text-red-600" />
                                    Inadimplente / Pendente
                                  </span>
                                );
                              })()}
                          </div>

                          {/* Toggle Cortesia Button */}
                          {profile?.role === "master" && (
                            <div className="flex items-center justify-between pt-2 border-t border-soft/50">
                              <span className="text-[11px] font-medium text-forest/70">
                                Cortesia / Convidado:
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleCortesia(p.uid!, !!p.isCortesia);
                                }}
                                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                                  p.isCortesia
                                    ? "bg-purple-600 text-white border-purple-700 shadow-xs hover:bg-purple-700"
                                    : "bg-white text-forest/80 border-soft hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300"
                                }`}
                                title={p.isCortesia ? "Clique para desativar cortesia" : "Clique para isentar cobrança deste profissional"}
                              >
                                <Gift className="w-3.5 h-3.5" />
                                {p.isCortesia ? "Cortesia Ativa (Isento)" : "Tornar Cortesia / Convidado"}
                              </button>
                            </div>
                          )}
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
                          ? formatDateSafely(lead.createdAt, "")
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
              Gestão
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
                        { key: "master", label: "Gestão" },
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
      ) : activeTab === "backup" ? (
        <div className="flex-1 overflow-auto p-6 md:p-8 flex items-start flex-col gap-8 slide-up">
          <BackupManager
            userEmail={profile?.email || auth.currentUser?.email || undefined}
            userRole={currentRole}
          />
        </div>
      ) : activeTab === "notificacoes" ? (
        <div className="flex-1 overflow-auto p-6 md:p-8 flex items-start flex-col gap-8 slide-up w-full">
          <NotificationRulesManager
            onShowToast={showToast}
            whatsappInstanceName={globalConfigs.whatsappEvolutionInstance || "acolhemente"}
            whatsappConnected={whatsappState === "open"}
          />
        </div>
      ) : activeTab === "gestaoArtigos" ? (
        <GestaoBlogView
          profile={profile}
          onNavigateToPublicBlog={() => onNavigate("blog")}
          onViewArticle={(artigoId) => {
            try {
              const url = new URL(window.location.href);
              url.searchParams.set("artigo", artigoId);
              window.history.pushState({}, "", url.toString());
            } catch (e) {
              console.error(e);
            }
            onNavigate("blog");
          }}
        />
      ) : activeTab === "artigosProfissional" ? (
        <ProfissionalBlogView
          profile={profile}
          onNavigateToPublicBlog={() => onNavigate("blog")}
          onViewArticle={(artigoId) => {
            try {
              const url = new URL(window.location.href);
              url.searchParams.set("artigo", artigoId);
              window.history.pushState({}, "", url.toString());
            } catch (e) {
              console.error(e);
            }
            onNavigate("blog");
          }}
        />
      ) : activeTab === "redeProfissional" ? (
        <div className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-6 md:p-8 flex flex-col slide-up w-full">
          <div className="max-w-7xl w-full mx-auto">
            <RedeProfissionalView
              profile={profile}
              currentRole={currentRole}
              onShowToast={showToast}
              externalSearchQuery={searchQuery}
              onExternalSearchChange={setSearchQuery}
            />
          </div>
        </div>
      ) : activeTab === "eventos" || activeTab === "servicos" ? (
        <EventosServicosView activeSection={activeTab} profile={profile} />
      ) : null}

      {/* Card Details Modal - Ficha de Bordo do Paciente */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-1 sm:px-4 bg-forest/25 backdrop-blur-sm animate-in fade-in py-1 sm:py-3">
          <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-[98vw] 2xl:max-w-[1550px] h-[96vh] sm:h-[95vh] flex flex-col shadow-2xl border border-soft overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="px-3 sm:px-6 py-2.5 sm:py-4 flex flex-col border-b border-soft bg-gradient-to-r from-warm/60 via-white to-warm/40 gap-2.5 shrink-0">
              <div className="flex justify-between items-start sm:items-center gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-2 sm:p-2.5 bg-forest text-white rounded-xl shadow-xs shrink-0">
                    <User className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <h3 className="font-serif text-lg sm:text-2xl text-forest font-semibold truncate max-w-[180px] sm:max-w-none">
                        {selectedCard.nome || (selectedCard as any).nomeCompleto || "Paciente sem nome"}
                      </h3>
                      <span
                        className={`text-[9px] sm:text-[10px] font-extrabold uppercase px-2 sm:px-2.5 py-0.5 rounded-full border ${
                          isCardInStandby(selectedCard)
                            ? "bg-amber-100 text-amber-900 border-amber-300"
                            : selectedCard.ativo === false
                              ? "bg-slate-100 text-slate-600 border-slate-200"
                              : "bg-emerald-100 text-emerald-800 border-emerald-200"
                        }`}
                      >
                        {isCardInStandby(selectedCard) ? "Standby" : selectedCard.ativo === false ? "Inativo" : "Ativo"}
                      </span>
                      {selectedCard.status && !isCardInStandby(selectedCard) && (
                        <span className="text-[9px] sm:text-[10px] font-bold uppercase px-2 sm:px-2.5 py-0.5 rounded-full bg-sun/30 text-forest border border-sun/50">
                          {selectedCard.status}
                        </span>
                      )}
                      {isCardInStandby(selectedCard) && (
                        <span className="text-[9px] sm:text-[10px] font-bold uppercase px-2 sm:px-2.5 py-0.5 rounded-full bg-amber-200/90 text-amber-950 border border-amber-300">
                          Etapa: Standby
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] font-semibold text-forest/60 mt-0.5">
                      {selectedCard.createdAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-forest/40" /> Entrada: {formatDate(selectedCard.createdAt)}
                        </span>
                      )}
                      {selectedCard.statusUpdatedAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-forest/40" /> Ativação: {formatDate(selectedCard.statusUpdatedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {currentRole === "profissional" && selectedCard.atribuicaoStatus !== "Aceito" ? (
                    <div
                      className="flex items-center gap-1.5 font-bold text-[11px] sm:text-xs px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-amber-100/90 text-amber-900 border border-amber-300 shadow-2xs shrink-0 cursor-not-allowed"
                      title="O WhatsApp do paciente fica oculto e será liberado automaticamente após o aceite do caso na seção 6."
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-700" />
                      <span className="hidden sm:inline">WhatsApp Oculto</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenPatientWhatsApp(selectedCard)}
                      className="flex items-center gap-1.5 font-bold text-[11px] sm:text-xs px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20b858] text-white shadow-2xs transition-all hover:scale-105 shrink-0 cursor-pointer"
                      title="Enviar WhatsApp para o paciente"
                    >
                      <Phone className="w-3.5 h-3.5 text-white" />
                      <span>WhatsApp</span>
                    </button>
                  )}

                  <button
                    onClick={() => setIsEditingCard(!isEditingCard)}
                    className={`sm:hidden flex items-center gap-1 font-bold text-[11px] px-2.5 py-1 rounded-lg border transition-all shadow-2xs ${
                      isEditingCard
                        ? "bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700"
                        : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                    }`}
                  >
                    <Edit3 className="w-3 h-3" />
                    {isEditingCard ? "Salvar" : "Editar"}
                  </button>

                  <button
                    onClick={() => setSelectedCard(null)}
                    className="p-1 sm:p-1.5 text-forest/50 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors"
                    title="Fechar Ficha"
                  >
                    <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>
              </div>

              {/* Patient Journey Flow Progress */}
              {(() => {
                const status = selectedCard.status || "Aguardando Avaliação";
                if (
                  status === "Alta" ||
                  status === "Inativo" ||
                  status === "Encaminhamento Externo" ||
                  status === "Desistência"
                )
                  return null;

                const flow = getPatientFlowDetails(selectedCard);

                return (
                  <div className="w-full bg-white/90 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-soft shadow-2xs space-y-1.5">
                    {/* Mobile Summary Bar */}
                    <div className="sm:hidden flex items-center justify-between text-[11px] font-bold">
                      <div className="flex items-center gap-1.5 text-forest">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>
                          Jornada ({flow.activeStep}/6): {flow.propostaRevisao ? "Revisão Solicitada" : flow.propostaAceita ? "Proposta Aceita" : flow.isAtribuido ? "Atribuído" : "Triagem"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowJourneyMobileDetails(!showJourneyMobileDetails)}
                        className="text-[10px] text-forest/70 hover:text-forest bg-warm/80 px-2 py-0.5 rounded-md border border-soft flex items-center gap-0.5"
                      >
                        {showJourneyMobileDetails ? "Ocultar" : "Ver Etapas"}
                        <ChevronDown className={`w-3 h-3 transition-transform ${showJourneyMobileDetails ? "rotate-180" : ""}`} />
                      </button>
                    </div>

                    <div className={`${showJourneyMobileDetails ? "grid" : "hidden sm:grid"} grid-cols-2 sm:grid-cols-6 gap-1 text-center text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-1`}>
                      <div className={`p-1 sm:p-1.5 rounded-lg sm:rounded-xl border transition-colors ${flow.propostaRevisao ? "text-amber-800 bg-amber-50/90 border-amber-300 font-extrabold" : flow.activeStep >= 1 ? "text-emerald-800 bg-emerald-50/90 border-emerald-200" : "text-forest/40 bg-warm/30 border-transparent"}`}>
                        1. Questionário {flow.propostaRevisao ? "(Revisão)" : ""}
                      </div>
                      <div className={`p-1 sm:p-1.5 rounded-lg sm:rounded-xl border transition-colors ${flow.propostaRevisao ? "text-amber-800 bg-amber-50/90 border-amber-200" : (flow.isPropostaEnviada || flow.propostaAceita) ? "text-emerald-800 bg-emerald-50/90 border-emerald-200" : flow.activeStep === 2 ? "text-blue-800 bg-blue-50/90 border-blue-200" : "text-forest/40 bg-warm/30 border-transparent"}`}>
                        2. Proposta
                      </div>
                      <div className={`p-1 sm:p-1.5 rounded-lg sm:rounded-xl border transition-colors ${flow.propostaAceita ? "text-emerald-800 bg-emerald-50/90 border-emerald-200" : flow.propostaRevisao ? "text-amber-800 bg-amber-50/90 border-amber-300 font-extrabold" : flow.isPropostaEnviada ? "text-blue-800 bg-blue-50/90 border-blue-200" : "text-forest/40 bg-warm/30 border-transparent"}`}>
                        3. {flow.propostaRevisao ? "Revisão Solicitada" : flow.propostaAceita ? "Aceite OK" : "Aceite / Revisão"}
                      </div>
                      <div className={`p-1 sm:p-1.5 rounded-lg sm:rounded-xl border transition-colors ${flow.isAtribuido ? "text-emerald-800 bg-emerald-50/90 border-emerald-200" : flow.propostaAceita ? "text-amber-800 bg-amber-50/90 border-amber-300 font-bold" : "text-forest/40 bg-warm/30 border-transparent"}`}>
                        4. Atribuir Prof. {!flow.isAtribuido && flow.propostaAceita ? "(Pendente)" : ""}
                      </div>
                      <div className={`p-1 sm:p-1.5 rounded-lg sm:rounded-xl border transition-colors ${flow.isAtribuicaoDevolvida ? "text-rose-800 bg-rose-50/90 border-rose-200" : flow.isAtribuicaoAceita ? "text-emerald-800 bg-emerald-50/90 border-emerald-200" : flow.isAtribuido ? "text-amber-800 bg-amber-50/90 border-amber-200" : "text-forest/40 bg-warm/30 border-transparent"}`}>
                        5. Atribuição {!flow.isAtribuicaoAceita && flow.isAtribuido && !flow.isAtribuicaoDevolvida ? "(Pendente)" : ""}
                      </div>
                      <div className={`p-1 sm:p-1.5 rounded-lg sm:rounded-xl border transition-colors ${flow.isAtribuido && flow.isAtribuicaoAceita && (flow.isAtendimentoIniciado || selectedCard.status === "Em Atendimento") ? "text-emerald-800 bg-emerald-50/90 border-emerald-200" : "text-forest/40 bg-warm/30 border-transparent"}`}>
                        6. Atendimento
                      </div>
                    </div>

                    <div className="flex gap-1 h-1.5 w-full">
                      <div className={`flex-1 rounded-full transition-colors ${flow.propostaRevisao ? "bg-amber-500" : "bg-emerald-500"}`}></div>
                      <div className={`flex-1 rounded-full transition-colors ${flow.propostaRevisao ? "bg-amber-300" : (flow.isPropostaEnviada || flow.propostaAceita) ? "bg-emerald-500" : "bg-warm-dark/30"}`}></div>
                      <div className={`flex-1 rounded-full transition-colors ${flow.propostaAceita ? "bg-emerald-500" : flow.propostaRevisao ? "bg-amber-500" : flow.isPropostaEnviada ? "bg-blue-400" : "bg-warm-dark/30"}`}></div>
                      <div className={`flex-1 rounded-full transition-colors ${flow.isAtribuido ? "bg-emerald-500" : flow.propostaAceita ? "bg-amber-400" : "bg-warm-dark/30"}`}></div>
                      <div className={`flex-1 rounded-full transition-colors ${flow.isAtribuido && flow.isAtribuicaoDevolvida ? "bg-rose-500" : flow.isAtribuido && flow.isAtribuicaoAceita ? "bg-emerald-500" : flow.isAtribuido ? "bg-amber-400" : "bg-warm-dark/30"}`}></div>
                      <div className={`flex-1 rounded-full transition-colors ${flow.isAtribuido && flow.isAtribuicaoAceita && (flow.isAtendimentoIniciado || selectedCard.status === "Em Atendimento") ? "bg-emerald-500" : "bg-warm-dark/30"}`}></div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between gap-2 px-3 sm:px-6 py-2 bg-white border-b border-soft shrink-0 overflow-x-auto custom-scrollbar">
              {/* Left Group */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  onClick={() => {
                    setShowNotificarModal(true);
                  }}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] sm:text-xs px-3 py-1.5 rounded-xl border border-emerald-500/80 transition-all shadow-2xs whitespace-nowrap"
                  title="Disparar notificação via WhatsApp (Evolution) e E-mail Webhook (Brevo)"
                >
                  <Send className="w-3.5 h-3.5 text-sun" /> Notificar Paciente (Whats/E-mail)
                </button>

                <button
                  onClick={() => {
                    const link = `${window.location.origin}/?proposta=${selectedCard.id}`;
                    navigator.clipboard.writeText(link);
                    showToast("Link da Proposta copiado para a área de transferência!", "success");
                    handleUpdateAcolhimentoProperty(selectedCard.id, "propostaEnviada", true);
                  }}
                  className="flex items-center gap-1 bg-white hover:bg-warm text-forest font-semibold text-[11px] sm:text-xs px-2.5 sm:px-3 py-1.5 rounded-xl border border-soft transition-colors shadow-2xs whitespace-nowrap"
                >
                  <Copy className="w-3.5 h-3.5 text-forest/60" /> Link Proposta
                </button>

                <button
                  onClick={() => {
                    const link = `${window.location.origin}/?contrato=${selectedCard.id}`;
                    navigator.clipboard.writeText(link);
                    showToast("Link do contrato copiado para a área de transferência!", "success");
                  }}
                  className="flex items-center gap-1 bg-white hover:bg-warm text-forest font-semibold text-[11px] sm:text-xs px-2.5 sm:px-3 py-1.5 rounded-xl border border-soft transition-colors shadow-2xs whitespace-nowrap"
                >
                  <FileText className="w-3.5 h-3.5 text-forest/60" /> Link Contrato
                </button>

                <button
                  onClick={() => {
                    const defaultText = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS PSICOLÓGICOS\n\nCONTRATANTE: ${selectedCard.nome || "[NOME]"}, portador(a) do e-mail ${selectedCard.email || "[EMAIL]"} e CPF ${selectedCard.cpf || "[CPF_AQUI]"}.\n\nCONTRATADO: Projeto AcolheMente Saúde...\n\nCLÁUSULA 1 - O presente contrato tem por objeto a prestação de serviços psicológicos na modalidade de Terapia Individual...\n\n(Edite as cláusulas abaixo)`;
                    setContratoText(selectedCard.contratoText || defaultText);
                    setShowContratoModal(true);
                  }}
                  className="hidden md:flex items-center gap-1 text-xs font-medium text-forest/70 hover:text-forest px-2.5 py-1.5 rounded-lg hover:bg-warm transition-colors whitespace-nowrap"
                >
                  Modelo de Contrato
                </button>

                {/* Contrato Pill */}
                <div className="flex items-center gap-1 px-2.5 py-1 bg-warm/50 border border-soft rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap">
                  <div className={`w-2 h-2 rounded-full ${selectedCard.contratoAssinado ? "bg-green-500 animate-pulse" : "bg-amber-500"}`}></div>
                  <span className={selectedCard.contratoAssinado ? "text-green-700" : "text-amber-700"}>
                    {selectedCard.contratoAssinado ? "Assinado" : "Pendente"}
                  </span>
                </div>
              </div>

              {/* Right Edit & Status Toggles */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  onClick={() => setIsEditingCard(!isEditingCard)}
                  className={`hidden sm:flex items-center gap-1.5 font-bold text-xs px-3.5 py-1.5 rounded-xl border transition-all shadow-2xs whitespace-nowrap ${
                    isEditingCard
                      ? "bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700"
                      : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {isEditingCard ? "Salvar Edição" : "Editar Ficha"}
                </button>

                {/* Botão de Desligamento de Paciente */}
                {(currentRole === "profissional" || currentRole === "triagem" || currentRole === "master") && (
                  <button
                    type="button"
                    onClick={() => {
                      setDesligamentoMotivo("");
                      setDesligamentoDetalhes("");
                      setShowDesligamentoModal(true);
                    }}
                    className="flex items-center gap-1 font-bold text-[11px] sm:text-xs px-2.5 sm:px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors shadow-2xs whitespace-nowrap"
                    title="Iniciar fluxo de desligamento do paciente"
                  >
                    <UserX className="w-3.5 h-3.5 text-rose-600" /> Desligar
                  </button>
                )}

                {/* Multibotão de Status: Ativar / Standby / Inativar */}
                {(currentRole === "master" || currentRole === "triagem") && (
                  <div className="flex items-center p-0.5 bg-warm/80 rounded-xl border border-soft shadow-2xs shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (isCardInStandby(selectedCard)) {
                          handleReativarParaEmAnalise(selectedCard.id);
                        } else {
                          handleUpdateAcolhimentoProperty(selectedCard.id, "ativo", true);
                          handleUpdateAcolhimentoProperty(selectedCard.id, "statusInativacao", "Ativo");
                          if (selectedCard.status === "Inativo" || selectedCard.status === "Standby" || selectedCard.status === "Alta") {
                            handleUpdateAcolhimentoProperty(selectedCard.id, "status", "Em Triagem");
                          }
                          showToast("Status alterado para Ativo", "success");
                        }
                      }}
                      className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1 ${
                        !isCardInStandby(selectedCard) && selectedCard.ativo !== false && selectedCard.statusInativacao !== "Inativo" && selectedCard.status !== "Alta"
                          ? "bg-emerald-600 text-white shadow-2xs"
                          : "text-forest/70 hover:text-forest hover:bg-white/60"
                      }`}
                      title={isCardInStandby(selectedCard) ? "Reativar paciente e retornar para Em Análise" : "Ativar paciente"}
                    >
                      <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span className="hidden sm:inline">{isCardInStandby(selectedCard) ? "Reativar (Em Análise)" : "Ativar"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleColocarEmStandby(selectedCard.id);
                      }}
                      className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1 ${
                        isCardInStandby(selectedCard)
                          ? "bg-amber-500 text-white shadow-2xs"
                          : "text-forest/70 hover:text-forest hover:bg-white/60"
                      }`}
                      title="Armazenar paciente na etapa Standby da Triagem"
                    >
                      <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Standby</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleUpdateAcolhimentoProperty(selectedCard.id, "ativo", false);
                        handleUpdateAcolhimentoProperty(selectedCard.id, "status", "Alta");
                        handleUpdateAcolhimentoProperty(selectedCard.id, "statusInativacao", "Inativo");
                        showToast("Paciente inativado e direcionado para Alta / Finalizado", "info");
                      }}
                      className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1 ${
                        selectedCard.ativo === false || selectedCard.statusInativacao === "Inativo" || selectedCard.status === "Alta"
                          ? "bg-rose-600 text-white shadow-2xs"
                          : "text-forest/70 hover:text-forest hover:bg-white/60"
                      }`}
                      title="Inativar paciente (direcionar para Alta / Finalizado)"
                    >
                      <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Inativar</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Scrollable Body - Organized in Distinct Sections */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-7 bg-warm/10 custom-scrollbar">

              {/* Standby Resumption Banner */}
              {isCardInStandby(selectedCard) && (
                <div className="w-full bg-gradient-to-r from-amber-50 via-orange-50/70 to-amber-50 border-2 border-amber-300/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0 shadow-2xs">
                      <Clock className="w-5 h-5 text-amber-700" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm sm:text-base font-bold text-amber-950">
                          Paciente na etapa de Standby
                        </h4>
                        <span className="text-[10px] bg-amber-200 text-amber-900 font-extrabold px-2 py-0.5 rounded-full border border-amber-300">
                          Triagem Pausada
                        </span>
                      </div>
                      <p className="text-xs text-amber-900/80 mt-1 max-w-2xl leading-relaxed">
                        Este paciente está armazenado na coluna <strong>Standby</strong> da Triagem. Ao retomar o processo, clique no botão ao lado para reativá-lo e retorná-lo imediatamente para <strong>Em Análise</strong>.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleReativarParaEmAnalise(selectedCard.id)}
                    className="shrink-0 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                    title="Retomar processo do paciente e retornar para Em Análise"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Reativar (Retornar para Em Análise)</span>
                  </button>
                </div>
              )}

              {/* Motivo de Pausa / Cancelamento da Proposta (Standby) */}
              {selectedCard.motivoPausaCancelamento && (
                <div className="w-full bg-gradient-to-r from-amber-50 via-amber-50/80 to-amber-100/40 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0 shadow-2xs">
                        <PauseCircle className="w-5 h-5 text-amber-700" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm sm:text-base font-bold text-amber-950">
                            Processo Pausado / Cancelado pelo Paciente
                          </h4>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 bg-amber-200/90 px-2 py-0.5 rounded-full border border-amber-300">
                            Resposta na Proposta
                          </span>
                        </div>
                        <p className="text-xs text-amber-900/80 mt-0.5">
                          O paciente interrompeu o processo ao receber a proposta e justificou o motivo abaixo:
                        </p>
                      </div>
                    </div>
                    {selectedCard.dataPausaCancelamento && (
                      <span className="text-[11px] font-semibold text-amber-800 flex items-center gap-1.5 bg-white/80 px-3 py-1 rounded-xl border border-amber-200">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        Registrado em: {new Date(selectedCard.dataPausaCancelamento).toLocaleString('pt-BR')}
                      </span>
                    )}
                  </div>
                  <div className="bg-white/95 p-3.5 sm:p-4 rounded-xl border border-amber-200 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900/70 block mb-1">
                      Motivo Declarado pelo Paciente:
                    </span>
                    <p className="font-serif italic text-forest text-sm sm:text-base leading-relaxed">
                      "{selectedCard.motivoPausaCancelamento}"
                    </p>
                  </div>
                </div>
              )}

              {/* Motivo da Solicitação de Revisão da Proposta */}
              {selectedCard.motivoRevisao && (
                <div className="w-full bg-gradient-to-r from-orange-50 via-orange-50/80 to-amber-50 border-2 border-orange-300 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-orange-100 border border-orange-300 flex items-center justify-center text-orange-800 shrink-0 shadow-2xs">
                        <RotateCcw className="w-5 h-5 text-orange-700" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm sm:text-base font-bold text-orange-950">
                            Revisão de Proposta Solicitada pelo Paciente
                          </h4>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-900 bg-orange-200/90 px-2 py-0.5 rounded-full border border-orange-300">
                            Revisão de Valores/Frequência
                          </span>
                        </div>
                        <p className="text-xs text-orange-900/80 mt-0.5">
                          O paciente solicitou ajuste na proposta enviada. Verifique os apontamentos para negociar nova condição:
                        </p>
                      </div>
                    </div>
                    {selectedCard.dataSolicitacaoRevisao && (
                      <span className="text-[11px] font-semibold text-orange-800 flex items-center gap-1.5 bg-white/80 px-3 py-1 rounded-xl border border-orange-200">
                        <Clock className="w-3.5 h-3.5 text-orange-600" />
                        Registrado em: {new Date(selectedCard.dataSolicitacaoRevisao).toLocaleString('pt-BR')}
                      </span>
                    )}
                  </div>
                  <div className="bg-white/95 p-3.5 sm:p-4 rounded-xl border border-orange-200 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-900/70 block mb-1">
                      Motivo / Observações para Revisão:
                    </span>
                    <p className="font-serif italic text-forest text-sm sm:text-base leading-relaxed">
                      "{selectedCard.motivoRevisao}"
                    </p>
                  </div>
                </div>
              )}

              {/* Sticky Quick Jump Bar */}
              <div className="sticky top-0 z-20 -mx-3 sm:-mx-6 lg:-mx-8 -mt-3 sm:-mt-6 lg:-mt-8 px-3 sm:px-6 py-2 bg-white/95 backdrop-blur-md border-b border-soft flex items-center gap-1.5 overflow-x-auto custom-scrollbar shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-forest/50 shrink-0 flex items-center gap-1 pr-1">
                  <Compass className="w-3.5 h-3.5 text-forest/60" /> Seções:
                </span>
                <button type="button" onClick={() => document.getElementById('sec-1-pessoais')?.scrollIntoView({ behavior: 'smooth' })} className="px-2.5 py-1 text-[10px] sm:text-[11px] font-bold text-forest/80 hover:text-forest bg-warm/60 hover:bg-warm rounded-lg shrink-0 transition-colors whitespace-nowrap">1. Pessoais</button>
                <button type="button" onClick={() => document.getElementById('sec-2-responsavel')?.scrollIntoView({ behavior: 'smooth' })} className="px-2.5 py-1 text-[10px] sm:text-[11px] font-bold text-forest/80 hover:text-forest bg-warm/60 hover:bg-warm rounded-lg shrink-0 transition-colors whitespace-nowrap">2. Responsável</button>
                <button type="button" onClick={() => document.getElementById('sec-3-contato')?.scrollIntoView({ behavior: 'smooth' })} className="px-2.5 py-1 text-[10px] sm:text-[11px] font-bold text-forest/80 hover:text-forest bg-warm/60 hover:bg-warm rounded-lg shrink-0 transition-colors whitespace-nowrap">3. Contato</button>
                <button type="button" onClick={() => document.getElementById('sec-4-socio')?.scrollIntoView({ behavior: 'smooth' })} className="px-2.5 py-1 text-[10px] sm:text-[11px] font-bold text-forest/80 hover:text-forest bg-warm/60 hover:bg-warm rounded-lg shrink-0 transition-colors whitespace-nowrap">4. Socioeconômico</button>
                <button type="button" onClick={() => document.getElementById('sec-5-clinico')?.scrollIntoView({ behavior: 'smooth' })} className="px-2.5 py-1 text-[10px] sm:text-[11px] font-bold text-forest/80 hover:text-forest bg-warm/60 hover:bg-warm rounded-lg shrink-0 transition-colors whitespace-nowrap">5. Histórico</button>
                <button type="button" onClick={() => document.getElementById('sec-6-proposta')?.scrollIntoView({ behavior: 'smooth' })} className="px-2.5 py-1 text-[10px] sm:text-[11px] font-bold text-forest/80 hover:text-forest bg-warm/60 hover:bg-warm rounded-lg shrink-0 transition-colors whitespace-nowrap">6. Proposta & Atribuição</button>
                <button type="button" onClick={() => document.getElementById('sec-7-resumo')?.scrollIntoView({ behavior: 'smooth' })} className="px-2.5 py-1 text-[10px] sm:text-[11px] font-bold text-forest/80 hover:text-forest bg-warm/60 hover:bg-warm rounded-lg shrink-0 transition-colors whitespace-nowrap">7. Resumo do Caso</button>
                <button type="button" onClick={() => document.getElementById('sec-8-registros')?.scrollIntoView({ behavior: 'smooth' })} className="px-2.5 py-1 text-[10px] sm:text-[11px] font-bold text-forest/80 hover:text-forest bg-warm/60 hover:bg-warm rounded-lg shrink-0 transition-colors whitespace-nowrap">8. Registros</button>
                <button type="button" onClick={() => document.getElementById('sec-9-alertas')?.scrollIntoView({ behavior: 'smooth' })} className="px-2.5 py-1 text-[10px] sm:text-[11px] font-bold text-forest/80 hover:text-forest bg-warm/60 hover:bg-warm rounded-lg shrink-0 transition-colors whitespace-nowrap">9. Alertas</button>
                <button type="button" onClick={() => document.getElementById('sec-10-notificacoes')?.scrollIntoView({ behavior: 'smooth' })} className="px-2.5 py-1 text-[10px] sm:text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-100/90 hover:bg-emerald-200 rounded-lg shrink-0 transition-colors whitespace-nowrap">10. Notificações</button>
              </div>

              {/* 1. DADOS PESSOAIS */}
              <div id="sec-1-pessoais" className="bg-white p-4 sm:p-6 rounded-2xl border border-soft shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-soft pb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-2">
                    <User className="w-4 h-4 text-forest" /> 1. Dados Pessoais
                  </h4>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-warm text-forest/70 border border-soft">
                    Identificação
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <EditableField
                    label="Nome Completo"
                    value={selectedCard.nome}
                    field="nome"
                    onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)}
                    isEditing={isEditingCard}
                  />
                  <EditableField
                    label="CPF"
                    value={selectedCard.cpf}
                    field="cpf"
                    onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)}
                    isEditing={isEditingCard}
                  />
                  <EditableField
                    label="Data de Nascimento"
                    value={selectedCard.dataNascimento}
                    field="dataNascimento"
                    onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)}
                    isEditing={isEditingCard}
                  />
                  <EditableField
                    label="Gênero"
                    value={selectedCard.genero}
                    field="genero"
                    onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)}
                    isEditing={isEditingCard}
                  />
                  <EditableField
                    label="Estado Civil"
                    value={selectedCard.estadoCivil}
                    field="estadoCivil"
                    onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)}
                    isEditing={isEditingCard}
                  />
                  <EditableField
                    label="Deficiência / Necessidade Especial"
                    value={selectedCard.deficiencia}
                    field="deficiencia"
                    onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)}
                    isEditing={isEditingCard}
                  />
                  <EditableField
                    label="Possui Filhos?"
                    value={selectedCard.temFilhos || selectedCard.filhos}
                    field="temFilhos"
                    onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)}
                    isEditing={isEditingCard}
                  />
                  <EditableField
                    label="Faixa Etária dos Filhos"
                    value={selectedCard.faixaEtariaFilhos}
                    field="faixaEtariaFilhos"
                    onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)}
                    isEditing={isEditingCard}
                  />
                  <EditableField
                    label="Moram com o Paciente?"
                    value={selectedCard.filhosMoramJunto}
                    field="filhosMoramJunto"
                    onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)}
                    isEditing={isEditingCard}
                  />
                </div>
              </div>

              {/* 2. DADOS DO RESPONSÁVEL SE MENOR */}
              <div id="sec-2-responsavel" className="bg-white p-4 sm:p-6 rounded-2xl border border-soft shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-soft pb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-forest" /> 2. Dados do Responsável (se menor ou dependente)
                  </h4>
                  {selectedCard.tratamentoPara === "Outra pessoa" || selectedCard.responsavelNome || selectedCard.dadosContrato?.menorIdade ? (
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      Responsável Requerido
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-warm text-forest/60 border border-soft">
                      Atendimento Próprio
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <EditableField
                    label="Atendimento Para"
                    value={selectedCard.tratamentoPara || (selectedCard.responsavelNome ? "Outra pessoa (Menor/Dependente)" : "Própria pessoa")}
                    field="tratamentoPara"
                    onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)}
                    isEditing={isEditingCard}
                  />
                  <EditableField
                    label="Nome do Responsável"
                    value={selectedCard.responsavelNome || selectedCard.dadosContrato?.nome}
                    field="responsavelNome"
                    onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)}
                    isEditing={isEditingCard}
                  />
                  <EditableField
                    label="CPF do Responsável"
                    value={selectedCard.responsavelCpf || selectedCard.dadosContrato?.cpf}
                    field="responsavelCpf"
                    onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)}
                    isEditing={isEditingCard}
                  />
                </div>

                {selectedCard.dadosContrato?.menorIdade && (
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Paciente confirmado como menor de idade no contrato assinado por {selectedCard.dadosContrato.nome}.</span>
                  </div>
                )}
              </div>

              {/* 3. DADOS DE CONTATO */}
              <div id="sec-3-contato" className="bg-white p-4 sm:p-6 rounded-2xl border border-soft shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-soft pb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-forest" /> 3. Dados de Contato
                  </h4>
                  {currentRole === "profissional" && selectedCard.atribuicaoStatus !== "Aceito" ? (
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">
                      <Lock className="w-3 h-3 text-amber-700" /> Oculto até o Aceite
                    </span>
                  ) : (
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-warm text-forest/70 border border-soft">
                      Comunicação
                    </span>
                  )}
                </div>

                {currentRole === "profissional" && selectedCard.atribuicaoStatus !== "Aceito" ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
                          <Lock className="w-5 h-5 text-amber-800" />
                        </div>
                        <div className="space-y-1">
                          <h5 className="text-xs font-bold text-amber-950">
                            Dados de Contato Ocultos (Aguardando Aceite do Caso)
                          </h5>
                          <p className="text-xs text-amber-900/80 leading-relaxed max-w-2xl">
                            Para resguardar o fluxo ético e evitar contatos prévios antes da confirmação, os dados de contato direto (telefone, WhatsApp, e-mail e endereço) ficam temporariamente ocultos. Para ter acesso completo aos dados e iniciar os atendimentos, formalize o aceite na <strong>seção 6 (Proposta & Atribuição de Profissional)</strong> abaixo. Caso o caso seja devolvido para a triagem, os dados continuam protegidos.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const elem = document.getElementById("sec-6-proposta");
                          if (elem) elem.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="shrink-0 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs flex items-center gap-1.5 self-end sm:self-center"
                      >
                        Ir para o Aceite <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      <div className="p-3 bg-warm/30 rounded-xl border border-soft space-y-1">
                        <span className="text-[10px] uppercase font-bold text-forest/50 block">E-mail</span>
                        <div className="flex items-center gap-1.5 text-xs text-forest/60 font-mono">
                          <Lock className="w-3.5 h-3.5 text-amber-600" /> ••••••••••••
                        </div>
                      </div>
                      <div className="p-3 bg-warm/30 rounded-xl border border-soft space-y-1">
                        <span className="text-[10px] uppercase font-bold text-forest/50 block">Telefone / WhatsApp</span>
                        <div className="flex items-center gap-1.5 text-xs text-forest/60 font-mono">
                          <Lock className="w-3.5 h-3.5 text-amber-600" /> ••••••••••••
                        </div>
                      </div>
                      <EditableField
                        label="Cidade / Estado"
                        value={selectedCard.cidadeEstado || (selectedCard.cidade ? `${selectedCard.cidade}${selectedCard.estado ? ` - ${selectedCard.estado}` : ''}` : '')}
                        field="cidadeEstado"
                        onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)}
                        isEditing={isEditingCard}
                      />
                      <div className="p-3 bg-warm/30 rounded-xl border border-soft space-y-1">
                        <span className="text-[10px] uppercase font-bold text-forest/50 block">Endereço / Bairro</span>
                        <div className="flex items-center gap-1.5 text-xs text-forest/60">
                          <Lock className="w-3.5 h-3.5 text-amber-600" /> (Oculto até o aceite)
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <EditableField
                      label="E-mail"
                      value={selectedCard.email}
                      field="email"
                      onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)}
                      isEditing={isEditingCard}
                    />
                    <EditableField
                      label="Telefone / WhatsApp"
                      value={selectedCard.telefone}
                      field="telefone"
                      onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)}
                      isEditing={isEditingCard}
                    />
                    <EditableField
                      label="Cidade / Estado"
                      value={selectedCard.cidadeEstado || (selectedCard.cidade ? `${selectedCard.cidade}${selectedCard.estado ? ` - ${selectedCard.estado}` : ''}` : '')}
                      field="cidadeEstado"
                      onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)}
                      isEditing={isEditingCard}
                    />
                    <EditableField
                      label="Endereço / Bairro"
                      value={selectedCard.endereco}
                      field="endereco"
                      onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)}
                      isEditing={isEditingCard}
                    />
                  </div>
                )}
              </div>

              {/* 4. FONTE DE ACESSO (COMO CONHECEU O PROJETO) */}
              <div id="sec-4-socio" className="bg-white p-4 sm:p-6 rounded-2xl border border-soft shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-soft pb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-forest" /> 4. Fonte de Acesso & Perfil Socioeconômico
                  </h4>
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {selectedCard.viaAcesso || "Acesso Direto"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <EditableField
                    label="Via de Acesso (Canal)"
                    value={selectedCard.viaAcesso}
                    field="viaAcesso"
                    onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)}
                    isEditing={isEditingCard}
                  />
                  <EditableField
                    label="Como Nos Conheceu"
                    value={selectedCard.comoConheceu}
                    field="comoConheceu"
                    onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)}
                    isEditing={isEditingCard}
                  />
                  <EditableField
                    label="Empresa Vinculada"
                    value={selectedCard.empresa || (selectedCard as any).empresaVinculada}
                    field="empresa"
                    onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)}
                    isEditing={isEditingCard}
                  />
                  <EditableField
                    label="Escolaridade"
                    value={selectedCard.escolaridade}
                    field="escolaridade"
                    onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)}
                    isEditing={isEditingCard}
                  />
                </div>

                {/* Bloco Socioeconômico (Particular / Social) */}
                <div className="mt-4 pt-4 border-t border-soft space-y-3">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-forest/70">
                    Detalhes Socioeconômicos & Habitacionais
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <EditableField
                      label="Renda Bruta / Faixa Salarial"
                      value={selectedCard.faixaSalarial}
                      field="faixaSalarial"
                      onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)}
                      isEditing={isEditingCard}
                    />
                    <EditableField
                      label="Fonte de Renda"
                      value={selectedCard.fonteRenda}
                      field="fonteRenda"
                      onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)}
                      isEditing={isEditingCard}
                    />
                    <EditableField
                      label="Residentes / Dependentes"
                      value={selectedCard.dependentes}
                      field="dependentes"
                      onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)}
                      isEditing={isEditingCard}
                    />
                    <EditableField
                      label="Plano de Saúde"
                      value={selectedCard.planoSaude}
                      field="planoSaude"
                      onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)}
                      isEditing={isEditingCard}
                    />
                    <EditableField
                      label="Tipo de Moradia"
                      value={selectedCard.moradia}
                      field="moradia"
                      onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)}
                      isEditing={isEditingCard}
                    />
                    <EditableField
                      label="Cômodos da Residência"
                      value={selectedCard.comodos}
                      field="comodos"
                      onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)}
                      isEditing={isEditingCard}
                    />
                    <EditableField
                      label="Dispositivo / Aparelho"
                      value={selectedCard.dispositivo}
                      field="dispositivo"
                      onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)}
                      isEditing={isEditingCard}
                    />
                    <EditableField
                      label="Acesso à Internet"
                      value={selectedCard.internet}
                      field="internet"
                      onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)}
                      isEditing={isEditingCard}
                    />
                  </div>
                </div>
              </div>

              {/* 5. HISTÓRICO CLÍNICO E MOTIVAÇÃO */}
              <div id="sec-5-clinico" className="bg-white p-4 sm:p-6 rounded-2xl border border-soft shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-soft pb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-forest" /> 5. Histórico Clínico & Motivação
                  </h4>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-warm text-forest/70 border border-soft">
                    Triagem Inicial
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <EditableField
                    label="Terapia Anterior?"
                    value={selectedCard.terapiaAnterior}
                    field="terapiaAnterior"
                    onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)}
                    isEditing={isEditingCard}
                  />
                  <EditableField
                    label="Melhores Períodos para Atendimento (Online)"
                    value={
                      Array.isArray(selectedCard.melhoresPeriodos)
                        ? selectedCard.melhoresPeriodos.join(", ")
                        : selectedCard.melhoresPeriodos
                    }
                    field="melhoresPeriodos"
                    onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)}
                    isEditing={isEditingCard}
                  />
                </div>

                <div className="bg-sun/10 border border-sun/30 p-4.5 rounded-xl space-y-1.5 mt-2">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-forest/70">
                    Motivo Declarado / Queixa Principal
                  </span>
                  {isEditingCard ? (
                    <DebouncedTextArea
                      value={selectedCard.motivo || ""}
                      onChange={(val) => handleUpdateAcolhimentoProperty(selectedCard.id, "motivo", val)}
                      className="w-full bg-white text-sm text-forest p-3 border border-sun-dark rounded-lg focus:outline-none resize-none h-24"
                    />
                  ) : (
                    <p className="text-sm text-forest leading-relaxed font-serif italic">
                      "{selectedCard.motivo || "Nenhum motivo ou queixa principal informada no formulário."}"
                    </p>
                  )}
                </div>
              </div>

              {/* 6. PROPOSTA E ATRIBUIÇÃO (BOTÕES PARA VALOR, FREQUENCIA E PROFISSIONAL) */}
              <div id="sec-6-proposta" className="bg-white p-4 sm:p-6 rounded-2xl border border-soft shadow-2xs space-y-6">
                <div className="flex flex-wrap items-center justify-between border-b border-soft pb-3 gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-emerald-700" /> 6. Proposta e Atribuição
                  </h4>

                  {/* Status Pills & Proposta Action Button */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Botão de Disparo / Notificação de Proposta */}
                    {(currentRole === "master" || currentRole === "triagem") && (
                      <button
                        type="button"
                        onClick={async () => {
                          const isRevision = selectedCard.propostaStatus === "Paciente solicita revisão da proposta" || selectedCard.propostaStatus === "Revisão solicitada";
                          const newPropostaStatus = isRevision ? "Revisão concluída" : "Proposta enviada";
                          
                          await handleUpdateAcolhimentoProperty(selectedCard.id, "propostaStatus", newPropostaStatus);
                          await handleUpdateAcolhimentoProperty(selectedCard.id, "propostaEnviada", true);
                          await handleUpdateAcolhimentoProperty(selectedCard.id, "propostaEnviadaEm", new Date().toISOString());

                          const link = `${window.location.origin}/?proposta=${selectedCard.id}`;
                          if (selectedCard.email) {
                            sendWebhookNotification({
                              event: "proposta_revisao",
                              recipientEmail: selectedCard.email,
                              recipientName: selectedCard.nome || "Paciente",
                              title: isRevision ? "Sua Proposta Foi Atualizada - Projeto AcolheMente" : "Sua Proposta de Atendimento - Projeto AcolheMente",
                              message: `Sua proposta foi ${isRevision ? "revisada e atualizada" : "elaborada"}. Acesse o link para conferir os detalhes e responder: ${link}`,
                              data: {
                                propostaLink: link,
                                valorSessao: selectedCard.valorSessao || "A combinar",
                                frequenciaSessoes: selectedCard.frequenciaSessoes || "Semanal",
                              }
                            }).catch((e) => console.error("Erro no envio da notificação de proposta:", e));
                          }
                          showToast(isRevision ? "Nova proposta notificada! Status alterado para 'Revisão concluída'." : "Proposta notificada com sucesso ao paciente!", "success");
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all shadow-2xs flex items-center gap-1.5"
                        title="Notificar proposta ao paciente via e-mail e atualizar status"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {selectedCard.propostaStatus === "Paciente solicita revisão da proposta" ? "Notificar Nova Proposta (Concluir Revisão)" : "Notificar Proposta ao Paciente"}
                      </button>
                    )}

                    {/* Status Proposta */}
                    {selectedCard.propostaStatus === "Proposta aceita pelo paciente" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Proposta Aceita
                      </span>
                    ) : selectedCard.propostaStatus === "Paciente solicita revisão da proposta" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300">
                        <HelpCircle className="w-3.5 h-3.5 text-amber-600" /> Revisão Solicitada
                      </span>
                    ) : selectedCard.propostaStatus === "Revisão concluída" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Revisão Concluída
                      </span>
                    ) : selectedCard.propostaStatus === "Processo pausado ou cancelado pelo paciente" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300">
                        <PauseCircle className="w-3.5 h-3.5 text-amber-700" /> Processo Pausado / Cancelado
                      </span>
                    ) : selectedCard.propostaEnviada ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-300">
                        <Send className="w-3.5 h-3.5 text-blue-600" /> Proposta Enviada
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                        Proposta Pendente
                      </span>
                    )}

                    {/* Status Atribuição */}
                    {selectedCard.atribuicaoStatus === "Aceito" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Profissional Confirmado
                      </span>
                    ) : selectedCard.atribuicaoStatus === "Devolvido" || selectedCard.atribuicaoStatus === "Rejeitado" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-300">
                        <RotateCcw className="w-3.5 h-3.5 text-rose-600" /> Devolvido para Triagem
                      </span>
                    ) : selectedCard.profissionalId ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        <Clock className="w-3.5 h-3.5 text-amber-600" /> Aguardando Aceite
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                        Não Atribuído
                      </span>
                    )}
                  </div>
                </div>

                {/* Bloco de Justificativa / Motivo da Proposta do Paciente */}
                {(selectedCard.motivoPausaCancelamento || selectedCard.motivoRevisao) && (
                  <div className="space-y-3">
                    {selectedCard.motivoPausaCancelamento && (
                      <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3">
                        <PauseCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-amber-950">
                              Paciente Pausou / Cancelou o Processo na Proposta (Standby)
                            </span>
                            {selectedCard.dataPausaCancelamento && (
                              <span className="text-[10px] font-semibold text-amber-800">
                                {new Date(selectedCard.dataPausaCancelamento).toLocaleString('pt-BR')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-forest bg-white/80 p-2.5 rounded-lg border border-amber-200 font-serif italic">
                            "{selectedCard.motivoPausaCancelamento}"
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedCard.motivoRevisao && (
                      <div className="p-4 bg-orange-50 border border-orange-300 rounded-xl flex items-start gap-3">
                        <RotateCcw className="w-5 h-5 text-orange-700 shrink-0 mt-0.5" />
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-orange-950">
                              Paciente Solicitou Revisão da Proposta (Valores / Frequência)
                            </span>
                            {selectedCard.dataSolicitacaoRevisao && (
                              <span className="text-[10px] font-semibold text-orange-800">
                                {new Date(selectedCard.dataSolicitacaoRevisao).toLocaleString('pt-BR')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-forest bg-white/80 p-2.5 rounded-lg border border-orange-200 font-serif italic">
                            "{selectedCard.motivoRevisao}"
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Botões Rápidos de Valor da Sessão e Frequência */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Valor da Sessão */}
                  <div className="p-5 bg-sun/10 rounded-2xl border border-sun/30 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-forest/80">
                          Valor da Sessão (R$)
                        </label>
                        {(currentRole !== "master" && currentRole !== "triagem") && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-300/80" title="Apenas membros de Triagem e Gestão podem editar valores">
                            <Lock className="w-3 h-3 text-amber-700 shrink-0" /> Restrito à Triagem/Gestão
                          </span>
                        )}
                      </div>
                      <span className="text-xl font-extrabold text-forest">
                        {selectedCard.valorSessao || "Não definido"}
                      </span>
                    </div>

                    {/* Botões de Seleção Rápida de Valor */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-forest/50 block">
                          {selectedCard.viaAcesso === "Corporativo" || Boolean(selectedCard.empresa)
                            ? "Atalhos de Valor (3 Faixas Corporativas):"
                            : "Atalhos de Valor (Área do Gestor):"}
                        </span>
                        {(selectedCard.viaAcesso === "Corporativo" || Boolean(selectedCard.empresa)) && (
                          <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                            Via Corporativa
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(() => {
                          const isCorp = selectedCard.viaAcesso === "Corporativo" || Boolean(selectedCard.empresa);
                          const faixasGestor = isCorp
                            ? (globalConfigs.faixasValoresCorporativo || []).filter((f) => f && f.trim() !== "")
                            : (globalConfigs.faixasValores || []).filter((f) => f && f.trim() !== "");
                          
                          const baseFaixas = faixasGestor.length > 0
                            ? faixasGestor
                            : isCorp
                              ? ["R$ 60,00", "R$ 90,00", "R$ 120,00"]
                              : ["R$ 30,00", "R$ 50,00", "R$ 80,00", "R$ 100,00", "R$ 120,00"];
                          
                          const options = [...baseFaixas, "Gratuito", "A combinar"];
                          if (selectedCard.valorSessao && !options.includes(selectedCard.valorSessao)) {
                            options.unshift(selectedCard.valorSessao);
                          }

                          return options.map((val) => (
                            <button
                              key={val}
                              type="button"
                              disabled={currentRole !== "master" && currentRole !== "triagem"}
                              onClick={() => handleUpdateAcolhimentoProperty(selectedCard.id, "valorSessao", val)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs border ${
                                selectedCard.valorSessao === val
                                  ? "bg-forest text-white border-forest shadow-xs"
                                  : "bg-white text-forest border-soft hover:bg-sun/30"
                              } ${(currentRole !== "master" && currentRole !== "triagem") ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                            >
                              {val}
                            </button>
                          ));
                        })()}
                      </div>
                    </div>

                    {/* Dropdown alternativo se editando */}
                    {isEditingCard && (
                      <div className="pt-2 border-t border-sun/20">
                        <select
                          disabled={currentRole !== "master" && currentRole !== "triagem"}
                          value={selectedCard.valorSessao || ""}
                          onChange={(e) => handleUpdateAcolhimentoProperty(selectedCard.id, "valorSessao", e.target.value)}
                          className="w-full bg-white text-sm font-bold text-forest border border-soft rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-sun-dark shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <option value="">Outro / Personalizado...</option>
                          {(() => {
                            const isCorp = selectedCard.viaAcesso === "Corporativo" || Boolean(selectedCard.empresa);
                            const faixasGestor = isCorp
                              ? (globalConfigs.faixasValoresCorporativo || []).filter((f) => f && f.trim() !== "")
                              : (globalConfigs.faixasValores || []).filter((f) => f && f.trim() !== "");
                            const baseFaixas = faixasGestor.length > 0
                              ? faixasGestor
                              : isCorp
                                ? ["R$ 60,00", "R$ 90,00", "R$ 120,00"]
                                : ["R$ 30,00", "R$ 50,00", "R$ 80,00", "R$ 100,00", "R$ 120,00"];
                            return baseFaixas.map((faixa: string, idx: number) => (
                              <option key={idx} value={faixa}>{faixa}</option>
                            ));
                          })()}
                          <option value="Gratuito">Gratuito</option>
                          <option value="A combinar">A combinar</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Frequência de Sessões */}
                  <div className="p-5 bg-emerald-50/80 rounded-2xl border border-emerald-200/90 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 block">
                          Frequência de Sessões
                        </label>
                        <span className="text-[10px] text-emerald-800/80 font-medium">
                          {!selectedCard.frequenciaSessoes
                            ? "Definição inicial • Motivo opcional"
                            : "Alteração • Motivo obrigatório"}
                        </span>
                      </div>
                      <span className="text-xl font-extrabold text-forest">
                        {selectedCard.frequenciaSessoes || "Não definida"}
                      </span>
                    </div>

                    {/* Exibição do Motivo Atual Registrado */}
                    {selectedCard.motivoFrequencia ? (
                      <div className="p-2.5 bg-white/90 rounded-xl border border-emerald-200/70 text-xs text-forest/90 space-y-0.5">
                        <span className="text-[10px] font-bold uppercase text-emerald-800 block">Motivo / Justificativa Registrado:</span>
                        <p className="italic font-medium">{selectedCard.motivoFrequencia}</p>
                      </div>
                    ) : (
                      <div className="p-2 bg-amber-50/90 rounded-xl border border-amber-200 text-[11px] text-amber-900 font-medium flex items-center justify-between">
                        <span>{!selectedCard.frequenciaSessoes ? "Frequência ainda não definida." : "Nenhum motivo registrado ainda."}</span>
                        <span className="text-[10px] font-bold text-amber-800 uppercase">
                          {!selectedCard.frequenciaSessoes ? "* Selecione abaixo" : "* Motivo obrigatório ao alterar"}
                        </span>
                      </div>
                    )}

                    {/* Botões de Seleção Rápida de Frequência */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold uppercase text-emerald-800/70 block">Atalhos Rápidos de Frequência:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {["Semanal", "Quinzenal", "Mensal", "Sob Demanda"].map((freq) => (
                          <button
                            key={freq}
                            type="button"
                            onClick={async () => {
                              if (selectedCard.frequenciaSessoes === freq) return;
                              const isFirstTime = !selectedCard.frequenciaSessoes || !selectedCard.frequenciaSessoes.trim();
                              if (isFirstTime || (selectedCard.motivoFrequencia && selectedCard.motivoFrequencia.trim())) {
                                await handleUpdateAcolhimentoProperty(selectedCard.id, "frequenciaSessoes", freq);
                              } else {
                                setFreqModalTargetCard(selectedCard);
                                setFreqModalValue(freq);
                                setFreqModalMotivo(selectedCard.motivoFrequencia || "");
                                setShowFreqModal(true);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs border cursor-pointer ${
                              selectedCard.frequenciaSessoes === freq
                                ? "bg-emerald-700 text-white border-emerald-800 shadow-xs"
                                : "bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-100"
                            }`}
                          >
                            {freq}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Edição do Motivo ou Abrir Modal */}
                    <div className="pt-2 border-t border-emerald-200/60 flex flex-col sm:flex-row items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFreqModalTargetCard(selectedCard);
                          setFreqModalValue(selectedCard.frequenciaSessoes || "Semanal");
                          setFreqModalMotivo(selectedCard.motivoFrequencia || "");
                          setShowFreqModal(true);
                        }}
                        className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-emerald-200" />
                        {selectedCard.frequenciaSessoes ? "Alterar Frequência e Motivo" : "Definir Frequência de Sessões"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Banner de Investimento Estimado Mensal */}
                <div className="p-4 bg-gradient-to-r from-emerald-50/90 via-white to-emerald-100/60 border border-emerald-200/90 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs">
                  <div className="flex items-center gap-3 text-forest">
                    <div className="p-2.5 bg-emerald-700 text-white rounded-xl shadow-2xs shrink-0">
                      <Calculator className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-900 block">
                        Investimento Estimado Mensal (Proposta)
                      </span>
                      <span className="text-lg font-extrabold text-forest block mt-0.5">
                        {(() => {
                          if (!selectedCard.valorSessao) return "A combinar";
                          if (selectedCard.valorSessao.toLowerCase().includes("gratuito")) return "Gratuito";
                          const matches = selectedCard.valorSessao.match(/(\d+[\d.,]*)/);
                          if (!matches) return "A combinar";
                          let cleanValor = matches[0];
                          if (cleanValor.includes(",") && cleanValor.includes(".")) {
                            cleanValor = cleanValor.replace(/\./g, "").replace(",", ".");
                          } else if (cleanValor.includes(",")) {
                            cleanValor = cleanValor.replace(",", ".");
                          }
                          const valorNum = parseFloat(cleanValor);
                          if (isNaN(valorNum) || valorNum <= 0) return "A combinar";

                          let mult = 4;
                          const freq = (selectedCard.frequenciaSessoes || "Semanal").toLowerCase();
                          if (freq.includes("quinzenal")) mult = 2;
                          else if (freq.includes("mensal")) mult = 1;
                          else if (freq.includes("sob demanda")) mult = 1;

                          const total = valorNum * mult;
                          return `R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mês (aprox. ${mult} sessões)`;
                        })()}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] text-forest/70 italic bg-white/90 px-3 py-1.5 rounded-xl border border-emerald-200/80 shrink-0">
                    *Cálculo base ({selectedCard.valorSessao || "A combinar"} x {selectedCard.frequenciaSessoes || "Semanal"})
                  </span>
                </div>

                {/* Seleção e Atribuição de Profissional */}
                {currentRole !== "profissional" ? (
                  <div className="space-y-3 pt-2 border-t border-soft">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-forest" /> Atribuir a Profissional Parceiro
                      </h5>
                      <span className="text-[11px] font-semibold text-forest/60">
                        {profissionaisAtivos.filter(p => p.role === "profissional").length} profissionais ativos disponíveis
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[22rem] overflow-y-auto pr-1 custom-scrollbar">
                      <div
                        onClick={() => handleUpdateAcolhimentoProperty(selectedCard.id, "profissionalId", "")}
                        className={`p-3.5 rounded-2xl cursor-pointer transition-all border flex items-center justify-between ${!selectedCard.profissionalId ? "border-sun bg-sun/20 shadow-2xs font-bold ring-2 ring-sun/40" : "border-soft bg-warm/20 hover:bg-white hover:border-sun/50"}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-warm border border-soft flex items-center justify-center font-bold text-xs text-forest/70">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-forest block">Fila de Espera / Triagem</span>
                            <span className="text-[10px] text-forest/50 uppercase block">Desatribuído</span>
                          </div>
                        </div>
                      </div>

                      {profissionaisAtivos.map((p) => {
                        if (p.role !== "profissional") return null;
                        const stats = getProfStats(p.uid!);
                        const isSelected = selectedCard.profissionalId === p.uid;
                        return (
                          <div
                            key={p.uid}
                            onClick={() => handleUpdateAcolhimentoProperty(selectedCard.id, "profissionalId", p.uid!)}
                            className={`p-3.5 rounded-2xl cursor-pointer transition-all border flex items-center justify-between gap-3 ${isSelected ? "border-emerald-500 bg-emerald-50/90 shadow-2xs ring-2 ring-emerald-400" : "border-soft bg-white hover:bg-warm/40 hover:border-emerald-300"}`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${isSelected ? "bg-emerald-700 text-white" : "bg-warm text-forest/70"}`}>
                                {p.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex flex-col truncate">
                                <span className="text-xs font-bold text-forest truncate">{p.name || p.email}</span>
                                <span className="text-[9px] uppercase font-bold text-forest/50">CRP: {p.crp || "Inscrito"}</span>
                              </div>
                            </div>

                            <div className="flex gap-2 text-right shrink-0 bg-warm/60 px-2 py-1 rounded-xl border border-soft/60">
                              <div className="flex flex-col items-end">
                                <span className="text-[8px] text-forest/50 font-bold uppercase">Ativos</span>
                                <span className="text-xs font-extrabold text-forest">{stats.ativosCount}</span>
                              </div>
                              <div className="w-px bg-soft"></div>
                              <div className="flex flex-col items-end">
                                <span className="text-[8px] text-forest/50 font-bold uppercase">Total</span>
                                <span className="text-xs font-extrabold text-emerald-700">R$ {stats.valorTotal.toFixed(0)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-warm/30 border border-soft rounded-2xl space-y-3">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-forest" /> Controle de Vínculo Clínico
                    </h5>
                    <p className="text-xs text-forest/60">
                      Confirme o vínculo clínico abaixo. Caso necessite devolver este paciente para a Triagem, utilize o botão de devolução.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-1">
                      <button
                        disabled={selectedCard.atribuicaoStatus === "Aceito"}
                        onClick={async () => {
                          const notifAnterior = selectedCard.notificacao ? selectedCard.notificacao + "\n\n" : "";
                          const nowStr = new Date().toLocaleString("pt-BR");
                          const authName = profile?.name || "Parceiro";
                          const updates: any = {
                            atribuicaoStatus: "Aceito",
                            status: "Em Atendimento",
                            notificacao: `${notifAnterior}[${nowStr}] Encaminhamento ACEITO pelo profissional ${authName}. Paciente saiu da Fila de Espera e passou para a aba Pacientes (Em Atendimento).`,
                          };
                          await updateDoc(doc(db, "acolhimentos", selectedCard.id), updates);
                          setSelectedCard({ ...selectedCard, ...updates });
                        }}
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                          selectedCard.atribuicaoStatus === "Aceito"
                            ? "bg-[#34A853] text-white shadow-2xs disabled:opacity-100"
                            : "bg-white text-forest border border-soft hover:bg-[#34A853]/10 hover:text-[#34A853]"
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {selectedCard.atribuicaoStatus === "Aceito" ? "Paciente Aceito no Vínculo" : "Aceitar Paciente"}
                      </button>

                      <button
                        onClick={() => {
                          setDevolverModalConfig({
                            isOpen: true,
                            pacienteId: selectedCard.id,
                            pacienteName: (selectedCard as any).nomeCompleto || "Paciente",
                          });
                        }}
                        className="px-5 py-2.5 bg-white text-red-600 border border-red-200 rounded-xl text-xs font-semibold hover:bg-red-50 transition-colors"
                      >
                        {selectedCard.atribuicaoStatus === "Aceito" ? "Devolver / Desatribuir" : "Devolver Paciente"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Card do Profissional Responsável (quando houver) */}
                {selectedCard.profissionalId &&
                  (() => {
                    const matchedProf = allUsers.find(
                      (u) => u.uid === selectedCard.profissionalId || u.id === selectedCard.profissionalId,
                    );
                    if (!matchedProf) return null;
                    const publicLink = `${window.location.origin}?prof=${matchedProf.uid || matchedProf.id || ""}`;
                    return (
                      <div className="bg-warm/30 p-5 rounded-2xl border border-soft space-y-3">
                        <div className="flex items-center gap-3.5 border-b border-soft pb-3">
                          <div className="w-12 h-12 rounded-2xl overflow-hidden bg-forest/10 border-2 border-sun shrink-0 flex items-center justify-center">
                            {matchedProf.photoUrl ? (
                              <img src={matchedProf.photoUrl} alt={matchedProf.name} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-6 h-6 text-forest/70" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-bold text-sun-dark uppercase tracking-wider block">
                              Profissional Responsável Vinculado
                            </span>
                            <h5 className="font-bold text-forest text-sm truncate">{matchedProf.name}</h5>
                            <p className="text-xs text-forest/70 font-mono">
                              {matchedProf.especialidade || "Psicólogo Clínico"} {matchedProf.crp ? `• CRP: ${matchedProf.crp}` : ""}
                            </p>
                          </div>

                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(publicLink);
                              showToast("Link do profissional copiado!", "success");
                            }}
                            className="px-3 py-1.5 bg-white text-forest text-xs font-bold rounded-xl border border-soft hover:bg-warm transition-colors shrink-0 flex items-center gap-1.5"
                          >
                            <Copy className="w-3.5 h-3.5" /> Copiar Apresentação
                          </button>
                        </div>

                        {matchedProf.biografia && (
                          <div className="bg-white p-3 rounded-xl text-xs text-forest/80 italic leading-relaxed whitespace-pre-wrap max-h-24 overflow-y-auto custom-scrollbar border border-soft/60">
                            "{matchedProf.biografia}"
                          </div>
                        )}
                      </div>
                    );
                  })()}
              </div>

              {/* 7. NOTIFICAÇÃO E RESUMO DO CASO */}
              <div id="sec-7-resumo" className="bg-white p-4 sm:p-6 rounded-2xl border border-emerald-200/90 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-soft pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-emerald-700 text-white rounded-xl shadow-2xs">
                      <Send className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-forest uppercase tracking-wider">
                        7. Notificação & Resumo do Caso
                      </h4>
                      <p className="text-xs text-forest/60">
                        Encaminhamento direto e notificação ao profissional parceiro
                      </p>
                    </div>
                  </div>

                  {selectedCard.profissionalId && (
                    <span className="text-[10px] font-bold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                      Pronto para Disparo
                    </span>
                  )}
                </div>

                {!selectedCard.profissionalId ? (
                  <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-3">
                    <Info className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>
                      Nenhum profissional atribuído a este paciente ainda. Selecione um profissional parceiro na seção acima para liberar o envio do resumo do caso.
                    </span>
                  </div>
                ) : (
                  (() => {
                    const assignedProf =
                      allUsers.find(
                        (u) => u.uid === selectedCard.profissionalId || u.id === selectedCard.profissionalId,
                      ) ||
                      profissionaisAtivos.find(
                        (p) => p.uid === selectedCard.profissionalId || p.id === selectedCard.profissionalId,
                      );

                    const caseSummaryText = buildCaseSummaryText(selectedCard);
                    const rawPhone = assignedProf?.telefone || assignedProf?.whatsapp || "";
                    const digitsOnly = rawPhone.replace(/\D/g, "");
                    const formattedPhone =
                      digitsOnly.length > 0
                        ? digitsOnly.startsWith("55")
                          ? digitsOnly
                          : `55${digitsOnly}`
                        : "";

                    return (
                      <div className="space-y-4">
                        <div className="p-4 bg-warm/30 border border-soft rounded-xl space-y-2">
                          <div className="flex flex-wrap items-center justify-between text-xs text-forest/70 font-semibold border-b border-soft pb-2 gap-2">
                            <span>Destinatário: <strong className="text-forest font-bold">{assignedProf?.name || assignedProf?.email || "Profissional Parceiro"}</strong></span>
                            <span className="text-[11px] text-forest/60 font-mono">
                              {assignedProf?.email || "Sem e-mail"} {assignedProf?.telefone ? `• ${assignedProf.telefone}` : ""}
                            </span>
                          </div>

                          <label className="text-[10px] font-bold uppercase tracking-wider text-forest/60 block pt-1">
                            Texto Estruturado do Resumo do Caso
                          </label>

                          <div className="p-4 bg-white border border-soft rounded-lg font-sans text-xs text-forest leading-relaxed whitespace-pre-wrap select-all max-h-56 overflow-y-auto custom-scrollbar">
                            {caseSummaryText}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const profEmail = assignedProf?.email;
                                  if (!profEmail) {
                                    showToast("O profissional vinculado não possui e-mail cadastrado.", "error");
                                    return;
                                  }
                                  await sendWebhookNotification({
                                    event: "notificacao_resumo_caso",
                                    recipientEmail: profEmail,
                                    recipientName: assignedProf?.name || "Profissional Parceiro",
                                    title: `Resumo do Caso: ${selectedCard.nome || "Paciente"} - Projeto AcolheMente`,
                                    message: caseSummaryText,
                                    data: {
                                      pacienteId: selectedCard.id,
                                      pacienteNome: selectedCard.nome || selectedCard.nomeCompleto || "",
                                      genero: selectedCard.genero || "",
                                      motivo: selectedCard.motivo || "",
                                      melhoresPeriodos: selectedCard.melhoresPeriodos || "",
                                      valorSessao: selectedCard.valorSessao || "",
                                      frequenciaSessoes: selectedCard.frequenciaSessoes || "",
                                      timestamp: new Date().toISOString(),
                                    },
                                  });
                                  showToast(`Resumo do caso enviado por e-mail para ${profEmail}!`, "success");
                                } catch (err) {
                                  console.error("Erro ao enviar email do caso:", err);
                                  showToast("Erro ao disparar e-mail de notificação.", "error");
                                }
                              }}
                              className="px-4 py-2.5 bg-forest hover:bg-forest/90 text-white font-bold text-xs rounded-xl transition-all shadow-2xs flex items-center gap-2"
                            >
                              <Mail className="w-4 h-4" /> Disparar E-mail
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const waUrl = formattedPhone
                                  ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(caseSummaryText)}`
                                  : `https://wa.me/?text=${encodeURIComponent(caseSummaryText)}`;
                                window.open(waUrl, "_blank");
                              }}
                              className="px-4 py-2.5 bg-[#25D366] hover:bg-[#20b858] text-white font-bold text-xs rounded-xl transition-all shadow-2xs flex items-center gap-2"
                            >
                              <Phone className="w-4 h-4" /> Enviar WhatsApp
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(caseSummaryText);
                                showToast("Resumo do caso copiado para a área de transferência!", "success");
                              }}
                              className="px-3.5 py-2.5 bg-white hover:bg-warm border border-soft text-forest font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                            >
                              <Copy className="w-3.5 h-3.5" /> Copiar Resumo
                            </button>
                          </div>

                          <span className="text-[11px] text-forest/60 italic">
                            ⚡ Notificação direta em canal seguro.
                          </span>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>

              {/* 8. EVOLUÇÃO E REGISTROS CLÍNICOS COMPARTILHADOS */}
              <div id="sec-8-registros" className="bg-white p-4 sm:p-6 rounded-2xl border border-soft shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-soft pb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-forest" /> 8. Evolução e Registros Clínicos Compartilhados
                  </h4>
                  <span className="text-[10px] font-semibold text-forest/60">
                    Histórico Clínico
                  </span>
                </div>
                <p className="text-xs text-forest/60">
                  Anotações sobre a evolução clínica, encaminhamentos e apontamentos compartilhados com a equipe.
                </p>
                <DebouncedTextArea
                  className="w-full text-sm bg-warm/30 border border-soft px-4 py-3.5 rounded-xl focus:outline-none focus:border-sun-dark resize-none h-32 leading-relaxed"
                  placeholder="Digite as notas de evolução, observações clínicas ou registros de reuniões..."
                  value={selectedCard.registrosDeReunioes || ""}
                  onChange={(val) => handleUpdateAcolhimentoProperty(selectedCard.id, "registrosDeReunioes", val)}
                />
              </div>

              {/* 9. ALERTAS ADM E MOVIMENTAÇÕES */}
              <div id="sec-9-alertas" className="bg-white p-4 sm:p-6 rounded-2xl border border-soft shadow-2xs space-y-6">
                <div className="flex items-center justify-between border-b border-soft pb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-red-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" /> 9. Alertas Administrativos e Movimentações
                  </h4>
                  <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full">
                    Avisos & Timeline
                  </span>
                </div>

                {/* Alertas Box */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-red-900 block">
                    Alertas Clínicos ou Administrativos (Avisos de Risco / Notificações)
                  </label>
                  <DebouncedTextArea
                    className="w-full text-sm bg-red-50/40 border border-red-200 px-4 py-3.5 rounded-xl focus:outline-none focus:border-red-400 resize-none h-24 text-red-900 placeholder:text-red-900/40 leading-relaxed"
                    placeholder="Ex: Risco de abandono, pendência de documentação do responsável, alteração de horário..."
                    value={selectedCard.notificacao || ""}
                    onChange={(val) => handleUpdateAcolhimentoProperty(selectedCard.id, "notificacao", val)}
                  />
                </div>

                {/* Desligamento Info Banner if present */}
                {selectedCard.desligamentoMotivo && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between border-b border-rose-200/60 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                        <UserX className="w-4 h-4 text-rose-600" /> Registro Oficial de Desligamento
                      </span>
                      {selectedCard.desligadoEm && (
                        <span className="text-[10px] font-extrabold text-rose-800 bg-white px-2.5 py-0.5 rounded-md border border-rose-200">
                          Data: {formatDate(selectedCard.desligadoEm)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-rose-950 font-semibold">
                      Motivo Declarado: <span className="font-extrabold text-rose-900 bg-white/90 px-2 py-0.5 rounded border border-rose-200">{selectedCard.desligamentoMotivo}</span>
                      {selectedCard.desligadoPor && <span className="text-rose-700 font-normal ml-2">(Registrado por: {selectedCard.desligadoPor})</span>}
                    </div>
                    {selectedCard.desligamentoDetalhes && (
                      <p className="text-xs text-rose-900 bg-white/90 p-3 rounded-xl border border-rose-200 leading-relaxed font-serif italic">
                        "{selectedCard.desligamentoDetalhes}"
                      </p>
                    )}
                  </div>
                )}

                {/* Registro de Pausa / Cancelamento da Proposta */}
                {selectedCard.motivoPausaCancelamento && (
                  <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                        <PauseCircle className="w-4 h-4 text-amber-700" /> Registro de Pausa / Cancelamento da Proposta (Standby)
                      </span>
                      {selectedCard.dataPausaCancelamento && (
                        <span className="text-[10px] font-extrabold text-amber-900 bg-white px-2.5 py-0.5 rounded-md border border-amber-300">
                          Data: {formatDate(selectedCard.dataPausaCancelamento)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-amber-950">
                      <strong>Motivo informado pelo paciente:</strong>
                      <p className="mt-1 p-2.5 bg-white/90 rounded-xl border border-amber-200 text-forest font-serif italic leading-relaxed">
                        "{selectedCard.motivoPausaCancelamento}"
                      </p>
                    </div>
                  </div>
                )}

                {/* Registro de Solicitação de Revisão */}
                {selectedCard.motivoRevisao && (
                  <div className="p-4 bg-orange-50 border border-orange-300 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between border-b border-orange-200/60 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-orange-950 flex items-center gap-1.5">
                        <RotateCcw className="w-4 h-4 text-orange-700" /> Registro de Solicitação de Revisão de Proposta
                      </span>
                      {selectedCard.dataSolicitacaoRevisao && (
                        <span className="text-[10px] font-extrabold text-orange-900 bg-white px-2.5 py-0.5 rounded-md border border-orange-300">
                          Data: {formatDate(selectedCard.dataSolicitacaoRevisao)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-orange-950">
                      <strong>Motivo / observações do paciente:</strong>
                      <p className="mt-1 p-2.5 bg-white/90 rounded-xl border border-orange-200 text-forest font-serif italic leading-relaxed">
                        "{selectedCard.motivoRevisao}"
                      </p>
                    </div>
                  </div>
                )}

                {/* Linha do Tempo e Movimentações */}
                <div className="p-4 bg-warm/30 border border-soft rounded-xl space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-forest/70 block">
                    Histórico de Movimentações & Registros da Ficha
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 bg-white rounded-lg border border-soft">
                      <span className="text-[10px] text-forest/50 font-bold uppercase block">Data de Entrada</span>
                      <span className="font-semibold text-forest">{formatDate(selectedCard.createdAt)}</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-soft">
                      <span className="text-[10px] text-forest/50 font-bold uppercase block">Última Atualização</span>
                      <span className="font-semibold text-forest">{formatDate(selectedCard.statusUpdatedAt || selectedCard.createdAt)}</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-soft">
                      <span className="text-[10px] text-forest/50 font-bold uppercase block">Estágio do Kanban</span>
                      <span className="font-bold text-forest">{selectedCard.status || "Aguardando Avaliação"}</span>
                    </div>
                    <div className="p-2.5 bg-white rounded-lg border border-soft">
                      <span className="text-[10px] text-forest/50 font-bold uppercase block">Contrato de Serviço</span>
                      <span className={`font-bold ${selectedCard.contratoAssinado ? "text-green-700" : "text-amber-700"}`}>
                        {selectedCard.contratoAssinado ? "Assinado" : "Pendente"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 10. NOTIFICAÇÕES & DISPARO DIRETO (WHATSAPP & E-MAIL WEBHOOK) */}
              <div id="sec-10-notificacoes" className="bg-white p-4 sm:p-6 rounded-2xl border border-soft shadow-2xs space-y-6">
                <div className="flex flex-wrap items-center justify-between border-b border-soft pb-3 gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-700" /> 10. Notificações ao Paciente (Whats / E-mail Webhook)
                  </h4>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${whatsappState === "open" ? "bg-emerald-50 text-emerald-800 border-emerald-300" : "bg-amber-50 text-amber-800 border-amber-300"}`}>
                      WhatsApp: {whatsappState === "open" ? "Instância Conectada" : "Instância Desconectada"}
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-sky-50 text-sky-800 border-sky-300">
                      E-mail: Brevo / Webhook Ativo
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card de Contato Atual do Paciente */}
                  <div className="p-4 bg-warm/30 border border-soft rounded-xl space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-forest/70 block">
                      Dados de Destino na Ficha de Bordo
                    </span>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-forest">WhatsApp:</span>
                        <span className="text-forest/80 font-mono">{selectedCard.telefone || "Não cadastrado"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span className="font-semibold text-forest">E-mail:</span>
                        <span className="text-forest/80 font-mono">{selectedCard.email || "Não cadastrado"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Resumo do Status de Comunicação */}
                  <div className="p-4 bg-warm/30 border border-soft rounded-xl space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-forest/70 block">
                      Status de Notificações Registradas
                    </span>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-forest/70">Proposta Notificada:</span>
                        <span className={`font-bold ${selectedCard.propostaEnviada ? "text-emerald-700" : "text-amber-700"}`}>
                          {selectedCard.propostaEnviada ? `Sim (${selectedCard.propostaEnviadaEm ? formatDate(selectedCard.propostaEnviadaEm) : "Enviada"})` : "Pendente"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-forest/70">Contato de Boas-Vindas:</span>
                        <span className={`font-bold ${selectedCard.contatoEnviado ? "text-emerald-700" : "text-amber-700"}`}>
                          {selectedCard.contatoEnviado ? `Sim (${selectedCard.contatoEnviadoEm ? formatDate(selectedCard.contatoEnviadoEm) : "Enviado"})` : "Pendente"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ações de Disparo */}
                <div className="p-4.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5 max-w-lg">
                      <h5 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5 text-emerald-700" /> Disparo Sob Demanda & Mensagens Eventuais
                      </h5>
                      <p className="text-[11px] text-emerald-900/80 leading-relaxed">
                        Envie notificações pontuais via WhatsApp (Evolution API) e E-mail (Brevo / Webhook). Selecione modelos rápidos pré-configurados, gatilhos da Régua oficial ou redija uma mensagem livre e eventual para este paciente.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setNotificarInitialMode("templates");
                          setShowNotificarModal(true);
                        }}
                        className="px-3.5 py-2 bg-white border border-emerald-300 hover:bg-emerald-100/50 text-emerald-900 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
                      >
                        <Layers className="w-3.5 h-3.5 text-emerald-700" />
                        Régua &amp; Modelos
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNotificarInitialMode("custom");
                          setShowNotificarModal(true);
                        }}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-sun" />
                        Mensagem Específica / Eventual
                      </button>
                    </div>
                  </div>

                  {/* Atalhos Rápidos por Assunto */}
                  <div className="pt-2 border-t border-emerald-200/60 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900/70 mr-1">
                      Atalhos rápidos:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setNotificarInitialMode("templates");
                        setNotificarInitialTemplateId("proposta");
                        setShowNotificarModal(true);
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-900 rounded-lg text-[11px] font-semibold border border-emerald-200/80 transition-colors flex items-center gap-1"
                    >
                      📋 Proposta
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNotificarInitialMode("templates");
                        setNotificarInitialTemplateId("boas_vindas");
                        setShowNotificarModal(true);
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-900 rounded-lg text-[11px] font-semibold border border-emerald-200/80 transition-colors flex items-center gap-1"
                    >
                      🤝 Boas-Vindas
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNotificarInitialMode("templates");
                        setNotificarInitialTemplateId("lembrete_sessao");
                        setShowNotificarModal(true);
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-900 rounded-lg text-[11px] font-semibold border border-emerald-200/80 transition-colors flex items-center gap-1"
                    >
                      ⏰ Lembrete
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNotificarInitialMode("custom");
                        setShowNotificarModal(true);
                      }}
                      className="px-2.5 py-1 bg-sun-dark/20 hover:bg-sun-dark/40 text-forest rounded-lg text-[11px] font-bold border border-sun-dark/30 transition-colors flex items-center gap-1"
                    >
                      ✨ Redigir Avulsa
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-soft bg-warm/50 flex items-center justify-between shrink-0">
              <span className="text-xs text-forest/60 font-medium">
                AcolheMente • Gestão de Ficha de Bordo
              </span>
              <button
                onClick={() => setSelectedCard(null)}
                className="px-6 py-2 bg-sun-dark text-forest rounded-full text-sm font-bold hover:bg-sun-dark-dark transition-colors shadow-2xs"
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

      {/* Notificar Modal com WhatsApp & E-mail Webhook */}
      {showNotificarModal && notificarTarget && (
        <PatientNotificationModal
          isOpen={showNotificarModal}
          onClose={() => setShowNotificarModal(false)}
          target={notificarTarget}
          profissionaisAtivos={profissionaisAtivos}
          whatsappConnected={whatsappState === "open"}
          globalConfigs={globalConfigs}
          initialMode={notificarInitialMode}
          initialTemplateId={notificarInitialTemplateId}
          onShowToast={showToast}
          onTargetUpdated={(updatedFields) => {
            if (selectedCard && selectedCard.id === notificarTarget.id) {
              setSelectedCard((prev: any) => (prev ? { ...prev, ...updatedFields } : null));
            }
          }}
        />
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

      {/* Desligamento Modal */}
      {showDesligamentoModal && selectedCard && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-forest/30 backdrop-blur-sm animate-in fade-in py-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-soft overflow-hidden animate-in zoom-in-95 flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-soft bg-gradient-to-r from-rose-50 via-white to-rose-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-xs">
                  <UserX className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-forest">
                    Fluxo de Desligamento de Paciente
                  </h3>
                  <p className="text-xs text-forest/60">
                    Paciente: <strong className="text-forest font-bold">{selectedCard.nome || (selectedCard as any).nomeCompleto || "Paciente"}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDesligamentoModal(false)}
                className="p-1.5 text-forest/50 hover:text-rose-600 rounded-full hover:bg-rose-50 transition-colors"
                title="Fechar"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-2xl text-xs text-rose-900 leading-relaxed">
                <strong>Atenção:</strong> Ao concluir o desligamento, o atendimento do paciente será interrompido, o status será atualizado para <strong>Alta / Desligado</strong> e as justificativas ficarão registradas na ficha de bordo.
              </div>

              {/* Motivo de Desligamento (Select) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-1">
                  Motivo do Desligamento <span className="text-rose-600 font-bold">*</span>
                </label>
                <select
                  value={desligamentoMotivo}
                  onChange={(e) => setDesligamentoMotivo(e.target.value)}
                  className="w-full bg-white text-xs font-semibold text-forest border border-soft rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-2xs"
                >
                  <option value="">-- Selecione o Motivo --</option>
                  <option value="Alta Clínica">Alta Clínica</option>
                  <option value="Interrupção voluntária (Iniciativa do paciente)">Interrupção voluntária (Iniciativa do paciente)</option>
                  <option value="Interrupção involuntária (Iniciativa do profissional)">Interrupção involuntária (Iniciativa do profissional)</option>
                  <option value="Inadimplência">Inadimplência</option>
                  <option value="Absenteismo (Faltas/ Ausências sem justificativa)">Absenteismo (Faltas/ Ausências sem justificativa)</option>
                  <option value="Banimento">Banimento</option>
                  <option value="Outro (descreva)">Outro (descreva)</option>
                </select>
              </div>

              {/* Detalhes / Justificativa (Textarea) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-forest/80 flex items-center gap-1">
                  Justificativa e Detalhes do Desligamento <span className="text-rose-600 font-bold">*</span>
                </label>
                <textarea
                  rows={4}
                  value={desligamentoDetalhes}
                  onChange={(e) => setDesligamentoDetalhes(e.target.value)}
                  placeholder="Comente e descreva os detalhes, motivo e observações do desligamento..."
                  className="w-full bg-white text-xs text-forest p-3.5 border border-soft rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none leading-relaxed placeholder:text-forest/40"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 px-6 border-t border-soft bg-warm/40 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowDesligamentoModal(false)}
                className="px-5 py-2 text-xs font-bold text-forest/70 hover:text-forest transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!desligamentoMotivo.trim()) {
                    showToast("Por favor, selecione o motivo do desligamento.", "error");
                    return;
                  }
                  if (!desligamentoDetalhes.trim()) {
                    showToast("Por favor, preencha a justificativa e os detalhes do desligamento.", "error");
                    return;
                  }

                  try {
                    const nowIso = new Date().toISOString();
                    const nowFormatted = new Date().toLocaleDateString("pt-BR");
                    const userIdent = profile?.name || user?.email || "Profissional";

                    const updates = {
                      status: "Alta",
                      ativo: false,
                      statusInativacao: "Desligado",
                      desligado: true,
                      desligamentoMotivo: desligamentoMotivo,
                      desligamentoDetalhes: desligamentoDetalhes,
                      desligadoEm: nowIso,
                      desligadoPor: userIdent,
                      notificacao: `[DESLIGAMENTO - ${nowFormatted}] Motivo: ${desligamentoMotivo}. Responsável: ${userIdent}.\nDetalhes: ${desligamentoDetalhes}`,
                      statusUpdatedAt: serverTimestamp(),
                    };

                    await updateDoc(doc(db, "acolhimentos", selectedCard.id), updates);

                    setSelectedCard((prev: any) => prev ? { ...prev, ...updates } : null);
                    setAcolhimentos((prev) =>
                      prev.map((c) => (c.id === selectedCard.id ? { ...c, ...updates } : c))
                    );
                    setMeusPacientes((prev) =>
                      prev.map((c) => (c.id === selectedCard.id ? { ...c, ...updates } : c))
                    );

                    showToast("Desligamento do paciente concluído com sucesso!", "success");
                    setShowDesligamentoModal(false);
                  } catch (err) {
                    console.error("Erro ao desligar paciente:", err);
                    showToast("Ocorreu um erro ao concluir o desligamento.", "error");
                  }
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Concluir Desligamento
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

              {/* Benefício Corporativo & Código de Acesso */}
              <section className="bg-white p-2 rounded-2xl border border-soft shadow-xs">
                <EmpresaBeneficioManager
                  empresa={selectedEmpresa}
                  onUpdateSuccess={(data) => {
                    setSelectedEmpresa((prev) => (prev ? { ...prev, ...data } : null));
                  }}
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
                        label="Data de Admissão"
                        value={selectedProfissional.dataAdmissao || selectedProfissional.createdAt}
                        field="dataAdmissao"
                        type="date"
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
                      <div className="mt-3 p-3 bg-warm/80 border border-soft rounded-xl space-y-2 text-xs text-forest">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-forest/70">📌 Período de Teste (7 dias):</span>
                          <span className="font-bold text-forest">
                            {selectedProfissional.vencimentoPagamento
                              ? formatDateSafely(selectedProfissional.vencimentoPagamento)
                              : "7 dias após admissão"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-forest/70">📧 Checkout Automático:</span>
                          <span className="font-bold text-emerald-800">
                            {selectedProfissional.checkoutTrial7DiasEnviado
                              ? `Enviado em ${formatDateSafely(selectedProfissional.checkoutTrial7DiasEnviadoEm)}`
                              : "Pendente (agendado 7 dias pós admissão)"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            const profEmail = selectedProfissional.email;
                            const profName = ("nome" in selectedProfissional ? selectedProfissional.nome : selectedProfissional.name) || "Profissional";
                            const stripeUrl = globalConfigs.stripeCheckoutUrl || "https://buy.stripe.com/acolhemente";
                            const admFmt = formatDateSafely(selectedProfissional.dataAdmissao || selectedProfissional.createdAt);
                            await sendTrialExpiredCheckoutEmail(profName, profEmail, stripeUrl, admFmt);
                            const profId = "id" in selectedProfissional ? selectedProfissional.id : selectedProfissional.uid;
                            if (profId) {
                              await handleUpdateProfissionalProperty(profId, "checkoutTrial7DiasEnviado", true);
                              await handleUpdateProfissionalProperty(profId, "checkoutTrial7DiasEnviadoEm", new Date().toISOString());
                              await handleUpdateProfissionalProperty(profId, "notificacao", `Link de checkout enviado manualmente por e-mail pela Gestão em ${new Date().toLocaleDateString("pt-BR")}.`);
                            }
                            alert(`Link de checkout do Stripe enviado por e-mail para ${profEmail}!`);
                          }}
                          className="w-full mt-1.5 py-2 px-3 bg-forest text-white hover:bg-forest/90 font-bold text-[11px] rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-sun" />
                          Enviar Link de Checkout Agora (E-mail)
                        </button>
                      </div>
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
                        label="Profissão / Título"
                        value={selectedProfissional.profissao}
                        field="profissao"
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
                          <DebouncedInput
                            title="Separado por vírgula"
                            value={
                              selectedProfissional.publicosExperiencia?.join(
                                ", ",
                              ) || ""
                            }
                            onChange={(val) =>
                              handleUpdateProfissionalProperty(
                                "id" in selectedProfissional
                                  ? selectedProfissional.id
                                  : selectedProfissional.uid,
                                "publicosExperiencia",
                                val.split(",").map((s) => s.trim()).filter(Boolean),
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
                          <DebouncedInput
                            title="Separado por vírgula"
                            value={
                              selectedProfissional.publicosGosto?.join(", ") ||
                              ""
                            }
                            onChange={(val) =>
                              handleUpdateProfissionalProperty(
                                "id" in selectedProfissional
                                  ? selectedProfissional.id
                                  : selectedProfissional.uid,
                                "publicosGosto",
                                val.split(",").map((s) => s.trim()).filter(Boolean),
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

      {/* Modal de Inclusão Manual de Paciente (Triagem) */}
      {showNovoPacienteModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6 bg-forest/40 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-soft overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 flex justify-between items-center border-b border-soft bg-warm/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-forest text-sun flex items-center justify-center shadow-sm">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-medium text-forest">
                    Cadastro Manual de Paciente
                  </h3>
                  <p className="text-xs text-forest/70">
                    Preencha a ficha de acolhimento para inserção direta na fila de Triagem.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowNovoPacienteModal(false);
                  handleResetNovoPacienteForm();
                }}
                className="p-2 text-forest/60 hover:text-red-500 rounded-full hover:bg-white transition-colors"
                type="button"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="px-6 py-2 border-b border-soft bg-white shrink-0 flex gap-1.5 overflow-x-auto text-xs font-semibold no-scrollbar">
              <button
                type="button"
                onClick={() => setNovoPacienteTab("pessoais")}
                className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  novoPacienteTab === "pessoais"
                    ? "bg-forest text-sun font-bold shadow-xs"
                    : "text-forest/70 hover:bg-warm"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                1. Dados Pessoais & Contato
              </button>
              <button
                type="button"
                onClick={() => setNovoPacienteTab("financeiros")}
                className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  novoPacienteTab === "financeiros"
                    ? "bg-forest text-sun font-bold shadow-xs"
                    : "text-forest/70 hover:bg-warm"
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                2. Financeiro & Renda
              </button>
              <button
                type="button"
                onClick={() => setNovoPacienteTab("demografia")}
                className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  novoPacienteTab === "demografia"
                    ? "bg-forest text-sun font-bold shadow-xs"
                    : "text-forest/70 hover:bg-warm"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                3. Moradia & Tecnologia
              </button>
              <button
                type="button"
                onClick={() => setNovoPacienteTab("saude")}
                className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  novoPacienteTab === "saude"
                    ? "bg-forest text-sun font-bold shadow-xs"
                    : "text-forest/70 hover:bg-warm"
                }`}
              >
                <Heart className="w-3.5 h-3.5" />
                4. Saúde Mental & Demanda
              </button>
              <button
                type="button"
                onClick={() => setNovoPacienteTab("triagem")}
                className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  novoPacienteTab === "triagem"
                    ? "bg-forest text-sun font-bold shadow-xs"
                    : "text-forest/70 hover:bg-warm"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                5. Anotações de Triagem
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveNovoPaciente} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: DADOS PESSOAIS & CONTATO */}
              {novoPacienteTab === "pessoais" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-forest/80 mb-1.5 block">
                        Tratamento Para *
                      </label>
                      <select
                        value={novoPacienteForm.tratamentoPara}
                        onChange={(e) =>
                          setNovoPacienteForm((prev) => ({
                            ...prev,
                            tratamentoPara: e.target.value,
                          }))
                        }
                        className="w-full text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark text-forest font-medium"
                      >
                        <option value="Mim">Para mim mesmo(a)</option>
                        <option value="Outra pessoa">Para outra pessoa</option>
                      </select>
                    </div>

                    {novoPacienteForm.tratamentoPara === "Outra pessoa" && (
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-forest/80 mb-1.5 block">
                          Faixa Etária do Paciente *
                        </label>
                        <select
                          value={novoPacienteForm.idadeTratamento}
                          onChange={(e) =>
                            setNovoPacienteForm((prev) => ({
                              ...prev,
                              idadeTratamento: e.target.value,
                            }))
                          }
                          className="w-full text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark text-forest font-medium"
                        >
                          <option value="Adulto">Adulto (maior de idade)</option>
                          <option value="Menor">Criança ou adolescente (menor de idade)</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-forest/80 mb-1.5 block">
                        Nome Completo do Paciente *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="ex: Maria das Dores Silva"
                        value={novoPacienteForm.nome}
                        onChange={(e) =>
                          setNovoPacienteForm((prev) => ({
                            ...prev,
                            nome: e.target.value,
                          }))
                        }
                        className="w-full text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-forest/80 mb-1.5 block">
                        Data de Nascimento (Dia - Mês - Ano) *
                      </label>
                      <input
                        type="date"
                        required
                        value={novoPacienteForm.dataNascimento}
                        onChange={(e) =>
                          setNovoPacienteForm((prev) => ({
                            ...prev,
                            dataNascimento: e.target.value,
                          }))
                        }
                        className="w-full text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                      />
                      <span className="text-[11px] text-forest/60 mt-1 block">Formato: dia - mês - ano (DD/MM/AAAA)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-forest/80 mb-1.5 block">
                        CPF do Paciente
                      </label>
                      <input
                        type="text"
                        placeholder="000.000.000-00"
                        value={novoPacienteForm.cpf}
                        onChange={(e) =>
                          setNovoPacienteForm((prev) => ({
                            ...prev,
                            cpf: e.target.value,
                          }))
                        }
                        className="w-full text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark text-forest font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-forest/80 mb-1.5 block">
                        Gênero
                      </label>
                      <select
                        value={novoPacienteForm.genero}
                        onChange={(e) =>
                          setNovoPacienteForm((prev) => ({
                            ...prev,
                            genero: e.target.value,
                          }))
                        }
                        className="w-full text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                      >
                        <option value="Feminino">Feminino</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Não-binário">Não-binário</option>
                        <option value="Prefiro não informar">Prefiro não informar</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-forest/80 mb-1.5 block">
                        Estado Civil
                      </label>
                      <select
                        value={novoPacienteForm.estadoCivil}
                        onChange={(e) =>
                          setNovoPacienteForm((prev) => ({
                            ...prev,
                            estadoCivil: e.target.value,
                          }))
                        }
                        className="w-full text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                      >
                        <option value="Solteiro(a)">Solteiro(a)</option>
                        <option value="Casado(a) / União Estável">Casado(a) / União Estável</option>
                        <option value="Divorciado(a) / Separado(a)">Divorciado(a) / Separado(a)</option>
                        <option value="Viúvo(a)">Viúvo(a)</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-forest/80 mb-1.5 block">
                        Possui Filhos?
                      </label>
                      <select
                        value={novoPacienteForm.temFilhos}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNovoPacienteForm((prev) => ({
                            ...prev,
                            temFilhos: val,
                            faixaEtariaFilhos: val === "Não possui filhos" ? "Não se aplica (sem filhos)" : prev.faixaEtariaFilhos,
                            filhosMoramJunto: val === "Não possui filhos" ? "Não se aplica (sem filhos)" : prev.filhosMoramJunto,
                          }));
                        }}
                        className="w-full text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                      >
                        <option value="Não possui filhos">Não possui filhos</option>
                        <option value="Sim (1 filho)">Sim (1 filho)</option>
                        <option value="Sim (2 filhos)">Sim (2 filhos)</option>
                        <option value="Sim (3 ou mais filhos)">Sim (3 ou mais filhos)</option>
                      </select>
                    </div>
                  </div>

                  {novoPacienteForm.temFilhos !== "Não possui filhos" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-warm/50 border border-soft rounded-2xl">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-forest/80 mb-1.5 block">
                          Faixa Etária dos Filhos
                        </label>
                        <select
                          value={novoPacienteForm.faixaEtariaFilhos}
                          onChange={(e) =>
                            setNovoPacienteForm((prev) => ({
                              ...prev,
                              faixaEtariaFilhos: e.target.value,
                            }))
                          }
                          className="w-full text-sm bg-white border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                        >
                          <option value="Não se aplica (sem filhos)">Não se aplica (sem filhos)</option>
                          <option value="Bebê / Primeira Infância (0 a 5 anos)">Bebê / Primeira Infância (0 a 5 anos)</option>
                          <option value="Crianças (6 a 11 anos)">Crianças (6 a 11 anos)</option>
                          <option value="Adolescentes (12 a 17 anos)">Adolescentes (12 a 17 anos)</option>
                          <option value="Adultos (18+ anos)">Adultos (18+ anos)</option>
                          <option value="Crianças e Adolescentes (faixas variadas)">Crianças e Adolescentes (faixas variadas)</option>
                          <option value="Outra / Diversas idades">Outra / Diversas idades</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-forest/80 mb-1.5 block">
                          Moram com o Paciente?
                        </label>
                        <select
                          value={novoPacienteForm.filhosMoramJunto}
                          onChange={(e) =>
                            setNovoPacienteForm((prev) => ({
                              ...prev,
                              filhosMoramJunto: e.target.value,
                            }))
                          }
                          className="w-full text-sm bg-white border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                        >
                          <option value="Não se aplica (sem filhos)">Não se aplica (sem filhos)</option>
                          <option value="Sim, moram na mesma residência">Sim, moram na mesma residência</option>
                          <option value="Não, moram em outra residência">Não, moram em outra residência</option>
                          <option value="Alguns moram na mesma residência">Alguns moram na mesma residência</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {(novoPacienteForm.tratamentoPara === "Outra pessoa" ||
                    novoPacienteForm.idadeTratamento === "Menor") && (
                    <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-3">
                      <p className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-amber-700" />
                        Dados do Responsável Legal (Para Menor / Terceiro)
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-amber-950 block mb-1">
                            Nome do Responsável
                          </label>
                          <input
                            type="text"
                            placeholder="Nome completo do responsável"
                            value={novoPacienteForm.responsavelNome}
                            onChange={(e) =>
                              setNovoPacienteForm((prev) => ({
                                ...prev,
                                responsavelNome: e.target.value,
                              }))
                            }
                            className="w-full text-xs bg-white border border-amber-200 px-3 py-2 rounded-xl focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-amber-950 block mb-1">
                            CPF do Responsável
                          </label>
                          <input
                            type="text"
                            placeholder="000.000.000-00"
                            value={novoPacienteForm.responsavelCpf}
                            onChange={(e) =>
                              setNovoPacienteForm((prev) => ({
                                ...prev,
                                responsavelCpf: e.target.value,
                              }))
                            }
                            className="w-full text-xs bg-white border border-amber-200 px-3 py-2 rounded-xl focus:outline-none focus:border-amber-500 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-forest/80 mb-1.5 block">
                        E-mail de Contato *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="paciente@email.com"
                        value={novoPacienteForm.email}
                        onChange={(e) =>
                          setNovoPacienteForm((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        className="w-full text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark text-forest font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-forest/80 mb-1.5 block">
                        Telefone / WhatsApp *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="(11) 99999-9999"
                        value={novoPacienteForm.telefone}
                        onChange={(e) =>
                          setNovoPacienteForm((prev) => ({
                            ...prev,
                            telefone: e.target.value,
                          }))
                        }
                        className="w-full text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark text-forest font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-forest/80 mb-1.5 block">
                        Necessidade Especial / Deficiência
                      </label>
                      <select
                        value={novoPacienteForm.deficiencia}
                        onChange={(e) =>
                          setNovoPacienteForm((prev) => ({
                            ...prev,
                            deficiencia: e.target.value,
                          }))
                        }
                        className="w-full text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                      >
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

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-forest/80 mb-1.5 block">
                        Como Conheceu
                      </label>
                      <select
                        value={novoPacienteForm.comoConheceu}
                        onChange={(e) =>
                          setNovoPacienteForm((prev) => ({
                            ...prev,
                            comoConheceu: e.target.value,
                          }))
                        }
                        className="w-full text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                      >
                        <option value="Indicação de profissional">Indicação de profissional</option>
                        <option value="Projetos">Projetos</option>
                        <option value="Plataformas">Plataformas</option>
                        <option value="Instituição/ Igreja">Instituição/ Igreja</option>
                        <option value="Amigos/ conhecidos">Amigos/ conhecidos</option>
                        <option value="Google/ Site">Google/ Site</option>
                        <option value="Pacientes">Pacientes</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-forest/80 mb-1.5 block">
                        Via de Acesso
                      </label>
                      <select
                        value={novoPacienteForm.viaAcesso}
                        onChange={(e) =>
                          setNovoPacienteForm((prev) => ({
                            ...prev,
                            viaAcesso: e.target.value,
                          }))
                        }
                        className="w-full text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark text-forest font-semibold"
                      >
                        <option value="Particular">Particular / Social</option>
                        <option value="Corporativo">Corporativo / Empresa Parceira</option>
                      </select>
                    </div>
                  </div>

                  {novoPacienteForm.viaAcesso === "Corporativo" && (
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-forest/80 mb-1.5 block">
                        Código ou Nome da Empresa Parceira
                      </label>
                      <input
                        type="text"
                        placeholder="ex: EMPRESA-XYZ"
                        value={novoPacienteForm.empresa}
                        onChange={(e) =>
                          setNovoPacienteForm((prev) => ({
                            ...prev,
                            empresa: e.target.value,
                          }))
                        }
                        className="w-full text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark text-forest font-mono uppercase"
                      />
                    </div>
                  )}

                  <div className="pt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setNovoPacienteTab("financeiros")}
                      className="px-5 py-2.5 bg-forest text-sun rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-forest/90 transition-all flex items-center gap-2"
                    >
                      <span>Próximo: Financeiro & Renda</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: FINANCEIRO & RENDA */}
              {novoPacienteTab === "financeiros" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-forest/80 mb-1.5 block">
                        Fonte de Renda Principal
                      </label>
                      <select
                        value={novoPacienteForm.fonteRenda}
                        onChange={(e) =>
                          setNovoPacienteForm((prev) => ({
                            ...prev,
                            fonteRenda: e.target.value,
                          }))
                        }
                        className="w-full text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                      >
                        <option value="Emprego formal (CLT/servidor público)">Emprego formal (CLT/servidor público)</option>
                        <option value="Emprego informal ou autônomo">Emprego informal ou autônomo</option>
                        <option value="MEI ou Empresário">MEI ou Empresário</option>
                        <option value="Aposentadoria, pensão ou benefício">Aposentadoria, pensão ou benefício</option>
                        <option value="Bolsista/Estudante">Bolsista/Estudante</option>
                        <option value="Outra">Outra fonte</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-forest/80 mb-1.5 block">
                        Renda Familiar Mensal (Faixa)
                      </label>
                      <select
                        value={novoPacienteForm.faixaSalarial}
                        onChange={(e) =>
                          setNovoPacienteForm((prev) => ({
                            ...prev,
                            faixaSalarial: e.target.value,
                          }))
                        }
                        className="w-full text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark text-forest font-medium"
                      >
                        <option value="Até 1 Salário Mínimo (até R$ 1.518,00)">Até 1 Salário Mínimo (até R$ 1.518,00)</option>
                        <option value="De 1 a 2 Salários Mínimos (R$ 1.518,01 a R$ 3.036,00)">De 1 a 2 Salários Mínimos (R$ 1.518,01 a R$ 3.036,00)</option>
                        <option value="De 2 a 3 Salários Mínimos (R$ 3.036,01 a R$ 4.554,00)">De 2 a 3 Salários Mínimos (R$ 3.036,01 a R$ 4.554,00)</option>
                        <option value="De 3 a 5 Salários Mínimos (R$ 4.554,01 a R$ 7.590,00)">De 3 a 5 Salários Mínimos (R$ 4.554,01 a R$ 7.590,00)</option>
                        <option value="Acima de 5 Salários Mínimos (acima de R$ 7.590,00)">Acima de 5 Salários Mínimos (acima de R$ 7.590,00)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-forest/80 mb-1.5 block">
                        Quantidade de Dependentes
                      </label>
                      <select
                        value={novoPacienteForm.dependentes}
                        onChange={(e) =>
                          setNovoPacienteForm((prev) => ({
                            ...prev,
                            dependentes: e.target.value,
                          }))
                        }
                        className="w-full text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                      >
                        <option value="1 pessoa (mora sozinho)">1 pessoa (mora sozinho)</option>
                        <option value="2 a 3 pessoas">2 a 3 pessoas</option>
                        <option value="4 a 5 pessoas">4 a 5 pessoas</option>
                        <option value="Mais de 5 pessoas">Mais de 5 pessoas</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-forest/80 mb-1.5 block">
                        Plano de Saúde
                      </label>
                      <select
                        value={novoPacienteForm.planoSaude}
                        onChange={(e) =>
                          setNovoPacienteForm((prev) => ({
                            ...prev,
                            planoSaude: e.target.value,
                          }))
                        }
                        className="w-full text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                      >
                        <option value="Sim, com cobertura para psicoterapia">Sim, com cobertura para psicoterapia</option>
                        <option value="Sim, mas NÃO cobre psicoterapia">Sim, mas NÃO cobre psicoterapia</option>
                        <option value="Não, utilizo apenas o SUS">Não, utilizo apenas o SUS</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-3 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setNovoPacienteTab("pessoais")}
                      className="px-4 py-2 bg-warm border border-soft text-forest rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-white transition-all"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={() => setNovoPacienteTab("demografia")}
                      className="px-5 py-2.5 bg-forest text-sun rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-forest/90 transition-all flex items-center gap-2"
                    >
                      <span>Próximo: Moradia & Tecnologia</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: DEMOGRAFIA & TECNOLOGIA */}
              {novoPacienteTab === "demografia" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-forest/80 mb-1.5 block">
                        Escolaridade
                      </label>
                      <select
                        value={novoPacienteForm.escolaridade}
                        onChange={(e) =>
                          setNovoPacienteForm((prev) => ({
                            ...prev,
                            escolaridade: e.target.value,
                          }))
                        }
                        className="w-full text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                      >
                        <option value="Analfabeto/Fundamental Incompleto">Analfabeto/Fundamental Incompleto</option>
                        <option value="Fundamental Completo">Fundamental Completo</option>
                        <option value="Médio Incompleto">Médio Incompleto</option>
                        <option value="Médio Completo">Médio Completo</option>
                        <option value="Superior Incompleto">Superior Incompleto</option>
                        <option value="Superior Completo">Superior Completo</option>
                        <option value="Pós-Graduação">Pós-Graduação</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-forest/80 mb-1.5 block">
                        Situação da Moradia
                      </label>
                      <select
                        value={novoPacienteForm.moradia}
                        onChange={(e) =>
                          setNovoPacienteForm((prev) => ({
                            ...prev,
                            moradia: e.target.value,
                          }))
                        }
                        className="w-full text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                      >
                        <option value="Próprio e quitado">Próprio e quitado</option>
                        <option value="Próprio, financiado">Próprio, financiado</option>
                        <option value="Alugado/arrendado">Alugado/arrendado</option>
                        <option value="Cedido">Cedido</option>
                        <option value="Ocupação irregular ou outra">Ocupação irregular ou outra</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-forest/80 mb-1.5 block">
                        Cômodos no Imóvel
                      </label>
                      <select
                        value={novoPacienteForm.comodos}
                        onChange={(e) =>
                          setNovoPacienteForm((prev) => ({
                            ...prev,
                            comodos: e.target.value,
                          }))
                        }
                        className="w-full text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                      >
                        <option value="1 a 3 cômodos">1 a 3 cômodos</option>
                        <option value="4 a 5 cômodos">4 a 5 cômodos</option>
                        <option value="6 ou mais cômodos">6 ou mais cômodos</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-forest/80 mb-1.5 block">
                        Acesso à Internet
                      </label>
                      <select
                        value={novoPacienteForm.internet}
                        onChange={(e) =>
                          setNovoPacienteForm((prev) => ({
                            ...prev,
                            internet: e.target.value,
                          }))
                        }
                        className="w-full text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                      >
                        <option value="Acesso fixo residencial">Acesso fixo residencial</option>
                        <option value="Apenas pelo celular (dados móveis)">Apenas pelo celular (dados móveis)</option>
                        <option value="Acesso em locais públicos">Acesso em locais públicos</option>
                        <option value="Não tenho acesso à internet">Não tenho acesso à internet</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-forest/80 mb-1.5 block">
                        Aparelho para Sessões
                      </label>
                      <select
                        value={novoPacienteForm.dispositivo}
                        onChange={(e) =>
                          setNovoPacienteForm((prev) => ({
                            ...prev,
                            dispositivo: e.target.value,
                          }))
                        }
                        className="w-full text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                      >
                        <option value="Sim (Celular/PC c/ câmera)">Sim (Celular/PC c/ câmera)</option>
                        <option value="Apenas Celular s/ dados">Apenas Celular s/ dados</option>
                        <option value="Não">Não</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-3 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setNovoPacienteTab("financeiros")}
                      className="px-4 py-2 bg-warm border border-soft text-forest rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-white transition-all"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={() => setNovoPacienteTab("saude")}
                      className="px-5 py-2.5 bg-forest text-sun rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-forest/90 transition-all flex items-center gap-2"
                    >
                      <span>Próximo: Saúde Mental & Demanda</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: SAÚDE MENTAL & DEMANDA */}
              {novoPacienteTab === "saude" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-forest/80 mb-1.5 block">
                        Já fez psicoterapia antes?
                      </label>
                      <select
                        value={novoPacienteForm.terapiaAnterior}
                        onChange={(e) =>
                          setNovoPacienteForm((prev) => ({
                            ...prev,
                            terapiaAnterior: e.target.value,
                          }))
                        }
                        className="w-full text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                      >
                        <option value="Sim, em tratamento">Sim, em tratamento</option>
                        <option value="Sim, interrompi (+ 6 meses)">Sim, interrompi (+ 6 meses)</option>
                        <option value="Não">Não</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-forest/80 mb-1.5 block">
                        Motivo Principal do Atendimento
                      </label>
                      <select
                        value={novoPacienteForm.motivo}
                        onChange={(e) =>
                          setNovoPacienteForm((prev) => ({
                            ...prev,
                            motivo: e.target.value,
                          }))
                        }
                        className="w-full text-sm bg-warm/40 border border-soft px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark text-forest font-medium"
                      >
                        <option value="Enfrentamento de luto ou trauma">Enfrentamento de luto ou trauma</option>
                        <option value="Ansiedade ou estresse excessivo">Ansiedade ou estresse excessivo</option>
                        <option value="Depressão ou tristeza profunda">Depressão ou tristeza profunda</option>
                        <option value="Problemas de relacionamento">Problemas de relacionamento</option>
                        <option value="Desenvolvimento pessoal">Desenvolvimento pessoal</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-forest/80 mb-1.5 block">
                      Descrição / Detalhes da Queixa Inicial
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Descreva resumidamente os sintomas, demandas ou histórico relatado pelo paciente..."
                      value={novoPacienteForm.queixaDetalhes}
                      onChange={(e) =>
                        setNovoPacienteForm((prev) => ({
                          ...prev,
                          queixaDetalhes: e.target.value,
                        }))
                      }
                      className="w-full text-sm bg-warm/40 border border-soft p-3 rounded-xl focus:outline-none focus:border-sun-dark text-forest resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-forest/80 mb-2 block">
                      Melhores Períodos para Sessões (Disponibilidade)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {["Manhã", "Tarde", "Noite", "Aos sábados", "Total disponibilidade"].map((periodo) => {
                        const checked = novoPacienteForm.melhoresPeriodos.includes(periodo);
                        return (
                          <button
                            key={periodo}
                            type="button"
                            onClick={() => {
                              setNovoPacienteForm((prev) => {
                                const exists = prev.melhoresPeriodos.includes(periodo);
                                return {
                                  ...prev,
                                  melhoresPeriodos: exists
                                    ? prev.melhoresPeriodos.filter((p) => p !== periodo)
                                    : [...prev.melhoresPeriodos, periodo],
                                };
                              });
                            }}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1.5 ${
                              checked
                                ? "bg-forest text-sun border-forest shadow-xs"
                                : "bg-warm/30 border-soft text-forest/70 hover:bg-warm"
                            }`}
                          >
                            <Check className={`w-3.5 h-3.5 ${checked ? "opacity-100" : "opacity-0"}`} />
                            <span>{periodo}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-3 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setNovoPacienteTab("demografia")}
                      className="px-4 py-2 bg-warm border border-soft text-forest rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-white transition-all"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={() => setNovoPacienteTab("triagem")}
                      className="px-5 py-2.5 bg-forest text-sun rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-forest/90 transition-all flex items-center gap-2"
                    >
                      <span>Próximo: Anotações de Triagem</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 5: ANOTAÇÕES DE TRIAGEM & SUBMISSÃO */}
              {novoPacienteTab === "triagem" && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="p-4 bg-forest/5 border border-forest/10 rounded-2xl space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-forest flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-sun-dark" />
                      Observações Internas da Triagem
                    </h4>
                    <p className="text-xs text-forest/70">
                      Utilize este espaço para incluir anotações observadas no atendimento inicial, orientações específicas ou histórico de contato telefônico/WhatsApp.
                    </p>
                    <textarea
                      rows={4}
                      placeholder="Ex: Paciente encaminhado via projeto parceiro. Prioridade de agendamento no período matutino..."
                      value={novoPacienteForm.observacoesTriagem}
                      onChange={(e) =>
                        setNovoPacienteForm((prev) => ({
                          ...prev,
                          observacoesTriagem: e.target.value,
                        }))
                      }
                      className="w-full text-sm bg-white border border-soft p-3 rounded-xl focus:outline-none focus:border-forest text-forest resize-none"
                    />
                  </div>

                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-emerald-950 space-y-1">
                      <p className="font-bold">Confirmação de Inclusão na Fila de Triagem</p>
                      <p>
                        Ao finalizar o cadastro, o paciente <strong>{novoPacienteForm.nome || "Novo Paciente"}</strong> será inserido imediatamente na primeira coluna da Triagem (<em>Aguardando Avaliação</em>).
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 flex justify-between items-center">
                    <button
                      type="button"
                      onClick={() => setNovoPacienteTab("saude")}
                      className="px-4 py-2 bg-warm border border-soft text-forest rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-white transition-all"
                    >
                      Voltar
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowNovoPacienteModal(false);
                          handleResetNovoPacienteForm();
                        }}
                        className="px-4 py-2.5 text-xs font-bold text-forest/70 hover:text-forest transition-colors"
                      >
                        Cancelar
                      </button>

                      <button
                        type="submit"
                        disabled={isSubmittingNovoPaciente}
                        className="px-6 py-2.5 bg-forest text-white hover:bg-forest/90 disabled:opacity-50 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2"
                      >
                        {isSubmittingNovoPaciente ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-sun" />
                            <span>Cadastrando...</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 text-sun" />
                            <span>Concluir Cadastro</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </form>
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
                  <option value="master">Gestão</option>
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

      {/* Modal de Aumentar Horas Disponíveis */}
      {showAumentarHorasModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 bg-forest/30 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-soft overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 flex justify-between items-center border-b border-emerald-100 bg-emerald-50/80">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-700 shrink-0" />
                <h3 className="font-serif text-lg font-bold text-emerald-950">
                  Aumentar Horas Disponíveis
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowAumentarHorasModal(false);
                  setCustomNovaHora("");
                }}
                className="p-1.5 text-forest/60 hover:text-red-600 rounded-full hover:bg-white transition-colors cursor-pointer"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80 text-xs text-forest/90 space-y-1">
                <div className="flex justify-between font-bold text-forest">
                  <span>Cota Atual Declarada:</span>
                  <span className="text-emerald-800">{normalizeHorasDisponiveis(profile?.horasDisponiveis) || "Não definida"}</span>
                </div>
                <div className="text-[11px] text-forest/70">
                  Selecione uma nova faixa de horas de atendimento mensal ou digite um valor personalizado (valores ímpares serão arredondados para números pares).
                </div>
              </div>

              {/* Opções de Faixa de Horas */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-forest/80 block">
                  Selecione a Nova Faixa de Horas *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    "2 a 4 horas/mês",
                    "4 a 8 horas/mês",
                    "10 a 16 horas/mês",
                    "16 a 20 horas/mês",
                    "Mais de 20 horas/mês",
                  ].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setSelectedNovaHora(option);
                        setCustomNovaHora("");
                      }}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all border text-left cursor-pointer flex items-center justify-between ${
                        selectedNovaHora === option && !customNovaHora
                          ? "bg-emerald-700 text-white border-emerald-800 shadow-xs"
                          : "bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-50"
                      }`}
                    >
                      <span>{option}</span>
                      {selectedNovaHora === option && !customNovaHora && (
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-200" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ou Valor Personalizado */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-forest/70 block">
                  Ou Digite um Valor Personalizado
                </label>
                <input
                  type="text"
                  value={customNovaHora}
                  onChange={(e) => {
                    setCustomNovaHora(e.target.value);
                  }}
                  className="w-full text-xs font-bold bg-white border border-emerald-200 px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 text-forest shadow-2xs"
                  placeholder="Ex: 25 horas/mês, 30 horas/mês..."
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-soft">
                <button
                  type="button"
                  onClick={() => {
                    setShowAumentarHorasModal(false);
                    setCustomNovaHora("");
                  }}
                  className="px-4 py-2 bg-warm text-forest hover:bg-soft/50 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveAumentarHoras}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <TrendingUp className="w-4 h-4 text-emerald-200" />
                  Salvar Nova Disponibilidade
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Alteração de Frequência de Sessões */}
      {showFreqModal && freqModalTargetCard && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 bg-forest/30 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-soft overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 flex justify-between items-center border-b border-emerald-100 bg-emerald-50/80">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-emerald-700 shrink-0" />
                <h3 className="font-serif text-lg font-bold text-emerald-950">
                  Alterar Frequência de Sessões
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowFreqModal(false);
                  setFreqModalTargetCard(null);
                }}
                className="p-1.5 text-forest/60 hover:text-red-600 rounded-full hover:bg-white transition-colors"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-warm/60 rounded-xl border border-soft text-xs text-forest/90">
                <strong className="text-forest">Acolhido / Paciente:</strong> {freqModalTargetCard.nomePaciente || freqModalTargetCard.nomeAcolhido || "Não identificado"}
              </div>

              {/* Seleção de Frequência */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-forest/80 block">
                  1. Selecione ou Digite a Nova Frequência *
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {["Semanal", "Quinzenal", "Mensal", "Sob Demanda"].map((freqOption) => (
                    <button
                      key={freqOption}
                      type="button"
                      onClick={() => setFreqModalValue(freqOption)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        freqModalValue === freqOption
                          ? "bg-emerald-700 text-white border-emerald-800 shadow-xs"
                          : "bg-white text-emerald-900 border-emerald-200 hover:bg-emerald-50"
                      }`}
                    >
                      {freqOption}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  required
                  value={freqModalValue}
                  onChange={(e) => setFreqModalValue(e.target.value)}
                  className="w-full text-xs font-bold bg-white border border-emerald-200 px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 text-forest shadow-2xs"
                  placeholder="Ex: Semanal, Quinzenal, 2x por semana..."
                />
              </div>

              {/* Motivo (Opcional na 1ª vez, Obrigatório nas alterações) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-900">
                  <span>
                    2. Motivo {!freqModalTargetCard.frequenciaSessoes ? "(Opcional)" : "da Alteração *"}
                  </span>
                  {!freqModalTargetCard.frequenciaSessoes ? (
                    <span className="text-[10px] text-forest/70 bg-warm px-2 py-0.5 rounded border border-soft font-bold">
                      Opcional (1ª vez)
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 font-bold">
                      Obrigatório
                    </span>
                  )}
                </div>
                <textarea
                  rows={3}
                  value={freqModalMotivo}
                  onChange={(e) => setFreqModalMotivo(e.target.value)}
                  className="w-full text-xs bg-white border border-emerald-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 text-forest placeholder:text-forest/40 shadow-2xs"
                  placeholder={
                    !freqModalTargetCard.frequenciaSessoes
                      ? "Descreva o motivo caso desejar (opcional na primeira definição)..."
                      : "Descreva o motivo ou justificativa para a alteração da frequência de sessões..."
                  }
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-soft">
                <button
                  type="button"
                  onClick={() => {
                    setShowFreqModal(false);
                    setFreqModalTargetCard(null);
                  }}
                  className="px-4 py-2 bg-warm text-forest hover:bg-soft/50 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveFrequenciaModal}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckSquare className="w-4 h-4 text-emerald-200" />
                  Salvar Frequência
                </button>
              </div>
            </div>
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
                      atribuicaoStatus: "Devolvido",
                      devolvidoMotivo: observacaoFinal || "Devolvido pelo profissional para a triagem",
                      devolvidoPor: profile?.name || "Parceiro",
                      devolvidoEm: new Date().toISOString(),
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

      {showEvolutionDiagnosticModal && (
        <EvolutionDiagnosticModal
          isOpen={showEvolutionDiagnosticModal}
          onClose={() => setShowEvolutionDiagnosticModal(false)}
          apiUrl={globalConfigs.whatsappEvolutionUrl || ""}
          apiKey={globalConfigs.whatsappEvolutionApiKey || ""}
          instanceName={globalConfigs.whatsappEvolutionInstance || "acolhemente"}
          onQrCodeReceived={(qr, pairing) => {
            setWhatsappQrCode(qr);
            if (pairing) setWhatsappPairingCode(pairing);
          }}
          onInstanceCreated={() => {
            setWhatsappState("connecting");
            handleCheckWhatsappStatus();
          }}
        />
      )}

      {showCancelModal && (
        <div className="fixed inset-0 bg-forest/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-soft space-y-6">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0 border border-amber-100">
                <LogOut className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-forest">Solicitar Saída do Projeto</h3>
                <p className="text-xs text-forest/60">Processo de Entrevista & Desligamento</p>
              </div>
            </div>

            <p className="text-xs text-forest/80 leading-relaxed">
              No Projeto AcolheMente, os profissionais passam por uma breve entrevista de desligamento com a Gestão tanto para entrar quanto para encerrar a participação. Preencha o motivo abaixo para registramos sua solicitação.
            </p>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-forest/70">
                Motivo da solicitação de saída (opcional):
              </label>
              <textarea
                rows={3}
                value={motivoCancelamentoInput}
                onChange={(e) => setMotivoCancelamentoInput(e.target.value)}
                placeholder="Compartilhe seu motivo para podermos alinhar no atendimento..."
                className="w-full text-xs p-3 bg-warm/40 border border-soft rounded-xl focus:outline-none focus:border-sun-dark text-forest"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 bg-warm hover:bg-soft/50 text-forest rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <button
                onClick={async () => {
                  if (!profile?.uid) return;
                  try {
                    const dataCancel = new Date().toISOString();
                    await updateDoc(doc(db, "users", profile.uid), {
                      solicitacaoCancelamento: true,
                      motivoCancelamento: motivoCancelamentoInput || "Não informado",
                      dataSolicitacaoCancelamento: dataCancel,
                      statusPagamento: "desligamento_solicitado",
                    });
                    setProfile((prev) =>
                      prev
                        ? {
                            ...prev,
                            solicitacaoCancelamento: true,
                            motivoCancelamento: motivoCancelamentoInput || "Não informado",
                            dataSolicitacaoCancelamento: dataCancel,
                            statusPagamento: "desligamento_solicitado",
                          }
                        : null,
                    );

                    // Notify via webhook
                    try {
                      await sendWebhookNotification({
                        event: "status_lead_alterado",
                        recipientEmail: globalConfigs.emailSuporte || "adm@acolhemente.com",
                        recipientName: "Gestão",
                        title: `Solicitação de Saída do Projeto - ${profile.name}`,
                        message: `O profissional ${profile.name} (${profile.email}) solicitou a saída do projeto. Agendar entrevista de desligamento.`,
                        data: {
                          profissionalId: profile.uid,
                          nome: profile.name,
                          email: profile.email,
                          motivo: motivoCancelamentoInput,
                          dataCancelamento: dataCancel,
                        },
                      });
                    } catch (e) {
                      console.error("Erro webhook solicitação de saída:", e);
                    }

                    setShowCancelModal(false);
                    setMotivoCancelamentoInput("");
                    alert("Sua solicitação de saída do projeto foi registrada com sucesso! A equipe de Gestão entrará em contato para agendar a entrevista de desligamento.");
                  } catch (err) {
                    console.error(err);
                    alert("Erro ao registrar solicitação de saída.");
                  }
                }}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Confirmar Solicitação de Saída
              </button>
            </div>
          </div>
        </div>
      )}

      {showCheckoutModal && (
        <StripeCheckoutModal
          isOpen={showCheckoutModal}
          onClose={() => setShowCheckoutModal(false)}
          professionalName={profile?.name || "Profissional AcolheMente"}
          professionalEmail={profile?.email || ""}
          professionalId={profile?.uid || profile?.id}
          taxaMensal={profile?.taxaAssociativaMensal || globalConfigs.taxaAssociativaMensal || "29,90"}
          stripeConfig={{
            stripeEnabled: globalConfigs.stripeEnabled ?? true,
            stripePublicKey: globalConfigs.stripePublicKey || "",
            stripeCheckoutUrl: globalConfigs.stripeCheckoutUrl || "",
          }}
          onSuccess={() => {
            if (profile) {
              setProfile({
                ...profile,
                statusPagamento: "pago",
                dataPagamento: new Date().toISOString(),
              });
            }
            setShowCheckoutModal(false);
          }}
        />
      )}

      {/* Modal de Enquadramento Inteligente e Auto-Centralização de Rosto */}
      <PhotoCropModal
        isOpen={photoCropModalOpen}
        onClose={() => setPhotoCropModalOpen(false)}
        imageSrc={rawPhotoToCrop}
        onSave={(croppedUrl) => {
          setProfile((prev: any) => ({
            ...prev,
            photoUrl: croppedUrl,
          }));
          showToast("Foto ajustada e centralizada com sucesso!", "success");
        }}
        title="Enquadramento do Perfil do Profissional"
      />
    </div>
  );
}
