import { locale, t } from "../i18n";
import { ArrowRight, CalendarBlank, Clock, Warning } from "@phosphor-icons/react";
import { buildTimeline, calculate } from "../domain/calculator";
import { durationLabel } from "../domain/duration";
import { keepMealTimeFromNow, shiftPlanToNow, yeastLabel } from "../domain/recipes";
import type { DoughConfig, Flour } from "../domain/types";
import { useCloseOnBack } from "../services/backNavigation";
import { formatWeight } from "../services/units";

const time = (value: string) =>
  new Date(value).toLocaleString(locale(), { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * L’orario di inizio è passato da poco: si può partire adesso spostando la cena
 * oppure mantenendo la cena e accorciando la lievitazione (con più lievito).
 */
export function LateStartDialog({
  config,
  flours,
  now,
  onChoose,
  onClose,
}: {
  config: DoughConfig;
  flours: Flour[];
  now: number;
  onChoose: (config: DoughConfig, mode: "shift" | "keep") => void;
  onClose: () => void;
}) {
  useCloseOnBack(true, onClose);
  const plannedStart = buildTimeline(config, flours)[0]?.at;
  const shifted = shiftPlanToNow(config, now);
  const kept = keepMealTimeFromNow(config, now);
  const before = calculate(config, flours);
  const after = kept.ok ? calculate(kept.config, flours) : null;
  const natural = ["sourdough", "licoli"].includes(config.yeast);
  const hours = (c: DoughConfig) => c.bulkHours + c.coldHours + c.proofHours;
  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="dialog late-start-dialog" role="dialog" aria-modal="true" aria-labelledby="late-title">
        <span className="late-icon" aria-hidden="true"><Clock weight="duotone" /></span>
        <h2 id="late-title">{t("Parti in ritardo?")}</h2>
        <p>
          {t("L’impasto doveva iniziare")} {plannedStart ? time(plannedStart) : t("prima")}{t(". Scegli come recuperare:")}
        </p>
        <button className="late-option" onClick={() => onChoose(shifted, "shift")}>
          <CalendarBlank />
          <span>
            <strong>{t("Sposta la cena")}</strong>
            <small>{t("Stessi tempi e stessa dose di lievito. Si inforna")} {time(shifted.bakeAt)}.</small>
          </span>
          <ArrowRight />
        </button>
        {kept.ok && after?.ok && before.ok ? (
          <button className="late-option" onClick={() => onChoose(kept.config, "keep")}>
            <Clock />
            <span>
              <strong>{t("Mangio comunque")} {time(config.bakeAt)}</strong>
              <small>
                {t("Lievitazione da")} {durationLabel(hours(config))} a {durationLabel(hours(kept.config))};{" "}
                {yeastLabel(config.yeast).toLowerCase()} {t("da")} {formatWeight(before.yeast, natural ? 0 : 2)} a {formatWeight(after.yeast, natural ? 0 : 2)}.
              </small>
            </span>
            <ArrowRight />
          </button>
        ) : (
          <div className="notice warning">
            <Warning />
            <div>
              <strong>{t("Per la cena")} {time(config.bakeAt)} {t("non c’è più tempo")}</strong>
              <p>{kept.ok ? t("Non riesco a ricalcolare questo impasto.") : kept.error}</p>
            </div>
          </div>
        )}
        <button className="button secondary" onClick={onClose}>{t("Annulla")}</button>
      </div>
    </div>
  );
}
