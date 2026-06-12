import React, { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { exportEncrypted, hashPin, importEncrypted, updateSettings } from '@/db/repo';
import { requestNotificationPermission, refreshNotifications } from '@/notify/notifications';
import { Button, Card, Divider, Field, Header, Sheet } from '@/components/ui';
import { Buddy } from '@/buddy/Buddy';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-12 h-7 rounded-full p-0.5 transition-colors flex-none"
      style={{ background: checked ? 'var(--color-accent)' : 'var(--color-bg3)' }}
    >
      <div className={`w-6 h-6 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );
}

export function Settings() {
  const settings = useLiveQuery(() => db.settings.get('app'), []);
  const [pinSheet, setPinSheet] = useState(false);
  const [exportSheet, setExportSheet] = useState(false);
  const [importSheet, setImportSheet] = useState(false);
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  if (!settings) return null;

  const toggleNotifications = async (on: boolean) => {
    if (on) {
      const granted = await requestNotificationPermission();
      await updateSettings({ notificationsEnabled: granted });
      if (granted) void refreshNotifications();
    } else {
      await updateSettings({ notificationsEnabled: false });
      void refreshNotifications();
    }
  };

  const savePin = async () => {
    if (pin.length === 4) {
      await updateSettings({ pinHash: await hashPin(pin) });
      setPin('');
      setPinSheet(false);
    }
  };

  const doExport = async () => {
    if (password.length < 4) return;
    const blob = await exportEncrypted(password);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `growmate-backup-${new Date().toISOString().slice(0, 10)}.growmate`;
    a.click();
    URL.revokeObjectURL(url);
    setPassword('');
    setExportSheet(false);
  };

  const doImport = async () => {
    if (!importFile || password.length < 4) return;
    try {
      await importEncrypted(await importFile.arrayBuffer(), password);
      setMsg('✅ Backup erfolgreich importiert.');
    } catch (e) {
      setMsg(`❌ ${(e as Error).message}`);
    }
    setPassword('');
    setImportFile(null);
    setImportSheet(false);
  };

  return (
    <div>
      <Header title="Mehr" />
      <main className="px-4 pt-4 pb-8 flex flex-col gap-3">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-[14px]">Profi-Modus</h4>
              <p className="text-[12px] text-ink-dim mt-0.5">Keine Erklärtexte, direkter Zugriff auf Daten.</p>
            </div>
            <Toggle checked={settings.experienced} onChange={(v) => updateSettings({ experienced: v })} />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-[14px]">Gieß-Erinnerungen</h4>
              <p className="text-[12px] text-ink-dim mt-0.5">Sanft bei Gelb, dringend bei Rot. Max. 1 pro Run & Tag.</p>
            </div>
            <Toggle checked={settings.notificationsEnabled} onChange={toggleNotifications} />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-[14px]">PIN-Schutz</h4>
              <p className="text-[12px] text-ink-dim mt-0.5">{settings.pinHash ? 'Aktiv – App ist gesperrt.' : 'Schütze deine Daten mit einer 4-stelligen PIN.'}</p>
            </div>
            {settings.pinHash ? (
              <Button small variant="danger" onClick={() => updateSettings({ pinHash: null })}>Entfernen</Button>
            ) : (
              <Button small variant="secondary" onClick={() => setPinSheet(true)}>Einrichten</Button>
            )}
          </div>
        </Card>

        <Divider label="Backup" />

        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={() => setExportSheet(true)}>📦 Exportieren</Button>
          <Button variant="secondary" onClick={() => setImportSheet(true)}>📥 Importieren</Button>
        </div>
        {msg && <p className="text-[13px] text-center text-ink-dim">{msg}</p>}

        <Divider label="Über GrowMate" />

        <Card className="flex flex-col items-center text-center py-6">
          <Buddy stage={9} emotion="happy" size={64} />
          <p className="font-bold mt-3">GrowMate 0.1.0</p>
          <p className="text-[12px] text-ink-dim mt-2 leading-relaxed max-w-[280px]">
            100 % offline. Alle Daten bleiben ausschließlich auf deinem Gerät – keine Accounts,
            keine Cloud, keine Werbung, kein Tracking.
          </p>
          <p className="text-[11px] text-ink-faint mt-3">
            LeafDoc-KI basiert auf grow-guide-app (TensorFlow Lite, on-device).
          </p>
        </Card>
      </main>

      {/* PIN */}
      <Sheet open={pinSheet} onClose={() => setPinSheet(false)} title="PIN einrichten">
        <Field label="4-stellige PIN">
          <input className="input text-center tracking-[0.5em]" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
        </Field>
        <Button className="w-full" disabled={pin.length !== 4} onClick={savePin}>Speichern</Button>
      </Sheet>

      {/* Export */}
      <Sheet open={exportSheet} onClose={() => setExportSheet(false)} title="📦 Verschlüsseltes Backup">
        <p className="text-[13px] text-ink-dim mb-4 leading-relaxed">
          Alle Daten (Runs, Journal, Fotos) werden mit AES-256 verschlüsselt exportiert.
          Ohne Passwort ist die Datei nicht lesbar – merk es dir gut!
        </p>
        <Field label="Passwort (min. 4 Zeichen)">
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Button className="w-full" disabled={password.length < 4} onClick={doExport}>Backup herunterladen</Button>
      </Sheet>

      {/* Import */}
      <Sheet open={importSheet} onClose={() => setImportSheet(false)} title="📥 Backup importieren">
        <p className="text-[13px] mb-4 leading-relaxed" style={{ color: 'var(--color-st-orange)' }}>
          ⚠️ Achtung: Der Import ersetzt ALLE aktuellen Daten.
        </p>
        <label className="card flex items-center justify-center h-16 cursor-pointer text-ink-dim text-[13px] font-semibold mb-4">
          {importFile ? `📄 ${importFile.name}` : 'Backup-Datei wählen (.growmate)'}
          <input ref={fileRef} type="file" accept=".growmate" className="hidden" onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} />
        </label>
        <Field label="Passwort">
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Button className="w-full" disabled={!importFile || password.length < 4} onClick={doImport}>Importieren & ersetzen</Button>
      </Sheet>
    </div>
  );
}
