/* Chandrayaan v3 — original moon-landing game. Canvas + WebAudio; mission-control voice from bundled audio files. */
(() => {
"use strict";
const VERSION = "v3";
const W = 400, H = 560;                 // world size (1 px = 0.2 m)
const M = 0.2;                          // metres per world px
const GRAV = 12, THR = 30, ROT = 2.6;   // px/s², px/s², rad/s
const MAXVY = 25, MAXVX = 20, MAXTILT = 15 * Math.PI / 180; // 5 m/s down, 4 m/s side, 15°
const STEP = 1 / 120;
const TX0 = -800, TX1 = 1200, TSTEP = 8;
const SAVE_KEY = "chandra-mission-v1";  // unchanged so stars saved on the old address carry over
const VOICE_LANGS = ["en", "gu", "hi"];
const VOICE_KEYS = ["liftoff", "start", "alt50", "alt20", "alt10", "slow", "fuel", "touchdown", "failed", "complete"];

/* ---------- levels (v3: no rover; levels 8, 11, 12 are normal landings) ---------- */
const LEVELS = [
  { seed: 11, ground: 470, rough: .3, pad: { x: 200, w: 170 }, start: { x: 200, y: 60, vx: 0 }, fuel: 27, par: 30 },
  { seed: 22, ground: 465, rough: .6, pad: { x: 300, w: 128 }, start: { x: 80, y: 60, vx: 0 }, fuel: 27, par: 34 },
  { seed: 33, ground: 455, rough: .9, craters: [{ x: 110, r: 50, d: 42 }, { x: 315, r: 42, d: 36 }], pad: { x: 212, w: 104 }, start: { x: 330, y: 60, vx: -12 }, fuel: 26, par: 34 },
  { seed: 44, ground: 460, rough: .8, pad: { x: 150, w: 96 }, rocks: [{ x: 78, r: 9 }, { x: 214, r: 8 }, { x: 268, r: 12 }, { x: 345, r: 10 }], start: { x: 305, y: 60, vx: -10 }, fuel: 25, par: 34 },
  { seed: 55, ground: 460, rough: .8, craters: [{ x: 250, r: 45, d: 36 }], pad: { x: 120, w: 104 }, wind: { base: 2.5, gust: 1.5, period: 6 }, start: { x: 285, y: 60, vx: 0 }, fuel: 33, par: 36 },
  { seed: 66, ground: 455, rough: 1, rocks: [{ x: 335, r: 10 }], pad: { x: 255, w: 96 }, start: { x: 110, y: 70, vx: 10 }, fuel: 18, par: 32 },
  { seed: 77, ground: 460, rough: .9, craters: [{ x: 190, r: 40, d: 34 }], pad: { x: 305, w: 96 }, shadow: { x0: -60, speed: 9, drain: 12 }, start: { x: 85, y: 60, vx: 0 }, fuel: 24, par: 34 },
  { seed: 88, ground: 462, rough: .8, pad: { x: 165, w: 92 }, rocks: [{ x: 330, r: 10 }, { x: 70, r: 9 }, { x: 256, r: 9 }], start: { x: 300, y: 60, vx: -6 }, fuel: 24, par: 34 },
  { seed: 99, ground: 458, rough: 1, rocks: [{ x: 170, r: 10 }, { x: 335, r: 9 }], pad: { x: 252, w: 88 }, wind: { base: -2, gust: 2.5, period: 4, bursts: 6 }, start: { x: 110, y: 60, vx: 0 }, fuel: 32, par: 36 },
  { seed: 101, ground: 460, rough: 1, craters: [{ x: 250, r: 48, d: 40 }], pad: { x: 110, w: 88 }, wind: { base: 2, gust: 2, period: 5 }, shadow: { x0: 470, speed: -10, drain: 14 }, start: { x: 320, y: 60, vx: 0 }, fuel: 31, par: 34 },
  { seed: 111, ground: 430, rough: .9, craters: [{ x: 222, r: 78, d: 95 }], pad: { x: 222, w: 80 }, rocks: [{ x: 286, r: 9 }], start: { x: 70, y: 60, vx: 10 }, fuel: 21, par: 34 },
  { seed: 121, ground: 462, rough: 1.1, craters: [{ x: 150, r: 46, d: 40 }], rocks: [{ x: 230, r: 11 }, { x: 386, r: 8 }], pad: { x: 300, w: 80 }, wind: { base: 1.5, gust: 2.5, period: 5, bursts: 6 }, shadow: { x0: -80, speed: 8, drain: 14 }, start: { x: 70, y: 60, vx: 12 }, fuel: 25, par: 40 }
];
const S2 = 1700, S3 = 2200;            // star thresholds (max score 3000: landing 1000 + fuel 1000 + soft 500 + time 500)

/* ---------- helpers ---------- */
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rand = (a, b) => a + Math.random() * (b - a);
const ease = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const easeIO = t => { t = clamp(t, 0, 1); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
function rng(seed) { let s = seed >>> 0; return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------- save ---------- */
let save = { lang: "en", langChosen: false, sound: true, voice: true, unlocked: 1, best: {}, bestScore: {} };
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s) save = Object.assign(save, s); } catch (e) {}
if (!save.langChosen || !I18N[save.lang]) { save.lang = "en"; save.langChosen = false; }
if (typeof save.voice !== "boolean") save.voice = true;
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

/* ---------- i18n ---------- */
let T = I18N[save.lang] || I18N.en;
function applyLang() {
  T = I18N[save.lang] || I18N.en;
  document.documentElement.lang = save.lang;
  document.querySelectorAll("[data-t]").forEach(el => { const k = el.dataset.t; if (T[k] != null) el.textContent = T[k]; });
  $("howList").innerHTML = T.how.map(h => "<li>" + h + "</li>").join("");
  document.querySelectorAll(".lang").forEach(b => b.classList.toggle("on", b.dataset.lang === save.lang));
  document.querySelectorAll(".sound-toggle").forEach(b => { b.textContent = save.sound ? T.soundOn : T.soundOff; b.classList.toggle("off", !save.sound); b.setAttribute("aria-pressed", save.sound); });
  document.querySelectorAll(".voice-toggle").forEach(b => { b.textContent = save.voice ? T.voiceOn : T.voiceOff; b.classList.toggle("off", !save.voice); b.setAttribute("aria-pressed", save.voice); });
  if (G.L) $("hLevel").textContent = T.level + " " + (G.li + 1) + " · " + T.names[G.li];
  buildGrid();
}

/* ---------- audio (generated sound effects) ---------- */
const Snd = {
  ctx: null, master: null, vbus: null, noise: null, thrustGain: null, thrOn: false, duckK: 1,
  init() {
    if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = save.sound ? .7 : 0; this.master.connect(c.destination);
    this.vbus = c.createGain(); this.vbus.gain.value = 1; this.vbus.connect(c.destination);   // voice has its own switch
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    let b = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b = (b + .02 * w) / 1.02; d[i] = b * 3.5 + w * .15; }
    this.noise = buf;
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900;
    this.thrustGain = c.createGain(); this.thrustGain.gain.value = 0;
    src.connect(f); f.connect(this.thrustGain); this.thrustGain.connect(this.master); src.start();
    Voice.preload();
  },
  setOn(on) { if (this.master) this.master.gain.setTargetAtTime(on ? .7 : 0, this.ctx.currentTime, .05); },
  thrust(on) { this.thrOn = on; if (this.thrustGain) this.thrustGain.gain.setTargetAtTime(on ? .55 * this.duckK : 0, this.ctx.currentTime, on ? .03 : .08); },
  duck(on) { this.duckK = on ? .4 : 1; if (this.thrOn) this.thrust(true); },
  tone(f, dur, type = "sine", vol = .2, f2 = null, delay = 0, dest = null) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    o.connect(g); g.connect(dest || this.master); o.start(t); o.stop(t + dur + .05);
  },
  burst(dur, vol, freq, delay = 0, type = "lowpass", f2 = null) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.noise; const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t);
    if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(.05, dur * .2)); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t, Math.random()); s.stop(t + dur + .05);
  },
  crash() { this.burst(1.6, 1, 700); this.burst(.35, .8, 3000); this.tone(90, 1.3, "sine", .7, 24); this.burst(2.4, .5, 260, .15); },
  land() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, .4, "triangle", .2, null, i * .1)); this.burst(.6, .25, 500); },
  pop() { this.burst(.14, .35, 2600, 0, "highpass"); this.tone(1500, .1, "triangle", .08, 2400); },
  fail() { [392, 330, 262].forEach((f, i) => this.tone(f, .4, "triangle", .2, null, i * .16)); },
  star(i) { this.tone(880 + i * 260, .3, "sine", .22); this.tone(1760 + i * 520, .2, "sine", .06); },
  beep() { this.tone(1250, .08, "square", .08); },
  click() { this.tone(700, .04, "triangle", .12); },
  rcs() { this.burst(.07, .12, 4000); },
  whoosh(dur = .7, vol = .22, delay = 0) { this.burst(dur, vol, 300, delay, "bandpass", 2600); },
  rumble(dur = 2, vol = .5) { this.burst(dur, vol, 160, 0, "lowpass", 90); this.tone(48, dur, "sine", vol * .6, 36); }
};
function buzz(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

/* ---------- mission-control voice (bundled audio files, decoded once) ---------- */
const Voice = {
  bufs: {}, loading: {}, src: null, active: null, pend: null, log: [],
  lang() { return VOICE_LANGS.indexOf(save.lang) >= 0 ? save.lang : "en"; },
  url(l, k) { return "voice/" + l + "/" + k + ".mp3"; },
  note(ev, id, extra) { const e = { ev, id, t: Math.round(performance.now()), mode: G.mode }; if (G.mode === "play" && G.alt != null) e.alt = +G.alt.toFixed(1); if (extra) Object.assign(e, extra); this.log.push(e); if (this.log.length > 400) this.log.shift(); },
  load(l, k) {
    const id = l + "/" + k;
    if (this.bufs[id]) return Promise.resolve(this.bufs[id]);
    if (this.loading[id]) return this.loading[id];
    if (!Snd.ctx) return Promise.resolve(null);
    const p = fetch(this.url(l, k)).then(r => { if (!r.ok) throw new Error("http " + r.status); return r.arrayBuffer(); })
      .then(ab => new Promise((res, rej) => Snd.ctx.decodeAudioData(ab, res, rej)))
      .then(b => { this.bufs[id] = b; this.note("loaded", id); return b; })
      .catch(() => { this.loading[id] = null; this.note("loadfail", id); return null; });
    this.loading[id] = p; return p;
  },
  preload() { if (!Snd.ctx || !save.voice) return; const l = this.lang(); VOICE_KEYS.forEach(k => this.load(l, k)); },
  say(k, pri = 1) {
    const id = this.lang() + "/" + k;
    if (!save.voice) { this.note("muted", id); return; }
    if (!Snd.ctx) { this.note("noaudio", id); return; }
    const req = { k, pri, at: performance.now() };
    this.note("say", id, { pri });
    if (this.active) {
      if (pri > this.active.pri) this.stop();
      else { if (!this.pend || pri >= this.pend.pri) this.pend = req; this.note("queued", id); return; }
    }
    this.start(req);
  },
  start(req) {
    this.active = req;
    const l = this.lang();
    const play = (b, pid) => {
      if (this.active !== req) return;                                  // cut while loading
      if (!b) { this.note("missing", pid); this.active = null; return this.next(); }
      if (performance.now() - req.at > (req.pri >= 3 ? 6000 : 1600) || (req.pri < 3 && G.mode !== "play")) { this.note("stale", pid); this.active = null; return this.next(); }
      if (!save.voice) { this.active = null; return; }
      const c = Snd.ctx, t = c.currentTime + .09;
      Snd.tone(2525, .07, "sine", .045, null, 0, Snd.vbus);                // short radio chirp before each call
      const s = c.createBufferSource(); s.buffer = b; s.connect(Snd.vbus); s.start(t);
      this.src = s; Snd.duck(true);
      this.note("play", pid, { dur: +b.duration.toFixed(2) });
      s.onended = () => { if (this.src !== s) return; this.src = null; this.active = null; Snd.duck(false); this.note("ended", pid); this.next(); };
    };
    this.load(l, req.k).then(b => {
      if (b || l === "en") return play(b, l + "/" + req.k);
      return this.load("en", req.k).then(b2 => play(b2, "en/" + req.k));   // fall back to English
    });
  },
  next() { const p = this.pend; this.pend = null; if (p) this.start(p); },
  stop(keepPend) {
    if (this.src) { const s = this.src; this.src = null; try { s.onended = null; s.stop(); } catch (e) {} this.note("cut", this.active ? this.active.k : ""); Snd.duck(false); }
    this.active = null; if (!keepPend) this.pend = null;
  }
};
window.__voice = Voice.log;   // read-only event log used by automated tests

/* ---------- canvas & layout ---------- */
const cv = $("c"), cx = cv.getContext("2d");
let cw = 0, ch = 0, dpr = 1, scale = 1, ox = 0, oy = 0, starL = [[], [], []];
function layout() {
  cw = window.innerWidth; ch = window.innerHeight; dpr = Math.min(window.devicePixelRatio || 1, G && G.lowFx ? 1.5 : 2);
  cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
  const portrait = ch >= cw * 1.05;
  const ctrlH = portrait ? 142 : 0;
  const availH = ch - ctrlH;
  scale = Math.min(cw / W, availH / H);
  ox = (cw - W * scale) / 2; oy = availH - H * scale;
  const area = cw * ch;
  starL = [3200, 9000, 26000].map((d, li) => Array.from({ length: Math.round(area / d) }, () => ({ x: Math.random() * cw, y: Math.random() * ch, r: [rand(.5, .9), rand(.9, 1.4), rand(1.4, 2.1)][li], p: Math.random() * 6.28, s: rand(.6, 2.4) })));
}
window.addEventListener("resize", layout); window.addEventListener("orientationchange", () => setTimeout(layout, 200));

/* ---------- pre-rendered sprites (cheap to draw every frame) ---------- */
function mk(w, h, fn) { const c = document.createElement("canvas"); c.width = w; c.height = h || w; fn(c.getContext("2d"), c); return c; }
function glow(stops) { return mk(64, 64, e => { const g = e.createRadialGradient(32, 32, 0, 32, 32, 32); stops.forEach(s => g.addColorStop(s[0], s[1])); e.fillStyle = g; e.fillRect(0, 0, 64, 64); }); }
const SP = {
  fire: glow([[0, "rgba(255,252,230,1)"], [.22, "rgba(255,206,100,.95)"], [.55, "rgba(255,112,32,.5)"], [1, "rgba(255,60,10,0)"]]),
  glow: glow([[0, "rgba(255,226,160,.95)"], [.35, "rgba(255,160,60,.4)"], [1, "rgba(255,120,40,0)"]]),
  smoke: glow([[0, "rgba(78,76,86,.95)"], [.55, "rgba(66,64,74,.5)"], [1, "rgba(60,60,70,0)"]]),
  dust: glow([[0, "rgba(200,194,182,.9)"], [.55, "rgba(176,170,160,.4)"], [1, "rgba(160,155,145,0)"]]),
  white: glow([[0, "rgba(255,255,255,1)"], [.45, "rgba(225,238,255,.45)"], [1, "rgba(200,220,255,0)"]]),
  blue: glow([[0, "rgba(160,210,255,.9)"], [.4, "rgba(90,150,255,.35)"], [1, "rgba(60,120,255,0)"]]),
  green: glow([[0, "rgba(220,255,230,1)"], [.35, "rgba(80,255,150,.55)"], [1, "rgba(40,255,120,0)"]]),
  red: glow([[0, "rgba(255,230,230,1)"], [.35, "rgba(255,80,80,.55)"], [1, "rgba(255,40,40,0)"]])
};
function blit(c, sp, x, y, r) { c.drawImage(sp, x - r, y - r, r * 2, r * 2); }
function makeEarth(N) {
  return mk(N, N, e => {
    const r = N * .406, c = N / 2, R = rng(7), k = N / 128;
    e.fillStyle = "rgba(110,170,255,.22)"; e.beginPath(); e.arc(c, c, r + 8 * k, 0, 7); e.fill();
    const g = e.createRadialGradient(c - 15 * k, c - 15 * k, 5 * k, c, c, r); g.addColorStop(0, "#5aa8ff"); g.addColorStop(1, "#0b3a8c");
    e.save(); e.beginPath(); e.arc(c, c, r, 0, 7); e.clip(); e.fillStyle = g; e.fillRect(0, 0, N, N);
    for (let i = 0; i < 11; i++) { e.fillStyle = i % 3 ? "#3f9a4a" : "#b69b5a"; e.beginPath(); e.ellipse(c + (R() - .5) * 90 * k, c + (R() - .5) * 90 * k, (8 + R() * 18) * k, (5 + R() * 12) * k, R() * 3, 0, 7); e.fill(); }
    e.fillStyle = "rgba(255,255,255,.75)"; for (let i = 0; i < 14; i++) { e.beginPath(); e.ellipse(c + (R() - .5) * 100 * k, c + (R() - .5) * 100 * k, (6 + R() * 16) * k, (2 + R() * 4) * k, R() * 3, 0, 7); e.fill(); }
    const sh = e.createLinearGradient(c - r, 0, c + r, 0); sh.addColorStop(0, "rgba(0,0,10,0)"); sh.addColorStop(.55, "rgba(0,0,10,.15)"); sh.addColorStop(.8, "rgba(0,0,10,.85)"); sh.addColorStop(1, "rgba(0,0,10,.95)");
    e.fillStyle = sh; e.fillRect(0, 0, N, N); e.restore();
  });
}
const earth = makeEarth(128), bigEarth = makeEarth(256);
const moonSp = mk(256, 256, e => {
  const c = 128, r = 120, R = rng(5);
  const g = e.createRadialGradient(c - 40, c - 40, 10, c, c, r); g.addColorStop(0, "#e9e9ef"); g.addColorStop(1, "#8d8f9c");
  e.save(); e.beginPath(); e.arc(c, c, r, 0, 7); e.clip(); e.fillStyle = g; e.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 26; i++) { const x = c + (R() - .5) * 220, y = c + (R() - .5) * 220, rr = 4 + R() * 18; e.fillStyle = "rgba(90,92,108,.35)"; e.beginPath(); e.arc(x, y, rr, 0, 7); e.fill(); e.fillStyle = "rgba(255,255,255,.18)"; e.beginPath(); e.arc(x - rr * .2, y - rr * .2, rr * .75, 0, 7); e.fill(); }
  const sh = e.createLinearGradient(0, 0, 256, 256); sh.addColorStop(.55, "rgba(0,0,12,0)"); sh.addColorStop(.85, "rgba(0,0,12,.7)"); e.fillStyle = sh; e.fillRect(0, 0, 256, 256); e.restore();
});

