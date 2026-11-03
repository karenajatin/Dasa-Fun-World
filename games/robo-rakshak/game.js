// Robo Rakshak 2050 — playable prototype (one level, two rounds)
'use strict';
(function(){
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const $ = id => document.getElementById(id);
let DPR = 1, SC = 1, OX = 0, W = 400, H = 800, GROUND = 520, BTN = {x: 200, y: 700, r: 46};
let bgCanvas = null;

// ---------- tuning ----------
const MOVES = {
  jab1:  {su: .05, act: .07, rec: .12, dmg: 5,  push: 10, stun: .30, hs: .045, reach: 112, meter: 3},
  jab2:  {su: .05, act: .07, rec: .12, dmg: 6,  push: 12, stun: .32, hs: .05,  reach: 112, meter: 3},
  upper: {su: .09, act: .09, rec: .24, dmg: 13, push: 58, stun: .55, hs: .1,   reach: 110, meter: 6, heavy: true},
  air:   {su: .04, act: .08, rec: .10, dmg: 6,  push: 8,  stun: .3,  hs: .05,  reach: 118, meter: 3, air: true},
  launch:{su: .03, act: .16, rec: .0,  dmg: 10, push: 14, stun: .6,  hs: .09,  reach: 120, meter: 6, heavy: true},
};
const ROUNDS = [
  {name: 'RAKSHAS-X', hp: 300, size: 1.08, time: 60, burstAt: 5, cool: [1.2, 2.0], first: 2.4, walk: 70,
   body: '#5c6270', dark: '#363a45', acc: '#ff3b3b',
   attacks: {claw: {w: .62, dmg: 10, wt: 5}, double: {w: .62, dmg: 6, wt: 3}, rush: {w: .72, dmg: 12, wt: 2}}},
  {name: 'MAHA-DAITYA', hp: 470, size: 1.42, time: 90, burstAt: 4, cool: [1.0, 1.7], first: 2.0, walk: 62, boss: true,
   body: '#6e2a3c', dark: '#3d1622', acc: '#ffb000',
   attacks: {claw: {w: .58, dmg: 12, wt: 4}, double: {w: .58, dmg: 7, wt: 2}, rush: {w: .66, dmg: 14, wt: 2}, slam: {w: .85, dmg: 16, wt: 3}}},
];
const PLAYER_HP = 100;
const WS = 1.18, PMIN = 72; // world draw scale around (200, GROUND); left wall
function emax(){ return 200 + (400 - 64 * E.R.size * WS - 200) / WS; }

// ---------- state ----------
let G = null, mode = 'title', P = null, E = null;
let fx = [], pops = [], waves = [], rocket = null, bigText = null, hint = null;
let shake = 0, hsT = 0, slowT = 0, slowScale = 1, flashT = 0, redT = 0, last = 0, realT = 0;
const events = [];
function ev(type, data){ events.push(Object.assign({t: G ? +G.t.toFixed(2) : 0, rt: +realT.toFixed(2), type}, data||{})); if (events.length > 600) events.shift(); }

// ---------- layout ----------
function resize(){
  DPR = Math.min(2, window.devicePixelRatio || 1);
  const vw = innerWidth, vh = innerHeight;
  const gw = Math.min(vw, vh * 0.62);
  SC = gw / 400; W = 400; H = vh / SC; OX = (vw - gw) / 2;
  cv.width = Math.round(vw * DPR); cv.height = Math.round(vh * DPR);
  cv.style.width = vw + 'px'; cv.style.height = vh + 'px';
  GROUND = Math.round(Math.min(H * 0.64, H - 250));
  BTN = {x: 200, y: H - 96, r: 46};
  buildBg();
}
addEventListener('resize', resize);

// ---------- math ----------
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const ease = t => 1 - (1 - t) * (1 - t);

// ---------- audio ----------
const A = {c: null, out: null, nb: null};
function audioInit(){
  if (A.c) { if (A.c.state === 'suspended') A.c.resume(); return; }
  try {
    A.c = new (window.AudioContext || window.webkitAudioContext)();
    const comp = A.c.createDynamicsCompressor(); comp.connect(A.c.destination);
    A.out = A.c.createGain(); A.out.gain.value = .6; A.out.connect(comp);
    const n = A.c.sampleRate; A.nb = A.c.createBuffer(1, n, n); const d = A.nb.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { A.c = null; }
}
function tone(f, dur, type, vol, f2, delay){
  if (!A.c) return; const t = A.c.currentTime + (delay || 0);
  const o = A.c.createOscillator(), g = A.c.createGain(); o.type = type || 'sine';
  o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  o.connect(g); g.connect(A.out); o.start(t); o.stop(t + dur + .02);
}
function noise(dur, vol, ft, f, q, f2, delay){
  if (!A.c) return; const t = A.c.currentTime + (delay || 0);
  const s = A.c.createBufferSource(); s.buffer = A.nb; const fl = A.c.createBiquadFilter(); fl.type = ft || 'lowpass';
  fl.frequency.setValueAtTime(f || 1000, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur); fl.Q.value = q || 1;
  const g = A.c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  s.connect(fl); fl.connect(g); g.connect(A.out); s.start(t, Math.random() * .5); s.stop(t + dur + .02);
}
const sfx = {
  jab(){ noise(.07, .55, 'bandpass', 2600, 1.4); tone(240, .08, 'square', .16, 110); tone(1250 + Math.random()*300, .09, 'triangle', .08); },
  heavy(){ noise(.18, .7, 'lowpass', 2200, 1, 300); tone(140, .22, 'square', .25, 45); tone(900, .2, 'triangle', .12, 500); },
  whiff(){ noise(.1, .16, 'bandpass', 700, .9, 2400); },
  block(){ tone(1500, .16, 'triangle', .22); tone(2250, .12, 'sine', .14); noise(.05, .2, 'highpass', 3000); },
  counter(){ tone(1800, .25, 'triangle', .26); tone(2700, .3, 'sine', .16); tone(300, .3, 'square', .18, 900); noise(.25, .4, 'lowpass', 3000, 1, 200); },
  hurt(){ tone(170, .2, 'sawtooth', .26, 55); noise(.14, .45, 'lowpass', 1400, 1, 300); },
  alarm(){ tone(920, .07, 'square', .1); tone(920, .07, 'square', .1, 0, .11); },
  jump(){ noise(.22, .25, 'highpass', 900, .7, 4000); tone(300, .15, 'sine', .08, 600); },
  dash(){ noise(.16, .28, 'bandpass', 1800, .8, 600); },
  boom(){ tone(95, .6, 'sine', .7, 28); noise(.5, .6, 'lowpass', 900, 1, 80); },
  charge(){ tone(180, .5, 'sawtooth', .16, 1100); tone(360, .5, 'square', .06, 2200); },
  slam(){ tone(70, .7, 'sine', .8, 25); noise(.6, .7, 'lowpass', 500, 1, 60); },
  ko(){ tone(110, 1.2, 'sine', .8, 22); noise(1, .7, 'lowpass', 1500, 1, 60); tone(600, .8, 'sawtooth', .12, 80, .05); },
  fight(){ tone(440, .12, 'square', .14); tone(660, .12, 'square', .14, 0, .12); tone(880, .3, 'square', .16, 0, .24); },
  win(){ [523, 659, 784, 1046].forEach((f, i) => tone(f, .35, 'square', .12, 0, i * .13)); },
  lose(){ [392, 330, 262, 196].forEach((f, i) => tone(f, .4, 'triangle', .16, 0, i * .18)); },
  ready(){ tone(660, .1, 'triangle', .14); tone(990, .18, 'triangle', .14, 0, .1); },
};
function vib(p){ try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }

// ---------- background (pre-rendered) ----------
function buildBg(){
  bgCanvas = document.createElement('canvas');
  bgCanvas.width = Math.round(400 * SC * DPR); bgCanvas.height = Math.round(H * SC * DPR);
  const b = bgCanvas.getContext('2d'); b.scale(SC * DPR, SC * DPR);
  const g = b.createLinearGradient(0, 0, 0, GROUND);
  g.addColorStop(0, '#1b1440'); g.addColorStop(.45, '#4a2a72'); g.addColorStop(.8, '#d4566a'); g.addColorStop(1, '#ff9a5c');
  b.fillStyle = g; b.fillRect(0, 0, 400, GROUND);
  b.fillStyle = 'rgba(255,255,255,.7)';
  for (let i = 0; i < 40; i++) { const x = (i * 97) % 400, y = (i * 53) % (GROUND * .4); b.fillRect(x, y, 1.5, 1.5); }
  b.fillStyle = '#ffd27a'; b.beginPath(); b.arc(300, GROUND - 120, 46, 0, 7); b.fill();
  b.fillStyle = 'rgba(255,210,122,.25)'; b.beginPath(); b.arc(300, GROUND - 120, 70, 0, 7); b.fill();
  b.fillStyle = '#3a2459';
  let x = 0, s = 7;
  while (x < 400) { s = (s * 9301 + 49297) % 233280; const w = 18 + (s % 22), h = 60 + (s % 110); b.fillRect(x, GROUND - 40 - h, w, h + 40); x += w + 2; }
  b.fillRect(60, GROUND - 260, 22, 260); b.fillRect(66, GROUND - 300, 10, 40);
  b.beginPath(); b.arc(71, GROUND - 230, 22, 0, 7); b.fill();
  b.strokeStyle = '#5a3a7d'; b.lineWidth = 4; b.beginPath(); b.moveTo(130, GROUND - 52); b.quadraticCurveTo(220, GROUND - 110, 310, GROUND - 52); b.stroke();
  for (let i = 0; i < 8; i++) { const t = (i + .5) / 8; const px = 130 + 180 * t, py = GROUND - 52 - Math.sin(t * Math.PI) * 29; b.lineWidth = 1.5; b.beginPath(); b.moveTo(px, py); b.lineTo(px, GROUND - 52); b.stroke(); }
  x = -10; s = 31;
  while (x < 410) {
    s = (s * 9301 + 49297) % 233280; const w = 34 + (s % 30), h = 70 + (s % 90);
    b.fillStyle = '#261841'; b.fillRect(x, GROUND - h, w, h);
    b.fillStyle = '#2f1f52'; b.fillRect(x, GROUND - h, w, 5);
    for (let wy = GROUND - h + 12; wy < GROUND - 10; wy += 12) for (let wx = x + 6; wx < x + w - 6; wx += 9) {
      s = (s * 9301 + 49297) % 233280; if (s % 3 === 0) { b.fillStyle = s % 2 ? '#ffcf6b' : '#5ff0ff'; b.globalAlpha = .55; b.fillRect(wx, wy, 4, 5); b.globalAlpha = 1; }
    }
    x += w + 4;
  }
  const fg = b.createLinearGradient(0, GROUND, 0, H); fg.addColorStop(0, '#2c2f45'); fg.addColorStop(1, '#14152a');
  b.fillStyle = fg; b.fillRect(0, GROUND, 400, H - GROUND);
  b.fillStyle = '#ffb000'; b.fillRect(0, GROUND, 400, 5);
  b.fillStyle = '#1b1b26'; for (let i = -20; i < 420; i += 28) { b.beginPath(); b.moveTo(i, GROUND); b.lineTo(i + 12, GROUND); b.lineTo(i + 8, GROUND + 5); b.lineTo(i - 4, GROUND + 5); b.fill(); }
  b.strokeStyle = 'rgba(95,240,255,.12)'; b.lineWidth = 1;
  for (let i = 0; i < 9; i++) { b.beginPath(); b.moveTo(200 + (i - 4) * 30, GROUND + 6); b.lineTo(200 + (i - 4) * 120, H); b.stroke(); }
  for (let y = GROUND + 20, k = 1; y < H; y += 14 * k, k *= 1.3) { b.beginPath(); b.moveTo(0, y); b.lineTo(400, y); b.stroke(); }
}

// ---------- game setup ----------
function newGame(){
  G = {t: 0, round: 0, timer: 0, stats: {hits: 0, maxCombo: 0, counters: 0, specials: 0, time: 0},
       combo: 0, comboT: 0, meter: 0, firstSeen: {}, hintsDone: {}};
  setupRound(0);
}
function setupRound(r){
  const R = ROUNDS[r];
  G.round = r; G.timer = R.time; G.meter = Math.min(G.meter || 0, 60); G.combo = 0; G.t = 0;
  P = {x: 140, y: 0, vx: 0, vy: 0, hp: PLAYER_HP, state: 'idle', st: 0, move: null, mt: 0, buffer: false, hitDone: false,
       comboStep: 0, lastAtkEnd: -9, blockHeld: blockTouches > 0, blockStart: -9, iframes: 0, flash: 0, counterT: 0, launcher: false, walkPh: 0, fistOut: false, idleT: 0, stun: 0, dashDir: 0};
  E = {x: 250, y: 0, vx: 0, vy: 0, hp: R.hp, maxHp: R.hp, R, state: 'idle', st: 0, atk: null, cool: R.first, flash: 0,
       comboHits: 0, airHits: 0, hitDone: 0, inv: 0, dodged: false, walkPh: 0, tilt: 0, rushDist: 0, wind: 1, rec: .5, stun: 0, lastAtk: null};
  fx = []; pops = []; waves = []; rocket = null; bigText = null; hint = null; ghost.p = 1; ghost.e = 1;
  mode = 'intro'; G.introT = 0; sfx.fight();
  ev('round_start', {round: r + 1, enemy: R.name});
}

// ---------- input ----------
const touches = new Map(); let blockTouches = 0;
function toLocal(cx, cy){ return {x: (cx - OX) / SC, y: cy / SC}; }
function canAct(){ return mode === 'fight' && P && P.state !== 'ko'; }
function onDown(id, cx, cy){
  const p = toLocal(cx, cy);
  const T = {sx: p.x, sy: p.y, t0: performance.now(), action: 'none'};
  touches.set(id, T);
  if (!canAct()) return;
  if (Math.hypot(p.x - BTN.x, p.y - BTN.y) < BTN.r + 8) { T.action = 'button'; doSpecial(); return; }
  if (p.x >= 200) { T.action = 'punch'; doPunch(); }
  else { T.action = 'block'; blockTouches++; setBlock(); }
}
function onMove(id, cx, cy){
  const T = touches.get(id); if (!T || T.action === 'swiped' || T.action === 'button') return;
  const p = toLocal(cx, cy), dx = p.x - T.sx, dy = p.y - T.sy;
  if (performance.now() - T.t0 > 450) return;
  if (Math.hypot(dx, dy) < 34) return;
  if (T.action === 'block') { blockTouches = Math.max(0, blockTouches - 1); setBlock(); }
  T.action = 'swiped';
  if (!canAct()) return;
  if (-dy > Math.abs(dx) * .8) doJump();
  else if (dx < 0 && Math.abs(dx) > Math.abs(dy)) doDash(-1);
  else if (dx > 0 && Math.abs(dx) > Math.abs(dy)) doDash(1);
}
function onUp(id){
  const T = touches.get(id); touches.delete(id);
  if (T && T.action === 'block') { blockTouches = Math.max(0, blockTouches - 1); setBlock(); }
}
cv.addEventListener('touchstart', e => { e.preventDefault(); audioInit(); for (const t of e.changedTouches) onDown(t.identifier, t.clientX, t.clientY); }, {passive: false});
cv.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) onMove(t.identifier, t.clientX, t.clientY); }, {passive: false});
cv.addEventListener('touchend', e => { e.preventDefault(); for (const t of e.changedTouches) onUp(t.identifier); }, {passive: false});
cv.addEventListener('touchcancel', e => { for (const t of e.changedTouches) onUp(t.identifier); });
let mouseDown = false;
cv.addEventListener('mousedown', e => { audioInit(); mouseDown = true; onDown('m', e.clientX, e.clientY); });
addEventListener('mousemove', e => { if (mouseDown) onMove('m', e.clientX, e.clientY); });
addEventListener('mouseup', () => { if (mouseDown) { mouseDown = false; onUp('m'); } });
// keyboard (desktop): J punch, W jump, A dodge, D dash in, S hold shield, K special
const keyHeld = {};
addEventListener('keydown', e => {
  if (e.repeat) return; const k = e.key.toLowerCase(); audioInit();
  if (!canAct()) return;
  if (k === 'j' || k === ' ') doPunch();
  else if (k === 'w' || k === 'arrowup') doJump();
  else if (k === 'a' || k === 'arrowleft') doDash(-1);
  else if (k === 'd' || k === 'arrowright') doDash(1);
  else if (k === 'k') doSpecial();
  else if ((k === 's' || k === 'arrowdown') && !keyHeld.s) { keyHeld.s = true; blockTouches++; setBlock(); }
});
addEventListener('keyup', e => { const k = e.key.toLowerCase(); if ((k === 's' || k === 'arrowdown') && keyHeld.s) { keyHeld.s = false; blockTouches = Math.max(0, blockTouches - 1); setBlock(); } });

