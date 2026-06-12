import React, { useMemo, useState } from 'react';
import { db } from '@/db/db';
import { addEntry } from '@/db/repo';
import type { RunContext } from '@/domain/context';
import { scheduleStatus } from '@/domain/nutrients';
import type { NutrientDose, TrainingKind } from '@/db/types';
import { Button, Chip, Field, Sheet } from '@/components/ui';
import { pickPhoto } from '@/components/photo';
import { refreshNotifications } from '@/notify/notifications';
import { TrainingDiagram, TRAINING_INFO } from './TrainingDiagrams';

function PhotoPicker({ photo, onPhoto }: { photo?: string; onPhoto: (p: string | undefined) => void }) {
  return (
    <div className="mb-4">
      <p className="text-[13px] font-bold mb-1.5">Foto (optional)</p>
      {photo ? (
        <div className="relative">
          <img src={photo} alt="Foto" className="rounded-xl w-full max-h-48 object-cover" />
          <button type="button" onClick={() => onPhoto(undefined)} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 text-white">✕</button>
        </div>
      ) : (
        <label className="card flex items-center justify-center h-20 cursor-pointer text-ink-dim text-[13px] font-semibold">
          📷 Foto aufnehmen / wählen
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) onPhoto(await pickPhoto(f));
            }}
          />
        </label>
      )}
    </div>
  );
}

/**
 * Gilt der Eintrag für alle Pflanzen oder eine einzelne?
 * Standard: ganzer Run – das Tamagotchi-Prinzip. Einzelne Pflanze bei Bedarf.
 */
function PlantPicker({ ctx, value, onChange }: { ctx: RunContext; value: string | null; onChange: (v: string | null) => void }) {
  if (ctx.plants.length <= 1) return null;
  return (
    <div className="mb-4">
      <p className="text-[13px] font-bold mb-1.5">Gilt für</p>
      <div className="flex flex-wrap gap-2">
        <Chip label={`Alle ${ctx.plants.length} Pflanzen`} active={value === null} onClick={() => onChange(null)} />
        {ctx.plants.map((p) => (
          <Chip key={p.id} label={p.name} active={value === p.id} onClick={() => onChange(p.id)} />
        ))}
      </div>
    </div>
  );
}

interface SheetProps {
  ctx: RunContext;
  open: boolean;
  onClose: () => void;
  /** Vorauswahl: Eintrag nur für diese Pflanze */
  plantId?: string | null;
}

