/* Original shared NudgeProof contract. Browser-safe, deterministic and network-free. */
(function (root) {
  'use strict';
  const categories = Object.freeze({
    prechecked: 'OBSERVED STATE',
    prominence: 'MEASURED UI',
    fees: 'OBSERVED CHANGE',
    urgency: 'OBSERVED BEHAVIOR',
    shaming: 'HEURISTIC',
  });
  const rules = Object.freeze({
    prechecked:
      'A visible, non-required optional checkbox was first seen checked without observed user interaction.',
    prominence:
      'Accept area ≥2.5× Reject, font ≥1.5×, or Reject opacity ≤0.5 with Accept opacity ≥0.85. Measurements alone do not assess intent.',
    fees: 'Visible monetary fee text was absent from the initial visible fee baseline.',
    urgency:
      'The same countdown increased by more than 2 seconds after at least 2 descending samples in an offer context.',
    shaming: 'A choice label matched a local guilt or negative-self-description phrase rule.',
  });
  function fail(field) {
    throw new Error(`Invalid NudgeProof report: ${field}.`);
  }
  function record(value, name) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail(name);
    return value;
  }
  function text(value, name, max = 1000) {
    if (typeof value !== 'string' || !value.trim() || value.length > max) fail(name);
    return value;
  }
  function date(value, name) {
    text(value, name, 40);
    if (
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value) ||
      !Number.isFinite(Date.parse(value))
    )
      fail(name);
    return value;
  }
  function legacyId(page, started) {
    let hash = 2166136261;
    for (const character of page + '|' + started)
      hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
    return 'NK-LEGACY-' + (hash >>> 0).toString(16).padStart(8, '0');
  }
  function observation(finding) {
    const first = finding.evidence[0] || '';
    const quoted = first.match(/[“]([^”]+)[”]/)?.[1];
    if (
      finding.type === 'fees' &&
      /^Not visible in the initial fee baseline; now visible:/.test(first) &&
      quoted
    ) {
      return { before: 'Not visible in the initial fee baseline', after: quoted };
    }
    if (finding.type === 'prechecked' && /^First observed checked:/.test(first) && quoted) {
      return {
        before: 'State before monitoring is unknown',
        after: 'First observed checked: ' + quoted,
      };
    }
    const reset = first.match(/^Observed (\d+)s → (\d+)s after (\d+) descending samples/);
    if (finding.type === 'urgency' && reset)
      return { before: reset[1] + 's', after: reset[2] + 's' };
    if (finding.type === 'shaming' && /^Choice label:/.test(first) && quoted)
      return { before: 'No earlier label captured', after: quoted };
    return { before: 'No before/after transition captured', after: first || 'Not captured' };
  }
  function pageUrl(value) {
    try {
      const url = new URL(text(value, 'page', 4096));
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
        fail('page URL');
      return url.origin + url.pathname;
    } catch {
      fail('HTTP/HTTPS page URL');
    }
  }
  function normalize(raw) {
    record(raw, 'root object');
    if (raw.product !== 'NudgeKavach / NudgeProof') fail('product');
    if (raw.schemaVersion !== undefined && ![1, 2].includes(raw.schemaVersion))
      fail('unsupported schemaVersion');
    const version = text(raw.version, 'version', 40);
    const started = date(raw.started, 'started');
    const page = pageUrl(raw.page);
    const sessionId =
      raw.sessionId === undefined ? legacyId(page, started) : text(raw.sessionId, 'sessionId', 100);
    if (!/^[A-Za-z0-9_-]+$/.test(sessionId)) fail('sessionId characters');
    if (typeof raw.monitoring !== 'boolean') fail('monitoring');
    if (!Array.isArray(raw.findings) || raw.findings.length > 100) fail('findings (maximum 100)');
    if (!Array.isArray(raw.timeline) || raw.timeline.length > 120) fail('timeline (maximum 120)');
    const seen = new Set(),
      keys = new Set();
    const findings = raw.findings.map((value, index) => {
      const f = record(value, 'finding');
      if (!Object.hasOwn(categories, f.type)) fail('finding type');
      const findingId =
        f.findingId === undefined
          ? String(index + 1).padStart(2, '0')
          : text(f.findingId, 'findingId', 3);
      if (!/^(?:0[1-9]|[1-9]\d|100)$/.test(findingId) || seen.has(findingId))
        fail('unique findingId (01–100)');
      seen.add(findingId);
      const key = text(f.key, 'finding key', 100);
      if (keys.has(key)) fail('unique finding key');
      keys.add(key);
      if (!Array.isArray(f.evidence) || !f.evidence.length || f.evidence.length > 8)
        fail('finding evidence (1–8 entries)');
      if (typeof f.elementPresent !== 'boolean') fail('elementPresent');
      const confidence = text(f.confidence, 'evidence category', 40);
      if (
        ![
          'Observed state',
          'Observed change',
          'Observed behavior',
          'Measured UI',
          'Heuristic',
        ].includes(confidence)
      )
        fail('evidence category is not a probability');
      const finding = {
        key,
        type: f.type,
        title: text(f.title, 'finding title', 200),
        evidence: f.evidence.map((entry) => text(entry, 'evidence text')),
        interpretation: text(f.interpretation, 'interpretation', 2000),
        confidence,
        firstSeen: date(f.firstSeen, 'firstSeen'),
        elementPresent: f.elementPresent,
        findingId,
        evidenceCategory: categories[f.type],
        source: f.source === undefined ? page : pageUrl(f.source),
        rule:
          f.rule !== undefined
            ? text(f.rule, 'matched rule')
            : f.type === 'prominence' &&
                !f.evidence.some((entry) => /computed opacity/i.test(entry))
              ? 'Accept area ≥2.5× Reject area, or Accept font ≥1.5× Reject font.'
              : rules[f.type],
      };
      const separator = finding.interpretation.indexOf('. ');
      finding.limitation =
        separator >= 0 ? finding.interpretation.slice(separator + 2) : finding.interpretation;
      return { ...finding, ...observation(finding) };
    });
    const timeline = raw.timeline.map((value) => {
      const event = record(value, 'timeline event');
      const at = date(event.at, 'event timestamp');
      const elapsed =
        typeof event.elapsed === 'number'
          ? String(event.elapsed)
          : text(event.elapsed, 'elapsed seconds', 30);
      if (!/^\d+(?:\.\d+)?$/.test(elapsed) || !Number.isFinite(Number(elapsed)))
        fail('elapsed seconds');
      const message = text(event.message, 'event message');
      const result = { at, elapsed, message };
      if (event.findingId !== undefined) {
        if (!seen.has(event.findingId)) fail('event findingId reference');
        result.findingId = event.findingId;
      } else {
        // Upgrade only an unambiguous legacy finding event; do not invent observations.
        const matches = findings.filter((f) => f.title === message && f.firstSeen === at);
        if (matches.length === 1) result.findingId = matches[0].findingId;
      }
      result.eventType =
        event.eventType === undefined
          ? /^Countdown jumped /.test(message)
            ? 'behavior'
            : result.findingId
              ? 'finding'
              : 'monitor'
          : text(event.eventType, 'event type', 60);
      if (event.evidence !== undefined) result.evidence = text(event.evidence, 'event evidence');
      return result;
    });
    const report = {
      product: raw.product,
      version,
      schemaVersion: 2,
      sessionId,
      page,
      started,
      monitoring: raw.monitoring,
      findings,
      timeline,
    };
    // A legacy report without an export time stays unknown; import time is not observation time.
    if (raw.exportedAt !== undefined) report.exportedAt = date(raw.exportedAt, 'exportedAt');
    return report;
  }
  function amount(source) {
    const amounts = [
      ...source.matchAll(/(₹|\$|€|£|¥|AED|CAD|AUD|USD|INR|GBP|EUR|Rs\.?)\s*(-?\d[\d,.]*)/gi),
    ];
    if (amounts.length !== 1) return null;
    const [, symbol, digits] = amounts[0];
    // Reject ambiguous decimal/grouping formats rather than turning a partial match into money.
    if (!/^(?:\d+|\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})(?:\.\d{1,2})?$/.test(digits))
      return null;
    if (
      /\b(?:from|up to|starting|per|monthly|month|year|daily|week|approx|approximately|about|minimum|maximum)\b|\/(?:mo|month|yr|year)|%|\d\s*(?:-|–|—|to)\s*\d/i.test(
        source,
      )
    )
      return null;
    const value = Number(digits.replace(/,/g, ''));
    if (!Number.isFinite(value) || value > 1e9) return null;
    const currency =
      { '₹': 'INR', '€': 'EUR', '£': 'GBP', RS: 'INR', 'RS.': 'INR' }[symbol.toUpperCase()] ||
      symbol.toUpperCase();
    return { currency, amount: value };
  }
  function impact(report) {
    const money = new Map(),
      seen = new Set();
    for (const f of report.findings) {
      if (!['fees', 'prechecked'].includes(f.type)) continue;
      const source = f.evidence[0]?.match(/[“]([^”]+)[”]/)?.[1];
      if (!source) continue;
      const observed = amount(source);
      if (!observed) continue;
      const signature = f.type + '|' + source.toLowerCase();
      if (seen.has(signature)) continue;
      seen.add(signature);
      if (!money.has(observed.currency))
        money.set(observed.currency, { currency: observed.currency, total: 0, charges: [] });
      const group = money.get(observed.currency);
      group.total = Math.round((group.total + observed.amount) * 100) / 100;
      group.charges.push({
        findingId: f.findingId,
        amount: observed.amount,
        kind: f.type === 'fees' ? 'Late-visible fee' : 'Pre-selected optional charge',
        source,
      });
    }
    return {
      money: [...money.values()],
      choice: report.findings.filter((f) => ['prominence', 'shaming'].includes(f.type)).length,
      privacy: report.findings.filter(
        (f) =>
          f.type === 'prechecked' &&
          /\b(newsletter|promotional emails|marketing|email subscription)\b/i.test(
            f.evidence.join(' '),
          ),
      ).length,
      timePressure: report.findings.filter((f) => f.type === 'urgency').length,
      behavioralChanges: report.timeline.filter((event) =>
        /^Countdown jumped \d+s → \d+s/.test(event.message),
      ).length,
    };
  }
  function summary(raw) {
    const report = normalize(raw),
      observed = impact(report);
    return [
      'NudgeKavach / NudgeProof — Evidence before judgement.',
      `Session: ${report.sessionId}`,
      `Source: ${report.page}`,
      `Started: ${report.started}`,
      `Observations: ${report.findings.length}; pattern types: ${new Set(report.findings.map((f) => f.type)).size}`,
      ...report.findings.flatMap((f) => [
        `#${f.findingId} ${f.title} · ${f.evidenceCategory}`,
        `Finding source: ${f.source}`,
        ...f.evidence,
        `Rule: ${f.rule}`,
        `Interpretation: ${f.interpretation}`,
      ]),
      ...observed.money.map(
        (group) =>
          `Observed optional / late charge labels: ${group.currency} ${group.total.toFixed(2)} (not verified savings or checkout total).`,
      ),
      'Limitations: A selective local DOM observation log; not a recording of every change or proof of intent. Zero covered signals does not guarantee a fair or safe page.',
    ].join('\n');
  }
  const api = Object.freeze({ normalize, impact, summary, categories, rules });
  root.NudgeProof = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
