import { test, expect } from "@playwright/test";
test("calculate, save, annotate, persist and delete a recipe", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Progetta\. Impasta/ }),
  ).toBeVisible();
  await expect(page.getByText("Impasto totale", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "In teglia Da condividere" }).click();
  await page.getByLabel("Larghezza teglia", { exact: true }).fill("30");
  await page.getByLabel("Lunghezza teglia", { exact: true }).fill("40");
  await page.getByRole("button", { name: /Passa a lievitazione/ }).click();
  await expect(page.getByRole("button", { name: /^2 Lievitazione/ })).toHaveAttribute("aria-current", "step");
  await page.getByRole("button", { name: /Passa a cottura/ }).click();
  await page.getByLabel("Nome del piano").fill("Prova teglia");
  await page.getByRole("button", { name: "Salva il piano" }).click();
  await expect(
    page.getByRole("heading", { name: "Prova teglia", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Appunti per la prossima volta")
    .fill("Fondo croccante, ripetere.");
  await page.getByRole("button", { name: "4 stelle per Prova teglia" }).click();
  await page.getByText("Temperature reali e controllo scostamenti").click();
  await page.getByLabel("Punto di misura").selectOption("frigo");
  await page.getByLabel("Temperatura misurata").fill("8");
  await page.getByRole("button", { name: "Registra" }).click();
  await expect(page.getByText("Frigo più caldo del piano")).toBeVisible();
  await page.waitForFunction(() =>
    localStorage
      .getItem("CapacitorStorage.pizzalab-state-v1")
      ?.includes("Fondo croccante"),
  );
  await page.reload();
  await page.getByRole("button", { name: /Diario/ }).click();
  await expect(page.getByLabel("Appunti per la prossima volta")).toHaveValue(
    "Fondo croccante, ripetere.",
  );
  await page.getByText("Temperature reali e controllo scostamenti").click();
  await expect(page.getByText("8 °C", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Attiva piano e promemoria" }).click();
  await expect(page.getByRole("status")).toContainText("browser");
  await page.getByRole("button", { name: "Elimina Prova teglia" }).click();
  await page
    .getByRole("button", { name: "Elimina piano", exact: true })
    .click();
  await expect(page.getByText("La prima pagina è tutta tua.")).toBeVisible();
});
test("flour search, source details, custom flour and no overflow", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Farine", exact: true }).click();
  await page.getByRole("textbox", { name: "Cerca farina" }).fill("Garofalo");
  await expect(page.locator(".flour-row")).toHaveCount(5);
  await page.getByRole("button", { name: "W 260", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Apri la fonte ufficiale" }),
  ).toHaveAttribute("href", /pasta-garofalo/);
  await page.getByRole("button", { name: "La tua farina" }).click();
  await page
    .getByRole("textbox", { name: "Nome", exact: true })
    .fill("Farina di prova");
  await page
    .getByRole("textbox", { name: "Marchio", exact: true })
    .fill("Personale");
  await page.getByRole("button", { name: "Aggiungi al catalogo" }).click();
  await page
    .getByRole("textbox", { name: "Cerca farina" })
    .fill("Farina di prova");
  await expect(page.locator(".flour-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Usa", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "La tua farina", exact: true }),
  ).toContainText("Farina di prova");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/planner-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test("invalid fields block saving and hot/weak dough produces warnings", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^2 Lievitazione/ }).click();
  await page.getByLabel("Temperatura ambiente", { exact: true }).fill("30");
  await expect(
    page.getByText("In cucina fa caldo", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^1 Impasto/ }).click();
  await page.getByLabel("Peso del panetto", { exact: true }).fill("0");
  await page.getByLabel("Peso del panetto", { exact: true }).blur();
  await expect(page.getByText("Controlla questi valori")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Salva il piano" }),
  ).toHaveCount(0);
  await page.getByLabel("Peso del panetto", { exact: true }).fill("260");
  await page.getByRole("button", { name: /^2 Lievitazione/ }).click();
  await page.getByRole("button", { name: "Tutto fuori frigo" }).click();
  await expect(page.getByLabel("Riposo in frigo", { exact: true })).toHaveValue(
    "0",
  );
  await page.getByRole("button", { name: "Impara", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Mani in pasta, idee chiare." }),
  ).toBeVisible();
});
test("mixes three flours and shows hydration and yeast charts", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByText("Ingredienti e miscela fino a quattro farine").click();
  await page
    .getByRole("button", { name: "Seconda farina", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Cerca per seconda farina" })
    .fill("tipo 1");
  await page.getByRole("button", { name: /Farina generica Tipo 1/ }).click();
  await page.getByLabel("Quota seconda farina").fill("25");
  await page.getByRole("button", { name: "Terza farina", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Cerca per terza farina" })
    .fill("semola rimacinata");
  await page
    .getByRole("button", { name: /Farina generica Semola rimacinata/ })
    .click();
  await page.getByLabel("Quota terza farina").fill("20");
  await expect(page.locator(".w-average")).toContainText("W medio indicativo");
  await expect(page.locator(".flour-breakdown > div")).toHaveCount(3);
  await expect(page.locator(".hydration-chart")).toBeVisible();
  await page.getByRole("button", { name: /^2 Lievitazione/ }).click();
  await expect(page.locator(".yeast-chart")).toBeVisible();
  await page.getByRole("button", { name: /^1 Impasto/ }).click();
  await page.getByText("Ingredienti e miscela fino a quattro farine").click();
  await page.getByRole("button", { name: "Salva questa" }).click();
  await expect(page.getByText("Miscele salvate")).toBeVisible();
});
test("preferment, water temperature, manual yeast and oven profile work together", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Contemporanea" }).click();
  await page.getByRole("button", { name: "Poolish" }).click();
  await expect(page.getByText("al picco", { exact: true })).toBeVisible();
  await expect(page.getByText("Acqua consigliata")).toBeVisible();
  await page.getByRole("button", { name: /^2 Lievitazione/ }).click();
  await page.getByRole("button", { name: "Percentuale" }).click();
  await page.getByLabel("Lievito fresco sulla farina").fill("0.12");
  await page.getByRole("button", { name: /^3 Cottura/ }).click();
  await page.getByLabel("Tipo di forno").selectOption("portable-gas");
  await expect(page.getByLabel("Temperatura effettiva")).toHaveValue("500");
  await page.getByRole("button", { name: /^2 Lievitazione/ }).click();
  await page.getByRole("button", { name: "Comincio adesso" }).click();
  await expect(
    page.getByText("Impasta ora, prima infornata prevista"),
  ).toBeVisible();
  await page.getByRole("button", { name: /^1 Impasto/ }).click();
  await expect(page.getByText("Percorso di fermentazione")).toBeVisible();
});
test("temperature editing stays mounted and autolyse and mixer guidance are explicit", async ({
  page,
}) => {
  await page.goto("/");
  const flourTemp = page.getByLabel("Temperatura farina", { exact: true });
  await flourTemp.fill("");
  await expect(flourTemp).toBeVisible();
  await flourTemp.pressSequentially("18");
  await expect(page.getByText("Acqua consigliata")).toBeVisible();
  await page.getByRole("button", { name: /^2 Lievitazione/ }).click();
  const roomTemp = page.getByLabel("Temperatura ambiente", { exact: true });
  await roomTemp.fill("");
  await expect(roomTemp).toBeVisible();
  await roomTemp.pressSequentially("24");
  await expect(page.getByText("FARINA TOTALE")).toBeVisible();
  await page.getByRole("button", { name: /^1 Impasto/ }).click();
  await page.getByRole("button", { name: "Aggiungi autolisi" }).click();
  await expect(page.getByText("ACQUA DI RISERVA")).toBeVisible();
  await expect(
    page.getByText("Autolisi breve", { exact: true }).last(),
  ).toBeVisible();
  await page.getByLabel("Lavorazione").selectOption("stand");
  await page.getByLabel("La tua planetaria").selectOption("kitchenaid-tilt");
  await expect(page.getByText(/Velocità 2 · max 4–6 min/)).toBeVisible();
  await expect(page.getByText("FARINA TOTALE")).toBeVisible();
});
test("mobile workflow exposes starter, scale, guide, toppings, equipment and rescue tools", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^2 Lievitazione/ }).click();
  await page.locator(".temperature-fields select").selectOption("licoli");
  await expect(page.getByLabel("Licoli sulla farina")).toBeVisible();
  await expect(
    page.getByText(/Le quantità di farina e acqua da pesare/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Condimenti", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Condimenti classici" })).toBeVisible();
  await page
    .getByRole("button", { name: "Il tuo impasto", exact: true })
    .click();
  await page.getByRole("button", { name: /^1 Impasto/ }).click();
  await expect(
    page.getByRole("heading", { name: "La tua attrezzatura" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pesa" }).click();
  await expect(page.getByText("Modalità bilancia")).toBeVisible();
  await page.getByRole("button", { name: "Chiudi modalità bilancia" }).click();
  await page.getByRole("button", { name: "Guida" }).click();
  await expect(page.getByText("MODALITÀ GUIDATA")).toBeVisible();
  await expect(page.getByText("Come sta andando?")).toBeVisible();
  await page.getByRole("button", { name: "Chiudi modalità guidata" }).click();
  await page.getByRole("button", { name: "Impara", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Pronto soccorso impasto" }),
  ).toBeVisible();
});
test("searches generic flours and compensates an integer yeast dose", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "La tua farina", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Cerca per la tua farina" })
    .fill("semola rimacinata");
  await page
    .getByRole("button", { name: /Farina generica Semola rimacinata/ })
    .click();
  await expect(
    page.getByRole("button", { name: "La tua farina", exact: true }),
  ).toContainText("Semola rimacinata");
  await page.getByRole("button", { name: /^2 Lievitazione/ }).click();
  await page.getByRole("button", { name: "Grammi interi" }).click();
  await page.getByLabel("Lievito fresco da pesare").fill("2");
  await expect(page.getByText("STIMA AUTOMATICA")).toBeVisible();
  await expect(page.getByText(/userai 2 g/)).toBeVisible();
  await page.getByRole("button", { name: "Applica tempi compensati" }).click();
  await expect(
    page.getByText("Dose realmente pesabile", { exact: true }),
  ).toBeVisible();
});
test("predicts crust, crumb and base from the baking setup", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^3 Cottura/ }).click();
  await expect(
    page.getByRole("heading", { name: "Simulatore di cottura" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Risultato previsto" })).toBeVisible();
  const initialCrust = await page.locator(".prediction-result.crust small").textContent();
  await page.getByRole("button", { name: "Alto", exact: true }).click();
  await page.getByRole("button", { name: "Acciaio", exact: true }).click();
  await page.getByLabel("Tempo di cottura").fill("3");
  await expect(page.getByText(/3 min · 450 °C · ripiano alto/)).toBeVisible();
  await expect(page.locator(".prediction-result.crust small")).not.toHaveText(initialCrust ?? "");
  await expect(page.getByText(/Finestra consigliata/)).toBeVisible();
});
test("offers classic toppings and guides a starter to maturity", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Condimenti", exact: true }).click();
  await page.getByLabel("Cerca pizza o ingrediente").fill("diavola");
  await page.getByRole("button", { name: /Diavola/ }).click();
  await expect(page.getByText("Salame piccante", { exact: true })).toBeVisible();
  await page.getByLabel("Cerca pizza o ingrediente").fill("formaggi");
  await page.getByRole("button", { name: /4 formaggi/ }).click();
  await expect(page.getByText("Gorgonzola", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Lievito madre", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Coltiva il tuo lievito madre." })).toBeVisible();
  const liquidCard = page.locator(".starter-kind-card").filter({ hasText: "Li.Co.Li." });
  await liquidCard.getByRole("button", { name: "Ne ho già uno" }).click();
  await expect(page.getByText("Consolidamento", { exact: true }).first()).toBeVisible();
  await page.getByLabel("Ora preferita").fill("09:30");
  await page.getByRole("button", { name: /Attiva promemoria/ }).click();
  await expect(page.getByRole("status")).toContainText("Promemoria salvati");
  for (let index = 0; index < 3; index += 1)
    await page.getByRole("button", { name: /Rinfresco fatto/ }).click();
  await expect(page.getByText("Lievito maturo", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("3/3", { exact: true })).toBeVisible();
  await expect(page.getByText("Dove lo conservi?")).toBeVisible();
});
test("reserves enough room-temperature time for every fold and keeps toppings separate", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^2 Lievitazione/ }).click();
  await page.getByLabel("Puntata fuori frigo", { exact: true }).fill("1");
  await page.getByRole("button", { name: /^1 Impasto/ }).click();
  await page.getByLabel("Numero di pieghe").fill("3");
  await expect(page.getByText("Puntata minima: 1,5 ore")).toBeVisible();
  await expect(page.getByText(/minuti 30, 60, 90/)).toBeVisible();
  await page.getByRole("button", { name: /^2 Lievitazione/ }).click();
  const bulk = page.getByLabel("Puntata fuori frigo", { exact: true });
  await expect(bulk).toHaveValue("1.5");
  await bulk.fill("1");
  await bulk.blur();
  await expect(bulk).toHaveValue("1.5");
  await expect(page.getByText("Piega 3 di 3", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Condimenti", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Condimenti." }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Condimenti classici" })).toBeVisible();
});
