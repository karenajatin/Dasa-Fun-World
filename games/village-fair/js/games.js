// Village Fair — the 7 mini-games. Ring Toss, Balloon Pop and Sweet Catch are the approved prototype code (same
// controls, points and speed curves at d = 0); Target Shooting, Laddoo Tower, Bumper Cart Dash and Dhol Beat are new.
'use strict';
const MG = {};
const SP = () => 1 + 0.25 * D; // difficulty speed factor (1 at d = 0)

// ---------------- Ring Toss (prototype) ----------------
const BOTTLE = {green: {c: '#2fbf5a', pts: 25, cap: '#ffd23f'}, blue: {c: '#2e8bff', pts: 40, cap: '#ff2d6f'}, gold: {c: '#ffbf1a', pts: 100, cap: '#fff'}};
const RINGSKIN = {classic: ['#ff2d6f', '#ffd23f', '#2ec4ff', '#b05bff', '#ff8a1f'], rainbow: ['rainbow'], golden: ['#ffcf1a', '#ffe680', '#f0b000']};
MG.ring = {
  bottles: [], rings: [], ready: 0, handX: 0, beltY: 0, ringY: 0, beltOff: 0, speed: 0,
  init(){ const R = this; R.bottles = []; R.rings = []; R.beltY = H * 0.5; R.ringY = H * 0.83; R.handX = W / 2; R.ready = 0; R.beltOff = 0; R.lastT = null;
    for (let x = W - 30; x > -40; x -= rnd(125, 165)) R.bottles.push(this.newBottle(x)); },
  resize(){ this.beltY = H * 0.5; this.ringY = H * 0.83; },
  newBottle(x){ const r = Math.random(), g = 0.08 * (MODS.gold || 1); const type = r < g ? 'gold' : r < g + 0.24 ? 'blue' : 'green'; return {x, type, ringed: false, wob: 0}; },
  update(dt){
    const R = this, p = prog(); R.speed = lerp(85, 165, p) * (1 + 0.2 * D);
    R.beltOff = (R.beltOff + R.speed * dt) % 28;
    for (const b of R.bottles) { b.x += R.speed * dt; b.wob = Math.max(0, b.wob - dt * 3); }
    R.bottles = R.bottles.filter(b => b.x < W + 50);
    const minX = R.bottles.reduce((m, b) => Math.min(m, b.x), 1e9);
    if (minX > -40 + rnd(0, 10)) R.bottles.push(this.newBottle(minX - rnd(lerp(125, 115, p), lerp(170, 155, p))));
    R.ready -= dt;
    const win = 28 * (BOOST.luckyrings ? 1.15 : 1);
    for (const r of R.rings) {
      r.t += dt / r.dur;
      if (r.state === 'fly' && r.t >= 1) {
        let best = null, bd = 1e9;
        for (const b of R.bottles) { if (b.ringed) continue; const d = Math.abs(b.x - r.tx); if (d < bd) { bd = d; best = b; } }
        if (best && bd < win) {
          best.ringed = true; best.ringC = r.c; best.wob = 1; r.state = 'done';
          hit(); stat('ringHits');
          const label = best.type === 'gold' ? 'सोना!' : bd < 8 ? 'एकदम सही!' : 'शाबाश!';
          addScore(BOTTLE[best.type].pts + (bd < 8 ? 10 : 0), best.x, R.beltY - 110, label);
          SFX.ringer(RUN.combo); buzzv(18);
          confetti(best.x, R.beltY - 75, best.type === 'gold' ? 34 : 14, 0.7);
          if (best.type === 'gold') { SFX.gold(); flash('rgba(255,210,60,.35)'); shake(4, 0.15); Voice.shout('s_gold'); }
        } else {
          r.state = 'miss'; r.t = 0; r.dur = 0.5; r.vx = rnd(-120, 120); r.vy = -120; stat('ringMiss');
          if (best && bd < 46) { SFX.clink(); popup(r.tx, R.beltY - 110, 'बस ज़रा सा', '#ffe0e0', 20); best.wob = 0.6; } else { SFX.thud(); popup(r.tx, R.beltY - 110, 'चूक', '#ffe0e0', 20); }
          loseCombo();
        }
      }
      if (r.state === 'miss') { r.vy += 900 * dt; r.mx = (r.mx || r.tx) + r.vx * dt; r.my = (r.my || (R.beltY - 64)) + r.vy * dt; if (r.t > 1) r.state = 'done'; }
    }
    R.rings = R.rings.filter(r => r.state !== 'done');
  },
  throwRing(sx, dx, dy){
    const R = this; if (R.ready > 0) return;
    R.ready = 0.25; stat('ringThrows');
    const x0 = clamp(sx, 24, W - 24);
    const tx = clamp(x0 + (dx / Math.max(-dy, 20)) * (R.ringY - R.beltY) * 0.35, 10, W - 10);
    const sk = RINGSKIN[SAVE.ring] || RINGSKIN.classic;
    R.rings.push({x0, tx, t: 0, dur: 0.36, state: 'fly', c: pick(sk)});
    SFX.whoosh(); buzzv(6);
  },
  down(x, y){ this.handX = clamp(x, 24, W - 24); },
  move(f, dx, dy, x, y){
    if (!f.thrown) this.handX = clamp(f.sx + (x - f.sx) * 0.35, 24, W - 24);
    const ddy = y - f.sy;
    if (!f.thrown && ddy < -32) { f.thrown = true; this.throwRing(f.sx, x - f.sx, ddy); }
  },
  up(f, x, y){
    if (f.thrown) return; const ddy = y - f.sy;
    if (ddy < -20) this.throwRing(f.sx, x - f.sx, ddy);
    else if (performance.now() - f.t < 300 && Math.abs(ddy) < 15) popup(f.sx, f.sy - 40, 'ऊपर स्वाइप!', '#fff', 20, 0.6);
  },
  drawBottle(b){
    const by = this.beltY, d = BOTTLE[b.type], sw = Math.sin(performance.now() / 50) * b.wob * 0.15;
    ctx.save(); ctx.translate(b.x, by); ctx.rotate(sw); ctx.scale(1.3, 1.3);
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(0, 0, 18, 4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = d.c; rr(-15, -46, 30, 46, 8); ctx.fill(); ctx.fillRect(-6, -66, 12, 22);
    ctx.beginPath(); ctx.moveTo(-15, -38); ctx.quadraticCurveTo(-15, -48, -6, -54); ctx.lineTo(6, -54); ctx.quadraticCurveTo(15, -48, 15, -38); ctx.fill();
    ctx.fillStyle = d.cap; ctx.fillRect(-7, -71, 14, 7);
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(-10, -40, 5, 30);
    if (b.type === 'gold') { ctx.fillStyle = '#fff'; ctx.font = 'bold 16px VFDeva, system-ui'; ctx.textAlign = 'center'; ctx.fillText('★', 2, -18); const s = (performance.now() / 300) % 1; ctx.globalAlpha = 1 - s; ctx.fillText('✦', 14, -60 - s * 12); ctx.globalAlpha = 1; }
    else { ctx.fillStyle = '#fff8ec'; rr(-11, -32, 22, 14, 3); ctx.fill(); ctx.fillStyle = d.c; ctx.font = 'bold 10px VFDeva, system-ui'; ctx.textAlign = 'center'; ctx.fillText(d.pts, 0, -21.5); }
    if (b.ringed) this.drawRing(0, -48, 0.72, b.ringC, true);
    ctx.restore();
  },
  drawRing(x, y, s, c, flat){
    ctx.save(); ctx.translate(x, y);
    let col = c; if (c === 'rainbow') { const g = ctx.createLinearGradient(-26 * s, 0, 26 * s, 0); ['#ff2d6f', '#ff8a1f', '#ffd23f', '#5bdc5b', '#2ec4ff', '#b05bff'].forEach((k, i) => g.addColorStop(i / 5, k)); col = g; }
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 8 * s; ctx.beginPath(); ctx.ellipse(0, 2, 26 * s, (flat ? 7 : 10) * s, 0, 0, 7); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 7 * s; ctx.beginPath(); ctx.ellipse(0, 0, 26 * s, (flat ? 7 : 10) * s, 0, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.ellipse(0, -2 * s, 24 * s, (flat ? 5 : 8) * s, 0, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();
    ctx.restore();
  },
  draw(){
    const R = this, by = R.beltY;
    ctx.fillStyle = '#7a3fbf'; rr(8, by - 170, W - 16, 195, 16); ctx.fill();
    for (let i = 0; i < 9; i++) { ctx.fillStyle = i % 2 ? '#ff2d6f' : '#fff'; ctx.beginPath(); const w = (W - 16) / 9; ctx.moveTo(8 + i * w, by - 170); ctx.lineTo(8 + (i + 1) * w, by - 170); ctx.lineTo(8 + (i + 0.5) * w, by - 142); ctx.fill(); }
    for (let i = 0; i < 6; i++) { ctx.fillStyle = (Math.sin(TIME * 4 + i) > 0) ? 'rgba(255,240,160,.55)' : 'rgba(255,255,255,.15)'; ctx.beginPath(); ctx.arc(40 + i * (W - 80) / 5, by - 115, 9, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#3a2340'; ctx.fillRect(0, by - 2, W, 20);
    ctx.fillStyle = '#5a3a60'; for (let x = -28 + R.beltOff; x < W; x += 28) ctx.fillRect(x, by + 1, 14, 14);
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(0, by - 4, W, 4);
    ctx.fillStyle = '#b5652b'; ctx.fillRect(0, by + 18, W, 18); ctx.fillStyle = '#8a4a1f'; ctx.fillRect(0, by + 36, W, 6);
    for (const b of R.bottles) this.drawBottle(b);
    const hx = R.handX;
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.setLineDash([6, 10]); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(hx, R.ringY - 30); ctx.lineTo(hx, by + 50); ctx.stroke(); ctx.setLineDash([]);
    for (const r of R.rings) {
      if (r.state === 'fly') { const e = r.t, x = lerp(r.x0, r.tx, e), y = lerp(R.ringY, by - 64, e) - Math.sin(Math.PI * e) * 70, s = lerp(1.2, 0.9, e); this.drawRing(x, y, s, r.c, false); }
      else if (r.state === 'miss') { ctx.globalAlpha = clamp(1.2 - r.t, 0, 1); this.drawRing(r.mx, r.my, 0.9, r.c, false); ctx.globalAlpha = 1; }
    }
    const hc = (RINGSKIN[SAVE.ring] || RINGSKIN.classic)[0];
    ctx.globalAlpha = R.ready <= 0.05 ? 1 : 0.35; this.drawRing(hx, R.ringY, 1.15, hc, false); ctx.globalAlpha = 1;
    pill('ऊपर स्वाइप ↑ करके फेंको', H - 36);
  },
  state(){ return {beltY: this.beltY, ringY: this.ringY, speed: this.speed, ready: this.ready, bottles: this.bottles.map(b => ({x: b.x, type: b.type, ringed: b.ringed}))}; },
};

// ---------------- Balloon Pop (prototype) ----------------
MG.balloon = {
  list: [], spawn: 0, lastPop: -9,
  init(){ this.list = []; this.spawn = 0.1; this.lastPop = -9; },
  update(dt){
    const p = prog(); this.spawn -= dt;
    if (this.spawn <= 0 && RUN.mode === 'play') {
      this.spawn = lerp(0.42, 0.24, p) * rnd(0.7, 1.3) / (1 + 0.15 * D) * (MODS.frenzy ? 0.8 : 1);
      const r = Math.random(), bombP = lerp(0.16, 0.26, p) + 0.04 * D, gp = 0.045 * (MODS.gold || 1);
      const type = r < gp ? 'gold' : r < gp + bombP ? 'bomb' : 'n';
      const sp = rnd(170, 290) * lerp(1, 1.35, p) * (1 + 0.15 * D) * (type === 'gold' ? 1.35 : 1);
      this.list.push({x: rnd(40, W - 40), y: H + 50, vy: sp, ph: rnd(0, 6), amp: rnd(10, 30), r: type === 'gold' ? 28 : rnd(30, 36), type, c: type === 'bomb' ? '#1d1424' : type === 'gold' ? '#ffbf1a' : pick(['#ff2d6f', '#2e8bff', '#5bdc5b', '#ff8a1f', '#b05bff', '#ff5ac8'])});
    }
    if (RUN.combo > 0 && RUN.gameT - this.lastPop > 1.2 && RUN.mode === 'play') loseCombo('धीमे हो गए! कॉम्बो टूटा');
    for (const b of this.list) { b.y -= b.vy * dt; b.ph += dt * 2.5; b.dx = Math.sin(b.ph) * b.amp; }
    this.list = this.list.filter(b => b.y > -80 && !b.dead);
  },
  down(x, y){
    let best = null, bd = 1e9; const ex = BOOST.steady ? 1.12 : 1;
    for (const b of this.list) { const bx = b.x + (b.dx || 0), d = Math.hypot(bx - x, b.y - y); if (d < (b.r + 16) * ex && d < bd) { bd = d; best = b; } }
    if (!best) return;
    best.dead = true; const bx = best.x + (best.dx || 0);
    if (best.type === 'bomb') {
      stat('bombs'); SFX.boom(); buzzv([40, 30, 60]); shake(12, 0.35); flash('rgba(255,40,40,.35)', 0.2);
      shards(bx, best.y, 22, '#1d1424'); confetti(bx, best.y, 10, 0.6, ['#ff4040', '#ff8a1f', '#333']);
      bad(bx, best.y, 60, 'धमाका!');
    } else {
      stat('pops'); this.lastPop = RUN.gameT; hit(); SFX.pop(RUN.combo); buzzv(12); shards(bx, best.y, 12, best.c);
      if (best.type === 'gold') { addScore(60, bx, best.y - 30, 'सोना!'); SFX.gold(); confetti(bx, best.y, 40, 0.9); flash('rgba(255,210,60,.35)'); shake(4, 0.12); Voice.shout('s_gold'); }
      else addScore(8, bx, best.y - 30);
    }
  },
  draw(){
    for (const b of this.list) {
      const x = b.x + (b.dx || 0), y = b.y;
      ctx.strokeStyle = 'rgba(80,60,60,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y + b.r * 1.15);
      ctx.quadraticCurveTo(x + Math.sin(b.ph * 1.3) * 10, y + b.r * 1.15 + 25, x - Math.sin(b.ph) * 4, y + b.r * 1.15 + 50); ctx.stroke();
      ctx.fillStyle = b.c; ctx.beginPath(); ctx.ellipse(x, y, b.r * 0.88, b.r * 1.08, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x, y + b.r * 1.02); ctx.lineTo(x - 6, y + b.r * 1.2); ctx.lineTo(x + 6, y + b.r * 1.2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.beginPath(); ctx.ellipse(x - b.r * 0.35, y - b.r * 0.4, b.r * 0.18, b.r * 0.3, -0.5, 0, 7); ctx.fill();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (b.type === 'bomb') { ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y + 2, b.r * 0.55, 0, 7); ctx.stroke(); ctx.fillStyle = '#ff3b3b'; ctx.font = '900 ' + (b.r * 0.85 | 0) + 'px VFDeva, system-ui'; ctx.fillText('!', x, y + 3); }
      else if (b.type === 'gold') { ctx.fillStyle = '#fff'; ctx.font = '900 ' + (b.r * 0.8 | 0) + 'px VFDeva, system-ui'; ctx.fillText('★', x, y + 2); ctx.strokeStyle = 'rgba(255,240,150,' + (0.5 + 0.5 * Math.sin(b.ph * 4)) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, b.r + 6, b.r * 1.25, 0, 0, 7); ctx.stroke(); }
      ctx.textBaseline = 'alphabetic';
    }
    pill('टैप करके फोड़ो · काले वाले नहीं', H - 36);
  },
  state(){ return {list: this.list.map(b => ({x: b.x + (b.dx || 0), y: b.y, r: b.r, type: b.type, vy: b.vy}))}; },
};

// ---------------- Sweet Catch (prototype) ----------------
const SWEETS = ['jalebi', 'laddoo', 'barfi'];
const BASKETS = {wicker: ['#c47a35', '#9a5520', '#e09a50'], thali: ['#c9ced8', '#8e96a6', '#eef1f6'], goldbasket: ['#f0b52a', '#b88300', '#ffe17a']};
function drawSweet(it){
  ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.rot);
  if (it.type === 'jalebi') {
    ctx.strokeStyle = '#ff8a1f'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath();
    for (let a = 0; a < Math.PI * 5; a += 0.2) { const r2 = 2 + a * 1.1; const x = Math.cos(a) * r2, y = Math.sin(a) * r2; a ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    ctx.strokeStyle = 'rgba(255,230,120,.7)'; ctx.lineWidth = 2; ctx.stroke(); ctx.lineCap = 'butt';
  } else if (it.type === 'laddoo') {
    ctx.fillStyle = '#ffb627'; ctx.beginPath(); ctx.arc(0, 0, 17, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8901a'; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(Math.cos(i * 2.4) * 10 * ((i % 3) / 3 + .3), Math.sin(i * 2.4) * 10 * ((i % 3) / 3 + .3), 2.2, 0, 7); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(-6, -6, 5, 0, 7); ctx.fill();
  } else if (it.type === 'barfi') {
    ctx.fillStyle = '#d9f5c8'; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(18, 0); ctx.lineTo(0, 18); ctx.lineTo(-18, 0); ctx.fill();
    ctx.fillStyle = '#5bbf5b'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 7); ctx.fill(); ctx.strokeStyle = '#a6d98f'; ctx.lineWidth = 2; ctx.stroke();
  } else if (it.type === 'gold') {
    const g = ctx.createLinearGradient(-18, -18, 18, 18); g.addColorStop(0, '#fff3b0'); g.addColorStop(0.5, '#ffbf1a'); g.addColorStop(1, '#e08a00');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -21); ctx.lineTo(21, 0); ctx.lineTo(0, 21); ctx.lineTo(-21, 0); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.rotate(-it.rot); ctx.fillStyle = '#fff'; ctx.font = '900 14px VFDeva, system-ui'; ctx.textAlign = 'center'; ctx.fillText('★', 0, 5);
  } else {
    ctx.fillStyle = '#7d7d86'; ctx.beginPath(); ctx.moveTo(-18, -6); ctx.lineTo(-8, -18); ctx.lineTo(10, -16); ctx.lineTo(19, -2); ctx.lineTo(13, 15); ctx.lineTo(-6, 18); ctx.lineTo(-19, 8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#4d4d55'; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = '#a3a3ad'; ctx.beginPath(); ctx.arc(-5, -6, 4, 0, 7); ctx.fill();
  }
  ctx.restore();
}
MG.sweet = {
  items: [], spawn: 0, bx: 0, by: 0, bw: 96, squash: 0, pile: 0,
  init(){ this.items = []; this.spawn = 0.3; this.bx = W / 2; this.by = H * 0.85; this.bw = 96 * (BOOST.bigbasket ? 1.12 : 1); this.squash = 0; this.pile = 0; },
  resize(){ this.by = H * 0.85; this.bx = clamp(this.bx, this.bw / 2, W - this.bw / 2); },
  update(dt){
    const S = this, p = prog(); S.spawn -= dt;
    if (S.spawn <= 0) {
      S.spawn = lerp(0.5, 0.3, p) * rnd(0.75, 1.25) / (1 + 0.1 * D);
      const r = Math.random(), stoneP = lerp(0.2, 0.3, p) + 0.03 * D, gp = 0.06 * (MODS.gold || 1);
      const type = r < gp ? 'gold' : r < gp + stoneP ? 'stone' : pick(SWEETS);
      S.items.push({x: rnd(28, W - 28), y: 70, vy: rnd(200, 250) * lerp(1, 1.6, p) * (1 + 0.2 * D), rot: rnd(0, 6), vr: rnd(-3, 3), type, r: type === 'stone' ? 20 : 19});
    }
    S.squash = Math.max(0, S.squash - dt * 4);
    const top = S.by - 22;
    for (const it of S.items) {
      const py = it.y; it.y += it.vy * dt; it.rot += it.vr * dt;
      if (!it.done && py < top && it.y >= top) {
        if (Math.abs(it.x - S.bx) < S.bw / 2 + it.r * 0.4) {
          it.done = true; it.dead = true;
          if (it.type === 'stone') { stat('stones'); SFX.thud(); SFX.buzz(); buzzv([30, 20, 50]); shake(10, 0.3); flash('rgba(120,120,120,.35)', 0.2); shards(it.x, top, 10, '#8a8a8a'); bad(it.x, top - 30, 50, 'पत्थर!'); }
          else {
            stat('caught'); hit(); S.squash = 1; S.pile = Math.min(6, S.pile + 0.34); SFX.catch_(RUN.combo); buzzv(10);
            if (it.type === 'gold') { addScore(80, it.x, top - 40, 'काजू कतली!'); SFX.gold(); confetti(it.x, top, 36, 0.8); flash('rgba(255,210,60,.35)'); Voice.shout('s_gold'); }
            else { addScore(it.type === 'barfi' ? 30 : 20, it.x, top - 40); confetti(it.x, top, 6, 0.4); }
          }
        }
      }
      if (!it.dead && it.y > H + 30) { it.dead = true; if (it.type !== 'stone') { stat('missed'); loseCombo(); } }
    }
    S.items = S.items.filter(i => !i.dead);
  },
  move(f, dx){ this.bx = clamp(this.bx + dx * 1.3, this.bw / 2, W - this.bw / 2); },
  draw(){
    const S = this;
    for (let i = 0; i < 10; i++) { ctx.fillStyle = i % 2 ? '#ff8a1f' : '#fff4d6'; ctx.fillRect(i * W / 10, 50, W / 10 + 1, 20); ctx.beginPath(); ctx.arc(i * W / 10 + W / 20, 70, W / 20, 0, Math.PI); ctx.fill(); }
    for (const it of S.items) drawSweet(it);
    const x = S.bx, y = S.by, w = S.bw, sq = S.squash, K = BASKETS[SAVE.basket] || BASKETS.wicker;
    ctx.save(); ctx.translate(x, y); ctx.scale(1 + sq * 0.12, 1 - sq * 0.12);
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(0, 34, w * 0.5, 7, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = K[1]; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, -18, w * 0.38, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#ffb627'; for (let i = 0; i < Math.floor(S.pile); i++) { ctx.beginPath(); ctx.arc(-30 + (i % 4) * 20, -22 - Math.floor(i / 4) * 10, 10, 0, 7); ctx.fill(); }
    ctx.fillStyle = K[0]; ctx.beginPath(); ctx.moveTo(-w / 2, -22); ctx.lineTo(w / 2, -22); ctx.lineTo(w / 2 - 12, 30); ctx.lineTo(-w / 2 + 12, 30); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = K[1]; ctx.lineWidth = 2;
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-w / 2 + 3 * i, -22 + 13 * i); ctx.lineTo(w / 2 - 3 * i, -22 + 13 * i); ctx.stroke(); }
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * w / 7, -22); ctx.lineTo(i * (w - 24) / 7, 30); ctx.stroke(); }
    ctx.fillStyle = K[2]; rr(-w / 2 - 4, -28, w + 8, 10, 5); ctx.fill();
    ctx.restore();
    pill('दाएँ-बाएँ खिसकाओ · पत्थर से बचो', H - 29);
  },
  state(){ return {bx: this.bx, by: this.by, bw: this.bw, items: this.items.map(i => ({x: i.x, y: i.y, vy: i.vy, type: i.type}))}; },
};

// ---------------- Target Shooting (new) ----------------
MG.shoot = {
  ducks: [], boards: [], boardT: 0, shots: [], gunA: -Math.PI / 2, lastHit: -9, recoil: 0,
  rows(){ return [H * 0.27, H * 0.40, H * 0.53]; },
  init(){
    this.ducks = []; this.boards = []; this.boardT = 1.2; this.shots = []; this.lastHit = -9; this.recoil = 0; this.gunA = -Math.PI / 2;
    const rows = this.rows();
    for (let r = 0; r < 3; r++) { const gap = r === 0 ? 120 : 105; for (let x = 20 + r * 30; x < W + 40; x += gap) this.ducks.push(this.newDuck(r, x)); }
  },
  resize(){},
  newDuck(row, x){
    const r = Math.random(), bp = 0.11 * (MODS.bunny || 1);
    const type = r < 0.05 ? 'gold' : r < 0.05 + bp ? 'bunny' : 'duck';
    return {row, x, type, down: 0, s: row === 0 ? 0.8 : row === 1 ? 0.95 : 1.1};
  },
  speedOf(row){ const p = prog(); return [130, -100, 85][row] * lerp(1, 1.35, p) * (1 + 0.3 * D); },
  update(dt){
    const rows = this.rows(), p = prog();
    for (const d of this.ducks) {
      d.x += this.speedOf(d.row) * dt;
      if (d.down > 0) d.down += dt * 3;
      const v = this.speedOf(d.row);
      if (v > 0 && d.x > W + 40) Object.assign(d, this.newDuck(d.row, d.x - (W + 80)));
      if (v < 0 && d.x < -40) Object.assign(d, this.newDuck(d.row, d.x + (W + 80)));
      if (d.down > 1 && d.type !== 'gone') d.type = 'gone';
    }
    // pop-up bullseye boards
    this.boardT -= dt;
    if (this.boardT <= 0) {
      this.boardT = lerp(1.6, 1.0, p) / (MODS.boards || 1) * rnd(0.7, 1.3) / (MODS.frenzy ? 1.3 : 1);
      const row = (Math.random() * 3) | 0;
      this.boards.push({x: rnd(50, W - 50), y: rows[row] - 8, t: 0, life: lerp(1.6, 1.15, p) / (1 + 0.25 * D), hit: false});
    }
    for (const b of this.boards) b.t += dt;
    this.boards = this.boards.filter(b => b.t < b.life + 0.25);
    for (const s of this.shots) s.t += dt;
    this.shots = this.shots.filter(s => s.t < 0.25);
    this.recoil = Math.max(0, this.recoil - dt * 6);
    if (RUN.combo > 0 && RUN.gameT - this.lastHit > 1.6) loseCombo('धीमे हो गए! कॉम्बो टूटा');
  },
  down(x, y){
    const rows = this.rows(), ex = BOOST.steady ? 1.12 : 1;
    this.gunA = Math.atan2(y - (H - 70), x - W / 2); this.recoil = 1; SFX.shot(); buzzv(8);
    this.shots.push({x, y, t: 0});
    let best = null, bd = 1e9, kind = null;
    for (const b of this.boards) { if (b.hit || b.t > b.life) continue; const up = this.boardUp(b); if (up < 0.5) continue; const d = Math.hypot(b.x - x, b.y - y); if (d < 34 * ex && d < bd) { bd = d; best = b; kind = 'board'; } }
    for (const d of this.ducks) { if (d.down > 0 || d.type === 'gone') continue; const dy = rows[d.row] - 14 * d.s; const dist = Math.hypot(d.x - x, dy - y); if (dist < (30 * d.s + 10) * ex && dist < bd) { bd = dist; best = d; kind = 'duck'; } }
    if (!best) { stat('shotMiss'); popup(x, y - 20, 'चूक', '#ffe0e0', 18, 0.5); return; }
    if (kind === 'board') {
      best.hit = true; best.t = Math.max(best.t, best.life); hit(); this.lastHit = RUN.gameT; stat('boards');
      const center = bd < 11; addScore(25 + (center ? 10 : 0), best.x, best.y - 44, center ? 'बीचों-बीच!' : 'निशाना!');
      SFX.clang(RUN.combo); confetti(best.x, best.y, center ? 26 : 12, 0.7); if (center) { flash('rgba(255,210,60,.3)'); shake(3, 0.12); }
      return;
    }
    const d = best; d.down = 0.01;
    if (d.type === 'bunny') { stat('bunnies'); SFX.squeak(); SFX.buzz(); buzzv([30, 20, 50]); shake(8, 0.25); flash('rgba(255,120,160,.3)', 0.2); bad(d.x, rows[d.row] - 50, 30, 'खरगोश नहीं!'); return; }
    hit(); this.lastHit = RUN.gameT; stat('ducks'); SFX.clang(RUN.combo);
    if (d.type === 'gold') { addScore(60, d.x, rows[d.row] - 50, 'सुनहरी बत्तख!'); SFX.gold(); confetti(d.x, rows[d.row] - 20, 34, 0.8); flash('rgba(255,210,60,.35)'); Voice.shout('s_gold'); }
    else { addScore(d.row === 0 ? 12 : 8, d.x, rows[d.row] - 50); shards(d.x, rows[d.row] - 16, 6, '#ffd23f'); }
  },
  boardUp(b){ return b.t < 0.15 ? b.t / 0.15 : b.t > b.life ? Math.max(0, 1 - (b.t - b.life) / 0.2) : 1; },
  drawDuck(d, y){
    if (d.type === 'gone') return;
    const fall = clamp(d.down, 0, 1);
    ctx.save(); ctx.translate(d.x, y); ctx.scale(d.s * (this.speedOf(d.row) < 0 ? -1 : 1), d.s * Math.cos(fall * Math.PI / 2));
    if (d.type === 'bunny') {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, -14, 20, 16, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-7, -42, 5, 16, -0.15, 0, 7); ctx.ellipse(7, -42, 5, 16, 0.15, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffb3c8'; ctx.beginPath(); ctx.ellipse(-7, -42, 2.5, 11, -0.15, 0, 7); ctx.ellipse(7, -42, 2.5, 11, 0.15, 0, 7); ctx.fill();
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(-6, -18, 2.5, 0, 7); ctx.arc(6, -18, 2.5, 0, 7); ctx.fill(); ctx.fillStyle = '#ff7aa0'; ctx.beginPath(); ctx.arc(0, -12, 2.5, 0, 7); ctx.fill();
      ctx.strokeStyle = '#ff3b6b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -20, 30, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-21, 1); ctx.lineTo(21, -41); ctx.stroke();
    } else {
      const c = d.type === 'gold' ? '#ffcf1a' : ['#ffdf3a', '#ff8a1f', '#2ec4ff'][d.row];
      ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(0, -12, 22, 13, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(14, -28, 10, 0, 7); ctx.fill();
      ctx.fillStyle = '#ff6a1f'; ctx.beginPath(); ctx.moveTo(22, -29); ctx.lineTo(32, -25); ctx.lineTo(22, -23); ctx.fill();
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(16, -30, 2, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.beginPath(); ctx.ellipse(-4, -10, 11, 6, 0.3, 0, 7); ctx.fill();
      if (d.type === 'gold') { ctx.fillStyle = '#fff'; ctx.font = '900 13px VFDeva, system-ui'; ctx.textAlign = 'center'; ctx.fillText('★', -2, -7); }
      else if (d.row === 0) { ctx.fillStyle = '#fff'; ctx.font = '900 10px VFDeva, system-ui'; ctx.textAlign = 'center'; ctx.fillText('12', -3, -8); }
    }
    ctx.restore();
  },
  draw(){
    const rows = this.rows();
    // booth
    ctx.fillStyle = '#23417a'; rr(6, H * 0.17, W - 12, H * 0.43, 14); ctx.fill();
    for (let i = 0; i < 10; i++) { ctx.fillStyle = i % 2 ? '#ffd23f' : '#e8243f'; const w = (W - 12) / 10; ctx.beginPath(); ctx.moveTo(6 + i * w, H * 0.17); ctx.lineTo(6 + (i + 1) * w, H * 0.17); ctx.lineTo(6 + (i + 1) * w, H * 0.17 + 14); ctx.arc(6 + (i + 0.5) * w, H * 0.17 + 14, w / 2, 0, Math.PI); ctx.fill(); }
    for (let i = 0; i < 7; i++) { ctx.fillStyle = (Math.sin(TIME * 5 + i * 1.7) > 0.2) ? '#fff6b0' : 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(24 + i * (W - 48) / 6, H * 0.17 + 34, 4, 0, 7); ctx.fill(); }
    for (let r = 0; r < 3; r++) { ctx.fillStyle = '#5a3a20'; ctx.fillRect(10, rows[r] + 1, W - 20, 7); ctx.fillStyle = '#8a5a30'; ctx.fillRect(10, rows[r] - 1, W - 20, 3); }
    for (const b of this.boards) {
      const up = this.boardUp(b); if (up <= 0) continue;
      ctx.save(); ctx.translate(b.x, b.y + 8); ctx.scale(1, up); ctx.translate(0, -30);
      ctx.fillStyle = '#5a3a20'; ctx.fillRect(-3, 0, 6, 30);
      const cols = ['#fff', '#e8243f', '#fff', '#e8243f', '#ffd23f'];
      for (let i = 0; i < 5; i++) { ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.arc(0, -8, 30 - i * 6, 0, 7); ctx.fill(); }
      ctx.strokeStyle = '#3a2340'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -8, 30, 0, 7); ctx.stroke();
      if (b.hit) { ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(0, -8, 4, 0, 7); ctx.fill(); }
      ctx.restore();
      if (!b.hit && b.t < b.life) { const k = 1 - b.t / b.life; ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(b.x, b.y - 30, 36, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.stroke(); }
    }
    for (const d of this.ducks) this.drawDuck(d, rows[d.row]);
    // counter + toy gun
    ctx.fillStyle = '#b5652b'; ctx.fillRect(0, H * 0.6, W, 22); ctx.fillStyle = '#8a4a1f'; ctx.fillRect(0, H * 0.6 + 22, W, 6);
    for (const s of this.shots) {
      const k = s.t / 0.25; ctx.strokeStyle = 'rgba(255,255,255,' + (1 - k) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s.x, s.y, 8 + k * 20, 0, 7); ctx.stroke();
      if (k < 0.4) { ctx.strokeStyle = 'rgba(255,240,180,' + (0.8 - k * 2) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(this.gunA) * 70, H - 70 + Math.sin(this.gunA) * 70); ctx.lineTo(s.x, s.y); ctx.stroke(); }
    }
    ctx.save(); ctx.translate(W / 2, H - 70); ctx.rotate(this.gunA + Math.PI / 2); ctx.translate(0, this.recoil * 10);
    ctx.fillStyle = '#7a4a2a'; rr(-16, -10, 32, 60, 10); ctx.fill();
    ctx.fillStyle = '#3a3f4a'; rr(-7, -70, 14, 66, 5); ctx.fill(); ctx.fillStyle = '#ffd23f'; ctx.fillRect(-8, -74, 16, 8);
    if (this.recoil > 0.6) { ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(0, -82, 12 * this.recoil, 0, 7); ctx.fill(); }
    ctx.restore();
    pill('बत्तख और निशाने पर टैप · खरगोश नहीं', H - 14);
  },
  state(){ const rows = this.rows(); return {ducks: this.ducks.filter(d => d.type !== 'gone' && d.down === 0).map(d => ({x: d.x, y: rows[d.row] - 14 * d.s, vx: this.speedOf(d.row), type: d.type, row: d.row})), boards: this.boards.filter(b => !b.hit && b.t < b.life && b.t > 0.1).map(b => ({x: b.x, y: b.y - 38, left: b.life - b.t}))}; },
};

// ---------------- Laddoo Tower (new) ----------------
const BOXC = [['#ff5aa5', '#ffd23f'], ['#ff8a1f', '#fff4d6'], ['#2fbf5a', '#ffd23f'], ['#7b3fd0', '#ffcf3f'], ['#2e8bff', '#fff']];
MG.stack = {
  tower: [], cur: null, falling: null, debris: [], camY: 0, baseY: 0, bh: 30, maxW: 190, towers: 0, nextIn: 0, perfectRun: 0,
  init(){ this.baseY = H * 0.82; this.debris = []; this.towers = 0; this.newTower(); },
  resize(){},
  newTower(){
    this.tower = [{x: W / 2 - this.maxW / 2, w: this.maxW, c: 0}]; this.camY = 0; this.falling = null; this.perfectRun = 0; this.spawnCur();
  },
  topY(){ return this.baseY - this.tower.length * this.bh; },
  spawnCur(){
    const top = this.tower[this.tower.length - 1], dir = Math.random() < 0.5 ? 1 : -1;
    this.cur = {x: dir > 0 ? -top.w * 0.3 : W - top.w * 0.7, w: top.w, dir, c: this.tower.length % BOXC.length};
    this.nextIn = 0;
  },
  speed(){ const p = prog(); return lerp(150, 235, p) * (1 + 0.3 * D) * (1 + Math.min(0.25, this.tower.length * 0.012)); },
  update(dt){
    // camera follows the tower top to about 45% of the screen
    const want = Math.max(0, (H * 0.52) - (this.topY() - this.camY) > 0 ? 0 : 0);
    const targetCam = Math.min(0, this.topY() - H * 0.5);
    this.camY = lerp(this.camY, targetCam, Math.min(1, dt * 6));
    if (this.cur) {
      this.cur.x += this.cur.dir * this.speed() * dt;
      if (this.cur.x + this.cur.w > W - 6) { this.cur.x = W - 6 - this.cur.w; this.cur.dir = -1; }
      if (this.cur.x < 6) { this.cur.x = 6; this.cur.dir = 1; }
    } else if (!this.falling) { this.nextIn -= dt; if (this.nextIn <= 0) this.spawnCur(); }
    if (this.falling) {
      const f = this.falling; f.vy += 2600 * dt; f.y += f.vy * dt;
      if (f.y >= this.topY() - this.bh) this.land();
    }
    for (const d of this.debris) { d.vy += 1500 * dt; d.y += d.vy * dt; d.x += d.vx * dt; d.r += d.vr * dt; }
    this.debris = this.debris.filter(d => d.y < H + 300 - this.camY);
  },
  down(){
    if (!this.cur || this.falling) return;
    const hoverY = this.topY() - this.bh - 120;
    this.falling = {x: this.cur.x, w: this.cur.w, c: this.cur.c, y: hoverY, vy: 300}; this.cur = null; SFX.drop(); stat('drops');
  },
  land(){
    const f = this.falling, top = this.tower[this.tower.length - 1]; this.falling = null;
    const y = this.topY() - this.bh;
    const l = Math.max(f.x, top.x), r = Math.min(f.x + f.w, top.x + top.w), ov = r - l;
    const tol = 7 * (BOOST.steady ? 1.3 : 1);
    if (ov <= 4) { // missed the tower completely: it wobbles and falls
      this.debris.push({x: f.x, y, w: f.w, c: f.c, vx: (f.x < top.x ? -1 : 1) * 120, vy: -100, r: 0, vr: (f.x < top.x ? -1 : 1) * 3});
      this.topple('चूक गए!'); return;
    }
    if (Math.abs(f.x - top.x) <= tol) { // PERFECT: snaps, and the box grows back a little
      const nw = Math.min(this.maxW, top.w + 8), nx = top.x - (nw - top.w) / 2;
      this.tower.push({x: nx, w: nw, c: f.c, perfect: 1}); hit(); this.perfectRun++; stat('perfect');
      addScore(55, W / 2, y - this.camY - 40, this.perfectRun >= 3 ? 'एकदम सही x' + this.perfectRun + '!' : 'एकदम सही!');
      SFX.stack(RUN.combo); buzzv(16); confetti(nx + nw / 2, y - this.camY, 16, 0.6); flash('rgba(255,240,170,.18)', 0.1);
    } else {
      // trim the overhang
      const ratio = ov / f.w;
      if (f.x < l) this.debris.push({x: f.x, y, w: l - f.x, c: f.c, vx: -80, vy: -60, r: 0, vr: -2.5});
      if (f.x + f.w > r) this.debris.push({x: r, y, w: f.x + f.w - r, c: f.c, vx: 80, vy: -60, r: 0, vr: 2.5});
      this.tower.push({x: l, w: ov, c: f.c}); this.perfectRun = 0;
      if (ratio >= 0.78) { hit(); stat('good'); addScore(35, W / 2, y - this.camY - 40, 'बढ़िया!'); SFX.stack(RUN.combo); }
      else { stat('wobbly'); loseCombo(); addScore(20, W / 2, y - this.camY - 40, 'डगमग'); SFX.stack(0); }
      buzzv(10);
    }
    const n = this.tower.length - 1;
    if (n > 0 && n % 10 === 0) { addScore(150, W / 2, H * 0.36, n + ' ऊँची!'); SFX.gold(); confetti(W / 2, H * 0.36, 40, 1); shake(4, 0.15); }
    if (this.tower[this.tower.length - 1].w < 26) { // too thin: tower finished, bank a height bonus and start a fresh one
      const bonus = 6 * n; addScore(bonus, W / 2, H * 0.42, 'मीनार पूरी!'); this.towers++; SFX.fanfare(); confetti(W / 2, H * 0.4, 50, 1.1);
      this.nextTower(); return;
    }
    this.nextIn = 0.12;
  },
  topple(msg){
    stat('topples'); SFX.crumble(); buzzv([40, 30, 60]); shake(10, 0.35); flash('rgba(255,80,80,.25)', 0.2);
    loseCombo(); popup(W / 2, H * 0.42, msg + ' नई मीनार', '#ff6b6b', 24);
    for (let i = 1; i < this.tower.length; i++) { const b = this.tower[i]; this.debris.push({x: b.x, y: this.baseY - (i + 1) * this.bh, w: b.w, c: b.c, vx: rnd(-160, 160), vy: rnd(-200, 0), r: 0, vr: rnd(-4, 4)}); }
    this.nextTower();
  },
  nextTower(){ const keepDebris = this.debris; this.tower = [{x: W / 2 - this.maxW / 2, w: this.maxW, c: 0}]; this.cur = null; this.falling = null; this.perfectRun = 0; this.nextIn = 0.7; this.debris = keepDebris; },
  drawBox(x, y, w, c, top){
    const C = BOXC[c % BOXC.length], h = this.bh;
    ctx.fillStyle = C[0]; rr(x, y, w, h - 2, 5); ctx.fill(); ctx.strokeStyle = '#3a2340'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = C[1]; ctx.fillRect(x, y + h * 0.42, w, 4);
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x + 3, y + 3, Math.max(0, w - 6), 4);
    if (top) { ctx.fillStyle = '#ffb627'; for (let lx = x + 10; lx < x + w - 6; lx += 18) { ctx.beginPath(); ctx.arc(lx, y - 6, 8, 0, 7); ctx.fill(); ctx.fillStyle = '#e8901a'; ctx.beginPath(); ctx.arc(lx + 2, y - 5, 2, 0, 7); ctx.fill(); ctx.fillStyle = '#ffb627'; } }
  },
  draw(){
    const cy = -this.camY;
    ctx.save(); ctx.translate(0, cy);
    // stall table
    ctx.fillStyle = '#8a4a1f'; ctx.fillRect(W / 2 - 130, this.baseY, 260, 18); ctx.fillStyle = '#6a3a18'; ctx.fillRect(W / 2 - 118, this.baseY + 18, 14, 200); ctx.fillRect(W / 2 + 104, this.baseY + 18, 14, 200);
    const t = this.tower;
    for (let i = 1; i < t.length; i++) this.drawBox(t[i].x, this.baseY - i * this.bh, t[i].w, t[i].c, i === t.length - 1);
    // silver tray base
    ctx.fillStyle = '#d8dde6'; rr(t[0].x - 6, this.baseY - 8, t[0].w + 12, 10, 5); ctx.fill();
    for (const d of this.debris) { ctx.save(); ctx.translate(d.x + d.w / 2, d.y + this.bh / 2); ctx.rotate(d.r); this.drawBox(-d.w / 2, -this.bh / 2, d.w, d.c, false); ctx.restore(); }
    if (this.falling) this.drawBox(this.falling.x, this.falling.y, this.falling.w, this.falling.c, true);
    if (this.cur) {
      const hy = this.topY() - this.bh - 120;
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.setLineDash([5, 8]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(this.cur.x, hy + this.bh); ctx.lineTo(this.cur.x, this.topY()); ctx.moveTo(this.cur.x + this.cur.w, hy + this.bh); ctx.lineTo(this.cur.x + this.cur.w, this.topY()); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(this.cur.x + this.cur.w / 2, hy - 400); ctx.lineTo(this.cur.x + this.cur.w / 2, hy); ctx.stroke();
      this.drawBox(this.cur.x, hy, this.cur.w, this.cur.c, true);
    }
    ctx.restore();
    outlined((t.length - 1) + ' ऊँची', 54, H - 52, 20, '#fff');
    pill('टैप करके गिराओ · सीध में रखो!', H - 14);
  },
  state(){ const top = this.tower[this.tower.length - 1]; return {cur: this.cur ? {x: this.cur.x, w: this.cur.w, dir: this.cur.dir, v: this.speed()} : null, top: {x: top.x, w: top.w}, height: this.tower.length - 1, falling: !!this.falling, towers: this.towers}; },
};

// ---------------- Bumper Cart Dash (new) ----------------
MG.cart = {
  objs: [], x: 0, y: 0, vx: 0, scroll: 0, inv: 0, spin: 0, spawnO: 0, spawnT: 0, roadOff: 0, bandu: null, bananaT: 0,
  init(){
    this.objs = []; this.x = W / 2; this.y = H * 0.8; this.inv = 0; this.spin = 0; this.spawnO = 1.2; this.spawnT = 0.3; this.roadOff = 0; this.tilt = 0;
    this.bandu = RUN.L.chase ? {x: W / 2, y: H * 0.2, ph: 0} : null; this.bananaT = 2.5;
  },
  resize(){ this.y = H * 0.8; },
  speed(){ const p = prog(); return lerp(250, 360, p) * (1 + 0.22 * D); },
  add(o){ this.objs.push(o); },
  update(dt){
    const v = this.speed(), p = prog();
    this.roadOff = (this.roadOff + v * dt) % 60;
    this.inv = Math.max(0, this.inv - dt); this.spin = Math.max(0, this.spin - dt); this.tilt *= Math.pow(0.02, dt);
    // tickets come in short lines / arcs so a sweep collects several
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = rnd(0.9, 1.4);
      const n = 3 + (Math.random() * 3 | 0), x0 = rnd(50, W - 50), dx = rnd(-40, 40), gold = Math.random() < 0.18;
      for (let i = 0; i < n; i++) this.add({k: (gold && i === n - 1) ? 'gold' : 'ticket', x: clamp(x0 + dx * i, 30, W - 30), y: -30 - i * 46, vy: v, r: 16});
      if (Math.random() < 0.16) this.add({k: 'star', x: rnd(40, W - 40), y: -260, vy: v, r: 18});
    }
    // obstacles: other bumper carts (drifting), haystacks
    this.spawnO -= dt;
    if (this.spawnO <= 0) {
      this.spawnO = lerp(1.05, 0.62, p) / (MODS.traffic || 1) / (1 + 0.3 * D) * rnd(0.75, 1.25);
      if (Math.random() < 0.7) this.add({k: 'car', x: rnd(40, W - 40), y: -50, vy: v * rnd(0.45, 0.65), vx: rnd(-40, 40), r: 24, c: pick(['#2e8bff', '#5bdc5b', '#b05bff', '#ff8a1f', '#2ec4ff'])});
      else this.add({k: 'hay', x: rnd(40, W - 40), y: -40, vy: v, r: 22});
    }
    // Bandu chase: he weaves ahead and throws bananas; the gap shrinks as you collect
    if (this.bandu) {
      const b = this.bandu; b.ph += dt; b.x = W / 2 + Math.sin(b.ph * 1.3) * (W * 0.32);
      b.y = lerp(H * 0.66, H * 0.17, clamp(RUN.chaseGap / 100, 0, 1)) + Math.sin(b.ph * 3) * 4;
      RUN.chaseGap = Math.max(0, RUN.chaseGap - dt * 0.5);
      this.bananaT -= dt;
      if (this.bananaT <= 0) { this.bananaT = rnd(1.4, 2.2) / (1 + 0.3 * D); this.add({k: 'banana', x: b.x, y: b.y + 20, vy: v * 0.75, vx: rnd(-60, 60), r: 15, rot: 0}); SFX.monkey(); }
      if (RUN.chaseGap <= 0 && !RUN.caught) { RUN.caught = true; RUN.slowmo = 0.8; SFX.fanfare(); confetti(b.x, b.y, 70, 1.2); popup(W / 2, H * 0.4, 'पकड़ लिया!', '#ffd23f', 44, 1.4); buzzv([60, 40, 120]); addScore(300, W / 2, H * 0.48, 'पकड़ा!'); }
    }
    const cw = 24 * (BOOST.bigbasket ? 1.12 : 1);
    for (const o of this.objs) {
      o.y += o.vy * dt; if (o.vx) { o.x += o.vx * dt; if (o.x < 30 || o.x > W - 30) o.vx *= -1; } if (o.k === 'banana') o.rot += dt * 8;
      if (o.dead) continue;
      const dx = o.x - this.x, dy = o.y - this.y;
      if (o.k === 'ticket' || o.k === 'gold' || o.k === 'star') {
        if (Math.abs(dx) < cw + o.r * 0.6 && Math.abs(dy) < 34 + o.r * 0.5) {
          o.dead = true; hit(); stat('tickets');
          if (o.k === 'star') { RUN.dbl = 3; SFX.gold(); flash('rgba(255,230,120,.3)'); confetti(o.x, o.y, 30, 0.8); popup(o.x, o.y - 30, 'तारा! x2', '#ffd23f', 28); if (RUN.L.chase) RUN.chaseGap -= 4; }
          else if (o.k === 'gold') { addScore(40, o.x, o.y - 30, 'सुनहरा टिकट!'); SFX.gold(); confetti(o.x, o.y, 24, 0.7); if (RUN.L.chase) RUN.chaseGap -= 5; }
          else { addScore(6, o.x, o.y - 30); SFX.ticket(RUN.combo); if (RUN.L.chase) RUN.chaseGap -= 1.6; }
          buzzv(8);
        }
      } else if (this.inv <= 0 && Math.abs(dx) < 22 + o.r * 0.75 && Math.abs(dy) < 30 + o.r * 0.6) {
        o.dead = o.k !== 'car'; if (o.k === 'car') { o.vx = (dx > 0 ? 1 : -1) * 160; o.bumped = 1; }
        this.inv = 1.1; this.spin = 0.6; stat('bumps'); SFX.bump(); buzzv([40, 30, 60]); shake(10, 0.3); flash('rgba(255,80,80,.25)', 0.18);
        bad(this.x, this.y - 60, 30, o.k === 'banana' ? 'केला!' : 'टक्कर!'); if (RUN.L.chase) RUN.chaseGap = Math.min(100, RUN.chaseGap + 8);
      }
    }
    this.objs = this.objs.filter(o => o.y < H + 60 && !(o.dead && o.k !== 'car'));
  },
  move(f, dx){ this.x = clamp(this.x + dx * 1.3, 30, W - 30); this.tilt = clamp(this.tilt + dx * 0.01, -0.35, 0.35); },
  drawCart(x, y, c, s, rot, driver){
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, 26, 30, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#222'; rr(-30, -24, 60, 54, 20); ctx.fill();
    ctx.fillStyle = c; rr(-24, -28, 48, 52, 14); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.3)'; rr(-18, -24, 36, 10, 5); ctx.fill();
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(0, -58); ctx.stroke(); ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(0, -60, 4, 0, 7); ctx.fill();
    if (driver === 'meera') { ctx.save(); ctx.translate(0, -4); ctx.scale(0.3, 0.3); drawChar(ctx, 'M', 0, 0, 1, TIME, {hat: SAVE.hat, outfit: SAVE.outfit}); ctx.restore(); }
    else if (driver === 'bandu') { ctx.save(); ctx.translate(0, -2); ctx.scale(0.3, 0.3); drawMonkey(ctx, 1, TIME, {trophy: 1}); ctx.restore(); }
    else { ctx.fillStyle = '#2a1712'; ctx.beginPath(); ctx.arc(0, -6, 10, 0, 7); ctx.fill(); }
    ctx.restore();
  },
  draw(){
    // the arena floor
    ctx.fillStyle = 'rgba(40,30,60,.55)'; ctx.fillRect(0, H * 0.1, W, H * 0.9);
    ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 2;
    for (let y = H * 0.1 + this.roadOff - 60; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.fillStyle = '#ffd23f'; for (let y = H * 0.1 + this.roadOff - 60; y < H; y += 60) { ctx.fillRect(4, y, 6, 30); ctx.fillRect(W - 10, y, 6, 30); }
    for (const o of this.objs) {
      if (o.k === 'ticket' || o.k === 'gold') {
        ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(Math.sin(TIME * 4 + o.x) * 0.2);
        ctx.fillStyle = o.k === 'gold' ? '#ffcf1a' : '#ff5aa5'; rr(-16, -10, 32, 20, 4); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '900 11px VFDeva, system-ui'; ctx.textAlign = 'center'; ctx.fillText(o.k === 'gold' ? '★40' : 'टिकट', 0, 4);
        ctx.restore();
      } else if (o.k === 'star') {
        ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(TIME * 2); ctx.fillStyle = '#ffd23f'; ctx.beginPath();
        for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 8 : 19; i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
        ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      } else if (o.k === 'car') this.drawCart(o.x, o.y, o.c, 0.85, o.bumped ? TIME * 6 : 0);
      else if (o.k === 'hay') { ctx.fillStyle = '#e8c04a'; rr(o.x - 24, o.y - 18, 48, 36, 8); ctx.fill(); ctx.strokeStyle = '#b8902a'; ctx.lineWidth = 2; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(o.x - 22, o.y + i * 10); ctx.lineTo(o.x + 22, o.y + i * 10); ctx.stroke(); } }
      else if (o.k === 'banana') { ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, -8, 14, 0.4, Math.PI - 0.4); ctx.stroke(); ctx.strokeStyle = '#7a5a20'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -8, 14, 0.35, 0.45); ctx.stroke(); ctx.lineCap = 'butt'; ctx.restore(); }
    }
    if (this.bandu) this.drawCart(this.bandu.x, this.bandu.y, '#7a4a2a', 0.95, Math.sin(TIME * 8) * 0.08, 'bandu');
    const blink = this.inv > 0 && Math.floor(TIME * 12) % 2;
    if (!blink) this.drawCart(this.x, this.y, '#ff2d6f', 1.05, this.spin > 0 ? this.spin * 12 : this.tilt, 'meera');
    pill('खिसकाकर चलाओ · टिकट लो · टक्कर से बचो', H - 14);
  },
  state(){ return {x: this.x, y: this.y, v: this.speed(), objs: this.objs.filter(o => !o.dead).map(o => ({k: o.k, x: o.x, y: o.y, vy: o.vy, vx: o.vx || 0, r: o.r})), gap: RUN.chaseGap, caught: RUN.caught}; },
};

