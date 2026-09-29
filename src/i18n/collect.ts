/** Raccolta dei testi da tradurre: usata dal test di copertura e dallo script che elenca le traduzioni mancanti. */
import ts from "typescript";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { styles } from "../domain/styles";
import { ovenProfiles } from "../data/ovens";
import { mixerProfiles } from "../data/mixers";
import { catalog } from "../data/catalog";
import { mixerOptions, planetaryOptions, surfaceOptions, ovenOptions } from "../data/options";
import raw from "../data/flours.json";
import international from "../data/internationalFlours.json";
import estimates from "../data/wEstimates.json";

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) && !/(^|\/)i18n\/(en|collect)\.ts$/.test(full) ? [full] : [];
  });

const literalOf = (node: ts.Node | undefined) =>
  node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : undefined;

/** Testi passati a t(), tn() e msg() nel codice sorgente, con il file che li usa. */
export function collectSourceStrings(root = path.resolve(__dirname, "..")) {
  const found = new Map<string, Set<string>>();
  const add = (text: string | undefined, file: string) => {
    if (text !== undefined) found.set(text, (found.get(text) ?? new Set()).add(path.relative(root, file)));
  };
  for (const file of walk(root)) {
    const sf = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const name = node.expression.text;
        if (name === "t" || name === "msg") add(literalOf(node.arguments[0]), file);
        if (name === "tn") {
          add(literalOf(node.arguments[1]), file);
          add(literalOf(node.arguments[2]), file);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return found;
}

/** Testi che arrivano dai dati (stili, forni, impastatrici, farine generiche, elenchi di scelta). */
export function collectDataStrings() {
  const out = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value === "string" && /[A-Za-zÀ-ÿ]{2,}/.test(value)) out.add(value);
  };
  for (const s of styles) [s.name, s.subtitle, s.tip, s.bake].forEach(add);
  for (const o of ovenProfiles) [o.name, o.family, o.note].forEach(add);
  for (const m of mixerProfiles) [m.name, m.family, m.tool, m.start, m.knead, m.finish, m.note].forEach(add);
  for (const f of catalog.filter((item) => item.brand === "Farina generica" || item.brand === "Senza glutine")) [f.brand, f.name, f.type, f.proteinBasis, f.note].forEach(add);
  for (const f of [...(raw as { note: string; proteinBasis: string; type: string }[]), ...international]) [f.note, f.proteinBasis, f.type].forEach(add);
  for (const e of Object.values(estimates as Record<string, { method: string }>)) add(e.method);
  for (const list of [mixerOptions, planetaryOptions, surfaceOptions]) for (const option of list) [option.label, option.description, option.group].forEach(add);
  // Le descrizioni dei forni sono composte con t() al momento dell’uso: qui servono solo etichetta e gruppo.
  for (const option of ovenOptions()) [option.label, option.group].forEach(add);
  return out;
}

export const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
