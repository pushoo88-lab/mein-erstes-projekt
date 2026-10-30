// Sichern und Wiederherstellen: im Browser per Download, auf Android über Teilen (Datei in Stücken).
// Nach dem Löschen aller Daten muss alles Byte für Byte zurückkommen. Falsche Dateien werden abgelehnt.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { testCopy, start, setup, fakeMic, check, done } from "./hilfen.mjs";

const dir = testCopy(), mic = fakeMic(dir), allErrors = [];
for (const android of [false, true]) {
  const how = android ? "Android" : "Browser";
  const { browser, page, errors, url } = await start({ dir, mic, android: false });
  if (android) {
    await page.addInitScript(() => {
      window.__files = {}; window.__shared = null;
      window.androidBridge = { postMessage(json) {
        const m = JSON.parse(json);
        if (m.methodName === "addListener") return;
        let data = {};
        if (m.pluginId === "Filesystem" && m.methodName === "writeFile") window.__files[m.options.path] = [m.options.data];
        if (m.pluginId === "Filesystem" && m.methodName === "appendFile") window.__files[m.options.path].push(m.options.data);
        if (m.pluginId === "Filesystem" && m.methodName === "getUri") data = { uri: "file:///data/cache/" + m.options.path };
        if (m.pluginId === "Share") window.__shared = m.options;
        setTimeout(() => window.Capacitor.fromNative({ callbackId: m.callbackId, pluginId: m.pluginId, methodName: m.methodName, success: true, data }), 5);
      } };
    });
    const { bridge } = await import("./hilfen.mjs");
    await page.addInitScript({ content: bridge() });
  }
  await page.goto(url); await page.waitForTimeout(400);
  await setup(page, { name: "Luisa" });
  await page.evaluate(() => { localStorage.setItem("rw-garden", JSON.stringify(Array(17).fill("f1"))); localStorage.setItem("rw-stickers", JSON.stringify(["runde1"])); });
  // eine echte Aufnahme und 60 große Probe-Aufnahmen (zusammen über 6 MB)
  await page.click("#parentBtn"); await page.waitForTimeout(300); await page.click("#recordOpen"); await page.waitForTimeout(300);
  await page.click("#recBtn");
  await page.waitForFunction(() => /Gespeichert/.test(document.getElementById("recNote").textContent), null, { timeout: 20000 });
  await page.click("#recordBack"); await page.waitForTimeout(300);
  await page.evaluate(() => new Promise((ok) => { const r = indexedDB.open("rw-stimme", 1); r.onsuccess = () => { const tx = r.result.transaction("clips", "readwrite"), st = tx.objectStore("clips");
    for (let i = 1; i <= 60; i++) { const a = new Uint8Array(100000 + i); for (let k = 0; k < a.length; k++) a[k] = (k * 7 + i) % 251; st.put({ id: i, text: "Satz " + i, dur: 2, blob: new Blob([a], { type: "audio/wav" }) }); }
    tx.oncomplete = ok; }; }));
  const file = join(dir, `sicherung-${how}.rwsich`);
  if (android) {
    await page.click("#backupSave");
    await page.waitForFunction(() => window.__shared, null, { timeout: 15000 });
    const r = await page.evaluate(() => ({ shared: window.__shared, b64: Object.values(window.__files)[0] }));
    check(r.b64.length > 1 && r.shared.files[0].endsWith(".rwsich"), `${how}: Datei in ${r.b64.length} Stücken geschrieben und geteilt`);
    writeFileSync(file, Buffer.concat(r.b64.map((x) => Buffer.from(x, "base64"))));
  } else {
    const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#backupSave")]);
    check(/^Rechenwiese-Sicherung-.*\.rwsich$/.test(dl.suggestedFilename()), `${how}: Download ${dl.suggestedFilename()}`);
    await dl.saveAs(file);
  }
  check(readFileSync(file).slice(0, 7).toString() === "RWSICH1", `${how}: Sicherungsdatei gültig (${(readFileSync(file).length / 1e6).toFixed(1)} MB)`);
  // Alles löschen wie bei einer Neuinstallation, dann wiederherstellen
  await page.evaluate(() => new Promise((ok) => { localStorage.clear(); const r = indexedDB.deleteDatabase("rw-stimme"); r.onsuccess = r.onerror = r.onblocked = () => ok(); }));
  await page.reload(); await page.waitForTimeout(500);
  await setup(page, {});
  await page.click("#parentBtn"); await page.waitForTimeout(300);
  await page.setInputFiles("#backupFile", file);
  await page.waitForFunction(() => /Wiederhergestellt/.test(document.getElementById("backupNote").textContent), null, { timeout: 15000 });
  await page.waitForTimeout(2500);
  const after = await page.evaluate(() => new Promise((ok) => { const r = indexedDB.open("rw-stimme", 1); r.onsuccess = () => { const q = r.result.transaction("clips").objectStore("clips").getAll(); q.onsuccess = async () => ok({
    clips: q.result.length,
    same: (await Promise.all(q.result.filter((c) => c.id > 0).map(async (c) => { const a = new Uint8Array(await c.blob.arrayBuffer()); return a.length === 100000 + c.id && a.every((v, k) => v === (k * 7 + c.id) % 251); }))).every(Boolean),
    name: localStorage.getItem("rw-name"), garden: JSON.parse(localStorage.getItem("rw-garden") || "[]").length, stickers: localStorage.getItem("rw-stickers") }); }; }));
  check(after.clips === 61 && after.same, `${how}: alle 61 Aufnahmen Byte für Byte zurück`);
  check(after.name === '"Luisa"' && after.garden === 17 && after.stickers === '["runde1"]', `${how}: Name, Blumen und Sticker zurück`);
  writeFileSync(join(dir, "falsch.txt"), "hallo");
  await page.click("#parentBtn").catch(() => {}); await page.waitForTimeout(300);
  await page.setInputFiles("#backupFile", join(dir, "falsch.txt")); await page.waitForTimeout(400);
  check(/keine Sicherung/.test(await page.textContent("#backupNote")), `${how}: falsche Datei wird abgelehnt`);
  allErrors.push(...errors);
  await browser.close();
}
done("Sicherung", allErrors);
