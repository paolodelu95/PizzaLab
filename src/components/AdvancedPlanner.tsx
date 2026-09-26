import { ArrowSquareOut, Drop, Fire, Flask, Gauge, MagicWand, Thermometer, Timer } from '@phosphor-icons/react';
import type { calculate } from '../domain/calculator';
import type { DoughConfig, Flour } from '../domain/types';
import { ovenProfiles } from '../data/ovens';
import { mixerProfiles } from '../data/mixers';
import { NumberField } from './Fields';
import { FlourPicker } from './FlourPicker';
import './advanced.css';

type GoodResult=Extract<ReturnType<typeof calculate>,{ok:true}>;
type Props={config:DoughConfig;flours:Flour[];result:GoodResult;onUpdate:(patch:Partial<DoughConfig>)=>void};
const fmt=(n:number,d=1)=>n.toLocaleString('it-IT',{maximumFractionDigits:d});

export function AdvancedPlanner({config:c,flours,result,onUpdate}:Props){
  const oven=ovenProfiles.find(item=>item.id===c.ovenType)??ovenProfiles[0];
  const mixerProfile=mixerProfiles.find(item=>item.id===c.mixerProfileId)??mixerProfiles[0];
  const naturalStarter=['sourdough','licoli'].includes(c.yeast);
  const optimizePreferment=()=>{
    const target=c.preferment==='biga'?16:12;
    onUpdate({prefermentHours:Math.max(3,Math.min(36,Math.round(target/2**((c.prefermentTemp-20)/10)*2)/2))});
  };
  return <section className="panel advanced-planner">
    <div className="panel-title"><span className="section-icon"><Flask/></span><div><h2>Laboratorio impasto</h2><p>Prefermento, temperatura finale, lievito e forno.</p></div></div>

    <div className="advanced-block">
      <div className="advanced-heading"><div><MagicWand/><strong>Metodo</strong></div><span>Diretto, poolish o biga</span></div>
      <div className="method-toggle three"><button className={c.preferment==='none'?'selected':''} onClick={()=>onUpdate({preferment:'none'})}>Diretto</button><button disabled={naturalStarter} className={c.preferment==='poolish'?'selected':''} onClick={()=>onUpdate({preferment:'poolish'})}>Poolish</button><button disabled={naturalStarter} className={c.preferment==='biga'?'selected':''} onClick={()=>onUpdate({preferment:'biga'})}>Biga</button></div>
      {naturalStarter&&<p className="natural-note">Il lievito naturale è già un prefermento: poolish e biga vengono disattivati.</p>}
      {c.preferment!=='none'&&<>
        <div className="field-grid"><NumberField label="Farina nel prefermento" value={c.prefermentPercent} onChange={v=>onUpdate({prefermentPercent:v})} min={5} max={80} step={5} unit="%"/><NumberField label="Durata prefermento" value={c.prefermentHours} onChange={v=>onUpdate({prefermentHours:v})} min={3} max={36} step={.5} unit="ore"/><NumberField label="Temperatura prefermento" value={c.prefermentTemp} onChange={v=>onUpdate({prefermentTemp:v})} min={8} max={32} unit="°C"/><FlourPicker label="Farina del prefermento" value={c.prefermentFlourId} flours={flours} allowEmpty emptyLabel="Usa la farina principale" onChange={value=>onUpdate({prefermentFlourId:value})}/></div>
        <div className="maturity-row"><div><span>MATURITÀ STIMATA</span><strong>{result.preferment.maturity}</strong></div><div className="maturity-track"><span style={{width:`${Math.min(100,result.preferment.progress/1.35*100)}%`}}/></div><button className="button secondary" onClick={optimizePreferment}><MagicWand/> Ottimizza</button></div>
        <div className="preferment-split"><div><span>{c.preferment}</span><strong>{fmt(result.preferment.flour,0)} g farina · {fmt(result.preferment.water,0)} g acqua · {fmt(result.preferment.yeast,2)} g lievito</strong></div><div><span>Impasto finale</span><strong>{fmt(result.preferment.mainFlour,0)} g farina · {fmt(result.preferment.mainWater,0)} g acqua · {fmt(result.preferment.mainYeast,2)} g lievito</strong></div></div>
      </>}
    </div>

    <div className="advanced-block autolyse-block">
      <div className="advanced-heading"><div><Drop/><strong>Autolisi breve</strong></div><span>Utile per impasti molto idratati</span></div>
      <div className="method-toggle"><button className={!c.autolyse?'selected':''} onClick={()=>onUpdate({autolyse:false})}>Non prevista</button><button className={c.autolyse?'selected':''} onClick={()=>onUpdate({autolyse:true})}>Aggiungi autolisi</button></div>
      {c.autolyse&&<><div className="field-grid"><NumberField label="Acqua usata nell’autolisi" value={c.autolyseWaterPercent} onChange={v=>onUpdate({autolyseWaterPercent:v})} min={30} max={95} step={5} unit="%" hint="Percentuale dell’acqua disponibile nell’impasto finale."/><NumberField label="Durata del riposo" value={c.autolyseMinutes} onChange={v=>onUpdate({autolyseMinutes:v})} min={10} max={60} step={5} unit="min"/></div><div className="autolyse-recipe"><div><span>AUTOLISI</span><strong>{fmt(result.autolyse.flour,0)} g farina + {fmt(result.autolyse.water,0)} g acqua</strong></div><div><span>ACQUA DI RISERVA</span><strong>{fmt(result.autolyse.reservedWater,0)} g con il lievito, poi poco alla volta</strong></div></div></>}
    </div>

    <div className="advanced-block">
      <div className="advanced-heading"><div><Thermometer/><strong>Temperatura impasto</strong></div><span>Metodo del fattore 3</span></div>
      <div className="field-grid"><label className="field">Lavorazione<select value={c.mixer} onChange={e=>onUpdate({mixer:e.target.value as DoughConfig['mixer']})}><option value="hand">A mano</option><option value="stand">Planetaria</option><option value="spiral">Spirale</option><option value="thermomix">Robot riscaldante</option></select></label><NumberField label="Temperatura farina" value={c.flourTemp} onChange={v=>onUpdate({flourTemp:v})} min={5} max={35} unit="°C"/><NumberField label="Temperatura impasto desiderata" value={c.desiredDoughTemp} onChange={v=>onUpdate({desiredDoughTemp:v})} min={18} max={30} unit="°C"/><div className="water-temp"><Drop/><span>Acqua consigliata</span><strong>{fmt(result.waterTemp)} °C</strong></div></div>
      {c.mixer==='stand'&&<div className="mixer-guide"><label className="field">La tua planetaria<select value={mixerProfile.id} onChange={e=>onUpdate({mixerProfileId:e.target.value})}>{mixerProfiles.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="mixer-steps"><div><span>INSERTO</span><strong>{mixerProfile.tool}</strong></div><div><span>PARTENZA</span><strong>{mixerProfile.start}</strong></div><div><span>IMPASTO</span><strong>{mixerProfile.knead}</strong></div><div><span>CHIUSURA</span><strong>{mixerProfile.finish}</strong></div></div><p>{mixerProfile.note}</p>{mixerProfile.source&&<a href={mixerProfile.source} target="_blank" rel="noreferrer">Indicazioni del produttore <ArrowSquareOut/></a>}</div>}
    </div>

    <div className="advanced-block">
      <div className="advanced-heading"><div><Timer/><strong>Controllo lievito</strong></div><span>{naturalStarter?'Dose e idratazione della coltura':'Automatico o dose bloccata'}</span></div>
      {naturalStarter?<div className="field-grid"><NumberField label={c.yeast==='licoli'?'Licoli sulla farina':'Pasta madre sulla farina'} value={c.starterPercent} onChange={v=>onUpdate({starterPercent:v})} min={5} max={50} step={1} unit="%" hint="Percentuale sul peso totale della farina."/><NumberField label="Idratazione del lievito" value={c.starterHydration} onChange={v=>onUpdate({starterHydration:v})} min={40} max={150} step={5} unit="%" hint="In genere 45–55% per pasta madre e 100% per licoli."/></div>:<><div className="method-toggle three"><button className={c.yeastMode==='auto'?'selected':''} onClick={()=>onUpdate({yeastMode:'auto'})}>Automatico</button><button className={c.yeastMode==='weighable'?'selected':''} onClick={()=>onUpdate({yeastMode:'weighable'})}>Grammi interi</button><button className={c.yeastMode==='manual'?'selected':''} onClick={()=>onUpdate({yeastMode:'manual'})}>Percentuale</button></div>{c.yeastMode==='manual'&&<NumberField label={`Lievito ${c.yeast==='fresh'?'fresco':'secco'} sulla farina`} value={c.manualYeastPercent} onChange={v=>onUpdate({manualYeastPercent:v})} min={.001} max={5} step={.01} unit="%" hint="Il programma mantiene fissi gli orari e mostra come cambia la maturazione."/>}{c.yeastMode==='weighable'&&<div className="weighable-yeast"><NumberField label={`Lievito ${c.yeast==='fresh'?'fresco':'secco'} da pesare`} value={c.weighableYeastGrams} onChange={v=>onUpdate({weighableYeastGrams:v})} min={1} max={30} step={1} unit="g" hint="Solo grammi interi: utile con una bilancia sensibile a 1 g."/>{result.yeastAdjustment&&<div className="yeast-compensation"><div><span>STIMA AUTOMATICA</span><strong>{fmt(result.yeastAdjustment.autoGrams,2)} g → userai {fmt(result.yeastAdjustment.selectedGrams,0)} g</strong><p>{result.yeastAdjustment.summary}</p></div><div className="compensation-times"><span><small>PUNTATA</small>{fmt(result.yeastAdjustment.bulkHours,1)} h</span><span><small>FRIGO</small>{fmt(result.yeastAdjustment.coldHours,1)} h</span><span><small>APPRETTO</small>{fmt(result.yeastAdjustment.proofHours,1)} h</span></div><button className="button primary" onClick={()=>onUpdate({bulkHours:result.yeastAdjustment!.bulkHours,coldHours:result.yeastAdjustment!.coldHours,proofHours:result.yeastAdjustment!.proofHours})}>Applica tempi compensati</button><small>È una stima basata sulla temperatura indicata: volume e consistenza dell’impasto restano il controllo principale.</small></div>}</div>}</>}
    </div>

    <div className="advanced-block">
      <div className="advanced-heading"><div><Fire/><strong>Profilo del forno</strong></div><span>Indicazioni coerenti con l’attrezzatura</span></div>
      <div className="field-grid"><label className="field">Tipo di forno<select value={c.ovenType} onChange={e=>{const next=ovenProfiles.find(o=>o.id===e.target.value)!;onUpdate({ovenType:next.id,...(next.id==='custom'?{}:{ovenTemp:next.maxTemp})});}}>{ovenProfiles.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><NumberField label="Temperatura effettiva" value={c.ovenTemp} onChange={v=>onUpdate({ovenTemp:v})} min={180} max={500} step={5} unit="°C"/></div>
      <div className="oven-hint"><Gauge/><p><strong>{oven.family} · preriscaldamento indicativo {oven.preheat} min</strong>{oven.note}</p></div>
    </div>
  </section>;
}
