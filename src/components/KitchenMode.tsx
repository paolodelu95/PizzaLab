import { ArrowLeft, Check, CheckCircle, Circle, Clock, CookingPot, Fire, Pause, Play, Snowflake, Thermometer, X } from "@phosphor-icons/react";
import { Capacitor } from "@capacitor/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { durationLabel } from "../domain/duration";
import type { ScaleItem } from "../domain/recipes";
import type { Stage } from "../domain/types";
import { locale, msg, t } from "../i18n";
import { useCloseOnBack } from "../services/backNavigation";
import { cancelTimerAlert, scheduleTimerAlert } from "../services/notifications";
import { gramsToOunces, weightParts } from "../services/units";

type Drift = "ok" | "fast" | "slow" | "hot" | "cold";
type WakeLockLike = { release: () => Promise<void> };
const driftAdvice: Record<Drift, [string, string, string]> = {
  ok: [msg("Regolare"), msg("Tutto regolare"), msg("Continua con il piano e osserva volume, elasticità e temperatura.")],
  fast: [msg("In anticipo"), msg("Impasto in anticipo"), msg("Anticipa il passaggio in frigo o lo staglio. Ricontrolla tra 20 minuti e non aspettare l’orario se la massa sta cedendo.")],
  slow: [msg("In ritardo"), msg("Impasto in ritardo"), msg("Concedi più tempo in un ambiente leggermente più tiepido. Non aggiungere lievito a impasto già formato.")],
  hot: [msg("Troppo caldo"), msg("Temperatura troppo alta"), msg("Ferma la lavorazione e raffredda brevemente la massa. Nelle fasi successive riduci il tempo fuori frigo.")],
  cold: [msg("Troppo freddo"), msg("Impasto troppo freddo"), msg("Lascialo acclimatare coperto e valuta la crescita reale prima di stagliare o stendere.")],
};
/** Le fasi in cui si pesa: la prima delle tre che compare nel piano mostra tutti gli ingredienti. */
const WEIGH_STAGES = ["preferment", "autolyse", "mix"];
/** Sopra un’ora il timer non serve: basta l’orario della fase dopo (e la notifica). */
const TIMER_LIMIT = 60 * 60;
const clock = (iso: string) => new Date(iso).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });
const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

/** Breve suono di fine timer, senza file audio: tre bip generati al momento. */
function beep() {
  try {
    const audio = new AudioContext();
    [0, 0.35, 0.7].forEach((offset) => {
      const tone = audio.createOscillator();
      const gain = audio.createGain();
      tone.frequency.value = 880;
      gain.gain.setValueAtTime(0.25, audio.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + offset + 0.25);
      tone.connect(gain).connect(audio.destination);
      tone.start(audio.currentTime + offset);
      tone.stop(audio.currentTime + offset + 0.3);
    });
    navigator.vibrate?.([300, 150, 300]);
  } catch {
    /* audio non disponibile: resta la notifica */
  }
}

/** Secondi di timer per la fase: tra una piega e l’altra, la cottura e le fasi brevi. */
function timerSeconds(stages: Stage[], index: number) {
  const stage = stages[index];
  const end = stage.id.startsWith("fold-") ? stages[index + 1]?.at ?? stage.until : stage.until;
  const seconds = Math.round((new Date(end).getTime() - new Date(stage.at).getTime()) / 1000);
  return seconds > 0 && seconds <= TIMER_LIMIT ? seconds : 0;
}

/**
 * «In cucina»: un’unica schermata per fare la pizza. Una fase alla volta, con gli ingredienti da pesare
 * quando si impasta, il timer per pieghe e cottura e «Fatto» che spunta la fase e passa alla successiva.
 */
