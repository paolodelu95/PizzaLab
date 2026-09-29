import { t, msg } from "../i18n";
import { FloppyDisk, Trash, Grains as Wheat } from '@phosphor-icons/react';
import type { DoughConfig, Flour, FlourBlend } from '../domain/types';

type Props={config:DoughConfig;flours:Flour[];blends:FlourBlend[];onSave:()=>void;onLoad:(blend:FlourBlend)=>void;onDelete:(id:string)=>void};
export function BlendManager({config,flours,blends,onSave,onLoad,onDelete}:Props){
  const hasBlend=config.secondFlourPercent>0||config.thirdFlourPercent>0||config.fourthFlourPercent>0;
  const label=(blend:FlourBlend)=>blend.components.map(item=>`${flours.find(f=>f.id===item.flourId)?.brand??msg('Farina')} ${item.percent}%`).join(' + ');
  if(!hasBlend&&blends.length===0)return null;
  return <div className="blend-manager"><div><Wheat/><div><strong>{t("Miscele salvate")}</strong><span>{t("Riusa la stessa combinazione in un nuovo impasto.")}</span></div><button className="button secondary" disabled={!hasBlend} onClick={onSave}><FloppyDisk/> {t("Salva questa")}</button></div>{blends.length>0&&<div className="saved-blends">{blends.map(blend=><div key={blend.id}><button onClick={()=>onLoad(blend)}><strong>{blend.name}</strong><span>{label(blend)}</span></button><button aria-label={t("Elimina miscela {name}", { name: blend.name })} onClick={()=>onDelete(blend.id)}><Trash/></button></div>)}</div>}</div>;
}