/* ===== Bewässerung (inkl. Düngung – vorbefüllt aus dem Schema) ===== */
export function WateringSheet({ ctx, open, onClose, plantId }: SheetProps) {
  const [selPlant, setSelPlant] = useState<string | null>(plantId ?? null);
  const [liters, setLiters] = useState(String(ctx.run.waterVolumeL));
  const [ph, setPh] = useState('');
  const [ec, setEc] = useState('');
  const [note, setNote] = useState('');
  const [withNutrients, setWithNutrients] = useState(true);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  const litersNum = parseFloat(liters.replace(',', '.')) || 0;
  const sched = useMemo(() => scheduleStatus(ctx, litersNum), [ctx, litersNum]);
  const phTarget = ctx.substrate.phRange;

  const doses: NutrientDose[] = (withNutrients && sched && !sched.isFlushWeek ? sched.doses : [])
    .filter((d) => !excluded.has(d.productId))
    .map((d) => ({ productId: d.productId, name: d.name, ml: d.totalMl }));

  const save = async () => {
    await addEntry({
      runId: ctx.run.id,
      plantId: selPlant,
      type: 'watering',
      data: {
        liters: litersNum,
        ph: ph ? parseFloat(ph.replace(',', '.')) : undefined,
        ec: ec ? parseFloat(ec.replace(',', '.')) : undefined,
        nutrients: doses,
        note: note || undefined,
      },
    });
    void refreshNotifications();
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="💧 Bewässerung loggen">
      <PlantPicker ctx={ctx} value={selPlant} onChange={setSelPlant} />
      {sched?.isFlushWeek && (
        <div className="card p-3 mb-4" style={{ borderColor: 'var(--color-st-orange)' }}>
          <p className="text-[13px] font-bold" style={{ color: 'var(--color-st-orange)' }}>🚿 Flush-Woche!</p>
          <p className="text-[12px] text-ink-dim mt-1">Nur klares, pH-reguliertes Wasser – kein Dünger mehr.</p>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        <Field label="Liter / Pflanze">
          <input className="input" inputMode="decimal" value={liters} onChange={(e) => setLiters(e.target.value)} />
        </Field>
        <Field label="pH" hint={`Zielbereich für ${ctx.substrate.name}: ${phTarget[0]}–${phTarget[1]}`}>
          <input className="input" inputMode="decimal" placeholder={`${phTarget[0]}–${phTarget[1]}`} value={ph} onChange={(e) => setPh(e.target.value)} />
        </Field>
        <Field label="EC" hint="Elektrische Leitfähigkeit der Nährlösung in mS/cm – zeigt, wie viel Dünger im Wasser ist.">
          <input className="input" inputMode="decimal" placeholder="z. B. 1,2" value={ec} onChange={(e) => setEc(e.target.value)} />
        </Field>
      </div>

      {sched && sched.doses.length > 0 && !sched.isFlushWeek && (
        <div className="card p-3.5 mb-4">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-[14px] font-bold">🧪 Mit Düngung ({sched.row?.label})</span>
            <input type="checkbox" checked={withNutrients} onChange={(e) => setWithNutrients(e.target.checked)} className="w-5 h-5 accent-[#9be15d]" />
          </label>
          {withNutrients && (
            <div className="mt-3 flex flex-col gap-2">
              {sched.doses.map((d) => {
                const off = excluded.has(d.productId);
                return (
                  <button
                    key={d.productId}
                    type="button"
                    onClick={() => {
                      const next = new Set(excluded);
                      off ? next.delete(d.productId) : next.add(d.productId);
                      setExcluded(next);
                    }}
                    className={`flex justify-between items-center px-3 py-2.5 rounded-lg border text-left ${off ? 'opacity-40 border-line' : 'border-accent/40'}`}
                    style={!off ? { background: 'color-mix(in srgb, var(--color-accent) 8%, transparent)' } : undefined}
                  >
                    <span className="text-[13px] font-semibold">{d.name}</span>
                    <span className="text-[13px] font-bold" style={{ color: 'var(--color-nute)' }}>
                      {d.totalMl}{d.totalMlMax ? `–${d.totalMlMax}` : ''} ml
                    </span>
                  </button>
                );
              })}
              <p className="text-[11px] text-ink-faint">Berechnet für {litersNum} L. Tippe ein Produkt an, um es wegzulassen.</p>
            </div>
          )}
        </div>
      )}

      <Field label="Notiz (optional)">
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="z. B. Ablauf gut, Erde war sehr trocken" />
      </Field>
      <Button className="w-full" onClick={save} disabled={litersNum <= 0}>Speichern</Button>
    </Sheet>
  );
}

/* ===== Training (mit Schaubildern) ===== */
export function TrainingSheet({ ctx, open, onClose, plantId }: SheetProps) {
  const [selPlant, setSelPlant] = useState<string | null>(plantId ?? null);
  const [kind, setKind] = useState<TrainingKind>('LST');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<string>();
  const info = TRAINING_INFO[kind];

  const save = async () => {
    await addEntry({ runId: ctx.run.id, plantId: selPlant, type: 'training', data: { kind, note: note || undefined }, photo });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="✂️ Training loggen">
      <PlantPicker ctx={ctx} value={selPlant} onChange={setSelPlant} />
      <div className="flex flex-wrap gap-2 mb-3">
        {(Object.keys(TRAINING_INFO) as TrainingKind[]).map((t) => (
          <Chip key={t} label={t} active={kind === t} onClick={() => setKind(t)} color="var(--color-train)" />
        ))}
      </div>

      {/* Schaubild: So funktioniert die Methode */}
      <div className="card p-3 mb-3">
        <TrainingDiagram kind={kind} />
        <p className="text-[13px] leading-relaxed mt-3">{info.how}</p>
        <p className="text-[12px] text-ink-dim leading-relaxed mt-2">💡 <b>Warum?</b> {info.why}</p>
        {info.warn && <p className="text-[12px] font-semibold mt-2" style={{ color: 'var(--color-st-orange)' }}>⚠️ {info.warn}</p>}
      </div>

      <Field label="Notiz (optional)">
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <PhotoPicker photo={photo} onPhoto={setPhoto} />
      <Button className="w-full" onClick={save}>Speichern</Button>
    </Sheet>
  );
}

/* ===== Umtopfen (immer ganzer Run – Topfgröße ist Run-weit) ===== */
export function RepotSheet({ ctx, open, onClose }: SheetProps) {
  const [toL, setToL] = useState('');
  const [note, setNote] = useState('');

  const save = async () => {
    const to = parseFloat(toL.replace(',', '.'));
    await addEntry({ runId: ctx.run.id, type: 'repot', data: { fromL: ctx.run.potSizeL, toL: to, note: note || undefined } });
    await db.runs.update(ctx.run.id, { potSizeL: to });
    void refreshNotifications();
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="🪴 Umtopfen loggen">
      <p className="text-[13px] text-ink-dim mb-4">Aktuell: {ctx.run.potSizeL} L. Das neue Volumen passt auch dein Gießintervall an.</p>
      <Field label="Neue Topfgröße (L)">
        <input className="input" inputMode="decimal" value={toL} onChange={(e) => setToL(e.target.value)} placeholder="z. B. 11" />
      </Field>
      <Field label="Notiz (optional)">
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <Button className="w-full" onClick={save} disabled={!parseFloat(toL.replace(',', '.'))}>Speichern</Button>
    </Sheet>
  );
}

/* ===== Problem ===== */
export function ProblemSheet({ ctx, open, onClose, plantId }: SheetProps) {
  const [selPlant, setSelPlant] = useState<string | null>(plantId ?? null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'niedrig' | 'mittel' | 'hoch'>('mittel');
  const [photo, setPhoto] = useState<string>();

  const save = async () => {
    await addEntry({
      runId: ctx.run.id,
      plantId: selPlant,
      type: 'problem',
      data: { title: title.trim(), description: description || undefined, severity, status: 'offen', source: 'manuell' },
      photo,
    });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="🩺 Problem loggen">
      <PlantPicker ctx={ctx} value={selPlant} onChange={setSelPlant} />
      <Field label="Was ist los?">
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Gelbe Flecken auf unteren Blättern" />
      </Field>
      <Field label="Beschreibung (optional)">
        <textarea className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Field label="Schweregrad">
        <div className="flex gap-2">
          {(['niedrig', 'mittel', 'hoch'] as const).map((s) => (
            <Chip key={s} label={s} active={severity === s} onClick={() => setSeverity(s)} color={s === 'hoch' ? 'var(--color-st-red)' : s === 'mittel' ? 'var(--color-st-orange)' : 'var(--color-st-yellow)'} />
          ))}
        </div>
      </Field>
      <PhotoPicker photo={photo} onPhoto={setPhoto} />
      <p className="text-[12px] text-ink-faint mb-4">💡 Tipp: LeafDoc kann das Blatt analysieren und das Problem automatisch fürs Journal vorbereiten.</p>
      <Button className="w-full" onClick={save} disabled={!title.trim()}>Speichern</Button>
    </Sheet>
  );
}

/* ===== Notiz ===== */
export function NoteSheet({ ctx, open, onClose, plantId }: SheetProps) {
  const [selPlant, setSelPlant] = useState<string | null>(plantId ?? null);
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<string>();

  const save = async () => {
    await addEntry({ runId: ctx.run.id, plantId: selPlant, type: 'note', data: { text: text.trim() }, photo });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title="📝 Notiz">
      <PlantPicker ctx={ctx} value={selPlant} onChange={setSelPlant} />
      <Field label="Text">
        <textarea className="input" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Was gibt's Neues?" />
      </Field>
      <PhotoPicker photo={photo} onPhoto={setPhoto} />
      <Button className="w-full" onClick={save} disabled={!text.trim() && !photo}>Speichern</Button>
    </Sheet>
  );
}
