import React, { useEffect } from "react";
import { PhoneCall, ArrowRight, X, LifeBuoy, AlertCircle, ExternalLink, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ApoioImediatoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateAcolhimento?: () => void;
  campanhaNome?: string;
  lacoEmoji?: string;
}

export function ApoioImediatoModal({
  isOpen,
  onClose,
  onNavigateAcolhimento,
  campanhaNome = "Apoio Emocional e Valorização da Vida",
  lacoEmoji = "🎗️",
}: ApoioImediatoModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-forest/60 backdrop-blur-xs flex items-center justify-center z-[99999] p-4 sm:p-6 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="apoio-imediato-modal-title"
        >
          {/* Backdrop click */}
          <div 
            className="fixed inset-0"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            className="relative max-w-lg w-full bg-white rounded-3xl p-6 sm:p-8 border border-amber-200/90 shadow-2xl z-10 flex flex-col gap-5 text-[#14342B] my-auto"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 text-forest/40 hover:text-forest hover:bg-warm rounded-full transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header with Ribbon icon */}
            <div className="flex items-start gap-3.5 sm:gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0 border border-amber-200 text-2xl shadow-xs">
                {lacoEmoji}
              </div>
              <div className="pr-6">
                <span className="text-[11px] uppercase tracking-wider font-bold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/70 inline-block">
                  {campanhaNome}
                </span>
                <h3 id="apoio-imediato-modal-title" className="font-serif text-xl sm:text-2xl font-semibold text-forest mt-1.5 leading-snug">
                  Apoio Emocional Imediato 24h
                </h3>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-forest/80 leading-relaxed">
              Se você ou alguém que você conhece está passando por sofrimento intenso, crise emocional ou ideação suicida, saiba que <strong>sua vida tem valor</strong> e há profissionais e voluntários capacitados prontos para te escutar com sigilo absoluto agora mesmo:
            </p>

            {/* Main CVV 188 card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFBEB] border border-amber-200/90 flex flex-col gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-amber-200/90 flex items-center justify-center text-amber-950 shrink-0">
                  <LifeBuoy className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-forest">CVV • Centro de Valorização da Vida</h4>
                  <p className="text-[11px] sm:text-xs text-forest/75 font-medium">Atendimento 24 horas por dia • Gratuito, anônimo e sigiloso</p>
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

            {/* Emergency note */}
            <div className="flex items-start gap-2.5 p-3.5 bg-warm/60 rounded-xl border border-soft text-[11px] text-forest/75 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-forest/60 shrink-0 mt-0.5" />
              <span>
                Em situações de risco grave imediato ou emergência médica física, ligue para o <strong>SAMU (192)</strong> ou dirija-se à <strong>UPA / Pronto-Socorro</strong> mais próximo.
              </span>
            </div>

            {/* Next step with AcolheMente */}
            {onNavigateAcolhimento && (
              <div className="pt-2 border-t border-soft flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-forest/70 text-center sm:text-left">
                  Busca acompanhamento contínuo com psicólogos parceiros?
                </span>
                <button
                  onClick={() => {
                    onClose();
                    onNavigateAcolhimento();
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-sun text-forest hover:bg-sun-dark text-xs font-bold rounded-full transition-colors flex items-center justify-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
                >
                  Ir para Triagem AcolheMente
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
