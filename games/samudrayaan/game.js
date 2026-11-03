/* SAMUDRAYAAN: The Deep — an original deep-sea story game. Pure canvas + WebAudio, no libraries. */
"use strict";
const VERSION = "v1", SAVE_KEY = "samudrayaan-save-v1";
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t, TAU = Math.PI * 2;
const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const hyp = Math.hypot;
function rng(seed) { let s = seed >>> 0; return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
function mixC(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
function rgb(c, a = 1) { return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + a + ")"; }
function fmtT(s) { s = Math.max(0, Math.round(s)); return (s / 60 | 0) + ":" + String(s % 60).padStart(2, "0"); }

const VO = {"intro1": ["M","The year is 2031. Three weeks ago, our deep-sea probe, Varuna-1, went silent... six thousand metres below the Indian Ocean."],"intro2": ["M","It was following a signal no one could explain. A pulse of light and sound, repeating every seven seconds."],"intro3": ["M","Aarav, Matsya is the only sub small enough to follow its path. Bring back Varuna's black box... and find out what it found."],"c1a": ["M","Sunlight zone. Easy does it, Aarav. Varuna dropped pieces of its black box as it dived, like breadcrumbs. Collect them, then reach the exit beacon."],"c2a": ["V","Varuna-1, log one. An unknown signal below me. A seven-second rhythm. Too regular to be noise."],"c2b": ["M","That's the signal. Follow the kelp down."],"c3a": ["V","Log two. When I flash my lights, the signal changes. It is... answering me."],"c3b": ["M","Answering? Stay sharp in the caves. The bubble vents will keep you breathing."],"c4a": ["M","We're losing the sun. Switch on your light, and ping sonar to see the walls. Keep an eye on your battery."],"c4b": ["V","Log three. Glowing plankton all around me. They pulse in the same rhythm as the signal."],"c5a": ["V","Log four. A strong current is pulling me deeper. I will let it."],"c5b": ["M","Ride the currents, don't fight them. And keep away from the eels in the cracks."],"c6a": ["M","A whale fall. An old whale skeleton, home to a thousand creatures. Varuna passed right through here."],"c6b": ["V","Log five. Down here, nothing is wasted. Life feeds new life. The signal grows stronger."],"c7a": ["M","The midnight zone. Anglerfish hunt by light. If one chases you, switch your light off until it loses interest."],"c7b": ["V","Log six. Something enormous passed above me. It was glowing. And it was singing."],"c8a": ["V","Log seven. Hot vents. The ground is shaking. The song has changed. It sounds... sad."],"c8b": ["M","Those chimneys are hotter than boiling water. Stay out of the plumes, and watch for falling rock."],"c9a": ["M","The abyssal plain. We've reinforced Matsya's hull. You're deeper than anyone on our team has ever been."],"c9b": ["V","Log eight. A rockslide in the canyon. A young one was cut off from its family. It calls. They call back."],"c10a": ["M","Aarav... sonar shows metal. It's Varuna-1. Recover its core."],"c10b": ["V","Log nine. I am staying with the young one. My lights keep it calm. Battery... low."],"c11a": ["V","Log ten. The young one's family waits in the trench below. It will follow a friendly light."],"c11b": ["M","There's a huge glow ahead, Aarav. I think it's still waiting. Let's call it Jyoti."],"c12a": ["M","Jyoti is trapped, but it's watching your lamp. Keep your light on, go slowly, and lead it home."],"end1": ["V","To whoever finds this. The signal was never a warning. It was a song... a family calling their child home. I could not finish the journey. Please... finish it for me."],"end2": ["M","You did it, Aarav. Listen... the whole trench is singing. Welcome home, Jyoti."],"end3": ["M","Now come up slowly. We'll keep the lights on for you."],"go": ["M","Matsya, you're clear to dive."],"frag": ["M","Fragment recovered."],"allfrag": ["M","That's every fragment. Head for the exit beacon."],"checkpoint": ["M","Checkpoint saved."],"o2low": ["M","Oxygen low. Find a bubble vent."],"o2crit": ["M","Oxygen critical, Aarav!"],"hull": ["M","Hull damage is serious. Slow down."],"dark": ["M","It's getting dark. Switch on your light."],"angler": ["M","Anglerfish! Lights off, quickly."],"pressure": ["M","Too deep! The hull can't take this pressure."],"current": ["M","Strong current. Let it carry you."],"complete": ["M","Dive complete. Beautiful flying, Aarav."],"failo2": ["M","Your oxygen ran out. Let's try that again."],"failhull": ["M","Hull breach! Emergency ascent. We'll try again."],"follow": ["M","Jyoti is falling behind. Slow down, let it see your light."],"lighton": ["M","Keep your light on. Jyoti is following your lamp."],"sonar": ["M","Good ping. Sonar shows the way."]};

const STORY = {
  1: ["c1a"], 2: ["c2a", "c2b"], 3: ["c3a", "c3b"], 4: ["c4a", "c4b"], 5: ["c5a", "c5b"], 6: ["c6a", "c6b"],
  7: ["c7a", "c7b"], 8: ["c8a", "c8b"], 9: ["c9a", "c9b"], 10: ["c10a", "c10b"], 11: ["c11a", "c11b"], 12: ["c12a"]
};
const LOGNO = { c2a: 1, c3a: 2, c4b: 3, c5a: 4, c6b: 5, c7b: 6, c8a: 7, c9b: 8, c10b: 9, c11a: 10, end1: "FINAL" };
const WHO = k => VO[k][0] === "V" ? "VARUNA-1 · BLACK BOX LOG " + (LOGNO[k] < 10 ? "0" : "") + (LOGNO[k] || "") : "DR. MEERA · MISSION CONTROL";
const UPG = [
  { k: "hull", ic: "⛨", name: "Hull plating", desc: "+20 hull strength and +150 m pressure rating per level." },
  { k: "tank", ic: "🫧", name: "Oxygen tank", desc: "+20 seconds of air per level." },
  { k: "lamp", ic: "💡", name: "Lamp & battery", desc: "Brighter, longer light beam and a battery that lasts longer." }
];
const UPG_COST = [12, 28, 48];

/* ---------- save ---------- */
let save = { sound: true, voice: true, unlocked: 1, stars: {}, best: {}, pearls: 0, upg: { hull: 0, tank: 0, lamp: 0 }, introSeen: false, ending: false, frags: {} };
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); if (s) { save = Object.assign(save, s); save.upg = Object.assign({ hull: 0, tank: 0, lamp: 0 }, s.upg || {}); } } catch (e) {}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

