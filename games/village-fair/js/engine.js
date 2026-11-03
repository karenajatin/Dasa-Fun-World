// Village Fair — engine: canvas, FX, scoring/combo, HUD, level runner (cards, time-up, rival bar, chase)
'use strict';
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
let W = 390, H = 844, DPR = 1, bg = null, TIME = 0;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const pick = a => a[(Math.random() * a.length) | 0];
function resize(){
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  bg = Backdrop.build(Backdrop.theme || 0, W, H, DPR);
  if (RUN.mode === 'play' || RUN.mode === 'card') { const g = MG[RUN.gkey]; if (g && g.resize) g.resize(); }
}
window.addEventListener('resize', resize);
function setTheme(th){ Backdrop.theme = th; bg = Backdrop.build(th, W, H, DPR); }

// ===== drawing helpers =====
function rr(x, y, w, h, r){ ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function outlined(text, x, y, size, col, weight){
  ctx.font = (weight || 900) + ' ' + size + 'px VFDeva, system-ui,-apple-system,Roboto,sans-serif'; ctx.textAlign = 'center';
  ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(4, size * 0.18); ctx.strokeStyle = '#3a2340'; ctx.strokeText(text, x, y);
  ctx.fillStyle = col; ctx.fillText(text, x, y);
}
function pill(text, y){ ctx.font = 'bold 14px VFDeva, system-ui'; const w = Math.min(W - 24, ctx.measureText(text).width + 36); ctx.fillStyle = 'rgba(58,35,64,.78)'; rr(W / 2 - w / 2, y - 22, w, 32, 16); ctx.fill(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(text, W / 2, y - 1); }

// ===== FX =====
const parts = [], pops = [];
function confetti(x, y, n, spread, cols){
  spread = spread || 1; cols = cols || CONF; if (parts.length > 420) n = Math.min(n, 8);
  for (let i = 0; i < n; i++) { const a = rnd(0, Math.PI * 2), s = rnd(120, 420) * spread;
    parts.push({x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 160 * spread, g: 600, r: rnd(0, 6), vr: rnd(-12, 12), w: rnd(5, 10), h: rnd(3, 6), c: pick(cols), life: rnd(0.7, 1.3), t: 0, kind: 'c'}); }
}
function shards(x, y, n, col){
  for (let i = 0; i < n; i++) { const a = rnd(0, Math.PI * 2), s = rnd(150, 380);
    parts.push({x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 500, r: rnd(0, 6), vr: rnd(-15, 15), w: rnd(6, 12), h: rnd(4, 8), c: col, life: rnd(0.35, 0.6), t: 0, kind: 's'}); }
  parts.push({x, y, ring: true, t: 0, life: 0.3, c: col, kind: 'r'});
}
function popup(x, y, text, col, size, life){ col = col || '#fff'; size = size || 26; life = life || 0.9; text = String(text); const hw = Math.min(W / 2 - 4, text.length * size * 0.32 + 8); pops.push({x: clamp(x, hw, W - hw), y, text, col, size, life, t: 0}); }
let shakeT = 0, shakeM = 0, flashT = 0, flashC = '#fff';
function shake(m, t){ shakeM = Math.max(shakeM, m); shakeT = Math.max(shakeT, t || 0.25); }
function flash(c, t){ flashC = c; flashT = t || 0.15; }
function drawParts(dt){
  for (const p of parts) {
    p.t += dt;
    if (p.kind === 'r') { const k = p.t / p.life; ctx.strokeStyle = p.c; ctx.globalAlpha = Math.max(0, 1 - k); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, p.y, 20 + k * 40, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; continue; }
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

// ===== run state + scoring (prototype combo rule: 3 = x2, 6 = x3, 9 = x4) =====
const CARD_TIME = 2.0, TIMEUP_TIME = 0.9;
const RUN = {mode: 'idle', L: null, gi: 0, gkey: null, gLen: 25, modeT: 0, gameT: 0, playT: 0, total: 0, gscore: [], combo: 0, bestCombo: 0, lastTick: -1,
  rival: 0, rivalFinal: 0, totalPlay: 0, banterT: 0, banter: null, paused: false, result: null, stats: {}, phase: 0, slowmo: 0, chaseGap: 100, caught: false};
let D = 0, MODS = {}, BOOST = {};
const mult = c => c >= 9 ? 4 : c >= 6 ? 3 : c >= 3 ? 2 : 1;
function prog(){ return clamp(RUN.gameT / RUN.gLen, 0, 1); }
function addScore(base, x, y, label){
  let m = mult(RUN.combo); if (RUN.dbl > 0) m *= 2; const pts = base * m;
  RUN.total += pts; RUN.gscore[RUN.gi] += pts;
  popup(x, y, (label ? label + ' ' : '') + '+' + pts, m > 1 ? '#ffd23f' : '#fff', m > 2 ? 30 : 26);
  return pts;
}
function bad(x, y, pts, label){
  const p = Math.min(pts, Math.max(0, RUN.gscore[RUN.gi]));
  RUN.total -= p; RUN.gscore[RUN.gi] -= p;
  if (RUN.combo >= 3) popup(W / 2, H * 0.3, 'कॉम्बो टूटा', '#ff6b6b', 22);
  RUN.combo = 0;
  popup(x, y, label + (p ? ' -' + p : ''), '#ff4040', 28);
}
function loseCombo(msg){ if (RUN.combo >= 3) popup(W / 2, H * 0.3, msg || 'कॉम्बो टूटा', '#ff6b6b', msg ? 20 : 22); RUN.combo = 0; }
function hit(){
  RUN.combo++; if (RUN.combo > RUN.bestCombo) RUN.bestCombo = RUN.combo;
  if (RUN.combo === 3 || RUN.combo === 6 || RUN.combo === 9) { popup(W / 2, H * 0.27, 'कॉम्बो x' + mult(RUN.combo) + '!', '#ffd23f', 34, 1.0); confetti(W / 2, H * 0.27, 18, 0.6); if (RUN.combo === 9) Voice.shout('s_combo'); }
}
function stat(k, n){ RUN.stats[k] = (RUN.stats[k] || 0) + (n == null ? 1 : n); }

// ===== level flow =====
function startLevel(n){
  initAudio();
  const L = LEVELS[n - 1]; RUN.L = L; D = L.d; MODS = L.mods || {};
  BOOST = {}; (SAVE.owned || []).forEach(k => { if (SAVE.boostOn[k] !== false) BOOST[k] = 1; });
  RUN.total = 0; RUN.gscore = L.games.map(() => 0); RUN.combo = 0; RUN.bestCombo = 0; RUN.stats = {}; RUN.result = null; RUN.paused = false;
  RUN.playT = 0; RUN.totalPlay = L.games.reduce((a, g) => a + g[1] + (BOOST.extratime ? 3 : 0), 0);
  RUN.rival = 0; RUN.rivalFinal = L.target; RUN.banter = null; RUN.banterT = 4 + Math.random() * 3; RUN.slowmo = 0; RUN.dbl = 0;
  RUN.chaseGap = 100; RUN.caught = false; RUN.phase = 0;
  parts.length = 0; pops.length = 0;
  setTheme(CHAPTERS[L.ch - 1].theme);
  toCard(0);
  Music.start(L.ch - 1);
  if (L.boss) setTimeout(() => { if (RUN.L === L) Voice.play(RIVALS[L.boss].taunt); }, 400);
  document.getElementById('pauseBtn').classList.remove('hide');
}
function toCard(i){
  RUN.gi = i; RUN.gkey = RUN.L.games[i][0]; RUN.gLen = RUN.L.games[i][1] + (BOOST.extratime ? 3 : 0);
  RUN.mode = 'card'; RUN.modeT = 0; RUN.combo = 0; RUN.dbl = 0; SFX.card();
  if (RUN.L.phases && RUN.L.phases.includes(i)) RUN.phase = RUN.L.phases.indexOf(i) + 1;
  MG[RUN.gkey].init();
}
function toPlay(){ RUN.mode = 'play'; RUN.modeT = 0; RUN.gameT = 0; RUN.lastTick = -1; SFX.go(); popup(W / 2, H * 0.45, 'चलो!', '#ffd23f', 64, 0.7); if (RUN.gkey === 'dhol') Music.duck(true); else Music.duck(false); }
function toTimeup(){ RUN.mode = 'timeup'; RUN.modeT = 0; SFX.timeup(); buzzv(30); fingers.clear(); }
function endLevel(){
  const L = RUN.L; RUN.mode = 'end'; RUN.modeT = 0; Music.duck(false);
  let win, stars;
  if (L.chase) { win = RUN.caught; const left = RUN.gLen - RUN.gameT; stars = win ? (left >= 14 ? 3 : left >= 6 ? 2 : 1) : 0; }
  else { stars = starsFor(L, RUN.total); win = stars > 0; }
  RUN.result = {n: L.n, win, stars, score: RUN.total, target: L.target, gscore: RUN.gscore.slice(), bestCombo: RUN.bestCombo, stats: Object.assign({}, RUN.stats), rival: L.boss ? Math.round(RUN.rivalFinal) : null, chase: !!L.chase, gap: Math.round(RUN.chaseGap)};
  document.getElementById('pauseBtn').classList.add('hide');
  if (win) { SFX.fanfare(); buzzv([60, 40, 60, 40, 120]); for (let k = 0; k < 4; k++) setTimeout(() => confetti(rnd(40, W - 40), rnd(H * 0.1, H * 0.35), 60, 1.1), k * 300); setTimeout(() => Voice.shout(L.boss ? 's_champ' : 's_great'), 500); }
  else { SFX.sad(); buzzv(80); setTimeout(() => Voice.shout('s_close'), 600); }
  setTimeout(() => { if (RUN.mode === 'end' && RUN.result) UI.showResult(RUN.result); }, win ? 900 : 700);
}
function quitLevel(){ RUN.mode = 'idle'; RUN.L = null; fingers.clear(); Music.duck(false); document.getElementById('pauseBtn').classList.add('hide'); }

// ===== HUD =====
function drawHUD(){
  const L = RUN.L, g = GAMEINFO[RUN.gkey];
  ctx.fillStyle = 'rgba(58,35,64,.85)'; rr(8, 8, W - 64, 40, 14); ctx.fill();
  ctx.textAlign = 'left'; ctx.fillStyle = '#ffd23f'; ctx.font = '900 20px VFDeva, system-ui'; ctx.fillText(RUN.total, 20, 35);
  ctx.textAlign = 'center'; ctx.font = '900 13px VFDeva, system-ui'; ctx.fillStyle = '#fff';
  ctx.fillText(g.icon + ' ' + (W < 360 ? '' : g.short + ' ') + (RUN.gi + 1) + '/' + L.games.length, W / 2 - 6, 33);
  ctx.textAlign = 'right'; ctx.font = '800 12px VFDeva, system-ui';
  if (!L.boss) { ctx.fillStyle = RUN.total >= L.target ? '#7dff7d' : '#ffcfdf'; ctx.fillText((RUN.total >= L.target ? '✓ ' : '🏆 ') + L.target, W - 66, 33); }
  else if (!L.chase) { ctx.fillStyle = '#ffcfdf'; ctx.fillText('vs ' + RIVALS[L.boss].short, W - 66, 33); }
  else { ctx.fillStyle = '#ffcfdf'; ctx.fillText('बंदू को पकड़ो!', W - 66, 33); }
  // timer bar
  const left = RUN.mode === 'play' ? Math.max(0, RUN.gLen - RUN.gameT) : RUN.mode === 'card' ? RUN.gLen : 0, fr = left / RUN.gLen;
  ctx.fillStyle = 'rgba(58,35,64,.6)'; rr(14, 52, W - 28, 9, 4.5); ctx.fill();
  const low = left < 5 && RUN.mode === 'play';
  ctx.fillStyle = low ? ((Math.floor(RUN.gameT * 6) % 2) ? '#ff3b3b' : '#ff9a9a') : fr > 0.5 ? '#5bdc5b' : '#ffd23f';
  if (fr > 0) { rr(14, 52, (W - 28) * fr, 9, 4.5); ctx.fill(); }
  if (low) outlined(Math.ceil(left), W / 2, 112, 40, '#ff5a5a');
  // boss: live score race
  let y = 66;
  if (L.boss && !L.chase) {
    const mx = Math.max(RUN.rivalFinal * 1.25, RUN.total, 1);
    ctx.fillStyle = 'rgba(58,35,64,.7)'; rr(14, y, W - 28, 30, 10); ctx.fill();
    ctx.fillStyle = '#ff2d6f'; rr(66, y + 5, (W - 140) * clamp(RUN.total / mx, 0, 1) + 4, 8, 4); ctx.fill();
    ctx.fillStyle = '#2ec4ff'; rr(66, y + 17, (W - 140) * clamp(RUN.rival / mx, 0, 1) + 4, 8, 4); ctx.fill();
    ctx.font = '800 10px VFDeva, system-ui'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.fillText('मीरा', 20, y + 13); ctx.fillText(RIVALS[L.boss].short.slice(0, 7), 20, y + 25);
    ctx.textAlign = 'right'; ctx.fillText(RUN.total, W - 20, y + 13); ctx.fillText(Math.round(RUN.rival), W - 20, y + 25);
    y += 34;
  }
  if (L.chase) {
    ctx.fillStyle = 'rgba(58,35,64,.7)'; rr(14, y, W - 28, 22, 10); ctx.fill();
    const k = 1 - clamp(RUN.chaseGap / 100, 0, 1);
    ctx.fillStyle = '#ffd23f'; rr(70, y + 7, (W - 120) * k + 4, 8, 4); ctx.fill();
    ctx.font = '800 10px VFDeva, system-ui'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.fillText('पीछा', 20, y + 15); ctx.textAlign = 'right'; ctx.fillText('🐒', W - 20, y + 16);
    y += 26;
  }
  if (RUN.dbl > 0) { outlined('डबल अंक ' + Math.ceil(RUN.dbl), W / 2, y + 22, 18, '#ffd23f'); }
  // combo
  if (RUN.combo >= 2) {
    const m = mult(RUN.combo), pulse = 1 + 0.08 * Math.sin(TIME * 12);
    ctx.save(); ctx.translate(W - 60, y + 30); ctx.scale(pulse, pulse);
    ctx.fillStyle = m > 1 ? '#ff2d6f' : 'rgba(58,35,64,.75)'; rr(-50, -20, 100, 40, 14); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '900 13px VFDeva, system-ui'; ctx.textAlign = 'center'; ctx.fillText('कॉम्बो ' + RUN.combo, 0, -3);
    ctx.fillStyle = '#ffd23f'; ctx.font = '900 14px VFDeva, system-ui'; ctx.fillText('x' + m + ' अंक', 0, 14);
    ctx.restore();
  }
  // banter bubble
  if (RUN.banter) {
    const b = RUN.banter, k = clamp(b.t / 0.2, 0, 1) * clamp((b.life - b.t) / 0.3, 0, 1);
    ctx.globalAlpha = k; ctx.save(); ctx.translate(0, H * 0.62);
    ctx.fillStyle = 'rgba(255,248,236,.95)'; ctx.font = '800 14px VFDeva, system-ui'; const tw = Math.min(W - 110, ctx.measureText(b.text).width + 24);
    rr(76, -18, tw, 36, 14); ctx.fill(); ctx.fillStyle = '#3a2340'; ctx.textAlign = 'left'; ctx.fillText(b.text, 88, 5, tw - 20);
    ctx.fillStyle = 'rgba(255,248,236,.95)'; ctx.beginPath(); ctx.arc(42, 0, 30, 0, 7); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(42, 0, 28, 0, 7); ctx.clip(); drawChar(ctx, b.who, 42, 6, 0.42, TIME, {talk: true, hat: SAVE.hat, outfit: SAVE.outfit}); ctx.restore();
    ctx.restore(); ctx.globalAlpha = 1;
  }
}
function drawCard(){
  const L = RUN.L, g = GAMEINFO[RUN.gkey], t = RUN.modeT, inT = clamp(t / 0.3, 0, 1), outT = clamp((t - (CARD_TIME - 0.25)) / 0.25, 0, 1);
  const e = 1 - Math.pow(1 - inT, 3), x = W / 2 + (1 - e) * -W + outT * W, y = H * 0.45;
  ctx.fillStyle = 'rgba(40,20,60,' + (0.45 * (1 - outT)) + ')'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(x, y); ctx.rotate((1 - e) * -0.2);
  ctx.fillStyle = '#fff8ec'; rr(-W * 0.42, -120, W * 0.84, 240, 26); ctx.fill(); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 6; ctx.stroke();
  ctx.fillStyle = '#e8245f'; rr(-W * 0.32, -138, W * 0.64, 40, 20); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '900 17px VFDeva, system-ui'; ctx.textAlign = 'center';
  const ph = L.phases && L.phases.includes(RUN.gi) ? 'चरण ' + RUN.phase + ' / ' + L.phases.length : null;
  ctx.fillText(ph || (L.games.length === 1 ? 'लेवल ' + L.n : RUN.gi === 0 ? 'खेल 1 / ' + L.games.length : 'अगला खेल!'), 0, -112);
  ctx.font = '54px VFDeva, system-ui'; ctx.fillText(g.icon, 0, -40);
  ctx.fillStyle = '#3a2340'; ctx.font = '900 ' + (g.name.length > 12 ? 27 : 33) + 'px VFDeva, system-ui'; ctx.fillText(g.name, 0, 12);
  ctx.fillStyle = '#8a5a2b'; ctx.font = '700 15px VFDeva, system-ui'; ctx.fillText(g.hint, 0, 46, W * 0.78);
  ctx.fillStyle = '#e8245f'; ctx.font = '900 15px VFDeva, system-ui';
  const goal = L.chase ? 'टिकट लो और बंदू तक पहुँचो!' : L.boss ? (RIVALS[L.boss].name + ' को हराओ!') : (RUN.gi === 0 ? 'लक्ष्य: ' + L.target : 'अब तक: ' + RUN.total + ' / ' + L.target);
  ctx.fillText(goal, 0, 84, W * 0.78);
  ctx.restore();
}
function drawTimeup(){
  const k = clamp(RUN.modeT / 0.2, 0, 1);
  ctx.fillStyle = 'rgba(40,20,60,.35)'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2, H * 0.45); ctx.scale(0.5 + k * 0.5, 0.5 + k * 0.5);
  if (RUN.L.chase && RUN.caught) { outlined('पकड़ लिया!', 0, 0, 52, '#ffd23f'); outlined('ट्रॉफी बच गई!', 0, 50, 24, '#fff'); }
  else { outlined('समय खत्म!', 0, 0, 50, '#ffd23f'); outlined(GAMEINFO[RUN.gkey].name + ': ' + RUN.gscore[RUN.gi], 0, 48, 24, '#fff'); }
  ctx.restore();
}

// ===== input =====
const fingers = new Map();
cv.addEventListener('pointerdown', e => {
  e.preventDefault(); initAudio();
  const f = {sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, thrown: false, t: performance.now()};
  fingers.set(e.pointerId, f);
  if (RUN.mode !== 'play' || RUN.paused) return;
  const g = MG[RUN.gkey]; if (g.down) g.down(e.clientX, e.clientY, f);
}, {passive: false});
cv.addEventListener('pointermove', e => {
  const f = fingers.get(e.pointerId); if (!f) return; e.preventDefault();
  const dx = e.clientX - f.x, dy = e.clientY - f.y; f.x = e.clientX; f.y = e.clientY;
  if (RUN.mode !== 'play' || RUN.paused) return;
  const g = MG[RUN.gkey]; if (g.move) g.move(f, dx, dy, e.clientX, e.clientY);
}, {passive: false});
function upEv(e){ const f = fingers.get(e.pointerId); fingers.delete(e.pointerId); if (!f || RUN.mode !== 'play' || RUN.paused) return; const g = MG[RUN.gkey]; if (g.up) g.up(f, e.clientX, e.clientY); }
cv.addEventListener('pointerup', upEv); cv.addEventListener('pointercancel', upEv);

// ===== main loop =====
let lastFrame = performance.now(), fpsAcc = 0, fpsN = 0, FPS = 60;
function frame(now){
  let dt = Math.min(0.05, (now - lastFrame) / 1000); lastFrame = now; fpsAcc += dt; fpsN++; if (fpsAcc > 1) { FPS = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  if (RUN.paused) dt = 0;
  if (typeof Story !== 'undefined' && Story.running) { Story.update(dt); requestAnimationFrame(frame); return; }
  if (RUN.slowmo > 0) { RUN.slowmo -= dt; dt *= 0.35; }
  TIME += dt; RUN.modeT += dt;
  const L = RUN.L;
  if (RUN.mode === 'card' && RUN.modeT >= CARD_TIME) toPlay();
  if (RUN.mode === 'play') {
    RUN.gameT += dt; RUN.playT += dt; if (RUN.dbl > 0) RUN.dbl = Math.max(0, RUN.dbl - dt);
    MG[RUN.gkey].update(dt);
    if (L.boss && !L.chase) { const p = clamp(RUN.playT / RUN.totalPlay, 0, 1); RUN.rival = RUN.rivalFinal * (p * 0.92 + 0.08 * Math.sin(p * Math.PI) * 0.5 + Math.max(0, p - 0.9) * 0.8 - 0.04 * Math.sin(p * 13) * p); RUN.rival = Math.max(0, Math.min(RUN.rival, RUN.rivalFinal)); }
    if (L.boss) { RUN.banterT -= dt; if (RUN.banterT <= 0) { RUN.banterT = 7 + Math.random() * 5; const R = RIVALS[L.boss]; RUN.banter = {who: L.boss === 'bandu' ? 'K' : R.who, text: pick(R.banter), t: 0, life: 2.6}; } }
    const left = RUN.gLen - RUN.gameT;
    if (left < 5 && Math.ceil(left) !== RUN.lastTick) { RUN.lastTick = Math.ceil(left); SFX.tick(); }
    if (RUN.gameT >= RUN.gLen || RUN.caught) { if (L.boss && !L.chase && RUN.gi === L.games.length - 1) RUN.rival = RUN.rivalFinal; toTimeup(); }
  } else if (RUN.mode === 'timeup') {
    if (RUN.gkey === 'balloon') MG.balloon.update(dt);
    if (RUN.modeT >= TIMEUP_TIME * (RUN.caught ? 1.8 : 1)) { if (RUN.gi < L.games.length - 1 && !RUN.caught) toCard(RUN.gi + 1); else endLevel(); }
  }
  if (RUN.banter) { RUN.banter.t += dt; if (RUN.banter.t > RUN.banter.life) RUN.banter = null; }
  // draw
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  let sx = 0, sy = 0;
  if (shakeT > 0) { shakeT -= dt; sx = rnd(-shakeM, shakeM); sy = rnd(-shakeM, shakeM); if (shakeT <= 0) shakeM = 0; }
  ctx.drawImage(bg, 0, 0, W, H);
  const inLevel = RUN.mode === 'play' || RUN.mode === 'card' || RUN.mode === 'timeup' || RUN.mode === 'end';
  Backdrop.drawLive(ctx, dt, TIME, {noCrowd: inLevel && RUN.gkey === 'cart', cheer: RUN.mode === 'end' && RUN.result && RUN.result.win});
  if (inLevel) { ctx.save(); ctx.translate(sx, sy); MG[RUN.gkey].draw(); ctx.restore(); }
  drawParts(dt);
  if (inLevel && RUN.mode !== 'end') drawHUD();
  if (RUN.mode === 'card') drawCard();
  if (RUN.mode === 'timeup') drawTimeup();
  if (flashT > 0) { flashT -= dt; ctx.fillStyle = flashC; ctx.globalAlpha = clamp(flashT / 0.15, 0, 1); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  requestAnimationFrame(frame);
}
