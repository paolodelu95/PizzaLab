import { describe, expect, it } from "vitest";
import { catalog } from "../data/catalog";
import { calculate } from "./calculator";
import { fitsNeeds, recommendFlours, strengthNeeds } from "./flourAdvice";
import { flourStrength } from "./flourStrength";
import { configFromTemplate, countForPeople, ratedHistory, suggestStart } from "./recipes";
import { defaultConfig } from "./styles";
import type { DoughConfig, Recipe } from "./types";

const config = (patch: Partial<DoughConfig> = {}): DoughConfig => ({ ...defaultConfig(), bakeAt: "2026-11-14T20:00", ...patch });

describe("recommended flours", () => {
  it("needs more strength as fermentation gets longer or the dough wetter", () => {
    const short = strengthNeeds(config({ bulkHours: 2, coldHours: 0, proofHours: 3, hydration: 60 }));
    const long = strengthNeeds(config({ bulkHours: 2, coldHours: 60, proofHours: 4, hydration: 60 }));
    const wet = strengthNeeds(config({ bulkHours: 2, coldHours: 0, proofHours: 3, hydration: 75 }));
    expect(long.min).toBeGreaterThan(short.min);
    expect(wet.min).toBeGreaterThanOrEqual(260);
    expect(short.max).toBe(279);
    expect(long.max).toBe(Infinity);
  });

  it("only suggests flours that pass the same checks as the advice, declared W first", () => {
    const c = config({ bulkHours: 2, coldHours: 48, proofHours: 4 });
    const { needs, suggestions } = recommendFlours(c, catalog);
    expect(suggestions.length).toBeGreaterThan(0);
    for (const { flour, strength } of suggestions) {
      expect(fitsNeeds(strength, needs), flour.id).toBe(true);
      expect(flour.usable && flour.kind === "wheat" && !flour.glutenFree).toBe(true);
    }
    const firstEstimated = suggestions.findIndex((item) => item.strength.estimated);
    if (firstEstimated >= 0) expect(suggestions.slice(firstEstimated).every((item) => item.strength.estimated)).toBe(true);
    expect(new Set(suggestions.map((item) => item.flour.brand)).size).toBeGreaterThan(1);
  });

  it("never suggests a flour the calculator would warn about for those times", () => {
    const c = config({ bulkHours: 2, coldHours: 48, proofHours: 4 });
    for (const { flour } of recommendFlours(c, catalog).suggestions) {
      const r = calculate({ ...c, flourId: flour.id }, catalog);
      expect(r.ok, flour.id).toBe(true);
      if (r.ok) expect(r.advice.map((a) => a.id), flour.id).not.toContain("long-weak");
    }
  });

  it("caps the strength for a quick dough and says when the current flour is already fine", () => {
    const quick = config({ bulkHours: 2, coldHours: 0, proofHours: 3 });
    const { needs, suggestions } = recommendFlours(quick, catalog);
    expect(needs.max).toBe(279);
    expect(suggestions.every((item) => item.strength.high <= 279)).toBe(true);
    const strong = catalog.find((flour) => flourStrength(flour)?.low && flourStrength(flour)!.low >= 340 && !flourStrength(flour)!.estimated)!;
    expect(recommendFlours(config({ flourId: strong.id, bulkHours: 2, coldHours: 60, proofHours: 4 }), catalog).current).toBe(true);
  });
});

describe("one-tap hydration fix", () => {
  it("proposes an achievable hydration for a weak flour and for a value outside the style range", () => {
    const weak = catalog.find((flour) => flour.id === "generic-tipo-00")!;
    const r = calculate(config({ flourId: weak.id, hydration: 78, styleId: "napoletana" }), catalog);
    if (!r.ok) throw new Error(r.errors.join());
    const advice = r.advice.filter((a) => a.fix);
    expect(advice.length).toBeGreaterThan(0);
    for (const a of advice) expect(a.fix!.hydration).toBeLessThan(78);
    const applied = calculate(config({ flourId: weak.id, hydration: advice.find((a) => a.id === "weak-wet")!.fix!.hydration }), catalog);
    if (applied.ok) expect(applied.advice.map((a) => a.id)).not.toContain("weak-wet");
  });
});

