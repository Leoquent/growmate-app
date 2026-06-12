import React from 'react';
import type { TrainingKind } from '@/db/types';

/* ===== Trainings-Schaubilder =====
 * Vorher/Nachher-Diagramme, damit auch Erstanbauer sofort verstehen,
 * WIE eine Methode funktioniert und WARUM man sie macht.
 */

export const TRAINING_INFO: Record<TrainingKind, { how: string; why: string; warn?: string }> = {
  LST: {
    how: 'Den Haupttrieb sanft zur Seite biegen und mit weichem Draht oder Pflanzenbinder am Topfrand fixieren. Nichts wird geschnitten!',
    why: 'Alle Seitentriebe bekommen gleich viel Licht und wachsen zu gleichwertigen Colas heran – mehr Ertrag ganz ohne Stress.',
  },
  Topping: {
    how: 'Die Spitze des Haupttriebs über dem 4.–5. Nodium (Blattetage) mit sauberer Schere komplett abschneiden.',
    why: 'Aus einer Hauptspitze werden zwei – die Pflanze wächst buschiger statt wie eine Tanne und nutzt das Licht besser.',
    warn: 'Kostet ca. 1 Woche Wachstum. Nur in der Veg-Phase, nie bei Autoflowern mit kurzer Veg!',
  },
  FIM: {
    how: 'Wie Topping, aber nur ~80 % der Spitze abschneiden („F*ck, I missed!"). Der Rest bleibt stehen.',
    why: 'Kann bis zu 4 neue Haupttriebe erzeugen statt 2 – und stresst die Pflanze etwas weniger als Topping.',
    warn: 'Ergebnis ist weniger vorhersehbar als beim Topping.',
  },
  Defoliation: {
    how: 'Große Schattenblätter (Fächerblätter) gezielt entfernen – vor allem die, die Bud-Sites verdecken.',
    why: 'Licht und Luft erreichen die unteren Blütenansätze. Weniger Schimmelrisiko, gleichmäßigere Buds.',
    warn: 'Maximal ⅓ der Blätter auf einmal – Blätter sind die Solarzellen der Pflanze.',
  },
  Lollipopping: {
    how: 'Das untere Drittel der Pflanze komplett von kleinen Trieben und Blättern befreien – der Stamm wird zum „Lutscher-Stiel".',
    why: 'Unten entstehen sonst nur Popcorn-Buds. Die gesparte Energie geht in die Top-Colas, wo das Licht hinkommt.',
  },
  SCROG: {
    how: 'Ein Netz horizontal über die Pflanzen spannen. Alle Triebe, die durchwachsen, immer wieder unter das Netz zurückweben.',
    why: 'Ergibt eine ebene „Bud-Decke" auf einer Höhe – maximale Lichtausnutzung, ideal bei wenig Zelthöhe und Sativas.',
  },
};

const S = {
  stem: '#7fba52',
  leaf: '#4caf50',
  bud: '#9be15d',
  cut: '#ff5c5c',
  tie: '#ffb86b',
  light: '#ffd23f',
  faint: '#6b7e6d',
  pot: '#8a6b4a',
};

function Pot({ x }: { x: number }) {
  return <path d={`M${x - 18} 96 L${x + 18} 96 L${x + 14} 112 L${x - 14} 112 Z`} fill={S.pot} opacity={0.9} />;
}

function Label({ x, text }: { x: number; text: string }) {
  return <text x={x} y={12} textAnchor="middle" fontSize="9" fontWeight="700" fill={S.faint} letterSpacing="1">{text}</text>;
}

function Arrow() {
  return <path d="M130 60 L150 60 M144 54 L151 60 L144 66" stroke={S.faint} strokeWidth="2" fill="none" strokeLinecap="round" />;
}

function Leaf({ x, y, dir = 1 }: { x: number; y: number; dir?: number }) {
  return <ellipse cx={x + 8 * dir} cy={y} rx={8} ry={3} fill={S.leaf} transform={`rotate(${-18 * dir} ${x + 8 * dir} ${y})`} />;
}

function Bud({ x, y, r = 5 }: { x: number; y: number; r?: number }) {
  return <circle cx={x} cy={y} r={r} fill={S.bud} />;
}

function Diagram({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 280 120" className="w-full" role="img">
      {children}
    </svg>
  );
}

