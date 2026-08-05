// Service Worker Registration and PWA Install Prompt helper

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registrado com sucesso:', registration.scope);
        })
        .catch((error) => {
          console.error('[PWA] Falha ao registrar Service Worker:', error);
        });
    });
  }
}
