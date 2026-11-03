// Village Fair — audio: SFX (prototype + new), generated fair music, voice clips
'use strict';
let AC = null, master = null, sfxBus = null, musBus = null, voxBus = null, noiseBuf = null;
const SET = {sound: true, music: true, voice: true, vib: true};
function initAudio(){
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = 0.8; master.connect(AC.destination);
    sfxBus = AC.createGain(); sfxBus.gain.value = SET.sound ? 0.8 : 0; sfxBus.connect(master);
    musBus = AC.createGain(); musBus.gain.value = 0; musBus.connect(master);
    voxBus = AC.createGain(); voxBus.gain.value = SET.voice ? 1.0 : 0; voxBus.connect(master);
    noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    Voice.preload();
  } catch (e) { AC = null; }
}
function applyAudioSettings(){
  if (!AC) return; const t = AC.currentTime;
  sfxBus.gain.setTargetAtTime(SET.sound ? 0.8 : 0, t, 0.05);
  musBus.gain.setTargetAtTime(SET.music && Music.on ? Music.level : 0, t, 0.1);
  voxBus.gain.setTargetAtTime(SET.voice ? 1.0 : 0, t, 0.05);
  if (!SET.voice) Voice.stop();
}
function tone(f, dur, type, vol, f2, delay, dest){
  if (!AC) return; type = type || 'sine'; vol = vol == null ? 0.2 : vol;
  const t = AC.currentTime + (delay || 0);
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest || sfxBus); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, freq, q, ftype, f2, delay, dest){
  if (!AC) return; vol = vol == null ? 0.2 : vol;
  const t = AC.currentTime + (delay || 0);
  const s = AC.createBufferSource(); s.buffer = noiseBuf;
  const fl = AC.createBiquadFilter(); fl.type = ftype || 'bandpass'; fl.frequency.setValueAtTime(freq || 1500, t); fl.Q.value = q || 1;
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = AC.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl); fl.connect(g); g.connect(dest || sfxBus); s.start(t); s.stop(t + dur + 0.02);
}
function buzzv(ms){ if (!SET.vib) return; try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }
const SFX = {
  whoosh(){ noise(0.22, 0.18, 600, 2, 'bandpass', 2600); },
  ringer(c){ const b = 660 * Math.pow(1.06, Math.min(c, 12)); tone(b, 0.12, 'triangle', 0.22); tone(b * 1.5, 0.18, 'triangle', 0.18, null, 0.07); noise(0.05, 0.1, 5000, 1, 'highpass'); },
  clink(){ tone(1800, 0.08, 'square', 0.05); tone(1200, 0.12, 'triangle', 0.08, 600); },
  pop(c){ noise(0.09, 0.35, 1800, 0.8, 'bandpass', 600); tone(500 + Math.min(c, 15) * 40, 0.08, 'sine', 0.18, 180); },
  boom(){ noise(0.45, 0.5, 900, 0.7, 'lowpass', 80); tone(140, 0.4, 'sine', 0.4, 40); },
  buzz(){ tone(150, 0.22, 'square', 0.09, 110); },
  catch_(c){ const b = 520 * Math.pow(1.06, Math.min(c, 12)); tone(b, 0.1, 'triangle', 0.2); tone(b * 2, 0.08, 'sine', 0.08, null, 0.03); },
  thud(){ tone(110, 0.2, 'sine', 0.35, 50); noise(0.12, 0.25, 400, 1, 'lowpass'); },
  gold(){ [0, 4, 7, 12, 16].forEach((s, i) => tone(880 * Math.pow(2, s / 12), 0.15, 'triangle', 0.15, null, i * 0.045)); },
  tick(){ tone(1400, 0.04, 'square', 0.06); },
  go(){ tone(523, 0.1, 'square', 0.1); tone(784, 0.2, 'square', 0.1, null, 0.1); },
  card(){ noise(0.3, 0.15, 400, 1.5, 'bandpass', 3000); tone(392, 0.12, 'triangle', 0.15, null, 0.05); tone(587, 0.18, 'triangle', 0.15, null, 0.15); },
  timeup(){ tone(784, 0.15, 'square', 0.1); tone(523, 0.3, 'square', 0.1, null, 0.15); },
  fanfare(){ [[523, 0], [659, .14], [784, .28], [1047, .42], [784, .62], [1047, .76]].forEach(([f, d]) => { tone(f, 0.3, 'square', 0.08, null, d); tone(f / 2, 0.3, 'triangle', 0.12, null, d); }); noise(1.2, 0.12, 3000, 0.5, 'highpass', null, 0.4); },
  sad(){ [[392, 0], [370, .2], [349, .4], [330, .6]].forEach(([f, d]) => tone(f, 0.35, 'triangle', 0.14, null, d)); },
  // new games
  shot(){ noise(0.06, 0.4, 2500, 0.7, 'bandpass', 900); tone(220, 0.06, 'square', 0.08, 90); },
  clang(c){ const b = 900 * Math.pow(1.05, Math.min(c, 12)); tone(b, 0.18, 'square', 0.06); tone(b * 1.51, 0.25, 'triangle', 0.12, null, 0.01); noise(0.08, 0.15, 6000, 1, 'highpass'); },
  squeak(){ tone(900, 0.12, 'sine', 0.2, 1500); tone(1500, 0.15, 'sine', 0.15, 700, 0.12); },
  drop(){ tone(300, 0.08, 'triangle', 0.12, 200); },
  stack(q){ tone(180, 0.12, 'sine', 0.35, 90); noise(0.08, 0.2, 600, 1, 'lowpass'); if (q) { const b = 660 * Math.pow(1.06, Math.min(q, 14)); tone(b, 0.12, 'triangle', 0.18, null, 0.03); tone(b * 1.5, 0.2, 'triangle', 0.14, null, 0.09); } },
  crumble(){ noise(0.6, 0.35, 500, 0.8, 'lowpass', 100); tone(160, 0.5, 'sine', 0.25, 50); },
  ticket(c){ const b = 740 * Math.pow(1.05, Math.min(c, 12)); tone(b, 0.07, 'square', 0.06); tone(b * 1.26, 0.1, 'triangle', 0.14, null, 0.04); },
  bump(){ noise(0.25, 0.45, 300, 1, 'lowpass', 80); tone(90, 0.25, 'square', 0.12, 50); tone(520, 0.12, 'square', 0.05, 380, 0.05); },
  honk(){ tone(415, 0.16, 'square', 0.07); tone(523, 0.16, 'square', 0.05); },
  monkey(){ [0, .09, .18].forEach((d, i) => tone(1200 + i * 200, 0.07, 'sawtooth', 0.05, 1800, d)); },
  dha(v){ tone(95, 0.28, 'sine', 0.55 * (v || 1), 50); noise(0.05, 0.25 * (v || 1), 250, 1, 'lowpass'); },
  tin(v){ noise(0.07, 0.3 * (v || 1), 2600, 1.5, 'bandpass'); tone(380, 0.09, 'triangle', 0.12 * (v || 1), 300); },
  miss(){ tone(200, 0.12, 'sawtooth', 0.06, 150); },
  spinTick(){ tone(1800, 0.025, 'square', 0.05); },
  coin(){ tone(988, 0.08, 'square', 0.07); tone(1319, 0.2, 'square', 0.07, null, 0.08); },
  firework(){ noise(0.9, 0.35, 1200, 0.5, 'lowpass', 120); tone(70, 0.6, 'sine', 0.3, 35); for (let i = 0; i < 6; i++) noise(0.05, 0.12, 5000, 1, 'highpass', null, 0.35 + Math.random() * 0.5); },
  whistle(){ tone(600, 0.6, 'sine', 0.06, 2400); },
  ui(){ tone(660, 0.05, 'triangle', 0.12); },
};
// ---- Music: generated fair tunes (dhol groove + reedy lead), one flavour per night ----
const Music = {
  on: false, level: 0.32, timer: null, step: 0, next: 0, style: 0, ducked: false,
  STY: [ // bpm, root(Hz), melody (scale degrees, -1 rest), lead wave
    {bpm: 150, root: 261.6, mel: [0, 2, 4, 5, 4, 2, 4, -1, 7, 5, 4, 2, 4, 2, 0, -1], wave: 'square'},
    {bpm: 156, root: 293.7, mel: [4, -1, 4, 5, 7, 5, 4, 2, 0, 2, 4, -1, 2, 1, 0, -1], wave: 'square'},
    {bpm: 144, root: 246.9, mel: [0, 4, 7, 4, 9, 7, 4, -1, 5, 4, 2, 4, 0, -1, 2, -1], wave: 'triangle'},
    {bpm: 162, root: 277.2, mel: [7, 5, 4, 5, 7, -1, 9, 7, 5, 4, 2, 4, 5, 4, 2, -1], wave: 'square'},
    {bpm: 168, root: 311.1, mel: [0, 2, 4, 7, 9, 7, 4, 2, 4, 7, 9, 11, 12, -1, 7, -1], wave: 'sawtooth'},
  ],
  SC: [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24],
  start(style, dholOnly){
    if (!AC) return; this.style = style || 0; this.dholOnly = !!dholOnly; this.on = true;
    musBus.gain.cancelScheduledValues(AC.currentTime);
    musBus.gain.setTargetAtTime(SET.music ? this.level : 0, AC.currentTime, 0.3);
    if (this.timer) return;
    this.step = 0; this.next = AC.currentTime + 0.06;
    this.timer = setInterval(() => this.tick(), 50);
  },
  stop(){ this.on = false; if (this.timer) { clearInterval(this.timer); this.timer = null; } if (AC) musBus.gain.setTargetAtTime(0, AC.currentTime, 0.1); },
  duck(on){ if (!AC || !this.on) return; this.ducked = on; musBus.gain.setTargetAtTime(SET.music ? (on ? this.level * 0.3 : this.level) : 0, AC.currentTime, 0.15); },
  beatLen(){ return 60 / this.STY[this.style].bpm / 2; },
  tick(){
    if (!AC) return; const S = this.STY[this.style], bl = 60 / S.bpm / 2;
    while (this.next < AC.currentTime + 0.25) {
      const st = this.step % 16, bar = Math.floor(this.step / 16) % 4, d = this.next - AC.currentTime;
      // dhol: dha on 0,3,6,10,12 ; tin on 2,4,8,11,14
      if ([0, 3, 6, 10, 12].includes(st)) { tone(92, 0.24, 'sine', st === 0 ? 0.5 : 0.36, 52, d, musBus); }
      if ([2, 4, 8, 11, 14].includes(st)) { noise(0.06, 0.16, 2600, 1.5, 'bandpass', null, d, musBus); }
      if (st % 2 === 1) noise(0.03, 0.05, 7000, 1, 'highpass', null, d, musBus); // manjira shimmer
      if (!this.dholOnly) {
        const root = S.root * Math.pow(2, [0, 5, 7, 0][bar] / 12) / 2;
        if (st % 4 === 0) tone(root, 0.2, 'triangle', 0.18, null, d, musBus);
        if (st % 2 === 0) {
          const m = S.mel[(st / 2 + bar * 3) % 16];
          if (m >= 0) { const f = S.root * Math.pow(2, this.SC[m] / 12); tone(f, bl * 1.8, S.wave, 0.035, null, d, musBus); tone(f * 1.003, bl * 1.8, 'triangle', 0.05, null, d, musBus); }
        }
      }
      this.step++; this.next += bl;
    }
  },
};
// ---- Voice clips (story lines, shouts) ----
const VOICE_KEYS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'k1', 'k2', 'c1', 'c2', 'c3', 'w1', 'w2', 'h1', 'h2', 'h3', 'h4', 'h5', 'g1', 'g2', 'g3', 'g4', 'b1', 'b2', 'f1', 'f2', 'f3', 'f4', 'x1', 'x2', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 's_great', 's_combo', 's_gold', 's_champ', 's_close', 'z_kabir', 'z_twins', 'z_hasmukh', 'z_bandu', 'z_lalu'];
const Voice = {
  bufs: {}, loading: {}, cur: null, log: [], lastShout: 0, token: 0,
  load(k){
    if (this.bufs[k] || this.loading[k] || !AC) return this.loading[k];
    this.loading[k] = fetch('voice/' + k + '.mp3').then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(ab => new Promise((res, rej) => AC.decodeAudioData(ab, res, rej))).then(b => { this.bufs[k] = b; this.log.push({k, ev: 'loaded'}); return b; })
      .catch(e => { this.log.push({k, ev: 'error', e: String(e)}); delete this.loading[k]; return null; });
    return this.loading[k];
  },
  preload(){ ['p1', 'p2', 'p3', 's_great', 's_combo', 's_gold'].forEach(k => this.load(k)); setTimeout(() => VOICE_KEYS.forEach(k => this.load(k)), 2500); },
  stop(){ if (this.cur) { try { this.cur.src.onended = null; this.cur.src.stop(); } catch (e) {} this.cur = null; Music.duck(false); } },
  play(k, opts){
    opts = opts || {}; if (!AC) { if (opts.onend) setTimeout(opts.onend, 10); return false; }
    if (!SET.voice) { this.log.push({k, ev: 'muted'}); if (opts.onend) setTimeout(opts.onend, 10); return false; }
    const tok = opts.token;
    const go = b => {
      if (tok != null && tok !== this.token) return;
      if (!b) { if (opts.onend) opts.onend(); return; }
      this.stop();
      const src = AC.createBufferSource(); src.buffer = b; const g = AC.createGain(); g.gain.value = opts.vol || 1; src.connect(g); g.connect(voxBus);
      src.onended = () => { if (this.cur && this.cur.src === src) { this.cur = null; Music.duck(false); this.log.push({k, ev: 'ended'}); if (opts.onend) opts.onend(); } };
      src.start(); this.cur = {k, src, t0: AC.currentTime, dur: b.duration}; Music.duck(true); this.log.push({k, ev: 'play', dur: +b.duration.toFixed(2)});
    };
    if (this.bufs[k]) go(this.bufs[k]); else { const p = this.load(k); if (p) p.then(go); else go(null); }
    return true;
  },
  talking(){ return !!this.cur && AC && AC.currentTime - this.cur.t0 < this.cur.dur; },
  shout(k){
    if (!AC || !SET.voice) return; const now = AC.currentTime;
    if (now - this.lastShout < 3) return; if (this.talking()) return;
    this.lastShout = now; this.play(k, {vol: 0.9});
  },
};
