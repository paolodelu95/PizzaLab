import { test, expect } from '@playwright/test';
test('calculate, save, annotate, persist and delete a recipe',async({page})=>{
  await page.goto('/');await expect(page.getByRole('heading',{name:/La prossima pizza/})).toBeVisible();
  await expect(page.getByText('Impasto totale',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'In teglia Da condividere'}).click();
  await page.getByLabel('Larghezza teglia',{exact:true}).fill('30');await page.getByLabel('Lunghezza teglia',{exact:true}).fill('40');
  await page.getByLabel('Nome del piano').fill('Prova teglia');await page.getByRole('button',{name:'Salva il piano'}).click();
  await expect(page.getByRole('heading',{name:'Prova teglia',exact:true})).toBeVisible();
  await page.getByLabel('Appunti per la prossima volta').fill('Fondo croccante, ripetere.');
  await page.getByRole('button',{name:'4 stelle per Prova teglia'}).click();
  await page.waitForFunction(()=>localStorage.getItem('CapacitorStorage.pizzamico-state-v1')?.includes('Fondo croccante'));
  await page.reload();await page.getByRole('button',{name:/Diario/}).click();
  await expect(page.getByLabel('Appunti per la prossima volta')).toHaveValue('Fondo croccante, ripetere.');
  await page.getByRole('button',{name:'Attiva piano e promemoria'}).click();await expect(page.getByRole('status')).toContainText('browser');
  await page.getByRole('button',{name:'Elimina Prova teglia'}).click();await page.getByRole('button',{name:'Elimina piano',exact:true}).click();
  await expect(page.getByText('La prima pagina è tutta tua.')).toBeVisible();
});
test('flour search, source details, custom flour and no overflow',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Farine',exact:true}).click();
  await page.getByRole('textbox',{name:'Cerca farina'}).fill('Garofalo');await expect(page.locator('.flour-row')).toHaveCount(5);
  await page.getByRole('button',{name:'W 260',exact:true}).click();await expect(page.getByRole('link',{name:'Apri la fonte ufficiale'})).toHaveAttribute('href',/pasta-garofalo/);
  await page.getByRole('button',{name:'La tua farina'}).click();await page.getByRole('textbox',{name:'Nome',exact:true}).fill('Farina di prova');await page.getByRole('textbox',{name:'Marchio',exact:true}).fill('Personale');await page.getByRole('button',{name:'Aggiungi al catalogo'}).click();
  await page.getByRole('textbox',{name:'Cerca farina'}).fill('Farina di prova');await expect(page.locator('.flour-row')).toHaveCount(1);
  await page.getByRole('button',{name:'Usa',exact:true}).click();await expect(page.getByRole('combobox',{name:'La tua farina',exact:true})).toHaveValue(/^custom-/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/planner-${test.info().project.name}.png`,fullPage:true});
});
test('invalid fields block saving and hot/weak dough produces warnings',async({page})=>{
  await page.goto('/');await page.getByLabel('Temperatura ambiente',{exact:true}).fill('30');await expect(page.getByText('In cucina fa caldo',{exact:true})).toBeVisible();
  await page.getByLabel('Peso del panetto',{exact:true}).fill('0');await expect(page.getByText('Controlla questi valori')).toBeVisible();await expect(page.getByRole('button',{name:'Salva il piano'})).toHaveCount(0);
  await page.getByLabel('Peso del panetto',{exact:true}).fill('260');await page.getByRole('button',{name:'Tutto fuori frigo'}).click();await expect(page.getByLabel('Riposo in frigo',{exact:true})).toHaveValue('0');
  await page.getByRole('button',{name:'Impara',exact:true}).click();await expect(page.getByRole('heading',{name:'Mani in pasta, idee chiare.'})).toBeVisible();
});
