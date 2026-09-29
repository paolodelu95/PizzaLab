import { buildTimeline, deriveAutomaticSchedule, type calculate } from "./calculator";
import { localDateTime } from "./styles";
import { formatWeight } from "../services/units";
import type { DoughConfig, Recipe, Stage } from "./types";

export type RecipeStatus = "active" | "saved" | "past";
type GoodResult = Extract<ReturnType<typeof calculate>, { ok: true }>;
export interface ScaleItem {
  label: string;
  grams: number;
  note?: string;
}

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
        ? `${formatWeight(result.autolyse.water)} nell’autolisi e ${formatWeight(result.autolyse.reservedWater)} di riserva.`
        : undefined,
    },
    { label: yeastLabel(config.yeast), grams: result.yeast },
    { label: "Sale", grams: result.salt },
    ...(result.oil > 0 ? [{ label: "Olio", grams: result.oil }] : []),
    ...(result.sugar > 0 ? [{ label: "Zucchero", grams: result.sugar }] : []),
    ...(result.malt > 0 ? [{ label: "Malto", grams: result.malt }] : []),
  ];
}

/** Ricava tempi e dose di lievito dalla finestra inizio → cottura (modalità automatica). */
export function applyAutomaticPlan(config: DoughConfig): DoughConfig {
  const automatic = deriveAutomaticSchedule(config);
  if (!automatic.ok) return config;
  const naturalStarter = ["sourdough", "licoli"].includes(config.yeast);
  const roomRate = 2 ** ((config.roomTemp - 22) / 10);
  const coldRate = 0.08 * 2 ** ((config.fridgeTemp - 4) / 5);
  const equivalentHours =
    (automatic.bulkHours + automatic.proofHours) * roomRate + automatic.coldHours * coldRate;
  const automaticStarterPercent = Math.max(5, Math.min(50, 20 * (8 / Math.max(0.5, equivalentHours)) ** 0.65));
  return {
    ...config,
    yeastMode: naturalStarter ? config.yeastMode : "auto",
    starterPercent: naturalStarter ? Math.round(automaticStarterPercent * 10) / 10 : config.starterPercent,
    bulkHours: automatic.bulkHours,
    coldHours: automatic.coldHours,
    proofHours: automatic.proofHours,
  };
}

export type StartTiming = "future" | "now" | "late" | "expired";

/**
 * Quando si può partire: prima dell’orario si programma, attorno all’orario si inizia,
 * se l’orario è passato da poco si ricalcola, se anche la cottura è passata si riprogramma.
 */
export function startTiming(stages: Stage[], bakeAt: string, now: number, graceMinutes = 15): StartTiming {
  if (!stages.length) return "expired";
  const start = new Date(stages[0].at).getTime();
  if (start > now + graceMinutes * 60000) return "future";
  if (start >= now - graceMinutes * 60000) return "now";
  return new Date(bakeAt).getTime() > now ? "late" : "expired";
}

const roundToMinute = (time: number) => Math.round(time / 60000) * 60000;

/** Parte adesso con gli stessi tempi: tutto slitta, anche l’infornata. */
export function shiftPlanToNow(config: DoughConfig, now: number): DoughConfig {
  const stages = buildTimeline(config);
  const delta = roundToMinute(now) - new Date(stages[0].at).getTime();
  const move = (value: string) => localDateTime(new Date(new Date(value).getTime() + delta));
  return { ...config, bakeAt: move(config.bakeAt), startAt: move(config.startAt) };
}

/**
 * Parte adesso ma mantiene l’orario della cena: accorcia la lievitazione
 * e ricalcola il lievito. Può fallire se non resta abbastanza tempo.
 */
export function keepMealTimeFromNow(config: DoughConfig, now: number): { ok: true; config: DoughConfig } | { ok: false; error: string } {
  const candidate: DoughConfig = {
    ...config,
    planMode: "automatic",
    startAt: localDateTime(new Date(roundToMinute(now))),
  };
  const automatic = deriveAutomaticSchedule(candidate);
  if (!automatic.ok) return { ok: false, error: automatic.error };
  return { ok: true, config: applyAutomaticPlan(candidate) };
}
