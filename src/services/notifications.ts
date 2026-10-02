import { t } from "../i18n";
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
/**
 * Android rimanda gli avvisi «non esatti» anche di molte ore (fino a tre quarti del tempo che manca),
 * soprattutto ad app chiusa e telefono a riposo. Con il permesso «Sveglie e promemoria» arrivano puntuali.
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

const ASKED_KEY = 'pizzalab-exact-alarm-asked';
/** La prima volta che si programma qualcosa, chiede il permesso; poi non insiste più. */
async function ensureExactReminders(): Promise<boolean> {
  if (await exactRemindersAllowed()) return true;
  let asked = false;
  try { asked = localStorage.getItem(ASKED_KEY) === '1'; localStorage.setItem(ASKED_KEY, '1'); } catch { /* nessuna memoria: chiede ogni volta */ }
  return asked ? false : askExactReminders();
}
const notExactNote = () => t("Per riceverle all’orario giusto anche ad app chiusa, attiva «Sveglie e promemoria» per PizzaLab: lo trovi nel Profilo, alla voce Notifiche.");

const leadText = (minutes: number) => (minutes > 0 ? t("Tra {minutes} minuti: ", { minutes }) : '');
/** Orario della notifica: la fase meno l’anticipo scelto, ma mai nel passato. */
const notifyAt = (at: string | Date, leadMinutes: number) =>
  new Date(Math.max(Date.now() + 5000, new Date(at).getTime() - leadMinutes * 60000));

export async function scheduleReminders(recipe: Recipe, leadMinutes = 0, ask = true): Promise<string> {
  if (!Capacitor.isNativePlatform()) return t("Per ricevere un avviso a ogni fase, premi «Aggiungi al calendario» nella scheda della pizza.");
  const stages = buildTimeline(recipe.config).filter(s => new Date(s.at).getTime() > Date.now());
  if (!stages.length) throw new Error('Questo piano è terminato. Imposta una nuova data.');
  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== 'granted') throw new Error('Notifiche non autorizzate. Puoi abilitarle nelle impostazioni Android.');
  await LocalNotifications.createChannel({ id: CHANNEL, name: t("Il tuo impasto"), description: t("Promemoria per ogni fase della pizza"), importance: 4, visibility: 1, vibration: true });
  const exact = ask ? await ensureExactReminders() : await exactRemindersAllowed();
  await cancelReminders();
  await LocalNotifications.schedule({ notifications: stages.map((stage,index) => ({
    id: 1000+index, title: t("PizzaLab · {title}", { title: stage.title }), body: `${leadText(leadMinutes)}${stage.detail}`,
    channelId: CHANNEL, isExactNotification: true, schedule: { at: notifyAt(stage.at, leadMinutes), allowWhileIdle: true }, extra: { recipeId: recipe.id },
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
  const exact = await ensureExactReminders();
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
    isExactNotification: true,
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
