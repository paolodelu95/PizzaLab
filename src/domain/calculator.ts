import { locale, t } from "../i18n";
import { styles } from "./styles";
import { mixerProfiles } from "../data/mixers";
import { ovenById } from "../data/ovens";
import { durationLabel } from "./duration";
import { formatTemp, formatTempRange, formatWeight } from "../services/units";
import { blendStrength, flourStrength } from "./flourStrength";
import { hydrationCeiling } from "./flourAdvice";
import type { Advice, DoughConfig, Flour, Stage } from "./types";
export const MODEL_VERSION = "direct-v1";
/** Un panetto impiega 2–3 ore a raffreddarsi e altrettante a tornare a temperatura:
 * sotto le 8 ore il freddo vero dura troppo poco per rallentare o dare sapore. */
export const MIN_COLD_HOURS = 8;

/** Getter: le etichette si traducono al momento dell’uso, non al caricamento del modulo. */
export const bakeSurfaceLabels: Record<DoughConfig["bakeSurface"], string> = {
  get biscotto() { return t("Biscotto refrattario"); },
  get stone() { return t("Pietra refrattaria"); },
  get steel() { return t("Acciaio"); },
  get "light-pan"() { return t("Teglia chiara"); },
  get "dark-pan"() { return t("Teglia scura"); },
  get "perforated-pan"() { return t("Teglia forata"); },
  get "cast-iron"() { return t("Ghisa"); },
};

export interface BakeOutcome {
  crustScore: number;
  crumbScore: number;
  baseScore: number;
  crustLabel: string;
  crumbLabel: string;
  baseLabel: string;
  recommendedMin: number;
  recommendedMax: number;
  summary: string;
  warnings: string[];
}

export type AutomaticSchedule =
  | {
      ok: true;
      totalHours: number;
      preparationHours: number;
      fermentationHours: number;
      bulkHours: number;
      coldHours: number;
      proofHours: number;
    }
  | { ok: false; error: string };

/** Divide the available start-to-bake window into practical warm/cold phases.
 * The yeast calculator then derives the dose from these phases and temperatures.
 */
export function deriveAutomaticSchedule(c: DoughConfig): AutomaticSchedule {
  const start = new Date(c.startAt).getTime();
  const bake = new Date(c.bakeAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(bake))
    return { ok: false, error: t("Imposta una data e un’ora valide per inizio e cottura.") };
  const totalHours = (bake - start) / 3600000;
  const preparationHours =
    20 / 60 +
    (c.autolyse ? c.autolyseMinutes / 60 : 0) +
    (c.preferment === "none" ? 0 : c.prefermentHours);
  const fermentationHours = totalHours - preparationHours;
  if (fermentationHours < 2)
    return {
      ok: false,
      error: t("Servono almeno {durationLabel} di preparazione e 2 ore di fermentazione. Allontana inizio e cottura.", { durationLabel: durationLabel(preparationHours) }),
    };
  if (fermentationHours > 144)
    return { ok: false, error: t("La finestra supera i limiti gestibili di 6 giorni. Avvicina l’inizio alla cottura.") };

  const style = styles.find((item) => item.id === c.styleId) ?? styles[0];
  const minBulk = Math.max(0.5, (c.foldCount * c.foldIntervalMinutes) / 60);
  if (minBulk > 24)
    return { ok: false, error: t("Le pieghe richiedono una puntata più lunga del limite disponibile.") };
  if (fermentationHours < minBulk + 0.5)
    return { ok: false, error: t("La finestra non lascia abbastanza tempo per completare le pieghe e almeno mezz’ora di appretto.") };

  let bulkHours: number;
  let proofHours: number;
  let coldHours: number;
  // Il frigo entra nel piano solo se, lasciando almeno 1 ora di puntata e 2 di appretto
  // per far riprendere i panetti, restano le ore minime perché serva davvero.
  const minColdBulk = Math.max(1, minBulk);
  const prefersCold = style.cold > 0 && fermentationHours - minColdBulk - 2 >= MIN_COLD_HOURS;
  if (!prefersCold) {
    const warmRatio = style.bulk / Math.max(0.5, style.bulk + style.proof);
    bulkHours = Math.max(minBulk, fermentationHours * warmRatio);
    proofHours = fermentationHours - bulkHours;
    if (proofHours < 0.5) {
      proofHours = 0.5;
      bulkHours = fermentationHours - proofHours;
    }
    coldHours = 0;
  } else {
    bulkHours = Math.max(minColdBulk, Math.min(24, style.bulk));
    proofHours = Math.max(2, Math.min(24, style.proof));
    coldHours = fermentationHours - bulkHours - proofHours;
    if (coldHours < MIN_COLD_HOURS) {
      // Finestra stretta: si accorciano appretto e puntata fino ai minimi per salvare il frigo.
      let missing = MIN_COLD_HOURS - coldHours;
      const fromProof = Math.min(missing, proofHours - 2);
      proofHours -= fromProof;
      missing -= fromProof;
      bulkHours -= Math.min(missing, bulkHours - minColdBulk);
      coldHours = fermentationHours - bulkHours - proofHours;
    }
    if (coldHours > 96) {
      let overflow = coldHours - 96;
      coldHours = 96;
      const bulkRoom = 24 - bulkHours;
      const toBulk = Math.min(overflow, bulkRoom);
      bulkHours += toBulk;
      overflow -= toBulk;
      proofHours += overflow;
    }
  }
  if (bulkHours > 24 || proofHours > 24 || coldHours < 0 || coldHours > 96)
    return { ok: false, error: t("Questa finestra non può essere divisa in fasi sicure. Riduci la durata complessiva.") };

  const round = (value: number) => Math.round(value * 100) / 100;
  bulkHours = round(bulkHours);
  // Il resto dell’arrotondamento va a una fase che esiste già: senza frigo finiva
  // in un «frigo» di pochi secondi.
  if (coldHours > 0) {
    proofHours = round(proofHours);
    coldHours = round(fermentationHours - bulkHours - proofHours);
  } else proofHours = round(fermentationHours - bulkHours);
  return {
    ok: true,
    totalHours: round(totalHours),
    preparationHours: round(preparationHours),
    fermentationHours: round(fermentationHours),
    bulkHours,
    coldHours,
    proofHours,
  };
}

const clampScore = (value: number) => Math.max(0, Math.min(100, value));

/**
 * Punteggi 0–100 di crosta, mollica e fondo dopo `minutes` di cottura.
 * È leggero: il grafico lo usa per disegnare le curve senza ricalcolare la finestra consigliata.
 */
