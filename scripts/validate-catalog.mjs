import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const italian=JSON.parse(await readFile('src/data/flours.json','utf8'));
const international=JSON.parse(await readFile('src/data/internationalFlours.json','utf8'));
const estimates=JSON.parse(await readFile('src/data/wEstimates.json','utf8'));
const flours=[...italian,...international];
assert(flours.length>100,'Catalog too small or incomplete');
assert.equal(new Set(flours.map(f=>f.id)).size,flours.length,'Duplicate IDs');
for(const f of flours){
  assert(f.id&&f.name&&f.brand&&f.type&&f.proteinBasis,`Missing field: ${f.id}`);
  assert.equal(new URL(f.source).protocol,'https:');
  assert.match(f.checkedAt,/^\d{4}-\d{2}-\d{2}$/);
  assert(f.w===null||(f.w.length===2&&f.w.every(n=>Number.isFinite(n)&&n>=50&&n<=500)&&f.w[0]<=f.w[1]),`Invalid W: ${f.id}`);
  assert(f.protein===null||(Number.isFinite(f.protein)&&f.protein>=0&&f.protein<=40));
  assert(['wheat','blend','other'].includes(f.kind));assert.equal(typeof f.usable,'boolean');
}
for(const [id,e] of Object.entries(estimates)){
  const flour=flours.find(f=>f.id===id);
  assert(flour||id.startsWith('generic-'),`Estimate for unknown flour: ${id}`);
  if(flour)assert.equal(flour.w,null,`Estimate on a flour with declared W: ${id}`);
  assert(50<=e.min&&e.min<=e.value&&e.value<=e.max&&e.max<=500,`Invalid W estimate range: ${id}`);
  assert(e.method&&['media','bassa'].includes(e.confidence),`Estimate without method or confidence: ${id}`);
  assert.match(e.checkedAt,/^\d{4}-\d{2}-\d{2}$/);
}
for(const f of international){assert(f.source.startsWith('https://')&&f.checkedAt,`International flour without source: ${f.id}`);}
const find=id=>flours.find(f=>f.id===id);
assert.deepEqual(find('caputo-pizzeria').w,[260,280]);
assert.deepEqual(find('garofalo-farina-w260').w,[260,260]);
assert.equal(find('garofalo-farina-w260').usable,true);
assert.equal(find('molino-vigevano-pizza-soffice').usable,false);
assert.equal(find('molino-vigevano-pizza-croccante').usable,false);
assert.equal(find('caputo-fioreglut-pizza-e-pane').usable,false);
assert.equal(find('mulino-padano-farina-per-pizza-s10').protein,12);
const stats={checkedAt:flours.map(f=>f.checkedAt).sort().at(-1),total:flours.length,international:international.length,withEstimatedW:Object.keys(estimates).length,brands:new Set(flours.map(f=>f.brand)).size,withW:flours.filter(f=>f.w).length,withProtein:flours.filter(f=>f.protein!==null).length,usable:flours.filter(f=>f.usable).length,perBrand:Object.fromEntries([...new Set(flours.map(f=>f.brand))].map(b=>[b,flours.filter(f=>f.brand===b).length]))};
await mkdir('data',{recursive:true});
const columns=['id','brand','name','type','w_min','w_max','protein','proteinBasis','pl','usable','source','checkedAt','note','w_est_min','w_est_max','w_est_value','w_est_confidence','w_est_method'];
const csv=[columns.join(';'),...flours.map(f=>columns.map(k=>String(k==='w_min'?f.w?.[0]??'':k==='w_max'?f.w?.[1]??'':k.startsWith('w_est_')?estimates[f.id]?.[k.slice(6)]??'':f[k]??'')).map(v=>'"'+v.replaceAll('"','""')+'"').join(';'))].join('\n');
await writeFile('data/farine.csv','\ufeff'+csv+'\n');
await writeFile('data/catalog-stats.json',JSON.stringify(stats,null,2)+'\n');
console.log(JSON.stringify(stats,null,2));