function setBlock(){
  if (!P) return;
  const held = blockTouches > 0;
  if (held && !P.blockHeld) { P.blockHeld = true; if (P.state === 'idle' || P.state === 'walk') enterBlock(); }
  else if (!held && P.blockHeld) { P.blockHeld = false; if (P.state === 'block') setP('idle'); }
}
function enterBlock(){ setP('block'); P.blockStart = G.t; ev('block_up'); doneHint('block'); }
function setP(s){ P.state = s; P.st = 0; }

function doPunch(){
  if (!canAct()) return;
  const s = P.state;
  if (s === 'hit' || s === 'special') return;
  if (s === 'atk' || s === 'dash') { P.buffer = true; return; }
  if (s === 'jump') { if (!P.move) startMove('air'); else P.buffer = true; return; }
  const step = (G.t - P.lastAtkEnd < .4 && P.comboStep > 0 && P.comboStep < 3) ? P.comboStep + 1 : 1;
  startMove(step === 1 ? 'jab1' : step === 2 ? 'jab2' : 'upper');
}
function startMove(name){
  const m = MOVES[name];
  P.move = name; P.mt = 0; P.hitDone = false; P.buffer = false;
  if (name === 'air') { ev('punch', {move: name}); return; }
  setP('atk');
  P.comboStep = name === 'jab1' ? 1 : name === 'jab2' ? 2 : 3;
  const gap = E.x - P.x;
  P.vx = (gap > m.reach - 12 && gap < 240) ? clamp((gap - 92) / (m.su + m.act * .5), 0, 760) : 0; // lunge in
  ev('punch', {move: name});
}
function doJump(){
  if (!canAct()) return;
  if (P.state === 'hit' || P.state === 'special' || P.state === 'jump') return;
  const gap = E.x - P.x;
  setP('jump'); P.vy = 660; P.y = .1; P.move = null; P.buffer = false; P.vx = 0;
  P.launcher = gap < MOVES.launch.reach + 20 && E.state !== 'down' && E.state !== 'ko';
  if (P.launcher) { P.move = 'launch'; P.mt = 0; P.hitDone = false; P.vx = clamp((gap - 88) / .12, -100, 500); }
  sfx.jump(); ev('jump', {launcher: P.launcher}); doneHint('jump'); doneHint('jumprush');
}
function doDash(dir){
  if (!canAct()) return;
  if (P.state === 'hit' || P.state === 'special' || P.state === 'jump') return;
  setP('dash'); P.dashDir = dir; P.move = null; P.buffer = false;
  P.vx = dir < 0 ? -560 : 520; if (dir < 0) P.iframes = .26;
  sfx.dash(); ev('dash', {dir}); if (dir < 0) doneHint('dodge');
}
function doSpecial(){
  if (!canAct()) return;
  if (G.meter < 100) { pop('CHARGING…', BTN.x, BTN.y - 66, '#aab', 15, .6); return; }
  if (P.state === 'special') return;
  G.meter = 0; setP('special'); P.move = null; P.y = 0; P.vy = 0; P.vx = 0; P.fistOut = false; P.iframes = 1.4;
  slowT = .55; slowScale = .25; shake = Math.max(shake, 6); flashT = .12;
  big('ROCKET FIST!', '#ffb000', .9);
  sfx.charge(); vib([40, 30, 40]); G.stats.specials++; ev('special'); doneHint('special');
}

