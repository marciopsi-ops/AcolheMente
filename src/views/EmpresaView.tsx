import { Footer } from '../components/Footer';
import { ArrowLeft, Briefcase, Building2, CheckCircle2, HeartHandshake, TrendingUp, Sparkles, UserCheck, Coins, ArrowRight, MessageCircle, BarChart3, ShieldCheck, Users, CalendarCheck } from "lucide-react";
import React, { FormEvent, useState, useEffect } from "react";
import { collection, addDoc, serverTimestamp, getDocs, query, where, doc, getDoc, onSnapshot } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { sendCompanyLeadEmail } from "../lib/emailService";
import { Breadcrumbs } from "../components/Breadcrumbs";

import empresaHero from '../assets/images/empresa_hero_photo_1781024092529.png';
import logoImage from '../assets/images/logo_acolhe.jpeg';

export function EmpresaView({ onNavigate }: { onNavigate: (view: 'landing' | 'acolhimento' | 'dashboard' | 'profile' | 'empresa') => void }) {
  const [formData, setFormData] = useState({
    nomeEmpresa: '',
    cnpj: '',
    ramoAtividade: '',
    local: '',
    colaboradores: '',
    contatoNome: '',
    contatoDepartamento: '',
    email: '',
    telefone: ''
  });
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [configs, setConfigs] = useState<any>({
    telefoneSuporte: "",
    footerTelefone: "",
  });

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      unsub = onSnapshot(
        doc(db, "configuracoes", "master"),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setConfigs((prev: any) => ({
              ...prev,
              ...data,
            }));
          }
        },
        (err) => {
          if (err.code !== 'permission-denied' && !err.message?.includes('offline')) {
            console.warn("Could not fetch realtime configs for EmpresaView:", err.message);
          }
        }
      );
    } catch (err: any) {
      console.warn("Error setting up configs listener for EmpresaView:", err);
    }
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const getWhatsAppUrl = () => {
    const rawPhone = configs.telefoneSuporte || configs.footerTelefone || "(61) 9999-9999";
    let cleanPhone = rawPhone.replace(/\D/g, "");
    if (!cleanPhone) cleanPhone = "556199999999";
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      cleanPhone = `55${cleanPhone}`;
    }
    const msg = "Olá! Sou representante de uma empresa e gostaria de falar com um consultor sobre o AcolheMente para empresas.";
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
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
      if (!formData.nomeEmpresa || !formData.cnpj || !formData.ramoAtividade) {
        setErrorMsg("Por favor, preencha todos os campos obrigatórios.");
        return;
      }
      setErrorMsg('');
      setStep(2);
      return;
    }

    if (step === 2) {
      if (!formData.local || !formData.colaboradores) {
        setErrorMsg("Por favor, preencha todos os campos obrigatórios.");
        return;
      }
      setErrorMsg('');
      setStep(3);
      return;
    }

    if (step === 3) {
      if (!formData.contatoNome || !formData.contatoDepartamento || !formData.email || !formData.telefone) {
        setErrorMsg("Por favor, preencha todos os campos obrigatórios.");
        return;
      }
      setIsSubmitting(true);
      setErrorMsg('');

      try {
        const q = query(collection(db, "empresa_leads"), where("email", "==", formData.email));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setErrorMsg("Este email já aparece em nossa triagem ou em nosso banco de dados.");
          setIsSubmitting(false);
          return;
        }

        await addDoc(collection(db, "empresa_leads"), {
          ...formData,
          notificacao: 'Nova empresa interessada.',
          createdAt: serverTimestamp()
        });

        try {
          await sendCompanyLeadEmail(formData.contatoNome, formData.nomeEmpresa, formData.email);
        } catch (emailErr) {
          console.error("Failed to send company confirmation email:", emailErr);
        }

        setIsSuccess(true);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, "empresa_leads");
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
          <button 
            onClick={() => {
              window.scrollTo({ top: 0, left: 0, behavior: "instant" });
              onNavigate('landing');
            }} 
            className="text-forest/70 hover:text-forest transition-colors p-2 -ml-2 rounded-full hover:bg-forest/5 cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-sun rounded-full flex items-center justify-center text-forest overflow-hidden shrink-0 shadow-sm">
               <img src={logoImage} alt="AcolheMente Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-serif text-2xl font-semibold tracking-tight text-forest">AcolheMente <span className="text-forest/70 font-medium opacity-70">Para Empresas</span></span>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center pb-16">
        <Breadcrumbs items={[{ label: "Início", onClick: () => onNavigate("landing") }, { label: "Para Empresas", active: true }]} />
        {/* Presentation Section */}
        <section className="w-full px-6 md:px-12 py-12 md:py-16 flex justify-center bg-warm text-forest border-b border-soft">
          <div className="max-w-[1440px] w-full flex flex-col items-center justify-between gap-8">
            {/* Hero Container com Imagem das Pessoas Fundida Atrás do Título */}
            <div className="w-full relative rounded-3xl overflow-hidden p-6 sm:p-10 md:p-12 border border-soft/80 bg-warm shadow-md shadow-forest/5">
              {/* Imagem das pessoas na empresa fundida atrás do texto (visível com nitidez e esmaecimento equilibrado) */}
              <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-0">
                <img
                  src={empresaHero}
                  alt="Equipe na empresa"
                  className="w-full h-full object-cover object-right md:object-[85%_35%] opacity-50 md:opacity-60 mix-blend-multiply filter contrast-115 saturate-105"
                  referrerPolicy="no-referrer"
                />
                {/* Esmaecimento suave nas bordas para preservar a presença visual das pessoas e o contraste do texto */}
                <div className="absolute inset-0 bg-gradient-to-r from-warm/90 via-warm/55 md:via-warm/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-warm/85 via-transparent to-warm/40" />
                <div className="absolute inset-0 bg-gradient-to-b from-warm/60 via-transparent to-warm/70" />
              </div>

              {/* Conteúdo sobreposto ao fundo fundido */}
              <div className="relative z-10 max-w-4xl flex flex-col gap-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 bg-sun-light text-forest text-[10px] font-bold uppercase tracking-[0.2em] rounded">
                    Soluções Modulares
                  </span>
                  <span className="px-3 py-1 bg-white/90 border border-soft text-forest/75 text-[10px] font-semibold tracking-wider rounded backdrop-blur-xs">
                    Compliance NR1 & Acolhimento
                  </span>
                </div>

                <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl leading-[1.1] font-medium text-forest drop-shadow-xs">
                  Cuidado que protege e transforma o ambiente de trabalho.
                </h1>

                <p className="text-base md:text-lg text-forest/85 leading-relaxed max-w-2xl">
                  Oferecemos <strong>dois nichos de soluções estratégicas</strong> que sua organização pode contratar de forma <strong>independente ou combinada</strong> — onde um complementa e potencializa o outro:
                </p>
              </div>
            </div>

            {/* Os 2 Pilares Executivos de Soluções Modulares */}
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-5 -mt-3">
              {/* Nicho 1 */}
              <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-soft hover:border-sun/60 shadow-md shadow-forest/5 hover:shadow-xl transition-all flex flex-col justify-between gap-4 group">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-forest/70 bg-warm px-3 py-1 rounded-full border border-soft">
                      Nicho 1 • Compliance
                    </span>
                    <div className="w-10 h-10 rounded-2xl bg-sun/20 flex items-center justify-center text-forest group-hover:bg-sun transition-colors">
                      <ShieldCheck className="w-5 h-5 text-forest" />
                    </div>
                  </div>
                  <h3 className="font-bold text-base md:text-lg text-forest leading-snug">
                    Adequação à NR1: do diagnóstico ao plano de ação
                  </h3>
                  <p className="text-sm text-forest/75 leading-relaxed">
                    Antecipe-se às exigências da NR1 implementando um programa efetivo de prevenção aos riscos psicossociais e evite multas e passivos trabalhistas por não conformidade através de nossas soluções.
                  </p>
                </div>
              </div>

              {/* Nicho 2 */}
              <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-soft hover:border-sun/60 shadow-md shadow-forest/5 hover:shadow-xl transition-all flex flex-col justify-between gap-4 group">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-forest/70 bg-warm px-3 py-1 rounded-full border border-soft">
                      Nicho 2 • Bem-Estar
                    </span>
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-800 group-hover:bg-emerald-200 transition-colors">
                      <HeartHandshake className="w-5 h-5 text-emerald-700" />
                    </div>
                  </div>
                  <h3 className="font-bold text-base md:text-lg text-forest leading-snug">
                    Canal de saúde e acolhimento ao colaborador e seus dependentes
                  </h3>
                  <p className="text-sm text-forest/75 leading-relaxed">
                    Mais que um benefício corporativo, colaboradores com acesso à psicoterapia com psicólogos e terapeutas engajados é um cuidado estratégico que garante apoio emocional à sua equipe, blindando a empresa e valorizando as pessoas.
                  </p>
                </div>
              </div>
            </div>

            {/* Tarja de Flexibilidade de Contratação + CTA WhatsApp */}
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-white/90 backdrop-blur-sm border border-soft rounded-2xl shadow-sm">
              <div className="flex items-start sm:items-center gap-3 text-xs md:text-sm text-forest/80 max-w-2xl">
                <Sparkles className="w-5 h-5 text-sun-dark shrink-0 mt-0.5 sm:mt-0" />
                <p className="leading-relaxed">
                  <strong>Contratação flexível e modular:</strong> A empresa tem a liberdade de contratar ambos os serviços para um ecossistema completo de ponta a ponta, ou contratar apenas um deles conforme a necessidade prioritária do momento.
                </p>
              </div>
              <div className="relative group shrink-0 w-full sm:w-auto">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#25D366]/40 to-emerald-400/40 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <a
                  href={getWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative px-7 py-3.5 bg-[#25D366] hover:bg-[#1ebd5b] text-white rounded-full font-semibold shadow-lg shadow-[#25D366]/20 transition-all flex items-center justify-center gap-2.5 text-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
                >
                  <MessageCircle className="w-5 h-5" />
                  Falar com Consultor via WhatsApp
                </a>
              </div>
            </div>

            <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-8">
              <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-white/80 flex flex-col gap-3 shadow-lg shadow-forest/5 hover:shadow-xl hover:border-sun/40 hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-2xl bg-sun/15 border border-sun/30 flex items-center justify-center text-sun-dark group-hover:bg-sun group-hover:text-forest transition-colors duration-300">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg text-forest">Adequação à NR1</h3>
                <p className="text-sm text-forest/75 leading-relaxed">Mapeamento e prevenção ativa contra os riscos psicossociais no trabalho.</p>
              </div>

              <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-white/80 flex flex-col gap-3 shadow-lg shadow-forest/5 hover:shadow-xl hover:border-sun/40 hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-2xl bg-sun/15 border border-sun/30 flex items-center justify-center text-sun-dark group-hover:bg-sun group-hover:text-forest transition-colors duration-300">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg text-forest">Absenteísmo Zero</h3>
                <p className="text-sm text-forest/75 leading-relaxed">O bem-estar mental reduz faltas, afastamentos e impulsiona a produtividade.</p>
              </div>

              <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-white/80 flex flex-col gap-3 shadow-lg shadow-forest/5 hover:shadow-xl hover:border-sun/40 hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-2xl bg-sun/15 border border-sun/30 flex items-center justify-center text-sun-dark group-hover:bg-sun group-hover:text-forest transition-colors duration-300">
                  <HeartHandshake className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg text-forest">Retenção de Talentos</h3>
                <p className="text-sm text-forest/75 leading-relaxed">Equipes cuidadas e seguras têm maior satisfação e menor rotatividade.</p>
              </div>

              <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-white/80 flex flex-col gap-3 shadow-lg shadow-forest/5 hover:shadow-xl hover:border-sun/40 hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-2xl bg-sun/15 border border-sun/30 flex items-center justify-center text-sun-dark group-hover:bg-sun group-hover:text-forest transition-colors duration-300">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg text-forest">Indicadores Estratégicos</h3>
                <p className="text-sm text-forest/75 leading-relaxed">Métricas agregadas e anônimas sobre demandas emocionais para orientar o RH.</p>
              </div>

              <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-white/80 flex flex-col gap-3 shadow-lg shadow-forest/5 hover:shadow-xl hover:border-sun/40 hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-2xl bg-sun/15 border border-sun/30 flex items-center justify-center text-sun-dark group-hover:bg-sun group-hover:text-forest transition-colors duration-300">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg text-forest">Canal Seguro & Confidencial</h3>
                <p className="text-sm text-forest/75 leading-relaxed">Espaço protegido pelo CFP e LGPD, onde o colaborador busca apoio sem receio de exposição.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Mapa Mental do Cuidado Psicossocial / Como Funciona */}
        <section className="w-full px-6 md:px-12 py-16 bg-[#FAF8F5] flex justify-center border-b border-soft">
          <div className="max-w-4xl w-full flex flex-col items-center">
            <div className="text-center max-w-2xl mb-12 flex flex-col items-center gap-3">
              <span className="px-3 py-1 bg-sun-light text-forest text-[10px] font-bold uppercase tracking-[0.2em] w-fit rounded">
                Como Funciona na Prática
              </span>
              <h2 className="font-serif text-3xl md:text-4xl text-forest font-medium">
                Cuidado Psicossocial & Parceria Corporativa
              </h2>
              <p className="text-sm text-forest/80 leading-relaxed">
                Um modelo inteligente, seguro e confidencial que viabiliza o acesso da sua equipe a especialistas qualificados com condições acessíveis, sem custos de consultas para a empresa.
              </p>
            </div>

            {/* Mapa Mental Visual / Linha do Tempo com Glassmorphism & Hover Glow */}
            <div className="relative w-full grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Passo 1 */}
              <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-soft hover:border-sun/50 flex flex-col gap-4 relative shadow-md shadow-forest/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="absolute top-4 right-4 text-xs font-mono font-bold text-sun-dark bg-sun-light/70 px-2 py-0.5 rounded-full border border-sun/30">
                  Passo 1
                </div>
                <div className="w-10 h-10 bg-warm/70 text-forest rounded-2xl flex items-center justify-center font-bold group-hover:bg-sun/20 transition-colors">
                  <Building2 className="w-5 h-5 text-forest" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-forest mb-1">Parceria & Acesso</h4>
                  <p className="text-xs text-forest/70 leading-relaxed">
                    Sua empresa formaliza a parceria e disponibiliza o código corporativo exclusivo para colaboradores e seus dependentes.
                  </p>
                </div>
              </div>

              {/* Passo 2 */}
              <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-soft hover:border-sun/50 flex flex-col gap-4 relative shadow-md shadow-forest/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="absolute top-4 right-4 text-xs font-mono font-bold text-sun-dark bg-sun-light/70 px-2 py-0.5 rounded-full border border-sun/30">
                  Passo 2
                </div>
                <div className="w-10 h-10 bg-warm/70 text-forest rounded-2xl flex items-center justify-center font-bold group-hover:bg-sun/20 transition-colors">
                  <Users className="w-5 h-5 text-forest" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-forest mb-1">Rede de Especialistas</h4>
                  <p className="text-xs text-forest/70 leading-relaxed">
                    Com o código, o colaborador acessa o ambiente seguro da plataforma e escolhe livremente o especialista ideal.
                  </p>
                </div>
              </div>

              {/* Passo 3 */}
              <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-soft hover:border-sun/50 flex flex-col gap-4 relative shadow-md shadow-forest/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="absolute top-4 right-4 text-xs font-mono font-bold text-sun-dark bg-sun-light/70 px-2 py-0.5 rounded-full border border-sun/30">
                  Passo 3
                </div>
                <div className="w-10 h-10 bg-warm/70 text-forest rounded-2xl flex items-center justify-center font-bold group-hover:bg-sun/20 transition-colors">
                  <CalendarCheck className="w-5 h-5 text-forest" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-forest mb-1">Agendamento Direto</h4>
                  <p className="text-xs text-forest/70 leading-relaxed">
                    O contato e o agendamento são realizados diretamente com o profissional, com total sigilo e privacidade garantidos.
                  </p>
                </div>
              </div>

              {/* Passo 4 - Destaque das condições acessíveis com Glassmorphism Esmeralda */}
              <div className="bg-emerald-50/90 backdrop-blur-md p-6 rounded-3xl border border-emerald-200/80 flex flex-col gap-4 relative shadow-md shadow-emerald-700/10 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="absolute top-4 right-4 text-xs font-mono font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300/60 px-2 py-0.5 rounded-full">
                  Passo 4
                </div>
                <div className="w-10 h-10 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center font-bold shadow-xs">
                  <Coins className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-emerald-950 mb-1">Valores Acessíveis</h4>
                  <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                    Atendimento em <strong>faixas de valores acessíveis</strong> predeterminados, pagos diretamente pelo colaborador ao especialista — sem custos de consultas para a empresa.
                  </p>
                </div>
              </div>
            </div>

            {/* Aviso em Destaque */}
            <div className="mt-8 p-5 bg-white/90 backdrop-blur-md border border-soft rounded-2xl max-w-2xl w-full flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left shadow-sm">
              <div className="p-3 bg-sun-light rounded-full text-forest shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <p className="text-xs text-forest/80 leading-relaxed">
                <strong>Alinhamento Estratégico:</strong> Um modelo sustentável que elimina custos com consultas para a organização e viabiliza apoio psicológico humanizado com condições acessíveis para toda a equipe, atendendo plenamente à <strong>NR1</strong>.
              </p>
            </div>
          </div>
        </section>

        {/* Form Section with Glassmorphism and Depth */}
        <section className="w-full px-6 md:px-12 py-16 flex justify-center relative -mt-10">
          <div className="max-w-2xl w-full bg-white/95 backdrop-blur-md rounded-[36px] shadow-2xl shadow-forest/10 p-8 md:p-12 border border-white/80 relative overflow-hidden">
            {/* Subtle internal glow accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-sun/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            {isSuccess ? (
              <div className="flex flex-col items-center text-center py-10 animate-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-sun-dark-light/30 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-10 h-10 text-forest/70" />
                </div>
                <h2 className="font-serif text-3xl text-forest mb-4">Interesse Registrado!</h2>
                <p className="text-forest/70/80 max-w-md mx-auto mb-8 text-lg">
                  Nossa equipe de parcerias já recebeu seus dados e entrará em contato em até 24h para montar uma proposta ideal.
                </p>
                <button 
                  onClick={() => {
                    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
                    onNavigate('landing');
                  }}
                  className="px-8 py-4 bg-forest text-white rounded-full font-semibold hover:bg-forest/90 transition-all shadow-md cursor-pointer"
                >
                  Voltar para o Início
                </button>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h2 className="font-serif text-3xl font-medium text-forest mb-2">
                    {step === 1 && "Dados da Empresa"}
                    {step === 2 && "Porte e Localização"}
                    {step === 3 && "Contato Comercial"}
                  </h2>
                  <p className="text-forest/80 text-sm">
                    {step === 1 && "Informe o nome, CNPJ e atividade principal da empresa."}
                    {step === 2 && "Conte-nos sobre a sede e o tamanho da sua equipe."}
                    {step === 3 && "Dados da pessoa responsável para enviarmos a proposta."}
                  </p>
                  
                  <div className="flex gap-2 mt-6">
                    {Array.from({ length: 3 }).map((_, idx) => (
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
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Nome da Empresa *</label>
                        <input 
                          required 
                          name="nomeEmpresa"
                          value={formData.nomeEmpresa}
                          onChange={handleChange}
                          className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest" 
                          placeholder="Ex: Minha Empresa LTDA" 
                        />
                      </div>

                      {formData.nomeEmpresa.trim().length >= 3 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500 border-t border-soft pt-6">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">CNPJ *</label>
                            <input 
                              required 
                              name="cnpj"
                              value={formData.cnpj}
                              onChange={handleChange}
                              className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest" 
                              placeholder="00.000.000/0001-00" 
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Ramo de Atividade *</label>
                            <select 
                              required 
                              name="ramoAtividade"
                              value={formData.ramoAtividade}
                              onChange={handleChange}
                              className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest appearance-none" 
                            >
                              <option value="">Selecione...</option>
                              <option value="Tecnologia">Tecnologia</option>
                              <option value="Saúde">Saúde</option>
                              <option value="Varejo">Varejo / Comércio</option>
                              <option value="Indústria">Indústria</option>
                              <option value="Serviços">Serviços</option>
                              <option value="Educação">Educação</option>
                              <option value="Outros">Outros</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {step === 2 && (
                    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Local / Sede *</label>
                        <input 
                          required 
                          name="local"
                          value={formData.local}
                          onChange={handleChange}
                          className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest" 
                          placeholder="Ex: São Paulo, SP" 
                        />
                      </div>

                      {formData.local.trim().length >= 3 && (
                        <div className="flex flex-col gap-1 animate-in fade-in duration-500 border-t border-soft pt-6">
                          <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Quantidade de colaboradores (não contar terceiros) *</label>
                          <select 
                            required 
                            name="colaboradores"
                            value={formData.colaboradores}
                            onChange={handleChange}
                            className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest appearance-none" 
                          >
                            <option value="">Selecione...</option>
                            <option value="1 a 10">1 a 10 pessoas</option>
                            <option value="11 a 50">11 a 50 pessoas</option>
                            <option value="51 a 200">51 a 200 pessoas</option>
                            <option value="Mais de 200">Mais de 200 pessoas</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {step === 3 && (
                    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Nome do Contato *</label>
                          <input 
                            required 
                            name="contatoNome"
                            value={formData.contatoNome}
                            onChange={handleChange}
                            className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest" 
                            placeholder="Ex: João Silva" 
                          />
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">Departamento *</label>
                          <input 
                            required 
                            name="contatoDepartamento"
                            value={formData.contatoDepartamento}
                            onChange={handleChange}
                            className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest" 
                            placeholder="Ex: RH / Benefícios" 
                          />
                        </div>
                      </div>

                      {formData.contatoNome.trim().length >= 3 && formData.contatoDepartamento.trim().length >= 3 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500 border-t border-soft pt-6">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-forest/70 ml-2">E-mail Corporativo *</label>
                            <input 
                              required 
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleChange}
                              className="px-5 py-4 bg-warm/50 border border-soft rounded-2xl focus:outline-none focus:border-sun-dark focus:bg-white transition-all text-sm text-forest" 
                              placeholder="contato@empresa.com" 
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

                      {formData.contatoNome.trim().length >= 3 && formData.contatoDepartamento.trim().length >= 3 && formData.email.includes('@') && formData.telefone.trim().length >= 4 && (
                        <div className="flex flex-col gap-6 animate-in fade-in duration-500 border-t border-soft pt-6">
                          <label className="flex items-start gap-3 cursor-pointer group">
                            <input 
                              type="checkbox" 
                              required 
                              className="mt-1 w-5 h-5 rounded border-soft text-sun-dark focus:ring-sun-dark/20 accent-sun-dark cursor-pointer"
                            />
                            <span className="text-xs text-forest/70 leading-relaxed">
                              <strong>Privacidade e LGPD:</strong> Estou ciente e concordo que os dados corporativos e de contato fornecidos serão tratados de forma sigilosa para fins de proposta e comunicação comercial, conforme a Lei Geral de Proteção de Dados (LGPD).
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
                        className="flex-1 py-4 px-6 border border-soft text-forest hover:bg-forest/5 rounded-full font-semibold transition-all text-center cursor-pointer active:scale-[0.99]"
                      >
                        Voltar
                      </button>
                    )}
                    
                    <div className="flex-1 relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-forest/30 via-sun/20 to-forest/30 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      <button 
                        disabled={isSubmitting}
                        type="submit" 
                        className="w-full relative py-4 px-6 bg-forest text-white rounded-full font-semibold shadow-lg shadow-forest/15 hover:bg-forest/90 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                      >
                        {step < 3 ? "Avançar" : (isSubmitting ? "Enviando..." : "Solicitar Proposta")}
                      </button>
                    </div>
                  </div>

                  <p className="text-center text-[11px] text-forest/70/60 uppercase tracking-widest font-semibold mt-2">
                    Garantimos o sigilo de todas as informações.
                  </p>
                </form>
              </>
            )}
          </div>
        </section>
      </main>
      <Footer onNavigate={onNavigate} />
      
      {/* Floating WhatsApp Button */}
      <a 
        href={getWhatsAppUrl()} 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-[#25D366] hover:bg-[#1ebd5b] text-white p-4 rounded-full shadow-lg shadow-[#25D366]/20 transition-all flex items-center justify-center group z-50 animate-in slide-in-from-bottom-5 duration-500 hover:scale-110"
        title="Falar com um consultor via WhatsApp"
      >
        <MessageCircle className="w-6 h-6 mr-0 group-hover:mr-3 transition-all" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 font-medium text-sm">
          Quero falar com um consultor
        </span>
      </a>
    </div>
  );
}
