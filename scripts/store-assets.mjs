// Genera le grafiche per la scheda del Play Store partendo dall’app reale, in italiano e in inglese.
// Uso: avvia l’app (npx vite --port 5187) e poi `node scripts/store-assets.mjs [url]`.
// Richiede Microsoft Edge installato (o cambia `channel`).
import { chromium } from "@playwright/test";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.argv[2] ?? "http://127.0.0.1:5187";
const OUT = path.resolve("store/graphics");
const RAW = path.join(OUT, "raw");
await rm(OUT, { recursive: true, force: true });
await mkdir(RAW, { recursive: true });

const browser = await chromium.launch({ channel: "msedge" });
const dataUrl = async (file, type) => `data:${type};base64,${(await readFile(file)).toString("base64")}`;

const copy = {
  it: {
    locale: "it-IT",
    newPizza: "Nuova pizza",
    planName: "Nome del piano",
    planValue: "La pizza del sabato",
    schedule: "Programma",
    today: "Oggi",
    pantry: "Dispensa",
    flourSearch: "Cerca farina",
    sos: "Pronto soccorso impasto",
    sosIssue: "Non sta crescendo",
    captions: {
      "01-home": ["Il tuo laboratorio della pizza", "Scegli lo stile e quando vuoi mangiare: al resto pensa PizzaLab"],
      "02-styles": ["13 stili, dosi già pronte", "Napoletana, teglia, focaccia barese, pinsa, Detroit e molti altri"],
      "03-fermentation": ["Dimmi quando si mangia", "Lievito, frigo e appretto calcolati sul tuo orario"],
      "04-baking": ["Prevedi la cottura", "Crosta, mollica e fondo in tempo reale per il tuo forno"],
      "05-summary": ["Tutto il piano in un colpo d’occhio", "Dosi, tabella di marcia e consigli prima di partire"],
      "06-today": ["Ti avvisa a ogni fase", "Sai sempre cosa fare adesso e cosa viene dopo"],
      "07-sos": ["SOS impasto, sempre a portata", "Tocchi il problema e trovi subito come rimediare"],
      "08-flours": ["Oltre 180 farine", "Forza W e proteine dalle schede dei produttori"],
    },
    feature: ["Il tuo laboratorio della pizza", "Dosi, lievitazione e cottura per la pizza fatta in casa, passo dopo passo."],
  },
  en: {
    locale: "en-US",
    newPizza: "New pizza",
    planName: "Plan name",
    planValue: "Saturday pizza",
    schedule: "Schedule",
    today: "Today",
    pantry: "Pantry",
    flourSearch: "Search flour",
    sos: "Dough first aid",
    sosIssue: "Not rising",
    captions: {
      "01-home": ["Your pizza laboratory", "Pick the style and when you want to eat: PizzaLab does the rest"],
      "02-styles": ["13 styles, amounts ready to go", "Neapolitan, pan, focaccia, pinsa, Detroit and many more"],
      "03-fermentation": ["Tell me when you eat", "Yeast, fridge and final proof worked out around your time"],
      "04-baking": ["Predict the bake", "Crust, crumb and base in real time for your oven"],
      "05-summary": ["The whole plan at a glance", "Amounts, schedule and tips before you start"],
      "06-today": ["A nudge at every step", "Always know what to do now and what comes next"],
      "07-sos": ["Dough SOS, always at hand", "Tap the problem and see how to fix it right away"],
      "08-flours": ["More than 180 flours", "W strength and protein from the millers’ data sheets"],
    },
    feature: ["Your pizza laboratory", "Amounts, fermentation and baking for homemade pizza, step by step."],
  },
};

async function appPage(lang, viewport, scale) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: scale,
    colorScheme: "light",
    locale: copy[lang].locale,
    isMobile: viewport.width < 600,
    hasTouch: viewport.width < 600,
  });
  await context.addInitScript(() => {
    localStorage.setItem("CapacitorStorage.pizzalab-tutorial-v1", "done");
    localStorage.setItem("pizzalab-adjustments-open", "0");
  });
  const page = await context.newPage();
  await page.goto(BASE);
  await page.addStyleTag({ content: ".toast{display:none!important} *{caret-color:transparent!important} .install-prompt{display:none!important}" });
  await page.locator(".today-hero").waitFor();
  await page.waitForTimeout(600);
  return { page, context };
}

