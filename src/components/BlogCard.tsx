import React, { useState } from "react";
import { User, Tag, Clock, Share2, ArrowRight, Check } from "lucide-react";
import { ArtigoBlog } from "../types/blog";

interface BlogCardProps {
  artigo: ArtigoBlog;
  onRead: (artigo: ArtigoBlog) => void;
  onSelectTag?: (tag: string) => void;
}

const getCapaFallback = (categoria?: string) => {
  const cat = categoria?.toLowerCase() || "";
  if (cat.includes("ansiedade") || cat.includes("pânico")) {
    return "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=1000&q=85";
  }
  if (cat.includes("depress")) {
    return "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1000&q=85";
  }
  if (cat.includes("carreira") || cat.includes("trabalho") || cat.includes("burnout") || cat.includes("empresa")) {
    return "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?auto=format&fit=crop&w=1000&q=85";
  }
  if (cat.includes("relacionamento") || cat.includes("família") || cat.includes("casal")) {
    return "https://images.unsplash.com/photo-1519791883288-dc8bd696e667?auto=format&fit=crop&w=1000&q=85";
  }
  if (cat.includes("autocuidado") || cat.includes("bem-estar") || cat.includes("autoestima")) {
    return "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1000&q=85";
  }
  return "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1000&q=85";
};

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

  const capaImage = artigo.capaUrl || getCapaFallback(artigo.categoria);

  return (
    <div className="relative group h-full">
      {/* Depth of Field & Glow Aura Solar / Dourada que acende e ganha vida no hover */}
      <div className="absolute -inset-2 bg-gradient-to-r from-sun via-amber-400/40 to-forest rounded-[36px] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-600 pointer-events-none -z-10" />

      <article
        onClick={() => onRead(artigo)}
        className="w-full relative min-h-[420px] rounded-[28px] overflow-hidden shadow-xl shadow-forest/20 flex flex-col justify-between cursor-pointer border-2 border-forest-dark/30 group-hover:border-sun/60 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-forest/30 h-full"
      >
        {/* Foto de Fundo Fixa com Mínima Transparência (z-0 direto, sem película e sem ficar atrás de fundos) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <img
            src={capaImage}
            alt={artigo.titulo}
            className="w-full h-full object-cover object-center opacity-95 group-hover:scale-105 transition-transform duration-700 ease-out"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Top Media / Tag banner */}
        <div className="p-6 pb-3 flex flex-col gap-3 relative z-10">
          <div className="flex items-center justify-between gap-2 text-xs">
            {artigo.categoria ? (
              <span className="px-3.5 py-1.5 bg-black/50 backdrop-blur-md border border-white/20 text-sun font-bold rounded-full uppercase tracking-wider text-[10px] group-hover:bg-sun group-hover:text-forest group-hover:border-sun transition-all duration-300">
                {artigo.categoria}
              </span>
            ) : (
              <span className="px-3.5 py-1.5 bg-black/50 backdrop-blur-md border border-white/20 text-sun font-semibold rounded-full text-[10px]">
                Artigo Clínico
              </span>
            )}

            <div className="flex items-center gap-1.5 text-white/80 group-hover:text-white text-[11px] font-medium bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 transition-colors">
              <Clock className="w-3.5 h-3.5 text-sun" />
              <span>{artigo.tempoLeitura || "4 min de leitura"}</span>
            </div>
          </div>

          {/* Title */}
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-white group-hover:text-amber-200 transition-colors duration-300 leading-snug line-clamp-2 drop-shadow-sm">
            {artigo.titulo}
          </h3>

          {/* Summary */}
          <p className="text-white/95 group-hover:text-white text-sm leading-relaxed line-clamp-3 font-normal transition-colors duration-300 drop-shadow-xs">
            {artigo.resumo || artigo.conteudo.slice(0, 140) + "..."}
          </p>
        </div>

        {/* Keywords / Palavras-chave */}
        <div className="px-6 py-2 flex flex-wrap gap-1.5 items-center relative z-10">
          <Tag className="w-3 h-3 text-sun/70 mr-1 shrink-0" />
          {artigo.palavrasChave && artigo.palavrasChave.length > 0 ? (
            artigo.palavrasChave.slice(0, 3).map((tag, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectTag) onSelectTag(tag);
                }}
                className="text-[11px] bg-black/40 hover:bg-sun text-white/90 hover:text-forest px-2.5 py-0.5 rounded-lg transition-all font-medium cursor-pointer border border-white/15"
              >
                #{tag.trim()}
              </button>
            ))
          ) : (
            <span className="text-[11px] text-white/50 italic">Saúde mental, Acolhimento</span>
          )}
          {artigo.palavrasChave && artigo.palavrasChave.length > 3 && (
            <span className="text-[10px] text-white/60 font-medium">
              +{artigo.palavrasChave.length - 3}
            </span>
          )}
        </div>

        {/* Author & Actions Footer */}
        <div className="p-6 pt-4 border-t border-white/15 group-hover:border-sun/40 flex items-center justify-between gap-3 mt-2 bg-black/40 backdrop-blur-md relative z-10 transition-colors duration-300">
          {/* Author Details */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-forest text-sun flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-white/20 shadow-xs">
              {artigo.autorFoto ? (
                <img src={artigo.autorFoto} alt={artigo.autorNome} className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-bold text-white truncate group-hover:text-amber-200 transition-colors">
                {artigo.autorNome}
              </span>
              <span className="block text-[11px] text-white/70 truncate">
                {artigo.autorProfissao || "Profissional Parceiro"}
              </span>
            </div>
          </div>

          {/* Action Link / Visit Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyLink}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors relative cursor-pointer"
              title="Copiar link do artigo"
            >
              {copied ? <Check className="w-4 h-4 text-sun" /> : <Share2 className="w-4 h-4" />}
              {copied && (
                <span className="absolute -top-7 right-0 bg-forest text-white text-[10px] px-2 py-0.5 rounded shadow whitespace-nowrap border border-white/20">
                  Link copiado!
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onRead(artigo)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-forest bg-sun hover:bg-sun-dark px-3.5 py-1.5 rounded-full transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95"
            >
              Ler Artigo
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}
