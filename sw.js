/* Mi Entrenador · service worker v3
   - index/html/js/css: RED primero y SIEMPRE a la red (cache:'no-store'), para que
     la caché HTTP de 10 min de GitHub Pages nunca sirva una versión vieja.
   - dibujos e íconos: caché primero (no cambian nunca).
   - IMPORTANTE: nunca se guardan respuestas fallidas (404, etc.).
   - Al activarse una versión nueva, reclama los clientes y recarga las pestañas. */
const CACHE = 'entrenador-v79';
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './index.html', './manifest.json', './icon-192.png'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const ks = await caches.keys();
    await Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
    // Recargar las pestañas abiertas para que tomen la versión nueva de inmediato
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((c) => { try { c.navigate(c.url); } catch (_) {} });
  })());
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;           // Supabase va directo, sin caché
  if (url.pathname.includes('/img/') || url.pathname.includes('icon-')) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(e.request);
      if (hit && hit.ok) return hit;                     // solo servimos caché sano
      if (hit) await c.delete(e.request);                // limpiamos basura vieja
      const r = await fetch(e.request, { cache: 'no-store' });
      if (r.ok) c.put(e.request, r.clone());             // solo guardamos si vino bien
      return r;
    }));
  } else {
    // HTML / JS / CSS / resto: red primero y SIN usar la caché HTTP intermedia
    e.respondWith(fetch(e.request, { cache: 'no-store' }).then(r => {
      if (r.ok) caches.open(CACHE).then(c => c.put(e.request, r.clone()));
      return r.clone();
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
  }
});
