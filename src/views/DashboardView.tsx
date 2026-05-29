import React, { useEffect, useState } from "react";
import { ArrowLeft, User, LayoutGrid, LogOut, CheckCircle2, Circle, Clock, Grip, XCircle, Search, FileText, HandHeart, HeartHandshake, ChevronRight, ChevronLeft, Info, HelpCircle, Briefcase, Map, Users, Mail, Phone, Send, Edit3, Trash2, History, CheckSquare, Plus } from "lucide-react";
import { auth, db } from "../lib/firebase";
import { GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, User as FirebaseUser, getAuth, updatePassword } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, collection, onSnapshot, query, orderBy, serverTimestamp, deleteDoc } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import firebaseConfig from "../../firebase-applet-config.json";

type Role = "master" | "triagem" | "profissional";

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
}

interface SolicitacaoDoacao {
  id: string;
  nome: string;
  telefone: string;
  motivo: string;
  status: string;
  createdAt?: any;
}

interface ProfissionalLead {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  crp: string;
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
  { id: "Aguardando Avaliação", label: "Novos Acolhimentos", role: ["master", "triagem"], tab: "kanban" },
  { id: "Em Triagem", label: "Em Análise", role: ["master", "triagem"], tab: "kanban" },
  { id: "Aprovado", label: "Fila de Espera", role: ["master", "triagem", "profissional"], tab: "kanban" },
  { id: "Em Atendimento", label: "Em Acompanhamento", role: ["master", "profissional"], tab: "pacientes" },
  { id: "Alta", label: "Alta / Finalizado", role: ["master", "profissional"], tab: "pacientes" },
];

// Editable Field Component
const EditableField = ({ label, value, field, onChange, isEditing }: { label: string, value: any, field: string, onChange: (f: string, v: any) => void, isEditing: boolean }) => (
  <div>
    <span className="block text-[10px] font-semibold uppercase text-forest/70/60">{label}</span>
    {isEditing ? (
      <input 
        value={value || ''}
        onChange={(e) => onChange(field, e.target.value)}
        className="text-sm font-medium text-forest border-b border-sun-dark focus:outline-none bg-transparent w-full"
      />
    ) : (
      <span className="text-sm font-medium text-forest">{value || '-'}</span>
    )}
  </div>
);

