import { t } from "../i18n";
import { useEffect, useState } from "react";
import { DeviceMobile, Export, PlusSquare, X } from "@phosphor-icons/react";
import { isAppleMobile, isInstalledWebApp, isNativeApp } from "../services/platform";

const DISMISS_KEY = "pizzalab-install-dismissed";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const wasDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
};

/**
 * Invita a installare la web app: su iPhone spiega «Condividi → Aggiungi alla schermata Home»,
 * su Android e computer usa il pulsante di installazione del browser.
 */
export function InstallPrompt({ always = false }: { always?: boolean }) {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [dismissed, setDismissed] = useState(wasDismissed);
  const [installed, setInstalled] = useState(isInstalledWebApp);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (isNativeApp() || installed || (dismissed && !always)) return null;
  const apple = isAppleMobile();
  if (!apple && !installEvent) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* Senza memoria il riquadro ricomparirà: nessun problema. */
    }
  };

  return (
    <section className="install-prompt" aria-labelledby="install-title">
      <span className="install-icon" aria-hidden="true"><DeviceMobile weight="duotone" /></span>
      <div>
        <strong id="install-title">{t("Installa PizzaLab sul telefono")}</strong>
        {apple ? (
          <ol>
            <li>{t("Tocca")} <Export aria-label={t("Condividi")} /> <b>{t("Condividi")}</b> {t("in basso nella barra di Safari.")}</li>
            <li>{t("Scegli")} <PlusSquare aria-hidden="true" /> <b>{t("Aggiungi alla schermata Home")}</b>.</li>
          </ol>
        ) : (
          <p>{t("Si apre come un’app, a tutto schermo e anche senza connessione.")}</p>
        )}
        {apple && <p>{t("Si apre come un’app, a tutto schermo e anche senza connessione. I dati restano sul telefono.")}</p>}
        {!apple && installEvent && (
          <button
            className="button primary"
            onClick={async () => {
              await installEvent.prompt();
              const choice = await installEvent.userChoice;
              if (choice.outcome === "accepted") setInstalled(true);
              setInstallEvent(null);
            }}
          >
            {t("Installa l’app")}
          </button>
        )}
      </div>
      {!always && (
        <button className="icon-button install-close" aria-label={t("Chiudi, lo farò più tardi")} onClick={dismiss}>
          <X />
        </button>
      )}
    </section>
  );
}
