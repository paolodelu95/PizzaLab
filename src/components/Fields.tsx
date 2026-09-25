import { Minus, Plus } from '@phosphor-icons/react';
import { useId } from 'react';
export function NumberField({ label, value, onChange, min, max, step=1, unit, hint }: {
  label: string; value: number; onChange: (v:number)=>void; min:number; max:number; step?:number; unit?:string; hint?:string;
}) {
  const id = useId();
  return <div className="field"><label htmlFor={id}>{label}</label><div className="number-input"><input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} value={Number.isFinite(value)?value:''} onChange={e=>onChange(e.target.value === '' ? NaN : Number(e.target.value))}/>{unit && <span>{unit}</span>}</div>{hint && <small>{hint}</small>}</div>;
}
export function Stepper({label,value,onChange,min,max,step=1,unit=''}: {label:string;value:number;onChange:(v:number)=>void;min:number;max:number;step?:number;unit?:string}) {
  return <div className="field"><span className="field-label">{label}</span><div className="stepper"><button aria-label={`Riduci ${label.toLowerCase()}`} disabled={value<=min} onClick={()=>onChange(Math.max(min,value-step))}><Minus/></button><span>{value} <small>{unit}</small></span><button aria-label={`Aumenta ${label.toLowerCase()}`} disabled={value>=max} onClick={()=>onChange(Math.min(max,value+step))}><Plus/></button></div></div>;
}
