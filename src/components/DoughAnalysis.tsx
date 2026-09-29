import { locale, msg, t } from "../i18n";
import { ChartLine, Gauge, Sparkle } from '@phosphor-icons/react';
import type { calculate } from '../domain/calculator';
import type { DoughConfig } from '../domain/types';
import { HelpTip } from './HelpTip';

type GoodResult=Extract<ReturnType<typeof calculate>,{ok:true}>;
const fmt=(n:number,d=1)=>n.toLocaleString(locale(),{maximumFractionDigits:d});
const scoreLabels={lavorabilità:msg('lavorabilità'),alveolatura:msg('alveolatura'),sapore:msg('sapore'),coerenza:msg('coerenza')};

export function DoughAnalysis({config:c,result}:{config:DoughConfig;result:GoodResult}){
  const autoFresh=Math.max(.02,Math.min(3,.18*(8/result.equivalentHours)**.85*(1+(c.salt-2.5)*.08)));
  const autoPercent=c.yeast==='instant'?autoFresh/3:autoFresh;
  const speed=result.yeastPercent/autoPercent;
  const peakAt=result.hours/Math.max(.05,speed);
  const points=Array.from({length:25},(_,i)=>{const h=result.hours*1.35*i/24;const maturity=h/Math.max(.1,peakAt);return {x:10+i/24*280,y:86-Math.min(1.35,maturity)/1.35*72};});
  const path=points.map((p,i)=>`${i?'L':'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const bakeX=10+(result.hours/(result.hours*1.35))*280;
  const state=speed<.8?t('Probabilmente indietro'):speed<=1.15?t('Finestra favorevole'):t('Probabilmente in anticipo');
  return <section className="panel dough-analysis">
    <div className="panel-title"><span className="section-icon"><ChartLine/></span><div><h2>{t("Profilo dell’impasto")} <HelpTip topic="profilo"/></h2><p>{t("Una lettura visiva delle scelte attuali.")}</p></div></div>
    <div className="score-grid">{Object.entries(result.scores).map(([label,value])=><div className="score" key={label}><div><span>{t(scoreLabels[label as keyof typeof scoreLabels] ?? label)}</span><strong>{value}</strong></div><div><span style={{width:`${value}%`}}/></div></div>)}</div>
    <div className="terrain">
      <div className="advanced-heading"><div><Gauge/><strong>{t("Percorso di fermentazione")}</strong></div><span>{state}</span></div>
      <svg viewBox="0 0 300 104" role="img" aria-label={t("{state}. Picco stimato dopo {fmt} ore.", { state, fmt: fmt(peakAt) })}>
        <rect x="10" y="14" width="166" height="72" className="terrain-young"/><rect x="176" y="14" width="72" height="72" className="terrain-peak"/><rect x="248" y="14" width="42" height="72" className="terrain-late"/>
        <path d={path} className="terrain-path"/><line x1={bakeX} y1="10" x2={bakeX} y2="91" className="terrain-bake"/><text x={Math.min(265,bakeX+4)} y="101">{t("cottura")}</text>
      </svg>
      <div className="terrain-labels"><span>{t("sviluppo")}</span><span>{t("finestra ideale")}</span><span>{t("cedimento")}</span></div>
      <p><Sparkle/> {t("Picco stimato dopo circa")} <strong>{fmt(peakAt)} {t("ore")}</strong>{t(". È una previsione euristica: volume, elasticità e odore dell’impasto restano i segnali decisivi.")}</p>
    </div>
  </section>;
}
