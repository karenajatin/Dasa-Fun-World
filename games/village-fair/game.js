(() => {
'use strict';
// ===== Tuning =====
const GAME_TIME = 25;          // seconds per mini-game
const CARD_TIME = 2.0;         // "NEXT GAME!" card
const TIMEUP_TIME = 0.9;
const TARGET = 3000;           // score to be Fair Champion
const STAR2 = 4000, STAR3 = 5200;
const NAMES = ['RING TOSS', 'BALLOON POP', 'SWEET CATCH'];
const HINTS = ['Swipe UP to throw rings!', 'Tap balloons! Not the black ones!', 'Slide to catch sweets! Dodge stones!'];
const ICONS = ['⭕', '🎈', '🧺'];

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
let W = 390, H = 844, DPR = 1;
let bg = null; // offscreen static backdrop

function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  buildBackdrop();
}
window.addEventListener('resize', resize);

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const pick = a => a[(Math.random() * a.length) | 0];
const CONF = ['#ff2d6f', '#ffd23f', '#2ec4ff', '#5bdc5b', '#ff8a1f', '#b05bff', '#ffffff'];

// ===== Audio =====
let AC = null, master = null, musicGain = null, musicTimer = null;
function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = 0.7; master.connect(AC.destination);
    musicGain = AC.createGain(); musicGain.gain.value = 0.0; musicGain.connect(master);
  } catch (e) { AC = null; }
}
function tone(f, dur, type = 'sine', vol = 0.2, f2 = null, delay = 0, dest = null) {
  if (!AC) return;
  const t = AC.currentTime + delay;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + 0.02);
}
let noiseBuf = null;
function noise(dur, vol = 0.2, freq = 1500, q = 1, ftype = 'bandpass', f2 = null, delay = 0) {
  if (!AC) return;
  if (!noiseBuf) {
    noiseBuf = AC.createBuffer(1, AC.sampleRate * 1, AC.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = AC.currentTime + delay;
  const s = AC.createBufferSource(); s.buffer = noiseBuf;
  const fl = AC.createBiquadFilter(); fl.type = ftype; fl.frequency.setValueAtTime(freq, t); fl.Q.value = q;
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = AC.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl); fl.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
}
const SFX = {
  whoosh() { noise(0.22, 0.18, 600, 2, 'bandpass', 2600); },
  ringer(c) { const b = 660 * Math.pow(1.06, Math.min(c, 12)); tone(b, 0.12, 'triangle', 0.22); tone(b * 1.5, 0.18, 'triangle', 0.18, null, 0.07); noise(0.05, 0.1, 5000, 1, 'highpass'); },
  clink() { tone(1800, 0.08, 'square', 0.05); tone(1200, 0.12, 'triangle', 0.08, 600); },
  pop(c) { noise(0.09, 0.35, 1800, 0.8, 'bandpass', 600); tone(500 + Math.min(c, 15) * 40, 0.08, 'sine', 0.18, 180); },
  boom() { noise(0.45, 0.5, 900, 0.7, 'lowpass', 80); tone(140, 0.4, 'sine', 0.4, 40); },
  buzz() { tone(150, 0.22, 'square', 0.09, 110); },
  catch_(c) { const b = 520 * Math.pow(1.06, Math.min(c, 12)); tone(b, 0.1, 'triangle', 0.2); tone(b * 2, 0.08, 'sine', 0.08, null, 0.03); },
  thud() { tone(110, 0.2, 'sine', 0.35, 50); noise(0.12, 0.25, 400, 1, 'lowpass'); },
  gold() { [0, 4, 7, 12, 16].forEach((s, i) => tone(880 * Math.pow(2, s / 12), 0.15, 'triangle', 0.15, null, i * 0.045)); },
  tick() { tone(1400, 0.04, 'square', 0.06); },
  go() { tone(523, 0.1, 'square', 0.1); tone(784, 0.2, 'square', 0.1, null, 0.1); },
  card() { noise(0.3, 0.15, 400, 1.5, 'bandpass', 3000); tone(392, 0.12, 'triangle', 0.15, null, 0.05); tone(587, 0.18, 'triangle', 0.15, null, 0.15); },
  timeup() { tone(784, 0.15, 'square', 0.1); tone(523, 0.3, 'square', 0.1, null, 0.15); },
  fanfare() { [[523, 0], [659, .14], [784, .28], [1047, .42], [784, .62], [1047, .76]].forEach(([f, d]) => { tone(f, 0.3, 'square', 0.08, null, d); tone(f / 2, 0.3, 'triangle', 0.12, null, d); }); noise(1.2, 0.12, 3000, 0.5, 'highpass', null, 0.4); },
  sad() { [[392, 0], [370, .2], [349, .4], [330, .6]].forEach(([f, d]) => tone(f, 0.35, 'triangle', 0.14, null, d)); }
};
// little carnival loop (oom-pah + melody)
const MEL = [0, 4, 7, 9, 7, 4, 12, 9, 7, 4, 2, 4, 7, 4, 0, -1];
function startMusic() {
  if (!AC || musicTimer) return;
  musicGain.gain.cancelScheduledValues(AC.currentTime);
  musicGain.gain.setTargetAtTime(0.5, AC.currentTime, 0.3);
  let step = 0, next = AC.currentTime + 0.05; const beat = 60 / 150 / 2;
  musicTimer = setInterval(() => {
    while (next < AC.currentTime + 0.2) {
      const s = step % 16, bar = Math.floor(step / 16) % 4;
      const root = [0, 5, 7, 0][bar];
      const bf = 130.8 * Math.pow(2, root / 12);
      if (s % 4 === 0) tone(bf, 0.18, 'triangle', 0.16, null, next - AC.currentTime, musicGain);
      if (s % 4 === 2) { tone(bf * 2, 0.09, 'square', 0.035, null, next - AC.currentTime, musicGain); tone(bf * 2.52, 0.09, 'square', 0.03, null, next - AC.currentTime, musicGain); }
      if (s % 2 === 0) { const m = MEL[(s + bar * 4) % 16]; if (m >= 0) tone(523 * Math.pow(2, (m + root) / 12), 0.12, 'triangle', 0.05, null, next - AC.currentTime, musicGain); }
      step++; next += beat;
    }
  }, 50);
}
function stopMusic() {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  if (AC) musicGain.gain.setTargetAtTime(0.0, AC.currentTime, 0.1);
}
function buzzv(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

// ===== Backdrop =====
function buildBackdrop() {
  bg = document.createElement('canvas'); bg.width = cv.width; bg.height = cv.height;
  const b = bg.getContext('2d'); b.setTransform(DPR, 0, 0, DPR, 0, 0);
  const hz = H * 0.6;
  let g = b.createLinearGradient(0, 0, 0, hz);
  g.addColorStop(0, '#5ec8ff'); g.addColorStop(0.6, '#a6e3ff'); g.addColorStop(1, '#ffe7b3');
  b.fillStyle = g; b.fillRect(0, 0, W, hz);
  // sun + clouds
  b.fillStyle = 'rgba(255,240,170,.9)'; b.beginPath(); b.arc(W * 0.18, H * 0.2, 34, 0, 7); b.fill();
  b.fillStyle = 'rgba(255,255,255,.85)';
  [[W * 0.35, H * 0.11, 1], [W * 0.82, H * 0.07, 0.8], [W * 0.1, H * 0.33, 0.7]].forEach(([x, y, s]) => {
    b.beginPath(); b.arc(x, y, 18 * s, 0, 7); b.arc(x + 22 * s, y - 8 * s, 22 * s, 0, 7); b.arc(x + 46 * s, y, 17 * s, 0, 7); b.fill();
  });
  // distant trees
  b.fillStyle = '#7cc36a';
  for (let x = -10; x < W + 20; x += 26) { b.beginPath(); b.arc(x, hz - 4, 18 + (x * 7 % 9), Math.PI, 0); b.fill(); }
  // tents
  const tents = [[0.02, '#ff2d6f', '#fff'], [0.27, '#2e8bff', '#ffd23f'], [0.5, '#ff8a1f', '#fff'], [0.78, '#5bdc5b', '#fff']];
  tents.forEach(([fx, c1, c2]) => {
    const x = W * fx, w = W * 0.22, top = hz - 70, bh = 38;
    for (let i = 0; i < 6; i++) { b.fillStyle = i % 2 ? c2 : c1; b.fillRect(x + i * w / 6, top + 32, w / 6 + 0.5, bh); }
    b.fillStyle = c1; b.beginPath(); b.moveTo(x - 4, top + 34); b.lineTo(x + w / 2, top); b.lineTo(x + w + 4, top + 34); b.closePath(); b.fill();
    b.fillStyle = c2; b.beginPath(); b.moveTo(x + w / 2, top); b.lineTo(x + w / 2 + 12, top + 34); b.lineTo(x + w / 2 - 12, top + 34); b.fill();
    b.fillStyle = '#ffd23f'; b.beginPath(); b.moveTo(x + w / 2, top - 14); b.lineTo(x + w / 2 + 12, top - 9); b.lineTo(x + w / 2, top - 4); b.fill();
    b.strokeStyle = '#6b4a2a'; b.lineWidth = 2; b.beginPath(); b.moveTo(x + w / 2, top); b.lineTo(x + w / 2, top - 14); b.stroke();
  });
  // ground
  g = b.createLinearGradient(0, hz, 0, H); g.addColorStop(0, '#f6cf7e'); g.addColorStop(1, '#e8a95a');
  b.fillStyle = g; b.fillRect(0, hz, W, H - hz);
  b.fillStyle = 'rgba(255,255,255,.18)';
  for (let i = 0; i < 40; i++) { b.fillRect((i * 97) % W, hz + 10 + (i * 53) % (H - hz), 14, 3); }
  // bunting
  for (let row = 0; row < 2; row++) {
    const y0 = row ? H * 0.155 : H * 0.115, sag = 26;
    b.strokeStyle = 'rgba(80,50,30,.6)'; b.lineWidth = 1.5; b.beginPath();
    for (let x = 0; x <= W; x += 4) { const y = y0 + Math.sin(x / W * Math.PI) * sag; x ? b.lineTo(x, y) : b.moveTo(x, y); } b.stroke();
    for (let i = 0, x = 6 + row * 11; x < W; x += 22, i++) {
      const y = y0 + Math.sin(x / W * Math.PI) * sag; b.fillStyle = CONF[(i + row * 3) % 6];
      b.beginPath(); b.moveTo(x - 8, y); b.lineTo(x + 8, y); b.lineTo(x, y + 16); b.fill();
    }
  }
}
let wheelA = 0;
function drawWheel(dt) {
  wheelA += dt * 0.25;
  const cx = W * 0.74, cy = H * 0.34, r = Math.min(W * 0.27, H * 0.15);
  ctx.strokeStyle = '#8a5a8a'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(cx - r * 0.7, H * 0.6); ctx.lineTo(cx, cy); ctx.lineTo(cx + r * 0.7, H * 0.6); ctx.stroke();
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.82, 0, 7); ctx.stroke();
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = wheelA + i * Math.PI * 2 / n, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
    ctx.fillStyle = CONF[i % 6]; ctx.beginPath(); ctx.arc(x, y + 9, 7, 0, 7); ctx.fill();
    ctx.fillRect(x - 7, y + 8, 14, 7);
    ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 7); ctx.fill();
  }
  ctx.fillStyle = '#ff2d6f'; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, 7); ctx.fill();
}

