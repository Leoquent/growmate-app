import React, { useEffect, useState } from 'react';
import { HashRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import { hashPin } from './db/repo';
import { Onboarding } from './features/onboarding/Onboarding';
import { Dashboard } from './features/dashboard/Dashboard';
import { NewRunWizard } from './features/run/NewRunWizard';
import { RunDetail } from './features/run/RunDetail';
import { CalendarView } from './features/calendar/CalendarView';
import { LeafDocScreen } from './features/leafdoc/LeafDocScreen';
import { Settings } from './features/settings/Settings';
import { Buddy } from './buddy/Buddy';
import { BuddyGallery } from './buddy/BuddyGallery';
import { refreshNotifications } from './notify/notifications';

function TabBar() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const tabs = [
    { to: '/', icon: '🏠', label: 'Home' },
    { to: '/kalender', icon: '📅', label: 'Kalender' },
    { to: '/leafdoc', icon: '🩺', label: 'LeafDoc' },
    { to: '/mehr', icon: '⚙️', label: 'Mehr' },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-bg1/95 backdrop-blur-md border-t border-line safe-bottom">
      <div className="flex max-w-lg mx-auto">
        {tabs.map((t) => {
          const active = pathname === t.to;
          return (
            <button
              key={t.to}
              type="button"
              onClick={() => nav(t.to)}
              className="flex-1 flex flex-col items-center gap-0.5 pt-2.5 pb-2"
              aria-current={active ? 'page' : undefined}
            >
              <span className={`text-[20px] leading-none ${active ? '' : 'grayscale opacity-50'}`}>{t.icon}</span>
              <span className={`text-[10px] font-bold tracking-wide ${active ? 'text-accent' : 'text-ink-faint'}`}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function PinLock({ pinHash, onUnlock }: { pinHash: string; onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (pin.length === 4) {
      hashPin(pin).then((h) => {
        if (h === pinHash) onUnlock();
        else { setError(true); setPin(''); }
      });
    }
  }, [pin, pinHash, onUnlock]);

  const press = (d: string) => { setError(false); if (pin.length < 4) setPin(pin + d); };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-8 safe-top safe-bottom">
      <Buddy stage={6} emotion="neutral" size={72} />
      <h1 className="text-xl font-bold mt-4">PIN eingeben</h1>
      <div className="flex gap-3 my-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`w-4 h-4 rounded-sm ${i < pin.length ? 'bg-accent' : 'bg-bg3'} ${error ? 'bg-st-red' : ''}`} />
        ))}
      </div>
      {error && <p className="text-st-red text-[13px] mb-3">Falsche PIN – versuch's nochmal.</p>}
      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((d, i) => (
          <button
            key={i}
            type="button"
            disabled={d === ''}
            onClick={() => (d === '⌫' ? setPin(pin.slice(0, -1)) : press(d))}
            className="w-[68px] h-[68px] rounded-2xl bg-bg2 border border-line text-xl font-bold disabled:opacity-0 active:scale-95 transition-transform"
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const settings = useLiveQuery(() => db.settings.get('app'));
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (settings?.notificationsEnabled) void refreshNotifications();
  }, [settings?.notificationsEnabled]);

  if (!settings) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4">
        <Buddy stage={3} size={80} />
        <p className="px-label">GrowMate lädt…</p>
      </div>
    );
  }

  if (settings.pinHash && !unlocked) {
    return <PinLock pinHash={settings.pinHash} onUnlock={() => setUnlocked(true)} />;
  }

  if (!settings.onboardingDone) {
    return <Onboarding />;
  }

  return (
    <HashRouter>
      <div className="max-w-lg mx-auto min-h-dvh pb-24">
        <Routes>
          <Route path="/" element={<><Dashboard /><TabBar /></>} />
          <Route path="/kalender" element={<><CalendarView /><TabBar /></>} />
          <Route path="/leafdoc" element={<><LeafDocScreen /><TabBar /></>} />
          <Route path="/mehr" element={<><Settings /><TabBar /></>} />
          <Route path="/run/new" element={<NewRunWizard />} />
          <Route path="/run/:id" element={<RunDetail />} />
          <Route path="/buddy" element={<BuddyGallery />} />
        </Routes>
      </div>
    </HashRouter>
  );
}
