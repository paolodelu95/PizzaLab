import { afterEach, describe, expect, it } from "vitest";
import {
  buildTimeline,
  calculate,
  deriveAutomaticSchedule,
  MIN_COLD_HOURS,
  estimateBakeOutcome,
  panArea,
  recommendedBakeMinutes,
  validateConfig,
} from "./calculator";
import { defaultConfig, styles } from "./styles";
import { defaultUnits, setUnits } from "../services/units";
import type { DoughConfig, Flour } from "./types";
const flour: Flour = {
  id: "caputo-pizzeria",
  brand: "Test",
  name: "00",
  type: "00",
  w: [260, 280],
  protein: 12.5,
  proteinBasis: "%",
  pl: null,
  source: "https://example.com",
  checkedAt: "2026-09-25",
  kind: "wheat",
  usable: true,
  note: "",
};
const flours = [
  flour,
  { ...flour, id: "strong", w: [370, 390] as [number, number] },
  { ...flour, id: "medium", w: [300, 300] as [number, number] },
  { ...flour, id: "lower", w: [200, 200] as [number, number] },
  { ...flour, id: "unknown", w: null },
  { ...flour, id: "mix", usable: false },
  { ...flour, id: "gluten-free", name: "Mix pizza", w: null, kind: "blend" as const, glutenFree: true },
];
const config = (patch: Partial<DoughConfig> = {}) => ({
  ...defaultConfig(),
  bakeAt: "2026-11-14T20:00",
  ...patch,
});
function result(patch: Partial<DoughConfig> = {}) {
  const r = calculate(config(patch), flours);
  if (!r.ok) throw new Error(r.errors.join(","));
  return r;
}
describe("baker percentages and mass conservation", () => {
  it.each(styles.map((s) => s.id))("conserves mass for %s", (styleId) => {
    const r = result({ styleId });
    expect(r.flour + r.water + r.salt + r.oil + r.yeast).toBeCloseTo(
      r.total,
      8,
    );
    expect(r.water / r.flour).toBeCloseTo(0.63, 9);
  });
  it("uses pan area and quantity, independent of ball weight", () => {
    const r = result({
      styleId: "teglia",
      count: 2,
      panWidth: 30,
      panLength: 40,
      panDensity: 0.6,
      ballWeight: 100,
    });
    expect(r.total).toBe(1440);
    expect(r.unitWeight).toBe(720);
  });
  it("scales all ingredients with quantity", () => {
    expect(result({ count: 8 }).yeast).toBeCloseTo(
      result({ count: 4 }).yeast * 2,
      9,
    );
  });
  it("uses one-third instant yeast percentage and still conserves mass", () => {
    expect(result({ yeast: "instant" }).yeastPercent).toBeCloseTo(
      result().yeastPercent / 3,
      9,
    );
  });
  it("includes sugar and malt without changing total mass", () => {
    const r = result({ sugar: 3, malt: 0.5 });
    expect(
      r.flour + r.water + r.salt + r.oil + r.sugar + r.malt + r.yeast,
    ).toBeCloseTo(r.total, 8);
  });
});
describe("fermentation estimates and warnings", () => {
  it("reduces yeast when ambient temperature increases", () => {
    expect(result({ roomTemp: 30 }).yeast).toBeLessThan(
      result({ roomTemp: 18 }).yeast,
    );
  });
  it("reduces yeast for longer fermentation", () => {
    expect(result({ coldHours: 48 }).yeast).toBeLessThan(
      result({ coldHours: 6 }).yeast,
    );
  });
  it("distinguishes fridge time from room time", () => {
    expect(
      result({ bulkHours: 2, coldHours: 20, proofHours: 2 }).yeast,
    ).toBeGreaterThan(
      result({ bulkHours: 12, coldHours: 0, proofHours: 12 }).yeast,
    );
  });
  it("does not derive W from protein", () => {
    const r = result({ flourId: "unknown" });
    expect(r.w).toBeNull();
    expect(r.advice.some((a) => a.id === "unknown-w")).toBe(true);
  });
  it("warns on weak flour, long times, high hydration and home oven", () => {
    const r = calculate(
      config({
        styleId: "contemporanea",
        hydration: 80,
        coldHours: 72,
        ovenTemp: 250,
      }),
      [{ ...flour, w: [170, 170] }],
    );
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(r.advice.map((a) => a.id)).toEqual(
        expect.arrayContaining(["weak-style", "long-weak", "weak-wet", "oven"]),
      );
  });
  it("blends flour mass without pretending W is measured", () => {
    const r = result({ secondFlourId: "strong", secondFlourPercent: 25 });
    expect(r.secondFlour / r.flour).toBe(0.25);
    expect(r.w).toBe(297.5);
    expect(r.advice.some((a) => a.id === "blend")).toBe(true);
  });
  it("blends three flours and preserves all shares", () => {
    const r = result({
      secondFlourId: "strong",
      secondFlourPercent: 25,
      thirdFlourId: "medium",
      thirdFlourPercent: 20,
    });
    expect(r.firstFlour / r.flour).toBeCloseTo(0.55);
    expect(r.secondFlour / r.flour).toBeCloseTo(0.25);
    expect(r.thirdFlour / r.flour).toBeCloseTo(0.2);
    expect(r.w).toBe(303.5);
  });
  it("blends four flours with a weighted W", () => {
    const r = result({
      secondFlourId: "strong",
      secondFlourPercent: 20,
      thirdFlourId: "medium",
      thirdFlourPercent: 20,
      fourthFlourId: "lower",
      fourthFlourPercent: 20,
    });
    expect(r.firstFlour / r.flour).toBeCloseTo(0.4);
    expect(r.fourthFlour / r.flour).toBeCloseTo(0.2);
    expect(r.w).toBe(284);
  });
  it("100% second flour ignores missing first W", () => {
    expect(
      result({
        flourId: "unknown",
        secondFlourId: "strong",
        secondFlourPercent: 100,
      }).w,
    ).toBe(380);
  });
  it("keeps missing W missing in a partial blend", () => {
    expect(
      result({ secondFlourId: "unknown", secondFlourPercent: 20 }).w,
    ).toBeNull();
  });
});
describe("input guards", () => {
  it.each([
    { hydration: NaN },
    { count: 1.5 },
    { count: 0 },
    { coldHours: -1 },
    { bulkHours: Infinity },
    { bakeAt: "" },
    { coldHours: 0, bulkHours: 0, proofHours: 0 },
    { roomTemp: 50 },
    { styleId: "invalid" },
  ])("rejects invalid inputs %j", (patch) => {
    expect(calculate(config(patch), flours).ok).toBe(false);
  });
  it("rejects unsupported premixes and missing flours", () => {
    expect(calculate(config({ flourId: "mix" }), flours).ok).toBe(false);
    expect(calculate(config({ flourId: "missing" }), flours).ok).toBe(false);
  });
  it("rejects a missing second flour", () => {
    expect(calculate(config({ secondFlourPercent: 25 }), flours).ok).toBe(
      false,
    );
  });
  it("rejects a missing third flour and shares over 100%", () => {
    expect(calculate(config({ thirdFlourPercent: 20 }), flours).ok).toBe(false);
    expect(
      calculate(
        config({
          secondFlourId: "strong",
          secondFlourPercent: 70,
          thirdFlourId: "medium",
          thirdFlourPercent: 40,
        }),
        flours,
      ).ok,
    ).toBe(false);
  });
  it("rejects preferment water above total recipe water", () => {
    expect(
      calculate(
        config({ preferment: "poolish", prefermentPercent: 80, hydration: 60 }),
        flours,
      ).ok,
    ).toBe(false);
  });
  it("does not reject a past date as malformed", () => {
    expect(validateConfig(config({ bakeAt: "2020-01-01T12:00" }))).toEqual([]);
  });
  it("rejects a bulk fermentation shorter than the scheduled folds", () => {
    expect(
      validateConfig(
        config({ foldCount: 3, foldIntervalMinutes: 30, bulkHours: 1 }),
      ),
    ).toContain(
      "La puntata deve durare almeno 90 minuti per completare tutte le pieghe.",
    );
  });
});
describe("schedule", () => {
  it("derives warm, cold and proof phases from a chosen start and bake time", () => {
    const c = config({
      planMode: "automatic",
      startAt: "2026-11-13T19:40",
      bakeAt: "2026-11-14T20:00",
    });
    const plan = deriveAutomaticSchedule(c);
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.bulkHours + plan.coldHours + plan.proofHours).toBeCloseTo(24, 2);
    expect(plan.coldHours).toBeGreaterThan(0);
    const timeline = buildTimeline({
      ...c,
      bulkHours: plan.bulkHours,
      coldHours: plan.coldHours,
      proofHours: plan.proofHours,
    });
    expect(new Date(timeline[0].at).getTime()).toBe(new Date(c.startAt).getTime());
  });
  it("rejects an automatic window that is too short", () => {
    const plan = deriveAutomaticSchedule(config({
      planMode: "automatic",
      startAt: "2026-11-14T19:00",
      bakeAt: "2026-11-14T20:00",
    }));
    expect(plan.ok).toBe(false);
  });
  it("keeps the automatic window long enough for all scheduled folds", () => {
    const plan = deriveAutomaticSchedule(config({
      planMode: "automatic",
      startAt: "2026-11-14T16:00",
      bakeAt: "2026-11-14T20:00",
      foldCount: 7,
      foldIntervalMinutes: 30,
    }));
    expect(plan.ok).toBe(false);
  });
  it("works backwards from bake time including 20 minutes mixing", () => {
    const c = config();
    const t = buildTimeline(c);
    expect(t.at(-1)?.id).toBe("bake");
    expect(new Date(t[0].at).getTime()).toBe(
      new Date(c.bakeAt).getTime() - 24 * 3600000 - 20 * 60000,
    );
  });
  it("preserves each cold and warm duration", () => {
    const t = buildTimeline(config());
    for (const [id, h] of [
      ["bulk", 2],
      ["cold", 18],
      ["proof", 4],
    ] as const) {
      const stage = t.find((s) => s.id === id)!;
      expect(
        new Date(stage.until).getTime() - new Date(stage.at).getTime(),
      ).toBe(h * 3600000);
    }
  });
  it("omits fridge for ambient method and zero-length stages", () => {
    const t = buildTimeline(
      config({ coldHours: 0, bulkHours: 0, proofHours: 6 }),
    );
    expect(t.map((s) => s.id)).toEqual(["mix", "proof", "preheat", "bake"]);
  });
  it("places preheat chronologically even with short appretto", () => {
    const t = buildTimeline(config({ proofHours: 0.5 }));
    const times = t.map((s) => new Date(s.at).getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });
  it("handles DST transitions using elapsed time", () => {
    const c = config({ bakeAt: "2026-10-25T20:00" });
    const t = buildTimeline(c);
    expect(new Date(c.bakeAt).getTime() - new Date(t[0].at).getTime()).toBe(
      (24 * 60 + 20) * 60000,
    );
  });
  it("places preferment before mixing and preserves its duration", () => {
    const t = buildTimeline(
      config({ preferment: "poolish", prefermentHours: 12 }),
    );
    expect(t[0].id).toBe("preferment");
    expect(new Date(t[0].until).getTime() - new Date(t[0].at).getTime()).toBe(
      12 * 3600000,
    );
    expect(t[1].id).toBe("mix");
  });
  it("adds a 30 minute autolyse before mixing without shifting the bake time", () => {
    const c = config({ autolyse: true, autolyseMinutes: 30 });
    const t = buildTimeline(c, flours);
    expect(t[0].id).toBe("autolyse");
    expect(t[1].id).toBe("mix");
    expect(new Date(t[0].until).getTime() - new Date(t[0].at).getTime()).toBe(
      30 * 60000,
    );
    expect(t.at(-1)?.at).toBe(new Date(c.bakeAt).toISOString());
  });
  it("places three folds every 30 minutes inside a 90 minute bulk", () => {
    const t = buildTimeline(
      config({ foldCount: 3, foldIntervalMinutes: 30, bulkHours: 1.5 }),
    );
    const bulk = t.find((s) => s.id === "bulk")!;
    const folds = t.filter((s) => s.id.startsWith("fold-"));
    expect(folds.map((s) => s.title)).toEqual([
      "Piega 1 di 3",
      "Piega 2 di 3",
      "Piega 3 di 3",
    ]);
    expect(
      folds.map(
        (s) => (new Date(s.at).getTime() - new Date(bulk.at).getTime()) / 60000,
      ),
    ).toEqual([30, 60, 90]);
  });
});
describe("advanced planning", () => {
  it("splits a poolish from the final dough and reports peak maturity", () => {
    const r = result({
      preferment: "poolish",
      prefermentPercent: 20,
      prefermentHours: 12,
      prefermentTemp: 20,
    });
    expect(r.preferment.flour / r.flour).toBeCloseTo(0.2);
    expect(r.preferment.water).toBeCloseTo(r.preferment.flour);
    expect(r.preferment.mainWater + r.preferment.water).toBeCloseTo(r.water);
    expect(r.preferment.maturity).toBe("al picco");
  });
  it("uses a separately selected preferment flour in weighted strength", () => {
    const r = result({
      preferment: "poolish",
      prefermentPercent: 20,
      prefermentFlourId: "strong",
    });
    expect(r.w).toBe(292);
    expect(r.firstFlour + r.preferment.flour).toBeCloseTo(r.flour);
  });
  it("keeps manual yeast fixed when duration changes", () => {
    expect(
      result({ yeastMode: "manual", manualYeastPercent: 0.12, coldHours: 6 })
        .yeastPercent,
    ).toBe(0.12);
    expect(
      result({ yeastMode: "manual", manualYeastPercent: 0.12, coldHours: 72 })
        .yeastPercent,
    ).toBe(0.12);
  });
  it("uses an exact integer yeast dose without breaking mass conservation", () => {
    const r = result({ yeastMode: "weighable", weighableYeastGrams: 1 });
    expect(r.yeast).toBe(1);
    expect(
      r.flour + r.water + r.salt + r.oil + r.sugar + r.malt + r.yeast,
    ).toBeCloseTo(r.total, 8);
    expect(r.yeastAdjustment).not.toBeNull();
  });
  it("compensates a larger weighable dose with a slower or shorter schedule", () => {
    const r = result({ yeastMode: "weighable", weighableYeastGrams: 2 });
    expect(r.yeastAdjustment!.autoGrams).toBeLessThan(2);
    expect(r.yeastAdjustment!.coldHours).toBeGreaterThanOrEqual(18);
    expect(
      r.yeastAdjustment!.bulkHours + r.yeastAdjustment!.proofHours,
    ).toBeLessThan(6);
  });
  it("raises recommended water temperature for a colder flour", () => {
    expect(result({ flourTemp: 10 }).waterTemp).toBeGreaterThan(
      result({ flourTemp: 25 }).waterTemp,
    );
  });
  it("splits autolyse and reserve water without changing recipe water", () => {
    const r = result({ autolyse: true, autolyseWaterPercent: 70 });
    expect(r.autolyse.water / r.preferment.mainWater).toBeCloseTo(0.7);
    expect(r.autolyse.water + r.autolyse.reservedWater).toBeCloseTo(
      r.preferment.mainWater,
    );
  });
  it("exposes named flour quantities that sum to total flour", () => {
    const r = result({ secondFlourId: "strong", secondFlourPercent: 25 });
    expect(r.flourBreakdown).toHaveLength(2);
    expect(
      r.flourBreakdown.reduce((sum, item) => sum + item.grams, 0),
    ).toBeCloseTo(r.flour);
  });
  it("does not apply W assumptions to a gluten-free mix", () => {
    const r = result({ flourId: "gluten-free" });
    expect(r.w).toBeNull();
    expect(r.advice.some((item) => item.id === "gluten-free")).toBe(true);
  });
  it.each([
    { yeast: "licoli" as const, starterHydration: 100 },
    { yeast: "sourdough" as const, starterHydration: 50 },
  ])("accounts for flour and water inside natural starter %j", (patch) => {
    const r = result({ ...patch, starterPercent: 20, preferment: "none" });
    expect(r.starter.flour + r.starter.water).toBeCloseTo(r.starter.grams);
    expect(r.flourToWeigh + r.starter.flour).toBeCloseTo(r.flour);
    expect(r.waterToWeigh + r.starter.water).toBeCloseTo(r.water);
    expect(r.flour + r.water + r.salt + r.oil + r.sugar + r.malt).toBeCloseTo(
      r.total,
    );
  });
});

