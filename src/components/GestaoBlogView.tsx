import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Edit3,
  Trash2,
  ExternalLink,
  Eye,
  Search,
  Sparkles,
  ShieldCheck,
  Check,
  X,
  MessageSquare,
  RefreshCw,
  SlidersHorizontal,
  User,
  Tag
} from "lucide-react";
import {
  collection,
  query,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  getDocs
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { ArtigoBlog } from "../types/blog";
import { BlogEditorModal } from "./BlogEditorModal";

interface GestaoBlogViewProps {
  profile: any;
  onNavigateToPublicBlog?: () => void;
  onViewArticle?: (artigoId: string) => void;
}

export function GestaoBlogView({
  profile,
  onNavigateToPublicBlog,
  onViewArticle,
}: GestaoBlogViewProps) {
  const [artigos, setArtigos] = useState<ArtigoBlog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pendente"); // default to pendente so gestao focuses on pending reviews
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingArtigo, setEditingArtigo] = useState<ArtigoBlog | null>(null);
  const [previewArtigo, setPreviewArtigo] = useState<ArtigoBlog | null>(null);

  // Reject / feedback modal state
  const [rejectModalArtigo, setRejectModalArtigo] = useState<ArtigoBlog | null>(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    // Realtime query for all articles in the platform
    const q = query(collection(db, "artigos_blog"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: ArtigoBlog[] = [];
        snapshot.forEach((docSnap) => {
          list.push({
            id: docSnap.id,
            ...(docSnap.data() as any),
          });
        });

        // Sort: pendentes first, then newest
        list.sort((a, b) => {
          if (a.status === "pendente" && b.status !== "pendente") return -1;
          if (b.status === "pendente" && a.status !== "pendente") return 1;
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return dateB - dateA;
        });

        setArtigos(list);
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao carregar artigos para a Gestão:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleApproveArtigo = async (artigo: ArtigoBlog) => {
    if (!artigo.id) return;
    setActionLoadingId(artigo.id);
    try {
      await updateDoc(doc(db, "artigos_blog", artigo.id), {
        status: "publicado",
        revisadoPor: profile?.name || "Gestão AcolheMente",
        revisadoEm: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Erro ao aprovar artigo:", err);
      alert("Erro ao aprovar artigo. Tente novamente.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectArtigo = async () => {
    if (!rejectModalArtigo?.id) return;
    setActionLoadingId(rejectModalArtigo.id);
    try {
      await updateDoc(doc(db, "artigos_blog", rejectModalArtigo.id), {
        status: "rejeitado",
        motivoRejeicao: motivoRejeicao.trim() || "Por favor, revise o texto e reenvie para aprovação.",
        revisadoPor: profile?.name || "Gestão AcolheMente",
        revisadoEm: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setRejectModalArtigo(null);
      setMotivoRejeicao("");
    } catch (err) {
      console.error("Erro ao solicitar ajustes no artigo:", err);
      alert("Erro ao salvar revisão. Tente novamente.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteArtigo = async (artigoId: string, titulo: string) => {
    if (
      !window.confirm(
        `Tem certeza que deseja EXCLUIR permanentemente o artigo "${titulo}"?`
      )
    ) {
      return;
    }

    try {
      await deleteDoc(doc(db, "artigos_blog", artigoId));
    } catch (err) {
      console.error("Erro ao excluir artigo:", err);
      alert("Erro ao excluir artigo. Tente novamente.");
    }
  };

  const handleClearTestArticles = async () => {
    if (
      !window.confirm(
        "Atenção: Deseja apagar todos os artigos marcados como teste ou zerar o banco de artigos? Esta ação é irreversível."
      )
    ) {
      return;
    }

    try {
      const snap = await getDocs(collection(db, "artigos_blog"));
      let deleted = 0;
      for (const d of snap.docs) {
        await deleteDoc(doc(db, "artigos_blog", d.id));
        deleted++;
      }
      alert(`Limpeza concluída com sucesso! ${deleted} artigo(s) excluído(s).`);
    } catch (err) {
      console.error("Erro ao zerar artigos de teste:", err);
      alert("Erro ao zerar artigos. Tente novamente.");
    }
  };

  const filteredArtigos = artigos.filter((art) => {
    const matchesSearch =
      !searchQuery.trim() ||
      art.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (art.autorNome && art.autorNome.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (art.categoria && art.categoria.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (art.resumo && art.resumo.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (art.palavrasChave && art.palavrasChave.some((p) => p.toLowerCase().includes(searchQuery.toLowerCase())));

    if (!matchesSearch) return false;

    if (statusFilter === "todos") return true;
    return art.status === statusFilter;
  });

  const countPendente = artigos.filter((a) => a.status === "pendente").length;
  const countPublicado = artigos.filter((a) => a.status === "publicado").length;
  const countRascunho = artigos.filter((a) => a.status === "rascunho").length;
  const countRejeitado = artigos.filter((a) => a.status === "rejeitado").length;

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6 md:p-8 flex flex-col gap-6 slide-up bg-[#FCFBF7]">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-soft shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-forest">
            <ShieldCheck className="w-5 h-5 text-sun-dark" />
            <span className="text-xs font-bold uppercase tracking-wider text-forest/70">
              Gestão da Plataforma • Revisão & Moderação de Artigos
            </span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl text-forest font-bold">
            Esteira Editorial do Blog
          </h2>
          <p className="text-sm text-forest/70 max-w-2xl leading-relaxed">
            Gerencie os artigos submetidos pelos profissionais associados. Aprove publicações para exibição no blog aberto ou solicite ajustes com orientações editoriais.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {onNavigateToPublicBlog && (
            <button
              onClick={onNavigateToPublicBlog}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-warm hover:bg-soft text-forest text-xs font-bold rounded-xl border border-soft transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <ExternalLink className="w-4 h-4 text-forest/60" />
              <span>Ver Blog Público</span>
            </button>
          )}
          {artigos.length > 0 && (
            <button
              onClick={handleClearTestArticles}
              className="flex-1 sm:flex-none px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              title="Apagar todos os artigos atuais do banco de dados"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Zerar Artigos de Teste</span>
            </button>
          )}
          <button
            onClick={() => {
              setEditingArtigo(null);
              setIsEditorOpen(true);
            }}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-forest hover:bg-forest/90 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4 text-sun" />
            <span>Novo Artigo (Gestão)</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter("pendente")}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === "pendente"
              ? "bg-amber-500 text-white border-amber-600 shadow-md"
              : "bg-white text-forest border-soft hover:border-amber-400 shadow-2xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-extrabold tracking-wider opacity-80">
              Aguardando Revisão
            </span>
            <Clock className="w-4 h-4" />
          </div>
          <p className="font-serif text-3xl font-extrabold mt-2">
            {countPendente}
          </p>
          <p className="text-[11px] opacity-75 mt-1">
            {countPendente === 1 ? "1 artigo pendente" : `${countPendente} artigos pendentes`}
          </p>
        </div>

        <div
          onClick={() => setStatusFilter("publicado")}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === "publicado"
              ? "bg-emerald-600 text-white border-emerald-700 shadow-md"
              : "bg-white text-forest border-soft hover:border-emerald-400 shadow-2xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-extrabold tracking-wider opacity-80">
              Publicados no Blog
            </span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="font-serif text-3xl font-extrabold mt-2">
            {countPublicado}
          </p>
          <p className="text-[11px] opacity-75 mt-1">
            Visíveis ao público geral
          </p>
        </div>

        <div
          onClick={() => setStatusFilter("rejeitado")}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === "rejeitado"
              ? "bg-rose-600 text-white border-rose-700 shadow-md"
              : "bg-white text-forest border-soft hover:border-rose-400 shadow-2xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-extrabold tracking-wider opacity-80">
              Ajustes Solicitados
            </span>
            <AlertCircle className="w-4 h-4" />
          </div>
          <p className="font-serif text-3xl font-extrabold mt-2">
            {countRejeitado}
          </p>
          <p className="text-[11px] opacity-75 mt-1">
            Devolvidos ao autor
          </p>
        </div>

        <div
          onClick={() => setStatusFilter("todos")}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === "todos"
              ? "bg-forest text-white border-forest shadow-md"
              : "bg-white text-forest border-soft hover:border-forest/40 shadow-2xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-extrabold tracking-wider opacity-80">
              Total de Artigos
            </span>
            <BookOpen className="w-4 h-4" />
          </div>
          <p className="font-serif text-3xl font-extrabold mt-2">
            {artigos.length}
          </p>
          <p className="text-[11px] opacity-75 mt-1">
            Cadastrados na plataforma
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-warm/80 p-1 rounded-2xl border border-soft">
          <button
            onClick={() => setStatusFilter("pendente")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              statusFilter === "pendente"
                ? "bg-amber-500 text-white shadow-xs font-bold"
                : "text-forest/60 hover:text-forest"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Pendentes ({countPendente})
          </button>
          <button
            onClick={() => setStatusFilter("publicado")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              statusFilter === "publicado"
                ? "bg-emerald-600 text-white shadow-xs font-bold"
                : "text-forest/60 hover:text-forest"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Publicados ({countPublicado})
          </button>
          <button
            onClick={() => setStatusFilter("rejeitado")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              statusFilter === "rejeitado"
                ? "bg-rose-600 text-white shadow-xs font-bold"
                : "text-forest/60 hover:text-forest"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Ajustes ({countRejeitado})
          </button>
          <button
            onClick={() => setStatusFilter("todos")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              statusFilter === "todos"
                ? "bg-white text-forest shadow-xs font-bold"
                : "text-forest/60 hover:text-forest"
            }`}
          >
            Todos ({artigos.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-forest/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por título, autor, tema..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-soft rounded-xl focus:outline-none focus:border-forest/40 transition-colors text-forest"
          />
        </div>
      </div>

      {/* Articles List / Review Stream */}
      {loading ? (
        <div className="p-12 text-center text-forest/60 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-forest border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs">Carregando fila editorial...</p>
        </div>
      ) : filteredArtigos.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-soft text-center flex flex-col items-center gap-4 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-warm flex items-center justify-center text-forest/40">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="max-w-md">
            <h3 className="font-serif text-lg font-bold text-forest">
              {statusFilter === "pendente"
                ? "Nenhum artigo aguardando revisão!"
                : `Nenhum artigo encontrado com filtro "${statusFilter}"`}
            </h3>
            <p className="text-xs text-forest/60 mt-1 leading-relaxed">
              {statusFilter === "pendente"
                ? "Todos os artigos submetidos pelos associados já foram moderados e revisados pela equipe."
                : "Quando profissionais publicarem textos, eles aparecerão aqui para sua aprovação."}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredArtigos.map((artigo) => {
            const isPublicado = artigo.status === "publicado";
            const isPendente = artigo.status === "pendente";
            const isRejeitado = artigo.status === "rejeitado";
            const isProcessing = actionLoadingId === artigo.id;

            return (
              <div
                key={artigo.id}
                className={`bg-white rounded-3xl border p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 transition-all hover:shadow-md ${
                  isPendente
                    ? "border-amber-300 bg-amber-50/20"
                    : isPublicado
                    ? "border-emerald-200"
                    : "border-soft"
                }`}
              >
                {/* Left details */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Capa thumbnail */}
                  {artigo.capaUrl ? (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-warm shrink-0 border border-soft/80">
                      <img
                        src={artigo.capaUrl}
                        alt={artigo.titulo}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-warm flex items-center justify-center text-forest/50 shrink-0 border border-soft">
                      <BookOpen className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                  )}

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {isPendente && (
                        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold uppercase rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Aguardando Aprovação
                        </span>
                      )}
                      {isPublicado && (
                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-extrabold uppercase rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Publicado Online
                        </span>
                      )}
                      {isRejeitado && (
                        <span className="px-2.5 py-0.5 bg-rose-100 text-rose-900 border border-rose-300 text-[10px] font-extrabold uppercase rounded-full flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          Ajustes Solicitados
                        </span>
                      )}

                      <span className="text-[10px] font-bold uppercase tracking-wider text-forest/60 bg-warm px-2 py-0.5 rounded-md border border-soft">
                        {artigo.categoria || "Geral"}
                      </span>

                      {artigo.tempoLeitura && (
                        <span className="text-[10px] text-forest/50 font-medium">
                          • {artigo.tempoLeitura}
                        </span>
                      )}
                    </div>

                    <h3 className="font-serif text-lg sm:text-xl font-bold text-forest leading-snug">
                      {artigo.titulo}
                    </h3>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-forest/70">
                      <span className="flex items-center gap-1 font-semibold text-forest">
                        <User className="w-3.5 h-3.5 text-forest/50" />
                        {artigo.autorNome}
                      </span>
                      {artigo.autorProfissao && (
                        <span className="text-forest/50">({artigo.autorProfissao})</span>
                      )}
                      {artigo.revisadoPor && isPublicado && (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-medium border border-emerald-200">
                          Aprovado por: {artigo.revisadoPor}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-forest/70 line-clamp-2 leading-relaxed pt-0.5">
                      {artigo.resumo || artigo.conteudo.slice(0, 150) + "..."}
                    </p>

                    {isRejeitado && artigo.motivoRejeicao && (
                      <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-[11px] text-rose-900 mt-1 max-w-xl">
                        <strong>Motivo / Orientação enviada ao autor:</strong> {artigo.motivoRejeicao}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex flex-wrap lg:flex-col items-center lg:items-end justify-end gap-2 w-full lg:w-auto shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-soft">
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {/* Primary Review Buttons */}
                    {isPendente && (
                      <>
                        <button
                          disabled={isProcessing}
                          onClick={() => handleApproveArtigo(artigo)}
                          className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                          <span>Aprovar & Publicar</span>
                        </button>

                        <button
                          disabled={isProcessing}
                          onClick={() => {
                            setRejectModalArtigo(artigo);
                            setMotivoRejeicao("");
                          }}
                          className="flex-1 sm:flex-none px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Solicitar Ajustes</span>
                        </button>
                      </>
                    )}

                    {isRejeitado && (
                      <button
                        disabled={isProcessing}
                        onClick={() => handleApproveArtigo(artigo)}
                        className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Aprovar Agora</span>
                      </button>
                    )}

                    {isPublicado && (
                      <button
                        onClick={() => {
                          if (onViewArticle && artigo.id) {
                            onViewArticle(artigo.id);
                          } else {
                            window.open(`${window.location.origin}/?artigo=${artigo.id}`, "_blank");
                          }
                        }}
                        className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Ver no Blog</span>
                      </button>
                    )}
                  </div>

                  {/* Secondary Tools */}
                  <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => setPreviewArtigo(artigo)}
                      className="px-3 py-1.5 bg-warm hover:bg-soft text-forest text-xs font-semibold rounded-xl border border-soft transition-colors flex items-center gap-1 cursor-pointer"
                      title="Pré-visualizar texto"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Visualizar</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditingArtigo(artigo);
                        setIsEditorOpen(true);
                      }}
                      className="px-3 py-1.5 bg-warm hover:bg-soft text-forest text-xs font-semibold rounded-xl border border-soft transition-colors flex items-center gap-1 cursor-pointer"
                      title="Editar conteúdo ou formatação"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => handleDeleteArtigo(artigo.id!, artigo.titulo)}
                      className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-rose-200/50 transition-colors"
                      title="Excluir Permanentemente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rejection / Feedback Modal */}
      {rejectModalArtigo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-8 flex flex-col gap-5 shadow-2xl border border-soft animate-in zoom-in-95">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-100 text-rose-700 rounded-2xl">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-forest">
                    Solicitar Ajustes no Artigo
                  </h3>
                  <p className="text-xs text-forest/60">
                    O autor receberá a notificação com sua orientação editorial.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRejectModalArtigo(null)}
                className="p-1 text-forest/40 hover:text-forest rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-forest">Artigo:</span>
              <p className="text-xs font-semibold text-forest/80 bg-warm/60 p-3 rounded-xl border border-soft">
                "{rejectModalArtigo.titulo}" por {rejectModalArtigo.autorNome}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-forest/70">
                Motivo / Recomendações para o Autor *
              </label>
              <textarea
                rows={4}
                value={motivoRejeicao}
                onChange={(e) => setMotivoRejeicao(e.target.value)}
                placeholder="Ex: Por favor, adicione referências ao final ou ajuste o segundo parágrafo para maior clareza..."
                className="w-full text-xs bg-warm/40 border border-soft rounded-2xl p-3.5 focus:outline-none focus:border-sun-dark transition-colors text-forest resize-none leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setRejectModalArtigo(null)}
                className="px-4 py-2 bg-white hover:bg-warm border border-soft text-forest text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleRejectArtigo}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Confirmar e Notificar Autor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal for Master */}
      {isEditorOpen && (
        <BlogEditorModal
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingArtigo(null);
          }}
          onSuccess={(artigoSalvo) => {
            alert("Artigo salvo com sucesso!");
            setIsEditorOpen(false);
            setEditingArtigo(null);
          }}
          editArtigo={editingArtigo}
          currentUserProfile={profile}
          isMaster={true}
        />
      )}

      {/* Preview Modal */}
      {previewArtigo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-soft overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-soft flex items-center justify-between bg-warm/50">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-forest/70" />
                <span className="text-xs font-bold uppercase tracking-wider text-forest/70">
                  Moderação Editorial • Artigo Completo
                </span>
              </div>
              <button
                onClick={() => setPreviewArtigo(null)}
                className="p-1.5 text-forest/60 hover:text-forest hover:bg-warm rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar space-y-6">
              {previewArtigo.capaUrl && (
                <div className="h-64 rounded-2xl overflow-hidden bg-warm">
                  <img
                    src={previewArtigo.capaUrl}
                    alt={previewArtigo.titulo}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-sun-light text-forest text-xs font-bold rounded-full uppercase tracking-wider border border-sun-dark/20">
                    {previewArtigo.categoria}
                  </span>
                  <span className="text-xs text-forest/60 font-medium">
                    Status: <strong>{previewArtigo.status}</strong>
                  </span>
                </div>

                <h1 className="font-serif text-2xl sm:text-3xl text-forest font-bold leading-tight">
                  {previewArtigo.titulo}
                </h1>

                <div className="flex items-center gap-3 text-xs text-forest/60 pt-1">
                  <span>Autor: <strong>{previewArtigo.autorNome}</strong> ({previewArtigo.autorProfissao})</span>
                  <span>•</span>
                  <span>{previewArtigo.tempoLeitura}</span>
                </div>
              </div>

              {previewArtigo.resumo && (
                <p className="text-sm italic text-forest/80 bg-warm/50 p-4 rounded-2xl border-l-4 border-sun-dark">
                  "{previewArtigo.resumo}"
                </p>
              )}

              <div className="text-sm text-forest/90 whitespace-pre-wrap leading-relaxed space-y-4 font-sans">
                {previewArtigo.conteudo}
              </div>

              {previewArtigo.palavrasChave && previewArtigo.palavrasChave.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-4 border-t border-soft">
                  {previewArtigo.palavrasChave.map((kw) => (
                    <span
                      key={kw}
                      className="text-xs font-semibold px-2.5 py-1 bg-warm rounded-lg text-forest/70 border border-soft"
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-soft bg-warm/30 flex items-center justify-between gap-3">
              <div>
                {previewArtigo.status === "pendente" && (
                  <button
                    onClick={() => {
                      handleApproveArtigo(previewArtigo);
                      setPreviewArtigo(null);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Check className="w-4 h-4" /> Aprovar Agora
                  </button>
                )}
              </div>

              <button
                onClick={() => setPreviewArtigo(null)}
                className="px-5 py-2 bg-white hover:bg-warm border border-soft rounded-xl text-xs font-bold text-forest transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
