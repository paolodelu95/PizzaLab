/**
 * Traduzioni: il testo italiano è la chiave, `en.ts` contiene le traduzioni inglesi.
 * Una stringa senza traduzione resta in italiano, e un test controlla che non ne manchi nessuna.
 *
 * Come per le unità (services/units) la lingua è uno stato di modulo impostato da App a ogni
 * render: le funzioni del dominio che compongono testi non sono componenti e non leggerebbero un context.
 */
import { en } from "./en";

export type Language = "it" | "en";
export const languages: Language[] = ["it", "en"];

let language: Language = "it";
let imperial = false;
export const getLanguage = () => language;
export function setLocaleState(next: { language: Language; imperial: boolean }) {
  language = next.language;
  imperial = next.imperial;
}

/** Sceglie la lingua dal dispositivo: italiano se il telefono è in italiano, altrimenti inglese. */
export function detectLanguage(preferred: readonly string[] = typeof navigator === "undefined" ? [] : navigator.languages ?? [navigator.language]): Language {
  const first = preferred.find(Boolean)?.toLowerCase() ?? "it";
  return first.startsWith("it") ? "it" : "en";
}

export function normalizeLanguage(value: unknown): Language | undefined {
  return value === "it" || value === "en" ? value : undefined;
}

/** Locale per numeri e date: in inglese si usa quella americana con once e °F, altrimenti quella britannica. */
export function locale() {
  return language === "it" ? "it-IT" : imperial ? "en-US" : "en-GB";
}

const fill = (template: string, params?: Record<string, string | number>) =>
  params ? template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match)) : template;

/** Traduce un testo italiano; `{nome}` viene sostituito dai parametri. */
export function t(source: string, params?: Record<string, string | number>): string {
  return fill(language === "it" ? source : (en[source] ?? source), params);
}

/** Plurale: `one` per 1, `other` per il resto (italiano e inglese hanno le stesse due forme). */
export function tn(count: number, one: string, other: string, params?: Record<string, string | number>) {
  return t(count === 1 ? one : other, { count: count.toLocaleString(locale()), ...params });
}

/** Segna un testo statico (dati, elenchi) da tradurre al momento di mostrarlo con `t()`. */
export const msg = <T extends string>(source: T): T => source;

export const number = (value: number, digits = 0) => value.toLocaleString(locale(), { maximumFractionDigits: digits });
