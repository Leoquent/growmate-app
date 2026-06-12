import type { NutrientLine, ScheduleRow, Strain, Substrate } from './types';

/* ===== Seed-Daten =====
 * Erweiterbar ohne Code-Änderung: Die Daten liegen nach dem ersten Start in der
 * lokalen DB; neue Strains/Dünger können als Datensätze ergänzt werden.
 * Canna-Werte stammen aus dem LeafDoc-Repo (dort ml/10L → hier ml/L).
 */

export const SEED_VERSION = 2;

/** Kompakter Strain-Builder für die Seed-Liste */
function strain(
  id: string, name: string, breeder: string, kind: Strain['kind'], ft: Strain['floweringType'],
  veg: [number, number], flower: [number, number], yieldDesc: string, potSizeL: number,
  difficulty: Strain['difficulty'], notes: string,
): Strain {
  return {
    id, name, breeder, kind, floweringType: ft, vegWeeks: veg, flowerWeeks: flower,
    yieldDesc, potSizeL,
    substrateHint: ft === 'auto' ? 'Leicht gedüngte Erde oder Coco' : 'Erde oder Coco',
    lightHint: ft === 'auto' ? 'LED, 20/4 durchgehend' : 'LED 250–400 W, 18/6 → 12/12',
    difficulty, notes,
  };
}

