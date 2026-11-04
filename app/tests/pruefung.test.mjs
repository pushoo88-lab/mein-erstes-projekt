// Prüfung wie eine echte Arbeit: keine Hilfe, keine Rückmeldung, Überspringen, Zeit, Korrektur am Ende.
import { testCopy, start, setup, answer, check, done } from "./hilfen.mjs";

const dir = testCopy();
const { browser, page, errors, url } = await start({ dir });
await page.addInitScript(() => { window.__said = []; speechSynthesis.speak = (u) => window.__said.push(u.text); });
await page.goto(url); await page.waitForTimeout(300);
await setup(page, { name: "Luisa", range: "20" });

// Bewertung: andere richtige Reihenfolge zählt, die Musterlösung folgt dem Weg des Kindes
const g = await page.evaluate(() => {
  const M = window.__mk;
  const t = M.sachTask(20, ["plus"], { op: "plus", a: 8, b: 5, story: 0, kid: 0 });
  const s = M.gradeTask(t, [t.steps[0].answer, 5, 0, 9, 13, 13]);
  const f = M.familyFullTask(20, "mund", { a: 16, b: 4, miss: 2 });
  const fam = M.gradeTask(f, [20, 4, 16, 20, 16, 7, 20, 20, 4, 16, 20, 16, 4]);
  return { sach: s.marks.join(","), sachSol: s.sol[3], fam: fam.marks.filter((x) => !x).length, famSol: fam.sol[5] };
});
check(g.sach === "true,true,true,false,true,true" && g.sachSol === 8, "Sachaufgabe: 5 + … zuerst erlaubt, Fehler zeigt die passende 8");
check(g.fam === 1 && g.famSol === 4, "Rechenroboter: getauschte Zeile richtig, Fehler zeigt die passende Lösung");

await page.click("#examBtn"); await page.waitForTimeout(200);
check(await page.isVisible("#examDialog"), "Zeit-Auswahl erscheint");
await page.click('[data-min="30"]'); await page.waitForTimeout(300);
check(/⏱ 30:00/.test(await page.textContent("#count")), "Uhr läuft (30 Minuten)");
check(!(await page.isVisible("#helpBtn")) && await page.isVisible("#skipBtn"), "keine Hilfe, aber Überspringen");

// Nur überspringen und Zurück: es wird nachgefragt
await page.click("#skipBtn"); await page.waitForTimeout(150);
await page.click("#backBtn"); await page.waitForTimeout(200);
check(await page.isVisible("#gameView"), "Zurück fragt erst nach, auch wenn nur übersprungen wurde");

const state = () => page.evaluate(() => { const r = window.__s.round; return r && { i: r.i, t: r.tasks[r.i], step: r.step, vals: r.vals, locked: r.locked, revisit: !!r.revisit }; });
const said = new Set();
let skipped = 1, fixed = false, sawReview = false;
for (let guard = 0; guard < 600; guard++) {
  const s = await state();
  if (!s) break;
  if (s.locked) { await page.waitForTimeout(250); continue; }
  if (s.i === 9 && s.step === 0 && !s.revisit && skipped < 2) { skipped++; await page.click("#skipBtn"); await page.waitForTimeout(150); continue; }
  if (!s.t.steps) await answer(page, null, s.i === 4 ? s.t.answer + 1 : s.t.answer);
  else if (s.step >= s.t.steps.length) {   // fertig: nochmal ansehen, dann Weiter
    if (!sawReview) { sawReview = await page.isVisible("#nextBtn") && /verbessern/.test(await page.textContent("#say")); }
    await page.click("#nextBtn"); await page.waitForTimeout(150);
  } else if (!fixed && s.step === 0 && s.t.steps.length >= 4 && s.t.steps.slice(0, 3).every((x) => x.type === "num")) {
    // Vertippt: Feld 2 falsch, Feld 3 richtig. Dann Feld 2 antippen und verbessern, ⌫ auf leerem Feld geht zurück.
    fixed = true;
    const opt = (k, v) => page.evaluate(([t, k, v]) => window.__mk.stepOptions(t, k, v)[0], [s.t, k, v]);
    const v0 = await opt(0, []), v1 = await opt(1, [v0]), v2 = await opt(2, [v0, v1]);
    for (const v of [v0, v1 + 1, v2]) await answer(page, s.t.steps[0], v);
    check(await page.evaluate(() => document.querySelectorAll("#task .slot.done.edit").length) === 3 && !(await page.evaluate(() => document.querySelector("#task .slot.done.ok"))),
      "Prüfung: ausgefüllte Felder ohne richtig/falsch, zum Antippen");
    await page.click('#task [data-edit="1"]'); await page.waitForTimeout(100);
    await answer(page, s.t.steps[1], v1);
    const after = await state();
    check(after.step === 3 && after.vals[1] === v1 && after.vals[2] === v2, `Prüfung: Feld verbessert, die anderen bleiben, weiter beim nächsten freien Feld (${after.vals.slice(0, 3).join(", ")})`);
    await page.keyboard.press("Backspace"); await page.waitForTimeout(100);
    check((await state()).step === 2, "Prüfung: ⌫ auf leerem Feld geht ein Feld zurück");
    await answer(page, s.t.steps[2], v2);
    continue;
  } else {
    const opts = await page.evaluate(([t, k, v]) => window.__mk.stepOptions(t, k, v), [s.t, s.step, s.vals]);
    await answer(page, s.t.steps[s.step], opts[0]);
  }
  said.add(await page.textContent("#say"));
}
await page.waitForTimeout(900);
check(fixed, "Prüfung: Vertipper verbessert");
check(sawReview, "Prüfung: nach dem letzten Feld erst ansehen, dann Weiter");
check(![...said].some((x) => /richtig|stimmt|Lösung|nochmal/i.test(x) && !/übersprungen/.test(x)), "während der Prüfung kein richtig oder falsch");
check(await page.textContent("#resultTitle") === "Prüfung geschafft!", "Prüfung beendet");
const res = await page.textContent("#resultText");
check(/Von 35 Punkten hast du 34(,5)? erreicht/.test(res), `ein Fehler kostet Punkte: „${res.slice(0, 45)}“`);
await page.click('[data-feel="3"]'); await page.waitForTimeout(150);
check(await page.evaluate(() => JSON.parse(localStorage.getItem("rw-exams")).slice(-1)[0].feel) === 3, "„Die Prüfung war für mich“ wird gespeichert");
await page.click("#correctionOpen"); await page.waitForTimeout(400);
const corr = await page.evaluate(() => ({ ok: document.querySelectorAll(".corr-item.ok").length, bad: document.querySelectorAll(".corr-item.bad").length, empty: document.querySelectorAll(".corr-item.empty").length }));
check(corr.bad === 1 && corr.empty === 0, `Korrektur: ${corr.ok} grün, ${corr.bad} rot, ${corr.empty} leer (übersprungene kamen am Ende nochmal)`);
check(await page.evaluate(() => document.documentElement.scrollWidth) <= 360, "Korrektur passt aufs Handy");

