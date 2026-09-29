import { test, expect } from "@playwright/test";

/** Sceglie un’opzione dai pannelli di selezione dell’app (al posto delle tendine native). */
async function pick(
  page: import("@playwright/test").Page,
  trigger: import("@playwright/test").Locator,
  option: string | RegExp,
) {
  await trigger.click();
  await page.getByRole("dialog").last().getByRole("button", { name: option }).first().click();
}

/** Porta la cottura a tra 3 ore: l’inizio risulta passato e si parte subito spostando la cena. */
async function startNowFromSummary(page: import("@playwright/test").Page) {
  const soon = await page.evaluate(() => {
    const d = new Date(Date.now() + 3 * 3600000);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  await page.getByRole("button", { name: /^2 Lievitazione/ }).click();
  await page.getByLabel("Giorno e ora della prima infornata").fill(soon);
  await page.getByRole("button", { name: /^4 Riepilogo/ }).click();
  await page.getByRole("button", { name: "Parti adesso" }).click();
  await page.getByRole("button", { name: /Sposta la cena/ }).click();
}
test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.title.includes("tutorial")) return;
  await page.addInitScript(() =>
    localStorage.setItem("CapacitorStorage.pizzalab-tutorial-v1", "done"),
  );
});
test("first launch shows a short tutorial that can be skipped and replayed", async ({ page }) => {
  await page.goto("/");
  const dialog = page.getByRole("dialog", { name: "Il tuo laboratorio della pizza" });
  await expect(dialog).toBeVisible();
  await page.getByRole("button", { name: "Avanti" }).click();
  await expect(page.getByRole("heading", { name: "Scegli lo stile, poi 4 passaggi" })).toBeVisible();
  await page.getByRole("button", { name: "Salta" }).click();
  await expect(page.locator(".onboarding")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: /Progetta\. Impasta/ })).toBeVisible();
  await expect(page.locator(".onboarding")).toHaveCount(0);
  await page.getByRole("button", { name: "Impara", exact: true }).click();
  await page.getByRole("button", { name: "Rivedi il tutorial" }).click();
  await expect(page.getByText("1 di 4")).toBeVisible();
});
test("calculate, save, annotate, persist and delete a recipe", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Progetta\. Impasta/ }),
  ).toBeVisible();
  await expect(page.getByLabel("Dosi rapide")).toBeVisible();
  await expect(page.getByText("Impasto totale", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "In teglia Da condividere" }).click();
  await page.getByLabel("Larghezza teglia", { exact: true }).fill("30");
  await page.getByLabel("Lunghezza teglia", { exact: true }).fill("40");
  await page.getByRole("button", { name: /Passa a lievitazione/ }).click();
  await expect(page.getByRole("button", { name: /^2 Lievitazione/ })).toHaveAttribute("aria-current", "step");
  await page.getByRole("button", { name: /Passa a cottura/ }).click();
  await page.getByRole("button", { name: /Passaggio 4 di 4/ }).click();
  await expect(page.getByRole("button", { name: /^4 Riepilogo/ })).toHaveAttribute("aria-current", "step");
  await expect(page.getByRole("heading", { name: "Tabella di marcia" })).toBeVisible();
  await expect(page.getByText("Impasto totale", { exact: true })).toBeVisible();
  await page.getByLabel("Nome del piano").fill("Prova teglia");
  await page.getByRole("button", { name: "Salva per dopo" }).click();
  await expect(
    page.getByRole("heading", { name: "Prova teglia", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: /Salvate/ })).toHaveAttribute("aria-selected", "true");
  // Una pizza per un giorno futuro si programma: partirà da sola all’orario impostato.
  await expect(page.getByRole("button", { name: "Inizia ora" })).toHaveCount(0);
  await page.getByRole("button", { name: "Programma" }).click();
  await expect(page.getByRole("status")).toContainText("Programmata");
  await expect(page.getByRole("tab", { name: /In corso/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText(/^Programmata · parte/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Pizza sfornata/ })).toHaveCount(0);
  await page.getByRole("button", { name: /Annulla la programmazione/ }).click();
  await expect(page.getByRole("tab", { name: /Salvate/ })).toHaveAttribute("aria-selected", "true");
  // Cambio idea: la faccio subito. L’inizio risulta passato e sposto la cena.
  await page.getByRole("button", { name: "Modifica" }).click();
  await startNowFromSummary(page);
  await expect(page.getByRole("tab", { name: /In corso/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Prova teglia", exact: true })).toBeVisible();
  await page.getByText("Temperature reali e controllo scostamenti").click();
  await pick(page, page.getByLabel("Punto di misura"), /^Frigo/);
  await page.getByLabel("Temperatura misurata").fill("8");
  await page.getByRole("button", { name: "Registra" }).click();
  await expect(page.getByText("Frigo più caldo del piano")).toBeVisible();
  await page.getByRole("button", { name: /Pizza sfornata/ }).click();
  await expect(page.getByRole("tab", { name: /Passate/ })).toHaveAttribute("aria-selected", "true");
  await page
    .getByLabel("Appunti per la prossima volta")
    .fill("Fondo croccante, ripetere.");
  await page.getByRole("button", { name: "4 stelle per Prova teglia" }).click();
  await page.waitForFunction(() =>
    localStorage
      .getItem("CapacitorStorage.pizzalab-state-v1")
      ?.includes("Fondo croccante"),
  );
  await page.reload();
  await page.getByRole("button", { name: /Diario/ }).click();
  await expect(page.getByRole("tab", { name: /Passate/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Appunti per la prossima volta")).toHaveValue(
    "Fondo croccante, ripetere.",
  );
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
    page.getByRole("button", { name: "Salva per dopo" }),
  ).toHaveCount(0);
  await page.getByLabel("Peso del panetto", { exact: true }).fill("260");
  await page.getByRole("button", { name: /^2 Lievitazione/ }).click();
  await page.getByRole("button", { name: "Tutto fuori frigo" }).click();
  await expect(page.getByLabel("Riposo in frigo", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Impara", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Mani in pasta, idee chiare." }),
  ).toBeVisible();
});
test("mixes three flours and shows hydration and yeast charts", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Seconda farina", exact: true })).toBeHidden();
  await page.getByText("Miscela di farine", { exact: true }).click();
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
  await expect(page.locator(".hydration-chart")).toBeVisible();
  await page.getByRole("button", { name: /^4 Riepilogo/ }).click();
  await expect(page.locator(".w-average")).toContainText("W medio indicativo");
  await expect(page.locator(".flour-breakdown > div")).toHaveCount(3);
  await page.getByRole("button", { name: /^2 Lievitazione/ }).click();
  await expect(page.locator(".yeast-chart")).toBeVisible();
  await page.getByRole("button", { name: /^1 Impasto/ }).click();
  await page.getByText("Miscela di farine", { exact: true }).click();
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
  await pick(page, page.getByLabel("Tipo di forno"), /^Forno pizza portatile a gas/);
  await expect(page.getByLabel("Temperatura effettiva")).toHaveValue("500");
  await page.getByRole("button", { name: /^2 Lievitazione/ }).click();
  await page.getByRole("button", { name: /Manuale/ }).click();
  await expect(page.getByLabel("Giorno e ora della prima infornata")).toBeVisible();
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
  await expect(roomTemp).toHaveValue("24");
  await page.getByRole("button", { name: /^1 Impasto/ }).click();
  await page.getByRole("button", { name: "Aggiungi autolisi" }).click();
  await expect(page.getByText("ACQUA DI RISERVA")).toBeVisible();
  await expect(
    page.getByText("Autolisi breve", { exact: true }).last(),
  ).toBeVisible();
  await pick(page, page.getByLabel("Lavorazione"), /^Planetaria/);
  await pick(page, page.getByLabel("La tua planetaria"), /^KitchenAid/);
  await expect(page.getByText(/Velocità 2 · max 4–6 min/)).toBeVisible();
  await page.getByRole("button", { name: /^4 Riepilogo/ }).click();
  await expect(page.getByText("FARINA TOTALE")).toBeVisible();
});
test("mobile workflow exposes starter, scale, guide, toppings, equipment and rescue tools", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^2 Lievitazione/ }).click();
  await pick(page, page.getByRole("button", { name: /^Lievito (Di birra|Secco|Pasta|Licoli)/ }), /^Licoli/);
  await expect(page.getByLabel("Licoli sulla farina")).toBeVisible();
  await page.getByRole("button", { name: /^4 Riepilogo/ }).click();
  await expect(
    page.getByText(/Le quantità di farina e acqua da pesare/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Condimenti", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Condimenti classici" })).toBeVisible();
  await page
    .getByRole("button", { name: "Il tuo impasto", exact: true })
    .click();
  await page.getByRole("button", { name: /^1 Impasto/ }).click();
  await page.getByRole("button", { name: "Profilo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Le tue teglie" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "La tua attrezzatura" })).toHaveCount(0);
  await page.getByRole("button", { name: "Il tuo impasto", exact: true }).click();
  await startNowFromSummary(page);
  await page.getByRole("button", { name: "Pesa" }).click();
  await expect(page.getByText("Modalità bilancia")).toBeVisible();
  await page.getByRole("button", { name: "Chiudi modalità bilancia" }).click();
  await page.getByRole("button", { name: "Guida" }).click();
  await expect(page.getByText("MODALITÀ MANI IN PASTA")).toBeVisible();
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
  // Il cursore si concentra sulla finestra utile invece di arrivare sempre a 10 minuti.
  const sliderMax = Number(await page.getByRole("slider", { name: "Tempo di cottura: cursore" }).getAttribute("max"));
  expect(sliderMax).toBeGreaterThanOrEqual(4);
  expect(sliderMax).toBeLessThan(10);
  // Il forno elettrico per pizza ha la pietra fissa: niente scelta dell’altezza.
  await expect(page.getByRole("group", { name: "Altezza nel forno" })).toHaveCount(0);
  await expect(page.getByText(/la pietra è a un’altezza fissa/)).toBeVisible();
  await pick(page, page.getByLabel("Tipo di forno"), /^Domestico statico/);
  await expect(page.getByRole("group", { name: "Altezza nel forno" })).toBeVisible();
  const initialCrust = await page.locator(".prediction-result.crust small").textContent();
  await page.getByRole("button", { name: "Alto", exact: true }).click();
  await page.getByRole("button", { name: "Acciaio", exact: true }).click();
  await page.getByLabel("Tempo di cottura", { exact: true }).fill("3");
  await expect(page.getByText(/3 min · 250 °C · ripiano alto/)).toBeVisible();
  await expect(page.locator(".prediction-result.crust small")).not.toHaveText(initialCrust ?? "");
  await expect(page.getByText(/Finestra consigliata/)).toBeVisible();
});
test("offers classic toppings and guides a starter to maturity", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Condimenti", exact: true }).click();
  await expect(page.getByLabel("Diametro")).toHaveValue("32");
  await expect(page.locator(".topping-area")).toContainText("3217 cm²");
  await page.getByLabel("Cerca pizza o ingrediente").fill("diavola");
  await page.getByRole("button", { name: /Diavola/ }).click();
  await expect(page.locator(".topping-ingredients").getByText("Salame piccante", { exact: true })).toBeVisible();
  await page.getByLabel("Cerca pizza o ingrediente").fill("formaggi");
  await page.getByRole("button", { name: /4 formaggi/ }).click();
  await expect(page.locator(".topping-ingredients").getByText("Gorgonzola", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Lievito", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Coltiva il tuo lievito madre." })).toBeVisible();
  const liquidCard = page.locator(".starter-kind-card").filter({ hasText: "Li.Co.Li." });
  await liquidCard.getByRole("button", { name: "Ne ho già uno" }).click();
  await expect(page.getByText("Consolidamento", { exact: true }).first()).toBeVisible();
  await page.getByLabel("Ora preferita").fill("09:30");
  // Nel browser i rinfreschi vanno nel Calendario del telefono.
  const feeds = page.waitForEvent("download");
  await page.getByRole("button", { name: /Aggiungi i rinfreschi al calendario/ }).click();
  expect((await feeds).suggestedFilename()).toMatch(/^pizzalab-lievito-.*\.ics$/);
  await expect(page.getByRole("status")).toContainText("rinfreschi pronti");
  for (let index = 0; index < 3; index += 1)
    await page.getByRole("button", { name: /Rinfresco fatto/ }).click();
  await expect(page.getByText("Lievito maturo", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("3/3", { exact: true })).toBeVisible();
  await expect(page.getByText("Dove lo conservi?")).toBeVisible();
});
test("scales toppings from round and tray dimensions", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Condimenti", exact: true }).click();
  const tomato = page.locator(".topping-ingredients > div").filter({ hasText: "Pomodoro" });
  await expect(tomato).toContainText("300 g");
  await page.getByLabel("Diametro").fill("40");
  await expect(tomato).toContainText("469 g");

  await page.getByRole("button", { name: "Il tuo impasto", exact: true }).click();
  await page.getByRole("button", { name: "In teglia Da condividere" }).click();
  await page.getByRole("button", { name: "Condimenti", exact: true }).click();
  await expect(page.getByLabel("Larghezza")).toHaveValue("30");
  await expect(page.getByLabel("Lunghezza")).toHaveValue("40");
  await page.getByRole("button", { name: "Riduci numero di teglie" }).click();
  await page.getByRole("button", { name: "Riduci numero di teglie" }).click();
  await expect(page.locator(".topping-area")).toContainText("2400 cm²");
  await expect(page.locator(".topping-ingredients > div").filter({ hasText: "Pomodoro" })).toContainText("225 g");
});
test("selects gluten-free mixes and manages multiple named starters", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Farine", exact: true }).click();
  await page.getByLabel("Senza glutine", { exact: true }).check();
  await expect(page.getByText("Mix universale per pizza", { exact: true })).toBeVisible();
  await expect(page.getByText("Farina di riso", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Il tuo impasto", exact: true }).click();
  await page.getByRole("button", { name: "La tua farina", exact: true }).click();
  await page.getByRole("textbox", { name: "Cerca per la tua farina" }).fill("mix universale");
  await page.getByRole("button", { name: /Mix universale per pizza/ }).click();
  await expect(page.getByText("Impasto senza glutine: usa la confezione come riferimento")).toBeVisible();

  await page.getByRole("button", { name: "Lievito", exact: true }).click();
  await page.getByLabel("Come vuoi chiamarlo?").fill("Gino");
  await page.locator(".starter-kind-card").filter({ hasText: "Pasta madre solida" }).getByRole("button", { name: "Ne ho già uno" }).click();
  await expect(page.getByRole("heading", { name: "Gino" })).toBeVisible();
  await page.getByRole("button", { name: /Nuovo lievito/ }).click();
  await page.getByLabel("Come vuoi chiamarlo?").fill("Luna");
  await page.locator(".starter-kind-card").filter({ hasText: "Li.Co.Li." }).getByRole("button", { name: "Inizia da zero" }).click();
  await expect(page.getByRole("heading", { name: "Luna" })).toBeVisible();
  await page.getByRole("button", { name: /Gino Pasta madre solida/ }).click();
  await page.getByRole("button", { name: "Elimina questo lievito" }).click();
  await page.getByRole("button", { name: "Elimina definitivamente" }).click();
  await expect(page.getByRole("heading", { name: "Luna" })).toBeVisible();
  await expect(page.getByText("1 coltura", { exact: true })).toBeVisible();
});
test("reserves enough room-temperature time for every fold and keeps toppings separate", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^2 Lievitazione/ }).click();
  await page.getByLabel("Puntata fuori frigo", { exact: true }).fill("1");
  await page.getByRole("button", { name: /^1 Impasto/ }).click();
  await page.getByLabel("Numero di pieghe").fill("3");
  await expect(page.getByText("Puntata minima: 1 h 30 min")).toBeVisible();
  await expect(page.getByText(/minuti 30, 60, 90/)).toBeVisible();
  await page.getByRole("button", { name: /^2 Lievitazione/ }).click();
  const bulk = page.getByLabel("Puntata fuori frigo", { exact: true });
  await expect(bulk).toHaveValue("1.5");
  await bulk.fill("1");
  await bulk.blur();
  await expect(bulk).toHaveValue("1.5");
  await page.getByRole("button", { name: /^4 Riepilogo/ }).click();
  await expect(page.getByText("Piega 3 di 3", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Condimenti", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Condimenti." }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Condimenti classici" })).toBeVisible();
});

