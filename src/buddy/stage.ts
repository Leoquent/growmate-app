import { isoDate } from '@/db/db';
import { currentPhase } from '@/db/repo';
import type { Run, Strain } from '@/db/types';
import { phaseProgress } from '@/domain/phases';
import { leadingStrain, type RunContext } from '@/domain/context';
import { STAGE_NAMES } from './spriteGen';

/**
 * Evolutionsstufe 1..9 aus Run-Zustand:
 * Ei → Keimling → Sämling → Early/Mid/Late Veg → Frühe/Volle Blüte → Erntereif
 */
export function buddyStage(run: Run, strain: Strain, today: string = isoDate()): number {
  const phase = currentPhase(run);
  const prog = phaseProgress(run, strain, today);

  switch (phase) {
    case 'germination':
      return 1;
    case 'seedling':
      return prog.weekInPhase <= 1 ? 2 : 3;
    case 'veg': {
      if (prog.fraction < 1 / 3) return 4;
      if (prog.fraction < 2 / 3) return 5;
      return 6;
    }
    case 'flower': {
      const planned = prog.expected ? prog.expected[1] : 56;
      // Letzte 2 Wochen = ultimative Form
      if (prog.daysInPhase >= planned - 14) return 9;
      if (prog.fraction < 1 / 3) return 7;
      return 8;
    }
    case 'harvested':
      return 9;
  }
}

export function buddyStageName(stage: number): string {
  return STAGE_NAMES[Math.min(9, Math.max(1, stage)) - 1];
}

/** Run-Stufe: die am weitesten fortgeschrittene Pflanze bestimmt den Fortschritt */
export function buddyStageForRun(ctx: RunContext): number {
  // leadingStrain = kürzeste geplante Dauer = größte Phasen-Fraction
  return buddyStage(ctx.run, leadingStrain(ctx));
}
