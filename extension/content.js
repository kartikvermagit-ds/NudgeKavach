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
  function drawHighlights() {
    const layer = shadow?.querySelector('#outlines');
    if (!layer) return;
    layer.replaceChildren();
    if (!highlight) return;
    for (const f of findings.values()) {
      if (!f.el.isConnected || !visible(f.el)) continue;
      const rect = f.el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight) continue;
      const box = node('div', undefined, 'outline');
      Object.assign(box.style, {
        left: `${rect.left - 3}px`,
        top: `${rect.top - 3}px`,
        width: `${rect.width + 6}px`,
        height: `${rect.height + 6}px`,
      });
      layer.append(box);
    }
  }
  function render() {
    if (!shadow) return;
    shadow.querySelector('#count').textContent =
      `${findings.size} observations · ${enabled ? 'Monitoring' : 'Paused'}`;
    const list = shadow.querySelector('#findings');
    // Retain card nodes so keyboard focus and scroll position survive timer updates.
    for (const f of findings.values()) {
      let card = list.querySelector(`[data-key="${f.key}"]`);
      if (!card) {
        card = node('article');
        card.dataset.key = f.key;
        card.append(
          node('small', f.confidence, 'confidence'),
          node('h3', f.title),
          node('b', 'NudgeProof'),
          node('p', '', 'evidence'),
          node('p', f.interpretation, 'interpretation'),
        );
        card.append(
          button('Locate on page', () => {
            if (f.el.isConnected) {
              f.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              drawHighlights();
            } else log('Original element is no longer on the page.');
          }),
        );
        list.append(card);
      }
      card.querySelector('.evidence').textContent = f.evidence.join('\n');
      card.querySelector('.interpretation').textContent = f.interpretation;
    }
    shadow.querySelector('#empty').hidden = findings.size > 0;
    const events = shadow.querySelector('#events');
    events.replaceChildren();
    [...timeline]
      .reverse()
      .slice(0, 30)
      .forEach((e) => events.append(node('li', `+${e.elapsed}s  ${e.message}`)));
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
    style.textContent = `:host{color-scheme:dark}*{box-sizing:border-box}button{cursor:pointer;font:inherit}#launcher{position:fixed;right:20px;bottom:20px;background:#c7f36b;color:#172016;border:0;border-radius:50px;padding:15px 22px;font:bold 14px system-ui;box-shadow:0 8px 30px #0005;pointer-events:auto}#panel{position:fixed;right:16px;top:16px;bottom:82px;width:min(400px,calc(100vw - 32px));background:#10221f;color:#eef6ef;border:1px solid #406052;border-radius:20px;font:14px/1.5 system-ui;box-shadow:0 20px 70px #0006;overflow:auto;pointer-events:auto}header{position:sticky;top:0;background:#10221f;padding:20px;border-bottom:1px solid #406052;z-index:1}h2{margin:0;font-size:24px}header p{color:#c7f36b;margin:5px 0}nav{display:flex;flex-wrap:wrap;gap:7px}button{border:1px solid #658376;background:transparent;color:inherit;border-radius:8px;padding:7px 10px}main{padding:16px}article{padding:16px;background:#1b332d;border:1px solid #3c564b;border-radius:12px;margin-bottom:12px}h3{font-size:17px;margin:7px 0 12px}.confidence{color:#c7f36b;text-transform:uppercase;letter-spacing:1px;font-size:10px}.evidence{white-space:pre-line}.interpretation,#empty{color:#b9cdc2}b{color:#ffcf87;font-size:12px}details{border-top:1px solid #406052;padding-top:14px}li{margin:12px 0;color:#bed0c6}ol{padding-left:20px}.outline{position:fixed;border:2px solid #ed942f;border-radius:6px;box-shadow:0 0 0 2px #fff8;pointer-events:none}[hidden]{display:none!important}`;
    shadow.append(style, Object.assign(node('div'), { id: 'outlines' }));
    const panel = node('section');
    panel.id = 'panel';
    panel.hidden = true;
    panel.setAttribute('aria-label', 'NudgeKavach observations');
    const header = node('header');
    header.append(node('small', 'CATALYST HACK 2026'), node('h2', 'NudgeKavach'));
    const count = node('p');
    count.id = 'count';
    header.append(count);
    const nav = node('nav');
    nav.append(
      button('Hide panel', () => toggle(false)),
      button('Highlights', () => {
        highlight = !highlight;
        drawHighlights();
      }),
      button('Export JSON', () => {
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(report(), null, 2)], { type: 'application/json' }),
        );
        const a = node('a');
        a.href = url;
        a.download = 'nudgeproof.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }),
    );
    const pause = button('Pause', () => {
      enabled = !enabled;
      pause.textContent = enabled ? 'Pause' : 'Resume';
      log(enabled ? 'Monitoring resumed; changes during pause are unknown.' : 'Monitoring paused.');
      if (enabled) scan();
      else render();
    });
    nav.append(pause);
    header.append(nav);
    panel.append(header);
    const main = node('main');
    main.append(
      node('p', 'Local rules. Evidence, not a verdict. Findings remain as session history.'),
    );
    const empty = node(
      'p',
      'No patterns observed yet. A clean result is not a guarantee. Countdown resets and late fees need time to observe.',
    );
    empty.id = 'empty';
    main.append(empty);
    const list = node('div');
    list.id = 'findings';
    main.append(list);
    const details = node('details');
    details.open = true;
    details.append(node('summary', 'Manipulation timeline'));
    const events = node('ol');
    events.id = 'events';
    details.append(events);
    main.append(details);
    panel.append(main);
    const launcher = button('◈ NudgeKavach', () => toggle(panel.hidden));
    launcher.id = 'launcher';
    launcher.setAttribute('aria-expanded', 'false');
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
    interval = setInterval(scan, 1000);
  }
  function toggle(open = true) {
    if (!booted) boot();
    if (!shadow) return;
    shadow.querySelector('#panel').hidden = !open;
    shadow.querySelector('#launcher').setAttribute('aria-expanded', String(open));
    render();
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
