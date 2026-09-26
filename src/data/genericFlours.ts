import type { Flour } from '../domain/types';

const generic=(id:string,name:string,type:string,kind:Flour['kind']='wheat'):Flour=>({
  id:`generic-${id}`,brand:'Farina generica',name,type,w:null,protein:null,proteinBasis:'Non disponibile: controlla la confezione',pl:null,source:'',checkedAt:'2026-09-26',kind,usable:true,
  note:'Profilo generico senza marca. Il tipo legale non determina forza W, proteine o assorbimento: inserisci i dati della confezione nella tua dispensa quando li conosci.',
});

export const genericFlours:Flour[]=[
  generic('tipo-00','Tipo 00','00'),
  generic('tipo-0','Tipo 0','0'),
  generic('tipo-1','Tipo 1','1'),
  generic('tipo-2','Tipo 2','2'),
  generic('integrale','Integrale di grano tenero','Integrale'),
  generic('manitoba','Manitoba / farina forte','Manitoba'),
  generic('semola-rimacinata','Semola rimacinata di grano duro','Semola rimacinata','other'),
  generic('farro','Farina di farro','Farro','other'),
  generic('riso','Farina di riso','Riso','other'),
];
