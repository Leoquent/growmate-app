import { daysBetween, isoDate } from '@/db/db';
import { currentPhase, phaseStartDate } from '@/db/repo';
import type { EnvType, LightCycle, PhaseKey, Run, Strain } from '@/db/types';

/**
 * Lichtzyklus-Empfehlung statt Abfrage: Outdoor = Sonne (kein Zyklus),
 * Photoperiodisch startet mit 18/6 (12/12 kommt erst beim Blüte-Wechsel),
 * reine Auto-Runs laufen durchgehend auf 20/4.
 */
export function recommendLightCycle(strains: Strain[], envType: EnvType): LightCycle | null {
  if (envType === 'outdoor') return null;
  const anyPhoto = strains.some((s) => s.floweringType === 'photo');
  return anyPhoto ? '18/6' : '20/4';
}

export const NEXT_PHASE: Partial<Record<PhaseKey, PhaseKey>> = {
  germination: 'seedling',
  seedling: 'veg',
  veg: 'flower',
  flower: 'harvested',
};

/** Erwartete Dauer einer Phase in Tagen [min, max] */
export function expectedPhaseDays(strain: Strain, phase: PhaseKey): [number, number] | null {
  switch (phase) {
    case 'germination': return [1, 7];
    case 'seedling': return [7, 14];
    case 'veg': return [strain.vegWeeks[0] * 7, strain.vegWeeks[1] * 7];
    case 'flower': return [strain.flowerWeeks[0] * 7, strain.flowerWeeks[1] * 7];
    default: return null;
  }
}

/** Geplante Phasendauer für Kalender/Schema (Maximalwert = optimaler Zeitplan) */
export function plannedPhaseDays(strain: Strain, phase: PhaseKey): number {
  const range = expectedPhaseDays(strain, phase);
  return range ? range[1] : 0;
}

export interface PhaseProgress {
  phase: PhaseKey;
  daysInPhase: number;
  weekInPhase: number;
  expected: [number, number] | null;
  /** 0..1 relativ zur geplanten (max) Dauer */
  fraction: number;
  /** Phase läuft länger als das Maximum */
  overdue: boolean;
  /** Mindestdauer erreicht → Übergang kann vorgeschlagen werden */
  readyForNext: boolean;
}

export function phaseProgress(run: Run, strain: Strain, today: string = isoDate()): PhaseProgress {
  const phase = currentPhase(run);
  const daysInPhase = Math.max(0, daysBetween(phaseStartDate(run), today));
  const expected = expectedPhaseDays(strain, phase);
  const fraction = expected ? Math.min(1, daysInPhase / expected[1]) : 1;
  return {
    phase,
    daysInPhase,
    weekInPhase: Math.floor(daysInPhase / 7) + 1,
    expected,
    fraction,
    overdue: expected ? daysInPhase > expected[1] + 7 : false,
    readyForNext: expected ? daysInPhase >= expected[0] : false,
  };
}

/** Kriterien, die der User beim Übergang bestätigt (nie automatisch wechseln!) */
export const TRANSITION_CRITERIA: Partial<Record<PhaseKey, { question: string; criteria: string[] }>> = {
  germination: {
    question: 'Ist dein Keimling sichtbar?',
    criteria: [
      'Die Keimwurzel hat sich gezeigt und der Samen ist im Substrat',
      'Der Keimling hat die Erde durchbrochen',
      'Die Keimblätter (runde Babyblätter) sind offen',
    ],
  },
  seedling: {
    question: 'Ist dein Sämling bereit für die Wachstumsphase?',
    criteria: [
      '2–3 Nodien (Blattetagen) sind sichtbar',
      'Die ersten echten, gezackten Cannabisblätter sind voll entwickelt',
      'Die Pflanze wächst sichtbar jeden Tag',
    ],
  },
  veg: {
    question: 'Bereit für die Blüte?',
    criteria: [
      'Die Pflanze füllt ca. 50–70 % der Fläche (sie verdoppelt sich im Stretch!)',
      'Photoperiodisch: Du stellst den Lichtzyklus jetzt auf 12/12 um',
      'Training (Topping/LST) ist abgeschlossen oder verheilt',
    ],
  },
  flower: {
    question: 'Ist es Zeit für die Ernte?',
    criteria: [
      'Trichome sind milchig-trüb (mit Lupe prüfen!), einige bernsteinfarben',
      'Die meisten Pistile (Härchen) sind orange/braun und eingezogen',
      'Der Flush ist abgeschlossen (letzte Woche nur Wasser)',
    ],
  },
};

export const PHASE_PREVIEW: Partial<Record<PhaseKey, string>> = {
  seedling: 'Im Sämlingsstadium braucht deine Pflanze wenig: sanftes Gießen rund um den Stamm, hohe Luftfeuchtigkeit, kein oder sehr schwacher Dünger.',
  veg: 'Jetzt beginnt das Wachstum! Der Düngeplan startet, Training wie LST wird ab Woche 2 möglich, und deine Pflanze legt täglich zu.',
  flower: 'Die Blüte beginnt: Lichtzyklus 12/12 (bei Photoperiodischen), Düngeschema wechselt auf Bloom. In den ersten 2–3 Wochen streckt sich die Pflanze stark.',
  harvested: 'Geschafft! Trage Feucht- und Trockengewicht ein und schließe den Run mit deinen Statistiken ab.',
};