describe("fridge advice", () => {
  it("flags a cold phase too short to be useful", () => {
    const short = calculate(config({ coldHours: 3 }), flours);
    const long = calculate(config({ coldHours: 18 }), flours);
    const none = calculate(config({ coldHours: 0 }), flours);
    const has = (r: ReturnType<typeof calculate>) => r.ok && r.advice.some((a) => a.id === "short-cold");
    expect(has(short)).toBe(true);
    expect(has(long)).toBe(false);
    expect(has(none)).toBe(false);
  });
});

describe("short fermentation advice", () => {
  const ids = (c: Partial<DoughConfig>) => {
    const r = calculate(config(c), flours);
    return r.ok ? r.advice.map((a) => a.id) : [];
  };
  const fast = { bulkHours: 1.5, coldHours: 0, proofHours: 1 };

  it("discourages a dough with no time to mature", () => {
    const list = ids(fast);
    expect(list).toContain("too-fast");
    expect(list).not.toContain("fast-dough");
  });

  it("warns about a rushed but workable window", () => {
    const list = ids({ bulkHours: 3, coldHours: 0, proofHours: 3 });
    expect(list).toContain("fast-dough");
    expect(list).not.toContain("too-fast");
  });

  it("stays quiet on a long fermentation", () => {
    const list = ids({ bulkHours: 2, coldHours: 24, proofHours: 4 });
    expect(list).not.toContain("too-fast");
    expect(list).not.toContain("fast-dough");
  });

  it("flags a strong flour paired with a short window", () => {
    expect(ids({ ...fast, flourId: "strong" })).toContain("strong-flour-fast");
    expect(ids({ flourId: "strong" })).not.toContain("strong-flour-fast");
  });
});

