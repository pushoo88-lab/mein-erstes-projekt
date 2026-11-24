// Schulthemen üben: Themen auswählen, die gerade in der Schule dran sind (auch "Bis zum Zehner" wie auf Luisas
// Arbeitsblatt), Zahlenraum wählen, eine Runde nur mit diesen Themen spielen. Die Auswahl bleibt nach einem Neustart.
import { testCopy, start, setup, answer, check, done } from "./hilfen.mjs";

const dir = testCopy(), allErrors = [];
for (const [width, height, how] of [[360, 800, "Handy"], [1280, 800, "Tablet quer"]]) {
  const { browser, page, errors, url } = await start({ dir, width, height });
  await page.goto(url); await page.waitForTimeout(300);
  await setup(page, { name: "Luisa", range: "100", topics: ["plus"] });
  check(/auswählen/.test(await page.textContent("#focusInfo")), `${how}: Kachel lädt zum Auswählen ein`);
  await page.click("#focusBtn"); await page.waitForTimeout(300);
  check(await page.isVisible("#focusView") && await page.isVisible('[data-focus="ergaenzen"]'), `${how}: Themen zur Auswahl, „Bis zum Zehner“ dabei`);
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
  await page.click("#backBtn"); await page.click("#backBtn", { timeout: 1500 }).catch(() => {}); await page.waitForTimeout(300);
  // Nach dem Neustart ist die Auswahl noch da und steht auf der Kachel
  await page.reload(); await page.waitForTimeout(300); await setup(page, { range: "100", topics: ["plus"] });
  const info = await page.textContent("#focusInfo");
  check(/Bis zum Zehner/.test(info) && /Rechen/.test(info) && /100/.test(info), `${how}: Auswahl bleibt gespeichert („${info}“)`);
  allErrors.push(...errors);
  await browser.close();
}
done("Schulthemen", allErrors);