export function bakeScores(c: DoughConfig, minutes = c.bakeMinutes) {
  const style = styles.find((item) => item.id === c.styleId) ?? styles[0];
  const defaults =
    style.id === "napoletana" || style.id === "contemporanea"
      ? 2
      : ["teglia", "padellino", "detroit"].includes(style.id)
        ? 16
        : ["focaccia", "sfincione"].includes(style.id)
          ? 25
          : ["romana", "new-york", "tonda-casa"].includes(style.id)
            ? 6
            : 10;
  const surfacePower: Record<DoughConfig["bakeSurface"], number> = {
    biscotto: 0.88,
    stone: 1,
    steel: 1.28,
    "light-pan": 0.9,
    "dark-pan": 1.13,
    "perforated-pan": 1.2,
    "cast-iron": 1.25,
  };
  const rackTop: Record<DoughConfig["ovenRack"], number> = {
    bottom: -10,
    "lower-middle": -5,
    middle: 0,
    "upper-middle": 8,
    top: 14,
  };
  const rackBottom: Record<DoughConfig["ovenRack"], number> = {
    bottom: 14,
    "lower-middle": 8,
    middle: 0,
    "upper-middle": -7,
    top: -13,
  };
  const thickness = style.pan
    ? Math.max(0.7, c.panDensity / 0.6)
    : Math.max(0.72, Math.pow(c.ballWeight / style.ballWeight, 0.6));
  const exposure =
    (Math.max(0.08, minutes) / defaults) *
    Math.exp((c.ovenTemp - style.oven) / 135) /
    thickness;
  const heat = Math.log(Math.max(0.08, exposure));
  const extraWater = c.hydration - style.hydration;
  const fanBoost = c.ovenType.includes("fan") ? 5 : 0;
  const toppingLoad = c.toppingLoad ?? 0.22;
  const toppingMoisture = c.toppingMoisture ?? 50;
  const toppingPenalty = Math.max(0, toppingLoad - 0.2) * 42;
  const moisturePenalty = Math.max(0, toppingMoisture - 45) * 0.16;
  return {
    crustScore: clampScore(
      52 +
        heat * 35 +
        rackTop[c.ovenRack] -
        extraWater * 0.72 +
        c.sugar * 2.2 +
        c.malt * 5 +
        c.oil * 0.45 +
        fanBoost - moisturePenalty * 0.55,
    ),
    // La mollica cuoce dal cuore: il calore arriva sia da sopra sia dal supporto,
    // penetra più lentamente negli impasti spessi e parte in ritardo rispetto alla crosta,
    // quindi la sua curva è più ripida e reagisce anche a supporto e altezza nel forno.
    crumbScore: clampScore(
      56 +
        Math.log(
          Math.max(
            0.05,
            (exposure * (0.5 + 0.5 * surfacePower[c.bakeSurface])) /
              Math.pow(thickness, 0.35),
          ),
        ) *
          46 +
        (rackTop[c.ovenRack] + rackBottom[c.ovenRack]) * 0.2 -
        Math.abs(rackTop[c.ovenRack] - rackBottom[c.ovenRack]) * 0.12 -
        extraWater * 1.05 +
        fanBoost * 0.65 -
        toppingPenalty -
        moisturePenalty,
    ),
    baseScore: clampScore(
      51 +
        Math.log(Math.max(0.08, exposure * surfacePower[c.bakeSurface])) * 38 +
        rackBottom[c.ovenRack] -
        extraWater * 0.3 - toppingPenalty * 0.35,
    ),
  };
}

export function estimateBakeOutcome(c: DoughConfig): BakeOutcome {
  const scores = bakeScores(c);
  const crustLabel =
    scores.crustScore < 28
      ? t("Pallida")
      : scores.crustScore < 42
        ? t("Chiara")
        : scores.crustScore < 70
          ? t("Dorata")
          : scores.crustScore < 84
            ? t("Intensa")
            : t("Rischio bruciatura");
  const crumbLabel =
    scores.crumbScore < 27
      ? t("Ancora cruda")
      : scores.crumbScore < 42
        ? t("Molto umida")
        : scores.crumbScore < 70
          ? t("Cotta e soffice")
          : scores.crumbScore < 84
            ? t("Asciutta")
            : t("Troppo asciutta");
  const baseLabel =
    scores.baseScore < 30
      ? t("Pallido")
      : scores.baseScore < 43
        ? t("Poco cotto")
        : scores.baseScore < 72
          ? t("Dorato")
          : scores.baseScore < 86
            ? t("Croccante")
            : t("Rischio bruciatura");
  const candidates: number[] = [];
  const step = c.ovenTemp >= 350 ? 0.05 : 0.25;
  for (let time = step; time <= 60; time += step) {
    const point = bakeScores(c, time);
    if (
      point.crustScore >= 42 &&
      point.crustScore <= 66 &&
      point.crumbScore >= 42 &&
      point.crumbScore <= 68 &&
      point.baseScore >= 40 &&
      point.baseScore <= 70
    )
      candidates.push(time);
  }
  const fallback = Math.max(0.5, c.bakeMinutes);
  const recommendedMin = candidates.length ? candidates[0] : fallback * 0.9;
  const recommendedMax = candidates.length
    ? candidates[candidates.length - 1]
    : fallback * 1.1;
  const warnings: string[] = [];
  if (scores.crumbScore < 42)
    warnings.push(t("La mollica potrebbe restare umida: aumenta il tempo o riduci lo spessore."));
  if (scores.crustScore > 83)
    warnings.push(t("La superficie può scurire prima che il centro sia pronto: abbassa il ripiano."));
  if (scores.baseScore > 85)
    warnings.push(t("Il fondo rischia di bruciare: riduci il calore dal basso o usa un supporto meno conduttivo."));
  if (scores.baseScore < 40)
    warnings.push(t("Il fondo riceve poco calore: preriscalda bene il supporto o abbassa il ripiano."));
  if ((c.toppingMoisture ?? 50) >= 70)
    warnings.push(t("Il condimento è molto umido: scola gli ingredienti e valuta mozzarella o verdure a metà cottura."));
  if ((c.toppingLoad ?? 0.22) >= 0.34)
    warnings.push(t("Il carico di condimento è elevato per la superficie: una precottura può aiutare fondo e mollica."));
  const balanced =
    scores.crustScore >= 42 &&
    scores.crustScore <= 66 &&
    scores.crumbScore >= 42 &&
    scores.crumbScore <= 68 &&
    scores.baseScore >= 40 &&
    scores.baseScore <= 70;
  return {
    ...scores,
    crustLabel,
    crumbLabel,
    baseLabel,
    recommendedMin,
    recommendedMax,
    summary: balanced
      ? t("Equilibrio previsto: crosta colorita, mollica cotta e fondo ben sviluppato.")
      : ovenById(c.ovenType).fixedRack
        ? t("Regola tempo, temperatura o supporto finché i tre indicatori entrano nella zona ideale.")
        : t("Regola tempo, altezza o supporto finché i tre indicatori entrano nella zona ideale."),
    warnings,
  };
}
/** Tempo di cottura al centro della finestra consigliata, arrotondato a un passo comodo. */
export function recommendedBakeMinutes(c: DoughConfig) {
  const outcome = estimateBakeOutcome(c);
  const step = c.ovenTemp >= 350 ? 0.25 : c.ovenTemp >= 280 ? 0.5 : 1;
  const middle = (outcome.recommendedMin + outcome.recommendedMax) / 2;
  return Math.max(0.5, Math.min(60, Math.round(middle / step) * step));
}
/** Superficie di una teglia in cm²: rettangolare o tonda. */
export function panArea(c: Pick<DoughConfig, "panShape" | "panWidth" | "panLength" | "panDiameter">) {
  return c.panShape === "round" ? Math.PI * (c.panDiameter / 2) ** 2 : c.panWidth * c.panLength;
}

