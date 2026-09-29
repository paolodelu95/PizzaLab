import { locale, t } from "../i18n";
import { Minus, Plus } from "@phosphor-icons/react";
import { useEffect, useId, useState, type CSSProperties } from "react";
import { HelpTip, type HelpTopic } from "./HelpTip";
import { getUnits, scaleField, type Quantity } from "../services/units";

export function parseNumberDraft(draft: string, min: number, max: number) {
  if (draft.trim() === "") return null;
  const parsed = Number(draft);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max
    ? parsed
    : null;
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  hint,
  clampToRange = false,
  help,
  quantity,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  hint?: string;
  clampToRange?: boolean;
  help?: HelpTopic;
  /** Peso o temperatura: value, min, max e step restano in g / °C, il campo li mostra nell’unità scelta. */
  quantity?: Quantity;
}) {
  const id = useId();
  const units = getUnits();
  const scale = scaleField(quantity, { min, max, step }, units);
  const shownUnit = quantity ? scale.unit : unit ? t(unit) : unit;
  const [draft, setDraft] = useState(scale.format(value));
  useEffect(() => {
    if (Number.isFinite(value)) setDraft((old) => (scale.matches(old, value) ? old : scale.format(value)));
    // scale dipende solo dalle unità: si ricalcola con loro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, units.weight, units.temp]);
  return (
    <div className="field">
      <div className="field-head">
        <label htmlFor={id}>{label}</label>
        {help && <HelpTip topic={help} />}
      </div>
      <div className="number-input">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={scale.min}
          max={scale.max}
          step={scale.step}
          value={draft}
          onChange={(e) => {
            const next = e.target.value;
            setDraft(next);
            const parsed = parseNumberDraft(next, scale.min, scale.max);
            if (parsed !== null) onChange(scale.fromDisplay(parsed));
          }}
          onBlur={() => {
            const parsed = Number(draft);
            if (draft.trim() === "" || !Number.isFinite(parsed))
              setDraft(scale.format(value));
            else if (parsed < scale.min || parsed > scale.max) {
              if (clampToRange) {
                const clamped = Math.max(scale.min, Math.min(scale.max, parsed));
                setDraft(String(clamped));
                onChange(scale.fromDisplay(clamped));
              } else onChange(scale.fromDisplay(parsed));
            }
          }}
        />
        {shownUnit && <span>{shownUnit}</span>}
      </div>
      {hint && <small>{hint}</small>}
    </div>
  );
}

export function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = "",
  hint,
  sliderMin = min,
  sliderMax = max,
  help,
  quantity,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  hint?: string;
  sliderMin?: number;
  sliderMax?: number;
  help?: HelpTopic;
  /** Peso o temperatura: value, min, max e step restano in g / °C, il campo li mostra nell’unità scelta. */
  quantity?: Quantity;
}) {
  const units = getUnits();
  const scale = scaleField(quantity, { min, max, step }, units);
  const slider = scaleField(quantity, { min: sliderMin, max: sliderMax, step }, units);
  const shownUnit = quantity ? scale.unit : unit ? t(unit) : unit;
  const shownValue = scale.toDisplay(value);
  const [draft, setDraft] = useState(scale.format(value));
  useEffect(() => {
    if (Number.isFinite(value)) setDraft((old) => (scale.matches(old, value) ? old : scale.format(value)));
    // scale dipende solo dalle unità: si ricalcola con loro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, units.weight, units.temp]);
  const publish = (next: number) => {
    const clamped = Math.max(scale.min, Math.min(scale.max, next));
    setDraft(String(clamped));
    onChange(scale.fromDisplay(clamped));
  };
  return (
    <div className="field slider-field">
      <div className="slider-field-head">
        <span className="field-label">
          {label}
          {help && <HelpTip topic={help} />}
        </span>
        <div className="slider-value">
          <input
            aria-label={label}
            type="number"
            inputMode="decimal"
            min={scale.min}
            max={scale.max}
            step={scale.step}
            value={draft}
            onChange={(event) => {
              const next = event.target.value;
              setDraft(next);
              const parsed = parseNumberDraft(next, scale.min, scale.max);
              if (parsed !== null) onChange(scale.fromDisplay(parsed));
            }}
            onBlur={() => {
              const parsed = Number(draft);
              if (!draft.trim() || !Number.isFinite(parsed)) setDraft(scale.format(value));
              else publish(parsed);
            }}
          />
          {shownUnit && <span>{shownUnit}</span>}
        </div>
      </div>
      <input
        className="touch-slider"
        aria-label={t("{label}: cursore", { label })}
        type="range"
        min={slider.min}
        max={slider.max}
        step={slider.step}
        value={Math.max(slider.min, Math.min(slider.max, shownValue))}
        style={{ "--fill": `${slider.max > slider.min ? ((Math.max(slider.min, Math.min(slider.max, shownValue)) - slider.min) / (slider.max - slider.min)) * 100 : 0}%` } as CSSProperties}
        onChange={(event) => publish(Number(event.target.value))}
      />
      <div className="slider-bounds"><span>{slider.min.toLocaleString(locale())} {shownUnit}</span><span>{slider.max.toLocaleString(locale())} {shownUnit}</span></div>
      {hint && <small>{hint}</small>}
    </div>
  );
}
export function Stepper({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = "",
  help,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  help?: HelpTopic;
}) {
  return (
    <div className="field">
      <span className="field-label">
        {label}
        {help && <HelpTip topic={help} />}
      </span>
      <div className="stepper">
        <button
          aria-label={t("Riduci {toLowerCase}", { toLowerCase: label.toLowerCase() })}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - step))}
        >
          <Minus />
        </button>
        <span>
          {value} <small>{unit}</small>
        </span>
        <button
          aria-label={t("Aumenta {toLowerCase}", { toLowerCase: label.toLowerCase() })}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + step))}
        >
          <Plus />
        </button>
      </div>
    </div>
  );
}
