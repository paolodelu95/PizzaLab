import { Target } from "@phosphor-icons/react";
import { useState } from "react";
import type { BakeCalibration, DoughConfig } from "../domain/types";
import { NumberField } from "./Fields";

export function OvenCalibration({
  config: c,
  calibrations,
  onUpdate,
  onAddCalibration,
}: {
  config: DoughConfig;
  calibrations: BakeCalibration[];
  onUpdate: (patch: Partial<DoughConfig>) => void;
  onAddCalibration: (calibration: BakeCalibration) => void;
}) {
  const [actualMinutes, setActualMinutes] = useState(c.bakeMinutes);
  const [crust, setCrust] = useState<BakeCalibration["crust"]>("good");
  const [crumb, setCrumb] = useState<BakeCalibration["crumb"]>("good");
  const [base, setBase] = useState<BakeCalibration["base"]>("good");
  const exact = calibrations.filter((item) => item.ovenType === c.ovenType && item.flourId === c.flourId);
  const relevant = exact.length ? exact : calibrations.filter((item) => item.ovenType === c.ovenType);
  const delta = relevant.length
    ? relevant.reduce((sum, item) => sum + item.actualMinutes - item.plannedMinutes + (item.crumb === "raw" ? 0.75 : item.crumb === "dry" ? -0.5 : 0), 0) / relevant.length
    : 0;
  const hint = relevant.some((item) => item.base === "pale")
    ? "Il fondo tende a restare pallido: prova un ripiano più basso o un supporto più conduttivo."
    : relevant.some((item) => item.base === "dark")
      ? "Il fondo tende a scurire: alza il ripiano o usa un supporto meno conduttivo."
      : relevant.some((item) => item.crust === "pale")
        ? "La crosta tende a restare chiara: termina più in alto o con grill controllato."
        : relevant.some((item) => item.crust === "dark")
          ? "La superficie colora presto: abbassa il ripiano nella prima parte della cottura."
          : "I risultati registrati sono equilibrati: la correzione riguarda soprattutto il tempo reale.";

  return (
    <section className="panel oven-calibration-lab">
      <div className="panel-title">
        <span className="section-icon"><Target /></span>
        <div><h2>Taratura del tuo forno</h2><p>Uno strumento del laboratorio, separato dalla ricetta che stai preparando.</p></div>
      </div>
      <p className="calibration-explainer">Dopo una cottura, registra il risultato reale. PizzaLab userà lo storico per suggerire correzioni alle prossime ricette con questo forno.</p>
      {relevant.length > 0 && <>
        <div className="personal-calibration"><Target /><div><span>{relevant.length} {relevant.length === 1 ? "prova confrontabile" : "prove confrontabili"}</span><strong>Correzione personale {delta >= 0 ? "+" : ""}{delta.toLocaleString("it-IT", { maximumFractionDigits: 1 })} min</strong><small>{exact.length ? "Stesso forno e stessa farina" : "Basata sullo stesso forno"}</small></div><button className="button secondary" onClick={() => onUpdate({ bakeMinutes: Math.max(0.5, Math.min(60, c.bakeMinutes + delta)) })}>Applica alla prossima ricetta</button></div>
        <p className="calibration-hint">{hint}</p>
      </>}
      <div className="calibration-form">
        <NumberField label="Tempo realmente usato" value={actualMinutes} onChange={setActualMinutes} min={0.5} max={60} step={c.ovenTemp >= 350 ? 0.25 : 1} unit="min" />
        <CalibrationChoice label="Crosta" value={crust} options={[["pale", "Pallida"], ["good", "Giusta"], ["dark", "Scura"]]} onChange={setCrust} />
        <CalibrationChoice label="Mollica" value={crumb} options={[["raw", "Umida"], ["good", "Giusta"], ["dry", "Asciutta"]]} onChange={setCrumb} />
        <CalibrationChoice label="Fondo" value={base} options={[["pale", "Pallido"], ["good", "Giusto"], ["dark", "Scuro"]]} onChange={setBase} />
      </div>
      <button className="button primary full" onClick={() => onAddCalibration({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ovenType: c.ovenType, flourId: c.flourId, plannedMinutes: c.bakeMinutes, actualMinutes, crust, crumb, base })}>Salva prova forno</button>
    </section>
  );
}

function CalibrationChoice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (value: T) => void }) {
  return <div className="calibration-choice"><span>{label}</span><div>{options.map(([id, text]) => <button key={id} className={value === id ? "selected" : ""} onClick={() => onChange(id)}>{text}</button>)}</div></div>;
}
