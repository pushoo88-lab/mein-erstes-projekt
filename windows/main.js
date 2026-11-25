// Rechenwiese als Windows-Programm: zeigt lernapp/index.html (gebaut nach www/) in einem eigenen Fenster.
// Alles läuft offline. Fortschritt und eigene Aufnahmen speichert Electron im Benutzerordner
// (%APPDATA%\Rechenwiese), sie bleiben bei Updates erhalten.
//   electron .               Programm starten
//   electron . --selbsttest  startet unsichtbar, prüft die App und beendet sich (für den Bau bei GitHub)
const { app, BrowserWindow, session, shell } = require("electron");
const path = require("node:path");

const selftest = process.argv.includes("--selbsttest");

// Schon offen (z. B. Doppelklick auf das Symbol): nur das vorhandene Fenster nach vorn holen
const firstInstance = selftest || app.requestSingleInstanceLock();
if (!firstInstance) app.quit();

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 360,
    minHeight: 560,
    show: !selftest,
    title: "Rechenwiese",
    backgroundColor: "#e6f2f6",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, spellcheck: false },
  });
  win.removeMenu();
  // Links ins Internet im normalen Browser öffnen, nicht im Programm
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", (e, url) => { if (!url.startsWith("file:")) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });
  win.loadFile(path.join(__dirname, "www", "index.html"));
  return win;
}

if (firstInstance) app.whenReady().then(() => {
  // Mikrofon für "Summis Stimme aufnehmen" erlauben, sonst nichts
  session.defaultSession.setPermissionRequestHandler((_wc, permission, done) => done(permission === "media"));
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => permission === "media");
  const win = createWindow();
  app.on("second-instance", () => { if (win.isMinimized()) win.restore(); win.focus(); });

  if (selftest) {
    const errors = [];
    win.webContents.on("console-message", (e) => { if (e.level === "error") errors.push(e.message); });
    win.webContents.on("did-finish-load", async () => {
      await new Promise((ok) => setTimeout(ok, 1500));
      const r = await win.webContents.executeJavaScript(`({
        title: document.querySelector(".brand") ? document.querySelector(".brand").textContent : "",
        setup: !document.getElementById("setupView").hidden,
        fonts: [...document.fonts].filter((f) => f.status === "loaded").length,
        storage: (() => { try { localStorage.setItem("rw-test", "1"); return localStorage.getItem("rw-test") === "1"; } catch { return false; } })(),
        idb: !!window.indexedDB, recorder: !!window.MediaRecorder, speech: !!window.speechSynthesis,
      })`);
      const ok = r.setup && r.storage && r.idb && r.recorder && errors.length === 0;
      console.log(`Selbsttest: ${JSON.stringify(r)} Fehler: ${JSON.stringify(errors)}`);
      console.log(ok ? "Selbsttest bestanden: Rechenwiese startet unter Windows." : "Selbsttest FEHLGESCHLAGEN");
      app.exit(ok ? 0 : 1);
    });
    setTimeout(() => { console.log("Selbsttest FEHLGESCHLAGEN: App lädt nicht"); app.exit(1); }, 30000);
  }
});

app.on("window-all-closed", () => app.quit());
