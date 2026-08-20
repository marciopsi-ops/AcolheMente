import React, { useState, useRef } from "react";
import {
  X,
  Bold,
  Italic,
  Underline,
  Heading2,
  Heading3,
  Quote,
  List,
  ListOrdered,
  Link,
  Minus,
  Sparkles,
  Eye,
  Edit3,
  Check,
  Tag,
  Plus,
  Trash2,
  Upload,
  User,
  BookOpen,
  ClipboardPaste
} from "lucide-react";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { ArtigoBlog } from "../types/blog";

interface BlogEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newArtigo: ArtigoBlog) => void;
  editArtigo?: ArtigoBlog | null;
  currentUserProfile?: any;
  isMaster?: boolean;
}

const CATEGORIAS_SUGERIDAS = [
  "Saúde Mental & Bem-estar",
  "Ansiedade & Estresse",
  "Depressão & Humor",
  "Relações & Família",
  "Saúde no Trabalho & NR1",
  "Autocuidado & Mindfulness",
  "Psicoterapia & Abordagens",
  "Neurociência & Emoções",
];

const PALAVRAS_CHAVE_SUGERIDAS = [
  "ansiedade",
  "psicoterapia",
  "saudemental",
  "acolhimento",
  "autocuidado",
  "burnout",
  "emocoes",
  "mindfulness",
  "trabalho",
  "resiliencia",
  "escutaqualificada",
];

