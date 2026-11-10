---
name: schulblatt-einbauen
description: Baut ein neues Arbeitsblatt oder eine Lernzielkontrolle aus der Schule (Foto) in die Rechenwiese ein – genau die Aufgabenarten, Zahlen und Punkte vom Blatt – für Übungsblatt und Prüfung. Immer nutzen, wenn ein Foto eines Schulblatts, einer Klassenarbeit oder Hausaufgabe kommt ("bau das ein", "solche Aufgaben wie auf dem Blatt", "neue Lernzielkontrolle").
---

# Schulblatt einbauen

Ziel: Luisa übt in der App genau das, was in der Schule drankommt – gleiche Aufgabenart, gleiche Darstellung,
gleiche Wörter, gleiche Punkte. Alles steht in `lernapp/index.html`.

## 1. Blatt verstehen

Jede Aufgabe auf dem Foto aufschreiben: Überschrift wörtlich, Punkte, Zahlenraum, alle Zahlen,
welche Felder leer sind, wie die Lehrerin die Lösung erwartet (z. B. Rechnung + Antwortsatz).
Unklare Stellen beim Nutzer nachfragen, nicht raten.

## 2. Mit vorhandenen Aufgabenarten abgleichen

Vorhandene Bausteine. Der letzte Parameter legt die genauen Zahlen vom Blatt fest (Beispiele dafür stehen in
`app/tests/schulblatt.test.mjs`):

| Art (`kind`) | Erzeuger | Schulaufgabe |
|---|---|---|
| family4 | `familyFullTask(N, start, fix)` | Rechenroboter / Plumino: fehlende Zahl und alle vier Aufgaben |
| robofree | `freeRobotTask(N, fixC)` | Roboter nur mit Ergebnis, Zerlegung frei |
| wall3 | `wallMultiTask(N, fix)` | Zahlenmauer mit mehreren Lücken |
| table4 | `tableMultiTask(N, op, fix)` | Rechentabelle (+6, −8 …) mit vier Zeilen |
| doubletab | `doubleTableTask(N, fix)` | Das Doppelte / die Zahl dazu |
| probe | `probeTask(N, op, fix)` | Platzhalter □ mit Probe |
| smart2 | `smartPickTask(N, fix)` | Geschickt rechnen: zwei Zahlen einkreisen |
| sach | `riddleTask(N, fix)` | Zahlenrätsel (wie eine Sachaufgabe, Frage steht fest) |
| sach | `sachTask(N, ops, fix)` | Sachaufgabe: Frage wählen, Rechnung, Antwort |

Einfache Arten mit nur einem Feld für die Blumen-Runden: `family` (`familyTask`), `table` (`tableTask`),
`wall` (`wallTask`), `parts`, `text` und reine Rechnungen ohne `kind`.

Mehrteilige Aufgaben haben `t.steps` (Typen `num`, `choice`, `pick2`). Welche Antworten an einer Stelle
gelten, entscheidet `stepOptions(t, k, vals)` – jede Lösung, die die Lehrerin gelten lassen würde, muss
dort enthalten sein (z. B. Tauschaufgabe, andere Reihenfolge).

Fehlt eine Art: neuen Erzeuger nach dem Muster der vorhandenen bauen (mit `fix`-Parameter), zeichnen,
vorlesen (`spokenTask`), Hilfe/Tipp, Bewertung über `stepOptions`, und in `window.__mk` in
`app/tests/hilfen.mjs` aufnehmen.

## 3. Ins Übungsblatt und die Prüfung

`SCHOOL` in `lernapp/index.html` enthält die Teile des Blatts (Titel wörtlich, `short`, `points`, `make`).
Übungsblatt (mit Hilfe) und Prüfung (ohne Hilfe, mit Punkten und Berichtigung) nutzen beide `SCHOOL`.
Auch die **Wiesen-Rallye** (Brettspiel) zieht ihre Prüfungsaufgaben aus `SCHOOL` (`boardTask`): Eine neue Art
muss dort Feld für Feld lösbar sein und aufs Handy passen.
Gesamtpunkte und Notentext anpassen, wenn das neue Blatt andere Punkte hat. Bei einem zusätzlichen Blatt
lieber eine Auswahl der Blätter anbieten, statt das alte zu ersetzen – vorher mit dem Nutzer klären.

## 4. Genau nachbauen und testen

In `app/tests/schulblatt.test.mjs` jede Aufgabe vom Foto mit genau den Zahlen über die `fix`-Parameter
anlegen und die Lösung eintragen, die die Lehrerin erwartet. Jede muss beim ersten Versuch als richtig
gelten. Dann im Ordner `app/`: `node tests/schulblatt.test.mjs` und `node tests/aufgaben.test.mjs`
(Zufallsaufgaben der neuen Art rechnerisch richtig, im Zahlenraum, ohne doppelte Lücken) – bei neuen Arten dort
ergänzen. Neue Arten laufen außerdem durch `spielen` (Übungsblatt), `pruefung` (Punkte, Korrektur, Verbessern
von Feldern), `brettspiel` und `tablet` (Zahlentasten sichtbar).

## 5. Stimme

Neue feste Sätze (Lob, Hinweise) als eigene Liste in `lernapp/index.html` anlegen (`const NAME = [...]`) und in
`app/stimme/sprechliste.mjs` ganz am Ende der Gruppe "Neue Aufgaben und Übungsblatt" mit `...grab("NAME")`
anhängen, dann im Ordner `app/`: `node stimme/sprechliste.mjs` und `node stimme/sprechliste.mjs --check`.
Nie Sätze davor einfügen: sonst verschieben sich die Nummern schon aufgenommener Sätze.

## 6. Abschluss

Skill `rechenwiese-pruefen` ausführen (alle Tests, Bildschirmfotos bei 360 px Breite ansehen), README
ergänzen, committen und pushen. Dem Nutzer auf Deutsch zeigen, welche Aufgaben vom Blatt jetzt drin sind
(Tabelle Blatt ↔ App) und wo Luisa sie findet.
