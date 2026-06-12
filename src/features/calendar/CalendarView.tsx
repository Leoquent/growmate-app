import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { loadActiveRunContexts } from '@/domain/context';
import { eventsForAll, type CalEvent } from '@/domain/calendar';
import { formatDate, isoDate } from '@/db/db';
import { Chip, EmptyState, Header } from '@/components/ui';

const KIND_COLORS: Record<CalEvent['kind'], string> = {
  phase: 'var(--color-nute)',
  feeding: 'var(--color-nute)',
  flush: 'var(--color-water)',
  harvest: 'var(--color-accent)',
  trichome: 'var(--color-train)',
  training: 'var(--color-train)',
  light: 'var(--color-st-yellow)',
};

export function CalendarView() {
  const nav = useNavigate();
  const ctxs = useLiveQuery(loadActiveRunContexts, []);
  const [filterRun, setFilterRun] = useState<string | null>(null);

  const events = useMemo(() => {
    if (!ctxs) return [];
    const today = isoDate();
    return eventsForAll(ctxs).filter((e) => e.date >= today && (!filterRun || e.runId === filterRun));
  }, [ctxs, filterRun]);

  const grouped = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of events.slice(0, 80)) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return Array.from(map.entries());
  }, [events]);

  const today = isoDate();

  return (
    <div>
      <Header title="Kalender" sub="Dynamischer Zeitplan – verschiebt sich automatisch mit deinen Phasen" />
      <main className="px-4 pt-4 pb-8">
        {(ctxs?.length ?? 0) > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4">
            <Chip label="Alle" active={!filterRun} onClick={() => setFilterRun(null)} />
            {ctxs!.map((c) => (
              <Chip key={c.run.id} label={c.run.name} active={filterRun === c.run.id} onClick={() => setFilterRun(c.run.id)} />
            ))}
          </div>
        )}

        {ctxs && events.length === 0 && (
          <EmptyState icon="📅" title="Keine anstehenden Events" text="Starte einen Run – GrowMate erstellt automatisch deinen kompletten Zeitplan bis zur Ernte." />
        )}

        <div className="flex flex-col gap-4">
          {grouped.map(([date, dayEvents]) => {
            const d = new Date(date + 'T00:00:00');
            const inDays = Math.round((d.getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000);
            return (
              <section key={date}>
                <div className="flex items-baseline gap-2 mb-2">
                  <h3 className="text-[14px] font-bold">
                    {inDays === 0 ? 'Heute' : inDays === 1 ? 'Morgen' : d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' })}
                  </h3>
                  <span className="text-[11px] text-ink-faint">{inDays > 1 ? `in ${inDays} Tagen` : formatDate(date)}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {dayEvents.map((e) => (
                    <div key={e.id} className="card p-3 flex gap-3 items-start card-tap cursor-pointer" onClick={() => nav(`/run/${e.runId}`)}>
                      <div className="w-1 self-stretch rounded-full flex-none" style={{ background: KIND_COLORS[e.kind] }} />
                      <span className="text-[18px] leading-none mt-0.5">{e.icon}</span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold">{e.title}</p>
                        <p className="text-[11px] text-ink-faint">{e.runName}</p>
                        {e.desc && <p className="text-[12px] text-ink-dim mt-0.5 leading-relaxed">{e.desc}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
