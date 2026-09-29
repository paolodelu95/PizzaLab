import { afterEach, describe, expect, it } from "vitest";
import {
  celsiusToFahrenheit,
  defaultUnits,
  fahrenheitToCelsius,
  formatTemp,
  formatTempRange,
  formatWeight,
  gramsToOunces,
  localizeTemperatures,
  normalizeUnits,
  ouncesToGrams,
  scaleField,
  setUnits,
  type Units,
} from "./units";

const imperial: Units = { weight: "oz", temp: "F" };

describe("conversions", () => {
  it("uses the exact ounce and Fahrenheit definitions", () => {
    expect(ouncesToGrams(1)).toBeCloseTo(28.349523125, 9);
    expect(gramsToOunces(28.349523125)).toBeCloseTo(1, 9);
    expect(celsiusToFahrenheit(0)).toBe(32);
    expect(celsiusToFahrenheit(100)).toBe(212);
    expect(celsiusToFahrenheit(-40)).toBe(-40);
    expect(fahrenheitToCelsius(212)).toBe(100);
  });

  it("round-trips without drift", () => {
    for (const grams of [0.35, 5, 250, 1234.5]) expect(ouncesToGrams(gramsToOunces(grams))).toBeCloseTo(grams, 9);
    for (const celsius of [-10, 4, 22.5, 250, 500]) expect(fahrenheitToCelsius(celsiusToFahrenheit(celsius))).toBeCloseTo(celsius, 9);
  });
});

describe("formatting", () => {
  it("keeps grams and Celsius identical to the previous output", () => {
    expect(formatWeight(500, 0, defaultUnits)).toBe("500 g");
    expect(formatWeight(2.44, 2, defaultUnits)).toBe("2,44 g");
    expect(formatTemp(250, 0, defaultUnits)).toBe("250 °C");
    expect(formatTempRange(24, 26, defaultUnits)).toBe("24–26 °C");
  });

  it("shows ounces with two decimals under 10 oz and one above", () => {
    expect(formatWeight(250, 0, imperial)).toBe("8,82 oz");
    expect(formatWeight(1000, 0, imperial)).toBe("35,3 oz");
  });

  it("leaves tiny amounts in grams when ounces would be unreadable", () => {
    expect(formatWeight(0.35, 2, imperial)).toBe("0,35 g");
    expect(formatWeight(4.9, 1, imperial)).toBe("4,9 g");
    expect(formatWeight(5, 0, imperial)).toBe("0,18 oz");
    expect(formatWeight(0, 0, imperial)).toBe("0 g");
  });

  it("converts temperatures and ranges", () => {
    expect(formatTemp(250, 0, imperial)).toBe("482 °F");
    expect(formatTemp(22.5, 1, imperial)).toBe("72,5 °F");
    expect(formatTempRange(24, 26, imperial)).toBe("75–79 °F");
  });

  it("rewrites temperatures inside fixed texts only for Fahrenheit", () => {
    const text = "Sopra i 25–26 °C il lievito corre, fino a circa 500 °C, 22,5 °C.";
    expect(localizeTemperatures(text, defaultUnits)).toBe(text);
    expect(localizeTemperatures(text, imperial)).toBe("Sopra i 77–79 °F il lievito corre, fino a circa 932 °F, 72,5 °F.");
  });
});

describe("normalizeUnits", () => {
  it("falls back to grams and Celsius for missing or invalid data", () => {
    expect(normalizeUnits(undefined)).toEqual(defaultUnits);
    expect(normalizeUnits(null)).toEqual(defaultUnits);
    expect(normalizeUnits("oz")).toEqual(defaultUnits);
    expect(normalizeUnits({ weight: "lb", temp: "K" })).toEqual(defaultUnits);
    expect(normalizeUnits({ weight: "oz" })).toEqual({ weight: "oz", temp: "C" });
    expect(normalizeUnits({ weight: "oz", temp: "F" })).toEqual(imperial);
  });
});

describe("scaleField", () => {
  afterEach(() => setUnits(defaultUnits));

  it("does not touch grams and Celsius", () => {
    const scale = scaleField("weight", { min: 10, max: 300, step: 5 }, defaultUnits);
    expect(scale.identity).toBe(true);
    expect([scale.min, scale.max, scale.step, scale.unit]).toEqual([10, 300, 5, "g"]);
    expect(scale.fromDisplay(123.45)).toBe(123.45);
    expect(scaleField("temp", { min: 10, max: 35, step: 0.5 }, defaultUnits).unit).toBe("°C");
  });

  it("converts range, step and unit for ounces", () => {
    const scale = scaleField("weight", { min: 180, max: 600, step: 5 }, imperial);
    expect(scale.unit).toBe("oz");
    expect(scale.min).toBeCloseTo(6.35, 2);
    expect(scale.max).toBeCloseTo(21.16, 2);
    expect(scale.step).toBe(0.25);
  });

  it("converts range, step and unit for Fahrenheit and reaches the oven maximum", () => {
    const scale = scaleField("temp", { min: 180, max: 500, step: 5 }, imperial);
    expect(scale.unit).toBe("°F");
    expect(scale.min).toBe(356);
    expect(scale.max).toBe(932);
    expect(scale.step).toBe(10);
    expect(scaleField("temp", { min: 10, max: 35, step: 0.5 }, imperial).step).toBe(1);
  });

  it("returns to the same typed number after converting to the domain and back", () => {
    for (const [quantity, typed] of [["weight", 9], ["weight", 12.5], ["weight", 0.37], ["temp", 77], ["temp", 78.5], ["temp", 451]] as const) {
      const scale = scaleField(quantity, { min: 0, max: 1000, step: 1 }, imperial);
      const domain = scale.fromDisplay(typed);
      expect(scale.matches(String(typed), domain)).toBe(true);
      expect(scale.format(domain)).toBe(String(typed));
    }
  });

  it("never rewrites a half-typed number", () => {
    const scale = scaleField("temp", { min: 10, max: 35, step: 0.5 }, imperial);
    // 75,55 °F → 24,19 °C: mostrato con il passo del campo sarebbe «76», ma il testo digitato è già corretto.
    expect(scale.matches("75.55", scale.fromDisplay(75.55))).toBe(true);
    expect(scale.matches("", 24)).toBe(false);
  });

  it("stores a clean domain value with at most two decimals", () => {
    const scale = scaleField("weight", { min: 10, max: 300, step: 5 }, imperial);
    expect(scale.fromDisplay(9)).toBe(255.15);
    expect(scale.fromDisplay(3.3333)).toBe(94.5);
  });
});
