// Kite Wars: Uttarayan — chapters, levels, shop data
'use strict';
const CHAPTERS = [
  {id: 1, name: 'Home Terrace', sub: 'Morning lessons on our own roof', theme: 'morning', boss: 'Tiger Bunty', intro: 'prologue', outro: 'tiger_win'},
  {id: 2, name: 'Pol Rooftops', sub: 'Pigeons, winds and Pinky Didi', theme: 'pol', boss: 'Pinky Didi', intro: 'ch2', outro: 'pinky_win'},
  {id: 3, name: 'Kankaria Qualifiers', sub: 'Afternoon gusts in the Old City', theme: 'kankaria', boss: 'Storm Twins', intro: 'ch3', outro: 'twins_win'},
  {id: 4, name: 'Night Uttarayan', sub: 'Tukkal lanterns and LED kites', theme: 'night', boss: 'Rohan', intro: 'ch4', outro: 'rohan_win'},
  {id: 5, name: 'Riverfront Grand Final', sub: 'The championship on the Sabarmati', theme: 'river', boss: 'Baadshah', intro: 'ch5', outro: null},
];
// obj: cut | survive | golden | combo | protect | time | nolose | lanterns | score | boss
// defaults filled by lvDefaults()
const LEVELS = [
  // ---------- Chapter 1: Home Terrace ----------
  {name: 'First Flight', obj: 'cut', goal: 3, rivals: [2, 2], rookies: 1, pull: 0.6, d0: 0, d1: 0.15, hunters: 1, wind: 0.6, windEvery: 99, tutorial: true,
    banter: [[1.5, 'D', 'Swing your string across theirs, beta!'], ['cut1', 'A', 'Kai po che! I did it!']]},
  {name: 'Morning Pech', obj: 'cut', goal: 5, rivals: [3, 3], pull: 0.75, d0: 0.05, d1: 0.3, hunters: 1, windEvery: 30,
    banter: [[2, 'T', 'Oye, pol boy! This sky belongs to the Terrace Tigers!'], ['cut3', 'A', 'Not today, Tigers!']]},
  {name: 'Hold the Sky', obj: 'survive', goal: 40, rivals: [3, 4], pull: 0.8, d0: 0.25, d1: 0.5, hunters: 1, huntMul: 1.4, windEvery: 25, isNew: 'Attackers with a red "!" are coming for your string. Stay alive!',
    banter: [[2, 'D', 'Kites with a red mark are hunting you. Cut them first!'], [25, 'A', 'Almost there... hold on!']]},
  {name: 'The Golden Kite', obj: 'golden', goal: 1, time: 100, rivals: [2, 3], pull: 0.75, d0: 0.1, d1: 0.35, hunters: 1, windEvery: 30, isNew: 'A golden kite flies away from you. Chase it and cut it!',
    banter: [[2, 'D', 'A golden kite! Catch it and it brings good luck.']]},
  {name: 'Wind Shift', obj: 'cut', goal: 6, rivals: [3, 4], pull: 0.8, d0: 0.15, d1: 0.4, hunters: 1, wind: 1.1, windEvery: 9, isNew: 'The wind now changes often and pushes harder. Watch the arrow!',
    banter: [[2, 'D', 'Feel the wind, Arjun. Fly with it, not against it.']]},
  {name: 'Double Cut', obj: 'combo', goal: 2, comboWin: 6, time: 110, rivals: [4, 4], pull: 0.75, d0: 0.1, d1: 0.35, hunters: 1, windEvery: 22, isNew: 'Cut two kites quickly, one after another!',
    banter: [[2, 'A', 'Two in a row. Quick quick!']]},
  {name: 'Race the Sun', obj: 'time', goal: 5, time: 70, rivals: [4, 4], pull: 0.8, d0: 0.15, d1: 0.4, hunters: 1, windEvery: 18, spawnFast: true,
    banter: [[2, 'T', 'Bet you can\'t cut five before lunch!']]},
  {name: 'Tiger Bunty', obj: 'boss', boss: {kind: 'tiger', name: 'TIGER BUNTY', hp: 3, pBase: 0.24, pAmp: 0.5, K: 24, size: 25, cols: ['#ff8a1f', '#1b1b1b'], taunt: 'tz_tiger', who: 'T'},
    rivals: [1, 1], pull: 0.85, d0: 0.15, d1: 0.4, hunters: 1, windEvery: 20,
    banter: [[2.5, 'T', 'Tiger\'s here! Two kites, double trouble!'], ['bosshit', 'T', 'Lucky! I still have my spare!']]},
  // ---------- Chapter 2: Pol Rooftops ----------
  {name: 'Pigeon Pol', obj: 'cut', goal: 6, rivals: [3, 4], pull: 0.85, d0: 0.2, d1: 0.45, hunters: 1, windEvery: 16, pigeons: 9, isNew: 'Pigeon flocks fly across. Touch them and your kite gets tangled for a moment!',
    banter: [[2, 'D', 'Pigeons! Fly around them, never through them.']]},
  {name: 'Crowded Sky', obj: 'cut', goal: 7, rivals: [4, 5], pull: 0.85, d0: 0.25, d1: 0.55, hunters: 2, windEvery: 16, pigeons: 14,
    banter: [[2, 'P', 'More kites, more fun. Show me your speed, little one.']]},
  {name: 'Two Golden Kites', obj: 'golden', goal: 2, time: 110, rivals: [3, 3], pull: 0.85, d0: 0.2, d1: 0.45, hunters: 1, windEvery: 16, pigeons: 11,
    banter: [[2, 'A', 'Two golden kites today. Double luck!']]},
  {name: 'One Kite Only', obj: 'nolose', goal: 5, lives: 1, time: 110, rivals: [3, 3], pull: 0.8, d0: 0.15, d1: 0.4, hunters: 1, windEvery: 18, pigeons: 14, isNew: 'Only ONE kite. Don\'t let them cut you!',
    banter: [[2, 'D', 'One kite, one chance. Be brave, but be careful.']]},
  {name: 'Shifty Winds', obj: 'survive', goal: 45, rivals: [3, 4], pull: 0.9, d0: 0.3, d1: 0.55, hunters: 2, wind: 1.2, windEvery: 7, pigeons: 10,
    banter: [[2, 'P', 'Let\'s see you survive my rooftops!']]},
  {name: 'Combo Galli', obj: 'combo', goal: 3, comboWin: 6, time: 120, rivals: [4, 5], pull: 0.8, d0: 0.2, d1: 0.45, hunters: 1, windEvery: 18, pigeons: 14,
    banter: [[2, 'A', 'Three in a row... like Didi does!']]},
  {name: 'Rooftop Relay', obj: 'time', goal: 7, time: 85, rivals: [4, 5], pull: 0.85, d0: 0.25, d1: 0.5, hunters: 1, windEvery: 15, pigeons: 12, spawnFast: true,
    banter: [[2, 'P', 'Tick tock, little champ!']]},
  {name: 'Pinky Didi', obj: 'boss', boss: {kind: 'pinky', name: 'PINKY DIDI', hp: 3, pBase: 0.24, pAmp: 0.52, K: 30, size: 24, cols: ['#ff4fb4', '#fff1a8'], taunt: 'tz_pinky', who: 'P'},
    rivals: [1, 1], pull: 0.9, d0: 0.25, d1: 0.5, hunters: 1, windEvery: 16, pigeons: 16,
    banter: [[2.5, 'P', 'Catch me if you can! I dodge, I dash!'], ['bosshit', 'P', 'Ooh! Okay, now I\'m serious!']]},
  // ---------- Chapter 3: Kankaria ----------
  {name: 'Kankaria Gusts', obj: 'cut', goal: 7, rivals: [3, 5], pull: 0.9, d0: 0.25, d1: 0.5, hunters: 2, windEvery: 15, gusts: 9, isNew: 'GUSTS! When the arrow flashes, a strong push is coming.',
    banter: [[2, 'N', 'Strong gusts over the lake today, flyers!']]},
  {name: 'Guard Dada\'s Kite', obj: 'protect', goal: 40, allyLives: 3, rivals: [3, 4], pull: 0.85, d0: 0.2, d1: 0.45, hunters: 1, windEvery: 18, isNew: 'Dada flies beside you. When rivals attack his kite, cut them fast!',
    banter: [[2, 'D', 'I fly with you today. Watch my blue kite!']]},
  {name: 'Two at Once', obj: 'cut', goal: 8, rivals: [4, 5], pull: 0.9, d0: 0.35, d1: 0.6, hunters: 2, huntMul: 1.2, windEvery: 15, gusts: 12,
    banter: [[2, 'M', 'Let\'s see the old man\'s boy handle two at once.']]},
  {name: 'Golden Lake', obj: 'golden', goal: 2, time: 110, rivals: [3, 4], pull: 0.9, d0: 0.3, d1: 0.55, hunters: 1, windEvery: 15, gusts: 10,
    banter: [[2, 'N', 'Golden kites over Kankaria! Who will catch them?']]},
  {name: 'Dada\'s Kite II', obj: 'protect', goal: 50, allyLives: 3, rivals: [3, 4], pull: 0.9, d0: 0.3, d1: 0.55, hunters: 2, windEvery: 15, gusts: 12,
    banter: [[2, 'D', 'The wind is wild, beta. Stay close to me.']]},
  {name: 'Clean Sweep', obj: 'nolose', goal: 6, lives: 1, time: 120, rivals: [3, 4], pull: 0.85, d0: 0.25, d1: 0.5, hunters: 1, windEvery: 16, gusts: 13,
    banter: [[2, 'A', 'One kite. Six cuts. Let\'s go!']]},
  {name: 'Combo Kankaria', obj: 'combo', goal: 3, comboWin: 6, time: 120, rivals: [4, 5], pull: 0.85, d0: 0.25, d1: 0.5, hunters: 1, windEvery: 16, gusts: 11,
    banter: [[2, 'N', 'The crowd wants a combo!']]},
  {name: 'Storm Twins', obj: 'boss', boss: {kind: 'twins', name: 'STORM TWINS', hp: 2, count: 2, pBase: 0.26, pAmp: 0.52, K: 24, size: 23, cols: ['#3b4bff', '#d6e0ff'], cols2: ['#8a2be2', '#e6d6ff'], taunt: 'tz_twins', who: 'M'},
    rivals: [0, 0], pull: 0.9, d0: 0.3, d1: 0.55, hunters: 2, windEvery: 15, gusts: 11,
    banter: [[2.5, 'M', 'Storm Twins, cut that kite!'], ['bosshit', 'D', 'They\'re losing kites! Keep cutting, beta!']]},
  // ---------- Chapter 4: Night ----------
  {name: 'Tukkal Night', obj: 'cut', goal: 6, night: 1, rivals: [3, 4], pull: 0.9, d0: 0.25, d1: 0.5, hunters: 1, windEvery: 16, isNew: 'Night! Your kite glows. Rival kites carry small lamps.',
    banter: [[2, 'D', 'Watch the lamps, beta. The strings are there.']]},
  {name: 'Lantern Hunt', obj: 'lanterns', goal: 4, night: 1, time: 120, lanternShare: 0.6, rivals: [3, 4], pull: 0.9, d0: 0.25, d1: 0.5, hunters: 1, windEvery: 16, isNew: 'Cut the kites that carry tukkal lanterns. They light up the sky!',
    banter: [[2, 'A', 'Tukkal kites! Four of them!']]},
  {name: 'LED Squad', obj: 'cut', goal: 7, night: 1, led: 0.5, rivals: [3, 5], pull: 0.95, d0: 0.3, d1: 0.55, hunters: 2, windEvery: 15, isNew: 'Rohan\'s LED kites are faster and a bit stronger.',
    banter: [[2, 'R', 'My LED squad will light you up!']]},
  {name: 'Dark Defense', obj: 'protect', goal: 45, allyLives: 3, night: 1, rivals: [3, 4], pull: 0.9, d0: 0.3, d1: 0.55, hunters: 1, windEvery: 16,
    banter: [[2, 'D', 'They can\'t see my kite well in the dark. Neither can you!']]},
  {name: 'Blackout', obj: 'survive', goal: 45, night: 1, blackout: 12, rivals: [3, 4], pull: 0.95, d0: 0.35, d1: 0.6, hunters: 2, windEvery: 15, isNew: 'Blackouts! Sometimes the lights go dim for a few seconds.',
    banter: [[2, 'R', 'Oops, lights out!']]},
  {name: 'Golden Night', obj: 'golden', goal: 2, night: 1, time: 115, rivals: [3, 4], pull: 0.9, d0: 0.3, d1: 0.55, hunters: 1, windEvery: 15, led: 0.3,
    banter: [[2, 'A', 'A golden kite shining in the dark!']]},
  {name: 'Night Combo', obj: 'combo', goal: 3, comboWin: 6, night: 1, time: 120, led: 0.4, rivals: [4, 5], pull: 0.9, d0: 0.3, d1: 0.5, hunters: 1, windEvery: 15,
    banter: [[2, 'R', 'Three in a row? In the dark? No way.']]},
  {name: 'Rohan\'s Neon King', obj: 'boss', night: 1, boss: {kind: 'rohan', name: 'NEON KING', hp: 4, pBase: 0.26, pAmp: 0.54, K: 28, size: 25, cols: ['#00e5ff', '#ff2bd6'], taunt: 'tz_rohan', who: 'R', led: true},
    rivals: [1, 1], led: 1, pull: 0.95, d0: 0.3, d1: 0.55, hunters: 1, windEvery: 15,
    banter: [[2.5, 'R', 'Lights on! Three kites, all LED!'], ['bosshit', 'R', 'Whatever! I have more!']]},
  // ---------- Chapter 5: Riverfront ----------
  {name: 'Round 1: Qualify', obj: 'score', goal: 1500, time: 90, rivals: [4, 5], pull: 0.95, d0: 0.3, d1: 0.55, hunters: 1, windEvery: 15, isNew: 'Championship round: reach the target score before time runs out. Combos score more!',
    banter: [[2, 'N', 'Round one! Score big, flyers!']]},
  {name: 'Round 2: Speed', obj: 'time', goal: 8, time: 80, rivals: [4, 5], pull: 0.95, d0: 0.35, d1: 0.6, hunters: 2, windEvery: 13, pigeons: 12, spawnFast: true,
    banter: [[2, 'N', 'Eight kites, eighty seconds. Go go go!']]},
  {name: 'Round 3: Iron Wings', obj: 'nolose', goal: 6, lives: 1, time: 120, rivals: [3, 4], pull: 0.9, d0: 0.3, d1: 0.55, hunters: 1, windEvery: 15, gusts: 12,
    banter: [[2, 'B', 'One kite. That is how champions fly.']]},
  {name: 'Round 4: Guard the Flag', obj: 'protect', goal: 50, allyLives: 3, rivals: [3, 4], pull: 0.95, d0: 0.35, d1: 0.6, hunters: 2, windEvery: 14, gusts: 12, pigeons: 15,
    banter: [[2, 'D', 'Patang Ghar\'s flag kite flies today. Guard it!']]},
  {name: 'Round 5: Golden Final', obj: 'golden', goal: 3, time: 120, rivals: [3, 4], pull: 0.95, d0: 0.35, d1: 0.6, hunters: 1, windEvery: 14, gusts: 12, led: 0.3,
    banter: [[2, 'N', 'Three golden kites over the Sabarmati!']]},
  {name: 'Round 6: Storm Sky', obj: 'survive', goal: 55, rivals: [4, 5], pull: 1.0, d0: 0.4, d1: 0.65, hunters: 3, windEvery: 10, gusts: 10, pigeons: 13,
    banter: [[2, 'B', 'The sky is angry today. Survive it.']]},
  {name: 'Semi-Final: Combo King', obj: 'combo', goal: 4, comboWin: 7, time: 130, rivals: [5, 5], pull: 0.9, d0: 0.3, d1: 0.55, hunters: 1, windEvery: 15,
    banter: [[2, 'N', 'Four in a row and you face Baadshah!']]},
  {name: 'FINAL: Baadshah', obj: 'boss', boss: {kind: 'baadshah', name: 'BAADSHAH', hp: 6, pBase: 0.26, pAmp: 0.54, K: 27, size: 28, cols: ['#b3122e', '#ffcf3f'], taunt: 'tz_b1', who: 'B'},
    rivals: [0, 0], lives: 4, pull: 1.0, d0: 0.35, d1: 0.6, hunters: 1, windEvery: 14, time: 180, isNew: 'Dada gives you his lucky kite: 4 kites for the final. Baadshah fights in 3 phases!',
    banter: [[2.5, 'B', 'Show me your Dada\'s pech, boy.'], ['phase2', 'B', 'The wind obeys me!'], ['phase3', 'B', 'Last kite. No mercy!']]},
];
LEVELS.forEach((L, i) => {
  L.n = i + 1; L.ch = Math.floor(i / 8) + 1;
  const d = {time: 120, lives: 3, rivals: [3, 4], pull: 1, d0: 0, d1: 0.4, hunters: 1, wind: 0.8, windEvery: 14, pigeons: 0, gusts: 0, night: 0, led: 0, comboWin: 4.5, huntMul: 1, lanternShare: 0, rookies: 0};
  for (const k in d) if (L[k] == null) L[k] = d[k];
  if (L.obj === 'survive' || L.obj === 'protect') L.time = L.goal;
  if (L.ch === 4 && L.night == null) L.night = 1;
  L.boss_ = L.obj === 'boss';
});
function objText(L){
  switch (L.obj) {
    case 'cut': return 'Cut ' + L.goal + ' kites';
    case 'survive': return 'Keep a kite flying for ' + L.goal + ' seconds';
    case 'golden': return 'Cut ' + (L.goal > 1 ? L.goal + ' golden kites' : 'the golden kite');
    case 'combo': return 'Make a ' + L.goal + '-cut combo (cuts in quick succession)';
    case 'protect': return 'Guard Dada\'s kite for ' + L.goal + ' seconds';
    case 'time': return 'Cut ' + L.goal + ' kites in ' + L.time + ' seconds';
    case 'nolose': return 'Cut ' + L.goal + ' kites with only ONE kite';
    case 'lanterns': return 'Cut ' + L.goal + ' lantern kites';
    case 'score': return 'Score ' + L.goal + ' points in ' + L.time + ' seconds';
    case 'boss': return L.boss.count > 1 ? 'Defeat the ' + L.boss.name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) + ' (' + L.boss.hp * L.boss.count + ' kites)' : 'Defeat ' + L.boss.name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) + ' (' + L.boss.hp + ' kites)';
  }
  return '';
}
function starText(L){
  if (L.obj === 'nolose') return ['Win', '30% time left', '50% time left'];
  return ['Win', 'Lose at most 1 kite', 'Lose no kite'];
}
const OBJ_ICON = {cut: '✂️', survive: '⏳', golden: '🌟', combo: '⚡', protect: '🛡️', time: '⏱️', nolose: '💎', lanterns: '🏮', score: '🏆', boss: '👑'};
const SCENE_BEFORE = {1: 'prologue', 9: 'ch2', 17: 'ch3', 25: 'ch4', 33: 'ch5', 40: 'prefinal'};
const SCENE_AFTER = {8: 'tiger_win', 16: 'pinky_win', 24: 'twins_win', 32: 'rohan_win', 40: 'ending'};

