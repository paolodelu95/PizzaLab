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
const leadText = (minutes: number) => (minutes > 0 ? `Tra ${minutes} minuti: ` : '');
/** Orario della notifica: la fase meno l’anticipo scelto, ma mai nel passato. */
const notifyAt = (at: string | Date, leadMinutes: number) =>
  new Date(Math.max(Date.now() + 5000, new Date(at).getTime() - leadMinutes * 60000));

export async function scheduleReminders(recipe: Recipe, leadMinutes = 0): Promise<string> {
  if (!Capacitor.isNativePlatform()) return 'Per ricevere un avviso a ogni fase, premi «Aggiungi al calendario» nella scheda della pizza.';
  const stages = buildTimeline(recipe.config).filter(s => new Date(s.at).getTime() > Date.now());
  if (!stages.length) throw new Error('Questo piano è terminato. Imposta una nuova data.');
  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== 'granted') throw new Error('Notifiche non autorizzate. Puoi abilitarle nelle impostazioni Android.');
  await LocalNotifications.createChannel({ id: CHANNEL, name: 'Il tuo impasto', description: 'Promemoria per ogni fase della pizza', importance: 4, visibility: 1, vibration: true });
  await cancelReminders();
  await LocalNotifications.schedule({ notifications: stages.map((stage,index) => ({
    id: 1000+index, title: `PizzaLab · ${stage.title}`, body: `${leadText(leadMinutes)}${stage.detail}`,
    channelId: CHANNEL, isExactNotification: false, schedule: { at: notifyAt(stage.at, leadMinutes), allowWhileIdle: true }, extra: { recipeId: recipe.id },
  })) });
  return `${stages.length} notifiche programmate${leadMinutes ? `, ${leadMinutes} minuti prima di ogni fase` : ''}. Android può ritardarle leggermente per il risparmio energetico; gli orari restano visibili nel piano.`;
}

function starterNotificationBase(profileId: string) {
  let hash = 0;
  for (const character of profileId) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return 10000 + (hash % 20000) * 32;
}

export async function cancelStarterReminders(profileId?: string) {
  if (!profileId) return cancelRange(10000, 649999);
  const base = starterNotificationBase(profileId);
  await cancelRange(base, base + 31);
}

export async function scheduleStarterReminders(profile: SourdoughProfile, leadMinutes = 0): Promise<string> {
  if (!Capacitor.isNativePlatform())
    return 'Routine salvata. Per ricevere gli avvisi dei rinfreschi, premi «Aggiungi al calendario».';
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
  await cancelStarterReminders(profile.id);
  const dates = starterReminderDates(profile, profile.storage === 'fridge' ? 8 : 20);
  const base = starterNotificationBase(profile.id);
  await LocalNotifications.schedule({ notifications: dates.map((at, index) => ({
    id: base + index,
    title: `PizzaLab · Rinfresca ${profile.name}`,
    body: profile.phase === 'mature' && profile.storage === 'fridge'
      ? 'Togli il lievito dal frigo, osservalo e procedi con il rinfresco settimanale.'
      : `${leadText(leadMinutes)}${leadMinutes ? 'rinfresco' : 'È il momento del rinfresco'}. Intervallo previsto: ${starterIntervalHours(profile, at)} ore.`,
    channelId: STARTER_CHANNEL,
    isExactNotification: false,
    schedule: { at: notifyAt(at, leadMinutes), allowWhileIdle: true },
    extra: { section: 'sourdough', profileId: profile.id },
  })) });
  return `${dates.length} notifiche del lievito madre programmate. Android può ritardarli leggermente per il risparmio energetico.`;
}

/** Toccando una notifica, l’app si apre sulla sezione giusta. */
export function onReminderOpened(handler: (section: 'dough' | 'sourdough') => void) {
  if (!Capacitor.isNativePlatform()) return () => undefined;
  const listener = LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
    handler(action.notification.extra?.section === 'sourdough' ? 'sourdough' : 'dough');
  });
  return () => { void listener.then((item) => item.remove()); };
}
