import { describe, expect, it } from "vitest";
import { buildTimeline, calculate, deriveAutomaticSchedule, estimateBakeOutcome, validateConfig } from "./calculator";
import { applyAutomaticPlan, applyStyleDefaults, applyWholeGrams, suggestStart } from "./recipes";
import { defaultConfig, styles } from "./styles";
import { catalog } from "../data/catalog";
import { ovenProfiles } from "../data/ovens";
import type { DoughConfig } from "./types";

// Generatore deterministico: gli stessi casi a ogni esecuzione, così un errore si riproduce.
function random(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}
const pickFrom = <T,>(r: () => number, list: readonly T[]) => list[Math.floor(r() * list.length)];
const between = (r: () => number, min: number, max: number, step = 1) => Math.round((min + r() * (max - min)) / step) * step;
const usable = catalog.filter((f) => f.usable);
const finite = (value: unknown) => typeof value === "number" && Number.isFinite(value);

function randomConfig(r: () => number): DoughConfig {
  const style = pickFrom(r, styles);
  const base = applyStyleDefaults({ ...defaultConfig(), ovenType: pickFrom(r, ovenProfiles).id }, style.id);
  const bake = new Date("2026-11-14T20:00").getTime();
  const windowHours = between(r, 1, 150, 0.5);
  const start = new Date(bake - windowHours * 3600000);
  const local = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const blend = r() < 0.3;
  return {
    ...base,
    flourId: pickFrom(r, usable).id,
    secondFlourId: blend ? pickFrom(r, usable).id : "",
    secondFlourPercent: blend ? between(r, 5, 60) : 0,
    count: between(r, 1, 30),
    ballWeight: between(r, 100, 2000),
    panWidth: between(r, 10, 80),
    panLength: between(r, 10, 100),
    panShape: pickFrom(r, ["rect", "round"] as const),
    panDiameter: between(r, 14, 60),
    hydration: between(r, 45, 90),
    salt: between(r, 0, 4, 0.1),
    oil: between(r, 0, 10, 0.5),
    sugar: between(r, 0, 15, 0.5),
    malt: between(r, 0, 5, 0.5),
    yeast: pickFrom(r, ["fresh", "instant", "sourdough", "licoli"] as const),
    yeastMode: pickFrom(r, ["auto", "weighable", "manual"] as const),
    manualYeastPercent: between(r, 0.01, 5, 0.01),
    weighableYeastGrams: between(r, 1, 30),
    starterPercent: between(r, 5, 50),
    starterHydration: between(r, 40, 150, 5),
    preferment: pickFrom(r, ["none", "poolish", "biga"] as const),
    prefermentPercent: between(r, 5, 80),
    prefermentHours: between(r, 3, 36),
    prefermentTemp: between(r, 8, 32),
    autolyse: r() < 0.3,
    autolyseMinutes: between(r, 10, 60),
    foldCount: between(r, 0, 8),
    foldIntervalMinutes: between(r, 15, 60, 5),
    mixer: pickFrom(r, ["hand", "stand", "spiral", "thermomix"] as const),
    roomTemp: between(r, 10, 35),
    fridgeTemp: between(r, 1, 12),
    flourTemp: between(r, 5, 35),
    desiredDoughTemp: between(r, 18, 30),
    bulkHours: between(r, 0, 24, 0.5),
    coldHours: r() < 0.5 ? 0 : between(r, 0, 96, 0.5),
    proofHours: between(r, 0, 24, 0.5),
    ovenTemp: between(r, 180, 500, 5),
    bakeMinutes: between(r, 1, 60, 0.5),
    planMode: pickFrom(r, ["date", "duration", "automatic"] as const),
    autoWholeGrams: r() < 0.5,
    startAt: local(start),
    bakeAt: local(new Date(bake)),
  };
}