export function KitchenMode({
  title,
  stages,
  items,
  completed,
  onStageDone,
  onClose,
}: {
  title: string;
  stages: Stage[];
  items: ScaleItem[];
  completed: string[];
  onStageDone: (stageId: string) => void;
  onClose: () => void;
}) {
  useCloseOnBack(true, onClose);
  const [index, setIndex] = useState(() => Math.max(0, stages.findIndex((stage) => !completed.includes(stage.id))));
  const [weighed, setWeighed] = useState<number[]>([]);
  const [level, setLevel] = useState(1);
  const [drift, setDrift] = useState<Drift>("ok");
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [paused, setPaused] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const wakeRef = useRef<WakeLockLike | null>(null);
  const stage = stages[index];
  const weighIndex = stages.findIndex((item) => WEIGH_STAGES.includes(item.id));
  const seconds = useMemo(() => (stage ? timerSeconds(stages, index) : 0), [stages, index, stage]);
  const remaining = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : (paused ?? seconds);
  const ringing = endsAt !== null && remaining === 0;

  // In cucina lo schermo resta acceso: le mani sono in pasta.
  useEffect(() => {
    const manager = (navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockLike> } }).wakeLock;
    manager?.request("screen").then((lock) => (wakeRef.current = lock)).catch(() => undefined);
    return () => void wakeRef.current?.release();
  }, []);
  useEffect(() => {
    if (!endsAt) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [endsAt]);
  useEffect(() => {
    if (ringing) beep();
  }, [ringing]);
  // Cambiando fase il timer riparte da capo; uscendo si toglie l’avviso di fine timer.
  useEffect(() => {
    setEndsAt(null);
    setPaused(null);
    void cancelTimerAlert();
  }, [index]);
  useEffect(() => () => void cancelTimerAlert(), []);

  if (!stage) return null;
  const startTimer = () => {
    const left = paused ?? seconds;
    setNow(Date.now());
    setEndsAt(Date.now() + left * 1000);
    setPaused(null);
    void scheduleTimerAlert(t("PizzaLab · Tempo scaduto"), stage.title, left);
  };
  const pauseTimer = () => {
    setPaused(remaining);
    setEndsAt(null);
    void cancelTimerAlert();
  };
  const done = () => {
    if (!completed.includes(stage.id)) onStageDone(stage.id);
    if (index < stages.length - 1) setIndex(index + 1);
    else onClose();
  };

  const unitOf = (grams: number) => (weightParts(grams).unit === "oz" ? "oz" : "g");
  const precisions = { g: [1, 0.1, 0.01], oz: [0.1, 0.05, 0.01] };
  const system = unitOf(1000);
  const next = stages[index + 1];
  const wait = (new Date(stage.at).getTime() - now) / 3600000;
  const advice = driftAdvice[drift];

  return (
    <div className="focus-overlay kitchen-mode" role="dialog" aria-label={t("In cucina")}>
      <header>
        <div>
          <CookingPot />
          <span>
            <small>{t("IN CUCINA")}</small>
            <strong>{title}</strong>
          </span>
        </div>
        <button aria-label={t("Chiudi In cucina")} onClick={onClose}>
          <X />
        </button>
      </header>
      <main>
        <div className="guided-top">
          <span>{index + 1} / {stages.length}</span>
          <div>
            {stages.map((item, i) => (
              <i key={item.id} className={completed.includes(item.id) ? "done" : i === index ? "current" : ""} />
            ))}
          </div>
        </div>
        <div className="kitchen-stage">
          <span className="kitchen-icon">{stage.id === "bake" || stage.id === "preheat" ? <Fire /> : stage.id === "cold" ? <Snowflake /> : <Clock />}</span>
          <div>
            <span className="focus-progress">
              {clock(stage.at)}
              {wait > 1 / 60 ? ` · ${t("tra {time}", { time: durationLabel(wait) })}` : ""}
              {completed.includes(stage.id) ? ` · ${t("fatto")}` : ""}
            </span>
            <h2>{stage.title}</h2>
          </div>
        </div>
        <p className="guided-detail">{stage.detail}</p>

        {index === weighIndex && items.length > 0 && (
          <section className="kitchen-weigh" aria-label={t("Ingredienti da pesare")}>
            <div className="kitchen-weigh-head">
              <strong>{t("Pesa gli ingredienti")}</strong>
              <div className="kitchen-precision" role="group" aria-label={t("Precisione bilancia")}>
                {precisions[system].map((value, i) => (
                  <button key={value} className={level === i ? "selected" : ""} aria-pressed={level === i} onClick={() => setLevel(i)}>
                    {value.toLocaleString(locale())} {system}
                  </button>
                ))}
              </div>
            </div>
            <ul>
              {items.map((item, i) => {
                const unit = unitOf(item.grams);
                const precision = precisions[unit][level];
                const amount = unit === "oz" ? gramsToOunces(item.grams) : item.grams;
                const value = Math.round(amount / precision) * precision;
                const tooSmall = item.grams > 0 && value === 0;
                const isWeighed = weighed.includes(i);
                return (
                  <li key={`${item.label}-${i}`} className={isWeighed ? "weighed" : ""}>
                    <button
                      aria-pressed={isWeighed}
                      aria-label={t("{label}: pesato", { label: item.label })}
                      onClick={() => setWeighed((list) => (isWeighed ? list.filter((x) => x !== i) : [...list, i]))}
                    >
                      {isWeighed ? <CheckCircle weight="fill" /> : <Circle />}
                    </button>
                    <span>
                      {item.label}
                      {item.note && <small>{item.note}</small>}
                      {tooSmall && <small className="kitchen-too-small">{t("La bilancia non riesce a misurare questa dose: non significa zero. Torna al calcolatore e scegli “Grammi interi”, oppure usa una bilancia più precisa.")}</small>}
                    </span>
                    <strong>
                      {tooSmall ? `< ${precision.toLocaleString(locale())}` : value.toLocaleString(locale(), { maximumFractionDigits: 2 })}
                      <small> {unit}</small>
                    </strong>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {seconds > 0 && (
          <div className={`guided-timer ${ringing ? "ringing" : ""}`} role="timer" aria-live={ringing ? "assertive" : "off"}>
            <strong>{ringing ? t("Tempo!") : formatTime(remaining)}</strong>
            {!ringing && (
              <button onClick={endsAt ? pauseTimer : startTimer}>
                {endsAt ? <><Pause /> {t("Pausa")}</> : <><Play /> {paused !== null ? t("Riprendi") : t("Avvia timer")}</>}
              </button>
            )}
            {endsAt && !ringing && Capacitor.isNativePlatform() && <small>{t("Ti avviso io quando è ora, anche a schermo spento.")}</small>}
          </div>
        )}
        {seconds === 0 && next && (
          <p className="kitchen-next">
            {t("Poi: {title} alle {time}", { title: next.title, time: clock(next.at) })}
          </p>
        )}

        <details className="kitchen-help">
          <summary><Thermometer /> {t("Come sta andando?")}</summary>
          <div className="drift-options">
            {(Object.keys(driftAdvice) as Drift[]).map((id) => (
              <button key={id} className={drift === id ? "selected" : ""} aria-pressed={drift === id} onClick={() => setDrift(id)}>
                {t(driftAdvice[id][0])}
              </button>
            ))}
          </div>
          <article>
            <strong>{t(advice[1])}</strong>
            <p>{t(advice[2])}</p>
          </article>
        </details>

        <div className="focus-actions">
          <button className="button secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}>
            <ArrowLeft /> {t("Indietro")}
          </button>
          <button className="button primary" onClick={done}>
            <Check weight="bold" /> {index < stages.length - 1 ? t("Fatto") : t("Fatto, buon appetito!")}
          </button>
        </div>
      </main>
    </div>
  );
}
