import type { Flour } from "../domain/types";

const note =
  "Senza glutine. Il W non si applica: assorbimento, riposo e addensanti cambiano molto tra le miscele. Parti dalle dosi del produttore e verifica sempre etichetta e contaminazioni.";

export const glutenFreeFlours: Flour[] = [
  { id: "gf-generic-pizza-mix", brand: "Senza glutine", name: "Mix universale per pizza", type: "Miscela", w: null, protein: null, proteinBasis: "Variabile secondo la miscela", pl: null, source: "", checkedAt: "2026-09-26", kind: "blend", glutenFree: true, usable: true, note },
  { id: "gf-rice-flour", brand: "Senza glutine", name: "Farina di riso", type: "Riso", w: null, protein: null, proteinBasis: "Variabile secondo il prodotto", pl: null, source: "", checkedAt: "2026-09-26", kind: "other", glutenFree: true, usable: false, note: `${note} Farina singola: usala all’interno di una ricetta o miscela senza glutine bilanciata.` },
  { id: "gf-corn-flour", brand: "Senza glutine", name: "Farina di mais fine", type: "Mais", w: null, protein: null, proteinBasis: "Variabile secondo il prodotto", pl: null, source: "", checkedAt: "2026-09-26", kind: "other", glutenFree: true, usable: false, note: `${note} Farina singola: non sostituisce da sola una miscela per pizza.` },
  { id: "gf-buckwheat-flour", brand: "Senza glutine", name: "Farina di grano saraceno", type: "Grano saraceno", w: null, protein: null, proteinBasis: "Variabile secondo il prodotto", pl: null, source: "", checkedAt: "2026-09-26", kind: "other", glutenFree: true, usable: false, note: `${note} Farina singola dal sapore marcato, da bilanciare in miscela.` },
  { id: "gf-sorghum-flour", brand: "Senza glutine", name: "Farina di sorgo", type: "Sorgo", w: null, protein: null, proteinBasis: "Variabile secondo il prodotto", pl: null, source: "", checkedAt: "2026-09-26", kind: "other", glutenFree: true, usable: false, note: `${note} Farina singola: abbinala ad amidi e leganti in una formula dedicata.` },
  { id: "gf-millet-flour", brand: "Senza glutine", name: "Farina di miglio", type: "Miglio", w: null, protein: null, proteinBasis: "Variabile secondo il prodotto", pl: null, source: "", checkedAt: "2026-09-26", kind: "other", glutenFree: true, usable: false, note: `${note} Farina singola: abbinala a una miscela strutturata.` },
  { id: "gf-chickpea-flour", brand: "Senza glutine", name: "Farina di ceci", type: "Legumi", w: null, protein: null, proteinBasis: "Variabile secondo il prodotto", pl: null, source: "", checkedAt: "2026-09-26", kind: "other", glutenFree: true, usable: false, note: `${note} Farina singola ricca di proteine e sapore: usala in percentuali controllate.` },
];