describe("round pans", () => {
  it("computes the dough on the circle area", () => {
    expect(panArea({ panShape: "round", panDiameter: 28, panWidth: 30, panLength: 40 })).toBeCloseTo(Math.PI * 14 * 14, 5);
    const round = result({ styleId: "teglia", count: 1, panShape: "round", panDiameter: 28, panDensity: 0.6 });
    const rect = result({ styleId: "teglia", count: 1, panShape: "rect", panWidth: 30, panLength: 40, panDensity: 0.6 });
    expect(round.ok && rect.ok).toBe(true);
    if (!round.ok || !rect.ok) return;
    expect(round.total).toBeCloseTo(Math.PI * 14 * 14 * 0.6, 0);
    expect(rect.total).toBeCloseTo(1200 * 0.6, 0);
  });
  it("offers focaccia barese as a round-pan style", () => {
    const barese = styles.find((style) => style.id === "focaccia-barese");
    expect(barese?.pan).toBe(true);
    expect(barese?.panShape).toBe("round");
  });
});

describe("pizza ovens", () => {
  it("suggests a bake time inside the recommended window", () => {
    const c = config({ ovenType: "ariete-909", ovenTemp: 400, bakeSurface: "stone", ovenRack: "middle" });
    const minutes = recommendedBakeMinutes(c);
    const outcome = estimateBakeOutcome(c);
    expect(minutes).toBeGreaterThanOrEqual(outcome.recommendedMin - 0.25);
    expect(minutes).toBeLessThanOrEqual(outcome.recommendedMax + 0.25);
  });
  it("uses the oven preheat time and skips the rack in the plan", () => {
    const stages = buildTimeline(config({ ovenType: "effeuno-p134h", ovenTemp: 500, bakeSurface: "biscotto" }), flours);
    const preheat = stages.find((stage) => stage.id === "preheat")!;
    const bake = stages.find((stage) => stage.id === "bake")!;
    expect((new Date(bake.at).getTime() - new Date(preheat.at).getTime()) / 60000).toBe(55);
    expect(preheat.detail).not.toContain("ripiano");
  });
});