describe("fuzz: thousands of random doughs", () => {
  it("never crash, never return NaN, conserve mass and keep the schedule in order", () => {
    const r = random(Number(process.env.FUZZ_SEED ?? 20261022));
    const problems: string[] = [];
    let valid = 0;
    for (let i = 0; i < Number(process.env.FUZZ_N ?? 4000); i++) {
      let c = randomConfig(r);
      const tag = `#${i} ${c.styleId}/${c.yeast}/${c.yeastMode}/${c.planMode}/${c.preferment}`;
      try {
        if (c.planMode === "automatic") c = applyWholeGrams(applyAutomaticPlan(c), catalog);
        const errors = validateConfig(c);
        const result = calculate(c, catalog);
        if (!result.ok) continue;
        if (errors.length) problems.push(`${tag}: calcolo riuscito con errori di validazione ${errors.join(" | ")}`);
        valid++;
        for (const key of ["total", "flour", "water", "salt", "oil", "sugar", "malt", "yeast", "yeastPercent", "flourToWeigh", "waterToWeigh"] as const)
          if (!finite(result[key]) || (result[key] as number) < 0) problems.push(`${tag}: ${key} = ${result[key]}`);
        const sum = result.flour + result.water + result.salt + result.oil + result.sugar + result.malt + (result.starter.active ? 0 : result.yeast);
        if (Math.abs(sum - result.total) > Math.max(1, result.total * 0.005)) problems.push(`${tag}: massa ${sum.toFixed(1)} ≠ ${result.total.toFixed(1)}`);
        const flourParts = result.flourBreakdown.reduce((total, item) => total + item.grams, 0);
        if (Math.abs(flourParts - result.flour) > 1) problems.push(`${tag}: farine ${flourParts.toFixed(1)} ≠ ${result.flour.toFixed(1)}`);
        if (c.yeastMode === "weighable" && !result.starter.active && !Number.isInteger(result.yeast)) problems.push(`${tag}: grammi interi non interi (${result.yeast})`);
        const outcome = estimateBakeOutcome(c);
        for (const key of ["crustScore", "crumbScore", "baseScore"] as const)
          if (!finite(outcome[key]) || outcome[key] < 0 || outcome[key] > 100) problems.push(`${tag}: ${key} = ${outcome[key]}`);
        const stages = buildTimeline(c, catalog);
        if (!stages.length) problems.push(`${tag}: nessuna fase nel piano`);
        for (let k = 0; k < stages.length; k++) {
          const at = new Date(stages[k].at).getTime();
          if (!Number.isFinite(at)) problems.push(`${tag}: fase ${stages[k].id} senza orario`);
          if (k > 0 && at < new Date(stages[k - 1].at).getTime()) problems.push(`${tag}: fase ${stages[k].id} prima della precedente`);
          if (/NaN|undefined|Infinity/.test(stages[k].title + stages[k].detail)) problems.push(`${tag}: testo rotto nella fase ${stages[k].id}`);
        }
        for (const a of result.advice) if (/NaN|undefined|Infinity|\{\w+\}/.test(a.title + a.text)) problems.push(`${tag}: avviso «${a.id}» con testo rotto`);
        if (c.planMode === "automatic") {
          const plan = deriveAutomaticSchedule(c);
          if (plan.ok && c.coldHours > 0 && c.coldHours < 8) problems.push(`${tag}: frigo di ${c.coldHours} h`);
          if (plan.ok && plan.fermentationHours > 20 && c.coldHours === 0 && !c.autoWholeGrams) problems.push(`${tag}: ${plan.fermentationHours} h di finestra senza frigo`);
        }
        const suggestion = suggestStart(c, new Date("2026-11-10T08:00").getTime());
        if (suggestion && !Number.isFinite(new Date(suggestion.startAt).getTime())) problems.push(`${tag}: suggerimento di inizio non valido`);
      } catch (error) {
        problems.push(`${tag}: eccezione ${(error as Error).message}`);
      }
    }
    expect(valid).toBeGreaterThan(500);
    expect([...new Set(problems)].slice(0, 40)).toEqual([]);
  }, 120000);
});
