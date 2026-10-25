import { describe, expect, it } from "vitest";
import { decodeRecipe, encodeRecipe, SHARE_BASE } from "./shareLink";
import { defaultConfig } from "./styles";

const flours = ["caputo-pizzeria", "caputo-nuvola"];
const hashOf = (link: string) => link.slice(SHARE_BASE.length);

describe("share link", () => {
  it("round-trips the recipe without dates or personal equipment", () => {
    const config = { ...defaultConfig(), hydration: 70, count: 7, coldHours: 24, mixerProfileId: "my-kitchenaid", bakeAt: "2030-01-01T20:00" };
    const link = encodeRecipe("Sabato «da Gino»", config);
    expect(link.startsWith(SHARE_BASE)).toBe(true);
    const back = decodeRecipe(hashOf(link), flours)!;
    expect(back.name).toBe("Sabato «da Gino»");
    expect(back.config.hydration).toBe(70);
    expect(back.config.count).toBe(7);
    expect(back.config.coldHours).toBe(24);
    expect(back.config.mixerProfileId).toBe(defaultConfig().mixerProfileId);
    expect(back.config.bakeAt).not.toBe("2030-01-01T20:00");
  });

  it("keeps the link short when little changes", () => {
    expect(encodeRecipe("Pizza", defaultConfig()).length).toBeLessThan(120);
  });

  it("replaces flours the receiver does not have", () => {
    const config = { ...defaultConfig(), flourId: "custom-123", secondFlourId: "custom-456", secondFlourPercent: 30 };
    const back = decodeRecipe(hashOf(encodeRecipe("Mia", config)), flours)!;
    expect(back.config.flourId).toBe("caputo-pizzeria");
    expect(back.config.secondFlourId).toBe("");
    expect(back.config.secondFlourPercent).toBe(0);
  });

  it("rejects broken or hostile links", () => {
    expect(decodeRecipe("#ricetta=@@@", flours)).toBeNull();
    expect(decodeRecipe("#altro", flours)).toBeNull();
    const bad = btoa(JSON.stringify({ n: "x", c: { hydration: -5 } }));
    expect(decodeRecipe(`#ricetta=${bad}`, flours)).toBeNull();
    const wrongType = btoa(JSON.stringify({ n: "x", c: { hydration: "70", __proto__: { a: 1 } } }));
    expect(decodeRecipe(`#ricetta=${wrongType}`, flours)?.config.hydration).toBe(defaultConfig().hydration);
  });
});