/* Top-5-Breeder mit je 5 bekannten Strains (+ OG Kush als Legacy-Eintrag) */
export const SEED_STRAINS: Strain[] = [
  // ---- Royal Queen Seeds ----
  strain('strain-white-widow', 'White Widow', 'Royal Queen Seeds', 'hybrid', 'photo', [4, 6], [8, 9],
    '450–500 g/m²', 11, 'anfaenger',
    'Der Klassiker für den ersten Grow: fehlerverzeihend, kompakt, harzig. Verträgt Topping und LST gut.'),
  strain('strain-rqs-royal-gorilla', 'Royal Gorilla', 'Royal Queen Seeds', 'hybrid', 'photo', [4, 6], [9, 10],
    '500–550 g/m²', 11, 'mittel',
    'Extrem harzig und potent. Braucht stabile Werte – belohnt saubere Arbeit mit Top-Qualität.'),
  strain('strain-amnesia-haze', 'Amnesia Haze', 'Royal Queen Seeds', 'sativa', 'photo', [4, 6], [10, 12],
    '550–650 g/m²', 15, 'fortgeschritten',
    'Sativa mit langer Blüte und starkem Stretch. SCROG hilft, die Höhe zu kontrollieren. Geduld zahlt sich aus.'),
  strain('strain-rqs-northern-light', 'Northern Light', 'Royal Queen Seeds', 'indica', 'photo', [4, 6], [7, 8],
    '450–500 g/m²', 11, 'anfaenger',
    'Pflegeleichte Indica mit kurzer Blüte, kompakt und geruchsarm – ideal für kleine Zelte.'),
  strain('strain-rqs-quick-one', 'Quick One', 'Royal Queen Seeds', 'hybrid', 'auto', [2, 3], [5, 6],
    '275–325 g/m² – dafür rasend schnell', 11, 'anfaenger',
    'Eine der schnellsten Autos überhaupt: von Samen bis Ernte in ~9 Wochen. Perfekt für den ersten Versuch.'),

  // ---- FastBuds ----
  strain('strain-gorilla-glue-auto', 'Gorilla Glue #4 Auto', 'FastBuds', 'hybrid', 'auto', [3, 4], [6, 7],
    'bis 600 g/m² – sehr hoher Ertrag', 12, 'mittel',
    'Blüht automatisch nach ~4 Wochen. Direkt in den Endtopf – Autos mögen kein Umtopfen. Nur sanftes LST, kein Topping.'),
  strain('strain-fb-gsc-auto', 'Girl Scout Cookies Auto', 'FastBuds', 'hybrid', 'auto', [3, 4], [6, 7],
    '450–550 g/m²', 12, 'mittel',
    'Dessert-Terpene und violette Töne bei kühlen Nächten. Mag moderate Düngung.'),
  strain('strain-fb-zkittlez-auto', 'Zkittlez Auto', 'FastBuds', 'indica', 'auto', [3, 4], [6, 7],
    '450–500 g/m²', 12, 'anfaenger',
    'Süß, kompakt, unkompliziert – eine der fehlerverzeihendsten Autos von FastBuds.'),
  strain('strain-fb-wedding-cheesecake', 'Wedding Cheesecake Auto', 'FastBuds', 'hybrid', 'auto', [3, 4], [6, 7],
    '450–550 g/m²', 12, 'mittel',
    'Kräftiger Wuchs mit dichten Buds. Profitiert von leichtem LST in Woche 2–3.'),
  strain('strain-fb-blackberry-auto', 'Blackberry Auto', 'FastBuds', 'indica', 'auto', [3, 4], [7, 8],
    '400–500 g/m²', 12, 'mittel',
    'Dunkelviolette Farben und Beeren-Aroma. Etwas längere Blüte als andere Autos.'),

  // ---- Barney's Farm ----
  strain('strain-bf-wedding-cake', 'Wedding Cake', "Barney's Farm", 'indica', 'photo', [4, 6], [8, 9],
    '600–650 g/m²', 11, 'mittel',
    'Dichte, harzige Buds mit Vanille-Note. Gute Schimmelresistenz dank kompakter Struktur – trotzdem auf Luftfeuchte achten.'),
  strain('strain-bf-gorilla-zkittlez', 'Gorilla Zkittlez', "Barney's Farm", 'hybrid', 'photo', [4, 6], [8, 10],
    '600–700 g/m²', 11, 'mittel',
    'Ertragsmonster mit Candy-Terpenen. Braucht Stützen in der späten Blüte – die Buds werden schwer.'),
  strain('strain-bf-blue-gelato', 'Blue Gelato 41', "Barney's Farm", 'hybrid', 'photo', [4, 6], [9, 10],
    '600–700 g/m²', 15, 'fortgeschritten',
    'Starker Stretch und hoher Nährstoffhunger. Für erfahrene Grower mit Platz nach oben.'),
  strain('strain-bf-critical-kush', 'Critical Kush', "Barney's Farm", 'indica', 'photo', [4, 5], [8, 9],
    '650 g/m²', 11, 'anfaenger',
    'Schnell, ertragreich, robust – ein Arbeitstier. Starker Geruch in der Blüte, Aktivkohlefilter Pflicht.'),
  strain('strain-bf-runtz-muffin', 'Runtz Muffin', "Barney's Farm", 'hybrid', 'photo', [4, 6], [8, 9],
    '600–700 g/m²', 11, 'mittel',
    'Moderne Dessert-Genetik mit kräftigen Farben. Verträgt Training aller Art sehr gut.'),

  // ---- Sensi Seeds ----
  strain('strain-ss-skunk1', 'Skunk #1', 'Sensi Seeds', 'hybrid', 'photo', [4, 5], [7, 8],
    '450–500 g/m²', 11, 'anfaenger',
    'DIE Legende: Seit den 80ern der Maßstab für Stabilität. Verzeiht fast jeden Anfängerfehler.'),
  strain('strain-ss-northern-lights', 'Northern Lights', 'Sensi Seeds', 'indica', 'photo', [4, 6], [7, 8],
    '500–550 g/m²', 11, 'anfaenger',
    'Das Original von Sensi: kompakt, schnell, geruchsarm. Seit Jahrzehnten bewährt.'),
  strain('strain-ss-jack-herer', 'Jack Herer', 'Sensi Seeds', 'sativa', 'photo', [4, 6], [9, 10],
    '500–600 g/m²', 15, 'mittel',
    'Preisgekrönte Sativa-Genetik. Streckt sich stark – früh toppen und Platz einplanen.'),
  strain('strain-ss-big-bud', 'Big Bud', 'Sensi Seeds', 'indica', 'photo', [4, 6], [8, 9],
    '600+ g/m²', 11, 'mittel',
    'Der Name ist Programm: riesige Buds, die in der späten Blüte gestützt werden müssen.'),
  strain('strain-ss-super-skunk', 'Super Skunk', 'Sensi Seeds', 'indica', 'photo', [4, 5], [7, 8],
    '500–550 g/m²', 11, 'anfaenger',
    'Skunk #1 mit mehr Power. Schnell, zuverlässig, intensiv im Geruch.'),

  // ---- Dutch Passion ----
  strain('strain-dp-auto-mazar', 'Auto Mazar', 'Dutch Passion', 'indica', 'auto', [3, 4], [7, 8],
    '400–500 g/m²', 12, 'anfaenger',
    'Robuste Afghan-Genetik als Auto. Übersteht auch suboptimale Bedingungen klaglos.'),
  strain('strain-dp-blueberry', 'Blueberry', 'Dutch Passion', 'indica', 'photo', [4, 6], [8, 9],
    '400–500 g/m²', 11, 'mittel',
    'Klassiker mit Beerenaroma und blauen Tönen bei kühlen Nächten. Mag keine Überdüngung.'),
  strain('strain-dp-power-plant', 'Power Plant', 'Dutch Passion', 'sativa', 'photo', [4, 5], [8, 9],
    '500–600 g/m²', 11, 'anfaenger',
    'Südafrikanische Sativa: schnell für eine Sativa, einheitlich, ertragreich.'),
  strain('strain-dp-orange-bud', 'Orange Bud', 'Dutch Passion', 'hybrid', 'photo', [4, 5], [8, 9],
    '450–500 g/m²', 11, 'anfaenger',
    'Zitrus-Skunk aus den 80ern. Unkompliziert und aromatisch – ein unterschätzter Klassiker.'),
  strain('strain-dp-auto-ultimate', 'Auto Ultimate', 'Dutch Passion', 'hybrid', 'auto', [3, 4], [8, 9],
    'bis 650 g/m² – XXL-Auto', 15, 'mittel',
    'Eine der ertragreichsten Autos am Markt. Braucht etwas länger, füllt dafür das Zelt.'),

  // ---- Legacy ----
  strain('strain-og-kush', 'OG Kush', 'Humboldt Seeds', 'indica', 'photo', [4, 6], [8, 9],
    '400–550 g/m²', 11, 'mittel',
    'Indica-dominant, buschiger Wuchs. Reagiert stark auf Defoliation. Lieber 80 % des Düngeschemas.'),
];

