import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  BookOpen,
  User,
  Tag,
  ArrowLeft,
  Share2,
  Calendar,
  Clock,
  Heart,
  PlusCircle,
  Sparkles,
  ExternalLink,
  MessageCircle,
  Phone,
  Check,
  Filter,
  X,
  ChevronRight,
  ShieldCheck,
  LayoutDashboard,
  HeartHandshake,
} from "lucide-react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  getDoc,
  updateDoc,
  increment,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { ArtigoBlog } from "../types/blog";
import { BlogCard } from "../components/BlogCard";
import { Breadcrumbs } from "../components/Breadcrumbs";
import logoImage from "../assets/images/logo_acolhe.jpeg";

interface BlogViewProps {
  initialArtigoId?: string | null;
  onNavigate?: (view: any) => void;
  onGoHome?: () => void;
  onSelectProf?: (profUid: string) => void;
}

export function BlogView({
  initialArtigoId,
  onNavigate,
  onGoHome,
  onSelectProf,
}: BlogViewProps) {
  const [artigos, setArtigos] = useState<ArtigoBlog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArtigo, setSelectedArtigo] = useState<ArtigoBlog | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("Todas");
  const [copySuccess, setCopySuccess] = useState(false);
  const [liked, setLiked] = useState(false);

  const handleGoHome = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (onGoHome) {
      onGoHome();
    } else if (onNavigate) {
      onNavigate("landing");
    } else {
      window.location.href = window.location.origin;
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  // Carregar artigos publicados do Firestore em tempo real
  useEffect(() => {
    const q = query(collection(db, "artigos_blog"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: ArtigoBlog[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          // Exibir apenas artigos que foram aprovados e publicados pela Gestão
          if (data.status === "publicado") {
            list.push({
              id: docSnap.id,
              ...data,
            });
          }
        });
        setArtigos(list);
        setLoading(false);
      },
      (error) => {
        console.warn("Erro ao ouvir artigos_blog no Firestore:", error);
        setArtigos([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Selecionar artigo inicial se passado por URL
  useEffect(() => {
    if (initialArtigoId && artigos.length > 0) {
      const found = artigos.find((a) => a.id === initialArtigoId);
      if (found) {
        setSelectedArtigo(found);
      }
    }
  }, [initialArtigoId, artigos]);

  // Atualizar URL ao selecionar um artigo
  const handleSelectArtigo = (artigo: ArtigoBlog) => {
    setSelectedArtigo(artigo);
    setLiked(false);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("artigo", artigo.id || "");
      url.searchParams.delete("view");
      window.history.pushState({}, "", url.toString());
    } catch (e) {
      console.error(e);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Incrementar visualizações se tiver id no Firestore
    if (artigo.id && !artigo.id.includes("seeds")) {
      try {
        updateDoc(doc(db, "artigos_blog", artigo.id), {
          visualizacoes: increment(1),
        }).catch(() => {});
      } catch (e) {}
    }
  };

  const handleBackToList = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    setSelectedArtigo(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("artigo");
      url.searchParams.set("view", "blog");
      window.history.pushState({}, "", url.toString());
    } catch (e) {
      console.error(e);
    }
  };

  // Extrair todas as tags únicas
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    artigos.forEach((art) => {
      if (art.palavrasChave && Array.isArray(art.palavrasChave)) {
        art.palavrasChave.forEach((t) => tagSet.add(t.trim().toLowerCase()));
      }
    });
    return Array.from(tagSet);
  }, [artigos]);

  // Categorias disponíveis
  const categories = useMemo(() => {
    const catSet = new Set<string>();
    artigos.forEach((art) => {
      if (art.categoria) catSet.add(art.categoria);
    });
    return ["Todas", ...Array.from(catSet)];
  }, [artigos]);

  // Filtragem de artigos
  const filteredArtigos = useMemo(() => {
    return artigos.filter((art) => {
      const matchesSearch =
        !searchTerm.trim() ||
        art.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        art.resumo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        art.autorNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (art.palavrasChave &&
          art.palavrasChave.some((k) =>
            k.toLowerCase().includes(searchTerm.toLowerCase())
          ));

      const matchesTag =
        !selectedTag ||
        (art.palavrasChave &&
          art.palavrasChave.map((t) => t.toLowerCase()).includes(selectedTag.toLowerCase()));

      const matchesCat =
        selectedCategory === "Todas" || art.categoria === selectedCategory;

      return matchesSearch && matchesTag && matchesCat;
    });
  }, [artigos, searchTerm, selectedTag, selectedCategory]);

  const handleShareArticle = (artigo: ArtigoBlog) => {
    const url = `${window.location.origin}${window.location.pathname}?artigo=${artigo.id || ""}`;
    if (navigator.share) {
      navigator
        .share({
          title: artigo.titulo,
          text: `Leia este artigo no AcolheMente: ${artigo.titulo}`,
          url: url,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 3000);
      });
    }
  };

  const handleLike = (artigo: ArtigoBlog) => {
    if (liked) return;
    setLiked(true);
    if (artigo.id) {
      try {
        updateDoc(doc(db, "artigos_blog", artigo.id), {
          curtidas: increment(1),
        }).catch(() => {});
      } catch (e) {}
    }
  };

  // Artigos relacionados baseados em tags compartilhadas
  const relatedArticles = useMemo(() => {
    if (!selectedArtigo) return [];
    return artigos
      .filter((a) => a.id !== selectedArtigo.id)
      .filter((a) =>
        a.palavrasChave?.some((t) =>
          selectedArtigo.palavrasChave?.includes(t)
        )
      )
      .slice(0, 3);
  }, [artigos, selectedArtigo]);

  // Renderizar conteúdo com formatação básica
  const renderFormattedArticleBody = (conteudo: string) => {
    const lines = conteudo.split("\n");
    return (
      <div className="space-y-6 text-forest/90 leading-relaxed font-sans text-base sm:text-lg">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-3" />;

          // H2
          if (trimmed.startsWith("## ")) {
            return (
              <h2
                key={idx}
                className="font-serif text-2xl sm:text-3xl font-bold text-forest pt-6 pb-2 border-b border-soft"
              >
                {trimmed.replace(/^##\s+/, "")}
              </h2>
            );
          }

          // H3
          if (trimmed.startsWith("### ")) {
            return (
              <h3
                key={idx}
                className="font-serif text-xl sm:text-2xl font-semibold text-forest pt-4"
              >
                {trimmed.replace(/^###\s+/, "")}
              </h3>
            );
          }

          // Quote
          if (trimmed.startsWith("> ")) {
            return (
              <blockquote
                key={idx}
                className="border-l-4 border-sun bg-warm/50 p-5 rounded-r-2xl italic text-forest font-serif text-lg leading-relaxed my-6 shadow-2xs"
              >
                {trimmed.replace(/^>\s+/, "")}
              </blockquote>
            );
          }

          // List item
          if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            return (
              <li key={idx} className="ml-6 list-disc text-forest/85">
                {renderInlineStyles(trimmed.replace(/^[-*]\s+/, ""))}
              </li>
            );
          }

          // Numbered list item
          if (/^\d+\.\s+/.test(trimmed)) {
            return (
              <li key={idx} className="ml-6 list-decimal text-forest/85">
                {renderInlineStyles(trimmed.replace(/^\d+\.\s+/, ""))}
              </li>
            );
          }

          // Divider
          if (trimmed === "---" || trimmed === "***") {
            return <hr key={idx} className="my-8 border-soft" />;
          }

          return <p key={idx}>{renderInlineStyles(line)}</p>;
        })}
      </div>
    );
  };

  const renderInlineStyles = (str: string) => {
    const parts = str.split(/(\*\*.*?\*\*|\*.*?\*|<u>.*?<\/u>)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-bold text-forest">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <em key={index} className="italic text-forest/90">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith("<u>") && part.endsWith("</u>")) {
        return <u key={index}>{part.slice(3, -4)}</u>;
      }
      return part;
    });
  };

  return (
    <div className="min-h-screen bg-[#FCFBF7] text-forest flex flex-col items-center">
      {/* Header / Navbar */}
      <header className="w-full max-w-5xl px-4 sm:px-6 py-6 flex items-center justify-between gap-4 border-b border-soft bg-warm/60 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={selectedArtigo ? handleBackToList : handleGoHome}
            className="flex items-center gap-2 text-forest/70 hover:text-forest font-medium text-xs sm:text-sm py-2 px-3.5 hover:bg-forest/5 rounded-full border border-forest/10 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            {selectedArtigo ? "Todos os Artigos" : "Voltar para Home"}
          </button>
        </div>

        {/* Brand Center / Right */}
        <button
          onClick={handleGoHome}
          className="flex items-center gap-3 hover:opacity-90 transition-all p-1 rounded-2xl hover:bg-forest/5 cursor-pointer text-left"
          title="Ir para a página inicial do AcolheMente"
        >
          <div className="w-10 h-10 bg-sun rounded-full flex items-center justify-center text-forest overflow-hidden shrink-0 shadow-sm border border-forest/10">
            <img
              src={logoImage}
              alt="AcolheMente Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="hidden sm:block">
            <span className="font-serif font-semibold text-base tracking-tight text-forest block">
              AcolheMente Blog
            </span>
            <span className="text-[10px] text-forest/60 block -mt-0.5">
              Conhecimento & Acolhimento Aberto
            </span>
          </div>
        </button>

        {/* Header Right / Navigation */}
        <div className="flex items-center gap-2">
          {auth.currentUser ? (
            <button
              onClick={() => onNavigate && onNavigate("dashboard")}
              className="px-4 py-2 bg-forest hover:bg-forest/90 text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-sun" />
              <span>Meu Painel</span>
            </button>
          ) : (
            <button
              onClick={handleGoHome}
              className="px-4 py-2 bg-forest hover:bg-forest/90 text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-sm hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <HeartHandshake className="w-3.5 h-3.5 text-sun" />
              <span className="hidden sm:inline">Conhecer o Projeto</span>
              <span className="sm:hidden">Início</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-5xl px-4 sm:px-6 py-8 flex-1 flex flex-col">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: "Início", onClick: handleGoHome },
            {
              label: "Blog & Artigos",
              onClick: selectedArtigo ? handleBackToList : undefined,
              active: !selectedArtigo,
            },
            ...(selectedArtigo
              ? [{ label: selectedArtigo.titulo, active: true }]
              : []),
          ]}
          className="px-0 mb-6"
        />

        {/* ========================================================================= */}
        {/* VIEW 1: LEITURA COMPLETA DE ARTIGO ABERTO AO PÚBLICO                       */}
        {/* ========================================================================= */}
        {selectedArtigo ? (
          <article className="w-full max-w-3xl mx-auto flex flex-col gap-8 animate-fade-in pb-16">
            {/* Top Article Header */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                {selectedArtigo.categoria && (
                  <span className="px-3.5 py-1 bg-sun/40 text-forest text-xs font-bold uppercase tracking-wider rounded-full">
                    {selectedArtigo.categoria}
                  </span>
                )}
                <div className="flex items-center gap-1.5 text-xs text-forest/60 ml-auto">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{selectedArtigo.tempoLeitura || "4 min de leitura"}</span>
                </div>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-forest leading-tight">
                {selectedArtigo.titulo}
              </h1>

              {selectedArtigo.resumo && (
                <p className="text-forest/75 text-base sm:text-lg leading-relaxed font-sans border-l-2 border-sun pl-4">
                  {selectedArtigo.resumo}
                </p>
              )}

              {/* Author & Share Bar */}
              <div className="flex items-center justify-between gap-4 py-4 border-y border-soft flex-wrap mt-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-forest text-sun flex items-center justify-center font-bold text-sm overflow-hidden border border-forest/10 shadow-xs">
                    {selectedArtigo.autorFoto ? (
                      <img
                        src={selectedArtigo.autorFoto}
                        alt={selectedArtigo.autorNome}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div>
                    <span className="font-serif font-bold text-sm text-forest block">
                      {selectedArtigo.autorNome}
                    </span>
                    <span className="text-xs text-forest/60 block">
                      {selectedArtigo.autorProfissao || "Profissional Parceiro AcolheMente"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleLike(selectedArtigo)}
                    className={`px-3.5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                      liked
                        ? "bg-red-50 text-red-600 border-red-200"
                        : "bg-white text-forest/70 hover:text-forest border-soft hover:bg-warm"
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${liked ? "fill-red-500 text-red-500" : ""}`} />
                    <span>{(selectedArtigo.curtidas || 0) + (liked ? 1 : 0)} curtidas</span>
                  </button>

                  <button
                    onClick={() => handleShareArticle(selectedArtigo)}
                    className="px-3.5 py-2 rounded-full text-xs font-bold bg-white text-forest/70 hover:text-forest border border-soft hover:bg-warm transition-all flex items-center gap-1.5 cursor-pointer relative"
                    title="Compartilhar artigo"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Compartilhar</span>
                    {copySuccess && (
                      <span className="absolute -top-8 right-0 bg-forest text-white text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap">
                        Link copiado!
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Formatted Article Body */}
            <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] border border-soft shadow-xs">
              {renderFormattedArticleBody(selectedArtigo.conteudo)}
            </div>

            {/* Keywords / Tags list */}
            <div className="flex flex-col gap-2 bg-warm/30 p-6 rounded-2xl border border-soft">
              <span className="text-xs font-bold uppercase tracking-wider text-forest/60 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-forest/60" />
                Palavras-chave deste artigo:
              </span>
              <div className="flex flex-wrap gap-2">
                {selectedArtigo.palavrasChave?.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-white text-forest/80 px-3 py-1 rounded-full border border-soft font-medium shadow-2xs"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Author Profile CTA Card */}
            <div className="bg-forest text-white p-6 sm:p-8 rounded-[2rem] shadow-md flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-sun text-forest flex items-center justify-center font-bold text-xl overflow-hidden shrink-0 border-2 border-white/20">
                  {selectedArtigo.autorFoto ? (
                    <img
                      src={selectedArtigo.autorFoto}
                      alt={selectedArtigo.autorNome}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-forest" />
                  )}
                </div>
                <div>
                  <h3 className="font-serif text-lg sm:text-xl font-bold">
                    {selectedArtigo.autorNome}
                  </h3>
                  <p className="text-xs text-white/80 mt-0.5">
                    {selectedArtigo.autorProfissao || "Profissional Parceiro"}
                  </p>
                  <p className="text-[11px] text-sun mt-1">
                    Atendimentos com valores sociais e acolhimento qualificado.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                {selectedArtigo.autorUid && onSelectProf && (
                  <button
                    onClick={() => onSelectProf(selectedArtigo.autorUid!)}
                    className="py-3 px-5 bg-sun text-forest hover:bg-sun-dark font-bold text-xs uppercase tracking-wider rounded-xl transition-all text-center shadow-xs cursor-pointer"
                  >
                    Ver Perfil do Autor
                  </button>
                )}
                <button
                  onClick={handleGoHome}
                  className="py-3 px-5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all text-center border border-white/20 cursor-pointer"
                >
                  Iniciar Acolhimento
                </button>
              </div>
            </div>

            {/* Related Articles Section */}
            {relatedArticles.length > 0 && (
              <div className="flex flex-col gap-4 mt-6">
                <h3 className="font-serif text-xl font-bold text-forest">
                  Artigos Relacionados
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {relatedArticles.map((rel) => (
                    <BlogCard
                      key={rel.id}
                      artigo={rel}
                      onRead={handleSelectArtigo}
                    />
                  ))}
                </div>
              </div>
            )}
          </article>
        ) : (
          /* ========================================================================= */
          /* VIEW 2: LISTAGEM PÚBLICA DE ARTIGOS EM CARDS SIMPLES                      */
          /* ========================================================================= */
          <div className="flex flex-col gap-8 pb-16">
            {/* Blog Hero Banner */}
            <div className="bg-white rounded-[2.5rem] p-6 sm:p-10 md:p-12 border border-soft shadow-xs flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex flex-col gap-3 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-sun/40 text-forest text-xs font-bold uppercase tracking-wider rounded-full">
                    AcolheMente Conhecimento
                  </span>
                  <span className="text-xs text-forest/50">Aberto ao Público</span>
                </div>
                <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-forest leading-tight">
                  Artigos & Reflexões de Profissionais
                </h1>
                <p className="text-forest/75 text-sm sm:text-base leading-relaxed">
                  Espaço aberto onde psicólogos e terapeutas parceiros compartilham textos, orientações e conhecimentos sobre saúde mental, autocuidado e bem-estar.
                </p>
                <div className="flex items-center gap-2 pt-2 text-xs text-forest/70">
                  <Sparkles className="w-4 h-4 text-sun-dark shrink-0" />
                  <span>Conteúdos revisados e publicados por profissionais associados ao AcolheMente.</span>
                </div>
              </div>

              {/* Decorative side illustration box */}
              <div className="hidden md:flex w-48 h-48 rounded-full bg-warm border border-soft items-center justify-center p-6 text-center text-forest shadow-inner shrink-0 relative overflow-hidden">
                <div className="flex flex-col items-center gap-2 relative z-10">
                  <BookOpen className="w-10 h-10 text-forest/80" />
                  <span className="font-serif font-bold text-sm text-forest">
                    {artigos.length} {artigos.length === 1 ? "Artigo" : "Artigos"}
                  </span>
                  <span className="text-[10px] text-forest/60">
                    Leitura acessível & livre
                  </span>
                </div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-sun/30 rounded-full blur-xl" />
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                {/* Search Input */}
                <div className="relative w-full md:max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-forest/40" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por título, autor ou palavra-chave..."
                    className="w-full pl-11 pr-10 py-3 rounded-full border border-soft bg-white text-forest placeholder:text-forest/40 focus:outline-none focus:border-forest/50 focus:ring-2 focus:ring-forest/10 text-sm"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-forest/40 hover:text-forest cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 max-w-full">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? "bg-forest text-white shadow-xs"
                          : "bg-white text-forest/70 hover:bg-warm border border-soft"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tag Badges Filter */}
              {allTags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap text-xs bg-warm/30 p-3 rounded-2xl border border-soft/80">
                  <span className="font-bold text-forest/50 uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <Tag className="w-3 h-3 text-forest/50" />
                    Filtrar por Tag:
                  </span>
                  {selectedTag && (
                    <button
                      onClick={() => setSelectedTag(null)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-forest text-white text-[11px] font-bold cursor-pointer"
                    >
                      #{selectedTag} <X className="w-3 h-3" />
                    </button>
                  )}
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                      className={`px-2.5 py-0.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                        selectedTag === tag
                          ? "bg-forest text-white"
                          : "bg-white text-forest/75 hover:bg-sun/60 border border-soft/60"
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Articles Grid - Simple, Clean Cards */}
            {filteredArtigos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredArtigos.map((artigo) => (
                  <BlogCard
                    key={artigo.id || artigo.titulo}
                    artigo={artigo}
                    onRead={handleSelectArtigo}
                    onSelectTag={(tag) => setSelectedTag(tag)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 text-center border border-soft flex flex-col items-center gap-4">
                <BookOpen className="w-12 h-12 text-forest/30" />
                <h3 className="font-serif text-xl font-bold text-forest">
                  {searchTerm || selectedTag || selectedCategory !== "Todas"
                    ? "Nenhum artigo encontrado com estes filtros"
                    : "Nenhum artigo publicado no momento"}
                </h3>
                <p className="text-sm text-forest/60 max-w-md">
                  {searchTerm || selectedTag || selectedCategory !== "Todas"
                    ? "Não encontramos artigos correspondentes à sua busca. Tente outros termos ou limpe os filtros."
                    : "Em breve nossos profissionais parceiros trarão novos artigos e orientações sobre saúde mental e bem-estar."}
                </p>
                {(searchTerm || selectedTag || selectedCategory !== "Todas") && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedTag(null);
                      setSelectedCategory("Todas");
                    }}
                    className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-forest border border-forest/20 rounded-full hover:bg-warm transition-colors cursor-pointer"
                  >
                    Limpar Filtros
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full bg-warm/50 border-t border-soft py-10 px-6 text-center text-xs text-forest/60 flex flex-col items-center gap-2 mt-auto">
        <p>
          © {new Date().getFullYear()} Projeto AcolheMente Saúde • Textos e artigos abertos para promoção da saúde mental.
        </p>
        <button
          onClick={handleGoHome}
          className="text-xs text-forest/80 hover:text-forest underline underline-offset-4 cursor-pointer font-medium"
        >
          Voltar para a página inicial do projeto
        </button>
      </footer>
    </div>
  );
}
