// sw.js — Service Worker para cripto.chat (cache offline)
// Versão: incrementar ao mudar arquivos estáticos
const CACHE_NAME = 'cripto-chat-v11';
// Versão do app (deve corresponder ao APP_VERSION no index.html)
const APP_VERSION = '2.4.0';
// Pré-cache apenas dos assets fixos. O HTML NÃO entra aqui de propósito:
// index.html e / usam network-first (abaixo), para o aluno sempre receber
// a versão mais nova do app sem precisar limpar o cache do navegador.
const ASSETS = [
  '/manifest.json',
  '/version.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install: pré-cache dos assets essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first para assets estáticos, network-first para API/WebSocket
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Ignora WebSocket e requests não-GET
  if (event.request.method !== 'GET' || url.pathname.startsWith('/ws')) return;

  // Assets estáticos: cache-first
  if (ASSETS.some((a) => url.pathname === a || url.pathname.startsWith('/icons/'))) {
    event.respondWith(
      caches.match(event.request).then((cached) =>
        cached || fetch(event.request).then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return resp;
        })
      )
    );
    return;
  }

  // index.html e outros: network-first (sempre tenta pegar versão nova)
  event.respondWith(
    fetch(event.request)
      .then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return resp;
      })
      .catch(() => caches.match(event.request))
  );
});

// Mensagem do cliente para forçar atualização
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

// Verifica atualizações periodicamente (a cada 60s quando ativo)
self.addEventListener('activate', (event) => {
  // Notifica todos os clientes que uma nova versão está disponível
  event.waitUntil(
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: 'sw-activated', version: CACHE_NAME });
      });
    })
  );
});