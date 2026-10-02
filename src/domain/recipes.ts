import { t } from "../i18n";
import { buildTimeline, calculate, deriveAutomaticSchedule, MIN_COLD_HOURS } from "./calculator";
import { bakingDefaults, localDateTime, recommendedExtras, styles } from "./styles";
import { ovenProfiles } from "../data/ovens";
import { formatWeight } from "../services/units";
import type { DoughConfig, Flour, Recipe, RecipeTemplate, Stage } from "./types";

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
    ? t("Pasta madre")
    : yeast === "licoli"
      ? t("Licoli")
      : yeast === "fresh"
        ? t("Lievito fresco")
        : t("Lievito secco");
}

export function buildScaleItems(config: Recipe["config"], result: GoodResult): ScaleItem[] {
  return [
    ...result.mainFlourBreakdown.map((item) => ({
      label: item.name,
      grams: item.grams,
      note: t("Farina da aggiungere direttamente all’impasto."),
    })),
    ...(config.preferment !== "none"
      ? [{ label: t("Farina per {preferment}", { preferment: config.preferment }), grams: result.preferment.flour }]
      : []),
    {
      label: t("Acqua da aggiungere"),
      grams: result.waterToWeigh,
      note: config.autolyse
        ? t("{water} nell’autolisi e {reserve} di riserva.", { water: formatWeight(result.autolyse.water), reserve: formatWeight(result.autolyse.reservedWater) })
        : undefined,
    },
    { label: yeastLabel(config.yeast), grams: result.yeast },
    { label: t("Sale"), grams: result.salt },
    ...(result.oil > 0 ? [{ label: t("Olio"), grams: result.oil }] : []),
    ...(result.sugar > 0 ? [{ label: t("Zucchero"), grams: result.sugar }] : []),
    ...(result.malt > 0 ? [{ label: t("Malto"), grams: result.malt }] : []),
  ];
}

/**
 * Lo stile porta con sé acqua, tempi e cottura tipici; forno, farina e attrezzatura restano i tuoi.
 * `savedOvenTemp` è la temperatura reale del forno salvato nel profilo, se c’è.
 */
