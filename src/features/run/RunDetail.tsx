import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, isoDate } from '@/db/db';
import { advancePhase, addEntry, deleteRun } from '@/db/repo';
import { loadRunContext, leadingStrain, plantStrain, type RunContext } from '@/domain/context';
import { computeHealth, computePlantHealth } from '@/domain/health';
import { wateringAmpel, worstWateringAmpel } from '@/domain/watering';
import { phaseProgress, NEXT_PHASE, TRANSITION_CRITERIA, PHASE_PREVIEW } from '@/domain/phases';
import { recommendationsFor } from '@/domain/recommendations';
import { buddyStage, buddyStageForRun, buddyStageName } from '@/buddy/stage';
import { Buddy } from '@/buddy/Buddy';
import { AmpelDot, BlockBar, Button, Card, Field, Header, Segmented, Sheet } from '@/components/ui';
import { PHASE_LABELS, type HarvestData, type JournalEntry, type Plant, type WateringData } from '@/db/types';
import { JournalList } from '@/features/journal/JournalList';
import { NoteSheet, ProblemSheet, RepotSheet, TrainingSheet, WateringSheet } from '@/features/journal/LogSheets';
import { ScheduleView } from '@/features/schedule/ScheduleView';
import { refreshNotifications } from '@/notify/notifications';

/* ===== Phasenwechsel – IMMER mit User-Bestätigung ===== */
function PhaseDialog({ ctx, open, onClose }: { ctx: RunContext; open: boolean; onClose: () => void }) {
  const prog = phaseProgress(ctx.run, leadingStrain(ctx));
  const next = NEXT_PHASE[prog.phase];
  const criteria = TRANSITION_CRITERIA[prog.phase];
  const [checked, setChecked] = useState<Set<number>>(new Set());

  if (!next || !criteria) return null;

  const entryCount = ctx.recentEntries.length;
  const allChecked = checked.size >= criteria.criteria.length;

  const confirm = async () => {
    await advancePhase(ctx.run.id, next);
    void refreshNotifications();
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={`🌗 ${criteria.question}`}>
      <Card className="mb-4">
        <p className="px-label mb-1.5">Rückblick: {PHASE_LABELS[prog.phase]}</p>
        <p className="text-[13px] text-ink-dim leading-relaxed">
          {prog.daysInPhase + 1} Tag{prog.daysInPhase === 0 ? '' : 'e'} in dieser Phase · {entryCount} Journal-Eintr{entryCount === 1 ? 'ag' : 'äge'} zuletzt.
        </p>
      </Card>
      <p className="px-label mb-2">Check vor dem Wechsel</p>
      <div className="flex flex-col gap-2 mb-4">
        {criteria.criteria.map((c, i) => (
          <label key={i} className="card p-3 flex gap-3 items-start cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5 mt-0.5 accent-[#9be15d] flex-none"
              checked={checked.has(i)}
              onChange={(e) => {
                const n = new Set(checked);
                e.target.checked ? n.add(i) : n.delete(i);
                setChecked(n);
              }}
            />
            <span className="text-[13px] leading-relaxed">{c}</span>
          </label>
        ))}
      </div>
      <Card className="mb-5">
        <p className="px-label mb-1.5">Vorschau: {PHASE_LABELS[next]}</p>
        <p className="text-[13px] text-ink-dim leading-relaxed">{PHASE_PREVIEW[next]}</p>
      </Card>
      <Button className="w-full" disabled={!allChecked} onClick={confirm}>
        Wechsel zu „{PHASE_LABELS[next]}" bestätigen
      </Button>
    </Sheet>
  );
}

