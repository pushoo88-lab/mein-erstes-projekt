// Aufgaben-Erzeuger: Zehntausende Zufallsaufgaben müssen rechnerisch aufgehen.
// Prüft alle Arbeitsblatt-Aufgaben (mehrere Felder) und Rechenroboter, Geschickt rechnen, Rechentabellen.
import { testCopy, start, check, done } from "./hilfen.mjs";

const dir = testCopy();
const { browser, page, errors, url } = await start({ dir });
await page.goto(url); await page.waitForTimeout(300);

const blatt = await page.evaluate(() => {
    const M = window.__mk, bad = [], count = {};
    const ev = (a, o, b) => (o === '+' ? a + b : a - b);
    const solve = (t, alt) => {   // alle Felder mit erlaubten Antworten füllen
      const vals = [];
      for (let k = 0; k < t.steps.length; k++) {
        const o = M.stepOptions(t, k, vals);
        if (!o.length) { bad.push(['noOpt', t.kind, k, JSON.stringify(t)]); return null; }
        vals.push(alt ? o[o.length - 1] : o[0]);
      }
      return vals;
    };
    const makers = [
      (N) => M.familyFullTask(N), (N) => M.freeRobotTask(N), (N) => M.wallMultiTask(N), (N) => M.tableMultiTask(N, 'plus'), (N) => M.tableMultiTask(N, 'minus'),
      (N) => M.doubleTableTask(N), (N) => M.smartPickTask(N), (N) => M.sachTask(N), (N) => M.riddleTask(N), (N) => M.probeTask(N),
    ];
    for (const N of [10, 12, 15, 20, 30, 100, 1000, 1000000]) for (let i = 0; i < 3000; i++) {
      const mk = makers[i % makers.length]; if (N < 20 && i % makers.length === 2) continue;
      let t; try { t = mk(N); } catch (e) { bad.push(['throw', i % makers.length, N, e.message]); continue; }
      count[t.kind] = (count[t.kind] || 0) + 1;
      for (const alt of [false, true]) {
        const v = solve(t, alt); if (!v) continue;
        const allNums = v.filter((x) => typeof x === 'number');
        if (allNums.some((x) => !Number.isInteger(x) || x < 0 || x > Math.max(N, 20))) bad.push(['range', N, t.kind, JSON.stringify(v)]);
        if (t.kind === 'family4') {
          const [a, bb, c] = t.nums; const rows = [0, 1, 2, 3].map((r) => v.slice(1 + r * 3, 4 + r * 3));
          if (v[0] !== t.nums[t.miss]) bad.push(['famMiss', JSON.stringify(t)]);
          rows.forEach((r, i) => { if (ev(r[0], i < 2 ? '+' : '-', r[1]) !== r[2]) bad.push(['famRow', i, JSON.stringify(r)]); });
          if (a !== bb && (rows[0][0] === rows[1][0] || rows[2][1] === rows[3][1])) bad.push(['famSwap', JSON.stringify(v)]);
          if (!rows.every((r, i) => (i < 2 ? r[2] === c : r[0] === c))) bad.push(['famC', JSON.stringify(v)]);
        }
        if (t.kind === 'robofree' && v[0] + v[1] !== t.nums[2]) bad.push(['free', JSON.stringify(v)]);
        if (t.kind === 'wall3') {
          const rows = t.rows.map((r) => r.slice()); t.order.forEach(([r, c], k) => { if (rows[r][c] !== v[k]) bad.push(['wallVal', JSON.stringify(t)]); });
          const [[T], [m0, m1], [b0, b1, b2]] = t.rows; if (T !== m0 + m1 || m0 !== b0 + b1 || m1 !== b1 + b2) bad.push(['wallRel', JSON.stringify(t.rows)]);
          if (t.order.length !== 3) bad.push(['wallCount', t.order.length]);
        }
        if (t.kind === 'table4') t.rows.forEach((row, i) => { if (ev(row[0], t.sign === '+' ? '+' : '-', t.step) !== row[1] || row[t.miss[i]] !== v[i]) bad.push(['table4', JSON.stringify(t)]); });
        if (t.kind === 'doubletab') t.cols.forEach((x, i) => { if ((t.miss[i] === 'd' ? 2 * x : x) !== v[i]) bad.push(['dtab', JSON.stringify(t)]); });
        if (t.kind === 'smart2') {
          if (!t.steps[0].options.length) bad.push(['noPair', JSON.stringify(t)]);
          if (ev(ev(t.nums[0], t.ops[0] === '+' ? '+' : '-', t.nums[1]), t.ops[1] === '+' ? '+' : '-', t.nums[2]) !== v[1]) bad.push(['smartVal', JSON.stringify(t)]);
        }
        if (t.kind === 'sach') {
          const I = t.idx, sign = t.steps[I.s].options[v[I.s]];
          if (ev(v[I.a], sign === '+' ? '+' : '-', v[I.b]) !== v[I.c] || v[I.c] !== v[I.say] || v[I.c] !== t.answer) bad.push(['sach', JSON.stringify(t), JSON.stringify(v)]);
          if (I.q >= 0 && t.options[v[I.q]] !== t.options[t.steps[I.q].answer]) bad.push(['sachQ']);
          if (t.riddle) { const m = t.text.replace(/(\d)\.(\d)/g, '$1$2').match(/\d+/g).map(Number); if (/dazuzähle/.test(t.text) ? m[0] + v[I.c] !== m[1] : v[I.c] - m[0] !== m[1]) bad.push(['riddle', t.text, v[I.c]]); }
        }
        if (t.kind === 'probe') {
          const filled = { a: t.a, b: t.b }; filled[t.blank] = v[0];
          if (ev(filled.a, t.op === '+' ? '+' : '-', filled.b) !== t.c || v[1] !== t.c) bad.push(['probe', JSON.stringify(t)]);
        }
      }
      if (!window.__spokenTask(t)) bad.push(['spoken', t.kind]);
      // Zeichnen in jedem Zwischenstand
      const el = document.createElement('div');
      for (let k = 0; k <= t.steps.length; k++) { try { window.__draw(el, t, '<span class="slot" id="slot">?</span>', { step: k, vals: solve(t, false) || [], picks: [] }); } catch (e) { bad.push(['draw', t.kind, k, e.message]); break; } }
      if (/undefined|NaN/.test(el.innerHTML)) bad.push(['html', t.kind, el.innerHTML.slice(0, 200)]);
    }
    return { nbad: bad.length, bad: bad.slice(0, 6), count };
  });
