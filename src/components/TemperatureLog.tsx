import { useState } from 'react';
import { Plus, Thermometer, Trash, Warning } from '@phosphor-icons/react';
import type { Recipe, TemperatureReading } from '../domain/types';
import { SelectSheet } from './SelectSheet';
import { NumberField } from './Fields';
import { formatTemp } from '../services/units';

export function TemperatureLog({recipe,onChange}:{recipe:Recipe;onChange:(readings:TemperatureReading[])=>void}){
  const [temp,setTemp]=useState(recipe.config.roomTemp); const [place,setPlace]=useState<TemperatureReading['place']>('impasto');
  const readings=recipe.temperatureReadings??[];
  const add=()=>{if(!Number.isFinite(temp)||temp<-10||temp>60)return;onChange([{id:crypto.randomUUID(),at:new Date().toISOString(),temp,place},...readings]);};
  const alert=(reading:TemperatureReading)=>reading.place==='frigo'&&reading.temp>recipe.config.fridgeTemp+1.5?'Frigo più caldo del piano':reading.place==='ambiente'&&reading.temp>recipe.config.roomTemp+2?'Ambiente più caldo del piano':reading.place==='impasto'&&reading.temp>recipe.config.desiredDoughTemp+2?'Impasto sopra la temperatura obiettivo':null;
  return <details><summary>Temperature reali e controllo scostamenti</summary><div className="temperature-log"><div className="temperature-entry"><SelectSheet label="Punto di misura" value={place} options={[{value:'impasto',label:'Impasto',description:'Infila il termometro al centro della massa'},{value:'ambiente',label:'Ambiente',description:'La stanza in cui lievita'},{value:'frigo',label:'Frigo',description:'Vicino al contenitore dell’impasto'}]} onChange={setPlace}/><NumberField label="Temperatura misurata" value={temp} onChange={setTemp} min={-10} max={60} step={0.1} quantity="temp" /><button className="button secondary" onClick={add}><Plus/> Registra</button></div>{readings.length>0&&<div className="temperature-readings">{readings.map(reading=>{const warning=alert(reading);return <div key={reading.id} className={warning?'has-warning':''}><Thermometer/><div><strong>{reading.place} · {formatTemp(reading.temp,1)}</strong><span>{new Date(reading.at).toLocaleString('it-IT',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span>{warning&&<small><Warning/> {warning}</small>}</div><button aria-label="Elimina lettura" onClick={()=>onChange(readings.filter(item=>item.id!==reading.id))}><Trash/></button></div>})}</div>}<p>Puoi inserire i valori di un termometro. Gli avvisi confrontano la misura con il piano salvato e non sostituiscono una sonda collegata.</p></div></details>;
}
