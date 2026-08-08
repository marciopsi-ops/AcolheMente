import { Footer } from '../components/Footer';
import { ArrowLeft, CheckCircle2, HeartHandshake, UserPlus, Clock, PiggyBank, Network, Wallet, Check, CreditCard, Sparkles } from "lucide-react";
import React, { FormEvent, useState, useEffect } from "react";
import { collection, addDoc, serverTimestamp, getDocs, query, where, doc, onSnapshot } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { sendProfessionalLeadEmail } from "../lib/emailService";
import { sendWebhookNotification } from "../lib/webhookNotifier";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { StripeCheckoutModal } from "../components/StripeCheckoutModal";

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
    profissao: 'Psicólogo(a)',
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
    horasDisponiveis: '2 a 4 horas/mês',
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
  
  const [taxaAssociativaMensal, setTaxaAssociativaMensal] = useState("29,90");
  const [stripeConfig, setStripeConfig] = useState<any>(null);
  const [cienciaTaxa, setCienciaTaxa] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [registeredLeadId, setRegisteredLeadId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "configuracoes", "master"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.taxaAssociativaMensal) {
          setTaxaAssociativaMensal(data.taxaAssociativaMensal);
        }
        setStripeConfig({
          stripeEnabled: data.stripeEnabled,
          stripePublicKey: data.stripePublicKey,
          stripeCheckoutUrl: data.stripeCheckoutUrl,
        });
      }
    }, (err) => console.error("Error fetching config:", err));
    return () => unsub();
  }, []);

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
      if (!cienciaTaxa) {
        setErrorMsg(`Para prosseguir, você deve declarar estar ciente da taxa associativa de R$ ${taxaAssociativaMensal}/mês.`);
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

        const docRef = await addDoc(collection(db, "profissionais_leads"), {
          ...formData,
          taxaAssociativaMensal,
          cienciaTaxaAceita: true,
          statusPagamento: 'pendente',
          status: 'Aguardando Entrevista',
          notificacao: 'Novo cadastro de psicólogo associado/candidato.',
          createdAt: serverTimestamp()
        });

        setRegisteredLeadId(docRef.id);

        try {
          await sendProfessionalLeadEmail(formData.nome, formData.email);
        } catch (emailErr) {
          console.error("Failed to send professional confirmation email:", emailErr);
        }

        // Webhook dispatch
        try {
          await sendWebhookNotification({
            event: 'novo_profissional',
            recipientEmail: formData.email,
            recipientName: formData.nome,
            title: 'Novo Profissional Cadastrado - AcolheMente',
            message: `Dr(a). ${formData.nome} realizou o cadastro de profissional associado.`,
            data: {
              leadId: docRef.id,
              nome: formData.nome,
              email: formData.email,
              telefone: formData.telefone,
              crp: formData.crp,
              especialidade: formData.especialidade,
              taxaAssociativaMensal,
            }
          });
        } catch (webhookErr) {
          console.error("Webhook notification error:", webhookErr);
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
              <div className="col-span-1 sm:col-span-2 lg:col-span-3 bg-gradient-to-br from-forest via-[#1d3c2b] to-[#12281c] text-white p-8 md:p-10 rounded-3xl border-2 border-sun-dark/40 shadow-xl relative overflow-hidden group hover:border-sun-dark transition-all duration-300 my-2">
                {/* Background glow accent */}
                <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-sun/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -left-12 -top-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="px-3 py-1 bg-sun text-forest text-[11px] font-black uppercase tracking-wider rounded-full shadow-sm">
                        ⭐ Destaque do Projeto
                      </span>
                      <span className="px-3 py-1 bg-white/10 text-sun-light text-[11px] font-semibold rounded-full border border-white/20">
                        Cobrança Somente Após Aceite & Contrato
                      </span>
                    </div>

                    <h3 className="font-serif text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                      <Wallet className="w-7 h-7 text-sun shrink-0" />
                      Taxa Associativa Acessível
                    </h3>

                    <p className="text-white/90 text-sm md:text-base leading-relaxed max-w-2xl">
                      Contribuição mensal única de <strong className="text-sun font-bold text-lg">R$ {taxaAssociativaMensal}</strong> para manutenção da plataforma, infraestrutura técnica e triagem de casos.
                    </p>

                    <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/15 text-xs text-white/90 space-y-1.5 max-w-2xl">
                      <p className="font-bold text-sun text-xs uppercase tracking-wide flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-sun" /> Como funciona o processo de adesão?
                      </p>
                      <p className="leading-relaxed">
                        O preenchimento da inscrição é <strong className="text-white underline decoration-sun underline-offset-2">100% gratuito</strong>. A taxa associativa mensal <strong className="text-sun font-semibold">só passará a ser cobrada a partir da entrevista de alinhamento, aprovação pela gestão do projeto e assinatura formal do contrato de parceria</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="w-full lg:w-auto bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 flex flex-col items-center justify-center text-center shrink-0 min-w-[240px]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-sun-light">Valor Fixo Mensal</span>
                    <div className="flex items-baseline gap-1 my-1">
                      <span className="text-sm font-bold text-sun">R$</span>
                      <span className="text-4xl font-extrabold text-white font-serif">{taxaAssociativaMensal}</span>
                    </div>
                    <span className="text-[11px] text-white/80 bg-white/15 px-3 py-1 rounded-full mt-1 border border-white/20">
                      Cobrado apenas pós-contrato
                    </span>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/15 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-white/90 relative z-10">
                  <div className="flex items-start gap-3 bg-white/5 p-3.5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                    <Check className="w-4 h-4 text-sun shrink-0 mt-0.5" />
                    <span>Conexão com profissionais para divulgação e troca de serviços a valores acessíveis</span>
                  </div>
                  <div className="flex items-start gap-3 bg-white/5 p-3.5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                    <Check className="w-4 h-4 text-sun shrink-0 mt-0.5" />
                    <span>Page profissional pessoal no catálogo público da plataforma</span>
                  </div>
                  <div className="flex items-start gap-3 bg-white/5 p-3.5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                    <Check className="w-4 h-4 text-sun shrink-0 mt-0.5" />
                    <span>Respaldo e consultoria sob demanda elaborada pelos gestores do projeto</span>
                  </div>
                  <div className="flex items-start gap-3 bg-white/5 p-3.5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                    <Check className="w-4 h-4 text-sun shrink-0 mt-0.5" />
                    <span>Triagem e encaminhamento ativo dos casos para atendimento</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Form Section */}
        <section className="w-full px-6 md:px-12 py-16 flex justify-center relative -mt-10">
          <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl shadow-forest/5 p-8 md:p-12 border border-soft">
            {isSuccess ? (
              <div className="flex flex-col items-center text-center py-6 animate-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-sun-light rounded-full flex items-center justify-center mb-4 border border-sun-dark/30 shadow-xs">
                  <CheckCircle2 className="w-10 h-10 text-forest" />
                </div>
                <h2 className="font-serif text-3xl font-bold text-forest mb-2">Pré-Inscrição Concluída!</h2>
                <p className="text-forest/80 max-w-lg mx-auto mb-5 text-sm leading-relaxed">
                  Muito obrigado pela iniciativa em fazer parte do Projeto AcolheMente! Recebemos suas informações e nossa equipe entrará em contato em breve para realizar a <strong className="text-forest font-semibold">entrevista de alinhamento</strong>.
                </p>

                {/* Clear Process / Fee Policy Banner */}
                <div className="w-full max-w-lg bg-emerald-50/90 p-4 rounded-2xl border border-emerald-200/80 mb-6 text-left flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider">
                    <Clock className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>Próximas Etapas do Processo</span>
                  </div>
                  <ol className="text-xs text-forest/90 space-y-1.5 list-decimal pl-4 leading-relaxed">
                    <li><strong>Análise de Perfil:</strong> Validação dos dados profissionais e CRP pela equipe de gestão.</li>
                    <li><strong>Entrevista de Alinhamento:</strong> Reunião online com nossos coordenadores.</li>
                    <li><strong>Aceite & Assinatura de Contrato:</strong> Formalização e liberação de acesso ao catálogo e pacientes.</li>
                  </ol>
                  <p className="text-[11px] text-emerald-800 italic border-t border-emerald-200/60 pt-2 mt-1">
                    💡 <strong>Lembrete:</strong> Nenhuma cobrança é efetuada neste momento. A taxa associativa (R$ {taxaAssociativaMensal}/mês) só é devida após a aprovação e assinatura formal do contrato.
                  </p>
                </div>

                {/* Stripe Checkout Call to Action for already-approved members */}
                {stripeConfig?.stripeEnabled && (
                  <div className="w-full max-w-lg bg-warm/60 p-5 rounded-2xl border border-soft mb-6 flex flex-col gap-3 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-forest" />
                        <span className="font-bold text-sm text-forest">Já passou pela entrevista e assinou o contrato?</span>
                      </div>
                      <span className="px-2 py-0.5 bg-sun-light text-forest text-[10px] font-bold rounded uppercase">
                        Adesão
                      </span>
                    </div>
                    <p className="text-xs text-forest/80 leading-relaxed">
                      Se você já foi aprovado na entrevista e concluiu o contrato, ative sua taxa associativa (R$ {taxaAssociativaMensal}/mês) com total segurança via Pix ou Cartão de Crédito.
                    </p>
                    <button
                      onClick={() => setShowCheckoutModal(true)}
                      className="w-full py-3.5 px-6 bg-forest text-white rounded-xl font-bold hover:bg-forest/90 transition-all shadow-md flex items-center justify-center gap-2 text-sm mt-1"
                    >
                      <Sparkles className="w-4 h-4 text-sun" />
                      Efetuar Pagamento da Taxa Associativa (R$ {taxaAssociativaMensal}/mês)
                    </button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-lg">
                  <button 
                    onClick={() => onNavigate('landing')}
                    className="flex-1 py-3 px-6 border border-soft text-forest rounded-full font-semibold hover:bg-forest/5 transition-all text-sm"
                  >
                    Voltar ao Início
                  </button>
                  <button 
                    onClick={() => onNavigate('dashboard')}
                    className="flex-1 py-3 px-6 bg-warm text-forest border border-soft rounded-full font-semibold hover:bg-warm/80 transition-all text-sm"
                  >
                    Acessar Meu Painel
                  </button>
                </div>
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

                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
                
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
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Profissão / Atuação Principal *</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <select 
                            name="profissao"
                            value={
                              ["Psicólogo(a)", "Psicólogo(a) Clínico(a)", "Psicanalista", "Terapeuta", "Terapeuta Holístico(a)", "Psicopedagogo(a)"].includes(formData.profissao)
                                ? formData.profissao
                                : "Outro"
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val !== "Outro") {
                                setFormData(prev => ({ ...prev, profissao: val }));
                              }
                            }}
                            className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest"
                          >
                            <option value="Psicólogo(a)">Psicólogo(a)</option>
                            <option value="Psicólogo(a) Clínico(a)">Psicólogo(a) Clínico(a)</option>
                            <option value="Psicanalista">Psicanalista</option>
                            <option value="Terapeuta">Terapeuta</option>
                            <option value="Terapeuta Holístico(a)">Terapeuta Holístico(a)</option>
                            <option value="Psicopedagogo(a)">Psicopedagogo(a)</option>
                            <option value="Outro">Outra Profissão / Título</option>
                          </select>
                          <input 
                            name="profissao"
                            value={formData.profissao}
                            onChange={handleChange}
                            className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest" 
                            placeholder="Sua profissão (ex: Terapeuta, Psicanalista...)" 
                          />
                        </div>
                      </div>

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
                              <option value="2 a 4 horas/mês">2 a 4 horas/mês</option>
                              <option value="4 a 8 horas/mês">4 a 8 horas/mês</option>
                              <option value="10 a 16 horas/mês">10 a 16 horas/mês</option>
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
                          {/* Taxa Associativa Awareness Box */}
                          <div className="bg-amber-50/90 p-5 rounded-2xl border border-amber-200 flex flex-col gap-3.5 shadow-xs">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 text-forest font-bold text-sm">
                                <Wallet className="w-5 h-5 text-amber-800 shrink-0" />
                                <span>Taxa Associativa: R$ {taxaAssociativaMensal}/mês (Apenas Pós-Aprovação)</span>
                              </div>
                              <span className="px-2.5 py-0.5 bg-amber-200/80 text-amber-900 text-[10px] font-bold rounded-full uppercase shrink-0">
                                Inscrição Gratuita
                              </span>
                            </div>

                            <div className="bg-amber-100/60 p-3 rounded-xl border border-amber-300/50 text-xs text-amber-950 leading-relaxed font-medium">
                              📌 <strong>Regra de Cobrança Transparente:</strong> O preenchimento desta inscrição é <strong>100% gratuito</strong>. O valor da taxa associativa mensal (R$ {taxaAssociativaMensal}) <strong>NÃO</strong> é cobrado agora e <strong>só passará a ser devido após a realização da entrevista, aceite formal pela gestão e assinatura do contrato de parceria</strong>.
                            </div>

                            <div className="bg-white/90 p-3.5 rounded-xl border border-amber-200 text-xs text-forest/90 space-y-1.5">
                              <p className="font-bold text-[10px] uppercase tracking-wider text-amber-900 mb-1">
                                Benefícios incluídos após o aceite e assinatura do contrato:
                              </p>
                              <div className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span>Triagem ativa e encaminhamento direto de pacientes para atendimento</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span>Página profissional personalizada no catálogo oficial do projeto</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span>Suporte técnico, consultorias e respaldo institucional contínuo</span>
                              </div>
                              <div className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span>Rede de troca de serviços, supervisão e eventos exclusivos</span>
                              </div>
                            </div>

                            <label className="flex items-start gap-3 cursor-pointer mt-1 group">
                              <input 
                                type="checkbox" 
                                required
                                checked={cienciaTaxa}
                                onChange={(e) => setCienciaTaxa(e.target.checked)}
                                className="mt-1 w-5 h-5 rounded border-amber-300 text-forest focus:ring-amber-500/20 accent-forest cursor-pointer shrink-0"
                              />
                              <span className="text-xs font-semibold text-forest leading-relaxed">
                                Declaro estar ciente de que esta pré-inscrição é gratuita e que a taxa associativa mensal de R$ {taxaAssociativaMensal} só passará a ser cobrada após a realização da entrevista, o aceite formal da gestão para ingresso no projeto e a assinatura do contrato. *
                              </span>
                            </label>
                          </div>

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

      {/* Stripe Checkout Modal */}
      {showCheckoutModal && (
        <StripeCheckoutModal
          isOpen={showCheckoutModal}
          onClose={() => setShowCheckoutModal(false)}
          amountFormatted={taxaAssociativaMensal}
          professionalName={formData.nome || "Profissional Associado"}
          professionalEmail={formData.email}
          leadId={registeredLeadId}
        />
      )}
    </div>
  );
}
