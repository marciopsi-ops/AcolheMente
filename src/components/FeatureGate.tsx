import React from "react";
import { Sparkles } from "lucide-react";
import {
  hasIntegrarFeatures,
  hasPlenoFeatures,
  resolveModalidadeCredencial,
} from "../types/planosProfissionais";

interface FeatureGateProps {
  userPlan?: string;
  isCortesia?: boolean;
  userProfile?: any;
  requiredPlan: "integrar" | "avancado" | "pleno" | "ia";
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({
  userPlan,
  isCortesia,
  userProfile,
  requiredPlan,
  children,
  fallback,
}: FeatureGateProps) {
  const effectiveProfile = userProfile || {
    plano: userPlan,
    isCortesia: Boolean(isCortesia),
  };

  const modalidade = resolveModalidadeCredencial(effectiveProfile);
  const needsPleno = requiredPlan === "pleno" || requiredPlan === "ia";
  const hasAccess = needsPleno
    ? hasPlenoFeatures(effectiveProfile)
    : hasIntegrarFeatures(effectiveProfile);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (modalidade === "cortesia_essencial") {
    return (
      <div className="p-6 bg-warm/50 border border-purple-200 rounded-2xl text-center space-y-3">
        <div className="mx-auto w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-purple-700" />
        </div>
        <h3 className="font-bold text-forest">
          Plano Acolher • Essencial (Cortesia Ativa)
        </h3>
        <p className="text-xs text-forest/70">
          Sua conta está na modalidade Cortesia Essencial, com acesso aos recursos do Plano Acolher. Para utilizar recursos do Plano Integrar, solicite liberação à Gestão.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-warm/50 border border-amber-200 rounded-2xl text-center space-y-3">
      <div className="mx-auto w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
        <Sparkles className="w-5 h-5 text-amber-700" />
      </div>
      <h3 className="font-bold text-forest">
        {needsPleno ? "Recurso do Plano Pleno" : "Recurso do Plano Integrar"}
      </h3>
      <p className="text-xs text-forest/70">
        {needsPleno
          ? "Este recurso faz parte do Plano Pleno (IA & APIs Avançadas)."
          : "Este recurso está disponível no Plano Integrar mediante liberação da Gestão Master ou contratação em Status / Plano."}
      </p>
    </div>
  );
}
