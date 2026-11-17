// Isolated rendering check: synthetic text, no clinical data or external requests.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import vue from '@vitejs/plugin-vue';
import { chromium, expect } from '@playwright/test';
const root = fileURLToPath(new URL('..', import.meta.url));
const entry = '\0virtual:summary-lens-fixture';
const plugin = {
  name: 'summary-lens-fixture',
  resolveId(id) { if (id === 'virtual:summary-lens-fixture') return entry; },
  load(id) {
    if (id !== entry) return;
    return `import {createApp,h,ref} from 'vue';
import Document from '/src/components/workspace/SessionSummaryDocument.vue';
import {renderSummarySections} from '/src/lib/summaryAuthoring.js';
import {SUMMARY_LENS_IDS,SUMMARY_LENS_LABELS} from '/src/lib/summaryLenses.js';
import '/src/main.css';
const lens=ref('clinical');
const sections=Object.fromEntries(['opening','whatWeWorkedOn','patternsOverTime','changesAndExceptions','strengthsAndResources','perspectiveReflection','betweenSession','closing'].map(key=>[key,'Synthetic text for '+key+'. No real clinical records are used.']));
createApp({render:()=>h('main',{style:'max-width:960px;margin:auto;padding:16px'},[h('label',['Approach',h('select',{id:'lens',value:lens.value,onChange:e=>lens.value=e.target.value},SUMMARY_LENS_IDS.map(id=>h('option',{value:id},SUMMARY_LENS_LABELS[id])))]),h(Document,{body:renderSummarySections(sections,'across_session_review',lens.value),title:'Across-session review',clientName:'Fictional participants',date:'2026-10-08 – 2026-10-22'})])}).mount('#fixture');`;
  },
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.url !== '/__summary-lenses') return next();
      try { const html = await server.transformIndexHtml('/__summary-lenses','<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="fixture"></div><script type="module" src="/@id/__x00__virtual:summary-lens-fixture"></script></body></html>'); res.setHeader('Content-Type','text/html');res.end(html); } catch (error) { next(error); }
    });
  }
};
let server, browser;
const deadline = setTimeout(() => { console.error('Summary lens browser verification exceeded 90 seconds'); process.exit(1); },90000);
try {
  server=await createServer({root,configFile:false,envFile:false,logLevel:'error',plugins:[plugin,vue()],server:{host:'127.0.0.1',port:0,hmr:false},optimizeDeps:{include:['vue','@lucide/vue']}});
  await server.listen(); const origin='http://127.0.0.1:'+server.httpServer.address().port;
  browser=await chromium.launch();
  for (const width of [1440,390]) {
    const context=await browser.newContext({viewport:{width,height:1000}});
    await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
    const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+'/__summary-lenses');
    await expect(page.getByRole('heading',{name:'Across-session review',exact:true})).toBeVisible();
    await expect(page.locator('#lens option')).toHaveCount(5);
    await expect(page.locator('#lens option[value=general]')).toHaveCount(0);
    const expected={clinical:'Clinical formulation and contributing factors',integrative:'The recurring pattern',gentle_cbt:'Responses and maintaining cycles',internal_family_systems:'Protective responses and inner relationships',transactional_analysis:'Transactions and recurring expectations'};
    for (const [lens,heading] of Object.entries(expected)) {
      await page.locator('#lens').selectOption(lens);
      await expect(page.getByRole('heading',{name:heading,exact:true})).toBeVisible();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'document must fit mobile width');
    }
    assert.deepEqual(errors,[]); console.log(JSON.stringify({width,lenses:5,distinctHeadings:'PASS',clinicalReport:'PASS',scopeTitle:'PASS',mobileOverflow:'PASS',browserErrors:0}));
    await context.close();
  }
} finally { clearTimeout(deadline);await browser?.close();await server?.close(); }