describe("baking prediction", () => {
  it("increases crust and crumb cooking as bake time grows", () => {
    const short = estimateBakeOutcome(config({ bakeMinutes: 1 }));
    const long = estimateBakeOutcome(config({ bakeMinutes: 3 }));
    expect(long.crustScore).toBeGreaterThan(short.crustScore);
    expect(long.crumbScore).toBeGreaterThan(short.crumbScore);
  });

  it("models rack height and conductive supports independently", () => {
    const low = estimateBakeOutcome(config({ ovenRack: "bottom" }));
    const high = estimateBakeOutcome(config({ ovenRack: "top" }));
    const steel = estimateBakeOutcome(config({ bakeSurface: "steel" }));
    const stone = estimateBakeOutcome(config({ bakeSurface: "stone" }));
    expect(high.crustScore).toBeGreaterThan(low.crustScore);
    expect(low.baseScore).toBeGreaterThan(high.baseScore);
    expect(steel.baseScore).toBeGreaterThan(stone.baseScore);
  });

  it("gives the crumb its own, steeper cooking curve", () => {
    const short = estimateBakeOutcome(config({ bakeMinutes: 1 }));
    const long = estimateBakeOutcome(config({ bakeMinutes: 3 }));
    expect(long.crumbScore - short.crumbScore).toBeGreaterThan(long.crustScore - short.crustScore);
  });

  it("lets the baking support and rack affect the crumb", () => {
    const stone = estimateBakeOutcome(config({ bakeSurface: "stone" }));
    const steel = estimateBakeOutcome(config({ bakeSurface: "steel" }));
    const middle = estimateBakeOutcome(config({ ovenRack: "middle" }));
    const top = estimateBakeOutcome(config({ ovenRack: "top" }));
    expect(steel.crumbScore).toBeGreaterThan(stone.crumbScore);
    expect(middle.crumbScore).toBeGreaterThan(top.crumbScore);
  });

  it("requires more energy to set a more hydrated crumb", () => {
    const normal = estimateBakeOutcome(config({ hydration: 63 }));
    const wet = estimateBakeOutcome(config({ hydration: 75 }));
    expect(wet.crumbScore).toBeLessThan(normal.crumbScore);
  });

  it("accounts for a wetter and heavier topping in crumb prediction", () => {
    const light = estimateBakeOutcome(config({ toppingLoad: 0.16, toppingMoisture: 35 }));
    const loaded = estimateBakeOutcome(config({ toppingLoad: 0.5, toppingMoisture: 85 }));
    expect(loaded.crumbScore).toBeLessThan(light.crumbScore);
    expect(loaded.warnings.some((warning) => warning.includes("condimento"))).toBe(true);
  });

  it("provides an ordered recommended bake window", () => {
    const prediction = estimateBakeOutcome(config());
    expect(prediction.recommendedMin).toBeGreaterThan(0);
    expect(prediction.recommendedMax).toBeGreaterThanOrEqual(
      prediction.recommendedMin,
    );
  });
});

