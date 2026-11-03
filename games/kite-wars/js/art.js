// Kite Wars: Uttarayan — art: themes, skyline layers, characters, kites
'use strict';
const TAU = Math.PI * 2;
function srand(seed){ let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const THEMES = {
  morning: {sky: ['#62b2ff', '#a6d8ff', '#ffe3bd', '#ffc48e'], sun: {x: 318, y: 0.56, r: 36, col: '#fff4c8', halo: 'rgba(255,240,180,0.5)'},
    far: '#eab597', far2: '#d99c80', walls: ['#e8a87c', '#d9a5a0', '#9cc6c2', '#f2d388', '#c9a6d8', '#f0b8a0'], cloud: 'rgba(255,255,255,0.8)', haze: 'rgba(255,214,170,0.35)', kind: 'pol'},
  pol: {sky: ['#3d9cff', '#7fc8ff', '#cfeeff', '#ffeab8'], sun: {x: 300, y: 0.17, r: 30, col: '#fffbe6', halo: 'rgba(255,255,220,0.45)'},
    far: '#dcb39a', far2: '#c99a84', walls: ['#f2a65a', '#e07a5f', '#81b29a', '#f2cc8f', '#a8dadc', '#e5989b'], cloud: 'rgba(255,255,255,0.85)', haze: 'rgba(255,240,210,0.3)', kind: 'pol', khana: true},
  kankaria: {sky: ['#3a88dc', '#86c0ef', '#ffd38f', '#ff9a58'], sun: {x: 90, y: 0.42, r: 40, col: '#fff0b0', halo: 'rgba(255,200,120,0.5)'},
    far: '#d9926a', far2: '#bf7c5a', walls: ['#d98e5f', '#c97b63', '#a7b98a', '#e9c27d', '#b9a0c9', '#e3a37d'], cloud: 'rgba(255,245,230,0.85)', haze: 'rgba(255,190,120,0.35)', kind: 'old', lake: true},
  night: {sky: ['#060a22', '#111847', '#251f5e', '#3d2457'], moon: {x: 300, y: 0.16, r: 26},
    far: '#1a1840', far2: '#221d4c', walls: ['#3a3366', '#40305c', '#2f3d63', '#4a3a5e', '#35406a', '#4d3557'], cloud: 'rgba(120,120,190,0.25)', haze: 'rgba(80,60,140,0.25)', kind: 'pol', night: true},
  river: {sky: ['#3a2a70', '#b4427c', '#ff8457', '#ffc46b'], sun: {x: 200, y: 0.6, r: 46, col: '#ffe0a0', halo: 'rgba(255,150,90,0.55)'},
    far: '#8f4a6a', far2: '#a65a6c', walls: ['#c4706e', '#b5677f', '#8c7aa6', '#d98f6a', '#a3708e', '#cf8a7a'], cloud: 'rgba(255,190,170,0.75)', haze: 'rgba(255,140,110,0.3)', kind: 'river', river: true},
};
function chapterTheme(ch){ return ['morning', 'pol', 'kankaria', 'night', 'river'][ch - 1] || 'morning'; }

// ---------- generic helpers ----------
function rr(c, x, y, w, h, r){ c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function shade(hex, f){ // f<0 darker, f>0 lighter
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
  return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
}
function skyGrad(c, th, H){ const g = c.createLinearGradient(0, 0, 0, H); const s = th.sky; g.addColorStop(0, s[0]); g.addColorStop(0.42, s[1]); g.addColorStop(0.72, s[2]); g.addColorStop(1, s[3]); return g; }

// ---------- buildings ----------
function jharokha(c, x, y, w, h, col, night, rnd){
  // carved wooden bay window with arch
  c.fillStyle = shade(col, -0.35); c.fillRect(x - 2, y + h, w + 4, 4);
  c.fillStyle = night ? 'rgba(255,200,90,' + (rnd() < 0.65 ? 0.9 : 0.15) + ')' : 'rgba(60,35,40,0.55)';
  c.beginPath(); c.moveTo(x, y + h); c.lineTo(x, y + w * 0.5); c.arc(x + w / 2, y + w * 0.5, w / 2, Math.PI, 0); c.lineTo(x + w, y + h); c.closePath(); c.fill();
  c.strokeStyle = shade(col, -0.45); c.lineWidth = 1.2; c.stroke();
  c.beginPath(); c.moveTo(x + w / 2, y + 2); c.lineTo(x + w / 2, y + h); c.stroke();
  c.fillStyle = shade(col, -0.3); c.fillRect(x - 3, y - 4, w + 6, 4);
}
function house(c, x, base, w, h, col, night, rnd, opts){
  opts = opts || {};
  c.fillStyle = col; c.fillRect(x, base - h, w, h + 600);
  c.fillStyle = 'rgba(0,0,0,0.10)'; c.fillRect(x + w - 5, base - h, 5, h + 600);
  // parapet
  c.fillStyle = shade(col, -0.18); c.fillRect(x - 2, base - h - 6, w + 4, 7);
  if (rnd() < 0.5) { c.fillStyle = shade(col, 0.15); for (let i = x + 3; i < x + w - 4; i += 8) c.fillRect(i, base - h - 10, 4, 4); }
  // windows / jharokhas
  const ww = Math.max(9, Math.min(15, w / 3.2));
  for (let wy = base - h + 14; wy < base + 260; wy += 34) {
    for (let wx = x + 5; wx + ww < x + w - 3; wx += ww + 8) {
      if (rnd() < 0.3 && wy < base - h + 60) jharokha(c, wx, wy, ww, ww * 1.5, col, night, rnd);
      else { c.fillStyle = night ? (rnd() < 0.55 ? 'rgba(255,205,110,0.9)' : 'rgba(20,15,40,0.6)') : 'rgba(70,40,50,0.38)'; c.fillRect(wx, wy, ww * 0.8, ww * 1.2); }
    }
  }
  // roof props
  const r = rnd();
  if (r < 0.28) { c.fillStyle = night ? '#2a2a44' : '#3d3d4a'; c.fillRect(x + w * 0.6, base - h - 22, 14, 16); c.fillStyle = night ? '#383858' : '#55556a'; c.fillRect(x + w * 0.6 - 1, base - h - 24, 16, 3); }
  else if (r < 0.45 && !opts.noLine) { c.strokeStyle = 'rgba(80,60,60,0.6)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(x + 3, base - h - 16); c.quadraticCurveTo(x + w / 2, base - h - 8, x + w - 3, base - h - 16); c.stroke();
    const cl = ['#ff5d5d', '#ffd23f', '#5db8ff', '#ffffff', '#7ed957']; for (let i = 0; i < 4; i++) { c.fillStyle = cl[(rnd() * 5) | 0]; c.fillRect(x + 6 + i * (w - 12) / 4, base - h - 14, 5, 7); } }
  else if (r < 0.55) { c.fillStyle = shade(col, -0.25); c.beginPath(); c.moveTo(x + w * 0.2, base - h - 6); c.lineTo(x + w * 0.35, base - h - 20); c.lineTo(x + w * 0.5, base - h - 6); c.fill(); }
}
function dome(c, x, base, w, h, col){ c.fillStyle = col; c.fillRect(x, base - h, w, h + 600); c.beginPath(); c.ellipse(x + w / 2, base - h, w * 0.55, w * 0.62, 0, Math.PI, 0); c.fill(); c.fillRect(x + w / 2 - 1, base - h - w * 0.62 - 9, 2, 10); }
function minaret(c, x, base, h, col){ c.fillStyle = col; c.fillRect(x - 4, base - h, 8, h + 600); for (let y = base - h + 12; y < base - 10; y += 26) c.fillRect(x - 7, y, 14, 3); c.beginPath(); c.moveTo(x - 5, base - h); c.quadraticCurveTo(x, base - h - 18, x + 5, base - h); c.fill(); }
function shikhara(c, x, base, w, h, col){ c.fillStyle = col; c.beginPath(); c.moveTo(x, base); c.lineTo(x, base - h * 0.45); c.quadraticCurveTo(x + w * 0.1, base - h * 0.85, x + w / 2, base - h); c.quadraticCurveTo(x + w * 0.9, base - h * 0.85, x + w, base - h * 0.45); c.lineTo(x + w, base); c.fill();
  c.fillRect(x + w / 2 - 1, base - h - 12, 2, 12); c.fillStyle = '#ff7b2e'; c.beginPath(); c.moveTo(x + w / 2 + 1, base - h - 12); c.lineTo(x + w / 2 + 10, base - h - 9); c.lineTo(x + w / 2 + 1, base - h - 6); c.fill(); }
function khana(c, x, base, col){ // kabutar khana: pol bird-feeder tower
  c.fillStyle = col; c.fillRect(x - 3, base - 120, 6, 120); c.fillRect(x - 12, base - 128, 24, 9);
  c.beginPath(); c.moveTo(x - 16, base - 128); c.lineTo(x, base - 146); c.lineTo(x + 16, base - 128); c.fill();
  c.fillRect(x - 1, base - 156, 2, 10); c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x - 10, base - 126, 20, 4);
}
function bridge(c, base, col){ c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 3; c.fillRect(-10, base - 30, 420, 6);
  for (let i = 0; i < 4; i++) { const x0 = -20 + i * 120; c.beginPath(); c.moveTo(x0, base - 24); c.quadraticCurveTo(x0 + 60, base - 70, x0 + 120, base - 24); c.stroke(); for (let j = 1; j < 6; j++) { const xx = x0 + j * 20, yy = base - 24 - Math.sin(j / 6 * Math.PI) * 30; c.fillRect(xx - 0.7, yy, 1.4, base - 24 - yy); } } }

// Pre-render the static scene into layers for a theme at the current world size
function buildLayers(themeId, W, H, pxScale, roofs, playerRoof){
  const th = THEMES[themeId];
  const mk = () => { const cv = document.createElement('canvas'); cv.width = Math.ceil(W * pxScale); cv.height = Math.ceil(H * pxScale); const c = cv.getContext('2d'); c.setTransform(pxScale, 0, 0, pxScale, 0, 0); return [cv, c]; };
  const rnd = srand(themeId.length * 977 + 13);
  // sky
  const [skyCv, s] = mk(); s.fillStyle = skyGrad(s, th, H); s.fillRect(0, 0, W, H);
  if (th.night) { for (let i = 0; i < 120; i++) { s.fillStyle = 'rgba(255,255,255,' + (0.3 + rnd() * 0.7) + ')'; const r = rnd() * 1.3 + 0.3; s.beginPath(); s.arc(rnd() * W, rnd() * H * 0.6, r, 0, TAU); s.fill(); } }
  if (th.sun) { const sx = th.sun.x, sy = H * th.sun.y; const g = s.createRadialGradient(sx, sy, 0, sx, sy, th.sun.r * 3.2); g.addColorStop(0, th.sun.halo); g.addColorStop(1, 'rgba(255,255,255,0)'); s.fillStyle = g; s.fillRect(sx - 200, sy - 200, 400, 400); s.fillStyle = th.sun.col; s.beginPath(); s.arc(sx, sy, th.sun.r, 0, TAU); s.fill(); }
  if (th.moon) { const mx = th.moon.x, my = H * th.moon.y; const g = s.createRadialGradient(mx, my, 0, mx, my, 110); g.addColorStop(0, 'rgba(220,230,255,0.45)'); g.addColorStop(1, 'rgba(200,210,255,0)'); s.fillStyle = g; s.fillRect(mx - 120, my - 120, 240, 240); s.fillStyle = '#f4f1dc'; s.beginPath(); s.arc(mx, my, th.moon.r, 0, TAU); s.fill(); s.fillStyle = 'rgba(180,175,150,0.4)'; s.beginPath(); s.arc(mx - 8, my - 5, 6, 0, TAU); s.arc(mx + 7, my + 8, 4, 0, TAU); s.fill(); }
  // far skyline
  const [farCv, f] = mk(); const fb = H - 300;
  f.fillStyle = th.haze; f.fillRect(0, fb - 130, W, 140);
  let x = -10;
  while (x < W + 10) { const w = 16 + rnd() * 26, h = 30 + rnd() * 80; const k = rnd();
    if (th.kind === 'old' && k < 0.14) { minaret(f, x + w / 2, fb, h + 60, th.far); }
    else if (k < 0.12) dome(f, x, fb, w, h, th.far);
    else if (k < 0.18 && th.kind !== 'river') shikhara(f, x, fb, w, h + 40, th.far);
    else { f.fillStyle = th.far; f.fillRect(x, fb - h, w, h + 600); }
    x += w - 2; }
  if (th.kind === 'river') { // tall riverfront towers far
    for (let i = 0; i < 7; i++) { const tx = 20 + i * 58 + rnd() * 20, th2 = 90 + rnd() * 90; f.fillStyle = th.far2; f.fillRect(tx, fb - th2, 22, th2 + 600); f.fillStyle = 'rgba(255,220,180,0.25)'; for (let y = fb - th2 + 6; y < fb; y += 9) f.fillRect(tx + 3, y, 16, 3); } }
  // mid layer (houses) + water
  const [midCv, m] = mk(); const mb = H - 260;
  if (th.lake) { const lg = m.createLinearGradient(0, mb - 30, 0, mb + 10); lg.addColorStop(0, '#7fc3e6'); lg.addColorStop(1, '#4f95c4'); m.fillStyle = lg; m.fillRect(0, mb - 36, W, 60);
    m.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 20; i++) m.fillRect(rnd() * W, mb - 30 + rnd() * 26, 8 + rnd() * 14, 1.5);
    m.fillStyle = th.far2; m.beginPath(); m.ellipse(250, mb - 34, 30, 7, 0, 0, TAU); m.fill(); dome(m, 238, mb - 34, 24, 10, th.far2); }
  if (th.river) { const lg = m.createLinearGradient(0, mb - 70, 0, mb); lg.addColorStop(0, '#ffb07a'); lg.addColorStop(0.5, '#d9708a'); lg.addColorStop(1, '#6b4a8c'); m.fillStyle = lg; m.fillRect(0, mb - 75, W, 90);
    bridge(m, mb - 74, '#5a2f55');
    m.fillStyle = 'rgba(255,230,170,0.7)'; for (let i = 0; i < 26; i++) { const yy = mb - 66 + rnd() * 50; m.fillRect(200 - 30 - rnd() * 30 + rnd() * 60, yy, 10 + rnd() * 30, 1.6); }
    // promenade with crowd silhouettes
    m.fillStyle = '#4a2a4a'; m.fillRect(0, mb - 8, W, 600);
  }
  const houses = th.kind === 'river' ? 0 : 1;
  if (houses) { x = -14; let i = 0; while (x < W + 14) { const w = 34 + rnd() * 28, h = 40 + rnd() * 70; house(m, x, mb, w, h, th.walls[i++ % th.walls.length], th.night, rnd); x += w + (rnd() < 0.3 ? 4 : -1); } }
  if (th.khana) khana(m, 150, mb - 40, '#7a5a4a');
  // near roofs (rival terraces) + player terrace
  const [nearCv, n] = mk();
  for (const i of [1, 3, 0, 2]) { const R = roofs[i]; const bx = R.x - R.w / 2 - (R.side < 0 ? 40 : 0), bw = R.w + 40;
    house(n, bx, R.y + 6, bw, 6, th.walls[(i * 2 + 1) % th.walls.length], th.night, rnd, {noLine: true});
    // parapet with jaali dots
    n.fillStyle = shade(th.walls[(i * 2 + 1) % th.walls.length], -0.25); n.fillRect(bx - 3, R.y - 4, bw + 6, 10);
    n.fillStyle = 'rgba(255,255,255,0.25)'; for (let j = bx + 4; j < bx + bw - 4; j += 9) { n.beginPath(); n.arc(j, R.y + 1, 1.8, 0, TAU); n.fill(); }
  }
  // bunting between near roofs
  const bunt = (x1, y1, x2, y2) => { n.strokeStyle = 'rgba(60,40,40,0.55)'; n.lineWidth = 0.8; n.beginPath(); n.moveTo(x1, y1); n.quadraticCurveTo((x1 + x2) / 2, Math.max(y1, y2) + 26, x2, y2); n.stroke();
    const cl = ['#ff4f6d', '#ffd23f', '#2fd18b', '#3fa0ff', '#ff8a1f', '#b05cff']; for (let k = 1; k < 12; k++) { const t = k / 12, mt = 1 - t; const bx = mt * mt * x1 + 2 * mt * t * (x1 + x2) / 2 + t * t * x2, by = mt * mt * y1 + 2 * mt * t * (Math.max(y1, y2) + 26) + t * t * y2;
      n.fillStyle = cl[k % 6]; n.beginPath(); n.moveTo(bx - 3, by); n.lineTo(bx + 3, by); n.lineTo(bx, by + 7); n.fill(); } };
  bunt(roofs[1].x + 20, roofs[1].y - 20, roofs[3].x - 20, roofs[3].y - 20);
  // player terrace
  const py = playerRoof.y; const pc = th.night ? '#4a3560' : th.kind === 'river' ? '#7a4a5a' : '#8a4f62';
  n.fillStyle = pc; n.fillRect(70, py, 260, H);
  n.fillStyle = shade(pc, -0.25); n.fillRect(64, py - 14, 272, 16);
  n.fillStyle = shade(pc, 0.18); for (let j = 74; j < 330; j += 14) { n.beginPath(); n.arc(j, py - 6, 3.2, 0, TAU); n.fill(); }
  // water tank + tulsi pot + spare kites
  n.fillStyle = th.night ? '#2b2b45' : '#444457'; n.fillRect(282, py - 46, 30, 32); n.fillStyle = th.night ? '#38385a' : '#5a5a70'; n.fillRect(280, py - 49, 34, 4);
  n.fillStyle = '#b5532e'; n.fillRect(84, py - 30, 18, 16); n.fillStyle = '#2f8f3a'; for (let j = 0; j < 5; j++) { n.beginPath(); n.ellipse(93 + (j - 2) * 4, py - 34 - (j % 2) * 4, 3, 7, (j - 2) * 0.3, 0, TAU); n.fill(); }
  // spare kites leaning on the parapet
  [['#3fa0ff', '#ffffff', 120], ['#2fd18b', '#ffd23f', 250]].forEach(([a, b, xx]) => { n.save(); n.translate(xx, py - 22); n.rotate(-0.2); n.fillStyle = a; n.beginPath(); n.moveTo(0, -12); n.lineTo(10, 0); n.lineTo(0, 13); n.closePath(); n.fill(); n.fillStyle = b; n.beginPath(); n.moveTo(0, -12); n.lineTo(-10, 0); n.lineTo(0, 13); n.closePath(); n.fill(); n.restore(); });
  // emissive layer for night (windows glow, string lights)
  let emCv = null;
  if (th.night) { const [ec, e] = mk(); emCv = ec;
    const bulbs = (x1, y1, x2, y2, sag) => { for (let k = 0; k <= 16; k++) { const t = k / 16, bx = x1 + (x2 - x1) * t, by = y1 + (y2 - y1) * t + Math.sin(t * Math.PI) * sag; const col = ['#ffd75e', '#ff6b9a', '#6bf0ff', '#9dff6b'][k % 4];
      const g = e.createRadialGradient(bx, by, 0, bx, by, 6); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); e.fillStyle = g; e.fillRect(bx - 6, by - 6, 12, 12); } };
    bulbs(66, py - 16, 334, py - 16, 10);
    for (const R of roofs) bulbs(R.x - R.w / 2 - (R.side < 0 ? 40 : 0), R.y - 3, R.x + R.w / 2 + (R.side < 0 ? 0 : 40), R.y - 3, 6);
    // lit windows (copy approach: re-draw random warm rects)
    const r2 = srand(77);
    for (let i = 0; i < 70; i++) { const wx = r2() * W, wy = mb - 40 + r2() * 200; if (r2() < 0.5) continue; e.fillStyle = 'rgba(255,200,100,' + (0.35 + r2() * 0.4) + ')'; e.fillRect(wx, wy, 6, 8); }
  }
  return {sky: skyCv, far: farCv, mid: midCv, near: nearCv, em: emCv, th};
}

