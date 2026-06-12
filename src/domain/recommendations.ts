import { daysBetween, isoDate } from '@/db/db';
import { currentPhase } from '@/db/repo';
import type { TrainingData } from '@/db/types';
import type { RunContext } from './context';
import { phaseProgress } from './phases';
import { scheduleStatus } from './nutrients';
import { wateringAmpel } from './watering';

export interface Recommendation {
  id: string;
  icon: string;
  title: string;
  text: string;
  level: 'info' | 'action' | 'warn';
}

/** Proaktive, kontextuelle Empfehlungen – phasen-, substrat- und strainabhängig. */
export function recommendationsFor(ctx: RunContext, today: string = isoDate()): Recommendation[] {
  const recs: Recommendation[] = [];
  const phase = currentPhase(ctx.run);
  if (ctx.run.status === 'finished') return recs;

  const prog = phaseProgress(ctx.run, ctx.strain, today);
  const ampel = wateringAmpel(ctx, today);
  const sched = scheduleStatus(ctx);

  // Bewässerung
  if (ampel.status === 'orange' || ampel.status === 'red') {
    const substratHint = ctx.substrate.class === 'coco'
      ? 'Bei Coco empfehlen wir tägliches Gießen mit Nährlösung.'
      : `Bei ${ctx.substrate.name} liegt das Intervall bei ca. ${ampel.expectedInterval} Tagen.`;
    recs.push({
      id: 'water',
      icon: '💧',
      title: ampel.status === 'red' ? 'Dringend gießen!' : 'Gießen empfohlen',
      text: `Letzte Bewässerung vor ${ampel.daysSince ?? '–'} Tagen. ${substratHint}`,
      level: 'warn',
    });
  }

  // Flush-Warnung
  if (sched?.isFlushWeek) {
    recs.push({
      id: 'flush',
      icon: '🚿',
      title: 'Flush-Woche!',
      text: 'Ab jetzt nur noch klares, pH-reguliertes Wasser – kein Dünger mehr. Das sorgt für sauberen Geschmack.',
      level: 'warn',
    });
  } else if (sched?.row && sched.doses.length > 0 && (phase === 'veg' || phase === 'flower')) {
    // Düngung dieser Woche
    const lastFed = ctx.lastFeeding ? daysBetween(ctx.lastFeeding.date.slice(0, 10), today) : null;
    if (lastFed === null || lastFed > 7) {
      const products = sched.doses.map((d) => d.name).join(', ');
      recs.push({
        id: 'feed',
        icon: '🧪',
        title: `Diese Woche: ${sched.row.label}`,
        text: `${products} – noch nicht geloggt. Der Rechner zeigt dir die exakten Mengen.`,
        level: 'action',
      });
    }
  }

  // Trichom-Check
  if (phase === 'flower' && prog.weekInPhase >= 7) {
    recs.push({
      id: 'trichome',
      icon: '🔬',
      title: `Woche ${prog.weekInPhase} der Blüte – Trichom-Check`,
      text: 'Zeit für die Lupe: Sind die Trichome milchig? Dann nähert sich das Erntefenster.',
      level: 'info',
    });
  }

  // Training-Fenster
  if (phase === 'veg') {
    const trainings = ctx.recentEntries.filter((e) => e.type === 'training');
    const hasTopping = trainings.some((e) => ['Topping', 'FIM'].includes((e.data as TrainingData).kind));
    if (prog.weekInPhase >= 3 && prog.weekInPhase <= 4 && !hasTopping && ctx.strain.floweringType === 'photo') {
      recs.push({
        id: 'topping',
        icon: '✂️',
        title: `Tag ${prog.daysInPhase} der Veg – Topping jetzt möglich`,
        text: 'Die Spitze kappen bringt 2 Haupttriebe und bessere Lichtausnutzung. Achtung: kostet ca. 1 Woche Wachstum.',
        level: 'info',
      });
    } else if (prog.weekInPhase === 2 && trainings.length === 0) {
      recs.push({
        id: 'lst',
        icon: '🪢',
        title: 'LST ab jetzt möglich',
        text: 'Low Stress Training: Haupttrieb sanft zur Seite binden – mehr Licht für alle Triebe, ohne Stress.',
        level: 'info',
      });
    }
    // Lichtumstellung
    if (ctx.strain.floweringType === 'photo' && prog.weekInPhase >= ctx.strain.vegWeeks[1] && ctx.env.lightCycle !== '12/12') {
      recs.push({
        id: 'lightswitch',
        icon: '💡',
        title: 'Zeit für die Blüte-Umstellung',
        text: `${ctx.strain.name} hat die empfohlene Veg-Dauer erreicht. Stelle den Lichtzyklus auf 12/12 und bestätige den Phasenwechsel.`,
        level: 'action',
      });
    }
    if (ctx.strain.floweringType === 'auto' && prog.weekInPhase >= ctx.strain.vegWeeks[1]) {
      recs.push({
        id: 'autoflower',
        icon: '🌸',
        title: 'Autoflower-Blüte steht bevor',
        text: 'Deine Auto beginnt bald von selbst zu blühen. Sobald du erste Blütenansätze siehst, bestätige den Phasenwechsel.',
        level: 'info',
      });
    }
  }

  // Keimung überfällig
  if (phase === 'germination' && prog.daysInPhase > 7) {
    recs.push({
      id: 'germ-overdue',
      icon: '🌱',
      title: 'Keimung dauert ungewöhnlich lange',
      text: `${prog.daysInPhase} Tage seit Start. Prüfe Feuchtigkeit und Temperatur (22–25 °C ideal). Manche Samen brauchen bis zu 10 Tage.`,
      level: 'warn',
    });
  }

  // Phasenwechsel fällig
  if (prog.overdue && phase !== 'germination') {
    recs.push({
      id: 'phase-overdue',
      icon: '🌗',
      title: 'Phasenwechsel prüfen',
      text: `Die ${prog.weekInPhase}. Woche läuft – länger als für ${ctx.strain.name} geplant. Bereit für die nächste Phase?`,
      level: 'action',
    });
  }

  // Offene Probleme
  if (ctx.openProblems.length > 0) {
    recs.push({
      id: 'problems',
      icon: '🩺',
      title: `${ctx.openProblems.length} offenes Problem${ctx.openProblems.length > 1 ? 'e' : ''}`,
      text: 'Checke das Journal – ungelöste Probleme drücken Buddys Laune. LeafDoc hilft bei der Diagnose.',
      level: 'warn',
    });
  }

  return recs.slice(0, 4);
}
