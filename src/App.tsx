/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  ArrowRight,
  Briefcase,
  Leaf,
  User,
  HeartHandshake,
  Map,
  ClipboardList,
  SearchCheck,
  MessageCircleHeart,
  Activity,
  Aperture,
  Box,
  Cloud,
  Globe,
  Layers,
  Zap,
  X,
  ChevronDown,
  ChevronUp,
  Menu,
  BookOpen,
  Star,
  Clock,
  UserCheck,
  Building2,
  Users,
  BarChart3,
  ShieldCheck,
  CalendarCheck,
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { auth, db } from "./lib/firebase";
import { ArtigoBlog } from "./types/blog";
import { AcolhimentoView } from "./views/AcolhimentoView";
import { PublicProfProfileView } from "./views/PublicProfProfileView";
import { PublicServiceView } from "./views/PublicServiceView";
import { DashboardView } from "./views/DashboardView";
import { EmpresaView } from "./views/EmpresaView";
import { DoacaoView } from "./views/DoacaoView";
import { ProfissionalLandingView } from "./views/ProfissionalLandingView";
import { ContratoLandingView } from "./views/ContratoLandingView";
import { PropostaLandingView } from "./views/PropostaLandingView";
import { FichaEmpresaLandingView } from "./views/FichaEmpresaLandingView";
import { BlogView } from "./views/BlogView";

import { Footer } from "./components/Footer";
import { ProfissionaisCarousel } from "./components/ProfissionaisCarousel";
import { PWAInstallBanner } from "./components/PWAInstallBanner";
import { CampanhaPrevencaoBanner } from "./components/CampanhaPrevencaoBanner";
import { BlurImageBackground } from "./components/BlurImageBackground";

import homeHero from "./assets/images/home_hero_photo_parda_1781024318036.png";
import logoImage from "./assets/images/logo_acolhe.jpeg";

/**
 * Ícone da letra grega Psi (Ψ) - Símbolo universal da Psicologia
 * Desenhado no mesmo grid (24x24), espessura de traço (stroke-2) e terminações arredondadas dos ícones Lucide.
 */
function PsiIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Eixo central vertical */}
      <path d="M12 3v18" />
      {/* Taça curva característica do Psi */}
      <path d="M5 8v2a7 7 0 0 0 14 0V8" />
      {/* Base de apoio horizontal */}
      <path d="M9 21h6" />
    </svg>
  );
}

const JORNADAS_DATA = {
  paciente: {
    id: "paciente" as const,
    badge: "Para quem busca acolhimento",
    tituloAba: "Paciente",
    subtitulo: "Acolhimento Individual",
    descricao: "Conexão direta ao psicólogo ideal com acolhimento humanizado, horários flexíveis e sessões com valor acessível ou subsídio corporativo.",
    linhaCor: "border-sun/60",
    ctaText: "Iniciar Triagem como Paciente",
    ctaView: "acolhimento" as const,
    passos: [
      {
        num: "01",
        titulo: "Triagem ou Código da Empresa",
        descricao: "Preencha a triagem inicial rápida para valor social acessível ou insira o código fornecido pela sua empresa parceira.",
        icon: ClipboardList,
        iconBg: "bg-sun text-forest border-sun",
        badgeBg: "bg-sun/30 text-amber-950 font-bold",
        cardBg: "bg-warm/80 border-white",
      },
      {
        num: "02",
        titulo: "Pareamento Clínico e Proposta",
        descricao: "A nossa equipe técnica analisa suas preferências e necessidades para direcioná-lo com assertividade ao psicólogo ideal.",
        icon: SearchCheck,
        iconBg: "bg-forest/10 text-forest border-forest/20",
        badgeBg: "bg-forest/10 text-forest font-bold",
        cardBg: "bg-warm/80 border-white",
      },
      {
        num: "03",
        titulo: "Início do Acolhimento",
        descricao: "Conecte-se com o seu psicólogo e dê início à sua jornada terapêutica em um ambiente seguro, ético e sigiloso.",
        icon: MessageCircleHeart,
        iconBg: "bg-sun text-forest border-sun",
        badgeBg: "bg-sun/30 text-amber-950 font-bold",
        cardBg: "bg-warm/75 backdrop-blur-xs border-white/90",
      },
    ],
  },
  empresa: {
    id: "empresa" as const,
    badge: "Para organizações e RHs",
    tituloAba: "Empresa (NR-1)",
    subtitulo: "Saúde Mental Corporativa",
    descricao: "Programa de saúde mental para equipes em conformidade com as diretrizes psicossociais da NR-1, reduzindo absenteísmo e cuidando de pessoas.",
    linhaCor: "border-forest/40",
    ctaText: "Ver Soluções para Empresas",
    ctaView: "empresa" as const,
    passos: [
      {
        num: "01",
        titulo: "Diagnóstico & Ativação do Plano",
        descricao: "Mapeamos a estrutura e demandas da sua organização para ativar o benefício corporativo sob medida, sem complicações.",
        icon: Building2,
        iconBg: "bg-forest text-white border-forest",
        badgeBg: "bg-forest/10 text-forest font-bold",
        cardBg: "bg-forest/[0.04] backdrop-blur-xs border-forest/15",
      },
      {
        num: "02",
        titulo: "Distribuição Segura aos Colaboradores",
        descricao: "Sua equipe recebe códigos de acesso confidenciais para agendamento direto na plataforma, com total privacidade e sigilo ético (LGPD).",
        icon: Users,
        iconBg: "bg-sun text-forest border-sun",
        badgeBg: "bg-sun/30 text-amber-950 font-bold",
        cardBg: "bg-forest/[0.04] backdrop-blur-xs border-forest/15",
      },
      {
        num: "03",
        titulo: "Relatórios de Clima e Conformidade NR-1",
        descricao: "O RH acompanha indicadores anônimos de adesão, bem-estar coletivo e respaldo documental para conformidade legal.",
        icon: BarChart3,
        iconBg: "bg-forest text-white border-forest",
        badgeBg: "bg-forest/10 text-forest font-bold",
        cardBg: "bg-forest/[0.04] backdrop-blur-xs border-forest/15",
      },
    ],
  },
  terapeuta: {
    id: "terapeuta" as const,
    badge: "Para psicólogos e terapeutas",
    tituloAba: "Psicólogo / Terapeuta",
    subtitulo: "Rede Credenciada",
    descricao: "Integre uma rede acolhedora com encaminhamentos alinhados à sua abordagem, ferramentas de prontuário e gestão financeira segura.",
    linhaCor: "border-sun-dark/50",
    ctaText: "Quero me Credenciar",
    ctaView: "profissional" as const,
    passos: [
      {
        num: "01",
        titulo: "Cadastro e Verificação de CRP",
        descricao: "Envie suas informações profissionais, número de CRP ativo e linhas teóricas para validação técnica da nossa coordenação.",
        icon: PsiIcon,
        iconBg: "bg-sun text-forest border-sun",
        badgeBg: "bg-sun/30 text-amber-950 font-bold",
        cardBg: "bg-warm/80 backdrop-blur-xs border-soft/80",
      },
      {
        num: "02",
        titulo: "Prontuário Digital & Rede Interprofissional",
        descricao: "Acesse prontuário seguro e faça parte de uma rede ativa que conecta profissionais a profissionais — compartilhando encaminhamentos, discussões de casos éticas e troca de serviços em saúde mental.",
        icon: Users,
        iconBg: "bg-forest/10 text-forest border-forest/20",
        badgeBg: "bg-forest/10 text-forest font-bold",
        cardBg: "bg-warm/80 backdrop-blur-xs border-soft/80",
      },
      {
        num: "03",
        titulo: "Pacientes na sua Agenda",
        descricao: "Receba pacientes compatíveis com seu perfil terapêutico e disponibilidade, com total autonomia sobre seus agendamentos e pagamentos.",
        icon: CalendarCheck,
        iconBg: "bg-sun-dark text-forest border-sun-dark",
        badgeBg: "bg-sun/30 text-amber-950 font-bold",
        cardBg: "bg-warm/80 backdrop-blur-xs border-soft/80",
      },
    ],
  },
};

