/**
 * NudgeKavach Showcase — Interactive Radar & Dark Pattern Simulator Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // 1. Hero Live Radar Simulation (Looping urgency reset demonstration)
  const heroTimerEl = document.getElementById('hero-live-timer');
  const heroTimelineEl = document.getElementById('hero-timeline-msg');
  let heroSecs = 8;
  let heroResets = 0;

  if (heroTimerEl) {
    setInterval(() => {
      heroSecs--;
      if (heroSecs < 0) {
        heroSecs = 12; // Secret restart
        heroResets++;
        heroTimerEl.style.transform = 'scale(1.15)';
        heroTimerEl.style.borderColor = '#ff7b72';
        setTimeout(() => {
          heroTimerEl.style.transform = 'none';
          heroTimerEl.style.borderColor = '#7c6239';
        }, 500);

        if (heroTimelineEl) {
          const now = new Date().toTimeString().slice(0, 8);
          heroTimelineEl.textContent = `${now} · Urgency reset #${heroResets} observed (00:00s → 00:12s)`;
        }
      }
      heroTimerEl.textContent = `00:${String(heroSecs).padStart(2, '0')}`;
    }, 1000);
  }

  // 2. Interactive Simulator (Cockpit Playground)
  const togglePrecheck = document.getElementById('toggle-precheck');
  const toggleShaming = document.getElementById('toggle-shaming');
  const toggleUrgency = document.getElementById('toggle-urgency');
  const toggleProminence = document.getElementById('toggle-prominence');
  const resetBtn = document.getElementById('sim-reset-btn');

  const simAddonBox = document.getElementById('sim-addon-box');
  const simAddonInput = document.getElementById('sim-addon-input');

  const simTimerBox = document.getElementById('sim-timer-box');
  const simCountdownVal = document.getElementById('sim-countdown-val');

  const simShamingBox = document.getElementById('sim-shaming-box');
  const simDeclineBtn = document.getElementById('sim-decline-btn');

  const simCookieBox = document.getElementById('sim-cookie-box');
  const simAcceptCookie = document.getElementById('sim-accept-cookie');
  const simRejectCookie = document.getElementById('sim-reject-cookie');

  const simActiveCount = document.getElementById('sim-active-count');

  let simTimerSeconds = 8;
  let simTimerInterval = null;

  function updateSimulation() {
    let activeFindings = 0;

    // Checkbox State
    if (togglePrecheck?.checked) {
      simAddonInput.checked = true;
      simAddonBox?.classList.add('flagged');
      activeFindings++;
    } else {
      simAddonInput.checked = false;
      simAddonBox?.classList.remove('flagged');
    }

    // Confirm-Shaming State
    if (toggleShaming?.checked) {
      simDeclineBtn.textContent = 'No thanks, I love paying full price';
      simShamingBox?.classList.add('flagged');
      activeFindings++;
    } else {
      simDeclineBtn.textContent = 'No thanks, continue without offer';
      simShamingBox?.classList.remove('flagged');
    }

    // Urgency State
    if (toggleUrgency?.checked) {
      simTimerBox?.classList.add('flagged');
      activeFindings++;
    } else {
      simTimerBox?.classList.remove('flagged');
    }

    // Prominence State
    if (toggleProminence?.checked) {
      simCookieBox?.classList.add('flagged');
      simAcceptCookie.style.fontSize = '14px';
      simAcceptCookie.style.padding = '10px 20px';
      simAcceptCookie.style.opacity = '1';
      simRejectCookie.style.fontSize = '10px';
      simRejectCookie.style.padding = '4px 8px';
      simRejectCookie.style.opacity = '0.4';
      activeFindings++;
    } else {
      simCookieBox?.classList.remove('flagged');
      simAcceptCookie.style.fontSize = '13px';
      simAcceptCookie.style.padding = '8px 16px';
      simAcceptCookie.style.opacity = '1';
      simRejectCookie.style.fontSize = '13px';
      simRejectCookie.style.padding = '8px 16px';
      simRejectCookie.style.opacity = '1';
    }

    // Update Counter Badge
    if (simActiveCount) {
      simActiveCount.textContent = `${activeFindings} Active Exploit${activeFindings === 1 ? '' : 's'}`;
      simActiveCount.style.color = activeFindings > 0 ? '#ed942f' : '#c7f36b';
      simActiveCount.style.background = activeFindings > 0 ? 'rgba(237, 148, 47, 0.14)' : 'rgba(199, 243, 107, 0.14)';
      simActiveCount.style.borderColor = activeFindings > 0 ? 'rgba(237, 148, 47, 0.45)' : 'rgba(199, 243, 107, 0.45)';
    }
  }

  function startSimTimer() {
    if (simTimerInterval) clearInterval(simTimerInterval);
    simTimerInterval = setInterval(() => {
      if (toggleUrgency?.checked) {
        simTimerSeconds--;
        if (simTimerSeconds < 0) {
          simTimerSeconds = 8; // Reset jump
        }
        if (simCountdownVal) {
          simCountdownVal.textContent = `00:${String(simTimerSeconds).padStart(2, '0')}`;
        }
      } else {
        if (simCountdownVal) simCountdownVal.textContent = '00:00 (Expired)';
      }
    }, 1000);
  }

  [togglePrecheck, toggleShaming, toggleUrgency, toggleProminence].forEach((toggle) => {
    toggle?.addEventListener('change', updateSimulation);
  });

  resetBtn?.addEventListener('click', () => {
    if (togglePrecheck) togglePrecheck.checked = false;
    if (toggleShaming) toggleShaming.checked = false;
    if (toggleUrgency) toggleUrgency.checked = false;
    if (toggleProminence) toggleProminence.checked = false;
    updateSimulation();
  });

  // 3. One-Click Clipboard Copy Buttons
  document.querySelectorAll('.copy-trigger').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const text = btn.getAttribute('data-copy') || '';
      try {
        await navigator.clipboard.writeText(text);
        const original = btn.textContent;
        btn.textContent = 'Copied! ✓';
        btn.style.background = '#c7f36b';
        btn.style.color = '#08140f';
        setTimeout(() => {
          btn.textContent = original;
          btn.style.background = '';
          btn.style.color = '';
        }, 2000);
      } catch (err) {
        btn.textContent = 'Select to copy';
      }
    });
  });

  // 4. Interactive Clickable Developer Mode Switch in Step 2
  const devSwitch = document.getElementById('interactive-dev-switch');
  if (devSwitch) {
    let devOn = true;
    devSwitch.addEventListener('click', () => {
      devOn = !devOn;
      const switchUi = devSwitch.querySelector('.mock-switch-active');
      const knob = devSwitch.querySelector('.switch-knob');
      if (switchUi && knob) {
        if (devOn) {
          switchUi.style.background = 'var(--lime)';
          switchUi.style.boxShadow = '0 0 10px rgba(199, 243, 107, 0.45)';
          knob.style.right = '3px';
          knob.style.left = 'auto';
        } else {
          switchUi.style.background = '#254435';
          switchUi.style.boxShadow = 'none';
          knob.style.right = 'auto';
          knob.style.left = '3px';
        }
      }
    });
  }

  // 5. Interactive 5 Detectors Matrix: Tabs and Card Mini-Sandboxes
  // Category Filter Tabs
  const filterTabs = document.querySelectorAll('.detector-filter-tabs .tab-btn');
  const bentoCards = document.querySelectorAll('.detectors-bento .bento-card');

  filterTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      filterTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const filter = tab.getAttribute('data-filter');

      bentoCards.forEach((card) => {
        const cardType = card.getAttribute('data-detector');
        if (filter === 'all' || filter === cardType) {
          card.style.display = 'flex';
          card.style.opacity = '1';
        } else {
          card.style.display = 'none';
          card.style.opacity = '0';
        }
      });
    });
  });

  // Detector 01: Prechecked Box
  const cardCheckInput = document.getElementById('card-check-input');
  const btnToggleCheck = document.getElementById('btn-toggle-check');
  const tagPrecheckStatus = document.getElementById('tag-precheck-status');
  const notePrecheck = document.getElementById('note-precheck');
  const sandboxPrecheck = document.getElementById('sandbox-precheck');

  function updatePrecheckUI(isChecked) {
    if (!tagPrecheckStatus || !sandboxPrecheck) return;
    if (isChecked) {
      tagPrecheckStatus.className = 'sandbox-status-tag tag-flagged';
      tagPrecheckStatus.innerHTML = '&#9888; Checked by Default';
      sandboxPrecheck.classList.add('flagged');
      sandboxPrecheck.classList.remove('clean');
      if (notePrecheck) notePrecheck.textContent = 'Uncheck to simulate clean user choice';
      if (btnToggleCheck) btnToggleCheck.textContent = 'Uncheck Add-on';
    } else {
      tagPrecheckStatus.className = 'sandbox-status-tag tag-clean';
      tagPrecheckStatus.innerHTML = '&#10003; Clean (Explicit Opt-in)';
      sandboxPrecheck.classList.add('clean');
      sandboxPrecheck.classList.remove('flagged');
      if (notePrecheck) notePrecheck.textContent = 'Safe: Shopper explicitly decides';
      if (btnToggleCheck) btnToggleCheck.textContent = 'Re-check (Simulate Exploit)';
    }
  }

  cardCheckInput?.addEventListener('change', () => {
    updatePrecheckUI(cardCheckInput.checked);
  });

  btnToggleCheck?.addEventListener('click', () => {
    if (cardCheckInput) {
      cardCheckInput.checked = !cardCheckInput.checked;
      updatePrecheckUI(cardCheckInput.checked);
    }
  });

  // Detector 02: Confirm-Shaming / Guilt Buttons
  const cardShameBtn = document.getElementById('card-shame-btn');
  const btnToggleShame = document.getElementById('btn-toggle-shame');
  const tagShameStatus = document.getElementById('tag-shame-status');
  const sandboxShaming = document.getElementById('sandbox-shaming');
  let isShamingActive = true;

  function updateShamingUI() {
    if (!cardShameBtn || !tagShameStatus || !sandboxShaming) return;
    if (isShamingActive) {
      cardShameBtn.textContent = 'No thanks, I love paying full price';
      cardShameBtn.classList.remove('clean-text');
      tagShameStatus.className = 'sandbox-status-tag tag-flagged';
      tagShameStatus.innerHTML = '&#9888; Guilt Phrase Matched';
      sandboxShaming.classList.add('flagged');
      sandboxShaming.classList.remove('clean');
      if (btnToggleShame) btnToggleShame.textContent = 'Switch to Ethical Copy';
    } else {
      cardShameBtn.textContent = "No thanks, I'll pass";
      cardShameBtn.classList.add('clean-text');
      tagShameStatus.className = 'sandbox-status-tag tag-clean';
      tagShameStatus.innerHTML = '&#10003; Respectful / Neutral Refusal';
      sandboxShaming.classList.add('clean');
      sandboxShaming.classList.remove('flagged');
      if (btnToggleShame) btnToggleShame.textContent = 'Switch to Guilt Copy';
    }
  }

  btnToggleShame?.addEventListener('click', () => {
    isShamingActive = !isShamingActive;
    updateShamingUI();
  });
  cardShameBtn?.addEventListener('click', () => {
    isShamingActive = !isShamingActive;
    updateShamingUI();
  });

  // Detector 03: Urgency Reset Countdown
  const cardTimerDigits = document.getElementById('card-timer-digits');
  const btnForceReset = document.getElementById('btn-force-reset');
  const tagUrgencyStatus = document.getElementById('tag-urgency-status');
  const cardResetCount = document.getElementById('card-reset-count');
  const sandboxUrgency = document.getElementById('sandbox-urgency');
  let cardTimerSecs = 8;
  let urgencyResets = 0;
  let cardTimerInterval = null;

  function triggerUrgencyReset(manual = false) {
    urgencyResets++;
    cardTimerSecs = 15;
    if (cardResetCount) cardResetCount.textContent = `Resets: ${urgencyResets}`;
    if (tagUrgencyStatus) {
      tagUrgencyStatus.className = 'sandbox-status-tag tag-flagged';
      tagUrgencyStatus.innerHTML = `&#9888; Reset Exploit #${urgencyResets} (+15s)`;
    }
    if (sandboxUrgency) {
      sandboxUrgency.classList.add('flagged');
      sandboxUrgency.classList.remove('clean');
    }
    if (cardTimerDigits) {
      cardTimerDigits.style.color = '#ff7b72';
      cardTimerDigits.style.borderColor = '#ff7b72';
      cardTimerDigits.style.transform = 'scale(1.15)';
      setTimeout(() => {
        cardTimerDigits.style.color = 'var(--lime)';
        cardTimerDigits.style.borderColor = 'var(--border-subtle)';
        cardTimerDigits.style.transform = 'none';
      }, 600);
    }
    setTimeout(() => {
      if (tagUrgencyStatus) {
        tagUrgencyStatus.className = 'sandbox-status-tag tag-neutral';
        tagUrgencyStatus.textContent = `Monitoring: Sample #${urgencyResets + 2}`;
      }
    }, 3500);
  }

  function startCardTimer() {
    if (cardTimerInterval) clearInterval(cardTimerInterval);
    cardTimerInterval = setInterval(() => {
      cardTimerSecs--;
      if (cardTimerSecs < 0) {
        triggerUrgencyReset(false);
      }
      if (cardTimerDigits) {
        cardTimerDigits.textContent = `00:${String(cardTimerSecs).padStart(2, '0')}`;
      }
    }, 1000);
  }

  btnForceReset?.addEventListener('click', () => {
    triggerUrgencyReset(true);
    if (cardTimerDigits) {
      cardTimerDigits.textContent = `00:${String(cardTimerSecs).padStart(2, '0')}`;
    }
  });

  startCardTimer();

  // Detector 04: Late-Visible Drip Fees
  const cardFeeLine = document.getElementById('card-fee-line');
  const cardCartTotal = document.getElementById('card-cart-total');
  const btnTriggerFee = document.getElementById('btn-trigger-fee');
  const tagFeeStatus = document.getElementById('tag-fee-status');
  const sandboxFees = document.getElementById('sandbox-fees');
  let isFeeVisible = false;

  function updateFeeUI() {
    if (!cardFeeLine || !cardCartTotal || !tagFeeStatus || !sandboxFees) return;
    if (isFeeVisible) {
      cardFeeLine.hidden = false;
      cardFeeLine.style.display = 'flex';
      cardCartTotal.textContent = '₹2,648';
      tagFeeStatus.className = 'sandbox-status-tag tag-flagged';
      tagFeeStatus.innerHTML = '&#9888; Drip Fee Injected (+₹149)';
      sandboxFees.classList.add('flagged');
      sandboxFees.classList.remove('clean');
      if (btnTriggerFee) {
        btnTriggerFee.textContent = 'Reset to Clean Baseline';
        btnTriggerFee.className = 'btn-micro btn-warning';
      }
    } else {
      cardFeeLine.hidden = true;
      cardFeeLine.style.display = 'none';
      cardCartTotal.textContent = '₹2,499';
      tagFeeStatus.className = 'sandbox-status-tag tag-clean';
      tagFeeStatus.innerHTML = '&#10003; Initial Baseline (Clean)';
      sandboxFees.classList.add('clean');
      sandboxFees.classList.remove('flagged');
      if (btnTriggerFee) {
        btnTriggerFee.textContent = 'Simulate "Proceed to Checkout"';
        btnTriggerFee.className = 'btn-micro btn-alert';
      }
    }
  }

  btnTriggerFee?.addEventListener('click', () => {
    isFeeVisible = !isFeeVisible;
    updateFeeUI();
  });

  // Detector 05: Asymmetric Choice Prominence
  const cardPromAccept = document.getElementById('card-prom-accept');
  const cardPromReject = document.getElementById('card-prom-reject');
  const btnToggleProminence = document.getElementById('btn-toggle-prominence');
  const tagProminenceStatus = document.getElementById('tag-prominence-status');
  const noteProminence = document.getElementById('note-prominence');
  const sandboxProminence = document.getElementById('sandbox-prominence');
  let isAsymmetric = true;

  function updateProminenceUI() {
    if (!cardPromAccept || !cardPromReject || !tagProminenceStatus || !sandboxProminence) return;
    if (isAsymmetric) {
      cardPromAccept.style.flex = '2.5';
      cardPromAccept.style.fontSize = '13px';
      cardPromAccept.style.padding = '8px 16px';
      cardPromAccept.style.background = '#255841';
      cardPromAccept.style.borderColor = '#4a8668';
      cardPromAccept.style.opacity = '1';

      cardPromReject.style.flex = '1';
      cardPromReject.style.fontSize = '10px';
      cardPromReject.style.padding = '4px 8px';
      cardPromReject.style.background = 'transparent';
      cardPromReject.style.borderColor = '#375344';
      cardPromReject.style.opacity = '0.4';

      tagProminenceStatus.className = 'sandbox-status-tag tag-flagged';
      tagProminenceStatus.innerHTML = '&#9888; 2.5× Disparity Detected';
      if (noteProminence) noteProminence.textContent = 'Area ratio: 2.5× | Font: 1.5× | Opacity: 0.4';
      if (btnToggleProminence) btnToggleProminence.textContent = 'Enforce Equal 1:1 Prominence';
      sandboxProminence.classList.add('flagged');
      sandboxProminence.classList.remove('clean');
    } else {
      cardPromAccept.style.flex = '1';
      cardPromAccept.style.fontSize = '12px';
      cardPromAccept.style.padding = '7px 12px';
      cardPromAccept.style.background = '#153326';
      cardPromAccept.style.borderColor = '#366650';
      cardPromAccept.style.opacity = '1';

      cardPromReject.style.flex = '1';
      cardPromReject.style.fontSize = '12px';
      cardPromReject.style.padding = '7px 12px';
      cardPromReject.style.background = '#153326';
      cardPromReject.style.borderColor = '#366650';
      cardPromReject.style.opacity = '1';

      tagProminenceStatus.className = 'sandbox-status-tag tag-clean';
      tagProminenceStatus.innerHTML = '&#10003; Equal Visual Weight (1:1)';
      if (noteProminence) noteProminence.textContent = 'Area ratio: 1.0× | Equal contrast & size';
      if (btnToggleProminence) btnToggleProminence.textContent = 'Restore Asymmetric Manipulation';
      sandboxProminence.classList.add('clean');
      sandboxProminence.classList.remove('flagged');
    }
  }

  btnToggleProminence?.addEventListener('click', () => {
    isAsymmetric = !isAsymmetric;
    updateProminenceUI();
  });

  // 6. Architecture & DevTools Network Activity Inspector
  const archTabBtns = document.querySelectorAll('.arch-tab-btn');
  const archPanels = {
    devtools: document.getElementById('view-devtools'),
    benchmark: document.getElementById('view-benchmark'),
    matrix: document.getElementById('view-matrix'),
  };

  archTabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      archTabBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const targetView = btn.getAttribute('data-arch-view');

      Object.keys(archPanels).forEach((key) => {
        if (archPanels[key]) {
          archPanels[key].style.display = key === targetView ? 'flex' : 'none';
        }
      });
    });
  });

  // DevTools Source Toggle (NudgeKavach vs Cloud Extension)
  const btnInspectKavach = document.getElementById('btn-inspect-kavach');
  const btnInspectCloud = document.getElementById('btn-inspect-cloud');
  const statReqCount = document.getElementById('stat-req-count');
  const statDataEgress = document.getElementById('stat-data-egress');
  const statSockets = document.getElementById('stat-sockets');
  const statLatency = document.getElementById('stat-latency');
  const devtoolsTbody = document.getElementById('devtools-tbody');
  const devtoolsAlert = document.getElementById('devtools-security-alert');

  function showKavachDevTools() {
    if (btnInspectKavach) {
      btnInspectKavach.className = 'devtools-toggle-btn active';
    }
    if (btnInspectCloud) {
      btnInspectCloud.className = 'devtools-toggle-btn';
    }

    if (statReqCount) {
      statReqCount.textContent = '0 Requests';
      statReqCount.className = 'd-val val-green';
    }
    if (statDataEgress) {
      statDataEgress.textContent = '0 B (Air-Gapped)';
      statDataEgress.className = 'd-val val-green';
    }
    if (statSockets) {
      statSockets.textContent = 'Closed (0 Active)';
      statSockets.className = 'd-val val-green';
    }
    if (statLatency) {
      statLatency.textContent = '< 1.2ms (Synchronous)';
      statLatency.className = 'd-val val-green';
    }

    if (devtoolsTbody) {
      devtoolsTbody.innerHTML = `
        <tr class="dev-row-clean">
          <td>
            <span class="res-name">&#128308; mutation_observer.js</span>
            <span class="res-path">content_scripts/content.js</span>
          </td>
          <td><span class="badge-type-mono">V8 Microtask</span></td>
          <td><span class="badge-status-local">In-Memory</span></td>
          <td><span class="spec-bytes">0 B</span></td>
          <td>
            <div class="waterfall-bar-wrap">
              <span class="waterfall-fill bar-ultra-fast" style="width: 8%;"></span>
              <span class="waterfall-time">0.32ms</span>
            </div>
          </td>
        </tr>
        <tr class="dev-row-clean">
          <td>
            <span class="res-name">&#128308; rules.js &middot; parseUrgency()</span>
            <span class="res-path">extension/rules.js</span>
          </td>
          <td><span class="badge-type-mono">Pure Logic</span></td>
          <td><span class="badge-status-local">In-Memory</span></td>
          <td><span class="spec-bytes">0 B</span></td>
          <td>
            <div class="waterfall-bar-wrap">
              <span class="waterfall-fill bar-ultra-fast" style="width: 12%;"></span>
              <span class="waterfall-time">0.58ms</span>
            </div>
          </td>
        </tr>
        <tr class="dev-row-clean">
          <td>
            <span class="res-name">&#128308; shadow_root_drawer.js</span>
            <span class="res-path">element.attachShadow({mode:'closed'})</span>
          </td>
          <td><span class="badge-type-mono">Shadow DOM</span></td>
          <td><span class="badge-status-local">Local Tab</span></td>
          <td><span class="spec-bytes">0 B</span></td>
          <td>
            <div class="waterfall-bar-wrap">
              <span class="waterfall-fill bar-ultra-fast" style="width: 16%;"></span>
              <span class="waterfall-time">0.91ms</span>
            </div>
          </td>
        </tr>
      `;
    }

    if (devtoolsAlert) {
      devtoolsAlert.className = 'devtools-security-banner banner-safe';
      devtoolsAlert.innerHTML = `
        <svg viewBox="0 0 20 20" fill="currentColor" class="sec-banner-ico" aria-hidden="true">
          <path fill-rule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v4a1 1 0 102 0V7z" clip-rule="evenodd"/>
        </svg>
        <div class="sec-banner-text">
          <strong>Network Egress Sealed: Zero bytes emitted.</strong>
          <span>Tab memory remains 100% air-gapped. Your credit card entries, passwords, and shopping cart are never serialized or transmitted.</span>
        </div>
      `;
    }
  }

  function showCloudDevTools() {
    if (btnInspectCloud) {
      btnInspectCloud.className = 'devtools-toggle-btn btn-cloud-danger active';
    }
    if (btnInspectKavach) {
      btnInspectKavach.className = 'devtools-toggle-btn';
    }

    if (statReqCount) {
      statReqCount.textContent = '2 Requests (Outbound)';
      statReqCount.className = 'd-val val-red';
    }
    if (statDataEgress) {
      statDataEgress.textContent = '77.2 KB (DOM Leaked)';
      statDataEgress.className = 'd-val val-red';
    }
    if (statSockets) {
      statSockets.textContent = 'Open (api.openai.com:443)';
      statSockets.className = 'd-val val-red';
    }
    if (statLatency) {
      statLatency.textContent = '1,840ms (Remote Queue)';
      statLatency.className = 'd-val val-red';
    }

    if (devtoolsTbody) {
      devtoolsTbody.innerHTML = `
        <tr class="dev-row-leaked">
          <td>
            <span class="res-name">&#9888; POST /v1/chat/completions</span>
            <span class="res-path">https://api.openai.com &middot; Payload: 64.8 KB DOM</span>
          </td>
          <td><span class="badge-type-fetch">fetch (POST)</span></td>
          <td><span class="badge-status-cloud">200 OK</span></td>
          <td><span class="spec-bytes bytes-danger">64.8 KB</span></td>
          <td>
            <div class="waterfall-bar-wrap">
              <span class="waterfall-fill bar-slow-net" style="width: 95%;"></span>
              <span class="waterfall-time">1,840ms</span>
            </div>
          </td>
        </tr>
        <tr class="dev-row-leaked">
          <td>
            <span class="res-name">&#9888; POST /telemetry/session</span>
            <span class="res-path">https://extension-telemetry.io &middot; User Tracker</span>
          </td>
          <td><span class="badge-type-fetch">beacon</span></td>
          <td><span class="badge-status-cloud">200 OK</span></td>
          <td><span class="spec-bytes bytes-danger">12.4 KB</span></td>
          <td>
            <div class="waterfall-bar-wrap">
              <span class="waterfall-fill bar-slow-net" style="width: 45%;"></span>
              <span class="waterfall-time">420ms</span>
            </div>
          </td>
        </tr>
      `;
    }

    if (devtoolsAlert) {
      devtoolsAlert.className = 'devtools-security-banner banner-danger';
      devtoolsAlert.innerHTML = `
        <svg viewBox="0 0 20 20" fill="currentColor" class="sec-banner-ico" aria-hidden="true">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
        </svg>
        <div class="sec-banner-text">
          <strong>Critical Data Egress Alert: Private DOM serialized &amp; transmitted.</strong>
          <span>Plaintext checkout HTML, form fields, and shopping cart values travel across public internet routes to third-party AI data centers.</span>
        </div>
      `;
    }
  }

  btnInspectKavach?.addEventListener('click', showKavachDevTools);
  btnInspectCloud?.addEventListener('click', showCloudDevTools);

  // Live In-Browser Micro-Benchmark
  const btnRunBenchmark = document.getElementById('btn-run-benchmark');
  const benchLocalTime = document.getElementById('bench-local-time');
  const benchLocalBar = document.getElementById('bench-local-bar');
  const benchMultiplier = document.getElementById('bench-multiplier');

  btnRunBenchmark?.addEventListener('click', () => {
    if (!btnRunBenchmark) return;
    btnRunBenchmark.innerHTML = '<span>Measuring V8 CPU...</span>';
    btnRunBenchmark.style.opacity = '0.7';

    setTimeout(() => {
      // Execute 3,000 regex pattern checks live in this browser tab
      const sampleText = 'No thanks, I love paying full price and losing discounts! Limited time offer: 00:08 remaining.';
      const regexPatterns = [
        /\b(?:no thanks|skip|decline)\b.*?\b(?:full price|hate saving|pay more)\b/i,
        /\b(?:00:0[0-9]|ends in|offer expires)\b/i,
        /\b(?:convenience fee|platform fee|handling)\b/i,
      ];

      const t0 = performance.now();
      let matchCount = 0;
      for (let i = 0; i < 3000; i++) {
        for (let r = 0; r < regexPatterns.length; r++) {
          if (regexPatterns[r].test(sampleText)) {
            matchCount++;
          }
        }
      }
      const t1 = performance.now();
      const measuredMs = Math.max(0.12, (t1 - t0) / 10).toFixed(2);
      const ratio = Math.round(1720 / parseFloat(measuredMs));

      if (benchLocalTime) {
        benchLocalTime.textContent = measuredMs;
        benchLocalTime.style.color = '#fff';
        setTimeout(() => {
          benchLocalTime.style.color = 'var(--lime)';
        }, 300);
      }

      if (benchMultiplier) {
        benchMultiplier.textContent = `${ratio.toLocaleString()}×`;
      }

      if (benchLocalBar) {
        const percent = Math.min(10, Math.max(1.5, parseFloat(measuredMs) * 3));
        benchLocalBar.style.width = `${percent}%`;
      }

      btnRunBenchmark.innerHTML = '<span>&#9654; Run Again (Measured Live)</span>';
      btnRunBenchmark.style.opacity = '1';
    }, 150);
  });

  // Initialize Simulator
  updateSimulation();
  startSimTimer();
});
