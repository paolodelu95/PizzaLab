import { getLanguage, t } from "../i18n";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { CaretDown, Check, MagnifyingGlass, X } from "@phosphor-icons/react";
import { useCloseOnBack } from "../services/backNavigation";
import { HelpTip, type HelpTopic } from "./HelpTip";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  group?: string;
}

const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Selezione a pannello, con lo stesso stile della scelta delle farine:
 * sostituisce le tendine native di Android in tutta l’app.
 */
export function SelectSheet<T extends string>({
  label,
  value,
  options,
  onChange,
  help,
  hint,
  hideLabel = false,
  searchPlaceholder,
  className = "",
  icon,
}: {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  help?: HelpTopic;
  hint?: string;
  hideLabel?: boolean;
  searchPlaceholder?: string;
  className?: string;
  icon?: ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  useCloseOnBack(open, () => setOpen(false));
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);
  const selected = options.find((option) => option.value === value);
  const searchable = options.length > 10;
  const filtered = useMemo(() => {
    const needle = normalize(query.trim());
    return needle
      ? options.filter((option) => normalize(`${t(option.label)} ${t(option.description ?? "")} ${t(option.group ?? "")}`).includes(needle))
      : options;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, query, getLanguage()]);
  const groups = filtered.reduce<{ name: string; items: SelectOption<T>[] }[]>((acc, option) => {
    const name = option.group ?? "";
    const group = acc.find((item) => item.name === name);
    if (group) group.items.push(option);
    else acc.push({ name, items: [option] });
    return acc;
  }, []);
  const choose = (next: T) => {
    onChange(next);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className={`field select-field ${className}`}>
      <span className={`field-label ${hideLabel ? "visually-hidden" : ""}`}>
        <span id={`${id}-label`}>{label}</span>
        {help && <HelpTip topic={help} />}
      </span>
      <button
        type="button"
        className="select-trigger"
        aria-haspopup="dialog"
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => setOpen(true)}
      >
        {icon && <span className="select-trigger-icon">{icon}</span>}
        <span id={`${id}-value`} className="select-trigger-value">
          <strong>{selected ? t(selected.label) : t("Scegli")}</strong>
          {selected?.description && <small>{t(selected.description)}</small>}
        </span>
        <CaretDown className="select-caret" />
      </button>
      {hint && <small>{hint}</small>}
      {open && (
        <div className="flour-picker-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <section className="flour-picker-sheet select-sheet" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}>
            <header>
              <div>
                <span className="eyebrow">{t("Scegli")}</span>
                <h2 id={`${id}-title`}>{label}</h2>
              </div>
              <button aria-label={t("Chiudi {toLowerCase}", { toLowerCase: label.toLowerCase() })} onClick={() => setOpen(false)}>
                <X />
              </button>
            </header>
            {searchable && (
              <div className="flour-picker-search">
                <MagnifyingGlass />
                <input
                  aria-label={t("Cerca in {toLowerCase}", { toLowerCase: label.toLowerCase() })}
                  placeholder={searchPlaceholder ?? t("Cerca…")}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            )}
            <div className="flour-picker-results">
              {groups.map((group) => (
                <div key={group.name || "default"} className="select-group" role="group" aria-label={group.name || undefined}>
                  {group.name && <p className="select-group-title">{t(group.name)}</p>}
                  {group.items.map((option) => (
                    <button
                      key={option.value}
                      className={option.value === value ? "selected" : ""}
                      aria-pressed={option.value === value}
                      onClick={() => choose(option.value)}
                    >
                      <span>
                        <strong>{t(option.label)}</strong>
                        {option.description && <em>{t(option.description)}</em>}
                      </span>
                      {option.value === value && <Check weight="bold" />}
                    </button>
                  ))}
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="flour-picker-empty">
                  <MagnifyingGlass />
                  <strong>{t("Nessun risultato")}</strong>
                  <span>{t("Prova con un’altra parola.")}</span>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
