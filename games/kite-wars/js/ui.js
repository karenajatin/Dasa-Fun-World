// Kite Wars: Uttarayan — screens, save, map, shop, loop
'use strict';
const $ = id => document.getElementById(id);
const VERSION = 'v1.0';
const SAVE_KEY = 'kitewars-save-v1';
let SAVE = loadSave(); window.SAVE = SAVE;
function loadSave(){
  let s = null; try { s = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) {}
  const d = {v: 1, unlocked: 1, stars: {}, best: {}, coins: 0, kites: ['classic'], kite: 'classic', manjas: ['cotton'], manja: 'cotton', seen: {}, sound: true, music: true, voice: true};
  s = Object.assign(d, s || {}); return s;
}
function persist(){ try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) {} window.SAVE = SAVE; }
SET.sound = SAVE.sound; SET.music = SAVE.music; SET.voice = SAVE.voice;
function totalStars(){ let n = 0; for (const k in SAVE.stars) n += SAVE.stars[k]; return n; }

// ---------- screens ----------
const OVS = ['title', 'story', 'map', 'card', 'pause', 'result', 'shop', 'settings'];
let screen = 'title';
function show(id){ $(id).classList.remove('hide'); }
function hide(id){ $(id).classList.add('hide'); }
function only(id){ OVS.forEach(o => { if (o !== id) hide(o); }); if (id) show(id); screen = id || 'game'; $('pauseBtn').classList.toggle('hide', screen !== 'game'); }
function go(fn){ const f = $('fade'); f.classList.add('on'); setTimeout(() => { fn(); requestAnimationFrame(() => f.classList.remove('on')); }, 260); }
function click(id, fn){ $(id).addEventListener('click', e => { initAudio(); SFX.tap(); fn(e); }); }

// ---------- title ----------
function openTitle(){
  only('title'); $('tCoins').textContent = '🪙 ' + SAVE.coins; $('tStars').textContent = '⭐ ' + totalStars() + '/120';
  const ch = Math.min(5, Math.floor((SAVE.unlocked - 1) / 8) + 1); newGame((ch - 1) * 8 + 1, true);
  if (AC) Music.start('menu');
}
click('playBtn', () => { Music.start('menu'); if (!SAVE.seen.prologue) go(() => playScene('prologue', () => openCard(1))); else go(openMap); });
click('shopBtn', () => openShop('title'));
click('setBtn', () => { renderToggles(); show('settings'); });
click('setClose', () => hide('settings'));
click('resetBtn', () => { if (confirm('Reset all progress, coins and shop items?')) { localStorage.removeItem(SAVE_KEY); SAVE = loadSave(); persist(); hide('settings'); openTitle(); } });

// ---------- story ----------
function playScene(id, then){ Story.play(id, () => { SAVE.seen[id] = 1; persist(); go(then); }); }
$('story').addEventListener('click', e => { if (e.target.closest('#skipBtn') || e.target.closest('#celebrate')) return; initAudio(); Story.next(); });
click('skipBtn', () => Story.skip());
click('celBtn', () => { Story.end(true); });

