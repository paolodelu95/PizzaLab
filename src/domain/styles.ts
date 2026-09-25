import type { DoughConfig, PizzaStyle } from './types';
export const styles: PizzaStyle[] = [
  { id: 'napoletana', name: 'Napoletana', subtitle: 'Sottile al centro, soffice al bordo.', hydration: 63, hydrationRange: [58, 68], ballWeight: 260, salt: 2.8, oil: 0, cold: 18, bulk: 2, proof: 4, minW: 240, oven: 450, bake: 'Circa 60–120 secondi nel forno pizza, controllando e ruotando.', tip: 'Stendi dal centro verso l’esterno senza schiacciare il cornicione. Usa poca farina sul banco.', pan: false },
  { id: 'contemporanea', name: 'Contemporanea', subtitle: 'Cornicione importante, grandi alveoli.', hydration: 72, hydrationRange: [65, 80], ballWeight: 280, salt: 2.7, oil: 0, cold: 24, bulk: 2, proof: 5, minW: 280, oven: 430, bake: 'Indicativamente 90–150 secondi nel forno pizza.', tip: 'Aggiungi l’ultima acqua poco per volta. Ferma l’impasto se si scalda e proteggi i gas durante la stesura.', pan: false },
  { id: 'romana', name: 'Romana tonda', subtitle: 'Bassa, sottile e scrocchiarella.', hydration: 57, hydrationRange: [52, 62], ballWeight: 190, salt: 2.5, oil: 3, cold: 18, bulk: 2, proof: 4, minW: 200, oven: 320, bake: 'Circa 4–7 minuti; in forno domestico i tempi aumentano.', tip: 'Stendi uniformemente fino al bordo. Il mattarello è una possibilità per ottenere una sfoglia sottile.', pan: false },
  { id: 'teglia', name: 'In teglia', subtitle: 'Fondo croccante, cuore arioso.', hydration: 75, hydrationRange: [65, 85], ballWeight: 720, salt: 2.5, oil: 2.5, cold: 24, bulk: 2, proof: 4, minW: 280, oven: 250, bake: 'Circa 15–25 minuti. Prima sul ripiano basso, poi completa più in alto.', tip: 'Ungi la teglia, allarga l’impasto delicatamente e lascialo rilassare se si ritira. Aggiungi la mozzarella verso fine cottura.', pan: true },
  { id: 'pala', name: 'Alla pala', subtitle: 'Leggera, allungata, da condividere.', hydration: 78, hydrationRange: [70, 85], ballWeight: 500, salt: 2.5, oil: 2, cold: 24, bulk: 2, proof: 4, minW: 300, oven: 300, bake: 'Circa 7–12 minuti su pietra o acciaio ben preriscaldati.', tip: 'Spolvera il banco, allarga senza sgonfiare e controlla che l’impasto scorra sulla pala prima di condire.', pan: false },
  { id: 'padellino', name: 'Al padellino', subtitle: 'Alta e soffice, con la base dorata.', hydration: 65, hydrationRange: [60, 72], ballWeight: 250, salt: 2.5, oil: 3, cold: 12, bulk: 2, proof: 4, minW: 240, oven: 250, bake: 'Circa 12–18 minuti in padellino unto, controllando la base.', tip: 'Fai l’ultima lievitazione nel padellino unto. Le dosi sono per padellini di circa 20 cm.', pan: false },
  { id: 'focaccia', name: 'Focaccia', subtitle: 'Morbida, dorata, con un filo d’olio.', hydration: 70, hydrationRange: [62, 80], ballWeight: 720, salt: 2.3, oil: 4, cold: 12, bulk: 2, proof: 3, minW: 240, oven: 230, bake: 'Circa 20–30 minuti; controlla il colore e la cottura della base.', tip: 'Termina la lievitazione in teglia. Forma i buchi con dita unte; olio e salamoia in superficie sono extra rispetto all’impasto.', pan: true },
];
export function localDateTime(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0,16);
}
export function defaultConfig(): DoughConfig {
  const date = new Date(); date.setDate(date.getDate() + 2); date.setHours(20,0,0,0);
  return { styleId: 'napoletana', flourId: 'caputo-pizzeria', secondFlourId: '', secondFlourPercent: 0,
    count: 4, ballWeight: 260, panWidth: 30, panLength: 40, panDensity: 0.6,
    hydration: 63, salt: 2.8, oil: 0, yeast: 'fresh', bulkHours: 2, coldHours: 18, proofHours: 4,
    roomTemp: 22, fridgeTemp: 4, ovenTemp: 450, bakeAt: localDateTime(date) };
}