// ===== FX =====
const parts = [], pops = [];
function confetti(x, y, n, spread = 1, cols = CONF) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2), s = rnd(120, 420) * spread;
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 160 * spread, g: 600, r: rnd(0, 6), vr: rnd(-12, 12), w: rnd(5, 10), h: rnd(3, 6), c: pick(cols), life: rnd(0.7, 1.3), t: 0, kind: 'c' });
  }
}
function shards(x, y, n, col) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2), s = rnd(150, 380);
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 500, r: rnd(0, 6), vr: rnd(-15, 15), w: rnd(6, 12), h: rnd(4, 8), c: col, life: rnd(0.35, 0.6), t: 0, kind: 's' });
  }
  parts.push({ x, y, ring: true, t: 0, life: 0.3, c: col, kind: 'r' });
}
function popup(x, y, text, col = '#fff', size = 26, life = 0.9) { const hw = Math.min(W / 2 - 4, text.length * size * 0.32 + 8); pops.push({ x: clamp(x, hw, W - hw), y, text, col, size, life, t: 0 }); }
let shakeT = 0, shakeM = 0, flashT = 0, flashC = '#fff';
function shake(m, t = 0.25) { shakeM = Math.max(shakeM, m); shakeT = Math.max(shakeT, t); }
function flash(c, t = 0.15) { flashC = c; flashT = t; }

