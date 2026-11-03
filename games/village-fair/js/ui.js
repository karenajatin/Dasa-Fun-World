// Village Fair — screens, save, map, shop, lucky wheel, settings, results, boot
'use strict';
const $ = id => document.getElementById(id);
const SAVE_KEY = 'villagefair-save-v1';
let SAVE = loadSave(); window.SAVE = SAVE;
function loadSave(){
  let s = null; try { s = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) {}
  const d = {v: 1, unlocked: 1, stars: {}, best: {}, tickets: 0, owned: [], hat: 'none', outfit: 'pink', ring: 'classic', basket: 'wicker', boostOn: {}, seen: {}, sound: true, music: true, voice: true, vib: true, spin: '', cleared: {}};
  s = Object.assign(d, s || {}); return s;
}
function persist(){ try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) {} }
function applySet(){ SET.sound = SAVE.sound; SET.music = SAVE.music; SET.voice = SAVE.voice; SET.vib = SAVE.vib; applyAudioSettings(); }
function totalStars(){ return Object.values(SAVE.stars).reduce((a, b) => a + b, 0); }
function owns(k){ return ['none', 'pink', 'classic', 'wicker'].includes(k) || SAVE.owned.includes(k); }
function toast(t){ const el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => el.classList.remove('on'), 1600); }
function today(){ const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }

const UI = {
  cur: 'title', overlays: ['title', 'story', 'map', 'card', 'pause', 'result', 'shop', 'wheel', 'settings'], back: null, sel: 1,
  show(id){ if (id !== 'story' && typeof Story !== 'undefined' && Story.running) { Story.running = false; Voice.token++; Voice.stop(); Music.duck(false); }
    this.overlays.forEach(o => $(o).classList.toggle('hide', o !== id)); this.cur = id; if (id === 'title') this.title(); if (id === 'map') this.map(); },
  overlay(id, on){ $(id).classList.toggle('hide', !on); },
  fade(fn){ const f = $('fade'); f.classList.add('on'); setTimeout(() => { fn(); f.classList.remove('on'); }, 260); },
  // ---------- title ----------
  title(){
    setTheme(0); RUN.mode = 'idle'; Music.start(0);
    $('tTix').textContent = '🎟 ' + SAVE.tickets; $('tStars').textContent = '⭐ ' + totalStars() + '/' + LEVELS.length * 3;
    $('playBtn').textContent = SAVE.seen.prologue ? 'खेलो' : 'कहानी शुरू करो';
  },
  drawMeera(cvs, s, extra){
    const c = cvs.getContext('2d'), w = cvs.width, h = cvs.height; c.clearRect(0, 0, w, h);
    drawChar(c, 'M', w / 2, h * 0.42, s, TIME, Object.assign({hat: SAVE.hat, outfit: SAVE.outfit}, extra || {}));
  },
  // ---------- map ----------
  map(){
    setTheme(3); RUN.mode = 'idle';
    $('mTix').textContent = '🎟 ' + SAVE.tickets;
    const inner = $('mapInner'), Wd = Math.min(innerWidth, 520), stepY = 96, zoneH = 7 * stepY + 130, top = 70;
    const total = top + CHAPTERS.length * zoneH + 40; inner.style.height = total + 'px';
    inner.querySelectorAll('.node,.zone,#mMeera').forEach(e => e.remove());
    // background: one band per night, path, stalls
    const bgc = $('mapBg'), d = Math.min(2, devicePixelRatio || 1); bgc.width = innerWidth * d; bgc.height = total * d; bgc.style.height = total + 'px';
    const c = bgc.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0);
    const pts = [];
    LEVELS.forEach((l, i) => { const z = l.ch - 1, k = i % 7; const y = top + z * zoneH + 130 + k * stepY; const x = innerWidth / 2 + Math.sin(i * 0.95 + 0.4) * Math.min(innerWidth, 420) * 0.3; pts.push([x, y]); });
    CHAPTERS.forEach((ch, z) => {
      const T = THEMES[ch.theme], y0 = top + z * zoneH, g = c.createLinearGradient(0, y0, 0, y0 + zoneH);
      g.addColorStop(0, T.sky[0]); g.addColorStop(0.55, T.sky[1]); g.addColorStop(1, T.ground[1]); c.fillStyle = g; c.fillRect(0, y0, innerWidth, zoneH);
      const R = srand(z + 3);
      for (let i = 0; i < 30; i++) { c.fillStyle = CONF[i % 6]; c.globalAlpha = 0.5; c.beginPath(); c.arc(R() * innerWidth, y0 + R() * zoneH, 2 + R() * 2, 0, 7); c.fill(); }
      c.globalAlpha = 1;
      // stalls along the edges
      for (let i = 0; i < 4; i++) { const sx = i % 2 ? innerWidth - 44 : 4, sy = y0 + 120 + i * zoneH / 4.6, cols = [['#ff2d6f', '#fff'], ['#2e8bff', '#ffd23f'], ['#ff8a1f', '#fff'], ['#5bdc5b', '#fff']][(i + z) % 4];
        for (let j = 0; j < 4; j++) { c.fillStyle = cols[j % 2]; c.fillRect(sx + j * 10, sy, 10, 14); } c.fillStyle = 'rgba(255,240,200,.85)'; c.fillRect(sx + 3, sy + 14, 34, 18); }
      const deco = [['🎡', '🎈', '🎪'], ['🎯', '🦆', '🍿'], ['🍬', '🍯', '🏮'], ['🎡', '🐒', '🎠'], ['🥁', '🎆', '🏆']][z];
      c.font = '34px VFDeva, system-ui'; c.textAlign = 'center'; deco.forEach((e, i) => { c.globalAlpha = 0.9; c.fillText(e, i % 2 ? innerWidth - 70 : 70, y0 + 210 + i * zoneH / 3.6); }); c.globalAlpha = 1;
      // string lights across the top of each night
      for (let x = 10; x < innerWidth; x += 22) { const yy = y0 + 64 + Math.sin(x / innerWidth * Math.PI) * 18; c.fillStyle = CONF[(x / 22 | 0) % 6]; c.beginPath(); c.arc(x, yy, 3.5, 0, 7); c.fill(); }
    });
    c.strokeStyle = 'rgba(255,235,180,.55)'; c.lineWidth = 16; c.lineCap = 'round'; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.9)'; c.setLineDash([2, 14]); c.lineWidth = 5; c.stroke(); c.setLineDash([]);
    // zone headers + replay buttons
    CHAPTERS.forEach((ch, z) => {
      const el = document.createElement('div'); el.className = 'zone'; el.style.top = (top + z * zoneH) + 'px';
      const unlocked = SAVE.unlocked >= z * 7 + 1;
      el.innerHTML = '<span class="zt"><small>' + ch.night + '</small>' + ch.icon + ' ' + ch.name + '</span>' + (unlocked && SAVE.seen[ch.intro] ? '<button class="chip zr" data-s="' + ch.intro + '">▶ कहानी</button>' : '');
      inner.appendChild(el);
    });
    inner.querySelectorAll('.zr').forEach(b => b.onclick = e => { e.stopPropagation(); Story.play(b.dataset.s, () => UI.show('map')); });
    // nodes
    LEVELS.forEach((l, i) => {
      const b = document.createElement('button'); b.className = 'node' + (l.boss ? ' boss' : '');
      const n = l.n, st = SAVE.stars[n] || 0, lock = n > SAVE.unlocked;
      if (lock) b.classList.add('lock'); if (st) b.classList.add('done'); if (n === SAVE.unlocked) b.classList.add('cur');
      b.style.left = pts[i][0] + 'px'; b.style.top = pts[i][1] + 'px';
      b.innerHTML = (lock ? '🔒' : l.boss ? (l.n === 35 ? '🏆' : '★') : n) + '<span class="st">' + [0, 1, 2].map(k => '<i class="' + (k < st ? 'on' : '') + '">★</i>').join('') + '</span>';
      b.setAttribute('aria-label', 'लेवल ' + n + ' ' + l.name);
      b.onclick = () => { if (lock) { SFX.buzz(); toast('पहले लेवल ' + (n - 1) + ' जीतो!'); return; } SFX.ui(); UI.card(n); };
      inner.appendChild(b);
    });
    const cur = Math.min(SAVE.unlocked, LEVELS.length), m = document.createElement('canvas'); m.id = 'mMeera'; m.width = 128; m.height = 144;
    m.style.left = pts[cur - 1][0] + 'px'; m.style.top = pts[cur - 1][1] + 'px'; inner.appendChild(m); this.drawMeera(m, 0.9);
    setTimeout(() => { $('mapScroll').scrollTop = Math.max(0, pts[cur - 1][1] - innerHeight * 0.55); }, 30);
    const sb = $('spinBtn'), used = SAVE.spin === today(); sb.classList.toggle('used', used); sb.classList.toggle('ready', !used);
  },
  // ---------- level card ----------
  card(n){
    const l = LEVELS[n - 1], ch = CHAPTERS[l.ch - 1]; this.sel = n;
    $('cChap').textContent = ch.night + ' · लेवल ' + n + (l.boss ? ' · बॉस' : ''); $('cName').textContent = l.name;
    $('cGames').innerHTML = l.games.map(([g, s]) => '<span>' + GAMEINFO[g].icon + ' ' + GAMEINFO[g].name + ' ' + (s + (SAVE.owned.includes('extratime') && SAVE.boostOn.extratime !== false ? 3 : 0)) + ' सेकंड</span>').join('');
    const rc = $('cRival');
    if (l.boss) { rc.classList.remove('hide'); const c = rc.getContext('2d'); c.clearRect(0, 0, 220, 220); c.save(); c.beginPath(); c.arc(110, 110, 104, 0, 7); c.fillStyle = '#3a2340'; c.fill(); c.clip(); drawChar(c, l.boss === 'bandu' ? 'monkey' : RIVALS[l.boss].who, 110, 110, 1.2, 0, {trophy: l.boss === 'bandu'}); c.restore(); }
    else rc.classList.add('hide');
    if (l.chase) { $('cGoal').textContent = 'समय खत्म होने से पहले बंदू को पकड़ो!'; $('cStars').innerHTML = '<li>★ उसे पकड़ो</li><li>★★ 6 सेकंड बचे हों</li><li>★★★ 14 सेकंड बचे हों</li>'; }
    else if (l.boss) { $('cGoal').textContent = RIVALS[l.boss].name + ' के ' + l.target + ' अंक से आगे निकलो!'; $('cStars').innerHTML = '<li>★ <b>' + l.target + '</b></li><li>★★ <b>' + Math.ceil(l.target * 1.2) + '</b> · ★★★ <b>' + Math.ceil(l.target * 1.4) + '</b></li>'; }
    else { $('cGoal').textContent = 'लक्ष्य: ' + l.target + ' अंक'; $('cStars').innerHTML = '<li>★ <b>' + l.target + '</b> · ★★ <b>' + Math.ceil(l.target * 1.3) + '</b> · ★★★ <b>' + Math.ceil(l.target * 1.6) + '</b></li>' + (SAVE.best[n] ? '<li>आपका सबसे अच्छा: ' + SAVE.best[n] + '</li>' : ''); }
    $('cGo').textContent = l.boss ? 'मुकाबला! 🏆' : 'खेलो! 🎪';
    this.overlay('card', true); this.cur = 'card';
  },
  go(n){
    const l = LEVELS[n - 1], ch = CHAPTERS[l.ch - 1];
    const run = () => this.fade(() => { this.overlays.forEach(o => $(o).classList.add('hide')); this.cur = 'game'; startLevel(n); });
    if ((n - 1) % 7 === 0 && !SAVE.seen[ch.intro]) return Story.play(ch.intro, run);
    if (n === 35 && !SAVE.seen.prefinal) return Story.play('prefinal', run);
    run();
  },
  // ---------- results ----------
  showResult(r){
    const l = LEVELS[r.n - 1], prev = SAVE.stars[r.n] || 0, newStars = Math.max(0, r.stars - prev), firstClear = r.win && !SAVE.cleared[r.n];
    let tix = Math.floor(Math.max(0, r.score) / 40) + newStars * 20 + (firstClear && l.boss ? 100 : 0);
    if (!r.win) tix = Math.floor(tix / 2);
    SAVE.tickets += tix; if (r.win) { SAVE.stars[r.n] = Math.max(prev, r.stars); SAVE.cleared[r.n] = 1; SAVE.unlocked = Math.max(SAVE.unlocked, Math.min(LEVELS.length, r.n + 1)); }
    SAVE.best[r.n] = Math.max(SAVE.best[r.n] || 0, r.score); persist();
    this.lastResult = r; this.lastResult.tix = tix; this.lastResult.firstClear = firstClear;
    $('rTitle').textContent = r.win ? (l.chase ? 'बंदू पकड़ा गया!' : l.boss ? 'तुम जीत गईं!' : pick(['शानदार!', 'बहुत बढ़िया!', 'वाह, कमाल!'])) : 'बस थोड़ा सा!';
    $('rTitle').className = 'rtitle' + (r.win ? ' win' : '');
    $('rSub').textContent = r.win ? (l.boss ? RIVALS[l.boss].name + ' हार गए!' : 'लेवल ' + r.n + ' पार') : (l.chase ? 'इस बार बंदू भाग गया। ज़्यादा टिकट लो और पास पहुँचो!' : 'सिर्फ़ ' + Math.max(1, (l.boss ? r.rival : r.target) - r.score) + ' अंक कम। फिर से खेलो!');
    $('rScore').textContent = r.score; $('rTarget').textContent = l.chase ? (r.win ? '✓' : r.gap + '%') : (l.boss ? r.rival : r.target); $('rTLabel').textContent = l.chase ? (r.win ? 'पकड़ लिया!' : 'दूरी बाकी') : l.boss ? RIVALS[l.boss].short + ' के अंक' : 'लक्ष्य';
    $('rCombo').textContent = r.bestCombo; $('rTix').textContent = '+' + tix;
    $('rGames').textContent = l.games.length > 1 ? l.games.map(([g], i) => GAMEINFO[g].icon + ' ' + r.gscore[i]).join('   ') : '';
    $('rTip').textContent = r.win ? (r.stars < 3 ? 'टिप: लगातार पकड़ो तो x2, x3, x4 अंक मिलते हैं।' : 'कमाल! तीनों तारे!') : this.tip(l);
    $('rNext').classList.toggle('hide', !r.win); $('rNext').textContent = r.n === 35 ? 'कहानी का अंत ▶' : 'आगे ▶';
    const st = document.querySelectorAll('#result .rstars i'); st.forEach(s => s.className = '');
    this.overlay('result', true); this.cur = 'result';
    st.forEach((s, k) => setTimeout(() => { if (k < r.stars) { s.className = 'on'; tone(660 + k * 220, 0.2, 'triangle', 0.2); buzzv(20); } }, 350 + k * 330));
    if (tix) setTimeout(() => SFX.coin(), 1300);
  },
  tip(l){
    const g = l.games.map(x => x[0]);
    const tips = {ring: 'रिंग: बोतल से थोड़ा आगे स्वाइप करो, पट्टा चलता रहता है।', balloon: 'गुब्बारे: जल्दी-जल्दी टैप करो ताकि कॉम्बो चलता रहे, काले छोड़ दो।', sweet: 'मिठाई: पत्थर को नीचे जाने दो, छूटी मिठाई से बस कॉम्बो टूटता है।', shoot: 'निशाना: गोल निशाने ज़्यादा अंक देते हैं, घेरा बंद होने से पहले मारो।', stack: 'मीनार: डिब्बा ठीक मीनार के ऊपर हो तब टैप करो।', cart: 'कार: टिकटों की लाइन पर चलो, तारा लो तो डबल अंक।', dhol: 'ढोल: थाप पीली लाइन को छुए तब टैप करो, पहले नहीं।'};
    return tips[pick(g)];
  },
  afterWin(){
    const r = this.lastResult, l = LEVELS[r.n - 1], ch = CHAPTERS[l.ch - 1];
    const nxt = () => { if (r.n >= LEVELS.length) this.show('map'); else { this.show('map'); this.card(r.n + 1); } };
    if (l.boss && (r.firstClear || r.n === 35) && ch.outro) return Story.play(ch.outro, r.n === 35 ? () => this.show('map') : nxt);
    nxt();
  },
  // ---------- shop ----------
  tab: 'hat',
  shop(){ this.overlay('shop', true); this.shopRender(); },
  shopRender(){
    $('sTix').textContent = '🎟 ' + SAVE.tickets; this.drawMeera($('sPreview'), 1.25);
    document.querySelectorAll('#shop .tab').forEach(t => t.classList.toggle('on', t.dataset.tab === this.tab));
    const icon = {none: '🙂', flower: '🌼', sunhat: '👒', pagdi: '👳', shades: '🕶', crown: '👑', pink: '🩷', green: '💚', blue: '💙', red: '❤️', purple: '💜', classic: '⭕', rainbow: '🌈', golden: '💛', wicker: '🧺', thali: '🍽', goldbasket: '🏆', bigbasket: '🧺', luckyrings: '🍀', steady: '🎯', extratime: '⏱'};
    let rows = [];
    const slot = {hat: 'hat', outfit: 'outfit'};
    if (this.tab === 'hat' || this.tab === 'outfit') rows = SHOP[this.tab].map(([k, nm, cost]) => ({k, nm, cost, slot: this.tab}));
    if (this.tab === 'gear') rows = SHOP.ring.map(([k, nm, cost]) => ({k, nm, cost, slot: 'ring', sub: 'रिंग फेंको'})).concat(SHOP.basket.map(([k, nm, cost]) => ({k, nm, cost, slot: 'basket', sub: 'मिठाई पकड़ो'})));
    if (this.tab === 'boost') rows = SHOP.boost.map(([k, nm, sub, cost]) => ({k, nm, cost, sub, slot: 'boost'}));
    $('sList').innerHTML = rows.map(r => {
      let btn;
      if (r.slot === 'boost') btn = owns(r.k) ? '<button class="' + (SAVE.boostOn[r.k] === false ? '' : 'eq') + '" data-k="' + r.k + '" data-a="toggle">' + (SAVE.boostOn[r.k] === false ? 'बंद' : 'चालू ✓') + '</button>' : '<button class="' + (SAVE.tickets >= r.cost ? '' : 'no') + '" data-k="' + r.k + '" data-a="buy" data-c="' + r.cost + '">🎟 ' + r.cost + '</button>';
      else if (SAVE[r.slot] === r.k) btn = '<button class="eq">पहना है ✓</button>';
      else if (owns(r.k)) btn = '<button data-k="' + r.k + '" data-s="' + r.slot + '" data-a="eq">पहनो</button>';
      else btn = '<button class="' + (SAVE.tickets >= r.cost ? '' : 'no') + '" data-k="' + r.k + '" data-s="' + r.slot + '" data-a="buy" data-c="' + r.cost + '">🎟 ' + r.cost + '</button>';
      return '<div class="item"><span class="ic">' + (icon[r.k] || '★') + '</span><span class="nm">' + r.nm + (r.sub ? '<small>' + r.sub + '</small>' : '') + '</span>' + btn + '</div>';
    }).join('');
    $('sList').querySelectorAll('button[data-a]').forEach(b => b.onclick = () => {
      const k = b.dataset.k, a = b.dataset.a, s = b.dataset.s;
      if (a === 'buy') { const c = +b.dataset.c; if (SAVE.tickets < c) { SFX.buzz(); toast((c - SAVE.tickets) + ' टिकट और चाहिए'); return; } SAVE.tickets -= c; SAVE.owned.push(k); if (s) SAVE[s] = k; SFX.coin(); buzzv(20); toast('खरीद लिया!'); }
      if (a === 'eq') { SAVE[s] = k; SFX.ui(); }
      if (a === 'toggle') { SAVE.boostOn[k] = SAVE.boostOn[k] === false; SFX.ui(); }
      persist(); this.shopRender(); $('mTix').textContent = '🎟 ' + SAVE.tickets; $('tTix').textContent = '🎟 ' + SAVE.tickets;
    });
  },
  // ---------- lucky wheel ----------
  PRIZES: [20, 50, 30, 100, 25, 60, 40, 150],
  wheelA: 0, spinning: false,
  wheel(){ this.overlay('wheel', true); $('wheelRes').textContent = SAVE.spin === today() ? 'कल फिर घुमाना!' : 'रोज़ एक मुफ़्त चक्कर!'; $('wSpin').disabled = SAVE.spin === today(); $('wSpin').style.opacity = SAVE.spin === today() ? 0.5 : 1; this.drawWheel(); },
  drawWheel(){
    const c = $('wheelCv').getContext('2d'), r = 250, n = this.PRIZES.length; c.setTransform(1, 0, 0, 1, 260, 260); c.clearRect(-260, -260, 520, 520);
    c.save(); c.rotate(this.wheelA);
    for (let i = 0; i < n; i++) { c.fillStyle = CONF[i % 6]; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r - 10, i * 2 * Math.PI / n, (i + 1) * 2 * Math.PI / n); c.fill(); c.save(); c.rotate((i + 0.5) * 2 * Math.PI / n); c.fillStyle = '#3a2340'; c.font = '900 40px VFDeva, system-ui'; c.textAlign = 'right'; c.fillText('🎟' + this.PRIZES[i], r - 34, 14); c.restore(); }
    c.restore(); c.strokeStyle = '#ffd23f'; c.lineWidth = 16; c.beginPath(); c.arc(0, 0, r - 10, 0, 7); c.stroke();
    for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#fff' : '#ff2d6f'; c.beginPath(); c.arc(Math.cos(i * Math.PI / 8) * (r - 10), Math.sin(i * Math.PI / 8) * (r - 10), 7, 0, 7); c.fill(); }
    c.fillStyle = '#e8245f'; c.beginPath(); c.arc(0, 0, 34, 0, 7); c.fill(); c.fillStyle = '#fff'; c.font = '900 22px VFDeva, system-ui'; c.textAlign = 'center'; c.fillText('घुमाओ', 0, 8);
    c.fillStyle = '#3a2340'; c.beginPath(); c.moveTo(-18, -r - 4); c.lineTo(18, -r - 4); c.lineTo(0, -r + 36); c.fill();
  },
  spin(){
    if (this.spinning || SAVE.spin === today()) return; initAudio(); this.spinning = true; SAVE.spin = today(); persist();
    const n = this.PRIZES.length, idx = (Math.random() * n) | 0, seg = 2 * Math.PI / n;
    const target = -Math.PI / 2 - (idx + 0.5) * seg + (Math.random() - 0.5) * seg * 0.6, start = this.wheelA, end = target - Math.ceil((start - target) / (2 * Math.PI) + 4) * 2 * Math.PI;
    const t0 = performance.now(), dur = 3600; let lastSeg = -1;
    const step = now => { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 4); this.wheelA = start + (end - start) * e; this.drawWheel();
      const sg = Math.floor(this.wheelA / seg); if (sg !== lastSeg) { lastSeg = sg; SFX.spinTick(); }
      if (k < 1) requestAnimationFrame(step); else { this.spinning = false; const p = this.PRIZES[idx]; SAVE.tickets += p; persist(); $('wheelRes').textContent = 'तुम्हें मिले 🎟 ' + p + '!'; SFX.gold(); buzzv([30, 30, 60]); $('wSpin').disabled = true; $('wSpin').style.opacity = 0.5; $('mTix').textContent = '🎟 ' + SAVE.tickets; $('spinBtn').classList.add('used'); $('spinBtn').classList.remove('ready'); } };
    requestAnimationFrame(step);
  },
  // ---------- settings toggles ----------
  toggles(){
    document.querySelectorAll('.toggles').forEach(box => {
      box.innerHTML = [['sound', '🔊 आवाज़ें'], ['music', '🎵 संगीत'], ['voice', '🗣 बोली'], ['vib', '📳 कंपन']].map(([k, nm]) => '<button class="tog' + (SAVE[k] ? '' : ' off') + '" data-k="' + k + '">' + nm + (SAVE[k] ? ' चालू' : ' बंद') + '</button>').join('');
      box.querySelectorAll('.tog').forEach(b => b.onclick = () => { initAudio(); SAVE[b.dataset.k] = !SAVE[b.dataset.k]; persist(); applySet(); if (b.dataset.k === 'music' && SAVE.music) Music.start(Music.style); this.toggles(); SFX.ui(); });
    });
  },
};

