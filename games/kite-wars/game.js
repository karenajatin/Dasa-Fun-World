// Kite Wars: Uttarayan — playable prototype (one level)
'use strict';
(function(){
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const $ = id => document.getElementById(id);
let DPR = 1, SC = 1, OX = 0, W = 400, H = 800;

// ---------- tuning ----------
const T = {
  levelTime: 120, goal: 8, lives: 3,
  gain: 1.45,            // finger -> kite target gain (relative drag)
  pK: 42, pD: 9.5,       // player spring / damping
  rK: 16, rD: 5.5,       // rival spring / damping
  bossK: 26, bossD: 7,
  fall: 26,              // target sink speed when finger is up (px/s)
  windV: 30,             // wind drift of targets (px/s per unit)
  powerDiv: 420,         // finger speed (px/s) giving power 1.0
  barRate: 0.9,
  sweetMult: 1.75,
  comboWindow: 4.5,
};

// ---------- state ----------
let G = null;
const events = [];
function ev(type, data){ events.push(Object.assign({t: G ? +G.t.toFixed(2) : 0, type}, data||{})); if (events.length > 400) events.shift(); }

// ---------- layout ----------
let roofs = [], playerRoof = null, sky = {top: 96, bottom: 500};
function layout(){
  // rival rooftops: left & right, at different heights
  roofs = [
    {x: 34,  y: H-250, side: -1, w: 70,  col: '#c97b5a'},
    {x: 92,  y: H-345, side: -1, w: 62,  col: '#b8697a'},
    {x: 366, y: H-270, side: 1,  w: 70,  col: '#d39a54'},
    {x: 306, y: H-360, side: 1,  w: 62,  col: '#a8708f'},
  ];
  playerRoof = {x: 200, y: H-120, anchor: {x: 214, y: H-158}};
  sky.top = 100; sky.bottom = H - 400;
}
function resize(){
  DPR = Math.min(2, window.devicePixelRatio || 1);
  const vw = innerWidth, vh = innerHeight;
  const gw = Math.min(vw, vh * 0.62);
  SC = gw / 400; W = 400; H = vh / SC; OX = (vw - gw) / 2;
  cv.width = Math.round(vw * DPR); cv.height = Math.round(vh * DPR);
  cv.style.width = vw + 'px'; cv.style.height = vh + 'px';
  layout();
  if (G) { G.player.anchor = playerRoof.anchor; for (const r of G.rivals) r.anchor = roofAnchor(r.roof, r.slot); }
}
addEventListener('resize', resize);
function roofAnchor(i, slot){ const R = roofs[i]; return {x: R.x + (slot ? 14 : -10) * (R.side < 0 ? 1 : -1), y: R.y - 38}; }

// ---------- math ----------
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
function segX(a, b, c, d){
  const r1x = b.x - a.x, r1y = b.y - a.y, r2x = d.x - c.x, r2y = d.y - c.y;
  const den = r1x * r2y - r1y * r2x; if (Math.abs(den) < 1e-6) return null;
  const qx = c.x - a.x, qy = c.y - a.y;
  const t = (qx * r2y - qy * r2x) / den, u = (qx * r1y - qy * r1x) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return {t, u, x: a.x + r1x * t, y: a.y + r1y * t};
}
function bez(a, c, b, n, out, skipFirst){
  for (let i = skipFirst ? 1 : 0; i <= n; i++) { const t = i / n, m = 1 - t; out.push({x: m*m*a.x + 2*m*t*c.x + t*t*b.x, y: m*m*a.y + 2*m*t*c.y + t*t*b.y}); }
}
// string polyline anchor -> kite (sags with gravity and wind); via knot when tangled
function stringPts(k){
  const a = k.anchor, b = {x: k.x, y: k.y + k.size * 0.9}, pts = [];
  if (k.knot) {
    const K = k.knot;
    const c1 = {x: (a.x + K.x)/2 + G.wind * 6, y: (a.y + K.y)/2 + 10};
    bez(a, c1, K, 5, pts, false);
    const c2 = {x: (K.x + b.x)/2 + G.wind * 4, y: (K.y + b.y)/2 + 6};
    bez(K, c2, b, 4, pts, true);
  } else {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    const c = {x: (a.x + b.x)/2 + G.wind * 14 - dy * 0.0 , y: (a.y + b.y)/2 + d * 0.10};
    bez(a, c, b, 9, pts, false);
  }
  return pts;
}
function pointAt(pts, f){ const n = pts.length - 1, s = clamp(f, 0, 1) * n, i = Math.min(n - 1, Math.floor(s)), t = s - i; return {x: lerp(pts[i].x, pts[i+1].x, t), y: lerp(pts[i].y, pts[i+1].y, t)}; }
function crossStrings(pa, pb){
  for (let i = 1; i < pa.length - 1; i++) for (let j = 1; j < pb.length - 1; j++) {
    const h = segX(pa[i], pa[i+1], pb[j], pb[j+1]);
    if (h) return {x: h.x, y: h.y, fa: (i + h.t) / (pa.length - 1), fb: (j + h.u) / (pb.length - 1)};
  }
  return null;
}

// ---------- audio ----------
let AC = null, master = null, noiseBuf = null, zip = null, muted = false;
function initAudio(){
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = 0.7; master.connect(AC.destination);
    noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { AC = null; }
}
function noise(dur, type, freq, q, vol, attack, when){
  if (!AC) return null; const t0 = AC.currentTime + (when || 0);
  const s = AC.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = AC.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + (attack || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t0, Math.random()); s.stop(t0 + dur + 0.05);
  return {s, f, g};
}
function tone(freq, dur, type, vol, when, slideTo){
  if (!AC) return; const t0 = AC.currentTime + (when || 0);
  const o = AC.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.05);
}
const SFX = {
  zipStart(){ if (!AC || zip) return; const s = AC.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 6;
    const g = AC.createGain(); g.gain.value = 0.0001; s.connect(f); f.connect(g); g.connect(master); s.start(); zip = {s, f, g}; },
  zipSet(p){ if (!zip) return; const t = AC.currentTime; zip.f.frequency.setTargetAtTime(700 + p * 2600, t, 0.03); zip.g.gain.setTargetAtTime(0.04 + Math.min(1.4, p) * 0.22, t, 0.03); },
  zipStop(){ if (!zip) return; const z = zip; zip = null; const t = AC.currentTime; z.g.gain.setTargetAtTime(0.0001, t, 0.02); z.s.stop(t + 0.15); },
  pech(){ tone(220, 0.12, 'square', 0.12, 0, 440); noise(0.15, 'highpass', 3000, 1, 0.25); },
  snap(){ noise(0.18, 'highpass', 2500, 0.8, 0.6, 0.002); tone(160, 0.25, 'sine', 0.5, 0, 45); },
  cheer(){ if (!AC) return; const n = noise(1.7, 'bandpass', 1300, 0.6, 0.32, 0.25);
    if (n) { const l = AC.createOscillator(), lg = AC.createGain(); l.frequency.value = 7; lg.gain.value = 500; l.connect(lg); lg.connect(n.f.frequency); l.start(); l.stop(AC.currentTime + 1.8); }
    tone(1800, 0.35, 'sine', 0.08, 0.15, 2600); tone(2200, 0.3, 'sine', 0.06, 0.5, 3000); },
  kaipo(c){ const base = 523 * Math.pow(1.06, Math.min(6, c - 1) * 2); [0, 4, 7, 12].forEach((s, i) => tone(base * Math.pow(2, s / 12), 0.18, 'triangle', 0.16, i * 0.07)); },
  lose(){ tone(420, 0.6, 'sawtooth', 0.14, 0, 90); noise(0.25, 'lowpass', 600, 1, 0.3); },
  wind(){ noise(1.4, 'bandpass', 500, 0.8, 0.12, 0.5); },
  launch(){ tone(300, 0.3, 'triangle', 0.1, 0, 700); },
  boss(){ tone(110, 0.5, 'sawtooth', 0.15, 0, 90); tone(165, 0.5, 'sawtooth', 0.1, 0.12, 120); },
  win(){ [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => tone(523 * Math.pow(2, s/12), 0.25, 'triangle', 0.14, i * 0.09)); },
};
function buzz(p){ try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }

// ---------- entities ----------
const RIVAL_COLS = [['#2f7cff','#7fd1ff'],['#18b26b','#b6f36a'],['#9b4dff','#ff8be0'],['#ff7a1a','#ffe14d'],['#00a6a6','#ff5f5f'],['#e83a3a','#ffffff']];
let rid = 0;
function makeKite(x, y, c1, c2, size){ const k = {x, y, vx: 0, vy: 0, tx: x, ty: y, c1, c2, size, rot: 0, alive: true, falling: false, knot: null, tail: []};
  for (let i = 0; i < 7; i++) k.tail.push({x, y: y + size + i * 7, px: x, py: y + size + i * 7}); return k; }
function newPlayer(launch){
  const a = playerRoof.anchor;
  const k = makeKite(launch ? a.x : 200, launch ? a.y - 20 : H * 0.42, '#ff2d6f', '#ffd23f', 17);
  k.anchor = a; k.tx = 200; k.ty = H * 0.42; k.isPlayer = true; k.inv = launch ? 2.2 : 0.8; k.launchBlink = launch;
  return k;
}
function spawnRival(opts){
  opts = opts || {};
  // choose roof with fewest kites
  const counts = roofs.map((_, i) => G.rivals.filter(r => r.alive && r.roof === i).length);
  let roof = opts.roof;
  if (roof == null) { let best = 99; roofs.forEach((_, i) => { const c = counts[i] + Math.random() * 0.5; if (c < best) { best = c; roof = i; } }); }
  const slot = counts[roof] % 2;
  const anchor = roofAnchor(roof, slot), R = roofs[roof];
  const boss = !!opts.boss;
  const cols = boss ? ['#1b1b2a', '#ffc21a'] : RIVAL_COLS[(rid) % RIVAL_COLS.length];
  const hx = R.side < 0 ? rnd(55, 160) : rnd(240, 345), hy = boss ? rnd(sky.top + 40, sky.top + 160) : rnd(sky.top + 20, sky.bottom - 20);
  const inSky = !!opts.inSky;
  const k = makeKite(inSky ? hx : anchor.x, inSky ? hy : anchor.y - 15, cols[0], cols[1], boss ? 27 : rnd(14, 16.5));
  Object.assign(k, {id: ++rid, roof, slot, anchor, boss, hx, hy, side: R.side, state: 'wander', timer: rnd(0.5, 1.5),
    launching: !inSky, huntCool: rnd(2, 4), rookie: !!opts.rookie, counts: !boss || true,
    pBase: boss ? 0.3 : 0.14, pAmp: boss ? 0.56 : 0.5, phase: rnd(0, 6), aggr: boss ? 1.8 : rnd(0.8, 1.2)});
  if (opts.rookie) { k.pBase = 0.04; k.pAmp = 0.3; }
  k.tx = hx; k.ty = hy;
  G.rivals.push(k);
  if (!inSky) SFX.launch();
  ev('spawn', {id: k.id, boss});
  return k;
}

// ---------- game ----------
function newGame(){
  rid = 0;
  G = {mode: 'play', t: 0, timeLeft: T.levelTime, score: 0, cuts: 0, lives: T.lives, combo: 0, bestCombo: 0, lastCut: -99,
    wind: 0.6, windTarget: 0.6, windTimer: 9, rivals: [], parts: [], pops: [], shake: 0, pech: null, spawnTimer: 2.5,
    bossSpawned: false, respawn: 0, firstHunt: 2.2, dragDist: 0, pechCount: 0, flash: 0, endTimer: 0, banner: null, confetti: 0};
  G.player = newPlayer(false);
  spawnRival({roof: 0, inSky: true, rookie: true});
  spawnRival({roof: 2, inSky: true});
  spawnRival({roof: 3, inSky: true});
  G.rivals[0].hx = 110; G.rivals[0].hy = H * 0.36; G.rivals[0].x = G.rivals[0].tx = 110; G.rivals[0].y = G.rivals[0].ty = H * 0.36;
  ev('start');
}
function difficulty(){ return clamp(G.t / 95, 0, 1); }

// input (relative drag)
const inp = {down: false, id: null, lx: 0, ly: 0, moved: 0, speed: 0};
function toWorld(cx, cy){ return {x: (cx - OX) / SC, y: cy / SC}; }
cv.addEventListener('pointerdown', e => { e.preventDefault(); initAudio(); if (inp.down) return; inp.down = true; inp.id = e.pointerId; const p = toWorld(e.clientX, e.clientY); inp.lx = p.x; inp.ly = p.y; try { cv.setPointerCapture(e.pointerId); } catch (_) {} });
cv.addEventListener('pointermove', e => { if (!inp.down || e.pointerId !== inp.id) return; e.preventDefault();
  const p = toWorld(e.clientX, e.clientY), dx = p.x - inp.lx, dy = p.y - inp.ly; inp.lx = p.x; inp.ly = p.y;
  inp.moved += Math.hypot(dx, dy);
  if (G && G.mode === 'play' && G.player.alive && !G.player.falling) { G.player.tx += dx * T.gain; G.player.ty += dy * T.gain; G.dragDist += Math.hypot(dx, dy); }
});
const up = e => { if (e.pointerId !== inp.id) return; inp.down = false; inp.id = null; };
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
// keyboard for desktop testing
const keys = {}; addEventListener('keydown', e => { keys[e.key] = true; }); addEventListener('keyup', e => { keys[e.key] = false; });

function kitePhysics(k, K, D, dt, t){
  const sway = (0.6 + Math.abs(G.wind) * 0.8);
  const ax = (k.tx - k.x) * K - k.vx * D + Math.sin(t * 2.3 + k.size) * 22 * sway;
  const ay = (k.ty - k.y) * K - k.vy * D + Math.cos(t * 1.7 + k.size * 2) * 14 * sway;
  k.vx += ax * dt; k.vy += ay * dt; k.x += k.vx * dt; k.y += k.vy * dt;
  k.rot = lerp(k.rot, clamp(k.vx * 0.0028, -0.6, 0.6) + Math.sin(t * 3 + k.size) * 0.06, 1 - Math.exp(-dt * 10));
}
function tailUpdate(k, dt){
  const c = Math.cos(k.rot), s = Math.sin(k.rot), bx = k.x - s * k.size * 1.1, by = k.y + c * k.size * 1.1;
  k.tail[0].x = bx; k.tail[0].y = by;
  for (let i = 1; i < k.tail.length; i++) { const p = k.tail[i], q = k.tail[i-1];
    const vx = (p.x - p.px) * 0.9, vy = (p.y - p.py) * 0.9; p.px = p.x; p.py = p.y;
    p.x += vx + G.wind * 0.35 * dt * 60 * 0.4; p.y += vy + 0.5 * dt * 60 * 0.3;
    const dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy) || 1, L = k.size * 0.42;
    p.x = q.x + dx / d * L; p.y = q.y + dy / d * L; }
}

