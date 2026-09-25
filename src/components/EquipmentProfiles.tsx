import { FloppyDisk, Trash, Wrench } from '@phosphor-icons/react';
import { useState } from 'react';
import type { EquipmentProfile } from '../domain/types';

export function EquipmentProfiles({profiles,onSave,onLoad,onDelete}:{profiles:EquipmentProfile[];onSave:(name:string)=>void;onLoad:(p:EquipmentProfile)=>void;onDelete:(id:string)=>void}){
  const [name,setName]=useState('La mia postazione');
  return <section className="panel equipment-profiles"><div className="panel-title"><span className="section-icon"><Wrench/></span><div><h2>La tua attrezzatura</h2><p>Salva forno, planetaria e teglia come profilo.</p></div></div><div className="equipment-save"><label className="field">Nome profilo<input value={name} maxLength={40} onChange={e=>setName(e.target.value)}/></label><button className="button secondary" onClick={()=>onSave(name.trim()||'La mia postazione')}><FloppyDisk/> Salva</button></div>{profiles.length>0&&<div className="equipment-list">{profiles.map(p=><div key={p.id}><button onClick={()=>onLoad(p)}><strong>{p.name}</strong><span>{p.mixer==='stand'?'Planetaria':p.mixer==='hand'?'A mano':p.mixer} · {p.ovenTemp} °C · {p.panWidth}×{p.panLength} cm</span></button><button aria-label={`Elimina profilo ${p.name}`} onClick={()=>onDelete(p.id)}><Trash/></button></div>)}</div>}</section>;
}
