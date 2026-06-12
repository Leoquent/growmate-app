/* ===== GrowMate Datenmodell =====
 * Alles lokal (IndexedDB via Dexie). Keine Cloud, keine Accounts.
 */

export type PhaseKey = 'germination' | 'seedling' | 'veg' | 'flower' | 'harvested';

export const PHASE_ORDER: PhaseKey[] = ['germination', 'seedling', 'veg', 'flower', 'harvested'];

export const PHASE_LABELS: Record<PhaseKey, string> = {
  germination: 'Keimung',
  seedling: 'Sämling',
  veg: 'Vegetation',
  flower: 'Blüte',
  harvested: 'Geerntet',
};

export type StrainKind = 'indica' | 'sativa' | 'hybrid';
export type FloweringType = 'photo' | 'auto';
export type Difficulty = 'anfaenger' | 'mittel' | 'fortgeschritten';

export interface Strain {
  id: string;
  name: string;
  breeder: string;
  kind: StrainKind;
  floweringType: FloweringType;
  /** Empfohlene Veg-Dauer in Wochen [min, max]. Bei Autos: fixe Lebensphase. */
  vegWeeks: [number, number];
  flowerWeeks: [number, number];
  yieldDesc: string;
  potSizeL: number;
  substrateHint: string;
  lightHint: string;
  difficulty: Difficulty;
  notes: string;
  custom?: boolean;
}

export type SubstrateClass = 'soil' | 'coco' | 'hydro' | 'rockwool' | 'aero';

export const SUBSTRATE_CLASS_LABELS: Record<SubstrateClass, string> = {
  soil: 'Erde',
  coco: 'Coco',
  hydro: 'Hydroponik',
  rockwool: 'Steinwolle',
  aero: 'Aeroponik',
};

export const SUBSTRATE_CLASS_ICONS: Record<SubstrateClass, string> = {
  soil: '🟫',
  coco: '🥥',
  hydro: '💧',
  rockwool: '🧱',
  aero: '🌫️',
};

export interface Substrate {
  id: string;
  name: string;
  brand: string;
  class: SubstrateClass;
  /** Basis-Gießintervall in Tagen (11-L-Topf, Vegetation) */
  baseWateringIntervalDays: number;
  phRange: [number, number];
  ecHint: string;
  description: string;
}

export interface NutrientProduct {
  id: string;
  name: string;
  type: 'base' | 'additive' | 'booster' | 'root';
}

/** Eine Zeile im Herstellerschema. Werte in ml pro Liter. */
export interface ScheduleRow {
  id: string;
  label: string;
  desc?: string;
  phase: Exclude<PhaseKey, 'harvested'>;
  /** 1-basierte Woche innerhalb der Phase */
  weekFrom: number;
  /** null = bis Phasenende */
  weekTo: number | null;
  /** Wenn gesetzt: Zeile gilt für die letzten N Wochen der Phase (Reife/Flush) und übersteuert weekFrom/To */
  fromEnd?: number;
  /** productId -> ml/L oder [min,max] ml/L */
  cells: Record<string, number | [number, number]>;
  ecPlus?: number;
  lightHours?: string;
  isFlush?: boolean;
}

export interface NutrientLine {
  id: string;
  brand: string;
  name: string;
  substrates: SubstrateClass[];
  products: NutrientProduct[];
  rows: ScheduleRow[];
}

export type EnvType = 'indoor' | 'outdoor' | 'gewaechshaus';
export type LightType = 'led' | 'hps' | 'cfl' | 'sonne';
export type LightCycle = '18/6' | '12/12' | '20/4' | '24/0';

export interface Environment {
  id: string;
  name: string;
  type: EnvType;
  sizeText?: string;
  lightType: LightType;
  watts?: number;
  lightDistanceCm?: number;
  lightCycle: LightCycle;
  substrateId: string;
}

export interface PhaseRecord {
  phase: PhaseKey;
  /** ISO-Datum (yyyy-mm-dd) */
  startedAt: string;
}

export type GerminationMethod = 'wasserglas' | 'papiertuch' | 'substrat' | 'jiffy';

export interface Run {
  id: string;
  name: string;
  strainId: string;
  environmentId: string;
  nutrientLineId: string | null;
  potSizeL: number;
  plantCount: number;
  /** Standard-Gießmenge in L pro Pflanze (für ml-Rechner) */
  waterVolumeL: number;
  germinationMethod: GerminationMethod;
  startDate: string;
  phaseHistory: PhaseRecord[];
  status: 'active' | 'finished';
  createdAt: string;
}

export interface Plant {
  id: string;
  runId: string;
  name: string;
  /** Jede Pflanze kann ihren eigenen Strain haben (z. B. 3× Sorte A + 1× Sorte B) */
  strainId: string;
}

export type EntryType = 'watering' | 'training' | 'repot' | 'problem' | 'note' | 'harvest' | 'phase';

export const ENTRY_LABELS: Record<EntryType, string> = {
  watering: 'Bewässerung',
  training: 'Training',
  repot: 'Umtopfen',
  problem: 'Problem',
  note: 'Notiz',
  harvest: 'Ernte',
  phase: 'Phasenwechsel',
};

export const ENTRY_COLORS: Record<EntryType, string> = {
  watering: 'var(--color-water)',
  training: 'var(--color-train)',
  repot: 'var(--color-leaf)',
  problem: 'var(--color-issue)',
  note: 'var(--color-ink-dim)',
  harvest: 'var(--color-accent)',
  phase: 'var(--color-nute)',
};

export const ENTRY_ICONS: Record<EntryType, string> = {
  watering: '💧',
  training: '✂️',
  repot: '🪴',
  problem: '🩺',
  note: '📝',
  harvest: '🏆',
  phase: '🌗',
};

export interface NutrientDose {
  productId: string;
  name: string;
  ml: number;
}

export interface WateringData {
  liters: number;
  ph?: number;
  ec?: number;
  nutrients: NutrientDose[];
  note?: string;
}

export type TrainingKind = 'LST' | 'Topping' | 'FIM' | 'Defoliation' | 'Lollipopping' | 'SCROG';

export interface TrainingData { kind: TrainingKind; note?: string }
export interface RepotData { fromL?: number; toL: number; note?: string }
export interface ProblemData {
  title: string;
  description?: string;
  severity: 'niedrig' | 'mittel' | 'hoch';
  status: 'offen' | 'geloest';
  source?: 'leafdoc' | 'manuell';
  diagnosis?: { label: string; confidence: number }[];
}
export interface NoteData { text: string }
export interface HarvestData { wetGrams?: number; dryGrams?: number; note?: string }
export interface PhaseData { from: PhaseKey; to: PhaseKey }

export type EntryData = WateringData | TrainingData | RepotData | ProblemData | NoteData | HarvestData | PhaseData;

export interface JournalEntry {
  id: string;
  runId: string;
  /** null/undefined = ganzer Run (alle Pflanzen) */
  plantId?: string | null;
  type: EntryType;
  /** ISO-Zeitstempel */
  date: string;
  phase: PhaseKey;
  dayOfGrow: number;
  data: EntryData;
  /** DataURL */
  photo?: string;
  createdAt: string;
}

export interface AppSettings {
  id: 'app';
  onboardingDone: boolean;
  experienced: boolean;
  notificationsEnabled: boolean;
  /** SHA-256-Hash der PIN, null = kein Schutz */
  pinHash: string | null;
  seedVersion: number;
}
