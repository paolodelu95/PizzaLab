import { describe, expect, it } from "vitest";
import { calculate } from "./calculator";
import { flourForStyle } from "./flourAdvice";
import { applyAutomaticPlan, applyStyleDefaults } from "./recipes";
import { defaultConfig, styles } from "./styles";
import { catalog } from "../data/catalog";
import { ovenProfiles } from "../data/ovens";

describe("style defaults", () => {
  it("start every style without warnings, in every oven and planning mode", () => {
    const problems: string[] = [];
    for (const oven of ovenProfiles.filter((o) => o.id !== "custom")) {
      for (const style of styles) {
        for (const planMode of ["date", "automatic"] as const) {
          let c = applyStyleDefaults({ ...defaultConfig(), ovenType: oven.id, planMode }, style.id);
          const better = flourForStyle(c, catalog);
          if (better) c = { ...c, flourId: better.id };
          if (planMode === "automatic") c = applyAutomaticPlan(c);
          const r = calculate(c, catalog);
          const issues = r.ok ? r.advice.filter((a) => a.level !== "info").map((a) => a.id) : r.errors;
          // Un forno di casa non arriva ai 380 °C della napoletana: l’avviso è un’informazione vera, non un valore sbagliato.
          const real = issues.filter((id) => !(id === "oven" && oven.maxTemp < 380));
          if (real.length) problems.push(`${oven.id} · ${style.id} · ${planMode}: ${real.join(", ")}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});