const settle = (page) => page.waitForTimeout(500);
async function scrollTo(page, selector, offset = 0) {
  await page.evaluate(
    ([sel, off]) => {
      const el = document.querySelector(sel);
      if (!el) throw new Error(`Elemento non trovato: ${sel}`);
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - off, behavior: "instant" });
    },
    [selector, offset],
  );
  await settle(page);
}
async function step(page, index) {
  await page.locator(".planner-steps button").nth(index).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(page);
}
const nav = (page, name) => page.getByRole("navigation").getByRole("button", { name, exact: true }).first().click();

/** Percorso comune: home, stili, lievitazione, cottura, riepilogo, impasto in corso, SOS, farine. */
async function tour(lang, page, shot, { tablet = false } = {}) {
  const L = copy[lang];
  await shot("01-home");
  await nav(page, L.newPizza);
  await settle(page);
  await shot("02-styles");
  await step(page, 1);
  await shot("03-fermentation");
  await step(page, 2);
  await scrollTo(page, ".bake-prediction-window", tablet ? 90 : 70);
  await shot("04-baking");
  await step(page, 3);
  await shot("05-summary");
  await page.getByLabel(L.planName).fill(L.planValue);
  await page.getByRole("button", { name: L.schedule }).click();
  await settle(page);
  await nav(page, L.today);
  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(page);
  await shot("06-today");
  await page.getByRole("button", { name: L.sos }).first().click();
  await page.getByRole("dialog").getByRole("radio", { name: L.sosIssue }).click();
  await settle(page);
  await shot("07-sos");
  await page.keyboard.press("Escape");
  await nav(page, L.pantry);
  await page.getByRole("textbox", { name: L.flourSearch }).fill("Caputo");
  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(page);
  await shot("08-flours");
}

const fonts = `
  @font-face { font-family: Fraunces; src: url(${await dataUrl("node_modules/@fontsource-variable/fraunces/files/fraunces-latin-opsz-normal.woff2", "font/woff2")}) format("woff2"); font-weight: 100 900; }
  @font-face { font-family: Figtree; src: url(${await dataUrl("node_modules/@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2", "font/woff2")}) format("woff2"); font-weight: 300 900; }`;
const canvas = await browser.newPage({ deviceScaleFactor: 1 });
async function render(html, width, height, file) {
  await canvas.setViewportSize({ width, height });
  await canvas.setContent(`<html><head><style>${fonts} body{margin:0} .t{font-family:Fraunces,Georgia,serif} .s{font-family:Figtree,system-ui,sans-serif}</style></head><body>${html}</body></html>`, { waitUntil: "load" });
  await canvas.evaluate(() => document.fonts.ready);
  await canvas.screenshot({ path: file });
}
const fire = await dataUrl("src/assets/photos/hero-fire.webp", "image/webp");
const logo = await dataUrl("src/assets/pizzalab-logo.png", "image/png");