// ---------- map ----------
const BOSS_PORTRAIT = {8: 'T', 16: 'P', 24: 'M', 32: 'R', 40: 'B'};
function skylineSVG(theme, seed){
  const th = THEMES[theme]; const r = srand(seed); let x = -5, p = '';
  const base = 1060;
  while (x < 420) { const w = 24 + r() * 40, h = 60 + r() * 130; p += `<rect x="${x.toFixed(0)}" y="${(base - h).toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="${th.walls[(r() * 6) | 0]}"/>`;
    if (r() < 0.3) p += `<rect x="${(x + w * 0.25).toFixed(0)}" y="${(base - h + 16).toFixed(0)}" width="${(w * 0.5).toFixed(0)}" height="14" rx="7" fill="rgba(0,0,0,.25)"/>`;
    x += w - 2; }
  let far = ''; x = -5; while (x < 420) { const w = 18 + r() * 30, h = 120 + r() * 160; far += `<rect x="${x.toFixed(0)}" y="${(base - h - 80).toFixed(0)}" width="${w.toFixed(0)}" height="${(h + 80).toFixed(0)}" fill="${th.far}"/>`; if (r() < 0.15) far += `<circle cx="${(x + w / 2).toFixed(0)}" cy="${(base - h - 80).toFixed(0)}" r="${(w / 2).toFixed(0)}" fill="${th.far}"/>`; x += w - 2; }
  let deco = '';
  if (th.night) for (let i = 0; i < 60; i++) deco += `<circle cx="${(r() * 400).toFixed(0)}" cy="${(r() * 700).toFixed(0)}" r="${(r() * 1.4 + 0.4).toFixed(1)}" fill="#fff" opacity="${(0.4 + r() * 0.6).toFixed(2)}"/>`;
  if (th.sun) deco += `<circle cx="${th.sun.x}" cy="${(th.sun.y * 900).toFixed(0)}" r="${th.sun.r * 1.4}" fill="${th.sun.col}" opacity=".9"/>`;
  if (th.moon) deco += `<circle cx="300" cy="200" r="34" fill="#f4f1dc"/>`;
  if (th.river) deco += `<rect x="0" y="${base - 150}" width="400" height="70" fill="#d9708a" opacity=".8"/>`;
  if (th.lake) deco += `<ellipse cx="200" cy="${base - 210}" rx="260" ry="40" fill="#5fa6d6" opacity=".9"/>`;
  for (let i = 0; i < 8; i++) { const kx = r() * 400, ky = 120 + r() * 600, s = 5 + r() * 6, c = ['#ff4f6d','#ffd23f','#2fd18b','#3fa0ff','#ff8a1f'][i % 5]; deco += `<path d="M${kx} ${ky - s}L${kx + s * 0.8} ${ky}L${kx} ${ky + s * 1.1}L${kx - s * 0.8} ${ky}Z" fill="${c}" opacity=".7"/>`; }
  const s = th.sky;
  return `<svg class="sky" viewBox="0 0 400 1060" preserveAspectRatio="xMidYMax slice"><defs><linearGradient id="g${seed}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s[0]}"/><stop offset=".45" stop-color="${s[1]}"/><stop offset=".75" stop-color="${s[2]}"/><stop offset="1" stop-color="${s[3]}"/></linearGradient></defs><rect width="400" height="1060" fill="url(#g${seed})"/>${deco}${far}${p}</svg>`;
}
function nodePos(n){ const i = (n - 1) % 8; return {x: 50 + Math.sin(i * 1.15 + 0.4) * 27, y: 960 - i * 108}; }
function openMap(){
  only('map'); Music.start('menu'); $('mCoins').textContent = '🪙 ' + SAVE.coins;
  const inner = $('mapInner'); inner.innerHTML = '';
  for (let ch = 5; ch >= 1; ch--) {
    const C = CHAPTERS[ch - 1], th = chapterTheme(ch), sec = document.createElement('div'); sec.className = 'chap';
    let html = skylineSVG(th, ch * 31);
    const pts = []; for (let n = (ch - 1) * 8 + 1; n <= ch * 8; n++) pts.push(nodePos(n));
    html += `<svg class="sky" viewBox="0 0 100 1060" preserveAspectRatio="none" style="z-index:1"><path d="${pts.map((p, i) => (i ? 'L' : 'M') + p.x + ' ' + p.y).join(' ')}" stroke="#fff" stroke-width="0.8" stroke-dasharray="2 2" fill="none" opacity=".85" vector-effect="non-scaling-stroke"/></svg>`;
    const unlockedCh = SAVE.unlocked >= (ch - 1) * 8 + 1;
    html += `<div class="chead"><div><span class="cn">CHAPTER ${ch}</span><b>${C.name}</b><small>${C.sub}</small></div>${unlockedCh && SAVE.seen[C.intro] ? `<button class="chip" data-scene="${C.intro}">📖 Story</button>` : ''}</div>`;
    sec.innerHTML = html;
    for (let n = (ch - 1) * 8 + 1; n <= ch * 8; n++) {
      const L = LEVELS[n - 1], p = nodePos(n), b = document.createElement('button'), st = SAVE.stars[n] || 0, locked = n > SAVE.unlocked;
      b.className = 'node' + (L.boss_ ? ' boss' : '') + (locked ? ' locked' : '') + (st ? ' done' : '') + (n === SAVE.unlocked && !locked ? ' cur' : '');
      b.style.left = p.x + '%'; b.style.top = p.y + 'px'; b.dataset.n = n; b.setAttribute('aria-label', 'Level ' + n + ' ' + L.name);
      if (L.boss_) { const c = document.createElement('canvas'); c.width = c.height = 160; const x = c.getContext('2d'); x.fillStyle = CHARS[BOSS_PORTRAIT[n]].col; x.fillRect(0, 0, 160, 160); drawChar(x, BOSS_PORTRAIT[n], {x: 80, y: 250, s: 0.75}); if (locked) { x.fillStyle = 'rgba(40,30,50,.55)'; x.fillRect(0, 0, 160, 160); } b.appendChild(c);
        const bn = document.createElement('span'); bn.className = 'bn'; bn.textContent = locked ? '🔒 BOSS' : 'BOSS · ' + n; b.appendChild(bn); }
      else b.insertAdjacentHTML('beforeend', locked ? '🔒' : String(n));
      b.insertAdjacentHTML('beforeend', `<span class="st">${[1, 2, 3].map(i => `<i class="${i <= st ? 'on' : ''}">★</i>`).join('')}</span>`);
      if (n === SAVE.unlocked && !locked) b.insertAdjacentHTML('beforeend', '<span class="kme">🪁</span>');
      sec.appendChild(b);
    }
    inner.appendChild(sec);
  }
  requestAnimationFrame(() => { const cur = inner.querySelector('.node.cur') || inner.querySelector('.node[data-n="1"]'); if (cur) { const sc = $('mapScroll'); const r = cur.getBoundingClientRect(), r0 = sc.getBoundingClientRect(); sc.scrollTop += r.top - r0.top - sc.clientHeight * 0.55; } });
}
$('mapInner').addEventListener('click', e => {
  const sb = e.target.closest('[data-scene]'); if (sb) { initAudio(); SFX.tap(); go(() => playScene(sb.dataset.scene, openMap)); return; }
  const b = e.target.closest('.node'); if (!b) return; initAudio(); const n = +b.dataset.n;
  if (n > SAVE.unlocked) { SFX.alarm(); b.animate([{transform: 'translateX(-6px)'}, {transform: 'translateX(6px)'}, {transform: 'none'}], {duration: 240}); return; }
  SFX.tap(); enterLevel(n);
});
click('mapBack', () => go(openTitle));
click('mapShop', () => openShop('map'));
function enterLevel(n){ const sc = SCENE_BEFORE[n]; if (sc && !SAVE.seen[sc]) go(() => playScene(sc, () => openCard(n))); else openCard(n); }

