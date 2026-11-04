// Wiesen-Rallye (Brettspiel): würfeln, rechnen, ziehen. Gegen Summi muss das Kind prüfen, ob Summi richtig
// gerechnet hat. Mit Mama/Papa abwechselnd, die Erwachsenen bekommen schwerere Aufgaben.
// Ganze Partien bis zum Bienenstock, Sonderfelder, Blumen, Zurück-Taste, Handy und Tablet quer.
import { testCopy, start, setup, check, done } from "./hilfen.mjs";

const dir = testCopy(), allErrors = [];
const st = (page) => page.evaluate(() => { const b = window.__board; return { phase: b.phase, turn: b.turn, kind: b.players[b.turn] && b.players[b.turn].kind, pos: b.players.map((p) => p.pos), dice: b.dice, t: b.t, shown: b.shown, step: b.step, vals: b.vals }; });
// Ein Feld einer Prüfungsaufgabe so ausfüllen, wie ein Kind es bedient
async function fillField(page, s, v) {
  const type = s.t.steps[s.step].type;
  if (type === "num") { for (const d of String(v)) await page.click(`#boardPad [data-key="${d}"]`); await page.click('#boardPad [data-key="ok"]'); }
  else if (type === "choice") await page.click(`#boardTask [data-choice="${v}"]`);
  else { const [x, y] = String(v).split(","); await page.click(`#boardTask [data-pick="${x}"]`); await page.click(`#boardTask [data-pick="${y}"]`); }
  await page.waitForTimeout(60);
}
const flowers = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("rw-garden") || "[]").length);

// Spielt, bis jemand gewinnt. Gibt Beobachtungen zurück.
async function playGame(page, { wrongFirst = true } = {}) {
  const seen = { kidMoves: 0, checks: 0, caught: 0, grownMax: 0, wrongStays: 0, effects: new Set(), badMove: [], sheets: new Set(), bonus: 0, sheetFails: 0 };
  let didWrong = !wrongFirst;
  for (let guard = 0; guard < 400; guard++) {
    if (await page.isVisible("#boardOver")) break;
    const s = await st(page);
    if (s.phase === "roll" && s.kind !== "bee") { await page.click("#boardRoll"); await page.waitForTimeout(700); continue; }
    if (s.phase === "ask") {
      const before = s.pos[s.turn];
      if (s.kind === "grown") seen.grownMax = Math.max(seen.grownMax, s.t.answer, s.t.a || 0, s.t.b || 0);
      let bonus = 0;
      if (s.t.steps) {
        // Prüfungsaufgabe: Feld für Feld. Die erste wird absichtlich verpatzt (zweimal falsch in einem Feld).
        seen.sheets.add(s.t.kind);
        const fail = seen.sheets.size === 1 && !seen.sheetFails && s.t.steps[0].type === "num";
        for (let k = 0; k < 40; k++) {
          const c = await st(page);
          if (c.phase !== "ask" || c.step >= c.t.steps.length) break;
          const opts = await page.evaluate(([t, k, v]) => window.__mk.stepOptions(t, k, v), [c.t, c.step, c.vals]);
          if (fail && c.step === 0) { await fillField(page, c, Number(opts[0]) + 50); await fillField(page, c, Number(opts[0]) + 51); continue; }
          await fillField(page, c, opts[0]);
        }
        if (fail) {
          seen.sheetFails++;
          await page.waitForTimeout(3600);
          if ((await st(page)).pos[s.turn] !== before) seen.badMove.push("verpatzte Prüfungsaufgabe: trotzdem gezogen");
          continue;
        }
        bonus = s.t.steps.length >= 6 ? 2 : 0;
        if (bonus) seen.bonus++;
      } else {
      if (!didWrong) {   // einmal ganz falsch: bleibt stehen
        didWrong = true;
        for (const v of [s.t.answer + 1, s.t.answer + 2]) { await page.keyboard.type(String(v)); await page.keyboard.press("Enter"); await page.waitForTimeout(150); }
        await page.waitForTimeout(2600);
        if ((await st(page)).pos[s.turn] === before) seen.wrongStays++;
        continue;
      }
      for (const d of String(s.t.answer)) await page.click(`#boardPad [data-key="${d}"]`);
      await page.click('#boardPad [data-key="ok"]');
      }
      // warten, bis die Figur gezogen ist (und ein Sonderfeld gewirkt hat)
      await page.waitForFunction((t) => window.__board.phase !== "move" || window.__board.turn !== t, s.turn, { timeout: 15000 });
      const after = (await st(page)).pos[s.turn], plain = Math.min(20, before + s.dice + bonus);
      const field = { 5: 3, 12: 3, 9: -2, 16: -2, 18: -2 }[plain] || 0;
      if (field) seen.effects.add(field > 0 ? "sprung" : "wind");
      if ([7, 14].includes(plain)) seen.effects.add("nochmal");
      const expect = plain >= 20 ? 20 : Math.max(0, Math.min(20, plain + field));
      if (after !== expect) seen.badMove.push(`${before}+${s.dice}→${after} statt ${expect}`);
      if (s.kind === "kid") seen.kidMoves++;
      continue;
    }
    if (s.phase === "check") {
      seen.checks++;
      const right = s.shown === s.t.answer;
      if (!right) seen.caught++;
      await page.click(`#boardCheck [data-judge="${right ? 1 : 0}"]`);
      await page.waitForTimeout(400);
      continue;
    }
    await page.waitForTimeout(250);
  }
  return seen;
}

