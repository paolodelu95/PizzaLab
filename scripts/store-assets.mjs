// Genera le grafiche per la scheda del Play Store partendo dall’app reale.
// Uso: avvia l’app (npx vite --port 5180) e poi `node scripts/store-assets.mjs [url]`.
// Richiede Microsoft Edge installato (o cambia `channel`).
import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.argv[2] ?? "http://127.0.0.1:5180";
const OUT = path.resolve("store/graphics");
const RAW = path.join(OUT, "raw");
await mkdir(RAW, { recursive: true });

const browser = await chromium.launch({ channel: "msedge" });

async function appPage(viewport, scale) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: scale,
    colorScheme: "light",
    locale: "it-IT",
    isMobile: viewport.width < 600,
    hasTouch: viewport.width < 600,
  });
  await context.addInitScript(() => {
    localStorage.setItem("CapacitorStorage.pizzalab-tutorial-v1", "done");
  });
  const page = await context.newPage();
  await page.goto(BASE);
  await page.addStyleTag({ content: ".toast{display:none!important} *{caret-color:transparent!important}" });
  await page.getByRole("heading", { name: /Progetta\. Impasta/ }).waitFor();
  return { page, context };
}

const settle = (page) => page.waitForTimeout(450);
async function scrollTo(page, selector, offset = 0) {
  await page.evaluate(
    ([sel, off]) => {
      const el = document.querySelector(sel);
      if (!el) throw new Error(`Elemento non trovato: ${sel}`);
      const top = el.getBoundingClientRect().top + window.scrollY - off;
      window.scrollTo({ top, behavior: "instant" });
    },
    [selector, offset],
  );
  await settle(page);
}
async function step(page, index) {
  await page.locator(".planner-steps button").nth(index).click();
  await settle(page);
}

// ---------- Schermate telefono ----------
const phone = await appPage({ width: 390, height: 780 }, 3);
{
  const { page } = phone;
  const shots = [];
  const shot = async (name) => {
    const file = path.join(RAW, `${name}.png`);
    await page.screenshot({ path: file });
    shots.push(file);
  };
  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(page);
  await shot("01-home");

  await step(page, 1);
  await scrollTo(page, ".planning-mode-card", 76);
  await shot("02-fermentation");

  await step(page, 2);
  await scrollTo(page, ".bake-prediction-window", 70);
  await shot("03-baking");

  await step(page, 3);
  await scrollTo(page, "#planner-anchor", 66);
  await shot("04-summary");

  await page.getByLabel("Nome del piano").fill("La pizza del sabato");
  await page.getByRole("button", { name: "Programma" }).click();
  await page.getByText("IMPASTO IN CORSO", { exact: true }).waitFor();
  await scrollTo(page, ".journal-card", 70);
  await shot("05-diary");

  await page.getByRole("button", { name: "Lievito", exact: true }).click();
  await page.getByLabel("Come vuoi chiamarlo?").fill("Gino");
  await page.locator(".starter-kind-card").filter({ hasText: "Pasta madre solida" }).getByRole("button", { name: "Ne ho già uno" }).click();
  await page.getByRole("heading", { name: "Gino" }).waitFor();
  await scrollTo(page, ".starter-switcher", 70);
  await shot("06-starter");

  await page.getByRole("button", { name: "Farine", exact: true }).click();
  await page.getByRole("textbox", { name: "Cerca farina" }).fill("Caputo");
  await settle(page);
  await scrollTo(page, ".catalog-filters", 58);
  await shot("07-flours");

  await page.getByRole("button", { name: "Condimenti", exact: true }).click();
  await page.getByRole("button", { name: /Diavola/ }).click();
  await scrollTo(page, ".selected-topping-plan", 70);
  await shot("08-toppings");
}

// ---------- Schermate tablet (16:9) ----------
const tablet = await appPage({ width: 1280, height: 720 }, 2);
{
  const { page } = tablet;
  await step(page, 3);
  await scrollTo(page, "#planner-anchor", 72);
  await page.screenshot({ path: path.join(OUT, "tablet-01-riepilogo.png") });
  await step(page, 2);
  await scrollTo(page, ".bake-prediction-window", 90);
  await page.screenshot({ path: path.join(OUT, "tablet-02-cottura.png") });
  await page.getByRole("button", { name: "Farine", exact: true }).click();
  await settle(page);
  await page.screenshot({ path: path.join(OUT, "tablet-03-farine.png") });
}

// ---------- Composizioni con didascalia ----------
const captions = [
  ["01-home", "Dosi perfette per ogni stile", "Napoletana, teglia, focaccia barese e altri 10 stili"],
  ["02-fermentation", "Tempi e lievito calcolati per te", "Dimmi quando vuoi mangiare, al resto pensa PizzaLab"],
  ["03-baking", "Prevedi la cottura", "Crosta, mollica e fondo in tempo reale"],
  ["04-summary", "Parti subito o salva per dopo", "Tutta la tabella di marcia in un riepilogo"],
  ["05-diary", "Programmala e parte da sola", "Una notifica a ogni fase, bilancia e guida passo passo"],
  ["06-starter", "Il tuo lievito madre", "Rinfreschi, crescita e promemoria"],
  ["07-flours", "175 farine a portata di mano", "Forza W e proteine dalle schede dei produttori"],
  ["08-toppings", "Condimenti nelle giuste dosi", "Ricette classiche calcolate sulla tua pizza"],
];
const logo = `data:image/png;base64,${(await readFile("src/assets/pizzalab-logo.png")).toString("base64")}`;
const icon = `data:image/png;base64,${(await readFile("assets/branding/pizzalab-icon-v4.png")).toString("base64")}`;
const font = `font-family: Inter, Roboto, system-ui, -apple-system, 'Segoe UI', sans-serif;`;