function aiRival(r, dt){
  const P = G.player, dif = difficulty();
  r.timer -= dt; r.huntCool -= dt;
  if (r.launching) { r.launchT = (r.launchT || 0) + dt; if (r.y < r.anchor.y - 130 || r.launchT > 2.2 || Math.hypot(r.x - r.tx, r.y - r.ty) < 40) r.launching = false; }
  const huntsNow = G.rivals.filter(o => o.alive && !o.falling && o.state === 'hunt').length;
  const maxHunters = dif > 0.55 ? 2 : 1;
  if (r.state === 'wander') {
    if (r.timer <= 0) {
      r.timer = rnd(1.2, 2.6);
      r.tx = clamp(r.hx + rnd(-70, 70), 30, 370); r.ty = clamp(r.hy + rnd(-60, 60), sky.top, sky.bottom);
      const pHunt = (0.24 + 0.6 * dif) * r.aggr;
      const canHunt = P.alive && !P.falling && P.inv <= 0 && !G.pech && huntsNow < maxHunters && r.huntCool <= 0 && !r.launching;
      const first = G.firstHunt <= 0 && r.rookie && G.pechCount === 0;
      if (canHunt && (first || Math.random() < pHunt)) { r.state = 'hunt'; r.timer = rnd(3, 4.5) - (r.boss ? 0 : 0); r.huntFrac = rnd(0.5, 0.78); ev('hunt', {id: r.id}); }
    }
  } else if (r.state === 'hunt') {
    if (!P.alive || P.falling || P.inv > 0 || (G.pech && G.pech.r !== r)) { r.state = 'wander'; r.timer = 0.6; r.huntCool = 2.5; }
    else if (!G.pech) {
      const ps = stringPts(P), Q = pointAt(ps, r.huntFrac), Q2 = pointAt(ps, r.huntFrac + 0.08);
      let nx = -(Q2.y - Q.y), ny = Q2.x - Q.x; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      const side = Math.sign((r.x - Q.x) * nx + (r.y - Q.y) * ny) || 1;
      r.tx = clamp(Q.x - nx * side * 85, 25, 375); r.ty = clamp(Q.y - ny * side * 85, sky.top, sky.bottom + 40);
      if (r.timer <= 0) { r.state = 'wander'; r.timer = 0.5; r.huntCool = rnd(3, 5) * (1.2 - dif * 0.5); }
    }
  }
  if (G.pech && G.pech.r === r) { // pull away during pech
    r.tx = lerp(r.tx, r.hx, dt * 0.5); r.ty = lerp(r.ty, sky.top + 30, dt * 0.3);
  }
  const K = r.boss ? T.bossK : T.rK, D = r.boss ? T.bossD : T.rD;
  const boost = r.state === 'hunt' ? (1.25 + 0.5 * dif) : 1;
  kitePhysics(r, K * boost, D * Math.sqrt(boost), dt, G.t);
  r.x = clamp(r.x, 14, 386); r.y = clamp(r.y, sky.top - 10, r.launching ? H : sky.bottom + 60);
}