export function DashboardView({ onNavigate }: { onNavigate: (view: 'landing' | 'acolhimento' | 'dashboard' | 'profile') => void }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingObj, setLoadingObj] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState<'kanban' | 'doacoes' | 'profissionais' | 'empresas' | 'tarefas' | 'acessos' | 'pacientes' | 'pacientesAcolhidos' | 'perfil'>('kanban');

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Auth form
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("master");
  const [authError, setAuthError] = useState("");
  
  // Password Reset Flow
  const [newPasswordForReset, setNewPasswordForReset] = useState("");
  const [confirmNewPasswordForReset, setConfirmNewPasswordForReset] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState("");
  
  // Kanban
  const [acolhimentos, setAcolhimentos] = useState<Acolhimento[]>([]);
  const [selectedCard, setSelectedCard] = useState<Acolhimento | null>(null);
  
  // Acolhimento Modal Actions
  const [showNotificarModal, setShowNotificarModal] = useState(false);
  const [showFinanceiroModal, setShowFinanceiroModal] = useState(false);
  const [showContratoModal, setShowContratoModal] = useState(false);
  const [showNewProfissionalModal, setShowNewProfissionalModal] = useState(false);
  const [newProfName, setNewProfName] = useState("");
  const [newProfEmail, setNewProfEmail] = useState("");
  const [newProfPassword, setNewProfPassword] = useState("");
  const [newProfRole, setNewProfRole] = useState<Role>("profissional");
  const [useGoogleLogin, setUseGoogleLogin] = useState(false);
  const [leadIdToConvert, setLeadIdToConvert] = useState<string | null>(null);
  const [isEditingCard, setIsEditingCard] = useState(false);
  
  const [templates, setTemplates] = useState([
    { id: 'pagamento', name: 'Lembrete de Pagamento', msg: 'Olá! Identificamos uma pendência de pagamento referente à sua última sessão. Por favor, regularize assim que possível.' },
    { id: 'documento', name: 'Documentos Pendentes', msg: 'Olá! Lembramos que há documentos pendentes na sua Ficha de Bordo. Por favor, envie os mesmos para prosseguirmos com seu atendimento.' },
    { id: 'lembrete', name: 'Lembrete de Sessão', msg: 'Olá! Este é um lembrete automático sobre a sua sessão de terapia agendada para amanhã.' },
    { id: 'contrato', name: 'Contrato de Serviços', msg: 'Olá! Segue o link com o nosso contrato de serviços para a sua leitura e assinatura: https://app.elo.com/contrato' }
  ]);
  const [notificacaoType, setNotificacaoType] = useState('pagamento');
  const [notificacaoMsg, setNotificacaoMsg] = useState(templates[0].msg);
  const [notificacaoName, setNotificacaoName] = useState(templates[0].name);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  
  const [contratoText, setContratoText] = useState("");

  // Doacoes & Profissionais & Empresas
  const [doacoes, setDoacoes] = useState<Doacao[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoDoacao[]>([]);
  const [profissionaisLeads, setProfissionaisLeads] = useState<ProfissionalLead[]>([]);
  const [profissionaisAtivos, setProfissionaisAtivos] = useState<UserProfile[]>([]);
  const [empresasLeads, setEmpresasLeads] = useState<EmpresaLead[]>([]);

  const [selectedProfissional, setSelectedProfissional] = useState<ProfissionalLead | UserProfile | null>(null);
  const [selectedEmpresa, setSelectedEmpresa] = useState<EmpresaLead | null>(null);

  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // Psychologist State
  const [meusPacientes, setMeusPacientes] = useState<Acolhimento[]>([]);

  // Onboarding State
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);

  // ...

  const handleUpdateEmpresaProperty = async (id: string, property: string, value: any) => {
    try {
      if (selectedEmpresa && selectedEmpresa.id === id) {
        setSelectedEmpresa({ ...selectedEmpresa, [property]: value });
      }
      const updates: any = { [property]: value, updatedAt: serverTimestamp() };
      if (property === 'status') updates.statusUpdatedAt = serverTimestamp();
      if (property === 'ativo') updates.ativoUpdatedAt = serverTimestamp();
      await updateDoc(doc(db, "empresa_leads", id), updates);
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar ficha de bordo da empresa.");
    }
  };

  const handleUpdateProfissionalProperty = async (id: string, property: string, value: any) => {
    try {
      if (selectedProfissional && ('id' in selectedProfissional && selectedProfissional.id === id || 'uid' in selectedProfissional && selectedProfissional.uid === id)) {
        setSelectedProfissional({ ...selectedProfissional, [property]: value } as any);
      }
      const updates: any = { [property]: value, updatedAt: serverTimestamp() };
      if (property === 'status') updates.statusUpdatedAt = serverTimestamp();
      if (property === 'ativo') updates.ativoUpdatedAt = serverTimestamp();
      
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
      const hasSeen = localStorage.getItem(`onboarding_seen_${user.uid}`);
      if (!hasSeen) setShowOnboarding(true);
    }
  }, [user, profile]);

  const closeOnboarding = () => {
    if (user) {
      localStorage.setItem(`onboarding_seen_${user.uid}`, "true");
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
    
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid));
        let currentUserProfile: UserProfile | null = null;
        if (snap.exists()) {
          currentUserProfile = { ...snap.data(), uid: u.uid } as UserProfile;
          if (currentUserProfile.role === 'profissional' && currentUserProfile.ativo === false) {
             await signOut(auth);
             setAuthError("Sua conta está inativa. Entre em contato com o suporte.");
             setUser(null);
             setProfile(null);
             setLoadingObj(false);
             return;
          }
          if (currentUserProfile?.role === 'profissional') {
            setActiveTab('pacientes');
          }
          setProfile(currentUserProfile);
        }
        
        if (currentUserProfile?.role === 'master' || currentUserProfile?.role === 'triagem') {
          // Listen to acolhimentos
          const q = query(collection(db, "acolhimentos"));
          unsubCards = onSnapshot(q, (snapshot) => {
            const cards: Acolhimento[] = [];
            snapshot.forEach(d => cards.push({ id: d.id, ...d.data() } as Acolhimento));
            cards.sort((a, b) => b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.() || 0);
            setAcolhimentos(cards);
          });
        }

        if (currentUserProfile?.role === 'profissional') {
          // Listen to assigned acolhimentos
          const qq = query(collection(db, "acolhimentos"));
          unsubMeusPacientes = onSnapshot(qq, (snapshot) => {
            const list: Acolhimento[] = [];
            snapshot.forEach(d => {
              const data = d.data() as Acolhimento;
              if (data.profissionalId === u.uid) {
                list.push({ id: d.id, ...data });
              }
            });
            list.sort((a, b) => b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.() || 0);
            setMeusPacientes(list);
          });
        }

        if (currentUserProfile?.role === 'master') {
          unsubDoacoes = onSnapshot(query(collection(db, "doacoes")), (snapshot) => {
            const list: Doacao[] = [];
            snapshot.forEach(d => list.push({ id: d.id, ...d.data() } as Doacao));
            list.sort((a, b) => b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.() || 0);
            setDoacoes(list);
          });
          unsubSol = onSnapshot(query(collection(db, "solicitacoes_doacao")), (snapshot) => {
            const list: SolicitacaoDoacao[] = [];
            snapshot.forEach(d => list.push({ id: d.id, ...d.data() } as SolicitacaoDoacao));
            list.sort((a, b) => b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.() || 0);
            setSolicitacoes(list);
          });
          unsubProLeads = onSnapshot(query(collection(db, "profissionais_leads")), (snapshot) => {
            const list: ProfissionalLead[] = [];
            snapshot.forEach(d => list.push({ id: d.id, ...d.data() } as ProfissionalLead));
            list.sort((a, b) => b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.() || 0);
            setProfissionaisLeads(list);
          });
          unsubProAtivos = onSnapshot(query(collection(db, "users")), (snapshot) => {
            const listProfs: UserProfile[] = [];
            const listAll: UserProfile[] = [];
            snapshot.forEach(d => {
              const data = d.data() as UserProfile;
              data.uid = d.id;
              listAll.push(data);
              if (data.role === 'profissional') listProfs.push(data);
            });
            setProfissionaisAtivos(listProfs);
            setAllUsers(listAll);
          });
          unsubEmpresas = onSnapshot(query(collection(db, "empresa_leads")), (snapshot) => {
            const list: EmpresaLead[] = [];
            snapshot.forEach(d => list.push({ id: d.id, ...d.data() } as EmpresaLead));
            list.sort((a, b) => b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.() || 0);
            setEmpresasLeads(list);
          });
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
        unsubCards = undefined;
        unsubDoacoes = undefined;
        unsubSol = undefined;
        unsubProLeads = undefined;
        unsubProAtivos = undefined;
        unsubMeusPacientes = undefined;
        unsubEmpresas = undefined;
        setProfile(null);
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
    };
  }, []);

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
           if (d.role === 'profissional' && d.ativo === false) {
             await signOut(auth);
             setAuthError("Sua conta está inativa. Entre em contato com o suporte.");
             return;
           }
           if (!d.email || (!d.name && cred.user.displayName)) {
             await updateDoc(userRef, { email: cred.user.email || email, name: d.name || cred.user.displayName || "Usuário" });
           }
        } else {
           // Document is missing (maybe due to previous rule failure), create it as profissional
           await setDoc(userRef, {
             role: "profissional",
             name: cred.user.displayName || email.split('@')[0],
             email: cred.user.email || email,
             requirePasswordChange: false,
             createdAt: new Date(),
           });
        }
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", cred.user.uid), {
          role,
          name,
          email: cred.user.email || email
        });
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
         setAuthError("Você precisa habilitar o provedor de Email/Senha no console do Firebase Authentication (Build > Authentication > Sign-in method).");
      } else if (err.code === 'auth/email-already-in-use') {
         setAuthError("Este e-mail já está em uso. Por favor, faça login com sua conta.");
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
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
          email: result.user.email || ""
        });
      } else {
        const d = snap.data();
        if (d.role === 'profissional' && d.ativo === false) {
           await signOut(auth);
           setAuthError("Sua conta está inativa. Entre em contato com o suporte.");
           return;
        }
        if (!d.email || (!d.name && result.user.displayName)) {
          await updateDoc(userRef, { email: result.user.email || "", name: d.name || result.user.displayName || "Usuário" });
        }
      }
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain') {
         setAuthError("Você precisa adicionar a URL deste painel na aba 'Authorized domains' no console do Firebase Authentication.");
      } else if (err.code === 'auth/operation-not-allowed') {
         setAuthError("Você precisa habilitar o provedor do Google no console do Firebase Authentication (Build > Authentication > Sign-in method).");
      } else if (err.code === 'auth/account-exists-with-different-credential') {
         setAuthError("Este e-mail já está vinculado a outra forma de login (como senha). Por favor, use a opção correspondente ou vincule as contas.");
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
    const colConfig = COLUMNS.find(c => c.id === newStatus);
    if (!colConfig || !colConfig.role.includes(profile.role)) return;

    // Update status
    try {
      const updates: any = { status: newStatus };
      if (newStatus === "Em Atendimento" && profile.role === "profissional") {
        updates.profissionalId = user.uid;
      }
      await updateDoc(doc(db, "acolhimentos", id), updates);
    } catch(err) {
      console.error(err);
    }
  };

  // State for confirm modal
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, message: string, onConfirm: () => void} | null>(null);

  const handleRoleChange = async (userId: string, newRole: Role) => {
    if (!profile || profile.role !== 'master') return;
    setConfirmConfig({
      isOpen: true,
      message: "Tem certeza que deseja alterar o nível de acesso deste usuário?",
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, "users", userId), { role: newRole });
        } catch(err) {
          console.error("Erro ao alterar nível de acesso:", err);
          alert("Houve um erro ao tentar alterar o nível de acesso.");
        }
      }
    });
  };

  const handleDeleteProfissional = async (id: string, formType: 'leads' | 'ativos') => {
    if (!profile || profile.role !== 'master') return;
    setConfirmConfig({
      isOpen: true,
      message: "Tem certeza que deseja excluir permanentemente este profissional?",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, formType === 'leads' ? "profissionais_leads" : "users", id));
        } catch(err) {
          console.error("Erro ao excluir profissional:", err);
          alert("Houve um erro ao tentar excluir o profissional.");
        }
      }
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleUpdateAcolhimentoProperty = async (id: string, property: string, value: any) => {
    try {
      const updates: any = { [property]: value };
      if (property === 'ativo') {
        updates.statusUpdatedAt = serverTimestamp();
      }
      
      // Auto-assign status when changing profissional
      if (property === 'profissionalId') {
        if (value) {
          // Atribuído a alguém
          updates.status = 'Em Atendimento';
          updates.atribuicaoStatus = 'Pendente';
          updates.notificacao = null; // Clear any waitlist notification
        } else {
          // Desatribuído
          updates.status = 'Aprovado';
          updates.atribuicaoStatus = null;
          updates.notificacao = 'Desatribuído do profissional, necessita nova atribuição';
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
         statusUpdatedAt: serverTimestamp() 
      });
    } catch (error) {
       console.error(error);
       alert("Erro ao atualizar status");
    }
  };

  const handleUpdateSelfProfile = async (updates: Partial<UserProfile>) => {
     if (!profile?.uid) return;
     try {
       const cleanUpdates = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined));
       await updateDoc(doc(db, "users", profile.uid), cleanUpdates);
       setProfile({...profile, ...cleanUpdates} as UserProfile);
       setSuccessMsg("Perfil profissional salvo com sucesso!");
     } catch (err) {
       console.error(err);
       alert("Erro ao atualizar perfil.");
     }
  };

  const handleCreateProfissional = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Usar uma instância secundária para não deslogar o Gestor
      const secondaryApp = initializeApp(firebaseConfig, `SecondaryApp_${Date.now()}`);
      const secondaryAuth = getAuth(secondaryApp);
      
      const cred = await createUserWithEmailAndPassword(secondaryAuth, newProfEmail, newProfPassword);
      
      // Cria o registro no Firestore usando a conexão principal db existente
      await setDoc(doc(db, "users", cred.user.uid), {
        name: newProfName,
        email: newProfEmail,
        role: newProfRole,
        requirePasswordChange: true,
        createdAt: new Date(),
      });
      
      if (leadIdToConvert) {
         try {
           await deleteDoc(doc(db, "profissionais_leads", leadIdToConvert));
         } catch (delErr) {
           console.error("Erro ao remover lead após conversão", delErr);
         }
         setLeadIdToConvert(null);
      }
      
      await signOut(secondaryAuth);
      
      const emailBodyProvider = useGoogleLogin 
         ? `Sua conta foi criada no sistema. Como você utiliza um e-mail do Google (Gmail), você pode acessar a plataforma clicando diretamente no botão "Entrar com Conta Google".`
         : `Sua conta foi criada no sistema.\n\nLink de Acesso: ${window.location.origin}\nEmail: ${newProfEmail}\nSenha Provisória: ${newProfPassword}\n\nPor favor, acesse o sistema e redefina sua senha no primeiro acesso.`;

      const emailParams = `subject=Bem-vindo(a) à Plataforma Elo&body=Olá ${newProfName},%0A%0A${encodeURIComponent(emailBodyProvider)}`;

      setConfirmConfig({
        isOpen: true,
        message: "Conta de profissional criada com sucesso! Deseja enviar os dados de acesso por e-mail agora?",
        onConfirm: () => {
          window.open(`mailto:${newProfEmail}?${emailParams}`, '_blank');
        }
      });
      
      setShowNewProfissionalModal(false);
      setNewProfName("");
      setNewProfEmail("");
      setNewProfPassword("");
      setNewProfRole("profissional");
      setUseGoogleLogin(false);
    } catch(err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
         const existingUser = allUsers.find(u => u.email?.toLowerCase() === newProfEmail.toLowerCase());
         if (existingUser) {
            try {
               await updateDoc(doc(db, "users", existingUser.uid!), {
                   role: newProfRole,
                   statusUpdatedAt: serverTimestamp()
               });
               if (leadIdToConvert) {
                  await deleteDoc(doc(db, "profissionais_leads", leadIdToConvert));
                  setLeadIdToConvert(null);
               }
               alert("Este e-mail já possuía uma conta no sistema. O perfil foi vinculado e promovido a Profissional com sucesso!");
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
             alert("Aviso: O e-mail informado já possui uma conta mas não configurou o perfil completamente. Peça para a pessoa realizar o login (via Google ou e-mail correspondente) na tela inicial, assim o cadastro será finalizado.");
         }
      } else {
         alert("Erro ao criar conta: " + err.message);
      }
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
  };

  const lowerQuery = searchQuery.toLowerCase();

  const filteredAcolhimentos = acolhimentos.filter(a => 
    a.ativo !== false && (
      !searchQuery || 
      a.nomeCivil?.toLowerCase().includes(lowerQuery) || 
      a.nome?.toLowerCase().includes(lowerQuery) || 
      a.nomeDesejado?.toLowerCase().includes(lowerQuery) || 
      a.motivo?.toLowerCase().includes(lowerQuery) ||
      a.telefone?.toLowerCase().includes(lowerQuery)
    )
  );

  const filteredMeusPacientes = meusPacientes.filter(p => 
    !searchQuery || 
    p.nomeCivil?.toLowerCase().includes(lowerQuery) || 
    p.nomeDesejado?.toLowerCase().includes(lowerQuery) || 
    p.telefone?.toLowerCase().includes(lowerQuery)
  );

  const getProfissionalNotifications = () => {
    if (!profile || profile.role !== 'profissional') return [];
    
    const list: { id: string, type: 'assignment' | 'alert' | 'contract' | 'system', title: string, desc: string, patientName: string, patientObj: Acolhimento }[] = [];
    
    meusPacientes.forEach(p => {
      // 1. New Assignment
      if (!p.atribuicaoStatus || p.atribuicaoStatus === 'Pendente') {
        list.push({
          id: `${p.id}-pending`,
          type: 'assignment',
          title: 'Novo Paciente Atribuído',
          desc: 'Um novo acolhido foi direcionado a você. Revise a ficha técnica e confirme aceitação do atendimento clínico.',
          patientName: p.nomeDesejado || p.nomeCivil || p.nome,
          patientObj: p
        });
      }
      // 2. Clinical/Admin Notification
      if (p.notificacao && p.notificacao.trim()) {
        list.push({
          id: `${p.id}-notif`,
          type: 'alert',
          title: 'Nota / Alerta Administrativo',
          desc: p.notificacao,
          patientName: p.nomeDesejado || p.nomeCivil || p.nome,
          patientObj: p
        });
      }
      // 3. Contract unsigned
      if (!p.contratoAssinado) {
        list.push({
          id: `${p.id}-contract`,
          type: 'contract',
          title: 'Contrato Pendente',
          desc: 'Contrato de Prestação de Serviços Psicológicos ainda não foi assinado por este paciente.',
          patientName: p.nomeDesejado || p.nomeCivil || p.nome,
          patientObj: p
        });
      }
      // 4. Info change
      if (p.updatedAt && p.createdAt && (p.updatedAt.toMillis?.() - p.createdAt.toMillis?.() > 4000)) {
        list.push({
          id: `${p.id}-updated`,
          type: 'system',
          title: 'Ficha Atualizada',
          desc: 'Dados clínicos, histórico ou de contato alterados recentemente.',
          patientName: p.nomeDesejado || p.nomeCivil || p.nome,
          patientObj: p
        });
      }
    });
    
    return list;
  };

  const profNotifications = getProfissionalNotifications();
  const pendingProfNotificationsCount = profNotifications.length;

  const filteredDoacoes = doacoes.filter(d => 
    !searchQuery || 
    d.nome?.toLowerCase().includes(lowerQuery) || 
    d.status?.toLowerCase().includes(lowerQuery) ||
    d.email?.toLowerCase().includes(lowerQuery)
  );

  const filteredSolicitacoes = solicitacoes.filter(s => 
    !searchQuery || 
    s.nome?.toLowerCase().includes(lowerQuery) || 
    s.motivo?.toLowerCase().includes(lowerQuery) || 
    s.telefone?.toLowerCase().includes(lowerQuery)
  );

  const filteredLeads = profissionaisLeads.filter(l => 
    !searchQuery || 
    l.nome?.toLowerCase().includes(lowerQuery) || 
    l.crp?.toLowerCase().includes(lowerQuery) ||
    l.email?.toLowerCase().includes(lowerQuery) ||
    l.telefone?.toLowerCase().includes(lowerQuery) ||
    l.motivacao?.toLowerCase().includes(lowerQuery)
  );

  const filteredAtivos = profissionaisAtivos.filter(p => 
    !searchQuery || 
    p.name?.toLowerCase().includes(lowerQuery) || 
    p.email?.toLowerCase().includes(lowerQuery) ||
    p.role?.toLowerCase().includes(lowerQuery)
  );

  if (loadingObj) {
    return <div className="flex h-screen items-center justify-center bg-warm">Carregando...</div>;
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex flex-col relative overflow-hidden bg-warm items-center justify-center p-6">
        <button onClick={() => onNavigate('landing')} className="absolute top-8 left-8 flex items-center gap-2 text-forest/70 hover:text-forest/70-dark"><ArrowLeft className="w-5 h-5"/> Voltar</button>
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-soft">
          <h2 className="font-serif text-3xl font-medium text-forest mb-2">Restrito</h2>
          <p className="text-forest/70 mb-6">{isLogin ? "Acesse sua conta." : "Crie uma conta para simular acessos."}</p>
          
          {authError && <div className="p-3 mb-4 bg-red-50 text-red-600 rounded-lg text-sm">{authError}</div>}
          
          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-forest/70 mb-1">Nome</label>
                  <input required value={name} onChange={e=>setName(e.target.value)} className="w-full px-4 py-2 bg-warm border border-soft rounded-lg focus:outline-none focus:border-sun-dark text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-forest/70 mb-1">Acesso (Perfil)</label>
                  <select value={role} onChange={e=>setRole(e.target.value as Role)} className="w-full px-4 py-2 bg-warm border border-soft rounded-lg focus:outline-none focus:border-sun-dark text-sm">
                    <option value="master">Gestor Master</option>
                    <option value="triagem">Gestor de Triagem</option>
                    <option value="profissional">Profissional / Psicólogo</option>
                  </select>
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-forest/70 mb-1">E-mail</label>
              <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full px-4 py-2 bg-warm border border-soft rounded-lg focus:outline-none focus:border-sun-dark text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-forest/70 mb-1">Senha</label>
              <input required type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full px-4 py-2 bg-warm border border-soft rounded-lg focus:outline-none focus:border-sun-dark text-sm" />
            </div>
            
            <button type="submit" className="w-full py-3 mt-2 bg-sun-dark text-forest rounded-full font-semibold shadow-md hover:bg-sun-dark-dark transition-all">
              {isLogin ? "Entrar" : "Criar Conta"}
            </button>
          </form>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-soft"></div>
            <span className="text-xs text-forest/70 font-semibold uppercase tracking-wider">OU</span>
            <div className="flex-1 h-px bg-soft"></div>
          </div>

          <button 
            onClick={handleGoogleAuth}
            className="w-full py-3 bg-white border border-soft text-forest rounded-full font-semibold shadow-sm hover:bg-warm transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Entrar com Google
          </button>
          
          <div className="mt-4 text-center">
             {!isLogin && <p className="text-xs text-forest/70 mb-2">Ao usar Google para nova conta, usaremos o Perfil selecionado acima.</p>}
          </div>

          <div className="mt-2 text-center text-sm text-forest/70">
            {isLogin ? "Primeiro acesso? " : "Já possui conta? "}
            <button onClick={() => setIsLogin(!isLogin)} className="font-semibold underline underline-offset-4">
              {isLogin ? "Criar acesso restrito" : "Acessar sistema"}
            </button>
          </div>
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
        requirePasswordChange: false
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
          <h2 className="font-serif text-3xl text-forest mb-4">Bem-vindo(a) ao AcolheMente!</h2>
          <p className="text-forest/70 mb-8 text-sm">
            Que alegria ter você conosco em nossa rede de apoio social. 
            Para a sua segurança e a dos nossos pacientes, por favor, defina uma nova senha para o seu acesso.
          </p>
          
          {resetPasswordError && <div className="p-3 mb-4 bg-red-50 text-red-600 rounded-lg text-sm">{resetPasswordError}</div>}
          
          <form onSubmit={handlePasswordReset} className="flex flex-col gap-4 text-left">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-forest/70 mb-1">Nova Senha</label>
              <input required type="password" value={newPasswordForReset} onChange={e=>setNewPasswordForReset(e.target.value)} className="w-full px-4 py-3 bg-warm/50 border border-soft rounded-xl focus:outline-none focus:border-sun-dark text-sm" placeholder="Mínimo de 6 caracteres" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-forest/70 mb-1">Confirmar Nova Senha</label>
              <input required type="password" value={confirmNewPasswordForReset} onChange={e=>setConfirmNewPasswordForReset(e.target.value)} className="w-full px-4 py-3 bg-warm/50 border border-soft rounded-xl focus:outline-none focus:border-sun-dark text-sm" placeholder="Repita a senha" />
            </div>
            <button 
              disabled={isResettingPassword}
              type="submit" 
              className="w-full py-4 mt-4 bg-forest text-white rounded-full font-semibold shadow-md hover:bg-forest/90 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isResettingPassword ? "Atualizando..." : "Definir Nova Senha e Entrar"}
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
  const visibleColumns = COLUMNS.filter(c => c.role.includes(profile.role) && (c.tab === activeTab || (activeTab === 'pacientesAcolhidos' && c.tab === 'pacientes') || profile.role === 'profissional'));

  const roleLabels = {
    master: "Gestor Master",
    triagem: "Triagem",
    profissional: "Psicólogo"
  };

  const renderOnboardingModal = () => {
    if (!showOnboarding) return null;

    const steps = [
      {
        title: "Bem-vindo ao AcolheMente!",
        content: "Este é o seu painel de controle. Aqui você acompanha as solicitações, agendamentos e cadastros em tempo real.",
        icon: <HelpCircle className="w-12 h-12 text-forest/70/80 mb-4" />
      },
      profile.role === 'master' ? {
        title: "Gestão Completa",
        content: "No topo, você pode alternar entre Triagem (Kanban), Apoio Solidário (Doações) e Gerenciamento de Profissionais.",
        icon: <LayoutGrid className="w-12 h-12 text-forest/70/80 mb-4" />
      } : {
        title: "Seus Pacientes",
        content: "Você verá os pacientes direcionados a você. Atualize os status conforme inicia e conduz os acolhimentos.",
        icon: <User className="w-12 h-12 text-forest/70/80 mb-4" />
      },
      {
        title: "Busca Inteligente",
        content: "Use a barra de pesquisa no topo para encontrar rapidamente pacientes, lideranças, ou doações por nome, e-mail ou código.",
        icon: <Search className="w-12 h-12 text-forest/70/80 mb-4" />
      },
      {
        title: "Pronto para começar?",
        content: "Seu ambiente já está configurado. A qualquer momento, você pode atualizar os cards arrastando-os ou clicando para ver mais detalhes.",
        icon: <CheckCircle2 className="w-12 h-12 text-[#34A853] mb-4" />
      }
    ];

    const currentStep = steps[onboardingStep];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest/80 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl relative">
          <div className="absolute top-4 right-4">
            <button onClick={closeOnboarding} className="text-forest/70/60 hover:text-forest transition-colors p-2">
              <XCircle className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex flex-col items-center text-center mt-4">
            {currentStep.icon}
            <h2 className="font-serif text-2xl text-forest font-medium mb-3">{currentStep.title}</h2>
            <p className="text-forest/70/80 mb-8">{currentStep.content}</p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === onboardingStep ? 'w-6 bg-sun-dark' : 'w-2 bg-soft'}`} />
              ))}
            </div>
            
            <div className="flex gap-2">
              {onboardingStep > 0 && (
                <button 
                  onClick={() => setOnboardingStep(s => s - 1)}
                  className="p-2 border-2 border-sun-dark/20 text-forest/70 rounded-full hover:bg-sun-dark/5 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {onboardingStep < steps.length - 1 ? (
                <button 
                  onClick={() => setOnboardingStep(s => s + 1)}
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

  const pendingTriagemCount = acolhimentos.filter(a => a.notificacao && (!a.status || a.status === 'Aguardando Avaliação')).length;
  const pendingPacientesCount = acolhimentos.filter(a => a.notificacao && a.status && a.status !== 'Aguardando Avaliação').length;
  const pendingApoioSolidarioCount = solicitacoes.filter(s => s.status === 'Aguardando' || s.notificacao).length;
  const pendingProfissionaisCount = profissionaisLeads.filter(p => !p.status || p.status === 'Aguardando Entrevista' || p.notificacao).length + profissionaisAtivos.filter(p => p.notificacao).length;
  const pendingEmpresasCount = empresasLeads.filter(e => !e.status || e.status === 'Aguardando' || e.notificacao).length;

  const notificarTarget = 
    (activeTab === 'kanban' && selectedCard) ? selectedCard :
    (activeTab === 'profissionais' && selectedProfissional) ? selectedProfissional :
    (activeTab === 'empresas' && selectedEmpresa) ? selectedEmpresa :
    (selectedCard || selectedEmpresa || selectedProfissional);

  return (
    <div className="h-screen flex flex-col bg-warm overflow-hidden">
      {renderOnboardingModal()}
      {/* Topbar */}
      <nav className="shrink-0 bg-white border-b border-soft px-4 sm:px-6 py-3 flex flex-wrap gap-3 sm:gap-4 justify-between items-center z-10 w-full shadow-sm">
        <div className="flex items-center gap-3 sm:gap-4">
          <button onClick={() => onNavigate('landing')} className="text-forest/70 hover:text-forest">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-6 w-px bg-soft"></div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sun rounded-full flex items-center justify-center text-forest overflow-hidden hidden sm:flex">
              <img src="/logo.png" alt="AcolheMente Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-serif text-lg sm:text-xl font-medium text-forest flex items-center gap-2">
              Painel 
              <span className="text-forest/70 opacity-50 hidden sm:inline-block">/</span> 
              <span className="hidden sm:inline-block">{roleLabels[profile.role]}</span>
            </span>
          </div>
        </div>

        {(profile.role === 'master' || profile.role === 'triagem') && (
          <div className="flex order-last w-full lg:w-auto lg:order-none items-center gap-1 sm:gap-2 bg-warm rounded-full p-1 border border-soft overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setActiveTab('kanban')}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap relative flex items-center gap-1.5 ${activeTab === 'kanban' ? 'bg-white shadow-sm text-forest' : 'text-forest/70/70 hover:text-forest/70'}`}
            >
              Triagem
              {pendingTriagemCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold ml-1">{pendingTriagemCount}</span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('pacientesAcolhidos')}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap relative flex items-center gap-1.5 ${activeTab === 'pacientesAcolhidos' ? 'bg-white shadow-sm text-forest' : 'text-forest/70/70 hover:text-forest/70'}`}
            >
              Pacientes
              {pendingPacientesCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold ml-1">{pendingPacientesCount}</span>
              )}
            </button>
            {profile.role === 'master' && (
              <button 
                onClick={() => setActiveTab('doacoes')}
                className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap relative flex items-center gap-1.5 ${activeTab === 'doacoes' ? 'bg-white shadow-sm text-forest' : 'text-forest/70/70 hover:text-forest/70'}`}
              >
                Apoio Solidário
                {pendingApoioSolidarioCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold ml-1">{pendingApoioSolidarioCount}</span>
                )}
              </button>
            )}
            <button 
              onClick={() => setActiveTab('profissionais')}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap relative flex items-center gap-1.5 ${activeTab === 'profissionais' ? 'bg-white shadow-sm text-forest' : 'text-forest/70/70 hover:text-forest/70'}`}
            >
              Profissionais
              {pendingProfissionaisCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold ml-1">{pendingProfissionaisCount}</span>
              )}
            </button>
            {profile.role === 'master' && (
              <>
                <button 
                  onClick={() => setActiveTab('empresas')}
                  className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap relative flex items-center gap-1.5 ${activeTab === 'empresas' ? 'bg-white shadow-sm text-forest' : 'text-forest/70/70 hover:text-forest/70'}`}
                >
                  Empresas
                  {pendingEmpresasCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold ml-1">{pendingEmpresasCount}</span>
                  )}
                </button>
                <button 
                  onClick={() => setActiveTab('acessos')}
                  className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'acessos' ? 'bg-white shadow-sm text-forest' : 'text-forest/70/70 hover:text-forest/70'}`}
                >
                  Acessos
                </button>
              </>
            )}
          </div>
        )}

        {profile.role === 'profissional' && (
          <div className="flex order-last w-full lg:w-auto lg:order-none items-center gap-1 sm:gap-2 bg-warm rounded-full p-1 border border-soft overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setActiveTab('pacientes')}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'pacientes' ? 'bg-white shadow-sm text-forest' : 'text-forest/70/70 hover:text-forest/70'}`}
            >
              Meus Pacientes
            </button>
            <button 
              onClick={() => setActiveTab('tarefasProfissional')}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap relative flex items-center gap-1.5 ${activeTab === 'tarefasProfissional' ? 'bg-white shadow-sm text-forest' : 'text-forest/70/70 hover:text-forest/70'}`}
            >
              Tarefas & Mensagens
              {pendingProfNotificationsCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] w-4.5 h-4.5 flex items-center justify-center rounded-full font-bold">
                  {pendingProfNotificationsCount}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('perfil')}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'perfil' ? 'bg-white shadow-sm text-forest' : 'text-forest/70/70 hover:text-forest/70'}`}
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
          <div className="flex items-center gap-2 text-xs sm:text-sm text-forest font-medium bg-warm px-3 py-1.5 rounded-full border border-soft max-w-[120px] sm:max-w-none truncate">
            <User className="w-4 h-4 text-forest/70 shrink-0" />
            <span className="truncate">{profile.name}</span>
          </div>
          <button onClick={() => signOut(auth)} className="p-2 text-forest/70/70 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors shrink-0">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      {profile.role === 'profissional' && activeTab === 'pacientes' ? (
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
                filteredMeusPacientes.map(p => (
                  <div key={p.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-soft flex flex-col gap-4 group hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-lg text-forest">{p.nomeDesejado || p.nomeCivil}</h4>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase tracking-wide leading-none ${
                          p.atribuicaoStatus === 'Aceito' ? 'bg-[#34A853]/10 text-[#34A853]' :
                          p.atribuicaoStatus === 'Rejeitado' ? 'bg-red-500/10 text-red-500' :
                          'bg-amber-500/10 text-amber-500'
                        }`}>
                          {p.atribuicaoStatus || 'Pendente'}
                        </span>
                        <div className="text-[10px] text-forest/70 font-medium bg-warm px-2 py-1 rounded-md leading-none">{p.status}</div>
                      </div>
                    </div>
                    <div className="text-sm text-forest/70 flex flex-col gap-2">
                       <span className="flex items-center gap-2"><User className="w-4 h-4"/> Idade: {p.idade}</span>
                       <span className="flex items-center gap-2"><Circle className="w-4 h-4"/> Gênero: {p.identidadeGenero}</span>
                       {p.telefone && <span className="flex items-center gap-2 mt-2 font-semibold text-forest">📞 {p.telefone}</span>}
                    </div>
                    {p.motivo && (
                      <div className="text-xs bg-warm p-3 rounded-xl border border-soft text-forest/80 line-clamp-3">
                         <span className="font-bold block mb-1">Queixa / Motivo:</span>
                         {p.motivo}
                      </div>
                    )}
                    {p.valorSessao && (
                      <div className="flex items-center justify-between bg-[#34A853]/10 text-[#34A853] px-3 py-2 rounded-xl text-xs font-bold border border-[#34A853]/20">
                         Valor da Sessão Proposto: R$ {p.valorSessao}
                      </div>
                    )}
                    <button 
                      onClick={() => setSelectedCard(p)}
                      className="mt-2 w-full py-2 bg-warm text-forest/70 font-medium rounded-xl hover:bg-sun-dark hover:text-forest transition-colors"
                    >
                      Ver Detalhes
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : profile.role === 'profissional' && activeTab === 'tarefasProfissional' ? (
        <div className="flex-1 overflow-auto p-6 md:p-8 flex flex-col gap-8 slide-up">
          <div className="max-w-4xl w-full mx-auto">
            <h2 className="font-serif text-3xl text-forest bg-white px-8 py-6 rounded-[2rem] shadow-sm border border-soft flex items-center gap-4 mb-8">
              <CheckSquare className="w-8 h-8 text-forest/70 animate-pulse" />
              Central de Alertas e Mensagens
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {profNotifications.length === 0 ? (
                <div className="col-span-full text-center p-12 bg-white/50 border border-dashed border-soft rounded-[2rem] text-forest/70 p-12">
                  <span className="block text-4xl mb-3">🌟</span>
                  Nenhuma mensagem ou alerta clínico pendente no momento. Tudo em ordem!
                </div>
              ) : (
                profNotifications.map((notif) => (
                  <div key={notif.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-soft flex flex-col justify-between gap-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] uppercase font-bold px-2.5 py-1 rounded-md ${
                        notif.type === 'assignment' ? 'bg-amber-100 text-amber-700' :
                        notif.type === 'alert' ? 'bg-red-50 text-red-700 border border-red-100 font-bold' :
                        notif.type === 'contract' ? 'bg-blue-50 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {notif.type === 'assignment' ? 'Novo Paciente' :
                         notif.type === 'alert' ? 'Alerta Administrativo/Clínico' :
                         notif.type === 'contract' ? 'Pendência de Contrato' :
                         'Atualização'}
                      </span>
                      <span className="text-[10px] font-semibold text-forest/50">Paciente: {notif.patientName}</span>
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-semibold text-base text-forest mt-1">{notif.title}</h4>
                      <p className="text-xs text-forest/70 mt-2 leading-relaxed bg-warm/50 p-3 rounded-xl border border-soft">
                        {notif.desc}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => {
                        setSelectedCard(notif.patientObj);
                        setActiveTab('pacientes');
                      }}
                      className="mt-2 w-full py-2.5 bg-forest text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-forest/90 transition-colors"
                    >
                      Acessar Ficha do Paciente
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : profile.role === 'profissional' && activeTab === 'perfil' ? (
        <div className="flex-1 overflow-auto p-6 md:p-8 flex flex-col gap-8 slide-up">
          <div className="max-w-4xl w-full mx-auto">
             <h2 className="font-serif text-3xl text-forest bg-white px-8 py-6 rounded-[2rem] shadow-sm border border-soft flex items-center gap-4 mb-8">
              <User className="w-8 h-8 text-forest/70" />
              Meu Perfil de Apresentação
            </h2>
            <div className="bg-white p-8 sm:p-10 rounded-[2rem] shadow-sm border border-soft flex flex-col gap-8">
              
              {/* Profile Photo base64 component */}
              <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-soft">
                <div className="w-28 h-28 rounded-full overflow-hidden bg-forest/10 border-4 border-sun flex-shrink-0 flex items-center justify-center relative">
                  {profile.photoUrl ? (
                    <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-14 h-14 text-forest/70" />
                  )}
                </div>
                <div className="flex flex-col gap-2 items-center sm:items-start">
                  <h4 className="font-serif text-xl font-medium text-forest">Foto de Apresentação</h4>
                  <p className="text-xs text-forest/60 max-w-sm text-center sm:text-left">Escolha uma foto quadrada, profissional e bem iluminada para os pacientes o identificarem.</p>
                  
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
                            alert("A imagem é muito grande. Escolha uma imagem de até 800KB.");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setProfile((prev: any) => ({ ...prev, photoUrl: reader.result as string }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Editing Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs uppercase font-bold tracking-wider text-forest/50">Nome Completo</label>
                  <input 
                    type="text" 
                    value={profile.name || ''} 
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                    className="w-full mt-2 px-4 py-3 bg-warm/50 border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase font-bold tracking-wider text-forest/50">Email</label>
                  <input 
                    type="email" 
                    value={profile.email || ''} 
                    disabled
                    className="w-full mt-2 px-4 py-3 bg-warm border border-soft rounded-xl text-forest/50 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase font-bold tracking-wider text-forest/50">Telefone / WhatsApp Comercial</label>
                  <input 
                    type="tel" 
                    value={profile.telefone || ''} 
                    placeholder="Ex: 11999999999"
                    onChange={(e) => setProfile({...profile, telefone: e.target.value})}
                    className="w-full mt-2 px-4 py-3 bg-warm/50 border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase font-bold tracking-wider text-forest/50">CRP (Registro Profissional)</label>
                  <input 
                    type="text" 
                    value={profile.crp || ''} 
                    placeholder="Ex: 06/123456"
                    onChange={(e) => setProfile({...profile, crp: e.target.value})}
                    className="w-full mt-2 px-4 py-3 bg-warm/50 border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase font-bold tracking-wider text-forest/50">Abordagem / Especialidades</label>
                  <input 
                    type="text" 
                    value={profile.especialidade || ''} 
                    placeholder="Ex: TCC / Inteligência Emocional"
                    onChange={(e) => setProfile({...profile, especialidade: e.target.value})}
                    className="w-full mt-2 px-4 py-3 bg-warm/50 border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase font-bold tracking-wider text-forest/50">Disponibilidade de Horários</label>
                  <input 
                    type="text" 
                    value={profile.horasDisponiveis || ''} 
                    placeholder="Ex: Segundas e Terças das 14h às 20h"
                    onChange={(e) => setProfile({...profile, horasDisponiveis: e.target.value})}
                    className="w-full mt-2 px-4 py-3 bg-warm/50 border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase font-bold tracking-wider text-forest/50">Cidade</label>
                  <input 
                    type="text" 
                    value={profile.cidade || ''} 
                    placeholder="Ex: São Paulo"
                    onChange={(e) => setProfile({...profile, cidade: e.target.value})}
                    className="w-full mt-2 px-4 py-3 bg-warm/50 border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase font-bold tracking-wider text-forest/50">Estado (UF)</label>
                  <input 
                    type="text" 
                    value={profile.uf || ''} 
                    placeholder="Ex: SP"
                    maxLength={2}
                    onChange={(e) => setProfile({...profile, uf: e.target.value})}
                    className="w-full mt-2 px-4 py-3 bg-warm/50 border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors"
                  />
                </div>
              </div>

              {/* Biography Section */}
              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase font-bold tracking-wider text-forest/50">Mini-currículo & Biografia clínica</label>
                <textarea 
                  value={profile.biografia || ''} 
                  onChange={(e) => setProfile({...profile, biografia: e.target.value})}
                  placeholder="Escreva um breve texto sobre sua formação técnica, experiências profissionais e o estilo de sua conduta terapêutica..."
                  className="w-full mt-2 px-4 py-3 bg-warm/50 border border-soft rounded-xl focus:outline-none focus:border-sun-dark resize-none h-40 text-sm leading-relaxed"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-soft">
                <button 
                  onClick={() => handleUpdateSelfProfile({ 
                    name: profile.name, 
                    telefone: profile.telefone,
                    crp: profile.crp,
                    especialidade: profile.especialidade,
                    horasDisponiveis: profile.horasDisponiveis,
                    cidade: profile.cidade,
                    uf: profile.uf,
                    biografia: profile.biografia,
                    photoUrl: profile.photoUrl || ''
                  })}
                  className="px-6 py-3.5 bg-forest text-white rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-forest/90 transition-colors self-start w-full sm:w-auto text-center"
                >
                  Salvar Perfil Profissional
                </button>
                
                {/* Share Landingpage Preview Box */}
                {profile.uid && (() => {
                  const shareLink = `${window.location.origin}?prof=${profile.uid}`;
                  return (
                    <div className="bg-warm/60 border border-soft rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs w-full sm:max-w-md">
                      <div className="truncate text-forest/70 max-w-[200px] font-mono select-all shrink">
                        {shareLink}
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(shareLink);
                          alert("Link de Apresentação copiado!");
                        }}
                        className="px-3 py-1.5 bg-sun-dark text-forest font-bold text-[10px] uppercase rounded-lg hover:bg-sun-dark-dark transition-colors shrink-0"
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
      ) : (activeTab === 'kanban' || activeTab === 'pacientesAcolhidos') ? (
        <>
          <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
            <div className="flex h-full gap-6 shrink-0 w-max items-start">
          
          {visibleColumns.map(col => {
            const colCards = filteredAcolhimentos.filter(a => a.status === col.id);
            return (
              <div 
                key={col.id} 
                className="w-[320px] shrink-0 h-full flex flex-col bg-white/50 border border-soft rounded-2xl overflow-hidden"
                onDrop={(e) => handleDrop(e, col.id)}
                onDragOver={handleDragOver}
              >
                {/* Column Header */}
                <div className="p-4 bg-white border-b border-soft flex justify-between items-center shadow-sm z-10">
                  <h3 className="font-semibold text-forest text-sm">{col.label}</h3>
                  <span className="bg-warm text-forest/70 px-2 py-0.5 rounded-full text-xs font-bold border border-soft">
                    {colCards.length}
                  </span>
                </div>
                
                {/* Cards List */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                  {colCards.map(card => (
                    <div 
                      key={card.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, card.id)}
                      onClick={() => setSelectedCard(card)}
                      className="bg-white p-4 rounded-xl shadow-sm border border-soft shadow-sun-dark/5 hover:shadow-md cursor-grab active:cursor-grabbing hover:border-sun-dark/30 transition-all group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          card.viaAcesso === 'Particular' ? 'bg-sun-dark-light text-forest/70-dark' : 'bg-[#E5EDF4] text-[#3B668D]'
                        }`}>
                          {card.viaAcesso}
                        </span>
                        <Grip className="w-4 h-4 text-forest/70/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <h4 className="font-medium text-forest text-sm line-clamp-1">{card.nome}</h4>
                      <p className="text-xs text-forest/70/70 mt-1 line-clamp-2">{card.motivo.split(' - ')[0]}</p>
                      
                      {card.valorSessao && (
                        <div className="mt-2 text-[10px] font-bold text-[#34A853] bg-[#34A853]/10 px-2 py-1 rounded inline-block">
                          Sessão: R$ {card.valorSessao}
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-4 text-[10px] text-forest/70 font-medium opacity-70">
                        <Clock className="w-3 h-3" />
                        {card.createdAt ? new Date(card.createdAt.toMillis()).toLocaleDateString('pt-BR') : 'Sem data'}
                      </div>

                      {card.profissionalId && (() => {
                        const assignedProf = allUsers.find(u => u.uid === card.profissionalId || u.id === card.profissionalId);
                        const displayStatus = card.atribuicaoStatus || 'Pendente';
                        return (
                          <div className="mt-2.5 pt-2 border-t border-soft/50 flex flex-wrap justify-between items-center text-[10px] gap-1 shrink-0">
                            <span className="text-forest/70 font-medium truncate max-w-[130px] flex items-center gap-1">
                              👤 {assignedProf ? assignedProf.name : 'Indefinido'}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded font-bold text-[9px] uppercase ${
                              displayStatus === 'Aceito' ? 'bg-[#34A853]/10 text-[#34A853]' :
                              displayStatus === 'Rejeitado' ? 'bg-red-500/10 text-red-500' :
                              'bg-amber-500/10 text-amber-500'
                            }`}>
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

            </>
      ) : activeTab === 'doacoes' ? (
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
                filteredDoacoes.map(d => (
                  <div key={d.id} className="bg-white p-5 rounded-2xl shadow-sm border border-soft flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-sun-dark/10 text-forest/70 rounded-full flex items-center justify-center">
                        <HandHeart className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-forest truncate max-w-[150px]">{d.nome}</h4>
                        <div className="text-xs text-forest/70/70 flex gap-2 items-center mt-1">
                          <span>{d.createdAt ? new Date(d.createdAt.toMillis()).toLocaleDateString() : ''}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block font-bold text-forest">R$ {d.valor.toFixed(2)}</span>
                      <span className="text-[10px] uppercase font-bold text-[#34A853] bg-[#34A853]/10 px-2 py-0.5 rounded-md inline-block mt-0.5">PIX {d.status}</span>
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
                filteredSolicitacoes.map(s => (
                  <div key={s.id} className="bg-white p-5 rounded-2xl shadow-sm border border-soft flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold text-sm text-forest">{s.nome}</h4>
                      <div className="text-[10px] text-forest/70/70 font-medium">{s.createdAt ? new Date(s.createdAt.toMillis()).toLocaleDateString() : ''}</div>
                    </div>
                    <div className="text-xs text-forest/70/80 bg-warm p-3 rounded-lg border border-soft leading-relaxed line-clamp-3">
                      "{s.motivo}"
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs font-semibold text-forest">📞 {s.telefone}</span>
                      <span className="text-[10px] uppercase font-bold text-forest/70 bg-sun-dark/10 px-2 py-0.5 rounded-md">{s.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : activeTab === 'profissionais' ? (
        <div className="flex-1 overflow-auto p-6 md:p-8 flex items-start flex-col gap-8 slide-up">
           <div className="w-full flex flex-col gap-4">
            <h2 className="font-serif text-2xl text-forest bg-white px-6 py-4 rounded-2xl shadow-sm border border-soft flex items-center gap-3">
              <User className="w-6 h-6 text-forest/70" />
              Novos Cadastros (Leads)
            </h2>
            <div className="flex flex-col gap-3">
              {filteredLeads.length === 0 ? (
                <div className="text-center p-8 bg-white/50 border border-dashed border-soft rounded-2xl text-forest/70/70 text-sm">
                  Nenhum cadastro pendente.
                </div>
              ) : (
                filteredLeads.map(lead => (
                  <div key={lead.id} className="bg-white p-6 rounded-2xl shadow-sm border border-soft flex flex-col gap-4 group hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 shrink-0 bg-sun-dark/10 text-forest/70 rounded-full flex items-center justify-center mt-1">
                          <User className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-base text-forest">{lead.nome} <span className="text-xs font-normal text-forest/70/70 ml-2">{lead.especialidade} {lead.crp ? ` • Reg: ${lead.crp}` : ''}</span></h4>
                          <div className="text-xs text-forest/70/70 flex flex-wrap gap-2 items-center mt-1">
                            <span>{lead.email}</span> • <span>{lead.telefone}</span> {lead.cidade && <span>• {lead.cidade}/{lead.uf}</span>}
                          </div>
                          <div className="text-xs mt-3 bg-warm p-3 rounded-xl border border-soft font-medium text-forest/80 line-clamp-2">
                             <span className="font-bold opacity-70">Motivação:</span> "{lead.motivo || lead.motivacao}"
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2 shrink-0 mt-2 md:mt-0">
                        <span className="text-[10px] uppercase font-bold bg-forest/5 text-forest px-2 py-1 rounded-md inline-block">
                           Disponível: {lead.horasDisponiveis}
                        </span>
                        <span className="text-[10px] font-bold text-forest/70 uppercase tracking-wider bg-warm px-2 py-1 rounded-md border border-soft/50">
                          Status: {lead.status || 'Aguardando Entrevista'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full mt-2 mb-2">
                       <div className="flex w-full items-center justify-between gap-1 mb-1 relative">
                          <div className="absolute top-1/2 left-0 w-full h-[2px] bg-soft -z-10 -translate-y-1/2"></div>
                          <div className="absolute top-1/2 left-0 h-[2px] bg-[#34A853] -z-10 -translate-y-1/2 transition-all duration-500" style={{
                            width: lead.status === 'Rejeitado' ? '0%' :
                                   (!lead.status || lead.status === 'Aguardando Entrevista' || lead.status === 'Aguardando Avaliação') ? '0%' :
                                   (lead.status === 'Aprovado' || lead.status === 'Stand-by') ? '33%' :
                                   (lead.status === 'Aguardando Contrato') ? '66%' :
                                   (lead.status === 'Aguardando Acesso') ? '100%' : '0%'
                          }}></div>
                          
                          {[
                            { label: 'Cadastro', active: lead.status !== 'Rejeitado' },
                            { label: 'Entrevista', active: lead.status !== 'Rejeitado' && lead.status !== 'Aguardando Entrevista' && lead.status !== 'Aguardando Avaliação' && lead.status !== undefined && lead.status !== '' },
                            { label: 'Contrato', active: lead.status === 'Aguardando Contrato' || lead.status === 'Aguardando Acesso' },
                            { label: 'Acesso', active: lead.status === 'Aguardando Acesso' },
                          ].map((step, idx) => (
                             <div key={idx} className="flex flex-col items-center gap-1 bg-white px-2">
                                <div className={`w-3 h-3 rounded-full border-2 transition-colors duration-500 ${step.active ? 'bg-[#34A853] border-[#34A853]' : (lead.status === 'Rejeitado' ? 'bg-red-200 border-red-300' : 'bg-white border-soft')}`} />
                                <span className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${step.active ? 'text-[#34A853]' : (lead.status === 'Rejeitado' ? 'text-red-400' : 'text-forest/40')}`}>
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
                           {(lead.status === 'Aguardando Entrevista' || lead.status === 'Aguardando Avaliação' || !lead.status) && (
                              <>
                                <button onClick={() => handleUpdateLeadStatus(lead.id, 'Aprovado')} className="flex-1 sm:flex-none text-xs font-semibold px-4 py-2 bg-[#34A853]/10 text-[#34A853] rounded-xl transition-colors border border-[#34A853]/20 hover:bg-[#34A853] hover:text-white">Aprovar p/ Contrato</button>
                                <button onClick={() => handleUpdateLeadStatus(lead.id, 'Stand-by')} className="flex-1 sm:flex-none text-xs font-semibold px-4 py-2 bg-amber-500/10 text-amber-600 rounded-xl transition-colors border border-amber-500/20 hover:bg-amber-500 hover:text-white">Stand-by</button>
                                <button onClick={() => handleUpdateLeadStatus(lead.id, 'Rejeitado')} className="flex-1 sm:flex-none text-xs font-semibold px-4 py-2 bg-red-500/10 text-red-500 rounded-xl transition-colors border border-red-500/20 hover:bg-red-500 hover:text-white">Rejeitar</button>
                              </>
                           )}
                           
                           {(lead.status === 'Aprovado' || lead.status === 'Stand-by') && (
                              <button onClick={() => handleUpdateLeadStatus(lead.id, 'Aguardando Contrato')} className="w-full sm:w-auto text-xs font-semibold px-4 py-2 bg-sun-dark text-forest rounded-xl hover:bg-sun-dark-dark transition-colors border border-sun-dark-dark/20 text-center">
                                Solicitado Assinatura de Contrato
                              </button>
                           )}

                           {lead.status === 'Aguardando Contrato' && (
                              <button onClick={() => handleUpdateLeadStatus(lead.id, 'Aguardando Acesso')} className="w-full sm:w-auto text-xs font-semibold px-4 py-2 bg-[#34A853]/10 text-[#34A853] rounded-xl transition-colors border border-[#34A853]/20 hover:bg-[#34A853] hover:text-white">Marcar como Assinado</button>
                           )}

                           {lead.status === 'Aguardando Acesso' && (
                              <button 
                                onClick={() => {
                                  setNewProfName(lead.nome);
                                  setNewProfEmail(lead.email);
                                  setNewProfPassword(Math.random().toString(36).slice(-8));
                                  setLeadIdToConvert(lead.id);
                                  setShowNewProfissionalModal(true);
                                }}
                                className="w-full sm:w-auto text-xs font-bold px-4 py-2 bg-forest text-white rounded-xl flex items-center justify-center gap-2 transition-colors hover:bg-forest/90"
                              >
                                <User className="w-4 h-4" /> Criar Acesso na Plataforma
                              </button>
                           )}

                           {profile?.role === 'master' && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteProfissional(lead.id, 'leads'); }}
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
              <button 
                onClick={() => setShowNewProfissionalModal(true)}
                className="px-4 py-2 bg-sun-dark text-forest text-sm font-semibold rounded-full hover:bg-sun-dark-dark transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Nova Conta de Profissional
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAtivos.length === 0 ? (
                <div className="col-span-full text-center p-8 bg-white/50 border border-dashed border-soft rounded-2xl text-forest/70/70 text-sm">
                  Nenhum profissional com conta criada no Firebase Auth. Crie a conta deles pelo botão acima.
                </div>
              ) : (
                 filteredAtivos.map(p => (
                   <div key={p.uid} className="bg-white p-4 rounded-2xl shadow-sm border border-soft flex gap-4 items-center justify-between">
                      <div className="flex gap-4 items-center">
                        <div className="w-10 h-10 bg-warm text-forest/70 font-bold flex items-center justify-center rounded-full uppercase">
                           {p.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-forest flex items-center gap-2">
                             {p.name || p.email}
                             <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${p.ativo === false ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                               {p.ativo === false ? 'Inativo' : 'Ativo'}
                             </span>
                          </div>
                          <div className="text-xs uppercase font-bold text-forest/70">{p.role}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setSelectedProfissional(p)}
                          className="text-xs font-semibold px-3 py-1.5 bg-sun text-forest rounded-lg hover:bg-sun-dark transition-colors flex items-center justify-center gap-1 shrink-0"
                        >
                          <FileText className="w-3 h-3" /> Ficha de Bordo
                        </button>
                        {profile?.role === 'master' && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteProfissional(p.uid!, 'ativos'); }}
                            className="text-xs font-semibold px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-1 shrink-0"
                            title="Excluir Permanentemente"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                   </div>
                 ))
              )}
            </div>
          </div>
        </div>
      ) : activeTab === 'empresas' ? (
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
                empresasLeads.map(lead => (
                  <div key={lead.id} className="bg-white p-6 rounded-2xl shadow-sm border border-soft flex flex-col gap-4 group hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-1">
                        <h4 className="font-semibold text-lg text-forest">{lead.nomeEmpresa}</h4>
                        <span className="text-xs font-semibold uppercase tracking-wider text-forest/60">CNPJ: {lead.cnpj}</span>
                      </div>
                      <div className="text-[10px] text-forest/70/80 font-bold bg-warm px-2 py-1 rounded-md whitespace-nowrap">
                        {lead.createdAt ? new Date(lead.createdAt.toMillis()).toLocaleDateString() : ''}
                      </div>
                    </div>
                    
                    <div className="text-sm text-forest/80 flex flex-col gap-3 mt-2 bg-warm/50 p-4 rounded-xl border border-soft">
                       <span className="flex items-center gap-3 font-medium"><Map className="w-4 h-4 text-forest/60"/> {lead.local}</span>
                       <span className="flex items-center gap-3 font-medium"><Briefcase className="w-4 h-4 text-forest/60"/> Ramo: {lead.ramoAtividade}</span>
                       <span className="flex items-center gap-3 font-medium"><Users className="w-4 h-4 text-forest/60"/> Colabs: {lead.colaboradores}</span>
                       <div className="h-px w-full bg-soft/50 my-1"></div>
                       <span className="flex items-center gap-3 font-medium text-forest"><User className="w-4 h-4 text-forest/60"/> {lead.contatoNome || "Contato N/I"} ({lead.contatoDepartamento || "-"})</span>
                    </div>

                    <div className="text-sm flex flex-col gap-2 mt-2 border-b border-soft pb-4">
                       <a href={`mailto:${lead.email}`} className="flex items-center gap-2 font-semibold text-forest hover:text-sun-dark transition-colors">
                         <Mail className="w-4 h-4" /> {lead.email}
                       </a>
                       <a href={`https://wa.me/${lead.telefone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-semibold text-forest hover:text-sun-dark transition-colors">
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
      ) : activeTab === 'acessos' ? (
        <div className="flex-1 overflow-auto p-6 md:p-8 flex items-start flex-col gap-8 slide-up">
          <div className="w-full flex items-center justify-between bg-white px-6 py-4 rounded-2xl shadow-sm border border-soft">
            <h2 className="font-serif text-2xl text-forest flex items-center gap-3">
              <Users className="w-6 h-6 text-forest/70" />
              Níveis de Acesso
            </h2>
            <span className="text-xs font-semibold text-forest/50 bg-warm px-3 py-1 rounded-full uppercase tracking-wider">Gestor Master</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {allUsers.filter(u => (!searchQuery || u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase()) || u.role?.toLowerCase().includes(searchQuery.toLowerCase()))).map(u => (
              <div key={u.uid} className="bg-white p-6 rounded-[2rem] shadow-sm border border-soft flex flex-col gap-4">
                 <div className="flex items-start justify-between">
                   <h3 className="font-semibold text-lg text-forest break-words leading-tight">{u.name}</h3>
                 </div>
                 {u.email && <div className="text-sm text-forest/70 truncate flex items-center gap-2"><Mail className="w-4 h-4 shrink-0"/> <span className="truncate">{u.email}</span></div>}
                 
                 <div className="mt-auto pt-4 border-t border-soft flex flex-col gap-1">
                   <label className="text-[10px] uppercase font-bold tracking-wider text-forest/50">Papel / Nível de Acesso</label>
                   <select 
                     value={u.role} 
                     onChange={(e) => handleRoleChange(u.uid!, e.target.value as Role)}
                     className="w-full bg-warm border border-soft rounded-xl px-4 py-2 mt-1 text-sm text-forest font-semibold focus:outline-none focus:border-sun-dark focus:bg-white transition-colors cursor-pointer"
                   >
                      <option value="master">Administrador (Master)</option>
                      <option value="triagem">Gestão de Triagem</option>
                      <option value="profissional">Profissional / Psicólogo</option>
                   </select>
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
      ) : null}

{/* Card Details Modal */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-forest/20 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-soft overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-soft bg-warm/50 gap-2">
              <div className="flex flex-col">
                <h3 className="font-serif text-2xl text-forest">Ficha de Acolhimento</h3>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-[11px] uppercase tracking-wider font-semibold text-forest/50 mt-1">
                   {selectedCard.createdAt && <span>Entrada: {formatDate(selectedCard.createdAt)}</span>}
                   {selectedCard.statusUpdatedAt && <span>Ativação: {formatDate(selectedCard.statusUpdatedAt)}</span>}
                </div>
              </div>
              <button onClick={() => setSelectedCard(null)} className="p-2 text-forest/70 hover:text-red-500 rounded-full hover:bg-white transition-colors self-end sm:self-auto">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            {/* Action Bar */}
            <div className="flex flex-wrap items-center gap-4 py-3 px-6 bg-white border-b border-soft">
              <button 
                onClick={() => {
                   setNotificacaoType('pagamento');
                   setNotificacaoMsg('Olá! Identificamos uma pendência de pagamento referente à sua última sessão. Por favor, regularize assim que possível.');
                   setShowNotificarModal(true);
                }}
                className="flex items-center gap-2 text-emerald-600 font-semibold text-sm hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors">
                <Send className="w-4 h-4" /> Notificar
              </button>
              <button 
                onClick={() => setIsEditingCard(!isEditingCard)}
                className="flex items-center gap-2 text-amber-500 font-semibold text-sm hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-colors">
                <Edit3 className="w-4 h-4" /> {isEditingCard ? 'Salvar Edição' : 'Editar'}
              </button>
              <button 
                onClick={() => handleUpdateAcolhimentoProperty(selectedCard.id, 'ativo', selectedCard.ativo === false ? true : false)}
                className={`flex items-center gap-2 ${selectedCard.ativo === false ? 'text-slate-500 hover:bg-slate-50' : 'text-red-500 hover:bg-red-50'} font-semibold text-sm px-3 py-1.5 rounded-lg transition-colors`}>
                <Trash2 className="w-4 h-4" /> {selectedCard.ativo === false ? 'Ativar' : 'Inativar'}
              </button>
              
              {/* Contrato Assinado */}
              <div className="flex items-center gap-2 ml-4">
                <button 
                  onClick={() => {
                    setContratoText(`CONTRATO DE PRESTAÇÃO DE SERVIÇOS PSICOLÓGICOS\n\nCONTRATANTE: ${selectedCard.nome}, portador(a) do email ${selectedCard.email}.\n\nCONTRATADO: Elo Soluções Humanas...\n\nCLÁUSULA 1 - O presente contrato tem por objeto a prestação de serviços psicológicos na modalidade de Terapia Individual...\n\n(Edite as cláusulas abaixo)`);
                    setShowContratoModal(true);
                  }}
                  className="text-xs text-forest underline hover:text-sun-dark transition-colors"
                >
                  Editar Contrato
                </button>
                <label className="flex items-center gap-1 text-xs text-forest/80 cursor-pointer ml-2">
                  <input 
                    type="checkbox" 
                    checked={selectedCard.contratoAssinado || false}
                    onChange={(e) => handleUpdateAcolhimentoProperty(selectedCard.id, 'contratoAssinado', e.target.checked)}
                    className="accent-sun-dark h-3 w-3"
                  />
                  Contrato Assinado
                </label>
              </div>

              <div className="flex-1"></div>
              <button 
                onClick={() => setShowFinanceiroModal(true)}
                className="flex items-center gap-2 text-slate-500 hover:text-forest transition-colors font-semibold text-sm underline decoration-slate-300 underline-offset-4">
                <History className="w-4 h-4" /> Histórico Financeiro
              </button>
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
                      <EditableField label="Nome" value={selectedCard.nome} field="nome" onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)} isEditing={isEditingCard} />
                      <EditableField label="Data de Nascimento" value={selectedCard.dataNascimento} field="dataNascimento" onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)} isEditing={isEditingCard} />
                      <EditableField label="CPF" value={selectedCard.cpf} field="cpf" onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)} isEditing={isEditingCard} />
                      <EditableField label="E-mail" value={selectedCard.email} field="email" onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)} isEditing={isEditingCard} />
                      <EditableField label="Telefone / WhatsApp" value={selectedCard.telefone} field="telefone" onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)} isEditing={isEditingCard} />
                      <EditableField label="Via de Acesso / Empresa" value={selectedCard.viaAcesso} field="viaAcesso" onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)} isEditing={isEditingCard} />
                      <EditableField label="Valor da Sessão (R$)" value={selectedCard.valorSessao} field="valorSessao" onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)} isEditing={isEditingCard} />
                      <EditableField label="De onde nos conheceu" value={selectedCard.comoConheceu} field="comoConheceu" onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)} isEditing={isEditingCard} />
                      {selectedCard.tratamentoPara === 'Outra pessoa' && (
                        <>
                          <div className="mt-4 pt-4 border-t border-soft">
                             <span className="block text-xs font-bold uppercase text-forest/70 mb-2">Dados do Responsável</span>
                             <EditableField label="Responsável" value={selectedCard.responsavelNome} field="responsavelNome" onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)} isEditing={isEditingCard} />
                             <EditableField label="CPF do Responsável" value={selectedCard.responsavelCpf} field="responsavelCpf" onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)} isEditing={isEditingCard} />
                          </div>
                        </>
                      )}
                    </div>
                  </section>

                  {selectedCard.viaAcesso === 'Particular' && (
                    <section>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Perfil Socioeconômico
                      </h4>
                      <div className="space-y-3 ms-2 flex flex-col gap-1">
                        <EditableField label="Renda Bruta" value={selectedCard.faixaSalarial} field="faixaSalarial" onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)} isEditing={isEditingCard} />
                        <EditableField label="Fonte" value={selectedCard.fonteRenda} field="fonteRenda" onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)} isEditing={isEditingCard} />
                        <EditableField label="Residentes" value={selectedCard.dependentes} field="dependentes" onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)} isEditing={isEditingCard} />
                        <EditableField label="Plano de Saúde" value={selectedCard.planoSaude} field="planoSaude" onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)} isEditing={isEditingCard} />
                      </div>
                    </section>
                  )}
                </div>

                {/* Column 2 */}
                <div className="space-y-6">
                  {selectedCard.viaAcesso === 'Particular' && (
                    <section>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-3">Habitação e Acesso</h4>
                      <div className="space-y-3 ms-2">
                        <EditableField label="Escolaridade" value={selectedCard.escolaridade} field="escolaridade" onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)} isEditing={isEditingCard} />
                        <EditableField label="Moradia" value={selectedCard.moradia} field="moradia" onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)} isEditing={isEditingCard} />
                        <EditableField label="Cômodos" value={selectedCard.comodos} field="comodos" onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)} isEditing={isEditingCard} />
                        <EditableField label="Dispositivo / Aparelho" value={selectedCard.dispositivo} field="dispositivo" onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)} isEditing={isEditingCard} />
                        <EditableField label="Internet" value={selectedCard.internet} field="internet" onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)} isEditing={isEditingCard} />
                      </div>
                    </section>
                  )}

                  <section>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-3">Histórico e Motivação</h4>
                    <div className="space-y-3 ms-2">
                      <EditableField label="Terapia Anterior?" value={selectedCard.terapiaAnterior} field="terapiaAnterior" onChange={(f, v) => handleUpdateAcolhimentoProperty(selectedCard.id, f, v)} isEditing={isEditingCard} />
                      <div className="bg-sun-dark-light/30 border border-sun-dark/10 p-4 rounded-xl mt-2">
                        <span className="block text-xs font-semibold uppercase text-forest/70/60 mb-2">Motivo Declarado</span>
                        {isEditingCard ? (
                          <textarea 
                            value={selectedCard.motivo || ''} 
                            onChange={(e) => handleUpdateAcolhimentoProperty(selectedCard.id, 'motivo', e.target.value)}
                            className="w-full bg-transparent text-sm text-forest border-b border-sun-dark focus:outline-none resize-none h-16"
                          />
                        ) : (
                          <p className="text-sm text-forest leading-relaxed">{selectedCard.motivo}</p>
                        )}
                      </div>
                    </div>
                  </section>
                  
                  {profile.role !== 'profissional' ? (
                    <section className="mt-8">
                      <div className="flex flex-col gap-2 p-4 bg-warm rounded-2xl border border-soft mt-2">
                         <label className="text-xs font-bold uppercase tracking-wider text-forest/70">Atribuir a Profissional Parceiro</label>
                         <select 
                           value={selectedCard.profissionalId || ""}
                           onChange={(e) => handleUpdateAcolhimentoProperty(selectedCard.id, 'profissionalId', e.target.value)}
                           className="px-4 py-3 rounded-xl border border-soft focus:outline-none focus:border-sun-dark bg-white text-forest text-sm appearance-none"
                         >
                           <option value="">(Nenhum)</option>
                           {profissionaisAtivos.map(p => (
                             <option key={p.uid} value={p.uid}>{p.name} - {p.email}</option>
                           ))}
                         </select>
                      </div>
                    </section>
                  ) : (
                    <section className="mt-8 space-y-4">
                      {/* Accept / Reject Status Selection */}
                      <div className="flex flex-col gap-2 p-5 bg-warm rounded-2xl border border-soft mt-2">
                         <label className="text-xs font-bold uppercase tracking-wider text-forest/70">Responder Encaminhamento</label>
                         <p className="text-xs text-forest/60 mb-3">Indique se você aceita conduzir o tratamento clínico deste paciente.</p>
                         <div className="grid grid-cols-2 gap-3">
                           <button 
                             onClick={async () => {
                               await handleUpdateAcolhimentoProperty(selectedCard.id, 'atribuicaoStatus', 'Aceito');
                             }}
                             className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                               selectedCard.atribuicaoStatus === 'Aceito' 
                                 ? 'bg-[#34A853] text-white shadow-sm' 
                                 : 'bg-white text-forest border border-soft hover:bg-warm'
                             }`}
                           >
                             <CheckCircle2 className="w-3.5 h-3.5" /> Aceitar Paciente
                           </button>
                           
                           <button 
                             onClick={() => {
                               setConfirmConfig({
                                 isOpen: true,
                                 message: 'Deseja rejeitar este encaminhamento? O paciente voltará para a Fila de Espera/Triagem e o gestor será notificado.',
                                 onConfirm: async () => {
                                   try {
                                     const updates = {
                                       profissionalId: '',
                                       status: 'Aprovado', // Fila de Espera
                                       atribuicaoStatus: null,
                                       notificacao: `Encaminhamento rejeitado pelo profissional ${profile.name || 'Parceiro'}. Retornou para a Fila de Espera.`
                                     };
                                     await updateDoc(doc(db, "acolhimentos", selectedCard.id), updates);
                                     setSelectedCard(null);
                                   } catch(e) {
                                     console.error(e);
                                     alert("Erro ao rejeitar encaminhamento.");
                                   }
                                 }
                               });
                             }}
                             className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                               selectedCard.atribuicaoStatus === 'Rejeitado' 
                                 ? 'bg-red-500 text-white shadow-sm' 
                                 : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
                             }`}
                           >
                             <XCircle className="w-3.5 h-3.5" /> Rejeitar Paciente
                           </button>
                         </div>
                      </div>

                      <div className="flex flex-col gap-2 p-4 bg-red-50 rounded-2xl border border-red-100">
                         <label className="text-xs font-bold uppercase tracking-wider text-red-900/70">Devolver Paciente</label>
                         <p className="text-xs text-red-900/60 mb-2">Caso já tenha aceitado, mas precise suspender o acompanhamento por qualquer motivo, devolva-o para triagem.</p>
                         <button 
                           onClick={() => {
                             setConfirmConfig({
                               isOpen: true,
                               message: 'Tem certeza que deseja devolver este paciente para a triagem? Isso suspenderá o atendimento clínico.',
                               onConfirm: async () => {
                                 try {
                                   const updates = {
                                     profissionalId: '',
                                     status: 'Aprovado', // Fila de Espera
                                     atribuicaoStatus: null,
                                     notificacao: `Atendimento interrompido/devolvido pelo profissional ${profile.name || 'Parceiro'}.`
                                   };
                                   await updateDoc(doc(db, "acolhimentos", selectedCard.id), updates);
                                   setSelectedCard(null);
                                 } catch(e) {
                                   console.error(e);
                                   alert("Erro ao devolver paciente.");
                                 }
                               }
                             });
                           }}
                           className="px-4 py-2 bg-white text-red-600 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors"
                         >
                           Desatribuir (Devolver para Triagem)
                         </button>
                      </div>
                    </section>
                  )}

                  {/* Show Professional presentation card inside Patient file */}
                  {selectedCard.profissionalId && (() => {
                    const matchedProf = allUsers.find(u => u.uid === selectedCard.profissionalId || u.id === selectedCard.profissionalId);
                    if (!matchedProf) return null;
                    const publicLink = `${window.location.origin}?prof=${matchedProf.uid || matchedProf.id || ''}`;
                    return (
                      <section className="mt-6 bg-white border border-soft p-5 rounded-2xl shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-14 h-14 rounded-full overflow-hidden bg-forest/10 border-2 border-sun flex-shrink-0 flex items-center justify-center">
                            {matchedProf.photoUrl ? (
                              <img src={matchedProf.photoUrl} alt={matchedProf.name} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-7 h-7 text-forest/70" />
                            )}
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-sun-dark uppercase tracking-wider">Profissional Responsável</span>
                            <h5 className="font-semibold text-forest text-sm leading-tight mt-0.5">{matchedProf.name}</h5>
                            <p className="text-xs text-forest/70 font-mono mt-1">
                              {matchedProf.especialidade || 'Psicólogo Clínico'} {matchedProf.crp ? ` • CRP: ${matchedProf.crp}` : ''}
                            </p>
                          </div>
                        </div>
                        
                        {matchedProf.biografia && (
                          <div className="bg-warm/50 p-3 rounded-xl text-xs text-forest/70/80 leading-relaxed italic mb-4 line-clamp-3">
                            "{matchedProf.biografia}"
                          </div>
                        )}
                        
                        <div className="flex flex-col gap-2 mt-4">
                          <div className="flex items-center justify-between p-2.5 bg-warm rounded-xl border border-soft text-xs text-forest/70">
                            <span className="truncate max-w-[190px] font-mono select-all font-semibold">{publicLink}</span>
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
                          <span className="text-[9px] text-forest/70/50 mt-1">Envie esse link para que o paciente conheça o profissional antes da consulta.</span>
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
                     <Clock className="w-4 h-4" /> Evolução e Registros Clínicos Compartilhados
                   </h4>
                   <textarea 
                     className="w-full text-sm bg-warm/50 border border-soft px-4 py-3 rounded-2xl focus:outline-none focus:border-sun-dark resize-none h-32"
                     placeholder="Anotações sobre evolução do paciente, encaminhamentos..."
                     value={selectedCard.registrosDeReunioes || ''}
                     onChange={(e) => handleUpdateAcolhimentoProperty(selectedCard.id, 'registrosDeReunioes', e.target.value)}
                   />
                </section>
  
                <section>
                   <h4 className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-3 flex items-center gap-2">
                     <Info className="w-4 h-4" /> Alertas Clínicos ou Administrativos
                   </h4>
                   <textarea 
                     className="w-full text-sm bg-red-50/50 border border-red-100 px-4 py-3 rounded-2xl focus:outline-none focus:border-red-300 resize-none h-24 text-red-900 placeholder:text-red-900/50"
                     placeholder="Ex: Risco de abandono, pendência de documentação..."
                     value={selectedCard.notificacao || ''}
                     onChange={(e) => handleUpdateAcolhimentoProperty(selectedCard.id, 'notificacao', e.target.value)}
                   />
                </section>
              </div>

            </div>
            <div className="p-6 border-t border-soft bg-warm flex justify-end">
               <button onClick={() => setSelectedCard(null)} className="px-6 py-2 bg-sun-dark text-forest rounded-full text-sm font-semibold hover:bg-sun-dark-dark transition-colors">
                 Fechar Ficha
               </button>
            </div>
          </div>
        </div>
      )}
      {/* Notificar Modal */}
      {showNotificarModal && notificarTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-forest/20 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-soft overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 flex justify-between items-center border-b border-soft bg-warm/50">
              <h3 className="font-serif text-xl text-forest">
                Notificar {notificarTarget.nome || ('nomeEmpresa' in notificarTarget ? notificarTarget.nomeEmpresa : notificarTarget.name)}
              </h3>
              <button onClick={() => setShowNotificarModal(false)} className="p-2 text-forest/70 hover:text-red-500 rounded-full hover:bg-white transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">Modelos de Mensagem</label>
                <select 
                  className="w-full text-sm bg-warm/50 border border-soft px-4 py-2.5 rounded-xl focus:outline-none focus:border-sun-dark"
                  value={notificacaoType}
                  onChange={(e) => {
                    const selected = templates.find(t => t.id === e.target.value);
                    if (selected) {
                      setNotificacaoType(selected.id);
                      setNotificacaoName(selected.name);
                      setNotificacaoMsg(selected.msg);
                    }
                  }}
                >
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-forest/70 block">Assunto / Título do Modelo</label>
                  <label className="flex items-center gap-1 text-xs text-forest/80 cursor-pointer">
                    <input type="checkbox" className="accent-sun-dark h-3 w-3" checked={isEditingTemplate} onChange={(e) => setIsEditingTemplate(e.target.checked)} />
                    Editar Modelo Atual
                  </label>
                </div>
                <input 
                  type="text"
                  value={notificacaoName}
                  onChange={(e) => setNotificacaoName(e.target.value)}
                  readOnly={!isEditingTemplate}
                  className={`w-full text-sm border px-4 py-2 rounded-xl focus:outline-none mb-3 ${isEditingTemplate ? 'bg-white border-sun-dark' : 'bg-warm/50 border-soft'}`}
                />
                
                <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">Mensagem</label>
                <textarea 
                  value={notificacaoMsg}
                  onChange={(e) => setNotificacaoMsg(e.target.value)}
                  readOnly={!isEditingTemplate}
                  className={`w-full text-sm border px-4 py-3 rounded-2xl focus:outline-none resize-none h-32 ${isEditingTemplate ? 'bg-white border-sun-dark' : 'bg-warm/50 border-soft'}`}
                />
                
                {isEditingTemplate && (
                  <button 
                    onClick={() => {
                      setTemplates(templates.map(t => t.id === notificacaoType ? { ...t, name: notificacaoName, msg: notificacaoMsg } : t));
                      setIsEditingTemplate(false);
                      alert('Modelo atualizado com sucesso!');
                    }}
                    className="mt-2 text-xs font-semibold px-4 py-1.5 bg-sun-dark text-forest rounded-lg hover:bg-sun-dark-dark transition-colors"
                  >
                    Salvar Alterações no Modelo
                  </button>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-soft bg-warm flex justify-end gap-3">
              <button onClick={() => setShowNotificarModal(false)} className="px-5 py-2 text-forest font-semibold text-sm hover:underline">
                Cancelar
              </button>
              <button 
                onClick={() => { 
                  window.open(`mailto:${notificarTarget.email}?subject=${encodeURIComponent(notificacaoName)}&body=${encodeURIComponent(notificacaoMsg)}`);
                  setShowNotificarModal(false); 
                }} 
                className="px-5 py-2 bg-white border border-soft text-forest rounded-full text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2">
                <Mail className="w-4 h-4" /> Enviar por E-mail
              </button>
              <button 
                onClick={() => { 
                  window.open(`https://wa.me/?text=${encodeURIComponent(notificacaoMsg)}`, '_blank'); 
                  setShowNotificarModal(false); 
                }} 
                className="px-5 py-2 bg-[#25D366] text-white rounded-full text-sm font-semibold hover:bg-[#20b858] transition-colors flex items-center gap-2">
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
              <h3 className="font-serif text-xl text-forest">Editar Contrato: {notificarTarget.nome || ('nomeEmpresa' in notificarTarget ? notificarTarget.nomeEmpresa : notificarTarget.name)}</h3>
              <button onClick={() => setShowContratoModal(false)} className="p-2 text-forest/70 hover:text-red-500 rounded-full hover:bg-white transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">Modelo de Contrato (Editável)</label>
              <textarea 
                value={contratoText}
                onChange={(e) => setContratoText(e.target.value)}
                className="w-full text-sm bg-white border border-soft px-4 py-4 rounded-2xl focus:outline-none focus:border-sun-dark resize-none min-h-[400px]"
              />
            </div>
            <div className="p-6 border-t border-soft bg-warm flex justify-end gap-3">
              <button onClick={() => setShowContratoModal(false)} className="px-5 py-2 text-forest font-semibold text-sm hover:underline">
                Cancelar
              </button>
              <button 
                onClick={() => { 
                  alert('Contrato atualizado para o paciente!'); 
                  setShowContratoModal(false); 
                }} 
                className="px-5 py-2 bg-sun-dark text-forest rounded-full text-sm font-semibold hover:bg-sun-dark-dark transition-colors flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Salvar Contrato
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Histórico Financeiro Modal */}
      {showFinanceiroModal && selectedCard && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-forest/20 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-soft overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 flex justify-between items-center border-b border-soft">
              <h3 className="font-serif text-2xl text-forest">Histórico: {selectedCard.nome}</h3>
              <button onClick={() => setShowFinanceiroModal(false)} className="p-2 text-forest/70 hover:text-red-500 rounded-full hover:bg-warm transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 border-b border-soft flex flex-wrap items-center gap-4 bg-warm/30">
               <div>
                  <h4 className="font-semibold text-forest mb-2">Histórico de Serviços e Financeiro</h4>
                  <div className="flex flex-wrap items-center gap-2">
                    <button className="px-4 py-1.5 bg-forest text-white text-sm rounded-lg font-semibold">Todas</button>
                    <button className="px-4 py-1.5 bg-white border border-emerald-400 text-emerald-600 text-sm rounded-lg font-semibold">Pagas</button>
                    <button className="px-4 py-1.5 bg-white border border-amber-400 text-amber-500 text-sm rounded-lg font-semibold">Pendentes</button>
                  </div>
               </div>
               
               <div className="flex items-center gap-2 ml-4 self-end">
                 <select className="px-3 py-1.5 bg-white border border-soft text-forest text-sm rounded-lg focus:outline-none">
                    <option>Mês: Todos</option>
                 </select>
                 <select className="px-3 py-1.5 bg-white border border-soft text-forest text-sm rounded-lg focus:outline-none">
                    <option>Ano: Todos</option>
                 </select>
               </div>
               
               <div className="flex-1"></div>
               <div className="flex flex-wrap gap-2 self-end">
                  <button className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors">
                    <CheckCircle2 className="w-4 h-4" /> Duplicar Anterior
                  </button>
                  <button className="flex items-center gap-2 bg-sun-dark hover:bg-sun-dark-dark text-forest px-4 py-2 rounded-lg font-semibold text-sm transition-colors">
                    <History className="w-4 h-4" /> Novo Serviço
                  </button>
               </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-white p-6">
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="border-b border-soft bg-warm/20">
                       <th className="py-3 px-4 font-bold text-forest/80 text-sm">Detalhes do Serviço</th>
                       <th className="py-3 px-4 font-bold text-forest/80 text-sm">Data</th>
                       <th className="py-3 px-4 font-bold text-forest/80 text-sm">Valores / Status</th>
                       <th className="py-3 px-4 font-bold text-forest/80 text-sm">Anotações</th>
                       <th className="py-3 px-4 font-bold text-forest/80 text-sm">Ação</th>
                     </tr>
                   </thead>
                   <tbody>
                     <tr className="border-b border-soft/50 hover:bg-warm/10 transition-colors">
                       <td className="py-4 px-4 align-top">
                         <div className="font-semibold text-forest text-sm">Terapia Individual</div>
                         <div className="flex gap-2 mt-2">
                           <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase">ON LINE</span>
                           <span className="text-[10px] font-bold border border-sun-dark text-sun-dark-dark px-2 py-0.5 rounded uppercase bg-sun/10">ELO</span>
                         </div>
                       </td>
                       <td className="py-4 px-4 align-top">
                         <div className="text-sm font-medium text-forest">14/05/2026</div>
                         <div className="text-xs text-forest/60 mt-1">1 Hora</div>
                       </td>
                       <td className="py-4 px-4 align-top space-y-2">
                         <div className="text-sm font-semibold text-forest">R$ 165,00</div>
                         <div className="flex gap-2">
                           <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded uppercase">PAGO</span>
                           <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">NF Pend.</span>
                         </div>
                       </td>
                       <td className="py-4 px-4 align-top">
                         <div className="text-sm text-forest/70">-</div>
                       </td>
                       <td className="py-4 px-4 align-top">
                         <button className="text-forest/50 hover:text-forest transition-colors p-1">
                           <Edit3 className="w-4 h-4" />
                         </button>
                       </td>
                     </tr>
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        </div>
      )}




      {/* Empresa Details Modal */}
      {selectedEmpresa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-forest/20 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-soft overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-soft bg-warm/50 gap-2">
              <div className="flex flex-col">
                <h3 className="font-serif text-2xl text-forest">Ficha de Bordo</h3>
                <span className="text-sm font-semibold uppercase tracking-wider text-forest/60">{selectedEmpresa.nomeEmpresa}</span>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-[11px] uppercase tracking-wider font-semibold text-forest/50 mt-1">
                   {selectedEmpresa.createdAt && <span>Entrada: {formatDate(selectedEmpresa.createdAt)}</span>}
                </div>
              </div>
              <button onClick={() => setSelectedEmpresa(null)} className="p-2 text-forest/70 hover:text-red-500 rounded-full hover:bg-white transition-colors self-end sm:self-auto">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            {/* Action Bar */}
            <div className="flex flex-wrap items-center gap-4 py-3 px-6 bg-white border-b border-soft">
              <button 
                onClick={() => {
                   setNotificacaoType('pagamento');
                   setNotificacaoMsg(`Olá ${selectedEmpresa.nomeContato}! Gostaríamos de conversar sobre o escopo de atuação...`);
                   setShowNotificarModal(true);
                }}
                className="flex items-center gap-2 text-emerald-600 font-semibold text-sm hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors">
                <Send className="w-4 h-4" /> Notificar
              </button>
              <button 
                onClick={() => handleUpdateEmpresaProperty(selectedEmpresa.id, 'ativo', selectedEmpresa.ativo === false ? true : false)}
                className={`flex items-center gap-2 ${selectedEmpresa.ativo === false ? 'text-slate-500 hover:bg-slate-50' : 'text-red-500 hover:bg-red-50'} font-semibold text-sm px-3 py-1.5 rounded-lg transition-colors`}>
                <Trash2 className="w-4 h-4" /> {selectedEmpresa.ativo === false ? 'Ativar' : 'Inativar'}
              </button>
              
              <div className="flex items-center gap-4 ml-4">
                <button 
                  onClick={() => {
                    const link = `https://forms.gle/exemplo_empresa`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(`Olá! Por favor, preencha a ficha complementar de cadastro empresarial no link a seguir: ${link}`)}`, '_blank');
                  }}
                  className="text-xs text-forest underline hover:text-sun-dark transition-colors"
                >
                  Ficha Complementar
                </button>
                <div className="w-px h-4 bg-soft"></div>
                <button 
                  onClick={() => {
                    setContratoText(`CONTRATO DE PRESTAÇÃO DE SERVIÇOS TIPO CORPORATIVO\n\nCONTRATANTE: ${selectedEmpresa.nomeEmpresa}, sob o CNPJ [INSERIR CNPJ], através de seu responsável ${selectedEmpresa.nomeContato}.\n\nCONTRATADA: Elo Soluções Humanas...\n\n(Edite as cláusulas abaixo)`);
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
                   <Briefcase className="w-4 h-4" /> Status Contratual e Comercial
                 </h4>
                 <div className="space-y-4">
                   <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-soft">
                     <input 
                       type="checkbox" 
                       id="contrato"
                       checked={selectedEmpresa.contratoAssinado || false}
                       onChange={(e) => handleUpdateEmpresaProperty(selectedEmpresa.id, 'contratoAssinado', e.target.checked)}
                       className="w-5 h-5 accent-sun-dark cursor-pointer rounded"
                     />
                     <label htmlFor="contrato" className="text-sm font-medium text-forest cursor-pointer">Contrato Final Assinado</label>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="flex flex-col gap-1">
                       <label className="text-[10px] font-semibold uppercase text-forest/70/60 ml-2">Valores Acertados</label>
                       <input 
                         className="text-sm bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark"
                         placeholder="Ex: Ref. R$ 5k/mês"
                         value={selectedEmpresa.valoresAcertados || ''}
                         onChange={(e) => handleUpdateEmpresaProperty(selectedEmpresa.id, 'valoresAcertados', e.target.value)}
                       />
                     </div>
                     <div className="flex flex-col gap-1">
                       <label className="text-[10px] font-semibold uppercase text-forest/70/60 ml-2">Emissão de NF (Data/Modo)</label>
                       <input 
                         className="text-sm bg-white border border-soft px-4 py-2 rounded-xl focus:outline-none focus:border-sun-dark"
                         placeholder="Ex: Todo dia 05"
                         value={selectedEmpresa.emissaoNf || ''}
                         onChange={(e) => handleUpdateEmpresaProperty(selectedEmpresa.id, 'emissaoNf', e.target.value)}
                       />
                     </div>
                   </div>
                 </div>
              </section>

              <section>
                 <h4 className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-3 flex items-center gap-2">
                   <CheckCircle2 className="w-4 h-4" /> Serviços Oferecidos
                 </h4>
                 <textarea 
                   className="w-full text-sm bg-warm/50 border border-soft px-4 py-3 rounded-2xl focus:outline-none focus:border-sun-dark resize-none h-24"
                   placeholder="Liste os serviços, convênios ou palestras acordadas..."
                   value={selectedEmpresa.servicosOferecidos || ''}
                   onChange={(e) => handleUpdateEmpresaProperty(selectedEmpresa.id, 'servicosOferecidos', e.target.value)}
                 />
              </section>
              
              <section>
                 <h4 className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-3 flex items-center gap-2">
                   <Clock className="w-4 h-4" /> Registros de Reuniões e Contatos
                 </h4>
                 <textarea 
                   className="w-full text-sm bg-warm/50 border border-soft px-4 py-3 rounded-2xl focus:outline-none focus:border-sun-dark resize-none h-32"
                   placeholder="Reunião 10/10: Empresa gostou da proposta..."
                   value={selectedEmpresa.registrosDeReunioes || ''}
                   onChange={(e) => handleUpdateEmpresaProperty(selectedEmpresa.id, 'registrosDeReunioes', e.target.value)}
                 />
              </section>

              <section>
                 <h4 className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-3 flex items-center gap-2">
                   <Info className="w-4 h-4" /> Alertas / Notificações Internas
                 </h4>
                 <textarea 
                   className="w-full text-sm bg-red-50/50 border border-red-100 px-4 py-3 rounded-2xl focus:outline-none focus:border-red-300 resize-none h-24 text-red-900 placeholder:text-red-900/50"
                   placeholder="Ex: Cobrar assinatura do aditivo até sexta."
                   value={selectedEmpresa.notificacao || ''}
                   onChange={(e) => handleUpdateEmpresaProperty(selectedEmpresa.id, 'notificacao', e.target.value)}
                 />
              </section>
              
            </div>
            
            <div className="p-6 border-t border-soft bg-warm flex justify-end">
               <button onClick={() => setSelectedEmpresa(null)} className="px-6 py-2 bg-sun-dark text-forest rounded-full text-sm font-semibold hover:bg-sun-dark-dark transition-colors">
                 Fechar Ficha
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Profissional Details Modal */}
      {selectedProfissional && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-forest/20 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-soft overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-soft bg-warm/50 gap-2">
              <div className="flex flex-col">
                <h3 className="font-serif text-2xl text-forest">Ficha de Bordo (Psicólogo)</h3>
                <span className="text-sm font-semibold uppercase tracking-wider text-forest/60">
                   {('nome' in selectedProfissional ? selectedProfissional.nome : selectedProfissional.name) || "Profissional"}
                </span>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-[11px] uppercase tracking-wider font-semibold text-forest/50 mt-1">
                   {selectedProfissional.createdAt && <span>Entrada: {formatDate(selectedProfissional.createdAt)}</span>}
                   {('statusUpdatedAt' in selectedProfissional && selectedProfissional.statusUpdatedAt) && <span>Status: {formatDate(selectedProfissional.statusUpdatedAt)}</span>}
                </div>
              </div>
              <button onClick={() => setSelectedProfissional(null)} className="p-2 text-forest/70 hover:text-red-500 rounded-full hover:bg-white transition-colors self-end sm:self-auto">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            {/* Action Bar */}
            <div className="flex flex-wrap items-center gap-4 py-3 px-6 bg-white border-b border-soft">
              <button 
                onClick={() => {
                   setNotificacaoType('lembrete');
                   setNotificacaoMsg(`Olá ${'nome' in selectedProfissional ? selectedProfissional.nome : selectedProfissional.name}! Estamos entrando em contato para...`);
                   setShowNotificarModal(true);
                }}
                className="flex items-center gap-2 text-emerald-600 font-semibold text-sm hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors">
                <Send className="w-4 h-4" /> Notificar
              </button>
              <button 
                onClick={() => handleUpdateProfissionalProperty('id' in selectedProfissional ? selectedProfissional.id : selectedProfissional.uid, 'ativo', selectedProfissional.ativo === false ? true : false)}
                className={`flex items-center gap-2 ${selectedProfissional.ativo === false ? 'text-slate-500 hover:bg-slate-50' : 'text-red-500 hover:bg-red-50'} font-semibold text-sm px-3 py-1.5 rounded-lg transition-colors`}>
                <Trash2 className="w-4 h-4" /> {selectedProfissional.ativo === false ? 'Ativar' : 'Inativar'}
              </button>
              
              <div className="flex items-center gap-4 ml-4">
                <button 
                  onClick={() => setIsEditingCard(!isEditingCard)}
                  className="flex items-center gap-2 text-amber-500 font-semibold text-sm hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-colors">
                  <Edit3 className="w-4 h-4" /> {isEditingCard ? 'Salvar Edição' : 'Editar'}
                </button>
                <div className="w-px h-4 bg-soft"></div>
                <button 
                  onClick={() => {
                    const profName = 'nome' in selectedProfissional ? selectedProfissional.nome : selectedProfissional.name;
                    setContratoText(`CONTRATO DE PARCERIA E PRESTAÇÃO DE SERVIÇOS PSICOLÓGICOS\n\nCONTRATANTE: Elo Soluções Humanas...\n\nCONTRATADO(A): ${profName}, portador(a) do CRP/Conselho e email ${selectedProfissional.email}.\n\n(Edite as cláusulas abaixo)`);
                    setShowContratoModal(true);
                  }}
                  className="text-xs text-forest underline hover:text-sun-dark transition-colors"
                >
                  Editar Contrato
                </button>
                <div className="w-px h-4 bg-soft"></div>
                <button 
                  onClick={() => {
                    const profId = 'id' in selectedProfissional ? selectedProfissional.id : selectedProfissional.uid;
                    const link = `${window.location.origin}/?prof=${profId}`;
                    window.open(link, '_blank');
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
                      <EditableField label="Nome" value={'nome' in selectedProfissional ? selectedProfissional.nome : selectedProfissional.name} field={'nome' in selectedProfissional ? 'nome' : 'name'} onChange={(f, v) => handleUpdateProfissionalProperty('id' in selectedProfissional ? selectedProfissional.id : selectedProfissional.uid, f, v)} isEditing={isEditingCard} />
                      <EditableField label="Telefone / WhatsApp" value={selectedProfissional.telefone} field="telefone" onChange={(f, v) => handleUpdateProfissionalProperty('id' in selectedProfissional ? selectedProfissional.id : selectedProfissional.uid, f, v)} isEditing={isEditingCard} />
                      <EditableField label="E-mail" value={selectedProfissional.email} field="email" onChange={(f, v) => handleUpdateProfissionalProperty('id' in selectedProfissional ? selectedProfissional.id : selectedProfissional.uid, f, v)} isEditing={isEditingCard} />
                      <EditableField label="Cidade" value={selectedProfissional.cidade} field="cidade" onChange={(f, v) => handleUpdateProfissionalProperty('id' in selectedProfissional ? selectedProfissional.id : selectedProfissional.uid, f, v)} isEditing={isEditingCard} />
                      <EditableField label="Estado / UF" value={selectedProfissional.uf} field="uf" onChange={(f, v) => handleUpdateProfissionalProperty('id' in selectedProfissional ? selectedProfissional.id : selectedProfissional.uid, f, v)} isEditing={isEditingCard} />
                      <EditableField label="Motivação" value={selectedProfissional.motivacao} field="motivacao" onChange={(f, v) => handleUpdateProfissionalProperty('id' in selectedProfissional ? selectedProfissional.id : selectedProfissional.uid, f, v)} isEditing={isEditingCard} />
                      <EditableField label="Frase Curta (Bio tipo Instagram)" value={selectedProfissional.bioCurta} field="bioCurta" onChange={(f, v) => handleUpdateProfissionalProperty('id' in selectedProfissional ? selectedProfissional.id : selectedProfissional.uid, f, v)} isEditing={isEditingCard} />
                      <EditableField label="Instagram URL" value={selectedProfissional.instagramUrl} field="instagramUrl" onChange={(f, v) => handleUpdateProfissionalProperty('id' in selectedProfissional ? selectedProfissional.id : selectedProfissional.uid, f, v)} isEditing={isEditingCard} />
                      <EditableField label="LinkedIn URL" value={selectedProfissional.linkedinUrl} field="linkedinUrl" onChange={(f, v) => handleUpdateProfissionalProperty('id' in selectedProfissional ? selectedProfissional.id : selectedProfissional.uid, f, v)} isEditing={isEditingCard} />
                      <EditableField label="Site ou Portfólio URL" value={selectedProfissional.siteUrl} field="siteUrl" onChange={(f, v) => handleUpdateProfissionalProperty('id' in selectedProfissional ? selectedProfissional.id : selectedProfissional.uid, f, v)} isEditing={isEditingCard} />
                    </div>
                  </section>
                </div>
                
                <div className="space-y-6">
                  <section>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-3 flex items-center gap-2">
                      <Briefcase className="w-4 h-4" /> Atuação e Formação
                    </h4>
                    <div className="space-y-3 ms-2">
                      <EditableField label="CRP / Registro" value={selectedProfissional.crp} field="crp" onChange={(f, v) => handleUpdateProfissionalProperty('id' in selectedProfissional ? selectedProfissional.id : selectedProfissional.uid, f, v)} isEditing={isEditingCard} />
                      <EditableField label="Horas Disponíveis" value={selectedProfissional.horasDisponiveis} field="horasDisponiveis" onChange={(f, v) => handleUpdateProfissionalProperty('id' in selectedProfissional ? selectedProfissional.id : selectedProfissional.uid, f, v)} isEditing={isEditingCard} />
                      <EditableField label="Abordagens Psicológicas" value={selectedProfissional.abordagem} field="abordagem" onChange={(f, v) => handleUpdateProfissionalProperty('id' in selectedProfissional ? selectedProfissional.id : selectedProfissional.uid, f, v)} isEditing={isEditingCard} />
                      <EditableField label="Especialidade / Pós-graduação" value={selectedProfissional.especialidade} field="especialidade" onChange={(f, v) => handleUpdateProfissionalProperty('id' in selectedProfissional ? selectedProfissional.id : selectedProfissional.uid, f, v)} isEditing={isEditingCard} />
                      <EditableField label="Ano de formação / graduação" value={selectedProfissional.anoFormacao} field="anoFormacao" onChange={(f, v) => handleUpdateProfissionalProperty('id' in selectedProfissional ? selectedProfissional.id : selectedProfissional.uid, f, v)} isEditing={isEditingCard} />
                      
                      <div className="pt-2">
                        <span className="block text-[10px] font-semibold uppercase text-forest/70/60 content-start">Experiência com Atendimento Clínico</span>
                        {isEditingCard ? (
                            <input 
                              title="Separado por vírgula"
                              value={selectedProfissional.publicosExperiencia?.join(', ') || ''}
                              onChange={(e) => handleUpdateProfissionalProperty('id' in selectedProfissional ? selectedProfissional.id : selectedProfissional.uid, 'publicosExperiencia', e.target.value.split(',').map(s => s.trim()))}
                              className="text-sm font-medium text-forest border-b border-sun-dark focus:outline-none bg-transparent w-full mt-1"
                            />
                        ) : (
                          <span className="text-sm font-medium text-forest">{selectedProfissional.publicosExperiencia?.join(', ') || '-'} {selectedProfissional.outrosPublicosExperiencia ? `(Outros: ${selectedProfissional.outrosPublicosExperiencia})` : ''}</span>
                        )}
                      </div>
                      
                      <div className="pt-2">
                        <span className="block text-[10px] font-semibold uppercase text-forest/70/60 content-start">Gosto de Atender</span>
                        {isEditingCard ? (
                          <input 
                            title="Separado por vírgula"
                            value={selectedProfissional.publicosGosto?.join(', ') || ''}
                            onChange={(e) => handleUpdateProfissionalProperty('id' in selectedProfissional ? selectedProfissional.id : selectedProfissional.uid, 'publicosGosto', e.target.value.split(',').map(s => s.trim()))}
                            className="text-sm font-medium text-forest border-b border-sun-dark focus:outline-none bg-transparent w-full mt-1"
                          />
                        ) : (
                          <span className="text-sm font-medium text-forest">{selectedProfissional.publicosGosto?.join(', ') || '-'} {selectedProfissional.outrosPublicosGosto ? `(Outros: ${selectedProfissional.outrosPublicosGosto})` : ''}</span>
                        )}
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              <section>
                 <h4 className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-3 flex items-center gap-2">
                   <Clock className="w-4 h-4" /> Registros de Reuniões e Contatos
                 </h4>
                 <textarea 
                   className="w-full text-sm bg-warm/50 border border-soft px-4 py-3 rounded-2xl focus:outline-none focus:border-sun-dark resize-none h-32"
                   placeholder="Anotações de entrevistas, alinhamentos, feedback..."
                   value={selectedProfissional.registrosDeReunioes || ''}
                   onChange={(e) => handleUpdateProfissionalProperty('id' in selectedProfissional ? selectedProfissional.id : selectedProfissional.uid, 'registrosDeReunioes', e.target.value)}
                 />
              </section>

              <section>
                 <h4 className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-3 flex items-center gap-2">
                   <Info className="w-4 h-4" /> Alertas / Notificações Internas
                 </h4>
                 <textarea 
                   className="w-full text-sm bg-red-50/50 border border-red-100 px-4 py-3 rounded-2xl focus:outline-none focus:border-red-300 resize-none h-24 text-red-900 placeholder:text-red-900/50"
                   placeholder="Ex: Verificar CRP, documentação incompleta..."
                   value={selectedProfissional.notificacao || ''}
                   onChange={(e) => handleUpdateProfissionalProperty('id' in selectedProfissional ? selectedProfissional.id : selectedProfissional.uid, 'notificacao', e.target.value)}
                 />
              </section>
            </div>
            
            <div className="p-6 border-t border-soft bg-warm flex justify-end">
               <button onClick={() => setSelectedProfissional(null)} className="px-6 py-2 bg-sun-dark text-forest rounded-full text-sm font-semibold hover:bg-sun-dark-dark transition-colors">
                 Fechar Ficha
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Novo Profissional Modal */}
      {showNewProfissionalModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 bg-forest/20 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-soft overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 flex justify-between items-center border-b border-soft bg-warm/50">
              <h3 className="font-serif text-xl text-forest">Nova Conta de Profissional</h3>
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
                <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">Nome Completo</label>
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
                <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">E-mail</label>
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
                <label htmlFor="googleLoginCheck" className="text-sm font-semibold text-forest">
                  Utilizar conta Google (Login via Gmail)
                </label>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">Nível de Acesso (Papel)</label>
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
                  <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">Senha Provisória</label>
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
              className="w-full px-4 py-3 bg-forest text-white rounded-xl font-bold uppercase tracking-wider text-sm hover:bg-forest/90 transition-colors"
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
            <p className="text-forest/70 text-sm mb-8">{confirmConfig.message}</p>
            <div className="flex w-full gap-3">
              <button 
                onClick={() => setConfirmConfig(null)}
                className="flex-1 px-4 py-3 bg-warm text-forest rounded-xl font-semibold text-sm hover:bg-warm-dark transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  confirmConfig.onConfirm();
                  setConfirmConfig(null);
                }}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-semibold text-sm hover:bg-red-600 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