const COMPANY_LOGOS = [
  { icon: Activity, name: "VitaTech Health" },
  { icon: Aperture, name: "Nexus Healthcare" },
  { icon: Box, name: "BlockCorp Solutions" },
  { icon: Cloud, name: "Cloud9 Logistics" },
  { icon: Globe, name: "Global Reach Inc." },
  { icon: Layers, name: "Stack Innovations" },
  { icon: Zap, name: "Zapp Power" },
];

const FAQ_ITEMS = [
  {
    question: "Como funciona o processo de triagem?",
    answer: "A triagem é o nosso primeiro passo para entender suas necessidades. Você preenche um formulário rápido e seguro, e nossa equipe técnica analisa suas respostas para conectar você ao profissional mais adequado ao seu perfil e demandas."
  },
  {
    question: "Os valores das sessões são acessíveis?",
    answer: "Sim! Nosso compromisso é democratizar o acesso à saúde mental. Trabalhamos com uma rede de profissionais parceiros que oferecem horários com valores reduzidos, adequados à realidade de quem busca ajuda."
  },
  {
    question: "Como funciona o benefício corporativo?",
    answer: "Empresas parceiras podem oferecer a AcolheMente como benefício para seus colaboradores (ajudando no cumprimento da NR1). O colaborador recebe um código da empresa, insere na nossa plataforma e tem acesso imediato à nossa rede de profissionais com o subsídio corporativo."
  },
  {
    question: "Posso escolher o meu psicólogo?",
    answer: "Nossa equipe realiza a indicação inicial baseada no seu perfil para garantir a melhor compatibilidade técnica e terapêutica. Porém, caso você não se adapte, o processo de troca é simples e você tem total liberdade para solicitar."
  },
  {
    question: "Como faço para doar uma sessão?",
    answer: "Qualquer pessoa pode apadrinhar o tratamento de alguém em situação de vulnerabilidade. Basta clicar em 'Doe uma sessão de terapia', escolher o valor e realizar o PIX. 100% do valor é convertido em sessões para nossa lista de espera."
  },
  {
    question: "Quanto tempo dura uma sessão de terapia?",
    answer: "As sessões de terapia têm duração média de 45 a 50 minutos, tempo ideal para garantir um atendimento de qualidade e profundidade."
  },
  {
    question: "Os psicólogos e terapeutas são todos licenciados?",
    answer: "Sim, todos os profissionais parceiros passam por um processo rigoroso de seleção, onde o critério básico é possuir o registro profissional (CRP) ativo e atualizado, além de comprovada experiência em atendimento clínico."
  },
  {
    question: "Atende crianças?",
    answer: "Nossos atendimentos são focados em pessoas a partir de 12 anos. O formato de terapia online apresenta limitações para o público infantil devido à necessidade de recursos e ferramentas terapêuticas lúdicas presenciais. Por isso, recomendamos a idade mínima de 12 anos para garantir a eficácia do tratamento."
  },
  {
    question: "Os preços são fixos?",
    answer: "Respeitamos faixas de valores solidários que variam entre R$ 30 e R$ 110 por sessão para atendimentos particulares que passam por triagem socioeconômica. No caso de benefício corporativo, os valores são personalizados por contrato com a empresa. Em ambos os casos, o valor mantém-se fixo, sendo reajustado apenas anualmente com base no índice do INPC ou índice similar."
  }
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="border border-soft rounded-2xl bg-white overflow-hidden shadow-sm transition-all duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left focus:outline-none group hover:bg-warm/30 transition-colors"
      >
        <span className="font-serif font-medium text-lg text-forest group-hover:text-forest/80 transition-colors">{question}</span>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${isOpen ? 'bg-sun text-forest' : 'bg-warm text-forest/60'}`}>
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>
      <motion.div
        initial={false}
        animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="overflow-hidden"
      >
        <div className="px-6 pb-6 text-forest/75 leading-relaxed text-sm">
          {answer}
        </div>
      </motion.div>
    </div>
  );
}

function FAQSection() {
  const [faqSearch, setFaqSearch] = useState("");

  const filteredFaqs = FAQ_ITEMS.filter((item) =>
    item.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
    item.answer.toLowerCase().includes(faqSearch.toLowerCase())
  );

  return (
    <section className="w-full bg-warm pb-20 pt-10 flex flex-col items-center">
      <div className="w-full max-w-[800px] px-6 md:px-12 flex flex-col items-center gap-8">
        <div className="text-center flex flex-col items-center gap-3">
          <h2 className="font-serif text-3xl md:text-4xl text-forest">
            Perguntas Frequentes
          </h2>
          <p className="text-forest/70 text-sm md:text-base max-w-md">
            Tire suas dúvidas sobre nosso processo de triagem, valores e benefícios.
          </p>
        </div>

        <div className="w-full relative max-w-md">
          <SearchCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-forest/40" />
          <input
            type="text"
            value={faqSearch}
            onChange={(e) => setFaqSearch(e.target.value)}
            placeholder="Buscar dúvida..."
            className="w-full pl-12 pr-4 py-3 rounded-full border border-soft focus:outline-none focus:border-forest/40 focus:ring-2 focus:ring-forest/10 transition-all text-forest placeholder:text-forest/40 bg-white"
          />
          {faqSearch && (
            <button
              onClick={() => setFaqSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-forest/40 hover:text-forest transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div className="w-full flex flex-col gap-4">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((item, index) => (
              <FAQItem key={index} question={item.question} answer={item.answer} />
            ))
          ) : (
            <div className="text-center py-8 text-forest/60">
              Nenhuma pergunta encontrada para "{faqSearch}".
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [publicProfUid, setPublicProfUid] = useState<string | null>(() => {
    return new URLSearchParams(window.location.search).get("prof");
  });
  const [publicServiceId, setPublicServiceId] = useState<string | null>(() => {
    return new URLSearchParams(window.location.search).get("servico");
  });
  const [publicEventoId, setPublicEventoId] = useState<string | null>(() => {
    return new URLSearchParams(window.location.search).get("evento");
  });
  const [publicContratoId, setPublicContratoId] = useState<string | null>(() => {
    return new URLSearchParams(window.location.search).get("contrato");
  });
  const [publicPropostaId, setPublicPropostaId] = useState<string | null>(() => {
    return new URLSearchParams(window.location.search).get("proposta");
  });
  const [publicFichaEmpresaId, setPublicFichaEmpresaId] = useState<string | null>(() => {
    return new URLSearchParams(window.location.search).get("ficha_empresa") || new URLSearchParams(window.location.search).get("empresa_ficha");
  });
  const [publicArtigoId, setPublicArtigoId] = useState<string | null>(() => {
    return new URLSearchParams(window.location.search).get("artigo");
  });

  const [currentView, setCurrentView] = useState<
    | "landing"
    | "acolhimento"
    | "dashboard"
    | "profile"
    | "empresa"
    | "doacao"
    | "profissional"
    | "blog"
  >(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get("view") as any;
    if (
      viewParam &&
      [
        "landing",
        "acolhimento",
        "dashboard",
        "profile",
        "empresa",
        "doacao",
        "profissional",
        "blog",
      ].includes(viewParam)
    ) {
      return viewParam;
    }
    return auth.currentUser ? "dashboard" : "landing";
  });

  const [user, setUser] = useState<any>(null);
  const [doacoesAtivas, setDoacoesAtivas] = useState(true);
  const [carrosselEmpresasAtivo, setCarrosselEmpresasAtivo] = useState(true);
  const [metricasAtivas, setMetricasAtivas] = useState(true);

  // Synchronize browser history / popstate
  useEffect(() => {
    const handlePopState = () => {
      const p = new URLSearchParams(window.location.search);
      setPublicProfUid(p.get("prof"));
      setPublicServiceId(p.get("servico"));
      setPublicEventoId(p.get("evento"));
      setPublicContratoId(p.get("contrato"));
      setPublicPropostaId(p.get("proposta"));
      setPublicFichaEmpresaId(p.get("ficha_empresa") || p.get("empresa_ficha"));
      setPublicArtigoId(p.get("artigo"));
      const v = p.get("view");
      if (
        v &&
        [
          "landing",
          "acolhimento",
          "dashboard",
          "profile",
          "empresa",
          "doacao",
          "profissional",
          "blog",
        ].includes(v)
      ) {
        setCurrentView(v as any);
      }
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Garante que qualquer retorno ou transição de tela apresente a página sempre do topo
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [
    currentView,
    publicProfUid,
    publicServiceId,
    publicEventoId,
    publicContratoId,
    publicPropostaId,
    publicArtigoId,
  ]);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      unsub = onSnapshot(doc(db, "configuracoes", "master"), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.doacoesAtivas !== undefined) {
            setDoacoesAtivas(!!data.doacoesAtivas);
          }
          if (data.carrosselEmpresasAtivo !== undefined) {
            setCarrosselEmpresasAtivo(!!data.carrosselEmpresasAtivo);
          }
          if (data.metricasAtivas !== undefined) {
            setMetricasAtivas(!!data.metricasAtivas);
          }
        }
      });
    } catch (err) {
      console.error("Error listening to configs in App.tsx", err);
    }
    return () => {
      if (unsub) unsub();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        // Redireciona para o painel se estiver logado e na landing page sem parâmetro explícito
        setCurrentView((prev) => (prev === "landing" ? "dashboard" : prev));
      }
    });
    return () => unsubscribe();
  }, []);

  const [showDoacaoConfirm, setShowDoacaoConfirm] = useState(false);

  const handleNavigate = (view: any) => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (view === "doacao") {
      if (doacoesAtivas) {
        setShowDoacaoConfirm(true);
      }
    } else if (view === "landing" && auth.currentUser) {
      setCurrentView("dashboard");
    } else {
      setCurrentView(view);
    }
  };

  const handleGoToLanding = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    try {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.pushState({}, "", cleanUrl);
    } catch (e) {
      console.error(e);
    }
    setPublicProfUid(null);
    setPublicServiceId(null);
    setPublicEventoId(null);
    setPublicContratoId(null);
    setPublicPropostaId(null);
    setPublicFichaEmpresaId(null);
    setPublicArtigoId(null);
    setCurrentView("landing");
  };

  const handleBackFromPublicProfile = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    handleGoToLanding();
  };

  if (publicArtigoId || currentView === "blog") {
    return (
      <BlogView
        initialArtigoId={publicArtigoId}
        onNavigate={handleNavigate}
        onGoHome={handleGoToLanding}
        onSelectProf={(uid) => {
          setPublicProfUid(uid);
        }}
      />
    );
  }

  if (publicProfUid) {
    return (
      <PublicProfProfileView
        profUid={publicProfUid}
        onBack={handleBackFromPublicProfile}
        onGoHome={handleGoToLanding}
        onReadArtigo={(artigoId) => {
          setPublicProfUid(null);
          setPublicArtigoId(artigoId);
          setCurrentView("blog");
        }}
      />
    );
  }

  if (publicServiceId || publicEventoId) {
    return (
      <PublicServiceView
        serviceId={publicServiceId}
        eventId={publicEventoId}
        onBack={handleBackFromPublicProfile}
        onGoHome={handleGoToLanding}
      />
    );
  }

  if (publicContratoId) {
    return (
      <ContratoLandingView
        contratoId={publicContratoId}
        onBack={handleBackFromPublicProfile}
        onGoHome={handleGoToLanding}
      />
    );
  }

  if (publicPropostaId) {
    return (
      <PropostaLandingView
        propostaId={publicPropostaId}
        onBack={handleBackFromPublicProfile}
        onGoHome={handleGoToLanding}
      />
    );
  }

  if (publicFichaEmpresaId) {
    return (
      <FichaEmpresaLandingView
        empresaId={publicFichaEmpresaId}
        onBack={handleBackFromPublicProfile}
        onGoHome={handleGoToLanding}
      />
    );
  }

  let content;

  if (currentView === "landing") {
    content = (
      <LandingPage
        onNavigate={handleNavigate}
        onSelectArtigo={(artigoId) => {
          setPublicArtigoId(artigoId);
          setCurrentView("blog");
        }}
        doacoesAtivas={doacoesAtivas}
        carrosselEmpresasAtivo={carrosselEmpresasAtivo}
        metricasAtivas={metricasAtivas}
      />
    );
  } else if (currentView === "acolhimento") {
    content = <AcolhimentoView onNavigate={handleNavigate} />;
  } else if (currentView === "dashboard") {
    content = <DashboardView onNavigate={handleNavigate} />;
  } else if (currentView === "empresa") {
    content = <EmpresaView onNavigate={handleNavigate} />;
  } else if (currentView === "doacao") {
    content = <DoacaoView onNavigate={handleNavigate} />;
  } else if (currentView === "profissional") {
    content = <ProfissionalLandingView onNavigate={handleNavigate} />;
  } else {
    content = (
      <div className="flex h-screen items-center justify-center bg-warm">
        <div className="text-center flex flex-col items-center gap-6">
          <h2 className="text-4xl font-serif text-forest mb-2">
            View: {currentView}
          </h2>
          <p className="text-forest/70 max-w-md">
            Esta simulação de view será substituída pelo dashboard do firebase e
            pelo portal do paciente/profissional futuramente.
          </p>
          <button
            onClick={() => setCurrentView("landing")}
            className="px-6 py-2 border border-sun-dark text-sun-dark text-sm font-semibold uppercase tracking-wider rounded-full hover:bg-sun hover:text-forest transition-colors"
          >
            Voltar para Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {content}
      <PWAInstallBanner />

      {showDoacaoConfirm && (
        <div className="fixed inset-0 bg-forest/45 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
          <div className="max-w-md w-full bg-white rounded-[2.5rem] p-8 md:p-10 border border-soft shadow-2xl flex flex-col items-center text-center gap-6 relative animate-[scaleUp_0.3s_ease-out]">
            <button
              onClick={() => setShowDoacaoConfirm(false)}
              className="absolute top-6 right-6 p-2 text-forest/40 hover:text-forest hover:bg-forest/5 rounded-full transition-all duration-200"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="w-16 h-16 bg-sun-light rounded-full flex items-center justify-center text-forest shadow-sm">
              <HeartHandshake className="w-8 h-8 text-forest" />
            </div>
            
            <div className="flex flex-col gap-2">
              <h3 className="font-serif text-2xl font-semibold tracking-tight text-forest">
                Como funciona a sua doação?
              </h3>
              <p className="text-xs text-forest/70 leading-relaxed max-w-sm">
                Sua generosidade financia acolhimento profissional de verdade. Veja como sua doação de sessão será processada:
              </p>
            </div>

            <div className="flex flex-col gap-4 text-left w-full bg-warm/30 p-5 rounded-2xl border border-soft/50 my-1">
              <div className="flex gap-3 items-start">
                <span className="text-xs shrink-0 bg-sun text-forest rounded-full w-5 h-5 flex items-center justify-center font-bold">1</span>
                <div>
                  <h4 className="text-xs font-bold text-forest py-0.5">Fundo de Apoio Solidário</h4>
                  <p className="text-[11px] text-forest/75 leading-relaxed">
                    100% da sua doação é direcionada para custear consultas psicológicas de pessoas em vulnerabilidade social inscritas na nossa lista de espera.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 items-start">
                <span className="text-xs shrink-0 bg-sun text-forest rounded-full w-5 h-5 flex items-center justify-center font-bold">2</span>
                <div>
                  <h4 className="text-xs font-bold text-forest py-0.5">Segurança via PIX</h4>
                  <p className="text-[11px] text-forest/75 leading-relaxed">
                    Ao prosseguir, você escolhe o valor (cada R$ 50 ajuda a viabilizar atendimentos) e geramos um QR Code PIX oficial e seguro para realizar o pagamento.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <span className="text-xs shrink-0 bg-sun text-forest rounded-full w-5 h-5 flex items-center justify-center font-bold">3</span>
                <div>
                  <h4 className="text-xs font-bold text-forest py-0.5">Envio do Comprovante</h4>
                  <p className="text-[11px] text-forest/75 leading-relaxed">
                    Você pode anexar o comprovante na hora. Assim, garantimos integridade e você pode solicitar relatórios de impacto social no e-mail informado.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={() => setShowDoacaoConfirm(false)}
                className="flex-1 py-3 px-6 border-2 border-soft hover:bg-warm text-forest/75 rounded-full font-bold text-xs transition-colors"
              >
                Agora Não
              </button>
              <button
                onClick={() => {
                  setShowDoacaoConfirm(false);
                  setCurrentView("doacao");
                }}
                className="flex-1 py-3 px-6 bg-forest hover:bg-forest/90 text-white rounded-full font-bold text-xs shadow-md shadow-forest/10 hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                Quero Doar <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function LandingPage({
  onNavigate,
  onSelectArtigo,
  doacoesAtivas = true,
  carrosselEmpresasAtivo = true,
  metricasAtivas = true,
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
  onSelectArtigo?: (artigoId: string) => void;
  doacoesAtivas?: boolean;
  carrosselEmpresasAtivo?: boolean;
  metricasAtivas?: boolean;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [jornadaPublico, setJornadaPublico] = useState<"paciente" | "empresa" | "terapeuta">("paciente");
  const [artigosPublicados, setArtigosPublicados] = useState<ArtigoBlog[]>([]);
  const [loadingArtigos, setLoadingArtigos] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "artigos_blog"),
      where("status", "==", "publicado"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: ArtigoBlog[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        setArtigosPublicados(list);
        setLoadingArtigos(false);
      },
      (err) => {
        console.warn("Erro ao carregar artigos publicados na Home:", err);
        setArtigosPublicados([]);
        setLoadingArtigos(false);
      }
    );
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-warm">
      {/* Banner Sazonal - Campanha de Prevenção ao Suicídio / Valorização da Vida */}
      <CampanhaPrevencaoBanner onNavigateAcolhimento={() => onNavigate("acolhimento")} />

      {/* Navbar */}
      <nav className="w-full py-4 sm:py-6 px-4 sm:px-6 md:px-12 flex justify-between items-center border-b border-soft gap-2 relative z-50 bg-warm/80 backdrop-blur-md">
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-sun rounded-full flex items-center justify-center text-forest overflow-hidden shrink-0 shadow-sm">
            <img
              src={logoImage}
              alt="AcolheMente Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="font-serif text-[20px] sm:text-2xl font-semibold tracking-tight text-forest">
            AcolheMente
          </span>
        </div>

        {/* Minimalist 3-line classic menu dropdown */}
        <div className="relative flex items-center">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2.5 text-forest hover:bg-forest/5 rounded-full transition-all duration-200 focus:outline-none flex items-center justify-center border border-soft/80 cursor-pointer shadow-2xs"
            aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
            id="nav-menu-button"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {isMenuOpen && (
            <>
              {/* Backdrop to close when clicking outside */}
              <div
                className="fixed inset-0 bg-forest/20 backdrop-blur-[2px] z-40"
                onClick={() => setIsMenuOpen(false)}
              />

              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute right-0 top-full mt-3 w-80 max-w-[calc(100vw-2rem)] bg-white border border-soft rounded-[2rem] shadow-2xl py-5 px-6 flex flex-col gap-4 z-50"
              >
                {/* Header do Menu com Botão de Fechar */}
                <div className="flex items-center justify-between pb-3 border-b border-soft">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-base font-bold text-forest">Menu</span>
                  </div>
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="p-1.5 text-forest/60 hover:text-forest hover:bg-warm rounded-full transition-colors flex items-center justify-center cursor-pointer"
                    title="Fechar menu"
                    aria-label="Fechar menu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <a 
                    href="#projeto" 
                    onClick={(e) => {
                      setIsMenuOpen(false);
                      const el = document.getElementById("projeto");
                      if (el) {
                        e.preventDefault();
                        el.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                    className="font-sans text-sm text-forest/85 hover:text-forest hover:bg-warm/60 px-3.5 py-2.5 rounded-xl transition-all font-medium flex items-center justify-between"
                  >
                    <span>O Projeto</span>
                  </a>
                  <a 
                    href="#jornada" 
                    onClick={(e) => {
                      setIsMenuOpen(false);
                      const el = document.getElementById("jornada");
                      if (el) {
                        e.preventDefault();
                        el.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                    className="font-sans text-sm text-forest/85 hover:text-forest hover:bg-warm/60 px-3.5 py-2.5 rounded-xl transition-all font-semibold flex items-center justify-between"
                  >
                    <span>Como Funciona</span>
                  </a>
                  <button 
                    onClick={() => { setIsMenuOpen(false); onNavigate("blog"); }}
                    className="text-left font-sans text-sm text-forest/85 hover:text-forest hover:bg-warm/60 px-3.5 py-2.5 rounded-xl transition-all font-semibold flex items-center justify-between cursor-pointer"
                  >
                    <span>Blog & Artigos Abertos</span>
                    <span className="text-[10px] bg-sun text-forest font-bold px-2 py-0.5 rounded-full">Novo</span>
                  </button>
                  <button 
                    onClick={() => { setIsMenuOpen(false); onNavigate("empresa"); }}
                    className="text-left font-sans text-sm text-forest/85 hover:text-forest hover:bg-warm/60 px-3.5 py-2.5 rounded-xl transition-all font-medium cursor-pointer"
                  >
                    Seja uma Empresa Parceira
                  </button>
                  <button 
                    onClick={() => { setIsMenuOpen(false); onNavigate("profissional"); }}
                    className="text-left font-sans text-sm text-forest/85 hover:text-forest hover:bg-warm/60 px-3.5 py-2.5 rounded-xl transition-all font-medium cursor-pointer"
                  >
                    Seja Profissional Associado
                  </button>
                  {doacoesAtivas && (
                    <button 
                      onClick={() => { setIsMenuOpen(false); onNavigate("doacao"); }}
                      className="text-left font-sans text-sm text-forest/85 hover:text-forest hover:bg-warm/60 px-3.5 py-2.5 rounded-xl transition-all font-medium cursor-pointer"
                    >
                      Doe uma sessão de terapia
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      window.dispatchEvent(new CustomEvent("reopen-campanha-prevencao"));
                    }}
                    className="text-left font-sans text-sm text-amber-950 hover:bg-amber-100/80 bg-amber-50/70 border border-amber-200/80 px-3.5 py-2 rounded-xl transition-all font-semibold flex items-center justify-between cursor-pointer mt-0.5"
                    title="Ver campanha e canais de apoio emocional"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none">🎗️</span>
                      <span>Setembro Amarelo</span>
                    </div>
                    <span className="text-[10px] bg-amber-200 text-amber-950 font-bold px-2 py-0.5 rounded-full">
                      Apoio 188
                    </span>
                  </button>
                </div>
                
                <div className="border-t border-soft pt-3.5 flex flex-col gap-2.5">
                  <span className="text-[10px] uppercase tracking-wider text-forest/40 font-bold px-3">Acesso Restrito</span>
                  <button
                    onClick={() => { setIsMenuOpen(false); onNavigate("dashboard"); }}
                    className="w-full py-3 px-4 bg-sun hover:bg-sun-dark text-forest font-bold text-xs uppercase tracking-wider rounded-full transition-colors shadow-sm text-center cursor-pointer"
                  >
                    Área do Profissional
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center">
        <section
          id="projeto"
          className="relative flex flex-col lg:flex-row gap-6 md:gap-8 px-6 md:px-12 py-8 lg:py-12 max-w-[1440px] w-full justify-between items-center scroll-mt-24 overflow-hidden lg:overflow-visible"
        >
          {/* Depth of Field & Glow Auras: Esferas de luz suave que criam profundidade 3D */}
          <div 
            className="absolute right-2 sm:right-12 top-1/2 -translate-y-1/2 w-72 sm:w-96 lg:w-[480px] h-72 sm:h-96 lg:h-[480px] bg-sun/35 rounded-full blur-[90px] pointer-events-none -z-10 animate-pulse"
            style={{ animationDuration: '7s' }}
          />
          <div 
            className="absolute left-0 sm:left-8 top-1/4 w-60 sm:w-80 h-60 sm:h-80 bg-forest/8 rounded-full blur-[80px] pointer-events-none -z-10"
          />

          <div className="max-w-xl flex flex-col items-center lg:items-start text-center lg:text-left mb-6 lg:mb-0 relative z-10">
            {/* Efeito Visual de Iluminação de Fundo & Acolhimento (Luz Solar + Anéis Sutis) */}
            <div 
              className="absolute -top-10 -left-10 sm:-left-20 w-80 sm:w-[520px] h-80 sm:h-[520px] bg-gradient-to-br from-sun/35 via-amber-200/20 to-transparent rounded-full blur-[95px] pointer-events-none -z-10" 
            />
            <div 
              className="absolute top-1/4 left-1/6 w-52 sm:w-72 h-52 sm:h-72 bg-sun/25 rounded-full blur-[75px] pointer-events-none -z-10 animate-pulse"
              style={{ animationDuration: '6s' }}
            />
            <div 
              className="absolute -bottom-10 -left-6 w-60 sm:w-80 h-60 sm:h-80 bg-forest/8 rounded-full blur-[85px] pointer-events-none -z-10" 
            />

            {/* Anéis Orgânicos Concêntricos Sutis (simbolizando ondas de acolhimento e presença) */}
            <div className="absolute -top-8 -left-8 sm:-left-16 w-72 sm:w-[440px] h-72 sm:h-[440px] rounded-full border border-sun/30 pointer-events-none -z-10 opacity-70" />
            <div className="absolute -top-16 -left-16 sm:-left-28 w-96 sm:w-[560px] h-96 sm:h-[560px] rounded-full border border-forest/15 pointer-events-none -z-10 opacity-50" />

            <div className="mb-4 px-3 py-1 bg-sun-light text-forest text-[10px] font-bold uppercase tracking-[0.2em] w-fit rounded shadow-2xs">
              Valores Acessíveis e Benefício Corporativo
            </div>

            <h1 className="font-serif text-5xl md:text-[84px] leading-[1] md:leading-[0.9] font-medium mb-4 text-forest">
              Terapia e cuidado:{" "}
              <br className="hidden md:block lg:hidden xl:block" />
              <span className="italic">acessível e na palma da mão.</span>
            </h1>

            <p className="text-lg md:text-xl text-forest/80 max-w-xl leading-relaxed mb-6">
              Uma ponte humanizada entre psicoterapeutas e quem busca
              acolhimento. Do particular, com valores acessíveis, ao benefício
              para empresas.
            </p>

            {/* Glassmorphism: Painel translúcido com desfoque de fundo e borda sutil */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 py-3 px-5 bg-white/75 backdrop-blur-md border border-white/80 rounded-2xl shadow-md shadow-forest/5 transition-all hover:bg-white/85">
              {/* Avaliação & Prova Social */}
              <div className="flex items-center gap-2.5">
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="text-xs font-bold text-forest tracking-tight">
                      100+ vidas acolhidas
                    </span>
                  </div>
                  <span className="text-[11px] text-forest/70 font-medium leading-tight mt-0.5">
                    Iniciando nossa trajetória e crescendo com você
                  </span>
                </div>
              </div>

              {/* Divisor vertical discreto */}
              <div className="hidden sm:block h-6 w-px bg-soft"></div>

              {/* Tempo de resposta */}
              <div className="flex items-center gap-2 text-xs text-forest/90">
                <div className="w-5 h-5 rounded-full bg-forest/10 flex items-center justify-center shrink-0">
                  <Clock className="w-3 h-3 text-forest" />
                </div>
                <span>
                  Resposta média em até <strong className="font-bold text-forest">24 horas</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-1/2 flex justify-center lg:justify-end relative z-10">
            <div className="relative max-w-lg w-full group">
              {/* Gradient Scrim: suaviza sutilmente a imagem na base mantendo nitidez total e clareamento vivo ao passar o mouse */}
              <div className="relative overflow-hidden rounded-[32px]">
                <img
                  src={homeHero}
                  alt="Ilustração de acolhimento"
                  className="w-full object-contain rounded-[32px] mix-blend-multiply transition-all duration-700 group-hover:scale-[1.03] group-hover:brightness-105"
                  referrerPolicy="no-referrer"
                />

                {/* Scrim Gradiente Inferior suave que se dissipa no hover */}
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-warm/80 via-warm/25 to-transparent pointer-events-none z-1 group-hover:opacity-40 transition-opacity duration-500" />
              </div>

              {/* Badge Flutuante com Glassmorphism refinado: Especialistas & CRP Verificado */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="absolute -bottom-3 left-4 sm:left-6 bg-white/90 backdrop-blur-lg px-4 py-3 rounded-2xl border border-white/90 shadow-xl shadow-forest/10 flex items-center gap-3 z-10 transition-all hover:bg-white hover:scale-[1.02]"
              >
                <div className="w-10 h-10 rounded-xl bg-forest/10 text-forest flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5 text-forest" />
                </div>
                <div className="text-left">
                  <span className="text-[11px] font-semibold text-forest/70 block leading-tight">
                    50+ Especialistas
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-forest tracking-tight block">
                    CRP Ativo e Verificado
                  </span>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Qual o seu objetivo hoje? (Segmentação dos 3 Públicos dos Prints) */}
        <section className="w-full px-6 md:px-12 py-8 max-w-[1440px] flex flex-col items-center relative">
          <div className="w-full max-w-[1200px]">
            <div className="text-center mb-6">
              <span className="text-[11px] md:text-xs font-bold uppercase tracking-[0.25em] text-forest/80">
                Qual o seu objetivo hoje?
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
              {/* Card 1: Paciente */}
              <div className="relative group">
                {/* Glow Aura sutil no hover */}
                <div className="absolute -inset-1 bg-gradient-to-r from-sun/70 via-amber-300/50 to-sun/70 rounded-3xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none -z-10" />
                <motion.button
                  type="button"
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onNavigate("acolhimento")}
                  className="w-full h-full p-6 sm:p-7 bg-sun hover:bg-sun-dark text-forest rounded-2xl border border-sun-dark/40 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center cursor-pointer"
                >
                  <div className="w-13 h-13 rounded-2xl bg-white/90 backdrop-blur-md border border-white/70 group-hover:bg-forest text-forest group-hover:text-white flex items-center justify-center shrink-0 transition-all duration-300 shadow-2xs mb-4">
                    <User className="w-6 h-6" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-forest tracking-tight leading-snug group-hover:text-forest">
                    Quero Fazer Terapia
                  </h3>
                  <p className="text-xs sm:text-sm text-forest/90 group-hover:text-forest font-medium mt-1.5 leading-relaxed transition-colors">
                    Atendimento individual com valor acessível ou benefício corporativo.
                  </p>
                </motion.button>
              </div>

              {/* Card 2: Empresa (NR1) */}
              <div className="relative group">
                {/* Glow Aura sutil no hover */}
                <div className="absolute -inset-1 bg-gradient-to-r from-forest/35 via-sun/40 to-forest/35 rounded-3xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none -z-10" />
                <motion.button
                  type="button"
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onNavigate("empresa")}
                  className="w-full h-full p-6 sm:p-7 bg-sun hover:bg-sun-dark text-forest rounded-2xl border border-sun-dark/40 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center cursor-pointer"
                >
                  <div className="w-13 h-13 rounded-2xl bg-white/90 backdrop-blur-md border border-white/70 group-hover:bg-forest text-forest group-hover:text-white flex items-center justify-center shrink-0 transition-all duration-300 shadow-2xs mb-4">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-forest tracking-tight leading-snug group-hover:text-forest">
                    Sou Empresa (NR1)
                  </h3>
                  <p className="text-xs sm:text-sm text-forest/90 group-hover:text-forest font-medium mt-1.5 leading-relaxed transition-colors">
                    Programa de saúde mental para colaboradores.
                  </p>
                </motion.button>
              </div>

              {/* Card 3: Terapeuta / Psicólogo */}
              <div className="relative group">
                {/* Glow Aura sutil no hover */}
                <div className="absolute -inset-1 bg-gradient-to-r from-sun/70 via-amber-300/50 to-forest/30 rounded-3xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none -z-10" />
                <motion.button
                  type="button"
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onNavigate("profissional")}
                  className="w-full h-full p-6 sm:p-7 bg-sun hover:bg-sun-dark text-forest rounded-2xl border border-sun-dark/40 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center cursor-pointer"
                >
                  <div className="w-13 h-13 rounded-2xl bg-white/90 backdrop-blur-md border border-white/70 group-hover:bg-forest text-forest group-hover:text-white flex items-center justify-center shrink-0 transition-all duration-300 shadow-2xs mb-4">
                    <PsiIcon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-forest tracking-tight leading-snug group-hover:text-forest">
                    Sou Psicólogo(a) ou Terapeuta
                  </h3>
                  <p className="text-xs sm:text-sm text-forest/90 group-hover:text-forest font-medium mt-1.5 leading-relaxed transition-colors">
                    Faça parte da nossa rede credenciada.
                  </p>
                </motion.button>
              </div>
            </div>
          </div>
        </section>

        {/* Jornada Section integrada aqui */}
        <section id="jornada" className="w-full px-4 sm:px-6 md:px-12 flex flex-col items-center scroll-mt-24">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-[1200px] flex flex-col items-center mb-6 bg-white/90 backdrop-blur-md p-5 sm:p-8 md:p-10 rounded-[32px] sm:rounded-[40px] border border-white/80 shadow-xl shadow-forest/5 relative overflow-hidden"
          >
            {/* Ambient Glow Auras internas criando profundidade de campo suave */}
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-sun/20 rounded-full blur-3xl pointer-events-none -z-0" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-forest/5 rounded-full blur-3xl pointer-events-none -z-0" />

            <div className="flex items-center gap-3 sm:gap-4 mb-3 relative z-10">
              <Map className="w-7 h-7 sm:w-8 sm:h-8 text-forest" />
              <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-forest text-center">
                A sua jornada
              </h2>
            </div>
            <p className="text-forest/80 text-center max-w-lg mb-6 text-sm sm:text-base leading-relaxed relative z-10">
              Um caminho estruturado e acolhedor para cada perfil. Passe o mouse ou clique para explorar a jornada:
            </p>

            {/* 3 Abas com Glassmorphism: Paciente | Empresa | Psicólogo/Terapeuta */}
            <div className="w-full max-w-xl mx-auto mb-6 sm:mb-8 relative z-10">
              <div className="grid grid-cols-3 gap-1 p-1 sm:p-1.5 bg-warm/80 backdrop-blur-md rounded-2xl sm:rounded-full border border-white/80 shadow-inner">
                {(["paciente", "empresa", "terapeuta"] as const).map((tabKey) => {
                  const item = JORNADAS_DATA[tabKey];
                  const isActive = jornadaPublico === tabKey;
                  return (
                    <button
                      key={tabKey}
                      type="button"
                      onMouseEnter={() => setJornadaPublico(tabKey)}
                      onClick={() => setJornadaPublico(tabKey)}
                      className={`py-2 sm:py-2.5 px-2 sm:px-4 rounded-xl sm:rounded-full text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer text-center flex items-center justify-center gap-1.5 sm:gap-2 leading-tight ${
                        isActive
                          ? tabKey === "empresa"
                            ? "bg-forest text-white shadow-xs"
                            : tabKey === "terapeuta"
                            ? "bg-sun-dark text-forest shadow-xs"
                            : "bg-sun text-forest shadow-xs"
                          : "text-forest/70 hover:text-forest hover:bg-white/60"
                      }`}
                    >
                      {tabKey === "paciente" && <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />}
                      {tabKey === "empresa" && <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />}
                      {tabKey === "terapeuta" && <PsiIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />}
                      <span className="truncate">{item.tituloAba}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Conteúdo Dinâmico da Aba Selecionada */}
            {(() => {
              const activeJornada = JORNADAS_DATA[jornadaPublico];
              return (
                <div className="w-full max-w-[840px] mx-auto relative z-10">
                  <div className="text-center max-w-xl mx-auto mb-8 px-2">
                    <span className="inline-block px-3.5 py-1 bg-white/80 backdrop-blur-xs border border-white/90 rounded-full text-[11px] font-bold text-forest/80 uppercase tracking-wider mb-2 shadow-2xs">
                      {activeJornada.badge}
                    </span>
                    <p className="text-forest/85 text-xs sm:text-sm md:text-base leading-relaxed">
                      {activeJornada.descricao}
                    </p>
                  </div>

                  <div className="relative w-full mx-auto">
                    {/* Linha vertical conectora (desktop) */}
                    <div className={`hidden md:block absolute left-[3.5rem] top-8 bottom-8 w-0.5 border-dashed border-l-2 ${activeJornada.linhaCor} z-0 transition-colors duration-300`}></div>

                    {/* Coluna com os 3 passos com acabamento Glassmorphism e hover suave */}
                    <motion.div
                      key={jornadaPublico}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex flex-col gap-4 sm:gap-6 md:gap-7 relative z-10 w-full"
                    >
                      {activeJornada.passos.map((passo, idx) => {
                        const StepIcon = passo.icon;
                        return (
                          <div
                            key={idx}
                            className={`${passo.cardBg} p-5 sm:p-7 md:p-8 rounded-[28px] md:rounded-[32px] border shadow-md shadow-forest/5 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 relative group hover:-translate-y-1 hover:shadow-xl hover:shadow-forest/10 transition-all duration-300`}
                          >
                            <div className={`w-14 h-14 sm:w-16 sm:h-16 shrink-0 ${passo.iconBg} rounded-2xl sm:rounded-full flex items-center justify-center shadow-xs border group-hover:scale-105 transition-transform duration-300`}>
                              <StepIcon className="w-7 h-7 sm:w-8 sm:h-8" />
                            </div>
                            <div className="text-center sm:text-left flex-1 sm:pt-1">
                              <span className={`inline-block text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-md ${passo.badgeBg} mb-1.5`}>
                                Passo {passo.num}
                              </span>
                              <h3 className="text-lg sm:text-xl font-semibold text-forest mb-1.5 tracking-tight">
                                {passo.titulo}
                              </h3>
                              <p className="text-forest/80 text-xs sm:text-sm md:text-base leading-relaxed">
                                {passo.descricao}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </motion.div>

                    {/* Botão de Ação Imediata da Aba Ativa com Aura de Luz */}
                    <div className="mt-8 flex justify-center">
                      <div className="relative group">
                        <div className="absolute -inset-1 bg-forest/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
                        <button
                          type="button"
                          onClick={() => onNavigate(activeJornada.ctaView)}
                          className="px-6 sm:px-8 py-3 sm:py-3.5 bg-forest hover:bg-forest/90 text-white font-bold text-xs sm:text-sm rounded-full transition-all shadow-md shadow-forest/15 hover:shadow-xl hover:shadow-forest/25 flex items-center gap-2 cursor-pointer"
                        >
                          <span>{activeJornada.ctaText}</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </motion.div>

          {/* Stats */}
          {metricasAtivas && (
            <div className="mt-8 mb-12 flex flex-wrap justify-center gap-8 sm:gap-16 border-t border-soft pt-12 w-full max-w-4xl mx-auto">
              <div className="flex flex-col items-center">
                <span className="font-serif text-3xl md:text-5xl font-semibold text-sun-dark">
                  50+
                </span>
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold mt-2 text-forest/70">
                  Profissionais
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="font-serif text-3xl md:text-5xl font-semibold text-sun-dark">
                  100+
                </span>
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold mt-2 text-forest/70">
                  Vidas Acolhidas
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="font-serif text-3xl md:text-5xl font-semibold text-sun-dark">
                  24h
                </span>
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold mt-2 text-forest/70">
                  Resposta Média
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Corporate Benefit and Professional Features Section with Photo Backgrounds & Cinematic Effects */}
        <section className="w-full bg-warm pt-10 sm:pt-16 pb-20 flex flex-col items-center overflow-visible">
          <div className="w-full max-w-[1440px] px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            
            {/* Card 1: Saúde Mental e Compliance (NR1) */}
            <div className="relative group h-full flex flex-col">
              {/* Depth of Field & Glow Aura que acende e ganha vida no hover */}
              <div className="absolute -inset-2 bg-gradient-to-r from-sun via-amber-400/40 to-forest rounded-[46px] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-600 pointer-events-none -z-10" />

              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6 }}
                onClick={() => onNavigate("empresa")}
                className="w-full h-full relative min-h-[500px] p-8 sm:p-12 text-white rounded-[40px] overflow-hidden shadow-2xl shadow-forest/20 flex flex-col justify-between cursor-pointer transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-forest/30 bg-[#0d2218]"
              >
                {/* Foto de Fundo Fixa Otimizada com Lazy Loading e Blur Placeholder */}
                <BlurImageBackground
                  src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1200&q=85"
                  alt="Equipe em ambiente corporativo saudável e acolhedor"
                  targetOpacity="opacity-85"
                />

                <div className="flex flex-col gap-4 relative z-10 flex-1">
                  {/* Badge */}
                  <div className="w-fit px-4 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/25 text-sun group-hover:bg-sun group-hover:text-forest group-hover:border-sun font-bold text-xs uppercase tracking-wider shadow-md transition-all duration-300 flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-sun group-hover:text-forest transition-colors" />
                    <span>Programa Corporativo</span>
                  </div>

                  {/* Ícone Container */}
                  <div className="w-16 h-16 bg-black/40 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center text-sun shadow-xl group-hover:bg-sun group-hover:text-forest group-hover:border-sun group-hover:scale-105 transition-all duration-300">
                    <Briefcase className="w-8 h-8" />
                  </div>

                  {/* Título com altura mínima harmonizada e sombra suave */}
                  <div className="min-h-[72px] sm:min-h-[84px] flex items-center">
                    <h3 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight leading-snug group-hover:text-amber-200 transition-colors duration-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                      Saúde Mental e Compliance (NR1)
                    </h3>
                  </div>

                  {/* Parágrafo com Alto Contraste Natural */}
                  <p className="text-base sm:text-[17px] text-white group-hover:text-white font-normal leading-relaxed max-w-xl transition-colors duration-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                    Antecipe-se às exigências da NR1 implementando um programa
                    efetivo de prevenção aos riscos psicossociais. Mais do que um
                    benefício, um cuidado estratégico que protege sua empresa e
                    transforma o ambiente de trabalho.
                  </p>
                </div>

                {/* Rodapé com Destaque Dourado */}
                <div className="flex items-center justify-between pt-6 border-t border-white/20 group-hover:border-sun/40 relative z-10 transition-colors duration-300 mt-6">
                  <span className="text-sm sm:text-base font-bold uppercase tracking-wider text-sun group-hover:text-white transition-colors drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                    Sou Empresa
                  </span>
                  <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-md border border-white/25 flex items-center justify-center text-white group-hover:bg-sun group-hover:text-forest group-hover:scale-110 transition-all shadow-lg">
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Card 2: Faça parte da nossa rede */}
            <div className="relative group h-full flex flex-col">
              {/* Depth of Field & Glow Aura Esmeralda/Solar que ganha vida no hover */}
              <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500/40 via-sun/40 to-forest rounded-[46px] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-600 pointer-events-none -z-10" />

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: 0.2 }}
                onClick={() => onNavigate("profissional")}
                className="w-full h-full relative min-h-[500px] p-8 sm:p-12 text-white rounded-[40px] overflow-hidden shadow-2xl shadow-forest/20 flex flex-col justify-between cursor-pointer transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-forest/30 bg-[#0d2218]"
              >
                {/* Foto de Fundo Fixa Otimizada com Lazy Loading e Blur Placeholder */}
                <BlurImageBackground
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=85"
                  alt="Psicóloga profissional em consultório acolhedor"
                  targetOpacity="opacity-85"
                />

                <div className="flex flex-col gap-4 relative z-10 flex-1">
                  {/* Badge */}
                  <div className="w-fit px-4 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/25 text-sun group-hover:bg-sun group-hover:text-forest group-hover:border-sun font-bold text-xs uppercase tracking-wider shadow-md transition-all duration-300 flex items-center gap-2">
                    <HeartHandshake className="w-3.5 h-3.5 text-sun group-hover:text-forest transition-colors" />
                    <span>Rede Credenciada</span>
                  </div>

                  {/* Ícone Container */}
                  <div className="w-16 h-16 bg-black/40 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center text-sun shadow-xl group-hover:bg-sun group-hover:text-forest group-hover:border-sun group-hover:scale-105 transition-all duration-300">
                    <HeartHandshake className="w-8 h-8" />
                  </div>

                  {/* Título com altura mínima harmonizada e sombra suave */}
                  <div className="min-h-[72px] sm:min-h-[84px] flex items-center">
                    <h3 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight leading-snug group-hover:text-amber-200 transition-colors duration-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                      Faça parte da nossa rede
                    </h3>
                  </div>

                  {/* Parágrafo com Alto Contraste Natural */}
                  <p className="text-base sm:text-[17px] text-white group-hover:text-white font-normal leading-relaxed max-w-xl transition-colors duration-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                    Engaje-se em um projeto com um propósito acessível e humano.
                    Se você compreende que terapia não é um privilégio, junte-se a
                    nós para oferecer acolhimento acessível adaptando sua
                    disponibilidade de horas.
                  </p>
                </div>

                {/* Rodapé com Destaque Dourado */}
                <div className="flex items-center justify-between pt-6 border-t border-white/20 group-hover:border-sun/40 relative z-10 transition-colors duration-300 mt-6">
                  <span className="text-sm sm:text-base font-bold uppercase tracking-wider text-sun group-hover:text-white transition-colors drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                    Sou Psicólogo / Terapeuta
                  </span>
                  <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-md border border-white/25 flex items-center justify-center text-white group-hover:bg-sun group-hover:text-forest group-hover:scale-110 transition-all shadow-lg">
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </motion.div>
            </div>

          </div>
        </section>

        {/* Trusted By Carousel */}
        {carrosselEmpresasAtivo && (
          <section className="w-full bg-white py-16 flex flex-col items-center overflow-hidden border-t border-soft">
            <div className="w-full max-w-[1440px] px-6 md:px-12 mb-10 flex justify-center">
              <h2 className="font-serif text-2xl md:text-3xl text-forest/70 text-center relative max-w-xl">
                Empresas que confiam na AcolheMente
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-12 h-1 bg-sun rounded-full" />
              </h2>
            </div>
            
            <div className="w-full relative flex overflow-x-hidden group">
              <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
              <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
              
              <motion.div
                animate={{ x: ["0%", "-50%"] }}
                transition={{
                  repeat: Infinity,
                  ease: "linear",
                  duration: 20,
                }}
                className="flex whitespace-nowrap min-w-max py-4"
              >
                {[...COMPANY_LOGOS, ...COMPANY_LOGOS, ...COMPANY_LOGOS].map((Logo, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-12 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300">
                    <Logo.icon className="w-8 h-8 text-forest" />
                    <span className="font-sans font-bold text-xl text-forest tracking-tighter">{Logo.name}</span>
                  </div>
                ))}
              </motion.div>
            </div>
          </section>
        )}
        
        {/* FAQ Section */}
        <FAQSection />

        {/* Blog & Conhecimento Aberto Section com Imagem de Escrita/Redação e Efeitos de Legibilidade */}
        <section className="w-full bg-warm/70 py-16 px-6 md:px-12 flex flex-col items-center border-t border-soft/80 overflow-visible">
          <div className="w-full max-w-[1200px] relative group">
            {/* Depth of Field & Glow Aura Dourada/Esmeralda no hover */}
            <div className="absolute -inset-2 bg-gradient-to-r from-sun via-amber-400/40 to-forest rounded-[46px] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-600 pointer-events-none -z-10" />

            <div className="w-full relative min-h-[480px] flex flex-col md:flex-row items-center justify-between gap-8 p-8 sm:p-12 rounded-[40px] overflow-hidden shadow-2xl shadow-forest/20 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-forest/30 bg-[#0d2218]">
              
              {/* Foto de Fundo Fixa Otimizada com Lazy Loading e Blur Placeholder */}
              <BlurImageBackground
                src="https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1400&q=85"
                alt="Escrita e redação de artigos sobre saúde mental"
                targetOpacity="opacity-85"
              />

              {/* Coluna da esquerda: Título, Descrição e Botão com alto contraste e legibilidade impecável */}
              <div className="flex flex-col gap-5 max-w-xl w-full relative z-10">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <div className="w-fit px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/25 text-sun group-hover:bg-sun group-hover:text-forest group-hover:border-sun font-bold text-xs uppercase tracking-wider shadow-md transition-all duration-300 flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-sun group-hover:text-forest transition-colors" />
                    <span>Espaço Aberto de Leitura</span>
                  </div>
                  <span className="text-xs text-white font-medium bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                    Acesso Livre
                  </span>
                </div>

                {/* Ícone Container */}
                <div className="w-16 h-16 bg-black/30 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center text-sun shadow-xl group-hover:bg-sun group-hover:text-forest group-hover:border-sun group-hover:scale-105 transition-all duration-300">
                  <BookOpen className="w-8 h-8" />
                </div>

                <h3 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-tight leading-snug group-hover:text-amber-200 transition-colors duration-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  Blog AcolheMente: Artigos & Conhecimento
                </h3>

                <p className="text-base sm:text-[17px] text-white group-hover:text-white font-normal leading-relaxed max-w-xl transition-colors duration-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
                  Textos, reflexões e orientações elaborados por psicólogos e especialistas sobre saúde mental, relações, manejo da ansiedade e bem-estar no trabalho.
                </p>

                <div className="flex items-center gap-3 pt-2 flex-wrap">
                  <button
                    onClick={() => onNavigate("blog")}
                    className="px-6 py-3.5 bg-sun hover:bg-sun-dark text-forest rounded-full font-bold text-xs uppercase tracking-wider shadow-lg hover:shadow-xl transition-all flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
                  >
                    Explorar Todos os Artigos
                    <ArrowRight className="w-4 h-4 text-forest" />
                  </button>
                </div>
              </div>

              {/* Coluna da direita: Prévia de artigos recentes com vidro translúcido (Glassmorphism) */}
              <div className="w-full md:w-auto flex flex-col gap-3 min-w-[280px] max-w-md relative z-10">
                {artigosPublicados.length > 0 ? (
                  artigosPublicados.slice(0, 2).map((artigo) => (
                    <div
                      key={artigo.id}
                      onClick={() => {
                        if (onSelectArtigo && artigo.id) {
                          onSelectArtigo(artigo.id);
                        } else {
                          try {
                            const url = new URL(window.location.href);
                            url.searchParams.set("artigo", artigo.id || "");
                            window.history.pushState({}, "", url.toString());
                          } catch (e) {}
                          onNavigate("blog");
                        }
                      }}
                      className="bg-black/50 hover:bg-black/70 backdrop-blur-md p-5 rounded-2xl border border-white/20 hover:border-sun/60 transition-all cursor-pointer flex flex-col gap-2 group/item shadow-lg"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase text-sun tracking-wider">
                          {artigo.categoria || "Saúde Mental"}
                        </span>
                        <span className="text-[10px] text-white/70">
                          {artigo.tempoLeitura || "3 min de leitura"}
                        </span>
                      </div>
                      <h4 className="font-serif font-bold text-sm sm:text-base text-white group-hover/item:text-amber-200 transition-colors line-clamp-2 leading-snug">
                        {artigo.titulo}
                      </h4>
                      <span className="text-[11px] text-white/75">
                        {artigo.autorNome}
                        {artigo.autorProfissao ? ` • ${artigo.autorProfissao}` : ""}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="bg-black/50 backdrop-blur-md p-6 rounded-2xl border border-white/20 text-center flex flex-col items-center justify-center gap-3 shadow-lg">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sun border border-white/20">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <h4 className="font-serif font-bold text-sm text-white">
                        Novos artigos em breve
                      </h4>
                      <p className="text-xs text-white/75 max-w-[240px] leading-relaxed">
                        Nossos psicólogos e terapeutas parceiros estão elaborando artigos sobre saúde mental e autocuidado.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Professionals Showcase Carousel */}
        <ProfissionaisCarousel />
      </main>

      {/* Footer */}
      <Footer onNavigate={onNavigate} />

      {/* Floating Action Buttons */}
      <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col sm:flex-row gap-2 sm:gap-3 opacity-95 sm:opacity-50 hover:opacity-100 transition-opacity duration-300 w-[90%] sm:w-auto">
        <button
          onClick={() => onNavigate("acolhimento")}
          className="w-full sm:w-auto px-6 py-2.5 sm:px-8 sm:py-3 md:py-4 bg-sun text-forest rounded-full font-semibold shadow-xl shadow-sun/20 transition-all hover:bg-sun-dark flex items-center justify-center gap-2 whitespace-nowrap text-xs sm:text-sm md:text-base pointer-events-auto"
        >
          Iniciar meu Acolhimento
          <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
        </button>
        {doacoesAtivas && (
          <button
            onClick={() => onNavigate("doacao")}
            className="w-full sm:w-auto px-6 py-2.5 sm:px-8 sm:py-3 md:py-4 border-2 border-sun/50 text-forest rounded-full font-semibold bg-white/90 backdrop-blur hover:bg-sun-light transition-all whitespace-nowrap text-xs sm:text-sm md:text-base pointer-events-auto text-center"
          >
            Doe uma sessão de terapia
          </button>
        )}
      </div>
    </div>
  );
}
