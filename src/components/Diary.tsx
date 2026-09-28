import { useState } from "react";
import {
  ArrowRight,
  Bell,
  BellSlash,
  CalendarBlank,
  CalendarCheck,
  CalendarPlus,
  Clock,
  CheckCircle,
  ClockCounterClockwise,
  FlagCheckered,
  Notebook,
  PencilSimple,
  Play,
  Scales as Scale,
  ShareNetwork,
  Star,
  Trash,
  Warning,
} from "@phosphor-icons/react";
import { buildTimeline, calculate } from "../domain/calculator";
import { styles } from "../domain/styles";
import { buildScaleItems, recipeStatus, startTiming, yeastLabel, type RecipeStatus } from "../domain/recipes";
import type { BakeCalibration, Flour, Recipe, Stage } from "../domain/types";
import { ActiveDoughJournal } from "./ActiveDoughJournal";
import { GuidedMode } from "./GuidedMode";
import { OvenCalibration } from "./OvenCalibration";
import { ScaleMode } from "./ScaleMode";
import { usesCalendarReminders } from "../services/platform";
import { SupportCard } from "./SupportCard";

export type DiaryView = RecipeStatus;

const fmt = (n: number, digits = 0) => n.toLocaleString("it-IT", { maximumFractionDigits: digits });
const dateLabel = (s: string) =>
  new Date(s).toLocaleString("it-IT", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const dayLabel = (s: string) =>
  new Date(s).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });

const views: { id: DiaryView; label: string; empty: [string, string] }[] = [
  {
    id: "active",
    label: "In corso",
    empty: [
      "Nessun impasto in corso",
      "Dal riepilogo o da una pizza salvata premi «Programma» (o «Inizia ora» se è già l’ora): qui troverai fasi, notifiche, bilancia e guida passo passo.",
    ],
  },
  {
    id: "saved",
    label: "Salvate",
    empty: [
      "Nessuna pizza salvata",
      "Nel quarto passaggio del tuo impasto scegli «Salva per dopo»: la ritrovi qui, pronta da iniziare quando vuoi.",
    ],
  },
  {
    id: "past",
    label: "Passate",
    empty: [
      "Ancora nessuna pizza sfornata",
      "Quando concludi un impasto in corso finisce qui: potrai dare un voto, annotare cosa cambiare e tarare il forno.",
    ],
  },
];

type Props = {
  recipes: Recipe[];
  activeId: string | null;
  flours: Flour[];
  now: number;
  busy: boolean;
  view: DiaryView;
  calibrations: BakeCalibration[];
  onViewChange: (view: DiaryView) => void;
  onNew: () => void;
  onStart: (recipe: Recipe) => void;
  onLateStart: (recipe: Recipe) => void;
  onStop: () => void;
  onFinish: (recipe: Recipe) => void;
  onEdit: (id: string, patch: Partial<Recipe>) => void;
  onDelete: (id: string) => void;
  onOpenInPlanner: (recipe: Recipe, mode: "edit" | "reschedule" | "copy") => void;
  onShare: (recipe: Recipe) => void;
  onCalendar: (recipe: Recipe) => void;
  onMessage: (message: string) => void;
  onSaveCalibration: (recipe: Recipe, calibration: BakeCalibration) => void;
};

