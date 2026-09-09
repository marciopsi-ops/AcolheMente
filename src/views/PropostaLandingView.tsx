import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { 
  Leaf, 
  Heart, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Info, 
  Calculator, 
  PauseCircle, 
  RotateCcw, 
  X, 
  HelpCircle,
  MessageSquare
} from "lucide-react";
import { 
  sendProposalAcceptedToPatientEmail, 
  sendProposalAcceptedToProfessionalEmail, 
  sendProposalRevisionRequestEmail 
} from "../lib/emailService";
import { Breadcrumbs } from "../components/Breadcrumbs";

const SUGESTOES_PAUSA_CANCELAMENTO = [
  "Valores acima do meu orçamento no momento",
  "Incompatibilidade de horários ou rotina",
  "Insegurança quanto ao formato de atendimento online",
  "Decidi buscar outra abordagem ou atendimento presencial",
  "Questões de saúde ou imprevistos pessoais",
  "Já iniciei acompanhamento com outro profissional",
  "Outro motivo",
];

const SUGESTOES_REVISAO = [
  "O valor da sessão está acima do meu orçamento atual",
  "Gostaria de solicitar uma frequência diferente (ex: quinzenal ou mensal)",
  "Gostaria de verificar possibilidade de valor social",
  "Incompatibilidade de horários com o profissional indicado",
  "Gostaria de conversar antes com a equipe de triagem",
  "Outro motivo",
];

