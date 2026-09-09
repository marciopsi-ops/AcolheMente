import { ArrowLeft, CheckCircle2, Leaf, Laptop, ShieldCheck, DollarSign, Building2, User } from "lucide-react";
import { Footer } from "../components/Footer";
import { FormEvent, useState, useEffect } from "react";
import { collection, addDoc, serverTimestamp, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { sendPatientRegistrationEmail } from "../lib/emailService";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { AcolhimentoCorporativoView } from "../components/AcolhimentoCorporativoView";
import { ProcessoExistenteModal } from "../components/ProcessoExistenteModal";

import pacienteHero from '../assets/images/paciente_hero_laptop_therapist_1782433549769.jpg';
import logoImage from '../assets/images/logo_acolhe.jpeg';

type AccessType = "Particular" | "Corporativo";

export function AcolhimentoView({ onNavigate }: { onNavigate: (view: 'landing' | 'acolhimento' | 'dashboard' | 'profile') => void }) {
  const [accessType, setAccessType] = useState<AccessType>(() => {
    const params = new URLSearchParams(window.location.search);
    const via = params.get("via")?.toLowerCase();
    if (via === "corporativo") return "Corporativo";
    return "Particular";
  });
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para Detecção e Tratamento de Processo Existente
  const [existingProcess, setExistingProcess] = useState<{ id: string; data: any } | null>(null);
  const [showExistingModal, setShowExistingModal] = useState(false);
  const [submissionType, setSubmissionType] = useState<"novo" | "atualizado" | "reiniciado">("novo");
  const [isProcessingRestart, setIsProcessingRestart] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  // Form Data
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");

  const [tratamentoPara, setTratamentoPara] = useState("");
  const [idadeTratamento, setIdadeTratamento] = useState(""); 
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [responsavelNome, setResponsavelNome] = useState("");
  const [responsavelCpf, setResponsavelCpf] = useState("");
  const [comoConheceu, setComoConheceu] = useState("");
  const [genero, setGenero] = useState("");
  const [deficiencia, setDeficiencia] = useState("");
  const [estadoCivil, setEstadoCivil] = useState("");
  const [temFilhos, setTemFilhos] = useState("");
  const [faixaEtariaFilhos, setFaixaEtariaFilhos] = useState("");
  const [filhosMoramJunto, setFilhosMoramJunto] = useState("");

  // Step 2: Finanças (Particular)
  const [fonteRenda, setFonteRenda] = useState("");
  const [faixaSalarial, setFaixaSalarial] = useState("");
  const [dependentes, setDependentes] = useState("");
  const [planoSaude, setPlanoSaude] = useState("");

  // Step 3: Demografia e Tecnologia (Particular)
  const [escolaridade, setEscolaridade] = useState("");
  const [moradia, setMoradia] = useState("");
  const [comodos, setComodos] = useState("");
  const [internet, setInternet] = useState("");
  const [dispositivo, setDispositivo] = useState("");

  // Step 4: Saúde Mental (Todos)
  const [terapiaAnterior, setTerapiaAnterior] = useState("");
  const [motivo, setMotivo] = useState("");
  const [complaint, setComplaint] = useState("");
  const [melhoresPeriodos, setMelhoresPeriodos] = useState<string[]>([]);
  const [lgpdAceite, setLgpdAceite] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const totalSteps = 4;
  const currentVisualStep = step;

  const scrollToForm = () => {
    const elem = document.getElementById("acolhimento-form-card");
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 350, behavior: "smooth" });
    }
  };

  const handleRestartProcess = async () => {
    if (!existingProcess) return;
    setIsProcessingRestart(true);
    setErrorMsg("");
    try {
      const cleanEmail = (email.trim().toLowerCase() || existingProcess.data.email || "").trim().toLowerCase();
      const patientName = name.trim() || existingProcess.data.nome || "Paciente";

      await updateDoc(doc(db, "acolhimentos", existingProcess.id), {
        status: "Aguardando Avaliação",
        ativo: true,
        statusInativacao: null,
        desligado: false,
        desligamentoMotivo: null,
        desligadoEm: null,
        propostaStatus: null,
        propostaEnviada: false,
        motivoPausaCancelamento: null,
        motivoRevisao: null,
        dataPausaCancelamento: null,
        dataSolicitacaoRevisao: null,
        reiniciadoEm: new Date().toISOString(),
        notificacao: `Processo reiniciado pelo paciente em ${new Date().toLocaleDateString('pt-BR')}. Encaminhado para a fila de Novos Acolhimentos.`,
        updatedAt: serverTimestamp(),
        ...(name.trim() ? { nome: name.trim() } : {}),
        ...(telefone.trim() ? { telefone: telefone.trim() } : {}),
        ...(cpf.trim() ? { cpf: cpf.trim() } : {}),
      });

      if (cleanEmail) {
        try {
          await sendPatientRegistrationEmail(patientName, cleanEmail);
        } catch (emailErr) {
          console.error("Erro ao enviar email de reinício de acolhimento:", emailErr);
        }
      }

      setSubmissionType("reiniciado");
      setShowExistingModal(false);
      setStep(5);
      scrollToForm();
    } catch (err) {
      console.error("Erro ao reiniciar processo:", err);
      setErrorMsg("Ocorreu um erro ao reiniciar o processo. Por favor, tente novamente.");
    } finally {
      setIsProcessingRestart(false);
    }
  };

  const handleOptionUpdateQuestionnaire = async () => {
    setShowExistingModal(false);
    setSubmissionType("atualizado");
    if (step === 1) {
      setStep(2);
      scrollToForm();
    } else if (step === 4) {
      if (existingProcess) {
        await executeSubmit(existingProcess.id);
      }
    }
  };

  const executeSubmit = async (existingId?: string) => {
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      const cleanEmail = email.trim().toLowerCase();
      const payload: Record<string, any> = {
        nome: name.trim(),
        email: cleanEmail,
        telefone: telefone.trim(),
        cpf: cpf.trim(),
        dataNascimento,
        genero,
        deficiencia,
        estadoCivil,
        temFilhos,
        faixaEtariaFilhos: temFilhos === "Não possui filhos" ? "Não se aplica (sem filhos)" : faixaEtariaFilhos,
        filhosMoramJunto: temFilhos === "Não possui filhos" ? "Não se aplica (sem filhos)" : filhosMoramJunto,
        tratamentoPara,
        idadeTratamento,
        responsavelNome: responsavelNome.trim(),
        responsavelCpf: responsavelCpf.trim(),
        comoConheceu,
        viaAcesso: "Particular",
        empresa: "",
        fonteRenda,
        faixaSalarial,
        dependentes,
        planoSaude,
        escolaridade,
        moradia,
        comodos,
        internet,
        dispositivo,
        terapiaAnterior,
        melhoresPeriodos,
        motivo: `${motivo} - Detalhes: ${complaint.trim()}`,
        status: "Aguardando Avaliação",
        ativo: true,
        statusInativacao: null,
        desligado: false,
        desligamentoMotivo: null,
        desligadoEm: null,
        propostaStatus: null,
        propostaEnviada: false,
        motivoPausaCancelamento: null,
        motivoRevisao: null,
        dataPausaCancelamento: null,
        dataSolicitacaoRevisao: null,
      };

      if (existingId) {
        payload.atualizadoEm = new Date().toISOString();
        payload.notificacao = `Questionário atualizado pelo paciente em ${new Date().toLocaleDateString('pt-BR')}. Encaminhado para a fila de Novos Acolhimentos.`;
        payload.updatedAt = serverTimestamp();
        await updateDoc(doc(db, "acolhimentos", existingId), payload);
        setSubmissionType("atualizado");
      } else {
        payload.notificacao = "Novo cadastro de paciente recebido no sistema. Por favor, analise a ficha.";
        payload.createdAt = serverTimestamp();
        await addDoc(collection(db, "acolhimentos"), payload);
        setSubmissionType("novo");
      }

      try {
        await sendPatientRegistrationEmail(name.trim(), cleanEmail);
      } catch (emailErr) {
        console.error("Erro ao enviar email de acolhimento:", emailErr);
      }

      setStep(5);
      scrollToForm();
    } catch (err: any) {
      console.error("Erro ao registrar acolhimento:", err);
      setErrorMsg("Ocorreu um erro ao salvar o acolhimento. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (step === 1) {
      if (!tratamentoPara) {
        setErrorMsg("Por favor, informe para quem é o tratamento (Para mim ou Para outra pessoa).");
        scrollToForm();
        return;
      }
      if (tratamentoPara === "Outra pessoa" && !idadeTratamento) {
        setErrorMsg("Por favor, informe se o paciente é menor de idade ou adulto.");
        scrollToForm();
        return;
      }
      if (!name.trim()) {
        setErrorMsg("Por favor, preencha o nome completo.");
        scrollToForm();
        return;
      }
      if (!dataNascimento) {
        setErrorMsg("Por favor, informe a data de nascimento.");
        scrollToForm();
        return;
      }
      if (idadeTratamento !== "Menor" && !cpf.trim()) {
        setErrorMsg("Por favor, informe o CPF.");
        scrollToForm();
        return;
      }
      if (tratamentoPara === "Outra pessoa" && (!responsavelNome.trim() || !responsavelCpf.trim())) {
        setErrorMsg("Por favor, preencha o nome e CPF do responsável legal.");
        scrollToForm();
        return;
      }
      if (!email.trim() || !email.includes("@")) {
        setErrorMsg("Por favor, informe um e-mail válido para contato.");
        scrollToForm();
        return;
      }
      if (!telefone.trim()) {
        setErrorMsg("Por favor, informe um telefone de contato / WhatsApp.");
        scrollToForm();
        return;
      }
      if (!genero) {
        setErrorMsg("Por favor, selecione o gênero.");
        scrollToForm();
        return;
      }
      if (!deficiencia) {
        setErrorMsg("Por favor, selecione uma opção no campo 'Deficiência ou Necessidade Especial'.");
        scrollToForm();
        return;
      }
      if (!estadoCivil) {
        setErrorMsg("Por favor, selecione seu Estado Civil.");
        scrollToForm();
        return;
      }
      if (!temFilhos) {
        setErrorMsg("Por favor, informe se possui filhos.");
        scrollToForm();
        return;
      }
      if (temFilhos !== "Não possui filhos") {
        if (!faixaEtariaFilhos) {
          setErrorMsg("Por favor, selecione a faixa etária dos filhos.");
          scrollToForm();
          return;
        }
        if (!filhosMoramJunto) {
          setErrorMsg("Por favor, informe se os filhos moram com você.");
          scrollToForm();
          return;
        }
      }
      if (!comoConheceu) {
        setErrorMsg("Por favor, informe como nos conheceu.");
        scrollToForm();
        return;
      }

      // Verificar se já existe acolhimento cadastrado com este e-mail
      const cleanEmail = email.trim().toLowerCase();
      try {
        setIsSubmitting(true);
        const q = query(collection(db, "acolhimentos"), where("email", "==", cleanEmail));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0];
          setExistingProcess({
            id: docData.id,
            data: docData.data(),
          });
          setShowExistingModal(true);
          setIsSubmitting(false);
          return;
        }
      } catch (err) {
        console.error("Erro ao verificar duplicidade:", err);
      } finally {
        setIsSubmitting(false);
      }

      setErrorMsg("");
      setStep(2);
      scrollToForm();
    } else if (step === 2) {
      if (!fonteRenda) {
        setErrorMsg("Por favor, selecione a Fonte de Renda Principal.");
        scrollToForm();
        return;
      }
      if (!faixaSalarial) {
        setErrorMsg("Por favor, selecione a Renda Familiar Mensal.");
        scrollToForm();
        return;
      }
      if (!dependentes) {
        setErrorMsg("Por favor, selecione a quantidade de dependentes.");
        scrollToForm();
        return;
      }
      if (!planoSaude) {
        setErrorMsg("Por favor, selecione a situação do Plano de Saúde.");
        scrollToForm();
        return;
      }

      setErrorMsg("");
      setStep(3);
      scrollToForm();
    } else if (step === 3) {
      if (!escolaridade) {
        setErrorMsg("Por favor, selecione o nível de escolaridade.");
        scrollToForm();
        return;
      }
      if (!moradia) {
        setErrorMsg("Por favor, selecione a situação da moradia.");
        scrollToForm();
        return;
      }
      if (!comodos) {
        setErrorMsg("Por favor, selecione o número de cômodos do imóvel.");
        scrollToForm();
        return;
      }
      if (!internet) {
        setErrorMsg("Por favor, selecione o tipo de acesso à internet.");
        scrollToForm();
        return;
      }
      if (!dispositivo) {
        setErrorMsg("Por favor, informe o aparelho utilizado para as sessões.");
        scrollToForm();
        return;
      }

      setErrorMsg("");
      setStep(4);
      scrollToForm();
    } else if (step === 4) {
      if (!terapiaAnterior) {
        setErrorMsg("Por favor, selecione o histórico de psicoterapia.");
        scrollToForm();
        return;
      }
      if (!motivo) {
        setErrorMsg("Por favor, selecione o motivo principal do atendimento.");
        scrollToForm();
        return;
      }
      if (!complaint.trim()) {
        setErrorMsg("Por favor, descreva brevemente o motivo do atendimento.");
        scrollToForm();
        return;
      }
      if (melhoresPeriodos.length === 0) {
        setErrorMsg("Por favor, selecione pelo menos um período de disponibilidade para as sessões.");
        scrollToForm();
        return;
      }
      if (!lgpdAceite) {
        setErrorMsg("Por favor, aceite a declaração de Privacidade e LGPD para finalizar.");
        scrollToForm();
        return;
      }

      const cleanEmail = email.trim().toLowerCase();

      // Se já foi identificado processo existente anteriormente, atualiza diretamente
      if (existingProcess) {
        await executeSubmit(existingProcess.id);
        return;
      }

      // Verificação de duplicidade de segurança no envio final
      try {
        setIsSubmitting(true);
        const q = query(collection(db, "acolhimentos"), where("email", "==", cleanEmail));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docData = querySnapshot.docs[0];
          setExistingProcess({
            id: docData.id,
            data: docData.data(),
          });
          setShowExistingModal(true);
          setIsSubmitting(false);
          return;
        }
      } catch (err) {
        console.error("Erro ao verificar duplicidade no envio final:", err);
      } finally {
        setIsSubmitting(false);
      }

      await executeSubmit();
    }
  };

  const handleBack = () => {
    setErrorMsg("");
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
    if (step === 4) setStep(3);
    scrollToForm();
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-warm">
      <nav className="w-full py-6 px-6 md:px-12 flex items-center border-b border-soft">
        <button 
          onClick={() => {
            window.scrollTo({ top: 0, left: 0, behavior: "instant" });
            onNavigate('landing');
          }}
          className="flex items-center gap-2 text-forest/70 hover:text-forest transition-colors mr-auto cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-semibold uppercase tracking-wider">Voltar ao Início</span>
        </button>
        <div className="flex items-center gap-3 absolute left-1/2 -translate-x-1/2">
          <div className="w-12 h-12 bg-sun rounded-full flex items-center justify-center text-forest overflow-hidden shadow-sm">
            <img src={logoImage} alt="AcolheMente Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-serif text-xl font-semibold tracking-tight text-forest hidden sm:block">
            AcolheMente
          </span>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center pb-16 w-full">
        <Breadcrumbs items={[{ label: "Início", onClick: () => onNavigate("landing") }, { label: "Iniciar Acolhimento", active: true }]} />
        
        {/* SELETOR DE VIA DE ACESSO (APENAS NA VIA PARTICULAR) */}
        {accessType === "Particular" && (
          <div className="w-full max-w-[1440px] px-6 md:px-12 pt-6 pb-2 animate-in fade-in duration-300">
            <div className="bg-white/95 backdrop-blur-sm p-5 md:p-6 rounded-3xl border border-soft shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex flex-col text-center md:text-left">
                <span className="text-[11px] font-bold uppercase tracking-widest text-forest/60 mb-1">
                  Via de Acesso ao Atendimento
                </span>
                <h3 className="font-serif text-lg md:text-2xl font-semibold text-forest">
                  Como você deseja iniciar seu acolhimento?
                </h3>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setAccessType("Particular");
                    setStep(1);
                    setErrorMsg("");
                  }}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl border transition-all flex items-center gap-3.5 cursor-pointer bg-forest text-white border-forest shadow-md text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <User className="w-4.5 h-4.5 text-white" />
                  </div>
                  <div className="flex flex-col pr-2">
                    <span className="text-xs font-bold uppercase tracking-wider leading-snug">
                      Particular
                    </span>
                    <span className="text-[11px] text-white/80 font-medium whitespace-nowrap leading-snug">
                      Valor Acessível
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAccessType("Corporativo");
                    setErrorMsg("");
                  }}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl border transition-all flex items-center gap-3.5 cursor-pointer bg-warm hover:bg-white text-forest border-soft hover:border-sun-dark shadow-2xs hover:shadow-xs group text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-sun-light group-hover:bg-sun flex items-center justify-center shrink-0 transition-colors text-forest">
                    <Building2 className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex flex-col pr-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-forest leading-snug">
                      Corporativo
                    </span>
                    <span className="text-[11px] text-forest/70 font-medium whitespace-nowrap leading-snug">
                      Empresa Parceira
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FLUXO CORPORATIVO DEDICADO */}
        {accessType === "Corporativo" ? (
          <AcolhimentoCorporativoView 
            onBackToSelection={() => setAccessType("Particular")}
            onNavigate={onNavigate}
          />
        ) : (
          /* FLUXO PARTICULAR CLÁSSICO */
          <>
            {/* Presentation Section */}
            <section className="w-full px-6 md:px-12 py-12 md:py-16 flex justify-center bg-white border-b border-soft">
              <div className="max-w-[1440px] w-full flex flex-col items-center justify-between gap-8">
                <div className="w-full flex flex-col lg:flex-row gap-8 items-center justify-between">
                  <div className="w-full lg:w-1/2 flex flex-col gap-6 animate-in fade-in slide-in-from-left-4 duration-500">
                    <div className="mb-2 px-3 py-1 bg-sun-light text-forest text-[10px] font-bold uppercase tracking-[0.2em] w-fit rounded">
                      Acolhimento Acessível
                    </div>
                    <h1 className="font-serif text-5xl md:text-6xl leading-[1.1] font-medium text-forest">
                      Profissionais experientes, vagas que acolhem!
                    </h1>
                    <p className="text-lg text-forest/80 leading-relaxed max-w-lg mt-4">
                      Nossa rede é composta por psicólogos e terapeutas com carreiras consolidadas e consultórios ativos. Em um gesto de compromisso social, esses profissionais dedicam parte de suas agendas para disponibilizar horários com valores acessíveis para quem não consegue arcar com o custo médio de uma consulta particular tradicional (geralmente acima de R$ 150).
                    </p>
                    <p className="text-lg text-forest/80 leading-relaxed max-w-lg">
                      Essas horas reservadas transformam-se em verdadeiras vagas de acolhimento, garantindo que você receba um atendimento ético, experiente e de altíssima qualidade, mas com um investimento coerente com sua realidade.
                    </p>
                  </div>
                  <div className="w-full lg:w-1/2 flex flex-col gap-6 items-center lg:items-end animate-in fade-in slide-in-from-right-4 duration-500">
                    <img src={pacienteHero} alt="Ilustração de acolhimento" className="w-full max-w-lg object-contain rounded-3xl mix-blend-multiply" referrerPolicy="no-referrer" />
                    
                    {/* Benefit Cards */}
                    <div className="w-full max-w-lg grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                      <div className="p-4 bg-warm border border-soft rounded-2xl flex items-start gap-3">
                        <Laptop className="w-5 h-5 text-forest shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-serif font-bold text-sm text-forest">Atendimento 100% Online</h4>
                          <p className="text-[11px] text-forest/70 mt-1 leading-relaxed">
                            Sessões por videochamada no conforto e privacidade do seu lar, sem deslocamentos.
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-warm border border-soft rounded-2xl flex items-start gap-3">
                        <ShieldCheck className="w-5 h-5 text-forest shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-serif font-bold text-sm text-forest">Profissionais Experientes</h4>
                          <p className="text-[11px] text-forest/70 mt-1 leading-relaxed">
                            Rede qualificada de psicólogos e terapeutas com carreiras consolidadas e registro ativo.
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-warm border border-soft rounded-2xl flex items-start gap-3">
                        <DollarSign className="w-5 h-5 text-forest shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-serif font-bold text-sm text-forest">Investimento Coerente</h4>
                          <p className="text-[11px] text-forest/70 mt-1 leading-relaxed">
                            Valores entre R$ 30 e R$ 110 por sessão. O valor combinado com o profissional é mantido fixo, com reajuste anual pelo INPC.
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-warm border border-soft rounded-2xl flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-forest shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-serif font-bold text-sm text-forest">Acolhimento de Qualidade</h4>
                          <p className="text-[11px] text-forest/70 mt-1 leading-relaxed">
                            Suas respostas nos ajudam a preparar e encaminhar o melhor direcionamento clínico.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Form Section */}
            <section className="w-full px-6 md:px-12 py-16 flex justify-center relative -mt-10">
              <div id="acolhimento-form-card" className="max-w-2xl w-full bg-white rounded-3xl shadow-xl shadow-forest/5 p-8 md:p-12 border border-soft relative z-10">
                
                {step === 5 ? (
                  <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="w-20 h-20 bg-sun-light rounded-full flex items-center justify-center text-forest mb-6">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h2 className="font-serif text-3xl md:text-4xl font-medium text-forest mb-4">
                      {submissionType === "reiniciado"
                        ? "Processo Reiniciado!"
                        : submissionType === "atualizado"
                        ? "Questionário Atualizado!"
                        : "Acolhimento Recebido!"}
                    </h2>
                    <p className="text-forest/70 max-w-md mb-8 leading-relaxed">
                      {submissionType === "reiniciado"
                        ? `Agradecemos a confiança, ${name.split(' ')[0]}. Seu processo foi reiniciado com sucesso e encaminhado diretamente para a fila de Novos Acolhimentos da equipe de triagem.`
                        : submissionType === "atualizado"
                        ? `Agradecemos a confiança, ${name.split(' ')[0]}. Suas respostas foram atualizadas com sucesso e seu acolhimento foi direcionado para a fila de Novos Acolhimentos da equipe de triagem.`
                        : `Agradecemos a confiança, ${name.split(' ')[0]}. Nossa equipe de triagem já recebeu suas informações e está preparando o encaminhamento ideal em até 24h.`}
                    </p>
                    <div className="p-6 bg-warm rounded-2xl border border-soft text-sm text-forest/80 mb-8 max-w-sm">
                      Acompanhe o e-mail <strong>{email}</strong> para conferir os próximos passos. Verifique também a sua caixa de spam.
                    </div>
                    <button 
                      onClick={() => onNavigate('landing')}
                      className="px-8 py-3 bg-sun text-forest rounded-full font-semibold shadow-lg shadow-sun/20 transition-all hover:bg-sun-dark cursor-pointer"
                    >
                      Retornar
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mb-8">
                      <h2 className="font-serif text-3xl font-medium text-forest mb-2">
                        {step === 1 && "Inicie seu Acolhimento"}
                        {step === 2 && "Situação Financeira"}
                        {step === 3 && "Habitação e Tecnologia"}
                        {step === 4 && "Motivação Clínica"}
                      </h2>
                      <p className="text-forest/80 text-sm md:text-base">
                        {step === 1 && "Preencha seus dados iniciais para que possamos te direcionar ao fluxo correto."}
                        {step === 2 && "Os dados nos ajudam a enquadrar o atendimento na faixa mais justa possível."}
                        {step === 3 && "Conhecer sua realidade nos apoia no formato das sessões (online ou não)."}
                        {step === 4 && "Essas informações nos ajudam a preparar o melhor encaminhamento."}
                      </p>
                      
                      <div className="flex gap-2 mt-6">
                        {Array.from({ length: totalSteps }).map((_, idx) => (
                          <div key={idx} className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${idx < currentVisualStep ? 'bg-sun-dark' : 'bg-soft'}`} />
                        ))}
                      </div>
                    </div>

                    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">

                    {errorMsg && (
                      <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-2xl font-medium flex items-center gap-3 animate-in fade-in">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                        <span className="flex-1">{errorMsg}</span>
                      </div>
                    )}
                    
                    {step === 1 && (
                      <div className="flex flex-col gap-5 animate-in fade-in duration-500">
                        <div>
                          <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">O tratamento é para você ou para outra pessoa?</label>
                          <select 
                            required
                            value={tratamentoPara}
                            onChange={(e) => {
                               setTratamentoPara(e.target.value);
                               if (e.target.value === 'Mim') setIdadeTratamento("");
                            }}
                            className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest"
                          >
                            <option value="">Selecione...</option>
                            <option value="Mim">Para mim</option>
                            <option value="Outra pessoa">Para outra pessoa</option>
                          </select>
                        </div>

                        {tratamentoPara === "Outra pessoa" && (
                          <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">O paciente é menor de idade ou adulto?</label>
                            <select 
                              required
                              value={idadeTratamento}
                              onChange={(e) => setIdadeTratamento(e.target.value)}
                              className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest"
                            >
                              <option value="">Selecione...</option>
                              <option value="Menor">Menor de idade (criança ou adolescente)</option>
                              <option value="Adulto">Adulto</option>
                            </select>
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">
                            {tratamentoPara === "Outra pessoa" ? "Nome Completo do Paciente" : "Nome Completo"}
                          </label>
                          <input 
                            required
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Seu nome..."
                            className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">Data de Nascimento</label>
                            <input 
                              required
                              type="date" 
                              value={dataNascimento}
                              onChange={(e) => setDataNascimento(e.target.value)}
                              className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">
                              {idadeTratamento === "Menor" ? "CPF do Paciente (Opcional)" : "CPF"}
                            </label>
                            <input 
                              type="text" 
                              value={cpf}
                              onChange={(e) => setCpf(e.target.value)}
                              placeholder="000.000.000-00"
                              className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest"
                            />
                          </div>
                        </div>

                        {tratamentoPara === "Outra pessoa" && (
                          <div className="p-4 bg-warm/50 border border-soft rounded-2xl flex flex-col gap-4 animate-in fade-in">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-forest/70">Dados do Responsável Legal</h4>
                            <div>
                              <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">Nome do Responsável</label>
                              <input 
                                required
                                type="text" 
                                value={responsavelNome}
                                onChange={(e) => setResponsavelNome(e.target.value)}
                                placeholder="Nome completo do responsável"
                                className="w-full px-4 py-3 bg-white border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">CPF do Responsável</label>
                              <input 
                                required
                                type="text" 
                                value={responsavelCpf}
                                onChange={(e) => setResponsavelCpf(e.target.value)}
                                placeholder="000.000.000-00"
                                className="w-full px-4 py-3 bg-white border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest"
                              />
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">E-mail</label>
                            <input 
                              required
                              type="email" 
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="seu.email@exemplo.com"
                              className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">Telefone (WhatsApp)</label>
                            <input 
                              required
                              type="tel" 
                              value={telefone}
                              onChange={(e) => setTelefone(e.target.value)}
                              placeholder="(00) 00000-0000"
                              className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">Gênero</label>
                            <select required value={genero} onChange={(e) => setGenero(e.target.value)} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest appearance-none">
                              <option value="" disabled>Selecione...</option>
                              <option value="Feminino">Feminino</option>
                              <option value="Masculino">Masculino</option>
                              <option value="Não-binário">Não-binário</option>
                              <option value="Prefiro não informar">Prefiro não informar</option>
                              <option value="Outro">Outro</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">Deficiência ou Necessidade Especial?</label>
                            <select required value={deficiencia} onChange={(e) => setDeficiencia(e.target.value)} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest appearance-none">
                              <option value="" disabled>Selecione...</option>
                              <option value="Não possuo">Não possuo</option>
                              <option value="Deficiência física">Deficiência física (motora)</option>
                              <option value="Deficiência visual">Deficiência visual (cegueira ou baixa visão)</option>
                              <option value="Deficiência auditiva">Deficiência auditiva (surdez ou perda auditiva)</option>
                              <option value="Deficiência intelectual/cognitiva">Deficiência intelectual/cognitiva</option>
                              <option value="Transtorno do Espectro Autista (TEA)">Transtorno do Espectro Autista (TEA)</option>
                              <option value="Múltiplas deficiências">Múltiplas deficiências</option>
                              <option value="Outra necessidade especial">Outra necessidade especial</option>
                              <option value="Prefiro não responder">Prefiro não responder</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">Estado Civil</label>
                            <select required value={estadoCivil} onChange={(e) => setEstadoCivil(e.target.value)} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest appearance-none">
                              <option value="" disabled>Selecione...</option>
                              <option value="Solteiro(a)">Solteiro(a)</option>
                              <option value="Casado(a) / União Estável">Casado(a) / União Estável</option>
                              <option value="Divorciado(a) / Separado(a)">Divorciado(a) / Separado(a)</option>
                              <option value="Viúvo(a)">Viúvo(a)</option>
                              <option value="Outro">Outro</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">Possui Filhos?</label>
                            <select 
                              required 
                              value={temFilhos} 
                              onChange={(e) => {
                                const val = e.target.value;
                                setTemFilhos(val);
                                if (val === "Não possui filhos") {
                                  setFaixaEtariaFilhos("Não se aplica (sem filhos)");
                                  setFilhosMoramJunto("Não se aplica (sem filhos)");
                                } else if (faixaEtariaFilhos === "Não se aplica (sem filhos)") {
                                  setFaixaEtariaFilhos("");
                                  setFilhosMoramJunto("");
                                }
                              }} 
                              className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest appearance-none"
                            >
                              <option value="" disabled>Selecione...</option>
                              <option value="Não possui filhos">Não possui filhos</option>
                              <option value="Sim (1 filho)">Sim (1 filho)</option>
                              <option value="Sim (2 filhos)">Sim (2 filhos)</option>
                              <option value="Sim (3 ou mais filhos)">Sim (3 ou mais filhos)</option>
                            </select>
                          </div>
                        </div>

                        {temFilhos !== "" && temFilhos !== "Não possui filhos" && (
                          <div className="p-4 bg-warm/50 border border-soft rounded-2xl flex flex-col gap-4 animate-in fade-in">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-forest/70">Sobre os Filhos</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">Faixa Etária dos Filhos</label>
                                <select 
                                  required 
                                  value={faixaEtariaFilhos} 
                                  onChange={(e) => setFaixaEtariaFilhos(e.target.value)} 
                                  className="w-full px-4 py-3 bg-white border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest appearance-none"
                                >
                                  <option value="" disabled>Selecione a faixa etária...</option>
                                  <option value="Bebê / Primeira Infância (0 a 5 anos)">Bebê / Primeira Infância (0 a 5 anos)</option>
                                  <option value="Crianças (6 a 11 anos)">Crianças (6 a 11 anos)</option>
                                  <option value="Adolescentes (12 a 17 anos)">Adolescentes (12 a 17 anos)</option>
                                  <option value="Adultos (18+ anos)">Adultos (18+ anos)</option>
                                  <option value="Crianças e Adolescentes (faixas variadas)">Crianças e Adolescentes (faixas variadas)</option>
                                  <option value="Outra / Diversas idades">Outra / Diversas idades</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">Os filhos moram com você?</label>
                                <select 
                                  required 
                                  value={filhosMoramJunto} 
                                  onChange={(e) => setFilhosMoramJunto(e.target.value)} 
                                  className="w-full px-4 py-3 bg-white border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest appearance-none"
                                >
                                  <option value="" disabled>Selecione...</option>
                                  <option value="Sim, moram na mesma residência">Sim, moram na mesma residência</option>
                                  <option value="Não, moram em outra residência">Não, moram em outra residência</option>
                                  <option value="Alguns moram na mesma residência">Alguns moram na mesma residência</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">Como nos conheceu?</label>
                          <select required value={comoConheceu} onChange={(e) => setComoConheceu(e.target.value)} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest appearance-none">
                            <option value="" disabled>Selecione...</option>
                            <option value="Instagram">Instagram</option>
                            <option value="Facebook">Facebook</option>
                            <option value="Google / Busca Online">Google / Busca Online</option>
                            <option value="Indicação de amigo/familiar">Indicação de amigo/familiar</option>
                            <option value="Indicação de profissional de saúde">Indicação de profissional de saúde</option>
                            <option value="Outro">Outro</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {step === 2 && (
                      <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div>
                          <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">Fonte de Renda Principal</label>
                          <select required value={fonteRenda} onChange={(e) => setFonteRenda(e.target.value)} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest appearance-none">
                            <option value="" disabled>Selecione...</option>
                            <option value="Emprego formal (CLT/servidor público)">Emprego formal (CLT/servidor público)</option>
                            <option value="Emprego informal ou autônomo">Emprego informal ou autônomo (sem CNPJ)</option>
                            <option value="MEI ou Empresário">Microempreendedor Individual (MEI) ou Empresário</option>
                            <option value="Aposentadoria, pensão ou benefício">Aposentadoria, pensão ou benefício governamental</option>
                            <option value="Bolsista/Estudante">Bolsista/Estudante (dependente financeiramente)</option>
                            <option value="Outra">Outra</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">Renda Familiar Mensal (Bruta)</label>
                          <select required value={faixaSalarial} onChange={(e) => setFaixaSalarial(e.target.value)} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest appearance-none">
                            <option value="" disabled>Selecione a faixa...</option>
                            <option value="Até 1 Salário Mínimo (até R$ 1.518,00)">Até 1 Salário Mínimo (até R$ 1.518,00)</option>
                            <option value="De 1 a 2 Salários Mínimos (R$ 1.518,01 a R$ 3.036,00)">De 1 a 2 Salários Mínimos (R$ 1.518,01 a R$ 3.036,00)</option>
                            <option value="De 2 a 3 Salários Mínimos (R$ 3.036,01 a R$ 4.554,00)">De 2 a 3 Salários Mínimos (R$ 3.036,01 a R$ 4.554,00)</option>
                            <option value="De 3 a 5 Salários Mínimos (R$ 4.554,01 a R$ 7.590,00)">De 3 a 5 Salários Mínimos (R$ 4.554,01 a R$ 7.590,00)</option>
                            <option value="Acima de 5 Salários Mínimos (acima de R$ 7.590,00)">Acima de 5 Salários Mínimos (acima de R$ 7.590,00)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">Dependentes da Renda Familiar</label>
                          <select required value={dependentes} onChange={(e) => setDependentes(e.target.value)} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest appearance-none">
                            <option value="" disabled>Quantos residem na casa?</option>
                            <option value="1 pessoa (mora sozinho)">1 pessoa (mora sozinho/a)</option>
                            <option value="2 a 3 pessoas">2 a 3 pessoas</option>
                            <option value="4 a 5 pessoas">4 a 5 pessoas</option>
                            <option value="Mais de 5 pessoas">Mais de 5 pessoas</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">Plano de Saúde</label>
                          <select required value={planoSaude} onChange={(e) => setPlanoSaude(e.target.value)} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest appearance-none">
                            <option value="" disabled>Selecione a situação...</option>
                            <option value="Sim, com cobertura para psicoterapia">Sim, com cobertura para psicoterapia</option>
                            <option value="Sim, mas NÃO cobre psicoterapia">Sim, mas NÃO cobre psicoterapia</option>
                            <option value="Não, utilizo apenas o SUS">Não, utilizo apenas o SUS (Sistema Único de Saúde)</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {step === 3 && (
                      <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div>
                          <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">Escolaridade Mais Elevada</label>
                          <select required value={escolaridade} onChange={(e) => setEscolaridade(e.target.value)} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest appearance-none">
                            <option value="" disabled>Selecione...</option>
                            <option value="Analfabeto/Fundamental Incompleto">Analfabeto / Ensino Fundamental Incompleto</option>
                            <option value="Fundamental Completo">Ensino Fundamental Completo</option>
                            <option value="Médio Incompleto">Ensino Médio Incompleto</option>
                            <option value="Médio Completo">Ensino Médio Completo</option>
                            <option value="Superior Incompleto">Ensino Superior Incompleto</option>
                            <option value="Superior Completo">Ensino Superior Completo</option>
                            <option value="Pós-Graduação">Pós-Graduação (Especialização, Mestrado ou Doutorado)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">Situação da Moradia</label>
                          <select required value={moradia} onChange={(e) => setMoradia(e.target.value)} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest appearance-none">
                            <option value="" disabled>Selecione...</option>
                            <option value="Próprio e quitado">Próprio e quitado</option>
                            <option value="Próprio, financiado">Próprio, mas ainda financiado (prestação ou aluguel)</option>
                            <option value="Alugado/arrendado">Alugado ou arrendado</option>
                            <option value="Cedido">Cedido (mora na casa de parentes/amigos sem custo)</option>
                            <option value="Ocupação irregular ou outra">Ocupação irregular ou outra situação</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">Tamanho do Imóvel (Cômodos excluindo banheiro)</label>
                          <select required value={comodos} onChange={(e) => setComodos(e.target.value)} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest appearance-none">
                            <option value="" disabled>Selecione...</option>
                            <option value="1 a 3 cômodos">1 a 3 cômodos</option>
                            <option value="4 a 5 cômodos">4 a 5 cômodos</option>
                            <option value="6 ou mais cômodos">6 ou mais cômodos</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">Acesso à Internet</label>
                          <select required value={internet} onChange={(e) => setInternet(e.target.value)} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest appearance-none">
                            <option value="" disabled>Selecione...</option>
                            <option value="Acesso fixo residencial">Acesso fixo residencial (banda larga)</option>
                            <option value="Apenas pelo celular (dados móveis)">Apenas pelo celular (dados móveis)</option>
                            <option value="Acesso em locais públicos">Acesso em locais públicos (escola, praças)</option>
                            <option value="Não tenho acesso à internet">Não tenho acesso à internet em casa ou celular</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">Aparelho p/ Psicoterapia Online</label>
                          <select required value={dispositivo} onChange={(e) => setDispositivo(e.target.value)} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest appearance-none">
                            <option value="" disabled>Você possui dispositivo?</option>
                            <option value="Sim (Celular/PC c/ câmera)">Sim (Celular/Smartphone, Tablet, Computador/Notebook com câmera e microfone)</option>
                            <option value="Apenas Celular s/ dados">Apenas Celular/Smartphone sem pacote de dados suficiente</option>
                            <option value="Não">Não</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {step === 4 && (
                      <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div>
                          <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">Histórico de Psicoterapia</label>
                          <select required value={terapiaAnterior} onChange={(e) => setTerapiaAnterior(e.target.value)} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest appearance-none">
                            <option value="" disabled>Selecione...</option>
                            <option value="Sim, em tratamento">Sim, e estou em tratamento atualmente.</option>
                            <option value="Sim, interrompi (+ 6 meses)">Sim, mas interrompi há mais de 6 meses.</option>
                            <option value="Não">Não.</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">Motivo Principal</label>
                          <select required value={motivo} onChange={(e) => setMotivo(e.target.value)} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest appearance-none">
                            <option value="" disabled>O que o traz aqui?</option>
                            <option value="Enfrentamento de luto ou trauma">Enfrentamento de luto ou trauma.</option>
                            <option value="Ansiedade ou estresse excessivo">Ansiedade ou estresse excessivo.</option>
                            <option value="Depressão ou tristeza profunda">Depressão ou tristeza profunda.</option>
                            <option value="Problemas de relacionamento">Problemas de relacionamento (familiar, interpessoal).</option>
                            <option value="Desenvolvimento pessoal">Desenvolvimento pessoal e autoconhecimento.</option>
                            <option value="Outro">Outro.</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">Conte-nos um pouco (breve)</label>
                          <textarea 
                            required
                            value={complaint}
                            onChange={(e) => setComplaint(e.target.value)}
                            placeholder="Quero focar na dificuldade em..."
                            rows={3}
                            className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest resize-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">Melhores períodos para sessões online</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {["Manhã", "Tarde", "Noite", "Aos sábados", "Total disponibilidade"].map(period => (
                              <label key={period} className="flex items-center gap-3 cursor-pointer p-3 bg-warm border border-soft rounded-xl hover:bg-warm/80 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={melhoresPeriodos.includes(period)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      if (period === "Total disponibilidade") {
                                        setMelhoresPeriodos(["Total disponibilidade"]);
                                      } else {
                                        setMelhoresPeriodos(prev => prev.filter(p => p !== "Total disponibilidade").concat(period));
                                      }
                                    } else {
                                      setMelhoresPeriodos(prev => prev.filter(p => p !== period));
                                    }
                                  }}
                                  className="w-5 h-5 text-sun-dark rounded border-soft focus:ring-sun-dark accent-sun-dark cursor-pointer"
                                />
                                <span className="text-sm font-medium text-forest">{period}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {step === 4 && (
                      <label className="flex items-start gap-3 mt-4 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={lgpdAceite}
                          onChange={(e) => setLgpdAceite(e.target.checked)}
                          className="mt-1 w-5 h-5 rounded border-soft text-sun-dark focus:ring-sun-dark/20 accent-sun-dark cursor-pointer"
                        />
                        <span className="text-xs text-forest/70 leading-relaxed">
                          <strong>Privacidade e LGPD:</strong> Estou ciente e concordo que os dados pessoais e dados de saúde fornecidos serão tratados de forma sigilosa e segura para fins terapêuticos e de triagem, conforme a Lei Geral de Proteção de Dados (LGPD).
                        </span>
                      </label>
                    )}

                    {errorMsg && (
                      <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-2xl font-medium flex items-center gap-3 animate-in fade-in">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                        <span className="flex-1">{errorMsg}</span>
                      </div>
                    )}

                    <div className="mt-4 flex gap-4">
                      {step > 1 && (
                        <button 
                          type="button"
                          onClick={handleBack}
                          disabled={isSubmitting}
                          className="px-6 py-3 border border-soft text-forest/70 rounded-full font-semibold hover:bg-warm transition-all disabled:opacity-50 cursor-pointer"
                        >
                          Voltar
                        </button>
                      )}
                      <button 
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 px-8 py-3 bg-sun text-forest rounded-full font-semibold shadow-lg shadow-sun/20 transition-all hover:bg-sun-dark flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isSubmitting ? (
                          <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Finalizando...
                          </span>
                        ) : step === 4 ? (
                          "Finalizar Acolhimento"
                        ) : (
                          "Avançar"
                        )}
                      </button>
                    </div>
                  </form>
                </>
              )}

            </div>
          </section>
        </>
        )}
      </main>

      <ProcessoExistenteModal
        isOpen={showExistingModal}
        onClose={() => setShowExistingModal(false)}
        email={email.trim().toLowerCase() || (existingProcess?.data?.email || "")}
        nome={name.trim() || (existingProcess?.data?.nome || "")}
        onUpdateQuestionnaire={handleOptionUpdateQuestionnaire}
        onRestartProcess={handleRestartProcess}
        isProcessing={isProcessingRestart}
      />

      <Footer onNavigate={onNavigate} />
    </div>
  );
}
