import { locale } from "../i18n";
/**
 * Unità di misura scelte dall’utente (peso e temperatura).
 *
 * Il dominio ragiona sempre in grammi e gradi Celsius, e così restano salvati ricette, forni e
 * configurazione. Qui si converte solo per mostrare i numeri e per leggere gli input.
 *
 * Le unità correnti sono uno stato di modulo impostato da App a ogni render: le funzioni del dominio
 * che producono testi (calcolatore, fasi del piano) non sono componenti e non potrebbero leggere un
 * context, mentre tutti i componenti si ridisegnano già quando App cambia stato.
 */
export type WeightUnit = "g" | "oz";
export type TempUnit = "C" | "F";
export interface Units {
  weight: WeightUnit;
  temp: TempUnit;
}
export type Quantity = "weight" | "temp";

export const defaultUnits: Units = { weight: "g", temp: "C" };
export const GRAMS_PER_OUNCE = 28.349523125;
/** In once le quantità sotto questa soglia (lievito, malto, un po’ di sale) restano in grammi. */
export const SMALL_WEIGHT_GRAMS = 5;

let current: Units = defaultUnits;
export const getUnits = () => current;
export function setUnits(next: Units) {
  if (next.weight !== current.weight || next.temp !== current.temp) current = { ...next };
}

/** Accetta solo valori noti: un archivio vecchio o manomesso ricade sui predefiniti. */
export function normalizeUnits(value: unknown): Units {
  const input = (value && typeof value === "object" ? value : {}) as Partial<Units>;
  return {
    weight: input.weight === "oz" ? "oz" : "g",
    temp: input.temp === "F" ? "F" : "C",
  };
}

export const gramsToOunces = (grams: number) => grams / GRAMS_PER_OUNCE;
export const ouncesToGrams = (ounces: number) => ounces * GRAMS_PER_OUNCE;
export const celsiusToFahrenheit = (celsius: number) => (celsius * 9) / 5 + 32;
export const fahrenheitToCelsius = (fahrenheit: number) => ((fahrenheit - 32) * 5) / 9;

const number = (value: number, digits: number) =>
  value.toLocaleString(locale(), { maximumFractionDigits: digits });

export const weightLabel = (units: Units = current) => units.weight;
export const tempLabel = (units: Units = current) => (units.temp === "F" ? "°F" : "°C");

/** Numero e unità separati, per i punti in cui l’unità sta in un elemento a parte. */
export function weightParts(grams: number, digits = 0, units: Units = current) {
  if (units.weight === "oz" && Math.abs(grams) >= SMALL_WEIGHT_GRAMS) {
    const ounces = gramsToOunces(grams);
    return { value: number(ounces, Math.abs(ounces) < 10 ? 2 : 1), unit: "oz" };
  }
  return { value: number(grams, digits), unit: "g" };
}

export function formatWeight(grams: number, digits = 0, units: Units = current) {
  const { value, unit } = weightParts(grams, digits, units);
  return `${value} ${unit}`;
}

export function formatTemp(celsius: number, digits = 0, units: Units = current) {
  return units.temp === "F"
    ? `${number(celsiusToFahrenheit(celsius), digits)} °F`
    : `${number(celsius, digits)} °C`;
}

/** «24–26 °C» oppure «75–79 °F». */
export function formatTempRange(from: number, to: number, units: Units = current) {
  const convert = (value: number) => (units.temp === "F" ? celsiusToFahrenheit(value) : value);
  return `${number(convert(from), 0)}–${number(convert(to), 0)} ${units.temp === "F" ? "°F" : "°C"}`;
}

const TEMPERATURE_IN_TEXT = /(\d+(?:[.,]\d+)?)(?:\s?[–-]\s?(\d+(?:[.,]\d+)?))?\s?°C/g;
/** Riscrive le temperature dei testi fissi (guide, note dei forni) nell’unità scelta. */
export function localizeTemperatures(text: string, units: Units = current) {
  if (units.temp !== "F") return text;
  const read = (raw: string) => Number(raw.replace(",", "."));
  const digitsOf = (raw: string) => (/[.,]\d/.test(raw) ? 1 : 0);
  return text.replace(TEMPERATURE_IN_TEXT, (_match, from: string, to?: string) =>
    to === undefined
      ? formatTemp(read(from), digitsOf(from), units)
      : formatTempRange(read(from), read(to), units),
  );
}

/** Passo «tondo» più vicino tra quelli comodi per un cursore. */
function niceStep(raw: number) {
  const steps = [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 25, 50];
  return steps.reduce((best, step) => (Math.abs(Math.log(step / raw)) < Math.abs(Math.log(best / raw)) ? step : best));
}

export interface FieldScale {
  /** Etichetta dell’unità da mostrare accanto al campo. */
  unit: string;
  /** Il valore è già nell’unità del dominio (nessuna conversione). */
  identity: boolean;
  toDisplay: (domain: number) => number;
  fromDisplay: (display: number) => number;
  min: number;
  max: number;
  step: number;
  /** Testo del numero nel campo, senza errori di virgola mobile. */
  format: (domain: number) => string;
  /** Vero se il testo digitato corrisponde già al valore di dominio (evita di riscriverlo mentre si digita). */
  matches: (draft: string, domain: number) => boolean;
}

/**
 * Prepara un campo numerico: min, max e passo del dominio diventano quelli dell’unità scelta e le
 * conversioni sono arrotondate a un valore di dominio pulito, così digitare non sposta mai il numero.
 */
export function scaleField(
  quantity: Quantity | undefined,
  range: { min: number; max: number; step: number },
  units: Units = current,
): FieldScale {
  const converting =
    (quantity === "weight" && units.weight === "oz") || (quantity === "temp" && units.temp === "F");
  if (!converting) {
    return {
      unit: quantity === "weight" ? "g" : quantity === "temp" ? "°C" : "",
      identity: true,
      toDisplay: (value) => value,
      fromDisplay: (value) => value,
      ...range,
      format: (value) => String(value),
      matches: (draft, domain) => draft.trim() !== "" && Number(draft) === domain,
    };
  }
  const weight = quantity === "weight";
  const toDisplay = weight ? gramsToOunces : celsiusToFahrenheit;
  // Il dominio conserva solo due decimali: abbastanza per tornare allo stesso numero in oz o °F.
  const fromDisplay = (value: number) =>
    Math.round((weight ? ouncesToGrams(value) : fahrenheitToCelsius(value)) * 100) / 100;
  const step = niceStep(weight ? range.step / GRAMS_PER_OUNCE : (range.step * 9) / 5);
  const digits = weight ? 2 : 1;
  return {
    unit: weight ? "oz" : "°F",
    identity: false,
    toDisplay,
    fromDisplay,
    min: Math.round(toDisplay(range.min) * 100) / 100,
    max: Math.round(toDisplay(range.max) * 100) / 100,
    step,
    format: (domain) => String(Math.round(toDisplay(domain) * 10 ** digits) / 10 ** digits),
    matches: (draft, domain) => draft.trim() !== "" && Math.abs(fromDisplay(Number(draft)) - domain) <= 0.011,
  };
}
