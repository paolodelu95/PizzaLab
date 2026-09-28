import { describe, expect, it } from "vitest";
import { durationLabel } from "./duration";

describe("durationLabel", () => {
  it("sotto l’ora mostra solo i minuti", () => {
    expect(durationLabel(0.5)).toBe("30 min");
    expect(durationLabel(0.75)).toBe("45 min");
  });

  it("evita le frazioni di ora nei tempi brevi", () => {
    expect(durationLabel(1.33)).toBe("1 h 20 min");
    expect(durationLabel(2.25)).toBe("2 h 15 min");
  });

  it("omette i minuti quando l’ora è piena", () => {
    expect(durationLabel(1)).toBe("1 h");
    expect(durationLabel(3)).toBe("3 h");
  });

  it("sopra le sei ore restano le ore", () => {
    expect(durationLabel(24)).toBe("24 h");
    expect(durationLabel(28.5)).toBe("28,5 h");
  });

  it("regge valori vuoti o non validi", () => {
    expect(durationLabel(0)).toBe("0 min");
    expect(durationLabel(Number.NaN)).toBe("0 min");
  });
});