test("automatic planning derives phases and yeast from start and meal time", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^2 Lievitazione/ }).click();
  await page.getByRole("button", { name: /Automatica/ }).click();
  await page.getByLabel("Voglio iniziare").fill("2026-11-13T19:40");
  await page.getByLabel("Voglio mangiare").fill("2026-11-14T20:00");
  await expect(page.getByText("LIEVITO CALCOLATO", { exact: true })).toBeVisible();
  await expect(page.getByText("Dose sincronizzata con gli orari", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Puntata fuori frigo: cursore")).toHaveCount(0);
  await expect(page.locator(".automatic-phase-grid .cold strong")).not.toHaveText("0 h");
  await page.screenshot({ path: `test-results/automatic-plan-${test.info().project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: /Manuale/ }).click();
  await expect(page.getByLabel("Puntata fuori frigo: cursore")).toBeVisible();
});

test("opening sourdough care does not focus the name field", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Lievito", exact: true }).click();
  await expect(page.getByLabel("Come vuoi chiamarlo?")).not.toBeFocused();
});

test("stays responsive across small phones, large phones and tablets", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "One viewport matrix is sufficient");
  const viewports = [
    { width: 320, height: 700 },
    { width: 344, height: 882 },
    { width: 360, height: 780 },
    { width: 430, height: 900 },
    { width: 640, height: 900 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
  ];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    for (const section of ["Farine", "Condimenti", "Lievito", "Diario", "Impara", "Profilo"]) {
      await page.getByRole("button", { name: section, exact: true }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if (section === "Condimenti" && [320, 768].includes(viewport.width))
        await page.screenshot({ path: `test-results/responsive-condimenti-${viewport.width}.png`, fullPage: true });
      if (viewport.width === 344 && ["Farine", "Diario", "Impara"].includes(section))
        await page.screenshot({ path: `test-results/fold-cover-${section.toLowerCase()}.png` });
    }
    if (viewport.width === 344) {
      await page.getByRole("button", { name: "Il tuo impasto", exact: true }).click();
      await page.getByRole("button", { name: /^2 Lievitazione/ }).click();
      const sliderBox = await page.getByLabel("Puntata fuori frigo: cursore").boundingBox();
      expect(sliderBox).not.toBeNull();
      expect(sliderBox!.width).toBeGreaterThan(230);
      expect(sliderBox!.height).toBeGreaterThanOrEqual(66);
      await page.screenshot({ path: "test-results/fold-cover-lievitazione.png", fullPage: true });
    }
    const navBox = await page.locator(".app-nav").boundingBox();
    expect(navBox).not.toBeNull();
    expect(navBox!.x).toBeGreaterThanOrEqual(0);
    expect(navBox!.x + navBox!.width).toBeLessThanOrEqual(viewport.width + 1);
  }
});

test("links a named starter, toppings, shopping, live checks and oven calibration", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Lievito", exact: true }).click();
  await page.getByLabel("Come vuoi chiamarlo?").fill("Levain sabato");
  await page.locator(".starter-kind-card").filter({ hasText: "Li.Co.Li." }).getByRole("button", { name: "Ne ho già uno" }).click();

  await page.getByRole("button", { name: "Il tuo impasto", exact: true }).click();
  await page.getByRole("button", { name: /^2 Lievitazione/ }).click();
  await pick(page, page.getByRole("button", { name: /^Lievito (Di birra|Secco|Pasta|Licoli)/ }), /^Licoli/);
  await page.locator(".starter-link-options").getByRole("button", { name: /Levain sabato/ }).click();
  await expect(page.getByText("Rinfresco preparatorio", { exact: true })).toBeVisible();
  await expect(page.getByText("Rinfresca indicativamente", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Condimenti", exact: true }).click();
  await page.getByRole("button", { name: /Bufala/ }).click();
  await page.getByText("Lista della spesa completa", { exact: true }).click();
  await expect(page.getByText("Impasto + Bufala", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copia lista" })).toBeVisible();

  await page.getByRole("button", { name: "Il tuo impasto", exact: true }).click();
  await page.getByRole("button", { name: /^3 Cottura/ }).click();
  await expect(page.locator(".bake-topping-impact")).toContainText("82% umidità");
  await page.getByRole("button", { name: /Passaggio 4 di 4/ }).click();
  await page.getByLabel("Nome del piano").fill("Impasto controllato");
  await startNowFromSummary(page);
  await expect(page.getByText("IMPASTO IN CORSO", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Controlli impasto attivo")).toBeVisible();
  await page.getByLabel("Crescita osservata", { exact: true }).fill("2.4");
  await expect(page.getByText("Sta correndo", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Applica la correzione ai tempi" }).click();
  await expect(page.getByRole("status")).toContainText("Tempi dell’impasto attivo aggiornati");

  await page.getByRole("button", { name: "Guida" }).click();
  await expect(page.getByText("MODALITÀ MANI IN PASTA", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Tieni acceso lo schermo" }).click();
  await expect(page.getByRole("button", { name: "Schermo sempre acceso" })).toBeVisible();
  await page.screenshot({ path: `test-results/hands-free-${test.info().project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "Chiudi modalità guidata" }).click();

  await page.getByRole("button", { name: /Pizza sfornata/ }).click();
  const calibration = page.locator(".oven-calibration");
  await calibration.getByLabel("Tempo realmente usato").fill("3");
  await calibration.getByRole("button", { name: "Umida", exact: true }).click();
  await calibration.getByRole("button", { name: "Salva risultato reale" }).click();
  await expect(page.getByRole("status")).toContainText("Taratura salvata");
  await page.getByRole("button", { name: "Il tuo impasto", exact: true }).click();
  await page.getByRole("button", { name: /^3 Cottura/ }).click();
  await expect(page.locator(".bake-calibration").getByText("Correzione personale", { exact: false })).toBeVisible();
  await page.screenshot({ path: `test-results/active-diary-${test.info().project.name}.png`, fullPage: true });
});

test("profile keeps the name, saved ovens and settings in one place", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Profilo", exact: true }).click();
  await page.getByLabel("Come ti chiami?").fill("Paolo");
  await expect(page.getByRole("heading", { name: "Ciao, Paolo." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Le tue statistiche" })).toBeVisible();
  await pick(page, page.getByLabel("Modello o tipo di forno"), /^Ariete 909/);
  await expect(page.getByLabel("Temperatura massima reale")).toHaveValue("400");
  const ovens = page.locator(".user-ovens");
  await ovens.getByLabel("Nome", { exact: true }).fill("Fornetto di casa");
  await ovens.getByRole("button", { name: "Salva il forno" }).click();
  await ovens.getByRole("button", { name: "Usa", exact: true }).click();
  await expect(ovens.getByText("In uso")).toBeVisible();
  await page.getByRole("button", { name: "Il tuo impasto", exact: true }).click();
  await page.getByRole("button", { name: /^3 Cottura/ }).click();
  await expect(page.getByLabel("Tipo di forno")).toContainText("Ariete 909");
  await expect(page.getByRole("button", { name: "Fornetto di casa" })).toBeVisible();
  await expect(page.getByText(/la pietra è a un’altezza fissa/)).toBeVisible();
  await page.getByRole("button", { name: "Profilo", exact: true }).click();
  await expect(page.getByRole("button", { name: /Esporta il diario/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Rivedi il tutorial" })).toBeVisible();
});

test("profile stores several pans and the kneading tool without repeating the oven", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Profilo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "La tua attrezzatura" })).toHaveCount(0);
  const pans = page.locator(".user-pans");
  await pans.getByRole("button", { name: "Aggiungi una teglia" }).click();
  await pans.getByLabel("Nome").fill("Teglia romana");
  await pans.getByLabel("Larghezza interna").fill("30");
  await pans.getByLabel("Lunghezza interna").fill("40");
  await pans.getByRole("button", { name: "Salva la teglia" }).click();
  await pans.getByRole("button", { name: "Aggiungi un’altra teglia" }).click();
  await pans.getByLabel("Nome").fill("Teglia Detroit");
  await pans.getByLabel("Larghezza interna").fill("25");
  await pans.getByLabel("Lunghezza interna").fill("35");
  await pick(page, pans.getByLabel("Materiale"), /^Ghisa/);
  await pans.getByRole("button", { name: "Salva la teglia" }).click();
  await expect(pans.locator(".oven-list article")).toHaveCount(2);
  await pick(page, page.locator(".kneading-panel").getByLabel("Lavorazione"), /^Planetaria/);
  await pick(page, page.locator(".kneading-panel").getByLabel("La tua planetaria"), /^KitchenAid/);

  await page.getByRole("button", { name: "Il tuo impasto", exact: true }).click();
  await expect(page.getByLabel("Lavorazione")).toContainText("Planetaria");
  await page.getByRole("button", { name: "In teglia Da condividere" }).click();
  await page.getByRole("button", { name: /Teglia Detroit · 25×35/ }).click();
  await expect(page.getByLabel("Larghezza teglia", { exact: true })).toHaveValue("25");
  await expect(page.getByLabel("Lunghezza teglia", { exact: true })).toHaveValue("35");
  await page.getByRole("button", { name: /Teglia romana · 30×40/ }).click();
  await expect(page.getByLabel("Larghezza teglia", { exact: true })).toHaveValue("30");
  // Le teglie salvate si scelgono anche come supporto di cottura.
  await page.getByRole("button", { name: /^3 Cottura/ }).click();
  const support = page.getByRole("group", { name: "Le tue teglie" });
  await support.getByRole("button", { name: /Teglia Detroit/ }).click();
  await expect(support.getByRole("button", { name: /Teglia Detroit/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Ghisa", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /^1 Impasto/ }).click();
  await expect(page.getByLabel("Larghezza teglia", { exact: true })).toHaveValue("25");
});

test("a late start can keep dinner time by recalculating yeast and rise", async ({ page }) => {
  await page.goto("/");
  const soon = await page.evaluate(() => {
    const d = new Date(Date.now() + 5 * 3600000);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  await page.getByRole("button", { name: /^2 Lievitazione/ }).click();
  await page.getByLabel("Giorno e ora della prima infornata").fill(soon);
  await page.getByRole("button", { name: /^4 Riepilogo/ }).click();
  await expect(page.getByText(/L’orario di inizio è già passato/)).toBeVisible();
  await page.getByRole("button", { name: "Parti adesso" }).click();
  const dialog = page.getByRole("dialog", { name: "Parti in ritardo?" });
  await expect(dialog.getByText(/Lievitazione da 24 h a/)).toBeVisible();
  await dialog.getByRole("button", { name: /Mangio comunque/ }).click();
  await expect(page.getByText("IMPASTO IN CORSO", { exact: true })).toBeVisible();
  await expect(page.locator(".journal-card .eyebrow").first()).toHaveText("In corso");
  await expect(page.getByRole("button", { name: /Pizza sfornata/ })).toBeVisible();
});

test("pan styles work with round pans and focaccia barese starts in a round pan", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "In teglia Da condividere" }).click();
  await page.getByRole("button", { name: "Tonda", exact: true }).click();
  await expect(page.getByLabel("Larghezza teglia", { exact: true })).toHaveCount(0);
  await page.getByLabel("Diametro teglia").fill("28");
  await page.getByRole("button", { name: "Condimenti", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Quanto misura ogni teglia?" })).toBeVisible();
  await expect(page.getByLabel("Diametro teglia")).toHaveValue("28");
  await expect(page.locator(".topping-area")).toContainText("2463 cm²");

  await page.getByRole("button", { name: "Il tuo impasto", exact: true }).click();
  await page.getByRole("button", { name: /Focaccia barese/ }).click();
  await expect(page.getByRole("button", { name: "Tonda", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Diametro teglia")).toHaveValue("28");
  await page.getByRole("button", { name: "Condimenti", exact: true }).click();
  await expect(page.locator(".selected-topping-heading")).toContainText("Focaccia barese");
  await expect(page.locator(".topping-ingredients")).toContainText("Pomodorini");

  await page.getByRole("button", { name: "Profilo", exact: true }).click();
  const pans = page.locator(".user-pans");
  await pans.getByRole("button", { name: "Aggiungi una teglia" }).click();
  await pans.getByRole("button", { name: "Tonda", exact: true }).click();
  await pans.getByLabel("Diametro interno").fill("32");
  await pans.getByRole("button", { name: "Salva la teglia" }).click();
  await expect(pans.getByText("Tonda · Ø 32 cm")).toBeVisible();
  await page.getByRole("button", { name: "Il tuo impasto", exact: true }).click();
  await page.getByRole("button", { name: /Teglia tonda Ø 32 · Ø 32 cm/ }).click();
  await expect(page.getByLabel("Diametro teglia")).toHaveValue("32");
});

test("in the browser the phases go to the phone calendar with an alarm", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^4 Riepilogo/ }).click();
  await page.getByLabel("Nome del piano").fill("Pizza del venerdì");
  await page.getByRole("button", { name: "Programma" }).click();
  await expect(page.getByText("Avvisi a ogni fase")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Aggiungi al calendario/ }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("pizzalab-pizza-del-venerdi.ics");
  const ics = await (await import("node:fs/promises")).readFile(await file.path(), "utf8");
  expect(ics).toContain("BEGIN:VEVENT");
  expect(ics).toContain("SUMMARY:PizzaLab · Impasta e sviluppa la struttura");
  expect(ics).toContain("BEGIN:VALARM");
  await expect(page.getByRole("status")).toContainText("Aggiungi tutti");
});

test("on iPhone the web app explains how to add it to the home screen", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    hasTouch: true,
    isMobile: true,
  });
  await context.addInitScript(() => localStorage.setItem("CapacitorStorage.pizzalab-tutorial-v1", "done"));
  const page = await context.newPage();
  await page.goto("/");
  const prompt = page.getByRole("region", { name: "Installa PizzaLab sul telefono" });
  await expect(prompt).toBeVisible();
  await expect(prompt).toContainText("Aggiungi alla schermata Home");
  await prompt.getByRole("button", { name: /più tardi/ }).click();
  await expect(prompt).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: /Progetta\. Impasta/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Installa PizzaLab sul telefono" })).toHaveCount(0);
  await page.getByRole("button", { name: "Profilo", exact: true }).click();
  await expect(page.getByRole("region", { name: "Installa PizzaLab sul telefono" })).toBeVisible();
  await context.close();
});

test("units can be switched to ounces and Fahrenheit without changing the saved recipe", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^1 Impasto/ }).click();
  const ball = page.getByLabel("Peso del panetto", { exact: true });
  await ball.fill("300");
  await expect(page.getByLabel("Peso del panetto", { exact: true })).toHaveValue("300");

  await page.getByRole("button", { name: "Profilo", exact: true }).click();
  await page.getByRole("radio", { name: "Once (oz)" }).click();
  await page.getByRole("radio", { name: "Fahrenheit (°F)" }).click();
  await expect(page.getByRole("radio", { name: "Once (oz)" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("radio", { name: "Fahrenheit (°F)" })).toHaveAttribute("aria-checked", "true");

  // Il campo mostra 300 g come once e accetta once: 9 oz = 255,15 g.
  await page.getByRole("button", { name: "Il tuo impasto", exact: true }).click();
  await page.getByRole("button", { name: /^1 Impasto/ }).click();
  await expect(ball).toHaveValue("10.58");
  await ball.fill("9");
  await expect(ball).toHaveValue("9");
  await page.getByRole("button", { name: /^4 Riepilogo/ }).click();
  await expect(page.getByText(/da 9 oz/).first()).toBeVisible();
  // Acqua e sale in once; il lievito, sotto i 5 g, resta in grammi perché in once sarebbe illeggibile.
  await expect(page.locator(".ingredients").first()).toContainText(/Acqua totale[\d,]+ oz/);
  await expect(page.locator(".ingredients").first()).toContainText(/Lievito fresco[\d,]+ g/);

  // Temperatura: 77 °F sono esattamente 25 °C, e il piano lo scrive in °F.
  await page.getByRole("button", { name: /^2 Lievitazione/ }).click();
  const room = page.getByLabel("Temperatura ambiente", { exact: true });
  await room.fill("77");
  await expect(room).toHaveValue("77");
  await page.getByRole("button", { name: /^4 Riepilogo/ }).click();
  await expect(page.getByText(/a 77 °F/).first()).toBeVisible();
  await expect(page.getByText(/°C/)).toHaveCount(0);

  // Le unità restano dopo aver riaperto l’app, e i dati salvati sono ancora in g e °C.
  await page.reload();
  await page.getByRole("button", { name: /^1 Impasto/ }).click();
  await expect(page.getByLabel("Peso del panetto", { exact: true })).toHaveValue("9");
  await page.getByRole("button", { name: "Profilo", exact: true }).click();
  await page.getByRole("radio", { name: "Grammi (g)" }).click();
  await page.getByRole("radio", { name: "Celsius (°C)" }).click();
  await page.getByRole("button", { name: "Il tuo impasto", exact: true }).click();
  await page.getByRole("button", { name: /^1 Impasto/ }).click();
  await expect(page.getByLabel("Peso del panetto", { exact: true })).toHaveValue("255.15");
  await page.getByRole("button", { name: /^2 Lievitazione/ }).click();
  await expect(page.getByLabel("Temperatura ambiente", { exact: true })).toHaveValue("25");
});