export const SEED_SUBSTRATES: Substrate[] = [
  {
    id: 'sub-biobizz-light',
    name: 'Light Mix',
    brand: 'BioBizz',
    class: 'soil',
    baseWateringIntervalDays: 3,
    phRange: [6.2, 6.8],
    ecHint: 'Leicht vorgedüngt (~1–2 Wochen Puffer). Ideal für volle Kontrolle.',
    description: 'Leicht gedüngte Erde – du steuerst die Nährstoffe von Anfang an selbst. Beste Wahl für Anfänger mit BioBizz-Düngern.',
  },
  {
    id: 'sub-biobizz-all',
    name: 'All Mix',
    brand: 'BioBizz',
    class: 'soil',
    baseWateringIntervalDays: 3,
    phRange: [6.2, 6.8],
    ecHint: 'Stark vorgedüngt – erste 3 Wochen NICHT düngen!',
    description: 'Kräftig vorgedüngte Erde. Sämlinge können „verbrennen" – erst ab Woche 3–4 zufüttern.',
  },
  {
    id: 'sub-canna-terra',
    name: 'Terra Professional',
    brand: 'Canna',
    class: 'soil',
    baseWateringIntervalDays: 3,
    phRange: [6.0, 6.8],
    ecHint: 'Vorgedüngt für ~1 Woche.',
    description: 'Hochwertige Torferde, abgestimmt auf die Canna-Terra-Düngelinie.',
  },
  {
    id: 'sub-coco',
    name: 'Coco Coir',
    brand: 'Canna / generisch',
    class: 'coco',
    baseWateringIntervalDays: 1,
    phRange: [5.5, 6.1],
    ecHint: 'Ungedüngt – ab Tag 1 düngen (inkl. CalMag). Täglich gießen.',
    description: 'Kokosfaser: schnelles Wachstum, aber tägliche Bewässerung mit Dünger nötig. Trocknet sehr schnell aus.',
  },
  {
    id: 'sub-rockwool',
    name: 'Steinwolle',
    brand: 'Grodan',
    class: 'rockwool',
    baseWateringIntervalDays: 1,
    phRange: [5.5, 6.0],
    ecHint: 'Vor Nutzung auf pH 5.5 einweichen.',
    description: 'Inertes Substrat für Hydro-Setups. Volle Nährstoffkontrolle, nichts für den ersten Grow.',
  },
  {
    id: 'sub-hydro',
    name: 'Blähton (Hydro)',
    brand: 'generisch',
    class: 'hydro',
    baseWateringIntervalDays: 1,
    phRange: [5.5, 6.0],
    ecHint: 'Nährlösung permanent, EC täglich prüfen.',
    description: 'Aktives Hydrosystem: maximales Wachstum, maximale Verantwortung. Pumpenausfall = Notfall.',
  },
  {
    id: 'sub-plagron-grow',
    name: 'Grow Mix',
    brand: 'Plagron',
    class: 'soil',
    baseWateringIntervalDays: 3,
    phRange: [6.0, 6.8],
    ecHint: 'Vorgedüngt für ~3 Wochen – erst danach zufüttern.',
    description: 'Kräftig vorgedüngte Erde von Plagron. Die ersten Wochen reicht klares Wasser.',
  },
  {
    id: 'sub-aero',
    name: 'Aeroponik',
    brand: 'generisch',
    class: 'aero',
    baseWateringIntervalDays: 1,
    phRange: [5.5, 6.0],
    ecHint: 'Wurzeln hängen in Sprühnebel – pH/EC täglich prüfen.',
    description: 'High-Tech ohne Substrat: Wurzeln werden mit Nährlösung besprüht. Schnellstes Wachstum, null Fehlertoleranz bei Stromausfall.',
  },
];

