import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Leaf, Heart, CheckCircle2, Clock, AlertCircle, Info, Calculator } from "lucide-react";
import { 
  sendProposalAcceptedToPatientEmail, 
  sendProposalAcceptedToProfessionalEmail, 
  sendProposalRevisionRequestEmail 
} from "../lib/emailService";
import { Breadcrumbs } from "../components/Breadcrumbs";

export function PropostaLandingView({
  propostaId,
  onBack,
}: {
  propostaId: string;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleAction = async (action: 'aceitar' | 'revisar') => {
    try {
      setIsSubmitting(true);
      const newStatus = action === 'aceitar' ? 'Proposta aceita pelo paciente' : 'Paciente solicita revisão da proposta';
      
      const updateData: any = {
        propostaStatus: newStatus,
      };

      if (action === 'revisar') {
        // Quando o paciente solicita revisão da proposta, reinicia o fluxo para Etapa 1 (Questionário/Triagem)
        updateData.status = "Aguardando Avaliação";
        updateData.propostaEnviada = false;
        updateData.atribuicaoStatus = null;
      }

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
      if (action === 'aceitar') {
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
      } else if (action === 'revisar') {
        // Email to Patient
        try {
          await sendProposalRevisionRequestEmail(data.nome, data.email);
        } catch (emailErr) {
          console.error("Error sending proposal revision confirmation email:", emailErr);
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
        </div>
      </div>
    );
  }

  if (status === 'Paciente solicita revisão da proposta') {
    return (
      <div className="min-h-screen bg-warm flex flex-col items-center py-20 px-6">
        <div className="bg-white rounded-[2.5rem] shadow-xl p-12 max-w-lg w-full flex flex-col items-center text-center border border-soft slide-up">
          <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10 text-orange-500" />
          </div>
          <h2 className="font-serif text-3xl text-forest mb-4">Revisão Solicitada</h2>
          <p className="text-forest/70 mb-8 leading-relaxed">
            Recebemos a sua solicitação. Nossa equipe de triagem analisará o caso e entraremos em contato em breve.
          </p>
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

          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <button
              disabled={isSubmitting}
              onClick={() => handleAction('aceitar')}
              className="flex-1 bg-forest text-white hover:bg-forest/90 py-4 rounded-full font-semibold text-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              Aceitar Proposta
            </button>
            <button
              disabled={isSubmitting}
              onClick={() => handleAction('revisar')}
              className="flex-1 bg-transparent text-forest border border-forest/30 hover:bg-warm py-4 rounded-full font-semibold text-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              Revisar valores ou frequência
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

      <footer className="w-full max-w-7xl mx-auto p-6 md:p-12 text-center text-xs text-forest/50 mt-auto">
        <p>Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).</p>
      </footer>
    </div>
  );
}