// ===== Game state =====
let mode = 'title'; // title | card | play | timeup | end
let gi = 0, modeT = 0, gameT = 0, total = 0, gscore = [0, 0, 0], combo = 0, bestCombo = 0, lastTick = -1;
let stats = { ringHits: 0, ringThrows: 0, pops: 0, bombs: 0, caught: 0, stones: 0, missed: 0 };
const mult = c => c >= 9 ? 4 : c >= 6 ? 3 : c >= 3 ? 2 : 1;
function addScore(base, x, y, label) {
  const m = mult(combo); const pts = base * m;
  total += pts; gscore[gi] += pts;
  popup(x, y, (label ? label + ' ' : '') + '+' + pts, m > 1 ? '#ffd23f' : '#fff', m > 2 ? 30 : 26);
  return pts;
}
function bad(x, y, pts, label) {
  const p = Math.min(pts, Math.max(0, gscore[gi]));
  total -= p; gscore[gi] -= p;
  if (combo >= 3) popup(W / 2, H * 0.3, 'COMBO LOST', '#ff6b6b', 22);
  combo = 0;
  popup(x, y, label + (p ? ' -' + p : ''), '#ff4040', 28);
}
function hit() { combo++; if (combo > bestCombo) bestCombo = combo; if (combo === 3 || combo === 6 || combo === 9) { popup(W / 2, H * 0.27, 'COMBO x' + mult(combo) + '!', '#ffd23f', 34, 1.0); confetti(W / 2, H * 0.27, 18, 0.6); } }
function prog() { return clamp(gameT / GAME_TIME, 0, 1); }

