import { describe, expect, it } from "vitest";
import { catalog } from "./catalog";
import { flourStrength, strengthText } from "../domain/flourStrength";

describe("catalog W estimates", () => {
  const estimated = catalog.filter((flour) => flour.wEstimate);

  it("exist only for flours that do not declare W, with an ordered range and a method", () => {
    expect(estimated.length).toBeGreaterThan(10);
    for (const flour of estimated) {
      const e = flour.wEstimate!;
      expect(flour.w, flour.id).toBeNull();
      expect(50 <= e.min && e.min <= e.value && e.value <= e.max && e.max <= 500, flour.id).toBe(true);
      expect(e.method.length, flour.id).toBeGreaterThan(20);
      expect(["media", "bassa"]).toContain(e.confidence);
    }
  });

  it("cover the generic flours that have enough manufacturer data, and leave the others without W", () => {
    const byId = (id: string) => catalog.find((flour) => flour.id === id)!;
    for (const id of ["generic-tipo-00", "generic-tipo-0", "generic-tipo-1", "generic-manitoba", "generic-integrale"]) expect(byId(id).wEstimate, id).toBeDefined();
    for (const id of ["generic-semola-rimacinata", "generic-farro", "generic-riso", "generic-tipo-2"]) expect(byId(id).wEstimate, id).toBeUndefined();
    // Una farina generica di tipo 00 è più debole di una Manitoba.
    expect(byId("generic-tipo-00").wEstimate!.value).toBeLessThan(byId("generic-manitoba").wEstimate!.value);
  });

  it("include the verified international flours with a source and a checked date", () => {
    const foreign = catalog.filter((flour) => ["King Arthur", "Shipton Mill", "Marriage’s", "Bob’s Red Mill"].includes(flour.brand));
    expect(foreign.length).toBeGreaterThanOrEqual(12);
    for (const flour of foreign) {
      expect(flour.source, flour.id).toMatch(/^https:\/\//);
      expect(flour.checkedAt, flour.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    const kingArthur = catalog.find((flour) => flour.id === "king-arthur-bread-flour")!;
    expect(kingArthur.protein).toBe(12.7);
    expect(kingArthur.wEstimate!.value).toBeGreaterThan(250);
  });

  it("show a declared W as is and an estimate as a range", () => {
    const shipton = catalog.find((flour) => flour.id === "shipton-mill-italian-00")!;
    expect(strengthText(shipton)).toEqual({ text: "340", estimated: false });
    expect(flourStrength(shipton)!.estimated).toBe(false);
    const kingArthur = catalog.find((flour) => flour.id === "king-arthur-bread-flour")!;
    expect(strengthText(kingArthur)!.estimated).toBe(true);
    expect(strengthText(kingArthur)!.text).toMatch(/^\d+–\d+$/);
  });
});
