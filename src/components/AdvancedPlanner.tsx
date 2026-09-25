import { Drop, Fire, Flask, Gauge, MagicWand, Thermometer, Timer } from '@phosphor-icons/react';
import type { calculate } from '../domain/calculator';
import type { DoughConfig, Flour } from '../domain/types';
import { ovenProfiles } from '../data/ovens';
import { NumberField } from './Fields';
import './advanced.css';

type GoodResult=Extract<ReturnType<typeof calculate>,{ok:true}>;
type Props={config:DoughConfig;flours:Flour[];result:GoodResult;onUpdate:(patch:Partial<DoughConfig>)=>void};
const fmt=(n:number,d=1)=>n.toLocaleString('it-IT',{maximumFractionDigits:d});

export function AdvancedPlanner({config:c,flours,result,onUpdate}:Props){
  const oven=ovenProfiles.find(item=>item.id===c.ovenType)??ovenProfiles[0];
  const optimizePreferment=()=>{
    const target=c.preferment==='biga'?16:12;
    onUpdate({prefermentHours:Math.max(3,Math.min(36,Math.round(target/2**((c.prefermentTemp-20)/10)*2)/2))});
  };
  return <section className="panel advanced-planner">
    <div className="panel-title"><span className="section-icon"><Flask/></span><div><h2>Laboratorio impasto</h2><p>Prefermento, temperatura finale, lievito e forno.</p></div></div>

    <div className="advanced-block">
      <div className="advanced-heading"><div><MagicWand/><strong>Metodo</strong></div><span>Diretto, poolish o biga</span></div>
      <div className="method-toggle three"><button className={c.preferment==='none'?'selected':''} onClick={()=>onUpdate({preferment:'none'})}>Diretto</button><button className={c.preferment==='poolish'?'selected':''} onClick={()=>onUpdate({preferment:'poolish'})}>Poolish</button><button className={c.preferment==='biga'?'selected':''} onClick={()=>onUpdate({preferment:'biga'})}>Biga</button></div>
      {c.preferment!=='none'&&<>
        <div className="field-grid"><NumberField label="Farina nel prefermento" value={c.prefermentPercent} onChange={v=>onUpdate({prefermentPercent:v})} min={5} max={80} step={5} unit="%"/><NumberField label="Durata prefermento" value={c.prefermentHours} onChange={v=>onUpdate({prefermentHours:v})} min={3} max={36} step={.5} unit="ore"/><NumberField label="Temperatura prefermento" value={c.prefermentTemp} onChange={v=>onUpdate({prefermentTemp:v})} min={8} max={32} unit="°C"/><label className="field">Farina del prefermento<select value={c.prefermentFlourId} onChange={e=>onUpdate({prefermentFlourId:e.target.value})}><option value="">Usa la farina principale</option>{flours.filter(f=>f.usable).map(f=><option key={f.id} value={f.id}>{f.brand} · {f.name}</option>)}</select></label></div>
        <div className="maturity-row"><div><span>MATURITÀ STIMATA</span><strong>{result.preferment.maturity}</strong></div><div className="maturity-track"><span style={{width:`${Math.min(100,result.preferment.progress/1.35*100)}%`}}/></div><button className="button secondary" onClick={optimizePreferment}><MagicWand/> Ottimizza</button></div>
        <div className="preferment-split"><div><span>{c.preferment}</span><strong>{fmt(result.preferment.flour,0)} g farina · {fmt(result.preferment.water,0)} g acqua · {fmt(result.preferment.yeast,2)} g lievito</strong></div><div><span>Impasto finale</span><strong>{fmt(result.preferment.mainFlour,0)} g farina · {fmt(result.preferment.mainWater,0)} g acqua · {fmt(result.preferment.mainYeast,2)} g lievito</strong></div></div>
      </>}
    </div>

    <div className="advanced-block">
      <div className="advanced-heading"><div><Thermometer/><strong>Temperatura impasto</strong></div><span>Metodo del fattore 3</span></div>
      <div className="field-grid"><label className="field">Lavorazione<select value={c.mixer} onChange={e=>onUpdate({mixer:e.target.value as DoughConfig['mixer']})}><option value="hand">A mano</option><option value="stand">Planetaria</option><option value="spiral">Spirale</option><option value="thermomix">Robot riscaldante</option></select></label><NumberField label="Temperatura farina" value={c.flourTemp} onChange={v=>onUpdate({flourTemp:v})} min={5} max={35} unit="°C"/><NumberField label="Temperatura impasto desiderata" value={c.desiredDoughTemp} onChange={v=>onUpdate({desiredDoughTemp:v})} min={18} max={30} unit="°C"/><div className="water-temp"><Drop/><span>Acqua consigliata</span><strong>{fmt(result.waterTemp)} °C</strong></div></div>
    </div>

    <div className="advanced-block">
      <div className="advanced-heading"><div><Timer/><strong>Controllo lievito</strong></div><span>Automatico o dose bloccata</span></div>
      <div className="method-toggle"><button className={c.yeastMode==='auto'?'selected':''} onClick={()=>onUpdate({yeastMode:'auto'})}>Automatico</button><button className={c.yeastMode==='manual'?'selected':''} onClick={()=>onUpdate({yeastMode:'manual'})}>Manuale</button></div>
      {c.yeastMode==='manual'&&<NumberField label={`Lievito ${c.yeast==='fresh'?'fresco':'secco'} sulla farina`} value={c.manualYeastPercent} onChange={v=>onUpdate({manualYeastPercent:v})} min={.001} max={5} step={.01} unit="%" hint="Il programma mantiene fissi gli orari e mostra come cambia la maturazione."/>}
    </div>

    <div className="advanced-block">
      <div className="advanced-heading"><div><Fire/><strong>Profilo del forno</strong></div><span>Indicazioni coerenti con l’attrezzatura</span></div>
      <div className="field-grid"><label className="field">Tipo di forno<select value={c.ovenType} onChange={e=>{const next=ovenProfiles.find(o=>o.id===e.target.value)!;onUpdate({ovenType:next.id,...(next.id==='custom'?{}:{ovenTemp:next.maxTemp})});}}>{ovenProfiles.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><NumberField label="Temperatura effettiva" value={c.ovenTemp} onChange={v=>onUpdate({ovenTemp:v})} min={180} max={500} step={5} unit="°C"/></div>
      <div className="oven-hint"><Gauge/><p><strong>{oven.family} · preriscaldamento indicativo {oven.preheat} min</strong>{oven.note}</p></div>
    </div>
  </section>;
}
