/* Chandrayaan service worker: offline copy, network-first for page/code so updates arrive on the next open */
const CACHE = "chandrayaan-v5";
const ASSETS = ["./", "index.html", "style.css", "i18n.js", "game.js", "manifest.webmanifest",
  "fonts/gu-Regular.woff2", "fonts/gu-Bold.woff2", "fonts/hi-Regular.woff2", "fonts/hi-Bold.woff2",
  "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "icons/apple-touch-icon.png",
  "voice/en/liftoff.mp3",
  "voice/en/start.mp3",
  "voice/en/alt50.mp3",
  "voice/en/alt20.mp3",
  "voice/en/alt10.mp3",
  "voice/en/slow.mp3",
  "voice/en/fuel.mp3",
  "voice/en/touchdown.mp3",
  "voice/en/failed.mp3",
  "voice/en/complete.mp3",
  "voice/gu/liftoff.mp3",
  "voice/gu/start.mp3",
  "voice/gu/alt50.mp3",
  "voice/gu/alt20.mp3",
  "voice/gu/alt10.mp3",
  "voice/gu/slow.mp3",
  "voice/gu/fuel.mp3",
  "voice/gu/touchdown.mp3",
  "voice/gu/failed.mp3",
  "voice/gu/complete.mp3",
  "voice/hi/liftoff.mp3",
  "voice/hi/start.mp3",
  "voice/hi/alt50.mp3",
  "voice/hi/alt20.mp3",
  "voice/hi/alt10.mp3",
  "voice/hi/slow.mp3",
  "voice/hi/fuel.mp3",
  "voice/hi/touchdown.mp3",
  "voice/hi/failed.mp3",
  "voice/hi/complete.mp3"];
const OURS = k => (k.startsWith("chandra-mission-") || k.startsWith("chandrayaan-")) && k !== CACHE;
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  let hadOld = false;
  const ready = caches.keys().then(ks => {
    const old = ks.filter(OURS); hadOld = old.length > 0;
    return Promise.all(old.map(k => caches.delete(k)));
  }).then(() => self.clients.claim());
  e.waitUntil(ready);
  // An older version was on this phone: once this worker is active, reload its open windows so they run the
  // new version now. Not inside waitUntil: a navigation waits for activation, so awaiting it there would deadlock.
  ready.then(() => hadOld && new Promise(r => setTimeout(r, 50)))
    .then(() => hadOld && self.clients.matchAll({ type: "window" }))
    .then(cs => cs && cs.forEach(c => c.navigate(c.url).catch(() => {})));
});
self.addEventListener("message", e => { if (e.data === "skipWaiting") self.skipWaiting(); });
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const path = new URL(req.url).pathname;
  if (/\/(fonts|icons|voice)\//.test(path)) { // fonts, icons and voice clips never change within a version: cache first
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => { if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; })));
    return;
  }
  e.respondWith(fetch(req, { cache: "no-cache" }).then(res => {
    if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === "navigate" ? caches.match("index.html") : undefined))));
});
