import { locale, t, tn, msg } from "../i18n";
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
import { formatWeight } from "../services/units";
import { SupportCard } from "./SupportCard";

export type DiaryView = RecipeStatus;

const fmt = (n: number, digits = 0) => n.toLocaleString(locale(), { maximumFractionDigits: digits });
const dateLabel = (s: string) =>
  new Date(s).toLocaleString(locale(), { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const dayLabel = (s: string) =>
  new Date(s).toLocaleDateString(locale(), { day: "numeric", month: "short", year: "numeric" });

const views: { id: DiaryView; label: string; empty: [string, string] }[] = [
  {
    id: "active",
    label: msg("In corso"),
    empty: [
      msg("Nessun impasto in corso"),
      msg("Dal riepilogo o da una pizza salvata premi «Programma» (o «Inizia ora» se è già l’ora): qui troverai fasi, notifiche, bilancia e guida passo passo."),
    ],
  },
  {
    id: "saved",
    label: msg("Salvate"),
    empty: [
      msg("Nessuna pizza salvata"),
      msg("Nel quarto passaggio del tuo impasto scegli «Salva per dopo»: la ritrovi qui, pronta da iniziare quando vuoi."),
    ],
  },
  {
    id: "past",
    label: msg("Passate"),
    empty: [
      msg("Ancora nessuna pizza sfornata"),
      msg("Quando concludi un impasto in corso finisce qui: potrai dare un voto, annotare cosa cambiare e tarare il forno."),
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
          <span className="eyebrow">{t("Ogni impasto insegna qualcosa")}</span>
          <h1>{t("Il tuo diario di pizza.")}</h1>
          <p>{t("Le pizze in lavorazione, quelle salvate per dopo e quelle già sfornate, ognuna al suo posto.")}</p>
        </div>
        <div className="heading-illustration" aria-hidden="true">
          <Notebook weight="duotone" />
        </div>
      </div>
      <div className="heading-actions page-tools-row diary-tools">
        <button className="button secondary" onClick={props.onNew}>
          {t("Nuovo impasto")} <ArrowRight />
        </button>
      </div>

      <div className="diary-tabs" role="tablist" aria-label={t("Sezioni del diario")}>
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
            {t(item.label)}
            <span className="tab-count">{grouped[item.id].length}</span>
          </button>
        ))}
      </div>

      <section id="diary-panel" role="tabpanel" aria-labelledby={`diary-tab-${view}`} className="journal-list">
        {grouped[view].length === 0 ? (
          <div className="empty-state">
            {view === "past" ? <FlagCheckered size={48} weight="duotone" /> : view === "saved" ? <CalendarBlank size={48} weight="duotone" /> : <Notebook size={48} weight="duotone" />}
            <h2>{recipes.length === 0 ? t("La prima pagina è tutta tua.") : t(current.empty[0])}</h2>
            <p>{recipes.length === 0 ? t("Progetta un impasto, poi nel riepilogo scegli se iniziarlo subito o salvarlo per dopo.") : t(current.empty[1])}</p>
            <button className="button secondary" onClick={props.onNew}>
              {recipes.length === 0 ? t("Prepara il primo impasto") : t("Progetta un nuovo impasto")} <ArrowRight />
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
        aria-label={recipe.favorite ? t("Rimuovi dai preferiti {name}", { name: recipe.name }) : t("Aggiungi ai preferiti {name}", { name: recipe.name })}
        aria-pressed={Boolean(recipe.favorite)}
        onClick={() => onEdit(recipe.id, { favorite: !recipe.favorite })}
      >
        <Star weight={recipe.favorite ? "fill" : "regular"} />
      </button>
      <button className="icon-button" aria-label={t("Elimina {name}", { name: recipe.name })} onClick={() => onDelete(recipe.id)}>
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
      <strong>{t("Farina totale")} {formatWeight(r.flour)}</strong>
      <br />
      <small>{r.flourBreakdown.map((item) => `${item.name}: ${formatWeight(item.grams)} (${fmt(item.percent, 1)}%)`).join(" · ")}</small>
      <br />
      {t("Acqua")} {formatWeight(r.water)} {t("· Sale")} {formatWeight(r.salt, 1)} · {yeastLabel(recipe.config.yeast)} {formatWeight(r.yeast, natural ? 0 : 2)}
      {r.oil > 0 ? t(" · Olio {formatWeight}", { formatWeight: formatWeight(r.oil, 1) }) : ""}
    </div>
  );
}

const describe = (recipe: Recipe) => {
  const style = styles.find((item) => item.id === recipe.config.styleId);
  const count = style?.pan ? tn(recipe.config.count, "{count} teglia", "{count} teglie") : tn(recipe.config.count, "{count} pizza", "{count} pizze");
  return `${t(style?.name ?? "Pizza")} · ${count} · ${t("{hydration}% di acqua", { hydration: recipe.config.hydration })}`;
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
        eyebrow={scheduled ? t("Programmata · parte {v}", { v: stages[0] ? dateLabel(stages[0].at) : "" }) : t("In corso")}
        meta={t("Infornata {dateLabel} · {describe}", { dateLabel: dateLabel(recipe.config.bakeAt), describe: describe(recipe) })}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      {usesCalendarReminders() && (
        <div className="calendar-card">
          <CalendarPlus weight="duotone" />
          <div>
            <strong>{t("Avvisi a ogni fase")}</strong>
            <p>{t("Su iPhone e nel browser gli avvisi arrivano dal Calendario del telefono, anche ad app chiusa: aggiungi le fasi una volta sola.")}</p>
          </div>
          <button className="button primary" onClick={() => onCalendar(recipe)}>
            <CalendarPlus /> {t("Aggiungi al calendario")}
          </button>
        </div>
      )}
      <ActiveDoughJournal
        recipe={recipe}
        stages={stages}
        onEdit={(patch) => onEdit(recipe.id, patch)}
        onMessage={onMessage}
        tools={
          <div className="recipe-tools" aria-label={t("Strumenti per preparare l’impasto")}>
            <button className="tool-button" onClick={() => onTool("scale")}>
              <Scale weight="duotone" />
              <span><strong>{t("Pesa")}</strong><small>{t("Un ingrediente alla volta")}</small></span>
            </button>
            <button className="tool-button" onClick={() => onTool("guide")}>
              <Play weight="duotone" />
              <span><strong>{t("Guida")}</strong><small>{t("Fase per fase, con timer")}</small></span>
            </button>
          </div>
        }
      />
      <details>
        <summary><span>{t("Dosi della ricetta")}</span></summary>
        <Ingredients recipe={recipe} flours={flours} />
      </details>
      {baked && (
        <div className="notice finish-notice">
          <FlagCheckered />
          <div>
            <strong>{t("È il momento di infornare")}</strong>
            <p>{t("Quando la pizza è sfornata, concludi l’impasto: potrai dare un voto e tarare il forno.")}</p>
          </div>
        </div>
      )}
      <div className="journal-actions">
        {!scheduled && (
          <button className="button primary" onClick={() => onFinish(recipe)}>
            <FlagCheckered /> {t("Pizza sfornata: concludi")}
          </button>
        )}
        <button className="button secondary" disabled={busy} onClick={() => onStop()}>
          <BellSlash /> {scheduled ? t("Annulla la programmazione") : t("Interrompi e salva per dopo")}
        </button>
        <button className="button secondary" onClick={() => onShare(recipe)}>
          <ShareNetwork /> {t("Condividi")}
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
      ? t("Da riprogrammare")
      : timing === "late"
        ? t("Orario di inizio passato")
        : recipe.startedAt
          ? t("Interrotta")
          : t("Salvata");
  return (
    <article className={`journal-card saved-recipe ${timing === "expired" || timing === "late" ? "needs-reschedule" : ""}`}>
      <CardHeader recipe={recipe} eyebrow={eyebrow} meta={t("Infornata {dateLabel} · {describe}", { dateLabel: dateLabel(recipe.config.bakeAt), describe: describe(recipe) })} onEdit={onEdit} onDelete={onDelete} />
      {stages[0] && (
        <div className={`plan-window ${timing === "expired" || timing === "late" ? "is-late" : ""}`}>
          <CalendarBlank />
          <div>
            <span>
              {timing === "future" ? t("Si comincia") : timing === "now" ? t("Si comincia adesso") : t("Doveva cominciare")}
            </span>
            <strong>{dateLabel(stages[0].at)}</strong>
            {timing === "late" && <small>{t("Puoi partire adesso spostando la cena, oppure mantenerla e ricalcolare lievito e tempi.")}</small>}
            {timing === "expired" && <small>{t("Anche l’orario di cottura è passato: scegli una nuova data per riprendere questa pizza.")}</small>}
          </div>
        </div>
      )}
      <Ingredients recipe={recipe} flours={flours} />
      {timing !== "expired" && activeRecipe && (
        <p className="small-muted replace-note">
          <Warning /> {t("Hai già «{name}» in corso: {action} questa, l’altra tornerà tra le salvate.", { name: activeRecipe.name, action: timing === "future" ? t("programmando") : t("iniziando") })}
        </p>
      )}
      <div className="journal-actions">
        {timing === "future" && (
          <button className="button primary" disabled={busy} onClick={() => onStart(recipe)}>
            <CalendarCheck /> {t("Programma")}
          </button>
        )}
        {timing === "now" && (
          <button className="button primary" disabled={busy} onClick={() => onStart(recipe)}>
            <Bell /> {t("Inizia ora")}
          </button>
        )}
        {timing === "late" && (
          <button className="button primary" disabled={busy} onClick={() => onLateStart(recipe)}>
            <Clock /> {t("Parti adesso")}
          </button>
        )}
        {timing === "expired" && (
          <button className="button primary" onClick={() => onOpenInPlanner(recipe, "reschedule")}>
            <CalendarBlank /> {t("Riprogramma")}
          </button>
        )}
        <button className="button secondary" onClick={() => onOpenInPlanner(recipe, "edit")}>
          <PencilSimple /> {t("Modifica")}
        </button>
        <button className="button secondary" onClick={() => onShare(recipe)}>
          <ShareNetwork /> {t("Condividi")}
        </button>
      </div>
      {timing === "future" && (
        <p className="small-muted schedule-note">{t("«Programma» attiva le notifiche: la pizza partirà da sola all’orario impostato.")}</p>
      )}
      <details>
        <summary><span>{t("Consulta le fasi pianificate")}</span></summary>
        <StagesList stages={stages} completed={recipe.completedStages} />
      </details>
    </article>
  );
}

function PastCard({ recipe, flours, calibrations, onEdit, onDelete, onOpenInPlanner, onShare, onSaveCalibration }: Props & { recipe: Recipe }) {
  const calibration = calibrations.find((item) => item.id === recipe.calibrationId);
  return (
    <article className="journal-card past-recipe">
      <CardHeader recipe={recipe} eyebrow={t("Sfornata il {dayLabel}", { dayLabel: dayLabel(recipe.finishedAt ?? recipe.config.bakeAt) })} meta={describe(recipe)} onEdit={onEdit} onDelete={onDelete} />
      <RecipeOutcome recipe={recipe} onEdit={(patch) => onEdit(recipe.id, patch)} />
      <OvenCalibration recipe={recipe} calibration={calibration} onSave={(item) => onSaveCalibration(recipe, item)} />
      <details>
        <summary><span>{t("Dosi usate")}</span></summary>
        <Ingredients recipe={recipe} flours={flours} />
      </details>
      <div className="journal-actions">
        <button className="button secondary" onClick={() => onOpenInPlanner(recipe, "copy")}>
          <ClockCounterClockwise /> {t("Rifai questa pizza")}
        </button>
        <button className="button secondary" onClick={() => onShare(recipe)}>
          <ShareNetwork /> {t("Condividi")}
        </button>
      </div>
    </article>
  );
}

function RecipeOutcome({ recipe, onEdit }: { recipe: Recipe; onEdit: (patch: Partial<Recipe>) => void }) {
  return (
    <div className="recipe-outcome-fields">
      <div className="recipe-review">
        <span>{t("Com’è venuta?")}</span>
        <div className="stars">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} aria-label={t("{n} stelle per {name}", { n, name: recipe.name })} aria-pressed={recipe.rating === n} onClick={() => onEdit({ rating: recipe.rating === n ? 0 : n })}>
              <Star weight={recipe.rating >= n ? "fill" : "regular"} />
            </button>
          ))}
        </div>
      </div>
      <label className="field">
        {t("Appunti per la prossima volta")}
        <textarea rows={3} maxLength={4000} placeholder={t("Com’era l’impasto? Cosa cambieresti?")} value={recipe.notes} onChange={(event) => onEdit({ notes: event.target.value })} />
      </label>
    </div>
  );
}
