import React, { useState, useEffect } from "react";
import { PhoneCall, ArrowRight, X, Heart } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { subscribeCampanhasConfig, resolveCampanhaAtiva } from "../lib/campanhasService";
import { CampanhaMesData, CampanhasConfigState } from "../types/campanhas";
import { ApoioImediatoModal } from "./ApoioImediatoModal";

interface CampanhaPrevencaoBannerProps {
  onNavigateAcolhimento: () => void;
}

export function CampanhaPrevencaoBanner({ onNavigateAcolhimento }: CampanhaPrevencaoBannerProps) {
  const [config, setConfig] = useState<CampanhasConfigState | null>(null);
  const [campanhaAtiva, setCampanhaAtiva] = useState<CampanhaMesData | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [showCvvModal, setShowCvvModal] = useState(false);

  useEffect(() => {
    const unsub = subscribeCampanhasConfig((newConfig) => {
      setConfig(newConfig);
      const ativa = resolveCampanhaAtiva(newConfig);
      setCampanhaAtiva(ativa);
    });

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
      unsub();
      window.removeEventListener("reopen-campanha-prevencao", handleReopen);
      window.removeEventListener("open-cvv-modal", handleOpenModal);
    };
  }, []);

  // Se o banner foi desabilitado na Gestão ou não há campanha ativa
  if (!campanhaAtiva) {
    return (
      <ApoioImediatoModal
        isOpen={showCvvModal}
        onClose={() => setShowCvvModal(false)}
        onNavigateAcolhimento={onNavigateAcolhimento}
        campanhaNome="Apoio Emocional Imediato"
        lacoEmoji="🤍"
      />
    );
  }

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
          aria-label={`Campanha de ${campanhaAtiva.nomeCampanha}`}
          className="w-full relative z-[60] shadow-sm border-b border-black/15 overflow-hidden flex flex-col items-center justify-center py-2.5 sm:py-3.5 transition-all"
        >
          {/* Foto de fundo nítida de ponta a ponta com fallback gracioso */}
          <div className="absolute inset-0 pointer-events-none bg-slate-900">
            <img
              src={campanhaAtiva.imagemFundoUrl}
              alt={`Banner Temático - ${campanhaAtiva.nomeCampanha}`}
              className="w-full h-full object-cover object-center"
              onError={(e) => {
                // Em caso de falha de carregamento da imagem remota, mantém fundo elegante
                (e.target as HTMLElement).style.display = "none";
              }}
            />
            {/* Película sutil para garantir leitura da tipografia */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/45 to-black/60" />
            {/* Esmaecimento no pé do banner */}
            <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
          </div>

          {/* Botão de Fechar no canto superior direito */}
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 sm:top-2.5 sm:right-4 p-1.5 text-white/80 hover:text-white hover:bg-black/40 rounded-full transition-colors cursor-pointer z-20"
            title="Ocultar aviso temporariamente"
            aria-label="Ocultar aviso de campanha"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="max-w-[1440px] mx-auto w-full px-3.5 sm:px-6 relative z-10 flex flex-col items-center text-center gap-1.5 sm:gap-2 text-white">
            
            {/* LINHA 1: Badge Temático com Laço */}
            <div className="flex items-center justify-center">
              <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 sm:py-1 rounded-full ${campanhaAtiva.badgeBgClass} text-xs font-bold tracking-tight shadow-md`}>
                <span className="text-sm leading-none" role="img" aria-label="Símbolo da Campanha">
                  {campanhaAtiva.lacoEmoji}
                </span>
                <span>{campanhaAtiva.nomeCampanha}</span>
                <span className="opacity-60">•</span>
                <span className="font-semibold text-[11px]">{campanhaAtiva.subtitulo}</span>
              </span>
            </div>

            {/* LINHA 2: Frase */}
            <p className="text-xs sm:text-sm text-white font-medium leading-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] max-w-2xl px-2">
              <strong className="font-semibold text-white">{campanhaAtiva.frasePrincipal}</strong>{" "}
              {campanhaAtiva.fraseComplementar}
            </p>

            {/* LINHA 3: Botões na mesma linha com chave seletora */}
            {(() => {
              const botoesHabilitadosGeral = config?.exibirBotoesGeral !== false;
              const botoesHabilitadosMes = campanhaAtiva.exibirBotoes !== false;
              const showBotaoPrincipal = botoesHabilitadosGeral && botoesHabilitadosMes && (campanhaAtiva.exibirBotaoPrincipal !== false);
              const showBotaoSecundario = botoesHabilitadosGeral && botoesHabilitadosMes && (campanhaAtiva.exibirBotaoSecundario !== false);
              
              if (!showBotaoPrincipal && !showBotaoSecundario) return null;

              return (
                <div className="flex items-center justify-center flex-nowrap gap-2 sm:gap-3 shrink-0 pt-0.5">
                  {/* Ação 1: Iniciar Acolhimento */}
                  {showBotaoPrincipal && (
                    <button
                      onClick={onNavigateAcolhimento}
                      className="inline-flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-[#14342B] text-white hover:bg-[#1C4539] border border-white/20 text-xs font-semibold rounded-full shadow-md transition-all hover:scale-[1.02] cursor-pointer whitespace-nowrap"
                      title="Iniciar triagem com valores acessíveis"
                    >
                      <Heart className="w-3.5 h-3.5 text-sun shrink-0" />
                      <span>
                        <span className="hidden sm:inline">Iniciar </span>Acolhimento
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 ml-0.5 shrink-0 hidden sm:inline" />
                    </button>
                  )}

                  {/* Ação 2: Botão Contextualizado / CVV 188 */}
                  {showBotaoSecundario && (
                    <button
                      onClick={() => {
                        if (campanhaAtiva.botaoSecundarioAcao === "acolhimento") {
                          onNavigateAcolhimento();
                        } else if (campanhaAtiva.botaoSecundarioAcao === "link" && campanhaAtiva.linkSecundarioUrl) {
                          window.open(campanhaAtiva.linkSecundarioUrl, "_blank", "noopener,noreferrer");
                        } else {
                          setShowCvvModal(true);
                        }
                      }}
                      className={`inline-flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 ${campanhaAtiva.btnSecundarioBgClass} text-xs font-bold rounded-full shadow-md transition-all hover:scale-[1.02] cursor-pointer whitespace-nowrap`}
                      title="Ver canais de apoio imediato e emergência"
                    >
                      <PhoneCall className="w-3.5 h-3.5 shrink-0" />
                      <span>{campanhaAtiva.botaoSecundarioTexto}</span>
                    </button>
                  )}
                </div>
              );
            })()}

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
            className="fixed bottom-24 right-4 sm:bottom-6 sm:right-6 z-40 inline-flex items-center gap-2 px-3.5 py-2 bg-white/95 hover:bg-white text-forest border border-soft rounded-full shadow-lg hover:shadow-xl transition-all text-xs font-semibold group cursor-pointer backdrop-blur-xs"
            title={`Clique para reabrir o aviso de ${campanhaAtiva.nomeCampanha}`}
            id="restore-campanha-prevencao-btn"
          >
            <span className="text-sm leading-none" role="img" aria-label="Símbolo da Campanha">
              {campanhaAtiva.lacoEmoji}
            </span>
            <span className="font-bold text-forest">{campanhaAtiva.nomeCampanha}</span>
            <span className="text-forest/40 hidden sm:inline">•</span>
            <span className="text-forest/80 group-hover:text-forest hidden sm:inline">
              Apoio 188
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Modal de Apoio Imediato e CVV 188 */}
      <ApoioImediatoModal
        isOpen={showCvvModal}
        onClose={() => setShowCvvModal(false)}
        onNavigateAcolhimento={onNavigateAcolhimento}
        campanhaNome={`${campanhaAtiva.nomeCampanha} • ${campanhaAtiva.subtitulo}`}
        lacoEmoji={campanhaAtiva.lacoEmoji}
      />
    </>
  );
}