// ---------- hints (tiny contextual tutorial) ----------
function showHint(key, text, side){ if (!G || G.hintsDone[key] || (hint && hint.key === key)) return; hint = {key, text, side, t: 0}; }
function doneHint(key){ if (!G) return; G.hintsDone[key] = true; if (hint && hint.key === key) hint = null; }

// ---------- fx helpers ----------
function sparks(x, y, n, dir, col, lm){ lm = lm || 1;
  for (let i = 0; i < n; i++) { const a = (dir < 0 ? Math.PI : 0) + rnd(-1.2, 1.2), sp = rnd(180, 620);
    fx.push({k: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, life: rnd(.18, .4) * lm, max: .4 * lm, col: col || (Math.random() < .5 ? '#fff6a8' : '#ffb000')}); }
}
function bolts(x, y, n, dir){
  for (let i = 0; i < n; i++) fx.push({k: 'bolt', x, y, vx: dir * rnd(60, 260), vy: rnd(-420, -160), r: rnd(0, 6), vr: rnd(-14, 14), life: rnd(.9, 1.5), max: 1.5, s: rnd(3, 6), hex: Math.random() < .5});
}
function ring(x, y, col, r1){ fx.push({k: 'ring', x, y, r: 6, vr: r1 || 420, life: .3, max: .3, col: col || '#fff'}); }
function smoke(x, y, n){ for (let i = 0; i < n; i++) fx.push({k: 'smoke', x: x + rnd(-30, 30), y: y + rnd(-30, 30), vx: rnd(-40, 40), vy: rnd(-90, -30), r: rnd(10, 22), life: rnd(.6, 1.2), max: 1.2}); }
function pop(text, x, y, col, size, life){ pops.push({text, x, y, col: col || '#fff', size: size || 20, life: life || .8, max: life || .8, vy: -70}); }
function big(text, col, life, size){ bigText = {text, col, life, max: life, size: size || 46}; }
function hitstop(t){ hsT = Math.max(hsT, t); }

// ---------- combat ----------
function contactPoint(){ return {x: (P.x + E.x) / 2 + 8, y: GROUND - Math.max(P.y, E.y) - 110}; }
function resolvePlayerHit(name){
  const m = MOVES[name], gap = E.x - P.x;
  const dyOK = m.air ? Math.abs(E.y - P.y) < 130 : (name === 'upper' || name === 'launch' ? E.y < 170 : E.y < 120);
  if (gap > m.reach || !dyOK || E.state === 'down' || E.state === 'ko' || E.inv > 0) { sfx.whiff(); ev('whiff', {move: name, gap: Math.round(gap)}); return false; }
  let dmg = m.dmg; const counter = P.counterT > 0;
  if (counter) dmg = Math.round(dmg * 1.5);
  hitEnemy(dmg, m, name, counter);
  return true;
}
function hitEnemy(dmg, m, name, counter){
  if (E.state === 'windup' && !(name === 'special' || counter)) dmg = Math.max(1, Math.round(dmg * .5));
  E.hp = Math.max(0, E.hp - dmg); E.flash = .06;
  const c = contactPoint(); if (name === 'special') { c.x = E.x - 30; c.y = GROUND - E.y - 100 * E.R.size; }
  sparks(c.x, c.y, m.heavy ? 26 : 12, 1, null, m.heavy ? 1.5 : 1); bolts(c.x, c.y, m.heavy ? 6 : 2, 1); ring(c.x, c.y, m.heavy ? '#ffb000' : '#fff', m.heavy ? 520 : 360);
  pop(String(dmg), c.x + rnd(-10, 14), c.y - 20, counter ? '#ff9f1a' : '#fff', m.heavy ? 30 : 22);
  shake = Math.max(shake, m.heavy ? 11 : 5); hitstop(m.hs);
  if (m.heavy) { sfx.heavy(); vib(45); } else { sfx.jab(); vib(18); }
  G.meter = Math.min(100, G.meter + m.meter * (counter ? 1.5 : 1));
  G.combo++; G.comboT = 1.3; G.stats.hits++; G.stats.maxCombo = Math.max(G.stats.maxCombo, G.combo);
  E.comboHits++;
  doneHint('punch');
  ev('hit', {move: name, dmg, ehp: E.hp, combo: G.combo, estate: E.state});
  if (E.hp <= 0) { enemyKO(); return; }
  const armored = E.state === 'windup' && !(name === 'special' || counter);
  if (armored) { pop('ARMOR', E.x, GROUND - E.y - 190 * E.R.size, '#ff6b6b', 14, .5); return; }
  if (E.state === 'windup' || E.state === 'attack') { pop('INTERRUPT!', E.x, GROUND - 200 * E.R.size, '#5ff0ff', 20); E.atk = null; }
  if (name === 'launch') { E.state = 'air'; E.st = 0; E.vy = 640; E.y = Math.max(E.y, 1); E.airHits = 0; E.vx = 30; }
  else if (name === 'special') { E.state = 'air'; E.st = 0; E.vy = 520; E.y = Math.max(E.y, 1); E.vx = 260; E.airHits = 9; }
  else if (E.y > 0 || E.state === 'air') { E.state = 'air'; E.airHits++; if (E.airHits <= 4) E.vy = Math.max(E.vy, 300); E.vx = 40; }
  else { E.state = 'hit'; E.st = 0; E.stun = m.stun * (counter ? 1.2 : 1); pushEnemy(m.push); E.tilt = m.heavy ? .25 : .1; }
}
function pushEnemy(d){
  E.x += d; const maxX = emax();
  if (E.x > maxX) { const over = E.x - maxX; E.x = maxX; P.x = Math.max(PMIN, P.x - over * .8); }
}
function hitPlayer(dmg, opts){
  if (P.state === 'ko' || mode !== 'fight') return 'none';
  const kind = opts.kind;
  if (opts.groundOnly && P.y > 22) { pop('MISS!', P.x, GROUND - P.y - 170, '#5ff0ff', 22); E.dodged = true; ev('avoid', {kind, how: 'jump'}); return 'miss'; }
  if (P.state === 'special') return 'none';
  if (P.iframes > 0) {
    pop('DODGE!', P.x, GROUND - 180, '#5ff0ff', 26); P.counterT = 1.2; G.meter = Math.min(100, G.meter + 10);
    E.dodged = true; slowT = .25; slowScale = .35; sfx.whiff(); ev('avoid', {kind, how: 'dodge'}); return 'dodge';
  }
  if (P.state === 'block' && opts.blockable) {
    const perfect = G.t - P.blockStart <= .28;
    if (perfect) {
      G.stats.counters++; P.counterT = 1.6; G.meter = Math.min(100, G.meter + 20);
      E.state = 'hit'; E.st = 0; E.stun = 1.15; E.atk = null; E.tilt = .3; E.comboHits = 0; pushEnemy(24);
      const c = contactPoint(); sparks(c.x - 20, c.y, 20, 1, '#5ff0ff'); ring(c.x - 20, c.y, '#5ff0ff', 600);
      big('COUNTER!', '#5ff0ff', .8, 44); slowT = .45; slowScale = .3; hitstop(.08); shake = Math.max(shake, 8);
      sfx.counter(); vib([25, 30, 25]); ev('counter', {kind}); return 'counter';
    }
    const chip = Math.max(1, Math.round(dmg * .2)); P.hp = Math.max(0, P.hp - chip); P.x = Math.max(PMIN, P.x - 16);
    const c = contactPoint(); sparks(c.x - 20, c.y, 8, -1, '#9be8ff'); pop('BLOCK', P.x + 10, GROUND - 175, '#9be8ff', 18, .5);
    G.meter = Math.min(100, G.meter + 5); hitstop(.04); shake = Math.max(shake, 3); sfx.block(); vib(12);
    ev('blocked', {kind, chip, php: P.hp});
    if (P.hp <= 0) playerKO();
    return 'block';
  }
  if (P.state === 'block' && !opts.blockable) pop("CAN'T BLOCK!", P.x, GROUND - 190, '#ff6b6b', 18);
  P.hp = Math.max(0, P.hp - dmg); P.flash = .12; setP('hit'); P.stun = .36; P.vx = -260; P.move = null; P.buffer = false;
  if (P.y > 0) { P.vy = Math.max(P.vy, 200); }
  const c = {x: P.x + 20, y: GROUND - P.y - 110};
  sparks(c.x, c.y, 14, -1, '#ff6b4a'); bolts(c.x, c.y, 3, -1); pop(String(dmg), c.x - 10, c.y - 30, '#ff5b5b', 26);
  shake = Math.max(shake, 10); redT = .3; hitstop(.07); sfx.hurt(); vib(60);
  G.combo = 0; G.meter = Math.min(100, G.meter + 6);
  ev('player_hit', {kind, dmg, php: P.hp});
  if (P.hp <= 0) playerKO();
  return 'hit';
}
function enemyKO(){
  E.state = 'ko'; E.st = 0; E.vy = 420; E.y = Math.max(E.y, 1); E.vx = 60; E.atk = null; waves = [];
  mode = 'ko'; G.koT = 0; G.koWin = true; slowT = 1.3; slowScale = .25; hitstop(.18); shake = 20; flashT = .25;
  big('K.O.!', '#ffde59', 2.2, 84); sfx.ko(); vib([80, 40, 200]);
  for (let i = 0; i < 4; i++) { sparks(E.x + rnd(-40, 40), GROUND - rnd(60, 180), 18, 1); bolts(E.x, GROUND - 120, 8, 1); }
  smoke(E.x, GROUND - 100, 10);
  ev('enemy_ko', {round: G.round + 1});
}
function playerKO(){
  setP('ko'); P.vx = -160; P.move = null; mode = 'ko'; G.koT = 0; G.koWin = false; slowT = 1.0; slowScale = .3; shake = 16;
  big('K.O.', '#ff5b5b', 2, 80); sfx.ko(); vib([100, 50, 250]); smoke(P.x, GROUND - 100, 8);
  ev('player_ko', {round: G.round + 1});
}

