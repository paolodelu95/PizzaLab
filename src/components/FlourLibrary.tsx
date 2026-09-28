import { useState } from 'react';
import { ArrowUpRight, Check, MagnifyingGlass, Plus, Grains as Wheat } from '@phosphor-icons/react';
import type { Flour } from '../domain/types';
import { NumberField } from './Fields';
import { SelectSheet } from './SelectSheet';
export function FlourLibrary({flours,onSelect,onAdd,selectedId}: {flours:Flour[];onSelect:(f:Flour)=>void;onAdd:(f:Flour)=>void;selectedId:string}) {
  const [query,setQuery]=useState(''); const [brand,setBrand]=useState(''); const [onlyW,setOnlyW]=useState(false);
  const [onlyGlutenFree,setOnlyGlutenFree]=useState(false);
  const [custom,setCustom]=useState(false); const [name,setName]=useState(''); const [customBrand,setCustomBrand]=useState('');
  const [customGlutenFree,setCustomGlutenFree]=useState(false);
  const [w,setW]=useState(280); const [protein,setProtein]=useState(12); const [type,setType]=useState('00');
  const [expanded,setExpanded]=useState<string|null>(null);
  const brands = [...new Set(flours.map(f=>f.brand))].sort();
  const filtered=flours.filter(f=>(!brand||f.brand===brand)&&(!onlyW||f.w!==null)&&(!onlyGlutenFree||f.glutenFree)&&`${f.brand} ${f.name} ${f.type} ${f.glutenFree?'senza glutine gluten free':''}`.toLowerCase().includes(query.toLowerCase()));
  return <>
    <div className="page-heading library-heading">
      <div><span className="eyebrow">LA DISPENSA</span><h1>Si parte dalla farina.</h1><p>Tocca il nome di una farina per leggerne i dettagli, poi premi «Usa» per metterla nel tuo impasto.</p></div>
      <div className="heading-illustration" aria-hidden="true"><Wheat weight="duotone"/><span>Cerca, confronta,<br/>scegli.</span></div>
    </div>
    <div className="page-tools-row flour-tools"><button className="button secondary" onClick={()=>setCustom(!custom)}><Plus/> Aggiungi la tua farina</button></div>
    <div className="catalog-intro"><Wheat size={30}/><div><strong>{flours.length} farine · {brands.length} marchi e profili</strong><p>In cima trovi farine generiche, miscele senza glutine e alternative come riso, mais e grano saraceno; seguono le schede dei produttori consultate il 25 settembre 2026.</p></div></div>
    {custom && <form className="panel custom-form" onSubmit={e=>{e.preventDefault();if(!name.trim()||(!customGlutenFree&&(!Number.isFinite(w)||w<50||w>500))||!Number.isFinite(protein)||protein<0||protein>30)return;onAdd({id:`custom-${crypto.randomUUID()}`,brand:customBrand.trim()||'La mia dispensa',name:name.trim(),type,w:customGlutenFree?null:[w,w],protein,proteinBasis:'Etichetta inserita dall’utente',pl:null,source:'',checkedAt:new Date().toISOString().slice(0,10),kind:customGlutenFree?'blend':['00','0','1','2','Integrale','Manitoba'].includes(type)?'wheat':'other',glutenFree:customGlutenFree,usable:true,note:customGlutenFree?'Miscela senza glutine inserita dall’utente. Segui sempre idratazione, leganti e procedimento indicati sulla confezione.':'Dati inseriti dall’utente, non verificati. Controlla sempre la confezione e adatta assorbimento e tempi alla risposta reale dell’impasto.'});setCustom(false);setName('');}}>
      <h2>Aggiungi dalla confezione</h2><p>Copia i valori dichiarati senza ricavare il W dalle proteine. Per le miscele senza glutine il W non viene richiesto.</p>
      <label className="check-label"><input type="checkbox" checked={customGlutenFree} onChange={e=>setCustomGlutenFree(e.target.checked)}/> Miscela certificata senza glutine</label>
      <div className="field-grid"><label className="field">Nome<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="Nome della farina"/></label><label className="field">Marchio<input maxLength={60} value={customBrand} onChange={e=>setCustomBrand(e.target.value)} placeholder="Il molino"/></label><SelectSheet label="Tipo" value={type} options={['00','0','1','2','Integrale','Manitoba','Semola rimacinata','Farro','Riso','Mais','Grano saraceno','Miscela senza glutine'].map(t=>({value:t,label:t}))} onChange={setType}/>{!customGlutenFree&&<NumberField label="Forza dichiarata" value={w} onChange={setW} min={50} max={500} unit="W"/>}<NumberField label="Proteine" value={protein} onChange={setProtein} min={0} max={30} step={0.1} unit="%"/></div>
      <button className="button primary" type="submit">Aggiungi al catalogo</button>
    </form>}
    <div className="catalog-filters"><div className="search"><MagnifyingGlass/><input aria-label="Cerca farina" placeholder="Cerca Caputo, riso, senza glutine…" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="filter-chips"><SelectSheet label="Filtra per marchio" hideLabel className="filter-select" value={brand} options={[{value:'',label:'Tutti i marchi'},...brands.map(b=>({value:b,label:b}))]} searchPlaceholder="Cerca un marchio…" onChange={setBrand}/><label className="check-label"><input type="checkbox" checked={onlyGlutenFree} onChange={e=>setOnlyGlutenFree(e.target.checked)}/> Senza glutine</label><label className="check-label"><input type="checkbox" checked={onlyW} onChange={e=>setOnlyW(e.target.checked)}/> Solo con W dichiarato</label></div></div>
    <div className="results-count" role="status">{filtered.length} risultati · “n.d.” significa dato non disponibile</div>
    <div className="flour-list">{filtered.map(f=><article className="flour-row" key={f.id}>
      <div className={`flour-avatar ${f.glutenFree?'gluten-free':''}`}><Wheat size={26}/></div><div className="flour-main"><span className="eyebrow">{f.brand}</span><h3><button className="text-button" aria-expanded={expanded===f.id} onClick={()=>setExpanded(expanded===f.id?null:f.id)}>{f.name}</button></h3><p>Tipo {f.type} {f.glutenFree&&'· Senza glutine'} {!f.usable&&'· Solo consultazione'}</p></div>
      <div className="flour-stat"><small>FORZA</small><strong>{f.w ? `${f.w[0]}${f.w[1]!==f.w[0]?`–${f.w[1]}`:''}`:'n.d.'}</strong><span>W</span></div>
      <div className="flour-stat protein"><small>PROTEINE</small><strong>{f.protein!==null?`${f.protein.toLocaleString('it-IT')}%`:'n.d.'}</strong><span>{f.proteinBasis.includes('secca')?'su s.s.':'dichiarate'}</span></div>
      <button className={`button ${selectedId===f.id?'selected':'secondary'} use-flour`} disabled={!f.usable} onClick={()=>onSelect(f)}>{selectedId===f.id?<><Check/> Scelta</>:'Usa'}</button>
      {expanded===f.id&&<div className="flour-detail"><p>{f.note || 'Valori trascritti dalla scheda pubblica del produttore. Verifica sempre confezione e lotto acquistati.'}</p><p>Proteine: {f.proteinBasis}. Elasticità P/L: {f.pl||'non disponibile'}. Consultazione: {f.checkedAt}.</p>{f.source?<a href={f.source} target="_blank" rel="noreferrer">Apri la fonte ufficiale <ArrowUpRight/></a>:<span>Dati personali, non verificati dal produttore.</span>}</div>}
    </article>)}</div>
    {!filtered.length&&<div className="empty-state"><MagnifyingGlass size={40}/><h2>Nessuna farina trovata</h2><p>Prova un altro nome o rimuovi i filtri.</p><button className="button secondary" onClick={()=>{setQuery('');setBrand('');setOnlyW(false);setOnlyGlutenFree(false);}}>Azzera filtri</button></div>}
  </>;
}
