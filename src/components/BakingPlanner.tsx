import { locale, t, msg } from "../i18n";
import { Fire, Oven, SquaresFour, Target } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { bakeScores, bakeSurfaceLabels, estimateBakeOutcome } from "../domain/calculator";
import type { BakeCalibration, DoughConfig, UserPan } from "../domain/types";
import { SliderField } from "./Fields";
import { ovenById } from "../data/ovens";
import { isPanInUse, panSize } from "./UserPans";
import { HelpTip } from "./HelpTip";
import { formatTemp } from "../services/units";

const rackOptions: [DoughConfig["ovenRack"], string, string][] = [
  ["bottom", msg("Basso"), msg("Più energia al fondo")],
  ["lower-middle", msg("Medio-basso"), msg("Teglie e pizze alte")],
  ["middle", msg("Centro"), msg("Cottura uniforme")],
  ["upper-middle", msg("Medio-alto"), msg("Più colore sopra")],
  ["top", msg("Alto"), msg("Finitura rapida")],
];

const surfaceOptions: [DoughConfig["bakeSurface"], string][] = [
  ["biscotto", msg("Biscotto")],
  ["stone", msg("Pietra")],
  ["steel", msg("Acciaio")],
  ["light-pan", msg("Teglia chiara")],
  ["dark-pan", msg("Teglia scura")],
  ["perforated-pan", msg("Teglia forata")],
  ["cast-iron", msg("Ghisa")],
];

const formatTime = (minutes: number) =>
  minutes < 3
    ? `${Math.round(minutes * 60)} ${t("sec")}`
    : `${minutes.toLocaleString(locale(), { maximumFractionDigits: 1 })} ${t("min")}`;

