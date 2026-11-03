// Kite Wars: Uttarayan — core gameplay (extends the approved prototype; pech feel unchanged)
'use strict';
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
let DPR = 1, SC = 1, OX = 0, W = 400, H = 800;
const Q = {low: false, fpsAcc: 0, fpsN: 0, slowT: 0, partCap: 380};

// ---------- tuning (prototype values) ----------
const T = {
  levelTime: 120, goal: 8, lives: 3,
  gain: 1.45, pK: 42, pD: 9.5, rK: 16, rD: 5.5, bossK: 26, bossD: 7,
  fall: 26, windV: 30, powerDiv: 420, barRate: 0.9, sweetMult: 1.75, comboWindow: 4.5,
};

let G = null, LV = null, layers = null, layerKey = '';
const events = [];
function ev(type, data){ events.push(Object.assign({t: G ? +G.t.toFixed(2) : 0, type}, data || {})); if (events.length > 600) events.shift(); }
const Game = {onEnd: null, onPauseReq: null};

// ---------- layout ----------
let roofs = [], playerRoof = null, sky = {top: 96, bottom: 500};
function layout(){
  roofs = [
    {x: 34,  y: H - 250, side: -1, w: 70},
    {x: 92,  y: H - 345, side: -1, w: 62},
    {x: 366, y: H - 270, side: 1,  w: 70},
    {x: 306, y: H - 360, side: 1,  w: 62},
  ];
  playerRoof = {x: 200, y: H - 120, anchor: {x: 214, y: H - 158}, ally: {x: 146, y: H - 158}};
  sky.top = 100; sky.bottom = H - 400;
}
function resize(){
  DPR = Math.min(Q.low ? 1 : 2, window.devicePixelRatio || 1);
  const vw = innerWidth, vh = innerHeight;
  const gw = Math.min(vw, vh * 0.62);
  SC = gw / 400; W = 400; H = vh / SC; OX = (vw - gw) / 2;
  cv.width = Math.round(vw * DPR); cv.height = Math.round(vh * DPR);
  cv.style.width = vw + 'px'; cv.style.height = vh + 'px';
  layout(); layerKey = '';
  if (G) { G.player.anchor = playerRoof.anchor; if (G.ally) G.ally.anchor = playerRoof.ally; for (const r of G.rivals) r.anchor = roofAnchor(r.roof, r.slot); }
}
addEventListener('resize', resize);
function roofAnchor(i, slot){ const R = roofs[i]; return {x: R.x + (slot ? 14 : -10) * (R.side < 0 ? 1 : -1), y: R.y - 38}; }
function ensureLayers(theme){ const key = theme + '|' + W + '|' + H.toFixed(1) + '|' + (SC * DPR).toFixed(3); if (key === layerKey && layers) return; layers = buildLayers(theme, W, H, SC * DPR, roofs, playerRoof); layerKey = key; }

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
    const c = {x: (a.x + b.x)/2 + G.wind * 14, y: (a.y + b.y)/2 + d * 0.10};
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
function distToPts(x, y, pts){ let best = 1e9; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i+1], dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy || 1; const t = clamp(((x - a.x) * dx + (y - a.y) * dy) / L, 0, 1); const d = Math.hypot(a.x + dx * t - x, a.y + dy * t - y); if (d < best) best = d; } return best; }

// ---------- player gear ----------
function gear(){ const s = window.SAVE || {}; const skin = SKINS.find(k => k.id === s.kite) || SKINS[0]; const man = MANJAS.find(m => m.id === s.manja) || MANJAS[0]; return {skin, man}; }

// ---------- entities ----------
const RIVAL_COLS = [['#2f7cff','#7fd1ff'],['#18b26b','#b6f36a'],['#9b4dff','#ff8be0'],['#ff7a1a','#ffe14d'],['#00a6a6','#ff5f5f'],['#e83a3a','#ffffff']];
const LED_COLS = [['#00e5ff', '#0a0f2a'], ['#ff2bd6', '#140a24'], ['#7dff3a', '#0a1a12'], ['#ffd400', '#1a140a']];
let rid = 0;
function makeKite(x, y, c1, c2, size){ const k = {x, y, vx: 0, vy: 0, tx: x, ty: y, c1, c2, size, rot: 0, alive: true, falling: false, knot: null, tail: [], vis: 1};
  for (let i = 0; i < 8; i++) k.tail.push({x, y: y + size + i * 7, px: x, py: y + size + i * 7}); return k; }
