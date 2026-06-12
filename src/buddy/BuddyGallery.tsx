import React from 'react';
import { Buddy } from './Buddy';
import { STAGE_NAMES } from './spriteGen';
import { Header } from '@/components/ui';

/** Dev-Galerie: alle 9 Stufen × 3 Emotionen (Route /buddy) */
export function BuddyGallery() {
  return (
    <div>
      <Header title="Buddy-Galerie" sub="Alle Evolutionsstufen & Emotionen" />
      <main className="px-4 pt-4 pb-12">
        <div className="grid grid-cols-3 gap-2">
          {STAGE_NAMES.map((name, i) => (
            <div key={name} className="card !p-2 flex flex-col items-center">
              <Buddy stage={i + 1} emotion="neutral" size={92} animate={false} />
              <span className="text-[9px] text-ink-faint mt-1">{i + 1} {name}</span>
            </div>
          ))}
        </div>
        <div className="card p-3 mt-3 flex justify-around">
          {(['happy', 'neutral', 'unhappy'] as const).map((e) => (
            <div key={e} className="flex flex-col items-center">
              <Buddy stage={6} emotion={e} size={80} animate={false} />
              <span className="text-[9px] text-ink-faint">{e}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