/* ---------- game state ---------- */
const G = { mode: "title", li: 0, L: null, ter: null, t: 0, ship: null, parts: [], fx: [], shake: 0, flash: 0, acc: 0, ts: 1,
  input: { thrust: false, left: false, right: false }, warned: {}, co: {}, result: null, titleT: 0, cine: null, celeb: 0,
  cam: { z: 1, fx: 200, fy: 300, cy: .4 }, lowFx: false, perf: { acc: 0, n: 0 }, version: VERSION };
window.__cm = G; // read-only hook used by automated tests

function genLevel(L) {
  const R = rng(L.seed), n = Math.round((TX1 - TX0) / TSTEP) + 1, ys = new Float32Array(n);
  const p1 = R() * 6, p2 = R() * 6, p3 = R() * 6;
  for (let i = 0; i < n; i++) {
    const x = TX0 + i * TSTEP;
    ys[i] = L.ground + L.rough * (Math.sin(x * .013 + p1) * 16 + Math.sin(x * .031 + p2) * 8 + Math.sin(x * .071 + p3) * 4) + (R() - .5) * L.rough * 5;
  }
  (L.craters || []).forEach(c => {
    for (let i = 0; i < n; i++) {
      const x = TX0 + i * TSTEP, t = (x - c.x) / c.r, a = Math.abs(t);
      if (a < 1) ys[i] += c.d * (1 - t * t);
      if (a > .7 && a < 1.6) ys[i] -= c.d * .28 * Math.exp(-Math.pow((a - 1.05) / .2, 2));
    }
  });
  const pad = { x0: L.pad.x - L.pad.w / 2, x1: L.pad.x + L.pad.w / 2 };
  const ci = Math.round((L.pad.x - TX0) / TSTEP); pad.y = ys[ci];
  for (let i = 0; i < n; i++) {
    const x = TX0 + i * TSTEP;
    if (x >= pad.x0 - TSTEP && x <= pad.x1 + TSTEP) ys[i] = pad.y;
    else { const dd = Math.min(Math.abs(x - (pad.x0 - TSTEP)), Math.abs(x - (pad.x1 + TSTEP))); if (dd < 24) { const k = dd / 24; ys[i] = pad.y * (1 - k) + ys[i] * k; } }
  }
  for (let i = 0; i < n; i++) ys[i] = clamp(ys[i], 250, 640);
  const ter = { ys, pad };
  ter.h = x => { const f = (clamp(x, TX0, TX1 - 1) - TX0) / TSTEP, i = Math.floor(f), k = f - i; return ys[i] * (1 - k) + ys[i + 1] * k; };
  ter.rocks = (L.rocks || []).map(r => ({ x: r.x, r: r.r, y: ter.h(r.x) - r.r * .45, pts: Array.from({ length: 9 }, () => r.r * (.78 + R() * .3)) }));
  ter.pocks = Array.from({ length: 70 }, () => ({ x: TX0 + R() * (TX1 - TX0), d: 8 + R() * 90, r: 2 + R() * 7 }));
  ter.hills = Array.from({ length: 61 }, (_, i) => L.ground - 70 - Math.sin(i * .5 + p2) * 22 - Math.sin(i * 1.3 + p1) * 10 - R() * 6);
  ter.hills2 = Array.from({ length: 41 }, (_, i) => L.ground - 120 - Math.sin(i * .37 + p3) * 30 - Math.sin(i * .9 + p2) * 12);
  return ter;
}

function loadLevel(i) {
  G.li = i; G.L = LEVELS[i]; G.ter = genLevel(G.L); G.t = 0; G.parts = []; G.shake = 0; G.flash = 0; G.acc = 0; G.warned = {}; G.ts = 1;
  G.co = { slowT: -9 }; G.alt = null; G.celeb = 0; G.crashAt = null; G.rcsT = 0;
  G.burst = { t: 0, a: 0, next: 4 }; G.result = null; G.landInfo = null; G.failReason = null;
  G.cam.z = 1; G.cam.cy = .4;
  const s = G.L.start;
  G.ship = { x: s.x, y: s.y, vx: s.vx || 0, vy: 0, a: 0, fuel: G.L.fuel, batt: 100, thrusting: false, alive: true, flame: 0, cy: 0, cv: 0, lights: false };
  $("hLevel").textContent = T.level + " " + (i + 1) + " · " + T.names[i];
  $("battBar").classList.toggle("hidden", !G.L.shadow);
  $("windRow").classList.toggle("hidden", !G.L.wind);
}

