# PizzaLab

Companion Android in italiano per la pizza fatta in casa. Interfaccia React/TypeScript, motore di calcolo indipendente e contenitore Android Capacitor. Nessun backend, account o servizio di AI necessario durante l'uso: catalogo e applicazione sono inclusi nel pacchetto Android.

## Cosa fa

- Tredici stili: napoletana, contemporanea, romana tonda, teglia, pala, padellino, focaccia, focaccia barese, New York, Detroit, pinsa, sfincione e tonda da forno domestico.
- Dosi per numero/peso dei panetti o superficie delle teglie, rettangolari o tonde; idratazione, sale, olio, lievito fresco o secco istantaneo.
- Puntata, permanenza in frigo e appretto indipendenti; temperatura ambiente, frigo e forno modificabili.
- Miscela fino a quattro farine con quote regolabili, grammi separati, forza media indicativa, farine dedicate al prefermento e miscele riutilizzabili.
- Grafici reattivi per confrontare l’idratazione con la zona dello stile e la dose di lievito con le ore combinate, tenendo conto delle temperature impostate.
- Impasto diretto, poolish e biga con ingredienti separati, temperatura, durata, stato di maturità e ottimizzazione del picco.
- Temperatura dell’acqua con fattore 3 e correzione per impasto a mano, planetaria, spirale o robot riscaldante.
- Lievito automatico o manuale, profilo di fermentazione, punteggi di lavorabilità/alveolatura/sapore/coerenza e modalità data o durata.
- Otto profili forno generici, temperatura effettiva e indicazioni di preriscaldamento.
- Tabella di marcia a ritroso dalla cottura, compresi impastamento e preriscaldamento.
- Avvisi su farina debole, idratazione, tempi lunghi, caldo, frigo caldo, appretto breve, forno poco caldo e dosi di lievito difficili da pesare.
- Diario persistente, checklist, stelle, appunti, misure reali di temperatura con avvisi, statistiche personali, condivisione ed esportazione JSON; farine personali.
- Promemoria locali Android su un solo piano attivo: attivarne un altro sostituisce quelli precedenti. Cancellare il piano attivo rimuove i suoi promemoria.

## Avvio

Richiede Node.js 22 o superiore (verificato con Node 24).

```sh
npm ci
npm run dev
```

Aprire `http://127.0.0.1:5173`. Il browser permette di provare tutti i flussi e conserva i dati localmente; le notifiche in background sono una funzione dell'app Android. L'anteprima web non è una PWA e non promette funzionamento offline dopo la chiusura del server.

## Web app per iPhone (e browser)

La stessa app è pubblicata gratis su GitHub Pages: **https://paolodelu95.github.io/PizzaLab/app/**. Su iPhone si installa da Safari con *Condividi → Aggiungi alla schermata Home* (su Android: menu di Chrome → *Installa app*). Funziona offline dopo la prima apertura e salva i dati nel browser del dispositivo.

Nella versione web le notifiche programmate non sono disponibili: gli avvisi di ogni fase (e dei rinfreschi del lievito madre) si aggiungono al Calendario del telefono con «Aggiungi al calendario», che crea un file `.ics` con un allarme per ogni evento. L’app Android continua a usare le notifiche locali.

La pubblicazione è automatica a ogni push su `main` (`.github/workflows/pages.yml`): esegue i test del modello, costruisce la web app con `--base=/PizzaLab/app/` e la pubblica insieme alle pagine di `docs/` (compresa l’informativa sulla privacy).

## Android

Richiede JDK 21, SDK Android 36 e Build Tools 36.0.0. Minimo Android 7 / API 24. ID applicazione: `it.pizzalab.app`.

```sh
npm run android:sync
npm run android:open
```

Oppure, da PowerShell dopo avere impostato `android/local.properties` con il percorso dello SDK:

```powershell
Set-Location android
.\gradlew.bat assembleDebug
```

Il risultato è `android/app/build/outputs/apk/debug/app-debug.apk`. L'APK debug è destinato a prove locali. La pubblicazione richiede una chiave di firma propria e una build release; nessuna pubblicazione automatica è configurata.

Nel workspace di sviluppo lo SDK è stato scaricato in `.android-sdk/` (ignorato da Git). Su un altro computer si può usare lo SDK installato da Android Studio.

