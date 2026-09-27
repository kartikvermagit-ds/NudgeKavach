(() => {
  'use strict';
  if (globalThis.__nudgeKavach) return;
  const R = globalThis.NudgeRules;
  const started = Date.now();
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
  function log(message) {
    timeline.push({
      at: new Date().toISOString(),
      elapsed: ((Date.now() - started) / 1000).toFixed(1),
      message,
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
        type,
        title,
        evidence: [],
        interpretation,
        confidence,
        firstSeen: new Date().toISOString(),
        el,
      };
      findings.set(key, item);
      log(title);
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
      );
      lastUrl = location.href;
    }
    document.querySelectorAll('input[type="checkbox"]').forEach((el) => {
      if (!visible(el) || checkedSeen.has(el)) return;
      checkedSeen.add(el);
      const label = labelFor(el);
      if (el.checked && !el.required && R.optional(label) && !touched.has(el)) {
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
        const measure = (x) => ({
          area: x.getBoundingClientRect().width * x.getBoundingClientRect().height,
          font: parseFloat(getComputedStyle(x).fontSize),
        });
        const a = measure(el),
          b = measure(reject),
          p = R.prominence(a, b);
        if (p.flag)
          add(
            'prominence',
            el,
            'Unequal choice prominence',
            `“${text}” vs “${choiceText(reject)}”: area ${p.areaRatio.toFixed(2)}×; font ${p.fontRatio.toFixed(2)}×. Threshold: area ≥2.5× or font ≥1.5×.`,
            'Acceptance occupies more visual space than rejection. This geometric signal does not assess intent or accessibility.',
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
          log(`Timer baseline: ${text}`);
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
            log(`Countdown jumped ${state.previous}s → ${seconds}s`);
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
    return {
      product: 'NudgeKavach / NudgeProof',
      version: '0.1.0',
      page: location.origin + location.pathname,
      started: new Date(started).toISOString(),
      monitoring: enabled,
      findings: [...findings.values()].map(({ el, ...item }) => ({
        ...item,
        elementPresent: el.isConnected,
      })),
      timeline: [...timeline],
    };
  }

  // Presentation-only descriptions. Exported observations and detector rules remain unchanged.
  const cardCopy = {
    prechecked: {
      summary: 'An optional choice was checked when first observed.',
      rule: 'A visible, non-required optional checkbox was first seen checked without observed user interaction.',
    },
    prominence: {
      summary: 'Acceptance has more visual prominence than rejection.',
      rule: 'Accept area ≥2.5× Reject area, or Accept font ≥1.5× Reject font.',
    },
    urgency: {
      summary: 'A countdown increased after counting down.',
      rule: 'An increase of more than 2 seconds after at least 2 descending samples in an offer context.',
    },
    fees: {
      summary: 'A fee became visible after the initial baseline.',
      rule: 'Visible monetary fee text was absent from the first visible fee baseline.',
    },
    shaming: {
      summary: 'A decline label matched a guilt-related phrase.',
      rule: 'A choice label matched a local guilt or negative-self-description phrase rule.',
    },
  };
  let previousFindingCount = 0,
    renderedTimeline = '',
    locatedKey = null;
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
      f.title,
      `Evidence type: ${f.confidence}`,
      `First observed: ${f.firstSeen}`,
      '',
      'NudgeProof',
      ...f.evidence,
      `Rule: ${cardCopy[f.type].rule}`,
      '',
      f.interpretation,
    ].join('\n');
  }
  async function copyEvidence(f, card) {
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
    let number = 0;
    for (const f of findings.values()) {
      number++;
      if (!f.el.isConnected || !visible(f.el)) continue;
      const rect = f.el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight) continue;
      keep.add(f.key);
      let box = layer.querySelector(`[data-key="${f.key}"]`);
      if (!box) {
        box = node('div', undefined, 'outline');
        box.dataset.key = f.key;
        box.setAttribute('aria-hidden', 'true');
        box.append(node('span', number, 'source-number'));
        layer.append(box);
      }
      box.classList.toggle('located', locatedKey === f.key);
      Object.assign(box.style, {
        left: `${rect.left - 3}px`,
        top: `${rect.top - 3}px`,
        width: `${rect.width + 6}px`,
        height: `${rect.height + 6}px`,
      });
      box.querySelector('.source-number').style.top = rect.top < 18 ? '0' : '-16px';
    }
    for (const box of [...layer.children]) if (!keep.has(box.dataset.key)) box.remove();
  }
  function buildCard(f, number) {
    const card = node('article');
    card.dataset.key = f.key;
    card.dataset.category = f.confidence.toLowerCase().replaceAll(' ', '-');
    const topline = node('div', undefined, 'card-topline');
    topline.append(
      node('span', String(number).padStart(2, '0'), 'finding-number'),
      node('small', f.confidence, 'confidence'),
    );
    card.append(topline, node('h3', f.title), node('p', cardCopy[f.type].summary, 'card-summary'));
    const proof = node('section', undefined, 'proof');
    proof.setAttribute('aria-label', 'NudgeProof');
    proof.append(
      node('h4', 'NudgeProof'),
      node('p', '', 'evidence'),
      node('span', 'Rule matched', 'rule-label'),
      node('p', cardCopy[f.type].rule, 'rule'),
    );
    const why = node('section', undefined, 'explanation');
    why.append(node('h4', 'Why it matters'), node('p', '', 'interpretation'));
    const limit = node('section', undefined, 'limitation');
    limit.append(node('h4', 'Limitation'), node('p', '', 'limitation-text'));
    const actions = node('div', undefined, 'card-actions');
    const locate = button('Locate on page', () => {
      if (f.el.isConnected && visible(f.el)) {
        locatedKey = f.key;
        f.el.scrollIntoView({
          behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
          block: 'center',
        });
        drawHighlights();
        announce(
          `Located finding ${number}: ${f.title}. The source is marked ${number} when highlights are on.`,
        );
      } else
        announce(
          'The original source is no longer visible. Its observation remains in session history.',
        );
    });
    locate.className = 'locate';
    actions.append(
      locate,
      button('Copy evidence', () => copyEvidence(f, card)),
    );
    const copyStatus = node('p', '', 'copy-status');
    copyStatus.setAttribute('role', 'status');
    const fallback = node('textarea', undefined, 'copy-fallback');
    fallback.readOnly = true;
    fallback.hidden = true;
    fallback.setAttribute('aria-label', `Evidence text for ${f.title}`);
    card.append(proof, why, limit, actions, node('p', '', 'source-status'), copyStatus, fallback);
    return card;
  }
  function render() {
    if (!shadow) return;
    const count = findings.size,
      patterns = new Set([...findings.values()].map((f) => f.type)).size;
    setText(shadow.querySelector('#count'), `${count} ${count === 1 ? 'finding' : 'findings'}`);
    setText(shadow.querySelector('#finding-total'), count);
    setText(shadow.querySelector('#pattern-total'), patterns);
    setText(shadow.querySelector('#monitor-status'), enabled ? 'Monitoring' : 'Paused');
    shadow.querySelector('#monitor-status').dataset.state = enabled ? 'monitoring' : 'paused';
    setText(shadow.querySelector('#launcher-count'), count);
    setText(
      shadow.querySelector('#empty-monitor'),
      enabled
        ? 'NudgeKavach is still monitoring this page. Some behaviors only become visible after interaction or over time.'
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
    let number = 0;
    // Retain cards and controls: a live scan must not move focus or reset selection.
    for (const f of findings.values()) {
      number++;
      let card = list.querySelector(`[data-key="${f.key}"]`);
      if (!card) {
        card = buildCard(f, number);
        list.append(card);
      }
      setText(card.querySelector('.evidence'), f.evidence.join('\n'));
      // Separate the existing interpretation at its first sentence without rewriting it.
      const split = f.interpretation.indexOf('. ') + 1;
      setText(
        card.querySelector('.interpretation'),
        split > 0 ? f.interpretation.slice(0, split) : f.interpretation,
      );
      setText(
        card.querySelector('.limitation-text'),
        split > 0
          ? f.interpretation.slice(split + 1)
          : 'This observation does not establish intent.',
      );
      const present = f.el.isConnected && visible(f.el);
      card.querySelector('.locate').disabled = !present;
      setText(
        card.querySelector('.source-status'),
        present ? '' : 'Source no longer visible · retained in session history',
      );
    }
    shadow.querySelector('#empty').hidden = count > 0;
    const eventSlice = timeline.slice(-30),
      signature = JSON.stringify(eventSlice);
    if (signature !== renderedTimeline) {
      const events = shadow.querySelector('#events');
      events.replaceChildren();
      for (const e of eventSlice) {
        const item = node('li'),
          stamp = node(
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
        const symbol = /countdown|timer/i.test(e.message)
          ? '↻'
          : /paused/i.test(e.message)
            ? 'Ⅱ'
            : '•';
        const marker = node('span', symbol, 'event-marker');
        marker.setAttribute('aria-hidden', 'true');
        item.append(
          marker,
          stamp,
          node('p', e.message),
          node('small', `+${e.elapsed}s from session start`),
        );
        events.append(item);
      }
      renderedTimeline = signature;
    }
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
      :host{color-scheme:dark;font:13px/1.55 system-ui,-apple-system,Segoe UI,sans-serif;color:#eef6ef}
      *{box-sizing:border-box}button{cursor:pointer;font:inherit}button:disabled{cursor:default;opacity:.5}
      button:focus-visible,summary:focus-visible,textarea:focus-visible{outline:2px solid #c7f36b;outline-offset:3px}
      button{border:1px solid #49685c;background:#213c32;color:#eef6ef;border-radius:10px;padding:9px 11px;transition:background 160ms,border-color 160ms}
      button:hover:not(:disabled){background:#304d3d;border-color:#82a08d}
      .shield-icon{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linejoin:round;flex:none}
      #launcher{position:fixed;right:20px;bottom:20px;display:flex;align-items:center;gap:10px;border:1px solid #d9ffa0;border-radius:16px;padding:12px 15px;background:#c7f36b;color:#14241d;box-shadow:0 8px 32px #04160b40;font:650 13px system-ui;pointer-events:auto}
      #launcher:hover{background:#d6ff86;color:#14241d}#launcher-count{border-left:1px solid #72894666;padding-left:10px;font-variant-numeric:tabular-nums}
      #launcher.new-finding{animation:notification 240ms ease-out}#launcher[aria-expanded=true]{background:#1b332d;border-color:#729258;color:#c7f36b}
      #panel{font:13px/1.55 system-ui,-apple-system,Segoe UI,sans-serif;color:#eef6ef;position:fixed;right:18px;top:18px;bottom:86px;width:min(410px,calc(100vw - 36px));display:flex;flex-direction:column;overflow:hidden;background:#10221ff5;backdrop-filter:blur(16px);border:1px solid #476253;border-radius:18px;box-shadow:0 18px 70px #03150c55;pointer-events:auto;animation:panel-in 200ms ease-out}
      header{padding:20px 18px 14px;border-bottom:1px solid #3b5448;background:#10221f;flex:none}
      .brand-row,.brand,.status-row{display:flex;align-items:center}.brand-row{justify-content:space-between;gap:8px}.brand{gap:9px}.brand .shield-icon{color:#c7f36b;width:29px;height:29px}
      h2{margin:0;font-size:20px;letter-spacing:-.6px;font-weight:650}.eyebrow{margin:1px 0 0;color:#a9c0b1;letter-spacing:1.3px;font-size:9px;text-transform:uppercase}
      #close{font-size:19px;line-height:1;padding:8px 11px;background:transparent;border-color:transparent;color:#bbcfc0}
      .status-row{justify-content:space-between;font-size:11px;margin:15px 0 13px;color:#b5cdbb}#count{font-variant-numeric:tabular-nums;color:#d9e7dc}
      #monitor-status:before{content:'';display:inline-block;width:6px;height:6px;border-radius:50%;background:#c7f36b;margin-right:7px}#monitor-status[data-state=paused]:before{background:#edb76d}
      nav{display:flex;gap:7px}nav button{font-size:11px;flex:1;padding:8px 6px;background:#1b332d}#highlights[aria-pressed=true]{color:#edc48e;border-color:#907047}#export{color:#c7f36b}
      main{padding:16px;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#607d64 transparent}
      .audit-summary{padding:15px 16px;border:1px solid #49603f;border-radius:15px;background:linear-gradient(120deg,#233c2b,#192d25);margin-bottom:13px}.summary-head{display:flex;align-items:center;justify-content:space-between;gap:8px;font-weight:600}.privacy{font-size:9px;color:#c7f36b;border:1px solid #648044;border-radius:30px;padding:3px 7px}
      .stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:15px}.stat strong{display:block;color:#f2f8e9;font-size:24px;line-height:1.3;font-weight:550;font-variant-numeric:tabular-nums}.stat:last-child strong{font-size:19px;padding-top:5px}.stat span{display:block;font-size:10px;color:#b4c7b4;margin-top:4px}
      .session-note{margin:0 1px 16px;font-size:11px;color:#b4c7ba;line-height:1.6}
      article{padding:17px 16px;background:#1b332d;border:1px solid #3d594c;border-radius:16px;margin-bottom:13px;animation:card-in 180ms ease-out;overflow-wrap:anywhere}
      .card-topline{display:flex;justify-content:space-between;align-items:center;gap:8px}.finding-number{font:600 11px ui-monospace,monospace;color:#bed4c4;border:1px solid #577064;border-radius:6px;padding:3px 6px}
      .confidence{font-size:9px;letter-spacing:.4px;border:1px solid #607946;border-radius:30px;padding:3px 8px;color:#d0ec99;background:#283f2a}
      [data-category=observed-change] .confidence{color:#f0c792;border-color:#816747;background:#443c2d}[data-category=observed-behavior] .confidence{color:#b6dfd2;border-color:#557e72;background:#253f38}[data-category=heuristic] .confidence{color:#d2d4e5;border-color:#737887;background:#333d41}
      h3{font-size:17px;letter-spacing:-.25px;line-height:1.35;margin:12px 0 6px}.card-summary{margin:0 0 14px;color:#bdcfc2;font-size:12px}
      h4{font-size:10px;letter-spacing:.5px;font-weight:650;margin:0 0 6px;text-transform:uppercase}.proof{background:#11261e;border:1px solid #3e5544;border-radius:11px;padding:12px;margin-bottom:13px}.proof h4{color:#c7f36b;font-size:11px;letter-spacing:.3px;text-transform:none}.evidence{white-space:pre-line;font:12px/1.65 system-ui;margin:0 0 10px;color:#eef6e9;user-select:text}.rule-label{font-size:9px;text-transform:uppercase;letter-spacing:.5px;color:#a9c2af}.rule{margin:4px 0 0;font-size:11px;line-height:1.55;color:#c1d0c2}
      .explanation p,.limitation p{font-size:12px;line-height:1.6;margin:0}.explanation{margin-bottom:11px}.explanation h4{color:#d5e4d8}.explanation p{color:#c4d5c8}.limitation{padding-left:10px;border-left:2px solid #9c7946}.limitation h4{color:#eac490}.limitation p{color:#c7cbbd}
      .card-actions{display:flex;gap:8px;margin-top:16px}.card-actions button{font-size:11px;padding:9px 10px;flex:1}.card-actions .locate{color:#def0c6;border-color:#6e8555}.copy-status,.source-status{font-size:10px;line-height:1.5;margin:8px 0 0;color:#d3d6bd}.copy-status:empty,.source-status:empty{display:none}.copy-fallback{width:100%;min-height:125px;border:1px solid #70866b;border-radius:8px;background:#11261e;color:#eef6ef;margin-top:8px;padding:10px;resize:vertical;font:12px/1.5 system-ui}
      #empty{border:1px dashed #58745c;border-radius:16px;padding:27px 19px;text-align:center;margin:14px 0 20px;background:#1b332d88}#empty .shield-icon{color:#b9d594;width:32px;height:32px;margin-bottom:8px}#empty h3{font-size:16px}#empty p{font-size:12px;color:#b7cbbb;line-height:1.7}#empty .empty-caveat{font-size:11px;color:#d1ddca;padding-top:13px;border-top:1px solid #405849;margin-bottom:0}
      details{border:1px solid #3f594b;border-radius:15px;padding:14px;background:#142a22;margin-top:16px}summary{cursor:pointer;color:#dbe8d9;font-weight:600;font-size:12px}.timeline-note{font-size:10px;line-height:1.5;color:#aac0b1;margin:9px 0 18px}#events{list-style:none;padding:0 0 0 12px;margin:0}#events li{position:relative;border-left:1px solid #4b6753;padding:0 0 20px 20px}#events li:last-child{padding-bottom:0;border-color:transparent}.event-marker{position:absolute;left:-10px;top:-1px;display:grid;place-items:center;width:19px;height:19px;border:1px solid #62774c;border-radius:50%;color:#c7f36b;background:#1c3429;font-size:12px}time{font:10px ui-monospace,monospace;color:#bdd595}#events p{font-size:11px;color:#d3e0d5;margin:4px 0;line-height:1.6}#events small{font-size:9px;color:#a7bbae}
      .outline{position:fixed;border:2px solid #ed942f;border-radius:6px;box-shadow:0 0 0 2px #fff9,0 0 12px #ed942f26;pointer-events:none;animation:source-in 180ms ease-out}.outline.located{box-shadow:0 0 0 3px #fff9,0 0 18px #ed942f70}.source-number{position:absolute;left:-2px;min-width:21px;height:21px;display:grid;place-items:center;padding:0 4px;border-radius:6px;background:#ed942f;color:#261807;font:700 11px system-ui;box-shadow:0 2px 5px #0003}
      .sr-only{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}[hidden]{display:none!important}
      @keyframes panel-in{from{opacity:0;transform:translateX(10px)}to{opacity:1;transform:none}}@keyframes card-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}@keyframes notification{50%{box-shadow:0 0 0 6px #c7f36b30,0 8px 32px #04160b40}}@keyframes source-in{from{opacity:.25}to{opacity:1}}
      @media(max-width:600px){#panel{width:calc(100vw - 24px);right:12px;top:auto;bottom:78px;height:min(72dvh,680px);max-height:calc(100dvh - 94px)}#launcher{right:12px;bottom:14px;padding:11px 13px}header{padding:15px 16px 12px}main{padding:13px}#panel h2{font-size:19px}}
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
      node('p', 'Digital manipulation auditor', 'eyebrow'),
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
    const nav = node('nav');
    nav.setAttribute('aria-label', 'Audit controls');
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
    });
    exportButton.id = 'export';
    const pause = button('Pause', () => {
      enabled = !enabled;
      pause.textContent = enabled ? 'Pause' : 'Resume';
      log(enabled ? 'Monitoring resumed; changes during pause are unknown.' : 'Monitoring paused.');
      if (enabled) scan();
      else render();
    });
    nav.append(highlights, exportButton, pause);
    header.append(brandRow, statusRow, nav);
    panel.append(header);
    const main = node('main');
    const summary = node('section', undefined, 'audit-summary');
    summary.setAttribute('aria-label', 'Live audit summary');
    const summaryHead = node('div', undefined, 'summary-head');
    summaryHead.append(node('span', 'Live Audit'), node('span', 'LOCAL ONLY', 'privacy'));
    const stats = node('div', undefined, 'stats');
    for (const [id, label] of [
      ['finding-total', 'Findings'],
      ['pattern-total', 'Pattern types'],
      ['duration', 'Session time'],
    ]) {
      const stat = node('div', undefined, 'stat'),
        value = node('strong', '0');
      value.id = id;
      stat.append(value, node('span', label));
      stats.append(stat);
    }
    summary.append(summaryHead, stats);
    main.append(
      summary,
      node(
        'p',
        'Evidence, not a verdict. Analysis stays in your browser. Findings remain as session history.',
        'session-note',
      ),
    );
    const empty = node('section');
    empty.id = 'empty';
    const emptyText = node('p');
    emptyText.id = 'empty-monitor';
    empty.append(
      shieldIcon(),
      node('h3', 'No manipulative patterns observed yet.'),
      emptyText,
      node('p', 'Zero findings does not guarantee a page is safe or fair.', 'empty-caveat'),
    );
    main.append(empty);
    const list = node('div');
    list.id = 'findings';
    main.append(list);
    const details = node('details');
    details.open = true;
    details.append(
      node('summary', 'Manipulation timeline'),
      node(
        'p',
        'Latest 30 observed events · oldest to newest. Times are local to this browser.',
        'timeline-note',
      ),
    );
    const events = node('ol');
    events.id = 'events';
    details.append(events);
    main.append(details);
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
    log('Local monitoring started; first visible state is the baseline.');
    scan();
    observer = new MutationObserver((records) => {
      if (records.some((r) => !own(r.target))) schedule();
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['checked', 'hidden', 'style', 'class', 'aria-hidden'],
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
      launcher = shadow.querySelector('#launcher');
    const changed = panel.hidden === open;
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
    if (target.matches?.('input[type="checkbox"]')) touched.add(target);
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
