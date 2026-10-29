// Erzeugt die Sprechliste: alle festen Sätze, die Summi sagt, in der Reihenfolge zum Einsprechen.
// Die Sätze werden direkt aus lernapp/index.html gelesen, damit Liste und App nie auseinanderlaufen.
//   node app/stimme/sprechliste.mjs          -> schreibt app/stimme/sprechliste.json
//   node app/stimme/sprechliste.mjs --check  -> prüft nur, ob die gespeicherte Liste noch zur App passt
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, "..", "..", "lernapp", "index.html"), "utf8");
const out = join(here, "sprechliste.json");

// Liest eine Konstante wie `const PRAISE = [...]` aus dem App-Code
function grab(name) {
  const start = html.indexOf(`const ${name} = `);
  if (start < 0) throw new Error(`${name} nicht in lernapp/index.html gefunden`);
  let i = html.indexOf("=", start) + 1, depth = 0, quote = null, from = -1;
  for (; i < html.length; i++) {
    const c = html[i];
    if (quote) { if (c === "\\") i++; else if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "[" || c === "{") { if (from < 0) from = i; depth++; }
    else if (c === "]" || c === "}") { if (--depth === 0) break; }
  }
  return Function(`return ${html.slice(from, i + 1)}`)();
}

// Feste Sätze, die im App-Code stehen. Fehlt einer, wurde die App geändert und die Liste muss angepasst werden.
const fixed = (list) => list.map((text) => {
  for (const part of text.split(/(?<=[.!?]) /)) {
    if (!html.includes(part.replace(/[.!?]$/, ""))) throw new Error(`Satz nicht mehr in der App: "${part}"`);
  }
  return text;
});

const PRAISE = grab("PRAISE"), CONTEXT_PRAISE = grab("CONTEXT_PRAISE"), HELPED = grab("HELPED");
const TRY_AGAIN = grab("TRY_AGAIN"), SECOND_TRY = grab("SECOND_TRY"), MISSED = grab("MISSED"), STREAK = grab("STREAK");
const HIT_WORDS = grab("HIT_WORDS"), HOME_SAY = grab("HOME_SAY"), LEVEL_PLACES = grab("LEVEL_PLACES"), TYPE_NAME = grab("TYPE_NAME");
// Lob für Themen, die nach der ersten Sprechliste dazukamen
const NEU = ["familie", "geschickt"];
const targets = [...new Set(LEVEL_PLACES.map((_, i) => 6 + Math.floor(i / 4) * 2).filter((_, i) => i % 4 === 1))];

