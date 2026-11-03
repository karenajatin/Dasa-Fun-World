// Village Fair — story scenes: illustrated canvas + text box + voice; tap to advance, SKIP any time
'use strict';
const SC_THEME = {gate: 0, ring: 0, gallery: 1, bazaar: 2, wheel: 3, stage: 4};
const Story = {
  cv: null, c: null, id: null, sc: null, i: 0, typing: 0, shown: '', full: '', t: 0, onDone: null, autoT: -1, running: false, ending: false,
  init(){ this.cv = document.getElementById('sc'); this.c = this.cv.getContext('2d');
    document.getElementById('story').addEventListener('pointerdown', e => { if (e.target.closest('#skipBtn') || e.target.closest('#celebrate')) return; this.tap(); });
    document.getElementById('skipBtn').addEventListener('click', e => { e.stopPropagation(); this.finish(); });
  },
  play(id, onDone){
    initAudio(); const sc = SCENES[id]; if (!sc) { onDone && onDone(); return; }
    this.id = id; this.sc = sc; this.i = -1; this.onDone = onDone; this.running = true; this.ending = false; this.t = 0;
    SAVE.seen[id] = 1; persist();
    UI.show('story'); document.getElementById('celebrate').classList.add('hide'); document.getElementById('stBox').classList.remove('hide'); document.getElementById('skipBtn').classList.remove('hide');
    this.resize(); setTheme(SC_THEME[sc.bg] || 0); Music.start(SC_THEME[sc.bg] || 0); Music.duck(true);
    const card = document.getElementById('stCard');
    if (sc.title) { document.getElementById('stTitle').textContent = sc.title; document.getElementById('stSub').textContent = sc.sub || ''; card.classList.remove('hide'); card.classList.remove('go'); void card.offsetWidth; card.classList.add('go'); setTimeout(() => this.next(), 1500); }
    else { card.classList.add('hide'); this.next(); }
    Voice.token++;
  },
  resize(){ const d = Math.min(2, window.devicePixelRatio || 1); this.cv.width = Math.round(innerWidth * d); this.cv.height = Math.round(innerHeight * d); this.d = d; },
  next(){
    if (!this.running) return;
    this.i++;
    if (this.i >= this.sc.lines.length) { if (this.sc.ending) return this.celebrate(); return this.finish(); }
    const k = this.sc.lines[this.i], [who, text] = LINES[k];
    this.who = who; this.full = text; this.shown = ''; this.typing = 0;
    try { this.gr = window.Intl && Intl.Segmenter ? Array.from(new Intl.Segmenter('hi', {granularity: 'grapheme'}).segment(text), s => s.segment) : Array.from(text); } catch (e) { this.gr = Array.from(text); } this.autoT = -1; this.lineK = k;
    document.getElementById('stName').textContent = NAMES[who]; document.getElementById('stName').className = 'n' + who;
    document.getElementById('stText').textContent = '';
    const tok = ++Voice.token;
    const started = Voice.play(k, {token: tok, onend: () => { if (Voice.token === tok && this.running) this.autoT = 1.4; }});
    if (!started || !SET.voice) this.autoT = 1.8 + text.length * 0.045;
    this.lineStart = performance.now();
  },
  tap(){
    if (!this.running || this.ending) return;
    if (this.shown.length < this.full.length) { this.shown = this.full; document.getElementById('stText').textContent = this.full; return; }
    if (performance.now() - this.lineStart < 250) return;
    SFX.ui(); this.next();
  },
  finish(){
    if (!this.running) return; this.running = false; this.ending = false; Voice.token++; Voice.stop(); Music.duck(false);
    const cb = this.onDone; this.onDone = null; if (cb) cb();
  },
  celebrate(){
    this.ending = true; Voice.stop(); Music.duck(false); Music.start(4);
    document.getElementById('stBox').classList.add('hide'); document.getElementById('skipBtn').classList.add('hide');
    document.getElementById('celebrate').classList.remove('hide'); SFX.fanfare(); setTimeout(() => SFX.firework(), 600); buzzv([80, 50, 80, 50, 200]);
    Voice.play('s_champ');
  },
  update(dt){
    if (!this.running) return; this.t += dt;
    if (!this.ending && this.shown.length < this.full.length) { this.typing += dt * 32; const n = Math.min(this.gr.length, Math.floor(this.typing)); const s = this.gr.slice(0, n).join(''); if (s !== this.shown) { this.shown = s; document.getElementById('stText').textContent = s; } }
    else if (this.autoT > 0) { this.autoT -= dt; if (this.autoT <= 0 && !this.ending) this.next(); }
    this.draw(dt);
  },
  cast(){ const s = []; for (const k of this.sc.lines) { const w = LINES[k][0]; if (!s.includes(w)) s.push(w); } return s; },
  draw(dt){
    const c = this.c, d = this.d, Wd = innerWidth, Hd = innerHeight; c.setTransform(d, 0, 0, d, 0, 0);
    const bgc = Backdrop.build(SC_THEME[this.sc.bg] || 0, Wd, Hd, d); c.drawImage(bgc, 0, 0, Wd, Hd);
    Backdrop.drawLive(c, dt, this.t, {cheer: this.ending || this.sc.trophy, fireworks: this.ending});
    // props
    if (this.sc.bg === 'gate') this.gate(c, Wd, Hd);
    if (this.sc.bg === 'stage') this.stage(c, Wd, Hd);
    // characters: everyone in the scene stands in a row; the speaker steps forward
    const cast = this.cast(), n = cast.length, base = Hd * 0.62;
    c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(0, base + 40, Wd, Hd - base);
    cast.forEach((w, i) => {
      if (w === this.who && !this.ending) return;
      const x = Wd * (n === 1 ? 0.5 : 0.14 + 0.72 * i / (n - 1)); c.globalAlpha = 0.85; drawChar(c, w, x, base, 0.62, this.t + i, {hat: SAVE.hat, outfit: SAVE.outfit}); c.globalAlpha = 1;
    });
    if (this.sc.thief) { const k = (this.t * 0.25) % 1; drawChar(c, 'monkey', Wd * (1.1 - k * 1.3), Hd * 0.3 + Math.sin(this.t * 6) * 8, 0.45, this.t, {trophy: 1}); }
    if (this.sc.trophy && !this.ending) drawTrophy(c, Wd * 0.5, Hd * 0.3, 1.4, this.t);
    if (this.ending) {
      drawTrophy(c, Wd * 0.5, Hd * 0.18, 1.6, this.t);
      drawChar(c, 'M', Wd * 0.5, base - 30 + Math.abs(Math.sin(this.t * 4)) * -10, 1.0, this.t, {hat: SAVE.hat, outfit: SAVE.outfit});
    } else if (this.who) {
      const sx = this.who === 'M' ? Wd * 0.3 : Wd * 0.7, talking = Voice.talking() || this.shown.length < this.full.length;
      drawChar(c, this.who, sx, base - 10, 1.05, this.t, {talk: talking, hat: SAVE.hat, outfit: SAVE.outfit});
    }
  },
  gate(c, Wd, Hd){
    const y = Hd * 0.2, w = Wd * 0.8, x = Wd * 0.1;
    c.fillStyle = '#c8202f'; c.fillRect(x, y, 16, Hd * 0.42); c.fillRect(x + w - 16, y, 16, Hd * 0.42);
    c.fillStyle = '#ffd23f'; rrp(c, x - 8, y - 30, w + 16, 56, 18); c.fill(); c.strokeStyle = '#c8202f'; c.lineWidth = 5; c.stroke();
    c.fillStyle = '#c8202f'; c.font = '900 26px VFDeva, system-ui'; c.textAlign = 'center'; c.fillText('सोनपुर मेला', Wd / 2, y + 8);
    for (let i = 0; i < 14; i++) { c.fillStyle = (Math.sin(this.t * 5 + i) > 0) ? '#fff6b0' : '#ff8a1f'; c.beginPath(); c.arc(x + i * w / 13, y - 30, 4, 0, 7); c.fill(); }
  },
  stage(c, Wd, Hd){
    c.fillStyle = '#7a1030'; c.fillRect(0, Hd * 0.12, Wd * 0.12, Hd * 0.55); c.fillRect(Wd * 0.88, Hd * 0.12, Wd * 0.12, Hd * 0.55);
    c.fillStyle = '#a3163f'; for (let i = 0; i < 12; i++) { c.beginPath(); c.arc(i * Wd / 11, Hd * 0.12, Wd / 22, 0, Math.PI); c.fill(); }
    c.fillStyle = '#ffd23f'; c.font = '900 20px VFDeva, system-ui'; c.textAlign = 'center'; c.fillText('चैंपियन राउंड', Wd / 2, Hd * 0.1);
  },
};
