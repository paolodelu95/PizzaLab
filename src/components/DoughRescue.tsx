import { t, msg } from "../i18n";
import { EnvelopeSimple, FirstAid, Warning, X } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

const fixes = {
  sticky: [msg("Troppo appiccicoso"), msg("Ferma la macchina 10 minuti, bagna leggermente le mani e fai una piega. Non aggiungere farina di scatto: prima verifica se una pausa restituisce struttura.")],
  hot: [msg("Impasto troppo caldo"), msg("Sospendi la lavorazione, allarga la massa in un contenitore fresco e portala brevemente in frigo. Riprendi solo quando la temperatura si avvicina all’obiettivo.")],
  weak: [msg("Non prende corda"), msg("Riduci la velocità, fai una pausa di 10 minuti e riparti con brevi cicli. Se hai acqua di riserva, non aggiungerla finché la massa non pulisce la ciotola.")],
  fast: [msg("Sta crescendo troppo"), msg("Anticipa staglio o frigorifero. Non sgonfiare ripetutamente: abbassa la temperatura e controlla di nuovo dopo 20–30 minuti.")],
  slow: [msg("Non sta crescendo"), msg("Porta l’impasto in un punto più tiepido e attendi senza aggiungere altro lievito. Controlla temperatura interna e vitalità del lievito usato.")],
  torn: [msg("Si strappa in stesura"), msg("Copri e lascia rilassare 15–20 minuti. Stendi con meno forza; se resta tenace, la massa è ancora fredda o poco rilassata.")],
} as const;
type Issue = keyof typeof fixes;

/** Un tocco sul problema, la risposta subito sotto: niente menu da aprire con le mani in pasta. */
function RescueBody({ reportUrl }: { reportUrl?: string }) {
  const [issue, setIssue] = useState<Issue>("sticky");
  const fix = fixes[issue];
  return (
    <>
      <div className="rescue-issues" role="radiogroup" aria-label={t("Cosa sta succedendo?")}>
        {(Object.keys(fixes) as Issue[]).map((id) => (
          <button key={id} role="radio" aria-checked={issue === id} className={issue === id ? "selected" : ""} onClick={() => setIssue(id)}>
            {t(fixes[id][0])}
          </button>
        ))}
      </div>
      <div className="rescue-answer" aria-live="polite">
        <Warning />
        <div>
          <strong>{t(fix[0])}</strong>
          <p>{t(fix[1])}</p>
        </div>
      </div>
      {reportUrl && (
        <a className="rescue-report" href={reportUrl}>
          <EnvelopeSimple /> {t("Il tuo problema non è qui? Scrivimi")}
        </a>
      )}
    </>
  );
}

export function DoughRescue({ reportUrl }: { reportUrl?: string }) {
  return (
    <section className="panel rescue" aria-labelledby="rescue-title">
      <div className="panel-title">
        <span className="section-icon"><FirstAid /></span>
        <div>
          <h2 id="rescue-title">{t("Pronto soccorso impasto")}</h2>
          <p>{t("Dimmi cosa vedi, non cosa dice l’orologio.")}</p>
        </div>
      </div>
      <RescueBody reportUrl={reportUrl} />
    </section>
  );
}

/** Pulsante sempre in vista, accanto al profilo: apre il pronto soccorso sopra qualsiasi schermata. */
export function RescueButton({ className = "", onClick }: { className?: string; onClick: () => void }) {
  return (
    <button className={`rescue-button ${className}`} aria-label={t("Pronto soccorso impasto")} title={t("Pronto soccorso impasto")} onClick={onClick}>
      <FirstAid weight="bold" />
      <span>{t("SOS impasto")}</span>
    </button>
  );
}

export function RescueSheet({ open, onClose, reportUrl }: { open: boolean; onClose: () => void; reportUrl?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="flour-picker-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="flour-picker-sheet rescue-sheet" role="dialog" aria-modal="true" aria-labelledby="rescue-sheet-title">
        <header>
          <div>
            <span className="eyebrow">{t("Dimmi cosa vedi, non cosa dice l’orologio.")}</span>
            <h2 id="rescue-sheet-title">{t("Pronto soccorso impasto")}</h2>
          </div>
          <button aria-label={t("Chiudi il pronto soccorso")} onClick={onClose} autoFocus>
            <X />
          </button>
        </header>
        <div className="rescue-sheet-body">
          <RescueBody reportUrl={reportUrl} />
        </div>
      </section>
    </div>
  );
}
