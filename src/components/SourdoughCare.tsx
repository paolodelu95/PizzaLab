import { useEffect, useState } from "react";
import {
  Alarm,
  BellRinging,
  CalendarPlus,
  CheckCircle,
  Clock,
  Flask,
  Jar,
  Leaf,
  Plus,
  ShieldCheck,
  Snowflake,
  Sparkle,
  Thermometer,
  Trash,
  Warning,
} from "@phosphor-icons/react";
import {
  starterFeedAmounts,
  starterIntervalHours,
  starterKindLabel,
} from "../domain/sourdough";
import type { SourdoughProfile, StarterFeeding } from "../domain/types";
import { NumberField } from "./Fields";
import { usesCalendarReminders } from "../services/platform";
import { HelpTip } from "./HelpTip";

const phaseCopy = {
  creating: ["Avvio della coltura", "La regolarità conta più della velocità."],
  strengthening: ["Consolidamento", "Cerchiamo una crescita forte e ripetibile."],
  mature: ["Lievito maturo", "Mantienilo o preparalo per il prossimo impasto."],
} as const;

const formatDate = (value: string) =>
  new Date(value).toLocaleString("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export function SourdoughCare({
  profiles,
  profile,
  now,
  onStart,
  onSelect,
  onDelete,
  onChange,
  onLog,
  onSchedule,
  onDisableReminders,
  onCalendar,
}: {
  profiles: SourdoughProfile[];
  profile: SourdoughProfile | null;
  now: number;
  onStart: (kind: SourdoughProfile["kind"], existing: boolean, name: string) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onChange: (profile: SourdoughProfile) => void;
  onLog: (feeding: StarterFeeding) => void;
  onSchedule: () => void;
  onDisableReminders: () => void;
  onCalendar: (profile: SourdoughProfile) => void;
}) {
  const [rise, setRise] = useState(2);
  const [peakHours, setPeakHours] = useState(6);
  const [feedTemp, setFeedTemp] = useState(24);
  const [notes, setNotes] = useState("");
  const [creatingNew, setCreatingNew] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    if (profile) setFeedTemp(profile.temperature);
  }, [profile?.kind]);

  const start = (kind: SourdoughProfile["kind"], existing: boolean) => {
    onStart(kind, existing, draftName);
    setCreatingNew(false);
    setDraftName("");
  };

  if (!profile || creatingNew)
    return (
      <div className="starter-page">
        <div className="page-heading starter-heading">
          <div>
            <span className="eyebrow">Lievito madre e Li.Co.Li.</span>
            <h1>Il tuo lievito.</h1>
            <p>Rinfreschi, crescita e promemoria della tua coltura, giorno dopo giorno.</p>
          </div>
          <div className="heading-illustration" aria-hidden="true"><Jar weight="duotone" /></div>
        </div>
        <section className="panel starter-name-card">
          <div className="panel-title">
            <span className="section-icon"><Jar /></span>
            <div>
              <h2>{profiles.length ? "Aggiungi un altro lievito." : "Coltiva il tuo lievito madre."}</h2>
              <p>Un percorso guidato dai primi rinfreschi fino a una coltura stabile, con dosi, osservazioni e promemoria personali.</p>
            </div>
          </div>
          <label className="field">Come vuoi chiamarlo?<input value={draftName} maxLength={40} onChange={(event) => setDraftName(event.target.value)} placeholder="Es. Gino, Madre 2026, Li.Co.Li. pizza" /></label>
          <p>Potrai cambiare il nome in qualsiasi momento.</p>
        </section>
        <div className="starter-kind-grid">
          {(["licoli", "solid"] as const).map((kind) => (
            <section className="panel starter-kind-card" key={kind}>
              <span className="section-icon">{kind === "licoli" ? <Flask /> : <Jar />}</span>
              <h2>{kind === "licoli" ? "Li.Co.Li." : "Pasta madre solida"}</h2>
              <p>{kind === "licoli" ? "Fluido, semplice da mescolare, idratazione 100%." : "Compatto, tradizionale, idratazione indicativa 50%."}</p>
              <div>
                <button className="button primary" onClick={() => start(kind, false)}>Inizia da zero</button>
                <button className="button secondary" onClick={() => start(kind, true)}>Ne ho già uno</button>
              </div>
            </section>
          ))}
        </div>
        <section className="starter-safety-note">
          <ShieldCheck /><div><strong>Metodo prudente</strong><p>L’app usa peso, crescita, odore e regolarità. Non suggerisce di assaggiare il lievito crudo e segnala quando è più sicuro eliminare la coltura.</p></div>
        </section>
        {profiles.length > 0 && <button className="button secondary" onClick={() => setCreatingNew(false)}>Annulla e torna ai miei lieviti</button>}
      </div>
    );

  const amounts = starterFeedAmounts(profile);
  const phase = phaseCopy[profile.phase];
  const remaining = new Date(profile.nextFeedAt).getTime() - now;
  const remainingHours = Math.max(0, Math.ceil(remaining / 3600000));
  const ageDays = Math.max(1, Math.floor((now - new Date(profile.startedAt).getTime()) / 86400000) + 1);
  const interval = starterIntervalHours(profile, new Date(now));

  const recordFeeding = () => {
    onLog({
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      starterGrams: amounts.starter,
      flourGrams: amounts.flour,
      waterGrams: amounts.water,
      temperature: feedTemp,
      rise,
      peakHours,
      notes: notes.trim(),
    });
    setNotes("");
  };

  return (
    <div className="starter-page">
      <div className="page-heading starter-heading">
        <div>
          <span className="eyebrow">Lievito madre e Li.Co.Li.</span>
          <h1>Il tuo lievito.</h1>
          <p>Rinfreschi, crescita e promemoria della tua coltura, giorno dopo giorno.</p>
        </div>
        <div className="heading-illustration" aria-hidden="true"><Jar weight="duotone" /></div>
      </div>
      <section className="starter-switcher" aria-label="I tuoi lieviti madre">
        <div><span className="eyebrow">I TUOI LIEVITI</span><strong>{profiles.length} {profiles.length === 1 ? "coltura" : "colture"}</strong></div>
        <div className="starter-switcher-list">
          {profiles.map((item) => <button key={item.id} className={item.id === profile.id ? "selected" : ""} onClick={() => { onSelect(item.id); setDeleteConfirm(false); }}><Jar weight={item.id === profile.id ? "fill" : "duotone"} /><span><strong>{item.name}</strong><small>{starterKindLabel(item.kind).split(" · ")[0]}</small></span></button>)}
          <button className="starter-add" onClick={() => setCreatingNew(true)}><Plus /><span><strong>Nuovo lievito</strong><small>Crea un’altra coltura</small></span></button>
        </div>
      </section>
      <section className="panel starter-hero">
        <div className="starter-hero-top">
          <span className="starter-hero-icon"><Jar weight="duotone" /></span>
          <div><span className="eyebrow">Giorno {ageDays}</span><h2>{profile.name}</h2><p>{starterKindLabel(profile.kind)}</p></div>
          <span className={`starter-phase ${profile.phase}`}>{phase[0]}</span>
        </div>
        <div className="starter-next">
          <div><Alarm /><span>Prossimo rinfresco</span><strong>{formatDate(profile.nextFeedAt)}</strong></div>
          <div><Clock /><span>Tra circa</span><strong>{remainingHours === 0 ? "ora" : `${remainingHours} ore`}</strong></div>
          <div><Sparkle /><span>Serie efficace</span><strong>{profile.readyStreak}/3</strong></div>
        </div>
        <p className="starter-phase-copy">{phase[1]} {profile.phase !== "mature" && "La maturità viene riconosciuta dopo tre rinfreschi consecutivi con almeno raddoppio in 3–8 ore."}</p>
      </section>

      <div className="starter-dashboard">
        <div className="starter-main-column">
          <section className="panel feed-card">
            <div className="panel-title"><span className="section-icon"><Leaf /></span><div><h2>Il prossimo rinfresco <HelpTip topic="rinfresco" /></h2><p>Rapporto e pesi calcolati per la gestione attuale.</p></div></div>
            <div className="feed-ratio-options">
              {([1, 2, 4] as const).map((ratio) => <button key={ratio} className={profile.feedRatio === ratio ? "selected" : ""} onClick={() => onChange({ ...profile, feedRatio: ratio })}><strong>1:{ratio}:{profile.kind === "licoli" ? ratio : ratio / 2}</strong><small>{ratio === 1 ? "rapido" : ratio === 2 ? "equilibrato" : "più lento"}</small></button>)}
            </div>
            <div className="feed-weights">
              <div><span>Lievito da tenere</span><strong>{amounts.starter} g</strong></div>
              <div><span>Farina nuova</span><strong>{amounts.flour} g</strong></div>
              <div><span>Acqua</span><strong>{amounts.water} g</strong></div>
              <div className="feed-total"><span>Totale dopo il rinfresco</span><strong>{amounts.total} g</strong></div>
            </div>
            <ol className="feed-steps">
              <li><span>1</span><p><strong>Tieni la quantità indicata</strong>Elimina o usa l’esubero solo in ricette che verranno cotte.</p></li>
              <li><span>2</span><p><strong>Aggiungi acqua e farina</strong>{profile.kind === "solid" ? "Impasta fino a una massa compatta e liscia." : "Mescola fino a non vedere grumi asciutti."}</p></li>
              <li><span>3</span><p><strong>Segna il livello iniziale</strong>Usa un contenitore pulito, trasparente e abbastanza capiente.</p></li>
              <li><span>4</span><p><strong>Osserva, non inseguire l’orologio</strong>Registra quando raggiunge il picco e se almeno raddoppia.</p></li>
            </ol>
          </section>

          <section className="panel starter-log-card">
            <div className="panel-title"><span className="section-icon"><Plus /></span><div><h2>Registra il rinfresco</h2><p>I dati reali fanno avanzare il percorso.</p></div></div>
            <div className="field-grid starter-observations">
              <NumberField help="crescita" label="Crescita massima" value={rise} onChange={setRise} min={1} max={5} step={0.1} unit="×" hint="2× significa raddoppio" />
              <NumberField label="Ore per il picco" value={peakHours} onChange={setPeakHours} min={1} max={48} step={0.5} unit="h" />
              <NumberField label="Temperatura osservata" value={feedTemp} onChange={setFeedTemp} min={10} max={35} step={0.5} unit="°C" />
              <label className="field">Odore e consistenza<input value={notes} maxLength={120} onChange={(event) => setNotes(event.target.value)} placeholder="Es. lattico, bolle fini, elastico" /></label>
            </div>
            <button className="button primary full record-feeding" onClick={recordFeeding}><CheckCircle /> Rinfresco fatto: registra e calcola il prossimo</button>
          </section>

          {profile.feedings.length > 0 && <section className="panel starter-history"><div className="panel-title"><span className="section-icon"><Clock /></span><div><h2>Diario attività</h2><p>Gli ultimi rinfreschi e la risposta della coltura.</p></div></div><div>{profile.feedings.slice(0, 8).map((feeding) => <article key={feeding.id} className={feeding.rise >= 2 && feeding.peakHours <= 8 ? "ready" : ""}><span>{new Date(feeding.at).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}</span><div><strong>{feeding.rise.toLocaleString("it-IT")}× in {feeding.peakHours.toLocaleString("it-IT")} h</strong><small>{feeding.starterGrams} g madre + {feeding.flourGrams} g farina + {feeding.waterGrams} g acqua · {feeding.temperature} °C</small>{feeding.notes && <p>{feeding.notes}</p>}</div>{feeding.rise >= 2 && feeding.peakHours <= 8 && <CheckCircle weight="fill" />}</article>)}</div></section>}
        </div>

        <aside className="starter-side-column">
          <section className="panel starter-settings">
            <div className="panel-title"><span className="section-icon"><BellRinging /></span><div><h2>Routine e notifiche</h2><p>Scegli l’orario che si adatta alla tua giornata.</p></div></div>
            <label className="field">Nome del lievito<input value={profile.name} maxLength={40} onChange={(event) => onChange({ ...profile, name: event.target.value })} /></label>
            <label className="field">Ora preferita<input type="time" value={profile.preferredTime} onChange={(event) => onChange({ ...profile, preferredTime: event.target.value })} /></label>
            <NumberField label="Lievito da mantenere" value={profile.starterGrams} onChange={(starterGrams) => onChange({ ...profile, starterGrams })} min={10} max={300} step={5} unit="g" />
            <NumberField label="Temperatura obiettivo" value={profile.temperature} onChange={(temperature) => onChange({ ...profile, temperature })} min={10} max={35} step={0.5} unit="°C" />
            <label className="field">Farina abituale<input value={profile.flourName} maxLength={60} onChange={(event) => onChange({ ...profile, flourName: event.target.value })} /></label>
            {profile.phase === "mature" && <div className="storage-choice"><span>Dove lo conservi?</span><button className={profile.storage === "room" ? "selected" : ""} onClick={() => onChange({ ...profile, storage: "room" })}><Thermometer /> Ambiente</button><button className={profile.storage === "fridge" ? "selected" : ""} onClick={() => onChange({ ...profile, storage: "fridge" })}><Snowflake /> Frigo</button></div>}
            <div className="routine-summary"><Clock /><div><strong>Ogni {interval === 168 ? "7 giorni" : `${interval} ore`}</strong><span>{profile.phase === "mature" && profile.storage === "fridge" ? "Mantenimento settimanale" : "Rinfresco a temperatura ambiente"}</span></div></div>
            {usesCalendarReminders() ? (
              <button className="button primary full" onClick={() => onCalendar(profile)}><CalendarPlus /> Aggiungi i rinfreschi al calendario</button>
            ) : profile.remindersEnabled ? <button className="button secondary full" onClick={onDisableReminders}>Disattiva promemoria</button> : <button className="button primary full" onClick={onSchedule}><BellRinging /> Attiva promemoria</button>}
            <small>Gli orari sono promemoria: se il lievito è ancora in piena crescita, osserva il picco prima di intervenire.</small>
            {!deleteConfirm ? <button className="starter-delete" onClick={() => setDeleteConfirm(true)}><Trash /> Elimina questo lievito</button> : <div className="starter-delete-confirm"><strong>Eliminare “{profile.name}”?</strong><p>Il diario e i promemoria di questa coltura verranno rimossi.</p><div><button className="button secondary" onClick={() => setDeleteConfirm(false)}>Annulla</button><button className="button danger" onClick={() => { onDelete(profile.id); setDeleteConfirm(false); }}>Elimina definitivamente</button></div></div>}
          </section>

          <section className="panel starter-roadmap">
            <h2>Percorso di maturazione</h2>
            {(["creating", "strengthening", "mature"] as const).map((item, index) => <div key={item} className={profile.phase === item ? "current" : (["creating", "strengthening", "mature"].indexOf(profile.phase) > index ? "done" : "")}><span>{index + 1}</span><p><strong>{phaseCopy[item][0]}</strong><small>{item === "creating" ? "Avvio e rinfreschi regolari" : item === "strengthening" ? "Crescita stabile e ripetibile" : "Mantenimento o preparazione all’uso"}</small></p></div>)}
          </section>

          <section className="panel starter-safety">
            <div className="panel-title"><span className="section-icon"><ShieldCheck /></span><div><h2>Controllo sicurezza</h2><p>Prima di ogni rinfresco.</p></div></div>
            <div className="safe-item"><CheckCircle /><p><strong>Normale</strong>Odore acidulo pulito, bolle, liquido grigio o scuro in superficie: segnala fame, non necessariamente deterioramento.</p></div>
            <div className="danger-item"><Warning /><p><strong>Elimina tutto</strong>Muffa pelosa, macchie rosa, arancioni o verdi, oppure odore putrido. Non recuperare una parte e non assaggiare.</p></div>
            <small>Usa utensili e contenitori puliti. Il lievito crudo non va assaggiato; la cottura resta essenziale.</small>
            <div className="starter-sources"><a href="https://extension.colostate.edu/resource/sourdough-starter-best-practices/" target="_blank" rel="noreferrer">Sicurezza · CSU Extension</a><a href="https://www.kingarthurbaking.com/learn/guides/sourdough/create" target="_blank" rel="noreferrer">Creazione · King Arthur</a></div>
          </section>
        </aside>
      </div>
    </div>
  );
}