export function Diary(props: Props) {
  const { recipes, activeId, flours, now, view, onViewChange } = props;
  const [tool, setTool] = useState<{ kind: "scale" | "guide"; recipe: Recipe } | null>(null);
  const grouped: Record<DiaryView, Recipe[]> = { active: [], saved: [], past: [] };
  for (const recipe of recipes) grouped[recipeStatus(recipe, activeId, now)].push(recipe);
  grouped.saved.sort((a, b) => Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)) || a.config.bakeAt.localeCompare(b.config.bakeAt));
  grouped.past.sort((a, b) => (b.finishedAt ?? b.config.bakeAt).localeCompare(a.finishedAt ?? a.config.bakeAt));
  const active = grouped.active[0];
  const current = views.find((item) => item.id === view)!;
  const toolResult = tool ? calculate(tool.recipe.config, flours) : null;

  return (
    <>
      <div className="page-heading diary-heading">
        <div>
          <span className="eyebrow">Ogni impasto insegna qualcosa</span>
          <h1>Il tuo diario di pizza.</h1>
          <p>Le pizze in lavorazione, quelle salvate per dopo e quelle già sfornate, ognuna al suo posto.</p>
        </div>
        <div className="heading-illustration" aria-hidden="true">
          <Notebook weight="duotone" />
        </div>
      </div>
      <div className="heading-actions page-tools-row diary-tools">
        <button className="button primary" onClick={props.onNew}>
          Nuovo impasto <ArrowRight />
        </button>
      </div>

      <div className="diary-tabs" role="tablist" aria-label="Sezioni del diario">
        {views.map((item) => (
          <button
            key={item.id}
            role="tab"
            id={`diary-tab-${item.id}`}
            aria-selected={view === item.id}
            aria-controls="diary-panel"
            className={view === item.id ? "selected" : ""}
            onClick={() => onViewChange(item.id)}
          >
            {item.id === "active" && grouped.active.length > 0 && <span className="live-dot" aria-hidden="true" />}
            {item.label}
            <span className="tab-count">{grouped[item.id].length}</span>
          </button>
        ))}
      </div>

      <section id="diary-panel" role="tabpanel" aria-labelledby={`diary-tab-${view}`} className="journal-list">
        {grouped[view].length === 0 ? (
          <div className="empty-state">
            {view === "past" ? <FlagCheckered size={48} weight="duotone" /> : view === "saved" ? <CalendarBlank size={48} weight="duotone" /> : <Notebook size={48} weight="duotone" />}
            <h2>{recipes.length === 0 ? "La prima pagina è tutta tua." : current.empty[0]}</h2>
            <p>{recipes.length === 0 ? "Progetta un impasto, poi nel riepilogo scegli se iniziarlo subito o salvarlo per dopo." : current.empty[1]}</p>
            <button className="button primary" onClick={props.onNew}>
              {recipes.length === 0 ? "Prepara il primo impasto" : "Progetta un nuovo impasto"} <ArrowRight />
            </button>
          </div>
        ) : view === "active" ? (
          grouped.active.map((recipe) => (
            <ActiveCard key={recipe.id} {...props} recipe={recipe} onTool={(kind) => setTool({ kind, recipe })} />
          ))
        ) : view === "saved" ? (
          grouped.saved.map((recipe) => <SavedCard key={recipe.id} {...props} recipe={recipe} activeRecipe={active} />)
        ) : (
          grouped.past.map((recipe) => <PastCard key={recipe.id} {...props} recipe={recipe} />)
        )}
      </section>

      {view === "past" && grouped.past.length > 0 && <SupportCard />}

      {tool?.kind === "guide" && (
        <GuidedMode title={tool.recipe.name} stages={buildTimeline(tool.recipe.config, flours)} onClose={() => setTool(null)} />
      )}
      {tool?.kind === "scale" && toolResult?.ok && (
        <ScaleMode items={buildScaleItems(tool.recipe.config, toolResult)} onClose={() => setTool(null)} />
      )}
    </>
  );
}

function CardHeader({ recipe, eyebrow, meta, onEdit, onDelete }: { recipe: Recipe; eyebrow: string; meta: string } & Pick<Props, "onEdit" | "onDelete">) {
  return (
    <div className="journal-title">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{recipe.name}</h2>
        <p>{meta}</p>
      </div>
      <button
        className={`icon-button favorite-button ${recipe.favorite ? "selected" : ""}`}
        aria-label={`${recipe.favorite ? "Rimuovi dai" : "Aggiungi ai"} preferiti ${recipe.name}`}
        aria-pressed={Boolean(recipe.favorite)}
        onClick={() => onEdit(recipe.id, { favorite: !recipe.favorite })}
      >
        <Star weight={recipe.favorite ? "fill" : "regular"} />
      </button>
      <button className="icon-button" aria-label={`Elimina ${recipe.name}`} onClick={() => onDelete(recipe.id)}>
        <Trash />
      </button>
    </div>
  );
}

function Ingredients({ recipe, flours }: { recipe: Recipe; flours: Flour[] }) {
  const r = calculate(recipe.config, flours);
  if (!r.ok) return null;
  const natural = ["sourdough", "licoli"].includes(recipe.config.yeast);
  return (
    <div className="journal-ingredients">
      <strong>Farina totale {fmt(r.flour)} g</strong>
      <br />
      <small>{r.flourBreakdown.map((item) => `${item.name}: ${fmt(item.grams)} g (${fmt(item.percent, 1)}%)`).join(" · ")}</small>
      <br />
      Acqua {fmt(r.water)} g · Sale {fmt(r.salt, 1)} g · {yeastLabel(recipe.config.yeast)} {fmt(r.yeast, natural ? 0 : 2)} g
      {r.oil > 0 ? ` · Olio ${fmt(r.oil, 1)} g` : ""}
    </div>
  );
}

