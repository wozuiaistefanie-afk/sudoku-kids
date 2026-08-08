/* 数独生成器与求解器（使用位掩码 + 最少候选数优先，速度快） */
(function (global) {
  'use strict';

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  /* 统计解的个数（最多数到 limit 个就停）。board 中 0 表示空格 */
  function countSolutions(board, n, br, bc, limit) {
    const full = (1 << (n + 1)) - 2;
    const rows = new Array(n).fill(0);
    const cols = new Array(n).fill(0);
    const boxes = new Array(n).fill(0);
    const boxCols = Math.floor(n / bc), boxRows = Math.floor(n / br);
    for (let i = 0; i < n * n; i++) {
      const v = board[i];
      if (v) {
        const r = Math.floor(i / n), c = i % n;
        const b = Math.floor(r / br) * boxCols + Math.floor(c / bc);
        const bit = 1 << v;
        rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
      }
    }
    let count = 0;

    function dfs() {
      if (count >= limit) return;
      let bestPos = -1, bestMask = 0, bestCnt = n + 1;
      for (let i = 0; i < n * n; i++) {
        if (board[i] !== 0) continue;
        const r = Math.floor(i / n), c = i % n;
        const b = Math.floor(r / br) * boxCols + Math.floor(c / bc);
        const mask = full & ~(rows[r] | cols[c] | boxes[b]);
        let cnt = 0, m = mask;
        while (m) { cnt++; m &= m - 1; }
        if (cnt < bestCnt) {
          bestCnt = cnt; bestPos = i; bestMask = mask;
          if (cnt <= 1) break;
        }
      }
      if (bestPos === -1) { count++; return; }
      if (bestCnt === 0) return;
      const r = Math.floor(bestPos / n), c = bestPos % n;
      const b = Math.floor(r / br) * boxCols + Math.floor(c / bc);
      let m = bestMask;
      while (m) {
        const bit = m & -m; m ^= bit;
        const v = 31 - Math.clz32(bit);
        rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
        board[bestPos] = v;
        dfs();
        board[bestPos] = 0;
        rows[r] ^= bit; cols[c] ^= bit; boxes[b] ^= bit;
        if (count >= limit) return;
      }
    }
    dfs();
    return count;
  }

  /* 用 MRV 回溯填充。rand=true 时随机尝试候选数（用于生成盘面），false 时按顺序（用于求解） */
  function fillInternal(board, n, br, bc, rand) {
    const full = (1 << (n + 1)) - 2;
    const rows = new Array(n).fill(0);
    const cols = new Array(n).fill(0);
    const boxes = new Array(n).fill(0);
    const boxCols = Math.floor(n / bc);

    // 用已知数字初始化掩码，并检查题目本身是否合法（同一行/列/宫不重复）
    for (let i = 0; i < n * n; i++) {
      const v = board[i];
      if (v) {
        const r = Math.floor(i / n), c = i % n;
        const b = Math.floor(r / br) * boxCols + Math.floor(c / bc);
        const bit = 1 << v;
        if ((rows[r] & bit) || (cols[c] & bit) || (boxes[b] & bit)) return false;
        rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
      }
    }

    const ok = (function dfs() {
      let bestPos = -1, bestMask = 0, bestCnt = n + 1;
      for (let i = 0; i < n * n; i++) {
        if (board[i] !== 0) continue;
        const r = Math.floor(i / n), c = i % n;
        const b = Math.floor(r / br) * boxCols + Math.floor(c / bc);
        const mask = full & ~(rows[r] | cols[c] | boxes[b]);
        let cnt = 0, m = mask;
        while (m) { cnt++; m &= m - 1; }
        if (cnt < bestCnt) {
          bestCnt = cnt; bestPos = i; bestMask = mask;
          if (cnt <= 1) break;
        }
      }
      if (bestPos === -1) return true;
      if (bestCnt === 0) return false;
      const r = Math.floor(bestPos / n), c = bestPos % n;
      const b = Math.floor(r / br) * boxCols + Math.floor(c / bc);
      const cands = [];
      let m = bestMask;
      while (m) { const bit = m & -m; m ^= bit; cands.push(bit); }
      if (rand) shuffle(cands);
      for (const bit of cands) {
        const v = 31 - Math.clz32(bit);
        rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
        board[bestPos] = v;
        if (dfs()) return true;
        board[bestPos] = 0;
        rows[r] ^= bit; cols[c] ^= bit; boxes[b] ^= bit;
      }
      return false;
    })();
    return ok;
  }

  /* 随机生成一个完整的数独盘面 */
  function fillSolved(board, n, br, bc) {
    return fillInternal(board, n, br, bc, true);
  }

  /* 求解一道题目（有解返回完成的盘面，无解返回 null） */
  function solveOne(board, n, br, bc) {
    const grid = board.slice();
    return fillInternal(grid, n, br, bc, false) ? grid : null;
  }

  /**
   * 生成一道唯一解的题目
   * @param n     格子大小（4/6/9）
   * @param br    每个小宫的行数
   * @param bc    每个小宫的列数
   * @param targetBlanks 目标空格数量
   * @returns {puzzle, solved, blanks}
   */
  function generatePuzzle(n, br, bc, targetBlanks) {
    let best = null;
    for (let attempt = 0; attempt < 100; attempt++) {
      const solved = new Array(n * n).fill(0);
      if (!fillSolved(solved, n, br, bc)) continue;

      const puzzle = solved.slice();
      const order = [];
      for (let i = 0; i < n * n; i++) order.push(i);
      shuffle(order);

      let blanks = 0;
      for (const pos of order) {
        if (blanks >= targetBlanks) break;
        const backup = puzzle[pos];
        puzzle[pos] = 0;
        if (countSolutions(puzzle, n, br, bc, 2) === 1) {
          blanks++;
        } else {
          puzzle[pos] = backup;
        }
      }

      if (blanks >= targetBlanks) {
        return { puzzle, solved, blanks };
      }
      if (!best || blanks > best.blanks) {
        best = { puzzle: puzzle.slice(), solved: solved.slice(), blanks };
      }
    }
    return best && best.blanks > 0 ? best : null;
  }

  global.Sudoku = { generatePuzzle, countSolutions, solveOne };
})(typeof window !== 'undefined' ? window : globalThis);
