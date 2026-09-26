import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { buildTimeline } from '../domain/calculator';
import { starterIntervalHours, starterReminderDates } from '../domain/sourdough';
import type { Recipe, SourdoughProfile } from '../domain/types';
const CHANNEL = 'impasti';
const STARTER_CHANNEL = 'lievito-madre';
async function cancelRange(min: number, max: number) {
  if (!Capacitor.isNativePlatform()) return;
  const { notifications } = await LocalNotifications.getPending();
  const selected = notifications.filter(item => item.id >= min && item.id <= max);
  if (selected.length) await LocalNotifications.cancel({ notifications: selected });
}
export async function cancelReminders() {
  await cancelRange(1000, 1999);
}
export async function scheduleReminders(recipe: Recipe): Promise<string> {
  if (!Capacitor.isNativePlatform()) return 'Nel browser puoi seguire la tabella di marcia. I promemoria a schermo spento sono disponibili nell’app Android.';
  const stages = buildTimeline(recipe.config).filter(s => new Date(s.at).getTime() > Date.now());
  if (!stages.length) throw new Error('Questo piano è terminato. Imposta una nuova data.');
  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== 'granted') throw new Error('Notifiche non autorizzate. Puoi abilitarle nelle impostazioni Android.');
  await LocalNotifications.createChannel({ id: CHANNEL, name: 'Il tuo impasto', description: 'Promemoria per ogni fase della pizza', importance: 4, visibility: 1, vibration: true });
  await cancelReminders();
  await LocalNotifications.schedule({ notifications: stages.map((stage,index) => ({
    id: 1000+index, title: `PizzaLab · ${stage.title}`, body: stage.detail,
    channelId: CHANNEL, isExactNotification: false, schedule: { at: new Date(stage.at), allowWhileIdle: true }, extra: { recipeId: recipe.id },
  })) });
  return `${stages.length} promemoria programmati. Android può ritardarli in base al risparmio energetico; gli orari restano visibili nel piano.`;
}

export async function cancelStarterReminders() {
  await cancelRange(5000, 5999);
}

export async function scheduleStarterReminders(profile: SourdoughProfile): Promise<string> {
  if (!Capacitor.isNativePlatform())
    return 'Promemoria salvati. Le notifiche a schermo spento saranno attive nell’app Android.';
  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== 'granted')
    throw new Error('Notifiche non autorizzate. Puoi abilitarle nelle impostazioni Android.');
  await LocalNotifications.createChannel({
    id: STARTER_CHANNEL,
    name: 'Lievito madre',
    description: 'Rinfreschi e controlli del lievito madre',
    importance: 4,
    visibility: 1,
    vibration: true,
  });
  await cancelStarterReminders();
  const dates = starterReminderDates(profile, profile.storage === 'fridge' ? 8 : 20);
  await LocalNotifications.schedule({ notifications: dates.map((at, index) => ({
    id: 5000 + index,
    title: `PizzaLab · Rinfresca ${profile.name}`,
    body: profile.phase === 'mature' && profile.storage === 'fridge'
      ? 'Togli il lievito dal frigo, osservalo e procedi con il rinfresco settimanale.'
      : `È il momento del rinfresco. Intervallo previsto: ${starterIntervalHours(profile, at)} ore.`,
    channelId: STARTER_CHANNEL,
    isExactNotification: false,
    schedule: { at, allowWhileIdle: true },
    extra: { section: 'sourdough' },
  })) });
  return `${dates.length} promemoria del lievito madre programmati. Android può ritardarli leggermente per il risparmio energetico.`;
}