/* ---------- geometry ---------- */
const SS = 1.25; // ship scale
const FEET = [[-13, 15], [13, 15]].map(p => [p[0] * SS, p[1] * SS]);
const BODY = [[-10, -9], [10, -9], [-10, 5], [10, 5], [0, -18], [-7, 10], [7, 10]].map(p => [p[0] * SS, p[1] * SS]);
function toWorld(s, p) { const c = Math.cos(s.a), n = Math.sin(s.a); return [s.x + p[0] * c - p[1] * n, s.y + p[0] * n + p[1] * c]; }
function windAt(t) {
  const w = G.L && G.L.wind; if (!w) return 0;
  let a = w.base + w.gust * Math.sin(t * 6.283 / w.period) * (.65 + .35 * Math.sin(t * 1.7));
  if (w.bursts && G.burst.t > 0) a += G.burst.a * Math.sin(Math.PI * (1 - G.burst.t / 1.3));
  return a;
}
function inDark(x) { const sh = G.L.shadow; if (!sh) return false; const e = sh.x0 + sh.speed * G.t; return sh.speed > 0 ? x < e : x > e; }
function shadowEdge() { const sh = G.L.shadow; return sh.x0 + sh.speed * G.t; }
function altOf(s) { const [fx, fy] = toWorld(s, [0, 15 * SS]); return Math.max(0, (G.ter.h(fx) - fy) * M); }

/* ---------- particles (capped; sprites, no per-particle gradients) ---------- */
function cap() { return G.lowFx ? 240 : 520; }
function emit(p, list) { list = list || G.parts; if (list.length < cap()) list.push(p); }
function exhaust(s, dt, list, k = 1, gfn) {
  list = list || G.parts;
  const n = Math.max(1, Math.round(dt * (G.lowFx ? 110 : 190)));
  const dx = -Math.sin(s.a), dy = Math.cos(s.a);
  for (let i = 0; i < n; i++) {
    const lx = rand(-2.5, 2.5) * SS * k, ly = 13 * SS * k, c = Math.cos(s.a), sn = Math.sin(s.a);
    const nx = s.x + lx * c - ly * sn, ny = s.y + lx * sn + ly * c;
    const sp = rand(80, 150) * k, sd = rand(-.22, .22);
    emit({ x: nx, y: ny, vx: (s.vx || 0) + (dx * Math.cos(sd) - dy * Math.sin(sd)) * sp, vy: (s.vy || 0) + (dx * Math.sin(sd) + dy * Math.cos(sd)) * sp, life: rand(.22, .45), max: .45, k: "fire", sz: rand(2.2, 3.6) * k }, list);
  }
  if (!gfn) return;
  const nx = s.x - 13 * SS * Math.sin(s.a), ny = s.y + 13 * SS * Math.cos(s.a);
  const gh = gfn(nx), alt = gh - ny;
  if (alt < 90 && alt > -5 && Math.cos(s.a) > .5) {
    const q = 1 - alt / 90, m = Math.round(q * 5 * dt * 60);
    for (let i = 0; i < m; i++) { const dir = Math.random() < .5 ? -1 : 1; const gx = nx + rand(-6, 6); emit({ x: gx, y: gfn(gx) - 1, vx: dir * rand(50, 150) * (.5 + q), vy: -rand(5, 35), life: rand(.5, 1.1), max: 1.1, k: "dust", sz: rand(1.2, 2.6), g: 6 }); }
    if (Math.random() < q * dt * 14) { const dir = Math.random() < .5 ? -1 : 1; emit({ x: nx + dir * rand(4, 14), y: gfn(nx) - 4, vx: dir * rand(25, 60) * (.5 + q), vy: -rand(4, 14), life: rand(.9, 1.5), max: 1.5, k: "cloud", sz: rand(6, 10), g: 0 }); }
  }
}
function rcsPuff(s, dir) {
  // small cold-gas puffs from the deck corners, opposite sides, when the lander rotates
  const pts = dir > 0 ? [[-10, -9, -1], [10, 4, 1]] : [[10, -9, 1], [-10, 4, -1]];
  for (const [lx, ly, sx] of pts) {
    const [px, py] = toWorld(s, [lx * SS, ly * SS]); const c = Math.cos(s.a), n = Math.sin(s.a);
    const vx = sx * c * 60, vy = sx * n * 60;
    emit({ x: px, y: py, vx: s.vx + vx + rand(-6, 6), vy: s.vy + vy + rand(-6, 6), life: rand(.25, .4), max: .4, k: "puff", sz: rand(1.6, 2.4) });
  }
}
function dustCloud(x, y, pow = 1) {
  const n = G.lowFx ? 10 : 18;
  for (let i = 0; i < n; i++) { const dir = i % 2 ? 1 : -1; emit({ x: x + dir * rand(2, 16), y: y - rand(2, 6), vx: dir * rand(20, 75) * pow, vy: -rand(3, 18) * pow, life: rand(1.2, 2.1), max: 2.1, k: "cloud", sz: rand(6, 12) }); }
  for (let i = 0; i < (G.lowFx ? 18 : 36); i++) { const dir = Math.random() < .5 ? -1 : 1; emit({ x: x + rand(-10, 10), y: y - 1, vx: dir * rand(40, 140) * pow, vy: -rand(5, 45) * pow, life: rand(.6, 1.3), max: 1.3, k: "dust", sz: rand(1.4, 3), g: 10 }); }
}
function explode(s) {
  const X = s.x, Y = s.y, gy = G.ter.h(X);
  for (let i = 0; i < (G.lowFx ? 7 : 12); i++) { const a = rand(0, 6.28), sp = rand(5, 45); emit({ x: X + rand(-6, 6), y: Y + rand(-6, 6), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 12, life: rand(.5, 1), max: 1, k: "fireball", sz: rand(10, 20) }); }
  for (let i = 0; i < (G.lowFx ? 25 : 50); i++) { const a = rand(0, 6.28), sp = rand(60, 220); emit({ x: X, y: Y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, life: rand(.4, 1), max: 1, k: "spark", sz: rand(1, 2.2), g: GRAV * 1.5 }); }
  const cols = ["#ffd36a", "#e3a634", "#c9ced8", "#24408f", "#8b8f9b", "#a86e14"];
  for (let i = 0; i < (G.lowFx ? 14 : 26); i++) { const a = rand(-3.0, -.15), sp = rand(40, 170); emit({ x: X + rand(-8, 8), y: Y + rand(-8, 8), vx: Math.cos(a) * sp + s.vx * .3, vy: Math.sin(a) * sp, life: rand(1.6, 3), max: 3, k: "chunk", sh: i % 4, sz: rand(2.5, 6), g: GRAV * 1.6, rot: rand(0, 6), vr: rand(-12, 12), c: cols[i % cols.length], bounce: true }); }
  for (let i = 0; i < (G.lowFx ? 8 : 16); i++) emit({ x: X + rand(-10, 10), y: Y + rand(-8, 4), vx: rand(-14, 14), vy: -rand(4, 22), life: rand(2, 3.4), max: 3.4, k: "smoke", sz: rand(8, 15), g: -2 });
  emit({ x: X, y: Y, vx: 0, vy: 0, life: .7, max: .7, k: "ring", sz: 110 });
  emit({ x: X, y: Y, vx: 0, vy: 0, life: .45, max: .45, k: "ring", sz: 60 });
  emit({ x: X, y: gy, vx: 0, vy: 0, life: .9, max: .9, k: "gring", sz: 150 });
  dustCloud(X, gy, 1.5);
  G.shake = 20; G.flash = .85; G.ts = .3;
}
function celebrate(s) {
  const cols = ["#ff5d8f", "#ffd25c", "#4be38a", "#5ab0ff", "#ffffff", "#ff9f43", "#b388ff"];
  for (let i = 0; i < (G.lowFx ? 50 : 110); i++) { const a = rand(-2.6, -.55), sp = rand(60, 190); emit({ x: s.x + rand(-6, 6), y: s.y - 14, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(2.4, 4), max: 4, k: "confetti", sz: rand(2.4, 4), c: cols[i % cols.length], g: 22, rot: rand(0, 6), vr: rand(-9, 9), sway: rand(0, 6), drag: true }); }
  for (let i = 0; i < 10; i++) { const a = rand(0, 6.28), d = rand(26, 50); emit({ x: s.x + Math.cos(a) * d, y: s.y - 6 + Math.sin(a) * d * .8, vx: 0, vy: -rand(2, 8), life: rand(.7, 1.6), max: 1.6, k: "twinkle", sz: rand(1.8, 3.4) }); }
}
function stepParts(list, dt, gfn, windy) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i]; p.life -= dt; if (p.life <= 0) { list[i] = list[list.length - 1]; list.pop(); continue; }
    if (p.g) p.vy += p.g * dt;
    if (p.k === "dust" || p.k === "fire" || p.k === "puff" || p.k === "cloud" || p.k === "fireball" || p.k === "smoke") { const d = p.k === "dust" ? .985 : p.k === "cloud" ? .975 : .955; const f = Math.pow(d, dt * 60); p.vx *= f; p.vy *= f; }
    if (p.drag) { p.vx *= Math.pow(.97, dt * 60); p.vy = Math.min(p.vy, 30); p.x += Math.sin(p.life * 5 + p.sway) * 12 * dt; }
    if (windy && p.k !== "ring" && p.k !== "gring") p.vx += windy * dt * 1.5;
    p.x += p.vx * dt; p.y += p.vy * dt; if (p.rot != null) p.rot += p.vr * dt;
    if (gfn) {
      if (p.bounce) { const gy = gfn(p.x); if (p.y > gy) { p.y = gy; p.vy *= -.35; p.vx *= .55; p.vr *= .5; } }
      else if ((p.k === "dust" || p.k === "confetti") && p.y > gfn(p.x)) { p.y = gfn(p.x); p.vy = 0; p.vx *= .8; if (p.k === "confetti") p.vr *= .8; }
    }
  }
}

/* ---------- update ---------- */
function update(dt) {
  const s = G.ship, L = G.L, inp = G.input;
  G.t += dt;
  const rotDir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  s.a = clamp(s.a + rotDir * ROT * dt, -1.6, 1.6);
  if (rotDir) { G.rcsT -= dt; if (G.rcsT <= 0) { G.rcsT = .05; rcsPuff(s, rotDir); } } else G.rcsT = 0;
  const th = inp.thrust && s.fuel > 0; s.thrusting = th;
  let ax = windAt(G.t), ay = GRAV; G.windNow = ax;
  if (th) { ax += Math.sin(s.a) * THR; ay -= Math.cos(s.a) * THR; s.fuel = Math.max(0, s.fuel - dt); exhaust(s, dt, G.parts, 1, G.ter.h); }
  if (L.wind && L.wind.bursts) { if (G.burst.t > 0) G.burst.t -= dt; else if (G.t > G.burst.next) { G.burst.t = 1.3; G.burst.a = (Math.random() < .5 ? -1 : 1) * L.wind.bursts; G.burst.next = G.t + rand(4, 7.5); toast(T.gust, "warn", 1100); } }
  s.vx += ax * dt; s.vy += ay * dt; s.x += s.vx * dt; s.y += s.vy * dt;
  if (s.x < 14) { s.x = 14; s.vx = Math.max(0, s.vx); } if (s.x > W - 14) { s.x = W - 14; s.vx = Math.min(0, s.vx); }
  if (L.shadow) { if (inDark(s.x)) { s.batt -= L.shadow.drain * dt; if (!G.warned.dark) { G.warned.dark = 1; toast(T.inDark, "warn", 1800); } } else s.batt = Math.min(100, s.batt + 3 * dt);
    const e = shadowEdge(); if (!G.warned.near && Math.abs(e - s.x) < 70 && !inDark(s.x)) { G.warned.near = 1; toast(T.darkNear, "warn", 1500); }
    if (s.batt <= 0) { s.batt = 0; return fail("r_battery"); } }
  const ff = s.fuel / L.fuel;
  if (ff < .2 && !G.warned.low) { G.warned.low = 1; toast(T.lowFuel, "warn", 1300); Voice.say("fuel", 2); }
  if (s.fuel <= 0 && !G.warned.out) { G.warned.out = 1; toast(T.noFuel, "warn", 1500); }
  if (ff < .2 && s.fuel > 0 && Math.floor(G.t * 1.6) !== G.warned.bt) { G.warned.bt = Math.floor(G.t * 1.6); Snd.beep(); }
  // mission-control callouts
  const alt = altOf(s), co = G.co; G.alt = alt;
  if (s.vy > 2) {
    if (!co.a50 && alt < 50 && alt > 21) { co.a50 = 1; Voice.say("alt50", 1); }
    if (!co.a20 && alt < 20 && alt > 11) { co.a20 = co.a50 = 1; Voice.say("alt20", 1); }
    if (!co.a10 && alt < 10 && alt > 3) { co.a10 = co.a20 = co.a50 = 1; Voice.say("alt10", 1); }
  }
  if (alt < 32 && alt > 2 && s.vy > MAXVY * 1.3 && G.t - co.slowT > 3.5) { co.slowT = G.t; Voice.say("slow", 2); }
  if (s.y < -260) return fail("r_lost");
  collide();
}

