import { CheckCircle, Gauge, Thermometer } from "@phosphor-icons/react";
import { useState } from "react";
import type { DoughConfig } from "../domain/types";
import { SliderField } from "./Fields";
import { HelpTip } from "./HelpTip";

type Structure = "tight" | "elastic" | "weak";
export function FermentationCheck({ config, onUpdate, onApplied }: { config: DoughConfig; onUpdate: (patch: Partial<DoughConfig>) => void; onApplied?: () => void }) {
  const [rise, setRise] = useState(1.5);
  const [temperature, setTemperature] = useState(config.roomTemp);
  const [structure, setStructure] = useState<Structure>("elastic");
  const fast = rise >= 2 || structure === "weak" || temperature >= config.roomTemp + 2;
  const slow = rise < 1.35 || structure === "tight" || temperature <= config.roomTemp - 3;
  const status = fast ? ["Sta correndo", "Riduci il prossimo tratto caldo o anticipa il frigo."] : slow ? ["Serve più tempo", "Allunga l’appretto e tieni l’impasto coperto in un ambiente leggermente più tiepido."] : ["Sviluppo regolare", "Mantieni il piano e ricontrolla prima del passaggio successivo."];
  const apply = () => {
    if (fast) onUpdate(config.coldHours > 0 ? { bulkHours: Math.max(1, config.bulkHours - 0.5), coldHours: Math.min(96, config.coldHours + 0.5) } : { proofHours: Math.max(0.5, config.proofHours - 0.5) });
    else if (slow) onUpdate({ proofHours: Math.min(24, config.proofHours + 1) });
    onApplied?.();
  };
  return <section className="fermentation-check">
    <div className="panel-title"><span className="section-icon"><Gauge /></span><div><h2>Check di fermentazione <HelpTip topic="controllo" /></h2><p>Confronta ciò che vedi con il piano attivo.</p></div></div>
    <div className="fermentation-check-fields live-slider-fields"><SliderField label="Crescita osservata" value={rise} onChange={setRise} min={1} max={4} step={0.1} unit="×" /><SliderField label="Temperatura reale" value={temperature} onChange={setTemperature} min={5} max={40} step={0.5} unit="°C" /></div>
    <div className="structure-options"><span>Come lo senti?</span>{(["tight", "elastic", "weak"] as const).map((item) => <button key={item} className={structure === item ? "selected" : ""} onClick={() => setStructure(item)}>{item === "tight" ? "Tenace" : item === "elastic" ? "Elastico" : "Debole / cedevole"}</button>)}</div>
    <article className={fast ? "fast" : slow ? "slow" : "ok"}><Thermometer /><div><strong>{status[0]}</strong><p>{status[1]}</p></div></article>
    {(fast || slow) && <button className="button secondary full" onClick={apply}><CheckCircle /> Applica la correzione ai tempi</button>}
  </section>;
}
