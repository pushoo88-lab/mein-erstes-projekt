# Mein erstes Projekt

Ein einfaches Python-Hilfsprogramm zum Berechnen von Grundrechenarten.

## Verwendung

```python
from rechner import addiere, subtrahiere, multipliziere, dividiere

print(addiere(3, 4))        # 7
print(subtrahiere(10, 3))   # 7
print(multipliziere(3, 4))  # 12
print(dividiere(10, 2))     # 5.0
```

## Installation

Keine Abhängigkeiten notwendig — reines Python 3.

## Lizenz

MIT

## Rechenwiese – Lernapp für die Grundschule

Im Ordner `lernapp/` liegt **Rechenwiese**, eine Lern-App, mit der Kinder der Klassen 1 bis 4
spielerisch rechnen. Einfach `lernapp/index.html` im Browser öffnen, es wird nichts installiert.

### So ist die App aufgebaut

**Summi, die Rechenbiene,** begleitet das Kind durch die App. Sie spricht in Sprechblasen,
freut sich über richtige Antworten und überlegt mit, wenn etwas nicht klappt. Alle Texte,
Aufgaben und Tipps lassen sich **vorlesen** – wichtig für Kinder, die noch nicht flüssig lesen.
Ist der Ton an, spricht Summi mit einer fröhlichen Stimme: Sie liest ihre Fragen und die
Textaufgaben von selbst vor, lobt richtige Antworten, macht bei Fehlern Mut
(„Nicht schlimm! Versuch es nochmal, du schaffst das!“) und jubelt bei Serien, Rekorden und Leveln.

**1. Summi fragt nach – eine Frage pro Bildschirm**

1. In welche Klasse gehst du?
2. Bis zu welcher Zahl rechnest du schon? (wird mit dem großen Zahlenfeld eingetippt, 10 bis 1.000.000)
3. Kannst du schon Mal und Geteilt rechnen?
4. Was möchtest du rechnen? (mehrere Themen antippen, dann wird gemischt)

Es ist nichts vorausgewählt. Über „Ändern“ auf der Startseite lässt sich alles neu einstellen.

**2. Startseite mit großen Kacheln**

| Kachel | Was passiert |
|---|---|
| **Abenteuer-Pfad** | 12 Level auf einem Weg mit Orten wie Blumenwiese, Teich und Honigschloss. Jedes Level ist eine Blumen-Runde, Ballonjagd oder ein Memory mit einem Ziel (z. B. „Triff 6 Ballons“). Erst wenn ein Level geschafft ist, öffnet sich das nächste, dazu gibt es 3 Bonus-Blumen. Die ersten Level nutzen kleinere Zahlen, das letzte den ganzen eingetippten Zahlenraum. Jedes 4. Level ist ein „Großes Finale“. |
| **Ballonjagd** (Spiel) | Ballons mit Antworten steigen auf, der richtige wird angetippt. 3 Leben, Punkte, alle 5 Treffer eine neue Stufe, Rekord. Die Ballons lassen sich Zeit (10 bis 25 Sekunden, je nach Zahlenraum und Aufgabe). |
| **Zahlen-Memory** (Spiel) | 12 Karten: immer eine Aufgabe und ihr Ergebnis bilden ein Paar. Züge zählen, Rekord, 3 Blumen pro Spiel. |
| **Blumen-Runde** (Üben) | 10 Aufgaben mit Zahlenfeld. Jede richtige Antwort lässt eine Blume wachsen, Hilfe mit Bildern und Tipps. |
| **Rechentricks** (Lernen) | Kindgerechte Erklärungen, wie man am besten rechnet, z. B. „Erst bis zur 10“, Tauschaufgabe, Signalwörter. |
| **Mein Garten** (Belohnung) | Alle gesammelten Blumen wachsen in einem Garten-Bild. Im Gartenladen bezahlt das Kind mit Blumen und kauft Schnecke, Pilz, Schmetterling, Gartenzwerg, Teich, Bienenstock, Regenbogen und mehr (4 bis 30 Blumen). |

**Themen:** Plus, Minus, Mal und Geteilt (wenn freigeschaltet), Zehner & Einer bzw. Stellenwerte
(Zehnerstangen, Einerwürfel, Stellenwerttafel), Textaufgaben (Zahlenrätsel wie „Wenn du zu meiner
Zahl 9 dazuzählst, kommt 19 heraus. Welche Zahl bin ich?“ und kleine Sachaufgaben) und Lückenaufgaben.

**Belohnungen:** Blumen für den eigenen Garten, Funken bei 3, 6 und 9 richtigen Antworten in Folge,
Feuerwerk bei 3 Sternen oder einem neuen Rekord, eine Goldblume für eine fehlerfreie Blumen-Runde.

Bedienbar per Antippen (Tablet, Handy) oder Tastatur (Ziffern, Rücktaste, Enter). Garten, Einkäufe,
Pfad-Fortschritt, Sterne und Rekorde werden im Browser gespeichert.

### Als Android-App

Im Ordner `app/` wird die Rechenwiese als Android-App verpackt. GitHub baut bei jeder Änderung
automatisch eine installierbare `Rechenwiese.apk` (Release „Rechenwiese für Android“).
Die App läuft offline, liest mit der Sprachausgabe von Android vor und behält bei Updates
den Fortschritt. Details und Installationsanleitung: [`app/README.md`](app/README.md).
