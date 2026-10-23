const CACHE = 'rotasp-4c0916d735';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (url.origin === location.origin) {
    // rede primeiro: versão nova aparece na próxima abertura; a cópia guardada mantém o app abrindo sem internet
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; }).catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  if (/cdnjs|fonts\.g/.test(url.host)) { e.respondWith(caches.open(CACHE).then(c => c.match(req).then(r => r || fetch(req).then(res => { c.put(req, res.clone()); return res; })))); }
});
