import React, { useState } from 'react';
import type { RunContext } from '@/domain/context';
import { dosesForRow, plannedPhaseWeeks, resolveScheduleRow, scheduleStatus } from '@/domain/nutrients';
import { currentPhase } from '@/db/repo';
import { PHASE_LABELS, type ScheduleRow } from '@/db/types';
import { Card, EmptyState } from '@/components/ui';

function RowCard({ row, ctx, liters, active }: { row: ScheduleRow; ctx: RunContext; liters: number; active: boolean }) {
  const doses = dosesForRow(row, ctx.nutrientLine!, liters);
  return (
    <div
      className={`card p-3.5 ${active ? 'pixel-frame' : ''}`}
      style={active ? { background: 'color-mix(in srgb, var(--color-accent) 10%, var(--color-bg2))', borderColor: 'var(--color-accent)' } : undefined}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="font-bold text-[14px]">{row.isFlush ? '🚿 ' : ''}{row.label}</h4>
        {active && <span className="px-label flex-none" style={{ color: 'var(--color-accent)' }}>Aktuelle Woche</span>}
      </div>
      <p className="text-[11px] text-ink-faint mt-0.5">
        {PHASE_LABELS[row.phase]}
        {row.fromEnd ? ` · letzte ${row.fromEnd} Woche${row.fromEnd > 1 ? 'n' : ''}` : ` · ab Woche ${row.weekFrom}${row.weekTo ? `–${row.weekTo}` : ''}`}
        {row.lightHours ? ` · ${row.lightHours} h Licht` : ''}
        {row.ecPlus != null && row.ecPlus > 0 ? ` · EC +${String(row.ecPlus).replace('.', ',')}` : ''}
      </p>
      {row.desc && <p className="text-[12px] text-ink-dim mt-1">{row.desc}</p>}
      {doses.length > 0 ? (
        <div className="mt-2.5 flex flex-col gap-1.5">
          {doses.map((d) => (
            <div key={d.productId} className="flex justify-between text-[13px]">
              <span className="text-ink-dim">{d.name}</span>
              <span className="font-bold" style={{ color: active ? 'var(--color-accent)' : 'var(--color-ink)' }}>
                {String(d.totalMl).replace('.', ',')}{d.totalMlMax ? `–${String(d.totalMlMax).replace('.', ',')}` : ''} ml
                <span className="text-ink-faint font-normal"> ({String(d.mlPerL).replace('.', ',')}{d.mlPerLMax ? `–${String(d.mlPerLMax).replace('.', ',')}` : ''} ml/L)</span>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[13px] font-semibold mt-2" style={{ color: 'var(--color-water)' }}>Nur klares Wasser 💧</p>
      )}
    </div>
  );
}

export function ScheduleView({ ctx }: { ctx: RunContext }) {
  const [liters, setLiters] = useState(String(ctx.run.waterVolumeL));
  const litersNum = parseFloat(liters.replace(',', '.')) || 0;

  if (!ctx.nutrientLine) {
    return <EmptyState icon="🧪" title="Kein Düngeschema gewählt" text="Dieser Run läuft ohne Schema. Du kannst Düngergaben trotzdem frei im Journal loggen." />;
  }

  const phase = currentPhase(ctx.run);
  const sched = scheduleStatus(ctx, litersNum);
  const line = ctx.nutrientLine;

  return (
    <div className="flex flex-col gap-3 pt-2">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="px-label">ml-Rechner</p>
            <p className="text-[13px] text-ink-dim mt-1">{line.brand} – {line.name}</p>
          </div>
          <div className="flex items-center gap-2 flex-none">
            <input
              className="input !w-20 text-center"
              inputMode="decimal"
              value={liters}
              onChange={(e) => setLiters(e.target.value)}
              aria-label="Behältervolumen in Litern"
            />
            <span className="text-[13px] text-ink-dim font-bold">Liter</span>
          </div>
        </div>
        {sched?.isFlushWeek && (
          <p className="text-[12px] font-semibold mt-3" style={{ color: 'var(--color-st-orange)' }}>
            ⚠️ Flush-Woche erkannt – ab jetzt nur noch Wasser geben!
          </p>
        )}
      </Card>

      {line.rows.map((row) => {
        const isActive = sched?.row?.id === row.id && row.phase === phase;
        return <RowCard key={row.id} row={row} ctx={ctx} liters={litersNum} active={!!isActive} />;
      })}

      <p className="text-[11px] text-ink-faint leading-relaxed px-1 pb-2">
        Werte basieren auf den offiziellen Herstellerschemata. Faustregel: Lieber mit 80 % starten
        und auf die Pflanze hören – nachdüngen ist leichter als spülen.
      </p>
    </div>
  );
}