export function BlogEditorModal({
  isOpen,
  onClose,
  onSuccess,
  editArtigo,
  currentUserProfile,
  isMaster = false,
}: BlogEditorModalProps) {
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");

  const [titulo, setTitulo] = useState(editArtigo?.titulo || "");
  const [resumo, setResumo] = useState(editArtigo?.resumo || "");
  const [conteudo, setConteudo] = useState(editArtigo?.conteudo || "");
  const [autorNome, setAutorNome] = useState(
    editArtigo?.autorNome || currentUserProfile?.name || auth.currentUser?.displayName || ""
  );
  const [autorProfissao, setAutorProfissao] = useState(
    editArtigo?.autorProfissao || currentUserProfile?.profissao || "Psicólogo(a) Clínico(a)"
  );
  const [categoria, setCategoria] = useState(
    editArtigo?.categoria || CATEGORIAS_SUGERIDAS[0]
  );
  const [palavrasChave, setPalavrasChave] = useState<string[]>(
    editArtigo?.palavrasChave || ["saudemental", "acolhimento"]
  );
  const [novaTag, setNovaTag] = useState("");
  const [capaUrl, setCapaUrl] = useState(editArtigo?.capaUrl || "");
  const [status, setStatus] = useState<'publicado' | 'pendente' | 'rascunho' | 'rejeitado'>(
    editArtigo?.status || (isMaster ? "publicado" : "pendente")
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!isOpen) return null;

  // Insert formatting wrapper or prefix into textarea
  const insertFormatting = (prefix: string, suffix: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = conteudo.substring(start, end);

    let replacement = "";
    if (selectedText.length > 0) {
      replacement = `${prefix}${selectedText}${suffix}`;
    } else {
      // default placeholder
      replacement = `${prefix}texto${suffix}`;
    }

    const newContent =
      conteudo.substring(0, start) + replacement + conteudo.substring(end);
    setConteudo(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + replacement.length - suffix.length
      );
    }, 50);
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const textarea = textareaRef.current;
        if (!textarea) {
          setConteudo((prev) => (prev ? prev + "\n\n" + text : text));
          return;
        }
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newContent =
          conteudo.substring(0, start) + text + conteudo.substring(end);
        setConteudo(newContent);
      }
    } catch (e) {
      alert("Para colar texto, você também pode usar Ctrl+V (ou Cmd+V) diretamente na caixa de edição.");
    }
  };

  const handleAddTag = (tagToAdd?: string) => {
    const tag = (tagToAdd || novaTag).trim().replace(/^#/, "").toLowerCase();
    if (tag && !palavrasChave.includes(tag)) {
      setPalavrasChave([...palavrasChave, tag]);
      setNovaTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setPalavrasChave(palavrasChave.filter((t) => t !== tagToRemove));
  };

  const handleKeyDownTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Simple estimate of reading time
  const calculateReadingTime = (text: string) => {
    const wordCount = text.trim().split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(wordCount / 200));
    return `${minutes} min de leitura`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!titulo.trim()) {
      setErrorMsg("Por favor, preencha o título do artigo.");
      return;
    }
    if (!conteudo.trim()) {
      setErrorMsg("Por favor, escreva ou cole o conteúdo do artigo.");
      return;
    }
    if (!autorNome.trim()) {
      setErrorMsg("Por favor, informe o nome do autor do artigo.");
      return;
    }
    if (palavrasChave.length === 0) {
      setErrorMsg("Adicione pelo menos 1 palavra-chave para facilitar a busca do artigo.");
      return;
    }

    setIsSubmitting(true);
    try {
      const readingTime = calculateReadingTime(conteudo);
      const chosenStatus = status || (isMaster ? "publicado" : "pendente");
      const articleData: any = {
        titulo: titulo.trim(),
        resumo: resumo.trim() || conteudo.trim().slice(0, 160) + "...",
        conteudo: conteudo.trim(),
        autorNome: autorNome.trim(),
        autorUid: auth.currentUser?.uid || editArtigo?.autorUid || null,
        autorProfissao: autorProfissao.trim(),
        autorFoto: currentUserProfile?.fotoUrl || editArtigo?.autorFoto || null,
        palavrasChave: palavrasChave,
        categoria: categoria,
        capaUrl: capaUrl.trim() || null,
        tempoLeitura: readingTime,
        status: chosenStatus,
        updatedAt: serverTimestamp(),
      };

      if (chosenStatus === "publicado" && isMaster) {
        articleData.revisadoPor = currentUserProfile?.name || auth.currentUser?.displayName || "Gestão";
        articleData.revisadoEm = serverTimestamp();
      }

      if (editArtigo?.id) {
        await updateDoc(doc(db, "artigos_blog", editArtigo.id), articleData);
        onSuccess({ ...articleData, id: editArtigo.id });
      } else {
        articleData.createdAt = serverTimestamp();
        articleData.visualizacoes = 0;
        articleData.curtidas = 0;
        const docRef = await addDoc(collection(db, "artigos_blog"), articleData);
        onSuccess({ ...articleData, id: docRef.id });
      }

      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar artigo:", err);
      setErrorMsg("Não foi possível salvar o artigo no momento. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render markdown/formatted text preview
  const renderFormattedPreview = (text: string) => {
    if (!text.trim()) {
      return (
        <p className="text-forest/40 italic">
          O conteúdo do seu artigo aparecerá aqui com a formatação aplicada...
        </p>
      );
    }

    const lines = text.split("\n");
    return (
      <div className="space-y-4 text-forest/90 leading-relaxed font-sans">
        {lines.map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={i} className="h-2" />;

          // Heading 2
          if (trimmed.startsWith("## ")) {
            return (
              <h2 key={i} className="font-serif text-2xl font-bold text-forest pt-4 pb-1 border-b border-soft">
                {trimmed.replace(/^##\s+/, "")}
              </h2>
            );
          }

          // Heading 3
          if (trimmed.startsWith("### ")) {
            return (
              <h3 key={i} className="font-serif text-xl font-semibold text-forest pt-3">
                {trimmed.replace(/^###\s+/, "")}
              </h3>
            );
          }

          // Quote
          if (trimmed.startsWith("> ")) {
            return (
              <blockquote
                key={i}
                className="border-l-4 border-sun pl-4 py-2 italic text-forest/80 bg-warm/40 rounded-r-xl"
              >
                {trimmed.replace(/^>\s+/, "")}
              </blockquote>
            );
          }

          // Bullet list
          if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            return (
              <li key={i} className="ml-5 list-disc text-forest/85">
                {formatInlineStyles(trimmed.replace(/^[-*]\s+/, ""))}
              </li>
            );
          }

          // Divider
          if (trimmed === "---" || trimmed === "***") {
            return <hr key={i} className="my-6 border-soft" />;
          }

          return <p key={i}>{formatInlineStyles(line)}</p>;
        })}
      </div>
    );
  };

  const formatInlineStyles = (str: string) => {
    // Basic inline bold and italic formatting renderer
    const parts = str.split(/(\*\*.*?\*\*|\*.*?\*|<u>.*?<\/u>)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={index} className="font-bold text-forest">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return <em key={index} className="italic text-forest/90">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith("<u>") && part.endsWith("</u>")) {
        return <u key={index}>{part.slice(3, -4)}</u>;
      }
      return part;
    });
  };

  return (
    <div className="fixed inset-0 bg-forest/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-[2rem] border border-soft shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scale-up">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-warm/50 border-b border-soft flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sun text-forest flex items-center justify-center shadow-xs">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-bold text-forest">
                {editArtigo ? "Editar Artigo" : "Submeter Artigo para o Blog"}
              </h2>
              <p className="text-xs text-forest/70">
                Compartilhe conhecimento, reflexões e artigos abertos para toda a comunidade.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-forest/50 hover:text-forest hover:bg-forest/5 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* Review Workflow Informational Alert */}
          {!isMaster && (
            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900">
              <Sparkles className="w-4 h-4 text-sun-dark shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="block text-amber-950 font-bold mb-0.5">Fluxo de Publicação e Revisão AcolheMente:</strong>
                Ao submeter seu artigo, ele é enviado para a <strong>Gestão do AcolheMente</strong> para revisão editorial e aprovação. Uma vez aprovado, seu texto ficará disponível para o público geral no Blog e aparecerá no seu perfil profissional.
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-2xl text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Top Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-xs font-bold text-forest uppercase tracking-wider">
                Título do Artigo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Como lidar com a ansiedade no dia a dia: Um guia prático"
                className="w-full px-4 py-3 rounded-xl border border-soft bg-warm/20 text-forest placeholder:text-forest/40 focus:outline-none focus:border-forest/50 focus:bg-white text-base font-serif font-semibold"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-forest uppercase tracking-wider">
                Autor (Nome Completo) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-forest/40" />
                <input
                  type="text"
                  value={autorNome}
                  onChange={(e) => setAutorNome(e.target.value)}
                  placeholder="Ex: Dra. Juliana Silveira"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-soft bg-warm/20 text-forest placeholder:text-forest/40 focus:outline-none focus:border-forest/50 focus:bg-white text-sm"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-forest uppercase tracking-wider">
                Especialidade / Registro Profissional
              </label>
              <input
                type="text"
                value={autorProfissao}
                onChange={(e) => setAutorProfissao(e.target.value)}
                placeholder="Ex: Psicóloga Clínica • CRP 06/123456"
                className="w-full px-4 py-2.5 rounded-xl border border-soft bg-warm/20 text-forest placeholder:text-forest/40 focus:outline-none focus:border-forest/50 focus:bg-white text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-forest uppercase tracking-wider">
                Categoria Temática
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-soft bg-warm/20 text-forest focus:outline-none focus:border-forest/50 focus:bg-white text-sm font-medium"
              >
                {CATEGORIAS_SUGERIDAS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {isMaster ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-forest uppercase tracking-wider">
                  Status de Publicação (Controle da Gestão)
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl border border-soft bg-warm/20 text-forest focus:outline-none focus:border-forest/50 focus:bg-white text-sm font-bold"
                >
                  <option value="publicado">✅ Publicado (Disponível no Blog Aberto)</option>
                  <option value="pendente">⏳ Pendente de Revisão</option>
                  <option value="rascunho">📝 Rascunho / Em Edição</option>
                  <option value="rejeitado">⚠️ Ajustes Solicitados / Rejeitado</option>
                </select>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-forest uppercase tracking-wider">
                  Status do Artigo
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl border border-soft bg-warm/20 text-forest focus:outline-none focus:border-forest/50 focus:bg-white text-sm font-medium"
                >
                  <option value="pendente">🚀 Submeter para Revisão da Gestão</option>
                  <option value="rascunho">💾 Salvar como Rascunho Pessoal</option>
                </select>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-forest uppercase tracking-wider">
                Resumo Curto (Para os cards de destaque)
              </label>
              <input
                type="text"
                value={resumo}
                onChange={(e) => setResumo(e.target.value)}
                placeholder="Ex: Entenda os principais gatilhos da ansiedade e estratégias baseadas em evidências."
                className="w-full px-4 py-2.5 rounded-xl border border-soft bg-warm/20 text-forest placeholder:text-forest/40 focus:outline-none focus:border-forest/50 focus:bg-white text-sm"
              />
            </div>
          </div>

          {/* Keywords / Palavras-chave */}
          <div className="flex flex-col gap-2 bg-warm/30 p-4 rounded-2xl border border-soft">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-forest uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-forest/70" />
                Palavras-chave (Tags de busca e recomendação) <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-forest/50">
                Pressione Enter ou vírgula para adicionar
              </span>
            </div>

            {/* Existing tags list */}
            <div className="flex flex-wrap gap-2 items-center">
              {palavrasChave.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 bg-white border border-soft px-3 py-1 rounded-full text-xs font-semibold text-forest shadow-2xs"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-red-500 p-0.5 rounded-full cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {/* Tag Input */}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={novaTag}
                  onChange={(e) => setNovaTag(e.target.value)}
                  onKeyDown={handleKeyDownTag}
                  placeholder="Nova tag..."
                  className="px-3 py-1 text-xs rounded-full border border-soft/80 bg-white focus:outline-none focus:border-forest/50 w-28 text-forest"
                />
                <button
                  type="button"
                  onClick={() => handleAddTag()}
                  className="p-1.5 bg-forest text-white rounded-full hover:bg-forest/90 transition-colors cursor-pointer"
                  title="Adicionar tag"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Quick suggested tags */}
            <div className="flex flex-wrap gap-1.5 items-center mt-1 pt-2 border-t border-soft/50">
              <span className="text-[10px] uppercase font-bold text-forest/40">Sugestões rápidas:</span>
              {PALAVRAS_CHAVE_SUGERIDAS.filter((t) => !palavrasChave.includes(t))
                .slice(0, 6)
                .map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => handleAddTag(sug)}
                    className="text-[11px] text-forest/70 hover:text-forest bg-warm/60 hover:bg-sun/60 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                  >
                    +{sug}
                  </button>
                ))}
            </div>
          </div>

          {/* Content Editor with Formatting Toolbar */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-xs font-bold text-forest uppercase tracking-wider">
                Conteúdo do Artigo <span className="text-red-500">*</span>
              </label>

              {/* Tabs: Write vs Preview */}
              <div className="flex items-center bg-warm rounded-full p-1 border border-soft">
                <button
                  type="button"
                  onClick={() => setActiveTab("editor")}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "editor"
                      ? "bg-white text-forest shadow-xs"
                      : "text-forest/60 hover:text-forest"
                  }`}
                >
                  <Edit3 className="w-3 h-3" />
                  Escrever / Editar
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === "preview"
                      ? "bg-white text-forest shadow-xs"
                      : "text-forest/60 hover:text-forest"
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  Pré-visualizar
                </button>
              </div>
            </div>

            {/* Toolbar Buttons (Visible in Editor Mode) */}
            {activeTab === "editor" && (
              <div className="flex items-center gap-1 p-2 bg-warm/60 border border-soft rounded-t-2xl flex-wrap">
                <button
                  type="button"
                  onClick={() => insertFormatting("**", "**")}
                  className="p-1.5 text-forest/70 hover:text-forest hover:bg-white rounded-lg transition-colors cursor-pointer"
                  title="Negrito (**texto**)"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("*", "*")}
                  className="p-1.5 text-forest/70 hover:text-forest hover:bg-white rounded-lg transition-colors cursor-pointer"
                  title="Itálico (*texto*)"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("<u>", "</u>")}
                  className="p-1.5 text-forest/70 hover:text-forest hover:bg-white rounded-lg transition-colors cursor-pointer"
                  title="Sublinhado (<u>texto</u>)"
                >
                  <Underline className="w-4 h-4" />
                </button>

                <div className="h-4 w-px bg-soft mx-1" />

                <button
                  type="button"
                  onClick={() => insertFormatting("\n## ", "\n")}
                  className="p-1.5 text-forest/70 hover:text-forest hover:bg-white rounded-lg transition-colors cursor-pointer font-serif font-bold text-xs"
                  title="Título de Seção (H2)"
                >
                  <Heading2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("\n### ", "\n")}
                  className="p-1.5 text-forest/70 hover:text-forest hover:bg-white rounded-lg transition-colors cursor-pointer font-serif font-bold text-xs"
                  title="Subtítulo (H3)"
                >
                  <Heading3 className="w-4 h-4" />
                </button>

                <div className="h-4 w-px bg-soft mx-1" />

                <button
                  type="button"
                  onClick={() => insertFormatting("\n> ", "\n")}
                  className="p-1.5 text-forest/70 hover:text-forest hover:bg-white rounded-lg transition-colors cursor-pointer"
                  title="Citação / Destaque"
                >
                  <Quote className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("\n- ", "")}
                  className="p-1.5 text-forest/70 hover:text-forest hover:bg-white rounded-lg transition-colors cursor-pointer"
                  title="Lista com marcadores"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("\n1. ", "")}
                  className="p-1.5 text-forest/70 hover:text-forest hover:bg-white rounded-lg transition-colors cursor-pointer"
                  title="Lista numerada"
                >
                  <ListOrdered className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting("\n---\n")}
                  className="p-1.5 text-forest/70 hover:text-forest hover:bg-white rounded-lg transition-colors cursor-pointer"
                  title="Linha divisória"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <div className="h-4 w-px bg-soft mx-1" />

                {/* Paste from Clipboard quick button */}
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-forest/70 hover:text-forest bg-white rounded-lg border border-soft shadow-2xs hover:bg-warm transition-all cursor-pointer"
                  title="Colar texto da área de transferência"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>Colar Texto</span>
                </button>
              </div>
            )}

            {/* Textarea or Preview box */}
            {activeTab === "editor" ? (
              <textarea
                ref={textareaRef}
                value={conteudo}
                onChange={(e) => setConteudo(e.target.value)}
                placeholder="Escreva ou cole seu artigo aqui. Use as opções da barra de ferramentas para formatar títulos, negrito, listas e citações..."
                rows={12}
                className="w-full p-4 rounded-b-2xl border border-soft border-t-0 bg-white text-forest placeholder:text-forest/40 focus:outline-none focus:border-forest/50 font-sans text-sm leading-relaxed"
                required
              />
            ) : (
              <div className="w-full min-h-[300px] max-h-[420px] overflow-y-auto p-6 rounded-2xl border border-soft bg-[#FCFBF7]">
                <div className="mb-4 pb-3 border-b border-soft">
                  <span className="text-xs uppercase font-bold text-sun-dark">
                    {categoria}
                  </span>
                  <h1 className="font-serif text-2xl font-bold text-forest mt-1">
                    {titulo || "Título do Artigo"}
                  </h1>
                  <div className="flex items-center gap-2 text-xs text-forest/60 mt-2">
                    <span>Por {autorNome || "Autor"}</span>
                    <span>•</span>
                    <span>{calculateReadingTime(conteudo)}</span>
                  </div>
                </div>
                {renderFormattedPreview(conteudo)}
              </div>
            )}
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-warm/30 border-t border-soft flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-full border border-soft hover:bg-warm text-forest/70 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-forest hover:bg-forest/90 text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>Salvando...</>
            ) : (
              <>
                <Check className="w-4 h-4" />
                {editArtigo
                  ? "Salvar Alterações"
                  : status === "pendente"
                  ? "Submeter para Revisão"
                  : status === "rascunho"
                  ? "Salvar como Rascunho"
                  : "Publicar no Blog"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
