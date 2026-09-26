// Download public manufacturer product pages. Raw pages stay in ignored .cache.
// Candidates require review before inclusion; never infer W from protein.
import { load } from 'cheerio';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
const sources = [
  ['Caputo', 'https://www.mulinocaputo.it/categoria-prodotto/farina-per-pizza/', /\/prodotti\/[^/]+\/$/],
  ['Garofalo', 'https://www.pasta-garofalo.com/it/prodotti/farine-e-semole/farine-pasta-garofalo/', /\/it\/prodotto\//],
  ['Le 5 Stagioni', 'https://le5stagioni.com/prodotto/', /\/prodotto\/[^/]+\/$/],
  ['Molino Vigevano', 'https://molinovigevano.com/prodotti/farine-casalinghe/', /\/(landing|prodotto)\/[^/]+\/$/],
  ['Molino Vigevano', 'https://molinovigevano.com/prodotti/farine-professionali/', /\/(landing|prodotto)\/[^/]+\/$/],
  ['Molino Spadoni', 'https://www.molinospadoni.it/categorie_prodotti/tradizionali/', /\/prodotti\/[^/]+\/$/],
  ['Mulino Padano', 'https://store.mulinopadano.it/', /\/prodotto\/[^/]+\/$/],
  ['Mulino Padano', 'https://store.mulinopadano.it/prodotti/farine-per-pizza/', /\/prodotto\/[^/]+\/$/],
  ['Mulino Padano', 'https://store.mulinopadano.it/prodotti/linee-speciali/granessere/', /\/prodotto\/[^/]+\/$/],
  ['Mulino Padano', 'https://store.mulinopadano.it/prodotti/linee-speciali/granaio-italiano/', /\/prodotto\/[^/]+\/$/],
  ['Mulino Padano', 'https://store.mulinopadano.it/prodotti/farine-per-panificazione/', /\/prodotto\/[^/]+\/$/],
  ['Molini Pivetti', 'https://www.molinipivetti.it/categoria-prodotto/farine-per-pizzeria/', /\/prodotto\/[^/]+\/$/],
  ['Molini Pivetti', 'https://www.molinipivetti.it/prodotto/professional-pizza-blu/', /\/prodotto\/[^/]+\/$/],
  ['Molino Rossetto', 'https://www.molinorossetto.com/it/19-le-farine-di-forza', /\/it\/(le-farine-di-forza|le-classiche|le-speciali)\/.*\.html$/],
  ['Molino Rossetto', 'https://www.molinorossetto.com/it/16-le-classiche', /\/it\/(le-farine-di-forza|le-classiche|le-speciali)\/.*\.html$/],
];
await mkdir('.cache/sources', { recursive: true });
const cachePath = url => `.cache/sources/${Buffer.from(url).toString('base64url')}.html`;
async function fetchPage(url) {
  try { return await readFile(cachePath(url), 'utf8'); } catch { /* first download */ }
  const r = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { 'User-Agent': 'PizzaLab/0.4 (product data research)' } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  const html = await r.text();
  await writeFile(cachePath(url), html);
  return html;
}
let candidates = [];
try { candidates = JSON.parse(await readFile('.cache/catalog-candidates.json','utf8')); } catch { /* new collection */ }
for (const [brand, index, pattern] of sources) {
  try {
    const $ = load(await fetchPage(index));
    const links = [...new Set($('a[href]').map((_, e) => { try { return new URL($(e).attr('href'), index).href.split('#')[0]; } catch { return ''; } }).get())]
      .filter(url => new URL(url).hostname === new URL(index).hostname && pattern.test(new URL(url).pathname) && !/\/(en|de|fr|es)\//.test(url));
    console.log(brand, links.length, 'product links');
    for (const url of links) {
      if (candidates.some(c => c.url === url)) continue;
      try {
        const p = load(await fetchPage(url));
        p('script, style, nav, header, footer, noscript').remove();
        const name = p('h1').first().text().trim();
        const body = (p('main').length ? p('main') : p('body')).text().replace(/\s+/g, ' ').trim();
        candidates.push({ brand, name, url, text: body, retrievedAt: new Date().toISOString().slice(0,10) });
      } catch (error) { console.warn(String(error)); }
    }
  } catch (error) { console.warn(brand, String(error)); }
}
await writeFile('.cache/catalog-candidates.json', JSON.stringify(candidates, null, 2));
console.log('Downloaded', candidates.length, 'product pages. Review .cache/catalog-candidates.json');