// ---------- level card ----------
let cardN = 1;
function openCard(n){
  cardN = n; const L = LEVELS[n - 1], C = CHAPTERS[L.ch - 1];
  if (screen !== 'map') { only('map'); openMap(); }
  newGame(n, true); // preview the level's sky behind the card
  $('cChap').textContent = 'CHAPTER ' + L.ch + ' · ' + C.name.toUpperCase() + ' · LEVEL ' + n;
  $('cName').textContent = L.name; $('cIcon').textContent = OBJ_ICON[L.obj]; $('cObj').textContent = objText(L);
  const nw = $('cNew'); if (L.isNew) { nw.innerHTML = '<b>NEW!</b> ' + L.isNew; nw.classList.remove('hide'); } else nw.classList.add('hide');
  const st = SAVE.stars[n] || 0; $('cStars').innerHTML = starText(L).map((t, i) => `<li><i class="${i < st ? 'on' : ''}">${'★'.repeat(i + 1)}</i>${t}</li>`).join('');
  show('card'); screen = 'card';
}
click('cGo', () => go(() => startLevel(cardN)));
click('cBack', () => { hide('card'); screen = 'map'; });

// ---------- play ----------
function startLevel(n){
  only(null); newGame(n, false); placePause();
  Music.start(LEVELS[n - 1].obj === 'boss' ? 'play' : 'play');
}
function placePause(){ const b = $('pauseBtn'), s = SC; b.style.left = (OX + 13 * s) + 'px'; b.style.top = (15 * s) + 'px'; b.style.width = b.style.height = (34 * s) + 'px'; }
addEventListener('resize', () => { placePause(); if (Story.on) Story.resize(); });
function pauseGame(){ if (!G || G.mode !== 'play' || G.paused) return; G.paused = true; SFX.zipStop(); renderToggles(); show('pause'); screen = 'pause'; ev('pause'); }
Game.onPauseReq = pauseGame;
click('pauseBtn', pauseGame);
click('pResume', () => { hide('pause'); screen = 'game'; G.paused = false; if (G.pech) SFX.zipStart(); ev('resume'); });
click('pRetry', () => { hide('pause'); go(() => startLevel(G.n)); });
click('pMap', () => { hide('pause'); go(openMap); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { SFX.zipStop(); Voice.stop(); if (screen === 'game') pauseGame(); } });

