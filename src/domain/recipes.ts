import type { calculate } from "./calculator";
import type { Recipe, Stage } from "./types";

export type RecipeStatus = "active" | "saved" | "past";
type GoodResult = Extract<ReturnType<typeof calculate>, { ok: true }>;
export interface ScaleItem {
  label: string;
  grams: number;
  note?: string;
}

const fmt = (n: number) => n.toLocaleString("it-IT", { maximumFractionDigits: 0 });

/**
 * Una pizza è "in corso" solo se è stata avviata ed è il piano attivo;
 * "passata" se conclusa (o, per gli archivi precedenti, se è già stata
 * cotta e annotata); altrimenti resta "salvata" e si può riprendere.
 */
export function recipeStatus(recipe: Recipe, activeId: string | null, now: number): RecipeStatus {
  if (recipe.finishedAt) return "past";
  if (recipe.id === activeId) return "active";
  const baked = new Date(recipe.config.bakeAt).getTime() <= now;
  if (baked && (recipe.rating > 0 || recipe.notes.trim() !== "" || recipe.completedStages.length > 0))
    return "past";
  return "saved";
}

/** Un piano si può avviare finché la sua prima fase non è già passata. */
export function canStartPlan(stages: Stage[], now: number, graceMinutes = 15) {
  if (!stages.length) return false;
  return new Date(stages[0].at).getTime() >= now - graceMinutes * 60000;
}

export function yeastLabel(yeast: Recipe["config"]["yeast"]) {
  return yeast === "sourdough"
    ? "Pasta madre"
    : yeast === "licoli"
      ? "Licoli"
      : `Lievito ${yeast === "fresh" ? "fresco" : "secco"}`;
}

export function buildScaleItems(config: Recipe["config"], result: GoodResult): ScaleItem[] {
  return [
    ...result.mainFlourBreakdown.map((item) => ({
      label: item.name,
      grams: item.grams,
      note: "Farina da aggiungere direttamente all’impasto.",
    })),
    ...(config.preferment !== "none"
      ? [{ label: `Farina per ${config.preferment}`, grams: result.preferment.flour }]
      : []),
    {
      label: "Acqua da aggiungere",
      grams: result.waterToWeigh,
      note: config.autolyse
        ? `${fmt(result.autolyse.water)} g nell’autolisi e ${fmt(result.autolyse.reservedWater)} g di riserva.`
        : undefined,
    },
    { label: yeastLabel(config.yeast), grams: result.yeast },
    { label: "Sale", grams: result.salt },
    ...(result.oil > 0 ? [{ label: "Olio", grams: result.oil }] : []),
    ...(result.sugar > 0 ? [{ label: "Zucchero", grams: result.sugar }] : []),
    ...(result.malt > 0 ? [{ label: "Malto", grams: result.malt }] : []),
  ];
}
