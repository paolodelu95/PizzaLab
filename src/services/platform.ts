import { Capacitor } from "@capacitor/core";

/** App Android nativa (APK): notifiche locali vere. */
export const isNativeApp = () => Capacitor.isNativePlatform();

/** iPhone o iPad (anche iPadOS che si presenta come Mac con touch). */
export const isAppleMobile = () =>
  typeof navigator !== "undefined" &&
  (/iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

/** Aperta dalla schermata Home come app installata (senza barra del browser). */
export const isInstalledWebApp = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true);

/** Nel browser (anche installata sulla Home) gli avvisi a orario passano dal calendario. */
export const usesCalendarReminders = () => !isNativeApp();