// ----- Ring toss -----
const R = { bottles: [], rings: [], spawnX: 0, ready: 0, handX: 0, beltY: 0, ringY: 0, beltOff: 0, speed: 0 };
const BOTTLE = { green: { c: '#2fbf5a', pts: 25, cap: '#ffd23f' }, blue: { c: '#2e8bff', pts: 40, cap: '#ff2d6f' }, gold: { c: '#ffbf1a', pts: 100, cap: '#fff' } };
function ringInit() {
  R.bottles = []; R.rings = []; R.beltY = H * 0.5; R.ringY = H * 0.83; R.handX = W / 2; R.ready = 0; R.beltOff = 0;
  for (let x = W - 30; x > -40; x -= rnd(125, 165)) R.bottles.push(newBottle(x));
  R.spawnX = 0;
}
function newBottle(x) {
  const r = Math.random(); const type = r < 0.08 ? 'gold' : r < 0.32 ? 'blue' : 'green';
  return { x, type, ringed: false, wob: 0 };
}
function ringUpdate(dt) {
  const p = prog(); R.speed = lerp(85, 165, p);
  R.beltOff = (R.beltOff + R.speed * dt) % 28;
  for (const b of R.bottles) { b.x += R.speed * dt; b.wob = Math.max(0, b.wob - dt * 3); }
  R.bottles = R.bottles.filter(b => b.x < W + 50);
  const minX = R.bottles.reduce((m, b) => Math.min(m, b.x), 1e9);
  if (minX > -40 + rnd(0, 10)) R.bottles.push(newBottle(minX - rnd(lerp(125, 115, p), lerp(170, 155, p))));
  R.ready -= dt;
  for (const r of R.rings) {
    r.t += dt / r.dur;
    if (r.state === 'fly' && r.t >= 1) {
      // land
      let best = null, bd = 1e9;
      for (const b of R.bottles) { if (b.ringed) continue; const d = Math.abs(b.x - r.tx); if (d < bd) { bd = d; best = b; } }
      if (best && bd < 28) {
        best.ringed = true; best.ringC = r.c; best.wob = 1; r.state = 'done';
        hit(); stats.ringHits++;
        const label = best.type === 'gold' ? 'GOLD!' : bd < 8 ? 'PERFECT!' : 'RINGER!';
        addScore(BOTTLE[best.type].pts + (bd < 8 ? 10 : 0), best.x, R.beltY - 110, label);
        SFX.ringer(combo); buzzv(18);
        confetti(best.x, R.beltY - 75, best.type === 'gold' ? 34 : 14, 0.7);
        if (best.type === 'gold') { SFX.gold(); flash('rgba(255,210,60,.35)'); shake(4, 0.15); }
      } else {
        r.state = 'miss'; r.t = 0; r.dur = 0.5; r.x0 = r.tx; r.vx = rnd(-120, 120); r.vy = -120;
        stats.ringMiss = (stats.ringMiss || 0) + 1;
        if (best && bd < 46) { SFX.clink(); popup(r.tx, R.beltY - 110, 'SO CLOSE', '#ffe0e0', 20); best.wob = 0.6; } else { SFX.thud(); popup(r.tx, R.beltY - 110, 'MISS', '#ffe0e0', 20); }
        if (combo >= 3) popup(W / 2, H * 0.3, 'COMBO LOST', '#ff6b6b', 22);
        combo = 0;
      }
    }
    if (r.state === 'miss') { r.vy += 900 * dt; r.mx = (r.mx || r.tx) + r.vx * dt; r.my = (r.my || (R.beltY - 64)) + r.vy * dt; if (r.t > 1) r.state = 'done'; }
  }
  R.rings = R.rings.filter(r => r.state !== 'done');
}
function ringThrow(sx, dx, dy) {
  if (R.ready > 0) return;
  R.ready = 0.25; stats.ringThrows++;
  const x0 = clamp(sx, 24, W - 24);
  const tx = clamp(x0 + (dx / Math.max(-dy, 20)) * (R.ringY - R.beltY) * 0.35, 10, W - 10);
  R.rings.push({ x0, tx, t: 0, dur: 0.36, state: 'fly', c: pick(['#ff2d6f', '#ffd23f', '#2ec4ff', '#b05bff', '#ff8a1f']) });
  SFX.whoosh(); buzzv(6);
}
function drawBottle(b) {
  const by = R.beltY, d = BOTTLE[b.type], sw = Math.sin(performance.now() / 50) * b.wob * 0.15;
  ctx.save(); ctx.translate(b.x, by); ctx.rotate(sw); ctx.scale(1.3, 1.3);
  ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(0, 0, 18, 4, 0, 0, 7); ctx.fill();
  ctx.fillStyle = d.c;
  rr(-15, -46, 30, 46, 8); ctx.fill();
  ctx.fillRect(-6, -66, 12, 22);
  ctx.beginPath(); ctx.moveTo(-15, -38); ctx.quadraticCurveTo(-15, -48, -6, -54); ctx.lineTo(6, -54); ctx.quadraticCurveTo(15, -48, 15, -38); ctx.fill();
  ctx.fillStyle = d.cap; ctx.fillRect(-7, -71, 14, 7);
  ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(-10, -40, 5, 30);
  if (b.type === 'gold') { ctx.fillStyle = '#fff'; ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center'; ctx.fillText('★', 2, -18); const s = (performance.now() / 300) % 1; ctx.globalAlpha = 1 - s; ctx.fillText('✦', 14, -60 - s * 12); ctx.globalAlpha = 1; }
  else { ctx.fillStyle = '#fff8ec'; rr(-11, -32, 22, 14, 3); ctx.fill(); ctx.fillStyle = d.c; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center'; ctx.fillText(d.pts, 0, -21.5); }
  if (b.ringed) { drawRing(0, -48, 0.72, b.ringC, true); }
  ctx.restore();
}
function drawRing(x, y, s, c, flat) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 8 * s; ctx.beginPath(); ctx.ellipse(0, 2, 26 * s, (flat ? 7 : 10) * s, 0, 0, 7); ctx.stroke();
  ctx.strokeStyle = c; ctx.lineWidth = 7 * s; ctx.beginPath(); ctx.ellipse(0, 0, 26 * s, (flat ? 7 : 10) * s, 0, 0, 7); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.ellipse(0, -2 * s, 24 * s, (flat ? 5 : 8) * s, 0, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();
  ctx.restore();
}
function ringDraw() {
  const by = R.beltY;
  // booth back board
  ctx.fillStyle = '#7a3fbf'; rr(8, by - 170, W - 16, 195, 16); ctx.fill();
  for (let i = 0; i < 9; i++) { ctx.fillStyle = i % 2 ? '#ff2d6f' : '#fff'; ctx.beginPath(); const w = (W - 16) / 9; ctx.moveTo(8 + i * w, by - 170); ctx.lineTo(8 + (i + 1) * w, by - 170); ctx.lineTo(8 + (i + 0.5) * w, by - 142); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(40 + i * (W - 80) / 5, by - 115, 10, 0, 7); ctx.fill(); }
  // belt
  ctx.fillStyle = '#3a2340'; ctx.fillRect(0, by - 2, W, 20);
  ctx.fillStyle = '#5a3a60'; for (let x = -28 + R.beltOff; x < W; x += 28) ctx.fillRect(x, by + 1, 14, 14);
  ctx.fillStyle = '#ffd23f'; ctx.fillRect(0, by - 4, W, 4);
  // counter
  ctx.fillStyle = '#b5652b'; ctx.fillRect(0, by + 18, W, 18); ctx.fillStyle = '#8a4a1f'; ctx.fillRect(0, by + 36, W, 6);
  for (const b of R.bottles) drawBottle(b);
  // throw lane hint
  const hx = R.handX;
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.setLineDash([6, 10]); ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(hx, R.ringY - 30); ctx.lineTo(hx, by + 50); ctx.stroke(); ctx.setLineDash([]);
  // rings in flight
  for (const r of R.rings) {
    if (r.state === 'fly') {
      const e = r.t, x = lerp(r.x0, r.tx, e), y = lerp(R.ringY, by - 64, e) - Math.sin(Math.PI * e) * 70, s = lerp(1.2, 0.9, e);
      drawRing(x, y, s, r.c, false);
    } else if (r.state === 'miss') { ctx.globalAlpha = clamp(1.2 - r.t, 0, 1); drawRing(r.mx, r.my, 0.9, r.c, false); ctx.globalAlpha = 1; }
  }
  // ring in hand
  if (R.ready <= 0.05) drawRing(hx, R.ringY, 1.15, '#ff2d6f', false);
  else { ctx.globalAlpha = 0.35; drawRing(hx, R.ringY, 1.15, '#ff2d6f', false); ctx.globalAlpha = 1; }
  // rings stack at bottom (decor)
  ctx.fillStyle = 'rgba(58,35,64,.75)'; rr(W / 2 - 92, H - 58, 184, 34, 17); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center'; ctx.fillText('SWIPE UP ↑ to throw', W / 2, H - 36);
}

// ----- Balloon pop -----
const B = { list: [], spawn: 0 };
function balloonInit() { B.list = []; B.spawn = 0.1; B.lastPop = -9; }
function balloonUpdate(dt) {
  const p = prog();
  B.spawn -= dt;
  if (B.spawn <= 0) {
    B.spawn = lerp(0.42, 0.24, p) * rnd(0.7, 1.3);
    const r = Math.random(); const bombP = lerp(0.16, 0.26, p);
    const type = r < 0.045 ? 'gold' : r < 0.045 + bombP ? 'bomb' : 'n';
    const sp = rnd(170, 290) * lerp(1, 1.35, p) * (type === 'gold' ? 1.35 : 1);
    B.list.push({ x: rnd(40, W - 40), y: H + 50, vy: sp, ph: rnd(0, 6), amp: rnd(10, 30), r: type === 'gold' ? 28 : rnd(30, 36), type, c: type === 'bomb' ? '#1d1424' : type === 'gold' ? '#ffbf1a' : pick(['#ff2d6f', '#2e8bff', '#5bdc5b', '#ff8a1f', '#b05bff', '#ff5ac8']) });
  }
  if (combo > 0 && gameT - B.lastPop > 1.2) { if (combo >= 3) popup(W / 2, H * 0.3, 'TOO SLOW! COMBO LOST', '#ff6b6b', 20); combo = 0; }
  for (const b of B.list) { b.y -= b.vy * dt; b.ph += dt * 2.5; b.dx = Math.sin(b.ph) * b.amp; }
  B.list = B.list.filter(b => b.y > -80 && !b.dead);
}
function balloonTap(x, y) {
  let best = null, bd = 1e9;
  for (const b of B.list) {
    const bx = b.x + (b.dx || 0), d = Math.hypot(bx - x, b.y - y);
    if (d < b.r + 16 && d < bd) { bd = d; best = b; }
  }
  if (!best) { return; }
  best.dead = true; const bx = best.x + (best.dx || 0);
  if (best.type === 'bomb') {
    stats.bombs++; SFX.boom(); buzzv([40, 30, 60]); shake(12, 0.35); flash('rgba(255,40,40,.35)', 0.2);
    shards(bx, best.y, 22, '#1d1424'); confetti(bx, best.y, 10, 0.6, ['#ff4040', '#ff8a1f', '#333']);
    bad(bx, best.y, 60, 'BOOM!');
  } else {
    stats.pops++; B.lastPop = gameT; hit();
    SFX.pop(combo); buzzv(12);
    shards(bx, best.y, 12, best.c);
    if (best.type === 'gold') { addScore(60, bx, best.y - 30, 'GOLD!'); SFX.gold(); confetti(bx, best.y, 40, 0.9); flash('rgba(255,210,60,.35)'); shake(4, 0.12); }
    else addScore(8, bx, best.y - 30);
  }
}
function balloonDraw() {
  for (const b of B.list) {
    const x = b.x + (b.dx || 0), y = b.y;
    ctx.strokeStyle = 'rgba(80,60,60,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y + b.r * 1.15);
    ctx.quadraticCurveTo(x + Math.sin(b.ph * 1.3) * 10, y + b.r * 1.15 + 25, x - Math.sin(b.ph) * 4, y + b.r * 1.15 + 50); ctx.stroke();
    ctx.fillStyle = b.c; ctx.beginPath(); ctx.ellipse(x, y, b.r * 0.88, b.r * 1.08, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, y + b.r * 1.02); ctx.lineTo(x - 6, y + b.r * 1.2); ctx.lineTo(x + 6, y + b.r * 1.2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(x - b.r * 0.35, y - b.r * 0.4, b.r * 0.18, b.r * 0.3, -0.5, 0, 7); ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (b.type === 'bomb') {
      ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y + 2, b.r * 0.55, 0, 7); ctx.stroke();
      ctx.fillStyle = '#ff3b3b'; ctx.font = '900 ' + (b.r * 0.85 | 0) + 'px system-ui'; ctx.fillText('!', x, y + 3);
    } else if (b.type === 'gold') {
      ctx.fillStyle = '#fff'; ctx.font = '900 ' + (b.r * 0.8 | 0) + 'px system-ui'; ctx.fillText('★', x, y + 2);
      ctx.strokeStyle = 'rgba(255,240,150,' + (0.5 + 0.5 * Math.sin(b.ph * 4)) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, b.r + 6, b.r * 1.25, 0, 0, 7); ctx.stroke();
    }
    ctx.textBaseline = 'alphabetic';
  }
  ctx.fillStyle = 'rgba(58,35,64,.75)'; rr(W / 2 - 110, H - 58, 220, 34, 17); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center'; ctx.fillText('TAP to pop · NOT the black ones', W / 2, H - 36);
}

// ----- Sweet catch -----
const S = { items: [], spawn: 0, bx: 0, by: 0, bw: 96, squash: 0, pile: 0 };
const SWEETS = ['jalebi', 'laddoo', 'barfi'];
function sweetInit() { S.items = []; S.spawn = 0.3; S.bx = W / 2; S.by = H * 0.85; S.squash = 0; S.pile = 0; }
function sweetUpdate(dt) {
  const p = prog();
  S.spawn -= dt;
  if (S.spawn <= 0) {
    S.spawn = lerp(0.5, 0.3, p) * rnd(0.75, 1.25);
    const r = Math.random(), stoneP = lerp(0.2, 0.3, p);
    const type = r < 0.06 ? 'gold' : r < 0.06 + stoneP ? 'stone' : pick(SWEETS);
    S.items.push({ x: rnd(28, W - 28), y: 70, vy: rnd(200, 250) * lerp(1, 1.6, p), rot: rnd(0, 6), vr: rnd(-3, 3), type, r: type === 'stone' ? 20 : 19 });
  }
  S.squash = Math.max(0, S.squash - dt * 4);
  const top = S.by - 22;
  for (const it of S.items) {
    const py = it.y; it.y += it.vy * dt; it.rot += it.vr * dt;
    if (!it.done && py < top && it.y >= top) {
      if (Math.abs(it.x - S.bx) < S.bw / 2 + it.r * 0.4) {
        it.done = true; it.dead = true;
        if (it.type === 'stone') {
          stats.stones++; SFX.thud(); SFX.buzz(); buzzv([30, 20, 50]); shake(10, 0.3); flash('rgba(120,120,120,.35)', 0.2);
          shards(it.x, top, 10, '#8a8a8a'); bad(it.x, top - 30, 50, 'STONE!');
        } else {
          stats.caught++; hit(); S.squash = 1; S.pile = Math.min(6, S.pile + 0.34);
          SFX.catch_(combo); buzzv(10);
          if (it.type === 'gold') { addScore(80, it.x, top - 40, 'KAJU KATLI!'); SFX.gold(); confetti(it.x, top, 36, 0.8); flash('rgba(255,210,60,.35)'); }
          else { addScore(it.type === 'barfi' ? 30 : 20, it.x, top - 40); confetti(it.x, top, 6, 0.4); }
        }
      }
    }
    if (!it.dead && it.y > H + 30) {
      it.dead = true;
      if (it.type !== 'stone') { stats.missed++; if (combo >= 3) popup(W / 2, H * 0.3, 'COMBO LOST', '#ff6b6b', 22); combo = 0; }
    }
  }
  S.items = S.items.filter(i => !i.dead);
}
function drawSweet(it) {
  ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.rot);
  if (it.type === 'jalebi') {
    ctx.strokeStyle = '#ff8a1f'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath();
    for (let a = 0; a < Math.PI * 5; a += 0.2) { const rr2 = 2 + a * 1.1; const x = Math.cos(a) * rr2, y = Math.sin(a) * rr2; a ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    ctx.strokeStyle = 'rgba(255,230,120,.7)'; ctx.lineWidth = 2; ctx.stroke();
  } else if (it.type === 'laddoo') {
    ctx.fillStyle = '#ffb627'; ctx.beginPath(); ctx.arc(0, 0, 17, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8901a'; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(Math.cos(i * 2.4) * 10 * ((i % 3) / 3 + .3), Math.sin(i * 2.4) * 10 * ((i % 3) / 3 + .3), 2.2, 0, 7); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(-6, -6, 5, 0, 7); ctx.fill();
  } else if (it.type === 'barfi') {
    ctx.fillStyle = '#d9f5c8'; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(18, 0); ctx.lineTo(0, 18); ctx.lineTo(-18, 0); ctx.fill();
    ctx.fillStyle = '#5bbf5b'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 7); ctx.fill();
    ctx.strokeStyle = '#a6d98f'; ctx.lineWidth = 2; ctx.stroke();
  } else if (it.type === 'gold') {
    const g = ctx.createLinearGradient(-18, -18, 18, 18); g.addColorStop(0, '#fff3b0'); g.addColorStop(0.5, '#ffbf1a'); g.addColorStop(1, '#e08a00');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -21); ctx.lineTo(21, 0); ctx.lineTo(0, 21); ctx.lineTo(-21, 0); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.rotate(-it.rot); ctx.fillStyle = '#fff'; ctx.font = '900 14px system-ui'; ctx.textAlign = 'center'; ctx.fillText('★', 0, 5);
  } else { // stone
    ctx.fillStyle = '#7d7d86'; ctx.beginPath(); ctx.moveTo(-18, -6); ctx.lineTo(-8, -18); ctx.lineTo(10, -16); ctx.lineTo(19, -2); ctx.lineTo(13, 15); ctx.lineTo(-6, 18); ctx.lineTo(-19, 8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#4d4d55'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#a3a3ad'; ctx.beginPath(); ctx.arc(-5, -6, 4, 0, 7); ctx.fill();
  }
  ctx.restore();
}
function sweetDraw() {
  // stall awning at top
  for (let i = 0; i < 10; i++) { ctx.fillStyle = i % 2 ? '#ff8a1f' : '#fff4d6'; ctx.fillRect(i * W / 10, 50, W / 10 + 1, 20); ctx.beginPath(); ctx.arc(i * W / 10 + W / 20, 70, W / 20, 0, Math.PI); ctx.fill(); }
  for (const it of S.items) drawSweet(it);
  // basket
  const x = S.bx, y = S.by, w = S.bw, sq = S.squash;
  ctx.save(); ctx.translate(x, y); ctx.scale(1 + sq * 0.12, 1 - sq * 0.12);
  ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(0, 34, w * 0.5, 7, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#8a4a1f'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, -18, w * 0.38, Math.PI, 0); ctx.stroke();
  // pile of sweets
  ctx.fillStyle = '#ffb627'; for (let i = 0; i < Math.floor(S.pile); i++) { ctx.beginPath(); ctx.arc(-30 + (i % 4) * 20, -22 - Math.floor(i / 4) * 10, 10, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#c47a35'; ctx.beginPath(); ctx.moveTo(-w / 2, -22); ctx.lineTo(w / 2, -22); ctx.lineTo(w / 2 - 12, 30); ctx.lineTo(-w / 2 + 12, 30); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#9a5520'; ctx.lineWidth = 2;
  for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-w / 2 + 3 * i, -22 + 13 * i); ctx.lineTo(w / 2 - 3 * i, -22 + 13 * i); ctx.stroke(); }
  for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * w / 7, -22); ctx.lineTo(i * (w - 24) / 7, 30); ctx.stroke(); }
  ctx.fillStyle = '#e09a50'; rr(-w / 2 - 4, -28, w + 8, 10, 5); ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(58,35,64,.75)'; rr(W / 2 - 118, H - 50, 236, 32, 16); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center'; ctx.fillText('SLIDE left / right · dodge stones', W / 2, H - 29);
}

