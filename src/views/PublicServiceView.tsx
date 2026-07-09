import React, { useEffect, useState } from "react";
import { ArrowLeft, Calendar, Clock, CreditCard, User, Phone, Mail, CheckCircle2, Share2, Heart, ExternalLink, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import logoImage from "../assets/images/logo_acolhe.jpeg";
import { Breadcrumbs } from "../components/Breadcrumbs";

interface PublicServiceViewProps {
  serviceId?: string | null;
  eventId?: string | null;
  onBack: () => void;
}

export function PublicServiceView({ serviceId, eventId, onBack }: PublicServiceViewProps) {
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<any>(null);
  const [isEvent, setIsEvent] = useState(false);
  const [showInscribeForm, setShowInscribeForm] = useState(true);
  const [inscribed, setInscribed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [subscribers, setSubscribers] = useState<any[]>([]);

  const totalInscritos = subscribers.length;
  const hasVagas = item && item.vagas && !isNaN(Number(item.vagas));
  const maxVagas = hasVagas ? Number(item.vagas) : null;
  const isFull = maxVagas !== null && totalInscritos >= maxVagas;
  const restamVagas = maxVagas !== null ? Math.max(0, maxVagas - totalInscritos) : null;

  // Form states for guest inscription
  const [guestForm, setGuestForm] = useState({
    nomeCompleto: "",
    whatsapp: "",
    email: "",
    profissao: "",
    mensagem: "",
  });

  const getContactLink = (item: any) => {
    const isWhatsapp = item.contatoPreferencial === "whatsapp";
    if (isWhatsapp) {
      const rawPhone = item.contatoTelefone || item.criadorContato || "";
      const cleanPhone = rawPhone.replace(/\D/g, "");
      const phoneWithCountry = cleanPhone.length === 11 || cleanPhone.length === 10 ? `55${cleanPhone}` : cleanPhone;
      const text = encodeURIComponent(`Olá! Gostaria de me inscrever ou saber mais sobre o evento/serviço "${item.titulo}" que vi no AcolheMente.`);
      return `https://wa.me/${phoneWithCountry}?text=${text}`;
    } else {
      const email = item.contatoEmail || item.criadorContato || "";
      const subject = encodeURIComponent(`Inscrição: ${item.titulo}`);
      const body = encodeURIComponent(`Olá, gostaria de realizar minha inscrição no evento/serviço "${item.titulo}" anunciado no AcolheMente.`);
      return `mailto:${email}?subject=${subject}&body=${body}`;
    }
  };

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

  useEffect(() => {
    const id = serviceId || eventId;
    if (!id) return;

    const q = query(collection(db, "inscricoes"), where("itemId", "==", id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSubscribers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.error("Erro ao carregar inscritos em tempo real:", error);
    });

    return () => unsubscribe();
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

  const handleInscribeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestForm.nomeCompleto || !guestForm.whatsapp || !guestForm.email || !guestForm.profissao) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    
    try {
      await addDoc(collection(db, "inscricoes"), {
        itemId: item.id,
        itemTitulo: item.titulo,
        itemTipo: isEvent ? "evento" : "servico",
        criadorId: item.criadorId || "",
        nomeCompleto: guestForm.nomeCompleto,
        whatsapp: guestForm.whatsapp,
        email: guestForm.email,
        profissao: guestForm.profissao,
        mensagem: guestForm.mensagem,
        createdAt: serverTimestamp(),
      });
      setInscribed(true);
    } catch (err) {
      console.error("Erro ao realizar inscrição:", err);
      alert("Erro ao realizar inscrição. Por favor, tente novamente.");
    }
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
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sun rounded-full flex items-center justify-center text-forest overflow-hidden shrink-0 shadow-sm">
             <img src={logoImage} alt="AcolheMente Logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-serif font-semibold text-sm sm:text-base tracking-tight text-forest">AcolheMente</span>
          <span className="text-[10px] sm:text-xs text-forest/60 px-2 py-0.5 rounded-full bg-forest/5 font-semibold">Parceiro</span>
        </div>
      </header>

      <Breadcrumbs items={[{ label: "Início", onClick: onBack }, { label: item ? item.titulo : (isEvent ? "Evento" : "Serviço"), active: true }]} className="max-w-2xl px-0 mb-6" />

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
            {maxVagas !== null ? (
              <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-semibold ${isFull ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                <User className="w-4 h-4 text-current" /> {totalInscritos} de {maxVagas} vagas preenchidas {isFull ? "(Esgotado)" : ""}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 bg-emerald-50/50 text-emerald-800 px-3 py-1.5 rounded-xl border border-emerald-100/60 font-semibold">
                <User className="w-4 h-4 text-current" /> {totalInscritos} {totalInscritos === 1 ? "inscrito" : "inscritos"} em tempo real
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

          {(item.contatoEmail || item.contatoTelefone) && (
            <div className="bg-warm/15 p-5 rounded-2xl border border-soft/60 flex flex-col gap-2">
              <h4 className="text-[11px] uppercase font-bold tracking-wider text-forest/50 font-serif font-bold">Contato do Responsável</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mt-1">
                {item.contatoEmail && (
                  <div>
                    <span className="text-xs text-forest/60 block">E-mail</span>
                    <span className="font-medium text-forest/95 select-all font-mono text-xs">{item.contatoEmail}</span>
                  </div>
                )}
                {item.contatoTelefone && (
                  <div>
                    <span className="text-xs text-forest/60 block">WhatsApp / Telefone</span>
                    <span className="font-medium text-forest/95 select-all font-mono text-xs">{item.contatoTelefone}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Subscription Section */}
          <div className="mt-4 pt-6 border-t border-soft flex flex-col gap-4">
            {/* Real-time Vacancies & Subscribers Info */}
            <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${isFull ? "bg-red-50/40 border-red-100" : "bg-emerald-50/20 border-emerald-100"}`}>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${isFull ? "bg-red-100 text-red-800" : "bg-emerald-100/60 text-emerald-800"}`}>
                  👥
                </div>
                <div>
                  <span className="block text-[10px] text-forest/50 uppercase font-bold tracking-wider leading-none mb-1">Inscrições Realizadas</span>
                  <span className="font-serif font-semibold text-sm text-forest leading-snug">
                    {totalInscritos} {totalInscritos === 1 ? "pessoa inscrita" : "pessoas inscritas"} em tempo real
                  </span>
                </div>
              </div>

              {maxVagas !== null && (
                <div className="text-right flex flex-col items-center sm:items-end w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-soft/30">
                  <span className="block text-[10px] text-forest/50 uppercase font-bold tracking-wider leading-none mb-1">Status de Vagas</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${isFull ? "bg-red-100 text-red-800 border border-red-200" : "bg-emerald-100 text-emerald-800 border border-emerald-200"}`}>
                    {isFull ? "Vagas Esgotadas" : `${restamVagas} vagas disponíveis`}
                  </span>
                </div>
              )}
            </div>
            
            {item.modoInscricao === "contato" ? (
              <div className="flex flex-col gap-3 text-center bg-warm/10 p-6 rounded-2xl border border-soft">
                <p className="text-xs text-forest/70">
                  O organizador optou por receber inscrições e dúvidas diretamente via {item.contatoPreferencial === "whatsapp" ? "WhatsApp" : "E-mail"}. Clique no botão abaixo para iniciar o contato:
                </p>
                <a 
                  href={getContactLink(item)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 bg-forest text-white rounded-full font-serif font-medium text-base hover:bg-forest/95 transition-all shadow-md shadow-forest/15 hover:shadow-lg flex items-center justify-center gap-2"
                >
                  {item.contatoPreferencial === "whatsapp" ? "Entrar em contato via WhatsApp" : "Enviar e-mail para inscrição"}
                </a>
              </div>
            ) : isFull ? (
              <div className="flex flex-col gap-3 text-center bg-red-50/30 p-6 rounded-2xl border border-red-100">
                <p className="text-sm text-red-900 font-serif font-semibold">
                  ⚠️ Inscrições Esgotadas!
                </p>
                <p className="text-xs text-red-800/80">
                  Desculpe, todas as {maxVagas} vagas para este {isEvent ? "evento" : "serviço"} foram preenchidas em tempo real. Fique atento a novas publicações ou entre em contato com o profissional responsável para demonstrar interesse em futuras turmas.
                </p>
              </div>
            ) : !inscribed ? (
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
                        value={guestForm.nomeCompleto}
                        onChange={(e) => setGuestForm(prev => ({ ...prev, nomeCompleto: e.target.value }))}
                        placeholder="Ex: Larissa Mello"
                        className="w-full p-3 bg-white border border-soft text-xs text-forest rounded-xl focus:outline-none focus:border-forest/50"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-forest/50">Seu Telefone / WhatsApp *</label>
                      <input 
                        type="text" 
                        required
                        value={guestForm.whatsapp}
                        onChange={(e) => setGuestForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                        placeholder="Ex: (11) 98765-4321"
                        className="w-full p-3 bg-white border border-soft text-xs text-forest rounded-xl focus:outline-none focus:border-forest/50"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-forest/50">Seu E-mail *</label>
                      <input 
                        type="email" 
                        required
                        value={guestForm.email}
                        onChange={(e) => setGuestForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Ex: larissa@email.com"
                        className="w-full p-3 bg-white border border-soft text-xs text-forest rounded-xl focus:outline-none focus:border-forest/50"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-forest/50">Sua Profissão *</label>
                      <input 
                        type="text" 
                        required
                        value={guestForm.profissao}
                        onChange={(e) => setGuestForm(prev => ({ ...prev, profissao: e.target.value }))}
                        placeholder="Ex: Psicólogo, Estudante, etc"
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

                    {(() => {
                      const isFormValid = guestForm.nomeCompleto.trim().length > 0 &&
                                          guestForm.whatsapp.trim().length > 0 &&
                                          guestForm.email.trim().includes("@") &&
                                          guestForm.profissao.trim().length > 0;

                      if (!isFormValid) {
                        return (
                          <div className="text-center p-3.5 bg-forest/5 text-forest/70 text-xs font-semibold rounded-2xl border border-soft/50 animate-pulse">
                            💡 Preencha Nome Completo, WhatsApp/Telefone, E-mail válido e Profissão para liberar o botão de inscrição.
                          </div>
                        );
                      }

                      return (
                        <button 
                          type="submit"
                          className="w-full py-4 bg-forest text-white rounded-full font-serif font-semibold text-base hover:bg-forest/95 transition-all shadow-md shadow-forest/15 hover:shadow-lg flex items-center justify-center gap-2 animate-[scaleUp_0.15s_ease-out]"
                        >
                          Confirmar Envio da Inscrição
                        </button>
                      );
                    })()}
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
                    setShowInscribeForm(true);
                    setGuestForm({ nomeCompleto: "", whatsapp: "", email: "", profissao: "", mensagem: "" });
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
            <h4 className="font-serif text-lg font-bold text-white leading-snug">Você é Psicólogo ou Terapeuta?</h4>
            <p className="text-xs text-white/85 mt-2 max-w-md leading-relaxed font-sans">
              Conheça nosso ecossistema e torne-se um associado. Aqui você fará parte de uma rede de profissionais de saúde mental, divulgando seus próprios eventos e serviços clínicos e ainda fazer a diferença para quem mais precisa.
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            window.location.href = window.location.origin + "?view=profissional";
          }}
          className="w-full md:w-auto px-6 py-2.5 bg-white hover:bg-sun text-forest font-bold rounded-full text-xs uppercase tracking-wider transition-colors shrink-0 flex items-center justify-center gap-1.5 shadow-md hover:scale-[1.02] active:scale-[0.98] duration-250 font-sans"
        >
          Saiba mais e faça parte do AcolheMente <ArrowRight className="w-4 h-4 text-forest" />
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
