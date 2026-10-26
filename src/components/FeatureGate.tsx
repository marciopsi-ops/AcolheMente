import React from 'react';
import { Sparkles } from 'lucide-react';

interface FeatureGateProps {
  userPlan: string | undefined;
  isCortesia?: boolean;
  requiredPlan: 'avancado' | 'ia';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ userPlan, isCortesia, requiredPlan, children, fallback }: FeatureGateProps) {
  if (isCortesia) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return (
      <div className="p-6 bg-warm/50 border border-purple-200 rounded-2xl text-center space-y-3">
        <div className="mx-auto w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-purple-700" />
        </div>
        <h3 className="font-bold text-forest">Plano Essencial (Cortesia Ativa)</h3>
        <p className="text-xs text-forest/70">Profissionais na modalidade Cortesia possuem acesso exclusivo aos recursos do Plano Essencial.</p>
      </div>
    );
  }

  const norm = (userPlan || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const hasAccess = 
    norm === 'ia' || 
    norm === 'avancado' || 
    norm === 'premium' ||
    norm === 'pro' ||
    (norm.includes('avanc') && requiredPlan === 'avancado');

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="p-6 bg-warm/50 border border-amber-200 rounded-2xl text-center space-y-3">
      <div className="mx-auto w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
        <Sparkles className="w-5 h-5 text-amber-700" />
      </div>
      <h3 className="font-bold text-forest">Recurso Premium</h3>
      <p className="text-xs text-forest/70">Este recurso está disponível apenas no plano Avançado ou superior.</p>
    </div>
  );
}