const canvas = await browser.newPage({ deviceScaleFactor: 1 });
async function render(html, width, height, file) {
  await canvas.setViewportSize({ width, height });
  await canvas.setContent(html, { waitUntil: "load" });
  await canvas.screenshot({ path: file });
}

for (const [name, title, subtitle] of captions) {
  const img = `data:image/png;base64,${(await readFile(path.join(RAW, `${name}.png`))).toString("base64")}`;
  await render(
    `<html><body style="margin:0;${font}">
      <div style="width:1080px;height:1920px;overflow:hidden;position:relative;background:
        radial-gradient(90% 55% at 85% 0%, #f7b39b 0%, transparent 60%), linear-gradient(180deg,#faf1e8 0%,#f3e3d4 100%);">
        <div style="padding:110px 90px 0;text-align:center">
          <div style="font-size:84px;line-height:1.05;font-weight:800;letter-spacing:-3px;color:#1f1a16;text-wrap:balance">${title}</div>
          <div style="margin-top:26px;font-size:42px;line-height:1.3;font-weight:500;color:#6a5d51;text-wrap:balance">${subtitle}</div>
        </div>
        <div style="position:absolute;left:50%;top:470px;transform:translateX(-50%);width:760px;padding:22px;border-radius:92px;
          background:#1f1a16;box-shadow:0 60px 120px -30px rgba(80,40,15,.45)">
          <div style="border-radius:72px;overflow:hidden;background:#faf7f2">
            <img src="${img}" style="display:block;width:716px">
          </div>
        </div>
      </div></body></html>`,
    1080,
    1920,
    path.join(OUT, `phone-${name}.png`),
  );
}

// Immagine in evidenza 1024×500
const home = `data:image/png;base64,${(await readFile(path.join(RAW, "01-home.png"))).toString("base64")}`;
const bake = `data:image/png;base64,${(await readFile(path.join(RAW, "03-baking.png"))).toString("base64")}`;
await render(
  `<html><body style="margin:0;${font}">
    <div style="width:1024px;height:500px;position:relative;overflow:hidden;background:
      radial-gradient(70% 90% at 100% 0%, #ff9b76 0%, transparent 60%), linear-gradient(120deg,#c3421c 0%,#e0532b 55%,#ef7a4e 100%)">
      <div style="position:absolute;left:64px;top:92px;width:470px;color:#fff">
        <div style="display:flex;align-items:center;gap:18px">
          <img src="${logo}" style="width:84px;height:84px;border-radius:24px;box-shadow:0 10px 30px rgba(0,0,0,.25)">
          <div style="font-size:60px;font-weight:800;letter-spacing:-2px">PizzaLab</div>
        </div>
        <div style="margin-top:28px;font-size:38px;line-height:1.15;font-weight:800;letter-spacing:-1px">Il tuo laboratorio della pizza</div>
        <div style="margin-top:16px;font-size:22px;line-height:1.4;font-weight:500;opacity:.92">Dosi, lievitazione e cottura per la pizza fatta in casa, passo dopo passo.</div>
      </div>
      <div style="position:absolute;right:210px;top:60px;width:250px;padding:10px;border-radius:40px;background:#1f1a16;transform:rotate(-7deg);box-shadow:0 30px 60px rgba(60,20,5,.45)">
        <img src="${bake}" style="display:block;width:230px;border-radius:32px">
      </div>
      <div style="position:absolute;right:-10px;top:110px;width:250px;padding:10px;border-radius:40px;background:#1f1a16;transform:rotate(6deg);box-shadow:0 30px 60px rgba(60,20,5,.45)">
        <img src="${home}" style="display:block;width:230px;border-radius:32px">
      </div>
    </div></body></html>`,
  1024,
  500,
  path.join(OUT, "feature-graphic-1024x500.png"),
);

// Icona 512×512 a tutta pagina (Google applica da sé gli angoli arrotondati)
await render(
  `<html><body style="margin:0">
    <div style="width:512px;height:512px;overflow:hidden;position:relative;background:#cd3b2a">
      <img src="${icon}" style="position:absolute;width:890px;height:890px;left:-189px;top:-189px">
    </div></body></html>`,
  512,
  512,
  path.join(OUT, "icon-512.png"),
);

await browser.close();
await writeFile(path.join(OUT, "README.md"), `# Grafiche Play Store

Generate con \`node scripts/store-assets.mjs\`.

- \`icon-512.png\` – icona dell’app (512×512)
- \`feature-graphic-1024x500.png\` – immagine in evidenza
- \`phone-*.png\` – screenshot telefono (1080×1920, 9:16)
- \`tablet-*.png\` – screenshot tablet (2560×1440, 16:9)
- \`raw/\` – catture originali dell’app
`);
console.log("Grafiche salvate in", OUT);
