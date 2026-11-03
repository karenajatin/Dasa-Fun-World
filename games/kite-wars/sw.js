// Kite Wars: Uttarayan service worker
const CACHE = 'kitewars-v4';
const CORE = ['./', 'index.html', 'style.css?v=13', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png',
  'js/levels.js?v=13', 'js/audio.js?v=13', 'js/art.js?v=13', 'js/game.js?v=13', 'js/render.js?v=13', 'js/story.js?v=13', 'js/ui.js?v=13'];
const VOICE = ['p1','p2','p3','p4','p5','p6','p7','t1','t2','t3','c1','c2','c3','k1','k2','k3','q1','q2','q3','w1','w2','w3','n1','n2','n3','r1','r2','f1','f2','f3','f4','b1','b2','e1','e2','e3','e4','e5','e6','kp_a','kp_d','kp_m','tz_tiger','tz_pinky','tz_twins','tz_rohan','tz_b1','tz_b2','tz_b3','help'].map(k => 'voice/' + k + '.mp3');
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE).then(() => Promise.all(VOICE.map(u => c.add(u).catch(() => null))))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k.startsWith('kitewars')).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin) return;
  const isStatic = /\/(voice|icons)\//.test(url.pathname) || url.pathname.endsWith('og.jpg');
  if (isStatic) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return res; })));
  } else {
    e.respondWith(fetch(req).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return res; })
      .catch(() => caches.match(req, {ignoreSearch: false}).then(r => r || caches.match(req, {ignoreSearch: true})).then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : undefined))));
  }
});
