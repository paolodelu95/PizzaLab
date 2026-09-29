import { Grains as Wheat } from "@phosphor-icons/react";
import { durationLabel } from "../domain/duration";
import { recommendFlours } from "../domain/flourAdvice";
import { strengthLine } from "../domain/flourStrength";
import type { DoughConfig, Flour } from "../domain/types";
import { t } from "../i18n";

/** Farine del catalogo adatte alla ricetta: stile, ore di lievitazione e idratazione decidono la forza che serve. */
export function FlourSuggestions({ config, flours, onUse }: { config: DoughConfig; flours: Flour[]; onUse: (id: string) => void }) {
  const { needs, current, suggestions } = recommendFlours(config, flours);
  return (
    <details className="blend-details flour-suggestions">
      <summary>
        <span>
          <b>{t("Farine consigliate per questa ricetta")}</b>
          <small>
            {current
              ? t("La tua farina va già bene: regge {hours} di lievitazione e il {hydration}% di acqua.", { hours: durationLabel(needs.hours), hydration: config.hydration })
              : t("Serve una farina da W {min} o più per {hours} di lievitazione e il {hydration}% di acqua.", { min: needs.min, hours: durationLabel(needs.hours), hydration: config.hydration })}
          </small>
        </span>
      </summary>
      {suggestions.length ? (
        <div className="oven-list">
          {suggestions.map(({ flour, strength }) => (
            <article key={flour.id}>
              <span className="oven-icon" aria-hidden="true"><Wheat weight="duotone" /></span>
              <div>
                <strong>{t(flour.brand)} · {t(flour.name)}</strong>
                <span>{strengthLine(flour)}{strength.estimated ? ` · ${t("valore teorico, può essere impreciso")}` : ""}</span>
              </div>
              <button className="button secondary" onClick={() => onUse(flour.id)}>{t("Usa")}</button>
            </article>
          ))}
        </div>
      ) : (
        <p className="small-muted">{t("Nessuna farina del catalogo copre questi tempi: accorcia la lievitazione, abbassa l’acqua o inserisci la tua farina.")}</p>
      )}
      <small className="small-muted">{t("Un suggerimento, non una regola: i W stimati hanno un intervallo largo, quelli dichiarati dal produttore vengono prima.")}</small>
    </details>
  );
}