function startPech(r, hit){
  const P = G.player;
  const ps = Math.hypot(P.vx, P.vy);
  const startBar = clamp(ps / 1400, 0, 0.35) - (r.state === 'hunt' ? 0.12 : 0);
  G.pech = {r, x: hit.x, y: hit.y, fa: hit.fa, fb: hit.fb, bar: startBar, t: 0, rp: 0, pp: 0, sweet: false};
  G.pechCount++;
  SFX.pech(); SFX.zipStart(); buzz(35);
  G.shake = Math.max(G.shake, 5);
  burst(hit.x, hit.y, 18, ['#fff6a8', '#ffcf3f', '#ff8a1f'], 260);
  ev('pech', {id: r.id, boss: r.boss, bar: +startBar.toFixed(2)});
}
function updatePech(dt){
  const p = G.pech, r = p.r, P = G.player;
  p.t += dt;
  // knot = shared tangle point, slides between both straight lines
  const pa = P.anchor, ra = r.anchor;
  const k1 = {x: lerp(pa.x, P.x, p.fa), y: lerp(pa.y, P.y, p.fa)}, k2 = {x: lerp(ra.x, r.x, p.fb), y: lerp(ra.y, r.y, p.fb)};
  p.x = (k1.x + k2.x) / 2; p.y = (k1.y + k2.y) / 2;
  P.knot = r.knot = {x: p.x, y: p.y};
  // powers
  r.phase += dt * (r.boss ? 3.4 : 2.6);
  const dif = difficulty();
  const s = 0.5 + 0.5 * Math.sin(r.phase);
  p.rp = (r.pBase + r.pAmp * s) * (0.85 + 0.3 * dif);
  p.sweet = s < 0.32;
  const kb = (keys[' '] ? 900 : 0);
  p.pp = clamp((inp.speed + kb) / T.powerDiv, 0, 1.6); p.sumP = (p.sumP || 0) + p.pp * dt; p.sumR = (p.sumR || 0) + p.rp * dt;
  const gainP = p.pp * (p.sweet ? T.sweetMult : 1);
  p.bar += ((gainP - p.rp) * T.barRate * (1 + p.t * 0.6) + p.bar * 0.5) * dt;
  // sparks & feedback
  const inten = clamp(p.pp + p.rp, 0.2, 2);
  burst(p.x, p.y, 2 + (inten * 3 | 0), ['#fffbd0', '#ffd23f', '#ff9a1f', '#ffffff'], 180 + inten * 170);
  G.shake = Math.max(G.shake, 1 + inten * 1.2);
  SFX.zipSet(inten * 0.7);
  if (p.bar >= 1 || (p.t > 5 && p.bar >= 0)) winPech();
  else if (p.bar <= -1 || p.t > 5) losePech();
}
function endPechCommon(){ const p = G.pech; SFX.zipStop(); G.player.knot = null; p.r.knot = null; G.pech = null; return p; }
function winPech(){
  const p = endPechCommon(), r = p.r;
  cutKite(r, true);
  G.player.inv = 1.2;
  const clean = p.t < 0.9;
  G.combo = (G.t - G.lastCut <= T.comboWindow) ? G.combo + 1 : 1;
  G.lastCut = G.t; G.bestCombo = Math.max(G.bestCombo, G.combo);
  let pts = 100 * Math.min(G.combo, 5) + (clean ? 50 : 0) + (r.boss ? 500 : 0);
  G.score += pts;
  if (r.boss || G.cuts < T.goal - 1) G.cuts++;
  pop(p.x, p.y - 10, 'KAI PO CHE!', r.boss ? 46 : 34, '#ffffff', '#e8245f', 1.3);
  pop(p.x, p.y + 26, '+' + pts, 22, '#ffe14d', '#7a3a00', 1.0, 0.15);
  if (G.combo > 1) pop(200, H * 0.30, 'x' + G.combo + ' COMBO!', 30 + G.combo * 3, '#ffe14d', '#b0003a', 1.1, 0.1);
  if (clean) pop(p.x, p.y + 52, 'CLEAN CUT', 16, '#bfffcf', '#0b5a2a', 0.9, 0.25);
  G.shake = r.boss ? 22 : 12; G.flash = r.boss ? 0.5 : 0.25;
  burst(p.x, p.y, r.boss ? 70 : 40, ['#ffffff', '#ffe14d', '#ff8a1f', r.c1, r.c2], r.boss ? 520 : 380);
  SFX.snap(); SFX.kaipo(G.combo); setTimeout(() => SFX.cheer(), 120); buzz(r.boss ? [60, 40, 60, 40, 160] : [30, 40, 70]);
  ev('cut', {id: r.id, boss: r.boss, combo: G.combo, cuts: G.cuts, pechTime: +p.t.toFixed(2), avgP: +(p.sumP / p.t).toFixed(2), avgR: +(p.sumR / p.t).toFixed(2)});
  if (r.boss) { G.mode = 'won'; G.endTimer = 2.2; G.confetti = 3; SFX.win(); ev('win', {score: G.score}); }
  else if (G.cuts === T.goal - 1 && !G.bossSpawned && !(G.bossTimer > 0)) { G.bossTimer = 1.6; }
}
function losePech(){
  const p = endPechCommon(), r = p.r;
  r.state = 'wander'; r.timer = 0.8; r.huntCool = 3.5;
  pop(p.x, p.y - 10, 'CUT!', 34, '#ffffff', '#3a2340', 1.0);
  burst(p.x, p.y, 30, ['#ffffff', '#ffd23f', '#888'], 300);
  ev('lose_pech', {id: r.id, pechTime: +p.t.toFixed(2), avgP: +(p.sumP / p.t).toFixed(2), avgR: +(p.sumR / p.t).toFixed(2)});
  loseKite();
}
function loseKite(){
  const P = G.player;
  cutKite(P, false);
  G.lives--; G.combo = 0; G.shake = 16; G.flash = 0.3; G.flashCol = '255,40,60';
  SFX.snap(); SFX.lose(); buzz([200, 60, 120]);
  ev('kite_lost', {lives: G.lives});
  if (G.lives <= 0) { G.mode = 'lost'; G.endTimer = 1.8; G.lostWhy = 'kites'; ev('lose', {why: 'kites'}); }
  else { G.respawn = 1.3; }
}
function cutKite(k, isRival){
  k.falling = true; k.knot = null; k.spin = rnd(-6, 6) || 3; k.vy = -80; k.vx = (k.vx || 0) * 0.3 + rnd(-60, 60); k.fallT = 0;
  k.looseFrom = {x: k.x, y: k.y + k.size};
  if (isRival) { k.state = 'dead'; }
}

