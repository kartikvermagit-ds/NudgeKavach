/* Launch the real Windows companion; substitute native dialogs, never report/import logic. */
const { _electron: electron } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const Proof = require('../../extension/report.js');
const root = path.resolve(__dirname, '../..');
const results = path.join(root, 'test-results');
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'nk-desktop-test-'));
let app;

(async () => {
  const reportPath = path.join(results, 'nudgeproof.json');
  const cleanPath = path.join(results, 'nudgeproof-clean.json');
  if (!fs.existsSync(reportPath) || !fs.existsSync(cleanPath))
    throw new Error('Run npm run test:browser first to create actual Pattern/Clean exports.');
  const report = Proof.normalize(JSON.parse(fs.readFileSync(reportPath, 'utf8')));
  const clean = Proof.normalize(JSON.parse(fs.readFileSync(cleanPath, 'utf8')));
  assert.equal(report.findings.length, 5);
  assert.equal(clean.findings.length, 0);
  const env = { ...process.env, NUDGEKAVACH_USER_DATA: userData };
  delete env.ELECTRON_RUN_AS_NODE;
  app = await electron.launch({
    executablePath: require('../../desktop/node_modules/electron'),
    args: [path.join(root, 'desktop')],
    env,
  });
  const page = await app.firstWindow();
  await page.waitForSelector('#import-report');
  await page.waitForFunction(() => document.querySelector('#main').textContent.includes('No'));
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  assert.match(await page.locator('body').innerText(), /Browser Extension Not Connected/);
  assert.equal(await page.evaluate(() => typeof require), 'undefined');
  assert.equal(await page.evaluate(() => typeof process), 'undefined');
  const preferences = await app.evaluate(({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows()[0];
    const p = w.webContents.getLastWebPreferences();
    return {
      sandbox: p.sandbox,
      contextIsolation: p.contextIsolation,
      nodeIntegration: p.nodeIntegration,
    };
  });
  assert.deepEqual(preferences, { sandbox: true, contextIsolation: true, nodeIntegration: false });
  // A second launch sharing this library must hand over to the existing process.
  await new Promise((resolve, reject) => {
    const second = spawn(
      require('../../desktop/node_modules/electron'),
      [path.join(root, 'desktop')],
      { env, stdio: 'ignore', windowsHide: true },
    );
    const timeout = setTimeout(() => {
      second.kill();
      reject(new Error('Second desktop instance did not release the library'));
    }, 8000);
    second.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    second.once('exit', (code) => {
      clearTimeout(timeout);
      code === 0 ? resolve() : reject(new Error('Second instance exited with ' + code));
    });
  });
  assert.equal(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length), 1);
  await page.screenshot({ path: path.join(results, 'desktop-empty.png') });
  async function importFile(file) {
    await app.evaluate(({ dialog }, file) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [file] });
    }, file);
    await page.locator('#import-report').click();
    await page.waitForFunction(() => !document.querySelector('#import-report').disabled);
  }
  await importFile(reportPath);
  assert.match(await page.locator('#notice').innerText(), /successfully|imported/i);
  assert.equal(await page.locator('.finding-card').count(), 5);
  const imported = await page.evaluate(() => window.auditWorkspace.load());
  assert.equal(imported.ok, true);
  assert.deepEqual(imported.state.sessions[0].report, report);
  const changedPath = path.join(userData, 'changed-snapshot.json');
  fs.writeFileSync(changedPath, JSON.stringify({ ...report, monitoring: !report.monitoring }));
  await app.evaluate(({ dialog }) => {
    dialog.showMessageBox = async () => ({ response: 0 });
  });
  await importFile(changedPath);
  assert.match(await page.locator('#notice').innerText(), /canceled/);
  assert.deepEqual(
    (await page.evaluate(() => window.auditWorkspace.load())).state.sessions[0].report,
    report,
  );
  const fee = report.findings.find((f) => f.type === 'fees');
  await page.locator('.finding-card').filter({ hasText: fee.title }).click();
  const inspector = await page.locator('#evidence-inspector').innerText();
  assert.ok(inspector.includes('#' + fee.findingId));
  assert.ok(inspector.includes(fee.after));
  assert.ok(inspector.includes(fee.limitation));
  await page.screenshot({ path: path.join(results, 'desktop-session.png') });
  await page.getByRole('button', { name: 'CHOICE JOURNEY', exact: true }).click();
  assert.match(await page.locator('#main').innerText(), /Countdown jumped/);
  await page.screenshot({ path: path.join(results, 'desktop-journey.png') });

  await page.locator('[data-view="evidence"]').click();
  await page.locator('#evidence-category').selectOption('OBSERVED CHANGE');
  assert.equal(await page.locator('.finding-card').count(), 1);
  await page.getByPlaceholder('Finding ID, pattern or session').fill('missing-evidence');
  assert.equal(await page.locator('.finding-card').count(), 0);
  await page.getByPlaceholder('Finding ID, pattern or session').fill(fee.findingId);
  assert.equal(await page.locator('.finding-card').count(), 1);
  await page.screenshot({ path: path.join(results, 'desktop-library.png') });

  const invalidPath = path.join(userData, 'invalid.json');
  fs.writeFileSync(invalidPath, '{"product":"untrusted"}');
  await importFile(invalidPath);
  assert.match(await page.locator('#notice').innerText(), /Invalid NudgeProof/);
  assert.equal((await page.evaluate(() => window.auditWorkspace.load())).state.sessions.length, 1);
  await page.screenshot({ path: path.join(results, 'desktop-invalid-import.png') });
  await app.evaluate(({ dialog }) => {
    dialog.showOpenDialog = async () => ({ canceled: true, filePaths: [] });
  });
  await page.locator('#import-report').click();
  await page.waitForFunction(() => !document.querySelector('#import-report').disabled);
  assert.match(await page.locator('#notice').innerText(), /canceled/);

  await importFile(cleanPath);
  await page.getByRole('button', { name: 'Compare audits', exact: true }).click();
  await page.locator('#compare-pattern').selectOption(report.sessionId);
  await page.locator('#compare-clean').selectOption(clean.sessionId);
  assert.match(await page.locator('#main').innerText(), /Controlled Comparison/);
  assert.match(await page.locator('#main').innerText(), /Late-visible fee/);
  assert.match(await page.locator('#main').innerText(), /statistical/i);
  await page.screenshot({ path: path.join(results, 'desktop-comparison.png') });
  await page.locator('[data-view="reports"]').click();
  await page.locator('#session-picker').selectOption(report.sessionId);
  const exportPath = path.join(results, 'desktop-roundtrip.json');
  await app.evaluate(({ dialog, clipboard }, file) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: file });
    clipboard.writeText = (text) => {
      globalThis.__testCopied = text;
    };
  }, exportPath);
  await page.getByRole('button', { name: 'Export NudgeProof Report', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('#import-report').disabled);
  assert.deepEqual(JSON.parse(fs.readFileSync(exportPath, 'utf8')), report);
  await page.getByRole('button', { name: 'Copy Summary', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('#import-report').disabled);
  assert.ok((await app.evaluate(() => globalThis.__testCopied)).includes(fee.interpretation));
  await page.screenshot({ path: path.join(results, 'desktop-report.png') });
  await page.locator('[data-view="overview"]').click();
  const saved = await page.evaluate(() => window.auditWorkspace.load());
  assert.equal(saved.state.sessions.length, 2);
  assert.equal(saved.state.exports.length, 1);
  await page.screenshot({ path: path.join(results, 'desktop-overview.png') });
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setContentSize(900, 768),
  );
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: path.join(results, 'desktop-900.png') });
  await page.locator('[data-view="sessions"]').click();
  await page.locator('#session-picker').selectOption(report.sessionId);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: path.join(results, 'desktop-session-900.png') });
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setContentSize(1920, 1080),
  );
  await page.screenshot({ path: path.join(results, 'desktop-1920.png') });
  assert.deepEqual(errors, []);
  await app.close();
  app = null;
  const persisted = JSON.parse(fs.readFileSync(path.join(userData, 'audit-library.json'), 'utf8'));
  assert.equal(persisted.sessions.length, 2);
  assert.equal(
    persisted.sessions.find((s) => s.report.sessionId === report.sessionId).report.findings[3]
      .findingId,
    report.findings[3].findingId,
  );
  console.log(
    'PASS: real Electron empty state, browser export import, stable IDs, evidence inspector, journey, category/search, invalid/canceled import, controlled comparison, JSON roundtrip, summary, local persistence, isolated renderer, 900/1920 layouts.',
  );
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (app) await app.close();
    if (
      path.dirname(userData) === os.tmpdir() &&
      path.basename(userData).startsWith('nk-desktop-test-')
    )
      fs.rmSync(userData, { recursive: true, force: true });
  });
