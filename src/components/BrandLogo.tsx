import React from "react";
import logoSvg from "../assets/images/logo_acolhe.svg";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  subtitle?: string;
  showSubtitle?: boolean;
  onClick?: () => void;
  badge?: string;
  title?: string;
}

export function BrandLogo({
  className = "",
  size = "md",
  subtitle = "Saúde mental acessível - Gestão para terapeutas",
  showSubtitle = true,
  onClick,
  badge,
  title,
}: BrandLogoProps) {
  // Configurações de tamanho calibradas para harmonia visual e responsividade
  const imageSizeClasses = {
    sm: "w-8 h-8 sm:w-10 sm:h-10 rounded-xl",
    md: "w-10 h-10 xs:w-11 xs:h-11 sm:w-13 sm:h-13 md:w-14 md:h-14 rounded-xl sm:rounded-2xl",
    lg: "w-12 h-12 sm:w-16 sm:h-16 rounded-2xl",
  }[size];

  // Aumento de 1 grau no nome AcolheMente com equilíbrio para telas pequenas
  const titleSizeClasses = {
    sm: "text-base sm:text-lg",
    md: "text-lg xs:text-xl sm:text-2xl md:text-3xl",
    lg: "text-2xl sm:text-3xl md:text-4xl",
  }[size];

  const subtitleSizeClasses = {
    sm: "text-[8.5px] sm:text-[10px]",
    md: "text-[9px] xs:text-[10px] sm:text-xs",
    lg: "text-xs sm:text-sm",
  }[size];

  const content = (
    <div
      className={`flex items-center gap-2 sm:gap-3.5 min-w-0 ${onClick ? "cursor-pointer select-none group" : ""} ${className}`}
      onClick={onClick}
      title={title || "AcolheMente — Saúde mental acessível - Gestão para terapeutas"}
    >
      {/* Símbolo com fundo amarelo e traço nítido */}
      <div
        className={`${imageSizeClasses} bg-[#ffde59] border border-sun-dark/25 flex items-center justify-center overflow-hidden shrink-0 shadow-xs group-hover:scale-[1.02] transition-transform duration-200`}
      >
        <img
          src={logoSvg}
          alt="AcolheMente"
          className="w-full h-full object-cover scale-[1.02]"
        />
      </div>

      {/* Identidade Nominal e Slogan Acessível */}
      <div className="flex flex-col justify-center min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap min-w-0">
          <span
            className={`font-serif ${titleSizeClasses} font-semibold tracking-tight text-forest leading-none group-hover:text-forest/90 transition-colors shrink-0`}
          >
            AcolheMente
          </span>
          {badge && (
            <span className="hidden xs:inline-flex text-[9px] sm:text-xs font-sans text-forest/75 font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-forest/5 border border-forest/10 shrink-0 truncate max-w-[120px] sm:max-w-none">
              {badge}
            </span>
          )}
        </div>

        {showSubtitle && (
          <div className="font-sans font-medium text-forest/75 tracking-tight leading-tight mt-0.5 sm:mt-1 min-w-0">
            {subtitle === "Saúde mental acessível - Gestão para terapeutas" ? (
              <p className={`${subtitleSizeClasses} truncate leading-tight`}>
                <span className="inline">Saúde mental acessível</span>
                <span className="hidden sm:inline"> — Gestão para terapeutas</span>
              </p>
            ) : (
              <p className={`${subtitleSizeClasses} truncate max-w-[170px] xs:max-w-[240px] sm:max-w-none leading-tight`}>
                {subtitle}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return content;
}
