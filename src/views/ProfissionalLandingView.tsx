import { Footer } from '../components/Footer';
import { ArrowLeft, CheckCircle2, HeartHandshake, UserPlus, Clock, PiggyBank, Network, Wallet } from "lucide-react";
import React, { FormEvent, useState } from "react";
import { collection, addDoc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { sendProfessionalLeadEmail } from "../lib/emailService";
import { Breadcrumbs } from "../components/Breadcrumbs";

import psicologoHero from '../assets/images/psicologo_hero_photo_1781024080247.png';
import logoImage from '../assets/images/logo_acolhe.jpeg';

export const OPCOES_SERVICOS = [
  "Terapia Individual (Adulto)",
  "Terapia de Casal",
  "Terapia Familiar",
  "Terapia Adolescente",
  "Terapia Infantil On Line (Acima dos 12 anos de idade)",
  "Avaliação Psicológica",
  "Avaliação Neuropsicológica",
  "Acompanhamento e Orientação Vocacional/ Transição Profissional e Carreira",
  "Psicologia Jurídica",
  "Laudo para Cirurgias",
  "Terapias Integrativas",
  "Outros"
];

export function ProfissionalLandingView({ onNavigate }: { onNavigate: (view: 'landing' | 'acolhimento' | 'dashboard' | 'profile' | 'empresa' | 'doacao' | 'profissional') => void }) {
  const [formData, setFormData] = useState({
    nome: '',
    especialidade: '',
    abordagem: '',
    anoFormacao: '',
    crp: '',
    cpf: '',
    email: '',
    telefone: '',
    cidade: '',
    uf: '',
    genero: '',
    deficiencia: '',
    horasDisponiveis: '1 a 3 horas/mês',
    publicosExperiencia: [] as string[],
    publicosGosto: [] as string[],
    outrosPublicosExperiencia: '',
    outrosPublicosGosto: '',
    motivacao: '',
    servicosOferecidos: [] as string[],
    servicosOrcamentoAcessivel: [] as string[],
    outrosServicos: ''
  });
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCheckboxChange = (field: 'publicosExperiencia' | 'publicosGosto', value: string) => {
    setFormData(prev => {
      const current = prev[field];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(v => v !== value) };
      } else {
        return { ...prev, [field]: [...current, value] };
      }
    });
  };

  const handleServiceCheckboxChange = (service: string) => {
    setFormData(prev => {
      const current = prev.servicosOferecidos || [];
      const isChecked = current.includes(service);
      const nextOferecidos = isChecked
        ? current.filter(s => s !== service)
        : [...current, service];
      
      const currentAcessivel = prev.servicosOrcamentoAcessivel || [];
      const nextAcessivel = isChecked
        ? currentAcessivel.filter(s => s !== service)
        : currentAcessivel;

      return {
        ...prev,
        servicosOferecidos: nextOferecidos,
        servicosOrcamentoAcessivel: nextAcessivel
      };
    });
  };

  const handleServiceAccessibleChange = (service: string) => {
    setFormData(prev => {
      const current = prev.servicosOrcamentoAcessivel || [];
      const next = current.includes(service)
        ? current.filter(s => s !== service)
        : [...current, service];
      return { ...prev, servicosOrcamentoAcessivel: next };
    });
  };

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (step > 1) {
      setStep(prev => prev - 1);
      setErrorMsg('');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (step === 1) {
      if (!formData.nome || !formData.email || !formData.telefone || !formData.cpf || !formData.cidade || !formData.uf || !formData.genero || !formData.deficiencia) {
        setErrorMsg("Por favor, preencha todos os campos obrigatórios.");
        return;
      }
      setErrorMsg('');
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!formData.abordagem || !formData.anoFormacao || !formData.horasDisponiveis) {
        setErrorMsg("Por favor, preencha todos os campos obrigatórios.");
        return;
      }
      setErrorMsg('');
      setStep(3);
      return;
    }

    if (step === 3) {
      if (!formData.servicosOferecidos || formData.servicosOferecidos.length === 0) {
        setErrorMsg("Por favor, selecione pelo menos um serviço profissional que você oferece.");
        return;
      }
      setErrorMsg('');
      setStep(4);
      return;
    }

    if (step === 4) {
      if (!formData.motivacao) {
        setErrorMsg("Por favor, preencha todos os campos obrigatórios.");
        return;
      }
      setIsSubmitting(true);
      setErrorMsg('');

      try {
        const q = query(collection(db, "profissionais_leads"), where("email", "==", formData.email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setErrorMsg("Este email já aparece em nossa triagem ou em nosso banco de dados.");
          setIsSubmitting(false);
          return;
        }

        await addDoc(collection(db, "profissionais_leads"), {
          ...formData,
          status: 'Aguardando Entrevista',
          notificacao: 'Novo cadastro de psicólogo associado/candidato.',
          createdAt: serverTimestamp()
        });

        try {
          await sendProfessionalLeadEmail(formData.nome, formData.email);
        } catch (emailErr) {
          console.error("Failed to send professional confirmation email:", emailErr);
        }

        setIsSuccess(true);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, "profissionais_leads");
        setErrorMsg("Ocorreu um erro ao processar o cadastro.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-warm overflow-y-auto">
      {/* Header */}
      <nav className="h-20 bg-white/50 backdrop-blur-md border-b border-soft px-6 md:px-12 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => onNavigate('landing')} className="text-forest/60 hover:text-forest transition-colors p-2 -ml-2 rounded-full hover:bg-forest/5">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-sun rounded-full flex items-center justify-center text-forest overflow-hidden shadow-sm">
              <img src={logoImage} alt="AcolheMente Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-serif text-2xl font-semibold tracking-tight text-forest">AcolheMente <span className="text-forest/70 font-medium">Para Psicólogos</span></span>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center pb-16">
        <Breadcrumbs items={[{ label: "Início", onClick: () => onNavigate("landing") }, { label: "Para Psicólogos", active: true }]} />
        {/* Presentation Section */}
        <section className="w-full px-6 md:px-12 py-12 md:py-16 flex justify-center bg-white border-b border-soft">
          <div className="max-w-[1440px] w-full flex flex-col items-center justify-between gap-8">
            <div className="w-full flex flex-col lg:flex-row gap-8 items-center justify-between">
              <div className="w-full lg:w-1/2 flex flex-col gap-6">
                <div className="mb-2 px-3 py-1 bg-sun-light text-forest text-[10px] font-bold uppercase tracking-[0.2em] w-fit rounded">
                  Engajamento Acessível
                </div>
                <h1 className="font-serif text-5xl md:text-6xl leading-[1.1] font-medium text-forest">
                  A terapia não deve ser um privilégio.
                </h1>
                <p className="text-lg text-forest/80 leading-relaxed max-w-lg mt-4">
                  Entendemos que o cuidado com a saúde mental é uma necessidade de todos e não um luxo. Estamos buscando profissionais motivados por esse propósito humanizado e acessível.
                </p>
                <p className="text-lg text-forest/80 leading-relaxed max-w-lg">
                  Ao abrir sua agenda e disponibilizar algumas horas, você possibilita o acesso a pessoas em vulnerabilidade ou através de subsídios solidários. Você continua sendo remunerado por isso, porém praticando valores compatíveis com o projeto.
                </p>
              </div>
              <div className="w-full lg:w-1/2 flex justify-center lg:justify-end">
                <img src={psicologoHero} alt="Ilustração Psicologia" className="w-full max-w-lg object-contain rounded-3xl mix-blend-multiply" referrerPolicy="no-referrer" />
              </div>
            </div>
            
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
              <div className="bg-warm/50 p-6 rounded-3xl border border-soft flex flex-col gap-3">
                <HeartHandshake className="w-8 h-8 text-sun-dark" />
                <h3 className="font-semibold text-lg text-forest">Apoio Real</h3>
                <p className="text-sm text-forest/80">Faça a diferença na jornada de pessoas que relutam em buscar ajuda pelo obstáculo financeiro.</p>
              </div>
              <div className="bg-warm/50 p-6 rounded-3xl border border-soft flex flex-col gap-3">
                <Clock className="w-8 h-8 text-sun-dark" />
                <h3 className="font-semibold text-lg text-forest">Liberdade</h3>
                <p className="text-sm text-forest/80">Escolha doar de 1 a 20 horas por mês. Sua disponibilidade constrói o tamanho da nossa rede de apoio.</p>
              </div>
              <div className="bg-warm/50 p-6 rounded-3xl border border-soft flex flex-col gap-3">
                <PiggyBank className="w-8 h-8 text-sun-dark" />
                <h3 className="font-semibold text-lg text-forest">Remuneração Justa</h3>
                <p className="text-sm text-forest/80">Os atendimentos são remunerados. É um acordo mútuo para reduzir o valor de forma acessível, sem desvalorizar seu trabalho.</p>
              </div>
              <div className="bg-warm/50 p-6 rounded-3xl border border-soft flex flex-col gap-3">
                <UserPlus className="w-8 h-8 text-sun-dark" />
                <h3 className="font-semibold text-lg text-forest">Ecossistema</h3>
                <p className="text-sm text-forest/80">Os pacientes chegam através de empresas parceiras ou do nosso fundo solidário, já engajados para tratamento.</p>
              </div>
              <div className="bg-warm/50 p-6 rounded-3xl border border-soft flex flex-col gap-3">
                <Network className="w-8 h-8 text-sun-dark" />
                <h3 className="font-semibold text-lg text-forest">Conexão entre Profissionais</h3>
                <p className="text-sm text-forest/80">Ofereça e usufrua de serviços exclusivos na plataforma: supervisão, cursos, workshops e consultorias.</p>
              </div>
              <div className="bg-warm/50 p-6 rounded-3xl border border-soft flex flex-col gap-3">
                <Wallet className="w-8 h-8 text-sun-dark" />
                <h3 className="font-semibold text-lg text-forest">Taxa Associativa Acessível</h3>
                <p className="text-sm text-forest/80">Acesse tudo isso com uma única taxa mensal, muito abaixo de outras plataformas, essencial para a sustentabilidade do projeto.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Form Section */}
        <section className="w-full px-6 md:px-12 py-16 flex justify-center relative -mt-10">
          <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl shadow-forest/5 p-8 md:p-12 border border-soft">
            {isSuccess ? (
              <div className="flex flex-col items-center text-center py-10 animate-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-sun-light rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-10 h-10 text-forest" />
                </div>
                <h2 className="font-serif text-3xl text-forest mb-4">Cadastro Realizado!</h2>
                <p className="text-forest/80 max-w-md mx-auto mb-8 text-lg">
                  Muito obrigado pela iniciativa em fazer parte. Nossa equipe realizará a validação dos dados e entrará em contato para ativar sua conta na plataforma em até 24h.
                </p>
                <button 
                  onClick={() => onNavigate('landing')}
                  className="px-8 py-4 bg-forest text-white rounded-full font-semibold hover:bg-forest/90 transition-all shadow-md"
                >
                  Voltar para o Início
                </button>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h2 className="font-serif text-3xl font-medium text-forest mb-2">
                    {step === 1 && "Dados Pessoais"}
                    {step === 2 && "Sua Formação"}
                    {step === 3 && "Público-Alvo"}
                    {step === 4 && "Seu Propósito"}
                  </h2>
                  <p className="text-forest/80 text-sm">
                    {step === 1 && "Preencha suas informações de identificação e contato."}
                    {step === 2 && "Conte-nos um pouco sobre sua formação e disponibilidade."}
                    {step === 3 && "Selecione os públicos com os quais você tem experiência ou prefere atender."}
                    {step === 4 && "Diga-nos o que te motiva a fazer parte do AcolheMente."}
                  </p>
                  
                  <div className="flex gap-2 mt-6">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <div key={idx} className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${idx < step ? 'bg-sun-dark' : 'bg-soft'}`} />
                    ))}
                  </div>
                </div>

                {errorMsg && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm text-center">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                
                  {step === 1 && (
                    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Nome Completo *</label>
                          <input 
                            required 
                            name="nome"
                            value={formData.nome}
                            onChange={handleChange}
                            className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest" 
                            placeholder="Ex: Maria da Silva" 
                          />
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">CPF *</label>
                          <input 
                            required
                            name="cpf"
                            value={formData.cpf}
                            onChange={handleChange}
                            className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest" 
                            placeholder="000.000.000-00" 
                          />
                        </div>
                      </div>

                      {formData.nome.trim().length >= 3 && formData.cpf.trim().length >= 3 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">E-mail *</label>
                            <input 
                              required 
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleChange}
                              className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest" 
                              placeholder="maria@exemplo.com"
                            />
                          </div>
                          
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Telefone / WhatsApp *</label>
                            <input 
                              required 
                              type="tel"
                              name="telefone"
                              value={formData.telefone}
                              onChange={handleChange}
                              className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest" 
                              placeholder="(00) 00000-0000"
                            />
                          </div>
                        </div>
                      )}

                      {formData.nome.trim().length >= 3 && formData.cpf.trim().length >= 3 && formData.email.includes('@') && formData.telefone.trim().length >= 4 && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500 border-t border-soft pt-6">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Cidade *</label>
                            <input 
                              required 
                              name="cidade"
                              value={formData.cidade}
                              onChange={handleChange}
                              className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest" 
                              placeholder="Ex: São Paulo"
                            />
                          </div>
                          
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Estado / UF *</label>
                            <select 
                              required 
                              name="uf"
                              value={formData.uf}
                              onChange={handleChange}
                              className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest appearance-none" 
                            >
                              <option value="">Selecione...</option>
                              <option value="AC">Acre</option>
                              <option value="AL">Alagoas</option>
                              <option value="AP">Amapá</option>
                              <option value="AM">Amazonas</option>
                              <option value="BA">Bahia</option>
                              <option value="CE">Ceará</option>
                              <option value="DF">Distrito Federal</option>
                              <option value="ES">Espírito Santo</option>
                              <option value="GO">Goiás</option>
                              <option value="MA">Maranhão</option>
                              <option value="MT">Mato Grosso</option>
                              <option value="MS">Mato Grosso do Sul</option>
                              <option value="MG">Minas Gerais</option>
                              <option value="PA">Pará</option>
                              <option value="PB">Paraíba</option>
                              <option value="PR">Paraná</option>
                              <option value="PE">Pernambuco</option>
                              <option value="PI">Piauí</option>
                              <option value="RJ">Rio de Janeiro</option>
                              <option value="RN">Rio Grande do Norte</option>
                              <option value="RS">Rio Grande do Sul</option>
                              <option value="RO">Rondônia</option>
                              <option value="RR">Roraima</option>
                              <option value="SC">Santa Catarina</option>
                              <option value="SP">São Paulo</option>
                              <option value="SE">Sergipe</option>
                              <option value="TO">Tocantins</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500 border-t border-soft pt-6 mt-2">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Gênero *</label>
                            <select 
                              required 
                              name="genero"
                              value={formData.genero}
                              onChange={handleChange}
                              className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest appearance-none"
                            >
                              <option value="">Selecione...</option>
                              <option value="Feminino">Feminino</option>
                              <option value="Masculino">Masculino</option>
                              <option value="Não-binário">Não-binário</option>
                              <option value="Prefiro não informar">Prefiro não informar</option>
                              <option value="Outro">Outro</option>
                            </select>
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Deficiência ou Necessidade Especial *</label>
                            <select 
                              required 
                              name="deficiencia"
                              value={formData.deficiencia}
                              onChange={handleChange}
                              className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest appearance-none"
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
                      </>
                    )}
                    </div>
                  )}

                  {step === 2 && (
                    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Abordagens Psicológicas de Atendimento *</label>
                          <input 
                            required 
                            name="abordagem"
                            value={formData.abordagem}
                            onChange={handleChange}
                            className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest" 
                            placeholder="Ex: TCC, Psicanálise, Humanista..." 
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Ano de formação / graduação *</label>
                          <input 
                            required
                            type="number"
                            name="anoFormacao"
                            value={formData.anoFormacao}
                            onChange={handleChange}
                            className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest" 
                            placeholder="Ex: 2015" 
                          />
                        </div>
                      </div>

                      {formData.abordagem.trim().length >= 2 && formData.anoFormacao.trim().length >= 4 && (
                        <div className="flex flex-col gap-6 animate-in fade-in duration-500 border-t border-soft pt-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">CRP / Registro (Se houver)</label>
                              <input 
                                name="crp"
                                value={formData.crp}
                                onChange={handleChange}
                                className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest" 
                                placeholder="00/00000" 
                              />
                            </div>

                            <div className="flex flex-col gap-1">
                              <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Especialidade / Pós-graduação</label>
                              <input 
                                name="especialidade"
                                value={formData.especialidade}
                                onChange={handleChange}
                                className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest" 
                                placeholder="Ex: Especialidade em saúde mental..." 
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Horas mensais disponíveis *</label>
                            <select 
                              required 
                              name="horasDisponiveis"
                              value={formData.horasDisponiveis}
                              onChange={handleChange}
                              className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest appearance-none" 
                            >
                              <option value="1 a 3 horas/mês">1 a 3 horas/mês</option>
                              <option value="4 a 8 horas/mês">4 a 8 horas/mês</option>
                              <option value="9 a 15 horas/mês">9 a 15 horas/mês</option>
                              <option value="16 a 20 horas/mês">16 a 20 horas/mês</option>
                              <option value="Mais de 20 horas/mês">Mais de 20 horas/mês</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {step === 3 && (
                    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
                      
                      {/* Questão: Serviços profissionais que ofereço */}
                      <div className="flex flex-col gap-3 bg-warm/30 p-5 rounded-2xl border border-soft/80">
                        <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2 leading-relaxed">
                          Serviços profissionais que ofereço *
                        </label>
                        <p className="text-[11px] text-forest/60 -mt-1 ml-2 leading-relaxed">
                          Marque os serviços que você realiza e selecione "Disponibilizar para orçamento acessível" caso queira oferecer valores de atendimento social/acessível para o mesmo.
                        </p>
                        
                        <div className="flex flex-col gap-3 mt-2">
                          {OPCOES_SERVICOS.map(op => {
                            const isOferecido = (formData.servicosOferecidos || []).includes(op);
                            const isAcessivel = (formData.servicosOrcamentoAcessivel || []).includes(op);
                            
                            return (
                              <div key={`srv-chk-${op}`} className="bg-white p-4 rounded-xl border border-soft shadow-xs flex flex-col gap-2">
                                <label className="flex items-center gap-2.5 text-sm font-semibold text-forest cursor-pointer select-none">
                                  <input 
                                    type="checkbox" 
                                    checked={isOferecido}
                                    onChange={() => handleServiceCheckboxChange(op)}
                                    className="accent-forest rounded border-soft w-4.5 h-4.5 cursor-pointer" 
                                  />
                                  {op === "Outros" ? "Outros: Especifique" : op}
                                </label>
                                
                                {isOferecido && (
                                  <div className="pl-7 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-200 border-t border-soft/40 pt-2">
                                    {op === "Outros" && (
                                      <input 
                                        type="text"
                                        name="outrosServicos"
                                        placeholder="Especifique o outro serviço..."
                                        value={formData.outrosServicos || ''}
                                        onChange={handleChange}
                                        className="w-full px-3 py-1.5 bg-warm/30 border border-soft rounded-lg text-xs focus:outline-none focus:border-sun-dark text-forest"
                                      />
                                    )}
                                    <label className="flex items-center gap-2 text-xs text-forest/70 cursor-pointer select-none font-medium">
                                      <input 
                                        type="checkbox" 
                                        checked={isAcessivel}
                                        onChange={() => handleServiceAccessibleChange(op)}
                                        className="accent-emerald-600 rounded border-soft w-4 h-4 cursor-pointer" 
                                      />
                                      Disponibilizar para orçamento acessível
                                    </label>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex flex-col gap-3">
                        <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2 leading-relaxed">
                          Experiência de no mínimo um ano com atendimento clínico de:
                        </label>
                        <div className="flex flex-col gap-2 px-2">
                          {['Adulto', 'Idoso', 'Criança', 'Adolescente', 'Casal', 'Família', 'Outros'].map(op => (
                            <label key={`exp-${op}`} className="flex items-center gap-2 text-sm text-forest cursor-pointer w-fit">
                              <input 
                                type="checkbox" 
                                checked={formData.publicosExperiencia.includes(op)}
                                onChange={() => handleCheckboxChange('publicosExperiencia', op)}
                                className="accent-sun-dark w-4 h-4 cursor-pointer" 
                              />
                              {op}
                            </label>
                          ))}
                          {formData.publicosExperiencia.includes('Outros') && (
                            <input 
                              type="text"
                              name="outrosPublicosExperiencia"
                              placeholder="Especifique outros públicos"
                              value={formData.outrosPublicosExperiencia}
                              onChange={handleChange}
                              className="w-full mt-1 border-b border-soft bg-transparent focus:outline-none focus:border-sun-dark text-sm py-2 px-1"
                            />
                          )}
                        </div>
                      </div>

                      {formData.publicosExperiencia.length > 0 && (
                        <div className="flex flex-col gap-3 animate-in fade-in duration-500 border-t border-soft pt-6">
                          <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2 leading-relaxed">
                            Gosto de atender:
                          </label>
                          <div className="flex flex-col gap-2 px-2">
                            {['Adulto', 'Idoso', 'Criança', 'Adolescente', 'Casal', 'Família', 'Outros'].map(op => (
                              <label key={`gosto-${op}`} className="flex items-center gap-2 text-sm text-forest cursor-pointer w-fit">
                                <input 
                                  type="checkbox" 
                                  checked={formData.publicosGosto.includes(op)}
                                  onChange={() => handleCheckboxChange('publicosGosto', op)}
                                  className="accent-sun-dark w-4 h-4 cursor-pointer" 
                                />
                                {op}
                              </label>
                            ))}
                            {formData.publicosGosto.includes('Outros') && (
                              <input 
                                type="text"
                                name="outrosPublicosGosto"
                                placeholder="Especifique outros públicos"
                                value={formData.outrosPublicosGosto}
                                onChange={handleChange}
                                className="w-full mt-1 border-b border-soft bg-transparent focus:outline-none focus:border-sun-dark text-sm py-2 px-1"
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {step === 4 && (
                    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Por que você quer fazer parte desse projeto? *</label>
                        <textarea 
                          required 
                          name="motivacao"
                          rows={3}
                          value={formData.motivacao}
                          onChange={handleChange}
                          className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest resize-none" 
                          placeholder="Fale um pouco sobre as suas motivações..."
                        />
                      </div>

                      {formData.motivacao.trim().length >= 10 && (
                        <div className="flex flex-col gap-6 animate-in fade-in duration-500 border-t border-soft pt-6">
                          <label className="flex items-start gap-3 cursor-pointer group">
                            <input 
                              type="checkbox" 
                              required 
                              className="mt-1 w-5 h-5 rounded border-soft text-sun-dark focus:ring-sun-dark/20 accent-sun-dark cursor-pointer"
                            />
                            <span className="text-xs text-forest/70 leading-relaxed">
                              <strong>Privacidade e LGPD:</strong> Estou ciente e concordo que meus dados profissionais e de contato serão tratados de forma sigilosa para fins de validação e cadastro na plataforma, conforme a Lei Geral de Proteção de Dados (LGPD).
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-4 border-t border-soft pt-6 mt-4">
                    {step > 1 && (
                      <button 
                        type="button" 
                        onClick={handleBack}
                        className="flex-1 py-4 px-6 border border-soft text-forest hover:bg-forest/5 rounded-full font-semibold transition-all text-center"
                      >
                        Voltar
                      </button>
                    )}
                    
                    <button 
                      disabled={isSubmitting}
                      type="submit" 
                      className="flex-1 py-4 px-6 bg-forest text-white rounded-full font-semibold shadow-md hover:bg-forest/90 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {step < 4 ? "Avançar" : (isSubmitting ? "Enviando..." : "Finalizar Cadastro")}
                    </button>
                  </div>
                  
                  <p className="text-center text-[10px] text-forest/60 uppercase tracking-widest font-semibold mt-2">
                    Agradecemos pela sua disposição em apoiar esse projeto.
                  </p>
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
