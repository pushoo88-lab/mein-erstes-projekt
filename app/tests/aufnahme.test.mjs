// Summis Stimme aufnehmen mit simuliertem Mikrofon: ruhiger Raum und lauter Raum mit Atempause.
// Die Aufnahme muss von selbst stoppen, sauber geschnitten, gespeichert und abgespielt werden.
import { testCopy, start, setup, fakeMic, check, done } from "./hilfen.mjs";

const dir = testCopy();
const cases = [
  { name: "ruhiger Raum", mic: fakeMic(dir, { name: "ruhig.wav" }), speech: 2.0 },
  { name: "lauter Raum mit Atempause", mic: fakeMic(dir, { name: "laut.wav", noise: 0.02, speech: [1.0, 3.5], pause: [1.9, 2.4], length: 7 }), speech: 2.5 },
];
const allErrors = [];
for (const c of cases) {
  const { browser, page, errors, url } = await start({ dir, mic: c.mic });
  await page.addInitScript(() => {
    window.__played = [];
    const orig = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { window.__played.push(`${this.src.slice(0, 5)} ${this.playbackRate} ${this.preservesPitch}`); return orig.call(this).catch(() => {}); };
    speechSynthesis.speak = (u) => window.__played.push("TTS " + u.text);
  });
  await page.goto(url); await page.waitForTimeout(400);
  await setup(page, { name: "Luisa" });
  await page.click("#parentBtn"); await page.waitForTimeout(300);
  check(await page.isVisible("#ownVoice"), `${c.name}: Aufnehmen in der Eltern-Ansicht sichtbar`);
  await page.click("#recordOpen"); await page.waitForTimeout(300);
  check((await page.textContent("#recText")) === "Hallo Luisa!", `${c.name}: erster Satz ist „Hallo Luisa!“`);
  for (let i = 0; i < 40 && !(await page.textContent("#recText")).startsWith("Ich bin Summi"); i++) await page.click("#recNext");
  await page.click("#recBtn"); await page.click("#recBtn", { force: true }).catch(() => {});   // Doppeltippen
  await page.waitForTimeout(1600);
  check(await page.evaluate(() => document.getElementById("recLevel").classList.contains("on")), `${c.name}: Pegel zeigt grün beim Sprechen`);
  const t0 = Date.now();
  await page.waitForFunction(() => /Gespeichert|nicht/.test(document.getElementById("recNote").textContent) && document.getElementById("recBtn").textContent !== "Moment …", null, { timeout: 16000 });
  const stopped = (Date.now() - t0) / 1000 + 1.6;
  check(stopped < 9, `${c.name}: stoppt von selbst nach ${stopped.toFixed(1)} s`);
  check(/Gespeichert/.test(await page.textContent("#recNote")), `${c.name}: gespeichert`);
  const clip = await page.evaluate(() => new Promise((ok) => { const r = indexedDB.open("rw-stimme", 1); r.onsuccess = () => { const q = r.result.transaction("clips").objectStore("clips").getAll(); q.onsuccess = () => ok(q.result.map((x) => x.dur)); }; }));
  check(clip.length === 1 && clip[0] > c.speech && clip[0] < c.speech + 1.6, `${c.name}: Satz vollständig und ohne lange Stille (${clip[0] && clip[0].toFixed(2)} s für ${c.speech} s Sprechen)`);
  await page.click("#recordBack"); await page.waitForTimeout(300);
  await page.evaluate(() => { window.__played = []; });
  await page.click('[data-rec="biene"]'); await page.waitForTimeout(2500);
  const played = await page.evaluate(() => window.__played);
  check(played.includes("TTS Hallo Luisa!") && played.includes("blob: 1.12 false"), `${c.name}: Probe mit eigener Stimme als kleine Biene (${played.join(" | ")})`);
  allErrors.push(...errors);
  await browser.close();
}
done("Aufnahme", allErrors);