function newPlayer(launch){
  const a = playerRoof.anchor, g = gear();
  const k = makeKite(launch ? a.x : 200, launch ? a.y - 20 : H * 0.42, g.skin.c1, g.skin.c2, 17);
  k.pat = g.skin.pat; k.anchor = a; k.tx = 200; k.ty = H * 0.42; k.isPlayer = true; k.inv = launch ? 2.2 : 0.8; k.launchBlink = launch; k.tangle = 0;
  return k;
}
function newAlly(launch){
  const a = playerRoof.ally;
  const k = makeKite(launch ? a.x : 130, launch ? a.y - 20 : H * 0.36, '#1f5fd6', '#ffd23f', 16);
  k.pat = 'split'; k.anchor = a; k.tx = 130; k.ty = H * 0.36; k.isAlly = true; k.inv = launch ? 2.5 : 1.5; k.timer = 0; return k;
}
function spawnRival(opts){
  opts = opts || {};
  const counts = roofs.map((_, i) => G.rivals.filter(r => r.alive && r.roof === i).length);
  let roof = opts.roof;
  if (roof == null) { let best = 99; roofs.forEach((_, i) => { const c = counts[i] + Math.random() * 0.5; if (c < best) { best = c; roof = i; } }); }
  const slot = counts[roof] % 2;
  const anchor = roofAnchor(roof, slot), R = roofs[roof];
  const B = opts.boss || null, kind = opts.kind || (B ? 'boss' : 'normal');
  let cols = RIVAL_COLS[rid % RIVAL_COLS.length];
  if (B) cols = (opts.alt && B.cols2) ? B.cols2 : B.cols; else if (kind === 'golden') cols = ['#ffcf3f', '#fff2a8']; else if (kind === 'led') cols = LED_COLS[rid % 4]; else if (kind === 'lantern') cols = ['#ff5a36', '#ffd166'];
  const hx = R.side < 0 ? rnd(55, 160) : rnd(240, 345), hy = B ? rnd(sky.top + 40, sky.top + 160) : rnd(sky.top + 20, sky.bottom - 20);
  const inSky = !!opts.inSky;
  const size = B ? B.size : kind === 'golden' ? 18 : rnd(14, 16.5);
  const k = makeKite(inSky ? hx : anchor.x, inSky ? hy : anchor.y - 15, cols[0], cols[1], size);
  Object.assign(k, {id: ++rid, roof, slot, anchor, boss: !!B, B, kind, hx, hy, side: R.side, state: 'wander', timer: rnd(0.5, 1.5),
    launching: !inSky, huntCool: rnd(2, 4), rookie: !!opts.rookie, opener: !!opts.opener, target: 'player',
    pBase: B ? B.pBase : 0.14, pAmp: B ? B.pAmp : 0.5, phase: rnd(0, 6), aggr: B ? 1.8 : rnd(0.8, 1.2), pullMul: 1, kMul: 1, dodgeCool: 2, dash: 0, blinkT: rnd(0, 2)});
  if (opts.rookie) { k.pBase = 0.04; k.pAmp = 0.3; }
  if (kind === 'golden') { k.pBase = 0.1; k.pAmp = 0.4; k.kMul = 1.0; k.pat = 'golden'; }
  if (kind === 'led' || (B && B.led)) { k.kMul = B ? 1 : 1.25; k.pullMul = B ? 1 : 1.1; k.led = true; }
  if (kind === 'lantern') k.lantern = true;
  if (B) { k.name = B.name; k.who = B.who; k.alt = !!opts.alt; }
  k.tx = hx; k.ty = hy;
  G.rivals.push(k);
  if (!inSky) SFX.launch();
  ev('spawn', {id: k.id, boss: !!B, kind});
  return k;
}

// ---------- game ----------
function lvTheme(){ return chapterTheme(LV.ch); }
function newGame(n, demo){
  LV = LEVELS[n - 1]; rid = 0;
  const g = gear();
  G = {mode: demo ? 'demo' : 'play', n, t: 0, timeLeft: LV.time, score: 0, cuts: 0, lives: LV.lives, lost: 0, combo: 0, bestCombo: 0, lastCut: -99,
    wind: LV.wind * 0.6, windTarget: LV.wind * 0.6, windTimer: Math.min(9, LV.windEvery), rivals: [], parts: [], pops: [], shake: 0, pech: null, spawnTimer: 2.5,
    respawn: 0, firstHunt: 2.2, dragDist: 0, pechCount: 0, flash: 0, endTimer: 0, banner: null, confetti: 0, paused: false,
    coins: 0, golden: 0, lanterns: 0, saved: 0, man: g.man, skin: g.skin,
    flocks: [], flockTimer: LV.pigeons ? LV.pigeons * 0.7 : 0, flockWarn: null,
    gust: null, gustTimer: LV.gusts ? LV.gusts * 0.8 : 0, gustEvery: LV.gusts,
    blackTimer: LV.blackout || 0, black: 0, blackOn: 0,
    ally: null, allyLives: LV.allyLives || 0, allyPech: null, allyRespawn: 0,
    bossLeft: 0, bossQ: [], phase: 1, helpers: LV.rivals[0], slow: 0, zoom: null,
    say: null, sayQ: [], banterDone: {}, cheer: 0, goldTimer: LV.obj === 'golden' ? 1.6 : 0, night: LV.night ? 1 : 0, dusk: 0, storm: 0};
  G.player = newPlayer(false);
  if (LV.obj === 'protect') G.ally = newAlly(false);
  if (LV.obj === 'boss') {
    const B = LV.boss; G.bossLeft = B.hp * (B.count || 1); G.twinHP = {a: B.hp, b: B.hp};
    G.bossQ.push({t: 1.2, alt: false, first: true}); if (B.count > 1) G.bossQ.push({t: 2.0, alt: true});
    for (let i = 0; i < LV.rivals[0]; i++) spawnRival({inSky: true, kind: LV.led >= 1 ? 'led' : 'normal', roof: i === 0 ? 0 : 2});
  } else {
    const n0 = LV.rivals[0];
    spawnRival({roof: 0, inSky: true, rookie: LV.ch === 1 || LV.rookies, opener: true});
    const extraRoofs = [2, 3, 1];
    for (let i = 1; i < n0; i++) spawnRival({roof: extraRoofs[(i - 1) % 3], inSky: true, rookie: !!LV.rookies, kind: pickKind()});
    const r0 = G.rivals[0]; r0.hx = 110; r0.hy = H * 0.36; r0.x = r0.tx = 110; r0.y = r0.ty = H * 0.36;
  }
  ensureLayers(lvTheme());
  ev('start', {level: n});
}
function pickKind(){ const r = Math.random(); if (LV.lanternShare && r < LV.lanternShare) return 'lantern'; if (LV.led && Math.random() < LV.led) return 'led'; return 'normal'; }
function difficulty(){ return lerp(LV.d0, LV.d1, clamp(G.t / 95, 0, 1)) + (G.phase - 1) * 0.12; }

