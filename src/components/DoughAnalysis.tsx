import { ChartLine, Gauge, Sparkle } from '@phosphor-icons/react';
import type { calculate } from '../domain/calculator';
import type { DoughConfig } from '../domain/types';

type GoodResult=Extract<ReturnType<typeof calculate>,{ok:true}>;
const fmt=(n:number,d=1)=>n.toLocaleString('it-IT',{maximumFractionDigits:d});

export function DoughAnalysis({config:c,result}:{config:DoughConfig;result:GoodResult}){
  const autoFresh=Math.max(.02,Math.min(3,.18*(8/result.equivalentHours)**.85*(1+(c.salt-2.5)*.08)));
  const autoPercent=c.yeast==='instant'?autoFresh/3:autoFresh;
  const speed=result.yeastPercent/autoPercent;
  const peakAt=result.hours/Math.max(.05,speed);
  const points=Array.from({length:25},(_,i)=>{const h=result.hours*1.35*i/24;const maturity=h/Math.max(.1,peakAt);return {x:10+i/24*280,y:86-Math.min(1.35,maturity)/1.35*72};});
  const path=points.map((p,i)=>`${i?'L':'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const bakeX=10+(result.hours/(result.hours*1.35))*280;
  const state=speed<.8?'Probabilmente indietro':speed<=1.15?'Finestra favorevole':'Probabilmente in anticipo';
  return <section className="panel dough-analysis">
    <div className="panel-title"><span className="section-icon"><ChartLine/></span><div><h2>Profilo dell’impasto</h2><p>Una lettura visiva delle scelte attuali.</p></div></div>
    <div className="score-grid">{Object.entries(result.scores).map(([label,value])=><div className="score" key={label}><div><span>{label}</span><strong>{value}</strong></div><div><span style={{width:`${value}%`}}/></div></div>)}</div>
    <div className="terrain">
      <div className="advanced-heading"><div><Gauge/><strong>Percorso di fermentazione</strong></div><span>{state}</span></div>
      <svg viewBox="0 0 300 104" role="img" aria-label={`${state}. Picco stimato dopo ${fmt(peakAt)} ore.`}>
        <rect x="10" y="14" width="166" height="72" className="terrain-young"/><rect x="176" y="14" width="72" height="72" className="terrain-peak"/><rect x="248" y="14" width="42" height="72" className="terrain-late"/>
        <path d={path} className="terrain-path"/><line x1={bakeX} y1="10" x2={bakeX} y2="91" className="terrain-bake"/><text x={Math.min(265,bakeX+4)} y="101">cottura</text>
      </svg>
      <div className="terrain-labels"><span>sviluppo</span><span>finestra ideale</span><span>cedimento</span></div>
      <p><Sparkle/> Picco stimato dopo circa <strong>{fmt(peakAt)} ore</strong>. È una previsione euristica: volume, elasticità e odore dell’impasto restano i segnali decisivi.</p>
    </div>
  </section>;
}
