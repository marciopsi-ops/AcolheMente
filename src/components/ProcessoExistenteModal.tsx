import React from "react";
import { AlertCircle, RotateCcw, ClipboardEdit, ArrowRight, X } from "lucide-react";

interface ProcessoExistenteModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  cpf?: string;
  nome?: string;
  onUpdateQuestionnaire: () => void;
  onRestartProcess: () => Promise<void> | void;
  isProcessing?: boolean;
}

export function ProcessoExistenteModal({
  isOpen,
  onClose,
  email,
  cpf,
  nome,
  onUpdateQuestionnaire,
  onRestartProcess,
  isProcessing = false,
}: ProcessoExistenteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 border border-soft relative overflow-hidden flex flex-col gap-6"
        role="dialog"
        aria-modal="true"
      >
        {/* Botão de Fechar */}
        <button
          type="button"
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-warm/80 hover:bg-warm text-forest/70 hover:text-forest flex items-center justify-center transition-colors cursor-pointer"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Topo / Alerta */}
        <div className="flex items-start gap-4 pr-8">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0 shadow-2xs">
            <AlertCircle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-300 inline-block mb-1.5">
              Processo Existente Identificado
            </span>
            <h3 className="text-lg sm:text-xl font-serif font-bold text-forest leading-snug">
              {nome ? `Olá, ${nome.split(" ")[0]}!` : "Identificamos seu cadastro anterior"}
            </h3>
            <p className="text-xs sm:text-sm text-forest/80 mt-1">
              Já existe um processo em nosso sistema com esses dados:
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {email && (
                <div className="font-mono text-xs font-semibold text-forest bg-warm px-2.5 py-1 rounded-lg border border-soft">
                  {email}
                </div>
              )}
              {cpf && (
                <div className="font-mono text-xs font-semibold text-forest bg-warm px-2.5 py-1 rounded-lg border border-soft">
                  CPF: {cpf}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Orientação */}
        <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200/80 text-xs text-amber-950 leading-relaxed">
          Para garantir seu atendimento com agilidade, você pode escolher como deseja prosseguir. Em <strong>ambas as opções</strong>, seu caso será direcionado para <strong>Novos Acolhimentos</strong> da nossa equipe de triagem.
        </div>

        {/* Opções de Ação */}
        <div className="flex flex-col gap-3.5">
          {/* Opção 1: Atualizar Questionário */}
          <div 
            onClick={!isProcessing ? onUpdateQuestionnaire : undefined}
            className="group p-4 sm:p-5 rounded-2xl border-2 border-forest/15 hover:border-forest/40 bg-white hover:bg-forest/[0.02] transition-all cursor-pointer shadow-xs flex flex-col gap-2.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-forest/10 flex items-center justify-center text-forest group-hover:bg-forest group-hover:text-white transition-colors shrink-0">
                  <ClipboardEdit className="w-4 h-4" />
                </div>
                <h4 className="text-sm sm:text-base font-bold text-forest">
                  Preencher novamente e atualizar o questionário
                </h4>
              </div>
              <ArrowRight className="w-4 h-4 text-forest/40 group-hover:text-forest transition-colors shrink-0" />
            </div>
            <p className="text-xs text-forest/75 pl-11 leading-relaxed">
              Continue para as próximas etapas para atualizar suas informações socioeconômicas, horários e queixa. Ao finalizar, seu questionário atualizado irá para <strong>Novos Acolhimentos</strong>.
            </p>
            <div className="pl-11 pt-1">
              <button
                type="button"
                disabled={isProcessing}
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateQuestionnaire();
                }}
                className="px-4 py-2 bg-forest text-white text-xs font-bold rounded-xl shadow-xs hover:bg-forest/90 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Atualizar Questionário</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Opção 2: Reiniciar o Processo */}
          <div 
            onClick={!isProcessing ? onRestartProcess : undefined}
            className="group p-4 sm:p-5 rounded-2xl border-2 border-amber-300/80 hover:border-amber-400 bg-amber-50/40 hover:bg-amber-50/80 transition-all cursor-pointer shadow-xs flex flex-col gap-2.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-200/80 flex items-center justify-center text-amber-900 group-hover:bg-amber-500 group-hover:text-white transition-colors shrink-0">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <h4 className="text-sm sm:text-base font-bold text-amber-950">
                  Reiniciar o processo agora
                </h4>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-600/60 group-hover:text-amber-800 transition-colors shrink-0" />
            </div>
            <p className="text-xs text-forest/75 pl-11 leading-relaxed">
              Reinicie seu acolhimento imediatamente com os dados informados. Seu cadastro anterior será reativado e encaminhado agora mesmo para a fila de <strong>Novos Acolhimentos</strong>.
            </p>
            <div className="pl-11 pt-1">
              <button
                type="button"
                disabled={isProcessing}
                onClick={(e) => {
                  e.stopPropagation();
                  onRestartProcess();
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Reiniciando Processo...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reiniciar Processo Agora</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="text-xs text-forest/60 hover:text-forest font-semibold transition-colors cursor-pointer"
          >
            Voltar ao formulário e editar dados
          </button>
        </div>
      </div>
    </div>
  );
}
