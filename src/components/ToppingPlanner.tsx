import { locale, t, tn, msg } from "../i18n";
import { CookingPot, MagnifyingGlass, Pizza, Sparkle } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import type { calculate } from "../domain/calculator";
import type { DoughConfig } from "../domain/types";
import { styles } from "../domain/styles";
import { NumberField, Stepper } from "./Fields";
import { formatWeight } from "../services/units";

type GoodResult = Extract<ReturnType<typeof calculate>, { ok: true }>;
type Ingredient = { name: string; grams: number; stage?: "prima" | "fine" | "fuori" };
type PizzaPreset = {
  name: string;
  category: "Classiche" | "Rosse" | "Bianche" | "Vegetariane";
  description: string;
  ingredients: Ingredient[];
  order: string;
};

const presets: Record<string, PizzaPreset> = {
  margherita: { name: msg("Margherita"), category: msg("Classiche"), description: msg("Pomodoro, fiordilatte e basilico."), ingredients: [{ name: msg("Pomodoro"), grams: 75 }, { name: msg("Fiordilatte"), grams: 85 }, { name: msg("Parmigiano"), grams: 6 }, { name: msg("Olio EVO"), grams: 5, stage: "fuori" }, { name: msg("Basilico"), grams: 2, stage: "fuori" }], order: msg("Pomodoro prima della cottura; fiordilatte ben scolato secondo la potenza del forno; basilico e olio in uscita.") },
  barese: { name: msg("Focaccia barese"), category: msg("Vegetariane"), description: msg("Pomodorini schiacciati, olive, origano e sale grosso."), ingredients: [{ name: msg("Pomodorini"), grams: 200 }, { name: msg("Olive baresane"), grams: 40 }, { name: msg("Origano"), grams: 2 }, { name: msg("Sale grosso"), grams: 4 }, { name: msg("Olio EVO in superficie"), grams: 25 }], order: msg("Ungi bene la teglia (circa 2–3 cucchiai d’olio, a parte). Prima di infornare schiaccia i pomodorini tagliati a metà direttamente nell’impasto, poi olive, origano, sale grosso e un filo d’olio.") },
  marinara: { name: msg("Marinara"), category: msg("Rosse"), description: msg("Essenziale, profumata e senza latticini."), ingredients: [{ name: msg("Pomodoro"), grams: 85 }, { name: msg("Aglio"), grams: 3 }, { name: msg("Origano"), grams: 1 }, { name: msg("Olio EVO"), grams: 6, stage: "fuori" }], order: msg("Distribuisci il pomodoro sottile, poi aglio e origano. Completa con olio in uscita.") },
  diavola: { name: msg("Diavola"), category: msg("Classiche"), description: msg("Piccante, saporita e ben bilanciata."), ingredients: [{ name: msg("Pomodoro"), grams: 70 }, { name: msg("Fiordilatte"), grams: 75 }, { name: msg("Salame piccante"), grams: 38 }, { name: msg("Olio EVO"), grams: 4, stage: "fuori" }], order: msg("Pomodoro e fiordilatte alla base; distribuisci il salame senza sovrapporlo. Se è molto grasso, aggiungilo a metà cottura.") },
  quattroFormaggi: { name: msg("4 formaggi"), category: msg("Bianche"), description: msg("Cremosa, intensa, senza eccessi d’acqua."), ingredients: [{ name: msg("Fiordilatte"), grams: 55 }, { name: msg("Gorgonzola"), grams: 28 }, { name: msg("Fontina"), grams: 25 }, { name: msg("Parmigiano"), grams: 14 }, { name: msg("Olio EVO"), grams: 3, stage: "fuori" }], order: msg("Taglia i formaggi in pezzi piccoli e distribuiscili uniformemente. Parmigiano e olio possono completare la pizza in uscita.") },
  capricciosa: { name: msg("Capricciosa"), category: msg("Classiche"), description: msg("Ricca, ma con ogni ingrediente riconoscibile."), ingredients: [{ name: msg("Pomodoro"), grams: 60 }, { name: msg("Fiordilatte"), grams: 65 }, { name: msg("Prosciutto cotto"), grams: 32 }, { name: msg("Funghi"), grams: 32 }, { name: msg("Carciofini"), grams: 28 }, { name: msg("Olive"), grams: 14 }], order: msg("Asciuga bene funghi e carciofini. Usa piccole quantità distribuite a settori per non bagnare il centro.") },
  quattroStagioni: { name: msg("4 stagioni"), category: msg("Classiche"), description: msg("Quattro condimenti separati sulla stessa pizza."), ingredients: [{ name: msg("Pomodoro"), grams: 65 }, { name: msg("Fiordilatte"), grams: 65 }, { name: msg("Prosciutto cotto"), grams: 25 }, { name: msg("Funghi"), grams: 25 }, { name: msg("Carciofini"), grams: 25 }, { name: msg("Olive"), grams: 12 }], order: msg("Dividi visivamente la pizza in quattro spicchi e tieni separati prosciutto, funghi, carciofi e olive.") },
  napoli: { name: msg("Napoli"), category: msg("Rosse"), description: msg("Acciughe, capperi e origano."), ingredients: [{ name: msg("Pomodoro"), grams: 75 }, { name: msg("Fiordilatte"), grams: 65 }, { name: msg("Acciughe"), grams: 16 }, { name: msg("Capperi"), grams: 8 }, { name: msg("Origano"), grams: 1 }, { name: msg("Olio EVO"), grams: 5, stage: "fuori" }], order: msg("Dissala i capperi e dosa le acciughe con attenzione: entrambi aumentano molto la sapidità.") },
  prosciuttoFunghi: { name: msg("Prosciutto e funghi"), category: msg("Classiche"), description: msg("Morbida e delicata."), ingredients: [{ name: msg("Pomodoro"), grams: 65 }, { name: msg("Fiordilatte"), grams: 75 }, { name: msg("Prosciutto cotto"), grams: 38 }, { name: msg("Funghi"), grams: 38 }], order: msg("Asciuga o salta prima i funghi. Per un prosciutto più morbido, aggiungine una parte negli ultimi minuti.") },
  bufala: { name: msg("Bufala"), category: msg("Classiche"), description: msg("Lattea e fresca, con gestione attenta dell’acqua."), ingredients: [{ name: msg("Pomodoro"), grams: 65 }, { name: msg("Mozzarella di bufala"), grams: 95 }, { name: msg("Basilico"), grams: 2, stage: "fuori" }, { name: msg("Olio EVO"), grams: 5, stage: "fuori" }], order: msg("Taglia e scola la bufala con largo anticipo. Nei forni meno potenti aggiungila verso fine cottura.") },
  ortolana: { name: msg("Ortolana"), category: msg("Vegetariane"), description: msg("Verdure cotte separatamente e fondo asciutto."), ingredients: [{ name: msg("Fiordilatte"), grams: 65 }, { name: msg("Zucchine"), grams: 35 }, { name: msg("Melanzane"), grams: 35 }, { name: msg("Peperoni"), grams: 30 }, { name: msg("Olio EVO"), grams: 5, stage: "fuori" }], order: msg("Griglia o salta prima le verdure e falle raffreddare. Non usare verdure crude molto acquose direttamente sulla pizza.") },
  salsicciaFriarielli: { name: msg("Salsiccia e friarielli"), category: msg("Bianche"), description: msg("Classico campano, deciso e succoso."), ingredients: [{ name: msg("Provola"), grams: 75 }, { name: msg("Salsiccia"), grams: 55 }, { name: msg("Friarielli"), grams: 65 }, { name: msg("Olio EVO"), grams: 4, stage: "fuori" }], order: msg("Cuoci e strizza i friarielli; sgrana la salsiccia in pezzi piccoli affinché cuocia completamente.") },
  tonnoCipolla: { name: msg("Tonno e cipolla"), category: msg("Rosse"), description: msg("Sapida e aromatica."), ingredients: [{ name: msg("Pomodoro"), grams: 70 }, { name: msg("Fiordilatte"), grams: 60 }, { name: msg("Tonno sgocciolato"), grams: 45 }, { name: msg("Cipolla"), grams: 25 }, { name: msg("Olio EVO"), grams: 4, stage: "fuori" }], order: msg("Affetta la cipolla molto sottile e sgocciola bene il tonno. Aggiungi il tonno a fine cottura se lo preferisci morbido.") },
  parmigiana: { name: msg("Parmigiana"), category: msg("Vegetariane"), description: msg("Melanzane, pomodoro e formaggio."), ingredients: [{ name: msg("Pomodoro"), grams: 65 }, { name: msg("Fiordilatte"), grams: 65 }, { name: msg("Melanzane cotte"), grams: 55 }, { name: msg("Parmigiano"), grams: 10 }, { name: msg("Basilico"), grams: 2, stage: "fuori" }], order: msg("Usa melanzane già cotte e asciutte. Completa con parmigiano e basilico senza creare uno strato troppo spesso.") },
  boscaiola: { name: msg("Boscaiola"), category: msg("Bianche"), description: msg("Funghi, salsiccia e fiordilatte."), ingredients: [{ name: msg("Fiordilatte"), grams: 70 }, { name: msg("Funghi"), grams: 45 }, { name: msg("Salsiccia"), grams: 48 }, { name: msg("Prezzemolo"), grams: 2, stage: "fuori" }], order: msg("Precuoci i funghi e sgrana finemente la salsiccia. Il prezzemolo va aggiunto in uscita.") },
  patate: { name: msg("Patate e rosmarino"), category: msg("Bianche"), description: msg("Sottile, profumata e croccante."), ingredients: [{ name: msg("Patate"), grams: 95 }, { name: msg("Fiordilatte"), grams: 45 }, { name: msg("Rosmarino"), grams: 1 }, { name: msg("Olio EVO"), grams: 6 }], order: msg("Affetta le patate sottilissime, sciacquale e asciugale. Non sovrapporle troppo per garantire la cottura.") },
};

