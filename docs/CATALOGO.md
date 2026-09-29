# Provenienza e revisione del catalogo

Il catalogo è uno snapshot di prodotti reali da fonti primarie, non una banca dati ufficiale dei molini. I valori possono cambiare con formula, confezione e lotto. “Consultato” identifica la data di accesso alla pagina, non la data di misurazione in laboratorio.

## Regole

- `null` significa dato non disponibile nella fonte consultata, non zero e non stima.
- `w` conserva un intervallo pubblicato, un valore nominale ripetuto oppure un intervallo ottenuto da tolleranze esplicite. Le note indicano i casi particolari. I minimi senza estremo superiore non diventano intervalli inventati.
- `proteinBasis` distingue grammi/100 g di prodotto, minimo su sostanza secca e percentuale senza base esplicitata. Nessuna conversione implicita fra basi.
- La dicitura CD della scheda Molino Grassi non è stata interpretata come proteine.
- P/L è testuale per mantenere disuguaglianze e intervalli. I refusi evidenti non vengono corretti per intuizione.
- Assorbimento di laboratorio e idratazione della ricetta non sono equivalenti. Gli intervalli di idratazione sono nello stile, non attribuiti alla farina come specifiche del produttore.
- Prodotti senza glutine, semole, preparati con lievito già dosato e concentrati da usare in percentuale sono consultabili ma esclusi dal calcolo standard. Alcune miscele di cereali senza lievito dosato restano utilizzabili con un avviso dedicato.
- Le varianti casa/professionale sono separate quando le pagine riportano specifiche differenti. I tipi raggruppati dal produttore (es. Dallagiovanna 0/00) restano una singola referenza. Non viene dedotta un'equivalenza fra confezioni di peso diverso.

## W stimato (stime teoriche)

Il `w` dei record resta `null` quando il produttore non lo dichiara: **non viene mai riempito con una stima**. Le stime vivono a parte, in `src/data/wEstimates.json`, e sono generate da `node scripts/estimate-w.mjs`.

- **Farine con proteine dichiarate:** regressione W ≈ 37,1 · proteine − 182 sui W dichiarati dai produttori (47 farine di grano tenero, proteine su prodotto tal quale; r² 0,58, scarto tipico 38). L’intervallo mostrato va da −3 a +2 scarti (fino a +4 con proteine ≥ 13%, dove i dati sono pochi e i grani duri salgono di più) ed è arrotondato a 5. La confidenza è «media» tra 10 e 13% di proteine, «bassa» oltre.
- **Verifica indipendente:** cinque farine Shipton Mill dichiarano sia proteine sia «W-Index»; la regressione le prevede entro −49 / +10 punti, dentro l’intervallo mostrato.
- **Farine generiche:** percentili 10–90 dei W dichiarati per lo stesso tipo (00, 0), oppure minimo e massimo allargati di 30 se i dati sono pochi (1, integrale, Manitoba, confidenza «bassa»). Tipo 2, semola, farro e riso non hanno abbastanza dati o non seguono la scala: restano senza W.
- **Come lo usa il calcolo:** solo per gli avvisi sulla tenuta (farina delicata o troppo forte per i tempi, acqua alta) e per la forza media delle miscele; mai per dosi o lievito. Gli avvisi usano un margine di circa uno scarto tipico (40) attorno al valore centrale, non l’intero intervallo mostrato.
- Ogni stima riporta metodo, confidenza e data, e l’interfaccia la chiama sempre «W stimato», con l’avviso che è un valore teorico e può essere impreciso.

## Farine straniere

`src/data/internationalFlours.json` raccoglie farine di King Arthur, Bob’s Red Mill, Marriage’s e Shipton Mill con proteine dichiarate (e, per Shipton, il «W-Index» dichiarato, non necessariamente misurato come nell’alveografo). Solo valori trovati sulle pagine ufficiali dei produttori, con URL e data di consultazione; dove il produttore dà un intervallo si usa il punto medio e la nota lo dice.

## Fonti principali

- [Caputo Pizzeria](https://www.mulinocaputo.it/prodotti/pizzeria/) e pagine prodotto della stessa gamma.
- [Garofalo, linea farine](https://www.pasta-garofalo.com/it/prodotti/farine-e-semole/farine-pasta-garofalo/).
- [Le 5 Stagioni, prodotti](https://le5stagioni.com/prodotto/) e [catalogo edizione 2023 pubblicato nel 2025](https://le5stagioni.com/wp-content/uploads/2025/03/CATALOGO_COMPLETO-20231220-IT-EN-NEW_compressed.pdf). Le schede del PDF sono identificate nelle note; non sono spacciate per analisi del 2026.
- [Dallagiovanna Far Pizza](https://www.dallagiovanna.it/farine-speciali-far-pizza): W/P-L pubblicati, proteine assenti. I valori P/L con refuso per FR Rosa/E Rosa restano mancanti.
- [Spadoni](https://www.molinospadoni.it/categorie_prodotti/tradizionali/): molte pagine descrivono ingredienti ma non forniscono W/proteine. Nessun riempimento da negozi o forum.
- [Molino Vigevano](https://molinovigevano.com/prodotti/farine-professionali/), [Mulino Padano](https://store.mulinopadano.it/prodotti/farine-per-pizza/), [Pivetti](https://www.molinipivetti.it/categoria-prodotto/farine-per-pizzeria/) e [Rossetto](https://www.molinorossetto.com/it/19-le-farine-di-forza).
- [Casillo](https://shop.molinocasillo.com/it/farine-e-semole-per-professionisti/pizzeria), [Grassi](https://www.molinograssi.it/product/farina-00-pizza-e-focaccia/), [Divella](https://www.divella.it/it/prodotti/farina-00-pizza-1kg-5kg/) e [Barilla](https://www.barilla.com/it-it/prodotti/farine-e-cereali/farine/farina-integrale-di-grano-tenero).
- Petra e Polselli: collegamenti alle singole schede in ciascun record JSON/CSV.
- Farine straniere: [King Arthur, percentuali di proteine](https://www.kingarthurbaking.com/blog/2023/09/25/protein-percentage), [Bob’s Red Mill Artisan Bread Flour](https://www.bobsredmill.com/product/artisan-bread-flour), [Marriage’s](https://flour.co.uk/product/finest-strong-white-bread-flour-3/) e [Shipton Mill](https://www.shipton-mill.com/collections/white-flour).

Il codice dell'estrattore e le integrazioni manuali sono in `scripts/build-catalog.mjs`. Le pagine HTML originali sono conservate solo localmente in `.cache/sources`, non versionate né distribuite nell'app. Il catalogo distribuito contiene fatti strutturati, nomi commerciali e note originali; non riproduce testi promozionali completi o immagini delle confezioni.

Prima di aggiornare: leggere i valori nel contesto della scheda, controllare ingredienti, confrontare i conteggi, eseguire `npm run catalog:validate` e rieseguire la build Android. Il caricamento automatico di pagine nuove non sostituisce la revisione.
