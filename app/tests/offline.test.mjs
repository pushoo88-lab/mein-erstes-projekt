// Ohne Internet: die App darf nichts aus dem Netz laden, die Schriften kommen aus der App selbst.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appDir, testCopy, start, setup, check, done } from "./hilfen.mjs";

const dir = testCopy();
const { browser, page, errors, url } = await start({ dir, width: 390 });
const blocked = [];
await page.route("**/*", (r) => { const u = r.request().url(); if (u.startsWith("file://") || u.startsWith("blob:") || u.startsWith("data:")) return r.continue(); blocked.push(u); r.abort(); });
await page.goto(url);
await setup(page, { name: "Luisa" });
await page.click("#startBtn"); await page.waitForTimeout(600);
await page.evaluate(() => document.fonts.ready);
const fonts = await page.evaluate(() => [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replace(/"/g, "")));
check(fonts.length > 0, `Schriften geladen: ${[...new Set(fonts)].join(", ")}`);
check(await page.isVisible("#gameView"), "Runde läuft ohne Internet");
check(blocked.length === 0, `keine Anfragen ins Internet${blocked.length ? ": " + blocked.slice(0, 3).join(", ") : ""}`);
await browser.close();

// Das Bauprogramm ersetzt nur leere Ordner oder frühere Bauten, nie einen Ordner mit anderen Dateien.
// Geprüft wird ausschließlich in eigenen Wegwerf-Ordnern.
const build = (target) => { try { execFileSync(process.execPath, [join(appDir, "scripts", "build-web.mjs"), target], { stdio: "pipe" }); return "gebaut"; } catch (e) { return /kein Bau-Ordner/.test(String(e.stderr)) ? "abgelehnt" : "Fehler"; } };
const other = mkdtempSync(join(tmpdir(), "rechenwiese-fremd-"));
writeFileSync(join(other, "wichtig.txt"), "nicht löschen");
check(build(other) === "abgelehnt" && existsSync(join(other, "wichtig.txt")), "Bauprogramm: Ordner mit fremden Dateien wird abgelehnt, die Datei bleibt");
const empty = mkdtempSync(join(tmpdir(), "rechenwiese-leer-"));
check(build(empty) === "gebaut" && existsSync(join(empty, "index.html")), "Bauprogramm: leerer Ordner wird bebaut");
check(build(empty) === "gebaut", "Bauprogramm: früherer Bau wird ersetzt");
for (const d of [other, empty]) rmSync(d, { recursive: true, force: true });
done("Offline", errors);