const rectangularStyles = new Set(["teglia", "pala", "focaccia", "focaccia-barese", "detroit", "pinsa", "sfincione"]);
const diameterForStyle = (styleId: string) =>
  styleId === "padellino" ? 20 : styleId === "new-york" ? 35 : 32;
const moistureByPreset: Record<string, number> = {
  margherita: 62, marinara: 58, diavola: 60, quattroFormaggi: 48,
  capricciosa: 72, quattroStagioni: 72, napoli: 60, prosciuttoFunghi: 72,
  bufala: 82, ortolana: 78, salsicciaFriarielli: 68, tonnoCipolla: 65,
  parmigiana: 70, boscaiola: 68, patate: 55, barese: 66,
};

export function ToppingPlanner({ config, result, onUpdate }: { config: DoughConfig; result: GoodResult; onUpdate: (patch: Partial<DoughConfig>) => void }) {
  const [preset, setPreset] = useState(presets[config.toppingPresetId] ? config.toppingPresetId : "margherita");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(msg("Tutte"));
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const pieces = config.toppingCount;
  const diameter = config.pizzaDiameter || diameterForStyle(config.styleId);
  const width = config.toppingWidth;
  const length = config.toppingLength;
  const selected = presets[preset];
  // Negli stili in teglia conta la forma della teglia scelta: con una teglia tonda si calcola sul cerchio.
  const panStyle = styles.find((item) => item.id === config.styleId)?.pan ?? false;
  const rectangular = rectangularStyles.has(config.styleId) && !(panStyle && config.panShape === "round");
  const trays = rectangular || panStyle;
  const areaPerPiece = rectangular
    ? width * length
    : Math.PI * Math.pow(diameter / 2, 2);
  const referenceArea = rectangular ? 800 : Math.PI * 16 * 16;
  const totalArea = areaPerPiece * pieces;
  const scale = totalArea / referenceArea;
  const toppingTotal = selected.ingredients.reduce((sum, ingredient) => sum + ingredient.grams * scale, 0);
  const toppingLoad = toppingTotal / Math.max(1, totalArea);
  const moisture = moistureByPreset[preset] ?? 55;
  const naturalStarter = config.yeast === "licoli" || config.yeast === "sourdough";
  const leaveningName = config.yeast === "licoli" ? "Li.Co.Li." : config.yeast === "sourdough" ? t("Pasta madre") : t("Lievito");
  const leaveningGrams = naturalStarter ? result.starter.grams : result.yeast;
  useEffect(() => {
    if (Math.abs(config.toppingLoad - toppingLoad) > 0.002 || config.toppingMoisture !== moisture || config.toppingPresetId !== preset)
      onUpdate({ toppingLoad, toppingMoisture: moisture, toppingPresetId: preset });
  }, [preset, toppingLoad, moisture, config.toppingLoad, config.toppingMoisture, config.toppingPresetId]);
  const filtered = useMemo(
    () => Object.entries(presets).filter(([, item]) =>
      (category === "Tutte" || item.category === category) &&
      `${t(item.name)} ${t(item.description)} ${item.ingredients.map((ingredient) => t(ingredient.name)).join(" ")}`.toLowerCase().includes(query.toLowerCase()),
    ),
    [category, query],
  );
  return (
    <section className="panel topping-planner">
      <div className="panel-title"><span className="section-icon"><CookingPot /></span><div><h2>{t("Condimenti classici")}</h2><p>{t("Ricette ordinate, grammature adattate e momento giusto per ogni ingrediente.")}</p></div></div>
      <div className="topping-toolbar">
        <label className="topping-search"><MagnifyingGlass /><input aria-label={t("Cerca pizza o ingrediente")} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Cerca Diavola, funghi, bufala…")} /></label>
        <div className="topping-categories">{[msg("Tutte"), msg("Classiche"), msg("Rosse"), msg("Bianche"), msg("Vegetariane")].map((item) => <button key={item} className={category === item ? "selected" : ""} onClick={() => setCategory(item)}>{t(item)}</button>)}</div>
      </div>
      <div className="pizza-preset-grid">{filtered.map(([id, item]) => <button key={id} className={preset === id ? "selected" : ""} onClick={() => { setPreset(id); setChecked(new Set()); }}><Pizza weight={preset === id ? "fill" : "duotone"} /><span><strong>{t(item.name)}</strong><small>{t(item.description)}</small></span></button>)}</div>
      {filtered.length === 0 && <p className="small-muted">{t("Nessuna pizza trovata con questi filtri.")}</p>}
      <div className="selected-topping-plan">
        <div className="selected-topping-heading"><div><span className="eyebrow">{t("PIANO CONDIMENTO")}</span><h3>{t(selected.name)}</h3><p>{t(selected.description)}</p></div><span>{rectangular ? `${width}×${length} cm · ${tn(pieces, "{count} teglia", "{count} teglie")}` : `Ø ${diameter} cm · ${trays ? tn(pieces, "{count} teglia", "{count} teglie") : tn(pieces, "{count} pizza", "{count} pizze")}`}</span></div>
        <section className="topping-size-card compact">
          <div className="topping-size-copy"><h4>{trays ? t("Quanto misura ogni teglia?") : t("Quanto è grande ogni pizza?")}</h4><p>{t("Le quantità cambiano in proporzione alla superficie, non soltanto al peso del panetto.")}</p></div>
          <div className={`topping-size-fields ${rectangular ? "rectangular" : "round"}`}>
            {rectangular ? <><NumberField label={t("Larghezza")} value={width} onChange={(toppingWidth) => onUpdate({ toppingWidth })} min={10} max={100} step={1} unit="cm" clampToRange /><NumberField label={t("Lunghezza")} value={length} onChange={(toppingLength) => onUpdate({ toppingLength })} min={10} max={150} step={1} unit="cm" clampToRange /></> : <NumberField label={trays ? t("Diametro teglia") : t("Diametro")} value={diameter} onChange={(pizzaDiameter) => onUpdate({ pizzaDiameter })} min={15} max={60} step={1} unit="cm" clampToRange />}
            <Stepper label={trays ? t("Numero di teglie") : t("Numero di pizze")} value={pieces} onChange={(toppingCount) => onUpdate({ toppingCount })} min={1} max={30} />
          </div>
          <div className="topping-area"><span>{t("Superficie totale")}</span><strong>{Math.round(totalArea).toLocaleString(locale())} {t("cm²")}</strong><small>{pieces > 1 ? t("{toLocaleString} cm² ciascuna", { toLocaleString: Math.round(areaPerPiece).toLocaleString(locale()) }) : t("una pizza o teglia")}</small></div>
        </section>
        <div className="topping-ingredients">{selected.ingredients.map((ingredient) => { const totalGrams = Math.max(1, Math.round(ingredient.grams * scale)); const eachGrams = Math.max(1, Math.round(totalGrams / pieces)); return <div key={ingredient.name}><span>{t(ingredient.name)}{ingredient.stage === "fine" ? <small>{t("fine cottura")}</small> : ingredient.stage === "fuori" ? <small>{t("in uscita")}</small> : null}</span><span className="topping-grams"><strong>{formatWeight(totalGrams)}</strong>{pieces > 1 && <small>{formatWeight(eachGrams)} {t("cad.")}</small>}</span></div>; })}</div>
        <div className="topping-order"><Sparkle /><div><strong>{t("Ordine consigliato")}</strong><p>{t(selected.order)}</p></div></div>
      </div>
      <details className="shopping-list">
        <summary>{t("Lista della spesa completa")}</summary>
        <div className="shopping-list-head"><div><strong>{t("Impasto +")} {t(selected.name)}</strong><small>{pieces} {trays ? (pieces === 1 ? t("teglia") : t("teglie")) : (pieces === 1 ? t("pizza") : t("pizze"))}</small></div><button className="button secondary" onClick={() => void navigator.clipboard?.writeText([
          ...result.flourBreakdown.map((item) => `${t(item.name)}: ${formatWeight(item.grams)}`),
          `${t("Acqua")}: ${formatWeight(result.water)}`, `${t("Sale")}: ${formatWeight(result.salt, 1)}`, `${leaveningName}: ${formatWeight(leaveningGrams, 1)}`,
          ...selected.ingredients.map((ingredient) => `${t(ingredient.name)}: ${formatWeight(Math.max(1, Math.round(ingredient.grams * scale)))}`),
        ].join("\n"))}>{t("Copia lista")}</button></div>
        <div className="shopping-items">{[
          ...result.flourBreakdown.map((item) => ({ name: item.name, grams: Math.round(item.grams), group: msg("Impasto") })),
          { name: msg("Acqua"), grams: Math.round(result.water), group: msg("Impasto") },
          { name: msg("Sale"), grams: Math.round(result.salt * 10) / 10, group: msg("Impasto") },
          { name: leaveningName, grams: Math.round(leaveningGrams * 10) / 10, group: msg("Impasto") },
          ...selected.ingredients.map((ingredient) => ({ name: ingredient.name, grams: Math.max(1, Math.round(ingredient.grams * scale)), group: msg("Condimento") })),
        ].map((item) => { const id = `${item.group}-${item.name}`; return <label key={id} className={checked.has(id) ? "checked" : ""}><input type="checkbox" checked={checked.has(id)} onChange={() => setChecked((old) => { const next = new Set(old); if (next.has(id)) next.delete(id); else next.add(id); return next; })} /><span><small>{t(item.group)}</small><strong>{t(item.name)}</strong></span><b>{formatWeight(item.grams, 1)}</b></label>; })}</div>
      </details>
      <p className="small-muted">{t("Le grammature mostrate sono totali per la superficie selezionata; “cad.” indica la dose per singola pizza o teglia. Correggile in base a umidità reale, gusto e potenza del forno.")}</p>
    </section>
  );
}
