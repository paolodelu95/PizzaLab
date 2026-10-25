import { defaultConfig } from "./styles";
import { validateConfig } from "./calculator";
import type { DoughConfig } from "./types";

/** Indirizzo pubblico della web app: il link si apre su qualsiasi telefono, anche senza PizzaLab installata. */
export const SHARE_BASE = "https://paolodelu95.github.io/PizzaLab/app/";
export const SHARE_PREFIX = "#ricetta=";

/** Date e scelte personali (lievito madre, impastatrice) restano a chi riceve: non viaggiano nel link. */
const PERSONAL: (keyof DoughConfig)[] = ["bakeAt", "startAt", "sourdoughProfileId", "mixerProfileId"];
const FLOUR_SLOTS = [
  ["secondFlourId", "secondFlourPercent"],
  ["thirdFlourId", "thirdFlourPercent"],
  ["fourthFlourId", "fourthFlourPercent"],
] as const;

const toBase64Url = (text: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(text))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromBase64Url = (code: string) =>
  new TextDecoder().decode(Uint8Array.from(atob(code.replace(/-/g, "+").replace(/_/g, "/")), (char) => char.charCodeAt(0)));

/** Solo i valori diversi dal predefinito: il link resta corto e il QR leggibile. */
export function encodeRecipe(name: string, config: DoughConfig): string {
  const base = defaultConfig();
  const changed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config) as [keyof DoughConfig, unknown][])
    if (!PERSONAL.includes(key) && value !== base[key]) changed[key] = value;
  return `${SHARE_BASE}${SHARE_PREFIX}${toBase64Url(JSON.stringify({ n: name.slice(0, 80), c: changed }))}`;
}

/**
 * Legge una ricetta da un link. Le farine che chi riceve non ha (per esempio quelle aggiunte a mano)
 * tornano alla farina predefinita; ciò che non è valido scarta il link intero.
 */
export function decodeRecipe(hash: string, knownFlourIds: string[]): { name: string; config: DoughConfig } | null {
  if (!hash.startsWith(SHARE_PREFIX)) return null;
  try {
    const data = JSON.parse(fromBase64Url(hash.slice(SHARE_PREFIX.length))) as { n?: unknown; c?: unknown };
    if (!data.c || typeof data.c !== "object" || Array.isArray(data.c)) return null;
    const base = defaultConfig();
    const config = { ...base } as Record<string, unknown>;
    for (const [key, value] of Object.entries(data.c as Record<string, unknown>))
      if (key in base && !PERSONAL.includes(key as keyof DoughConfig) && typeof value === typeof base[key as keyof DoughConfig]) config[key] = value;
    const result = config as unknown as DoughConfig;
    const known = new Set(knownFlourIds);
    if (!known.has(result.flourId)) result.flourId = base.flourId;
    for (const [id, percent] of FLOUR_SLOTS)
      if (result[id] && !known.has(result[id])) {
        result[id] = "";
        result[percent] = 0;
      }
    if (result.prefermentFlourId && !known.has(result.prefermentFlourId)) result.prefermentFlourId = "";
    if (validateConfig(result).length) return null;
    const name = typeof data.n === "string" ? data.n.trim().slice(0, 80) : "";
    return { name, config: result };
  } catch {
    return null;
  }
}
