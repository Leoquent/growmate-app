import { addDays, isoDate } from '@/db/db';
import { currentPhase, phaseStartDate } from '@/db/repo';
import type { PhaseKey } from '@/db/types';
import { PHASE_LABELS } from '@/db/types';
import type { RunContext } from './context';
import { NEXT_PHASE, expectedPhaseDays, plannedPhaseDays } from './phases';
import { plannedPhaseWeeks, resolveScheduleRow } from './nutrients';

export type CalEventKind = 'phase' | 'feeding' | 'flush' | 'harvest' | 'trichome' | 'training' | 'light';

export interface CalEvent {
  id: string;
  date: string;
  kind: CalEventKind;
  icon: string;
  title: string;
  desc?: string;
  runId: string;
  runName: string;
}

/**
 * Dynamischer Zeitplan: wird bei jedem Aufruf aus der aktuellen phaseHistory
 * projiziert – verschiebt sich ein Phasenwechsel, wandern alle Folge-Events mit.
 */
export function generateRunEvents(ctx: RunContext): CalEvent[] {
  const { run, strain } = ctx;
  const events: CalEvent[] = [];
  if (run.status === 'finished') return events;

  const push = (date: string, kind: CalEventKind, icon: string, title: string, desc?: string) =>
    events.push({ id: `${run.id}-${kind}-${date}-${title}`, date, kind, icon, title, desc, runId: run.id, runName: run.name });

  // Phasen von der aktuellen aus nach vorn projizieren
  let phase: PhaseKey = currentPhase(run);
  let phaseStart = phaseStartDate(run);

  const phaseStarts: { phase: PhaseKey; start: string }[] = [{ phase, start: phaseStart }];
  while (NEXT_PHASE[phase]) {
    const dur = plannedPhaseDays(strain, phase);
    const nextStart = addDays(phaseStart, dur);
    phase = NEXT_PHASE[phase]!;
    phaseStart = nextStart;
    phaseStarts.push({ phase, start: phaseStart });
  }

  for (let i = 1; i < phaseStarts.length; i++) {
    const p = phaseStarts[i];
    if (p.phase === 'harvested') continue;
    push(p.start, 'phase', '🌗', `${PHASE_LABELS[p.phase]} erwartet`, 'Übergang bestätigst du selbst in der App.');
    if (p.phase === 'flower' && strain.floweringType === 'photo') {
      push(p.start, 'light', '💡', 'Lichtzyklus auf 12/12 umstellen', 'Photoperiodische Pflanzen brauchen 12 Stunden Dunkelheit für die Blüte.');
    }
  }

  // Veg: Trainingsfenster
  const veg = phaseStarts.find((p) => p.phase === 'veg');
  if (veg) {
    push(addDays(veg.start, 7), 'training', '✂️', 'LST ab jetzt möglich', 'Low Stress Training: Triebe sanft nach unten binden.');
    if (strain.floweringType === 'photo') {
      push(addDays(veg.start, 14), 'training', '✂️', 'Topping-Fenster öffnet', 'Achtung: kostet ca. 1 Woche Wachstum, bringt aber 2 Haupttriebe.');
    }
  }

  // Blüte: Flush, Trichom-Check, Erntefenster
  const flower = phaseStarts.find((p) => p.phase === 'flower');
  if (flower) {
    const [minDays, maxDays] = expectedPhaseDays(strain, 'flower')!;
    const flushRow = ctx.nutrientLine?.rows.find((r) => r.isFlush && r.phase === 'flower');
    const flushWeeks = flushRow?.fromEnd ?? 1;
    push(addDays(flower.start, maxDays - flushWeeks * 7), 'flush', '🚿', 'Flush beginnt – nur noch Wasser', 'Substrat mit klarem Wasser spülen für sauberen Geschmack.');
    push(addDays(flower.start, 6 * 7), 'trichome', '🔬', 'Trichom-Check mit der Lupe', 'Milchig = Peak-THC. Bernstein = körperlicher. Klar = zu früh.');
    push(addDays(flower.start, minDays), 'harvest', '🏆', 'Erntefenster öffnet (frühestmöglich)');
    push(addDays(flower.start, maxDays), 'harvest', '🏆', 'Optimaler Erntezeitpunkt');
  }

  // Wöchentliche Dünge-Termine (ab heute bis Ernte)
  if (ctx.nutrientLine) {
    const today = isoDate();
    for (const p of phaseStarts) {
      if (p.phase === 'harvested' || p.phase === 'germination') continue;
      const weeks = plannedPhaseWeeks(strain, p.phase);
      for (let w = 1; w <= weeks; w++) {
        const weekStart = addDays(p.start, (w - 1) * 7);
        if (weekStart < today) continue;
        const row = resolveScheduleRow(ctx.nutrientLine, p.phase, w, weeks);
        if (!row || row.isFlush || Object.keys(row.cells).length === 0) continue;
        const products = Object.keys(row.cells)
          .map((id) => ctx.nutrientLine!.products.find((pr) => pr.id === id)?.name ?? id)
          .join(', ');
        push(weekStart, 'feeding', '🧪', `Düngewoche: ${row.label}`, products);
      }
    }
  }

  events.sort((a, b) => a.date.localeCompare(b.date));
  return events;
}

export function eventsForAll(ctxs: RunContext[]): CalEvent[] {
  return ctxs.flatMap(generateRunEvents).sort((a, b) => a.date.localeCompare(b.date));
}