function collide() {
  const s = G.ship, ter = G.ter;
  const pts = BODY.map(p => toWorld(s, p)), feet = FEET.map(p => toWorld(s, p));
  for (const k of ter.rocks) for (const p of pts.concat(feet)) if (Math.hypot(p[0] - k.x, p[1] - k.y) < k.r) return crash("r_rock");
  const footHit = feet.some(p => p[1] >= ter.h(p[0])), bodyHit = pts.some(p => p[1] >= ter.h(p[0]));
  if (!footHit && !bodyHit) return;
  if (bodyHit && !footHit) return crash("r_body");
  const onPad = feet.every(p => p[0] >= ter.pad.x0 - 1 && p[0] <= ter.pad.x1 + 1);
  if (s.vy > MAXVY) return crash("r_vy");
  if (Math.abs(s.vx) > MAXVX) return crash("r_vx");
  if (Math.abs(s.a) > MAXTILT) return crash("r_tilt");
  if (!onPad) return crash("r_pad");
  land();
}

function land() {
  const s = G.ship;
  G.landInfo = { vy: s.vy, vx: s.vx, t: G.t, fuel: s.fuel };
  s.cv = 4 + s.vy * .9;                    // footpad compression spring gets the impact speed
  s.y = G.ter.pad.y - 15 * SS; s.a = 0; s.vx = s.vy = 0; s.thrusting = false; Snd.thrust(false);
  dustCloud(s.x, G.ter.pad.y, .9); G.shake = 3.5; buzz(30);
  G.mode = "landed"; G.celeb = 0; s.lights = true; setControls("none");
  Voice.say("touchdown", 3);
  setTimeout(() => { if (G.mode === "landed") { celebrate(s); Snd.land(); Snd.pop(); } }, 380);
  setTimeout(() => { if (G.mode === "landed") { Snd.pop(); celebrate({ x: s.x + rand(-20, 20), y: s.y - 6 }); } }, 1050);
  setTimeout(() => { if (G.mode === "landed") finishLevel(); }, 2700);
}
function crash(reason) {
  const s = G.ship; s.alive = false; s.thrusting = false; Snd.thrust(false); Snd.crash(); buzz([120, 60, 220]);
  G.crashAt = { x: s.x, y: s.y };
  explode(s); G.mode = "crashed"; G.failReason = reason; setControls("none");
  Voice.say("failed", 3);
  setTimeout(() => { if (G.mode === "crashed") showResult(false); }, 2000);
}
function fail(reason) {
  const s = G.ship; s.thrusting = false; Snd.thrust(false); Snd.fail(); buzz(200);
  G.mode = "crashed"; G.failReason = reason; s.dead = true; setControls("none");
  Voice.say("failed", 3);
  setTimeout(() => { if (G.mode === "crashed") showResult(false); }, 1300);
}

/* ---------- scoring (no rover bonus) ---------- */
function finishLevel() {
  if (G.mode === "result") return;
  const L = G.L, li = G.landInfo;
  const pFuel = Math.round(li.fuel / L.fuel * 1000), pSoft = Math.round(clamp(1 - li.vy / MAXVY, 0, 1) * 500), pTime = Math.round(clamp(1 - li.t / L.par, 0, 1) * 500);
  const total = 1000 + pFuel + pSoft + pTime;
  const stars = 1 + (total >= S2 ? 1 : 0) + (total >= S3 ? 1 : 0);
  G.result = { win: true, stars, total, rows: [["b_land", 1000], ["b_fuel", pFuel], ["b_soft", pSoft], ["b_time", pTime]] };
  const k = String(G.li);
  save.best[k] = Math.max(save.best[k] || 0, stars); save.bestScore[k] = Math.max(save.bestScore[k] || 0, total);
  save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, G.li + 2)); persist();
  Voice.say("complete", 3);
  showResult(true);
}

/* ---------- UI & transitions ---------- */
const screens = ["sTitle", "sHow", "sLevels", "sIntro", "sPause", "sResult"];
function show(id) { screens.forEach(s => $(s).classList.toggle("hidden", s !== id)); document.body.classList.toggle("on-title", id === "sTitle"); }
let fading = false;
function fadeTo(fn, ms = 260) {
  // smooth screen change: fade to dark, swap, fade back in
  if (fading) return; fading = true; const cu = $("curtain"); cu.classList.add("on");
  setTimeout(() => { try { fn(); } finally { requestAnimationFrame(() => { cu.classList.remove("on"); fading = false; }); } }, ms);
}
let toastTimer = 0;
function toast(msg, cls = "", ms = 1400) { const t = $("toast"); t.textContent = msg; t.className = "toast " + cls; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add("hidden"), ms); }
function setControls(m) { $("controls").classList.toggle("hidden", m !== "play"); }
function buildGrid() {
  const g = $("levelGrid"); if (!g) return; g.innerHTML = "";
  LEVELS.forEach((L, i) => {
    const b = document.createElement("button"), lock = i + 1 > save.unlocked, st = save.best[i] || 0;
    b.className = "lv" + (lock ? " locked" : "") + (i + 1 === save.unlocked && !st ? " cur" : "");
    b.style.animationDelay = (i * 30) + "ms";
    b.innerHTML = "<span class='n'>" + (lock ? "🔒" : i + 1) + "</span><span class='nm'>" + (lock ? T.locked : T.names[i]) + "</span><span class='st'>" + [0, 1, 2].map(j => "<span class='" + (j < st ? "g" : "") + "'>★</span>").join("") + "</span>";
    b.setAttribute("aria-label", T.level + " " + (i + 1) + (lock ? " " + T.locked : ""));
    b.addEventListener("click", () => { if (lock) { Snd.beep(); return; } Snd.click(); go(i); });
    g.appendChild(b);
  });
}
function go(i) { if (i === 0) fadeTo(startCine); else fadeTo(() => openLevel(i)); }   // level 1 opens with the launch cinematic
function openLevel(i) {
  Voice.stop(); Snd.thrust(false);
  loadLevel(i); G.mode = "intro"; setControls("none"); $("hud").classList.remove("hidden");
  $("iNo").textContent = "CHANDRAYAAN · " + T.level + " " + (i + 1) + " / " + LEVELS.length; $("iName").textContent = T.names[i]; $("iTip").textContent = T.tips[i];
  show("sIntro"); updateHud();
}
function begin() { if (G.mode !== "intro") return; Snd.init(); Snd.click(); show(null); G.mode = "play"; setControls("play"); Voice.say("start", 1); }
function showResult(win) {
  G.mode = "result"; setControls("none"); Snd.thrust(false); $("hud").classList.add("hidden");
  const r = G.result;
  const perfect = win && r.stars === 3;
  $("resTitle").textContent = win ? (perfect ? T.perfect : T.landed) : (G.failReason === "r_battery" || G.failReason === "r_lost" ? T.failed : T.crashed);
  $("resTitle").className = win ? "win" : "lose";
  $("resReason").textContent = win ? "" : T[G.failReason];
  const ss = $("resStars").children; [...ss].forEach(s => s.className = "");
  $("resStars").classList.toggle("hidden", !win); $("resTable").classList.toggle("hidden", !win);
  const card = $("sResult").querySelector(".card"); card.classList.toggle("win", win); card.classList.toggle("lose", !win);
  if (win) {
    $("resTable").innerHTML = r.rows.map(([k, v], i) => "<tr style='animation-delay:" + (150 + i * 90) + "ms'><td>" + T[k] + "</td><td>" + v + "</td></tr>").join("");
    const best = Math.max(save.bestScore[G.li] || 0, r.total), el = $("resScore"), t0 = performance.now() + 250;
    const tick = now => { if (G.mode !== "result") return; const k = ease((now - t0) / 900); el.textContent = T.score + ": " + Math.round(r.total * k) + "   ·   " + T.best + ": " + best; if (k < 1) requestAnimationFrame(tick); };
    el.textContent = T.score + ": 0   ·   " + T.best + ": " + best; requestAnimationFrame(tick);
    for (let i = 0; i < r.stars; i++) setTimeout(() => { if (G.mode !== "result") return; ss[i].className = "g"; Snd.star(i); buzz(15); if (i === 2) celebrate({ x: G.ship.x, y: G.ship.y - 10 }); }, 520 + i * 430);
  } else $("resScore").textContent = "";
  const last = G.li === LEVELS.length - 1;
  $("bNext").classList.toggle("hidden", !win || last);
  $("resAll").classList.toggle("hidden", !(win && last));
  $("bRetry").classList.toggle("primary", !win); $("bRetry").classList.toggle("big", !win);
  show("sResult");
}
function pause() { if (G.mode !== "play") return; G.mode = "paused"; Snd.thrust(false); Voice.stop(); show("sPause"); setControls("none"); }
function resume() { if (G.mode !== "paused") return; G.mode = "play"; show(null); setControls("play"); clearInput(); }
function toTitle() { Voice.stop(); Snd.thrust(false); G.mode = "title"; G.titleT = 0; G.fx = []; $("hud").classList.add("hidden"); setControls("none"); loadLevel(0); G.mode = "title"; show("sTitle"); }
function clearInput() { held.thrust.clear(); held.left.clear(); held.right.clear(); syncInput(); }

/* ---------- launch / descent cinematic before level 1 (about 8.6 s, skippable) ---------- */
const CINE_LEN = 8.6, CB1 = 3.7, CB2 = 5.9;
function caption(txt) { const c = $("cineCap"); c.textContent = txt; c.classList.remove("hidden"); c.classList.remove("in"); void c.offsetWidth; c.classList.add("in"); }
function startCine() {
  Voice.stop(); loadLevel(0);
  G.mode = "cine"; G.cine = { t: 0, did: {} }; G.fx = []; show(null); $("hud").classList.add("hidden"); setControls("none");
  $("bSkip").classList.remove("hidden"); caption(T.cine1); Snd.init();
}
function updateCine(dt) {
  const q = G.cine; q.t += dt; const d = q.did;
  if (!d.v && q.t > .25) { d.v = 1; Voice.say("liftoff", 3); }
  if (!d.r && q.t > 2.0) { d.r = 1; Snd.rumble(2.2, .5); buzz(60); }
  if (!d.b && q.t > CB1) { d.b = 1; G.fx = []; caption(T.cine2); Snd.whoosh(1, .22); }
  if (!d.c && q.t > CB2) { d.c = 1; G.fx = []; caption(T.cine3); Snd.whoosh(.8, .18); }
  if (q.t >= CINE_LEN) endCine();
}
function endCine() {
  if (G.mode !== "cine") return; G.mode = "cineEnd";
  $("bSkip").classList.add("hidden"); $("cineCap").classList.add("hidden");
  Voice.stop(); fadeTo(() => { G.fx = []; openLevel(0); }, 300);
}