export function validateConfig(c: DoughConfig): string[] {
  const errors: string[] = [];
  const ranges: [keyof DoughConfig, number, number, string][] = [
    ["count", 1, 30, t("Quantità")],
    ["ballWeight", 100, 2000, t("Peso panetto")],
    ["panWidth", 10, 80, t("Larghezza teglia")],
    ["panLength", 10, 100, t("Lunghezza teglia")],
    ["panDiameter", 14, 60, t("Diametro teglia")],
    ["panDensity", 0.3, 1, t("Impasto per cm²")],
    ["hydration", 45, 90, t("Idratazione")],
    ["salt", 0, 4, t("Sale")],
    ["oil", 0, 10, t("Olio")],
    ["sugar", 0, 15, t("Zucchero")],
    ["malt", 0, 5, t("Malto")],
    ["bulkHours", 0, 24, t("Puntata")],
    ["coldHours", 0, 96, t("Ore in frigo")],
    ["proofHours", 0, 24, t("Appretto")],
    ["roomTemp", 10, 35, t("Temperatura ambiente")],
    ["fridgeTemp", 1, 12, t("Temperatura frigo")],
    ["ovenTemp", 180, 500, t("Temperatura forno")],
    ["bakeMinutes", 1, 60, t("Durata cottura")],
    ["secondFlourPercent", 0, 100, t("Percentuale seconda farina")],
    ["thirdFlourPercent", 0, 100, t("Percentuale terza farina")],
    ["fourthFlourPercent", 0, 100, t("Percentuale quarta farina")],
    ["manualYeastPercent", 0.001, 5, t("Lievito manuale")],
    ["weighableYeastGrams", 1, 30, t("Lievito pesabile")],
    ["prefermentPercent", 5, 80, t("Farina nel prefermento")],
    ["prefermentHours", 3, 36, t("Durata prefermento")],
    ["prefermentTemp", 8, 32, t("Temperatura prefermento")],
    ["flourTemp", 5, 35, t("Temperatura farina")],
    ["desiredDoughTemp", 18, 30, t("Temperatura obiettivo impasto")],
    ["autolyseWaterPercent", 30, 95, t("Acqua nell’autolisi")],
    ["autolyseMinutes", 10, 60, t("Durata autolisi")],
    ["starterPercent", 5, 50, t("Dose lievito madre")],
    ["starterHydration", 40, 150, t("Idratazione lievito madre")],
    ["pizzaDiameter", 15, 60, t("Diametro pizza")],
    ["toppingCount", 1, 30, t("Numero pizze da condire")],
    ["toppingWidth", 10, 100, t("Larghezza condimento")],
    ["toppingLength", 10, 150, t("Lunghezza condimento")],
    ["toppingLoad", 0.01, 2, t("Carico del condimento")],
    ["toppingMoisture", 0, 100, t("Umidità del condimento")],
    ["foldCount", 0, 8, t("Numero di pieghe")],
    ["foldIntervalMinutes", 15, 60, t("Intervallo tra le pieghe")],
  ];
  for (const [key, min, max, name] of ranges) {
    const n = c[key];
    if (typeof n !== "number" || !Number.isFinite(n) || n < min || n > max)
      errors.push(t("{name}: inserisci un valore tra {min} e {max}.", { name, min, max }));
  }
  if (!Number.isInteger(c.count))
    errors.push(t("La quantità deve essere intera."));
  if (!Number.isInteger(c.foldCount))
    errors.push(t("Il numero di pieghe deve essere intero."));
  if (!styles.some((s) => s.id === c.styleId))
    errors.push(t("Scegli uno stile valido."));
  if (!["fresh", "instant", "sourdough", "licoli"].includes(c.yeast))
    errors.push(t("Tipo di lievito non valido."));
  if (c.secondFlourPercent + c.thirdFlourPercent + c.fourthFlourPercent > 100)
    errors.push(
      t("Le quote delle farine aggiuntive non possono superare il 100%."),
    );
  if (!["auto", "weighable", "manual"].includes(c.yeastMode))
    errors.push(t("Modalità del lievito non valida."));
  if (!["date", "duration", "automatic"].includes(c.planMode))
    errors.push(t("Modalità di pianificazione non valida."));
  if (!["none", "poolish", "biga"].includes(c.preferment))
    errors.push(t("Prefermento non valido."));
  if (!["hand", "stand", "spiral", "thermomix"].includes(c.mixer))
    errors.push(t("Metodo di impasto non valido."));
  if (
    !["bottom", "lower-middle", "middle", "upper-middle", "top"].includes(
      c.ovenRack,
    )
  )
    errors.push(t("Posizione nel forno non valida."));
  if (
    ![
      "biscotto",
      "stone",
      "steel",
      "light-pan",
      "dark-pan",
      "perforated-pan",
      "cast-iron",
    ].includes(c.bakeSurface)
  )
    errors.push(t("Supporto di cottura non valido."));
  if (typeof c.autolyse !== "boolean")
    errors.push(t("Impostazione autolisi non valida."));
  if (c.preferment !== "none") {
    const prefermentHydration = c.preferment === "poolish" ? 100 : 50;
    if ((c.prefermentPercent * prefermentHydration) / 100 > c.hydration)
      errors.push(
        t("Il prefermento richiede più acqua di quella disponibile nella ricetta. Riduci la sua percentuale o aumenta l’idratazione."),
      );
  }
  if (["sourdough", "licoli"].includes(c.yeast) && c.preferment !== "none")
    errors.push(
      t("Con lievito madre o licoli usa il metodo diretto: il lievito naturale è già un prefermento."),
    );
  if (c.bulkHours + c.coldHours + c.proofHours < 2)
    errors.push(t("Prevedi almeno 2 ore totali di fermentazione."));
  if (c.bulkHours * 60 < c.foldCount * c.foldIntervalMinutes)
    errors.push(
      t("La puntata deve durare almeno {v} minuti per completare tutte le pieghe.", { v: c.foldCount * c.foldIntervalMinutes }),
    );
  if (c.bulkHours + c.proofHours < 1)
    errors.push(t("Prevedi almeno un’ora complessiva a temperatura ambiente."));
  if (!Number.isFinite(new Date(c.bakeAt).getTime()))
    errors.push(t("Imposta giorno e ora della cottura."));
  if (c.planMode === "automatic") {
    const automatic = deriveAutomaticSchedule(c);
    if (!automatic.ok) errors.push(automatic.error);
  }
  return errors;
}
export function calculate(c: DoughConfig, flours: Flour[]) {
  const errors = validateConfig(c);
  const flour = flours.find((f) => f.id === c.flourId);
  const second = flours.find((f) => f.id === c.secondFlourId);
  const third = flours.find((f) => f.id === c.thirdFlourId);
  const fourth = flours.find((f) => f.id === c.fourthFlourId);
  const prefermentFlour = flours.find((f) => f.id === c.prefermentFlourId);
  if (!flour) errors.push(t("Scegli una farina dal catalogo."));
  if (flour && !flour.usable)
    errors.push(
      t("Questa farina richiede una ricetta specifica: scegli una farina di grano tenero senza lievito aggiunto."),
    );
  if (c.secondFlourPercent > 0 && (!second || !second.usable))
    errors.push(t("Scegli una seconda farina compatibile."));
  if (c.thirdFlourPercent > 0 && (!third || !third.usable))
    errors.push(t("Scegli una terza farina compatibile."));
  if (c.fourthFlourPercent > 0 && (!fourth || !fourth.usable))
    errors.push(t("Scegli una quarta farina compatibile."));
  if (
    c.preferment !== "none" &&
    c.prefermentFlourId &&
    (!prefermentFlour || !prefermentFlour.usable)
  )
    errors.push(t("Scegli una farina compatibile per il prefermento."));
  if (errors.length) return { ok: false as const, errors };
  const style = styles.find((s) => s.id === c.styleId)!;
  const secondShare = c.secondFlourPercent / 100;
  const thirdShare = c.thirdFlourPercent / 100;
  const fourthShare = c.fourthFlourPercent / 100;
  const firstShare = 1 - secondShare - thirdShare - fourthShare;
  const activeFlours = [
    ...(firstShare > 0 ? [{ flour: flour!, share: firstShare }] : []),
    ...(secondShare > 0 && second
      ? [{ flour: second, share: secondShare }]
      : []),
    ...(thirdShare > 0 && third ? [{ flour: third, share: thirdShare }] : []),
    ...(fourthShare > 0 && fourth
      ? [{ flour: fourth, share: fourthShare }]
      : []),
  ];
  let blend = blendStrength(
    activeFlours.map(({ flour, share }) => ({ strength: flourStrength(flour), share })),
  );
  // Heuristic, not a validated fermentation model. Cold-rate floor accounts approximately
  // for slow cooling in a domestic fridge. Never derives W from protein or absorption.
  const roomRate = 2 ** ((c.roomTemp - 22) / 10);
  const coldRate = 0.08 * 2 ** ((c.fridgeTemp - 4) / 5);
  const equivalentHours =
    (c.bulkHours + c.proofHours) * roomRate + c.coldHours * coldRate;
  const naturalStarter = ["sourdough", "licoli"].includes(c.yeast);
  const rawFreshPercent =
    0.18 * (8 / equivalentHours) ** 0.85 * (1 + (c.salt - 2.5) * 0.08);
  const freshPercent =
    c.yeastMode === "manual"
      ? c.manualYeastPercent * (c.yeast === "instant" ? 3 : 1)
      : Math.max(0.02, Math.min(3, rawFreshPercent));
  const unitWeight = style.pan ? panArea(c) * c.panDensity : c.ballWeight;
  const total = c.count * unitWeight;
  const baseRatio =
    1 +
    c.hydration / 100 +
    c.salt / 100 +
    c.oil / 100 +
    c.sugar / 100 +
    c.malt / 100;
  const automaticYeastPercent =
    c.yeast === "instant"
      ? Math.max(0.02, Math.min(3, rawFreshPercent)) / 3
      : Math.max(0.02, Math.min(3, rawFreshPercent));
  let yeastPercent = naturalStarter
    ? c.starterPercent
    : c.yeastMode === "manual"
      ? c.manualYeastPercent
      : automaticYeastPercent;
  let flourGrams =
    c.yeastMode === "weighable" && !naturalStarter
      ? (total - c.weighableYeastGrams) / baseRatio
      : total / (baseRatio + (naturalStarter ? 0 : yeastPercent / 100));
  if (flourGrams <= 0)
    return {
      ok: false as const,
      errors: [t("La quantità di lievito supera il peso totale dell’impasto.")],
    };
  if (c.yeastMode === "weighable" && !naturalStarter)
    yeastPercent = (c.weighableYeastGrams / flourGrams) * 100;
  const water = (flourGrams * c.hydration) / 100;
  const salt = (flourGrams * c.salt) / 100;
  const oil = (flourGrams * c.oil) / 100;
  const sugar = (flourGrams * c.sugar) / 100;
  const malt = (flourGrams * c.malt) / 100;
  const yeast =
    c.yeastMode === "weighable" && !naturalStarter
      ? c.weighableYeastGrams
      : (flourGrams * yeastPercent) / 100;
  const autoFlour = total / (baseRatio + automaticYeastPercent / 100);
  const autoYeast = (autoFlour * automaticYeastPercent) / 100;
  let yeastAdjustment: null | {
    autoGrams: number;
    selectedGrams: number;
    bulkHours: number;
    coldHours: number;
    proofHours: number;
    startShiftHours: number;
    summary: string;
  } = null;
  if (c.yeastMode === "weighable" && !naturalStarter) {
    const selectedFreshPercent = yeastPercent * (c.yeast === "instant" ? 3 : 1);
    const saltFactor = 1 + (c.salt - 2.5) * 0.08;
    const targetEquivalentHours = Math.max(
      0.5,
      Math.min(
        160,
        8 * Math.pow((0.18 * saltFactor) / selectedFreshPercent, 1 / 0.85),
      ),
    );
    const currentWarm = c.bulkHours + c.proofHours;
    let targetWarm = currentWarm;
    let targetCold = c.coldHours;
    if (targetEquivalentHours < equivalentHours) {
      if (c.coldHours > 0) {
        const shift = Math.min(
          Math.max(0, currentWarm - 1),
          Math.max(
            0,
            (equivalentHours - targetEquivalentHours) / (roomRate - coldRate),
          ),
        );
        targetWarm -= shift;
        targetCold += shift;
        const remaining =
          targetWarm * roomRate + targetCold * coldRate - targetEquivalentHours;
        if (remaining > 0)
          targetWarm = Math.max(1, targetWarm - remaining / roomRate);
      } else targetWarm = Math.max(1, targetEquivalentHours / roomRate);
    } else if (c.coldHours > 0)
      targetCold = Math.min(
        96,
        c.coldHours + (targetEquivalentHours - equivalentHours) / coldRate,
      );
    else targetWarm = Math.min(48, targetEquivalentHours / roomRate);
    const roundHalf = (value: number) => Math.round(value * 2) / 2;
    targetWarm = Math.max(1, Math.min(48, targetWarm));
    targetCold = Math.max(0, Math.min(96, targetCold));
    const bulkShare = currentWarm > 0 ? c.bulkHours / currentWarm : 0.5;
    let adjustedBulk = Math.min(24, roundHalf(targetWarm * bulkShare));
    let adjustedProof = Math.min(24, roundHalf(targetWarm - adjustedBulk));
    if (adjustedBulk + adjustedProof < 1) adjustedProof = 1 - adjustedBulk;
    // Una compensazione non deve lasciare un frigo troppo breve per servire a qualcosa.
    const adjustedCold = targetCold < MIN_COLD_HOURS ? 0 : roundHalf(targetCold);
    const currentTotal = currentWarm + c.coldHours;
    const adjustedTotal = adjustedBulk + adjustedProof + adjustedCold;
    const startShiftHours = roundHalf(currentTotal - adjustedTotal);
    const movedToCold = Math.max(0, adjustedCold - c.coldHours);
    const summary =
      movedToCold >= 0.5
        ? t("Sposta circa {toLocaleString} ore dalla fase a temperatura ambiente al frigorifero.", { toLocaleString: movedToCold.toLocaleString(locale()) })
        : startShiftHours > 0.25
          ? t("Con questa dose puoi iniziare circa {toLocaleString} ore più tardi.", { toLocaleString: startShiftHours.toLocaleString(locale()) })
          : startShiftHours < -0.25
            ? t("Con questa dose servono circa {toLocaleString} ore in più.", { toLocaleString: Math.abs(startShiftHours).toLocaleString(locale()) })
            : t("La dose scelta è già compatibile con i tempi impostati.");
    yeastAdjustment = {
      autoGrams: autoYeast,
      selectedGrams: yeast,
      bulkHours: adjustedBulk,
      coldHours: adjustedCold,
      proofHours: adjustedProof,
      startShiftHours,
      summary,
    };
  }
  const starterHydration = naturalStarter ? c.starterHydration / 100 : 0;
  const starterFlour = naturalStarter ? yeast / (1 + starterHydration) : 0;
  const starterWater = naturalStarter ? yeast - starterFlour : 0;
  const flourToWeigh = flourGrams - starterFlour;
  const waterToWeigh = water - starterWater;
  if (naturalStarter && (flourToWeigh <= 0 || waterToWeigh < 0))
    return {
      ok: false as const,
      errors: [
        t("La dose o l’idratazione del lievito madre supera farina o acqua disponibili."),
      ],
    };
  const prefermentHydration =
    c.preferment === "poolish" ? 100 : c.preferment === "biga" ? 50 : 0;
  const prefermentFlourGrams =
    c.preferment === "none" ? 0 : (flourGrams * c.prefermentPercent) / 100;
  const prefermentWater = (prefermentFlourGrams * prefermentHydration) / 100;
  const prefermentYeast =
    c.preferment === "none"
      ? 0
      : Math.min(yeast * 0.8, prefermentFlourGrams * 0.002);
  const mainFlour = flourToWeigh - prefermentFlourGrams;
  const mainWater = waterToWeigh - prefermentWater;
  const mainYeast = yeast - prefermentYeast;
  const autolyseWater = c.autolyse
    ? (mainWater * c.autolyseWaterPercent) / 100
    : 0;
  const reservedWater = c.autolyse ? mainWater - autolyseWater : mainWater;
  const prefermentActivity =
    c.preferment === "none"
      ? 0
      : c.prefermentHours * 2 ** ((c.prefermentTemp - 20) / 10);
  const prefermentTarget = c.preferment === "biga" ? 16 : 12;
  const prefermentProgress =
    c.preferment === "none" ? 0 : prefermentActivity / prefermentTarget;
  const prefermentMaturity =
    prefermentProgress < 0.65
      ? t("giovane")
      : prefermentProgress < 0.9
        ? t("in sviluppo")
        : prefermentProgress <= 1.2
          ? t("al picco")
          : t("oltre il picco");
  if (c.preferment !== "none" && prefermentFlour) {
    const prefermentShare = c.prefermentPercent / 100;
    blend = blendStrength([
      { strength: blend, share: 1 - prefermentShare },
      { strength: flourStrength(prefermentFlour), share: prefermentShare },
    ]);
  }
  // `w` è il valore centrale; gli avvisi usano gli estremi (uguali a `w` se il W è dichiarato dal produttore).
  const w = blend?.value ?? null;
  const wLow = blend?.low ?? null;
  const wHigh = blend?.high ?? null;
  const wEstimated = blend?.estimated ?? false;
  const friction: Record<DoughConfig["mixer"], number> = {
    hand: 3,
    stand: 8,
    spiral: 5,
    thermomix: 12,
  };
  const waterTemp = Math.max(
    2,
    Math.min(
      45,
      c.desiredDoughTemp * 3 - c.roomTemp - c.flourTemp - friction[c.mixer],
    ),
  );
  const hours = c.bulkHours + c.coldHours + c.proofHours;
  const advice: Advice[] = [];
  const add = (
    id: string,
    level: Advice["level"],
    title: string,
    text: string,
    fix?: Advice["fix"],
  ) => advice.push({ id, level, title, text, ...(fix ? { fix } : {}) });
  // Lievitare e maturare sono due cose diverse: il lievito gonfia l’impasto in poche ore,
  // gli enzimi che scompongono amidi e glutine hanno bisogno di molte di più. Sotto le 4 ore
  // manca la maturazione, fra le 4 e le 8 c’è ma appena accennata.
  if (hours < 4)
    add(
      "too-fast",
      "error",
      t("Troppo poco tempo: meglio rinviare"),
      t("Con {durationLabel} di fermentazione l’impasto si gonfia ma non matura. Aspettati una pizza tenace, che si ritira mentre la stendi, con mollica compatta, poco profumo, crosta pallida e digeribilità scarsa; serve anche molto più lievito, che lascia il suo retrogusto. Se puoi, sposta la cottura più avanti: 8 ore fuori frigo sono il minimo sensato, 24 ore in frigo cambiano davvero il risultato.", { durationLabel: durationLabel(hours) }),
    );
  else if (hours < 8)
    add(
      "fast-dough",
      "warning",
      t("Lievitazione di corsa"),
      t("Con {durationLabel} la pizza viene, ma resta una lievitazione breve: meno profumo e sapore, mollica più chiusa, crosta più pallida e digeribilità inferiore rispetto a un impasto lungo. Usa una farina delicata, tieni l’impasto a {formatTempRange} e non aspettarti l’alveolatura dei tempi lunghi.", { durationLabel: durationLabel(hours), formatTempRange: formatTempRange(24, 26) }),
    );
  if (wHigh !== null && wHigh >= 280 && hours < 8)
    add(
      "strong-flour-fast",
      "warning",
      t("Farina troppo forte per questi tempi"),
      t("Una farina da W {w} ha bisogno di tempo per cedere elasticità: in poche ore l’impasto resta gommoso e difficile da stendere. Per una pizza veloce scegli una farina intorno a W 180–240.", { w: Math.round(w ?? wHigh ?? 0) }),
    );
  if (w === null)
    add(
      "unknown-w",
      "warning",
      t("La forza W non è disponibile"),
      t("Non posso valutare la tenuta della farina. Controlla la scheda tecnica: le proteine da sole non determinano il W."),
    );
  if (w !== null && wEstimated)
    add(
      "estimated-w",
      "info",
      t("W stimato, non dichiarato"),
      t("Per questa farina il produttore non dichiara il W: PizzaLab lo stima intorno a {w} (valore teorico, può essere impreciso). Gli avvisi sulla tenuta lasciano un margine attorno a questo valore: verifica sempre la resistenza reale dell’impasto.", { w: Math.round(w) }),
    );
  if (wLow !== null && wLow < style.minW)
    add(
      "weak-style",
      "warning",
      t("Farina delicata per questo stile"),
      t("Come punto di partenza, valuta una farina intorno a W {minW} o superiore. Riduci idratazione e durata e osserva la tenuta dell’impasto.", { minW: style.minW }),
    );
  if (
    wLow !== null &&
    ((wLow < 240 && hours > 24) ||
      (wLow < 300 && hours > 48) ||
      (wLow < 340 && hours > 72))
  )
    add(
      "long-weak",
      "warning",
      t("Tempi impegnativi per questa farina"),
      t("La durata è elevata rispetto alla forza dichiarata. Accorcia il riposo oppure scegli una farina più forte; W e ore non hanno una corrispondenza esatta."),
    );
  if (
    c.hydration < style.hydrationRange[0] ||
    c.hydration > style.hydrationRange[1]
  )
    add(
      "hydration-style",
      "warning",
      t("Idratazione fuori dall’intervallo di partenza"),
      t("Per {toLowerCase} il riferimento pratico è {v}–{v2}%. Puoi sperimentare, adeguando la lavorazione.", { toLowerCase: style.name.toLowerCase(), v: style.hydrationRange[0], v2: style.hydrationRange[1] }),
      { hydration: c.hydration < style.hydrationRange[0] ? style.hydrationRange[0] : style.hydrationRange[1] },
    );
  if (c.hydration >= 75)
    add(
      "wet",
      "info",
      t("Tieni da parte l’ultima acqua"),
      t("Un impasto molto idratato richiede buona struttura. Aggiungi l’acqua gradualmente e usa pause e pieghe; l’assorbimento di laboratorio non è l’idratazione della ricetta."),
    );
  if (wLow !== null && wLow < 260 && c.hydration > 70)
    add(
      "weak-wet",
      "warning",
      t("Acqua elevata per una farina poco forte"),
      t("Parti con meno acqua. Se l’impasto perde struttura, aggiungerne ancora rende la gestione più difficile."),
      {
        hydration: Math.max(
          style.hydrationRange[0],
          Math.min(70, Math.floor(hydrationCeiling(wLow))),
        ),
      },
    );
  if (c.roomTemp >= 27)
    add(
      "warm",
      "warning",
      t("In cucina fa caldo"),
      t("Controlla l’impasto prima dell’orario previsto. Usa acqua fresca, misura la temperatura finale e accorcia le fasi fuori frigo se la crescita è rapida."),
    );
  if (c.coldHours > 0 && c.fridgeTemp > 5)
    add(
      "fridge",
      "warning",
      t("Il frigo rallenta meno del previsto"),
      t("Verifica con un termometro la temperatura effettiva vicino all’impasto. Il modello diventa meno affidabile sopra {formatTemp}: controlla la crescita e riduci i tempi.", { formatTemp: formatTemp(5) }),
    );
  // Piani salvati prima della soglia minima possono avere ancora un frigo troppo breve.
  if (c.coldHours > 0 && c.coldHours < MIN_COLD_HOURS)
    add(
      "short-cold",
      "warning",
      t("Frigo troppo breve per essere utile"),
      t("Con {durationLabel} l’impasto fa appena in tempo a raffreddarsi e poi deve riscaldarsi: il freddo rallenta poco e non sviluppa sapore. Tieni l’impasto tutto fuori frigo oppure allunga il frigo ad almeno 12 ore.", { durationLabel: durationLabel(c.coldHours) }),
    );
  if (c.coldHours > 0 && c.proofHours < 2)
    add(
      "short-proof",
      "warning",
      t("Poco tempo dopo il frigo"),
      t("L’impasto potrebbe essere ancora freddo e tenace. Considera almeno 2–4 ore, adattandoti a dimensione dei panetti e temperatura reale."),
    );
  if (c.bulkHours + c.proofHours > 16)
    add(
      "long-room",
      "warning",
      t("Molte ore fuori frigo"),
      t("Con tempi così lunghi la stima del lievito è meno affidabile. Monitora volume, elasticità e temperatura; non aspettare l’orario se l’impasto sta cedendo."),
    );
  if (c.ovenTemp < 380 && ["napoletana", "contemporanea"].includes(c.styleId))
    add(
      "oven",
      "warning",
      t("Adatta la cottura al forno di casa"),
      t("Questo stile nasce per forni molto caldi. Preriscalda bene pietra o acciaio e prolunga la cottura controllando la base: il risultato sarà diverso."),
    );
  if (c.salt < 1.5)
    add(
      "low-salt",
      "warning",
      t("Poco sale nell’impasto"),
      t("Il sale contribuisce a struttura e controllo della fermentazione. Con questa dose verifica più spesso la crescita."),
    );
  if (!naturalStarter && yeast < 0.1)
    add(
      "scale",
      "warning",
      t("Dose difficile da pesare"),
      t("Serve una bilancia da 0,01 g. In alternativa prepara una sospensione 1:9 di lievito e acqua e usane dieci volte la dose, sottraendo l’acqua usata da quella totale."),
    );
  if (
    !naturalStarter &&
    c.yeastMode === "auto" &&
    rawFreshPercent !== freshPercent
  )
    add(
      "model-limit",
      "warning",
      t("Al limite del modello"),
      t("La dose è stata limitata all’intervallo del calcolatore. Modifica durata o temperatura: questo piano necessita di una prova pratica."),
    );
  if (!naturalStarter && c.yeastMode === "manual")
    add(
      "manual-yeast",
      "info",
      t("Dose di lievito manuale"),
      t("Gli orari restano fissi. Usa il grafico di fermentazione e controlla il volume: la dose inserita può anticipare o ritardare il picco."),
    );
  if (!naturalStarter && c.yeastMode === "weighable")
    add(
      "weighable-yeast",
      "info",
      t("Dose realmente pesabile"),
      t("Hai scelto {formatWeight} invece dei {formatWeight2} stimati. Applica la compensazione proposta e controlla comunque la crescita reale.", { formatWeight: formatWeight(yeast, 3), formatWeight2: formatWeight(autoYeast, 2) }),
    );
  if (naturalStarter)
    add(
      "natural-starter",
      "info",
      t("Lievito naturale: osserva la crescita"),
      t("La vitalità cambia da un rinfresco all’altro. Usa una coltura al picco e considera gli orari una traccia: volume, elasticità e profumo vengono prima dell’orologio."),
    );
  if (c.preferment !== "none" && prefermentProgress > 1.2)
    add(
      "preferment-ripe",
      "warning",
      t("Prefermento oltre il picco"),
      t("Accorcia la durata, abbassa la temperatura o usa il comando Ottimizza. Odore pungente e struttura ceduta indicano che è troppo maturo."),
    );
  if (c.hydration >= 72 && !c.autolyse)
    add(
      "autolyse",
      "info",
      t("Valuta un’autolisi breve"),
      t("Un riposo iniziale di farina e parte dell’acqua facilita l’assorbimento. Puoi attivarlo nel Laboratorio impasto e tenere l’acqua restante per il lievito e il bassinage."),
    );
  if (waterTemp <= 2 || waterTemp >= 45)
    add(
      "water-temperature",
      "warning",
      t("Temperatura dell’acqua fuori dal campo pratico"),
      t("Il metodo del fattore 3 ha raggiunto il limite del calcolatore. Correggi temperatura ambiente, farina o impasto obiettivo."),
    );
  if (secondShare > 0 || thirdShare > 0 || fourthShare > 0)
    add(
      "blend",
      "info",
      t("La forza della miscela è indicativa"),
      t("Il W visualizzato è una media ponderata di orientamento: la risposta reale di una miscela non è necessariamente lineare e l’assorbimento va verificato durante l’impasto."),
    );
  if (
    activeFlours.some((item) => item.flour.kind !== "wheat") ||
    (prefermentFlour && prefermentFlour.kind !== "wheat")
  )
    add(
      "special-flour",
      "warning",
      t("Farina o miscela speciale"),
      t("Semola, farro, riso e miscele non si comportano come una normale farina di grano tenero. Verifica la confezione e inseriscile gradualmente in miscela finché non conosci assorbimento e tenuta."),
    );
  const glutenFreeShares = activeFlours.filter((item) => item.flour.glutenFree);
  if (glutenFreeShares.length)
    add(
      "gluten-free",
      "warning",
      t("Impasto senza glutine: usa la confezione come riferimento"),
      t("Il W non descrive queste miscele e l’idratazione può essere molto diversa. Il calcolatore determina le grammature totali, ma dosi d’acqua, riposi e leganti vanno adattati alle istruzioni del produttore."),
    );
  if (glutenFreeShares.length && glutenFreeShares.length !== activeFlours.length)
    add(
      "gluten-cross-contact",
      "error",
      t("Miscela non adatta alla celiachia"),
      t("Hai combinato farine senza glutine e farine di frumento. Per un impasto destinato a una persona celiaca usa solo prodotti certificati e attrezzature non contaminate."),
    );
  const score = (value: number) =>
    Math.round(Math.max(0, Math.min(100, value)));
  const hydrationCenter =
    (style.hydrationRange[0] + style.hydrationRange[1]) / 2;
  const scores = {
    lavorabilità: score(
      100 -
        Math.abs(c.hydration - hydrationCenter) * 5 -
        (c.hydration > 75 ? 8 : 0),
    ),
    alveolatura: score(
      45 +
        (c.hydration - style.hydrationRange[0]) * 3 +
        (c.preferment !== "none" ? 8 : 0),
    ),
    sapore: score(
      45 + Math.min(35, hours * 0.7) + (c.preferment !== "none" ? 15 : 0),
    ),
    coerenza: score(
      100 -
        Math.abs(c.hydration - style.hydration) * 3 -
        (wLow !== null && wLow < style.minW ? 25 : 0),
    ),
  };
  const blendAllocation =
    c.preferment !== "none" || naturalStarter ? mainFlour : flourGrams;
  const mainFlourBreakdown = activeFlours.map(
    ({ flour: component, share }) => ({
      id: component.id,
      name: `${t(component.brand)} · ${t(component.name)}`,
      grams: blendAllocation * share,
      percent: share * 100,
    }),
  );
  const flourMap = new Map<
    string,
    { id: string; name: string; grams: number; percent: number }
  >();
  for (const { flour: component, share } of activeFlours) {
    const grams = blendAllocation * share;
    const old = flourMap.get(component.id);
    flourMap.set(component.id, {
      id: component.id,
      name: `${t(component.brand)} · ${t(component.name)}`,
      grams: (old?.grams ?? 0) + grams,
      percent: 0,
    });
  }
  const actualPrefermentFlour =
    c.preferment !== "none" ? (prefermentFlour ?? flour!) : null;
  if (actualPrefermentFlour) {
    const old = flourMap.get(actualPrefermentFlour.id);
    flourMap.set(actualPrefermentFlour.id, {
      id: actualPrefermentFlour.id,
      name: `${t(actualPrefermentFlour.brand)} · ${t(actualPrefermentFlour.name)}`,
      grams: (old?.grams ?? 0) + prefermentFlourGrams,
      percent: 0,
    });
  }
  if (naturalStarter) {
    const old = flourMap.get(flour!.id);
    flourMap.set(flour!.id, {
      id: flour!.id,
      name: `${t(flour!.brand)} · ${t(flour!.name)}`,
      grams: (old?.grams ?? 0) + starterFlour,
      percent: 0,
    });
  }
  const flourBreakdown = [...flourMap.values()].map((item) => ({
    ...item,
    percent: (item.grams / flourGrams) * 100,
  }));
  return {
    ok: true as const,
    bakeOutcome: estimateBakeOutcome(c),
    total,
    unitWeight,
    flour: flourGrams,
    flourToWeigh,
    firstFlour: blendAllocation * firstShare,
    secondFlour: blendAllocation * secondShare,
    thirdFlour: blendAllocation * thirdShare,
    fourthFlour: blendAllocation * fourthShare,
    flourBreakdown,
    mainFlourBreakdown,
    water,
    waterToWeigh,
    salt,
    oil,
    sugar,
    malt,
    yeast,
    yeastPercent,
    equivalentHours,
    hours,
    w,
    wLow,
    wHigh,
    wEstimated,
    advice,
    style,
    waterTemp,
    scores,
    yeastAdjustment,
    starter: {
      active: naturalStarter,
      grams: yeast,
      flour: starterFlour,
      water: starterWater,
      hydration: c.starterHydration,
    },
    autolyse: {
      flour: mainFlour,
      water: autolyseWater,
      reservedWater,
      minutes: c.autolyseMinutes,
    },
    preferment: {
      flour: prefermentFlourGrams,
      water: prefermentWater,
      yeast: prefermentYeast,
      mainFlour,
      mainWater,
      mainYeast,
      hydration: prefermentHydration,
      progress: prefermentProgress,
      maturity: prefermentMaturity,
      flourName: actualPrefermentFlour
        ? `${t(actualPrefermentFlour.brand)} · ${t(actualPrefermentFlour.name)}`
        : null,
    },
  };
}
export function buildTimeline(c: DoughConfig, flours?: Flour[]): Stage[] {
  if (validateConfig(c).length) return [];
  const calculation = flours ? calculate(c, flours) : null;
  const r = calculation?.ok ? calculation : null;
  const bake = new Date(c.bakeAt).getTime();
  const hour = 3600000;
  let cursor =
    bake -
    (c.bulkHours + c.coldHours + c.proofHours) * hour -
    20 * 60000 -
    (c.autolyse ? c.autolyseMinutes * 60000 : 0);
  const stages: Stage[] = [];
  const add = (id: string, title: string, duration: number, detail: string) => {
    stages.push({
      id,
      title,
      at: new Date(cursor).toISOString(),
      until: new Date(cursor + duration).toISOString(),
      detail,
    });
    cursor += duration;
  };
  if (c.preferment !== "none") {
    cursor -= c.prefermentHours * hour;
    const prefermentDetail = r
      ? t("Mescola {flour} di {flourName}, {water} d’acqua e {yeast} di lievito. Copri e lascia maturare {hours} ore a {temp}; usalo quando è gonfio e aromatico, prima che ceda.", {
          flour: formatWeight(r.preferment.flour),
          flourName: r.preferment.flourName ?? r.flourBreakdown[0]?.name ?? t("farina"),
          water: formatWeight(r.preferment.water),
          yeast: formatWeight(r.preferment.yeast, 2),
          hours: c.prefermentHours,
          temp: formatTemp(c.prefermentTemp, 1),
        })
      : t("Mescola la quota di farina e acqua del {preferment}, aggiungi il lievito previsto e lascia maturare a {formatTemp}.", { preferment: c.preferment, formatTemp: formatTemp(c.prefermentTemp, 1) });
    add(
      "preferment",
      t("Prepara il {preferment}", { preferment: c.preferment }),
      c.prefermentHours * hour,
      prefermentDetail,
    );
  }
  if (c.autolyse) {
    const division =
      r && r.mainFlourBreakdown.length > 1
        ? t(" Prepara prima la miscela per l’impasto finale: {join}.", { join: r.mainFlourBreakdown.map((item) => `${formatWeight(item.grams)} ${item.name}`).join(" + ") })
        : "";
    const grams = r
      ? t(" Mescola {formatWeight} di farina con {formatWeight2} d’acqua ({autolyseWaterPercent}% dell’acqua disponibile nell’impasto finale).", { formatWeight: formatWeight(r.autolyse.flour), formatWeight2: formatWeight(r.autolyse.water), autolyseWaterPercent: c.autolyseWaterPercent })
      : "";
    add(
      "autolyse",
      t("Autolisi breve"),
      c.autolyseMinutes * 60000,
      t("{division}{grams} Non aggiungere ancora lievito, sale o grassi. Copri e lascia riposare: la massa deve risultare grezza, senza cercare l’incordatura.", { division, grams }),
    );
  }
  const flourDetail = r
    ? r.mainFlourBreakdown
        .map((item) => `${formatWeight(item.grams)} ${item.name}`)
        .join(" + ")
    : t("le farine previste");
  const mixingDetail = r
    ? c.autolyse
      ? t("Sciogli {yeast} di lievito nei {water} d’acqua tenuti da parte. Avvia la lavorazione dell’autolisi e incorpora la soluzione poco alla volta. Aggiungi {salt} di sale quando l’impasto prende struttura{oil}. Controlla che l’impasto finale sia vicino a {temp}.", {
          yeast: formatWeight(r.preferment.mainYeast, 2),
          water: formatWeight(r.autolyse.reservedWater),
          salt: formatWeight(r.salt, 1),
          oil: r.oil > 0 ? t(", poi {oil} di olio a filo", { oil: formatWeight(r.oil, 1) }) : "",
          temp: formatTemp(c.desiredDoughTemp, 1),
        })
      : t("Pesa {flours}, {water} d’acqua e {yeast} di lievito. Mescola prima acqua, lievito e farine{preferment}; aggiungi {salt} di sale quando non resta farina asciutta{oil}. Lavora fino a una massa liscia ed elastica, senza superare {temp}.", {
          flours: flourDetail,
          water: formatWeight(r.preferment.mainWater),
          yeast: formatWeight(r.preferment.mainYeast, 2),
          preferment: c.preferment !== "none" ? t(" e incorpora il prefermento maturo") : "",
          salt: formatWeight(r.salt, 1),
          oil: r.oil > 0 ? t(", poi {oil} di olio", { oil: formatWeight(r.oil, 1) }) : "",
          temp: formatTemp(c.desiredDoughTemp, 1),
        })
    : t("Pesa separatamente tutte le farine e gli altri ingredienti. Unisci acqua, lievito e farine; incorpora l’eventuale prefermento, poi sale e grassi. Lavora fino a ottenere una struttura omogenea.");
  const machineDetail =
    c.mixer === "stand"
      ? (() => {
          const profile =
            mixerProfiles.find((item) => item.id === c.mixerProfileId) ??
            mixerProfiles[0];
          return t(" Usa il {toLowerCase}: {toLowerCase2}, poi {toLowerCase3}. Per la chiusura: {toLowerCase4}.", { toLowerCase: profile.tool.toLowerCase(), toLowerCase2: profile.start.toLowerCase(), toLowerCase3: profile.knead.toLowerCase(), toLowerCase4: profile.finish.toLowerCase() });
        })()
      : c.mixer === "spiral"
        ? t(" In spirale parti in prima velocità; passa in seconda solo dopo che l’impasto ha preso struttura e controlla spesso la temperatura.")
        : c.mixer === "thermomix"
          ? t(" Procedi con brevi cicli in modalità impasto, intervallati da pause: il robot scalda rapidamente la massa.")
          : t(" A mano alterna impastamento e pause di 5–10 minuti; usa pieghe in ciotola finché la massa diventa elastica.");
  add(
    "mix",
    t("Impasta e sviluppa la struttura"),
    20 * 60000,
    mixingDetail + machineDetail,
  );
  if (c.bulkHours > 0) {
    const bulkStart = cursor;
    add(
      "bulk",
      t("Riposo in massa"),
      c.bulkHours * hour,
      c.foldCount > 0
        ? t("Copri l’impasto a {temp}. Durante la puntata esegui {count} {folds}, una ogni {minutes} minuti, poi lascia rilassare la massa.", {
            temp: formatTemp(c.roomTemp, 1),
            count: c.foldCount,
            folds: c.foldCount === 1 ? t("piega") : t("pieghe"),
            minutes: c.foldIntervalMinutes,
          })
        : t("Copri l’impasto a {formatTemp} e osserva la crescita.", { formatTemp: formatTemp(c.roomTemp, 1) }),
    );
    for (let index = 1; index <= c.foldCount; index++) {
      const foldAt = bulkStart + index * c.foldIntervalMinutes * 60000;
      stages.push({
        id: `fold-${index}`,
        title: t("Piega {index} di {foldCount}", { index, foldCount: c.foldCount }),
        at: new Date(foldAt).toISOString(),
        until: new Date(foldAt).toISOString(),
        detail:
          index === c.foldCount
            ? t("Esegui l’ultima piega con delicatezza, copri e lascia riposare fino alla fine della puntata.")
            : t("Esegui una piega di rinforzo, copri di nuovo l’impasto e attendi il prossimo intervallo."),
      });
    }
  }
  if (c.coldHours > 0)
    add(
      "cold",
      t("Metti in frigorifero"),
      c.coldHours * hour,
      t("Riponi in un contenitore coperto a {formatTemp}, con spazio per crescere. L’impasto non si raffredda istantaneamente.", { formatTemp: formatTemp(c.fridgeTemp, 1) }),
    );
  const pan =
    styles.find((s) => s.id === c.styleId)?.pan || c.styleId === "padellino";
  if (c.proofHours > 0)
    add(
      "proof",
      c.coldHours > 0 ? t("Fuori frigo e porziona") : t("Dividi e fai lievitare"),
      c.proofHours * hour,
      pan
        ? t("Dividi in {count} porzioni. Lascia rilassare, poi stendi nella teglia unta e termina l’appretto. Copri per evitare la pelle.", { count: c.count })
        : t("Forma {count} panetti, copri e lascia rilassare a {formatTemp}. Dovranno essere estensibili e ariosi, senza collassare.", { count: c.count, formatTemp: formatTemp(c.roomTemp, 1) }),
    );
  const rackLabels: Record<DoughConfig["ovenRack"], string> = {
    bottom: t("più basso"),
    "lower-middle": t("medio-basso"),
    middle: t("centrale"),
    "upper-middle": t("medio-alto"),
    top: t("più alto"),
  };
  const bakeOutcome = estimateBakeOutcome(c);
  // Il preriscaldamento dipende dal forno: pochi minuti per un fornetto, quasi un’ora con il biscotto.
  const oven = ovenById(c.ovenType);
  const preheatMinutes = Math.max(10, oven.preheat);
  const where = oven.fixedRack ? "" : t(", prepara il ripiano {v}", { v: rackLabels[c.ovenRack] });
  stages.push({
    id: "preheat",
    title: t("Preriscalda il forno"),
    at: new Date(bake - preheatMinutes * 60000).toISOString(),
    until: new Date(bake).toISOString(),
    detail: t("Imposta {formatTemp}{where} e preriscalda bene {toLowerCase}. Circa {preheatMinutes} minuti sono un promemoria: segui le indicazioni del tuo forno e del supporto.", { formatTemp: formatTemp(c.ovenTemp, 1), where, toLowerCase: bakeSurfaceLabels[c.bakeSurface].toLowerCase(), preheatMinutes }),
  });
  stages.push({
    id: "bake",
    title: t("Si inforna!"),
    at: new Date(bake).toISOString(),
    until: new Date(bake + c.bakeMinutes * 60000).toISOString(),
    detail: t("Cuoci circa {minutes} min a {temp}{rack}. Previsione: crosta {crust}, mollica {crumb} e fondo {base}. {tip}", {
      minutes: c.bakeMinutes,
      temp: formatTemp(c.ovenTemp, 1),
      rack: oven.fixedRack ? "" : t(" sul ripiano {rack}", { rack: rackLabels[c.ovenRack] }),
      crust: bakeOutcome.crustLabel.toLowerCase(),
      crumb: bakeOutcome.crumbLabel.toLowerCase(),
      base: bakeOutcome.baseLabel.toLowerCase(),
      tip: t(styles.find((s) => s.id === c.styleId)!.tip),
    }),
  });
  return stages.sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );
}
