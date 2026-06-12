import React, { useState } from 'react';
import { updateSettings } from '@/db/repo';
import { Buddy } from '@/buddy/Buddy';
import { Button, Card } from '@/components/ui';

/* ===== Onboarding =====
 * Erste Frage: "Hast du schon mal angebaut?"
 * NEIN → geführter Erklär-Pfad (jeder Begriff erklärt)
 * JA  → direkt rein, keine Erklärungen
 */

type Step = 'welcome' | 'b-equipment' | 'b-germination' | 'b-app' | 'done';

const GERMINATION_METHODS = [
  {
    icon: '🥛',
    title: 'Glas Wasser',
    text: 'Samen 24–48 h in ein Glas stilles Wasser legen, bis er sinkt und die weiße Keimwurzel zeigt. Einfachste Methode für Anfänger.',
  },
  {
    icon: '🧻',
    title: 'Papiertuch',
    text: 'Samen zwischen feuchte (nicht nasse!) Küchentücher auf einen Teller, dunkel und warm (22–25 °C) lagern. Nach 1–4 Tagen zeigt sich die Wurzel.',
  },
  {
    icon: '🟤',
    title: 'Jiffy / Quelltablette',
    text: 'Samen direkt 0,5–1 cm tief in die aufgequollene Torftablette. Kein Umsetzen nötig – die Tablette wandert später komplett in den Topf.',
  },
];

const EQUIPMENT = [
  { icon: '💡', title: 'Licht', text: 'LED ist heute Standard: sparsam, wenig Hitze. Für 1–2 Pflanzen reichen 100–150 W echte Leistung. Abstand: 30–45 cm.' },
  { icon: '🪴', title: 'Topf', text: '11 Liter ist der Allrounder für Photoperiodische. Autoflower kommen direkt in den Endtopf (12–15 L), da sie Umtopfen schlecht verkraften.' },
  { icon: '🟫', title: 'Substrat', text: 'Leicht vorgedüngte Erde (z. B. BioBizz Light Mix) verzeiht Fehler und puffert den pH-Wert – die beste Wahl für deinen ersten Grow.' },
  { icon: '🌬️', title: 'Luft', text: 'Ein kleiner Ventilator + Abluft mit Aktivkohlefilter halten Klima und Geruch im Griff. Ziel: 20–26 °C, 50–70 % Luftfeuchte.' },
];

const APP_FEATURES = [
  { icon: '🥦', title: 'Buddy', text: 'Dein Brokkoli-Begleiter wächst mit deiner Pflanze mit und zeigt dir auf einen Blick, wie es ihr geht.' },
  { icon: '🚦', title: 'Gieß-Ampel', text: 'Grün = alles gut. Rot = dringend gießen. GrowMate kennt dein Substrat und rechnet das Intervall für dich aus.' },
  { icon: '📓', title: 'Journal', text: 'Jedes Gießen, Düngen und Training wird geloggt. Das Journal ist das Gedächtnis deines Grows.' },
  { icon: '🩺', title: 'LeafDoc', text: 'Blatt fotografieren → KI-Diagnose direkt auf deinem Gerät. LeafDoc kennt dein Journal und bezieht es in die Diagnose ein.' },
];

export function Onboarding() {
  const [step, setStep] = useState<Step>('welcome');

  const finish = async (experienced: boolean) => {
    await updateSettings({ onboardingDone: true, experienced });
  };

  if (step === 'welcome') {
    return (
      <div className="min-h-dvh flex flex-col px-6 safe-top safe-bottom max-w-lg mx-auto">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="pixel-frame bg-bg2 p-6 mb-6">
            <Buddy stage={6} emotion="happy" size={120} />
          </div>
          <h1 className="text-[28px] font-bold leading-tight">GrowMate</h1>
          <p className="text-ink-dim mt-2 mb-1 leading-relaxed">
            Die letzte Grow-App, die du je brauchen wirst – vom ersten Samen bis zur Ernte.
          </p>
          <p className="px-label mt-8 mb-4">Hast du schon mal angebaut?</p>
          <div className="flex flex-col gap-3 w-full">
            <Button onClick={() => setStep('b-equipment')} className="w-full">
              🌱 Nein, das ist mein erster Grow
            </Button>
            <Button variant="secondary" onClick={() => finish(true)} className="w-full">
              💪 Ja, ich kenne mich aus
            </Button>
          </div>
          <p className="text-[11px] text-ink-faint mt-6 leading-relaxed">
            100 % offline · keine Accounts · keine Cloud · deine Daten bleiben auf deinem Gerät
          </p>
        </div>
      </div>
    );
  }

  const slides: Record<Exclude<Step, 'welcome' | 'done'>, { title: string; sub: string; items: typeof EQUIPMENT; next: Step; cta: string }> = {
    'b-equipment': {
      title: 'Was du brauchst',
      sub: 'Keine Sorge – für den Start reicht ein einfaches Setup. GrowMate empfiehlt dir später passende Werte.',
      items: EQUIPMENT,
      next: 'b-germination',
      cta: 'Weiter: Keimung',
    },
    'b-germination': {
      title: 'So keimst du deinen Samen',
      sub: 'Drei bewährte Methoden – du wählst beim Start deines Runs eine aus, GrowMate führt dich durch.',
      items: GERMINATION_METHODS,
      next: 'b-app',
      cta: 'Weiter: Deine App',
    },
    'b-app': {
      title: 'So hilft dir GrowMate',
      sub: 'Alles hängt zusammen: Journal, Ampel, Düngeplan und LeafDoc sprechen miteinander.',
      items: APP_FEATURES,
      next: 'done',
      cta: 'Los geht\'s! 🚀',
    },
  };

  const slide = slides[step as keyof typeof slides];
  const stepIndex = ['b-equipment', 'b-germination', 'b-app'].indexOf(step);

  return (
    <div className="min-h-dvh flex flex-col px-5 safe-top safe-bottom max-w-lg mx-auto">
      <div className="flex gap-1.5 pt-6 pb-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i <= stepIndex ? 'var(--color-accent)' : 'var(--color-bg3)' }} />
        ))}
      </div>
      <h1 className="text-[24px] font-bold">{slide.title}</h1>
      <p className="text-ink-dim text-[14px] mt-1 mb-5 leading-relaxed">{slide.sub}</p>
      <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
        {slide.items.map((item) => (
          <Card key={item.title} className="anim-pop">
            <div className="flex gap-3.5 items-start">
              <span className="text-[28px] leading-none mt-0.5">{item.icon}</span>
              <div>
                <h3 className="font-bold text-[15px]">{item.title}</h3>
                <p className="text-[13px] text-ink-dim leading-relaxed mt-0.5">{item.text}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <div className="py-4 flex gap-3">
        <Button variant="ghost" onClick={() => setStep(stepIndex === 0 ? 'welcome' : (['b-equipment', 'b-germination'][stepIndex - 1] as Step))}>
          Zurück
        </Button>
        <Button
          className="flex-1"
          onClick={() => (slide.next === 'done' ? finish(false) : setStep(slide.next))}
        >
          {slide.cta}
        </Button>
      </div>
    </div>
  );
}
