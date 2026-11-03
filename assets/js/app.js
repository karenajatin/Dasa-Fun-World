/* Dasa Fun World — portal interactions */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var GAMES = window.DFW_GAMES || {};
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && matchMedia('(pointer: fine)').matches;
  var hint = $('#hint'); if (hint && !fine) hint.innerHTML = 'Drag your <i>finger</i> anywhere to paint the sky';
  if (hint && reduce) hint.hidden = true;
  var yr = $('#yr'); if (yr) yr.textContent = new Date().getFullYear();

  // nav shadow on scroll
  var nav = $('#nav');
  var onScroll = function () { nav.classList.toggle('scrolled', scrollY > 10); };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // reveal on scroll (cards stagger in)
  var revealEls = $$('.card, .reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      var i = 0;
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target; io.unobserve(el);
        setTimeout(function () { el.classList.add('in'); }, (i++) * 70);
      });
    }, { rootMargin: '0px 0px -5% 0px', threshold: 0.05 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else revealEls.forEach(function (el) { el.classList.add('in'); });

  // 3D tilt on desktop
  if (fine && !reduce) {
    $$('.card').forEach(function (c) {
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        c.style.transform = 'perspective(800px) rotateY(' + (x * 10) + 'deg) rotateX(' + (-y * 10) + 'deg) translateY(-6px)';
      });
      c.addEventListener('pointerleave', function () { c.style.transform = ''; });
    });
  }

  // search + category filter
  var grid = $('#grid'), cards = $$('.card', grid), q = $('#q'), chips = $$('#chips .chip'), empty = $('#empty');
  var cat = 'All';
  function filter() {
    var words = (q.value || '').toLowerCase().trim().split(/\s+/).filter(Boolean), shown = 0;
    cards.forEach(function (c) {
      var okCat = cat === 'All' || (' ' + c.dataset.cats + ' ').indexOf(' ' + cat + ' ') >= 0;
      var kw = c.dataset.kw || '';
      var okQ = words.every(function (w) { return kw.indexOf(w) >= 0; });
      var show = okCat && okQ;
      c.hidden = !show; if (show) { shown++; c.classList.add('in'); }
    });
    empty.hidden = shown > 0;
  }
  q.addEventListener('input', filter);
  chips.forEach(function (b) {
    b.addEventListener('click', function () {
      cat = b.dataset.cat;
      chips.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      filter();
    });
  });

  // featured carousel
  var track = $('#track'), slides = $$('.slide', track), dots = $$('#dots button'), cur = 0, timer = null;
  function goTo(i, smooth) {
    cur = (i + slides.length) % slides.length;
    track.scrollTo({ left: slides[cur].offsetLeft - track.offsetLeft, behavior: smooth === false || reduce ? 'auto' : 'smooth' });
    setDots();
  }
  function setDots() { dots.forEach(function (d, k) { d.setAttribute('aria-current', String(k === cur)); }); }
  dots.forEach(function (d, k) { d.addEventListener('click', function () { goTo(k); restart(); }); });
  $('#prevBtn').addEventListener('click', function () { goTo(cur - 1); restart(); });
  $('#nextBtn').addEventListener('click', function () { goTo(cur + 1); restart(); });
  var st;
  track.addEventListener('scroll', function () {
    clearTimeout(st);
    st = setTimeout(function () { var w = track.clientWidth || 1; var i = Math.round(track.scrollLeft / (slides[0].offsetWidth + 16)); if (i !== cur && i >= 0 && i < slides.length) { cur = i; setDots(); } }, 80);
  }, { passive: true });
  function restart() { clearInterval(timer); if (!reduce) timer = setInterval(function () { if (!document.hidden && !playing && inView) goTo(cur + 1); }, 5500); }
  var inView = true;
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { inView = e[0].isIntersecting; }).observe(track);
  track.addEventListener('pointerenter', function () { clearInterval(timer); });
  track.addEventListener('pointerleave', restart);
  track.addEventListener('touchstart', function () { clearInterval(timer); }, { passive: true });
  track.addEventListener('touchend', restart, { passive: true });
  restart();

  // recently played
  var RKEY = 'dfw-recent';
  function getRecent() { try { return JSON.parse(localStorage.getItem(RKEY)) || []; } catch (e) { return []; } }
  function pushRecent(slug) { var r = getRecent().filter(function (s) { return s !== slug; }); r.unshift(slug); try { localStorage.setItem(RKEY, JSON.stringify(r.slice(0, 6))); } catch (e) {} renderRecent(); }
  function renderRecent() {
    var r = getRecent().filter(function (s) { return GAMES[s]; }), box = $('#recent'), sec = $('#continue');
    if (!r.length) { sec.hidden = true; return; }
    box.innerHTML = '';
    r.forEach(function (s) {
      var a = document.createElement('a'); a.href = 'games/' + s + '/'; a.dataset.game = s;
      var img = document.createElement('img'); img.src = 'assets/img/games/' + s + '.webp'; img.alt = ''; img.loading = 'lazy';
      var t = document.createElement('span'); t.textContent = GAMES[s].title;
      a.appendChild(img); a.appendChild(t); box.appendChild(a);
    });
    sec.hidden = false;
  }
  renderRecent();

  // full-screen game player
  var player = $('#player'), loading = $('#loading'), playing = null, frame = null, pushed = false;
  function openGame(slug, fromGesture) {
    if (!GAMES[slug] || playing) return;
    playing = slug;
    var g = GAMES[slug];
    $('#loadTitle').textContent = g.title; $('#loadImg').src = 'assets/img/games/' + slug + '.webp';
    player.style.setProperty('--accent', g.color);
    loading.classList.remove('done');
    frame = document.createElement('iframe');
    frame.title = g.title; frame.src = 'games/' + slug + '/';
    frame.setAttribute('allow', 'autoplay; fullscreen; gamepad; screen-wake-lock; clipboard-write');
    frame.setAttribute('allowfullscreen', '');
    frame.addEventListener('load', function () { setTimeout(function () { loading.classList.add('done'); try { frame.focus(); frame.contentWindow.focus(); } catch (e) {} }, 250); });
    player.appendChild(frame);
    player.hidden = false; document.body.classList.add('playing');
    requestAnimationFrame(function () { player.classList.add('open'); });
    if (window.DFWSplash && DFWSplash.pause) DFWSplash.pause();   // the fluid never runs over a game
    if (fromGesture && player.requestFullscreen && !fine) { player.requestFullscreen({ navigationUI: 'hide' }).catch(function () {}); }
    try { history.pushState({ dfwGame: slug }, '', '#play-' + slug); pushed = true; } catch (e) { pushed = false; }
    pushRecent(slug);
    document.title = g.title + ' – Dasa Fun World';
  }
  function closeGame(fromPop) {
    if (!playing) return;
    playing = null;
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
    player.classList.remove('open');
    setTimeout(function () { if (frame) { frame.src = 'about:blank'; frame.remove(); frame = null; } player.hidden = true; }, 250);
    document.body.classList.remove('playing');
    if (window.DFWSplash && DFWSplash.resume) DFWSplash.resume();
    document.title = 'Dasa Fun World – Free Browser Games';
    if (!fromPop && pushed) { pushed = false; history.back(); }
    pushed = false;
  }
  window.DFWPlayer = { open: openGame, close: closeGame, current: function () { return playing; } };
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-game]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); openGame(a.dataset.game, true);
  });
  $('#closeBtn').addEventListener('click', function () { closeGame(false); });
  addEventListener('popstate', function () { if (playing) closeGame(true); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && playing) closeGame(false); });

  $('#randomBtn').addEventListener('click', function () {
    var keys = Object.keys(GAMES); openGame(keys[Math.floor(Math.random() * keys.length)], true);
  });

  // deep link: ?play=<game> (used by the app's shortcuts)
  var p = new URLSearchParams(location.search).get('play');
  if (p && GAMES[p]) { history.replaceState(null, '', location.pathname); openGame(p, false); }
  else if (/^#play-/.test(location.hash)) history.replaceState(null, '', location.pathname);

  // installable app
  var deferred = null, ib = $('#installBtn');
  addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; ib.hidden = false; });
  ib.addEventListener('click', function () { if (!deferred) return; deferred.prompt(); deferred.userChoice.finally(function () { deferred = null; ib.hidden = true; }); });
  addEventListener('appinstalled', function () { ib.hidden = true; });
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }

  // a little welcome swirl so people discover the effect
  addEventListener('load', function () {
    setTimeout(function () {
      if (playing || !window.DFWSplash || !DFWSplash.burst) return;
      var logo = $('.hero-logo'); if (!logo) return; var r = logo.getBoundingClientRect();
      if (r.bottom > 0) DFWSplash.burst(r.left + r.width / 2, r.top + r.height / 2);
    }, 700);
  });
})();
