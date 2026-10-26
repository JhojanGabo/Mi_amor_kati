/* ==========================================================
   LÓGICA DE LA EXPERIENCIA
   (No necesitas tocar este archivo: los textos están en config.js)
   ========================================================== */
(() => {
  'use strict';

  const C = window.KATE_CONFIG;
  if (!C) {
    document.body.innerHTML = '<p style="color:#fff;padding:2rem;font-family:sans-serif">No se encontró config.js</p>';
    return;
  }
  const T = C.texts;
  const FX = window.FX;
  const Ambient = window.Ambient;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const nextFrame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = s => String(s).replace(/\{her\}/g, C.herName).replace(/\{from\}/g, C.fromName);
  const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  const show = el => { el.hidden = false; };

  /* ---------- Rellenar textos desde config.js ---------- */
  $$('[data-t]').forEach(el => {
    const v = get(T, el.dataset.t);
    if (typeof v === 'string') el.textContent = fmt(v);
  });
  $$('[data-her]').forEach(el => { el.textContent = C.herName; });
  document.title = fmt(T.pageTitle || 'Para ti ✦');
  $('#signature').textContent = fmt(T.closing.signature);
  if (/TU NOMBRE/i.test(C.fromName)) { $('#devbar').hidden = false; console.warn('Falta cambiar fromName en config.js'); }

  /* ---------- Estado ---------- */
  const ORDER = ['intro', 'ameri', 'story', 'explore', 'wish', 'proposal', 'closing'];
  const state = {
    current: null, run: 0, visited: new Set(),
    storyDone: false, propReady: false, yes: false,
    wishIdx: 0, wishBusy: false, count: 0
  };

  /* ---------- Puntos de navegación ---------- */
  const dotsEl = $('#dots');
  ORDER.forEach((id, i) => {
    const b = document.createElement('button');
    b.className = 'dot'; b.type = 'button'; b.dataset.go = id; b.disabled = true;
    b.setAttribute('aria-label', 'Capítulo ' + (i + 1));
    dotsEl.appendChild(b);
  });
  function updateDots() {
    $$('.dot').forEach(d => {
      const id = d.dataset.go;
      d.disabled = !state.visited.has(id);
      d.classList.toggle('visited', state.visited.has(id));
      d.classList.toggle('current', id === state.current);
    });
  }

  /* ---------- Utilidades visuales ---------- */
  function flash(big) {
    const f = $('#flash');
    f.classList.remove('go', 'big');
    void f.offsetWidth;
    f.classList.add('go');
    if (big) f.classList.add('big');
  }

  async function reveal(el, text, alive, delay = 170) {
    el.textContent = '';
    const spans = fmt(text).split(/\s+/).filter(Boolean).map(w => {
      const s = document.createElement('span');
      s.className = 'w'; s.textContent = w;
      el.appendChild(s);
      el.appendChild(document.createTextNode(' '));
      return s;
    });
    await nextFrame();
    for (const s of spans) {
      if (!alive()) return false;
      s.classList.add('on');
      await sleep(reduce ? 15 : delay);
    }
    return alive();
  }

  function showGate(el) { el.classList.add('show'); }
  function hideGate(el) { el.classList.remove('show'); }

  /* ---------- Gestor de escenas ---------- */
  const hooks = {};

  async function go(id) {
    if (id === state.current || !ORDER.includes(id)) return;
    const run = ++state.run;
    const prev = state.current ? $('#' + state.current) : null;
    const next = $('#' + id);

    state.current = id;
    document.body.dataset.scene = id;
    document.body.classList.toggle('dim', id === 'proposal' && !state.yes);
    updateDots();

    if (prev) {
      prev.classList.remove('is-active', 'is-in');
      flash(false);
      await sleep(reduce ? 40 : 650);
      if (run !== state.run) return;
    }

    FX.setShootRate(id === 'closing' ? 2.8 : 8);
    next.scrollTop = 0;
    next.classList.add('is-active');
    await nextFrame();
    if (run !== state.run) return;
    next.classList.add('is-in');
    state.visited.add(id);
    updateDots();

    if (hooks[id]) hooks[id](() => run === state.run);
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('.btn');
    if (b) { b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); }
    const g = e.target.closest('[data-go]');
    if (g && !g.disabled) go(g.dataset.go);
  });

  /* ---------- 1 · Intro ---------- */
  $('#introBtn').addEventListener('click', () => {
    FX.burstAtEl($('#introBtn'), { n: 26, power: 1.3 });
    flash(false);
    go('ameri');
  });

  /* ---------- Música ambiental ---------- */
  const soundBtn = $('#soundBtn');
  if (!Ambient || !Ambient.supported) soundBtn.hidden = true;
  else {
    soundBtn.addEventListener('click', () => Ambient.toggle());
    Ambient.onChange(on => {
      soundBtn.setAttribute('aria-pressed', String(on));
      soundBtn.setAttribute('aria-label', on ? 'Silenciar música ambiental' : 'Activar música ambiental');
    });
  }

  /* ---------- 2 · Ameri / reproductor ---------- */
  const song = C.song || {};
  const player = $('#player'), embed = $('#embed'), playBtn = $('#playSong'), eq = $('#eq');
  const ytId = (song.youtubeId || '').trim();
  $('#songTitle').textContent = song.title || 'Ameri';
  $('#songArtist').textContent = song.artist || '';
  $('#ytLink').href = ytId ? 'https://www.youtube.com/watch?v=' + encodeURIComponent(ytId) : (song.youtubeUrl || '#');
  $('#spLink').href = song.spotifyUrl || '#';
  if (!song.spotifyUrl) $('#spLink').hidden = true;
  const playLabel = fmt(T.ameri.play) + (ytId ? '' : ' ↗');
  playBtn.textContent = playLabel;
  let embedded = false;

  function closePlayer() {
    embed.innerHTML = ''; embed.hidden = true;
    player.classList.remove('playing'); eq.classList.remove('on');
    playBtn.textContent = playLabel;
    embedded = false;
  }
  playBtn.addEventListener('click', () => {
    if (embedded) { closePlayer(); return; }
    if (!ytId) {
      const url = song.youtubeUrl || song.spotifyUrl;
      if (url) window.open(url, '_blank', 'noopener');
      return;
    }
    if (Ambient) Ambient.stop();           // la canción manda sobre el ambiente
    const f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(ytId) + '?autoplay=1&playsinline=1&rel=0&modestbranding=1';
    f.title = (song.title || 'Canción') + ' — ' + (song.artist || '');
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.referrerPolicy = 'strict-origin-when-cross-origin';
    f.allowFullscreen = true;
    embed.appendChild(f); show(embed);
    player.classList.add('playing'); eq.classList.add('on');
    playBtn.textContent = fmt(T.ameri.close);
    embedded = true;
  });

  /* ---------- 3 · Historia ---------- */
  hooks.story = async alive => {
    const box = $('#storyLines'), btn = $('#storyNext');
    box.innerHTML = '';
    hideGate(btn);
    if (state.storyDone) {
      T.story.lines.forEach(l => { const p = document.createElement('p'); p.textContent = fmt(l); box.appendChild(p); });
      showGate(btn);
      return;
    }
    await sleep(1800);
    if (!alive()) return;
    for (const line of T.story.lines) {
      const p = document.createElement('p');
      box.appendChild(p);
      if (!(await reveal(p, line, alive, 200))) return;
      FX.burstAtEl(p, { n: 6, power: 0.6, kinds: ['spark'], size: 0.8 });
      await sleep(1300);
      if (!alive()) return;
    }
    state.storyDone = true;
    showGate(btn);
  };

  /* ---------- 4 · Sorpresas: secreto ---------- */
  $('#secretBtn').addEventListener('click', () => {
    $('#secretBtn').hidden = true;
    $('#secretBox').classList.add('open');
    flash(false);
    setTimeout(() => FX.burstAtEl($('#secretBox'), { n: 22, power: 1.1 }), 450);
    if (navigator.vibrate) navigator.vibrate(30);
  });

  /* ---------- 4 · Sorpresas: constelación-corazón ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  const svg = $('#constSvg');
  const PTS = Array.from({ length: 12 }, (_, i) => {
    const t = i * 2 * Math.PI / 12;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return [50 + x * 2.6, 50 - (y + 2.6) * 2.6];
  });
  const mk = (tag, attrs) => {
    const e = document.createElementNS(NS, tag);
    Object.keys(attrs).forEach(k => e.setAttribute(k, attrs[k]));
    svg.appendChild(e);
    return e;
  };
  const heartFill = mk('polygon', { points: PTS.map(p => p.join(',')).join(' '), class: 'heart-fill' });
  PTS.forEach(p => mk('circle', { cx: p[0], cy: p[1], r: 1.1, class: 'ghost' }));

  function lightStar(i) {
    const p = PTS[i];
    if (i > 0) { const q = PTS[i - 1]; mk('line', { x1: q[0], y1: q[1], x2: p[0], y2: p[1], class: 'seg' }); }
    mk('circle', { cx: p[0], cy: p[1], r: 4, class: 'glow' });
    mk('circle', { cx: p[0], cy: p[1], r: 1.8, class: 'star' });
    if (i === PTS.length - 1) {
      mk('line', { x1: p[0], y1: p[1], x2: PTS[0][0], y2: PTS[0][1], class: 'seg' });
      heartFill.classList.add('on');
    }
  }
  function starScreenPos(i) {
    const r = svg.getBoundingClientRect();
    return [r.left + PTS[i][0] / 100 * r.width, r.top + PTS[i][1] / 100 * r.height];
  }
  $('#countBtn').addEventListener('click', () => {
    state.count++;
    const num = $('#countNum');
    num.textContent = state.count;
    num.classList.remove('bump'); void num.offsetWidth; num.classList.add('bump');
    if (state.count <= PTS.length) {
      const i = state.count - 1;
      lightStar(i);
      const [x, y] = starScreenPos(i);
      FX.burst(x, y, { n: 9, power: 0.8, kinds: ['spark', 'heart'], size: 0.9 });
      if (i === PTS.length - 1) {
        $('#countNote').textContent = fmt(T.explore.counterDone);
        setTimeout(() => FX.burstAtEl(svg, { n: 40, power: 1.5, kinds: ['heart', 'spark'] }), 500);
        if (navigator.vibrate) navigator.vibrate([30, 40, 30]);
      }
    }
  });

  /* ---------- 5 · Deseo ---------- */
  $('#wishBtn').addEventListener('click', async () => {
    if (state.wishBusy || !T.wish.list.length) return;
    state.wishBusy = true;
    const run = state.run, alive = () => run === state.run;
    const btn = $('#wishBtn'), card = $('#wishCard'), txt = $('#wishText');
    btn.disabled = true;
    FX.shoot({ fromLeft: true });
    setTimeout(() => FX.shoot({ fromLeft: false }), 300);
    await sleep(950);
    if (alive()) {
      txt.textContent = '';
      showGate(card);
      const wish = T.wish.list[state.wishIdx % T.wish.list.length];
      state.wishIdx++;
      if (await reveal(txt, wish, alive, 150)) {
        FX.burstAtEl(card, { n: 18, power: 1.1 });
        btn.textContent = fmt(T.wish.btnAgain);
        showGate($('#wishNext'));
      }
    }
    btn.disabled = false;
    state.wishBusy = false;
  });

  /* ---------- 6 · Declaración ---------- */
  const lines = $('#propLines'), ask = $('#ask'), answers = $('#answers');
  const morePanel = $('#morePanel'), yesWrap = $('#yesWrap'), yesMsg = $('#yesMsg'), yesNext = $('#yesNext');

  function openPanel(kind) {
    $('#panelMsg').textContent = fmt(kind === 'no' ? T.proposal.noMsg : T.proposal.moreMsg);
    morePanel.classList.add('open');
    requestAnimationFrame(() => showGate(morePanel));
  }
  function closePanel(instant) {
    hideGate(morePanel);
    if (instant) morePanel.classList.remove('open');
    else setTimeout(() => { if (!morePanel.classList.contains('show')) morePanel.classList.remove('open'); }, 700);
  }

  function renderLines(cls) {
    lines.className = 'prop-lines' + (cls ? ' ' + cls : '');
    lines.innerHTML = '';
    T.proposal.lines.forEach(l => { const p = document.createElement('p'); p.textContent = fmt(l); lines.appendChild(p); });
  }

  function renderYesState() {
    lines.className = 'prop-lines gone'; lines.innerHTML = '';
    ask.hidden = true; answers.hidden = true;
    closePanel(true);
    yesWrap.classList.add('open');
    yesMsg.textContent = fmt(T.proposal.yesMsg);
    showGate(yesWrap); showGate(yesNext);
  }

  hooks.proposal = async alive => {
    if (state.yes) { renderYesState(); return; }

    ask.hidden = false; answers.hidden = false;
    closePanel(true);
    resetNo();

    if (state.propReady) {            // si vuelve a esta escena, todo ya está listo
      renderLines('fade');
      showGate(ask); showGate(answers);
      return;
    }

    lines.className = 'prop-lines'; lines.innerHTML = '';
    hideGate(ask); hideGate(answers);
    await sleep(2200);
    if (!alive()) return;
    for (const line of T.proposal.lines) {
      const p = document.createElement('p');
      lines.appendChild(p);
      if (!(await reveal(p, line, alive, 210))) return;
      await sleep(1500);
      if (!alive()) return;
    }
    await sleep(1300);                // pausa de expectación
    if (!alive()) return;
    lines.classList.add('fade');
    showGate(ask);
    FX.burstAtEl(ask, { n: 16, power: 0.9, kinds: ['heart'] });
    await sleep(2200);
    if (!alive()) return;
    showGate(answers);
    state.propReady = true;
  };

  $('#yesBtn').addEventListener('click', async () => {
    if (state.yes) return;
    state.yes = true;
    const run = state.run, alive = () => run === state.run;
    if (navigator.vibrate) navigator.vibrate([40, 60, 40, 60, 140]);
    document.body.classList.remove('dim');
    flash(true);
    FX.celebrate(9000);
    hideGate(answers); hideGate(ask); closePanel();
    await sleep(900);
    if (!alive()) return;
    lines.className = 'prop-lines gone';
    ask.hidden = true; answers.hidden = true;
    yesWrap.classList.add('open');
    await nextFrame();
    showGate(yesWrap);
    await sleep(700);
    if (!alive()) return;
    if (await reveal(yesMsg, T.proposal.yesMsg, alive, 190)) {
      FX.burstAtEl(yesMsg, { n: 30, power: 1.3 });
      await sleep(1200);
      if (alive()) showGate(yesNext);
    }
  });

  /* Botón "No" juguetón: se encoge en cada toque, pero NUNCA desaparece.
     Al terminar las frases, un toque más se toma como un "no" real y se respeta. */
  const noBtn = $('#noBtn'), noHint = $('#noHint'), yesBtnEl = $('#yesBtn');
  let noCount = 0;
  function resetNo() {
    noCount = 0;
    noBtn.style.width = ''; noBtn.style.fontSize = ''; noBtn.style.padding = '';
    yesBtnEl.style.setProperty('--s', '1');
    noHint.classList.remove('on'); noHint.textContent = '';
  }
  noBtn.addEventListener('click', () => {
    const hints = T.proposal.noHints || [];
    if (noCount >= hints.length) {       // ya vio todo el juego: es un "no" de verdad
      hideGate(answers);
      setTimeout(() => { answers.hidden = true; openPanel('no'); }, 500);
      return;
    }
    noCount++;
    const w = [100, 82, 66, 52, 40, 34][Math.min(noCount, 5)];
    noBtn.style.width = w + '%';
    noBtn.style.fontSize = Math.max(0.72, 1 - noCount * 0.07) + 'rem';
    noBtn.style.padding = '12px ' + Math.max(14, 28 - noCount * 4) + 'px';
    yesBtnEl.style.setProperty('--s', String(1 + Math.min(noCount, 4) * 0.025));
    noHint.classList.remove('on');
    setTimeout(() => { noHint.textContent = fmt(hints[noCount - 1]); noHint.classList.add('on'); }, 180);
    FX.burstAtEl(yesBtnEl, { n: 8, power: 0.7, kinds: ['heart'] });
    if (navigator.vibrate) navigator.vibrate(15);
  });

  $('#moreBtn').addEventListener('click', () => {
    hideGate(answers);
    setTimeout(() => { answers.hidden = true; openPanel('more'); }, 500);
    FX.burstAtEl($('#moreBtn'), { n: 12, power: 0.9, kinds: ['spark', 'heart'] });
  });
  $('#moreBack').addEventListener('click', () => {
    resetNo();
    closePanel();
    setTimeout(() => { answers.hidden = false; requestAnimationFrame(() => showGate(answers)); }, 700);
  });
  $('#moreExplore').addEventListener('click', () => {
    go('explore');   // al volver a la pregunta, la escena se restablece sola
  });

  /* ---------- 7 · Cierre ---------- */
  hooks.closing = alive => {
    $('#backAskBtn').hidden = state.yes;
    setTimeout(() => { if (alive()) FX.burstAtEl($('.closing-name'), { n: 34, power: 1.5, kinds: ['spark', 'heart'] }); }, 1000);
  };
  $('#againBtn').addEventListener('click', () => go('intro'));
  $('#backAskBtn').addEventListener('click', () => go('proposal'));

  /* ---------- Arranque ---------- */
  go('intro');
})();
