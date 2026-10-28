import React, { useState, useRef, useEffect } from "react";
import {
  User,
  Stethoscope,
  FileText,
  Wallet,
  Globe,
  Eye,
  Upload,
  Sliders,
  Sparkles,
  Loader2,
  Mail,
  Lock,
  Edit3,
  Key,
  Clock,
  ExternalLink,
  Share2,
  Check,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Copy,
} from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { formatProfessionalName, formatCnpj, getCnpjValidationError } from "../utils/formatters";
import { WhiteLabelProfileConfigPanel } from "./WhiteLabelProfileConfigPanel";
import { PerfisFaturamentoPanel } from "./PerfisFaturamentoManagerModal";
import {
  normalizePerfisFaturamento,
  extractLegacySyncFields,
} from "../types/faturamento";
import {
  PlanoProfissionalItem,
  hasIntegrarFeatures,
  getPlanDisplayName,
} from "../types/planosProfissionais";

const OPCOES_SERVICOS_REDE = [
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
  "Outros",
];

const PUBLICOS_OPCOES = [
  "Adulto",
  "Idoso",
  "Criança",
  "Adolescente",
  "Casal",
  "Família",
  "Outros",
];

const PROFISSOES_PADRAO = [
  "Psicólogo(a)",
  "Psicólogo(a) Clínico(a)",
  "Psicanalista",
  "Terapeuta",
  "Terapeuta Holístico(a)",
  "Psicopedagogo(a)",
];

export type PerfilSubTab =
  | "identificacao"
  | "atuacao"
  | "apresentacao"
  | "faturamento"
  | "paginaPublica";

interface FastInputProps {
  value: string;
  onChange: (val: string) => void;
  onImmediateTrack?: (val: string) => void;
  onBlur?: () => void;
  className?: string;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  maxLength?: number;
  title?: string;
}

function FastInput({
  value,
  onChange,
  onImmediateTrack,
  onBlur,
  className,
  placeholder,
  type = "text",
  disabled = false,
  maxLength,
  title,
}: FastInputProps) {
  const [localVal, setLocalVal] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValRef = useRef(value || "");
  const propValRef = useRef(value || "");
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  propValRef.current = value || "";

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setLocalVal(value || "");
      latestValRef.current = value || "";
    }
  }, [value]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        if (latestValRef.current !== propValRef.current) {
          onChangeRef.current(latestValRef.current);
        }
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setLocalVal(newVal);
    latestValRef.current = newVal;
    onImmediateTrack?.(newVal);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      onChangeRef.current(newVal);
    }, 250);
  };

  const handleBlur = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (localVal !== value) {
      onChange(localVal);
    }
    if (onBlur) {
      onBlur();
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
}

interface FastTextAreaProps {
  value: string;
  onChange: (val: string) => void;
  onImmediateTrack?: (val: string) => void;
  className?: string;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  rows?: number;
}

function FastTextArea({
  value,
  onChange,
  onImmediateTrack,
  className,
  placeholder,
  maxLength,
  disabled,
  rows,
}: FastTextAreaProps) {
  const [localVal, setLocalVal] = useState(value || "");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValRef = useRef(value || "");
  const propValRef = useRef(value || "");
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  propValRef.current = value || "";

  useEffect(() => {
    if (document.activeElement !== textAreaRef.current) {
      setLocalVal(value || "");
      latestValRef.current = value || "";
    }
  }, [value]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
        if (latestValRef.current !== propValRef.current) {
          onChangeRef.current(latestValRef.current);
        }
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setLocalVal(newVal);
    latestValRef.current = newVal;
    onImmediateTrack?.(newVal);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      onChangeRef.current(newVal);
    }, 250);
  };

  const handleBlur = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
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
}

interface ProfissionalMeuPerfilViewProps {
  profile: any;
  setProfile: React.Dispatch<React.SetStateAction<any>>;
  user: FirebaseUser | null;
  isAutoCroppingPhoto: boolean;
  onSelectPhotoFile: (file: File) => void;
  onOpenPhotoCropModal: (photoUrl: string) => void;
  onAutoCenterCurrentPhoto: () => void;
  onOpenChangeEmailModal: () => void;
  onResetPassword: () => void;
  onOpenCreatePasswordModal: () => void;
  onOpenGerenciarCotaModal: () => void;
  onSaveProfile: (updates: Record<string, any>) => Promise<void> | void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
  parseMaxHorasDisponiveis: (horasDisp?: string) => number;
  parseHorasNumber: (val?: string | number) => number;
  parseDateSafely: (val: any) => Date;
  formatDateSafely: (val: any, fallback?: string) => string;
  planosConfig?: PlanoProfissionalItem[];
  planosSchemaVersion?: number;
  onGoToPlanos?: () => void;
}

