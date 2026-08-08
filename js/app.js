/* 数独乐园 - 主逻辑 */
(function () {
  'use strict';

  /* ---------- 配置 ---------- */
  const THEMES = {
    numbers: { label: '数字', emoji: '🔢', symbols: ['1', '2', '3', '4', '5', '6', '7', '8', '9'] },
    fruits:  { label: '水果', emoji: '🍎', symbols: ['🍎', '🍌', '🍇', '🍓', '🍊', '🥝', '🍉', '🍒', '🍑'] },
    animals: { label: '动物', emoji: '🐼', symbols: ['🐶', '🐱', '🐰', '🐼', '🦊', '🐸', '🐷', '🦁', '🐵'] },
    space:   { label: '太空', emoji: '🚀', symbols: ['🚀', '🌍', '🌙', '⭐', '🛸', '🌈', '☀️', '🪐', '👽'] }
  };

  const SIZES = {
    4: { label: '4×4', name: '启蒙', emoji: '🐣', br: 2, bc: 2, blanks: { easy: 5, medium: 8, hard: 11 } },
    6: { label: '6×6', name: '进阶', emoji: '🐥', br: 2, bc: 3, blanks: { easy: 11, medium: 16, hard: 22 } },
    9: { label: '9×9', name: '挑战', emoji: '🦅', br: 3, bc: 3, blanks: { easy: 32, medium: 40, hard: 50 } }
  };

  const DIFFS = [
    { id: 'easy',   label: '简单', emoji: '😊' },
    { id: 'medium', label: '中等', emoji: '🙂' },
    { id: 'hard',   label: '困难', emoji: '😅' }
  ];

  const PRAISES = [
    '好棒！继续加油！🌟', '哇，你太聪明啦！🦊', '做得对！越来越厉害啦！💪',
    '真不错！下一格！🎯', '厉害！小侦探！🕵️', '哇塞！我为你骄傲！🎉'
  ];
  const WRONGS = [
    '咦，这一排、这一列或这个宫里已经有它啦，再想想？🤔',
    '嗯～好像重复啦，换一个试试？🌈',
    '别急，慢慢想，你一定行！💗'
  ];

  const STORAGE = 'sudoku.stats.v1';
  const PREF_KEY = 'sudoku.prefs.v1';

  /* ---------- 状态 ---------- */
  const state = {
    theme: 'numbers',
    size: 4,
    difficulty: 'easy',
    puzzle: [], solved: [], current: [],
    selected: -1,
    hintsLeft: 3,
    startTime: 0, timerId: null, elapsed: 0,
    conflicts: new Set(),
    won: false
  };

  const $ = id => document.getElementById(id);

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  function randomOf(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function fmtTime(s) {
    const m = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return m + ':' + ss;
  }

  /* ---------- 本地存档 ---------- */
  function loadStats() {
    try { return JSON.parse(localStorage.getItem(STORAGE)) || { wins: 0, best: {} }; }
    catch (e) { return { wins: 0, best: {} }; }
  }
  function statsKey() { return state.size + '_' + state.difficulty + '_' + state.theme; }
  function saveStats(stars) {
    const s = loadStats();
    s.wins++;
    const key = statsKey();
    if (!s.best[key] || stars > s.best[key]) s.best[key] = stars;
    try { localStorage.setItem(STORAGE, JSON.stringify(s)); } catch (e) {}
  }
  function loadPrefs() {
    try {
      const p = JSON.parse(localStorage.getItem(PREF_KEY)) || {};
      if (p.theme && THEMES[p.theme]) state.theme = p.theme;
      if (p.size && SIZES[p.size]) state.size = p.size;
      if (p.difficulty && DIFFS.some(d => d.id === p.difficulty)) state.difficulty = p.difficulty;
    } catch (e) {}
  }
  function savePrefs() {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify({
        theme: state.theme, size: state.size, difficulty: state.difficulty
      }));
    } catch (e) {}
  }

  /* ---------- 界面 ---------- */
  function showScreen(name) {
    $('home-screen').classList.toggle('active', name === 'home');
    $('game-screen').classList.toggle('active', name === 'game');
  }

  function mascot(msg) { $('game-msg').textContent = msg; }
  function mascotHome(msg) { $('home-msg').textContent = msg; }

  /* 主页选项 */
  function buildOptions(containerId, items, selectedId, onChange) {
    const box = $(containerId);
    box.innerHTML = '';
    items.forEach(item => {
      const b = document.createElement('button');
      b.className = 'opt' + (item.id === selectedId ? ' selected' : '');
      b.innerHTML = '<span class="opt-emoji">' + item.emoji + '</span><span>' + item.label + '</span>';
      b.addEventListener('click', () => { onChange(item.id); Sound.click(); });
      box.appendChild(b);
    });
  }

  function renderHomeStats() {
    const s = loadStats();
    const best = s.best[statsKey()] || 0;
    let stars = '';
    for (let i = 1; i <= 3; i++) stars += '<span class="star">' + (i <= best ? '⭐' : '☆') + '</span>';
    $('home-stats').innerHTML =
      '🎖️ 总共完成：<b>' + s.wins + '</b> 个　　' +
      '当前模式最佳：' + stars;
  }

  function renderHome() {
    buildOptions('theme-options', Object.keys(THEMES).map(k => ({ id: k, label: THEMES[k].label, emoji: THEMES[k].emoji })), state.theme, id => {
      state.theme = id; savePrefs(); renderHome(); renderHomeStats();
    });
    buildOptions('size-options', Object.keys(SIZES).map(k => ({ id: k, label: SIZES[k].label + ' ' + SIZES[k].name, emoji: SIZES[k].emoji })), String(state.size), id => {
      state.size = Number(id); savePrefs(); renderHome(); renderHomeStats();
    });
    buildOptions('diff-options', DIFFS.map(d => ({ id: d.id, label: d.label, emoji: d.emoji })), state.difficulty, id => {
      state.difficulty = id; savePrefs(); renderHome(); renderHomeStats();
    });
    renderHomeStats();
  }

  /* ---------- 数独逻辑 ---------- */
  function boxBorder(index, n, br, bc) {
    const r = Math.floor(index / n), c = index % n;
    const cls = [];
    if (c % bc === bc - 1 && c !== n - 1) cls.push('br');
    if (r % br === br - 1 && r !== n - 1) cls.push('bb');
    return cls.join(' ');
  }

  function computeConflicts() {
    const n = state.size, br = SIZES[n].br, bc = SIZES[n].bc;
    const units = [];
    for (let r = 0; r < n; r++) {
      const u = []; for (let c = 0; c < n; c++) u.push(r * n + c); units.push(u);
    }
    for (let c = 0; c < n; c++) {
      const u = []; for (let r = 0; r < n; r++) u.push(r * n + c); units.push(u);
    }
    for (let r0 = 0; r0 < n; r0 += br) {
      for (let c0 = 0; c0 < n; c0 += bc) {
        const u = [];
        for (let r = r0; r < r0 + br; r++) for (let c = c0; c < c0 + bc; c++) u.push(r * n + c);
        units.push(u);
      }
    }
    const conflict = new Set();
    for (const u of units) {
      const seen = new Map();
      for (const idx of u) {
        const v = state.current[idx];
        if (!v) continue;
        if (seen.has(v)) { conflict.add(idx); conflict.add(seen.get(v)); }
        else seen.set(v, idx);
      }
    }
    state.conflicts = conflict;
  }

  function renderGrid() {
    const grid = $('grid');
    grid.className = 'grid size' + state.size;
    grid.innerHTML = '';
    const n = state.size;
    const syms = THEMES[state.theme].symbols;
    const isNum = state.theme === 'numbers';
    for (let i = 0; i < n * n; i++) {
      const cell = document.createElement('button');
      cell.className = 'cell ' + boxBorder(i, n, SIZES[n].br, SIZES[n].bc);
      const v = state.current[i];
      if (v > 0) {
        cell.textContent = syms[v - 1];
        if (isNum) cell.classList.add('v' + v);
        if (state.puzzle[i] > 0) cell.classList.add('given');
      } else {
        cell.classList.add('empty');
      }
      if (state.selected === i) cell.classList.add('selected');
      if (state.conflicts.has(i)) cell.classList.add('conflict');
      cell.dataset.index = i;
      cell.addEventListener('click', () => onCellClick(i));
      grid.appendChild(cell);
    }
  }

  function renderPad() {
    const pad = $('pad');
    pad.innerHTML = '';
    const n = state.size;
    const syms = THEMES[state.theme].symbols;
    const isNum = state.theme === 'numbers';
    for (let v = 1; v <= n; v++) {
      const b = document.createElement('button');
      b.className = 'pad-btn';
      b.textContent = syms[v - 1];
      if (isNum) b.classList.add('v' + v);
      b.addEventListener('click', () => onPadClick(v));
      pad.appendChild(b);
    }
    const erase = document.createElement('button');
    erase.className = 'pad-btn tool';
    erase.textContent = '🧽';
    erase.title = '擦除';
    erase.addEventListener('click', onErase);
    pad.appendChild(erase);
  }

  function updateInfo() {
    $('hint-chip').textContent = '💡 提示 ×' + state.hintsLeft;
    $('hint-chip').classList.toggle('used', state.hintsLeft <= 0);
  }

  /* ---------- 交互 ---------- */
  function onCellClick(i) {
    if (state.won) return;
    if (state.puzzle[i] > 0) {
      mascot('这是题目给好的提示，不用填哦 ✨');
      return;
    }
    if (state.selected === i) { state.selected = -1; }
    else { state.selected = i; Sound.select(); }
    renderGrid();
  }

  function onPadClick(v) {
    if (state.won) return;
    if (state.selected < 0) { mascot('先点一个空格吧 👆'); return; }
    const i = state.selected;
    if (state.puzzle[i] > 0) return;
    state.current[i] = v;
    computeConflicts();
    if (state.conflicts.has(i)) {
      Sound.wrong();
      mascot(randomOf(WRONGS));
    } else {
      Sound.correct();
      mascot(randomOf(PRAISES));
    }
    checkWin();
    renderGrid();
  }

  function onErase() {
    if (state.won) return;
    if (state.selected < 0) { mascot('先点一个空格吧 👆'); return; }
    const i = state.selected;
    if (state.puzzle[i] > 0) { mascot('这是题目给的，不能擦掉哦 ✨'); return; }
    if (state.current[i] === 0) return;
    state.current[i] = 0;
    computeConflicts();
    Sound.erase();
    mascot('擦掉啦！再想想看 🤔');
    renderGrid();
  }

  function onHint() {
    if (state.won) return;
    if (state.hintsLeft <= 0) { mascot('今天的提示用完啦，自己加油！💪'); return; }
    const empties = [];
    for (let i = 0; i < state.current.length; i++) if (state.current[i] === 0) empties.push(i);
    if (empties.length === 0) return;
    const i = randomOf(empties);
    state.current[i] = state.solved[i];
    state.hintsLeft--;
    computeConflicts();
    Sound.hint();
    mascot('小助手帮你填好一格啦 💡');
    updateInfo();
    checkWin();
    renderGrid();
  }

  function checkWin() {
    const n = state.size;
    for (let i = 0; i < n * n; i++) if (state.current[i] === 0) return;
    if (state.conflicts.size > 0) return;
    state.won = true;
    clearInterval(state.timerId);
    const hintsUsed = 3 - state.hintsLeft;
    const stars = hintsUsed === 0 ? 3 : (hintsUsed <= 1 ? 2 : 1);
    saveStats(stars);
    Sound.win();
    Confetti.launch(4000);
    showWinOverlay(stars, state.elapsed);
  }

  function showWinOverlay(stars, elapsed) {
    let html = '';
    for (let i = 1; i <= 3; i++) html += '<span class="' + (i <= stars ? '' : 'off') + '">⭐</span>';
    $('win-stars').innerHTML = html;
    $('win-time').textContent = '用时 ' + fmtTime(elapsed);
    $('win-overlay').classList.remove('hidden');
  }

  /* ---------- 计时 ---------- */
  function startTimer() {
    clearInterval(state.timerId);
    state.startTime = Date.now();
    state.elapsed = 0;
    $('timer-chip').textContent = '🕐 00:00';
    state.timerId = setInterval(() => {
      state.elapsed = Math.floor((Date.now() - state.startTime) / 1000);
      $('timer-chip').textContent = '🕐 ' + fmtTime(state.elapsed);
    }, 1000);
  }

  /* ---------- 游戏流程 ---------- */
  function startGame() {
    const cfg = SIZES[state.size];
    const target = cfg.blanks[state.difficulty];
    const gen = Sudoku.generatePuzzle(state.size, cfg.br, cfg.bc, target);
    if (!gen) { mascotHome('哎呀，题目没准备好，再按一次试试？🙏'); return; }
    state.puzzle = gen.puzzle;
    state.solved = gen.solved;
    state.current = gen.puzzle.slice();
    state.selected = -1;
    state.hintsLeft = 3;
    state.won = false;
    computeConflicts();
    startTimer();
    const diff = DIFFS.find(d => d.id === state.difficulty);
    $('level-chip').textContent = cfg.label + ' · ' + diff.label;
    updateInfo();
    renderGrid();
    renderPad();
    mascot('点一个空格，再点下面的图案填进去吧！🎈');
    $('win-overlay').classList.add('hidden');
    showScreen('game');
    window.scrollTo(0, 0);
  }

  /* ---------- 事件绑定 ---------- */
  function bindEvents() {
    $('btn-start').addEventListener('click', () => { Sound.click(); startGame(); });
    $('btn-home').addEventListener('click', () => {
      clearInterval(state.timerId);
      Sound.click();
      showScreen('home');
      renderHomeStats();
    });
    $('btn-sound').addEventListener('click', () => {
      Sound.setMuted(!Sound.muted);
      $('btn-sound').textContent = Sound.muted ? '🔇' : '🔊';
      Sound.click();
    });
    $('hint-chip').addEventListener('click', onHint);
    $('btn-replay').addEventListener('click', () => { Sound.click(); startGame(); });
    $('btn-win-home').addEventListener('click', () => {
      Sound.click();
      $('win-overlay').classList.add('hidden');
      showScreen('home');
      renderHomeStats();
    });
  }

  /* ---------- 键盘支持（电脑上玩更方便） ---------- */
  document.addEventListener('keydown', e => {
    if (state.won) return;
    if (e.key >= '1' && e.key <= '9') {
      const v = parseInt(e.key, 10);
      if (v <= state.size) onPadClick(v);
      return;
    }
    if (e.key === 'Backspace' || e.key === 'Delete') { onErase(); return; }
    const n = state.size;
    if (state.selected < 0) return;
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    const r = Math.floor(state.selected / n), c = state.selected % n;
    let nr = r, nc = c;
    if (e.key === 'ArrowUp') nr = (r - 1 + n) % n;
    else if (e.key === 'ArrowDown') nr = (r + 1) % n;
    else if (e.key === 'ArrowLeft') nc = (c - 1 + n) % n;
    else if (e.key === 'ArrowRight') nc = (c + 1) % n;
    state.selected = nr * n + nc;
    Sound.select();
    renderGrid();
  });

  /* ---------- 启动 ---------- */
  loadPrefs();
  bindEvents();
  $('btn-sound').textContent = Sound.muted ? '🔇' : '🔊';
  renderHome();
})();
