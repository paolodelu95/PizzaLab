import { ArrowRight, Bell, BookmarkSimple, CalendarCheck, Clock, Fire, SlidersHorizontal, Snowflake, Warning } from "@phosphor-icons/react";
import { durationLabel } from "../domain/duration";
import { countForPeople, type StartTiming } from "../domain/recipes";
import type { calculate } from "../domain/calculator";
import type { DoughConfig, Stage } from "../domain/types";
import { locale, t } from "../i18n";
import { formatTemp } from "../services/units";
import { WeightValue } from "./WeightValue";

type Result = Extract<ReturnType<typeof calculate>, { ok: true }>;

const when = (iso: string) =>
  new Date(iso).toLocaleString(locale(), { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/**
 * La pizza in una schermata: stile (sopra), persone e ora del pasto. Dosi, orari e cottura li decide
 * PizzaLab; chi vuole regolare ogni dettaglio passa ai quattro passaggi con «Personalizza».
 */
export function QuickPlan({
  config: c,
  result,
  timeline,
  timing,
  isPan,
  busy,
  activeName,
  onPeople,
  onEat,
  onStart,
  onSave,
  onCustomize,
}: {
  config: DoughConfig;
  result: ReturnType<typeof calculate>;
  timeline: Stage[];
  timing: StartTiming;
  isPan: boolean;
  busy: boolean;
  activeName?: string;
  onPeople: (count: number) => void;
  onEat: (bakeAt: string) => void;
  onStart: () => void;
  onSave: () => void;
  onCustomize: () => void;
}) {
  const ok = result.ok ? (result as Result) : null;
  const warnings = ok ? ok.advice.filter((item) => item.level !== "info") : [];
  const natural = ["sourdough", "licoli"].includes(c.yeast);
  return (
    <section className="panel quick-plan" aria-labelledby="quick-title">
      <h2 id="quick-title" className="visually-hidden">{t("Pizza rapida")}</h2>
      <div className="quick-row">
        <div className="lead-options" role="group" aria-label={t("Per quante persone?")}>
          <span>{t("Per quante persone?")}</span>
          <div>
            {[2, 4, 6, 8, 10].map((people, index, all) => {
              const chosen = c.count === countForPeople(people, isPan) && !all.slice(index + 1).some((other) => countForPeople(other, isPan) === c.count);
              return (
                <button key={people} className={chosen ? "selected" : ""} aria-pressed={chosen} onClick={() => onPeople(countForPeople(people, isPan))}>
                  {people}
                </button>
              );
            })}
          </div>
        </div>
        <label className="field quick-eat">
          {t("Quando vuoi mangiare?")}
          <input type="datetime-local" value={c.bakeAt} onChange={(event) => event.target.value && onEat(event.target.value)} />
        </label>
      </div>

      {ok ? (
        <>
          <div className="quick-result">
            <div className="quick-start">
              <Clock weight="duotone" />
              <div>
                <span>{t("Si comincia")}</span>
                <strong>{timeline[0] ? when(timeline[0].at) : "—"}</strong>
              </div>
            </div>
            <div className="quick-phases">
              <span><b>{durationLabel(c.bulkHours)}</b> {t("fuori frigo")}</span>
              {c.coldHours > 0 && <span><Snowflake /> <b>{durationLabel(c.coldHours)}</b> {t("in frigo")}</span>}
              <span><b>{durationLabel(c.proofHours)}</b> {t("di appretto")}</span>
              <span><Fire /> <b>{formatTemp(c.ovenTemp)}</b></span>
            </div>
            <dl className="quick-doses">
              <div><dt>{t("Farina")}</dt><dd><WeightValue grams={ok.flour} /></dd></div>
              <div><dt>{t("Acqua")}</dt><dd><WeightValue grams={ok.water} /></dd></div>
              <div><dt>{t("Sale")}</dt><dd><WeightValue grams={ok.salt} digits={1} /></dd></div>
              <div><dt>{natural ? t("Madre") : t("Lievito")}</dt><dd><WeightValue grams={ok.yeast} digits={natural ? 0 : 2} /></dd></div>
            </dl>
            <small className="quick-flour">{ok.flourBreakdown.map((item) => t(item.name)).join(" + ")}</small>
          </div>
          {warnings.length > 0 && (
            <div className="quick-warnings">
              <Warning weight="fill" />
              <div>
                <strong>{warnings.map((item) => item.title).join(" · ")}</strong>
                <button className="text-button" onClick={onCustomize}>{t("Personalizza per sistemare")}</button>
              </div>
            </div>
          )}
          <div className="quick-actions">
            <button className="button primary" disabled={busy || timing === "expired"} onClick={onStart}>
              {timing === "future" ? <><CalendarCheck /> {t("Programma")}</> : timing === "late" ? <><Clock /> {t("Parti adesso")}</> : <><Bell /> {t("Inizia ora")}</>}
            </button>
            <button className="button secondary" disabled={busy} onClick={onSave}>
              <BookmarkSimple /> {t("Salva per dopo")}
            </button>
          </div>
          {activeName && <p className="small-muted">{t("Hai già «{name}» in corso: avviando questa, l’altra tornerà tra le salvate.", { name: activeName })}</p>}
        </>
      ) : (
        <div className="quick-warnings">
          <Warning weight="fill" />
          <div>
            <strong>{(result as { errors: string[] }).errors[0]}</strong>
            <button className="text-button" onClick={onCustomize}>{t("Personalizza per sistemare")}</button>
          </div>
        </div>
      )}
      <button className="quick-customize" onClick={onCustomize}>
        <SlidersHorizontal />
        <span><strong>{t("Personalizza in 4 passaggi")}</strong><small>{t("Farina, lievitazione, forno e ogni dettaglio")}</small></span>
        <ArrowRight />
      </button>
    </section>
  );
}