// ---------- wiring ----------
$('playBtn').onclick = () => { if (Story.running || UI.cur !== 'title') return; initAudio(); SFX.ui(); if (!SAVE.seen.prologue) Story.play('prologue', () => UI.show('map')); else UI.fade(() => UI.show('map')); };
$('shopBtn').onclick = () => { initAudio(); SFX.ui(); UI.back = 'title'; UI.shop(); };
$('setBtn').onclick = () => { initAudio(); SFX.ui(); UI.toggles(); UI.overlay('settings', true); };
$('setClose').onclick = () => UI.overlay('settings', false);
$('resetBtn').onclick = () => { if (confirm('सारी प्रगति, टिकट और दुकान का सामान मिटा दें?')) { localStorage.removeItem(SAVE_KEY); SAVE = loadSave(); window.SAVE = SAVE; applySet(); UI.overlay('settings', false); UI.show('title'); } };
$('mapBack').onclick = () => { SFX.ui(); UI.show('title'); };
$('mapShop').onclick = () => { SFX.ui(); UI.shop(); };
$('sClose').onclick = () => { UI.overlay('shop', false); if (UI.cur === 'map') UI.map(); if (UI.cur === 'title') UI.title(); };
document.querySelectorAll('#shop .tab').forEach(t => t.onclick = () => { UI.tab = t.dataset.tab; SFX.ui(); UI.shopRender(); });
$('spinBtn').onclick = () => { SFX.ui(); UI.wheel(); };
$('wSpin').onclick = () => UI.spin();
$('wClose').onclick = () => { if (!UI.spinning) UI.overlay('wheel', false); };
$('cGo').onclick = () => { if (UI.cur !== 'card') return; UI.cur = 'starting'; SFX.ui(); UI.go(UI.sel); };
$('cBack').onclick = () => { UI.overlay('card', false); UI.cur = 'map'; };
$('pauseBtn').onclick = () => { if (RUN.mode !== 'play' && RUN.mode !== 'card') return; RUN.paused = true; if (AC) AC.suspend(); UI.toggles(); UI.overlay('pause', true); };
$('pResume').onclick = () => { RUN.paused = false; if (AC) AC.resume(); UI.overlay('pause', false); };
$('pRetry').onclick = () => { RUN.paused = false; if (AC) AC.resume(); UI.overlay('pause', false); startLevel(RUN.L.n); };
$('pMap').onclick = () => { RUN.paused = false; if (AC) AC.resume(); UI.overlay('pause', false); quitLevel(); UI.show('map'); };
$('rNext').onclick = () => { if (UI.cur !== 'result') return; SFX.ui(); UI.overlay('result', false); quitLevel(); UI.afterWin(); };
$('rRetry').onclick = () => { if (UI.cur !== 'result') return; SFX.ui(); UI.overlay('result', false); UI.cur = 'game'; startLevel(UI.lastResult.n); };
$('rMap').onclick = () => { if (UI.cur !== 'result') return; SFX.ui(); UI.overlay('result', false); quitLevel(); UI.show('map'); };
$('celBtn').onclick = () => { Story.finish(); };
document.addEventListener('visibilitychange', () => { if (document.hidden && RUN.mode === 'play' && !RUN.paused) $('pauseBtn').onclick(); });

