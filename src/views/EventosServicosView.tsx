import React, { useState, useEffect, useRef } from "react";
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, orderBy, where } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { Calendar, Clock, Plus, Trash2, Briefcase, X, Edit3, User, Share2, ExternalLink, CreditCard, ImagePlus, Loader2, Check, Maximize2, Award, Printer, ShieldCheck, Copy, AlertCircle } from "lucide-react";
import { compressThematicImage, formatEventDateDisplay } from "../utils/eventImageHelper";
import { DocumentoPsicologicoItem } from "../types/documentos";

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
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);
  const [certificadosEmitidos, setCertificadosEmitidos] = useState<(DocumentoPsicologicoItem & { eventoServicoId?: string; cargaHoraria?: string; inscricaoId?: string })[]>([]);
  const [certificadoVisualizar, setCertificadoVisualizar] = useState<(DocumentoPsicologicoItem & { eventoServicoId?: string; cargaHoraria?: string }) | null>(null);
  const [avulsoCertModalItem, setAvulsoCertModalItem] = useState<any | null>(null);
  const [avulsoParticipanteNome, setAvulsoParticipanteNome] = useState("");
  const [avulsoParticipanteCpf, setAvulsoParticipanteCpf] = useState("");
  const [isEmittingCertKey, setIsEmittingCertKey] = useState<string | null>(null);
  const [copiedCertLink, setCopiedCertLink] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Formulário Padrão Unificado (O mais completo, abrangendo Eventos e Serviços)
  const [unifiedForm, setUnifiedForm] = useState({
    categoria: "evento" as "evento" | "servico",
    titulo: "",
    tipo: "", // Ex: Palestra, Workshop, Supervisão, Sublocação, Cursos...
    descricao: "",
    data: "",
    hora: "",
    ofereceCertificado: false,
    cargaHoraria: "",
    vagas: "" as string | number,
    isGratuito: false,
    valor: "",
    imagemUrl: "",
    imagemModoExibicao: "capa" as "capa" | "cartaz",
    imagemPosicaoY: 50,
    linkInscricao: "",
    requisitos: "",
    solicitarComprovante: false,
    contatoEmail: profile.email || "",
    contatoTelefone: profile.telefone || profile.whatsapp || profile.phone || "",
    contatoPreferencial: "email" as "email" | "whatsapp",
    modoInscricao: "plataforma" as "contato" | "plataforma",
  });

  const resetUnifiedForm = (initialCat: "evento" | "servico" = "evento") => {
    setImageUploadError(null);
    setUnifiedForm({
      categoria: initialCat,
      titulo: "",
      tipo: "",
      descricao: "",
      data: "",
      hora: "",
      ofereceCertificado: false,
      cargaHoraria: "",
      vagas: "",
      isGratuito: false,
      valor: "",
      imagemUrl: "",
      imagemModoExibicao: "capa",
      imagemPosicaoY: 50,
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

    const qCertificados = uid
      ? query(collection(db, "documentos_psicologicos"), where("profissionalId", "==", uid))
      : null;
    const unsubCertificados = qCertificados
      ? onSnapshot(
          qCertificados,
          (snap) => {
            const lista = snap.docs
              .map((d) => ({ id: d.id, ...(d.data() as any) }))
              .filter((d) => d.tipo === "certificado");
            setCertificadosEmitidos(lista);
          },
          (error) => {
            console.error("Error in certificados snapshot:", error);
          }
        )
      : () => {};

    return () => {
      unsubEventos();
      unsubServicos();
      unsubInscricoes();
      unsubCertificados();
    };
  }, [profile.uid, profile.id, profile.role]);

  const handleEmitirCertificado = async (
    item: any,
    participante: { id?: string; nome: string; cpf?: string; email?: string }
  ) => {
    const uid = profile.uid || profile.id;
    if (!uid || !participante.nome.trim()) return;

    const emitKey = `${item.id}_${participante.id || participante.nome.trim()}`;
    setIsEmittingCertKey(emitKey);
    try {
      const cargaHorariaTexto = (item.cargaHoraria || "").trim() || "Carga horária conforme programação";
      const dataEventoTexto = item.data ? formatEventDateDisplay(item.data) : "";
      const profNome = profile.name || item.criadorNome || "Profissional Responsável";
      const numeroEmissao = `CERT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const cpfTrecho = participante.cpf?.trim()
        ? `, inscrito(a) no CPF sob o nº ${participante.cpf.trim()},`
        : "";
      const tipoAtividadeLabel =
        item.categoria === "servico"
          ? `da atividade / formação "${item.titulo}"`
          : `do evento "${item.titulo}"`;
      const dataTrecho = dataEventoTexto ? `, realizado(a) em ${dataEventoTexto}` : "";

      const conteudoCertificado = `Certificamos, para os devidos fins, que ${participante.nome.trim()}${cpfTrecho} participou com aproveitamento ${tipoAtividadeLabel}${item.tipo ? ` (${item.tipo})` : ""}, promovido(a) por ${profNome}${dataTrecho}, totalizando carga horária de ${cargaHorariaTexto}.`;

      const novoDoc: Record<string, any> = {
        profissionalId: uid,
        pacienteId: participante.id || "participante_evento",
        pacienteNome: participante.nome.trim(),
        tipo: "certificado",
        titulo: "CERTIFICADO DE PARTICIPAÇÃO",
        numeroEmissao,
        dataEmissao: new Date().toISOString(),
        finalidade: `${item.titulo} • Carga Horária: ${cargaHorariaTexto}`,
        conteudo: conteudoCertificado,
        configuracaoPaginas: 1,
        eventoServicoId: item.id,
        inscricaoId: participante.id || "",
        cargaHoraria: cargaHorariaTexto,
        perfilProfissionalUsado: {
          nome: profNome,
          crp: profile.crp || "",
          profissao: profile.profissao || "Psicólogo(a)",
          registroConselho: profile.crp || "",
          nomeEmpresa:
            profile.companyData?.companyName ||
            profile.dadosPJ?.nomeFantasia ||
            profile.dadosPJ?.razaoSocial ||
            "",
          cnpj: profile.companyData?.cnpj || profile.dadosPJ?.cnpj || "",
          contato: profile.email || profile.telefone || "",
        },
        whiteLabelEnabled: Boolean(profile.whiteLabelEnabled),
        whiteLabelConfig: profile.whiteLabelConfig || null,
        companyData: profile.companyData || null,
        createdAt: serverTimestamp(),
      };

      if (profile.assinatura?.dados) {
        novoDoc.assinatura = {
          tipo: profile.assinatura.tipo || "desenhada",
          dados: profile.assinatura.dados,
        };
      }

      const docRef = await addDoc(collection(db, "documentos_psicologicos"), novoDoc);
      const savedCert = {
        ...(novoDoc as any),
        id: docRef.id,
      };
      setCertificadoVisualizar(savedCert);
      setAvulsoCertModalItem(null);
      setAvulsoParticipanteNome("");
      setAvulsoParticipanteCpf("");
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "documentos_psicologicos");
    } finally {
      setIsEmittingCertKey(null);
    }
  };

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
        ofereceCertificado: Boolean(unifiedForm.ofereceCertificado),
        cargaHoraria: unifiedForm.ofereceCertificado ? unifiedForm.cargaHoraria.trim() : "",
        vagas: unifiedForm.vagas || "",
        isGratuito: unifiedForm.isGratuito,
        valor: unifiedForm.isGratuito ? "" : (unifiedForm.valor || ""),
        imagemUrl: unifiedForm.imagemUrl || "",
        imagemModoExibicao: unifiedForm.imagemModoExibicao || "capa",
        imagemPosicaoY: typeof unifiedForm.imagemPosicaoY === "number" ? unifiedForm.imagemPosicaoY : 50,
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
      setImageUploadError("Não foi possível salvar a publicação. Verifique sua conexão e tente novamente.");
    }
  };

  const handleSelectImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploadError(null);
    setIsUploadingImage(true);
    try {
      const optimizedDataUrl = await compressThematicImage(file, 1200);
      setUnifiedForm((prev) => ({
        ...prev,
        imagemUrl: optimizedDataUrl,
      }));
    } catch (err: any) {
      console.error("Erro ao otimizar imagem temática:", err);
      setImageUploadError(err?.message || "Erro ao processar a imagem selecionada.");
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleEditUnifiedItem = (item: any, category: "evento" | "servico") => {
    setImageUploadError(null);
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
      ofereceCertificado: Boolean(item.ofereceCertificado),
      cargaHoraria: item.cargaHoraria || "",
      vagas: item.vagas || "",
      isGratuito: !!item.isGratuito,
      valor: item.valor || "",
      imagemUrl: item.imagemUrl || "",
      imagemModoExibicao: item.imagemModoExibicao === "cartaz" ? "cartaz" : "capa",
      imagemPosicaoY: typeof item.imagemPosicaoY === "number" ? item.imagemPosicaoY : 50,
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
      setCopiedShareId(ev.id);
      setTimeout(() => setCopiedShareId((prev) => (prev === ev.id ? null : prev)), 2500);
    }).catch(err => {
      console.error("Erro ao copiar link:", err);
    });
  };

  const handleShareServico = (svc: any) => {
    const url = `${window.location.origin}?servico=${svc.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedShareId(svc.id);
      setTimeout(() => setCopiedShareId((prev) => (prev === svc.id ? null : prev)), 2500);
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
              <div key={ev.id} className="bg-white rounded-[2rem] shadow-md border border-soft hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden relative">
                {ev.imagemUrl && (
                  <div className="w-full aspect-[16/9] bg-forest/5 relative overflow-hidden border-b border-soft/70">
                    {ev.imagemModoExibicao === "cartaz" ? (
                      <>
                        <img
                          src={ev.imagemUrl}
                          alt=""
                          aria-hidden="true"
                          referrerPolicy="no-referrer"
                          className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-45 pointer-events-none"
                        />
                        <img
                          src={ev.imagemUrl}
                          alt={ev.titulo}
                          referrerPolicy="no-referrer"
                          className="relative z-10 w-full h-full object-contain p-2"
                        />
                      </>
                    ) : (
                      <img
                        src={ev.imagemUrl}
                        alt={ev.titulo}
                        referrerPolicy="no-referrer"
                        style={{ objectPosition: `50% ${typeof ev.imagemPosicaoY === "number" ? ev.imagemPosicaoY : 50}%` }}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                )}

                <div className="p-6 flex flex-col gap-5 flex-1 relative">
                {(isCreator || isGestor) && (
                  <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                    <button 
                      onClick={() => handleEditUnifiedItem(ev, "evento")}
                      className="bg-blue-50 text-blue-600 p-2 rounded-full hover:bg-blue-100 transition-colors cursor-pointer shadow-2xs"
                      title="Editar evento"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleRemoveUnifiedItem(ev.id, "evento", ev.criadorId)}
                      className="bg-red-50 text-red-600 p-2 rounded-full hover:bg-red-100 transition-colors cursor-pointer shadow-2xs"
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
                <p className="text-xs text-forest/75 leading-relaxed whitespace-pre-wrap flex-1 bg-warm/15 p-3.5 rounded-2xl border border-soft/30 line-clamp-4">
                  {ev.descricao}
                </p>
                
                {/* Information organized in lines (Rows) */}
                <div className="bg-warm/25 rounded-2xl border border-soft/50 p-4 flex flex-col gap-2.5 text-xs text-forest/85 tabular-nums">
                  <div className="flex items-center justify-between py-1 border-b border-soft/30">
                    <span className="text-forest/50 font-medium flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-forest/40" /> Data:
                    </span>
                    <span className="font-semibold text-forest/90">{ev.data ? formatEventDateDisplay(ev.data) : "A combinar"}</span>
                  </div>
                  
                  <div className="flex items-center justify-between py-1 border-b border-soft/30">
                    <span className="text-forest/50 font-medium flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-forest/40" /> Horário:
                    </span>
                    <span className="font-semibold text-forest/90">{ev.hora || "A combinar"}</span>
                  </div>

                  {ev.ofereceCertificado && ev.cargaHoraria && (
                    <div className="flex items-center justify-between py-1 border-b border-soft/30">
                      <span className="text-forest/50 font-medium flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-emerald-600" /> Certificado:
                      </span>
                      <span className="font-semibold text-emerald-700">Incluso ({ev.cargaHoraria})</span>
                    </div>
                  )}

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

                          {ev.ofereceCertificado && ev.cargaHoraria && (
                            <button
                              type="button"
                              onClick={() => {
                                setAvulsoCertModalItem(ev);
                                setAvulsoParticipanteNome("");
                                setAvulsoParticipanteCpf("");
                              }}
                              className="w-full py-1.5 px-3 text-[11px] font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Award className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Emitir Certificado ({ev.cargaHoraria})</span>
                            </button>
                          )}

                          {itemInscricoes.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                              <button 
                                type="button"
                                onClick={() => setExpandedItemId(expandedItemId === ev.id ? null : ev.id)}
                                className="w-full text-center py-1.5 text-[11px] font-bold text-forest bg-warm hover:bg-soft rounded-lg transition-colors border border-soft cursor-pointer"
                              >
                                {expandedItemId === ev.id ? "Ocultar Inscritos" : `Ver Dados dos Inscritos (${itemInscricoes.length})`}
                              </button>

                              {expandedItemId === ev.id && (
                                <div className="max-h-[240px] overflow-y-auto border border-soft rounded-lg bg-warm/25 p-2 flex flex-col gap-2 custom-scrollbar">
                                  {itemInscricoes.map((ins, index) => {
                                    const certExistente = certificadosEmitidos.find(
                                      (c) =>
                                        c.eventoServicoId === ev.id &&
                                        (c.inscricaoId === ins.id ||
                                          c.pacienteNome?.toLowerCase() === (ins.nomeCompleto || "").trim().toLowerCase())
                                    );
                                    const emitKey = `${ev.id}_${ins.id || ins.nomeCompleto}`;
                                    return (
                                      <div key={ins.id} className="text-[11px] bg-white p-2.5 rounded-md border border-soft/50 shadow-sm space-y-1.5">
                                        <div className="font-semibold text-forest">#{index + 1} - {ins.nomeCompleto}</div>
                                        <div className="text-forest/70">
                                          <p>📞 {ins.whatsapp}</p>
                                          <p>✉️ {ins.email}</p>
                                          <p>💼 {ins.profissao}</p>
                                          {ins.mensagem && <p className="italic mt-1 bg-warm/40 p-1 rounded text-[10px]">💬 {ins.mensagem}</p>}
                                        </div>
                                        {ev.ofereceCertificado && ev.cargaHoraria && (
                                          <div className="pt-1.5 border-t border-soft/50 flex items-center justify-end gap-1.5">
                                            {certExistente ? (
                                              <button
                                                type="button"
                                                onClick={() => setCertificadoVisualizar(certExistente)}
                                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                              >
                                                <Award className="w-3 h-3" />
                                                <span>Ver Certificado Emitido</span>
                                              </button>
                                            ) : (
                                              <button
                                                type="button"
                                                disabled={isEmittingCertKey === emitKey}
                                                onClick={() =>
                                                  handleEmitirCertificado(ev, {
                                                    id: ins.id,
                                                    nome: ins.nomeCompleto || "Participante",
                                                    email: ins.email,
                                                  })
                                                }
                                                className="px-2.5 py-1 bg-forest hover:bg-forest/90 text-white rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                              >
                                                {isEmittingCertKey === emitKey ? (
                                                  <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                  <Award className="w-3 h-3 text-sun" />
                                                )}
                                                <span>Emitir Certificado</span>
                                              </button>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
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
                  <button onClick={() => handleShareEvento(ev)} className="p-2 border border-soft rounded-xl text-forest/70 hover:bg-forest hover:text-white transition-colors bg-warm cursor-pointer relative" title="Copiar link público do evento">
                    {copiedShareId === ev.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                    {copiedShareId === ev.id && (
                      <span className="absolute -top-8 right-0 bg-forest text-white text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap">
                        Link copiado!
                      </span>
                    )}
                  </button>
                </div>
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
                <div key={svc.id} className="bg-white rounded-[2rem] shadow-md border border-soft hover:shadow-lg transition-all duration-300 flex flex-col overflow-hidden relative">
                  {svc.imagemUrl && (
                    <div className="w-full aspect-[16/9] bg-forest/5 relative overflow-hidden border-b border-soft/70">
                      {svc.imagemModoExibicao === "cartaz" ? (
                        <>
                          <img
                            src={svc.imagemUrl}
                            alt=""
                            aria-hidden="true"
                            referrerPolicy="no-referrer"
                            className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-45 pointer-events-none"
                          />
                          <img
                            src={svc.imagemUrl}
                            alt={svc.titulo}
                            referrerPolicy="no-referrer"
                            className="relative z-10 w-full h-full object-contain p-2"
                          />
                        </>
                      ) : (
                        <img
                          src={svc.imagemUrl}
                          alt={svc.titulo}
                          referrerPolicy="no-referrer"
                          style={{ objectPosition: `50% ${typeof svc.imagemPosicaoY === "number" ? svc.imagemPosicaoY : 50}%` }}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  )}

                  <div className="p-6 flex flex-col gap-5 flex-1 relative">
                   {canRemove && (
                    <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                      {(isCreator || isGestor) && (
                        <button 
                          onClick={() => handleEditUnifiedItem(svc, "servico")}
                          className="bg-blue-50 text-blue-600 p-2 rounded-full hover:bg-blue-100 transition-colors cursor-pointer shadow-2xs"
                          title="Editar Serviço"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => handleRemoveUnifiedItem(svc.id, "servico", svc.criadorId)}
                        className="bg-red-50 text-red-600 p-2 rounded-full hover:bg-red-100 transition-colors cursor-pointer shadow-2xs"
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
                  <p className="text-xs text-forest/75 leading-relaxed whitespace-pre-wrap flex-1 bg-warm/15 p-3.5 rounded-2xl border border-soft/30 line-clamp-4">
                    {svc.descricao}
                  </p>

                  {/* Information organized in lines (Rows) */}
                  <div className="bg-warm/25 rounded-2xl border border-soft/50 p-4 flex flex-col gap-2.5 text-xs text-forest/85 tabular-nums">
                    {svc.data && (
                      <div className="flex items-center justify-between py-1 border-b border-soft/30">
                        <span className="text-forest/50 font-medium flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-forest/40" /> Data:
                        </span>
                        <span className="font-semibold text-forest/90">{formatEventDateDisplay(svc.data)}</span>
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

                    {svc.ofereceCertificado && svc.cargaHoraria && (
                      <div className="flex items-center justify-between py-1 border-b border-soft/30">
                        <span className="text-forest/50 font-medium flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-emerald-600" /> Certificado:
                        </span>
                        <span className="font-semibold text-emerald-700">Incluso ({svc.cargaHoraria})</span>
                      </div>
                    )}

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

                            {svc.ofereceCertificado && svc.cargaHoraria && (
                              <button
                                type="button"
                                onClick={() => {
                                  setAvulsoCertModalItem(svc);
                                  setAvulsoParticipanteNome("");
                                  setAvulsoParticipanteCpf("");
                                }}
                                className="w-full py-1.5 px-3 text-[11px] font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Award className="w-3.5 h-3.5 text-emerald-700" />
                                <span>Emitir Certificado ({svc.cargaHoraria})</span>
                              </button>
                            )}

                            {itemInscricoes.length > 0 && (
                              <div className="flex flex-col gap-1.5">
                                <button 
                                  type="button"
                                  onClick={() => setExpandedItemId(expandedItemId === svc.id ? null : svc.id)}
                                  className="w-full text-center py-1.5 text-[11px] font-bold text-forest bg-warm hover:bg-soft rounded-lg transition-colors border border-soft cursor-pointer"
                                >
                                  {expandedItemId === svc.id ? "Ocultar Inscritos" : `Ver Dados dos Inscritos (${itemInscricoes.length})`}
                                </button>

                                {expandedItemId === svc.id && (
                                  <div className="max-h-[240px] overflow-y-auto border border-soft rounded-lg bg-warm/25 p-2 flex flex-col gap-2 custom-scrollbar">
                                    {itemInscricoes.map((ins, index) => {
                                      const certExistente = certificadosEmitidos.find(
                                        (c) =>
                                          c.eventoServicoId === svc.id &&
                                          (c.inscricaoId === ins.id ||
                                            c.pacienteNome?.toLowerCase() === (ins.nomeCompleto || "").trim().toLowerCase())
                                      );
                                      const emitKey = `${svc.id}_${ins.id || ins.nomeCompleto}`;
                                      return (
                                        <div key={ins.id} className="text-[11px] bg-white p-2.5 rounded-md border border-soft/50 shadow-sm space-y-1.5">
                                          <div className="font-semibold text-forest">#{index + 1} - {ins.nomeCompleto}</div>
                                          <div className="text-forest/70">
                                            <p>📞 {ins.whatsapp}</p>
                                            <p>✉️ {ins.email}</p>
                                            <p>💼 {ins.profissao}</p>
                                            {ins.mensagem && <p className="italic mt-1 bg-warm/40 p-1 rounded text-[10px]">💬 {ins.mensagem}</p>}
                                          </div>
                                          {svc.ofereceCertificado && svc.cargaHoraria && (
                                            <div className="pt-1.5 border-t border-soft/50 flex items-center justify-end gap-1.5">
                                              {certExistente ? (
                                                <button
                                                  type="button"
                                                  onClick={() => setCertificadoVisualizar(certExistente)}
                                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                                >
                                                  <Award className="w-3 h-3" />
                                                  <span>Ver Certificado Emitido</span>
                                                </button>
                                              ) : (
                                                <button
                                                  type="button"
                                                  disabled={isEmittingCertKey === emitKey}
                                                  onClick={() =>
                                                    handleEmitirCertificado(svc, {
                                                      id: ins.id,
                                                      nome: ins.nomeCompleto || "Participante",
                                                      email: ins.email,
                                                    })
                                                  }
                                                  className="px-2.5 py-1 bg-forest hover:bg-forest/90 text-white rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                                >
                                                  {isEmittingCertKey === emitKey ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                  ) : (
                                                    <Award className="w-3 h-3 text-sun" />
                                                  )}
                                                  <span>Emitir Certificado</span>
                                                </button>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
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
                    <button onClick={() => handleShareServico(svc)} className="p-2 border border-soft rounded-xl text-forest/70 hover:bg-forest hover:text-white transition-colors bg-warm cursor-pointer relative" title="Copiar link público do serviço">
                      {copiedShareId === svc.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                      {copiedShareId === svc.id && (
                        <span className="absolute -top-8 right-0 bg-forest text-white text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap">
                          Link copiado!
                        </span>
                      )}
                    </button>
                  </div>
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

              {/* Upload de Imagem Temática / Cartaz de Divulgação */}
              <div className="bg-warm/35 border border-soft rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-forest/80 block">
                      Imagem Temática ou Cartaz de Divulgação (Opcional)
                    </label>
                    <p className="text-[11px] text-forest/60 mt-0.5">
                      Valoriza o anúncio na rede, na sua página profissional e na prévia de compartilhamento.
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSelectImageFile}
                    className="hidden"
                  />
                </div>

                {!unifiedForm.imagemUrl ? (
                  <button
                    type="button"
                    disabled={isUploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-6 px-4 rounded-xl border-2 border-dashed border-forest/20 hover:border-forest/45 bg-white/80 hover:bg-white transition-all flex flex-col items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isUploadingImage ? (
                      <>
                        <Loader2 className="w-6 h-6 text-forest animate-spin" />
                        <span className="text-xs font-semibold text-forest">Otimizando imagem em alta nitidez...</span>
                      </>
                    ) : (
                      <>
                        <span className="w-10 h-10 rounded-xl bg-forest/5 text-forest flex items-center justify-center">
                          <ImagePlus className="w-5 h-5" />
                        </span>
                        <span className="text-xs font-bold text-forest">
                          Clique para enviar foto temática ou flyer do evento
                        </span>
                        <span className="text-[11px] text-forest/55">
                          JPG, PNG ou WebP • Ajuste automático para carregamento rápido
                        </span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex flex-col gap-3">
                    {/* Seletor de Modo de Enquadramento */}
                    <div className="flex items-center p-1 bg-white rounded-xl border border-soft text-xs">
                      <button
                        type="button"
                        onClick={() => setUnifiedForm((prev) => ({ ...prev, imagemModoExibicao: "capa" }))}
                        className={`flex-1 py-1.5 px-2.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                          unifiedForm.imagemModoExibicao !== "cartaz"
                            ? "bg-forest text-white shadow-2xs"
                            : "text-forest/70 hover:text-forest"
                        }`}
                      >
                        Capa Panorâmica (16:9)
                      </button>
                      <button
                        type="button"
                        onClick={() => setUnifiedForm((prev) => ({ ...prev, imagemModoExibicao: "cartaz" }))}
                        className={`flex-1 py-1.5 px-2.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 ${
                          unifiedForm.imagemModoExibicao === "cartaz"
                            ? "bg-forest text-white shadow-2xs"
                            : "text-forest/70 hover:text-forest"
                        }`}
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        Cartaz / Flyer Inteiro
                      </button>
                    </div>

                    {/* Pré-visualização ao vivo */}
                    <div className="w-full rounded-xl overflow-hidden border border-soft bg-forest/5 relative">
                      {unifiedForm.imagemModoExibicao === "cartaz" ? (
                        <div className="w-full h-56 relative flex items-center justify-center overflow-hidden">
                          <img
                            src={unifiedForm.imagemUrl}
                            alt=""
                            aria-hidden="true"
                            referrerPolicy="no-referrer"
                            className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-45 pointer-events-none"
                          />
                          <img
                            src={unifiedForm.imagemUrl}
                            alt="Prévia do cartaz"
                            referrerPolicy="no-referrer"
                            className="relative z-10 max-h-full max-w-full object-contain p-2"
                          />
                        </div>
                      ) : (
                        <div className="w-full aspect-[16/9] overflow-hidden">
                          <img
                            src={unifiedForm.imagemUrl}
                            alt="Prévia da capa temática"
                            referrerPolicy="no-referrer"
                            style={{ objectPosition: `50% ${unifiedForm.imagemPosicaoY}%` }}
                            className="w-full h-full object-cover transition-all duration-75"
                          />
                        </div>
                      )}
                    </div>

                    {unifiedForm.imagemModoExibicao !== "cartaz" && (
                      <div className="flex items-center gap-3 px-1">
                        <span className="text-[11px] font-semibold text-forest/70 whitespace-nowrap">
                          Foco vertical:
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={unifiedForm.imagemPosicaoY}
                          onChange={(e) =>
                            setUnifiedForm((prev) => ({
                              ...prev,
                              imagemPosicaoY: Number(e.target.value),
                            }))
                          }
                          className="flex-1 accent-forest cursor-pointer"
                        />
                        <span className="text-[11px] font-mono text-forest/65 tabular-nums w-9 text-right">
                          {unifiedForm.imagemPosicaoY}%
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        disabled={isUploadingImage}
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-warm border border-soft text-xs font-semibold text-forest transition-colors cursor-pointer"
                      >
                        {isUploadingImage ? "Processando..." : "Trocar Imagem"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setUnifiedForm((prev) => ({
                            ...prev,
                            imagemUrl: "",
                            imagemModoExibicao: "capa",
                            imagemPosicaoY: 50,
                          }))
                        }
                        className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-xs font-semibold text-red-700 transition-colors cursor-pointer"
                      >
                        Remover Imagem
                      </button>
                    </div>
                  </div>
                )}

                {imageUploadError && (
                  <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    {imageUploadError}
                  </p>
                )}
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

              {/* Certificado de Participação & Carga Horária (Somente na criação/edição) */}
              <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-2xl space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={unifiedForm.ofereceCertificado}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setUnifiedForm({
                        ...unifiedForm,
                        ofereceCertificado: checked,
                        cargaHoraria: checked ? unifiedForm.cargaHoraria : "",
                      });
                    }}
                    className="w-4 h-4 mt-0.5 accent-forest cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-forest flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-emerald-700" />
                      Oferecer Certificado de Participação com Carga Horária
                    </span>
                    <p className="text-[11px] text-forest/65 leading-snug">
                      A emissão do certificado puxará automaticamente estes dados e sua assinatura digital padrão cadastrada no Meu Perfil.
                    </p>
                  </div>
                </label>

                {unifiedForm.ofereceCertificado && (
                  <div className="pt-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-forest/75 mb-1.5 block">
                      Carga Horária Total *
                    </label>
                    <input
                      required={unifiedForm.ofereceCertificado}
                      type="text"
                      placeholder="Ex: 4 horas, 8 horas, 12h..."
                      value={unifiedForm.cargaHoraria}
                      onChange={(e) => setUnifiedForm({ ...unifiedForm, cargaHoraria: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border border-emerald-200 rounded-xl focus:outline-none focus:border-forest transition-all text-sm text-forest font-semibold"
                    />
                  </div>
                )}
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

      {/* MODAL PARA EMISSÃO DE CERTIFICADO (SELECIONAR INSCRITO OU AVULSO — PUXANDO DADOS AUTOMATICAMENTE) */}
      {avulsoCertModalItem && (
        <div className="fixed inset-0 bg-forest/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-[2rem] p-6 sm:p-8 shadow-2xl border border-soft space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                  <Award className="w-3 h-3" /> Emissão Automática
                </span>
                <h3 className="text-lg sm:text-xl font-serif font-bold text-forest mt-1.5">
                  Emitir Certificado de Participação
                </h3>
                <p className="text-xs text-forest/65 mt-0.5">
                  Título, data ({avulsoCertModalItem.data ? formatEventDateDisplay(avulsoCertModalItem.data) : "conforme evento"}), carga horária (<strong>{avulsoCertModalItem.cargaHoraria}</strong>) e assinatura padrão são preenchidos automaticamente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAvulsoCertModalItem(null)}
                className="p-1.5 rounded-full text-forest/50 hover:text-forest hover:bg-warm transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!profile.assinatura?.dados && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Você ainda não cadastrou sua assinatura única em <strong>Meu Perfil → Dados & Conta</strong>. O certificado será gerado com linha de assinatura até que você a cadastre uma única vez no perfil.
                </span>
              </div>
            )}

            {(() => {
              const listaInscritosItem = inscricoes.filter((i) => i.itemId === avulsoCertModalItem.id);
              return listaInscritosItem.length > 0 ? (
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-forest/70">
                    Inscritos pela Plataforma ({listaInscritosItem.length})
                  </label>
                  <div className="max-h-44 overflow-y-auto border border-soft rounded-xl divide-y divide-soft/60 bg-warm/20">
                    {listaInscritosItem.map((ins) => {
                      const certJa = certificadosEmitidos.find(
                        (c) =>
                          c.eventoServicoId === avulsoCertModalItem.id &&
                          (c.inscricaoId === ins.id ||
                            c.pacienteNome?.toLowerCase() === (ins.nomeCompleto || "").trim().toLowerCase())
                      );
                      const emitKey = `${avulsoCertModalItem.id}_${ins.id || ins.nomeCompleto}`;
                      return (
                        <div key={ins.id} className="p-2.5 px-3 flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0">
                            <p className="font-bold text-forest truncate">{ins.nomeCompleto}</p>
                            <p className="text-[11px] text-forest/60 truncate">{ins.email}</p>
                          </div>
                          {certJa ? (
                            <button
                              type="button"
                              onClick={() => {
                                setAvulsoCertModalItem(null);
                                setCertificadoVisualizar(certJa);
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shrink-0 cursor-pointer"
                            >
                              Ver Certificado
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isEmittingCertKey === emitKey}
                              onClick={() =>
                                handleEmitirCertificado(avulsoCertModalItem, {
                                  id: ins.id,
                                  nome: ins.nomeCompleto || "Participante",
                                  email: ins.email,
                                })
                              }
                              className="px-3 py-1.5 bg-forest hover:bg-forest/90 text-white rounded-lg text-[11px] font-bold shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-1"
                            >
                              {isEmittingCertKey === emitKey && <Loader2 className="w-3 h-3 animate-spin" />}
                              <span>Emitir</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null;
            })()}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!avulsoParticipanteNome.trim()) return;
                handleEmitirCertificado(avulsoCertModalItem, {
                  nome: avulsoParticipanteNome.trim(),
                  cpf: avulsoParticipanteCpf.trim() || undefined,
                });
              }}
              className="space-y-3 pt-2 border-t border-soft"
            >
              <label className="block text-xs font-bold uppercase tracking-wider text-forest/70">
                Emitir para Participante (Inscrição Direta / Externa)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <input
                    required
                    type="text"
                    placeholder="Nome completo do(a) participante *"
                    value={avulsoParticipanteNome}
                    onChange={(e) => setAvulsoParticipanteNome(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-warm border border-soft rounded-xl text-xs text-forest font-semibold focus:outline-none focus:border-forest"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="CPF (opcional)"
                    value={avulsoParticipanteCpf}
                    onChange={(e) => setAvulsoParticipanteCpf(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-warm border border-soft rounded-xl text-xs text-forest focus:outline-none focus:border-forest"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={!avulsoParticipanteNome.trim() || Boolean(isEmittingCertKey)}
                className="w-full py-3 bg-forest hover:bg-forest/90 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isEmittingCertKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4 text-sun" />}
                <span>Gerar Certificado Oficial ({avulsoCertModalItem.cargaHoraria})</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO / IMPRESSÃO / LINK PÚBLICO DO CERTIFICADO EMITIDO */}
      {certificadoVisualizar && (() => {
        const wlEnabled = Boolean(certificadoVisualizar.whiteLabelEnabled || profile.whiteLabelEnabled);
        const primaryColor = wlEnabled
          ? (certificadoVisualizar.whiteLabelConfig?.primaryColor || profile.whiteLabelConfig?.primaryColor || "#1b3022")
          : "#1b3022";
        const secondaryColor = wlEnabled
          ? (certificadoVisualizar.whiteLabelConfig?.secondaryColor || profile.whiteLabelConfig?.secondaryColor || "#f59e0b")
          : "#f59e0b";
        const logoUrl = wlEnabled
          ? (certificadoVisualizar.companyData?.logoUrl || profile.companyData?.logoUrl || "")
          : "";
        const profInfo = (certificadoVisualizar.perfilProfissionalUsado || {}) as any;
        const linkVerificacao = `${window.location.origin}/?documento=${certificadoVisualizar.id}&codigo=${encodeURIComponent(certificadoVisualizar.numeroEmissao)}`;

        return (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:bg-white print:p-0">
            <div className="w-full max-w-4xl flex flex-col gap-3 my-auto">
              {/* Barra de Ações (Oculta na impressão) */}
              <div className="bg-forest text-white px-4 py-3 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-2 print:hidden">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-sun" />
                  <span className="text-xs sm:text-sm font-serif font-bold">
                    Certificado Emitido • {certificadoVisualizar.numeroEmissao}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(linkVerificacao);
                      setCopiedCertLink(true);
                      setTimeout(() => setCopiedCertLink(false), 2500);
                    }}
                    className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedCertLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCertLink ? "Link Copiado!" : "Copiar Link do Participante"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3.5 py-1.5 bg-sun text-forest hover:bg-sun/90 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir / Salvar PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCertificadoVisualizar(null)}
                    className="p-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Folha do Certificado */}
              <div
                className="bg-white rounded-2xl shadow-2xl border-2 p-8 sm:p-14 flex flex-col justify-between min-h-[520px] text-slate-900 print:shadow-none print:border-slate-300"
                style={{ borderColor: `${primaryColor}33` }}
              >
                <div className="flex items-center justify-between pb-6 border-b" style={{ borderColor: `${primaryColor}25` }}>
                  <div className="flex items-center gap-3.5">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="h-12 max-w-[160px] object-contain" />
                    ) : (
                      <div
                        className="w-11 h-11 rounded-full text-white font-bold flex items-center justify-center text-base shrink-0"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {(profInfo.nome || "P").charAt(0)}
                      </div>
                    )}
                    <div>
                      <h4 className="font-serif font-bold text-sm sm:text-base" style={{ color: primaryColor }}>
                        {profInfo.nomeEmpresa || profInfo.nome || "Profissional Responsável"}
                      </h4>
                      <p className="text-[11px] text-slate-600 font-mono">
                        {profInfo.profissao || "Psicólogo(a)"}
                        {profInfo.crp ? ` • CRP ${profInfo.crp}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-[11px] font-mono text-slate-500">
                    <p className="font-bold" style={{ color: primaryColor }}>{certificadoVisualizar.numeroEmissao}</p>
                    <p>{new Date(certificadoVisualizar.dataEmissao).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>

                <div className="my-10 text-center space-y-6 px-2 sm:px-6">
                  <div>
                    <h2
                      className="text-xl sm:text-3xl font-serif font-bold uppercase tracking-widest underline decoration-2 underline-offset-8"
                      style={{ color: primaryColor, textDecorationColor: secondaryColor }}
                    >
                      {certificadoVisualizar.titulo}
                    </h2>
                    {certificadoVisualizar.cargaHoraria && (
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-3">
                        Carga Horária Total Certificada: <span style={{ color: primaryColor }}>{certificadoVisualizar.cargaHoraria}</span>
                      </p>
                    )}
                  </div>

                  <p className="text-sm sm:text-base leading-relaxed text-slate-800 max-w-2xl mx-auto">
                    {certificadoVisualizar.conteudo}
                  </p>
                </div>

                <div className="pt-8 border-t border-slate-200 space-y-6">
                  <div className="flex flex-col items-center justify-center text-center">
                    {certificadoVisualizar.assinatura?.dados ? (
                      <div className="mb-1.5 h-20 flex items-center justify-center">
                        <img
                          src={certificadoVisualizar.assinatura.dados}
                          alt="Assinatura Profissional"
                          className="max-h-20 max-w-[240px] object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-60 border-b border-slate-400 mb-2 h-10" />
                    )}
                    <p className="font-bold text-sm text-slate-900">{profInfo.nome}</p>
                    <p className="text-xs text-slate-600 font-mono">
                      {profInfo.profissao || "Psicólogo(a)"}
                      {profInfo.crp ? ` • CRP ${profInfo.crp}` : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 font-mono border-t border-slate-100 pt-3">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Autenticidade verificável em {window.location.origin} • Código: {certificadoVisualizar.numeroEmissao}</span>
                    </span>
                    <span>Emitido em {new Date(certificadoVisualizar.dataEmissao).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
