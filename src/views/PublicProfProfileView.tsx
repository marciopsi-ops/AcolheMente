import React, { useEffect, useState } from "react";
import { ArrowLeft, User, Phone, MapPin, Calendar, Award, Heart, CheckCircle2, Instagram, Linkedin, Globe, Share2 } from "lucide-react";
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import logoImage from '../assets/images/logo_acolhe.jpeg';
import { Breadcrumbs } from "../components/Breadcrumbs";

export function PublicProfProfileView({ profUid, onBack }: { profUid: string; onBack: () => void }) {
  const [prof, setProf] = useState<any>(null);
  const [servicos, setServicos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const snap = await getDoc(doc(db, "users", profUid));
        if (snap.exists()) {
          const data = snap.data();
          // Suppress inactive professional presentation
          if (data.role === 'profissional' && data.ativo !== false) {
            setProf(data);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar perfil público do profissional:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [profUid]);

  useEffect(() => {
    if (!profUid) return;
    const q = query(
      collection(db, "servicos_profissionais"),
      where("profissionalId", "==", profUid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setServicos(list);
    }, (err) => {
      console.error("Erro ao carregar serviços do profissional:", err);
    });
    return () => unsubscribe();
  }, [profUid]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FCFBF7] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 border-4 border-forest border-t-transparent rounded-full animate-spin"></div>
          <p className="text-forest/70 font-medium">Carregando apresentação do profissional...</p>
        </div>
      </div>
    );
  }

  if (!prof) {
    return (
      <div className="min-h-screen bg-[#FCFBF7] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-soft text-center">
          <Heart className="w-12 h-12 text-forest/40 mx-auto mb-4" />
          <h2 className="font-serif text-2xl font-medium text-forest mb-2">Perfil Indisponível</h2>
          <p className="text-forest/70 text-sm mb-6">Este profissional não está disponível ou o link está incorreto.</p>
          <button 
            onClick={onBack}
            className="w-full py-3 bg-forest text-white rounded-full font-semibold hover:bg-forest/90 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar para Home
          </button>
        </div>
      </div>
    );
  }

  // Pre-filled text for WhatsApp
  const cleanPhone = prof.telefone ? prof.telefone.replace(/\D/g, '') : '';
  const whatsAppUrl = cleanPhone 
    ? `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encodeURIComponent(`Olá, conheci seu perfil profissional no portal AcolheMente e gostaria de alinhar os próximos passos de nosso acompanhamento!`)}`
    : '';

  return (
    <div className="min-h-screen bg-[#FCFBF7] text-forest p-4 sm:p-6 md:p-8 flex flex-col items-center">
      {/* Header Banner */}
      <header className="w-full max-w-4xl flex items-center justify-between mb-8 sm:mb-12">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-forest/70 hover:text-forest font-medium text-xs sm:text-sm transition-colors py-2 px-3 hover:bg-forest/5 rounded-full"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para Home
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sun rounded-full flex items-center justify-center text-forest overflow-hidden shrink-0 shadow-sm">
             <img src={logoImage} alt="AcolheMente Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-serif font-semibold text-sm sm:text-base tracking-tight text-forest">AcolheMente</span>
          <span className="text-[10px] sm:text-xs text-forest/60 px-2 py-0.5 rounded-full bg-forest/5 font-semibold">Parceiro</span>
        </div>
      </header>
      
      <Breadcrumbs items={[{ label: "Início", onClick: onBack }, { label: prof ? `Psicólogo(a) ${prof.name}` : "Perfil do Psicólogo", active: true }]} className="max-w-4xl px-0 mb-6" />

      {/* Main Showcase Layout */}
      <main className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Column: Avatar and Quick Details */}
        <div className="md:col-span-1 bg-white p-6 sm:p-8 rounded-[2rem] border border-soft shadow-sm flex flex-col items-center text-center gap-6 h-fit">
          <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full overflow-hidden border-4 border-sun shadow-md relative bg-forest/10 flex-shrink-0 flex items-center justify-center">
            {prof.photoUrl ? (
              <img src={prof.photoUrl} alt={prof.name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-20 h-20 text-forest/70" />
            )}
          </div>
          
          <div className="flex flex-col gap-1 items-center">
            <h1 className="font-serif text-2xl font-semibold leading-tight">{prof.name}</h1>
            <span className="text-xs uppercase tracking-wider font-bold text-sun-dark mt-1">Psicólogo Clínico</span>
            
            {prof.bioCurta && (
              <p className="text-sm text-forest/80 italic mt-3 px-2 text-center">"{prof.bioCurta}"</p>
            )}

            <div className="flex gap-4 mt-4 items-center justify-center">
              {prof.instagramUrl && (
                <a href={prof.instagramUrl.startsWith('http') ? prof.instagramUrl : `https://${prof.instagramUrl}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-warm rounded-full text-forest/70 hover:text-forest hover:bg-soft transition-colors shadow-sm" title="Instagram">
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {prof.linkedinUrl && (
                <a href={prof.linkedinUrl.startsWith('http') ? prof.linkedinUrl : `https://${prof.linkedinUrl}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-warm rounded-full text-forest/70 hover:text-forest hover:bg-soft transition-colors shadow-sm" title="LinkedIn">
                  <Linkedin className="w-4 h-4" />
                </a>
              )}
              {prof.siteUrl && (
                <a href={prof.siteUrl.startsWith('http') ? prof.siteUrl : `https://${prof.siteUrl}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-warm rounded-full text-forest/70 hover:text-forest hover:bg-soft transition-colors shadow-sm" title="Website Pessoal">
                  <Globe className="w-4 h-4" />
                </a>
              )}
              <button 
                onClick={() => {
                  const url = `${window.location.origin}?prof=${profUid}`;
                  navigator.clipboard.writeText(url).then(() => {
                    alert("Link do perfil copiado com sucesso!");
                  }).catch(e => console.error(e));
                }}
                className="p-2 bg-warm rounded-full text-forest/70 hover:text-forest hover:bg-soft transition-colors shadow-sm" 
                title="Compartilhar Perfil"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            {prof.crp && (
              <span className="text-[10px] tracking-wide font-mono px-2.5 py-1 bg-warm rounded-md text-forest/70 border border-soft mt-3">
                CRP {prof.crp}
              </span>
            )}
          </div>

          <div className="w-full border-t border-soft/60 pt-4 flex flex-col gap-3 text-left self-start text-xs text-forest/80">
            {prof.especialidade && (
              <div className="flex items-start gap-2.5">
                <Award className="w-4 h-4 text-sun-dark shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[9px] font-bold uppercase text-forest/50">Abordagem / Especialidade</span>
                  <span className="font-medium">{prof.especialidade}</span>
                </div>
              </div>
            )}
            
            {(prof.cidade || prof.uf) && (
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-sun-dark shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[9px] font-bold uppercase text-forest/50">Localidade</span>
                  <span className="font-medium">{prof.cidade || ''}{prof.cidade && prof.uf ? `, ` : ''}{prof.uf || ''}</span>
                </div>
              </div>
            )}

            {prof.horasDisponiveis && (
              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-sun-dark shrink-0 mt-0.5" />
                <div>
                  <span className="block text-[9px] font-bold uppercase text-forest/50">Disponibilidade</span>
                  <span className="font-medium">{prof.horasDisponiveis}</span>
                </div>
              </div>
            )}
          </div>

          {whatsAppUrl && (
            <a 
              href={whatsAppUrl}
              target="_blank"
              rel="noopener referrer"
              className="w-full py-4 px-2 bg-[#34A853] text-white rounded-xl font-bold uppercase tracking-wider text-[11px] shadow-md hover:bg-[#2e9449] hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-4 text-center leading-tight"
            >
              <Phone className="w-5 h-5 shrink-0" /> Entre em contato e agende sua primeira sessão
            </a>
          )}
        </div>

        {/* Right Columns: Bio & Experience */}
        <div className="md:col-span-2 flex flex-col gap-6">
          
          {/* Main Biography Section */}
          <div className="bg-white p-6 sm:p-10 rounded-[2rem] border border-soft shadow-sm flex flex-col gap-6">
            <div className="flex items-center gap-3 border-b border-soft/60 pb-4">
              <Heart className="w-6 h-6 text-sun-dark shrink-0" />
              <h2 className="font-serif text-xl sm:text-2xl font-semibold">Sobre mim & Abordagem Técnica</h2>
            </div>
            
            {prof.biografia ? (
              <div className="text-sm sm:text-base leading-relaxed text-forest/80 whitespace-pre-line space-y-4">
                {prof.biografia}
              </div>
            ) : (
              <p className="text-sm text-forest/50 italic py-6">O profissional ainda não incluiu um mini-currículo.</p>
            )}

            {prof.motivacaoProjeto && (
              <>
                <div className="mt-4 flex items-center gap-3 border-b border-soft/60 pb-4">
                  <h2 className="font-serif text-xl sm:text-2xl font-semibold text-forest">Porque faço parte desse projeto?</h2>
                </div>
                <div className="text-sm sm:text-base leading-relaxed text-forest/80 whitespace-pre-line space-y-4">
                  {prof.motivacaoProjeto}
                </div>
              </>
            )}

            <div className="mt-6 pt-6 border-t border-soft/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex gap-3 items-start bg-warm/30 p-4 rounded-2xl border border-soft">
                <CheckCircle2 className="w-5 h-5 text-sun-dark shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-forest">Apoio Acolhedor</h4>
                  <p className="text-xs text-forest/70 mt-1">Sessões estruturadas para acolhimento preventivo, com escuta atenta e livre de julgamentos.</p>
                </div>
              </div>
              
              <div className="flex gap-3 items-start bg-warm/30 p-4 rounded-2xl border border-soft">
                <CheckCircle2 className="w-5 h-5 text-sun-dark shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-forest">Ética Profissional</h4>
                  <p className="text-xs text-forest/70 mt-1">Todos os atendimentos seguem as diretrizes éticas e de sigilo absoluto do Conselho de Psicologia.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Services Section */}
          <div className="bg-white p-6 sm:p-10 rounded-[2rem] border border-soft shadow-sm flex flex-col gap-6">
            <div className="flex items-center gap-3 border-b border-soft/60 pb-4">
              <Award className="w-6 h-6 text-sun-dark shrink-0" />
              <h2 className="font-serif text-xl sm:text-2xl font-semibold">Serviços Oferecidos</h2>
            </div>
            {(!prof.servicosOferecidos || prof.servicosOferecidos.length === 0) && servicos.length === 0 ? (
              <p className="text-sm text-forest/50 italic py-4">Este profissional ainda não especificou seus serviços individuais.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Serviços selecionados no formulário */}
                {prof.servicosOferecidos && prof.servicosOferecidos.map((srv: string) => {
                  const isAcessivel = prof.servicosOrcamentoAcessivel?.includes(srv);
                  return (
                    <div key={`std-svc-${srv}`} className="p-5 rounded-2xl bg-warm/20 border border-soft/60 flex flex-col gap-3 hover:shadow-md transition-all justify-between">
                      <div>
                        <h4 className="font-serif text-base sm:text-lg font-bold text-forest leading-tight">
                          {srv === "Outros" ? `Outros: ${prof.outrosServicos || "Especifique"}` : srv}
                        </h4>
                        <span className="inline-block mt-2 text-[10px] sm:text-xs font-semibold tracking-wider uppercase text-sun-dark bg-warm px-2.5 py-1 rounded-full">
                          Modalidade / Serviço
                        </span>
                      </div>
                      {isAcessivel && (
                        <div className="pt-2 border-t border-soft/40 flex items-center gap-1.5 text-xs text-emerald-700 font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          Disponível para orçamento acessível
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Serviços da coleção legado se houver */}
                {servicos.map((svc) => (
                  <div key={svc.id} className="p-5 rounded-2xl bg-warm/20 border border-soft/60 flex flex-col gap-3 hover:shadow-md transition-all justify-between">
                    <div>
                      <h4 className="font-serif text-base sm:text-lg font-bold text-forest leading-tight">{svc.nome}</h4>
                      <span className="inline-block mt-2 text-[10px] sm:text-xs font-semibold tracking-wider uppercase text-sun-dark bg-warm px-2.5 py-1 rounded-full">
                        {svc.publicoAlvo}
                      </span>
                    </div>
                    {svc.orcamentoAcessivel && (
                      <div className="pt-2 border-t border-soft/40 flex items-center gap-1.5 text-xs text-emerald-700 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        Disponível para orçamento acessível
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Call-to-Action Footer for Platform */}
          <div className="bg-forest text-white p-6 sm:p-8 rounded-[2rem] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-serif text-lg sm:text-xl font-semibold mb-1">Dúvidas sobre o tratamento?</h3>
              <p className="text-xs text-white/80 max-w-md">Nossa equipe interdisciplinar está em plantão constante para dirimir dúvidas administrativas ou técnicas.</p>
            </div>
            <button 
              onClick={onBack}
              className="py-3 px-6 bg-white text-forest font-bold uppercase tracking-wider text-xs rounded-xl hover:bg-white/95 hover:scale-[1.02] transition-all whitespace-nowrap"
            >
              Conhecer a AcolheMente
            </button>
          </div>
          
        </div>

      </main>
      
      {/* Mini Branding Footer */}
      <footer className="w-full max-w-4xl text-center py-12 text-forest/40 text-xs">
        <p>© {new Date().getFullYear()} Projeto AcolheMente Saúde - Uma iniciativa de Elo Soluções Humanas. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
