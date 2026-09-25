import { styles } from './styles';
import type { Advice, DoughConfig, Flour, Stage } from './types';
export const MODEL_VERSION = 'direct-v1';
export function validateConfig(c: DoughConfig): string[] {
  const errors: string[] = [];
  const ranges: [keyof DoughConfig, number, number, string][] = [
    ['count',1,30,'Quantità'], ['ballWeight',100,2000,'Peso panetto'], ['panWidth',10,80,'Larghezza teglia'],
    ['panLength',10,100,'Lunghezza teglia'], ['panDensity',0.3,1,'Impasto per cm²'],
    ['hydration',45,90,'Idratazione'], ['salt',0,4,'Sale'], ['oil',0,10,'Olio'], ['sugar',0,15,'Zucchero'], ['malt',0,5,'Malto'],
    ['bulkHours',0,24,'Puntata'], ['coldHours',0,96,'Ore in frigo'], ['proofHours',0,24,'Appretto'],
    ['roomTemp',10,35,'Temperatura ambiente'], ['fridgeTemp',1,12,'Temperatura frigo'],
    ['ovenTemp',180,500,'Temperatura forno'], ['secondFlourPercent',0,100,'Percentuale seconda farina'],
    ['thirdFlourPercent',0,100,'Percentuale terza farina'],
    ['fourthFlourPercent',0,100,'Percentuale quarta farina'], ['manualYeastPercent',0.001,5,'Lievito manuale'],
    ['prefermentPercent',5,80,'Farina nel prefermento'], ['prefermentHours',3,36,'Durata prefermento'],
    ['prefermentTemp',8,32,'Temperatura prefermento'], ['flourTemp',5,35,'Temperatura farina'],
    ['desiredDoughTemp',18,30,'Temperatura obiettivo impasto'],
  ];
  for (const [key,min,max,name] of ranges) {
    const n = c[key]; if (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max) errors.push(`${name}: inserisci un valore tra ${min} e ${max}.`);
  }
  if (!Number.isInteger(c.count)) errors.push('La quantità deve essere intera.');
  if (!styles.some(s => s.id === c.styleId)) errors.push('Scegli uno stile valido.');
  if (!['fresh','instant'].includes(c.yeast)) errors.push('Tipo di lievito non valido.');
  if (c.secondFlourPercent + c.thirdFlourPercent + c.fourthFlourPercent > 100) errors.push('Le quote delle farine aggiuntive non possono superare il 100%.');
  if (!['auto','manual'].includes(c.yeastMode)) errors.push('Modalità del lievito non valida.');
  if (!['none','poolish','biga'].includes(c.preferment)) errors.push('Prefermento non valido.');
  if (!['hand','stand','spiral','thermomix'].includes(c.mixer)) errors.push('Metodo di impasto non valido.');
  if (c.preferment !== 'none') {
    const prefermentHydration = c.preferment === 'poolish' ? 100 : 50;
    if (c.prefermentPercent * prefermentHydration / 100 > c.hydration) errors.push('Il prefermento richiede più acqua di quella disponibile nella ricetta. Riduci la sua percentuale o aumenta l’idratazione.');
  }
  if (c.bulkHours + c.coldHours + c.proofHours < 2) errors.push('Prevedi almeno 2 ore totali di fermentazione.');
  if (c.bulkHours + c.proofHours < 1) errors.push('Prevedi almeno un’ora complessiva a temperatura ambiente.');
  if (!Number.isFinite(new Date(c.bakeAt).getTime())) errors.push('Imposta giorno e ora della cottura.');
  return errors;
}
export function calculate(c: DoughConfig, flours: Flour[]) {
  const errors = validateConfig(c);
  const flour = flours.find(f => f.id === c.flourId);
  const second = flours.find(f => f.id === c.secondFlourId);
  const third = flours.find(f => f.id === c.thirdFlourId);
  const fourth = flours.find(f => f.id === c.fourthFlourId);
  const prefermentFlour = flours.find(f => f.id === c.prefermentFlourId);
  if (!flour) errors.push('Scegli una farina dal catalogo.');
  if (flour && !flour.usable) errors.push('Questa farina richiede una ricetta specifica: scegli una farina di grano tenero senza lievito aggiunto.');
  if (c.secondFlourPercent > 0 && (!second || !second.usable)) errors.push('Scegli una seconda farina compatibile.');
  if (c.thirdFlourPercent > 0 && (!third || !third.usable)) errors.push('Scegli una terza farina compatibile.');
  if (c.fourthFlourPercent > 0 && (!fourth || !fourth.usable)) errors.push('Scegli una quarta farina compatibile.');
  if (c.preferment !== 'none' && c.prefermentFlourId && (!prefermentFlour || !prefermentFlour.usable)) errors.push('Scegli una farina compatibile per il prefermento.');
  if (errors.length) return { ok: false as const, errors };
  const style = styles.find(s => s.id === c.styleId)!;
  const secondShare = c.secondFlourPercent / 100;
  const thirdShare = c.thirdFlourPercent / 100;
  const fourthShare = c.fourthFlourPercent / 100;
  const firstShare = 1 - secondShare - thirdShare - fourthShare;
  const strength = (f: Flour) => f.w ? (f.w[0] + f.w[1])/2 : null;
  const activeFlours = [
    ...(firstShare > 0 ? [{ flour: flour!, share: firstShare }] : []),
    ...(secondShare > 0 && second ? [{ flour: second, share: secondShare }] : []),
    ...(thirdShare > 0 && third ? [{ flour: third, share: thirdShare }] : []),
    ...(fourthShare > 0 && fourth ? [{ flour: fourth, share: fourthShare }] : []),
  ];
  const strengths = activeFlours.map(({flour,share}) => ({ value: strength(flour), share }));
  let w = strengths.every(item => item.value !== null)
    ? strengths.reduce((sum,item) => sum + item.value! * item.share, 0)
    : null;
  // Heuristic, not a validated fermentation model. Cold-rate floor accounts approximately
  // for slow cooling in a domestic fridge. Never derives W from protein or absorption.
  const roomRate = 2 ** ((c.roomTemp - 22)/10);
  const coldRate = 0.08 * 2 ** ((c.fridgeTemp - 4)/5);
  const equivalentHours = (c.bulkHours + c.proofHours)*roomRate + c.coldHours*coldRate;
  const rawFreshPercent = 0.18 * (8/equivalentHours)**0.85 * (1 + (c.salt-2.5)*0.08);
  const freshPercent = c.yeastMode === 'manual' ? c.manualYeastPercent*(c.yeast==='instant'?3:1) : Math.max(0.02, Math.min(3,rawFreshPercent));
  const yeastPercent = c.yeastMode === 'manual' ? c.manualYeastPercent : c.yeast === 'instant' ? freshPercent/3 : freshPercent;
  const unitWeight = style.pan ? c.panWidth*c.panLength*c.panDensity : c.ballWeight;
  const total = c.count * unitWeight;
  const flourGrams = total/(1+c.hydration/100+c.salt/100+c.oil/100+c.sugar/100+c.malt/100+yeastPercent/100);
  const water = flourGrams*c.hydration/100; const salt = flourGrams*c.salt/100;
  const oil = flourGrams*c.oil/100; const sugar = flourGrams*c.sugar/100; const malt = flourGrams*c.malt/100; const yeast = flourGrams*yeastPercent/100;
  const prefermentHydration = c.preferment === 'poolish' ? 100 : c.preferment === 'biga' ? 50 : 0;
  const prefermentFlourGrams = c.preferment === 'none' ? 0 : flourGrams*c.prefermentPercent/100;
  const prefermentWater = prefermentFlourGrams*prefermentHydration/100;
  const prefermentYeast = c.preferment === 'none' ? 0 : Math.min(yeast*.8,prefermentFlourGrams*.002);
  const mainFlour = flourGrams-prefermentFlourGrams; const mainWater=water-prefermentWater; const mainYeast=yeast-prefermentYeast;
  const prefermentActivity = c.preferment === 'none' ? 0 : c.prefermentHours*2**((c.prefermentTemp-20)/10);
  const prefermentTarget = c.preferment === 'biga' ? 16 : 12;
  const prefermentProgress = c.preferment === 'none' ? 0 : prefermentActivity/prefermentTarget;
  const prefermentMaturity = prefermentProgress < .65 ? 'giovane' : prefermentProgress < .9 ? 'in sviluppo' : prefermentProgress <= 1.2 ? 'al picco' : 'oltre il picco';
  if (c.preferment !== 'none' && prefermentFlour) {
    const prefermentW=strength(prefermentFlour); const prefermentShare=c.prefermentPercent/100;
    w=w!==null&&prefermentW!==null?w*(1-prefermentShare)+prefermentW*prefermentShare:null;
  }
  const friction:Record<DoughConfig['mixer'],number>={hand:3,stand:8,spiral:5,thermomix:12};
  const waterTemp=Math.max(2,Math.min(45,c.desiredDoughTemp*3-c.roomTemp-c.flourTemp-friction[c.mixer]));
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
  if (c.yeastMode === 'auto' && rawFreshPercent !== freshPercent) add('model-limit','warning','Al limite del modello','La dose è stata limitata all’intervallo del calcolatore. Modifica durata o temperatura: questo piano necessita di una prova pratica.');
  if (c.yeastMode === 'manual') add('manual-yeast','info','Dose di lievito manuale','Gli orari restano fissi. Usa il grafico di fermentazione e controlla il volume: la dose inserita può anticipare o ritardare il picco.');
  if (c.preferment !== 'none' && prefermentProgress > 1.2) add('preferment-ripe','warning','Prefermento oltre il picco','Accorcia la durata, abbassa la temperatura o usa il comando Ottimizza. Odore pungente e struttura ceduta indicano che è troppo maturo.');
  if (waterTemp <= 2 || waterTemp >= 45) add('water-temperature','warning','Temperatura dell’acqua fuori dal campo pratico','Il metodo del fattore 3 ha raggiunto il limite del calcolatore. Correggi temperatura ambiente, farina o impasto obiettivo.');
  if (secondShare > 0 || thirdShare > 0 || fourthShare > 0) add('blend','info','La forza della miscela è indicativa','Il W visualizzato è una media ponderata di orientamento: la risposta reale di una miscela non è necessariamente lineare e l’assorbimento va verificato durante l’impasto.');
  if (activeFlours.some(item => item.flour.kind === 'blend') || prefermentFlour?.kind === 'blend') add('special-flour','warning','Miscela speciale','Verifica ingredienti e dosi sulla confezione. Cereali, malto e pasta acida possono modificare assorbimento e fermentazione.');
  const score=(value:number)=>Math.round(Math.max(0,Math.min(100,value)));
  const hydrationCenter=(style.hydrationRange[0]+style.hydrationRange[1])/2;
  const scores={
    lavorabilità:score(100-Math.abs(c.hydration-hydrationCenter)*5-(c.hydration>75?8:0)),
    alveolatura:score(45+(c.hydration-style.hydrationRange[0])*3+(c.preferment!=='none'?8:0)),
    sapore:score(45+Math.min(35,hours*.7)+(c.preferment!=='none'?15:0)),
    coerenza:score(100-Math.abs(c.hydration-style.hydration)*3-(w!==null&&w<style.minW?25:0)),
  };
  const blendAllocation=c.preferment!=='none'&&prefermentFlour?mainFlour:flourGrams;
  return { ok: true as const, total, unitWeight, flour: flourGrams, firstFlour: blendAllocation*firstShare, secondFlour: blendAllocation*secondShare, thirdFlour: blendAllocation*thirdShare, fourthFlour: blendAllocation*fourthShare, water, salt, oil, sugar, malt, yeast, yeastPercent, equivalentHours, hours, w, advice, style, waterTemp, scores, preferment:{ flour:prefermentFlourGrams, water:prefermentWater, yeast:prefermentYeast, mainFlour, mainWater, mainYeast, hydration:prefermentHydration, progress:prefermentProgress, maturity:prefermentMaturity, flourName:prefermentFlour?`${prefermentFlour.brand} ${prefermentFlour.name}`:null } };
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
  if (c.preferment !== 'none') {
    cursor -= c.prefermentHours*hour;
    add('preferment',`Prepara il ${c.preferment}`,c.prefermentHours*hour,`Mescola la quota di farina e acqua del ${c.preferment}, aggiungi il lievito previsto e lascia maturare a ${c.prefermentTemp} °C.`);
  }
  add('mix','Prepara l’impasto',20*60000,'Pesa gli ingredienti. Unisci farina, acqua e lievito; incorpora il prefermento, il sale e gli altri ingredienti previsti. Lavora fino a ottenere una struttura omogenea.');
  if (c.bulkHours > 0) add('bulk','Riposo in massa',c.bulkHours*hour,`Copri l’impasto a ${c.roomTemp} °C. Se serve struttura, fai una piega dopo circa 30 minuti. Osserva la crescita.`);
  if (c.coldHours > 0) add('cold','Metti in frigorifero',c.coldHours*hour,`Riponi in un contenitore coperto a ${c.fridgeTemp} °C, con spazio per crescere. L’impasto non si raffredda istantaneamente.`);
  const pan = styles.find(s=>s.id===c.styleId)?.pan || c.styleId==='padellino';
  if (c.proofHours > 0) add('proof',c.coldHours > 0 ? 'Fuori frigo e porziona' : 'Dividi e fai lievitare',c.proofHours*hour,pan ? `Dividi in ${c.count} porzioni. Lascia rilassare, poi stendi nella teglia unta e termina l’appretto. Copri per evitare la pelle.` : `Forma ${c.count} panetti, copri e lascia rilassare a ${c.roomTemp} °C. Dovranno essere estensibili e ariosi, senza collassare.`);
  stages.push({id:'preheat',title:'Preriscalda il forno',at:new Date(bake-45*60000).toISOString(),until:new Date(bake).toISOString(),detail:`Imposta ${c.ovenTemp} °C. Circa 45 minuti sono un promemoria: segui le indicazioni del tuo forno e della pietra o dell’acciaio.`});
  stages.push({id:'bake',title:'Si inforna!',at:new Date(bake).toISOString(),until:new Date(bake).toISOString(),detail:styles.find(s=>s.id===c.styleId)!.tip});
  return stages.sort((a,b)=>new Date(a.at).getTime()-new Date(b.at).getTime());
}