/* ---------- audio: generated soundscape + effects ---------- */
const Snd = {
  ctx: null, master: null, sfx: null, amb: null, vbus: null, noise: null, rev: null, hum: null, humF: null, pad: [], padG: null, whaleT: 8, duckK: 1,
  init() {
    if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = save.sound ? 1 : 0; this.master.connect(c.destination);
    this.sfx = c.createGain(); this.sfx.gain.value = .8; this.sfx.connect(this.master);
    this.amb = c.createGain(); this.amb.gain.value = .0; this.amb.connect(this.master);
    this.vbus = c.createGain(); this.vbus.gain.value = 1.15; this.vbus.connect(c.destination);
    // noise buffer (brown-ish)
    const len = c.sampleRate * 3, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    let b = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; b = (b + .02 * w) / 1.02; d[i] = b * 3.5 + w * .08; }
    this.noise = buf;
    // reverb impulse (long, dark: underwater)
    const il = c.sampleRate * 3.2, ib = c.createBuffer(2, il, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const x = ib.getChannelData(ch); for (let i = 0; i < il; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / il, 3.2); }
    this.rev = c.createConvolver(); this.rev.buffer = ib; const rg = c.createGain(); rg.gain.value = .55; this.rev.connect(rg); rg.connect(this.master);
    // ocean bed: brown noise, low-passed, slow swell
    const ns = c.createBufferSource(); ns.buffer = buf; ns.loop = true;
    const nf = c.createBiquadFilter(); nf.type = "lowpass"; nf.frequency.value = 320;
    const ng = c.createGain(); ng.gain.value = .5;
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = .08; lg.gain.value = .22; lfo.connect(lg); lg.connect(ng.gain); lfo.start();
    ns.connect(nf); nf.connect(ng); ng.connect(this.amb); ns.start();
    // propeller hum
    const hs = c.createBufferSource(); hs.buffer = buf; hs.loop = true; this.humF = c.createBiquadFilter(); this.humF.type = "bandpass"; this.humF.frequency.value = 180; this.humF.Q.value = 2.5;
    this.hum = c.createGain(); this.hum.gain.value = 0; hs.connect(this.humF); this.humF.connect(this.hum); this.hum.connect(this.sfx); hs.start(.3);
    const ho = c.createOscillator(); ho.type = "triangle"; ho.frequency.value = 62; this.humO = ho; const hog = c.createGain(); hog.gain.value = .25; ho.connect(hog); hog.connect(this.hum); ho.start();
    // pad (slow, by depth)
    this.padG = c.createGain(); this.padG.gain.value = .0; const pf = c.createBiquadFilter(); pf.type = "lowpass"; pf.frequency.value = 700; this.padF = pf;
    this.padG.connect(pf); pf.connect(this.amb); pf.connect(this.rev);
    [110, 164.8, 220.5, 277.2].forEach((f, i) => { const o = c.createOscillator(); o.type = i % 2 ? "sine" : "triangle"; o.frequency.value = f; o.detune.value = rnd(-8, 8);
      const g = c.createGain(); g.gain.value = .05; const l = c.createOscillator(), lgn = c.createGain(); l.frequency.value = .05 + i * .03; lgn.gain.value = .04; l.connect(lgn); lgn.connect(g.gain); l.start();
      o.connect(g); g.connect(this.padG); o.start(); this.pad.push(o); });
    this.amb.gain.setTargetAtTime(.9, c.currentTime, 1.5);
    Voice.preload();
  },
  setOn(on) { if (this.master) this.master.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, .05); },
  update(dt, thrust, depth01, inDive) {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    this.hum.gain.setTargetAtTime((inDive ? .05 + thrust * .32 : 0) * this.duckK, t, .12);
    this.humF.frequency.setTargetAtTime(150 + thrust * 160, t, .2); this.humO.frequency.setTargetAtTime(55 + thrust * 30, t, .2);
    this.padG.gain.setTargetAtTime(.55, t, 2); this.padF.frequency.setTargetAtTime(900 - depth01 * 560, t, 2);
    const chord = depth01 < .33 ? [110, 164.8, 220.5, 277.2] : depth01 < .7 ? [98, 146.8, 196, 233.1] : [82.4, 123.5, 164.8, 196];
    this.pad.forEach((o, i) => o.frequency.setTargetAtTime(chord[i], t, 4));
    this.whaleT -= dt; if (this.whaleT < 0) { this.whaleT = rnd(14, 26); this.whale(); }
  },
  duck(on) { this.duckK = on ? .45 : 1; if (this.amb) this.amb.gain.setTargetAtTime(on ? .5 : .9, this.ctx.currentTime, .2); },
  tone(f, dur, type = "sine", vol = .2, f2 = null, delay = 0, dest = null, wet = 0) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
    o.connect(g); g.connect(dest || this.sfx); if (wet) { const w = c.createGain(); w.gain.value = wet; g.connect(w); w.connect(this.rev); }
    o.start(t); o.stop(t + dur + .05);
  },
  burst(dur, vol, freq, delay = 0, type = "lowpass", f2 = null, wet = 0) {
    if (!this.ctx) return; const c = this.ctx, t = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.noise; const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t);
    if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(.04, dur * .2)); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfx); if (wet) { const w = c.createGain(); w.gain.value = wet; g.connect(w); w.connect(this.rev); }
    s.start(t, Math.random() * 2); s.stop(t + dur + .05);
  },
  whale() { if (!this.ctx) return; const c = this.ctx, t = c.currentTime, f0 = rnd(180, 320);
    const o = c.createOscillator(), g = c.createGain(), v = c.createOscillator(), vg = c.createGain(); o.type = "sine";
    o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * rnd(1.3, 1.8), t + 1.4); o.frequency.linearRampToValueAtTime(f0 * .8, t + 3.2);
    v.frequency.value = 5; vg.gain.value = 6; v.connect(vg); vg.connect(o.frequency); v.start(t); v.stop(t + 3.4);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.035, t + .8); g.gain.linearRampToValueAtTime(0, t + 3.3);
    o.connect(g); g.connect(this.rev); g.connect(this.amb); o.start(t); o.stop(t + 3.4); },
  sonar() { this.tone(1180, 1.4, "sine", .32, 1150, 0, null, 1.2); this.tone(2360, .5, "sine", .05, null, 0, null, .6); this.tone(1180, .9, "sine", .08, 1140, .45, null, 1); },
  bubble() { this.tone(rnd(500, 900), .08, "sine", .06, rnd(1200, 1900)); },
  pearl() { this.tone(1568, .25, "triangle", .14, null, 0, null, .3); this.tone(2093, .3, "sine", .08, null, .06, null, .3); },
  frag() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, .5, "triangle", .14, null, i * .07, null, .5)); this.burst(.5, .12, 3000, 0, "highpass"); },
  checkpoint() { [392, 523, 659].forEach((f, i) => this.tone(f, .5, "sine", .16, null, i * .1, null, .5)); },
  hit(v = 1) { this.burst(.25, .5 * v, 500); this.tone(140, .35, "sine", .4 * v, 60); this.tone(rnd(1800, 2600), .22, "square", .03 * v, rnd(900, 1300)); },
  scrape() { this.burst(.35, .25, 1600, 0, "bandpass", 700); },
  zap() { for (let i = 0; i < 6; i++) this.tone(rnd(300, 1400), .05, "sawtooth", .07, rnd(100, 300), i * .04); this.burst(.3, .2, 4000, 0, "highpass"); },
  sting() { this.tone(900, .25, "sawtooth", .07, 300); this.burst(.2, .15, 2400, 0, "bandpass"); },
  bite() { this.burst(.15, .5, 900); this.tone(110, .3, "square", .12, 50); },
  creak() { this.tone(rnd(70, 110), 1.1, "sawtooth", .06, rnd(50, 70)); this.burst(.9, .1, 300, 0, "bandpass", 200); },
  rumble(d = 1.4) { this.burst(d, .5, 140, 0, "lowpass", 70); this.tone(42, d, "sine", .3, 30); },
  alarm() { this.tone(880, .16, "square", .06); this.tone(660, .16, "square", .06, null, .2); },
  click() { this.tone(820, .04, "triangle", .1); },
  light(on) { this.tone(on ? 1400 : 900, .06, "square", .05); this.tone(on ? 2100 : 600, .05, "square", .03, null, .05); },
  win() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, .55, "triangle", .14, null, i * .11, null, .6)); },
  fail() { [392, 330, 262, 196].forEach((f, i) => this.tone(f, .6, "triangle", .14, null, i * .18, null, .6)); this.burst(1.2, .3, 400, 0, "lowpass", 120); },
  breach() { this.burst(1.4, .9, 900, 0, "lowpass", 200); this.tone(70, 1.4, "sine", .6, 25); for (let i = 0; i < 14; i++) this.tone(rnd(300, 900), .1, "sine", .05, rnd(1000, 2000), .2 + i * .05); },
  star(i) { this.tone(880 + i * 260, .35, "sine", .2, null, 0, null, .4); this.tone(1760 + i * 520, .2, "sine", .06); },
  song(vol = .05) { if (!this.ctx) return; const c = this.ctx, t = c.currentTime, base = [196, 247, 294, 392][Math.random() * 4 | 0];
    [0, .5, 1.1].forEach((dt, i) => { const o = c.createOscillator(), g = c.createGain(); o.type = "sine"; o.frequency.setValueAtTime(base * [1, 1.25, 1.5][i], t + dt); o.frequency.linearRampToValueAtTime(base * [1.12, 1.33, 1.2][i], t + dt + 1.2);
      g.gain.setValueAtTime(0, t + dt); g.gain.linearRampToValueAtTime(vol, t + dt + .4); g.gain.linearRampToValueAtTime(0, t + dt + 1.6); o.connect(g); g.connect(this.rev); g.connect(this.amb); o.start(t + dt); o.stop(t + dt + 1.7); }); }
};
function buzz(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

/* ---------- voice: Dr. Meera + Varuna-1 log clips (decoded once, cached offline) ---------- */
const Voice = {
  bufs: {}, loading: {}, src: null, active: null, pend: null, log: [], seqId: 0,
  url(k) { return "voice/" + k + ".mp3"; },
  note(ev, id, extra) { const e = { ev, id, t: Math.round(performance.now()), mode: G.mode }; if (extra) Object.assign(e, extra); this.log.push(e); if (this.log.length > 500) this.log.shift(); },
  load(k) {
    if (this.bufs[k]) return Promise.resolve(this.bufs[k]);
    if (this.loading[k]) return this.loading[k];
    if (!Snd.ctx) return Promise.resolve(null);
    const p = fetch(this.url(k)).then(r => { if (!r.ok) throw new Error("http " + r.status); return r.arrayBuffer(); })
      .then(ab => new Promise((res, rej) => Snd.ctx.decodeAudioData(ab, res, rej)))
      .then(b => { this.bufs[k] = b; this.note("loaded", k); return b; })
      .catch(() => { this.loading[k] = null; this.note("loadfail", k); return null; });
    this.loading[k] = p; return p;
  },
  preload() { if (!Snd.ctx || !save.voice) return; ["go", "frag", "allfrag", "checkpoint", "o2low", "o2crit", "hull", "complete", "failo2", "failhull", "dark", "angler", "pressure", "current", "sonar", "follow", "lighton"].forEach(k => this.load(k)); },
  // chain: radio = mission-control call, log = Varuna's black box (band-passed, crackly), clean = story narration
  chain(kind) {
    const c = Snd.ctx;
    if (kind === "clean") return Snd.vbus;
    const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = kind === "log" ? 420 : 240;
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = kind === "log" ? 2900 : 5200;
    const g = c.createGain(); g.gain.value = kind === "log" ? 1.5 : 1.15;
    hp.connect(lp); lp.connect(g); g.connect(Snd.vbus);
    if (kind === "log") { Snd.burst(.25, .05, 3000, 0, "highpass"); }
    return hp;
  },
  play(k, kind, onEnd) {   // play now, returns false if unavailable
    const b = this.bufs[k]; if (!b || !Snd.ctx || !save.voice) return false;
    const s = Snd.ctx.createBufferSource(); s.buffer = b; s.connect(this.chain(kind)); s.start(Snd.ctx.currentTime + .06);
    this.src = s; Snd.duck(true); this.note("play", k, { dur: +b.duration.toFixed(2), kind });
    s.onended = () => { if (this.src === s) { this.src = null; Snd.duck(false); } this.note("ended", k); onEnd && onEnd(); };
    return b.duration;
  },
  stopAll() { if (this.src) { const s = this.src; this.src = null; try { s.onended = null; s.stop(); } catch (e) {} Snd.duck(false); this.note("cut", ""); } this.active = null; this.pend = null; this.seqId++; },
  // in-dive callouts: priority queue; a higher priority cuts a lower one; stale low calls are dropped
  say(k, pri = 1) {
    if (!save.voice) { this.note("muted", k); return; }
    if (!Snd.ctx) { this.note("noaudio", k); return; }
    const req = { k, pri, at: performance.now() }; this.note("say", k, { pri });
    if (this.active) { if (pri > this.active.pri) { this.stopAll(); } else { if (!this.pend || pri >= this.pend.pri) this.pend = req; this.note("queued", k); return; } }
    this.start(req);
  },
  start(req) {
    this.active = req;
    this.load(req.k).then(b => {
      if (this.active !== req) return;
      if (!b) { this.note("missing", req.k); this.active = null; return this.next(); }
      if (performance.now() - req.at > (req.pri >= 3 ? 6000 : 2500) || (req.pri < 3 && G.mode !== "play")) { this.note("stale", req.k); this.active = null; return this.next(); }
      Snd.tone(2525, .07, "sine", .04, null, 0, Snd.vbus);
      const ok = this.play(req.k, "radio", () => { if (this.active === req) { this.active = null; this.next(); } });
      if (!ok) { this.active = null; this.next(); }
    });
  },
  next() { const p = this.pend; this.pend = null; if (p) this.start(p); },
  // story sequences: plays lines one after another; onLine(i) fires as each line starts (or by timer when muted)
  seq(keys, onLine, onDone) {
    this.stopAll(); const id = ++this.seqId; let i = 0;
    const step = () => {
      if (id !== this.seqId) return;
      if (i >= keys.length) { onDone && onDone(); return; }
      const k = keys[i]; onLine && onLine(i, k); i++;
      const fallback = () => setTimeout(step, 900 + VO[k][1].length * 55);
      if (!save.voice || !Snd.ctx) { this.note("silent", k); return fallback(); }
      this.load(k).then(b => {
        if (id !== this.seqId) return;
        if (!b) return fallback();
        const kind = VO[k][0] === "V" ? "log" : "clean";
        this.play(k, kind, () => { if (id === this.seqId) setTimeout(step, 450); });
      });
    };
    step();
    return () => { if (id === this.seqId) this.stopAll(); };
  }
};
window.__voice = Voice.log;

/* ---------- game state ---------- */
const G = { mode: "boot", li: 0, L: null, s: null, cam: { x: 0, y: 0, z: 1, sx: 0, sy: 0 }, t: 0, shake: 0, flash: 0, flashC: [255, 255, 255],
  parts: [], sonars: [], lowFx: false, inp: { x: 0, y: 0, k: 0 }, time: 0, result: null, failReason: null, hintStep: 0, guide: null, said: {}, fps: 60 };
window.__sd = G;
const SUB_R = 14, THRUST = 300, DRAG = 1.8, SINK = 6, WALL_SAFE = 70;

/* ---------- level construction ---------- */
function buildLevel(li) {
  const D = LEVELS[li], R = rng(1000 + D.id * 77);
  const SX = [], SY = [], SR = [], SP = [];   // samples (x, y, radius, path index)
  const paths = D.paths;
  paths.forEach((P, pi) => {
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
      const segLen = hyp(p2[0] - p1[0], p2[1] - p1[1]), n = Math.max(2, Math.ceil(segLen / 22));
      for (let j = 0; j < n; j++) {
        const t = j / n, t2 = t * t, t3 = t2 * t;
        const cr = (a, b, c, d) => .5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        const x = cr(p0[0], p1[0], p2[0], p3[0]), y = cr(p0[1], p1[1], p2[1], p3[1]);
        let r = lerp(p1[2], p2[2], smooth(t));
        r *= 1 + .1 * Math.sin(x * .013 + D.id) * Math.cos(y * .011) + .05 * Math.sin(x * .05 + y * .03);
        SX.push(x); SY.push(y); SR.push(r); SP.push(pi);
      }
    }
    const e = P[P.length - 1]; SX.push(e[0]); SY.push(e[1]); SR.push(e[2]); SP.push(pi);
  });
  const N = SX.length;
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, mTop = 1e9, mBot = -1e9;
  for (let i = 0; i < N; i++) { minX = Math.min(minX, SX[i] - SR[i]); maxX = Math.max(maxX, SX[i] + SR[i]); minY = Math.min(minY, SY[i] - SR[i]); maxY = Math.max(maxY, SY[i] + SR[i]);
    if (SP[i] === 0) { mTop = Math.min(mTop, SY[i] - SR[i]); mBot = Math.max(mBot, SY[i] + SR[i]); } }
  const L = { D, li, N, SX: new Float32Array(SX), SY: new Float32Array(SY), SR: new Float32Array(SR), SP, minX, maxX, minY, maxY, mTop, mBot,
    cell: 96, grid: new Map(), boulders: [], R };
  L.mPerU = (D.d1 - D.d0) / (mBot - mTop);
  const key = (cx, cy) => cx * 65536 + cy;
  L.key = key;
  for (let i = 0; i < N; i++) {
    const r = SR[i] + 40, x0 = Math.floor((SX[i] - r) / L.cell), x1 = Math.floor((SX[i] + r) / L.cell), y0 = Math.floor((SY[i] - r) / L.cell), y1 = Math.floor((SY[i] + r) / L.cell);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) { const k = key(cx, cy); let a = L.grid.get(k); if (!a) L.grid.set(k, a = []); a.push(i); }
  }
  // boulders: given + decor (whale bones, wreck)
  const addB = (x, y, r, kind) => { const v = []; const n = 9 + (r > 30 ? 4 : 0); for (let i = 0; i < n; i++) { const a = i / n * TAU; v.push([Math.cos(a) * r * (0.86 + R() * .26), Math.sin(a) * r * (0.86 + R() * .26)]); }
    L.boulders.push({ x, y, r, v, kind: kind || "rock" }); };
  (D.boulder || []).forEach(b => addB(b[0], b[1], b[2]));
  L.depthAt = y => D.d0 + (y - mTop) * L.mPerU;
  L.sdf = (x, y) => sdf(L, x, y);
  if (D.whale) {   // skeleton lying on the cavern floor; ribs are obstacles you can swim between
    const [wx, wy0] = D.whale, wy = snapDown(L, wx, wy0 - 150) - 20; L.whale = { x: wx, y: wy, ribs: [] };
    for (let i = 0; i < 9; i++) { const rx = wx - 300 + i * 62, h = 100 + Math.sin(i / 8 * Math.PI) * 70; const rib = [];
      for (let j = 0; j <= 6; j++) { const a = j / 6; const px = rx + Math.sin(a * Math.PI) * 26 * (i < 4 ? -1 : 1) * .6, py = wy - a * h; rib.push([px, py]); }
      L.whale.ribs.push(rib); [0.55, 1].forEach(a => { const p = rib[Math.round(a * 6)]; addB(p[0], p[1], 9, "bone"); }); }
  }
  if (D.varuna) { const [vx, vy0] = D.varuna; const vy = snapDown(L, vx, vy0 - 120) - 26; L.varuna = { x: vx, y: vy }; addB(vx - 40, vy + 4, 22, "wreck"); addB(vx + 30, vy + 6, 20, "wreck"); }
  // rim points (for sonar and edge sparkle)
  L.rim = new Map(); L.rimCell = 128; const seen = new Set();
  const addRim = (x, y) => { const q = (Math.round(x / 9) * 100003 + Math.round(y / 9)); if (seen.has(q)) return; seen.add(q);
    const k = key(Math.floor(x / L.rimCell), Math.floor(y / L.rimCell)); let a = L.rim.get(k); if (!a) L.rim.set(k, a = []); a.push(x, y); };
  for (let i = 0; i < N; i++) { const r = SR[i], n = Math.ceil(TAU * r / 10);
    for (let j = 0; j < n; j++) { const a = j / n * TAU, x = SX[i] + Math.cos(a) * r, y = SY[i] + Math.sin(a) * r; if (sdf(L, x, y) > -1.2) addRim(x, y); } }
  L.boulders.forEach(b => { for (let j = 0; j < b.v.length; j++) { const p = b.v[j], q = b.v[(j + 1) % b.v.length]; for (let s = 0; s < 1; s += .34) addRim(b.x + lerp(p[0], q[0], s), b.y + lerp(p[1], q[1], s)); } });
  // nav graph
  L.adj = Array.from({ length: N }, () => []);
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { const d = hyp(SX[i] - SX[j], SY[i] - SY[j]); if (d < Math.min(SR[i], SR[j]) * .9) { L.adj[i].push(j, d); L.adj[j].push(i, d); } }
  // objects
  L.start = { x: D.start[0], y: D.start[1] };
  L.exit = { x: D.exit[0], y: D.exit[1] };
  L.frags = (D.frag || []).map((p, i) => ({ x: p[0], y: p[1], got: false, i }));
  L.vents = (D.vent || []).map(p => ({ x: p[0], y: snapDown(L, p[0], p[1]), t: R() * 3 }));
  L.cps = (D.cp || []).map(p => ({ x: p[0], y: p[1], on: false }));
  L.pearls = [];
  let acc = 0;
  for (let i = 1; i < N && SP[i] === 0; i++) {
    acc += hyp(SX[i] - SX[i - 1], SY[i] - SY[i - 1]);
    if (acc > 150) { acc = 0; const dx = SX[i] - SX[i - 1], dy = SY[i] - SY[i - 1], dl = hyp(dx, dy) || 1, side = Math.sin(L.pearls.length * 1.7) * SR[i] * .22;
      const x = SX[i] - dy / dl * side, y = SY[i] + dx / dl * side;
      if (hyp(x - L.start.x, y - L.start.y) > 220 && hyp(x - L.exit.x, y - L.exit.y) > 120 && sdf(L, x, y) < -24) L.pearls.push({ x, y, got: false, ph: R() * 6 }); }
  }
  L.frags.forEach(f => { for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + .4, x = f.x + Math.cos(a) * 52, y = f.y + Math.sin(a) * 44; if (sdf(L, x, y) < -18) L.pearls.push({ x, y, got: false, ph: R() * 6 }); } });
  (D.pearl || []).forEach(c => { for (let i = 0; i < c[2]; i++) { const a = i / c[2] * TAU; L.pearls.push({ x: c[0] + Math.cos(a) * 38, y: c[1] + Math.sin(a) * 30, got: false, ph: R() * 6 }); } });
  L.jellies = (D.jelly || []).map(p => ({ hx: p[0], hy: p[1], x: p[0], y: p[1], ph: R() * 6, rg: clamp(-sdf(L, p[0], p[1]) - 40, 12, 46), hitT: 0 }));
  L.eels = (D.eel || []).map(p => { const w = snapNearest(L, p[0], p[1]); return { ax: w.x, ay: w.y, nx: w.nx, ny: w.ny, st: 0, tm: R() * 2, ext: 0, ph: R() * 6 }; });
  L.anglers = (D.angler || []).map(p => ({ hx: p[0], hy: p[1], x: p[0], y: p[1], vx: 0, vy: 0, st: "idle", dk: 0, face: 1, ph: R() * 6, said: false }));
  L.curs = (D.cur || []).map(c => { const dx = c[2] - c[0], dy = c[3] - c[1], l = hyp(dx, dy); return { x1: c[0], y1: c[1], x2: c[2], y2: c[3], w: c[4], s: c[5], dx: dx / l, dy: dy / l, len: l }; });
  L.plumes = (D.plume || []).map(p => ({ x: p[0], y: snapDown(L, p[0], p[1] - 60), h: 165, ph: R() * 5 }));
  L.falls = (D.fall || []).map(p => ({ x: p[0], y: p[1], st: 0, tm: 0, rocks: [] }));
  L.plank = (D.plank || []).map(p => { const pts = []; for (let i = 0; i < 26; i++) pts.push([rnd(-90, 90), rnd(-60, 60), rnd(6), rnd(.6, 1.6)]); return { x: p[0], y: p[1], pts }; });
  L.fish = (D.fish || []).map(p => { const f = []; const n = 9 + (R() * 6 | 0); for (let i = 0; i < n; i++) f.push({ x: p[0] + rnd(-40, 40), y: p[1] + rnd(-30, 30), vx: rnd(-20, 20), vy: rnd(-10, 10) }); return { x: p[0], y: p[1], hx: p[0], hy: p[1], f, col: D.dark[0] > .5 ? 1 : 0 }; });
  L.turtles = (D.turtle || []).map(p => ({ x: p[0], y: p[1], hx: p[0], vx: 22 * (R() > .5 ? 1 : -1), ph: R() * 6 }));
  // floor decor: kelp / coral / tube worms / sea cucumbers along main path floors
  L.decor = [];
  for (let i = 0; i < N; i += 2) { if (SP[i] !== 0 || R() > .55) continue; const x = SX[i] + rnd(-20, 20), fy = snapDown(L, x, SY[i]); if (fy - SY[i] > SR[i] * 1.6) continue;
    const dpt = L.depthAt(fy); let type;
    if (dpt < 320) type = (D.kelpy || dpt < 200) && R() < .7 ? "kelp" : (R() < .5 ? "coral" : "fan");
    else if (dpt < 520) type = R() < .75 ? (R() < .5 ? "coral" : "fan") : "kelp";
    else if (dpt < 1600) type = R() < .5 ? "worm" : (R() < .5 ? "sponge" : "crinoid");
    else type = R() < .4 ? "worm" : (R() < .5 ? "cucumber" : "crinoid");
    L.decor.push({ x, y: fy + 4, type, h: rnd(.6, 1.3) * (type === "kelp" ? 150 : 40), ph: R() * 6, hue: R() }); }
  L.jyoti = D.jyoti ? { x: D.jyoti[0], y: D.jyoti[1], vx: 0, vy: 0, free: 0, far: 0, face: 1, ph: 0 } : null;
  L.press = D.press ? mBot + 25 : null;
  // far parallax silhouettes
  L.far = []; for (let x = minX - 800; x < maxX + 800; x += rnd(120, 260)) L.far.push({ x, h: rnd(200, 600), w: rnd(60, 160) });
  return L;
}
function sdf(L, x, y) {
  const a = L.grid.get(L.key(Math.floor(x / L.cell), Math.floor(y / L.cell)));
  let d = 120;
  if (a) for (let k = 0; k < a.length; k++) { const i = a[k]; const e = hyp(x - L.SX[i], y - L.SY[i]) - L.SR[i]; if (e < d) d = e; }
  for (let k = 0; k < L.boulders.length; k++) { const b = L.boulders[k]; const e = b.r - hyp(x - b.x, y - b.y); if (e > d) d = e; }
  return d;
}
function sdfN(L, x, y) { const e = 2, dx = sdf(L, x + e, y) - sdf(L, x - e, y), dy = sdf(L, x, y + e) - sdf(L, x, y - e), l = hyp(dx, dy) || 1; return [dx / l, dy / l]; }
function snapDown(L, x, y) { for (let k = 0; k < 400; k++) { if (sdf(L, x, y) >= 0) return y - 2; y += 4; } return y; }
function snapUp(L, x, y) { for (let k = 0; k < 300; k++) { if (sdf(L, x, y) >= 0) return y + 2; y -= 4; } return y; }
function snapNearest(L, x, y) {
  let best = null;
  for (let a = 0; a < 16; a++) { const dx = Math.cos(a / 16 * TAU), dy = Math.sin(a / 16 * TAU); let d = 0;
    while (d < 500 && sdf(L, x + dx * d, y + dy * d) < 0) d += 4;
    if (!best || d < best.d) best = { d, x: x + dx * d, y: y + dy * d, nx: -dx, ny: -dy }; }
  return best;
}
function nearestNode(L, x, y) {
  const a = L.grid.get(L.key(Math.floor(x / L.cell), Math.floor(y / L.cell))); let bi = -1, bv = -1e9;
  if (a) for (const i of a) { const v = L.SR[i] - hyp(x - L.SX[i], y - L.SY[i]); if (v > bv) { bv = v; bi = i; } }
  return bi;
}
function distField(L, tx, ty) {   // Dijkstra from the target over the sample graph
  const N = L.N, dist = new Float32Array(N).fill(1e9), done = new Uint8Array(N), s = nearestNode(L, tx, ty);
  if (s < 0) return dist; dist[s] = hyp(tx - L.SX[s], ty - L.SY[s]);
  const heap = [[dist[s], s]];
  const push = e => { heap.push(e); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  while (heap.length) { const [d, i] = pop(); if (done[i]) continue; done[i] = 1; const a = L.adj[i];
    for (let k = 0; k < a.length; k += 2) { const j = a[k], nd = d + a[k + 1]; if (nd < dist[j]) { dist[j] = nd; push([nd, j]); } } }
  return dist;
}

/* ---------- dive lifecycle ---------- */
function upg(k) { return save.upg[k] || 0; }
function startDive(li, fromCp) {
  const keepFr = fromCp && G.L && G.L.li === li ? G.L.frags.map(f => f.got) : null, keepP = fromCp && G.L && G.L.li === li ? G.L.pearls.map(p => p.got) : null;
  const cpi = fromCp && G.L && G.L.li === li ? G.s.cp : -1, keepTime = fromCp ? G.time : 0, keepCps = fromCp && G.L ? G.L.cps.map(c => c.on) : null, prevHull = fromCp && G.s ? G.s.hull : 0;
  const keepJ = fromCp && G.L && G.L.jyoti ? G.L.jyoti.free : 0, pearlsRun = fromCp && G.s ? G.s.pearls : 0;
  G.li = li; const L = G.L = buildLevel(li);
  if (keepFr) L.frags.forEach((f, i) => f.got = keepFr[i]);
  if (keepP) L.pearls.forEach((p, i) => p.got = keepP[i]);
  if (keepCps) L.cps.forEach((c, i) => c.on = keepCps[i]);
  const hullMax = 100 + 20 * upg("hull"), o2Max = 90 + 20 * upg("tank");
  const sp = cpi >= 0 ? L.cps[cpi] : L.start;
  G.s = { x: sp.x, y: sp.y, vx: 0, vy: 0, face: 1, fs: 1, tilt: 0, prop: 0, hullMax, hull: cpi >= 0 ? Math.max(prevHull, hullMax * .7) : hullMax, o2Max, o2: o2Max, bat: 100, light: false,
    sonarCD: 0, inv: 1.2, cp: cpi, pearls: pearlsRun, thr: 0, pressT: 0, lightOffT: 0, scrapeT: 0, dead: 0 };
  if (L.jyoti && cpi >= 0) { L.jyoti.x = sp.x - 140; L.jyoti.y = sp.y; L.jyoti.free = 1; }
  else if (L.jyoti) L.jyoti.free = keepJ;
  G.time = keepTime; G.parts = []; G.sonars = []; G.shake = 0; G.flash = 0; G.said = {}; G.t = 0; G.guideT = 0; G.guideFor = null; G.events = []; G.endT = 0;
  G.cam.x = G.s.x; G.cam.y = G.s.y;
  G.hintStep = 0; G.hintT = 0; hideHint();
  $("hName").textContent = "Dive " + L.D.id + " · " + L.D.name;
  setLight(L.D.dark[0] > .5);
  setMode("play");
  showScreen(null); $("hud").classList.remove("hidden"); $("controls").classList.remove("hidden");
  toast((fromCp ? "Checkpoint · " : "") + "Dive " + L.D.id + " · " + L.D.name, "", 2200);
  if (!fromCp) setTimeout(() => G.mode === "play" && Voice.say("go", 1), 600);
  updateHud(true);
}
function setLight(on) {
  if (!G.s) return; if (on && G.s.bat < 3) on = false;
  if (G.s.light !== on) { G.s.light = on; Snd.light(on); }
  $("bLight").classList.toggle("on", on);
}
function ping() {
  const s = G.s; if (!s || G.mode !== "play" || s.sonarCD > 0) return;
  if (s.bat < 6) { toast("Battery too low for sonar", "red", 1200); return; }
  s.bat -= 6; s.sonarCD = 1.2; G.sonars.push({ x: s.x, y: s.y, t: 0 }); Snd.sonar(); buzz(15);
  const b = $("bSonar"); b.classList.remove("ping"); void b.offsetWidth; b.classList.add("ping");
  G.events.push(["sonar", G.time]);
  if (!G.said.sonar && G.L.D.id === 4) { G.said.sonar = 1; setTimeout(() => G.mode === "play" && Voice.say("sonar", 1), 900); }
}
function damage(n, kind, nx, ny) {
  const s = G.s; if (s.dead) return;
  s.hull = Math.max(0, s.hull - n); G.shake = Math.min(14, G.shake + 3 + n * .45); G.flash = Math.min(.45, .12 + n * .02); G.flashC = kind === "zap" ? [120, 200, 255] : [255, 60, 60];
  for (let i = 0; i < 10 + n; i++) addP(s.x + (nx || 0) * SUB_R, s.y + (ny || 0) * SUB_R, rnd(-160, 160), rnd(-160, 160), rnd(.25, .6), kind === "zap" ? "zap" : "spark");
  buzz(kind === "wall" ? 30 : [40, 30, 40]);
  G.events.push(["hit", kind, Math.round(n * 10) / 10, G.time]);
  if (s.hull <= 0) return fail("hull");
  if (s.hull < s.hullMax * .3 && !G.said.hull) { G.said.hull = 1; Voice.say("hull", 2); }
}
function fail(reason) {
  const s = G.s; if (s.dead) return; s.dead = 1; G.failReason = reason;
  setMode("dying"); G.dieT = 0;
  Voice.stopAll(); Snd.hum && Snd.hum.gain.setTargetAtTime(0, Snd.ctx.currentTime, .1);
  if (reason === "hull") { Snd.breach(); G.shake = 22; G.flash = .8; G.flashC = [255, 255, 255]; for (let i = 0; i < 70; i++) addP(s.x, s.y, rnd(-260, 260), rnd(-260, 200), rnd(.6, 1.6), i % 3 ? "bubble" : "spark"); buzz([80, 40, 120]); }
  else { Snd.fail(); }
  G.events.push(["fail", reason, G.time]);
  setTimeout(() => Voice.say(reason === "hull" ? "failhull" : "failo2", 3), reason === "hull" ? 900 : 400);
  setTimeout(() => {
    setMode("fail"); $("controls").classList.add("hidden");
    $("fKicker").textContent = reason === "hull" ? "HULL BREACHED" : "OUT OF OXYGEN";
    $("fText").textContent = reason === "hull" ? "Matsya made an emergency ascent. Bumps at speed, stings and plumes wear the hull down. Go slower near walls." : "Your air ran out. Bubble vents refill oxygen, and a bigger tank in Upgrades gives more time.";
    $("bFromCp").textContent = G.s.cp >= 0 ? "Retry from checkpoint" : "Retry dive";
    showScreen("sFail");
  }, reason === "hull" ? 2200 : 2600);
}
function complete() {
  const s = G.s, L = G.L; if (s.dead) return; s.dead = 2; setMode("won"); G.wonT = 0;
  Snd.win(); Voice.stopAll(); setTimeout(() => Voice.say("complete", 3), 500);
  for (let i = 0; i < 60; i++) addP(L.exit.x + rnd(-40, 40), L.exit.y + rnd(-40, 40), rnd(-120, 120), rnd(-200, -40), rnd(.8, 2), i % 2 ? "glow" : "bubble");
  const nf = L.frags.filter(f => f.got).length, all = nf === L.frags.length, hullP = s.hull / s.hullMax, inPar = G.time <= L.D.par;
  const stars = 1 + (all ? 1 : 0) + (hullP >= .5 && inPar ? 1 : 0);
  const id = L.D.id, prev = save.stars[id] || 0;
  save.stars[id] = Math.max(prev, stars); save.best[id] = Math.min(save.best[id] || 1e9, Math.round(G.time));
  save.pearls += s.pearls; save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, id + 1)); save.frags[id] = Math.max(save.frags[id] || 0, nf);
  if (id === LEVELS.length) save.ending = true;
  persist();
  G.result = { stars, nf, total: L.frags.length, hullP, time: G.time, par: L.D.par, pearls: s.pearls, id };
  G.events.push(["complete", stars, G.time]);
  setTimeout(() => showResult(), 2300);
}

