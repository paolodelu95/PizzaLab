import { CookingPot, MagnifyingGlass, Pizza, Sparkle } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import type { calculate } from "../domain/calculator";
import type { DoughConfig } from "../domain/types";

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
  margherita: { name: "Margherita", category: "Classiche", description: "Pomodoro, fiordilatte e basilico.", ingredients: [{ name: "Pomodoro", grams: 75 }, { name: "Fiordilatte", grams: 85 }, { name: "Parmigiano", grams: 6 }, { name: "Olio EVO", grams: 5, stage: "fuori" }, { name: "Basilico", grams: 2, stage: "fuori" }], order: "Pomodoro prima della cottura; fiordilatte ben scolato secondo la potenza del forno; basilico e olio in uscita." },
  marinara: { name: "Marinara", category: "Rosse", description: "Essenziale, profumata e senza latticini.", ingredients: [{ name: "Pomodoro", grams: 85 }, { name: "Aglio", grams: 3 }, { name: "Origano", grams: 1 }, { name: "Olio EVO", grams: 6, stage: "fuori" }], order: "Distribuisci il pomodoro sottile, poi aglio e origano. Completa con olio in uscita." },
  diavola: { name: "Diavola", category: "Classiche", description: "Piccante, saporita e ben bilanciata.", ingredients: [{ name: "Pomodoro", grams: 70 }, { name: "Fiordilatte", grams: 75 }, { name: "Salame piccante", grams: 38 }, { name: "Olio EVO", grams: 4, stage: "fuori" }], order: "Pomodoro e fiordilatte alla base; distribuisci il salame senza sovrapporlo. Se è molto grasso, aggiungilo a metà cottura." },
  quattroFormaggi: { name: "4 formaggi", category: "Bianche", description: "Cremosa, intensa, senza eccessi d’acqua.", ingredients: [{ name: "Fiordilatte", grams: 55 }, { name: "Gorgonzola", grams: 28 }, { name: "Fontina", grams: 25 }, { name: "Parmigiano", grams: 14 }, { name: "Olio EVO", grams: 3, stage: "fuori" }], order: "Taglia i formaggi in pezzi piccoli e distribuiscili uniformemente. Parmigiano e olio possono completare la pizza in uscita." },
  capricciosa: { name: "Capricciosa", category: "Classiche", description: "Ricca, ma con ogni ingrediente riconoscibile.", ingredients: [{ name: "Pomodoro", grams: 60 }, { name: "Fiordilatte", grams: 65 }, { name: "Prosciutto cotto", grams: 32 }, { name: "Funghi", grams: 32 }, { name: "Carciofini", grams: 28 }, { name: "Olive", grams: 14 }], order: "Asciuga bene funghi e carciofini. Usa piccole quantità distribuite a settori per non bagnare il centro." },
  quattroStagioni: { name: "4 stagioni", category: "Classiche", description: "Quattro condimenti separati sulla stessa pizza.", ingredients: [{ name: "Pomodoro", grams: 65 }, { name: "Fiordilatte", grams: 65 }, { name: "Prosciutto cotto", grams: 25 }, { name: "Funghi", grams: 25 }, { name: "Carciofini", grams: 25 }, { name: "Olive", grams: 12 }], order: "Dividi visivamente la pizza in quattro spicchi e tieni separati prosciutto, funghi, carciofi e olive." },
  napoli: { name: "Napoli", category: "Rosse", description: "Acciughe, capperi e origano.", ingredients: [{ name: "Pomodoro", grams: 75 }, { name: "Fiordilatte", grams: 65 }, { name: "Acciughe", grams: 16 }, { name: "Capperi", grams: 8 }, { name: "Origano", grams: 1 }, { name: "Olio EVO", grams: 5, stage: "fuori" }], order: "Dissala i capperi e dosa le acciughe con attenzione: entrambi aumentano molto la sapidità." },
  prosciuttoFunghi: { name: "Prosciutto e funghi", category: "Classiche", description: "Morbida e delicata.", ingredients: [{ name: "Pomodoro", grams: 65 }, { name: "Fiordilatte", grams: 75 }, { name: "Prosciutto cotto", grams: 38 }, { name: "Funghi", grams: 38 }], order: "Asciuga o salta prima i funghi. Per un prosciutto più morbido, aggiungine una parte negli ultimi minuti." },
  bufala: { name: "Bufala", category: "Classiche", description: "Lattea e fresca, con gestione attenta dell’acqua.", ingredients: [{ name: "Pomodoro", grams: 65 }, { name: "Mozzarella di bufala", grams: 95 }, { name: "Basilico", grams: 2, stage: "fuori" }, { name: "Olio EVO", grams: 5, stage: "fuori" }], order: "Taglia e scola la bufala con largo anticipo. Nei forni meno potenti aggiungila verso fine cottura." },
  ortolana: { name: "Ortolana", category: "Vegetariane", description: "Verdure cotte separatamente e fondo asciutto.", ingredients: [{ name: "Fiordilatte", grams: 65 }, { name: "Zucchine", grams: 35 }, { name: "Melanzane", grams: 35 }, { name: "Peperoni", grams: 30 }, { name: "Olio EVO", grams: 5, stage: "fuori" }], order: "Griglia o salta prima le verdure e falle raffreddare. Non usare verdure crude molto acquose direttamente sulla pizza." },
  salsicciaFriarielli: { name: "Salsiccia e friarielli", category: "Bianche", description: "Classico campano, deciso e succoso.", ingredients: [{ name: "Provola", grams: 75 }, { name: "Salsiccia", grams: 55 }, { name: "Friarielli", grams: 65 }, { name: "Olio EVO", grams: 4, stage: "fuori" }], order: "Cuoci e strizza i friarielli; sgrana la salsiccia in pezzi piccoli affinché cuocia completamente." },
  tonnoCipolla: { name: "Tonno e cipolla", category: "Rosse", description: "Sapida e aromatica.", ingredients: [{ name: "Pomodoro", grams: 70 }, { name: "Fiordilatte", grams: 60 }, { name: "Tonno sgocciolato", grams: 45 }, { name: "Cipolla", grams: 25 }, { name: "Olio EVO", grams: 4, stage: "fuori" }], order: "Affetta la cipolla molto sottile e sgocciola bene il tonno. Aggiungi il tonno a fine cottura se lo preferisci morbido." },
  parmigiana: { name: "Parmigiana", category: "Vegetariane", description: "Melanzane, pomodoro e formaggio.", ingredients: [{ name: "Pomodoro", grams: 65 }, { name: "Fiordilatte", grams: 65 }, { name: "Melanzane cotte", grams: 55 }, { name: "Parmigiano", grams: 10 }, { name: "Basilico", grams: 2, stage: "fuori" }], order: "Usa melanzane già cotte e asciutte. Completa con parmigiano e basilico senza creare uno strato troppo spesso." },
  boscaiola: { name: "Boscaiola", category: "Bianche", description: "Funghi, salsiccia e fiordilatte.", ingredients: [{ name: "Fiordilatte", grams: 70 }, { name: "Funghi", grams: 45 }, { name: "Salsiccia", grams: 48 }, { name: "Prezzemolo", grams: 2, stage: "fuori" }], order: "Precuoci i funghi e sgrana finemente la salsiccia. Il prezzemolo va aggiunto in uscita." },
  patate: { name: "Patate e rosmarino", category: "Bianche", description: "Sottile, profumata e croccante.", ingredients: [{ name: "Patate", grams: 95 }, { name: "Fiordilatte", grams: 45 }, { name: "Rosmarino", grams: 1 }, { name: "Olio EVO", grams: 6 }], order: "Affetta le patate sottilissime, sciacquale e asciugale. Non sovrapporle troppo per garantire la cottura." },
};

