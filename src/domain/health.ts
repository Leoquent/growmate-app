import { daysBetween, isoDate } from '@/db/db';
import { currentPhase } from '@/db/repo';
import type { ProblemData } from '@/db/types';
import { plantStrain, type RunContext } from './context';
import { phaseProgress } from './phases';
import { scheduleStatus } from './nutrients';
import { wateringAmpel } from './watering';

export type Emotion = 'happy' | 'neutral' | 'unhappy';

export interface HealthResult {
  score: number;
  emotion: Emotion;
  reasons: string[];
}

/**
 * Gesundheit einer EINZELNEN Pflanze aus echten Daten:
 * Bewässerung (wichtigster Faktor) > offene Probleme > Düngeplan-Treue > Zeitplan.
 */
export function computePlantHealth(ctx: RunContext, plantId: string | undefined, today: string = isoDate()): HealthResult {
  let score = 100;
  const reasons: string[] = [];
  const phase = currentPhase(ctx.run);

  if (phase === 'harvested') {
    return { score: 100, emotion: 'happy', reasons: ['Run abgeschlossen – Buddy ist stolz!'] };
  }

  // 1) Bewässerung (substratabhängig, pro Pflanze)
  const ampel = wateringAmpel(ctx, today, plantId);
  if (ampel.status === 'yellow') { score -= 15; reasons.push('Bald gießen – Substrat checken'); }
  if (ampel.status === 'orange') { score -= 30; reasons.push('Gießen empfohlen'); }
  if (ampel.status === 'red') { score -= 55; reasons.push('Dringend gießen – großer Durst!'); }

  // 2) Offene Probleme (Run-weite + pflanzenspezifische)
  const problems = ctx.openProblems.filter((p) => !plantId || !p.plantId || p.plantId === plantId);
  let problemPenalty = 0;
  for (const p of problems) {
    problemPenalty += (p.data as ProblemData).severity === 'hoch' ? 25 : 15;
  }
  if (problemPenalty > 0) {
    score -= Math.min(40, problemPenalty);
    reasons.push(`${problems.length} offenes Problem${problems.length > 1 ? 'e' : ''} im Journal`);
  }

  // 3) Düngeplan-Treue (nur wenn Schema aktiv und keine Flush-Woche)
  const sched = scheduleStatus(ctx);
  if (sched?.row && !sched.isFlushWeek && sched.doses.length > 0 && (phase === 'veg' || phase === 'flower')) {
    const lastFed = ctx.lastFeeding ? daysBetween(ctx.lastFeeding.date.slice(0, 10), today) : null;
    if (lastFed === null || lastFed > 9) {
      score -= 10;
      reasons.push('Düngung dieser Woche noch nicht geloggt');
    }
  }

  // 4) Zeitplan (Strain der Pflanze)
  const plant = plantId ? ctx.plants.find((p) => p.id === plantId) : undefined;
  const strain = plant ? plantStrain(ctx, plant) : ctx.strain;
  const prog = phaseProgress(ctx.run, strain, today);
  if (prog.overdue) {
    score -= 10;
    reasons.push('Phase läuft länger als geplant – Zeit für den Übergang?');
  }

  score = Math.max(0, Math.min(100, score));
  const emotion: Emotion = score >= 70 ? 'happy' : score >= 40 ? 'neutral' : 'unhappy';
  if (reasons.length === 0) reasons.push('Alles im grünen Bereich – weiter so!');
  return { score, emotion, reasons };
}

/**
 * Run-Gesundheit = die Pflanze, der es am SCHLECHTESTEN geht.
 * Das Run-Tamagotchi repräsentiert die Gesamtgesundheit aller Pflanzen.
 */
export function computeHealth(ctx: RunContext, today: string = isoDate()): HealthResult {
  if (ctx.plants.length === 0) return computePlantHealth(ctx, undefined, today);
  let worst: HealthResult | null = null;
  let worstPlantName = '';
  for (const p of ctx.plants) {
    const h = computePlantHealth(ctx, p.id, today);
    if (!worst || h.score < worst.score) { worst = h; worstPlantName = p.name; }
  }
  if (worst && worst.score < 70 && ctx.plants.length > 1) {
    worst = { ...worst, reasons: [`${worstPlantName}: ${worst.reasons[0]}`, ...worst.reasons.slice(1)] };
  }
  return worst!;
}
