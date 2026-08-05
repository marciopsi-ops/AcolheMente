import { useState, useEffect } from 'react';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  useEffect(() => {
    // Verifica se já está rodando como PWA instalado (standalone)
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsInstalled(true);
      return;
    }

    // Captura o evento nativo do navegador para instalação
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 5000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Dispara o prompt nativo de instalação do navegador
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('[PWA] Usuário aceitou instalar o aplicativo');
      setIsInstalled(true);
    } else {
      console.log('[PWA] Usuário recusou a instalação do PWA');
    }

    setDeferredPrompt(null);
  };

  if (isInstalled && !showSuccessToast) return null;
  if (isDismissed || (!deferredPrompt && !showSuccessToast)) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-white/95 backdrop-blur-md border border-forest/20 shadow-xl rounded-2xl p-4 transition-all animate-in fade-in slide-in-from-bottom-5 duration-300">
      {showSuccessToast ? (
        <div className="flex items-center gap-3 text-forest">
          <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
          <div className="flex-1 text-sm font-medium">
            <p className="font-bold text-forest">Aplicativo Instalado!</p>
            <p className="text-xs text-forest/70">O AcolheMente já está disponível na sua tela inicial.</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-forest/10 border border-forest/15 flex items-center justify-center shrink-0 text-forest">
            <Smartphone className="w-6 h-6 text-forest" />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-forest font-serif leading-snug">
              Instalar o AcolheMente
            </h4>
            <p className="text-xs text-forest/75 truncate">
              Acesse a plataforma direto da sua tela inicial!
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-2 bg-forest hover:bg-forest/90 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instalar</span>
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1.5 text-forest/50 hover:text-forest hover:bg-warm rounded-lg transition-colors cursor-pointer"
              title="Agora não"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
