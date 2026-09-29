import type { DoughConfig } from '../domain/types';

export interface OvenProfile {
  id: string;
  name: string;
  family: string;
  /** "generic": forni per tipologia; "pizza": modelli specifici di forni per pizza. */
  group: 'generic' | 'pizza';
  maxTemp: number;
  preheat: number;
  note: string;
  /** Forni con pietra a altezza fissa: il ripiano non si sceglie. */
  fixedRack?: boolean;
  /** Supporto di cottura in dotazione. */
  surface?: DoughConfig['bakeSurface'];
  source?: string;
}

// Caratteristiche riprese dalle schede dei produttori; verifica sempre il manuale del tuo modello.
export const ovenProfiles: OvenProfile[] = [
  { id: 'custom', group: 'generic', name: 'Forno personalizzato', family: 'Personalizzato', maxTemp: 250, preheat: 45, note: 'Imposta la temperatura massima reale del tuo forno.' },
  { id: 'home-static', group: 'generic', name: 'Domestico statico', family: 'Elettrico', maxTemp: 250, preheat: 50, note: 'Pietra o acciaio sul ripiano alto; completa con grill se serve.' },
  { id: 'home-fan', group: 'generic', name: 'Domestico ventilato', family: 'Elettrico', maxTemp: 275, preheat: 45, note: 'Riduci la ventilazione se asciuga troppo la superficie.' },
  { id: 'high-temp-electric', group: 'generic', name: 'Elettrico alta temperatura', family: 'Elettrico pizza', maxTemp: 450, preheat: 25, note: 'Controlla separatamente potenza sopra e sotto quando possibile.', fixedRack: true, surface: 'stone' },
  { id: 'portable-gas', group: 'generic', name: 'Forno pizza portatile a gas', family: 'Gas', maxTemp: 500, preheat: 25, note: 'Ruota spesso la pizza: la fiamma laterale crea zone molto diverse.', fixedRack: true, surface: 'stone' },
  { id: 'wood-fired', group: 'generic', name: 'Forno a legna', family: 'Legna', maxTemp: 500, preheat: 90, note: 'Misura il piano, sposta brace e fiamma e cuoci lontano dai punti eccessivi.', fixedRack: true, surface: 'biscotto' },
  { id: 'gas-deck', group: 'generic', name: 'Forno professionale a gas', family: 'Gas', maxTemp: 450, preheat: 45, note: 'Stabilizza cielo e platea prima del servizio.', fixedRack: true, surface: 'stone' },
  { id: 'kamado', group: 'generic', name: 'Kamado con pietra', family: 'Carbone', maxTemp: 400, preheat: 45, note: 'Usa un deflettore e lascia spazio fra deflettore e pietra.', fixedRack: true, surface: 'stone' },

  { id: 'ariete-909', group: 'pizza', name: 'Ariete 909 Pizza in 4 minuti', family: 'Fornetto elettrico', maxTemp: 400, preheat: 15, fixedRack: true, surface: 'stone', note: 'Pietra refrattaria da circa 32 cm e resistenza sopra la pizza, 1200 W. Si regola con la manopola a 5 livelli: la pizza è pronta in circa 4 minuti.', source: 'https://www.ariete.net/en/product/home-made-pizza-oven-ready-in-4-minutes-red' },
  { id: 'g3-delizia', group: 'pizza', name: 'G3 Ferrari Delizia', family: 'Fornetto elettrico', maxTemp: 400, preheat: 10, fixedRack: true, surface: 'stone', note: 'Pietra refrattaria da 31 cm, 1200 W, da 190 a 400 °C. Preriscalda circa 10 minuti a coperchio chiuso e controlla spesso: cuoce in pochi minuti.' },
  { id: 'effeuno-p134h', group: 'pizza', name: 'Effeuno P134H', family: 'Forno elettrico', maxTemp: 500, preheat: 55, fixedRack: true, surface: 'biscotto', note: 'Due resistenze con regolazione separata di cielo e platea, fino a circa 500 °C. Con il biscotto servono 50–60 minuti per scaldare bene il piano.', source: 'https://shop.effeuno.biz/prodotto/linea-easy-pizza/p134h-versione-500-gradi-con-biscotto-incluso/' },
  { id: 'ooni-volt-12', group: 'pizza', name: 'Ooni Volt 12', family: 'Forno elettrico', maxTemp: 450, preheat: 20, fixedRack: true, surface: 'stone', note: 'Elettrico da interno ed esterno, pietra in cordierite da 33×33 cm. Raggiunge 450 °C in circa 20 minuti; pizza in circa 90 secondi.', source: 'https://ooni.com/pages/ooni-volt' },
  { id: 'ooni-koda-12', group: 'pizza', name: 'Ooni Koda 12', family: 'Gas', maxTemp: 500, preheat: 20, fixedRack: true, surface: 'stone', note: 'A gas con fiamma sul fondo: ruota la pizza ogni 20–30 secondi. Preriscaldamento di circa 20 minuti, pizza in 60–90 secondi.' },
  { id: 'ooni-koda-16', group: 'pizza', name: 'Ooni Koda 16', family: 'Gas', maxTemp: 500, preheat: 20, fixedRack: true, surface: 'stone', source: 'https://ooni.com/products/koda-16', note: 'A gas, fino a circa 500 °C: pronto in circa 20 minuti secondo il produttore. Pietra in cordierite da 15 mm, per pizze fino a 16 pollici (circa 40 cm).' },
  { id: 'ooni-karu-12', group: 'pizza', name: 'Ooni Karu 12', family: 'Legna, carbone o gas', maxTemp: 500, preheat: 15, fixedRack: true, surface: 'stone', note: 'Multi-combustibile, fino a circa 500 °C in 15 minuti. Con legna o carbone alimenta il fuoco poco e spesso per tenere stabile la temperatura.', source: 'https://ooni.com/products/ooni-karu' },
  { id: 'ooni-fyra-12', group: 'pizza', name: 'Ooni Fyra 12', family: 'Pellet', maxTemp: 500, preheat: 15, fixedRack: true, surface: 'stone', note: 'A pellet con alimentazione a gravità, circa 500 °C in 15 minuti. Tieni pieno il serbatoio per evitare cali di calore.', source: 'https://ooni.com/products/ooni-fyra' },
  { id: 'gozney-roccbox', group: 'pizza', name: 'Gozney Roccbox', family: 'Gas o legna', maxTemp: 500, preheat: 30, fixedRack: true, surface: 'stone', note: 'Pietra spessa che mantiene bene il calore fra una pizza e l’altra. Pizza da 30 cm in circa 90 secondi.' },
  { id: 'gozney-dome', group: 'pizza', name: 'Gozney Dome', family: 'Legna o gas', maxTemp: 500, preheat: 45, fixedRack: true, surface: 'stone', note: 'Pietra in cordierite da 30 mm: pronta per la napoletana dopo 40–45 minuti, piano saturo di calore dopo circa 50 minuti.' },
];

export const ovenById = (id: string) => ovenProfiles.find((item) => item.id === id) ?? ovenProfiles[0];