/* ---------- input ---------- */
const held = { thrust: new Set(), left: new Set(), right: new Set() }, keys = { thrust: false, left: false, right: false };
function syncInput() {
  const i = G.input, wasL = i.left || i.right;
  i.thrust = held.thrust.size > 0 || keys.thrust; i.left = held.left.size > 0 || keys.left; i.right = held.right.size > 0 || keys.right;
  $("btnT").classList.toggle("on", i.thrust); $("btnL").classList.toggle("on", i.left); $("btnR").classList.toggle("on", i.right);
  if (G.mode === "play") { Snd.thrust(i.thrust && G.ship.fuel > 0); if (!wasL && (i.left || i.right)) Snd.rcs(); }
}
function bindHold(el, key) {
  el.addEventListener("pointerdown", e => {
    e.preventDefault(); Snd.init();
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
    held[key].add(e.pointerId); syncInput();
  });
  const up = e => { held[key].delete(e.pointerId); syncInput(); };
  ["pointerup", "pointercancel", "lostpointercapture"].forEach(ev => el.addEventListener(ev, up));
}
bindHold($("btnT"), "thrust"); bindHold($("btnL"), "left"); bindHold($("btnR"), "right");
const KM = { ArrowUp: "thrust", KeyW: "thrust", Space: "thrust", ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right" };
window.addEventListener("keydown", e => {
  Snd.init();
  if (G.mode === "cine" && (e.code === "Escape" || e.code === "Enter" || e.code === "Space")) { e.preventDefault(); endCine(); return; }
  if (KM[e.code]) { e.preventDefault(); if (G.mode === "intro") { begin(); return; } keys[KM[e.code]] = true; syncInput(); }
  else if (e.code === "KeyP" || e.code === "Escape") { G.mode === "paused" ? resume() : pause(); }
  else if (e.code === "Enter" && G.mode === "intro") begin();
});
window.addEventListener("keyup", e => { if (KM[e.code]) { keys[KM[e.code]] = false; syncInput(); } });
document.addEventListener("contextmenu", e => e.preventDefault());
document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });
window.addEventListener("blur", () => { keys.thrust = keys.left = keys.right = false; syncInput(); });

const on = (id, f) => $(id).addEventListener("click", () => { Snd.init(); Snd.click(); f(); });
on("bPlay", () => { let i = 0; while (i < LEVELS.length - 1 && i + 1 < save.unlocked && save.best[i]) i++; go(i); });
on("bLevels", () => { buildGrid(); show("sLevels"); });
on("bHow", () => show("sHow"));
document.querySelectorAll(".back").forEach(b => b.addEventListener("click", () => { Snd.click(); if (G.mode === "title") show("sTitle"); else fadeTo(toTitle); }));
$("sIntro").addEventListener("pointerdown", e => { e.preventDefault(); begin(); });
$("bSkip").addEventListener("click", e => { e.stopPropagation(); Snd.click(); endCine(); });
on("bPause", pause); on("bResume", resume);
on("bRetryP", () => fadeTo(() => openLevel(G.li))); on("bMenuP", () => fadeTo(() => { toTitle(); buildGrid(); show("sLevels"); }));
on("bRetry", () => fadeTo(() => openLevel(G.li))); on("bNext", () => fadeTo(() => openLevel(Math.min(LEVELS.length - 1, G.li + 1))));
on("bMenu", () => fadeTo(() => { toTitle(); buildGrid(); show("sLevels"); }));
document.querySelectorAll(".lang").forEach(b => b.addEventListener("click", () => { save.lang = b.dataset.lang; save.langChosen = true; persist(); applyLang(); Snd.click(); Voice.preload(); }));
document.querySelectorAll(".sound-toggle").forEach(b => b.addEventListener("click", () => { save.sound = !save.sound; persist(); Snd.init(); Snd.setOn(save.sound); applyLang(); }));
document.querySelectorAll(".voice-toggle").forEach(b => b.addEventListener("click", () => { save.voice = !save.voice; persist(); Snd.init(); Snd.click(); if (!save.voice) Voice.stop(); else Voice.preload(); applyLang(); }));

/* ---------- HUD ---------- */
function setRo(el, v, ok, warn) { el.textContent = v; el.className = ok ? "ok" : warn ? "warn" : "bad"; }
function updateHud() {
  const s = G.ship, L = G.L; if (!s) return;
  const ff = s.fuel / L.fuel; const f = $("fuelFill"); f.style.width = (ff * 100).toFixed(1) + "%"; f.classList.toggle("low", ff < .2);
  if (L.shadow) { const b = $("battFill"); b.style.width = s.batt.toFixed(1) + "%"; b.classList.toggle("low", s.batt < 30); }
  const alt = altOf(s);
  $("rAlt").textContent = alt.toFixed(alt < 10 ? 1 : 0); $("rAlt").className = "";
  setRo($("rVs"), (s.vy * M).toFixed(1), s.vy <= MAXVY, s.vy <= MAXVY * 1.5);
  setRo($("rHs"), (Math.abs(s.vx) * M).toFixed(1), Math.abs(s.vx) <= MAXVX, Math.abs(s.vx) <= MAXVX * 1.5);
  const tdeg = Math.round(s.a * 180 / Math.PI); setRo($("rTilt"), tdeg, Math.abs(s.a) <= MAXTILT, Math.abs(s.a) <= MAXTILT * 2);
  if (L.wind) { const w = windAt(G.t), n = Math.min(3, Math.max(1, Math.round(Math.abs(w) / 3))); $("rWind").textContent = (w < 0 ? "←" : "→").repeat(n) + " " + Math.abs(w * M).toFixed(1); }
}

/* ---------- render helpers ---------- */
function drawStarsBg(c, now, px, drift) {
  const pal = ["#cfd8ff", "#ffffff", "#fff3d6"];
  for (let li = 0; li < 3; li++) {
    const L = starL[li], off = px * [.02, .05, .11][li], dr = drift * [4, 9, 18][li];
    c.fillStyle = pal[li];
    for (const st of L) {
      let x = st.x - off - dr; x = ((x % cw) + cw) % cw;
      c.globalAlpha = .45 + .55 * (.5 + .5 * Math.sin(now * st.s + st.p));
      c.fillRect(x, st.y, st.r, st.r);
    }
  }
  c.globalAlpha = 1;
}
function drawStar(c, x, y, r, col) { c.fillStyle = col; c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); }
function drawParts(c, list, layer) {
  if (layer === 1) c.globalCompositeOperation = "lighter";
  for (const p of list) {
    const k = p.life / p.max, kd = p.k;
    if (layer === 0) {
      if (kd === "smoke") { c.globalAlpha = Math.min(1, k * 1.6) * .75; blit(c, SP.smoke, p.x, p.y, p.sz * (1 + (1 - k) * 2.2)); }
      else if (kd === "cloud") { c.globalAlpha = Math.min(1, k * 1.5) * .6; blit(c, SP.dust, p.x, p.y, p.sz * (1 + (1 - k) * 2.4)); }
    } else if (layer === 1) {
      if (kd === "fire") { c.globalAlpha = Math.min(1, k * 1.5) * .9; blit(c, SP.fire, p.x, p.y, p.sz * (1.9 - k * .8)); }
      else if (kd === "fireball") { c.globalAlpha = Math.min(1, k * 1.8); blit(c, SP.fire, p.x, p.y, p.sz * (.6 + (1 - k) * 1.7)); }
      else if (kd === "spark") { c.globalAlpha = k; blit(c, SP.glow, p.x, p.y, p.sz * 3); c.fillStyle = "#fff6d0"; c.fillRect(p.x - p.sz * .5, p.y - p.sz * .5, p.sz, p.sz); }
      else if (kd === "twinkle") { const a = Math.sin(k * Math.PI); c.globalAlpha = a; blit(c, SP.white, p.x, p.y, p.sz * 2.2); c.fillStyle = "#fff8d8"; c.fillRect(p.x - p.sz * 1.4, p.y - .5, p.sz * 2.8, 1); c.fillRect(p.x - .5, p.y - p.sz * 1.4, 1, p.sz * 2.8); }
    } else {
      if (kd === "dust") { c.globalAlpha = k * .75; c.fillStyle = "#b9b4aa"; const r = p.sz * (1.6 - k * .6); c.fillRect(p.x - r / 2, p.y - r / 2, r, r); }
      else if (kd === "puff") { c.globalAlpha = k * .8; blit(c, SP.white, p.x, p.y, p.sz * (1 + (1 - k) * 2.4)); }
      else if (kd === "chunk") { c.globalAlpha = Math.min(1, k * 3); c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.c; c.strokeStyle = p.c;
        if (p.sh === 1) { c.lineWidth = 1.4; c.beginPath(); c.moveTo(-p.sz, 0); c.lineTo(p.sz, 0); c.stroke(); } else if (p.sh === 2) { c.fillRect(-p.sz * .7, -p.sz * .45, p.sz * 1.4, p.sz * .9); c.fillStyle = "rgba(140,170,255,.6)"; c.fillRect(-p.sz * .7, -.3, p.sz * 1.4, .6); } else c.fillRect(-p.sz / 2, -p.sz / 3, p.sz, p.sz * .66);
        c.restore(); }
      else if (kd === "confetti") { c.globalAlpha = Math.min(1, k * 3); c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.scale(1, Math.cos(p.rot * 1.7 + p.sway)); c.fillStyle = p.c; c.fillRect(-p.sz / 2, -p.sz / 4, p.sz, p.sz / 2); c.restore(); }
      else if (kd === "ring") { const r = 4 + Math.pow(1 - k, .55) * p.sz; c.globalAlpha = k; c.strokeStyle = "#ffe6b0"; c.lineWidth = 1 + k * 6; c.beginPath(); c.arc(p.x, p.y, r, 0, 7); c.stroke(); }
      else if (kd === "gring") { const r = (1 - Math.pow(k, 1.5)) * p.sz; c.globalAlpha = k * .7; c.strokeStyle = "#d8d2c4"; c.lineWidth = 1 + k * 4; c.beginPath(); c.ellipse(p.x, p.y - 1, r, r * .12, 0, 0, 7); c.stroke(); }
    }
  }
  c.globalAlpha = 1; c.globalCompositeOperation = "source-over";
}
function drawFlame(c, f, now) {
  // c is in ship space (unscaled by SS). Flickering two-layer flame with a soft glow.
  if (f < .02) return;
  const fl = (14 + 4 * Math.sin(now * 61) + 3 * Math.sin(now * 37 + 1) + Math.random() * 4) * f;
  c.globalCompositeOperation = "lighter";
  c.globalAlpha = .5 * f; c.drawImage(SP.glow, -16, 4, 32, 18 + fl * 1.2);
  c.globalAlpha = 1;
  let g = c.createLinearGradient(0, 11, 0, 11 + fl * 1.35); g.addColorStop(0, "rgba(255,226,150,.95)"); g.addColorStop(.35, "rgba(255,140,45,.85)"); g.addColorStop(1, "rgba(255,70,20,0)");
  c.fillStyle = g; c.beginPath(); c.moveTo(-5, 11); c.quadraticCurveTo(-6.5 - Math.random() * 1.5, 11 + fl * .55, 0, 11 + fl * 1.35); c.quadraticCurveTo(6.5 + Math.random() * 1.5, 11 + fl * .55, 5, 11); c.closePath(); c.fill();
  g = c.createLinearGradient(0, 11, 0, 11 + fl * .75); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(.5, "rgba(200,225,255,.8)"); g.addColorStop(1, "rgba(150,200,255,0)");
  c.fillStyle = g; c.beginPath(); c.moveTo(-2.8, 11); c.quadraticCurveTo(0, 11 + fl * 1.0, 2.8, 11); c.closePath(); c.fill();
  c.globalCompositeOperation = "source-over";
}
function drawShip(c, s, now) {
  const cy = s.cy || 0;
  c.save(); c.translate(s.x, s.y); c.rotate(s.a); c.scale(SS, SS);
  c.save(); c.translate(0, cy); drawFlame(c, s.flame || 0, now); c.restore();
  // legs: from the (compressing) body to the fixed footpads
  c.strokeStyle = "#cfd3dd"; c.lineWidth = 1.6; c.lineCap = "round";
  c.beginPath(); c.moveTo(-8, 3 + cy); c.lineTo(-13, 15); c.moveTo(8, 3 + cy); c.lineTo(13, 15); c.moveTo(-10, -3 + cy); c.lineTo(-13, 15); c.moveTo(10, -3 + cy); c.lineTo(13, 15); c.stroke();
  const pw = 3 + Math.max(0, cy) * .5; c.lineWidth = 2.2; c.beginPath(); c.moveTo(-13 - pw, 15); c.lineTo(-13 + pw, 15); c.moveTo(13 - pw, 15); c.lineTo(13 + pw, 15); c.stroke();
  c.translate(0, cy);
  c.fillStyle = "#4b4e58"; c.beginPath(); c.moveTo(-3.5, 5); c.lineTo(3.5, 5); c.lineTo(5.5, 11.5); c.lineTo(-5.5, 11.5); c.closePath(); c.fill();
  c.fillStyle = "#8b8f9b"; c.fillRect(-5.5, 10.5, 11, 1.4);
  if ((s.flame || 0) > .05) { c.fillStyle = "rgba(255,170,80," + (.5 * s.flame) + ")"; c.fillRect(-5, 10, 10, 1.6); }
  const g = c.createLinearGradient(-10, -9, 10, 6); g.addColorStop(0, "#ffe08a"); g.addColorStop(.45, "#e3a634"); g.addColorStop(1, "#a86e14");
  c.fillStyle = g; c.beginPath(); c.roundRect ? c.roundRect(-10, -9, 20, 14, 2) : c.rect(-10, -9, 20, 14); c.fill();
  // moving specular glint across the gold foil
  c.save(); c.beginPath(); c.rect(-10, -9, 20, 14); c.clip(); const gx = ((now * 12) % 48) - 18; c.fillStyle = "rgba(255,255,230,.22)"; c.beginPath(); c.moveTo(gx - 3, -9); c.lineTo(gx + 2, -9); c.lineTo(gx - 3, 5); c.lineTo(gx - 8, 5); c.closePath(); c.fill(); c.restore();
  c.strokeStyle = "rgba(120,70,0,.45)"; c.lineWidth = .7; c.beginPath(); c.moveTo(-6, -9); c.lineTo(-4, 5); c.moveTo(3, -9); c.lineTo(5, 0); c.lineTo(2, 5); c.moveTo(-10, -2); c.lineTo(10, -1); c.stroke();
  c.fillStyle = "#c9ced8"; c.fillRect(-9, -12, 18, 3);
  c.fillStyle = "#24408f"; c.fillRect(-6, -17, 12, 5); c.strokeStyle = "#6f8fe0"; c.lineWidth = .5; c.beginPath(); for (let x = -3; x < 6; x += 3) { c.moveTo(x, -17); c.lineTo(x, -12); } c.moveTo(-6, -14.5); c.lineTo(6, -14.5); c.stroke();
  c.strokeStyle = "#dfe3ea"; c.lineWidth = .9; c.beginPath(); c.moveTo(7, -12); c.lineTo(9, -20); c.stroke(); c.beginPath(); c.arc(9, -20, 2.6, Math.PI * .1, Math.PI * .9, true); c.stroke();
  c.fillStyle = "#11131a"; c.beginPath(); c.arc(-4, -3, 2.2, 0, 7); c.fill(); c.fillStyle = "#9fd1ff"; c.fillRect(-4.8, -4, 1, 1);
  // RCS thruster blocks
  c.fillStyle = "#9aa0ad"; c.fillRect(-11.5, -8.5, 1.5, 2.5); c.fillRect(10, -8.5, 1.5, 2.5);
  // lights: red beacon in flight; green/white celebration blink after landing
  if (s.lights) {
    const ph = Math.floor(now * 6) % 2;
    c.globalCompositeOperation = "lighter";
    blit(c, ph ? SP.green : SP.white, -9, -12.5, 5); blit(c, ph ? SP.white : SP.green, 9, -12.5, 5);
    if (Math.sin(now * 9) > 0) blit(c, SP.red, 9, -20, 4);
    c.globalCompositeOperation = "source-over";
    c.fillStyle = ph ? "#7dffb0" : "#ffffff"; c.fillRect(-10, -13, 2, 1.6); c.fillStyle = ph ? "#ffffff" : "#7dffb0"; c.fillRect(8, -13, 2, 1.6);
  } else if (Math.sin(now * 5) > .4) { c.fillStyle = "#ff4d4d"; c.beginPath(); c.arc(-8, -13, 1.2, 0, 7); c.fill(); c.globalCompositeOperation = "lighter"; blit(c, SP.red, -8, -13, 3.5); c.globalCompositeOperation = "source-over"; }
  c.restore();
}
function ridge(c, y0, amp, off, seed, fill) {
  c.fillStyle = fill; c.beginPath(); c.moveTo(0, ch + 2);
  for (let x = 0; x <= cw + 8; x += 8) { const u = x + off; c.lineTo(x, y0 + amp * (Math.sin(u * .011 + seed) * .6 + Math.sin(u * .029 + seed * 2) * .3 + Math.sin(u * .07 + seed) * .1)); }
  c.lineTo(cw, ch + 2); c.closePath(); c.fill();
}

