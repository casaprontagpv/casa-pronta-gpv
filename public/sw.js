// Service Worker — Casa Pronta PWA
//
// Estratégia:
//   • Navegação (documento HTML): NETWORK-FIRST. Garante que um deploy novo chegue
//     imediatamente. Sem isso, o cache-first servia o index.html antigo, que apontava
//     para um bundle JS que não existe mais — o app parava de carregar após o deploy.
//   • Assets com hash no nome (/assets/*): CACHE-FIRST. O hash muda a cada build,
//     então o conteúdo é imutável e pode ser cacheado sem risco.
//   • Demais GET do mesmo origin: STALE-WHILE-REVALIDATE.

const CACHE_VERSION = 'v2';
const CACHE_NAME = `casapronta-${CACHE_VERSION}`;
const OFFLINE_FALLBACK = '/';

const PRECACHE_URLS = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png', '/favicon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {
        // Não bloqueia a instalação se algum asset ainda não estiver disponível.
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

const isImmutableAsset = (url) => url.pathname.startsWith('/assets/');

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || cache.match(OFFLINE_FALLBACK);
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || networkFetch;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isImmutableAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
