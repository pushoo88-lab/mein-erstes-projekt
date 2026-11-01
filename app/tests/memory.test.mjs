// Zahlen-Memory: erst rechnen, dann suchen. Wer eine Aufgabenkarte umdreht, muss sie ausrechnen,
// bevor eine andere Karte aufgeht. Falsch: nochmal, beim zweiten Fehler zeigt Summi die Lösung.
// Gerechnete Karten zeigen danach ihr Ergebnis. Ergebnisse zählen für den Lernstand.
import { testCopy, start, setup, check, done } from "./hilfen.mjs";

const dir = testCopy(), allErrors = [];
for (const [width, height, how] of [[360, 800, "Handy"], [1280, 800, "Tablet quer"]]) {
  const { browser, page, errors, url } = await start({ dir, width, height });
  await page.goto(url); await page.waitForTimeout(300);
  await setup(page, { name: "Luisa", range: "20", topics: ["plus", "minus"] });
  await page.click("#memoryBtn"); await page.waitForTimeout(300);
  const cards = await page.evaluate(() => window.__mem.cards.map((c) => ({ pair: c.pair, ans: c.ans })));
  const answers = await page.evaluate(() => window.__mem.pairs.map((p) => p.answer));
  const taskOf = (pair) => cards.findIndex((c) => c.pair === pair && !c.ans);
  const resultOf = (pair) => cards.findIndex((c) => c.pair === pair && c.ans);
  const typeIn = async (v) => { await page.keyboard.type(String(v)); await page.keyboard.press("Enter"); await page.waitForTimeout(150); };
  const tap = async (k) => { for (const d of String(k)) await page.click(`#memPad [data-key="${d}"]`); await page.click('#memPad [data-key="ok"]'); await page.waitForTimeout(150); };
  const skillLen = () => page.evaluate(() => { const s = JSON.parse(localStorage.getItem("rw-skill") || "{}"); return Object.values(s).reduce((n, x) => n + x.hist.length, 0); });

  // Paar 0: Aufgabe umdrehen, Rechenfeld kommt, andere Karten bleiben zu
  const skill0 = await skillLen();
  await page.click(`[data-card="${taskOf(0)}"]`); await page.waitForTimeout(400);
  check(await page.isVisible("#memAsk"), `${how}: Aufgabenkarte öffnet das Rechenfeld`);
  check(/\?/.test(await page.textContent("#memQ")), `${how}: Frage „${(await page.textContent("#memQ")).trim()}“`);
  await page.click(`[data-card="${resultOf(0)}"]`, { force: true, trial: false }).catch(() => {});
  check((await page.evaluate(() => window.__mem.open.length)) === 1, `${how}: vor dem Rechnen geht keine zweite Karte auf`);
  const box = await page.evaluate(() => { const c = document.querySelector(".card.asking").getBoundingClientRect(), p = document.getElementById("memAsk").getBoundingClientRect(); return { card: c.bottom, panel: p.top, padBottom: document.getElementById("memPad").getBoundingClientRect().bottom }; });
  check(box.card <= box.panel && box.padBottom <= height, `${how}: offene Karte und Zahlentasten beide zu sehen`);
  // erst falsch, dann richtig (per Tasten auf dem Bildschirm)
  await tap(answers[0] + 1);
  check(await page.isVisible("#memAsk") && /\?/.test(await page.textContent("#memQ")), `${how}: falsches Ergebnis: nochmal rechnen`);
  await tap(answers[0]);
  check(!(await page.isVisible("#memAsk")), `${how}: richtig gerechnet: Rechenfeld geht zu`);
  check((await page.textContent(`[data-card="${taskOf(0)}"] .front`)).includes(`= ${answers[0]}`), `${how}: Karte zeigt jetzt das Ergebnis`);
  await page.click(`[data-card="${resultOf(0)}"]`); await page.waitForTimeout(500);
  check(await page.evaluate(() => window.__mem.found) === 1, `${how}: dann das Gegenstück gefunden`);
  check(await skillLen() - skill0 === 1, `${how}: zählt einmal für den Lernstand`);

  // Paar 1: Ergebnis zuerst, dann Aufgabe: zweimal falsch, dann zeigt Summi die Lösung und es geht weiter
  await page.click(`[data-card="${resultOf(1)}"]`); await page.waitForTimeout(300);
  await page.click(`[data-card="${taskOf(1)}"]`); await page.waitForTimeout(400);
  check(await page.isVisible("#memAsk"), `${how}: auch als zweite Karte erst rechnen`);
  await typeIn(answers[1] + 2); await typeIn(answers[1] + 3);
  check(!(await page.isVisible("#memAsk")) && (await page.textContent("#memSay")).includes(`Die Lösung ist ${answers[1]}`), `${how}: nach zwei Fehlern zeigt Summi die Lösung (Tastatur)`);
  await page.waitForTimeout(500);
  check(await page.evaluate(() => window.__mem.found) === 2, `${how}: Paar zählt danach`);

  // Paar 2: Aufgabe gerechnet, aber falsches Gegenstück: Karten gehen zu. Beim nächsten Mal nicht nochmal rechnen.
  await page.click(`[data-card="${taskOf(2)}"]`); await page.waitForTimeout(300);
  await typeIn(answers[2]);
  await page.click(`[data-card="${resultOf(3)}"]`); await page.waitForTimeout(1700);
  check(await page.evaluate(() => window.__mem.open.length) === 0, `${how}: falsches Paar: Karten gehen wieder zu`);
  await page.click(`[data-card="${taskOf(2)}"]`); await page.waitForTimeout(400);
  check(!(await page.isVisible("#memAsk")), `${how}: schon gerechnete Karte: kein zweites Mal rechnen`);
  await page.click(`[data-card="${resultOf(2)}"]`); await page.waitForTimeout(500);

  // Rest spielen bis zum Ende
  for (let pair = 3; pair < answers.length; pair++) {
    await page.click(`[data-card="${taskOf(pair)}"]`); await page.waitForTimeout(300);
    await typeIn(answers[pair]);
    await page.click(`[data-card="${resultOf(pair)}"]`); await page.waitForTimeout(450);
  }
  await page.waitForTimeout(900);
  check(await page.isVisible("#memOver"), `${how}: Memory bis zum Ende spielbar („${(await page.textContent("#memOverText")).slice(0, 40)}…“)`);
  check(await page.evaluate(() => document.documentElement.scrollWidth) <= width, `${how}: nichts zu breit`);
  allErrors.push(...errors);
  await browser.close();
}
done("Memory", allErrors);
