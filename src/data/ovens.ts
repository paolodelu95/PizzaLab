export interface OvenProfile {
  id:string; name:string; family:string; maxTemp:number; preheat:number; note:string;
}

export const ovenProfiles:OvenProfile[] = [
  {id:'custom',name:'Forno personalizzato',family:'Personalizzato',maxTemp:250,preheat:45,note:'Imposta la temperatura massima reale del tuo forno.'},
  {id:'home-static',name:'Domestico statico',family:'Elettrico',maxTemp:250,preheat:50,note:'Pietra o acciaio sul ripiano alto; completa con grill se serve.'},
  {id:'home-fan',name:'Domestico ventilato',family:'Elettrico',maxTemp:275,preheat:45,note:'Riduci la ventilazione se asciuga troppo la superficie.'},
  {id:'high-temp-electric',name:'Elettrico alta temperatura',family:'Elettrico pizza',maxTemp:450,preheat:25,note:'Controlla separatamente potenza sopra e sotto quando possibile.'},
  {id:'portable-gas',name:'Forno pizza portatile a gas',family:'Gas',maxTemp:500,preheat:25,note:'Ruota spesso la pizza: la fiamma laterale crea zone molto diverse.'},
  {id:'wood-fired',name:'Forno a legna',family:'Legna',maxTemp:500,preheat:90,note:'Misura il piano, sposta brace e fiamma e cuoci lontano dai punti eccessivi.'},
  {id:'gas-deck',name:'Forno professionale a gas',family:'Gas',maxTemp:450,preheat:45,note:'Stabilizza cielo e platea prima del servizio.'},
  {id:'kamado',name:'Kamado con pietra',family:'Carbone',maxTemp:400,preheat:45,note:'Usa un deflettore e lascia spazio fra deflettore e pietra.'},
];