function LSTDiagram() {
  return (
    <Diagram>
      <Label x={70} text="VORHER" />
      <Pot x={70} />
      <path d="M70 96 L70 30" stroke={S.stem} strokeWidth="3" fill="none" />
      <Leaf x={70} y={50} dir={-1} /><Leaf x={70} y={62} dir={1} /><Leaf x={70} y={74} dir={-1} />
      <Bud x={70} y={26} r={6} />
      <Arrow />
      <Label x={210} text="NACHHER (GEBUNDEN)" />
      <Pot x={210} />
      {/* Gebogener Haupttrieb */}
      <path d="M210 96 Q210 56 178 50" stroke={S.stem} strokeWidth="3" fill="none" />
      {/* Binder */}
      <path d="M180 52 L176 70" stroke={S.tie} strokeWidth="2" strokeDasharray="3 2" />
      <circle cx={176} cy={72} r={2.5} fill={S.tie} />
      {/* Seitentriebe wachsen hoch */}
      {[192, 200, 208, 216].map((x, i) => (
        <g key={x}>
          <path d={`M${x} ${78 - i * 6} L${x} ${52 - i * 4}`} stroke={S.stem} strokeWidth="2.5" fill="none" />
          <Bud x={x} y={48 - i * 4} r={4.5} />
        </g>
      ))}
    </Diagram>
  );
}

function ToppingDiagram() {
  return (
    <Diagram>
      <Label x={70} text="SCHNITT" />
      <Pot x={70} />
      <path d="M70 96 L70 34" stroke={S.stem} strokeWidth="3" fill="none" />
      <Leaf x={70} y={56} dir={-1} /><Leaf x={70} y={68} dir={1} /><Leaf x={70} y={80} dir={-1} />
      <Bud x={70} y={30} r={6} />
      {/* Schnittlinie */}
      <path d="M58 40 L82 40" stroke={S.cut} strokeWidth="2" strokeDasharray="4 3" />
      <text x={88} y={43} fontSize="11" fill={S.cut}>✂</text>
      <Arrow />
      <Label x={210} text="2 HAUPTTRIEBE" />
      <Pot x={210} />
      <path d="M210 96 L210 58" stroke={S.stem} strokeWidth="3" fill="none" />
      <path d="M210 58 Q196 50 194 32" stroke={S.stem} strokeWidth="2.5" fill="none" />
      <path d="M210 58 Q224 50 226 32" stroke={S.stem} strokeWidth="2.5" fill="none" />
      <Leaf x={210} y={74} dir={-1} /><Leaf x={210} y={84} dir={1} />
      <Bud x={194} y={28} r={6} /><Bud x={226} y={28} r={6} />
    </Diagram>
  );
}

function FIMDiagram() {
  return (
    <Diagram>
      <Label x={70} text="80 % DER SPITZE" />
      <Pot x={70} />
      <path d="M70 96 L70 34" stroke={S.stem} strokeWidth="3" fill="none" />
      <Leaf x={70} y={58} dir={-1} /><Leaf x={70} y={70} dir={1} /><Leaf x={70} y={82} dir={-1} />
      <Bud x={70} y={30} r={7} />
      {/* Schnitt DURCH die Spitze */}
      <path d="M58 28 L84 28" stroke={S.cut} strokeWidth="2" strokeDasharray="4 3" />
      <text x={90} y={31} fontSize="11" fill={S.cut}>✂</text>
      <Arrow />
      <Label x={210} text="BIS ZU 4 TRIEBE" />
      <Pot x={210} />
      <path d="M210 96 L210 60" stroke={S.stem} strokeWidth="3" fill="none" />
      {[[188, 34], [202, 28], [218, 28], [232, 34]].map(([bx, by], i) => (
        <g key={i}>
          <path d={`M210 60 Q${bx} ${by + 18} ${bx} ${by + 6}`} stroke={S.stem} strokeWidth="2.2" fill="none" />
          <Bud x={bx} y={by} r={5} />
        </g>
      ))}
      <Leaf x={210} y={76} dir={-1} /><Leaf x={210} y={86} dir={1} />
    </Diagram>
  );
}

