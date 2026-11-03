(() => {
  'use strict';
  const cv = document.getElementById('game');
  const ctx = cv.getContext('2d');
  const $ = id => document.getElementById(id);
  const scoreEl = $('score'), bestEl = $('best');
  const menu = $('menu'), over = $('over');
  const KEY = 'meteorDashBest';
  let best = 0;
  try { best = +localStorage.getItem(KEY) || 0; } catch (e) {}

  let W = 0, H = 0, dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = cv.getBoundingClientRect();
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (player) { player.y = H - 90; player.x = Math.min(Math.max(player.x, player.r), W - player.r); }
  }

  // ---- audio (tiny synth beeps, created on first tap) ----
  let ac = null;
  function beep(freq, dur, type, vol) {
    if (!ac) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.08, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + dur);
  }
  function initAudio() {
    if (ac) return;
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; }
  }

  // ---- state ----
  let state = 'menu';
  let player, meteors, stars, parts, bgStars, score, t, spawnT, starT, shake, combo, lastTs;
  const input = { left: false, right: false, targetX: null };

  function makeBg() {
    bgStars = [];
    for (let i = 0; i < 70; i++) bgStars.push({ x: Math.random(), y: Math.random(), s: Math.random() * 1.8 + .3, v: Math.random() * .6 + .2 });
  }
  function reset() {
    player = { x: W / 2, y: H - 90, r: 18, vx: 0, tilt: 0 };
    meteors = []; stars = []; parts = [];
    score = 0; t = 0; spawnT = 0.6; starT = 2.5; shake = 0; combo = 0;
    input.targetX = null;
    updateHud();
  }
  function updateHud() {
    scoreEl.textContent = Math.floor(score);
    bestEl.textContent = 'BEST ' + best;
  }

  function start() {
    initAudio();
    reset();
    state = 'play';
    menu.classList.add('hidden'); over.classList.add('hidden'); document.getElementById('hud').style.visibility='visible';
    beep(520, .12, 'square', .05); setTimeout(() => beep(780, .15, 'square', .05), 90);
  }
  function gameOver() {
    state = 'over';
    const s = Math.floor(score);
    const isBest = s > best;
    if (isBest) { best = s; try { localStorage.setItem(KEY, String(best)); } catch (e) {} }
    $('finalScore').textContent = s;
    $('overBest').textContent = isBest && s > 0 ? '★ NEW BEST! ★' : 'BEST ' + best;
    updateHud();
    shake = 18;
    for (let i = 0; i < 40; i++) burst(player.x, player.y, ['#ff6b3d', '#ffe066', '#fff'][i % 3]);
    beep(160, .5, 'sawtooth', .1);
    canRestartAt = performance.now() + 600;
    setTimeout(() => { if (state === 'over') over.classList.remove('hidden'); }, 550);
  }
  let canRestartAt = 0;

  function burst(x, y, c) {
    const a = Math.random() * Math.PI * 2, sp = Math.random() * 260 + 60;
    parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: Math.random() * .6 + .4, max: 1, c, r: Math.random() * 3 + 1.5 });
  }

  function difficulty() { return Math.min(t / 60, 1); } // ramps over 60s

  function spawnMeteor() {
    const d = difficulty();
    const r = 12 + Math.random() * (14 + d * 14);
    meteors.push({
      x: r + Math.random() * (W - 2 * r), y: -r - 10, r,
      vy: 170 + Math.random() * 90 + d * 260 + t * 2,
      vx: (Math.random() - .5) * (40 + d * 120),
      rot: Math.random() * 6, vr: (Math.random() - .5) * 4,
      pts: Array.from({ length: 9 }, () => .75 + Math.random() * .3)
    });
  }
  function spawnStar() {
    stars.push({ x: 24 + Math.random() * (W - 48), y: -20, r: 13, vy: 150 + difficulty() * 120, ph: Math.random() * 6 });
  }

  function update(dt) {
    for (const b of bgStars) { b.y += b.v * dt * (state === 'play' ? 0.25 + difficulty() * .35 : 0.08); if (b.y > 1) { b.y = 0; b.x = Math.random(); } }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .97; p.vy = p.vy * .97 + 200 * dt;
      if (p.life <= 0) parts.splice(i, 1);
    }
    if (shake > 0) shake = Math.max(0, shake - 60 * dt);
    if (state !== 'play') return;

    t += dt;
    score += dt * 10;

    // movement
    const speed = 520;
    let dx = 0;
    if (input.targetX !== null) {
      const diff = input.targetX - player.x;
      player.vx = Math.max(-900, Math.min(900, diff * 14));
    } else {
      if (input.left) dx -= 1;
      if (input.right) dx += 1;
      player.vx += (dx * speed - player.vx) * Math.min(1, dt * 14);
    }
    player.x += player.vx * dt;
    player.x = Math.max(player.r, Math.min(W - player.r, player.x));
    player.tilt += ((player.vx / 900) * .5 - player.tilt) * Math.min(1, dt * 10);
    // engine trail
    if (Math.random() < .8) parts.push({ x: player.x + (Math.random() - .5) * 8, y: player.y + 20, vx: (Math.random() - .5) * 30, vy: 120 + Math.random() * 60, life: .35, max: .35, c: Math.random() < .5 ? '#ffb13d' : '#ff6b3d', r: Math.random() * 3 + 2 });

    // spawns
    spawnT -= dt;
    if (spawnT <= 0) { spawnMeteor(); const d = difficulty(); spawnT = Math.max(0.22, 0.75 - d * 0.5) * (0.6 + Math.random() * 0.8); }
    starT -= dt;
    if (starT <= 0) { spawnStar(); starT = 2 + Math.random() * 2.5; }

    // meteors
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.y += m.vy * dt; m.x += m.vx * dt; m.rot += m.vr * dt;
      if (m.x < m.r || m.x > W - m.r) m.vx *= -1;
      if (m.y - m.r > H) { meteors.splice(i, 1); continue; }
      const dxm = m.x - player.x, dym = m.y - player.y, rr = m.r * .82 + player.r * .7;
      if (dxm * dxm + dym * dym < rr * rr) { gameOver(); return; }
    }
    // stars
    for (let i = stars.length - 1; i >= 0; i--) {
      const s = stars[i];
      s.y += s.vy * dt; s.ph += dt * 5;
      if (s.y - s.r > H) { stars.splice(i, 1); combo = 0; continue; }
      const dxs = s.x - player.x, dys = s.y - player.y, rr = s.r + player.r + 4;
      if (dxs * dxs + dys * dys < rr * rr) {
        combo++;
        const bonus = 25 * Math.min(combo, 5);
        score += bonus;
        popups.push({ x: s.x, y: s.y, txt: '+' + bonus, life: .9 });
        for (let k = 0; k < 14; k++) burst(s.x, s.y, k % 2 ? '#ffe066' : '#fff');
        beep(880 + combo * 110, .12, 'triangle', .07);
        stars.splice(i, 1);
      }
    }
    for (let i = popups.length - 1; i >= 0; i--) { popups[i].life -= dt; popups[i].y -= 50 * dt; if (popups[i].life <= 0) popups.splice(i, 1); }
    scoreEl.textContent = Math.floor(score);
  }
  const popups = [];

  function drawShip() {
    const p = player;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.tilt);
    // glow
    ctx.shadowColor = '#5ee7ff'; ctx.shadowBlur = 16;
    ctx.fillStyle = '#e8f7ff';
    ctx.beginPath();
    ctx.moveTo(0, -24); ctx.lineTo(16, 16); ctx.lineTo(6, 11); ctx.lineTo(0, 18); ctx.lineTo(-6, 11); ctx.lineTo(-16, 16); ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#5ee7ff';
    ctx.beginPath(); ctx.ellipse(0, -4, 5, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff6b3d';
    ctx.fillRect(-15, 10, 4, 6); ctx.fillRect(11, 10, 4, 6);
    ctx.restore();
  }
  function drawMeteor(m) {
    ctx.save();
    ctx.translate(m.x, m.y);
    // fiery tail
    const g = ctx.createLinearGradient(0, -m.r * 3, 0, 0);
    g.addColorStop(0, 'rgba(255,107,61,0)'); g.addColorStop(1, 'rgba(255,140,61,.55)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-m.r * .8, 0); ctx.lineTo(0, -m.r * 3.2); ctx.lineTo(m.r * .8, 0); ctx.closePath(); ctx.fill();
    ctx.rotate(m.rot);
    ctx.fillStyle = '#8a5a44'; ctx.strokeStyle = '#4a2a1c'; ctx.lineWidth = 2;
    ctx.beginPath();
    m.pts.forEach((k, i) => { const a = i / m.pts.length * Math.PI * 2; const x = Math.cos(a) * m.r * k, y = Math.sin(a) * m.r * k; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5e3b2c';
    ctx.beginPath(); ctx.arc(m.r * .25, -m.r * .2, m.r * .22, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(-m.r * .3, m.r * .3, m.r * .15, 0, 7); ctx.fill();
    ctx.restore();
  }
  function drawStar(s) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.ph * .3);
    const sc = 1 + Math.sin(s.ph) * .12;
    ctx.scale(sc, sc);
    ctx.shadowColor = '#ffe066'; ctx.shadowBlur = 18;
    ctx.fillStyle = '#ffe066';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? s.r * .45 : s.r; const a = i / 10 * Math.PI * 2 - Math.PI / 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function draw() {
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    if (shake > 0) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
    for (const b of bgStars) { ctx.globalAlpha = .4 + b.v * .6; ctx.fillStyle = '#fff'; ctx.fillRect(b.x * W, b.y * H, b.s, b.s); }
    ctx.globalAlpha = 1;
    if (state !== 'menu') {
      stars.forEach(drawStar);
      meteors.forEach(drawMeteor);
      for (const p of parts) { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
      if (state === 'play') drawShip();
      ctx.font = '800 20px system-ui, sans-serif'; ctx.textAlign = 'center';
      for (const u of popups) { ctx.globalAlpha = Math.max(0, u.life); ctx.fillStyle = '#ffe066'; ctx.fillText(u.txt, u.x, u.y); }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function loop(ts) {
    const dt = Math.min(0.05, (ts - (lastTs || ts)) / 1000);
    lastTs = ts;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // ---- input ----
  function pointerX(e) { const r = cv.getBoundingClientRect(); return e.clientX - r.left; }
  function onDown(e) {
    if (state === 'over' && performance.now() > canRestartAt) { start(); }
    if (state === 'play') input.targetX = pointerX(e);
  }
  cv.addEventListener('pointerdown', e => { e.preventDefault(); onDown(e); });
  window.addEventListener('pointermove', e => { if (state === 'play' && (e.buttons || e.pointerType === 'touch') && input.targetX !== null) input.targetX = pointerX(e); });
  window.addEventListener('pointerup', () => { input.targetX = null; });
  window.addEventListener('pointercancel', () => { input.targetX = null; });
  $('play').addEventListener('click', e => { e.stopPropagation(); start(); });
  $('again').addEventListener('click', e => { e.stopPropagation(); if (performance.now() > canRestartAt) start(); });
  over.addEventListener('pointerdown', e => { if (e.target.id !== 'again' && performance.now() > canRestartAt) start(); });
  window.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { input.left = true; input.targetX = null; }
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { input.right = true; input.targetX = null; }
    else if (e.key === ' ' || e.key === 'Enter') {
      if (state === 'menu' || (state === 'over' && performance.now() > canRestartAt)) { e.preventDefault(); start(); }
    } else return;
    e.preventDefault();
  });
  window.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') input.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') input.right = false;
  });
  document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
  window.addEventListener('resize', resize);

  $('menuBest').textContent = best ? 'BEST ' + best : '';
  makeBg(); resize(); reset();
  window.__md = { get state() { return state; }, get score() { return score; }, get player() { return player; }, get meteors() { return meteors; } };
  requestAnimationFrame(loop);
})();
