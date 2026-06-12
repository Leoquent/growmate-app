import { daysBetween, isoDate } from '@/db/db';
import type { PhaseKey, Substrate } from '@/db/types';
import type { RunContext } from './context';
import { phaseStartDate } from '@/db/repo';

export type AmpelStatus = 'green' | 'yellow' | 'orange' | 'red';

export const AMPEL_LABELS: Record<AmpelStatus, string> = {
  green: 'Alles gut',
  yellow: 'Bald gießen – Erde checken',
  orange: 'Gießen empfohlen',
  red: 'Dringend gießen!',
};

/**
 * Erwartetes Gießintervall in Tagen.
 * Grower-Wissen: Coco trocknet täglich aus, Erde alle 2–3 Tage; große Töpfe
 * halten länger Feuchtigkeit; blühende Pflanzen trinken deutlich mehr.
 */
export function expectedWateringIntervalDays(substrate: Substrate, potSizeL: number, phase: PhaseKey): number {
  let days = substrate.baseWateringIntervalDays;

  if (substrate.class === 'soil') {
    if (potSizeL <= 7) days -= 1;
    else if (potSizeL > 18) days += 1;
    if (phase === 'flower') days -= 1; // Blüte säuft
    if (phase === 'germination' || phase === 'seedling') days += 1; // kleine Wurzeln, Topf trocknet langsam
  }
  // Coco/Hydro/Steinwolle: täglich, unabhängig von Topf & Phase
  return Math.max(1, days);
}

export interface AmpelResult {
  status: AmpelStatus;
  daysSince: number | null;
  expectedInterval: number;
  /** Tage bis "gelb" (negativ = überfällig) */
  dueInDays: number;
  label: string;
}

/**
 * Ampel für den Run oder eine einzelne Pflanze.
 * Einträge ohne plantId gelten für ALLE Pflanzen; Einträge mit plantId nur für diese.
 */
export function wateringAmpel(ctx: RunContext, today: string = isoDate(), plantId?: string): AmpelResult {
  const phase = ctx.run.phaseHistory[ctx.run.phaseHistory.length - 1].phase;
  const expected = expectedWateringIntervalDays(ctx.substrate, ctx.run.potSizeL, phase);

  const relevant = plantId
    ? ctx.allWaterings.find((e) => !e.plantId || e.plantId === plantId)
    : ctx.lastWatering;

  // Nie gegossen → Tage seit Phasenstart als Näherung (frisch gestartete Runs bleiben grün)
  const refDate = relevant ? relevant.date.slice(0, 10) : phaseStartDate(ctx.run);
  const daysSince = Math.max(0, daysBetween(refDate, today));

  let status: AmpelStatus = 'green';
  if (daysSince >= expected + 2) status = 'red';
  else if (daysSince >= expected + 1) status = 'orange';
  else if (daysSince >= expected) status = 'yellow';

  // Geerntete Runs haben keinen Wasserbedarf mehr
  if (phase === 'harvested') status = 'green';

  return {
    status,
    daysSince: relevant ? daysSince : null,
    expectedInterval: expected,
    dueInDays: expected - daysSince,
    label: AMPEL_LABELS[status],
  };
}

const AMPEL_ORDER: AmpelStatus[] = ['green', 'yellow', 'orange', 'red'];

/** Schlechteste Ampel über alle Pflanzen – sie bestimmt den Run-Status */
export function worstWateringAmpel(ctx: RunContext, today: string = isoDate()): AmpelResult {
  let worst = wateringAmpel(ctx, today);
  for (const p of ctx.plants) {
    const a = wateringAmpel(ctx, today, p.id);
    if (AMPEL_ORDER.indexOf(a.status) > AMPEL_ORDER.indexOf(worst.status)) worst = a;
  }
  return worst;
}