const describe = (recipe: Recipe) => {
  const style = styles.find((item) => item.id === recipe.config.styleId);
  return `${style?.name ?? "Pizza"} · ${recipe.config.count} ${style?.pan ? "teglie" : "pizze"} · ${recipe.config.hydration}% di acqua`;
};

function StagesList({ stages, completed }: { stages: Stage[]; completed: string[] }) {
  return (
    <div className="checklist readonly-checklist">
      {stages.map((stage) => (
        <div key={stage.id}>
          <CheckCircle weight={completed.includes(stage.id) ? "fill" : "regular"} />
          <span>
            <strong>{stage.title}</strong>
            <small>{dateLabel(stage.at)}</small>
            <p>{stage.detail}</p>
          </span>
        </div>
      ))}
    </div>
  );
}

function ActiveCard({ recipe, flours, now, busy, onEdit, onDelete, onStop, onFinish, onShare, onCalendar, onMessage, onTool }: Props & { recipe: Recipe; onTool: (kind: "scale" | "guide") => void }) {
  const stages = buildTimeline(recipe.config, flours);
  const baked = new Date(recipe.config.bakeAt).getTime() <= now;
  // Programmata finché manca più di un quarto d’ora all’inizio (come per il pulsante «Programma»).
  const scheduled = startTiming(stages, recipe.config.bakeAt, now) === "future";
  return (
    <article className="journal-card active-recipe">
      <CardHeader
        recipe={recipe}
        eyebrow={scheduled ? `Programmata · parte ${stages[0] ? dateLabel(stages[0].at) : ""}` : "In corso"}
        meta={`Infornata ${dateLabel(recipe.config.bakeAt)} · ${describe(recipe)}`}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      {usesCalendarReminders() && (
        <div className="calendar-card">
          <CalendarPlus weight="duotone" />
          <div>
            <strong>Avvisi a ogni fase</strong>
            <p>Su iPhone e nel browser gli avvisi arrivano dal Calendario del telefono, anche ad app chiusa: aggiungi le fasi una volta sola.</p>
          </div>
          <button className="button primary" onClick={() => onCalendar(recipe)}>
            <CalendarPlus /> Aggiungi al calendario
          </button>
        </div>
      )}
      <ActiveDoughJournal
        recipe={recipe}
        stages={stages}
        onEdit={(patch) => onEdit(recipe.id, patch)}
        onMessage={onMessage}
        tools={
          <div className="recipe-tools" aria-label="Strumenti per preparare l’impasto">
            <button className="tool-button" onClick={() => onTool("scale")}>
              <Scale weight="duotone" />
              <span><strong>Pesa</strong><small>Un ingrediente alla volta</small></span>
            </button>
            <button className="tool-button" onClick={() => onTool("guide")}>
              <Play weight="duotone" />
              <span><strong>Guida</strong><small>Fase per fase, con timer</small></span>
            </button>
          </div>
        }
      />
      <details>
        <summary><span>Dosi della ricetta</span></summary>
        <Ingredients recipe={recipe} flours={flours} />
      </details>
      {baked && (
        <div className="notice finish-notice">
          <FlagCheckered />
          <div>
            <strong>È il momento di infornare</strong>
            <p>Quando la pizza è sfornata, concludi l’impasto: potrai dare un voto e tarare il forno.</p>
          </div>
        </div>
      )}
      <div className="journal-actions">
        {!scheduled && (
          <button className="button primary" onClick={() => onFinish(recipe)}>
            <FlagCheckered /> Pizza sfornata: concludi
          </button>
        )}
        <button className="button secondary" disabled={busy} onClick={() => onStop()}>
          <BellSlash /> {scheduled ? "Annulla la programmazione" : "Interrompi e salva per dopo"}
        </button>
        <button className="button secondary" onClick={() => onShare(recipe)}>
          <ShareNetwork /> Condividi
        </button>
      </div>
    </article>
  );
}

