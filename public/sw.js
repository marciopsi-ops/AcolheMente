const CACHE_NAME = 'acolhemente-pwa-v1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon.svg',
  '/apple-touch-icon.png'
];

// Instalação do Service Worker e precache dos ativos estáticos principais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pré-carregando cache de ativos estáticos');
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Ativação do Service Worker e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Removendo cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estratégia de requisição HTTP (Fetch)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorar requisições não-GET e APIs de terceiros como Firebase/Firestore/Analytics
  if (
    event.request.method !== 'GET' ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('google')
  ) {
    return;
  }

  // Navegação de páginas HTML (SPA Fallback)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Atualiza cache da página em segundo plano
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/', responseClone));
          return response;
        })
        .catch(() => {
          // Se estiver offline, retorna index.html do cache
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // Ativos Estáticos (Imagens, Scripts, Fontes, CSS) - Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
