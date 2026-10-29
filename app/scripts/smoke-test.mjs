// Starttest für die Android-App: lädt www/index.html mit der echten Android-Brücke von Capacitor
// (native-bridge.js) und prüft, dass die App startet, Summi fragt und eine Runde beginnt.
// Bricht der Test ab, wird keine APK gebaut.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const bridge = readFileSync(join(appDir, "node_modules/@capacitor/android/capacitor/src/main/assets/native-bridge.js"), "utf8");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 412, height: 860 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

// Android-Seite der Brücke simulieren: Aufrufe mitschreiben und erfolgreich beantworten
await page.addInitScript(() => {
  window.__native = [];
  window.androidBridge = {
    postMessage(json) {
      const m = JSON.parse(json);
      window.__native.push(`${m.pluginId}.${m.methodName}`);
      if (m.methodName !== "addListener") {
        setTimeout(() => window.Capacitor.fromNative({ callbackId: m.callbackId, pluginId: m.pluginId, methodName: m.methodName, success: true, data: {} }), 10);
      }
    },
  };
});
await page.addInitScript({ content: bridge });
await page.goto("file://" + join(appDir, "www/index.html"));

const check = (ok, msg) => { if (!ok) throw new Error(`Starttest fehlgeschlagen: ${msg}\nFehler im Browser: ${errors.join(" | ") || "keine"}`); };
check(await page.evaluate(() => window.Capacitor && window.Capacitor.isNativePlatform()), "Capacitor-Brücke nicht geladen");
check(await page.isVisible("#setupView"), "Summis erste Frage erscheint nicht");

await page.click("#nameSkip");
await page.waitForTimeout(300);
await page.click('[data-grade="2"]');
await page.waitForTimeout(400);
for (const k of ["1", "0", "0", "ok"]) await page.click(`#rangePad [data-key="${k}"]`);
await page.click('[data-mal="1"]');
await page.waitForTimeout(400);
await page.click('[data-topic="plus"]');
await page.click("#setupDone");
check(await page.isVisible("#startView"), "Startseite erscheint nicht");
await page.click("#startBtn");
check(await page.isVisible("#gameView"), "Blumen-Runde startet nicht");

const calls = await page.evaluate(() => window.__native);
check(calls.includes("App.addListener"), "Zurück-Taste wird nicht angemeldet");
check(calls.includes("TextToSpeech.speak"), "Vorlesen erreicht Android nicht");
check(errors.length === 0, "JavaScript-Fehler");

await browser.close();
console.log("Starttest bestanden: App startet, Summi spricht, Zurück-Taste ist angemeldet.");
