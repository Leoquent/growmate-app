import { daysBetween, isoDate } from '@/db/db';
import { currentPhase } from '@/db/repo';
import type { WateringData } from '@/db/types';
import type { RunContext } from '@/domain/context';
import { scheduleStatus } from '@/domain/nutrients';
import { phaseProgress } from '@/domain/phases';
import { wateringAmpel } from '@/domain/watering';
import type { Prediction } from './inference';

/* ===== Kontextsensitive Diagnose-Schicht =====
 * Das macht LeafDoc in GrowMate besser als standalone: Das Journal liefert
 * den Kontext (pH, Düngung, Gießverhalten, Phase), die KI das Symptom.
 * Erst zusammen ergibt sich eine präzise, handlungsfähige Diagnose.
 */

export interface ContextNote {
  icon: string;
  text: string;
  weight: 'hint' | 'important';
}

const DEFICIENCIES = ['nitrogen', 'magnesium', 'potassium', 'iron', 'calcium', 'phosphor', 'sulfur', 'zinc', 'manganese', 'copper'];

export function contextNotes(predictions: Prediction[], ctx: RunContext, today: string = isoDate()): ContextNote[] {
  const notes: ContextNote[] = [];
  const top = predictions[0];
  if (!top) return notes;
  const label = top.label.toLowerCase();

  const phase = currentPhase(ctx.run);
  const prog = phaseProgress(ctx.run, ctx.strain, today);
  const ampel = wateringAmpel(ctx, today);
  const sched = scheduleStatus(ctx);
  const lastW = ctx.lastWatering?.data as WateringData | undefined;

  // 1) pH-Lockout: Mangel diagnostiziert + letzter pH außerhalb des Substrat-Zielbereichs
  if (DEFICIENCIES.includes(label) && lastW?.ph != null) {
    const [lo, hi] = ctx.substrate.phRange;
    if (lastW.ph < lo - 0.1 || lastW.ph > hi + 0.1) {
      notes.push({
        icon: '⚗️',
        weight: 'important',
        text: `Dein letzter geloggter pH-Wert (${lastW.ph}) liegt außerhalb des Zielbereichs für ${ctx.substrate.name} (${lo}–${hi}). Ein Nährstoff-Lockout ist sehr wahrscheinlich die eigentliche Ursache – korrigiere zuerst den pH, bevor du mehr düngst.`,
      });
    }
  }

  // 2) Überdüngung + kürzliche Düngung
  if ((label === 'nuteburn' || label === 'n tox.') && ctx.lastFeeding) {
    const days = daysBetween(ctx.lastFeeding.date.slice(0, 10), today);
    if (days <= 4) {
      const feed = ctx.lastFeeding.data as WateringData;
      const products = feed.nutrients.map((n) => `${n.name} (${n.ml} ml)`).join(', ');
      notes.push({
        icon: '🧪',
        weight: 'important',
        text: `Laut Journal hast du vor ${days} Tag${days === 1 ? '' : 'en'} gedüngt: ${products}. Das passt zur Diagnose – reduziere die Konzentration auf ~50 % und spüle bei starken Symptomen mit klarem Wasser.`,
      });
    }
  }

  // 3) Trockenstress verstärkt Symptome
  if (ampel.status === 'orange' || ampel.status === 'red') {
    notes.push({
      icon: '💧',
      weight: 'important',
      text: `Die letzte Bewässerung liegt ${ampel.daysSince ?? '?'} Tage zurück (Intervall bei ${ctx.substrate.name}: ~${ampel.expectedInterval} Tage). Trockenstress kann Mangelsymptome auslösen oder verstärken – gieße zuerst und beobachte 1–2 Tage.`,
    });
  }

  // 4) Natürliches Vergilben in Abreifung/Flush
  if (label === 'nitrogen' && phase === 'flower' && (sched?.isFlushWeek || prog.fraction > 0.75)) {
    notes.push({
      icon: '🍂',
      weight: 'important',
      text: 'Du bist in der späten Blüte' + (sched?.isFlushWeek ? ' (Flush-Woche)' : '') + ': Leichtes Vergilben der unteren Blätter ist jetzt natürlich und sogar erwünscht – die Pflanze zieht Stickstoff aus den Blättern. Kein Grund zum Nachdüngen!',
    });
  }

  // 5) Coco + Ca/Mg
  if ((label === 'calcium' || label === 'magnesium') && ctx.substrate.class === 'coco') {
    notes.push({
      icon: '🥥',
      weight: 'hint',
      text: 'Coco bindet Calcium und Magnesium im Substrat – CalMag-Zugabe ist bei Coco-Grows Standard. Prüfe, ob dein Schema CalMag enthält.',
    });
  }

  // 6) Lichtbrand + starke Lampe
  if (label === 'lightburn' && ctx.env.lightType !== 'sonne') {
    notes.push({
      icon: '💡',
      weight: 'hint',
      text: `Deine ${ctx.env.lightType.toUpperCase()}${ctx.env.watts ? ` (${ctx.env.watts} W)` : ''} könnte zu nah hängen. Richtwert LED: 30–45 cm Abstand zur Krone, bei Symptomen 10 cm höher hängen oder dimmen.`,
    });
  }

  // 7) Schädlinge + Klima-Hinweis
  if (label === 'mites') {
    notes.push({ icon: '🕷️', weight: 'hint', text: 'Spinnmilben lieben trockene, warme Luft. Erhöhe die Luftfeuchtigkeit – in der Blüte aber vorsichtig (Schimmelgefahr).' });
  }

  // 8) Junger Sämling + Mangel → meist kein Düngerproblem
  if (DEFICIENCIES.includes(label) && (phase === 'seedling' || phase === 'germination')) {
    notes.push({
      icon: '🌱',
      weight: 'hint',
      text: 'Sämlinge zehren noch von den Keimblättern und brauchen kaum Dünger. Symptome entstehen hier meist durch Übergießen oder zu starkes Substrat – nicht durch fehlende Nährstoffe.',
    });
  }

  return notes;
}

