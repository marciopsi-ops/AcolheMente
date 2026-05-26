import { Footer } from '../components/Footer';
import { ArrowLeft, Briefcase, Building2, CheckCircle2, HeartHandshake, TrendingUp } from "lucide-react";
import React, { FormEvent, useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";

import empresaHero from '../assets/images/empresa_hero_1779248461788.png';

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
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await addDoc(collection(db, "empresa_leads"), {
        ...formData,
        notificacao: 'Nova empresa interessada.',
        createdAt: serverTimestamp()
      });
      setIsSuccess(true);
    } catch (error) {
      setErrorMsg(handleFirestoreError(error, OperationType.WRITE));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-warm overflow-y-auto">
      {/* Header */}
      <nav className="h-20 bg-white/50 backdrop-blur-md border-b border-soft px-6 md:px-12 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => onNavigate('landing')} className="text-forest/70 hover:text-forest transition-colors p-2 -ml-2 rounded-full hover:bg-forest/5">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <span className="font-serif text-2xl font-semibold tracking-tight text-forest">AcolheMente <span className="text-forest/70 font-medium opacity-70">Para Empresas</span></span>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center pb-16">
        {/* Presentation Section */}
        <section className="w-full px-6 md:px-12 py-12 md:py-16 flex justify-center bg-warm text-forest border-b border-soft">
          <div className="max-w-[1440px] w-full flex flex-col items-center justify-between gap-8">
            <div className="w-full flex flex-col lg:flex-row gap-8 items-center justify-between">
              <div className="w-full lg:w-1/2 flex flex-col gap-6">
                <div className="mb-2 px-3 py-1 bg-sun-light text-forest text-[10px] font-bold uppercase tracking-[0.2em] w-fit rounded">
                  Prevenção e Compliance (NR1)
                </div>
                <h1 className="font-serif text-5xl md:text-6xl leading-[1.1] font-medium text-forest">
                  Cuidado que protege e transforma o ambiente de trabalho.
                </h1>
                <p className="text-lg text-forest/80 leading-relaxed max-w-lg mt-4">
                  Antecipe-se às exigências da <strong>NR1</strong> implementando um programa efetivo de prevenção aos riscos psicossociais e <strong>evite multas e passivos trabalhistas</strong> por não conformidade. Mais do que um benefício (como um "Gympass da Mente"), é um cuidado estratégico que garante apoio emocional e psicológico à sua equipe, blindando a empresa e valorizando as pessoas.
                </p>
              </div>
              <div className="w-full lg:w-1/2 flex justify-center lg:justify-end">
                 <img src={empresaHero} alt="Ilustração Empresa e RH" className="w-full max-w-lg object-contain rounded-3xl mix-blend-multiply" referrerPolicy="no-referrer" />
              </div>
            </div>
            
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
              <div className="bg-white p-6 rounded-3xl border border-soft flex flex-col gap-3 shadow-sm shadow-sun-dark/5">
                <Building2 className="w-8 h-8 text-sun-dark" />
                <h3 className="font-semibold text-lg text-forest">Adequação à NR1</h3>
                <p className="text-sm text-forest/70">Mapeamento e prevenção ativa contra os riscos psicossociais no trabalho.</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-soft flex flex-col gap-3 shadow-sm shadow-sun-dark/5">
                <TrendingUp className="w-8 h-8 text-sun-dark" />
                <h3 className="font-semibold text-lg text-forest">Absenteísmo Zero</h3>
                <p className="text-sm text-forest/70">O bem-estar mental reduz faltas, afastamentos e impulsiona a produtividade.</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-soft flex flex-col gap-3 shadow-sm shadow-sun-dark/5">
                <HeartHandshake className="w-8 h-8 text-sun-dark" />
                <h3 className="font-semibold text-lg text-forest">Retenção de Talentos</h3>
                <p className="text-sm text-forest/70">Equipes cuidadas e seguras têm maior satisfação e menor rotatividade.</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-soft flex flex-col gap-3 shadow-sm shadow-sun-dark/5">
                <Briefcase className="w-8 h-8 text-sun-dark" />
                <h3 className="font-semibold text-lg text-forest">Carga Otimizada</h3>
                <p className="text-sm text-forest/70">Planos flexíveis com excelente custo-benefício para subsidiar sua operação.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Form Section */}
        <section className="w-full px-6 md:px-12 py-16 flex justify-center relative -mt-10">
          <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl shadow-forest/5 p-8 md:p-12 border border-soft">
            {isSuccess ? (
              <div className="flex flex-col items-center text-center py-10 animate-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-sun-dark-light/30 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-10 h-10 text-forest/70" />
                </div>
                <h2 className="font-serif text-3xl text-forest mb-4">Interesse Registrado!</h2>
                <p className="text-forest/70/80 max-w-md mx-auto mb-8 text-lg">
                  Nossa equipe de parcerias já recebeu seus dados e entrará em contato em até 1 dia útil para montar uma proposta ideal.
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
                <div className="text-center mb-10">
                  <h2 className="font-serif text-3xl font-medium text-forest mb-3">Seja uma parceira</h2>
                  <p className="text-forest/70/80 text-sm">
                    Preencha o formulário abaixo para agendarmos uma conversa sem compromisso e apresentarmos nossa plataforma.
                  </p>
                </div>

                {errorMsg && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm text-center">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    
                    <div className="flex flex-col gap-1">
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
                  </div>

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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                  <button 
                    disabled={isSubmitting}
                    type="submit" 
                    className="w-full py-5 px-8 mt-4 bg-forest text-white rounded-full font-semibold shadow-md hover:bg-forest/90 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Enviando...' : 'Solicitar Proposta'}
                  </button>
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
    </div>
  );
}
