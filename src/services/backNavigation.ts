import { useEffect, useRef } from "react";

/**
 * Collega un pannello a tutto schermo al tasto «Indietro» di Android (e del browser):
 * aprirlo aggiunge una voce alla cronologia, «Indietro» lo chiude invece di uscire dall’app.
 */
export function useCloseOnBack(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const marker = `overlay-${Math.random().toString(36).slice(2)}`;
    window.history.pushState({ ...(window.history.state ?? {}), overlay: marker }, "");
    let popped = false;
    const onPop = () => {
      popped = true;
      closeRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      // Chiuso dall’interfaccia: rimuove la voce aggiunta, senza toccare altre navigazioni.
      if (!popped)
        setTimeout(() => {
          if (window.history.state?.overlay === marker) window.history.back();
        }, 0);
    };
  }, [open]);
}