export function PropostaLandingView({
  propostaId,
  onBack,
  onGoHome,
}: {
  propostaId: string;
  onBack: () => void;
  onGoHome?: () => void;
}) {
  const [loading, setLoading] = useState(true);

  const handleGoHome = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (onGoHome) {
      onGoHome();
    } else if (onBack) {
      onBack();
    } else {
      window.location.href = window.location.origin;
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal para Motivo de Pausa/Cancelamento ou Revisão
  const [activeModal, setActiveModal] = useState<'pausar' | 'revisar' | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [freeFormReason, setFreeFormReason] = useState<string>("");
  const [reasonError, setReasonError] = useState<string>("");

  const openModal = (type: 'pausar' | 'revisar') => {
    setActiveModal(type);
    setSelectedReason("");
    setFreeFormReason("");
    setReasonError("");
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setActiveModal(null);
    setSelectedReason("");
    setFreeFormReason("");
    setReasonError("");
  };

  useEffect(() => {
    const fetchAcolhimento = async () => {
      try {
        const docSnap = await getDoc(doc(db, "acolhimentos", propostaId));
        if (docSnap.exists()) {
          const docData = docSnap.data();
          setData(docData);
          if (docData.propostaStatus) {
            setStatus(docData.propostaStatus);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAcolhimento();
  }, [propostaId]);

  const handleConfirmModalAction = async () => {
    if (!activeModal) return;

    const finalReason = freeFormReason.trim()
      ? (selectedReason && selectedReason !== "Outro motivo" && !freeFormReason.toLowerCase().includes(selectedReason.toLowerCase())
          ? `${selectedReason} - Detalhes: ${freeFormReason.trim()}`
          : freeFormReason.trim())
      : selectedReason.trim();

    if (!finalReason) {
      setReasonError("Por favor, selecione uma das sugestões ou escreva o motivo para prosseguir.");
      return;
    }

    try {
      setIsSubmitting(true);
      const nowIso = new Date().toISOString();
      const nowStr = new Date().toLocaleString("pt-BR");

      if (activeModal === 'pausar') {
        const newStatus = 'Processo pausado ou cancelado pelo paciente';
        const notifAnterior = data.notificacao ? data.notificacao + "\n\n" : "";
        const updateData: any = {
          status: "Standby",
          statusInativacao: "Standby",
          propostaStatus: newStatus,
          propostaEnviada: false,
          motivoPausaCancelamento: finalReason,
          dataPausaCancelamento: nowIso,
          notificacao: `${notifAnterior}[${nowStr}] Paciente pausou/cancelou o processo através da página de proposta. Motivo: "${finalReason}". Movido para Standby na Triagem.`,
        };

        await updateDoc(doc(db, "acolhimentos", propostaId), updateData);
        setData((prev: any) => ({ ...prev, ...updateData }));
        setStatus(newStatus);
        closeModal();
      } else if (activeModal === 'revisar') {
        const newStatus = 'Paciente solicita revisão da proposta';
        const notifAnterior = data.notificacao ? data.notificacao + "\n\n" : "";
        const updateData: any = {
          status: "Aguardando Avaliação", // Reinicia para Novos Acolhimentos (Etapa 1 da Triagem)
          propostaStatus: newStatus,
          propostaEnviada: false,
          atribuicaoStatus: null,
          motivoRevisao: finalReason,
          dataSolicitacaoRevisao: nowIso,
          notificacao: `${notifAnterior}[${nowStr}] Paciente solicitou revisão da proposta. Motivo: "${finalReason}". Retornado para Novos Acolhimentos na Triagem.`,
        };

        await updateDoc(doc(db, "acolhimentos", propostaId), updateData);

        try {
          await sendProposalRevisionRequestEmail(data.nome, data.email);
        } catch (emailErr) {
          console.error("Error sending proposal revision confirmation email:", emailErr);
        }

        setData((prev: any) => ({ ...prev, ...updateData }));
        setStatus(newStatus);
        closeModal();
      }
    } catch (err) {
      console.error("Erro ao salvar resposta do paciente:", err);
      alert("Erro ao registrar resposta. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = async (action: 'aceitar') => {
    try {
      setIsSubmitting(true);
      const newStatus = 'Proposta aceita pelo paciente';
      
      const updateData: any = {
        propostaStatus: newStatus,
      };

      await updateDoc(doc(db, "acolhimentos", propostaId), updateData);

      // Retrieve professional info if assigned
      let profData: any = null;
      if (data && data.profissionalId) {
        try {
          const profSnap = await getDoc(doc(db, "users", data.profissionalId));
          if (profSnap.exists()) {
            profData = profSnap.data();
          }
        } catch (err) {
          console.error("Error retrieving professional info for email dispatch:", err);
        }
      }

      // Dispatch automatic notification emails
      const profName = profData ? (profData.name || "Profissional Atribuído") : "Profissional Atribuído";
      
      // 1. Email to Patient
      try {
        await sendProposalAcceptedToPatientEmail(data.nome, data.email, profName);
      } catch (emailErr) {
        console.error("Error sending proposal acceptance email to patient:", emailErr);
      }

      // 2. Email to Professional
      if (profData && profData.email) {
        try {
          await sendProposalAcceptedToProfessionalEmail(
            profData.email,
            profData.name || "Profissional",
            data.nome,
            data.email,
            data.telefone || "Não informado",
            data.valorSessao || "A combinar",
            data.frequenciaSessoes || "Semanal"
          );
        } catch (emailErr) {
          console.error("Error sending proposal acceptance email to professional:", emailErr);
        }
      }

      setStatus(newStatus);
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar resposta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm">
        <div className="animate-pulse text-forest font-semibold">Carregando...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-warm">
        <h2 className="text-2xl font-serif text-forest mb-4">Proposta não encontrada</h2>
        <button onClick={onBack} className="text-sun-dark hover:underline">Voltar</button>
      </div>
    );
  }

  if (status === 'Proposta aceita pelo paciente') {
    return (
      <div className="min-h-screen bg-warm flex flex-col items-center py-20 px-6">
        <div className="bg-white rounded-[2.5rem] shadow-xl p-12 max-w-lg w-full flex flex-col items-center text-center border border-soft slide-up">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="font-serif text-3xl text-forest mb-4">Proposta Aceita!</h2>
          <p className="text-forest/70 mb-8 leading-relaxed">
            Seja muito bem-vindo(a) ao Projeto AcolheMente Saúde. Por favor, aguarde para receber o contato do profissional atribuído para o início dos seus atendimentos.
          </p>
          <button
            onClick={handleGoHome}
            className="w-full py-3 bg-forest text-white rounded-full font-semibold text-sm hover:bg-forest/90 transition-all cursor-pointer"
          >
            Voltar à Página Inicial
          </button>
        </div>
      </div>
    );
  }

  if (status === 'Processo pausado ou cancelado pelo paciente') {
    return (
      <div className="min-h-screen bg-warm flex flex-col items-center justify-center py-16 px-6">
        <div className="bg-white rounded-[2.5rem] shadow-xl p-8 sm:p-12 max-w-lg w-full flex flex-col items-center text-center border border-soft slide-up">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6 border border-amber-200">
            <PauseCircle className="w-10 h-10 text-amber-600" />
          </div>
          <h2 className="font-serif text-3xl text-forest mb-3">Processo Pausado / Cancelado</h2>
          <p className="text-forest/80 mb-6 leading-relaxed text-sm sm:text-base">
            Seu processo de atendimento foi pausado e colocado em <strong>Standby</strong> com sucesso.
          </p>
          {data?.motivoPausaCancelamento && (
            <div className="w-full bg-warm/60 p-4 rounded-2xl border border-soft text-left mb-6">
              <span className="text-[10px] font-bold uppercase tracking-wider text-forest/60 block mb-1">
                Motivo Registrado para a Triagem:
              </span>
              <p className="text-xs sm:text-sm text-forest font-serif italic leading-relaxed">
                "{data.motivoPausaCancelamento}"
              </p>
            </div>
          )}
          <p className="text-xs text-forest/70 mb-8 leading-relaxed">
            Seus dados e respostas anteriores permanecem preservados em nosso sistema. Caso decida retomar seu acompanhamento no futuro, você poderá preencher novamente e atualizar o questionário ou reiniciar o processo para ser recebido em Novos Acolhimentos.
          </p>
          <button
            onClick={handleGoHome}
            className="w-full py-3.5 bg-forest text-white rounded-full font-semibold text-sm hover:bg-forest/90 transition-all cursor-pointer shadow-sm"
          >
            Voltar à Página Inicial
          </button>
        </div>
      </div>
    );
  }

  if (status === 'Paciente solicita revisão da proposta') {
    return (
      <div className="min-h-screen bg-warm flex flex-col items-center justify-center py-16 px-6">
        <div className="bg-white rounded-[2.5rem] shadow-xl p-8 sm:p-12 max-w-lg w-full flex flex-col items-center text-center border border-soft slide-up">
          <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10 text-orange-500" />
          </div>
          <h2 className="font-serif text-3xl text-forest mb-3">Revisão Solicitada</h2>
          <p className="text-forest/70 mb-6 leading-relaxed">
            Recebemos a sua solicitação. Sua proposta foi encaminhada de volta para a equipe de triagem para reavaliação.
          </p>
          {data?.motivoRevisao && (
            <div className="w-full bg-orange-50/60 p-4 rounded-2xl border border-orange-200 text-left mb-6">
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-800 block mb-1">
                Motivo da Revisão Informado:
              </span>
              <p className="text-xs sm:text-sm text-forest font-serif italic leading-relaxed">
                "{data.motivoRevisao}"
              </p>
            </div>
          )}
          <p className="text-xs text-forest/60 mb-8 leading-relaxed">
            Entraremos em contato em breve com um retorno ou nova proposta ajustada à sua realidade.
          </p>
          <button
            onClick={handleGoHome}
            className="w-full py-3 bg-forest text-white rounded-full font-semibold text-sm hover:bg-forest/90 transition-all cursor-pointer"
          >
            Voltar à Página Inicial
          </button>
        </div>
      </div>
    );
  }

  // Cálculo do valor mensal aproximado com base no valor da sessão e frequência
  const getValorMensalInfo = () => {
    if (!data?.valorSessao) {
      return {
        valorMensalStr: "A combinar",
        multiplicador: 4,
        freqDesc: "conforme frequência",
        isCalculado: false,
      };
    }

    if (data.valorSessao.toLowerCase().includes("gratuito")) {
      return {
        valorMensalStr: "Gratuito",
        multiplicador: 4,
        freqDesc: "Atendimento Isento",
        isCalculado: true,
      };
    }

    const matches = data.valorSessao.match(/(\d+[\d.,]*)/);
    if (!matches) {
      return {
        valorMensalStr: "A combinar",
        multiplicador: 4,
        freqDesc: "A combinar",
        isCalculado: false,
      };
    }

    let cleanValor = matches[0];
    if (cleanValor.includes(",") && cleanValor.includes(".")) {
      cleanValor = cleanValor.replace(/\./g, "").replace(",", ".");
    } else if (cleanValor.includes(",")) {
      cleanValor = cleanValor.replace(",", ".");
    }

    const valorNum = parseFloat(cleanValor);
    if (isNaN(valorNum) || valorNum <= 0) {
      return {
        valorMensalStr: "A combinar",
        multiplicador: 4,
        freqDesc: "A combinar",
        isCalculado: false,
      };
    }

    let multiplicador = 4;
    let freqDesc = "4 sessões/mês";
    const freq = (data.frequenciaSessoes || "Semanal").toLowerCase();

    if (freq.includes("quinzenal")) {
      multiplicador = 2;
      freqDesc = "2 sessões/mês";
    } else if (freq.includes("mensal")) {
      multiplicador = 1;
      freqDesc = "1 sessão/mês";
    } else if (freq.includes("sob demanda")) {
      multiplicador = 1;
      freqDesc = "sob demanda";
    } else {
      multiplicador = 4;
      freqDesc = "4 sessões/mês";
    }

    const total = valorNum * multiplicador;
    const valorMensalStr = `R$ ${total.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    return {
      valorMensalStr,
      multiplicador,
      freqDesc,
      valorNum,
      isCalculado: true,
    };
  };

  const valorMensalInfo = getValorMensalInfo();

  return (
    <div className="min-h-screen bg-warm flex flex-col selection:bg-sun-dark/30">
      <nav className="p-6 md:px-12 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-50 border-b border-soft">
        <div className="flex items-center gap-3 cursor-pointer" onClick={onBack}>
          <div className="w-10 h-10 bg-sun-dark rounded-xl flex items-center justify-center rotate-3 shadow-sm">
            <Leaf className="w-5 h-5 text-forest -rotate-3" />
          </div>
          <span className="font-serif text-2xl font-medium tracking-tight text-forest">
            Acolhe
          </span>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto w-full px-6 md:px-12 mt-4">
        <Breadcrumbs items={[{ label: "Início", onClick: onBack }, { label: "Proposta de Atendimento", active: true }]} className="!px-0 !mt-0" />
      </div>

      <main className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full gap-12 p-6 md:p-12">
        <div className="flex-1 lg:max-w-2xl flex flex-col justify-center slide-up">
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-forest font-medium leading-[1.1] mb-6">
            Proposta de Atendimento
          </h1>
          <p className="text-lg md:text-xl text-forest/70 leading-relaxed font-light mb-8 max-w-xl">
            Olá {data.nome}, segue abaixo a proposta para o início do seu acompanhamento no Projeto AcolheMente.
          </p>

          <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-soft mb-8 flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-warm/50 p-5 rounded-2xl border border-soft text-center flex flex-col justify-between">
                 <div>
                   <span className="block text-[11px] font-bold uppercase tracking-wider text-forest/70 mb-1.5">Valor por Sessão</span>
                   <span className="text-xl md:text-2xl font-serif text-forest block">{data.valorSessao || "A combinar"}</span>
                 </div>
                 <span className="text-[10px] text-forest/60 mt-2 block font-medium">
                   Sessão indiv. (~45 min)
                 </span>
              </div>

              <div className="bg-warm/50 p-5 rounded-2xl border border-soft text-center flex flex-col justify-between">
                 <div>
                   <span className="block text-[11px] font-bold uppercase tracking-wider text-forest/70 mb-1.5">Frequência</span>
                   <span className="text-xl md:text-2xl font-serif text-forest block">{data.frequenciaSessoes || "Semanal"}</span>
                 </div>
                 <span className="text-[10px] text-forest/60 mt-2 block font-medium">
                   Periodicidade
                 </span>
              </div>

              <div className="bg-emerald-50/80 p-5 rounded-2xl border border-emerald-200 text-center flex flex-col justify-between">
                 <div>
                   <span className="block text-[11px] font-bold uppercase tracking-wider text-emerald-800 mb-1.5">Investimento Aprox. / Mês</span>
                   <span className="text-xl md:text-2xl font-serif text-emerald-950 block">{valorMensalInfo.valorMensalStr}</span>
                 </div>
                 <span className="text-[10px] text-emerald-800/80 mt-2 block font-medium">
                   {valorMensalInfo.isCalculado
                     ? `Aprox. ${valorMensalInfo.freqDesc}`
                     : "A ser definido"}
                 </span>
              </div>
            </div>

            {/* Caixa explicativa sobre valor por sessão vs. valor mensal */}
            <div className="p-4 bg-amber-50/80 border border-amber-200/90 rounded-2xl text-xs text-amber-950 flex items-start gap-3 shadow-xs">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="font-bold block text-amber-950">Atenção sobre os Valores:</strong>
                <p className="leading-relaxed">
                  O valor enquadrado de <strong>{data.valorSessao || "A combinar"}</strong> refere-se a <strong>cada sessão individual</strong>.
                  O valor mensal estimado de <strong>{valorMensalInfo.valorMensalStr}</strong> é calculado multiplicando o valor da sessão pela frequência (<strong>{data.frequenciaSessoes || "Semanal"}</strong> - aprox. {valorMensalInfo.freqDesc}), permitindo que você planeje seu orçamento com total clareza.
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-soft">
               <h3 className="font-serif text-xl text-forest mb-4 flex items-center gap-2">
                 <Clock className="w-5 h-5 text-sun-dark" /> Regras Básicas
               </h3>
               <ul className="space-y-3 text-forest/80 text-sm leading-relaxed">
                 <li className="flex gap-2">
                   <div className="w-1.5 h-1.5 bg-sun-dark rounded-full mt-2 shrink-0"></div>
                   <span>As sessões ocorrerão de forma regular, conforme a frequência estabelecida.</span>
                 </li>
                 <li className="flex gap-2">
                   <div className="w-1.5 h-1.5 bg-sun-dark rounded-full mt-2 shrink-0"></div>
                   <span>Cancelamentos ou reagendamentos devem ser informados com no mínimo <strong>24h de antecedência</strong> para evitar cobranças da sessão.</span>
                 </li>
                 <li className="flex gap-2">
                   <div className="w-1.5 h-1.5 bg-sun-dark rounded-full mt-2 shrink-0"></div>
                   <span>O link do contrato com os termos completos será enviado posteriormente após o seu aceite.</span>
                 </li>
               </ul>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full">
            <div className="flex flex-col sm:flex-row gap-4 w-full">
              <button
                disabled={isSubmitting}
                onClick={() => handleAction('aceitar')}
                className="flex-1 bg-forest text-white hover:bg-forest/90 py-4 rounded-full font-semibold text-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 shadow-md cursor-pointer"
              >
                Aceitar Proposta
              </button>
              <button
                disabled={isSubmitting}
                onClick={() => openModal('revisar')}
                className="flex-1 bg-white text-forest border border-forest/30 hover:bg-warm py-4 rounded-full font-semibold text-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                <RotateCcw className="w-5 h-5 text-sun-dark" />
                Revisar valores ou frequência
              </button>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => openModal('pausar')}
              className="w-full py-3 px-4 text-forest/70 hover:text-rose-700 bg-transparent hover:bg-rose-50/70 border border-transparent hover:border-rose-200 rounded-full font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <PauseCircle className="w-4 h-4 text-rose-500" />
              Cancelar ou pausar meu processo
            </button>
          </div>
        </div>

        <div className="flex-1 hidden lg:flex flex-col justify-center items-center">
          <div className="w-full max-w-md aspect-square bg-sun/20 rounded-[3rem] relative overflow-hidden flex items-center justify-center">
             <Heart className="w-32 h-32 text-sun-dark opacity-50" />
             <div className="absolute inset-0 bg-gradient-to-tr from-sun-dark/20 to-transparent mix-blend-overlay"></div>
          </div>
        </div>
      </main>

      {/* Modal Obrigatório para Motivo de Pausa/Cancelamento ou Revisão */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl border border-soft overflow-hidden animate-in zoom-in-95">
            {/* Header Modal */}
            <div className="p-5 sm:p-6 border-b border-soft bg-warm/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  activeModal === 'pausar' ? 'bg-amber-100 text-amber-800' : 'bg-orange-100 text-orange-800'
                }`}>
                  {activeModal === 'pausar' ? (
                    <PauseCircle className="w-5 h-5" />
                  ) : (
                    <RotateCcw className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-serif text-xl sm:text-2xl text-forest">
                    {activeModal === 'pausar' ? 'Pausar ou Cancelar Processo' : 'Solicitar Revisão da Proposta'}
                  </h3>
                  <p className="text-xs text-forest/70">
                    {activeModal === 'pausar'
                      ? 'Seus dados e respostas anteriores permanecerão salvos na triagem.'
                      : 'Nossa equipe de triagem analisará sua solicitação para buscar um ajuste viável.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                className="p-1.5 text-forest/50 hover:text-forest hover:bg-warm rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 custom-scrollbar">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-forest/90 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-sun-dark" />
                    {activeModal === 'pausar'
                      ? 'Motivo da pausa ou cancelamento'
                      : 'Motivo da solicitação de revisão'}
                    <span className="text-rose-600 font-extrabold">* (Obrigatório)</span>
                  </label>
                </div>
                <p className="text-xs text-forest/60 mb-3">
                  Selecione uma das opções sugeridas abaixo e/ou utilize o campo livre para descrever com seus detalhes:
                </p>

                {/* Sugestões de Respostas */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {(activeModal === 'pausar' ? SUGESTOES_PAUSA_CANCELAMENTO : SUGESTOES_REVISAO).map((sugestao) => {
                    const isSelected = selectedReason === sugestao;
                    return (
                      <button
                        key={sugestao}
                        type="button"
                        onClick={() => {
                          setSelectedReason(sugestao);
                          setReasonError("");
                          if (!freeFormReason.trim() || freeFormReason === selectedReason) {
                            setFreeFormReason(sugestao === "Outro motivo" ? "" : sugestao);
                          }
                        }}
                        className={`text-xs px-3 py-2 rounded-xl border transition-all text-left cursor-pointer ${
                          isSelected
                            ? 'bg-forest text-white border-forest shadow-xs font-semibold'
                            : 'bg-warm/60 text-forest/80 border-soft hover:bg-warm hover:text-forest'
                        }`}
                      >
                        {sugestao}
                      </button>
                    );
                  })}
                </div>

                {/* Campo para Edição Livre */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-forest/70 block">
                    Campo de Edição Livre / Observações:
                  </label>
                  <textarea
                    rows={3}
                    value={freeFormReason}
                    onChange={(e) => {
                      setFreeFormReason(e.target.value);
                      setReasonError("");
                    }}
                    placeholder={
                      activeModal === 'pausar'
                        ? 'Descreva detalhadamente o motivo da pausa ou personalize a opção selecionada...'
                        : 'Descreva os valores, frequência ou horários que melhor se encaixam na sua realidade...'
                    }
                    className="w-full p-3 text-sm bg-warm/30 border border-soft rounded-2xl focus:outline-none focus:border-forest text-forest placeholder:text-forest/40 transition-colors resize-none"
                  />
                </div>

                {reasonError && (
                  <p className="text-xs text-rose-600 font-semibold mt-2 animate-in fade-in">
                    {reasonError}
                  </p>
                )}
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 sm:p-5 border-t border-soft bg-warm/40 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-bold text-forest/70 hover:text-forest hover:bg-warm border border-soft transition-all cursor-pointer"
              >
                Voltar à proposta
              </button>
              <button
                type="button"
                onClick={handleConfirmModalAction}
                disabled={isSubmitting}
                className={`w-full sm:w-auto px-6 py-2.5 rounded-full text-xs font-bold text-white transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                  activeModal === 'pausar'
                    ? 'bg-amber-800 hover:bg-amber-900'
                    : 'bg-forest hover:bg-forest/90'
                }`}
              >
                {isSubmitting ? (
                  <span>Salvando...</span>
                ) : activeModal === 'pausar' ? (
                  <>
                    <PauseCircle className="w-4 h-4" />
                    <span>Confirmar Pausa do Processo</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Enviar Solicitação de Revisão</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="w-full max-w-7xl mx-auto p-6 md:p-12 text-center text-xs text-forest/50 mt-auto">
        <p>Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).</p>
      </footer>
    </div>
  );
}
