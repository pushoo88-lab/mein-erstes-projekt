// Bedienung wie ein ungeduldiges Kind: doppelt tippen in der Einrichtung, drei Runden hintereinander,
// Ballon erst falsch, dann richtig. Dazu hell und dunkel: Sticker-Hinweis, Album, Kleiderschrank, nichts zu breit.
import { testCopy, start, setup, check, done } from "./hilfen.mjs";

const dir = testCopy(), allErrors = [];
const solveRound = async (page) => {
  for (let i = 0; i < 10; i++) {
    const a = await page.evaluate(() => window.__s.round.tasks[window.__s.round.i].answer);
    await page.keyboard.type(String(a)); await page.keyboard.press("Enter"); await page.waitForTimeout(1900);
  }
  await page.waitForTimeout(400);
};

{
  const { browser, page, errors, url } = await start({ dir });
  await page.goto(url); await page.waitForTimeout(300);
  await page.click("#nameSkip"); await page.click("#nameSkip").catch(() => {}); await page.waitForTimeout(300);
  await page.click('[data-grade="2"]'); await page.click('[data-grade="2"]'); await page.waitForTimeout(500);
  check(await page.isVisible("#stepRange"), "Doppeltipp auf die Klasse überspringt keine Frage");
  for (const k of ["2", "0", "ok"]) await page.click(`#rangePad [data-key="${k}"]`);
  await page.click('[data-mal="0"]'); await page.click('[data-mal="0"]'); await page.waitForTimeout(500);
  check(await page.isVisible("#stepTopics"), "Doppeltipp auf Mal/Geteilt überspringt keine Frage");
  await page.click('[data-topic="plus"]'); await page.click("#setupDone"); await page.waitForTimeout(300);
  check(await page.isVisible("#startView"), "Startseite nach der Einrichtung");

  const texts = [];
  for (let r = 0; r < 3; r++) {
    await page.click(r ? "#againBtn" : "#startBtn"); await page.waitForTimeout(200);
    await solveRound(page);
    texts.push(await page.textContent("#resultText"));
  }
  check(texts.every((t) => t && t.length > 10) && new Set(texts).size === 3, `drei verschiedene Ergebnistexte (${texts.map((t) => t.slice(0, 30)).join(" | ")})`);

  await page.click("#menuBtn"); await page.waitForTimeout(200);
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem("rw-skill")).plus.hist);
  await page.click("#balloonBtn"); await page.waitForFunction(() => window.__bj.wave && !window.__bj.wave.done);
  await page.evaluate(() => { const w = window.__bj.wave; w.balloons.find((x) => x.v !== w.t.answer).el.click(); });
  await page.evaluate(() => { const w = window.__bj.wave; w.balloons.find((x) => x.v === w.t.answer).el.click(); });
  const hist = await page.evaluate(() => JSON.parse(localStorage.getItem("rw-skill")).plus.hist);
  // Die Liste behält nur die letzten 30 Ergebnisse: herausfinden, wie viele dazugekommen sind
  const added = [0, 1, 2, 3].find((k) => JSON.stringify([...before, ...hist.slice(hist.length - k)].slice(-30)) === JSON.stringify(hist));
  check(added === 1 && hist[hist.length - 1] === 0.5, `Ballon falsch, dann richtig: zählt einmal als zweiter Versuch (${added} Einträge, ${hist[hist.length - 1]})`);
  await page.click("#bjBack"); await page.click("#bjBack"); await page.waitForTimeout(800);
  check(await page.isVisible("#startView") && !(await page.isVisible("#bjOver")), "nach der Ballonjagd zurück auf der Startseite");
  // Automatischer Tipp nach einem Fehler zählt nicht als "Hilfe geholt"; der Hilfe-Knopf schon
  const helped = () => page.evaluate(() => JSON.parse(localStorage.getItem("rw-stats") || "{}").helped || 0);
  const h0 = await helped();
  await page.click("#startBtn"); await page.waitForTimeout(300);
  let a = await page.evaluate(() => window.__s.round.tasks[window.__s.round.i].answer);
  await page.keyboard.type(String(a + 1)); await page.keyboard.press("Enter"); await page.waitForTimeout(500);
  await page.keyboard.type(String(a)); await page.keyboard.press("Enter"); await page.waitForTimeout(1900);
  check(await helped() === h0, "Tipp nach einem Fehler zählt nicht als Hilfe geholt");
  await page.click("#helpBtn"); await page.waitForTimeout(200);
  a = await page.evaluate(() => window.__s.round.tasks[window.__s.round.i].answer);
  await page.keyboard.type(String(a)); await page.keyboard.press("Enter"); await page.waitForTimeout(1900);
  check(await helped() === h0 + 1, "Hilfe-Knopf zählt als Hilfe geholt");
  // Tastatur (Windows): mit Tab auf "Hilfe", Enter öffnet die Hilfe und prüft nicht die halbe Antwort
  await page.keyboard.type("1");
  await page.focus("#helpBtn"); await page.keyboard.press("Shift+Tab"); await page.keyboard.press("Tab");
  const onHelp = await page.evaluate(() => document.activeElement.id === "helpBtn");
  const iBefore = await page.evaluate(() => window.__s.round.i);
  await page.keyboard.press("Enter"); await page.waitForTimeout(300);
  check(onHelp && await page.isVisible("#help") && await page.evaluate(() => window.__s.round.tries) === 0 && await page.evaluate(() => window.__s.round.i) === iBefore,
    "Tab auf Hilfe und Enter: Hilfe geht auf, die Antwort wird nicht geprüft");
  await page.click("#backBtn"); await page.click("#backBtn", { timeout: 1500 }).catch(() => {}); await page.waitForTimeout(300);
  // Wiederholungen: Aufgabe mit großen Zahlen oder Mal kommt bei kleinem Zahlenraum ohne Mal nicht wieder
  await page.evaluate(() => { localStorage.setItem("rw-review", JSON.stringify([
    { t: { a: 300, op: "+", b: 400, c: 700, blank: "a", answer: 3, topic: "plus" }, due: 0, box: 0 },
    { t: { a: 3, op: "·", b: 4, c: 12, blank: "c", answer: 12, topic: "plus" }, due: 0, box: 0 },
    { t: { a: 7, op: "+", b: 5, c: 12, blank: "c", answer: 12, topic: "plus" }, due: 0, box: 0 }])); });
  await page.reload(); await page.waitForTimeout(300); await setup(page, { range: "20", topics: ["plus"] });
  await page.click("#startBtn"); await page.waitForTimeout(300);
  const rev = await page.evaluate(() => window.__s.round.tasks.filter((t) => t.review).map((t) => `${t.a}${t.op}${t.b}`));
  check(rev.length === 1 && rev[0] === "7+5", `Wiederholung nur, wenn sie zum Zahlenraum passt (${rev.join(", ")})`);
  allErrors.push(...errors);
  await browser.close();
}