/* ---------- per-frame simulation ---------- */
function addP(x, y, vx, vy, life, type, size) {
  const cap = G.lowFx ? 200 : 450; if (G.parts.length >= cap) G.parts.shift();
  G.parts.push({ x, y, vx, vy, life, max: life, type, size: size || (type === "bubble" ? rnd(1.5, 4.5) : type === "glow" ? rnd(2, 4) : rnd(1, 2.5)) });
}
function nearSeg(px, py, c) { const t = clamp(((px - c.x1) * c.dx + (py - c.y1) * c.dy), 0, c.len); return [hyp(px - (c.x1 + c.dx * t), py - (c.y1 + c.dy * t)), t]; }
function update(dt) {
  const s = G.s, L = G.L, D = L.D; G.t += dt;
  const alive = G.mode === "play";
  if (alive) G.time += dt;
  // input
  let ix = G.inp.x, iy = G.inp.y; const im = Math.min(1, hyp(ix, iy)); if (!alive) { ix = 0; iy = 0; }
  s.thr = lerp(s.thr, alive ? im : 0, 1 - Math.exp(-dt * 8));
  if (alive && s.dead === 0) {
    s.vx += ix * THRUST * dt; s.vy += (iy * THRUST + SINK * (1 - im)) * dt;
  } else if (G.mode === "dying" && G.failReason === "hull") { s.vy += 40 * dt; }
  const dr = Math.exp(-DRAG * dt); s.vx *= dr; s.vy *= dr;
  // currents
  let inCur = 0;
  for (const c of L.curs) { const [d, t] = nearSeg(s.x, s.y, c); if (d < c.w && t > 0 && t < c.len) { const f = Math.sqrt(1 - d / c.w) * c.s; s.vx += c.dx * f * dt * 2.2; s.vy += c.dy * f * dt * 2.2; inCur = 1; } }
  if (inCur && !G.said.current && alive) { G.said.current = 1; Voice.say("current", 1); if (D.id === 5 || D.id === 2) showHint("Currents push Matsya. Ride them, don't fight them.", 3500); }
  s.x += s.vx * dt; s.y += s.vy * dt;
  // walls
  for (let it = 0; it < 3; it++) {
    const d = sdf(L, s.x, s.y); if (d <= -SUB_R) break;
    const [nx, ny] = sdfN(L, s.x, s.y), pen = d + SUB_R; s.x -= nx * pen; s.y -= ny * pen;
    const vn = s.vx * nx + s.vy * ny;
    if (vn > 0) { s.vx -= 1.25 * vn * nx; s.vy -= 1.25 * vn * ny;
      if (it === 0 && alive) { if (vn > WALL_SAFE && s.inv <= 0) { damage(Math.max(3, (vn - WALL_SAFE) * .12), "wall", nx, ny); Snd.hit(clamp(vn / 200, .4, 1)); s.inv = .35; }
        else if (vn > 25 && s.scrapeT <= 0) { Snd.scrape(); s.scrapeT = .3; for (let i = 0; i < 4; i++) addP(s.x + nx * SUB_R, s.y + ny * SUB_R, rnd(-40, 40), rnd(-40, 40), .5, "dust"); } } }
  }
  s.inv -= dt; s.scrapeT -= dt; s.sonarCD -= dt;
  if (Math.abs(s.vx) > 8) s.face = s.vx > 0 ? 1 : -1;
  s.fs = lerp(s.fs, s.face, 1 - Math.exp(-dt * 7)); s.tilt = lerp(s.tilt, clamp(s.vy / 260, -.35, .35) * Math.sign(s.fs || 1), 1 - Math.exp(-dt * 5));
  s.prop += dt * (6 + s.thr * 30);
  // propeller bubbles
  if (Math.random() < s.thr * dt * 40 * (G.lowFx ? .5 : 1)) addP(s.x - s.fs * 22, s.y + rnd(-3, 3), -s.fs * rnd(30, 70) + s.vx * .2, rnd(-20, 10), rnd(.6, 1.3), "bubble");
  const depth = L.depthAt(s.y); G.depth = depth;
  const dk = lerp(D.dark[0], D.dark[1], clamp((depth - D.d0) / (D.d1 - D.d0), 0, 1)); G.dark = dk;
  if (alive) {
    // oxygen
    s.o2 -= dt; let venting = false;
    for (const v of L.vents) if (hyp(s.x - v.x, s.y - (v.y - 60)) < 95) venting = true;
    if (venting) { if (s.o2 < s.o2Max - .5 && Math.random() < dt * 12) Snd.bubble(); s.o2 = Math.min(s.o2Max, s.o2 + s.o2Max * .3 * dt); if (s.o2 > s.o2Max * .5) G.said.o2low = G.said.o2crit = 0; if (!G.said.vent) { G.said.vent = 1; G.events.push(["vent", G.time]); } }
    s.venting = venting;
    if (s.o2 < s.o2Max * .3 && !G.said.o2low) { G.said.o2low = 1; Voice.say("o2low", 2); toast("Oxygen low – find a bubble vent", "red", 2200); }
    if (s.o2 < s.o2Max * .12 && !G.said.o2crit) { G.said.o2crit = 1; Voice.say("o2crit", 3); }
    if (s.o2 < s.o2Max * .12 && Math.floor(G.t * 1.5) !== Math.floor((G.t - dt) * 1.5)) Snd.alarm();
    if (s.o2 <= 0) { s.o2 = 0; fail("o2"); }
    // battery
    if (s.light) { s.bat -= .7 * (1 - .15 * upg("lamp")) * dt; if (s.bat <= 0) { s.bat = 0; setLight(false); toast("Battery empty – light off to recharge", "red", 2000); } }
    else s.bat = Math.min(100, s.bat + 3 * dt);
    // darkness prompts
    if (dk > .55 && !s.light) { s.lightOffT += dt; if (s.lightOffT > 2.5 && !G.said.dark && !L.jyoti) { G.said.dark = 1; Voice.say("dark", 1); if (D.id === 4) showHint("Tap 💡 LIGHT to see. Tap ◉ SONAR to show the cave walls.", 4500); } } else s.lightOffT = 0;
    // pressure
    if (L.press) { const py = L.press + upg("hull") * 150 / L.mPerU; G.pressY = py;
      if (s.y > py) { s.pressT += dt; s.hull -= 4 * dt; if (Math.random() < dt * 1.2) { Snd.creak(); G.shake = Math.max(G.shake, 3); }
        if (!G.said.pressure) { G.said.pressure = 1; Voice.say("pressure", 2); }
        if (s.hull <= 0) { s.hull = 0; fail("hull"); } } }
    // pickups
    for (const p of L.pearls) if (!p.got && hyp(s.x - p.x, s.y - p.y) < 28) { p.got = true; s.pearls++; Snd.pearl(); for (let i = 0; i < 8; i++) addP(p.x, p.y, rnd(-60, 60), rnd(-60, 60), .5, "glow"); }
    for (const f of L.frags) if (!f.got && hyp(s.x - f.x, s.y - f.y) < 36) {
      f.got = true; Snd.frag(); buzz(30); G.flash = .25; G.flashC = [255, 200, 110];
      for (let i = 0; i < 30; i++) addP(f.x, f.y, rnd(-150, 150), rnd(-150, 150), rnd(.5, 1.1), "glow");
      const n = L.frags.filter(q => q.got).length; G.events.push(["frag", n, G.time]); G.guideFor = null;
      const label = L.jyoti ? "Colony light" : (D.varuna && n === L.frags.length ? "Varuna-1 core recovered" : "Black-box fragment");
      toast("◆ " + label + " " + n + "/" + L.frags.length, "gold", 1800);
      Voice.say(n === L.frags.length ? "allfrag" : "frag", n === L.frags.length ? 2 : 1);
    }
    L.cps.forEach((c, i) => { if (!c.on && hyp(s.x - c.x, s.y - c.y) < 64) { c.on = true; s.cp = i; Snd.checkpoint(); toast("✓ Checkpoint saved", "green", 1600); Voice.say("checkpoint", 1); G.events.push(["cp", i, G.time]);
      s.o2 = Math.max(s.o2, s.o2Max * .6); for (let k = 0; k < 20; k++) addP(c.x, c.y, rnd(-90, 90), rnd(-90, 90), .8, "glowg"); } });
    // exit
    const atExit = hyp(s.x - L.exit.x, s.y - L.exit.y) < 70;
    if (L.jyoti) { if (atExit && hyp(L.jyoti.x - L.exit.x, L.jyoti.y - L.exit.y) < 230) complete(); else if (atExit && !G.said.wait) { G.said.wait = 1; toast("Wait for Jyoti – keep your light on", "", 2200); } }
    else if (atExit) complete();
  }
  // hazards
  const hitOK = alive && s.inv <= 0;
  for (const j of L.jellies) {
    j.x = j.hx + Math.sin(G.t * .5 + j.ph) * j.rg; j.y = j.hy + Math.sin(G.t * .8 + j.ph * 1.3) * j.rg * .6 + Math.sin(G.t * 2 + j.ph) * 4;
    if (hitOK && hyp(s.x - j.x, s.y - j.y) < 22 + SUB_R) { const d = hyp(s.x - j.x, s.y - j.y) || 1, nx = (s.x - j.x) / d, ny = (s.y - j.y) / d; s.vx += nx * 140; s.vy += ny * 140; s.inv = .8; Snd.sting(); damage(8, "jelly", -nx, -ny); }
  }
  for (const e of L.eels) {
    const near = hyp(s.x - e.ax, s.y - e.ay) < 270; e.tm -= dt;
    if (e.st === 0) { e.ext = Math.max(0, e.ext - dt * 2); if (e.tm <= 0 && near) { e.st = 1; e.tm = .7; } }
    else if (e.st === 1) { if (e.tm <= 0) { e.st = 2; e.tm = 1.1; Snd.zap(); } }
    else if (e.st === 2) { e.ext = Math.min(1, e.ext + dt * 5); if (e.tm <= 0) { e.st = 0; e.tm = 2.4; } }
    if (e.ext > .3 && hitOK) { const len = 118 * e.ext, t = clamp((s.x - e.ax) * e.nx + (s.y - e.ay) * e.ny, 0, len), px = e.ax + e.nx * t, py = e.ay + e.ny * t;
      if (hyp(s.x - px, s.y - py) < SUB_R + 11) { s.inv = .9; const d = hyp(s.x - px, s.y - py) || 1; s.vx += (s.x - px) / d * 120; s.vy += (s.y - py) / d * 120; damage(12, "zap"); Snd.zap(); } }
  }
  for (const a of L.anglers) {
    const d = hyp(s.x - a.x, s.y - a.y); let tx = a.hx, ty = a.hy, sp = 45;
    const fleeJ = L.jyoti && L.jyoti.free && hyp(L.jyoti.x - a.x, L.jyoti.y - a.y) < 280;
    if (fleeJ) { a.st = "flee"; } else if (a.st === "flee") a.st = "idle";
    a.cool = Math.max(0, (a.cool || 0) - dt);
    if (a.st === "home" && hyp(a.x - a.hx, a.y - a.hy) < 40) a.st = "idle";
    if ((a.st === "idle" || a.st === "home") && a.cool <= 0) { if (alive && s.light && d < 260) { a.st = "chase"; a.dk = 0; if (!G.said.angler) { G.said.angler = 1; Voice.say("angler", 2); if (D.id === 7) showHint("Anglerfish follow light. Tap 💡 to switch it off!", 3500); } } }
    if (a.st === "chase") { tx = s.x; ty = s.y; sp = 82; if (!s.light) a.dk += dt; else a.dk = 0; if (a.dk > 1.6 || d > 480 || !alive) { a.st = "home"; a.cool = 7; G.events.push(["angler_lost", G.time]); } }
    if (a.st === "flee" && L.jyoti) { tx = a.x + (a.x - L.jyoti.x); ty = a.y + (a.y - L.jyoti.y); sp = 110; }
    if (a.st === "idle") { tx = a.hx + Math.sin(G.t * .3 + a.ph) * 50; ty = a.hy + Math.sin(G.t * .5 + a.ph) * 20; sp = 25; }
    const dx = tx - a.x, dy = ty - a.y, dl = hyp(dx, dy) || 1; a.vx = lerp(a.vx, dx / dl * Math.min(sp, dl * 2), 1 - Math.exp(-dt * 2.5)); a.vy = lerp(a.vy, dy / dl * Math.min(sp, dl * 2), 1 - Math.exp(-dt * 2.5));
    a.x += a.vx * dt; a.y += a.vy * dt; const ad = sdf(L, a.x, a.y); if (ad > -24) { const [nx, ny] = sdfN(L, a.x, a.y); a.x -= nx * (ad + 24); a.y -= ny * (ad + 24); }
    if (Math.abs(a.vx) > 5) a.face = a.vx > 0 ? 1 : -1;
    if (hitOK && d < SUB_R + 22 && a.st !== "chase") { const nx = (s.x - a.x) / (d || 1), ny = (s.y - a.y) / (d || 1); s.vx += nx * 60 * dt * 10; s.vy += ny * 60 * dt * 10; }
    else if (hitOK && d < SUB_R + 22) { s.inv = 1; const nx = (s.x - a.x) / (d || 1), ny = (s.y - a.y) / (d || 1); s.vx += nx * 150; s.vy += ny * 150; a.vx -= nx * 120; a.vy -= ny * 120; Snd.bite(); damage(12, "bite", -nx, -ny); a.st = "home"; a.cool = 6; }
  }
  for (const p of L.plumes) {
    const ph = (G.t + p.ph) % 5; p.on = ph < 3; p.warn = ph > 4.3;
    if (p.on && Math.random() < dt * (G.lowFx ? 10 : 22)) addP(p.x + rnd(-6, 6), p.y - 26, rnd(-10, 10), rnd(-120, -70), rnd(1, 1.6), "smoke", rnd(5, 9));
    if (p.on && hitOK && Math.abs(s.x - p.x) < 24 + (p.y - s.y) * .12 && s.y < p.y && s.y > p.y - p.h) { damage(2.5, "heat"); s.inv = .25; s.vy -= 20; if (!G.said.plume) { G.said.plume = 1; toast("Too hot! Stay out of the plumes", "red", 1800); } }
  }
  for (const f of L.falls) {
    if (f.st === 0 && alive && hyp(s.x - f.x, s.y - f.y) < 140) { f.st = 1; f.tm = 1.1; Snd.rumble(1.4); G.shake = Math.max(G.shake, 6); G.events.push(["fall", G.time]); toast("Rockfall!", "red", 1200); }
    if (f.st === 1) { f.tm -= dt; G.shake = Math.max(G.shake, 3); if (Math.random() < dt * 20) { const x = f.x + rnd(-110, 110); addP(x, snapUp(L, x, f.y), rnd(-10, 10), rnd(20, 60), 1, "dust", rnd(2, 4)); }
      if (f.tm <= 0) { f.st = 2; for (let i = 0; i < 6; i++) { const x = f.x + rnd(-120, 120), y = snapUp(L, x, f.y) + 14; f.rocks.push({ x, y, vy: rnd(0, 40), r: rnd(9, 16), rot: rnd(TAU), vr: rnd(-3, 3), life: 4, hit: false }); } } }
    for (const r of f.rocks) { if (r.life <= 0) continue; r.life -= dt; if (!r.rest) { r.vy += 300 * dt; r.y += r.vy * dt; r.rot += r.vr * dt; if (sdf(L, r.x, r.y) > -r.r && r.vy > 0 && r.life < 3.8) { r.rest = 1; Snd.burst(.2, .2, 400); for (let i = 0; i < 5; i++) addP(r.x, r.y, rnd(-50, 50), rnd(-50, 0), .7, "dust"); } }
      if (!r.rest && !r.hit && hitOK && hyp(s.x - r.x, s.y - r.y) < SUB_R + r.r) { r.hit = true; s.inv = .8; s.vy += 120; damage(14, "rock", 0, -1); } }
  }
  // Jyoti (escort)
  const J = L.jyoti;
  if (J) {
    J.ph += dt;
    if (!J.free && hyp(s.x - J.x, s.y - J.y) < 330 && alive) { J.free = 1; Snd.rumble(1.6); G.shake = 8; for (let i = 0; i < 30; i++) addP(J.x + rnd(-120, 120), J.y + rnd(-60, 60), rnd(-80, 80), rnd(-40, 80), 1.2, "dust", rnd(2, 5)); G.events.push(["jyoti_free", G.time]); Snd.song(.08); toast("Jyoti is free! Lead it with your light", "gold", 2600); showHint("Keep 💡 LIGHT on and swim slowly. Jyoti follows your lamp.", 4500); }
    const d = hyp(s.x - J.x, s.y - J.y);
    let tx = J.x, ty = J.y, sp = 0;
    if (J.free && s.light && d < 520) { tx = s.x - s.fs * 110; ty = s.y - 20; sp = 82; J.far = 0; }
    else if (J.free) { J.far += dt; if (alive && J.far > 3.5 && !G.said.jfollow) { G.said.jfollow = 1; setTimeout(() => G.said.jfollow = 0, 16000); Voice.say(s.light ? "follow" : "lighton", 2); } }
    const dx = tx - J.x, dy = ty - J.y, dl = hyp(dx, dy) || 1; const want = Math.min(sp, dl * 1.2);
    J.vx = lerp(J.vx, dx / dl * want + Math.sin(J.ph * .7) * 6, 1 - Math.exp(-dt * 1.5)); J.vy = lerp(J.vy, dy / dl * want + Math.sin(J.ph * .9) * 5, 1 - Math.exp(-dt * 1.5));
    J.x += J.vx * dt; J.y += J.vy * dt; const jd = sdf(L, J.x, J.y); if (jd > -40) { const [nx, ny] = sdfN(L, J.x, J.y); J.x -= nx * (jd + 40) * .5; J.y -= ny * (jd + 40) * .5; }
    if (Math.abs(J.vx) > 6) J.face = J.vx > 0 ? 1 : -1;
    if (Math.random() < dt * 8) addP(J.x + rnd(-50, 50), J.y + rnd(-20, 20), rnd(-10, 10), rnd(-10, 10), rnd(1, 2), "glowj");
    if (Math.floor(G.t / 7) !== Math.floor((G.t - dt) / 7)) Snd.song(.05);
  } else if (D.song && Math.floor(G.t / 7) !== Math.floor((G.t - dt) / 7)) Snd.song(.03);
  // ambient life
  for (const sc of L.fish) {
    let cx = 0, cy = 0; for (const f of sc.f) { cx += f.x; cy += f.y; } cx /= sc.f.length; cy /= sc.f.length;
    sc.x = cx; sc.y = cy; const ds = hyp(s.x - cx, s.y - cy);
    const gx = sc.hx + Math.sin(G.t * .2 + sc.hy) * 120, gy = sc.hy + Math.sin(G.t * .27) * 40;
    for (const f of sc.f) {
      f.vx += ((cx - f.x) * .4 + (gx - cx) * .3 + rnd(-30, 30)) * dt; f.vy += ((cy - f.y) * .4 + (gy - cy) * .3 + rnd(-30, 30)) * dt;
      const dd = hyp(s.x - f.x, s.y - f.y); if (dd < 110) { f.vx += (f.x - s.x) / dd * 600 * dt; f.vy += (f.y - s.y) / dd * 600 * dt; }
      const sp = hyp(f.vx, f.vy), mx = ds < 140 ? 140 : 55; if (sp > mx) { f.vx *= mx / sp; f.vy *= mx / sp; }
      f.x += f.vx * dt; f.y += f.vy * dt; const fd = sdf(L, f.x, f.y); if (fd > -10) { const [nx, ny] = sdfN(L, f.x, f.y); f.x -= nx * (fd + 10); f.y -= ny * (fd + 10); f.vx -= nx * 30; f.vy -= ny * 30; }
    }
  }
  for (const t of L.turtles) { t.x += t.vx * dt; if (Math.abs(t.x - t.hx) > 260 || sdf(L, t.x + Math.sign(t.vx) * 40, t.y) > -10) t.vx = -t.vx; t.y += Math.sin(G.t * .6 + t.ph) * 6 * dt; }
  for (const v of L.vents) { v.t += dt; if (Math.random() < dt * (G.lowFx ? 6 : 12)) addP(v.x + rnd(-8, 8), v.y - 4, rnd(-6, 6), rnd(-90, -50), rnd(1.2, 2.4), "bubble", rnd(2, 5)); }
  // particles
  for (let i = G.parts.length - 1; i >= 0; i--) { const p = G.parts[i]; p.life -= dt; if (p.life <= 0) { G.parts.splice(i, 1); continue; }
    if (p.type === "bubble") { p.vy -= 60 * dt; p.vx += Math.sin(p.life * 9 + p.size) * 30 * dt; p.vx *= .97; p.vy *= .985; }
    else if (p.type === "smoke") { p.vx *= .98; p.vy *= .99; p.size += dt * 9; }
    else { const k = Math.exp(-dt * 3); p.vx *= k; p.vy *= k; if (p.type === "dust") p.vy += 40 * dt; }
    p.x += p.vx * dt; p.y += p.vy * dt; }
  for (let i = G.sonars.length - 1; i >= 0; i--) { G.sonars[i].t += dt; if (G.sonars[i].t > 3.4) G.sonars.splice(i, 1); }
  G.shake = Math.max(0, G.shake - dt * 20); G.flash = Math.max(0, G.flash - dt * 1.6);
  // guide arrow toward next objective along the caves
  G.guideT -= dt;
  if (G.guideT <= 0 && alive) { G.guideT = .3; updateGuide(); }
  // tutorial
  if (alive) tutorial(dt);
  if (G.mode === "dying") { G.dieT += dt; }
  if (G.mode === "won") { G.wonT += dt; }
}
function updateGuide() {
  const L = G.L, s = G.s; let tgt = null, best = 1e9;
  const pool = L.frags.filter(f => !f.got);
  if (!G.fieldCache) G.fieldCache = new Map();
  const fieldOf = o => { const k = Math.round(o.x) + "," + Math.round(o.y); let f = G.fieldCache.get(k); if (!f || f.L !== L) { f = { L, d: distField(L, o.x, o.y) }; G.fieldCache.set(k, f); } return f.d; };
  const n0 = nearestNode(L, s.x, s.y); if (n0 < 0) return;
  for (const f of pool) { const d = fieldOf(f)[n0]; if (d < best) { best = d; tgt = f; } }
  if (!tgt) tgt = L.exit;
  if (L.jyoti && L.jyoti.free && hyp(s.x - L.jyoti.x, s.y - L.jyoti.y) > 560 && !pool.length) tgt = { x: L.jyoti.x, y: L.jyoti.y, jyoti: 1 };
  const field = tgt.jyoti ? distField(L, tgt.x, tgt.y) : fieldOf(tgt);
  // walk downhill ~160 units for a lookahead point
  let i = n0, walked = 0;
  for (let k = 0; k < 40 && walked < 160; k++) { const a = L.adj[i]; let bj = -1, bd = field[i]; for (let q = 0; q < a.length; q += 2) if (field[a[q]] < bd) { bd = field[a[q]]; bj = a[q]; } if (bj < 0) break; walked += hyp(L.SX[bj] - L.SX[i], L.SY[bj] - L.SY[i]); i = bj; }
  const dTgt = hyp(tgt.x - s.x, tgt.y - s.y);
  const gx = dTgt < 220 || field[n0] < 200 ? tgt.x : L.SX[i], gy = dTgt < 220 || field[n0] < 200 ? tgt.y : L.SY[i];
  G.guide = { x: gx, y: gy, kind: tgt === L.exit ? "exit" : tgt.jyoti ? "jyoti" : "frag", tx: tgt.x, ty: tgt.y, dist: field[n0] };
}
function tutorial(dt) {
  const s = G.s, L = G.L; G.hintT += dt;
  if (L.D.id !== 1) return;
  const moved = hyp(s.x - L.start.x, s.y - L.start.y);
  if (G.hintStep === 0 && G.hintT > 1.2) { showHint("Touch and drag on the LEFT side to steer Matsya.", 0); G.hintStep = 1; }
  else if (G.hintStep === 1 && moved > 160) { hideHint(); G.hintStep = 2; G.hintT = 0; }
  else if (G.hintStep === 2 && G.hintT > .8) { showHint("Follow the small arrow to the glowing ◆ black-box fragment. Pearls ● buy upgrades.", 5000); G.hintStep = 3; }
  else if (G.hintStep === 3 && L.vents.some(v => hyp(s.x - v.x, s.y - v.y) < 300)) { showHint("Bubble vent! Hover over the bubbles to refill oxygen (O₂).", 4000); G.hintStep = 4; }
  else if (G.hintStep >= 3 && G.hintStep < 5 && L.frags.every(f => f.got)) { showHint("All fragments found. Head for the exit beacon!", 3500); G.hintStep = 5; }
}

