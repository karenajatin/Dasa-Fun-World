// Kite Wars: Uttarayan — audio: SFX (prototype), generated dhol music, voice clips
'use strict';
let AC = null, master = null, sfxBus = null, musBus = null, voxBus = null, noiseBuf = null, zip = null;
const SET = {sound: true, music: true, voice: true};
function initAudio(){
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = 0.8; master.connect(AC.destination);
    sfxBus = AC.createGain(); sfxBus.gain.value = SET.sound ? 0.85 : 0; sfxBus.connect(master);
    musBus = AC.createGain(); musBus.gain.value = SET.music ? 0.32 : 0; musBus.connect(master);
    voxBus = AC.createGain(); voxBus.gain.value = SET.voice ? 1.0 : 0; voxBus.connect(master);
    noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    Voice.preload();
  } catch (e) { AC = null; }
}
function applyAudioSettings(){
  if (!AC) return; const t = AC.currentTime;
  sfxBus.gain.setTargetAtTime(SET.sound ? 0.85 : 0, t, 0.05);
  musBus.gain.setTargetAtTime(SET.music ? Music.level : 0, t, 0.1);
  voxBus.gain.setTargetAtTime(SET.voice ? 1.0 : 0, t, 0.05);
  if (!SET.voice) Voice.stop();
}
function noise(dur, type, freq, q, vol, attack, when, bus){
  if (!AC) return null; const t0 = AC.currentTime + (when || 0);
  const s = AC.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = AC.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + (attack || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f); f.connect(g); g.connect(bus || sfxBus); s.start(t0, Math.random()); s.stop(t0 + dur + 0.05);
  return {s, f, g};
}
function tone(freq, dur, type, vol, when, slideTo, bus){
  if (!AC) return; const t0 = AC.currentTime + (when || 0);
  const o = AC.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(bus || sfxBus); o.start(t0); o.stop(t0 + dur + 0.05);
}
const SFX = {
  zipStart(){ if (!AC || zip) return; const s = AC.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 6;
    const g = AC.createGain(); g.gain.value = 0.0001; s.connect(f); f.connect(g); g.connect(sfxBus); s.start(); zip = {s, f, g}; },
  zipSet(p){ if (!zip) return; const t = AC.currentTime; zip.f.frequency.setTargetAtTime(700 + p * 2600, t, 0.03); zip.g.gain.setTargetAtTime(0.04 + Math.min(1.4, p) * 0.22, t, 0.03); },
  zipStop(){ if (!zip) return; const z = zip; zip = null; const t = AC.currentTime; z.g.gain.setTargetAtTime(0.0001, t, 0.02); z.s.stop(t + 0.15); },
  pech(){ tone(220, 0.12, 'square', 0.12, 0, 440); noise(0.15, 'highpass', 3000, 1, 0.25); },
  snap(){ noise(0.18, 'highpass', 2500, 0.8, 0.6, 0.002); tone(160, 0.25, 'sine', 0.5, 0, 45); },
  cheer(big){ if (!AC) return; const n = noise(big ? 2.6 : 1.7, 'bandpass', 1300, 0.6, big ? 0.4 : 0.32, 0.25);
    if (n) { const l = AC.createOscillator(), lg = AC.createGain(); l.frequency.value = 7; lg.gain.value = 500; l.connect(lg); lg.connect(n.f.frequency); l.start(); l.stop(AC.currentTime + 2.7); }
    tone(1800, 0.35, 'sine', 0.08, 0.15, 2600); tone(2200, 0.3, 'sine', 0.06, 0.5, 3000); },
  kaipo(c){ const base = 523 * Math.pow(1.06, Math.min(6, c - 1) * 2); [0, 4, 7, 12].forEach((s, i) => tone(base * Math.pow(2, s / 12), 0.18, 'triangle', 0.16, i * 0.07)); },
  lose(){ tone(420, 0.6, 'sawtooth', 0.14, 0, 90); noise(0.25, 'lowpass', 600, 1, 0.3); },
  wind(){ noise(1.4, 'bandpass', 500, 0.8, 0.12, 0.5); },
  gust(){ noise(1.6, 'bandpass', 380, 0.7, 0.3, 0.3); },
  launch(){ tone(300, 0.3, 'triangle', 0.1, 0, 700); },
  boss(){ tone(110, 0.5, 'sawtooth', 0.15, 0, 90); tone(165, 0.5, 'sawtooth', 0.1, 0.12, 120); },
  win(){ [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => tone(523 * Math.pow(2, s/12), 0.25, 'triangle', 0.14, i * 0.09)); },
  fail(){ [7, 4, 0, -5].forEach((s, i) => tone(392 * Math.pow(2, s/12), 0.3, 'triangle', 0.12, i * 0.14)); },
  coo(){ tone(520, 0.12, 'sine', 0.08, 0, 380); tone(470, 0.15, 'sine', 0.07, 0.14, 360); noise(0.3, 'highpass', 4000, 1, 0.12); },
  tap(){ tone(880, 0.06, 'triangle', 0.09, 0, 1200); },
  coin(){ tone(1320, 0.08, 'square', 0.05, 0, 1760); tone(1760, 0.12, 'square', 0.05, 0.06, 2200); },
  star(i){ tone(660 * Math.pow(1.26, i), 0.25, 'triangle', 0.16, 0, 1320 * Math.pow(1.26, i)); noise(0.2, 'highpass', 5000, 1, 0.12); },
  buy(){ [0, 7, 12].forEach((s, i) => tone(660 * Math.pow(2, s/12), 0.14, 'triangle', 0.13, i * 0.06)); },
  alarm(){ tone(880, 0.12, 'square', 0.08, 0); tone(660, 0.12, 'square', 0.08, 0.15); },
  firework(){ if (!AC) return; tone(300, 0.6, 'sine', 0.04, 0, 1400); noise(0.5, 'lowpass', 1200, 0.7, 0.35, 0.002, 0.6); noise(0.9, 'highpass', 4000, 0.5, 0.12, 0.05, 0.65); },
};
function buzz(p){ try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }

// ---------- generated festive music: dhol + tasha + a little melody ----------
const Music = {
  on: false, level: 0.32, bpm: 118, step: 0, next: 0, timer: null, style: 'menu',
  // 16-step patterns: D = dhol bass, d = dhol treble, t = tasha
  pats: {
    menu:  {D: 'x..x..x...x..x..', d: '..x...x.x...x.x.', t: 'x.x.x.x.x.x.x.x.', mel: 1},
    play:  {D: 'x..x..x.x..x..x.', d: '..x.x...x.x.x.x.', t: 'xxx.xxx.xxx.xxx.', mel: 0},
    boss:  {D: 'x.xx..x.x.xx..x.', d: 'x.x.x.x.x.x.x.x.', t: 'xxxxxxxxxxxxxxxx', mel: 2},
    win:   {D: 'x...x...x...x...', d: '..x...x...x...x.', t: 'x.x.x.x.x.x.x.x.', mel: 1},
  },
  scale: [0, 2, 4, 7, 9, 12, 14, 16],
  phrase: [[0, 2], [2, 1], [4, 1], [3, 2], [2, 1], [1, 1], [0, 2], [4, 2], [5, 1], [4, 1], [3, 2], [2, 2], [1, 1], [0, 3]],
  start(style){
    if (!AC) return; this.style = style || 'menu'; this.bpm = this.style === 'boss' ? 134 : this.style === 'play' ? 124 : 112;
    this.level = this.style === 'menu' ? 0.32 : 0.22;
    if (musBus) musBus.gain.setTargetAtTime(SET.music ? this.level : 0, AC.currentTime, 0.2);
    if (this.on) return; this.on = true; this.step = 0; this.melPos = 0; this.melWait = 0; this.next = AC.currentTime + 0.08;
    const tick = () => { if (!this.on) return; this.schedule(); this.timer = setTimeout(tick, 60); }; tick();
  },
  stop(){ this.on = false; clearTimeout(this.timer); },
  duck(on){ if (!AC || !musBus) return; musBus.gain.setTargetAtTime(SET.music ? (on ? this.level * 0.35 : this.level) : 0, AC.currentTime, 0.15); },
  schedule(){
    const spb = 60 / this.bpm / 4; const P = this.pats[this.style] || this.pats.menu;
    while (this.next < AC.currentTime + 0.25) {
      const s = this.step % 16, t = this.next - AC.currentTime;
      if (P.D[s] === 'x') { this.dhol(t, true); }
      if (P.d[s] === 'x') { this.dhol(t, false); }
      if (P.t[s] === 'x') noise(0.05, 'highpass', 6500, 0.8, s % 4 === 0 ? 0.09 : 0.045, 0.002, t, musBus);
      if (P.mel && s % 2 === 0) {
        if (this.melWait <= 0) {
          const ph = this.phrase[this.melPos % this.phrase.length]; this.melPos++;
          const bar = Math.floor(this.step / 32) % 4, root = [0, 5, 7, 5][bar];
          const f = 293.66 * Math.pow(2, (this.scale[ph[0]] + (P.mel === 2 ? -12 : 0) + (root === 5 ? 0 : 0)) / 12);
          this.shehnai(f, t, ph[1] * spb * 2 * 0.95);
          this.melWait = ph[1];
        }
        this.melWait--;
      }
      this.step++; this.next += spb;
    }
  },
  dhol(t, bass){
    const t0 = AC.currentTime + t;
    const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(bass ? 105 : 210, t0); o.frequency.exponentialRampToValueAtTime(bass ? 48 : 150, t0 + (bass ? 0.22 : 0.09));
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(bass ? 0.9 : 0.35, t0 + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t0 + (bass ? 0.3 : 0.12));
    o.connect(g); g.connect(musBus); o.start(t0); o.stop(t0 + 0.35);
    noise(bass ? 0.06 : 0.04, 'bandpass', bass ? 400 : 1200, 1.2, bass ? 0.2 : 0.16, 0.002, t, musBus);
  },
  shehnai(f, t, dur){
    const t0 = AC.currentTime + t;
    const o = AC.createOscillator(), o2 = AC.createOscillator(), lfo = AC.createOscillator(), lg = AC.createGain(), flt = AC.createBiquadFilter(), g = AC.createGain();
    o.type = 'sawtooth'; o2.type = 'triangle'; o.frequency.value = f; o2.frequency.value = f * 2;
    lfo.frequency.value = 5.5; lg.gain.value = f * 0.012; lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
    flt.type = 'bandpass'; flt.frequency.value = 1400; flt.Q.value = 1.2;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.07, t0 + 0.04); g.gain.setValueAtTime(0.07, t0 + Math.max(0.05, dur - 0.06)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(flt); o2.connect(flt); flt.connect(g); g.connect(musBus);
    [o, o2, lfo].forEach(x => { x.start(t0); x.stop(t0 + dur + 0.05); });
  },
};

