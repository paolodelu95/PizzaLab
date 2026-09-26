import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { buildTimeline } from '../domain/calculator';
import type { Recipe } from '../domain/types';
const CHANNEL = 'impasti';
export async function cancelReminders() {
  if (!Capacitor.isNativePlatform()) return;
  const { notifications } = await LocalNotifications.getPending();
  if (notifications.length) await LocalNotifications.cancel({ notifications });
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
