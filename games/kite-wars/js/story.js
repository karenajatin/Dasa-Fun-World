// Kite Wars: Uttarayan — story scenes (canvas art + text + voice)
'use strict';
const LINES = {"p1": ["A", "Ten days to Uttarayan. Our whole pol smells of rice glue and fresh kite paper."], "p2": ["D", "Sixty years, Arjun. Patang Ghar has never missed a single Uttarayan."], "p3": ["M", "Then this will be its last one, uncle. My towers need this land."], "p4": ["D", "We have a deal, Malhotra. If my family wins the City Championship, the shop stays."], "p5": ["M", "Ha! An old man and a little boy? Good luck."], "p6": ["A", "I'll win it, Dada. I'll start from our own terrace, and I won't stop till the final!"], "p7": ["D", "Then come, beta. First lesson: cross the string, then saw like the wind."], "t1": ["T", "Oye! You cut the Tiger's best kite? Nobody does that!"], "t2": ["A", "Somebody just did. Kai po che!"], "t3": ["T", "Fine. The Terrace Tigers respect you, pol boy. But Pinky Didi rules these rooftops."], "c1": ["P", "So you're the kid who beat the Tigers? Cute. I fly faster than you can blink."], "c2": ["D", "Watch the pigeons, Arjun. Fly around them, never through them."], "c3": ["A", "Fast and tricky. Got it. Let's go, Didi!"], "k1": ["P", "No way! You read every trick I had."], "k2": ["P", "Here, take my lucky spool. Win the qualifiers at Kankaria for all of us."], "k3": ["A", "Thanks, Didi! The whole pol is behind Patang Ghar now."], "q1": ["N", "Welcome to the Kankaria qualifiers! Big winds today, flyers. Hold on to your firkis!"], "q2": ["D", "Today I fly beside you, beta. Guard my old kite, and we qualify together."], "q3": ["M", "I've hired the Storm Twins. Your little shop won't last the afternoon."], "w1": ["N", "Unbelievable! Patang Ghar qualifies for Night Uttarayan!"], "w2": ["M", "Lucky wind. But the night belongs to Rohan, and his kites cost more than your shop."], "w3": ["D", "You cannot buy the wind, Malhotra."], "n1": ["R", "LED kites, glow strings, a drone camera. Dad bought me the best of everything."], "n2": ["A", "Nice lights, Rohan. But can they pech?"], "n3": ["D", "In the dark, follow the glow of the tukkal lanterns. Your eyes will find the strings."], "r1": ["R", "My LED king... cut by a paper kite? Okay. That was actually awesome."], "r2": ["R", "Tomorrow you fly against Baadshah. Nobody has ever beaten him. Beat him for all of us."], "f1": ["N", "The Riverfront Grand Final! And the undefeated champion, the one, the only... Baadshah!"], "f2": ["B", "Patang Ghar. I know that name. Your grandfather taught me to fly."], "f3": ["D", "Hari. My best student. You lost one fight, left in anger, and never came back."], "f4": ["B", "Now the city calls me Baadshah. Win your rounds, boy. I'll be waiting at the top."], "b1": ["B", "Three kites. Three winds. Show me your Dada's pech, boy."], "b2": ["A", "This one's for Patang Ghar. For Dada. For the whole pol!"], "e1": ["N", "The new Uttarayan champion of Ahmedabad... Arjun of Patang Ghar!"], "e2": ["B", "Guruji, forgive me. Everything I am began in your little shop."], "e3": ["D", "There is nothing to forgive, Hari. Kai po che. Welcome home."], "e4": ["M", "A deal is a deal. The shop stays. Maybe I'll even buy a kite."], "e5": ["B", "And I'll teach the pol kids on Patang Ghar's terrace, every Uttarayan."], "e6": ["A", "Patang Ghar is saved! See you next Uttarayan. Kai po che!"], "kp_a": ["A", "Kai po che!"], "kp_d": ["D", "Kai po che!"], "kp_m": ["N", "Kai po che!"], "tz_tiger": ["T", "Tiger's here! Your kite is mine!"], "tz_pinky": ["P", "Catch me if you can!"], "tz_twins": ["M", "Storm Twins! Cut that kite!"], "tz_rohan": ["R", "Lights on! Let's see you find me now."], "tz_b1": ["B", "Show me what you've got."], "tz_b2": ["B", "The wind obeys me!"], "tz_b3": ["B", "Last kite. No mercy!"], "help": ["D", "Arjun, help! They're on my kite!"]};

