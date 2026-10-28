// Baut den Web-Teil der Android-App aus lernapp/index.html.
// - Schriftarten kommen aus app/fonts statt aus dem Internet (App läuft offline)
// - ohne viewport-fit=cover, damit Android die App neben Statusleiste und Navigationsleiste platziert
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(appDir, "..", "lernapp", "index.html");
const www = join(appDir, "www");

let html = readFileSync(source, "utf8");

const fontLinks = /<link rel="preconnect"[^>]*>\s*<link rel="preconnect"[^>]*>\s*<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/;
if (!fontLinks.test(html)) throw new Error("Schrift-Links in lernapp/index.html nicht gefunden");
html = html.replace(fontLinks, '<link rel="stylesheet" href="fonts/fonts.css">');

if (!html.includes(", viewport-fit=cover")) throw new Error("viewport-Meta in lernapp/index.html nicht gefunden");
html = html.replace(", viewport-fit=cover", "");

rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });
writeFileSync(join(www, "index.html"), html);
cpSync(join(appDir, "fonts"), join(www, "fonts"), { recursive: true });
console.log("www/ gebaut aus lernapp/index.html");