// title portrait animates
(function tAnim(){ if (UI.cur === 'title') UI.drawMeera($('tMeera'), 2.0); requestAnimationFrame(tAnim); })();
applySet(); Story.init(); resize(); try { document.fonts.load('900 20px VFDeva', 'मेला'); } catch (e) {} UI.show('title'); requestAnimationFrame(frame);
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});

// test hooks
window.__vf = {
  state: () => ({mode: RUN.mode, ui: UI.cur, n: RUN.L && RUN.L.n, gi: RUN.gi, game: RUN.gkey, gameT: RUN.gameT, gLen: RUN.gLen, modeT: RUN.modeT, total: RUN.total, target: RUN.L && RUN.L.target, rival: RUN.rival, combo: RUN.combo, bestCombo: RUN.bestCombo, W, H, paused: RUN.paused, gap: RUN.chaseGap, caught: RUN.caught, fps: FPS,
    g: RUN.gkey && MG[RUN.gkey].state ? MG[RUN.gkey].state() : null, result: RUN.result, stats: RUN.stats, story: Story.running ? {id: Story.id, i: Story.i, line: Story.lineK} : null}),
  startLevel: n => { UI.overlays.forEach(o => $(o).classList.add('hide')); UI.cur = 'game'; startLevel(n); },
  save: () => JSON.parse(JSON.stringify(SAVE)), voice: () => Voice.log.slice(), UI, Story,
};