// input (relative drag) — unchanged from prototype
const inp = {down: false, id: null, lx: 0, ly: 0, moved: 0, speed: 0};
function toWorld(cx, cy){ return {x: (cx - OX) / SC, y: cy / SC}; }
cv.addEventListener('pointerdown', e => { e.preventDefault(); initAudio(); if (inp.down) return; inp.down = true; inp.id = e.pointerId; const p = toWorld(e.clientX, e.clientY); inp.lx = p.x; inp.ly = p.y; try { cv.setPointerCapture(e.pointerId); } catch (_) {} });
cv.addEventListener('pointermove', e => { if (!inp.down || e.pointerId !== inp.id) return; e.preventDefault();
  const p = toWorld(e.clientX, e.clientY), dx = p.x - inp.lx, dy = p.y - inp.ly; inp.lx = p.x; inp.ly = p.y;
  inp.moved += Math.hypot(dx, dy);
  if (G && G.mode === 'play' && !G.paused && G.player.alive && !G.player.falling && !(G.player.tangle > 0)) { G.player.tx += dx * T.gain; G.player.ty += dy * T.gain; G.dragDist += Math.hypot(dx, dy); }
});
const up = e => { if (e.pointerId !== inp.id) return; inp.down = false; inp.id = null; };
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
const keys = {}; addEventListener('keydown', e => { keys[e.key] = true; if ((e.key === 'Escape' || e.key === 'p') && G && G.mode === 'play' && Game.onPauseReq) Game.onPauseReq(); }); addEventListener('keyup', e => { keys[e.key] = false; });

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
  r.timer -= dt; r.huntCool -= dt; r.dodgeCool -= dt; if (r.dash > 0) r.dash -= dt;
  if (r.launching) { r.launchT = (r.launchT || 0) + dt; if (r.y < r.anchor.y - 130 || r.launchT > 2.2 || Math.hypot(r.x - r.tx, r.y - r.ty) < 40) r.launching = false; }
  if (r.B && r.B.kind === 'rohan') { r.blinkT += dt; const cyc = r.blinkT % 4.2; r.vis = cyc > 2.8 ? (cyc > 4.0 || cyc < 2.95 ? 0.5 : 0.1) : 1; }
  const huntsNow = G.rivals.filter(o => o.alive && !o.falling && o.state === 'hunt').length;
  const maxHunters = dif > 0.55 ? LV.hunters : Math.max(1, LV.hunters - 1);
  const ally = G.ally && G.ally.alive && !G.ally.falling && G.ally.inv <= 0 && !(G.allyCool > 0) ? G.ally : null;
  if (G.mode === 'demo') { if (r.timer <= 0) { r.timer = rnd(1.2, 2.6); r.tx = clamp(r.hx + rnd(-70, 70), 30, 370); r.ty = clamp(r.hy + rnd(-60, 60), sky.top, sky.bottom); } }
  else if (r.kind === 'golden') {
    if (r.timer <= 0) { r.timer = rnd(1.0, 2.0); r.tx = clamp(r.hx + rnd(-90, 90), 30, 370); r.ty = clamp(r.hy + rnd(-70, 70), sky.top, sky.bottom); }
    const dx = r.x - P.x, dy = r.y - P.y, d = Math.hypot(dx, dy);
    if (d < 105 && !G.pech && !P.falling) { r.tx = clamp(r.x + dx / (d || 1) * 70, 30, 370); r.ty = clamp(r.y + dy / (d || 1) * 55, sky.top, sky.bottom); }
  } else if (r.state === 'wander') {
    if (r.timer <= 0) {
      r.timer = rnd(1.2, 2.6);
      r.tx = clamp(r.hx + rnd(-70, 70), 30, 370); r.ty = clamp(r.hy + rnd(-60, 60), sky.top, sky.bottom);
      const pHunt = (0.24 + 0.6 * dif) * r.aggr * LV.huntMul;
      const canHunt = P.alive && !P.falling && P.inv <= 0 && !G.pech && huntsNow < maxHunters && r.huntCool <= 0 && !r.launching;
      const first = G.firstHunt <= 0 && r.opener && G.pechCount === 0;
      if ((canHunt || (ally && huntsNow < maxHunters && r.huntCool <= 0 && !r.launching && !G.allyPech)) && (first || Math.random() < pHunt)) {
        r.state = 'hunt'; r.timer = rnd(3, 4.5); r.huntFrac = rnd(0.5, 0.78);
        r.target = (ally && !G.allyPech && (!canHunt || Math.random() < 0.45) && !first) ? 'ally' : 'player';
        if (r.target === 'player' && !canHunt) r.state = 'wander';
        else ev('hunt', {id: r.id, target: r.target});
      }
    }
  } else if (r.state === 'hunt') {
    const tgt = r.target === 'ally' ? G.ally : P;
    const invalid = !tgt || !tgt.alive || tgt.falling || tgt.inv > 0 || (r.target === 'player' && G.pech && G.pech.r !== r) || (r.target === 'ally' && G.allyPech && G.allyPech.r !== r);
    if (invalid) { r.state = 'wander'; r.timer = 0.6; r.huntCool = 2.5; }
    else if (!(G.pech && G.pech.r === r)) {
      const ps = stringPts(tgt), Qp = pointAt(ps, r.huntFrac), Q2 = pointAt(ps, r.huntFrac + 0.08);
      let nx = -(Q2.y - Qp.y), ny = Q2.x - Qp.x; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      const side = Math.sign((r.x - Qp.x) * nx + (r.y - Qp.y) * ny) || 1;
      r.tx = clamp(Qp.x - nx * side * 85, 25, 375); r.ty = clamp(Qp.y - ny * side * 85, sky.top, sky.bottom + 40);
      if (r.timer <= 0) { r.state = 'wander'; r.timer = 0.5; r.huntCool = rnd(3, 5) * (1.2 - dif * 0.5); }
    }
  } else if (r.state === 'allypech') {
    r.tx = lerp(r.tx, r.hx, dt * 0.15); r.ty = lerp(r.ty, sky.top + 60, dt * 0.1);
  }
  // Pinky Didi dodges by dashing away when your kite closes in on her string
  if (r.B && r.B.kind === 'pinky' && !G.pech && r.dodgeCool <= 0 && !r.launching && G.mode === 'play' && !P.falling) {
    const d = distToPts(P.x, P.y, stringPts(r));
    if (d < 70) {
      if (Math.random() < 0.6) { r.dash = 0.5; r.tx = clamp(400 - r.x + rnd(-40, 40), 40, 360); r.ty = rnd(sky.top + 20, sky.top + 180); r.state = 'wander'; r.timer = 1.2; r.dodgeCool = 3.0; ev('dodge', {id: r.id});
        burst(r.x, r.y, 12, ['#ff4fb4', '#fff1a8', '#ffffff'], 200); }
      else r.dodgeCool = 1.4;
    }
  }
  if (G.pech && G.pech.r === r) { r.tx = lerp(r.tx, r.hx, dt * 0.5); r.ty = lerp(r.ty, sky.top + 30, dt * 0.3); }
  let K = r.boss ? (r.B.K || T.bossK) : T.rK, D = r.boss ? T.bossD : T.rD;
  K *= r.kMul; if (r.boss && G.phase === 3) K *= 1.2;
  const boost = (r.state === 'hunt' ? (1.25 + 0.5 * dif) : 1) * (r.dash > 0 ? 3 : 1);
  kitePhysics(r, K * boost, D * Math.sqrt(boost), dt, G.t);
  r.x = clamp(r.x, 14, 386); r.y = clamp(r.y, sky.top - 10, r.launching ? H : sky.bottom + 60);
}
function aiAlly(a, dt){
  if (a.inv > 0) a.inv -= dt;
  a.timer -= dt;
  if (a.timer <= 0) { a.timer = rnd(1.5, 3); a.tx = rnd(60, 240); a.ty = rnd(sky.top + 70, sky.bottom - 40); }
  if (G.allyPech) { a.tx = lerp(a.tx, 90, dt * 0.3); }
  a.tx += G.wind * 12 * dt;
  kitePhysics(a, 14, 5, dt, G.t + 3);
  a.x = clamp(a.x, 14, 386); a.y = clamp(a.y, sky.top - 10, H - 220);
}

