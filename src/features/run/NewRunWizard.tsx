import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, isoDate, uid } from '@/db/db';
import { createRun } from '@/db/repo';
import { recommendLightCycle } from '@/domain/phases';
import type {
  Difficulty, Environment, GerminationMethod, LightType, Strain, SubstrateClass,
} from '@/db/types';
import { SUBSTRATE_CLASS_ICONS, SUBSTRATE_CLASS_LABELS } from '@/db/types';
import { Button, Card, Field, Header } from '@/components/ui';
import { Buddy } from '@/buddy/Buddy';

const DIFF_LABEL: Record<Difficulty, string> = { anfaenger: 'Anfänger', mittel: 'Mittel', fortgeschritten: 'Fortgeschritten' };
const DIFF_COLOR: Record<Difficulty, string> = { anfaenger: 'var(--color-st-green)', mittel: 'var(--color-st-yellow)', fortgeschritten: 'var(--color-st-orange)' };

const GERM_OPTIONS: { value: GerminationMethod; label: string; desc: string }[] = [
  { value: 'wasserglas', label: '🥛 Glas Wasser', desc: '24–48 h einweichen, bis die Keimwurzel sichtbar ist.' },
  { value: 'papiertuch', label: '🧻 Papiertuch', desc: 'Zwischen feuchten Tüchern, dunkel & warm (22–25 °C).' },
  { value: 'substrat', label: '🪴 Direkt ins Substrat', desc: '0,5–1 cm tief, feucht halten – wie in der Natur.' },
  { value: 'jiffy', label: '🟤 Jiffy', desc: 'In die Quelltablette, später komplett einpflanzen.' },
];

interface StrainGroup {
  breeder: string;
  strainId: string;
  count: number;
}

const STEPS = ['Anbauart', 'Pflanzen', 'Substrat', 'Licht & Dünger', 'Start'];

