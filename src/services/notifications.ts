import { t } from "../i18n";
import { Capacitor, registerPlugin } from '@capacitor/core';
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
/**
 * Android rimanda gli avvisi «non esatti» anche di molte ore (fino a tre quarti del tempo che manca),
 * soprattutto ad app chiusa e telefono a riposo. Con il permesso «Sveglie e promemoria» arrivano puntuali.
 */
/*
 * Nota: si chiede l’avviso esatto al plugin solo quando il permesso c’è già. Con il permesso negato
 * il plugin aprirebbe la pagina di sistema a ogni programmazione (anche al riavvio dell’app) e
 * resterebbe in attesa: il permesso si chiede una volta, spiegandolo, con askExactReminders().
 */
export async function exactRemindersAllowed(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  try {
    return (await LocalNotifications.checkExactNotificationSetting()).exact_alarm === 'granted';
  } catch {
    return true;
  }
}

/** Apre la pagina di sistema «Sveglie e promemoria» di PizzaLab e dice se ora il permesso c’è. */
export async function askExactReminders(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  try {
    return (await LocalNotifications.changeExactNotificationSetting()).exact_alarm === 'granted';
  } catch {
    return false;
  }
}

const notExactNote = () => t("Per riceverle all’orario giusto anche ad app chiusa, attiva «Sveglie e promemoria» per PizzaLab: lo trovi nel Profilo, alla voce Notifiche.");

const leadText = (minutes: number) => (minutes > 0 ? t("Tra {minutes} minuti: ", { minutes }) : '');
/** Orario della notifica: la fase meno l’anticipo scelto, ma mai nel passato. */
const notifyAt = (at: string | Date, leadMinutes: number) =>
  new Date(Math.max(Date.now() + 5000, new Date(at).getTime() - leadMinutes * 60000));

export async function scheduleReminders(recipe: Recipe, leadMinutes = 0): Promise<string> {
  if (!Capacitor.isNativePlatform()) return t("Per ricevere un avviso a ogni fase, premi «Aggiungi al calendario» nella scheda della pizza.");
  const stages = buildTimeline(recipe.config).filter(s => new Date(s.at).getTime() > Date.now());
  if (!stages.length) throw new Error('Questo piano è terminato. Imposta una nuova data.');
  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== 'granted') throw new Error('Notifiche non autorizzate. Puoi abilitarle nelle impostazioni Android.');
  await LocalNotifications.createChannel({ id: CHANNEL, name: t("Il tuo impasto"), description: t("Promemoria per ogni fase della pizza"), importance: 4, visibility: 1, vibration: true });
  const exact = await exactRemindersAllowed();
  await cancelReminders();
  await LocalNotifications.schedule({ notifications: stages.map((stage,index) => ({
    id: 1000+index, title: t("PizzaLab · {title}", { title: stage.title }), body: `${leadText(leadMinutes)}${stage.detail}`,
    channelId: CHANNEL, isExactNotification: exact, schedule: { at: notifyAt(stage.at, leadMinutes), allowWhileIdle: true }, extra: { recipeId: recipe.id },
  })) });
  const count = leadMinutes
    ? t("{count} notifiche programmate, {minutes} minuti prima di ogni fase.", { count: stages.length, minutes: leadMinutes })
    : t("{count} notifiche programmate.", { count: stages.length });
  return exact ? count : `${count} ${notExactNote()}`;
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
    return t("Routine salvata. Per ricevere gli avvisi dei rinfreschi, premi «Aggiungi al calendario».");
  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== 'granted')
    throw new Error('Notifiche non autorizzate. Puoi abilitarle nelle impostazioni Android.');
  await LocalNotifications.createChannel({
    id: STARTER_CHANNEL,
    name: t("Lievito madre"),
    description: t("Rinfreschi e controlli del lievito madre"),
    importance: 4,
    visibility: 1,
    vibration: true,
  });
  const exact = await exactRemindersAllowed();
  await cancelStarterReminders(profile.id);
  const dates = starterReminderDates(profile, profile.storage === 'fridge' ? 8 : 20);
  const base = starterNotificationBase(profile.id);
  await LocalNotifications.schedule({ notifications: dates.map((at, index) => ({
    id: base + index,
    title: t("PizzaLab · Rinfresca {name}", { name: profile.name }),
    body: profile.phase === 'mature' && profile.storage === 'fridge'
      ? t("Togli il lievito dal frigo, osservalo e procedi con il rinfresco settimanale.")
      : `${leadText(leadMinutes)}${leadMinutes ? 'rinfresco' : 'È il momento del rinfresco'}. Intervallo previsto: ${starterIntervalHours(profile, at)} ore.`,
    channelId: STARTER_CHANNEL,
    isExactNotification: exact,
    schedule: { at: notifyAt(at, leadMinutes), allowWhileIdle: true },
    extra: { section: 'sourdough', profileId: profile.id },
  })) });
  const count = t("{length} notifiche del lievito madre programmate.", { length: dates.length });
  return exact ? count : `${count} ${notExactNote()}`;
}

