import { ArrowLeft, CheckCircle2, Leaf, Laptop, ShieldCheck, DollarSign } from "lucide-react";
import { Footer } from "../components/Footer";
import { FormEvent, useState } from "react";
import { collection, addDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { sendPatientRegistrationEmail } from "../lib/emailService";

import pacienteHero from '../assets/images/paciente_hero_laptop_therapist_1782433549769.jpg';
import logoImage from '../assets/images/logo_acolhe.jpeg';

type AccessType = "Particular" | "Corporativo" | "";

export function AcolhimentoView({ onNavigate }: { onNavigate: (view: 'landing' | 'acolhimento' | 'dashboard' | 'profile') => void }) {
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Data
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [accessType, setAccessType] = useState<AccessType>("");
  const [companyCode, setCompanyCode] = useState("");

  const [tratamentoPara, setTratamentoPara] = useState("");
  const [idadeTratamento, setIdadeTratamento] = useState(""); 
  const [cpf, setCpf] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [responsavelNome, setResponsavelNome] = useState("");
  const [responsavelCpf, setResponsavelCpf] = useState("");
  const [comoConheceu, setComoConheceu] = useState("");

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

  const totalSteps = accessType === "Particular" ? 4 : 2; // Corporativo goes 1 -> 4 basically (mapped as 2)
  const currentVisualStep = accessType === "Particular" ? step : (step === 4 ? 2 : step);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!tratamentoPara) return;
      if (tratamentoPara === "Outra pessoa" && !idadeTratamento) return;
      if (!name || !email || !telefone || !cpf || !dataNascimento || !accessType || !comoConheceu) return;
      if (tratamentoPara === "Outra pessoa" && (!responsavelNome || !responsavelCpf)) return;
      if (accessType === "Corporativo" && !companyCode) return;
      setStep(accessType === "Particular" ? 2 : 4);
    } else if (step === 2) {
      if (!fonteRenda || !faixaSalarial || !dependentes || !planoSaude) return;
      setStep(3);
    } else if (step === 3) {
      if (!escolaridade || !moradia || !comodos || !internet || !dispositivo) return;
      setStep(4);
    } else if (step === 4) {
      if (!motivo || !complaint || !terapiaAnterior || melhoresPeriodos.length === 0) {
        alert("Por favor, preencha todos os campos e selecione pelo menos um período de disponibilidade.");
        return;
      }
      setIsSubmitting(true);
      
      try {
        const q = query(collection(db, "acolhimentos"), where("email", "==", email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          alert("Este email já aparece em nossa triagem ou em nosso banco de dados.");
          setIsSubmitting(false);
          return;
        }

        await addDoc(collection(db, "acolhimentos"), {
          nome: name,
          email,
          telefone,
          cpf,
          dataNascimento,
          tratamentoPara,
          idadeTratamento,
          responsavelNome,
          responsavelCpf,
          comoConheceu,
          viaAcesso: accessType,
          empresa: companyCode,
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
          motivo: `${motivo} - Detalhes: ${complaint}`,
          status: "Aguardando Avaliação",
          notificacao: "Novo cadastro de paciente recebido no sistema. Por favor, analise a ficha.",
          createdAt: serverTimestamp()
        });

        try {
          await sendPatientRegistrationEmail(name, email);
        } catch (emailErr) {
          console.error("Failed to send automatic welcome email:", emailErr);
        }
        
        setIsSubmitting(false);
        setStep(5); // Success step
      } catch (error) {
        setIsSubmitting(false);
        handleFirestoreError(error, OperationType.CREATE, "acolhimentos");
      }
    }
  };

  const handleBack = () => {
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
    if (step === 4) {
      if (accessType === "Corporativo") setStep(1);
      else setStep(3);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-warm">
      <nav className="w-full py-6 px-6 md:px-12 flex items-center border-b border-soft">
        <button 
          onClick={() => onNavigate('landing')}
          className="flex items-center gap-2 text-forest/70 hover:text-forest transition-colors mr-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-semibold uppercase tracking-wider">Voltar ao Início</span>
        </button>
        <div className="flex items-center gap-3 absolute left-1/2 -translate-x-1/2">
          <div className="w-8 h-8 bg-sun rounded-full flex items-center justify-center text-forest overflow-hidden">
            <img src={logoImage} alt="AcolheMente Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-serif text-xl font-semibold tracking-tight text-forest hidden sm:block">
            AcolheMente
          </span>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center pb-16 w-full">
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
                
                {/* Benefit Cards summarizing benefits and stating that they are online */}
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
                        Valores de atendimento acessíveis e solidários que respeitam a sua realidade financeira.
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
          <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl shadow-forest/5 p-8 md:p-12 border border-soft relative z-10">
            
            {step === 5 ? (
              <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="w-20 h-20 bg-sun-light rounded-full flex items-center justify-center text-forest mb-6">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h2 className="font-serif text-3xl md:text-4xl font-medium text-forest mb-4">Acolhimento Recebido!</h2>
                <p className="text-forest/70 max-w-md mb-8 leading-relaxed">
                  Agradecemos a confiança, {name.split(' ')[0]}. Nossa equipe de triagem já recebeu suas informações e está preparando o encaminhamento ideal em até 24h.
                </p>
                <div className="p-6 bg-warm rounded-2xl border border-soft text-sm text-forest/80 mb-8 max-w-sm">
                  Acompanhe o e-mail <strong>{email}</strong> para conferir os próximos passos. Verifique também a sua caixa de spam.
                </div>
                <button 
                  onClick={() => onNavigate('landing')}
                  className="px-8 py-3 bg-sun text-forest rounded-full font-semibold shadow-lg shadow-sun/20 transition-all hover:bg-sun-dark"
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

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                
                {step === 1 && (
                  <div className="flex flex-col gap-5 animate-in fade-in duration-500">
                    <div>
                      <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">O tratamento é para você ou para outra pessoa?</label>
                      <select 
                        required
                        value={tratamentoPara}
                        onChange={(e) => {
                           setTratamentoPara(e.target.value);
                           if (e.target.value === 'Mim') setIdadeTratamento(""); // reset
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
                          <option value="Menor">Menor de idade</option>
                          <option value="Adulto">Adulto</option>
                        </select>
                      </div>
                    )}

                    {tratamentoPara === "Outra pessoa" && idadeTratamento === "Menor" && (
                      <div className="p-4 bg-sun-light/30 border border-sun-dark/20 text-sm text-forest/80 rounded-xl animate-in fade-in slide-in-from-top-2">
                        <strong>Orientação:</strong> Por favor, preencha inicialmente os dados do(a) <strong>menor de idade</strong> (paciente). Logo abaixo, haverá um espaço destinado aos dados do responsável legal.
                      </div>
                    )}

                    {tratamentoPara !== "" && (
                      <>
                        <div className="animate-in fade-in slide-in-from-top-2">
                          <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">
                            {tratamentoPara === 'Outra pessoa' ? 'Nome Completo do Paciente' : 'Nome Completo'}
                          </label>
                          <input 
                            required
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nome completo..."
                            className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest"
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in slide-in-from-top-2">
                          <div>
                            <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">
                              Data de Nascimento {tratamentoPara === 'Outra pessoa' ? 'do Paciente' : ''}
                            </label>
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
                              CPF {tratamentoPara === 'Outra pessoa' ? 'do Paciente' : ''} {idadeTratamento === 'Menor' ? '(Se houver)' : ''}
                            </label>
                            <input 
                              required={idadeTratamento !== 'Menor'}
                              type="text" 
                              value={cpf}
                              onChange={(e) => setCpf(e.target.value)}
                              placeholder="000.000.000-00"
                              className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest"
                            />
                          </div>
                        </div>

                        {tratamentoPara === 'Outra pessoa' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in slide-in-from-top-2 mt-2 pt-4 border-t border-soft">
                            <div>
                              <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">Nome do Responsável Legal</label>
                              <input 
                                required
                                type="text" 
                                value={responsavelNome}
                                onChange={(e) => setResponsavelNome(e.target.value)}
                                placeholder="Nome do representante..."
                                className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest"
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
                                className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest"
                              />
                            </div>
                          </div>
                        )}

                        <div className="animate-in fade-in slide-in-from-top-2">
                          <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">E-mail {tratamentoPara === 'Outra pessoa' ? '(para contato e agendamento)' : ''}</label>
                          <input 
                            required
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest"
                          />
                        </div>

                        <div className="animate-in fade-in slide-in-from-top-2">
                          <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">Telefone / WhatsApp {tratamentoPara === 'Outra pessoa' ? '(para contato)' : ''}</label>
                          <input 
                            required
                            type="tel" 
                            value={telefone}
                            onChange={(e) => setTelefone(e.target.value)}
                            placeholder="(00) 00000-0000"
                            className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest"
                          />
                        </div>

                        <div className="animate-in fade-in slide-in-from-top-2">
                          <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">De onde você nos conheceu?</label>
                          <select 
                            required
                            value={comoConheceu}
                            onChange={(e) => setComoConheceu(e.target.value)}
                            className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest"
                          >
                            <option value="">Selecione...</option>
                            <option value="Indicação de profissional">Indicação de profissional</option>
                            <option value="Projetos">Projetos</option>
                            <option value="Plataformas">Plataformas</option>
                            <option value="Instituição/ Igreja">Instituição/ Igreja</option>
                            <option value="Amigos/ conhecidos">Amigos/ conhecidos</option>
                            <option value="Google/ Site">Google/ Site</option>
                            <option value="Pacientes">Pacientes</option>
                            <option value="Outros">Outros</option>
                          </select>
                        </div>
                        
                        <div className="animate-in fade-in slide-in-from-top-2">
                          <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">Via de Acesso</label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setAccessType("Particular")}
                              className={`p-4 rounded-xl border text-left transition-all ${
                                accessType === "Particular" 
                                  ? "border-sun-dark bg-sun-light/30 text-forest shadow-sm" 
                                  : "border-soft hover:border-sun-dark/50 text-forest/70"
                              }`}
                            >
                              <span className="block font-medium mb-1">Particular</span>
                              <span className="block text-xs opacity-70">Valor acessível</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setAccessType("Corporativo")}
                              className={`p-4 rounded-xl border text-left transition-all ${
                                accessType === "Corporativo" 
                                  ? "border-sun-dark bg-sun-light/30 text-forest shadow-sm" 
                                  : "border-soft hover:border-sun-dark/50 text-forest/70"
                              }`}
                            >
                              <span className="block font-medium mb-1">Corporativo</span>
                              <span className="block text-xs opacity-70">Via empresa parceira</span>
                            </button>
                          </div>
                        </div>

                        {accessType === "Corporativo" && (
                          <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-sm font-semibold uppercase tracking-wider text-forest/70 mb-2">Código da Empresa</label>
                            <input 
                              required
                              type="text" 
                              value={companyCode}
                              onChange={(e) => setCompanyCode(e.target.value)}
                              placeholder="Ex: EMP-1234"
                              className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark focus:ring-1 focus:ring-sun-dark transition-all text-forest"
                            />
                          </div>
                        )}
                      </>
                    )}
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
                        <option value="Até 1 Salário Mínimo">Até 1 Salário Mínimo (SM)</option>
                        <option value="De 1 a 2 Salários Mínimos">De 1 a 2 Salários Mínimos</option>
                        <option value="De 2 a 3 Salários Mínimos">De 2 a 3 Salários Mínimos</option>
                        <option value="De 3 a 5 Salários Mínimos">De 3 a 5 Salários Mínimos</option>
                        <option value="Acima de 5 Salários Mínimos">Acima de 5 Salários Mínimos</option>
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
                      required 
                      className="mt-1 w-5 h-5 rounded border-soft text-sun-dark focus:ring-sun-dark/20 accent-sun-dark cursor-pointer"
                    />
                    <span className="text-xs text-forest/70 leading-relaxed">
                      <strong>Privacidade e LGPD:</strong> Estou ciente e concordo que os dados pessoais e dados de saúde fornecidos serão tratados de forma sigilosa e segura para fins terapêuticos e de triagem, conforme a Lei Geral de Proteção de Dados (LGPD).
                    </span>
                  </label>
                )}

                <div className="mt-4 flex gap-4">
                  {step > 1 && (
                    <button 
                      type="button"
                      onClick={handleBack}
                      disabled={isSubmitting}
                      className="px-6 py-3 border border-soft text-forest/70 rounded-full font-semibold hover:bg-warm transition-all disabled:opacity-50"
                    >
                      Voltar
                    </button>
                  )}
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-8 py-3 bg-sun text-forest rounded-full font-semibold shadow-lg shadow-sun/20 transition-all hover:bg-sun-dark flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Finalizando...
                      </span>
                    ) : step === 4 || (accessType === "Corporativo" && step === 1) ? (
                      (accessType === "Corporativo" && step === 1) ? "Avançar" : "Finalizar Acolhimento"
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
    </main>
      <Footer onNavigate={onNavigate} />
    </div>
  );
}
