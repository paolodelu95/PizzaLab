import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir:'./tests', fullyParallel:false, workers:1,
  use:{baseURL:'http://127.0.0.1:5173',channel:'msedge',locale:'it-IT',trace:'retain-on-failure'},
  webServer:{command:'npm run dev -- --port 5173',url:'http://127.0.0.1:5173',reuseExistingServer:true},
  projects:[{name:'desktop',use:{viewport:{width:1440,height:1000}}},{name:'mobile',use:{...devices['Pixel 7'],defaultBrowserType:'chromium'}}],
});
