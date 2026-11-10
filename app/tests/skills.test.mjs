// Die beiden Skills (.claude/skills) müssen zum Projekt passen: Was dort steht, gibt es wirklich.
// - Kopf mit Name (= Ordnername) und Beschreibung
// - jede Test-Datei steht in der Tabelle von "rechenwiese-pruefen" und umgekehrt
// - genannte Dateien und npm-Befehle gibt es
// - jeder Aufgaben-Baustein aus "schulblatt-einbauen" existiert, nimmt die genannten Parameter
//   und erzeugt die genannte Aufgabenart
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { appDir, testCopy, start, setup, check, done } from "./hilfen.mjs";

const root = join(appDir, ".."), skillsDir = join(root, ".claude", "skills");
const html = readFileSync(join(root, "lernapp", "index.html"), "utf8");
const read = (name) => readFileSync(join(skillsDir, name, "SKILL.md"), "utf8");

for (const name of ["rechenwiese-pruefen", "schulblatt-einbauen"]) {
  const head = (read(name).match(/^---\n([\s\S]*?)\n---\n/) || [])[1] || "";
  check(new RegExp(`^name: ${name}$`, "m").test(head), `${name}: Name im Kopf stimmt mit dem Ordner überein`);
  check(/^description: .{60,}$/m.test(head), `${name}: Beschreibung vorhanden`);
  // Dateien und Ordner in `…`, die wie Pfade aussehen
  const paths = [...read(name).matchAll(/`((?:app|lernapp|windows|docs|\.github)\/[\w./-]+)`/g)].map((m) => m[1]);
  const missing = [...new Set(paths)].filter((p) => !existsSync(join(root, p)));
  check(paths.length > 0 && missing.length === 0, `${name}: ${new Set(paths).size} genannte Dateien gibt es${missing.length ? " – fehlt: " + missing.join(", ") : ""}`);
}

// rechenwiese-pruefen: Tabelle der Tests
const pruefen = read("rechenwiese-pruefen");
const listed = [...pruefen.matchAll(/^\s*\| ([a-z]+) \|/gm)].map((m) => m[1]);
const files = readdirSync(join(appDir, "tests")).filter((f) => f.endsWith(".test.mjs")).map((f) => f.replace(".test.mjs", ""));
const notListed = files.filter((f) => !listed.includes(f)), gone = listed.filter((f) => !files.includes(f));
check(notListed.length === 0 && gone.length === 0, `rechenwiese-pruefen: alle ${files.length} Tests stehen in der Tabelle${notListed.length ? " – fehlt: " + notListed.join(", ") : ""}${gone.length ? " – gibt es nicht mehr: " + gone.join(", ") : ""}`);
const scripts = { ...JSON.parse(readFileSync(join(appDir, "package.json"), "utf8")).scripts, ...JSON.parse(readFileSync(join(root, "windows", "package.json"), "utf8")).scripts };
const cmds = [...new Set([...pruefen.matchAll(/npm run ([\w:-]+)/g)].map((m) => m[1]))];
check(cmds.length >= 3 && cmds.every((c) => scripts[c]), `rechenwiese-pruefen: npm-Befehle gibt es (${cmds.join(", ")})`);
check(/npm test/.test(pruefen) && !!scripts.test && existsSync(join(appDir, "stimme", "sprechliste.mjs")), "rechenwiese-pruefen: Starttest und Sprechliste vorhanden");
for (const wf of ["Android-App bauen", "Windows-Programm bauen", "Rechenwiese prüfen"]) {
  const found = readdirSync(join(root, ".github", "workflows")).some((f) => readFileSync(join(root, ".github", "workflows", f), "utf8").includes(`name: ${wf}`));
  check(pruefen.includes(wf) && found, `rechenwiese-pruefen: GitHub-Ablauf „${wf}“ gibt es`);
}

// schulblatt-einbauen: Bausteine wirklich aufrufen
const blatt = read("schulblatt-einbauen");
const rows = [...blatt.matchAll(/^\| ([a-z0-9]+) \| `(\w+)\(([^)]*)\)` \|/gm)].map((m) => ({ kind: m[1], fn: m[2], params: m[3].split(",").map((x) => x.trim()) }));
check(rows.length >= 9, `schulblatt-einbauen: ${rows.length} Bausteine in der Tabelle`);
for (const r of rows) {
  const sig = (html.match(new RegExp(`function ${r.fn}\\(([^)]*(?:\\([^)]*\\)[^)]*)*)\\)\\s*\\{`)) || [])[1];
  const real = sig === undefined ? null : sig.split(/,(?![^[(]*[\])])/).map((x) => x.trim().split(/\s*=/)[0]);
  check(real && real.join(",") === r.params.join(","), `schulblatt-einbauen: ${r.fn}(${r.params.join(", ")}) hat genau diese Parameter${real ? "" : " – gibt es nicht"}`);
}
const names = [...blatt.matchAll(/`(SCHOOL|stepOptions|spokenTask|boardTask|familyTask|tableTask|wallTask)[^`]*`/g)].map((m) => m[1]);
check([...new Set(names)].every((n) => new RegExp(`(function|const) ${n}\\b`).test(html)), `schulblatt-einbauen: genannte Stellen im Code gibt es (${[...new Set(names)].join(", ")})`);
check(readFileSync(join(appDir, "stimme", "sprechliste.mjs"), "utf8").includes('"Neue Aufgaben und Übungsblatt"'), "schulblatt-einbauen: Gruppe in der Sprechliste gibt es");

const dir = testCopy();
const { browser, page, errors, url } = await start({ dir });
await page.goto(url); await page.waitForTimeout(300);
await setup(page, { name: "Luisa", range: "20" });
const kinds = await page.evaluate((fns) => Object.fromEntries(fns.map((fn) => {
  const M = window.__mk, seen = new Set();
  for (let i = 0; i < 20; i++) {
    const t = fn === "tableMultiTask" ? M[fn](20, "plus") : M[fn](20);
    seen.add(t.kind + (t.steps && t.steps.length ? "" : " ohne Felder"));
  }
  return [fn, [...seen]];
})), rows.map((r) => r.fn));
for (const r of rows) check(kinds[r.fn].length === 1 && kinds[r.fn][0] === r.kind, `schulblatt-einbauen: ${r.fn} erzeugt „${r.kind}“ mit Feldern (${kinds[r.fn].join(", ")})`);
// Jede dieser Arten kommt im Übungsblatt vor
await page.click("#schoolBtn"); await page.waitForTimeout(300);
const inSheet = await page.evaluate(() => [...new Set(window.__s.round.tasks.map((t) => t.kind).filter(Boolean))]);
const unused = [...new Set(rows.map((r) => r.kind))].filter((k) => !inSheet.includes(k));
check(unused.length === 0, `schulblatt-einbauen: alle Arten kommen im Übungsblatt vor${unused.length ? " – nicht: " + unused.join(", ") : ""}`);
await browser.close();
done("Skills", errors);
