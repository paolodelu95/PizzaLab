import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BellRinging,
  BookOpen,
  Jar,
  ListChecks,
  Notebook,
  Pizza,
  Scales as Scale,
  Sparkle,
} from "@phosphor-icons/react";
import { useCloseOnBack } from "../services/backNavigation";
import pizzaLabLogo from "../assets/pizzalab-logo.png";

const slides = [
  {
    icon: null,
    eyebrow: "Benvenuto",
    title: "Il tuo laboratorio della pizza",
    text: "PizzaLab calcola dosi, tempi di lievitazione e cottura per la pizza fatta in casa. Niente account: i dati restano sul telefono e funziona anche offline.",
    points: [] as { icon: typeof Pizza; text: string }[],
  },
  {
    icon: Pizza,
    eyebrow: "Passo per passo",
    title: "Scegli lo stile, poi 4 passaggi",
    text: "Tocca la pizza che vuoi fare: dosi e tempi si impostano da soli. Poi, se vuoi, regola:",
    points: [
      { icon: Sparkle, text: "1 · Impasto: farina, quantità e acqua" },
      { icon: Sparkle, text: "2 · Lievitazione: quando inizi e quando mangi" },
      { icon: Sparkle, text: "3 · Cottura: forno e anteprima del risultato" },
      { icon: ListChecks, text: "4 · Riepilogo: controlli tutto" },
    ],
  },
  {
    icon: BellRinging,
    eyebrow: "Parti quando vuoi",
    title: "Programma o salva per dopo",
    text: "Dal riepilogo premi «Programma»: la pizza parte da sola all’orario impostato e ricevi una notifica a ogni fase. Oppure «Salva per dopo» e la programmi un altro giorno.",
    points: [
      { icon: Notebook, text: "Nel Diario trovi le pizze in corso, salvate e passate" },
      { icon: Scale, text: "Mentre impasti: bilancia e guida passo passo" },
    ],
  },
  {
    icon: BookOpen,
    eyebrow: "Tutto il resto",
    title: "Farine, lievito madre e tanto altro",
    text: "Cerca la tua farina nel catalogo, dosa i condimenti e segui il tuo lievito madre con i rinfreschi. Se una parola non ti è chiara, apri «Impara».",
    points: [
      { icon: Jar, text: "Lievito: rinfreschi e promemoria della tua coltura" },
      { icon: BookOpen, text: "Impara: glossario e pronto soccorso dell’impasto" },
    ],
  },
];

export function Onboarding({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0);
  useCloseOnBack(true, onClose);
  const slide = slides[index];
  const last = index === slides.length - 1;
  return (
    <div className="focus-overlay onboarding" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <header>
        <div>
          <span className="onboarding-step">{index + 1} di {slides.length}</span>
        </div>
        <button className="onboarding-skip" onClick={onClose}>Salta</button>
      </header>
      <main>
        <div className="onboarding-art" aria-hidden="true">
          {slide.icon ? <slide.icon weight="duotone" /> : <img src={pizzaLabLogo} alt="" />}
        </div>
        <span className="eyebrow">{slide.eyebrow}</span>
        <h2 id="onboarding-title">{slide.title}</h2>
        <p>{slide.text}</p>
        {slide.points.length > 0 && (
          <ul className="onboarding-points">
            {slide.points.map((point) => (
              <li key={point.text}>
                <point.icon weight="fill" />
                <span>{point.text}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="onboarding-dots" aria-hidden="true">
          {slides.map((item, i) => (
            <i key={item.title} className={i === index ? "active" : ""} />
          ))}
        </div>
        <div className="focus-actions">
          <button className="button secondary" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
            <ArrowLeft /> Indietro
          </button>
          {last ? (
            <button className="button primary" onClick={onClose}>
              Iniziamo <ArrowRight />
            </button>
          ) : (
            <button className="button primary" onClick={() => setIndex((i) => i + 1)}>
              Avanti <ArrowRight />
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