/* ---------- canvas & helpers ---------- */
const cv = $("c"), ctx = cv.getContext("2d");
const rc = document.createElement("canvas"), rctx = rc.getContext("2d");
const dk = document.createElement("canvas"), dctx = dk.getContext("2d");
let cw = 0, ch = 0, dpr = 1, dq = .5;
function layout() {
  cw = window.innerWidth; ch = window.innerHeight; dpr = Math.min(window.devicePixelRatio || 1, G.lowFx ? 1.25 : 2);
  cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); rc.width = cv.width; rc.height = cv.height;
  dq = G.lowFx ? .25 : .5; dk.width = Math.ceil(cw * dq); dk.height = Math.ceil(ch * dq);
  G.cam.z = clamp(Math.min(cw, ch) / 440, .7, 1.4);
}
window.addEventListener("resize", layout);
const glowCache = {};
function glowSprite(col) {
  let g = glowCache[col]; if (g) return g;
  g = document.createElement("canvas"); g.width = g.height = 64; const c = g.getContext("2d"), gr = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, col); gr.addColorStop(.25, col.replace(/[\d.]+\)$/, ".5)")); gr.addColorStop(1, col.replace(/[\d.]+\)$/, "0)"));
  c.fillStyle = gr; c.fillRect(0, 0, 64, 64); return glowCache[col] = g;
}
function glow(c, x, y, r, col, a = 1) { if (a <= 0.01) return; c.globalAlpha = a; c.drawImage(glowSprite(col), x - r, y - r, r * 2, r * 2); c.globalAlpha = 1; }
let rockPat = null;
function makeRockPattern() {
  const p = document.createElement("canvas"); p.width = p.height = 256; const c = p.getContext("2d"), R = rng(7);
  c.fillStyle = "#8a8f94"; c.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 260; i++) { const x = R() * 256, y = R() * 256, r = 4 + R() * 26, v = 90 + R() * 90 | 0;
    for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) { c.fillStyle = "rgba(" + v + "," + v + "," + (v + 6) + "," + (.12 + R() * .2) + ")"; c.beginPath(); c.ellipse(x + ox, y + oy, r, r * (.5 + R() * .5), R() * 3, 0, TAU); c.fill(); } }
  for (let i = 0; i < 1400; i++) { const v = R() * 255 | 0; c.fillStyle = "rgba(" + v + "," + v + "," + v + ",.18)"; c.fillRect(R() * 256, R() * 256, 1.5, 1.5); }
  rockPat = rctx.createPattern(p, "repeat");
}
const WATER = [[0, [36, 156, 196]], [150, [14, 112, 160]], [400, [7, 62, 112]], [800, [4, 32, 72]], [1500, [2, 15, 40]], [3000, [1, 8, 22]], [6500, [0, 3, 10]]];
function waterAt(d) { for (let i = 1; i < WATER.length; i++) if (d < WATER[i][0]) return mixC(WATER[i - 1][1], WATER[i][1], (d - WATER[i - 1][0]) / (WATER[i][0] - WATER[i - 1][0])); return WATER[WATER.length - 1][1]; }
const ROCK = [[0, [88, 80, 66], [176, 160, 116]], [400, [46, 62, 76], [112, 150, 160]], [1000, [26, 40, 54], [70, 100, 120]], [3000, [18, 24, 34], [52, 66, 86]], [6500, [12, 16, 24], [44, 52, 70]]];
function rockAt(d) { for (let i = 1; i < ROCK.length; i++) if (d < ROCK[i][0]) { const t = (d - ROCK[i - 1][0]) / (ROCK[i][0] - ROCK[i - 1][0]); return [mixC(ROCK[i - 1][1], ROCK[i][1], t), mixC(ROCK[i - 1][2], ROCK[i][2], t)]; } const r = ROCK[ROCK.length - 1]; return [r[1], r[2]]; }

