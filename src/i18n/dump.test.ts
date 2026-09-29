import { writeFileSync } from "node:fs";
import { it } from "vitest";
import { en } from "./en";
import { collectDataStrings, collectSourceStrings } from "./collect";

// Uso: DUMP_I18N=/percorso/file.json npx vitest run src/i18n/dump.test.ts — elenca i testi ancora senza traduzione.
it.skipIf(!process.env.DUMP_I18N)("dumps the untranslated texts", () => {
  const needed = new Map<string, string>();
  for (const [key, files] of collectSourceStrings()) needed.set(key, [...files].join(","));
  for (const key of collectDataStrings()) if (!needed.has(key)) needed.set(key, "data");
  const missing = [...needed].filter(([key]) => !(key in en)).map(([key, file]) => ({ key, file }));
  writeFileSync(process.env.DUMP_I18N!, JSON.stringify(missing, null, 1));
});

// Uso: DUMP_ORPHANS=/percorso/file.json — elenca le traduzioni il cui testo italiano non esiste più.
it.skipIf(!process.env.DUMP_ORPHANS)("dumps the orphan translations", () => {
  const needed = new Set([...collectSourceStrings().keys(), ...collectDataStrings()]);
  writeFileSync(process.env.DUMP_ORPHANS!, JSON.stringify(Object.keys(en).filter((key) => !needed.has(key))));
});
