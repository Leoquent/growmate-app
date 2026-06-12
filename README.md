# 🥦 GrowMate

> Die letzte Grow-App, die ein Grower je brauchen wird – vom ersten Samen bis zur Ernte.

GrowMate ist eine **offline-first Cross-Platform-App** (iOS + Android via Capacitor) für Cannabis-Homegrower.
Alle Daten bleiben lokal auf dem Gerät: keine Accounts, keine Cloud, keine Werbung.

## Kernideen

| System | Beschreibung |
|---|---|
| 🥦 **Buddy** | Brokkoli-Tamagotchi mit 9 Pixel-Art-Evolutionsstufen (Ei → Erntereif) und 3 Emotionen. Seine Laune berechnet sich aus echten Daten: Gießstatus, offene Probleme, Düngeplan-Treue, Zeitplan. |
| 📓 **Journal** | Das Gedächtnis der App. Bewässerung (inkl. pH/EC/Dünger), Training, Umtopfen, Probleme, Notizen, Ernte – jeder Eintrag mit Phase + Wachstumstag gestempelt. |
| 🩺 **LeafDoc** | KI-Blattdoktor (3 TFLite-Modelle, 100 % on-device) aus [grow-guide-app](https://github.com/MarvinEis/grow-guide-app) integriert – **kontextsensitiv**: Das Journal (pH, Düngung, Gießintervall, Phase) fließt in die Diagnose ein. |
| 🚦 **Ampel** | Gieß-Status pro Run (grün→rot), substrat-, topf- und phasenabhängig berechnet. Lokale Push-Erinnerungen (sanft bei Gelb, dringend bei Rot). |
| 🧪 **Düngeschema** | Echte Herstellerschemata (Canna Terra/Coco, BioBizz, Plagron) mit ml/L-Rechner, Wochen-Highlight und automatischer Flush-Erkennung. |
| 📅 **Kalender** | Dynamischer Zeitplan: Phasenübergänge, Düngewochen, Trainingsfenster, Trichom-Check, Flush und Erntefenster – verschiebt sich automatisch mit. |

## Tech-Stack

- **Capacitor 8** – natives Shell für iOS/Android (Kamera, lokale Notifications, Haptics)
- **React 18 + TypeScript + Vite** – UI
- **Tailwind CSS 4** + eigene Design-Sprache („Pixel Organic", siehe [DESIGN.md](DESIGN.md))
- **Dexie (IndexedDB)** – lokale, reaktive Datenbank
- **TensorFlow.js + TFLite** (lokal gevendort in `public/vendor/`) – On-Device-KI
- Buddy-Sprites: Pixel-Matrizen → crisp SVG (kein Binär-Asset, themefähig)

## Entwicklung

```bash
npm install
npm run dev          # → http://localhost:5180
npm run build        # Type-Check + Produktions-Build nach dist/
```

## Android / iOS

```bash
npm run build
npx cap add android  # einmalig
npx cap sync
npx cap open android # Android Studio
```

iOS analog mit `npx cap add ios` (benötigt macOS/Xcode).

## Projektstruktur

```
src/
  buddy/        Pixel-Sprites, Renderer, Stufen-Logik
  components/   UI-Kit (Button, Card, Sheet, Ampel, BlockBar …)
  db/           Dexie-Schema, Typen, Seed-Daten, Repository
  domain/       Engines: Phasen, Bewässerung, Health, Dünger, Kalender, Empfehlungen
  features/     Screens: Onboarding, Dashboard, Run, Journal, Schema, LeafDoc, Kalender, Settings
  notify/       Lokale Push-Notifications (Ampelsystem)
public/
  models/       TFLite-Modelle (Top / Lower / Insects, je ~45 MB)
  vendor/       TF.js + TFLite-Runtime (offline)
```

## Datenschutz

Alle Daten ausschließlich lokal (IndexedDB). Optionaler PIN-Schutz.
Backup als AES-256-verschlüsselte Datei (Export/Import in den Einstellungen).
