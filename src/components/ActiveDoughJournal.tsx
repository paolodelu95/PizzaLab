import { CheckCircle, Clock, Gauge } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import type { DoughConfig, Recipe, Stage } from "../domain/types";
import { FermentationCheck } from "./FermentationCheck";
import { TemperatureLog } from "./TemperatureLog";

const dateLabel = (date: string) =>
  new Date(date).toLocaleString("it-IT", {
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
    <section className="active-dough-journal" aria-label="Controlli impasto attivo">
      <header className="active-dough-head">
        <span className="live-dot" aria-hidden="true" />
        <div>
          <span>IMPASTO IN CORSO</span>
          <strong>{nextStage ? nextStage.title : "Piano completato"}</strong>
          <small>
            {nextStage
              ? `Prossima fase · ${dateLabel(nextStage.at)}`
              : "Tutte le fasi risultano completate"}
          </small>
        </div>
        <b>{completedCount}/{stages.length}</b>
      </header>

      <div className="active-dough-progress" aria-label={`${completedCount} fasi completate su ${stages.length}`}>
        <span style={{ width: `${progress}%` }} />
      </div>

      {nextStage ? (
        <article className="next-stage-card">
          <Clock />
          <div>
            <span>ADESSO GUARDA QUESTO</span>
            <strong>{nextStage.title}</strong>
            <p>{nextStage.detail}</p>
          </div>
        </article>
      ) : (
        <article className="next-stage-card complete">
          <CheckCircle weight="fill" />
          <div><span>PIANO COMPLETATO</span><strong>È il momento di annotare il risultato</strong></div>
        </article>
      )}

      {tools}

      <details className="active-stage-list">
        <summary><Gauge /><span>Segna le fasi fatte · {completedCount}/{stages.length}</span></summary>
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
          <span>CONTROLLO DURANTE LA LAVORAZIONE</span>
          <p>Usalo solo mentre stai seguendo questo impasto: le correzioni aggiornano il piano salvato, non il calcolatore.</p>
        </div>
        <FermentationCheck
          config={recipe.config}
          onUpdate={updateConfig}
          onApplied={() => onMessage("Tempi dell’impasto attivo aggiornati nel diario.")}
        />
        <TemperatureLog
          recipe={recipe}
          onChange={(temperatureReadings) => onEdit({ temperatureReadings })}
        />
      </div>

    </section>
  );
}
