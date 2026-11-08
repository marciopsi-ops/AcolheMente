import React, { useState, useEffect, useMemo } from "react";
import {
  Building2,
  Search,
  Plus,
  Phone,
  Mail,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Clock,
  Trash2,
  Edit3,
  X,
  BookOpen,
  Users,
  ShieldCheck,
  Filter,
  CheckCircle2,
  AlertCircle,
  Send,
} from "lucide-react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";

export interface FaculdadeLead {
  id: string;
  nomeInstituicao: string;
  tipoSetor: string;
  responsavelNome: string;
  cargo: string;
  email: string;
  telefone: string;
  tipoParceria: string;
  observacoes?: string;
  status: "Novo Contato" | "Em Negociação" | "Parceria Ativa" | "Arquivado";
  anotacoesInternas?: string;
  createdAt?: any;
  updatedAt?: any;
}

export function GestaoFaculdadesView() {
  const [leads, setLeads] = useState<FaculdadeLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedSpaId, setCopiedSpaId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<FaculdadeLead | null>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Modal para cadastro manual direto pela gestão
  const [showNewModal, setShowNewModal] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoSetor, setNovoSetor] = useState("Clínica-Escola (SPA)");
  const [novoResponsavel, setNovoResponsavel] = useState("");
  const [novoCargo, setNovoCargo] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novoTelefone, setNovoTelefone] = useState("");
  const [novoTipoParceria, setNovoTipoParceria] = useState("Continuidade Pós-Clínica-Escola");
  const [novasObservacoes, setNovasObservacoes] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    const q = query(collection(db, "faculdade_leads"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: FaculdadeLead[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as any) });
        });
        setLeads(list);
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao carregar faculdade_leads:", err);
        setLoading(false);
        try {
          handleFirestoreError(err, OperationType.GET, "faculdade_leads");
        } catch (e) {}
      }
    );
    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: FaculdadeLead["status"]) => {
    try {
      await updateDoc(doc(db, "faculdade_leads", id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Erro ao atualizar status do lead institucional:", err);
      handleFirestoreError(err, OperationType.UPDATE, `faculdade_leads/${id}`);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedLead) return;
    setIsSavingNotes(true);
    try {
      await updateDoc(doc(db, "faculdade_leads", selectedLead.id), {
        anotacoesInternas: notesDraft.trim(),
        updatedAt: serverTimestamp(),
      });
      setSelectedLead((prev) => (prev ? { ...prev, anotacoesInternas: notesDraft.trim() } : null));
      setIsEditingNotes(false);
    } catch (err) {
      console.error("Erro ao salvar anotações internas:", err);
      handleFirestoreError(err, OperationType.UPDATE, `faculdade_leads/${selectedLead.id}`);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleDeleteLead = async (id: string, nome: string) => {
    if (!window.confirm(`Deseja realmente remover o registro institucional de "${nome}"?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, "faculdade_leads", id));
      if (selectedLead?.id === id) {
        setSelectedLead(null);
      }
    } catch (err) {
      console.error("Erro ao excluir lead institucional:", err);
      handleFirestoreError(err, OperationType.DELETE, `faculdade_leads/${id}`);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    if (!novoNome.trim() || !novoResponsavel.trim() || !novoEmail.trim() || !novoTelefone.trim()) {
      setCreateError("Preencha todos os campos obrigatórios (*).");
      return;
    }

    setIsCreating(true);
    try {
      await addDoc(collection(db, "faculdade_leads"), {
        nomeInstituicao: novoNome.trim(),
        tipoSetor: novoSetor,
        responsavelNome: novoResponsavel.trim(),
        cargo: novoCargo.trim(),
        email: novoEmail.trim().toLowerCase(),
        telefone: novoTelefone.trim(),
        tipoParceria: novoTipoParceria,
        observacoes: novasObservacoes.trim(),
        status: "Novo Contato",
        createdAt: serverTimestamp(),
      });
      setShowNewModal(false);
      setNovoNome("");
      setNovoResponsavel("");
      setNovoCargo("");
      setNovoEmail("");
      setNovoTelefone("");
      setNovasObservacoes("");
    } catch (err) {
      console.error("Erro ao cadastrar instituição:", err);
      setCreateError("Ocorreu um erro ao salvar o registro.");
      handleFirestoreError(err, OperationType.CREATE, "faculdade_leads");
    } finally {
      setIsCreating(false);
    }
  };

  const getInstitutionLink = (nomeInstituicao: string, forSpa = false) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://acolhemente.com";
    const cleanNome = encodeURIComponent(nomeInstituicao.trim());
    if (forSpa) {
      return `${origin}/?via=estudante&faculdade=${cleanNome}&origem=spa`;
    }
    return `${origin}/?via=estudante&faculdade=${cleanNome}`;
  };

  const handleCopyLink = (lead: FaculdadeLead, forSpa = false) => {
    const url = getInstitutionLink(lead.nomeInstituicao, forSpa);
    navigator.clipboard.writeText(url);
    if (forSpa) {
      setCopiedSpaId(lead.id);
      setTimeout(() => setCopiedSpaId(null), 2500);
    } else {
      setCopiedId(lead.id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter((item) => {
      const matchSearch =
        item.nomeInstituicao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.responsavelNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.telefone && item.telefone.includes(searchTerm)) ||
        item.tipoSetor.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === "todos" ? true : item.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [leads, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = leads.length;
    const novos = leads.filter((l) => l.status === "Novo Contato").length;
    const negociacao = leads.filter((l) => l.status === "Em Negociação").length;
    const ativas = leads.filter((l) => l.status === "Parceria Ativa").length;
    return { total, novos, negociacao, ativas };
  }, [leads]);

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Top Header & Metrics */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white/90 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-soft shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sun/20 border border-sun/40 flex items-center justify-center text-forest shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold text-forest">Faculdades & Clínicas-Escola</h2>
            <p className="text-xs sm:text-sm text-forest/70">
              Gestão de parcerias com SPAs, Núcleos de Apoio (NAE/NAP) e Institutos de Formação.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-forest hover:bg-forest/90 text-white rounded-full font-bold text-xs sm:text-sm shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Instituição</span>
        </button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 bg-white/95 rounded-2xl border border-soft shadow-xs flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-forest/60">Total Registradas</span>
          <span className="font-serif text-2xl sm:text-3xl font-bold text-forest">{stats.total}</span>
        </div>

        <div className="p-4 sm:p-5 bg-amber-50/80 rounded-2xl border border-amber-200/70 shadow-xs flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">Novos Contatos</span>
            {stats.novos > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>
          <span className="font-serif text-2xl sm:text-3xl font-bold text-amber-950">{stats.novos}</span>
        </div>

        <div className="p-4 sm:p-5 bg-blue-50/80 rounded-2xl border border-blue-200/70 shadow-xs flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900">Em Negociação</span>
          <span className="font-serif text-2xl sm:text-3xl font-bold text-blue-950">{stats.negociacao}</span>
        </div>

        <div className="p-4 sm:p-5 bg-emerald-50/80 rounded-2xl border border-emerald-200/70 shadow-xs flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">Parcerias Ativas</span>
          <span className="font-serif text-2xl sm:text-3xl font-bold text-emerald-950">{stats.ativas}</span>
        </div>
      </div>

      {/* Filtros e Barra de Busca */}
      <div className="bg-white/90 p-4 sm:p-5 rounded-3xl border border-soft shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-forest/40" />
          <input
            type="text"
            placeholder="Buscar por instituição, responsável..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-warm border border-soft rounded-full text-xs text-forest focus:outline-none focus:border-forest/40"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar">
          {[
            { id: "todos", label: "Todas" },
            { id: "Novo Contato", label: "Novos" },
            { id: "Em Negociação", label: "Em Negociação" },
            { id: "Parceria Ativa", label: "Ativas" },
            { id: "Arquivado", label: "Arquivadas" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-forest text-white shadow-xs"
                  : "bg-warm/80 text-forest/70 hover:bg-white hover:text-forest"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Cards de Instituições */}
      {loading ? (
        <div className="p-12 text-center text-forest/60 bg-white/70 rounded-3xl border border-soft">
          Carregando registros institucionais...
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="p-12 text-center text-forest/60 bg-white/70 rounded-3xl border border-soft flex flex-col items-center gap-3">
          <BookOpen className="w-8 h-8 text-forest/30" />
          <p className="text-sm">Nenhuma instituição encontrada com os filtros atuais.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredLeads.map((lead) => {
            const cleanPhone = lead.telefone ? lead.telefone.replace(/\D/g, "") : "";
            const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
            const whatsappMsg = encodeURIComponent(
              `Olá ${lead.responsavelNome}, tudo bem? Sou da coordenação do Projeto AcolheMente. Entramos em contato a respeito da solicitação de parceria institucional para a ${lead.nomeInstituicao}. Podemos conversar?`
            );
            const whatsappUrl = `https://wa.me/${formattedPhone}?text=${whatsappMsg}`;

            const isCopied = copiedId === lead.id;
            const isSpaCopied = copiedSpaId === lead.id;

            return (
              <div
                key={lead.id}
                className="bg-white/95 rounded-3xl p-5 sm:p-6 border border-soft shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4 relative group"
              >
                <div className="flex flex-col gap-3">
                  {/* Header do Card */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-forest/10 text-forest">
                        {lead.tipoSetor}
                      </span>
                      <h3 className="font-serif text-lg font-bold text-forest mt-1 leading-snug">
                        {lead.nomeInstituicao}
                      </h3>
                    </div>

                    {/* Status Dropdown */}
                    <select
                      value={lead.status || "Novo Contato"}
                      onChange={(e) => handleUpdateStatus(lead.id, e.target.value as any)}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none ${
                        lead.status === "Novo Contato"
                          ? "bg-amber-100 text-amber-900 border-amber-300"
                          : lead.status === "Em Negociação"
                          ? "bg-blue-100 text-blue-900 border-blue-300"
                          : lead.status === "Parceria Ativa"
                          ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                          : "bg-gray-100 text-gray-700 border-gray-300"
                      }`}
                    >
                      <option value="Novo Contato">Novo Contato</option>
                      <option value="Em Negociação">Em Negociação</option>
                      <option value="Parceria Ativa">Parceria Ativa</option>
                      <option value="Arquivado">Arquivado</option>
                    </select>
                  </div>

                  {/* Informações de Contato */}
                  <div className="p-3 bg-warm/60 rounded-2xl border border-soft/60 flex flex-col gap-1.5 text-xs text-forest/80">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-forest">{lead.responsavelNome}</span>
                      <span className="text-[10px] opacity-75">{lead.cargo || "Responsável"}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px]">
                      <Mail className="w-3.5 h-3.5 shrink-0 text-forest/50" />
                      <span className="truncate">{lead.email}</span>
                    </div>

                    {lead.telefone && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Phone className="w-3.5 h-3.5 shrink-0 text-forest/50" />
                        <span>{lead.telefone}</span>
                      </div>
                    )}
                  </div>

                  {/* Tipo de Parceria & Observações */}
                  <div className="text-xs text-forest/75 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 font-medium text-forest/90">
                      <span className="w-1.5 h-1.5 rounded-full bg-sun-dark" />
                      <span>{lead.tipoParceria}</span>
                    </div>
                    {lead.observacoes && (
                      <p className="text-[11px] italic text-forest/60 bg-warm/30 p-2 rounded-xl border border-soft/40 line-clamp-2">
                        "{lead.observacoes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Bloco de Ações e Links Dedicados */}
                <div className="pt-3 border-t border-soft/60 flex flex-col gap-2">
                  {/* Botões de Ação Direta (WhatsApp e E-mail) */}
                  <div className="flex items-center gap-2">
                    {lead.telefone && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                        title="Iniciar conversa no WhatsApp com mensagem de boas-vindas institucional"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                    <a
                      href={`mailto:${lead.email}?subject=${encodeURIComponent(
                        `Parceria Institucional - Projeto AcolheMente / ${lead.nomeInstituicao}`
                      )}`}
                      className="py-2 px-3 bg-warm hover:bg-white text-forest border border-soft rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      title="Enviar e-mail institucional"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>E-mail</span>
                    </a>

                    <button
                      onClick={() => {
                        setSelectedLead(lead);
                        setNotesDraft(lead.anotacoesInternas || "");
                        setIsEditingNotes(true);
                      }}
                      className="p-2 bg-warm hover:bg-white text-forest/70 hover:text-forest border border-soft rounded-xl transition-colors cursor-pointer"
                      title="Anotações internas da parceria"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteLead(lead.id, lead.nomeInstituicao)}
                      className="p-2 bg-warm hover:bg-rose-50 text-forest/40 hover:text-rose-600 border border-soft rounded-xl transition-colors cursor-pointer"
                      title="Excluir registro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Gerador de Link Institucional Dedicado */}
                  <div className="flex flex-col gap-1.5 bg-warm/50 p-2.5 rounded-2xl border border-soft/60">
                    <span className="text-[10px] uppercase font-bold text-forest/60 tracking-wider">
                      Link Dedicado para Alunos & Pacientes
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopyLink(lead, false)}
                        className={`flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isCopied
                            ? "bg-emerald-600 text-white"
                            : "bg-white hover:bg-forest hover:text-white text-forest border border-soft shadow-2xs"
                        }`}
                        title="Copia link direto que abre a triagem de acolhimento já com o nome da faculdade preenchido"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isCopied ? "Link Geral Copiado!" : "Copiar Link Universitário"}</span>
                      </button>

                      <button
                        onClick={() => handleCopyLink(lead, true)}
                        className={`py-1.5 px-2.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isSpaCopied
                            ? "bg-emerald-600 text-white"
                            : "bg-white hover:bg-forest hover:text-white text-forest border border-soft shadow-2xs"
                        }`}
                        title="Copia link específico com tag de Continuidade Clínica-Escola (fim de ciclo de 6 meses)"
                      >
                        {isSpaCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isSpaCopied ? "Copiado!" : "Link SPA (6m)"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Anotações Internas */}
      {selectedLead && isEditingNotes && (
        <div className="fixed inset-0 bg-forest/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-soft shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-soft pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-forest/60">Anotações Internas</span>
                <h3 className="font-serif text-lg font-bold text-forest">{selectedLead.nomeInstituicao}</h3>
              </div>
              <button
                onClick={() => setIsEditingNotes(false)}
                className="p-1.5 text-forest/50 hover:text-forest hover:bg-warm rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-forest/70 mb-1.5">
                Histórico de conversas, reuniões e alinhamentos:
              </label>
              <textarea
                rows={5}
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                placeholder="Ex: Reunião realizada com Profa. Coordenadora em 10/11. Ficou acordado o encaminhamento de 20 pacientes ao final do semestre..."
                className="w-full p-3 bg-warm border border-soft rounded-2xl text-xs text-forest focus:outline-none focus:border-forest/40 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsEditingNotes(false)}
                className="px-4 py-2 border border-soft text-forest/70 hover:bg-warm rounded-full text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                disabled={isSavingNotes}
                onClick={handleSaveNotes}
                className="px-5 py-2 bg-forest text-white hover:bg-forest/90 rounded-full text-xs font-bold shadow-sm"
              >
                {isSavingNotes ? "Salvando..." : "Salvar Anotações"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro Direto de Instituição */}
      {showNewModal && (
        <div className="fixed inset-0 bg-forest/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-soft shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-soft pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-forest/60">Novo Registro</span>
                <h3 className="font-serif text-lg font-bold text-forest">Cadastrar Instituição / SPA</h3>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="p-1.5 text-forest/50 hover:text-forest hover:bg-warm rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateLead} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-bold text-forest/70 mb-1">Nome da Instituição *</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: USP, PUC-SP, UNIP..."
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  className="w-full px-3.5 py-2 bg-warm border border-soft rounded-xl text-xs text-forest focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-forest/70 mb-1">Setor / Departamento</label>
                  <select
                    value={novoSetor}
                    onChange={(e) => setNovoSetor(e.target.value)}
                    className="w-full px-3 py-2 bg-warm border border-soft rounded-xl text-xs text-forest focus:outline-none"
                  >
                    <option value="Clínica-Escola (SPA)">Clínica-Escola (SPA)</option>
                    <option value="NAE / NAP (Apoio ao Estudante)">NAE / NAP (Apoio)</option>
                    <option value="Coordenação de Psicologia">Coordenação de Psicologia</option>
                    <option value="Instituto de Formação">Instituto de Formação</option>
                    <option value="Centro Acadêmico / Atlética">Centro Acadêmico</option>
                    <option value="Outro Setor">Outro Setor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-forest/70 mb-1">Tipo de Parceria</label>
                  <select
                    value={novoTipoParceria}
                    onChange={(e) => setNovoTipoParceria(e.target.value)}
                    className="w-full px-3 py-2 bg-warm border border-soft rounded-xl text-xs text-forest focus:outline-none"
                  >
                    <option value="Continuidade Pós-Clínica-Escola">Continuidade Pós-Clínica-Escola</option>
                    <option value="Convênio Geral para Universitários">Convênio Geral Universitários</option>
                    <option value="Programa Tripé Formativo para Alunos">Tripé Formativo (Alunos)</option>
                    <option value="Ecossistema Completo">Ecossistema Completo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-forest/70 mb-1">Nome do Responsável *</label>
                  <input
                    required
                    type="text"
                    placeholder="Nome completo..."
                    value={novoResponsavel}
                    onChange={(e) => setNovoResponsavel(e.target.value)}
                    className="w-full px-3.5 py-2 bg-warm border border-soft rounded-xl text-xs text-forest focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-forest/70 mb-1">Cargo / Função</label>
                  <input
                    type="text"
                    placeholder="Ex: Coordenador(a)..."
                    value={novoCargo}
                    onChange={(e) => setNovoCargo(e.target.value)}
                    className="w-full px-3.5 py-2 bg-warm border border-soft rounded-xl text-xs text-forest focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-forest/70 mb-1">E-mail *</label>
                  <input
                    required
                    type="email"
                    placeholder="email@faculdade.edu.br"
                    value={novoEmail}
                    onChange={(e) => setNovoEmail(e.target.value)}
                    className="w-full px-3.5 py-2 bg-warm border border-soft rounded-xl text-xs text-forest focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-forest/70 mb-1">Telefone / WhatsApp *</label>
                  <input
                    required
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={novoTelefone}
                    onChange={(e) => setNovoTelefone(e.target.value)}
                    className="w-full px-3.5 py-2 bg-warm border border-soft rounded-xl text-xs text-forest focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-forest/70 mb-1">Observações Iniciais</label>
                <textarea
                  rows={2}
                  placeholder="Informações adicionais sobre a parceria..."
                  value={novasObservacoes}
                  onChange={(e) => setNovasObservacoes(e.target.value)}
                  className="w-full p-2.5 bg-warm border border-soft rounded-xl text-xs text-forest focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-soft">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 border border-soft text-forest/70 hover:bg-warm rounded-full text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 bg-forest text-white hover:bg-forest/90 rounded-full text-xs font-bold shadow-sm"
                >
                  {isCreating ? "Salvando..." : "Cadastrar Instituição"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