check(blatt.nbad === 0, `Arbeitsblatt-Aufgaben rechnerisch richtig (${Object.values(blatt.count).reduce((a, b) => a + b, 0)} Aufgaben)${blatt.nbad ? ": " + JSON.stringify(blatt.bad.slice(0, 3)) : ""}`);

const neu = await page.evaluate(() => {
    const bad = [], seen = {}; const ev = (a, o, b) => (o === '+' ? a + b : a - b);
    const num = (x) => Number(String(x).replace(/\./g, ''));
    for (const N of [10, 12, 15, 20, 30, 50, 100, 200, 1000, 10000, 1000000]) for (const adapt of [false, true]) for (let i = 0; i < 4000; i++) {
      const topic = ['familie', 'geschickt', 'luecke'][i % 3];
      let t;
      try { t = window.__gen({ N, mal: false, adapt, grade: 2 }, topic, ['plus', 'minus', topic]); } catch (e) { bad.push(['throw', topic, N, e.message]); continue; }
      seen[topic + ':' + (t.kind || 'eq')] = (seen[topic + ':' + (t.kind || 'eq')] || 0) + 1;
      const okInt = (v) => Number.isInteger(v) && v >= 0 && v <= N + (topic === 'geschickt' ? Math.max(0, 20 - N) : 0);
      if (!okInt(t.answer)) bad.push(['answer', topic, N, JSON.stringify(t)]);
      if (t.kind === 'family') {
        const [a, bb, c] = t.nums; if (a + bb !== c || a < 1 || bb < 1) bad.push(['fam', N, JSON.stringify(t)]);
        if (t.eq && ev(t.eq[0], t.eq[1], t.eq[2]) !== t.answer) bad.push(['famEq', JSON.stringify(t)]);
        if (!t.eq && t.nums[t.miss] !== t.answer) bad.push(['famMiss', JSON.stringify(t)]);
      }
      if (t.kind === 'parts' && topic === 'geschickt') {
        const n = [num(t.parts[0]), num(t.parts[2]), num(t.parts[4])];
        const v = ev(ev(n[0], t.parts[1], n[1]), t.parts[3], n[2]);
        if (v !== t.answer) bad.push(['smart', JSON.stringify(t)]);
        // es gibt wirklich ein Zehnerpaar oder einen Sprung zum vollen Zehner
        const pair = t.parts[1] === '+' ? [[0,1],[0,2],[1,2]].some(([i,j]) => (n[i] + n[j]) % 10 === 0) : (n[1] + n[2] === 10 || (n[0] - n[1]) % 10 === 0 || (n[0] - n[2]) % 10 === 0);
        if (!pair) bad.push(['noPair', JSON.stringify(t)]);
        if (n.some((x) => x < 1) || t.answer < 1) bad.push(['smallSmart', JSON.stringify(t)]);
      }
      if (t.kind === 'table') {
        const f = (x) => (t.sign === '+' ? x + t.step : x - t.step);
        if (f(t.ex[0]) !== t.ex[1] || f(t.ask[0]) !== t.ask[1] || t.ask[t.miss] !== t.answer) bad.push(['table', JSON.stringify(t)]);
        if ([...t.ex, ...t.ask].some((x) => x < 0 || x > N)) bad.push(['tableRange', N, JSON.stringify(t)]);
        if (t.ex[0] === t.ask[0] && N > 15) bad.push(['tableSame', JSON.stringify(t)]);
      }
      if (t.kind && !window.__spokenTask(t)) bad.push(['spoken', JSON.stringify(t)]);
    }
    return { bad: bad.slice(0, 8), nbad: bad.length, seen };
  });
check(neu.nbad === 0, `Rechenroboter, Geschickt rechnen, Lücken richtig (${Object.values(neu.seen).reduce((a, b) => a + b, 0)} Aufgaben)${neu.nbad ? ": " + JSON.stringify(neu.bad.slice(0, 3)) : ""}`);

await browser.close();
done("Aufgaben", errors);