// ---------- voice clips (story lines, shouts, taunts) ----------
const VOICE_KEYS = ['p1','p2','p3','p4','p5','p6','p7','t1','t2','t3','c1','c2','c3','k1','k2','k3','q1','q2','q3','w1','w2','w3','n1','n2','n3','r1','r2','f1','f2','f3','f4','b1','b2','e1','e2','e3','e4','e5','e6','kp_a','kp_d','kp_m','tz_tiger','tz_pinky','tz_twins','tz_rohan','tz_b1','tz_b2','tz_b3','help'];
const Voice = {
  bufs: {}, loading: {}, cur: null, log: [], onend: null, lastShout: 0,
  load(k){
    if (this.bufs[k] || this.loading[k] || !AC) return this.loading[k];
    this.loading[k] = fetch('voice/' + k + '.mp3').then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(ab => new Promise((res, rej) => AC.decodeAudioData(ab, res, rej))).then(b => { this.bufs[k] = b; this.log.push({k, ev: 'loaded'}); return b; })
      .catch(e => { this.log.push({k, ev: 'error', e: String(e)}); delete this.loading[k]; return null; });
    return this.loading[k];
  },
  preload(){ // shouts + first scene first, the rest lazily
    ['kp_a', 'kp_d', 'kp_m', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'].forEach(k => this.load(k));
    setTimeout(() => VOICE_KEYS.forEach(k => this.load(k)), 2500);
  },
  stop(){ if (this.cur) { try { this.cur.src.onended = null; this.cur.src.stop(); } catch (e) {} this.cur = null; Music.duck(false); } },
  play(k, opts){
    opts = opts || {}; if (!AC) return false;
    if (!SET.voice) { this.log.push({k, ev: 'muted'}); if (opts.onend) setTimeout(opts.onend, 10); return false; }
    const go = b => {
      if (!b) { if (opts.onend) opts.onend(); return; }
      if (opts.token != null && opts.token !== this.token) return;
      this.stop();
      const src = AC.createBufferSource(); src.buffer = b; const g = AC.createGain(); g.gain.value = opts.vol || 1; src.connect(g); g.connect(voxBus);
      src.onended = () => { if (this.cur && this.cur.src === src) { this.cur = null; Music.duck(false); this.log.push({k, ev: 'ended'}); if (opts.onend) opts.onend(); } };
      src.start(); this.cur = {k, src, t0: AC.currentTime, dur: b.duration}; Music.duck(true); this.log.push({k, ev: 'play', dur: +b.duration.toFixed(2)});
    };
    if (this.bufs[k]) go(this.bufs[k]); else { const p = this.load(k); if (p) p.then(go); }
    return true;
  },
  talking(){ return !!this.cur && AC && AC.currentTime - this.cur.t0 < this.cur.dur; },
  shout(k){ // in-game short shout, rate limited, never interrupts a longer line
    if (!AC || !SET.voice) return; const now = AC.currentTime;
    if (now - this.lastShout < 2.2) return; if (this.cur && this.cur.dur > 2 && this.talking()) return;
    this.lastShout = now; this.play(k, {vol: 0.9});
  },
};
