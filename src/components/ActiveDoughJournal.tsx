import { locale, t } from "../i18n";
import { CheckCircle, Clock, Gauge } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import type { DoughConfig, Recipe, Stage } from "../domain/types";
import { FermentationCheck } from "./FermentationCheck";
import { TemperatureLog } from "./TemperatureLog";

const dateLabel = (date: string) =>
  new Date(date).toLocaleString(locale(), {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export function ActiveDoughJournal({
  recipe,
  stages,
  onEdit,
  onMessage,
  tools,
}: {
  recipe: Recipe;
  stages: Stage[];
  onEdit: (patch: Partial<Recipe>) => void;
  onMessage: (message: string) => void;
  tools?: ReactNode;
}) {
  const completed = new Set(recipe.completedStages);
  const nextStage = stages.find((stage) => !completed.has(stage.id));
  const completedCount = stages.filter((stage) => completed.has(stage.id)).length;
  const progress = stages.length ? (completedCount / stages.length) * 100 : 0;

  const updateConfig = (patch: Partial<DoughConfig>) => {
    onEdit({ config: { ...recipe.config, ...patch } });
  };

  return (
    <section className="active-dough-journal" aria-label={t("Controlli impasto attivo")}>
      <header className="active-dough-head">
        <span className="live-dot" aria-hidden="true" />
        <div>
          <span>{t("IMPASTO IN CORSO")}</span>
          <strong>{nextStage ? nextStage.title : t("Piano completato")}</strong>
          <small>
            {nextStage
              ? t("Prossima fase · {dateLabel}", { dateLabel: dateLabel(nextStage.at) })
              : t("Tutte le fasi risultano completate")}
          </small>
        </div>
        <b>{completedCount}/{stages.length}</b>
      </header>

      <div className="active-dough-progress" aria-label={t("{completedCount} fasi completate su {length}", { completedCount, length: stages.length })}>
        <span style={{ width: `${progress}%` }} />
      </div>

      {nextStage ? (
        <article className="next-stage-card">
          <Clock />
          <div>
            <span>{t("ADESSO GUARDA QUESTO")}</span>
            <strong>{nextStage.title}</strong>
            <p>{nextStage.detail}</p>
          </div>
        </article>
      ) : (
        <article className="next-stage-card complete">
          <CheckCircle weight="fill" />
          <div><span>{t("PIANO COMPLETATO")}</span><strong>{t("È il momento di annotare il risultato")}</strong></div>
        </article>
      )}

      {tools}

      <details className="active-stage-list">
        <summary><Gauge /><span>{t("Segna le fasi fatte ·")} {completedCount}/{stages.length}</span></summary>
        <div className="checklist">
          {stages.map((stage) => (
            <label key={stage.id}>
              <input
                type="checkbox"
                checked={completed.has(stage.id)}
                onChange={(event) =>
                  onEdit({
                    completedStages: event.target.checked
                      ? [...recipe.completedStages, stage.id]
                      : recipe.completedStages.filter((id) => id !== stage.id),
                  })
                }
              />
              <span>
                <strong>{stage.title}</strong>
                <small>{dateLabel(stage.at)}</small>
                <p>{stage.detail}</p>
              </span>
            </label>
          ))}
        </div>
      </details>

      <div className="live-check-zone">
        <div className="live-check-intro">
          <span>{t("CONTROLLO DURANTE LA LAVORAZIONE")}</span>
          <p>{t("Usalo solo mentre stai seguendo questo impasto: le correzioni aggiornano il piano salvato, non il calcolatore.")}</p>
        </div>
        <FermentationCheck
          config={recipe.config}
          onUpdate={updateConfig}
          onApplied={() => onMessage(t("Tempi dell’impasto attivo aggiornati nel diario."))}
        />
        <TemperatureLog
          recipe={recipe}
          onChange={(temperatureReadings) => onEdit({ temperatureReadings })}
        />
      </div>

    </section>
  );
}