const teile = [
  { titel: "Teil 1: Das Wichtigste", gruppen: [
    ["Begrüßung", fixed([
      "Hallo! Ich bin Summi, die Rechenbiene. Wie heißt du?",
      "Schön, dass du da bist! In welche Klasse gehst du?",
      "Bis zu welcher Zahl rechnest du schon? Tippe die Zahl ein.",
      "Kannst du schon Mal und Geteilt rechnen?",
      "Was möchtest du rechnen? Tippe alles an, was du üben magst.",
      "Das ist eine riesige Zahl! Wenn du sicher bist, tippe nochmal auf Weiter.",
      "Super! Jetzt kann es losgehen. Möchtest du spielen oder Blumen sammeln?",
      ...HOME_SAY,
      "Schön, dass du da bist!",
      "Dein Tagesziel hast du heute schon geschafft! Du kannst trotzdem weiterspielen.",
      "Hallo!", "Ich bin Summi. Super, das hast du toll gerechnet!",
    ])],
    ["Lob", PRAISE],
    ["Nochmal versuchen", TRY_AGAIN],
    ["Beim zweiten Versuch geschafft", SECOND_TRY],
    ["Mit Hilfe geschafft", HELPED],
    // Vor diesen Sätzen nennt die Computerstimme die Lösung ("Die Lösung ist 17.")
    ["Nach der Lösung", MISSED.map((m) => m.replace(/^Die Lösung ist \{x\}\. /, ""))],
  ] },
  { titel: "Teil 2: Spiele und Belohnungen", gruppen: [
    ["Passendes Lob", Object.entries(CONTEXT_PRAISE).filter(([k]) => !NEU.includes(k)).flatMap(([, v]) => v)],
    ["Serien", [3, 6, 9].flatMap((n) => STREAK.map((s) => s.replace("{n}", n)))],
    ["Wiederholen", fixed(["Die kennst du schon von vorhin. Jetzt klappt sie bestimmt!", "Diese Aufgabe hattest du schon mal. Zeig, was du gelernt hast!"])],
    ["Ergebnis", fixed([
      "Perfekt! Alles richtig! Du hast super konzentriert gerechnet!", "Fantastisch! Dein Üben hat sich gelohnt!",
      "Gut gemacht! Du wirst immer besser!", "Gut, dass du geübt hast! Mit jeder Runde lernst du dazu.",
      "Und das Level hast du geschafft!", "Probier das Level gleich nochmal, du schaffst das!",
      "Du hast dich verbessert!", "Genauso gut wie letztes Mal!", "Toll, dass du dranbleibst!",
      "Tagesziel geschafft! Dafür bekommst du 5 Bonus-Blumen.",
    ])],
    ["Ballonjagd", [...HIT_WORDS, ...[5, 10, 15, 20].map((n) => `${n} Treffer!`), ...fixed([
      "Klasse konzentriert!", "Oh, das war nicht der richtige. Versuch einen anderen!",
      "Die Ballons kommen nochmal. Lass dir ruhig Zeit!", "Nicht schlimm, weiter geht's!",
      "Juhu, Level geschafft! Toll gekämpft!", "Neuer Rekord! Dein Üben zahlt sich aus!", "Gut gespielt! Mit jedem Spiel wirst du sicherer.",
    ])]],
    ["Zahlen-Memory", fixed([
      "Super, ein Paar!", "Toll, das passt!", "Klasse gefunden!",
      "Neuer Rekord! Du hast dir die Karten super gemerkt!", "Geschafft! Alle Paare gefunden. Super gemacht!",
    ])],
    ["Abenteuer-Pfad", [
      ...LEVEL_PLACES.map((p, i) => `Level ${i + 1}: ${p}.`),
      ...Object.values(TYPE_NAME).map((n) => `${n}!`), "Großes Finale!",
      ...fixed(["Schaffe mindestens 7 von 10 Aufgaben.", "Schaffe mindestens 8 von 10 Aufgaben."]),
      ...targets.map((t) => `Triff ${t} richtige Ballons.`),
      ...fixed(["Du hast 3 Leben für falsche Ballons.", "Finde alle 6 Paare.", "Du hast den ganzen Pfad geschafft! Du kannst jedes Level nochmal spielen."]),
    ]],
    ["Garten", fixed(["Such dir im Laden etwas Schönes für deinen Garten aus!", "Sammle Blumen beim Spielen und Üben. Dann kannst du hier einkaufen!"])],
    // Später dazugekommen: am Ende, damit sich die Nummern der Aufnahmen davor nicht verschieben
    ["Neue Aufgaben und Übungsblatt", [...NEU.flatMap((k) => CONTEXT_PRAISE[k]), ...grab("MULTI_MISSED"), ...grab("SCHOOL_DONE")]],
  ] },
];

// Durchnummerieren, in Blöcke zu höchstens 12 Sätzen teilen (ein Block = eine kurze Aufnahme)
const saetze = [];
let block = 0;
for (const [t, teil] of teile.entries()) {
  for (const [gruppe, list] of teil.gruppen) {
    for (let k = 0; k < list.length; k += 12) {
      block++;
      for (const text of list.slice(k, k + 12)) saetze.push({ id: saetze.length + 1, teil: t + 1, block, gruppe, text });
    }
  }
}
const texts = saetze.map((s) => s.text);
const doppelt = texts.filter((x, i) => texts.indexOf(x) !== i);
if (doppelt.length) throw new Error(`Doppelte Sätze: ${doppelt.join(" | ")}`);

const json = JSON.stringify({ teile: teile.map((t) => t.titel), saetze }, null, 1) + "\n";
// Dieselbe Liste für das Aufnehmen in der App
const appList = join(here, "..", "..", "lernapp", "stimme", "liste.js");
const js = "// Automatisch erzeugt von app/stimme/sprechliste.mjs: die Sätze zum Einsprechen. Nicht von Hand ändern.\n" +
  `window.RW_SPRECHLISTE = ${JSON.stringify(saetze.map(({ id, teil, block, gruppe, text }) => ({ id, teil, block, gruppe, text })))};\n`;
if (process.argv.includes("--check")) {
  if (readFileSync(out, "utf8") !== json || readFileSync(appList, "utf8") !== js) {
    throw new Error("Die Sprechliste passt nicht mehr zur App: node app/stimme/sprechliste.mjs ausführen");
  }
  console.log(`Sprechliste passt zur App (${saetze.length} Sätze).`);
} else {
  writeFileSync(out, json);
  writeFileSync(appList, js);
  console.log(`${saetze.length} Sätze in ${block} Blöcken, Teil 1: ${saetze.filter((s) => s.teil === 1).length} Sätze`);
}
