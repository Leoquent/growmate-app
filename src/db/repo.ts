import { db, uid, isoDate, daysBetween } from './db';
import { SEED_NUTRIENT_LINES, SEED_STRAINS, SEED_SUBSTRATES, SEED_VERSION } from './seed';
import type {
  AppSettings, EntryData, EntryType, Environment, GerminationMethod, JournalEntry, PhaseKey, Run,
} from './types';

export async function ensureSeeded(): Promise<void> {
  const settings = await db.settings.get('app');
  if (settings && settings.seedVersion >= SEED_VERSION) return;
  await db.transaction('rw', [db.settings, db.strains, db.substrates, db.nutrientLines], async () => {
    await db.strains.bulkPut(SEED_STRAINS);
    await db.substrates.bulkPut(SEED_SUBSTRATES);
    await db.nutrientLines.bulkPut(SEED_NUTRIENT_LINES);
    if (!settings) {
      await db.settings.put({
        id: 'app',
        onboardingDone: false,
        experienced: false,
        notificationsEnabled: false,
        pinHash: null,
        seedVersion: SEED_VERSION,
      });
    } else {
      await db.settings.update('app', { seedVersion: SEED_VERSION });
    }
  });
}

export async function getSettings(): Promise<AppSettings> {
  return (await db.settings.get('app'))!;
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<void> {
  await db.settings.update('app', patch);
}

export interface NewRunInput {
  name: string;
  environmentId: string;
  nutrientLineId: string | null;
  potSizeL: number;
  waterVolumeL: number;
  germinationMethod: GerminationMethod;
  startDate: string;
  /** Jede Pflanze mit eigenem Strain – z. B. 3× Sorte A + 1× Sorte B */
  plants: { strainId: string; name: string }[];
}

export async function createRun(input: NewRunInput): Promise<string> {
  const runId = uid();
  // Primär-Strain = häufigster Strain (bestimmt Kalender & Phasen-Erwartung)
  const counts = new Map<string, number>();
  for (const p of input.plants) counts.set(p.strainId, (counts.get(p.strainId) ?? 0) + 1);
  const primaryStrainId = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];

  const run: Run = {
    id: runId,
    name: input.name,
    strainId: primaryStrainId,
    environmentId: input.environmentId,
    nutrientLineId: input.nutrientLineId,
    potSizeL: input.potSizeL,
    plantCount: input.plants.length,
    waterVolumeL: input.waterVolumeL,
    germinationMethod: input.germinationMethod,
    startDate: input.startDate,
    phaseHistory: [{ phase: 'germination', startedAt: input.startDate }],
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  await db.transaction('rw', [db.runs, db.plants], async () => {
    await db.runs.add(run);
    for (const p of input.plants) {
      await db.plants.add({ id: uid(), runId, name: p.name, strainId: p.strainId });
    }
  });
  return runId;
}

export function currentPhase(run: Run): PhaseKey {
  return run.phaseHistory[run.phaseHistory.length - 1].phase;
}

export function phaseStartDate(run: Run): string {
  return run.phaseHistory[run.phaseHistory.length - 1].startedAt;
}

export function dayOfGrow(run: Run, onDate: string = isoDate()): number {
  return Math.max(0, daysBetween(run.startDate, onDate)) + 1;
}

/** 1-basierte Woche innerhalb der aktuellen Phase */
export function weekInPhase(run: Run, onDate: string = isoDate()): number {
  return Math.floor(Math.max(0, daysBetween(phaseStartDate(run), onDate)) / 7) + 1;
}

export async function addEntry(params: {
  runId: string;
  plantId?: string | null;
  type: EntryType;
  data: EntryData;
  photo?: string;
  date?: string;
}): Promise<string> {
  const run = await db.runs.get(params.runId);
  if (!run) throw new Error('Run nicht gefunden');
  const date = params.date ?? new Date().toISOString();
  const entry: JournalEntry = {
    id: uid(),
    runId: params.runId,
    plantId: params.plantId ?? null,
    type: params.type,
    date,
    phase: currentPhase(run),
    dayOfGrow: dayOfGrow(run, date.slice(0, 10)),
    data: params.data,
    photo: params.photo,
    createdAt: new Date().toISOString(),
  };
  await db.journal.add(entry);
  return entry.id;
}

export async function advancePhase(runId: string, to: PhaseKey, date: string = isoDate()): Promise<void> {
  const run = await db.runs.get(runId);
  if (!run) return;
  const from = currentPhase(run);
  const phaseHistory = [...run.phaseHistory, { phase: to, startedAt: date }];
  await db.runs.update(runId, {
    phaseHistory,
    status: to === 'harvested' ? 'finished' : run.status,
  });
  await addEntry({ runId, type: 'phase', data: { from, to } });
}

/** Letzte Bewässerung eines Runs (optional je Pflanze) */
export async function lastWatering(runId: string, plantId?: string | null): Promise<JournalEntry | undefined> {
  const entries = await db.journal.where({ runId, type: 'watering' }).toArray();
  const filtered = plantId
    ? entries.filter((e) => !e.plantId || e.plantId === plantId)
    : entries;
  filtered.sort((a, b) => b.date.localeCompare(a.date));
  return filtered[0];
}

export async function openProblems(runId: string): Promise<JournalEntry[]> {
  const entries = await db.journal.where({ runId, type: 'problem' }).toArray();
  return entries.filter((e) => (e.data as { status?: string }).status === 'offen');
}

export async function deleteRun(runId: string): Promise<void> {
  await db.transaction('rw', [db.runs, db.plants, db.journal], async () => {
    await db.journal.where({ runId }).delete();
    await db.plants.where({ runId }).delete();
    await db.runs.delete(runId);
  });
}

export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode('growmate:' + pin);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* ===== Verschlüsseltes Backup (AES-GCM, Passwort via PBKDF2) ===== */

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 250_000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function exportEncrypted(password: string): Promise<Blob> {
  const dump = {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: await db.settings.toArray(),
    strains: await db.strains.toArray(),
    substrates: await db.substrates.toArray(),
    nutrientLines: await db.nutrientLines.toArray(),
    environments: await db.environments.toArray(),
    runs: await db.runs.toArray(),
    plants: await db.plants.toArray(),
    journal: await db.journal.toArray(),
  };
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(dump));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, plaintext as BufferSource));
  const out = new Uint8Array(8 + 16 + 12 + ciphertext.length);
  out.set(new TextEncoder().encode('GROWMATE'), 0);
  out.set(salt, 8);
  out.set(iv, 24);
  out.set(ciphertext, 36);
  return new Blob([out], { type: 'application/octet-stream' });
}

export async function importEncrypted(file: ArrayBuffer, password: string): Promise<void> {
  const bytes = new Uint8Array(file);
  const magic = new TextDecoder().decode(bytes.slice(0, 8));
  if (magic !== 'GROWMATE') throw new Error('Keine gültige GrowMate-Backup-Datei.');
  const salt = bytes.slice(8, 24);
  const iv = bytes.slice(24, 36);
  const key = await deriveKey(password, salt);
  let plaintext: ArrayBuffer;
  try {
    plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, bytes.slice(36) as BufferSource);
  } catch {
    throw new Error('Falsches Passwort oder beschädigte Datei.');
  }
  const dump = JSON.parse(new TextDecoder().decode(plaintext));
  await db.transaction('rw', db.tables, async () => {
    for (const table of ['settings', 'strains', 'substrates', 'nutrientLines', 'environments', 'runs', 'plants', 'journal'] as const) {
      await db[table].clear();
      await (db[table] as any).bulkPut(dump[table] ?? []);
    }
  });
}