function startPech(r, hit){
  const P = G.player, m = G.man;
  const ps = Math.hypot(P.vx, P.vy);
  const startBar = clamp(ps / 1400, 0, 0.35) * (1 + m.long) - (r.state === 'hunt' ? 0.12 : 0);
  G.pech = {r, x: hit.x, y: hit.y, fa: hit.fa, fb: hit.fb, bar: startBar, t: 0, rp: 0, pp: 0, sweet: false};
  G.pechCount++;
  SFX.pech(); SFX.zipStart(); buzz(35);
  G.shake = Math.max(G.shake, 5);
  burst(hit.x, hit.y, 18, ['#fff6a8', '#ffcf3f', '#ff8a1f'], 260);
  ev('pech', {id: r.id, boss: r.boss, bar: +startBar.toFixed(2)});
}
function updatePech(dt){
  const p = G.pech, r = p.r, P = G.player, m = G.man;
  p.t += dt;
  const pa = P.anchor, ra = r.anchor;
  const k1 = {x: lerp(pa.x, P.x, p.fa), y: lerp(pa.y, P.y, p.fa)}, k2 = {x: lerp(ra.x, r.x, p.fb), y: lerp(ra.y, r.y, p.fb)};
  p.x = (k1.x + k2.x) / 2; p.y = (k1.y + k2.y) / 2;
  P.knot = r.knot = {x: p.x, y: p.y};
  r.phase += dt * (r.boss ? 3.4 : 2.6);
  const dif = difficulty() - (G.phase - 1) * 0.12;
  const s = 0.5 + 0.5 * Math.sin(r.phase);
  p.rp = (r.pBase + r.pAmp * s) * (0.85 + 0.3 * dif) * LV.pull * r.pullMul * (1 - m.strong) * (r.boss && G.phase === 3 ? 1.05 : 1);
  p.sweet = s < 0.32 * (1 + m.long) * (r.boss && G.phase === 3 ? 0.9 : 1);
  const kb = (keys[' '] ? 900 : 0);
  p.pp = clamp((inp.speed + kb) / T.powerDiv, 0, 1.6) * (1 + m.sharp); p.sumP = (p.sumP || 0) + p.pp * dt; p.sumR = (p.sumR || 0) + p.rp * dt;
  const gainP = p.pp * (p.sweet ? T.sweetMult : 1);
  p.bar += ((gainP - p.rp) * T.barRate * (1 + p.t * 0.6) + p.bar * 0.5) * dt;
  const inten = clamp(p.pp + p.rp, 0.2, 2);
  burst(p.x, p.y, (Q.low ? 1 : 2) + (inten * (Q.low ? 1.5 : 3) | 0), ['#fffbd0', '#ffd23f', '#ff9a1f', '#ffffff'], 180 + inten * 170);
  G.shake = Math.max(G.shake, 1 + inten * 1.2);
  SFX.zipSet(inten * 0.7);
  if (p.bar >= 1 || (p.t > 5 && p.bar >= 0)) winPech();
  else if (p.bar <= -1 || p.t > 5) losePech();
}
function endPechCommon(){ const p = G.pech; SFX.zipStop(); G.player.knot = null; p.r.knot = null; G.pech = null; if (G.allyPech && G.allyPech.r === p.r) p.r.knot = {x: G.allyPech.x, y: G.allyPech.y}; return p; }
function winPech(){
  const p = endPechCommon(), r = p.r;
  cutKite(r, true);
  G.player.inv = 1.2;
  const clean = p.t < 0.9;
  G.combo = (G.t - G.lastCut <= LV.comboWin) ? G.combo + 1 : 1;
  G.lastCut = G.t; G.bestCombo = Math.max(G.bestCombo, G.combo);
  let pts = 100 * Math.min(G.combo, 5) + (clean ? 50 : 0) + (r.boss ? 500 : 0) + (r.kind === 'golden' ? 300 : 0) + (r.lantern ? 150 : 0);
  G.score += pts; G.cuts++;
  let coins = 10 + 5 * (Math.min(G.combo, 6) - 1) + (r.kind === 'golden' ? 50 : 0) + (r.lantern ? 25 : 0) + (r.boss ? 100 : 0);
  G.coins += coins;
  if (r.kind === 'golden') G.golden++;
  if (r.lantern) G.lanterns++;
  const big = r.boss || r.kind === 'golden';
  pop(p.x, p.y - 12, 'KAI PO CHE!', big ? 42 : 34, '#ffffff', '#e8245f', 1.35, 0, 'fest');
  pop(p.x, p.y + 26, '+' + pts, 20, '#ffe14d', '#7a3a00', 1.0, 0.18);
  if (G.combo > 1) pop(200, H * 0.30, 'x' + G.combo + ' COMBO!', 30 + G.combo * 3, '#ffe14d', '#b0003a', 1.1, 0.1);
  if (clean) pop(p.x, p.y + 50, 'CLEAN CUT', 15, '#bfffcf', '#0b5a2a', 0.9, 0.28);
  G.shake = r.boss ? 22 : 12; G.flash = r.boss ? 0.5 : 0.25; G.cheer = 1.8;
  burst(p.x, p.y, (r.boss ? 70 : 40) >> (Q.low ? 1 : 0), ['#ffffff', '#ffe14d', '#ff8a1f', r.c1, r.c2], r.boss ? 520 : 380);
  SFX.snap(); SFX.kaipo(G.combo); setTimeout(() => SFX.cheer(r.boss), 120); buzz(r.boss ? [60, 40, 60, 40, 160] : [30, 40, 70]);
  Voice.shout(r.boss ? 'kp_m' : (G.cuts % 3 === 1 ? 'kp_a' : G.cuts % 3 === 2 ? 'kp_m' : 'kp_d'));
  if (G.allyPech && G.allyPech.r === r) { G.allyPech = null; G.allyCool = 5; if (G.ally) { G.ally.knot = null; G.ally.inv = 2; } G.saved++; G.score += 200; pop(G.ally ? G.ally.x : 200, (G.ally ? G.ally.y : 200) - 30, 'DADA SAVED!', 22, '#bfffcf', '#0b5a2a', 1.2, 0.2); ev('ally_saved'); }
  ev('cut', {id: r.id, boss: r.boss, kind: r.kind, combo: G.combo, cuts: G.cuts, pechTime: +p.t.toFixed(2), avgP: +(p.sumP / p.t).toFixed(2), avgR: +(p.sumR / p.t).toFixed(2)});
  banterTrig('cut' + G.cuts);
  if (r.boss) bossKiteDown(r, p); else checkGoal();
}
function bossKiteDown(r, p){
  G.bossLeft--;
  ev('boss_hit', {left: G.bossLeft});
  if (G.bossLeft <= 0) { G.slow = 1.5; G.zoom = {x: p.x, y: p.y, t: 0}; winLevel(); return; }
  if (LV.boss.kind === 'baadshah' && (G.bossLeft === 4 || G.bossLeft === 2)) {
    G.phase++; const ph = G.phase;
    G.banner = {text: ph === 2 ? 'PHASE 2 · STORM!' : 'PHASE 3 · DUSK!', life: 2.4, big: true};
    if (ph === 2) { G.storm = 1; G.gustEvery = 7; G.gustTimer = 3; G.helpers = 2; Voice.play('tz_b2'); banterTrig('phase2'); }
    else { G.storm = 0.5; G.dusk = 1; G.helpers = 1; G.gustEvery = 10; Voice.play('tz_b3'); banterTrig('phase3'); }
  } else { G.banner = {text: 'SPARE KITE!', life: 1.8}; banterTrig('bosshit'); }
  if (LV.boss.count > 1) { const key = r.alt ? 'b' : 'a'; G.twinHP[key]--; if (G.twinHP[key] > 0) G.bossQ.push({t: 2.4, alt: !!r.alt}); }
  else G.bossQ.push({t: 2.4, alt: false});
}
function losePech(){
  const p = endPechCommon(), r = p.r;
  if (r.state !== 'allypech') { r.state = 'wander'; r.timer = 0.8; r.huntCool = 3.5; }
  pop(p.x, p.y - 10, 'CUT!', 34, '#ffffff', '#3a2340', 1.0);
  burst(p.x, p.y, 30, ['#ffffff', '#ffd23f', '#888'], 300);
  ev('lose_pech', {id: r.id, pechTime: +p.t.toFixed(2), avgP: +(p.sumP / p.t).toFixed(2), avgR: +(p.sumR / p.t).toFixed(2)});
  loseKite();
}
function loseKite(){
  const P = G.player;
  cutKite(P, false);
  G.lives--; G.lost++; G.combo = 0; G.shake = 16; G.flash = 0.3; G.flashCol = '255,40,60';
  SFX.snap(); SFX.lose(); buzz([200, 60, 120]);
  ev('kite_lost', {lives: G.lives});
  if (G.lives <= 0) loseLevel('kites');
  else { G.respawn = 1.3; }
}
function cutKite(k, isRival){
  k.falling = true; k.knot = null; k.spin = rnd(-6, 6) || 3; k.vy = -80; k.vx = (k.vx || 0) * 0.3 + rnd(-60, 60); k.fallT = 0;
  if (isRival) { k.state = 'dead'; }
}
function checkGoal(){
  if (G.mode !== 'play') return;
  const o = LV.obj; let done = false;
  if (o === 'cut' || o === 'time' || o === 'nolose') done = G.cuts >= LV.goal;
  else if (o === 'golden') done = G.golden >= LV.goal;
  else if (o === 'combo') done = G.bestCombo >= LV.goal;
  else if (o === 'lanterns') done = G.lanterns >= LV.goal;
  else if (o === 'score') done = G.score >= LV.goal;
  if (done) winLevel();
}
function winLevel(){
  if (G.mode !== 'play') return;
  G.mode = 'won'; G.endTimer = G.slow > 0 ? 3.0 : 2.2; G.confetti = 3; SFX.win(); Music.start('win');
  if (G.pech) endPechCommon();
  G.banner = {text: 'KAI PO CHE!', sub: LV.obj === 'boss' ? LV.boss.name + ' DEFEATED!' : 'LEVEL CLEAR!', life: 3, big: true, fest: true};
  ev('win', {score: G.score});
}
function loseLevel(why){
  if (G.mode !== 'play') return;
  G.mode = 'lost'; G.endTimer = 1.8; G.lostWhy = why; if (G.pech) endPechCommon(); SFX.fail(); ev('lose', {why});
}
function levelResult(){
  const won = G.mode === 'won';
  let stars = 0;
  if (won) {
    stars = 1;
    if (LV.obj === 'nolose') { const f = G.timeLeft / LV.time; if (f >= 0.3) stars = 2; if (f >= 0.5) stars = 3; }
    else { if (G.lost <= 1) stars = 2; if (G.lost === 0) stars = 3; }
    G.score += Math.ceil(Math.max(0, G.timeLeft)) * (LV.obj === 'survive' || LV.obj === 'protect' ? 0 : 10) + G.lives * 200;
  }
  return {n: G.n, won, stars, score: G.score, coins: G.coins, cuts: G.cuts, bestCombo: G.bestCombo, t: G.t, lost: G.lost, why: G.lostWhy};
}

