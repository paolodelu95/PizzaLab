import { useState, type ReactNode } from "react";
import { CaretDown, SlidersHorizontal } from "@phosphor-icons/react";

const KEY = "pizzalab-adjustments-open";
const remembered = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

/**
 * Regolazioni avanzate: chiuse per chi inizia, aperte per chi le usa.
 * La scelta si ricorda, così l’esperto non deve riaprirle a ogni passaggio.
 */
export function Adjustments({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  const [open, setOpen] = useState(remembered);
  return (
    <details
      className="adjustments"
      open={open}
      onToggle={(event) => {
        const next = event.currentTarget.open;
        setOpen(next);
        try {
          localStorage.setItem(KEY, next ? "1" : "0");
        } catch {
          /* Senza memoria resta la scelta di questa sessione. */
        }
      }}
    >
      <summary>
        <span className="adjustments-icon" aria-hidden="true"><SlidersHorizontal /></span>
        <span><strong>{title}</strong><small>{hint}</small></span>
        <CaretDown className="adjustments-caret" aria-hidden="true" />
      </summary>
      <div className="adjustments-body">{children}</div>
    </details>
  );
}
