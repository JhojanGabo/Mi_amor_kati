
(() => {
  'use strict';

  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null, master = null, filter = null, echo = null;
  let on = false, chordTimer = null, bellTimer = null, step = 0;
  const listeners = [];

  // Am – F – C – G (pads suaves)
  const CHORDS = [
    [220.00, 261.63, 329.63],
    [174.61, 220.00, 261.63],
    [261.63, 329.63, 392.00],
    [196.00, 246.94, 293.66]
  ];
  const BASS = [110.00, 87.31, 130.81, 98.00];
  const BELLS = [880.00, 987.77, 1174.66, 1318.51, 1046.50];

  function build() {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1400;
    filter.Q.value = 0.5;

    // eco suave (tipo "reverb" barata)
    echo = ctx.createDelay(1.0);
    echo.delayTime.value = 0.42;
    const fb = ctx.createGain(); fb.gain.value = 0.42;
    const wet = ctx.createGain(); wet.gain.value = 0.5;
    echo.connect(fb); fb.connect(echo);
    echo.connect(wet); wet.connect(master);

    filter.connect(master);
    master.connect(ctx.destination);

    // movimiento lento del filtro
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 500;
    lfo.connect(lfoGain); lfoGain.connect(filter.frequency);
    lfo.start();
  }

  function chord() {
    if (!ctx || !on) return;
    const t = ctx.currentTime + 0.05;
    const i = step % CHORDS.length;
    const dur = 8;
    CHORDS[i].forEach(f => {
      [-7, 7].forEach(det => {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f;
        o.detune.value = det;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.045, t + 3);
        g.gain.linearRampToValueAtTime(0, t + dur + 2);
        o.connect(g); g.connect(filter);
        o.start(t); o.stop(t + dur + 2.2);
      });
    });
    // bajo
    const b = ctx.createOscillator();
    b.type = 'sine'; b.frequency.value = BASS[i];
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0, t);
    bg.gain.linearRampToValueAtTime(0.09, t + 2.5);
    bg.gain.linearRampToValueAtTime(0, t + dur + 1.5);
    b.connect(bg); bg.connect(filter);
    b.start(t); b.stop(t + dur + 1.7);
    step++;
  }

  function bell() {
    if (!ctx || !on) return;
    const t = ctx.currentTime + 0.02;
    const f = BELLS[Math.floor(Math.random() * BELLS.length)];
    const o = ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.06, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    o.connect(g); g.connect(echo); g.connect(master);
    o.start(t); o.stop(t + 2.7);
    bellTimer = setTimeout(bell, 2800 + Math.random() * 4200);
  }

  function emit() { listeners.forEach(fn => fn(on)); }

  async function start() {
    if (!AC || on) return;
    if (!ctx) build();
    try { await ctx.resume(); } catch (_) { /* ignorar */ }
    on = true;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 2.5);
    chord();
    chordTimer = setInterval(chord, 8000);
    bellTimer = setTimeout(bell, 1800);
    emit();
  }

  function stop() {
    if (!on) return;
    on = false;
    clearInterval(chordTimer); clearTimeout(bellTimer);
    if (ctx) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.4);
      setTimeout(() => { if (!on && ctx && ctx.state === 'running') ctx.suspend(); }, 1600);
    }
    emit();
  }

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else if (on) ctx.resume();
  });

  window.Ambient = {
    supported: !!AC,
    start, stop,
    toggle() { return on ? stop() : start(); },
    isOn: () => on,
    onChange(fn) { listeners.push(fn); }
  };
})();
