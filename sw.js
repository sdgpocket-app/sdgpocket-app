// Service Worker de SDG Pocket — solo maneja notificaciones push.
// Service Worker de SDG Pocket — maneja notificaciones push, y guarda en caché
// las librerías externas (lector QR, conexión a base de datos, fuentes) para
// que no se vuelvan a descargar cada vez que se abre la app.
const CACHE_NAME = 'sdgpocket-libs-v1';
const CACHEABLE_HOSTS = [
  'cdnjs.cloudflare.com',
  'cdn.jsdelivr.net',
  'unpkg.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if(event.request.method !== 'GET') return;
  if(!CACHEABLE_HOSTS.includes(url.hostname)) return; // solo cacheamos librerías externas, nunca la app ni la base de datos

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      if(cached) return cached;
      try{
        const response = await fetch(event.request);
        if(response && response.ok) cache.put(event.request, response.clone());
        return response;
      }catch(e){
        return cached || Response.error();
      }
    })
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch(e) { data = { title: 'SDG Pocket', body: event.data ? event.data.text() : '' }; }

  const title = data.title || 'La Sociedad del Grappling';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