// ---------- enemy AI ----------
function chooseAttack(){
  const R = E.R, gap = E.x - P.x; const list = [];
  for (const k in R.attacks) {
    let wt = R.attacks[k].wt;
    if (k === 'rush') wt *= gap > 150 ? 4 : .4;
    if ((k === 'claw' || k === 'double') && gap > 170) wt *= .2;
    if (k === 'slam' && E.hp < E.maxHp * .5) wt *= 1.4;
    if (E.lastAtk === k) wt *= .5;
    list.push([k, wt]);
  }
  let sum = list.reduce((a, b) => a + b[1], 0), r = Math.random() * sum;
  for (const [k, wt] of list) { r -= wt; if (r <= 0) return k; }
  return list[0][0];
}
function enrage(){ return E.R.boss && E.hp < E.maxHp * .4 ? .85 : 1; }
function startWindup(k){
  const a = E.R.attacks[k];
  E.state = 'windup'; E.st = 0; E.atk = k; E.wind = a.w * enrage(); E.lastAtk = k; E.comboHits = 0; E.hitDone = 0; E.dodged = false;
  sfx.alarm(); ev('windup', {atk: k});
  G.firstSeen[k] = (G.firstSeen[k] || 0) + 1;
  if (k === 'slam') showHint('jump', 'SWIPE UP TO JUMP THE SHOCKWAVE!', 0);
  else if (k === 'rush') showHint('jumprush', 'SWIPE UP (JUMP) or HOLD LEFT (SHIELD)', 0);
  else showHint('block', 'HOLD LEFT SIDE = SHIELD!', -1);
}
function updateEnemy(dt){
  const R = E.R;
  E.flash = Math.max(0, E.flash - dt); E.inv = Math.max(0, E.inv - dt); E.tilt *= Math.pow(.02, dt);
  E.st += dt;
  if (E.state === 'air' || E.state === 'ko' || (E.y > 0 && E.state !== 'windup')) {
    E.vy -= (E.state === 'air' ? 1500 : 1700) * dt; E.y += E.vy * dt; E.x += E.vx * dt; E.vx *= Math.pow(.2, dt);
    if (E.x > emax()) E.x = emax();
    if (E.y <= 0) {
      E.y = 0; E.vy = 0;
      if (E.state === 'air') { E.state = 'down'; E.st = 0; E.inv = .55; shake = Math.max(shake, 6); smoke(E.x, GROUND - 10, 4); sfx.heavy(); ev('enemy_down'); }
    }
  }
  const gap = E.x - P.x;
  switch (E.state) {
    case 'idle': case 'walk': {
      E.cool -= dt;
      if (gap > 82 + 18 * R.size && E.cool > .25) { E.state = 'walk'; E.x -= R.walk * dt; E.walkPh += dt * 6; }
      else E.state = 'idle';
      if (E.cool <= 0 && mode === 'fight') startWindup(chooseAttack());
      break;
    }
    case 'windup': {
      if (E.atk === 'slam') { const t = E.st / E.wind; E.y = t < .55 ? Math.sin(t / .55 * Math.PI / 2) * 130 : (t > .85 ? 130 * (1 - (t - .85) / .15) : 130); E.y = Math.max(0, E.y); }
      if (E.st >= E.wind) { E.state = 'attack'; E.st = 0; E.rushDist = 0; if (E.atk === 'slam') E.y = 0; onAttackStart(); }
      break;
    }
    case 'attack': updateAttack(dt, gap); break;
    case 'recover': if (E.st >= E.rec) { E.state = 'idle'; E.cool = rnd(R.cool[0], R.cool[1]) * (enrage() < 1 ? .75 : 1); } break;
    case 'hit':
      if (E.comboHits >= R.burstAt && E.st > .15 && mode === 'fight') { startWindup(Math.random() < (R.boss ? .35 : .6) ? 'claw' : chooseAttack()); pop('!', E.x, GROUND - 220 * R.size, '#ff3b3b', 30, .5); break; }
      if (E.st >= E.stun) { E.state = 'idle'; E.cool = Math.min(E.cool > 0 ? E.cool : .5, rnd(.3, .7)); }
      break;
    case 'down':
      if (E.st >= .6) { E.state = 'idle'; E.cool = rnd(.35, .8); }
      break;
  }
  if (E.state !== 'ko') E.x = clamp(E.x, P.x + 40 + 18 * R.size, emax());
}
function onAttackStart(){
  const k = E.atk, a = E.R.attacks[k];
  if (k === 'claw' || k === 'double') sfx.whiff();
  if (k === 'rush') { sfx.dash(); E.vx = 0; }
  if (k === 'slam') {
    sfx.slam(); shake = Math.max(shake, 14); vib(30);
    waves.push({x: E.x - 50 * E.R.size, speed: 430, dmg: a.dmg, hit: false, life: 2});
    smoke(E.x - 30, GROUND - 10, 6); ring(E.x - 40, GROUND - 6, '#ff7a1a', 500);
    ev('slam');
  }
}
function updateAttack(dt, gap){
  const k = E.atk, a = E.R.attacks[k];
  if (!a) { E.state = 'recover'; E.st = 0; E.rec = .4; return; }
  const reach = 128 * Math.min(1.2, E.R.size);
  if (k === 'claw') {
    if (!E.hitDone && E.st >= .03) { E.hitDone = 1; if (gap <= reach || P.iframes > 0) hitPlayer(a.dmg, {blockable: true, kind: 'claw'}); else ev('enemy_whiff', {kind: k}); }
    if (E.state === 'attack' && E.st >= .14) { E.state = 'recover'; E.st = 0; E.rec = .5 + (E.dodged ? .5 : 0); }
  } else if (k === 'double') {
    if (E.hitDone === 0 && E.st >= .03) { E.hitDone = 1; if (gap <= reach || P.iframes > 0) hitPlayer(a.dmg, {blockable: true, kind: 'double'}); }
    if (E.state === 'attack' && E.hitDone === 1 && E.st >= .34) { E.hitDone = 2; sfx.whiff(); if (E.x - P.x <= reach || P.iframes > 0) hitPlayer(a.dmg, {blockable: true, kind: 'double'}); }
    if (E.state === 'attack' && E.st >= .46) { E.state = 'recover'; E.st = 0; E.rec = .45 + (E.dodged ? .5 : 0); }
  } else if (k === 'rush') {
    const sp = 720 * dt; E.x -= sp; E.rushDist += sp;
    if (!E.hitDone && E.x - P.x <= 84) { E.hitDone = 1; const r = hitPlayer(a.dmg, {blockable: true, groundOnly: true, kind: 'rush'}); if (r === 'hit') P.vx = -420; }
    if (E.state === 'attack' && (E.x - P.x <= 60 || E.rushDist > 300 || E.x <= PMIN + 60)) { E.state = 'recover'; E.st = 0; E.rec = .6 + (E.dodged ? .45 : 0); }
    if (Math.random() < .5) smoke(E.x + 30, GROUND - 10, 1);
  } else if (k === 'slam') {
    if (E.st >= .12) { E.state = 'recover'; E.st = 0; E.rec = .75 + (E.dodged ? .3 : 0); }
  }
}
function updateWaves(dt){
  for (const w of waves) {
    w.x -= w.speed * dt; w.life -= dt;
    if (Math.random() < .6) sparks(w.x, GROUND - 4, 1, -1, '#ff7a1a');
    if (!w.hit && Math.abs(w.x - P.x) < 22) {
      w.hit = true;
      const r = hitPlayer(w.dmg, {blockable: false, groundOnly: true, kind: 'shockwave'});
      if (r === 'miss' || r === 'dodge') { if (E.state === 'recover') E.rec += .3; doneHint('jump'); }
    }
  }
  waves = waves.filter(w => w.life > 0 && w.x > -40);
}

