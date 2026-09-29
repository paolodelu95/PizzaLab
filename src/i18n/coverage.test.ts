import { describe, expect, it } from "vitest";
import { en } from "./en";
import { collectDataStrings, collectSourceStrings, placeholders } from "./collect";

describe("english translations", () => {
  const source = collectSourceStrings();
  const data = collectDataStrings();
  const needed = new Set([...source.keys(), ...data]);

  it("cover every text marked with t(), tn() or msg() and every text from the data", () => {
    const missing = [...needed].filter((key) => !(key in en));
    expect(missing).toEqual([]);
  });

  it("have no leftover entries whose Italian text no longer exists", () => {
    const orphans = Object.keys(en).filter((key) => !needed.has(key));
    expect(orphans).toEqual([]);
  });

  it("keep the same {placeholders} as the Italian text", () => {
    const wrong = Object.entries(en).filter(([key, value]) => placeholders(key).join() !== placeholders(value).join());
    expect(wrong.map(([key]) => key)).toEqual([]);
  });

  it("are never empty or identical to the Italian text by accident", () => {
    expect(Object.entries(en).filter(([, value]) => !value.trim()).map(([key]) => key)).toEqual([]);
  });
});
