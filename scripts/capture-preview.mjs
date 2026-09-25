import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('docs/screenshots',{recursive:true});
const browser=await chromium.launch({channel:'msedge'});
try{
  for(const [name,width,height] of [['android',390,844],['desktop',1440,1000]]){
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
    const page=await context.newPage();
    await page.goto('http://127.0.0.1:5173');
    await page.getByRole('heading',{name:/La prossima pizza/}).waitFor();
    await page.screenshot({path:`docs/screenshots/${name}-impasto.png`});
    if(name==='android'){
      await page.getByRole('button',{name:'Farine',exact:true}).click();
      await page.getByRole('textbox',{name:'Cerca farina'}).fill('Caputo');
      await page.screenshot({path:'docs/screenshots/android-farine.png'});
    }
    await context.close();
  }
}finally{await browser.close();}
