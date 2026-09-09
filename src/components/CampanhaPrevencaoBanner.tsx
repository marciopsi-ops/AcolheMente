import React, { useState, useEffect } from "react";
import { PhoneCall, ArrowRight, X, Heart, ExternalLink, LifeBuoy, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import bannerBgImage from "../assets/images/setembro_amarelo_wide_banner_1788989264676.jpg";

interface CampanhaPrevencaoBannerProps {
  onNavigateAcolhimento: () => void;
}

export function CampanhaPrevencaoBanner({ onNavigateAcolhimento }: CampanhaPrevencaoBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [showCvvModal, setShowCvvModal] = useState(false);

  useEffect(() => {
    const handleReopen = () => {
      setIsVisible(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleOpenModal = () => {
      setShowCvvModal(true);
    };

    window.addEventListener("reopen-campanha-prevencao", handleReopen);
    window.addEventListener("open-cvv-modal", handleOpenModal);

    return () => {
      window.removeEventListener("reopen-campanha-prevencao", handleReopen);
      window.removeEventListener("open-cvv-modal", handleOpenModal);
    };
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  const handleRestore = () => {
    setIsVisible(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {isVisible && (
        <aside 
          aria-label="Campanha de Valorização da Vida e Prevenção ao Suicídio"
          className="w-full relative z-[60] shadow-sm border-b border-amber-300/80 overflow-hidden flex flex-col items-center justify-center py-2.5 sm:py-3.5"
        >
          {/* Foto de fundo nítida de ponta a ponta */}
          <div className="absolute inset-0 pointer-events-none">
            <img
              src={bannerBgImage}
              alt="Flores amarelas ao amanhecer - Setembro Amarelo"
              className="w-full h-full object-cover object-center"
            />
            {/* Película sutil para garantir leitura da tipografia */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/55" />
          </div>

          {/* Botão de Fechar no canto superior direito */}
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 sm:top-2.5 sm:right-4 p-1.5 text-white/80 hover:text-white hover:bg-black/30 rounded-full transition-colors cursor-pointer z-20"
            title="Ocultar aviso temporariamente"
            aria-label="Ocultar aviso de campanha"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="max-w-[1440px] mx-auto w-full px-3.5 sm:px-6 relative z-10 flex flex-col items-center text-center gap-1.5 sm:gap-2 text-white">
            
            {/* LINHA 1: Setembro Amarelo */}
            <div className="flex items-center justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 sm:py-1 rounded-full bg-amber-400 text-amber-950 text-xs font-bold tracking-tight shadow-md">
                <span className="text-sm leading-none" role="img" aria-label="Laço amarelo">🎗️</span>
                <span>Setembro Amarelo</span>
                <span className="text-amber-950/60">•</span>
                <span className="text-amber-950 font-semibold text-[11px]">Mês de prevenção ao suicídio</span>
              </span>
            </div>

            {/* LINHA 2: Frase */}
            <p className="text-xs sm:text-sm text-white font-medium leading-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] max-w-2xl px-2">
              <strong className="font-semibold text-white">Você não está sozinho.</strong>{" "}
              Falar sobre o que sente é o primeiro passo para o acolhimento.
            </p>

            {/* LINHA 3: Botões na mesma linha */}
            <div className="flex items-center justify-center flex-nowrap gap-2 sm:gap-3 shrink-0 pt-0.5">
              {/* Ação 1: Iniciar Acolhimento */}
              <button
                onClick={onNavigateAcolhimento}
                className="inline-flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-[#14342B] text-white hover:bg-[#1C4539] border border-amber-300/40 text-xs font-semibold rounded-full shadow-md transition-all hover:scale-[1.02] cursor-pointer whitespace-nowrap"
                title="Iniciar triagem com valores acessíveis"
              >
                <Heart className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>
                  <span className="hidden sm:inline">Iniciar </span>Acolhimento
                </span>
                <ArrowRight className="w-3.5 h-3.5 ml-0.5 shrink-0 hidden sm:inline" />
              </button>

              {/* Ação 2: CVV 188 Apoio Imediato */}
              <button
                onClick={() => setShowCvvModal(true)}
                className="inline-flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs font-bold rounded-full shadow-md transition-all hover:scale-[1.02] cursor-pointer whitespace-nowrap"
                title="Ver canais de apoio imediato e emergência"
              >
                <PhoneCall className="w-3.5 h-3.5 text-amber-950 shrink-0" />
                <span>
                  <span className="hidden sm:inline">Apoio Imediato • </span>CVV 188
                </span>
              </button>
            </div>

          </div>
        </aside>
      )}

      {/* Floating Restore Pill when Banner is dismissed */}
      <AnimatePresence>
        {!isVisible && (
          <motion.button
            initial={{ opacity: 0, y: 15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            onClick={handleRestore}
            className="fixed bottom-24 right-4 sm:bottom-6 sm:right-6 z-40 inline-flex items-center gap-2 px-3.5 py-2 bg-[#FFFBEB] hover:bg-amber-100 text-[#14342B] border border-amber-300/90 rounded-full shadow-lg hover:shadow-xl transition-all text-xs font-semibold group cursor-pointer"
            title="Clique para reabrir a barra do Setembro Amarelo e canais de apoio"
            id="restore-campanha-prevencao-btn"
          >
            <span className="text-sm leading-none" role="img" aria-label="Laço amarelo">🎗️</span>
            <span className="font-bold text-amber-950">Setembro Amarelo</span>
            <span className="text-amber-800/60 hidden sm:inline">•</span>
            <span className="text-forest/80 group-hover:text-forest hidden sm:inline">
              Apoio 188
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Modal de Apoio Imediato e CVV 188 */}
      <AnimatePresence>
        {showCvvModal && (
          <div 
            className="fixed inset-0 bg-forest/50 backdrop-blur-xs flex items-center justify-center z-[9999] p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cvv-modal-title"
          >
            {/* Backdrop click */}
            <div 
              className="fixed inset-0"
              onClick={() => setShowCvvModal(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="relative max-w-lg w-full bg-white rounded-3xl p-6 sm:p-8 border border-amber-200/90 shadow-2xl z-10 flex flex-col gap-5 text-[#14342B]"
            >
              {/* Close button */}
              <button
                onClick={() => setShowCvvModal(false)}
                className="absolute top-5 right-5 p-2 text-forest/40 hover:text-forest hover:bg-warm rounded-full transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header with Ribbon icon */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0 border border-amber-200 text-2xl">
                  🎗️
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/60">
                    Setembro Amarelo • Mês de Prevenção ao Suicídio
                  </span>
                  <h3 id="cvv-modal-title" className="font-serif text-xl sm:text-2xl font-semibold text-forest mt-1">
                    Apoio Emocional Imediato
                  </h3>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-forest/80 leading-relaxed">
                Se você está passando por um momento de sofrimento intenso, crise emocional ou ideação suicida, saiba que <strong>sua vida importa</strong> e há pessoas prontas para te escutar com sigilo e respeito agora mesmo:
              </p>

              {/* Main CVV 188 card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFBEB] border border-amber-200/90 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-amber-200/80 flex items-center justify-center text-amber-900">
                      <LifeBuoy className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-forest">CVV • Centro de Valorização da Vida</h4>
                      <p className="text-xs text-forest/70">Atendimento 24 horas por dia • Gratuito e anônimo</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <a
                    href="tel:188"
                    className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#14342B] text-white hover:bg-[#1C4539] text-xs font-bold rounded-xl shadow-xs transition-colors"
                  >
                    <PhoneCall className="w-4 h-4 text-amber-300" />
                    Ligar Grátis: 188
                  </a>
                  <a
                    href="https://cvv.org.br"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-amber-300/80 hover:bg-amber-50 text-forest text-xs font-bold rounded-xl shadow-2xs transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-amber-800" />
                    Acessar Chat no Site
                  </a>
                </div>
              </div>

              {/* Emergence note */}
              <div className="flex items-start gap-2.5 p-3.5 bg-warm/60 rounded-xl border border-soft text-[11px] text-forest/75 leading-relaxed">
                <AlertCircle className="w-4 h-4 text-forest/60 shrink-0 mt-0.5" />
                <span>
                  Em situações de risco grave imediato ou emergência médica, ligue para o <strong>SAMU (192)</strong> ou dirija-se à <strong>UPA / Pronto-Socorro</strong> mais próximo.
                </span>
              </div>

              {/* Next step with AcolheMente */}
              <div className="pt-2 border-t border-soft flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-forest/70 text-center sm:text-left">
                  Deseja acompanhamento contínuo com psicólogos parceiros?
                </span>
                <button
                  onClick={() => {
                    setShowCvvModal(false);
                    onNavigateAcolhimento();
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-sun text-forest hover:bg-sun-dark text-xs font-bold rounded-full transition-colors flex items-center justify-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
                >
                  Ir para Triagem AcolheMente
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
