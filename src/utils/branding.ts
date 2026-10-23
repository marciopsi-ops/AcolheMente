export interface BrandingProfileInput {
  plano?: string;
  whiteLabelEnabled?: boolean;
  companyData?: {
    razaoSocial?: string;
  } | null;
}

export interface AppBranding {
  brandName: string;
  isCustom: boolean;
}

export const getAppBranding = (profile?: BrandingProfileInput | null): AppBranding => {
  if (profile?.plano === 'avancado' && profile?.whiteLabelEnabled) {
    return {
      brandName: profile.companyData?.razaoSocial?.trim() || 'AcolheHub',
      isCustom: true,
    };
  }
  return {
    brandName: 'AcolheMente',
    isCustom: false,
  };
};
