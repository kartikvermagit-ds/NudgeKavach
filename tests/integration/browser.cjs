/* Real MV3 integration test: requires Playwright Chromium, no injected substitute. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { createServer } = require('../../backend/server.cjs');
const Proof = require('../../extension/report.js');
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
    channel: process.env.NUDGE_BROWSER_CHANNEL || 'chromium',
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
  assert.equal(result.schemaVersion, 2);
  assert.equal(new Set(result.findings.map((f) => f.findingId)).size, 5);
  assert.equal(Proof.impact(result).money[0].total, 548);
  assert.ok(result.timeline.some((e) => e.findingId && e.evidence));
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
  // Inspect the actual closed-shadow UI through DevTools, without opening it in product code.
  async function panelEvaluate(fn, args = []) {
    const { root: dom } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
    function findHost(node) {
      if (node.nodeName === 'NUDGE-KAVACH') return node;
      for (const child of node.children || []) {
        const found = findHost(child);
        if (found) return found;
      }
    }
    const host = findHost(dom);
    assert.ok(host?.shadowRoots?.[0], 'Audit shadow root exists');
    const { object } = await cdp.send('DOM.resolveNode', { nodeId: host.shadowRoots[0].nodeId });
    const value = await cdp.send('Runtime.callFunctionOn', {
      objectId: object.objectId,
      functionDeclaration: fn.toString(),
      arguments: args.map((value) => ({ value })),
      returnByValue: true,
      awaitPromise: true,
      userGesture: true,
    });
    if (value.exceptionDetails) throw new Error(JSON.stringify(value.exceptionDetails));
    return value.result.value;
  }
  const ui = await panelEvaluate(function () {
    return {
      counts: ['finding-total', 'pattern-total'].map((id) => this.getElementById(id).textContent),
      categories: [...this.querySelectorAll('article .confidence')].map((el) => el.textContent),
      interpretation: [...this.querySelectorAll('article')].map(
        (el) =>
          el.querySelector('.interpretation').textContent +
          ' ' +
          el.querySelector('.limitation-text').textContent,
      ),
      markers: [...this.querySelectorAll('.source-number')].map((el) => el.textContent),
      times: [...this.querySelectorAll('#events time')].map((el) => el.dateTime),
      expanded: this.getElementById('launcher').getAttribute('aria-expanded'),
    };
  });
  assert.deepEqual(ui.counts, ['5', '5']);
  assert.deepEqual(
    ui.categories,
    result.findings.map((f) => f.evidenceCategory),
  );
  assert.deepEqual(
    ui.interpretation,
    result.findings.map((f) => f.interpretation),
  );
  assert.deepEqual(ui.times, [...ui.times].sort());
  assert.equal(ui.expanded, 'true');
  assert.ok(ui.markers.length > 0);
  await panelButton('Highlights');
  assert.equal(
    await panelEvaluate(function () {
      return this.querySelectorAll('.outline').length;
    }),
    0,
  );
  await panelButton('Highlights');
  assert.ok(
    await panelEvaluate(function () {
      return this.querySelectorAll('.outline').length > 0;
    }),
  );
  await panelEvaluate(function () {
    this.querySelector('.locate').focus();
  });
  await evaluate('globalThis.__nudgeKavach.scan()');
  assert.equal(
    await panelEvaluate(function () {
      return this.activeElement?.className;
    }),
    'locate',
  );
  await panelEvaluate(function () {
    this.querySelector('article .locate').click();
  });
  assert.ok(
    await panelEvaluate(function () {
      return this.querySelector('.outline.located') !== null;
    }),
  );
  // Isolate clipboard I/O while exercising the real click handler and copied evidence payload.
  await evaluate(
    'globalThis.__nkOriginalWrite = navigator.clipboard.writeText; navigator.clipboard.writeText = async text => { globalThis.__nkCopied = text; }',
  );
  await panelButton('Details');
  await panelButton('Copy Evidence');
  await until(async () =>
    (await evaluate('globalThis.__nkCopied'))?.includes(result.findings[0].interpretation),
  );
  await evaluate("navigator.clipboard.writeText = async () => { throw new Error('Unavailable'); }");
  await panelButton('Copy Evidence');
  await until(async () =>
    panelEvaluate(function () {
      return !this.querySelector('.copy-fallback').hidden;
    }),
  );
  await evaluate('navigator.clipboard.writeText = globalThis.__nkOriginalWrite');
  await panelEvaluate(function () {
    this.querySelector('.copy-fallback').hidden = true;
    this.querySelector('.copy-status').textContent = '';
  });
  const exportSnapshot = await report();
  assert.deepEqual(
    exportSnapshot.findings.map((f) => f.interpretation),
    result.findings.map((f) => f.interpretation),
  );
  const downloaded = page.waitForEvent('download');
  await panelButton('Export JSON');
  const download = await downloaded;
  const downloadedReport = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
  assert.equal(downloadedReport.findings.length, 5);
  assert.equal(downloadedReport.sessionId, result.sessionId);
  assert.deepEqual(
    downloadedReport.findings.map((f) => f.findingId),
    result.findings.map((f) => f.findingId),
  );
  assert.ok(!downloadedReport.page.includes('?'));
  await panelButton('Pause');
  assert.equal((await report()).monitoring, false);
  assert.equal(
    await panelEvaluate(function () {
      return this.getElementById('monitor-status').textContent;
    }),
    'Paused',
  );
  await panelButton('Resume');
  assert.equal((await report()).monitoring, true);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await panelEvaluate(function () {
    this.querySelector('main').scrollTop = 0;
    this.getElementById('close').focus({ preventScroll: true });
  });
  await page.screenshot({ path: path.join(results, 'demo-preview.png'), fullPage: true });
  await panelButton('View in Journey');
  assert.equal(
    await panelEvaluate(function () {
      return this.getElementById('view-journey').hidden;
    }),
    false,
  );
  await page.screenshot({ path: path.join(results, 'timeline-audit.png') });
  await panelButton('PROTECT');
  assert.equal(
    await panelEvaluate(function () {
      return this.getElementById('view-protect').querySelector('button').disabled;
    }),
    true,
  );
  await page.screenshot({ path: path.join(results, 'protect-preview.png') });
  await panelButton('FINDINGS');
  await panelEvaluate(function () {
    this.querySelector('details').scrollIntoView({ block: 'end', behavior: 'instant' });
  });
  await page.screenshot({ path: path.join(results, 'timeline-audit.png') });
  await panelEvaluate(function () {
    this.querySelector('main').scrollTop = 0;
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await panelEvaluate(function () {
      const panel = this.getElementById('panel').getBoundingClientRect();
      return panel.left >= 0 && panel.right <= innerWidth && panel.height < innerHeight * 0.8;
    }),
  );
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: path.join(results, 'mobile-audit.png') });
  await panelEvaluate(function () {
    this.getElementById('close').click();
  });
  assert.equal(
    await panelEvaluate(function () {
      return this.activeElement?.id;
    }),
    'launcher',
  );
  await page.screenshot({ path: path.join(results, 'mobile-store.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1100 });
  fs.writeFileSync(
    path.join(results, 'nudgeproof.json'),
    JSON.stringify(downloadedReport, null, 2),
  );
  console.log(
    'PASS: real MV3 auto-load, five findings, evidence, reset timeline, export download, pause/resume, panel screenshot',
  );
  await page.goto(origin + '/?mode=clean');
  world = await extensionWorld();
  assert.equal((await report()).findings.length, 0);
  await evaluate('globalThis.__nudgeKavach.toggle(true)');
  assert.ok(
    await panelEvaluate(function () {
      return (
        !this.getElementById('empty').hidden &&
        this.getElementById('empty').textContent.includes('Zero findings does not guarantee')
      );
    }),
  );
  await panelButton('Pause');
  assert.ok(
    await panelEvaluate(function () {
      return this.getElementById('empty-monitor').textContent.includes('paused');
    }),
  );
  await panelButton('Resume');
  await page.screenshot({ path: path.join(results, 'clean-audit.png') });
  await evaluate('globalThis.__nudgeKavach.toggle(false)');
  await page.check('#protection');
  await page.click('#checkout');
  await page.waitForTimeout(1800);
  assert.equal((await report()).findings.length, 0);
  console.log('PASS: clean baseline, upfront fee, user-selected add-on and equal choices');
  const cleanDownload = page.waitForEvent('download');
  await panelButton('Export JSON');
  const cleanFile = await cleanDownload;
  const cleanReport = JSON.parse(fs.readFileSync(await cleanFile.path(), 'utf8'));
  assert.equal(cleanReport.findings.length, 0);
  assert.notEqual(cleanReport.sessionId, downloadedReport.sessionId);
  fs.writeFileSync(
    path.join(results, 'nudgeproof-clean.json'),
    JSON.stringify(cleanReport, null, 2),
  );
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
  assert.equal(await popup.locator('body').getAttribute('data-state'), 'ready');
  await popup.setViewportSize({ width: 380, height: 720 });
  await popup.screenshot({ path: path.join(results, 'popup-ready.png') });
  await popup.click('#scan');
  await until(async () => /Open a regular HTTP/.test(await popup.locator('#status').textContent()));
  assert.equal(await popup.locator('body').getAttribute('data-state'), 'unsupported');
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
  assert.equal(await popup.locator('body').getAttribute('data-state'), 'active');
  // The inherited opacity rule must report opacity when the geometry is equal.
  await page.evaluate(() => {
    const group = document.createElement('section');
    for (const label of ['Accept all', 'Reject optional']) {
      const button = document.createElement('button');
      button.textContent = label;
      button.style.cssText =
        'width:180px;height:50px;font-size:16px;padding:10px;box-sizing:border-box';
      if (label.startsWith('Reject')) button.style.opacity = '0.3';
      group.append(button);
    }
    document.body.append(group);
  });
  await until(async () => (await report()).findings.some((f) => f.type === 'prominence'));
  const opacityFinding = (await report()).findings.find((f) => f.type === 'prominence');
  assert.match(opacityFinding.evidence[0], /computed opacity Accept 1\.00, Reject 0\.30/);
  assert.match(opacityFinding.interpretation, /lower computed opacity/);
  const sourcesBeforeRoute = (await report()).findings.map((f) => f.source);
  await page.evaluate(() => history.pushState({}, '', '/checkout?private=value#step'));
  await evaluate('globalThis.__nudgeKavach.scan()');
  const afterRoute = await report();
  assert.equal(afterRoute.page, origin + '/checkout');
  assert.deepEqual(
    afterRoute.findings.map((f) => f.source),
    sourcesBeforeRoute,
  );
  assert.ok(afterRoute.timeline.some((e) => e.eventType === 'route-change'));
  const guide = await context.newPage();
  await guide.goto(origin + '/guide.html');
  await guide.screenshot({ path: path.join(results, 'guide-desktop.png'), fullPage: true });
  await guide.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await guide.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  await guide.screenshot({ path: path.join(results, 'guide-mobile.png'), fullPage: true });
  for (const route of ['landing', 'login']) {
    await guide.setViewportSize({ width: 1440, height: 1000 });
    await guide.goto(`${origin}/${route}.html`);
    assert.match(await guide.locator('body').innerText(), /NudgeKavach/);
    await guide.screenshot({ path: path.join(results, `${route}-desktop.png`), fullPage: true });
    await guide.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await guide.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await guide.screenshot({ path: path.join(results, `${route}-mobile.png`), fullPage: true });
  }
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
