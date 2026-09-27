import { Fire, Oven, SquaresFour } from "@phosphor-icons/react";
import { bakeSurfaceLabels, estimateBakeOutcome } from "../domain/calculator";
import type { DoughConfig } from "../domain/types";
import { SliderField } from "./Fields";

const rackOptions: [DoughConfig["ovenRack"], string, string][] = [
  ["bottom", "Basso", "Più energia al fondo"],
  ["lower-middle", "Medio-basso", "Teglie e pizze alte"],
  ["middle", "Centro", "Cottura uniforme"],
  ["upper-middle", "Medio-alto", "Più colore sopra"],
  ["top", "Alto", "Finitura rapida"],
];

const surfaceOptions: [DoughConfig["bakeSurface"], string][] = [
  ["biscotto", "Biscotto"],
  ["stone", "Pietra"],
  ["steel", "Acciaio"],
  ["light-pan", "Teglia chiara"],
  ["dark-pan", "Teglia scura"],
  ["perforated-pan", "Teglia forata"],
  ["cast-iron", "Ghisa"],
];

const formatTime = (minutes: number) =>
  minutes < 3
    ? `${Math.round(minutes * 60)} sec`
    : `${minutes.toLocaleString("it-IT", { maximumFractionDigits: 1 })} min`;

export function BakingPlanner({
  config: c,
  onUpdate,
}: {
  config: DoughConfig;
  onUpdate: (patch: Partial<DoughConfig>) => void;
}) {
  const outcome = estimateBakeOutcome(c);
  const rack = rackOptions.find(([id]) => id === c.ovenRack)!;
  const baseSliderMax = c.ovenTemp >= 350 ? 10 : c.ovenTemp >= 280 ? 20 : 60;
  const chartMax = Math.max(baseSliderMax, c.bakeMinutes, outcome.recommendedMax * 1.15);
  const points = Array.from({ length: 31 }, (_, index) => {
    const time = (chartMax * index) / 30;
    return estimateBakeOutcome({ ...c, bakeMinutes: Math.max(0.05, time) });
  });
  const path = (key: "crustScore" | "crumbScore" | "baseScore") =>
    points
      .map((point, index) => {
        const x = 12 + (index / 30) * 296;
        const y = 126 - point[key] * 1.05;
        return `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  const markerX = 12 + Math.min(1, c.bakeMinutes / chartMax) * 296;
  const bakeSliderMax = Math.ceil(chartMax / (c.ovenTemp >= 350 ? 0.25 : 1)) * (c.ovenTemp >= 350 ? 0.25 : 1);

  return (
    <section className="panel baking-planner">
      <div className="panel-title">
        <span className="section-icon"><Fire /></span>
        <div>
          <h2>Simulatore di cottura</h2>
          <p>Modifica i parametri: il risultato previsto si aggiorna da solo.</p>
        </div>
      </div>
      <div className="baking-basics slider-basics">
        <SliderField label="Temperatura forno" value={c.ovenTemp} onChange={(v) => onUpdate({ ovenTemp: v })} min={180} max={500} step={5} unit="°C" />
      </div>
      <div className="bake-topping-impact"><span>Condimento collegato</span><strong>{Math.round(c.toppingMoisture)}% umidità · {c.toppingLoad.toLocaleString("it-IT", { maximumFractionDigits: 2 })} g/cm²</strong><small>Il simulatore usa questi valori per mollica e fondo.</small></div>

      <div className="bake-choice">
        <span>Supporto di cottura</span>
        <div className="surface-options">
          {surfaceOptions.map(([id, label]) => (
            <button key={id} className={c.bakeSurface === id ? "selected" : ""} aria-pressed={c.bakeSurface === id} onClick={() => onUpdate({ bakeSurface: id })}>
              <SquaresFour /><strong>{label}</strong>
            </button>
          ))}
        </div>
      </div>

      <div className="bake-prediction-window" aria-live="polite">
        <div className="prediction-heading">
          <div><small>ANTEPRIMA IN TEMPO REALE</small><h3>Risultato previsto</h3></div>
          <span>{formatTime(c.bakeMinutes)}</span>
        </div>
        <div className="prediction-time-control">
          <SliderField label="Tempo di cottura" value={c.bakeMinutes} onChange={(v) => onUpdate({ bakeMinutes: v })} min={0.5} max={60} sliderMax={bakeSliderMax} step={c.ovenTemp >= 350 ? 0.25 : 1} unit="min" hint="Muovi il cursore: grafico, crosta, mollica e fondo cambiano in tempo reale." />
        </div>
        <div className="prediction-results">
          {([
            ["Crosta", outcome.crustLabel, outcome.crustScore, "crust"],
            ["Mollica", outcome.crumbLabel, outcome.crumbScore, "crumb"],
            ["Fondo", outcome.baseLabel, outcome.baseScore, "base"],
          ] as const).map(([name, label, score, kind]) => (
            <div className={`prediction-result ${kind}`} key={name}>
              <span>{name}</span><strong>{label}</strong>
              <div className="prediction-meter"><i style={{ width: `${score}%` }} /></div>
              <small>{Math.round(score)}/100</small>
            </div>
          ))}
        </div>
        <div className="curve-rack-layout">
          <div className="bake-curve" aria-label="Evoluzione prevista durante la cottura">
            <svg viewBox="0 0 320 138" role="img">
              <rect x="12" y="46" width="296" height="36" rx="8" className="ideal-zone" />
              <text x="21" y="58" className="ideal-zone-label">FASCIA IDEALE</text>
              <line x1="12" y1="126" x2="308" y2="126" className="chart-axis" />
              <path d={path("crustScore")} className="curve crust" />
              <path d={path("crumbScore")} className="curve crumb" />
              <path d={path("baseScore")} className="curve base" />
              <line x1={markerX} y1="12" x2={markerX} y2="126" className="time-marker" />
            </svg>
            <div className="curve-legend"><span className="crust">Crosta</span><span className="crumb">Mollica</span><span className="base">Fondo</span><small className="ideal-legend"><i/> equilibrio ideale</small></div>
          </div>
          <aside className="prediction-rack-rail" aria-label="Altezza nel forno">
            <span>ALTEZZA</span>
            {rackOptions.map(([id, label], rackIndex) => (
              <button key={id} title={label} aria-label={label} className={c.ovenRack === id ? "selected" : ""} aria-pressed={c.ovenRack === id} onClick={() => onUpdate({ ovenRack: id })}>
                <span className="mini-oven">{[0, 1, 2, 3, 4].map((n) => <i key={n} className={n === rackIndex ? "rack" : ""} />)}</span>
                <small>{label}</small>
              </button>
            ))}
          </aside>
        </div>
        <div className="prediction-copy">
          <strong>{outcome.summary}</strong>
          <p>Finestra consigliata: {formatTime(outcome.recommendedMin)}–{formatTime(outcome.recommendedMax)}. Controlla comunque il forno reale.</p>
          {outcome.warnings.map((warning) => <p className="prediction-warning" key={warning}>{warning}</p>)}
        </div>
      </div>

      <div className="baking-summary">
        <Oven />
        <div><span>{formatTime(c.bakeMinutes)} · {c.ovenTemp} °C · ripiano {rack[1].toLowerCase()}</span><strong>{bakeSurfaceLabels[c.bakeSurface]} · {rack[2]}</strong></div>
      </div>
      <small className="baking-disclaimer">Stima comparativa basata su stile, idratazione, spessore, temperatura, tempo, posizione e supporto. Condimenti, temperatura reale e forno specifico possono cambiare il risultato.</small>
    </section>
  );
}
