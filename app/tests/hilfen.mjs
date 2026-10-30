// Gemeinsame Hilfen für die Tests der Rechenwiese.
// Jeder Test baut sich eine frische Kopie aus lernapp/index.html (wie "npm run build:web") mit
// kleinen Einblicken angelegt: window.__s (Zustand), __bj (Ballonjagd), __mem (Memory),
// __gen (Aufgaben erzeugen), __draw (Aufgabe zeichnen), __mk (Aufgaben-Bausteine) usw.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

export const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");
export const bridge = () => readFileSync(join(appDir, "node_modules/@capacitor/android/capacitor/src/main/assets/native-bridge.js"), "utf8");

// Frisch gebaute App mit Test-Einblicken in einem eigenen Ordner. Gibt den Ordner zurück.
const copies = [];
export function testCopy() {
  const dir = mkdtempSync(join(tmpdir(), "rechenwiese-test-"));
  copies.push(dir);
  execFileSync(process.execPath, [join(appDir, "scripts/build-web.mjs"), dir]);
  let html = readFileSync(join(dir, "index.html"), "utf8");
  const swap = (a, b) => {
    if (html.includes(b.split("\n")[0])) return;   // schon eingebaut
    if (!html.includes(a)) throw new Error(`Test-Einblick nicht möglich, Stelle fehlt: ${a}`);
    html = html.replace(a, b);
  };
  swap("  const state = {", "  const state = window.__s = {");
  swap("  const bj = {", "  const bj = window.__bj = {");
  swap("  const mem = {", "  const mem = window.__mem = {");
  swap("  function makeRound(cfg, sel) {",
    "  window.__gen = (c, t, s) => generate(c, t, s); window.__draw = drawTask; window.__spokenTask = (t) => spokenTask(t);\n" +
    "  window.__render = () => { renderTask(); announceTask(); };\n" +
    "  window.__mk = { familyFullTask, freeRobotTask, wallMultiTask, tableMultiTask, doubleTableTask, smartPickTask, sachTask, riddleTask, probeTask, stepOptions, dienes, tafel, gradeTask };\n" +
    "  function makeRound(cfg, sel) {");
  writeFileSync(join(dir, "index.html"), html);
  return dir;
}

// Testsignal fürs simulierte Mikrofon: Rauschen, Sprechen (wechselnde Töne), Ruhe. Als WAV-Datei.
export function fakeMic(dir, { noise = 0.004, speech = [1.0, 3.0], pause = null, length = 4.5, name = "mic.wav" } = {}) {
  const r = 48000, n = Math.round(r * length), pcm = new Int16Array(n);
  let seed = 7, phase = 0;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff * 2 - 1; };
  for (let i = 0; i < n; i++) {
    const t = i / r;
    let v = noise * rnd() * 1.7;
    const talking = t > speech[0] && t < speech[1] && !(pause && t > pause[0] && t < pause[1]);
    phase += 2 * Math.PI * (190 + 60 * Math.sin(2 * Math.PI * 3 * t)) / r;
    if (talking) v += 0.27 * Math.sin(phase) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 4 * t));
    pcm[i] = Math.max(-1, Math.min(1, v)) * 32767;
  }
  const head = Buffer.alloc(44);
  head.write("RIFF", 0); head.writeUInt32LE(36 + n * 2, 4); head.write("WAVE", 8); head.write("fmt ", 12);
  head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(1, 22); head.writeUInt32LE(r, 24);
  head.writeUInt32LE(r * 2, 28); head.writeUInt16LE(2, 32); head.writeUInt16LE(16, 34); head.write("data", 36); head.writeUInt32LE(n * 2, 40);
  const file = join(dir, name);
  writeFileSync(file, Buffer.concat([head, Buffer.from(pcm.buffer)]));
  return file;
}

// Browser starten. mic = WAV-Datei fürs simulierte Mikrofon.
export async function start({ dir, width = 360, height = 800, mic = null, android = false, autoSticker = true, colorScheme = "light" } = {}) {
  const args = mic ? ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-audio-capture=${mic}%noloop`] : [];
  const browser = await chromium.launch({ args });
  const ctx = await browser.newContext({ viewport: { width, height }, colorScheme, permissions: mic ? ["microphone"] : [], acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // Neue Sticker würden sonst Knöpfe verdecken. Wo es um Sticker geht: autoSticker = false.
  if (autoSticker) await page.addInitScript(() => setInterval(() => { const t = document.getElementById("stickerToast"); if (t && !t.hidden) document.getElementById("toastOk").click(); }, 150));
  if (android) await page.addInitScript({ content: bridge() });
  return { browser, page, errors, url: `file://${dir}/index.html` };
}

// Einrichtung wie ein Kind: Name, Klasse, Zahlenraum, Mal/Geteilt, Themen
export async function setup(page, { name = "", range = "20", mal = false, topics = ["plus"] } = {}) {
  if (name) { await page.fill("#nameInput", name); await page.click("#nameOk"); } else await page.click("#nameSkip");
  await page.waitForTimeout(300);
  await page.click('[data-grade="2"]'); await page.waitForTimeout(400);
  for (const k of [...range, "ok"]) await page.click(`#rangePad [data-key="${k}"]`);
  await page.click(`[data-mal="${mal ? 1 : 0}"]`); await page.waitForTimeout(400);
  for (const t of topics) await page.click(`[data-topic="${t}"]`);
  await page.click("#setupDone"); await page.waitForTimeout(300);
}

// Ein Feld einer Aufgabe ausfüllen: Zahl tippen, Auswahl antippen oder zwei Zahlen antippen
export async function answer(page, step, v) {
  if (!step || step.type === "num") { await page.keyboard.type(String(v)); await page.keyboard.press("Enter"); }
  else if (step.type === "choice") await page.click(`#task [data-choice="${v}"]`);
  else { const [x, y] = String(v).split(","); await page.click(`#task [data-pick="${x}"]`); await page.click(`#task [data-pick="${y}"]`); }
  await page.waitForTimeout(80);
}

let failed = 0;
export function check(ok, msg) {
  if (ok) console.log(`  ✓ ${msg}`);
  else { failed++; console.log(`  ✗ ${msg}`); }
}
export function done(name, errors = []) {
  check(errors.length === 0, `keine JavaScript-Fehler${errors.length ? ": " + errors.slice(0, 3).join(" | ") : ""}`);
  console.log(failed ? `${name}: ${failed} Prüfung(en) fehlgeschlagen` : `${name}: alles in Ordnung`);
  for (const d of copies) rmSync(d, { recursive: true, force: true });   // Testkopien wieder wegräumen
  process.exit(failed ? 1 : 0);
}