describe("minimum fridge time", () => {
  const plan = (hours: number, styleId = "napoletana") =>
    deriveAutomaticSchedule({
      ...defaultConfig(),
      styleId,
      foldCount: 0,
      autolyse: false,
      preferment: "none",
      planMode: "automatic",
      startAt: "2026-10-03T08:00",
      bakeAt: new Date(new Date("2026-10-03T08:00").getTime() + hours * 3600000).toISOString(),
    });

  it("never plans a fridge phase shorter than the useful minimum", () => {
    for (let hours = 3; hours <= 40; hours += 0.25) {
      const p = plan(hours);
      if (!p.ok) continue;
      expect(p.coldHours === 0 || p.coldHours >= MIN_COLD_HOURS).toBe(true);
    }
  });

  it("keeps a short window entirely at room temperature", () => {
    const p = plan(10);
    expect(p.ok && p.coldHours).toBe(0);
  });

  it("uses the fridge once there is room for it", () => {
    const p = plan(24);
    expect(p.ok && p.coldHours).toBeGreaterThanOrEqual(MIN_COLD_HOURS);
  });
});

describe("display units in generated texts", () => {
  afterEach(() => setUnits(defaultUnits));
  const details = () => {
    const c = config({ preferment: "none", autolyse: false, ovenTemp: 250, roomTemp: 22 });
    return buildTimeline(c, flours).map((stage) => stage.detail).join("\n");
  };

  it("keeps grams and Celsius by default", () => {
    setUnits(defaultUnits);
    const text = details();
    expect(text).toContain("250 °C");
    expect(text).toMatch(/\d+ g /);
    expect(text).not.toMatch(/°F|\boz\b/);
  });

  it("writes ounces and Fahrenheit without touching the calculation", () => {
    const grams = calculate(config(), flours);
    setUnits({ weight: "oz", temp: "F" });
    const text = details();
    expect(text).toContain("482 °F");
    expect(text).toMatch(/\d+,\d+ oz/);
    expect(text).not.toContain("250 °C");
    const converted = calculate(config(), flours);
    expect(converted.ok && grams.ok && converted.flour).toBe(grams.ok && grams.flour);
  });
});
