'use strict';

(() => {
  const Proof = window.NudgeProof;
  const api = window.auditWorkspace;
  const main = document.querySelector('#main');
  const notice = document.querySelector('#notice');
  const importButton = document.querySelector('#import-report');
  let state = { sessions: [], exports: [], limit: 40, location: '' };
  let view = 'overview';
  let activeSession = '';
  let selectedFinding = '';
  let sessionTab = 'findings';
  let busy = false;
  let comparison = { pattern: '', clean: '' };
  const categories = [
    'OBSERVED STATE',
    'OBSERVED CHANGE',
    'OBSERVED BEHAVIOR',
    'MEASURED UI',
    'HEURISTIC',
  ];

  function node(tag, text, className) {
    const result = document.createElement(tag);
    if (text !== undefined && text !== null) result.textContent = String(text);
    if (className) result.className = className;
    return result;
  }

  function button(text, action, className = 'secondary') {
    const result = node('button', text, className);
    result.type = 'button';
    result.addEventListener('click', action);
    return result;
  }

  function date(value) {
    return Number.isFinite(Date.parse(value))
      ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
      : 'Not recorded';
  }

  function clock(value) {
    return Number.isFinite(Date.parse(value))
      ? new Date(value).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      : 'Not recorded';
  }

  function sessionName(report) {
    try {
      const url = new URL(report.page);
      return `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`;
    } catch {
      return report.page;
    }
  }

  function selected() {
    return state.sessions.find((entry) => entry.report.sessionId === activeSession)?.report;
  }

  function notify(message, error = false) {
    notice.textContent = message;
    notice.hidden = !message;
    notice.classList.toggle('error', error);
    notice.setAttribute('role', error ? 'alert' : 'status');
  }

  function acceptState(next) {
    state = next;
    if (!selected()) activeSession = state.sessions[0]?.report.sessionId || '';
  }

  async function perform(action, pending, success) {
    if (busy) return;
    busy = true;
    importButton.disabled = true;
    main.setAttribute('aria-busy', 'true');
    notify(pending);
    try {
      const result = await action();
      if (!result.ok) throw new Error(result.error);
      if (result.canceled) {
        notify('File action canceled.');
        return;
      }
      if (result.state) acceptState(result.state);
      if (result.sessionId) {
        activeSession = result.sessionId;
        selectedFinding = '';
        sessionTab = 'findings';
        view = 'sessions';
      }
      notify(
        result.warning ||
          (result.unchanged
            ? 'This exact audit snapshot is already in your library. Its evidence is unchanged.'
            : result.replaced
              ? 'Audit loaded successfully. The earlier import of this session was updated.'
              : success),
      );
      render();
    } catch (error) {
      notify(error.message || 'This action could not be completed.', true);
    } finally {
      busy = false;
      importButton.disabled = false;
      main.removeAttribute('aria-busy');
    }
  }

  function importReport() {
    if (!api) {
      notify('Open this workspace through the desktop app to import local reports.', true);
      return;
    }
    perform(
      () => api.importReport(),
      'Importing report… Choose a NudgeProof JSON file.',
      'Audit loaded successfully. Finding IDs and original observations are preserved.',
    );
  }

  function exportReport(report) {
    perform(
      () => api.exportReport(report.sessionId),
      'Choose where to save this NudgeProof report…',
      'NudgeProof report exported.',
    );
  }

  function copySummary(report) {
    perform(
      () => api.copySummary(report.sessionId),
      'Copying the audit summary…',
      'Audit summary copied to the clipboard.',
    );
  }

  function go(next, id) {
    view = next;
    if (id) {
      activeSession = id;
      selectedFinding = '';
      sessionTab = 'findings';
    }
    render();
    main.focus({ preventScroll: true });
    main.scrollTop = 0;
  }

  function title(eyebrow, headline, description, actions = []) {
    const wrap = node('div', null, 'page-heading');
    const copy = node('div');
    copy.append(node('p', eyebrow, 'eyebrow'), node('h1', headline));
    if (description) copy.append(node('p', description, 'muted'));
    wrap.append(copy);
    if (actions.length) {
      const group = node('div', null, 'actions');
      group.append(...actions);
      wrap.append(group);
    }
    return wrap;
  }

  function empty(
    text = 'No audit sessions yet.',
    detail = 'Run NudgeKavach in your browser or import a NudgeProof report to begin.',
  ) {
    const wrap = node('section', null, 'empty');
    wrap.append(
      node('span', '◇', 'empty-mark'),
      node('h2', text),
      node('p', detail, 'muted'),
      button('Import Audit Report', importReport, 'primary'),
    );
    return wrap;
  }

  function metrics(items) {
    const grid = node('div', null, 'metrics');
    items.forEach(([value, label, note]) => {
      const item = node('div', null, 'metric');
      item.append(node('p', label, 'eyebrow'), node('strong', value), node('small', note, 'muted'));
      grid.append(item);
    });
    return grid;
  }

  function category(finding) {
    return node(
      'span',
      finding.evidenceCategory,
      `badge ${finding.type === 'fees' || finding.type === 'urgency' ? 'orange' : ''}`,
    );
  }

  function recentList() {
    const list = node('div', null, 'recent-list');
    state.sessions.slice(0, 6).forEach(({ report, importedAt }) => {
      const row = button('', () => go('sessions', report.sessionId), 'recent-row');
      const copy = node('div');
      copy.append(
        node('strong', sessionName(report)),
        node('small', `${report.sessionId} · Imported ${date(importedAt)}`, 'muted'),
      );
      row.append(
        node('span', report.findings.length ? '◈' : '✓', 'session-symbol'),
        copy,
        node('span', `${report.findings.length} findings`, 'count'),
        node('span', '→', 'arrow'),
      );
      list.append(row);
    });
    return list;
  }

  function renderOverview() {
    main.append(
      title(
        'OVERVIEW',
        'Evidence before judgement.',
        'Review the interface observations you choose to bring into this workspace.',
      ),
    );
    const today = new Date().toDateString();
    const reports = state.sessions
      .filter(({ report }) => new Date(report.started).toDateString() === today)
      .map((entry) => entry.report);
    main.append(
      metrics([
        [reports.length, 'TODAY · AUDIT SESSIONS', 'Imported sessions started today'],
        [
          reports.reduce((sum, report) => sum + report.timeline.length, 0),
          'EVIDENCE EVENTS',
          'Retained journey events in today’s sessions',
        ],
        [
          reports.reduce((sum, report) => sum + Proof.impact(report).behavioralChanges, 0),
          'BEHAVIORAL CHANGES',
          'Retained observed countdown jumps today',
        ],
        [
          state.exports.filter((at) => new Date(at).toDateString() === today).length,
          'EXPORTED REPORTS',
          'Exports made by this workspace today',
        ],
      ]),
    );
    const row = node('div', null, 'overview-grid');
    const recent = node('section', null, 'surface');
    const heading = node('div', null, 'section-heading');
    heading.append(
      node('h2', 'Recent audits'),
      button('View all →', () => go('sessions'), 'text-button'),
    );
    recent.append(heading, state.sessions.length ? recentList() : empty());
    const handoff = node('section', null, 'surface handoff');
    handoff.append(
      node('p', 'BROWSER → NUDGEPROOF → WINDOWS', 'eyebrow'),
      node('h2', 'One finding. A complete trail.'),
      node(
        'p',
        'The browser observes. NudgeProof explains. This workspace keeps your chosen reports available for review.',
        'muted',
      ),
    );
    const steps = node('ol', null, 'handoff-steps');
    [
      'Run an audit in Chrome or Edge.',
      'Export the NudgeProof JSON report.',
      'Import that file here to review the same evidence.',
    ].forEach((text) => steps.append(node('li', text)));
    handoff.append(
      steps,
      node('div', 'File import mode · No live browser connection', 'connection-note'),
    );
    row.append(recent, handoff);
    main.append(row);
    const comparisonCard = node('section', null, 'comparison-banner');
    const copy = node('div');
    copy.append(
      node('p', 'CONTROLLED COMPARISON', 'eyebrow'),
      node('h2', 'Make the difference inspectable.'),
      node(
        'p',
        'Compare two imported reports from Pattern Mode and Clean Control. Counts describe these sessions only.',
        'muted',
      ),
    );
    comparisonCard.append(
      copy,
      button('Compare audits →', () => go('comparison')),
    );
    main.append(comparisonCard);
  }

  function sessionPicker() {
    const wrap = node('label', null, 'session-picker');
    wrap.append(node('span', 'AUDIT SESSION', 'eyebrow'));
    const select = node('select');
    select.id = 'session-picker';
    state.sessions.forEach(({ report }) => {
      const option = node('option', `${sessionName(report)} · ${report.sessionId}`);
      option.value = report.sessionId;
      select.append(option);
    });
    select.value = activeSession;
    select.addEventListener('change', () => go(view, select.value));
    wrap.append(select);
    return wrap;
  }

  function field(label, value, parent) {
    const wrap = node('div', null, 'data-field');
    wrap.append(
      node('dt', label),
      node('dd', value === undefined || value === null || value === '' ? 'Not recorded' : value),
    );
    parent.append(wrap);
  }

  function sessionMeta(report) {
    const wrap = node('aside', null, 'surface session-meta');
    wrap.append(node('p', 'SESSION', 'eyebrow'), node('h2', sessionName(report)));
    const fields = node('dl');
    const spanEnd = report.exportedAt || report.timeline.at(-1)?.at || report.started;
    const seconds = Math.max(
      0,
      Math.round((Date.parse(spanEnd) - Date.parse(report.started)) / 1000),
    );
    field('Session ID', report.sessionId, fields);
    field('Started', date(report.started), fields);
    field(
      report.exportedAt ? 'Session span at export' : 'Retained event span',
      `${Math.floor(seconds / 60)}m ${seconds % 60}s`,
      fields,
    );
    field('Observations', report.findings.length, fields);
    field('Pattern types', new Set(report.findings.map((finding) => finding.type)).size, fields);
    field('Collection at export', report.monitoring ? 'Monitoring' : 'Paused', fields);
    field('Page', report.page, fields);
    wrap.append(
      fields,
      node(
        'p',
        'This is an imported snapshot. It does not track the current page or browser state.',
        'small-note',
      ),
    );
    return wrap;
  }

  function inspect(report, finding) {
    const wrap = node('aside', null, 'surface inspector');
    wrap.id = 'evidence-inspector';
    wrap.setAttribute('aria-label', 'Evidence Inspector');
    wrap.append(node('p', 'EVIDENCE INSPECTOR', 'eyebrow'));
    if (!finding) {
      wrap.append(
        node('h2', 'No finding selected'),
        node('p', 'Select an observation to inspect its source, rule and limitations.', 'muted'),
      );
      return wrap;
    }
    wrap.append(
      node('span', `#${finding.findingId}`, 'inspector-id'),
      category(finding),
      node('h2', finding.title),
      node('p', `${report.sessionId}-${finding.findingId}`, 'mono muted'),
    );
    const data = node('dl');
    field('Source page', finding.source, data);
    field('Observed', date(finding.firstSeen), data);
    field('Before', finding.before, data);
    field('After / observed state', finding.after, data);
    field('Rule', finding.rule, data);
    field(
      'Source at browser export',
      finding.elementPresent ? 'Element remained attached' : 'Element no longer attached',
      data,
    );
    wrap.append(data, node('h3', 'NUDGEPROOF', 'eyebrow'));
    finding.evidence.forEach((evidence) => wrap.append(node('p', evidence, 'evidence-text')));
    wrap.append(
      node('h3', 'WHY THIS MAY MATTER', 'eyebrow'),
      node('p', finding.interpretation, 'interpretation'),
      node('h3', 'LIMITATION', 'eyebrow'),
      node('p', finding.limitation, 'limitation'),
    );
    return wrap;
  }

  function findingCard(report, finding, active = false) {
    const card = button(
      '',
      () => {
        selectedFinding = finding.findingId;
        if (view === 'evidence') {
          activeSession = report.sessionId;
          view = 'sessions';
          sessionTab = 'findings';
          render();
          main.focus({ preventScroll: true });
        } else {
          main.querySelectorAll('.finding-card').forEach((item) => {
            const isActive = item.dataset.finding === finding.findingId;
            item.classList.toggle('selected', isActive);
            item.setAttribute('aria-pressed', String(isActive));
          });
          document.querySelector('#evidence-inspector')?.replaceWith(inspect(report, finding));
        }
      },
      `finding-card${active ? ' selected' : ''}`,
    );
    card.dataset.finding = finding.findingId;
    card.setAttribute('aria-pressed', String(active));
    const top = node('div', null, 'finding-card-top');
    top.append(node('span', `#${finding.findingId}`, 'finding-number'), category(finding));
    card.append(
      top,
      node('strong', finding.title),
      node('span', finding.evidence[0] || 'No additional observation text.', 'finding-excerpt'),
      node('span', `${clock(finding.firstSeen)} · Inspect evidence →`, 'finding-time'),
    );
    return card;
  }

  function journey(report) {
    const wrap = node('section', null, 'journey');
    wrap.append(
      node('h2', 'Choice Journey'),
      node('p', 'TIMELINE · Actual retained events, in recorded order.', 'eyebrow'),
    );
    if (!report.timeline.length)
      wrap.append(node('p', 'This report contains no retained timeline events.', 'muted'));
    const list = node('ol', null, 'journey-list');
    report.timeline.forEach((event) => {
      const item = node('li');
      const details = node('details');
      const summary = node('summary');
      const at = node('time', clock(event.at));
      at.dateTime = event.at;
      const findingIds = event.findingIds || (event.findingId ? [event.findingId] : []);
      summary.append(
        at,
        node(
          'span',
          findingIds.length
            ? findingIds.map((id) => `#${id}`).join(' · ')
            : event.eventType || 'EVENT',
          'event-kind',
        ),
        node('strong', event.message),
      );
      details.append(
        summary,
        node(
          'p',
          `${date(event.at)} · ${event.elapsed}s from monitoring start. This is a recorded event; activity between samples is unknown.`,
          'muted',
        ),
      );
      item.append(details);
      list.append(item);
    });
    wrap.append(list);
    return wrap;
  }

  function impact(report) {
    const totals = Proof.impact(report);
    const wrap = node('section', null, 'surface impact');
    wrap.append(node('p', 'IMPACT · OBSERVED SIGNALS', 'eyebrow'));
    const money = totals.money
      .map(
        (item) =>
          `${item.currency} ${item.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      )
      .join(' · ');
    wrap.append(
      metrics([
        [
          money || '—',
          'MONEY',
          money ? 'Observed optional / late charges' : 'No unambiguous charge amount extracted',
        ],
        [totals.choice, 'CHOICE', 'Choice-pressure signals'],
        [totals.privacy, 'PRIVACY', 'Preselected marketing-choice signals'],
        [totals.timePressure, 'TIME PRESSURE', 'Countdown-reset findings'],
      ]),
    );
    wrap.append(
      node(
        'p',
        'Amounts come from retained evidence and are not verified totals, money saved, or a bill. Different currencies are not combined.',
        'small-note',
      ),
    );
    return wrap;
  }

  function renderSessions() {
    main.append(
      title(
        'AUDIT SESSIONS',
        'Follow the evidence.',
        'The same findings, identifiers and uncertainty recorded by the browser.',
        [button('Compare audits', () => go('comparison'))],
      ),
    );
    const report = selected();
    if (!report) {
      main.append(empty());
      return;
    }
    main.append(sessionPicker());
    if (!report.findings.some((finding) => finding.findingId === selectedFinding))
      selectedFinding = report.findings[0]?.findingId || '';
    const grid = node('div', null, 'forensic-grid');
    const center = node('section', null, 'surface findings-pane');
    const tabs = node('div', null, 'tabs');
    ['findings', 'journey'].forEach((item) => {
      const tab = button(
        item === 'findings' ? `FINDINGS · ${report.findings.length}` : 'CHOICE JOURNEY',
        () => {
          sessionTab = item;
          render();
          main.querySelector(`[data-session-tab="${item}"]`)?.focus();
        },
        sessionTab === item ? 'active' : '',
      );
      tab.dataset.sessionTab = item;
      tab.setAttribute('aria-pressed', String(sessionTab === item));
      tabs.append(tab);
    });
    center.append(tabs);
    if (sessionTab === 'journey') center.append(journey(report));
    else if (!report.findings.length)
      center.append(
        node('h2', 'No covered manipulation signals observed'),
        node(
          'p',
          'Zero findings does not guarantee the page is safe, fair, or free of patterns outside current coverage.',
          'muted',
        ),
      );
    else
      report.findings.forEach((finding) =>
        center.append(findingCard(report, finding, selectedFinding === finding.findingId)),
      );
    grid.append(
      sessionMeta(report),
      center,
      inspect(
        report,
        report.findings.find((finding) => finding.findingId === selectedFinding),
      ),
    );
    main.append(grid, impact(report));
  }

  function renderEvidence() {
    main.append(
      title(
        'EVIDENCE LIBRARY',
        'Every observation, in context.',
        'Search imported reports by finding ID, pattern or session.',
      ),
    );
    if (!state.sessions.length) {
      main.append(empty());
      return;
    }
    const filters = node('div', null, 'filters');
    const searchLabel = node('label', null, 'search-label');
    searchLabel.append(node('span', 'SEARCH EVIDENCE', 'eyebrow'));
    const search = node('input');
    search.type = 'search';
    search.placeholder = 'Finding ID, pattern or session';
    search.id = 'evidence-search';
    searchLabel.append(search);
    const categoryLabel = node('label');
    categoryLabel.append(node('span', 'EVIDENCE CATEGORY', 'eyebrow'));
    const select = node('select');
    select.id = 'evidence-category';
    ['All categories', ...categories].forEach((text, index) => {
      const option = node('option', text);
      option.value = index ? text : '';
      select.append(option);
    });
    categoryLabel.append(select);
    filters.append(searchLabel, categoryLabel);
    const count = node('p', null, 'muted result-count');
    count.setAttribute('aria-live', 'polite');
    const results = node('div', null, 'evidence-grid');
    function update() {
      results.replaceChildren();
      let total = 0;
      state.sessions.forEach(({ report }) =>
        report.findings.forEach((finding) => {
          const haystack =
            `${report.sessionId}-${finding.findingId} #${finding.findingId} ${finding.title} ${finding.type} ${finding.source} ${report.page}`.toLowerCase();
          if (
            (select.value && select.value !== finding.evidenceCategory) ||
            !haystack.includes(search.value.trim().toLowerCase())
          )
            return;
          total += 1;
          const wrap = node('article', null, 'library-card');
          wrap.append(
            node('p', `${report.sessionId}-${finding.findingId}`, 'mono muted'),
            findingCard(report, finding),
            node('small', sessionName(report), 'muted'),
          );
          results.append(wrap);
        }),
      );
      count.textContent = `${total} matching ${total === 1 ? 'finding' : 'findings'}`;
      if (!total)
        results.append(
          node('p', 'No evidence matches these filters. Try another search or category.', 'muted'),
        );
    }
    search.addEventListener('input', update);
    select.addEventListener('change', update);
    main.append(filters, count, results);
    update();
  }

  function renderComparison() {
    main.append(
      title(
        'COMPARE AUDITS',
        'Controlled Comparison',
        'Choose the reports you recorded in Pattern Mode and Clean Control. Labels are assigned by you; no fixture identity is inferred.',
        [button('Back to sessions', () => go('sessions'))],
      ),
    );
    if (state.sessions.length < 2) {
      main.append(
        empty(
          'Two reports make a comparison.',
          'Import separate Pattern Mode and Clean Control exports. Each browser reload starts a new session.',
        ),
      );
      return;
    }
    const selectors = node('div', null, 'comparison-selectors');
    const results = node('section', null, 'comparison-results');
    ['pattern', 'clean'].forEach((role) => {
      const label = node('label');
      label.append(
        node(
          'span',
          role === 'pattern' ? 'PATTERN MODE REPORT' : 'CLEAN CONTROL REPORT',
          'eyebrow',
        ),
      );
      const select = node('select');
      select.id = `compare-${role}`;
      const blank = node('option', 'Select an imported report');
      blank.value = '';
      select.append(blank);
      state.sessions.forEach(({ report }) => {
        const option = node(
          'option',
          `${sessionName(report)} · ${date(report.started)} · ${report.sessionId}`,
        );
        option.value = report.sessionId;
        select.append(option);
      });
      select.value = comparison[role];
      select.addEventListener('change', () => {
        comparison[role] = select.value;
        compare();
      });
      label.append(select);
      selectors.append(label);
    });
    function compare() {
      results.replaceChildren();
      const pattern = state.sessions.find(
        ({ report }) => report.sessionId === comparison.pattern,
      )?.report;
      const clean = state.sessions.find(
        ({ report }) => report.sessionId === comparison.clean,
      )?.report;
      if (!pattern || !clean) {
        results.append(
          node('p', 'Select a report for each side to see recorded differences.', 'muted'),
        );
        return;
      }
      if (pattern.sessionId === clean.sessionId) {
        results.append(
          node(
            'p',
            'Choose two different audit sessions for a controlled comparison.',
            'notice error',
          ),
        );
        return;
      }
      const columns = node('div', null, 'comparison-columns');
      [
        ['PATTERN MODE', pattern],
        ['CLEAN CONTROL', clean],
      ].forEach(([label, report]) => {
        const card = node('section', null, 'surface');
        card.append(
          node('p', `${label} · USER-ASSIGNED`, 'eyebrow'),
          node('h2', `${report.findings.length} covered findings`),
          node(
            'p',
            `${new Set(report.findings.map((finding) => finding.type)).size} pattern types · ${Proof.impact(report).behavioralChanges} behavioral changes`,
            'muted',
          ),
          node('p', report.sessionId, 'mono muted'),
        );
        columns.append(card);
      });
      results.append(columns);
      const difference = node('section', null, 'surface differences');
      difference.append(
        node('h2', 'Recorded differences'),
        node('p', 'Pattern report count minus Clean Control count, by finding type.', 'muted'),
      );
      const allTypes = new Set(
        [...pattern.findings, ...clean.findings].map((finding) => finding.type),
      );
      if (!allTypes.size) difference.append(node('p', 'Neither report contains covered findings.'));
      [...allTypes].forEach((type) => {
        const left = pattern.findings.filter((finding) => finding.type === type);
        const right = clean.findings.filter((finding) => finding.type === type);
        const delta = left.length - right.length;
        const row = node('div', null, 'difference-row');
        row.append(
          node('span', (left[0] || right[0]).title),
          node('strong', `${delta > 0 ? '+' : ''}${delta}`),
          node('small', `${left.length} vs ${right.length}`, 'muted'),
        );
        difference.append(row);
      });
      results.append(
        difference,
        node(
          'p',
          'This is a controlled comparison of imported observations, not statistical validation. A zero-finding control is not a safety guarantee. Different observation timing and interactions can affect results.',
          'small-note',
        ),
      );
    }
    main.append(selectors, results);
    compare();
  }

  function renderReports() {
    main.append(
      title(
        'REPORT',
        'An evidence trail you can share.',
        'Review the observations and limitations before exporting. Snippets may contain page content.',
      ),
    );
    const report = selected();
    if (!report) {
      main.append(empty('No reports to export yet.'));
      return;
    }
    main.append(sessionPicker());
    const actions = node('div', null, 'report-actions');
    actions.append(
      button('Export NudgeProof Report', () => exportReport(report), 'primary'),
      button('Copy Summary', () => copySummary(report)),
    );
    main.append(actions);
    const sheet = node('article', null, 'report-sheet surface');
    const header = node('div', null, 'report-header');
    header.append(
      node('p', 'NUDGEPROOF / AUDIT REPORT', 'eyebrow'),
      node('h2', sessionName(report)),
      node('p', report.sessionId, 'mono muted'),
    );
    sheet.append(
      header,
      node('h3', 'Audit Summary'),
      node(
        'p',
        `${report.findings.length} observations across ${new Set(report.findings.map((finding) => finding.type)).size} pattern types. Monitoring began ${date(report.started)}.`,
      ),
      node('p', report.page, 'mono muted'),
      node('h3', 'Findings & Evidence'),
    );
    if (!report.findings.length)
      sheet.append(node('p', 'No covered manipulation signals observed.'));
    report.findings.forEach((finding) => {
      const section = node('section', null, 'report-finding');
      section.append(
        node('h4', `#${finding.findingId} · ${finding.title}`),
        category(finding),
        node('p', `Observed ${date(finding.firstSeen)}`, 'muted'),
        node('p', `Source: ${finding.source}`, 'mono muted'),
      );
      finding.evidence.forEach((text) => section.append(node('p', text, 'evidence-text')));
      section.append(
        node('p', `Rule: ${finding.rule}`),
        node('p', finding.interpretation),
        node('p', `Limitation: ${finding.limitation}`, 'limitation'),
      );
      sheet.append(section);
    });
    sheet.append(
      journey(report),
      node('h3', 'Limitations'),
      node(
        'p',
        'These local observations do not establish designer intent or overall site safety. The scanner covers selected top-level DOM signals and sampled changes. Paused activity, iframes, images and other uncovered patterns may be absent. Imported reports are editable files, not cryptographic attestations.',
      ),
      node('h3', 'Export Information'),
      node(
        'p',
        `NudgeProof schema ${report.schemaVersion} · Original browser export: ${date(report.exportedAt)}. JSON export preserves this session ID, finding IDs, retained evidence and timeline.`,
      ),
      node(
        'p',
        'This workspace stores only reports you import and local export counts. Export and clipboard copy happen when you choose them.',
        'muted',
      ),
    );
    main.append(sheet);
  }

  function renderSettings() {
    main.append(
      title(
        'SETTINGS',
        'Local by design.',
        'Your browser observes. This workspace reviews only the reports you import.',
      ),
    );
    const section = node('section', null, 'surface settings');
    section.append(node('h2', 'Connection & privacy'));
    const details = node('dl');
    field(
      'Browser connection',
      'Not Connected — local file import is the supported handoff.',
      details,
    );
    field('Accounts & telemetry', 'No account, analytics or cloud synchronization.', details);
    field(
      'Report storage',
      'Imported reports persist locally between app launches. Page snippets can contain sensitive information.',
      details,
    );
    field(
      'Local library',
      `${state.sessions.length} of ${state.limit} sessions · 1 MB per import · 20 MB library limit`,
      details,
    );
    field('Storage file', state.location, details);
    field(
      'Export counter',
      'Records up to 500 recent workspace export timestamps; not browser exports.',
      details,
    );
    section.append(
      details,
      node(
        'p',
        'The app does not scan pages, read browser history, or connect automatically to the extension. Browser connection and Protect Mode are future capabilities.',
        'muted',
      ),
    );
    const clear = node('div', null, 'clear-library');
    clear.append(
      node('h3', 'Clear local audit library'),
      node(
        'p',
        'Remove imported session copies and local export counts. Original files and exported copies remain where you saved them.',
        'muted',
      ),
      button(
        'Clear local library…',
        () =>
          perform(
            () => api.clearLibrary(),
            'Review the confirmation to clear your local library…',
            'The local audit library is now empty.',
          ),
        'danger',
      ),
    );
    section.append(clear);
    main.append(section);
  }

  function render() {
    main.replaceChildren();
    document.querySelectorAll('[data-view]').forEach((item) => {
      if (item.dataset.view === view || (view === 'comparison' && item.dataset.view === 'sessions'))
        item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
    const renderers = {
      overview: renderOverview,
      sessions: renderSessions,
      evidence: renderEvidence,
      reports: renderReports,
      settings: renderSettings,
      comparison: renderComparison,
    };
    renderers[view]();
  }

  document
    .querySelectorAll('[data-view]')
    .forEach((item) => item.addEventListener('click', () => go(item.dataset.view)));
  importButton.addEventListener('click', importReport);
  render();
  if (!api) {
    importButton.disabled = true;
    notify('Desktop preview only. Start the Windows app to import and save audit reports.', true);
    return;
  }
  api
    .load()
    .then((result) => {
      if (!result.ok) throw new Error(result.error);
      acceptState(result.state);
      render();
      if (state.warning) notify(state.warning, true);
    })
    .catch((error) => notify(error.message, true));
})();
