import React, { useEffect, useState } from "react";
import { ArrowLeft, Calendar, Clock, CreditCard, User, Phone, Mail, CheckCircle2, Share2, Heart, ExternalLink, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import logoImage from "../assets/images/logo_acolhe.jpeg";

interface PublicServiceViewProps {
  serviceId?: string | null;
  eventId?: string | null;
  onBack: () => void;
}

export function PublicServiceView({ serviceId, eventId, onBack }: PublicServiceViewProps) {
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<any>(null);
  const [isEvent, setIsEvent] = useState(false);
  const [showInscribeForm, setShowInscribeForm] = useState(false);
  const [inscribed, setInscribed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form states for guest inscription
  const [guestForm, setGuestForm] = useState({
    nome: "",
    contato: "",
    mensagem: "",
  });

  useEffect(() => {
    async function fetchItem() {
      try {
        const id = serviceId || eventId;
        if (!id) return;
        
        const isEv = !!eventId;
        setIsEvent(isEv);
        
        const collectionName = isEv ? "eventos" : "servicos";
        const docRef = doc(db, collectionName, id);
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
          setItem({ id: snap.id, ...snap.data() });
        }
      } catch (err) {
        console.error("Erro ao carregar detalhes públicos:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchItem();
  }, [serviceId, eventId]);

  const handleShare = () => {
    const isEv = !!eventId;
    const url = isEv 
      ? `${window.location.origin}?evento=${eventId}`
      : `${window.location.origin}?servico=${serviceId}`;
    
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }).catch(err => {
      console.error("Erro ao copiar link:", err);
    });
  };

  const handleInscribeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestForm.nome || !guestForm.contato) {
      alert("Por favor, preencha seu nome e contato.");
      return;
    }
    setInscribed(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FCFBF7] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 border-4 border-forest border-t-transparent rounded-full animate-spin"></div>
          <p className="text-forest/70 font-medium">Carregando detalhes...</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-[#FCFBF7] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white rounded-[2rem] p-8 shadow-xl border border-soft text-center">
          <Heart className="w-12 h-12 text-forest/40 mx-auto mb-4" />
          <h2 className="font-serif text-2xl font-medium text-forest mb-2">Publicação não encontrada</h2>
          <p className="text-forest/70 text-sm mb-6">Este serviço ou evento não está disponível ou já foi encerrado.</p>
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

  return (
    <div className="min-h-screen bg-[#FCFBF7] text-forest p-4 sm:p-6 md:p-8 flex flex-col items-center">
      {/* Absolute top navbar */}
      <header className="w-full max-w-4xl flex items-center justify-between mb-8 sm:mb-12">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-forest/70 hover:text-forest font-medium text-xs sm:text-sm transition-colors py-2 px-3 hover:bg-forest/5 rounded-full"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para Home
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full overflow-hidden shrink-0">
             <img src={logoImage} alt="AcolheMente Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-serif font-semibold text-sm sm:text-base tracking-tight">AcolheMente</span>
          <span className="text-[10px] sm:text-xs text-forest/60 px-2 py-0.5 rounded-full bg-forest/5 font-semibold">Parceiro</span>
        </div>
      </header>

      {/* Main Single-View Content Wrapper */}
      <main className="w-full max-w-2xl bg-white rounded-[2.5rem] border border-soft shadow-xl overflow-hidden flex flex-col slide-up">
        
        {/* Banner/Header of the Offer */}
        <div className="bg-warm/40 p-8 sm:p-10 border-b border-soft flex flex-col gap-4 relative">
          
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
              isEvent 
                ? "bg-amber-50 text-amber-700 border border-amber-200"
                : "bg-purple-50 text-purple-700 border border-purple-200"
            }`}>
              {isEvent ? (item.tipo || "Evento") : (item.tipo || "Serviço")}
            </span>

            <button 
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-soft text-forest/70 hover:bg-forest hover:text-white transition-all text-xs font-semibold"
            >
              <Share2 className="w-3.5 h-3.5" />
              {copied ? "Link Copiado!" : "Compartilhar"}
            </button>
          </div>

          <h1 className="font-serif text-2xl sm:text-3.5xl font-semibold leading-tight text-forest tracking-tight">
            {item.titulo}
          </h1>

          {/* Quick Schedule Details */}
          <div className="flex items-center gap-4 flex-wrap text-xs text-forest/60 mt-2 font-medium">
            {item.data && (
              <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-soft/50">
                <Calendar className="w-4 h-4 text-forest/50" /> {item.data}
              </span>
            )}
            {item.hora && (
              <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-soft/50">
                <Clock className="w-4 h-4 text-forest/50" /> {item.hora}
              </span>
            )}
            {!isEvent && (
              <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-soft/50">
                <CreditCard className="w-4 h-4 text-forest/50" /> 
                <span className={item.isGratuito ? "text-emerald-600 font-bold" : ""}>
                  {item.isGratuito ? "Gratuito" : (item.valor || "Sob consulta")}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Dynamic Body Description */}
        <div className="p-8 sm:p-10 flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h3 className="text-xs uppercase tracking-wider font-bold text-forest/50 border-b border-soft pb-2">
              Descrição da Oportunidade
            </h3>
            <p className="text-sm sm:text-base text-forest/80 leading-relaxed whitespace-pre-wrap font-sans">
              {item.descricao}
            </p>
          </div>

          {/* Publisher block */}
          <div className="bg-[#FDFBF7] p-5 rounded-2xl border border-soft flex items-center justify-between gap-4 mt-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-forest/10 border-2 border-sun flex items-center justify-center shrink-0">
                {item.criadorFoto ? (
                  <img src={item.criadorFoto} alt={item.criadorNome} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-forest/70" />
                )}
              </div>
              <div>
                <span className="block text-[10px] text-forest/50 leading-none uppercase font-bold tracking-wider mb-1">Publicado por</span>
                <span className="font-serif font-semibold text-sm leading-snug">{item.criadorNome || "Profissional Parceiro"}</span>
              </div>
            </div>

            {item.criadorId && (
              <a 
                href={`${window.location.origin}?prof=${item.criadorId}`}
                target="_blank" 
                rel="noopener noreferrer" 
                className="px-3.5 py-1.5 bg-white hover:bg-forest hover:text-white transition-all text-[11px] font-bold text-forest rounded-xl border border-soft inline-flex items-center gap-1 shrink-0"
              >
                Ver Perfil <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Subscription Section */}
          <div className="mt-4 pt-6 border-t border-soft flex flex-col gap-4">
            
            {!inscribed ? (
              <>
                {!showInscribeForm ? (
                  <button 
                    onClick={() => {
                      if (item.linkInscricao) {
                        window.open(item.linkInscricao, "_blank", "noopener,noreferrer");
                      } else {
                        setShowInscribeForm(true);
                      }
                    }}
                    className="w-full py-4 bg-forest text-white rounded-full font-serif font-medium text-base hover:bg-forest/95 transition-all shadow-md shadow-forest/15 hover:shadow-lg flex items-center justify-center gap-2"
                  >
                    {item.linkInscricao ? "Acessar Link Externo de Inscrição" : "Iniciar Inscrição na Oportunidade"}
                  </button>
                ) : (
                  <form onSubmit={handleInscribeSubmit} className="bg-warm/20 border border-soft p-6 sm:p-8 rounded-[1.8rem] flex flex-col gap-4 animate-[scaleUp_0.2s_ease-out]">
                    <div className="flex items-center justify-between">
                      <h4 className="font-serif text-lg font-bold text-forest">Formulário de Inscrição</h4>
                      <button 
                        type="button" 
                        onClick={() => setShowInscribeForm(false)}
                        className="text-xs text-forest/50 hover:text-forest underline"
                      >
                        Cancelar
                      </button>
                    </div>

                    <p className="text-xs text-forest/60">
                      Preencha os campos abaixo para que o profissional responsável possa validar sua inscrição.
                    </p>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-forest/50">Seu Nome Completo *</label>
                      <input 
                        type="text" 
                        required
                        value={guestForm.nome}
                        onChange={(e) => setGuestForm(prev => ({ ...prev, nome: e.target.value }))}
                        placeholder="Ex: Dra. Larissa Mello"
                        className="w-full p-3 bg-white border border-soft text-xs text-forest rounded-xl focus:outline-none focus:border-forest/50"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-forest/50 font-sans">Seu Contato (WhatsApp ou E-mail) *</label>
                      <input 
                        type="text" 
                        required
                        value={guestForm.contato}
                        onChange={(e) => setGuestForm(prev => ({ ...prev, contato: e.target.value }))}
                        placeholder="Ex: (11) 98765-4321 ou larissa@email.com"
                        className="w-full p-3 bg-white border border-soft text-xs text-forest rounded-xl focus:outline-none focus:border-forest/50"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-forest/50">Mensagem Curta (Opcional)</label>
                      <textarea 
                        value={guestForm.mensagem}
                        onChange={(e) => setGuestForm(prev => ({ ...prev, mensagem: e.target.value }))}
                        placeholder="Escreva alguma observação ou dúvida..."
                        rows={2}
                        className="w-full p-3 bg-white border border-soft text-xs text-forest rounded-xl focus:outline-none focus:border-forest/50 resize-hidden"
                      />
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-3 bg-forest text-white rounded-full font-serif font-semibold text-sm hover:bg-forest/90 transition-colors mt-2"
                    >
                      Confirmar Envio da Inscrição
                    </button>
                  </form>
                )}
              </>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-6 rounded-2xl flex flex-col gap-4 text-center items-center animate-[scaleUp_0.3s_ease-out]">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                <div>
                  <h4 className="font-serif text-lg font-bold">Solicitação Enviada!</h4>
                  <p className="text-xs mt-1 text-emerald-700 max-w-sm mx-auto leading-relaxed">
                    Sua inscrição foi confirmada temporariamente. Envie o comprovante ou uma mensagem de confirmação para o contato do profissional abaixo:
                  </p>
                </div>

                <div className="bg-white/80 p-4 rounded-xl border border-emerald-100 text-left w-full max-w-md text-xs text-forest/80 flex flex-col gap-1 font-mono">
                  <span className="font-bold underline block mb-1">Próximos Passos Obrigatórios:</span>
                  <div>• Entrar em contato via: <span className="font-bold select-all">{item.criadorContato || "Contato privado"}</span></div>
                  {!isEvent && (item.criadorPixKey || item.valor) && (
                    <div className="mt-2 text-amber-800 bg-amber-50/50 p-2 border border-amber-200 rounded">
                      <span className="font-bold block text-[10px] uppercase tracking-wider mb-1">Informações PIX para Pagamento:</span>
                      • Valor: <span className="font-bold">{item.isGratuito ? "Gratuito" : (item.valor || "A combinar")}</span><br />
                      • Chave PIX: <span className="font-bold select-all">{item.criadorPixKey || "Informada no contato"}</span>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => {
                    setInscribed(false);
                    setShowInscribeForm(false);
                    setGuestForm({ nome: "", contato: "", mensagem: "" });
                  }}
                  className="text-xs text-emerald-800 font-bold underline hover:text-emerald-950 mt-1"
                >
                  Fazer outra inscrição
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Apelo para profissionais externos */}
      <div className="w-full max-w-2xl mt-8 bg-gradient-to-br from-forest to-forest/90 text-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-forest/10 flex flex-col md:flex-row items-center justify-between gap-6 slide-up">
        <div className="flex items-start gap-4 text-left">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20 shadow-sm mt-0.5">
            <Sparkles className="w-6 h-6 text-sun" />
          </div>
          <div>
            <h4 className="font-serif text-lg font-bold text-white leading-snug">Você é profissional de Psicologia ou Terapia?</h4>
            <p className="text-xs text-white/85 mt-2 max-w-md leading-relaxed font-sans">
              Junte-se de forma voluntária ou crie seus próprios eventos e serviços clínicos no <strong>AcolheMente</strong>. Apoie nosso ecossistema e faça a diferença para quem mais precisa.
            </p>
          </div>
        </div>
        <button
          onClick={onBack}
          className="w-full md:w-auto px-6 py-2.5 bg-white hover:bg-sun text-forest font-bold rounded-full text-xs uppercase tracking-wider transition-colors shrink-0 flex items-center justify-center gap-1.5 shadow-md hover:scale-[1.02] active:scale-[0.98] duration-250"
        >
          Fazer Parte do Projeto <ArrowRight className="w-4 h-4 text-forest" />
        </button>
      </div>

      {/* Safety Badge footer */}
      <footer className="mt-8 flex items-center gap-2 text-[11px] text-forest/40">
        <ShieldCheck className="w-4 h-4 text-forest/30" />
        <span>AcolheMente Plataforma Solidária • Ambiente Seguro e Auditado</span>
      </footer>
    </div>
  );
}
