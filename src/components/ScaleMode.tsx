import { locale, t } from "../i18n";
import { ArrowLeft, ArrowRight, Check, Scales as Scale, X } from '@phosphor-icons/react';
import { useState } from 'react';
import { useCloseOnBack } from '../services/backNavigation';
import { SelectSheet } from './SelectSheet';
import { gramsToOunces, weightParts } from '../services/units';

import type { ScaleItem } from "../domain/recipes";
export type { ScaleItem };
export function ScaleMode({items,onClose}:{items:ScaleItem[];onClose:()=>void}){
  useCloseOnBack(true,onClose); const [index,setIndex]=useState(0); const [level,setLevel]=useState(1); const item=items[index];
  // Come nel resto dell’app, in once le dosi minuscole (lievito, malto) restano in grammi: la bilancia segue la stessa regola.
  const unit=weightParts(item.grams).unit==='oz'?'oz':'g';
  const precisions=unit==='oz'?[.1,.05,.01]:[1,.1,.01];
  const precision=precisions[level];
  const amount=unit==='oz'?gramsToOunces(item.grams):item.grams;
  const value=Math.round(amount/precision)*precision;
  const belowResolution=item.grams>0&&value===0;
  return <div className="focus-overlay"><header><div><Scale/><strong>{t("Modalità bilancia")}</strong></div><button aria-label={t("Chiudi modalità bilancia")} onClick={onClose}><X/></button></header><main className="scale-screen"><span className="focus-progress">{t("INGREDIENTE")} {index+1} {t("DI")} {items.length}</span><h2>{item.label}</h2><strong className="scale-value">{belowResolution?`< ${precision.toLocaleString(locale())}`:value.toLocaleString(locale(),{maximumFractionDigits:2})}<small> {unit}</small></strong>{belowResolution&&<p className="scale-warning">{t("La bilancia non riesce a misurare questa dose: non significa zero. Torna al calcolatore e scegli “Grammi interi”, oppure usa una bilancia più precisa.")}</p>}{item.note&&<p>{item.note}</p>}<SelectSheet className="precision" label={t("Precisione bilancia")} value={String(level)} options={[{value:'0',label:`${precisions[0].toLocaleString(locale())} ${unit}`,description:t("Bilancia da cucina comune")},{value:'1',label:`${precisions[1].toLocaleString(locale())} ${unit}`,description:t("Bilancia di precisione")},{value:'2',label:`${precisions[2].toLocaleString(locale())} ${unit}`,description:t("Bilancino da laboratorio")}]} onChange={v=>setLevel(Number(v))}/><div className="focus-actions"><button className="button secondary" disabled={index===0} onClick={()=>setIndex(i=>i-1)}><ArrowLeft/> {t("Indietro")}</button>{index<items.length-1?<button className="button primary" onClick={()=>setIndex(i=>i+1)}>{t("Pesato")} <ArrowRight/></button>:<button className="button primary" onClick={onClose}><Check/> {t("Fatto")}</button>}</div></main></div>;
}
