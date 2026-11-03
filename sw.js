/* Dasa Fun World portal service worker. It keeps the portal itself working offline.
   Each game under games/ has its own service worker with its own scope, so this one leaves games/ alone. */
const CACHE = 'dfw-portal-v2';
const SHELL = ["./", "index.html", "assets/css/style.css?v=2", "assets/js/app.js?v=2", "assets/js/splash.js?v=2", "assets/fonts/fredoka-latin.woff2", "assets/img/logo.svg", "favicon.svg", "assets/img/icon-192.png", "assets/img/favicon-32.png", "manifest.webmanifest", "assets/img/games/kite-wars.webp", "assets/img/games/village-fair.webp", "assets/img/games/chandrayaan.webp", "assets/img/games/vyapar.webp", "assets/img/games/samudrayaan.webp", "assets/img/games/robo-rakshak.webp", "assets/img/games/ant-work.webp", "assets/img/games/meteor-dash.webp", "assets/img/games/echoes.webp"];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('dfw-portal-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const base = new URL('./', self.registration.scope).pathname;
  if (url.pathname.startsWith(base + 'games/')) return;           // games are served by their own workers / the network
  if (req.mode === 'navigate') {                                   // page: network first, offline copy as fallback
    e.respondWith(fetch(req).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put('index.html', cp)); } return res; })
      .catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(hit => {                    // assets: cache first, refresh in background
    const net = fetch(req).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});
