import { hasIntegrarFeatures } from "../types/planosProfissionais";
import { formatProfessionalName } from "./formatters";

export interface BrandingProfileInput {
  plano?: string;
  planoProfissional?: string;
  tipoCortesia?: string;
  isCortesia?: boolean;
  isUsuarioTeste?: boolean;
  whiteLabelEnabled?: boolean;
  name?: string;
  nome?: string;
  companyData?: {
    razaoSocial?: string;
    logoEmpresaUrl?: string;
  } | null;
}

export interface AppBranding {
  brandName: string;
  logoUrl?: string | null;
  isCustom: boolean;
}

export const getAppBranding = (profile?: BrandingProfileInput | null): AppBranding => {
  if (profile && (hasIntegrarFeatures(profile) || profile.whiteLabelEnabled === true)) {
    const rawProfName = (profile.name || profile.nome || "").trim();
    const fallbackName = rawProfName
      ? formatProfessionalName(rawProfName)
      : "Consultório Particular";
    return {
      brandName: profile.companyData?.razaoSocial?.trim() || fallbackName,
      logoUrl: profile.companyData?.logoEmpresaUrl?.trim() || null,
      isCustom: true,
    };
  }
  return {
    brandName: "AcolheMente",
    logoUrl: null,
    isCustom: false,
  };
};