for (const lang of ["it", "en"]) {
  const L = copy[lang];

  // ---------- Telefono: 390×844 a 3x, incorniciato in 1080×1920 ----------
  const phone = await appPage(lang, { width: 390, height: 844 }, 3);
  await tour(lang, phone.page, async (name) => {
    await phone.page.screenshot({ path: path.join(RAW, `${lang}-${name}.png`) });
  });
  await phone.context.close();

  for (const [name, [title, subtitle]] of Object.entries(L.captions)) {
    const img = await dataUrl(path.join(RAW, `${lang}-${name}.png`), "image/png");
    const dark = name === "01-home" || name === "06-today";
    await render(
      `<div style="width:1080px;height:1920px;overflow:hidden;position:relative;background:${dark
        ? `#191512`
        : `radial-gradient(80% 45% at 90% 0%, #f6c7b3 0%, transparent 65%), #f5efe6`}">
        ${dark ? `<img src="${fire}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.28;filter:blur(18px)">` : ""}
        <div style="position:relative;padding:96px 84px 0;text-align:center">
          <div class="t" style="font-size:82px;line-height:1.04;font-weight:700;letter-spacing:-2px;color:${dark ? "#fff" : "#1d1813"};text-wrap:balance">${title}</div>
          <div class="s" style="margin-top:24px;font-size:38px;line-height:1.3;font-weight:500;color:${dark ? "#e7dccf" : "#574e44"};text-wrap:balance">${subtitle}</div>
        </div>
        <div style="position:absolute;left:50%;top:430px;transform:translateX(-50%);width:668px;padding:20px;border-radius:84px;background:#1d1813;
          box-shadow:0 60px 120px -30px rgba(60,25,8,.55)">
          <div style="border-radius:66px;overflow:hidden;background:#f5efe6"><img src="${img}" style="display:block;width:668px"></div>
        </div>
      </div>`,
      1080,
      1920,
      path.join(OUT, `phone-${lang}-${name}.png`),
    );
  }

  // ---------- Tablet: 1280×800 a 2x (2560×1600, 16:10) ----------
  const tablet = await appPage(lang, { width: 1280, height: 800 }, 2);
  const keep = new Set(["02-styles", "04-baking", "05-summary", "06-today", "08-flours"]);
  await tour(lang, tablet.page, async (name) => {
    if (keep.has(name)) await tablet.page.screenshot({ path: path.join(OUT, `tablet-${lang}-${name}.png`) });
  }, { tablet: true });
  await tablet.context.close();

  // ---------- Immagine in evidenza 1024×500 ----------
  const today = await dataUrl(path.join(RAW, `${lang}-06-today.png`), "image/png");
  const styles = await dataUrl(path.join(RAW, `${lang}-02-styles.png`), "image/png");
  await render(
    `<div style="width:1024px;height:500px;position:relative;overflow:hidden;background:#191512">
      <img src="${fire}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.75">
      <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(25,21,18,.92) 0%,rgba(25,21,18,.7) 45%,rgba(25,21,18,.1) 80%)"></div>
      <div style="position:absolute;left:60px;top:84px;width:480px;color:#fff">
        <div style="display:flex;align-items:center;gap:16px">
          <img src="${logo}" style="width:76px;height:76px;border-radius:22px;box-shadow:0 10px 30px rgba(0,0,0,.35)">
          <div class="t" style="font-size:54px;font-weight:700;letter-spacing:-1px">Pizza<span style="color:#ff8a5c">Lab</span></div>
        </div>
        <div class="t" style="margin-top:26px;font-size:44px;line-height:1.08;font-weight:700;letter-spacing:-1px">${L.feature[0]}</div>
        <div class="s" style="margin-top:14px;font-size:21px;line-height:1.4;font-weight:500;color:#e7dccf">${L.feature[1]}</div>
      </div>
      <div style="position:absolute;right:200px;top:58px;width:226px;padding:9px;border-radius:36px;background:#1d1813;transform:rotate(-6deg);box-shadow:0 30px 60px rgba(0,0,0,.5)">
        <img src="${styles}" style="display:block;width:208px;border-radius:28px">
      </div>
      <div style="position:absolute;right:12px;top:104px;width:226px;padding:9px;border-radius:36px;background:#1d1813;transform:rotate(5deg);box-shadow:0 30px 60px rgba(0,0,0,.5)">
        <img src="${today}" style="display:block;width:208px;border-radius:28px">
      </div>
    </div>`,
    1024,
    500,
    path.join(OUT, `feature-graphic-${lang}-1024x500.png`),
  );
}

// Icona 512×512 a tutta pagina (Google applica da sé gli angoli arrotondati)
const icon = await dataUrl("assets/branding/pizzalab-icon-v4.png", "image/png");
await render(
  `<div style="width:512px;height:512px;overflow:hidden;position:relative;background:#cd3b2a">
    <img src="${icon}" style="position:absolute;width:890px;height:890px;left:-189px;top:-189px">
  </div>`,
  512,
  512,
  path.join(OUT, "icon-512.png"),
);

await browser.close();
await writeFile(
  path.join(OUT, "README.md"),
  `# Grafiche Play Store

Generate con \`node scripts/store-assets.mjs\` (app avviata su http://127.0.0.1:5187).

- \`icon-512.png\` – icona dell’app (512×512)
- \`feature-graphic-{it,en}-1024x500.png\` – immagine in evidenza
- \`phone-{it,en}-*.png\` – screenshot telefono (1080×1920, 9:16)
- \`tablet-{it,en}-*.png\` – screenshot tablet (2560×1600, 16:10)
- \`raw/\` – catture originali dell’app
`,
);
console.log("Grafiche salvate in", OUT);