// ---------- player update ----------
function updatePlayer(dt){
  P.st += dt; P.flash = Math.max(0, P.flash - dt); P.iframes = Math.max(0, P.iframes - dt); P.counterT = Math.max(0, P.counterT - dt);
  const gap = E.x - P.x;
  switch (P.state) {
    case 'idle': case 'walk': {
      P.idleT += dt;
      if (P.blockHeld) { enterBlock(); break; }
      if (gap > 100 && E.state !== 'ko' && P.idleT > .15) { P.state = 'walk'; P.x += 150 * dt; P.walkPh += dt * 9; }
      else P.state = 'idle';
      P.vx = 0; break;
    }
    case 'block': P.vx = 0; break;
    case 'atk': {
      const m = MOVES[P.move]; P.mt += dt;
      P.x += P.vx * dt; if (P.mt > m.su + m.act) P.vx = 0;
      if (!P.hitDone && P.mt >= m.su) { P.hitDone = true; resolvePlayerHit(P.move); if (P.state !== 'atk') break; }
      const total = m.su + m.act + m.rec;
      if (P.buffer && P.mt >= m.su + m.act + .03 && P.comboStep < 3) { P.lastAtkEnd = G.t; doPunchChain(); break; }
      if (P.mt >= total) {
        P.lastAtkEnd = G.t; P.move = null; P.idleT = 0;
        if (P.comboStep >= 3) P.comboStep = 0;
        setP(P.blockHeld ? 'block' : 'idle');
        if (P.state === 'block') P.blockStart = G.t;
        if (P.buffer) { P.buffer = false; doPunch(); }
      }
      break;
    }
    case 'jump': {
      P.vy -= 1800 * dt; P.y += P.vy * dt; P.x += P.vx * dt; P.vx *= Math.pow(.05, dt);
      if (P.move) {
        const m = MOVES[P.move]; P.mt += dt;
        if (!P.hitDone && P.mt >= m.su) { P.hitDone = true; resolvePlayerHit(P.move); }
        if (P.state === 'jump' && P.mt >= m.su + m.act + m.rec) { P.move = null; if (P.buffer) { P.buffer = false; startMove('air'); } }
      }
      if (P.state === 'jump' && P.y <= 0) { P.y = 0; P.vy = 0; P.vx = 0; P.move = null; P.launcher = false; setP(P.blockHeld ? 'block' : 'idle'); P.blockStart = G.t; P.idleT = 0; smoke(P.x, GROUND - 6, 2);
        if (P.buffer) { P.buffer = false; doPunch(); } }
      break;
    }
    case 'dash': {
      P.x += P.vx * dt; P.vx *= Math.pow(.004, dt);
      if (P.st >= .24) { setP(P.blockHeld ? 'block' : 'idle'); P.blockStart = G.t; P.vx = 0; P.idleT = P.dashDir < 0 ? -.35 : 0; if (P.buffer) { P.buffer = false; doPunch(); } }
      break;
    }
    case 'hit': {
      P.x += P.vx * dt; P.vx *= Math.pow(.01, dt);
      if (P.y > 0) { P.vy -= 1800 * dt; P.y = Math.max(0, P.y + P.vy * dt); }
      if (P.st >= P.stun) { P.vx = 0; setP(P.blockHeld ? 'block' : 'idle'); P.blockStart = G.t; P.idleT = 0; }
      break;
    }
    case 'special': {
      if (!P.fistOut && P.st >= .3) {
        P.fistOut = true; rocket = {x: P.x + 70, y: GROUND - P.y - 118, vx: 300, done: false};
        sfx.boom(); shake = Math.max(shake, 8);
      }
      if (rocket && !rocket.done) {
        rocket.vx = Math.min(1500, rocket.vx + 3000 * dt); rocket.x += rocket.vx * dt;
        const ty = GROUND - E.y - 100 * E.R.size; rocket.y = lerp(rocket.y, ty, Math.min(1, dt * 10));
        fx.push({k: 'smoke', x: rocket.x - 30, y: rocket.y + rnd(-6, 6), vx: -60, vy: rnd(-20, 20), r: rnd(6, 12), life: .4, max: .4, fire: true});
        if (rocket.x >= E.x - 40 * E.R.size) {
          rocket.done = true;
          const wasWind = E.state === 'windup';
          if (E.state !== 'ko') hitEnemy(P.counterT > 0 ? 42 : 30, {heavy: true, hs: .16, meter: 0, push: 0, stun: 1}, 'special', false);
          for (let i = 0; i < 3; i++) sparks(rocket.x, rocket.y, 20, 1, i ? '#ff7a1a' : '#fff');
          bolts(rocket.x, rocket.y, 12, 1); smoke(rocket.x, rocket.y, 8); ring(rocket.x, rocket.y, '#ffb000', 700);
          sfx.boom(); shake = Math.max(shake, 18); flashT = .15; vib([60, 30, 120]);
          ev('special_hit', {interruptedWindup: wasWind});
        }
      }
      if (P.state === 'special' && P.st >= 1.1) { rocket = null; P.fistOut = false; setP(P.blockHeld ? 'block' : 'idle'); P.blockStart = G.t; P.idleT = 0; }
      break;
    }
    case 'ko': {
      P.x += P.vx * dt; P.vx *= Math.pow(.05, dt); break;
    }
  }
  P.x = clamp(P.x, PMIN, E.state === 'ko' ? 330 : E.x - 56);
}
function doPunchChain(){
  P.buffer = false;
  const next = P.comboStep === 1 ? 'jab2' : 'upper';
  P.state = 'idle'; startMove(next);
}

// ---------- main loop ----------
function update(rdt){
  realT += rdt;
  let dt = rdt;
  if (hsT > 0) { hsT -= rdt; dt = 0; }
  else if (slowT > 0) { slowT -= rdt; dt = rdt * slowScale; }
  shake = Math.max(0, shake - rdt * 40); flashT = Math.max(0, flashT - rdt); redT = Math.max(0, redT - rdt);
  if (bigText) { bigText.life -= rdt; if (bigText.life <= 0) bigText = null; }
  if (hint) hint.t += rdt;
  if (!G) return;
  if (mode === 'intro') {
    G.introT += rdt;
    if (G.introT >= 1.25) { mode = 'fight'; big('FIGHT!', '#ffb000', .7, 60); ev('fight'); if (!G.hintsDone.punch) showHint('punch', 'TAP RIGHT SIDE TO PUNCH!', 1); }
  }
  if (mode === 'between') {
    G.betweenT += rdt; updateFx(rdt);
    if (G.betweenT > 1.7) setupRound(1);
    return;
  }
  if (mode === 'fight' || mode === 'ko' || mode === 'intro') {
    G.t += dt;
    if (mode === 'fight') {
      G.timer -= dt; G.stats.time += rdt;
      if (G.timer <= 0) { G.timer = 0; timeUp(); }
    }
    if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; }
    if (mode !== 'intro') { updatePlayer(dt); updateEnemy(dt); updateWaves(dt); }
    if (G.meter >= 100 && !G.readyShown && mode === 'fight') { G.readyShown = true; sfx.ready(); pop('SPECIAL READY!', 200, BTN.y - 80, '#ffb000', 22, 1.2); showHint('special', 'TAP THE BIG 🚀 BUTTON = ROCKET FIST!', 0); ev('special_ready'); }
    if (G.meter < 100) G.readyShown = false;
    if (mode === 'ko') {
      G.koT += rdt;
      if (G.koT > 2.4) {
        if (G.koWin && G.round === 0) { mode = 'between'; G.betweenT = 0; big('BOSS INCOMING!', '#ff5b5b', 1.6, 40); sfx.alarm(); ev('boss_incoming'); }
        else endGame(G.koWin);
      }
    }
  }
  updateFx(dt);
}
function updateFx(dt){
  for (const p of fx) {
    p.life -= dt;
    if (p.k === 'spark') { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 900 * dt; p.vx *= Math.pow(.1, dt); }
    else if (p.k === 'bolt') { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 1300 * dt; p.r += p.vr * dt; if (p.y > GROUND + 10) { p.y = GROUND + 10; p.vy *= -.35; p.vx *= .6; p.vr *= .5; } }
    else if (p.k === 'ring') p.r += p.vr * dt;
    else if (p.k === 'smoke') { p.x += p.vx * dt; p.y += p.vy * dt; p.r += 20 * dt; }
  }
  fx = fx.filter(p => p.life > 0); if (fx.length > 420) fx.splice(0, fx.length - 420);
  const pd = Math.max(dt, .004);
  for (const p of pops) { p.life -= pd; p.y += p.vy * pd; p.vy *= .96; }
  pops = pops.filter(p => p.life > 0);
}
function timeUp(){
  const pr = P.hp / PLAYER_HP, er = E.hp / E.maxHp;
  ev('time_up', {pr, er});
  if (pr > er) { E.hp = 0; enemyKO(); big('TIME! YOU WIN', '#ffde59', 2.2, 40); }
  else { P.hp = 0; playerKO(); big('TIME UP', '#ff5b5b', 2, 50); }
}
function endGame(win){
  mode = win ? 'won' : 'lost';
  $('endTitle').textContent = win ? 'YOU WIN!' : 'DEFEATED';
  $('endTitle').style.color = win ? '#2e6be6' : '#e8452a';
  $('endSub').textContent = win ? 'MAHA-DAITYA is scrap. Ahmedabad is safe!' : (G.round === 1 ? 'The boss got you. Try again from Round 2!' : 'RAKSHAS-X won this time. Go again!');
  $('sHits').textContent = G.stats.hits; $('sCombo').textContent = G.stats.maxCombo; $('sCounter').textContent = G.stats.counters; $('sTime').textContent = Math.round(G.stats.time) + 's';
  $('retryBtn').textContent = win ? 'PLAY AGAIN' : (G.round === 1 ? 'RETRY ROUND 2' : 'RETRY');
  $('restartBtn').style.display = (!win && G.round === 1) ? 'block' : 'none';
  $('end').classList.remove('hide');
  if (win) sfx.win(); else sfx.lose();
  ev(win ? 'win_screen' : 'lose_screen', {round: G.round + 1});
}