// ---------- results ----------
const TIPS = {kites: ['Saw faster in a pech, and push hardest on PULL NOW!', 'Swoop in fast to start a pech with a head start.', 'Red "!" kites are hunting you. Attack them before they reach your string.'],
  time: ['Go after kites quickly. Swing across their strings!', 'Kites near your side of the sky are faster to reach.'],
  ally: ['When "HELP DADA!" flashes, cut the attacker on Dada\'s string fast.', 'Stay near Dada\'s blue kite so you can defend it.']};
let lastRes = null;
Game.onEnd = res => {
  lastRes = res; const n = res.n;
  let gained = res.coins;
  if (res.won) {
    const prev = SAVE.stars[n] || 0; if (res.stars > prev) { gained += (res.stars - prev) * 30; SAVE.stars[n] = res.stars; }
    SAVE.best[n] = Math.max(SAVE.best[n] || 0, res.score);
    if (n === SAVE.unlocked && n < 40) SAVE.unlocked = n + 1; if (n === 40) SAVE.done = 1;
  }
  SAVE.coins += gained; persist();
  only('result'); screen = 'result';
  $('rWin').classList.toggle('hide', !res.won); $('rLose').classList.toggle('hide', res.won);
  $('rLose').textContent = res.why === 'time' ? 'TIME\'S UP!' : res.why === 'ally' ? 'DADA\'S KITE FELL' : 'KITES CUT!';
  $('rScore').textContent = res.score; $('rCuts').textContent = res.cuts; $('rCombo').textContent = 'x' + res.bestCombo; $('rCoins').textContent = '+0';
  const tips = TIPS[res.why] || TIPS.kites; $('rTip').textContent = res.won ? (n === 40 ? 'You beat Baadshah!' : res.stars < 3 ? (LEVELS[n - 1].obj === 'nolose' ? 'Finish faster for more stars.' : 'Lose no kite for 3 stars.') : 'Perfect! 3 stars!') : tips[(Math.random() * tips.length) | 0];
  $('rNext').classList.toggle('hide', !res.won); $('rNext').textContent = n === 40 ? 'FINALE ▶' : 'NEXT ▶';
  const stars = document.querySelectorAll('.rstars i'); stars.forEach(s => s.classList.remove('on'));
  for (let i = 0; i < res.stars; i++) setTimeout(() => { stars[i].classList.add('on'); SFX.star(i); buzz(20); }, 450 + i * 380);
  let c = 0; const step = Math.max(1, Math.ceil(gained / 25)); const iv = setInterval(() => { c = Math.min(gained, c + step); $('rCoins').textContent = '+' + c; if (c % (step * 3) === 0) SFX.coin(); if (c >= gained) clearInterval(iv); }, 40);
  if (!res.won) Music.start('menu');
};
click('rNext', () => { const n = lastRes.n; const after = SCENE_AFTER[n];
  const nextLevel = () => { if (n >= 40) openMap(); else enterLevel(n + 1); };
  if (after && !SAVE.seen[after]) go(() => playScene(after, () => { if (n >= 40) openMap(); else { only('map'); openMap(); enterLevel(n + 1); } }));
  else go(() => { only('map'); openMap(); nextLevel(); }); });
