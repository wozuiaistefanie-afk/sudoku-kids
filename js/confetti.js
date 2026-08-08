/* 简单彩带庆祝效果 */
(function (global) {
  'use strict';

  let canvas = null, ctx = null, pieces = [], running = false, raf = null;

  function setup() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2000;';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    window.addEventListener('resize', resize);
    resize();
  }

  function loop() {
    if (!running) { raf = null; return; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of pieces) {
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      if (p.y > canvas.height + 20) { p.y = -20; p.x = Math.random() * canvas.width; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 'circle') { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); }
      ctx.restore();
    }
    raf = requestAnimationFrame(loop);
  }

  function launch(duration) {
    setup();
    const colors = ['#ff5f6d', '#ffc371', '#5ee7df', '#a18cd1', '#fbc2eb', '#84fab0', '#f6d365', '#fda085'];
    pieces = [];
    const total = Math.min(180, Math.max(60, Math.floor(window.innerWidth / 5)));
    for (let i = 0; i < total; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * canvas.height * 0.5,
        w: 6 + Math.random() * 8,
        h: 6 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        vy: 2 + Math.random() * 3.5,
        vx: -1.5 + Math.random() * 3,
        rot: Math.random() * Math.PI * 2,
        vr: -0.15 + Math.random() * 0.3,
        shape: Math.random() < 0.3 ? 'circle' : 'rect'
      });
    }
    if (!running) { running = true; loop(); }
    const stop = (typeof duration === 'number' ? duration : 3500);
    setTimeout(function () { running = false; if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); }, stop);
  }

  global.Confetti = { launch };
})(window);
