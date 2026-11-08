import { ArrowLeft, Building2, CheckCircle2, ShieldCheck, Users, HeartHandshake, PhoneCall, ExternalLink, ArrowRight } from "lucide-react";
import React, { useState, useEffect, FormEvent } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { BrandLogo } from "../components/BrandLogo";
import { Footer } from "../components/Footer";
import { Breadcrumbs } from "../components/Breadcrumbs";
import faculdadeHero from "../assets/images/clinica_escola_hero_1794154749716.jpg";

export function FaculdadeLandingView({ onBack, onGoHome }: { onBack: () => void; onGoHome: () => void }) {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  const [nomeInstituicao, setNomeInstituicao] = useState("");
  const [tipoSetor, setTipoSetor] = useState("Clínica-Escola (SPA)");
  const [responsavelNome, setResponsavelNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [tipoParceria, setTipoParceria] = useState("Continuidade Pós-Clínica-Escola");
  const [observacoes, setObservacoes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!nomeInstituicao.trim() || !responsavelNome.trim() || !email.trim() || !telefone.trim()) {
      setErrorMsg("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "faculdade_leads"), {
        nomeInstituicao: nomeInstituicao.trim(),
        tipoSetor,
        responsavelNome: responsavelNome.trim(),
        cargo: cargo.trim(),
        email: email.trim().toLowerCase(),
        telefone: telefone.trim(),
        tipoParceria,
        observacoes: observacoes.trim(),
        status: "Novo Contato",
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
    } catch (err: any) {
      console.error("Erro ao enviar cadastro de parceria institucional:", err);
      setErrorMsg("Ocorreu um erro ao enviar sua solicitação. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden bg-warm">
      <nav className="h-16 sm:h-20 bg-white/70 backdrop-blur-md border-b border-soft px-3.5 sm:px-6 md:px-12 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button 
            onClick={onBack} 
            className="text-forest/70 hover:text-forest transition-colors p-2 -ml-2 rounded-full hover:bg-forest/5 cursor-pointer shrink-0"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <BrandLogo 
            size="md"
            badge="Faculdades & Clínicas-Escola"
            onClick={onGoHome}
          />
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center pb-16 w-full">
        <Breadcrumbs items={[{ label: "Início", onClick: onGoHome }, { label: "Faculdades & Clínicas-Escola", active: true }]} />
        
        {/* Hero Section */}
        <section className="w-full px-6 md:px-12 py-8 md:py-12 flex justify-center bg-white border-b border-soft">
          <div className="max-w-[1440px] w-full flex flex-col items-center justify-between gap-8">
            <div className="w-full relative rounded-3xl overflow-hidden p-6 sm:p-10 md:p-12 border border-soft/80 bg-warm shadow-md shadow-forest/5 min-h-[460px] flex items-center">
              <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[75%] md:w-[65%] lg:w-[58%] pointer-events-none select-none overflow-hidden z-0">
                <img
                  src={faculdadeHero}
                  alt="Alunos estagiários de psicologia com jaleco branco em atendimento clínico no SPA da faculdade"
                  className="w-full h-full object-cover object-[70%_center] sm:object-center opacity-70 sm:opacity-80 md:opacity-90 mix-blend-multiply filter contrast-115 saturate-105 transition-all duration-700"
                  referrerPolicy="no-referrer"
                />
                {/* Esmaecimento suave e calibrado em camadas (horizontal e vertical) */}
                <div className="absolute inset-0 bg-gradient-to-r from-warm/95 via-warm/70 sm:via-warm/45 md:via-warm/20 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-warm/85 sm:from-warm/80 via-transparent to-warm/20 sm:to-warm/30" />
                <div className="absolute inset-0 bg-gradient-to-b from-warm/30 sm:from-warm/40 via-transparent to-warm/30 sm:to-warm/40" />
              </div>

              <div className="relative z-10 w-full max-w-2xl flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 bg-sun-light text-forest text-[10px] font-bold uppercase tracking-[0.2em] rounded">
                    Parceria Institucional Gratuita
                  </span>
                  <span className="px-3 py-1 bg-white/90 border border-soft text-forest/75 text-[10px] font-semibold tracking-wider rounded">
                    Ética CFP · LGPD Garantida
                  </span>
                </div>

                <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl leading-[1.1] font-medium text-forest">
                  O semestre letivo termina,{" "}
                  <span className="italic font-normal block text-forest/85 text-xl sm:text-3xl md:text-4xl mt-2">
                    mas o cuidado clínico não pode parar.
                  </span>
                </h1>

                <p className="text-sm sm:text-base md:text-lg text-forest/85 leading-relaxed max-w-xl">
                  Oferecemos uma extensão ética de continuidade para Clínicas-Escola (SPAs), suporte ágil para Núcleos de Apoio ao Estudante (NAE/NAP) e o programa especializado do Tripé Formativo para estudantes de Psicologia e Terapia.
                </p>
              </div>
            </div>

            {/* 3 Pillars Grid */}
            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-white/95 backdrop-blur-md border border-soft rounded-3xl flex flex-col gap-3 shadow-sm hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-2xl bg-sun/20 border border-sun/40 flex items-center justify-center text-forest">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-bold text-lg text-forest">Continuidade Pós-Clínica-Escola</h3>
                <p className="text-xs sm:text-sm text-forest/75 leading-relaxed">
                  Evite o "buraco negro do encaminhamento" quando o ciclo de 6 meses na clínica da faculdade encerra ou entra em recesso. Transição humanizada para rede externa acessível.
                </p>
              </div>

              <div className="p-6 bg-white/95 backdrop-blur-md border border-soft rounded-3xl flex flex-col gap-3 shadow-sm hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-2xl bg-forest/10 border border-forest/20 flex items-center justify-center text-forest">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-bold text-lg text-forest">Apoio NAE / NAP & Fila de Espera</h3>
                <p className="text-xs sm:text-sm text-forest/75 leading-relaxed">
                  Desafogue a triagem da sua faculdade com encaminhamento rápido (resposta em até 24h) para universitários com ansiedade acadêmica, burnout e pressão com TCC.
                </p>
              </div>

              <div className="p-6 bg-white/95 backdrop-blur-md border border-soft rounded-3xl flex flex-col gap-3 shadow-sm hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-2xl bg-sun/20 border border-sun/40 flex items-center justify-center text-forest">
                  <HeartHandshake className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-bold text-lg text-forest">Tripé Formativo: Cuidar de Quem Vai Cuidar</h3>
                <p className="text-xs sm:text-sm text-forest/75 leading-relaxed">
                  Programa especial de terapia pessoal com valor social para estudantes de Psicologia e Psicanálise, com campo para selecionar preferência teórica de abordagem.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Partnership Form Section */}
        <section className="w-full px-6 md:px-12 py-16 flex justify-center relative">
          <div className="max-w-2xl w-full bg-white/95 backdrop-blur-md rounded-[36px] shadow-2xl shadow-forest/10 p-8 md:p-12 border border-white/80 relative z-10">
            {success ? (
              <div className="flex flex-col items-center text-center py-8">
                <div className="w-20 h-20 bg-sun-light rounded-full flex items-center justify-center text-forest mb-6">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h2 className="font-serif text-3xl font-medium text-forest mb-4">Solicitação Enviada com Sucesso!</h2>
                <p className="text-forest/70 max-w-md mb-8 leading-relaxed">
                  Agradecemos o contato em nome da instituição <strong>{nomeInstituicao}</strong>. Nossa coordenação acadêmica entrará em contato em até 24 horas para formalizar a parceria gratuita.
                </p>
                <button 
                  onClick={onGoHome}
                  className="px-8 py-3 bg-sun text-forest rounded-full font-semibold shadow-lg hover:bg-sun-dark transition-all cursor-pointer"
                >
                  Retornar à Página Inicial
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-forest/60 mb-1 block">Credenciamento Acadêmico</span>
                  <h2 className="font-serif text-3xl font-medium text-forest mb-2">Solicitar Parceria Institucional</h2>
                  <p className="text-forest/75 text-sm">
                    Preencha os dados abaixo para ativar o link digital de encaminhamento exclusivo para sua faculdade ou clínica-escola.
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-2xl font-medium">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-forest/70 mb-2">Nome da Instituição ou Faculdade *</label>
                    <input 
                      required
                      type="text"
                      value={nomeInstituicao}
                      onChange={(e) => setNomeInstituicao(e.target.value)}
                      placeholder="Ex: Universidade de São Paulo (USP) / Clínica-Escola SPA"
                      className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-forest/40 text-forest"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-forest/70 mb-2">Setor / Departamento *</label>
                      <select
                        value={tipoSetor}
                        onChange={(e) => setTipoSetor(e.target.value)}
                        className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-forest/40 text-forest"
                      >
                        <option value="Clínica-Escola (SPA)">Clínica-Escola (SPA)</option>
                        <option value="NAE / NAP (Apoio ao Estudante)">NAE / NAP (Apoio ao Estudante)</option>
                        <option value="Coordenação de Curso de Psicologia">Coordenação de Curso de Psicologia</option>
                        <option value="Instituto de Formação Terapêutica">Instituto de Formação Terapêutica</option>
                        <option value="Centro Acadêmico / Atlética">Centro Acadêmico / Atlética</option>
                        <option value="Outro Setor">Outro Setor</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-forest/70 mb-2">Tipo de Parceria Desejada *</label>
                      <select
                        value={tipoParceria}
                        onChange={(e) => setTipoParceria(e.target.value)}
                        className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-forest/40 text-forest"
                      >
                        <option value="Continuidade Pós-Clínica-Escola">Continuidade Pós-Clínica-Escola (6 meses/férias)</option>
                        <option value="Convênio Geral para Universitários">Convênio Geral para Universitários (NAE/NAP)</option>
                        <option value="Programa Tripé Formativo para Alunos">Tripé Formativo (Cuidar de Quem Vai Cuidar)</option>
                        <option value="Ecossistema Completo">Ecossistema Completo</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-forest/70 mb-2">Nome do Responsável *</label>
                      <input 
                        required
                        type="text"
                        value={responsavelNome}
                        onChange={(e) => setResponsavelNome(e.target.value)}
                        placeholder="Seu nome completo..."
                        className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-forest/40 text-forest"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-forest/70 mb-2">Cargo / Função *</label>
                      <input 
                        required
                        type="text"
                        value={cargo}
                        onChange={(e) => setCargo(e.target.value)}
                        placeholder="Ex: Coordenador(a), Supervisor(a)..."
                        className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-forest/40 text-forest"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-forest/70 mb-2">E-mail Institucional *</label>
                      <input 
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu.email@universidade.edu.br"
                        className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-forest/40 text-forest"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-forest/70 mb-2">WhatsApp / Telefone *</label>
                      <input 
                        required
                        type="text"
                        value={telefone}
                        onChange={(e) => setTelefone(e.target.value)}
                        placeholder="(11) 99999-9999"
                        className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-forest/40 text-forest"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-forest/70 mb-2">Observações ou Expectativas da Parceria</label>
                    <textarea 
                      rows={3}
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      placeholder="Conte-nos sobre o volume estimado de alunos ou pacientes..."
                      className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-forest/40 text-forest resize-none"
                    />
                  </div>

                  <button
                    disabled={isSubmitting}
                    type="submit"
                    className="w-full py-4 bg-forest hover:bg-forest/90 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    {isSubmitting ? "Enviando Solicitação..." : "Solicitar Parceria Institucional"} <ArrowRight className="w-5 h-5" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer onNavigate={onGoHome} />
    </div>
  );
}
