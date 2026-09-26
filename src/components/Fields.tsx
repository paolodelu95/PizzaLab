import { Minus, Plus } from "@phosphor-icons/react";
import { useEffect, useId, useState } from "react";

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
}) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  useEffect(() => {
    if (Number.isFinite(value)) setDraft(String(value));
  }, [value]);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="number-input">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={draft}
          onChange={(e) => {
            const next = e.target.value;
            setDraft(next);
            const parsed = parseNumberDraft(next, min, max);
            if (parsed !== null) onChange(parsed);
          }}
          onBlur={() => {
            const parsed = Number(draft);
            if (draft.trim() === "" || !Number.isFinite(parsed))
              setDraft(String(value));
            else if (parsed < min || parsed > max) {
              if (clampToRange) {
                const clamped = Math.max(min, Math.min(max, parsed));
                setDraft(String(clamped));
                onChange(clamped);
              } else onChange(parsed);
            }
          }}
        />
        {unit && <span>{unit}</span>}
      </div>
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
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="stepper">
        <button
          aria-label={`Riduci ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - step))}
        >
          <Minus />
        </button>
        <span>
          {value} <small>{unit}</small>
        </span>
        <button
          aria-label={`Aumenta ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + step))}
        >
          <Plus />
        </button>
      </div>
    </div>
  );
}
