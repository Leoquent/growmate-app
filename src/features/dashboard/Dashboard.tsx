import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { loadActiveRunContexts, plantStrain, type RunContext } from '@/domain/context';
import { computeHealth } from '@/domain/health';
import { worstWateringAmpel, AMPEL_LABELS } from '@/domain/watering';
import { phaseProgress } from '@/domain/phases';
import { leadingStrain } from '@/domain/context';
import { buddyStageForRun, buddyStageName } from '@/buddy/stage';
import { Buddy } from '@/buddy/Buddy';
import { AmpelDot, BlockBar, Button, EmptyState, Header } from '@/components/ui';
import { PHASE_LABELS } from '@/db/types';
import { RunView } from '@/features/run/RunDetail';

/** Kompakte Buddy-Karte (nur bei mehreren aktiven Runs) */
function BuddyCard({ ctx }: { ctx: RunContext }) {
  const nav = useNavigate();
  const health = computeHealth(ctx);
  const ampel = worstWateringAmpel(ctx);
  const prog = phaseProgress(ctx.run, leadingStrain(ctx));
  const stage = buddyStageForRun(ctx);
  const strainNames = [...new Set(ctx.plants.map((p) => plantStrain(ctx, p).name))];

  return (
    <div className="pixel-frame bg-bg2 card-tap cursor-pointer anim-pop" onClick={() => nav(`/run/${ctx.run.id}`)}>
      <div className="p-4 flex gap-4 items-center">
        <div className="flex-none flex flex-col items-center gap-1">
          <Buddy stage={stage} emotion={health.emotion} size={76} />
          <span className="px-label">{buddyStageName(stage)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-[17px] truncate">{ctx.run.name}</h3>
          <p className="text-[12px] text-ink-dim truncate">
            {strainNames.join(' + ')} · {ctx.plants.length} Pflanze{ctx.plants.length > 1 ? 'n' : ''}
          </p>
          <p className="text-[12px] text-ink-faint mt-0.5">
            {PHASE_LABELS[prog.phase]} · Tag {prog.daysInPhase + 1} · Woche {prog.weekInPhase}
          </p>
          <div className="mt-2.5">
            <BlockBar value={health.score} max={100} color={health.score >= 70 ? 'var(--color-st-green)' : health.score >= 40 ? 'var(--color-st-yellow)' : 'var(--color-st-red)'} />
          </div>
          <div className="flex items-center gap-2 mt-2.5">
            <AmpelDot status={ampel.status} pulse />
            <span className="text-[12px] text-ink-dim">
              {ampel.daysSince === null ? 'Noch keine Bewässerung geloggt' : `${AMPEL_LABELS[ampel.status]} · vor ${ampel.daysSince} Tag${ampel.daysSince === 1 ? '' : 'en'}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Home = Dashboard: Bei genau einem aktiven Run wird er KOMPLETT angezeigt
 * (kein extra Klick nötig). Bei mehreren: kompakte Buddy-Karten.
 */
export function Dashboard() {
  const nav = useNavigate();
  const ctxs = useLiveQuery(loadActiveRunContexts, []);
  const finishedCount = useLiveQuery(() => db.runs.where({ status: 'finished' }).count(), []) ?? 0;

  return (
    <div>
      <Header
        title="GrowMate"
        right={<Button small onClick={() => nav('/run/new')}>+ Neuer Run</Button>}
      />

      {ctxs === undefined && <p className="text-ink-faint text-center py-10">Lade…</p>}

      {ctxs && ctxs.length === 0 && (
        <EmptyState
          icon="🥦"
          title="Noch kein Run aktiv"
          text="Starte deinen ersten Grow – Buddy wartet schon. Sorte wählen, Setup einrichten, los geht's."
          action={<Button onClick={() => nav('/run/new')}>Ersten Run starten</Button>}
        />
      )}

      {/* Genau 1 Run → volles Run-Dashboard direkt auf Home */}
      {ctxs?.length === 1 && <RunView runId={ctxs[0].run.id} embedded />}

      {/* Mehrere Runs → Karten */}
      {ctxs && ctxs.length > 1 && (
        <main className="px-4 pt-4 flex flex-col gap-4">
          {ctxs.map((ctx) => <BuddyCard key={ctx.run.id} ctx={ctx} />)}
        </main>
      )}

      {finishedCount > 0 && (
        <p className="text-center text-[12px] text-ink-faint py-3">
          🏆 {finishedCount} abgeschlossene{finishedCount === 1 ? 'r' : ''} Run{finishedCount === 1 ? '' : 's'}
        </p>
      )}
    </div>
  );
}