// ---------- drawing ----------
function rr(x, y, w, h, r){ ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function limb(x1, y1, x2, y2, w, col){ ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function playerPose(){
  const o = {lean: 0, fx: 42, fy: -106, bx: 26, by: -112, crouch: 0, shield: false, thrust: false, legSpread: 0};
  const s = P.state;
  if (s === 'walk') o.legSpread = Math.sin(P.walkPh) * 7;
  if (s === 'idle') o.crouch = Math.sin(realT * 4) * 1.5;
  if ((s === 'atk' || s === 'jump') && P.move) {
    const m = MOVES[P.move], t = P.mt;
    const ph = t < m.su ? 0 : t < m.su + m.act ? 1 : 2, pt = ph === 0 ? t / m.su : ph === 1 ? (t - m.su) / m.act : (t - m.su - m.act) / Math.max(.01, m.rec);
    if (P.move === 'jab1' || P.move === 'jab2' || P.move === 'air') {
      const ext = ph === 0 ? 0 : ph === 1 ? 1 : 1 - ease(clamp(pt, 0, 1));
      if (P.move === 'jab2') { o.bx = lerp(26, 100, ext); o.by = -116; o.fx = 34; o.fy = -100; }
      else { o.fx = lerp(42, 104, ext); o.fy = -112; }
      o.lean = .12 * ext;
    } else {
      if (ph === 0) { o.fx = 46; o.fy = -78; o.crouch = 10 * pt; o.lean = .05; }
      else if (ph === 1) { o.fx = 68; o.fy = -176; o.lean = -.12; }
      else { const q = ease(clamp(pt, 0, 1)); o.fx = lerp(68, 42, q); o.fy = lerp(-176, -106, q); o.lean = lerp(-.12, 0, q); }
    }
  }
  if (s === 'block') { o.shield = true; o.fx = 40; o.fy = -124; o.bx = 38; o.by = -100; o.crouch = 5; o.lean = -.04; }
  if (s === 'jump') { o.thrust = true; if (!P.move) { o.fx = 48; o.fy = -126; o.bx = 18; o.by = -96; } o.legSpread = 5; }
  if (s === 'dash') { o.thrust = true; o.lean = P.dashDir < 0 ? -.2 : .2; }
  if (s === 'hit') { o.lean = -.22; o.fx = 26; o.fy = -96; o.bx = 10; o.by = -100; }
  if (s === 'special') { o.fx = P.st < .3 ? lerp(42, 20, P.st / .3) : 104; o.fy = -118; o.lean = P.st < .3 ? -.08 : .14; o.crouch = 6; }
  if (s === 'ko') { o.lean = -Math.min(1.4, P.st * 3); o.fx = 20; o.fy = -90; o.crouch = Math.min(30, P.st * 60); }
  return o;
}
function drawPlayer(){
  const o = playerPose(), white = P.flash > 0;
  const C = c => white ? '#ffffff' : c;
  ctx.save(); ctx.translate(P.x, GROUND - P.y);
  ctx.save(); ctx.translate(0, P.y); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, 4, Math.max(14, 38 - P.y * .1), 7, 0, 0, 7); ctx.fill(); ctx.restore();
  if (P.iframes > 0 && P.state === 'dash') ctx.globalAlpha = .55;
  if (o.thrust) { for (const lx of [-12, 12]) { ctx.fillStyle = '#ffb000'; ctx.beginPath(); ctx.moveTo(lx - 7, -2); ctx.lineTo(lx + 7, -2); ctx.lineTo(lx, 26 + Math.random() * 14); ctx.fill(); ctx.fillStyle = '#fff6a8'; ctx.beginPath(); ctx.moveTo(lx - 4, -2); ctx.lineTo(lx + 4, -2); ctx.lineTo(lx, 14 + Math.random() * 6); ctx.fill(); } }
  ctx.translate(0, o.crouch); ctx.rotate(o.lean);
  ctx.fillStyle = C('#1d3f99'); rr(-22 + o.legSpread, -64, 18, 62, 6); ctx.fill();
  ctx.fillStyle = C('#2554c7'); rr(4 - o.legSpread, -64, 18, 62, 6); ctx.fill();
  ctx.fillStyle = C('#dfe6f2'); rr(-26 + o.legSpread, -10, 28, 11, 4); ctx.fill(); rr(2 - o.legSpread, -10, 30, 11, 4); ctx.fill();
  limb(-20, -128, o.bx - 6, o.by, 12, C('#173c94'));
  ctx.fillStyle = C('#c7cfdd'); rr(o.bx - 16, o.by - 11, 24, 22, 6); ctx.fill();
  ctx.fillStyle = C('#1d3f99'); rr(-24, -74, 48, 16, 5); ctx.fill();
  ctx.fillStyle = C('#2e6be6'); ctx.beginPath(); ctx.moveTo(-36, -140); ctx.lineTo(36, -140); ctx.lineTo(25, -70); ctx.lineTo(-25, -70); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = C('#163a8a'); ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = C('#eef2fb'); rr(-22, -130, 44, 32, 8); ctx.fill();
  const coreCol = P.counterT > 0 ? '#ffb000' : '#4ff3ff';
  ctx.fillStyle = white ? '#fff' : coreCol; ctx.shadowColor = coreCol; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(4, -114, 9, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
  ctx.fillStyle = C('#ff9933'); rr(-36, -92, 72, 6, 3); ctx.fill();
  ctx.beginPath(); ctx.arc(-30, -134, 13, 0, 7); ctx.fill();
  ctx.fillStyle = C('#e9eef7'); rr(-16, -168, 32, 28, 7); ctx.fill();
  ctx.fillStyle = white ? '#fff' : '#22e1ff'; rr(-2, -160, 22, 8, 4); ctx.fill();
  ctx.fillStyle = C('#ff9933'); ctx.fillRect(-3, -177, 4, 10);
  limb(24, -128, o.fx - 8, o.fy, 13, C('#1f4fb5'));
  ctx.fillStyle = C('#ff9933'); ctx.beginPath(); ctx.arc(28, -134, 13, 0, 7); ctx.fill();
  if (!P.fistOut) { ctx.fillStyle = C('#dfe6f2'); rr(o.fx - 14, o.fy - 13, 28, 26, 7); ctx.fill(); ctx.fillStyle = C('#ff9933'); ctx.fillRect(o.fx + 8, o.fy - 13, 5, 26); }
  else { ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.arc(o.fx - 6, o.fy, 6, 0, 7); ctx.fill(); }
  ctx.restore();
  if (o.shield) {
    ctx.save(); ctx.translate(P.x + 62, GROUND - P.y - 104);
    const fresh = G.t - P.blockStart < .28;
    ctx.globalAlpha = (fresh ? .7 : .45) + Math.sin(realT * 20) * .05;
    ctx.fillStyle = fresh ? '#bff8ff' : '#5ff0ff'; ctx.strokeStyle = '#e8fdff'; ctx.lineWidth = 3;
    ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * 50); } ctx.closePath(); ctx.fill(); ctx.globalAlpha = .9; ctx.stroke();
    ctx.restore();
  }
}
function enemyPose(){
  const o = {lean: 0, cx: 58, cy: -100, bx: 30, by: -110, crouch: 0, legSpread: 0, eyeHot: false};
  const s = E.state;
  if (s === 'walk') o.legSpread = Math.sin(E.walkPh) * 6;
  if (s === 'idle') o.crouch = Math.sin(realT * 3) * 2;
  if (s === 'windup') {
    const t = clamp(E.st / E.wind, 0, 1); o.eyeHot = true;
    if (E.atk === 'claw' || E.atk === 'double') { o.cx = lerp(58, -8, ease(t)); o.cy = lerp(-100, -178, ease(t)); o.lean = -.16 * t; o.crouch = 4 * t; }
    if (E.atk === 'rush') { o.lean = -.25 * t; o.crouch = 12 * t; o.cx = 10; o.cy = -96; o.bx = 0; o.by = -100; }
    if (E.atk === 'slam') { o.cx = 30; o.cy = -190; o.bx = 10; o.by = -186; o.legSpread = 6; }
  }
  if (s === 'attack') {
    if (E.atk === 'claw') { o.cx = 104; o.cy = -96; o.lean = .2; }
    if (E.atk === 'double') { const second = E.st > .25; o.cx = second ? 50 : 104; o.cy = -100; o.bx = second ? 104 : 20; o.by = -104; o.lean = .18; }
    if (E.atk === 'rush') { o.lean = .32; o.cx = 92; o.cy = -110; o.bx = 80; o.by = -96; }
    if (E.atk === 'slam') { o.cx = 70; o.cy = -20; o.bx = 50; o.by = -24; o.crouch = 22; o.lean = .3; }
  }
  if (s === 'recover') { o.lean = .08; o.cx = 70; o.cy = -84; o.crouch = 6; }
  if (s === 'hit' || s === 'air') { o.lean = -(E.tilt || .1) - (s === 'air' ? .35 : 0); o.cx = 30; o.cy = -90; }
  if (s === 'down') { o.lean = -1.2 + Math.min(1.2, E.st * 2.2); o.crouch = 10; }
  if (s === 'ko') { o.lean = -Math.min(1.5, .4 + E.st * 2.5); o.cx = 30; o.cy = -80; }
  return o;
}
function drawClaw(x, y, col, s){
  ctx.fillStyle = col; rr(x - 14 * s, y - 13 * s, 24 * s, 26 * s, 5); ctx.fill();
  ctx.beginPath(); for (let i = -1; i <= 1; i++) { ctx.moveTo(x + 8 * s, y + i * 9 * s - 4 * s); ctx.lineTo(x + 26 * s, y + i * 11 * s); ctx.lineTo(x + 8 * s, y + i * 9 * s + 4 * s); } ctx.fill();
}
function drawEnemy(){
  const R = E.R, o = enemyPose(), sz = R.size;
  const tele = E.state === 'windup' && Math.floor(E.st / .075) % 2 === 0;
  const white = E.flash > 0;
  const C = c => white ? '#ffffff' : tele ? '#ff2b2b' : c;
  ctx.save(); ctx.translate(E.x, GROUND - E.y);
  ctx.save(); ctx.translate(0, E.y); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, 4, Math.max(16, 46 * sz - E.y * .12), 8, 0, 0, 7); ctx.fill(); ctx.restore();
  if (E.state === 'windup') { ctx.save(); ctx.globalAlpha = .22 + .2 * Math.sin(realT * 30); ctx.fillStyle = E.atk === 'slam' ? '#ff7a1a' : '#ff2b2b'; ctx.beginPath(); ctx.arc(0, -100 * sz, 95 * sz, 0, 7); ctx.fill(); ctx.restore(); }
  ctx.scale(-sz, sz);
  ctx.translate(0, o.crouch); ctx.rotate(o.lean);
  ctx.fillStyle = C(R.dark); rr(-28 + o.legSpread, -62, 22, 62, 5); ctx.fill(); rr(6 - o.legSpread, -62, 22, 62, 5); ctx.fill();
  ctx.fillStyle = C('#8a8f9c'); rr(-24 + o.legSpread, -46, 14, 26, 3); ctx.fill(); rr(10 - o.legSpread, -46, 14, 26, 3); ctx.fill();
  ctx.fillStyle = C(R.dark); rr(-34 + o.legSpread, -10, 32, 11, 3); ctx.fill(); rr(2 - o.legSpread, -10, 34, 11, 3); ctx.fill();
  limb(-24, -132, o.bx - 4, o.by, 14, C(R.dark));
  drawClaw(o.bx, o.by, C('#9aa0ad'), .8);
  ctx.fillStyle = C(R.body); rr(-44, -152, 88, 88, 14); ctx.fill();
  ctx.strokeStyle = C(R.dark); ctx.lineWidth = 4; ctx.stroke();
  ctx.fillStyle = C(R.dark); for (let i = 0; i < 4; i++) { rr(-30, -100 + i * 8, 40, 4, 2); ctx.fill(); }
  const vent = R.boss ? '#ffb000' : '#ff5a3b';
  ctx.fillStyle = white ? '#fff' : vent; ctx.shadowColor = vent; ctx.shadowBlur = 12; rr(14, -138, 18, 26, 5); ctx.fill(); ctx.shadowBlur = 0;
  ctx.fillStyle = C(R.boss ? '#ffb000' : '#8a8f9c');
  ctx.beginPath(); ctx.moveTo(-44, -140); ctx.lineTo(-62, -160); ctx.lineTo(-40, -152); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-30, -152); ctx.lineTo(-38, -176); ctx.lineTo(-18, -152); ctx.fill();
  ctx.fillStyle = C(R.dark); rr(-10, -184, 46, 34, 10); ctx.fill();
  if (R.boss) { ctx.fillStyle = C('#ffb000'); ctx.beginPath(); ctx.moveTo(-6, -180); ctx.lineTo(-22, -214); ctx.lineTo(6, -184); ctx.fill(); ctx.beginPath(); ctx.moveTo(26, -184); ctx.lineTo(44, -212); ctx.lineTo(34, -178); ctx.fill(); }
  ctx.fillStyle = white ? '#fff' : (o.eyeHot ? '#ffffff' : R.acc); ctx.shadowColor = '#ff2b2b'; ctx.shadowBlur = o.eyeHot ? 24 : 10; ctx.beginPath(); ctx.arc(22, -167, o.eyeHot ? 10 : 8, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
  limb(28, -134, o.cx - 6, o.cy, 16, C(R.body));
  ctx.fillStyle = C(R.dark); ctx.beginPath(); ctx.arc(30, -136, 14, 0, 7); ctx.fill();
  drawClaw(o.cx, o.cy, C('#b9bfcc'), 1);
  ctx.restore();
  if (E.state === 'windup' && mode === 'fight') {
    const y = GROUND - E.y - 228 * sz - 6 * Math.sin(realT * 18);
    const isJump = E.atk === 'slam', col = isJump ? '#ff7a1a' : '#ff2b2b';
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(E.x, y, 19, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
    if (isJump) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(E.x, y - 12); ctx.lineTo(E.x + 11, y + 2); ctx.lineTo(E.x + 4, y + 2); ctx.lineTo(E.x + 4, y + 11); ctx.lineTo(E.x - 4, y + 11); ctx.lineTo(E.x - 4, y + 2); ctx.lineTo(E.x - 11, y + 2); ctx.closePath(); ctx.fill(); }
    else txt(E.atk === 'rush' ? '!!' : '!', E.x, y + 1, 24, '#fff', 'center', false);
    if (isJump || (G.firstSeen[E.atk] || 0) <= 2) txt(isJump ? 'JUMP!' : E.atk === 'rush' ? 'JUMP or BLOCK' : 'BLOCK!', clamp(E.x, 60, 340), y - 32, 15, '#fff');
    if (isJump) { ctx.save(); ctx.globalAlpha = .3 + .3 * Math.sin(realT * 25); ctx.fillStyle = '#ff7a1a'; ctx.fillRect(0, GROUND - 4, E.x, 8); ctx.restore(); }
  }
}

