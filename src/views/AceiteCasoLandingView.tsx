import React, { useState, useEffect } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import {
  CheckCircle2,
  Lock,
  ShieldCheck,
  RotateCcw,
  Phone,
  Mail,
  ArrowRight,
  LogOut,
  AlertCircle,
  Copy,
  Check,
  Calendar,
  FileText,
  UserCheck,
  Eye,
} from "lucide-react";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { BrandLogo } from "../components/BrandLogo";

interface AceiteCasoLandingViewProps {
  casoId: string;
  onGoHome: () => void;
  onOpenInDashboard: (cardId: string) => void;
}

function computePatientAgeLabel(card: any): string {
  if (!card) return "Não informada";
  if (card.idade) {
    const raw = String(card.idade).trim();
    return raw.toLowerCase().includes("ano") ? raw : `${raw} anos`;
  }
  if (card.dataNascimento) {
    try {
      let dob: Date;
      if (String(card.dataNascimento).includes("/")) {
        const p = String(card.dataNascimento).split("/");
        dob = new Date(parseInt(p[2], 10), parseInt(p[1], 10) - 1, parseInt(p[0], 10));
      } else {
        dob = new Date(card.dataNascimento);
      }
      if (!isNaN(dob.getTime())) {
        const diff = Date.now() - dob.getTime();
        const ageDate = new Date(diff);
        return `${Math.abs(ageDate.getUTCFullYear() - 1970)} anos`;
      }
    } catch {
      return String(card.dataNascimento);
    }
  }
  return "Não informada";
}

