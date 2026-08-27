/* Mi Entrenador · service worker v2
   - index: red primero (las novedades llegan solas), caché de respaldo offline
   - dibujos e íconos: caché primero (no cambian nunca)
   - IMPORTANTE: nunca se guardan respuestas fallidas (404, etc.) */
const CACHE = 'entrenador-v27';
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
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(e.request);
      if (hit && hit.ok) return hit;                     // solo servimos caché sano
      if (hit) await c.delete(e.request);                // limpiamos basura vieja
      const r = await fetch(e.request);
      if (r.ok) c.put(e.request, r.clone());             // solo guardamos si vino bien
      return r;
    }));
  } else {
    e.respondWith(fetch(e.request).then(r => {
      if (r.ok) caches.open(CACHE).then(c => c.put(e.request, r.clone()));
      return r.clone();
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
  }
});
