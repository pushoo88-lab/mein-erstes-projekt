// Die ganze App wie auf einem Android-Handy: echte Capacitor-Brücke, Sprachausgabe meldet "fertig" erst
// nach der Sprechdauer, Zurück-Taste des Handys, dunkles Design, kein Internet.
// Alle Themen, Ballonjagd, Memory, Pfad, Garten, Tricks und Eltern-Ansicht werden durchgespielt.
import { testCopy, start, setup, answer, check, done } from "./hilfen.mjs";

const dir = testCopy();
const { browser, page, errors, url } = await start({ dir, width: 412, height: 860, colorScheme: "dark" });
const blocked = [];
await page.route("**/*", (r) => { const u = r.request().url(); if (u.startsWith("file://")) return r.continue(); blocked.push(u); r.abort(); });
await page.addInitScript(() => {
  window.__spoken = []; window.__current = null;
  const reply = (m, data = {}) => setTimeout(() => window.Capacitor.fromNative({ callbackId: m.callbackId, pluginId: m.pluginId, methodName: m.methodName, success: true, data }), 5);
  window.androidBridge = { postMessage(json) {
    const m = JSON.parse(json);
    if (m.pluginId === "App" && m.methodName === "addListener") { window.__back = m.callbackId; return; }
    if (m.pluginId === "TextToSpeech" && m.methodName === "speak") {
      window.__spoken.push(m.options.text);
      const me = { m }; window.__current = me;
      setTimeout(() => { if (window.__current === me) { window.__current = null; reply(m); } }, 40 + m.options.text.length * 4);
      return;
    }
    if (m.pluginId === "TextToSpeech" && m.methodName === "stop") { window.__current = null; reply(m); return; }
    if (m.methodName !== "addListener") reply(m);
  } };
});
const { bridge } = await import("./hilfen.mjs");
await page.addInitScript({ content: bridge() });
await page.goto(url); await page.waitForTimeout(400);

const spoken = () => page.evaluate(() => window.__spoken.splice(0));
// Ein offenes Sticker-Fenster würde die Zurück-Taste zuerst schließen (gewollt). Darum vorher zumachen.
const back = async () => {
  await page.waitForTimeout(1800);
  // Neue Sticker kommen zeitversetzt nacheinander (1,6 s nach dem Ergebnis, dann je einer nach dem Schließen).
  // Erst wenn 2,5 s lang keiner mehr erscheint, gehört die Zurück-Taste wieder der Seite.
  // Nur dort, wo Sticker erscheinen dürfen. Im Spiel und in der Ballonjagd kommen keine, und
  // "Wirklich aufhören?" braucht dort den zweiten Druck innerhalb von 4 s.
  let calm = ["resultView", "startView", "memoryView"].includes(await visible()) ? 0 : 2500;
  if (calm) for (let i = 0; i < 6 && await page.isVisible("#stickerToast"); i++) { await page.click("#toastOk"); await page.waitForTimeout(400); }
  for (let guard = 0; calm < 2500 && guard < 100; guard++) {
    if (await page.isVisible("#stickerToast")) { await page.click("#toastOk").catch(() => {}); calm = 0; }
    await page.waitForTimeout(250); calm += 250;
  }
  await page.evaluate(() => window.Capacitor.fromNative({ callbackId: window.__back, pluginId: "App", methodName: "addListener", success: true, data: { canGoBack: false } }));
  await page.waitForTimeout(250);
};
const visible = () => page.evaluate(() => ["setupView", "startView", "gameView", "resultView", "tricksView", "balloonView", "memoryView", "pathView", "gardenView", "parentView"].find((id) => !document.getElementById(id).hidden));
const wide = [];
const chkWide = async (n) => { const sw = await page.evaluate(() => document.documentElement.scrollWidth); if (sw > 412) wide.push(`${n}: ${sw}`); };

await setup(page, { name: "Lina", range: "100", mal: true, topics: ["all"] });
check(await visible() === "startView", "Einrichtung mit allen Themen bis 100");