/* ---------- camera ---------- */
function camUpdate(dt) {
  const cm = G.cam, s = G.ship, portrait = ch >= cw * 1.05; let tz = 1, F = null, cyT = .42;
  if (s && (G.mode === "landed" || (G.mode === "result" && G.result && G.result.win))) { tz = Math.min(1.85, 1.85 * Math.min(1, cw / 360)); F = [s.x, s.y - 4]; cyT = G.mode === "result" && portrait ? .24 : .42; }
  else if (G.crashAt && (G.mode === "crashed" || G.mode === "result")) { tz = 1.3; F = [G.crashAt.x, G.crashAt.y]; cyT = G.mode === "result" && portrait ? .26 : .45; }
  const k = 1 - Math.exp(-dt * 2.6);
  if (F) { if (cm.z < 1.02) { cm.fx = F[0]; cm.fy = F[1]; } else { cm.fx += (F[0] - cm.fx) * k; cm.fy += (F[1] - cm.fy) * k; } }
  cm.z += (tz - cm.z) * k; cm.cy += (cyT - cm.cy) * k;
}

/* ---------- world render ---------- */
function renderWorld(dt) {
  const c = cx; c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sky = c.createLinearGradient(0, 0, 0, ch); sky.addColorStop(0, "#03040c"); sky.addColorStop(1, "#0b1030"); c.fillStyle = sky; c.fillRect(0, 0, cw, ch);
  const now = performance.now() / 1000, s = G.ship;
  drawStarsBg(c, now, s ? (s.x - 200) * scale : 0, 0);
  let sx = 0, sy = 0; if (G.shake > .1) { sx = rand(-1, 1) * G.shake; sy = rand(-1, 1) * G.shake; G.shake *= Math.pow(.02, dt); } else G.shake = 0;
  const cm = G.cam, z = cm.z, sc = scale * z;
  const bx = ox + cm.fx * scale, by = oy + cm.fy * scale, m = clamp((z - 1) / .85, 0, 1) * .85;
  const ax = bx + (cw / 2 - bx) * m, ay = by + (cm.cy * ch - by) * m;
  const tx = ax - cm.fx * sc + sx, ty = ay - cm.fy * sc + sy;
  const ter = G.ter, L = G.L; if (!ter) return;
  // Earth and far hills with gentle parallax
  c.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * (tx + (s ? (200 - s.x) * .04 * sc : 0)), dpr * ty);
  if (z < 1.08) { c.globalAlpha = 1 - (z - 1) / .08; c.drawImage(earth, 318, 52, 50, 50); c.globalAlpha = 1; }
  c.fillStyle = "#171a28"; c.beginPath(); c.moveTo(-800, 1200); ter.hills2.forEach((y, i) => c.lineTo(-800 + i * 50, y)); c.lineTo(1200, 1200); c.closePath(); c.fill();
  c.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * tx, dpr * ty);
  c.fillStyle = "#1f2333"; c.beginPath(); c.moveTo(-800, 1200); ter.hills.forEach((y, i) => c.lineTo(-800 + i * 33.3, y)); c.lineTo(1200, 1200); c.closePath(); c.fill();
  const gr = c.createLinearGradient(0, 300, 0, 620); gr.addColorStop(0, "#9a9caa"); gr.addColorStop(.35, "#6d6f7d"); gr.addColorStop(1, "#3a3c48");
  c.fillStyle = gr; c.beginPath(); c.moveTo(TX0, 2000);
  for (let i = 0; i < ter.ys.length; i++) c.lineTo(TX0 + i * TSTEP, ter.ys[i]);
  c.lineTo(TX1, 2000); c.closePath(); c.fill();
  c.strokeStyle = "#c9cbd6"; c.lineWidth = 1.4; c.beginPath();
  for (let i = 0; i < ter.ys.length; i++) i ? c.lineTo(TX0 + i * TSTEP, ter.ys[i]) : c.moveTo(TX0, ter.ys[0]); c.stroke();
  c.fillStyle = "rgba(30,30,45,.35)"; for (const p of ter.pocks) { const y = ter.h(p.x) + p.d; c.beginPath(); c.ellipse(p.x, y, p.r, p.r * .4, 0, 0, 7); c.fill(); }
  // landing pad with a soft guide beam
  const pd = ter.pad, blink = Math.sin(now * 6) > 0;
  if (G.mode === "play" || G.mode === "intro" || G.mode === "paused") { const beam = c.createLinearGradient(0, pd.y - 160, 0, pd.y); beam.addColorStop(0, "rgba(80,255,160,0)"); beam.addColorStop(1, "rgba(80,255,160," + (.12 + .05 * Math.sin(now * 3)) + ")"); c.fillStyle = beam; c.fillRect(pd.x0, pd.y - 160, pd.x1 - pd.x0, 160); }
  c.fillStyle = "#d8dce6"; c.fillRect(pd.x0, pd.y - 2, pd.x1 - pd.x0, 5);
  c.fillStyle = "#f2b630"; for (let x = pd.x0 + 2; x < pd.x1 - 4; x += 10) c.fillRect(x, pd.y - 2, 5, 2);
  c.fillStyle = blink ? "#4bff9a" : "#1d6b45"; c.beginPath(); c.arc(pd.x0, pd.y - 3, 2.2, 0, 7); c.arc(pd.x1, pd.y - 3, 2.2, 0, 7); c.fill();
  if (blink) { c.globalCompositeOperation = "lighter"; blit(c, SP.green, pd.x0, pd.y - 3, 7); blit(c, SP.green, pd.x1, pd.y - 3, 7); c.globalCompositeOperation = "source-over"; }
  for (const k of ter.rocks) { c.fillStyle = "#4a4b56"; c.beginPath(); k.pts.forEach((r, j) => { const a = j / k.pts.length * 6.283; const x = k.x + Math.cos(a) * r, y = k.y + Math.sin(a) * r * .85; j ? c.lineTo(x, y) : c.moveTo(x, y); }); c.closePath(); c.fill(); c.fillStyle = "rgba(220,220,235,.35)"; c.beginPath(); c.ellipse(k.x - k.r * .3, k.y - k.r * .4, k.r * .4, k.r * .22, -.4, 0, 7); c.fill(); }
  // engine light on the ground
  if (s && s.alive && s.flame > .05) { const nx = s.x - 13 * SS * Math.sin(s.a), gy = ter.h(nx), al = gy - (s.y + 13 * SS * Math.cos(s.a)); if (al < 80) { c.globalCompositeOperation = "lighter"; c.globalAlpha = (1 - al / 80) * s.flame * .8; c.drawImage(SP.glow, nx - 40, gy - 10, 80, 20); c.globalAlpha = 1; c.globalCompositeOperation = "source-over"; } }
  drawParts(c, G.parts, 0);
  if (s && s.alive) drawShip(c, s, now);
  drawParts(c, G.parts, 1);
  drawParts(c, G.parts, 2);
  if (L.shadow) {
    const e = shadowEdge(), dir = L.shadow.speed > 0 ? -1 : 1, x0 = e, x1 = e + dir * 2000;
    const g = c.createLinearGradient(e - dir * 18, 0, e + dir * 18, 0); g.addColorStop(0, "rgba(2,4,20,0)"); g.addColorStop(1, "rgba(2,4,20,.78)");
    c.fillStyle = g; c.fillRect(Math.min(e - dir * 18, e + dir * 18), -400, 36, 2400);
    c.fillStyle = "rgba(2,4,20,.78)"; c.fillRect(Math.min(x0 + dir * 18, x1), -400, Math.abs(x1 - x0 - dir * 18), 2400);
    c.strokeStyle = "rgba(120,170,255,.35)"; c.lineWidth = 1; c.setLineDash([3, 5]); c.beginPath(); c.moveTo(e, -400); c.lineTo(e, 2000); c.stroke(); c.setLineDash([]);
    if (s && s.alive && inDark(s.x)) { const lg = c.createRadialGradient(s.x, s.y + 20, 2, s.x, s.y + 30, 60); lg.addColorStop(0, "rgba(255,240,200,.35)"); lg.addColorStop(1, "rgba(255,240,200,0)"); c.fillStyle = lg; c.beginPath(); c.moveTo(s.x - 6, s.y + 8); c.lineTo(s.x - 40, s.y + 90); c.lineTo(s.x + 40, s.y + 90); c.closePath(); c.fill(); }
  }
  if (ox > 8 && z < 1.05) { c.strokeStyle = "rgba(120,160,255,.18)"; c.setLineDash([6, 8]); c.lineWidth = 1; c.beginPath(); c.moveTo(0, -200); c.lineTo(0, 600); c.moveTo(W, -200); c.lineTo(W, 600); c.stroke(); c.setLineDash([]); }
  if (s && s.alive && s.y < -10 && G.mode === "play") { c.fillStyle = "#ffd25c"; c.beginPath(); c.moveTo(s.x, 4); c.lineTo(s.x - 6, 14); c.lineTo(s.x + 6, 14); c.closePath(); c.fill(); }
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (G.flash > 0) { c.fillStyle = "rgba(255,240,210," + G.flash + ")"; c.fillRect(0, 0, cw, ch); G.flash = Math.max(0, G.flash - dt * 1.8); }
}

