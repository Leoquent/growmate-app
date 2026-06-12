# GrowMate Design Language — „Pixel Organic"

> Modern, dynamisch, zugänglich — mit einem bewussten Hauch Retro-Pixel.
> Buddy ist Pixel-Art. Die App drumherum ist weich, dunkel und ruhig.
> Der Kontrast zwischen beidem ist das Markenzeichen.

## 1. Prinzipien

1. **Dark-first.** Growrooms sind dunkel, Grower checken ihre App oft nachts neben dem Zelt. Tiefes Grün-Schwarz statt reinem Schwarz, damit Flächen organisch wirken.
2. **Organisch + Pixel.** Flächen, Karten und Typografie sind modern und weich (Radius 12–16 px). Alles, was *lebt* (Buddy, Fortschritt, Status), ist pixelig: Sprites, Block-Progressbars, gestufte Rahmen (`pixel-frame`).
3. **Ampel ist heilig.** Die vier Statusfarben (Grün/Gelb/Orange/Rot) werden NUR für Bewässerungs-/Gesundheitsstatus verwendet, nie dekorativ.
4. **Eine Aktion pro Screen im Fokus.** Primär-Button ist Lime (`--accent`), maximal einer pro Ansicht.
5. **Zugänglich.** Kontrast ≥ AA, Touch-Targets ≥ 48 px, Fokus-Ringe sichtbar, `prefers-reduced-motion` respektiert, jeder Fachbegriff hat ein ⓘ mit Erklärung (Anfänger-Modus).
6. **Motion = Leben.** Buddy bobbt (2.4 s Loop), Trichome glitzern, Karten poppen mit 180 ms `ease-out` ein. Nichts blinkt, nichts dreht sich grundlos.

## 2. Farb-Tokens (Dark Theme = Default)

| Token | Wert | Verwendung |
|---|---|---|
| `--bg0` | `#0C110D` | App-Hintergrund |
| `--bg1` | `#121A14` | Flächen, TabBar |
| `--bg2` | `#1A241C` | Karten |
| `--bg3` | `#243126` | Hover/Erhöht/Inputs |
| `--line` | `#2D3B2F` | Hairline-Borders |
| `--ink` | `#E9F2E6` | Primärtext |
| `--ink-dim` | `#A3B5A4` | Sekundärtext |
| `--ink-faint`| `#6B7E6D` | Tertiär/Placeholder |
| `--accent` | `#9BE15D` | Primär-Aktion, Brand-Lime |
| `--accent-ink`| `#10240A` | Text auf Accent |
| `--leaf` | `#4CAF50` | Sekundärgrün, Erfolg |
| `--water` | `#6EC8FF` | Bewässerung |
| `--nute` | `#C39BFF` | Düngung |
| `--train` | `#FFB86B` | Training |
| `--issue` | `#FF8FA3` | Probleme |
| `--st-green` | `#58D68D` | Ampel grün |
| `--st-yellow`| `#FFD23F` | Ampel gelb |
| `--st-orange`| `#FF9447` | Ampel orange |
| `--st-red` | `#FF5C5C` | Ampel rot |

Jeder Journal-Eintragstyp hat seine feste Farbe (Wasser-Blau, Dünger-Lila, Training-Orange, Problem-Rosa) → sofortige Wiedererkennung in Listen & Kalender.

## 3. Typografie

- **Stack:** `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` — nativ, schnell, offline.
- **Pixel-Label** (`.px-label`): Uppercase, 11 px, Letterspacing 0.14em, `--ink-dim`. Für Sektions-Header, Stats, Buddy-Stufennamen. Ersetzt eine Pixel-Font ohne Lesbarkeitsverlust.
- Größen: Display 28/Bold · Titel 20/Bold · Body 15/Regular · Caption 13 · Micro 11.

## 4. Pixel-Bausteine

- **`.pixel-frame`** — gestufte Ecken via `clip-path` (4 px Notch). Für Buddy-Karten und Hero-Elemente.
- **Block-Progress** (`<BlockBar/>`) — Fortschritt als diskrete Pixel-Blöcke statt glatter Leiste.
- **Buddy-Sprites** — 22×22-Pixelraster als SVG (`shape-rendering: crispEdges`), skaliert ohne Weichzeichnung.
- **Ampel-Dot** — 12 px Quadrat (nicht Kreis!) mit 2 px Versatz-Schatten → Pixel-Look.

## 5. Komponenten-Regeln

- **Card:** `--bg2`, Radius 16, Border `--line`, Padding 16. Tappable Cards skalieren auf `active` auf 0.98.
- **Button:** Höhe 48, Radius 14. Primär = Accent-Fill, Sekundär = `--bg3` + Border, Ghost = transparent. Destruktiv = `--st-red` Outline.
- **Sheet (Bottom-Sheet):** Für alle Log-Aktionen. Handle-Bar oben, Radius 24 oben, dimmt Hintergrund 60 %.
- **Chip:** Radius voll, 32 px hoch, für Filter & Auswahl (z. B. Trainingsart).
- **InfoTip (ⓘ):** Im Anfänger-Modus hinter jedem Fachbegriff; öffnet Mini-Sheet mit Erklärung. Im Profi-Modus ausgeblendet (Begriff bleibt).

## 6. Stimme & Sprache

- Deutsch, du-Form, warm aber präzise. Buddy spricht nie selbst — die App spricht *über* ihn („Buddy hat Durst").
- Anfänger-Modus: kurze Erklärsätze unter jedem Eingabefeld. Profi-Modus: nur Labels.
- Warnungen konkret + handlungsorientiert: „Letzte Bewässerung vor 4 Tagen – bei Coco empfehlen wir täglich."

## 7. Motion-Spezifikation

| Animation | Dauer | Easing | Einsatz |
|---|---|---|---|
| `bob` | 2.4 s loop | ease-in-out | Buddy idle |
| `pop-in` | 180 ms | cubic-bezier(.2,.9,.3,1.2) | Karten, Sheets |
| `sparkle` | 1.8 s loop | steps(2) | Trichom-Pixel ab Mid Flower |
| `celebrate` | 1.2 s | ease-out | Ernte-Abschluss (Pixel-Konfetti) |
| `pulse-soft` | 2 s loop | ease-in-out | Rote Ampel (dringend) |

`prefers-reduced-motion: reduce` → alle Loops aus, nur Opacity-Fades.
