import React, { useEffect, useState } from "react";
import { ArrowLeft, User, Phone, MapPin, Calendar, Award, Heart, CheckCircle2, Instagram, Linkedin, Globe, Share2, BookOpen, Sparkles } from "lucide-react";
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import logoImage from '../assets/images/logo_acolhe.jpeg';
import { Breadcrumbs } from "../components/Breadcrumbs";
import { ArtigoBlog } from "../types/blog";
import { BlogCard } from "../components/BlogCard";

export function PublicProfProfileView({ 
  profUid, 
  onBack,
  onGoHome,
  onReadArtigo,
}: { 
  profUid: string; 
  onBack: () => void;
  onGoHome?: () => void;
  onReadArtigo?: (artigoId: string) => void;
}) {
  const [prof, setProf] = useState<any>(null);
  const [servicos, setServicos] = useState<any[]>([]);
  const [artigosProfissional, setArtigosProfissional] = useState<ArtigoBlog[]>([]);
  const [loading, setLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleGoHome = () => {
    try {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.pushState({}, "", cleanUrl);
    } catch (e) {
      console.error(e);
    }
    if (onGoHome) {
      onGoHome();
    } else if (onBack) {
      onBack();
    } else {
      window.location.href = window.location.origin;
    }
  };

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
    if (!prof) return;

    const originalTitle = document.title;
    const profissaoOuTitulo = prof.profissao || (prof.especialidade ? `Profissional - ${prof.especialidade}` : "Profissional de Saúde");
    const formattedTitle = `${prof.name} | ${profissaoOuTitulo} - Projeto AcolheMente`;

    document.title = formattedTitle;

    // Atualiza meta tags dinamicamente para compartilhamento e preview em redes sociais / WhatsApp
    const descriptionText = prof.bioCurta || (prof.biografia ? prof.biografia.slice(0, 150) + "..." : `Conheça o perfil profissional de ${prof.name} (${profissaoOuTitulo}) no Projeto AcolheMente Saúde.`);

    const metaMap: Record<string, { attr: string; val: string }> = {
      description: { attr: "name", val: descriptionText },
      "og:title": { attr: "property", val: `${prof.name} - ${profissaoOuTitulo}` },
      "og:description": { attr: "property", val: descriptionText },
      "og:type": { attr: "property", val: "profile" },
      "twitter:title": { attr: "name", val: `${prof.name} - ${profissaoOuTitulo}` },
      "twitter:description": { attr: "name", val: descriptionText },
    };

    if (prof.photoUrl) {
      metaMap["og:image"] = { attr: "property", val: prof.photoUrl };
      metaMap["twitter:image"] = { attr: "name", val: prof.photoUrl };
    }

    const createdElements: HTMLMetaElement[] = [];

    Object.entries(metaMap).forEach(([key, { attr, val }]) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
        createdElements.push(el);
      }
      el.setAttribute("content", val);
    });

    return () => {
      document.title = originalTitle;
      createdElements.forEach((el) => el.remove());
    };
  }, [prof]);

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

  // Carregar artigos publicados deste profissional
  useEffect(() => {
    if (!profUid) return;
    const qArtigos = query(
      collection(db, "artigos_blog"),
      where("autorUid", "==", profUid)
    );
    const unsubscribe = onSnapshot(
      qArtigos,
      (snapshot) => {
        const list: ArtigoBlog[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          if (data.status === "publicado") {
            list.push({
              id: docSnap.id,
              ...data,
            });
          }
        });
        setArtigosProfissional(list);
      },
      (err) => {
        console.error("Erro ao carregar artigos do profissional:", err);
      }
    );
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
          <div className="flex flex-col gap-3">
            <button 
              onClick={handleGoHome}
              className="w-full py-3 bg-forest text-white rounded-full font-semibold hover:bg-forest/90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar para Home / Tela Inicial
            </button>
            <button
              onClick={handleGoHome}
              className="w-full py-2.5 text-xs text-forest/70 hover:text-forest font-semibold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Conhecer o AcolheMente
            </button>
          </div>
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
      <header className="w-full max-w-4xl flex items-center justify-between mb-8 sm:mb-12 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button 
            onClick={handleGoHome}
            className="flex items-center gap-2 text-forest/70 hover:text-forest font-medium text-xs sm:text-sm transition-colors py-2 px-3.5 hover:bg-forest/5 rounded-full border border-forest/10 hover:border-forest/20 cursor-pointer"
            title="Voltar para a página inicial"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar para Home
          </button>
          <button 
            onClick={handleGoHome}
            className="hidden sm:inline-flex text-xs text-forest/60 hover:text-forest font-medium py-2 px-3 rounded-full hover:bg-forest/5 transition-colors cursor-pointer"
          >
            Tela Inicial
          </button>
        </div>

        <button 
          onClick={handleGoHome}
          className="flex items-center gap-3 hover:opacity-90 transition-all p-1.5 rounded-2xl hover:bg-forest/5 cursor-pointer text-left"
          title="Ir para a página principal do AcolheMente"
        >
          <div className="w-10 h-10 bg-sun rounded-full flex items-center justify-center text-forest overflow-hidden shrink-0 shadow-sm border border-forest/10">
             <img src={logoImage} alt="AcolheMente Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <span className="font-serif font-semibold text-sm sm:text-base tracking-tight text-forest block">AcolheMente</span>
            <span className="text-[10px] text-forest/60 block -mt-0.5">Saúde & Acolhimento</span>
          </div>
          <span className="text-[10px] sm:text-xs text-forest/70 px-2 py-0.5 rounded-full bg-forest/5 font-semibold border border-forest/10 ml-1">Parceiro</span>
        </button>
      </header>
      
      <Breadcrumbs 
        items={[
          { label: "Início", onClick: handleGoHome }, 
          { label: "Profissionais", onClick: handleGoHome },
          { label: prof ? `${prof.profissao || "Profissional"} ${prof.name}` : "Perfil do Profissional", active: true }
        ]} 
        className="max-w-4xl px-0 mb-6 w-full" 
      />

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
          
          <div className="flex flex-col gap-1 items-center w-full">
            <h1 className="font-serif text-2xl font-semibold leading-tight">{prof.name}</h1>
            <span className="text-xs uppercase tracking-wider font-bold text-sun-dark mt-1">
              {prof.profissao || "Profissional de Saúde"}
            </span>
            
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
                  const profissaoOuTitulo = prof.profissao || (prof.especialidade ? `Profissional - ${prof.especialidade}` : "Profissional de Saúde");
                  const shareTitle = `${prof.name} - ${profissaoOuTitulo}`;
                  const shareText = `Conheça o perfil profissional de ${prof.name} (${profissaoOuTitulo}) no Projeto AcolheMente Saúde.`;

                  if (navigator.share) {
                    navigator.share({
                      title: shareTitle,
                      text: shareText,
                      url: url,
                    }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(url).then(() => {
                      setCopySuccess(true);
                      setTimeout(() => setCopySuccess(false), 3000);
                    }).catch(e => console.error(e));
                  }
                }}
                className="p-2 bg-warm rounded-full text-forest/70 hover:text-forest hover:bg-soft transition-colors shadow-sm cursor-pointer relative" 
                title="Compartilhar Perfil"
              >
                <Share2 className="w-4 h-4" />
                {copySuccess && (
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-forest text-white text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap z-20 animate-fade-in">
                    Link copiado!
                  </span>
                )}
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

          {whatsAppUrl ? (
            <a 
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 px-2 bg-[#34A853] text-white rounded-xl font-bold uppercase tracking-wider text-[11px] shadow-md hover:bg-[#2e9449] hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-4 text-center leading-tight cursor-pointer"
            >
              <Phone className="w-5 h-5 shrink-0" /> Entre em contato e agende sua primeira sessão
            </a>
          ) : (
            <button
              onClick={() => {
                alert("Para agendar com este profissional ou iniciar o acolhimento, conheça o fluxo principal do projeto.");
                handleGoHome();
              }}
              className="w-full py-3.5 px-2 bg-forest text-white rounded-xl font-bold uppercase tracking-wider text-[11px] shadow-md hover:bg-forest/90 transition-all flex items-center justify-center gap-2 mt-4 text-center leading-tight cursor-pointer"
            >
              <Phone className="w-4 h-4 shrink-0" /> Iniciar Acolhimento pelo Projeto
            </button>
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
                  return (
                    <div key={`std-svc-${srv}`} className="p-5 rounded-2xl bg-warm/20 border border-soft/60 flex items-center hover:shadow-md transition-all">
                      <h4 className="font-serif text-base sm:text-lg font-bold text-forest leading-tight">
                        {srv === "Outros" ? `Outros: ${prof.outrosServicos || "Especifique"}` : srv}
                      </h4>
                    </div>
                  );
                })}

                {/* Serviços da coleção legado se houver */}
                {servicos.map((svc) => (
                  <div key={svc.id} className="p-5 rounded-2xl bg-warm/20 border border-soft/60 flex items-center hover:shadow-md transition-all">
                    <h4 className="font-serif text-base sm:text-lg font-bold text-forest leading-tight">{svc.nome}</h4>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seção Artigos & Publicações do Profissional */}
          {artigosProfissional.length > 0 && (
            <div className="bg-white p-6 sm:p-10 rounded-[2rem] border border-soft shadow-sm flex flex-col gap-6">
              <div className="flex items-center justify-between border-b border-soft/60 pb-4 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-6 h-6 text-sun-dark shrink-0" />
                  <div>
                    <h2 className="font-serif text-xl sm:text-2xl font-semibold">Artigos & Publicações</h2>
                    <p className="text-xs text-forest/60">Textos informativos e reflexões escritas por este profissional</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-3 py-1 bg-warm rounded-full text-forest/70 border border-soft">
                  {artigosProfissional.length} {artigosProfissional.length === 1 ? "artigo publicado" : "artigos publicados"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {artigosProfissional.map((artigo) => (
                  <BlogCard
                    key={artigo.id || artigo.titulo}
                    artigo={artigo}
                    onRead={(art) => {
                      try {
                        const url = new URL(window.location.href);
                        url.searchParams.set("artigo", art.id || "");
                        url.searchParams.delete("prof");
                        window.history.pushState({}, "", url.toString());
                      } catch (e) {
                        console.error(e);
                      }
                      if (onReadArtigo && art.id) {
                        onReadArtigo(art.id);
                      } else {
                        window.location.href = `${window.location.origin}?artigo=${art.id}`;
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Call-to-Action Footer for Platform */}
          <div className="bg-forest text-white p-6 sm:p-8 rounded-[2rem] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-serif text-lg sm:text-xl font-semibold mb-1">Dúvidas sobre o acolhimento?</h3>
              <p className="text-xs text-white/80 max-w-md">O Projeto AcolheMente conecta você a profissionais dedicados com escuta qualificada e valores sociais acessíveis.</p>
            </div>
            <button 
              onClick={handleGoHome}
              className="py-3.5 px-6 bg-white text-forest font-bold uppercase tracking-wider text-xs rounded-xl hover:bg-sun hover:text-forest hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap cursor-pointer shadow-md"
            >
              Conhecer o AcolheMente
            </button>
          </div>
          
        </div>

      </main>
      
      {/* Mini Branding Footer */}
      <footer className="w-full max-w-4xl text-center py-12 text-forest/60 text-xs flex flex-col items-center gap-2">
        <p>© {new Date().getFullYear()} Projeto AcolheMente Saúde - Uma iniciativa de Elo Soluções Humanas. Todos os direitos reservados.</p>
        <button 
          onClick={handleGoHome}
          className="text-xs text-forest/75 hover:text-forest font-medium underline underline-offset-4 cursor-pointer transition-colors"
        >
          Voltar para a página inicial do projeto
        </button>
      </footer>
    </div>
  );
}
