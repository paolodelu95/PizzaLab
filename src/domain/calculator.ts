import { styles } from "./styles";
import { mixerProfiles } from "../data/mixers";
import type { Advice, DoughConfig, Flour, Stage } from "./types";
export const MODEL_VERSION = "direct-v1";
export function validateConfig(c: DoughConfig): string[] {
  const errors: string[] = [];
  const ranges: [keyof DoughConfig, number, number, string][] = [
    ["count", 1, 30, "Quantità"],
    ["ballWeight", 100, 2000, "Peso panetto"],
    ["panWidth", 10, 80, "Larghezza teglia"],
    ["panLength", 10, 100, "Lunghezza teglia"],
    ["panDensity", 0.3, 1, "Impasto per cm²"],
    ["hydration", 45, 90, "Idratazione"],
    ["salt", 0, 4, "Sale"],
    ["oil", 0, 10, "Olio"],
    ["sugar", 0, 15, "Zucchero"],
    ["malt", 0, 5, "Malto"],
    ["bulkHours", 0, 24, "Puntata"],
    ["coldHours", 0, 96, "Ore in frigo"],
    ["proofHours", 0, 24, "Appretto"],
    ["roomTemp", 10, 35, "Temperatura ambiente"],
    ["fridgeTemp", 1, 12, "Temperatura frigo"],
    ["ovenTemp", 180, 500, "Temperatura forno"],
    ["bakeMinutes", 1, 60, "Durata cottura"],
    ["secondFlourPercent", 0, 100, "Percentuale seconda farina"],
    ["thirdFlourPercent", 0, 100, "Percentuale terza farina"],
    ["fourthFlourPercent", 0, 100, "Percentuale quarta farina"],
    ["manualYeastPercent", 0.001, 5, "Lievito manuale"],
    ["weighableYeastGrams", 1, 30, "Lievito pesabile"],
    ["prefermentPercent", 5, 80, "Farina nel prefermento"],
    ["prefermentHours", 3, 36, "Durata prefermento"],
    ["prefermentTemp", 8, 32, "Temperatura prefermento"],
    ["flourTemp", 5, 35, "Temperatura farina"],
    ["desiredDoughTemp", 18, 30, "Temperatura obiettivo impasto"],
    ["autolyseWaterPercent", 30, 95, "Acqua nell’autolisi"],
    ["autolyseMinutes", 10, 60, "Durata autolisi"],
    ["starterPercent", 5, 50, "Dose lievito madre"],
    ["starterHydration", 40, 150, "Idratazione lievito madre"],
  ];
  for (const [key, min, max, name] of ranges) {
    const n = c[key];
    if (typeof n !== "number" || !Number.isFinite(n) || n < min || n > max)
      errors.push(`${name}: inserisci un valore tra ${min} e ${max}.`);
  }
  if (!Number.isInteger(c.count))
    errors.push("La quantità deve essere intera.");
  if (!styles.some((s) => s.id === c.styleId))
    errors.push("Scegli uno stile valido.");
  if (!["fresh", "instant", "sourdough", "licoli"].includes(c.yeast))
    errors.push("Tipo di lievito non valido.");
  if (c.secondFlourPercent + c.thirdFlourPercent + c.fourthFlourPercent > 100)
    errors.push(
      "Le quote delle farine aggiuntive non possono superare il 100%.",
    );
  if (!["auto", "weighable", "manual"].includes(c.yeastMode))
    errors.push("Modalità del lievito non valida.");
  if (!["none", "poolish", "biga"].includes(c.preferment))
    errors.push("Prefermento non valido.");
  if (!["hand", "stand", "spiral", "thermomix"].includes(c.mixer))
    errors.push("Metodo di impasto non valido.");
  if (
    !["bottom", "lower-middle", "middle", "upper-middle", "top"].includes(
      c.ovenRack,
    )
  )
    errors.push("Posizione nel forno non valida.");
  if (!["light", "golden", "dark"].includes(c.crustBrowning))
    errors.push("Doratura non valida.");
  if (!["soft", "balanced", "dry"].includes(c.crumbBake))
    errors.push("Cottura della mollica non valida.");
  if (typeof c.autolyse !== "boolean")
    errors.push("Impostazione autolisi non valida.");
  if (c.preferment !== "none") {
    const prefermentHydration = c.preferment === "poolish" ? 100 : 50;
    if ((c.prefermentPercent * prefermentHydration) / 100 > c.hydration)
      errors.push(
        "Il prefermento richiede più acqua di quella disponibile nella ricetta. Riduci la sua percentuale o aumenta l’idratazione.",
      );
  }
  if (["sourdough", "licoli"].includes(c.yeast) && c.preferment !== "none")
    errors.push(
      "Con lievito madre o licoli usa il metodo diretto: il lievito naturale è già un prefermento.",
    );
  if (c.bulkHours + c.coldHours + c.proofHours < 2)
    errors.push("Prevedi almeno 2 ore totali di fermentazione.");
  if (c.bulkHours + c.proofHours < 1)
    errors.push("Prevedi almeno un’ora complessiva a temperatura ambiente.");
  if (!Number.isFinite(new Date(c.bakeAt).getTime()))
    errors.push("Imposta giorno e ora della cottura.");
  return errors;
}
export function calculate(c: DoughConfig, flours: Flour[]) {
  const errors = validateConfig(c);
  const flour = flours.find((f) => f.id === c.flourId);
  const second = flours.find((f) => f.id === c.secondFlourId);
  const third = flours.find((f) => f.id === c.thirdFlourId);
  const fourth = flours.find((f) => f.id === c.fourthFlourId);
  const prefermentFlour = flours.find((f) => f.id === c.prefermentFlourId);
  if (!flour) errors.push("Scegli una farina dal catalogo.");
  if (flour && !flour.usable)
    errors.push(
      "Questa farina richiede una ricetta specifica: scegli una farina di grano tenero senza lievito aggiunto.",
    );
  if (c.secondFlourPercent > 0 && (!second || !second.usable))
    errors.push("Scegli una seconda farina compatibile.");
  if (c.thirdFlourPercent > 0 && (!third || !third.usable))
    errors.push("Scegli una terza farina compatibile.");
  if (c.fourthFlourPercent > 0 && (!fourth || !fourth.usable))
    errors.push("Scegli una quarta farina compatibile.");
  if (
    c.preferment !== "none" &&
    c.prefermentFlourId &&
    (!prefermentFlour || !prefermentFlour.usable)
  )
    errors.push("Scegli una farina compatibile per il prefermento.");
  if (errors.length) return { ok: false as const, errors };
  const style = styles.find((s) => s.id === c.styleId)!;
  const secondShare = c.secondFlourPercent / 100;
  const thirdShare = c.thirdFlourPercent / 100;
  const fourthShare = c.fourthFlourPercent / 100;
  const firstShare = 1 - secondShare - thirdShare - fourthShare;
  const strength = (f: Flour) => (f.w ? (f.w[0] + f.w[1]) / 2 : null);
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
  const strengths = activeFlours.map(({ flour, share }) => ({
    value: strength(flour),
    share,
  }));
  let w = strengths.every((item) => item.value !== null)
    ? strengths.reduce((sum, item) => sum + item.value! * item.share, 0)
    : null;
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
  const unitWeight = style.pan
    ? c.panWidth * c.panLength * c.panDensity
    : c.ballWeight;
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
      errors: ["La quantità di lievito supera il peso totale dell’impasto."],
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
    const adjustedCold = roundHalf(targetCold);
    const currentTotal = currentWarm + c.coldHours;
    const adjustedTotal = adjustedBulk + adjustedProof + adjustedCold;
    const startShiftHours = roundHalf(currentTotal - adjustedTotal);
    const movedToCold = Math.max(0, adjustedCold - c.coldHours);
    const summary =
      movedToCold >= 0.5
        ? `Sposta circa ${movedToCold.toLocaleString("it-IT")} ore dalla fase a temperatura ambiente al frigorifero.`
        : startShiftHours > 0.25
          ? `Con questa dose puoi iniziare circa ${startShiftHours.toLocaleString("it-IT")} ore più tardi.`
          : startShiftHours < -0.25
            ? `Con questa dose servono circa ${Math.abs(startShiftHours).toLocaleString("it-IT")} ore in più.`
            : "La dose scelta è già compatibile con i tempi impostati.";
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
        "La dose o l’idratazione del lievito madre supera farina o acqua disponibili.",
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
      ? "giovane"
      : prefermentProgress < 0.9
        ? "in sviluppo"
        : prefermentProgress <= 1.2
          ? "al picco"
          : "oltre il picco";
  if (c.preferment !== "none" && prefermentFlour) {
    const prefermentW = strength(prefermentFlour);
    const prefermentShare = c.prefermentPercent / 100;
    w =
      w !== null && prefermentW !== null
        ? w * (1 - prefermentShare) + prefermentW * prefermentShare
        : null;
  }
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
  ) => advice.push({ id, level, title, text });
  if (w === null)
    add(
      "unknown-w",
      "warning",
      "La forza W non è disponibile",
      "Non posso valutare la tenuta della farina. Controlla la scheda tecnica: le proteine da sole non determinano il W.",
    );
  if (w !== null && w < style.minW)
    add(
      "weak-style",
      "warning",
      "Farina delicata per questo stile",
      `Come punto di partenza, valuta una farina intorno a W ${style.minW} o superiore. Riduci idratazione e durata e osserva la tenuta dell’impasto.`,
    );
  if (
    w !== null &&
    ((w < 240 && hours > 24) ||
      (w < 300 && hours > 48) ||
      (w < 340 && hours > 72))
  )
    add(
      "long-weak",
      "warning",
      "Tempi impegnativi per questa farina",
      "La durata è elevata rispetto alla forza dichiarata. Accorcia il riposo oppure scegli una farina più forte; W e ore non hanno una corrispondenza esatta.",
    );
  if (
    c.hydration < style.hydrationRange[0] ||
    c.hydration > style.hydrationRange[1]
  )
    add(
      "hydration-style",
      "warning",
      "Idratazione fuori dall’intervallo di partenza",
      `Per ${style.name.toLowerCase()} il riferimento pratico è ${style.hydrationRange[0]}–${style.hydrationRange[1]}%. Puoi sperimentare, adeguando la lavorazione.`,
    );
  if (c.hydration >= 75)
    add(
      "wet",
      "info",
      "Tieni da parte l’ultima acqua",
      "Un impasto molto idratato richiede buona struttura. Aggiungi l’acqua gradualmente e usa pause e pieghe; l’assorbimento di laboratorio non è l’idratazione della ricetta.",
    );
  if (w !== null && w < 260 && c.hydration > 70)
    add(
      "weak-wet",
      "warning",
      "Acqua elevata per una farina poco forte",
      "Parti con meno acqua. Se l’impasto perde struttura, aggiungerne ancora rende la gestione più difficile.",
    );
  if (c.roomTemp >= 27)
    add(
      "warm",
      "warning",
      "In cucina fa caldo",
      "Controlla l’impasto prima dell’orario previsto. Usa acqua fresca, misura la temperatura finale e accorcia le fasi fuori frigo se la crescita è rapida.",
    );
  if (c.coldHours > 0 && c.fridgeTemp > 5)
    add(
      "fridge",
      "warning",
      "Il frigo rallenta meno del previsto",
      "Verifica con un termometro la temperatura effettiva vicino all’impasto. Il modello diventa meno affidabile sopra 5 °C: controlla la crescita e riduci i tempi.",
    );
  if (c.coldHours > 0 && c.proofHours < 2)
    add(
      "short-proof",
      "warning",
      "Poco tempo dopo il frigo",
      "L’impasto potrebbe essere ancora freddo e tenace. Considera almeno 2–4 ore, adattandoti a dimensione dei panetti e temperatura reale.",
    );
  if (c.bulkHours + c.proofHours > 16)
    add(
      "long-room",
      "warning",
      "Molte ore fuori frigo",
      "Con tempi così lunghi la stima del lievito è meno affidabile. Monitora volume, elasticità e temperatura; non aspettare l’orario se l’impasto sta cedendo.",
    );
  if (c.ovenTemp < 380 && ["napoletana", "contemporanea"].includes(c.styleId))
    add(
      "oven",
      "warning",
      "Adatta la cottura al forno di casa",
      "Questo stile nasce per forni molto caldi. Preriscalda bene pietra o acciaio e prolunga la cottura controllando la base: il risultato sarà diverso.",
    );
  if (c.salt < 1.5)
    add(
      "low-salt",
      "warning",
      "Poco sale nell’impasto",
      "Il sale contribuisce a struttura e controllo della fermentazione. Con questa dose verifica più spesso la crescita.",
    );
  if (!naturalStarter && yeast < 0.1)
    add(
      "scale",
      "warning",
      "Dose difficile da pesare",
      "Serve una bilancia da 0,01 g. In alternativa prepara una sospensione 1:9 di lievito e acqua e usane dieci volte la dose, sottraendo l’acqua usata da quella totale.",
    );
  if (
    !naturalStarter &&
    c.yeastMode === "auto" &&
    rawFreshPercent !== freshPercent
  )
    add(
      "model-limit",
      "warning",
      "Al limite del modello",
      "La dose è stata limitata all’intervallo del calcolatore. Modifica durata o temperatura: questo piano necessita di una prova pratica.",
    );
  if (!naturalStarter && c.yeastMode === "manual")
    add(
      "manual-yeast",
      "info",
      "Dose di lievito manuale",
      "Gli orari restano fissi. Usa il grafico di fermentazione e controlla il volume: la dose inserita può anticipare o ritardare il picco.",
    );
  if (!naturalStarter && c.yeastMode === "weighable")
    add(
      "weighable-yeast",
      "info",
      "Dose realmente pesabile",
      `Hai scelto ${yeast.toLocaleString("it-IT")} g invece dei ${autoYeast.toLocaleString("it-IT", { maximumFractionDigits: 2 })} g stimati. Applica la compensazione proposta e controlla comunque la crescita reale.`,
    );
  if (naturalStarter)
    add(
      "natural-starter",
      "info",
      "Lievito naturale: osserva la crescita",
      "La vitalità cambia da un rinfresco all’altro. Usa una coltura al picco e considera gli orari una traccia: volume, elasticità e profumo vengono prima dell’orologio.",
    );
  if (c.preferment !== "none" && prefermentProgress > 1.2)
    add(
      "preferment-ripe",
      "warning",
      "Prefermento oltre il picco",
      "Accorcia la durata, abbassa la temperatura o usa il comando Ottimizza. Odore pungente e struttura ceduta indicano che è troppo maturo.",
    );
  if (c.hydration >= 72 && !c.autolyse)
    add(
      "autolyse",
      "info",
      "Valuta un’autolisi breve",
      "Un riposo iniziale di farina e parte dell’acqua facilita l’assorbimento. Puoi attivarlo nel Laboratorio impasto e tenere l’acqua restante per il lievito e il bassinage.",
    );
  if (waterTemp <= 2 || waterTemp >= 45)
    add(
      "water-temperature",
      "warning",
      "Temperatura dell’acqua fuori dal campo pratico",
      "Il metodo del fattore 3 ha raggiunto il limite del calcolatore. Correggi temperatura ambiente, farina o impasto obiettivo.",
    );
  if (secondShare > 0 || thirdShare > 0 || fourthShare > 0)
    add(
      "blend",
      "info",
      "La forza della miscela è indicativa",
      "Il W visualizzato è una media ponderata di orientamento: la risposta reale di una miscela non è necessariamente lineare e l’assorbimento va verificato durante l’impasto.",
    );
  if (
    activeFlours.some((item) => item.flour.kind !== "wheat") ||
    (prefermentFlour && prefermentFlour.kind !== "wheat")
  )
    add(
      "special-flour",
      "warning",
      "Farina o miscela speciale",
      "Semola, farro, riso e miscele non si comportano come una normale farina di grano tenero. Verifica la confezione e inseriscile gradualmente in miscela finché non conosci assorbimento e tenuta.",
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
        (w !== null && w < style.minW ? 25 : 0),
    ),
  };
  const blendAllocation =
    c.preferment !== "none" || naturalStarter ? mainFlour : flourGrams;
  const mainFlourBreakdown = activeFlours.map(
    ({ flour: component, share }) => ({
      id: component.id,
      name: `${component.brand} · ${component.name}`,
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
      name: `${component.brand} · ${component.name}`,
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
      name: `${actualPrefermentFlour.brand} · ${actualPrefermentFlour.name}`,
      grams: (old?.grams ?? 0) + prefermentFlourGrams,
      percent: 0,
    });
  }
  if (naturalStarter) {
    const old = flourMap.get(flour!.id);
    flourMap.set(flour!.id, {
      id: flour!.id,
      name: `${flour!.brand} · ${flour!.name}`,
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
        ? `${actualPrefermentFlour.brand} · ${actualPrefermentFlour.name}`
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
      ? `Mescola ${Math.round(r.preferment.flour)} g di ${r.preferment.flourName ?? r.flourBreakdown[0]?.name ?? "farina"}, ${Math.round(r.preferment.water)} g d’acqua e ${r.preferment.yeast.toLocaleString("it-IT", { maximumFractionDigits: 2 })} g di lievito. Copri e lascia maturare ${c.prefermentHours} ore a ${c.prefermentTemp} °C; usalo quando è gonfio e aromatico, prima che ceda.`
      : `Mescola la quota di farina e acqua del ${c.preferment}, aggiungi il lievito previsto e lascia maturare a ${c.prefermentTemp} °C.`;
    add(
      "preferment",
      `Prepara il ${c.preferment}`,
      c.prefermentHours * hour,
      prefermentDetail,
    );
  }
  if (c.autolyse) {
    const division =
      r && r.mainFlourBreakdown.length > 1
        ? ` Prepara prima la miscela per l’impasto finale: ${r.mainFlourBreakdown.map((item) => `${Math.round(item.grams)} g ${item.name}`).join(" + ")}.`
        : "";
    const grams = r
      ? ` Mescola ${Math.round(r.autolyse.flour)} g di farina con ${Math.round(r.autolyse.water)} g d’acqua (${c.autolyseWaterPercent}% dell’acqua disponibile nell’impasto finale).`
      : "";
    add(
      "autolyse",
      "Autolisi breve",
      c.autolyseMinutes * 60000,
      `${division}${grams} Non aggiungere ancora lievito, sale o grassi. Copri e lascia riposare: la massa deve risultare grezza, senza cercare l’incordatura.`,
    );
  }
  const flourDetail = r
    ? r.mainFlourBreakdown
        .map((item) => `${Math.round(item.grams)} g ${item.name}`)
        .join(" + ")
    : "le farine previste";
  const mixingDetail = r
    ? c.autolyse
      ? `Sciogli ${r.preferment.mainYeast.toLocaleString("it-IT", { maximumFractionDigits: 2 })} g di lievito nei ${Math.round(r.autolyse.reservedWater)} g d’acqua tenuti da parte. Avvia la lavorazione dell’autolisi e incorpora la soluzione poco alla volta. Aggiungi ${r.salt.toLocaleString("it-IT", { maximumFractionDigits: 1 })} g di sale quando l’impasto prende struttura${r.oil > 0 ? `, poi ${r.oil.toLocaleString("it-IT", { maximumFractionDigits: 1 })} g di olio a filo` : ""}. Controlla che l’impasto finale sia vicino a ${c.desiredDoughTemp} °C.`
      : `Pesa ${flourDetail}, ${Math.round(r.preferment.mainWater)} g d’acqua e ${r.preferment.mainYeast.toLocaleString("it-IT", { maximumFractionDigits: 2 })} g di lievito. Mescola prima acqua, lievito e farine${c.preferment !== "none" ? " e incorpora il prefermento maturo" : ""}; aggiungi ${r.salt.toLocaleString("it-IT", { maximumFractionDigits: 1 })} g di sale quando non resta farina asciutta${r.oil > 0 ? `, poi ${r.oil.toLocaleString("it-IT", { maximumFractionDigits: 1 })} g di olio` : ""}. Lavora fino a una massa liscia ed elastica, senza superare ${c.desiredDoughTemp} °C.`
    : "Pesa separatamente tutte le farine e gli altri ingredienti. Unisci acqua, lievito e farine; incorpora l’eventuale prefermento, poi sale e grassi. Lavora fino a ottenere una struttura omogenea.";
  const machineDetail =
    c.mixer === "stand"
      ? (() => {
          const profile =
            mixerProfiles.find((item) => item.id === c.mixerProfileId) ??
            mixerProfiles[0];
          return ` Usa il ${profile.tool.toLowerCase()}: ${profile.start.toLowerCase()}, poi ${profile.knead.toLowerCase()}. Per la chiusura: ${profile.finish.toLowerCase()}.`;
        })()
      : c.mixer === "spiral"
        ? " In spirale parti in prima velocità; passa in seconda solo dopo che l’impasto ha preso struttura e controlla spesso la temperatura."
        : c.mixer === "thermomix"
          ? " Procedi con brevi cicli in modalità impasto, intervallati da pause: il robot scalda rapidamente la massa."
          : " A mano alterna impastamento e pause di 5–10 minuti; usa pieghe in ciotola finché la massa diventa elastica.";
  add(
    "mix",
    "Impasta e sviluppa la struttura",
    20 * 60000,
    mixingDetail + machineDetail,
  );
  if (c.bulkHours > 0)
    add(
      "bulk",
      "Riposo in massa",
      c.bulkHours * hour,
      `Copri l’impasto a ${c.roomTemp} °C. Se serve struttura, fai una piega dopo circa 30 minuti. Osserva la crescita.`,
    );
  if (c.coldHours > 0)
    add(
      "cold",
      "Metti in frigorifero",
      c.coldHours * hour,
      `Riponi in un contenitore coperto a ${c.fridgeTemp} °C, con spazio per crescere. L’impasto non si raffredda istantaneamente.`,
    );
  const pan =
    styles.find((s) => s.id === c.styleId)?.pan || c.styleId === "padellino";
  if (c.proofHours > 0)
    add(
      "proof",
      c.coldHours > 0 ? "Fuori frigo e porziona" : "Dividi e fai lievitare",
      c.proofHours * hour,
      pan
        ? `Dividi in ${c.count} porzioni. Lascia rilassare, poi stendi nella teglia unta e termina l’appretto. Copri per evitare la pelle.`
        : `Forma ${c.count} panetti, copri e lascia rilassare a ${c.roomTemp} °C. Dovranno essere estensibili e ariosi, senza collassare.`,
    );
  const rackLabels: Record<DoughConfig["ovenRack"], string> = {
    bottom: "più basso",
    "lower-middle": "medio-basso",
    middle: "centrale",
    "upper-middle": "medio-alto",
    top: "più alto",
  };
  const crustLabels: Record<DoughConfig["crustBrowning"], string> = {
    light: "chiara",
    golden: "dorata",
    dark: "intensa",
  };
  const crumbLabels: Record<DoughConfig["crumbBake"], string> = {
    soft: "soffice e umida",
    balanced: "cotta ma morbida",
    dry: "più asciutta e croccante",
  };
  stages.push({
    id: "preheat",
    title: "Preriscalda il forno",
    at: new Date(bake - 45 * 60000).toISOString(),
    until: new Date(bake).toISOString(),
    detail: `Imposta ${c.ovenTemp} °C e prepara il ripiano ${rackLabels[c.ovenRack]}. Circa 45 minuti sono un promemoria: segui le indicazioni del tuo forno e della pietra o dell’acciaio.`,
  });
  stages.push({
    id: "bake",
    title: "Si inforna!",
    at: new Date(bake).toISOString(),
    until: new Date(bake + c.bakeMinutes * 60000).toISOString(),
    detail: `Cuoci circa ${c.bakeMinutes} min a ${c.ovenTemp} °C sul ripiano ${rackLabels[c.ovenRack]}. Obiettivo: crosta ${crustLabels[c.crustBrowning]} e mollica ${crumbLabels[c.crumbBake]}. ${styles.find((s) => s.id === c.styleId)!.tip}`,
  });
  return stages.sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );
}
