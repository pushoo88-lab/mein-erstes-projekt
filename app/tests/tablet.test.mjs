// Großes Tablet wie das Fire HD 10 (1280 × 800, quer und hochkant): Bei jeder Aufgabenart vom Übungsblatt
// müssen die Zahlentasten ganz zu sehen sein, ohne zu scrollen, und nichts darf über den Rand ragen.
import { testCopy, start, setup, check, done } from "./hilfen.mjs";

const dir = testCopy(), allErrors = [];
for (const [width, height, how] of [[1280, 800, "quer"], [800, 1280, "hochkant"]]) {
  const { browser, page, errors, url } = await start({ dir, width, height, android: true });
  await page.goto(url); await page.waitForTimeout(300);
  await setup(page, { name: "Luisa", range: "20" });
  await page.click("#schoolBtn"); await page.waitForTimeout(500);
  const kinds = await page.evaluate(() => { const seen = {}; window.__s.round.tasks.forEach((t, i) => { const k = t.kind || "rechnung"; if (!(k in seen)) seen[k] = i; }); return seen; });
  const bad = [];
  for (const [kind, i] of Object.entries(kinds)) {
    await page.evaluate((i) => { const r = window.__s.round; r.i = i; r.step = 0; r.vals = []; r.picks = []; window.__render(); }, i);
    await page.waitForTimeout(200);
    const m = await page.evaluate(() => ({ pad: document.getElementById("pad").getBoundingClientRect().bottom, wide: document.documentElement.scrollWidth }));
    if (m.pad > height || m.wide > width) bad.push(`${kind} (Tasten bis ${Math.round(m.pad)}, Breite ${m.wide})`);
  }
  check(bad.length === 0, `${how}: Tasten bei allen ${Object.keys(kinds).length} Aufgabenarten ohne Scrollen sichtbar${bad.length ? ": " + bad.join(", ") : ""}`);
  if (how === "quer") {
    const side = await page.evaluate(() => document.getElementById("pad").getBoundingClientRect().left > document.querySelector(".task-card").getBoundingClientRect().right);
    check(side, "quer: Tasten rechts neben der Aufgabe");
  }
  allErrors.push(...errors);
  await browser.close();
}
done("Tablet", allErrors);