click('rRetry', () => go(() => startLevel(lastRes.n)));
click('rMap', () => go(openMap));

// ---------- toggles ----------
function renderToggles(){
  document.querySelectorAll('.toggles').forEach(box => {
    box.innerHTML = [['sound', '🔊 Sound effects'], ['music', '🥁 Music'], ['voice', '🗣 Voice']].map(([k, l]) => `<button class="tg ${SET[k] ? '' : 'off'}" data-k="${k}">${l}<em>${SET[k] ? 'ON' : 'OFF'}</em></button>`).join('');
  });
}
document.addEventListener('click', e => { const t = e.target.closest('.tg'); if (!t) return; initAudio(); const k = t.dataset.k; SET[k] = !SET[k]; SAVE[k] = SET[k]; persist(); applyAudioSettings(); if (k === 'music' && SET.music && !Music.on) Music.start(screen === 'game' ? 'play' : 'menu'); renderToggles(); SFX.tap(); });

// ---------- shop ----------
let shopTab = 'kites', shopFrom = 'title';
function openShop(from){ shopFrom = from; renderShop(); show('shop'); }
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => { SFX.tap(); shopTab = t.dataset.tab; document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === t)); renderShop(); }));
click('sClose', () => { hide('shop'); if (shopFrom === 'title') openTitle(); else $('mCoins').textContent = '🪙 ' + SAVE.coins; });
function renderShop(){
  $('sCoins').textContent = '🪙 ' + SAVE.coins;
  const list = $('sList'); list.innerHTML = '';
  const items = shopTab === 'kites' ? SKINS : MANJAS;
  for (const it of items) {
    const own = shopTab === 'kites' ? SAVE.kites.includes(it.id) : SAVE.manjas.includes(it.id);
    const eq = shopTab === 'kites' ? SAVE.kite === it.id : SAVE.manja === it.id;
    const d = document.createElement('div'); d.className = 'item' + (eq ? ' eq' : '');
    const c = document.createElement('canvas'); c.width = 192; c.height = 160; const x = c.getContext('2d'); x.scale(2, 2);
    if (shopTab === 'kites') drawKiteIcon(x, 48, 30, 20, it, 0.6, -0.15);
    else { x.strokeStyle = it.col; x.lineWidth = 3; x.beginPath(); x.moveTo(8, 70); x.quadraticCurveTo(50, 10, 90, 22); x.stroke(); x.fillStyle = '#c98a3a'; x.beginPath(); x.arc(20, 62, 14, 0, 6.283); x.fill(); x.fillStyle = it.col; x.beginPath(); x.arc(20, 62, 9, 0, 6.283); x.fill(); x.fillStyle = '#7a4a1a'; x.beginPath(); x.arc(20, 62, 3, 0, 6.283); x.fill(); }
    d.appendChild(c);
    const stats = shopTab === 'manja' && it.price ? `Sharp +${Math.round(it.sharp * 100)}% · Strong +${Math.round(it.strong * 100)}% · Long +${Math.round(it.long * 100)}%` : (it.desc || (it.price ? 'Cosmetic design' : 'Your first kite'));
    d.insertAdjacentHTML('beforeend', `<b>${it.name}</b><small>${stats}</small>`);
    const b = document.createElement('button'); b.dataset.id = it.id;
    if (eq) { b.textContent = 'EQUIPPED'; b.className = 'eqd'; }
    else if (own) { b.textContent = 'USE'; b.className = 'own'; }
    else { b.textContent = '🪙 ' + it.price; b.disabled = SAVE.coins < it.price; }
    b.addEventListener('click', () => {
      initAudio();
      if (!own) { if (SAVE.coins < it.price) return; SAVE.coins -= it.price; (shopTab === 'kites' ? SAVE.kites : SAVE.manjas).push(it.id); SFX.buy(); }
      else SFX.tap();
      if (shopTab === 'kites') SAVE.kite = it.id; else SAVE.manja = it.id;
      persist(); renderShop(); if (G && G.mode === 'demo') { G.player = newPlayer(false); G.skin = gear().skin; G.man = gear().man; }
    });
    d.appendChild(b); list.appendChild(d);
  }
}