/* ---------- animated title screen ---------- */
const TL = { x: 0, y: 0, vx: 0, vy: 0, a: 0, flame: 1, lights: false, cy: 0 };
let shoot = null;
function renderTitle(dt) {
  const c = cx; c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const now = performance.now() / 1000, T0 = G.titleT, portrait = ch >= cw * 1.05;
  const sky = c.createLinearGradient(0, 0, 0, ch); sky.addColorStop(0, "#02030a"); sky.addColorStop(.55, "#0a1034"); sky.addColorStop(1, "#1b1842"); c.fillStyle = sky; c.fillRect(0, 0, cw, ch);
  drawStarsBg(c, now, 0, T0);
  // shooting star now and then
  if (!shoot && Math.random() < dt * .25) shoot = { x: rand(cw * .2, cw), y: rand(0, ch * .3), vx: -rand(380, 560), vy: rand(140, 220), life: .8 };
  if (shoot) { shoot.life -= dt; shoot.x += shoot.vx * dt; shoot.y += shoot.vy * dt; const g = c.createLinearGradient(shoot.x, shoot.y, shoot.x - shoot.vx * .12, shoot.y - shoot.vy * .12); g.addColorStop(0, "rgba(255,255,255," + Math.min(1, shoot.life * 2) + ")"); g.addColorStop(1, "rgba(255,255,255,0)"); c.strokeStyle = g; c.lineWidth = 1.6; c.beginPath(); c.moveTo(shoot.x, shoot.y); c.lineTo(shoot.x - shoot.vx * .12, shoot.y - shoot.vy * .12); c.stroke(); if (shoot.life <= 0) shoot = null; }
  const hy = portrait ? ch * .56 : ch * .7, mn = Math.min(cw, ch);
  // Earth rising over the lunar horizon
  const er = mn * (portrait ? .17 : .15), rise = ease(T0 / 7), ex = cw * .72, ey = hy + er * 1.4 - rise * er * 3.1 + Math.sin(T0 * .5) * 2;
  c.globalCompositeOperation = "lighter"; c.globalAlpha = .35 * rise; blit(c, SP.blue, ex, ey, er * 2.4); c.globalAlpha = 1; c.globalCompositeOperation = "source-over";
  const es = er / .406 / 2; c.drawImage(bigEarth, ex - es, ey - es, es * 2, es * 2);
  ridge(c, hy - mn * .02, mn * .035, T0 * 6, 1.3, "#262a3b");
  const ng = c.createLinearGradient(0, hy, 0, ch); ng.addColorStop(0, "#8d8fa0"); ng.addColorStop(.25, "#565868"); ng.addColorStop(1, "#202130");
  ridge(c, hy + mn * .05, mn * .025, T0 * 14, 4.1, ng);
  // drifting craters on the near ground
  c.fillStyle = "rgba(25,25,40,.35)";
  for (let i = 0; i < 7; i++) { const x = (((i * 173 - T0 * 14) % (cw + 120)) + cw + 120) % (cw + 120) - 60, y = hy + mn * .1 + (i % 3) * mn * .05, r = mn * (.025 + (i % 4) * .012); c.beginPath(); c.ellipse(x, y, r, r * .3, 0, 0, 7); c.fill(); }
  // lander flying past
  const P = 9, u = (T0 % P) / 6.2, k = clamp(mn / 400 * 1.3, .8, 2.2);
  if (u < 1) {
    TL.vx = (cw + 160) / 6.2; TL.vy = Math.cos(u * Math.PI) * -mn * .02;
    TL.x = -80 + (cw + 160) * u; TL.y = (portrait ? ch * .36 : ch * .4) - Math.sin(u * Math.PI) * mn * .06 + Math.sin(T0 * 2.2) * 3;
    TL.a = .42 - u * .6; TL.flame = .75 + .25 * Math.sin(T0 * 7);
    exhaust(TL, dt, G.fx, k, null);
    if (Math.random() < dt * 3) { const dir = Math.random() < .5 ? -1 : 1; for (let j = 0; j < 3; j++) emit({ x: TL.x + dir * 12 * k, y: TL.y - 10 * k, vx: dir * 70 * k + TL.vx, vy: rand(-10, 10), life: .35, max: .35, k: "puff", sz: 2 * k }, G.fx); }
  }
  drawParts(c, G.fx, 0); drawParts(c, G.fx, 1); drawParts(c, G.fx, 2);
  if (u < 1) { c.save(); c.translate(TL.x, TL.y); c.scale(k, k); drawShip(c, { x: 0, y: 0, a: TL.a, flame: TL.flame, cy: 0, lights: false }, now); c.restore(); }
}

