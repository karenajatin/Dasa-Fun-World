// Kite Wars: Uttarayan — rendering
'use strict';
let nightCv = null, nightCtx = null;
const clouds = []; for (let i = 0; i < 5; i++) clouds.push({x: Math.random() * 560 - 80, y: 120 + i * 62, s: 0.8 + Math.random() * 0.6, v: 5 + i * 2});
const farKites = []; for (let i = 0; i < 16; i++) farKites.push({x: Math.random() * 400, y: 0.12 + Math.random() * 0.42, s: 3 + Math.random() * 3, c: ['#ff4f6d','#ffd23f','#2fd18b','#3fa0ff','#ff8a1f','#b05cff'][i % 6], p: Math.random() * 6});
const crowdSeed = []; for (let i = 0; i < 14; i++) crowdSeed.push({x: 20 + i * 27 + Math.random() * 10, col: ['#ff4f6d','#ffd23f','#2fd18b','#3fa0ff','#ff8a1f','#b05cff','#ffffff'][i % 7], ph: Math.random() * 6});

function cloud(x, y, s){ ctx.beginPath(); ctx.arc(x, y, 18 * s, 0, 6.283); ctx.arc(x + 20 * s, y - 8 * s, 22 * s, 0, 6.283); ctx.arc(x + 44 * s, y, 17 * s, 0, 6.283); ctx.fill(); }
function poly(pts){ ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke(); }
function drawString(k, col, w, glow){
  const pts = stringPts(k);
  if (glow && !Q.low) { ctx.strokeStyle = glow; ctx.lineWidth = w + 3; ctx.globalAlpha = 0.35; poly(pts); ctx.globalAlpha = 1; }
  ctx.strokeStyle = col; ctx.lineWidth = w; poly(pts);
}
function drawKite(k, alpha){
  const a = (alpha == null ? 1 : alpha) * (k.vis == null ? 1 : k.vis);
  if (a <= 0.01) return;
  ctx.save(); ctx.globalAlpha = a;
  const t = G.t;
  let c1 = k.c1, c2 = k.c2;
  if (k.led) { const h = (t * 90 + k.id * 70) % 360; c1 = 'hsl(' + h + ',100%,60%)'; }
  // glow (sprite, no shadowBlur)
  if (!k.falling && !Q.low) {
    if (k.isPlayer) ctx.drawImage(glowSprite('rgba(255,70,130,0.55)', 16), k.x - 32, k.y - 30, 64, 64);
    if (k.boss) ctx.drawImage(glowSprite('rgba(255,200,40,0.6)', 22), k.x - 44, k.y - 40, 88, 88);
    if (k.kind === 'golden') ctx.drawImage(glowSprite('rgba(255,230,90,0.75)', 20), k.x - 40, k.y - 38, 80, 80);
    if (k.led) ctx.drawImage(glowSprite('rgba(120,255,255,0.45)', 18), k.x - 36, k.y - 34, 72, 72);
  }
  // ribbon tail
  ctx.strokeStyle = c2; ctx.lineWidth = k.boss ? 3 : 2; ctx.beginPath(); ctx.moveTo(k.tail[0].x, k.tail[0].y);
  for (let i = 1; i < k.tail.length; i++) ctx.lineTo(k.tail[i].x, k.tail[i].y); ctx.stroke();
  for (let i = 2; i < k.tail.length; i += 2) { ctx.fillStyle = i % 4 ? c1 : c2; ctx.fillRect(k.tail[i].x - 2.5, k.tail[i].y - 2.5, 5, 5); }
  if (k.lantern) { // tukkal: lanterns tied below the kite
    for (let i = 0; i < 3; i++) { const lx = k.tail[Math.min(7, 3 + i * 2)].x + 6, ly = k.tail[Math.min(7, 3 + i * 2)].y + 6;
      ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.ellipse(lx, ly, 4, 5.5, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = '#fff2b0'; ctx.fillRect(lx - 1.5, ly - 2, 3, 4); }
  }
  ctx.translate(k.x, k.y); ctx.rotate(k.rot); const s = k.size;
  kiteBody(ctx, s, c1, c2, k.pat, t);
  if (k.led) { ctx.strokeStyle = c1; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.85, -s * 0.05); ctx.lineTo(0, s * 1.1); ctx.lineTo(-s * 0.85, -s * 0.05); ctx.closePath(); ctx.stroke(); }
  if (k.boss && !k.falling) { ctx.rotate(-k.rot); txt(k.name || 'BOSS', 0, -s - 9, 10, '#ffe14d', '#3a2340'); }
  ctx.restore();
}
function drawLoose(k){
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(k.x, k.y + k.size);
  ctx.quadraticCurveTo(k.x - 20 - G.wind * 10, k.y + 40, k.x - 10 - G.wind * 20, k.y + 80); ctx.stroke();
}
function txt(s, x, y, size, fill, stroke, align, weight, font){
  ctx.font = (font === 'fest' ? 'italic 1000 ' : (weight || 900) + ' ') + size + 'px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif'; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineWidth = Math.max(3, size / 6); ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = fill; ctx.fillText(s, x, y);
}
function rrect(x, y, w, h, r){ rr(ctx, x, y, w, h, r); }

