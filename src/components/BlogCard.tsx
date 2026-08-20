import React, { useState } from "react";
import { BookOpen, User, Tag, Clock, Share2, ArrowRight, Check } from "lucide-react";
import { ArtigoBlog } from "../types/blog";

interface BlogCardProps {
  artigo: ArtigoBlog;
  onRead: (artigo: ArtigoBlog) => void;
  onSelectTag?: (tag: string) => void;
}

export function BlogCard({ artigo, onRead, onSelectTag }: BlogCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}?artigo=${artigo.id || ""}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {});
  };

  const formattedDate = artigo.createdAt?.toDate
    ? artigo.createdAt.toDate().toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    : artigo.createdAt instanceof Date
    ? artigo.createdAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    : "Recente";

  return (
    <article
      onClick={() => onRead(artigo)}
      className="group bg-white rounded-3xl border border-soft hover:border-forest/30 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer h-full"
    >
      {/* Top Media / Tag banner */}
      <div className="p-6 pb-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 text-xs">
          {artigo.categoria ? (
            <span className="px-3 py-1 bg-sun/40 text-forest font-bold rounded-full uppercase tracking-wider text-[10px]">
              {artigo.categoria}
            </span>
          ) : (
            <span className="px-3 py-1 bg-warm text-forest/70 font-semibold rounded-full text-[10px]">
              Artigo Clínico
            </span>
          )}

          <div className="flex items-center gap-1.5 text-forest/50 text-[11px]">
            <Clock className="w-3.5 h-3.5" />
            <span>{artigo.tempoLeitura || "4 min de leitura"}</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-serif text-xl font-bold text-forest group-hover:text-forest/90 transition-colors leading-snug line-clamp-2">
          {artigo.titulo}
        </h3>

        {/* Summary */}
        <p className="text-forest/70 text-sm leading-relaxed line-clamp-3">
          {artigo.resumo || artigo.conteudo.slice(0, 140) + "..."}
        </p>
      </div>

      {/* Keywords / Palavras-chave */}
      <div className="px-6 py-2 flex flex-wrap gap-1.5 items-center">
        <Tag className="w-3 h-3 text-forest/40 mr-1 shrink-0" />
        {artigo.palavrasChave && artigo.palavrasChave.length > 0 ? (
          artigo.palavrasChave.slice(0, 3).map((tag, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectTag) onSelectTag(tag);
              }}
              className="text-[11px] bg-warm hover:bg-sun/60 text-forest/80 hover:text-forest px-2.5 py-0.5 rounded-lg transition-colors font-medium cursor-pointer"
            >
              #{tag.trim()}
            </button>
          ))
        ) : (
          <span className="text-[11px] text-forest/40 italic">Saúde mental, Acolhimento</span>
        )}
        {artigo.palavrasChave && artigo.palavrasChave.length > 3 && (
          <span className="text-[10px] text-forest/50 font-medium">
            +{artigo.palavrasChave.length - 3}
          </span>
        )}
      </div>

      {/* Author & Actions Footer */}
      <div className="p-6 pt-4 border-t border-soft/60 flex items-center justify-between gap-3 mt-2 bg-warm/20">
        {/* Author Details */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-full bg-forest text-sun flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-forest/10 shadow-xs">
            {artigo.autorFoto ? (
              <img src={artigo.autorFoto} alt={artigo.autorNome} className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4 text-white" />
            )}
          </div>
          <div className="min-w-0">
            <span className="block text-xs font-bold text-forest truncate">
              {artigo.autorNome}
            </span>
            <span className="block text-[11px] text-forest/60 truncate">
              {artigo.autorProfissao || "Profissional Parceiro"}
            </span>
          </div>
        </div>

        {/* Action Link / Visit Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleCopyLink}
            className="p-2 text-forest/50 hover:text-forest hover:bg-forest/5 rounded-full transition-colors relative"
            title="Copiar link do artigo"
          >
            {copied ? <Check className="w-4 h-4 text-forest" /> : <Share2 className="w-4 h-4" />}
            {copied && (
              <span className="absolute -top-7 right-0 bg-forest text-white text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap">
                Link copiado!
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onRead(artigo)}
            className="inline-flex items-center gap-1 text-xs font-bold text-forest bg-sun hover:bg-sun-dark px-3 py-1.5 rounded-full transition-all shadow-xs group-hover:scale-105"
          >
            Ler Artigo
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </article>
  );
}
