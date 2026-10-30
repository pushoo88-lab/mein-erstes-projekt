// Summis Stimme beim Abspielen: eigene Aufnahmen und Computerstimme gemischt, im Browser und auf Android.
// Aufgenommene Sätze kommen als Aufnahme, der Rest von der Computerstimme. Unterbrechen darf nichts doppelt
// sprechen, "Aus" spricht nur mit der Computerstimme, eine kaputte Aufnahme wird von der Computerstimme ersetzt.
import { testCopy, start, setup, bridge, check, done } from "./hilfen.mjs";

const dir = testCopy(), allErrors = [];
const REST = "TTS Ich bin Summi. Super, das hast du toll gerechnet!";
for (const android of [false, true]) {
  const how = android ? "Android" : "Browser";
  const { browser, page, errors, url } = await start({ dir });
  await page.addInitScript((android) => {
    window.__log = [];
    const log = (x) => window.__log.push(x);
    // Abspielen mitschreiben und nach kurzer Zeit "fertig" melden. window.__broken: Aufnahme lässt sich nicht abspielen
    HTMLMediaElement.prototype.play = function () {
      const el = this;
      if (window.__broken) { setTimeout(() => el.dispatchEvent(new Event("error")), 5); return Promise.resolve(); }
      log(`CLIP ${el.src.slice(0, 4)} ${el.playbackRate}`);
      el.__t = setTimeout(() => el.dispatchEvent(new Event("ended")), 120);
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () { clearTimeout(this.__t); };
    if (android) {
      window.androidBridge = { postMessage(json) {
        const m = JSON.parse(json);
        if (m.methodName === "addListener") return;
        if (m.pluginId === "TextToSpeech" && m.methodName === "speak") log("TTS " + m.options.text);
        setTimeout(() => window.Capacitor.fromNative({ callbackId: m.callbackId, pluginId: m.pluginId, methodName: m.methodName, success: true, data: {} }), m.methodName === "speak" ? 150 : 5);
      } };
    } else {
      speechSynthesis.speak = (u) => { log("TTS " + u.text); setTimeout(() => u.onend && u.onend(), 150); };
      speechSynthesis.cancel = () => {};
    }
  }, android);
  if (android) await page.addInitScript({ content: bridge() });
  await page.goto(url); await page.waitForTimeout(400);
  // "Hallo Mia!" als eigene Aufnahme ablegen, dann neu starten, damit die App sie lädt
  await page.evaluate(() => new Promise((ok) => {
    // eine gültige, kurze WAV-Datei (sonst meldet der Browser einen Fehler und die Computerstimme springt ein)
    const wav = () => { const n = 8000, b = new DataView(new ArrayBuffer(44 + n * 2)), w = (o, t) => [...t].forEach((c, i) => b.setUint8(o + i, c.charCodeAt(0)));
      w(0, "RIFF"); b.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, 1, true);
      b.setUint32(24, 8000, true); b.setUint32(28, 16000, true); b.setUint16(32, 2, true); b.setUint16(34, 16, true); w(36, "data"); b.setUint32(40, n * 2, true);
      return new Blob([b.buffer], { type: "audio/wav" }); };
    const r = indexedDB.open("rw-stimme", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("clips", { keyPath: "id" });
    r.onsuccess = () => { const tx = r.result.transaction("clips", "readwrite"); tx.objectStore("clips").put({ id: 0, text: "Hallo Mia!", dur: 1, blob: wav() }); tx.oncomplete = ok; };
  }));
  await page.reload(); await page.waitForTimeout(600);
  await setup(page, { name: "Mia" });
  await page.click("#parentBtn"); await page.waitForTimeout(400);
  check(await page.isVisible("#recBox"), `${how}: Auswahl für die eingesprochene Stimme sichtbar`);
  const take = async (ms = 1200) => { await page.waitForTimeout(ms); return page.evaluate(() => window.__log.splice(0)); };
  await take(300);

  await page.click('[data-rec="biene"]');
  let l = await take();
  check(l.length === 2 && l[0] === "CLIP blob 1.12" && l[1] === REST, `${how}: Kleine Biene: Aufnahme, dann Computerstimme (${l.join(" | ")})`);

  await page.click('[data-rec="natur"]'); await page.waitForTimeout(30); await page.click("#voiceTest");
  l = await take();
  check(l.filter((x) => x === REST).length === 1 && l[l.length - 1] === REST && l.includes("CLIP blob 1"), `${how}: unterbrochen und neu: nichts doppelt (${l.join(" | ")})`);

  await page.click('[data-rec=""]');
  l = await take();
  check(l.length === 1 && l[0] === "TTS Hallo Mia! Ich bin Summi. Super, das hast du toll gerechnet!", `${how}: Aus: nur Computerstimme (${l.join(" | ")})`);

  await page.click('[data-rec="natur"]'); await take();
  await page.evaluate(() => { window.__broken = true; });
  await page.click("#voiceTest");
  l = await take();
  check(l.length === 2 && l[0] === "TTS Hallo Mia!" && l[1] === REST, `${how}: kaputte Aufnahme: Computerstimme springt ein (${l.join(" | ")})`);
  allErrors.push(...errors);
  await browser.close();
}
done("Stimme", allErrors);
