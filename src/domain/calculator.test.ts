import { describe, expect, it } from 'vitest';
import { buildTimeline, calculate, validateConfig } from './calculator';
import { defaultConfig, styles } from './styles';
import type { DoughConfig, Flour } from './types';
const flour: Flour = {id:'caputo-pizzeria',brand:'Test',name:'00',type:'00',w:[260,280],protein:12.5,proteinBasis:'%',pl:null,source:'https://example.com',checkedAt:'2026-09-25',kind:'wheat',usable:true,note:''};
const flours=[flour,{...flour,id:'strong',w:[370,390] as [number,number]},{...flour,id:'medium',w:[300,300] as [number,number]},{...flour,id:'lower',w:[200,200] as [number,number]},{...flour,id:'unknown',w:null},{...flour,id:'mix',usable:false}];
const config=(patch:Partial<DoughConfig>={})=>({...defaultConfig(),bakeAt:'2026-11-14T20:00',...patch});
function result(patch:Partial<DoughConfig>={}){const r=calculate(config(patch),flours);if(!r.ok)throw new Error(r.errors.join(','));return r;}
describe('baker percentages and mass conservation',()=>{
  it.each(styles.map(s=>s.id))('conserves mass for %s',styleId=>{const r=result({styleId});expect(r.flour+r.water+r.salt+r.oil+r.yeast).toBeCloseTo(r.total,8);expect(r.water/r.flour).toBeCloseTo(.63,9);});
  it('uses pan area and quantity, independent of ball weight',()=>{const r=result({styleId:'teglia',count:2,panWidth:30,panLength:40,panDensity:.6,ballWeight:100});expect(r.total).toBe(1440);expect(r.unitWeight).toBe(720);});
  it('scales all ingredients with quantity',()=>{expect(result({count:8}).yeast).toBeCloseTo(result({count:4}).yeast*2,9);});
  it('uses one-third instant yeast percentage and still conserves mass',()=>{expect(result({yeast:'instant'}).yeastPercent).toBeCloseTo(result().yeastPercent/3,9);});
  it('includes sugar and malt without changing total mass',()=>{const r=result({sugar:3,malt:.5});expect(r.flour+r.water+r.salt+r.oil+r.sugar+r.malt+r.yeast).toBeCloseTo(r.total,8);});
});
describe('fermentation estimates and warnings',()=>{
  it('reduces yeast when ambient temperature increases',()=>{expect(result({roomTemp:30}).yeast).toBeLessThan(result({roomTemp:18}).yeast);});
  it('reduces yeast for longer fermentation',()=>{expect(result({coldHours:48}).yeast).toBeLessThan(result({coldHours:6}).yeast);});
  it('distinguishes fridge time from room time',()=>{expect(result({bulkHours:2,coldHours:20,proofHours:2}).yeast).toBeGreaterThan(result({bulkHours:12,coldHours:0,proofHours:12}).yeast);});
  it('does not derive W from protein',()=>{const r=result({flourId:'unknown'});expect(r.w).toBeNull();expect(r.advice.some(a=>a.id==='unknown-w')).toBe(true);});
  it('warns on weak flour, long times, high hydration and home oven',()=>{const r=calculate(config({styleId:'contemporanea',hydration:80,coldHours:72,ovenTemp:250}),[{...flour,w:[170,170]}]);expect(r.ok).toBe(true);if(r.ok)expect(r.advice.map(a=>a.id)).toEqual(expect.arrayContaining(['weak-style','long-weak','weak-wet','oven']));});
  it('blends flour mass without pretending W is measured',()=>{const r=result({secondFlourId:'strong',secondFlourPercent:25});expect(r.secondFlour/r.flour).toBe(.25);expect(r.w).toBe(297.5);expect(r.advice.some(a=>a.id==='blend')).toBe(true);});
  it('blends three flours and preserves all shares',()=>{const r=result({secondFlourId:'strong',secondFlourPercent:25,thirdFlourId:'medium',thirdFlourPercent:20});expect(r.firstFlour/r.flour).toBeCloseTo(.55);expect(r.secondFlour/r.flour).toBeCloseTo(.25);expect(r.thirdFlour/r.flour).toBeCloseTo(.2);expect(r.w).toBe(303.5);});
  it('blends four flours with a weighted W',()=>{const r=result({secondFlourId:'strong',secondFlourPercent:20,thirdFlourId:'medium',thirdFlourPercent:20,fourthFlourId:'lower',fourthFlourPercent:20});expect(r.firstFlour/r.flour).toBeCloseTo(.4);expect(r.fourthFlour/r.flour).toBeCloseTo(.2);expect(r.w).toBe(284);});
  it('100% second flour ignores missing first W',()=>{expect(result({flourId:'unknown',secondFlourId:'strong',secondFlourPercent:100}).w).toBe(380);});
  it('keeps missing W missing in a partial blend',()=>{expect(result({secondFlourId:'unknown',secondFlourPercent:20}).w).toBeNull();});
});
describe('input guards',()=>{
  it.each([{hydration:NaN},{count:1.5},{count:0},{coldHours:-1},{bulkHours:Infinity},{bakeAt:''},{coldHours:0,bulkHours:0,proofHours:0},{roomTemp:50},{styleId:'invalid'}])('rejects invalid inputs %j',patch=>{expect(calculate(config(patch),flours).ok).toBe(false);});
  it('rejects unsupported premixes and missing flours',()=>{expect(calculate(config({flourId:'mix'}),flours).ok).toBe(false);expect(calculate(config({flourId:'missing'}),flours).ok).toBe(false);});
  it('rejects a missing second flour',()=>{expect(calculate(config({secondFlourPercent:25}),flours).ok).toBe(false);});
  it('rejects a missing third flour and shares over 100%',()=>{expect(calculate(config({thirdFlourPercent:20}),flours).ok).toBe(false);expect(calculate(config({secondFlourId:'strong',secondFlourPercent:70,thirdFlourId:'medium',thirdFlourPercent:40}),flours).ok).toBe(false);});
  it('rejects preferment water above total recipe water',()=>{expect(calculate(config({preferment:'poolish',prefermentPercent:80,hydration:60}),flours).ok).toBe(false);});
  it('does not reject a past date as malformed',()=>{expect(validateConfig(config({bakeAt:'2020-01-01T12:00'}))).toEqual([]);});
});
describe('schedule',()=>{
  it('works backwards from bake time including 20 minutes mixing',()=>{const c=config();const t=buildTimeline(c);expect(t.at(-1)?.id).toBe('bake');expect(new Date(t[0].at).getTime()).toBe(new Date(c.bakeAt).getTime()-24*3600000-20*60000);});
  it('preserves each cold and warm duration',()=>{const t=buildTimeline(config());for(const [id,h] of [['bulk',2],['cold',18],['proof',4]] as const){const stage=t.find(s=>s.id===id)!;expect(new Date(stage.until).getTime()-new Date(stage.at).getTime()).toBe(h*3600000);}});
  it('omits fridge for ambient method and zero-length stages',()=>{const t=buildTimeline(config({coldHours:0,bulkHours:0,proofHours:6}));expect(t.map(s=>s.id)).toEqual(['mix','proof','preheat','bake']);});
  it('places preheat chronologically even with short appretto',()=>{const t=buildTimeline(config({proofHours:.5}));const times=t.map(s=>new Date(s.at).getTime());expect(times).toEqual([...times].sort((a,b)=>a-b));});
  it('handles DST transitions using elapsed time',()=>{const c=config({bakeAt:'2026-10-25T20:00'});const t=buildTimeline(c);expect(new Date(c.bakeAt).getTime()-new Date(t[0].at).getTime()).toBe((24*60+20)*60000);});
  it('places preferment before mixing and preserves its duration',()=>{const t=buildTimeline(config({preferment:'poolish',prefermentHours:12}));expect(t[0].id).toBe('preferment');expect(new Date(t[0].until).getTime()-new Date(t[0].at).getTime()).toBe(12*3600000);expect(t[1].id).toBe('mix');});
});
describe('advanced planning',()=>{
  it('splits a poolish from the final dough and reports peak maturity',()=>{const r=result({preferment:'poolish',prefermentPercent:20,prefermentHours:12,prefermentTemp:20});expect(r.preferment.flour/r.flour).toBeCloseTo(.2);expect(r.preferment.water).toBeCloseTo(r.preferment.flour);expect(r.preferment.mainWater+r.preferment.water).toBeCloseTo(r.water);expect(r.preferment.maturity).toBe('al picco');});
  it('uses a separately selected preferment flour in weighted strength',()=>{const r=result({preferment:'poolish',prefermentPercent:20,prefermentFlourId:'strong'});expect(r.w).toBe(292);expect(r.firstFlour+r.preferment.flour).toBeCloseTo(r.flour);});
  it('keeps manual yeast fixed when duration changes',()=>{expect(result({yeastMode:'manual',manualYeastPercent:.12,coldHours:6}).yeastPercent).toBe(.12);expect(result({yeastMode:'manual',manualYeastPercent:.12,coldHours:72}).yeastPercent).toBe(.12);});
  it('raises recommended water temperature for a colder flour',()=>{expect(result({flourTemp:10}).waterTemp).toBeGreaterThan(result({flourTemp:25}).waterTemp);});
});
