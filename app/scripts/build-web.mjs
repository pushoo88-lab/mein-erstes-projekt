// Baut den Web-Teil der Android-App aus lernapp/index.html.
// - Schriftarten kommen aus app/fonts statt aus dem Internet (App läuft offline)
// - Summis eingesprochene Stimme aus lernapp/stimme
// - ohne viewport-fit=cover, damit Android die App neben Statusleiste und Navigationsleiste platziert
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(appDir, "..", "lernapp", "index.html");
// Ziel: app/www, für Tests auch ein anderer Ordner (node scripts/build-web.mjs <ordner>)
const www = process.argv[2] || join(appDir, "www");

let html = readFileSync(source, "utf8");

const fontLinks = /<link rel="preconnect"[^>]*>\s*<link rel="preconnect"[^>]*>\s*<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/;
if (!fontLinks.test(html)) throw new Error("Schrift-Links in lernapp/index.html nicht gefunden");
html = html.replace(fontLinks, '<link rel="stylesheet" href="fonts/fonts.css">');

if (!html.includes(", viewport-fit=cover")) throw new Error("viewport-Meta in lernapp/index.html nicht gefunden");
html = html.replace(", viewport-fit=cover", "");

// Sicherheitsnetz gegen Tippfehler: Ersetzt wird nur ein leerer Ordner oder ein früherer Bau
// (erkennbar an der Markierung, bei älteren Bauten an index.html + fonts/fonts.css).
const MARK = ".rechenwiese-bau";
if (existsSync(join(www, "package.json")) || existsSync(join(www, ".git")) || existsSync(join(www, "lernapp"))) throw new Error(`${www} ist kein Bau-Ordner`);
if (existsSync(www) && readdirSync(www).length &&
    !(existsSync(join(www, MARK)) || (existsSync(join(www, "index.html")) && existsSync(join(www, "fonts", "fonts.css"))))) {
  throw new Error(`${www} ist kein Bau-Ordner`);
}
rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });
writeFileSync(join(www, MARK), "Von scripts/build-web.mjs erzeugt. Dieser Ordner wird bei jedem Bau ersetzt.\n");
writeFileSync(join(www, "index.html"), html);
cpSync(join(appDir, "fonts"), join(www, "fonts"), { recursive: true });
// Eingesprochene Sätze für Summis Stimme (stimme.js und die mp3-Dateien)
cpSync(join(appDir, "..", "lernapp", "stimme"), join(www, "stimme"), { recursive: true });
console.log("www/ gebaut aus lernapp/index.html");