/** Kontext-Zusammenfassung, die LeafDoc beim Aufruf automatisch erhält */
export interface DiagnosisContext {
  lines: { icon: string; label: string; value: string }[];
}

export function buildDiagnosisContext(ctx: RunContext, today: string = isoDate()): DiagnosisContext {
  const prog = phaseProgress(ctx.run, ctx.strain, today);
  const sched = scheduleStatus(ctx);
  const lastW = ctx.lastWatering?.data as WateringData | undefined;
  const lines: DiagnosisContext['lines'] = [];

  lines.push({
    icon: '🌗',
    label: 'Phase',
    value: `${prog.phase === 'veg' ? 'Vegetation' : prog.phase === 'flower' ? 'Blüte' : prog.phase === 'seedling' ? 'Sämling' : prog.phase === 'germination' ? 'Keimung' : 'Geerntet'} · Tag ${prog.daysInPhase + 1} · Woche ${prog.weekInPhase}`,
  });

  if (ctx.lastWatering && lastW) {
    const days = daysBetween(ctx.lastWatering.date.slice(0, 10), today);
    const parts = [`vor ${days} Tag${days === 1 ? '' : 'en'}`, `${lastW.liters} L`];
    if (lastW.ph) parts.push(`pH ${lastW.ph}`);
    if (lastW.ec) parts.push(`EC ${lastW.ec}`);
    if (lastW.nutrients.length) parts.push(lastW.nutrients.map((n) => n.name).join(', '));
    lines.push({ icon: '💧', label: 'Letzte Bewässerung', value: parts.join(' · ') });
  } else {
    lines.push({ icon: '💧', label: 'Letzte Bewässerung', value: 'Noch nicht geloggt' });
  }

  lines.push({ icon: '🟫', label: 'Substrat & Topf', value: `${ctx.substrate.brand} ${ctx.substrate.name} · ${ctx.run.potSizeL} L` });

  if (ctx.nutrientLine && sched?.row) {
    lines.push({ icon: '🧪', label: 'Dünger', value: `${ctx.nutrientLine.brand} ${ctx.nutrientLine.name} · ${sched.row.label}` });
  }

  lines.push({ icon: '💡', label: 'Umgebung', value: `${ctx.env.lightType.toUpperCase()}${ctx.env.watts ? ` ${ctx.env.watts} W` : ''} · ${ctx.env.lightCycle}${ctx.env.sizeText ? ` · ${ctx.env.sizeText}` : ''}` });

  const trainings = ctx.recentEntries.filter((e) => e.type === 'training');
  if (trainings.length > 0) {
    lines.push({ icon: '✂️', label: 'Letztes Training', value: trainings.map((t) => (t.data as { kind: string }).kind).slice(0, 3).join(', ') });
  }

  return { lines };
}
