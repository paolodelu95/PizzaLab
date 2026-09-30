import { ArrowRight, BookmarkSimple, Check, ListChecks, Plus, Trash, UserCircle } from "@phosphor-icons/react";
import { durationLabel } from "../domain/duration";
import { styles } from "../domain/styles";
import type { Recipe, RecipeTemplate, Stage } from "../domain/types";
import { photos, stylePhoto } from "../data/photos";
import { locale, t, tn } from "../i18n";
import { InstallPrompt } from "./InstallPrompt";
import { RescueButton } from "./DoughRescue";

const clock = (iso: string) => new Date(iso).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });
const day = (iso: string, now: number) => {
  const date = new Date(iso);
  const today = new Date(now);
  const days = Math.round((new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86400000);
  return days === 0 ? t("oggi") : days === 1 ? t("domani") : date.toLocaleDateString(locale(), { weekday: "long" });
};

type Props = {
  name: string;
  now: number;
  active?: Recipe;
  stages: Stage[];
  savedCount: number;
  templates: RecipeTemplate[];
  onNew: () => void;
  onOpenProfile: () => void;
  onOpenRescue: () => void;
  onOpenDiary: () => void;
  onStageDone: (stageId: string) => void;
  onUseTemplate: (id: string) => void;
  onDeleteTemplate: (id: string) => void;
};

/** «Oggi»: la cosa da fare adesso. Con un impasto in corso mostra la prossima fase, altrimenti invita a crearne uno. */
export function Home({ name, now, active, stages, savedCount, templates, onNew, onOpenProfile, onOpenRescue, onOpenDiary, onStageDone, onUseTemplate, onDeleteTemplate }: Props) {
  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? t("Buongiorno") : hour < 18 ? t("Buon pomeriggio") : t("Buonasera");
  const firstName = name.trim().split(/\s+/)[0];
  const done = new Set(active?.completedStages ?? []);
  const current = active ? stages.find((stage) => !done.has(stage.id)) : undefined;
  const later = current ? stages.filter((stage) => !done.has(stage.id) && stage.id !== current.id).slice(0, 3) : [];
  const wait = current ? (new Date(current.at).getTime() - now) / 3600000 : 0;

  return (
    <>
      <section
        className="today-hero"
        style={{ backgroundImage: `url(${active ? photos.heroDough : photos.heroFire})` }}
        aria-labelledby="today-title"
      >
        <div className="today-top">
          <span className="today-greeting">{firstName ? `${greeting}, ${firstName}` : greeting}</span>
          <div className="today-actions">
            <RescueButton className="on-photo" onClick={onOpenRescue} />
            <button className="today-avatar" aria-label={t("Profilo")} onClick={onOpenProfile}>
              {firstName ? firstName[0].toUpperCase() : <UserCircle size={22} />}
            </button>
          </div>
        </div>
        <div className="today-body">
          {active ? (
            <>
              <span className="today-live"><i aria-hidden="true" />{t("In corso")} · {active.name}</span>
              {current ? (
                <>
                  <h1 id="today-title">
                    <small>{wait > 1 / 60 ? t("Tra {time}", { time: durationLabel(wait) }) : t("Adesso")}</small>
                    {current.title}
                  </h1>
                  <p>{clock(current.at)} · {day(current.at, now)}</p>
                </>
              ) : (
                <>
                  <h1 id="today-title">{t("Pizza sfornata?")}</h1>
                  <p>{t("Concludi l’impasto: dai un voto e annota cosa cambiare.")}</p>
                </>
              )}
              <div className="today-progress" role="img" aria-label={t("{done} fasi completate su {total}", { done: stages.filter((s) => done.has(s.id)).length, total: stages.length })}>
                {stages.map((stage) => <i key={stage.id} className={done.has(stage.id) ? "done" : stage.id === current?.id ? "current" : ""} />)}
              </div>
              <div className="today-actions">
                <button className="button primary" onClick={onOpenDiary}><ListChecks weight="bold" /> {t("Apri la guida")}</button>
                {current && <button className="button on-photo" onClick={() => onStageDone(current.id)}><Check weight="bold" /> {t("Fatto")}</button>}
              </div>
            </>
          ) : (
            <>
              <span className="today-live plain">{t("Il tuo laboratorio della pizza")}</span>
              <h1 id="today-title">{t("Che pizza facciamo?")}</h1>
              <p>{t("Scegli lo stile e quando vuoi mangiare: dosi, tempi e promemoria li calcola PizzaLab.")}</p>
              <div className="today-actions single">
                <button className="button primary" onClick={onNew}><Plus weight="bold" /> {t("Nuova pizza")}</button>
              </div>
            </>
          )}
        </div>
      </section>

      <InstallPrompt />

      {later.length > 0 && (
        <section className="today-section" aria-labelledby="later-title">
          <div className="today-section-head">
            <h2 id="later-title">{t("Dopo")}</h2>
            <button className="text-button" onClick={onOpenDiary}>{t("Tutto il piano")}</button>
          </div>
          <ol className="today-list">
            {later.map((stage) => (
              <li key={stage.id}>
                <time>{clock(stage.at)}</time>
                <span>{stage.title}<small>{day(stage.at, now)}</small></span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {active && (
        <button className="today-row" onClick={onNew}>
          <span className="today-row-icon"><Plus weight="bold" /></span>
          <span><strong>{t("Prepara un’altra pizza")}</strong><small>{t("La salvi per dopo, o prende il posto di quella in corso.")}</small></span>
          <ArrowRight />
        </button>
      )}

      {templates.length > 0 && (
        <section className="today-section" aria-labelledby="templates-title">
          <div className="today-section-head">
            <h2 id="templates-title">{t("I tuoi modelli")}</h2>
          </div>
          <div className="template-cards">
            {templates.map((template) => (
              <article key={template.id} style={{ backgroundImage: `url(${stylePhoto(template.config.styleId)})` }}>
                <button className="template-use" onClick={() => onUseTemplate(template.id)} aria-label={t("Usa il modello {name}", { name: template.name })}>
                  <strong>{template.name}</strong>
                  <small>{t(styles.find((s) => s.id === template.config.styleId)?.name ?? "")} · {template.config.hydration}%</small>
                </button>
                <button className="template-delete" aria-label={t("Elimina modello {name}", { name: template.name })} onClick={() => onDeleteTemplate(template.id)}>
                  <Trash />
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {savedCount > 0 && (
        <button className="today-row" onClick={onOpenDiary}>
          <span className="today-row-icon"><BookmarkSimple weight="fill" /></span>
          <span><strong>{tn(savedCount, "{count} pizza salvata", "{count} pizze salvate")}</strong><small>{t("Pronte da programmare quando vuoi.")}</small></span>
          <ArrowRight />
        </button>
      )}
    </>
  );
}