// particles & pops
function burst(x, y, n, cols, sp){ for (let i = 0; i < n && G.parts.length < 380; i++) { const a = Math.random() * 6.283, v = rnd(0.25, 1) * sp;
  G.parts.push({x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: rnd(0.25, 0.7), max: 0.7, c: cols[(Math.random() * cols.length) | 0], s: rnd(1.2, 3)}); } }
function pop(x, y, text, size, fill, stroke, life, delay){ G.pops.push({x: clamp(x, 90, 310), y: clamp(y, 140, H - 200), text, size, fill, stroke, life: life || 1, max: life || 1, delay: delay || 0}); }

function update(dt){
  if (!G) return;
  G.t += dt;
  // finger speed (smoothed) from distance moved this frame
  const inst = inp.moved / Math.max(dt, 1e-3); inp.moved = 0;
  inp.speed = lerp(inp.speed, inst, 1 - Math.exp(-dt * 12));
  if (!inp.down) inp.speed *= Math.exp(-dt * 8);
  if (G.mode === 'play') {
    G.timeLeft -= dt;
    if (G.timeLeft <= 0) { G.timeLeft = 0; G.mode = 'lost'; G.endTimer = 1.2; G.lostWhy = 'time'; if (G.pech) endPechCommon(); ev('lose', {why: 'time'}); SFX.lose(); }
  }
  G.firstHunt -= dt;
  // wind
  G.windTimer -= dt;
  if (G.windTimer <= 0 && G.mode === 'play') { G.windTimer = rnd(11, 17); let w; do { w = rnd(-1.4, 1.4); } while (Math.abs(w - G.wind) < 0.7); G.windTarget = w; G.banner = {text: 'WIND ' + (w > 0 ? '→' : '←'), life: 1.6}; SFX.wind(); ev('wind', {w: +w.toFixed(2)}); }
  G.wind = lerp(G.wind, G.windTarget, 1 - Math.exp(-dt * 1.2));

  // player
  const P = G.player;
  if (P.inv > 0) P.inv -= dt;
  if (!P.falling && G.mode !== 'lost') {
    if (!inp.down) { P.ty += T.fall * dt; }
    const kx = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0), ky = (keys.ArrowDown ? 1 : 0) - (keys.ArrowUp ? 1 : 0);
    if (kx || ky) { P.tx += kx * 420 * dt; P.ty += ky * 420 * dt; inp.moved += 0; }
    P.tx += G.wind * T.windV * dt;
    P.tx = clamp(P.tx, 22, 378); P.ty = clamp(P.ty, sky.top, sky.bottom + 30);
    kitePhysics(P, T.pK, T.pD, dt, G.t);
    P.x = clamp(P.x, 14, 386); P.y = clamp(P.y, sky.top - 12, H - 200);
  }
  // respawn
  if (G.respawn > 0) { G.respawn -= dt; if (G.respawn <= 0 && G.mode === 'play') { G.deadPlayers = (G.deadPlayers || []); G.deadPlayers.push(G.player); G.player = newPlayer(true); SFX.launch(); ev('launch'); } }
  // spawn rivals
  const alive = G.rivals.filter(r => r.alive && !r.falling);
  const wantN = G.cuts >= T.goal - 1 ? 2 : (G.t < 25 ? 3 : G.t < 55 ? 4 : 5);
  if (G.mode === 'play') {
    if (G.bossTimer > 0) { G.bossTimer -= dt; if (G.bossTimer <= 0 && !G.bossSpawned) { G.bossSpawned = true; spawnRival({boss: true, roof: 3}); G.banner = {text: 'BOSS KITE!', life: 2.2, big: true}; SFX.boss(); buzz([80, 60, 80]); } }
    G.spawnTimer -= dt;
    const regular = alive.filter(r => !r.boss).length;
    const wantReg = G.bossSpawned ? 1 : wantN;
    if (G.spawnTimer <= 0 && regular < wantReg && !(G.cuts >= T.goal - 1 && !G.bossSpawned && regular >= 1)) { spawnRival(); G.spawnTimer = rnd(1.0, 2.0); }
  }
  // rivals
  for (const r of G.rivals) {
    if (r.falling) { r.fallT += dt; r.vy = Math.min(r.vy + 260 * dt, 240); r.vx += G.wind * 40 * dt; r.x += r.vx * dt; r.y += r.vy * dt; r.rot += r.spin * dt; if (r.y > H + 60) r.alive = false; continue; }
    if (G.mode !== 'lost') aiRival(r, dt);
    tailUpdate(r, dt);
  }
  G.rivals = G.rivals.filter(r => r.alive);
  // falling player kites
  const fl = [P].concat(G.deadPlayers || []);
  for (const k of fl) if (k.falling) { k.fallT += dt; k.vy = Math.min(k.vy + 260 * dt, 240); k.vx += G.wind * 40 * dt; k.x += k.vx * dt; k.y += k.vy * dt; k.rot += k.spin * dt; }
  if (G.deadPlayers) G.deadPlayers = G.deadPlayers.filter(k => k.y < H + 60);
  tailUpdate(P, dt);
  // pech detection
  if (G.mode === 'play') {
    if (G.pech) { if (G.pech.r.falling || !G.pech.r.alive || P.falling) endPechCommon(); else updatePech(dt); }
    else if (!P.falling && P.inv <= 0) {
      const ps = stringPts(P);
      for (const r of G.rivals) { if (r.falling || r.launching) continue; const hit = crossStrings(ps, stringPts(r)); if (hit) { startPech(r, hit); break; } }
    }
  }
  // fx
  for (const p of G.parts) { p.vx *= Math.exp(-dt * 2); p.vy += 380 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
  G.parts = G.parts.filter(p => p.life > 0);
  for (const p of G.pops) { if (p.delay > 0) p.delay -= dt; else p.life -= dt; }
  G.pops = G.pops.filter(p => p.life > 0);
  G.shake *= Math.exp(-dt * 9); G.flash = Math.max(0, G.flash - dt);
  if (G.banner) { G.banner.life -= dt; if (G.banner.life <= 0) G.banner = null; }
  if (G.confetti > 0) { G.confetti -= dt; if (G.parts.length < 300) for (let i = 0; i < 4; i++) G.parts.push({x: rnd(0, 400), y: -10, vx: rnd(-40, 40), vy: rnd(40, 120), life: 2.5, max: 2.5, c: RIVAL_COLS[(Math.random() * 6) | 0][Math.random() < 0.5 ? 0 : 1], s: rnd(2, 4), conf: true}); }
  if (G.mode !== 'play' && G.endTimer > 0) { G.endTimer -= dt; if (G.endTimer <= 0) showEnd(); }
}

