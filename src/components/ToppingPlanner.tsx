import { CookingPot, Drop, Leaf } from '@phosphor-icons/react';
import { useState } from 'react';
import type { calculate } from '../domain/calculator';
import type { DoughConfig } from '../domain/types';

type GoodResult=Extract<ReturnType<typeof calculate>,{ok:true}>;
const presets={
  margherita:{name:'Margherita',tomato:1,cheese:1,oil:1},
  marinara:{name:'Marinara',tomato:1,cheese:0,oil:1.25},
  bianca:{name:'Bianca',tomato:0,cheese:1.15,oil:1},
} as const;

export function ToppingPlanner({config,result}:{config:DoughConfig;result:GoodResult}){
  const [preset,setPreset]=useState<keyof typeof presets>('margherita');
  const p=presets[preset]; const pan=result.style.pan;
  const base=pan?config.panWidth*config.panLength*config.count:config.count*250;
  const tomato=base*(pan?.12:.32)*p.tomato; const cheese=base*(pan?.14:.30)*p.cheese; const oil=base*(pan?.009:.018)*p.oil;
  return <section className="panel topping-planner"><div className="panel-title"><span className="section-icon"><CookingPot/></span><div><h2>Condimento</h2><p>Quantità di partenza calibrate su pizze o superficie.</p></div></div><div className="method-toggle three">{Object.entries(presets).map(([id,item])=><button key={id} className={preset===id?'selected':''} onClick={()=>setPreset(id as keyof typeof presets)}>{item.name}</button>)}</div><div className="topping-grid"><div><Drop/><span>Pomodoro</span><strong>{Math.round(tomato)} g</strong></div><div><span className="cheese-dot">●</span><span>Fiordilatte</span><strong>{Math.round(cheese)} g</strong></div><div><Leaf/><span>Olio</span><strong>{Math.round(oil)} g</strong></div></div><p className="small-muted">Sono riferimenti pratici: scola bene il fiordilatte e riduci il condimento se vuoi una base più asciutta.</p></section>;
}
