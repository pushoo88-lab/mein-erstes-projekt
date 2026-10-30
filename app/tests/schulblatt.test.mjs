// Luisas Lernzielkontrolle (Klasse 2) mit genau den Zahlen vom Blatt.
// Eingegeben werden die Lösungen, die die Lehrerin erwartet. Jede muss beim ersten Versuch als richtig gelten.
import { testCopy, start, setup, check, done } from "./hilfen.mjs";

const dir = testCopy();
const { browser, page, errors, url } = await start({ dir });
await page.goto(url); await page.waitForTimeout(300);
await setup(page, { name: "Luisa", range: "20" });
await page.click("#schoolBtn"); await page.waitForTimeout(300);
  const plan = await page.evaluate(() => {
    const M = window.__mk, N = 20, T = [];
    const add = (sec, t, inputs, name) => T.push({ t: { ...t, sec, topic: t.topic || 'plus' }, inputs, name });
    add(1, M.familyFullTask(N, 'mund', { a: 16, b: 4, miss: 2 }), [20, 16, 4, 20, 4, 16, 20, 20, 4, 16, 20, 16, 4], 'Plumino 16 und 4');
    add(1, M.familyFullTask(N, 'auge', { a: 9, b: 5, miss: 0 }), [9, 9, 5, 14, 5, 9, 14, 14, 5, 9, 14, 9, 5], 'Plumino 5 und Mund 14');
    add(1, M.freeRobotTask(N, 16), [10, 6], 'Plumino nur Mund 16');
    add(2, M.wallMultiTask(N, { bottom: [4, 3, 5], known: ['20', '21', '22'] }), null, 'Mauer 4 3 5');
    add(2, M.wallMultiTask(N, { bottom: [8, 4, 2], known: ['00', '11', '21'] }), null, 'Mauer 18 / 6 / 4');
    add(2, M.tableMultiTask(N, 'plus', { step: 6, left: [4, 7, 5, 10], miss: [1, 1, 0, 0] }), [10, 13, 5, 10], 'Tabelle + 6');
    add(2, M.tableMultiTask(N, 'minus', { step: 8, left: [14, 15, 17, 11], miss: [1, 0, 0, 1] }), [6, 15, 17, 3], 'Tabelle − 8');
    for (const [f, x, c] of [['□ + 7 = 13', 6, 13], ['8 + □ = 11', 3, 11], ['□ + 11 = 20', 9, 20], ['9 + □ = 17', 8, 17],
      ['□ − 5 = 6', 11, 6], ['14 − □ = 5', 9, 5], ['□ − 14 = 2', 16, 2], ['20 − □ = 8', 12, 8]]) add(3, M.probeTask(N, 'plus', f), [x, c], f);
    add(4, M.doubleTableTask(N, { cols: [4, 9, 5, 3, 7, 10], miss: ['d', 'd', 'z', 'z', 'd', 'd'] }), [8, 18, 5, 3, 14, 20], 'Das Doppelte');
    for (const [f, pk, r] of [['7 + 8 + 3', [0, 2], 18], ['5 + 9 + 5', [0, 2], 19], ['7 + 6 + 4', [1, 2], 17],
      ['14 − 6 − 4', [1, 2], 4], ['16 − 6 − 7', [0, 1], 3], ['15 − 8 − 5', [0, 2], 2]]) add(5, M.smartPickTask(N, f), [{ p: pk }, r], f);
    add(6, M.riddleTask(N, { plus: true, b: 6, c: 13 }), [13, { c: '−' }, 6, 7, 7], 'Zahlenrätsel 6 / 13');
    add(7, M.sachTask(N, ['minus'], { op: 'minus', a: 15, b: 6, story: 0, kid: 0 }), [{ c: 'Wie viele Bonbons hat Sina jetzt noch?' }, 15, { c: '−' }, 6, 9, 9], 'Sina 15 Bonbons');
    // Mauern: Lösung in der Reihenfolge, in der die App fragt
    for (const x of T) if (x.t.kind === 'wall3') x.inputs = x.t.order.map(([r, c]) => x.t.rows[r][c]);
    window.__s.round.tasks = T.map((x) => x.t);
    window.__s.round.i = 0;
    window.__render();
    return T.map((x) => ({ name: x.name, inputs: x.inputs, kind: x.t.kind, text: x.t.text || '', rows: x.t.rows || null, order: x.t.order || null }));
  });
  let ok = 0;
  for (const [i, task] of plan.entries()) {
    const head = await page.textContent('#sheetHead');
    for (const inp of task.inputs) {
      if (typeof inp === 'number') { await page.keyboard.type(String(inp)); await page.keyboard.press('Enter'); }
      else if (inp.c) await page.locator('#task [data-choice]', { hasText: inp.c }).first().click();
      else { await page.click(`#task [data-pick="${inp.p[0]}"]`); await page.click(`#task [data-pick="${inp.p[1]}"]`); }
      await page.waitForTimeout(80);
    }
    await page.waitForTimeout(150);
    const r = await page.evaluate((i) => ({ res: window.__s.round && window.__s.round.results[i], tries: window.__s.round && window.__s.round.tries }), i);
    const good = r.res === 'first';
    ok += good;
    check(good, `${task.name}: ${JSON.stringify(task.inputs)}${good ? '' : ' → ' + JSON.stringify(r)}`);
    await page.waitForTimeout(1900);
    if (await page.isVisible('#nextBtn')) await page.click('#nextBtn');
  }
  await page.waitForTimeout(600);
check(ok === plan.length, `${ok} von ${plan.length} Aufgaben vom Blatt beim ersten Versuch richtig erkannt`);
await browser.close();
done("Schulblatt", errors);
