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
} from "lucide-react";
import { useState } from "react";
import { motion } from "motion/react";
import { AcolhimentoView } from "./views/AcolhimentoView";
import { PublicProfProfileView } from "./views/PublicProfProfileView";
import { DashboardView } from "./views/DashboardView";
import { EmpresaView } from "./views/EmpresaView";
import { DoacaoView } from "./views/DoacaoView";
import { ProfissionalLandingView } from "./views/ProfissionalLandingView";

import { Footer } from "./components/Footer";

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

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const publicProfUid = params.get("prof");
  const viewParam = params.get("view") as any;

  const [currentView, setCurrentView] = useState<
    | "landing"
    | "acolhimento"
    | "dashboard"
    | "profile"
    | "empresa"
    | "doacao"
    | "profissional"
  >(
    viewParam &&
      [
        "landing",
        "acolhimento",
        "dashboard",
        "profile",
        "empresa",
        "doacao",
        "profissional",
      ].includes(viewParam)
      ? viewParam
      : "landing",
  );

  const handleBackFromPublicProfile = () => {
    // Clear URL parameters elegantly and route back to landing page
    window.history.pushState({}, "", window.location.origin);
    setCurrentView("landing");
  };

  if (publicProfUid) {
    return (
      <PublicProfProfileView
        profUid={publicProfUid}
        onBack={handleBackFromPublicProfile}
      />
    );
  }

  if (currentView === "landing") {
    return <LandingPage onNavigate={setCurrentView} />;
  }

  if (currentView === "acolhimento") {
    return <AcolhimentoView onNavigate={setCurrentView} />;
  }

  if (currentView === "dashboard") {
    return <DashboardView onNavigate={setCurrentView} />;
  }

  if (currentView === "empresa") {
    return <EmpresaView onNavigate={setCurrentView} />;
  }

  if (currentView === "doacao") {
    return <DoacaoView onNavigate={setCurrentView} />;
  }

  if (currentView === "profissional") {
    return <ProfissionalLandingView onNavigate={setCurrentView} />;
  }

  return (
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

function LandingPage({
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
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-warm">
      {/* Navbar */}
      <nav className="w-full py-4 sm:py-6 px-4 sm:px-6 md:px-12 flex justify-between items-center border-b border-soft gap-2">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-sun rounded-full flex items-center justify-center text-forest overflow-hidden shrink-0">
            <img
              src={logoImage}
              alt="AcolheMente Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="font-serif text-[18px] sm:text-2xl font-semibold tracking-tight text-forest">
            AcolheMente
          </span>
        </div>
        <div className="hidden md:flex gap-8 text-sm font-medium uppercase tracking-widest text-forest/70">
          <a href="#projeto" className="hover:text-forest transition-colors">
            O Projeto
          </a>
          <a href="#jornada" className="hover:text-forest transition-colors">
            Como Funciona
          </a>
        </div>
        <button
          onClick={() => onNavigate("dashboard")}
          className="px-4 sm:px-6 py-1.5 sm:py-2 bg-sun text-forest text-[9px] sm:text-xs font-semibold uppercase tracking-wider rounded-full hover:bg-sun-dark transition-colors shadow-sm text-center font-bold"
        >
          Área do
          <br className="sm:hidden" /> Profissional
        </button>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center">
        <section
          id="projeto"
          className="flex flex-col lg:flex-row gap-6 md:gap-8 px-6 md:px-12 py-8 lg:py-12 max-w-[1440px] w-full justify-between items-center"
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
        <section className="w-full px-6 md:px-12 flex flex-col items-center">
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
                Psicólogos
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
        <button
          onClick={() => onNavigate("doacao")}
          className="w-full sm:w-auto px-6 py-2.5 sm:px-8 sm:py-3 md:py-4 border-2 border-sun/50 text-forest rounded-full font-semibold bg-white/90 backdrop-blur hover:bg-sun-light transition-all whitespace-nowrap text-xs sm:text-sm md:text-base pointer-events-auto text-center"
        >
          Doe uma sessão de terapia
        </button>
      </div>
    </div>
  );
}
