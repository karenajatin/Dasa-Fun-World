// Village Fair service worker
const CACHE = 'villagefair-v4';
const CORE = ['./', 'index.html', 'style.css?v=17', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'fonts/deva-bold.woff2',
  'js/data.js?v=17', 'js/audio.js?v=17', 'js/art.js?v=17', 'js/engine.js?v=17', 'js/games.js?v=17', 'js/story.js?v=17', 'js/ui.js?v=17'];
const VOICE = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'k1', 'k2', 'c1', 'c2', 'c3', 'w1', 'w2', 'h1', 'h2', 'h3', 'h4', 'h5', 'g1', 'g2', 'g3', 'g4', 'b1', 'b2', 'f1', 'f2', 'f3', 'f4', 'x1', 'x2', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 's_great', 's_combo', 's_gold', 's_champ', 's_close', 'z_kabir', 'z_twins', 'z_hasmukh', 'z_bandu', 'z_lalu'].map(k => 'voice/' + k + '.mp3');
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE).then(() => Promise.all(VOICE.map(u => c.add(u).catch(() => null))))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k.startsWith('villagefair')).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin) return;
  const isStatic = /\/(voice|icons|fonts)\//.test(url.pathname) || url.pathname.endsWith('og.jpg');
  if (isStatic) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return res; })));
  } else {
    e.respondWith(fetch(req).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return res; })
      .catch(() => caches.match(req).then(r => r || caches.match(req, {ignoreSearch: true})).then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : undefined))));
  }
});