const SCENES = {
  prologue: {title: 'CHAPTER 1', sub: 'Home Terrace', bg: 'shop', lines: ['p1','p2','p3','p4','p5','p6','p7'], side: {A: 'L', D: 'R', M: 'R'}},
  tiger_win: {title: 'TIGER TAMED', sub: 'Chapter 1 complete', bg: 'morning', lines: ['t1','t2','t3'], side: {A: 'L', T: 'R'}},
  ch2: {title: 'CHAPTER 2', sub: 'Pol Rooftops', bg: 'pol', lines: ['c1','c2','c3'], side: {A: 'L', P: 'R', D: 'R'}},
  pinky_win: {title: 'DIDI\'S SPOOL', sub: 'Chapter 2 complete', bg: 'pol', lines: ['k1','k2','k3'], side: {A: 'L', P: 'R'}},
  ch3: {title: 'CHAPTER 3', sub: 'Kankaria Qualifiers', bg: 'kankaria', lines: ['q1','q2','q3'], side: {N: 'L', A: 'L', D: 'R', M: 'R'}},
  twins_win: {title: 'QUALIFIED!', sub: 'Chapter 3 complete', bg: 'kankaria', lines: ['w1','w2','w3'], side: {N: 'L', D: 'L', M: 'R'}},
  ch4: {title: 'CHAPTER 4', sub: 'Night Uttarayan', bg: 'night', lines: ['n1','n2','n3'], side: {A: 'L', R: 'R', D: 'R'}},
  rohan_win: {title: 'LIGHTS OUT', sub: 'Chapter 4 complete', bg: 'night', lines: ['r1','r2'], side: {A: 'L', R: 'R'}},
  ch5: {title: 'CHAPTER 5', sub: 'Riverfront Grand Final', bg: 'river', lines: ['f1','f2','f3','f4'], side: {N: 'L', D: 'L', B: 'R'}},
  prefinal: {title: 'THE FINAL', sub: 'Arjun vs Baadshah', bg: 'river', lines: ['b1','b2'], side: {A: 'L', B: 'R'}},
  ending: {title: 'CHAMPION!', sub: 'Patang Ghar is saved', bg: 'river', lines: ['e1','e2','e3','e4','e5','e6'], side: {N: 'L', A: 'L', D: 'L', B: 'R', M: 'R'}, celebrate: true},
};