// ===== Flow =====
function startRound() {
  initAudio();
  total = 0; gscore = [0, 0, 0]; combo = 0; bestCombo = 0; gi = 0;
  stats = { ringHits: 0, ringThrows: 0, pops: 0, bombs: 0, caught: 0, stones: 0, missed: 0 };
  parts.length = 0; pops.length = 0;
  document.getElementById('start').classList.add('hide');
  document.getElementById('end').classList.add('hide');
  toCard(0); startMusic();
}
function toCard(i) { gi = i; mode = 'card'; modeT = 0; combo = 0; SFX.card(); [ringInit, balloonInit, sweetInit][i](); }
function toPlay() { mode = 'play'; modeT = 0; gameT = 0; lastTick = -1; SFX.go(); popup(W / 2, H * 0.45, 'GO!', '#ffd23f', 64, 0.7); }
function toTimeup() { mode = 'timeup'; modeT = 0; SFX.timeup(); buzzv(30); fingers.clear(); }
function toEnd() {
  mode = 'end'; modeT = 0; stopMusic();
  const win = total >= TARGET; const stars = total >= STAR3 ? 3 : total >= STAR2 ? 2 : win ? 1 : 0;
  let best = 0; try { best = +localStorage.getItem('vf_best') || 0; if (total > best) { best = total; localStorage.setItem('vf_best', total); } } catch (e) {}
  document.getElementById('endTitle').textContent = win ? 'FAIR CHAMPION!' : 'SO CLOSE!';
  document.getElementById('endTitle').style.fontSize = win ? '36px' : '42px';
  document.getElementById('endSub').textContent = win ? (stars === 3 ? 'Legend of the fair! 🏆' : stars === 2 ? 'The whole fair is cheering! 🏆' : 'You beat the fair! 🏆') : 'Only ' + (TARGET - total) + ' points short. Go again!';
  for (let k = 0; k < 3; k++) document.getElementById('r' + k).textContent = gscore[k];
  document.getElementById('rt').textContent = total;
  document.getElementById('endTarget').textContent = 'Target ' + TARGET + ' · Best ' + best;
  const st = document.querySelectorAll('#stars span'); st.forEach(s => s.className = '');
  document.getElementById('end').classList.remove('hide');
  st.forEach((s, k) => setTimeout(() => { s.className = k < stars ? 'on' : 'off'; if (k < stars) tone(660 + k * 220, 0.2, 'triangle', 0.2); }, 350 + k * 330));
  if (win) { SFX.fanfare(); buzzv([60, 40, 60, 40, 120]); for (let k = 0; k < 4; k++) setTimeout(() => confetti(rnd(40, W - 40), rnd(H * 0.1, H * 0.35), 60, 1.1), k * 300); }
  else { SFX.sad(); buzzv(80); }
  lastResult = { win, stars, total, gscore: gscore.slice(), bestCombo, stats: Object.assign({}, stats) };
}
let lastResult = null;

