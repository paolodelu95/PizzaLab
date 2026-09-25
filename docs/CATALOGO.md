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

## Fonti principali

- [Caputo Pizzeria](https://www.mulinocaputo.it/prodotti/pizzeria/) e pagine prodotto della stessa gamma.
- [Garofalo, linea farine](https://www.pasta-garofalo.com/it/prodotti/farine-e-semole/farine-pasta-garofalo/).
- [Le 5 Stagioni, prodotti](https://le5stagioni.com/prodotto/) e [catalogo edizione 2023 pubblicato nel 2025](https://le5stagioni.com/wp-content/uploads/2025/03/CATALOGO_COMPLETO-20231220-IT-EN-NEW_compressed.pdf). Le schede del PDF sono identificate nelle note; non sono spacciate per analisi del 2026.
- [Dallagiovanna Far Pizza](https://www.dallagiovanna.it/farine-speciali-far-pizza): W/P-L pubblicati, proteine assenti. I valori P/L con refuso per FR Rosa/E Rosa restano mancanti.
- [Spadoni](https://www.molinospadoni.it/categorie_prodotti/tradizionali/): molte pagine descrivono ingredienti ma non forniscono W/proteine. Nessun riempimento da negozi o forum.
- [Molino Vigevano](https://molinovigevano.com/prodotti/farine-professionali/), [Mulino Padano](https://store.mulinopadano.it/prodotti/farine-per-pizza/), [Pivetti](https://www.molinipivetti.it/categoria-prodotto/farine-per-pizzeria/) e [Rossetto](https://www.molinorossetto.com/it/19-le-farine-di-forza).
- [Casillo](https://shop.molinocasillo.com/it/farine-e-semole-per-professionisti/pizzeria), [Grassi](https://www.molinograssi.it/product/farina-00-pizza-e-focaccia/), [Divella](https://www.divella.it/it/prodotti/farina-00-pizza-1kg-5kg/) e [Barilla](https://www.barilla.com/it-it/prodotti/farine-e-cereali/farine/farina-integrale-di-grano-tenero).
- Petra e Polselli: collegamenti alle singole schede in ciascun record JSON/CSV.

Il codice dell'estrattore e le integrazioni manuali sono in `scripts/build-catalog.mjs`. Le pagine HTML originali sono conservate solo localmente in `.cache/sources`, non versionate né distribuite nell'app. Il catalogo distribuito contiene fatti strutturati, nomi commerciali e note originali; non riproduce testi promozionali completi o immagini delle confezioni.

Prima di aggiornare: leggere i valori nel contesto della scheda, controllare ingredienti, confrontare i conteggi, eseguire `npm run catalog:validate` e rieseguire la build Android. Il caricamento automatico di pagine nuove non sostituisce la revisione.
