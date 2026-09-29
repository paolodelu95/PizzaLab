import { t } from "../i18n";
import type { Flour } from "./types";

/**
 * Quanto si scosta il W stimato quando decide un avviso. L’intervallo mostrato è largo (vedi scripts/estimate-w.mjs),
 * ma per gli avvisi si usa solo circa uno scarto tipico: un intervallo di tre scarti farebbe suonare l’allarme
 * anche per farine che vanno benissimo.
 */
export const CHECK_SPREAD = 40;

export interface Strength {
  value: number;
  /** Estremi usati dagli avvisi: uguali a `value` se il W è dichiarato dal produttore. */
  low: number;
  high: number;
  estimated: boolean;
}

/** Forza W di una farina: dichiarata dal produttore, oppure stimata, oppure sconosciuta. */
export function flourStrength(flour: Flour): Strength | null {
  if (flour.w) {
    const value = (flour.w[0] + flour.w[1]) / 2;
    return { value, low: value, high: value, estimated: false };
  }
  if (flour.wEstimate) {
    const { value, min, max } = flour.wEstimate;
    return { value, low: Math.max(min, value - CHECK_SPREAD), high: Math.min(max, value + CHECK_SPREAD), estimated: true };
  }
  return null;
}

/** Media pesata della forza dei componenti di una miscela: sconosciuta se manca anche solo uno. */
export function blendStrength(parts: { strength: Strength | null; share: number }[]): Strength | null {
  if (!parts.length || parts.some((part) => !part.strength)) return null;
  const sum = (pick: (s: Strength) => number) => parts.reduce((total, part) => total + pick(part.strength!) * part.share, 0);
  return {
    value: sum((s) => s.value),
    low: sum((s) => s.low),
    high: sum((s) => s.high),
    estimated: parts.some((part) => part.strength!.estimated),
  };
}

/** Testo per l’interfaccia: «260–280», oppure «175–365» per una stima (con `estimated` a vero). */
export function strengthText(flour: Flour): { text: string; estimated: boolean } | null {
  if (flour.w) return { text: flour.w[1] !== flour.w[0] ? `${flour.w[0]}–${flour.w[1]}` : `${flour.w[0]}`, estimated: false };
  if (flour.wEstimate) return { text: `${flour.wEstimate.min}–${flour.wEstimate.max}`, estimated: true };
  return null;
}

/** Riga breve per le schede: «W 260–280», «W stimato 175–365» oppure «W non disponibile». */
export function strengthLine(flour: Flour) {
  const strength = strengthText(flour);
  if (!strength) return t("W non disponibile");
  return strength.estimated ? t("W stimato {range}", { range: strength.text }) : `W ${strength.text}`;
}