/* ---------- cinematic render (screen space) ---------- */
function drawRocket(c, x, by, h, fl, now) {
  const w = h * .13, bw = w * .55, bh = h * .46;
  if (fl > 0) {
    const L = h * (.35 + .1 * Math.sin(now * 40) + Math.random() * .05) * fl;
    c.globalCompositeOperation = "lighter";
    for (const [fx, fw, fl2] of [[x, w * .5, L], [x - w / 2 - bw / 2, bw * .45, L * .8], [x + w / 2 + bw / 2, bw * .45, L * .8]]) {
      c.globalAlpha = .7; c.drawImage(SP.glow, fx - fw * 3, by - fw, fw * 6, fl2 + fw * 3);
      const g = c.createLinearGradient(0, by, 0, by + fl2); g.addColorStop(0, "rgba(255,255,240,1)"); g.addColorStop(.3, "rgba(255,180,70,.9)"); g.addColorStop(1, "rgba(255,80,20,0)");
      c.globalAlpha = 1; c.fillStyle = g; c.beginPath(); c.moveTo(fx - fw, by); c.quadraticCurveTo(fx, by + fl2 * 1.1, fx + fw, by); c.closePath(); c.fill();
    }
    c.globalCompositeOperation = "source-over";
  }
  // boosters
  for (const s of [-1, 1]) {
    const bx = x + s * (w / 2 + bw / 2);
    const g = c.createLinearGradient(bx - bw / 2, 0, bx + bw / 2, 0); g.addColorStop(0, "#b9bdc8"); g.addColorStop(.45, "#f4f5f8"); g.addColorStop(1, "#9ea3b0");
    c.fillStyle = g; c.fillRect(bx - bw / 2, by - bh, bw, bh);
    c.fillStyle = "#5a5f6c"; c.beginPath(); c.moveTo(bx - bw / 2, by - bh); c.quadraticCurveTo(bx, by - bh - bw * 1.8, bx + bw / 2, by - bh); c.closePath(); c.fill();
    c.fillStyle = "#3d414c"; c.fillRect(bx - bw / 2, by - bw * .4, bw, bw * .4);
  }
  // core stage
  const g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g.addColorStop(0, "#c3c7d1"); g.addColorStop(.45, "#ffffff"); g.addColorStop(1, "#a7acb8");
  c.fillStyle = g; c.fillRect(x - w / 2, by - h * .84, w, h * .84);
  c.fillStyle = "#e88a2e"; c.fillRect(x - w / 2, by - h * .62, w, h * .035);
  c.fillStyle = "#3d414c"; c.fillRect(x - w / 2, by - h * .3, w, h * .02); c.fillRect(x - w / 2, by - w * .5, w, w * .5);
  c.fillStyle = g; c.beginPath(); c.moveTo(x - w / 2, by - h * .84); c.quadraticCurveTo(x - w * .45, by - h * .96, x, by - h); c.quadraticCurveTo(x + w * .45, by - h * .96, x + w / 2, by - h * .84); c.closePath(); c.fill();
  c.fillStyle = "#3d414c"; c.beginPath(); c.moveTo(x - w / 2, by); c.lineTo(x - w * 1.0, by + w * .2); c.lineTo(x - w / 2, by - w * 1.2); c.closePath(); c.fill(); c.beginPath(); c.moveTo(x + w / 2, by); c.lineTo(x + w * 1.0, by + w * .2); c.lineTo(x + w / 2, by - w * 1.2); c.closePath(); c.fill();
}
function renderCine(dt) {
  const c = cx; c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const now = performance.now() / 1000, q = G.cine || { t: CINE_LEN }, t = q.t, mn = Math.min(cw, ch);
  if (t < CB1) {
    // Scene 1: launch from Earth at dawn
    const lift = Math.max(0, t - 2.35), ry = .5 * ch * .95 * lift * lift, camY = ry * .62, gy = ch * .8;
    const sky = c.createLinearGradient(0, 0, 0, ch); sky.addColorStop(0, "#050a22"); sky.addColorStop(.7, "#1c2252"); sky.addColorStop(1, "#5a3a4a"); c.fillStyle = sky; c.fillRect(0, 0, cw, ch);
    drawStarsBg(c, now, 0, 0);
    c.save(); c.translate(0, camY);
    const glowY = gy - ch * .05; const hg = c.createLinearGradient(0, glowY - ch * .3, 0, gy); hg.addColorStop(0, "rgba(255,150,80,0)"); hg.addColorStop(1, "rgba(255,150,80,.35)"); c.fillStyle = hg; c.fillRect(0, glowY - ch * .3, cw, ch * .3 + ch * .05);
    c.fillStyle = "#141a33"; c.beginPath(); c.moveTo(0, gy); for (let x = 0; x <= cw; x += 20) c.lineTo(x, gy - mn * .04 - Math.sin(x * .02) * mn * .02 - Math.sin(x * .053) * mn * .01); c.lineTo(cw, ch * 3); c.lineTo(0, ch * 3); c.closePath(); c.fill();
    c.fillStyle = "#0b0f22"; c.fillRect(0, gy, cw, ch * 3);
    const h = ch * .26, rx = cw / 2, by = gy - ry;
    // launch tower
    const tx = rx - h * .2, top = gy - h * 1.05; c.strokeStyle = "#4a5070"; c.lineWidth = 2; c.beginPath(); c.moveTo(tx - 7, gy); c.lineTo(tx - 7, top); c.moveTo(tx + 3, gy); c.lineTo(tx + 3, top);
    for (let y = gy; y > top; y -= 14) { c.moveTo(tx - 7, y); c.lineTo(tx + 3, y - 14); c.moveTo(tx + 3, y); c.lineTo(tx - 7, y - 14); } c.stroke();
    c.fillStyle = Math.sin(now * 5) > 0 ? "#ff4d4d" : "#5a1a1a"; c.fillRect(tx - 9, top - 4, 4, 4);
    c.fillStyle = "#2a2f45"; c.fillRect(rx - h * .3, gy - 6, h * .6, 6);
    if (t > 1.85) { const sm = Math.min(1, (t - 1.85) * 2); for (let i = 0; i < Math.round(dt * 70 * sm); i++) { const dir = Math.random() < .5 ? -1 : 1; emit({ x: rx + rand(-10, 10), y: gy - 4, vx: dir * rand(60, 240), vy: -rand(5, 50), life: rand(1.2, 2.2), max: 2.2, k: "cloud", sz: rand(10, 22) * mn / 400 }, G.fx); } }
    drawParts(c, G.fx, 0);
    if (lift > 0) { for (let i = 0; i < Math.round(dt * 40); i++) emit({ x: rx + rand(-8, 8), y: by + 4, vx: rand(-30, 30), vy: rand(30, 120), life: rand(.8, 1.4), max: 1.4, k: "smoke", sz: rand(8, 16) * mn / 400 }, G.fx); }
    drawRocket(c, rx + (lift > 0 ? 0 : (t > 1.85 ? rand(-1, 1) : 0)), by, h, t > 1.85 ? Math.min(1, (t - 1.85) * 2.5) : 0, now);
    drawParts(c, G.fx, 1); drawParts(c, G.fx, 2);
    c.restore();
  } else if (t < CB2) {
    // Scene 2: Earth to Moon transfer
    const u = (t - CB1) / (CB2 - CB1), e = easeIO(u);
    c.fillStyle = "#02030a"; c.fillRect(0, 0, cw, ch); drawStarsBg(c, now, 0, t * 6);
    const er = mn * (.3 - .13 * e), ex = cw * .2, ey = ch * .76; const es = er / .406 / 2; c.drawImage(bigEarth, ex - es, ey - es, es * 2, es * 2);
    const mr = mn * (.07 + .13 * e), mx = cw * .8, my = ch * .24; c.globalCompositeOperation = "lighter"; c.globalAlpha = .2; blit(c, SP.white, mx, my, mr * 1.8); c.globalAlpha = 1; c.globalCompositeOperation = "source-over"; c.drawImage(moonSp, mx - mr, my - mr, mr * 2, mr * 2);
    const p0 = [ex + er * .6, ey - er * .6], p1 = [cw * .2, ch * .2], p2 = [mx - mr * .9, my + mr * .4];
    const bez = v => [(1 - v) * (1 - v) * p0[0] + 2 * (1 - v) * v * p1[0] + v * v * p2[0], (1 - v) * (1 - v) * p0[1] + 2 * (1 - v) * v * p1[1] + v * v * p2[1]];
    c.strokeStyle = "rgba(255,210,120,.45)"; c.setLineDash([4, 6]); c.lineWidth = 1.5; c.beginPath(); for (let v = 0; v <= e; v += .02) { const [x, y] = bez(v); v ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); c.setLineDash([]);
    const [sx, sy] = bez(e), [sx2, sy2] = bez(Math.min(1, e + .01)), ang = Math.atan2(sy2 - sy, sx2 - sx) + Math.PI / 2;
    const ship = { x: sx, y: sy, vx: 0, vy: 0, a: ang, flame: .8, cy: 0 }, kk = clamp(mn / 400, .8, 2);
    exhaust(ship, dt * .6, G.fx, kk, null); drawParts(c, G.fx, 1);
    c.save(); c.translate(sx, sy); c.scale(kk, kk); drawShip(c, { x: 0, y: 0, a: ang, flame: .8, cy: 0 }, now); c.restore();
  } else {
    // Scene 3: powered descent to the south pole
    const v = clamp((t - CB2) / (CINE_LEN - CB2 - .35), 0, 1), e = ease(v);
    const sky = c.createLinearGradient(0, 0, 0, ch); sky.addColorStop(0, "#02030a"); sky.addColorStop(1, "#0b1030"); c.fillStyle = sky; c.fillRect(0, 0, cw, ch);
    drawStarsBg(c, now, 0, 0);
    c.drawImage(earth, cw * .12, ch * .1, mn * .16, mn * .16);
    const hy = ch * .66 - e * ch * .04;
    ridge(c, hy - mn * .05, mn * .04, 0, 2.2, "#2a2d3e");
    const gg = c.createLinearGradient(0, hy, 0, ch); gg.addColorStop(0, "#a3a5b3"); gg.addColorStop(.3, "#6a6c7a"); gg.addColorStop(1, "#2c2d3a");
    ridge(c, hy, mn * .018, 40, 5.5, gg);
    c.fillStyle = "rgba(30,30,45,.35)"; for (let i = 0; i < 6; i++) { const x = cw * (i * .19 + .05), y = hy + ch * (.05 + (i % 3) * .07), r = mn * (.03 + (i % 2) * .03); c.beginPath(); c.ellipse(x, y, r, r * .3, 0, 0, 7); c.fill(); }
    const kk = clamp(mn / 400 * (1.6 + e * .6), 1, 3), lx = cw * (.5 + .08 * (1 - e)), ly = ch * .08 + e * (hy - ch * .08 - 26 * kk) - 4;
    const ship = { x: lx, y: ly, vx: -8, vy: 40, a: -.12 * (1 - e), flame: 1 - e * .45, cy: 0 };
    exhaust(ship, dt, G.fx, kk, null);
    const alt = hy - (ly + 19 * kk); if (alt < 90 * kk) { const qn = 1 - alt / (90 * kk); for (let i = 0; i < Math.round(qn * dt * 50); i++) { const dir = Math.random() < .5 ? -1 : 1; emit({ x: lx + dir * rand(0, 12), y: hy - 2, vx: dir * rand(60, 200) * kk * .5, vy: -rand(4, 30), life: rand(.8, 1.4), max: 1.4, k: "cloud", sz: rand(6, 12) * kk * .7 }, G.fx); } }
    drawParts(c, G.fx, 0); drawParts(c, G.fx, 1);
    c.save(); c.translate(lx, ly); c.scale(kk, kk); drawShip(c, { x: 0, y: 0, a: ship.a, flame: ship.flame, cy: 0 }, now); c.restore();
    drawParts(c, G.fx, 2);
  }
  // scene fades
  let a = 0; if (t < .45) a = 1 - t / .45; for (const b of [CB1, CB2]) a = Math.max(a, 1 - Math.abs(t - b) / .28); if (t > CINE_LEN - .4) a = Math.max(a, (t - (CINE_LEN - .4)) / .4);
  if (G.mode === "cineEnd") a = 1;
  if (a > 0) { c.fillStyle = "rgba(0,0,0," + clamp(a, 0, 1) + ")"; c.fillRect(0, 0, cw, ch); }
  if (t < CB1 && t > 2.35 && t < 2.8) { c.fillStyle = "rgba(255,230,200," + (1 - (t - 2.35) / .45) * .35 + ")"; c.fillRect(0, 0, cw, ch); }
}

/* ---------- main loop ---------- */
let last = performance.now();
function frame(now) {
  const rdt = Math.min(.05, (now - last) / 1000); last = now;
  // adaptive effects: if the phone can't keep up (~40 fps) during play, halve the particle budget
  // adaptive quality: if the phone can't hold ~45 fps for 3 s, halve the particle budget and render at a lower pixel ratio
  if (G.mode !== "paused" && !G.lowFx && !document.hidden && (G.perf.warm = (G.perf.warm || 0) + rdt) > 2) { const pf = G.perf; pf.acc += rdt; pf.n++; if (pf.acc > 3) { if (pf.acc / pf.n > 1 / 45) { G.lowFx = true; layout(); } pf.acc = 0; pf.n = 0; } }
  if (G.ts < 1) G.ts = Math.min(1, G.ts + rdt * 1.1);
  const dt = rdt * G.ts;
  if (G.mode !== "paused") {
    if (G.mode === "play") { G.acc += dt; while (G.acc >= STEP) { update(STEP); G.acc -= STEP; if (G.mode !== "play") { G.acc = 0; break; } } }
    if (G.mode === "title") G.titleT += rdt;
    if (G.mode === "cine") updateCine(rdt);
    const s = G.ship;
    if (s) {
      s.flame += ((s.thrusting && G.mode === "play" ? 1 : 0) - s.flame) * (1 - Math.exp(-rdt * (s.thrusting ? 30 : 14)));
      if (s.cv || s.cy) { s.cv += (-200 * s.cy - 9 * s.cv) * rdt; s.cy = clamp(s.cy + s.cv * rdt, -1.2, 4); if (Math.abs(s.cv) < .05 && Math.abs(s.cy) < .02) { s.cv = 0; s.cy = 0; } }
    }
    stepParts(G.parts, dt, G.ter ? G.ter.h : null, G.mode === "play" && G.L && G.L.wind ? windAt(G.t) : 0);
    stepParts(G.fx, rdt, null, 0);
    camUpdate(rdt);
  }
  const r0 = performance.now();
  if (G.mode === "title") renderTitle(rdt); else if (G.mode === "cine" || G.mode === "cineEnd") renderCine(rdt); else renderWorld(rdt);
  G.perf.rt = (G.perf.rt || 0) * .95 + (performance.now() - r0) * .05;   // render cost (ms), read by tests
  if (G.mode === "play" || G.mode === "intro" || G.mode === "landed") updateHud();
  requestAnimationFrame(frame);
}

/* ---------- boot ---------- */
(() => { const el = $("logo"); if (el) el.innerHTML = "CHANDRAYAAN".split("").map((ch, i) => "<span style='--i:" + i + "'>" + ch + "</span>").join(""); })();
document.querySelectorAll(".ver").forEach(v => v.textContent = VERSION);
layout(); loadLevel(0); G.mode = "title"; applyLang(); show("sTitle");
requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
if ("serviceWorker" in navigator && location.protocol === "https:") {
  // always check for a newer version on open; the new worker takes over and reloads open windows itself
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(r => r.update()).catch(() => {}));
}
})();
