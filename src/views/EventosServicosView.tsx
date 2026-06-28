import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Calendar, Clock, Plus, Trash2, Briefcase, X, Edit3, User, Share2, ExternalLink, CreditCard } from "lucide-react";

interface UserProfile {
  id?: string;
  uid?: string;
  name?: string;
  email?: string;
  role?: string;
  [key: string]: any;
}

interface EventosServicosViewProps {
  profile: UserProfile;
  activeSection: "eventos" | "servicos";
}

export function EventosServicosView({ profile, activeSection }: EventosServicosViewProps) {
  const [eventos, setEventos] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);

  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [subscribingItem, setSubscribingItem] = useState<any>(null);

  // Formulário de Evento
  const [eventoForm, setEventoForm] = useState({
    titulo: "",
    tipo: "",
    descricao: "",
    data: "",
    hora: "",
    contatoEmail: profile.email || "",
    contatoTelefone: profile.telefone || profile.whatsapp || profile.phone || "",
    contatoPreferencial: "email" as "email" | "whatsapp",
    modoInscricao: "plataforma" as "contato" | "plataforma",
  });

  // Formulário de Serviço
  const [servicoForm, setServicoForm] = useState({
    titulo: "",
    tipo: "", // Supervisão, Sublocação, etc
    descricao: "",
    contato: "",
    data: "",
    hora: "",
    linkInscricao: "",
    valor: "",
    isGratuito: false,
    contatoEmail: profile.email || "",
    contatoTelefone: profile.telefone || profile.whatsapp || profile.phone || "",
    contatoPreferencial: "email" as "email" | "whatsapp",
    modoInscricao: "plataforma" as "contato" | "plataforma",
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

  const pullProfileInfo = () => {
    const infos = [];
    if (profile.whatsapp) infos.push(`WhatsApp: ${profile.whatsapp}`);
    if (profile.phone && !profile.whatsapp) infos.push(`Telefone: ${profile.phone}`);
    if (profile.email) infos.push(`Email: ${profile.email}`);
    
    setServicoForm(prev => ({
      ...prev,
      contato: infos.join("\n") || prev.contato,
      contatoEmail: profile.email || prev.contatoEmail,
      contatoTelefone: profile.telefone || profile.whatsapp || profile.phone || prev.contatoTelefone,
    }));
  };

  useEffect(() => {
    const qEventos = query(collection(db, "eventos"), orderBy("createdAt", "desc"));
    const unsubEventos = onSnapshot(qEventos, (snap) => {
      setEventos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.error("Error in eventos snapshot:", error);
    });

    const qServicos = query(collection(db, "servicos"), orderBy("createdAt", "desc"));
    const unsubServicos = onSnapshot(qServicos, (snap) => {
      setServicos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.error("Error in servicos snapshot:", error);
    });

    return () => {
      unsubEventos();
      unsubServicos();
    };
  }, []);

  const handleCreateEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profile.role !== "master" && profile.role !== "triagem") return;

    try {
      const criadorContato = eventoForm.contatoPreferencial === "whatsapp" ? eventoForm.contatoTelefone : eventoForm.contatoEmail;
      if (editingEventId) {
        await updateDoc(doc(db, "eventos", editingEventId), {
          ...eventoForm,
          criadorNome: profile.name,
          criadorFoto: profile.photoUrl || profile.photo || null,
          criadorPixKey: profile.pixKey || null,
          criadorContato: criadorContato || "",
        });
      } else {
        await addDoc(collection(db, "eventos"), {
          ...eventoForm,
          criadorId: profile.uid || profile.id,
          criadorNome: profile.name,
          criadorFoto: profile.photoUrl || profile.photo || null,
          criadorPixKey: profile.pixKey || null,
          criadorContato: criadorContato || "",
          createdAt: serverTimestamp(),
        });
      }
      setIsEventModalOpen(false);
      setEditingEventId(null);
      setEventoForm({
        titulo: "",
        tipo: "",
        descricao: "",
        data: "",
        hora: "",
        contatoEmail: profile.email || "",
        contatoTelefone: profile.telefone || profile.whatsapp || profile.phone || "",
        contatoPreferencial: "email",
        modoInscricao: "plataforma",
      });
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar evento.");
    }
  };

  const handleEditEvento = (ev: any) => {
    setEventoForm({
      titulo: ev.titulo || "",
      tipo: ev.tipo || "",
      descricao: ev.descricao || "",
      data: ev.data || "",
      hora: ev.hora || "",
      contatoEmail: ev.contatoEmail || profile.email || "",
      contatoTelefone: ev.contatoTelefone || profile.telefone || profile.whatsapp || profile.phone || "",
      contatoPreferencial: ev.contatoPreferencial || "email",
      modoInscricao: ev.modoInscricao || "plataforma",
    });
    setEditingEventId(ev.id);
    setIsEventModalOpen(true);
  };

  const handleRemoveEvento = async (id: string) => {
    if (profile.role !== "master" && profile.role !== "triagem") return;
    if (confirm("Deseja realmente remover este evento?")) {
      await deleteDoc(doc(db, "eventos", id));
    }
  };

  const handleShareEvento = (ev: any) => {
    const url = `${window.location.origin}?evento=${ev.id}`;
    navigator.clipboard.writeText(url).then(() => {
      alert("Link público do evento copiado com sucesso!");
    }).catch(err => {
      console.error("Erro ao copiar link:", err);
    });
  };

  const handleShareServico = (svc: any) => {
    const url = `${window.location.origin}?servico=${svc.id}`;
    navigator.clipboard.writeText(url).then(() => {
      alert("Link público do serviço copiado com sucesso!");
    }).catch(err => {
      console.error("Erro ao copiar link:", err);
    });
  };

  const handleCreateServico = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const criadorContato = servicoForm.contatoPreferencial === "whatsapp" ? servicoForm.contatoTelefone : servicoForm.contatoEmail;
      if (editingServiceId) {
        await updateDoc(doc(db, "servicos", editingServiceId), {
          ...servicoForm,
          criadorNome: profile.name,
          criadorFoto: profile.photoUrl || profile.photo || null,
          criadorPixKey: profile.pixKey || null,
          criadorContato: criadorContato || "",
        });
      } else {
        await addDoc(collection(db, "servicos"), {
          ...servicoForm,
          criadorId: profile.uid || profile.id,
          criadorNome: profile.name,
          criadorFoto: profile.photoUrl || profile.photo || null,
          criadorPixKey: profile.pixKey || null,
          criadorContato: criadorContato || "",
          createdAt: serverTimestamp(),
        });
      }
      setIsServiceModalOpen(false);
      setEditingServiceId(null);
      setServicoForm({
        titulo: "",
        tipo: "",
        descricao: "",
        contato: "",
        data: "",
        hora: "",
        linkInscricao: "",
        valor: "",
        isGratuito: false,
        contatoEmail: profile.email || "",
        contatoTelefone: profile.telefone || profile.whatsapp || profile.phone || "",
        contatoPreferencial: "email",
        modoInscricao: "plataforma",
      });
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar serviço.");
    }
  };

  const getProfileContactStr = () => {
    const infos = [];
    if (profile.whatsapp) infos.push(`WhatsApp: ${profile.whatsapp}`);
    if (profile.phone && !profile.whatsapp) infos.push(`Telefone: ${profile.phone}`);
    if (profile.email) infos.push(`Email: ${profile.email}`);
    return infos.join("\n");
  };

  const handleEditServico = (svc: any) => {
    setServicoForm({
      titulo: svc.titulo || "",
      tipo: svc.tipo || "",
      descricao: svc.descricao || "",
      contato: svc.contato || getProfileContactStr(),
      data: svc.data || "",
      hora: svc.hora || "",
      linkInscricao: svc.linkInscricao || "",
      valor: svc.valor || "",
      isGratuito: svc.isGratuito || false,
      contatoEmail: svc.contatoEmail || profile.email || "",
      contatoTelefone: svc.contatoTelefone || profile.telefone || profile.whatsapp || profile.phone || "",
      contatoPreferencial: svc.contatoPreferencial || "email",
      modoInscricao: svc.modoInscricao || "plataforma",
    });
    setEditingServiceId(svc.id);
    setIsServiceModalOpen(true);
  };

  const handleRemoveServico = async (id: string, criadorId: string) => {
    // Gestor ou o criador podem remover
    if (profile.role === "master" || profile.role === "triagem" || (profile.uid || profile.id) === criadorId) {
      if (confirm("Deseja realmente remover este serviço?")) {
        await deleteDoc(doc(db, "servicos", id));
      }
    }
  };

  const isGestor = profile.role === "master" || profile.role === "triagem";

  const handleSubscribeConfirm = () => {
    const professionalName = profile.name || "Profissional";
    const professionalContact = profile.telefone || profile.whatsapp || profile.email || "Sem contato informado";
    const contactText = `Nome: ${professionalName}\nCargo/Perfil: Profissional\nContato: ${professionalContact}`;

    if (subscribingItem?.isGratuito || !subscribingItem?.valor) {
        alert(`Inscrição Confirmada!\n\nEnvie os seguintes dados para o responsável (${subscribingItem?.criadorContato || "Contato não informado"}):\n\n${contactText}`);
    } else {
        alert(`Envie o comprovante de pagamento para a chave PIX: ${subscribingItem?.criadorPixKey || 'Não informada'}\n\nConfirme sua presença no evento através do contato do profissional que publicou (${subscribingItem?.criadorContato || "Contato não informado"}).\n\nDados a enviar:\n${contactText}`);
    }
    setSubscribingItem(null);
  };

  return (
    <div className="flex-1 overflow-auto p-6 md:p-8 flex flex-col gap-8 slide-up bg-warm">
      {activeSection === "eventos" && (
        <>
          <div className="w-full flex items-center justify-between bg-white px-6 py-4 rounded-2xl shadow-sm border border-soft">
            <h2 className="font-serif text-2xl text-forest flex items-center gap-3">
              <Calendar className="w-6 h-6 text-forest/70" />
              Eventos da Plataforma
            </h2>
            {isGestor && (
              <button 
                onClick={() => {
                  setEditingEventId(null);
                  setEventoForm({
                    titulo: "",
                    tipo: "",
                    descricao: "",
                    data: "",
                    hora: "",
                    contatoEmail: profile.email || "",
                    contatoTelefone: profile.telefone || profile.whatsapp || profile.phone || "",
                    contatoPreferencial: "email",
                    modoInscricao: "plataforma",
                  });
                  setIsEventModalOpen(true);
                }}
                className="flex items-center gap-2 bg-sun text-forest font-semibold text-sm px-4 py-2 rounded-xl hover:bg-sun-dark transition-colors"
              >
                <Plus className="w-4 h-4" /> Novo Evento
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {eventos.map((ev) => {
              const profileId = profile.uid || profile.id;
              const isCreator = profileId === ev.criadorId;

              return (
              <div key={ev.id} className="bg-white p-6 rounded-[2rem] shadow-md border border-soft hover:shadow-lg transition-all duration-300 flex flex-col gap-5 relative">
                {isGestor && (
                  <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                    <button 
                      onClick={() => handleEditEvento(ev)}
                      className="bg-blue-50 text-blue-600 p-2 rounded-full hover:bg-blue-100 transition-colors"
                      title="Editar evento"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleRemoveEvento(ev.id)}
                      className="bg-red-50 text-red-600 p-2 rounded-full hover:bg-red-100 transition-colors"
                      title="Remover evento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                {/* Header Row */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2 pr-16">
                    {ev.tipo ? (
                      <span className="text-[10px] font-bold text-sun-dark-dark bg-sun/25 px-2.5 py-1 rounded-full uppercase tracking-wider mb-1 inline-block">
                        {ev.tipo}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-forest/60 bg-forest/5 px-2.5 py-1 rounded-full uppercase tracking-wider mb-1 inline-block">
                        Evento
                      </span>
                    )}
                    {isCreator && <span className="text-[9px] text-forest/50 bg-warm px-2 py-0.5 rounded border border-soft font-bold">Meu Evento</span>}
                  </div>
                  <h3 className="font-serif text-xl font-bold text-forest leading-snug tracking-tight">{ev.titulo}</h3>
                </div>

                {/* Description */}
                <p className="text-xs text-forest/75 leading-relaxed whitespace-pre-wrap flex-1 bg-warm/15 p-3.5 rounded-2xl border border-soft/30">
                  {ev.descricao}
                </p>
                
                {/* Information organized in lines (Rows) */}
                <div className="bg-warm/25 rounded-2xl border border-soft/50 p-4 flex flex-col gap-2.5 text-xs text-forest/85">
                  <div className="flex items-center justify-between py-1 border-b border-soft/30">
                    <span className="text-forest/50 font-medium flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-forest/40" /> Data:
                    </span>
                    <span className="font-semibold text-forest/90">{ev.data || "A combinar"}</span>
                  </div>
                  
                  <div className="flex items-center justify-between py-1 border-b border-soft/30">
                    <span className="text-forest/50 font-medium flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-forest/40" /> Horário:
                    </span>
                    <span className="font-semibold text-forest/90">{ev.hora || "A combinar"}</span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-forest/50 font-medium flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-forest/40" /> Criador:
                    </span>
                    <span className="font-semibold text-forest/90 truncate max-w-[150px]">{ev.criadorNome}</span>
                  </div>
                </div>

                {/* Footer and Creator */}
                <div className="pt-2 flex items-center gap-3 justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-forest/10 overflow-hidden flex-shrink-0 flex items-center justify-center border-2 border-sun">
                      {ev.criadorFoto ? <img src={ev.criadorFoto} alt={ev.criadorNome} className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-forest/50"/>}
                    </div>
                    <span className="text-xs font-semibold text-forest truncate">{ev.criadorNome}</span>
                  </div>
                  {!isCreator && ev.criadorId && (
                     <a href={`${window.location.origin}?prof=${ev.criadorId}`} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 px-3 py-1.5 text-xs text-forest bg-warm font-semibold rounded-xl border border-soft hover:bg-soft transition-colors tracking-wide">Ver Perfil</a>
                  )}
                </div>
                
                {/* Actions Row */}
                <div className="flex items-center gap-2 pt-2 border-t border-soft/60">
                  {profile.role === "profissional" && !isCreator && (
                    ev.modoInscricao === "contato" ? (
                      <a 
                        href={getContactLink(ev)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center py-2.5 bg-forest hover:bg-forest/90 text-white font-serif font-semibold rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center"
                      >
                        {ev.contatoPreferencial === "whatsapp" ? "Inscrição via WhatsApp" : "Inscrição via E-mail"}
                      </a>
                    ) : (
                      <button 
                        onClick={() => setSubscribingItem(ev)}
                        className="flex-1 py-2.5 bg-forest hover:bg-forest/90 text-white font-serif font-semibold rounded-xl text-xs transition-colors shadow-sm"
                      >
                        Me Inscrever
                      </button>
                    )
                  )}
                  {isCreator && (
                    <a 
                      href={`${window.location.origin}?evento=${ev.id}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-1 text-center py-2 bg-forest/5 hover:bg-forest text-forest hover:text-white font-semibold rounded-xl text-xs border border-forest/20 transition-all duration-200 flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Página Pública
                    </a>
                  )}
                  <button onClick={() => handleShareEvento(ev)} className="p-2 border border-soft rounded-xl text-forest/70 hover:bg-forest hover:text-white transition-colors bg-warm" title="Compartilhar evento">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )})}
            {eventos.length === 0 && (
              <div className="col-span-full p-8 text-center text-forest/60 bg-white/50 border border-dashed border-soft rounded-2xl">
                Nenhum evento da plataforma no momento.
              </div>
            )}
          </div>
        </>
      )}

      {activeSection === "servicos" && (
        <>
          <div className="w-full flex items-center justify-between bg-white px-6 py-4 rounded-2xl shadow-sm border border-soft">
            <h2 className="font-serif text-2xl text-forest flex items-center gap-3">
              <Briefcase className="w-6 h-6 text-forest/70" />
              Serviços para Psicólogos
            </h2>
            <button 
              onClick={() => {
                setEditingServiceId(null);
                setServicoForm({
                  titulo: "",
                  tipo: "",
                  descricao: "",
                  contato: getProfileContactStr(),
                  data: "",
                  hora: "",
                  linkInscricao: "",
                  valor: "",
                  isGratuito: false,
                  contatoEmail: profile.email || "",
                  contatoTelefone: profile.telefone || profile.whatsapp || profile.phone || "",
                  contatoPreferencial: "email",
                  modoInscricao: "plataforma",
                });
                setIsServiceModalOpen(true);
              }}
              className="flex items-center gap-2 bg-sun text-forest font-semibold text-sm px-4 py-2 rounded-xl hover:bg-sun-dark transition-colors"
            >
              <Plus className="w-4 h-4" /> Ofertar Serviço
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {servicos.map((svc) => {
              const profileId = profile.uid || profile.id;
              const isCreator = profileId === svc.criadorId;
              const canRemove = isCreator || isGestor;

              return (
                <div key={svc.id} className="bg-white p-6 rounded-[2rem] shadow-md border border-soft hover:shadow-lg transition-all duration-300 flex flex-col gap-5 relative">
                   {canRemove && (
                    <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                      {(isCreator || isGestor) && (
                        <button 
                          onClick={() => handleEditServico(svc)}
                          className="bg-blue-50 text-blue-600 p-2 rounded-full hover:bg-blue-100 transition-colors"
                          title="Editar Serviço"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => handleRemoveServico(svc.id, svc.criadorId)}
                        className="bg-red-50 text-red-600 p-2 rounded-full hover:bg-red-100 transition-colors"
                        title="Remover Serviço"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Header Row */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2 pr-16">
                      <span className="text-[10px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {svc.tipo || "Serviço"}
                      </span>
                      {isCreator && <span className="text-[9px] text-forest/50 bg-warm px-2 py-0.5 rounded border border-soft font-bold">Meu Serviço</span>}
                    </div>
                    <h3 className="font-serif text-xl font-bold text-forest leading-snug tracking-tight">{svc.titulo}</h3>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-forest/75 leading-relaxed whitespace-pre-wrap flex-1 bg-warm/15 p-3.5 rounded-2xl border border-soft/30">
                    {svc.descricao}
                  </p>

                  {/* Information organized in lines (Rows) */}
                  <div className="bg-warm/25 rounded-2xl border border-soft/50 p-4 flex flex-col gap-2.5 text-xs text-forest/85">
                    {svc.data && (
                      <div className="flex items-center justify-between py-1 border-b border-soft/30">
                        <span className="text-forest/50 font-medium flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-forest/40" /> Data:
                        </span>
                        <span className="font-semibold text-forest/90">{svc.data}</span>
                      </div>
                    )}
                    
                    {svc.hora && (
                      <div className="flex items-center justify-between py-1 border-b border-soft/30">
                        <span className="text-forest/50 font-medium flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-forest/40" /> Horário:
                        </span>
                        <span className="font-semibold text-forest/90">{svc.hora}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between py-1 border-b border-soft/30">
                      <span className="text-forest/50 font-medium flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-forest/40" /> Valor:
                      </span>
                      <span className={`font-semibold ${svc.isGratuito ? "text-emerald-600 font-bold" : "text-forest/90"}`}>
                        {svc.isGratuito ? "Gratuito" : (svc.valor || "A combinar")}
                      </span>
                    </div>

                    {(svc.contatoEmail || svc.contatoTelefone) ? (
                      <div className="py-1 flex flex-col gap-1">
                        <span className="text-forest/50 font-medium flex items-center gap-1.5 mb-0.5 block">
                          Informações de Contato:
                        </span>
                        {svc.contatoEmail && (
                          <div className="text-[11px] text-forest/90">
                            <strong>E-mail:</strong> {svc.contatoEmail}
                          </div>
                        )}
                        {svc.contatoTelefone && (
                          <div className="text-[11px] text-forest/90">
                            <strong>WhatsApp/Tel:</strong> {svc.contatoTelefone}
                          </div>
                        )}
                        {svc.contatoPreferencial && (
                          <div className="text-[10px] text-forest/50 mt-1 italic">
                            Preferencial: {svc.contatoPreferencial === "whatsapp" ? "WhatsApp/Tel" : "E-mail"}
                          </div>
                        )}
                      </div>
                    ) : (
                      svc.contato && (
                        <div className="py-1">
                          <span className="text-forest/50 font-medium flex items-center gap-1.5 mb-1 block">
                            Contato para Inscrição:
                          </span>
                          <div className="text-[11px] font-mono text-forest/90 bg-white/70 p-2 rounded-xl border border-soft/40 break-all select-all">
                            {svc.contato}
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  {/* Creator Info */}
                  <div className="pt-2 flex items-center gap-3 justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-forest/20 flex items-center justify-center text-forest font-bold text-xs flex-shrink-0 border border-soft">
                        {svc.criadorFoto ? <img src={svc.criadorFoto} alt={svc.criadorNome} className="w-full h-full object-cover" /> : <User className="w-4 h-4"/>}
                      </div>
                      <div className="flex flex-col min-w-0">
                         <span className="text-[10px] text-forest/50 leading-tight uppercase font-semibold tracking-wider">Criador</span>
                         <span className="text-xs font-semibold text-forest truncate">{isCreator ? "Você" : svc.criadorNome}</span>
                      </div>
                    </div>
                    {!isCreator && (
                      <a href={`${window.location.origin}?prof=${svc.criadorId}`} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 px-3 py-1.5 text-xs text-forest bg-warm font-semibold rounded-xl border border-soft hover:bg-soft transition-colors tracking-wide">Ver Perfil</a>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center gap-2 pt-2 border-t border-soft/60">
                    {profile.role === "profissional" && !isCreator && (
                      svc.modoInscricao === "contato" ? (
                        <a 
                          href={getContactLink(svc)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-center py-2.5 bg-forest hover:bg-forest/90 text-white font-serif font-semibold rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center"
                        >
                          {svc.contatoPreferencial === "whatsapp" ? "Inscrição via WhatsApp" : "Inscrição via E-mail"}
                        </a>
                      ) : (
                        <button 
                          onClick={() => setSubscribingItem(svc)}
                          className="flex-1 py-2.5 bg-forest hover:bg-forest/90 text-white font-serif font-semibold rounded-xl text-xs transition-colors shadow-sm"
                        >
                          Me Inscrever
                        </button>
                      )
                    )}
                    {isCreator && (
                      <a 
                        href={`${window.location.origin}?servico=${svc.id}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 text-center py-2 bg-gradient-to-r from-purple-50 to-purple-100/50 hover:from-purple-100 hover:to-purple-200/50 text-purple-900 border border-purple-200/40 font-semibold rounded-xl text-xs transition-all duration-250 flex items-center justify-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-purple-700" /> Página Pública
                      </a>
                    )}
                    <button onClick={() => handleShareServico(svc)} className="p-2 border border-soft rounded-xl text-forest/70 hover:bg-forest hover:text-white transition-colors bg-warm" title="Compartilhar">
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
             {servicos.length === 0 && (
              <div className="col-span-full p-8 text-center text-forest/60 bg-white/50 border border-dashed border-soft rounded-2xl">
                Nenhum serviço oferecido no momento.
              </div>
            )}
          </div>
        </>
      )}

      {/* Modais de Edição */}
      {isEventModalOpen && (
        <div className="fixed inset-0 bg-forest/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-[2rem] p-6 sm:p-8 shadow-xl flex flex-col items-start relative border border-soft max-h-[90vh] overflow-y-auto">
             <button 
              onClick={() => setIsEventModalOpen(false)}
              className="absolute top-6 right-6 text-forest/40 hover:text-forest"
            >
              <X className="w-5 h-5"/>
            </button>
            <h3 className="text-xl font-serif text-forest mb-6">{editingEventId ? "Editar Evento" : "Criar Novo Evento"}</h3>
            <form onSubmit={handleCreateEvento} className="w-full flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">Título do Evento</label>
                <input required type="text" value={eventoForm.titulo} onChange={e => setEventoForm({...eventoForm, titulo: e.target.value})} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-all text-forest" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">Tipo</label>
                   <input required type="text" placeholder="Ex: Palestra, Workshop..." value={eventoForm.tipo} onChange={e => setEventoForm({...eventoForm, tipo: e.target.value})} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-all text-forest" />
                </div>
                <div>
                   <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">Data</label>
                   <input required type="date" value={eventoForm.data} onChange={e => setEventoForm({...eventoForm, data: e.target.value})} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-all text-forest" />
                </div>
              </div>
              <div>
                 <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">Hora</label>
                 <input required type="time" value={eventoForm.hora} onChange={e => setEventoForm({...eventoForm, hora: e.target.value})} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-all text-forest" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">Descrição</label>
                <textarea required rows={4} value={eventoForm.descricao} onChange={e => setEventoForm({...eventoForm, descricao: e.target.value})} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-all text-forest" />
              </div>

              <div className="border-t border-soft pt-4 flex flex-col gap-4">
                <h4 className="text-sm font-serif font-bold text-forest">Opções de Contato e Inscrição</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">E-mail de Contato</label>
                    <input type="email" value={eventoForm.contatoEmail} onChange={e => setEventoForm({...eventoForm, contatoEmail: e.target.value})} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none text-forest" placeholder="email@exemplo.com" />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">Telefone / WhatsApp</label>
                    <input type="text" value={eventoForm.contatoTelefone} onChange={e => setEventoForm({...eventoForm, contatoTelefone: e.target.value})} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none text-forest" placeholder="(00) 00000-0000" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">Contato Preferencial para Dúvidas</label>
                  <select value={eventoForm.contatoPreferencial} onChange={e => setEventoForm({...eventoForm, contatoPreferencial: e.target.value as any})} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none text-forest">
                    <option value="email">E-mail</option>
                    <option value="whatsapp">Telefone / WhatsApp</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">Como atender às inscrições / dúvidas?</label>
                  <select value={eventoForm.modoInscricao} onChange={e => setEventoForm({...eventoForm, modoInscricao: e.target.value as any})} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none text-forest">
                    <option value="plataforma">Diretamente pela plataforma no botão "Quero me inscrever"</option>
                    <option value="contato">Fazer inscrição pelo contato selecionado (e-mail ou whats)</option>
                  </select>
                </div>
              </div>

              <button disabled={!eventoForm.titulo || !eventoForm.descricao || !eventoForm.data} type="submit" className="w-full mt-4 py-3 bg-sun text-forest font-bold rounded-xl hover:bg-sun-dark transition-colors disabled:opacity-50">
                {editingEventId ? "Salvar Alterações" : "Publicar Evento"}
              </button>
            </form>
          </div>
        </div>
      )}

      {isServiceModalOpen && (
        <div className="fixed inset-0 bg-forest/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-[2rem] p-6 sm:p-8 shadow-xl flex flex-col items-start relative border border-soft max-h-[90vh] overflow-y-auto">
             <button 
              onClick={() => setIsServiceModalOpen(false)}
              className="absolute top-6 right-6 text-forest/40 hover:text-forest"
            >
              <X className="w-5 h-5"/>
            </button>
            <h3 className="text-xl font-serif text-forest mb-6">{editingServiceId ? "Editar Serviço" : "Ofertar um Serviço"}</h3>
            <form onSubmit={handleCreateServico} className="w-full flex flex-col gap-4">
               <div>
                <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">Título do Serviço</label>
                <input required type="text" placeholder="Ex: Supervisão Clínica em TCC" value={servicoForm.titulo} onChange={e => setServicoForm({...servicoForm, titulo: e.target.value})} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-all text-forest" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">Tipo de Serviço</label>
                <input required type="text" placeholder="Ex: Supervisão, Sublocação, Cursos..." value={servicoForm.tipo} onChange={e => setServicoForm({...servicoForm, tipo: e.target.value})} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-all text-forest" />
              </div>
               <div>
                <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">Descrição Detalhada</label>
                <textarea required rows={4} value={servicoForm.descricao} onChange={e => setServicoForm({...servicoForm, descricao: e.target.value})} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-all text-forest custom-scrollbar" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">Data (Opcional)</label>
                   <input type="date" value={servicoForm.data} onChange={e => setServicoForm({...servicoForm, data: e.target.value})} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-all text-forest" />
                </div>
                <div>
                   <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">Hora (Opcional)</label>
                   <input type="time" value={servicoForm.hora} onChange={e => setServicoForm({...servicoForm, hora: e.target.value})} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-all text-forest" />
                </div>
              </div>
              <div className="grid grid-cols-5 gap-4 items-end">
                <div className="col-span-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">Valor (Opcional)</label>
                  <input type="text" disabled={servicoForm.isGratuito} placeholder="Ex: R$ 150,00" value={servicoForm.valor} onChange={e => setServicoForm({...servicoForm, valor: e.target.value})} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-all text-forest disabled:opacity-50" />
                </div>
                <div className="col-span-2 flex items-center justify-center p-3 bg-white border border-soft rounded-xl shadow-sm h-[48px]">
                  <label className="flex items-center gap-2 text-sm font-semibold text-forest cursor-pointer w-full justify-center">
                    <input type="checkbox" checked={servicoForm.isGratuito} onChange={e => {
                        const checked = e.target.checked;
                        setServicoForm({...servicoForm, isGratuito: checked, valor: checked ? "" : servicoForm.valor});
                    }} className="w-4 h-4 accent-forest" />
                    Gratuito
                  </label>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">Link de Inscrição / Mais Informações (Opcional)</label>
                <input type="url" placeholder="https://" value={servicoForm.linkInscricao} onChange={e => setServicoForm({...servicoForm, linkInscricao: e.target.value})} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-all text-forest" />
              </div>

              <div className="border-t border-soft pt-4 flex flex-col gap-4">
                <h4 className="text-sm font-serif font-bold text-forest">Opções de Contato e Inscrição</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">E-mail de Contato</label>
                    <input type="email" value={servicoForm.contatoEmail} onChange={e => setServicoForm({...servicoForm, contatoEmail: e.target.value})} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none text-forest" placeholder="email@exemplo.com" />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">Telefone / WhatsApp</label>
                    <input type="text" value={servicoForm.contatoTelefone} onChange={e => setServicoForm({...servicoForm, contatoTelefone: e.target.value})} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none text-forest" placeholder="(00) 00000-0000" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">Contato Preferencial para Dúvidas</label>
                  <select value={servicoForm.contatoPreferencial} onChange={e => setServicoForm({...servicoForm, contatoPreferencial: e.target.value as any})} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none text-forest">
                    <option value="email">E-mail</option>
                    <option value="whatsapp">Telefone / WhatsApp</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">Como atender às inscrições / dúvidas?</label>
                  <select value={servicoForm.modoInscricao} onChange={e => setServicoForm({...servicoForm, modoInscricao: e.target.value as any})} className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none text-forest">
                    <option value="plataforma">Diretamente pela plataforma no botão "Quero me inscrever"</option>
                    <option value="contato">Fazer inscrição pelo contato selecionado (e-mail ou whats)</option>
                  </select>
                </div>
              </div>

               <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-forest/70 block">Informações de Contato / Outros (Opcional - Texto Livre)</label>
                  <button type="button" onClick={pullProfileInfo} className="text-[10px] text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded font-semibold transition-colors">
                    Puxar do meu perfil
                  </button>
                </div>
                <textarea rows={2} value={servicoForm.contato} onChange={e => setServicoForm({...servicoForm, contato: e.target.value})} placeholder="Informações extras ou outros meios de contato..." className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-all text-forest custom-scrollbar" />
              </div>
               <button disabled={!servicoForm.titulo || !servicoForm.descricao || !servicoForm.tipo} type="submit" className="w-full mt-4 py-3 bg-sun text-forest font-bold rounded-xl hover:bg-sun-dark transition-colors disabled:opacity-50">
                {editingServiceId ? "Salvar Alterações" : "Publicar Serviço"}
              </button>
            </form>
          </div>
        </div>
      )}
      {subscribingItem && (
        <div className="fixed inset-0 bg-forest/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-[2rem] p-6 sm:p-8 shadow-xl flex flex-col items-start relative border border-soft max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setSubscribingItem(null)}
              className="absolute top-6 right-6 text-forest/40 hover:text-forest"
            >
              <X className="w-5 h-5"/>
            </button>
            <h3 className="text-xl font-serif text-forest mb-6">Confirmação de Inscrição</h3>
            
            <div className="w-full flex flex-col gap-4 text-sm text-forest/80 mb-6">
              <p>Inscrição para: <strong>{subscribingItem.titulo}</strong></p>
              
              {!subscribingItem.isGratuito && subscribingItem.valor && (
                <div className="bg-sun/30 p-4 rounded-xl border border-sun">
                  <p className="font-semibold text-sun-dark-dark mb-2">Instruções de Pagamento</p>
                  <p className="text-xs mb-1">Para confirmar sua vaga, pague o valor de <strong className="text-forest">{subscribingItem.valor}</strong> para a chave PIX abaixo:</p>
                  <div className="px-3 py-2 bg-white rounded border border-soft font-mono select-all text-sm mb-2 break-all text-center">
                    {subscribingItem.criadorPixKey || "Chave PIX não informada pelo organizador."}
                  </div>
                  {subscribingItem.criadorPixKey && (
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(subscribingItem.criadorPixKey);
                        alert("Chave PIX copiada!");
                      }} 
                      className="w-full text-[10px] font-bold uppercase tracking-wider text-forest bg-warm hover:bg-soft py-1.5 rounded transition-colors"
                    >
                      Copiar Chave PIX
                    </button>
                  )}
                </div>
              )}

              <p className="text-xs">
                Ao clicar em confirmar, um resumo dos seus dados preenchidos no Meu Perfil 
                (Nome Completo, E-mail, Telefone/WhatsApp) estará pronto para ser enviado ao criador: <strong>{subscribingItem.criadorNome}</strong>.
              </p>
            </div>
            
            <button 
              onClick={handleSubscribeConfirm}
              className="w-full py-3 bg-forest text-white font-bold rounded-xl hover:bg-forest/90 transition-colors"
            >
              Ciente, Ver Dados a Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
