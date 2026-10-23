import { UserProfile } from '../types/user';

export interface AppBranding {
  brandName: string;
  isCustom: boolean;
}

export const getAppBranding = (profile?: UserProfile | null): AppBranding => {
  if (profile?.plano === 'avancado' && profile?.whiteLabelEnabled) {
    return {
      brandName: 'AcolheHub',
      isCustom: true,
    };
  }
  return {
    brandName: 'AcolheMente',
    isCustom: false,
  };
};
