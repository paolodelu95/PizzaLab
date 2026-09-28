import { describe, expect, it } from "vitest";
import { buildCalendar, stagesToEvents } from "./calendar";

describe("calendar export", () => {
  const stages = [
    { id: "mix", title: "Impasta", detail: "Acqua, farina; sale", at: "2026-10-01T10:00:00.000Z", until: "2026-10-01T10:20:00.000Z" },
    { id: "old", title: "Passata", detail: "", at: "2026-09-01T10:00:00.000Z", until: "2026-09-01T10:20:00.000Z" },
  ];
  it("creates one event with an alarm for each upcoming phase", () => {
    const events = stagesToEvents("r1", "Sabato", stages, new Date("2026-09-30T00:00:00.000Z").getTime());
    expect(events).toHaveLength(1);
    const ics = buildCalendar("Sabato", events, 10);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("DTSTART:20261001T100000Z");
    expect(ics).toContain("TRIGGER:-PT10M");
    expect(ics).toContain("UID:r1-mix@pizzalab");
    expect(ics).toContain("Acqua\\, farina\; sale");
    expect(ics.split("\r\n").every((line) => line.length <= 75)).toBe(true);
  });
});