const praise = /^(Super|Richtig|Klasse|Toll|Prima|Ja|Juhu|Spitze|Stark|Bravo|Hurra|Wow|Yippie|Sehr|Ausgezeichnet|Jawohl|Großartig|Fantastisch|Wunderbar|Noch|Fast|Nicht|Hmm|Knapp|Kein|Atme|Das kriegst|Oh|Jetzt|Geschafft|Dranbleiben)/;
for (const topic of ["text", "plus", "minus", "mal", "geteilt", "verdoppeln", "stellen", "nachbar", "mauer", "luecke", "geld", "uhr"]) {
  await page.evaluate((t) => { window.__s.topics = [t]; }, topic);
  await spoken();
  await page.click("#startBtn"); await page.waitForTimeout(150);
  let helped = null, played = 0, readable = false;
  // 3 Aufgaben: die erste einfache zuerst falsch, dann richtig. Mehrteilige Aufgaben Feld für Feld.
  for (let guard = 0; played < 3 && guard < 40; guard++) {
    const s = await page.evaluate(() => { const r = window.__s.round; return r && { t: r.tasks[r.i], step: r.step, vals: r.vals, locked: r.locked }; });
    if (!s) break;
    if (s.locked) { if (await page.isVisible("#nextBtn")) await page.click("#nextBtn"); else await page.waitForTimeout(250); continue; }
    // So entscheidet die App: Text, Mauer, Familie, Tabelle und mehrteilige Aufgaben werden vorgelesen,
    // reine Rechnungen (23 + 5, 6 Zehner + 3 Einer) nicht. Lob und Mut-Sätze kommen immer.
    if (["text", "wall", "family", "table"].includes(s.t.kind) || s.t.steps) readable = true;
    if (s.t.steps) {
      const opts = await page.evaluate(([t, k, v]) => window.__mk.stepOptions(t, k, v), [s.t, s.step, s.vals]);
      await answer(page, s.t.steps[s.step], opts[0]);
      if (s.step < s.t.steps.length - 1) continue;
    } else {
      if (helped === null) { await answer(page, null, s.t.answer + 1); await page.waitForTimeout(300); helped = await page.isVisible("#help"); }
      await answer(page, null, s.t.answer);
    }
    await page.waitForTimeout(1900);
    played++; await chkWide(topic + played);
  }
  const said = await spoken(), read = said.filter((x) => !praise.test(x));
  check(played === 3 && helped !== false && said.length > 0 && (!readable || read.length > 0), `${topic}: 3 Aufgaben gelöst${helped ? ", Tipp nach Fehler" : ""}, gesprochen («${(read[0] || said[0] || "").slice(0, 50)}»)`);
  await back(); await back();
  check(await visible() === "startView", `${topic}: Zurück-Taste fragt nach und führt zum Start`);
}

await page.evaluate(() => { window.__s.topics = ["plus"]; });
await page.click("#startBtn");
for (let i = 0; i < 10; i++) {
  const a = await page.evaluate(() => window.__s.round.tasks[window.__s.round.i].answer);
  await page.keyboard.type(String(a)); await page.keyboard.press("Enter"); await page.waitForTimeout(1900);
}
await page.waitForTimeout(500);
check(await visible() === "resultView", `Rundenende: „${(await page.textContent("#resultText")).slice(0, 60)}…“`);
await back();
check(await visible() === "startView", "Zurück-Taste im Ergebnis führt zum Start");

for (const topic of ["uhr", "geld", "mauer", "plus"]) {
  await page.evaluate((t) => { window.__s.topics = [t]; }, topic);
  await page.click("#balloonBtn"); await page.waitForFunction(() => window.__bj && window.__bj.wave && !window.__bj.wave.done);
  for (let i = 0; i < 2; i++) {
    await page.waitForFunction(() => window.__bj.wave && !window.__bj.wave.done);
    await page.evaluate(() => { const w = window.__bj.wave; w.balloons.find((x) => x.v === w.t.answer).el.click(); });
    await page.waitForTimeout(150);
  }
  await chkWide("ballon-" + topic);
  await back(); await back();
  check(await visible() === "startView", `Ballonjagd ${topic}: gespielt und zurück zum Start`);
}

await page.evaluate(() => { window.__s.topics = ["plus", "minus"]; });
await page.click("#memoryBtn"); await page.waitForTimeout(200);
const pairs = await page.evaluate(() => window.__mem.cards.map((c) => c.pair));
for (let pair = 0; pair < 6; pair++) {
  for (const i of pairs.map((x, k) => (x === pair ? k : -1)).filter((k) => k >= 0)) await page.click(`[data-card="${i}"]`);
  await page.waitForTimeout(450);
}
await page.waitForTimeout(900);
check(await page.isVisible("#memOverText"), `Memory geschafft: „${(await page.textContent("#memOverText")).slice(0, 50)}“`);
await back();
check(await visible() === "startView", "Zurück-Taste nach dem Memory");

await page.click("#pathBtn"); await page.waitForTimeout(200); await chkWide("pfad");
await page.click("#pathPlay"); await page.waitForTimeout(200);
check(await visible() === "gameView", "Pfad: Level 1 startet");
await back(); if (await visible() !== "pathView") await back();
check(await visible() === "pathView", "Zurück-Taste im Level führt zum Pfad");
await back();
check(await visible() === "startView", "Zurück-Taste im Pfad führt zum Start");

await page.click("#gardenBtn"); await page.waitForTimeout(200); await chkWide("garten");
check(await visible() === "gardenView", "Garten öffnet");
await back();
await page.click("#tricksBtn");
for (const g of ["plus", "minus", "stellen", "mal", "geteilt", "text", "luecke", "verdoppeln", "nachbar", "mauer", "geld", "uhr"]) { await page.click(`[data-jump="${g}"]`); await chkWide("tricks-" + g); }
await back();
check(await visible() === "startView", "Tricks durchgeblättert und zurück");
await page.click("#parentBtn"); await page.waitForTimeout(200); await chkWide("eltern");
const skills = await page.evaluate(() => [...document.querySelectorAll(".skill b")].map((x) => x.textContent));
check(skills.length >= 10, `Eltern-Ansicht zeigt den Lernstand von ${skills.length} Themen`);
await back();
check(await visible() === "startView", "Zurück-Taste in der Eltern-Ansicht");
check(wide.length === 0, `nichts zu breit${wide.length ? ": " + wide.join(", ") : ""}`);
check(blocked.length === 0, "keine Anfragen ins Internet");
await browser.close();
done("Android", errors);