/* ---- Düngelinien ---- */

const cannaTerraRows: ScheduleRow[] = [
  { id: 'ct-start', label: 'Start / Bewurzelung', desc: 'Sämling – Substrat befeuchten', phase: 'seedling', weekFrom: 1, weekTo: null, cells: { vega: 2.5, rhizo: 4 }, ecPlus: 0.7, lightHours: '18' },
  { id: 'ct-veg1', label: 'Vegetative Phase I', desc: 'Die Pflanze entwickelt sich im Wachstum', phase: 'veg', weekFrom: 1, weekTo: 3, cells: { vega: 4.5, rhizo: 2, zym: 2.5 }, ecPlus: 1.1, lightHours: '18' },
  { id: 'ct-veg2', label: 'Vegetative Phase II', desc: 'Bis zum Wachstumsstillstand', phase: 'veg', weekFrom: 4, weekTo: null, cells: { vega: 4.5, rhizo: 2, zym: 2.5, boost: [2, 4] }, ecPlus: 1.3, lightHours: '18' },
  { id: 'ct-gen1', label: 'Generative Phase I', desc: 'Längenwachstum der Blütenstände (Stretch)', phase: 'flower', weekFrom: 1, weekTo: 3, cells: { flores: 5.5, rhizo: 0.5, zym: 2.5, boost: [2, 4] }, ecPlus: 1.5, lightHours: '12' },
  { id: 'ct-gen2', label: 'Generative Phase II', desc: 'Blüten werden kompakter – PK-Boost', phase: 'flower', weekFrom: 4, weekTo: 4, cells: { flores: 5.5, rhizo: 0.5, zym: 2.5, pk: 1.5, boost: [2, 4] }, ecPlus: 1.7, lightHours: '12' },
  { id: 'ct-gen3', label: 'Generative Phase III', desc: 'Blüten werden schwerer', phase: 'flower', weekFrom: 5, weekTo: null, cells: { flores: 4.5, rhizo: 0.5, zym: 2.5, boost: [2, 4] }, ecPlus: 1.1, lightHours: '12' },
  { id: 'ct-gen4', label: 'Abreifung', desc: 'Blüten reifen aus – kein Basisdünger mehr', phase: 'flower', weekFrom: 1, weekTo: null, fromEnd: 2, cells: { zym: [2.5, 5], boost: [2, 4] }, ecPlus: 0, lightHours: '12' },
  { id: 'ct-flush', label: 'Flush – nur Wasser', desc: 'Substrat mit klarem Wasser spülen für sauberen Geschmack', phase: 'flower', weekFrom: 1, weekTo: null, fromEnd: 1, cells: {}, ecPlus: 0, lightHours: '12', isFlush: true },
];

