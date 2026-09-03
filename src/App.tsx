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
import { BlogView } from "./views/BlogView";

import { Footer } from "./components/Footer";
import { ProfissionaisCarousel } from "./components/ProfissionaisCarousel";
import { PWAInstallBanner } from "./components/PWAInstallBanner";

import homeHero from "./assets/images/home_hero_photo_parda_1781024318036.png";
import logoImage from "./assets/images/logo_acolhe.jpeg";

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
    answer: "Respeitamos faixas de valores solidários que variam entre R$ 30 e R$ 110 por sessão. Uma vez que você aceita a proposta com as condições de atendimento, o valor combinado mantém-se fixo, sendo reajustado apenas anualmente com base no índice do INPC."
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

  // Synchronize browser history / popstate
  useEffect(() => {
    const handlePopState = () => {
      const p = new URLSearchParams(window.location.search);
      setPublicProfUid(p.get("prof"));
      setPublicServiceId(p.get("servico"));
      setPublicEventoId(p.get("evento"));
      setPublicContratoId(p.get("contrato"));
      setPublicPropostaId(p.get("proposta"));
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
    const fetchConfigs = async () => {
      try {
        const snap = await getDoc(doc(db, "configuracoes", "master"));
        if (snap.exists()) {
          const data = snap.data();
          if (data.doacoesAtivas !== undefined) {
            setDoacoesAtivas(!!data.doacoesAtivas);
          }
        }
      } catch (err) {
        console.error("Error fetching configs in App.tsx", err);
      }
    };
    fetchConfigs();
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
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
                    <span className="text-[10px] uppercase tracking-wider text-forest/40 font-bold bg-warm px-2 py-0.5 rounded-full">Navegação</span>
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
          className="flex flex-col lg:flex-row gap-6 md:gap-8 px-6 md:px-12 py-8 lg:py-12 max-w-[1440px] w-full justify-between items-center scroll-mt-24"
        >
          <div className="max-w-xl flex flex-col items-center lg:items-start text-center lg:text-left mb-6 lg:mb-0">
            <div className="mb-4 px-3 py-1 bg-sun-light text-forest text-[10px] font-bold uppercase tracking-[0.2em] w-fit rounded">
              Valores Acessíveis e Benefício Corporativo
            </div>

            <h1 className="font-serif text-5xl md:text-[84px] leading-[1] md:leading-[0.9] font-medium mb-4 text-forest">
              Terapia e cuidado:{" "}
              <br className="hidden md:block lg:hidden xl:block" />
              <span className="italic">acessível e na palma da mão.</span>
            </h1>

            <p className="text-lg md:text-xl text-forest/80 max-w-xl leading-relaxed">
              Uma ponte humanizada entre psicoterapeutas e quem busca
              acolhimento. Do particular, com valores acessíveis, ao benefício
              para empresas.
            </p>
          </div>
          <div className="w-full lg:w-1/2 flex justify-center lg:justify-end">
            <img
              src={homeHero}
              alt="Ilustração de acolhimento"
              className="w-full max-w-lg object-contain rounded-3xl mix-blend-multiply"
              referrerPolicy="no-referrer"
            />
          </div>
        </section>

        {/* Jornada Section integrata aqui */}
        <section id="jornada" className="w-full px-6 md:px-12 flex flex-col items-center scroll-mt-24">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-[1200px] flex flex-col items-center mb-6 bg-white p-6 md:p-10 rounded-[40px] border border-soft shadow-sm"
          >
            <div className="flex items-center gap-4 mb-4">
              <Map className="w-8 h-8 text-forest" />
              <h2 className="font-serif text-3xl md:text-4xl text-forest text-center">
                A sua jornada
              </h2>
            </div>
            <p className="text-forest/80 text-center max-w-lg mb-8">
              Um caminho estruturado para conectar você ao profissional ideal,
              garantindo cuidado seguro e acolhedor, seja pelo valor acessível
              ou através da sua empresa parceira.
            </p>

            <div className="relative max-w-[800px] w-full mx-auto">
              {/* Vertical Path Line */}
              <div className="hidden md:block absolute left-[3.5rem] top-8 bottom-8 w-0.5 border-dashed border-l-2 border-sun/50 z-0"></div>

              <div className="flex flex-col gap-6 md:gap-8 relative z-10 w-full">
                {/* Step 1 */}
                <motion.div 
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="bg-warm/80 p-6 md:p-8 rounded-[32px] border border-white shadow-xl shadow-forest/5 flex flex-col md:flex-row items-center md:items-start gap-6 relative group hover:-translate-y-1 transition-transform duration-300"
                >
                  <div className="w-16 h-16 shrink-0 bg-sun rounded-full flex items-center justify-center shadow-sm text-forest border border-sun group-hover:scale-110 transition-transform">
                    <ClipboardList className="w-8 h-8" />
                  </div>
                  <div className="text-center md:text-left flex-1 md:pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-forest/60">
                      Passo 01
                    </span>
                    <h3 className="text-xl font-semibold text-forest mt-1 mb-2">
                      Triagem ou Código
                    </h3>
                    <p className="text-forest/80 text-sm md:text-base leading-relaxed">
                      Preencha a triagem inicial para valor acessível, ou
                      informe o código fornecido pela sua empresa parceira.
                    </p>
                  </div>
                </motion.div>

                {/* Step 2 */}
                <motion.div 
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="bg-warm/80 p-6 md:p-8 rounded-[32px] border border-white shadow-xl shadow-forest/5 flex flex-col md:flex-row items-center md:items-start gap-6 relative group hover:-translate-y-1 transition-transform duration-300"
                >
                  <div className="w-16 h-16 shrink-0 bg-sun rounded-full flex items-center justify-center shadow-sm text-forest border border-sun group-hover:scale-110 transition-transform">
                    <SearchCheck className="w-8 h-8" />
                  </div>
                  <div className="text-center md:text-left flex-1 md:pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-forest/60">
                      Passo 02
                    </span>
                    <h3 className="text-xl font-semibold text-forest mt-1 mb-2">
                      Análise e Proposta
                    </h3>
                    <p className="text-forest/80 text-sm md:text-base leading-relaxed">
                      A nossa equipe técnica analisa os dados ou seu convênio
                      para direcioná-lo ao profissional ideal.
                    </p>
                  </div>
                </motion.div>

                {/* Step 3 */}
                <motion.div 
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="bg-warm/80 p-6 md:p-8 rounded-[32px] border border-white shadow-xl shadow-forest/5 flex flex-col md:flex-row items-center md:items-start gap-6 relative group hover:-translate-y-1 transition-transform duration-300"
                >
                  <div className="w-16 h-16 shrink-0 bg-sun rounded-full flex items-center justify-center shadow-sm text-forest border border-sun group-hover:scale-110 transition-transform">
                    <MessageCircleHeart className="w-8 h-8" />
                  </div>
                  <div className="text-center md:text-left flex-1 md:pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-forest/60">
                      Passo 03
                    </span>
                    <h3 className="text-xl font-semibold text-forest mt-1 mb-2">
                      Acolhimento
                    </h3>
                    <p className="text-forest/80 text-sm md:text-base leading-relaxed">
                      Conecte-se com o seu psicólogo e inicie o seu processo de
                      cuidado num ambiente seguro.
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="mt-8 mb-12 flex flex-wrap justify-center gap-8 sm:gap-16 border-t border-soft pt-12 w-full max-w-4xl mx-auto">
            <div className="flex flex-col items-center">
              <span className="font-serif text-3xl md:text-5xl font-semibold text-sun-dark">
                150+
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] font-bold mt-2 text-forest/70">
                Profissionais
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-serif text-3xl md:text-5xl font-semibold text-sun-dark">
                4.2k
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
        </section>

        {/* Corporate Benefit and Professional Features Section */}
        <section className="w-full bg-warm pb-16 flex flex-col items-center overflow-hidden">
          <div className="w-full max-w-[1440px] px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6 }}
              onClick={() => onNavigate("empresa")}
              className="w-full relative p-12 bg-sun text-forest rounded-[40px] shadow-xl shadow-sun/20 flex flex-col gap-6 justify-between group cursor-pointer hover:-translate-y-1 transition-transform duration-300"
            >
              <div className="flex flex-col gap-4">
                <div className="w-16 h-16 bg-forest/10 rounded-2xl flex items-center justify-center text-forest">
                  <Briefcase className="w-8 h-8" />
                </div>
                <h3 className="font-serif text-3xl font-medium">
                  Saúde Mental e Compliance (NR1)
                </h3>
                <p className="text-base text-forest/80 leading-relaxed">
                  Antecipe-se às exigências da NR1 implementando um programa
                  efetivo de prevenção aos riscos psicossociais. Mais do que um
                  benefício, um cuidado estratégico que protege sua empresa e
                  transforma o ambiente de trabalho.
                </p>
              </div>

              <div className="flex items-center gap-4 mt-4">
                <span className="text-sm font-bold uppercase tracking-wider underline underline-offset-4 decoration-forest/30 group-hover:decoration-forest transition-all">
                  Sou Empresa
                </span>
                <div className="w-12 h-12 rounded-full border border-forest/20 flex items-center justify-center group-hover:bg-forest group-hover:text-sun transition-colors">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: 0.2 }}
              onClick={() => onNavigate("profissional")}
              className="w-full relative p-12 bg-white text-forest rounded-[40px] border border-soft shadow-xl shadow-forest/5 flex flex-col gap-6 justify-between group cursor-pointer hover:-translate-y-1 transition-transform duration-300"
            >
              <div className="flex flex-col gap-4">
                <div className="w-16 h-16 bg-sun-light rounded-2xl flex items-center justify-center text-forest">
                  <HeartHandshake className="w-8 h-8" />
                </div>
                <h3 className="font-serif text-3xl font-medium">
                  Faça parte da nossa rede
                </h3>
                <p className="text-base text-forest/80 leading-relaxed">
                  Engaje-se em um projeto com um propósito acessível e humano.
                  Se você compreende que terapia não é um privilégio, junte-se a
                  nós para oferecer acolhimento acessível adaptando sua
                  disponibilidade de horas.
                </p>
              </div>

              <div className="flex items-center gap-4 mt-4">
                <span className="text-sm font-bold uppercase tracking-wider text-forest underline underline-offset-4 decoration-forest/30 group-hover:decoration-forest transition-all">
                  SOU PSICÓLOGO/ TERAPEUTA
                </span>
                <div className="w-12 h-12 rounded-full border border-soft flex items-center justify-center text-forest group-hover:bg-sun group-hover:text-forest transition-colors">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Trusted By Carousel */}
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
        
        {/* FAQ Section */}
        <FAQSection />

        {/* Blog & Conhecimento Aberto Section */}
        <section className="w-full bg-[#FAF8F2] py-16 px-6 md:px-12 flex flex-col items-center border-t border-soft">
          <div className="w-full max-w-[1200px] flex flex-col md:flex-row items-center justify-between gap-8 bg-white p-8 md:p-12 rounded-[40px] border border-soft shadow-xs">
            <div className="flex flex-col gap-4 max-w-xl w-full">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="inline-flex items-center px-3 py-1 bg-sun/40 text-forest text-xs font-bold uppercase tracking-wider rounded-full whitespace-nowrap">
                  Espaço Aberto de Leitura
                </span>
                <span className="text-xs text-forest/50 font-medium">Acesso Livre</span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl text-forest font-semibold leading-tight tracking-tight">
                Blog AcolheMente: Artigos & Conhecimento
              </h2>
              <p className="text-forest/75 text-sm md:text-base leading-relaxed">
                Textos, reflexões e orientações elaborados por psicólogos e especialistas sobre saúde mental, relações, manejo da ansiedade e bem-estar no trabalho.
              </p>
              <div className="flex items-center gap-3 pt-2 flex-wrap">
                <button
                  onClick={() => onNavigate("blog")}
                  className="px-6 py-3 bg-forest hover:bg-forest/90 text-white rounded-full font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                >
                  Explorar Todos os Artigos
                  <ArrowRight className="w-4 h-4 text-sun" />
                </button>
              </div>
            </div>

            <div className="w-full md:w-auto flex flex-col gap-3 min-w-[280px] max-w-md">
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
                    className="bg-warm/40 hover:bg-warm/70 p-4 rounded-2xl border border-soft transition-all cursor-pointer flex flex-col gap-1.5 group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase text-sun-dark">
                        {artigo.categoria || "Saúde Mental"}
                      </span>
                      <span className="text-[10px] text-forest/50">
                        {artigo.tempoLeitura || "3 min de leitura"}
                      </span>
                    </div>
                    <h4 className="font-serif font-bold text-sm text-forest group-hover:text-forest/80 transition-colors line-clamp-2">
                      {artigo.titulo}
                    </h4>
                    <span className="text-[11px] text-forest/60">
                      {artigo.autorNome}
                      {artigo.autorProfissao ? ` • ${artigo.autorProfissao}` : ""}
                    </span>
                  </div>
                ))
              ) : (
                <div className="bg-warm/30 p-6 rounded-2xl border border-soft text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-xs text-forest/60">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h4 className="font-serif font-bold text-sm text-forest">
                      Novos artigos em breve
                    </h4>
                    <p className="text-xs text-forest/60 max-w-[240px] leading-relaxed">
                      Nossos psicólogos e terapeutas parceiros estão elaborando artigos sobre saúde mental e autocuidado.
                    </p>
                  </div>
                </div>
              )}
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