function drawSky(t){
  const th = layers.th;
  ctx.drawImage(layers.sky, 0, 0, W, H);
  if (G.storm) { ctx.fillStyle = 'rgba(40,40,70,' + (0.28 * G.storm) + ')'; ctx.fillRect(0, 0, W, H); }
  ctx.fillStyle = G.storm ? 'rgba(200,200,220,0.6)' : th.cloud;
  const nc = Q.low ? 3 : clouds.length;
  for (let i = 0; i < nc; i++) { const c = clouds[i]; const x = ((c.x + t * (c.v * (1 + G.storm * 3)) + G.wind * t * 2) % 600 + 600) % 600 - 100; cloud(x, c.y, c.s); }
  if (!Q.low) for (const k of farKites) { const x = (k.x + Math.sin(t * 0.5 + k.p) * 10 + 400) % 400, y = H * k.y + Math.cos(t * 0.7 + k.p) * 6;
    ctx.fillStyle = k.c; ctx.globalAlpha = th.night ? 0.25 : 0.45; ctx.beginPath(); ctx.moveTo(x, y - k.s); ctx.lineTo(x + k.s * 0.8, y); ctx.lineTo(x, y + k.s * 1.1); ctx.lineTo(x - k.s * 0.8, y); ctx.fill(); ctx.globalAlpha = 1; }
  if (th.night && !Q.low) { // floating sky lanterns
    for (let i = 0; i < 7; i++) { const x = (i * 61 + t * 4 + Math.sin(t * 0.4 + i) * 12) % 420 - 10, y = H * 0.5 - ((t * (6 + i) + i * 90) % (H * 0.5));
      ctx.drawImage(glowSprite('rgba(255,170,60,0.6)', 8), x - 16, y - 16, 32, 32); ctx.fillStyle = '#ffcf6b'; ctx.fillRect(x - 2.5, y - 3.5, 5, 7); }
  }
  ctx.drawImage(layers.far, 0, 0, W, H);
  ctx.drawImage(layers.mid, 0, 0, W, H);
  // tiny cheering crowd on the mid rooftops / riverfront
  const mb = H - 260, cheer = G.cheer > 0;
  if (!Q.low) for (const p of crowdSeed) { const hop = cheer ? Math.abs(Math.sin(t * 12 + p.ph)) * 4 : Math.abs(Math.sin(t * 2 + p.ph)) * 0.8; const y = th.river ? mb - 10 : mb - 70 - (p.x * 7 % 40);
    ctx.fillStyle = th.night ? '#1a1530' : p.col; ctx.fillRect(p.x - 2, y - 7 - hop, 4, 7); ctx.fillStyle = th.night ? '#120f22' : '#5a3a2a'; ctx.beginPath(); ctx.arc(p.x, y - 9 - hop, 2.2, 0, 6.283); ctx.fill();
    if (cheer) { ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(p.x - 2, y - 6 - hop); ctx.lineTo(p.x - 4, y - 12 - hop); ctx.moveTo(p.x + 2, y - 6 - hop); ctx.lineTo(p.x + 4, y - 12 - hop); ctx.stroke(); } }
  if (th.river && !Q.low) { ctx.fillStyle = 'rgba(255,230,180,0.35)'; for (let i = 0; i < 6; i++) { const x = (i * 77 + t * 12) % 420 - 10; ctx.fillRect(x, mb - 40 + (i * 13 % 30), 22, 1.5); } }
}
function drawNight(){
  const th = layers.th, darkA = G.night ? (0.62 + 0.25 * G.black) : (G.dusk ? 0.42 : 0);
  if (darkA <= 0) return;
  const sc = Q.low ? 0.25 : 0.5, w = Math.ceil(W * sc), h = Math.ceil(H * sc);
  if (!nightCv || nightCv.width !== w || nightCv.height !== h) { nightCv = document.createElement('canvas'); nightCv.width = w; nightCv.height = h; nightCtx = nightCv.getContext('2d'); }
  const n = nightCtx; n.setTransform(1, 0, 0, 1, 0, 0); n.globalCompositeOperation = 'source-over'; n.clearRect(0, 0, w, h);
  n.fillStyle = G.dusk && !G.night ? 'rgba(30,10,50,' + darkA + ')' : 'rgba(3,5,22,' + darkA + ')'; n.fillRect(0, 0, w, h);
  n.globalCompositeOperation = 'destination-out'; n.setTransform(sc, 0, 0, sc, 0, 0);
  const L = (x, y, r) => n.drawImage(glowSprite('rgba(255,255,255,1)', 32), x - r, y - r, r * 2, r * 2);
  const bm = 1 - 0.45 * G.black; const P = G.player;
  if (!P.falling) L(P.x, P.y, 120 * bm); L(P.anchor.x, P.anchor.y, 70);
  if (G.ally && !G.ally.falling) L(G.ally.x, G.ally.y, 80 * bm);
  for (const r of G.rivals) { if (r.falling) continue; const rad = (r.lantern ? 95 : r.led ? 62 : r.kind === 'golden' ? 75 : r.boss ? 70 : 46) * bm * (r.vis < 0.5 ? 0.3 : 1); L(r.x, r.y, rad); }
  if (G.pech) L(G.pech.x, G.pech.y, 80);
  if (G.allyPech) L(G.allyPech.x, G.allyPech.y, 60);
  if (th.moon) L(th.moon.x, H * th.moon.y, 90);
  for (let i = 0; i < G.parts.length; i += 6) { const p = G.parts[i]; if (!p.conf) L(p.x, p.y, 14); }
  ctx.drawImage(nightCv, 0, 0, W, H);
  if (layers.em) ctx.drawImage(layers.em, 0, 0, W, H);
  // faint glow strings + lamps so the sky stays readable
  ctx.lineCap = 'round';
  for (const r of G.rivals) { if (r.falling) continue; ctx.globalAlpha = (0.32 - 0.18 * G.black) * (r.vis == null ? 1 : r.vis); drawString(r, r.state === 'hunt' ? '#ff6b6b' : r.led ? '#7ff' : '#e8e0ff', 1.2, null); ctx.globalAlpha = 1;
    if (r.vis > 0.3) { ctx.fillStyle = r.lantern ? '#ffcf6b' : r.led ? '#aff' : '#fff2b0'; ctx.beginPath(); ctx.arc(r.x, r.y + r.size * 0.2, 2.2, 0, 6.283); ctx.fill(); } }
}
function drawPeople(t){
  const py = playerRoof.y, th = layers.th, cheer = G.cheer > 0;
  // rival flyers
  for (const r of G.rivals) if (!r.falling) {
    const B = r.B, k = B ? (B.kind === 'pinky' ? 'girl' : B.kind === 'baadshah' ? 'turban' : '') : '';
    drawPersonC(ctx, r.anchor.x - 8 * (r.side < 0 ? 1 : -1), roofs[r.roof].y, {col: r.boss ? r.c1 : r.c1, flip: r.side < 0 ? 1 : -1, pull: G.pech && G.pech.r === r ? Math.sin(t * 30) * 3 : 0, kind: k, skin: '#8a5a3c'});
  }
  // family on our terrace
  const hop = i => cheer ? Math.abs(Math.sin(t * 11 + i)) * 6 : 0;
  drawPersonC(ctx, 268, py - 12, {col: '#2fd18b', kind: 'girl', cheer: cheer ? 1 + Math.sin(t * 12) : 0, hop: hop(1), skin: '#b77a52'}); // little sister Mini
  if (G.ally) drawPersonC(ctx, playerRoof.ally.x + 8, py - 12, {col: '#f3ead7', kind: 'old', flip: -1, pull: G.allyPech ? Math.sin(t * 30) * 3 : 0, skin: '#b97a52'});
  else drawPersonC(ctx, 132, py - 12, {col: '#f3ead7', kind: 'old', cheer: cheer ? 1 : 0, hop: hop(2) * 0.5, skin: '#b97a52'});
  drawPersonC(ctx, 200, py - 12, {col: '#ff8a1f', pull: G.pech ? Math.sin(t * 30) * 3 : 0, skin: '#c88a5c'}); // Arjun
  ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(190, py - 34, 6, 0, 6.283); ctx.fill(); ctx.strokeStyle = '#a86a00'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(190, py - 34, 3, 0, 6.283); ctx.stroke();
}
function drawFlocks(t){
  for (const f of G.flocks) { const fy = f.y + Math.sin(f.wob * 2) * 8;
    for (const b of f.birds) { const x = f.x + b.dx, y = fy + b.dy, fl = Math.sin(t * 18 + b.ph) * 5;
      ctx.fillStyle = '#8f8fa8'; ctx.beginPath(); ctx.ellipse(x, y, 6, 3.5, 0, 0, 6.283); ctx.fill();
      ctx.strokeStyle = '#6f6f8a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 5, y - fl); ctx.lineTo(x, y); ctx.lineTo(x + 5, y - fl); ctx.stroke();
      ctx.fillStyle = '#5a5a74'; ctx.beginPath(); ctx.arc(x + Math.sign(f.vx) * 6, y - 1, 2.4, 0, 6.283); ctx.fill(); } }
  if (G.flockWarn) { const w = G.flockWarn, x = w.dir > 0 ? 18 : 382; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(G.t * 20); txt('🐦', x, w.y, 18, '#fff'); txt(w.dir > 0 ? '▶' : '◀', x + w.dir * 18, w.y, 14, '#fff', '#3a2340'); ctx.globalAlpha = 1; }
  if (G.gust) { const g = G.gust; ctx.strokeStyle = 'rgba(255,255,255,' + (g.state === 'on' ? 0.55 : 0.25) + ')'; ctx.lineWidth = 2; for (let i = 0; i < (g.state === 'on' ? 14 : 5); i++) { const y = sky.top + ((i * 47 + G.t * 30) % (sky.bottom - sky.top + 80)), x = ((i * 91 + G.t * 600 * g.dir) % 460 + 460) % 460 - 30; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - g.dir * 40, y); ctx.stroke(); } }
}
function render(){
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#2a1d3a'; ctx.fillRect(0, 0, cv.width, cv.height);
  if (!G || !layers) return;
  ctx.setTransform(DPR * SC, 0, 0, DPR * SC, DPR * OX, 0);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
  if (G.zoom) { const z = G.zoom, a = clamp(z.t / 0.35, 0, 1) * (G.slow > 0 ? 1 : clamp(1 - (z.t - 0.4) * 1.5, 0, 1)), s = 1 + 0.35 * a; ctx.translate(z.x, z.y); ctx.scale(s, s); ctx.translate(-z.x, -z.y); }
  const sh = G.shake; ctx.translate(rnd(-sh, sh), rnd(-sh, sh));
  const t = G.t;
  drawSky(t);
  ctx.drawImage(layers.near, 0, 0, W, H);
  drawPeople(t);
  ctx.lineCap = 'round';
  for (const r of G.rivals) if (!r.falling) { ctx.globalAlpha = r.vis == null ? 1 : Math.max(0.25, r.vis); drawString(r, r.state === 'hunt' && !G.pech ? 'rgba(255,80,80,0.95)' : 'rgba(255,255,255,0.9)', r.state === 'hunt' ? 1.8 : 1.4, null); ctx.globalAlpha = 1; }
  const P = G.player;
  if (G.ally && !G.ally.falling) drawString(G.ally, '#7fb2ff', 1.8, G.allyPech ? 'rgba(255,80,80,0.9)' : null);
  if (!P.falling) drawString(P, G.man.col, 2.2, P.inv > 0 ? null : G.man.glow);
  drawFlocks(t);
  for (const r of G.rivals) { if (r.falling) { drawLoose(r); drawKite(r, clamp(1.6 - r.fallT * 0.5, 0, 1)); } else { drawKite(r);
    if (r.state === 'hunt' && !G.pech) { const a = 0.6 + 0.4 * Math.sin(t * 14); ctx.globalAlpha = a; ctx.fillStyle = r.target === 'ally' ? '#ff9a1f' : '#ff3b3b'; ctx.beginPath(); ctx.arc(r.x, r.y - r.size - 16, 10, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; txt('!', r.x, r.y - r.size - 15, 15, '#fff'); } } }
  if (G.ally) { const A = G.ally; if (A.falling) { drawLoose(A); drawKite(A, clamp(1.6 - A.fallT * 0.5, 0, 1)); } else if (!(A.inv > 0 && Math.floor(t * 10) % 2)) { drawKite(A); txt('DADA', A.x, A.y - A.size - 9, 9, '#bfe0ff', '#1a2a5a'); } }
  for (const k of (G.deadPlayers || [])) { drawLoose(k); drawKite(k, clamp(1.6 - k.fallT * 0.5, 0, 1)); }
  if (P.falling) { drawLoose(P); drawKite(P, clamp(1.6 - P.fallT * 0.5, 0, 1)); }
  else if (!(P.launchBlink && P.inv > 0 && Math.floor(t * 10) % 2)) { drawKite(P); if (P.tangle > 0) txt('🐦', P.x + 14, P.y - 14, 14, '#fff'); }
  if (G.pech) { const p = G.pech, rr2 = 13 + Math.sin(t * 40) * 4;
    ctx.drawImage(glowSprite('rgba(255,220,90,0.95)', 20), p.x - rr2 * 2.4, p.y - rr2 * 2.4, rr2 * 4.8, rr2 * 4.8);
    ctx.fillStyle = '#fffbe0'; ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, 6.283); ctx.fill(); }
  if (G.allyPech) { const ap = G.allyPech, f = ap.t / ap.max; ctx.drawImage(glowSprite('rgba(255,90,60,0.9)', 14), ap.x - 22, ap.y - 22, 44, 44);
    ctx.strokeStyle = '#ff4040'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(ap.x, ap.y, 16, -Math.PI / 2, -Math.PI / 2 + 6.283 * (1 - f)); ctx.stroke(); }
  for (const p of G.parts) { ctx.globalAlpha = clamp(p.life / (p.conf ? 1 : 0.4), 0, 1); ctx.fillStyle = p.c;
    if (p.conf) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.y * 0.05); ctx.fillRect(-p.s, -p.s * 0.4, p.s * 2, p.s * 0.8); ctx.restore(); }
    else if (p.star) ctx.fillRect(p.x - 1, p.y - 1, 2.2, 2.2);
    else { ctx.strokeStyle = p.c; ctx.lineWidth = p.s; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.045, p.y - p.vy * 0.045); ctx.stroke(); } }
  ctx.globalAlpha = 1;
  drawNight();
  for (const p of G.pops) { if (p.delay > 0) continue; const age = p.max - p.life, s = age < 0.12 ? 0.5 + age / 0.12 * 0.7 : 1.2 - Math.min(0.2, (age - 0.12)); ctx.globalAlpha = clamp(p.life / 0.3, 0, 1);
    ctx.save(); ctx.translate(p.x, p.y - age * 30); ctx.scale(s, s); if (p.font === 'fest') { ctx.rotate(-0.06); txt(p.text, 2, 3, p.size, '#3a2340', null, 'center', 900, 'fest'); } txt(p.text, 0, 0, p.size, p.fill, p.stroke, 'center', 900, p.font); ctx.restore(); }
  ctx.globalAlpha = 1;
  if (G.flash > 0) { ctx.fillStyle = 'rgba(' + (G.flashCol || '255,255,255') + ',' + (G.flash * 1.2) + ')'; ctx.fillRect(0, 0, W, H); if (G.flash <= 0.02) G.flashCol = null; }
  ctx.restore();
  if (G.mode !== 'demo') drawHUD();
}
function objLabel(){
  const o = LV.obj, tl = Math.ceil(G.timeLeft), mmss = ((tl / 60) | 0) + ':' + (tl % 60 < 10 ? '0' : '') + (tl % 60);
  switch (o) {
    case 'cut': case 'time': case 'nolose': return '✂ ' + Math.min(G.cuts, LV.goal) + '/' + LV.goal;
    case 'survive': return '⏳ SURVIVE';
    case 'protect': return '🛡 DADA ' + '♥'.repeat(Math.max(0, G.allyLives));
    case 'golden': return '🌟 ' + G.golden + '/' + LV.goal;
    case 'combo': return '⚡ ' + Math.min(G.bestCombo, LV.goal) + '/' + LV.goal;
    case 'lanterns': return '🏮 ' + G.lanterns + '/' + LV.goal;
    case 'score': return '🏆 ' + Math.min(G.score, LV.goal) + '/' + LV.goal;
    case 'boss': return '👑 ' + G.bossLeft + ' left';
  }
  return '';
}
function drawHUD(){
  ctx.setTransform(DPR * SC, 0, 0, DPR * SC, DPR * OX, 0);
  ctx.fillStyle = 'rgba(40,20,55,0.55)'; rrect(8, 10, 384, 44, 14); ctx.fill();
  txt(String(G.score), 62, 32, 21, '#ffe14d', null, 'left');
  const tl = Math.ceil(G.timeLeft), mm = (tl / 60) | 0, ss = tl % 60;
  const urgent = G.timeLeft < 15 && !(LV.obj === 'survive' || LV.obj === 'protect');
  txt(mm + ':' + (ss < 10 ? '0' : '') + ss, 200, 32, 22, urgent ? '#ff6b6b' : (LV.obj === 'survive' || LV.obj === 'protect') ? '#9dffb0' : '#ffffff');
  for (let i = 0; i < LV.lives; i++) { const x = 370 - i * 24, y = 32, on = i < G.lives; ctx.globalAlpha = on ? 1 : 0.25;
    ctx.fillStyle = G.skin.c1; ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x + 8, y); ctx.lineTo(x, y + 11); ctx.closePath(); ctx.fill();
    ctx.fillStyle = G.skin.c2; ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x - 8, y); ctx.lineTo(x, y + 11); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
  ctx.fillStyle = 'rgba(40,20,55,0.5)'; rrect(8, 60, 136, 30, 10); ctx.fill(); rrect(272, 60, 120, 30, 10); ctx.fill();
  txt(objLabel(), 76, 76, 15, '#fff');
  const wv = G.wind; txt('WIND', 300, 76, 12, '#ffe9c7', null, 'center', 800);
  ctx.save(); ctx.translate(350, 76); ctx.scale(Math.sign(wv) || 1, 1); const L = 12 + Math.abs(wv) * 14;
  ctx.strokeStyle = '#7fe0ff'; ctx.fillStyle = '#7fe0ff'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-L / 2, 0); ctx.lineTo(L / 2, 0); ctx.stroke(); ctx.beginPath(); ctx.moveTo(L / 2 + 6, 0); ctx.lineTo(L / 2 - 3, -7); ctx.lineTo(L / 2 - 3, 7); ctx.fill(); ctx.restore();
  if (G.combo > 1 && G.t - G.lastCut < LV.comboWin) { const f = 1 - (G.t - G.lastCut) / LV.comboWin; ctx.fillStyle = 'rgba(232,36,95,0.85)'; rrect(150, 62, 116 * f, 26, 9); ctx.fill(); txt('COMBO x' + G.combo, 208, 76, 14, '#fff'); }
  // boss bar
  if (LV.obj === 'boss' && !G.pech) { const tot = LV.boss.hp * (LV.boss.count || 1); txt(LV.boss.name, 200, 104, 13, '#ffe14d', '#3a2340');
    for (let i = 0; i < tot; i++) { const x = 200 + (i - (tot - 1) / 2) * 22, on = i < G.bossLeft; ctx.globalAlpha = on ? 1 : 0.25; ctx.fillStyle = LV.boss.cols[0]; ctx.beginPath(); ctx.moveTo(x, 112); ctx.lineTo(x + 7, 121); ctx.lineTo(x, 131); ctx.lineTo(x - 7, 121); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; } }
  // pech meter (prototype)
  const p = G.pech;
  if (p) {
    const y = 122, x0 = 40, w = 320, f = clamp((p.bar + 1) / 2, 0, 1);
    txt(p.sweet ? 'PULL NOW!' : 'PECH! SAW FAST ↔', 200, y - 16, p.sweet ? 24 : 20, p.sweet ? '#6dff8a' : '#fff', '#3a2340');
    ctx.fillStyle = 'rgba(40,20,55,0.75)'; rrect(x0 - 4, y - 4, w + 8, 26, 13); ctx.fill();
    ctx.fillStyle = p.r.led ? '#00e5ff' : p.r.c1; rrect(x0, y, w, 18, 9); ctx.fill();
    ctx.fillStyle = G.skin.c1; rrect(x0, y, Math.max(18, w * f), 18, 9); ctx.fill();
    if (p.sweet) { ctx.strokeStyle = '#6dff8a'; ctx.lineWidth = 3; rrect(x0 - 4, y - 4, w + 8, 26, 13); ctx.stroke(); }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x0 + w * f, y + 9, 12, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#ff2d6f'; ctx.beginPath(); ctx.arc(x0 + w * f, y + 9, 6, 0, 6.283); ctx.fill();
    txt('YOU', x0 + 4, y + 36, 12, '#ff2d6f', '#fff', 'left'); txt(p.r.boss ? p.r.name : 'RIVAL', x0 + w - 4, y + 36, 12, p.r.boss ? '#ffc21a' : '#3a2340', '#fff', 'right');
  }
  if (G.allyPech && !p) { txt('HELP DADA! Cut the attacker!', 200, 112, 17, '#ffb0a0', '#5a0a0a'); }
  if (G.banner) { const b = G.banner, a = clamp(b.life * 2, 0, 1); ctx.globalAlpha = a; const y = b.big ? H * 0.27 : 170;
    if (b.fest) { const s = 1 + 0.08 * Math.sin(G.t * 8); ctx.save(); ctx.translate(200, y); ctx.scale(s, s); ctx.rotate(-0.06); txt(b.text, 3, 4, 56, '#3a2340', null, 'center', 900, 'fest'); txt(b.text, 0, 0, 56, '#ffe14d', '#e8245f', 'center', 900, 'fest'); ctx.rotate(0.06); txt(b.sub, 0, 46, 18, '#ffffff', '#3a2340'); ctx.restore(); }
    else txt(b.text, 200, y, b.big ? 40 : 26, b.big ? '#ffc21a' : '#ffffff', '#3a2340');
    ctx.globalAlpha = 1; }
  // banter bubble
  if (G.say) { const s = G.say, a = clamp(Math.min(s.life, s.max - s.life) * 4, 0, 1), y = p ? 172 : 150; ctx.globalAlpha = a;
    ctx.font = '700 13px system-ui,sans-serif'; const words = s.text.split(' '); const lines = []; let line = '';
    for (const w2 of words) { const tst = line ? line + ' ' + w2 : w2; if (ctx.measureText(tst).width > 270) { lines.push(line); line = w2; } else line = tst; } lines.push(line);
    const bh = 24 + lines.length * 16; ctx.fillStyle = 'rgba(255,248,236,0.95)'; rrect(54, y, 330, bh, 14); ctx.fill();
    ctx.fillStyle = CHARS[s.who].col; ctx.beginPath(); ctx.arc(34, y + bh / 2, 24, 0, 6.283); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(34, y + bh / 2, 22, 0, 6.283); ctx.clip(); drawChar(ctx, s.who, {x: 34, y: y + bh / 2 + 50, s: 0.33, t: G.t, talk: s.life > s.max - 1.2}); ctx.restore();
    txt(CHARS[s.who].name.split(' (')[0].toUpperCase(), 66, y + 12, 10, '#e8245f', null, 'left', 900);
    lines.forEach((l, i) => txt(l, 66, y + 28 + i * 16, 13, '#3a2340', null, 'left', 700));
    ctx.globalAlpha = 1; }
  // hints
  if (G.mode === 'play' && G.dragDist < 160 && G.t < 12) {
    const a = 0.6 + 0.4 * Math.sin(G.t * 6); ctx.globalAlpha = a;
    const hx = 200 + Math.sin(G.t * 3) * 60, hy = H - 300;
    txt('👆', hx, hy, 40, '#fff'); txt('Drag anywhere to fly', 200, hy + 42, 20, '#fff', '#3a2340'); ctx.globalAlpha = 1;
  } else if (G.pech && G.pechCount <= 3 && LV.n <= 3) {
    const hx = 200 + Math.sin(G.t * 18) * 40; txt('👆', hx, H - 300, 40, '#fff'); txt('Drag back & forth FAST!', 200, H - 258, 20, '#fff', '#3a2340');
  } else if (G.mode === 'play' && G.pechCount === 0 && G.t > 4 && G.t < 20 && LV.n <= 2) {
    txt('Cross a rival kite\'s string!', 200, H - 290, 20, '#fff', '#3a2340');
  }
}
