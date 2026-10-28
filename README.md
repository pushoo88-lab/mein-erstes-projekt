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

Zuerst wählt das Kind seine Klasse und dann, **bis zu welcher Zahl** es rechnet. So passt
die App zum Anfang wie zum Ende des Schuljahres:

| Klasse | Zahlenräume zur Auswahl | Themen |
|---|---|---|
| 1 | bis 10, 20, 100 | Plus, Minus |
| 2 | bis 20, 50, 100 | Plus, Minus, Mal, Geteilt |
| 3 | bis 100, 500, 1.000 | Plus, Minus, Mal, Geteilt |
| 4 | bis 1.000, 10.000, 100.000, 1 Million | Plus, Minus, Mal, Geteilt |

Außerdem gibt es in jeder Klasse:

- **Zehner & Einer** (ab dem Zahlenraum bis 1.000 „Stellenwerte“): Zahlen aus Zehnerstangen
  und Einerwürfeln erkennen, Stellenwerttafel lesen, „4 Z + 7 E = ?“, „47 = 40 + ?“
- **Textaufgaben**: Rätsel wie „Wenn du zu meiner Zahl 9 dazuzählst, kommt 19 heraus.
  Welche Zahl bin ich?“ und kleine Sachaufgaben
- **Lückenaufgaben** und **Bunt gemischt**

Die Hilfe zeigt im Zahlenraum bis 20 das Zwanzigerfeld, sonst passende Rechentipps.

**Belohnungen:** 3 Aufgaben in Folge beim ersten Versuch richtig gibt einen kleinen Funkenregen
(bei 3, 6 und 9). Eine Runde mit 3 Sternen startet ein Feuerwerk. Sind alle 10 Aufgaben beim
ersten Versuch richtig, gibt es ein großes Feuerwerk und eine Goldblume für den Garten.

Jede Runde hat 10 Aufgaben. Richtig beim ersten Versuch lässt eine Blume wachsen, beim
zweiten Versuch eine Knospe. Nach der Runde gibt es bis zu 3 Sterne, und alle Blumen
landen im eigenen Garten (gespeichert im Browser). Bedienbar per Zahlenfeld (Tablet)
oder Tastatur (Ziffern, Rücktaste, Enter).