export function NewRunWizard() {
  const nav = useNavigate();
  const strains = useLiveQuery(() => db.strains.toArray(), []);
  const environments = useLiveQuery(() => db.environments.toArray(), []);
  const substrates = useLiveQuery(() => db.substrates.toArray(), []);
  const nutrientLines = useLiveQuery(() => db.nutrientLines.toArray(), []);
  const settings = useLiveQuery(() => db.settings.get('app'), []);
  const beginner = settings ? !settings.experienced : false;

  const [step, setStep] = useState(0);

  // Schritt 0: Anbauart / vorhandene Umgebung
  const [growType, setGrowType] = useState<'indoor' | 'outdoor'>('indoor');
  const [existingEnvId, setExistingEnvId] = useState<string | null>(null);

  // Schritt 1: Pflanzen & Töpfe
  const [groups, setGroups] = useState<StrainGroup[]>([]);
  const [potSize, setPotSize] = useState('11');
  const [waterVol, setWaterVol] = useState('1');

  // Schritt 2: Substrat
  const [subClass, setSubClass] = useState<SubstrateClass | null>(null);
  const [substrateId, setSubstrateId] = useState<string | null>(null);

  // Schritt 3: Licht & Dünger
  const [lightType, setLightType] = useState<LightType>('led');
  const [watts, setWatts] = useState('150');
  const [envSize, setEnvSize] = useState('80×80×180 cm');
  const [nutrientLineId, setNutrientLineId] = useState<string | null>(null);

  // Schritt 4: Start
  const [runName, setRunName] = useState('');
  const [germMethod, setGermMethod] = useState<GerminationMethod>('wasserglas');
  const [startDate, setStartDate] = useState(isoDate());

  const existingEnv = environments?.find((e) => e.id === existingEnvId) ?? null;
  const breeders = useMemo(
    () => [...new Set((strains ?? []).map((s) => s.breeder))].sort(),
    [strains],
  );
  const strainById = (id: string) => strains?.find((s) => s.id === id);
  const selectedStrains = groups.map((g) => strainById(g.strainId)).filter((s): s is Strain => !!s);
  const totalPlants = groups.reduce((sum, g) => sum + g.count, 0);
  const primaryStrain = selectedStrains[0];

  const effSubstrateId = existingEnv ? existingEnv.substrateId : substrateId;
  const effSubstrate = substrates?.find((s) => s.id === effSubstrateId);
  const recommendedCycle = recommendLightCycle(selectedStrains, existingEnv?.type ?? growType);

  const matchingLines = useMemo(
    () => (nutrientLines ?? []).filter((l) => !effSubstrate || l.substrates.includes(effSubstrate.class)),
    [nutrientLines, effSubstrate],
  );

  /* ---- Navigation mit Skips ---- */
  const goNext = () => {
    if (step === 1 && existingEnv) { setStep(3); return; } // Substrat kommt aus der Umgebung
    setStep(Math.min(4, step + 1));
  };
  const goBack = () => {
    if (step === 0) { nav('/'); return; }
    if (step === 3 && existingEnv) { setStep(1); return; }
    setStep(step - 1);
  };

  const addGroup = () => {
    const firstBreeder = breeders[0] ?? '';
    const firstStrain = (strains ?? []).find((s) => s.breeder === firstBreeder);
    setGroups([...groups, { breeder: firstBreeder, strainId: firstStrain?.id ?? '', count: 1 }]);
  };

  const updateGroup = (i: number, patch: Partial<StrainGroup>) => {
    const next = [...groups];
    next[i] = { ...next[i], ...patch };
    // Breeder gewechselt → ersten Strain des Breeders vorauswählen
    if (patch.breeder) {
      const first = (strains ?? []).find((s) => s.breeder === patch.breeder);
      next[i].strainId = first?.id ?? '';
    }
    setGroups(next);
  };

  const create = async () => {
    let envId: string;
    if (existingEnv) {
      envId = existingEnv.id;
    } else {
      const env: Environment = {
        id: uid(),
        name: growType === 'indoor' ? 'Mein Zelt' : 'Outdoor',
        type: growType,
        sizeText: growType === 'indoor' ? envSize : undefined,
        lightType: growType === 'indoor' ? lightType : 'sonne',
        watts: growType === 'indoor' ? (parseInt(watts) || undefined) : undefined,
        lightCycle: recommendedCycle ?? '18/6',
        substrateId: substrateId!,
      };
      await db.environments.add(env);
      envId = env.id;
    }

    // Pflanzen aus den Strain-Gruppen: "White Widow 1", "White Widow 2", …
    const plants: { strainId: string; name: string }[] = [];
    for (const g of groups) {
      const s = strainById(g.strainId);
      for (let i = 0; i < g.count; i++) {
        plants.push({ strainId: g.strainId, name: g.count > 1 ? `${s?.name} ${i + 1}` : (s?.name ?? 'Pflanze') });
      }
    }

    const runId = await createRun({
      name: runName.trim() || `${primaryStrain?.name ?? 'Mein'} Run`,
      environmentId: envId,
      nutrientLineId,
      potSizeL: parseFloat(potSize.replace(',', '.')) || 11,
      waterVolumeL: parseFloat(waterVol.replace(',', '.')) || 1,
      germinationMethod: germMethod,
      startDate,
      plants,
    });
    nav(`/run/${runId}`, { replace: true });
  };

  const stepValid = [
    true,
    groups.length > 0 && groups.every((g) => g.strainId && g.count > 0),
    !!substrateId,
    true,
    true,
  ][step];

  /* ===== Render ===== */
  return (
    <div>
      <Header title="Neuer Run" sub={`${STEPS[step]} · Schritt ${step + 1} von 5`} back={goBack} />
      <div className="flex gap-1.5 px-4 pt-3">
        {STEPS.map((_, i) => (
          <div key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i <= step ? 'var(--color-accent)' : 'var(--color-bg3)' }} />
        ))}
      </div>
      <main className="px-4 pt-4 pb-8">

        {/* ---- Schritt 0: Anbauart ---- */}
        {step === 0 && (
          <div className="flex flex-col gap-3">
            {beginner && (
              <p className="text-[13px] text-ink-dim leading-relaxed px-1">
                Wo wächst dein Grow? Das bestimmt, was wir abfragen müssen –
                Outdoor braucht z. B. weder Lampe noch Lichtzyklus.
              </p>
            )}
            {([
              ['indoor', '🏕', 'Indoor', 'Zelt oder Box – volle Kontrolle über Licht & Klima.'],
              ['outdoor', '☀️', 'Outdoor', 'Garten oder Balkon – die Sonne übernimmt das Licht.'],
            ] as const).map(([value, icon, label, desc]) => (
              <Card
                key={value}
                onClick={() => { setGrowType(value); setExistingEnvId(null); }}
                className={growType === value && !existingEnvId ? '!border-accent' : ''}
              >
                <div className="flex items-center gap-4">
                  <span className="text-[32px]">{icon}</span>
                  <div className="flex-1">
                    <h3 className="font-bold text-[16px]">{label}</h3>
                    <p className="text-[12px] text-ink-dim mt-0.5">{desc}</p>
                  </div>
                  {growType === value && !existingEnvId && <span className="text-accent text-xl">✓</span>}
                </div>
              </Card>
            ))}

            {(environments?.length ?? 0) > 0 && (
              <>
                <p className="px-label mt-2">Oder vorhandenes Setup nutzen</p>
                {environments!.map((e) => (
                  <Card key={e.id} onClick={() => setExistingEnvId(existingEnvId === e.id ? null : e.id)} className={existingEnvId === e.id ? '!border-accent' : ''}>
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-[14px]">{e.name}</h4>
                        <p className="text-[12px] text-ink-dim">
                          {e.type === 'outdoor' ? '☀️ Outdoor' : `🏕 ${e.lightType.toUpperCase()} ${e.watts ?? '?'} W`}
                          {' · '}{substrates?.find((s) => s.id === e.substrateId)?.name}
                        </p>
                      </div>
                      {existingEnvId === e.id && <span className="text-accent text-xl">✓</span>}
                    </div>
                  </Card>
                ))}
              </>
            )}
            <Button className="w-full mt-2" onClick={goNext}>Weiter</Button>
          </div>
        )}

        {/* ---- Schritt 1: Pflanzen & Töpfe ---- */}
        {step === 1 && (
          <div className="flex flex-col gap-3">
            <Card className="!border-st-yellow/40" >
              <p className="text-[13px] leading-relaxed">
                ⚖️ <b>Rechtlicher Hinweis:</b> In Deutschland sind laut CanG max.{' '}
                <b>3 Pflanzen pro volljähriger Person</b> im Haushalt erlaubt.
              </p>
              {totalPlants > 3 && (
                <p className="text-[12px] font-bold mt-2" style={{ color: 'var(--color-st-orange)' }}>
                  Du planst {totalPlants} Pflanzen – das ist nur mit mehreren volljährigen Personen im Haushalt legal.
                </p>
              )}
            </Card>

            {groups.map((g, i) => {
              const groupStrains = (strains ?? []).filter((s) => s.breeder === g.breeder);
              const s = strainById(g.strainId);
              return (
                <Card key={i}>
                  <div className="flex justify-between items-center mb-3">
                    <p className="px-label">Sorte {i + 1}</p>
                    {groups.length > 1 && (
                      <button type="button" className="text-[12px] text-ink-faint underline" onClick={() => setGroups(groups.filter((_, j) => j !== i))}>
                        entfernen
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Breeder">
                      <select className="input" value={g.breeder} onChange={(e) => updateGroup(i, { breeder: e.target.value })}>
                        {breeders.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </Field>
                    <Field label="Strain">
                      <select className="input" value={g.strainId} onChange={(e) => updateGroup(i, { strainId: e.target.value })}>
                        {groupStrains.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
                      </select>
                    </Field>
                  </div>
                  {s && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-dim mb-3">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: `color-mix(in srgb, ${DIFF_COLOR[s.difficulty]} 18%, transparent)`, color: DIFF_COLOR[s.difficulty] }}>
                        {DIFF_LABEL[s.difficulty]}
                      </span>
                      <span>{s.floweringType === 'auto' ? '⚡ Autoflower' : '🌗 Photoperiodisch'}</span>
                      <span>🌸 {s.flowerWeeks[0]}–{s.flowerWeeks[1]} Wo. Blüte</span>
                      <span>⚖️ {s.yieldDesc}</span>
                    </div>
                  )}
                  {beginner && s && <p className="text-[12px] text-ink-faint leading-relaxed mb-3">{s.notes}</p>}
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold">Anzahl Pflanzen</span>
                    <div className="flex items-center gap-3">
                      <button type="button" className="w-10 h-10 rounded-xl bg-bg3 border border-line font-bold text-lg" onClick={() => updateGroup(i, { count: Math.max(1, g.count - 1) })}>−</button>
                      <span className="w-6 text-center font-bold text-[17px]">{g.count}</span>
                      <button type="button" className="w-10 h-10 rounded-xl bg-bg3 border border-line font-bold text-lg" onClick={() => updateGroup(i, { count: Math.min(9, g.count + 1) })}>+</button>
                    </div>
                  </div>
                </Card>
              );
            })}

            <Button variant="secondary" onClick={addGroup}>
              {groups.length === 0 ? '🌱 Sorte wählen' : '+ Weitere Sorte (Mix-Run)'}
            </Button>
            {beginner && groups.length === 0 && (
              <p className="text-[12px] text-ink-faint px-1 leading-relaxed">
                Für den ersten Grow empfehlen wir <b>eine</b> Sorte mit Schwierigkeit „Anfänger" –
                z. B. White Widow oder Northern Lights.
              </p>
            )}

            {groups.length > 0 && (
              <Card>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Topfgröße (L)" hint="11 L ist der Allrounder. Autos direkt in den Endtopf (12–15 L)." beginner={beginner} beginnerHint={primaryStrain ? `Empfohlen für ${primaryStrain.name}: ${primaryStrain.potSizeL} L` : undefined}>
                    <input className="input" inputMode="decimal" value={potSize} onChange={(e) => setPotSize(e.target.value)} />
                  </Field>
                  <Field label="Gießmenge (L)" hint="Pro Pflanze und Gießvorgang. Faustregel: 10–20 % des Topfvolumens.">
                    <input className="input" inputMode="decimal" value={waterVol} onChange={(e) => setWaterVol(e.target.value)} />
                  </Field>
                </div>
              </Card>
            )}

            <Button className="w-full" disabled={!stepValid} onClick={() => {
              if (primaryStrain) { setPotSize((p) => p || String(primaryStrain.potSizeL)); setRunName(`${primaryStrain.name} Run`); }
              goNext();
            }}>Weiter</Button>
          </div>
        )}

        {/* ---- Schritt 2: Substrat (Kategorie → Produkt) ---- */}
        {step === 2 && (
          <div className="flex flex-col gap-3">
            {beginner && (
              <p className="text-[13px] text-ink-dim leading-relaxed px-1">
                Das <b>Substrat</b> ist das Zuhause deiner Wurzeln. Es bestimmt, wie oft du gießt,
                welchen pH-Wert du brauchst und welche Dünger passen.
              </p>
            )}
            <p className="px-label">Worauf baust du an?</p>
            <div className="grid grid-cols-2 gap-2.5">
              {(Object.keys(SUBSTRATE_CLASS_LABELS) as SubstrateClass[]).map((cls) => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => { setSubClass(cls); setSubstrateId(null); }}
                  className={`card card-tap p-3.5 flex flex-col items-center gap-1.5 ${subClass === cls ? '!border-accent' : ''}`}
                >
                  <span className="text-[26px]">{SUBSTRATE_CLASS_ICONS[cls]}</span>
                  <span className="text-[13px] font-bold">{SUBSTRATE_CLASS_LABELS[cls]}</span>
                  {beginner && cls === 'soil' && <span className="text-[10px] text-ink-faint">Anfänger-Tipp ✓</span>}
                </button>
              ))}
            </div>

            {subClass && (
              <>
                <p className="px-label mt-2">Hersteller / Produkt</p>
                {(substrates ?? []).filter((s) => s.class === subClass).map((s) => (
                  <Card key={s.id} onClick={() => setSubstrateId(s.id)} className={substrateId === s.id ? '!border-accent' : ''}>
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="font-bold text-[14px]">{s.brand} {s.name}</h4>
                        <p className="text-[12px] text-ink-dim mt-0.5">pH {s.phRange[0]}–{s.phRange[1]} · Gießintervall ~{s.baseWateringIntervalDays} Tag{s.baseWateringIntervalDays > 1 ? 'e' : ''}</p>
                        {beginner && <p className="text-[12px] text-ink-faint mt-1 leading-relaxed">{s.description}</p>}
                      </div>
                      {substrateId === s.id && <span className="text-accent text-xl flex-none">✓</span>}
                    </div>
                  </Card>
                ))}
              </>
            )}
            <Button className="w-full" disabled={!stepValid} onClick={goNext}>Weiter</Button>
          </div>
        )}

        {/* ---- Schritt 3: Licht & Dünger ---- */}
        {step === 3 && (
          <div className="flex flex-col gap-3">
            {!existingEnv && growType === 'indoor' && (
              <Card>
                <p className="px-label mb-3">💡 Dein Licht</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Lampentyp">
                    <select className="input" value={lightType} onChange={(e) => setLightType(e.target.value as LightType)}>
                      <option value="led">LED</option>
                      <option value="hps">HPS / NDL</option>
                      <option value="cfl">CFL / ESL</option>
                    </select>
                  </Field>
                  <Field label="Watt">
                    <input className="input" type="number" inputMode="numeric" value={watts} onChange={(e) => setWatts(e.target.value)} />
                  </Field>
                </div>
                <Field label="Zeltgröße (optional)">
                  <input className="input" value={envSize} onChange={(e) => setEnvSize(e.target.value)} />
                </Field>
              </Card>
            )}

            {/* Lichtzyklus: Empfehlung statt Abfrage */}
            {(existingEnv?.type ?? growType) === 'indoor' ? (
              <Card className="!border-accent/40">
                <div className="flex items-start gap-3">
                  <span className="text-[22px]">⏱</span>
                  <div>
                    <h4 className="font-bold text-[14px]">Lichtzyklus: {recommendedCycle ?? '18/6'} <span className="text-[11px] font-normal text-ink-faint">(empfohlen)</span></h4>
                    <p className="text-[12px] text-ink-dim mt-1 leading-relaxed">
                      {recommendedCycle === '20/4'
                        ? 'Deine Autoflower blühen von selbst – 20 Stunden Licht von Start bis Ernte, kein Umstellen nötig.'
                        : 'Photoperiodische Pflanzen wachsen mit 18 h Licht. Auf 12/12 stellst du erst beim Blüte-Start um – GrowMate erinnert dich rechtzeitig.'}
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <Card>
                <p className="text-[13px] text-ink-dim">☀️ Outdoor: Die Sonne regelt den Lichtzyklus – hier gibt's nichts einzustellen.</p>
              </Card>
            )}

            <Field
              label="Düngelinie"
              hint="GrowMate rechnet dir jede Woche die exakten ml-Mengen aus dem Herstellerschema aus – passend zu deinem Substrat gefiltert."
              beginner={beginner}
              beginnerHint="Du kannst auch ohne Schema starten und Düngergaben frei loggen."
            >
              <select className="input" value={nutrientLineId ?? ''} onChange={(e) => setNutrientLineId(e.target.value || null)}>
                <option value="">Ohne Düngeschema</option>
                {matchingLines.map((l) => <option key={l.id} value={l.id}>{l.brand} – {l.name}</option>)}
              </select>
            </Field>

            <Button className="w-full" onClick={goNext}>Weiter</Button>
          </div>
        )}

        {/* ---- Schritt 4: Start ---- */}
        {step === 4 && (
          <div className="flex flex-col gap-3">
            <div className="pixel-frame bg-bg2 p-4 flex items-center gap-4">
              <Buddy stage={1} size={60} />
              <div className="min-w-0">
                <h3 className="font-bold text-[15px]">Fast geschafft!</h3>
                <p className="text-[12px] text-ink-dim mt-0.5 leading-relaxed">
                  {totalPlants} Pflanze{totalPlants > 1 ? 'n' : ''} · {selectedStrains.map((s) => s.name).filter((v, i, a) => a.indexOf(v) === i).join(' + ')}
                  {' · '}{effSubstrate ? `${effSubstrate.brand} ${effSubstrate.name}` : ''}
                  {nutrientLineId ? ` · ${matchingLines.find((l) => l.id === nutrientLineId)?.brand}` : ''}
                </p>
              </div>
            </div>

            <Field label="Run-Name">
              <input className="input" value={runName} onChange={(e) => setRunName(e.target.value)} placeholder={`${primaryStrain?.name ?? 'Mein'} Run`} />
            </Field>

            <Field label="Keimungsmethode">
              <div className="flex flex-col gap-2">
                {GERM_OPTIONS.map((g) => (
                  <Card key={g.value} onClick={() => setGermMethod(g.value)} className={germMethod === g.value ? '!border-accent' : ''}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-[14px]">{g.label}</h4>
                        {beginner && <p className="text-[12px] text-ink-dim mt-0.5">{g.desc}</p>}
                      </div>
                      {germMethod === g.value && <span className="text-accent text-xl flex-none">✓</span>}
                    </div>
                  </Card>
                ))}
              </div>
            </Field>

            <Field label="Startdatum">
              <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>

            <Button className="w-full" onClick={create}>🌱 Run starten</Button>
          </div>
        )}
      </main>
    </div>
  );
}
