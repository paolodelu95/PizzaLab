// Conservative manufacturer-specific extraction. Review the printed summary after
// every source refresh; the committed JSON is the shipped, reviewed snapshot.
import { readFile, writeFile } from 'node:fs/promises';
const pages = JSON.parse(await readFile('.cache/catalog-candidates.json','utf8'));
const slug = s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const num=s=>Number(s.replace(',','.'));
const output=[];
for(const p of pages){
  if(!p.name || /\/(en|de|fr|es)\//.test(p.url))continue;
  let name=p.name.replace(/\s+/g,' ').replace(/Farina di grano tenero.*$/i,'').trim()||p.name;
  let t=p.text.split(/Altre farine da provare|PRODOTTI CONSIGLIATI|POTREBBERO PIACERTI|Scopri dove|Compila il form|Chi ci ha scelto racconta|Farine per il tuo locale|Ti potrebbe interessare|Prodotti correlati/i)[0];
  if(p.brand==='Garofalo'&&!/Farina|Semola/.test(name))continue;
  if(p.brand==='Le 5 Stagioni'&&/Lievito|Naturkraft|Lemady|Spolver/i.test(name))continue;
  if(p.brand==='Molino Spadoni'&&/cocco|castagne|ceci|friggere|Torte|piadina|dolci|Pasta|curcuma|Staccapizza|Carbone|Avena|Khorasan/i.test(name))continue;
  if(p.brand==='Mulino Padano'&&/Germe|Crusca|Cruschello|Frolla|Bignè|Casereccia|Croissant|Semola/i.test(name))continue;
  if(p.brand==='Molino Rossetto'&&/Semolino/.test(name))continue;
  if(p.brand==='Molino Vigevano'&&/Avena|Biolievito|Dibì|Ellevù|Riso|Fritture|M Ama|Mais|Piesse|Spolvero/i.test(name))continue;
  let w=null,protein=null,pl=null,type='n.d.',note='',basis='Percentuale dichiarata dal produttore';
  const wm=t.match(/(?:PANIFICAZIONE\s*W|Forza della farina\s*W|Energia W\s*\[E-4 J\]|\bW\s*:)\s*(\d{2,3})(?:\s*[-–/−]\s*(\d{2,3}))?/i);
  if(wm)w=[num(wm[1]),num(wm[2]||wm[1])];
  const pm=t.match(/\bPROTEINE\s*:?(?:\s*min\.?\s*)?(?:\[\%\])?\s*(\d{1,2}(?:[.,]\d+)?)/i);
  if(pm)protein=num(pm[1]);
  const tm=t.match(/(?:TIPO\s*(?:Farina|Tipo)?|farina\s+di\s+grano\s+tenero\s+tipo)\s*[“”"']?(00|0|1|2|integrale)\b/i);
  if(tm)type=tm[1].toLowerCase()==='integrale'?'Integrale':tm[1];
  const plm=t.match(/P\/L\s*:?\s*((?:<\s*)?0[.,]\d+\s*(?:[-–/]\s*0[.,]\d+)?)/i);
  if(plm)pl=plm[1].trim();
  if(p.brand==='Garofalo'){
    name=name.replace(/^Farina\s*/i,'');
    const m=name.match(/W\s*(\d+)/i);w=m?[+m[1],+m[1]]:null;
    if(m)name=`W ${m[1]}`;
    type=/Integrale/i.test(name)?'Integrale':/Semola/i.test(name)?'Semola rimacinata':'00';
    basis='g per 100 g di prodotto';
  }
  if(p.brand==='Molino Rossetto'){
    name=name.replace(/\s*-\s*(?:1\s*KG|750\s*G)\s*-?/ig,'').trim();
    const tech=t.split(/Caratteristiche tecniche\*?:?/i)[1]||'';
    const m=tech.match(/W\s*(\d{2,3})\s*[-–]\s*(\d{2,3})/);w=m?[+m[1],+m[2]]:null;
    note='Parametri indicativi: il produttore segnala possibili variazioni stagionali. Eventuali minimi non sono trasformati in intervalli.';
    basis='g per 100 g di prodotto';
  }
  if(p.brand==='Mulino Padano'){
    // Prefer the nutritional value (as sold) to the technical minimum.
    const nutrition=t.slice(t.indexOf('Contenuto nutrizionale'));
    const m=nutrition.match(/Proteine\s*(\d+(?:[.,]\d+)?)\s*g/i);
    protein=m?num(m[1]):null;basis='g per 100 g di prodotto';
    name=p.name.split('Farina')[0].trim();
  }
  if(p.brand==='Le 5 Stagioni'){
    const m=t.match(/\bW\s*:?\s*(\d{2,3})(?:\s*[-–/]\s*(\d{2,3}))?/i);w=m?[+m[1],+(m[2]||m[1])]:null;
    if(/s\.s|sostanza secca/i.test(t))basis='Su sostanza secca; minimo se indicato in scheda';
  }
  if(p.brand==='Molino Spadoni'){
    const m=t.match(/\bW\s*(?:da|:)?\s*(\d{2,3})(?:\s*[-–/]\s*(\d{2,3}))?/i);w=m?[+m[1],+(m[2]||m[1])]:null;
  }
  let kind='wheat';let usable=true;
  if(/semola|senza glutine|fioreglut|gluten free|kamut|grano duro/i.test(name)){kind='other';usable=false;}
  else if(/miscela|preparato|moreschina|grano franto|non solo grano|pizza delight|pizza soia|aRoma|pinsa|pizza.*tradizione|pizza teglia/i.test(name)||/pasta madre|lievito naturale|malto|farina di SOIA/.test(t))kind='blend';
  const ingredients=t.split(/Ingredienti\s*:/i)[1]||'';
  if(/lievito (?:già|gia) (?:incluso|dosato)|\+ lievito|lievito naturale.*già/i.test(t)||/istantane|farina che lievita/i.test(name)||/lievito di birra/i.test(ingredients)||/farina per pizza tipo 1/i.test(name)&&p.brand==='Molino Vigevano'){
    usable=false;note='Preparato con lievito o caratteristiche specifiche: seguire la ricetta della confezione. Escluso dal calcolo standard.';
  }
  if(kind==='other')note='Prodotto consultabile nel catalogo; richiede una ricetta specifica ed è escluso dal calcolo standard.';
  if(p.brand==='Le 5 Stagioni'&&/Pizza Teglia|Pizza & Tradizione|Nucleo|Grano Franto|Ciabatta Romana|MIA SEI/.test(name)){
    kind='blend';usable=false;note='Miscela o ingrediente da utilizzare secondo la ricetta del produttore. Può richiedere dosi specifiche, contenere sale o essere destinata all’uso parziale.';
  }
  if(p.brand==='Molino Vigevano'){
    if(/Moreschina|Vesuvio/.test(name))name+=/Farine Professionali/.test(t)?' · professionale':' · casa';
    if(name==='Pizza Piuma'){kind='blend';note='Contiene latte in polvere; verificare la ricetta del produttore.';}
    if(name==='Mix Pane e Pizza'){kind='other';usable=false;}
  }
  if(type==='n.d.'&&/integrale/i.test(name))type='Integrale';
  // Missing fields stay null. Nutritional figures are never used to infer W.
  output.push({id:`${slug(p.brand)}-${new URL(p.url).pathname.split('/').filter(Boolean).at(-1).replace('.html','')}`,brand:p.brand,name,type,w,protein,proteinBasis:basis,pl,source:p.url,checkedAt:p.retrievedAt,kind,usable,note});
}
function add(brand,name,type,w,protein,pl,source,note='',extra={}){
  const item={id:`${slug(brand)}-${slug(name)}`,brand,name,type,w:typeof w==='number'?[w,w]:w,protein,proteinBasis:'Percentuale dichiarata dal produttore',pl,source,checkedAt:'2026-09-25',kind:'wheat',usable:true,note,...extra};
  const i=output.findIndex(x=>x.source===source);if(i>=0)output[i]=item;else output.push(item);
}
add('Caputo','Pizzeria','00',[260,280],12.5,'0,50–0,60','https://www.mulinocaputo.it/prodotti/pizzeria/');
add('Caputo','Nuvola','0',[270,290],12.5,'0,50–0,60','https://www.mulinocaputo.it/prodotti/nuvola/');
add('Caputo','Nuvola Super 5 kg','0',[320,340],13.5,'0,50–0,60','https://www.mulinocaputo.it/prodotti/nuvola-super-5kg/');
add('Caputo','Manitoba Oro','0',[360,380],14,'0,45–0,55','https://www.mulinocaputo.it/prodotti/manitoba-oro/');
add('Caputo','Saccorosso','00',[300,320],13,'0,50–0,60','https://www.mulinocaputo.it/prodotti/saccorosso/');
const dalla='https://www.dallagiovanna.it/farine-speciali-far-pizza';
for(const [name,type,w,pl] of [['laNapoletana','00',310,'0,60'],['laNapoletana 2.0','0',310,'0,60'],['laNapoletana 2.0 Plus','0',310,'0,60'],['FR Rosa','0 / 00',200,null],['E Rosa','0 / 00',250,null],['N Blu','0 / 00',290,'0,55'],['R Verde','0 / 00',340,'0,60'],['S Rossa','0 / 00',390,'0,60'],['Nobilgrano E Rosa','0 / 1',210,'0,55'],['Nobilgrano N Blu','0 / 1',290,'0,55'],['Nobilgrano R Verde','0 / 1',340,'0,55']]){
  // A shared source can describe several genuinely different products.
  output.push({id:`dallagiovanna-${slug(name)}`,brand:'Molino Dallagiovanna',name,type,w:[w,w],protein:null,proteinBasis:'Non disponibile',pl,source:dalla,checkedAt:'2026-09-25',kind:'wheat',usable:true,note:pl?'Varianti di tipo raggruppate come nella scheda del produttore. Proteine non pubblicate nella pagina consultata.':'P/L non trascritto: il valore nella pagina presenta un refuso. Proteine non pubblicate.'});
}
for(const [name,w] of [['Classica',270],['Vivace',290],['Super',360]])add('Polselli',name,'00',w,null,null,`https://www.polselli.it/it/farina/nome/${name}/linea/convenzionale`,'W nominale; la pagina riporta una tolleranza “+0-5%”, non convertita in intervallo. Proteine non pubblicate.');
add('Petra','5037','0',[300,340],13.5,'0,55–0,65','https://www.farinapetra.it/pg23/?bn=farinapetra&codice=10555&dfbg=catalogopetra&mt=no&nmm=1&nosh=1&permalink=petra-5037&urlplk=farine-pizzeria','Proteine dalla tabella nutrizionale; la scheda tecnica riporta separatamente protidi 13,0–13,5%.',{proteinBasis:'g per 100 g di prodotto'});
add('Petra','Pizza HP','0',[320,340],13.5,'0,55–0,65','https://www.farinapetra.it/pg23/?bn=farinapetra&codice=10555&ct=card&dfbg=catalogopetra&mt=no&nmm=1&nosh=1&permalink=petra-Pizza+HP&urlplk=box+1+kg','Farina parzialmente da grano germogliato. Proteine dalla tabella nutrizionale.',{proteinBasis:'g per 100 g di prodotto'});
const fivePdf='https://le5stagioni.com/wp-content/uploads/2025/03/CATALOGO_COMPLETO-20231220-IT-EN-NEW_compressed.pdf';
for(const [name,type,w,protein,pl] of [['Classica','00',[190,230],10,'0,50–0,70'],['Rinforzata','00',[240,280],11,'0,50–0,70'],['Superiore','00',[320,360],13,'0,50–0,70'],['Oro','00',[380,420],14,'0,50–0,70'],['Manitoba','00',[400,440],14.5,'0,50–0,70'],['Pizza Napoletana Verde','00',[270,300],11.5,'0,50–0,70'],['Pizza Napoletana Rossa','00',[300,330],13,'0,50–0,70']]){
  const existing=output.find(f=>f.brand==='Le 5 Stagioni'&&f.name===name);
  const fields={type,w,protein,pl,proteinBasis:'Minimo su sostanza secca',source:fivePdf,note:'Catalogo del produttore (edizione 2023, pubblicato nel 2025). Intervallo W comprensivo delle tolleranze dichiarate. Verificare il lotto attuale.'};
  if(existing)Object.assign(existing,fields);else output.push({id:`le-5-stagioni-${slug(name)}`,brand:'Le 5 Stagioni',name,checkedAt:'2026-09-25',kind:'wheat',usable:true,...fields});
}
const nutritional={proteinBasis:'g per 100 g di prodotto'};
add('Barilla','Integrale di grano tenero','Integrale',null,12.5,null,'https://www.barilla.com/it-it/prodotti/farine-e-cereali/farine/farina-integrale-di-grano-tenero','W non pubblicato nella scheda consultata.',nutritional);
add('Divella','00 Pizza · 1 e 5 kg','00',null,10.5,null,'https://www.divella.it/it/prodotti/farina-00-pizza-1kg-5kg/','La referenza domestica è distinta da quella professionale da 25 kg. W non pubblicato.',nutritional);
const divellaPdf='https://www.divella.it/wp-content/uploads/2022/12/1590056426_prodotti.pdf';
for(const [name,type,w,protein,pl] of [['Manitoba · 25 kg','0',[370,400],14.2,'0,55–0,65'],['Pizza · 25 kg','00',[220,240],11.5,'0,60–0,70'],['Pizza Super · 25 kg','00',[250,280],12.3,'0,60–0,70'],['Pizza Napoletana · 25 kg','00',[300,330],13,'0,60–0,70']]){
  output.push({id:`divella-${slug(name)}`,brand:'Divella',name,type,w,protein,pl,proteinBasis:'Minimo tecnico, Nx5,70; base non specificata',source:divellaPdf,checkedAt:'2026-09-25',kind:'wheat',usable:true,note:'Catalogo pubblicato nel 2022. Solo referenza professionale da 25 kg; verificare i parametri del lotto attuale.'});
}
add('Molino Grassi','Pizza e Focaccia','00',290,null,'0,50','https://www.molinograssi.it/product/farina-00-pizza-e-focaccia/','La pagina riporta W 290, assorbimento A 56,0 e CD 13. CD non è stato interpretato come proteine.');
for(const [name,type,w,protein,path] of [
  ['La pizza','00',260,12,'farine-e-semole/la-pizza/la-pizza'],
  ['Origine Pizza Ideale','0',290,12.5,'farine-e-semole-per-professionisti/origine/pizza-ideale'],
  ['Origine Pizza Superiore','0',340,13,'farine-e-semole-per-professionisti/origine/pizza-superiore'],
  ['Zero Unica','0',260,11,'farine-e-semole-per-professionisti/pizzeria/zero-unica'],
  ['Zero M','0',290,12,'farine-e-semole-per-professionisti/pizzeria/zero-m'],
  ['Zero XL','0',380,13.5,'farine-e-semole-per-professionisti/la-pizza/zero-xl'],
  ['La 8','0',300,14.1,'farine-e-semole-per-professionisti/le-speciali-con-germe-di-grano/la-8'],
  ['La 8 Plus','0',350,14.1,'farine-e-semole-per-professionisti/le-speciali-con-germe-di-grano/la-8-plus'],
  ['Aroma','1',280,13,'farine-e-semole-per-professionisti/le-speciali-con-germe-di-grano/aroma'],
])add('Molino Casillo',name,type,w,protein,null,`https://shop.molinocasillo.com/it/${path}`,'',nutritional);
const unique=output.filter((f,i,a)=>a.findIndex(x=>x.id===f.id)===i).sort((a,b)=>a.brand.localeCompare(b.brand,'it')||a.name.localeCompare(b.name,'it'));
await writeFile('src/data/flours.json',JSON.stringify(unique,null,2)+'\n');
console.log(unique.map(f=>`${f.id} | ${f.type} | W ${f.w||'n.d.'} | P ${f.protein??'n.d.'} | ${f.usable?'use':'LOOKUP'} | ${f.name}`).join('\n'));
console.log(`${unique.length} records / ${new Set(unique.map(f=>f.brand)).size} brands / ${unique.filter(f=>f.w).length} with W`);
