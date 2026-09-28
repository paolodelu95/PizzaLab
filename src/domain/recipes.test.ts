import { describe, expect, it } from "vitest";
import { defaultConfig } from "./styles";
import { buildTimeline, calculate } from "./calculator";
import { canStartPlan, keepMealTimeFromNow, recipeStatus, shiftPlanToNow, startTiming } from "./recipes";
import type { Recipe } from "./types";

const now = new Date("2026-09-27T12:00:00").getTime();
const recipe = (patch: Partial<Recipe> = {}, bakeAt = "2026-09-29T20:00"): Recipe => ({
  id: "r1",
  name: "Prova",
  createdAt: "2026-09-27T10:00:00.000Z",
  config: { ...defaultConfig(), bakeAt },
  notes: "",
  rating: 0,
  completedStages: [],
  ...patch,
});

describe("recipe status", () => {
  it("keeps a plan saved until it is started", () => {
    expect(recipeStatus(recipe(), null, now)).toBe("saved");
    expect(recipeStatus(recipe(), "r1", now)).toBe("active");
  });
  it("archives finished plans even if they were active", () => {
    expect(recipeStatus(recipe({ finishedAt: "2026-09-27T11:00:00.000Z" }), "r1", now)).toBe("past");
  });
  it("keeps untouched plans with a past date resumable", () => {
    expect(recipeStatus(recipe({}, "2026-09-20T20:00"), null, now)).toBe("saved");
  });
  it("treats annotated legacy plans with a past date as past", () => {
    expect(recipeStatus(recipe({ rating: 4 }, "2026-09-20T20:00"), null, now)).toBe("past");
  });
  it("refuses to start a plan whose first phase is long gone", () => {
    expect(canStartPlan([{ id: "mix", title: "", detail: "", at: "2026-09-27T11:50:00", until: "" }], now)).toBe(true);
    expect(canStartPlan([{ id: "mix", title: "", detail: "", at: "2026-09-27T10:00:00", until: "" }], now)).toBe(false);
  });
});

describe("starting a plan", () => {
  const plan = { ...defaultConfig(), bakeAt: "2026-09-28T20:00", bulkHours: 2, coldHours: 18, proofHours: 4 };
  const start = new Date(buildTimeline(plan)[0].at).getTime();
  it("schedules future plans, starts on time and recovers late ones", () => {
    expect(startTiming(buildTimeline(plan), plan.bakeAt, start - 3 * 3600000)).toBe("future");
    expect(startTiming(buildTimeline(plan), plan.bakeAt, start + 5 * 60000)).toBe("now");
    expect(startTiming(buildTimeline(plan), plan.bakeAt, start + 2 * 3600000)).toBe("late");
    expect(startTiming(buildTimeline(plan), plan.bakeAt, new Date(plan.bakeAt).getTime() + 60000)).toBe("expired");
  });
  it("shifts the whole plan when dinner can move", () => {
    const now = start + 2 * 3600000;
    const shifted = shiftPlanToNow(plan, now);
    const newStart = new Date(buildTimeline(shifted)[0].at).getTime();
    expect(Math.abs(newStart - now)).toBeLessThanOrEqual(60000);
    expect(shifted.bulkHours + shifted.coldHours + shifted.proofHours).toBe(24);
  });
  it("keeps dinner time with a shorter rise and more yeast", () => {
    const now = start + 12 * 3600000;
    const kept = keepMealTimeFromNow(plan, now);
    expect(kept.ok).toBe(true);
    if (!kept.ok) return;
    expect(kept.config.bakeAt).toBe(plan.bakeAt);
    expect(kept.config.bulkHours + kept.config.coldHours + kept.config.proofHours).toBeLessThan(24);
    const flour = { id: plan.flourId, brand: "T", name: "00", type: "00", w: [260, 280] as [number, number], protein: 12, proteinBasis: "%", pl: null, source: "", checkedAt: "", kind: "wheat" as const, usable: true, note: "" };
    const before = calculate(plan, [flour]);
    const after = calculate(kept.config, [flour]);
    expect(before.ok && after.ok && after.yeast > before.yeast).toBe(true);
  });
  it("refuses to keep dinner when too little time is left", () => {
    const kept = keepMealTimeFromNow(plan, new Date(plan.bakeAt).getTime() - 60 * 60000);
    expect(kept.ok).toBe(false);
  });
});