/* ---------- shared drawings (dive, title, story art) ---------- */
function drawSub(c, x, y, sc, face, tilt, prop, t, dmg) {
  c.save(); c.translate(x, y); c.rotate(tilt); c.scale(sc * face, sc);
  // propeller shroud + blades
  c.fillStyle = "#2b3a44"; c.beginPath(); c.ellipse(-27, 0, 4, 10, 0, 0, TAU); c.fill();
  const bl = Math.cos(prop * 3); c.fillStyle = "rgba(200,220,230,.85)"; c.beginPath(); c.ellipse(-31, -5 * bl, 2.2, 6 * Math.abs(bl) + 1, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(-31, 5 * bl, 2.2, 6 * Math.abs(bl) + 1, 0, 0, TAU); c.fill();
  // tail fins
  c.fillStyle = "#d9771a"; c.beginPath(); c.moveTo(-18, -8); c.lineTo(-27, -16); c.lineTo(-24, -6); c.closePath(); c.fill(); c.beginPath(); c.moveTo(-18, 8); c.lineTo(-27, 15); c.lineTo(-24, 6); c.closePath(); c.fill();
  // skids
  c.strokeStyle = "#3b4b55"; c.lineWidth = 2; c.beginPath(); c.moveTo(-12, 11); c.lineTo(-10, 15); c.lineTo(12, 15); c.lineTo(14, 11); c.stroke();
  // hull
  const hg = c.createLinearGradient(0, -13, 0, 13); hg.addColorStop(0, "#ffe27a"); hg.addColorStop(.45, "#ffb52e"); hg.addColorStop(1, "#c86a0c");
  c.fillStyle = hg; c.beginPath(); c.moveTo(-22, -9); c.quadraticCurveTo(-24, 0, -22, 9); c.quadraticCurveTo(0, 15, 18, 10); c.quadraticCurveTo(28, 4, 27, -1); c.quadraticCurveTo(24, -11, 8, -12); c.quadraticCurveTo(-10, -13, -22, -9); c.fill();
  c.fillStyle = "rgba(255,255,255,.35)"; c.beginPath(); c.ellipse(-2, -8, 14, 2.4, -.05, 0, TAU); c.fill();
  c.fillStyle = "#1d6c8a"; c.fillRect(-20, 2, 34, 2.4);   // stripe
  c.fillStyle = "#7a3e06"; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(-14 + i * 7, 7, 1.2, 0, TAU); c.fill(); }
  // dome
  const dg = c.createRadialGradient(12, -7, 1, 13, -4, 11); dg.addColorStop(0, "#e8ffff"); dg.addColorStop(.35, "#6fd8f0"); dg.addColorStop(1, "#0b4a63");
  c.fillStyle = dg; c.beginPath(); c.arc(13, -3, 9.5, 0, TAU); c.fill(); c.strokeStyle = "#8a5208"; c.lineWidth = 1.6; c.stroke();
  c.fillStyle = "rgba(10,30,40,.75)"; c.beginPath(); c.arc(11, -2, 3, 0, TAU); c.fill(); c.fillRect(8.5, 0, 5, 4);   // pilot
  c.fillStyle = "rgba(255,255,255,.8)"; c.beginPath(); c.ellipse(16, -8, 3, 1.6, -.6, 0, TAU); c.fill();
  // lamp housing
  c.fillStyle = "#394852"; c.beginPath(); c.arc(25, 4, 3.6, 0, TAU); c.fill(); c.fillStyle = "#fff6c0"; c.beginPath(); c.arc(26, 4, 2, 0, TAU); c.fill();
  if (dmg > .3) { c.fillStyle = "rgba(40,20,10," + (dmg - .3) + ")"; c.beginPath(); c.ellipse(-8, 4, 6, 3, .4, 0, TAU); c.fill(); c.beginPath(); c.ellipse(4, -6, 4, 2, -.3, 0, TAU); c.fill();
    c.strokeStyle = "rgba(30,15,5," + (dmg - .2) + ")"; c.lineWidth = 1; c.beginPath(); c.moveTo(-4, -10); c.lineTo(-1, -4); c.lineTo(-5, 1); c.stroke(); }
  c.restore();
}
function drawJelly(c, x, y, s, t, ph, glowC) {
  const p = Math.sin(t * 2.4 + ph), bw = 17 * s * (1 + p * .12), bh = 13 * s * (1 - p * .1);
  c.save(); c.translate(x, y);
  c.strokeStyle = "rgba(255,150,220,.45)"; c.lineWidth = 1.2 * s;
  for (let i = 0; i < 5; i++) { const ox = (i - 2) * 5.5 * s; c.beginPath(); c.moveTo(ox, 0); for (let k = 1; k <= 6; k++) c.lineTo(ox + Math.sin(t * 2 + ph + k * .8 + i) * 3.5 * s, k * 7 * s); c.stroke(); }
  const g = c.createRadialGradient(0, -bh * .4, 1, 0, -bh * .2, bw); g.addColorStop(0, "rgba(255,220,250,.9)"); g.addColorStop(.6, "rgba(240,120,220,.55)"); g.addColorStop(1, "rgba(160,60,200,.25)");
  c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, bw, bh, 0, Math.PI, TAU); c.quadraticCurveTo(bw * .5, bh * .35, 0, bh * .2); c.quadraticCurveTo(-bw * .5, bh * .35, -bw, 0); c.fill();
  c.restore();
}
function drawAngler(c, x, y, s, face, t, chase) {
  c.save(); c.translate(x, y); c.scale(s * face, s);
  const mouth = chase ? .35 + Math.sin(t * 8) * .15 : .12;
  c.fillStyle = "#1b2a33"; c.beginPath(); c.moveTo(-26, -4); c.lineTo(-38, -14); c.lineTo(-36, 10); c.closePath(); c.fill();   // tail
  const g = c.createRadialGradient(-4, -8, 2, 0, 0, 26); g.addColorStop(0, "#3d5563"); g.addColorStop(1, "#111c22"); c.fillStyle = g;
  c.beginPath(); c.arc(0, 0, 22, mouth, TAU - mouth); c.lineTo(4, 0); c.closePath(); c.fill();
  c.fillStyle = "#e9f2f5"; for (let i = 0; i < 6; i++) { const a = mouth + (i / 5) * .02; const ang = -mouth - .05 + i * .02;
    c.beginPath(); c.moveTo(14 + i * 1.3, -6 + i * .2 - mouth * 12 + 6); c.lineTo(16 + i * 1.3, -1 - mouth * 8 + 4); c.lineTo(18 + i * 1.3, -6 - mouth * 12 + 6); c.fill(); c.beginPath(); c.moveTo(14 + i * 1.3, 6 + mouth * 12 - 6); c.lineTo(16 + i * 1.3, 1 + mouth * 8 - 4); c.lineTo(18 + i * 1.3, 6 + mouth * 12 - 6); c.fill(); }
  c.fillStyle = "#cfe7ee"; c.beginPath(); c.arc(6, -10, 3.4, 0, TAU); c.fill(); c.fillStyle = "#000"; c.beginPath(); c.arc(7, -10, 1.6, 0, TAU); c.fill();
  c.strokeStyle = "#2d3f48"; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, -20); c.quadraticCurveTo(14, -40 + Math.sin(t * 2) * 3, 26, -26 + Math.sin(t * 2.3) * 3); c.stroke();
  c.restore();
}
function anglerLure(x, y, s, face, t) { return [x + 26 * s * face, y + (-26 + Math.sin(t * 2.3) * 3) * s]; }
function drawFish(c, x, y, s, ang, col, t) {
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s);
  c.fillStyle = col; c.beginPath(); c.moveTo(7, 0); c.quadraticCurveTo(0, -4, -5, 0); c.quadraticCurveTo(0, 4, 7, 0); c.fill();
  const w = Math.sin(t * 14) * 1.5; c.beginPath(); c.moveTo(-4, 0); c.lineTo(-9, -3 + w); c.lineTo(-9, 3 + w); c.closePath(); c.fill();
  c.restore();
}
function drawTurtle(c, x, y, s, face, t) {
  c.save(); c.translate(x, y); c.scale(s * face, s); const f = Math.sin(t * 2.2);
  c.fillStyle = "#6f9a5a"; c.beginPath(); c.ellipse(4, -8 + f * 3, 14, 4, -.5 + f * .3, 0, TAU); c.fill(); c.beginPath(); c.ellipse(4, 8 - f * 3, 12, 3.5, .5 - f * .3, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(24, -1, 6, 4.5, 0, 0, TAU); c.fill();
  const g = c.createLinearGradient(0, -12, 0, 12); g.addColorStop(0, "#8a7a3a"); g.addColorStop(1, "#4c4220"); c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, 20, 12, 0, 0, TAU); c.fill();
  c.strokeStyle = "rgba(40,30,10,.6)"; c.lineWidth = 1; for (const [a, b] of [[-8, -6], [4, -7], [-2, 4], [10, 3]]) { c.beginPath(); c.arc(a, b, 4, 0, TAU); c.stroke(); }
  c.fillStyle = "#111"; c.beginPath(); c.arc(26, -2, 1, 0, TAU); c.fill(); c.restore();
}
function drawFrag(c, x, y, s, t) {
  c.save(); c.translate(x, y); c.rotate(Math.sin(t * 1.3) * .3); c.scale(s, s);
  c.fillStyle = "#2a2f36"; c.strokeStyle = "#ffb547"; c.lineWidth = 2;
  c.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; c.lineTo(Math.cos(a) * 11, Math.sin(a) * 11); } c.closePath(); c.fill(); c.stroke();
  c.fillStyle = "#ff8a1f"; c.fillRect(-6, -2, 12, 4); c.fillStyle = (t * 2 % 1) < .5 ? "#fff3c4" : "#ff6a00"; c.beginPath(); c.arc(0, -6, 2, 0, TAU); c.fill();
  c.restore();
}
function drawProbe(c, x, y, s, t, wreck) {
  c.save(); c.translate(x, y); c.rotate(wreck ? .32 : Math.sin(t * .8) * .05); c.scale(s, s);
  c.strokeStyle = "#8a99a3"; c.lineWidth = 2; c.beginPath(); c.moveTo(-6, -30); c.lineTo(-10, -52); c.moveTo(6, -30); c.lineTo(14, -48); c.stroke();
  c.fillStyle = "#c9d3da"; c.beginPath(); c.arc(14, -50, 3, 0, TAU); c.fill();
  const g = c.createLinearGradient(-22, 0, 22, 0); g.addColorStop(0, "#7f8d96"); g.addColorStop(.4, "#eef3f6"); g.addColorStop(1, "#6d7a83");
  c.fillStyle = g; c.beginPath(); c.moveTo(-22, -30); c.lineTo(22, -30); c.lineTo(22, 22); c.quadraticCurveTo(0, 36, -22, 22); c.closePath(); c.fill();
  c.fillStyle = "#e46a1a"; c.fillRect(-22, -12, 44, 7); c.fillStyle = "#33424c"; c.beginPath(); c.arc(0, 8, 8, 0, TAU); c.fill();
  c.fillStyle = "#1c272e"; c.font = "bold 7px system-ui"; c.textAlign = "center"; c.fillText("VARUNA-1", 0, -18);
  c.strokeStyle = "#56656e"; c.lineWidth = 3; c.beginPath(); c.moveTo(-22, 18); c.lineTo(-34, 32); c.moveTo(22, 18); c.lineTo(34, 32); c.stroke();
  if (wreck) { c.strokeStyle = "rgba(20,30,35,.8)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-10, -30); c.lineTo(-4, -16); c.lineTo(-12, -4); c.stroke(); c.fillStyle = "rgba(60,80,60,.5)"; c.beginPath(); c.ellipse(-8, 20, 16, 5, 0, 0, TAU); c.fill(); }
  c.restore();
}
function drawJyoti(c, x, y, s, face, t, a = 1) {
  c.save(); c.translate(x, y); c.scale(s * face, s); c.globalAlpha = a;
  const f = Math.sin(t * 1.4) * 22;
  const g = c.createRadialGradient(10, 0, 4, 0, 0, 120); g.addColorStop(0, "rgba(190,250,255,.85)"); g.addColorStop(.35, "rgba(90,200,255,.55)"); g.addColorStop(1, "rgba(120,80,255,.08)");
  c.fillStyle = g; c.beginPath();
  c.moveTo(70, 0); c.quadraticCurveTo(40, -18, 10, -26); c.quadraticCurveTo(-20, -60 - f, -55, -95 - f * 1.4); c.quadraticCurveTo(-40, -40 - f * .5, -45, -12);
  c.quadraticCurveTo(-90, -4, -150, Math.sin(t * 1.1) * 10); c.quadraticCurveTo(-90, 6, -45, 12); c.quadraticCurveTo(-40, 40 + f * .5, -55, 95 + f * 1.4); c.quadraticCurveTo(-20, 60 + f, 10, 26); c.quadraticCurveTo(40, 18, 70, 0); c.fill();
  c.globalCompositeOperation = "lighter";
  for (let i = 0; i < 16; i++) { const k = i / 15, px = 50 - k * 100, py = (i % 2 ? 1 : -1) * (12 + Math.sin(k * Math.PI) * 50 * (1 + f / 60)); const pulse = .5 + .5 * Math.sin(t * 2.7 - k * 5);
    glow(c, px, py, 9 + pulse * 6, "rgba(160,255,255,1)", .5 + pulse * .5); }
  glow(c, 44, -6, 12, "rgba(255,255,255,1)", .9); glow(c, 0, 0, 90, "rgba(80,190,255,1)", .35);
  c.restore();
}
function drawWhaleSil(c, x, y, s, t, a) {   // title whale: dark silhouette with bioluminescent dots
  c.save(); c.translate(x, y); c.scale(s, s); const tail = Math.sin(t * .9) * 14;
  c.fillStyle = "rgba(2,12,24," + a + ")"; c.beginPath();
  c.moveTo(220, 0); c.quadraticCurveTo(210, -40, 120, -50); c.quadraticCurveTo(0, -58, -120, -30); c.quadraticCurveTo(-200, -12, -250, -4 + tail);
  c.lineTo(-300, -40 + tail * 1.6); c.quadraticCurveTo(-280, 0 + tail, -300, 40 + tail * 1.6); c.lineTo(-250, 6 + tail); c.quadraticCurveTo(-180, 26, -60, 40);
  c.quadraticCurveTo(40, 52, 120, 40); c.quadraticCurveTo(200, 30, 220, 0); c.fill();
  c.beginPath(); c.moveTo(60, 36); c.quadraticCurveTo(20, 110 + tail, -40, 130 + tail); c.quadraticCurveTo(10, 80, 20, 40); c.fill();
  c.globalCompositeOperation = "lighter";
  const pts = [[200, -18], [150, -42], [90, -52], [30, -55], [-30, -48], [-90, -36], [-150, -22], [-210, -10], [-260, -20 + tail], [190, 16], [130, 38], [70, 46], [10, 46], [-50, 40], [-110, 28], [-170, 16], [-30, 110 + tail * .8], [10, 80], [140, -10], [60, -20], [-20, -15], [-100, -8]];
  pts.forEach((p, i) => glow(c, p[0], p[1], 12 + 5 * Math.sin(t * 2 + i), i % 3 ? "rgba(90,230,255,1)" : "rgba(150,140,255,1)", (.65 + .35 * Math.sin(t * 1.6 + i * .7)) * a));
  c.strokeStyle = "rgba(90,220,255," + (.25 * a) + ")"; c.lineWidth = 2; c.beginPath(); c.moveTo(220, 0); c.quadraticCurveTo(210, -40, 120, -50); c.quadraticCurveTo(0, -58, -120, -30); c.quadraticCurveTo(-200, -12, -250, -4 + tail); c.stroke();
  c.restore();
}
function kelp(c, x, y, h, t, ph, col) {
  c.strokeStyle = col; c.lineWidth = 5; c.lineCap = "round"; c.beginPath(); c.moveTo(x, y);
  const sw = Math.sin(t * .8 + ph) * h * .12, sw2 = Math.sin(t * 1.1 + ph + 1) * h * .1;
  c.bezierCurveTo(x + sw2, y - h * .35, x - sw2 + sw * .5, y - h * .7, x + sw, y - h); c.stroke();
  c.fillStyle = col; for (let k = 1; k < 6; k++) { const q = k / 6, px = x + sw * q * q + sw2 * Math.sin(q * 3) * .4, py = y - h * q; c.beginPath(); c.ellipse(px + 6, py, 7, 2.6, -.5 + Math.sin(t + k) * .2, 0, TAU); c.fill(); c.beginPath(); c.ellipse(px - 6, py - 6, 7, 2.6, .5 + Math.sin(t + k) * .2, 0, TAU); c.fill(); }
}

/* ---------- dive rendering ---------- */
const snow = []; for (let i = 0; i < 90; i++) snow.push({ x: Math.random(), y: Math.random(), z: .3 + Math.random() * .9, s: Math.random() * 6 });
let cracks = null;
function makeCracks() { cracks = []; const R = rng(42); for (let k = 0; k < 7; k++) { const sx = R() < .5 ? 0 : 1, sy = R(); let x = sx, y = sy; const pts = [[x, y]]; for (let i = 0; i < 6; i++) { x += (sx ? -1 : 1) * (.03 + R() * .06); y += (R() - .5) * .08; pts.push([x, y]); } cracks.push(pts); } }
function render(dt) {
  if (G.mode === "title" || G.mode === "levels" || G.mode === "shop" || G.mode === "how" || G.mode === "story" || G.mode === "boot") return renderTitle(dt);
  if (G.mode === "cine") return renderCine(dt);
  if (!G.L) return;
  renderDive(dt);
}
function renderDive(dt) {
  const L = G.L, s = G.s, D = L.D, cam = G.cam;
  let z = cam.z * (G.mode === "won" ? 1 + smooth(G.wonT / 1.5) * .25 : 1);
  const lx = s.vx * .35, ly = s.vy * .3;
  cam.x = lerp(cam.x, s.x + lx, 1 - Math.exp(-dt * 3.2)); cam.y = lerp(cam.y, s.y + ly + 30, 1 - Math.exp(-dt * 3.2));
  const shx = (Math.random() - .5) * G.shake, shy = (Math.random() - .5) * G.shake;
  const ox = cw / 2 - cam.x * z + shx, oy = ch / 2 - cam.y * z + shy;
  const vx0 = (0 - ox) / z, vx1 = (cw - ox) / z, vy0 = (0 - oy) / z, vy1 = (ch - oy) / z;
  const dTop = L.depthAt(vy0), dBot = L.depthAt(vy1), dMid = L.depthAt(cam.y);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // water background
  const wt = waterAt(dTop), wb = waterAt(dBot), bg = ctx.createLinearGradient(0, 0, 0, ch); bg.addColorStop(0, rgb(wt)); bg.addColorStop(1, rgb(wb));
  ctx.fillStyle = bg; ctx.fillRect(0, 0, cw, ch);
  // far silhouettes (parallax)
  const farC = mixC(wb, [0, 0, 0], .35);
  ctx.fillStyle = rgb(farC, .75);
  for (const f of L.far) { const px = (f.x - cam.x * .4) * z * .6 + cw / 2, base = ch + 40 - (cam.y - L.mBot) * .05; if (px < -200 || px > cw + 200) continue;
    ctx.beginPath(); ctx.moveTo(px - f.w * z, base); ctx.quadraticCurveTo(px - f.w * .2 * z, base - f.h * z * .55, px, base - f.h * z * .6); ctx.quadraticCurveTo(px + f.w * .3 * z, base - f.h * z * .45, px + f.w * z, base); ctx.fill(); }
  if (D.song) { const gx = cw * .5 + Math.sin(G.t * .05) * cw * .3 - (cam.x * .05) % cw, gy = ch * .35; drawJyoti(ctx, gx, gy, .5 * z, 1, G.t * .6, L.jyoti ? .08 : .2); }
  // god rays
  if (D.rays && dMid < 520) { const a = (1 - dMid / 520) * .2; ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 7; i++) { const bx = ((i * 173 - cam.x * .15 * z) % (cw + 300) + cw + 300) % (cw + 300) - 150, w = 40 + (i * 37 % 70), sw = Math.sin(G.t * .3 + i) * 40;
      const g = ctx.createLinearGradient(0, 0, 0, ch * .9); g.addColorStop(0, "rgba(200,255,255," + a + ")"); g.addColorStop(1, "rgba(200,255,255,0)"); ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(bx, -10); ctx.lineTo(bx + w, -10); ctx.lineTo(bx + w * 2.2 + sw + 160, ch * .9); ctx.lineTo(bx + sw + 160, ch * .9); ctx.fill(); }
    ctx.globalCompositeOperation = "source-over"; }
  // marine snow (back layer)
  const snowN = G.lowFx ? 40 : 90, sc = rgb(mixC(wt, [255, 255, 255], .55), .5);
  ctx.fillStyle = sc;
  for (let i = 0; i < snowN; i++) { const p = snow[i]; p.y += dt * .012 * p.z; const px = ((p.x * (cw + 40) - cam.x * z * p.z * .5) % (cw + 40) + cw + 40) % (cw + 40) - 20, py = ((p.y * (ch + 40) - cam.y * z * p.z * .5) % (ch + 40) + ch + 40) % (ch + 40) - 20;
    ctx.fillRect(px + Math.sin(G.t + p.s) * 3, py, p.z * 1.6, p.z * 1.6); }
  // rock layer
  const [rcol, rim] = rockAt(dMid);
  rctx.setTransform(1, 0, 0, 1, 0, 0); rctx.globalCompositeOperation = "source-over"; rctx.clearRect(0, 0, rc.width, rc.height);
  rctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * ox, dpr * oy);
  rctx.fillStyle = rockPat; rctx.fillRect(vx0 - 10, vy0 - 10, vx1 - vx0 + 20, vy1 - vy0 + 20);
  rctx.fillStyle = rgb(mixC(rcol, [0, 0, 0], .18), .62); rctx.fillRect(vx0 - 10, vy0 - 10, vx1 - vx0 + 20, vy1 - vy0 + 20);
  const vis = [];
  for (let i = 0; i < L.N; i++) { const r = L.SR[i] + 12; if (L.SX[i] + r < vx0 || L.SX[i] - r > vx1 || L.SY[i] + r < vy0 || L.SY[i] - r > vy1) continue; vis.push(i); }
  rctx.fillStyle = rgb(mixC(rcol, rim, .15), .5); rctx.beginPath(); for (const i of vis) { rctx.moveTo(L.SX[i] + L.SR[i] + 46, L.SY[i]); rctx.arc(L.SX[i], L.SY[i], L.SR[i] + 46, 0, TAU); } rctx.fill();
  rctx.fillStyle = rgb(mixC(rcol, rim, .35), .6); rctx.beginPath(); for (const i of vis) { rctx.moveTo(L.SX[i] + L.SR[i] + 22, L.SY[i]); rctx.arc(L.SX[i], L.SY[i], L.SR[i] + 22, 0, TAU); } rctx.fill();
  rctx.fillStyle = rgb(rim, .9); rctx.beginPath(); for (const i of vis) { rctx.moveTo(L.SX[i] + L.SR[i] + 9, L.SY[i]); rctx.arc(L.SX[i], L.SY[i], L.SR[i] + 9, 0, TAU); } rctx.fill();
  rctx.fillStyle = rgb(mixC(rim, rcol, .5), .9); rctx.beginPath(); for (const i of vis) { rctx.moveTo(L.SX[i] + L.SR[i] + 4, L.SY[i]); rctx.arc(L.SX[i], L.SY[i], L.SR[i] + 4, 0, TAU); } rctx.fill();
  rctx.globalCompositeOperation = "destination-out"; rctx.fillStyle = "#000"; rctx.beginPath(); for (const i of vis) { rctx.moveTo(L.SX[i] + L.SR[i], L.SY[i]); rctx.arc(L.SX[i], L.SY[i], L.SR[i], 0, TAU); } rctx.fill();
  rctx.globalCompositeOperation = "source-over";
  for (const b of L.boulders) { if (b.x + b.r < vx0 || b.x - b.r > vx1 || b.y + b.r < vy0 || b.y - b.r > vy1) continue; if (b.kind !== "rock") continue;
    rctx.beginPath(); b.v.forEach((p, k) => k ? rctx.lineTo(b.x + p[0], b.y + p[1]) : rctx.moveTo(b.x + p[0], b.y + p[1])); rctx.closePath();
    rctx.fillStyle = rockPat; rctx.fill(); rctx.fillStyle = rgb(rcol, .7); rctx.fill(); rctx.strokeStyle = rgb(rim, .9); rctx.lineWidth = 4; rctx.stroke(); }
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(rc, 0, 0);
  // ---- world objects (non-luminous) ----
  ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * ox, dpr * oy);
  const inV = (x, y, m = 80) => x > vx0 - m && x < vx1 + m && y > vy0 - m && y < vy1 + m;
  for (const d of L.decor) { if (!inV(d.x, d.y, d.h + 20)) continue;
    if (d.type === "kelp") kelp(ctx, d.x, d.y, d.h, G.t, d.ph, rgb(mixC([70, 120, 40], rcol, .25)));
    else if (d.type === "coral") { ctx.strokeStyle = ["#ff7a8a", "#ff9f4a", "#e86ad8", "#ffd166"][d.hue * 4 | 0]; ctx.lineWidth = 4; ctx.lineCap = "round"; const h = d.h; ctx.beginPath();
      ctx.moveTo(d.x, d.y); ctx.lineTo(d.x, d.y - h * .5); ctx.lineTo(d.x - h * .35, d.y - h); ctx.moveTo(d.x, d.y - h * .5); ctx.lineTo(d.x + h * .3, d.y - h * .9); ctx.moveTo(d.x, d.y - h * .3); ctx.lineTo(d.x + h * .4, d.y - h * .45); ctx.stroke(); }
    else if (d.type === "fan") { ctx.fillStyle = ["rgba(200,90,200,.75)", "rgba(255,140,90,.7)", "rgba(240,200,90,.7)"][d.hue * 3 | 0]; ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.arc(d.x, d.y, d.h * .9, -Math.PI * .85 + Math.sin(G.t + d.ph) * .05, -Math.PI * .15 + Math.sin(G.t + d.ph) * .05); ctx.closePath(); ctx.fill(); }
    else if (d.type === "worm") { for (let k = 0; k < 4; k++) { const x = d.x + (k - 1.5) * 6; ctx.strokeStyle = "#e9e1d0"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, d.y); ctx.lineTo(x + Math.sin(G.t + k) * 2, d.y - d.h * (.6 + k * .12)); ctx.stroke(); ctx.fillStyle = "#e3324a"; ctx.beginPath(); ctx.arc(x + Math.sin(G.t + k) * 2, d.y - d.h * (.6 + k * .12), 3.2, 0, TAU); ctx.fill(); } }
    else if (d.type === "sponge") { ctx.fillStyle = "#c9a14a"; ctx.beginPath(); ctx.ellipse(d.x, d.y - d.h * .4, 8, d.h * .45, 0, 0, TAU); ctx.fill(); ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.beginPath(); ctx.ellipse(d.x, d.y - d.h * .8, 4, 2, 0, 0, TAU); ctx.fill(); }
    else if (d.type === "crinoid") { ctx.strokeStyle = "#b3a7d8"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x, d.y - d.h); for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * .35 + Math.sin(G.t * 1.3 + d.ph) * .1; ctx.moveTo(d.x, d.y - d.h); ctx.lineTo(d.x + Math.cos(a) * 14, d.y - d.h + Math.sin(a) * 14); } ctx.stroke(); }
    else if (d.type === "cucumber") { ctx.fillStyle = "#a35a6a"; ctx.beginPath(); ctx.ellipse(d.x, d.y - 4, 12, 5, Math.sin(G.t * .3 + d.ph) * .1, 0, TAU); ctx.fill(); }
  }
  if (L.whale) { ctx.strokeStyle = "#d8cfb8"; ctx.lineCap = "round";
    ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(L.whale.x - 330, L.whale.y); ctx.lineTo(L.whale.x + 260, L.whale.y + 4); ctx.stroke();
    ctx.lineWidth = 7; for (const rib of L.whale.ribs) { ctx.beginPath(); rib.forEach((p, k) => k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); }
    ctx.fillStyle = "#d8cfb8"; ctx.beginPath(); ctx.ellipse(L.whale.x + 300, L.whale.y - 18, 70, 26, -.12, 0, TAU); ctx.fill(); ctx.fillStyle = "rgba(20,20,20,.6)"; ctx.beginPath(); ctx.arc(L.whale.x + 285, L.whale.y - 26, 7, 0, TAU); ctx.fill();
    for (let k = 0; k < 14; k++) { const x = L.whale.x - 320 + k * 46; ctx.fillStyle = "#c8bea6"; ctx.beginPath(); ctx.ellipse(x, L.whale.y, 9, 7, 0, 0, TAU); ctx.fill(); } }
  if (L.varuna) drawProbe(ctx, L.varuna.x, L.varuna.y - 6, 1.4, G.t, true);
  for (const p of L.plumes) { if (!inV(p.x, p.y, 200)) continue; ctx.fillStyle = "#14100e"; ctx.beginPath(); ctx.moveTo(p.x - 26, p.y + 6); ctx.lineTo(p.x - 9, p.y - 34); ctx.lineTo(p.x + 9, p.y - 34); ctx.lineTo(p.x + 26, p.y + 6); ctx.fill();
    ctx.fillStyle = "#2a1d16"; ctx.beginPath(); ctx.ellipse(p.x, p.y - 34, 10, 4, 0, 0, TAU); ctx.fill(); }
  for (const v of L.vents) { if (!inV(v.x, v.y)) continue; ctx.fillStyle = rgb(mixC(rcol, [0, 0, 0], .4)); ctx.beginPath(); ctx.ellipse(v.x, v.y + 2, 16, 6, 0, 0, TAU); ctx.fill(); }
  for (const c of L.cps) { if (!inV(c.x, c.y)) continue; const by = c.y + Math.sin(G.t * 1.5 + c.x) * 4; ctx.strokeStyle = "#556"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(c.x, by + 14); ctx.lineTo(c.x, snapDown(L, c.x, c.y)); ctx.stroke();
    ctx.fillStyle = c.on ? "#2fd47a" : "#dfe8ee"; ctx.beginPath(); ctx.arc(c.x, by, 13, 0, TAU); ctx.fill(); ctx.fillStyle = "#33424c"; ctx.fillRect(c.x - 13, by - 2, 26, 4); }
  { const e = L.exit, by = e.y + Math.sin(G.t * 1.2) * 3; ctx.fillStyle = "#2b3942"; ctx.fillRect(e.x - 5, by - 34, 10, 50); ctx.fillStyle = "#cfe9f2"; ctx.beginPath(); ctx.arc(e.x, by - 38, 9, 0, TAU); ctx.fill(); ctx.fillStyle = "#e46a1a"; ctx.fillRect(e.x - 14, by + 10, 28, 9); }
  for (const t of L.turtles) if (inV(t.x, t.y)) drawTurtle(ctx, t.x, t.y, 1.1, Math.sign(t.vx), G.t + t.ph);
  for (const scn of L.fish) { if (!inV(scn.x, scn.y, 150)) continue; const col = scn.col ? "rgba(140,200,230,.8)" : "#d8e8f0";
    for (const f of scn.f) drawFish(ctx, f.x, f.y, .9, Math.atan2(f.vy, f.vx), col, G.t + f.x * .01); }
  for (const e of L.eels) { if (!inV(e.ax, e.ay, 140)) continue; const len = 12 + 118 * e.ext; ctx.strokeStyle = "#1e3340"; ctx.lineWidth = 9; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(e.ax, e.ay);
    const px = -e.ny, py = e.nx; for (let k = 1; k <= 8; k++) { const q = k / 8, w = Math.sin(G.t * 9 + q * 6) * 6 * q * e.ext; ctx.lineTo(e.ax + e.nx * len * q + px * w, e.ay + e.ny * len * q + py * w); } ctx.stroke();
    const hx = e.ax + e.nx * len, hy = e.ay + e.ny * len; ctx.fillStyle = "#24404f"; ctx.beginPath(); ctx.arc(hx, hy, 6.5, 0, TAU); ctx.fill(); ctx.fillStyle = e.st ? "#bff" : "#9ab"; ctx.beginPath(); ctx.arc(hx + px * 2.5, hy + py * 2.5, 1.6, 0, TAU); ctx.fill();
    ctx.fillStyle = "#0b161c"; ctx.beginPath(); ctx.arc(e.ax, e.ay, 11, 0, TAU); ctx.fill(); }
  for (const a of L.anglers) if (inV(a.x, a.y)) drawAngler(ctx, a.x, a.y, 1, a.face, G.t + a.ph, a.st === "chase");
  for (const f of L.falls) for (const r of f.rocks) { if (r.life <= 0) continue; ctx.save(); ctx.globalAlpha = clamp(r.life, 0, 1); ctx.translate(r.x, r.y); ctx.rotate(r.rot); ctx.fillStyle = rgb(rim); ctx.beginPath(); for (let k = 0; k < 7; k++) { const a = k / 7 * TAU, rr = r.r * (.8 + (k * 37 % 5) / 12); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.fill(); ctx.restore(); }
  for (const j of L.jellies) if (inV(j.x, j.y)) drawJelly(ctx, j.x, j.y, 1, G.t, j.ph);
  // the sub
  if (!((G.mode === "dying" && G.dieT > .25) || G.mode === "fail") || G.failReason !== "hull") drawSub(ctx, s.x, s.y, 1.15, Math.sign(s.fs) || 1, s.tilt, s.prop, G.t, 1 - s.hull / s.hullMax);
  // particles (non-glow)
  for (const p of G.parts) { if (p.type === "glow" || p.type === "glowg" || p.type === "glowj" || p.type === "zap" || p.type === "spark") continue; const a = clamp(p.life / p.max, 0, 1);
    if (p.type === "bubble") { ctx.strokeStyle = "rgba(220,250,255," + (a * .8) + ")"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.stroke(); }
    else if (p.type === "smoke") { ctx.fillStyle = "rgba(25,20,22," + (a * .55) + ")"; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill(); }
    else if (p.type === "dust") { ctx.fillStyle = rgb(rim, a * .7); ctx.fillRect(p.x, p.y, p.size, p.size); } }
  // ---- darkness ----
  const dark = G.dark || 0, lamp = upg("lamp"), coneL = 320 * (1 + .18 * lamp), ang = (s.fs >= 0 ? 0 : Math.PI) + s.tilt * (s.fs >= 0 ? 1 : -1);
  if (dark > .02) {
    dctx.setTransform(1, 0, 0, 1, 0, 0); dctx.globalCompositeOperation = "source-over"; dctx.clearRect(0, 0, dk.width, dk.height);
    dctx.fillStyle = "rgba(0,3,9," + dark + ")"; dctx.fillRect(0, 0, dk.width, dk.height);
    dctx.setTransform(dq * z, 0, 0, dq * z, dq * ox, dq * oy); dctx.globalCompositeOperation = "destination-out";
    const hole = (x, y, r, a) => { if (!inV(x, y, r)) return; const g = dctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, "rgba(0,0,0," + a + ")"); g.addColorStop(1, "rgba(0,0,0,0)"); dctx.fillStyle = g; dctx.beginPath(); dctx.arc(x, y, r, 0, TAU); dctx.fill(); };
    hole(s.x, s.y, s.light ? 130 : 105, s.light ? .85 : .6);
    if (s.light) { const g = dctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, coneL); g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(.55, "rgba(0,0,0,.85)"); g.addColorStop(1, "rgba(0,0,0,0)");
      dctx.fillStyle = g; dctx.beginPath(); dctx.moveTo(s.x, s.y); dctx.arc(s.x, s.y, coneL, ang - .46, ang + .46); dctx.closePath(); dctx.fill(); }
    for (const p of L.plank) { const pul = .6 + .4 * Math.sin(G.t * TAU / 7 + p.x * .001); hole(p.x, p.y, 170, .75 * pul); }
    for (const f of L.frags) if (!f.got) hole(f.x, f.y, 95, .7);
    for (const v of L.vents) hole(v.x, v.y - 40, 90, .45);
    for (const c of L.cps) hole(c.x, c.y, c.on ? 120 : 80, .6);
    hole(L.exit.x, L.exit.y - 40, 230, .8);
    for (const a of L.anglers) { const [lx2, ly2] = anglerLure(a.x, a.y, 1, a.face, G.t + a.ph); hole(lx2, ly2, 70, .65); }
    for (const j of L.jellies) hole(j.x, j.y, 60, .45);
    for (const p of L.plumes) hole(p.x, p.y - 40, 110, p.on ? .55 : .3);
    for (const e of L.eels) if (e.st) hole(e.ax + e.nx * 60 * e.ext, e.ay + e.ny * 60 * e.ext, 80, .45);
    if (L.whale) hole(L.whale.x, L.whale.y - 60, 260, .35);
    if (L.varuna) hole(L.varuna.x, L.varuna.y, 120, .35 + .25 * (Math.sin(G.t * 3) > .6));
    if (L.jyoti) hole(L.jyoti.x, L.jyoti.y, 380, .9);
    for (const sn of G.sonars) { const R = Math.min(760, sn.t * 720); if (sn.t < 1.2) { dctx.strokeStyle = "rgba(0,0,0," + (.35 * (1 - sn.t / 1.2)) + ")"; dctx.lineWidth = 40; dctx.beginPath(); dctx.arc(sn.x, sn.y, R, 0, TAU); dctx.stroke(); } }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(dk, 0, 0, cv.width, cv.height);
    ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * ox, dpr * oy);
  }
  // ---- luminous layer ----
  ctx.globalCompositeOperation = "lighter";
  if (s.light && G.mode !== "dying") { const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, coneL); g.addColorStop(0, "rgba(255,245,200," + (.22 + lamp * .03) + ")"); g.addColorStop(1, "rgba(255,245,200,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(s.x + Math.cos(ang) * 24, s.y + Math.sin(ang) * 24); ctx.arc(s.x, s.y, coneL, ang - .42, ang + .42); ctx.closePath(); ctx.fill();
    glow(ctx, s.x + Math.cos(ang) * 26, s.y + Math.sin(ang) * 26 + 4, 22, "rgba(255,250,210,1)", .9); }
  if (G.mode !== "dying") { glow(ctx, s.x - s.fs * 4, s.y - 14, 6, (G.t % 1.2) < .15 ? "rgba(255,80,80,1)" : "rgba(255,80,80,.0)", 1); glow(ctx, s.x, s.y, 50, "rgba(120,220,255,1)", dark * .12); }
  for (const p of L.plank) { if (!inV(p.x, p.y, 120)) continue; const base = G.t * TAU / 7 + p.x * .001;
    for (const q of p.pts) { const pul = .5 + .5 * Math.sin(base + q[2]); glow(ctx, p.x + q[0] + Math.sin(G.t * q[3] + q[2]) * 8, p.y + q[1] + Math.cos(G.t * q[3] * .8 + q[2]) * 6, 5 + pul * 4, "rgba(90,255,220,1)", .25 + pul * .6); } }
  for (const p of L.pearls) { if (p.got || !inV(p.x, p.y)) continue; const by = p.y + Math.sin(G.t * 2 + p.ph) * 3; glow(ctx, p.x, by, 16, "rgba(220,215,255,1)", .5 + Math.max(.2, dark) * .4); ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.beginPath(); ctx.arc(p.x, by, 4.2, 0, TAU); ctx.fill(); }
  for (const f of L.frags) { if (f.got || !inV(f.x, f.y, 100)) continue; const pu = .6 + .4 * Math.sin(G.t * 4 + f.i);
    glow(ctx, f.x, f.y, 46 + pu * 14, "rgba(255,170,60,1)", .75); ctx.globalCompositeOperation = "source-over"; drawFrag(ctx, f.x, f.y, 1.2, G.t + f.i); ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = "rgba(255,190,90," + (.6 * (1 - (G.t % 1.5) / 1.5)) + ")"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, f.y, 16 + (G.t % 1.5) * 26, 0, TAU); ctx.stroke(); }
  { const e = L.exit, by = e.y + Math.sin(G.t * 1.2) * 3, pu = .6 + .4 * Math.sin(G.t * 3); const g = ctx.createLinearGradient(0, by - 600, 0, by - 30); g.addColorStop(0, "rgba(90,230,255,0)"); g.addColorStop(1, "rgba(90,230,255," + (.28 * pu) + ")");
    ctx.fillStyle = g; ctx.fillRect(e.x - 22, by - 600, 44, 570); glow(ctx, e.x, by - 38, 40 + pu * 20, "rgba(110,240,255,1)", 1);
    for (let k = 0; k < 3; k++) { const q = ((G.t * .6 + k / 3) % 1); ctx.strokeStyle = "rgba(110,240,255," + (1 - q) * .6 + ")"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(e.x, by - 38, 14 + q * 60, (14 + q * 60) * .35, 0, 0, TAU); ctx.stroke(); } }
  for (const c of L.cps) { if (!inV(c.x, c.y)) continue; glow(ctx, c.x, c.y - 14 + Math.sin(G.t * 1.5 + c.x) * 4, c.on ? 26 : 14, c.on ? "rgba(80,255,150,1)" : "rgba(255,255,255,1)", c.on ? .8 : (G.t % 1 < .5 ? .7 : .2)); }
  for (const v of L.vents) if (inV(v.x, v.y)) glow(ctx, v.x, v.y - 6, 30, "rgba(160,240,255,1)", .35);
  for (const a of L.anglers) { if (!inV(a.x, a.y)) continue; const [lx2, ly2] = anglerLure(a.x, a.y, 1, a.face, G.t + a.ph); glow(ctx, lx2, ly2, 18 + Math.sin(G.t * 5) * 3, a.st === "chase" ? "rgba(255,120,90,1)" : "rgba(120,255,200,1)", .95); }
  for (const j of L.jellies) if (inV(j.x, j.y)) glow(ctx, j.x, j.y - 4, 34, "rgba(255,120,230,1)", .35 + .25 * Math.sin(G.t * 2.4 + j.ph));
  for (const e of L.eels) { if (!e.st || !inV(e.ax, e.ay, 140)) continue; const len = 12 + 118 * e.ext;
    for (let k = 0; k < 5; k++) { const q = Math.random(); glow(ctx, e.ax + e.nx * len * q + rnd(-8, 8), e.ay + e.ny * len * q + rnd(-8, 8), rnd(8, 20), "rgba(130,210,255,1)", e.st === 1 ? .5 : .9); }
    if (e.st === 2) { ctx.strokeStyle = "rgba(200,240,255,.9)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(e.ax, e.ay); for (let k = 1; k <= 6; k++) ctx.lineTo(e.ax + e.nx * len * k / 6 + rnd(-10, 10), e.ay + e.ny * len * k / 6 + rnd(-10, 10)); ctx.stroke(); } }
  for (const p of L.plumes) { if (!inV(p.x, p.y, 220)) continue; glow(ctx, p.x, p.y - 36, 26 + (p.on ? 10 : 0), "rgba(255,120,40,1)", p.on ? .9 : p.warn ? .7 : .35);
    if (p.on) { const g = ctx.createLinearGradient(0, p.y - p.h, 0, p.y - 30); g.addColorStop(0, "rgba(255,90,30,0)"); g.addColorStop(1, "rgba(255,110,40,.35)"); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(p.x - 9, p.y - 34); ctx.lineTo(p.x - 24 - p.h * .12, p.y - p.h); ctx.lineTo(p.x + 24 + p.h * .12, p.y - p.h); ctx.lineTo(p.x + 9, p.y - 34); ctx.fill(); } }
  if (L.whale) for (let k = 0; k < 10; k++) glow(ctx, L.whale.x - 300 + k * 60 + Math.sin(G.t + k) * 6, L.whale.y - 10 - (k * 23 % 60), 8, "rgba(120,255,210,1)", .4 + .3 * Math.sin(G.t * 2 + k));
  if (L.varuna) glow(ctx, L.varuna.x + 18, L.varuna.y - 70, 10, "rgba(255,60,60,1)", Math.sin(G.t * 3) > .6 ? .9 : .1);
  if (L.jyoti) { ctx.globalCompositeOperation = "source-over"; const J = L.jyoti; drawJyoti(ctx, J.x, J.y, .85, J.face, J.ph, J.free ? 1 : .7); ctx.globalCompositeOperation = "lighter";
    if (!J.free) { for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; ctx.fillStyle = "rgba(60,70,80,.0)"; } }
    // colony glow at the exit
    for (let k = 0; k < 12; k++) { const a = k / 12 * TAU + G.t * .1; glow(ctx, L.exit.x + Math.cos(a) * 120, L.exit.y + 40 + Math.sin(a) * 40, 30, "rgba(120,230,255,1)", .3 + .3 * Math.sin(G.t * 2 + k)); } }
  for (const p of G.parts) { const a = clamp(p.life / p.max, 0, 1);
    if (p.type === "glow") glow(ctx, p.x, p.y, p.size * 4, "rgba(255,200,120,1)", a);
    else if (p.type === "glowg") glow(ctx, p.x, p.y, p.size * 4, "rgba(90,255,160,1)", a);
    else if (p.type === "glowj") glow(ctx, p.x, p.y, p.size * 5, "rgba(140,240,255,1)", a * .8);
    else if (p.type === "spark") { ctx.fillStyle = "rgba(255," + (180 + a * 70 | 0) + ",120," + a + ")"; ctx.fillRect(p.x, p.y, 2.4, 2.4); }
    else if (p.type === "zap") glow(ctx, p.x, p.y, 8, "rgba(140,220,255,1)", a); }
  // sonar point cloud
  for (const sn of G.sonars) {
    const R = Math.min(760, sn.t * 720);
    if (sn.t < 1.15) { ctx.strokeStyle = "rgba(95,227,255," + (.7 * (1 - sn.t / 1.15)) + ")"; ctx.lineWidth = 3 / z; ctx.beginPath(); ctx.arc(sn.x, sn.y, R, 0, TAU); ctx.stroke(); }
    const buckets = [[], [], [], [], []];
    const cx0 = Math.floor(vx0 / L.rimCell), cx1 = Math.floor(vx1 / L.rimCell), cy0 = Math.floor(vy0 / L.rimCell), cy1 = Math.floor(vy1 / L.rimCell);
    for (let gx = cx0; gx <= cx1; gx++) for (let gy = cy0; gy <= cy1; gy++) { const a = L.rim.get(L.key(gx, gy)); if (!a) continue;
      for (let k = 0; k < a.length; k += 2) { const d = hyp(a[k] - sn.x, a[k + 1] - sn.y); if (d > R) continue; const age = sn.t - d / 720, al = 1 - age / 2.3; if (al <= 0) continue; buckets[Math.min(4, al * 5 | 0)].push(a[k], a[k + 1]); } }
    buckets.forEach((b, q) => { if (!b.length) return; ctx.fillStyle = "rgba(110,235,255," + ((q + 1) / 5 * .9) + ")"; const w = 3.2 / z; for (let k = 0; k < b.length; k += 2) ctx.fillRect(b[k] - w / 2, b[k + 1] - w / 2, w, w); });
    const mark = (x, y, col, r) => { const d = hyp(x - sn.x, y - sn.y); if (d > R) return; const al = 1 - (sn.t - d / 720) / 2.6; if (al <= 0) return; ctx.strokeStyle = col.replace("A", al); ctx.lineWidth = 2 / z; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); };
    for (const f of L.frags) if (!f.got) mark(f.x, f.y, "rgba(255,180,80,A)", 22);
    mark(L.exit.x, L.exit.y - 30, "rgba(110,240,255,A)", 34);
    for (const v of L.vents) mark(v.x, v.y - 20, "rgba(220,250,255,A)", 18);
    for (const a of L.anglers) mark(a.x, a.y, "rgba(255,90,90,A)", 28);
    for (const j of L.jellies) mark(j.x, j.y, "rgba(255,110,200,A)", 22);
    for (const e of L.eels) mark(e.ax, e.ay, "rgba(255,90,90,A)", 16);
  }
  // guide arrow
  if (G.guide && G.mode === "play") { const gd = G.guide, a = Math.atan2(gd.y - s.y, gd.x - s.x), r = 46, col = gd.kind === "exit" ? "rgba(110,240,255," : gd.kind === "jyoti" ? "rgba(140,240,255," : "rgba(255,180,80,";
    const al = .55 + .3 * Math.sin(G.t * 4); ctx.save(); ctx.translate(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r); ctx.rotate(a); ctx.fillStyle = col + al + ")";
    ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-5, -7); ctx.lineTo(-2, 0); ctx.lineTo(-5, 7); ctx.closePath(); ctx.fill(); ctx.restore(); }
  ctx.globalCompositeOperation = "source-over";
  // pressure line
  if (L.press && G.pressY && G.pressY < vy1 + 20) { ctx.strokeStyle = "rgba(255,70,90,.7)"; ctx.setLineDash([14 / z, 10 / z]); ctx.lineWidth = 2 / z; ctx.beginPath(); ctx.moveTo(vx0, G.pressY); ctx.lineTo(vx1, G.pressY); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,120,130,.9)"; ctx.font = (12 / z) + "px system-ui"; ctx.fillText("PRESSURE LIMIT " + Math.round(L.depthAt(G.pressY)) + " m", vx0 + 10 / z, G.pressY - 6 / z); }
  // ---- screen effects ----
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const vg = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * .3, cw / 2, ch / 2, Math.max(cw, ch) * .75); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0," + (.35 + dark * .3) + ")");
  ctx.fillStyle = vg; ctx.fillRect(0, 0, cw, ch);
  const o2f = s.o2 / s.o2Max;
  if ((o2f < .3 && G.mode === "play") || (G.mode === "dying" && G.failReason === "o2")) { const p = G.mode === "dying" ? 1 : (.3 - o2f) / .3 * (.6 + .4 * Math.sin(G.t * 6)); const g = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * .25, cw / 2, ch / 2, Math.max(cw, ch) * .7); g.addColorStop(0, "rgba(120,0,20,0)"); g.addColorStop(1, "rgba(160,0,30," + (.55 * p) + ")"); ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch); }
  const hf = s.hull / s.hullMax, inPress = L.press && G.pressY && s.y > G.pressY;
  if (hf < .35 || inPress || (G.mode === "dying" && G.failReason === "hull")) { if (!cracks) makeCracks(); const a = G.mode === "dying" ? 1 : inPress ? .5 + .3 * Math.sin(G.t * 8) : (.35 - hf) / .35;
    ctx.strokeStyle = "rgba(220,240,255," + (a * .55) + ")"; ctx.lineWidth = 1.3; for (const cr of cracks) { ctx.beginPath(); cr.forEach((p, k) => k ? ctx.lineTo(p[0] * cw, p[1] * ch) : ctx.moveTo(p[0] * cw, p[1] * ch)); ctx.stroke(); } }
  if (G.flash > 0) { ctx.fillStyle = rgb(G.flashC, G.flash * .6); ctx.fillRect(0, 0, cw, ch); }
  if (G.mode === "dying") { ctx.fillStyle = "rgba(0,0,0," + clamp((G.dieT - .6) / 1.6, 0, .85) + ")"; ctx.fillRect(0, 0, cw, ch); }
  if (G.mode === "won") { ctx.fillStyle = "rgba(180,250,255," + clamp(.25 - G.wonT * .2, 0, .25) + ")"; ctx.fillRect(0, 0, cw, ch); }
}

