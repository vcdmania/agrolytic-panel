/* Service worker de Agrolytic — hace que la app abra SIN señal.
   La app es un solo index.html (cifrado); se cachea junto al manifest
   e iconos. El backend (Apps Script) siempre va a la red: así los
   conteos suben cuando hay señal y nunca se sirven "viejos".

   La APP se sirve "primero la red" (network-first): cuando hay señal
   trae SIEMPRE la última versión publicada y refresca la copia; sin
   señal, cae a la copia guardada. Así una publicación nueva se ve al
   toque, sin que el celular se quede pegado en una versión vieja. */
const CACHE = 'agrolytic-v4';
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

  const esApp = e.request.mode === 'navigate' || e.request.destination === 'document';

  if (esApp) {
    // Primero la red: trae la última versión y actualiza la copia
    // guardada. Sin señal, sirve la copia (para trabajar en terreno).
    e.respondWith(
      fetch(e.request)
        .then((resp) => {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copia));
          return resp;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./'))),
    );
    return;
  }

  // Resto de archivos (manifest, iconos): primero caché, va rápido
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request)),
  );
});
