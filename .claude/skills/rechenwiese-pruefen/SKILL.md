---
name: rechenwiese-pruefen
description: Prüft die Rechenwiese-App (lernapp/index.html) von A bis Z – alle automatischen Tests, Sprechliste, Code-Durchsicht – und fasst das Ergebnis auf Deutsch für die Eltern zusammen. Immer nutzen bei "prüfe alles", "teste die App", "einmal alles prüfen", vor jedem Commit an lernapp/index.html und nach größeren Änderungen.
---

# Rechenwiese prüfen

Die App ist eine einzige Datei: `lernapp/index.html` (ein IIFE, muss als JavaScript von 2019 lesbar bleiben).
Die Android-App wird daraus mit Capacitor gebaut (`app/`). Die Tests liegen in `app/tests/`.

## Ablauf

1. **Vorbereitung** (einmal pro Sitzung, im Ordner `app/`):
   `npm ci` falls `node_modules/` fehlt. Chromium und Playwright sind in Cloud-Sitzungen vorinstalliert;
   sonst `npx playwright install chromium`.
2. **Starttest:** `npm run build:web && npm test` (Start mit echter Android-Brücke, ES2019-Prüfung).
3. **Sprechliste:** `node stimme/sprechliste.mjs --check`. Passt sie nicht, mit `node stimme/sprechliste.mjs`
   neu erzeugen. Neue Sätze kommen ans Ende (Gruppe "Neue Aufgaben und Übungsblatt"), damit schon
   aufgenommene Sätze ihre Nummer behalten.
4. **Alle Tests:** `npm run test:alle` (dauert einige Minuten, darum im Hintergrund starten).
   Einzelne Tests: `node tests/alle.mjs pruefung` oder direkt `node tests/pruefung.test.mjs`.

   | Test | prüft |
   |---|---|
   | aufgaben | zehntausende erzeugte Aufgaben rechnerisch richtig |
   | schulblatt | Luisas Lernzielkontrolle mit genau den Zahlen vom Blatt, jede Lösung beim ersten Versuch richtig |
   | spielen | Übungsblatt und Blumen-Runden wie ein Kind gespielt, nichts zu breit |
   | pruefung | Prüfung wie in der Schule: Punkte, Überspringen, Zeit, Berichtigung, Gefühl, Verlauf |
   | aufnahme | Stimme aufnehmen mit simuliertem Mikrofon (ruhig / laut mit Atempause) |
   | stimme | eigene Aufnahme und Computerstimme gemischt, Browser und Android |
   | sicherung | Sichern und Wiederherstellen (Download und Android-Teilen), Byte für Byte |
   | bedienung | Doppeltippen, Ergebnistexte, Ballon, Sticker, Album, Kleiderschrank, hell und dunkel |
   | android | ganze App mit Capacitor-Brücke, Zurück-Taste, alle Themen, Spiele |
   | offline | keine Anfragen ins Internet, Schriften aus der App |

5. **Fehler untersuchen:** Erst klären, ob die App oder der Test falsch ist. Ein Test darf nie abgeschwächt
   werden, nur damit er grün wird. Test-Einblicke (`window.__s`, `__mk` …) baut `tests/hilfen.mjs` ein;
   fehlt eine Stelle, meldet `testCopy()` das mit "Test-Einblick nicht möglich".
6. **Code-Durchsicht:** die Änderungen seit dem letzten Stand mit dem Skill `code-review` durchsehen
   (Doppeltippen, alte Timer, Zurück-Taste, gespeicherte Daten, schmale Handys ab 320 px).
7. **Neue Funktion?** Dann gehört ein Test dazu: neue Datei `app/tests/<name>.test.mjs` mit den Hilfen aus
   `hilfen.mjs` (`testCopy`, `start`, `setup`, `answer`, `check`, `done`). `alle.mjs` findet sie von selbst.

## Bericht an die Eltern

Kurz, auf Deutsch, ohne Fachwörter: was geprüft wurde (Tabelle mit ✓/✗), was gefunden und repariert wurde,
was noch offen ist. Danach committen und auf den Arbeits-Branch pushen; GitHub baut dann die APK
("Android-App bauen") und spielt alle Tests durch ("Rechenwiese prüfen").
