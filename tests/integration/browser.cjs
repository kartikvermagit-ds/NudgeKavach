/* Real MV3 integration test: requires Playwright Chromium, no injected substitute. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { createServer } = require('../../backend/server.cjs');
const root = path.resolve(__dirname, '../..');
const results = path.join(root, 'test-results');
fs.mkdirSync(results, { recursive: true });
const extension = path.join(root, 'extension');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nudgekavach-test-'));
const server = createServer();
let context;
async function until(fn, timeout = 6000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const value = await fn();
    if (value) return value;
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('Timed out waiting for expected observation');
}
(async () => {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  context = await chromium.launchPersistentContext(profile, {
    headless: true,
    channel: 'chromium',
    viewport: { width: 1440, height: 1100 },
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const cdp = await context.newCDPSession(page);
  let worlds = [];
  cdp.on('Runtime.executionContextCreated', ({ context }) => worlds.push(context));
  cdp.on('Runtime.executionContextsCleared', () => (worlds = []));
  await cdp.send('Runtime.enable');
  async function extensionWorld() {
    return until(async () => {
      for (const world of worlds.filter((w) => w.auxData?.type === 'isolated')) {
        try {
          const r = await cdp.send('Runtime.evaluate', {
            contextId: world.id,
            expression: 'typeof globalThis.__nudgeKavach',
            returnByValue: true,
          });
          if (r.result.value === 'object') return world.id;
        } catch {}
      }
      return false;
    });
  }
  let world;
  async function evaluate(expression) {
    const result = await cdp.send('Runtime.evaluate', {
      contextId: world,
      expression,
      returnByValue: true,
    });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  const report = () => evaluate('globalThis.__nudgeKavach.report()');
  await page.goto(origin + '/');
  world = await extensionWorld();
  await until(async () => (await report()).findings.length === 3);
  let result = await report();
  assert.deepEqual(result.findings.map((f) => f.type).sort(), [
    'prechecked',
    'prominence',
    'shaming',
  ]);
  const extensionId = await evaluate('chrome.runtime.id');
  await page.click('#checkout');
  await until(async () => (await report()).findings.some((f) => f.type === 'fees'));
  await until(async () => (await report()).findings.some((f) => f.type === 'urgency'), 18000);
  result = await report();
  assert.equal(result.findings.length, 5);
  assert.ok(result.findings.every((f) => f.evidence.length && f.interpretation && f.confidence));
  assert.ok(result.timeline.some((e) => /Countdown jumped/.test(e.message)));
  // Duplicate content injection must preserve one monitor and the existing evidence.
  await evaluate('globalThis.__nudgeKavach.toggle(true)');
  async function panelButton(text) {
    const { root: dom } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
    function find(node) {
      if (node.nodeName === 'BUTTON' && node.children?.some((child) => child.nodeValue === text))
        return node;
      for (const child of [...(node.children || []), ...(node.shadowRoots || [])]) {
        const found = find(child);
        if (found) return found;
      }
    }
    const found = find(dom);
    assert.ok(found, `Panel button exists: ${text}`);
    const { object } = await cdp.send('DOM.resolveNode', { nodeId: found.nodeId });
    await cdp.send('Runtime.callFunctionOn', {
      objectId: object.objectId,
      functionDeclaration: 'function(){this.click()}',
    });
  }
  const downloaded = page.waitForEvent('download');
  await panelButton('Export JSON');
  const download = await downloaded;
  const downloadedReport = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
  assert.equal(downloadedReport.findings.length, 5);
  assert.ok(!downloadedReport.page.includes('?'));
  await panelButton('Pause');
  assert.equal((await report()).monitoring, false);
  await panelButton('Resume');
  assert.equal((await report()).monitoring, true);
  await page.screenshot({ path: path.join(results, 'demo-preview.png'), fullPage: true });
  fs.writeFileSync(path.join(results, 'nudgeproof.json'), JSON.stringify(result, null, 2));
  console.log(
    'PASS: real MV3 auto-load, five findings, evidence, reset timeline, export download, pause/resume, panel screenshot',
  );
  await page.goto(origin + '/?mode=clean');
  world = await extensionWorld();
  assert.equal((await report()).findings.length, 0);
  await page.check('#protection');
  await page.click('#checkout');
  await page.waitForTimeout(1800);
  assert.equal((await report()).findings.length, 0);
  console.log('PASS: clean baseline, upfront fee, user-selected add-on and equal choices');
  // Dynamic optional defaults, ordinary clocks, neutral refusal and hidden fee text.
  await page.evaluate(() => {
    const label = document.createElement('label');
    label.innerHTML = '<input type="checkbox" checked> Optional gift wrap ₹50';
    document.body.append(label);
    const hidden = document.createElement('p');
    hidden.hidden = true;
    hidden.textContent = 'Handling fee: ₹99';
    document.body.append(hidden);
  });
  await until(async () => (await report()).findings.length === 1);
  assert.equal((await report()).findings[0].type, 'prechecked');
  console.log('PASS: dynamically inserted optional default; hidden fee not flagged');
  // Popup must load under extension CSP and perform actual scripting/message APIs.
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await popup.click('#scan');
  await until(async () => /Open a regular HTTP/.test(await popup.locator('#status').textContent()));
  // Point popup tab query to target tab while exercising real executeScript/sendMessage.
  await popup.evaluate(async () => {
    const tabs = await chrome.tabs.query({});
    let target;
    for (const tab of tabs) {
      try {
        const report = await chrome.tabs.sendMessage(tab.id, { type: 'NK_REPORT' });
        if (report?.product) {
          target = { ...tab, url: report.page };
          break;
        }
      } catch {}
    }
    if (!target) throw new Error('No monitored tab available for popup test');
    const original = chrome.tabs.query;
    chrome.tabs.query = async (options) => (options.active ? [target] : original(options));
  });
  await popup.click('#scan');
  await until(async () =>
    /Monitoring started/.test(await popup.locator('#status').textContent()),
  ).catch(async (error) => {
    throw new Error(`${error.message}: ${await popup.locator('#status').textContent()}`);
  });
  assert.equal((await report()).findings.length, 1);
  assert.deepEqual(errors, []);
  console.log(
    'PASS: popup CSP, restricted-page error, scripting, messaging, duplicate injection guard',
  );
  console.log('All browser integration checks passed.');
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (context) await context.close();
    if (server.listening) {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
    // Profile is a freshly generated test-only directory inside OS temp.
    if (
      path.dirname(profile) === os.tmpdir() &&
      path.basename(profile).startsWith('nudgekavach-test-')
    )
      fs.rmSync(profile, { recursive: true, force: true });
  });
