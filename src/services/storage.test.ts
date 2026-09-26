import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultConfig } from "../domain/styles";

const preferences = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }));
vi.mock("@capacitor/preferences", () => ({ Preferences: preferences }));

import { readState, writeState } from "./storage";

describe("storage migrations", () => {
  beforeEach(() => {
    preferences.get.mockReset();
    preferences.set.mockReset().mockResolvedValue(undefined);
  });

  it("keeps the current draft, saved recipes and active plan across an app update", async () => {
    const current = defaultConfig();
    const {
      bakeMinutes: _a,
      ovenRack: _b,
      bakeSurface: _c,
      foldCount: _e,
      foldIntervalMinutes: _f,
      ...legacyConfig
    } = current;
    const legacyState = {
      version: 1,
      config: { ...legacyConfig, hydration: 70 },
      recipes: [
        {
          id: "pizza-attiva",
          name: "Sabato sera",
          createdAt: "2026-09-20T10:00:00.000Z",
          config: { ...legacyConfig, hydration: 68 },
          notes: "Non perdere questa nota",
          rating: 4,
          completedStages: ["mix"],
          temperatureReadings: [],
          favorite: true,
        },
      ],
      activeId: "pizza-attiva",
      customFlours: [],
      savedBlends: [],
      equipmentProfiles: [],
    };
    preferences.get.mockResolvedValue({ value: JSON.stringify(legacyState) });

    const migrated = await readState();

    expect(migrated.config.hydration).toBe(70);
    expect(migrated.config.bakeMinutes).toBe(current.bakeMinutes);
    expect(migrated.config.foldCount).toBe(0);
    expect(migrated.config.foldIntervalMinutes).toBe(30);
    expect(migrated.recipes).toHaveLength(1);
    expect(migrated.recipes[0]).toMatchObject({
      id: "pizza-attiva",
      name: "Sabato sera",
      notes: "Non perdere questa nota",
      favorite: true,
    });
    expect(migrated.recipes[0].config.hydration).toBe(68);
    expect(migrated.recipes[0].config.ovenRack).toBe(current.ovenRack);
    expect(migrated.recipes[0].config.bakeSurface).toBe(current.bakeSurface);
    expect(migrated.activeId).toBe("pizza-attiva");

    await writeState(migrated);
    expect(preferences.set).toHaveBeenCalledWith(
      expect.objectContaining({ key: "pizzalab-state-v1" }),
    );
    const persisted = JSON.parse(preferences.set.mock.calls[0][0].value);
    expect(persisted.recipes[0].name).toBe("Sabato sera");
    expect(persisted.activeId).toBe("pizza-attiva");
  });
});
