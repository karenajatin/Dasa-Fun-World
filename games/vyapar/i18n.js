/* વ્યાપાર — languages. English is the default; the choice is saved per device. */
var VYI=(function(){
  var LANGS=[["en", "English"], ["gu", "ગુજરાતી"], ["hi", "हिन्दी"], ["mr", "मराठी"], ["bn", "বাংলা"], ["ta", "தமிழ்"], ["te", "తెలుగు"], ["kn", "ಕನ್ನಡ"], ["ml", "മലയാളം"], ["pa", "ਪੰਜਾਬੀ"], ["ur", "اردو"], ["es", "Español"], ["fr", "Français"], ["de", "Deutsch"], ["pt", "Português"], ["ru", "Русский"], ["ar", "العربية"], ["zh", "中文"], ["ja", "日本語"], ["ko", "한국어"]];
  var RTL={ar:1,ur:1};
  var VER='20';
  var DICT={}, cur='en', listeners=[];
  var saved=null; try{ saved=localStorage.getItem('vy_lang'); }catch(e){}
  var known={}; LANGS.forEach(function(l){ known[l[0]]=1; });
  if(saved && known[saved]) cur=saved;
  function add(code,t){ DICT[code]=t; }
  function has(code){ return !!DICT[code]; }
  function raw(k){ var d=DICT[cur]; if(d && d[k]!=null) return d[k]; d=DICT.en; if(d && d[k]!=null) return d[k]; return null; }
  // v20: on the India & Gujarat board a place carries its own names (English, Gujarati, Hindi; other languages show English);
  // Start/Jail/Club/Rest House/cards/taxes and the shared transport squares use the classic board's translations (tk).
  function b100(){ return window.VY && VY.boardId && VY.boardId!=='classic'; }
  function sqName(i){ var s=window.VY&&VY.SQ[i]; if(b100() && s){ if(s.tk!=null){ var t=raw('sq_'+s.tk); if(t!=null) return t; } return s['name_'+cur]||s.name_en; } var v=raw('sq_'+i); if(v!=null) return v; return s?s.name_en:''; }
  function sqShort(i){ var s=window.VY&&VY.SQ[i]; if(!s) return ''; if(!b100()||s.tk!=null||s.type!=='city') return sqName(i); return s['short_'+cur] || (s['name_'+cur] ? s['name_'+cur].split(',')[0] : (s.short_en||s.name_en)); }
  function money(v){ return window.VY ? VY.fmt(v) : '₹'+v; }
  // T(key, params): params n/n2 = names, s/s2 = square index (number), m/m2 = money (number), d+x = card deck/number
  function T(k,p){
    var t=raw(k); if(t==null) return '';
    if(!p) return t;
    return t.replace(/\{(\w+)\}/g,function(_,q){
      if(q==='deck') return raw('deck_'+p.d)||'';
      if(q==='card') return raw('card_'+p.d+'_'+p.x)||'';
      var v=p[q]; if(v==null) return '';
      if(q.charAt(0)==='s' && typeof v==='number') return sqName(v);
      var out = (q.charAt(0)==='m' && typeof v==='number') ? money(v) : String(v);
      // right-to-left pages: isolate names and amounts so "₹2,500" or a Latin name keeps its own direction
      if(RTL[cur] && /^(m|n|list)/.test(q)) out='\u2068'+out+'\u2069';
      return out;
    });
  }
  // a feed line from the game server: {key, p} rendered in this phone's language; older lines fall back to their Gujarati text
  function ev(e){ if(e && e.key){ var s=T('L_'+e.key, e.p||{}); if(s) return s; } return (e&&e.gu)||''; }
  function errMsg(j, fallback){ if(j && j.ek){ var s=T('E_'+j.ek, j.ep||null); if(s) return s; } return fallback||(j&&j.error)||T('netErr'); }
  function name(code){ for(var i=0;i<LANGS.length;i++) if(LANGS[i][0]===code) return LANGS[i][1]; return code; }
  function src(code){ return 'lang/'+code+'.js?v='+VER; }
  function load(code, cb){
    if(DICT[code]){ cb&&cb(true); return; }
    var s=document.createElement('script'); s.src=src(code); s.onload=function(){ cb&&cb(!!DICT[code]); }; s.onerror=function(){ cb&&cb(false); };
    document.head.appendChild(s);
  }
  function applyDoc(){
    var de=document.documentElement; de.lang=cur; de.dir=RTL[cur]?'rtl':'ltr';
    de.classList.toggle('rtl',!!RTL[cur]); de.setAttribute('data-lang',cur);
    var els=document.querySelectorAll('[data-t]'); for(var i=0;i<els.length;i++) els[i].textContent=T(els[i].getAttribute('data-t'));
    els=document.querySelectorAll('[data-tp]'); for(i=0;i<els.length;i++) els[i].setAttribute('placeholder',T(els[i].getAttribute('data-tp')));
    document.title=T('title');
    var lb=document.getElementById('langBtn'); if(lb) lb.textContent='🌐 '+name(cur);
  }
  function set(code, cb){
    if(!known[code]) return;
    load(code,function(ok){ if(!ok){ cb&&cb(false); return; } cur=code; try{ localStorage.setItem('vy_lang',code); }catch(e){} applyDoc(); listeners.forEach(function(f){ try{ f(code); }catch(e){ console.warn(e); } }); cb&&cb(true); });
  }
  function onChange(f){ listeners.push(f); }
  // the saved language (and English, the fallback) load before the game script
  document.write('<script src="'+src('en')+'"><\/script>');
  if(cur!=='en') document.write('<script src="'+src(cur)+'"><\/script>');
  return {LANGS:LANGS, T:T, ev:ev, errMsg:errMsg, sqName:sqName, sqShort:sqShort, add:add, has:has, get lang(){ return cur; }, name:name, set:set, onChange:onChange, applyDoc:applyDoc, isRTL:function(){ return !!RTL[cur]; }};
})();
