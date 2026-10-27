const CACHE = 'rotasp-756d0f7e46';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
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
    // A resposta é lida inteira antes de ser entregue (o app é um arquivo só): o prazo vale também para corpo travado ou cortado,
    // e página sem o </html> do fim não vai para a cópia guardada. Sai o Content-Encoding, porque o corpo já vem descomprimido
    const pronta = fetch(req.url, { cache: 'no-cache', redirect: req.redirect }).then(res => !res.ok ? res : res.arrayBuffer().then(buf => {
      if ((res.headers.get('content-type') || '').includes('html') && !new TextDecoder().decode(buf.slice(-200)).includes('</html>')) throw new Error('página cortada');
      const h = new Headers(res.headers); h.delete('content-encoding'); h.delete('content-length');
      return { nova: () => new Response(buf, { status: res.status, statusText: res.statusText, headers: h }) };
    }));
    e.waitUntil(pronta.then(p => p.nova && caches.open(CACHE).then(c => c.put(req, p.nova()))).catch(() => null));
    // prazo de 3 s: com sinal fraco (barra sem dados) abre a cópia guardada, e a rede segue por trás gravando a versão nova para a
    // próxima abertura. Sem cópia guardada, espera a rede. A página guardada só substitui navegação, nunca ícone ou manifest
    const guardada = () => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : null)).catch(() => null);
    e.respondWith(new Promise(entregar => {
      let feito = false;
      const uma = r => { if (r && !feito) { feito = true; entregar(r); } };
      const prazo = setTimeout(() => guardada().then(uma), 3000);
      pronta.then(p => { clearTimeout(prazo); uma(p.nova ? p.nova() : p); }, () => { clearTimeout(prazo); guardada().then(r => { uma(r); uma(Response.error()); }); });
    }));
    return;
  }
  if (/cdnjs|fonts\.g/.test(url.host)) { e.respondWith(caches.open(CACHE).then(c => c.match(req).then(r => r || fetch(req).then(res => { c.put(req, res.clone()); return res; })))); }
});
