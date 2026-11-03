// Village Fair — art: fair backdrops per night (static layer + live lights/wheel/crowd), characters
'use strict';
const CONF = ['#ff2d6f', '#ffd23f', '#2ec4ff', '#5bdc5b', '#ff8a1f', '#b05bff', '#ffffff'];
const THEMES = [
  {name: 'sunset', sky: ['#ff8f5a', '#ffc070', '#ffe7b3'], ground: ['#f6cf7e', '#e0a258'], sun: 1, stars: 0, dark: 0, lights: 0.55},
  {name: 'dusk', sky: ['#41307a', '#b3569a', '#ffb070'], ground: ['#d9a868', '#a8703f'], sun: 0, stars: 0.3, dark: 0.15, lights: 0.8},
  {name: 'golden', sky: ['#2a1d55', '#7d3f86', '#ff9a52'], ground: ['#c99252', '#8a5a30'], sun: 0, stars: 0.5, dark: 0.25, lights: 1},
  {name: 'night', sky: ['#0a0f2e', '#232661', '#4b3a7a'], ground: ['#5a4060', '#3a2840'], sun: 0, stars: 1, dark: 0.45, lights: 1, moon: 1},
  {name: 'champion', sky: ['#120a2a', '#3a1650', '#7a2a6a'], ground: ['#5a3050', '#341a34'], sun: 0, stars: 1, dark: 0.45, lights: 1, fireworks: 1},
];
function rrp(c, x, y, w, h, r){ c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function srand(seed){ let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// ---- Backdrop: one offscreen static canvas per (theme, size); live layer drawn every frame ----
const Backdrop = {
  cache: {}, theme: 0, lights: [], crowd: [], fw: [], fwT: 0,
  build(theme, W, H, DPR){
    const key = theme + ':' + W + 'x' + H + '@' + DPR;
    this.theme = theme; this.W = W; this.H = H;
    if (this.liveKey !== key) { this.layoutLive(theme, W, H); this.liveKey = key; }
    if (this.cache[key]) return this.cache[key];
    const T = THEMES[theme], cv = document.createElement('canvas'); cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    const b = cv.getContext('2d'); b.setTransform(DPR, 0, 0, DPR, 0, 0);
    const hz = H * 0.6, R = srand(7 + theme);
    let g = b.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, T.sky[0]); g.addColorStop(0.6, T.sky[1]); g.addColorStop(1, T.sky[2]);
    b.fillStyle = g; b.fillRect(0, 0, W, hz + 2);
    if (T.stars) { for (let i = 0; i < 70 * T.stars; i++) { b.fillStyle = 'rgba(255,255,255,' + (0.3 + R() * 0.6) + ')'; const s = R() < 0.1 ? 2 : 1.2; b.fillRect(R() * W, R() * hz * 0.7, s, s); } }
    if (T.sun) { const sg = b.createRadialGradient(W * 0.2, hz - 40, 5, W * 0.2, hz - 40, 120); sg.addColorStop(0, 'rgba(255,245,200,1)'); sg.addColorStop(0.25, 'rgba(255,220,140,.9)'); sg.addColorStop(1, 'rgba(255,200,120,0)'); b.fillStyle = sg; b.fillRect(0, hz - 170, W * 0.6, 170); }
    if (T.moon) { b.fillStyle = '#fff6d8'; b.beginPath(); b.arc(W * 0.18, H * 0.16, 22, 0, 7); b.fill(); b.fillStyle = T.sky[0]; b.beginPath(); b.arc(W * 0.18 + 9, H * 0.16 - 5, 19, 0, 7); b.fill(); }
    // far village: houses + trees silhouettes
    b.fillStyle = T.dark ? 'rgba(20,10,40,.55)' : 'rgba(150,80,60,.35)';
    for (let x = -10; x < W + 20; x += 30 + R() * 20) { const h = 18 + R() * 26; b.fillRect(x, hz - h, 24 + R() * 10, h); b.beginPath(); b.moveTo(x - 3, hz - h); b.lineTo(x + 15, hz - h - 12); b.lineTo(x + 33, hz - h); b.fill(); }
    b.fillStyle = T.dark ? 'rgba(15,25,30,.6)' : 'rgba(80,110,60,.45)';
    for (let x = 0; x < W + 20; x += 26) { b.beginPath(); b.arc(x, hz - 4, 16 + (x * 7 % 9), Math.PI, 0); b.fill(); }
    // stalls with striped awnings
    const tents = [[0.0, '#ff2d6f', '#fff'], [0.24, '#2e8bff', '#ffd23f'], [0.49, '#ff8a1f', '#fff'], [0.76, '#5bdc5b', '#fff']];
    tents.forEach(([fx, c1, c2], ti) => {
      const x = W * fx + 4, w = W * 0.22, top = hz - 72, bh = 40;
      b.fillStyle = T.dark ? '#3a2448' : '#fff2da'; b.fillRect(x + 4, top + 34, w - 8, bh + 4);
      b.fillStyle = 'rgba(255,200,90,' + (0.25 + T.dark) + ')'; b.fillRect(x + 8, top + 40, w - 16, bh - 6);
      for (let i = 0; i < 6; i++) { b.fillStyle = i % 2 ? c2 : c1; b.beginPath(); b.moveTo(x + i * w / 6, top + 32); b.lineTo(x + (i + 1) * w / 6, top + 32); b.lineTo(x + (i + 1) * w / 6, top + 44); b.arc(x + (i + 0.5) * w / 6, top + 44, w / 12, 0, Math.PI); b.closePath(); b.fill(); }
      b.fillStyle = c1; b.beginPath(); b.moveTo(x - 4, top + 34); b.lineTo(x + w / 2, top); b.lineTo(x + w + 4, top + 34); b.closePath(); b.fill();
      b.fillStyle = c2; b.beginPath(); b.moveTo(x + w / 2, top); b.lineTo(x + w / 2 + 12, top + 34); b.lineTo(x + w / 2 - 12, top + 34); b.fill();
      b.fillStyle = '#ffd23f'; b.beginPath(); b.moveTo(x + w / 2, top - 14); b.lineTo(x + w / 2 + 12, top - 9); b.lineTo(x + w / 2, top - 4); b.fill();
      b.strokeStyle = '#6b4a2a'; b.lineWidth = 2; b.beginPath(); b.moveTo(x + w / 2, top); b.lineTo(x + w / 2, top - 14); b.stroke();
    });
    // ground
    g = b.createLinearGradient(0, hz, 0, H); g.addColorStop(0, T.ground[0]); g.addColorStop(1, T.ground[1]);
    b.fillStyle = g; b.fillRect(0, hz, W, H - hz);
    b.fillStyle = 'rgba(255,255,255,.14)';
    for (let i = 0; i < 40; i++) b.fillRect((i * 97) % W, hz + 10 + (i * 53) % (H - hz), 14, 3);
    if (T.dark) { const lg = b.createRadialGradient(W / 2, hz + 30, 10, W / 2, hz + 30, W * 0.8); lg.addColorStop(0, 'rgba(255,190,90,.25)'); lg.addColorStop(1, 'rgba(255,190,90,0)'); b.fillStyle = lg; b.fillRect(0, hz - 60, W, H - hz + 60); }
    // bunting
    for (let row = 0; row < 2; row++) {
      const y0 = row ? H * 0.155 : H * 0.115, sag = 26;
      b.strokeStyle = 'rgba(80,50,30,.6)'; b.lineWidth = 1.5; b.beginPath();
      for (let x = 0; x <= W; x += 4) { const y = y0 + Math.sin(x / W * Math.PI) * sag; x ? b.lineTo(x, y) : b.moveTo(x, y); } b.stroke();
      for (let i = 0, x = 6 + row * 11; x < W; x += 22, i++) {
        const y = y0 + Math.sin(x / W * Math.PI) * sag; b.fillStyle = CONF[(i + row * 3) % 6];
        b.globalAlpha = T.dark ? 0.75 : 1; b.beginPath(); b.moveTo(x - 8, y); b.lineTo(x + 8, y); b.lineTo(x, y + 16); b.fill(); b.globalAlpha = 1;
      }
    }
    this.cache[key] = cv; return cv;
  },
  layoutLive(theme, W, H){
    const R = srand(99 + theme), hz = H * 0.6; this.lights = [];
    // string lights: two swags across the sky + outlines over stalls
    for (let k = 0; k < 2; k++) { const y0 = H * (0.2 + k * 0.05), sag = 34 + k * 10; for (let x = 8 + k * 9; x < W; x += 18) this.lights.push({x, y: y0 + Math.sin(x / W * Math.PI) * sag, c: CONF[(x / 18 | 0) % 6], ph: R() * 6}); }
    for (let i = 0; i < 4; i++) { const x0 = W * [0, 0.24, 0.49, 0.76][i] + 4, w = W * 0.22, top = hz - 72; for (let j = 0; j <= 6; j++) this.lights.push({x: x0 + j * w / 6, y: top + 33 + (j === 3 ? -33 : Math.abs(3 - j) * -11 + 0) * 0, c: '#ffe08a', ph: R() * 6, small: 1}); }
    this.crowd = []; for (let x = -6; x < W + 10; x += 15 + R() * 8) this.crowd.push({x, h: 26 + R() * 14, ph: R() * 6, c: R()});
    this.fw = []; this.fwT = 1;
  },
  wheelA: 0,
  drawLive(ctx, dt, t, opts){
    const T = THEMES[this.theme], W = this.W, H = this.H, hz = H * 0.6; opts = opts || {};
    // ferris wheel
    this.wheelA += dt * 0.22;
    const cx = W * 0.74, cy = H * 0.33, r = Math.min(W * 0.27, H * 0.15);
    ctx.strokeStyle = T.dark ? '#c48ad8' : '#8a5a8a'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(cx - r * 0.7, hz - 30); ctx.lineTo(cx, cy); ctx.lineTo(cx + r * 0.7, hz - 30); ctx.stroke();
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, r * 0.82, 0, 7); ctx.stroke();
    const n = 10;
    for (let i = 0; i < n; i++) {
      const a = this.wheelA + i * Math.PI * 2 / n, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = CONF[i % 6]; ctx.beginPath(); ctx.arc(x, y + 9, 7, 0, 7); ctx.fill(); ctx.fillRect(x - 7, y + 8, 14, 7);
      if (T.dark) { ctx.fillStyle = (Math.sin(t * 4 + i) > 0) ? '#fff6b0' : '#ffb84a'; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fill(); }
      else { ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 7); ctx.fill(); }
    }
    ctx.fillStyle = '#ff2d6f'; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, 7); ctx.fill();
    // twinkling string lights
    const L = T.lights;
    for (const l of this.lights) {
      const k = 0.55 + 0.45 * Math.sin(t * 3 + l.ph);
      if (T.dark) { ctx.fillStyle = l.c; ctx.globalAlpha = 0.18 * k * L; ctx.beginPath(); ctx.arc(l.x, l.y + 3, l.small ? 6 : 9, 0, 7); ctx.fill(); }
      ctx.globalAlpha = (0.5 + 0.5 * k) * Math.max(0.6, L); ctx.fillStyle = l.c; ctx.beginPath(); ctx.arc(l.x, l.y + 3, l.small ? 2.2 : 3.2, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // crowd silhouettes bobbing behind the play area
    if (!opts.noCrowd) {
      ctx.fillStyle = T.dark ? 'rgba(25,12,35,.85)' : 'rgba(90,45,60,.55)';
      for (const p of this.crowd) {
        const bob = Math.abs(Math.sin(t * 2.2 + p.ph)) * (opts.cheer ? 10 : 3), y = hz + 6 - bob;
        ctx.beginPath(); ctx.arc(p.x, y - p.h, 7, 0, 7); ctx.fill(); rrp(ctx, p.x - 9, y - p.h + 6, 18, p.h, 7); ctx.fill();
        if (opts.cheer && p.c > 0.5) { ctx.fillRect(p.x + 6, y - p.h - 8 - bob, 3, 14); }
      }
    }
    // fireworks
    if (T.fireworks || opts.fireworks) {
      this.fwT -= dt; if (this.fwT <= 0) { this.fwT = (opts.fireworks ? 0.35 : 1.6) + Math.random() * 1.2; this.fw.push({x: W * (0.1 + Math.random() * 0.8), y: H * (0.08 + Math.random() * 0.25), t: 0, c: CONF[(Math.random() * 6) | 0], n: 22}); if (opts.fireworks && window.SFX && Math.random() < 0.5) SFX.firework(); }
      for (const f of this.fw) {
        f.t += dt; const k = f.t / 1.4, rad = 10 + Math.pow(k, 0.5) * 70;
        ctx.globalAlpha = Math.max(0, 1 - k); ctx.fillStyle = f.c;
        for (let i = 0; i < f.n; i++) { const a = i / f.n * Math.PI * 2; ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * rad, f.y + Math.sin(a) * rad + k * k * 30, 2.4, 0, 7); ctx.fill(); }
      }
      ctx.globalAlpha = 1; this.fw = this.fw.filter(f => f.t < 1.4);
    }
  },
};