// ---------- drawing ----------
const bgCity = []; for (let i = 0; i < 26; i++) bgCity.push({w: rnd(18, 40), h: rnd(40, 120), dome: Math.random() < 0.18});
const farKites = []; for (let i = 0; i < 14; i++) farKites.push({x: rnd(0, 400), y: rnd(0.15, 0.55), s: rnd(3, 6), c: RIVAL_COLS[i % 6][i % 2], p: rnd(0, 6)});
function drawBG(t){
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#5fb4ff'); g.addColorStop(0.45, '#9fd3ff'); g.addColorStop(0.72, '#ffd6a0'); g.addColorStop(1, '#ffb07a');
  ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);
  // sun
  ctx.fillStyle = 'rgba(255,240,180,0.55)'; ctx.beginPath(); ctx.arc(320, H * 0.58, 60, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#fff4c8'; ctx.beginPath(); ctx.arc(320, H * 0.58, 38, 0, 6.283); ctx.fill();
  // clouds
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i < 4; i++) { const x = ((i * 130 + t * (6 + i * 2) + G.wind * t * 2) % 560) - 80, y = 140 + i * 70; cloud(x, y, 1 + (i % 2) * 0.3); }
  // far kites (decor)
  for (const k of farKites) { const x = (k.x + Math.sin(t * 0.5 + k.p) * 10 + 400) % 400, y = H * k.y + Math.cos(t * 0.7 + k.p) * 6;
    ctx.fillStyle = k.c; ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.moveTo(x, y - k.s); ctx.lineTo(x + k.s * 0.8, y); ctx.lineTo(x, y + k.s * 1.1); ctx.lineTo(x - k.s * 0.8, y); ctx.fill(); ctx.globalAlpha = 1; }
  // far city
  ctx.fillStyle = '#e7a07f'; let x = -10; const base = H - 300;
  for (const b of bgCity) { ctx.fillRect(x, base - b.h, b.w, b.h + 400); if (b.dome) { ctx.beginPath(); ctx.arc(x + b.w / 2, base - b.h, b.w / 2, Math.PI, 0); ctx.fill(); } x += b.w - 2; if (x > W + 10) break; }
}
function cloud(x, y, s){ ctx.beginPath(); ctx.arc(x, y, 18 * s, 0, 6.283); ctx.arc(x + 20 * s, y - 8 * s, 22 * s, 0, 6.283); ctx.arc(x + 44 * s, y, 17 * s, 0, 6.283); ctx.fill(); }
function drawRoof(R, i){
  // building body
  const top = R.y;
  ctx.fillStyle = R.col; ctx.fillRect(R.x - R.w / 2 - (R.side < 0 ? 40 : 0), top, R.w + 40, H - top + 10);
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(R.x - R.w / 2 - (R.side < 0 ? 40 : 0), top, R.w + 40, 7);
  // windows
  ctx.fillStyle = 'rgba(60,30,40,0.35)';
  for (let wy = top + 24; wy < H - 100; wy += 34) for (let wx = R.x - R.w / 2 - (R.side < 0 ? 30 : -8); wx < R.x + R.w / 2 + (R.side < 0 ? -6 : 34); wx += 22) ctx.fillRect(wx, wy, 10, 16);
}
function drawPerson(x, y, col, flip, pull){
  ctx.save(); ctx.translate(x, y); ctx.scale(flip, 1);
  ctx.strokeStyle = '#3a2340'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.fillStyle = col; ctx.fillRect(-6, -26, 12, 16);           // shirt
  ctx.beginPath(); ctx.moveTo(-3, -10); ctx.lineTo(-5, 0); ctx.moveTo(3, -10); ctx.lineTo(5, 0); ctx.stroke(); // legs
  ctx.beginPath(); ctx.moveTo(4, -22); ctx.lineTo(12 + pull, -32); ctx.stroke(); // arm up
  ctx.fillStyle = '#8a5a3c'; ctx.beginPath(); ctx.arc(0, -32, 6, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#2a1a1a'; ctx.beginPath(); ctx.arc(0, -34, 6, Math.PI, 0); ctx.fill();
  ctx.restore();
}
function drawString(k, col, w, glow){
  const pts = stringPts(k);
  if (glow) { ctx.strokeStyle = glow; ctx.lineWidth = w + 3; ctx.globalAlpha = 0.35; poly(pts); ctx.globalAlpha = 1; }
  ctx.strokeStyle = col; ctx.lineWidth = w; poly(pts);
}
function poly(pts){ ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke(); }
function drawKite(k, alpha){
  ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha;
  // tail
  ctx.strokeStyle = k.c2; ctx.lineWidth = k.boss ? 3 : 2; ctx.beginPath(); ctx.moveTo(k.tail[0].x, k.tail[0].y);
  for (let i = 1; i < k.tail.length; i++) ctx.lineTo(k.tail[i].x, k.tail[i].y); ctx.stroke();
  for (let i = 2; i < k.tail.length; i += 2) { ctx.fillStyle = i % 4 ? k.c1 : k.c2; ctx.fillRect(k.tail[i].x - 2.5, k.tail[i].y - 2.5, 5, 5); }
  ctx.translate(k.x, k.y); ctx.rotate(k.rot); const s = k.size;
  if (k.isPlayer && !k.falling) { ctx.shadowColor = 'rgba(255,45,111,0.8)'; ctx.shadowBlur = 14; }
  if (k.boss) { ctx.shadowColor = 'rgba(255,194,26,0.9)'; ctx.shadowBlur = 18; }
  ctx.fillStyle = k.c1; ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.85, -s * 0.05); ctx.lineTo(0, s * 1.1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = k.c2; ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(-s * 0.85, -s * 0.05); ctx.lineTo(0, s * 1.1); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = k.c1; ctx.beginPath(); ctx.moveTo(0, s * 0.35); ctx.lineTo(s * 0.32, s * 0.68); ctx.lineTo(-s * 0.32, s * 0.68); ctx.closePath(); ctx.globalAlpha *= 0.6; ctx.fill(); ctx.globalAlpha = alpha == null ? 1 : alpha;
  ctx.strokeStyle = 'rgba(60,30,30,0.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(0, s * 1.1); ctx.moveTo(-s * 0.85, -s * 0.05); ctx.quadraticCurveTo(0, -s * 0.5, s * 0.85, -s * 0.05); ctx.stroke();
  // little tail tassel
  ctx.fillStyle = k.c2; ctx.beginPath(); ctx.moveTo(0, s * 1.05); ctx.lineTo(s * 0.3, s * 1.45); ctx.lineTo(-s * 0.3, s * 1.45); ctx.closePath(); ctx.fill();
  if (k.boss) { ctx.fillStyle = '#ffc21a'; ctx.font = '900 11px system-ui'; ctx.textAlign = 'center'; ctx.fillText('BOSS', 0, -s - 6); }
  ctx.restore();
}
function drawLoose(k){ // dangling cut string under falling kite
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(k.x, k.y + k.size);
  ctx.quadraticCurveTo(k.x - 20 - G.wind * 10, k.y + 40, k.x - 10 - G.wind * 20, k.y + 80); ctx.stroke();
}
function txt(s, x, y, size, fill, stroke, align, weight){
  ctx.font = (weight || 900) + ' ' + size + 'px system-ui,-apple-system,Segoe UI,Roboto,sans-serif'; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineWidth = Math.max(3, size / 6); ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = fill; ctx.fillText(s, x, y);
}
function rrect(x, y, w, h, r){ ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function drawHUD(){
  // top panel
  ctx.fillStyle = 'rgba(40,20,55,0.55)'; rrect(8, 10, 384, 44, 14); ctx.fill();
  txt(String(G.score), 22, 32, 22, '#ffe14d', null, 'left');
  const tl = Math.ceil(G.timeLeft), mm = (tl / 60) | 0, ss = tl % 60;
  txt(mm + ':' + (ss < 10 ? '0' : '') + ss, 200, 32, 22, G.timeLeft < 15 ? '#ff6b6b' : '#ffffff');
  for (let i = 0; i < T.lives; i++) { const x = 370 - i * 24, y = 32, on = i < G.lives; ctx.globalAlpha = on ? 1 : 0.25;
    ctx.fillStyle = '#ff2d6f'; ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x + 8, y); ctx.lineTo(x, y + 11); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x - 8, y); ctx.lineTo(x, y + 11); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
  // second row: cuts + wind
  ctx.fillStyle = 'rgba(40,20,55,0.45)'; rrect(8, 60, 120, 30, 10); ctx.fill(); rrect(272, 60, 120, 30, 10); ctx.fill();
  txt('✂ ' + G.cuts + '/' + T.goal, 68, 76, 17, '#fff');
  const wv = G.wind; txt('WIND', 300, 76, 12, '#ffe9c7', null, 'center', 800);
  ctx.save(); ctx.translate(350, 76); ctx.scale(Math.sign(wv) || 1, 1); const L = 12 + Math.abs(wv) * 14;
  ctx.strokeStyle = '#7fe0ff'; ctx.fillStyle = '#7fe0ff'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-L / 2, 0); ctx.lineTo(L / 2, 0); ctx.stroke(); ctx.beginPath(); ctx.moveTo(L / 2 + 6, 0); ctx.lineTo(L / 2 - 3, -7); ctx.lineTo(L / 2 - 3, 7); ctx.fill(); ctx.restore();
  if (G.combo > 1 && G.t - G.lastCut < T.comboWindow) { const f = 1 - (G.t - G.lastCut) / T.comboWindow; ctx.fillStyle = 'rgba(232,36,95,0.85)'; rrect(150, 62, 100 * f, 26, 9); ctx.fill(); txt('COMBO x' + G.combo, 200, 76, 14, '#fff'); }
  // pech meter
  const p = G.pech;
  if (p) {
    const y = 122, x0 = 40, w = 320, f = clamp((p.bar + 1) / 2, 0, 1);
    txt(p.sweet ? 'PULL NOW!' : 'PECH! SAW FAST ↔', 200, y - 16, p.sweet ? 24 : 20, p.sweet ? '#6dff8a' : '#fff', '#3a2340');
    ctx.fillStyle = 'rgba(40,20,55,0.75)'; rrect(x0 - 4, y - 4, w + 8, 26, 13); ctx.fill();
    ctx.fillStyle = p.r.c1; rrect(x0, y, w, 18, 9); ctx.fill();
    ctx.fillStyle = '#ff2d6f'; rrect(x0, y, Math.max(18, w * f), 18, 9); ctx.fill();
    if (p.sweet) { ctx.strokeStyle = '#6dff8a'; ctx.lineWidth = 3; rrect(x0 - 4, y - 4, w + 8, 26, 13); ctx.stroke(); }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x0 + w * f, y + 9, 12, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#ff2d6f'; ctx.beginPath(); ctx.arc(x0 + w * f, y + 9, 6, 0, 6.283); ctx.fill();
    txt('YOU', x0 + 4, y + 36, 12, '#ff2d6f', '#fff', 'left'); txt(p.r.boss ? 'BOSS' : 'RIVAL', x0 + w - 4, y + 36, 12, p.r.boss ? '#ffc21a' : p.r.c1, '#fff', 'right');
  }
  if (G.banner) { const b = G.banner, a = clamp(b.life * 2, 0, 1); ctx.globalAlpha = a; txt(b.text, 200, b.big ? H * 0.27 : 170, b.big ? 44 : 26, b.big ? '#ffc21a' : '#ffffff', '#3a2340'); ctx.globalAlpha = 1; }
  // first-time hint
  if (G.mode === 'play' && G.dragDist < 160 && G.t < 12) {
    const a = 0.6 + 0.4 * Math.sin(G.t * 6); ctx.globalAlpha = a;
    const hx = 200 + Math.sin(G.t * 3) * 60, hy = H - 300;
    txt('👆', hx, hy, 40, '#fff'); txt('Drag anywhere to fly', 200, hy + 42, 20, '#fff', '#3a2340'); ctx.globalAlpha = 1;
  } else if (G.pech && G.pechCount <= 3) {
    const hx = 200 + Math.sin(G.t * 18) * 40; txt('👆', hx, H - 300, 40, '#fff'); txt('Drag back & forth FAST!', 200, H - 258, 20, '#fff', '#3a2340');
  } else if (G.mode === 'play' && G.pechCount === 0 && G.t > 4 && G.t < 20) {
    txt('Cross a rival kite\'s string!', 200, H - 290, 20, '#fff', '#3a2340');
  }
}
function render(){
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#2a1d3a'; ctx.fillRect(0, 0, cv.width, cv.height);
  if (!G) return;
  ctx.setTransform(DPR * SC, 0, 0, DPR * SC, DPR * OX, 0);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  const sh = G.shake; ctx.translate(rnd(-sh, sh), rnd(-sh, sh));
  const t = G.t;
  drawBG(t);
  // back roofs (higher = further)
  [1, 3, 0, 2].forEach(i => drawRoof(roofs[i], i));
  // rival people
  for (const r of G.rivals) if (!r.falling) drawPerson(r.anchor.x - 8 * (r.side < 0 ? 1 : -1), roofs[r.roof].y, r.c1, r.side < 0 ? 1 : -1, G.pech && G.pech.r === r ? Math.sin(t * 30) * 3 : 0);
  // strings
  ctx.lineCap = 'round';
  for (const r of G.rivals) if (!r.falling) drawString(r, r.state === 'hunt' && !G.pech ? 'rgba(255,80,80,0.95)' : 'rgba(255,255,255,0.9)', r.state === 'hunt' ? 1.8 : 1.4, null);
  const P = G.player;
  // player roof (front)
  ctx.fillStyle = '#7a4a63'; ctx.fillRect(90, playerRoof.y, 220, H); ctx.fillStyle = '#6a3d55'; ctx.fillRect(84, playerRoof.y - 12, 232, 14);
  ctx.fillStyle = '#ffcf6b'; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(100 + i * 33, playerRoof.y - 14, 3, 0, 6.283); ctx.fill(); }
  if (!P.falling) drawString(P, '#ff2d6f', 2.2, P.inv > 0 ? null : 'rgba(255,90,140,0.8)');
  drawPerson(200, playerRoof.y - 12, '#ff2d6f', 1, G.pech ? Math.sin(t * 30) * 3 : 0);
  ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(190, playerRoof.y - 34, 6, 0, 6.283); ctx.fill(); // firki (reel)
  txt('YOU', 200, playerRoof.y + 28, 14, '#ffe9c7', null, 'center', 800);
  // kites
  for (const r of G.rivals) { if (r.falling) { drawLoose(r); drawKite(r, clamp(1.6 - r.fallT * 0.5, 0, 1)); } else { drawKite(r);
    if (r.state === 'hunt' && !G.pech) { const a = 0.6 + 0.4 * Math.sin(t * 14); ctx.globalAlpha = a; ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(r.x, r.y - r.size - 16, 10, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; txt('!', r.x, r.y - r.size - 15, 15, '#fff'); } } }
  for (const k of (G.deadPlayers || [])) { drawLoose(k); drawKite(k, clamp(1.6 - k.fallT * 0.5, 0, 1)); }
  if (P.falling) { drawLoose(P); drawKite(P, clamp(1.6 - P.fallT * 0.5, 0, 1)); }
  else if (!(P.launchBlink && P.inv > 0 && Math.floor(t * 10) % 2)) drawKite(P);
  // knot glow + sparks
  if (G.pech) { const p = G.pech, rr = 13 + Math.sin(t * 40) * 4;
    const gg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr * 2.4); gg.addColorStop(0, 'rgba(255,255,220,1)'); gg.addColorStop(0.4, 'rgba(255,200,60,0.8)'); gg.addColorStop(1, 'rgba(255,120,0,0)');
    ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(p.x, p.y, rr * 2.4, 0, 6.283); ctx.fill(); }
  for (const p of G.parts) { ctx.globalAlpha = clamp(p.life / (p.conf ? 1 : 0.4), 0, 1); ctx.fillStyle = p.c;
    if (p.conf) ctx.fillRect(p.x, p.y, p.s * 1.6, p.s);
    else { ctx.strokeStyle = p.c; ctx.lineWidth = p.s; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.045, p.y - p.vy * 0.045); ctx.stroke(); } }
  ctx.globalAlpha = 1;
  // pops
  for (const p of G.pops) { if (p.delay > 0) continue; const age = p.max - p.life, s = age < 0.12 ? 0.5 + age / 0.12 * 0.7 : 1.2 - Math.min(0.2, (age - 0.12)); ctx.globalAlpha = clamp(p.life / 0.3, 0, 1);
    ctx.save(); ctx.translate(p.x, p.y - age * 30); ctx.scale(s, s); txt(p.text, 0, 0, p.size, p.fill, p.stroke); ctx.restore(); }
  ctx.globalAlpha = 1;
  if (G.flash > 0) { ctx.fillStyle = 'rgba(' + (G.flashCol || '255,255,255') + ',' + (G.flash * 1.2) + ')'; ctx.fillRect(0, 0, W, H); if (G.flash <= 0.02) G.flashCol = null; }
  ctx.restore();
  drawHUD();
}

