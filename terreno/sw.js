/* Service worker de Agrolytic — hace que la app abra SIN señal.
   La app es un solo index.html (cifrado); se cachea junto al manifest
   e iconos. El backend (Apps Script) siempre va a la red: así los
   conteos suben cuando hay señal y nunca se sirven "viejos". */
const CACHE = 'agrolytic-v3';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // El backend (base central) SIEMPRE a la red — nunca desde caché
  if (url.hostname.indexOf('script.google.com') !== -1) return;
  if (e.request.method !== 'GET') return;

  // La app: primero caché (para abrir sin señal), si no está va a la red;
  // cualquier navegación sin señal cae al index cacheado.
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request).catch(() => caches.match('./index.html'))),
  );
});