// ---------------- Dhol Beat (new) ----------------
MG.dhol = {
  notes: [], beat: 0.5, travel: 1.6, nextK: 0, hitY: 0, laneFx: [0, 0, 0], lastBeat: -1, judge: null,
  init(){
    const bpm = 112 * (MODS.bpm || 1) * (1 + 0.2 * D);
    this.beat = 60 / bpm; this.travel = 1.55 / (1 + 0.25 * D); this.notes = []; this.nextK = 4; this.hitY = H * 0.76; this.laneFx = [0, 0, 0]; this.lastBeat = -1; this.judge = null;
    this.prevLane = 1;
  },
  resize(){ this.hitY = H * 0.76; },
  laneX(i){ return W * (i + 0.5) / 3; },
  update(dt){
    const t = RUN.gameT, p = prog();
    // schedule notes on the beat grid (half beats appear as the song speeds up)
    while (this.nextK * this.beat / 2 < t + this.travel + 0.05) {
      const k = this.nextK, onBeat = k % 2 === 0, ht = k * this.beat / 2;
      let want = onBeat ? Math.random() < lerp(0.8, 0.95, p) : Math.random() < lerp(0.08, 0.32, p) + 0.1 * D;
      if (ht > RUN.gLen - 0.3) want = false;
      if (want) {
        let lane = (Math.random() * 3) | 0; if (lane === this.prevLane && Math.random() < 0.5) lane = (lane + 1 + (Math.random() * 2 | 0)) % 3; this.prevLane = lane;
        this.notes.push({lane, t: ht, gold: Math.random() < 0.05, done: false});
        if (onBeat && k % 8 === 0 && p > 0.35 && Math.random() < 0.35 + D * 0.4) this.notes.push({lane: (lane + 1 + (Math.random() * 2 | 0)) % 3, t: ht, done: false});
      }
      this.nextK++;
    }
    // quiet groove: shaker on every beat, bass on bar starts (the player's taps are the drums)
    const bi = Math.floor(t / this.beat);
    if (bi !== this.lastBeat && RUN.mode === 'play') { this.lastBeat = bi; if (bi % 4 === 0) tone(65, 0.3, 'sine', 0.22, 45); noise(0.04, 0.06, 6000, 1, 'highpass'); }
    for (const n of this.notes) {
      if (!n.done && t - n.t > 0.17) { n.done = true; n.miss = 1; stat('dholMiss'); loseCombo(); popup(this.laneX(n.lane), this.hitY - 50, 'चूक', '#ffb0b0', 18, 0.5); }
    }
    this.notes = this.notes.filter(n => !(n.done && t - n.t > 0.4));
    for (let i = 0; i < 3; i++) this.laneFx[i] = Math.max(0, this.laneFx[i] - dt * 5);
    if (this.judge) { this.judge.t += dt; if (this.judge.t > 0.5) this.judge = null; }
  },
  down(x, y){
    const lane = clamp(Math.floor(x / (W / 3)), 0, 2), t = RUN.gameT;
    this.laneFx[lane] = 1;
    let best = null, bd = 1e9;
    for (const n of this.notes) { if (n.done || n.lane !== lane) continue; const d = Math.abs(t - n.t); if (d < bd) { bd = d; best = n; } }
    const win = 0.17 * (BOOST.steady ? 1.12 : 1);
    if (!best || bd > win) { (lane === 1 ? SFX.dha : SFX.tin)(0.5); return; }
    best.done = true; best.hitT = t; hit(); stat('dholHit'); (lane === 1 ? SFX.dha : SFX.tin)(1); if (lane !== 1) SFX.dha(0.6); buzzv(10);
    const perfect = bd < 0.075;
    if (best.gold) { addScore(40, this.laneX(lane), this.hitY - 60, 'सुनहरी थाप!'); SFX.gold(); confetti(this.laneX(lane), this.hitY, 26, 0.7); }
    else addScore(perfect ? 10 : 5, this.laneX(lane), this.hitY - 60, perfect ? 'एकदम सही!' : 'बढ़िया');
    if (perfect) stat('dholPerfect');
    shards(this.laneX(lane), this.hitY, 6, perfect ? '#ffd23f' : '#fff');
    this.judge = {txt: perfect ? 'एकदम सही' : 'बढ़िया', perfect, t: 0};
  },
  draw(){
    const t = RUN.gameT, hy = this.hitY;
    ctx.fillStyle = 'rgba(30,15,45,.55)'; ctx.fillRect(0, H * 0.1, W, H * 0.9);
    for (let i = 0; i < 3; i++) {
      const x = this.laneX(i), lw = W / 3;
      ctx.fillStyle = this.laneFx[i] > 0 ? 'rgba(255,220,120,' + (0.25 * this.laneFx[i]) + ')' : 'rgba(255,255,255,.04)'; ctx.fillRect(x - lw / 2 + 4, H * 0.1, lw - 8, H * 0.9);
      ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, H * 0.12); ctx.lineTo(x, hy); ctx.stroke();
    }
    // hit line
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(10, hy); ctx.lineTo(W - 10, hy); ctx.stroke();
    // notes
    for (const n of this.notes) {
      if (n.done && !n.miss) continue;
      const y = hy - (n.t - t) / this.travel * (hy - H * 0.12), x = this.laneX(n.lane);
      ctx.globalAlpha = n.miss ? 0.3 : 1;
      ctx.fillStyle = n.gold ? '#ffcf1a' : ['#ff2d6f', '#ff8a1f', '#2ec4ff'][n.lane]; ctx.beginPath(); ctx.arc(x, y, 24, 0, 7); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.fill();
      if (n.gold) { ctx.fillStyle = '#c98a00'; ctx.font = '900 14px VFDeva, system-ui'; ctx.textAlign = 'center'; ctx.fillText('★', x, y + 5); }
      ctx.globalAlpha = 1;
    }
    // three dhol drums on the line
    for (let i = 0; i < 3; i++) {
      const x = this.laneX(i), k = this.laneFx[i], s = 1 + k * 0.1;
      ctx.save(); ctx.translate(x, hy + 52); ctx.scale(s, s);
      ctx.fillStyle = ['#c8202f', '#7a3fbf', '#1e7a5a'][i]; rr(-40, -22, 80, 52, 18); ctx.fill();
      ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2; for (let j = -2; j <= 2; j++) { ctx.beginPath(); ctx.moveTo(-36, 4); ctx.lineTo(j * 14, -20); ctx.moveTo(-36, 4); ctx.lineTo(j * 14, 28); ctx.stroke(); }
      ctx.fillStyle = '#f4e3c0'; ctx.beginPath(); ctx.ellipse(0, -22, 40, 10, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#8a5a20'; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 + 0.5 * k) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, hy, 27, 0, 7); ctx.stroke();
    }
    pill('थाप पीली लाइन पर आए, तब टैप करो', H - 14);
  },
  state(){ return {hitY: this.hitY, t: RUN.gameT, travel: this.travel, notes: this.notes.filter(n => !n.done).map(n => ({lane: n.lane, t: n.t}))}; },
};