/* ===== Ernte-Flow mit Feier ===== */
function HarvestSheet({ ctx, open, onClose }: { ctx: RunContext; open: boolean; onClose: () => void }) {
  const [wet, setWet] = useState('');
  const [dry, setDry] = useState('');
  const [note, setNote] = useState('');
  const [celebrating, setCelebrating] = useState(false);

  const confirm = async () => {
    await addEntry({
      runId: ctx.run.id,
      type: 'harvest',
      data: {
        wetGrams: wet ? parseFloat(wet.replace(',', '.')) : undefined,
        dryGrams: dry ? parseFloat(dry.replace(',', '.')) : undefined,
        note: note || undefined,
      } as HarvestData,
    });
    await advancePhase(ctx.run.id, 'harvested');
    void refreshNotifications();
    setCelebrating(true);
  };

  if (celebrating) {
    return (
      <Sheet open={open} onClose={onClose} title="">
        <div className="relative flex flex-col items-center text-center py-6 overflow-hidden">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2"
              style={{
                left: `${(i * 41) % 100}%`,
                top: '-8px',
                background: ['#9BE15D', '#FFD76A', '#FF9447', '#6EC8FF', '#C39BFF'][i % 5],
                animation: `confetti-fall ${1 + (i % 5) * 0.3}s ease-out ${(i % 8) * 0.15}s both`,
              }}
            />
          ))}
          <Buddy stage={9} emotion="happy" size={120} />
          <h2 className="text-[22px] font-bold mt-4">🏆 Ernte eingefahren!</h2>
          <p className="text-ink-dim text-[14px] mt-2 leading-relaxed">
            Glückwunsch – dein Run „{ctx.run.name}" ist abgeschlossen.
            {dry && <> <b>{dry} g trocken</b> – sauber!</>}
          </p>
          <Button className="mt-6 w-full" onClick={onClose}>Zur Übersicht</Button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onClose={onClose} title="🏆 Ernte eintragen">
      <p className="text-[13px] text-ink-dim mb-4 leading-relaxed">
        Trage das Feuchtgewicht direkt nach dem Schnitt ein. Das Trockengewicht kannst du
        später nachtragen (typisch: 20–25 % des Feuchtgewichts).
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Feuchtgewicht (g)">
          <input className="input" inputMode="decimal" value={wet} onChange={(e) => setWet(e.target.value)} />
        </Field>
        <Field label="Trockengewicht (g)">
          <input className="input" inputMode="decimal" value={dry} onChange={(e) => setDry(e.target.value)} />
        </Field>
      </div>
      <Field label="Notiz (optional)">
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <Button className="w-full" onClick={confirm}>Run abschließen 🎉</Button>
    </Sheet>
  );
}

