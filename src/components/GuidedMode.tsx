import { ArrowLeft, ArrowRight, Check, Clock, Fire, Pause, Play, Snowflake, Thermometer, X } from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import type { Stage } from '../domain/types';

type Drift='ok'|'fast'|'slow'|'hot'|'cold';
const driftAdvice:Record<Drift,[string,string]>={
  ok:['Tutto regolare','Continua con il piano e osserva volume, elasticità e temperatura.'],
  fast:['Impasto in anticipo','Anticipa il passaggio in frigo o lo staglio. Ricontrolla tra 20 minuti e non aspettare l’orario se la massa sta cedendo.'],
  slow:['Impasto in ritardo','Concedi più tempo in un ambiente leggermente più tiepido. Non aggiungere lievito a impasto già formato.'],
  hot:['Temperatura troppo alta','Ferma la lavorazione e raffredda brevemente la massa. Nelle fasi successive riduci il tempo fuori frigo.'],
  cold:['Impasto troppo freddo','Lascialo acclimatare coperto e valuta la crescita reale prima di stagliare o stendere.'],
};
const formatTime=(seconds:number)=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
export function GuidedMode({title,stages,onClose}:{title:string;stages:Stage[];onClose:()=>void}){
  const [index,setIndex]=useState(0);const [running,setRunning]=useState(false);const [remaining,setRemaining]=useState(0);const [drift,setDrift]=useState<Drift>('ok');
  const stage=stages[index]; const suggested=useMemo(()=>Math.max(0,Math.round((new Date(stage.until).getTime()-new Date(stage.at).getTime())/1000)),[stage]);
  useEffect(()=>{setRemaining(Math.min(suggested,45*60));setRunning(false);},[suggested,index]);
  useEffect(()=>{if(!running||remaining<=0)return;const timer=setInterval(()=>setRemaining(s=>s-1),1000);return()=>clearInterval(timer);},[running,remaining]);
  const advice=driftAdvice[drift];
  return <div className="focus-overlay guided-mode"><header><div><Clock/><span><small>MODALITÀ GUIDATA</small><strong>{title}</strong></span></div><button aria-label="Chiudi modalità guidata" onClick={onClose}><X/></button></header><main><div className="guided-top"><span>{index+1} / {stages.length}</span><div>{stages.map((_,i)=><i key={i} className={i<=index?'done':''}/>)}</div></div><div className="guided-icon">{stage.id==='bake'?<Fire/>:stage.id==='cold'?<Snowflake/>:<Clock/>}</div><span className="focus-progress">FASE ATTUALE</span><h2>{stage.title}</h2><p className="guided-detail">{stage.detail}</p>{suggested>0&&<div className="guided-timer"><strong>{formatTime(remaining)}</strong><button onClick={()=>setRunning(v=>!v)}>{running?<><Pause/> Pausa</>:<><Play/> Avvia timer</>}</button></div>}<section className="live-adjust"><div><Thermometer/><strong>Come sta andando?</strong></div><div className="drift-options"><button className={drift==='ok'?'selected':''} onClick={()=>setDrift('ok')}>Regolare</button><button className={drift==='fast'?'selected':''} onClick={()=>setDrift('fast')}>In anticipo</button><button className={drift==='slow'?'selected':''} onClick={()=>setDrift('slow')}>In ritardo</button><button className={drift==='hot'?'selected':''} onClick={()=>setDrift('hot')}>Troppo caldo</button><button className={drift==='cold'?'selected':''} onClick={()=>setDrift('cold')}>Troppo freddo</button></div><article><strong>{advice[0]}</strong><p>{advice[1]}</p></article></section><div className="focus-actions"><button className="button secondary" disabled={index===0} onClick={()=>setIndex(i=>i-1)}><ArrowLeft/> Indietro</button>{index<stages.length-1?<button className="button primary" onClick={()=>setIndex(i=>i+1)}>Fase completata <ArrowRight/></button>:<button className="button primary" onClick={onClose}><Check/> Terminato</button>}</div></main></div>;
}