Le notifiche chiedono il consenso Android al primo utilizzo. Sono programmate come avvisi non esatti per evitare l'accesso speciale agli allarmi: il sistema può ritardarle, soprattutto in risparmio energetico. Dopo una revoca dei permessi o un arresto forzato, riaprire l'app e riattivare il piano. Il plugin registra il ripristino al riavvio del dispositivo. La consegna effettiva a schermo spento richiede una verifica su telefono fisico.

## Catalogo delle farine

Snapshot consultato il **25 settembre 2026**: **159 referenze, 15 marchi**, di cui **94 con W** e **85 con proteine** disponibili. 134 sono selezionabili nel calcolo standard; 25 sono consultabili ma richiedono ricette specifiche.

Fonti: pagine e cataloghi ufficiali dei produttori. Ogni record include URL, data, tipo, W minimo/massimo o nominale, proteine, base di espressione, P/L quando disponibile e note. Le referenze comprendono Caputo, Garofalo, Spadoni, Le 5 Stagioni, Dallagiovanna, Polselli, Petra, Casillo, Grassi, Vigevano, Pivetti, Rossetto, Mulino Padano, Divella e Barilla.

- Dati usati dall'app: [`src/data/flours.json`](src/data/flours.json).
- Esportazione apribile con Excel: [`data/farine.csv`](data/farine.csv).
- Conteggi e copertura: [`data/catalog-stats.json`](data/catalog-stats.json).
- Metodologia e limiti: [`docs/CATALOGO.md`](docs/CATALOGO.md).
- Farine straniere (`src/data/internationalFlours.json`): King Arthur, Bob’s Red Mill, Marriage’s e Shipton Mill, con proteine e, dove esiste, W dichiarati dal produttore, ciascuna con URL e data.
- **W stimato** (`src/data/wEstimates.json`, generato da `node scripts/estimate-w.mjs`): per le farine che non dichiarano il W si usa una regressione sui W dichiarati dai produttori (con intervallo largo) oppure, per le farine generiche, i W dichiarati per lo stesso tipo. È sempre mostrato come stima teorica e non sostituisce mai un W dichiarato; `npm run catalog:validate` controlla intervallo, metodo e data di ogni stima.

Non è una classifica dei prodotti più venduti: non sono stati trovati dati pubblici sufficienti per stabilirla. Non è un censimento completo del mercato italiano. “Marchio italiano” non implica grano coltivato in Italia. L'app non scarica automaticamente gli aggiornamenti: usa lo snapshot distribuito con la versione installata.

Gli script di raccolta sono strumenti di manutenzione, non un importatore senza supervisione:

```sh
node scripts/collect-sources.mjs
node scripts/build-catalog.mjs
npm run catalog:validate
```

Il primo conserva pagine pubbliche nella cache locale; il secondo applica estrattori per produttore e integrazioni verificate; il terzo controlla lo schema e rigenera CSV e statistiche. Dopo ogni raccolta, controllare manualmente dati, varianti, tolleranze e ingredienti. Non distribuire le pagine HTML complete della cache.

## Modello e verifiche

```sh
npm test
npm run test:e2e
npm run catalog:validate
npm run build
```

I test end-to-end usano Microsoft Edge installato localmente, con viewport desktop e Pixel 7. Per altri ambienti, modificare `channel` in `playwright.config.ts` oppure installare Chromium con Playwright.

Il modello gestisce **impasto diretto, poolish e biga con lievito di birra**. Il lievito madre e gli impasti senza glutine non hanno un calcolo dedicato. W non viene ricavato dalle proteine. La forza delle miscele è soltanto una media ponderata orientativa e non permette di ricavare da sola l’assorbimento reale. Maturità e dose di lievito sono stime euristiche e non sono state calibrate mediante prove di panificazione. Dettagli e formule in [`docs/MODELLO.md`](docs/MODELLO.md).

## Struttura e dati personali

`src/domain` contiene calcolo, stili e timeline; `src/services` contiene salvataggio e notifiche; `src/components` contiene il catalogo e la guida. `android/` è il progetto nativo con wrapper Gradle.

Preferenze e diario usano Capacitor Preferences (SharedPreferences su Android; localStorage nel browser). Nessuna telemetria è inclusa. I link alle fonti aprono siti esterni solo su richiesta. Gli eventuali backup del sistema operativo dipendono dalle impostazioni Android. Disinstallare l'app o cancellare i dati può rimuovere il diario.