// Zeit läuft mitten in einem Rechenroboter ab: angefangene Felder zählen, leere Geschickt-Aufgaben ohne Kreise
await page.click("#correctionBack"); await page.click("#againBtn"); await page.click('[data-min="30"]'); await page.waitForTimeout(300);
const idx = await page.evaluate(() => window.__s.round.tasks.findIndex((t) => t.kind === "family4"));
await page.evaluate((idx) => { const r = window.__s.round; r.i = idx; window.__render(); }, idx);
const t = await page.evaluate(() => window.__s.round.tasks[window.__s.round.i]);
for (const v of [t.nums[t.miss], t.nums[0], t.nums[1]]) await answer(page, null, v);
await page.evaluate(() => { window.__s.round.deadline = Date.now() + 300; });
await page.waitForTimeout(2000);
check(await page.textContent("#resultTitle") === "Die Zeit ist um!", "Prüfung endet, wenn die Zeit um ist");
await page.click("#correctionOpen"); await page.waitForTimeout(400);
const robo = await page.evaluate(() => { const it = [...document.querySelectorAll(".corr-item")].find((x) => x.querySelectorAll(".rows .row").length === 4); return it ? it.querySelectorAll(".slot.ok").length : -1; });
check(robo === 3, "angefangener Rechenroboter: die 3 ausgefüllten Felder zählen");
check(await page.evaluate(() => [...document.querySelectorAll(".corr-item.empty .circled")].length) === 0, "leere Aufgaben: nichts eingekreist");
check(await page.evaluate(() => window.__said.some((x) => /Zeit ist um/.test(x))), "Summi sagt, dass die Zeit um ist");

// Eine Zahl getippt, aber noch nicht bestätigt, als die Zeit abläuft: Sie zählt.
const lastTotal = () => page.evaluate(() => JSON.parse(localStorage.getItem("rw-exams")).slice(-1)[0].total);
await page.click("#correctionBack"); await page.click("#againBtn"); await page.click('[data-min="30"]'); await page.waitForTimeout(300);
const plain = await page.evaluate(() => window.__s.round.tasks[0]);
await page.keyboard.type(String(plain.answer)); await page.waitForTimeout(100);
await page.evaluate(() => { window.__s.round.deadline = Date.now() + 300; });
await page.waitForTimeout(2000);
check(await lastTotal() === 0.5, `getippte Zahl ohne OK zählt, wenn die Zeit um ist (${await lastTotal()} Punkte)`);

// Angefangen und dann selbst übersprungen, als letzte Aufgabe: bleibt leer, kein Fehler fürs Lernen
await page.click("#againBtn"); await page.click('[data-min="0"]'); await page.waitForTimeout(300);
const skillBefore = await page.evaluate(() => localStorage.getItem("rw-skill"));
const idx2 = await page.evaluate(() => window.__s.round.tasks.findIndex((t) => t.kind === "family4"));
await page.evaluate((idx) => { const r = window.__s.round; r.i = idx; r.revisit = []; window.__render(); }, idx2);
const t2 = await page.evaluate(() => window.__s.round.tasks[window.__s.round.i]);
for (const v of [t2.nums[t2.miss], t2.nums[0]]) await answer(page, null, v);
await page.click("#skipBtn"); await page.waitForTimeout(800);
check(await page.textContent("#resultTitle") === "Prüfung geschafft!" && await lastTotal() === 0, `selbst übersprungen: zählt als leer (${await lastTotal()} Punkte)`);
check(await page.evaluate(() => localStorage.getItem("rw-skill")) === skillBefore, "übersprungene Aufgabe verändert den Lernstand nicht");
await browser.close();
done("Prüfung", errors);