/* ---------- scenes: title, cinematics, story-card art ---------- */
const TP = [];   // title particles
function waterBg(c, w, h, top, bot) { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, rgb(top)); g.addColorStop(1, rgb(bot)); c.fillStyle = g; c.fillRect(0, 0, w, h); }
function raysS(c, w, h, t, a, n = 6) { c.globalCompositeOperation = "lighter"; for (let i = 0; i < n; i++) { const bx = (i + .3) * w / n + Math.sin(t * .3 + i) * w * .04, ww = w * (.03 + (i * 37 % 5) * .012);
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "rgba(210,255,255," + a + ")"); g.addColorStop(1, "rgba(210,255,255,0)"); c.fillStyle = g;
    c.beginPath(); c.moveTo(bx, 0); c.lineTo(bx + ww, 0); c.lineTo(bx + ww * 3 + w * .2, h); c.lineTo(bx + w * .2, h); c.fill(); } c.globalCompositeOperation = "source-over"; }
function snowS(c, w, h, t, n, col) { c.fillStyle = col; for (let i = 0; i < n; i++) { const x = (i * 97.13 % 1) * w, y = ((i * 61.7 % 1) * h + t * (8 + i % 7 * 3)) % h; c.fillRect(x + Math.sin(t + i) * 4, y, 1.6, 1.6); } }
function floorS(c, w, h, y0, col, t, seed) { const R = rng(seed); c.fillStyle = col; c.beginPath(); c.moveTo(0, h); c.lineTo(0, y0); for (let x = 0; x <= w + 20; x += 20) c.lineTo(x, y0 + Math.sin(x * .02 + seed) * 8 + R() * 6); c.lineTo(w, h); c.fill(); }
function lightCone(c, x, y, ang, len, a) { c.globalCompositeOperation = "lighter"; const g = c.createRadialGradient(x, y, 0, x, y, len); g.addColorStop(0, "rgba(255,245,200," + a + ")"); g.addColorStop(1, "rgba(255,245,200,0)"); c.fillStyle = g; c.beginPath(); c.moveTo(x, y); c.arc(x, y, len, ang - .4, ang + .4); c.closePath(); c.fill(); c.globalCompositeOperation = "source-over"; }

function renderTitle(dt) {
  const t = performance.now() / 1000, w = cw, h = ch, c = ctx;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  waterBg(c, w, h, [30, 150, 190], [2, 14, 36]);
  raysS(c, w, h * .8, t, .16, 7);
  // far ridges
  c.fillStyle = "rgba(2,20,40,.55)"; c.beginPath(); c.moveTo(0, h); for (let x = 0; x <= w; x += 30) c.lineTo(x, h * .78 + Math.sin(x * .013 + t * .05) * 30 + Math.sin(x * .05) * 10); c.lineTo(w, h); c.fill();
  // whale passing
  const ws = Math.min(w, h) / 720, wx = ((t * 26) % (w + 900 * ws)) - 350 * ws, wy = h * .6 + Math.sin(t * .3) * 10;
  drawWhaleSil(c, wx, wy, ws * 1.15, t, .9);
  snowS(c, w, h, t, 70, "rgba(220,250,255,.35)");
  // fish school
  for (let i = 0; i < 14; i++) { const fx = ((t * 40 + i * 23) % (w + 200)) - 100, fy = h * .3 + Math.sin(t + i * .7) * 14 + (i % 4) * 9; drawFish(c, w - fx, fy, .9, Math.PI, "rgba(220,240,250,.8)", t + i); }
  // sub descending
  const sy = h * .5 + Math.sin(t * .8) * 10, sx = w * .5 + Math.sin(t * .35) * w * .08;
  lightCone(c, sx + 26 * 1.6, sy + 6, .5, Math.min(w, h) * .55, .2);
  drawSub(c, sx, sy, 1.7, 1, .12 + Math.sin(t * .7) * .04, t * 8, t, 0);
  if (Math.random() < dt * 14) TP.push({ x: sx - 50, y: sy, vx: rnd(-30, -10), vy: rnd(-30, -10), l: rnd(1, 2.2), s: rnd(1.5, 4) });
  c.strokeStyle = "rgba(220,250,255,.7)"; c.lineWidth = 1;
  for (let i = TP.length - 1; i >= 0; i--) { const p = TP[i]; p.l -= dt; if (p.l <= 0) { TP.splice(i, 1); continue; } p.vy -= 40 * dt; p.x += p.vx * dt + Math.sin(p.l * 8) * .3; p.y += p.vy * dt; c.globalAlpha = Math.min(1, p.l); c.beginPath(); c.arc(p.x, p.y, p.s, 0, TAU); c.stroke(); }
  c.globalAlpha = 1;
  const vg = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .3, w / 2, h / 2, Math.max(w, h) * .8); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.55)"); c.fillStyle = vg; c.fillRect(0, 0, w, h);
}

