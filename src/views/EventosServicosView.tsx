import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, orderBy, where } from "firebase/firestore";
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
  activeSection?: "eventos" | "servicos" | "eventos_e_parcerias" | string;
}

export function EventosServicosView({ profile, activeSection = "eventos_e_parcerias" }: EventosServicosViewProps) {
  const [currentSection, setCurrentSection] = useState<"todos" | "eventos" | "servicos">(() => {
    if (activeSection === "eventos") return "eventos";
    if (activeSection === "servicos") return "servicos";
    return "todos";
  });

  useEffect(() => {
    if (activeSection === "eventos") setCurrentSection("eventos");
    else if (activeSection === "servicos") setCurrentSection("servicos");
    else setCurrentSection("todos");
  }, [activeSection]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCategory, setModalCategory] = useState<"evento" | "servico">("evento");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<"evento" | "servico">("evento");
  const [subscribingItem, setSubscribingItem] = useState<any>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [inscricoes, setInscricoes] = useState<any[]>([]);

  // Formulário Padrão Unificado (O mais completo, abrangendo Eventos e Serviços)
  const [unifiedForm, setUnifiedForm] = useState({
    categoria: "evento" as "evento" | "servico",
    titulo: "",
    tipo: "", // Ex: Palestra, Workshop, Supervisão, Sublocação, Cursos...
    descricao: "",
    data: "",
    hora: "",
    vagas: "" as string | number,
    isGratuito: false,
    valor: "",
    linkInscricao: "",
    requisitos: "",
    solicitarComprovante: false,
    contatoEmail: profile.email || "",
    contatoTelefone: profile.telefone || profile.whatsapp || profile.phone || "",
    contatoPreferencial: "email" as "email" | "whatsapp",
    modoInscricao: "plataforma" as "contato" | "plataforma",
  });

  const resetUnifiedForm = (initialCat: "evento" | "servico" = "evento") => {
    setUnifiedForm({
      categoria: initialCat,
      titulo: "",
      tipo: "",
      descricao: "",
      data: "",
      hora: "",
      vagas: "",
      isGratuito: false,
      valor: "",
      linkInscricao: "",
      requisitos: "",
      solicitarComprovante: false,
      contatoEmail: profile.email || "",
      contatoTelefone: profile.telefone || profile.whatsapp || profile.phone || "",
      contatoPreferencial: "email",
      modoInscricao: "plataforma",
    });
  };

  const openCreateModal = (cat?: "evento" | "servico") => {
    const selectedCat = cat || (currentSection === "servicos" ? "servico" : "evento");
    setEditingId(null);
    setEditingCategory(selectedCat);
    setModalCategory(selectedCat);
    resetUnifiedForm(selectedCat);
    setIsModalOpen(true);
  };

  const getContactLink = (item: any) => {
    const isWhatsapp = item.contatoPreferencial === "whatsapp";
    if (isWhatsapp) {
      const rawPhone = item.contatoTelefone || item.criadorContato || "";
      const cleanPhone = rawPhone.replace(/\D/g, "");
      const phoneWithCountry = cleanPhone.length === 11 || cleanPhone.length === 10 ? `55${cleanPhone}` : cleanPhone;
      const text = encodeURIComponent(`Olá! Gostaria de me inscrever ou saber mais sobre "${item.titulo}" que vi no AcolheMente.`);
      return `https://wa.me/${phoneWithCountry}?text=${text}`;
    } else {
      const email = item.contatoEmail || item.criadorContato || "";
      const subject = encodeURIComponent(`Inscrição: ${item.titulo}`);
      const body = encodeURIComponent(`Olá, gostaria de realizar minha inscrição em "${item.titulo}" anunciado no AcolheMente.`);
      return `mailto:${email}?subject=${subject}&body=${body}`;
    }
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

    const uid = profile.uid || profile.id;
    const isGestorUser = profile.role === "master" || profile.role === "triagem";
    const qInscricoes = isGestorUser
      ? query(collection(db, "inscricoes"), orderBy("createdAt", "desc"))
      : query(collection(db, "inscricoes"), where("criadorId", "==", uid || ""));
    const unsubInscricoes = onSnapshot(qInscricoes, (snap) => {
      setInscricoes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.error("Error in inscricoes snapshot:", error);
    });

    return () => {
      unsubEventos();
      unsubServicos();
      unsubInscricoes();
    };
  }, [profile.uid, profile.id, profile.role]);

  const handleSaveUnifiedItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const targetCollection = unifiedForm.categoria === "evento" ? "eventos" : "servicos";
      const criadorContato = unifiedForm.contatoPreferencial === "whatsapp" 
        ? unifiedForm.contatoTelefone 
        : unifiedForm.contatoEmail;

      const payload: any = {
        categoria: unifiedForm.categoria,
        titulo: unifiedForm.titulo.trim(),
        tipo: unifiedForm.tipo.trim(),
        descricao: unifiedForm.descricao.trim(),
        data: unifiedForm.data || "",
        hora: unifiedForm.hora || "",
        vagas: unifiedForm.vagas || "",
        isGratuito: unifiedForm.isGratuito,
        valor: unifiedForm.isGratuito ? "" : (unifiedForm.valor || ""),
        linkInscricao: unifiedForm.linkInscricao || "",
        requisitos: unifiedForm.requisitos || "",
        solicitarComprovante: unifiedForm.solicitarComprovante || false,
        contatoEmail: unifiedForm.contatoEmail || "",
        contatoTelefone: unifiedForm.contatoTelefone || "",
        contatoPreferencial: unifiedForm.contatoPreferencial || "email",
        modoInscricao: unifiedForm.modoInscricao || "plataforma",
        criadorNome: profile.name || "Profissional",
        criadorFoto: profile.photoUrl || profile.photo || null,
        criadorPixKey: profile.pixKey || null,
        criadorContato: criadorContato || "",
      };

      if (editingId) {
        // Se a categoria mudou na edição (ex: de evento para serviço ou vice-versa),
        // remove do antigo e insere no novo para manter integridade dos dados
        if (editingCategory !== unifiedForm.categoria) {
          const oldCollection = editingCategory === "evento" ? "eventos" : "servicos";
          await deleteDoc(doc(db, oldCollection, editingId));
          await addDoc(collection(db, targetCollection), {
            ...payload,
            criadorId: profile.uid || profile.id,
            createdAt: serverTimestamp(),
          });
        } else {
          await updateDoc(doc(db, targetCollection, editingId), {
            ...payload,
            updatedAt: serverTimestamp(),
          });
        }
      } else {
        await addDoc(collection(db, targetCollection), {
          ...payload,
          criadorId: profile.uid || profile.id,
          createdAt: serverTimestamp(),
        });
      }

      setIsModalOpen(false);
      setEditingId(null);
      resetUnifiedForm(unifiedForm.categoria);
    } catch (error) {
      console.error("Erro ao salvar item:", error);
      alert("Erro ao salvar item. Por favor, tente novamente.");
    }
  };

  const handleEditUnifiedItem = (item: any, category: "evento" | "servico") => {
    setEditingId(item.id);
    setEditingCategory(category);
    setModalCategory(category);
    setUnifiedForm({
      categoria: category,
      titulo: item.titulo || "",
      tipo: item.tipo || "",
      descricao: item.descricao || "",
      data: item.data || "",
      hora: item.hora || "",
      vagas: item.vagas || "",
      isGratuito: !!item.isGratuito,
      valor: item.valor || "",
      linkInscricao: item.linkInscricao || "",
      requisitos: item.requisitos || "",
      solicitarComprovante: !!item.solicitarComprovante,
      contatoEmail: item.contatoEmail || profile.email || "",
      contatoTelefone: item.contatoTelefone || profile.telefone || profile.whatsapp || profile.phone || "",
      contatoPreferencial: item.contatoPreferencial || "email",
      modoInscricao: item.modoInscricao || "plataforma",
    });
    setIsModalOpen(true);
  };

  const handleRemoveUnifiedItem = async (id: string, category: "evento" | "servico", criadorId?: string) => {
    const profileId = profile.uid || profile.id;
    const canDelete = isGestor || (criadorId && criadorId === profileId);
    if (!canDelete) return;

    const label = category === "evento" ? "este evento" : "este serviço";
    if (confirm(`Deseja realmente remover ${label}?`)) {
      const coll = category === "evento" ? "eventos" : "servicos";
      await deleteDoc(doc(db, coll, id));
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
    <div className="flex-1 overflow-auto p-4 sm:p-6 md:p-8 flex flex-col gap-6 slide-up bg-warm">
      {/* HEADER UNIFICADO: EVENTOS E PARCERIAS */}
      <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white px-5 py-3 sm:py-3.5 rounded-2xl shadow-xs border border-soft">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-forest/5 text-forest flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-forest" />
            </span>
            <h2 className="font-serif text-sm sm:text-base text-forest font-bold leading-snug">
              Eventos e Parcerias
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-forest/65 max-w-xl">
            Central de workshops, supervisões clínicas, sublocações e oportunidades de parceria profissional.
          </p>
        </div>

        {/* CONTROLES / FILTROS E AÇÕES */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Segmented Filter */}
          <div className="flex items-center p-1 bg-warm rounded-xl border border-soft text-xs font-semibold">
            <button
              type="button"
              onClick={() => setCurrentSection("todos")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                currentSection === "todos"
                  ? "bg-white text-forest shadow-xs font-bold"
                  : "text-forest/70 hover:text-forest"
              }`}
            >
              Todos ({eventos.length + servicos.length})
            </button>
            <button
              type="button"
              onClick={() => setCurrentSection("eventos")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                currentSection === "eventos"
                  ? "bg-white text-forest shadow-xs font-bold"
                  : "text-forest/70 hover:text-forest"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Eventos ({eventos.length})
            </button>
            <button
              type="button"
              onClick={() => setCurrentSection("servicos")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                currentSection === "servicos"
                  ? "bg-white text-forest shadow-xs font-bold"
                  : "text-forest/70 hover:text-forest"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              Serviços ({servicos.length})
            </button>
          </div>

          {/* Botões de Ação Unificados (Disponíveis para Todos os Profissionais) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openCreateModal("evento")}
              className="flex items-center gap-1.5 bg-forest text-white font-semibold text-xs px-3.5 py-2 rounded-xl hover:bg-forest/90 transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-sun" /> Novo Evento
            </button>

            <button
              type="button"
              onClick={() => openCreateModal("servico")}
              className="flex items-center gap-1.5 bg-sun text-forest font-semibold text-xs px-3.5 py-2 rounded-xl hover:bg-sun-dark transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Ofertar Serviço
            </button>
          </div>
        </div>
      </div>

      {/* BLOCO DE EVENTOS DA PLATAFORMA */}
      {(currentSection === "todos" || currentSection === "eventos") && (
        <>
          {currentSection === "todos" && (
            <div className="flex items-center justify-between pt-1">
              <h3 className="font-serif text-lg font-bold text-forest flex items-center gap-2">
                <Calendar className="w-4 h-4 text-forest/70" />
                Eventos da Plataforma ({eventos.length})
              </h3>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {eventos.map((ev) => {
              const profileId = profile.uid || profile.id;
              const isCreator = profileId === ev.criadorId;

              return (
              <div key={ev.id} className="bg-white p-6 rounded-[2rem] shadow-md border border-soft hover:shadow-lg transition-all duration-300 flex flex-col gap-5 relative">
                {(isCreator || isGestor) && (
                  <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                    <button 
                      onClick={() => handleEditUnifiedItem(ev, "evento")}
                      className="bg-blue-50 text-blue-600 p-2 rounded-full hover:bg-blue-100 transition-colors cursor-pointer"
                      title="Editar evento"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleRemoveUnifiedItem(ev.id, "evento", ev.criadorId)}
                      className="bg-red-50 text-red-600 p-2 rounded-full hover:bg-red-100 transition-colors cursor-pointer"
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

                {/* Real-time subscriber tracking for the creator or manager */}
                {(isCreator || isGestor) && (
                  <div className="mt-2 pt-3 border-t border-soft/50 flex flex-col gap-2">
                    {(() => {
                      const itemInscricoes = inscricoes.filter(i => i.itemId === ev.id);
                      const hasVagas = ev.vagas && !isNaN(Number(ev.vagas));
                      const maxVagas = hasVagas ? Number(ev.vagas) : null;
                      const isFull = maxVagas && itemInscricoes.length >= maxVagas;

                      return (
                        <>
                          <div className={`p-3 rounded-xl text-xs flex items-center justify-between font-semibold ${isFull ? "bg-red-50 text-red-800 border border-red-100" : "bg-emerald-50 text-emerald-800 border border-emerald-100"}`}>
                            <span>👥 {itemInscricoes.length} {itemInscricoes.length === 1 ? "inscrito" : "inscritos"} em tempo real {maxVagas ? `de ${maxVagas} vagas` : ""}</span>
                            {isFull && <span className="text-[10px] uppercase bg-red-100 px-2 py-0.5 rounded font-bold">Esgotado</span>}
                          </div>

                          {itemInscricoes.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                              <button 
                                type="button"
                                onClick={() => setExpandedItemId(expandedItemId === ev.id ? null : ev.id)}
                                className="w-full text-center py-1.5 text-[11px] font-bold text-forest bg-warm hover:bg-soft rounded-lg transition-colors border border-soft"
                              >
                                {expandedItemId === ev.id ? "Ocultar Inscritos" : `Ver Dados dos Inscritos (${itemInscricoes.length})`}
                              </button>

                              {expandedItemId === ev.id && (
                                <div className="max-h-[200px] overflow-y-auto border border-soft rounded-lg bg-warm/25 p-2 flex flex-col gap-2 custom-scrollbar">
                                  {itemInscricoes.map((ins, index) => (
                                    <div key={ins.id} className="text-[11px] bg-white p-2 rounded-md border border-soft/50 shadow-sm">
                                      <div className="font-semibold text-forest">#{index + 1} - {ins.nomeCompleto}</div>
                                      <div className="text-forest/70 mt-0.5">
                                        <p>📞 {ins.whatsapp}</p>
                                        <p>✉️ {ins.email}</p>
                                        <p>💼 {ins.profissao}</p>
                                        {ins.mensagem && <p className="italic mt-1 bg-warm/40 p-1 rounded text-[10px]">💬 {ins.mensagem}</p>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
                
                {/* Actions Row */}
                <div className="flex items-center gap-2 pt-2 border-t border-soft/60">
                  {profile.role === "profissional" && !isCreator && (
                    <a 
                      href={`${window.location.origin}?evento=${ev.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center py-2.5 bg-forest hover:bg-forest/90 text-white font-serif font-semibold rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-1"
                    >
                      Saiba mais ou inscreva-se
                    </a>
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

      {/* BLOCO DE SERVIÇOS E PARCERIAS DA REDE */}
      {(currentSection === "todos" || currentSection === "servicos") && (
        <>
          {currentSection === "todos" && (
            <div className="flex items-center justify-between pt-4 border-t border-soft/80">
              <h3 className="font-serif text-lg font-bold text-forest flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-forest/70" />
                Serviços & Parcerias da Rede ({servicos.length})
              </h3>
            </div>
          )}

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
                          onClick={() => handleEditUnifiedItem(svc, "servico")}
                          className="bg-blue-50 text-blue-600 p-2 rounded-full hover:bg-blue-100 transition-colors cursor-pointer"
                          title="Editar Serviço"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => handleRemoveUnifiedItem(svc.id, "servico", svc.criadorId)}
                        className="bg-red-50 text-red-600 p-2 rounded-full hover:bg-red-100 transition-colors cursor-pointer"
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

                  {/* Real-time subscriber tracking for the creator or manager */}
                  {(isCreator || isGestor) && (
                    <div className="mt-2 pt-3 border-t border-soft/50 flex flex-col gap-2">
                      {(() => {
                        const itemInscricoes = inscricoes.filter(i => i.itemId === svc.id);
                        const hasVagas = svc.vagas && !isNaN(Number(svc.vagas));
                        const maxVagas = hasVagas ? Number(svc.vagas) : null;
                        const isFull = maxVagas && itemInscricoes.length >= maxVagas;

                        return (
                          <>
                            <div className={`p-3 rounded-xl text-xs flex items-center justify-between font-semibold ${isFull ? "bg-red-50 text-red-800 border border-red-100" : "bg-emerald-50 text-emerald-800 border border-emerald-100"}`}>
                              <span>👥 {itemInscricoes.length} {itemInscricoes.length === 1 ? "inscrito" : "inscritos"} em tempo real {maxVagas ? `de ${maxVagas} vagas` : ""}</span>
                              {isFull && <span className="text-[10px] uppercase bg-red-100 px-2 py-0.5 rounded font-bold">Esgotado</span>}
                            </div>

                            {itemInscricoes.length > 0 && (
                              <div className="flex flex-col gap-1.5">
                                <button 
                                  type="button"
                                  onClick={() => setExpandedItemId(expandedItemId === svc.id ? null : svc.id)}
                                  className="w-full text-center py-1.5 text-[11px] font-bold text-forest bg-warm hover:bg-soft rounded-lg transition-colors border border-soft"
                                >
                                  {expandedItemId === svc.id ? "Ocultar Inscritos" : `Ver Dados dos Inscritos (${itemInscricoes.length})`}
                                </button>

                                {expandedItemId === svc.id && (
                                  <div className="max-h-[200px] overflow-y-auto border border-soft rounded-lg bg-warm/25 p-2 flex flex-col gap-2 custom-scrollbar">
                                    {itemInscricoes.map((ins, index) => (
                                      <div key={ins.id} className="text-[11px] bg-white p-2 rounded-md border border-soft/50 shadow-sm">
                                        <div className="font-semibold text-forest">#{index + 1} - {ins.nomeCompleto}</div>
                                        <div className="text-forest/70 mt-0.5">
                                          <p>📞 {ins.whatsapp}</p>
                                          <p>✉️ {ins.email}</p>
                                          <p>💼 {ins.profissao}</p>
                                          {ins.mensagem && <p className="italic mt-1 bg-warm/40 p-1 rounded text-[10px]">💬 {ins.mensagem}</p>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Actions Row */}
                  <div className="flex items-center gap-2 pt-2 border-t border-soft/60">
                    {profile.role === "profissional" && !isCreator && (
                      <a 
                        href={`${window.location.origin}?servico=${svc.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center py-2.5 bg-forest hover:bg-forest/90 text-white font-serif font-semibold rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-1"
                      >
                        Saiba mais ou inscreva-se
                      </a>
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

      {/* Modal Unificada Padrão: Evento ou Oferta de Serviço */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-forest/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-[2rem] p-6 sm:p-8 shadow-xl flex flex-col items-start relative border border-soft max-h-[90vh] overflow-y-auto">
            <button 
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 text-forest/40 hover:text-forest p-1 rounded-full hover:bg-warm transition-colors cursor-pointer"
            >
              <X className="w-5 h-5"/>
            </button>

            <div className="w-full mb-5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-forest/50 block mb-1">
                {editingId ? "Atualizar Publicação" : "Nova Publicação"}
              </span>
              <h3 className="text-xl sm:text-2xl font-serif text-forest">
                {editingId 
                  ? (unifiedForm.categoria === "evento" ? "Editar Evento" : "Editar Serviço") 
                  : (unifiedForm.categoria === "evento" ? "Criar Novo Evento" : "Ofertar um Serviço")}
              </h3>
            </div>

            {/* Alternador de Categoria no topo da modal */}
            <div className="w-full mb-5 p-1 bg-warm rounded-2xl border border-soft flex items-center">
              <button
                type="button"
                onClick={() => setUnifiedForm(prev => ({ ...prev, categoria: "evento" }))}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  unifiedForm.categoria === "evento"
                    ? "bg-forest text-white shadow-xs"
                    : "text-forest/70 hover:text-forest"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" /> Evento / Workshop
              </button>
              <button
                type="button"
                onClick={() => setUnifiedForm(prev => ({ ...prev, categoria: "servico" }))}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  unifiedForm.categoria === "servico"
                    ? "bg-sun text-forest shadow-xs font-bold"
                    : "text-forest/70 hover:text-forest"
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" /> Serviço / Parceria
              </button>
            </div>

            <form onSubmit={handleSaveUnifiedItem} className="w-full flex flex-col gap-4">
              {/* Título */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">
                  {unifiedForm.categoria === "evento" ? "Título do Evento *" : "Título do Serviço *"}
                </label>
                <input 
                  required 
                  type="text" 
                  placeholder={unifiedForm.categoria === "evento" ? "Ex: Workshop de Regulação Emocional" : "Ex: Supervisão Clínica em TCC ou Sublocação"} 
                  value={unifiedForm.titulo} 
                  onChange={e => setUnifiedForm({...unifiedForm, titulo: e.target.value})} 
                  className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-all text-forest" 
                />
              </div>

              {/* Tipo e Vagas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">
                    Tipo / Formato *
                  </label>
                  <input 
                    required 
                    type="text" 
                    placeholder={unifiedForm.categoria === "evento" ? "Ex: Palestra, Workshop, Roda de Conversa..." : "Ex: Supervisão, Sublocação, Mentoria, Curso..."} 
                    value={unifiedForm.tipo} 
                    onChange={e => setUnifiedForm({...unifiedForm, tipo: e.target.value})} 
                    className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-all text-forest" 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">
                    Vagas (Opcional)
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    placeholder="Ex: 30 (deixe em branco se ilimitado)" 
                    value={unifiedForm.vagas} 
                    onChange={e => setUnifiedForm({...unifiedForm, vagas: e.target.value})} 
                    className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-all text-forest" 
                  />
                </div>
              </div>

              {/* Data e Hora */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">
                    Data {unifiedForm.categoria === "evento" ? "*" : "(Opcional)"}
                  </label>
                  <input 
                    required={unifiedForm.categoria === "evento"}
                    type="date" 
                    value={unifiedForm.data} 
                    onChange={e => setUnifiedForm({...unifiedForm, data: e.target.value})} 
                    className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-all text-forest" 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">
                    Hora (Opcional)
                  </label>
                  <input 
                    type="time" 
                    value={unifiedForm.hora} 
                    onChange={e => setUnifiedForm({...unifiedForm, hora: e.target.value})} 
                    className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-all text-forest" 
                  />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">
                  Descrição Completa *
                </label>
                <textarea 
                  required 
                  rows={4} 
                  placeholder={unifiedForm.categoria === "evento" 
                    ? "Descreva os tópicos do evento, objetivo, para quem se destina e metodologia..." 
                    : "Descreva a proposta do serviço, horários disponíveis, diferenciais clínicos..."} 
                  value={unifiedForm.descricao} 
                  onChange={e => setUnifiedForm({...unifiedForm, descricao: e.target.value})} 
                  className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-all text-forest custom-scrollbar" 
                />
              </div>

              {/* Investimento / Gratuito */}
              <div className="grid grid-cols-5 gap-4 items-end">
                <div className="col-span-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">
                    Valor / Investimento (Opcional)
                  </label>
                  <input 
                    type="text" 
                    disabled={unifiedForm.isGratuito} 
                    placeholder="Ex: R$ 120,00 ou sob consulta" 
                    value={unifiedForm.valor} 
                    onChange={e => setUnifiedForm({...unifiedForm, valor: e.target.value})} 
                    className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-all text-forest disabled:opacity-50" 
                  />
                </div>
                <div className="col-span-2 flex items-center justify-center p-3 bg-white border border-soft rounded-xl shadow-xs h-[48px]">
                  <label className="flex items-center gap-2 text-sm font-semibold text-forest cursor-pointer w-full justify-center">
                    <input 
                      type="checkbox" 
                      checked={unifiedForm.isGratuito} 
                      onChange={e => {
                        const checked = e.target.checked;
                        setUnifiedForm({...unifiedForm, isGratuito: checked, valor: checked ? "" : unifiedForm.valor});
                      }} 
                      className="w-4 h-4 accent-forest" 
                    />
                    Gratuito
                  </label>
                </div>
              </div>

              {/* Requisitos */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">
                  Requisitos para Participação (Opcional)
                </label>
                <textarea 
                  rows={2} 
                  placeholder="Ex: CRP ativo, ser estudante de psicologia, levar notebook..." 
                  value={unifiedForm.requisitos} 
                  onChange={e => setUnifiedForm({...unifiedForm, requisitos: e.target.value})} 
                  className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-all text-forest" 
                />
              </div>

              {/* Link Externo de Inscrição */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">
                  Link Externo de Inscrição / Sympla / Formulário (Opcional)
                </label>
                <input 
                  type="url" 
                  placeholder="https://..." 
                  value={unifiedForm.linkInscricao} 
                  onChange={e => setUnifiedForm({...unifiedForm, linkInscricao: e.target.value})} 
                  className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none focus:border-sun-dark transition-all text-forest" 
                />
              </div>

              {/* Opções de Contato e Inscrição */}
              <div className="border-t border-soft pt-4 flex flex-col gap-4">
                <h4 className="text-sm font-serif font-bold text-forest">Opções de Contato e Inscrição</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">
                      E-mail de Contato
                    </label>
                    <input 
                      type="email" 
                      value={unifiedForm.contatoEmail} 
                      onChange={e => setUnifiedForm({...unifiedForm, contatoEmail: e.target.value})} 
                      className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none text-forest" 
                      placeholder="email@exemplo.com" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">
                      Telefone / WhatsApp
                    </label>
                    <input 
                      type="text" 
                      value={unifiedForm.contatoTelefone} 
                      onChange={e => setUnifiedForm({...unifiedForm, contatoTelefone: e.target.value})} 
                      className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none text-forest" 
                      placeholder="(00) 00000-0000" 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">
                    Canal Preferencial para Dúvidas
                  </label>
                  <select 
                    value={unifiedForm.contatoPreferencial} 
                    onChange={e => setUnifiedForm({...unifiedForm, contatoPreferencial: e.target.value as any})} 
                    className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none text-forest cursor-pointer"
                  >
                    <option value="email">E-mail</option>
                    <option value="whatsapp">Telefone / WhatsApp</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-forest/70 mb-2 block">
                    Modo de Inscrição dos Interessados
                  </label>
                  <select 
                    value={unifiedForm.modoInscricao} 
                    onChange={e => setUnifiedForm({...unifiedForm, modoInscricao: e.target.value as any})} 
                    className="w-full px-4 py-3 bg-warm border border-soft rounded-xl focus:outline-none text-forest cursor-pointer"
                  >
                    <option value="plataforma">Pela plataforma (com lista de inscritos em tempo real)</option>
                    <option value="contato">Direto com o organizador (botão WhatsApp / E-mail)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 p-3 bg-white border border-soft rounded-xl shadow-xs">
                  <label className="flex items-center gap-2 text-xs font-semibold text-forest cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={unifiedForm.solicitarComprovante} 
                      onChange={e => setUnifiedForm({...unifiedForm, solicitarComprovante: e.target.checked})} 
                      className="w-4 h-4 accent-forest" 
                    />
                    Solicitar comprovante ou credencial para confirmação de inscrição
                  </label>
                </div>
              </div>

              <button 
                disabled={!unifiedForm.titulo || !unifiedForm.descricao || !unifiedForm.tipo} 
                type="submit" 
                className={`w-full mt-4 py-3.5 font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-xs ${
                  unifiedForm.categoria === "evento"
                    ? "bg-forest text-white hover:bg-forest/90"
                    : "bg-sun text-forest hover:bg-sun-dark"
                }`}
              >
                {editingId 
                  ? "Salvar Alterações" 
                  : (unifiedForm.categoria === "evento" ? "Publicar Evento" : "Publicar Serviço")}
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