const Story = {
  on: false, sc: null, idx: -1, t: 0, typed: 0, shown: {}, onDone: null, timer: null, token: 0, layer: null, layerKey: '', fireworks: [],
  cv: null, c: null,
  play(id, onDone){
    const sc = SCENES[id]; if (!sc) { onDone && onDone(); return; }
    this.cv = document.getElementById('sc'); this.c = this.cv.getContext('2d');
    this.sc = sc; this.id = id; this.onDone = onDone; this.on = true; this.idx = -1; this.t = 0; this.shown = {}; this.fireworks = []; this.token++;
    document.getElementById('stTitle').textContent = sc.title; document.getElementById('stSub').textContent = sc.sub;
    const ti = document.getElementById('stCard'); ti.classList.remove('go'); void ti.offsetWidth; ti.classList.add('go');
    only('story'); this.resize(); this.layerKey = '';
    Music.start('menu');
    if (window.__kwStory) window.__kwStory.push({ev: 'scene', id});
    clearTimeout(this.timer); this.timer = setTimeout(() => this.next(), 900);
    if (!this.raf) { const loop = (now) => { if (!this.on) { this.raf = null; return; } this.frame(now); this.raf = requestAnimationFrame(loop); }; this.raf = requestAnimationFrame(loop); }
  },
  resize(){ const d = Math.min(2, devicePixelRatio || 1); this.cv.width = innerWidth * d; this.cv.height = innerHeight * d; this.d = d; },
  next(){
    clearTimeout(this.timer);
    if (!this.on || this.celebrating) return;
    if (this.idx >= 0 && this.typed < this.text.length) { this.typed = this.text.length; this.renderText(); this.autoNext(); return; }
    this.idx++;
    if (this.idx >= this.sc.lines.length) { this.end(); return; }
    const k = this.sc.lines[this.idx], [who, text] = LINES[k];
    this.who = who; this.text = text; this.typed = 0; this.lineT = 0; this.shown[this.sc.side[who] || 'L'] = who; this.voiceDone = false;
    document.getElementById('stName').textContent = CHARS[who].name.split(' (')[0];
    document.getElementById('stName').style.background = CHARS[who].col;
    document.getElementById('stBox').classList.toggle('right', (this.sc.side[who] || 'L') === 'R');
    this.renderText();
    const tok = ++this.token;
    if (window.__kwStory) window.__kwStory.push({ev: 'line', k, who});
    const played = Voice.play(k, {token: undefined, onend: () => { if (tok === this.token) { this.voiceDone = true; this.autoNext(); } }});
    if (!played || !SET.voice) { this.voiceDone = true; }
    this.autoNext();
  },
  autoNext(){
    clearTimeout(this.timer);
    if (this.celebrating) return;
    if (this.typed < (this.text || '').length) return;
    if (!this.voiceDone && SET.voice && AC) { this.timer = setTimeout(() => { this.voiceDone = true; this.autoNext(); }, 9000); return; }
    const tok = this.token; this.timer = setTimeout(() => { if (tok === this.token) this.next(); }, SET.voice && AC ? 1300 : 1500 + this.text.length * 35);
  },
  renderText(){ document.getElementById('stText').textContent = this.text.slice(0, Math.floor(this.typed)); },
  skip(){ Voice.stop(); this.token++; if (window.__kwStory) window.__kwStory.push({ev: 'skip', id: this.id}); this.end(true); },
  end(skipped){
    clearTimeout(this.timer);
    if (this.sc.celebrate && !skipped && !this.celebrating) { this.celebrating = true; this.celebrate(); return; }
    this.on = false; this.celebrating = false; Voice.stop(); hide('celebrate'); show('stBox'); show('skipBtn');
    if (window.__kwStory) window.__kwStory.push({ev: 'end', id: this.id, skipped: !!skipped});
    const cb = this.onDone; this.onDone = null; cb && cb();
  },
  celebrate(){
    this.token++; Voice.stop(); show('celebrate'); hide('stBox'); hide('skipBtn'); SFX.win(); SFX.cheer(true); Music.start('win'); this.celebT = 0;
    document.getElementById('stText').textContent = ''; document.getElementById('stName').textContent = '';
  },
  frame(now){
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000); this.last = now; this.t += dt;
    if (this.idx >= 0 && this.typed < this.text.length) { this.typed += dt * 42; if (this.typed >= this.text.length) { this.typed = this.text.length; this.autoNext(); } this.renderText(); }
    const c = this.c, d = this.d, w = innerWidth, h = innerHeight;
    const s = w / 400, WH = h / s;
    c.setTransform(d * s, 0, 0, d * s, 0, 0);
    this.drawBG(c, WH);
    // characters
    const baseY = WH - (h * 0.25) / s;
    for (const side of ['L', 'R']) { const who = this.shown[side]; if (!who) continue; const speaking = this.celebrating || who === this.who;
      c.save(); if (!speaking) { if ('filter' in c) c.filter = 'brightness(0.55) saturate(0.7)'; else c.globalAlpha = 0.6; } const sc2 = speaking ? 1.12 : 0.98;
      drawChar(c, who, {x: side === 'L' ? 108 : 292, y: baseY + (speaking ? 0 : 8), s: sc2, t: this.t, talk: !this.celebrating && speaking && (Voice.talking() || (!SET.voice && this.typed < this.text.length)), flip: side === 'R'});
      c.restore(); }
    if (this.celebrating) this.drawCelebrate(c, WH, dt);
  },
  drawBG(c, WH){
    const bg = this.sc.bg, t = this.t;
    if (bg === 'shop') { this.drawShop(c, WH, t); return; }
    const key = bg + WH.toFixed(0) + this.d;
    if (this.layerKey !== key) { const fr = [{x: 34, y: WH - 250, side: -1, w: 70}, {x: 92, y: WH - 345, side: -1, w: 62}, {x: 366, y: WH - 270, side: 1, w: 70}, {x: 306, y: WH - 360, side: 1, w: 62}];
      this.layer = buildLayers(bg, 400, WH, (innerWidth / 400) * this.d, fr, {x: 200, y: WH - 120, anchor: {x: 214, y: WH - 158}}); this.layerKey = key; }
    const L = this.layer; c.drawImage(L.sky, 0, 0, 400, WH); 
    // drifting kites
    for (let i = 0; i < 9; i++) { const x = (i * 53 + t * (8 + i)) % 440 - 20, y = WH * (0.12 + (i % 5) * 0.07) + Math.sin(t + i) * 8; drawKiteIcon(c, x, y, 7 + (i % 3) * 2, {c1: ['#ff4f6d','#ffd23f','#2fd18b','#3fa0ff','#ff8a1f','#b05cff'][i % 6], c2: '#fff', pat: 'split'}, t, Math.sin(t * 2 + i) * 0.2); }
    c.drawImage(L.far, 0, 0, 400, WH); c.drawImage(L.mid, 0, 0, 400, WH); c.drawImage(L.near, 0, 0, 400, WH); if (L.em) c.drawImage(L.em, 0, 0, 400, WH);
    c.fillStyle = 'rgba(20,10,30,0.25)'; c.fillRect(0, 0, 400, WH);
  },
  drawShop(c, WH, t){
    const g = c.createLinearGradient(0, 0, 0, WH); g.addColorStop(0, '#7cc4ff'); g.addColorStop(0.5, '#ffe0b8'); g.addColorStop(1, '#e8a87c'); c.fillStyle = g; c.fillRect(0, 0, 400, WH);
    // pol street walls
    c.fillStyle = '#d98f6a'; c.fillRect(0, WH * 0.12, 70, WH); c.fillStyle = '#c97b63'; c.fillRect(330, WH * 0.08, 70, WH);
    for (let y = WH * 0.16; y < WH; y += 60) { jharokha(c, 18, y, 30, 40, '#d98f6a', false, () => 0.5); jharokha(c, 350, y + 20, 30, 40, '#c97b63', false, () => 0.5); }
    // shop facade
    c.fillStyle = '#f2d388'; c.fillRect(70, WH * 0.18, 260, WH); c.fillStyle = '#8a4a2a'; c.fillRect(64, WH * 0.18 - 8, 272, 12);
    c.fillStyle = '#a83232'; rr(c, 100, WH * 0.21, 200, 46, 8); c.fill(); c.strokeStyle = '#ffd23f'; c.lineWidth = 3; c.stroke();
    c.fillStyle = '#ffe9a8'; c.font = '900 26px system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('PATANG GHAR', 200, WH * 0.21 + 18); c.font = '700 10px system-ui,sans-serif'; c.fillText('SINCE 1966 · KITES & MANJA', 200, WH * 0.21 + 37);
    // doorway with hanging kites
    c.fillStyle = '#5a2f1f'; c.fillRect(110, WH * 0.31, 180, WH); c.fillStyle = '#3a1d12'; c.fillRect(120, WH * 0.33, 160, WH);
    const cols = ['#ff4f6d', '#ffd23f', '#2fd18b', '#3fa0ff', '#ff8a1f', '#b05cff', '#ff7cc3'];
    for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) { const x = 135 + i * 26 + (r % 2) * 12, y = WH * 0.36 + r * 46; drawKiteIcon(c, x, y + Math.sin(t * 2 + i + r) * 2, 10, {c1: cols[(i + r) % 7], c2: cols[(i + r + 3) % 7], pat: 'split'}, t, Math.sin(t * 1.5 + i) * 0.15); }
    // string of mini kites across the street
    c.strokeStyle = 'rgba(60,40,30,0.7)'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, WH * 0.1); c.quadraticCurveTo(200, WH * 0.16, 400, WH * 0.07); c.stroke();
    for (let i = 1; i < 14; i++) { const tt = i / 14, x = tt * 400, y = (1 - tt) * (1 - tt) * WH * 0.1 + 2 * (1 - tt) * tt * WH * 0.16 + tt * tt * WH * 0.07; c.fillStyle = cols[i % 7]; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 5, y + 7); c.lineTo(x, y + 14); c.lineTo(x - 5, y + 7); c.fill(); }
    // builder's SOLD sign
    c.save(); c.translate(318, WH * 0.32); c.rotate(0.12); c.fillStyle = '#fff'; c.fillRect(-36, -18, 72, 36); c.strokeStyle = '#c81d3a'; c.lineWidth = 3; c.strokeRect(-36, -18, 72, 36); c.fillStyle = '#c81d3a'; c.font = '900 11px system-ui,sans-serif'; c.fillText('FOR SALE?', 0, -3); c.font = '700 7px system-ui,sans-serif'; c.fillText('MALHOTRA TOWERS', 0, 9); c.restore();
    c.fillStyle = 'rgba(20,10,30,0.2)'; c.fillRect(0, 0, 400, WH);
  },
  drawCelebrate(c, WH, dt){
    this.celebT += dt;
    if (Math.random() < dt * 2.2) { this.fireworks.push({x: 60 + Math.random() * 280, y: WH * 0.12 + Math.random() * WH * 0.3, t: 0, col: ['#ffd23f', '#ff4f6d', '#6bf0ff', '#9dff6b', '#ff8a1f'][(Math.random() * 5) | 0]}); SFX.firework(); }
    for (const f of this.fireworks) { f.t += dt; const r = f.t * 90, a = Math.max(0, 1 - f.t / 1.4); c.globalAlpha = a; c.fillStyle = f.col;
      for (let i = 0; i < 18; i++) { const an = i / 18 * 6.283; c.beginPath(); c.arc(f.x + Math.cos(an) * r, f.y + Math.sin(an) * r + f.t * f.t * 20, 2.2, 0, 6.283); c.fill(); } c.globalAlpha = 1; }
    this.fireworks = this.fireworks.filter(f => f.t < 1.5);
  },
};
