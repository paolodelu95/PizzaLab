import { t, msg } from "../i18n";
import { useEffect, useRef, useState } from "react";
import {
  ArrowSquareOut,
  Bug,
  BellRinging,
  CheckCircle,
  Export,
  Fire,
  Gear,
  Oven,
  Play,
  Plus,
  Ruler,
  Translate,
  ShieldCheck,
  Trash,
  UploadSimple,
  Warning,
  Wrench,
} from "@phosphor-icons/react";
import { bakeSurfaceLabels } from "../domain/calculator";
import { recipeStatus } from "../domain/recipes";
import type { DoughConfig, Flour, Recipe, StoredState, UserOven, UserPan } from "../domain/types";
import { ovenById } from "../data/ovens";
import { UserPans } from "./UserPans";
import { InstallPrompt } from "./InstallPrompt";
import { isNativeApp, usesCalendarReminders } from "../services/platform";
import { askExactReminders, exactRemindersAllowed } from "../services/notifications";
import { SelectSheet } from "./SelectSheet";
import { NumberField } from "./Fields";
import type { Language } from "../i18n";
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
  reportUrl: string;
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
  language: Language;
  onLanguageChange: (language: Language) => void;
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
    [msg("Lieviti madre"), state.sourdoughProfiles.length],
    [msg("Farine personali"), state.customFlours.length],
    [msg("Tarature del forno"), state.bakeCalibrations.length],
  ] as const;

  return (
    <>
      <div className="page-heading profile-heading">
        <div>
          <span className="eyebrow">{t("Il tuo profilo")}</span>
          <h1>{name.trim() ? t("Ciao, {v}.", { v: name.trim().split(/\s+/)[0] }) : t("Il tuo profilo.")}</h1>
          <p>{t("Salva qui una volta sola la tua cucina: forni, teglie e impastatrice li ritrovi già pronti a ogni impasto.")}</p>
        </div>
        <div className="heading-illustration profile-avatar-large" aria-hidden="true">
          {initials(name) || <Gear weight="duotone" />}
        </div>
      </div>

      <section className="panel profile-card">
        <div className="profile-card-top">
          <div className="profile-avatar" aria-hidden="true">{initials(name) || "?"}</div>
          <label className="field">
            {t("Come ti chiami?")}
            <input value={name} maxLength={40} placeholder={t("Il tuo nome")} onChange={(event) => props.onNameChange(event.target.value)} />
          </label>
        </div>
      </section>

      <div className="profile-group-title">
        <h2>{t("La tua cucina")}</h2>
        <span>{t("Quello che salvi qui compare come scelta rapida nei passaggi dell’impasto.")}</span>
      </div>

      <UserOvens ovens={ovens} config={config} onAdd={props.onAddOven} onDelete={props.onDeleteOven} onUse={props.onUseOven} />

      <UserPans pans={pans} config={config} onAdd={props.onAddPan} onDelete={props.onDeletePan} onUse={props.onUsePan} />

      <section className="panel kneading-panel" aria-labelledby="kneading-title">
        <div className="panel-title">
          <span className="section-icon"><Wrench /></span>
          <div>
            <h2 id="kneading-title">{t("Come impasti")}</h2>
            <p>{t("Serve a calcolare la temperatura dell’acqua e, per la planetaria, a suggerirti velocità e tempi.")}</p>
          </div>
        </div>
        <div className="field-grid">
          <SelectSheet
            label={t("Lavorazione")}
            help="lavorazione"
            value={config.mixer}
            options={mixerOptions}
            onChange={(mixer) => props.onMixerChange({ mixer, mixerProfileId: config.mixerProfileId })}
          />
          {config.mixer === "stand" && (
            <SelectSheet
              label={t("La tua planetaria")}
              value={config.mixerProfileId || planetaryOptions[0].value}
              options={planetaryOptions}
              onChange={(mixerProfileId) => props.onMixerChange({ mixer: config.mixer, mixerProfileId })}
            />
          )}
        </div>
      </section>

      <div className="profile-group-title">
        <h2>{t("Preferenze")}</h2>
        <span>{t("Lingua, unità e avvisi valgono per tutta l’app.")}</span>
      </div>

      <section className="panel units-panel" aria-labelledby="language-title">
        <div className="panel-title">
          <span className="section-icon"><Translate /></span>
          <div>
            <h2 id="language-title">{t("Lingua · Language")}</h2>
          </div>
        </div>
        <div className="lead-options" role="radiogroup" aria-label={t("Lingua · Language")}>
          <div>
            {([["it", msg("Italiano")], ["en", msg("English")]] as const).map(([value, label]) => (
              <button
                key={value}
                role="radio"
                aria-checked={props.language === value}
                className={props.language === value ? "selected" : ""}
                onClick={() => props.onLanguageChange(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="panel units-panel" aria-labelledby="units-title">
        <div className="panel-title">
          <span className="section-icon"><Ruler /></span>
          <div>
            <h2 id="units-title">{t("Unità di misura")}</h2>
            <p>{t("Scegli come vedere pesi e temperature. Le ricette restano salvate in grammi e °C: puoi cambiare quando vuoi, senza perdere nulla.")}</p>
          </div>
        </div>
        {([
          ["weight", msg("Peso"), [["g", msg("Grammi (g)")], ["oz", msg("Once (oz)")]]],
          ["temp", msg("Temperatura"), [["C", msg("Celsius (°C)")], ["F", msg("Fahrenheit (°F)")]]],
        ] as const).map(([key, title, options]) => {
          const units = normalizeUnits(state.units);
          return (
            <div key={key} className="lead-options" role="radiogroup" aria-label={t(title)}>
              <span>{t(title)}</span>
              <div>
                {options.map(([value, label]) => (
                  <button
                    key={value}
                    role="radio"
                    aria-checked={units[key] === value}
                    className={units[key] === value ? "selected" : ""}
                    onClick={() => props.onUnitsChange({ [key]: value } as Partial<Units>)}
                  >
                    {t(label)}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {normalizeUnits(state.units).weight === "oz" && (
          <small>{t("Le quantità sotto i 5 g (lievito, malto) restano in grammi: in once sarebbero illeggibili. Teglie e superfici restano in centimetri.")}</small>
        )}
      </section>

      <section className="panel notifications-panel" aria-labelledby="notifications-title">
        <div className="panel-title">
          <span className="section-icon"><BellRinging /></span>
          <div>
            <h2 id="notifications-title">{t("Notifiche")}</h2>
            <p>
              {usesCalendarReminders()
                ? t("Su iPhone e nel browser gli avvisi arrivano dal Calendario del telefono: dalla pizza in corso premi «Aggiungi al calendario». L’anticipo che scegli qui vale per quegli eventi.")
                : t("Sono normali notifiche del telefono: non creano promemoria né eventi nel calendario.")}
            </p>
          </div>
        </div>
        <div className="lead-options" role="radiogroup" aria-label={t("Quando avvisarti")}>
          <span>{t("Avvisami")}</span>
          <div>
            {[0, 5, 10, 15, 30].map((minutes) => (
              <button
                key={minutes}
                role="radio"
                aria-checked={(state.reminderLeadMinutes ?? 0) === minutes}
                className={(state.reminderLeadMinutes ?? 0) === minutes ? "selected" : ""}
                onClick={() => props.onLeadChange(minutes)}
              >
                {minutes === 0 ? t("All’orario esatto") : t("{minutes} min prima", { minutes })}
              </button>
            ))}
          </div>
        </div>
        <small>{t("Vale per le fasi dell’impasto e per i rinfreschi del lievito madre. Le notifiche già programmate si aggiornano da sole.")}</small>
        <ExactReminders />
      </section>

      <section className="profile-stats" aria-labelledby="stats-title">
        <div className="section-title">
          <h2 id="stats-title">{t("Le tue statistiche")}</h2>
          <span>{state.recipes.length} {state.recipes.length === 1 ? t("pizza nel diario") : t("pizze nel diario")}</span>
        </div>
        <div className="stat-grid">
          {([[msg("sfornate"), counts.past], [msg("in corso"), counts.active], [msg("salvate"), counts.saved]] as const).map(([label, value]) => (
            <div key={label}>
              <strong>{value}</strong>
              <span>{t(label)}</span>
            </div>
          ))}
          {stats.map(([label, value]) => (
            <div key={label}>
              <strong>{value}</strong>
              <span>{t(label)}</span>
            </div>
          ))}
        </div>
      </section>
      {past.length > 0 ? (
        <InsightsDashboard recipes={past} flours={flours} />
      ) : (
        <p className="small-muted profile-empty-stats">{t("Quando concludi le prime pizze qui compaiono idratazione media, tempi e lo stile che prepari di più.")}</p>
      )}

      <InstallPrompt always />

      <div className="profile-group-title">
        <h2>{t("Aiuto e dati")}</h2>
        <span>
          {usesCalendarReminders()
            ? t("Nel browser i dati restano su questo telefono: esporta ogni tanto una copia del diario, così non la perdi se svuoti i dati di Safari.")
            : t("Salva una copia del diario o spostalo su un altro telefono.")}
        </span>
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
      <section className="help-actions settings-panel" aria-label={t("Aiuto e dati")}>
        <a className="help-action" href={props.reportUrl}>
          <Bug /><span><strong>{t("Segnala un problema")}</strong><small>{t("Si apre una mail già pronta: scrivi solo cosa è successo.")}</small></span>
        </a>
        <button className="help-action" onClick={props.onShowTutorial}>
          <Play /><span><strong>{t("Rivedi il tutorial")}</strong><small>{t("Rivedi in un minuto come funziona l’app.")}</small></span>
        </button>
        <button className="help-action" disabled={!state.recipes.length} onClick={props.onExport}>
          <Export /><span><strong>{t("Esporta il diario")}</strong><small>{t("Un file con ricette, note e tarature.")}</small></span>
        </button>
        <button className="help-action" onClick={() => importRef.current?.click()}>
          <UploadSimple /><span><strong>{t("Importa un backup")}</strong><small>{t("Riprendi un diario esportato in precedenza.")}</small></span>
        </button>
        <a className="help-action" href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">
          <ShieldCheck /><span><strong>{t("Informativa sulla privacy")}</strong><small>{t("Nessun account, dati solo sul dispositivo")}</small></span><ArrowSquareOut className="help-action-out" />
        </a>
      </section>
      <small className="app-version">PizzaLab {props.version} {t("· nessun account, dati solo sul dispositivo")}</small>

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
  const [adding, setAdding] = useState(false);
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
          <h2 id="ovens-title">{t("I tuoi forni")}</h2>
          <p>{t("Salva il forno o i forni che usi, con la temperatura che raggiungono davvero. Li ritrovi nel passaggio Cottura.")}</p>
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
                  <span>{t(info.name)} {t("· fino a")} {formatTemp(oven.temp)} · {bakeSurfaceLabels[oven.bakeSurface].toLowerCase()}</span>
                </div>
                <button className={`button ${inUse ? "selected" : "secondary"}`} onClick={() => onUse(oven)}>
                  {inUse ? <><CheckCircle /> {t("In uso")}</> : t("Usa")}
                </button>
                <button className="icon-button" aria-label={t("Elimina forno {name}", { name: oven.name })} onClick={() => onDelete(oven.id)}>
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
              label={t("Modello o tipo di forno")}
              value={model}
              options={ovenOptions()}
              searchPlaceholder={t("Cerca Ariete, Ooni, legna…")}
              onChange={chooseModel}
            />
            <label className="field">
              {t("Nome")}
              <input value={name} maxLength={40} placeholder={t(modelInfo.name)} onChange={(event) => setName(event.target.value)} />
            </label>
            <NumberField
              label={t("Temperatura massima reale")}
              value={temp}
              onChange={setTemp}
              min={150}
              max={550}
              step={5}
              quantity="temp"
              hint={t("Dichiarata dal produttore: {formatTemp}. Se hai un termometro, metti quella misurata.", { formatTemp: formatTemp(modelInfo.maxTemp) })}
            />
            <SelectSheet
              label={t("Supporto di cottura")}
              help="supporto"
              value={surface}
              options={surfaceOptions}
              onChange={setSurface}
            />
          </div>
          <p className="oven-form-note">{localizeTemperatures(t(modelInfo.note))}</p>
          <div className="oven-form-actions">
            <button type="button" className="button secondary" onClick={() => setAdding(false)}>{t("Annulla")}</button>
            <button type="submit" className="button primary"><Plus /> {t("Salva il forno")}</button>
          </div>
        </form>
      ) : (
        <>
          {ovens.length === 0 && <p className="small-muted">{t("Nessun forno salvato: aggiungilo una volta e lo ritrovi pronto in Cottura.")}</p>}
          <button className={`button ${ovens.length ? "secondary" : "primary"}`} onClick={() => setAdding(true)}>
            <Plus /> {t("Aggiungi un forno")}
          </button>
        </>
      )}
    </section>
  );
}

/** Solo su Android: senza «Sveglie e promemoria» gli avvisi ad app chiusa possono arrivare con ore di ritardo. */
function ExactReminders() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    if (!isNativeApp()) return;
    const check = () => void exactRemindersAllowed().then(setAllowed);
    check();
    // Tornando dalle impostazioni di sistema, rilegge lo stato.
    document.addEventListener("visibilitychange", check);
    return () => document.removeEventListener("visibilitychange", check);
  }, []);
  if (allowed === null) return null;
  return (
    <div className={`exact-reminders ${allowed ? "ok" : "off"}`}>
      {allowed ? <CheckCircle weight="fill" /> : <Warning weight="fill" />}
      <div>
        <strong>{allowed ? t("Avvisi puntuali attivi") : t("Avvisi puntuali non attivi")}</strong>
        <p>
          {allowed
            ? t("Le notifiche arrivano all’orario giusto anche ad app chiusa. Se il telefono le blocca lo stesso, togli PizzaLab dalle app in sospensione o dall’ottimizzazione della batteria.")
            : t("Ad app chiusa Android può rimandare le notifiche anche di ore. Attiva «Sveglie e promemoria» per PizzaLab: serve solo a far suonare gli avvisi in orario.")}
        </p>
        {!allowed && (
          <button className="button primary" onClick={() => void askExactReminders().then(setAllowed)}>
            <BellRinging /> {t("Attiva gli avvisi puntuali")}
          </button>
        )}
      </div>
    </div>
  );
}
