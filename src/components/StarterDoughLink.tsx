import { Alarm, ArrowRight, Jar, Warning } from "@phosphor-icons/react";
import type { DoughConfig, SourdoughProfile } from "../domain/types";

const dateLabel = (date: Date) => date.toLocaleString("it-IT", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function StarterDoughLink({ profiles, config, starterGrams, onUpdate, onManage }: {
  profiles: SourdoughProfile[];
  config: DoughConfig;
  starterGrams: number;
  onUpdate: (patch: Partial<DoughConfig>) => void;
  onManage: () => void;
}) {
  const selected = profiles.find((profile) => profile.id === config.sourdoughProfileId);
  if (!profiles.length) return <section className="starter-link empty"><Jar /><div><strong>Non hai ancora un lievito collegabile</strong><p>Crea un Li.Co.Li. o una pasta madre e PizzaLab preparerà i rinfreschi per questo impasto.</p></div><button className="button secondary" onClick={onManage}>Crea lievito <ArrowRight /></button></section>;
  const warmHours = config.bulkHours + config.coldHours + config.proofHours;
  const mixAt = new Date(new Date(config.bakeAt).getTime() - warmHours * 3600000 - 20 * 60000);
  const peakHours = selected ? ({ 1: 6, 2: 8, 4: 12 }[selected.feedRatio] * Math.pow(2, (24 - selected.temperature) / 10)) : 6;
  const refreshAt = new Date(mixAt.getTime() - peakHours * 3600000);
  const desiredTotal = selected ? starterGrams + selected.starterGrams : starterGrams;
  const multiplier = selected ? 1 + selected.feedRatio + selected.feedRatio * (selected.kind === "licoli" ? 1 : 0.5) : 3;
  const seed = desiredTotal / multiplier;
  const flour = selected ? seed * selected.feedRatio : 0;
  const water = selected ? flour * (selected.kind === "licoli" ? 1 : 0.5) : 0;
  return <section className="starter-link">
    <div className="starter-link-heading"><Jar /><div><span className="eyebrow">DAL TUO LIEVITO ALL’IMPASTO</span><h3>Scegli la coltura da usare</h3></div></div>
    <div className="starter-link-options">{profiles.map((profile) => <button key={profile.id} className={selected?.id === profile.id ? "selected" : ""} onClick={() => onUpdate({ sourdoughProfileId: profile.id, yeast: profile.kind === "licoli" ? "licoli" : "sourdough", starterHydration: profile.kind === "licoli" ? 100 : 50, preferment: "none" })}><Jar weight={selected?.id === profile.id ? "fill" : "duotone"} /><span><strong>{profile.name}</strong><small>{profile.kind === "licoli" ? "Li.Co.Li." : "Pasta madre"} · {profile.phase === "mature" ? "maturo" : "in consolidamento"}</small></span></button>)}</div>
    {selected && <div className="starter-build">
      {selected.phase !== "mature" && <div className="starter-build-warning"><Warning /><span>Questa coltura non ha ancora completato tre crescite efficaci consecutive: controlla attentamente il volume.</span></div>}
      <div className="starter-build-grid"><div><span>Da usare nell’impasto</span><strong>{Math.round(starterGrams)} g</strong></div><div><span>Rinfresco preparatorio</span><strong>{Math.round(seed)} + {Math.round(flour)} + {Math.round(water)} g</strong><small>madre + farina + acqua</small></div></div>
      <div className="starter-build-time"><Alarm /><div><span>Rinfresca indicativamente</span><strong>{dateLabel(refreshAt)}</strong><small>Picco stimato vicino all’impasto delle {dateLabel(mixAt)}. Conferma sempre con volume e profumo reali.</small></div></div>
    </div>}
  </section>;
}
