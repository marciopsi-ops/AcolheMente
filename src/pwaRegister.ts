// Service Worker Registration and PWA Install Prompt helper

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    // Em ambiente de desenvolvimento (Vite), nunca registrar SW e limpar registros antigos para evitar mistura de hashes do React
    if ((import.meta as any).env?.DEV) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
          }
        })
        .catch(() => {});
      return;
    }

    // Em ambientes de iframe/sandbox ou preview do AI Studio, o navegador bloqueia Service Workers
    const isInsideIframe = (() => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    })();

    if (isInsideIframe) {
      console.info('[PWA] Registro de Service Worker ignorado em ambiente iframe/sandbox.');
      return;
    }

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registrado com sucesso:', registration.scope);
        })
        .catch((error) => {
          console.info('[PWA] Registro de Service Worker indisponível neste contexto:', error?.message || error);
        });
    });
  }
}
