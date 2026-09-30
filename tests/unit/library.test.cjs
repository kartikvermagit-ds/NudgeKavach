const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { Library, parseReport, MAX_REPORT_BYTES } = require('../../desktop/library.cjs');
const N = require('../../extension/report.js');
const fixture = require('../fixtures/sample-nudgeproof.json');

async function isolated(fn) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'nk-library-test-'));
  try {
    await fn(directory);
  } finally {
    if (
      path.dirname(directory) !== os.tmpdir() ||
      !path.basename(directory).startsWith('nk-library-test-')
    )
      throw new Error('Unexpected test directory');
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test('library starts empty, persists only imported evidence, and tracks completed exports', async () => {
  await isolated(async (directory) => {
    const first = new Library(directory);
    assert.equal((await first.load()).sessions.length, 0);
    const report = N.normalize(fixture);
    const imported = await first.importReport(report);
    assert.equal(imported.state.sessions.length, 1);
    assert.deepEqual(first.get(report.sessionId), report);
    assert.equal(imported.state.exports.length, 0);
    await first.recordExport();
    const next = new Library(directory);
    assert.equal((await next.load()).exports.length, 1);
    assert.deepEqual(next.get(report.sessionId), report);
    const snapshot = next.snapshot();
    snapshot.sessions.length = 0;
    assert.equal(next.snapshot().sessions.length, 1, 'Renderer cannot mutate stored state');
    await next.clear();
    assert.equal((await new Library(directory).load()).sessions.length, 0);
  });
});

test('invalid and oversize imports cannot modify the local library', async () => {
  await isolated(async (directory) => {
    const library = new Library(directory);
    await library.load();
    assert.throws(() => parseReport('{bad json'), /not valid JSON/);
    assert.throws(() => parseReport(' '.repeat(MAX_REPORT_BYTES + 1)), /smaller than/);
    await assert.rejects(library.importReport({ product: 'not NudgeProof' }), /Invalid NudgeProof/);
    assert.equal(library.snapshot().sessions.length, 0);
    assert.throws(() => library.get('../anything'), /no longer/);
  });
});

test('corrupt saved library is reported and preserved until explicit clear', async () => {
  await isolated(async (directory) => {
    const file = path.join(directory, 'audit-library.json');
    await fs.writeFile(file, '{not valid');
    const library = new Library(directory);
    const snapshot = await library.load();
    assert.match(snapshot.warning, /left untouched/);
    await assert.rejects(library.importReport(N.normalize(fixture)), /left untouched/);
    assert.equal(await fs.readFile(file, 'utf8'), '{not valid');
    await library.clear();
    assert.equal(JSON.parse(await fs.readFile(file, 'utf8')).sessions.length, 0);
  });
});

test('same-session identifiers do not create duplicate session entries', async () => {
  await isolated(async (directory) => {
    const library = new Library(directory);
    await library.load();
    const report = N.normalize(fixture);
    await library.importReport(report);
    const same = await library.importReport(report);
    assert.equal(same.unchanged, true);
    const changed = structuredClone(report);
    changed.monitoring = !changed.monitoring;
    await assert.rejects(library.importReport(changed), /Confirm replacement/);
    assert.deepEqual(library.get(report.sessionId), report);
    await library.importReport(changed, { replace: true });
    assert.deepEqual(library.get(report.sessionId), changed);
    assert.equal(library.snapshot().sessions.length, 1);
    assert.deepEqual(
      library.get(report.sessionId).findings.map((f) => f.findingId),
      ['01', '02', '03', '04', '05'],
    );
  });
});