const cannaCocoRows: ScheduleRow[] = [
  { id: 'cc-start', label: 'Start / Bewurzelung', desc: 'Sämling – Substrat befeuchten', phase: 'seedling', weekFrom: 1, weekTo: null, cells: { coco: 1.5, rhizo: 4 }, ecPlus: 1.0, lightHours: '18' },
  { id: 'cc-veg1', label: 'Vegetative Phase I', desc: 'Die Pflanze entwickelt sich im Wachstum', phase: 'veg', weekFrom: 1, weekTo: 3, cells: { coco: 2, rhizo: 2, zym: 2.5 }, ecPlus: 1.2, lightHours: '18' },
  { id: 'cc-veg2', label: 'Vegetative Phase II', desc: 'Bis zum Wachstumsstillstand', phase: 'veg', weekFrom: 4, weekTo: null, cells: { coco: 2.5, rhizo: 2, zym: 2.5, boost: [2, 4] }, ecPlus: 1.5, lightHours: '18' },
  { id: 'cc-gen1', label: 'Generative Phase I', desc: 'Stretch – Längenwachstum der Blüten', phase: 'flower', weekFrom: 1, weekTo: 3, cells: { coco: 3, rhizo: 0.5, zym: 2.5, boost: [2, 4] }, ecPlus: 1.7, lightHours: '12' },
  { id: 'cc-gen2', label: 'Generative Phase II', desc: 'Blüten werden kompakter – PK-Boost', phase: 'flower', weekFrom: 4, weekTo: 4, cells: { coco: 3, rhizo: 0.5, zym: 2.5, pk: 1.5, boost: [2, 4] }, ecPlus: 1.9, lightHours: '12' },
  { id: 'cc-gen3', label: 'Generative Phase III', desc: 'Blüten werden schwerer', phase: 'flower', weekFrom: 5, weekTo: null, cells: { coco: 2.5, rhizo: 0.5, zym: 2.5, boost: [2, 4] }, ecPlus: 1.3, lightHours: '12' },
  { id: 'cc-gen4', label: 'Abreifung', desc: 'Kein Basisdünger mehr', phase: 'flower', weekFrom: 1, weekTo: null, fromEnd: 2, cells: { zym: [2.5, 5], boost: [2, 4] }, ecPlus: 0, lightHours: '12' },
  { id: 'cc-flush', label: 'Flush – nur Wasser', desc: 'Mit klarem, pH-reguliertem Wasser spülen', phase: 'flower', weekFrom: 1, weekTo: null, fromEnd: 1, cells: {}, ecPlus: 0, lightHours: '12', isFlush: true },
];

