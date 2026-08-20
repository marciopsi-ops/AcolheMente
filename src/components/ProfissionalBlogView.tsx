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
  Tag,
  Search,
  Sparkles,
  Info,
  X
} from "lucide-react";
import {
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  orderBy
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { ArtigoBlog } from "../types/blog";
import { BlogEditorModal } from "./BlogEditorModal";

interface ProfissionalBlogViewProps {
  profile: any;
  onNavigateToPublicBlog?: () => void;
  onViewArticle?: (artigoId: string) => void;
}

export function ProfissionalBlogView({
  profile,
  onNavigateToPublicBlog,
  onViewArticle,
}: ProfissionalBlogViewProps) {
  const [artigos, setArtigos] = useState<ArtigoBlog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingArtigo, setEditingArtigo] = useState<ArtigoBlog | null>(null);
  const [previewArtigo, setPreviewArtigo] = useState<ArtigoBlog | null>(null);

  useEffect(() => {
    if (!profile?.uid) return;

    // Realtime query for this professional's articles
    const q = query(
      collection(db, "artigos_blog"),
      where("autorUid", "==", profile.uid)
    );

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
        // Sort descending by creation date
        list.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return dateB - dateA;
        });
        setArtigos(list);
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao carregar artigos do profissional:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [profile?.uid]);

  const handleDeleteArtigo = async (artigoId: string, titulo: string) => {
    if (
      !window.confirm(
        `Tem certeza que deseja excluir o artigo "${titulo}"? Esta ação não pode ser desfeita.`
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

  const filteredArtigos = artigos.filter((art) => {
    const matchesSearch =
      !searchQuery.trim() ||
      art.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (art.resumo && art.resumo.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (art.categoria && art.categoria.toLowerCase().includes(searchQuery.toLowerCase())) ||
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
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-soft shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sun-dark">
            <Sparkles className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Área do Associado • Blog & Publicações
            </span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl text-forest font-bold">
            Meus Artigos e Conteúdos
          </h2>
          <p className="text-sm text-forest/70 max-w-2xl leading-relaxed">
            Compartilhe seu conhecimento técnico e reflexões com o público geral.
            Artigos aprovados pela Gestão são publicados no Blog Aberto e também em seu perfil público!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {onNavigateToPublicBlog && (
            <button
              onClick={onNavigateToPublicBlog}
              className="flex-1 md:flex-none px-4 py-2.5 bg-warm hover:bg-soft text-forest text-xs font-bold rounded-xl border border-soft transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <ExternalLink className="w-4 h-4 text-forest/60" />
              <span>Ver Blog Público</span>
            </button>
          )}
          <button
            onClick={() => {
              setEditingArtigo(null);
              setIsEditorOpen(true);
            }}
            className="flex-1 md:flex-none px-5 py-2.5 bg-forest hover:bg-forest/90 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4 text-sun" />
            <span>Escrever Novo Artigo</span>
          </button>
        </div>
      </div>

      {/* Info Card / Editorial Guide */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 text-xs text-amber-950">
        <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Como funciona a publicação de artigos no Projeto AcolheMente?</p>
          <p className="leading-relaxed text-amber-900/90">
            1. Você escreve e submete seu texto formatado com título, resumo, categoria e palavras-chave.<br />
            2. O artigo fica em <strong>Revisão (Pendente)</strong> pela Gestão para alinhamento editorial.<br />
            3. Assim que aprovado, ele recebe o selo <strong>Publicado</strong> e fica disponível para leitura de todos os visitantes da internet e no seu card de apresentação!
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-warm/80 p-1 rounded-2xl border border-soft">
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
          <button
            onClick={() => setStatusFilter("pendente")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              statusFilter === "pendente"
                ? "bg-amber-500 text-white shadow-xs font-bold"
                : "text-forest/60 hover:text-forest"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Em Revisão ({countPendente})
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
          {countRejeitado > 0 && (
            <button
              onClick={() => setStatusFilter("rejeitado")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                statusFilter === "rejeitado"
                  ? "bg-rose-600 text-white shadow-xs font-bold"
                  : "text-forest/60 hover:text-forest"
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Ajustes Solicitados ({countRejeitado})
            </button>
          )}
          {countRascunho > 0 && (
            <button
              onClick={() => setStatusFilter("rascunho")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === "rascunho"
                  ? "bg-white text-forest shadow-xs font-bold"
                  : "text-forest/60 hover:text-forest"
              }`}
            >
              Rascunhos ({countRascunho})
            </button>
          )}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-forest/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar nos meus artigos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-soft rounded-xl focus:outline-none focus:border-forest/40 transition-colors text-forest"
          />
        </div>
      </div>

      {/* Articles Grid / List */}
      {loading ? (
        <div className="p-12 text-center text-forest/60 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-forest border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs">Carregando seus artigos...</p>
        </div>
      ) : filteredArtigos.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-soft text-center flex flex-col items-center gap-4 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-warm flex items-center justify-center text-forest/40">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="max-w-md">
            <h3 className="font-serif text-lg font-bold text-forest">
              {statusFilter === "todos"
                ? "Você ainda não submeteu nenhum artigo"
                : `Nenhum artigo com status "${statusFilter}"`}
            </h3>
            <p className="text-xs text-forest/60 mt-1 leading-relaxed">
              Escreva sobre saúde mental, cuidados psicológicos, rotina clínica ou temas de sua especialidade e fortaleça seu perfil profissional.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingArtigo(null);
              setIsEditorOpen(true);
            }}
            className="mt-2 px-5 py-2.5 bg-forest text-white text-xs font-bold rounded-xl hover:bg-forest/90 transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4 text-sun" /> Escrever Primeiro Artigo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArtigos.map((artigo) => {
            const isPublicado = artigo.status === "publicado";
            const isPendente = artigo.status === "pendente";
            const isRejeitado = artigo.status === "rejeitado";

            return (
              <div
                key={artigo.id}
                className="bg-white rounded-3xl border border-soft shadow-xs overflow-hidden flex flex-col hover:shadow-md transition-all group"
              >
                {/* Header Image or Category Bar */}
                {artigo.capaUrl ? (
                  <div className="h-40 w-full overflow-hidden bg-warm relative">
                    <img
                      src={artigo.capaUrl}
                      alt={artigo.titulo}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                        {artigo.categoria || "Saúde Mental"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-gradient-to-r from-warm via-white to-warm border-b border-soft flex items-center justify-between">
                    <span className="px-2.5 py-1 bg-sun-light/60 text-forest text-[10px] font-bold rounded-full uppercase tracking-wider border border-sun-dark/20">
                      {artigo.categoria || "Saúde Mental"}
                    </span>
                    <span className="text-[10px] text-forest/50 font-medium">
                      {artigo.tempoLeitura || "3 min de leitura"}
                    </span>
                  </div>
                )}

                {/* Content Box */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    {/* Status Badge */}
                    <div className="flex items-center justify-between gap-2">
                      {isPublicado && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Publicado no Blog
                        </span>
                      )}
                      {isPendente && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Em Revisão pela Gestão
                        </span>
                      )}
                      {isRejeitado && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-200">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          Ajustes Solicitados
                        </span>
                      )}
                      {!isPublicado && !isPendente && !isRejeitado && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-forest/70 bg-warm px-2.5 py-0.5 rounded-full border border-soft">
                          Rascunho
                        </span>
                      )}
                    </div>

                    <h3 className="font-serif text-lg font-bold text-forest leading-snug line-clamp-2">
                      {artigo.titulo}
                    </h3>

                    <p className="text-xs text-forest/70 line-clamp-3 leading-relaxed">
                      {artigo.resumo || artigo.conteudo.slice(0, 120) + "..."}
                    </p>

                    {/* Feedback Rejeição */}
                    {isRejeitado && artigo.motivoRejeicao && (
                      <div className="bg-rose-50/80 border border-rose-200/80 p-2.5 rounded-xl text-[11px] text-rose-900 mt-2">
                        <strong className="block text-[10px] uppercase font-bold text-rose-700">
                          Mensagem da Gestão:
                        </strong>
                        {artigo.motivoRejeicao}
                      </div>
                    )}

                    {/* Tags */}
                    {artigo.palavrasChave && artigo.palavrasChave.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {artigo.palavrasChave.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] text-forest/60 bg-warm px-2 py-0.5 rounded-md border border-soft/60"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions Bottom Bar */}
                  <div className="pt-3 border-t border-soft/60 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPreviewArtigo(artigo)}
                        className="p-2 text-forest/60 hover:text-forest hover:bg-warm rounded-xl transition-colors text-xs font-semibold flex items-center gap-1"
                        title="Pré-visualizar artigo"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Ver</span>
                      </button>

                      <button
                        onClick={() => {
                          setEditingArtigo(artigo);
                          setIsEditorOpen(true);
                        }}
                        className="p-2 text-blue-700 hover:text-blue-800 hover:bg-blue-50 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1"
                        title="Editar artigo"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Editar</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isPublicado && (
                        <button
                          onClick={() => {
                            if (onViewArticle && artigo.id) {
                              onViewArticle(artigo.id);
                            } else {
                              window.open(
                                `${window.location.origin}/?artigo=${artigo.id}`,
                                "_blank"
                              );
                            }
                          }}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-[11px] font-bold transition-colors flex items-center gap-1"
                          title="Abrir no Blog Público"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Ver Online</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteArtigo(artigo.id!, artigo.titulo)}
                        className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Excluir artigo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Blog Editor Modal */}
      {isEditorOpen && (
        <BlogEditorModal
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingArtigo(null);
          }}
          onSuccess={(artigoSalvo) => {
            alert(
              artigoSalvo.status === "publicado"
                ? "Artigo publicado com sucesso!"
                : "Artigo enviado para a fila de revisão da Gestão com sucesso!"
            );
            setIsEditorOpen(false);
            setEditingArtigo(null);
          }}
          editArtigo={editingArtigo}
          currentUserProfile={profile}
          isMaster={false}
        />
      )}

      {/* Quick Preview Modal */}
      {previewArtigo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-soft overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-soft flex items-center justify-between bg-warm/50">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-forest/70" />
                <span className="text-xs font-bold uppercase tracking-wider text-forest/70">
                  Pré-visualização do Artigo
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
                <span className="px-3 py-1 bg-sun-light text-forest text-xs font-bold rounded-full uppercase tracking-wider border border-sun-dark/20">
                  {previewArtigo.categoria}
                </span>
                <h1 className="font-serif text-2xl sm:text-3xl text-forest font-bold leading-tight">
                  {previewArtigo.titulo}
                </h1>
                <div className="flex items-center gap-3 text-xs text-forest/60 pt-1">
                  <span>Por {previewArtigo.autorNome} ({previewArtigo.autorProfissao})</span>
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

            <div className="p-4 border-t border-soft bg-warm/30 flex justify-end gap-3">
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