function formatDateTimePtBr(val: any): string {
  if (!val) return "-";
  try {
    const d =
      typeof val?.toDate === "function"
        ? val.toDate()
        : val instanceof Date
          ? val
          : new Date(val);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

export function AceiteCasoLandingView({
  casoId,
  onGoHome,
  onOpenInDashboard,
}: AceiteCasoLandingViewProps) {
  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [userProfile, setUserProfile] = useState<any | null>(null);

  // Auth form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");

  // Case data states
  const [loadingCase, setLoadingCase] = useState(true);
  const [card, setCard] = useState<any | null>(null);
  const [assignedProfProfile, setAssignedProfProfile] = useState<any | null>(null);
  const [loadError, setLoadError] = useState("");

  // Decision states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [decisionError, setDecisionError] = useState("");
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [motivoDevolucao, setMotivoDevolucao] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedContact, setCopiedContact] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  const isPlaceholderUserDoc = (docId: string, data?: any): boolean => {
    return (
      docId.startsWith("pre_") ||
      docId.startsWith("separado_") ||
      Boolean(data?.preRegistered) ||
      Boolean(data?.contaSeparada)
    );
  };

  const SEPARATED_EMAILS_ALLOWLIST = new Set([
    "marciopsi@elosolucoeshumanas.com",
    "msr.rocha@gmail.com",
  ]);

  const resolveOrRecoverSeparatedProfile = async (
    uid: string,
    loginEmailRaw: string,
    displayName?: string | null,
    isGoogle = false
  ): Promise<{ profile: any | null; error?: string }> => {
    const normalizedEmail = (loginEmailRaw || "").toLowerCase().trim();
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const d = snap.data();
      if (d.role === "profissional" && d.ativo === false) {
        return {
          profile: null,
          error: "Sua conta está inativa. Entre em contato com a coordenação.",
        };
      }
      return { profile: { uid, ...d } };
    }

    if (!normalizedEmail) {
      return {
        profile: null,
        error: "Não foi possível identificar o e-mail de autenticação.",
      };
    }

    const emailQuery = query(
      collection(db, "users"),
      where("email", "==", normalizedEmail)
    );
    const emailSnap = await getDocs(emailQuery);
    const placeholderDoc = emailSnap.docs.find((d) =>
      isPlaceholderUserDoc(d.id, d.data())
    );

    if (placeholderDoc) {
      const preData = placeholderDoc.data();
      if (preData.role === "profissional" && preData.ativo === false) {
        return {
          profile: null,
          error: "Sua conta está inativa. Entre em contato com a coordenação.",
        };
      }
      const intendedRoles = Array.isArray(preData.roles)
        ? preData.roles
        : preData.role
          ? [preData.role]
          : ["profissional"];
      const needsMasterPromotion = intendedRoles.some((r: string) => r !== "profissional");

      const migrated: Record<string, any> = {
        ...preData,
        email: normalizedEmail,
        name: preData.name || displayName || "Profissional",
        role: "profissional",
        roles: ["profissional"],
        preRegistered: false,
        contaSeparada: false,
        ...(isGoogle ? { googleLinked: true } : {}),
        ...(needsMasterPromotion ? { rolesPendentesRestauracao: intendedRoles } : {}),
        updatedAt: serverTimestamp(),
      };
      await setDoc(userRef, migrated);
      if (placeholderDoc.id !== uid) {
        try {
          await deleteDoc(doc(db, "users", placeholderDoc.id));
        } catch {
          // Limpeza final será concluída pela sessão de Gestão se necessário
        }
      }
      return { profile: { uid, ...migrated } };
    }

    if (SEPARATED_EMAILS_ALLOWLIST.has(normalizedEmail)) {
      const defaultName =
        displayName ||
        (normalizedEmail === "marciopsi@elosolucoeshumanas.com"
          ? "Márcio Rocha (Gestão)"
          : "Márcio Rocha");
      const freshSeparated: Record<string, any> = {
        name: defaultName,
        email: normalizedEmail,
        role: "profissional",
        roles: ["profissional"],
        ativo: true,
        googleLinked: isGoogle,
        separadoDeConflito: true,
        modalidadeCredencial: "cortesia_plena",
        isentoCobranca: true,
        ...(normalizedEmail === "marciopsi@elosolucoeshumanas.com"
          ? { rolesPendentesRestauracao: ["master", "profissional"] }
          : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(userRef, freshSeparated);
      return { profile: { uid, ...freshSeparated } };
    }

    if (!emailSnap.empty) {
      return {
        profile: null,
        error: `O e-mail (${normalizedEmail}) já está associado a outro identificador (UID) na plataforma. Acesse pelo método original dessa conta ou utilize a separação de contas no painel.`,
      };
    }

    return {
      profile: null,
      error: `O e-mail (${normalizedEmail}) não possui cadastro ativo na plataforma. Acesse com o e-mail credenciado pela coordenação.`,
    };
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setAuthUser(u);
      if (u) {
        try {
          const googleProvEmail = u.providerData.find(
            (p) => p.providerId === "google.com"
          )?.email;
          const resolved = await resolveOrRecoverSeparatedProfile(
            u.uid,
            u.email || googleProvEmail || "",
            u.displayName,
            Boolean(googleProvEmail)
          );
          setUserProfile(resolved.profile);
        } catch (err) {
          console.error("Erro ao carregar perfil autenticado:", err);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !authUser) {
      setLoadingCase(false);
      return;
    }

    let cancelled = false;
    const loadCaseDetails = async () => {
      setLoadingCase(true);
      setLoadError("");
      try {
        const snap = await getDoc(doc(db, "acolhimentos", casoId));
        if (!snap.exists()) {
          if (!cancelled) {
            setCard(null);
            setAssignedProfProfile(null);
          }
          return;
        }

        const rawCard: any = { id: snap.id, ...snap.data() };
        let profDocData: any = null;

        if (rawCard.profissionalId) {
          try {
            const profSnap = await getDoc(doc(db, "users", rawCard.profissionalId));
            if (profSnap.exists()) {
              profDocData = { uid: profSnap.id, ...profSnap.data() };
            }
          } catch (e) {
            console.warn("Aviso ao consultar profissional vinculado:", e);
          }
        }

        // Sincroniza UID apenas quando o card apontava para um ID provisório (pré-cadastrado), nunca sobrescrevendo outro UID real
        const authEmailNorm = (authUser.email || "").toLowerCase().trim();
        const assignedEmailNorm = (profDocData?.email || "").toLowerCase().trim();
        if (
          rawCard.profissionalId &&
          rawCard.profissionalId !== authUser.uid &&
          isPlaceholderUserDoc(rawCard.profissionalId, profDocData) &&
          authEmailNorm &&
          assignedEmailNorm &&
          authEmailNorm === assignedEmailNorm
        ) {
          try {
            await updateDoc(doc(db, "acolhimentos", casoId), {
              profissionalId: authUser.uid,
              updatedAt: serverTimestamp(),
            });
            rawCard.profissionalId = authUser.uid;
          } catch (syncErr) {
            console.warn("Não foi possível sincronizar UID migrado no card:", syncErr);
          }
        }

        if (!cancelled) {
          setCard(rawCard);
          setAssignedProfProfile(profDocData);
        }
      } catch (err) {
        console.error("Erro ao carregar resumo do caso:", err);
        if (!cancelled) {
          setLoadError("Não foi possível carregar os dados deste encaminhamento.");
        }
      } finally {
        if (!cancelled) {
          setLoadingCase(false);
        }
      }
    };

    loadCaseDetails();
    return () => {
      cancelled = true;
    };
  }, [authReady, authUser, casoId]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setForgotMsg("");
    setAuthLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const resolved = await resolveOrRecoverSeparatedProfile(
        cred.user.uid,
        cred.user.email || email,
        cred.user.displayName,
        false
      );
      if (!resolved.profile) {
        await signOut(auth);
        setAuthError(
          resolved.error ||
            "Sua conta não possui perfil credenciado na plataforma. Entre em contato com a coordenação."
        );
        return;
      }
      setUserProfile(resolved.profile);
    } catch (err: any) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setAuthError("E-mail ou senha incorretos.");
      } else {
        setAuthError(err.message || "Erro ao autenticar com e-mail e senha.");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError("");
    setForgotMsg("");
    setAuthLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      const googleProviderEmail = result.user.providerData.find(
        (p) => p.providerId === "google.com"
      )?.email;
      const googleEmail = (googleProviderEmail || result.user.email || "")
        .toLowerCase()
        .trim();

      if (!googleEmail) {
        await signOut(auth);
        setAuthError("Não foi possível obter o e-mail da sua conta Google.");
        return;
      }

      const resolved = await resolveOrRecoverSeparatedProfile(
        result.user.uid,
        googleEmail,
        result.user.displayName,
        true
      );
      if (!resolved.profile) {
        await signOut(auth);
        setAuthError(
          resolved.error ||
            `O e-mail (${googleEmail}) não possui cadastro na plataforma. Acesse com o e-mail credenciado pela coordenação.`
        );
        return;
      }
      setUserProfile(resolved.profile);
    } catch (err: any) {
      if (
        err.code === "auth/popup-closed-by-user" ||
        err.code === "auth/cancelled-popup-request"
      ) {
        // fechado pelo usuário
      } else {
        setAuthError(err.message || "Erro ao autenticar com Google.");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setAuthError("");
    setForgotMsg("");
    if (!email.trim()) {
      setAuthError("Digite seu e-mail acima para receber o link de redefinição de senha.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setForgotMsg("Link de redefinição enviado para o seu e-mail.");
    } catch (err: any) {
      setAuthError(err.message || "Não foi possível enviar o e-mail de redefinição.");
    }
  };

  const userRoles: string[] = Array.isArray(userProfile?.roles)
    ? userProfile.roles
    : userProfile?.role
      ? [userProfile.role]
      : [];
  const isMasterOrTriagem =
    userRoles.includes("master") ||
    userRoles.includes("triagem") ||
    userProfile?.role === "master" ||
    userProfile?.role === "triagem";

  const isAssignedProfessional = Boolean(
    authUser &&
      card &&
      card.profissionalId &&
      (card.profissionalId === authUser.uid ||
        (assignedProfProfile?.email &&
          authUser.email &&
          assignedProfProfile.email.toLowerCase().trim() ===
            authUser.email.toLowerCase().trim()))
  );

  const profDisplayName =
    userProfile?.name ||
    userProfile?.nome ||
    authUser?.displayName ||
    authUser?.email ||
    "Profissional";
  const profEmail = (userProfile?.email || authUser?.email || "").toLowerCase().trim();

  const handleConfirmAccept = async () => {
    if (!authUser || !card || !isAssignedProfessional) {
      setDecisionError(
        "Apenas o próprio profissional atribuído pode confirmar o aceite autenticado deste caso."
      );
      return;
    }
    setDecisionError("");
    setIsSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      const nowStr = new Date().toLocaleString("pt-BR");
      const notifAnterior = card.notificacao ? card.notificacao + "\n\n" : "";

      const aceiteAuditoria = {
        uid: authUser.uid,
        nome: profDisplayName,
        email: profEmail,
        dataIso: nowIso,
        origem: "link_direto",
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      };

      const updates: any = {
        profissionalId: authUser.uid,
        profissionalNome: profDisplayName,
        atribuicaoStatus: "Aceito",
        status: "Em Atendimento",
        ativo: true,
        statusInativacao: "Ativo",
        desligado: false,
        statusUpdatedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        aceitoEm: nowIso,
        aceitoTimestamp: serverTimestamp(),
        aceitoPorUid: authUser.uid,
        aceitoPorNome: profDisplayName,
        aceitoPorEmail: profEmail,
        aceitoOrigem: "link_direto",
        aceiteAuditoria,
        notificacao: `${notifAnterior}[${nowStr}] Encaminhamento ACEITO com autenticação verificada pelo profissional ${profDisplayName} (${profEmail}) via Link Direto de Aceite. Caso movido para Em Atendimento.`,
      };

      try {
        await updateDoc(doc(db, "acolhimentos", casoId), updates);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `acolhimentos/${casoId}`);
      }

      try {
        await addDoc(collection(db, "auditoria_gestao"), {
          tipo: "aceite_encaminhamento_clinico",
          pacienteId: casoId,
          pacienteNome: card.nome || card.nomeCompleto || "Paciente",
          profissionalUid: authUser.uid,
          profissionalNome: profDisplayName,
          profissionalEmail: profEmail,
          origem: "link_direto",
          dataIso: nowIso,
          data: serverTimestamp(),
        });
      } catch (auditErr) {
        console.warn("Aviso ao registrar log em auditoria_gestao:", auditErr);
      }

      setCard((prev: any) => ({ ...prev, ...updates }));
    } catch (err: any) {
      console.error("Erro ao confirmar aceite:", err);
      setDecisionError("Erro ao registrar o aceite. Verifique sua conexão e tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReturn = async () => {
    if (!authUser || !card || !isAssignedProfessional) {
      setDecisionError("Apenas o profissional atribuído pode devolver este caso.");
      return;
    }
    setDecisionError("");
    setIsSubmitting(true);
    try {
      const observacaoFinal = motivoDevolucao.trim();
      const nowIso = new Date().toISOString();
      const nowStr = new Date().toLocaleString("pt-BR");
      const notifAnterior = card.notificacao ? card.notificacao + "\n\n" : "";
      const textoMotivo = observacaoFinal ? ` Observação: ${observacaoFinal}` : "";

      const updates: any = {
        profissionalId: "",
        profissionalNome: "",
        status: "Devolvido para triagem",
        atribuicaoStatus: "Devolvido",
        devolvidoMotivo:
          observacaoFinal || "Devolvido pelo profissional para nova atribuição",
        devolvidoPor: profDisplayName,
        devolvidoPorUid: authUser.uid,
        devolvidoPorEmail: profEmail,
        devolvidoEm: nowIso,
        statusUpdatedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        notificacao: `${notifAnterior}[${nowStr}] Atendimento devolvido pelo profissional ${profDisplayName} (${profEmail}) via Link Direto.${textoMotivo} Retornou para a coluna "Devolvido para triagem" (Devolvido para nova atribuição).`,
      };

      try {
        await updateDoc(doc(db, "acolhimentos", casoId), updates);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `acolhimentos/${casoId}`);
      }

      try {
        await addDoc(collection(db, "auditoria_gestao"), {
          tipo: "devolucao_encaminhamento_clinico",
          pacienteId: casoId,
          pacienteNome: card.nome || card.nomeCompleto || "Paciente",
          profissionalUid: authUser.uid,
          profissionalNome: profDisplayName,
          profissionalEmail: profEmail,
          motivo: observacaoFinal || "Devolvido pelo profissional para nova atribuição",
          origem: "link_direto",
          dataIso: nowIso,
          data: serverTimestamp(),
        });
      } catch (auditErr) {
        console.warn("Aviso ao registrar devolução em auditoria_gestao:", auditErr);
      }

      setCard((prev: any) => ({ ...prev, ...updates }));
      setShowReturnForm(false);
    } catch (err) {
      console.error("Erro ao devolver paciente:", err);
      setDecisionError("Erro ao registrar devolução. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const directAceiteUrl = `${window.location.origin}/?aceite_caso=${encodeURIComponent(casoId)}`;

  return (
    <div className="min-h-screen bg-warm flex flex-col font-sans text-forest">
      {/* Top Bar Contract: 3 Clean Zones */}
      <header className="w-full bg-white border-b border-soft px-4 sm:px-8 py-3.5 flex items-center justify-between gap-8">
        <button
          type="button"
          onClick={onGoHome}
          className="flex items-center shrink-0 whitespace-nowrap cursor-pointer focus-visible:outline-none"
        >
          <BrandLogo size="sm" />
        </button>

        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-forest/70">
          <span className="whitespace-nowrap shrink-0">Triagem Acessível</span>
          <span aria-hidden="true" className="text-forest/30">·</span>
          <span className="whitespace-nowrap shrink-0">Decisão Clínica Autenticada</span>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          {authUser ? (
            <button
              type="button"
              onClick={() => onOpenInDashboard(card?.atribuicaoStatus === "Aceito" ? casoId : "")}
              className="px-4 py-2 text-xs font-semibold text-forest bg-warm hover:bg-soft/60 border border-soft rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Ir para o Painel
            </button>
          ) : (
            <button
              type="button"
              onClick={onGoHome}
              className="px-4 py-2 text-xs font-semibold text-forest/80 hover:text-forest transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Página Inicial
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {!authReady || (authUser && loadingCase) ? (
          <div className="bg-white border border-soft rounded-2xl p-8 sm:p-10 space-y-5">
            <div className="h-5 w-48 bg-warm animate-pulse rounded" />
            <div className="h-8 w-80 max-w-full bg-warm animate-pulse rounded" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="h-20 bg-warm/70 animate-pulse rounded-xl" />
              <div className="h-20 bg-warm/70 animate-pulse rounded-xl" />
              <div className="h-20 bg-warm/70 animate-pulse rounded-xl" />
            </div>
            <div className="h-32 bg-warm/70 animate-pulse rounded-xl" />
          </div>
        ) : !authUser ? (
          /* TELA DE AUTENTICAÇÃO OBRIGATÓRIA */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-5 bg-forest text-white rounded-2xl p-6 sm:p-8 flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-sun" />
                </div>
                <h1 className="font-serif text-2xl sm:text-3xl font-semibold leading-snug text-balance">
                  Resumo e Aceite de Caso Clínico
                </h1>
                <p className="text-sm text-white/80 leading-relaxed">
                  Para resguardar o sigilo ético (CFP/LGPD) e registrar a rastreabilidade da decisão clínica, identifique-se com sua conta credenciada.
                </p>
              </div>

              <div className="pt-5 border-t border-white/15 space-y-2.5 text-xs text-white/75">
                <p>1. Visualize o resumo clínico completo do encaminhamento.</p>
                <p>2. Confirme o aceite ou devolva o caso para a equipe de triagem.</p>
                <p>3. O WhatsApp e o e-mail do paciente são liberados na mesma tela após o aceite.</p>
              </div>
            </div>

            <div className="lg:col-span-7 bg-white border border-soft rounded-2xl p-6 sm:p-8 flex flex-col justify-center space-y-6">
              <div>
                <h2 className="font-serif text-xl font-bold text-forest">
                  Identificação do Profissional
                </h2>
                <p className="text-xs text-forest/65 mt-1">
                  Entre com seu Google ou e-mail cadastrado na plataforma AcolheMente.
                </p>
              </div>

              {authError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              {forgotMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{forgotMsg}</span>
                </div>
              )}

              <button
                type="button"
                disabled={authLoading}
                onClick={handleGoogleLogin}
                className="w-full py-3 px-4 bg-white hover:bg-warm/60 border border-soft rounded-xl text-sm font-semibold text-forest flex items-center justify-center gap-3 transition-colors cursor-pointer disabled:opacity-60"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Entrar com Google (1 clique)</span>
              </button>

              <div className="flex items-center gap-3 text-xs text-forest/45">
                <div className="h-px flex-1 bg-soft" />
                <span>ou acesse com e-mail e senha</span>
                <div className="h-px flex-1 bg-soft" />
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-forest/80 block">
                    E-mail profissional
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="w-full px-3.5 py-2.5 bg-warm/30 border border-soft rounded-xl text-sm text-forest focus:outline-none focus:border-forest"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-forest/80">Senha</label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs text-forest/65 hover:text-forest underline cursor-pointer"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-warm/30 border border-soft rounded-xl text-sm text-forest focus:outline-none focus:border-forest"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 px-4 bg-forest hover:bg-forest/90 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
                >
                  {authLoading ? "Verificando credencial..." : "Acessar Caso Clínico"}
                </button>
              </form>
            </div>
          </div>
        ) : loadError || !card ? (
          <div className="bg-white border border-soft rounded-2xl p-8 text-center space-y-4">
            <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
            <h2 className="font-serif text-2xl font-bold text-forest">
              {loadError || "Encaminhamento não encontrado"}
            </h2>
            <p className="text-sm text-forest/70 max-w-md mx-auto">
              Verifique se o link está completo ou acesse o seu painel para visualizar seus pacientes encaminhados.
            </p>
            <button
              type="button"
              onClick={() => onOpenInDashboard("")}
              className="px-5 py-2.5 bg-forest text-white rounded-xl text-xs font-semibold hover:bg-forest/90 transition-colors cursor-pointer"
            >
              Abrir Meu Painel
            </button>
          </div>
        ) : !isAssignedProfessional && !isMasterOrTriagem ? (
          /* BLOQUEIO SE OUTRO PROFISSIONAL ABRIR O LINK OU CASO JÁ DEVOLVIDO */
          <div className="bg-white border border-soft rounded-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-start justify-between gap-4 flex-wrap border-b border-soft pb-4">
              <div className="space-y-1">
                <h1 className="font-serif text-xl sm:text-2xl font-bold text-forest">
                  {card.atribuicaoStatus === "Devolvido" || !card.profissionalId
                    ? "Encaminhamento retornado para a equipe de triagem"
                    : "Caso vinculado a outro profissional"}
                </h1>
                <p className="text-xs text-forest/65">
                  Autenticado como {profDisplayName} · {profEmail}
                </p>
              </div>
              <button
                type="button"
                onClick={() => signOut(auth)}
                className="px-3.5 py-2 text-xs font-semibold text-forest/75 hover:text-forest border border-soft rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Trocar Conta</span>
              </button>
            </div>

            <p className="text-sm text-forest/80 leading-relaxed">
              {card.atribuicaoStatus === "Devolvido" || !card.profissionalId
                ? "Este encaminhamento não está mais pendente de aceite no seu perfil e encontra-se sob análise da equipe de triagem para nova atribuição."
                : "Por segurança e sigilo ético, somente o profissional diretamente atribuído a este caso pode visualizar o resumo clínico e registrar decisão."}
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => onOpenInDashboard("")}
                className="px-5 py-2.5 bg-forest text-white rounded-xl text-xs font-semibold hover:bg-forest/90 transition-colors cursor-pointer"
              >
                Ir para Meus Pacientes no Painel
              </button>
            </div>
          </div>
        ) : (
          /* TELA PRINCIPAL DE RESUMO E DECISÃO DO CASO */
          <div className="space-y-6">
            {/* Barra de Identidade Autenticada */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-forest/75 px-1">
              <div className="flex items-center gap-2 flex-wrap">
                <UserCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  Autenticado como <strong className="text-forest">{profDisplayName}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{profEmail}</span>
              </div>
              <button
                type="button"
                onClick={() => signOut(auth)}
                className="self-start sm:self-auto text-xs font-medium text-forest/65 hover:text-forest underline flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Trocar conta</span>
              </button>
            </div>

            {/* Aviso caso Gestão/Triagem abra um link atribuído a outro profissional */}
            {!isAssignedProfessional && isMasterOrTriagem && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
                    <Eye className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Modo Conferência da Gestão / Triagem (Somente Leitura)</span>
                  </div>
                  <p className="text-xs text-amber-900/85 leading-relaxed">
                    Este caso está atribuído a{" "}
                    <strong>
                      {assignedProfProfile?.name || card.profissionalNome || "outro profissional"}
                    </strong>
                    . Para preservar a comprovação de autoria do aceite, apenas o próprio profissional autenticado pode confirmar ou devolver o encaminhamento.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(directAceiteUrl);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2500);
                  }}
                  className="px-4 py-2.5 bg-white hover:bg-amber-100/60 text-amber-950 border border-amber-300 rounded-xl text-xs font-semibold flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? "Link Copiado" : "Copiar Link para o Profissional"}</span>
                </button>
              </div>
            )}

            {/* Card Principal Único (Single-Elevation) */}
            <div className="bg-white border border-soft rounded-2xl p-6 sm:p-8 space-y-6">
              {/* Cabeçalho do Caso com Metadados sem Pílulas */}
              <div className="border-b border-soft pb-5 space-y-2">
                <div className="flex items-center gap-2 text-xs text-forest/60 flex-wrap">
                  <span>{card.viaAcesso || "Triagem Acessível"}</span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={`font-semibold ${
                      card.atribuicaoStatus === "Aceito"
                        ? "text-emerald-700"
                        : card.atribuicaoStatus === "Devolvido"
                          ? "text-rose-700"
                          : "text-amber-700"
                    }`}
                  >
                    {card.atribuicaoStatus === "Aceito"
                      ? "Caso Aceito"
                      : card.atribuicaoStatus === "Devolvido"
                        ? "Devolvido para Triagem"
                        : "Aguardando Confirmação de Aceite"}
                  </span>
                  {(card.atribuidoEm || card.createdAt) && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        Encaminhado em {formatDateTimePtBr(card.atribuidoEm || card.createdAt)}
                      </span>
                    </>
                  )}
                </div>

                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-forest text-balance">
                  {card.nome || card.nomeCompleto || "Paciente"}
                </h1>

                <div className="flex items-center gap-2 text-xs sm:text-sm text-forest/75 flex-wrap pt-0.5">
                  <span className="font-mono tabular-nums">{computePatientAgeLabel(card)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{card.genero || card.identidadeGenero || "Gênero não informado"}</span>
                  {card.estadoCivil && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{card.estadoCivil}</span>
                    </>
                  )}
                  {(card.cidadeEstado || card.cidade) && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>
                        {card.cidadeEstado ||
                          `${card.cidade}${card.estado ? ` - ${card.estado}` : ""}`}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Grade de Alinhamento Clínico e Proposta */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-1 border-b border-soft pb-6">
                <div>
                  <span className="text-xs text-forest/55 block">Valor Acordado por Sessão</span>
                  <span className="text-lg font-bold font-mono tabular-nums text-emerald-800 mt-0.5 block">
                    {card.valorSessao
                      ? String(card.valorSessao).includes("R$")
                        ? card.valorSessao
                        : `R$ ${card.valorSessao}`
                      : "A combinar"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-forest/55 block">Frequência Proposta</span>
                  <span className="text-base font-semibold text-forest mt-0.5 block">
                    {card.frequenciaSessoes || card.frequenciaProposta || "Semanal"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-forest/55 block">Disponibilidade (Online)</span>
                  <span className="text-sm font-medium text-forest mt-0.5 block">
                    {Array.isArray(card.melhoresPeriodos) && card.melhoresPeriodos.length > 0
                      ? card.melhoresPeriodos.join(", ")
                      : card.melhoresPeriodos || "A alinhar com o paciente"}
                  </span>
                </div>
              </div>

              {/* Demanda / Queixa Principal */}
              <div className="space-y-2 border-b border-soft pb-6">
                <h2 className="text-xs font-bold text-forest/70 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-forest/60" />
                  <span>Motivo da Busca / Demanda Clínica Relatada</span>
                </h2>
                <p className="text-sm text-forest/90 leading-relaxed whitespace-pre-wrap">
                  {card.motivo ||
                    card.queixaPrincipal ||
                    card.observacoes ||
                    card.necessidadesDescricao ||
                    "Não detalhado no formulário inicial."}
                </p>
                {(card.temFilhos || card.filhos) && (
                  <p className="text-xs text-forest/65 pt-2">
                    Filhos: <strong className="text-forest">{card.temFilhos || card.filhos}</strong>
                    {card.faixaEtariaFilhos &&
                    card.faixaEtariaFilhos !== "Não se aplica (sem filhos)"
                      ? ` · Faixa etária: ${card.faixaEtariaFilhos}`
                      : ""}
                  </p>
                )}
              </div>

              {/* SE JÁ ACEITO: EXIBE COMPROVANTE + CONTATOS LIBERADOS */}
              {card.atribuicaoStatus === "Aceito" ? (
                <div className="space-y-6">
                  <div className="p-4 sm:p-5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>Aceite Confirmado e Registrado — Contatos Liberados</span>
                      </div>
                      {card.aceitoEm && (
                        <span className="text-xs font-mono tabular-nums text-emerald-800">
                          {formatDateTimePtBr(card.aceitoEm)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-emerald-900/85">
                      Comprovante autenticado:{" "}
                      <strong>{card.aceitoPorNome || profDisplayName}</strong>
                      {card.aceitoPorEmail ? ` · ${card.aceitoPorEmail}` : ""}. Realize o primeiro contato em até 24–48h para agendar a sessão inicial.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div className="bg-white border border-emerald-200/80 rounded-xl p-3.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[11px] text-forest/55 block">WhatsApp / Telefone</span>
                          <span className="text-sm font-mono tabular-nums font-bold text-forest truncate block">
                            {card.telefone || "Não informado"}
                          </span>
                        </div>
                        {card.telefone && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(card.telefone);
                              setCopiedContact("tel");
                              setTimeout(() => setCopiedContact(null), 2000);
                            }}
                            className="p-2 text-forest/60 hover:text-forest rounded-lg hover:bg-warm transition-colors cursor-pointer"
                            title="Copiar telefone"
                          >
                            {copiedContact === "tel" ? (
                              <Check className="w-4 h-4 text-emerald-700" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>

                      <div className="bg-white border border-emerald-200/80 rounded-xl p-3.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[11px] text-forest/55 block">E-mail do Paciente</span>
                          <span className="text-sm font-mono font-semibold text-forest truncate block">
                            {card.email || "Não informado"}
                          </span>
                        </div>
                        {card.email && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(card.email);
                              setCopiedContact("email");
                              setTimeout(() => setCopiedContact(null), 2000);
                            }}
                            className="p-2 text-forest/60 hover:text-forest rounded-lg hover:bg-warm transition-colors cursor-pointer"
                            title="Copiar e-mail"
                          >
                            {copiedContact === "email" ? (
                              <Check className="w-4 h-4 text-emerald-700" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ações Pós-Aceite */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {card.telefone && (
                      <a
                        href={(() => {
                          const digits = String(card.telefone).replace(/\D/g, "");
                          const clean = digits.startsWith("55") ? digits : `55${digits}`;
                          const nomePac = (card.nome || "Paciente").split(" ")[0];
                          const msg = `Olá, ${nomePac}! Tudo bem? Sou ${profDisplayName}, psicólogo(a) credenciado(a) pelo Projeto AcolheMente Saúde. Recebi a confirmação do seu encaminhamento e gostaria de combinar o melhor dia e horário para a nossa primeira sessão.`;
                          return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
                        })()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-3 px-5 bg-[#25D366] hover:bg-[#20b858] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                      >
                        <Phone className="w-4 h-4" />
                        <span>Chamar Paciente no WhatsApp</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => onOpenInDashboard(casoId)}
                      className="flex-1 py-3 px-5 bg-forest hover:bg-forest/90 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Calendar className="w-4 h-4 text-sun" />
                      <span>Abrir Ficha Completa e Agendar</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* SE PENDENTE: PROTEÇÃO DE CONTATOS + BOTÕES DE ACEITE OU DEVOLUÇÃO */
                <div className="space-y-6">
                  <div className="p-4 bg-warm/50 border border-soft rounded-xl flex items-start gap-3">
                    <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs text-forest/80 leading-relaxed">
                      <span className="font-bold text-forest block">
                        Dados de Contato Protegidos antes do Aceite
                      </span>
                      <span>
                        Telefone/WhatsApp, e-mail, CPF e endereço do paciente são liberados nesta tela imediatamente após a confirmação do aceite abaixo.
                      </span>
                    </div>
                  </div>

                  {decisionError && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{decisionError}</span>
                    </div>
                  )}

                  {showReturnForm ? (
                    <div className="p-5 bg-rose-50/50 border border-rose-200 rounded-xl space-y-4">
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-rose-950 flex items-center gap-2">
                          <RotateCcw className="w-4 h-4 text-rose-700" />
                          <span>Devolver Encaminhamento para a Triagem</span>
                        </h3>
                        <p className="text-xs text-rose-900/80">
                          O paciente retornará para a coluna "Devolvido para triagem" para que a coordenação possa atribuir outro profissional compatível.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-forest/80 block">
                          Observação ou motivo para a equipe de triagem (opcional)
                        </label>
                        <textarea
                          rows={3}
                          value={motivoDevolucao}
                          onChange={(e) => setMotivoDevolucao(e.target.value)}
                          placeholder="Ex: Indisponibilidade de agenda nos períodos informados pelo paciente..."
                          className="w-full px-3.5 py-2.5 bg-white border border-rose-200 rounded-xl text-sm text-forest focus:outline-none focus:border-rose-400"
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => setShowReturnForm(false)}
                          className="px-4 py-2.5 bg-white border border-soft text-forest rounded-xl text-xs font-semibold hover:bg-warm transition-colors cursor-pointer"
                        >
                          Voltar ao Resumo
                        </button>
                        <button
                          type="button"
                          disabled={isSubmitting || !isAssignedProfessional}
                          onClick={handleConfirmReturn}
                          className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isSubmitting ? "Registrando devolução..." : "Confirmar Devolução para Triagem"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                      <button
                        type="button"
                        disabled={isSubmitting || !isAssignedProfessional}
                        onClick={handleConfirmAccept}
                        className="flex-1 py-3.5 px-6 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {isSubmitting ? "Confirmando aceite..." : "Confirmar Aceite do Caso"}
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={isSubmitting || !isAssignedProfessional}
                        onClick={() => setShowReturnForm(true)}
                        className="py-3.5 px-5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Devolver para Triagem</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
