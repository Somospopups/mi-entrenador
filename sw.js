/* Mi Entrenador · service worker v1
   - index: red primero (las novedades llegan solas), caché de respaldo offline
   - dibujos e íconos: caché primero (no cambian nunca) */
const CACHE = 'entrenador-v2';
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './index.html', './manifest.json', './icon-192.png'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;           // Supabase va directo, sin caché
  if (url.pathname.includes('/img/') || url.pathname.includes('icon-')) {
    e.respondWith(caches.open(CACHE).then(async c => (await c.match(e.request)) ||
      fetch(e.request).then(r => { c.put(e.request, r.clone()); return r; })));
  } else {
    e.respondWith(fetch(e.request).then(r => {
      caches.open(CACHE).then(c => c.put(e.request, r.clone())); return r.clone();
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
  }
});
