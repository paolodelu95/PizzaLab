# Modello di impasto diretto, versione direct-v1

Il modello genera un punto di partenza pratico. Non predice in modo scientificamente validato maturazione, digeribilità o volume. Questi aspetti non sono deducibili dal solo W e dal tempo trascorso.

## Quantità

Per le pizze tonde la massa è numero × peso del panetto. Per teglia e focaccia è numero × larghezza × lunghezza × densità areale. La densità predefinita di 0,6 g/cm² è una scelta iniziale regolabile, non una proprietà dello stile.

Le percentuali sono tutte riferite al peso della farina. La massa totale include anche sale, olio e lievito:

```
farina = massa / (1 + acqua%/100 + sale%/100 + olio%/100 + lievito%/100)
```

Gli ingredienti derivano dalla farina non arrotondata; l'interfaccia arrotonda solo la visualizzazione. Olio per ungere, condimento e salamoia superficiale sono esclusi.

## Stima del lievito

```
attività_ambiente = 2 ^ ((T_ambiente - 22) / 10)
attività_frigo = 0,08 × 2 ^ ((T_frigo - 4) / 5)
ore_equivalenti = (puntata + appretto) × attività_ambiente + ore_frigo × attività_frigo
lievito_fresco_percento = 0,18 × (8 / ore_equivalenti)^0,85 × (1 + (sale% - 2,5) × 0,08)
```

La dose fresca è limitata a 0,02–3% e viene segnalato l'eventuale limite. Per il secco istantaneo si divide la percentuale per 3. È un rapporto di partenza: formulazione e attività vanno confrontate con l'etichetta.

Costanti, esponente e correttivo di sale sono **scelte euristiche del progetto**, non formule dichiarate dai produttori. Il calcolo non misura temperatura finale dell'impasto, trasferimento termico, dimensione del contenitore, attività enzimatica, vitalità del lievito o crescita. Il coefficiente del frigo rappresenta grossolanamente attività residua e raffreddamento non istantaneo; non è un modello termico. La formula non giustifica confronti assoluti fra farine.

## Avvisi

Le soglie W/ore e gli intervalli di idratazione sono riferimenti editoriali conservativi. Non esiste una conversione universale W → ore. Sono mantenute separate dai dati di laboratorio del catalogo. Una combinazione senza avvisi non garantisce la riuscita.

I limiti di input evitano NaN, divisioni per zero, date invalide, quantità frazionarie e parametri fuori dall'intervallo supportato. Un dato W assente produce un avviso; non viene riempito sulla base del marchio, delle proteine o del tipo.

## Tempo

Il piano sottrae dall'ora della prima cottura tutte le durate e 20 minuti operativi per l'impastamento. Le fasi usano millisecondi trascorsi, quindi gestiscono il cambio di ora legale senza assumere giornate da 24 ore locali. L'ora della cottura è interpretata nel fuso del dispositivo quando si crea il piano. Non cambiare fuso durante un piano attivo senza ricalcolarlo e riattivarlo.

Il preriscaldamento, sovrapposto all'ultima parte del riposo, inizia 45 minuti prima della cottura. Questo anticipo è un promemoria: conta il preriscaldamento richiesto dall'attrezzatura effettiva.

Sono testate conservazione della massa, monotonia di temperatura/durata, differenza frigo/ambiente, farine mancanti, miscele, cambio ora legale e ordinamento degli eventi. Non sono state eseguite prove reali di impasto.