function drawWaves(){
  for (const w of waves) {
    ctx.save(); ctx.translate(w.x, GROUND);
    const h = 46 + Math.sin(realT * 40) * 5;
    const g = ctx.createLinearGradient(0, -h, 0, 0); g.addColorStop(0, 'rgba(255,122,26,0)'); g.addColorStop(1, 'rgba(255,90,40,.95)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-26, 2); ctx.quadraticCurveTo(-10, -h, 0, -h); ctx.quadraticCurveTo(14, -h * .6, 30, 2); ctx.fill();
    ctx.fillStyle = '#fff3c4'; ctx.beginPath(); ctx.moveTo(-14, 2); ctx.quadraticCurveTo(-4, -h * .55, 2, -h * .55); ctx.quadraticCurveTo(10, -h * .3, 18, 2); ctx.fill();
    ctx.restore();
  }
}
function drawRocket(){
  if (!rocket || rocket.done) return;
  ctx.save(); ctx.translate(rocket.x, rocket.y);
  ctx.fillStyle = '#ffb000'; ctx.beginPath(); ctx.moveTo(-14, -9); ctx.lineTo(-60 - Math.random() * 25, 0); ctx.lineTo(-14, 9); ctx.fill();
  ctx.fillStyle = '#fff6a8'; ctx.beginPath(); ctx.moveTo(-14, -5); ctx.lineTo(-38 - Math.random() * 12, 0); ctx.lineTo(-14, 5); ctx.fill();
  ctx.fillStyle = '#dfe6f2'; rr(-16, -16, 34, 32, 9); ctx.fill(); ctx.fillStyle = '#ff9933'; ctx.fillRect(12, -16, 6, 32);
  ctx.restore();
}
function drawFx(){
  for (const p of fx) {
    const a = clamp(p.life / p.max, 0, 1);
    if (p.k === 'spark') { ctx.strokeStyle = p.col; ctx.globalAlpha = a; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * .03, p.y - p.vy * .03); ctx.stroke(); }
    else if (p.k === 'bolt') { ctx.save(); ctx.globalAlpha = Math.min(1, a * 2); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = '#b9bfcc'; ctx.strokeStyle = '#555b68'; ctx.lineWidth = 1.5;
      if (p.hex) { ctx.beginPath(); for (let i = 0; i < 6; i++) ctx.lineTo(Math.cos(i * 1.047) * p.s, Math.sin(i * 1.047) * p.s); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#555b68'; ctx.beginPath(); ctx.arc(0, 0, p.s * .4, 0, 7); ctx.fill(); }
      else { ctx.fillRect(-p.s, -p.s * .4, p.s * 2, p.s * .8); ctx.fillRect(-p.s, -p.s * .8, p.s * .7, p.s * 1.6); }
      ctx.restore(); }
    else if (p.k === 'ring') { ctx.strokeStyle = p.col; ctx.globalAlpha = a; ctx.lineWidth = 4 * a + 1; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.stroke(); }
    else if (p.k === 'smoke') { ctx.globalAlpha = a * .5; ctx.fillStyle = p.fire ? (a > .5 ? '#ffb000' : '#ff5a2b') : '#6b6680'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
}
function txt(t, x, y, size, col, align, stroke){
  ctx.font = '900 ' + Math.round(size) + 'px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif'; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
  if (stroke !== false) { ctx.lineWidth = Math.max(3, size / 7); ctx.strokeStyle = 'rgba(10,6,30,.85)'; ctx.lineJoin = 'round'; ctx.strokeText(t, x, y); }
  ctx.fillStyle = col; ctx.fillText(t, x, y);
}
function bar(x, y, w, h, frac, col, rev, gh){
  ctx.fillStyle = 'rgba(10,6,30,.7)'; rr(x - 3, y - 3, w + 6, h + 6, 6); ctx.fill();
  ctx.fillStyle = '#3a1b2a'; rr(x, y, w, h, 4); ctx.fill();
  const gw = w * clamp(gh, 0, 1); if (gw > 1) { ctx.fillStyle = '#ffffff'; rr(rev ? x + w - gw : x, y, gw, h, 4); ctx.fill(); }
  const fw = w * clamp(frac, 0, 1); ctx.fillStyle = col; if (fw > 1) { rr(rev ? x + w - fw : x, y, fw, h, 4); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(rev ? x + w - fw + 2 : x + 2, y + 2, Math.max(0, fw - 4), h * .3); }
}
const ghost = {p: 1, e: 1};
function drawHud(){
  const top = 18;
  const pf = P.hp / PLAYER_HP, ef = E.hp / E.maxHp;
  ghost.p = Math.max(pf, ghost.p - .006); ghost.e = Math.max(ef, ghost.e - .006);
  bar(12, top, 150, 16, pf, pf < .3 ? '#ff5b5b' : '#3ddc84', false, ghost.p);
  bar(238, top, 150, 16, ef, E.R.boss ? '#ff4fa0' : '#ff9f1a', true, ghost.e);
  txt('RAKSHAK', 14, top + 31, 13, '#cfe3ff', 'left');
  txt(E.R.name + (E.R.boss ? ' · BOSS' : ''), 386, top + 31, 13, '#ffd0d0', 'right');
  ctx.fillStyle = 'rgba(10,6,30,.85)'; ctx.beginPath(); ctx.arc(200, top + 12, 25, 0, 7); ctx.fill();
  ctx.strokeStyle = G.timer < 10 ? '#ff5b5b' : '#ffb000'; ctx.lineWidth = 3; ctx.stroke();
  txt(String(Math.ceil(G.timer)), 200, top + 13, 22, G.timer < 10 ? '#ff7b7b' : '#fff', 'center', false);
  txt('ROUND ' + (G.round + 1), 200, top + 51, 12, '#ffde59');
  if (G.combo >= 2) { const s = 1 + Math.max(0, G.comboT - 1.1) * 2; txt(G.combo + ' HITS', 16, top + 92, 28 * s, '#ffde59', 'left'); if (G.combo >= 3) txt(G.combo >= 9 ? 'UNSTOPPABLE!' : G.combo >= 6 ? 'AWESOME!' : 'COMBO!', 18, top + 118, 14, '#ff9f1a', 'left'); }
  if (P.counterT > 0) txt('COUNTER BONUS x1.5', 386, top + 92, 13, '#5ff0ff', 'right');
  // control zones
  const zy = BTN.y;
  ctx.save();
  const blockGlow = (hint && hint.side === -1) || (E.state === 'windup' && E.atk !== 'slam');
  ctx.globalAlpha = P.state === 'block' ? .32 : blockGlow ? .15 + .1 * Math.sin(realT * 12) : .07;
  ctx.fillStyle = '#5ff0ff'; rr(8, GROUND + 18, 184, H - GROUND - 28, 16); ctx.fill();
  ctx.globalAlpha = P.state === 'atk' ? .2 : (hint && hint.side === 1) ? .15 + .1 * Math.sin(realT * 12) : .07;
  ctx.fillStyle = '#ffb000'; rr(208, GROUND + 18, 184, H - GROUND - 28, 16); ctx.fill();
  ctx.restore();
  txt('🛡️', 60, zy - 6, 26, '#fff', 'center', false); txt('HOLD', 60, zy + 22, 13, '#bff8ff'); txt('SHIELD', 60, zy + 37, 13, '#bff8ff');
  txt('👊', 340, zy - 6, 26, '#fff', 'center', false); txt('TAP', 340, zy + 22, 13, '#ffe2a8'); txt('PUNCH', 340, zy + 37, 13, '#ffe2a8');
  txt('SWIPE UP = JUMP   ·   SWIPE LEFT = DODGE', 200, GROUND + 38, 13, 'rgba(255,255,255,.88)');
  const ready = G.meter >= 100;
  ctx.save(); ctx.translate(BTN.x, BTN.y);
  if (ready) { ctx.shadowColor = '#ffb000'; ctx.shadowBlur = 24 + 10 * Math.sin(realT * 10); }
  ctx.fillStyle = ready ? '#ff7a1a' : '#2b2a44'; ctx.beginPath(); ctx.arc(0, 0, BTN.r * (ready ? 1 + .05 * Math.sin(realT * 10) : 1), 0, 7); ctx.fill(); ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffde59'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, BTN.r - 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * G.meter / 100); ctx.stroke();
  txt('🚀', 0, -8, 24, '#fff', 'center', false);
  txt(ready ? 'SPECIAL!' : Math.floor(G.meter) + '%', 0, 20, ready ? 13 : 12, ready ? '#fff' : '#aaa');
  ctx.restore();
  if (hint && mode === 'fight') {
    ctx.save(); ctx.globalAlpha = Math.min(1, hint.t * 4);
    const y = GROUND + 66 + Math.sin(realT * 8) * 2;
    ctx.fillStyle = 'rgba(255,255,255,.95)'; rr(26, y - 15, 348, 30, 15); ctx.fill();
    txt(hint.text, 200, y + 1, 14, '#1d1b3a', 'center', false);
    ctx.restore();
    if (hint.t > 7) hint = null;
  }
}
function draw(){
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#140f2e'; ctx.fillRect(0, 0, cv.width, cv.height);
  const sx = (Math.random() - .5) * shake, sy = (Math.random() - .5) * shake;
  ctx.setTransform(DPR * SC, 0, 0, DPR * SC, DPR * (OX + sx * SC), DPR * sy * SC);
  if (bgCanvas) ctx.drawImage(bgCanvas, 0, 0, 400, H);
  for (let i = 0; i < 4; i++) { const x = ((realT * (30 + i * 14) + i * 130) % 480) - 40, y = 120 + i * 46; ctx.fillStyle = i % 2 ? '#5ff0ff' : '#ffcf6b'; ctx.globalAlpha = .7; rr(x, y, 14, 4, 2); ctx.fill(); ctx.globalAlpha = .25; ctx.fillRect(x - 18, y + 1, 18, 2); }
  ctx.globalAlpha = 1;
  if (!G || !P) return;
  ctx.save(); ctx.translate(200, GROUND); ctx.scale(WS, WS); ctx.translate(-200, -GROUND);
  drawWaves(); drawEnemy(); drawPlayer(); drawRocket(); drawFx();
  for (const p of pops) { ctx.globalAlpha = clamp(p.life / p.max * 1.6, 0, 1); txt(p.text, clamp(p.x, 70, 330), p.y, p.size, p.col); }
  ctx.globalAlpha = 1; ctx.restore();
  drawHud();
  if (redT > 0) { const g = ctx.createRadialGradient(200, H / 2, H * .2, 200, H / 2, H * .7); g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, 'rgba(255,0,0,' + Math.min(.5, redT * 1.4) + ')'); ctx.fillStyle = g; ctx.fillRect(-20, -20, 440, H + 40); }
  if (flashT > 0) { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(.6, flashT * 2.4) + ')'; ctx.fillRect(-20, -20, 440, H + 40); }
  if (mode === 'intro') {
    const t = G.introT; txt(t < .7 ? 'ROUND ' + (G.round + 1) : 'READY…', 200, GROUND - 330, 48, '#fff');
    txt(ROUNDS[G.round].name + (ROUNDS[G.round].boss ? ' — BOSS' : ''), 200, GROUND - 285, 20, ROUNDS[G.round].boss ? '#ff6bb5' : '#ffb000');
  }
  if (bigText) {
    const a = clamp(bigText.life / bigText.max * 3, 0, 1), s = 1 + Math.max(0, (bigText.life - bigText.max + .15)) * 3;
    ctx.globalAlpha = a; txt(bigText.text, 200, GROUND - 320, bigText.size * s, bigText.col); ctx.globalAlpha = 1;
  }
}
function frame(now){
  const rdt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
  try { update(rdt); draw(); } catch (e) { console.error(e); }
  requestAnimationFrame(frame);
}

// ---------- buttons ----------
function tapBtn(el, fn){ el.addEventListener('click', fn); }
tapBtn($('startBtn'), () => { audioInit(); $('start').classList.add('hide'); newGame(); });
tapBtn($('retryBtn'), () => {
  audioInit(); $('end').classList.add('hide');
  if (mode === 'lost' && G && G.round === 1) { G.meter = 0; setupRound(1); ev('retry', {round: 2}); }
  else { newGame(); ev('retry', {round: 1}); }
});
tapBtn($('restartBtn'), () => { audioInit(); $('end').classList.add('hide'); newGame(); ev('retry', {round: 1}); });

// ---------- test hooks ----------
window.__rr = {
  events,
  state(){
    return {mode, H, SC, OX, GROUND, BTN, round: G ? G.round + 1 : 0, timer: G ? G.timer : 0, meter: G ? G.meter : 0, combo: G ? G.combo : 0,
      stats: G ? G.stats : null,
      P: P ? {x: P.x, y: P.y, hp: P.hp, state: P.state, move: P.move, iframes: P.iframes, counterT: P.counterT} : null,
      E: E ? {x: E.x, y: E.y, hp: E.hp, maxHp: E.maxHp, state: E.state, atk: E.atk, st: E.st, wind: E.wind, name: E.R.name} : null,
      waves: waves.map(w => ({x: w.x})), fx: fx.length};
  },
  setHp(who, v){ if (who === 'p') P.hp = v; else E.hp = v; },
  setMeter(v){ G.meter = v; },
};

resize();
requestAnimationFrame(t => { last = t; frame(t); });
})();