for (const colorScheme of ["light", "dark"]) {
  const { browser, page, errors, url } = await start({ dir, colorScheme, autoSticker: false });
  await page.goto(url); await page.waitForTimeout(300);
  await setup(page, { name: "Luisa" });
  await page.click("#startBtn"); await page.waitForTimeout(300);
  await solveRound(page); await page.waitForTimeout(2000);
  check(await page.isVisible("#stickerToast"), `${colorScheme}: neuer Sticker wird gezeigt („${await page.textContent("#toastName")}“)`);
  while (await page.isVisible("#stickerToast")) { await page.click("#toastOk"); await page.waitForTimeout(700); }
  await page.click("#menuBtn"); await page.waitForTimeout(300);
  check(/\d/.test(await page.textContent("#albumInfo")), `${colorScheme}: Album-Kachel zählt Sticker („${await page.textContent("#albumInfo")}“)`);
  await page.click("#albumBtn"); await page.waitForTimeout(300);
  await page.click('[data-sticker="perfekt"]'); await page.waitForTimeout(200);
  check(await page.isVisible("#albumView"), `${colorScheme}: Album öffnet`);
  await page.click("#albumBack"); await page.waitForTimeout(200);
  await page.evaluate(() => { for (let i = 0; i < 40; i++) window.__s.garden.push("f1"); });
  await page.click("#gardenBtn"); await page.waitForTimeout(300);
  await page.click('[data-outfit="krone"]'); await page.waitForTimeout(400);
  check(/Krone/i.test(await page.textContent("#gardenSay")) || await page.evaluate(() => (localStorage.getItem("rw-owned") || "").includes("o-krone")), `${colorScheme}: Summi bekommt die Krone („${(await page.textContent("#gardenSay")).slice(0, 50)}“)`);
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  check(sw <= 360, `${colorScheme}: nichts zu breit (${sw} px)`);
  allErrors.push(...errors);
  await browser.close();
}
done("Bedienung", allErrors);
