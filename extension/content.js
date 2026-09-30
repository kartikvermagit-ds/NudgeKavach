(() => {
  'use strict';
  if (globalThis.__nudgeKavach) return;
  const R = globalThis.NudgeRules;
  const started = Date.now();
  const sessionId =
    'NK-' +
    (crypto.randomUUID?.() ||
      [...crypto.getRandomValues(new Uint8Array(16))]
        .map((value) => value.toString(16).padStart(2, '0'))
        .join(''));
  const findings = new Map(),
    ids = new WeakMap(),
    touched = new WeakSet(),
    checkedSeen = new WeakSet(),
    timers = new WeakMap();
  const feeBaseline = new Set(),
    timeline = [];
  let nextId = 0,
    booted = false,
    enabled = true,
    host,
    shadow,
    observer,
    pending,
    interval,
    highlight = true;
  let baselineTaken = false,
    lastUrl = location.href;
  const clean = (text) => (text || '').replace(/\s+/g, ' ').trim().slice(0, 240);
  const textOf = (el) => clean(el.innerText || el.textContent);
  const own = (el) => el === host || host?.contains(el);
  function visible(el) {
    if (!el || own(el) || el.closest('[hidden],[aria-hidden="true"]')) return false;
    const s = getComputedStyle(el),
      rect = el.getBoundingClientRect();
    return (
      s.display !== 'none' &&
      s.visibility !== 'hidden' &&
      Number(s.opacity) !== 0 &&
      rect.width > 0 &&
      rect.height > 0
    );
  }
  function id(el) {
    if (!ids.has(el)) ids.set(el, ++nextId);
    return ids.get(el);
  }
  function log(message, metadata = {}) {
    timeline.push({
      at: new Date().toISOString(),
      elapsed: ((Date.now() - started) / 1000).toFixed(1),
      message,
      ...metadata,
    });
    if (timeline.length > 120) timeline.shift();
  }
  function add(type, el, title, evidence, interpretation, confidence = 'Heuristic') {
    const key = `${type}:${id(el)}`;
    let item = findings.get(key);
    if (!item) {
      if (findings.size >= 100) return;
      item = {
        key,
        findingId: String(findings.size + 1).padStart(2, '0'),
        type,
        title,
        evidence: [],
        interpretation,
        confidence,
        source: location.origin + location.pathname,
        firstSeen: new Date().toISOString(),
        el,
      };
      findings.set(key, item);
      log(title, { findingId: item.findingId, eventType: 'finding', evidence });
    }
    item.confidence = confidence;
    item.interpretation = interpretation;
    if (!item.evidence.includes(evidence)) {
      item.evidence.push(evidence);
      if (item.evidence.length > 8) item.evidence.splice(1, 1);
    }
  }
  function labelFor(el) {
    return clean(
      [...(el.labels || [])].map((x) => x.textContent).join(' ') ||
        el.getAttribute('aria-label') ||
        el.parentElement?.textContent,
    );
  }
  function scan() {
    if (!enabled || !document.body) return;
    if (location.href !== lastUrl) {
      log(
        'Page route changed; observations remain from this document. Reload to begin a new baseline.',
        { eventType: 'route-change' },
      );
      lastUrl = location.href;
    }
    const isChecked = (el) =>
      el.matches?.('input[type="checkbox"]')
        ? el.checked
        : el.getAttribute('aria-checked') === 'true' || el.classList.contains('checked');
    const isRequired = (el) =>
      el.matches?.('input[type="checkbox"]')
        ? el.required
        : el.getAttribute('aria-required') === 'true' || el.hasAttribute('required');

    document.querySelectorAll('input[type="checkbox"], [role="checkbox"]').forEach((el) => {
      if (!visible(el) || checkedSeen.has(el)) return;
      checkedSeen.add(el);
      const label = labelFor(el);
      if (isChecked(el) && !isRequired(el) && R.optional(label) && !touched.has(el)) {
        add(
          'prechecked',
          el,
          'Pre-selected optional choice',
          `First observed checked: “${label}”. No user interaction with this control observed since monitoring began.`,
          'An optional choice was already selected at first observation. Earlier user choices or saved preferences cannot be ruled out.',
          'Observed state',
        );
      }
    });
    const choices = [
      ...document.querySelectorAll(
        'button,a,[role="button"],input[type="button"],input[type="submit"]',
      ),
    ].filter(visible);
    const choiceText = (el) => clean(el.value || textOf(el));
    choices.forEach((el) => {
      const text = choiceText(el);
      if (R.shaming(text))
        add(
          'shaming',
          el,
          'Possible confirm-shaming',
          `Choice label: “${text}”. Matched a local guilt/negative-self-description phrase rule.`,
          'Declining is framed as a negative personal choice. Context can change the meaning.',
        );
      if (!/^accept(?: all| cookies| optional)?[.!]?$/i.test(text)) return;
      let group = el.parentElement;
      for (let depth = 0; group && depth < 3; depth++, group = group.parentElement) {
        if (group === document.body) break;
        const reject = choices.find(
          (x) =>
            x !== el &&
            group.contains(x) &&
            /^(reject|decline)(?: all| optional| cookies)?[.!]?$/i.test(choiceText(x)),
        );
        if (!reject) continue;
        const measure = (x) => {
          const s = getComputedStyle(x);
          return {
            area: x.getBoundingClientRect().width * x.getBoundingClientRect().height,
            font: parseFloat(s.fontSize),
            opacity: parseFloat(s.opacity) || 1,
          };
        };
        const a = measure(el),
          b = measure(reject),
          p = R.prominence(a, b);
        if (p.flag)
          add(
            'prominence',
            el,
            'Unequal choice prominence',
            `“${text}” vs “${choiceText(reject)}”: area ${p.areaRatio.toFixed(2)}×; font ${p.fontRatio.toFixed(2)}×; computed opacity Accept ${a.opacity.toFixed(2)}, Reject ${b.opacity.toFixed(2)}. Threshold: area ≥2.5×, font ≥1.5×, or Reject opacity ≤0.50 with Accept ≥0.85.`,
            p.areaRatio >= 2.5 || p.fontRatio >= 1.5
              ? 'Acceptance occupies more visual space than rejection. This geometric signal does not assess intent or accessibility.'
              : 'Rejection has lower computed opacity than acceptance. This CSS signal does not measure effective contrast, ancestor opacity, intent or accessibility.',
          );
        break;
      }
    });
    // Leaf text elements keep whole-page text from becoming false evidence.
    const leaves = [
      ...document.querySelectorAll('span,p,div,small,strong,b,li,td,output,time'),
    ].filter((el) => !el.children.length && visible(el));
    leaves.forEach((el) => {
      const text = textOf(el),
        seconds = R.seconds(text);
      if (seconds !== null && R.urgency(text + ' ' + clean(el.parentElement?.textContent))) {
        let state = timers.get(el);
        if (!state) {
          state = { initial: seconds, previous: seconds, decreases: 0, resets: 0 };
          timers.set(el, state);
          log(`Timer baseline: ${text}`, { eventType: 'timer-baseline', evidence: text });
        } else if (seconds !== state.previous) {
          if (seconds < state.previous) state.decreases++;
          if (R.reset(state.previous, seconds) && state.decreases >= 2) {
            state.resets++;
            add(
              'urgency',
              el,
              'Suspicious countdown reset',
              `Observed ${state.previous}s → ${seconds}s after ${state.decreases} descending samples; reset #${state.resets}. Initial value: ${state.initial}s.`,
              'The same countdown increased after counting down. It may create artificial urgency; a legitimate extension or new offer is also possible.',
              'Observed behavior',
            );
            log(`Countdown jumped ${state.previous}s → ${seconds}s`, {
              findingId: findings.get(`urgency:${id(el)}`)?.findingId,
              eventType: 'countdown-reset',
              evidence: `Observed ${state.previous}s → ${seconds}s after ${state.decreases} descending samples.`,
            });
          }
          state.previous = seconds;
        }
      }
      if (R.fee(text)) {
        const signature = text.toLowerCase();
        if (!baselineTaken) feeBaseline.add(signature);
        else if (!feeBaseline.has(signature) && !findings.has(`fees:${id(el)}`))
          add(
            'fees',
            el,
            'Late-visible fee',
            `Not visible in the initial fee baseline; now visible: “${text}”. First observed ${((Date.now() - started) / 1000).toFixed(1)}s after monitoring began.`,
            'A fee appeared after the baseline. It may be a late disclosure or a legitimate recalculation; verify the checkout total.',
            'Observed change',
          );
      }
    });
    baselineTaken = true;
    render();
  }
  function node(tag, text, className) {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (className) el.className = className;
    return el;
  }
  function button(text, fn) {
    const el = node('button', text);
    el.type = 'button';
    el.addEventListener('click', fn);
    return el;
  }
  function report() {
    return globalThis.NudgeProof.normalize({
      product: 'NudgeKavach / NudgeProof',
      version: '0.2.0',
      sessionId,
      exportedAt: new Date().toISOString(),
      page: location.origin + location.pathname,
      started: new Date(started).toISOString(),
      monitoring: enabled,
      findings: [...findings.values()].map(({ el, ...item }) => ({
        ...item,
        elementPresent: el.isConnected,
      })),
      timeline: [...timeline],
    });
  }

  // Presentation consumes the same normalized report as the desktop companion.
  function evidencePreview(f) {
    if (f.type === 'fees') return `${f.after} became visible after the initial fee baseline.`;
    if (f.type === 'urgency')
      return `${f.before} → ${f.after} after counting down. Inspect the sampled transition.`;
    if (f.type === 'prechecked') return f.after;
    if (f.type === 'shaming') return `Observed choice label: “${f.after}”`;
    return f.evidence[0];
  }
  let previousFindingCount = 0,
    renderedImpact = '',
    locatedKey = null,
    locateTimeout;
  function shieldIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', 'shield-icon');
    for (const d of [
      'M12 2 21 6v6c0 5-9 10-9 10S3 17 3 12V6Z',
      'M6.5 11.5s2-3 5.5-3 5.5 3 5.5 3-2 3-5.5 3-5.5-3-5.5-3Z',
    ]) {
      const shape = document.createElementNS(svg.namespaceURI, 'path');
      shape.setAttribute('d', d);
      svg.append(shape);
    }
    const pupil = document.createElementNS(svg.namespaceURI, 'circle');
    pupil.setAttribute('cx', '12');
    pupil.setAttribute('cy', '11.5');
    pupil.setAttribute('r', '1');
    svg.append(pupil);
    return svg;
  }
  function setText(el, text) {
    if (el.textContent !== String(text)) el.textContent = text;
  }
  function announce(text) {
    setText(shadow.querySelector('#announcement'), text);
  }
  function sessionClock() {
    if (!shadow) return;
    const elapsed = Math.floor((Date.now() - started) / 1000);
    setText(
      shadow.querySelector('#duration'),
      `${Math.floor(elapsed / 60)
        .toString()
        .padStart(2, '0')}:${(elapsed % 60).toString().padStart(2, '0')}`,
    );
  }
  function evidenceText(f) {
    return [
      `Finding #${f.findingId} · ${f.title}`,
      `Session: ${sessionId}`,
      `Evidence category: ${f.evidenceCategory}`,
      `Source: ${f.source}`,
      `First observed: ${f.firstSeen}`,
      '',
      'NudgeProof',
      `Before: ${f.before}`,
      `After: ${f.after}`,
      ...f.evidence,
      `Rule: ${f.rule}`,
      '',
      f.interpretation,
    ].join('\n');
  }
  async function copyEvidence(key, card) {
    const f = report().findings.find((item) => item.key === key);
    const text = evidenceText(f),
      status = card.querySelector('.copy-status');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      setText(status, 'Evidence copied.');
      card.querySelector('.copy-fallback').hidden = true;
    } catch {
      setText(status, 'Clipboard unavailable. Select and copy the text below.');
      const fallback = card.querySelector('.copy-fallback');
      fallback.value = text;
      fallback.hidden = false;
      fallback.focus();
      fallback.select();
    }
  }
  function drawHighlights() {
    const layer = shadow?.querySelector('#outlines');
    if (!layer) return;
    if (!highlight) {
      layer.replaceChildren();
      return;
    }
    const keep = new Set();
    for (const f of findings.values()) {
      if (!f.el.isConnected || !visible(f.el)) continue;
      const rect = f.el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight) continue;
      keep.add(f.key);
      let box = layer.querySelector(`[data-key="${f.key}"]`);
      if (!box) {
        box = node('div', undefined, 'outline');
        box.dataset.key = f.key;
        box.setAttribute('aria-hidden', 'true');
        box.append(node('span', `#${f.findingId}`, 'source-number'));
        layer.append(box);
      }
      box.classList.toggle('located', locatedKey === f.key);
      Object.assign(box.style, {
        left: `${rect.left - 3}px`,
        top: `${rect.top - 3}px`,
        width: `${rect.width + 6}px`,
        height: `${rect.height + 6}px`,
      });
      box.querySelector('.source-number').style.top = rect.top < 18 ? '0' : '-18px';
    }
    for (const box of [...layer.children]) if (!keep.has(box.dataset.key)) box.remove();
  }
  function locateEvidence(key) {
    const f = findings.get(key);
    if (!f?.el.isConnected || !visible(f.el)) {
      announce(
        'The original source is no longer visible. Its observation remains in session history.',
      );
      return;
    }
    highlight = true;
    shadow.querySelector('#highlights').setAttribute('aria-pressed', 'true');
    locatedKey = f.key;
    const previous = shadow.querySelector(`.outline[data-key="${f.key}"]`);
    if (previous) {
      previous.classList.remove('located');
      void previous.offsetWidth;
    }
    f.el.scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'center',
    });
    drawHighlights();
    clearTimeout(locateTimeout);
    locateTimeout = setTimeout(() => {
      locatedKey = null;
      drawHighlights();
    }, 1800);
    announce(`Located finding #${f.findingId}: ${f.title}. Its source is marked #${f.findingId}.`);
  }
  function selectView(name) {
    for (const tab of shadow.querySelectorAll('[data-view-tab]')) {
      const selected = tab.dataset.viewTab === name;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }
    for (const view of shadow.querySelectorAll('[data-view]'))
      view.hidden = view.dataset.view !== name;
    shadow.querySelector('main').scrollTop = 0;
  }
  function viewJourney(findingId) {
    selectView('journey');
    shadow.querySelector('#journey-details').open = true;
    const event = [...shadow.querySelectorAll('#events li')].find(
      (el) => el.dataset.findingId === findingId,
    );
    if (event) {
      event.querySelector('details').open = true;
      event.scrollIntoView({
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        block: 'nearest',
      });
      event.querySelector('summary').focus({ preventScroll: true });
    } else
      announce(
        `The original event for finding #${findingId} is outside the retained journey. Its evidence remains in Findings.`,
      );
  }
  function buildCard(f) {
    const card = node('article');
    card.dataset.key = f.key;
    card.dataset.category = f.evidenceCategory.toLowerCase().replaceAll(' ', '-');
    const topline = node('div', undefined, 'card-topline');
    topline.append(
      node('span', `#${f.findingId}`, 'finding-number'),
      node('small', f.evidenceCategory, 'confidence'),
    );
    card.append(topline, node('h3', f.title), node('p', evidencePreview(f), 'card-summary'));
    const actions = node('div', undefined, 'card-actions');
    const locate = button('Locate Evidence', () => locateEvidence(f.key));
    locate.className = 'locate';
    const detail = node('div', undefined, 'card-detail');
    detail.id = `finding-detail-${f.findingId}`;
    detail.hidden = true;
    const expand = button('Details', () => {
      detail.hidden = !detail.hidden;
      expand.setAttribute('aria-expanded', String(!detail.hidden));
      expand.textContent = detail.hidden ? 'Details' : 'Hide details';
    });
    expand.className = 'detail-toggle';
    expand.setAttribute('aria-expanded', 'false');
    expand.setAttribute('aria-controls', detail.id);
    actions.append(locate, expand);
    const proof = node('section', undefined, 'proof');
    proof.setAttribute('aria-label', 'NudgeProof');
    proof.append(node('h4', 'NudgeProof'));
    const transitions = node('dl', undefined, 'transitions');
    for (const [label, className] of [
      ['Before', 'before'],
      ['After', 'after'],
      ['Observed', 'observed'],
    ]) {
      const entry = node('div');
      entry.append(node('dt', label), node('dd', '', className));
      transitions.append(entry);
    }
    proof.append(
      transitions,
      node('p', '', 'evidence'),
      node('span', 'Rule matched', 'rule-label'),
      node('p', f.rule, 'rule'),
    );
    const why = node('section', undefined, 'explanation');
    why.append(node('h4', 'Why this may matter'), node('p', '', 'interpretation'));
    const limit = node('section', undefined, 'limitation');
    limit.append(node('h4', 'Limitation'), node('p', '', 'limitation-text'));
    const extraActions = node('div', undefined, 'card-actions secondary-actions');
    extraActions.append(
      button('Copy Evidence', () => copyEvidence(f.key, card)),
      button('View in Journey', () => viewJourney(f.findingId)),
    );
    const copyStatus = node('p', '', 'copy-status');
    copyStatus.setAttribute('role', 'status');
    const fallback = node('textarea', undefined, 'copy-fallback');
    fallback.readOnly = true;
    fallback.hidden = true;
    fallback.setAttribute('aria-label', `Evidence text for finding #${f.findingId}`);
    detail.append(proof, why, limit, extraActions, copyStatus, fallback);
    card.append(actions, node('p', '', 'source-status'), detail);
    return card;
  }
  function renderJourney(events) {
    const list = shadow.querySelector('#events'),
      keep = new Set();
    for (const e of events) {
      const key = JSON.stringify([e.at, e.elapsed, e.message]);
      keep.add(key);
      let item = [...list.children].find((el) => el.dataset.eventKey === key);
      if (item) continue;
      item = node('li');
      item.dataset.eventKey = key;
      if (e.findingId) item.dataset.findingId = e.findingId;
      const detail = node('details', undefined, 'event-detail'),
        summary = node('summary');
      const stamp = node(
        'time',
        new Date(e.at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }),
      );
      stamp.dateTime = e.at;
      stamp.title = e.at;
      const meta = node('span', undefined, 'event-meta');
      meta.append(
        stamp,
        node('span', e.findingId ? `#${e.findingId}` : 'SESSION', 'event-finding'),
      );
      summary.append(meta, node('span', e.message, 'event-message'));
      const evidence = node('div', undefined, 'event-evidence');
      evidence.append(
        node(
          'span',
          (e.eventType || 'observation').replaceAll('-', ' ').toUpperCase(),
          'event-type',
        ),
        node('p', e.evidence || e.message),
        node('small', `+${e.elapsed}s from session start`),
      );
      detail.append(summary, evidence);
      item.append(detail);
      list.append(item);
    }
    for (const item of [...list.children]) if (!keep.has(item.dataset.eventKey)) item.remove();
  }
  function renderImpact(impact) {
    const signature = JSON.stringify(impact);
    if (signature === renderedImpact) return;
    renderedImpact = signature;
    const target = shadow.querySelector('#impact-content');
    target.replaceChildren();
    const money = node('section', undefined, 'money-impact');
    money.append(node('h4', 'Money'));
    if (!impact.money.length)
      money.append(
        node('p', 'No unambiguous optional or late charge amount captured.', 'impact-note'),
      );
    for (const group of impact.money) {
      const format = (value) =>
        `${group.currency} ${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
      money.append(
        node('strong', format(group.total), 'money-total'),
        node('p', 'Observed optional / late charges', 'impact-note'),
      );
      const charges = node('ul', undefined, 'charge-list');
      for (const charge of group.charges)
        charges.append(
          node(
            'li',
            `#${charge.findingId} · ${format(charge.amount)} · ${charge.kind === 'fees' || /late/i.test(charge.kind) ? 'Late-visible fee' : 'Optional pre-selected charge'}`,
          ),
        );
      money.append(charges);
    }
    target.append(money);
    const metrics = node('div', undefined, 'impact-metrics');
    for (const [label, count, explanation] of [
      ['Choice', impact.choice, 'Choice-pressure findings'],
      ['Privacy', impact.privacy, 'Optional marketing / email choices'],
      ['Time pressure', impact.timePressure, 'Countdown findings'],
    ]) {
      const metric = node('section');
      metric.append(node('h4', label), node('strong', count), node('p', explanation));
      metrics.append(metric);
    }
    target.append(
      metrics,
      node(
        'p',
        'Recorded signals and amounts, not money saved. Amounts may overlap or be recalculated; verify the page total. Category counts can overlap.',
        'impact-note',
      ),
    );
  }
  function render() {
    if (!shadow) return;
    const snapshot = report(),
      impact = globalThis.NudgeProof.impact(snapshot);
    const count = snapshot.findings.length,
      patterns = new Set(snapshot.findings.map((f) => f.type)).size;
    setText(shadow.querySelector('#count'), `${count} ${count === 1 ? 'finding' : 'findings'}`);
    setText(shadow.querySelector('#finding-total'), count);
    setText(shadow.querySelector('#pattern-total'), patterns);
    setText(shadow.querySelector('#behavior-total'), impact.behavioralChanges);
    setText(shadow.querySelector('#monitor-status'), enabled ? 'Monitoring' : 'Paused');
    shadow.querySelector('#monitor-status').dataset.state = enabled ? 'monitoring' : 'paused';
    setText(shadow.querySelector('#launcher-count'), count);
    setText(
      shadow.querySelector('#empty-monitor'),
      enabled
        ? 'NudgeKavach is continuing monitoring. Some signals only become visible after interaction or over time.'
        : 'Monitoring is paused. Resume to observe changes; activity during the pause is unknown.',
    );
    sessionClock();
    if (count > previousFindingCount) {
      const launcher = shadow.querySelector('#launcher');
      launcher.classList.remove('new-finding');
      void launcher.offsetWidth;
      launcher.classList.add('new-finding');
      launcher.addEventListener('animationend', () => launcher.classList.remove('new-finding'), {
        once: true,
      });
      announce(
        `${count} ${count === 1 ? 'observation' : 'observations'} in this session. Open NudgeKavach to inspect the evidence.`,
      );
    }
    previousFindingCount = count;
    const list = shadow.querySelector('#findings');
    // Retained cards preserve expansion, keyboard focus and text selection during scans.
    for (const f of snapshot.findings) {
      let card = list.querySelector(`[data-key="${f.key}"]`);
      if (!card) {
        card = buildCard(f);
        list.append(card);
      }
      setText(card.querySelector('.card-summary'), evidencePreview(f));
      setText(card.querySelector('.evidence'), f.evidence.join('\n'));
      setText(card.querySelector('.before'), f.before);
      setText(card.querySelector('.after'), f.after);
      setText(
        card.querySelector('.observed'),
        new Date(f.firstSeen).toLocaleTimeString([], { hour12: false }),
      );
      card.querySelector('.observed').title = f.firstSeen;
      setText(card.querySelector('.rule'), f.rule);
      const split = f.interpretation.indexOf('. ') + 1;
      setText(
        card.querySelector('.interpretation'),
        split > 0 ? f.interpretation.slice(0, split) : f.interpretation,
      );
      setText(
        card.querySelector('.limitation-text'),
        split > 0 ? f.interpretation.slice(split + 1) : f.limitation,
      );
      const source = findings.get(f.key)?.el,
        present = source?.isConnected && visible(source);
      card.querySelector('.locate').disabled = !present;
      setText(
        card.querySelector('.source-status'),
        present ? '' : 'Source no longer visible · retained in session history',
      );
    }
    shadow.querySelector('#empty').hidden = count > 0;
    renderJourney(snapshot.timeline);
    renderImpact(impact);
    drawHighlights();
  }
  function schedule() {
    if (!pending && enabled)
      pending = setTimeout(() => {
        pending = null;
        scan();
      }, 180);
  }
  function boot() {
    if (booted || !document.body) return;
    booted = true;
    host = document.createElement('nudge-kavach');
    host.style.cssText =
      'all:initial!important;position:fixed!important;inset:0!important;pointer-events:none!important;z-index:2147483647!important;';
    shadow = host.attachShadow({ mode: 'closed' });
    const style = node('style');
    style.textContent = `
      :host{color-scheme:dark;font:13px/1.55 system-ui,-apple-system,Segoe UI,sans-serif;color:#f2f4ee}
      *{box-sizing:border-box}button{cursor:pointer;font:inherit}button:disabled{cursor:default;opacity:.55}
      button:focus-visible,summary:focus-visible,textarea:focus-visible,[tabindex]:focus-visible{outline:2px solid #c7f36b;outline-offset:3px}
      button{border:1px solid #49685c;background:#1b332d;color:#f2f4ee;border-radius:8px;padding:9px 11px;transition:background 160ms,border-color 160ms}
      button:hover:not(:disabled){background:#304d3d;border-color:#82a08d}.shield-icon{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linejoin:round;flex:none}
      #launcher{position:fixed;right:20px;bottom:20px;display:flex;align-items:center;gap:10px;border:1px solid #d9ffa0;border-radius:13px;padding:12px 15px;background:#c7f36b;color:#14241d;box-shadow:0 8px 32px #04160b40;font:650 13px system-ui;pointer-events:auto}
      #launcher:hover{background:#d6ff86;color:#14241d}#launcher-count{border-left:1px solid #72894666;padding-left:10px;font-variant-numeric:tabular-nums}#launcher.new-finding{animation:notification 240ms ease-out}#launcher[aria-expanded=true]{background:#1b332d;border-color:#729258;color:#c7f36b}
      #panel{font:13px/1.55 system-ui,-apple-system,Segoe UI,sans-serif;color:#f2f4ee;position:fixed;right:18px;top:18px;bottom:86px;width:min(420px,calc(100vw - 36px));display:flex;flex-direction:column;overflow:hidden;background:#10221f;border:1px solid #476253;border-radius:16px;box-shadow:0 18px 70px #03150c55;pointer-events:auto;animation:panel-in 200ms ease-out}
      header{padding:18px 18px 0;border-bottom:1px solid #3b5448;background:#10221f;flex:none}.brand-row,.brand,.status-row{display:flex;align-items:center}.brand-row{justify-content:space-between;gap:8px}.brand{gap:9px}.brand .shield-icon{color:#c7f36b;width:30px;height:30px}h2{margin:0;font-size:20px;letter-spacing:-.6px;font-weight:650}.eyebrow{margin:1px 0 0;color:#a7b7af;font-size:10px}
      #close{font-size:19px;line-height:1;padding:8px 11px;background:transparent;border-color:transparent;color:#bbcfc0}.status-row{justify-content:space-between;font-size:11px;margin:15px 0 6px;color:#a7b7af}#count{font-variant-numeric:tabular-nums;color:#d9e7dc}#monitor-status:before{content:'';display:inline-block;width:6px;height:6px;border-radius:50%;background:#c7f36b;margin-right:7px}#monitor-status[data-state=paused]:before{background:#ed942f}.trust-line{font-size:9px;letter-spacing:1px;color:#c7f36b;margin:0 0 13px}
      .audit-controls{display:flex;gap:7px;margin:0 0 14px}.audit-controls button{font-size:11px;flex:1;padding:8px 6px}#highlights[aria-pressed=true]{color:#f0c792;border-color:#907047}#export{color:#c7f36b}.view-tabs{display:flex;margin:0 -18px;padding:0 10px}.view-tabs button{flex:1;background:transparent;border:0;border-bottom:2px solid transparent;border-radius:0;padding:13px 3px;font-size:10px;letter-spacing:1px;color:#a7b7af}.view-tabs button[aria-selected=true]{border-bottom-color:#c7f36b;color:#c7f36b}
      main{padding:16px;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#607d64 transparent;min-height:0}.audit-summary{padding:13px 0 16px;border-bottom:1px solid #355147;margin-bottom:16px}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.stat strong{display:block;color:#f2f4ee;font-size:23px;line-height:1.3;font-weight:550;font-variant-numeric:tabular-nums}.stat:last-child strong{font-size:18px;padding-top:4px}.stat span{display:block;font-size:9px;color:#a7b7af;margin-top:4px}.summary-note{font-size:9px;color:#a7b7af;margin:9px 0 0}.session-note{margin:0 1px 15px;font-size:11px;color:#a7b7af;line-height:1.6}
      article{padding:15px;background:#1b332d;border:1px solid #3d594c;border-radius:12px;margin-bottom:11px;animation:card-in 180ms ease-out;overflow-wrap:anywhere}.card-topline{display:flex;justify-content:space-between;align-items:center;gap:8px}.finding-number{font:600 11px ui-monospace,monospace;color:#edb56e}.confidence{font-size:8px;letter-spacing:.6px;color:#c7f36b;border:1px solid #4c634a;border-radius:5px;padding:3px 6px}[data-category=observed-change] .confidence{color:#f0c792;border-color:#816747}[data-category=observed-behavior] .confidence{color:#b6dfd2;border-color:#557e72}[data-category=heuristic] .confidence{color:#d2d4e5;border-color:#737887}
      h3{font-size:16px;letter-spacing:-.25px;line-height:1.35;margin:10px 0 6px}.card-summary{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;margin:0;color:#bfcfc6;font-size:11px;line-height:1.6}.card-actions{display:flex;gap:8px;margin-top:13px}.card-actions button{font-size:10px;padding:8px 10px}.card-actions .locate{color:#f3c996;border-color:#937249;flex:1}.detail-toggle{min-width:80px}.card-detail{padding-top:15px}.secondary-actions button{flex:1}.copy-status,.source-status{font-size:10px;line-height:1.5;margin:8px 0 0;color:#d3d6bd}.copy-status:empty,.source-status:empty{display:none}.copy-fallback{width:100%;min-height:125px;border:1px solid #70866b;border-radius:8px;background:#10221f;color:#f2f4ee;margin-top:8px;padding:10px;resize:vertical;font:12px/1.5 system-ui}
      h4{font-size:9px;letter-spacing:.7px;font-weight:650;margin:0 0 6px;text-transform:uppercase}.proof{background:#10221f;border:1px solid #3e5544;border-radius:9px;padding:12px;margin-bottom:13px}.proof h4{color:#c7f36b;font-size:10px}.transitions{margin:10px 0}.transitions>div{display:grid;grid-template-columns:52px 1fr;gap:8px;margin:7px 0}.transitions dt{font-size:10px;color:#a7b7af}.transitions dd{font-size:11px;margin:0;user-select:text}.evidence{white-space:pre-line;font:11px/1.65 system-ui;margin:11px 0;color:#f2f4ee;user-select:text}.rule-label{font-size:9px;text-transform:uppercase;letter-spacing:.5px;color:#a7b7af}.rule{margin:4px 0 0;font-size:10px;line-height:1.55;color:#bfcfc6}.explanation p,.limitation p{font-size:11px;line-height:1.6;margin:0}.explanation{margin-bottom:11px}.explanation h4{color:#d5e4d8}.explanation p{color:#c4d5c8}.limitation{padding-left:10px;border-left:2px solid #9c7946}.limitation h4{color:#eac490}.limitation p{color:#c7cbbd}
      #empty{border:1px dashed #58745c;border-radius:12px;padding:25px 19px;text-align:center;margin:0 0 20px;background:#162b26}#empty .shield-icon{color:#c7f36b;width:32px;height:32px;margin-bottom:8px}#empty h3{font-size:16px}#empty p{font-size:12px;color:#a7b7af;line-height:1.7}#empty .empty-caveat{font-size:11px;color:#d1ddca;padding-top:13px;border-top:1px solid #405849;margin-bottom:0}
      .section-heading{font-size:11px;letter-spacing:1.2px;color:#c7f36b;margin:0 0 8px}.journey-note,.impact-note{font-size:10px;line-height:1.65;color:#a7b7af;margin:7px 0 12px}#journey-details>summary,#impact>summary{cursor:pointer;font-size:11px;font-weight:650;letter-spacing:.8px;color:#c7f36b;padding:11px 0}#events{list-style:none;padding:0;margin:7px 0}#events li{border-left:1px solid #496457;padding:0 0 14px 13px;margin-left:3px}.event-detail{background:#162b26;border:1px solid #355147;border-radius:8px}.event-detail summary{cursor:pointer;padding:10px;list-style:none}.event-detail summary:after{content:'+';float:right;color:#a7b7af;font-size:13px}.event-detail[open] summary:after{content:'−'}.event-meta{display:flex;align-items:center;gap:10px;margin-bottom:5px}.event-meta time{font:10px ui-monospace,monospace;color:#c7f36b}.event-finding{font:9px ui-monospace,monospace;color:#edb56e}.event-message{font-size:11px;line-height:1.6;color:#f2f4ee}.event-evidence{padding:0 10px 10px}.event-type{color:#a7b7af;font-size:8px;letter-spacing:1px}.event-evidence p{font-size:11px;margin:6px 0;user-select:text}.event-evidence small{color:#a7b7af;font-size:9px}
      #impact{border-top:1px solid #355147;margin-top:20px;padding-top:6px}.money-impact{background:#162b26;padding:13px;border:1px solid #355147;border-radius:10px}.money-total{font-size:24px;font-weight:500;display:block;color:#f2f4ee}.charge-list{list-style:none;padding:0;margin:0;font-size:10px;color:#c6d2c9}.charge-list li{margin:6px 0}.impact-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:15px 0}.impact-metrics h4{font-size:8px;color:#c7f36b}.impact-metrics strong{font-size:23px;font-weight:500}.impact-metrics p{font-size:9px;color:#a7b7af;margin:5px 0}
      .pro-preview{padding:18px;background:#162b26;border:1px solid #4a6141;border-radius:12px}.pro-badge{display:inline-block;color:#c7f36b;border:1px solid #6b8446;border-radius:5px;padding:3px 7px;font-size:9px;letter-spacing:1px}.pro-preview h3{font-size:22px;line-height:1.3;margin:16px 0 10px}.pro-preview p{font-size:12px;color:#a7b7af;line-height:1.7}.future-actions{padding-left:17px;color:#c9d6ce;font-size:11px;line-height:1.7}.future-actions li{margin:9px 0}.pro-preview button{width:100%;margin-top:8px;font-size:10px;letter-spacing:.7px;background:#2c3e2a;color:#bfd696;border-color:#647d42}.pro-preview .coming{color:#c7f36b;font-size:10px;text-align:center;margin-bottom:0}.product-line{font-size:10px;color:#a7b7af;padding-top:15px;text-align:center}
      .outline{position:fixed;border:2px solid #ed942f;border-radius:5px;box-shadow:0 0 0 2px #fff9;pointer-events:none}.outline.located{animation:evidence-pulse 600ms ease-out 2;box-shadow:0 0 0 3px #fff9,0 0 18px #ed942f70}.source-number{position:absolute;left:-2px;min-width:29px;height:21px;display:grid;place-items:center;padding:0 4px;border-radius:4px;background:#ed942f;color:#261807;font:700 10px system-ui;box-shadow:0 2px 5px #0003}
      .sr-only{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}[hidden]{display:none!important}
      @keyframes panel-in{from{opacity:0;transform:translateX(10px)}to{opacity:1;transform:none}}@keyframes card-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}@keyframes notification{50%{box-shadow:0 0 0 6px #c7f36b30,0 8px 32px #04160b40}}@keyframes evidence-pulse{50%{box-shadow:0 0 0 6px #ed942f55,0 0 20px #ed942f70}}
      @media(max-width:600px){#panel{width:calc(100vw - 24px);right:12px;top:auto;bottom:78px;height:min(72dvh,680px);max-height:calc(100dvh - 94px)}#launcher{right:12px;bottom:14px;padding:11px 13px}header{padding:13px 16px 0}.view-tabs{margin:0 -16px}.trust-line{margin-bottom:10px}.audit-controls{margin-bottom:7px}main{padding:13px}#panel h2{font-size:19px}.stat strong{font-size:21px}}
      @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
    `;
    shadow.append(style, Object.assign(node('div'), { id: 'outlines' }));
    const announcement = node('div', '', 'sr-only');
    announcement.id = 'announcement';
    announcement.setAttribute('role', 'status');
    shadow.append(announcement);
    const panel = node('section');
    panel.id = 'panel';
    panel.hidden = true;
    panel.setAttribute('aria-label', 'NudgeKavach live audit');
    const header = node('header'),
      brandRow = node('div', undefined, 'brand-row'),
      brand = node('div', undefined, 'brand');
    const brandText = node('div');
    brandText.append(
      node('h2', 'NudgeKavach'),
      node('p', 'Interface Manipulation Auditor', 'eyebrow'),
    );
    brand.append(shieldIcon(), brandText);
    const close = button('×', () => toggle(false));
    close.id = 'close';
    close.title = 'Hide panel';
    close.setAttribute('aria-label', 'Hide panel');
    brandRow.append(brand, close);
    const statusRow = node('div', undefined, 'status-row'),
      status = node('span'),
      count = node('span');
    status.id = 'monitor-status';
    count.id = 'count';
    statusRow.append(status, count);
    const controls = node('div', undefined, 'audit-controls');
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', 'Audit controls');
    const highlights = button('Highlights', () => {
      highlight = !highlight;
      highlights.setAttribute('aria-pressed', String(highlight));
      drawHighlights();
    });
    highlights.id = 'highlights';
    highlights.setAttribute('aria-pressed', 'true');
    const exportButton = button('Export JSON', () => {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(report(), null, 2)], { type: 'application/json' }),
      );
      const a = node('a');
      a.href = url;
      a.download = 'nudgeproof.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      announce('NudgeProof report download requested. Import this JSON in NudgeKavach Desktop.');
    });
    exportButton.id = 'export';
    exportButton.title = 'Export NudgeProof report for the desktop workspace';
    const pause = button('Pause', () => {
      enabled = !enabled;
      pause.textContent = enabled ? 'Pause' : 'Resume';
      log(
        enabled ? 'Monitoring resumed; changes during pause are unknown.' : 'Monitoring paused.',
        { eventType: enabled ? 'monitoring-resumed' : 'monitoring-paused' },
      );
      if (enabled) scan();
      else render();
    });
    controls.append(highlights, exportButton, pause);
    const tabs = node('nav', undefined, 'view-tabs');
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Audit views');
    for (const name of ['findings', 'journey', 'protect']) {
      const tab = button(name.toUpperCase(), () => selectView(name));
      tab.id = `tab-${name}`;
      tab.dataset.viewTab = name;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', `view-${name}`);
      tab.setAttribute('aria-selected', String(name === 'findings'));
      tab.tabIndex = name === 'findings' ? 0 : -1;
      tabs.append(tab);
    }
    tabs.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const items = [...tabs.children],
        current = items.indexOf(event.target);
      const index =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? items.length - 1
            : (current + (event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
      selectView(items[index].dataset.viewTab);
      items[index].focus();
    });
    header.append(
      brandRow,
      statusRow,
      node('p', 'LOCAL ANALYSIS • NO PAGE UPLOAD', 'trust-line'),
      controls,
      tabs,
    );
    panel.append(header);
    const main = node('main'),
      summary = node('section', undefined, 'audit-summary');
    summary.setAttribute('aria-label', 'Live audit summary');
    const stats = node('div', undefined, 'stats');
    for (const [id, label] of [
      ['finding-total', 'Observations'],
      ['pattern-total', 'Pattern types'],
      ['behavior-total', 'Behavioral changes'],
      ['duration', 'Session'],
    ]) {
      const stat = node('div', undefined, 'stat'),
        value = node('strong', '0');
      value.id = id;
      stat.append(value, node('span', label));
      stats.append(stat);
    }
    summary.append(
      stats,
      node('p', 'Behavioral changes count retained observed countdown jumps.', 'summary-note'),
    );
    main.append(summary);
    const views = {};
    for (const name of ['findings', 'journey', 'protect']) {
      const view = node('section');
      view.id = `view-${name}`;
      view.dataset.view = name;
      view.setAttribute('role', 'tabpanel');
      view.setAttribute('aria-labelledby', `tab-${name}`);
      view.hidden = name !== 'findings';
      views[name] = view;
      main.append(view);
    }
    views.findings.append(
      node(
        'p',
        'Evidence before judgement. Observations remain as session history.',
        'session-note',
      ),
    );
    const empty = node('section');
    empty.id = 'empty';
    const emptyText = node('p');
    emptyText.id = 'empty-monitor';
    empty.append(
      shieldIcon(),
      node('h3', 'No covered manipulation signals observed'),
      emptyText,
      node(
        'p',
        'Zero findings does not guarantee a page is safe or fair. Patterns outside current coverage may be missed.',
        'empty-caveat',
      ),
    );
    const list = node('div');
    list.id = 'findings';
    views.findings.append(empty, list);
    const impact = node('details');
    impact.id = 'impact';
    impact.append(node('summary', 'IMPACT · Observed signals'));
    const impactContent = node('div');
    impactContent.id = 'impact-content';
    impact.append(impactContent);
    views.findings.append(impact);
    const journey = node('details');
    journey.id = 'journey-details';
    journey.open = true;
    journey.append(
      node('summary', 'CHOICE JOURNEY'),
      node(
        'p',
        'TIMELINE · Retained observed events, oldest to newest. Expand an event for its evidence. Times are local to this browser; activity during pauses is unknown.',
        'journey-note',
      ),
    );
    const events = node('ol');
    events.id = 'events';
    journey.append(events);
    views.journey.append(journey);
    const preview = node('section', undefined, 'pro-preview');
    preview.append(
      node('span', 'PRO PREVIEW', 'pro-badge'),
      node('h3', 'Protect Mode — Pro Preview'),
      node(
        'p',
        'A future way to preview a page with interface pressure reduced. These page-changing actions are not available in this version.',
      ),
    );
    const futures = node('ul', undefined, 'future-actions');
    for (const text of [
      'Remove optional preselection',
      'Normalize Accept / Reject prominence',
      'Neutralize confirm-shaming copy',
      'Visually flag suspicious urgency',
      'Review optional charges before checkout',
    ])
      futures.append(node('li', text));
    const futureButton = button('MAKE THIS PAGE FAIR', () => {});
    futureButton.disabled = true;
    futureButton.setAttribute('aria-describedby', 'protect-status');
    const coming = node('p', 'Coming in Pro · Preview only', 'coming');
    coming.id = 'protect-status';
    preview.append(futures, futureButton, coming);
    views.protect.append(
      preview,
      node(
        'p',
        'The current audit observes and highlights. It does not change your choices.',
        'product-line',
      ),
    );
    panel.append(main);
    const launcher = button('', () => toggle(panel.hidden));
    launcher.id = 'launcher';
    launcher.append(shieldIcon(), node('span', 'NudgeKavach'));
    const launcherCount = node('span', '0');
    launcherCount.id = 'launcher-count';
    launcherCount.setAttribute('aria-hidden', 'true');
    launcher.append(launcherCount);
    launcher.title = 'Open NudgeKavach';
    launcher.setAttribute('aria-label', 'Open NudgeKavach');
    launcher.setAttribute('aria-controls', 'panel');
    launcher.setAttribute('aria-expanded', 'false');
    panel.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        toggle(false);
      }
    });
    shadow.append(panel, launcher);
    document.body.append(host);
    log('Local monitoring started; first visible state is the baseline.', {
      eventType: 'monitoring-started',
    });
    scan();
    observer = new MutationObserver((records) => {
      if (records.some((r) => !own(r.target))) schedule();
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['checked', 'hidden', 'style', 'class', 'aria-hidden', 'aria-checked'],
    });
    // Poll property-only checkbox changes and CSS/layout changes not exposed as mutations.
    interval = setInterval(() => {
      scan();
      sessionClock();
    }, 1000);
  }
  function toggle(open = true) {
    if (!booted) boot();
    if (!shadow) return;
    const panel = shadow.querySelector('#panel'),
      launcher = shadow.querySelector('#launcher'),
      changed = panel.hidden === open;
    panel.hidden = !open;
    launcher.setAttribute('aria-expanded', String(open));
    launcher.setAttribute('aria-label', open ? 'Close NudgeKavach' : 'Open NudgeKavach');
    launcher.title = open ? 'Close NudgeKavach' : 'Open NudgeKavach';
    render();
    if (changed) (open ? shadow.querySelector('#close') : launcher).focus({ preventScroll: true });
  }
  function interaction(event) {
    if (!event.isTrusted || own(event.target)) return;
    const target = event.target;
    if (target.matches?.('input[type="checkbox"], [role="checkbox"]')) touched.add(target);
    const roleBox = target.closest?.('[role="checkbox"]');
    if (roleBox) touched.add(roleBox);
    const label = target.closest?.('label');
    if (label?.control) touched.add(label.control);
  }
  document.addEventListener('pointerdown', interaction, true);
  document.addEventListener('keydown', interaction, true);
  document.addEventListener('change', schedule, true);
  window.addEventListener('scroll', drawHighlights, true);
  window.addEventListener('resize', schedule);
  globalThis.__nudgeKavach = { report, scan, toggle };
  if (globalThis.chrome?.runtime?.onMessage)
    chrome.runtime.onMessage.addListener((message, sender, reply) => {
      if (message.type === 'NK_OPEN') {
        toggle(true);
        reply({ ok: true, count: findings.size });
      }
      if (message.type === 'NK_REPORT') reply(report());
    });
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