// story card art + cinematic scenes share one painter
function scene(c, w, h, key, t) {
  const S = Math.min(w, h) / 380;
  switch (key) {
    case "ship": {   // dawn at the surface, the research ship, a sonar line down into the deep
      const hz = h * .38, g = c.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, "#1b2450"); g.addColorStop(.6, "#d9667a"); g.addColorStop(1, "#ffc27a"); c.fillStyle = g; c.fillRect(0, 0, w, hz);
      glow(c, w * .7, hz, 90 * S, "rgba(255,210,140,1)", .9); c.fillStyle = "#fff0c8"; c.beginPath(); c.arc(w * .7, hz, 18 * S, Math.PI, TAU); c.fill();
      waterBg(c, w, h, [20, 90, 130], [0, 8, 20]); c.save(); c.beginPath(); c.rect(0, 0, w, hz); c.clip(); c.fillStyle = g; c.fillRect(0, 0, w, hz); glow(c, w * .7, hz, 90 * S, "rgba(255,210,140,1)", .9); c.fillStyle = "#fff0c8"; c.beginPath(); c.arc(w * .7, hz, 18 * S, Math.PI, TAU); c.fill(); c.restore();
      raysS(c, w, h, t, .1, 5);
      const bob = Math.sin(t * 1.2) * 3 * S, sx = w * .38;
      c.fillStyle = "#0d1420"; c.beginPath(); c.moveTo(sx - 110 * S, hz - 6 * S + bob); c.lineTo(sx + 120 * S, hz - 6 * S + bob); c.lineTo(sx + 95 * S, hz + 16 * S + bob); c.lineTo(sx - 95 * S, hz + 16 * S + bob); c.fill();
      c.fillRect(sx - 40 * S, hz - 34 * S + bob, 70 * S, 28 * S); c.fillRect(sx - 20 * S, hz - 52 * S + bob, 34 * S, 18 * S); c.fillRect(sx - 4 * S, hz - 72 * S + bob, 4 * S, 20 * S);
      c.strokeStyle = "#0d1420"; c.lineWidth = 4 * S; c.beginPath(); c.moveTo(sx - 100 * S, hz - 6 * S + bob); c.lineTo(sx - 120 * S, hz - 48 * S + bob); c.lineTo(sx - 80 * S, hz - 48 * S + bob); c.stroke();
      glow(c, sx + 6 * S, hz - 30 * S + bob, 5 * S, "rgba(255,240,180,1)", .9);
      c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 1.2; for (let i = 0; i < 6; i++) { c.beginPath(); for (let x = 0; x <= w; x += 12) c.lineTo(x, hz + 3 + i * 7 * S + Math.sin(x * .04 + t * 2 + i) * 2); c.stroke(); }
      const q = (t % 2.4) / 2.4; c.strokeStyle = "rgba(110,240,255," + (1 - q) + ")"; c.lineWidth = 2; c.beginPath(); c.ellipse(sx, hz + 20 * S + q * (h - hz), 20 * S + q * 80 * S, (20 * S + q * 80 * S) * .3, 0, 0, TAU); c.stroke();
      snowS(c, w, h, t, 30, "rgba(200,240,255,.25)"); break; }
    case "probe": {
      waterBg(c, w, h, [2, 16, 36], [0, 2, 8]); snowS(c, w, h, t, 50, "rgba(200,230,255,.25)");
      for (let k = 0; k < 4; k++) { const q = ((t / 2.33 + k / 4) % 1); c.strokeStyle = "rgba(120,240,255," + (1 - q) * .8 + ")"; c.lineWidth = 3; c.beginPath(); c.ellipse(w * .5, h * .9, q * w * .9, q * w * .3, 0, 0, TAU); c.stroke(); }
      glow(c, w * .5, h * 1.02, w * .5, "rgba(80,200,255,1)", .25 + .2 * Math.sin(t * TAU / 2.33));
      const py = h * .42 + Math.sin(t * .8) * 6 * S + (t % 30) * 2; lightCone(c, w * .5, py + 30 * S, Math.PI / 2, 160 * S, .16);
      drawProbe(c, w * .5, py, 1.3 * S, t, false); glow(c, w * .5 + 14 * 1.3 * S, py - 50 * 1.3 * S, 6 * S, "rgba(120,255,160,1)", (t % 1) < .3 ? 1 : .2); break; }
    case "launch": {
      const hz = h * .3; waterBg(c, w, h, [24, 120, 160], [2, 20, 44]); c.fillStyle = "#f2b07a"; c.fillRect(0, 0, w, hz); const g = c.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, "#5a7bb8"); g.addColorStop(1, "#f6c58c"); c.fillStyle = g; c.fillRect(0, 0, w, hz);
      raysS(c, w, h, t, .12, 5);
      c.fillStyle = "#0f1824"; c.fillRect(w * .58, hz - 40 * S, w * .5, 46 * S); c.strokeStyle = "#0f1824"; c.lineWidth = 6 * S; c.beginPath(); c.moveTo(w * .62, hz - 40 * S); c.lineTo(w * .48, hz - 110 * S); c.lineTo(w * .56, hz - 110 * S); c.stroke();
      const drop = smooth(t / 3.5), rel = t > 3.6, sy = rel ? hz + 30 * S + (t - 3.6) * 40 * S : lerp(hz - 70 * S, hz + 30 * S, drop);
      if (!rel) { c.strokeStyle = "#223"; c.lineWidth = 2; c.beginPath(); c.moveTo(w * .5, hz - 110 * S); c.lineTo(w * .5, sy - 14 * S); c.stroke(); }
      c.strokeStyle = "rgba(255,255,255,.4)"; c.lineWidth = 1.2; for (let i = 0; i < 4; i++) { c.beginPath(); for (let x = 0; x <= w; x += 12) c.lineTo(x, hz + 2 + i * 6 + Math.sin(x * .04 + t * 2 + i) * 2); c.stroke(); }
      if (t > 2.6 && t < 5.5) for (let k = 0; k < 12; k++) { const q = (t - 2.6) / 2.9; c.strokeStyle = "rgba(230,250,255," + (1 - q) + ")"; c.beginPath(); c.arc(w * .5 + Math.sin(k * 2.1) * 30 * S, hz + 10 * S + q * 40 * S * (k % 3 + 1) * -.3 + k * 4, 3 + k % 3, 0, TAU); c.stroke(); }
      if (rel) lightCone(c, w * .5 + 40 * S, sy + 8 * S, .6, 200 * S, .16);
      drawSub(c, w * .5, sy, 1.8 * S, 1, rel ? .2 : 0, t * (rel ? 9 : 1), t, 0); snowS(c, w, h, t, 30, "rgba(220,250,255,.3)"); break; }
    case "c1": { waterBg(c, w, h, [50, 180, 210], [12, 100, 150]); raysS(c, w, h, t, .22, 6); floorS(c, w, h, h * .85, "#7a8a70", t, 3);
      for (let i = 0; i < 8; i++) kelp(c, w * (.05 + i * .13), h * .9, h * (.25 + (i % 3) * .08), t, i, "#4f7a3a");
      for (let i = 0; i < 16; i++) drawFish(c, ((t * 30 + i * 18) % (w + 80)) - 40, h * .3 + Math.sin(i + t) * 10 + (i % 4) * 8, S, 0, "#e8f2f8", t + i);
      drawSub(c, w * .4 + Math.sin(t * .6) * 10, h * .55, 1.7 * S, 1, .05, t * 6, t, 0); glow(c, w * .74, h * .62, 30 * S, "rgba(255,170,60,1)", .8); drawFrag(c, w * .74, h * .62, 1.3 * S, t); break; }
    case "c2": { waterBg(c, w, h, [24, 140, 170], [6, 60, 100]); raysS(c, w, h, t, .16, 6); floorS(c, w, h, h * .9, "#5d6a58", t, 4);
      for (let i = 0; i < 14; i++) kelp(c, w * (i / 13), h * .95, h * (.6 + (i % 4) * .1), t, i * 1.7, i % 2 ? "#3f6a2f" : "#56803a");
      drawSub(c, w * .5, h * .5 + Math.sin(t) * 6, 1.4 * S, 1, .2, t * 6, t, 0); break; }
    case "c3": { waterBg(c, w, h, [18, 110, 150], [4, 40, 70]); c.fillStyle = "#3a4a4e"; c.beginPath(); c.moveTo(0, 0); c.lineTo(w, 0); c.lineTo(w, h * .2); c.quadraticCurveTo(w * .5, h * .5, 0, h * .25); c.fill(); floorS(c, w, h, h * .8, "#4d5a5a", t, 5);
      ["#ff7a8a", "#ff9f4a", "#e86ad8", "#ffd166"].forEach((col, i) => { c.strokeStyle = col; c.lineWidth = 5 * S; c.lineCap = "round"; const x = w * (.15 + i * .22), y = h * .82; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 30 * S); c.lineTo(x - 18 * S, y - 55 * S); c.moveTo(x, y - 30 * S); c.lineTo(x + 16 * S, y - 50 * S); c.stroke(); });
      drawJelly(c, w * .72, h * .4, 1.5 * S, t, 0); glow(c, w * .72, h * .4, 40 * S, "rgba(255,120,230,1)", .3); drawSub(c, w * .32, h * .55, 1.4 * S, 1, 0, t * 6, t, 0); break; }
    case "c4": { waterBg(c, w, h, [6, 50, 90], [1, 10, 26]); snowS(c, w, h, t, 40, "rgba(200,240,255,.3)");
      c.globalCompositeOperation = "lighter"; const pul = .5 + .5 * Math.sin(t * TAU / 2.4); for (let i = 0; i < 60; i++) { const x = (i * 73.1 % 1) * w, y = (i * 41.3 % 1) * h; glow(c, x + Math.sin(t + i) * 6, y, (4 + pul * 4) * S, "rgba(90,255,220,1)", .3 + pul * .5); } c.globalCompositeOperation = "source-over";
      lightCone(c, w * .38 + 40 * S, h * .5 + 6 * S, 0, 220 * S, .22); drawSub(c, w * .38, h * .5, 1.5 * S, 1, 0, t * 6, t, 0); break; }
    case "c5": { waterBg(c, w, h, [4, 36, 70], [1, 8, 22]); c.strokeStyle = "rgba(150,220,255,.25)"; c.lineWidth = 2; for (let i = 0; i < 18; i++) { const y = (i * 53 % h), x = ((t * 160 + i * 97) % (w + 200)) - 100; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 70, y + 8); c.stroke(); }
      c.fillStyle = "#16222a"; c.beginPath(); c.moveTo(w, h * .2); c.lineTo(w * .78, h * .35); c.lineTo(w * .82, h * .6); c.lineTo(w, h * .7); c.fill();
      const ext = .5 + .5 * Math.sin(t * 2); c.strokeStyle = "#1e3340"; c.lineWidth = 8 * S; c.beginPath(); c.moveTo(w * .8, h * .47); for (let k = 1; k <= 6; k++) c.lineTo(w * .8 - k * 14 * S * ext, h * .47 + Math.sin(t * 9 + k) * 5 * S); c.stroke();
      c.globalCompositeOperation = "lighter"; for (let k = 0; k < 4; k++) glow(c, w * .8 - rnd(0, 80 * S * ext), h * .47 + rnd(-8, 8), 14 * S, "rgba(130,210,255,1)", .7); c.globalCompositeOperation = "source-over";
      drawSub(c, w * .3 + Math.sin(t * 3) * 4, h * .5, 1.4 * S, 1, -.05, t * 9, t, 0); break; }
    case "c6": { waterBg(c, w, h, [4, 30, 60], [1, 6, 16]); floorS(c, w, h, h * .82, "#18242c", t, 6); c.strokeStyle = "#d8cfb8"; c.lineWidth = 6 * S; c.lineCap = "round";
      c.beginPath(); c.moveTo(w * .1, h * .8); c.lineTo(w * .85, h * .8); c.stroke(); for (let i = 0; i < 8; i++) { const x = w * (.18 + i * .08); c.beginPath(); c.moveTo(x, h * .8); c.quadraticCurveTo(x - 10 * S, h * .6, x + 4 * S, h * (.48 + Math.abs(i - 3.5) * .03)); c.stroke(); }
      c.fillStyle = "#d8cfb8"; c.beginPath(); c.ellipse(w * .88, h * .76, 40 * S, 16 * S, 0, 0, TAU); c.fill(); c.globalCompositeOperation = "lighter"; for (let i = 0; i < 18; i++) glow(c, w * (.15 + i * .04), h * (.6 + Math.sin(i * 2) * .15), 7 * S, "rgba(120,255,210,1)", .5 + .4 * Math.sin(t * 2 + i)); c.globalCompositeOperation = "source-over";
      drawSub(c, w * .5, h * .3, 1.2 * S, -1, 0, t * 6, t, 0); break; }
    case "c7": { waterBg(c, w, h, [2, 14, 30], [0, 3, 10]); snowS(c, w, h, t, 40, "rgba(200,230,255,.22)"); drawAngler(c, w * .65, h * .55, 2.2 * S, -1, t, true); const [lx, ly] = anglerLure(w * .65, h * .55, 2.2 * S, -1, t);
      c.globalCompositeOperation = "lighter"; glow(c, lx, ly, 40 * S, "rgba(120,255,200,1)", 1); c.globalCompositeOperation = "source-over"; c.globalAlpha = .55; drawSub(c, w * .2, h * .5, 1.2 * S, 1, 0, t * 4, t, 0); c.globalAlpha = 1; break; }
    case "c8": { waterBg(c, w, h, [6, 12, 22], [0, 2, 6]); floorS(c, w, h, h * .85, "#120e0c", t, 8);
      [.2, .45, .75].forEach((fx, i) => { const x = w * fx, y = h * .86, hh = (50 + i * 20) * S; c.fillStyle = "#1b1410"; c.beginPath(); c.moveTo(x - 22 * S, y); c.lineTo(x - 8 * S, y - hh); c.lineTo(x + 8 * S, y - hh); c.lineTo(x + 22 * S, y); c.fill();
        for (let k = 0; k < 10; k++) { const q = ((t * .5 + k / 10) % 1); c.fillStyle = "rgba(30,24,24," + (1 - q) * .6 + ")"; c.beginPath(); c.arc(x + Math.sin(k + t) * 10 * q, y - hh - q * 140 * S, (6 + q * 20) * S, 0, TAU); c.fill(); }
        c.globalCompositeOperation = "lighter"; glow(c, x, y - hh, 30 * S, "rgba(255,120,40,1)", .9); c.globalCompositeOperation = "source-over"; }); break; }
    case "c9": { waterBg(c, w, h, [2, 10, 22], [0, 2, 8]); snowS(c, w, h, t, 90, "rgba(220,235,255,.35)"); floorS(c, w, h, h * .78, "#141a22", t, 9);
      for (let i = 0; i < 6; i++) { c.fillStyle = "#7a4a58"; c.beginPath(); c.ellipse(w * (.1 + i * .16), h * .8 + (i % 2) * 6, 12 * S, 5 * S, 0, 0, TAU); c.fill(); }
      lightCone(c, w * .3 + 30 * S, h * .45, .15, 300 * S, .2); drawSub(c, w * .3, h * .45, 1.1 * S, 1, .1, t * 6, t, 0); break; }
    case "c10": { waterBg(c, w, h, [2, 10, 20], [0, 2, 6]); c.fillStyle = "#10161c"; c.beginPath(); c.moveTo(0, 0); c.lineTo(w * .25, 0); c.lineTo(w * .2, h); c.lineTo(0, h); c.fill(); c.beginPath(); c.moveTo(w, 0); c.lineTo(w * .8, 0); c.lineTo(w * .85, h); c.lineTo(w, h); c.fill();
      floorS(c, w, h, h * .82, "#151c22", t, 10); drawProbe(c, w * .55, h * .7, 1.4 * S, t, true); c.globalCompositeOperation = "lighter"; glow(c, w * .55 + 20 * S, h * .7 - 72 * S, 10 * S, "rgba(255,60,60,1)", Math.sin(t * 3) > .6 ? 1 : .1);
      for (let k = 0; k < 4; k++) { const q = ((t * .5 + k / 4) % 1); c.strokeStyle = "rgba(110,235,255," + (1 - q) * .5 + ")"; c.lineWidth = 2; c.beginPath(); c.arc(w * .3, h * .4, q * w * .6, 0, TAU); c.stroke(); } c.globalCompositeOperation = "source-over";
      drawSub(c, w * .3, h * .4, 1.2 * S, 1, .2, t * 6, t, 0); break; }
    case "c11": case "endB": { waterBg(c, w, h, [0, 8, 18], [0, 2, 6]); const big = key === "endB";
      glow(c, w * .6, h * .5, w * .6, "rgba(70,170,255,1)", big ? .5 + .2 * Math.sin(t) : .3); drawJyoti(c, w * .62, h * .5, (big ? .9 : 1.1) * S, -1, t, big ? 1 : .8);
      if (big) { c.globalCompositeOperation = "lighter"; for (let i = 0; i < 9; i++) { const x = w * (i / 8), y = h * (.9 - ((t * .05 + i * .13) % 1) * .9); glow(c, x, y, (30 + i % 3 * 12) * S, "rgba(120,230,255,1)", .5); } c.globalCompositeOperation = "source-over";
        for (let i = 0; i < 5; i++) drawJyoti(c, w * (.1 + i * .2), h * (.85 - ((t * .04 + i * .2) % 1) * .8), .35 * S, i % 2 ? 1 : -1, t + i, .7); }
      else { c.fillStyle = "#0b1016"; c.beginPath(); c.moveTo(0, h); c.lineTo(0, h * .6); c.lineTo(w * .2, h * .5); c.lineTo(w * .35, h * .7); c.lineTo(w * .5, h * .62); c.lineTo(w * .55, h); c.fill(); c.globalAlpha = .9; drawSub(c, w * .22, h * .44, 1.1 * S, 1, 0, t * 4, t, 0); c.globalAlpha = 1; } break; }
    case "c12": { waterBg(c, w, h, [0, 6, 14], [0, 1, 4]); drawJyoti(c, w * .66, h * .5, .9 * S, -1, t * .6, .85);
      c.fillStyle = "#151b22"; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(w * (.42 + (i % 3) * .05), h * (.3 + (i / 3 | 0) * .2 + (i % 2) * .04), (20 + i % 4 * 6) * S, 0, TAU); c.fill(); }
      lightCone(c, w * .2 + 36 * S, h * .5 + 6 * S, 0, 220 * S, .25); drawSub(c, w * .2, h * .5, 1.3 * S, 1, 0, t * 4, t, 0); break; }
    case "endA": { waterBg(c, w, h, [0, 6, 14], [0, 1, 4]); floorS(c, w, h, h * .8, "#11161c", t, 12); drawProbe(c, w * .4, h * .7, 1.5 * S, t, true);
      c.globalCompositeOperation = "lighter"; glow(c, w * .4 + 22 * S, h * .7 - 76 * S, 10 * S, "rgba(255,60,60,1)", Math.sin(t * 2) > .3 ? 1 : .1); c.globalCompositeOperation = "source-over";
      drawJyoti(c, w * .75, h * .42, .7 * S, -1, t, .6);
      c.fillStyle = "rgba(255,255,255,.05)"; for (let i = 0; i < 30; i++) c.fillRect(0, Math.random() * h, w, 1); break; }
    case "endC": { const up = smooth(t / 10); waterBg(c, w, h, mixC([2, 20, 50], [60, 190, 220], up), mixC([0, 4, 10], [10, 80, 120], up)); raysS(c, w, h, t, .1 + up * .2, 6);
      snowS(c, w, h, t, 40, "rgba(220,250,255,.3)"); c.globalCompositeOperation = "lighter"; for (let i = 0; i < 8; i++) glow(c, w * (i / 7), h * (1 - up * .2) + Math.sin(t + i) * 10, 40 * S, "rgba(120,230,255,1)", .5 * (1 - up)); c.globalCompositeOperation = "source-over";
      drawSub(c, w * .5, h * (.75 - up * .35), 1.6 * S, 1, -.35, t * 8, t, 0); break; }
  }
}
// story card art loop
let artRAF = 0, artKey = "c1", artT0 = 0;
function startArt(key) { artKey = key; artT0 = performance.now(); if (!artRAF) artLoop(); }
function artLoop() { const a = $("art"); if (G.mode !== "story") { artRAF = 0; return; } const c = a.getContext("2d"); c.setTransform(1, 0, 0, 1, 0, 0); scene(c, a.width, a.height, artKey, (performance.now() - artT0) / 1000); artRAF = requestAnimationFrame(artLoop); }

