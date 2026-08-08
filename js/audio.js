/* 简单音效（Web Audio 合成，无需音频文件） */
(function (global) {
  'use strict';

  let ctx = null;
  let muted = false;
  try { muted = localStorage.getItem('sudoku.muted') === '1'; } catch (e) {}

  function ensure() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, start, dur, type, vol) {
    const c = ensure();
    if (!c || muted) return;
    try {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.value = freq;
      const t = c.currentTime + start;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + dur + 0.05);
    } catch (e) {}
  }

  const Sound = {
    get muted() { return muted; },
    setMuted(m) {
      muted = m;
      try { localStorage.setItem('sudoku.muted', m ? '1' : '0'); } catch (e) {}
    },
    click() { tone(600, 0, 0.08, 'triangle', 0.14); },
    select() { tone(520, 0, 0.06, 'sine', 0.08); },
    correct() { tone(523, 0, 0.1, 'triangle', 0.16); tone(784, 0.09, 0.14, 'triangle', 0.16); },
    wrong() { tone(196, 0, 0.18, 'sawtooth', 0.06); },
    erase() { tone(440, 0, 0.08, 'triangle', 0.1); },
    hint() { tone(880, 0, 0.12, 'sine', 0.12); tone(1175, 0.1, 0.16, 'sine', 0.12); },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.22, 'triangle', 0.18));
      [784, 1047, 1319].forEach((f, i) => tone(f, 0.62 + i * 0.12, 0.26, 'sine', 0.12));
    }
  };

  global.Sound = Sound;
})(window);
