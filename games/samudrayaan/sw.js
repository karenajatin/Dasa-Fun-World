/* Samudrayaan service worker: offline copy; network-first for page/code so updates arrive on the next open */
const CACHE = "samudrayaan-v2";
const ASSETS = [
"./",
"index.html",
"style.css",
"levels.js",
"game.js",
"manifest.webmanifest",
"icons/icon-192.png",
"icons/icon-512.png",
"icons/maskable-512.png",
"icons/apple-touch-icon.png",
"voice/intro1.mp3",
"voice/intro2.mp3",
"voice/intro3.mp3",
"voice/c1a.mp3",
"voice/c2a.mp3",
"voice/c2b.mp3",
"voice/c3a.mp3",
"voice/c3b.mp3",
"voice/c4a.mp3",
"voice/c4b.mp3",
"voice/c5a.mp3",
"voice/c5b.mp3",
"voice/c6a.mp3",
"voice/c6b.mp3",
"voice/c7a.mp3",
"voice/c7b.mp3",
"voice/c8a.mp3",
"voice/c8b.mp3",
"voice/c9a.mp3",
"voice/c9b.mp3",
"voice/c10a.mp3",
"voice/c10b.mp3",
"voice/c11a.mp3",
"voice/c11b.mp3",
"voice/c12a.mp3",
"voice/end1.mp3",
"voice/end2.mp3",
"voice/end3.mp3",
"voice/go.mp3",
"voice/frag.mp3",
"voice/allfrag.mp3",
"voice/checkpoint.mp3",
"voice/o2low.mp3",
"voice/o2crit.mp3",
"voice/hull.mp3",
"voice/dark.mp3",
"voice/angler.mp3",
"voice/pressure.mp3",
"voice/current.mp3",
"voice/complete.mp3",
"voice/failo2.mp3",
"voice/failhull.mp3",
"voice/follow.mp3",
"voice/lighton.mp3",
"voice/sonar.mp3"
];
const OURS = k => k.startsWith("samudrayaan-") && k !== CACHE;
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  let hadOld = false;
  const ready = caches.keys().then(ks => { const old = ks.filter(OURS); hadOld = old.length > 0; return Promise.all(old.map(k => caches.delete(k))); }).then(() => self.clients.claim());
  e.waitUntil(ready);
  ready.then(() => hadOld && new Promise(r => setTimeout(r, 50))).then(() => hadOld && self.clients.matchAll({ type: "window" }))
    .then(cs => cs && cs.forEach(c => c.navigate(c.url).catch(() => {})));
});
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const path = new URL(req.url).pathname;
  if (/\/(icons|voice)\//.test(path) || /og\.jpg$/.test(path)) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => { if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; })));
    return;
  }
  e.respondWith(fetch(req, { cache: "no-cache" }).then(res => {
    if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === "navigate" ? caches.match("index.html") : undefined))));
});