// ---------- kites ----------
const KITE_SPR = {};
function glowSprite(col, r){ const key = col + r; if (KITE_SPR[key]) return KITE_SPR[key]; const cv = document.createElement('canvas'); cv.width = cv.height = r * 4; const c = cv.getContext('2d');
  const g = c.createRadialGradient(r * 2, r * 2, 0, r * 2, r * 2, r * 2); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, r * 4, r * 4); KITE_SPR[key] = cv; return cv; }
function kiteBody(c, s, c1, c2, pat, t){
  c.fillStyle = c1; c.beginPath(); c.moveTo(0, -s); c.lineTo(s * 0.85, -s * 0.05); c.lineTo(0, s * 1.1); c.closePath(); c.fill();
  c.fillStyle = c2; c.beginPath(); c.moveTo(0, -s); c.lineTo(-s * 0.85, -s * 0.05); c.lineTo(0, s * 1.1); c.closePath(); c.fill();
  if (pat && pat !== 'split') { c.save(); c.beginPath(); c.moveTo(0, -s); c.lineTo(s * 0.85, -s * 0.05); c.lineTo(0, s * 1.1); c.lineTo(-s * 0.85, -s * 0.05); c.closePath(); c.clip();
    if (pat === 'peacock') { c.fillStyle = '#2fd18b'; c.beginPath(); c.ellipse(0, 0, s * 0.42, s * 0.55, 0, 0, TAU); c.fill(); c.fillStyle = '#1d4fd6'; c.beginPath(); c.ellipse(0, s * 0.05, s * 0.25, s * 0.33, 0, 0, TAU); c.fill(); c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(0, s * 0.05, s * 0.12, 0, TAU); c.fill(); }
    else if (pat === 'sun') { c.fillStyle = '#ffffff'; c.globalAlpha = 0.8; for (let i = 0; i < 8; i++) { c.save(); c.rotate(i * TAU / 8 + (t || 0) * 0.5); c.fillRect(-s * 0.04, -s * 0.9, s * 0.08, s * 0.9); c.restore(); } c.globalAlpha = 1; c.fillStyle = '#ff3d3d'; c.beginPath(); c.arc(0, 0, s * 0.28, 0, TAU); c.fill(); }
    else if (pat === 'lotus') { c.fillStyle = '#ff4fa0'; for (let i = -2; i <= 2; i++) { c.save(); c.translate(0, s * 0.35); c.rotate(i * 0.42); c.beginPath(); c.ellipse(0, -s * 0.35, s * 0.13, s * 0.38, 0, 0, TAU); c.fill(); c.restore(); } }
    else if (pat === 'stripe') { c.fillStyle = c2; for (let i = -4; i < 5; i++) { c.save(); c.translate(i * s * 0.32, 0); c.rotate(0.6); c.fillRect(-s * 0.06, -s * 1.5, s * 0.12, s * 3); c.restore(); } }
    else if (pat === 'galaxy') { c.fillStyle = 'rgba(255,120,220,0.6)'; c.beginPath(); c.ellipse(0, 0, s * 0.7, s * 0.25, 0.6, 0, TAU); c.fill(); c.fillStyle = '#fff'; for (let i = 0; i < 9; i++) { const a = i * 2.39, d = (i / 9) * s * 0.85; c.fillRect(Math.cos(a) * d, Math.sin(a) * d, 1.6, 1.6); } }
    else if (pat === 'gold') { const g = c.createLinearGradient(-s, -s, s, s); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5 + 0.4 * Math.sin((t || 0) * 2), 'rgba(255,255,255,0.75)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(-s, -s, s * 2, s * 2.2); c.strokeStyle = '#a86a00'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, s * 0.3, 0, TAU); c.stroke(); }
    else if (pat === 'golden') { const g = c.createLinearGradient(-s, -s, s, s); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5 + 0.45 * Math.sin((t || 0) * 3), 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(-s, -s, s * 2, s * 2.2); }
    c.restore(); }
  c.fillStyle = c1; c.globalAlpha *= 0.6; c.beginPath(); c.moveTo(0, s * 0.35); c.lineTo(s * 0.32, s * 0.68); c.lineTo(-s * 0.32, s * 0.68); c.closePath(); c.fill(); c.globalAlpha /= 0.6;
  c.strokeStyle = 'rgba(60,30,30,0.7)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, -s); c.lineTo(0, s * 1.1); c.moveTo(-s * 0.85, -s * 0.05); c.quadraticCurveTo(0, -s * 0.5, s * 0.85, -s * 0.05); c.stroke();
  c.fillStyle = c2; c.beginPath(); c.moveTo(0, s * 1.05); c.lineTo(s * 0.3, s * 1.45); c.lineTo(-s * 0.3, s * 1.45); c.closePath(); c.fill();
}
function drawKiteIcon(c, x, y, s, skin, t, rot){ c.save(); c.translate(x, y); c.rotate(rot || 0); kiteBody(c, s, skin.c1, skin.c2, skin.pat, t || 0);
  // ribbon tail
  c.strokeStyle = skin.c2; c.lineWidth = Math.max(1.5, s * 0.09); c.beginPath(); c.moveTo(0, s * 1.45); for (let i = 1; i <= 6; i++) c.lineTo(Math.sin((t || 0) * 4 + i) * s * 0.18, s * 1.45 + i * s * 0.28); c.stroke(); c.restore(); }

// ---------- small in-game people ----------
function drawPersonC(c, x, y, o){
  // o: {col, hair, flip, pull, cheer, hop, skin, kind}
  c.save(); c.translate(x, y - (o.hop || 0)); c.scale(o.flip || 1, 1);
  c.strokeStyle = '#3a2340'; c.lineWidth = 3; c.lineCap = 'round';
  c.fillStyle = o.col; if (o.kind === 'girl') { c.beginPath(); c.moveTo(-6, -26); c.lineTo(6, -26); c.lineTo(9, -6); c.lineTo(-9, -6); c.closePath(); c.fill(); } else c.fillRect(-6, -26, 12, 16);
  c.beginPath(); c.moveTo(-3, -10); c.lineTo(-5, 0); c.moveTo(3, -10); c.lineTo(5, 0); c.stroke();
  if (o.cheer) { c.beginPath(); c.moveTo(-4, -22); c.lineTo(-11, -36 - o.cheer * 3); c.moveTo(4, -22); c.lineTo(11, -36 - o.cheer * 3); c.stroke(); }
  else { c.beginPath(); c.moveTo(4, -22); c.lineTo(12 + (o.pull || 0), -32); c.stroke(); c.beginPath(); c.moveTo(-4, -22); c.lineTo(-8, -14); c.stroke(); }
  c.fillStyle = o.skin || '#8a5a3c'; c.beginPath(); c.arc(0, -32, 6, 0, TAU); c.fill();
  c.fillStyle = o.hair || '#2a1a1a';
  if (o.kind === 'old') { c.fillStyle = '#e8e8e8'; c.beginPath(); c.arc(0, -34, 6, Math.PI * 1.05, Math.PI * 1.95); c.fill(); c.fillRect(-4, -29, 8, 2); }
  else if (o.kind === 'turban') { c.fillStyle = '#b3122e'; c.beginPath(); c.ellipse(0, -36, 7.5, 5, 0, Math.PI, 0); c.fill(); c.fillStyle = '#ffcf3f'; c.fillRect(-7, -37, 14, 2); }
  else if (o.kind === 'girl') { c.beginPath(); c.arc(0, -34, 6.3, Math.PI, 0); c.fill(); c.fillRect(4, -34, 3, 10); }
  else { c.beginPath(); c.arc(0, -34, 6, Math.PI, 0); c.fill(); }
  c.restore();
}

// ---------- story portraits (bust, origin = bottom centre, ~210 tall at scale 1) ----------
const CHARS = {
  A: {name: 'Arjun', skin: '#c88a5c', shirt: '#ff8a1f', trim: '#ffd23f', hair: 'messy', hairCol: '#1d1414', age: 'kid', col: '#ff8a1f'},
  D: {name: 'Dada', skin: '#b97a52', shirt: '#f3ead7', trim: '#8a2a2a', hair: 'bald', hairCol: '#eeeeee', glasses: 'round', stache: '#f2f2f2', age: 'old', shawl: '#8a2a2a', col: '#e9d9b0'},
  M: {name: 'Mr. Malhotra', skin: '#d39b70', shirt: '#22305a', trim: '#c81d3a', hair: 'slick', hairCol: '#141414', glasses: 'shades', stache: '#1a1a1a', chain: true, tie: true, col: '#5a6fb0'},
  T: {name: 'Tiger Bunty', skin: '#a86b45', shirt: '#2f9e57', trim: '#1b1b1b', hair: 'bandana', hairCol: '#1b1b1b', band: '#ff8a1f', age: 'teen', grin: true, col: '#ff8a1f'},
  P: {name: 'Pinky Didi', skin: '#d9a17a', shirt: '#e0217e', trim: '#ffd23f', hair: 'pony', hairCol: '#1b1012', dupatta: '#ff7cc3', age: 'teen', girl: true, col: '#ff4fb4'},
  R: {name: 'Rohan', skin: '#e2ae86', shirt: '#151826', trim: '#00e5ff', hair: 'spiky', hairCol: '#2a2f55', phones: true, age: 'teen', col: '#00e5ff'},
  B: {name: 'Baadshah', skin: '#a6704a', shirt: '#d9a21a', trim: '#7a0f1f', hair: 'turban', hairCol: '#2a2222', turban: '#b3122e', beard: '#3b3434', stache: '#2c2626', stern: true, col: '#ffcf3f'},
  N: {name: 'Mic Bhai (Announcer)', skin: '#c08458', shirt: '#118a8a', trim: '#ffffff', hair: 'cap', hairCol: '#1c1c1c', capCol: '#ff4f4f', mic: true, grin: true, col: '#3fd0d0'},
};
function drawChar(c, id, o){
  const C = CHARS[id]; o = o || {}; const t = o.t || 0, talk = o.talk ? Math.abs(Math.sin(t * 16)) : 0, blink = (Math.sin(t * 1.3 + id.charCodeAt(0)) > 0.985);
  c.save(); c.translate(o.x || 0, (o.y || 0) + Math.sin(t * 2 + id.charCodeAt(0)) * 2); const S = (o.s || 1) * (C.age === 'kid' ? 0.92 : 1); c.scale(S * (o.flip ? -1 : 1), S);
  // shoulders / body
  c.fillStyle = C.shirt; c.beginPath(); c.moveTo(-78, 0); c.quadraticCurveTo(-74, -64, -30, -78); c.lineTo(30, -78); c.quadraticCurveTo(74, -64, 78, 0); c.closePath(); c.fill();
  c.fillStyle = C.trim; c.beginPath(); c.moveTo(-14, -78); c.lineTo(0, -52); c.lineTo(14, -78); c.lineTo(8, -78); c.lineTo(0, -62); c.lineTo(-8, -78); c.closePath(); c.fill();
  if (C.shawl) { c.fillStyle = C.shawl; c.beginPath(); c.moveTo(-78, 0); c.quadraticCurveTo(-70, -60, -28, -80); c.lineTo(-10, -70); c.quadraticCurveTo(-40, -40, -36, 0); c.closePath(); c.fill(); }
  if (C.dupatta) { c.fillStyle = C.dupatta; c.beginPath(); c.moveTo(78, 0); c.quadraticCurveTo(70, -60, 26, -82); c.lineTo(8, -72); c.quadraticCurveTo(40, -40, 34, 0); c.closePath(); c.fill(); }
  if (C.tie) { c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(-14, -78); c.lineTo(0, -50); c.lineTo(14, -78); c.closePath(); c.fill(); c.fillStyle = C.trim; c.beginPath(); c.moveTo(-5, -76); c.lineTo(5, -76); c.lineTo(7, -30); c.lineTo(0, -22); c.lineTo(-7, -30); c.closePath(); c.fill(); }
  if (C.chain) { c.strokeStyle = '#ffcf3f'; c.lineWidth = 3; c.beginPath(); c.arc(0, -84, 22, 0.35, Math.PI - 0.35); c.stroke(); }
  if (C.trim && id === 'R') { c.strokeStyle = C.trim; c.lineWidth = 3; c.beginPath(); c.moveTo(-60, -10); c.lineTo(-36, -70); c.moveTo(60, -10); c.lineTo(36, -70); c.stroke(); }
  // neck + head
  c.fillStyle = shade(C.skin, -0.12); c.fillRect(-12, -96, 24, 22);
  c.fillStyle = C.skin; c.beginPath(); c.ellipse(0, -132, 38, 44, 0, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(-37, -128, 6, 9, 0, 0, TAU); c.ellipse(37, -128, 6, 9, 0, 0, TAU); c.fill(); // ears
  // hair styles
  c.fillStyle = C.hairCol;
  if (C.hair === 'messy') { c.beginPath(); c.ellipse(0, -160, 40, 22, 0, Math.PI, 0); c.fill(); for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * 11 - 8, -164); c.lineTo(i * 11 + 4, -186 - (i % 2) * 6); c.lineTo(i * 11 + 10, -162); c.fill(); } c.beginPath(); c.moveTo(-38, -150); c.quadraticCurveTo(-20, -168, 8, -150); c.quadraticCurveTo(20, -170, 38, -148); c.lineTo(38, -164); c.lineTo(-38, -164); c.fill(); }
  else if (C.hair === 'bald') { c.beginPath(); c.ellipse(-30, -140, 10, 18, 0.3, 0, TAU); c.ellipse(30, -140, 10, 18, -0.3, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.ellipse(-8, -164, 14, 7, -0.3, 0, TAU); c.fill(); }
  else if (C.hair === 'slick') { c.beginPath(); c.ellipse(0, -160, 40, 24, 0, Math.PI * 0.95, Math.PI * 2.05); c.fill(); c.beginPath(); c.moveTo(-40, -150); c.quadraticCurveTo(0, -190, 40, -156); c.lineTo(40, -150); c.quadraticCurveTo(0, -170, -40, -150); c.fill(); }
  else if (C.hair === 'bandana') { c.beginPath(); c.ellipse(0, -158, 40, 22, 0, Math.PI, 0); c.fill(); c.fillStyle = C.band; c.fillRect(-40, -164, 80, 14); c.fillStyle = '#1b1b1b'; for (let i = -36; i < 40; i += 12) { c.beginPath(); c.moveTo(i, -164); c.lineTo(i + 6, -157); c.lineTo(i, -150); c.fill(); } c.fillStyle = C.band; c.beginPath(); c.moveTo(38, -160); c.lineTo(58, -150); c.lineTo(50, -144); c.closePath(); c.fill(); }
  else if (C.hair === 'pony') { c.beginPath(); c.ellipse(0, -158, 42, 28, 0, Math.PI, 0); c.fill(); c.beginPath(); c.moveTo(-42, -150); c.quadraticCurveTo(-46, -110, -36, -96); c.lineTo(-30, -130); c.fill(); c.beginPath(); c.moveTo(30, -176); c.quadraticCurveTo(76, -170, 64, -110); c.quadraticCurveTo(58, -140, 36, -160); c.fill(); c.fillStyle = C.trim; c.beginPath(); c.arc(22, -174, 6, 0, TAU); c.fill(); }
  else if (C.hair === 'spiky') { c.beginPath(); c.ellipse(0, -158, 40, 22, 0, Math.PI, 0); c.fill(); for (let i = -4; i <= 4; i++) { c.beginPath(); c.moveTo(i * 9 - 7, -166); c.lineTo(i * 9 + 6, -196 + Math.abs(i) * 4); c.lineTo(i * 9 + 9, -164); c.fill(); } c.fillStyle = '#4f7dff'; c.fillRect(-10, -190, 6, 18); }
  else if (C.hair === 'turban') { c.fillStyle = C.turban; c.beginPath(); c.ellipse(0, -164, 46, 30, 0, Math.PI * 0.95, Math.PI * 2.05); c.fill(); c.fillRect(-46, -168, 92, 18); c.strokeStyle = '#ffcf3f'; c.lineWidth = 3; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-44, -152 - i * 10); c.quadraticCurveTo(0, -170 - i * 12, 44, -154 - i * 9); c.stroke(); } c.fillStyle = '#ffcf3f'; c.beginPath(); c.arc(0, -172, 7, 0, TAU); c.fill(); c.fillStyle = '#2fd18b'; c.beginPath(); c.arc(0, -172, 3.5, 0, TAU); c.fill(); }
  else if (C.hair === 'cap') { c.beginPath(); c.ellipse(0, -158, 40, 20, 0, Math.PI, 0); c.fill(); c.fillStyle = C.capCol; c.beginPath(); c.ellipse(0, -164, 41, 24, 0, Math.PI, 0); c.fill(); c.fillRect(-4, -166, 66, 8); }
  if (C.beard) { c.fillStyle = C.beard; c.beginPath(); c.moveTo(-36, -128); c.quadraticCurveTo(-36, -84, 0, -78); c.quadraticCurveTo(36, -84, 36, -128); c.quadraticCurveTo(24, -104, 0, -104); c.quadraticCurveTo(-24, -104, -36, -128); c.fill(); }
  // eyes
  const ey = -136;
  if (C.glasses === 'shades') { c.fillStyle = '#111'; rr(c, -30, ey - 9, 26, 15, 5); c.fill(); rr(c, 4, ey - 9, 26, 15, 5); c.fill(); c.fillRect(-4, ey - 5, 8, 3); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(-26, ey - 6, 8, 3); c.fillRect(8, ey - 6, 8, 3); }
  else {
    if (blink) { c.strokeStyle = '#2a1a1a'; c.lineWidth = 3; c.beginPath(); c.moveTo(-22, ey); c.lineTo(-10, ey); c.moveTo(10, ey); c.lineTo(22, ey); c.stroke(); }
    else { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(-16, ey, 8, C.age === 'kid' ? 9 : 7, 0, 0, TAU); c.ellipse(16, ey, 8, C.age === 'kid' ? 9 : 7, 0, 0, TAU); c.fill(); c.fillStyle = '#2a1a1a'; c.beginPath(); c.arc(-15, ey + 1, 4.2, 0, TAU); c.arc(17, ey + 1, 4.2, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.fillRect(-14, ey - 2, 2, 2); c.fillRect(18, ey - 2, 2, 2); }
    if (C.glasses === 'round') { c.strokeStyle = '#3a2a1a'; c.lineWidth = 2.5; c.beginPath(); c.arc(-16, ey, 11, 0, TAU); c.moveTo(27, ey); c.arc(16, ey, 11, 0, TAU); c.moveTo(-5, ey); c.lineTo(5, ey); c.stroke(); }
  }
  // brows
  c.strokeStyle = C.hair === 'bald' ? '#dddddd' : '#1a1010'; c.lineWidth = 3.5; c.lineCap = 'round'; c.beginPath();
  if (C.stern) { c.moveTo(-26, ey - 16); c.lineTo(-8, ey - 11); c.moveTo(26, ey - 16); c.lineTo(8, ey - 11); } else { c.moveTo(-24, ey - 14); c.quadraticCurveTo(-16, ey - 19, -8, ey - 14); c.moveTo(8, ey - 14); c.quadraticCurveTo(16, ey - 19, 24, ey - 14); }
  c.stroke();
  // nose
  c.strokeStyle = shade(C.skin, -0.3); c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, ey + 4); c.quadraticCurveTo(5, ey + 16, -2, ey + 19); c.stroke();
  // mouth
  const my = -106;
  if (C.stache) { c.fillStyle = C.stache; c.beginPath(); c.moveTo(-20, my - 4); c.quadraticCurveTo(0, my - 14, 20, my - 4); c.quadraticCurveTo(10, my - 6, 0, my - 7); c.quadraticCurveTo(-10, my - 6, -20, my - 4); c.fill(); }
  c.fillStyle = '#6a1f24';
  if (talk > 0.15) { c.beginPath(); c.ellipse(0, my + 2, 9, 2 + talk * 7, 0, 0, TAU); c.fill(); }
  else if (C.grin) { c.beginPath(); c.moveTo(-14, my); c.quadraticCurveTo(0, my + 12, 14, my); c.closePath(); c.fill(); c.fillStyle = '#fff'; c.fillRect(-9, my, 18, 3); }
  else { c.strokeStyle = '#6a1f24'; c.lineWidth = 3; c.beginPath(); c.moveTo(-10, my + 1); c.quadraticCurveTo(0, my + (C.stern ? 2 : 7), 10, my + 1); c.stroke(); }
  if (C.phones) { c.strokeStyle = '#222'; c.lineWidth = 6; c.beginPath(); c.arc(0, -134, 44, Math.PI * 1.08, Math.PI * 1.92); c.stroke(); const gl = 0.6 + 0.4 * Math.sin(t * 5); c.fillStyle = 'rgba(0,229,255,' + gl + ')'; rr(c, -50, -142, 14, 26, 6); c.fill(); rr(c, 36, -142, 14, 26, 6); c.fill(); }
  if (C.mic) { c.fillStyle = '#333'; c.fillRect(30, -100, 8, 40); c.fillStyle = '#777'; c.beginPath(); c.arc(34, -104, 10, 0, TAU); c.fill(); }
  if (C.age === 'kid') { c.fillStyle = 'rgba(255,120,120,0.25)'; c.beginPath(); c.arc(-24, -118, 7, 0, TAU); c.arc(24, -118, 7, 0, TAU); c.fill(); }
  c.restore();
}
