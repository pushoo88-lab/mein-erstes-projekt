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

Vorhandene Bausteine (Erzeuger mit `fix`-Parametern, damit genaue Schulaufgaben nachgebaut werden können):

| Art (`kind`) | Erzeuger | Schulaufgabe |
|---|---|---|
| family / family4 | `familyFullTask` | Rechenroboter / Plumino mit Aufgabenfamilie |
| robofree | `freeRobotTask` | Roboter nur mit Ergebnis, Zerlegung frei |
| wall3 | `wallMultiTask` | Zahlenmauer mit mehreren Lücken |
| table / table4 | `tableMultiTask` | Rechentabelle (+6, −8 …) |
| doubletab | `doubleTableTask` | Das Doppelte / die Hälfte |
| probe | `probeTask` | Platzhalter □ mit Probe |
| smart2 | `smartPickTask` | Geschickt rechnen: zwei Zahlen einkreisen |
| riddle | `riddleTask` | Zahlenrätsel |
| sach | `sachTask` | Sachaufgabe: Frage, Rechnung, Antwort |

Mehrteilige Aufgaben haben `t.steps` (Typen `num`, `choice`, `pick2`). Welche Antworten an einer Stelle
gelten, entscheidet `stepOptions(t, k, vals)` – jede Lösung, die die Lehrerin gelten lassen würde, muss
dort enthalten sein (z. B. Tauschaufgabe, andere Reihenfolge).

Fehlt eine Art: neuen Erzeuger nach dem Muster der vorhandenen bauen (mit `fix`-Parameter), zeichnen,
vorlesen (`spokenTask`), Hilfe/Tipp, Bewertung über `stepOptions`, und in `window.__mk` in
`app/tests/hilfen.mjs` aufnehmen.

## 3. Ins Übungsblatt und die Prüfung

`SCHOOL` in `lernapp/index.html` enthält die Teile des Blatts (Titel wörtlich, `short`, `points`, `make`).
Übungsblatt (mit Hilfe) und Prüfung (ohne Hilfe, mit Punkten und Berichtigung) nutzen beide `SCHOOL`.
Gesamtpunkte und Notentext anpassen, wenn das neue Blatt andere Punkte hat. Bei einem zusätzlichen Blatt
lieber eine Auswahl der Blätter anbieten, statt das alte zu ersetzen – vorher mit dem Nutzer klären.

## 4. Genau nachbauen und testen

In `app/tests/schulblatt.test.mjs` jede Aufgabe vom Foto mit genau den Zahlen über die `fix`-Parameter
anlegen und die Lösung eintragen, die die Lehrerin erwartet. Jede muss beim ersten Versuch als richtig
gelten. Dann `node tests/schulblatt.test.mjs` und `node tests/aufgaben.test.mjs` (Zufallsaufgaben der neuen
Art rechnerisch richtig, im Zahlenraum, ohne doppelte Lücken) – bei neuen Arten dort ergänzen.

## 5. Stimme

Neue feste Sätze (Lob, Hinweise) in `app/stimme/sprechliste.mjs` am Ende der Gruppe
"Neue Aufgaben und Übungsblatt" ergänzen, dann `node stimme/sprechliste.mjs` und `--check`.
Nie Sätze davor einfügen: sonst verschieben sich die Nummern schon aufgenommener Sätze.

## 6. Abschluss

Skill `rechenwiese-pruefen` ausführen (alle Tests, Bildschirmfotos bei 360 px Breite ansehen), README
ergänzen, committen und pushen. Dem Nutzer auf Deutsch zeigen, welche Aufgaben vom Blatt jetzt drin sind
(Tabelle Blatt ↔ App) und wo Luisa sie findet.
