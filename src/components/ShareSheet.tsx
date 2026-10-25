import { Copy, ShareNetwork, X } from "@phosphor-icons/react";
import qrcode from "qrcode-generator";
import { useEffect, useMemo } from "react";
import { t } from "../i18n";
import { useCloseOnBack } from "../services/backNavigation";

/** Il QR come percorso SVG: prende il colore del tema e resta nitido a ogni dimensione. */
function QrCode({ text }: { text: string }) {
  const { size, path } = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(text);
    qr.make();
    const count = qr.getModuleCount();
    let d = "";
    for (let row = 0; row < count; row++)
      for (let col = 0; col < count; col++) if (qr.isDark(row, col)) d += `M${col + 2} ${row + 2}h1v1h-1z`;
    return { size: count + 4, path: d };
  }, [text]);
  return (
    <svg className="share-qr" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={t("Codice QR della ricetta")} shapeRendering="crispEdges">
      <rect width={size} height={size} fill="#fff" />
      <path d={path} fill="#1d1813" />
    </svg>
  );
}

/**
 * Condividere una ricetta senza account: un link che apre PizzaLab con le stesse dosi, da mandare
 * in chat o da inquadrare col telefono di chi è accanto. Le date le sceglie chi riceve.
 */
export function ShareSheet({ name, link, text, onClose, onMessage }: { name: string; link: string; text: string; onClose: () => void; onMessage: (message: string) => void }) {
  useCloseOnBack(true, onClose);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const send = async () => {
    try {
      if (navigator.share) await navigator.share({ title: name, text, url: link });
      else await copy();
    } catch {
      /* L’utente può chiudere il pannello di condivisione senza conseguenze. */
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${text}\n${link}`);
      onMessage(t("Link della ricetta copiato."));
    } catch {
      onMessage(t("Non riesco a copiare: tieni premuto sul link per copiarlo."));
    }
  };
  return (
    <div className="flour-picker-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="flour-picker-sheet share-sheet" role="dialog" aria-modal="true" aria-labelledby="share-sheet-title">
        <header>
          <div>
            <span className="eyebrow">{t("Condividi la ricetta")}</span>
            <h2 id="share-sheet-title">{name}</h2>
          </div>
          <button aria-label={t("Chiudi")} onClick={onClose} autoFocus>
            <X />
          </button>
        </header>
        <div className="share-body">
          <QrCode text={link} />
          <p>{t("Chi inquadra il codice o apre il link trova la stessa pizza in PizzaLab, pronta da programmare. Serve solo scegliere quando mangiare.")}</p>
          <code className="share-link">{link}</code>
          <div className="share-actions">
            <button className="button primary" onClick={() => void send()}>
              <ShareNetwork /> {t("Invia il link")}
            </button>
            <button className="button secondary" onClick={() => void copy()}>
              <Copy /> {t("Copia")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
