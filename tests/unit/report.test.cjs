const { test } = require('node:test');
const assert = require('node:assert/strict');
const N = require('../../extension/report.js');
const fixture = require('../fixtures/sample-nudgeproof.json');
const copy = () => structuredClone(fixture);

test('legacy reports retain evidence and acquire deterministic cross-surface IDs', () => {
  const report = N.normalize(copy());
  assert.equal(report.schemaVersion, 2);
  assert.equal(report.sessionId, N.normalize(copy()).sessionId);
  assert.equal(report.exportedAt, undefined, 'Import must not invent an export timestamp');
  assert.deepEqual(
    report.findings.map((f) => f.findingId),
    ['01', '02', '03', '04', '05'],
  );
  for (const [i, f] of report.findings.entries()) {
    assert.deepEqual(f.evidence, fixture.findings[i].evidence);
    assert.equal(f.interpretation, fixture.findings[i].interpretation);
    assert.equal(f.confidence, fixture.findings[i].confidence);
    assert.equal(f.firstSeen, fixture.findings[i].firstSeen);
  }
  assert.equal(report.findings[2].evidenceCategory, 'MEASURED UI');
  assert.doesNotMatch(
    report.findings[2].rule,
    /opacity/,
    'Legacy rule attribution follows its recorded measurements',
  );
  assert.equal(report.findings[3].before, 'Not visible in the initial fee baseline');
  assert.equal(report.findings[4].before, '0s');
  assert.equal(report.findings[4].after, '12s');
  assert.deepEqual(N.normalize(report), report, 'Import/export roundtrip must be stable');
  assert.equal(report.timeline.length, fixture.timeline.length, 'Never synthesize events');
});

test('v2 identifiers survive sorting and export; query strings stay private', () => {
  const report = N.normalize(copy());
  report.sessionId = 'NK-test-session';
  report.findings.reverse();
  report.page += '?email=private#private';
  const normalized = N.normalize(report);
  assert.equal(normalized.sessionId, 'NK-test-session');
  assert.deepEqual(
    normalized.findings.map((f) => f.findingId),
    ['05', '04', '03', '02', '01'],
  );
  assert.equal(normalized.page, fixture.page);
  assert.ok(normalized.timeline.some((e) => e.findingId === '04'));
  report.findings[0].source = 'https://example.test/cart?private=value#details';
  report.page = 'https://example.test/checkout';
  const moved = N.normalize(report);
  assert.equal(moved.findings[0].source, 'https://example.test/cart');
  assert.equal(moved.page, 'https://example.test/checkout');
  assert.match(N.summary(moved), /Finding source: https:\/\/example.test\/cart/);
  report.findings[0].source = 'javascript:alert(1)';
  assert.throws(() => N.normalize(report), /Invalid NudgeProof/);
});

test('untrusted imports reject wrong schema, duplicate IDs, dangling references and unbounded data', () => {
  for (const mutate of [
    (r) => {
      r.product = 'unrelated';
    },
    (r) => {
      r.schemaVersion = 999;
    },
    (r) => {
      r.page = 'javascript:alert(1)';
    },
    (r) => {
      r.page = 'https://user:secret@example.test/';
    },
    (r) => {
      r.started = 'not a timestamp';
    },
    (r) => {
      r.monitoring = 'yes';
    },
    (r) => {
      r.findings[0].confidence = '99%';
    },
    (r) => {
      r.findings[0].type = '__proto__';
    },
    (r) => {
      r.findings[0].evidence = [];
    },
    (r) => {
      r.findings[0].evidence[0] = 'x'.repeat(1001);
    },
    (r) => {
      r.findings = Array(101).fill(r.findings[0]);
    },
    (r) => {
      r.timeline = Array(121).fill(r.timeline[0]);
    },
    (r) => {
      r.findings[0].findingId = '02';
      r.findings[1].findingId = '02';
    },
    (r) => {
      r.timeline[0].findingId = '99';
    },
  ]) {
    const report = copy();
    mutate(report);
    assert.throws(() => N.normalize(report), /Invalid NudgeProof/);
  }
});

test('impact sums only unambiguous observed charge labels, separates currencies, no invented privacy', () => {
  const report = N.normalize(copy());
  const impact = N.impact(report);
  assert.equal(impact.money[0].currency, 'INR');
  assert.equal(impact.money[0].total, 548);
  assert.deepEqual(
    impact.money[0].charges.map((c) => c.findingId),
    ['01', '04'],
  );
  assert.equal(impact.choice, 2);
  assert.equal(impact.privacy, 0);
  assert.equal(impact.timePressure, 1);
  assert.equal(impact.behavioralChanges, 1);
  report.findings[0].evidence[0] = 'First observed checked: “Optional plan USD 5.99”.';
  assert.deepEqual(
    N.impact(report).money.map((m) => m.currency),
    ['USD', 'INR'],
  );
  report.findings[0].evidence[0] = 'First observed checked: “Optional plan $5.99”.';
  assert.equal(N.impact(report).money[0].currency, '$', 'A bare $ must not be relabeled as USD');
  assert.match(N.summary(report), /not verified savings or checkout total/);
});

test('ambiguous, recurring and malformed prices are not presented as exact totals', () => {
  for (const label of [
    'Optional plan ₹399 or ₹299',
    'Optional plan from ₹399',
    'Optional plan ₹39/month',
    'Optional plan ₹1,23',
    'Optional plan ₹-10',
    'Optional plan €4,99',
    'Optional plan ₹399–599',
    'Optional plan about ₹399',
  ]) {
    const report = N.normalize(copy());
    report.findings[0].evidence[0] = `First observed checked: “${label}”.`;
    assert.equal(N.impact(report).money[0].total, 149, label);
  }
  const report = N.normalize(copy());
  report.findings[0].evidence[0] = 'First observed checked: “Optional plan ₹1,23,456.50”.';
  assert.equal(N.impact(report).money[0].total, 123605.5);
});

test('clean report has no implied safety score or captured money and unsupported state stays unknown', () => {
  const raw = copy();
  raw.findings = [];
  raw.timeline = [];
  const report = N.normalize(raw);
  assert.deepEqual(N.impact(report).money, []);
  assert.match(N.summary(report), /Zero covered signals does not guarantee/);
  const unusual = copy();
  unusual.findings[0].evidence = ['A checked control was observed without captured label'];
  assert.match(N.normalize(unusual).findings[0].before, /No before\/after transition captured/);
});
