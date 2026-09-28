import { useRef, useState } from "react";
import {
  ArrowSquareOut,
  CheckCircle,
  Export,
  Fire,
  Gear,
  Oven,
  Play,
  Plus,
  ShieldCheck,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react";
import { bakeSurfaceLabels } from "../domain/calculator";
import { recipeStatus } from "../domain/recipes";
import type { DoughConfig, EquipmentProfile, Flour, Recipe, StoredState, UserOven } from "../domain/types";
import { ovenById, ovenProfiles } from "../data/ovens";
import { EquipmentProfiles } from "./EquipmentProfiles";
import { InsightsDashboard } from "./InsightsDashboard";
import { SupportCard } from "./SupportCard";

const surfaces = Object.entries(bakeSurfaceLabels) as [DoughConfig["bakeSurface"], string][];
const PRIVACY_URL = "https://paolodelu95.github.io/PizzaLab/privacy/";

type Props = {
  state: StoredState;
  flours: Flour[];
  now: number;
  config: DoughConfig;
  version: string;
  onNameChange: (name: string) => void;
  onAddOven: (oven: UserOven) => void;
  onDeleteOven: (id: string) => void;
  onUseOven: (oven: UserOven) => void;
  onSaveEquipment: (name: string) => void;
  onLoadEquipment: (profile: EquipmentProfile) => void;
  onDeleteEquipment: (id: string) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onShowTutorial: () => void;
};

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

export function ProfilePage(props: Props) {
  const { state, flours, now, config } = props;
  const importRef = useRef<HTMLInputElement>(null);
  const name = state.profileName ?? "";
  const ovens = state.userOvens ?? [];
  const counts = { active: 0, saved: 0, past: 0 };
  for (const recipe of state.recipes) counts[recipeStatus(recipe, state.activeId, now)] += 1;
  const past: Recipe[] = state.recipes.filter((recipe) => recipeStatus(recipe, state.activeId, now) === "past");
  const stats = [
    ["Pizze sfornate", counts.past],
    ["In corso", counts.active],
    ["Salvate", counts.saved],
    ["Lieviti madre", state.sourdoughProfiles.length],
    ["Farine personali", state.customFlours.length],
    ["Tarature forno", state.bakeCalibrations.length],
  ] as const;

  return (
    <>
      <div className="page-heading profile-heading">
        <div>
          <span className="eyebrow">Il tuo profilo</span>
          <h1>{name.trim() ? `Ciao, ${name.trim().split(/\s+/)[0]}.` : "Il tuo profilo."}</h1>
          <p>Il tuo nome, i tuoi forni, l’attrezzatura, le statistiche e le impostazioni, tutto in un posto.</p>
        </div>
        <div className="heading-illustration profile-avatar-large" aria-hidden="true">
          {initials(name) || <Gear weight="duotone" />}
        </div>
      </div>

      <section className="panel profile-card">
        <div className="profile-avatar" aria-hidden="true">{initials(name) || "?"}</div>
        <label className="field">
          Come ti chiami?
          <input value={name} maxLength={40} placeholder="Il tuo nome" onChange={(event) => props.onNameChange(event.target.value)} />
          <small>Serve solo per salutarti: resta sul telefono, come tutto il resto.</small>
        </label>
      </section>

      <section className="profile-stats" aria-labelledby="stats-title">
        <div className="section-title">
          <h2 id="stats-title">Le tue statistiche</h2>
          <span>{state.recipes.length} {state.recipes.length === 1 ? "pizza nel diario" : "pizze nel diario"}</span>
        </div>
        <div className="stat-grid">
          {stats.map(([label, value]) => (
            <div key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>
      {past.length > 0 && <InsightsDashboard recipes={past} flours={flours} />}

      <UserOvens ovens={ovens} config={config} onAdd={props.onAddOven} onDelete={props.onDeleteOven} onUse={props.onUseOven} />

      <EquipmentProfiles
        profiles={state.equipmentProfiles}
        onSave={props.onSaveEquipment}
        onLoad={props.onLoadEquipment}
        onDelete={props.onDeleteEquipment}
      />

      <section className="panel settings-panel">
        <div className="panel-title">
          <span className="section-icon"><Gear /></span>
          <div>
            <h2>Backup e impostazioni</h2>
            <p>Salva una copia del diario o spostalo su un altro telefono.</p>
          </div>
        </div>
        <input
          ref={importRef}
          hidden
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) props.onImport(file);
            event.target.value = "";
          }}
        />
        <div className="settings-actions">
          <button className="button secondary" disabled={!state.recipes.length} onClick={props.onExport}>
            <Export /> Esporta il diario
          </button>
          <button className="button secondary" onClick={() => importRef.current?.click()}>
            <UploadSimple /> Importa un backup
          </button>
          <button className="button secondary" onClick={props.onShowTutorial}>
            <Play /> Rivedi il tutorial
          </button>
          <a className="button secondary" href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">
            <ShieldCheck /> Informativa sulla privacy <ArrowSquareOut />
          </a>
        </div>
        <small className="app-version">PizzaLab {props.version} · nessun account, dati solo sul dispositivo</small>
      </section>

      <SupportCard />
    </>
  );
}

function UserOvens({
  ovens,
  config,
  onAdd,
  onDelete,
  onUse,
}: {
  ovens: UserOven[];
  config: DoughConfig;
  onAdd: (oven: UserOven) => void;
  onDelete: (id: string) => void;
  onUse: (oven: UserOven) => void;
}) {
  const [adding, setAdding] = useState(ovens.length === 0);
  const [model, setModel] = useState(config.ovenType);
  const modelInfo = ovenById(model);
  const [name, setName] = useState("");
  const [temp, setTemp] = useState(modelInfo.maxTemp);
  const [surface, setSurface] = useState<DoughConfig["bakeSurface"]>(modelInfo.surface ?? config.bakeSurface);
  const chooseModel = (id: string) => {
    const next = ovenById(id);
    setModel(id);
    setTemp(next.maxTemp);
    setSurface(next.surface ?? "stone");
  };
  return (
    <section className="panel user-ovens" aria-labelledby="ovens-title">
      <div className="panel-title">
        <span className="section-icon"><Oven /></span>
        <div>
          <h2 id="ovens-title">I tuoi forni</h2>
          <p>Salva il forno o i forni che usi, con la temperatura che raggiungono davvero. Li ritrovi nel passaggio Cottura.</p>
        </div>
      </div>
      {ovens.length > 0 && (
        <div className="oven-list">
          {ovens.map((oven) => {
            const info = ovenById(oven.ovenType);
            const inUse = config.ovenType === oven.ovenType && config.ovenTemp === oven.temp;
            return (
              <article key={oven.id} className={inUse ? "in-use" : ""}>
                <span className="oven-icon" aria-hidden="true"><Fire weight="duotone" /></span>
                <div>
                  <strong>{oven.name}</strong>
                  <span>{info.name} · fino a {oven.temp} °C · {bakeSurfaceLabels[oven.bakeSurface].toLowerCase()}</span>
                </div>
                <button className={`button ${inUse ? "selected" : "secondary"}`} onClick={() => onUse(oven)}>
                  {inUse ? <><CheckCircle /> In uso</> : "Usa"}
                </button>
                <button className="icon-button" aria-label={`Elimina forno ${oven.name}`} onClick={() => onDelete(oven.id)}>
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
            onAdd({
              id: crypto.randomUUID(),
              name: name.trim() || modelInfo.name,
              ovenType: model,
              temp: Math.max(150, Math.min(550, temp || modelInfo.maxTemp)),
              bakeSurface: surface,
              createdAt: new Date().toISOString(),
            });
            setName("");
            setAdding(false);
          }}
        >
          <div className="field-grid">
            <label className="field">
              Modello o tipo di forno
              <select value={model} onChange={(event) => chooseModel(event.target.value)}>
                <optgroup label="Tipi di forno">
                  {ovenProfiles.filter((item) => item.group === "generic").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </optgroup>
                <optgroup label="Forni per pizza">
                  {ovenProfiles.filter((item) => item.group === "pizza").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </optgroup>
              </select>
            </label>
            <label className="field">
              Nome
              <input value={name} maxLength={40} placeholder={modelInfo.name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="field">
              Temperatura massima reale
              <div className="number-input">
                <input type="number" inputMode="numeric" min={150} max={550} step={5} value={temp} onChange={(event) => setTemp(Number(event.target.value))} />
                <span>°C</span>
              </div>
              <small>Dichiarata dal produttore: {modelInfo.maxTemp} °C. Se hai un termometro, metti quella misurata.</small>
            </label>
            <label className="field">
              Supporto di cottura
              <select value={surface} onChange={(event) => setSurface(event.target.value as DoughConfig["bakeSurface"])}>
                {surfaces.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </label>
          </div>
          <p className="oven-form-note">{modelInfo.note}</p>
          <div className="oven-form-actions">
            {ovens.length > 0 && <button type="button" className="button secondary" onClick={() => setAdding(false)}>Annulla</button>}
            <button type="submit" className="button primary"><Plus /> Salva il forno</button>
          </div>
        </form>
      ) : (
        <button className="button secondary" onClick={() => setAdding(true)}>
          <Plus /> Aggiungi un forno
        </button>
      )}
    </section>
  );
}
