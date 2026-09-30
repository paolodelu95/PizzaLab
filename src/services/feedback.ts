import { Capacitor } from "@capacitor/core";
import { FEEDBACK_EMAIL } from "../config";
import { locale, t } from "../i18n";
import { getUnits } from "./units";

/**
 * Link «mailto:» già compilato: chi segnala scrive solo cosa è successo,
 * versione, dispositivo e schermata li aggiunge l’app. Nessun dato del diario.
 */
export function bugReportUrl(version: string, screen: string) {
  const units = getUnits();
  const details = [
    `PizzaLab ${version}`,
    `${t("Piattaforma")}: ${Capacitor.getPlatform()}`,
    `${t("Schermata")}: ${screen}`,
    `${t("Lingua")}: ${locale()} · ${units.weight} · °${units.temp}`,
    `${t("Schermo")}: ${window.innerWidth}×${window.innerHeight}`,
    `${t("Browser")}: ${navigator.userAgent}`,
  ].join("\n");
  const body = `${t("Cosa è successo?")}\n\n\n${t("Cosa ti aspettavi?")}\n\n\n— ${t("Dati tecnici, lasciali pure")} —\n${details}`;
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(t("PizzaLab {version} · segnalazione", { version }))}&body=${encodeURIComponent(body)}`;
}
