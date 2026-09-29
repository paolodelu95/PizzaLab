// Calcola il «W stimato» per le farine che non dichiarano il W.
// Uso: node scripts/estimate-w.mjs   → scrive src/data/wEstimates.json (poi `node scripts/validate-catalog.mjs`).
//
// Metodo per le farine con proteine dichiarate: regressione W ≈ a + b · proteine sui W dichiarati dai produttori
// nel catalogo (solo grano tenero, proteine su prodotto tal quale). L’intervallo è largo di proposito:
// da −3 a +2 scarti tipici (+4 se le proteine sono ≥ 13%, dove i dati sono pochi e i grani duri salgono di più).
// Per le farine generiche si usano i W dichiarati dai produttori per lo stesso tipo (percentili 10–90, oppure
// minimo e massimo allargati di 30 se i dati sono pochi).
import { readFile, writeFile } from "node:fs/promises";

const CHECKED_AT = "2026-09-29";
const DECLARED_BASES = ["Percentuale dichiarata dal produttore", "g per 100 g di prodotto"];
const flours = JSON.parse(await readFile("src/data/flours.json", "utf8"));
const international = JSON.parse(await readFile("src/data/internationalFlours.json", "utf8"));
const all = [...flours, ...international];

const round5 = (n) => Math.round(n / 5) * 5;
const clamp = (n) => Math.max(50, Math.min(500, n));
const mid = (w) => (w[0] + w[1]) / 2;
const italian = (n, d = 1) => n.toLocaleString("it-IT", { maximumFractionDigits: d });

// ---- Regressione sui W dichiarati (farine italiane: le internazionali servono da verifica) ----
const training = flours.filter((f) => f.usable && f.kind === "wheat" && f.w && f.protein != null && DECLARED_BASES.includes(f.proteinBasis));
const pts = training.map((f) => [f.protein, mid(f.w)]);
const n = pts.length;
const mx = pts.reduce((s, p) => s + p[0], 0) / n;
const my = pts.reduce((s, p) => s + p[1], 0) / n;
let sxy = 0, sxx = 0, syy = 0;
for (const [p, w] of pts) { sxy += (p - mx) * (w - my); sxx += (p - mx) ** 2; syy += (w - my) ** 2; }
const b = sxy / sxx;
const a = my - b * mx;
const r2 = (sxy * sxy) / (sxx * syy);
const sd = Math.sqrt(pts.reduce((s, [p, w]) => s + (w - (a + b * p)) ** 2, 0) / (n - 2));
const predict = (p) => a + b * p;

console.log(`Regressione su ${n} farine: W ≈ ${b.toFixed(2)}·proteine ${a < 0 ? "−" : "+"} ${Math.abs(a).toFixed(1)}  (r² ${r2.toFixed(2)}, scarto ${sd.toFixed(1)})`);
for (const f of international.filter((x) => x.w)) {
  const p = predict(f.protein);
  console.log(`  verifica ${f.id}: dichiarato ${mid(f.w)}, previsto ${Math.round(p)} (${mid(f.w) - Math.round(p) >= 0 ? "+" : ""}${mid(f.w) - Math.round(p)})`);
}

const regressionMethod = `Regressione W ≈ ${italian(b)}·proteine − ${italian(Math.abs(a), 0)} sui W dichiarati da ${n} farine di produttori nel catalogo (r² ${italian(r2, 2)}, scarto tipico ${italian(sd, 0)}). Intervallo da −3 a +2 scarti (fino a +4 se le proteine sono almeno 13%).`;
const estimates = {};

for (const f of all) {
  if (f.w || f.protein == null || !f.usable || f.kind !== "wheat" || f.type === "Integrale" || !DECLARED_BASES.includes(f.proteinBasis)) continue;
  const value = predict(f.protein);
  const high = value + (f.protein >= 13 ? 4 : 2) * sd;
  const low = value - 3 * sd;
  estimates[f.id] = {
    value: round5(clamp(value)),
    min: round5(clamp(low)),
    max: round5(clamp(high)),
    method: regressionMethod,
    confidence: f.protein >= 10 && f.protein < 13 ? "media" : "bassa",
    checkedAt: CHECKED_AT,
  };
}

// ---- Farine generiche: W dichiarati dai produttori per lo stesso tipo ----
const declared = flours.filter((f) => f.usable && f.kind === "wheat" && f.w);
const percentile = (values, p) => {
  const sorted = [...values].sort((x, y) => x - y);
  return sorted[Math.min(sorted.length - 1, Math.round(p * (sorted.length - 1)))];
};
const generic = {
  "generic-tipo-00": { label: "00", match: (f) => f.type === "00" },
  "generic-tipo-0": { label: "0", match: (f) => f.type === "0" },
  "generic-tipo-1": { label: "1", match: (f) => f.type === "1" },
  "generic-integrale": { label: "integrali", match: (f) => f.type === "Integrale" },
  "generic-manitoba": { label: "Manitoba", match: (f) => /manitoba/i.test(f.name) || f.type === "Manitoba" },
};
for (const [id, { label, match }] of Object.entries(generic)) {
  const values = declared.filter(match).map((f) => mid(f.w));
  if (values.length < 3) continue;
  const wide = values.length >= 8;
  const min = wide ? percentile(values, 0.1) : Math.min(...values) - 30;
  const max = wide ? percentile(values, 0.9) : Math.max(...values) + 30;
  estimates[id] = {
    value: round5(percentile(values, 0.5)),
    min: round5(clamp(min)),
    max: round5(clamp(max)),
    method: wide
      ? `Percentili 10–90 dei W dichiarati da ${values.length} farine di tipo ${label} nelle schede dei produttori del catalogo.`
      : `Minimo e massimo (allargati di 30) dei W dichiarati da ${values.length} farine di tipo ${label} nelle schede dei produttori del catalogo: dati pochi, stima da prendere con cautela.`,
    confidence: wide ? "media" : "bassa",
    checkedAt: CHECKED_AT,
  };
}

const sorted = Object.fromEntries(Object.entries(estimates).sort(([x], [y]) => x.localeCompare(y)));
await writeFile("src/data/wEstimates.json", JSON.stringify(sorted, null, 2) + "\n");
console.log(`${Object.keys(sorted).length} stime scritte in src/data/wEstimates.json`);
for (const [id, e] of Object.entries(sorted)) console.log(`  ${id}: ${e.min}–${e.max} (centro ${e.value}, confidenza ${e.confidence})`);
