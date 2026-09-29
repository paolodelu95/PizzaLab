import { locale } from "../i18n";
/**
 * Durate leggibili in cucina: «1,33 h» non dice niente, «1 h 20 min» sì.
 * Sotto l’ora si leggono solo i minuti, fino a sei ore si usano ore e minuti,
 * oltre restano le ore con un decimale perché i minuti non servono più.
 */
export function durationLabel(hours: number) {
  if (!Number.isFinite(hours) || hours <= 0) return "0 min";
  const minutes = Math.round(hours * 60);
  if (minutes < 60) return `${minutes} min`;
  if (hours < 6) {
    const whole = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest === 0 ? `${whole} h` : `${whole} h ${rest} min`;
  }
  return `${hours.toLocaleString(locale(), { maximumFractionDigits: 1 })} h`;
}