describe("when to start", () => {
  const at = (iso: string) => new Date(iso).getTime();

  it("starts a comfortable number of hours earlier, never at night", () => {
    const s = suggestStart(config({ styleId: "napoletana", bakeAt: "2026-11-14T20:00" }), at("2026-11-01T10:00"))!;
    expect(s.shortened).toBe(false);
    const hour = new Date(s.startAt).getHours();
    expect(hour >= 7 && hour <= 22).toBe(true);
    expect(new Date(s.startAt).getTime()).toBeLessThan(at("2026-11-14T20:00"));
  });

  it("moves a night-time start back to the evening before", () => {
    const s = suggestStart(config({ styleId: "napoletana", bakeAt: "2026-11-14T03:00" }), at("2026-11-01T10:00"))!;
    expect(new Date(s.startAt).getHours()).toBe(22);
  });

  it("starts now, and says so, when the ideal time has passed but a decent fermentation still fits", () => {
    const s = suggestStart(config({ bakeAt: "2026-11-14T20:00" }), at("2026-11-14T09:00"))!;
    expect(s.shortened).toBe(true);
    expect(s.movedMeal).toBe(false);
    expect(s.bakeAt).toBe("2026-11-14T20:00");
    expect(new Date(s.startAt).getTime()).toBeGreaterThanOrEqual(at("2026-11-14T09:00"));
    expect(s.hours).toBeGreaterThanOrEqual(8);
  });

  it("moves the meal later instead of proposing a fermentation that is too short", () => {
    const s = suggestStart(config({ bakeAt: "2026-11-14T20:00" }), at("2026-11-14T15:00"))!;
    expect(s.movedMeal).toBe(true);
    expect(s.shortened).toBe(false);
    expect(new Date(s.bakeAt).getHours()).toBe(20);
    expect(new Date(s.bakeAt).getTime()).toBeGreaterThan(at("2026-11-14T20:00"));
    expect(new Date(s.startAt).getTime()).toBeGreaterThanOrEqual(at("2026-11-14T15:00"));
    expect(s.hours).toBeGreaterThanOrEqual(8);
  });

  it("does not squeeze a style into five hours: under eight hours the dough does not mature", () => {
    const s = suggestStart(config({ styleId: "focaccia-barese", bakeAt: "2026-11-14T20:00" }), at("2026-11-14T15:00"))!;
    expect(s.movedMeal).toBe(true);
  });
});

describe("people, history and templates", () => {
  it("converts people to dough balls or pans", () => {
    expect(countForPeople(4, false)).toBe(4);
    expect(countForPeople(6, true)).toBe(2);
    expect(countForPeople(1, true)).toBe(1);
  });

  it("averages only rated pizzas made with the same flour and, separately, the same oven", () => {
    const recipe = (id: string, flourId: string, ovenType: string, rating: number) =>
      ({ id, name: id, createdAt: "", config: config({ flourId, ovenType }), notes: "", rating, completedStages: [] }) as Recipe;
    const list = [recipe("a", "f1", "o1", 5), recipe("b", "f1", "o2", 3), recipe("c", "f2", "o1", 1), recipe("d", "f1", "o1", 0)];
    const h = ratedHistory(list, config({ flourId: "f1", ovenType: "o1" }));
    expect(h.flour).toEqual({ count: 2, average: 4 });
    expect(h.flourAndOven).toEqual({ count: 1, average: 5 });
    expect(ratedHistory([], config()).flour.count).toBe(0);
  });

  it("brings a template back with its choices but today’s dates", () => {
    const fresh = config({ startAt: "2026-12-01T10:00", bakeAt: "2026-12-02T20:00" });
    const saved = config({ styleId: "romana", hydration: 72, startAt: "2026-01-01T10:00", bakeAt: "2026-01-02T20:00" });
    const restored = configFromTemplate({ id: "t", name: "Romana", createdAt: "", config: saved }, fresh);
    expect(restored.styleId).toBe("romana");
    expect(restored.hydration).toBe(72);
    expect(restored.startAt).toBe(fresh.startAt);
    expect(restored.bakeAt).toBe(fresh.bakeAt);
  });
});
