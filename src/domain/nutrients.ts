import type { NutrientLine, PhaseKey, ScheduleRow, Strain } from '@/db/types';
import type { RunContext } from './context';
import { currentPhase, weekInPhase } from '@/db/repo';
import { plannedPhaseDays } from './phases';

/** Geplante Wochenzahl einer Phase (für fromEnd-Zeilen wie Flush/Abreifung) */
export function plannedPhaseWeeks(strain: Strain, phase: PhaseKey): number {
  return Math.max(1, Math.round(plannedPhaseDays(strain, phase) / 7));
}

/**
 * Findet die Schema-Zeile für eine Phase + Woche.
 * fromEnd-Zeilen (Flush/Abreifung) zählen vom geplanten Phasenende und haben Vorrang –
 * die spezifischste (kleinste fromEnd) gewinnt.
 */
export function resolveScheduleRow(
  line: NutrientLine,
  phase: PhaseKey,
  week: number,
  totalWeeks: number,
): ScheduleRow | null {
  if (phase === 'harvested') return null;
  const rows = line.rows.filter((r) => r.phase === phase);

  const fromEndRows = rows
    .filter((r) => r.fromEnd != null && week > totalWeeks - r.fromEnd!)
    .sort((a, b) => (a.fromEnd! - b.fromEnd!));
  if (fromEndRows.length > 0) return fromEndRows[0];

  const normal = rows
    .filter((r) => r.fromEnd == null && week >= r.weekFrom && (r.weekTo == null || week <= r.weekTo))
    .sort((a, b) => b.weekFrom - a.weekFrom);
  return normal[0] ?? null;
}

export interface Dose {
  productId: string;
  name: string;
  mlPerL: number;
  mlPerLMax?: number;
  totalMl: number;
  totalMlMax?: number;
}

/** ml/L × Behältervolumen = Gesamtmenge pro Produkt */
export function dosesForRow(row: ScheduleRow, line: NutrientLine, liters: number): Dose[] {
  const round1 = (n: number) => Math.round(n * 10) / 10;
  return Object.entries(row.cells).map(([productId, val]) => {
    const product = line.products.find((p) => p.id === productId);
    const [min, max] = Array.isArray(val) ? val : [val, undefined];
    return {
      productId,
      name: product?.name ?? productId,
      mlPerL: min,
      mlPerLMax: max,
      totalMl: round1(min * liters),
      totalMlMax: max != null ? round1(max * liters) : undefined,
    };
  });
}

export interface ScheduleStatus {
  row: ScheduleRow | null;
  week: number;
  totalWeeks: number;
  isFlushWeek: boolean;
  doses: Dose[];
}

/** Aktueller Schema-Status eines Runs (aktuelle Woche, Dosierungen, Flush-Erkennung) */
export function scheduleStatus(ctx: RunContext, liters?: number): ScheduleStatus | null {
  if (!ctx.nutrientLine) return null;
  const phase = currentPhase(ctx.run);
  const week = weekInPhase(ctx.run);
  const totalWeeks = plannedPhaseWeeks(ctx.strain, phase);
  const row = resolveScheduleRow(ctx.nutrientLine, phase, week, totalWeeks);
  return {
    row,
    week,
    totalWeeks,
    isFlushWeek: !!row?.isFlush,
    doses: row ? dosesForRow(row, ctx.nutrientLine, liters ?? ctx.run.waterVolumeL) : [],
  };
}
