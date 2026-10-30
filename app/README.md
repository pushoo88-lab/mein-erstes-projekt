# Rechenwiese als Android-App

Dieser Ordner verpackt `lernapp/index.html` mit [Capacitor](https://capacitorjs.com) als Android-App.

## App installieren

Bei jeder Änderung an `lernapp/` oder `app/` baut GitHub automatisch eine neue APK-Datei
(Ablauf „Android-App bauen“ unter *Actions*). Die neueste Version liegt im Release
**„Rechenwiese für Android“**:

1. Auf dem Android-Gerät den Release öffnen und bei „Assets“ auf **Rechenwiese.apk** tippen.
2. Die heruntergeladene Datei öffnen.
3. Falls Android fragt: Installation aus dieser Quelle erlauben.
4. „Installieren“ tippen.

Updates werden genauso installiert. Weil jede Version mit demselben Schlüssel
(`signing/rechenwiese-debug.keystore`) signiert wird, bleiben Garten, Pfad und Rekorde erhalten.

## Was die App anders macht als die Browser-Version

- Stürzt beim Start doch einmal etwas ab, erscheint statt eines leeren Bildschirms eine Meldung
  mit dem Fehlertext und einem Knopf „Neu starten“.

- Läuft komplett offline, die Schriftarten liegen in `fonts/`.
- Vorlesen nutzt die Sprachausgabe von Android (Plugin `@capacitor-community/text-to-speech`).
  Dafür muss auf dem Gerät eine deutsche Stimme installiert sein.
- Die Zurück-Taste von Android geht einen Schritt zurück statt die App zu schließen.
- App-Symbol und Startbild mit Summi liegen in `assets/` und werden beim Bauen erzeugt.

## Starttest

Vor jedem Bau startet `npm test` (`scripts/smoke-test.mjs`) die App im Browser mit der echten
Android-Brücke von Capacitor (`native-bridge.js`). Er prüft:

- Der Code lässt sich als JavaScript von 2019 lesen, läuft also auch auf älteren Android-WebViews (ab Chrome 66).
- Summis erste Frage erscheint und eine Runde startet.
- Das Vorlesen erreicht die Sprachausgabe von Android.
- Die Zurück-Taste führt zur Startseite und beendet dort die App.
Schlägt der Test fehl, baut GitHub keine neue APK.

## Selbst bauen (optional)

Voraussetzungen: Node.js 22, Java 21 und das Android-SDK.

```bash
cd app
npm ci
npm run build:web
npx cap add android
npx @capacitor/assets generate --android
npx cap sync android
cd android && ./gradlew assembleDebug
```

## Play Store

Für eine Veröffentlichung im Play Store braucht es zusätzlich ein Google-Entwicklerkonto,
einen eigenen geheimen Release-Schlüssel (nicht den Schlüssel aus `signing/`), eine
Datenschutzerklärung und die Prüfung für Kinder-Apps („Designed for Families“).
