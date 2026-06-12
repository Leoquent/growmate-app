import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { addEntry } from '@/db/repo';
import { loadRunContext, type RunContext } from '@/domain/context';
import { Button, Card, Header, Sheet } from '@/components/ui';
import { runInference, tfliteAvailable, type ModelType, type Prediction } from './inference';
import { SOLUTIONS, translateLabel } from './solutions';
import { buildDiagnosisContext, contextNotes } from './contextual';
import { pickPhoto } from '@/components/photo';

type Mode = 'idle' | 'wizard' | 'live' | 'frozen' | 'loading';

function confidenceBadge(p: number, isHealthy: boolean, rank: number) {
  if (rank === 0 && p > 0.5) return { text: `Sehr hoch (${Math.round(p * 100)} %)`, bg: isHealthy ? 'var(--color-st-green)' : 'var(--color-st-red)' };
  if (p > 0.1) return { text: `Möglich (${Math.round(p * 100)} %)`, bg: 'var(--color-st-yellow)' };
  return { text: `Gering (${Math.round(p * 100)} %)`, bg: 'var(--color-bg3)' };
}

function SolutionSheet({ label, onClose }: { label: string | null; onClose: () => void }) {
  if (!label) return null;
  const sol = SOLUTIONS[label.toLowerCase()];
  return (
    <Sheet open={!!label} onClose={onClose} title={sol?.title ?? translateLabel(label)}>
      {sol ? (
        <>
          <p className="text-[13px] text-ink-dim italic leading-relaxed mb-3">{sol.text}</p>
          <ul className="flex flex-col gap-2 mb-5">
            {sol.steps.map((s, i) => (
              <li key={i} className="card p-3 text-[13px] leading-relaxed flex gap-2.5">
                <span className="font-bold flex-none" style={{ color: 'var(--color-accent)' }}>{i + 1}.</span> {s}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-[13px] text-ink-dim mb-4">Keine spezifischen Daten für „{label}" vorhanden.</p>
      )}
      <Button variant="secondary" className="w-full" onClick={onClose}>Schließen</Button>
    </Sheet>
  );
}

export function LeafDocScreen() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const activeRuns = useLiveQuery(() => db.runs.where({ status: 'active' }).toArray(), []);
  const [runId, setRunId] = useState<string | null>(params.get('runId'));
  const [ctx, setCtx] = useState<RunContext | null>(null);

  const [mode, setMode] = useState<Mode>('idle');
  const [modelType, setModelType] = useState<ModelType>('Top');
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [pendingAction, setPendingAction] = useState<'camera' | 'upload'>('camera');
  const [predictions, setPredictions] = useState<Prediction[] | null>(null);
  const [leafDetected, setLeafDetected] = useState(true);
  const [frozenPhoto, setFrozenPhoto] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [solutionLabel, setSolutionLabel] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState('');
  const [saved, setSaved] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Run-Kontext laden (Auto-Auswahl bei genau einem aktiven Run)
  useEffect(() => {
    if (!runId && activeRuns?.length === 1) setRunId(activeRuns[0].id);
  }, [activeRuns, runId]);
  useEffect(() => {
    if (runId) loadRunContext(runId).then(setCtx);
    else setCtx(null);
  }, [runId]);

  const diagCtx = useMemo(() => (ctx ? buildDiagnosisContext(ctx) : null), [ctx]);
  const notes = useMemo(() => (ctx && predictions ? contextNotes(predictions, ctx) : []), [ctx, predictions]);

  const stopCamera = () => {
    scanningRef.current = false;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };
  useEffect(() => () => stopCamera(), []);

  const reset = () => {
    stopCamera();
    setPredictions(null);
    setFrozenPhoto(null);
    setErrorMsg(null);
    setSaved(false);
    setSymptoms('');
    setMode('idle');
  };

  const startWizard = (action: 'camera' | 'upload') => {
    setPendingAction(action);
    setWizardStep(1);
    setMode('wizard');
  };

  const wizardDone = async (type: ModelType) => {
    setModelType(type);
    setPredictions(null);
    setErrorMsg(null);
    setSaved(false);
    if (pendingAction === 'upload') {
      setMode('idle');
      fileRef.current?.click();
    } else {
      await startCamera();
    }
  };

  const startCamera = async () => {
    setMode('loading');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      setMode('live');
      // Video-Element ist erst nach dem Render da
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
        scanningRef.current = true;
        setTimeout(liveLoop, 900);
      });
    } catch {
      setErrorMsg('Kamera konnte nicht gestartet werden. Bitte erlaube den Kamerazugriff oder nutze den Foto-Upload.');
      setMode('idle');
    }
  };

  /** Live-Loop: scannt alle ~1,6 s, friert erst bei scharfem Bild + sicherer Diagnose ein */
  const liveLoop = async () => {
    if (!scanningRef.current || !videoRef.current || !streamRef.current) return;
    try {
      setModelLoading(true);
      const res = await runInference(videoRef.current, modelType);
      setModelLoading(false);
      if (res.ok && res.leafDetected && res.predictions[0]?.probability > 0.45) {
        if (res.sharp) {
          // Freeze-Frame: aktuelles Videobild einfrieren
          const video = videoRef.current;
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          scanningRef.current = false;
          stopCamera();
          setFrozenPhoto(dataUrl);
          setPredictions(res.predictions);
          setLeafDetected(true);
          setMode('frozen');
          try { navigator.vibrate?.(150); } catch { /* kein Haptik-Support */ }
          return;
        }
        // unscharf → weiterscannen bis das Bild ruhig ist
      }
    } catch (e) {
      console.warn('Live-Scan übersprungen:', e);
      setModelLoading(false);
    }
    if (scanningRef.current) setTimeout(liveLoop, 1600);
  };

  const captureManually = async () => {
    const video = videoRef.current;
    if (!video) return;
    scanningRef.current = false;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
    stopCamera();
    setFrozenPhoto(canvas.toDataURL('image/jpeg', 0.85));
    setMode('loading');
    const res = await runInference(canvas, modelType);
    if (res.ok) {
      setPredictions(res.predictions);
      setLeafDetected(res.leafDetected);
    } else {
      setErrorMsg(res.message);
    }
    setMode('frozen');
  };

  const handleUpload = async (file: File) => {
    setMode('loading');
    setErrorMsg(null);
    try {
      const dataUrl = await pickPhoto(file);
      setFrozenPhoto(dataUrl);
      const img = new Image();
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error('Bild ungültig'));
        img.src = dataUrl;
      });
      const res = await runInference(img, modelType);
      if (res.ok) {
        setPredictions(res.predictions);
        setLeafDetected(res.leafDetected);
      } else {
        setErrorMsg(res.message);
      }
    } catch (e) {
      setErrorMsg((e as Error).message);
    }
    setMode('frozen');
  };

  const saveToJournal = async () => {
    if (!ctx || !predictions) return;
    const top = predictions[0];
    await addEntry({
      runId: ctx.run.id,
      type: 'problem',
      data: {
        title: `LeafDoc: ${translateLabel(top.label)}`,
        description: symptoms.trim() || undefined,
        severity: top.probability > 0.7 ? 'hoch' : 'mittel',
        status: 'offen',
        source: 'leafdoc',
        diagnosis: predictions.filter((p) => p.probability > 0.01).slice(0, 3).map((p) => ({ label: translateLabel(p.label), confidence: p.probability })),
      },
      photo: frozenPhoto ?? undefined,
    });
    setSaved(true);
  };

  const visible = predictions?.filter((p) => p.probability > 0.01).slice(0, 3) ?? [];
  const areaLabel = modelType === 'Top' ? 'Blattoberseite' : modelType === 'Lower' ? 'Blattunterseite' : 'Schädlinge';

  return (
    <div>
      <Header title="LeafDoc" sub="KI-Blattdoktor – 100 % on-device" />
      <main className="px-4 pt-4 pb-8 flex flex-col gap-4">
        {/* Run-Kontext-Auswahl */}
        <Card>
          <p className="px-label mb-2">Pflanzen-Kontext</p>
          {(activeRuns?.length ?? 0) === 0 ? (
            <p className="text-[13px] text-ink-dim">Kein aktiver Run – die Diagnose läuft ohne Journal-Kontext.</p>
          ) : (
            <select className="input" value={runId ?? ''} onChange={(e) => setRunId(e.target.value || null)}>
              <option value="">Ohne Kontext analysieren</option>
              {activeRuns!.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}
          {diagCtx && (
            <div className="mt-3 flex flex-col gap-1.5">
              {diagCtx.lines.map((l) => (
                <div key={l.label} className="flex gap-2 text-[12px]">
                  <span className="flex-none">{l.icon}</span>
                  <span className="text-ink-faint flex-none">{l.label}:</span>
                  <span className="text-ink-dim min-w-0">{l.value}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {!tfliteAvailable() && (
          <Card><p className="text-[13px]" style={{ color: 'var(--color-st-red)' }}>⚠️ KI-Bibliothek nicht geladen – bitte App neu starten.</p></Card>
        )}

        {/* Scanner-Fläche */}
        {mode === 'live' ? (
          <div className="pixel-frame bg-black relative overflow-hidden" style={{ aspectRatio: '3/4' }}>
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
            <div className="absolute inset-x-0 top-0 p-3 flex justify-between items-center">
              <span className="text-[11px] font-bold bg-black/60 text-white px-2.5 py-1 rounded-full">{areaLabel}</span>
              <span className="text-[11px] font-bold bg-black/60 px-2.5 py-1 rounded-full anim-pulse" style={{ color: 'var(--color-accent)' }}>
                {modelLoading ? '🧠 Modell lädt…' : '● Live-Analyse'}
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 p-4 flex gap-3 justify-center">
              <Button variant="secondary" small onClick={reset}>Abbrechen</Button>
              <Button small onClick={captureManually}>📸 Jetzt aufnehmen</Button>
            </div>
          </div>
        ) : frozenPhoto ? (
          <div className="pixel-frame bg-black relative overflow-hidden">
            <img src={frozenPhoto} alt="Analysiertes Blatt" className="w-full max-h-[420px] object-contain" />
            <span className="absolute top-3 left-3 text-[11px] font-bold bg-black/60 text-white px-2.5 py-1 rounded-full">{areaLabel}</span>
          </div>
        ) : (
          <div className="pixel-frame bg-bg2 flex flex-col items-center justify-center py-12 px-6 text-center">
            <span className="text-[44px] mb-2">🔬</span>
            <p className="font-bold">Blatt analysieren</p>
            <p className="text-[12px] text-ink-dim mt-1 max-w-[260px] leading-relaxed">
              Drei spezialisierte KI-Modelle erkennen Mängel, Krankheiten und Schädlinge – offline auf deinem Gerät.
            </p>
            {mode === 'loading' && <p className="text-[12px] mt-3 anim-pulse" style={{ color: 'var(--color-accent)' }}>🧠 KI-Modell lädt (einmalig ~45 MB)…</p>}
          </div>
        )}

        {mode !== 'live' && (
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => startWizard('camera')} disabled={mode === 'loading'}>📷 Live-Scan</Button>
            <Button variant="secondary" onClick={() => startWizard('upload')} disabled={mode === 'loading'}>🖼 Foto hochladen</Button>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f); e.target.value = ''; }}
        />

        {errorMsg && (
          <Card><p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-st-orange)' }}>⚠️ {errorMsg}</p></Card>
        )}

        {/* Ergebnisse */}
        {predictions && mode === 'frozen' && (
          <>
            {!leafDetected ? (
              <Card>
                <p className="font-bold text-[14px]">🍃 Kein Blatt erkannt</p>
                <p className="text-[13px] text-ink-dim mt-1 leading-relaxed">
                  Stelle sicher, dass das Blatt gut sichtbar, scharf und im Fokus ist – und genug grünes Gewebe zeigt.
                </p>
              </Card>
            ) : (
              <>
                <section>
                  <p className="px-label mb-2">Diagnose ({areaLabel})</p>
                  <div className="flex flex-col gap-2">
                    {visible.map((p, i) => {
                      const isHealthy = p.label.toLowerCase() === 'healthy';
                      const badge = confidenceBadge(p.probability, isHealthy, i);
                      return (
                        <div key={p.label} className="card p-3 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[14px]">{translateLabel(p.label)}</p>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full inline-block mt-1" style={{ background: badge.bg, color: '#10240A' }}>
                              {badge.text}
                            </span>
                          </div>
                          <Button small variant="secondary" onClick={() => setSolutionLabel(p.label)}>Lösungen</Button>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-ink-faint mt-2 leading-relaxed">
                    Mehrere hohe Wahrscheinlichkeiten? Dann leidet deine Pflanze vermutlich an mehr als einem Problem.
                  </p>
                </section>

                {/* Kontextuelle Hinweise aus dem Journal */}
                {notes.length > 0 && (
                  <section>
                    <p className="px-label mb-2">Kontext aus deinem Journal</p>
                    <div className="flex flex-col gap-2">
                      {notes.map((n, i) => (
                        <Card key={i} className={n.weight === 'important' ? 'pixel-frame' : ''}>
                          <div className="flex gap-3">
                            <span className="text-[18px] flex-none">{n.icon}</span>
                            <p className="text-[13px] leading-relaxed text-ink-dim">{n.text}</p>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </section>
                )}

                {/* Symptome + Journal speichern */}
                {ctx && !saved && (
                  <Card>
                    <p className="px-label mb-2">Im Journal festhalten</p>
                    <textarea
                      className="input mb-3"
                      rows={2}
                      placeholder="Eigene Beobachtungen (optional) – z. B. nur untere Blätter betroffen…"
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                    />
                    <Button className="w-full" onClick={saveToJournal}>📓 Als Problem im Journal speichern</Button>
                  </Card>
                )}
                {saved && ctx && (
                  <Card>
                    <p className="text-[13px] font-bold" style={{ color: 'var(--color-st-green)' }}>✅ Im Journal gespeichert</p>
                    <p className="text-[12px] text-ink-dim mt-1">Buddy behält das Problem im Blick, bis du es als gelöst markierst.</p>
                    <Button small variant="secondary" className="mt-3" onClick={() => nav(`/run/${ctx.run.id}`)}>Zum Run</Button>
                  </Card>
                )}
              </>
            )}
            <Button variant="secondary" onClick={reset}>🔄 Neue Analyse</Button>
          </>
        )}
      </main>

      {/* Wizard: Welches Modell? */}
      <Sheet open={mode === 'wizard'} onClose={reset} title="Was untersuchen wir?">
        {wizardStep === 1 ? (
          <div className="flex flex-col gap-3">
            <p className="text-[13px] text-ink-dim leading-relaxed">Siehst du Tiere, Punkte, die sich bewegen, oder Gespinste?</p>
            <Button onClick={() => wizardDone('Insects')}>🐛 Ja – Schädlinge prüfen</Button>
            <Button variant="secondary" onClick={() => setWizardStep(2)}>🍃 Nein – Blatt analysieren</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-[13px] text-ink-dim leading-relaxed">
              Wo sind die Symptome? <b>Oberseite</b> erkennt Krankheiten & Lichtschäden, <b>Unterseite</b> ist auf Mangelerscheinungen spezialisiert.
            </p>
            <Button onClick={() => wizardDone('Top')}>⬆️ Blattoberseite</Button>
            <Button onClick={() => wizardDone('Lower')}>⬇️ Blattunterseite</Button>
          </div>
        )}
      </Sheet>

      <SolutionSheet label={solutionLabel} onClose={() => setSolutionLabel(null)} />
    </div>
  );
}