/* ===== Pflanzen-Detail (Sheet) ===== */
function PlantSheet({ ctx, plant, onClose, onLog }: {
  ctx: RunContext;
  plant: Plant | null;
  onClose: () => void;
  onLog: (kind: 'watering' | 'problem' | 'note', plantId: string) => void;
}) {
  const entries = useLiveQuery(
    () => plant
      ? db.journal.where({ runId: ctx.run.id }).toArray().then((a) => a.filter((e) => e.plantId === plant.id).sort((x, y) => y.date.localeCompare(x.date)).slice(0, 6))
      : Promise.resolve<JournalEntry[]>([]),
    [plant?.id, ctx.run.id],
  );
  if (!plant) return null;

  const strain = plantStrain(ctx, plant);
  const health = computePlantHealth(ctx, plant.id);
  const ampel = wateringAmpel(ctx, isoDate(), plant.id);
  const stage = buddyStage(ctx.run, strain);

  return (
    <Sheet open={!!plant} onClose={onClose} title={plant.name}>
      <div className="flex items-center gap-4 mb-4">
        <Buddy stage={stage} emotion={health.emotion} size={72} animate={false} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold">{strain.name}</p>
          <p className="text-[11px] text-ink-faint">{strain.breeder} · {strain.floweringType === 'auto' ? 'Autoflower' : 'Photoperiodisch'}</p>
          <div className="mt-2">
            <BlockBar value={health.score} max={100} color={health.score >= 70 ? 'var(--color-st-green)' : health.score >= 40 ? 'var(--color-st-yellow)' : 'var(--color-st-red)'} />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <AmpelDot status={ampel.status} />
            <span className="text-[12px] text-ink-dim">
              {ampel.daysSince === null ? 'Noch nicht gegossen' : `Gegossen vor ${ampel.daysSince} Tag${ampel.daysSince === 1 ? '' : 'en'}`}
            </span>
          </div>
        </div>
      </div>
      <p className="text-[12px] text-ink-dim leading-relaxed mb-4">{health.reasons[0]}</p>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Button small variant="secondary" onClick={() => onLog('watering', plant.id)}>💧 Gießen</Button>
        <Button small variant="secondary" onClick={() => onLog('problem', plant.id)}>🩺 Problem</Button>
        <Button small variant="secondary" onClick={() => onLog('note', plant.id)}>📝 Notiz</Button>
      </div>

      <p className="px-label mb-2">Einträge nur für diese Pflanze</p>
      {(entries?.length ?? 0) === 0 ? (
        <p className="text-[12px] text-ink-faint mb-2">Noch keine – Run-weite Einträge findest du im Journal-Tab.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {entries!.map((e) => (
            <div key={e.id} className="card p-2.5 text-[12px] text-ink-dim flex justify-between gap-2">
              <span className="truncate">{e.type === 'watering' ? `💧 ${(e.data as WateringData).liters} L` : e.type === 'problem' ? `🩺 ${(e.data as { title: string }).title}` : `📝 ${(e.data as { text?: string }).text ?? ''}`}</span>
              <span className="text-ink-faint flex-none">Tag {e.dayOfGrow}</span>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}

type TabKey = 'uebersicht' | 'journal' | 'schema';
type LogKind = 'watering' | 'training' | 'repot' | 'problem' | 'note' | 'phase' | 'harvest';

/** Komplette Run-Ansicht – als Home-Dashboard (embedded) und als Route nutzbar */
export function RunView({ runId, embedded = false }: { runId: string; embedded?: boolean }) {
  const nav = useNavigate();
  const [tab, setTab] = useState<TabKey>('uebersicht');
  const [sheet, setSheet] = useState<{ kind: LogKind; plantId?: string | null } | null>(null);
  const [plantId, setPlantId] = useState<string | null>(null);

  // journal als Dependency, damit Logs den Kontext live aktualisieren
  const journalCount = useLiveQuery(() => db.journal.where({ runId }).count(), [runId]);
  const ctx = useLiveQuery(() => loadRunContext(runId), [runId, journalCount]);

  const health = useMemo(() => (ctx ? computeHealth(ctx) : null), [ctx]);
  const ampel = useMemo(() => (ctx ? worstWateringAmpel(ctx) : null), [ctx]);
  const prog = useMemo(() => (ctx ? phaseProgress(ctx.run, leadingStrain(ctx)) : null), [ctx]);
  const recs = useMemo(() => (ctx ? recommendationsFor(ctx) : []), [ctx]);

  if (ctx === undefined) return <div className="p-8 text-center text-ink-faint">Lade…</div>;
  if (ctx === null) return <div className="p-8 text-center text-ink-faint">Run nicht gefunden.</div>;

  const stage = buddyStageForRun(ctx);
  const finished = ctx.run.status === 'finished';
  const next = NEXT_PHASE[prog!.phase];
  const harvestEntry = ctx.recentEntries.find((e) => e.type === 'harvest');
  const lastWateringData = ctx.lastWatering?.data as WateringData | undefined;
  const strainNames = [...new Set(ctx.plants.map((p) => plantStrain(ctx, p).name))];
  const selectedPlant = plantId ? ctx.plants.find((p) => p.id === plantId) ?? null : null;

  const openLog = (kind: LogKind, forPlant?: string | null) => {
    setPlantId(null);
    setSheet({ kind, plantId: forPlant ?? null });
  };

  return (
    <div>
      <main className={`px-4 ${embedded ? 'pt-3' : 'pt-4'} pb-8 flex flex-col gap-4`}>
        {/* Buddy-Hero: der Run IST das Tamagotchi */}
        <div className="pixel-frame bg-bg2 p-5 flex flex-col items-center text-center">
          {embedded && (
            <button type="button" onClick={() => nav(`/run/${ctx.run.id}`)} className="mb-1">
              <h2 className="font-bold text-[17px]">{ctx.run.name}</h2>
              <p className="text-[11px] text-ink-faint -mt-0.5">{strainNames.join(' + ')} · {ctx.plants.length} Pflanze{ctx.plants.length > 1 ? 'n' : ''}</p>
            </button>
          )}
          <Buddy stage={stage} emotion={health!.emotion} size={120} animate={!finished} />
          <p className="px-label mt-2">{buddyStageName(stage)}{finished ? ' · Run abgeschlossen' : ''}</p>
          <div className="w-full max-w-[260px] mt-3">
            <BlockBar value={health!.score} max={100} color={health!.score >= 70 ? 'var(--color-st-green)' : health!.score >= 40 ? 'var(--color-st-yellow)' : 'var(--color-st-red)'} />
          </div>
          <p className="text-[12px] text-ink-dim mt-2 leading-relaxed">{health!.reasons[0]}</p>
        </div>

        <Segmented<TabKey>
          options={[
            { value: 'uebersicht', label: 'Übersicht' },
            { value: 'journal', label: 'Journal' },
            { value: 'schema', label: 'Düngeplan' },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'uebersicht' && (
          <>
            {/* Phase */}
            <Card>
              <div className="flex justify-between items-baseline">
                <p className="px-label">Phase: {PHASE_LABELS[prog!.phase]}</p>
                <span className="text-[12px] text-ink-faint">Tag {prog!.daysInPhase + 1} · Woche {prog!.weekInPhase}</span>
              </div>
              <div className="mt-3">
                <BlockBar value={prog!.daysInPhase} max={prog!.expected ? prog!.expected[1] : 1} color="var(--color-leaf)" />
              </div>
              {prog!.expected && (
                <p className="text-[12px] text-ink-faint mt-2">
                  Erwartet: {Math.round(prog!.expected[0] / 7)}–{Math.round(prog!.expected[1] / 7)} Wochen
                  {prog!.overdue && <span style={{ color: 'var(--color-st-orange)' }}> · läuft länger als geplant</span>}
                </p>
              )}
              {!finished && next && (
                <Button
                  small
                  variant={prog!.readyForNext ? 'primary' : 'secondary'}
                  className="mt-3 w-full"
                  onClick={() => setSheet({ kind: prog!.phase === 'flower' ? 'harvest' : 'phase' })}
                >
                  {prog!.phase === 'flower' ? '🏆 Ernten & abschließen' : `Weiter zu „${PHASE_LABELS[next]}"`}
                </Button>
              )}
            </Card>

            {/* Ampel */}
            {!finished && (
              <Card>
                <div className="flex items-center gap-3">
                  <AmpelDot status={ampel!.status} pulse />
                  <div className="flex-1">
                    <p className="text-[14px] font-bold">{ampel!.label}</p>
                    <p className="text-[12px] text-ink-dim mt-0.5">
                      {ctx.lastWatering
                        ? <>Zuletzt gegossen vor {ampel!.daysSince} Tag{ampel!.daysSince === 1 ? '' : 'en'}
                          {lastWateringData ? ` (${lastWateringData.liters} L${lastWateringData.ph ? `, pH ${lastWateringData.ph}` : ''})` : ''}</>
                        : 'Noch keine Bewässerung geloggt'}
                      {' · '}Intervall bei {ctx.substrate.name}: ~{ampel!.expectedInterval} Tag{ampel!.expectedInterval === 1 ? '' : 'e'}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Aktionen – gelten standardmäßig für den ganzen Run */}
            {!finished && (
              <div className="grid grid-cols-3 gap-2.5">
                {([
                  ['watering', '💧', 'Gießen'],
                  ['training', '✂️', 'Training'],
                  ['repot', '🪴', 'Umtopfen'],
                  ['problem', '🩺', 'Problem'],
                  ['note', '📝', 'Notiz'],
                ] as const).map(([key, icon, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => openLog(key)}
                    className="card card-tap p-3 flex flex-col items-center gap-1.5"
                  >
                    <span className="text-[22px]">{icon}</span>
                    <span className="text-[12px] font-bold text-ink-dim">{label}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => nav(`/leafdoc?runId=${ctx.run.id}`)}
                  className="card card-tap p-3 flex flex-col items-center gap-1.5"
                  style={{ borderColor: 'var(--color-accent)' }}
                >
                  <span className="text-[22px]">🔬</span>
                  <span className="text-[12px] font-bold" style={{ color: 'var(--color-accent)' }}>LeafDoc</span>
                </button>
              </div>
            )}

            {/* Pflanzen im Zelt: Einzelstatus, tap → Detail */}
            <section>
              <p className="px-label mb-2">Pflanzen ({ctx.plants.length})</p>
              <div className="grid grid-cols-2 gap-2.5">
                {ctx.plants.map((p) => {
                  const ph = computePlantHealth(ctx, p.id);
                  const pa = wateringAmpel(ctx, isoDate(), p.id);
                  const ps = plantStrain(ctx, p);
                  return (
                    <Card key={p.id} onClick={() => setPlantId(p.id)} className="!p-3">
                      <div className="flex items-center gap-2.5">
                        <Buddy stage={buddyStage(ctx.run, ps)} emotion={ph.emotion} size={38} animate={false} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-bold truncate">{p.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <AmpelDot status={pa.status} />
                            <span className="text-[10px] text-ink-faint truncate">{ps.floweringType === 'auto' ? 'Auto' : 'Photo'} · {ctx.run.potSizeL} L</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>

            {/* Empfehlungen */}
            {recs.length > 0 && (
              <section>
                <p className="px-label mb-2">Empfehlungen</p>
                <div className="flex flex-col gap-2">
                  {recs.map((r) => (
                    <Card key={r.id}>
                      <div className="flex gap-3 items-start">
                        <span className="text-[20px] leading-none mt-0.5">{r.icon}</span>
                        <div>
                          <h4 className="font-bold text-[13px]">{r.title}</h4>
                          <p className="text-[12px] text-ink-dim leading-relaxed mt-0.5">{r.text}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Abschluss-Statistik */}
            {finished && (
              <Card>
                <p className="px-label mb-2">Run-Statistik</p>
                <div className="grid grid-cols-2 gap-3 text-[13px]">
                  <div><span className="text-ink-faint">Dauer:</span> <b>{Math.max(1, Math.round(((new Date(ctx.run.phaseHistory[ctx.run.phaseHistory.length - 1].startedAt).getTime() - new Date(ctx.run.startDate).getTime()) / 86400000)))} Tage</b></div>
                  <div><span className="text-ink-faint">Pflanzen:</span> <b>{ctx.plants.length}</b></div>
                  {harvestEntry && (() => {
                    const h = harvestEntry.data as HarvestData;
                    return (
                      <>
                        {h.wetGrams != null && <div><span className="text-ink-faint">Feucht:</span> <b>{h.wetGrams} g</b></div>}
                        {h.dryGrams != null && <div><span className="text-ink-faint">Trocken:</span> <b>{h.dryGrams} g</b></div>}
                      </>
                    );
                  })()}
                </div>
              </Card>
            )}

            {/* Setup-Infos */}
            <Card>
              <p className="px-label mb-2">Setup</p>
              <div className="text-[13px] text-ink-dim flex flex-col gap-1">
                <span>{ctx.env.type === 'outdoor' ? '☀️ Outdoor' : `🏕 ${ctx.env.name}${ctx.env.sizeText ? ` · ${ctx.env.sizeText}` : ''} · ${ctx.env.lightType.toUpperCase()} ${ctx.env.watts ?? '?'} W · ${ctx.env.lightCycle}`}</span>
                <span>🟫 {ctx.substrate.brand} {ctx.substrate.name} · pH-Ziel {ctx.substrate.phRange[0]}–{ctx.substrate.phRange[1]}</span>
                <span>🧪 {ctx.nutrientLine ? `${ctx.nutrientLine.brand} ${ctx.nutrientLine.name}` : 'Ohne Düngeschema'}</span>
                <span>🪴 {ctx.run.potSizeL} L Töpfe · Keimung: {ctx.run.germinationMethod}</span>
              </div>
            </Card>
          </>
        )}

        {tab === 'journal' && <JournalList runId={ctx.run.id} />}
        {tab === 'schema' && <ScheduleView ctx={ctx} />}
      </main>

      {/* Log-Sheets (key erzwingt frischen State je Öffnung) */}
      {sheet?.kind === 'watering' && <WateringSheet key={`w-${sheet.plantId}`} ctx={ctx} open onClose={() => setSheet(null)} plantId={sheet.plantId} />}
      {sheet?.kind === 'training' && <TrainingSheet key={`t-${sheet.plantId}`} ctx={ctx} open onClose={() => setSheet(null)} plantId={sheet.plantId} />}
      {sheet?.kind === 'repot' && <RepotSheet ctx={ctx} open onClose={() => setSheet(null)} />}
      {sheet?.kind === 'problem' && <ProblemSheet key={`p-${sheet.plantId}`} ctx={ctx} open onClose={() => setSheet(null)} plantId={sheet.plantId} />}
      {sheet?.kind === 'note' && <NoteSheet key={`n-${sheet.plantId}`} ctx={ctx} open onClose={() => setSheet(null)} plantId={sheet.plantId} />}
      {sheet?.kind === 'phase' && <PhaseDialog ctx={ctx} open onClose={() => setSheet(null)} />}
      {sheet?.kind === 'harvest' && <HarvestSheet ctx={ctx} open onClose={() => setSheet(null)} />}

      <PlantSheet
        ctx={ctx}
        plant={selectedPlant}
        onClose={() => setPlantId(null)}
        onLog={(kind, pid) => openLog(kind, pid)}
      />
    </div>
  );
}

/** Routen-Wrapper mit Header + Löschen */
export function RunDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const run = useLiveQuery(() => db.runs.get(id!), [id]);

  const removeRun = async () => {
    if (run && confirm(`Run „${run.name}" inklusive Journal wirklich löschen?`)) {
      await deleteRun(run.id);
      nav('/', { replace: true });
    }
  };

  return (
    <div>
      <Header
        title={run?.name ?? 'Run'}
        back={() => nav('/')}
        right={<button type="button" onClick={removeRun} aria-label="Run löschen" className="text-ink-faint text-lg px-2">🗑</button>}
      />
      {id && <RunView runId={id} />}
    </div>
  );
}