export function BakingPlanner({
  config: c,
  onUpdate,
  calibrations,
  userPans = [],
  onUsePan,
  onOpenProfile,
}: {
  config: DoughConfig;
  onUpdate: (patch: Partial<DoughConfig>) => void;
  calibrations: BakeCalibration[];
  userPans?: UserPan[];
  onUsePan?: (pan: UserPan) => void;
  onOpenProfile?: () => void;
}) {
  // Il tempo di cottura segue il dito subito; l’app intera si aggiorna appena il dito si ferma.
  const [minutes, setMinutes] = useState(c.bakeMinutes);
  const commitTimer = useRef<number | undefined>(undefined);
  useEffect(() => setMinutes(c.bakeMinutes), [c.bakeMinutes]);
  useEffect(() => () => window.clearTimeout(commitTimer.current), []);
  // Il fondo scala del cursore resta fermo mentre il dito trascina: se seguisse il valore, si allargherebbe a ogni passo fino a 60 minuti.
  const [scaleAnchor, setScaleAnchor] = useState(c.bakeMinutes);
  const dragging = useRef(false);
  const latestMinutes = useRef(minutes);
  latestMinutes.current = minutes;
  useEffect(() => {
    if (!dragging.current) setScaleAnchor(minutes);
  }, [minutes]);
  const startDrag = () => {
    dragging.current = true;
    const end = () => {
      dragging.current = false;
      setScaleAnchor(latestMinutes.current);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  };
  const changeMinutes = (value: number) => {
    const next = Math.max(0.5, Math.min(60, value));
    setMinutes(next);
    window.clearTimeout(commitTimer.current);
    commitTimer.current = window.setTimeout(() => onUpdate({ bakeMinutes: next }), 140);
  };
  const live = useMemo(() => ({ ...c, bakeMinutes: minutes }), [c, minutes]);
  const outcome = useMemo(() => estimateBakeOutcome(live), [live]);
  const exactCalibrations = calibrations.filter((item) => item.ovenType === c.ovenType && item.flourId === c.flourId);
  const relevantCalibrations = exactCalibrations.length ? exactCalibrations : calibrations.filter((item) => item.ovenType === c.ovenType);
  const personalDelta = relevantCalibrations.length
    ? relevantCalibrations.reduce((sum, item) => sum + item.actualMinutes - item.plannedMinutes + (item.crumb === "raw" ? 0.75 : item.crumb === "dry" ? -0.5 : 0), 0) / relevantCalibrations.length
    : 0;
  const calibrationHint = relevantCalibrations.some((item) => item.base === "pale")
    ? t("Il fondo tende a restare pallido: prova un ripiano più basso o un supporto più conduttivo.")
    : relevantCalibrations.some((item) => item.base === "dark")
      ? t("Il fondo tende a scurire: alza il ripiano o usa un supporto meno conduttivo.")
      : relevantCalibrations.some((item) => item.crust === "pale")
        ? t("La crosta tende a restare chiara: termina più in alto o con grill controllato.")
        : relevantCalibrations.some((item) => item.crust === "dark")
          ? t("La superficie colora presto: abbassa il ripiano nella prima parte della cottura.")
          : t("I risultati registrati sono equilibrati: la correzione riguarda soprattutto il tempo reale.");
  const rack = rackOptions.find(([id]) => id === c.ovenRack)!;
  const oven = ovenById(c.ovenType);
  const fast = c.ovenTemp >= 350;
  const step = fast ? 0.25 : c.ovenTemp >= 280 ? 0.5 : 1;
  // Il grafico si concentra attorno alla finestra utile, così le curve non restano schiacciate a sinistra.
  const chartMax =
    Math.ceil(
      Math.max(fast ? 4 : c.ovenTemp >= 280 ? 8 : 16, outcome.recommendedMax * 1.7, scaleAnchor * 1.25) / step,
    ) * step;
  const W = 320;
  const H = 190;
  const left = 8;
  const right = W - 8;
  const top = 10;
  const bottom = H - 22;
  const xOf = (time: number) => left + (Math.min(chartMax, time) / chartMax) * (right - left);
  const yOf = (score: number) => bottom - (score / 100) * (bottom - top);
  const points = useMemo(
    () =>
      Array.from({ length: 49 }, (_, index) => {
        const time = Math.max(0.05, (chartMax * index) / 48);
        return { time, ...bakeScores(c, time) };
      }),
    [c, chartMax],
  );
  const path = (key: "crustScore" | "crumbScore" | "baseScore") =>
    points.map((point, index) => `${index ? "L" : "M"}${xOf(point.time).toFixed(1)},${yOf(point[key]).toFixed(1)}`).join(" ");
  const markerX = xOf(minutes);
  const windowX1 = xOf(outcome.recommendedMin);
  const windowX2 = xOf(outcome.recommendedMax);

  return (
    <section className="panel baking-planner">
      <div className="panel-title">
        <span className="section-icon"><Fire /></span>
        <div>
          <h2>{t("Simulatore di cottura")}</h2>
          <p>{t("Modifica i parametri: il risultato previsto si aggiorna da solo.")}</p>
        </div>
      </div>
      <div className="baking-basics slider-basics">
        <SliderField label={t("Temperatura forno")} value={c.ovenTemp} onChange={(v) => onUpdate({ ovenTemp: v })} min={180} max={500} step={5} quantity="temp" />
      </div>
      <div className="bake-topping-impact"><span>{t("Condimento collegato")}</span><strong>{Math.round(c.toppingMoisture)}{t("% umidità ·")} {c.toppingLoad.toLocaleString(locale(), { maximumFractionDigits: 2 })} {t("g/cm²")}</strong><small>{t("Il simulatore usa questi valori per mollica e fondo.")}</small></div>

      <div className="bake-choice">
        <span>{t("Supporto di cottura")} <HelpTip topic="supporto" /></span>
        {userPans.length > 0 && onUsePan && (
          <div className="my-pans-support" role="group" aria-label={t("Le tue teglie")}>
            <small>{t("Le tue teglie")}</small>
            <div>
              {userPans.map((pan) => {
                const inUse = isPanInUse(pan, c);
                return (
                  <button key={pan.id} className={inUse ? "selected" : ""} aria-pressed={inUse} onClick={() => onUsePan(pan)}>
                    <span className={`shape-icon ${pan.shape === "round" ? "round" : "rect"}`} aria-hidden="true" />
                    <span>
                      <strong>{pan.name}</strong>
                      <small>{panSize(pan)} · {bakeSurfaceLabels[pan.surface].toLowerCase()}</small>
                    </span>
                  </button>
                );
              })}
            </div>
            <small>{t("Oppure un supporto generico:")}</small>
          </div>
        )}
        {userPans.length === 0 && onOpenProfile && (
          <p className="small-muted pan-tip">
            {t("Le tue teglie, salvate nel")} <button className="text-button inline-link" aria-label={t("Apri il profilo")} onClick={onOpenProfile}>{t("Profilo")}</button>{t(", compaiono qui con misure e materiale.")}
          </p>
        )}
        <div className="surface-options">
          {surfaceOptions.map(([id, label]) => (
            <button key={id} className={c.bakeSurface === id ? "selected" : ""} aria-pressed={c.bakeSurface === id} onClick={() => onUpdate({ bakeSurface: id })}>
              <SquaresFour /><strong>{t(label)}</strong>
            </button>
          ))}
        </div>
      </div>

      <div className="bake-prediction-window">
        <div className="prediction-heading">
          <div><small>{t("ANTEPRIMA IN TEMPO REALE")}</small><h3>{t("Risultato previsto")} <HelpTip topic="fascia" /></h3></div>
          <span aria-live="polite">{formatTime(minutes)}</span>
        </div>
        <div className="bake-curve">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={t("Evoluzione prevista durante la cottura. Finestra consigliata {formatTime}–{formatTime2}.", { formatTime: formatTime(outcome.recommendedMin), formatTime2: formatTime(outcome.recommendedMax) })}
          >
            <rect x={left} y={yOf(70)} width={right - left} height={yOf(40) - yOf(70)} rx="6" className="ideal-zone" />
            <rect x={windowX1} y={top} width={Math.max(2, windowX2 - windowX1)} height={bottom - top} rx="4" className="ideal-window" />
            <line x1={left} y1={bottom} x2={right} y2={bottom} className="chart-axis" />
            <path d={path("baseScore")} className="curve base" />
            <path d={path("crustScore")} className="curve crust" />
            <path d={path("crumbScore")} className="curve crumb" />
            <line x1={markerX} y1={top - 4} x2={markerX} y2={bottom} className="time-marker" />
            <circle cx={markerX} cy={yOf(outcome.crustScore)} r="4.5" className="curve-dot crust" />
            <circle cx={markerX} cy={yOf(outcome.crumbScore)} r="4.5" className="curve-dot crumb" />
            <circle cx={markerX} cy={yOf(outcome.baseScore)} r="4.5" className="curve-dot base" />
            <text x={left} y={H - 6} className="axis-label">0</text>
            <text x={(left + right) / 2} y={H - 6} textAnchor="middle" className="axis-label">{formatTime(chartMax / 2)}</text>
            <text x={right} y={H - 6} textAnchor="end" className="axis-label">{formatTime(chartMax)}</text>
          </svg>
          <div className="curve-legend">
            <span className="crust">{t("Crosta")}</span>
            <span className="crumb">{t("Mollica")}</span>
            <span className="base">{t("Fondo")}</span>
            <small className="ideal-legend"><i /> {t("fascia ideale")}</small>
            <small className="window-legend"><i /> {t("tempi consigliati")}</small>
          </div>
        </div>
        <div className="prediction-time-control" onPointerDown={startDrag}>
          <SliderField label={t("Tempo di cottura")} value={minutes} onChange={changeMinutes} min={0.5} max={60} sliderMax={chartMax} step={step} unit="min" />
        </div>
        <div className="prediction-results">
          {([
            [msg("Crosta"), outcome.crustLabel, outcome.crustScore, "crust"],
            [msg("Mollica"), outcome.crumbLabel, outcome.crumbScore, "crumb"],
            [msg("Fondo"), outcome.baseLabel, outcome.baseScore, "base"],
          ] as const).map(([name, label, score, kind]) => (
            <div className={`prediction-result ${kind}`} key={name}>
              <span>{t(name)}</span><strong>{label}</strong>
              <div className="prediction-meter"><i style={{ width: `${score}%` }} /></div>
              <small>{Math.round(score)}/100</small>
            </div>
          ))}
        </div>
        {oven.fixedRack ? (
          <p className="fixed-rack-note">
            <Oven /> <span>{t("In questo forno ({oven}) la pietra è a un’altezza fissa: non c’è un ripiano da scegliere, regola solo tempo e temperatura.", { oven: t(oven.name) })}</span>
          </p>
        ) : (
        <div className="prediction-rack-rail" role="group" aria-label={t("Altezza nel forno")}>
          <span>{t("ALTEZZA NEL FORNO")}</span>
          {rackOptions.map(([id, label], rackIndex) => (
            <button key={id} title={t(label)} aria-label={t(label)} className={c.ovenRack === id ? "selected" : ""} aria-pressed={c.ovenRack === id} onClick={() => onUpdate({ ovenRack: id })}>
              <span className="mini-oven">{[0, 1, 2, 3, 4].map((n) => <i key={n} className={n === rackIndex ? "rack" : ""} />)}</span>
              <small>{t(label)}</small>
            </button>
          ))}
        </div>
        )}
        <div className="prediction-copy">
          <strong>{outcome.summary}</strong>
          <p>{t("Finestra consigliata:")} {formatTime(outcome.recommendedMin)}–{formatTime(outcome.recommendedMax)}{t(". Controlla comunque il forno reale.")}</p>
          {outcome.warnings.map((warning) => <p className="prediction-warning" key={warning}>{warning}</p>)}
        </div>
      </div>

      <div className="baking-summary">
        <Oven />
        <div><span>{formatTime(minutes)} · {formatTemp(c.ovenTemp)} · {oven.fixedRack ? t("pietra fissa") : t("ripiano {toLowerCase}", { toLowerCase: t(rack[1]).toLowerCase() })}</span><strong>{bakeSurfaceLabels[c.bakeSurface]}{oven.fixedRack ? ` · ${t(oven.name)}` : ` · ${t(rack[2])}`}</strong></div>
      </div>
      {relevantCalibrations.length > 0 && (
        <section className="bake-calibration">
          <div className="personal-calibration">
            <Target />
            <div>
              <span>{t("Dalla tua taratura ·")} {relevantCalibrations.length} {relevantCalibrations.length === 1 ? t("prova confrontabile") : t("prove confrontabili")}</span>
              <strong>{t("Correzione personale")} {personalDelta >= 0 ? "+" : ""}{personalDelta.toLocaleString(locale(), { maximumFractionDigits: 1 })} {t("min")}</strong>
              <small>{exactCalibrations.length ? t("Stesso forno e stessa farina") : t("Basata sullo stesso forno")}</small>
            </div>
            <button className="button secondary" onClick={() => changeMinutes(minutes + personalDelta)}>{t("Applica")}</button>
          </div>
          <p className="calibration-hint">{calibrationHint}</p>
        </section>
      )}
      <small className="baking-disclaimer">{t("Stima comparativa basata su stile, idratazione, spessore, temperatura, tempo, posizione e supporto. Condimenti, temperatura reale e forno specifico possono cambiare il risultato. Dopo aver cotto, registra com’è andata nel Diario, tra le pizze passate: la taratura del forno renderà più precise le prossime previsioni.")}</small>
    </section>
  );
}