// ---------- particles, pops, banter ----------
function burst(x, y, n, cols, sp){ for (let i = 0; i < n && G.parts.length < Q.partCap; i++) { const a = Math.random() * 6.283, v = rnd(0.25, 1) * sp;
  G.parts.push({x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: rnd(0.25, 0.7), max: 0.7, c: cols[(Math.random() * cols.length) | 0], s: rnd(1.2, 3)}); } }
function pop(x, y, text, size, fill, stroke, life, delay, font){ G.pops.push({x: clamp(x, 100, 300), y: clamp(y, 150, H - 200), text, size, fill, stroke, life: life || 1, max: life || 1, delay: delay || 0, font}); }
function say(who, text){ if (G.say && G.say.life > 0.6) G.sayQ.push([who, text]); else G.say = {who, text, life: 3.4, max: 3.4}; }
function banterTrig(key){ for (const b of (LV.banter || [])) { if (b[0] === key && !G.banterDone[key + b[2]]) { G.banterDone[key + b[2]] = 1; say(b[1], b[2]); } } }

// ---------- hazards ----------
function spawnFlock(){
  const dir = Math.random() < 0.5 ? 1 : -1, y = rnd(sky.top + 50, sky.bottom - 20), n = 5 + (Math.random() * 3 | 0), birds = [];
  for (let i = 0; i < n; i++) birds.push({dx: -i * 16 * dir * 0.6 - (i % 2) * 6, dy: (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 9, ph: rnd(0, 6)});
  G.flocks.push({x: dir > 0 ? -40 : 440, y, vx: dir * rnd(75, 95), birds, wob: rnd(0, 6)});
  SFX.coo(); ev('pigeons', {y: Math.round(y)});
}
function updateHazards(dt){
  const P = G.player;
  if (LV.pigeons) {
    G.flockTimer -= dt;
    if (G.flockTimer <= 1.2 && !G.flockWarn) { const dir = Math.random() < 0.5 ? 1 : -1; G.flockWarn = {dir, y: rnd(sky.top + 50, sky.bottom - 20), t: 1.2}; }
    if (G.flockWarn) { G.flockWarn.t -= dt; if (G.flockWarn.t <= 0) { spawnFlock(); const f = G.flocks[G.flocks.length - 1]; f.y = G.flockWarn.y; f.x = G.flockWarn.dir > 0 ? -40 : 440; f.vx = Math.abs(f.vx) * G.flockWarn.dir; G.flockWarn = null; G.flockTimer = LV.pigeons * rnd(0.8, 1.2); } }
    for (const f of G.flocks) {
      f.x += f.vx * dt; f.wob += dt; const fy = f.y + Math.sin(f.wob * 2) * 8;
      if (!P.falling && P.inv <= 0 && !(P.tangle > 0) && !G.pech) for (const b of f.birds) { if (Math.hypot(f.x + b.dx - P.x, fy + b.dy - P.y) < 20) { P.tangle = 1.1; pop(P.x, P.y - 30, 'PIGEONS!', 20, '#ffffff', '#5a5a7a', 0.9); burst(P.x, P.y, 14, ['#ffffff', '#cfcfe0', '#9a9ab8'], 160); SFX.coo(); buzz(40); ev('tangled'); break; } }
    }
    G.flocks = G.flocks.filter(f => f.x > -120 && f.x < 520);
  }
  if (P.tangle > 0) { P.tangle -= dt; P.ty += 34 * dt; P.tx += Math.sin(G.t * 20) * 40 * dt; }
  if (G.gustEvery) {
    if (!G.gust) { G.gustTimer -= dt; if (G.gustTimer <= 0) { G.gust = {state: 'warn', t: 1.0, dir: Math.random() < 0.5 ? -1 : 1}; G.banner = {text: 'GUST ' + (G.gust.dir > 0 ? '→→' : '←←'), life: 1.1}; SFX.alarm(); ev('gust_warn', {dir: G.gust.dir}); } }
    else { G.gust.t -= dt;
      if (G.gust.state === 'warn' && G.gust.t <= 0) { G.gust.state = 'on'; G.gust.t = 1.2; SFX.gust(); G.shake = Math.max(G.shake, 4); }
      else if (G.gust.state === 'on') { const d = G.gust.dir;
        for (const k of [P, G.ally].concat(G.rivals)) { if (!k || k.falling) continue; k.vx += d * 300 * dt; k.tx += d * 170 * dt; }
        if (G.gust.t <= 0) { G.gust = null; G.gustTimer = G.gustEvery * rnd(0.85, 1.2); } } }
  }
  if (LV.blackout) { G.blackTimer -= dt; if (G.blackTimer <= 0 && !G.blackOn) { G.blackOn = 3; G.banner = {text: 'BLACKOUT!', life: 1.2}; ev('blackout'); }
    if (G.blackOn > 0) { G.blackOn -= dt; if (G.blackOn <= 0) { G.blackOn = 0; G.blackTimer = LV.blackout * rnd(0.85, 1.15); } }
    G.black = lerp(G.black, G.blackOn > 0 ? 1 : 0, 1 - Math.exp(-dt * 5)); }
}
function updateAlly(dt){
  const A = G.ally; if (!A) return;
  if (G.allyCool > 0) G.allyCool -= dt;
  if (A.falling) { A.fallT += dt; A.vy = Math.min(A.vy + 260 * dt, 240); A.vx += G.wind * 40 * dt; A.x += A.vx * dt; A.y += A.vy * dt; A.rot += A.spin * dt;
    if (G.allyRespawn > 0) { G.allyRespawn -= dt; if (G.allyRespawn <= 0 && G.mode === 'play') { G.ally = newAlly(true); SFX.launch(); ev('ally_launch'); } }
    return; }
  aiAlly(A, dt); tailUpdate(A, dt);
  if (G.allyPech) {
    const ap = G.allyPech, r = ap.r;
    if (!r.alive || r.falling) { G.allyPech = null; A.knot = null; }
    else {
      const k1 = {x: lerp(A.anchor.x, A.x, ap.fa), y: lerp(A.anchor.y, A.y, ap.fa)}, k2 = {x: lerp(r.anchor.x, r.x, ap.fb), y: lerp(r.anchor.y, r.y, ap.fb)};
      ap.x = (k1.x + k2.x) / 2; ap.y = (k1.y + k2.y) / 2; A.knot = {x: ap.x, y: ap.y}; if (!(G.pech && G.pech.r === r)) { r.knot = {x: ap.x, y: ap.y}; ap.t += dt; }
      if (Math.random() < 0.5) burst(ap.x, ap.y, 1, ['#ffd23f', '#ffffff'], 140);
      if (ap.t >= ap.max) { // Dada's kite is cut
        G.allyPech = null; G.allyCool = 6; r.knot = null; r.state = 'wander'; r.timer = 1; r.huntCool = 4;
        cutKite(A, false); G.allyLives--; G.shake = 12; SFX.snap(); SFX.lose(); buzz([120, 50, 120]); ev('ally_lost', {left: G.allyLives});
        pop(A.x, A.y - 20, 'DADA\'S KITE CUT!', 20, '#ffffff', '#7a1a1a', 1.2);
        if (G.allyLives <= 0) loseLevel('ally'); else { G.allyRespawn = 2.5; say('D', 'My spare kite! Guard it better, beta!'); }
      }
    }
  } else if (A.inv <= 0 && G.mode === 'play') {
    const as = stringPts(A);
    for (const r of G.rivals) { if (r.falling || r.launching || r.target !== 'ally' || r.state !== 'hunt' || (G.pech && G.pech.r === r)) continue;
      const hit = crossStrings(as, stringPts(r)); if (hit) { G.allyPech = {r, t: 0, max: 8, x: hit.x, y: hit.y, fa: hit.fa, fb: hit.fb}; r.state = 'allypech'; SFX.pech(); SFX.alarm(); Voice.shout('help'); G.banner = {text: 'HELP DADA!', life: 1.6}; ev('ally_pech', {id: r.id}); break; } }
  }
}

// ---------- update ----------
function update(dt){
  if (!G) return;
  if (G.slow > 0) { G.slow -= dt; dt *= 0.28; }
  if (G.zoom) G.zoom.t += dt;
  G.t += dt;
  const inst = inp.moved / Math.max(dt, 1e-3); inp.moved = 0;
  inp.speed = lerp(inp.speed, inst, 1 - Math.exp(-dt * 12));
  if (!inp.down) inp.speed *= Math.exp(-dt * 8);
  const playing = G.mode === 'play';
  if (playing) {
    G.timeLeft -= dt;
    if (G.timeLeft <= 0) { G.timeLeft = 0; if (LV.obj === 'survive' || LV.obj === 'protect') winLevel(); else loseLevel('time'); }
    for (const b of (LV.banter || [])) if (typeof b[0] === 'number' && G.t >= b[0] && !G.banterDone[b[0] + b[2]]) { G.banterDone[b[0] + b[2]] = 1; say(b[1], b[2]); }
  }
  if (G.say) { G.say.life -= dt; if (G.say.life <= 0) { G.say = null; const n = G.sayQ.shift(); if (n) say(n[0], n[1]); } }
  G.firstHunt -= dt;
  G.windTimer -= dt;
  if (G.windTimer <= 0 && (playing || G.mode === 'demo')) { G.windTimer = LV.windEvery * rnd(0.85, 1.25); let w; do { w = rnd(-1.4, 1.4) * LV.wind / 0.8; } while (Math.abs(w - G.wind) < 0.6 * LV.wind / 0.8); G.windTarget = clamp(w, -1.9, 1.9); if (playing) { G.banner = {text: 'WIND ' + (w > 0 ? '→' : '←'), life: 1.6}; SFX.wind(); } ev('wind', {w: +w.toFixed(2)}); }
  G.wind = lerp(G.wind, G.windTarget, 1 - Math.exp(-dt * 1.2));
  // player
  const P = G.player;
  if (P.inv > 0) P.inv -= dt;
  if (!P.falling && G.mode !== 'lost') {
    if (G.mode === 'demo') { P.tx = 200 + Math.sin(G.t * 0.6) * 120; P.ty = H * 0.38 + Math.sin(G.t * 0.9) * 60; }
    else if (!inp.down) { P.ty += T.fall * dt; }
    const kx = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0), ky = (keys.ArrowDown ? 1 : 0) - (keys.ArrowUp ? 1 : 0);
    if ((kx || ky) && !(P.tangle > 0)) { P.tx += kx * 420 * dt; P.ty += ky * 420 * dt; }
    P.tx += G.wind * T.windV * dt;
    P.tx = clamp(P.tx, 22, 378); P.ty = clamp(P.ty, sky.top, sky.bottom + 30);
    kitePhysics(P, T.pK, T.pD, dt, G.t);
    P.x = clamp(P.x, 14, 386); P.y = clamp(P.y, sky.top - 12, H - 200);
  }
  if (G.respawn > 0) { G.respawn -= dt; if (G.respawn <= 0 && playing) { G.deadPlayers = (G.deadPlayers || []); G.deadPlayers.push(G.player); G.player = newPlayer(true); SFX.launch(); ev('launch'); } }
  // spawning
  const alive = G.rivals.filter(r => r.alive && !r.falling);
  if (playing || G.mode === 'demo') {
    for (const q of G.bossQ) { q.t -= dt; if (q.t <= 0 && !q.done) { q.done = true; const b = spawnRival({boss: LV.boss, roof: q.alt ? 1 : 3, alt: q.alt});
      if (q.first) { G.banner = {text: LV.boss.name + '!', life: 2.2, big: true}; SFX.boss(); buzz([80, 60, 80]); Music.start('boss'); if (!q.alt) Voice.play(LV.boss.taunt); } } }
    G.bossQ = G.bossQ.filter(q => !q.done);
    if (LV.obj === 'golden' && playing) { const g = alive.find(r => r.kind === 'golden'); if (!g && G.golden < LV.goal) { G.goldTimer -= dt; if (G.goldTimer <= 0) { spawnRival({kind: 'golden'}); G.goldTimer = 2.5; G.banner = {text: 'GOLDEN KITE!', life: 1.6}; } } }
    G.spawnTimer -= dt;
    const regular = alive.filter(r => !r.boss && r.kind !== 'golden').length;
    let want = LV.obj === 'boss' ? G.helpers : Math.min(LV.rivals[1], LV.rivals[0] + Math.floor(Math.max(0, G.t - 20) / 30));
    if (G.mode === 'demo') want = 4;
    if (G.spawnTimer <= 0 && regular < want) { spawnRival({kind: LV.obj === 'boss' ? (LV.led >= 1 ? 'led' : 'normal') : pickKind(), rookie: !!LV.rookies}); G.spawnTimer = LV.spawnFast ? rnd(0.5, 1.0) : rnd(1.0, 2.0); }
    if (LV.obj === 'lanterns' && playing && !alive.some(r => r.lantern) && G.spawnTimer <= 0.5) { spawnRival({kind: 'lantern'}); G.spawnTimer = 1.2; }
  }
  // rivals
  for (const r of G.rivals) {
    if (r.falling) { r.fallT += dt; r.vy = Math.min(r.vy + 260 * dt, 240); r.vx += G.wind * 40 * dt; r.x += r.vx * dt; r.y += r.vy * dt; r.rot += r.spin * dt; if (r.y > H + 60) r.alive = false; continue; }
    if (G.mode !== 'lost') aiRival(r, dt);
    tailUpdate(r, dt);
    if (r.kind === 'golden' && Math.random() < 0.3) G.parts.length < Q.partCap && G.parts.push({x: r.x + rnd(-10, 10), y: r.y + rnd(-10, 10), vx: rnd(-10, 10), vy: rnd(-30, 0), life: 0.6, max: 0.6, c: '#fff6b0', s: 1.5, star: true});
  }
  G.rivals = G.rivals.filter(r => r.alive);
  const fl = [P].concat(G.deadPlayers || []);
  for (const k of fl) if (k.falling) { k.fallT += dt; k.vy = Math.min(k.vy + 260 * dt, 240); k.vx += G.wind * 40 * dt; k.x += k.vx * dt; k.y += k.vy * dt; k.rot += k.spin * dt; }
  if (G.deadPlayers) G.deadPlayers = G.deadPlayers.filter(k => k.y < H + 60);
  tailUpdate(P, dt);
  updateAlly(dt);
  if (playing) updateHazards(dt);
  // pech detection
  if (playing) {
    if (G.pech) { if (G.pech.r.falling || !G.pech.r.alive || P.falling) endPechCommon(); else updatePech(dt); }
    else if (!P.falling && P.inv <= 0) {
      const ps = stringPts(P);
      for (const r of G.rivals) { if (r.falling || r.launching) continue; const hit = crossStrings(ps, stringPts(r)); if (hit) { startPech(r, hit); break; } }
    }
  }
  // fx
  for (const p of G.parts) { if (p.star) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; continue; } p.vx *= Math.exp(-dt * 2); p.vy += (p.conf ? 60 : 380) * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.conf) { p.vx += Math.sin(G.t * 3 + p.y * 0.05) * 30 * dt; p.vy = Math.min(p.vy, 110); } }
  G.parts = G.parts.filter(p => p.life > 0);
  for (const p of G.pops) { if (p.delay > 0) p.delay -= dt; else p.life -= dt; }
  G.pops = G.pops.filter(p => p.life > 0);
  G.shake *= Math.exp(-dt * 9); G.flash = Math.max(0, G.flash - dt); G.cheer = Math.max(0, G.cheer - dt);
  if (G.banner) { G.banner.life -= dt; if (G.banner.life <= 0) G.banner = null; }
  if (G.confetti > 0) { G.confetti -= dt; if (G.parts.length < Q.partCap - 20) for (let i = 0; i < (Q.low ? 2 : 4); i++) G.parts.push({x: rnd(0, 400), y: -10, vx: rnd(-40, 40), vy: rnd(40, 120), life: 3, max: 3, c: RIVAL_COLS[(Math.random() * 6) | 0][Math.random() < 0.5 ? 0 : 1], s: rnd(2, 4), conf: true}); }
  if ((G.mode === 'won' || G.mode === 'lost') && G.endTimer > 0) { G.endTimer -= dt / (G.slow > 0 ? 0.28 : 1); if (G.endTimer <= 0) { const res = levelResult(); G.mode = res.won ? 'wonScreen' : 'lostScreen'; ev(res.won ? 'win_screen' : 'lose_screen', {stars: res.stars}); if (Game.onEnd) Game.onEnd(res); } }
}
