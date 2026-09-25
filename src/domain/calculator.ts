import { styles } from './styles';
import type { Advice, DoughConfig, Flour, Stage } from './types';
export const MODEL_VERSION = 'direct-v1';
export function validateConfig(c: DoughConfig): string[] {
  const errors: string[] = [];
  const ranges: [keyof DoughConfig, number, number, string][] = [
    ['count',1,30,'Quantità'], ['ballWeight',100,2000,'Peso panetto'], ['panWidth',10,80,'Larghezza teglia'],
    ['panLength',10,100,'Lunghezza teglia'], ['panDensity',0.3,1,'Impasto per cm²'],
    ['hydration',45,90,'Idratazione'], ['salt',0,4,'Sale'], ['oil',0,10,'Olio'],
    ['bulkHours',0,24,'Puntata'], ['coldHours',0,96,'Ore in frigo'], ['proofHours',0,24,'Appretto'],
    ['roomTemp',10,35,'Temperatura ambiente'], ['fridgeTemp',1,12,'Temperatura frigo'],
    ['ovenTemp',180,500,'Temperatura forno'], ['secondFlourPercent',0,100,'Percentuale miscela'],
  ];
  for (const [key,min,max,name] of ranges) {
    const n = c[key]; if (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max) errors.push(`${name}: inserisci un valore tra ${min} e ${max}.`);
  }
  if (!Number.isInteger(c.count)) errors.push('La quantità deve essere intera.');
  if (!styles.some(s => s.id === c.styleId)) errors.push('Scegli uno stile valido.');
  if (!['fresh','instant'].includes(c.yeast)) errors.push('Tipo di lievito non valido.');
  if (c.bulkHours + c.coldHours + c.proofHours < 2) errors.push('Prevedi almeno 2 ore totali di fermentazione.');
  if (c.bulkHours + c.proofHours < 1) errors.push('Prevedi almeno un’ora complessiva a temperatura ambiente.');
  if (!Number.isFinite(new Date(c.bakeAt).getTime())) errors.push('Imposta giorno e ora della cottura.');
  return errors;
}
export function calculate(c: DoughConfig, flours: Flour[]) {
  const errors = validateConfig(c);
  const flour = flours.find(f => f.id === c.flourId);
  const second = flours.find(f => f.id === c.secondFlourId);
  if (!flour) errors.push('Scegli una farina dal catalogo.');
  if (flour && !flour.usable) errors.push('Questa farina richiede una ricetta specifica: scegli una farina di grano tenero senza lievito aggiunto.');
  if (c.secondFlourPercent > 0 && (!second || !second.usable)) errors.push('Scegli una seconda farina compatibile.');
  if (errors.length) return { ok: false as const, errors };
  const style = styles.find(s => s.id === c.styleId)!;
  const share = c.secondFlourPercent / 100;
  const strength = (f: Flour) => f.w ? (f.w[0] + f.w[1])/2 : null;
  const firstW = strength(flour!); const secondW = second ? strength(second) : null;
  const w = share === 1 ? secondW : share === 0 ? firstW : firstW !== null && secondW !== null ? firstW*(1-share)+secondW*share : null;
  // Heuristic, not a validated fermentation model. Cold-rate floor accounts approximately
  // for slow cooling in a domestic fridge. Never derives W from protein or absorption.
  const roomRate = 2 ** ((c.roomTemp - 22)/10);
  const coldRate = 0.08 * 2 ** ((c.fridgeTemp - 4)/5);
  const equivalentHours = (c.bulkHours + c.proofHours)*roomRate + c.coldHours*coldRate;
  const rawFreshPercent = 0.18 * (8/equivalentHours)**0.85 * (1 + (c.salt-2.5)*0.08);
  const freshPercent = Math.max(0.02, Math.min(3,rawFreshPercent));
  const yeastPercent = c.yeast === 'instant' ? freshPercent/3 : freshPercent;
  const unitWeight = style.pan ? c.panWidth*c.panLength*c.panDensity : c.ballWeight;
  const total = c.count * unitWeight;
  const flourGrams = total/(1+c.hydration/100+c.salt/100+c.oil/100+yeastPercent/100);
  const water = flourGrams*c.hydration/100; const salt = flourGrams*c.salt/100;
  const oil = flourGrams*c.oil/100; const yeast = flourGrams*yeastPercent/100;
  const hours = c.bulkHours+c.coldHours+c.proofHours;
  const advice: Advice[] = [];
  const add = (id: string, level: Advice['level'], title: string, text: string) => advice.push({id,level,title,text});
  if (w === null) add('unknown-w','warning','La forza W non è disponibile','Non posso valutare la tenuta della farina. Controlla la scheda tecnica: le proteine da sole non determinano il W.');
  if (w !== null && w < style.minW) add('weak-style','warning','Farina delicata per questo stile',`Come punto di partenza, valuta una farina intorno a W ${style.minW} o superiore. Riduci idratazione e durata e osserva la tenuta dell’impasto.`);
  if (w !== null && ((w < 240 && hours > 24) || (w < 300 && hours > 48) || (w < 340 && hours > 72))) add('long-weak','warning','Tempi impegnativi per questa farina','La durata è elevata rispetto alla forza dichiarata. Accorcia il riposo oppure scegli una farina più forte; W e ore non hanno una corrispondenza esatta.');
  if (c.hydration < style.hydrationRange[0] || c.hydration > style.hydrationRange[1]) add('hydration-style','warning','Idratazione fuori dall’intervallo di partenza',`Per ${style.name.toLowerCase()} il riferimento pratico è ${style.hydrationRange[0]}–${style.hydrationRange[1]}%. Puoi sperimentare, adeguando la lavorazione.`);
  if (c.hydration >= 75) add('wet','info','Tieni da parte l’ultima acqua','Un impasto molto idratato richiede buona struttura. Aggiungi l’acqua gradualmente e usa pause e pieghe; l’assorbimento di laboratorio non è l’idratazione della ricetta.');
  if (w !== null && w < 260 && c.hydration > 70) add('weak-wet','warning','Acqua elevata per una farina poco forte','Parti con meno acqua. Se l’impasto perde struttura, aggiungerne ancora rende la gestione più difficile.');
  if (c.roomTemp >= 27) add('warm','warning','In cucina fa caldo','Controlla l’impasto prima dell’orario previsto. Usa acqua fresca, misura la temperatura finale e accorcia le fasi fuori frigo se la crescita è rapida.');
  if (c.coldHours > 0 && c.fridgeTemp > 5) add('fridge','warning','Il frigo rallenta meno del previsto','Verifica con un termometro la temperatura effettiva vicino all’impasto. Il modello diventa meno affidabile sopra 5 °C: controlla la crescita e riduci i tempi.');
  if (c.coldHours > 0 && c.proofHours < 2) add('short-proof','warning','Poco tempo dopo il frigo','L’impasto potrebbe essere ancora freddo e tenace. Considera almeno 2–4 ore, adattandoti a dimensione dei panetti e temperatura reale.');
  if (c.bulkHours+c.proofHours > 16) add('long-room','warning','Molte ore fuori frigo','Con tempi così lunghi la stima del lievito è meno affidabile. Monitora volume, elasticità e temperatura; non aspettare l’orario se l’impasto sta cedendo.');
  if (c.ovenTemp < 380 && ['napoletana','contemporanea'].includes(c.styleId)) add('oven','warning','Adatta la cottura al forno di casa','Questo stile nasce per forni molto caldi. Preriscalda bene pietra o acciaio e prolunga la cottura controllando la base: il risultato sarà diverso.');
  if (c.salt < 1.5) add('low-salt','warning','Poco sale nell’impasto','Il sale contribuisce a struttura e controllo della fermentazione. Con questa dose verifica più spesso la crescita.');
  if (yeast < 0.1) add('scale','warning','Dose difficile da pesare','Serve una bilancia da 0,01 g. In alternativa prepara una sospensione 1:9 di lievito e acqua e usane dieci volte la dose, sottraendo l’acqua usata da quella totale.');
  if (rawFreshPercent !== freshPercent) add('model-limit','warning','Al limite del modello','La dose è stata limitata all’intervallo del calcolatore. Modifica durata o temperatura: questo piano necessita di una prova pratica.');
  if (share > 0 && share < 1) add('blend','info','La forza della miscela è indicativa','Il W visualizzato è una media ponderata di orientamento: la risposta reale di una miscela non è necessariamente lineare.');
  if (flour!.kind === 'blend' || (share > 0 && second?.kind === 'blend')) add('special-flour','warning','Miscela speciale','Verifica ingredienti e dosi sulla confezione. Cereali, malto e pasta acida possono modificare assorbimento e fermentazione.');
  return { ok: true as const, total, unitWeight, flour: flourGrams, firstFlour: flourGrams*(1-share), secondFlour: flourGrams*share, water, salt, oil, yeast, yeastPercent, equivalentHours, hours, w, advice, style };
}
export function buildTimeline(c: DoughConfig): Stage[] {
  if (validateConfig(c).length) return [];
  const bake = new Date(c.bakeAt).getTime();
  const hour = 3600000;
  let cursor = bake - (c.bulkHours+c.coldHours+c.proofHours)*hour - 20*60000;
  const stages: Stage[] = [];
  const add = (id:string,title:string,duration:number,detail:string) => {
    stages.push({id,title,at:new Date(cursor).toISOString(),until:new Date(cursor+duration).toISOString(),detail}); cursor += duration;
  };
  add('mix','Prepara l’impasto',20*60000,'Pesa gli ingredienti. Unisci farina, acqua e lievito; incorpora sale e, se previsto, olio. Lavora fino a ottenere una struttura omogenea.');
  if (c.bulkHours > 0) add('bulk','Riposo in massa',c.bulkHours*hour,`Copri l’impasto a ${c.roomTemp} °C. Se serve struttura, fai una piega dopo circa 30 minuti. Osserva la crescita.`);
  if (c.coldHours > 0) add('cold','Metti in frigorifero',c.coldHours*hour,`Riponi in un contenitore coperto a ${c.fridgeTemp} °C, con spazio per crescere. L’impasto non si raffredda istantaneamente.`);
  const pan = styles.find(s=>s.id===c.styleId)?.pan || c.styleId==='padellino';
  if (c.proofHours > 0) add('proof',c.coldHours > 0 ? 'Fuori frigo e porziona' : 'Dividi e fai lievitare',c.proofHours*hour,pan ? `Dividi in ${c.count} porzioni. Lascia rilassare, poi stendi nella teglia unta e termina l’appretto. Copri per evitare la pelle.` : `Forma ${c.count} panetti, copri e lascia rilassare a ${c.roomTemp} °C. Dovranno essere estensibili e ariosi, senza collassare.`);
  stages.push({id:'preheat',title:'Preriscalda il forno',at:new Date(bake-45*60000).toISOString(),until:new Date(bake).toISOString(),detail:`Imposta ${c.ovenTemp} °C. Circa 45 minuti sono un promemoria: segui le indicazioni del tuo forno e della pietra o dell’acciaio.`});
  stages.push({id:'bake',title:'Si inforna!',at:new Date(bake).toISOString(),until:new Date(bake).toISOString(),detail:styles.find(s=>s.id===c.styleId)!.tip});
  return stages.sort((a,b)=>new Date(a.at).getTime()-new Date(b.at).getTime());
}
