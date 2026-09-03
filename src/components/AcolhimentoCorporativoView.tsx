import { useState, useEffect } from "react";
import { 
  Building2, 
  CheckCircle2, 
  ShieldCheck, 
  Laptop, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Briefcase, 
  HeartHandshake, 
  KeyRound, 
  Loader2,
  AlertCircle
} from "lucide-react";
import { collection, addDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { sendPatientRegistrationEmail } from "../lib/emailService";
import empresaHeroPhoto from "../assets/images/empresa_hero_photo_1781024092529.png";
import logoImage from "../assets/images/logo_acolhe.jpeg";

interface EmpresaData {
  id: string;
  nomeEmpresa: string;
  cnpj?: string;
  codigoAcesso?: string;
  logoUrl?: string;
  slogan?: string;
  email?: string;
}

interface AcolhimentoCorporativoProps {
  onBackToSelection: () => void;
  onNavigate: (view: "landing" | "acolhimento" | "dashboard" | "profile") => void;
}

export function AcolhimentoCorporativoView({ onBackToSelection, onNavigate }: AcolhimentoCorporativoProps) {
  // Company Code Validation State
  const [inputCode, setInputCode] = useState("");
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [empresaValidated, setEmpresaValidated] = useState<EmpresaData | null>(null);
  const [codeError, setCodeError] = useState("");

  // Form Step State (Step 1: Dados do Colaborador; Step 2: Saúde Mental & Preferências; Step 3: Sucesso)
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  // Step 1: Dados do Colaborador
  const [tratamentoPara, setTratamentoPara] = useState("Mim");
  const [name, setName] = useState("");
  const [cargo, setCargo] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [genero, setGenero] = useState("");
  const [deficiencia, setDeficiencia] = useState("");
  const [estadoCivil, setEstadoCivil] = useState("");
  const [temFilhos, setTemFilhos] = useState("");
  const [faixaEtariaFilhos, setFaixaEtariaFilhos] = useState("");
  const [filhosMoramJunto, setFilhosMoramJunto] = useState("");
  const [comoConheceu, setComoConheceu] = useState("Benefício Corporativo / Empresa");

  // Step 2: Saúde Mental & Horários
  const [terapiaAnterior, setTerapiaAnterior] = useState("");
  const [motivo, setMotivo] = useState("");
  const [complaint, setComplaint] = useState("");
  const [melhoresPeriodos, setMelhoresPeriodos] = useState<string[]>([]);
  const [lgpdAceite, setLgpdAceite] = useState<boolean>(false);

  const scrollToForm = () => {
    const elem = document.getElementById("form-corporativo-container");
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleValidateCompanyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = inputCode.trim().toUpperCase();
    if (!cleanCode) {
      setCodeError("Por favor, digite o código fornecido pela sua empresa.");
      return;
    }

    setIsValidatingCode(true);
    setCodeError("");

    try {
      // Search in Firestore "empresa_leads" by codigoAcesso
      const q = query(
        collection(db, "empresa_leads"),
        where("codigoAcesso", "==", cleanCode)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        const data = docSnap.data() as any;
        setEmpresaValidated({
          id: docSnap.id,
          nomeEmpresa: data.nomeEmpresa || "Empresa Parceira",
          cnpj: data.cnpj,
          codigoAcesso: data.codigoAcesso || cleanCode,
          logoUrl: data.logoUrl || "",
          slogan: data.slogan || "Cuidando do bem-estar e da saúde mental do nosso time em parceria com a AcolheMente.",
          email: data.email
        });
        setStep(1);
        setTimeout(scrollToForm, 100);
      } else {
        // Also check if any company has this code in a case-insensitive check or fallback
        const allDocs = await getDocs(collection(db, "empresa_leads"));
        let matched: EmpresaData | null = null;

        allDocs.forEach((docSnap) => {
          const data = docSnap.data() as any;
          if (
            (data.codigoAcesso && data.codigoAcesso.trim().toUpperCase() === cleanCode) ||
            (data.nomeEmpresa && data.nomeEmpresa.trim().toUpperCase() === cleanCode)
          ) {
            matched = {
              id: docSnap.id,
              nomeEmpresa: data.nomeEmpresa,
              cnpj: data.cnpj,
              codigoAcesso: data.codigoAcesso || cleanCode,
              logoUrl: data.logoUrl || "",
              slogan: data.slogan || "Cuidando do bem-estar e da saúde mental do nosso time em parceria com a AcolheMente.",
              email: data.email
            };
          }
        });

        if (matched) {
          setEmpresaValidated(matched);
          setStep(1);
          setTimeout(scrollToForm, 100);
        } else {
          setCodeError(
            "Código de empresa não localizado. Verifique com o RH da sua empresa ou com o suporte do projeto."
          );
        }
      }
    } catch (err) {
      console.error("Erro ao validar código da empresa:", err);
      setCodeError("Erro temporário ao consultar código. Tente novamente.");
    } finally {
      setIsValidatingCode(false);
    }
  };

  const handleSubmitStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("Por favor, preencha o seu nome completo.");
      return;
    }
    if (!cargo.trim()) {
      setErrorMsg("Por favor, informe o seu Cargo / Função na empresa.");
      return;
    }
    if (!departamento.trim()) {
      setErrorMsg("Por favor, informe o seu Departamento ou Setor.");
      return;
    }
    if (!dataNascimento) {
      setErrorMsg("Por favor, informe sua Data de Nascimento.");
      return;
    }
    if (!cpf.trim()) {
      setErrorMsg("Por favor, informe o seu CPF.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Por favor, informe um e-mail válido para contato.");
      return;
    }
    if (!telefone.trim()) {
      setErrorMsg("Por favor, informe seu telefone / WhatsApp de contato.");
      return;
    }
    if (!genero) {
      setErrorMsg("Por favor, selecione seu Gênero.");
      return;
    }
    if (!deficiencia) {
      setErrorMsg("Por favor, informe sobre deficiência ou necessidade especial.");
      return;
    }
    if (!estadoCivil) {
      setErrorMsg("Por favor, selecione seu Estado Civil.");
      return;
    }
    if (!temFilhos) {
      setErrorMsg("Por favor, informe se possui filhos.");
      return;
    }
    if (temFilhos !== "Não possui filhos") {
      if (!faixaEtariaFilhos) {
        setErrorMsg("Por favor, selecione a faixa etária dos filhos.");
        return;
      }
      if (!filhosMoramJunto) {
        setErrorMsg("Por favor, informe se os filhos moram com você.");
        return;
      }
    }

    setStep(2);
    scrollToForm();
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!terapiaAnterior) {
      setErrorMsg("Por favor, selecione o seu histórico de psicoterapia.");
      return;
    }
    if (!motivo) {
      setErrorMsg("Por favor, selecione o motivo principal da busca por atendimento.");
      return;
    }
    if (!complaint.trim()) {
      setErrorMsg("Por favor, descreva brevemente a queixa ou expectativa do atendimento.");
      return;
    }
    if (melhoresPeriodos.length === 0) {
      setErrorMsg("Por favor, selecione pelo menos um período de preferência para as sessões online.");
      return;
    }
    if (!lgpdAceite) {
      setErrorMsg("Por favor, aceite a declaração de Privacidade e LGPD para prosseguir.");
      return;
    }

    setIsSubmitting(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const q = query(collection(db, "acolhimentos"), where("email", "==", cleanEmail));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setErrorMsg("Este e-mail já aparece cadastrado em nosso sistema de triagem.");
        setIsSubmitting(false);
        return;
      }

      await addDoc(collection(db, "acolhimentos"), {
        nome: name.trim(),
        email: cleanEmail,
        telefone: telefone.trim(),
        cpf: cpf.trim(),
        dataNascimento,
        cargo: cargo.trim(),
        departamento: departamento.trim(),
        genero,
        deficiencia,
        estadoCivil,
        temFilhos,
        faixaEtariaFilhos: temFilhos === "Não possui filhos" ? "Não se aplica (sem filhos)" : faixaEtariaFilhos,
        filhosMoramJunto: temFilhos === "Não possui filhos" ? "Não se aplica (sem filhos)" : filhosMoramJunto,
        tratamentoPara,
        comoConheceu,
        viaAcesso: "Corporativo",
        empresa: empresaValidated?.nomeEmpresa || inputCode.trim(),
        empresaCodigo: empresaValidated?.codigoAcesso || inputCode.trim().toUpperCase(),
        empresaNome: empresaValidated?.nomeEmpresa || "Empresa Parceira",
        empresaId: empresaValidated?.id || "",
        empresaLogoUrl: empresaValidated?.logoUrl || "",
        empresaSlogan: empresaValidated?.slogan || "",
        terapiaAnterior,
        melhoresPeriodos,
        motivo: `[CORPORATIVO - ${empresaValidated?.nomeEmpresa || "Empresa"}] ${motivo} - Detalhes: ${complaint.trim()}`,
        status: "Aguardando Avaliação",
        notificacao: `Novo acolhimento corporativo recebido: ${name.trim()} (${empresaValidated?.nomeEmpresa || "Empresa"}). Cargo: ${cargo.trim()} - Setor: ${departamento.trim()}.`,
        createdAt: serverTimestamp()
      });

      try {
        await sendPatientRegistrationEmail(name.trim(), cleanEmail);
      } catch (emailErr) {
        console.error("Erro ao disparar e-mail de acolhimento corporativo:", emailErr);
      }

      setStep(3); // Success step
      scrollToForm();
    } catch (err) {
      console.error("Erro ao cadastrar acolhimento corporativo:", err);
      setErrorMsg("Ocorreu um erro ao enviar seu cadastro. Por favor, tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Awareness & Corporate Benefit Presentation Header */}
      <section className="w-full px-6 md:px-12 py-12 md:py-16 flex justify-center bg-white border-b border-soft">
        <div className="max-w-[1440px] w-full flex flex-col items-center justify-between gap-8">
          <div className="w-full flex flex-col lg:flex-row gap-10 items-center justify-between">
            <div className="w-full lg:w-1/2 flex flex-col gap-6 animate-in fade-in slide-in-from-left-4 duration-500">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 bg-sun text-forest text-[10px] font-bold uppercase tracking-[0.2em] w-fit rounded-lg flex items-center gap-1.5 shadow-2xs">
                  <Building2 className="w-3.5 h-3.5" />
                  Benefício Corporativo
                </div>
              </div>

              <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl leading-[1.1] font-medium text-forest">
                Cuidar da sua saúde mental é o maior valor que sua empresa apoia!
              </h1>

              <p className="text-base md:text-lg text-forest/80 leading-relaxed max-w-lg">
                Sua empresa valoriza quem você é por inteiro. Através desta parceria institucional com o <strong>Projeto AcolheMente</strong>, você tem acesso a atendimento psicológico ético, qualificado e 100% sigiloso.
              </p>

              <p className="text-sm md:text-base text-forest/75 leading-relaxed max-w-lg">
                Acolher suas emoções e buscar autoconhecimento fortalece sua jornada pessoal e profissional. Conte com profissionais experientes prontos para te escutar sem julgamentos.
              </p>

              {/* 3 Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 bg-warm rounded-2xl border border-soft flex flex-col gap-1.5">
                  <div className="w-8 h-8 rounded-xl bg-sun-light flex items-center justify-center text-forest">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h4 className="font-serif font-bold text-xs text-forest">Sigilo Absoluto</h4>
                  <p className="text-[11px] text-forest/70 leading-snug">
                    Sua empresa apoia o benefício, mas não tem acesso aos seus relatos clínicos.
                  </p>
                </div>

                <div className="p-3.5 bg-warm rounded-2xl border border-soft flex flex-col gap-1.5">
                  <div className="w-8 h-8 rounded-xl bg-sun-light flex items-center justify-center text-forest">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <h4 className="font-serif font-bold text-xs text-forest">100% Online</h4>
                  <p className="text-[11px] text-forest/70 leading-snug">
                    Sessões virtuais com total comodidade e flexibilidade na sua rotina.
                  </p>
                </div>

                <div className="p-3.5 bg-warm rounded-2xl border border-soft flex flex-col gap-1.5">
                  <div className="w-8 h-8 rounded-xl bg-sun-light flex items-center justify-center text-forest">
                    <HeartHandshake className="w-4 h-4" />
                  </div>
                  <h4 className="font-serif font-bold text-xs text-forest">Rede Experiente</h4>
                  <p className="text-[11px] text-forest/70 leading-snug">
                    Psicólogos com CRP ativo preparados para o seu momento de vida.
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full lg:w-1/2 flex flex-col gap-6 items-center lg:items-end animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="relative max-w-lg w-full">
                <img 
                  src={empresaHeroPhoto} 
                  alt="Colaboradores cuidando da saúde mental" 
                  className="w-full object-cover rounded-3xl shadow-xl border border-soft max-h-[420px]" 
                  referrerPolicy="no-referrer" 
                />
                <div className="absolute -bottom-4 -left-4 bg-white p-4 rounded-2xl border border-soft shadow-lg flex items-center gap-3 max-w-xs">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-serif font-bold text-xs text-forest">Bem-Estar no Trabalho</h5>
                    <p className="text-[10px] text-forest/70 leading-snug">Apoio emocional contínuo para você alcançar seu equilíbrio.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Corporate Access Code & Form Container */}
      <section id="form-corporativo-container" className="w-full px-6 md:px-12 py-14 flex justify-center relative -mt-8">
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl shadow-forest/5 p-8 md:p-12 border border-soft relative z-10">
          
          {/* STEP 3: SUCESSO */}
          {step === 3 ? (
            <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="w-20 h-20 bg-sun-light rounded-full flex items-center justify-center text-forest mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="font-serif text-3xl md:text-4xl font-medium text-forest mb-4">
                Acolhimento Corporativo Confirmado!
              </h2>
              <p className="text-forest/70 max-w-md mb-6 leading-relaxed">
                Agradecemos a confiança, <strong>{name.split(' ')[0]}</strong>! Suas informações foram registradas com sucesso sob a parceria com <strong>{empresaValidated?.nomeEmpresa}</strong>.
              </p>
              <div className="p-6 bg-warm rounded-2xl border border-soft text-sm text-forest/80 mb-8 max-w-md text-left space-y-2">
                <p className="font-semibold text-forest flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Próximos Passos:
                </p>
                <p className="text-xs text-forest/75 leading-relaxed">
                  Nossa equipe de triagem já está mapeando os melhores horários e o profissional ideal para você. Fique atento ao e-mail <strong>{email}</strong> e ao WhatsApp informado.
                </p>
              </div>
              <button 
                onClick={() => {
                  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
                  onNavigate('landing');
                }}
                className="px-8 py-3 bg-sun text-forest rounded-full font-semibold shadow-lg shadow-sun/20 transition-all hover:bg-sun-dark cursor-pointer"
              >
                Retornar ao Início
              </button>
            </div>
          ) : !empresaValidated ? (
            /* COMPANY CODE VALIDATION STEP */
            <div className="flex flex-col gap-6 animate-in fade-in duration-500">
              <div className="text-center flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-2xl bg-sun/20 text-forest flex items-center justify-center mb-1">
                  <KeyRound className="w-7 h-7 text-forest" />
                </div>
                <h3 className="font-serif text-2xl md:text-3xl font-medium text-forest">
                  Identificação da Empresa Parceira
                </h3>
                <p className="text-sm text-forest/70 max-w-md">
                  Insira o <strong>código alfanumérico</strong> fornecido pela sua empresa ou pelo setor de Recursos Humanos para carregar o seu benefício exclusivo.
                </p>
              </div>

              <form onSubmit={handleValidateCompanyCode} className="flex flex-col gap-4 mt-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-forest/70 mb-2">
                    Código de Acesso da Empresa
                  </label>
                  <div className="relative">
                    <input 
                      type="text"
                      required
                      value={inputCode}
                      onChange={(e) => {
                        setInputCode(e.target.value.toUpperCase());
                        setCodeError("");
                      }}
                      placeholder="Ex: EMP-1234 ou NOME-CORP"
                      className="w-full text-center text-lg font-mono font-bold tracking-widest uppercase px-4 py-3.5 bg-warm border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:ring-2 focus:ring-sun-dark/20 transition-all text-forest"
                    />
                  </div>
                  <span className="text-[11px] text-forest/60 mt-1.5 block text-center">
                    Não sabe seu código? Consulte o RH ou o comunicado interno da sua empresa.
                  </span>
                </div>

                {codeError && (
                  <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl font-medium flex items-center gap-3 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span className="flex-1">{codeError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isValidatingCode}
                  className="w-full py-3.5 bg-sun text-forest rounded-full font-bold shadow-md shadow-sun/20 hover:bg-sun-dark transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-2"
                >
                  {isValidatingCode ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-forest" />
                      <span>Validando Empresa...</span>
                    </>
                  ) : (
                    <>
                      <span>Acessar Formulário do Colaborador</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* COLLABORATOR FORM STEPS */
            <div className="flex flex-col gap-6">
              {/* Partner Banner Header (Company Logo + Slogan) */}
              <div className="p-5 bg-warm/60 rounded-2xl border border-soft flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-soft flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                    {empresaValidated.logoUrl ? (
                      <img 
                        src={empresaValidated.logoUrl} 
                        alt={empresaValidated.nomeEmpresa} 
                        className="w-full h-full object-contain p-1"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Building2 className="w-7 h-7 text-forest/60" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-sun-light text-forest px-2 py-0.5 rounded">
                        Parceria Ativa
                      </span>
                      <span className="text-xs font-mono font-bold text-forest/50">
                        {empresaValidated.codigoAcesso}
                      </span>
                    </div>
                    <h4 className="font-serif font-bold text-lg text-forest">
                      {empresaValidated.nomeEmpresa}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setEmpresaValidated(null);
                      setInputCode("");
                    }}
                    className="text-xs text-forest/60 hover:text-forest underline cursor-pointer"
                  >
                    Trocar Código
                  </button>
                </div>
              </div>

              {/* Slogan */}
              {empresaValidated.slogan && (
                <div className="px-4 py-3 bg-sun-light/30 border border-sun-dark/20 rounded-xl text-xs text-forest/90 font-medium italic text-center animate-in fade-in">
                  "{empresaValidated.slogan}"
                </div>
              )}

              {/* Progress Bar */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-forest/70">
                  <span>{step === 1 ? "Etapa 1 de 2: Dados do Colaborador" : "Etapa 2 de 2: Motivação Clínica"}</span>
                  <span>{step === 1 ? "50%" : "100%"}</span>
                </div>
                <div className="flex gap-2">
                  <div className={`h-2 flex-1 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-sun-dark' : 'bg-soft'}`} />
                  <div className={`h-2 flex-1 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-sun-dark' : 'bg-soft'}`} />
                </div>
              </div>

              {errorMsg && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-2xl font-medium flex items-center gap-3 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span className="flex-1">{errorMsg}</span>
                </div>
              )}

              {/* STEP 1: DADOS DO COLABORADOR */}
              {step === 1 && (
                <form onSubmit={handleSubmitStep1} className="flex flex-col gap-5 animate-in fade-in duration-500">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-forest/70 mb-2">
                      Nome Completo do Colaborador *
                    </label>
                    <input 
                      type="text" 
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome completo..."
                      className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-forest/70 mb-2">
                        Cargo / Função *
                      </label>
                      <input 
                        type="text" 
                        required
                        value={cargo}
                        onChange={(e) => setCargo(e.target.value)}
                        placeholder="Ex: Analista, Gerente, Desenvolvedor..."
                        className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-forest/70 mb-2">
                        Departamento / Setor *
                      </label>
                      <input 
                        type="text" 
                        required
                        value={departamento}
                        onChange={(e) => setDepartamento(e.target.value)}
                        placeholder="Ex: Recursos Humanos, Operações..."
                        className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-forest/70 mb-2">
                        Data de Nascimento *
                      </label>
                      <input 
                        type="date" 
                        required
                        value={dataNascimento}
                        onChange={(e) => setDataNascimento(e.target.value)}
                        className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-forest/70 mb-2">
                        CPF *
                      </label>
                      <input 
                        type="text" 
                        required
                        value={cpf}
                        onChange={(e) => setCpf(e.target.value)}
                        placeholder="000.000.000-00"
                        className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-forest/70 mb-2">
                        E-mail de Contato *
                      </label>
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu.email@empresa.com"
                        className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-forest/70 mb-2">
                        Telefone / WhatsApp *
                      </label>
                      <input 
                        type="tel" 
                        required
                        value={telefone}
                        onChange={(e) => setTelefone(e.target.value)}
                        placeholder="(00) 00000-0000"
                        className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-forest/70 mb-2">
                        Gênero *
                      </label>
                      <select 
                        required
                        value={genero}
                        onChange={(e) => setGenero(e.target.value)}
                        className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                      >
                        <option value="">Selecione...</option>
                        <option value="Feminino">Feminino</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Não-binário">Não-binário</option>
                        <option value="Prefiro não informar">Prefiro não informar</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-forest/70 mb-2">
                        Deficiência ou Necessidade Especial? *
                      </label>
                      <select 
                        required
                        value={deficiencia}
                        onChange={(e) => setDeficiencia(e.target.value)}
                        className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                      >
                        <option value="">Selecione...</option>
                        <option value="Não possuo">Não possuo</option>
                        <option value="Deficiência física">Deficiência física (motora)</option>
                        <option value="Deficiência visual">Deficiência visual</option>
                        <option value="Deficiência auditiva">Deficiência auditiva</option>
                        <option value="Deficiência intelectual/cognitiva">Deficiência intelectual/cognitiva</option>
                        <option value="Transtorno do Espectro Autista (TEA)">Transtorno do Espectro Autista (TEA)</option>
                        <option value="Múltiplas deficiências">Múltiplas deficiências</option>
                        <option value="Outra necessidade especial">Outra necessidade especial</option>
                        <option value="Prefiro não responder">Prefiro não responder</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-forest/70 mb-2">
                        Estado Civil *
                      </label>
                      <select 
                        required
                        value={estadoCivil}
                        onChange={(e) => setEstadoCivil(e.target.value)}
                        className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                      >
                        <option value="">Selecione...</option>
                        <option value="Solteiro(a)">Solteiro(a)</option>
                        <option value="Casado(a) / União Estável">Casado(a) / União Estável</option>
                        <option value="Divorciado(a) / Separado(a)">Divorciado(a) / Separado(a)</option>
                        <option value="Viúvo(a)">Viúvo(a)</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-forest/70 mb-2">
                        Possui Filhos? *
                      </label>
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
                        className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                      >
                        <option value="">Selecione...</option>
                        <option value="Não possui filhos">Não possui filhos</option>
                        <option value="Sim (1 filho)">Sim (1 filho)</option>
                        <option value="Sim (2 filhos)">Sim (2 filhos)</option>
                        <option value="Sim (3 ou mais filhos)">Sim (3 ou mais filhos)</option>
                      </select>
                    </div>
                  </div>

                  {temFilhos !== "" && temFilhos !== "Não possui filhos" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-warm/50 border border-soft rounded-2xl animate-in fade-in">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-forest/70 mb-2">
                          Faixa Etária dos Filhos *
                        </label>
                        <select 
                          required
                          value={faixaEtariaFilhos}
                          onChange={(e) => setFaixaEtariaFilhos(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-soft rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                        >
                          <option value="">Selecione a faixa etária...</option>
                          <option value="Bebê / Primeira Infância (0 a 5 anos)">Bebê / Primeira Infância (0 a 5 anos)</option>
                          <option value="Crianças (6 a 11 anos)">Crianças (6 a 11 anos)</option>
                          <option value="Adolescentes (12 a 17 anos)">Adolescentes (12 a 17 anos)</option>
                          <option value="Adultos (18+ anos)">Adultos (18+ anos)</option>
                          <option value="Crianças e Adolescentes (faixas variadas)">Crianças e Adolescentes (faixas variadas)</option>
                          <option value="Outra / Diversas idades">Outra / Diversas idades</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-forest/70 mb-2">
                          Os filhos moram com você? *
                        </label>
                        <select 
                          required
                          value={filhosMoramJunto}
                          onChange={(e) => setFilhosMoramJunto(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-soft rounded-xl focus:outline-none focus:border-sun-dark text-forest"
                        >
                          <option value="">Selecione...</option>
                          <option value="Sim, moram na mesma residência">Sim, moram na mesma residência</option>
                          <option value="Não, moram em outra residência">Não, moram em outra residência</option>
                          <option value="Alguns moram na mesma residência">Alguns moram na mesma residência</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="pt-3 flex justify-end">
                    <button
                      type="submit"
                      className="px-8 py-3.5 bg-sun text-forest font-bold rounded-full hover:bg-sun-dark transition-all shadow-md flex items-center gap-2 cursor-pointer"
                    >
                      <span>Avançar para Motivação Clínica</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: MOTIVAÇÃO CLÍNICA & HORÁRIOS */}
              {step === 2 && (
                <form onSubmit={handleFinalSubmit} className="flex flex-col gap-5 animate-in fade-in duration-500">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-forest/70 mb-2">
                      Histórico de Psicoterapia *
                    </label>
                    <select 
                      required 
                      value={terapiaAnterior} 
                      onChange={(e) => setTerapiaAnterior(e.target.value)} 
                      className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark text-forest appearance-none"
                    >
                      <option value="" disabled>Selecione...</option>
                      <option value="Sim, em tratamento">Sim, e estou em tratamento atualmente.</option>
                      <option value="Sim, interrompi (+ 6 meses)">Sim, mas interrompi há mais de 6 meses.</option>
                      <option value="Não">Não (será minha primeira experiência).</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-forest/70 mb-2">
                      Motivo Principal do Atendimento *
                    </label>
                    <select 
                      required 
                      value={motivo} 
                      onChange={(e) => setMotivo(e.target.value)} 
                      className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark text-forest appearance-none"
                    >
                      <option value="" disabled>O que o traz aqui?</option>
                      <option value="Ansiedade ou estresse no trabalho/vida">Ansiedade, estresse ou sobrecarga profissional/pessoal.</option>
                      <option value="Prevenção de Burnout e exaustão emocional">Prevenção de Burnout e exaustão emocional.</option>
                      <option value="Depressão, desânimo ou tristeza profunda">Depressão, desânimo ou tristeza profunda.</option>
                      <option value="Problemas de relacionamento e comunicação">Problemas de relacionamento (equipe, familiar, interpessoal).</option>
                      <option value="Desenvolvimento pessoal e autoconhecimento">Desenvolvimento pessoal, foco e autoconhecimento.</option>
                      <option value="Enfrentamento de luto ou trauma">Enfrentamento de luto ou trauma.</option>
                      <option value="Outro">Outro.</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-forest/70 mb-2">
                      Conte-nos um pouco sobre o que você gostaria de trabalhar (breve) *
                    </label>
                    <textarea 
                      required
                      value={complaint}
                      onChange={(e) => setComplaint(e.target.value)}
                      placeholder="Descreva de forma breve o que tem sentido ou o objetivo que busca alcançar nas sessões..."
                      rows={3}
                      className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark text-forest resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-forest/70 mb-2">
                      Melhores períodos para sessões online *
                    </label>
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
                            className="w-5 h-5 rounded border-soft accent-sun-dark cursor-pointer"
                          />
                          <span className="text-sm font-medium text-forest">{period}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-start gap-3 mt-2 cursor-pointer group p-3 bg-warm/40 rounded-xl border border-soft">
                    <input 
                      type="checkbox" 
                      required
                      checked={lgpdAceite}
                      onChange={(e) => setLgpdAceite(e.target.checked)}
                      className="mt-0.5 w-5 h-5 rounded border-soft accent-sun-dark cursor-pointer"
                    />
                    <span className="text-xs text-forest/80 leading-relaxed">
                      <strong>Privacidade e Sigilo Profissional:</strong> Concordo com o tratamento dos dados estritamente para fins de atendimento psicológico e triagem pelo Projeto AcolheMente (LGPD). Confirmo a ciência de que minha empresa parceira não recebe informações do conteúdo de minhas sessões.
                    </span>
                  </label>

                  <div className="pt-4 flex gap-4">
                    <button 
                      type="button"
                      onClick={() => {
                        setStep(1);
                        setErrorMsg("");
                        scrollToForm();
                      }}
                      disabled={isSubmitting}
                      className="px-6 py-3 border border-soft text-forest/70 rounded-full font-semibold hover:bg-warm transition-all"
                    >
                      Voltar
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 px-8 py-3.5 bg-sun text-forest rounded-full font-bold shadow-lg shadow-sun/20 transition-all hover:bg-sun-dark flex items-center justify-center disabled:opacity-70 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-forest" />
                          Finalizando Cadastro...
                        </span>
                      ) : (
                        "Concluir e Solicitar Atendimento"
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>
      </section>
    </div>
  );
}
