import { db } from '@/db/db';
import { lastWatering, openProblems } from '@/db/repo';
import type {
  Environment, JournalEntry, NutrientLine, Plant, Run, Strain, Substrate, WateringData,
} from '@/db/types';

/** Gebündelter Kontext eines Runs – Datenquelle für alle Engines (Health, Ampel, LeafDoc, Empfehlungen). */
export interface RunContext {
  run: Run;
  /** Primär-Strain (häufigster im Run) – für Kalender & Default-Erwartungen */
  strain: Strain;
  /** Alle Strains der Pflanzen, per id */
  strains: Map<string, Strain>;
  env: Environment;
  substrate: Substrate;
  nutrientLine: NutrientLine | null;
  lastWatering?: JournalEntry;
  /** Letzte Bewässerung MIT Düngergabe */
  lastFeeding?: JournalEntry;
  /** Alle Bewässerungen, neueste zuerst (für Per-Pflanze-Ampel) */
  allWaterings: JournalEntry[];
  openProblems: JournalEntry[];
  plants: Plant[];
  recentEntries: JournalEntry[];
}

export async function loadRunContext(runId: string): Promise<RunContext | null> {
  const run = await db.runs.get(runId);
  if (!run) return null;
  const [strain, env, plants, lw, problems, allEntries] = await Promise.all([
    db.strains.get(run.strainId),
    db.environments.get(run.environmentId),
    db.plants.where({ runId }).toArray(),
    lastWatering(runId),
    openProblems(runId),
    db.journal.where({ runId }).toArray(),
  ]);
  if (!strain || !env) return null;
  const substrate = await db.substrates.get(env.substrateId);
  if (!substrate) return null;
  const nutrientLine = run.nutrientLineId ? (await db.nutrientLines.get(run.nutrientLineId)) ?? null : null;

  const strainIds = [...new Set([run.strainId, ...plants.map((p) => p.strainId).filter(Boolean)])];
  const strainList = (await db.strains.bulkGet(strainIds)).filter((s): s is Strain => !!s);
  const strains = new Map(strainList.map((s) => [s.id, s]));

  const waterings = allEntries
    .filter((e) => e.type === 'watering')
    .sort((a, b) => b.date.localeCompare(a.date));
  const feedings = waterings.filter((e) => ((e.data as WateringData).nutrients?.length ?? 0) > 0);

  const recentEntries = [...allEntries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  return {
    run, strain, strains, env, substrate, nutrientLine,
    lastWatering: lw,
    lastFeeding: feedings[0],
    allWaterings: waterings,
    openProblems: problems,
    plants,
    recentEntries,
  };
}

/** Strain einer Pflanze (Fallback: Primär-Strain des Runs) */
export function plantStrain(ctx: RunContext, plant: Plant): Strain {
  return ctx.strains.get(plant.strainId) ?? ctx.strain;
}

/** Die „führende" Pflanze: kürzeste geplante Phasendauer = am weitesten im Zeitplan */
export function leadingStrain(ctx: RunContext): Strain {
  let best = ctx.strain;
  let bestDays = Infinity;
  for (const p of ctx.plants) {
    const s = plantStrain(ctx, p);
    const total = (s.vegWeeks[1] + s.flowerWeeks[1]) * 7;
    if (total < bestDays) { bestDays = total; best = s; }
  }
  return best;
}

export async function loadActiveRunContexts(): Promise<RunContext[]> {
  const runs = await db.runs.where({ status: 'active' }).toArray();
  const ctxs = await Promise.all(runs.map((r) => loadRunContext(r.id)));
  return ctxs.filter((c): c is RunContext => !!c);
}