/** Toccando una notifica, l’app si apre sulla sezione giusta. */
export function onReminderOpened(handler: (section: 'dough' | 'sourdough') => void) {
  if (!Capacitor.isNativePlatform()) return () => undefined;
  const listener = LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
    handler(action.notification.extra?.section === 'sourdough' ? 'sourdough' : 'dough');
  });
  return () => { void listener.then((item) => item.remove()); };
}

/** Plugin nativo di PizzaLab (Android): stato della batteria e scorciatoie alle impostazioni. */
const ReminderHealth = registerPlugin<{
  status(): Promise<{ batteryUnrestricted: boolean; manufacturer: string; model: string; sdk: number }>;
  openAppSettings(): Promise<void>;
  openBatterySettings(): Promise<void>;
}>('ReminderHealth');

export interface ReminderDiagnosis {
  notificationsAllowed: boolean;
  exactAllowed: boolean;
  batteryUnrestricted: boolean | null;
  manufacturer: string;
  pending: number;
  nextAt: string | null;
}

/** Tutto quello che può impedire a una notifica di arrivare ad app chiusa, in un colpo d’occhio. */
export async function diagnoseReminders(): Promise<ReminderDiagnosis | null> {
  if (!Capacitor.isNativePlatform()) return null;
  const [permission, exact, pending, health] = await Promise.all([
    LocalNotifications.checkPermissions().catch(() => ({ display: 'denied' })),
    exactRemindersAllowed(),
    LocalNotifications.getPending().catch(() => ({ notifications: [] })),
    ReminderHealth.status().catch(() => null),
  ]);
  const times = pending.notifications
    .map((item) => (item.schedule?.at ? new Date(item.schedule.at).getTime() : NaN))
    .filter((time) => Number.isFinite(time) && time > Date.now())
    .sort((a, b) => a - b);
  return {
    notificationsAllowed: permission.display === 'granted',
    exactAllowed: exact,
    batteryUnrestricted: health ? health.batteryUnrestricted : null,
    manufacturer: health?.manufacturer ?? '',
    pending: times.length,
    nextAt: times.length ? new Date(times[0]).toISOString() : null,
  };
}

export const openAppSettings = () => ReminderHealth.openAppSettings().catch(() => undefined);
export const openBatterySettings = () => ReminderHealth.openBatterySettings().catch(() => undefined);

/** Notifica di prova tra un minuto, con lo stesso canale e lo stesso tipo di avviso dei promemoria veri. */
export async function sendTestReminder(): Promise<void> {
  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== 'granted') throw new Error(t("Notifiche non autorizzate. Puoi abilitarle nelle impostazioni Android."));
  await LocalNotifications.createChannel({ id: CHANNEL, name: t("Il tuo impasto"), description: t("Promemoria per ogni fase della pizza"), importance: 4, visibility: 1, vibration: true });
  const exact = await exactRemindersAllowed();
  await LocalNotifications.schedule({ notifications: [{
    id: 2999,
    title: t("PizzaLab · Notifica di prova"),
    body: t("Se la leggi all’orario giusto, i promemoria della pizza funzionano anche ad app chiusa."),
    channelId: CHANNEL,
    isExactNotification: exact,
    schedule: { at: new Date(Date.now() + 60000), allowWhileIdle: true },
  }] });
}
