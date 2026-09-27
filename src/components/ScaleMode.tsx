import { ArrowLeft, ArrowRight, Check, Scales as Scale, X } from '@phosphor-icons/react';
import { useState } from 'react';
import { useCloseOnBack } from '../services/backNavigation';

import type { ScaleItem } from "../domain/recipes";
export type { ScaleItem };
export function ScaleMode({items,onClose}:{items:ScaleItem[];onClose:()=>void}){
  useCloseOnBack(true,onClose); const [index,setIndex]=useState(0); const [precision,setPrecision]=useState(.1); const item=items[index];
  const value=Math.round(item.grams/precision)*precision;
  const belowResolution=item.grams>0&&value===0;
  return <div className="focus-overlay"><header><div><Scale/><strong>Modalità bilancia</strong></div><button aria-label="Chiudi modalità bilancia" onClick={onClose}><X/></button></header><main className="scale-screen"><span className="focus-progress">INGREDIENTE {index+1} DI {items.length}</span><h2>{item.label}</h2><strong className="scale-value">{belowResolution?`< ${precision.toLocaleString('it-IT')}`:value.toLocaleString('it-IT',{maximumFractionDigits:2})}<small> g</small></strong>{belowResolution&&<p className="scale-warning">La bilancia non riesce a misurare questa dose: non significa zero. Torna al calcolatore e scegli “Grammi interi”, oppure usa una bilancia più precisa.</p>}{item.note&&<p>{item.note}</p>}<label className="precision">Precisione bilancia<select value={precision} onChange={e=>setPrecision(Number(e.target.value))}><option value="1">1 g</option><option value="0.1">0,1 g</option><option value="0.01">0,01 g</option></select></label><div className="focus-actions"><button className="button secondary" disabled={index===0} onClick={()=>setIndex(i=>i-1)}><ArrowLeft/> Indietro</button>{index<items.length-1?<button className="button primary" onClick={()=>setIndex(i=>i+1)}>Pesato <ArrowRight/></button>:<button className="button primary" onClick={onClose}><Check/> Fatto</button>}</div></main></div>;
}
