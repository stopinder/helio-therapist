// Local-only browser layout regression for the real AskHeliosPanel component.
// No login, clinical data, remote service, database read or write is involved.
// Run: node scripts/verify-ask-helios-scroll.mjs (requires Playwright Chromium).
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import vue from '@vitejs/plugin-vue';
import { chromium, expect } from '@playwright/test';

const root = fileURLToPath(new URL('..', import.meta.url));
const entry = '\0virtual:ask-scroll-entry';
const stateId = '\0virtual:ask-scroll-state';
const apiId = '\0virtual:ask-scroll-api';
const stateSource = `
import { ref } from 'vue';
const noOp = () => {};
export const state = {
  isPanelOpen: ref(true), isExpanded: ref(false), panelWidth: ref(440), mode: ref('workspace'),
  messages: ref([]), conversations: ref([]), activeConversationId: ref(null), clients: ref([]), selectedClientId: ref(null),
  isRestoring: ref(true), restoreError: ref(''),
  closePanel: () => { state.isPanelOpen.value = false }, setWidth: width => { state.panelWidth.value = width },
  toggleExpand: () => { state.isExpanded.value = !state.isExpanded.value },
  addMessage: noOp, clearConversation: noOp, selectConversation: noOp, deleteConversation: noOp,
  fetchConversations: noOp, setMode: noOp, assignConversationId: noOp, setSelectedClient: noOp, patchMessage: noOp,
  ensureConversationReady: async () => true, retryRestore: noOp, getContextVersion: () => 0, isContextCurrent: () => true
};
export function useAskHelios() { return state; }
`;
const entrySource = `
import { createApp, h } from 'vue';
import Panel from '/src/components/ui/AskHeliosPanel.vue';
import { state } from 'virtual:ask-scroll-state';
import '/src/main.css';
const app = createApp(Panel);
app.component('RouterLink', { props: ['to'], setup(props, { slots }) { return () => h('a', { href: props.to }, slots.default?.()); } });
app.mount('#fixture');
window.scrollFixture = {
  restore() {
    state.messages.value = [0, 1, 2].flatMap(page => [
      { role: 'user', content: page ? 'Show more documents' : 'Find my documents' },
      { role: 'assistant', content: 'Showing ' + (page * 8 + 1) + '-' + (page * 8 + 8) + ' of 40 documents\\n' +
        Array.from({ length: 24 }, (_, i) => 'Synthetic document entry ' + (i + 1) + ': a fictional test record, not real client material.').join('\\n'),
        references: Array.from({ length: 8 }, (_, i) => ({ title: 'Fictional source ' + (i + 1), url: '/documents?open=fixture', citation: 'Draft test record' })) }
    ]);
    state.activeConversationId.value = 'fixture-conversation';
    state.isRestoring.value = false;
  },
  open() { state.isPanelOpen.value = true; },
  patch() { state.messages.value[5].actionStatus = 'Fixture metadata changed'; }
};
`;
const plugin = {
  name: 'isolated-ask-helios-scroll-fixture', enforce: 'pre',
  resolveId(source, importer) {
    if (source === 'virtual:ask-scroll-entry') return entry;
    if (source === 'virtual:ask-scroll-state') return stateId;
    if (importer?.replaceAll('\\', '/').endsWith('/AskHeliosPanel.vue')) {
      if (source.endsWith('/composables/useAskHelios.js')) return stateId;
      if (source.endsWith('/lib/api.js')) return apiId;
    }
  },
  load(id) {
    if (id === entry) return entrySource;
    if (id === stateId) return stateSource;
    if (id === apiId) return 'export async function authenticatedFetch() { throw new Error("No API requests are allowed in this layout fixture"); }';
  },
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (req.url !== '/__ask-scroll') return next();
      try {
        const html = await server.transformIndexHtml('/__ask-scroll', '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><main style="height:2400px">Synthetic background workspace</main><div id="fixture"></div><script type="module" src="/@id/__x00__virtual:ask-scroll-entry"></script></body></html>');
        res.setHeader('Content-Type', 'text/html'); res.end(html);
      } catch (error) { next(error); }
    });
  }
};

let server, browser;
const deadline = setTimeout(() => { console.error('Scroll browser verification exceeded 90 seconds'); process.exit(1); }, 90_000);
try {
  server = await createServer({ root, configFile: false, envFile: false, logLevel: 'error',
    plugins: [plugin, vue()], server: { host: '127.0.0.1', port: 0, strictPort: true, hmr: false },
    optimizeDeps: { include: ['vue', '@lucide/vue'] } });
  await server.listen();
  const address = server.httpServer.address();
  const origin = 'http://127.0.0.1:' + address.port;
  browser = await chromium.launch();
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    // Fail closed to everything except this isolated local fixture.
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/__ask-scroll');
    await page.waitForFunction(() => !!window.scrollFixture);
    await page.evaluate(() => document.fonts.ready);
    const pane = page.locator('[aria-live="polite"]');
    const latest = page.locator('[data-ask-message-index="5"]');
    const topDelta = () => latest.evaluate(el => el.getBoundingClientRect().top - el.parentElement.getBoundingClientRect().top);
    await expect(page.getByText('Restoring your saved conversation...')).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 250));
    const backgroundY = await page.evaluate(() => window.scrollY);
    await page.evaluate(() => window.scrollFixture.restore());
    await expect.poll(async () => Math.abs(await topDelta())).toBeLessThan(2);
    await expect(latest).toContainText('Showing 17-24 of 40');
    assert.ok(await pane.evaluate(el => el.scrollHeight - el.clientHeight - el.scrollTop) > 100, 'must not land at references at the bottom');
    assert.equal(await page.evaluate(() => window.scrollY), backgroundY, 'must not scroll the surrounding application');
    assert.equal(await page.locator('[data-ask-message-index]').count(), 6, 'all earlier history remains available');

    await pane.evaluate(el => { el.scrollTop = 200; });
    await page.evaluate(() => window.scrollFixture.patch());
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await pane.evaluate(el => el.scrollTop), 200, 'metadata updates must not override manual scrolling');

    await page.getByTitle('Conversation history', { exact: true }).click();
    await page.getByTitle('Back to chat', { exact: true }).click();
    await expect.poll(async () => Math.abs(await topDelta())).toBeLessThan(2);
    await page.getByTitle('Close panel', { exact: true }).click();
    await expect(pane).toBeHidden();
    await page.evaluate(() => window.scrollFixture.open());
    await expect.poll(async () => Math.abs(await topDelta())).toBeLessThan(2);
    assert.deepEqual(errors, [], 'no browser runtime errors');
    console.log(JSON.stringify({ viewport, delayedRestore: 'PASS', latestAnswerStart: 'PASS', earlierHistoryPreserved: 'PASS', manualScroll: 'PASS', historyReturn: 'PASS', panelReopen: 'PASS', backgroundScrollUnchanged: 'PASS' }));
    await context.close();
  }
} finally {
  clearTimeout(deadline);
  await browser?.close();
  await server?.close();
}
