import { describe, expect, it, vi } from "vitest";
import {
  addStarterFeeding,
  createStarterProfile,
  starterFeedAmounts,
  starterIntervalHours,
  starterReminderDates,
} from "./sourdough";
import type { StarterFeeding } from "./types";

const at = new Date("2026-10-01T08:00:00");
const feeding = (index: number, rise = 2.2): StarterFeeding => ({
  id: String(index),
  at: new Date(at.getTime() + index * 12 * 3600000).toISOString(),
  starterGrams: 30,
  flourGrams: 30,
  waterGrams: 30,
  temperature: 24,
  rise,
  peakHours: 6,
  notes: "",
});

describe("sourdough care", () => {
  it("calculates liquid and solid refreshes by weight", () => {
    const liquid = createStarterProfile("licoli", false, at);
    const solid = createStarterProfile("solid", false, at);
    expect(starterFeedAmounts(liquid)).toEqual({ starter: 30, flour: 30, water: 30, total: 90 });
    expect(starterFeedAmounts(solid)).toEqual({ starter: 30, flour: 30, water: 15, total: 75 });
  });

  it("requires three consecutive effective feeds before maturity", () => {
    let profile = createStarterProfile("licoli", true, at);
    profile = addStarterFeeding(profile, feeding(1));
    profile = addStarterFeeding(profile, feeding(2));
    expect(profile.phase).toBe("strengthening");
    profile = addStarterFeeding(profile, feeding(3));
    expect(profile.phase).toBe("mature");
    expect(profile.readyStreak).toBe(3);
  });

  it("resets the effective streak after a weak feed", () => {
    let profile = createStarterProfile("solid", true, at);
    profile = addStarterFeeding(profile, feeding(1));
    profile = addStarterFeeding(profile, feeding(2, 1.4));
    expect(profile.readyStreak).toBe(0);
  });

  it("extends mature refrigerated maintenance to weekly", () => {
    const profile = { ...createStarterProfile("licoli", true, at), phase: "mature" as const, storage: "fridge" as const };
    expect(starterIntervalHours(profile, at)).toBe(168);
  });

  it("creates future reminder dates without touching pizza reminders", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-30T10:00:00"));
    const profile = createStarterProfile("licoli", true, at);
    const dates = starterReminderDates(profile, 4);
    expect(dates).toHaveLength(4);
    expect(dates.every((date) => date.getTime() > Date.now())).toBe(true);
    vi.useRealTimers();
  });
});
