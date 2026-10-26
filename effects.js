
(() => {
  'use strict';

  const bg = document.getElementById('bg');
  const fx = document.getElementById('fx');
  const bctx = bg.getContext('2d');
  const fctx = fx.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0, DPR = 1;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const PALETTE = ['#ff4fd8', '#ff7ac6', '#a78bfa', '#8b5cf6', '#ffd6f5', '#ffffff'];

  /* ---------- Sprites de brillo (se dibujan una sola vez) ---------- */
  function glowSprite(rgb, size = 64) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gr.addColorStop(0, `rgba(${rgb},0.95)`);
    gr.addColorStop(0.35, `rgba(${rgb},0.28)`);
    gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr;
    g.fillRect(0, 0, size, size);
    return c;
  }
  const SPR = {
    pink: glowSprite('255,79,216'),
    violet: glowSprite('139,92,246'),
    white: glowSprite('255,255,255')
  };

  /* ---------- Formas (Path2D unitarios) ---------- */
  const heartP = new Path2D();
  heartP.moveTo(0, 0.55);
  heartP.bezierCurveTo(-1.0, -0.15, -0.6, -0.95, 0, -0.38);
  heartP.bezierCurveTo(0.6, -0.95, 1.0, -0.15, 0, 0.55);
  heartP.closePath();

  const sparkP = new Path2D();
  sparkP.moveTo(0, -1);
  sparkP.quadraticCurveTo(0, 0, 1, 0);
  sparkP.quadraticCurveTo(0, 0, 0, 1);
  sparkP.quadraticCurveTo(0, 0, -1, 0);
  sparkP.quadraticCurveTo(0, 0, 0, -1);
  sparkP.closePath();

  /* ---------- Tamaño ---------- */
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    for (const c of [bg, fx]) {
      c.width = Math.round(W * DPR);
      c.height = Math.round(H * DPR);
      c.style.width = W + 'px';
      c.style.height = H + 'px';
    }
    bctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    fctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 250));

  /* ---------- Cielo: estrellas y polvo (posiciones normalizadas 0..1) ---------- */
  const area = Math.max(W * H, 300000);
  const STAR_N = Math.round(Math.min(190, Math.max(80, area / 9500)));
  const DUST_N = Math.round(Math.min(46, Math.max(22, area / 30000)));

  const stars = Array.from({ length: STAR_N }, () => {
    const big = Math.random() < 0.07;
    return {
      x: Math.random(), y: Math.random(),
      r: big ? rand(1.2, 1.9) : rand(0.3, 1.2),
      depth: rand(0.2, 1),
      ph: rand(0, 6.28), sp: rand(0.5, 2.1),
      big,
      tint: pick(['#ffffff', '#ffffff', '#e9d5ff', '#ffc2f0'])
    };
  });
  const dust = Array.from({ length: DUST_N }, () => ({
    x: Math.random(), y: Math.random(),
    vx: rand(-0.004, 0.004), vy: rand(-0.012, -0.003),
    s: rand(10, 34), a: rand(0.12, 0.38), pink: Math.random() < 0.45,
    ph: rand(0, 6.28)
  }));
  const shooters = [];
  let nextShoot = 2.5;
  let shootEvery = 8; // segundos aprox.

  /* ---------- Paralaje con el dedo / ratón ---------- */
  let px = 0, py = 0, tx = 0, ty = 0;
  window.addEventListener('pointermove', e => {
    tx = (e.clientX / W - 0.5) * 2;
    ty = (e.clientY / H - 0.5) * 2;
  }, { passive: true });

  function shoot(opts = {}) {
    const fromLeft = opts.fromLeft ?? Math.random() < 0.5;
    const speed = rand(700, 1000);
    const ang = rand(0.35, 0.6);
    shooters.push({
      x: fromLeft ? rand(0, W * 0.5) : rand(W * 0.5, W),
      y: rand(0, H * 0.35),
      vx: (fromLeft ? 1 : -1) * Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      life: 0, max: rand(0.8, 1.3),
      len: rand(110, 190)
    });
  }

  /* ---------- Partículas de efectos (tap / celebración) ---------- */
  const parts = [];
  const MAX_PARTS = 520;

  function addPart(p) {
    if (parts.length >= MAX_PARTS) parts.shift();
    parts.push(p);
  }

  function burst(x, y, o = {}) {
    const n = reduce ? Math.ceil((o.n ?? 8) / 3) : (o.n ?? 8);
    const power = o.power ?? 1;
    const kinds = o.kinds ?? ['heart', 'spark'];
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(70, 260) * power;
      addPart({
        kind: pick(kinds), x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rand(20, 90) * power,
        g: o.gravity ?? 150, drag: 0.985,
        life: 0, max: rand(0.9, 1.7),
        size: rand(5, 11) * (o.size ?? 1),
        rot: rand(-0.6, 0.6), vr: rand(-2, 2),
        color: o.color ?? pick(PALETTE)
      });
    }
  }

  function burstAtEl(el, o = {}) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, o);
  }

  let celebrating = null;
  function celebrate(ms = 8000) {
    stopCelebrate();
    burst(W / 2, H * 0.45, { n: 90, power: 2.2, kinds: ['heart', 'spark', 'spark'], size: 1.4 });
    const t0 = performance.now();
    celebrating = setInterval(() => {
      const el = performance.now() - t0;
      if (el > ms) return stopCelebrate();
      burst(rand(W * 0.1, W * 0.9), rand(H * 0.15, H * 0.65), { n: 22, power: 1.3, kinds: ['heart', 'spark', 'spark'] });
      for (let i = 0; i < 3; i++) { // corazones que suben desde abajo
        addPart({
          kind: 'heart', x: rand(0, W), y: H + 20,
          vx: rand(-30, 30), vy: -rand(180, 380), g: -10, drag: 0.995,
          life: 0, max: rand(2.2, 3.6), size: rand(8, 18),
          rot: rand(-0.4, 0.4), vr: rand(-0.8, 0.8), color: pick(['#ff4fd8', '#ff7ac6', '#ffd6f5'])
        });
      }
      if (Math.random() < 0.5) shoot();
    }, 170);
  }
  function stopCelebrate() { if (celebrating) { clearInterval(celebrating); celebrating = null; } }

  /* Toques: corazones y estrellitas */
  window.addEventListener('pointerdown', e => {
    if (e.target && e.target.closest && e.target.closest('.dot')) return;
    burst(e.clientX, e.clientY, { n: 7, power: 0.7, size: 0.85, gravity: 120 });
  }, { passive: true });

  /* ---------- Bucle ---------- */
  let last = performance.now();
  let fxWasDrawn = false;

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;

    px += (tx - px) * 0.05;
    py += (ty - py) * 0.05;

    /* --- fondo --- */
    bctx.clearRect(0, 0, W, H);

    // polvo flotante
    for (const d of dust) {
      d.x += d.vx * dt; d.y += d.vy * dt;
      if (d.y < -0.05) { d.y = 1.05; d.x = Math.random(); }
      if (d.x < -0.05) d.x = 1.05; else if (d.x > 1.05) d.x = -0.05;
      const a = d.a * (0.65 + 0.35 * Math.sin(t * 0.8 + d.ph));
      bctx.globalAlpha = a;
      const s = d.s;
      bctx.drawImage(d.pink ? SPR.pink : SPR.violet, d.x * W - s / 2 + px * 10, d.y * H - s / 2 + py * 10, s, s);
    }

    // estrellas
    for (const s of stars) {
      const tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
      const a = reduce ? 0.7 : 0.25 + 0.75 * tw;
      const x = s.x * W + px * s.depth * 14;
      const y = s.y * H + py * s.depth * 14;
      bctx.globalAlpha = a;
      if (s.big) {
        const g = 14 + 6 * tw;
        bctx.drawImage(SPR.white, x - g / 2, y - g / 2, g, g);
      }
      bctx.fillStyle = s.tint;
      bctx.beginPath();
      bctx.arc(x, y, s.r, 0, 6.2832);
      bctx.fill();
    }
    bctx.globalAlpha = 1;

    // estrellas fugaces
    if (!reduce) {
      nextShoot -= dt;
      if (nextShoot <= 0) { shoot(); nextShoot = rand(shootEvery * 0.6, shootEvery * 1.4); }
    }
    for (let i = shooters.length - 1; i >= 0; i--) {
      const s = shooters[i];
      s.life += dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      const k = s.life / s.max;
      if (k >= 1 || s.x < -200 || s.x > W + 200 || s.y > H + 200) { shooters.splice(i, 1); continue; }
      const fade = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
      const mag = Math.hypot(s.vx, s.vy);
      const tx2 = s.x - (s.vx / mag) * s.len;
      const ty2 = s.y - (s.vy / mag) * s.len;
      const g = bctx.createLinearGradient(s.x, s.y, tx2, ty2);
      g.addColorStop(0, `rgba(255,255,255,${0.95 * fade})`);
      g.addColorStop(0.3, `rgba(255,154,230,${0.5 * fade})`);
      g.addColorStop(1, 'rgba(139,92,246,0)');
      bctx.strokeStyle = g;
      bctx.lineWidth = 1.8;
      bctx.lineCap = 'round';
      bctx.beginPath(); bctx.moveTo(s.x, s.y); bctx.lineTo(tx2, ty2); bctx.stroke();
      bctx.globalAlpha = fade;
      bctx.drawImage(SPR.white, s.x - 9, s.y - 9, 18, 18);
      bctx.globalAlpha = 1;
    }

    /* --- efectos (arriba) --- */
    if (parts.length) {
      fctx.clearRect(0, 0, W, H);
      fxWasDrawn = true;
      fctx.globalCompositeOperation = 'lighter';
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        if (p.life >= p.max) { parts.splice(i, 1); continue; }
        p.vy += p.g * dt;
        p.vx *= p.drag; p.vy *= p.drag;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.rot += p.vr * dt;
        const k = p.life / p.max;
        const alpha = k < 0.12 ? k / 0.12 : Math.pow(1 - (k - 0.12) / 0.88, 1.3);
        const sz = p.size * (0.7 + 0.3 * (1 - k));

        // halo
        fctx.globalAlpha = alpha * 0.55;
        const h = sz * 4.2;
        fctx.drawImage(SPR.pink, p.x - h / 2, p.y - h / 2, h, h);

        // forma
        fctx.save();
        fctx.translate(p.x, p.y);
        fctx.rotate(p.rot);
        fctx.scale(sz, sz);
        fctx.globalAlpha = alpha;
        fctx.fillStyle = p.color;
        fctx.fill(p.kind === 'heart' ? heartP : sparkP);
        fctx.restore();
      }
      fctx.globalCompositeOperation = 'source-over';
      fctx.globalAlpha = 1;
    } else if (fxWasDrawn) {
      fctx.clearRect(0, 0, W, H);
      fxWasDrawn = false;
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  document.addEventListener('visibilitychange', () => { last = performance.now(); });

  window.FX = {
    burst, burstAtEl, celebrate, stopCelebrate, shoot,
    setShootRate(sec) { shootEvery = Math.max(1.5, sec); nextShoot = Math.min(nextShoot, shootEvery); }
  };
})();
