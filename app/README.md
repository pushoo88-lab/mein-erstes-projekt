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

### Amazon Fire Tablet (z. B. Fire HD 10 Kids Pro)

Fire-Tablets laufen mit Fire OS 7 (beruht auf Android 9) oder Fire OS 8 (Stand von Android 11), laut Amazon
([Fire OS 7](https://developer.amazon.com/de/docs/fire-tablets/fire-os-7.html), [Fire OS 8](https://developer.amazon.com/de/docs/fire-tablets/fire-os-8.html)).
Die App braucht mindestens Android 7, sie läuft also. Quer im Ständer stehen Aufgabe und Zahlentasten nebeneinander, hochkant untereinander.

1. Im **Eltern-Profil** die Installation für den Silk-Browser erlauben. Fire OS 8: *Einstellungen → Apps und
   Benachrichtigungen → Spezieller App-Zugriff → Unbekannte Apps installieren → Silk* ([TechBone](https://www.techbone.de/amazon/fire-tablet/apps-unbekannter-herkunft));
   ältere Versionen: *Einstellungen → Sicherheit und Datenschutz → Apps unbekannter Herkunft* ([PC-Welt](https://www.pcwelt.de/article/1169139/so-nutzen-sie-playstore-apps-auf-dem-fire-tablet.html)).
2. Im Silk-Browser den Release öffnen, **Rechenwiese.apk** laden und installieren.
3. **Kinderprofil:** Selbst installierte Apps lassen sich dort meist **nicht** freigeben; nach Erfahrungsberichten
   erscheinen nur Apps aus dem Amazon-Appstore ([r/kindlefire](https://r.darklab.sh/r/kindlefire/comments/1e3hisw/sideloading_apps_on_kids_kindle_fire_tablet)).
   So war es auch auf Luisas Fire HD 10 Kids Pro. Dann die App im Eltern-Profil nutzen.
4. **Wichtig:** Fortschritt und eigene Aufnahmen gehören zu dem Profil, in dem sie entstehen. Summis Stimme
   darum in dem Profil aufnehmen, in dem Luisa spielt (Bereich „Für Eltern“).
5. Vorlesen: Klingt die Computerstimme nicht deutsch, in den Einstellungen des Tablets die Sprachausgabe auf
   Deutsch stellen. Eigene Aufnahmen funktionieren immer.

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
