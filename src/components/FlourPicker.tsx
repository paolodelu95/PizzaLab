import { t, msg } from "../i18n";
import { strengthLine } from "../domain/flourStrength";
import { Check, MagnifyingGlass, X, Grains as Wheat } from '@phosphor-icons/react';
import { useEffect, useId, useMemo, useState } from 'react';
import type { Flour } from '../domain/types';
import { useCloseOnBack } from '../services/backNavigation';

const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

export function FlourPicker({label,value,flours,onChange,allowEmpty=false,emptyLabel=msg('Nessuna farina')}:{
  label:string;value:string;flours:Flour[];onChange:(id:string)=>void;allowEmpty?:boolean;emptyLabel?:string;
}){
  const id=useId();const [open,setOpen]=useState(false);const [query,setQuery]=useState('');
  useCloseOnBack(open,()=>setOpen(false));
  const selected=flours.find(item=>item.id===value);
  const usable=useMemo(()=>flours.filter(item=>item.usable),[flours]);
  const filtered=useMemo(()=>{const needle=normalize(query.trim());const matches=needle?usable.filter(item=>normalize(`${t(item.brand)} ${t(item.name)} ${t(item.type)} ${item.w?.join(' ')??''} ${item.glutenFree?'senza glutine gluten free':''}`).includes(needle)):usable;return [...matches].sort((a,b)=>Number(b.brand==='Farina generica')-Number(a.brand==='Farina generica')).slice(0,100);},[query,usable]);
  useEffect(()=>{if(!open)return;const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false);};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close);},[open]);
  const choose=(next:string)=>{onChange(next);setOpen(false);setQuery('');};
  return <div className="field flour-picker-field"><label id={`${id}-label`}>{label}</label><button className="flour-picker-trigger" aria-labelledby={`${id}-label`} aria-haspopup="dialog" onClick={()=>setOpen(true)}><span className="flour-picker-icon"><Wheat/></span><span><small>{selected?.brand?t(selected.brand):t("MISCELA")}</small><strong>{selected?.name?t(selected.name):t(emptyLabel)}</strong>{selected&&<em>{selected.glutenFree?t("Senza glutine"):t("Tipo {type} · {v}", { type: selected.type, v: strengthLine(selected) })}</em>}</span><MagnifyingGlass/></button>{open&&<div className="flour-picker-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setOpen(false);}}><section className="flour-picker-sheet" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}><header><div><span className="eyebrow">{t("SCEGLI LA FARINA")}</span><h2 id={`${id}-title`}>{label}</h2></div><button aria-label={t("Chiudi selezione farine")} onClick={()=>setOpen(false)}><X/></button></header><div className="flour-picker-search"><MagnifyingGlass/><input autoFocus aria-label={t("Cerca per {toLowerCase}", { toLowerCase: label.toLowerCase() })} placeholder={t("Cerca tipo 1, semola, senza glutine…")} value={query} onChange={event=>setQuery(event.target.value)}/></div>{!query&&<p className="flour-picker-hint">{t("Le farine generiche e le miscele senza glutine sono ricercabili per nome. Il W non si applica alle miscele gluten free.")}</p>}<div className="flour-picker-results">{allowEmpty&&<button className={!value?'selected':''} onClick={()=>choose('')}><span className="flour-option-icon"><X/></span><span><small>{t("OPZIONALE")}</small><strong>{emptyLabel}</strong><em>{t("Nessuna quota aggiuntiva")}</em></span>{!value&&<Check weight="bold"/>}</button>}{filtered.map(item=><button key={item.id} className={item.id===value?'selected':''} onClick={()=>choose(item.id)}><span className="flour-option-icon"><Wheat/></span><span><small>{t(item.brand)}</small><strong>{t(item.name)}</strong><em>{item.glutenFree?t("SENZA GLUTINE · segui la confezione"):t('Tipo {type} · {w}',{type:item.type,w:strengthLine(item)})}</em></span>{item.id===value&&<Check weight="bold"/>}</button>)}</div>{filtered.length===0&&<div className="flour-picker-empty"><MagnifyingGlass/><strong>{t("Nessun risultato")}</strong><span>{t("Prova con marca, nome o tipo di farina.")}</span></div>}</section></div>}</div>;
}
