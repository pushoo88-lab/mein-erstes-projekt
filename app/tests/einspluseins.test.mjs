// Einspluseins-Karte und Blitzrechnen: Rechenzeiten werden still gemessen (keine Uhr zu sehen).
// Sitzt = zweimal hintereinander richtig und schnell. Blitzrechnen übt zuerst Unsicheres und Langsames.
// Eltern sehen einen Hinweis, wenn Aufgaben über die 10 deutlich länger dauern (zählendes Rechnen).
import { testCopy, start, setup, check, done } from "./hilfen.mjs";

const dir = testCopy(), allErrors = [];
const fstate = (page, k) => page.evaluate((k) => window.__mk.factState(k), k);
const solveCurrent = async (page, { wrong = 0, wait = 0 } = {}) => {
  const t = await page.evaluate(() => window.__s.round.tasks[window.__s.round.i]);
  if (wait) await page.waitForTimeout(wait);
  for (let i = 0; i < wrong; i++) { await page.keyboard.type(String(t.answer + 1)); await page.keyboard.press("Enter"); await page.waitForTimeout(450); }
  if (wrong < 2) { await page.keyboard.type(String(t.answer)); await page.keyboard.press("Enter"); }
  return t;
};

for (const [width, height, how] of [[360, 800, "Handy"], [320, 640, "kleines Handy"], [1280, 800, "Tablet quer"]]) {
  const { browser, page, errors, url } = await start({ dir, width, height });
  await page.goto(url); await page.waitForTimeout(300);
  await setup(page, { name: "Luisa", range: "100", topics: ["plus", "minus"] });

  // Stand vorgeben: 7+5 unsicher, 8+6 langsam, 2+3 sitzt, Rest neu
  await page.evaluate(() => { localStorage.setItem("rw-facts", JSON.stringify({ "7+5": [-1], "8+6": [9000], "2+3": [1500, 1800], "13−6": [-1] })); });
  await page.reload(); await page.waitForTimeout(400);
  await setup(page, { name: "Luisa", range: "100", topics: ["plus", "minus"] });
  check(/sitzen/.test(await page.textContent("#factsInfo")), `${how}: Kachel zeigt den Stand („${await page.textContent("#factsInfo")}“)`);
  await page.click("#factsBtn"); await page.waitForTimeout(300);
  const cells = await page.evaluate(() => ({ n: document.querySelectorAll("#factsGrid .fc").length, sitzt: document.querySelectorAll("#factsGrid .fc.sitzt").length, unsicher: document.querySelectorAll("#factsGrid .fc.unsicher").length, langsam: document.querySelectorAll("#factsGrid .fc.langsam").length, cross: document.querySelectorAll("#factsGrid .fc.cross").length }));
  check(cells.n === 100 && cells.sitzt === 1 && cells.unsicher === 1 && cells.langsam === 1, `${how}: Plus-Karte: 100 Felder, Farben stimmen (${JSON.stringify(cells)})`);
  check(cells.cross === 36, `${how}: 36 Aufgaben über die 10 markiert`);
  check(await page.evaluate(() => document.documentElement.scrollWidth) <= width, `${how}: Karte passt in die Breite`);
  await page.click('[data-fact="7+5"]'); await page.waitForTimeout(200);
  check(/7 \+ 5 = 12/.test(await page.textContent("#factsSay")), `${how}: Feld antippen sagt die Aufgabe („${await page.textContent("#factsSay")}“)`);
  await page.click('[data-facts="minus"]'); await page.waitForTimeout(200);
  check(await page.evaluate(() => document.querySelectorAll("#factsGrid .fc.unsicher").length) === 1, `${how}: Minus-Karte zeigt 13 − 6 als unsicher`);

  // Blitzrechnen: Unsicheres und Langsames zuerst
  await page.click("#factsTrain"); await page.waitForTimeout(400);
  const keys = await page.evaluate(() => window.__s.round.tasks.map((t) => `${t.a}${t.op}${t.b}`));
  check(keys.length === 10 && ["7+5", "8+6", "13−6"].every((k) => keys.includes(k)), `${how}: Blitzrechnen übt die unsicheren und langsamen (${keys.join(", ")})`);
  check(!(await page.isVisible("#count.hurry")) && !/Sek|Zeit/.test(await page.textContent("#gameView .bar")), `${how}: keine Uhr zu sehen`);
  if (how !== "Handy") { await browser.close(); allErrors.push(...errors); continue; }

  // Runde spielen: 7+5 schnell richtig (→ langsam, braucht 2×), 8+6 langsam, 13−6 zweimal falsch, Rest schnell
  for (let i = 0; i < 10; i++) {
    const t = await page.evaluate(() => window.__s.round.tasks[window.__s.round.i]);
    const k = `${t.a}${t.op}${t.b}`;
    await solveCurrent(page, k === "13−6" ? { wrong: 2 } : k === "8+6" ? { wait: 5200 } : {});
    await page.waitForTimeout(k === "13−6" ? 300 : 1300);
    if (k === "13−6") { await page.click("#nextBtn"); await page.waitForTimeout(300); }
    if (await page.isVisible("#resultView")) break;
  }
  // "Nochmal" (3 später) kann das Ende verschieben
  for (let g = 0; g < 4 && !(await page.isVisible("#resultView")); g++) { await solveCurrent(page); await page.waitForTimeout(1300); }
  check(await page.isVisible("#resultView"), `${how}: Blitzrechnen-Runde bis zum Ende`);
  check(await fstate(page, "7+5") === "langsam", `${how}: 7 + 5 einmal schnell nach Fehler: noch nicht „sitzt“`);
  check(await fstate(page, "8+6") === "langsam", `${how}: 8 + 6 langsam gerechnet: bleibt gelb`);
  check(await fstate(page, "13−6") !== "sitzt", `${how}: 13 − 6 falsch: nicht grün`);
  await page.click("#againBtn"); await page.waitForTimeout(400);
  check((await page.textContent("#where")).includes("Blitzrechnen"), `${how}: „Nochmal“ startet wieder Blitzrechnen`);
  for (let i = 0; i < 20 && !(await page.isVisible("#resultView")); i++) {
    if (await page.isVisible("#nextBtn")) { await page.click("#nextBtn"); await page.waitForTimeout(300); continue; }
    await solveCurrent(page); await page.waitForTimeout(1400);
  }
  check(await fstate(page, "7+5") === "sitzt", `${how}: 7 + 5 zweimal schnell richtig: sitzt`);

  // Normale Blumen-Runde misst auch
  await page.click("#menuBtn"); await page.waitForTimeout(300);
  const before = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem("rw-facts"))).reduce((n, h) => n + h.length, 0));
  await page.click("#startBtn"); await page.waitForTimeout(300);
  await solveCurrent(page); await page.waitForTimeout(1300);
  const after = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem("rw-facts"))).reduce((n, h) => n + h.length, 0));
  const t0 = await page.evaluate(() => window.__s.round.tasks[0]);
  const isFact = t0.a <= 20 && t0.b <= 10 && t0.c <= 20 && !t0.kind && t0.blank === "c";
  check(!isFact || after === before + 1, `${how}: Blumen-Runde zählt mit (${t0.a} ${t0.op} ${t0.b})`);
  await page.click("#backBtn"); await page.click("#backBtn").catch(() => {}); await page.waitForTimeout(300);

  // Eltern: Hinweis auf zählendes Rechnen nur, wenn über die 10 deutlich langsamer
  const seed = (slow) => page.evaluate((slow) => {
    const f = {};
    for (const k of ["8+5", "7+6", "9+4", "6+8", "13−6", "15−7"]) f[k] = [slow ? 9000 : 2500, slow ? 8500 : 2400];
    for (const k of ["2+3", "4+5", "10+3", "6+2", "8−3", "9−4"]) f[k] = [2000, 2100];
    localStorage.setItem("rw-facts", JSON.stringify(f));
  }, slow);
  await seed(true); await page.reload(); await page.waitForTimeout(300); await setup(page, { name: "Luisa", range: "100", topics: ["plus"] });
  await page.click("#parentBtn"); await page.waitForTimeout(300);
  check(/zählt|gezählt/.test(await page.textContent("#parentFactsText")), `${how}: Eltern-Hinweis bei langsamen Aufgaben über die 10`);
  await seed(false); await page.reload(); await page.waitForTimeout(300); await setup(page, { name: "Luisa", range: "100", topics: ["plus"] });
  await page.click("#parentBtn"); await page.waitForTimeout(300);
  check(/Kein Hinweis/.test(await page.textContent("#parentFactsText")), `${how}: kein Hinweis, wenn alles gleich schnell geht`);
  await page.click("#parentFactsOpen"); await page.waitForTimeout(300);
  check(await page.isVisible("#factsView"), `${how}: Eltern können die Karte öffnen`);
  allErrors.push(...errors);
  await browser.close();
}
done("Einspluseins", allErrors);