// ---------- loop & adaptive quality ----------
let last = performance.now();
function frame(now){
  let dt = (now - last) / 1000; last = now; if (dt > 0.05) dt = 0.05;
  const visible = screen !== 'map' && screen !== 'story';
  if (G && visible && !G.paused && G.mode !== 'wonScreen' && G.mode !== 'lostScreen') { const steps = dt > 0.025 ? 2 : 1; for (let i = 0; i < steps; i++) update(dt / steps); }
  if (visible) render();
  // adaptive quality: if under ~45 fps for 3 s while playing, go low
  if (G && G.mode === 'play' && !G.paused && !Q.low) { Q.fpsAcc += dt; Q.fpsN++; if (Q.fpsAcc >= 1) { const fps = Q.fpsN / Q.fpsAcc; Q.slowT = fps < 45 ? Q.slowT + 1 : 0; Q.fpsAcc = 0; Q.fpsN = 0; if (Q.slowT >= 3) { Q.low = true; Q.partCap = 160; resize(); placePause(); ev('quality_low', {fps: Math.round(fps)}); } } }
  requestAnimationFrame(frame);
}

// ---------- boot ----------
resize();
openTitle();
requestAnimationFrame(frame);
document.addEventListener('pointerdown', () => { initAudio(); if (!Music.on && SET.music) Music.start(screen === 'game' ? 'play' : 'menu'); }, {once: true});
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});

// test hooks
window.__kwStory = [];
window.__kw = {
  events, T, VERSION, Voice, Story, LEVELS,
  save: () => JSON.parse(JSON.stringify(SAVE)),
  screen: () => screen,
  toScreen: (x, y) => ({x: x * SC + OX, y: y * SC}),
  startLevel: n => { SAVE.unlocked = Math.max(SAVE.unlocked, n); persist(); startLevel(n); },
  state(){ if (!G) return null; const P = G.player; return {mode: G.mode, level: G.n, obj: LV.obj, goal: LV.goal, paused: G.paused, t: G.t, timeLeft: G.timeLeft, score: G.score, cuts: G.cuts, lives: G.lives, combo: G.combo, bestCombo: G.bestCombo, wind: G.wind,
    golden: G.golden, lanterns: G.lanterns, bossLeft: G.bossLeft, phase: G.phase, allyLives: G.allyLives, allyPech: !!G.allyPech, night: G.night, low: Q.low,
    pech: G.pech ? {id: G.pech.r.id, bar: G.pech.bar, sweet: G.pech.sweet, pp: G.pech.pp, rp: G.pech.rp, x: G.pech.x, y: G.pech.y} : null,
    player: {x: P.x, y: P.y, tx: P.tx, ty: P.ty, falling: P.falling, inv: P.inv, tangle: P.tangle || 0, ax: P.anchor.x, ay: P.anchor.y},
    ally: G.ally ? {x: G.ally.x, y: G.ally.y, falling: G.ally.falling} : null,
    rivals: G.rivals.map(r => ({id: r.id, x: r.x, y: r.y, ax: r.anchor.x, ay: r.anchor.y, boss: r.boss, kind: r.kind, falling: r.falling, state: r.state, target: r.target, launching: r.launching, lantern: !!r.lantern})),
    W, H, SC, OX, speed: inp.speed}; },
};
