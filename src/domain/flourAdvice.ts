import { styles } from "./styles";
import { flourStrength, type Strength } from "./flourStrength";
import type { DoughConfig, Flour } from "./types";

/** Soglia prudenziale di idratazione per una farina: sale con il W, ma resta tra 55 e 85%. */
export const hydrationCeiling = (w: number) => Math.max(55, Math.min(85, 58 + (w - 180) * 0.12));

export interface StrengthNeeds {
  /** W minimo perché la farina regga stile, ore e acqua (le stesse soglie degli avvisi del calcolatore). */
  min: number;
  /** W massimo oltre il quale con poche ore l’impasto resta gommoso. */
  max: number;
  hours: number;
}

/** Quanta forza serve alla farina per questa ricetta, con le stesse regole degli avvisi. */
export function strengthNeeds(c: DoughConfig): StrengthNeeds {
  const style = styles.find((item) => item.id === c.styleId) ?? styles[0];
  const hours = c.bulkHours + c.coldHours + c.proofHours;
  let min = style.minW;
  if (hours > 72) min = Math.max(min, 340);
  else if (hours > 48) min = Math.max(min, 300);
  else if (hours > 24) min = Math.max(min, 240);
  if (c.hydration > 70) min = Math.max(min, 260);
  return { min, max: hours < 8 ? 279 : Infinity, hours };
}

export const fitsNeeds = (strength: Strength, needs: StrengthNeeds) => strength.low >= needs.min && strength.high <= needs.max;

const usableForPizza = (flour: Flour) => flour.usable && flour.kind === "wheat" && !flour.glutenFree && flour.type !== "Integrale";

export interface FlourSuggestion {
  flour: Flour;
  strength: Strength;
}

/**
 * Le farine del catalogo adatte alla ricetta. Prima quelle con W dichiarato, poi quelle con W stimato;
 * dentro ogni gruppo la più vicina al necessario (una farina più forte del dovuto non serve).
 * Al massimo `limit` risultati, con marchi diversi finché possibile.
 */
export function recommendFlours(c: DoughConfig, flours: Flour[], limit = 3): { needs: StrengthNeeds; current: boolean; suggestions: FlourSuggestion[] } {
  const needs = strengthNeeds(c);
  const target = needs.max === Infinity ? needs.min + 50 : Math.min(needs.max - 40, needs.min + 50);
  const candidates = flours
    .filter(usableForPizza)
    .map((flour) => ({ flour, strength: flourStrength(flour) }))
    .filter((item): item is FlourSuggestion => item.strength !== null && fitsNeeds(item.strength, needs))
    .sort(
      (a, b) =>
        Number(a.strength.estimated) - Number(b.strength.estimated) ||
        Math.abs(a.strength.value - target) - Math.abs(b.strength.value - target) ||
        a.flour.name.localeCompare(b.flour.name),
    );
  const currentFlour = flours.find((flour) => flour.id === c.flourId);
  const currentStrength = currentFlour ? flourStrength(currentFlour) : null;
  const others = candidates.filter((item) => item.flour.id !== c.flourId);
  const picked: FlourSuggestion[] = [];
  for (const item of others) if (picked.length < limit && !picked.some((p) => p.flour.brand === item.flour.brand)) picked.push(item);
  for (const item of others) if (picked.length < limit && !picked.includes(item)) picked.push(item);
  return { needs, current: currentStrength ? fitsNeeds(currentStrength, needs) : false, suggestions: picked };
}