// ---- People (story portraits, banter faces, Meera everywhere) ----
const OUTFITS = {pink: ['#ff5aa5', '#ffd23f'], green: ['#2fbf5a', '#ffcf3f'], blue: ['#2e7bff', '#ffffff'], red: ['#e8243f', '#ffd23f'], purple: ['#7b3fd0', '#ffcf3f']};
function face(c, s, skin, t, talk, eyesOpts){
  c.fillStyle = skin; c.beginPath(); c.ellipse(0, 0, 40 * s, 46 * s, 0, 0, 7); c.fill();
  c.beginPath(); c.arc(-40 * s, 4 * s, 8 * s, 0, 7); c.arc(40 * s, 4 * s, 8 * s, 0, 7); c.fill();
  const blink = (t % 3.7) < 0.12;
  c.fillStyle = '#2a1a14';
  if (!eyesOpts || !eyesOpts.hide) {
    if (blink) { c.fillRect(-20 * s, -2 * s, 12 * s, 3 * s); c.fillRect(8 * s, -2 * s, 12 * s, 3 * s); }
    else { c.beginPath(); c.ellipse(-14 * s, -1 * s, 5 * s, 6.5 * s, 0, 0, 7); c.ellipse(14 * s, -1 * s, 5 * s, 6.5 * s, 0, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(-12.5 * s, -3 * s, 1.8 * s, 0, 7); c.arc(15.5 * s, -3 * s, 1.8 * s, 0, 7); c.fill(); }
  }
  c.fillStyle = 'rgba(255,90,90,.25)'; c.beginPath(); c.ellipse(-24 * s, 14 * s, 7 * s, 4 * s, 0, 0, 7); c.ellipse(24 * s, 14 * s, 7 * s, 4 * s, 0, 0, 7); c.fill();
  const open = talk ? Math.abs(Math.sin(t * 14)) : 0;
  c.fillStyle = '#7a2a2a'; c.beginPath(); c.ellipse(0, 22 * s, 9 * s, (2.5 + open * 6) * s, 0, 0, 7); c.fill();
  if (!talk) { c.strokeStyle = '#7a2a2a'; c.lineWidth = 2.5 * s; c.beginPath(); c.arc(0, 15 * s, 10 * s, 0.25, Math.PI - 0.25); c.stroke(); }
}
function drawHat(c, s, hat){
  if (!hat || hat === 'none') return;
  if (hat === 'flower') { for (let i = 0; i < 5; i++) { const a = i * 1.256; c.fillStyle = '#fff'; c.beginPath(); c.arc(28 * s + Math.cos(a) * 7 * s, -36 * s + Math.sin(a) * 7 * s, 5.5 * s, 0, 7); c.fill(); } c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(28 * s, -36 * s, 4.5 * s, 0, 7); c.fill(); }
  if (hat === 'sunhat') { c.fillStyle = '#f2d28a'; c.beginPath(); c.ellipse(0, -38 * s, 66 * s, 14 * s, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(0, -50 * s, 34 * s, 22 * s, 0, Math.PI, 0); c.fill(); c.fillStyle = '#ff2d6f'; c.fillRect(-34 * s, -48 * s, 68 * s, 8 * s); }
  if (hat === 'pagdi') { c.fillStyle = '#ff8a1f'; c.beginPath(); c.ellipse(0, -40 * s, 46 * s, 26 * s, 0, Math.PI * 0.95, Math.PI * 2.05); c.fill(); c.strokeStyle = '#ffd23f'; c.lineWidth = 4 * s; for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(0, (-34 - i * 8) * s, (44 - i * 6) * s, 9 * s, 0, Math.PI * 1.05, Math.PI * 1.95); c.stroke(); } c.fillStyle = '#e8243f'; c.beginPath(); c.arc(0, -58 * s, 6 * s, 0, 7); c.fill(); }
  if (hat === 'shades') { c.fillStyle = '#111'; c.beginPath(); for (const sx of [-15, 15]) { const x = sx * s, y = -2 * s; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = (i % 2 ? 6 : 14) * s; i ? c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); } c.fill(); c.fillRect(-4 * s, -4 * s, 8 * s, 3 * s); }
  if (hat === 'crown') { c.fillStyle = '#ffcf1a'; c.beginPath(); c.moveTo(-30 * s, -36 * s); c.lineTo(-34 * s, -70 * s); c.lineTo(-16 * s, -52 * s); c.lineTo(0, -76 * s); c.lineTo(16 * s, -52 * s); c.lineTo(34 * s, -70 * s); c.lineTo(30 * s, -36 * s); c.closePath(); c.fill(); c.strokeStyle = '#c98a00'; c.lineWidth = 2 * s; c.stroke(); c.fillStyle = '#e8243f'; c.beginPath(); c.arc(0, -46 * s, 5 * s, 0, 7); c.fill(); }
}
// who: M B K R T H L monkey ; draws a bust centred at (x,y) (y = face centre)
function drawChar(c, who, x, y, s, t, opts){
  opts = opts || {}; const talk = !!opts.talk;
  c.save(); c.translate(x, y + Math.sin(t * 2) * 1.5 * s);
  if (who === 'T') { c.save(); c.translate(-34 * s, 8 * s); drawKid(c, s * 0.82, t, talk, '#e8243f'); c.restore(); c.save(); c.translate(34 * s, 8 * s); drawKid(c, s * 0.82, t + 1.3, talk, '#2e7bff'); c.restore(); c.restore(); return; }
  if (who === 'monkey') { drawMonkey(c, s, t, opts); c.restore(); return; }
  const skin = {M: '#c98a5e', B: '#b97a52', K: '#c48a62', R: '#b8774e', H: '#c98a5e', L: '#a86a44'}[who] || '#c98a5e';
  // body
  const body = {M: (OUTFITS[opts.outfit] || OUTFITS.pink)[0], B: '#f4ead2', K: '#2e8bff', R: '#c8202f', H: '#fafafa', L: '#ff9a2a'}[who];
  c.fillStyle = body; c.beginPath(); c.moveTo(-62 * s, 120 * s); c.quadraticCurveTo(-58 * s, 52 * s, 0, 46 * s); c.quadraticCurveTo(58 * s, 52 * s, 62 * s, 120 * s); c.closePath(); c.fill();
  if (who === 'M') { c.fillStyle = (OUTFITS[opts.outfit] || OUTFITS.pink)[1]; c.fillRect(-60 * s, 100 * s, 120 * s, 6 * s); c.beginPath(); c.moveTo(-30 * s, 50 * s); c.lineTo(10 * s, 120 * s); c.lineTo(22 * s, 120 * s); c.lineTo(-18 * s, 48 * s); c.fill(); }
  if (who === 'B') { c.fillStyle = '#c8202f'; c.fillRect(-60 * s, 70 * s, 120 * s, 7 * s); c.fillStyle = '#f4ead2'; c.beginPath(); c.ellipse(0, -6 * s, 52 * s, 58 * s, 0, Math.PI * 0.9, Math.PI * 2.1); c.fill(); c.strokeStyle = '#c8202f'; c.lineWidth = 5 * s; c.beginPath(); c.ellipse(0, -6 * s, 52 * s, 58 * s, 0, Math.PI * 0.95, Math.PI * 2.05); c.stroke(); }
  if (who === 'R') { c.fillStyle = '#ffd23f'; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(0, (68 + i * 16) * s, 4 * s, 0, 7); c.fill(); } c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-14 * s, 46 * s); c.lineTo(0, 64 * s); c.lineTo(14 * s, 46 * s); c.fill(); }
  if (who === 'L') { c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(0, 86 * s, 12 * s, 0, 7); c.fill(); c.fillStyle = '#e8243f'; c.fillRect(-4 * s, 52 * s, 8 * s, 24 * s); }
  if (who === 'K') { c.fillStyle = '#fff'; c.font = '900 ' + (22 * s | 0) + 'px VFDeva, system-ui'; c.textAlign = 'center'; c.fillText('★', 0, 94 * s); }
  if (who === 'H') { c.fillStyle = '#ffb627'; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc((-30 + i * 15) * s, 100 * s, 7 * s, 0, 7); c.fill(); } c.fillStyle = '#c0c0c8'; c.fillRect(-44 * s, 106 * s, 88 * s, 6 * s); }
  // neck
  c.fillStyle = skin; c.fillRect(-11 * s, 34 * s, 22 * s, 16 * s);
  // hair back
  if (who === 'M') { c.fillStyle = '#2a1712'; c.beginPath(); c.ellipse(0, -8 * s, 46 * s, 50 * s, 0, 0, 7); c.fill();
    for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * 44 * s, 40 * s, 9 * s, 30 * s, sx * 0.15, 0, 7); c.fill(); c.fillStyle = '#ff2d6f'; c.beginPath(); c.arc(sx * 46 * s, 68 * s, 6 * s, 0, 7); c.fill(); c.fillStyle = '#2a1712'; } }
  if (who === 'B') { c.fillStyle = '#d8d4cc'; c.beginPath(); c.ellipse(0, -16 * s, 43 * s, 40 * s, 0, Math.PI, 0); c.fill(); }
  if (who === 'K') { c.fillStyle = '#1e1410'; c.beginPath(); c.ellipse(0, -18 * s, 44 * s, 36 * s, 0, Math.PI, 0); c.fill(); }
  face(c, s, skin, t, talk);
  // hair front / headwear
  if (who === 'M') { c.fillStyle = '#2a1712'; c.beginPath(); c.ellipse(-14 * s, -34 * s, 30 * s, 16 * s, 0.3, 0, 7); c.ellipse(16 * s, -36 * s, 28 * s, 14 * s, -0.3, 0, 7); c.fill(); c.fillStyle = '#e8243f'; c.beginPath(); c.arc(0, -16 * s, 3.2 * s, 0, 7); c.fill(); drawHat(c, s, opts.hat); }
  if (who === 'B') { c.strokeStyle = '#3a2a20'; c.lineWidth = 2.5 * s; c.beginPath(); c.arc(-14 * s, -1 * s, 10 * s, 0, 7); c.moveTo(24 * s, -1 * s); c.arc(14 * s, -1 * s, 10 * s, 0, 7); c.moveTo(-4 * s, -2 * s); c.lineTo(4 * s, -2 * s); c.stroke(); c.fillStyle = '#e8243f'; c.beginPath(); c.arc(0, -18 * s, 3.5 * s, 0, 7); c.fill(); }
  if (who === 'K') { c.fillStyle = '#ff2d6f'; c.beginPath(); c.ellipse(0, -34 * s, 42 * s, 20 * s, 0, Math.PI, 0); c.fill(); c.fillRect(20 * s, -36 * s, 34 * s, 7 * s); c.fillStyle = '#111'; rrp(c, -26 * s, -10 * s, 22 * s, 13 * s, 4 * s); c.fill(); rrp(c, 4 * s, -10 * s, 22 * s, 13 * s, 4 * s); c.fill(); c.fillRect(-4 * s, -7 * s, 8 * s, 3 * s); }
  if (who === 'R') { c.fillStyle = '#2a1712'; c.beginPath(); c.moveTo(0, 12 * s); c.bezierCurveTo(-14 * s, 4 * s, -30 * s, 20 * s, -34 * s, 8 * s); c.bezierCurveTo(-26 * s, 22 * s, -10 * s, 18 * s, 0, 16 * s); c.bezierCurveTo(10 * s, 18 * s, 26 * s, 22 * s, 34 * s, 8 * s); c.bezierCurveTo(30 * s, 20 * s, 14 * s, 4 * s, 0, 12 * s); c.fill();
    c.fillStyle = '#c8202f'; c.fillRect(-28 * s, -92 * s, 56 * s, 52 * s); c.fillStyle = '#1a1a1a'; c.beginPath(); c.ellipse(0, -40 * s, 46 * s, 9 * s, 0, 0, 7); c.fill(); c.fillStyle = '#ffd23f'; c.fillRect(-28 * s, -54 * s, 56 * s, 8 * s); }
  if (who === 'H') { c.fillStyle = '#2a1712'; c.beginPath(); c.ellipse(0, -44 * s, 10 * s, 6 * s, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(-12 * s, 8 * s, 10 * s, 4 * s, 0.2, 0, 7); c.ellipse(12 * s, 8 * s, 10 * s, 4 * s, -0.2, 0, 7); c.fill(); }
  if (who === 'L') { c.fillStyle = '#1e1410'; c.beginPath(); c.moveTo(0, 10 * s); c.bezierCurveTo(-24 * s, 0, -50 * s, 14 * s, -58 * s, -6 * s); c.bezierCurveTo(-50 * s, 26 * s, -20 * s, 22 * s, 0, 17 * s); c.bezierCurveTo(20 * s, 22 * s, 50 * s, 26 * s, 58 * s, -6 * s); c.bezierCurveTo(50 * s, 14 * s, 24 * s, 0, 0, 10 * s); c.fill();
    c.fillStyle = '#e8243f'; c.beginPath(); c.ellipse(0, -40 * s, 50 * s, 30 * s, 0, Math.PI * 0.95, Math.PI * 2.05); c.fill(); c.strokeStyle = '#ffd23f'; c.lineWidth = 4 * s; for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(0, (-34 - i * 9) * s, (48 - i * 7) * s, 10 * s, 0, Math.PI * 1.05, Math.PI * 1.95); c.stroke(); } c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(14 * s, -64 * s); c.lineTo(26 * s, -96 * s); c.lineTo(30 * s, -62 * s); c.fill(); }
  c.restore();
}
function drawKid(c, s, t, talk, cap){
  c.fillStyle = cap; c.beginPath(); c.moveTo(-50 * s, 120 * s); c.quadraticCurveTo(-46 * s, 52 * s, 0, 46 * s); c.quadraticCurveTo(46 * s, 52 * s, 50 * s, 120 * s); c.fill();
  c.fillStyle = '#c48a62'; c.fillRect(-10 * s, 34 * s, 20 * s, 14 * s);
  c.fillStyle = '#1e1410'; c.beginPath(); c.ellipse(0, -14 * s, 43 * s, 40 * s, 0, Math.PI, 0); c.fill();
  face(c, s, '#c48a62', t, talk);
  c.fillStyle = cap; c.beginPath(); c.ellipse(0, -30 * s, 42 * s, 22 * s, 0, Math.PI, 0); c.fill(); c.fillRect(-56 * s, -34 * s, 36 * s, 7 * s);
}
function drawMonkey(c, s, t, opts){
  c.fillStyle = '#7a4a2a'; c.beginPath(); c.moveTo(-50 * s, 110 * s); c.quadraticCurveTo(-46 * s, 50 * s, 0, 44 * s); c.quadraticCurveTo(46 * s, 50 * s, 50 * s, 110 * s); c.fill();
  c.beginPath(); c.arc(-40 * s, -6 * s, 16 * s, 0, 7); c.arc(40 * s, -6 * s, 16 * s, 0, 7); c.fill();
  c.fillStyle = '#e8b48a'; c.beginPath(); c.arc(-40 * s, -6 * s, 9 * s, 0, 7); c.arc(40 * s, -6 * s, 9 * s, 0, 7); c.fill();
  c.fillStyle = '#7a4a2a'; c.beginPath(); c.ellipse(0, 0, 36 * s, 40 * s, 0, 0, 7); c.fill();
  c.fillStyle = '#e8b48a'; c.beginPath(); c.ellipse(-12 * s, -4 * s, 14 * s, 16 * s, 0, 0, 7); c.ellipse(12 * s, -4 * s, 14 * s, 16 * s, 0, 0, 7); c.ellipse(0, 18 * s, 22 * s, 16 * s, 0, 0, 7); c.fill();
  c.fillStyle = '#2a1712'; c.beginPath(); c.arc(-11 * s, -4 * s, 4.5 * s, 0, 7); c.arc(11 * s, -4 * s, 4.5 * s, 0, 7); c.fill();
  c.strokeStyle = '#2a1712'; c.lineWidth = 2.5 * s; c.beginPath(); c.arc(0, 18 * s, 10 * s, 0.2, Math.PI - 0.2); c.stroke();
  if (opts.trophy) drawTrophy(c, 46 * s, 46 * s, s * 0.7, t);
}
function drawTrophy(c, x, y, s, t){
  c.save(); c.translate(x, y);
  c.fillStyle = '#d8dde6'; c.strokeStyle = '#8a93a3'; c.lineWidth = 2 * s;
  c.beginPath(); c.moveTo(-26 * s, -40 * s); c.lineTo(26 * s, -40 * s); c.quadraticCurveTo(24 * s, 0, 0, 6 * s); c.quadraticCurveTo(-24 * s, 0, -26 * s, -40 * s); c.fill(); c.stroke();
  c.beginPath(); c.arc(-28 * s, -26 * s, 10 * s, Math.PI * 0.5, Math.PI * 1.5); c.stroke(); c.beginPath(); c.arc(28 * s, -26 * s, 10 * s, -Math.PI * 0.5, Math.PI * 0.5); c.stroke();
  c.fillRect(-5 * s, 4 * s, 10 * s, 16 * s); c.fillStyle = '#7a4a2a'; c.fillRect(-20 * s, 20 * s, 40 * s, 12 * s);
  c.fillStyle = 'rgba(255,255,255,' + (0.5 + 0.5 * Math.sin(t * 5)) + ')'; c.beginPath(); c.arc(-10 * s, -28 * s, 4 * s, 0, 7); c.fill();
  c.restore();
}