for (const [width, height, how] of [[360, 780, "Handy"], [1280, 800, "Tablet quer"]]) {
  const { browser, page, errors, url } = await start({ dir, width, height });
  // Mitschreiben, was Summi vorliest
  await page.addInitScript(() => { window.__said = []; speechSynthesis.speak = (u) => { window.__said.push(u.text); setTimeout(() => u.onend && u.onend(), 30); }; });
  await page.goto(url); await page.waitForTimeout(300);
  await setup(page, { name: "Luisa", range: "20", topics: ["plus", "minus", "familie"] });
  await page.click("#boardBtn"); await page.waitForTimeout(300);
  check(await page.isVisible("#boardSetup"), `${how}: Wahl des Mitspielers`);

  // Gegen Summi, eine ganze Partie
  const f0 = await flowers(page);
  await page.click('[data-opp="bee"]'); await page.waitForTimeout(300);
  check((await page.$$(".field")).length === 21, `${how}: Spielbrett mit 21 Feldern`);
  const layout = await page.evaluate(() => { const b = document.getElementById("board").getBoundingClientRect(), p = document.getElementById("boardPanel").getBoundingClientRect(); return { side: p.left >= b.right - 1, sw: document.documentElement.scrollWidth }; });
  check(layout.sw <= width && (width < 700 || layout.side), `${how}: Brett passt${width >= 700 ? ", Würfel und Aufgabe rechts daneben" : ""}`);
  await page.click("#boardRoll"); await page.waitForTimeout(700);
  const s1 = await st(page);
  check(s1.phase === "ask" && s1.dice >= 1 && s1.dice <= 6 && await page.isVisible("#boardPad"), `${how}: gewürfelt (${s1.dice}), dann Aufgabe mit Zahlentasten`);
  const padOk = await page.evaluate(() => document.getElementById("boardPad").getBoundingClientRect().bottom <= window.innerHeight + 1);
  if (width >= 700) check(padOk, `${how}: Zahlentasten ohne Scrollen sichtbar`);
  const seen = await playGame(page);
  check(await page.isVisible("#boardOver"), `${how}: Partie gegen Summi bis zum Ende („${await page.textContent("#boardOverTitle")}“)`);
  check(seen.badMove.length === 0, `${how}: Figuren ziehen richtig, Sonderfelder wirken${seen.badMove.length ? ": " + seen.badMove.join(", ") : ` (${[...seen.effects].join(", ") || "keins getroffen"})`}`);
  check(seen.wrongStays <= 1, `${how}: zweimal falsch gerechnet: Figur bleibt stehen`);
  check(seen.sheets.size >= 2, `${how}: Prüfungsaufgaben im Spiel (${[...seen.sheets].join(", ")})`);
  check(seen.sheetFails <= 1 && !seen.badMove.some((x) => /verpatzt/.test(x)), `${how}: verpatzte Prüfungsaufgabe: Summi füllt aus, Figur bleibt stehen`);
  const said = await page.evaluate(() => window.__said);
  const summi = said.filter((x) => x.startsWith("Summi hat ") && x.includes("gewürfelt")), kid = said.filter((x) => / gewürfelt\. /.test(x) && !x.startsWith("Summi"));
  const odd = [...summi.filter((x) => !/(gleich|Summi sagt:) \d[\d.]*( \w+)*\. Hat Summi richtig gerechnet\?$/.test(x) || /wie viel/.test(x)), ...kid.filter((x) => !/^Du hast [1-6] gewürfelt\. ./.test(x)), ...said.filter((x) => /Noch eine Blume|Deine Wiese/.test(x))];
  check(summi.length > 0 && kid.length > 0 && odd.length === 0, `${how}: Summi liest verständlich vor${odd.length ? ": " + odd.slice(0, 2).join(" | ") : ` („${summi[0]}“)`}`);
  check(seen.checks > 0, `${how}: Luisa prüft Summis Rechnung (${seen.checks}×, davon ${seen.caught}× verrechnet)`);
  check(await flowers(page) - f0 >= 3, `${how}: Blumen für den Garten (${await flowers(page) - f0})`);
  check(await page.evaluate(() => JSON.parse(localStorage.getItem("rw-stats")).boardGames) >= 1, `${how}: Partie wird gezählt`);

  // Mit Mama: Erwachsene bekommen schwerere Aufgaben
  await page.click("#boardMenu"); await page.waitForTimeout(300);
  await page.click("#boardBtn"); await page.waitForTimeout(300);
  await page.click('[data-opp="Mama"]'); await page.waitForTimeout(300);
  check((await page.textContent("#boardTurn")).includes("Luisa"), `${how}: Luisa fängt an`);
  const seen2 = await playGame(page, { wrongFirst: false });
  check(await page.isVisible("#boardOver") && seen2.checks === 0, `${how}: Partie mit Mama bis zum Ende, ohne Summi-Prüfung`);
  check(seen2.grownMax > 20, `${how}: Mama rechnet mit größeren Zahlen (bis ${seen2.grownMax})`);

  // Zurück mitten im Spiel fragt nach
  await page.click("#boardAgain"); await page.waitForTimeout(300);
  await playGame(page, { wrongFirst: false }).catch(() => {});   // bis zum Ende, dann neu
  await page.click("#boardAgain"); await page.waitForTimeout(300);
  await page.click("#boardRoll"); await page.waitForTimeout(700);
  for (let k = 0; k < 40; k++) {   // Aufgabe lösen, egal welche Art
    const c = await st(page);
    if (c.phase !== "ask") break;
    if (!c.t.steps) { for (const d of String(c.t.answer)) await page.click(`#boardPad [data-key="${d}"]`); await page.click('#boardPad [data-key="ok"]'); break; }
    await fillField(page, c, (await page.evaluate(([t, k, v]) => window.__mk.stepOptions(t, k, v), [c.t, c.step, c.vals]))[0]);
  }
  await page.waitForTimeout(3000);
  await page.click("#boardBack"); await page.waitForTimeout(200);
  check(await page.isVisible("#boardView"), `${how}: Zurück im Spiel fragt erst nach`);
  await page.click("#boardBack"); await page.waitForTimeout(400);
  check(await page.isVisible("#startView"), `${how}: zweites Zurück führt zum Start`);
  await page.waitForTimeout(3000);
  check(await page.isVisible("#startView"), `${how}: kein Zug läuft im Hintergrund weiter`);
  allErrors.push(...errors);
  await browser.close();
}
done("Brettspiel", allErrors);
