import { Fire, Oven, SquaresFour } from "@phosphor-icons/react";
import type { DoughConfig } from "../domain/types";
import { NumberField } from "./Fields";

const rackOptions: [DoughConfig["ovenRack"], string, string][] = [
  ["bottom", "Basso", "Spinta sulla base"],
  ["lower-middle", "Medio-basso", "Teglie e pizze alte"],
  ["middle", "Centro", "Cottura uniforme"],
  ["upper-middle", "Medio-alto", "Più colore sopra"],
  ["top", "Alto", "Finitura rapida"],
];

export function BakingPlanner({
  config: c,
  onUpdate,
}: {
  config: DoughConfig;
  onUpdate: (patch: Partial<DoughConfig>) => void;
}) {
  const rack = rackOptions.find(([id]) => id === c.ovenRack)!;
  const guidance =
    c.crustBrowning === "dark" && c.crumbBake === "soft"
      ? "Per colorare senza asciugare la mollica, preferisci una finitura breve e intensa nella parte alta del forno."
      : c.crumbBake === "dry"
        ? "Una cottura un po’ più lunga favorisce una mollica asciutta: controlla spesso il fondo."
        : c.crustBrowning === "light"
          ? "Sforna appena la struttura è stabile e il fondo è cotto, prima che la superficie prenda troppo colore."
          : "Cerca un colore uniforme e una base ben cotta: usa tempo e posizione come punto di partenza, poi osserva il tuo forno.";
  return (
    <section className="panel baking-planner">
      <div className="panel-title">
        <span className="section-icon">
          <Fire />
        </span>
        <div>
          <h2>Doratura e mollica</h2>
          <p>Decidi il risultato, poi posiziona la pizza nel forno.</p>
        </div>
      </div>
      <div className="field-grid baking-basics">
        <NumberField
          label="Temperatura di cottura"
          value={c.ovenTemp}
          onChange={(v) => onUpdate({ ovenTemp: v })}
          min={180}
          max={500}
          step={5}
          unit="°C"
        />
        <NumberField
          label="Tempo indicativo"
          value={c.bakeMinutes}
          onChange={(v) => onUpdate({ bakeMinutes: v })}
          min={1}
          max={60}
          step={1}
          unit="min"
        />
      </div>
      <div className="bake-choice">
        <span>Doratura della crosta</span>
        <div className="result-options">
          {(
            [
              ["light", "Chiara"],
              ["golden", "Dorata"],
              ["dark", "Intensa"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              className={c.crustBrowning === id ? "selected" : ""}
              aria-pressed={c.crustBrowning === id}
              onClick={() => onUpdate({ crustBrowning: id })}
            >
              <i className={`crust-${id}`} />
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="bake-choice">
        <span>Cottura della mollica</span>
        <div className="result-options">
          {(
            [
              ["soft", "Soffice"],
              ["balanced", "Equilibrata"],
              ["dry", "Asciutta"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              className={c.crumbBake === id ? "selected" : ""}
              aria-pressed={c.crumbBake === id}
              onClick={() => onUpdate({ crumbBake: id })}
            >
              <SquaresFour />
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="bake-choice">
        <span>Altezza nel forno</span>
        <div className="rack-options">
          {rackOptions.map(([id, label]) => (
            <button
              key={id}
              className={c.ovenRack === id ? "selected" : ""}
              aria-pressed={c.ovenRack === id}
              onClick={() => onUpdate({ ovenRack: id })}
            >
              <span className="mini-oven">
                {[0, 1, 2, 3, 4].map((n) => (
                  <i
                    key={n}
                    className={
                      n === rackOptions.findIndex(([rackId]) => rackId === id)
                        ? "rack"
                        : ""
                    }
                  />
                ))}
              </span>
              <strong>{label}</strong>
            </button>
          ))}
        </div>
      </div>
      <div className="baking-summary">
        <Oven />
        <div>
          <span>
            {c.bakeMinutes} min · {c.ovenTemp} °C · ripiano{" "}
            {rack[1].toLowerCase()}
          </span>
          <strong>{rack[2]}</strong>
          <p>{guidance}</p>
        </div>
      </div>
      <small className="baking-disclaimer">
        È un punto di partenza: carico di condimenti, supporto e temperatura
        reale cambiano la cottura.
      </small>
    </section>
  );
}