export function applyStyleDefaults(config: DoughConfig, id: string, savedOvenTemp?: number): DoughConfig {
  const style = styles.find((item) => item.id === id) ?? styles[0];
  const oven = ovenProfiles.find((o) => o.id === config.ovenType);
  const ovenMax = savedOvenTemp ?? (oven && oven.id !== "custom" ? oven.maxTemp : undefined);
  // Alcuni stili nascono in teglia tonda (focaccia barese): si parte da forma e spessore tipici.
  const panShape = style.panShape ?? config.panShape;
  const panDiameter = style.panDiameter ?? config.panDiameter;
  return {
    ...config,
    styleId: id,
    ...(style.pan ? { panShape, panDiameter, panDensity: style.panDensity ?? 0.6 } : {}),
    ...(id === "focaccia-barese" ? { toppingPresetId: "barese" } : {}),
    pizzaDiameter: style.pan && panShape === "round" ? panDiameter : id === "padellino" ? 20 : id === "new-york" ? 35 : 32,
    toppingCount: config.count,
    toppingWidth: config.panWidth,
    toppingLength: config.panLength,
    hydration: style.hydration,
    ballWeight: style.ballWeight,
    ...recommendedExtras(id),
    // Il malto è difficile da trovare: si suggerisce, ma si parte senza.
    malt: 0,
    coldHours: style.cold,
    bulkHours: style.bulk,
    proofHours: style.proof,
    ovenTemp: ovenMax !== undefined ? Math.min(style.oven, ovenMax) : style.oven,
    ...bakingDefaults(id),
    // Nei forni con pietra fissa l’altezza non si sceglie.
    ...(oven?.fixedRack ? { ovenRack: "middle" as const } : {}),
  };
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

/**
 * Piano automatico con «Grammi interi»: la dose calcolata diventa un numero intero di grammi
 * e la stessa finestra si ridivide tra ambiente e frigo, così la crescita complessiva resta quella
 * prevista. Si prova prima per difetto e per eccesso e si tiene la soluzione più vicina al piano.
 */
export function applyWholeGrams(config: DoughConfig, flours: Flour[]): DoughConfig {
  if (config.planMode !== "automatic" || !config.autoWholeGrams || ["sourdough", "licoli"].includes(config.yeast)) return config;
  const base = calculate({ ...config, yeastMode: "auto" }, flours);
  if (!base.ok || !(base.yeast > 0)) return config;
  const roomRate = 2 ** ((config.roomTemp - 22) / 10);
  const coldRate = 0.08 * 2 ** ((config.fridgeTemp - 4) / 5);
  const saltFactor = 1 + (config.salt - 2.5) * 0.08;
  const window = config.bulkHours + config.coldHours + config.proofHours;
  const warmNow = config.bulkHours + config.proofHours;
  const proofShare = warmNow > 0 ? config.proofHours / warmNow : 0.5;
  const minBulk = Math.max(0.5, (config.foldCount * config.foldIntervalMinutes) / 60);
  const roundHalf = (value: number) => Math.round(value * 2) / 2;
  let best: { config: DoughConfig; cost: number } | null = null;
  for (const grams of new Set([Math.floor(base.yeast), Math.ceil(base.yeast)])) {
    if (grams < 1 || grams > 30) continue;
    const freshPercent = (grams / base.yeast) * base.yeastPercent * (config.yeast === "instant" ? 3 : 1);
    const target = 8 * ((0.18 * saltFactor) / freshPercent) ** (1 / 0.85);
    let warm: number;
    let cold = 0;
    if (config.coldHours > 0) {
      warm = (target - window * coldRate) / (roomRate - coldRate);
      cold = window - warm;
      if (cold < MIN_COLD_HOURS || warm < minBulk + 1) continue;
    } else {
      warm = target / roomRate;
      if (warm > window + 0.25 || warm < minBulk + 0.5) continue;
    }
    const proof = Math.max(0.5, roundHalf(warm * proofShare));
    const bulk = Math.max(roundHalf(minBulk), roundHalf(warm - proof));
    const next: DoughConfig = {
      ...config,
      yeastMode: "weighable",
      weighableYeastGrams: grams,
      bulkHours: bulk,
      proofHours: proof,
      coldHours: cold > 0 ? roundHalf(window - bulk - proof) : 0,
    };
    // Meno cambia il piano, meglio è: conta lo scarto dei tempi e un po’ quello della dose.
    const cost = Math.abs(bulk + proof - warmNow) + Math.abs(grams - base.yeast);
    if (!calculate(next, flours).ok) continue;
    if (!best || cost < best.cost) best = { config: next, cost };
  }
  return best?.config ?? config;
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

/** Persone servite da una teglia (una pizza a testa per gli stili in panetti). */
export const PORTIONS_PER_PAN = 4;
export const countForPeople = (people: number, isPan: boolean) => (isPan ? Math.max(1, Math.ceil(people / PORTIONS_PER_PAN)) : Math.max(1, people));

const HOUR = 3600000;

export interface StartSuggestion {
  startAt: string;
  /** Ora del pasto: uguale a quella scelta, salvo quando è stato spostato in avanti. */
  bakeAt: string;
  /** L’orario ideale era già passato: si parte adesso con meno ore del tipico. */
  shortened: boolean;
  /** Non restava tempo per una buona lievitazione: il pasto è stato spostato in avanti. */
  movedMeal: boolean;
  /** Ore di lievitazione del piano proposto. */
  hours: number;
}

/** Ore minime perché la lievitazione sia decente: 8 (sotto, l’impasto non matura), o meno se lo stile è veloce. */
const MIN_GOOD_HOURS = 8;

/**
 * Orario di inizio consigliato per mangiare a `bakeAt`: la lievitazione tipica dello stile, più la preparazione,
 * spostata indietro se cadrebbe di notte (prima delle 7 o dopo le 22).
 * Se l’orario ideale è già passato: si parte adesso quando restano almeno 8 ore di lievitazione;
 * altrimenti si sposta il pasto al primo momento in cui l’orario ideale è ancora davanti (`movedMeal`).
 */
export function suggestStart(config: DoughConfig, now: number): StartSuggestion | null {
  const bake = new Date(config.bakeAt).getTime();
  const style = styles.find((item) => item.id === config.styleId);
  if (!Number.isFinite(bake) || !style) return null;
  const prep = 20 / 60 + (config.autolyse ? config.autolyseMinutes / 60 : 0) + (config.preferment === "none" ? 0 : config.prefermentHours);
  const ideal = style.bulk + style.cold + style.proof;
  const idealStart = (bakeMs: number) => {
    const start = new Date(bakeMs - (ideal + prep) * HOUR);
    const hour = start.getHours() + start.getMinutes() / 60;
    if (hour < 7) {
      start.setDate(start.getDate() - 1);
      start.setHours(22, 0, 0, 0);
    } else if (hour >= 22) start.setHours(22, 0, 0, 0);
    return start;
  };
  const window = (startMs: number, bakeMs: number) => Math.round(((bakeMs - startMs) / HOUR - prep) * 10) / 10;
  const start = idealStart(bake);
  if (start.getTime() >= now) return { startAt: localDateTime(start), bakeAt: config.bakeAt, shortened: false, movedMeal: false, hours: window(start.getTime(), bake) };

  const nowStart = Math.ceil(now / (5 * 60000)) * 5 * 60000;
  if (window(nowStart, bake) >= Math.min(ideal, MIN_GOOD_HOURS))
    return { startAt: localDateTime(new Date(nowStart)), bakeAt: config.bakeAt, shortened: true, movedMeal: false, hours: window(nowStart, bake) };

  // Troppo tardi per una buona lievitazione: stesso orario del pasto, nel primo giorno in cui c’è il tempo.
  let later = bake;
  for (let day = 0; day < 14 && idealStart(later).getTime() < now; day++) {
    const next = new Date(later);
    next.setDate(next.getDate() + 1);
    later = next.getTime();
  }
  const laterStart = idealStart(later);
  return { startAt: localDateTime(laterStart), bakeAt: localDateTime(new Date(later)), shortened: false, movedMeal: true, hours: window(laterStart.getTime(), later) };
}

/** Le tue pizze già valutate con la stessa farina (e con lo stesso forno): quante e con che voto medio. */
export function ratedHistory(recipes: Recipe[], config: DoughConfig) {
  const rated = recipes.filter((recipe) => recipe.rating > 0);
  const summary = (list: Recipe[]) => ({ count: list.length, average: list.length ? list.reduce((sum, r) => sum + r.rating, 0) / list.length : 0 });
  const sameFlour = rated.filter((recipe) => recipe.config.flourId === config.flourId);
  return {
    flour: summary(sameFlour),
    flourAndOven: summary(sameFlour.filter((recipe) => recipe.config.ovenType === config.ovenType)),
  };
}

/** Una ricetta da modello riparte da oggi: si tengono tutte le scelte, si rimettono le date di partenza. */
export function configFromTemplate(template: RecipeTemplate, fresh: DoughConfig): DoughConfig {
  return { ...fresh, ...template.config, startAt: fresh.startAt, bakeAt: fresh.bakeAt };
}
