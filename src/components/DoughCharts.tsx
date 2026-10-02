import { hydrationCeiling, strengthNeeds } from "../domain/flourAdvice";
import { ArrowRight, Warning } from "@phosphor-icons/react";
import { locale, t } from "../i18n";
import type { DoughConfig, PizzaStyle } from '../domain/types';

const fmt = (value:number,digits=1) => value.toLocaleString(locale(),{maximumFractionDigits:digits});

export function HydrationChart({value,style,w,wLow,wHigh,estimated=false,config,onChangeFlour}:{value:number;style:PizzaStyle;w:number|null;wLow?:number|null;wHigh?:number|null;estimated?:boolean;config?:DoughConfig;onChangeFlour?:()=>void}) {
  const min=45; const max=90;
  const pos=(n:number)=>Math.max(0,Math.min(100,(n-min)/(max-min)*100));
  // This is a conservative working ceiling, not a laboratory absorption value.
  const wBase=wLow??w;
  const wCeiling=wBase===null?null:hydrationCeiling(wBase);
  const practicalHigh=wCeiling===null?style.hydrationRange[1]:Math.min(style.hydrationRange[1],wCeiling);
  const hasOverlap=practicalHigh>=style.hydrationRange[0];
  const inside=hasOverlap&&value>=style.hydrationRange[0]&&value<=practicalHigh;
  // Quando la farina non c’entra con lo stile, il consiglio giusto non è spostare l’acqua ma cambiare farina.
  const needs=config?strengthNeeds(config):null;
  const tooWeak=wCeiling!==null&&!hasOverlap;
  const neededW=Math.max(needs?.min??style.minW,Math.ceil((180+(style.hydrationRange[0]-58)/0.12)/10)*10);
  const strongW=wHigh??w;
  const tooStrong=!tooWeak&&needs!==null&&Number.isFinite(needs.max)&&strongW!==null&&strongW>needs.max;
  return <div className="dough-chart hydration-chart" aria-label={t("Idratazione {value}%. Intervallo dello stile {v}–{v2}%.", { value, v: style.hydrationRange[0], v2: style.hydrationRange[1] })}>
    <div className="chart-heading"><span>{t("Zona pratica: stile + forza")}</span><strong className={inside&&!tooStrong?'is-good':'is-warning'}>{tooWeak||tooStrong?t("Cambia farina"):inside?t("Buon punto di partenza"):t("Da gestire con attenzione")}</strong></div>
    <div className="hydration-scale">
      {hasOverlap&&<span className="hydration-zone" style={{left:`${pos(style.hydrationRange[0])}%`,width:`${pos(practicalHigh)-pos(style.hydrationRange[0])}%`}} />}
      {wCeiling!==null&&<span className="strength-marker" style={{left:`${pos(wCeiling)}%`}}><b>{t("prudenza W")}</b></span>}
      <span className="hydration-marker" style={{left:`${pos(value)}%`}}><b>{fmt(value)}%</b></span>
    </div>
    <div className="chart-axis"><span>{t("45% · asciutto")}</span><span>{style.hydrationRange[0]}–{style.hydrationRange[1]}{t("% · riferimento")}</span><span>{t("90% · molto fluido")}</span></div>
    {(tooWeak||tooStrong)&&<div className="flour-mismatch" role="alert"><Warning weight="fill"/><div>
      <strong>{tooWeak?t("Farina troppo debole per questo stile"):t("Farina troppo forte per una lievitazione così breve")}</strong>
      <p>{tooWeak
        ?t("Con W circa {w} regge al massimo il {ceiling}% d’acqua, sotto la zona dello stile ({a}–{b}%): manca la zona verde perché nessuna idratazione va bene. Scegli una farina da W {needed} o più.", { w: fmt(wBase!,0), ceiling: fmt(wCeiling!,0), a: style.hydrationRange[0], b: style.hydrationRange[1], needed: neededW })
        :t("Con W circa {w} e solo {hours} ore di lievitazione l’impasto resterà tenace e poco sviluppato. Scegli una farina intorno a W 180–240, oppure allunga la lievitazione.", { w: fmt(strongW!,0), hours: fmt(needs!.hours,1) })}</p>
      {onChangeFlour&&<button className="button primary" onClick={onChangeFlour}>{t("Cambia farina")} <ArrowRight/></button>}
    </div></div>}
    <p>{w===null?t("W della miscela non disponibile: il grafico usa solo l’intervallo dello stile e la tenuta va provata."):(estimated?t("W stimato circa {fmt}; soglia prudenziale circa {fmt2}%. È una stima teorica: il produttore non dichiara il W e il valore può essere impreciso, quindi la soglia lascia un margine.", { fmt: fmt(w,0), fmt2: fmt(wCeiling!,0) }):t("W medio indicativo {fmt}; soglia prudenziale circa {fmt2}%. È una guida euristica: il W aiuta a valutare la tenuta, ma non misura da solo l’assorbimento reale.", { fmt: fmt(w,0), fmt2: fmt(wCeiling!,0) }))}</p>
  </div>;
}

export function YeastChart({config,currentPercent}:{config:DoughConfig;currentPercent:number}) {
  const currentHours=config.bulkHours+config.coldHours+config.proofHours;
  const maxHours=Math.max(72,Math.min(144,Math.ceil(currentHours/24)*24));
  const coldRatio=currentHours>0?config.coldHours/currentHours:0;
  const roomRate=2**((config.roomTemp-22)/10);
  const coldRate=.08*2**((config.fridgeTemp-4)/5);
  const rate=(1-coldRatio)*roomRate+coldRatio*coldRate;
  const factor=config.yeast==='instant'?1/3:1;
  const estimate=(hours:number)=>Math.max(.02,Math.min(3,.18*(8/(hours*rate))**.85*(1+(config.salt-2.5)*.08)))*factor;
  const count=24;
  const values=Array.from({length:count+1},(_,i)=>({hours:2+(maxHours-2)*i/count,value:estimate(2+(maxHours-2)*i/count)}));
  const ceiling=Math.max(...values.map(point=>point.value));
  const x=(hours:number)=>12+(hours-2)/(maxHours-2)*276;
  const y=(value:number)=>8+(1-value/ceiling)*72;
  const path=values.map((point,index)=>`${index?'L':'M'} ${x(point.hours).toFixed(1)} ${y(point.value).toFixed(1)}`).join(' ');
  const cx=x(Math.max(2,Math.min(maxHours,currentHours))); const cy=y(currentPercent);
  return <div className="dough-chart yeast-chart">
    <div className="chart-heading"><span>{t("Lievito stimato in funzione del tempo")}</span><strong>{fmt(currentPercent,2)}{t("% sulla farina")}</strong></div>
    <svg viewBox="0 0 300 96" role="img" aria-label={t(config.yeast==='fresh'?'Con {hours} ore combinate: {percent}% di lievito fresco.':'Con {hours} ore combinate: {percent}% di lievito secco.',{hours:fmt(currentHours),percent:fmt(currentPercent,2)})}>
      <line x1="12" y1="80" x2="288" y2="80" className="chart-grid"/>
      <line x1={cx} y1="7" x2={cx} y2="80" className="chart-current-line"/>
      <path d={path} className="yeast-curve"/>
      <circle cx={cx} cy={cy} r="4.5" className="yeast-dot"/>
    </svg>
    <div className="chart-axis"><span>2 h</span><span>{fmt(maxHours/2,0)} h</span><span>{maxHours} h</span></div>
    <p>{t("Curva calcolata mantenendo la tua proporzione fra ore in frigo e fuori frigo e le temperature impostate.")}</p>
  </div>;
}
