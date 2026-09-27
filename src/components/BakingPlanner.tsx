import { Fire, Oven, SquaresFour, Target } from "@phosphor-icons/react";
import { useState } from "react";
import { bakeSurfaceLabels, estimateBakeOutcome } from "../domain/calculator";
import type { BakeCalibration, DoughConfig } from "../domain/types";
import { NumberField, SliderField } from "./Fields";

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
  calibrations,
  onAddCalibration,
}: {
  config: DoughConfig;
  onUpdate: (patch: Partial<DoughConfig>) => void;
  calibrations: BakeCalibration[];
  onAddCalibration: (calibration: BakeCalibration) => void;
}) {
  const [actualMinutes, setActualMinutes] = useState(c.bakeMinutes);
  const [crust, setCrust] = useState<BakeCalibration["crust"]>("good");
  const [crumb, setCrumb] = useState<BakeCalibration["crumb"]>("good");
  const [base, setBase] = useState<BakeCalibration["base"]>("good");
  const outcome = estimateBakeOutcome(c);
  const exactCalibrations = calibrations.filter((item) => item.ovenType === c.ovenType && item.flourId === c.flourId);
  const relevantCalibrations = exactCalibrations.length ? exactCalibrations : calibrations.filter((item) => item.ovenType === c.ovenType);
  const personalDelta = relevantCalibrations.length
    ? relevantCalibrations.reduce((sum, item) => sum + item.actualMinutes - item.plannedMinutes + (item.crumb === "raw" ? 0.75 : item.crumb === "dry" ? -0.5 : 0), 0) / relevantCalibrations.length
    : 0;
  const calibrationHint = relevantCalibrations.some((item) => item.base === "pale")
    ? "Il fondo tende a restare pallido: prova un ripiano più basso o un supporto più conduttivo."
    : relevantCalibrations.some((item) => item.base === "dark")
      ? "Il fondo tende a scurire: alza il ripiano o usa un supporto meno conduttivo."
      : relevantCalibrations.some((item) => item.crust === "pale")
        ? "La crosta tende a restare chiara: termina più in alto o con grill controllato."
        : relevantCalibrations.some((item) => item.crust === "dark")
          ? "La superficie colora presto: abbassa il ripiano nella prima parte della cottura."
          : "I risultati registrati sono equilibrati: la correzione riguarda soprattutto il tempo reale.";
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
              <line x1="12" y1="126" x2="308" y2="126" className="chart-axis" />
              <path d={path("crustScore")} className="curve crust" />
              <path d={path("crumbScore")} className="curve crumb" />
              <path d={path("baseScore")} className="curve base" />
              <line x1={markerX} y1="12" x2={markerX} y2="126" className="time-marker" />
            </svg>
            <div className="curve-legend"><span className="crust">Crosta</span><span className="crumb">Mollica</span><span className="base">Fondo</span><small>fascia ideale</small></div>
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
      <section className="bake-calibration">
        <div className="panel-title"><span className="section-icon"><Target /></span><div><h2>Taratura del tuo forno</h2><p>Registra il risultato reale: PizzaLab corregge le prossime previsioni per questo forno e questa farina.</p></div></div>
        {relevantCalibrations.length > 0 && <><div className="personal-calibration"><Target /><div><span>{relevantCalibrations.length} {relevantCalibrations.length === 1 ? "prova confrontabile" : "prove confrontabili"}</span><strong>Correzione personale {personalDelta >= 0 ? "+" : ""}{personalDelta.toLocaleString("it-IT", { maximumFractionDigits: 1 })} min</strong><small>{exactCalibrations.length ? "Stesso forno e stessa farina" : "Basata sullo stesso forno"}</small></div><button className="button secondary" onClick={() => onUpdate({ bakeMinutes: Math.max(0.5, Math.min(60, c.bakeMinutes + personalDelta)) })}>Applica</button></div><p className="calibration-hint">{calibrationHint}</p></>}
        <div className="calibration-form"><NumberField label="Tempo realmente usato" value={actualMinutes} onChange={setActualMinutes} min={0.5} max={60} step={c.ovenTemp >= 350 ? 0.25 : 1} unit="min" /><CalibrationChoice label="Crosta" value={crust} options={[["pale", "Pallida"], ["good", "Giusta"], ["dark", "Scura"]]} onChange={setCrust} /><CalibrationChoice label="Mollica" value={crumb} options={[["raw", "Umida"], ["good", "Giusta"], ["dry", "Asciutta"]]} onChange={setCrumb} /><CalibrationChoice label="Fondo" value={base} options={[["pale", "Pallido"], ["good", "Giusto"], ["dark", "Scuro"]]} onChange={setBase} /></div>
        <button className="button primary full" onClick={() => onAddCalibration({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ovenType: c.ovenType, flourId: c.flourId, plannedMinutes: c.bakeMinutes, actualMinutes, crust, crumb, base })}>Salva risultato reale</button>
      </section>
      <small className="baking-disclaimer">Stima comparativa basata su stile, idratazione, spessore, temperatura, tempo, posizione e supporto. Condimenti, temperatura reale e forno specifico possono cambiare il risultato.</small>
    </section>
  );
}

function CalibrationChoice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (value: T) => void }) {
  return <div className="calibration-choice"><span>{label}</span><div>{options.map(([id, text]) => <button key={id} className={value === id ? "selected" : ""} onClick={() => onChange(id)}>{text}</button>)}</div></div>;
}