function SavedCard({ recipe, activeRecipe, flours, now, busy, onEdit, onDelete, onStart, onLateStart, onOpenInPlanner, onShare }: Props & { recipe: Recipe; activeRecipe?: Recipe }) {
  const stages = buildTimeline(recipe.config, flours);
  const timing = startTiming(stages, recipe.config.bakeAt, now);
  const eyebrow =
    timing === "expired"
      ? "Da riprogrammare"
      : timing === "late"
        ? "Orario di inizio passato"
        : recipe.startedAt
          ? "Interrotta"
          : "Salvata";
  return (
    <article className={`journal-card saved-recipe ${timing === "expired" || timing === "late" ? "needs-reschedule" : ""}`}>
      <CardHeader recipe={recipe} eyebrow={eyebrow} meta={`Infornata ${dateLabel(recipe.config.bakeAt)} · ${describe(recipe)}`} onEdit={onEdit} onDelete={onDelete} />
      {stages[0] && (
        <div className={`plan-window ${timing === "expired" || timing === "late" ? "is-late" : ""}`}>
          <CalendarBlank />
          <div>
            <span>
              {timing === "future" ? "Si comincia" : timing === "now" ? "Si comincia adesso" : "Doveva cominciare"}
            </span>
            <strong>{dateLabel(stages[0].at)}</strong>
            {timing === "late" && <small>Puoi partire adesso spostando la cena, oppure mantenerla e ricalcolare lievito e tempi.</small>}
            {timing === "expired" && <small>Anche l’orario di cottura è passato: scegli una nuova data per riprendere questa pizza.</small>}
          </div>
        </div>
      )}
      <Ingredients recipe={recipe} flours={flours} />
      {timing !== "expired" && activeRecipe && (
        <p className="small-muted replace-note">
          <Warning /> Hai già «{activeRecipe.name}» in corso: {timing === "future" ? "programmando" : "iniziando"} questa, l’altra tornerà tra le salvate.
        </p>
      )}
      <div className="journal-actions">
        {timing === "future" && (
          <button className="button primary" disabled={busy} onClick={() => onStart(recipe)}>
            <CalendarCheck /> Programma
          </button>
        )}
        {timing === "now" && (
          <button className="button primary" disabled={busy} onClick={() => onStart(recipe)}>
            <Bell /> Inizia ora
          </button>
        )}
        {timing === "late" && (
          <button className="button primary" disabled={busy} onClick={() => onLateStart(recipe)}>
            <Clock /> Parti adesso
          </button>
        )}
        {timing === "expired" && (
          <button className="button primary" onClick={() => onOpenInPlanner(recipe, "reschedule")}>
            <CalendarBlank /> Riprogramma
          </button>
        )}
        <button className="button secondary" onClick={() => onOpenInPlanner(recipe, "edit")}>
          <PencilSimple /> Modifica
        </button>
        <button className="button secondary" onClick={() => onShare(recipe)}>
          <ShareNetwork /> Condividi
        </button>
      </div>
      {timing === "future" && (
        <p className="small-muted schedule-note">«Programma» attiva le notifiche: la pizza partirà da sola all’orario impostato.</p>
      )}
      <details>
        <summary><span>Consulta le fasi pianificate</span></summary>
        <StagesList stages={stages} completed={recipe.completedStages} />
      </details>
    </article>
  );
}

function PastCard({ recipe, flours, calibrations, onEdit, onDelete, onOpenInPlanner, onShare, onSaveCalibration }: Props & { recipe: Recipe }) {
  const calibration = calibrations.find((item) => item.id === recipe.calibrationId);
  return (
    <article className="journal-card past-recipe">
      <CardHeader recipe={recipe} eyebrow={`Sfornata il ${dayLabel(recipe.finishedAt ?? recipe.config.bakeAt)}`} meta={describe(recipe)} onEdit={onEdit} onDelete={onDelete} />
      <RecipeOutcome recipe={recipe} onEdit={(patch) => onEdit(recipe.id, patch)} />
      <OvenCalibration recipe={recipe} calibration={calibration} onSave={(item) => onSaveCalibration(recipe, item)} />
      <details>
        <summary><span>Dosi usate</span></summary>
        <Ingredients recipe={recipe} flours={flours} />
      </details>
      <div className="journal-actions">
        <button className="button secondary" onClick={() => onOpenInPlanner(recipe, "copy")}>
          <ClockCounterClockwise /> Rifai questa pizza
        </button>
        <button className="button secondary" onClick={() => onShare(recipe)}>
          <ShareNetwork /> Condividi
        </button>
      </div>
    </article>
  );
}

function RecipeOutcome({ recipe, onEdit }: { recipe: Recipe; onEdit: (patch: Partial<Recipe>) => void }) {
  return (
    <div className="recipe-outcome-fields">
      <div className="recipe-review">
        <span>Com’è venuta?</span>
        <div className="stars">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} aria-label={`${n} stelle per ${recipe.name}`} aria-pressed={recipe.rating === n} onClick={() => onEdit({ rating: recipe.rating === n ? 0 : n })}>
              <Star weight={recipe.rating >= n ? "fill" : "regular"} />
            </button>
          ))}
        </div>
      </div>
      <label className="field">
        Appunti per la prossima volta
        <textarea rows={3} maxLength={4000} placeholder="Com’era l’impasto? Cosa cambieresti?" value={recipe.notes} onChange={(event) => onEdit({ notes: event.target.value })} />
      </label>
    </div>
  );
}