// ===== Input =====
const fingers = new Map();
cv.addEventListener('pointerdown', e => {
  e.preventDefault(); initAudio();
  const f = { sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, thrown: false, t: performance.now() };
  fingers.set(e.pointerId, f);
  if (mode !== 'play') return;
  if (gi === 0) R.handX = clamp(e.clientX, 24, W - 24);
  if (gi === 1) balloonTap(e.clientX, e.clientY);
}, { passive: false });
cv.addEventListener('pointermove', e => {
  const f = fingers.get(e.pointerId); if (!f) return; e.preventDefault();
  const dx = e.clientX - f.x; f.x = e.clientX; f.y = e.clientY;
  if (mode !== 'play') return;
  if (gi === 0) {
    if (!f.thrown) R.handX = clamp(f.sx + (e.clientX - f.sx) * 0.35, 24, W - 24);
    const ddy = e.clientY - f.sy;
    if (!f.thrown && ddy < -32) { f.thrown = true; ringThrow(f.sx, e.clientX - f.sx, ddy); }
  }
  if (gi === 2) S.bx = clamp(S.bx + dx * 1.3, S.bw / 2, W - S.bw / 2);
}, { passive: false });
function up(e) {
  const f = fingers.get(e.pointerId); fingers.delete(e.pointerId); if (!f || mode !== 'play') return;
  if (gi === 0 && !f.thrown) {
    const ddy = e.clientY - f.sy;
    if (ddy < -20) { ringThrow(f.sx, e.clientX - f.sx, ddy); }
    else if (performance.now() - f.t < 300 && Math.abs(ddy) < 15) popup(f.sx, f.sy - 40, 'SWIPE UP!', '#fff', 20, 0.6);
  }
}
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
document.getElementById('startBtn').addEventListener('click', startRound);
document.getElementById('retryBtn').addEventListener('click', startRound);
document.getElementById('tgtStart').textContent = TARGET;

