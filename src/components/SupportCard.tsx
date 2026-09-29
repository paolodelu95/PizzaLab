import { t } from "../i18n";
import { ArrowSquareOut, Heart, Pizza } from "@phosphor-icons/react";
import { DONATION_URL } from "../config";

/** Offerta del tutto facoltativa: non sblocca nulla e apre il browser esterno. */
export function SupportCard() {
  if (!DONATION_URL) return null;
  return (
    <section className="support-card" aria-labelledby="support-title">
      <span className="support-art" aria-hidden="true"><Pizza weight="duotone" /></span>
      <div>
        <h2 id="support-title">{t("Ti è stata utile? Offrimi una pizza")}</h2>
        <p>
          {t("PizzaLab è gratuita, senza pubblicità e senza account, e resterà così. Se ti ha aiutato a sfornare una bella pizza, puoi lasciare un contributo libero: è del tutto facoltativo e non sblocca nulla, tutto funziona allo stesso modo.")}
        </p>
        <a className="button primary" href={DONATION_URL} target="_blank" rel="noopener noreferrer">
          <Heart weight="fill" /> {t("Offrimi una pizza")} <ArrowSquareOut />
        </a>
        <small>{t("Si apre PayPal nel browser.")}</small>
      </div>
    </section>
  );
}
