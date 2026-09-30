import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

/** I nomi commerciali delle farine dei produttori restano in italiano: sono nomi di prodotto. */
const PRODUCT_NAMES = new Set((JSON.parse(readFileSync("src/data/flours.json", "utf8")) as { name: string }[]).map((flour) => flour.name));

test.use({ locale: "en-GB" });

/** Parole italiane che in un testo inglese non devono comparire (i nomi propri di marchi e prodotti restano). */
const ITALIAN = /\b(il|lo|gli|del|della|dei|delle|degli|che|una|più|nel|nella|sono|tra|dal|alla|sul|quando|dopo|prima|molto|tuo|tua|tuoi|questo|questa|anche|ancora|poi|ogni|già|crosta|mollica|fondo|elettric\w+|domestic\w+|ventilat\w+|legna|carbone|ripiano|pietra|acciaio|ghisa|temperatura|planetaria|spirale|gancio|velocità|minima|bassa|media|pausa|riposo|massa|coperta|maturazione|coltura|rinfresco|rinfreschi|madre|impasto|farina|farine|acqua|lievito|cottura|forno|teglia|teglie|panetto|panetti|puntata|appretto|frigo|sale|olio|scegli|aggiungi|salva|elimina|tocca|nessun|nessuna|diario|profilo|impara|condimenti|lievitazione|riepilogo|passaggio)\b|[àèìòù]/i;
const ALLOWED = /Lingua · Language|Italiano|Focaccia|Sfincione|Pinsa|Diavola|Margherita|Marinara|Napoli|Capricciosa|Boscaiola|Provola|Fior di latte|Semola rimacinata|Li\.Co\.Li\.|Licoli|Biga|Poolish|biscotto|Biscotto|Mulino Padano|Molino Vigevano|Farina generica|Caputo|Le 5 Stagioni|Molini Pivetti|Molino|Petra|Polselli|Divella|Garofalo|Barilla|Casillo|Dallagiovanna|Spadoni|Rossetto|Grassi|PizzaLab|Pala-style|Padellino|Ariete|Effeuno|G3 Ferrari|Ooni|Gozney|Kenwood|Bosch|Moulinex|KitchenAid|Bimby|Kamado|Manitoba|Tipo|Ortolana|Friarielli|Gorgonzola|Fontina|Parmigiana|Bufala/;

async function italianLines(page: Page) {
  const text = await page.evaluate(() => document.body.innerText);
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !PRODUCT_NAMES.has(line) && ITALIAN.test(line.replace(ALLOWED, "")));
}

async function visit(page: Page, name: string, found: Record<string, string[]>) {
  const lines = await italianLines(page);
  if (lines.length) found[name] = [...new Set(lines)];
}

test("english mode shows no Italian text across the app", async ({ page }) => {
  const found: Record<string, string[]> = {};
  await page.addInitScript(() => (localStorage.setItem("CapacitorStorage.pizzalab-tutorial-v1", "done"), localStorage.setItem("pizzalab-adjustments-open", "1")));
  await page.goto("/#nuova");
  await expect(page.getByRole("heading", { name: /What pizza shall we make/ })).toBeVisible();
  await visit(page, "home", found);

  for (const step of [/^2 Fermentation/, /^3 Baking/, /^4 Summary/, /^1 Dough/]) {
    await page.getByRole("button", { name: step }).click();
    await visit(page, `step ${step}`, found);
  }
  await page.getByRole("button", { name: /^2 Fermentation/ }).click();
  await page.getByRole("button", { name: "Manual", exact: true }).click();
  await visit(page, "fermentation manual", found);
  await page.getByRole("button", { name: /^3 Baking/ }).click();
  await visit(page, "baking", found);

  for (const tab of ["Today", "Pantry", "Toppings", "Yeast", "Diary", "Learn", "Profile"]) {
    await page.getByRole("button", { name: tab, exact: true }).first().click();
    await visit(page, `tab ${tab}`, found);
  }
  expect(found).toEqual({});
});

test("english mode also covers dialogs, pickers, the running plan and the tools", async ({ page }) => {
  test.setTimeout(60000);
  const found: Record<string, string[]> = {};
  await page.addInitScript(() => (localStorage.setItem("CapacitorStorage.pizzalab-tutorial-v1", "done"), localStorage.setItem("pizzalab-adjustments-open", "1")));
  await page.goto("/#nuova");
  await expect(page.getByRole("heading", { name: /What pizza shall we make/ })).toBeVisible();

  // Spiegazioni «?» e pannelli di scelta: ogni finestra si legge poi si chiude.
  await page.getByRole("button", { name: /^2 Fermentation/ }).click();
  for (const tip of await page.getByRole("button", { name: "What is it?" }).all()) {
    await tip.click();
    await visit(page, "help tip", found);
    await page.getByRole("button", { name: "Got it" }).click();
  }
  await page.getByRole("button", { name: /^3 Baking/ }).click();
  const pickers = page.locator(".select-field button");
  const count = await pickers.count();
  for (let index = 0; index < count; index++) {
    await pickers.nth(index).click();
    await visit(page, "picker", found);
    await page.getByRole("dialog").last().getByRole("button", { name: /^Close/ }).first().click();
  }

  // Un piano in corso: diario, bilancia e modalità guidata.
  await page.getByRole("button", { name: /^4 Summary/ }).click();
  await visit(page, "summary", found);
  await page.getByLabel("Plan name").fill("Saturday pizza");
  await page.getByRole("button", { name: "Schedule" }).click();
  await expect(page.getByText("DOUGH IN PROGRESS", { exact: true })).toBeVisible();
  await visit(page, "diary active", found);
  await page.getByRole("button", { name: /Weigh/ }).first().click();
  await visit(page, "scale mode", found);
  await page.getByRole("button", { name: "Close scale mode" }).click();
  await page.getByRole("button", { name: /Guide/ }).first().click();
  await visit(page, "guided mode", found);
  await page.getByRole("button", { name: "Close guided mode" }).click();

  // Condimenti, lievito, farine, profilo.
  await page.getByRole("button", { name: "Pantry", exact: true }).first().click();
  await page.getByRole("button", { name: "Toppings", exact: true }).first().click();
  await page.getByRole("button", { name: /Diavola/ }).click();
  await visit(page, "toppings", found);
  await page.getByRole("button", { name: "Pantry", exact: true }).first().click();
  await page.getByRole("button", { name: "Yeast", exact: true }).first().click();
  await page.getByLabel("What do you want to call it?").fill("Gino");
  await page.locator(".starter-kind-card").filter({ hasText: "Solid sourdough starter" }).getByRole("button", { name: "I already have one" }).click();
  await visit(page, "starter", found);
  await page.getByRole("button", { name: "Pantry", exact: true }).first().click();
  await page.getByRole("button", { name: "Flours", exact: true }).first().click();
  await page.getByRole("button", { name: "Add your own flour" }).click();
  await visit(page, "flour form", found);
  await page.getByRole("button", { name: "Profile", exact: true }).first().click();
  await visit(page, "profile", found);
  await page.getByRole("button", { name: "Add another pan" }).or(page.getByRole("button", { name: "Add a pan" })).first().click();
  await visit(page, "pan form", found);
  await page.getByRole("button", { name: "Add an oven" }).click({ timeout: 2000 }).catch(() => {});
  await visit(page, "oven form", found);
  expect(found).toEqual({});
});