// ===== Drawing helpers =====
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function outlined(text, x, y, size, col, weight = 900) {
  ctx.font = weight + ' ' + size + 'px system-ui,-apple-system,Roboto,sans-serif'; ctx.textAlign = 'center';
  ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(4, size * 0.18); ctx.strokeStyle = '#3a2340'; ctx.strokeText(text, x, y);
  ctx.fillStyle = col; ctx.fillText(text, x, y);
}
function drawHUD() {
  ctx.fillStyle = 'rgba(58,35,64,.82)'; rr(8, 8, W - 16, 40, 14); ctx.fill();
  ctx.textAlign = 'left'; ctx.fillStyle = '#ffd23f'; ctx.font = '900 20px system-ui'; ctx.fillText(total, 20, 35);
  const sw = ctx.measureText(String(total)).width;
  ctx.fillStyle = '#fff'; ctx.font = '700 11px system-ui'; ctx.fillText('SCORE', 20 + sw + 6, 34);
  ctx.textAlign = 'center'; ctx.font = '900 14px system-ui'; ctx.fillStyle = '#fff'; ctx.fillText(ICONS[gi] + ' ' + NAMES[gi] + '  ' + (gi + 1) + '/3', W / 2 + 10, 34);
  ctx.textAlign = 'right'; ctx.font = '700 11px system-ui'; ctx.fillStyle = total >= TARGET ? '#7dff7d' : '#ffcfdf'; ctx.fillText((total >= TARGET ? '✓ ' : '🏆 ') + TARGET, W - 18, 34);
  // timer bar
  const left = mode === 'play' ? Math.max(0, GAME_TIME - gameT) : mode === 'card' ? GAME_TIME : 0;
  const fr = left / GAME_TIME;
  ctx.fillStyle = 'rgba(58,35,64,.6)'; rr(14, 52, W - 28, 10, 5); ctx.fill();
  const low = left < 5 && mode === 'play';
  ctx.fillStyle = low ? ((Math.floor(gameT * 6) % 2) ? '#ff3b3b' : '#ff9a9a') : fr > 0.5 ? '#5bdc5b' : '#ffd23f';
  if (fr > 0) { rr(14, 52, (W - 28) * fr, 10, 5); ctx.fill(); }
  if (low) outlined(Math.ceil(left), W / 2, 100, 40, '#ff5a5a');
  // combo
  if (combo >= 2) {
    const m = mult(combo), pulse = 1 + 0.08 * Math.sin(performance.now() / 80);
    ctx.save(); ctx.translate(W - 60, 92); ctx.scale(pulse, pulse);
    ctx.fillStyle = m > 1 ? '#ff2d6f' : 'rgba(58,35,64,.75)'; rr(-50, -20, 100, 40, 14); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '900 13px system-ui'; ctx.textAlign = 'center'; ctx.fillText('COMBO ' + combo, 0, -3);
    ctx.fillStyle = '#ffd23f'; ctx.font = '900 14px system-ui'; ctx.fillText('x' + m + ' points', 0, 13);
    ctx.restore();
  }
}
function drawCard() {
  const t = modeT, inT = clamp(t / 0.3, 0, 1), outT = clamp((t - (CARD_TIME - 0.25)) / 0.25, 0, 1);
  const e = 1 - Math.pow(1 - inT, 3);
  const x = W / 2 + (1 - e) * -W + outT * W, y = H * 0.45;
  ctx.fillStyle = 'rgba(40,20,60,' + (0.45 * (1 - outT)) + ')'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(x, y); ctx.rotate((1 - e) * -0.2);
  ctx.fillStyle = '#fff8ec'; rr(-W * 0.42, -120, W * 0.84, 240, 26); ctx.fill();
  ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 6; ctx.stroke();
  ctx.fillStyle = '#e8245f'; rr(-W * 0.3, -138, W * 0.6, 40, 20); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '900 18px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(gi === 0 ? 'GAME 1 / 3' : 'NEXT GAME!', 0, -112);
  ctx.font = '56px system-ui'; ctx.fillText(ICONS[gi], 0, -36);
  ctx.fillStyle = '#3a2340'; ctx.font = '900 34px system-ui'; ctx.fillText(NAMES[gi], 0, 16);
  ctx.fillStyle = '#8a5a2b'; ctx.font = '700 16px system-ui'; ctx.fillText(HINTS[gi], 0, 48);
  ctx.fillStyle = '#e8245f'; ctx.font = '900 16px system-ui';
  ctx.fillText(gi === 0 ? 'Target for the round: ' + TARGET : 'Score so far: ' + total + ' / ' + TARGET, 0, 86);
  ctx.restore();
  const cd = CARD_TIME - t;
  if (cd < 1.2 && cd > 0.25) { /* small ready pip */ }
}
function drawParts(dt) {
  for (const p of parts) {
    p.t += dt;
    if (p.kind === 'r') { const k = p.t / p.life; ctx.strokeStyle = p.c; ctx.globalAlpha = 1 - k; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, p.y, 20 + k * 40, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; continue; }
    p.vy += p.g * dt; p.vx *= (1 - dt * 1.2); p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
    ctx.globalAlpha = clamp((p.life - p.t) / 0.3, 0, 1);
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * (p.kind === 'c' ? Math.abs(Math.cos(p.r * 2)) + 0.2 : 1)); ctx.restore();
  }
  ctx.globalAlpha = 1;
  for (let i = parts.length - 1; i >= 0; i--) if (parts[i].t > parts[i].life) parts.splice(i, 1);
  if (parts.length > 500) parts.splice(0, parts.length - 500);
  for (const p of pops) {
    p.t += dt; const k = p.t / p.life, s = k < 0.15 ? 0.6 + k / 0.15 * 0.5 : 1.1 - Math.min(0.1, (k - 0.15));
    ctx.globalAlpha = clamp((1 - k) / 0.3, 0, 1);
    ctx.save(); ctx.translate(p.x, p.y - k * 40); ctx.scale(s, s); outlined(p.text, 0, 0, p.size, p.col); ctx.restore();
  }
  ctx.globalAlpha = 1;
  for (let i = pops.length - 1; i >= 0; i--) if (pops[i].t > pops[i].life) pops.splice(i, 1);
}

