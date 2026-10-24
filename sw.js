const CACHE = 'rotasp-f150e99c51';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
// reload: a cópia para abrir sem internet vem do servidor, não do cache de 10 minutos do navegador
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (url.origin === location.origin) {
    // rede primeiro, perguntando ao servidor se mudou (no-cache): sem isso vale a cópia de 10 minutos do GitHub Pages e a versão nova
    // só aparece na abertura seguinte. Pela URL, não pelo pedido: com fetch(req, ...) o Chromium com perfil em disco seguiu servindo
    // a versão velha (medido em 24/10/2026); o redirect do pedido evita quebrar navegação redirecionada. Resposta de erro não
    // substitui a cópia guardada, que mantém o app abrindo sem internet
    e.respondWith(fetch(req.url, { cache: 'no-cache', redirect: req.redirect }).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; }).catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  if (/cdnjs|fonts\.g/.test(url.host)) { e.respondWith(caches.open(CACHE).then(c => c.match(req).then(r => r || fetch(req).then(res => { c.put(req, res.clone()); return res; })))); }
});
