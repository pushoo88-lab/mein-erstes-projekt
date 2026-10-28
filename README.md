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

Im Ordner `lernapp/` liegt **Rechenwiese**, eine kleine Lern-App, mit der Kinder der
Klassen 1 bis 4 spielerisch rechnen üben. Einfach `lernapp/index.html` im Browser öffnen,
es wird nichts installiert.

Vor dem Start beantwortet das Kind drei Fragen:

1. **In welche Klasse gehst du?** (1 bis 4)
2. **Bis zu welcher Zahl rechnest du?** Die Zahl wird frei eingetippt (10 bis 1.000.000),
   z. B. 20 am Anfang von Klasse 1 oder 75 mitten in Klasse 2.
3. **Rechnest du schon Mal und Geteilt?** Nur bei „Ja“ kommen Mal- und Geteiltaufgaben vor.

Danach wird ein Thema gewählt: Plus, Minus, Mal und Geteilt (wenn freigeschaltet) sowie

- **Zehner & Einer** (ab dem Zahlenraum bis 1.000 „Stellenwerte“): Zahlen aus Zehnerstangen
  und Einerwürfeln erkennen, Stellenwerttafel lesen, „4 Z + 7 E = ?“, „47 = 40 + ?“
- **Textaufgaben**: Rätsel wie „Wenn du zu meiner Zahl 9 dazuzählst, kommt 19 heraus.
  Welche Zahl bin ich?“ und kleine Sachaufgaben
- **Lückenaufgaben** und **Bunt gemischt**

Die Hilfe zeigt im Zahlenraum bis 20 das Zwanzigerfeld, sonst passende Rechentipps.

**Ballonjagd:** Das Mathe-Spiel zur gleichen Auswahl. Ballons mit Antworten steigen auf, das
Kind tippt den richtigen an, bevor er davonfliegt. 3 Leben, Punkte (früh getroffen gibt
Extrapunkte), alle 5 Treffer ein neues Level mit schnelleren Ballons und ein gespeicherter Rekord.

**Rechentricks:** Eine eigene Seite erklärt kindgerecht, wie man am besten rechnet
(z. B. „Erst bis zur 10“, Tauschaufgabe, Signalwörter in Textaufgaben). Die Hilfe in
jeder Aufgabe verlinkt direkt auf den passenden Trick.

**Belohnungen:** 3 Aufgaben in Folge beim ersten Versuch richtig gibt einen kleinen Funkenregen
(bei 3, 6 und 9). Eine Runde mit 3 Sternen startet ein Feuerwerk. Sind alle 10 Aufgaben beim
ersten Versuch richtig, gibt es ein großes Feuerwerk und eine Goldblume für den Garten.

Jede Runde hat 10 Aufgaben. Richtig beim ersten Versuch lässt eine Blume wachsen, beim
zweiten Versuch eine Knospe. Nach der Runde gibt es bis zu 3 Sterne, und alle Blumen
landen im eigenen Garten (gespeichert im Browser). Bedienbar per Zahlenfeld (Tablet)
oder Tastatur (Ziffern, Rücktaste, Enter).
