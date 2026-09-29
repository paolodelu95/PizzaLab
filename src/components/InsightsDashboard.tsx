import { locale, t } from "../i18n";
import { ChartBar, Clock, Drop, Fire, Star, Trophy } from '@phosphor-icons/react';
import { calculate } from '../domain/calculator';
import { styles } from '../domain/styles';
import type { Flour, Recipe } from '../domain/types';

const fmt=(n:number,d=0)=>n.toLocaleString(locale(),{maximumFractionDigits:d});
export function InsightsDashboard({recipes,flours}:{recipes:Recipe[];flours:Flour[]}){
  const entries=recipes.map(recipe=>({recipe,result:calculate(recipe.config,flours)})).filter((entry):entry is typeof entry&{result:Extract<ReturnType<typeof calculate>,{ok:true}>}=>entry.result.ok);
  if(!entries.length)return null;
  const rated=entries.filter(e=>e.recipe.rating>0);
  const averageHydration=entries.reduce((sum,e)=>sum+e.recipe.config.hydration,0)/entries.length;
  const averageRating=rated.length?rated.reduce((sum,e)=>sum+e.recipe.rating,0)/rated.length:0;
  const longest=Math.max(...entries.map(e=>e.result.hours));
  const counts=entries.reduce<Record<string,number>>((acc,e)=>(acc[e.recipe.config.styleId]=(acc[e.recipe.config.styleId]??0)+1,acc),{});
  const favorite=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
  const trend=[...entries].reverse().slice(-12); const min=45,max=90;
  const points=trend.map((e,i)=>`${trend.length===1?150:12+i/(trend.length-1)*276},${83-(e.recipe.config.hydration-min)/(max-min)*65}`).join(' ');
  return <section className="insights"><div className="section-title"><h2>{t("Il tuo laboratorio nel tempo")}</h2><span>{entries.length} {t("impasti registrati")}</span></div><div className="insight-cards"><article><Fire/><span>{t("Impasti")}</span><strong>{entries.length}</strong></article><article><Drop/><span>{t("Idratazione media")}</span><strong>{fmt(averageHydration,1)}%</strong></article><article><Clock/><span>{t("Più lungo")}</span><strong>{fmt(longest,1)} h</strong></article><article><Star/><span>{t("Valutazione media")}</span><strong>{rated.length?fmt(averageRating,1):'—'}</strong></article></div><div className="insight-charts"><article><div><ChartBar/><strong>{t("Idratazione delle ultime prove")}</strong></div><svg viewBox="0 0 300 96" role="img" aria-label={t("Andamento dell’idratazione")}><line x1="12" y1="83" x2="288" y2="83"/><polyline points={points}/>{trend.map((e,i)=><circle key={e.recipe.id} cx={trend.length===1?150:12+i/(trend.length-1)*276} cy={83-(e.recipe.config.hydration-min)/(max-min)*65} r="3"><title>{e.recipe.name}: {e.recipe.config.hydration}%</title></circle>)}</svg></article><article className="personal-record"><Trophy/><span>{t("Stile più preparato")}</span><strong>{styles.find(s=>s.id===favorite[0])?.name??favorite[0]}</strong><p>{favorite[1]} {favorite[1]===1?t("preparazione"):t("preparazioni")} {t("· record personale")} {fmt(Math.max(...entries.map(e=>e.recipe.config.hydration)),1)}{t("% di idratazione")}</p></article></div></section>;
}