// ===== Main loop =====
let last = performance.now();
function frame(now) {
  let dt = Math.min(0.05, (now - last) / 1000); last = now;
  modeT += dt;
  if (mode === 'card' && modeT >= CARD_TIME) toPlay();
  if (mode === 'play') {
    gameT += dt;
    [ringUpdate, balloonUpdate, sweetUpdate][gi](dt);
    const left = GAME_TIME - gameT;
    if (left < 5 && Math.ceil(left) !== lastTick) { lastTick = Math.ceil(left); SFX.tick(); }
    if (gameT >= GAME_TIME) toTimeup();
  } else if (mode === 'timeup') {
    if (gi === 1) balloonUpdate(dt);
    if (modeT >= TIMEUP_TIME) { if (gi < 2) toCard(gi + 1); else toEnd(); }
  }
  // draw
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  let sx = 0, sy = 0;
  if (shakeT > 0) { shakeT -= dt; sx = rnd(-shakeM, shakeM); sy = rnd(-shakeM, shakeM); if (shakeT <= 0) shakeM = 0; }
  ctx.drawImage(bg, 0, 0, W, H);
  drawWheel(dt);
  ctx.save(); ctx.translate(sx, sy);
  if (mode === 'play' || mode === 'card' || mode === 'timeup') {
    [ringDraw, balloonDraw, sweetDraw][gi]();
  }
  ctx.restore();
  drawParts(dt);
  if (mode === 'play' || mode === 'card' || mode === 'timeup') drawHUD();
  if (mode === 'card') drawCard();
  if (mode === 'timeup') {
    const k = clamp(modeT / 0.2, 0, 1);
    ctx.fillStyle = 'rgba(40,20,60,.35)'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(W / 2, H * 0.45); ctx.scale(0.5 + k * 0.5, 0.5 + k * 0.5); outlined("TIME'S UP!", 0, 0, 52, '#ffd23f'); outlined(NAMES[gi] + ': ' + gscore[gi], 0, 48, 24, '#fff'); ctx.restore();
  }
  if (flashT > 0) { flashT -= dt; ctx.fillStyle = flashC; ctx.globalAlpha = clamp(flashT / 0.15, 0, 1); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  requestAnimationFrame(frame);
}
resize();
requestAnimationFrame(frame);

// test hook (read-only state for automated checks)
window.__vf = {
  state: () => ({ mode, gi, gameT, modeT, total, gscore: gscore.slice(), combo, bestCombo, W, H, TARGET,
    ring: { beltY: R.beltY, ringY: R.ringY, speed: R.speed, ready: R.ready, bottles: R.bottles.map(b => ({ x: b.x, type: b.type, ringed: b.ringed })), rings: R.rings.length },
    balloons: B.list.map(b => ({ x: b.x + (b.dx || 0), y: b.y, r: b.r, type: b.type, vy: b.vy })),
    sweet: { bx: S.bx, by: S.by, bw: S.bw, items: S.items.map(i => ({ x: i.x, y: i.y, vy: i.vy, type: i.type })) },
    stats: Object.assign({}, stats), result: lastResult })
};
})();