const biobizzRows: ScheduleRow[] = [
  { id: 'bb-seed', label: 'Sämling', desc: 'Nur Wurzelstimulator', phase: 'seedling', weekFrom: 1, weekTo: null, cells: { rootjuice: 4 } },
  { id: 'bb-veg', label: 'Wachstum', desc: 'Organisches Wachstum', phase: 'veg', weekFrom: 1, weekTo: null, cells: { grow: 2, rootjuice: 2 } },
  { id: 'bb-f1', label: 'Blüte Woche 1', desc: 'Umstellung auf Blüte', phase: 'flower', weekFrom: 1, weekTo: 1, cells: { grow: 2, bloom: 1, topmax: 1 } },
  { id: 'bb-f2', label: 'Blüte Woche 2', desc: 'Blütenansatz', phase: 'flower', weekFrom: 2, weekTo: 2, cells: { grow: 2, bloom: 2, topmax: 1 } },
  { id: 'bb-f3', label: 'Blüte Hauptphase', desc: 'Blütenaufbau', phase: 'flower', weekFrom: 3, weekTo: null, cells: { grow: 2, bloom: 3, topmax: 1 } },
  { id: 'bb-late', label: 'Späte Blüte', desc: 'Reifephase – kein Grow mehr', phase: 'flower', weekFrom: 1, weekTo: null, fromEnd: 2, cells: { bloom: 4, topmax: 4 } },
  { id: 'bb-flush', label: 'Flush – nur Wasser', desc: 'Letzte Woche nur klares Wasser', phase: 'flower', weekFrom: 1, weekTo: null, fromEnd: 1, cells: {}, isFlush: true },
];

const plagronRows: ScheduleRow[] = [
  { id: 'pl-seed', label: 'Sämling', desc: 'Sanfter Start', phase: 'seedling', weekFrom: 1, weekTo: null, cells: { algagrow: 1 } },
  { id: 'pl-veg', label: 'Wachstum', desc: 'Vegetatives Wachstum', phase: 'veg', weekFrom: 1, weekTo: null, cells: { algagrow: 2.5 } },
  { id: 'pl-f1', label: 'Frühe Blüte', desc: 'Umstellung auf Bloom', phase: 'flower', weekFrom: 1, weekTo: 3, cells: { algabloom: 2.5 } },
  { id: 'pl-f2', label: 'Hauptblüte', desc: 'Mit Blütenbooster', phase: 'flower', weekFrom: 4, weekTo: null, cells: { algabloom: 2.5, greensensation: 1 } },
  { id: 'pl-flush', label: 'Flush – nur Wasser', desc: 'Letzte Woche nur klares Wasser', phase: 'flower', weekFrom: 1, weekTo: null, fromEnd: 1, cells: {}, isFlush: true },
];

const hesiRows: ScheduleRow[] = [
  { id: 'he-seed', label: 'Sämling', desc: 'Wurzelaufbau', phase: 'seedling', weekFrom: 1, weekTo: null, cells: { wurzel: 2.5 } },
  { id: 'he-veg', label: 'Wachstum', desc: 'TNT Complex für kräftige Veg', phase: 'veg', weekFrom: 1, weekTo: null, cells: { tnt: 5, wurzel: 1 } },
  { id: 'he-f1', label: 'Frühe Blüte', desc: 'Umstellung auf Blüh Complex', phase: 'flower', weekFrom: 1, weekTo: 2, cells: { blueh: 5 } },
  { id: 'he-f2', label: 'Hauptblüte', desc: 'Mit Phosphor Plus', phase: 'flower', weekFrom: 3, weekTo: null, cells: { blueh: 5, phosphor: 1.3 } },
  { id: 'he-late', label: 'Späte Blüte', desc: 'Boost für die Reife', phase: 'flower', weekFrom: 1, weekTo: null, fromEnd: 2, cells: { blueh: 4, boost: 2 } },
  { id: 'he-flush', label: 'Flush – nur Wasser', desc: 'Letzte Woche nur klares Wasser', phase: 'flower', weekFrom: 1, weekTo: null, fromEnd: 1, cells: {}, isFlush: true },
];

