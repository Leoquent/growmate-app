/* ===== LeafDoc Lösungsdatenbank & Label-Übersetzungen =====
 * Portiert aus grow-guide-app (main.js).
 */

export interface Solution {
  title: string;
  text: string;
  steps: string[];
}

export const SOLUTIONS: Record<string, Solution> = {
  nitrogen: {
    title: 'Stickstoffmangel (N)',
    text: 'Die unteren Blätter werden gleichmäßig gelb, während die Adern grün bleiben. Später vertrocknen sie.',
    steps: [
      'Überprüfe den pH-Wert (Erde: 6.0–7.0, Hydro: 5.5–6.5).',
      'Erhöhe die Stickstoff-Dosis im Dünger (Wuchsdünger).',
      'Verwende ggf. Brennnessel-Jauche für einen schnellen Boost.',
    ],
  },
  'n tox.': {
    title: 'Stickstoff-Überschuss',
    text: 'Blätter sind extrem dunkelgrün und krümmen sich nach unten („Adlerkralle").',
    steps: [
      'Reduziere die Düngerkonzentration sofort.',
      'Spüle das Substrat mit klarem, pH-reguliertem Wasser (Flushing).',
      'Überprüfe, ob der EC-Wert zu hoch ist.',
    ],
  },
  potassium: {
    title: 'Kaliummangel (K)',
    text: 'Blattränder verfärben sich braun/gelb und sehen „verbrannt" aus. Oft eingerollte Spitzen.',
    steps: [
      'pH-Wert kontrollieren (Kalium-Lockout bei niedrigem pH).',
      'Kaliumreichen Blütendünger oder PK 13/14 verwenden.',
      'Bei organischem Anbau: Holzasche oder Algenextrakt nutzen.',
    ],
  },
  phosphor: {
    title: 'Phosphormangel (P)',
    text: 'Blätter zeigen dunkelgrüne bis blau-violette Flecken. Wachstum stagniert.',
    steps: [
      'Temperatur prüfen (P-Aufnahme stoppt unter 15 °C).',
      'pH-Wert optimieren (P wird oft bei falschem pH blockiert).',
      'Phosphor-betonten Dünger (Blühdünger) verwenden.',
    ],
  },
  magnesium: {
    title: 'Magnesiummangel (Mg)',
    text: 'Gelbe Flecken zwischen den Adern bei mittleren/unteren Blättern. Adern bleiben grün.',
    steps: [
      'Bittersalz (Epsom Salt) im Gießwasser auflösen.',
      'Blattdüngung mit schwacher Bittersalz-Lösung für schnelle Hilfe.',
      'pH-Wert prüfen (Magnesium wird bei zu saurem Boden blockiert).',
    ],
  },
  iron: {
    title: 'Eisenmangel (Fe)',
    text: 'Junge Blätter (oben) werden hellgelb bis weißlich. Adern bleiben grün.',
    steps: [
      'pH-Wert senken! Eisenmangel liegt fast immer an zu hohem pH-Wert (>7.0).',
      'Verwende Eisenchelat für eine schnelle Korrektur.',
      'Gießwasser entkalken, falls es zu hart ist.',
    ],
  },
  calcium: {
    title: 'Calciummangel (Ca)',
    text: 'Kleine braune/gelbe Punkte auf jungen Blättern. Verkrüppeltes Neuwachstum.',
    steps: [
      'CalMag-Präparat hinzufügen.',
      'pH-Wert stabilisieren.',
      'Leitungswasseranteil erhöhen, falls Osmosewasser genutzt wird.',
    ],
  },
  mites: {
    title: 'Spinnmilben',
    text: 'Winzige weiße Punkte auf der Blattoberseite. Feine Gespinste in den Blüten.',
    steps: [
      'Luftfeuchtigkeit erhöhen (Milben hassen Feuchtigkeit).',
      'Nützlinge wie Raubmilben aussetzen.',
      'Blattunterseiten mit Neemöl oder Schmierseife behandeln.',
    ],
  },
  thrip: {
    title: 'Thripse',
    text: 'Silberne, glänzende Flecken auf den Blättern. Kleine schwarze Kotpünktchen.',
    steps: [
      'Blautafeln aufhängen.',
      'Raubmilben oder Florfliegenlarven einsetzen.',
      'Pflanze vorsichtig abduschen.',
    ],
  },
  healthy: {
    title: 'Gesunde Pflanze',
    text: 'Deine Pflanze sieht vital aus. Achte weiterhin auf konstante Umweltbedingungen.',
    steps: [
      'Behalte das aktuelle Düngeschema bei.',
      'Prüfe regelmäßig pH- und EC-Werte.',
      'Sorge für gute Umluft.',
    ],
  },
  misc: {
    title: 'Sonstiges / Unbekannt',
    text: 'Das Modell erkennt Unregelmäßigkeiten, kann sie aber nicht eindeutig zuordnen.',
    steps: [
      'Überprüfe die gesamte Umgebung (Licht, Luft, Wasser).',
      'Achte auf Schimmelbildung.',
      'Vergleiche die Symptome mit dem Journal der letzten Wochen.',
    ],
  },
};

export const LABEL_DE: Record<string, string> = {
  calcium: 'Calcium-Mangel',
  misc: 'Sonstiges / Unbekannt',
  copper: 'Kupfermangel',
  healthy: 'Gesund',
  iron: 'Eisenmangel',
  lightburn: 'Lichtbrand',
  magnesium: 'Magnesiummangel',
  manganese: 'Manganmangel',
  mites: 'Spinnmilben',
  'n tox.': 'Stickstoff-Überschuss',
  nitrogen: 'Stickstoffmangel',
  nuteburn: 'Überdüngung',
  phosphor: 'Phosphormangel',
  potassium: 'Kaliummangel',
  septoria: 'Blattfleckenkrankheit',
  sulfur: 'Schwefelmangel',
  thrip: 'Thripse',
  zinc: 'Zinkmangel',
};

export function translateLabel(label: string): string {
  return LABEL_DE[label.toLowerCase()] ?? label;
}