export function ProfissionalMeuPerfilView({
  profile,
  setProfile,
  user,
  isAutoCroppingPhoto,
  onSelectPhotoFile,
  onOpenPhotoCropModal,
  onAutoCenterCurrentPhoto,
  onOpenChangeEmailModal,
  onResetPassword,
  onOpenCreatePasswordModal,
  onOpenGerenciarCotaModal,
  onSaveProfile,
  showToast,
  parseMaxHorasDisponiveis,
  parseHorasNumber,
  parseDateSafely,
  formatDateSafely,
  planosConfig,
  planosSchemaVersion,
  onGoToPlanos,
}: ProfissionalMeuPerfilViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<PerfilSubTab>("identificacao");
  const [isSaving, setIsSaving] = useState(false);

  // Instant field overrides so clicking Save immediately after typing never misses a character
  const liveOverridesRef = useRef<Record<string, any>>({});
  const trackField = (field: string, val: any) => {
    liveOverridesRef.current[field] = val;
  };
  const updateProfileField = (patch: Record<string, any>) => {
    Object.assign(liveOverridesRef.current, patch);
    setProfile((prev: any) => (prev ? { ...prev, ...patch } : prev));
  };

  // Clear live overrides whenever profile prop updates externally
  useEffect(() => {
    liveOverridesRef.current = {};
  }, [profile?.uid]);

  // Essential completeness checks per sub-tab (mirrors getProfissionalNotifications)
  const missingIdentificacao = [
    !profile?.photoUrl,
    !profile?.telefone?.trim(),
    !profile?.cpf?.trim(),
    !profile?.cidade?.trim(),
    !profile?.uf?.trim(),
  ].filter(Boolean).length;

  const missingAtuacao = [
    !profile?.crp?.trim(),
    !profile?.anoFormacao,
    !profile?.abordagem?.trim(),
    !profile?.especialidade?.trim(),
    !Array.isArray(profile?.publicosExperiencia) || profile.publicosExperiencia.length === 0,
    !Array.isArray(profile?.publicosGosto) || profile.publicosGosto.length === 0,
  ].filter(Boolean).length;

  const missingApresentacao = [
    !profile?.biografia?.trim(),
    !profile?.motivacaoProjeto?.trim(),
  ].filter(Boolean).length;

  const hasAnyPixOrBilling =
    Boolean((profile?.pixKey || profile?.chavePix || "").trim()) ||
    (Array.isArray(profile?.perfisFaturamento) && profile.perfisFaturamento.length > 0);
  const missingFaturamento = hasAnyPixOrBilling ? 0 : 1;

  const totalEssentialItems = 14;
  const totalMissingItems =
    missingIdentificacao + missingAtuacao + missingApresentacao + missingFaturamento;
  const completedEssentialItems = Math.max(0, totalEssentialItems - totalMissingItems);

  const subTabs: {
    id: PerfilSubTab;
    label: string;
    shortDesc: string;
    Icon: React.ComponentType<{ className?: string }>;
    missingCount: number;
  }[] = [
    {
      id: "identificacao",
      label: "Dados & Conta",
      shortDesc: "Foto oficial, contatos pessoais, localização e credenciais de acesso",
      Icon: User,
      missingCount: missingIdentificacao,
    },
    {
      id: "atuacao",
      label: "Atuação & Serviços",
      shortDesc: "Formação acadêmica, CRP, cota mensal de horas, públicos e serviços",
      Icon: Stethoscope,
      missingCount: missingAtuacao,
    },
    {
      id: "apresentacao",
      label: "Biografia & Propósito",
      shortDesc: "Mini-currículo público, apresentação aos pacientes e motivação na rede",
      Icon: FileText,
      missingCount: missingApresentacao,
    },
    {
      id: "faturamento",
      label: "Faturamento & PIX",
      shortDesc: "Perfis PF e PJ integrados em Pacientes (Acessíveis, Corporativos, Externos) e Empresas",
      Icon: Wallet,
      missingCount: missingFaturamento,
    },
    {
      id: "paginaPublica",
      label: "Página Pública",
      shortDesc: "Exposição de eventos e artigos, cartão virtual e identidade White-Label",
      Icon: Globe,
      missingCount: 0,
    },
  ];

  const currentTabIndex = subTabs.findIndex((t) => t.id === activeSubTab);
  const prevTab = currentTabIndex > 0 ? subTabs[currentTabIndex - 1] : null;
  const nextTab = currentTabIndex < subTabs.length - 1 ? subTabs[currentTabIndex + 1] : null;

  const handleSaveAll = async () => {
    if (!profile) return;
    const merged = { ...profile, ...liveOverridesRef.current };
    if (merged.companyData?.cnpj?.trim()) {
      const cnpjErr = getCnpjValidationError(merged.companyData.cnpj, false);
      if (cnpjErr) {
        setActiveSubTab("paginaPublica");
        showToast(cnpjErr, "error");
        return;
      }
    }
    setIsSaving(true);
    try {
      const pixResolved = merged.pixKey ?? merged.chavePix ?? "";
      const formattedWlCnpj = merged.companyData?.cnpj?.trim()
        ? formatCnpj(merged.companyData.cnpj)
        : "";
      const companyDataNormalized = merged.companyData
        ? {
            ...merged.companyData,
            cnpj: formattedWlCnpj,
          }
        : {
            razaoSocial: "",
            cnpj: "",
            enderecoEmpresa: "",
            telefoneEmpresa: "",
            emailEmpresa: "",
            logoEmpresaUrl: "",
          };

      const normalizedPerfis = normalizePerfisFaturamento({
        ...merged,
        chavePix: pixResolved,
        pixKey: pixResolved,
        companyData: companyDataNormalized,
      });

      const primaryPfIdx = normalizedPerfis.findIndex(
        (p) => p.via === "PF" && p.subtipo === "conta_cpf"
      );
      const syncedPerfis = normalizedPerfis.map((p, idx) => {
        if (idx === primaryPfIdx) {
          return {
            ...p,
            cpf: merged.cpf?.trim() ? merged.cpf.trim() : p.cpf || "",
            chavePix: pixResolved?.trim() ? pixResolved.trim() : p.chavePix || "",
            titularNome: merged.name?.trim() || p.titularNome || "",
          };
        }
        return p;
      });

      const syncFields = extractLegacySyncFields(
        syncedPerfis,
        merged.cpf,
        pixResolved
      );
      updateProfileField(syncFields);

      await onSaveProfile({
        name: merged.name,
        profissao: merged.profissao || "",
        telefone: merged.telefone,
        crp: merged.crp,
        cpf: syncFields.cpf,
        dataAdmissao: merged.dataAdmissao,
        vencimentoPagamento: merged.vencimentoPagamento,
        genero: merged.genero || "",
        deficiencia: merged.deficiencia || "",
        especialidade: merged.especialidade,
        horasDisponiveis: merged.horasDisponiveis,
        cidade: merged.cidade,
        uf: merged.uf,
        biografia: merged.biografia,
        motivacaoProjeto: merged.motivacaoProjeto,
        photoUrl: merged.photoUrl || "",
        pixKey: syncFields.pixKey,
        chavePix: syncFields.chavePix,
        perfisFaturamento: syncFields.perfisFaturamento,
        dadosPJ: syncFields.dadosPJ,
        faturamentoPadrao: syncFields.faturamentoPadrao,
        anoFormacao: merged.anoFormacao || "",
        abordagem: merged.abordagem || "",
        publicosExperiencia: merged.publicosExperiencia || [],
        publicosGosto: merged.publicosGosto || [],
        outrosPublicosExperiencia: merged.outrosPublicosExperiencia || "",
        outrosPublicosGosto: merged.outrosPublicosGosto || "",
        servicosOferecidos: merged.servicosOferecidos || [],
        servicosOrcamentoAcessivel: merged.servicosOrcamentoAcessivel || [],
        outrosServicos: merged.outrosServicos || "",
        plano: merged.plano || "basico",
        whiteLabelEnabled: merged.whiteLabelEnabled || false,
        whiteLabelConfig: merged.whiteLabelConfig || {
          primaryColor: "#0F766E",
          secondaryColor: "#06B6D4",
          backgroundColor: "#F8FAFC",
        },
        companyData: companyDataNormalized,
        customServices: merged.customServices || [],
        bioCurta: merged.bioCurta || "",
        modalidadeAtendimento: merged.modalidadeAtendimento || "online",
        whatsappBotaoTexto: merged.whatsappBotaoTexto || "",
        whatsappMensagem: merged.whatsappMensagem || "",
        instagramUrl: merged.instagramUrl || "",
        linkedinUrl: merged.linkedinUrl || "",
        lattesUrl: merged.lattesUrl || "",
        youtubeUrl: merged.youtubeUrl || "",
        tiktokUrl: merged.tiktokUrl || "",
        facebookUrl: merged.facebookUrl || "",
        siteUrl: merged.siteUrl || "",
        atendePresencial: merged.atendePresencial || false,
        divulgarEnderecoPresencial: merged.divulgarEnderecoPresencial || false,
        exibirEventosPaginaPublica: merged.exibirEventosPaginaPublica !== false,
        exibirArtigosPaginaPublica: merged.exibirArtigosPaginaPublica !== false,
        enderecoPresencial: merged.enderecoPresencial || {
          cep: "",
          nomeEspaco: "",
          logradouro: "",
          numero: "",
          complemento: "",
          bairro: "",
          cidade: "",
          uf: "",
          referencia: "",
        },
      });
      liveOverridesRef.current = {};
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublicVisibility = async (
    field: "exibirEventosPaginaPublica" | "exibirArtigosPaginaPublica",
    checked: boolean,
  ) => {
    updateProfileField({ [field]: checked });
    if (user?.uid) {
      try {
        await updateDoc(doc(db, "users", user.uid), {
          [field]: checked,
          updatedAt: serverTimestamp(),
        });
        showToast(
          checked
            ? "Conteúdo habilitado na sua Página Pública!"
            : "Conteúdo ocultado da sua Página Pública.",
          "success",
        );
      } catch (err) {
        console.error("Erro ao atualizar visibilidade na página pública:", err);
      }
    }
  };

  const shareLink = profile?.uid
    ? `${window.location.origin}?prof=${profile.uid}`
    : "";
  const profTitulo =
    profile?.profissao ||
    (profile?.especialidade
      ? `Profissional - ${profile.especialidade}`
      : "Profissional de Saúde");
  const isWLActive =
    profile?.whiteLabelEnabled === true && hasIntegrarFeatures(profile);
  const shareTitle = `${profile?.name || "Profissional"} - ${profTitulo}`;
  const shareText = isWLActive
    ? `Conheça minha página profissional (${profTitulo}): ${shareLink}`
    : `Conheça meu perfil profissional no Projeto AcolheMente Saúde (${profTitulo}): ${shareLink}`;

  const renderPublicLinkCard = () => {
    if (!shareLink) return null;
    return (
      <div className="bg-warm/50 border border-soft rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-forest uppercase tracking-wider">
              Link da Sua Página Pessoal
            </span>
            <span
              className={`px-2 py-0.5 font-bold text-[10px] rounded-md uppercase tracking-wide border ${
                isWLActive
                  ? "bg-amber-50 text-amber-900 border-amber-200"
                  : "bg-white text-forest/80 border-soft"
              }`}
            >
              {isWLActive ? "Modo White-Label Ativo" : "Perfil Institucional"}
            </span>
          </div>
          <p className="text-xs font-mono text-forest/70 truncate select-all">
            {shareLink}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <a
            href={shareLink}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-white hover:bg-warm text-forest font-bold text-xs rounded-xl transition-colors border border-soft inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5 text-forest/70" />
            <span>Abrir Página</span>
          </a>

          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(shareLink);
              showToast(
                `Link da página de ${profile.name || "perfil"} copiado!`,
                "success"
              );
            }}
            className="px-3 py-2 bg-white hover:bg-warm text-forest font-bold text-xs rounded-xl transition-colors border border-soft inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Copy className="w-3.5 h-3.5 text-forest/70" />
            <span>Copiar Link</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (navigator.share) {
                navigator
                  .share({
                    title: shareTitle,
                    text: shareText,
                    url: shareLink,
                  })
                  .catch(() => {});
              } else {
                navigator.clipboard
                  .writeText(`${shareTitle}\n${shareText}`)
                  .then(() => {
                    showToast(
                      "Dados da página e link copiados com sucesso!",
                      "success"
                    );
                  });
              }
            }}
            className="px-3.5 py-2 bg-sun-dark hover:bg-sun-dark/90 text-forest font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Compartilhar</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6 md:p-8 flex flex-col gap-6 slide-up font-sans">
      <div className="max-w-5xl w-full mx-auto flex flex-col gap-6">
        {/* Cabeçalho Principal + Barra de Sub-Abas Temáticas */}
        <div className="bg-white px-5 py-4 rounded-2xl shadow-xs border border-soft flex flex-col gap-3.5">
          {/* Linha 1: Identificação da Área, Status de Preenchimento e Ações Rápidas */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-forest/5 border border-soft flex items-center justify-center text-forest shrink-0 overflow-hidden">
                {profile?.photoUrl ? (
                  <img
                    src={profile.photoUrl}
                    alt={profile.name || "Perfil"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-5 h-5 text-forest" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-serif text-base sm:text-lg text-forest font-bold leading-snug">
                    Meu Perfil & Configurações
                  </h2>
                  <span aria-hidden="true" className="text-forest/30 hidden sm:inline">
                    ·
                  </span>
                  {totalMissingItems === 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 tabular-nums">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        Cadastro essencial completo ({completedEssentialItems}/{totalEssentialItems})
                      </span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 tabular-nums">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        {completedEssentialItems}/{totalEssentialItems} preenchidos · {totalMissingItems} pendente(s)
                      </span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-forest/65 mt-0.5 truncate">
                  {subTabs[currentTabIndex]?.shortDesc}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <a
                href={`?prof=${profile?.uid || profile?.id || ""}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-warm hover:bg-soft text-forest rounded-xl text-xs font-bold border border-soft transition-colors whitespace-nowrap shrink-0"
              >
                <Eye className="w-3.5 h-3.5 text-forest/75" />
                <span>Ver Página</span>
              </a>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveAll}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-forest hover:bg-forest/90 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-sun" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 text-sun" />
                    <span>Salvar Alterações</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Linha 2: Sub-abas de Navegação por Tema */}
          <div className="pt-3 border-t border-soft/70 flex items-center overflow-x-auto no-scrollbar">
            <div className="inline-flex items-center gap-1 p-1 bg-warm/60 rounded-xl border border-soft shrink-0">
              {subTabs.map((tab) => {
                const Icon = tab.Icon;
                const isActive = activeSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveSubTab(tab.id)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                      isActive
                        ? "bg-white text-forest font-bold shadow-xs border border-soft"
                        : "text-forest/70 hover:text-forest hover:bg-white/50"
                    }`}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isActive ? "text-forest" : "text-forest/60"
                      }`}
                    />
                    <span>{tab.label}</span>
                    {tab.missingCount > 0 && (
                      <span
                        className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 tabular-nums"
                        title={`${tab.missingCount} campo(s) recomendado(s) pendente(s) nesta seção`}
                      >
                        {tab.missingCount}
                      </span>
                    )}
                    {tab.id === "paginaPublica" && isWLActive && (
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Ativa
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Painel de Conteúdo da Sub-Aba Ativa */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xs border border-soft flex flex-col gap-8">
          {/* ================================================================= */}
          {/* SUB-ABA 1: DADOS & CONTA (Identificação, Contato, Local e Login)  */}
          {/* ================================================================= */}
          {activeSubTab === "identificacao" && (
            <div className="flex flex-col gap-8">
              {/* Bloco 1.1: Foto de Perfil */}
              <div className="flex flex-col sm:flex-row items-center gap-6 pb-7 border-b border-soft/80">
                <div
                  className="w-28 h-28 rounded-full overflow-hidden bg-forest/10 border-4 border-sun shrink-0 flex items-center justify-center relative group shadow-xs cursor-pointer"
                  onClick={() => {
                    if (profile.photoUrl) {
                      onOpenPhotoCropModal(profile.photoUrl);
                    }
                  }}
                  title={
                    profile.photoUrl
                      ? "Clique para ajustar o enquadramento"
                      : "Foto de Perfil"
                  }
                >
                  {profile.photoUrl ? (
                    <img
                      src={profile.photoUrl}
                      alt={profile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-forest/60" />
                  )}

                  {profile.photoUrl && (
                    <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold gap-1 text-center p-1">
                      <Sliders className="w-4 h-4 text-sun" />
                      <span>Ajustar</span>
                    </div>
                  )}

                  {isAutoCroppingPhoto && (
                    <div className="absolute inset-0 bg-forest/80 flex items-center justify-center text-white">
                      <Loader2 className="w-6 h-6 animate-spin text-sun" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 items-center sm:items-start flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-forest">
                      Foto de Perfil & Apresentação
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase rounded-md">
                      Auto-Centralização Facial
                    </span>
                  </div>

                  <p className="text-xs text-forest/65 max-w-xl text-center sm:text-left leading-relaxed">
                    Sua foto aparece na página pública e nos cards de apresentação aos pacientes. O enquadramento facial é ajustado automaticamente e pode ser refinado manualmente.
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1.5">
                    <label className="px-4 py-2 bg-forest hover:bg-forest/90 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors flex items-center gap-2 whitespace-nowrap shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {profile.photoUrl ? "Trocar Foto" : "Enviar Foto"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            onSelectPhotoFile(file);
                            e.target.value = "";
                          }
                        }}
                      />
                    </label>

                    {profile.photoUrl && (
                      <>
                        <button
                          type="button"
                          onClick={() => onOpenPhotoCropModal(profile.photoUrl)}
                          className="px-3.5 py-2 bg-warm hover:bg-soft text-forest text-xs font-bold rounded-xl transition-colors border border-soft flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <Sliders className="w-3.5 h-3.5 text-forest/70" />
                          <span>Ajustar Enquadramento</span>
                        </button>

                        <button
                          type="button"
                          onClick={onAutoCenterCurrentPhoto}
                          disabled={isAutoCroppingPhoto}
                          className="px-3.5 py-2 bg-sun/25 hover:bg-sun/40 text-forest text-xs font-bold rounded-xl transition-colors border border-sun-dark/25 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-sun-dark" />
                          <span>Centralizar Rosto</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Bloco 1.2: Dados Pessoais, Contato e Localização */}
              <div className="space-y-5">
                <div>
                  <h3 className="font-serif text-lg font-bold text-forest">
                    Identificação Pessoal & Localização
                  </h3>
                  <p className="text-xs text-forest/60 mt-0.5">
                    Informações cadastrais utilizadas em contratos terapêuticos, recibos e contato comercial.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <label className="text-xs uppercase font-bold tracking-wider text-forest/70">
                      Nome Completo Profissional
                    </label>
                    <FastInput
                      type="text"
                      value={profile.name || ""}
                      onImmediateTrack={(val) => trackField("name", val)}
                      onChange={(val) => updateProfileField({ name: val })}
                      onBlur={() => {
                        const raw = liveOverridesRef.current.name ?? profile.name;
                        if (raw) {
                          updateProfileField({
                            name: formatProfessionalName(raw),
                          });
                        }
                      }}
                      className="w-full mt-1.5 px-4 py-2.5 bg-warm/40 border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors text-sm text-forest font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase font-bold tracking-wider text-forest/70">
                      Telefone / WhatsApp Comercial
                    </label>
                    <FastInput
                      type="tel"
                      value={profile.telefone || ""}
                      placeholder="Ex: 11999999999"
                      onImmediateTrack={(val) => trackField("telefone", val)}
                      onChange={(val) => updateProfileField({ telefone: val })}
                      className="w-full mt-1.5 px-4 py-2.5 bg-warm/40 border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors text-sm text-forest tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase font-bold tracking-wider text-forest/70">
                      CPF Pessoal
                    </label>
                    <FastInput
                      type="text"
                      value={profile.cpf || ""}
                      placeholder="000.000.000-00"
                      onImmediateTrack={(val) => trackField("cpf", val)}
                      onChange={(val) => updateProfileField({ cpf: val })}
                      className="w-full mt-1.5 px-4 py-2.5 bg-warm/40 border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors text-sm text-forest font-mono tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase font-bold tracking-wider text-forest/70">
                      Cidade Base de Atendimento
                    </label>
                    <FastInput
                      type="text"
                      value={profile.cidade || ""}
                      placeholder="Ex: São Paulo"
                      onImmediateTrack={(val) => trackField("cidade", val)}
                      onChange={(val) => updateProfileField({ cidade: val })}
                      className="w-full mt-1.5 px-4 py-2.5 bg-warm/40 border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors text-sm text-forest"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase font-bold tracking-wider text-forest/70">
                      Estado (UF)
                    </label>
                    <FastInput
                      type="text"
                      value={profile.uf || ""}
                      placeholder="Ex: SP"
                      maxLength={2}
                      onImmediateTrack={(val) =>
                        trackField("uf", val.toUpperCase())
                      }
                      onChange={(val) =>
                        updateProfileField({ uf: val.toUpperCase() })
                      }
                      className="w-full mt-1.5 px-4 py-2.5 bg-warm/40 border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors text-sm text-forest uppercase font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase font-bold tracking-wider text-forest/70">
                      Gênero
                    </label>
                    <select
                      value={profile.genero || ""}
                      onChange={(e) =>
                        updateProfileField({ genero: e.target.value })
                      }
                      className="w-full mt-1.5 px-4 py-2.5 bg-warm/40 border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors text-sm text-forest"
                    >
                      <option value="">Selecione...</option>
                      <option value="Feminino">Feminino</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Não-binário">Não-binário</option>
                      <option value="Prefiro não informar">
                        Prefiro não informar
                      </option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs uppercase font-bold tracking-wider text-forest/70">
                      Deficiência ou Necessidade Especial
                    </label>
                    <select
                      value={profile.deficiencia || ""}
                      onChange={(e) =>
                        updateProfileField({ deficiencia: e.target.value })
                      }
                      className="w-full mt-1.5 px-4 py-2.5 bg-warm/40 border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors text-sm text-forest"
                    >
                      <option value="">Selecione...</option>
                      <option value="Não possuo">Não possuo</option>
                      <option value="Deficiência física">
                        Deficiência física (motora)
                      </option>
                      <option value="Deficiência visual">
                        Deficiência visual
                      </option>
                      <option value="Deficiência auditiva">
                        Deficiência auditiva
                      </option>
                      <option value="Deficiência intelectual/cognitiva">
                        Deficiência intelectual/cognitiva
                      </option>
                      <option value="Transtorno do Espectro Autista (TEA)">
                        Transtorno do Espectro Autista (TEA)
                      </option>
                      <option value="Múltiplas deficiências">
                        Múltiplas deficiências
                      </option>
                      <option value="Outra necessidade especial">
                        Outra necessidade especial
                      </option>
                      <option value="Prefiro não responder">
                        Prefiro não responder
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Bloco 1.3: Acesso, Segurança e Admissão */}
              <div className="pt-6 border-t border-soft/80 space-y-5">
                <div>
                  <h3 className="font-serif text-lg font-bold text-forest">
                    Conta, Login & Segurança
                  </h3>
                  <p className="text-xs text-forest/60 mt-0.5">
                    Gerencie seu e-mail de acesso, método de autenticação e registro de entrada na plataforma.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  <div className="lg:col-span-7 bg-warm/35 p-4 sm:p-5 rounded-2xl border border-soft flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <label className="text-xs uppercase font-bold tracking-wider text-forest/75 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-forest/60" />
                        <span>E-mail de Acesso (Login)</span>
                      </label>
                      {auth.currentUser?.providerData.some(
                        (p) => p.providerId === "google.com"
                      ) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          <Globe className="w-3 h-3" /> Conta Google
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <Lock className="w-2.5 h-2.5" /> E-mail / Senha
                        </span>
                      )}
                    </div>

                    <input
                      type="email"
                      value={profile.email || ""}
                      disabled
                      className="w-full px-3.5 py-2.5 bg-white border border-soft rounded-xl text-forest font-medium text-sm select-all cursor-default"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={onOpenChangeEmailModal}
                        className="px-3.5 py-2 bg-forest hover:bg-forest/90 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Alterar E-mail</span>
                      </button>

                      {auth.currentUser?.providerData.some(
                        (p) => p.providerId === "password"
                      ) ? (
                        <button
                          type="button"
                          onClick={onResetPassword}
                          className="px-3.5 py-2 bg-white hover:bg-warm text-forest text-xs font-semibold rounded-xl border border-soft transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <Key className="w-3.5 h-3.5 text-forest/70" />
                          <span>Redefinir Senha</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={onOpenCreatePasswordModal}
                          className="px-3.5 py-2 bg-white hover:bg-warm text-forest text-xs font-semibold rounded-xl border border-soft transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <Lock className="w-3.5 h-3.5 text-forest/70" />
                          <span>Criar Senha Direta</span>
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-forest/55 leading-snug">
                      Seus pacientes e prontuários permanecem vinculados ao seu identificador único (UID). Alterar o e-mail não afeta nenhum registro clínico.
                    </p>
                  </div>

                  <div className="lg:col-span-5 bg-warm/35 p-4 sm:p-5 rounded-2xl border border-soft flex flex-col justify-between gap-3">
                    <div>
                      <label className="text-xs uppercase font-bold tracking-wider text-forest/75 block">
                        Data de Admissão na Rede
                      </label>
                      <FastInput
                        type="date"
                        value={
                          profile.dataAdmissao
                            ? String(profile.dataAdmissao).substring(0, 10)
                            : profile.createdAt
                              ? parseDateSafely(profile.createdAt)
                                  .toISOString()
                                  .substring(0, 10)
                              : ""
                        }
                        onImmediateTrack={(val) => trackField("dataAdmissao", val)}
                        onChange={(val) => {
                          const newVenc = val
                            ? new Date(
                                new Date(val).getTime() + 7 * 86400000
                              ).toISOString()
                            : profile.vencimentoPagamento;
                          updateProfileField({
                            dataAdmissao: val,
                            vencimentoPagamento: newVenc,
                          });
                        }}
                        className="w-full mt-2 px-3.5 py-2.5 bg-white border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors text-sm text-forest tabular-nums"
                      />
                    </div>
                    <p className="text-[11px] text-forest/60 leading-relaxed">
                      Data de referência do seu ingresso. Prazo inicial de 7 dias até{" "}
                      <strong className="text-forest tabular-nums">
                        {profile.vencimentoPagamento
                          ? formatDateSafely(profile.vencimentoPagamento)
                          : "7 dias após a admissão"}
                      </strong>
                      .
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SUB-ABA 2: ATUAÇÃO & SERVIÇOS (Formação, Cota, Públicos, Serviços)*/}
          {/* ================================================================= */}
          {activeSubTab === "atuacao" && (
            <div className="flex flex-col gap-8">
              {/* Bloco 2.1: Profissão, Registro e Formação */}
              <div className="space-y-5">
                <div>
                  <h3 className="font-serif text-lg font-bold text-forest">
                    Formação Acadêmica & Registro Profissional
                  </h3>
                  <p className="text-xs text-forest/60 mt-0.5">
                    Credenciais técnicas exibidas aos pacientes e utilizadas nos encaminhamentos da triagem.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2 bg-warm/30 p-4 rounded-2xl border border-soft space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <label className="text-xs uppercase font-bold tracking-wider text-forest/75">
                        Profissão / Atuação Principal *
                      </label>
                      <span className="text-[11px] text-forest/55">
                        Selecione na lista ou personalize ao lado
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <select
                        value={
                          PROFISSOES_PADRAO.includes(profile.profissao)
                            ? profile.profissao
                            : profile.profissao
                              ? "Outro"
                              : ""
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== "Outro") {
                            updateProfileField({ profissao: val });
                          }
                        }}
                        className="w-full px-4 py-2.5 bg-white border border-soft rounded-xl focus:outline-none focus:border-sun-dark text-sm text-forest"
                      >
                        <option value="">Selecione uma profissão...</option>
                        {PROFISSOES_PADRAO.map((prof) => (
                          <option key={prof} value={prof}>
                            {prof}
                          </option>
                        ))}
                        <option value="Outro">Outra opção (digitar ao lado)</option>
                      </select>
                      <FastInput
                        type="text"
                        value={profile.profissao || ""}
                        placeholder="Título exato da profissão..."
                        onImmediateTrack={(val) => trackField("profissao", val)}
                        onChange={(val) => updateProfileField({ profissao: val })}
                        className="w-full px-4 py-2.5 bg-white border border-soft rounded-xl focus:outline-none focus:border-sun-dark text-sm text-forest"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs uppercase font-bold tracking-wider text-forest/70">
                      CRP / Conselho Profissional
                    </label>
                    <FastInput
                      type="text"
                      value={profile.crp || ""}
                      placeholder="Ex: 06/123456"
                      onImmediateTrack={(val) => trackField("crp", val)}
                      onChange={(val) => updateProfileField({ crp: val })}
                      className="w-full mt-1.5 px-4 py-2.5 bg-warm/40 border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors text-sm text-forest font-mono tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase font-bold tracking-wider text-forest/70">
                      Ano de Formação / Graduação
                    </label>
                    <FastInput
                      type="number"
                      value={profile.anoFormacao || ""}
                      placeholder="Ex: 2018"
                      onImmediateTrack={(val) => trackField("anoFormacao", val)}
                      onChange={(val) => updateProfileField({ anoFormacao: val })}
                      className="w-full mt-1.5 px-4 py-2.5 bg-warm/40 border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors text-sm text-forest tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase font-bold tracking-wider text-forest/70">
                      Abordagens Psicológicas Principais
                    </label>
                    <FastInput
                      type="text"
                      value={profile.abordagem || ""}
                      placeholder="Ex: TCC, Psicanálise, Gestalt-terapia, Humanista..."
                      onImmediateTrack={(val) => trackField("abordagem", val)}
                      onChange={(val) => updateProfileField({ abordagem: val })}
                      className="w-full mt-1.5 px-4 py-2.5 bg-warm/40 border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors text-sm text-forest"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase font-bold tracking-wider text-forest/70">
                      Especialidades / Pós-graduações
                    </label>
                    <FastInput
                      type="text"
                      value={profile.especialidade || ""}
                      placeholder="Ex: Terapia de Casal, Neuropsicologia, Ansiedade..."
                      onImmediateTrack={(val) => trackField("especialidade", val)}
                      onChange={(val) =>
                        updateProfileField({ especialidade: val })
                      }
                      className="w-full mt-1.5 px-4 py-2.5 bg-warm/40 border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors text-sm text-forest"
                    />
                  </div>
                </div>
              </div>

              {/* Bloco 2.2: Cota de Horas Mensais & Faixas */}
              <div className="pt-6 border-t border-soft/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-serif text-lg font-bold text-forest">
                        Cota de Horas Mensais & Faixas na Rede
                      </h3>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        Mínimo 8h Ativo
                      </span>
                    </div>
                    <p className="text-xs text-forest/60 mt-0.5">
                      Define quantas horas mensais sua grade disponibiliza para encaminhamentos da plataforma.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onOpenGerenciarCotaModal}
                    className="py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Sliders className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Gerenciar Cota & Faixas</span>
                  </button>
                </div>

                {(() => {
                  const rawTotal = parseMaxHorasDisponiveis(
                    profile?.horasDisponiveis
                  );
                  const h30 = profile?.aceitaAtendimento30Reais
                    ? parseHorasNumber(profile?.horasAtendimento30Reais) || 0
                    : 0;
                  const hGratuito = profile?.aceitaAtendimentoGratuito
                    ? parseHorasNumber(profile?.horasAtendimentoGratuito) || 0
                    : 0;
                  let hRegular = profile?.horasRegular
                    ? parseHorasNumber(profile.horasRegular)
                    : 0;
                  if (hRegular < 8) {
                    hRegular = Math.max(
                      8,
                      (rawTotal > 0 ? rawTotal : 8) - h30 - hGratuito
                    );
                    if (hRegular % 2 !== 0) hRegular += 1;
                  }
                  const maxHoras = Math.max(8, hRegular + h30 + hGratuito);

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
                      <div className="bg-warm/50 p-3.5 rounded-2xl border border-soft">
                        <span className="text-[11px] font-semibold text-forest/65 block">
                          Total Ofertado
                        </span>
                        <strong className="text-xl font-extrabold text-forest mt-0.5 block">
                          {maxHoras}h/mês
                        </strong>
                      </div>
                      <div className="bg-warm/30 p-3.5 rounded-2xl border border-soft">
                        <span className="text-[11px] font-semibold text-emerald-800 block">
                          Faixa Regular
                        </span>
                        <strong className="text-xl font-extrabold text-forest mt-0.5 block">
                          {hRegular}h
                        </strong>
                      </div>
                      <div className="bg-amber-50/50 p-3.5 rounded-2xl border border-amber-200/80">
                        <span className="text-[11px] font-semibold text-amber-900 block">
                          Social (R$ 30)
                        </span>
                        <strong className="text-xl font-extrabold text-amber-950 mt-0.5 block">
                          {h30}h
                        </strong>
                      </div>
                      <div className="bg-blue-50/50 p-3.5 rounded-2xl border border-blue-200/80">
                        <span className="text-[11px] font-semibold text-blue-900 block">
                          Pro Bono (Gratuito)
                        </span>
                        <strong className="text-xl font-extrabold text-blue-950 mt-0.5 block">
                          {hGratuito}h
                        </strong>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Bloco 2.3: Público-Alvo & Afinidade */}
              <div className="pt-6 border-t border-soft/80 space-y-5">
                <div>
                  <h3 className="font-serif text-lg font-bold text-forest">
                    Público-Alvo & Dinâmicas de Atendimento
                  </h3>
                  <p className="text-xs text-forest/60 mt-0.5">
                    Ajuda a equipe de triagem a encaminhar casos alinhados à sua experiência e preferência clínica.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Experiência */}
                  <div className="flex flex-col gap-3 bg-warm/30 p-5 rounded-2xl border border-soft">
                    <label className="text-xs font-bold uppercase tracking-wider text-forest/80 leading-relaxed">
                      Experiência mínima de 1 ano no atendimento de:
                    </label>
                    <div className="grid grid-cols-2 gap-2.5 mt-1">
                      {PUBLICOS_OPCOES.map((op) => {
                        const current = Array.isArray(profile.publicosExperiencia)
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
                                const next = isChecked
                                  ? current.filter((v: string) => v !== op)
                                  : [...current, op];
                                updateProfileField({
                                  publicosExperiencia: next,
                                });
                              }}
                              className="accent-forest rounded border-soft w-4 h-4 cursor-pointer"
                            />
                            <span>{op}</span>
                          </label>
                        );
                      })}
                    </div>
                    {Array.isArray(profile.publicosExperiencia) &&
                      profile.publicosExperiencia.includes("Outros") && (
                        <FastInput
                          type="text"
                          placeholder="Especifique outros públicos de experiência"
                          value={profile.outrosPublicosExperiencia || ""}
                          onImmediateTrack={(val) =>
                            trackField("outrosPublicosExperiencia", val)
                          }
                          onChange={(val) =>
                            updateProfileField({
                              outrosPublicosExperiencia: val,
                            })
                          }
                          className="w-full mt-2 px-3 py-2 bg-white border border-soft rounded-xl text-xs focus:outline-none focus:border-sun-dark"
                        />
                      )}
                  </div>

                  {/* Afinidade */}
                  <div className="flex flex-col gap-3 bg-warm/30 p-5 rounded-2xl border border-soft">
                    <label className="text-xs font-bold uppercase tracking-wider text-forest/80 leading-relaxed">
                      Maior afinidade / preferência em atender:
                    </label>
                    <div className="grid grid-cols-2 gap-2.5 mt-1">
                      {PUBLICOS_OPCOES.map((op) => {
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
                                const next = isChecked
                                  ? current.filter((v: string) => v !== op)
                                  : [...current, op];
                                updateProfileField({ publicosGosto: next });
                              }}
                              className="accent-forest rounded border-soft w-4 h-4 cursor-pointer"
                            />
                            <span>{op}</span>
                          </label>
                        );
                      })}
                    </div>
                    {Array.isArray(profile.publicosGosto) &&
                      profile.publicosGosto.includes("Outros") && (
                        <FastInput
                          type="text"
                          placeholder="Especifique outros públicos de afinidade"
                          value={profile.outrosPublicosGosto || ""}
                          onImmediateTrack={(val) =>
                            trackField("outrosPublicosGosto", val)
                          }
                          onChange={(val) =>
                            updateProfileField({ outrosPublicosGosto: val })
                          }
                          className="w-full mt-2 px-3 py-2 bg-white border border-soft rounded-xl text-xs focus:outline-none focus:border-sun-dark"
                        />
                      )}
                  </div>
                </div>
              </div>

              {/* Bloco 2.4: Serviços Oferecidos */}
              <div className="pt-6 border-t border-soft/80 space-y-4">
                <div>
                  <h3 className="font-serif text-lg font-bold text-forest">
                    Serviços Profissionais que Ofereço
                  </h3>
                  <p className="text-xs text-forest/60 mt-0.5">
                    Marque os serviços realizados por você e sinalize quais também aceitam orçamento acessível pela rede.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {OPCOES_SERVICOS_REDE.map((op) => {
                    const currentOferecidos = Array.isArray(
                      profile.servicosOferecidos
                    )
                      ? profile.servicosOferecidos
                      : [];
                    const currentAcessivel = Array.isArray(
                      profile.servicosOrcamentoAcessivel
                    )
                      ? profile.servicosOrcamentoAcessivel
                      : [];
                    const isOferecido = currentOferecidos.includes(op);
                    const isAcessivel = currentAcessivel.includes(op);

                    return (
                      <div
                        key={`srv-edit-${op}`}
                        className={`p-4 rounded-2xl border transition-colors flex flex-col gap-2.5 ${
                          isOferecido
                            ? "bg-warm/30 border-emerald-300/80"
                            : "bg-warm/15 border-soft"
                        }`}
                      >
                        <label className="flex items-start gap-2.5 text-sm font-semibold text-forest cursor-pointer select-none leading-snug">
                          <input
                            type="checkbox"
                            checked={isOferecido}
                            onChange={() => {
                              const nextOferecidos = isOferecido
                                ? currentOferecidos.filter(
                                    (v: string) => v !== op
                                  )
                                : [...currentOferecidos, op];
                              updateProfileField({
                                servicosOferecidos: nextOferecidos,
                              });
                            }}
                            className="accent-forest rounded border-soft w-4 h-4 mt-0.5 cursor-pointer shrink-0"
                          />
                          <span>{op === "Outros" ? "Outros (especificar)" : op}</span>
                        </label>
                        {isOferecido && (
                          <div className="pl-6 flex flex-col gap-2 border-t border-soft/60 pt-2.5">
                            {op === "Outros" && (
                              <FastInput
                                type="text"
                                placeholder="Especifique outros serviços..."
                                value={profile.outrosServicos || ""}
                                onImmediateTrack={(val) =>
                                  trackField("outrosServicos", val)
                                }
                                onChange={(val) =>
                                  updateProfileField({ outrosServicos: val })
                                }
                                className="w-full px-3 py-2 bg-white border border-soft rounded-xl text-xs focus:outline-none focus:border-sun-dark text-forest"
                              />
                            )}
                            <label className="flex items-center gap-2 text-xs text-forest/75 cursor-pointer select-none font-medium">
                              <input
                                type="checkbox"
                                checked={isAcessivel}
                                onChange={() => {
                                  const nextAcessivel = isAcessivel
                                    ? currentAcessivel.filter(
                                        (v: string) => v !== op
                                      )
                                    : [...currentAcessivel, op];
                                  updateProfileField({
                                    servicosOrcamentoAcessivel: nextAcessivel,
                                  });
                                }}
                                className="accent-emerald-600 rounded border-soft w-4 h-4 cursor-pointer"
                              />
                              <span>Disponibilizar para orçamento acessível</span>
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SUB-ABA 3: BIOGRAFIA & PROPÓSITO (Apresentação Pública)           */}
          {/* ================================================================= */}
          {activeSubTab === "apresentacao" && (
            <div className="flex flex-col gap-7">
              {renderPublicLinkCard()}

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="font-serif text-lg font-bold text-forest">
                    Mini-Currículo & Biografia Clínica Pública
                  </label>
                  <span className="text-[11px] font-mono text-forest/55 tabular-nums">
                    {(profile.biografia || "").length} caracteres
                  </span>
                </div>
                <p className="text-xs text-forest/65 leading-relaxed">
                  Este texto é exibido na sua página pública de apresentação para pacientes e empresas. Apresente sua trajetória, abordagem terapêutica, principais temas clínicos e como conduz o acolhimento.
                </p>
                <FastTextArea
                  value={profile.biografia || ""}
                  onImmediateTrack={(val) => trackField("biografia", val)}
                  onChange={(val) => updateProfileField({ biografia: val })}
                  placeholder="Escreva um resumo acolhedor e profissional da sua trajetória, abordagem técnica, temas de estudo e estilo de condução clínica..."
                  className="w-full mt-2 px-4 py-3.5 bg-warm/40 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark resize-y min-h-[180px] text-sm leading-relaxed text-forest"
                />
              </div>

              <div className="pt-6 border-t border-soft/80 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="font-serif text-lg font-bold text-forest">
                    Propósito & Motivação como Associado(a)
                  </label>
                  <span className="text-[11px] font-mono text-forest/55 tabular-nums">
                    {(profile.motivacaoProjeto || "").length} caracteres
                  </span>
                </div>
                <p className="text-xs text-forest/65 leading-relaxed">
                  Por que você faz parte deste projeto? Compartilhe o que move seu cuidado clínico e compromisso ético com a democratização da saúde mental.
                </p>
                <FastTextArea
                  value={profile.motivacaoProjeto || ""}
                  onImmediateTrack={(val) => trackField("motivacaoProjeto", val)}
                  onChange={(val) =>
                    updateProfileField({ motivacaoProjeto: val })
                  }
                  placeholder="Conte o que inspira sua atuação clínica e parceria com a rede..."
                  className="w-full mt-2 px-4 py-3.5 bg-warm/40 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark resize-y min-h-[140px] text-sm leading-relaxed text-forest"
                />
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SUB-ABA 4: FATURAMENTO & PIX (Contas CPF, Caixa Físico e CNPJ)    */}
          {/* ================================================================= */}
          {activeSubTab === "faturamento" && (
            <div className="flex flex-col gap-7">
              <div className="space-y-4">
                <div>
                  <h3 className="font-serif text-lg font-bold text-forest">
                    Chave PIX Principal & Referência Padrão
                  </h3>
                  <p className="text-xs text-forest/60 mt-0.5">
                    Dados rápidos de recebimento padrão sincronizados com seus recibos e cobranças.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs uppercase font-bold tracking-wider text-forest/70">
                      Chave PIX Principal (Recebimento de Serviços)
                    </label>
                    <FastInput
                      type="text"
                      value={profile.pixKey || profile.chavePix || ""}
                      placeholder="CPF, E-mail, Celular ou Chave Aleatória"
                      onImmediateTrack={(val) => {
                        trackField("pixKey", val);
                        trackField("chavePix", val);
                      }}
                      onChange={(val) =>
                        updateProfileField({ pixKey: val, chavePix: val })
                      }
                      className="w-full mt-1.5 px-4 py-2.5 bg-warm/40 border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors text-sm text-forest font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs uppercase font-bold tracking-wider text-forest/70">
                      CPF Titular de Referência
                    </label>
                    <FastInput
                      type="text"
                      value={profile.cpf || ""}
                      placeholder="000.000.000-00"
                      onImmediateTrack={(val) => trackField("cpf", val)}
                      onChange={(val) => updateProfileField({ cpf: val })}
                      className="w-full mt-1.5 px-4 py-2.5 bg-warm/40 border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-colors text-sm text-forest font-mono tabular-nums"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-soft/80 space-y-4">
                <div>
                  <h3 className="font-serif text-lg font-bold text-forest">
                    Carteira de Perfis de Faturamento & Contas de Recebimento
                  </h3>
                  <p className="text-xs text-forest/65 mt-0.5 leading-relaxed">
                    Cadastre quantos perfis desejar por via — múltiplas contas <strong>CPF (PF)</strong>, <strong>Caixa em Dinheiro Físico</strong> (com opção de não declarar no IRPF) e múltiplas empresas <strong>CNPJ (PJ)</strong>. Todos ficam integrados automaticamente em <strong>Meus Pacientes</strong> (Valores Acessíveis, Corporativos e Externos), <strong>Contratos Terapêuticos</strong>, <strong>Empresas (B2B)</strong> e <strong>Faturamento Consolidado</strong>.
                  </p>
                </div>

                <PerfisFaturamentoPanel
                  perfis={normalizePerfisFaturamento(profile)}
                  profissionalNomePadrao={profile.name || profile.nome || ""}
                  showToast={showToast}
                  onSavePerfis={async (novosPerfis) => {
                    const syncFields = extractLegacySyncFields(
                      novosPerfis,
                      profile.cpf,
                      profile.pixKey || profile.chavePix
                    );
                    updateProfileField(syncFields);
                    if (user?.uid) {
                      try {
                        await updateDoc(doc(db, "users", user.uid), {
                          ...syncFields,
                          updatedAt: serverTimestamp(),
                        });
                        showToast(
                          "Carteira de perfis de faturamento salva no seu perfil!",
                          "success"
                        );
                      } catch (err) {
                        console.error("Erro ao salvar perfis no perfil:", err);
                        try {
                          handleFirestoreError(
                            err,
                            OperationType.UPDATE,
                            `users/${user.uid}`
                          );
                        } catch {}
                        showToast(
                          "Erro ao salvar perfis de faturamento.",
                          "error"
                        );
                      }
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SUB-ABA 5: PÁGINA PÚBLICA & IDENTIDADE WHITE-LABEL                */}
          {/* ================================================================= */}
          {activeSubTab === "paginaPublica" && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-forest">
                    Minha Página Pública & Cartão Virtual
                  </h3>
                  <p className="text-xs text-forest/65 mt-0.5">
                    Escolha quais conteúdos deseja expor na sua vitrine profissional e configure sua identidade White-Label.
                  </p>
                </div>
                <span
                  className={`text-[11px] font-bold uppercase px-3 py-1 rounded-lg border ${
                    hasIntegrarFeatures(profile)
                      ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                      : "bg-warm text-forest/80 border-soft"
                  }`}
                >
                  Plano Atual:{" "}
                  {getPlanDisplayName(profile, planosConfig, planosSchemaVersion)}
                </span>
              </div>

              {renderPublicLinkCard()}

              {/* Controles de Exposição de Eventos e Artigos — Liberados em TODOS os Planos */}
              <div className="bg-warm/30 border border-soft rounded-3xl p-5 sm:p-6 flex flex-col gap-4">
                <div>
                  <h4 className="font-serif text-base sm:text-lg font-bold text-forest">
                    Conteúdos Exibidos na Minha Página Pública
                  </h4>
                  <p className="text-xs text-forest/65 mt-0.5 leading-relaxed">
                    Disponível em todos os planos: escolha se deseja expor automaticamente seus eventos/serviços criados em <strong>Eventos e Parcerias</strong> e seus textos publicados em <strong>Meus Artigos (Blog)</strong> dentro da sua página profissional.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="bg-white p-4 rounded-2xl border border-soft flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-forest block leading-snug">
                        Exibir Eventos, Workshops e Serviços
                      </span>
                      <span className="text-xs text-forest/60 block mt-0.5 leading-snug">
                        Mostra na sua página pública as oportunidades criadas por você em Eventos e Parcerias.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={profile.exibirEventosPaginaPublica !== false}
                        onChange={(e) =>
                          handleTogglePublicVisibility(
                            "exibirEventosPaginaPublica",
                            e.target.checked,
                          )
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                    </label>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-soft flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-forest block leading-snug">
                        Exibir Meus Artigos do Blog
                      </span>
                      <span className="text-xs text-forest/60 block mt-0.5 leading-snug">
                        Mostra na sua página pública os artigos de sua autoria aprovados e publicados no Blog.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={profile.exibirArtigosPaginaPublica !== false}
                        onChange={(e) =>
                          handleTogglePublicVisibility(
                            "exibirArtigosPaginaPublica",
                            e.target.checked,
                          )
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
                    </label>
                  </div>
                </div>
              </div>

              <WhiteLabelProfileConfigPanel
                profile={profile}
                setProfile={(next) => {
                  if (typeof next === "function") {
                    setProfile(next);
                  } else {
                    setProfile(next);
                  }
                }}
                showToast={(msg, type) => showToast(msg, type)}
                onGoToPlanos={onGoToPlanos}
              />
            </div>
          )}

          {/* Barra Inferior Unificada: Navegação entre Seções + Botão Principal Salvar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-soft">
            <div className="flex items-center gap-2 flex-wrap">
              {prevTab && (
                <button
                  type="button"
                  onClick={() => setActiveSubTab(prevTab.id)}
                  className="px-3.5 py-2.5 bg-warm hover:bg-soft text-forest text-xs font-semibold rounded-xl border border-soft transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior: {prevTab.label}</span>
                </button>
              )}
              {nextTab && (
                <button
                  type="button"
                  onClick={() => setActiveSubTab(nextTab.id)}
                  className="px-3.5 py-2.5 bg-warm hover:bg-soft text-forest text-xs font-semibold rounded-xl border border-soft transition-colors inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Próxima: {nextTab.label}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveAll}
              className="px-6 py-3 bg-forest hover:bg-forest/90 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-all shadow-xs cursor-pointer inline-flex items-center justify-center gap-2 disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-sun" />
                  <span>Salvando Perfil...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-sun" />
                  <span>Salvar Minha Ficha Cadastral e Perfil</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
