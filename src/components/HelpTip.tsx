import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "@phosphor-icons/react";
import { useCloseOnBack } from "../services/backNavigation";

/** Spiegazioni brevi delle parti più tecniche, scritte per chi inizia. */
export const helpTopics = {
  idratazione: {
    title: "Idratazione",
    text: "È la quantità d’acqua rispetto alla farina. 65% vuol dire 650 g d’acqua per ogni kg di farina. Più è bassa, più l’impasto è sodo e facile da lavorare; più è alta, più la pizza viene leggera e alveolata, ma l’impasto è appiccicoso e richiede pratica. Se inizi, resta nella parte bassa dell’intervallo dello stile.",
  },
  forza: {
    title: "W, la forza della farina",
    text: "Il W misura quanto una farina regge la lievitazione: più è alto, più l’impasto sopporta tempi lunghi e tanta acqua. Indicativamente: W 180–250 per impasti di poche ore, 260–320 per 24 ore, oltre 320 per maturazioni lunghe. Il tipo (00, 0, 1…) indica invece quanto è raffinata, non la forza.",
  },
  miscela: {
    title: "Miscela di farine",
    text: "Puoi mescolare fino a quattro farine indicando la quota di ognuna. Serve, per esempio, ad aggiungere un po’ di farina integrale per il sapore o una farina più forte per reggere tempi lunghi. L’app calcola i grammi di ciascuna e una forza media indicativa.",
  },
  superficie: {
    title: "Impasto per superficie",
    text: "Per le pizze in teglia l’impasto si calcola in base alla superficie: grammi per ogni centimetro quadrato. 0,6 g/cm² dà una pizza media; aumenta per una pizza più alta e soffice, diminuisci per una più sottile e croccante.",
  },
  pianificazione: {
    title: "Manuale o automatica",
    text: "In automatico dici solo quando vuoi iniziare e quando vuoi mangiare: PizzaLab decide le ore di ogni riposo e la dose di lievito. In manuale scegli tu le ore di puntata, frigo e appretto, e il lievito si adatta a quei tempi. Se inizi, l’automatica è la più semplice.",
  },
  puntata: {
    title: "Puntata",
    text: "È il primo riposo dell’impasto intero, subito dopo averlo impastato e prima di dividerlo in panetti. Serve a far partire la lievitazione e a dare forza alla massa. Di solito dura da 1 a 3 ore a temperatura ambiente.",
  },
  frigo: {
    title: "Maturazione in frigo",
    text: "Tenere l’impasto in frigo rallenta molto il lievito: la pizza lievita piano, diventa più saporita e più digeribile, e tu puoi organizzarti meglio con gli orari. Per questo l’app lo propone solo da 8 ore in su, e dà il meglio da 12: con meno l’impasto fa appena in tempo a raffreddarsi.",
  },
  appretto: {
    title: "Appretto",
    text: "È l’ultimo riposo, con i panetti già formati, prima di stenderli. I panetti devono diventare morbidi, gonfi e rilassati. Se escono dal frigo, parte del tempo serve solo a farli tornare a temperatura ambiente.",
  },
  lievito: {
    title: "Tipo di lievito",
    text: "Il lievito di birra fresco è il classico panetto del banco frigo; il secco istantaneo è in bustina ed è circa tre volte più concentrato. Pasta madre e Li.Co.Li. sono lieviti naturali fatti di farina e acqua: danno più sapore ma sono più lenti e vanno rinfrescati prima.",
  },
  dosaggio: {
    title: "Come si calcola il lievito",
    text: "«Automatico» calcola la dose in base a tempi e temperature. «Grammi interi» arrotonda a 1, 2, 3 g, comodo se la tua bilancia non pesa i decimali, e adatta i tempi. «Percentuale» ti lascia fissare la dose sulla farina, se hai già una tua ricetta.",
  },
  metodo: {
    title: "Diretto, poolish o biga",
    text: "Nel metodo diretto metti tutto insieme e impasti. Poolish e biga sono preimpasti preparati alcune ore prima con parte della farina, dell’acqua e del lievito: il poolish è liquido, la biga è asciutta e grumosa. Danno più sapore e leggerezza, ma richiedono un passaggio in più.",
  },
  maturita: {
    title: "Maturità del preimpasto",
    text: "Indica a che punto è il poolish o la biga quando lo usi. Troppo giovane dà poco sapore, troppo maturo indebolisce l’impasto. La barra verde è la finestra giusta: «Ottimizza» regola la durata per arrivarci.",
  },
  autolisi: {
    title: "Autolisi",
    text: "È un riposo di farina e acqua, senza lievito e sale, prima di impastare davvero. In 20–40 minuti la farina assorbe l’acqua e l’impasto diventa più liscio ed estensibile con meno fatica. È utile soprattutto con tanta acqua; se inizi puoi farne a meno.",
  },
  pieghe: {
    title: "Pieghe di rinforzo",
    text: "Durante la puntata prendi un lembo di impasto, lo tiri e lo ripieghi sopra, girando la ciotola. Ogni serie di pieghe dà forza agli impasti molto idratati senza impastare di nuovo. Negli impasti più asciutti non servono.",
  },
  temperatura: {
    title: "Temperatura dell’impasto",
    text: "La temperatura finale dell’impasto conta quanto le ore: sopra i 25–26 °C il lievito corre, sotto i 22 °C rallenta. L’app ti suggerisce la temperatura dell’acqua (metodo del fattore 3) tenendo conto di stanza, farina e calore prodotto dall’impastatrice.",
  },
  lavorazione: {
    title: "Come impasti",
    text: "A mano l’impasto si scalda poco ma richiede pause e pieghe. Planetaria e spirale scaldano di più: per questo l’acqua consigliata è più fresca. Per la planetaria l’app suggerisce anche gancio, velocità e tempi del tuo modello.",
  },
  supporto: {
    title: "Supporto di cottura",
    text: "È la superficie su cui appoggi la pizza. Biscotto e pietra cuociono in modo delicato e uniforme; acciaio e ghisa trasmettono più calore, ottimi nei forni di casa che scaldano poco. Nelle teglie scure il fondo colora più in fretta di quelle chiare.",
  },
  fascia: {
    title: "Come leggere il grafico",
    text: "Le tre curve mostrano come cambiano crosta, mollica e fondo con il passare dei minuti. La fascia orizzontale è la zona in cui ciascuno è cotto bene; la colonna tratteggiata indica i tempi consigliati, in cui tutte e tre le curve sono nella fascia. La linea verticale è il tempo che hai scelto.",
  },
  taratura: {
    title: "Taratura del forno",
    text: "Ogni forno è diverso da quello che dichiara. Dopo aver cotto, indica il tempo che hai usato davvero e com’erano crosta, mollica e fondo: PizzaLab corregge le prossime previsioni per quel forno e quella farina.",
  },
  controllo: {
    title: "Check di fermentazione",
    text: "L’orologio è solo una guida: conta come cresce l’impasto. Indica di quanto è aumentato (2× vuol dire raddoppiato), la temperatura reale e com’è al tatto: se sta correndo o è in ritardo, l’app ti propone come correggere i tempi.",
  },
  profilo: {
    title: "Profilo dell’impasto",
    text: "Una lettura rapida delle tue scelte: lavorabilità (quanto è facile da gestire), alveolatura (quanto verrà leggero), sapore (legato soprattutto ai tempi lunghi) e coerenza con lo stile. Sono stime per orientarti, non voti.",
  },
  rinfresco: {
    title: "Rapporto di rinfresco",
    text: "Indica le parti di lievito, farina e acqua. 1:1:1 vuol dire 50 g di lievito, 50 g di farina e 50 g d’acqua: la coltura è pronta in fretta. Con 1:2 o 1:4 dai più «cibo», quindi il picco arriva più tardi: utile se devi aspettare più ore.",
  },
  crescita: {
    title: "Crescita e picco",
    text: "Segna il livello nel barattolo subito dopo il rinfresco. La crescita è di quanto sale (2× vuol dire raddoppiato); il picco è quando smette di salire e la superficie inizia a incurvarsi. Un lievito maturo raddoppia in 3–8 ore.",
  },
} as const;

export type HelpTopic = keyof typeof helpTopics;

/** Tondino «?» che apre una spiegazione con lo stile dei pannelli di scelta. */
export function HelpTip({ topic }: { topic: HelpTopic }) {
  const [open, setOpen] = useState(false);
  useCloseOnBack(open, () => setOpen(false));
  const help = helpTopics[topic];
  return (
    <>
      <button
        type="button"
        className="help-tip"
        aria-label="Che cos’è?"
        title={help.title}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
      >
        ?
      </button>
      {open && createPortal(
        <div
          className="flour-picker-backdrop"
          onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}
          onClick={(event) => event.stopPropagation()}
        >
          <section className="flour-picker-sheet help-sheet" role="dialog" aria-modal="true" aria-label={help.title}>
            <header>
              <div>
                <span className="eyebrow">Che cos’è</span>
                <h2>{help.title}</h2>
              </div>
              <button aria-label="Chiudi spiegazione" onClick={() => setOpen(false)}>
                <X />
              </button>
            </header>
            <p className="help-text">{help.text}</p>
            <div className="help-actions">
              <button className="button primary full" onClick={() => setOpen(false)}>Ho capito</button>
            </div>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
