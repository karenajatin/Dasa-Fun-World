
(function(){
'use strict';
var API = (window.VY_API || '') + '/api/';
var SQ=VY.SQ, fmt=VY.fmt;
var GCOL={red:'#e53935',green:'#2e7d32',blue:'#0288d1',yellow:'#f9b300'};
var ICON={start:'🏁',jail:'🚔',club:'🍸',rest:'🛏️',chance:'🍀',community:'🤝',tax:'💰'};
var SHORTN={};
var UICON={'Internet':'🌐','Railways':'🚂','Electricity':'⚡','Roadways':'🚌','Airways':'✈️','Waterways':'🚢','Vande Bharat':'🚄','Metro Rail':'🚇','Girnar Ropeway':'🚡','Ro-Ro Ferry':'⛴️','Solar Power':'🔆','Gas Grid':'🔥'};
function gcol(g){ var b=VY.board; return GCOL[g] || (b&&b.groups&&b.groups[g]&&b.groups[g].color) || '#777'; }
function isB100(){ return VY.boardId==='india100'; }
var sqS=function(i){ return VYI.sqShort ? VYI.sqShort(i) : VYI.sqName(i); };
function boardName(id){ return T(id==='india100'?'board_india':'board_classic'); }
// v20: the room's board (classic 36 or India & Gujarat 100) — switch the drawing when a state for another board arrives
function syncBoard(st){ var id=(st&&st.board)||'classic'; var changed=VY.useBoard(id) || SQ!==VY.SQ; SQ=VY.SQ; if(!changed) return;
  cells.forEach(function(c){ c.remove(); }); cells=[]; $('tokens').innerHTML=''; S.disp={}; walkQ=[];
  var b100=isB100(), B=$('board'), C=$('center'), G=$('game'); B.classList.toggle('b100',b100); G.classList.toggle('b100',b100); $('boardWrap').classList.toggle('b100',b100);
  if(b100){ if(C.parentNode!==G) G.insertBefore(C,$('boardWrap')); B.style.gridTemplateColumns='repeat('+VY.board.cols+',1fr)'; B.style.gridTemplateRows='repeat('+VY.board.rows+',1fr)'; }
  else { if(C.parentNode!==B) B.insertBefore(C,$('tokens')); B.style.gridTemplateColumns=''; B.style.gridTemplateRows=''; } }
var T=VYI.T, sqN=VYI.sqName; function isEn(){ return VYI.lang==='en'; }
var $=function(id){return document.getElementById(id);};
var S={sess:null, st:null, v:0, pres:{}, off:0, lastEv:0, disp:{}, rollN:0, moveN:0, polling:false, failCount:0, busy:false, sheetKind:null, shownTrade:null, auctionOpen:false, cardShown:0};
function h(t,a,c){ var e=document.createElement(t); if(a) for(var k in a){ if(k==='class') e.className=a[k]; else if(k==='html') e.innerHTML=a[k]; else if(k.slice(0,2)==='on') e[k]=a[k]; else e.setAttribute(k,a[k]); } if(c!=null){ (Array.isArray(c)?c:[c]).forEach(function(x){ if(x==null) return; e.appendChild(typeof x==='string'||typeof x==='number'?document.createTextNode(String(x)):x); }); } return e; }
function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
function short(n){ return n>=1000 ? '₹'+(n/1000).toFixed(n%1000?1:0).replace('.0','')+'k' : '₹'+n; }
function toast(msg,err){ if(!msg) return; var t=h('div',{class:'toast'+(err?' err':'')},msg); $('toasts').appendChild(t); setTimeout(function(){t.remove();}, err?2500:1700); while($('toasts').children.length>3) $('toasts').firstChild.remove(); }
function now(){ return Date.now()+S.off; }
function me(){ return S.st && S.sess ? VY.P(S.st,S.sess.pid) : null; }
// ---------- sound ----------
var AC=null; function beep(f,d,type,vol){ try{ AC=AC||new (window.AudioContext||window.webkitAudioContext)(); var o=AC.createOscillator(), g=AC.createGain(); o.type=type||'sine'; o.frequency.value=f; g.gain.value=vol||0.06; o.connect(g); g.connect(AC.destination); var t=AC.currentTime; g.gain.exponentialRampToValueAtTime(0.0001,t+d); o.start(t); o.stop(t+d); }catch(e){} }
function sDice(){ for(var i=0;i<4;i++) setTimeout(function(){beep(300+Math.random()*500,.04,'square',.03);}, i*55); }
function sCoin(){ beep(988,.08,'sine',.07); setTimeout(function(){beep(1319,.18,'sine',.07);},80); }
function sStep(){ beep(660,.04,'triangle',.03); }
function vib(p){ try{ navigator.vibrate&&navigator.vibrate(p);}catch(e){} }
// ---------- net ----------
var SIMQ=(function(){ try{ var s=new URLSearchParams(location.search).get('sim')||localStorage.getItem('vy_sim'); return s?('sim='+(+s)):''; }catch(e){ return ''; } })();
function req(path, body){
  if(SIMQ) path+=(path.indexOf('?')>=0?'&':'?')+SIMQ;
  var opt = body ? {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body)} : {};
  return fetch(API+path, opt).then(function(r){ return r.json().then(function(j){ if(!r.ok){ var e=new Error(j.error||('HTTP '+r.status)); e.j=j; e.status=r.status; throw e; } return j; }); });
}
function setNet(ok){ var d=$('net'); if(d) d.className='dot'+(ok?'':' off'); }
function accept(j){ if(j.now){ var o=j.now-Date.now(); S.off = (S.offSet && Math.abs(o-S.off)<1500) ? Math.min(S.off,o) : o; S.offSet=true; } if(j.presence) S.pres=j.presence; if(j.state && j.v>=S.v){ S.v=j.v; var old=S.st; S.st=j.state; syncBoard(S.st); onState(old); } else if(j.presence && S.st){ renderPlayers(); if(S.st.phase==='play'){ var aid=VY.actorId(S.st), key=aid+':'+((S.pres[aid]||0)<now()-45000); if(key!==S.offKey){ S.offKey=key; renderActions(); } } } }
var TURN_ACTS={roll:1,endturn:1,pass:1,buy:1,decline:1,autoplay:1};
function act(a){
  if(S.busy && a.t!=='bid') return Promise.resolve();
  if(TURN_ACTS[a.t] && S.st && S.st.turnNo!=null) a.tn=S.st.turnNo;
  S.busy=true;
  return req('act',{code:S.sess.code,pid:S.sess.pid,token:S.sess.token,a:a}).then(function(j){ S.busy=false; accept(j); setNet(true); }).catch(function(e){ S.busy=false; if(e.j && e.j.state) accept(e.j); toast(VYI.errMsg(e.j, e.j?e.message:T('netErr')),true); if(e.status===403){ leave(); } });
}
var pollN=0, pollT=null, timerT=null;
function timerAt(){ var st=S.st; if(!st||st.phase!=='play') return 0; if(st.pending&&st.pending.type==='auction') return st.pending.endsAt; if(st.tp==='end'&&!st.debts.length&&st.autoEndAt) return st.autoEndAt; return 0; }
function timerDue(){ var t=timerAt(); return !!t && now()>=t; }
// poll right when the auto end of a turn (or an auction close) is due, so the next player gets the dice at once
function schedTimer(){ clearTimeout(timerT); var t=timerAt(); if(!t||!S.sess) return; var ms=t-now()+40; if(ms<0) ms=0; if(ms>15000) return; timerT=setTimeout(function(){ if(timerDue()) req('state?code='+S.sess.code+'&v='+S.v+'&a=1').then(accept).catch(function(){}); }, ms); }
var pollBusy=false, pollAgain=false, pollCtl=null;
// v16: long poll. The server holds /api/wait open and answers the moment the room changes,
// so other phones see a move about one network round trip after it happens.
function poll(){
  clearTimeout(pollT); if(!S.sess) return;
  if(pollBusy){ pollAgain=true; return; }   // one request at a time: never start a second polling chain
  pollBusy=true; pollN++;
  var lp = !document.hidden && !S.noLP;
  var q=(lp?'wait':'state')+'?code='+S.sess.code+'&v='+S.v+'&pid='+S.sess.pid+'&token='+encodeURIComponent(S.sess.token)+(lp?'&ms=12000':(pollN%6===1?'&ping=1':''))+(timerDue()?'&a=1':'');
  var t0=Date.now();
  req(q).then(function(j){ S.failCount=0; setNet(true); accept(j); }).catch(function(e){ S.failCount++; setNet(false); if(e.status===404){ toast(T('E_roomNotFound'),true); leave(); return; } if(lp && S.failCount>=3) S.noLP=true; })
  .then(function(){ pollBusy=false; if(!S.sess) return; var d = document.hidden ? 4000 : (S.failCount ? Math.min(5000, 700*S.failCount) : (lp ? (Date.now()-t0<150?250:0) : (S.st&&S.st.phase==='play'?650:1000))); if(pollAgain){ pollAgain=false; d=0; } clearTimeout(pollT); pollT=setTimeout(poll,d); schedTimer(); });
}
document.addEventListener('visibilitychange',function(){ if(!document.hidden && S.sess){ pollN=0; poll(); } });
// ---------- session ----------
function saveSess(){ localStorage.setItem('vy_sess', JSON.stringify(S.sess)); }
function leave(){ S.sess=null; S.st=null; S.v=0; localStorage.removeItem('vy_sess'); clearTimeout(pollT); history.replaceState(null,'',location.pathname); closeSheet(); show('home'); }
function enter(j){ S.sess={code:j.code,pid:j.pid,token:j.token}; saveSess(); S.v=0; S.st=null; S.lastEv=0; S.disp={}; S.rollN=-1; S.moveN=-1; history.replaceState(null,'','?room='+j.code); accept(j); pollN=0; poll(); }
function show(id){ ['home','lobby','game'].forEach(function(x){ $(x).classList.toggle('hidden', x!==id); }); }
// ---------- home ----------
$('nameIn').value=localStorage.getItem('vy_name')||'';
var qp=new URLSearchParams(location.search); if(qp.get('room')) $('codeIn').value=qp.get('room').toUpperCase().slice(0,4);
function getName(){ var n=$('nameIn').value.trim(); if(!n){ toast(T('needName'),true); $('nameIn').focus(); return null; } localStorage.setItem('vy_name',n); return n; }
var pickB=localStorage.getItem('vy_board')||'classic'; if(pickB!=='india100') pickB='classic';
// v20: board picker — on the home screen before creating a room, and for the host in the lobby
function boardPicker(el,cur,onPick){ el.innerHTML=''; ['classic','india100'].forEach(function(id){ var b=h('button',{type:'button',class:'bopt'+(cur===id?' on':''),'data-b':id,onclick:function(){ onPick(id); }},[h('span',{class:'bic'},id==='india100'?'🗺️':'🎲'),h('span',{class:'btx'},[h('b',null,boardName(id)),h('small',null,T(id==='india100'?'board_india_d':'board_classic_d'))])]); el.appendChild(b); }); }
function renderHomePick(){ var el=$('boardPick'); if(el) boardPicker(el,pickB,function(id){ pickB=id; localStorage.setItem('vy_board',id); renderHomePick(); }); }
renderHomePick();
$('createBtn').onclick=function(){ var n=getName(); if(!n) return; this.disabled=true; var b=this; req('create',{name:n,board:pickB}).then(function(j){ b.disabled=false; enter(j); }).catch(function(e){ b.disabled=false; toast(VYI.errMsg(e.j,e.message),true); }); };
$('joinBtn').onclick=function(){ var n=getName(); if(!n) return; var c=$('codeIn').value.trim().toUpperCase(); if(c.length<4){ toast(T('needCode'),true); return; } var b=this; b.disabled=true; req('join',{code:c,name:n}).then(function(j){ b.disabled=false; enter(j); }).catch(function(e){ b.disabled=false; toast(VYI.errMsg(e.j,e.message),true); }); };
$('codeIn').addEventListener('input',function(){ this.value=this.value.toUpperCase().replace(/[^A-Z0-9]/g,''); });
$('rulesBtn').onclick=function(){ openSheet('rules', rulesView); };
$('leaveLobby').onclick=function(){ leave(); };
$('shareBtn').onclick=function(){ share(); };
function share(){
  var url=location.origin+location.pathname+'?room='+S.sess.code;
  var txt=T('shareText',{x:S.sess.code})+'\n'+url;
  if(window.Android && Android.share){ Android.share(txt); return; }
  if(navigator.share){ navigator.share({text:txt}).catch(function(){}); return; }
  window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank');
}
// ---------- lobby ----------
function renderLobby(){
  var st=S.st; show('lobby'); $('lobbyCode').textContent=st.code; $('lobbyCount').textContent=st.players.length;
  var L=$('lobbyPlayers'); L.innerHTML='';
  st.players.forEach(function(p){ var on=(S.pres[p.id]||0)>now()-30000; L.appendChild(h('div',{class:'pl'},[h('span',{class:'tok',style:'background:'+p.color},p.name[0]), p.name+(p.id===S.sess.pid?' '+T('you'):''), p.id===st.hostId?' 👑':'', h('span',{class:'onl',style:'font-size:12px;color:'+(on?'#2e7d32':'#b0806a')}, on?T('online'):'○')])); });
  var host=st.hostId===S.sess.pid; $('hostBox').classList.toggle('hidden',!host); $('waitHost').classList.toggle('hidden',host);
  var bid=st.board||'classic'; $('lobbyBoard').textContent=(bid==='india100'?'🗺️ ':'🎲 ')+T('boardL')+': '+boardName(bid);
  if(host) boardPicker($('boardOpts'),bid,function(id){ if(id!==bid) act({t:'settings',board:id}); });
  if(host){ var C=$('cashOpts'); C.innerHTML=''; [15000,20000,30000,40000,50000].forEach(function(c){ C.appendChild(h('button',{class:'chipb'+(st.settings.startCash===c?' on':''),onclick:function(){act({t:'settings',startCash:c});}},fmt(c))); });
    $('auctionChk').checked=!!st.settings.auction; $('auctionChk').onchange=function(){ act({t:'settings',auction:this.checked}); };
    $('startBtn').disabled=st.players.length<2; $('startBtn').textContent=st.players.length<2?T('waitFriends'):T('startGame'); $('startBtn').onclick=function(){ act({t:'start'}); }; }
}
// ---------- board ----------
function cellPos(i){ // returns [row,col] 1-based
  if(VY.board && VY.board.layout) return VY.board.layout[i]; // India & Gujarat 100: Jatin's snake track
  // same layout as the physical board: Start bottom-right, play runs left along the bottom, up the left, right along the top, down the right
  if(i===0) return [10,10]; if(i<9) return [10,10-i]; if(i===9) return [10,1]; if(i<18) return [19-i,1]; if(i===18) return [1,1]; if(i<27) return [1,i-17]; if(i===27) return [1,10]; return [i-26,10];
}
var cells=[];
function pic(key){ var d=h('div',{class:'pic'}); var art=window.VYART&&VYART[key]; if(art) d.innerHTML='<svg viewBox="0 0 40 28" preserveAspectRatio="xMidYMid meet" aria-hidden="true">'+art+'</svg>'; else d.textContent=ICON[key]||UICON[key]||''; return d; }
function buildBoard(){
  var B=$('board'); if(cells.length) return;
  SQ.forEach(function(s,i){
    if(isB100()){ buildCell100(B,s,i); return; }
    var rc=cellPos(i), corner=[0,9,18,27].indexOf(i)>=0, side=(rc[1]===1||rc[1]===10)&&!corner;
    var c=h('div',{class:'cell'+(corner?' corner':'')+(side?' side':'')+' t-'+s.type}); c.style.gridRow=rc[0]; c.style.gridColumn=rc[1];
    var key = (s.type==='city'||s.type==='utility') ? s.name_en : s.type;
    var en=isEn(), nmL=sqN(i), enSmall=en?'':s.name_en;
    if(s.type==='city'){ c.appendChild(h('div',{class:'band',style:'background:'+gcol(s.group)},h('span',{class:'nm'},nmL))); c.appendChild(pic(key)); c.appendChild(h('div',{class:'ft'},[enSmall?h('span',{class:'en'},enSmall):null,h('span',{class:'pr'},short(s.price))])); }
    else if(s.type==='utility'){ c.appendChild(h('div',{class:'band ub'},h('span',{class:'nm'},nmL))); c.appendChild(pic(key)); c.appendChild(h('div',{class:'ft'},[enSmall?h('span',{class:'en'},enSmall):null,h('span',{class:'pr'},short(s.price))])); }
    else if(corner){ c.appendChild(pic(key)); c.appendChild(h('div',{class:'nm'},nmL)); c.appendChild(h('div',{class:'en'},s.type==='start'?'+'+VY.fmt(VY.D.salary_pass_start):((enSmall?enSmall+' ':'')+'₹200'))); }
    else { c.appendChild(h('div',{class:'band sb '+s.type},h('span',{class:'nm'},side?nmL:(T('short_'+s.type)||nmL)))); c.appendChild(pic(key)); c.appendChild(h('div',{class:'ft'},h('span',{class:'en'},s.type==='tax'?'₹200':enSmall))); }
    c.appendChild(h('div',{class:'hs'})); c.appendChild(h('div',{class:'own'}));
    c.onclick=function(){ openSheet('deed', function(){ return deedView(i); }); };
    B.insertBefore(c,$('tokens')); cells.push(c);
  });
  if(isB100()) drawWalls();
  fitBoard();
}
// one square of the 100-square board: colour band with a short name, picture, price (full details on tap)
function buildCell100(B,s,i){
  var rc=cellPos(i), big={start:1,jail:1,club:1,rest:1}[s.type];
  var c=h('div',{class:'cell c100'+(big?' corner':'')+' t-'+s.type}); c.style.gridRow=rc[0]; c.style.gridColumn=rc[1];
  var nm=sqS(i);
  if(s.type==='city') c.appendChild(h('div',{class:'band',style:'background:'+gcol(s.group)},h('span',{class:'nm'},nm)));
  else if(s.type==='utility') c.appendChild(h('div',{class:'band ub'},h('span',{class:'nm'},nm)));
  else if(big) c.appendChild(h('div',{class:'band cb'},h('span',{class:'nm'},nm)));
  else c.appendChild(h('div',{class:'band sb '+s.type},h('span',{class:'nm'},T('short_'+s.type)||nm)));
  var ic=s.icon||UICON[s.name_en]||ICON[s.type]||'';
  var sub = s.price ? short(s.price) : (s.type==='start' ? '+'+short(VY.D.salary_pass_start) : (s.type==='chance'||s.type==='community' ? '' : '₹200'));
  c.appendChild(h('div',{class:'ft'},[h('span',{class:'ic'},ic), sub?h('span',{class:'pr'},sub):null]));
  c.appendChild(h('div',{class:'hs'})); c.appendChild(h('div',{class:'own'}));
  c.onclick=function(){ openSheet('deed', function(){ return deedView(i); }); };
  B.insertBefore(c,$('tokens')); cells.push(c);
}
// the snake's walls: a thick line between two neighbouring squares that are not next to each other on the track
function drawWalls(){ var L=VY.board.layout, at={}; L.forEach(function(rc,i){ at[rc[0]+','+rc[1]]=i; }); var n=L.length;
  cells.forEach(function(c,i){ var rc=L[i]; [['b',1,0],['r',0,1]].forEach(function(d){ var j=at[(rc[0]+d[1])+','+(rc[1]+d[2])]; if(j==null) return; if(Math.abs(i-j)===1||Math.abs(i-j)===n-1) return; c.classList.add('w'+d[0]); }); });
  var A=h('div',{class:'arrow100'},'⬇'); cells[0].appendChild(A); }
// long names (Tamil, German…) shrink to fit their tiny band instead of being cut off
function fitBoard(){ cells.forEach(function(c){ var n=c.querySelector('.nm'); if(!n) return; n.style.fontSize=''; var w=n.parentNode.clientWidth||c.clientWidth; if(!w) return; var k=1; while(n.scrollWidth>w+1 && k>0.55){ k-=0.07; n.style.fontSize=(k*100)+'%'; } }); }
function rebuildBoard(){ cells.forEach(function(c){ c.remove(); }); cells=[]; buildBoard(); }
function renderBoard(){
  var st=S.st;
  SQ.forEach(function(s,i){ var c=cells[i], pr=st.props[i]; var key=pr?(pr.o+'|'+pr.h+'|'+(pr.m?1:0)+'|'+((VY.P(st,pr.o)||{}).color)):'-'; if(c._k===key) return; c._k=key; var o=c.querySelector('.own'), hs=c.querySelector('.hs');
    if(pr){ var p=VY.P(st,pr.o); o.style.borderColor=p?p.color:'transparent'; c.classList.toggle('mort',!!pr.m); hs.textContent= pr.h===4?'🏨':(pr.h?'🏠'.repeat(pr.h):''); hs.classList.toggle('hot',pr.h===4); }
    else { o.style.borderColor='transparent'; c.classList.remove('mort'); hs.textContent=''; } });
}
function cellCenter(i){ var c=cells[i], B=$('board'); var bw=B.clientWidth, bh=B.clientHeight; return [ (c.offsetLeft+c.offsetWidth/2)/bw*100, (c.offsetTop+c.offsetHeight/2)/bh*100 ]; }
var OFFS=[[-22,-18],[22,-18],[-22,20],[22,20]];
function placeTok(p,idx,pos){
  var t=$('tk_'+p.id); if(!t){ t=h('div',{class:'ptok',id:'tk_'+p.id},p.name[0]); $('tokens').appendChild(t); }
  t.style.background=p.color; t.classList.toggle('me',p.id===S.sess.pid);
  var c=cellCenter(pos), cw=cells[pos].offsetWidth/$('board').clientWidth*100;
  t.style.left=(c[0]+OFFS[idx][0]*cw/100)+'%'; t.style.top=(c[1]+OFFS[idx][1]*cw/100)+'%';
  t.style.display=p.bankrupt?'none':'flex';
}
var walking=false, walkQ=[];
function renderTokens(anim){
  var st=S.st;
  st.players.forEach(function(p,idx){
    var d=S.disp[p.id];
    var t=$('tk_'+p.id); if(t) t.classList.toggle('turn', st.phase==='play' && VY.cur(st).id===p.id);
    if(d===undefined || !anim){ S.disp[p.id]=p.pos; placeTok(p,idx,p.pos); return; }
    if(d===p.pos) { placeTok(p,idx,p.pos); return; }
    var mv=st.move; var steps=(mv && mv.pid===p.id && mv.steps>0) ? ((p.pos-d+VY.N)%VY.N) : 0;
    if(steps>0 && steps<=12){ walkQ.push({p:p,idx:idx,from:d,steps:steps}); S.disp[p.id]=p.pos; }
    else { S.disp[p.id]=p.pos; setTimeout(function(){ placeTok(p,idx,p.pos); }, 150); }
  });
  runWalk();
}
// v16: token hop is at most ~0.4 s for any roll (start 0.12 s after the dice settle, then fast steps)
// India & Gujarat 100 is taller than the screen: keep the moving token in view
function keepVisible(pos){ var W=$('boardWrap'), c=cells[pos]; if(!W||!c) return; var top=c.offsetTop, bot=top+c.offsetHeight, m=c.offsetHeight*1.5;
  if(top-m<W.scrollTop) W.scrollTop=Math.max(0,top-m); else if(bot+m>W.scrollTop+W.clientHeight) W.scrollTop=bot+m-W.clientHeight;
  var left=c.offsetLeft, right=left+c.offsetWidth; if(left<W.scrollLeft) W.scrollLeft=left-8; else if(right>W.scrollLeft+W.clientWidth) W.scrollLeft=right-W.clientWidth+8; }
var animUntil=0; function animBusy(){ return Date.now()<animUntil; }
function runWalk(){
  if(walking || !walkQ.length) return; walking=true; var w=walkQ.shift(); var k=0; var stepMs=Math.max(16,Math.min(45,Math.floor(280/w.steps)));
  animUntil=Math.max(animUntil, Date.now()+120+stepMs*w.steps+60);
  setTimeout(function step(){ k++; var pos=(w.from+k)%VY.N; if(isB100()) keepVisible(pos); placeTok(w.p,w.idx,pos); if(k===w.steps||k%2===1) sStep(); if(k<w.steps) setTimeout(step,stepMs); else { cells[pos].classList.remove('hl'); void cells[pos].offsetWidth; cells[pos].classList.add('hl'); walking=false; if(!walkQ.length){ animUntil=0; if(S.st) renderActions(); } runWalk(); } }, 120);
}
var PIPS={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
function drawDie(el,n){ el.innerHTML=''; for(var i=1;i<=9;i++){ var cell=h('span'); if(PIPS[n].indexOf(i)>=0) cell.appendChild(h('i')); el.appendChild(cell);} }
var spinIv=null;
function spinDice(){ clearInterval(spinIv); ['d1','d2'].forEach(function(id){ var el=$(id); el.classList.remove('roll'); void el.offsetWidth; el.classList.add('roll'); }); sDice(); spinIv=setInterval(function(){ drawDie($('d1'),1+Math.floor(Math.random()*6)); drawDie($('d2'),1+Math.floor(Math.random()*6)); },60); setTimeout(function(){ clearInterval(spinIv); },3000); }
function renderDice(anim){
  var d=S.st.dice||[1,1];
  var spinning=!!spinIv; clearInterval(spinIv); spinIv=null;
  if(anim && !spinning){ ['d1','d2'].forEach(function(id){ var el=$(id); el.classList.remove('roll'); void el.offsetWidth; el.classList.add('roll'); }); sDice(); var k=0; var iv=setInterval(function(){ drawDie($('d1'),1+Math.floor(Math.random()*6)); drawDie($('d2'),1+Math.floor(Math.random()*6)); if(++k>2){ clearInterval(iv); drawDie($('d1'),d[0]); drawDie($('d2'),d[1]); } },50); }
  else { drawDie($('d1'),d[0]); drawDie($('d2'),d[1]); }
}
function renderCenter(){
  var st=S.st, c=VY.cur(st), m=me();
  var lbl = st.phase==='over' ? T('gameOver') : (c.id===S.sess.pid ? T('yourTurn') : T('turnOf',{n:c.name}));
  $('turnLbl').textContent=lbl; $('turnLbl').style.background = st.phase==='over' ? '#8b1a1a' : c.color;
  var F=$('feed'); F.innerHTML=''; st.log.slice(-3).forEach(function(e){ F.appendChild(h('div',null,VYI.ev(e))); });
}
function renderPlayers(){
  var st=S.st; if(!st || st.phase==='lobby'){ if(st) renderLobby(); return; }
  var P=$('players'); P.innerHTML=''; var cid=VY.cur(st).id;
  st.players.forEach(function(p){
    var on=(S.pres[p.id]||0)>now()-30000; var flags=[];
    if(p.inJail) flags.push('🚔'); if(p.skip) flags.push('😴'); if(!on && !p.bankrupt) flags.push('📵'); if(p.id===st.hostId) flags.push('👑');
    var n=0; for(var k in st.props) if(st.props[k].o===p.id) n++;
    P.appendChild(h('div',{class:'pc'+(p.id===cid&&st.phase==='play'?' turn':'')+(p.bankrupt?' bk':''),onclick:function(){ openSheet('player',function(){return playerView(p.id);}); }},[
      h('div',{class:'bar',style:'background:'+p.color}), h('div',{class:'n'},(p.id===S.sess.pid?'⭐':'')+p.name), h('div',{class:'c'},p.bankrupt?T('bankruptW'):fmt(p.cash)), h('div',{class:'f'},T('propsN',{x:n})+' '+flags.join(''))]));
  });
}
// ---------- actions bar ----------
function B(txt,cls,fn,dis){ var b=h('button',{class:'btn '+(cls||'')},txt); b.onclick=fn; if(dis) b.disabled=true; return b; }
function renderActions(){
  var st=S.st, A=$('actions'); A.innerHTML=''; var m=me(); if(!m) return;
  if(st.phase==='over'){ A.appendChild(B(T('seeResult'),'main saffron',function(){ openSheet('win',winView); })); A.appendChild(B(T('homeBtn'),'grey',leave)); return; }
  if(m.bankrupt){ A.appendChild(h('div',{class:'info'},T('youBankrupt'))); A.appendChild(B(T('exitBtn'),'grey',leave)); return; }
  var c=VY.cur(st), mine=c.id===m.id, actor=VY.actorId(st);
  if(st.debts.length){
    var d=st.debts[0];
    if(d.from===m.id){ var to=d.to?VY.P(st,d.to).name:T('bank'); A.appendChild(h('div',{class:'info'},T('mustPay',{n:to,m:d.amt,m2:m.cash})));
      A.appendChild(B(T('payBtn'),'main green',function(){act({t:'paydebt'});}, m.cash<d.amt));
      A.appendChild(B(T('sellMortBtn'),'blue',function(){openSheet('mine',mineView);}));
      A.appendChild(B(T('bankruptBtn'),'red',function(){ if(confirm(T('confirmBankrupt'))) act({t:'bankrupt'}); }));
    } else waitInfo(A, VY.P(st,d.from), T('raising'));
  } else if(st.tp==='auction'){
    A.appendChild(B(T('auctionOn'),'main saffron',function(){ openSheet('auction',auctionView); }));
  } else if(mine){
    if(st.tp==='roll'){ var ab=animBusy(); A.appendChild(B(T('rollBtn'),'main saffron',function(){ if(S.busy) return; spinDice(); act({t:'roll'}); vib(20); }, ab)); if(ab){ clearTimeout(S.abT); S.abT=setTimeout(function(){ if(S.st) renderActions(); }, Math.max(30,animUntil-Date.now()+20)); }
      if(m.inJail) A.appendChild(B(T('payJailBtn'),'blue',function(){act({t:'payjail'});}, m.cash<500)); }
    else if(st.tp==='buy'){ var s=SQ[st.pending.sq]; A.appendChild(B(T('buySq',{s:s.index,m:s.price}),'main green',function(){act({t:'buy'});}, m.cash<s.price)); if(st.settings.auction) A.appendChild(B(T('auctionBtn'),'saffron',function(){act({t:'decline'});})); A.appendChild(B(T('skipBtn'),'grey skipbtn',function(){act({t:'pass'});})); A.appendChild(B(T('detailsBtn'),'blue',function(){openSheet('buy',buyView);})); }
    else if(st.tp==='end'){ A.appendChild(B(T('endAuto'),'main green endbtn',function(){act({t:'endturn'});})); }
    if(st.tp==='roll'||st.tp==='end'){ var bi=m.pos, bp=st.props[bi], bs=SQ[bi];
      if(bp && bp.o===m.id && bs.type==='city' && bp.h<4 && !bp.m){ var bw=VY.canBuild(st,m,bi), bc=VY.bCost(bs,bp.h);
        A.appendChild(B((bp.h===3?T('buildHotel'):T('buildHouse'))+' — '+sqN(bi)+' '+fmt(bc),'main green bld',function(){act({t:'build',sq:bi});}, !!bw)); }
      var nb=0; for(var kb in st.props){ if(!VY.canBuild(st,m,+kb)) nb++; }
      if(nb) A.appendChild(B(T('buildAny',{x:nb}),'blue bldall',function(){openSheet('mine',mineView);})); }
  } else waitInfo(A, c, '');
  var hasProps=false; for(var k in st.props) if(st.props[k].o===m.id) hasProps=true;
  if(!(st.debts.length && st.debts[0].from===m.id)) A.appendChild(B(T('myProps'),'blue',function(){openSheet('mine',mineView);}, !hasProps));
  if(st.trade){ var tr=st.trade; if(tr.to===m.id) A.appendChild(B(T('tradeIn'),'saffron',function(){openSheet('tradein',tradeInView);})); else if(tr.from===m.id) A.appendChild(B(T('tradeCancelBtn'),'grey',function(){act({t:'tradeReply',accept:false});})); }
  else A.appendChild(B(T('tradeBtn'),'blue',function(){openSheet('trade',tradeView);}));
}
function waitInfo(A,p,extra){
  var seen=S.pres[p.id]||0, off=seen < now()-45000;
  A.appendChild(h('div',{class:'info'},T('waitTurn',{n:p.name})+' '+extra));
  if(off) A.appendChild(B(T('offlineAuto',{n:p.name}),'main grey',function(){ act({t:'autoplay'}); }));
}
// ---------- sheets ----------
function openSheet(kind, view){ S.sheetKind=kind; S.sheetView=view; var sh=$('sheet'); sh.innerHTML=''; var v=view(); if(!v){ closeSheet(); return; } sh.appendChild(v); $('sheetBg').classList.remove('hidden'); }
function refreshSheet(){ if(!S.sheetKind) return; var v=S.sheetView(); if(!v){ closeSheet(); return; } var sh=$('sheet'), sc=sh.scrollTop; sh.innerHTML=''; sh.appendChild(v); sh.scrollTop=sc; }
function closeSheet(){ S.sheetKind=null; $('sheetBg').classList.add('hidden'); }
$('sheetBg').onclick=function(e){ if(e.target===this) closeSheet(); };
function closeBtn(){ return B(T('closeBtn'),'grey',closeSheet); }
function deedCard(i){
  var s=SQ[i], st=S.st, pr=st&&st.props[i];
  var col = s.type==='city' ? gcol(s.group) : (s.type==='utility' ? '#5d4037' : '#8b1a1a');
  var d=h('div',{class:'deed'}); d.appendChild(h('div',{class:'hd',style:'background:'+col},[ (s.icon||UICON[s.name_en]||ICON[s.type]||'')+' '+sqN(i), h('small',null,(isEn()?'':s.name_en)+(s.price?(isEn()?'':' • ')+T('priceL')+' '+fmt(s.price):''))]));
  if(isB100() && s.group && VY.board.groups[s.group]){ var gg=VY.board.groups[s.group]; d.appendChild(h('div',{class:'rgn'},[h('span',{class:'sw',style:'background:'+gg.color}),'📍 '+(gg['name_'+VYI.lang]||gg.name_en)])); }
  var t=h('table'); var row=function(a,b,cur){ t.appendChild(h('tr',{class:cur?'cur':''},[h('td',null,a),h('td',null,b)])); };
  if(s.type==='city'){ var lv=pr?pr.h:-1; row(T('rentSite'),fmt(s.rent[0]),lv===0); row(T('rentMono'),fmt(s.rent[0]*2)); row(T('h1'),fmt(s.rent[1]),lv===1); row(T('h2'),fmt(s.rent[2]),lv===2); row(T('h3'),fmt(s.rent[3]),lv===3); row(T('hotelL'),fmt(s.rent[4]),lv===4); row(T('houseCost'),fmt(s.house_cost)); row(T('hotelCost'),fmt(s.hotel_cost||s.house_cost)); row(T('mortVal'),fmt(s.mortgage)); }
  else if(s.type==='utility'){ var pair=SQ.filter(function(x){return x.name_en===s.pair_with;})[0]; if(s.rent_kind==='dice'){ row(T('rentL'),T('diceTimes',{x:s.rent})); row(T('alsoOwn',{s:pair.index}),T('diceTimes',{x:s.pair_rent})); } else { row(T('rentL'),fmt(s.rent)); row(T('alsoOwn',{s:pair.index}),fmt(s.pair_rent)); } row(T('mortVal'),fmt(s.mortgage)); }
  else { var desc={start:T('d_start'),jail:T('d_jail'),club:T('d_club'),rest:T('d_rest'),chance:T('d_card'),community:T('d_card'),tax:T('d_tax',{m:s.flat||200})}[s.type]; t.appendChild(h('tr',null,[h('td',{colspan:2,style:'text-align:left;font-family:inherit'},desc)]));
    if(s.type==='chance'||s.type==='community'){ var dk=s.type==='chance'?VY.D.chance_by_dice_total:VY.D.community_chest_by_dice_total; for(var n=2;n<=12;n++) row(n+'', T('card_'+s.type+'_'+n)||dk[n].gu); } }
  d.appendChild(t);
  if(pr){ var o=VY.P(st,pr.o); d.appendChild(h('div',{style:'padding:8px 12px;font-weight:700;border-top:2px solid #eee'},T('ownerL',{n:o.name})+(pr.m?T('isMort'):'')+(s.type==='city'?T('rentNow',{m:VY.rentFor(st,i,7)}):''))); }
  return d;
}
function deedView(i){ var w=h('div'); w.appendChild(deedCard(i)); var pr=S.st&&S.st.props[i]; var m=me(), s=SQ[i];
  if(pr&&m&&pr.o===m.id&&s.type==='city'&&pr.h<4&&!pr.m){ var why=VY.canBuild(S.st,m,i); var myT=VY.cur(S.st).id===m.id&&!S.st.debts.length&&(S.st.tp==='roll'||S.st.tp==='end'); if(!myT&&!why) why='@buildOnTurn';
    w.appendChild(B((pr.h===3?T('buildHotel'):T('buildHouse'))+' '+fmt(VY.bCost(s,pr.h)),'main green bldbtn',function(){act({t:'build',sq:i});}, !!why)); if(why) w.appendChild(h('div',{class:'muted'},why==='@buildOnTurn'?T('buildOnTurn'):T('E_'+why))); }
  if(pr&&pr.o===S.sess.pid) w.appendChild(B(T('manageProps'),'blue',function(){openSheet('mine',mineView);})); w.appendChild(closeBtn()); return w; }
function buyView(){ var st=S.st; if(st.tp!=='buy'||!st.pending) return null; var i=st.pending.sq, s=SQ[i], m=me(), mine=VY.cur(st).id===m.id; var w=h('div'); w.appendChild(h('h3',null,mine?T('wantBuy'):T('thinking',{n:VY.cur(st).name}))); w.appendChild(deedCard(i));
  if(mine){ var r=h('div',{class:'btnrow'}); r.appendChild(B(T('buyFor',{m:s.price}),'green',function(){act({t:'buy'}); closeSheet();}, m.cash<s.price)); if(st.settings.auction) r.appendChild(B(T('auctionBtn'),'saffron',function(){act({t:'decline'}); closeSheet();})); r.appendChild(B(T('skipBtn'),'grey skipbtn',function(){act({t:'pass'}); closeSheet();})); w.appendChild(r); w.appendChild(h('div',{class:'muted',style:'margin-top:6px'},T('youHave',{m:m.cash}))); }
  else w.appendChild(closeBtn()); return w; }
var auctionTimer=null;
function auctionView(){ var st=S.st, a=st.pending; if(!a||a.type!=='auction') return null; var s=SQ[a.sq], m=me(); var w=h('div');
  var left=Math.max(0,Math.ceil((a.endsAt-now())/1000));
  w.appendChild(h('h3',null,T('aucTitle',{s:a.sq}))); w.appendChild(deedCard(a.sq));
  w.appendChild(h('div',{style:'font-size:22px;font-weight:700;text-align:center;margin:6px 0'},a.bidder?T('highBid',{m:a.bid,n:VY.P(st,a.bidder).name}):T('noBids')));
  w.appendChild(h('div',{id:'aucLeft',style:'text-align:center;font-weight:700;color:#b71c1c;font-size:18px'},T('secs',{x:left})));
  if(m && !m.bankrupt){ var r=h('div',{class:'btnrow'}); [100,500,1000].forEach(function(inc){ var amt=Math.max(100,a.bid+inc); r.appendChild(B('+'+inc+' ('+short(amt)+')','saffron',function(){act({t:'bid',amount:amt});}, amt>m.cash)); }); w.appendChild(r); w.appendChild(h('div',{class:'muted',style:'text-align:center;margin-top:6px'},T('youHave',{m:m.cash}))); }
  w.appendChild(closeBtn());
  clearInterval(auctionTimer); auctionTimer=setInterval(function(){ var el=$('aucLeft'); if(!el||!S.st.pending||S.st.pending.type!=='auction'){ clearInterval(auctionTimer); return; } el.textContent=T('secs',{x:Math.max(0,Math.ceil((S.st.pending.endsAt-now())/1000))}); },250);
  return w; }
function mineView(){ var st=S.st, m=me(); var w=h('div'); w.appendChild(h('h3',null,T('myPropsT',{m:m.cash})));
  var ids=Object.keys(st.props).map(Number).filter(function(i){return st.props[i].o===m.id;}).sort(function(a,b){ var A=SQ[a],Bq=SQ[b]; return (A.group||'z').localeCompare(Bq.group||'z')||a-b; });
  if(!ids.length) w.appendChild(h('div',{class:'muted'},T('noProps')));
  var myTurn=VY.cur(st).id===m.id;
  ids.forEach(function(i){ var s=SQ[i], pr=st.props[i]; var r=h('div',{class:'prow'});
    r.appendChild(h('div',{class:'sw',style:'background:'+(s.group?gcol(s.group):'#5d4037')}));
    var status = pr.m ? T('mortW') : (s.type==='city' ? (pr.h===4?T('hotelSt'):(pr.h?(pr.h===1?T('h1'):T('housesN',{x:pr.h})):T('emptySite')))+T('rentSt',{m:VY.rentFor(st,i,7)}) : T('companyW'));
    var gInfo = s.type==='city' ? T('inColour',{x:VY.ownedInGroup(st,m.id,s.group).length,y:VY.GROUPS[s.group].length}) : '';
    r.appendChild(h('div',{class:'tx'},[h('b',null,sqN(i)),h('div',null,status+gInfo)]));
    if(s.type==='city' && !pr.m){ var why=VY.canBuild(st,m,i); if(!myTurn && !why) why='@turn'; if(!why) r.appendChild(B((pr.h===3?T('buildHotel'):T('buildHouse'))+' '+short(VY.bCost(s,pr.h)),'green bldbtn',function(){act({t:'build',sq:i});})); else if(VY.groupMono===undefined && false){} }
    if(!VY.canSell(st,m,i)) r.appendChild(B(T('sellBtn',{m:'@'}).replace('@',short(VY.bCost(s,pr.h-1)/2)),'grey',function(){act({t:'sell',sq:i});}));
    if(!VY.canMortgage(st,m,i)) r.appendChild(B(T('mortBtn',{m:'@'}).replace('@',short(s.mortgage)),'saffron',function(){act({t:'mortgage',sq:i});}));
    if(pr.m) r.appendChild(B(T('unmortBtn',{m:'@'}).replace('@',short(VY.unmortgageCost(i))),'blue',function(){act({t:'unmortgage',sq:i});}, m.cash<VY.unmortgageCost(i)));
    w.appendChild(r); });
  w.appendChild(h('div',{class:'muted',style:'margin:8px 0'},(VY.D.building_rule==='group3'?T('ruleG3'):T('ruleAny'))+T('ruleHotel')));
  w.appendChild(closeBtn()); return w; }
var TR={to:null,give:{},get:{},gc:0,rc:0};
function tradeView(){ var st=S.st, m=me(); var others=st.players.filter(function(p){return !p.bankrupt&&p.id!==m.id;}); if(!others.length) return null;
  if(!TR.to || !VY.P(st,TR.to) || VY.P(st,TR.to).bankrupt) TR.to=others[0].id; var o=VY.P(st,TR.to);
  var w=h('div'); w.appendChild(h('h3',null,T('tradeT')));
  var sel=h('div',{class:'sel'}); others.forEach(function(p){ sel.appendChild(h('button',{class:'chipb'+(p.id===TR.to?' on':''),onclick:function(){TR={to:p.id,give:{},get:{},gc:0,rc:0}; refreshSheet();}},p.name)); }); w.appendChild(sel);
  function list(pid,bag,title){ w.appendChild(h('div',{class:'muted',style:'margin-top:10px'},title)); var L=h('div',{class:'sel'}); var any=false;
    Object.keys(st.props).map(Number).filter(function(i){return VY.tradeable(st,pid,i);}).forEach(function(i){ any=true; var s=SQ[i]; L.appendChild(h('button',{class:'chipb'+(bag[i]?' on':''),style:'border-left:6px solid '+(s.group?gcol(s.group):'#5d4037'),onclick:function(){ if(bag[i]) delete bag[i]; else bag[i]=1; refreshSheet(); }},sqN(i)+(st.props[i].m?T('mortParen'):''))); });
    if(!any) L.appendChild(h('div',{class:'muted'},T('nothingL'))); w.appendChild(L); }
  list(m.id,TR.give,T('youGive')); var gi=h('input',{type:'number',min:0,step:100,placeholder:T('giveCashPh'),value:TR.gc||''}); gi.oninput=function(){TR.gc=+this.value||0;}; w.appendChild(gi);
  list(o.id,TR.get,T('theyGive',{n:o.name})); var ri=h('input',{type:'number',min:0,step:100,placeholder:T('getCashPh'),value:TR.rc||''}); ri.oninput=function(){TR.rc=+this.value||0;}; w.appendChild(ri);
  var r=h('div',{class:'btnrow'}); r.appendChild(B(T('sendBtn'),'green',function(){ act({t:'trade',to:TR.to,giveProps:Object.keys(TR.give).map(Number),getProps:Object.keys(TR.get).map(Number),giveCash:TR.gc,getCash:TR.rc}).then(function(){ TR={to:TR.to,give:{},get:{},gc:0,rc:0}; closeSheet(); }); })); r.appendChild(closeBtn()); w.appendChild(r); return w; }
function tradeDesc(tr){ var st=S.st, A=VY.P(st,tr.from), Bp=VY.P(st,tr.to); var nm=function(a){return a.map(function(i){return sqN(i);}).join(', ');};
  var w=h('div'); w.appendChild(h('div',{class:'prow'},[h('div',{class:'tx'},[h('b',null,T('gives',{n:A.name})),h('div',null,[nm(tr.giveProps),tr.giveCash?fmt(tr.giveCash):''].filter(Boolean).join(' + ')||T('nothingW'))])]));
  w.appendChild(h('div',{class:'prow'},[h('div',{class:'tx'},[h('b',null,T('gives',{n:Bp.name})),h('div',null,[nm(tr.getProps),tr.getCash?fmt(tr.getCash):''].filter(Boolean).join(' + ')||T('nothingW'))])])); return w; }
function tradeInView(){ var tr=S.st.trade; if(!tr||tr.to!==S.sess.pid) return null; var w=h('div'); w.appendChild(h('h3',null,T('tradeFrom',{n:VY.P(S.st,tr.from).name}))); w.appendChild(tradeDesc(tr));
  var r=h('div',{class:'btnrow'}); r.appendChild(B(T('acceptBtn'),'green',function(){act({t:'tradeReply',accept:true}); closeSheet();})); r.appendChild(B(T('rejectBtn'),'red',function(){act({t:'tradeReply',accept:false}); closeSheet();})); w.appendChild(r); return w; }
function playerView(pid){ var st=S.st, p=VY.P(st,pid); var w=h('div'); w.appendChild(h('h3',{style:'color:'+p.color},p.name));
  w.appendChild(h('div',{class:'muted'},T('cashNet',{m:p.cash,m2:VY.netWorth(st,p)})));
  Object.keys(st.props).map(Number).filter(function(i){return st.props[i].o===pid;}).forEach(function(i){ var s=SQ[i],pr=st.props[i]; w.appendChild(h('div',{class:'prow'},[h('div',{class:'sw',style:'background:'+(s.group?gcol(s.group):'#5d4037')}),h('div',{class:'tx'},[h('b',null,sqN(i)),h('div',null,pr.m?T('mortW'):(pr.h===4?T('hotelL'):(pr.h?(pr.h===1?T('h1'):T('housesN',{x:pr.h})):'')))])])); });
  w.appendChild(closeBtn()); return w; }
function logView(){ var w=h('div'); w.appendChild(h('h3',null,T('logT'))); var L=h('div',{class:'log'}); S.st.log.slice().reverse().forEach(function(e){ L.appendChild(h('div',null,VYI.ev(e))); }); w.appendChild(L); w.appendChild(closeBtn()); return w; }
function winView(){ var st=S.st; var w=h('div',{class:'win'}); var wn=st.winner?VY.P(st,st.winner):null; w.appendChild(h('div',{class:'cup'},'🏆')); w.appendChild(h('h3',null,wn?T('wins',{n:wn.name}):T('gameOverW')));
  st.players.slice().sort(function(a,b){ return (a.bankrupt-b.bankrupt) || VY.netWorth(st,b)-VY.netWorth(st,a); }).forEach(function(p,i){ w.appendChild(h('div',{class:'rank'},[ h('span',null,(i+1)+'. '+p.name), h('span',null,p.bankrupt?'💥 '+T('bankruptW'):fmt(VY.netWorth(st,p)))])); });
  var r=h('div',{class:'btnrow'}); r.appendChild(B(T('newGame'),'saffron',function(){ closeSheet(); leave(); })); r.appendChild(closeBtn()); w.appendChild(r); return w; }
function rulesView(){ var w=h('div',{class:'rules'}); w.appendChild(h('h3',null,T('rulesT')));
  ['r1','r2','r3','r4','r5','r6','r7','r8','r9','r10','r11','r12','r13'].map(function(k){ return T(k); }).forEach(function(t){ w.appendChild(h('p',null,t)); });
  w.appendChild(closeBtn()); return w; }
$('menuBtn').onclick=function(){ openSheet('menu',function(){ var w=h('div'); w.appendChild(h('h3',null,T('menuT',{x:S.sess.code})));
  w.appendChild(B(T('zoomBtn'),'blue',function(){ $('boardWrap').classList.toggle('zoom'); closeSheet(); setTimeout(function(){fitBoard(); renderTokens(false);},50); })); w.appendChild(h('div',{style:'height:6px'}));
  w.appendChild(B(T('logT'),'blue',function(){openSheet('log',logView);})); w.appendChild(h('div',{style:'height:6px'}));
  w.appendChild(B(T('shareRoom'),'green',share)); w.appendChild(h('div',{style:'height:6px'}));
  w.appendChild(B(T('rulesBtn'),'blue',function(){openSheet('rules',rulesView);})); w.appendChild(h('div',{style:'height:6px'}));
  var m=me(); if(S.st.phase==='play' && m && !m.bankrupt) w.appendChild(B(T('resignBtn'),'red',function(){ if(confirm(T('confirmResign'))) act({t:'bankrupt',resign:true}).then(function(){ closeSheet(); }); }));
  else w.appendChild(B(T('homeBtn'),'grey',leave));
  w.appendChild(h('div',{style:'height:6px'})); w.appendChild(closeBtn()); return w; }); };
// ---------- events / cards ----------
function cardPop(e){ var deck=e.deck, dk=deck==='chance'?VY.D.chance_by_dice_total:VY.D.community_chest_by_dice_total; var c=dk[e.total]; var p=VY.P(S.st,e.pid);
  var pop=$('cardPop'); pop.innerHTML=''; pop.appendChild(h('div',{class:'gcard '+deck},[h('div',{class:'dk'},(deck==='chance'?'🍀 ':'🤝 ')+T('deck_'+deck)),h('div',{class:'num'},(p?p.name+' • ':'')+T('diceTotal',{x:e.total})),h('div',{class:'txt'},T('card_'+deck+'_'+e.total)||c.gu)]));
  pop.classList.remove('hidden'); clearTimeout(S.popT); S.popT=setTimeout(function(){pop.classList.add('hidden');},1800); }
function events(fresh){
  var st=S.st; var evs=st.log.filter(function(e){return e.id>S.lastEv;}); if(fresh){ S.lastEv=st.evSeq||0; return; } S.lastEv=st.evSeq||S.lastEv;
  var delay=Math.max(0,animUntil-Date.now());
  evs.forEach(function(e){
    if(e.k==='card') setTimeout(function(){cardPop(e);}, delay+100);
    else if(['rent','buy','jail','bankrupt','tax','club','salary','trade','auction','rest','skip','win','auto','debt','build','pass'].indexOf(e.k)>=0) setTimeout(function(){ toast(VYI.ev(e)); if(e.k==='rent'||e.k==='salary'||e.k==='buy') sCoin(); }, e.k==='salary'?0:delay);
  });
}
function confetti(){ var cols=['#ff6d00','#f9a825','#d81b60','#2e7d32','#1565c0']; for(var i=0;i<80;i++){ var c=h('div',{class:'conf'}); c.style.left=Math.random()*100+'vw'; c.style.background=cols[i%5]; c.style.animationDuration=(2+Math.random()*2)+'s'; c.style.animationDelay=Math.random()+'s'; document.body.appendChild(c); setTimeout((function(x){return function(){x.remove();};})(c),5000); } }
// ---------- main render ----------
function onState(old){
  var st=S.st;
  if(st.phase==='lobby'){ renderLobby(); return; }
  var first = !old || old.phase==='lobby' || !$('game').offsetParent;
  show('game'); buildBoard(); $('roomChip').textContent=st.code;
  var rolled = st.lastRoll && st.lastRoll.n!==S.rollN; 
  renderBoard(); renderCenter(); renderPlayers(); renderActions();
  if(first){ S.rollN=st.lastRoll?st.lastRoll.n:0; renderDice(false); requestAnimationFrame(function(){ renderTokens(false); if(isB100()){ var m0=me(); keepVisible(m0&&!m0.bankrupt?m0.pos:VY.cur(st).pos); } }); events(true); }
  else { if(rolled){ S.rollN=st.lastRoll.n; renderDice(true); } renderTokens(true); events(false); }
  // auto sheets
  var m=me(), cur=VY.cur(st);
  if(st.phase==='play'){
    if(st.tp==='auction' && st.pending && st.pending.type==='auction'){ if(S.sheetKind!=='auction' && !S.auctionDismissed){ setTimeout(function(){ if(S.st.tp==='auction') openSheet('auction',auctionView); }, 350); S.auctionDismissed=true; } }
    else S.auctionDismissed=false;
    if(st.trade && st.trade.to===S.sess.pid && S.shownTrade!==st.trade.id){ S.shownTrade=st.trade.id; openSheet('tradein',tradeInView); vib([30,40,30]); }
    if(old && old.phase==='play' && VY.cur(old).id!==cur.id && cur.id===S.sess.pid){ vib(60); toast(T('yourTurn')); }
  }
  if(st.phase==='over' && old && old.phase!=='over'){ confetti(); setTimeout(function(){ openSheet('win',winView); }, 900); }
  if(S.sheetKind && S.sheetKind!=='trade') refreshSheet();
  schedTimer();
}
window.addEventListener('resize',function(){ if(S.st&&S.st.phase!=='lobby'&&cells.length){ fitBoard(); renderTokens(false); } });
// ---------- boot ----------
try{ var saved=JSON.parse(localStorage.getItem('vy_sess')||'null'); }catch(e){ saved=null; }
var urlRoom=qp.get('room'); if(saved && urlRoom && saved.code!==urlRoom.toUpperCase()) saved=null;
if(saved){ req('join',{code:saved.code,pid:saved.pid,token:saved.token,rejoin:true}).then(function(j){ if(j.rejoined) enter(j); else leave(); }).catch(function(){ localStorage.removeItem('vy_sess'); show('home'); }); }

// ---------- language ----------
function sizeLangBtn(){ var b=$('langBtn'); if(b) document.documentElement.style.setProperty('--lbw',(b.offsetWidth+16)+'px'); }
function langView(){ var w=h('div',{class:'langs'}); w.appendChild(h('h3',null,T('langTitle'))); var g=h('div',{class:'lgrid'});
  VYI.LANGS.forEach(function(l){ g.appendChild(h('button',{class:'lgb'+(l[0]===VYI.lang?' on':''),lang:l[0],dir:(l[0]==='ar'||l[0]==='ur')?'rtl':'ltr','data-lang':l[0],onclick:function(){ var b=this; b.classList.add('wait'); VYI.set(l[0],function(ok){ b.classList.remove('wait'); if(!ok){ toast(T('netErr'),true); return; } closeSheet(); }); }},l[1])); });
  w.appendChild(g); w.appendChild(closeBtn()); return w; }
$('langBtn').onclick=function(){ if(S.sheetKind==='lang'){ closeSheet(); return; } openSheet('lang',langView); };
VYI.onChange(function(){
  sizeLangBtn(); renderHomePick();
  if(cells.length) rebuildBoard();
  if(S.st){ if(S.st.phase==='lobby') renderLobby(); else if(!$('game').classList.contains('hidden')){ renderBoard(); renderCenter(); renderPlayers(); renderActions(); requestAnimationFrame(function(){ renderTokens(false); }); } }
  if(S.sheetKind && S.sheetKind!=='lang') refreshSheet();
});
VYI.applyDoc(); sizeLangBtn();
if(document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ sizeLangBtn(); if(cells.length) fitBoard(); });
window.VYDBG=S;
window.vyBack=function(){ if(!$('cardPop').classList.contains('hidden')){ $('cardPop').classList.add('hidden'); return true; } if(S.sheetKind){ closeSheet(); return true; } if(!$('lobby').classList.contains('hidden')){ leave(); return true; } return false; };
if(/VyaparApp/.test(navigator.userAgent)){ var dl=document.getElementById('dlLink'); if(dl) dl.style.display='none'; }
})();

/* auto-update: if a newer version of the game is live, reload (room is rejoined from saved session) */
(function(){
  var mine=null; try{ var ss=document.getElementsByTagName('script'); for(var i=0;i<ss.length;i++){ var m=/app\.js\?v=(\d+)/.exec(ss[i].src||''); if(m){ mine=m[1]; } } }catch(e){}
  if(!mine) return;
  var busy=false;
  function check(){
    if(busy) return; busy=true;
    fetch('./?vc='+Date.now(),{cache:'no-store'}).then(function(r){ return r.ok?r.text():''; }).then(function(t){
      busy=false; var m=/app\.js\?v=(\d+)/.exec(t||'');
      if(m && m[1]!==mine){ location.replace('./?t='+Date.now()); }
    }).catch(function(){ busy=false; });
  }
  document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='visible') check(); });
  window.addEventListener('focus',check);
  setInterval(check,120000);
  setTimeout(check,3000);
})();
