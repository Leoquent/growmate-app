import Dexie, { type Table } from 'dexie';
import type {
  AppSettings, Environment, JournalEntry, NutrientLine, Plant, Run, Strain, Substrate,
} from './types';

export class GrowMateDB extends Dexie {
  settings!: Table<AppSettings, string>;
  strains!: Table<Strain, string>;
  substrates!: Table<Substrate, string>;
  nutrientLines!: Table<NutrientLine, string>;
  environments!: Table<Environment, string>;
  runs!: Table<Run, string>;
  plants!: Table<Plant, string>;
  journal!: Table<JournalEntry, string>;

  constructor() {
    super('growmate');
    this.version(1).stores({
      settings: 'id',
      strains: 'id, name, breeder',
      substrates: 'id, class',
      nutrientLines: 'id, brand',
      environments: 'id, name',
      runs: 'id, status, strainId',
      plants: 'id, runId',
      journal: 'id, runId, [runId+type], date, type',
    });
    // v2: Strain pro Pflanze
    this.version(2).stores({
      plants: 'id, runId, strainId',
    }).upgrade(async (tx) => {
      const runs = await tx.table('runs').toArray();
      const strainByRun = new Map(runs.map((r: { id: string; strainId: string }) => [r.id, r.strainId]));
      await tx.table('plants').toCollection().modify((p: { runId: string; strainId?: string }) => {
        if (!p.strainId) p.strainId = strainByRun.get(p.runId) ?? '';
      });
    });
  }
}

export const db = new GrowMateDB();

export const uid = () => crypto.randomUUID();

/** yyyy-mm-dd (lokal) */
export function isoDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA.slice(0, 10) + 'T00:00:00');
  const b = new Date(isoB.slice(0, 10) + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

export function formatDate(iso: string): string {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00');
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00');
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
}
