import { useRef, useState } from "react";
import {
  ArrowSquareOut,
  BellRinging,
  CheckCircle,
  Export,
  Fire,
  Gear,
  Oven,
  Play,
  Plus,
  Ruler,
  ShieldCheck,
  Trash,
  UploadSimple,
  Wrench,
} from "@phosphor-icons/react";
import { bakeSurfaceLabels } from "../domain/calculator";
import { recipeStatus } from "../domain/recipes";
import type { DoughConfig, Flour, Recipe, StoredState, UserOven, UserPan } from "../domain/types";
import { ovenById } from "../data/ovens";
import { UserPans } from "./UserPans";
import { InstallPrompt } from "./InstallPrompt";
import { usesCalendarReminders } from "../services/platform";
import { SelectSheet } from "./SelectSheet";
import { NumberField } from "./Fields";
import { formatTemp, localizeTemperatures, normalizeUnits, type Units } from "../services/units";
import { mixerOptions, ovenOptions, planetaryOptions, surfaceOptions } from "../data/options";
import { InsightsDashboard } from "./InsightsDashboard";
import { SupportCard } from "./SupportCard";

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
  onAddPan: (pan: UserPan) => void;
  onDeletePan: (id: string) => void;
  onUsePan: (pan: UserPan) => void;
  onMixerChange: (patch: Pick<DoughConfig, "mixer" | "mixerProfileId">) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onShowTutorial: () => void;
  onLeadChange: (minutes: number) => void;
  onUnitsChange: (patch: Partial<Units>) => void;
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
  const pans = state.userPans ?? [];
  const counts = { active: 0, saved: 0, past: 0 };
  for (const recipe of state.recipes) counts[recipeStatus(recipe, state.activeId, now)] += 1;
  const past: Recipe[] = state.recipes.filter((recipe) => recipeStatus(recipe, state.activeId, now) === "past");
  const stats = [
    ["Lieviti madre", state.sourdoughProfiles.length],
    ["Farine personali", state.customFlours.length],
    ["Tarature del forno", state.bakeCalibrations.length],
  ] as const;

  return (
    <>
      <div className="page-heading profile-heading">
        <div>
          <span className="eyebrow">Il tuo profilo</span>
          <h1>{name.trim() ? `Ciao, ${name.trim().split(/\s+/)[0]}.` : "Il tuo profilo."}</h1>
          <p>Salva qui una volta sola la tua cucina: forni, teglie e impastatrice li ritrovi già pronti a ogni impasto.</p>
        </div>
        <div className="heading-illustration profile-avatar-large" aria-hidden="true">
          {initials(name) || <Gear weight="duotone" />}
        </div>
      </div>

      <section className="panel profile-card">
        <div className="profile-card-top">
          <div className="profile-avatar" aria-hidden="true">{initials(name) || "?"}</div>
          <label className="field">
            Come ti chiami?
            <input value={name} maxLength={40} placeholder="Il tuo nome" onChange={(event) => props.onNameChange(event.target.value)} />
          </label>
        </div>
        <div className="profile-summary" aria-label="Le tue pizze">
          <div><strong>{counts.past}</strong><span>sfornate</span></div>
          <div><strong>{counts.active}</strong><span>in corso</span></div>
          <div><strong>{counts.saved}</strong><span>salvate</span></div>
        </div>
      </section>

      <div className="profile-group-title">
        <h2>La tua cucina</h2>
        <span>Quello che salvi qui compare come scelta rapida nei passaggi dell’impasto.</span>
      </div>

      <UserOvens ovens={ovens} config={config} onAdd={props.onAddOven} onDelete={props.onDeleteOven} onUse={props.onUseOven} />

      <UserPans pans={pans} config={config} onAdd={props.onAddPan} onDelete={props.onDeletePan} onUse={props.onUsePan} />

      <section className="panel kneading-panel" aria-labelledby="kneading-title">
        <div className="panel-title">
          <span className="section-icon"><Wrench /></span>
          <div>
            <h2 id="kneading-title">Come impasti</h2>
            <p>Serve a calcolare la temperatura dell’acqua e, per la planetaria, a suggerirti velocità e tempi.</p>
          </div>
        </div>
        <div className="field-grid">
          <SelectSheet
            label="Lavorazione"
            help="lavorazione"
            value={config.mixer}
            options={mixerOptions}
            onChange={(mixer) => props.onMixerChange({ mixer, mixerProfileId: config.mixerProfileId })}
          />
          {config.mixer === "stand" && (
            <SelectSheet
              label="La tua planetaria"
              value={config.mixerProfileId || planetaryOptions[0].value}
              options={planetaryOptions}
              onChange={(mixerProfileId) => props.onMixerChange({ mixer: config.mixer, mixerProfileId })}
            />
          )}
        </div>
      </section>

      <section className="panel units-panel" aria-labelledby="units-title">
        <div className="panel-title">
          <span className="section-icon"><Ruler /></span>
          <div>
            <h2 id="units-title">Unità di misura</h2>
            <p>Scegli come vedere pesi e temperature. Le ricette restano salvate in grammi e °C: puoi cambiare quando vuoi, senza perdere nulla.</p>
          </div>
        </div>
        {([
          ["weight", "Peso", [["g", "Grammi (g)"], ["oz", "Once (oz)"]]],
          ["temp", "Temperatura", [["C", "Celsius (°C)"], ["F", "Fahrenheit (°F)"]]],
        ] as const).map(([key, title, options]) => {
          const units = normalizeUnits(state.units);
          return (
            <div key={key} className="lead-options" role="radiogroup" aria-label={title}>
              <span>{title}</span>
              <div>
                {options.map(([value, label]) => (
                  <button
                    key={value}
                    role="radio"
                    aria-checked={units[key] === value}
                    className={units[key] === value ? "selected" : ""}
                    onClick={() => props.onUnitsChange({ [key]: value } as Partial<Units>)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {normalizeUnits(state.units).weight === "oz" && (
          <small>Le quantità sotto i 5 g (lievito, malto) restano in grammi: in once sarebbero illeggibili. Teglie e superfici restano in centimetri.</small>
        )}
      </section>

      <section className="panel notifications-panel" aria-labelledby="notifications-title">
        <div className="panel-title">
          <span className="section-icon"><BellRinging /></span>
          <div>
            <h2 id="notifications-title">Notifiche</h2>
            <p>
              {usesCalendarReminders()
                ? "Su iPhone e nel browser gli avvisi arrivano dal Calendario del telefono: dalla pizza in corso premi «Aggiungi al calendario». L’anticipo che scegli qui vale per quegli eventi."
                : "Sono normali notifiche del telefono: non creano promemoria né eventi nel calendario."}
            </p>
          </div>
        </div>
        <div className="lead-options" role="radiogroup" aria-label="Quando avvisarti">
          <span>Avvisami</span>
          <div>
            {[0, 5, 10, 15, 30].map((minutes) => (
              <button
                key={minutes}
                role="radio"
                aria-checked={(state.reminderLeadMinutes ?? 0) === minutes}
                className={(state.reminderLeadMinutes ?? 0) === minutes ? "selected" : ""}
                onClick={() => props.onLeadChange(minutes)}
              >
                {minutes === 0 ? "All’orario esatto" : `${minutes} min prima`}
              </button>
            ))}
          </div>
        </div>
        <small>Vale per le fasi dell’impasto e per i rinfreschi del lievito madre. Le notifiche già programmate si aggiornano da sole.</small>
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
      {past.length > 0 ? (
        <InsightsDashboard recipes={past} flours={flours} />
      ) : (
        <p className="small-muted profile-empty-stats">Quando concludi le prime pizze qui compaiono idratazione media, tempi e lo stile che prepari di più.</p>
      )}

      <InstallPrompt always />

      <section className="panel settings-panel">
        <div className="panel-title">
          <span className="section-icon"><Gear /></span>
          <div>
            <h2>Backup e impostazioni</h2>
            <p>
              {usesCalendarReminders()
                ? "Nel browser i dati restano su questo telefono: esporta ogni tanto una copia del diario, così non la perdi se svuoti i dati di Safari."
                : "Salva una copia del diario o spostalo su un altro telefono."}
            </p>
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
                  <span>{info.name} · fino a {formatTemp(oven.temp)} · {bakeSurfaceLabels[oven.bakeSurface].toLowerCase()}</span>
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
            <SelectSheet
              label="Modello o tipo di forno"
              value={model}
              options={ovenOptions()}
              searchPlaceholder="Cerca Ariete, Ooni, legna…"
              onChange={chooseModel}
            />
            <label className="field">
              Nome
              <input value={name} maxLength={40} placeholder={modelInfo.name} onChange={(event) => setName(event.target.value)} />
            </label>
            <NumberField
              label="Temperatura massima reale"
              value={temp}
              onChange={setTemp}
              min={150}
              max={550}
              step={5}
              quantity="temp"
              hint={`Dichiarata dal produttore: ${formatTemp(modelInfo.maxTemp)}. Se hai un termometro, metti quella misurata.`}
            />
            <SelectSheet
              label="Supporto di cottura"
              help="supporto"
              value={surface}
              options={surfaceOptions}
              onChange={setSurface}
            />
          </div>
          <p className="oven-form-note">{localizeTemperatures(modelInfo.note)}</p>
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