// ---------- screens ----------
function showEnd(){
  const won = G.mode === 'won';
  if (won) G.score += Math.ceil(G.timeLeft) * 10 + G.lives * 200;
  $('endTitle').textContent = won ? 'KAI PO CHE!' : (G.lostWhy === 'time' ? "TIME'S UP" : 'KITES CUT!');
  $('endSub').textContent = won ? 'You beat the Boss kite. Uttarayan champion!' : (G.lostWhy === 'time' ? 'Cut kites faster. Swing across their strings!' : 'Saw faster in a pech, and wait for PULL NOW!');
  $('sScore').textContent = G.score; $('sCuts').textContent = G.cuts + '/' + T.goal; $('sCombo').textContent = 'x' + G.bestCombo; $('sTime').textContent = Math.round(G.t) + 's';
  $('end').classList.remove('hide'); G.mode = won ? 'wonScreen' : 'lostScreen'; ev(won ? 'win_screen' : 'lose_screen');
}
function begin(){ initAudio(); $('start').classList.add('hide'); $('end').classList.add('hide'); newGame(); }
$('startBtn').addEventListener('click', begin);
$('retryBtn').addEventListener('click', begin);

// ---------- loop ----------
let last = performance.now();
function frame(now){
  let dt = (now - last) / 1000; last = now; if (dt > 0.05) dt = 0.05;
  if (G && G.mode !== 'wonScreen' && G.mode !== 'lostScreen') { const steps = dt > 0.025 ? 2 : 1; for (let i = 0; i < steps; i++) update(dt / steps); }
  render(); requestAnimationFrame(frame);
}
resize();
// idle background behind start screen
newGame(); G.mode = 'demo'; G.player.alive = true;
requestAnimationFrame(frame);
document.addEventListener('visibilitychange', () => { if (document.hidden) SFX.zipStop(); });

// test/debug hooks (read-only state)
window.__kw = {
  events, T,
  toScreen: (x, y) => ({x: x * SC + OX, y: y * SC}),
  state(){ if (!G) return null; const P = G.player; return {mode: G.mode, t: G.t, timeLeft: G.timeLeft, score: G.score, cuts: G.cuts, lives: G.lives, combo: G.combo, wind: G.wind,
    pech: G.pech ? {id: G.pech.r.id, bar: G.pech.bar, sweet: G.pech.sweet, pp: G.pech.pp, rp: G.pech.rp, x: G.pech.x, y: G.pech.y} : null,
    player: {x: P.x, y: P.y, tx: P.tx, ty: P.ty, falling: P.falling, inv: P.inv, ax: P.anchor.x, ay: P.anchor.y},
    rivals: G.rivals.map(r => ({id: r.id, x: r.x, y: r.y, ax: r.anchor.x, ay: r.anchor.y, boss: r.boss, falling: r.falling, state: r.state, launching: r.launching})),
    W, H, SC, OX, speed: inp.speed}; },
};
})();