// cinematics (intro & ending) on the main canvas
const CINE = {
  intro: [{ key: "ship", vo: "intro1" }, { key: "probe", vo: "intro2" }, { key: "launch", vo: "intro3" }],
  ending: [{ key: "endA", vo: "end1" }, { key: "endB", vo: "end2" }, { key: "endC", vo: "end3", end: 1 }]
};
let cine = null;
function startCine(name, onDone) {
  cine = { name, i: -1, t: 0, onDone, fade: 1, cancel: null };
  setMode("cine"); showScreen("sCine"); $("hud").classList.add("hidden"); $("controls").classList.add("hidden");
  $("cineSub").textContent = "";
  const sc = CINE[name], keys = sc.map(x => x.vo);
  cine.cancel = Voice.seq(keys, (i, k) => { cine.i = i; cine.t = 0; const sub = $("cineSub"); sub.className = "cine-sub" + (VO[k][0] === "V" ? " log" : ""); sub.innerHTML = "<span class='who'>" + WHO(k) + "</span>" + VO[k][1]; G.events && G.events.push(["cine", k]); },
    () => { if (cine && cine.name === name) { if (name === "ending") { cine.done = 1; cine.t2 = 0; $("cineSub").innerHTML = ""; } else endCine(); } });
  if (name === "ending") { Snd.song(.08); setTimeout(() => Snd.win(), 6000); }
}
function endCine() { if (!cine) return; const c = cine; cine = null; if (c.cancel) c.cancel(); Voice.stopAll(); c.onDone && c.onDone(); }
function renderCine(dt) {
  if (!cine) return; cine.t += dt; const sc = CINE[cine.name], i = Math.max(0, cine.i), k = sc[Math.min(i, sc.length - 1)].key;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); scene(ctx, cw, ch, k, cine.t + (cine.done ? 10 : 0));
  if (cine.t < .8) { ctx.fillStyle = "rgba(0,0,0," + (1 - cine.t / .8) + ")"; ctx.fillRect(0, 0, cw, ch); }
  if (cine.done) { cine.t2 += dt; const a = clamp(cine.t2 / 1.5, 0, 1); ctx.fillStyle = "rgba(255,255,255," + a + ")"; ctx.textAlign = "center"; ctx.font = "900 " + Math.min(54, cw * .12) + "px system-ui"; ctx.fillText("THE END", cw / 2, ch * .2);
    ctx.font = "16px system-ui"; ctx.fillStyle = "rgba(200,240,255," + a + ")"; ctx.fillText("Varuna-1 found. Jyoti is home.", cw / 2, ch * .2 + 34); ctx.fillText("Thank you for playing Samudrayaan.", cw / 2, ch * .2 + 58);
    if (cine.t2 > 2) { ctx.font = "14px system-ui"; ctx.fillStyle = "rgba(160,220,240," + (.5 + .5 * Math.sin(cine.t2 * 3)) + ")"; ctx.fillText("tap to continue", cw / 2, ch * .2 + 92); } }
}

/* ---------- screens & flow ---------- */
function setMode(m) { G.mode = m; }
function showScreen(id) { document.querySelectorAll(".screen").forEach(s => s.classList.toggle("hidden", s.id !== id)); }
function curtain(fn) { const c = $("curtain"); c.classList.add("on"); setTimeout(() => { fn(); setTimeout(() => c.classList.remove("on"), 60); }, 360); }
let toastT = 0;
function toast(msg, cls, ms = 1600) { const t = $("toast"); t.textContent = msg; t.className = "toast show " + (cls || ""); clearTimeout(toastT); toastT = setTimeout(() => t.className = "toast " + (cls || ""), ms); }
let hintT = 0;
function showHint(msg, ms) { const h = $("hint"); h.textContent = msg; h.classList.remove("hidden"); clearTimeout(hintT); if (ms) hintT = setTimeout(hideHint, ms); }
function hideHint() { $("hint").classList.add("hidden"); }
function nextDiveIndex() { for (let i = 0; i < Math.min(save.unlocked, LEVELS.length); i++) if (!save.stars[LEVELS[i].id]) return i; return Math.min(save.unlocked, LEVELS.length) - 1; }
function refreshToggles() {
  document.querySelectorAll(".sound-toggle").forEach(b => { b.textContent = save.sound ? "🔊 Sound on" : "🔇 Sound off"; b.classList.toggle("off", !save.sound); });
  document.querySelectorAll(".voice-toggle").forEach(b => { b.textContent = save.voice ? "🗣 Voice on" : "🤐 Voice off"; b.classList.toggle("off", !save.voice); });
  document.querySelectorAll(".pearls-total, .pearls-inline").forEach(e => e.textContent = save.pearls);
}
function goTitle() {
  Voice.stopAll(); setMode("title"); $("hud").classList.add("hidden"); $("controls").classList.add("hidden"); hideHint();
  const ni = nextDiveIndex(); $("bPlay").textContent = save.unlocked > 1 || save.stars[1] ? "▶ Continue · Dive " + (ni + 1) : "▶ Play";
  refreshToggles(); showScreen("sTitle");
}
function play() {
  Snd.init();
  if (!save.introSeen) { curtain(() => startCine("intro", () => { save.introSeen = true; persist(); curtain(() => openStory(0)); })); return; }
  curtain(() => openStory(nextDiveIndex()));
}
let storyCancel = null;
function openStory(li) {
  const D = LEVELS[li], keys = STORY[D.id];
  setMode("story"); showScreen("sStory"); $("hud").classList.add("hidden"); $("controls").classList.add("hidden");
  $("stChap").textContent = "DIVE " + D.id + " · " + D.zone.toUpperCase() + " · " + D.d0 + "–" + D.d1 + " m";
  $("stTitle").textContent = D.name;
  $("stLines").innerHTML = keys.map(k => "<div class='sl" + (VO[k][0] === "V" ? " log" : "") + "' data-k='" + k + "'><div class='who'>" + WHO(k) + "</div><div class='tx'>" + VO[k][1] + "</div></div>").join("");
  $("bStoryGo").textContent = D.id === 12 ? "Lead Jyoti home ▸" : "Dive ▸";
  $("bStoryGo").onclick = () => { Snd.init(); Snd.click(); if (storyCancel) storyCancel(); curtain(() => startDive(li)); };
  startArt("c" + D.id);
  const lines = [...document.querySelectorAll("#stLines .sl")];
  setTimeout(() => { if (G.mode !== "story") return; storyCancel = Voice.seq(keys, i => { lines[i] && lines[i].classList.add("show"); G.events = G.events || []; }, () => {}); }, 450);
  $("bStorySkip").onclick = () => { Snd.click(); if (storyCancel) storyCancel(); lines.forEach(l => l.classList.add("show")); };
}
function showResult() {
  const r = G.result, D = LEVELS[G.li];
  setMode("result"); $("controls").classList.add("hidden"); hideHint();
  $("rName").textContent = "Dive " + D.id + " · " + D.name;
  const stars = [...document.querySelectorAll("#rStars span")]; stars.forEach(s => s.classList.remove("on"));
  const checks = [
    ["Reached the exit beacon", true],
    [(G.L.jyoti ? "Colony lights " : D.varuna ? "Fragments + Varuna core " : "Black-box fragments ") + r.nf + "/" + r.total, r.nf === r.total],
    ["Hull " + Math.round(r.hullP * 100) + "% (50%+) · time " + fmtT(r.time) + " (par " + fmtT(r.par) + ")", r.hullP >= .5 && r.time <= r.par]
  ];
  $("rChecks").innerHTML = checks.map(c => "<li><span>" + c[0] + "</span><span class='" + (c[1] ? "ok'>✓" : "no'>–") + "</span></li>").join("");
  $("rPearls").textContent = "0";
  $("bNext").textContent = D.id === LEVELS.length ? "Watch the ending ▸" : "Next dive ▸";
  showScreen("sResult");
  const lis = [...document.querySelectorAll("#rChecks li")];
  lis.forEach((l, i) => setTimeout(() => l.classList.add("show"), 300 + i * 250));
  for (let i = 0; i < r.stars; i++) setTimeout(() => { stars[i].classList.add("on"); Snd.star(i); buzz(20); }, 700 + i * 450);
  let n = 0; const iv = setInterval(() => { n = Math.min(r.pearls, n + Math.max(1, Math.ceil(r.pearls / 20))); $("rPearls").textContent = n; if (n % 2) Snd.tone(1800 + n * 10, .04, "sine", .05); if (n >= r.pearls) clearInterval(iv); }, 50);
}
function renderShop() {
  $("shopList").innerHTML = UPG.map(u => { const lv = upg(u.k), max = lv >= 3, cost = UPG_COST[lv];
    return "<div class='shop-item' data-k='" + u.k + "'><div class='ic'>" + u.ic + "</div><div class='info'><b>" + u.name + "</b><p>" + u.desc + "</p><div class='pips'>" + [0, 1, 2].map(i => "<i class='" + (i < lv ? "on" : "") + "'></i>").join("") + "</div></div>" +
      "<button class='btn buy' data-k='" + u.k + "' " + (max || save.pearls < cost ? "disabled" : "") + ">" + (max ? "MAX" : "● " + cost) + "</button></div>"; }).join("");
  refreshToggles();
  document.querySelectorAll("#shopList .buy").forEach(b => b.onclick = () => { const k = b.dataset.k, lv = upg(k); if (lv >= 3 || save.pearls < UPG_COST[lv]) return;
    save.pearls -= UPG_COST[lv]; save.upg[k] = lv + 1; persist(); Snd.init(); Snd.frag(); buzz(25); renderShop(); const it = document.querySelector(".shop-item[data-k=" + k + "]"); it && it.classList.add("bought"); toast("Upgraded: " + UPG.find(u => u.k === k).name + " " + (lv + 1) + "/3", "gold", 1600); });
}
let shopBack = "title";
function openShop(from) { shopBack = from || "title"; setMode("shop"); renderShop(); showScreen("sShop"); }
function renderDives() {
  $("diveGrid").innerHTML = LEVELS.map((D, i) => { const lk = D.id > save.unlocked, st = save.stars[D.id] || 0;
    return "<button class='dive" + (lk ? " locked" : "") + "' data-i='" + i + "'" + (lk ? " disabled" : "") + "><b>DIVE " + D.id + "</b><span class='nm'>" + D.name + "</span><small>" + D.d0 + "–" + D.d1 + " m" + (save.best[D.id] ? " · best " + fmtT(save.best[D.id]) : "") + "</small><span class='st'>" + "★".repeat(st) + "<i>" + "★".repeat(3 - st) + "</i></span></button>"; }).join("");
  refreshToggles();
  document.querySelectorAll("#diveGrid .dive").forEach(b => b.onclick = () => { if (b.disabled) return; Snd.init(); Snd.click(); const i = +b.dataset.i; curtain(() => openStory(i)); });
}
function pause() { if (G.mode !== "play") return; setMode("pause"); G.inp.x = G.inp.y = 0; stickReset(); refreshToggles(); showScreen("sPause"); if (Snd.ctx) Snd.ctx.suspend(); }
function resume() { if (G.mode !== "pause") return; if (Snd.ctx) Snd.ctx.resume(); setMode("play"); showScreen(null); }

/* ---------- HUD ---------- */
const hudCache = {};
function setW(id, f) { const v = Math.round(clamp(f, 0, 1) * 200) / 2; if (hudCache[id] !== v) { hudCache[id] = v; $(id).style.width = v + "%"; } }
function updateHud(force) {
  const s = G.s, L = G.L; if (!s) return;
  setW("fO2", s.o2 / s.o2Max); setW("fHull", s.hull / s.hullMax); setW("fBat", s.bat / 100);
  $("fO2").classList.toggle("warn", s.o2 < s.o2Max * .25); $("fHull").classList.toggle("warn", s.hull < s.hullMax * .3); $("fBat").classList.toggle("warn", s.bat < 15);
  const d = Math.round(G.depth || L.depthAt(s.y)); if (hudCache.depth !== d || force) { hudCache.depth = d; $("hDepth").textContent = d; }
  const nf = L.frags.filter(f => f.got).length, ft = (L.jyoti ? "✦ " : "◆ ") + nf + "/" + L.frags.length; if (hudCache.fr !== ft) { hudCache.fr = ft; $("hFrag").textContent = ft; }
  const pt = "● " + s.pearls; if (hudCache.pe !== pt) { hudCache.pe = pt; $("hPearl").textContent = pt; }
  const pw = !!(L.press && G.pressY && s.y > G.pressY && G.mode === "play"); if (hudCache.pw !== pw) { hudCache.pw = pw; $("pressWarn").classList.toggle("hidden", !pw); }
  $("bSonar").classList.toggle("cool", s.sonarCD > 0 || s.bat < 6);
}

/* ---------- input ---------- */
const stick = { id: null, bx: 0, by: 0 };
const zone = $("stickZone"), base = $("stickBase"), knob = $("stickKnob");
function stickReset() { stick.id = null; base.classList.remove("on"); base.style.left = ""; base.style.top = ""; base.style.bottom = ""; knob.style.transform = ""; if (!keys.size) { G.inp.x = 0; G.inp.y = 0; } }
function stickStart(id, cx, cy) {
  Snd.init(); stick.id = id; const r = zone.getBoundingClientRect(); stick.bx = cx; stick.by = cy;
  base.style.left = (cx - r.left) + "px"; base.style.top = (cy - r.top) + "px"; base.style.bottom = "auto"; base.classList.add("on"); $("stickHint").style.opacity = 0; stickMove(cx, cy);
}
function stickMove(cx, cy) { let dx = cx - stick.bx, dy = cy - stick.by; const l = hyp(dx, dy), R = 52; if (l > R) { dx *= R / l; dy *= R / l; }
  knob.style.transform = "translate(" + dx + "px," + dy + "px)"; let m = Math.min(1, l / R); m = m < .12 ? 0 : (m - .12) / .88; const a = Math.atan2(dy, dx); G.inp.x = Math.cos(a) * m; G.inp.y = Math.sin(a) * m; }
// touch: tracked by identifier, so a second finger on the buttons never disturbs the stick
zone.addEventListener("touchstart", e => { e.preventDefault(); if (G.mode !== "play") return;
  if (stick.id !== null && ![...e.touches].some(t => t.identifier === stick.id)) stickReset();
  if (stick.id !== null) return; const t = e.changedTouches[0]; stickStart(t.identifier, t.clientX, t.clientY); }, { passive: false });
zone.addEventListener("touchmove", e => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === stick.id) stickMove(t.clientX, t.clientY); }, { passive: false });
const tEnd = e => { for (const t of e.changedTouches) if (t.identifier === stick.id) stickReset(); if (stick.id !== null && ![...e.touches].some(t => t.identifier === stick.id)) stickReset(); };
zone.addEventListener("touchend", tEnd); zone.addEventListener("touchcancel", tEnd);
// mouse (desktop)
zone.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse" || G.mode !== "play" || stick.id !== null) return; e.preventDefault(); try { zone.setPointerCapture(e.pointerId); } catch (_) {} stickStart("m", e.clientX, e.clientY); });
zone.addEventListener("pointermove", e => { if (e.pointerType === "mouse" && stick.id === "m") stickMove(e.clientX, e.clientY); });
["pointerup", "pointercancel"].forEach(ev => zone.addEventListener(ev, e => { if (e.pointerType === "mouse" && stick.id === "m") stickReset(); }));
function onBtn(id, fn) { $(id).addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); Snd.init(); fn(); }); }
onBtn("bLight", () => { if (G.mode === "play") { setLight(!G.s.light); if (G.s.light) G.events.push(["light", 1, G.time]); } });
onBtn("bSonar", () => ping());
const keys = new Set();
function keyVec() { let x = 0, y = 0; if (keys.has("ArrowLeft") || keys.has("a")) x--; if (keys.has("ArrowRight") || keys.has("d")) x++; if (keys.has("ArrowUp") || keys.has("w")) y--; if (keys.has("ArrowDown") || keys.has("s")) y++; const l = hyp(x, y) || 1; if (stick.id === null) { G.inp.x = x / l; G.inp.y = y / l; } }
window.addEventListener("keydown", e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; Snd.init();
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "a", "d", "w", "s"].includes(k)) { keys.add(k); keyVec(); e.preventDefault(); }
  else if (k === " ") { ping(); e.preventDefault(); } else if (k === "l" || k === "f") { if (G.mode === "play") setLight(!G.s.light); } else if (k === "p" || k === "Escape") { G.mode === "play" ? pause() : G.mode === "pause" && resume(); } });
window.addEventListener("keyup", e => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; keys.delete(k); keyVec(); });
document.addEventListener("visibilitychange", () => { if (document.hidden) { if (G.mode === "play") pause(); else if (Snd.ctx && G.mode !== "pause") Snd.ctx.suspend(); } else if (Snd.ctx && G.mode !== "pause") Snd.ctx.resume(); });
document.addEventListener("contextmenu", e => e.preventDefault());

/* ---------- wiring ---------- */
$("bPlay").onclick = () => { Snd.init(); Snd.click(); play(); };
$("bDives").onclick = () => { Snd.init(); Snd.click(); setMode("levels"); renderDives(); showScreen("sDives"); };
$("bShop").onclick = () => { Snd.init(); Snd.click(); openShop("title"); };
$("bHow").onclick = () => { Snd.init(); Snd.click(); setMode("how"); showScreen("sHow"); };
$("bIntro").onclick = () => { Snd.init(); Snd.click(); curtain(() => startCine("intro", () => { save.introSeen = true; persist(); curtain(goTitle); })); };
document.querySelectorAll(".back").forEach(b => b.onclick = () => { Snd.click(); if (G.mode === "shop" && shopBack === "result") { setMode("result"); showScreen("sResult"); return; } goTitle(); });
document.querySelectorAll(".sound-toggle").forEach(b => b.onclick = () => { Snd.init(); save.sound = !save.sound; persist(); Snd.setOn(save.sound); refreshToggles(); });
document.querySelectorAll(".voice-toggle").forEach(b => b.onclick = () => { Snd.init(); save.voice = !save.voice; persist(); if (!save.voice) Voice.stopAll(); else Voice.preload(); refreshToggles(); Voice.note("toggle", save.voice ? "on" : "off"); });
$("bPause").addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); pause(); });
$("bResume").onclick = resume;
$("bRestart").onclick = () => { if (Snd.ctx) Snd.ctx.resume(); curtain(() => startDive(G.li)); };
$("bQuit").onclick = () => { if (Snd.ctx) Snd.ctx.resume(); curtain(goTitle); };
$("bNext").onclick = () => { Snd.click(); if (G.li + 1 >= LEVELS.length) curtain(() => startCine("ending", () => curtain(goTitle))); else curtain(() => openStory(G.li + 1)); };
$("bRetry").onclick = () => { Snd.click(); curtain(() => startDive(G.li)); };
$("bResShop").onclick = () => { Snd.click(); openShop("result"); };
$("bResMenu").onclick = () => { Snd.click(); curtain(goTitle); };
$("bFromCp").onclick = () => { Snd.click(); curtain(() => startDive(G.li, true)); };
$("bFailRestart").onclick = () => { Snd.click(); curtain(() => startDive(G.li)); };
$("bFailMenu").onclick = () => { Snd.click(); curtain(goTitle); };
$("bCineSkip").onclick = () => { Snd.click(); if (cine && cine.name === "ending") { endCine(); return; } endCine(); };
$("sCine").addEventListener("click", e => { if (e.target.id === "bCineSkip") return; if (cine && cine.done && cine.t2 > 1.5) endCine(); });

/* ---------- main loop + adaptive quality ---------- */
let last = performance.now(), slowT = 0;
function frame(now) {
  let dt = Math.min(.05, (now - last) / 1000); last = now;
  G.fps = lerp(G.fps, 1 / Math.max(dt, .001), .05);
  if (G.mode === "play" || G.mode === "dying" || G.mode === "won") {
    const steps = Math.ceil(dt / (1 / 60)); for (let i = 0; i < steps; i++) update(dt / steps);
    if (!G.lowFx && G.mode === "play") { if (G.fps < 45) { slowT += dt; if (slowT > 3) { G.lowFx = true; layout(); } } else slowT = 0; }
    Snd.update(dt, G.s.thr, clamp((G.depth || 0) / 6000, 0, 1), G.mode === "play");
    updateHud();
  } else if (Snd.ctx) Snd.update(dt, 0, G.mode === "cine" ? .5 : .1, false);
  try { render(dt); } catch (err) { console.error(err); }
  requestAnimationFrame(frame);
}
layout(); makeRockPatternSafe(); goTitle(); requestAnimationFrame(frame);
function makeRockPatternSafe() { makeRockPattern(); }
if ("serviceWorker" in navigator && location.protocol === "https:") window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