const gheRows: ScheduleRow[] = [
  { id: 'ghe-seed', label: 'Sämling / Stecklinge', desc: 'Sanfte Vollversorgung', phase: 'seedling', weekFrom: 1, weekTo: null, cells: { gro: 0.5, micro: 0.5, bloom: 0.5 }, ecPlus: 0.4 },
  { id: 'ghe-veg', label: 'Wachstum', desc: 'Gro-betonte Mischung', phase: 'veg', weekFrom: 1, weekTo: null, cells: { gro: 1.5, micro: 1, bloom: 0.5 }, ecPlus: 1.2 },
  { id: 'ghe-f1', label: 'Blüte', desc: 'Bloom-betonte Mischung', phase: 'flower', weekFrom: 1, weekTo: null, cells: { gro: 0.5, micro: 1, bloom: 1.5 }, ecPlus: 1.6 },
  { id: 'ghe-late', label: 'Späte Blüte', desc: 'Reifephase', phase: 'flower', weekFrom: 1, weekTo: null, fromEnd: 2, cells: { micro: 1, bloom: 2 }, ecPlus: 1.3 },
  { id: 'ghe-flush', label: 'Flush – nur Wasser', desc: 'System mit klarem Wasser spülen', phase: 'flower', weekFrom: 1, weekTo: null, fromEnd: 1, cells: {}, isFlush: true },
];

export const SEED_NUTRIENT_LINES: NutrientLine[] = [
  {
    id: 'nl-canna-terra',
    brand: 'Canna',
    name: 'Terra (Erde)',
    substrates: ['soil'],
    products: [
      { id: 'vega', name: 'Terra Vega', type: 'base' },
      { id: 'flores', name: 'Terra Flores', type: 'base' },
      { id: 'rhizo', name: 'Rhizotonic', type: 'root' },
      { id: 'zym', name: 'Cannazym', type: 'additive' },
      { id: 'pk', name: 'PK 13/14', type: 'booster' },
      { id: 'boost', name: 'Cannaboost', type: 'booster' },
    ],
    rows: cannaTerraRows,
  },
  {
    id: 'nl-canna-coco',
    brand: 'Canna',
    name: 'Coco A+B',
    substrates: ['coco'],
    products: [
      { id: 'coco', name: 'Coco A + B', type: 'base' },
      { id: 'rhizo', name: 'Rhizotonic', type: 'root' },
      { id: 'zym', name: 'Cannazym', type: 'additive' },
      { id: 'pk', name: 'PK 13/14', type: 'booster' },
      { id: 'boost', name: 'Cannaboost', type: 'booster' },
    ],
    rows: cannaCocoRows,
  },
  {
    id: 'nl-biobizz',
    brand: 'BioBizz',
    name: 'Organic (Erde)',
    substrates: ['soil'],
    products: [
      { id: 'rootjuice', name: 'Root·Juice', type: 'root' },
      { id: 'grow', name: 'Bio·Grow', type: 'base' },
      { id: 'bloom', name: 'Bio·Bloom', type: 'base' },
      { id: 'topmax', name: 'Top·Max', type: 'booster' },
    ],
    rows: biobizzRows,
  },
  {
    id: 'nl-plagron',
    brand: 'Plagron',
    name: 'Alga 100% Natural',
    substrates: ['soil'],
    products: [
      { id: 'algagrow', name: 'Alga Grow', type: 'base' },
      { id: 'algabloom', name: 'Alga Bloom', type: 'base' },
      { id: 'greensensation', name: 'Green Sensation', type: 'booster' },
    ],
    rows: plagronRows,
  },
  {
    id: 'nl-hesi',
    brand: 'Hesi',
    name: 'Erd-Linie',
    substrates: ['soil'],
    products: [
      { id: 'wurzel', name: 'Wurzel-Complex', type: 'root' },
      { id: 'tnt', name: 'TNT Complex', type: 'base' },
      { id: 'blueh', name: 'Blüh Complex', type: 'base' },
      { id: 'phosphor', name: 'Phosphor Plus', type: 'booster' },
      { id: 'boost', name: 'Hesi Boost', type: 'booster' },
    ],
    rows: hesiRows,
  },
  {
    id: 'nl-ghe-tripart',
    brand: 'GHE / Terra Aquatica',
    name: 'TriPart (Flora-Serie)',
    substrates: ['hydro', 'coco', 'rockwool', 'aero'],
    products: [
      { id: 'gro', name: 'TriPart Gro', type: 'base' },
      { id: 'micro', name: 'TriPart Micro', type: 'base' },
      { id: 'bloom', name: 'TriPart Bloom', type: 'base' },
    ],
    rows: gheRows,
  },
];
