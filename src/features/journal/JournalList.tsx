import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import {
  ENTRY_COLORS, ENTRY_ICONS, ENTRY_LABELS, PHASE_LABELS,
  type HarvestData, type JournalEntry, type NoteData, type PhaseData, type ProblemData,
  type RepotData, type TrainingData, type WateringData,
} from '@/db/types';
import { EmptyState } from '@/components/ui';

function summary(e: JournalEntry): string {
  switch (e.type) {
    case 'watering': {
      const d = e.data as WateringData;
      const parts = [`${d.liters} L`];
      if (d.ph) parts.push(`pH ${d.ph}`);
      if (d.ec) parts.push(`EC ${d.ec}`);
      if (d.nutrients.length) parts.push(d.nutrients.map((n) => `${n.name} ${n.ml} ml`).join(', '));
      return parts.join(' · ');
    }
    case 'training': {
      const d = e.data as TrainingData;
      return d.kind + (d.note ? ` – ${d.note}` : '');
    }
    case 'repot': {
      const d = e.data as RepotData;
      return `${d.fromL ?? '?'} L → ${d.toL} L`;
    }
    case 'problem': {
      const d = e.data as ProblemData;
      return d.title;
    }
    case 'note':
      return (e.data as NoteData).text;
    case 'harvest': {
      const d = e.data as HarvestData;
      const parts = [];
      if (d.wetGrams) parts.push(`Feucht: ${d.wetGrams} g`);
      if (d.dryGrams) parts.push(`Trocken: ${d.dryGrams} g`);
      return parts.join(' · ') || 'Ernte';
    }
    case 'phase': {
      const d = e.data as PhaseData;
      return `${PHASE_LABELS[d.from]} → ${PHASE_LABELS[d.to]}`;
    }
  }
}

function EntryRow({ e }: { e: JournalEntry }) {
  const [expanded, setExpanded] = useState(false);
  const isProblem = e.type === 'problem';
  const prob = isProblem ? (e.data as ProblemData) : null;

  const toggleSolved = async (ev: React.MouseEvent) => {
    ev.stopPropagation();
    if (!prob) return;
    await db.journal.update(e.id, { data: { ...prob, status: prob.status === 'offen' ? 'geloest' : 'offen' } });
  };

  const dateStr = new Date(e.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });

  return (
    <div className="flex gap-3" onClick={() => setExpanded(!expanded)}>
      {/* Timeline-Spalte */}
      <div className="flex flex-col items-center flex-none w-8">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[15px]" style={{ background: 'color-mix(in srgb, ' + ENTRY_COLORS[e.type] + ' 16%, transparent)' }}>
          {ENTRY_ICONS[e.type]}
        </div>
        <div className="w-px flex-1 bg-line my-1" />
      </div>
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[13px] font-bold" style={{ color: ENTRY_COLORS[e.type] }}>{ENTRY_LABELS[e.type]}</span>
          <span className="text-[11px] text-ink-faint flex-none">{dateStr} · Tag {e.dayOfGrow} · {PHASE_LABELS[e.phase]}</span>
        </div>
        <p className={`text-[13px] text-ink-dim leading-relaxed mt-0.5 ${expanded ? '' : 'line-clamp-2'}`}>{summary(e)}</p>
        {prob && (
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={prob.status === 'offen'
                ? { background: 'color-mix(in srgb, var(--color-st-orange) 18%, transparent)', color: 'var(--color-st-orange)' }
                : { background: 'color-mix(in srgb, var(--color-st-green) 18%, transparent)', color: 'var(--color-st-green)' }}
            >
              {prob.status === 'offen' ? 'offen' : 'gelöst'}
            </span>
            <button type="button" onClick={toggleSolved} className="text-[11px] text-ink-faint underline">
              {prob.status === 'offen' ? 'Als gelöst markieren' : 'Wieder öffnen'}
            </button>
          </div>
        )}
        {prob?.diagnosis && expanded && (
          <div className="mt-2 text-[12px] text-ink-faint">
            {prob.diagnosis.map((d) => <div key={d.label}>🩺 {d.label}: {Math.round(d.confidence * 100)} %</div>)}
          </div>
        )}
        {e.photo && (
          <img src={e.photo} alt="" className={`rounded-lg mt-2 ${expanded ? 'w-full' : 'w-24 h-24 object-cover'}`} />
        )}
      </div>
    </div>
  );
}

export function JournalList({ runId }: { runId: string }) {
  const entries = useLiveQuery(
    () => db.journal.where({ runId }).toArray().then((a) => a.sort((x, y) => y.date.localeCompare(x.date))),
    [runId],
  );

  if (!entries) return null;
  if (entries.length === 0) {
    return <EmptyState icon="📓" title="Noch keine Einträge" text="Logge deine erste Bewässerung – das Journal ist das Gedächtnis deines Grows." />;
  }
  return (
    <div className="pt-2">
      {entries.map((e) => <EntryRow key={e.id} e={e} />)}
    </div>
  );
}
