import { Capacitor } from '@capacitor/core';
import { addDays, isoDate } from '@/db/db';
import { getSettings } from '@/db/repo';
import { loadActiveRunContexts } from '@/domain/context';
import { worstWateringAmpel } from '@/domain/watering';

/* ===== Lokale Push-Benachrichtigungen (Ampelsystem) =====
 * GELB → sanfte Erinnerung, ROT → dringend.
 * Max. 1 Notification pro Run und Tag (feste Uhrzeiten, kein Spam).
 * Web-Fallback: keine geplanten Notifications (Ampel bleibt in der App sichtbar).
 */

function numericId(runId: string, slot: number): number {
  let h = 0;
  for (let i = 0; i < runId.length; i++) h = (h * 31 + runId.charCodeAt(i)) | 0;
  return Math.abs(h % 100000) * 10 + slot;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    if (!('Notification' in window)) return false;
    const res = await Notification.requestPermission();
    return res === 'granted';
  }
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  const res = await LocalNotifications.requestPermissions();
  return res.display === 'granted';
}

export async function refreshNotifications(): Promise<void> {
  try {
    if (!Capacitor.isNativePlatform()) return;
    const settings = await getSettings();
    const { LocalNotifications } = await import('@capacitor/local-notifications');

    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    }
    if (!settings.notificationsEnabled) return;

    const ctxs = await loadActiveRunContexts();
    const today = isoDate();
    const toSchedule: { id: number; title: string; body: string; schedule: { at: Date } }[] = [];

    for (const ctx of ctxs) {
      // Die durstigste Pflanze bestimmt, wann erinnert wird
      const ampel = worstWateringAmpel(ctx, today);
      // Tage bis Gelb bzw. Rot (relativ zu heute)
      const daysToYellow = Math.max(0, ampel.dueInDays);
      const daysToRed = Math.max(0, ampel.dueInDays + 2);

      const yellowDate = new Date(addDays(today, daysToYellow) + 'T10:00:00');
      const redDate = new Date(addDays(today, daysToRed) + 'T10:00:00');
      const now = new Date();

      if (yellowDate > now) {
        toSchedule.push({
          id: numericId(ctx.run.id, 1),
          title: '🌱 Deine Pflanzen warten',
          body: `${ctx.run.name}: Zeit für einen Check – bald gießen!`,
          schedule: { at: yellowDate },
        });
      }
      if (redDate > now) {
        toSchedule.push({
          id: numericId(ctx.run.id, 2),
          title: '🚨 Dringend!',
          body: `${ctx.run.name}: Letzte Bewässerung liegt zu lange zurück – deine Pflanze könnte Stress haben.`,
          schedule: { at: redDate },
        });
      }
    }

    if (toSchedule.length > 0) {
      await LocalNotifications.schedule({ notifications: toSchedule });
    }
  } catch (e) {
    console.warn('Notifications nicht verfügbar:', e);
  }
}
