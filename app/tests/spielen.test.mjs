// Übungsblatt und Blumen-Runden so spielen, wie ein Kind sie bedient: Zahlen tippen, Antworten antippen,
// zwei Zahlen einkreisen, ab und zu ein Fehler. Am Ende muss das Ergebnis stimmen und nichts zu breit sein.
import { testCopy, start, setup, answer, check, done } from "./hilfen.mjs";

const dir = testCopy();
const { browser, page, errors, url } = await start({ dir });
await page.goto(url); await page.waitForTimeout(300);
await setup(page, { name: "Luisa", range: "20", topics: ["familie", "geschickt", "luecke", "text", "verdoppeln", "mauer"] });

const state = () => page.evaluate(() => { const r = window.__s.round; return r && { i: r.i, t: r.tasks[r.i], step: r.step, vals: r.vals, locked: r.locked }; });
// Spielt, bis die Runde vorbei ist. wrongAt: bei dieser Aufgabe zuerst eine falsche Zahl
async function play(wrongAt = -1) {
  const kinds = new Set();
  for (let guard = 0; guard < 600; guard++) {
    const s = await state();
    if (!s) break;
    if (s.locked) {
      if (await page.isVisible("#nextBtn")) await page.click("#nextBtn"); else await page.waitForTimeout(250);
      continue;
    }
    kinds.add(s.t.kind || "rechnung");
    if (!s.t.steps) {
      if (s.i === wrongAt) { await answer(page, null, s.t.answer + 1); await page.waitForTimeout(450); }
      await answer(page, null, s.t.answer); await page.waitForTimeout(250);
      continue;
    }
    const opts = await page.evaluate(([t, k, v]) => window.__mk.stepOptions(t, k, v), [s.t, s.step, s.vals]);
    await answer(page, s.t.steps[s.step], opts[opts.length - 1]);
    if (s.step === s.t.steps.length - 1) await page.waitForTimeout(400);
  }
  await page.waitForTimeout(700);
  return kinds;
}

// Übungsblatt
await page.click("#schoolBtn"); await page.waitForTimeout(300);
const heads = new Set();
const watch = setInterval(async () => { try { heads.add(await page.textContent("#sheetHead")); } catch { /* Seite gewechselt */ } }, 300);
await play(1);
clearInterval(watch);
check(await page.isVisible("#resultView"), "Übungsblatt bis zum Ende spielbar");
const sheet = await page.textContent("#resultText");
check(/Von 35 Punkten hast du/.test(sheet), `Punkte wie in der Schule: „${sheet.slice(0, 50)}…“`);
check((await page.$$(".school-points li")).length === 8, "8 Aufgabenteile mit Punkten");

// Blumen-Runden mit Arbeitsblatt-Aufgaben
const kinds = new Set();
for (let round = 0; round < 3; round++) {
  await page.click("#menuBtn"); await page.waitForTimeout(300);
  await page.click("#startBtn"); await page.waitForTimeout(300);
  for (const k of await play(round === 1 ? 2 : -1)) kinds.add(k);
  check(await page.isVisible("#resultView"), `Blumen-Runde ${round + 1} bis zum Ende spielbar`);
}
check(kinds.size >= 4, `verschiedene Aufgabenarten in den Runden: ${[...kinds].join(", ")}`);
check(await page.evaluate(() => document.documentElement.scrollWidth) <= 360, "nichts breiter als ein schmales Handy");
await browser.close();
done("Spielen", errors);
