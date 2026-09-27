import { CheckCircle, Target } from "@phosphor-icons/react";
import { useState } from "react";
import type { BakeCalibration, Recipe } from "../domain/types";
import { NumberField } from "./Fields";

/** Registra l’esito reale di una pizza già cotta per tarare le previsioni del forno. */
export function OvenCalibration({
  recipe,
  calibration,
  onSave,
}: {
  recipe: Recipe;
  calibration?: BakeCalibration;
  onSave: (calibration: BakeCalibration) => void;
}) {
  const c = recipe.config;
  const [actualMinutes, setActualMinutes] = useState(calibration?.actualMinutes ?? c.bakeMinutes);
  const [crust, setCrust] = useState<BakeCalibration["crust"]>(calibration?.crust ?? "good");
  const [crumb, setCrumb] = useState<BakeCalibration["crumb"]>(calibration?.crumb ?? "good");
  const [base, setBase] = useState<BakeCalibration["base"]>(calibration?.base ?? "good");
  return (
    <details className="oven-calibration" open={!calibration}>
      <summary>
        <span>Taratura del forno</span>
        {calibration && <em className="optional-badge saved-badge"><CheckCircle weight="fill" /> Registrata</em>}
      </summary>
      <div className="oven-calibration-body">
        <p className="calibration-intro">
          <Target /> <span>Com’è andata davvero la cottura? PizzaLab usa queste risposte per correggere le previsioni di questo forno ({c.ovenTemp} °C, {c.bakeMinutes.toLocaleString("it-IT", { maximumFractionDigits: 2 })} min previsti).</span>
        </p>
        <div className="calibration-form">
          <NumberField label="Tempo realmente usato" value={actualMinutes} onChange={setActualMinutes} min={0.5} max={60} step={c.ovenTemp >= 350 ? 0.25 : 1} unit="min" />
          <CalibrationChoice label="Crosta" value={crust} options={[["pale", "Pallida"], ["good", "Giusta"], ["dark", "Scura"]]} onChange={setCrust} />
          <CalibrationChoice label="Mollica" value={crumb} options={[["raw", "Umida"], ["good", "Giusta"], ["dry", "Asciutta"]]} onChange={setCrumb} />
          <CalibrationChoice label="Fondo" value={base} options={[["pale", "Pallido"], ["good", "Giusto"], ["dark", "Scuro"]]} onChange={setBase} />
        </div>
        <button
          className="button primary full"
          onClick={() =>
            onSave({
              id: calibration?.id ?? crypto.randomUUID(),
              createdAt: new Date().toISOString(),
              ovenType: c.ovenType,
              flourId: c.flourId,
              plannedMinutes: c.bakeMinutes,
              actualMinutes,
              crust,
              crumb,
              base,
            })
          }
        >
          {calibration ? "Aggiorna la taratura" : "Salva risultato reale"}
        </button>
      </div>
    </details>
  );
}

function CalibrationChoice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (value: T) => void }) {
  return <div className="calibration-choice"><span>{label}</span><div>{options.map(([id, text]) => <button key={id} className={value === id ? "selected" : ""} aria-pressed={value === id} onClick={() => onChange(id)}>{text}</button>)}</div></div>;
}