export function ToppingPlanner({ config, result }: { config: DoughConfig; result: GoodResult }) {
  const [preset, setPreset] = useState("margherita");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Tutte");
  const selected = presets[preset];
  const scale = result.style.pan
    ? (config.panWidth * config.panLength * config.count) / 800
    : config.count * Math.pow(config.ballWeight / 260, 0.65);
  const filtered = useMemo(
    () => Object.entries(presets).filter(([, item]) =>
      (category === "Tutte" || item.category === category) &&
      `${item.name} ${item.description} ${item.ingredients.map((ingredient) => ingredient.name).join(" ")}`.toLowerCase().includes(query.toLowerCase()),
    ),
    [category, query],
  );
  return (
    <section className="panel topping-planner">
      <div className="panel-title"><span className="section-icon"><CookingPot /></span><div><h2>Condimenti classici</h2><p>Ricette ordinate, grammature adattate e momento giusto per ogni ingrediente.</p></div></div>
      <div className="topping-toolbar">
        <label className="topping-search"><MagnifyingGlass /><input aria-label="Cerca pizza o ingrediente" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca Diavola, funghi, bufala…" /></label>
        <div className="topping-categories">{["Tutte", "Classiche", "Rosse", "Bianche", "Vegetariane"].map((item) => <button key={item} className={category === item ? "selected" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
      </div>
      <div className="pizza-preset-grid">{filtered.map(([id, item]) => <button key={id} className={preset === id ? "selected" : ""} onClick={() => setPreset(id)}><Pizza weight={preset === id ? "fill" : "duotone"} /><span><strong>{item.name}</strong><small>{item.description}</small></span></button>)}</div>
      {filtered.length === 0 && <p className="small-muted">Nessuna pizza trovata con questi filtri.</p>}
      <div className="selected-topping-plan">
        <div className="selected-topping-heading"><div><span className="eyebrow">PIANO CONDIMENTO</span><h3>{selected.name}</h3><p>{selected.description}</p></div><span>{result.style.pan ? `${config.panWidth}×${config.panLength} cm · ${config.count}` : `${config.count} ${config.count === 1 ? "pizza" : "pizze"}`}</span></div>
        <div className="topping-ingredients">{selected.ingredients.map((ingredient) => <div key={ingredient.name}><span>{ingredient.name}{ingredient.stage === "fine" ? <small>fine cottura</small> : ingredient.stage === "fuori" ? <small>in uscita</small> : null}</span><strong>{Math.max(1, Math.round(ingredient.grams * scale))} g</strong></div>)}</div>
        <div className="topping-order"><Sparkle /><div><strong>Ordine consigliato</strong><p>{selected.order}</p></div></div>
      </div>
      <p className="small-muted">Quantità di partenza: correggile in base a umidità reale, gusto e potenza del forno. Ingredienti molto acquosi o pesanti possono allungare la cottura della mollica.</p>
    </section>
  );
}
