import { describe, expect, it } from "vitest";
import { defaultConfig } from "./styles";
import { canStartPlan, recipeStatus } from "./recipes";
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
