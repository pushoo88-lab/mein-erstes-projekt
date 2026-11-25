// Schulthemen üben: Themen auswählen, die gerade in der Schule dran sind (auch "Bis zum Zehner" wie auf Luisas
// Arbeitsblatt), Zahlenraum wählen, eine Runde nur mit diesen Themen spielen. Die Auswahl bleibt nach einem Neustart.
import { testCopy, start, setup, answer, check, done } from "./hilfen.mjs";

const dir = testCopy(), allErrors = [];
for (const [width, height, how] of [[360, 800, "Handy"], [1280, 800, "Tablet quer"]]) {
  const { browser, page, errors, url } = await start({ dir, width, height });
  await page.goto(url); await page.waitForTimeout(300);
  await setup(page, { name: "Luisa", range: "100", topics: ["plus"] });
  check(/2 Arbeitsblätter/.test(await page.textContent("#focusInfo")), `${how}: Kachel zeigt das neue Arbeitsblatt („${await page.textContent("#focusInfo")}“)`);
  await page.click("#focusBtn"); await page.waitForTimeout(300);
  check(await page.isVisible("#focusView") && await page.isVisible('[data-focus="ergaenzen"]'), `${how}: Themen zur Auswahl, „Bis zum Zehner“ dabei`);
  // Ohne Mal/Geteilt in der Einrichtung gibt es das hier auch nicht
  check(!(await page.isVisible('[data-focus="mal"]')) && !(await page.isVisible('[data-focus="geteilt"]')), `${how}: ohne Mal in der Einrichtung keine Mal-Themen`);
  // Arbeitsblatt aus der Schule: Karte mit Bild, Tipp darauf übt genau die Aufgaben vom Blatt
  // Neuestes Blatt „Zahlen bis 100“ (25.11.) steht oben: alle 39 Aufgaben mit den Lösungen, die die Lehrerin erwartet
  const top = await page.evaluate(() => { const c = document.querySelector("[data-blatt]"); return { id: c.dataset.blatt, text: c.textContent.replace(/\s+/g, " ") }; });
  check(top.id === "2026-11-zahlen100" && /Zahlen bis 100/.test(top.text) && /39 Aufgaben/.test(top.text) && /neu/.test(top.text), `${how}: neue Karte „Zahlen bis 100“ oben, 39 Aufgaben, neu`);
  if (how === "Handy") {
    const sol = await page.evaluate(() => {
      const mk = window.__mk, out = [];
      const solve = (t) => { const v = []; for (let k = 0; k < (t.steps || []).length; k++) v.push(mk.stepOptions(t, k, v)[0]); return t.steps ? v : [t.answer]; };
      const sign = (t) => solve(t).map((i) => t.steps[0].options[i]).join("");
      out.push(sign(mk.vergleichTask([[85, 58], [32, 23], [17, 71]])), sign(mk.vergleichTask([[17, 18], [82, 73], [21, 34]])), sign(mk.vergleichTask([[15, 51], [42, 24], [31, 91]])));
      out.push(solve(mk.nachbarnTask(53)).join("/"), solve(mk.nachbarnTask(90)).join("/"), solve(mk.nachbarnTask(35, true)).join("/"), solve(mk.nachbarnTask(98, true)).join("/"), solve(mk.nachbarnTask(19, true)).join("/"));
      out.push(solve(mk.vorZurueckTask(33, true)).join("/"), solve(mk.vorZurueckTask(51)).join("/"), solve(mk.vorZurueckTask(94)).join("/"));
      out.push(solve(mk.reiheTask([53, 56, 59, null, null, 68])).join("/"), solve(mk.reiheTask([77, 74, 71, null, null, null, null, null, 53])).join("/"), solve(mk.reiheTask([92, 87, null, null, 72, null, null, null])).join("/"));
      return out.join(" | ");
    });
    check(sol === ">>< | <>< | <>< | 52/54 | 89/91 | 30/40 | 90/100 | 10/20 | 7/3 | 9/60/1/50 | 6/100/4/90 | 62/65 | 68/65/62/59/56 | 82/77/67/62/57", `${how}: Lösungen wie auf dem Blatt (${sol})`);
  }
  if (how === "Handy") {
    const x = await page.evaluate(() => {
      const mk = window.__mk, solve = (t) => { const v = []; for (let k = 0; k < t.steps.length; k++) v.push(mk.stepOptions(t, k, v)[0]); return v.join("/"); };
      const r = mk.reiheTask([22, 25, null, null, null, 37]), v = mk.vergleichTask([[85, 58]]), z = mk.vorZurueckTask(51);
      return { say: window.__spokenTask(r), voll: solve(mk.nachbarnTask(40, true)), zahlen: Math.max(...v.zahlen), topics: [v.topic, r.topic, z.topic].join(","),
        tipp: mk.nachbarnTask(53).tip };
    });
    check(/22, 25 und so weiter/.test(x.say) && !/37/.test(x.say), `${how}: Reihe richtig vorgelesen („${x.say}“)`);
    check(x.voll === "30/50", `${how}: Nachbarzehner von 40 sind 30 und 50 (${x.voll})`);
    check(x.zahlen === 85 && x.topics === "stellen,nachbar,ergaenzen", `${how}: Wiederholung kennt die Zahlen, passende Themen (${x.topics})`);
    check(/Vorgänger/.test(x.tipp) && /Nachfolger/.test(x.tipp), `${how}: Hilfe nach Fehler passt zu beiden Feldern`);
  }
  await page.click('[data-blatt="2026-11-zahlen100"]'); await page.waitForTimeout(400);
  const teile = await page.evaluate(() => window.__s.round.tasks.map((t) => t.teil));
  check(teile.length === 10 && new Set(teile).size === 6, `${how}: Runde mit 10 Aufgaben aus allen 6 Teilen des Blatts (${[...new Set(teile)].join(", ")})`);
  const kinds100 = new Set();
  for (let guard = 0; guard < 120 && !(await page.isVisible("#resultView")); guard++) {
    const s = await page.evaluate(() => { const q = window.__s.round; return q && { i: q.i, t: q.tasks[q.i], step: q.step, vals: q.vals, locked: q.locked }; });
    if (!s) break;
    if (s.locked) { if (await page.isVisible("#nextBtn")) await page.click("#nextBtn"); else await page.waitForTimeout(250); continue; }
    kinds100.add(s.t.teil);
    if (!s.t.steps) { await answer(page, null, s.t.answer); await page.waitForFunction((i) => !window.__s.round || window.__s.round.i !== i, s.i, { timeout: 15000 }); continue; }
    const opts = await page.evaluate(([t, k, v]) => window.__mk.stepOptions(t, k, v), [s.t, s.step, s.vals]);
    await answer(page, s.t.steps[s.step], opts[0]);
    if (s.step === s.t.steps.length - 1) await page.waitForFunction((i) => !window.__s.round || window.__s.round.i !== i, s.i, { timeout: 15000 });
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    if (sw > width) check(false, `${how}: ${s.t.teil} ist zu breit (${sw} px)`);
  }
  await page.waitForTimeout(600);
  check(await page.isVisible("#resultView") && await page.textContent("#resultText"), `${how}: „Zahlen bis 100“ bis zum Ende gespielt (${[...kinds100].join(", ")})`);
  await page.click("#menuBtn"); await page.waitForTimeout(300); await page.click("#focusBtn"); await page.waitForTimeout(300);
  const card = await page.evaluate(() => { const c = document.querySelector('[data-blatt="2026-11-zehner"]'); return c && { text: c.textContent.replace(/\s+/g, " "), bild: !!c.querySelector(".blatt-bild i") }; });
  check(card && card.bild && /nächste Zehner/.test(card.text) && /18 Aufgaben/.test(card.text) && !/neu/.test(card.text), `${how}: Karte „Wie heißt der nächste Zehner?“ mit Bild, 18 Aufgaben, „neu“ nur beim neuesten Blatt`);
  await page.click('[data-blatt="2026-11-zehner"]'); await page.waitForTimeout(400);
  const fromSheet = [55, 85, 43, 28, 94, 71, 37, 52, 64, 63, 21, 74, 83, 34, 47, 95, 81, 73];
  const bt = await page.evaluate(() => window.__s.round.tasks.map((t) => t.a));
  check(bt.length === 10 && bt.every((a) => fromSheet.includes(a)) && new Set(bt).size === 10, `${how}: Runde mit 10 verschiedenen Aufgaben vom Blatt (${bt.join(", ")})`);
  for (let guard = 0; guard < 80 && !(await page.isVisible("#resultView")); guard++) {
    const s = await page.evaluate(() => { const q = window.__s.round; return q && { i: q.i, t: q.tasks[q.i], step: q.step, vals: q.vals, locked: q.locked }; });
    if (!s || s.locked) { await page.waitForTimeout(250); continue; }
    const opts = await page.evaluate(([t, k, v]) => window.__mk.stepOptions(t, k, v), [s.t, s.step, s.vals]);
    await answer(page, s.t.steps[s.step], opts[0]);
    if (s.step === s.t.steps.length - 1) await page.waitForFunction((i) => !window.__s.round || window.__s.round.i !== i, s.i, { timeout: 15000 });
  }
  await page.waitForTimeout(600);
  check(await page.isVisible("#resultView"), `${how}: Arbeitsblatt-Runde bis zum Ende`);
  await page.click("#againBtn"); await page.waitForTimeout(300);
  check(await page.textContent("#where") === "Arbeitsblatt aus der Schule", `${how}: „Nochmal“ übt wieder das Blatt`);
  await page.click("#backBtn"); await page.waitForTimeout(300);
  check(await page.isVisible("#focusView"), `${how}: Zurück aus dem Arbeitsblatt führt zu den Schulthemen`);
  check(/Bestes Ergebnis: 10 von 10/.test(await page.textContent('[data-blatt="2026-11-zehner"]')) && !/neu/.test(await page.textContent('[data-blatt="2026-11-zehner"] b')), `${how}: Karte zeigt das beste Ergebnis`);
  // Ohne Thema geht es nicht los
  await page.click("#focusGo"); await page.waitForTimeout(200);
  check(await page.isVisible("#focusView") && /mindestens ein Thema/.test(await page.textContent("#focusNote")), `${how}: ohne Thema kommt ein Hinweis`);
  await page.click('[data-focus="ergaenzen"]'); await page.click('[data-focus="familie"]'); await page.click('[data-focus-n="100"]'); await page.waitForTimeout(150);
  check(await page.evaluate(() => document.documentElement.scrollWidth) <= width, `${how}: Auswahl passt in die Breite`);
  await page.click("#focusGo"); await page.waitForTimeout(400);
  const r = await page.evaluate(() => ({ topics: [...new Set(window.__s.round.tasks.map((t) => t.topic))], n: window.__s.round.tasks.length, where: document.getElementById("where").textContent }));
  check(r.n === 10 && r.topics.every((t) => ["ergaenzen", "familie"].includes(t)) && r.topics.includes("ergaenzen"), `${how}: Runde nur mit den Schulthemen (${r.topics.join(", ")})`);
  check(/Schulthemen/.test(r.where), `${how}: oben steht „${r.where}“`);
  // Runde spielen wie ein Kind, mehrteilige Aufgaben Feld für Feld
  const kinds = new Set();
  for (let guard = 0; guard < 300 && !(await page.isVisible("#resultView")); guard++) {
    const s = await page.evaluate(() => { const q = window.__s.round; return q && { i: q.i, t: q.tasks[q.i], step: q.step, vals: q.vals, locked: q.locked }; });
    if (!s) break;
    if (s.locked) { if (await page.isVisible("#nextBtn")) await page.click("#nextBtn"); else await page.waitForTimeout(250); continue; }
    kinds.add(s.t.kind || "rechnung");
    if (!s.t.steps) { await answer(page, null, s.t.answer); await page.waitForFunction((i) => !window.__s.round || window.__s.round.i !== i, s.i, { timeout: 15000 }); continue; }
    const opts = await page.evaluate(([t, k, v]) => window.__mk.stepOptions(t, k, v), [s.t, s.step, s.vals]);
    await answer(page, s.t.steps[s.step], opts[0]);
    if (s.step === s.t.steps.length - 1) await page.waitForFunction((i) => !window.__s.round || window.__s.round.i !== i, s.i, { timeout: 15000 });
  }
  await page.waitForTimeout(600);
  check(await page.isVisible("#resultView"), `${how}: Runde bis zum Ende (${[...kinds].join(", ")})`);
  if (how === "Handy") {
    // Ein „Bis zum Zehner“ mit zwei Feldern genau wie auf dem Blatt zeichnen und ansehen
    const z = await page.evaluate(() => { const el = document.createElement("div"); el.className = "task"; window.__draw(el, window.__mk.zehnerTask(100, 63), '<span class="slot">?</span>', { step: 0, vals: [], picks: [] }); return el.textContent.replace(/\s+/g, " ").trim(); });
    check(/nächste Zehner/.test(z) && /63\s*\+/.test(z), `${how}: Aufgabe wie auf dem Blatt: „${z}“`);
  }
  // „Nochmal spielen“ bleibt bei den Schulthemen
  await page.click("#againBtn"); await page.waitForTimeout(400);
  check((await page.textContent("#where")).includes("Schulthemen"), `${how}: „Nochmal“ übt wieder die Schulthemen`);
  await page.click("#backBtn"); await page.waitForTimeout(300);
  check(await page.isVisible("#focusView") && /gespeichert/.test(await page.textContent("#focusSay")), `${how}: Zurück zu den Schulthemen, Summi sagt, dass sie gespeichert sind`);
  await page.click("#focusBack"); await page.waitForTimeout(300);
  if (how === "Handy") {
    // Memory nur mit „Bis zum Zehner“: Karten wie 63 + □ = 70, keine gewöhnlichen Plusaufgaben
    await page.evaluate(() => { window.__s.topics = ["ergaenzen"]; window.__s.N = 100; });
    await page.click("#memoryBtn").catch(() => {}); await page.waitForTimeout(400);
    const pairs = await page.evaluate(() => window.__mem.pairs.map((p) => ({ label: p.label, answer: p.answer, topic: p.topic })));
    check(pairs.length === 6 && pairs.every((p) => p.topic === "ergaenzen" && /□/.test(p.label) && p.answer >= 1 && p.answer <= 9), `${how}: Memory „Bis zum Zehner“ (${pairs.map((p) => p.label).join(" | ")})`);
    await page.click("#memBack"); await page.waitForTimeout(300);
  }
  // Nach dem Neustart ist die Auswahl noch da und steht auf der Kachel
  await page.reload(); await page.waitForTimeout(300); await setup(page, { range: "100", topics: ["plus"] });
  const info = await page.textContent("#focusInfo");
  check(/Bis zum Zehner/.test(info) && /Rechen/.test(info) && /100/.test(info), `${how}: Auswahl bleibt gespeichert („${info}“)`);
  allErrors.push(...errors);
  await browser.close();
}
done("Schulthemen", allErrors);