function DefoliationDiagram() {
  return (
    <Diagram>
      <Label x={70} text="LICHT BLOCKIERT" />
      <Pot x={70} />
      <path d="M70 96 L70 30" stroke={S.stem} strokeWidth="3" fill="none" />
      <Bud x={70} y={26} r={6} />
      {/* große Schattenblätter */}
      {[[44, 46, -1], [96, 46, 1], [40, 64, -1], [100, 64, 1]].map(([x, y, d], i) => (
        <ellipse key={i} cx={x} cy={y} rx={15} ry={6} fill={S.leaf} opacity={0.95} transform={`rotate(${-15 * (d as number)} ${x} ${y})`} />
      ))}
      {/* verschattete Buds */}
      <circle cx={58} cy={78} r={3.5} fill={S.faint} />
      <circle cx={82} cy={78} r={3.5} fill={S.faint} />
      <Arrow />
      <Label x={210} text="LICHT KOMMT DURCH" />
      <Pot x={210} />
      <path d="M210 96 L210 30" stroke={S.stem} strokeWidth="3" fill="none" />
      <Bud x={210} y={26} r={6} />
      {/* Lichtstrahlen */}
      {[188, 210, 232].map((x) => (
        <path key={x} d={`M${x} 16 L${x} 70`} stroke={S.light} strokeWidth="1.5" strokeDasharray="3 4" opacity={0.8} />
      ))}
      <Leaf x={210} y={48} dir={-1} /><Leaf x={210} y={48} dir={1} />
      {/* jetzt belichtete Buds */}
      <Bud x={198} y={76} r={4.5} /><Bud x={222} y={76} r={4.5} />
    </Diagram>
  );
}

function LollipoppingDiagram() {
  return (
    <Diagram>
      <Label x={70} text="POPCORN UNTEN" />
      <Pot x={70} />
      <path d="M70 96 L70 28" stroke={S.stem} strokeWidth="3" fill="none" />
      <Bud x={70} y={24} r={6} />
      <Bud x={58} y={40} r={5} /><Bud x={82} y={40} r={5} />
      {/* kümmerliche untere Triebe */}
      {[[52, 74], [88, 74], [56, 86], [84, 86]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2.5} fill={S.faint} />
      ))}
      <path d="M70 74 L52 74 M70 74 L88 74 M70 86 L56 86 M70 86 L84 86" stroke={S.faint} strokeWidth="1.5" />
      <Arrow />
      <Label x={210} text="ENERGIE NACH OBEN" />
      <Pot x={210} />
      {/* kahler Stiel = Lollipop */}
      <path d="M210 96 L210 28" stroke={S.stem} strokeWidth="3" fill="none" />
      <Bud x={210} y={24} r={8} />
      <Bud x={196} y={38} r={6.5} /><Bud x={224} y={38} r={6.5} />
      <Leaf x={210} y={50} dir={-1} /><Leaf x={210} y={50} dir={1} />
      {/* markierter kahler Bereich */}
      <path d="M196 70 L224 70 M196 92 L224 92" stroke={S.cut} strokeWidth="1" strokeDasharray="3 3" opacity={0.7} />
    </Diagram>
  );
}

function ScrogDiagram() {
  return (
    <Diagram>
      <Label x={70} text="EINE SPITZE OBEN" />
      <Pot x={70} />
      <path d="M70 96 L70 24" stroke={S.stem} strokeWidth="3" fill="none" />
      <Bud x={70} y={20} r={7} />
      <Leaf x={70} y={50} dir={-1} /><Leaf x={70} y={64} dir={1} />
      <circle cx={56} cy={66} r={3} fill={S.faint} /><circle cx={84} cy={66} r={3} fill={S.faint} />
      <Arrow />
      <Label x={210} text="EBENE BUD-DECKE" />
      <Pot x={210} />
      {/* Netz */}
      <path d="M168 58 L252 58" stroke={S.tie} strokeWidth="2" />
      {[176, 190, 204, 218, 232, 246].map((x) => (
        <path key={x} d={`M${x} 54 L${x} 62`} stroke={S.tie} strokeWidth="1.5" />
      ))}
      {/* eingewebte Triebe, gleichmäßige Tops */}
      <path d="M210 96 L210 70 Q190 66 184 58 M210 70 Q230 66 236 58 M210 78 Q198 74 197 58 M210 78 Q222 74 223 58" stroke={S.stem} strokeWidth="2.2" fill="none" />
      {[184, 197, 210, 223, 236].map((x) => (
        <Bud key={x} x={x} y={50} r={5.5} />
      ))}
    </Diagram>
  );
}

export function TrainingDiagram({ kind }: { kind: TrainingKind }) {
  switch (kind) {
    case 'LST': return <LSTDiagram />;
    case 'Topping': return <ToppingDiagram />;
    case 'FIM': return <FIMDiagram />;
    case 'Defoliation': return <DefoliationDiagram />;
    case 'Lollipopping': return <LollipoppingDiagram />;
    case 'SCROG': return <ScrogDiagram />;
  }
}
