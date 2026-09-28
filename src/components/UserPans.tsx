import { useState } from "react";
import { CheckCircle, Plus, SquaresFour, Trash } from "@phosphor-icons/react";
import { bakeSurfaceLabels } from "../domain/calculator";
import type { DoughConfig, UserPan } from "../domain/types";
import { surfaceOptions } from "../data/options";
import { SelectSheet } from "./SelectSheet";

const panSurfaces = surfaceOptions.filter((option) =>
  ["light-pan", "dark-pan", "perforated-pan", "cast-iron", "steel"].includes(option.value),
);

export const panSize = (pan: UserPan) =>
  pan.shape === "round" ? `Ø ${pan.diameter ?? 28} cm` : `${pan.width}×${pan.length} cm`;

export const isPanInUse = (pan: UserPan, config: DoughConfig) =>
  config.bakeSurface === pan.surface &&
  (pan.shape === "round"
    ? config.panShape === "round" && config.panDiameter === pan.diameter
    : config.panShape !== "round" && config.panWidth === pan.width && config.panLength === pan.length);

/** Le teglie di casa: misure e materiale, riutilizzabili negli stili in teglia. */
export function UserPans({
  pans,
  config,
  onAdd,
  onDelete,
  onUse,
}: {
  pans: UserPan[];
  config: DoughConfig;
  onAdd: (pan: UserPan) => void;
  onDelete: (id: string) => void;
  onUse: (pan: UserPan) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [shape, setShape] = useState<"rect" | "round">("rect");
  const [diameter, setDiameter] = useState(28);
  const [width, setWidth] = useState(30);
  const [length, setLength] = useState(40);
  const [surface, setSurface] = useState<DoughConfig["bakeSurface"]>("dark-pan");
  return (
    <section className="panel user-pans" aria-labelledby="pans-title">
      <div className="panel-title">
        <span className="section-icon"><SquaresFour /></span>
        <div>
          <h2 id="pans-title">Le tue teglie</h2>
          <p>Salva tutte le teglie che hai, rettangolari o tonde. Negli stili in teglia (teglia romana, focaccia, Detroit…) le scegli con un tocco e le dosi si adattano alla superficie.</p>
        </div>
      </div>
      {pans.length > 0 && (
        <div className="oven-list">
          {pans.map((pan) => {
            const inUse = isPanInUse(pan, config);
            return (
              <article key={pan.id} className={inUse ? "in-use" : ""}>
                <span
                  className={`oven-icon pan-shape ${pan.shape === "round" ? "round" : ""}`}
                  aria-hidden="true"
                  style={pan.shape === "round" ? undefined : { aspectRatio: `${pan.length} / ${pan.width}` }}
                />
                <div>
                  <strong>{pan.name}</strong>
                  <span>{pan.shape === "round" ? "Tonda" : "Rettangolare"} · {panSize(pan)} · {bakeSurfaceLabels[pan.surface].toLowerCase()}</span>
                </div>
                <button className={`button ${inUse ? "selected" : "secondary"}`} onClick={() => onUse(pan)}>
                  {inUse ? <><CheckCircle /> In uso</> : "Usa"}
                </button>
                <button className="icon-button" aria-label={`Elimina teglia ${pan.name}`} onClick={() => onDelete(pan.id)}>
                  <Trash />
                </button>
              </article>
            );
          })}
        </div>
      )}
      {adding ? (
        <form
          className="oven-form"
          onSubmit={(event) => {
            event.preventDefault();
            const w = Math.max(10, Math.min(80, Math.round(width) || 30));
            const l = Math.max(10, Math.min(100, Math.round(length) || 40));
            const d = Math.max(14, Math.min(60, Math.round(diameter) || 28));
            onAdd({
              id: crypto.randomUUID(),
              name: name.trim() || (shape === "round" ? `Teglia tonda Ø ${d}` : `Teglia ${w}×${l}`),
              shape,
              ...(shape === "round" ? { diameter: d } : {}),
              width: w,
              length: l,
              surface,
              createdAt: new Date().toISOString(),
            });
            setName("");
            setAdding(false);
          }}
        >
          <div className="field-grid">
            <div className="field">
              <span className="field-label">Forma</span>
              <div className="method-toggle pan-shape-toggle" role="group" aria-label="Forma della teglia">
                <button type="button" className={shape === "rect" ? "selected" : ""} aria-pressed={shape === "rect"} onClick={() => setShape("rect")}>
                  <span className="shape-icon rect" aria-hidden="true" /> Rettangolare
                </button>
                <button type="button" className={shape === "round" ? "selected" : ""} aria-pressed={shape === "round"} onClick={() => setShape("round")}>
                  <span className="shape-icon round" aria-hidden="true" /> Tonda
                </button>
              </div>
            </div>
            <label className="field">
              Nome
              <input
                value={name}
                maxLength={40}
                placeholder={shape === "round" ? `Teglia tonda Ø ${diameter}` : `Teglia ${width}×${length}`}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            {shape === "round" ? (
              <label className="field">
                Diametro interno
                <div className="number-input">
                  <input type="number" inputMode="numeric" min={14} max={60} value={diameter} onChange={(event) => setDiameter(Number(event.target.value))} />
                  <span>cm</span>
                </div>
              </label>
            ) : (
              <>
            <label className="field">
              Larghezza interna
              <div className="number-input">
                <input type="number" inputMode="numeric" min={10} max={80} value={width} onChange={(event) => setWidth(Number(event.target.value))} />
                <span>cm</span>
              </div>
            </label>
            <label className="field">
              Lunghezza interna
              <div className="number-input">
                <input type="number" inputMode="numeric" min={10} max={100} value={length} onChange={(event) => setLength(Number(event.target.value))} />
                <span>cm</span>
              </div>
            </label>
              </>
            )}
            <SelectSheet label="Materiale" help="supporto" value={surface} options={panSurfaces} onChange={setSurface} />
          </div>
          <p className="oven-form-note">Misura il fondo della teglia, da bordo interno a bordo interno: sono le misure che contano per le dosi.</p>
          <div className="oven-form-actions">
            <button type="button" className="button secondary" onClick={() => setAdding(false)}>Annulla</button>
            <button type="submit" className="button primary"><Plus /> Salva la teglia</button>
          </div>
        </form>
      ) : (
        <button className="button secondary" onClick={() => setAdding(true)}>
          <Plus /> {pans.length ? "Aggiungi un’altra teglia" : "Aggiungi una teglia"}
        </button>
      )}
    </section>
  );
}