const SKINS = [
  {id: 'classic', name: 'Classic', price: 0, c1: '#ff2d6f', c2: '#ffd23f', pat: 'split'},
  {id: 'peacock', name: 'Peacock', price: 200, c1: '#0f8f7a', c2: '#1d4fd6', pat: 'peacock'},
  {id: 'sunrise', name: 'Sunrise', price: 300, c1: '#ff7a00', c2: '#ffd23f', pat: 'sun'},
  {id: 'lotus', name: 'Lotus', price: 450, c1: '#ff8fc8', c2: '#ffffff', pat: 'lotus'},
  {id: 'tiger', name: 'Tiger Stripe', price: 600, c1: '#ff9a1f', c2: '#222222', pat: 'stripe'},
  {id: 'galaxy', name: 'Galaxy', price: 900, c1: '#2a1a6e', c2: '#7b2ff7', pat: 'galaxy'},
  {id: 'gold', name: 'Golden Patang', price: 1500, c1: '#ffcf3f', c2: '#ff9d00', pat: 'gold'},
];
const MANJAS = [
  {id: 'cotton', name: 'Cotton Dori', price: 0, sharp: 0, strong: 0, long: 0, col: '#ff2d6f', glow: 'rgba(255,90,140,0.8)', desc: 'Your trusty first string.'},
  {id: 'bareilly', name: 'Bareilly Red', price: 250, sharp: 0.06, strong: 0, long: 0.05, col: '#e3202e', glow: 'rgba(255,60,60,0.8)', desc: 'Sharper saw, a bit longer PULL NOW.'},
  {id: 'surat', name: 'Surat Glass', price: 600, sharp: 0.10, strong: 0.05, long: 0.05, col: '#7fe7ff', glow: 'rgba(130,240,255,0.85)', desc: 'Glass-coated. Cuts cleaner.'},
  {id: 'thunder', name: 'Thunder Blue', price: 1100, sharp: 0.12, strong: 0.10, long: 0.10, col: '#4d7bff', glow: 'rgba(90,140,255,0.9)', desc: 'Strong and sharp. Rivals pull weaker.'},
  {id: 'champion', name: 'Champion Gold', price: 1800, sharp: 0.15, strong: 0.12, long: 0.15, col: '#ffc21a', glow: 'rgba(255,210,60,0.9)', desc: 'The champion\'s manja.'},
];
